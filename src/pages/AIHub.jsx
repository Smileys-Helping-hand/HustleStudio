import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { getDocs, orderBy, query, limit } from 'firebase/firestore';
import { FiCpu, FiMessageCircle, FiZap } from 'react-icons/fi';
import { toast } from 'react-hot-toast';
import PageHeader from '../components/common/PageHeader.jsx';
import { supportedAssistants } from '../lib/openaiClient.js';
import { useCredits } from '../hooks/useCredits.js';
import { useCreditContext } from '../context/CreditContext.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { tenantCollection } from '../lib/tenant.js';

const assistantEntries = [
  { key: 'strategy', route: '/ai/strategy' },
  { key: 'finance', route: '/ai/finance' },
  { key: 'inventory', route: '/ai/inventory' },
  { key: 'assistant', route: '/ai/assistant' },
  { key: 'growthCoach', route: '/ai/growth-coach' },
];

const quickTopUps = [25, 50, 100];

const AIHub = () => {
  const { balance, loading } = useCredits();
  const { startCheckout, addCredits } = useCreditContext();
  const { activeTenantId } = useTenant();

  useEffect(() => {
    let isMounted = true;
    const notifyNewInsight = async () => {
      try {
        if (!activeTenantId) return;
        const insightsQuery = query(
          tenantCollection(activeTenantId, 'aiInsights'),
          orderBy('createdAt', 'desc'),
          limit(1)
        );
        const snapshot = await getDocs(insightsQuery);
        if (snapshot.empty) return;
        const [latest] = snapshot.docs;
        const seenKey = `hs_insight_seen_${latest.id}`;
        if (typeof window !== 'undefined' && !window.localStorage.getItem(seenKey) && isMounted) {
          toast('New AI insight is ready — open the hub to review recommendations.', {
            icon: '🤖',
          });
          window.localStorage.setItem(seenKey, 'true');
        }
      } catch (error) {
        console.info('[AIHub] Unable to check insights', error);
      }
    };

    notifyNewInsight().catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [activeTenantId]);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="AI Command Hub"
        subtitle="Launch domain-specific copilots to accelerate strategy, finance, and operations in seconds."
        actions={
          <div className="flex items-center gap-3 text-sm text-violet-200">
            <span className="rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs uppercase tracking-[0.35em]">
              {loading ? 'Checking credits…' : `${balance.toFixed(2)} credits`}
            </span>
            <button
              type="button"
              onClick={() => startCheckout(50)}
              className="inline-flex items-center gap-2 rounded-full bg-violet-500/20 px-4 py-2 text-sm text-violet-200 transition hover:bg-violet-500/30"
            >
              <FiZap /> Recharge Credits
            </button>
          </div>
        }
      />

      <motion.section
        layout
        className="grid gap-6 md:grid-cols-2"
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
      >
        {assistantEntries.map((entry) => {
          const assistant = supportedAssistants[entry.key];
          return (
            <article
              key={entry.key}
              className="flex h-full flex-col justify-between rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.14)]"
            >
              <div>
                <h2 className="page-heading text-2xl font-semibold">{assistant.title}</h2>
                <p className="mt-3 text-sm text-white/70">{assistant.description}</p>
              </div>
              <Link
                to={entry.route}
                className="mt-6 inline-flex w-fit items-center gap-2 rounded-full border border-indigo-400/40 bg-indigo-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-indigo-200 transition hover:border-indigo-300/60"
              >
                <FiMessageCircle /> Open console
              </Link>
            </article>
          );
        })}
        <article className="flex h-full flex-col justify-center rounded-3xl border border-dashed border-white/20 bg-white/5 p-6 text-center text-white/70">
          <FiCpu className="mx-auto mb-3 h-10 w-10 text-indigo-300" />
          <p className="text-sm">Connect your OpenAI credentials to activate assistants with branded tone-of-voice presets.</p>
        </article>
      </motion.section>

      <section className="mt-10 grid gap-6 md:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
          <h3 className="text-lg font-semibold text-white">Manage credit balance</h3>
          <p className="mt-2 text-sm text-white/60">
            Recharge with preset bundles or apply manual adjustments when testing assistants internally.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            {quickTopUps.map((amount) => (
              <button
                key={amount}
                type="button"
                onClick={() => startCheckout(amount)}
                className="rounded-full border border-violet-500/30 bg-violet-500/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-violet-100 transition hover:border-violet-400/60"
              >
                Top up {amount} credits
              </button>
            ))}
            <button
              type="button"
              onClick={() => addCredits(10, { provider: 'admin', reference: 'manual-test' })}
              className="rounded-full border border-white/20 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.3em] text-white/80 transition hover:border-white/40"
            >
              Add 10 credits (manual)
            </button>
          </div>
        </div>
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.12)] text-sm text-white/70">
          <h3 className="text-lg font-semibold text-white">Assistant tips</h3>
          <ul className="mt-3 space-y-2">
            <li>• StrategyGPT works best when supplied with metrics or goals.</li>
            <li>• FinanceGPT can interpret CSV data — paste rows for quick summaries.</li>
            <li>• InventoryGPT supports scenario prompts like “what if sales double?”.</li>
            <li>• Credits refresh instantly after top-ups via Stripe or manual grants.</li>
          </ul>
        </div>
      </section>
    </main>
  );
};

export default AIHub;
