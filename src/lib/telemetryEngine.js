import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { recordGlobalEvent } from './globalInsights.js';
import { anonymizeTenant, anonymizeUser } from './anonymizer.js';

const tenantOptIn = new Map();

const resolveGlobalTelemetryDefault = () => {
  const viteValue = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_TELEMETRY_ENABLED : undefined;
  const nodeEnv =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process !== null &&
    typeof globalThis.process.env === 'object'
      ? globalThis.process.env
      : undefined;
  const raw = viteValue ?? nodeEnv?.VITE_TELEMETRY_ENABLED ?? nodeEnv?.TELEMETRY_ENABLED;
  if (raw === undefined || raw === null || raw === '') return true;
  const normalized = String(raw).toLowerCase();
  return !(normalized === 'false' || normalized === '0' || normalized === 'off');
};

const globalTelemetryDefault = resolveGlobalTelemetryDefault();

export const getTelemetryDefault = () => globalTelemetryDefault;

export const setTelemetryOptIn = (tenantId, enabled) => {
  const key = tenantId || 'none';
  tenantOptIn.set(key, enabled ?? globalTelemetryDefault);
};

const isTelemetryEnabled = (tenantId) => {
  if (!globalTelemetryDefault) {
    return false;
  }
  const key = tenantId || 'none';
  if (tenantOptIn.has(key)) {
    return tenantOptIn.get(key);
  }
  return true;
};

export const logEvent = async (tenantId, userId, type, payload = {}) => {
  if (!isTelemetryEnabled(tenantId)) {
    return;
  }

  try {
    await addDoc(collection(db, 'telemetry'), {
      tenantId: tenantId ?? 'none',
      userId: userId ?? 'anon',
      type,
      payload,
      createdAt: serverTimestamp(),
    });
    void recordGlobalEvent('telemetry_event', {
      type,
      tenant: anonymizeTenant(tenantId),
      user: anonymizeUser(userId),
      payloadHint: payload && Object.keys(payload).length > 0 ? 'has-payload' : 'empty',
    });
  } catch (error) {
    console.warn('[Telemetry]', error.message);
  }
};

export const installClientErrorTelemetry = () => {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const handleError = (event) => {
    logEvent('system', 'anon', 'client_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });
  };

  const handleRejection = (event) => {
    const reason = event.reason || {};
    logEvent('system', 'anon', 'client_unhandled_rejection', {
      message: reason?.message ?? String(reason ?? 'unknown'),
    });
  };

  window.addEventListener('error', handleError);
  window.addEventListener('unhandledrejection', handleRejection);

  return () => {
    window.removeEventListener('error', handleError);
    window.removeEventListener('unhandledrejection', handleRejection);
  };
};
