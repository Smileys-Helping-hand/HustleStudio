import React, { useEffect, useMemo, useState } from 'react';
import { ResponsiveContainer, LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import PageHeader from '../components/common/PageHeader.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { tenantCollection } from '../lib/tenant.js';
import { exportToCSV, exportToPDF } from '../lib/exportUtils.js';
import { useNotify } from '../context/NotificationContext.jsx';

const palette = ['#a855f7', '#6366f1', '#14b8a6', '#f97316'];

const MarketingAnalytics = () => {
  const { activeTenantId } = useTenant();
  const notify = useNotify();
  const [trend, setTrend] = useState([]);
  const [spend, setSpend] = useState([]);
  const [campaigns, setCampaigns] = useState([]);

  useEffect(() => {
    if (!activeTenantId) {
      setTrend([]);
      setSpend([]);
      setCampaigns([]);
      return () => {};
    }
    const trendQuery = query(
      tenantCollection(activeTenantId, 'marketingMetrics'),
      orderBy('date', 'asc')
    );
    const unsubscribeTrend = onSnapshot(trendQuery, (snapshot) => {
      setTrend(
        snapshot.docs.map((docSnapshot) => {
          const data = docSnapshot.data();
          const dateValue = data.date?.toDate ? data.date.toDate() : new Date(data.date);
          return {
            id: docSnapshot.id,
            ...data,
            dateLabel: dateValue ? dateValue.toLocaleDateString() : data.date,
          };
        })
      );
    });

    const campaignQuery = query(
      tenantCollection(activeTenantId, 'marketingCampaigns'),
      orderBy('createdAt', 'desc')
    );
    const unsubscribeCampaigns = onSnapshot(campaignQuery, (snapshot) => {
      setCampaigns(snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() })));
    });

    return () => {
      unsubscribeTrend();
      unsubscribeCampaigns();
    };
  }, [activeTenantId]);

  useEffect(() => {
    setSpend(
      trend.map((entry) => ({
        name: entry.dateLabel ?? entry.date,
        spend: Number(entry.spend ?? 0),
        revenue: Number(entry.revenue ?? 0),
      }))
    );
  }, [trend]);

  const pieData = useMemo(() => {
    const totals = new Map();
    trend.forEach((entry) => {
      const channel = entry.channel ?? 'Paid';
      totals.set(channel, (totals.get(channel) ?? 0) + Number(entry.reach ?? 0));
    });
    return Array.from(totals.entries()).map(([name, value]) => ({ name, value }));
  }, [trend]);

  const exportMetrics = () => {
    if (!trend.length) {
      notify({ type: 'info', title: 'No marketing metrics available yet.' });
      return;
    }
    exportToCSV(trend, 'marketing-trend');
    exportToPDF(
      trend.map((entry) => ({ Date: entry.dateLabel ?? entry.date, Reach: entry.reach, Revenue: entry.revenue })),
      'MarketingTrend'
    );
    notify({ type: 'success', title: 'Marketing analytics exported' });
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-[#101029] to-[#1a1540] px-4 pb-16 text-white sm:px-8">
      <PageHeader
        title="Marketing Analytics"
        subtitle="Track reach, ROI, and campaign performance with real-time Firestore updates."
        actions={
          <button
            type="button"
            onClick={exportMetrics}
            className="rounded-full bg-indigo-500/30 px-4 py-2 text-xs uppercase tracking-[0.3em] text-indigo-100 transition hover:bg-indigo-500/40"
          >
            Export insights
          </button>
        }
      />

      <section className="grid gap-6 lg:grid-cols-2">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.18)]">
          <h3 className="text-lg font-semibold text-white">Engagement trend</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
                <LineChart data={trend}>
                <CartesianGrid stroke="#ffffff22" strokeDasharray="3 3" />
                <XAxis dataKey="dateLabel" stroke="#d1d5db" tick={{ fill: '#d1d5db', fontSize: 12 }} />
                <YAxis stroke="#d1d5db" tick={{ fill: '#d1d5db', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', color: '#fff' }} />
                <Line type="monotone" dataKey="reach" stroke="#a855f7" strokeWidth={3} dot={false} />
                <Line type="monotone" dataKey="conversion" stroke="#14b8a6" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.18)]">
          <h3 className="text-lg font-semibold text-white">Channel reach split</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <PieChart>
                <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={70} outerRadius={110}>
                  {pieData.map((entry, index) => (
                    <Cell key={entry.name} fill={palette[index % palette.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </article>
      </section>

      <section className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_35px_rgba(99,102,241,0.18)]">
          <h3 className="text-lg font-semibold text-white">Spend vs revenue</h3>
          <div className="mt-4 h-72">
            <ResponsiveContainer>
              <BarChart data={spend}>
                <CartesianGrid stroke="#ffffff22" strokeDasharray="3 3" />
                <XAxis dataKey="name" stroke="#d1d5db" tick={{ fill: '#d1d5db', fontSize: 12 }} />
                <YAxis stroke="#d1d5db" tick={{ fill: '#d1d5db', fontSize: 12 }} />
                <Tooltip contentStyle={{ backgroundColor: '#111827', border: 'none', color: '#fff' }} />
                <Bar dataKey="spend" fill="#6366f1" radius={[8, 8, 0, 0]} />
                <Bar dataKey="revenue" fill="#14b8a6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="rounded-3xl border border-white/10 bg-white/5 p-6 text-sm text-white/70 shadow-[0_0_35px_rgba(99,102,241,0.18)]">
          <h3 className="text-lg font-semibold text-white">Recent campaigns</h3>
          <div className="mt-3 space-y-3 max-h-64 overflow-y-auto">
            {campaigns.map((campaign) => (
              <div key={campaign.id} className="rounded-2xl border border-white/10 bg-black/30 px-4 py-3">
                <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/50">
                  <span>{campaign.product}</span>
                  <span>{campaign.tone}</span>
                </div>
                <p className="mt-2 max-h-24 overflow-hidden text-sm text-white/80">{campaign.content}</p>
              </div>
            ))}
            {!campaigns.length && <p className="text-white/50">Save a campaign to see it here.</p>}
          </div>
        </article>
      </section>
    </main>
  );
};

export default MarketingAnalytics;
