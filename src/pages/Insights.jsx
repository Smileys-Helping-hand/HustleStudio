import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useTenant } from '../context/TenantContext.jsx';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { generateFinanceInsight } from '../lib/insightBot.js';

const COLORS = ['#8b5cf6', '#22d3ee', '#f97316', '#10b981', '#f59e0b'];

const Insights = () => {
  const { activeTenant } = useTenant();
  const { salesSeries, aiUsageSplit, revenueVsCredits, refresh } = useAnalytics();
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  useEffect(() => {
    refresh().catch(() => {});
  }, [refresh]);

  const handleGenerateSummary = async () => {
    try {
      setLoadingSummary(true);
      const payload = {
        sales: salesSeries,
        ai: aiUsageSplit,
        revenue: revenueVsCredits,
      };
      const response = await generateFinanceInsight(payload);
      setSummary(response);
    } catch (error) {
      console.error('[Insights] Failed to create summary', error);
      setSummary('Unable to generate summary right now.');
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <main className="space-y-10 bg-gradient-to-br from-[#0d111d] via-[#161b2f] to-[#1f2339] px-4 pb-16 pt-6 text-white sm:px-10">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Insights & Signals</h1>
          <p className="text-sm text-white/60">
            Weekly intelligence across revenue, AI usage, and credit consumption for {activeTenant?.name ?? 'your workspace'}.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerateSummary}
          className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-5 py-2 text-sm font-semibold shadow-[0_0_25px_rgba(99,102,241,0.35)] transition hover:scale-[1.02]"
        >
          {loadingSummary ? 'Analysing…' : 'Generate weekly digest'}
        </button>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="text-lg font-semibold">Sales velocity (24h)</h2>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={salesSeries}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
              <XAxis dataKey="label" stroke="#b3b6d4" />
              <YAxis stroke="#b3b6d4" />
              <Tooltip
                contentStyle={{ background: '#141827', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              />
              <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="text-lg font-semibold">AI usage split</h2>
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie data={aiUsageSplit} dataKey="value" nameKey="label" innerRadius={60} outerRadius={100}>
                {aiUsageSplit.map((entry, index) => (
                  <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{ background: '#141827', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
              />
            </PieChart>
          </ResponsiveContainer>
        </motion.div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6">
        <h2 className="text-lg font-semibold">Revenue vs credits</h2>
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={revenueVsCredits}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="label" stroke="#b3b6d4" />
            <YAxis stroke="#b3b6d4" />
            <Tooltip
              contentStyle={{ background: '#141827', border: '1px solid rgba(255,255,255,0.15)', color: '#fff' }}
            />
            <Bar dataKey="revenue" fill="#22d3ee" radius={[6, 6, 0, 0]} />
            <Bar dataKey="credits" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70">
        <h2 className="text-lg font-semibold text-white">AI digest</h2>
        <p className="mt-2 whitespace-pre-wrap text-white/80">
          {summary || 'Generate the weekly digest to surface growth levers and focus points.'}
        </p>
      </section>
    </main>
  );
};

export default Insights;
