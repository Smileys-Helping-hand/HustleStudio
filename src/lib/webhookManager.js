/* global process */

function resolveEnv(key) {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (typeof process !== 'undefined' && process.env && process.env[key]) {
    return process.env[key];
  }
  return undefined;
}

function normalizeWebhookList(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

async function postWebhook(url, payload, { signal } = {}) {
  if (!url) {
    return { skipped: true };
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });

  return {
    ok: response.ok,
    status: response.status,
    statusText: response.statusText,
  };
}

export async function sendDigestNotification(summary, options = {}) {
  const endpoints = normalizeWebhookList(resolveEnv('VITE_STATUS_WEBHOOK_URLS'));
  if (endpoints.length === 0) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[WebhookManager] No webhook URLs configured, skipping digest dispatch.');
    }
    return [];
  }

  const payload = {
    type: 'hustleStudioDigest',
    generatedAt: new Date().toISOString(),
    summary,
  };

  return Promise.all(endpoints.map((endpoint) => postWebhook(endpoint, payload, options)));
}

export async function sendAlert(message, options = {}) {
  const endpoints = normalizeWebhookList(resolveEnv('VITE_STATUS_WEBHOOK_URLS'));
  if (endpoints.length === 0) {
    if (typeof console !== 'undefined' && console.error) {
      console.error('[WebhookManager] Alert requested but no webhook URLs configured.');
    }
    return [];
  }

  const payload = {
    type: 'hustleStudioAlert',
    generatedAt: new Date().toISOString(),
    message,
  };

  return Promise.all(endpoints.map((endpoint) => postWebhook(endpoint, payload, options)));
}

export default {
  sendDigestNotification,
  sendAlert,
};
