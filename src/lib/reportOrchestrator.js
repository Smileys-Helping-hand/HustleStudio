import { recordGlobalEvent } from './globalInsights.js';
import { anonymizeTenant } from './anonymizer.js';
import { generateForecasts } from './forecastEngine.js';
import { generateReportPDF } from './reportGenerator.js';
import { callOpenAI } from './openaiClient.js';

const DEFAULT_SUMMARY =
  'Unable to generate AI commentary at this time. Review the attached metrics and forecast for key indicators.';

export async function buildTenantReport(tenantId, metrics = {}, globalBenchmarks = {}) {
  const prompt = `
You are Hustle Studio's AI Analyst.
Generate an executive summary comparing tenant performance to global averages.
Highlight strengths, weaknesses, opportunities, and next steps.

Metrics:
${JSON.stringify(metrics, null, 2)}

Global Benchmarks:
${JSON.stringify(globalBenchmarks, null, 2)}
`;

  let aiSummary = DEFAULT_SUMMARY;

  try {
    aiSummary =
      (await callOpenAI(prompt, 'gpt-4o-mini', {
        metadata: { tenantId, userId: 'bi-reports', assistant: 'bi-report-orchestrator' },
      })) || DEFAULT_SUMMARY;
  } catch (error) {
    console.warn('[ReportOrchestrator] Failed to generate AI summary, falling back to defaults.', error);
  }

  const forecast = generateForecasts(metrics);

  let pdfPath = null;
  try {
    pdfPath = await generateReportPDF({ tenantId, metrics, forecast, aiSummary });
  } catch (error) {
    console.error('[ReportOrchestrator] Failed to generate PDF report.', error);
    pdfPath = null;
  }

  void recordGlobalEvent('bi_report_generated', {
    tenant: anonymizeTenant(tenantId),
    revenue: forecast.predictedRevenue,
    growth: forecast.nextMonthGrowth,
  });

  return { aiSummary, forecast, pdfPath };
}

export default buildTenantReport;
