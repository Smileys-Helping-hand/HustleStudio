import { useEffect, useMemo, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { buildTenantReport } from '../../lib/reportOrchestrator.js';
import PageHeader from '../../components/common/PageHeader.jsx';
import { useAnalytics } from '../../hooks/useAnalytics.js';
import { useTenant } from '../../context/TenantContext.jsx';
import { db } from '../../lib/firebase.js';

export default function BIReports() {
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState(null);
  const [error, setError] = useState('');
  const [benchmarks, setBenchmarks] = useState({ avgSales: 0, avgMargin: 0, avgGrowth: 0 });
  const [benchmarksLoading, setBenchmarksLoading] = useState(true);
  const { activeTenantId } = useTenant();
  const { metrics, loading: metricsLoading, refresh } = useAnalytics();

  useEffect(() => {
    let cancelled = false;
    const loadBenchmarks = async () => {
      try {
        const summaryRef = doc(db, 'analytics', 'globalBenchmarks');
        const snapshot = await getDoc(summaryRef);
        if (!snapshot.exists()) {
          if (!cancelled) {
            setBenchmarks({ avgSales: 11000, avgMargin: 0.33, avgGrowth: 0.1 });
          }
          return;
        }
        const data = snapshot.data() ?? {};
        if (!cancelled) {
          setBenchmarks({
            avgSales: Number(data.avgSales ?? 0),
            avgMargin: Number(data.avgMargin ?? 0),
            avgGrowth: Number(data.avgGrowth ?? 0),
          });
        }
      } catch (err) {
        console.warn('[BIReports] Falling back to default benchmarks.', err);
        if (!cancelled) {
          setBenchmarks({ avgSales: 11000, avgMargin: 0.33, avgGrowth: 0.1 });
        }
      } finally {
        if (!cancelled) {
          setBenchmarksLoading(false);
        }
      }
    };

    loadBenchmarks().catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const preparedMetrics = useMemo(() => {
    if (!metrics?.sales && !metrics?.usage && !metrics?.team) {
      return null;
    }

    const sales = metrics?.sales ?? {};
    const usage = metrics?.usage ?? {};
    const team = metrics?.team ?? {};

    return {
      sales: {
        revenue: Number(sales.totalRevenue ?? 0),
        averageOrder: Number(sales.averageOrder ?? 0),
        transactionCount: Number(sales.salesCount ?? 0),
      },
      ai: {
        totalCredits: Number(usage.totalCredits ?? 0),
        totalTokens: Number(usage.totalTokens ?? 0),
      },
      team: {
        members: Number(team.totalMembers ?? 0),
      },
    };
  }, [metrics]);

  const handleGenerate = async () => {
    if (!activeTenantId) {
      setError('Select or create a workspace to generate a report.');
      return;
    }
    if (!preparedMetrics) {
      setError('Metrics are still loading — try again in a moment.');
      if (!metricsLoading) {
        refresh().catch(() => {});
      }
      return;
    }
    setLoading(true);
    setError('');
    try {
      const revenue = preparedMetrics.sales.revenue;
      const averageOrder = Number(metrics?.sales?.averageOrder ?? 0);
      const growth = benchmarks.avgSales > 0 ? revenue / benchmarks.avgSales - 1 : 0;
      const margin = revenue > 0 && averageOrder > 0 ? averageOrder / revenue : benchmarks.avgMargin;
      const reportPayload = {
        ...preparedMetrics,
        growth,
        margin,
      };
      const result = await buildTenantReport(activeTenantId, reportPayload, benchmarks);
      setReport(result);
    } catch (err) {
      setError(err.message ?? 'Unable to generate report');
      setReport(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6">
      <PageHeader
        title="Predictive Business Intelligence"
        subtitle="Generate AI-driven executive summaries, forecasts, and ready-to-share PDF reports."
      />
      <div className="rounded-2xl border border-emerald-500/20 bg-white/5 p-6 shadow-[0_0_30px_rgba(16,185,129,0.25)]">
        <p className="text-sm text-gray-300">
          {benchmarksLoading
            ? 'Loading global benchmarks…'
            : 'Use the orchestrator to benchmark tenant metrics against global performance and create branded deliverables.'}
        </p>
        <button
          type="button"
          onClick={handleGenerate}
          disabled={loading || benchmarksLoading}
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-[0_10px_25px_rgba(16,185,129,0.35)] transition hover:bg-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400"
        >
          {loading ? 'Generating…' : 'Generate Sample Report'}
        </button>
        {error ? <p className="mt-3 text-sm text-red-400">{error}</p> : null}
      </div>

      {report ? (
        <div className="mt-8 space-y-4 rounded-2xl border border-white/10 bg-white/5 p-6 shadow-[0_0_25px_rgba(99,102,241,0.25)]">
          <div>
            <h2 className="text-lg font-semibold text-emerald-400">AI Summary</h2>
            <p className="mt-2 whitespace-pre-line text-sm text-gray-200">{report.aiSummary}</p>
          </div>
          <div>
            <h3 className="text-base font-semibold text-emerald-300">Forecast</h3>
            <p className="mt-1 text-sm text-gray-200">Next Month Growth: {report.forecast.nextMonthGrowth}</p>
            <p className="text-sm text-gray-200">
              Predicted Revenue: R{Number(report.forecast.predictedRevenue ?? 0).toLocaleString()}
            </p>
            {report.forecast.predictedProfit !== undefined ? (
              <p className="text-sm text-gray-200">
                Projected Profit: R{Number(report.forecast.predictedProfit ?? 0).toLocaleString()} ({report.forecast.margin})
              </p>
            ) : null}
          </div>
          <a
            className="inline-flex items-center gap-2 text-sm font-medium text-emerald-300 underline hover:text-emerald-200"
            href={report.pdfPath}
            target="_blank"
            rel="noreferrer"
          >
            📄 Download PDF Report
          </a>
        </div>
      ) : null}
    </div>
  );
}
