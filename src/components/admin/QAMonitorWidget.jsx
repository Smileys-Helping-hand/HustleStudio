import { useEffect, useMemo, useState } from 'react';
import PropTypes from 'prop-types';

const STATUS_COLORS = {
  healthy: 'text-olive',
  warning: 'text-gold',
  issue: 'text-red-400',
};

function classifyStatus(statusText = '') {
  if (statusText.includes('🔴')) return 'issue';
  if (statusText.includes('🟡')) return 'warning';
  return 'healthy';
}

function deriveStatus(report) {
  const statusText = report?.summary?.status ?? '⚠️ Awaiting audit';
  const variant = classifyStatus(statusText);
  return { statusText, variant };
}

function formatDuration(value) {
  if (value > 120000) {
    return `${Math.round(value / 60000)}m`;
  }
  return `${Math.round(value / 1000)}s`;
}

function formatDate(value) {
  if (!value) return 'Never';
  try {
    return new Date(value).toLocaleString();
  } catch {
    return value;
  }
}

function Metric({ label, value, accent }) {
  return (
    <div className="rounded-2xl border border-white/5 bg-white/5 p-4">
      <p className="text-xs uppercase tracking-widest text-white/40">{label}</p>
      <p className={`mt-2 text-lg font-semibold ${accent ?? 'text-white'}`}>{value}</p>
    </div>
  );
}

Metric.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.node.isRequired,
  accent: PropTypes.string,
};

const DEFAULT_REPORT_PATH = '/docs/QA_Report_latest.json';

const QAMonitorWidget = ({ reportPath = DEFAULT_REPORT_PATH }) => {
  const [report, setReport] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();
    async function loadReport() {
      setLoading(true);
      try {
        const response = await fetch(reportPath, { signal: controller.signal });
        if (!response.ok) {
          throw new Error(`Unable to load QA report (${response.status})`);
        }
        const payload = await response.json();
        setReport(payload);
        setError(null);
      } catch (err) {
        if (err.name !== 'AbortError') {
          setError(err);
        }
      } finally {
        setLoading(false);
      }
    }

    loadReport();
    const refresh = setInterval(loadReport, 60000);
    return () => {
      controller.abort();
      clearInterval(refresh);
    };
  }, [reportPath]);

  const { statusText, variant } = useMemo(() => deriveStatus(report), [report]);

  const latencyBadge = useMemo(() => {
    const firestore = report?.summary?.metrics?.firestoreLatencyMs;
    const ai = report?.summary?.metrics?.aiLatencyMs;
    if (firestore === null && ai === null) return 'N/A';
    const values = [firestore, ai].filter((value) => typeof value === 'number');
    if (values.length === 0) return 'N/A';
    const avg = values.reduce((acc, value) => acc + value, 0) / values.length;
    return `${Math.round(avg)}ms avg`;
  }, [report]);

  const uptime = useMemo(() => {
    const value = report?.summary?.metrics?.uptimePercentage;
    if (typeof value !== 'number') return 'Not reported';
    return `${value.toFixed(2)}%`;
  }, [report]);

  const lastAudit = useMemo(() => formatDate(report?.metadata?.lastAutoQA), [report]);

  const failureCount = report?.automation?.commands?.filter((command) => !command.success).length ?? 0;
  const qaBadge = failureCount > 0 ? `${failureCount} failing checks` : 'All checks passed';

  const statusClass = STATUS_COLORS[variant] ?? 'text-gold';

  return (
    <div className="flex flex-col gap-4 rounded-3xl border border-white/10 bg-black/40 p-6 shadow-lg">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-white/40">QA MONITOR</p>
          <h3 className="text-xl font-semibold text-white">Automated QA & Health</h3>
        </div>
        <span className={`text-sm font-semibold ${statusClass}`}>{statusText}</span>
      </div>

      {loading && <p className="text-white/60">Fetching latest QA report…</p>}
      {error && (
        <p className="text-sm text-red-400">Unable to load QA metrics: {error.message}</p>
      )}

      {!loading && !error && report && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Last audit" value={lastAudit} accent="text-white" />
          <Metric label="System uptime" value={uptime} accent="text-gold" />
          <Metric label="Latency" value={latencyBadge} accent="text-olive" />
          <Metric label="QA checks" value={qaBadge} accent={failureCount > 0 ? 'text-red-400' : 'text-white'} />
        </div>
      )}

      {!loading && !error && report && (
        <div className="space-y-3 rounded-2xl border border-white/5 bg-white/5 p-4">
          <p className="text-xs uppercase tracking-widest text-white/40">Recent commands</p>
          <ul className="space-y-2 text-sm text-white/80">
            {report.automation?.commands?.slice(0, 4).map((command) => (
              <li key={command.command} className="flex items-center justify-between gap-3">
                <span className="truncate">{command.command}</span>
                <span className="text-xs text-white/50">
                  {command.success ? '🟢 ok' : '🔴 failed'} · {formatDuration(command.durationMs)}
                </span>
              </li>
            ))}
            {(!report.automation?.commands || report.automation.commands.length === 0) && (
              <li className="text-white/60">No automated QA runs logged yet.</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
};

QAMonitorWidget.propTypes = {
  reportPath: PropTypes.string,
};

export default QAMonitorWidget;
