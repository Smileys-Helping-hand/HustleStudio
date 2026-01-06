// API Middleware for validating API keys and permissions
import { validateApiKey, hasScope } from '../src/lib/apiKeys.js';

/**
 * CORS configuration for Hustle Connect API
 */
const ALLOWED_ORIGINS = [
  'https://workspace-os.web.app',
  'https://workspace-os.firebaseapp.com',
  'http://localhost:3000',
  'http://localhost:3010',
  'http://localhost:5173',
];

/**
 * Set CORS headers
 */
export function setCorsHeaders(res, origin) {
  if (ALLOWED_ORIGINS.includes(origin) || origin?.includes('localhost')) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-api-key, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

/**
 * Handle OPTIONS preflight requests
 */
export function handleCors(req, res) {
  const origin = req.headers.origin || req.headers.referer;
  setCorsHeaders(res, origin);
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return true;
  }
  return false;
}

/**
 * Middleware to validate API key
 * Returns { authenticated: boolean, tenantId?: string, scopes?: string[], error?: string }
 */
export async function authenticateRequest(req) {
  const apiKey = req.headers['x-api-key'];
  
  if (!apiKey) {
    return {
      authenticated: false,
      error: 'Missing API key. Provide x-api-key header.',
      statusCode: 401,
    };
  }

  try {
    const keyData = await validateApiKey(apiKey);
    
    if (!keyData) {
      return {
        authenticated: false,
        error: 'Invalid or inactive API key',
        statusCode: 401,
      };
    }

    return {
      authenticated: true,
      tenantId: keyData.tenantId,
      scopes: keyData.scopes,
      environment: keyData.environment,
      keyId: keyData.keyId,
    };
  } catch (error) {
    console.error('[API Middleware] Authentication error:', error);
    return {
      authenticated: false,
      error: 'Authentication failed',
      statusCode: 500,
    };
  }
}

/**
 * Check if request has required scope
 */
export function requireScope(auth, requiredScope) {
  if (!auth.authenticated) {
    return {
      authorized: false,
      error: 'Not authenticated',
      statusCode: 401,
    };
  }

  if (!hasScope(auth, requiredScope)) {
    return {
      authorized: false,
      error: `Missing required scope: ${requiredScope}`,
      statusCode: 403,
    };
  }

  return { authorized: true };
}

/**
 * Send JSON error response
 */
export function sendError(res, statusCode, message) {
  res.status(statusCode).json({
    success: false,
    error: message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Send JSON success response
 */
export function sendSuccess(res, data, meta = {}) {
  res.status(200).json({
    success: true,
    data,
    meta,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Wrap an API handler with authentication and error handling
 */
export function withAuth(handler, options = {}) {
  return async (req, res) => {
    // Handle CORS
    if (handleCors(req, res)) return;

    // Authenticate
    const auth = await authenticateRequest(req);
    
    if (!auth.authenticated) {
      return sendError(res, auth.statusCode || 401, auth.error);
    }

    // Check required scope if specified
    if (options.requireScope) {
      const scopeCheck = requireScope(auth, options.requireScope);
      if (!scopeCheck.authorized) {
        return sendError(res, scopeCheck.statusCode || 403, scopeCheck.error);
      }
    }

    // Call the actual handler
    try {
      await handler(req, res, auth);
    } catch (error) {
      console.error('[API] Handler error:', error);
      sendError(res, 500, 'Internal server error');
    }
  };
}
