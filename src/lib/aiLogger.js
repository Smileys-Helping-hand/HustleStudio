import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { recordGlobalEvent } from './globalInsights.js';
import { anonymizeTenant, anonymizeUser } from './anonymizer.js';

const isLoggingEnabled = () => {
  const flag =
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_AI_LOGGING_ENABLED) ||
    (typeof process !== 'undefined' && process.env?.VITE_AI_LOGGING_ENABLED) ||
    (typeof process !== 'undefined' && process.env?.AI_LOGGING_ENABLED);
  if (flag === undefined || flag === null || flag === '') return true;
  return String(flag).toLowerCase() === 'true' || flag === '1';
};

export const logAIUsage = async ({ tenantId, userId, model, tokens, prompt, response, assistant }) => {
  if (!isLoggingEnabled()) {
    return null;
  }

  try {
    const entry = await addDoc(collection(db, 'ai_audit_logs'), {
      tenantId: tenantId ?? 'unknown',
      userId: userId ?? 'unknown',
      model,
      tokens: Number.isFinite(tokens) ? tokens : 0,
      assistant: assistant ?? null,
      prompt: (prompt ?? '').slice(0, 2000),
      response: (response ?? '').slice(0, 4000),
      createdAt: serverTimestamp(),
    });
    void recordGlobalEvent('ai_completion', {
      assistant: assistant ?? null,
      model,
      tokens: Number.isFinite(tokens) ? tokens : 0,
      tenant: anonymizeTenant(tenantId),
      user: anonymizeUser(userId),
    });
    return entry.id;
  } catch (error) {
    console.error('[AI Logger] Unable to persist AI usage.', error);
    return null;
  }
};
