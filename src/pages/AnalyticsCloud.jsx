import { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, AreaChart, Area, CartesianGrid, Tooltip, XAxis, YAxis, BarChart, Bar } from 'recharts';
import PageHeader from '../components/common/PageHeader.jsx';
import { fetchGlobalWarehouseSummary, fetchWarehouseSnapshots } from '../lib/analyticsCloud.js';
import { useTenant } from '../context/TenantContext.jsx';

export default function AnalyticsCloud() {
  const { activeTenantId } = useTenant();
  const [snapshots, setSnapshots] = useState([]);
  const [globalSummary, setGlobalSummary] = useState([]);

  useEffect(() => {
    fetchGlobalWarehouseSummary().then(setGlobalSummary);
  }, []);

  useEffect(() => {
    if (!activeTenantId) {
      setSnapshots([]);
      return;
    }
    fetchWarehouseSnapshots(activeTenantId).then(setSnapshots);
  }, [activeTenantId]);

  const areaData = useMemo(() => {
    if (snapshots.length === 0) {
      return globalSummary.map((item, index) => ({
        index,
        capturedAt: item.capturedAt,
        salesGrowth: Number(item.salesGrowth || 0),
        averageCreditUsage: Number(item.averageCreditUsage || 0),
      }));
    }
    return snapshots.map((item, index) => ({
      index,
      capturedAt: item.capturedAt,
      salesGrowth: Number(item.salesGrowth || 0),
      averageCreditUsage: Number(item.averageCreditUsage || 0),
    }));
  }, [snapshots, globalSummary]);

  const barData = useMemo(() => {
    return globalSummary.map((item, index) => ({
      index,
      tenant: item.id,
      activeTenants: Number(item.activeTenants || 0),
      averageCreditUsage: Number(item.averageCreditUsage || 0),
    }));
  }, [globalSummary]);

  return (
    <main className="mx-auto w-full max-w-6xl px-4 pb-12">
      <PageHeader
        title="Analytics Cloud"
        subtitle="Compare your workspace benchmarks with the Hustle Studio network."
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_0_25px_rgba(99,102,241,0.15)]">
          <h3 className="text-lg font-semibold">Sales & Credit Utilisation</h3>
          <p className="text-sm text-white/60">Rolling 12 snapshots.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={areaData} margin={{ left: 0, right: 0, top: 8, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="index" stroke="#bbb" tickFormatter={(value) => `#${value + 1}`} />
                <YAxis stroke="#bbb" domain={[0, 1]} tickFormatter={(value) => `${(value * 100).toFixed(0)}%`} />
                <Tooltip
                  contentStyle={{ background: '#1c1a29', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                  formatter={(value) => `${(Number(value) * 100).toFixed(1)}%`}
                />
                <Area type="monotone" dataKey="salesGrowth" stroke="#6366f1" fillOpacity={1} fill="url(#salesGradient)" />
                <Area type="monotone" dataKey="averageCreditUsage" stroke="#8b5cf6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_0_25px_rgba(99,102,241,0.15)]">
          <h3 className="text-lg font-semibold">Active Tenants vs Credit Usage</h3>
          <p className="text-sm text-white/60">Snapshot of the Hustle network.</p>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="tenant" stroke="#bbb" hide />
                <YAxis stroke="#bbb" />
                <Tooltip
                  contentStyle={{ background: '#1c1a29', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12 }}
                />
                <Bar dataKey="activeTenants" fill="#6366f1" radius={[12, 12, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </section>
    </main>
  );
}
