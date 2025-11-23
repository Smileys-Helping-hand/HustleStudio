import { addDoc, serverTimestamp } from 'firebase/firestore';
import { tenantCollection } from './tenant.js';
import { useNotify } from '../context/NotificationContext.jsx';

const fetchJson = async (url, options = {}) => {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`Automation request failed: ${response.status}`);
  }
  return response.json();
};

export const recordAutomationEvent = async (tenantId, payload) => {
  if (!tenantId) return;
  await addDoc(tenantCollection(tenantId, 'automationLogs'), {
    ...payload,
    createdAt: serverTimestamp(),
  });
};

export const sendEmailAutomation = async (tenantId, message) => {
  const nodeEnv =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process !== null &&
    typeof globalThis.process.env === 'object'
      ? globalThis.process.env
      : undefined;
  const key =
    import.meta.env?.VITE_SENDGRID_KEY ||
    nodeEnv?.VITE_SENDGRID_KEY;
  const endpoint = import.meta.env?.VITE_EMAIL_AUTOMATION_ENDPOINT || nodeEnv?.VITE_EMAIL_AUTOMATION_ENDPOINT;
  if (!key || !endpoint) {
    await recordAutomationEvent(tenantId, { type: 'email', status: 'skipped', reason: 'Missing API configuration' });
    return;
  }

  const result = await fetchJson(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(message),
  });

  await recordAutomationEvent(tenantId, { type: 'email', status: 'sent', result });
};

export const useAutomationNotifier = () => {
  const notify = useNotify();
  return (payload) => {
    notify({
      title: payload.title ?? 'Automation update',
      description: payload.description ?? '',
      type: payload.type ?? 'info',
    });
  };
};

export const dispatchMarketingNotification = async (tenantId, payload) => {
  await recordAutomationEvent(tenantId, { ...payload, channel: 'marketing' });
};
