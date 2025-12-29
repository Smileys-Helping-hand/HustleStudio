import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { getDocs, query, where, Timestamp, orderBy } from 'firebase/firestore';
import { useTenant } from '../context/TenantContext.jsx';
import { generateFinanceInsight } from '../lib/insightBot.js';
import { tenantCollection } from '../lib/tenant.js';
import toast from 'react-hot-toast';

const COLORS = ['#8b5cf6', '#22d3ee', '#f97316', '#10b981', '#f59e0b'];

const Insights = () => {
  const { activeTenant, activeTenantId } = useTenant();
  const [salesSeries, setSalesSeries] = useState([]);
  const [aiUsageSplit, setAiUsageSplit] = useState([]);
  const [revenueVsCredits, setRevenueVsCredits] = useState([]);
  const [summary, setSummary] = useState('');
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch real data from Firebase
  useEffect(() => {
    const fetchInsightsData = async () => {
      if (!activeTenantId) {
        setSalesSeries([]);
        setAiUsageSplit([]);
        setRevenueVsCredits([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const sevenDaysAgo = Timestamp.fromMillis(Date.now() - 7 * 24 * 60 * 60 * 1000);
        
        // Fetch sales data
        const salesQuery = query(
          tenantCollection(activeTenantId, 'sales'),
          where('createdAt', '>=', sevenDaysAgo),
          orderBy('createdAt', 'asc')
        );
        const salesSnapshot = await getDocs(salesQuery);
        const salesByDay = {};
        const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        
        salesSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const date = data.createdAt?.toDate();
          if (date) {
            const dayLabel = days[date.getDay()];
            salesByDay[dayLabel] = (salesByDay[dayLabel] || 0) + (data.totals?.total || 0);
          }
        });
        
        const salesData = days.map(day => ({ label: day, total: salesByDay[day] || 0 }));
        setSalesSeries(salesData);

        // Fetch AI usage data
        const aiLogsSnapshot = await getDocs(tenantCollection(activeTenantId, 'aiLogs'));
        const aiUsage = {};
        aiLogsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const assistant = data.assistant || 'General';
          aiUsage[assistant] = (aiUsage[assistant] || 0) + 1;
        });
        
        const totalUsage = Object.values(aiUsage).reduce((sum, val) => sum + val, 0);
        const aiData = Object.entries(aiUsage).map(([label, count]) => ({
          label,
          value: totalUsage > 0 ? Math.round((count / totalUsage) * 100) : 0
        }));
        setAiUsageSplit(aiData);

        // Fetch revenue and credits data (last 4 weeks)
        const fourWeeksAgo = Timestamp.fromMillis(Date.now() - 28 * 24 * 60 * 60 * 1000);
        const revenueQuery = query(
          tenantCollection(activeTenantId, 'sales'),
          where('createdAt', '>=', fourWeeksAgo),
          orderBy('createdAt', 'asc')
        );
        const revenueSnapshot = await getDocs(revenueQuery);
        const weeklyData = { 'Week 1': 0, 'Week 2': 0, 'Week 3': 0, 'Week 4': 0 };
        
        revenueSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const date = data.createdAt?.toDate();
          if (date) {
            const weekNum = Math.floor((Date.now() - date.getTime()) / (7 * 24 * 60 * 60 * 1000));
            const weekLabel = `Week ${4 - weekNum}`;
            if (weeklyData[weekLabel] !== undefined) {
              weeklyData[weekLabel] += data.totals?.total || 0;
            }
          }
        });
        
        const revenueData = Object.entries(weeklyData).map(([label, revenue]) => ({
          label,
          revenue: Math.round(revenue),
          credits: Math.round(revenue / 50) // Estimate credits based on revenue
        }));
        setRevenueVsCredits(revenueData);

      } catch (error) {
        console.error('[Insights] Failed to fetch data:', error);
        toast.error('Failed to load insights data');
      } finally {
        setLoading(false);
      }
    };

    fetchInsightsData();
  }, [activeTenantId]);

  const handleGenerateSummary = async () => {
    if (!activeTenantId) {
      toast.error('Select a workspace first');
      return;
    }

    try {
      setLoadingSummary(true);
      const totalSales = salesSeries.reduce((sum, day) => sum + day.total, 0);
      const bestDay = salesSeries.reduce((max, day) => day.total > max.total ? day : max, salesSeries[0] || { label: 'N/A', total: 0 });
      const totalRevenue = revenueVsCredits.reduce((sum, week) => sum + week.revenue, 0);
      const avgCredits = revenueVsCredits.length > 0 ? Math.round(revenueVsCredits.reduce((sum, week) => sum + week.credits, 0) / revenueVsCredits.length) : 0;
      const topAI = aiUsageSplit.length > 0 ? aiUsageSplit[0] : { label: 'N/A', value: 0 };
      
      const generatedSummary = `📊 Weekly Performance Summary

Sales Trends:
• Total weekly sales: $${totalSales.toLocaleString()}
• Best performing day: ${bestDay.label} ($${bestDay.total.toLocaleString()})
${salesSeries.length > 0 ? `• Average daily sales: $${Math.round(totalSales / salesSeries.length).toLocaleString()}` : ''}

AI Assistant Insights:
${aiUsageSplit.length > 0 ? `• Most utilized: ${topAI.label} (${topAI.value}% of queries)` : '• No AI usage data available'}
${aiUsageSplit.length > 0 ? `• Total AI sessions: ${aiUsageSplit.reduce((sum, item) => sum + item.value, 0)}` : ''}

Revenue & Credits Analysis:
• Monthly revenue: $${totalRevenue.toLocaleString()}
${avgCredits > 0 ? `• Average credit consumption: ${avgCredits} credits/week` : ''}

🎯 Recommended Actions:
1. ${bestDay.total > 0 ? `Focus marketing on ${bestDay.label} - your peak performance day` : 'Start tracking sales data for insights'}
2. ${aiUsageSplit.length > 0 ? 'Continue leveraging AI assistants for efficiency gains' : 'Enable AI assistants to boost productivity'}
3. ${totalRevenue > 0 ? 'Maintain current momentum and explore upsell opportunities' : 'Begin recording sales to track revenue trends'}`;

      setSummary(generatedSummary);
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
