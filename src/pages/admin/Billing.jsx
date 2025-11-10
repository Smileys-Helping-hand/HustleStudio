import { useEffect, useMemo, useState } from 'react';
import { toast } from 'react-hot-toast';
import { plans, planLookup, formatPlanPrice } from '../../config/plans.js';
import { useTenant } from '../../context/TenantContext.jsx';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  createCheckoutSession,
  fetchInvoices,
  fetchSubscription,
  loadUsageStats,
  openBillingPortal,
} from '../../lib/billingClient.js';

const formatDate = (value) => {
  if (!value) return '—';
  try {
    const date = value.toDate ? value.toDate() : new Date(value);
    return date.toLocaleDateString();
  } catch {
    return String(value);
  }
};

const Billing = () => {
  const { activeTenantId, activeTenant } = useTenant();
  const { user } = useAuth();
  const [subscription, setSubscription] = useState(null);
  const [usage, setUsage] = useState({ users: 0, items: 0 });
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    if (!activeTenantId) {
      setSubscription(null);
      setInvoices([]);
      setUsage({ users: 0, items: 0 });
      setLoading(false);
      return () => {
        mounted = false;
      };
    }
    setLoading(true);
    Promise.all([
      fetchSubscription(activeTenantId),
      loadUsageStats(activeTenantId),
      fetchInvoices(activeTenantId),
    ])
      .then(([sub, usageMetrics, invoiceList]) => {
        if (!mounted) return;
        setSubscription(sub);
        setUsage(usageMetrics);
        setInvoices(invoiceList);
      })
      .catch((error) => {
        console.error('[Billing] Failed to load data', error);
        toast.error('Unable to load billing data.');
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
  }, [activeTenantId]);

  const currentPlan = useMemo(() => {
    if (!subscription?.planId) return planLookup.starter;
    return planLookup[subscription.planId] ?? planLookup.starter;
  }, [subscription?.planId]);

  const handleUpgrade = async (planId) => {
    if (!activeTenantId || !user?.uid) {
      toast.error('Workspace not available for upgrade.');
      return;
    }
    try {
      await createCheckoutSession(planId, activeTenantId, user.uid);
    } catch (error) {
      console.error('[Billing] Upgrade failed', error);
      toast.error(error.message || 'Unable to start checkout.');
    }
  };

  const handlePortal = async () => {
    if (!activeTenantId) {
      toast.error('Select a workspace first.');
      return;
    }
    try {
      await openBillingPortal(activeTenantId);
    } catch (error) {
      console.error('[Billing] Portal failed', error);
      toast.error(error.message || 'Unable to open billing portal.');
    }
  };

  return (
    <main className="space-y-8 bg-gradient-to-br from-[#0f0f1a] via-[#16162a] to-[#1b1b33] px-4 pb-16 pt-6 text-white sm:px-10">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Billing & Plans</h1>
          <p className="text-sm text-white/60">
            Manage subscription tiers, invoices, and usage for {activeTenant?.name ?? 'your workspace'}.
          </p>
        </div>
        <button
          type="button"
          onClick={handlePortal}
          className="rounded-full border border-white/15 bg-white/5 px-5 py-2 text-sm text-white/80 transition hover:bg-white/10"
        >
          Manage payment method
        </button>
      </header>

      <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <p className="text-xs uppercase tracking-[0.35em] text-white/50">Current plan</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{currentPlan.name}</h2>
            <p className="text-sm text-white/60">{currentPlan.description}</p>
            <div className="mt-4 grid gap-3 text-sm text-white/70 sm:grid-cols-2">
              <span>
                Seats: {usage.users}/{currentPlan.limits.users === Infinity ? '∞' : currentPlan.limits.users}
              </span>
              <span>
                Inventory: {usage.items}/{currentPlan.limits.items === Infinity ? '∞' : currentPlan.limits.items}
              </span>
              <span>Price: {formatPlanPrice(currentPlan.id)}</span>
              <span>Renews: {formatDate(subscription?.renewsAt)}</span>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {plans.map((plan) => (
              <div
                key={plan.id}
                className={`rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 shadow-[0_0_25px_rgba(99,102,241,0.15)] ${
                  plan.id === currentPlan.id ? 'ring-2 ring-indigo-400/70' : ''
                }`}
              >
                <p className="text-xs uppercase tracking-[0.35em] text-white/50">{plan.name}</p>
                <p className="mt-3 text-2xl font-semibold text-white">{formatPlanPrice(plan.id)}</p>
                <p className="mt-2 text-xs text-white/60">{plan.description}</p>
                <ul className="mt-3 space-y-1 text-xs text-white/50">
                  <li>Users: {plan.limits.users === Infinity ? 'Unlimited' : plan.limits.users}</li>
                  <li>Inventory: {plan.limits.items === Infinity ? 'Unlimited' : plan.limits.items}</li>
                  <li>Storage: {plan.limits.storageGb} GB</li>
                </ul>
                <button
                  type="button"
                  onClick={() => handleUpgrade(plan.id)}
                  disabled={plan.id === currentPlan.id}
                  className="mt-4 w-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-4 py-2 text-xs font-semibold shadow-[0_0_25px_rgba(99,102,241,0.25)] transition hover:scale-[1.02] disabled:opacity-50"
                >
                  {plan.id === currentPlan.id ? 'Current plan' : 'Choose plan'}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
          <p className="text-xs uppercase tracking-[0.35em] text-white/50">Invoices</p>
          <div className="mt-4 space-y-3">
            {loading && <p className="text-white/60">Loading invoices…</p>}
            {!loading && invoices.length === 0 && <p className="text-white/60">No invoices yet.</p>}
            {invoices.map((invoice) => (
              <div key={invoice.id} className="rounded-2xl border border-white/10 bg-black/40 px-4 py-3">
                <p className="text-sm font-semibold text-white">R{Number(invoice.total ?? 0).toFixed(2)}</p>
                <p className="text-xs text-white/50">{formatDate(invoice.createdAt)}</p>
                {invoice.downloadUrl && (
                  <a
                    href={invoice.downloadUrl}
                    className="mt-2 inline-flex text-xs text-indigo-300 hover:text-indigo-200"
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download invoice
                  </a>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
};

export default Billing;
