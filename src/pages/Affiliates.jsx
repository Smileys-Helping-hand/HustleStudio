import { useEffect, useMemo, useState } from 'react';
import { collection, getDocs, orderBy, query } from 'firebase/firestore';
import { FiArrowRightCircle, FiDollarSign } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { db } from '../lib/firebase.js';
import { registerReferral } from '../lib/affiliateEngine.js';

export default function Affiliates() {
  const { activeTenantId } = useTenant();
  const [loading, setLoading] = useState(false);
  const [referrals, setReferrals] = useState([]);
  const [email, setEmail] = useState('');

  const commissionRate = useMemo(() => {
    const envValue =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AFFILIATE_COMMISSION_RATE) ||
      (typeof globalThis !== 'undefined' && globalThis.process?.env?.VITE_AFFILIATE_COMMISSION_RATE) ||
      0.15;
    return Number(envValue);
  }, []);

  useEffect(() => {
    if (!activeTenantId) return;
    const load = async () => {
      setLoading(true);
      try {
        const referralQuery = query(collection(db, 'referrals'), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(referralQuery);
        setReferrals(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
      } catch (error) {
        console.error('[Affiliates] Failed to load referrals', error);
        toast.error('Unable to load referrals right now.');
      } finally {
        setLoading(false);
      }
    };
    load().catch(() => {});
  }, [activeTenantId]);

  const handleRegister = async (event) => {
    event.preventDefault();
    if (!email) return;
    try {
      const nextEmail = email;
      const id = await registerReferral(activeTenantId, email);
      toast.success('Referral registered.');
      setEmail('');
      setReferrals((current) => [
        {
          id,
          referredEmail: nextEmail,
          status: 'pending',
          createdAt: { seconds: Math.floor(Date.now() / 1000) },
        },
        ...current,
      ]);
    } catch (error) {
      toast.error(error.message);
    }
  };

  const totalEarned = referrals
    .filter((item) => item.status === 'paid')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pb-16">
      <PageHeader
        title="Affiliate HQ"
        subtitle="Track referrals, reward partners, and expand the Hustle Studio network."
        actions={
          <a
            href="/partners"
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.35em] text-white/70 transition hover:bg-white/20"
          >
            <FiArrowRightCircle /> Partner portal
          </a>
        }
      />

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_25px_rgba(99,102,241,0.15)]">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Commission rate</h3>
          <p className="mt-3 text-3xl font-bold text-white">{Math.round(commissionRate * 100)}%</p>
          <p className="mt-2 text-sm text-white/60">Earned on every successful subscription your partners close.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_25px_rgba(99,102,241,0.15)]">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Paid out</h3>
          <p className="mt-3 text-3xl font-bold text-emerald-300">R{totalEarned.toFixed(2)}</p>
          <p className="mt-2 text-sm text-white/60">Across all cleared referrals recorded in Hustle Studio.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_25px_rgba(99,102,241,0.15)]">
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-white/60">Referrals</h3>
          <p className="mt-3 text-3xl font-bold text-indigo-300">{referrals.length}</p>
          <p className="mt-2 text-sm text-white/60">Monitor pending, approved, and paid referrals at a glance.</p>
        </div>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_25px_rgba(99,102,241,0.15)]">
        <form onSubmit={handleRegister} className="flex flex-col gap-4 sm:flex-row">
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            required
            placeholder="Partner email address"
            className="flex-1 rounded-full border border-white/10 bg-black/40 px-4 py-3 text-sm text-white placeholder:text-white/50 focus:border-indigo-400 focus:outline-none"
          />
          <button
            type="submit"
            className="flex items-center justify-center gap-2 rounded-full bg-indigo-500 px-6 py-3 text-sm font-semibold text-white shadow-[0_0_20px_rgba(99,102,241,0.45)] transition hover:bg-indigo-400"
          >
            <FiDollarSign />
            Create referral
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_25px_rgba(99,102,241,0.15)]">
        <h3 className="mb-4 text-lg font-semibold text-white">Referral history</h3>
        <div className="overflow-hidden rounded-xl border border-white/10">
          <table className="min-w-full divide-y divide-white/10 text-left text-sm text-white/80">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.2em] text-white/50">
              <tr>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Updated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {referrals.length === 0 && !loading ? (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-white/50">
                    No referrals yet. Share your affiliate link to get started.
                  </td>
                </tr>
              ) : (
                referrals.map((entry) => (
                  <tr key={entry.id} className="hover:bg-white/5">
                    <td className="px-4 py-3">{entry.referredEmail}</td>
                    <td className="px-4 py-3 capitalize">{entry.status ?? 'pending'}</td>
                    <td className="px-4 py-3">{entry.amount ? `R${Number(entry.amount).toFixed(2)}` : '-'}</td>
                    <td className="px-4 py-3">
                      {entry.paidAt?.seconds
                        ? new Date(entry.paidAt.seconds * 1000).toLocaleDateString()
                        : entry.createdAt?.seconds
                        ? new Date(entry.createdAt.seconds * 1000).toLocaleDateString()
                        : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
