import { useEffect, useState } from 'react';
import { onSnapshot, orderBy, query } from 'firebase/firestore';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useTenant } from '../../context/TenantContext.jsx';
import { tenantCollection } from '../../lib/tenant.js';

const formatTimestamp = (value) => {
  if (!value) return '—';
  if (typeof value.toDate === 'function') {
    return value.toDate().toLocaleString();
  }
  if (value instanceof Date) {
    return value.toLocaleString();
  }
  return String(value);
};

const emptyState = [];

const AIMetrics = () => {
  const { activeTenantId } = useTenant();
  const [metrics, setMetrics] = useState(emptyState);

  useEffect(() => {
    if (!activeTenantId) {
      setMetrics(emptyState);
      return () => {};
    }

    const metricsRef = tenantCollection(activeTenantId, 'ai_metrics');
    const metricsQuery = query(metricsRef, orderBy('avg', 'desc'));
    const unsubscribe = onSnapshot(metricsQuery, (snapshot) => {
      const rows = snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
      setMetrics(rows);
    });

    return () => unsubscribe();
  }, [activeTenantId]);

  return (
    <main className="space-y-6 p-6 text-white">
      <PageHeader
        title="AI Quality Metrics"
        subtitle="Track average quality scores across assistants and monitor evaluation coverage for this workspace."
      />
      {!activeTenantId && (
        <p className="rounded-lg border border-white/10 bg-white/5 p-4 text-sm text-white/70">
          Select a workspace to review assistant metrics.
        </p>
      )}
      {activeTenantId && (
        <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5 shadow-[0_0_30px_rgba(99,102,241,0.15)]">
          <table className="min-w-full divide-y divide-white/10 text-sm">
            <thead className="bg-white/5 text-left uppercase tracking-wide text-white/60">
              <tr>
                <th className="px-4 py-3">Assistant</th>
                <th className="px-4 py-3">Average score</th>
                <th className="px-4 py-3">Evaluations</th>
                <th className="px-4 py-3">Last evaluated</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {metrics.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-white/60">
                    No evaluations captured yet. Trigger an AI assistant conversation to begin gathering scores.
                  </td>
                </tr>
              )}
              {metrics.map((row) => (
                <tr key={row.id} className="transition hover:bg-white/5">
                  <td className="px-4 py-3 font-medium capitalize text-white">{row.id.replace(/[-_]/g, ' ')}</td>
                  <td className="px-4 py-3 text-white/80">{Number(row.avg ?? 0).toFixed(2)}</td>
                  <td className="px-4 py-3 text-white/70">{row.total ?? 0}</td>
                  <td className="px-4 py-3 text-white/60">{formatTimestamp(row.lastEvaluated)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
};

export default AIMetrics;
