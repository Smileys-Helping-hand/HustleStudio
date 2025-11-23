import { useEffect, useState } from 'react';
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
import PageHeader from '../components/common/PageHeader.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { db } from '../lib/firebase.js';
import { defaultBrand } from '../config/branding.js';

export default function PartnerDashboard() {
  const { activeTenantId, brand } = useTenant();
  const [referrals, setReferrals] = useState([]);
  const [plugins, setPlugins] = useState([]);

  useEffect(() => {
    if (!activeTenantId) return;
    const fetchData = async () => {
      try {
        const referralQuery = query(collection(db, 'referrals'), orderBy('createdAt', 'desc'), limit(5));
        const snapshot = await getDocs(referralQuery);
        setReferrals(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
        const pluginSnapshot = await getDocs(collection(db, 'tenants', activeTenantId, 'plugins'));
        setPlugins(pluginSnapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
      } catch (error) {
        console.error('[PartnerDashboard] Failed to fetch overview data', error);
      }
    };
    fetchData().catch(() => {});
  }, [activeTenantId]);

  const activeBrand = brand ?? defaultBrand;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16">
      <PageHeader
        title="Partner Command Center"
        subtitle="Monitor your affiliate momentum, white-label configurations, and marketplace installs."
      />

      <section className="grid gap-6 md:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xs uppercase tracking-[0.3em] text-white/60">Brand identity</h3>
          <div className="mt-4 flex items-center gap-4">
            {activeBrand.logo ? (
              <img src={activeBrand.logo} alt="Brand logo" className="h-12 w-12 rounded-full border border-white/10 bg-white/10 object-contain" />
            ) : null}
            <div>
              <p className="text-lg font-semibold text-white">{activeBrand.name}</p>
              <p className="text-sm text-white/60">{activeBrand.domain ?? 'Custom domain pending'}</p>
            </div>
          </div>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xs uppercase tracking-[0.3em] text-white/60">Active plugins</h3>
          <p className="mt-4 text-3xl font-semibold text-indigo-300">{plugins.length}</p>
          <p className="mt-2 text-sm text-white/60">Extensions installed from the Hustle Studio marketplace.</p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="text-xs uppercase tracking-[0.3em] text-white/60">Recent referrals</h3>
          <p className="mt-4 text-3xl font-semibold text-emerald-300">{referrals.length}</p>
          <p className="mt-2 text-sm text-white/60">Latest five referrals linked to your partner workspace.</p>
        </article>
      </section>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">Recent referrals</h3>
          <ul className="space-y-3 text-sm text-white/70">
            {referrals.length === 0 ? (
              <li className="text-white/40">No referrals logged yet.</li>
            ) : (
              referrals.map((entry) => (
                <li key={entry.id} className="flex justify-between rounded-xl bg-white/5 px-4 py-3">
                  <span>{entry.referredEmail}</span>
                  <span className="capitalize text-white/60">{entry.status ?? 'pending'}</span>
                </li>
              ))
            )}
          </ul>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h3 className="mb-4 text-lg font-semibold text-white">Installed plugins</h3>
          <ul className="space-y-3 text-sm text-white/70">
            {plugins.length === 0 ? (
              <li className="text-white/40">No extensions installed.</li>
            ) : (
              plugins.map((plugin) => (
                <li key={plugin.id} className="rounded-xl bg-white/5 px-4 py-3">
                  <p className="font-medium text-white">{plugin.name ?? 'Marketplace extension'}</p>
                  <p className="text-xs text-white/50">{plugin.category ?? 'General'}</p>
                </li>
              ))
            )}
          </ul>
        </div>
      </section>
    </div>
  );
}
