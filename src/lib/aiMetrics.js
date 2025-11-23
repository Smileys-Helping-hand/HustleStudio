import { serverTimestamp, getDoc, setDoc } from 'firebase/firestore';
import { tenantDoc } from './tenant.js';

const resolveCollectionName = () => {
  const envValue =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_METRICS_COLLECTION) ||
    (typeof process !== 'undefined' && process.env?.VITE_AI_METRICS_COLLECTION);
  return envValue && envValue.trim() ? envValue.trim() : 'ai_metrics';
};

const collectionName = resolveCollectionName();

export const updateAIMetrics = async (tenantId, assistantKey, score) => {
  if (!tenantId || !assistantKey || !Number.isFinite(Number(score))) {
    return;
  }

  const normalizedAssistant = assistantKey.toLowerCase();
  const metricsDoc = tenantDoc(tenantId, collectionName, normalizedAssistant);
  const snapshot = await getDoc(metricsDoc);
  const previous = snapshot.exists() ? snapshot.data() : { total: 0, avg: 0 };
  const total = Number(previous.total ?? 0) + 1;
  const avg = ((Number(previous.avg ?? 0) * Number(previous.total ?? 0)) + Number(score)) / total;

  await setDoc(metricsDoc, {
    total,
    avg,
    lastEvaluated: serverTimestamp(),
  });
};
