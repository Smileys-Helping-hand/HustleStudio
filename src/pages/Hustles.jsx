import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import PageHeader from '../components/common/PageHeader.jsx';

const hustleData = [
  {
    name: 'Event Styling Collective',
    revenue: 23800,
    goal: 30000,
    status: 'On track',
    nextAction: 'Design mockups for winter gala',
  },
  {
    name: 'Artisan Market Pop-up',
    revenue: 12950,
    goal: 20000,
    status: 'Ahead',
    nextAction: 'Confirm vendor line-up and marketing push',
  },
  {
    name: 'Hospitality Consulting',
    revenue: 15400,
    goal: 25000,
    status: 'Growth sprint',
    nextAction: 'Package new retainer offer for hotels',
  },
];

const Hustles = () => {
  const totals = useMemo(() => {
    const revenue = hustleData.reduce((sum, hustle) => sum + hustle.revenue, 0);
    const goal = hustleData.reduce((sum, hustle) => sum + hustle.goal, 0);
    return { revenue, goal, progress: (revenue / goal) * 100 };
  }, []);

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="My Hustles"
        subtitle="Track every venture’s momentum, revenue, and next actions in a unified cockpit."
        actions={
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.3em] text-white/60">
            Portfolio view
          </span>
        }
      />

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="space-y-8"
      >
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.12)]">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Portfolio revenue</p>
              <p className="text-3xl font-semibold text-white">R{totals.revenue.toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Annual goal</p>
              <p className="text-xl font-semibold text-indigo-100">R{totals.goal.toLocaleString()}</p>
            </div>
            <div className="min-w-[200px]">
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Progress</p>
              <div className="mt-2 h-2 rounded-full bg-white/10">
                <div
                  className="h-2 rounded-full bg-indigo-400"
                  style={{ width: `${Math.min(totals.progress, 100).toFixed(1)}%` }}
                />
              </div>
              <p className="mt-1 text-xs text-white/60">{totals.progress.toFixed(1)}% of annual target</p>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {hustleData.map((item) => (
            <article
              key={item.name}
              className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_30px_rgba(99,102,241,0.12)] transition hover:-translate-y-1 hover:shadow-[0_0_40px_rgba(129,140,248,0.35)]"
            >
              <h2 className="text-lg font-semibold text-white">{item.name}</h2>
              <p className="mt-3 text-sm text-white/70">Status: {item.status}</p>
              <p className="mt-2 text-sm text-indigo-200">Revenue: R{item.revenue.toLocaleString()}</p>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">Goal: R{item.goal.toLocaleString()}</p>
              <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/70">
                <p className="text-xs uppercase tracking-[0.3em] text-white/50">Next action</p>
                <p className="mt-1 text-white">{item.nextAction}</p>
              </div>
            </article>
          ))}
        </div>
      </motion.section>
    </main>
  );
};

export default Hustles;
