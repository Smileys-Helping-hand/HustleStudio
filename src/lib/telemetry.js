import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { getServerFirestore } from './serverFirebase.js';

export const recordTelemetry = async (event, tenantId, payload = {}) => {
  try {
    const db = payload.db || getServerFirestore();
    const target = collection(db, 'telemetry');
    await addDoc(target, {
      event,
      tenantId: tenantId ?? 'global',
      payload,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('[telemetry] failed to record event', event, error.message);
  }
};

export const withTelemetry = async (event, tenantId, operation, payload = {}) => {
  await recordTelemetry(`${event}:start`, tenantId, payload);
  try {
    const result = await operation();
    await recordTelemetry(`${event}:success`, tenantId, payload);
    return result;
  } catch (error) {
    await recordTelemetry(`${event}:error`, tenantId, { ...payload, error: error.message });
    throw error;
  }
};
