import { useEffect, useState } from 'react';
import { ResponsiveContainer, Line, LineChart, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts';
import PageHeader from '../components/common/PageHeader.jsx';
import { fetchWarehouseSnapshots } from '../lib/analyticsCloud.js';
import { forecastTrends } from '../lib/forecastEngine.js';
import { useTenant } from '../context/TenantContext.jsx';
import toast from 'react-hot-toast';

export default function Forecasts() {
  const { activeTenantId } = useTenant();
  const [snapshots, setSnapshots] = useState([]);
  const [insight, setInsight] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeTenantId) {
      setSnapshots([]);
      return;
    }
    fetchWarehouseSnapshots(activeTenantId).then((data) => {
      setSnapshots(data);
    });
  }, [activeTenantId]);

  const runForecast = async () => {
    if (!activeTenantId) {
      toast.error('Select a workspace first.');
      return;
    }
    setLoading(true);
    try {
      const result = await forecastTrends(snapshots);
      setInsight(result?.message || result?.content || 'No insight returned.');
    } catch (error) {
      console.error(error);
      toast.error('Unable to generate forecast.');
    } finally {
      setLoading(false);
    }
  };

  const chartData = snapshots.map((item, index) => ({
    index,
    salesGrowth: Number(item.salesGrowth || 0),
    recurringRevenue: Number(item.recurringRevenue || 0),
  }));

  return (
    <main className="mx-auto w-full max-w-5xl px-4 pb-12">
      <PageHeader
        title="Forecast Studio"
        subtitle="Model upcoming revenue and uncover growth actions via AI forecasts."
        actions={[
          { label: loading ? 'Generating…' : 'Predict Next Quarter', onClick: runForecast, disabled: loading },
        ]}
      />

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_0_25px_rgba(99,102,241,0.12)]">
        <h3 className="text-lg font-semibold">Performance Trend</h3>
        <div className="mt-4 h-72">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="index" stroke="#bbb" tickFormatter={(value) => `#${value + 1}`} />
              <YAxis stroke="#bbb" tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
              <Tooltip
                contentStyle={{ background: '#1c1a29', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
              />
              <Line type="monotone" dataKey="salesGrowth" stroke="#8b5cf6" strokeWidth={3} dot />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>

      {insight ? (
        <section className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6 text-sm text-white/80 shadow-[0_0_25px_rgba(99,102,241,0.12)]">
          <h3 className="text-base font-semibold text-white">AI Forecast Insight</h3>
          <p className="mt-3 whitespace-pre-line leading-relaxed">{insight}</p>
        </section>
      ) : null}
    </main>
  );
}
