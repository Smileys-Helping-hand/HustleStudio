import React, { useEffect, useMemo, useState } from 'react';
import { collection, getCountFromServer, addDoc, serverTimestamp } from 'firebase/firestore';
import { listAll, ref, getMetadata } from 'firebase/storage';
import { toast } from 'react-hot-toast';
import HeartbeatTimeline from '../../components/admin/HeartbeatTimeline.jsx';
import HeartbeatWidget from '../../components/admin/HeartbeatWidget.jsx';
import { db, storage } from '../../lib/firebase.js';

const AdminPage = () => {
  const [stats, setStats] = useState({ users: 0, inventory: 0, sales: 0 });
  const [storageUsage, setStorageUsage] = useState({ files: 0, bytes: 0 });
  const [accessEmail, setAccessEmail] = useState('');
  const [role, setRole] = useState('staff');
  const [monitorStatus, setMonitorStatus] = useState({ firestore: 'Checking…', cdn: 'Checking…' });

  const loadCounts = useMemo(
    () => async () => {
      try {
        const [userSnap, inventorySnap, salesSnap] = await Promise.all([
          getCountFromServer(collection(db, 'users')),
          getCountFromServer(collection(db, 'inventory')),
          getCountFromServer(collection(db, 'sales')),
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
    []
  );

  useEffect(() => {
    loadCounts().catch(() => {});
  }, [loadCounts]);

  useEffect(() => {
    const checkMonitor = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_CDN_DOMAIN || 'https://cdn.hustlestudio.co.za'}/assets/manifest.json`);
        setMonitorStatus((prev) => ({ ...prev, cdn: response.ok ? 'Online' : 'Unavailable' }));
      } catch {
        setMonitorStatus((prev) => ({ ...prev, cdn: 'Unavailable' }));
      }
      try {
        const salesSnapshot = await getCountFromServer(collection(db, 'sales'));
        setMonitorStatus((prev) => ({ ...prev, firestore: salesSnapshot.data().count >= 0 ? 'Online' : 'Offline' }));
      } catch {
        setMonitorStatus((prev) => ({ ...prev, firestore: 'Offline' }));
      }
    };
    checkMonitor().catch(() => {});
  }, []);

  useEffect(() => {
    const fetchStorageUsage = async () => {
      try {
        const rootRef = ref(storage, 'cdn-assets');
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
  }, []);

  const submitAccessRequest = async (event) => {
    event.preventDefault();
    if (!accessEmail) {
      toast.error('Enter an email address.');
      return;
    }
    try {
      await addDoc(collection(db, 'accessRequests'), {
        email: accessEmail.toLowerCase(),
        role,
        sentAt: serverTimestamp(),
        status: 'pending',
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
            Manage roles, usage, and system health across Hustle Studio.
          </p>
        </div>
        <HeartbeatWidget />
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
