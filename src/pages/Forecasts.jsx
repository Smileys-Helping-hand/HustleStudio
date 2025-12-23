import { useEffect, useState } from 'react';
import { ResponsiveContainer, Line, LineChart, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import PageHeader from '../components/common/PageHeader.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

// Mock data for demonstration
const mockSnapshots = [
  { salesGrowth: 0.12, recurringRevenue: 0.08, month: 'Jan' },
  { salesGrowth: 0.15, recurringRevenue: 0.10, month: 'Feb' },
  { salesGrowth: 0.18, recurringRevenue: 0.12, month: 'Mar' },
  { salesGrowth: 0.22, recurringRevenue: 0.15, month: 'Apr' },
  { salesGrowth: 0.19, recurringRevenue: 0.14, month: 'May' },
  { salesGrowth: 0.25, recurringRevenue: 0.18, month: 'Jun' },
];

export default function Forecasts() {
  const { activeTenantId, activeTenant } = useTenant();
  const [snapshots, setSnapshots] = useState(mockSnapshots);
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);

  const runForecast = async () => {
    if (!activeTenantId) {
      toast.error('Select a workspace first.');
      return;
    }
    setLoading(true);
    try {
      // Mock forecast generation
      const avgGrowth = snapshots.reduce((sum, s) => sum + s.salesGrowth, 0) / snapshots.length;
      const avgRevenue = snapshots.reduce((sum, s) => sum + s.recurringRevenue, 0) / snapshots.length;
      
      const predictedGrowth = avgGrowth * 1.15; // 15% optimistic projection
      const predictedRevenue = avgRevenue * 1.12; // 12% revenue growth
      
      const forecastInsight = `🔮 Q1 2026 Forecast Analysis

Based on the last 6 months of performance data:

Sales Growth Projection:
• Current average: ${(avgGrowth * 100).toFixed(1)}% monthly growth
• Predicted Q1 growth: ${(predictedGrowth * 100).toFixed(1)}%
• Confidence level: 87% (strong historical trend)

Revenue Forecast:
• Current recurring revenue growth: ${(avgRevenue * 100).toFixed(1)}%
• Projected Q1 recurring revenue: ${(predictedRevenue * 100).toFixed(1)}%
• Expected MRR increase: $${Math.round(predictedRevenue * 15000).toLocaleString()}

Key Insights:
✅ Consistent upward trajectory in sales velocity
✅ Strong recurring revenue base indicates customer retention
⚠️ Consider capacity planning for ${(predictedGrowth * 100).toFixed(0)}% growth scenario

Recommended Actions:
1. Secure additional inventory to support projected ${(predictedGrowth * 100).toFixed(0)}% sales increase
2. Scale marketing spend by 20% to capitalize on momentum
3. Hire 2-3 additional team members by end of Q1
4. Implement customer success program to maintain ${(predictedRevenue * 100).toFixed(0)}% recurring revenue

Risk Factors to Monitor:
• Market saturation in primary segment
• Seasonal fluctuations (historical Q1 data shows 8% dip)
• Supply chain constraints if growth exceeds ${(predictedGrowth * 1.2 * 100).toFixed(0)}%`;

      setInsight(forecastInsight);
      toast.success('Forecast generated successfully');
    } catch (error) {
      console.error(error);
      toast.error('Unable to generate forecast.');
    } finally {
      setLoading(false);
    }
  };

  const chartData = snapshots.map((item, index) => ({
    index,
    month: item.month,
    salesGrowth: Number(item.salesGrowth || 0),
    recurringRevenue: Number(item.recurringRevenue || 0),
  }));

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#0e0e18] to-[#1b1830] px-6 pb-24 pt-8 text-white sm:px-10 lg:px-12">
      <PageHeader
        title="Forecast Studio"
        subtitle={`Model upcoming revenue and uncover growth actions for ${activeTenant?.name || 'your workspace'} via AI-powered forecasts.`}
        actions={
          <button
            onClick={runForecast}
            disabled={loading}
            className="rounded-lg bg-gradient-to-r from-indigo-500 to-purple-500 px-6 py-3 text-sm font-semibold transition hover:from-indigo-600 hover:to-purple-600 disabled:opacity-50"
          >
            {loading ? 'Generating…' : 'Predict Next Quarter'}
          </button>
        }
      />

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-8 rounded-3xl border border-white/10 bg-white/5 p-6 shadow-lg"
      >
        <h3 className="text-xl font-semibold">6-Month Performance Trend</h3>
        <p className="mt-2 text-sm text-white/70">Historical sales growth and recurring revenue patterns</p>
        <div className="mt-6 h-80">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis 
                dataKey="month" 
                stroke="#bbb" 
              />
              <YAxis 
                stroke="#bbb" 
                tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} 
              />
              <Tooltip
                contentStyle={{ background: '#1c1a29', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
              />
              <Line 
                type="monotone" 
                dataKey="salesGrowth" 
                stroke="#8b5cf6" 
                strokeWidth={3} 
                dot={{ fill: '#8b5cf6', r: 5 }}
                name="Sales Growth"
              />
              <Line 
                type="monotone" 
                dataKey="recurringRevenue" 
                stroke="#22d3ee" 
                strokeWidth={3} 
                dot={{ fill: '#22d3ee', r: 5 }}
                name="Recurring Revenue"
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 flex gap-6 text-xs">
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#8b5cf6]" />
            <span className="text-white/70">Sales Growth</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-full bg-[#22d3ee]" />
            <span className="text-white/70">Recurring Revenue</span>
          </div>
        </div>
      </motion.section>

      {insight && (
        <motion.section
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-8 rounded-3xl border border-white/10 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 p-6 shadow-lg"
        >
          <h3 className="text-xl font-semibold">AI Forecast Insight</h3>
          <p className="mt-4 whitespace-pre-line text-sm leading-relaxed text-white/90">{insight}</p>
        </motion.section>
      )}
    </main>
  );
}
