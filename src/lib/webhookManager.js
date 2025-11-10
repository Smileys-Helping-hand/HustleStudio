import { addDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { getServerFirestore } from './serverFirebase.js';
import { recordTelemetry } from './telemetry.js';

const fetchJSON = async (url, options) => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json', ...(options?.headers ?? {}) },
    ...options,
  });
  return { ok: response.ok, status: response.status, body: await response.text() };
};

export const registerWebhook = async (tenantId, hook) => {
  const db = getServerFirestore();
  const ref = collection(db, `tenants/${tenantId}/webhooks`);
  await addDoc(ref, hook);
  await recordTelemetry('webhook.registered', tenantId, { provider: hook.provider });
};

const loadHooks = async (tenantId, provider) => {
  const db = getServerFirestore();
  const base = collection(db, `tenants/${tenantId}/webhooks`);
  const constraints = provider ? [where('provider', '==', provider)] : [];
  const snapshot = await getDocs(constraints.length ? query(base, ...constraints) : base);
  return snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
};

export const triggerHook = async (event, data, tenantId, { provider } = {}) => {
  const hooks = await loadHooks(tenantId, provider);
  const deliveries = [];
  for (const hook of hooks) {
    if (hook.events && !hook.events.includes(event)) continue;
    try {
      const result = await fetchJSON(hook.url, {
        method: 'POST',
        body: JSON.stringify({ event, data, tenantId, ts: new Date().toISOString() }),
        headers: hook.secret ? { 'x-hustle-signature': hook.secret } : undefined,
      });
      deliveries.push({ id: hook.id, ok: result.ok, status: result.status });
    } catch (error) {
      deliveries.push({ id: hook.id, ok: false, error: error.message });
    }
  }
  await recordTelemetry('webhook.trigger', tenantId, { event, count: deliveries.length, provider });
  return deliveries;
};
