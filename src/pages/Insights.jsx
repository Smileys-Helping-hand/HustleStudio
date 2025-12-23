import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { useTenant } from '../context/TenantContext.jsx';
import { generateFinanceInsight } from '../lib/insightBot.js';
import toast from 'react-hot-toast';

const COLORS = ['#8b5cf6', '#22d3ee', '#f97316', '#10b981', '#f59e0b'];

// Mock data for demonstration
const mockSalesSeries = [
  { label: 'Mon', total: 1250 },
  { label: 'Tue', total: 1580 },
  { label: 'Wed', total: 1890 },
  { label: 'Thu', total: 2100 },
  { label: 'Fri', total: 2450 },
  { label: 'Sat', total: 2890 },
  { label: 'Sun', total: 1920 },
];

const mockAiUsageSplit = [
  { label: 'Strategy GPT', value: 35 },
  { label: 'Finance GPT', value: 28 },
  { label: 'Inventory GPT', value: 22 },
  { label: 'Assistant GPT', value: 15 },
];

const mockRevenueVsCredits = [
  { label: 'Week 1', revenue: 4500, credits: 120 },
  { label: 'Week 2', revenue: 5200, credits: 150 },
  { label: 'Week 3', revenue: 4800, credits: 135 },
  { label: 'Week 4', revenue: 6100, credits: 180 },
];

const Insights = () => {
  const { activeTenant } = useTenant();
  const [salesSeries, setSalesSeries] = useState(mockSalesSeries);
  const [aiUsageSplit, setAiUsageSplit] = useState(mockAiUsageSplit);
  const [revenueVsCredits, setRevenueVsCredits] = useState(mockRevenueVsCredits);
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);

  const handleGenerateSummary = async () => {
    try {
      setLoadingSummary(true);
      const payload = {
        sales: salesSeries,
        ai: aiUsageSplit,
        revenue: revenueVsCredits,
      };
      
      // Mock summary generation
      const mockSummary = `📊 Weekly Performance Summary

Sales Trends:
• Total weekly sales: $${salesSeries.reduce((sum, day) => sum + day.total, 0).toLocaleString()}
• Best performing day: ${salesSeries.reduce((max, day) => day.total > max.total ? day : max).label} ($${salesSeries.reduce((max, day) => day.total > max.total ? day : max).total})
• Week-over-week growth: +18% (strong upward momentum)

AI Assistant Insights:
• Most utilized: ${aiUsageSplit[0].label} (${aiUsageSplit[0].value}% of queries)
• Total AI interactions: ${aiUsageSplit.reduce((sum, item) => sum + item.value, 0)} sessions
• Efficiency gain: Estimated 12 hours saved this week

Revenue & Credits Analysis:
• Monthly revenue trajectory: $${revenueVsCredits.reduce((sum, week) => sum + week.revenue, 0).toLocaleString()}
• Average credit consumption: ${Math.round(revenueVsCredits.reduce((sum, week) => sum + week.credits, 0) / revenueVsCredits.length)} credits/week
• ROI on AI tools: 340% based on time savings vs credit cost

🎯 Recommended Actions:
1. Continue current sales momentum - Saturday shows peak performance
2. Increase Strategy GPT usage for scaling planning
3. Consider credit top-up next week to maintain AI assistant availability`;

      setSummary(mockSummary);
      toast.success('Weekly digest generated');
    } catch (error) {
      console.error('[Insights] Failed to create summary', error);
      setSummary('Unable to generate summary right now.');
      toast.error('Failed to generate summary');
    } finally {
      setLoadingSummary(false);
    }
  };

  return (
    <main className="min-h-screen space-y-10 bg-gradient-to-br from-[#0d111d] via-[#161b2f] to-[#1f2339] px-6 pb-24 pt-8 text-white sm:px-10 lg:px-12">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-4xl font-bold">Insights & Signals</h1>
          <p className="mt-2 text-white/70">
            Weekly intelligence across revenue, AI usage, and credit consumption for {activeTenant?.name ?? 'your workspace'}.
          </p>
        </div>
        <button
          type="button"
          onClick={handleGenerateSummary}
          disabled={loadingSummary}
          className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold shadow-lg transition hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50"
        >
          {loadingSummary ? 'Analysing…' : 'Generate Weekly Digest'}
        </button>
      </header>

      <section className="grid gap-6 lg:grid-cols-2">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg"
        >
          <h2 className="text-lg font-semibold">Sales Velocity (7 days)</h2>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={salesSeries}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" strokeDasharray="3 3" />
                <XAxis dataKey="label" stroke="#b3b6d4" />
                <YAxis stroke="#b3b6d4" />
                <Tooltip
                  contentStyle={{ background: '#141827', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px' }}
                />
                <Line type="monotone" dataKey="total" stroke="#8b5cf6" strokeWidth={3} dot={{ fill: '#8b5cf6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg"
        >
          <h2 className="text-lg font-semibold">AI Usage Split</h2>
          <div className="mt-4">
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={aiUsageSplit} dataKey="value" nameKey="label" innerRadius={60} outerRadius={100} paddingAngle={2}>
                  {aiUsageSplit.map((entry, index) => (
                    <Cell key={entry.label} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: '#141827', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 flex flex-wrap gap-3 text-xs">
            {aiUsageSplit.map((item, index) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                <span className="text-white/70">{item.label}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </section>

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.2 }}
        className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold">Revenue vs Credits</h2>
        <div className="mt-4">
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={revenueVsCredits}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="label" stroke="#b3b6d4" />
              <YAxis stroke="#b3b6d4" />
              <Tooltip
                contentStyle={{ background: '#141827', border: '1px solid rgba(255,255,255,0.15)', color: '#fff', borderRadius: '8px' }}
              />
              <Bar dataKey="revenue" fill="#22d3ee" radius={[6, 6, 0, 0]} />
              <Bar dataKey="credits" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#22d3ee]" />
            <span className="text-white/70">Revenue ($)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#8b5cf6]" />
            <span className="text-white/70">Credits Used</span>
          </div>
        </div>
      </motion.section>

      {summary && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-6 shadow-lg"
        >
          <h2 className="text-lg font-semibold">AI Digest</h2>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-white/90">
            {summary}
          </p>
        </motion.section>
      )}
    </main>
  );
};

export default Insights;
