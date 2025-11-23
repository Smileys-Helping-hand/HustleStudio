import { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  PieChart,
  Pie,
  Cell,
  Legend,
  BarChart,
  Bar,
} from 'recharts';
import PageHeader from '../components/common/PageHeader.jsx';
import { useAnalytics } from '../hooks/useAnalytics.js';
import { exportToCSV, exportToGoogleSheets, exportToPDF } from '../lib/exportUtils.js';
import { useTenant } from '../context/TenantContext.jsx';

const TAB_OPTIONS = ['Business', 'AI Usage', 'Team Performance'];

const pieColours = ['#818CF8', '#C084FC', '#F9A8D4', '#34D399'];

const resolveTimestamp = (value) => {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  if (value.toDate) return value.toDate();
  if (value.seconds) return new Date(value.seconds * 1000);
  return new Date(value);
};

const buildTableData = (label, rows) => ({
  title: `${label} Snapshot`,
  head: [Object.keys(rows[0] ?? { metric: 'Metric', value: 'Value' })],
  body: rows.map((row) => Object.values(row)),
  filename: `${label.toLowerCase().replace(/\s+/g, '-')}-analytics.pdf`,
});

const SectionCard = ({ children }) => (
  <motion.section
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.45 }}
    className="rounded-3xl border border-white/10 bg-white/5 p-6 text-white shadow-[0_0_25px_rgba(147,51,234,0.15)] backdrop-blur"
  >
    {children}
  </motion.section>
);

const Analytics = () => {
  const [activeTab, setActiveTab] = useState(TAB_OPTIONS[0]);
  const { metrics, loading } = useAnalytics();
  const { activeTenant, activeTenantId } = useTenant();

  const salesRows = useMemo(() => {
    if (!metrics.sales) return [];
    return metrics.sales.dailySeries.map((entry) => ({ day: entry.day, revenue: entry.value }));
  }, [metrics.sales]);

  const usageRows = useMemo(() => {
    if (!metrics.usage) return [];
    return metrics.usage.usageByAssistant.map((entry) => ({
      assistant: entry.assistant,
      credits: entry.credits,
      tokens: entry.tokens,
    }));
  }, [metrics.usage]);

  const teamRows = useMemo(() => {
    if (!metrics.team) return [];
    return metrics.team.roles.map((entry) => ({ role: entry.role, members: entry.count }));
  }, [metrics.team]);

  const handleExport = (type) => {
    if (activeTab === 'Business' && metrics.sales) {
      const table = buildTableData('Business', [
        { metric: 'Total Revenue', value: metrics.sales.totalRevenue },
        { metric: 'Sales Count', value: metrics.sales.salesCount },
        { metric: 'Average Order', value: metrics.sales.averageOrder },
      ]);
      if (type === 'csv') exportToCSV(salesRows, 'business-analytics.csv');
      if (type === 'pdf') exportToPDF(table);
      if (type === 'sheets') exportToGoogleSheets(salesRows, 'Business Analytics');
    }
    if (activeTab === 'AI Usage' && metrics.usage) {
      const table = buildTableData('AI Usage', [
        { metric: 'Total Credits', value: metrics.usage.totalCredits },
        { metric: 'Total Tokens', value: metrics.usage.totalTokens },
      ]);
      if (type === 'csv') exportToCSV(usageRows, 'ai-usage.csv');
      if (type === 'pdf') exportToPDF(table);
      if (type === 'sheets') exportToGoogleSheets(usageRows, 'AI Usage Analytics');
    }
    if (activeTab === 'Team Performance' && metrics.team) {
      const table = buildTableData('Team Performance', teamRows);
      if (type === 'csv') exportToCSV(teamRows, 'team-performance.csv');
      if (type === 'pdf') exportToPDF(table);
      if (type === 'sheets') exportToGoogleSheets(teamRows, 'Team Performance');
    }
  };

  if (!activeTenantId) {
    return (
      <div className="mx-auto max-w-5xl space-y-4 px-6 py-16 text-center text-white/70">
        <h1 className="text-3xl font-semibold text-white">Analytics</h1>
        <p>Select or create a workspace to explore analytics dashboards.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 px-4 pb-20">
      <PageHeader
        title={`Unified analytics • ${activeTenant?.name ?? 'Workspace'}`}
        subtitle="Track sales momentum, assistant usage, and crew productivity from a single command centre."
        actions={
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleExport('csv')}
              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:bg-white/20"
            >
              Export CSV
            </button>
            <button
              type="button"
              onClick={() => handleExport('pdf')}
              className="rounded-full border border-white/10 bg-white/10 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white/70 transition hover:bg-white/20"
            >
              Export PDF
            </button>
            <button
              type="button"
              onClick={() => handleExport('sheets')}
              className="rounded-full border border-indigo-400/30 bg-indigo-500/20 px-4 py-2 text-xs uppercase tracking-[0.35em] text-white transition hover:bg-indigo-500/40"
            >
              Google Sheets
            </button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-3">
        {TAB_OPTIONS.map((tab) => (
          <button
            key={tab}
            type="button"
            onClick={() => setActiveTab(tab)}
            className={`rounded-full border px-5 py-2 text-xs uppercase tracking-[0.35em] transition ${
              tab === activeTab
                ? 'border-indigo-400/70 bg-indigo-500/20 text-white shadow-[0_0_20px_rgba(99,102,241,0.4)]'
                : 'border-white/10 bg-white/5 text-white/60 hover:text-white'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {loading ? (
        <SectionCard>
          <p className="text-sm text-white/70">Crunching the latest metrics…</p>
        </SectionCard>
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          {activeTab === 'Business' && metrics.sales && (
            <>
              <SectionCard>
                <h2 className="text-lg font-semibold text-white">Revenue pulse (7 days)</h2>
                <div className="mt-4 h-64 w-full">
                  <ResponsiveContainer>
                    <LineChart data={metrics.sales.dailySeries}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                      <XAxis dataKey="day" stroke="#CBD5F5" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#CBD5F5" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: '#0f0f17', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12 }} />
                      <Line type="monotone" dataKey="value" stroke="#8b5cf6" strokeWidth={3} dot={false} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
              <SectionCard>
                <div className="grid gap-3 text-sm">
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <span className="text-white/60">Total revenue</span>
                    <span className="text-xl font-semibold text-white">R{metrics.sales.totalRevenue.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <span className="text-white/60">Orders processed</span>
                    <span className="text-xl font-semibold text-white">{metrics.sales.salesCount}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-white/5 p-4">
                    <span className="text-white/60">Average order value</span>
                    <span className="text-xl font-semibold text-white">R{metrics.sales.averageOrder.toFixed(2)}</span>
                  </div>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === 'AI Usage' && metrics.usage && (
            <>
              <SectionCard>
                <h2 className="text-lg font-semibold text-white">Assistant credit mix</h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={metrics.usage.usageByAssistant} dataKey="credits" nameKey="assistant" innerRadius={60} outerRadius={100} paddingAngle={4}>
                        {metrics.usage.usageByAssistant.map((entry, index) => (
                          <Cell key={entry.assistant} fill={pieColours[index % pieColours.length]} />
                        ))}
                      </Pie>
                      <Tooltip contentStyle={{ background: '#0f0f17', borderRadius: 12, border: '1px solid rgba(99,102,241,0.4)' }} />
                      <Legend verticalAlign="bottom" height={36} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
              <SectionCard>
                <h2 className="text-lg font-semibold text-white">Usage snapshot</h2>
                <div className="mt-4 space-y-3 text-sm">
                  <p className="flex items-center justify-between rounded-2xl bg-white/5 p-4 text-white/80">
                    <span>Total credits consumed</span>
                    <span className="text-lg font-semibold text-white">{metrics.usage.totalCredits.toFixed(2)} credits</span>
                  </p>
                  <p className="flex items-center justify-between rounded-2xl bg-white/5 p-4 text-white/80">
                    <span>Tokens processed</span>
                    <span className="text-lg font-semibold text-white">{metrics.usage.totalTokens}</span>
                  </p>
                </div>
              </SectionCard>
            </>
          )}

          {activeTab === 'Team Performance' && metrics.team && (
            <>
              <SectionCard>
                <h2 className="text-lg font-semibold text-white">Role distribution</h2>
                <div className="mt-4 h-64">
                  <ResponsiveContainer>
                    <BarChart data={metrics.team.roles}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(148,163,184,0.25)" />
                      <XAxis dataKey="role" stroke="#CBD5F5" tick={{ fontSize: 12 }} />
                      <YAxis stroke="#CBD5F5" tick={{ fontSize: 12 }} />
                      <Tooltip contentStyle={{ background: '#0f0f17', border: '1px solid rgba(99,102,241,0.4)', borderRadius: 12 }} />
                      <Bar dataKey="count" fill="#34D399" radius={[12, 12, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </SectionCard>
                  <SectionCard>
                    <h2 className="text-lg font-semibold text-white">Latest crew activity</h2>
                    <ul className="mt-4 space-y-3 text-sm text-white/70">
                      {metrics.team.recentActivity.map((log) => (
                        <li key={log.id} className="rounded-2xl bg-white/5 p-4">
                          <p className="font-medium text-white">{log.message}</p>
                          <p className="mt-1 text-xs uppercase tracking-[0.35em] text-white/40">
                            {resolveTimestamp(log.createdAt).toLocaleString()} — {log.actor}
                          </p>
                        </li>
                      ))}
                      {metrics.team.recentActivity.length === 0 && (
                    <li className="rounded-2xl bg-white/5 p-4 text-xs text-white/50">No crew events logged yet.</li>
                  )}
                </ul>
              </SectionCard>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default Analytics;
