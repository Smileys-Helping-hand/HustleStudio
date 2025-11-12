import { useEffect, useMemo, useState } from 'react';
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { motion } from 'framer-motion';
import { listCandidates, listTenantCvHistory } from '../../lib/candidateManager';
import { useAuth } from '../../context/AuthContext.jsx';

function buildStatusSeries(candidates) {
  const grouped = candidates.reduce((acc, candidate) => {
    const key = (candidate.status ?? 'new').toLowerCase();
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});
  return Object.entries(grouped).map(([status, value]) => ({ status: status.toUpperCase(), value }));
}

function buildCvSeries(history) {
  const grouped = history.reduce((acc, entry) => {
    const timestamp = entry.generatedAt?.toDate?.() ?? new Date();
    const key = `${timestamp.getFullYear()}-${String(timestamp.getMonth() + 1).padStart(2, '0')}`;
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  return Object.entries(grouped)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([month, count]) => ({ month, count }));
}

const RecruitmentAnalytics = () => {
  const { tenantId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [candidates, setCandidates] = useState([]);
  const [cvHistory, setCvHistory] = useState([]);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!tenantId) return;
    const controller = new AbortController();

    async function load() {
      setLoading(true);
      try {
        const [candidateRecords, historyRecords] = await Promise.all([
          listCandidates({ tenantId }),
          listTenantCvHistory({ tenantId }),
        ]);
        if (!controller.signal.aborted) {
          setCandidates(candidateRecords);
          setCvHistory(historyRecords);
          setError(null);
        }
      } catch (err) {
        if (!controller.signal.aborted) {
          console.error('Recruitment analytics fetch failed', err);
          setError(err);
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    load();
    return () => controller.abort();
  }, [tenantId]);

  const statusSeries = useMemo(() => buildStatusSeries(candidates), [candidates]);
  const cvSeries = useMemo(() => buildCvSeries(cvHistory), [cvHistory]);
  const totalCandidates = candidates.length;
  const averageTimeToHire = useMemo(() => {
    const durations = candidates
      .filter((candidate) => candidate.hiredAt && candidate.createdAt)
      .map((candidate) => candidate.hiredAt.toDate() - candidate.createdAt.toDate());
    if (durations.length === 0) return 'N/A';
    const avg = durations.reduce((acc, value) => acc + value, 0) / durations.length;
    return `${Math.round(avg / (1000 * 60 * 60 * 24))} days`;
  }, [candidates]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-semibold text-white">Recruitment analytics</h1>
        <p className="text-white/60">
          Monitor hiring funnel performance, CV generation impact, and efficiency metrics across the talent pipeline.
        </p>
      </div>

      {loading && <p className="text-white/60">Loading analytics…</p>}
      {error && <p className="text-red-400">Unable to load analytics: {error.message}</p>}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-3">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 rounded-3xl border border-white/10 bg-black/40 p-6"
          >
            <p className="text-xs uppercase tracking-widest text-white/40">Total candidates</p>
            <p className="text-3xl font-semibold text-white">{totalCandidates}</p>
            <p className="text-sm text-white/50">Across all sources and statuses.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 rounded-3xl border border-white/10 bg-black/40 p-6"
          >
            <p className="text-xs uppercase tracking-widest text-white/40">Average time to hire</p>
            <p className="text-3xl font-semibold text-white">{averageTimeToHire}</p>
            <p className="text-sm text-white/50">Based on candidates with hire dates recorded.</p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 rounded-3xl border border-white/10 bg-black/40 p-6"
          >
            <p className="text-xs uppercase tracking-widest text-white/40">CVs generated</p>
            <p className="text-3xl font-semibold text-white">{cvHistory.length}</p>
            <p className="text-sm text-white/50">Saved by the AI CV generator in the last 90 days.</p>
          </motion.div>
        </div>
      )}

      {!loading && !error && (
        <div className="grid gap-6 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 rounded-3xl border border-white/10 bg-black/40 p-6"
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">Pipeline status</p>
              <h2 className="text-lg font-semibold text-white">Candidates by stage</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusSeries}>
                  <XAxis dataKey="status" stroke="#aaa" />
                  <YAxis allowDecimals={false} stroke="#aaa" />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                      background: 'rgba(15,15,20,0.9)',
                      borderRadius: '1rem',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="value" fill="#D4C19C" radius={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3 rounded-3xl border border-white/10 bg-black/40 p-6"
          >
            <div>
              <p className="text-xs uppercase tracking-widest text-white/40">CV output</p>
              <h2 className="text-lg font-semibold text-white">CVs generated per month</h2>
            </div>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cvSeries}>
                  <XAxis dataKey="month" stroke="#aaa" />
                  <YAxis allowDecimals={false} stroke="#aaa" />
                  <Tooltip
                    cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                    contentStyle={{
                      background: 'rgba(15,15,20,0.9)',
                      borderRadius: '1rem',
                      border: '1px solid rgba(255,255,255,0.1)',
                      color: '#fff',
                    }}
                  />
                  <Bar dataKey="count" fill="#68785C" radius={8} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default RecruitmentAnalytics;
