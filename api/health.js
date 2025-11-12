function respond(statusCode, body) {
  return {
    statusCode,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
    body: JSON.stringify(body),
  };
}

function booleanFromEnv(key, fallback = true) {
  const value = process.env[key];
  if (value === undefined) return fallback;
  return ['true', '1', 'yes'].includes(value.toLowerCase());
}

function loadUptimeSeries() {
  const raw = process.env.QA_UPTIME_SERIES;
  if (!raw) {
    return [];
  }
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.warn('[api/health] Unable to parse QA_UPTIME_SERIES', error.message);
    return [];
  }
}

export async function handler() {
  try {
    const payload = {
      firestore: booleanFromEnv('QA_FIRESTORE_HEALTHY', true),
      ai: booleanFromEnv('QA_AI_HEALTHY', true),
      stripe: booleanFromEnv('QA_STRIPE_HEALTHY', true),
      storage: booleanFromEnv('QA_STORAGE_HEALTHY', true),
      cvGenerator: booleanFromEnv('QA_CV_GENERATOR_HEALTHY', true),
      uptime: loadUptimeSeries(),
    };
    return respond(200, payload);
  } catch (error) {
    console.error('[api/health] Error', error);
    return respond(500, { error: error.message || 'Unexpected error' });
  }
}

export default handler;
