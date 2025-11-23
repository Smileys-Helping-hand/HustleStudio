import { doc, getDoc } from 'firebase/firestore';
import { getServerFirestore } from './serverFirebase.js';
import { recordTelemetry } from './telemetry.js';
import { hashField, maskSecret } from './encryption.js';

class ApiAuthError extends Error {
  constructor(message, status = 401) {
    super(message);
    this.status = status;
  }
}

const normalizeHeader = (headers, key) => {
  if (!headers) return undefined;
  if (typeof headers.get === 'function') {
    return headers.get(key);
  }
  const lower = key.toLowerCase();
  return headers[key] ?? headers[lower] ?? headers[lower.replace(/-/g, '_')];
};

export const resolveApiKeyFromHeaders = async (headers) => {
  const apiKey = normalizeHeader(headers, 'x-api-key');
  const tenantId = normalizeHeader(headers, 'x-tenant-id');

  if (!apiKey) {
    throw new ApiAuthError('Missing API key', 401);
  }
  if (!tenantId) {
    throw new ApiAuthError('Missing tenant identifier', 400);
  }

  const db = getServerFirestore();
  const hashedKey = hashField(apiKey);
  if (!hashedKey) {
    throw new ApiAuthError('API key handling unavailable', 500);
  }

  const keyRef = doc(db, `tenants/${tenantId}/apiKeys`, hashedKey);
  const keySnap = await getDoc(keyRef);

  if (!keySnap.exists()) {
    throw new ApiAuthError('Invalid API key', 403);
  }

  const data = keySnap.data();
  if (data.revoked) {
    throw new ApiAuthError('API key revoked', 403);
  }

  await recordTelemetry('api.access', tenantId, {
    key: maskSecret(apiKey),
    scopes: data.scopes ?? [],
  });

  return {
    tenantId,
    apiKey: hashedKey,
    metadata: { ...data, encryptedToken: undefined },
    db,
  };
};

export const verifyApiKey = async (req, res, next) => {
  try {
    const context = await resolveApiKeyFromHeaders(req.headers);
    req.tenantId = context.tenantId;
    req.apiKeyMeta = context.metadata;
    req.firestore = context.db;
    next();
  } catch (error) {
    res.status(error.status ?? 500).json({ error: error.message });
  }
};
