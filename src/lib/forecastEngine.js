import { callOpenAI } from './openaiClient.js';

export const forecastTrends = async (dataset) => {
  const payload = Array.isArray(dataset) ? dataset : [];
  const prompt = `You are Hustle Studio's forecasting engine. Using the following data ${JSON.stringify(
    payload
  )}, provide three bullet points: 1) sales trajectory, 2) risk or opportunity, 3) one recommended action.`;
  const response = await callOpenAI(prompt, import.meta.env.VITE_FORECAST_MODEL || 'gpt-4o-mini');
  return response;
};

const normaliseNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export function generateForecasts(metrics = {}) {
  const salesSource = metrics.sales ?? {};
  const revenue =
    typeof salesSource === 'number'
      ? normaliseNumber(salesSource, 0)
      : normaliseNumber(salesSource.revenue ?? salesSource.totalRevenue, 0);

  const baselineGrowth = normaliseNumber(
    metrics.growth ?? salesSource.growthRate ?? salesSource.growth ?? 0.08,
    0.08
  );

  const smoothedGrowth = clamp(baselineGrowth * 1.05, -0.9, 2);

  const margin = normaliseNumber(metrics.margin ?? salesSource.margin ?? 0.32, 0.32);

  const predictedRevenue = normaliseNumber(revenue * (1 + smoothedGrowth), 0);
  const predictedProfit = normaliseNumber(predictedRevenue * margin, 0);

  return {
    nextMonthGrowth: `${(smoothedGrowth * 100).toFixed(1)}%`,
    predictedRevenue,
    predictedProfit,
    margin: `${(margin * 100).toFixed(1)}%`,
  };
}
