import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { collectionGroup, getCountFromServer, getDocs, addDoc, serverTimestamp } from 'firebase/firestore';
import { listAll, ref, getMetadata } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import HeartbeatTimeline from '../../components/admin/HeartbeatTimeline.jsx';
import HeartbeatWidget from '../../components/admin/HeartbeatWidget.jsx';
import { db, storage } from '../../lib/firebase.js';
import { useTenant } from '../../context/TenantContext.jsx';
import { tenantCollection } from '../../lib/tenant.js';
import { asset } from '../../config/assets.js';

const AdminPage = () => {
  const [stats, setStats] = useState({ users: 0, inventory: 0, sales: 0 });
  const [storageUsage, setStorageUsage] = useState({ files: 0, bytes: 0 });
  const [accessEmail, setAccessEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [monitorStatus, setMonitorStatus] = useState({ firestore: 'Checking…', cdn: 'Checking…' });
  const [aiUsage, setAiUsage] = useState({ totalTokens: 0, credits: 0, leaders: [] });
  const { activeTenantId, activeTenant } = useTenant();

  const loadCounts = useMemo(
    () => async () => {
      try {
        if (!activeTenantId) {
          setStats({ users: 0, inventory: 0, sales: 0 });
          return;
        }
        const [userSnap, inventorySnap, salesSnap] = await Promise.all([
          getCountFromServer(tenantCollection(activeTenantId, 'users')),
          getCountFromServer(tenantCollection(activeTenantId, 'inventory')),
          getCountFromServer(tenantCollection(activeTenantId, 'sales')),
        ]);
        setStats({
          users: userSnap.data().count,
          inventory: inventorySnap.data().count,
          sales: salesSnap.data().count,
        });
      } catch (error) {
        console.error('[Admin] Unable to load counts.', error);
      }
    },
    [activeTenantId]
  );

  useEffect(() => {
    loadCounts().catch(() => {});
  }, [loadCounts]);

  useEffect(() => {
    const loadAiUsage = async () => {
      try {
        const snapshot = await getDocs(collectionGroup(db, 'usageLogs'));
        let totalTokens = 0;
        let credits = 0;
        const leaderboard = new Map();
        snapshot.forEach((docSnapshot) => {
          const data = docSnapshot.data();
          if (activeTenantId && data.tenantId && data.tenantId !== activeTenantId) {
            return;
          }
          const tokens = Number(data.tokensUsed ?? 0);
          const creditCost = Number(data.creditsUsed ?? 0);
          totalTokens += tokens;
          credits += creditCost;
          if (data.userId) {
            const current = leaderboard.get(data.userId) ?? { userId: data.userId, tokens: 0, credits: 0 };
            current.tokens += tokens;
            current.credits += creditCost;
            leaderboard.set(data.userId, current);
          }
        });
        const leaders = Array.from(leaderboard.values())
          .sort((a, b) => b.credits - a.credits)
          .slice(0, 5);
        setAiUsage({ totalTokens, credits, leaders });
      } catch (error) {
        console.error('[Admin] Failed to load AI usage logs.', error);
      }
    };
    loadAiUsage().catch(() => {});
  }, [activeTenantId]);

  useEffect(() => {
    const checkMonitor = async () => {
      try {
        const response = await fetch(asset('manifest.json'));
        setMonitorStatus((prev) => ({ ...prev, cdn: response.ok ? 'Online' : 'Unavailable' }));
      } catch {
        setMonitorStatus((prev) => ({ ...prev, cdn: 'Unavailable' }));
      }
      try {
        if (!activeTenantId) {
          setMonitorStatus((prev) => ({ ...prev, firestore: 'No workspace' }));
          return;
        }
        const salesSnapshot = await getCountFromServer(tenantCollection(activeTenantId, 'sales'));
        setMonitorStatus((prev) => ({ ...prev, firestore: salesSnapshot.data().count >= 0 ? 'Online' : 'Offline' }));
      } catch {
        setMonitorStatus((prev) => ({ ...prev, firestore: 'Offline' }));
      }
    };
    checkMonitor().catch(() => {});
  }, [activeTenantId]);

  useEffect(() => {
    const fetchStorageUsage = async () => {
      try {
        const basePath = activeTenantId ? `cdn-assets/${activeTenantId}` : 'cdn-assets';
        const rootRef = ref(storage, basePath);
        const listing = await listAll(rootRef);
        let totalBytes = 0;
        await Promise.all(
          listing.items.map(async (itemRef) => {
            const metadata = await getMetadata(itemRef);
            totalBytes += metadata.size ?? 0;
          })
        );
        setStorageUsage({ files: listing.items.length, bytes: totalBytes });
      } catch (error) {
        console.warn('[Storage] Unable to compute usage.', error);
      }
    };
    fetchStorageUsage().catch(() => {});
  }, [activeTenantId]);

  const submitAccessRequest = async (event) => {
    event.preventDefault();
    if (!accessEmail) {
      toast.error('Enter an email address.');
      return;
    }
    try {
      await addDoc(tenantCollection(activeTenantId, 'accessRequests'), {
        email: accessEmail.toLowerCase(),
        role,
        sentAt: serverTimestamp(),
        status: 'pending',
        tenantId: activeTenantId ?? null,
      });
      setAccessEmail('');
      toast.success('Access request recorded. Provision via admin console.');
    } catch (error) {
      console.error('[Admin] Failed to create access request.', error);
      toast.error('Unable to create access request right now.');
    }
  };

  const storageSizeLabel = useMemo(() => {
    const { bytes } = storageUsage;
    if (!bytes) return '0 MB';
    const units = ['B', 'KB', 'MB', 'GB'];
    const exponent = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const size = bytes / 1024 ** exponent;
    return `${size.toFixed(1)} ${units[exponent]}`;
  }, [storageUsage]);

  return (
    <main className="space-y-8 p-6 text-white">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-sm text-white/60">
            Manage roles, usage, and system health for {activeTenant?.name ?? 'your workspace'}.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Link
            to="/admin/access"
            className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:bg-white/20"
          >
            Access requests
          </Link>
          <Link
            to="/admin/billing"
            className="rounded-full border border-amber-400/30 bg-amber-500/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-amber-100 transition hover:bg-amber-500/30"
          >
            Billing
          </Link>
          <Link
            to="/admin/tenants"
            className="rounded-full border border-indigo-400/30 bg-indigo-500/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white transition hover:bg-indigo-500/40"
          >
            Manage workspaces
          </Link>
          <Link
            to="/admin/app-reviews"
            className="rounded-full border border-purple-400/30 bg-purple-500/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-purple-50 transition hover:bg-purple-500/35"
          >
            App reviews
          </Link>
          <Link
            to="/admin/telemetry"
            className="rounded-full border border-teal-400/30 bg-teal-500/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-teal-50 transition hover:bg-teal-500/35"
          >
            Telemetry
          </Link>
          <Link
            to="/admin/global-insights"
            className="rounded-full border border-fuchsia-400/30 bg-fuchsia-500/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-fuchsia-50 transition hover:bg-fuchsia-500/35"
          >
            Global insights
          </Link>
          <Link
            to="/admin/ai-metrics"
            className="rounded-full border border-sky-400/30 bg-sky-500/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-sky-50 transition hover:bg-sky-500/35"
          >
            AI metrics
          </Link>
          <Link
            to="/admin/ai-audit"
            className="rounded-full border border-emerald-400/30 bg-emerald-500/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-emerald-50 transition hover:bg-emerald-500/35"
          >
            AI audit
          </Link>
          <Link
            to="/admin/privacy"
            className="rounded-full border border-rose-400/30 bg-rose-500/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-rose-50 transition hover:bg-rose-500/35"
          >
            Privacy tools
          </Link>
          <HeartbeatWidget />
        </div>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-white/50">Team members</p>
          <p className="mt-2 text-2xl font-semibold">{stats.users}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-white/50">Inventory SKUs</p>
          <p className="mt-2 text-2xl font-semibold">{stats.inventory}</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-wide text-white/50">Sales captured</p>
          <p className="mt-2 text-2xl font-semibold">{stats.sales}</p>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <HeartbeatTimeline />
        <div className="space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6">
          <header>
            <h2 className="text-lg font-semibold text-white">Onboard team member</h2>
            <p className="text-xs text-white/60">
              Queue access requests for managers or staff. Provisioning completes via Firebase Console approval.
            </p>
          </header>
          <form onSubmit={submitAccessRequest} className="space-y-3">
            <label className="block text-xs uppercase tracking-wide text-white/60">
              Email address
              <input
                type="email"
                value={accessEmail}
                onChange={(event) => setAccessEmail(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
                placeholder="team@hustlestudio.co.za"
                required
              />
            </label>
            <label className="block text-xs uppercase tracking-wide text-white/60">
              Role
              <select
                value={role}
                onChange={(event) => setRole(event.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/60 px-3 py-2 text-white focus:border-indigo-400 focus:outline-none"
              >
                <option value="admin">Admin</option>
                <option value="manager">Manager</option>
                <option value="staff">Staff</option>
              </select>
            </label>
            <button
              type="submit"
              className="w-full rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-indigo-700"
            >
              Queue access request
            </button>
          </form>
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">AI usage monitor</h2>
          <p className="mt-2 text-sm text-white/60">
            Track total tokens processed by assistants and spotlight the most active team members.
          </p>
          <dl className="mt-4 grid grid-cols-2 gap-4 text-sm text-white/80">
            <div>
              <dt className="text-xs uppercase tracking-wide text-white/40">Tokens processed</dt>
              <dd className="text-lg font-semibold">{aiUsage.totalTokens.toLocaleString()}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-white/40">Credits consumed</dt>
              <dd className="text-lg font-semibold">{aiUsage.credits.toFixed(2)}</dd>
            </div>
          </dl>
          <div className="mt-4 rounded-xl border border-white/10 bg-black/40 p-4">
            <h3 className="text-xs uppercase tracking-wide text-white/50">Top users</h3>
            <ul className="mt-3 space-y-2 text-xs text-white/60">
              {aiUsage.leaders.length === 0 && <li>No usage recorded yet.</li>}
              {aiUsage.leaders.map((entry) => (
                <li key={entry.userId} className="flex justify-between">
                  <span>{entry.userId}</span>
                  <span>{entry.credits.toFixed(2)} credits</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Storage usage</h2>
          <p className="mt-2 text-sm text-white/60">
            {storageUsage.files} assets / {storageSizeLabel}
          </p>
          <p className="mt-2 text-xs text-white/40">
            Tip: prune unused branding assets regularly after publishing to CDN.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-semibold text-white">Audit trail</h2>
          <p className="text-xs text-white/60">
            Review access request entries, sales documents, and team changes in the Firestore collections for full traceability.
          </p>
        </div>
      </section>

      <footer className="mt-12 text-center text-xs text-gray-400">
        <div className="mt-4 flex justify-center gap-4 text-[10px] text-gray-500">
          <span>Firestore: {monitorStatus.firestore}</span>
          <span>CDN: {monitorStatus.cdn}</span>
        </div>
        System Status →{' '}
        <a href="/monitor" className="underline">
          /monitor
        </a>
      </footer>
    </main>
  );
};

export default AdminPage;
