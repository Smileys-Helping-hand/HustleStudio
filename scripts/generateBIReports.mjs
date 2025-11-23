import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
import { buildTenantReport } from '../src/lib/reportOrchestrator.js';
import { generateDailySummary } from '../src/lib/reportGenerator.js';
import { getServerFirestore } from '../src/lib/serverFirebase.js';
import { getBooleanEnv } from '../src/lib/env.js';

const db = getServerFirestore();

if (!getBooleanEnv('VITE_BI_REPORTS_ENABLED', true)) {
  console.log('⚠️  BI reports are disabled via VITE_BI_REPORTS_ENABLED. Exiting.');
  process.exit(0);
}

console.log('🚀 Generating BI Reports...');

const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
let globalBenchmarks = { avgSales: 11000, avgMargin: 0.33, avgGrowth: 0.1 };

try {
  const globalDoc = await getDoc(doc(db, 'analytics', 'globalBenchmarks'));
  if (globalDoc.exists()) {
    const data = globalDoc.data() ?? {};
    globalBenchmarks = {
      avgSales: Number(data.avgSales ?? globalBenchmarks.avgSales),
      avgMargin: Number(data.avgMargin ?? globalBenchmarks.avgMargin),
      avgGrowth: Number(data.avgGrowth ?? globalBenchmarks.avgGrowth),
    };
  }
} catch (error) {
  console.warn('[BI Reports] Falling back to default benchmarks.', error.message);
}

for (const tenantDoc of tenantsSnapshot.docs) {
  try {
    const summary = await generateDailySummary(tenantDoc.id);
    const aiMetricsSnapshot = await getDocs(collection(db, 'tenants', tenantDoc.id, 'ai_metrics'));
    const aiAggregate = aiMetricsSnapshot.docs.reduce(
      (acc, docSnap) => {
        const data = docSnap.data() ?? {};
        return {
          total: acc.total + Number(data.total ?? 0),
          weighted: acc.weighted + Number(data.avg ?? 0) * Number(data.total ?? 0),
        };
      },
      { total: 0, weighted: 0 }
    );
    const averageAiScore = aiAggregate.total > 0 ? aiAggregate.weighted / aiAggregate.total : 0;

    const metrics = {
      sales: {
        revenue: Number(summary?.totals?.revenue ?? 0),
        averageOrder:
          Number(summary?.totals?.transactionCount ?? 0) > 0
            ? Number(summary?.totals?.revenue ?? 0) / Number(summary?.totals?.transactionCount ?? 1)
            : 0,
        transactionCount: Number(summary?.totals?.transactionCount ?? 0),
      },
      ai: {
        qualityScore: Number(averageAiScore.toFixed?.(2) ?? averageAiScore),
      },
      growth: Number(summary?.totals?.transactionCount ?? 0) > 0
        ? Number(summary?.totals?.revenue ?? 0) / Math.max(globalBenchmarks.avgSales, 1) - 1
        : 0,
      margin: globalBenchmarks.avgMargin,
    };

    const report = await buildTenantReport(tenantDoc.id, metrics, globalBenchmarks);
    console.log(`✅ Report generated for ${tenantDoc.id} → ${report.pdfPath}`);
  } catch (error) {
    console.error(`❌ Failed to generate report for ${tenantDoc.id}`, error);
  }
}
console.log('🎉 BI report generation complete.');
