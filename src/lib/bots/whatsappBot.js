const resolveEnv = (key) => {
  const envValue =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process?.env?.[key]
      ? globalThis.process.env[key]
      : undefined;
  if (envValue) return envValue;
  if (typeof import.meta !== 'undefined' && import.meta.env?.[key]) return import.meta.env[key];
  return '';
};

const TWILIO_BASE = 'https://api.twilio.com/2010-04-01/Accounts';

export const sendWhatsAppNotification = async ({ to, body }) => {
  const accountSid = resolveEnv('VITE_TWILIO_SID');
  const authToken = resolveEnv('VITE_TWILIO_AUTH');
  const from = resolveEnv('VITE_TWILIO_WHATSAPP_NUMBER');

  if (!accountSid || !authToken || !from) {
    throw new Error('Twilio WhatsApp configuration is incomplete.');
  }

  const credentialsSource = `${accountSid}:${authToken}`;
  const credentials =
    typeof globalThis !== 'undefined' && typeof globalThis.Buffer !== 'undefined'
      ? globalThis.Buffer.from(credentialsSource).toString('base64')
      : typeof btoa === 'function'
        ? btoa(credentialsSource)
        : credentialsSource;
  const url = `${TWILIO_BASE}/${accountSid}/Messages.json`;
  const payload = new URLSearchParams({
    From: `whatsapp:${from}`,
    To: `whatsapp:${to}`,
    Body: body,
  });

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: payload.toString(),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Failed to send WhatsApp notification');
  }

  return response.json();
};
