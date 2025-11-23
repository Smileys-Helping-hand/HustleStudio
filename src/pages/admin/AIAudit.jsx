import { useEffect, useMemo, useState } from 'react';
import { collection, onSnapshot, orderBy, query, limit } from 'firebase/firestore';
import PageHeader from '../../components/common/PageHeader.jsx';
import { db } from '../../lib/firebase.js';
import { exportToCSV } from '../../lib/exportUtils.js';

const formatDate = (timestamp) => {
  if (!timestamp) return '—';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString();
};

const calculateCost = (tokens) => {
  const rate = 0.000002; // placeholder USD cost per token
  return tokens * rate;
};

const AIAudit = () => {
  const [logs, setLogs] = useState([]);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    const auditQuery = query(collection(db, 'ai_audit_logs'), orderBy('createdAt', 'desc'), limit(200));
    const unsubscribe = onSnapshot(auditQuery, (snapshot) => {
      setLogs(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
    });
    return unsubscribe;
  }, []);

  const totals = useMemo(() => {
    return logs.reduce(
      (acc, entry) => {
        const tokens = Number(entry.tokens ?? 0);
        acc.tokens += tokens;
        acc.estimatedCost += calculateCost(tokens);
        return acc;
      },
      { tokens: 0, estimatedCost: 0 }
    );
  }, [logs]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportToCSV(
        logs.map((entry) => ({
          id: entry.id,
          tenantId: entry.tenantId,
          userId: entry.userId,
          model: entry.model,
          tokens: entry.tokens,
          assistant: entry.assistant ?? '',
          createdAt: formatDate(entry.createdAt),
          prompt: entry.prompt,
          response: entry.response,
        })),
        'ai_audit_logs.csv'
      );
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <main className="space-y-8 p-6">
      <PageHeader
        title="AI Compliance Audit Logs"
        subtitle="Review every assistant interaction, track token spend, and export records for compliance."
        actions={
          <div className="flex flex-col items-end text-xs text-white/70">
            <span>Total tokens: {totals.tokens.toLocaleString()}</span>
            <span>Est. cost: ${totals.estimatedCost.toFixed(4)}</span>
          </div>
        }
      />

      <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-[0_0_25px_rgba(99,102,241,0.15)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-white/60">
            Showing the 200 most recent assistant interactions. Older entries are pruned automatically.
          </p>
          <button
            type="button"
            onClick={handleExport}
            disabled={isExporting || logs.length === 0}
            className="rounded-full bg-indigo-500 px-4 py-2 text-xs font-semibold uppercase tracking-[0.28em] text-white shadow-[0_0_18px_rgba(99,102,241,0.25)] transition hover:bg-indigo-600 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExporting ? 'Exporting…' : 'Export CSV'}
          </button>
        </div>
        <div className="grid gap-4">
          {logs.map((log) => (
            <article key={log.id} className="rounded-2xl border border-white/10 bg-black/30 p-4 text-sm text-white/80">
              <header className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs uppercase tracking-[0.28em] text-white/60">
                <span>{log.model} • {log.tokens ?? 0} tokens</span>
                <span>{formatDate(log.createdAt)}</span>
              </header>
              <div className="mb-2 text-xs text-white/50">
                Tenant: <span className="text-white/80">{log.tenantId ?? 'unknown'}</span> • User:{' '}
                <span className="text-white/80">{log.userId ?? 'unknown'}</span>{' '}
                {log.assistant && <span>• Assistant: <span className="text-white/80">{log.assistant}</span></span>}
              </div>
              <div>
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Prompt</h3>
                <p className="whitespace-pre-wrap rounded-xl bg-white/5 p-3 text-sm text-white/70">{log.prompt}</p>
              </div>
              <div className="mt-3">
                <h3 className="mb-1 text-xs font-semibold uppercase tracking-[0.25em] text-white/60">Response</h3>
                <p className="whitespace-pre-wrap rounded-xl bg-white/5 p-3 text-sm text-white/80">{log.response}</p>
              </div>
            </article>
          ))}
          {logs.length === 0 && (
            <p className="rounded-2xl border border-dashed border-white/20 bg-black/20 p-6 text-center text-sm text-white/60">
              No assistant activity logged yet. Once your team engages the AI assistants, entries will appear here.
            </p>
          )}
        </div>
      </section>
    </main>
  );
};

export default AIAudit;
