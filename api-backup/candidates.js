import { createCandidate, listCandidates, removeCandidate, updateCandidate } from '../src/lib/candidateManager.js';

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

function extractMethod(event) {
  return event.httpMethod || event.requestContext?.http?.method || event.method || 'GET';
}

function extractTenant(event) {
  return (
    event.queryStringParameters?.tenantId ||
    event.headers?.['x-tenant-id'] ||
    event.headers?.['X-Tenant-Id'] ||
    JSON.parse(event.body || '{}').tenantId ||
    null
  );
}

export async function handler(event) {
  const method = extractMethod(event).toUpperCase();
  const tenantId = extractTenant(event);

  try {
    switch (method) {
      case 'GET': {
        const search = event.queryStringParameters?.search ?? '';
        const status = event.queryStringParameters?.status ?? 'all';
        const candidates = await listCandidates({ tenantId, searchTerm: search, status });
        return respond(200, { candidates });
      }
      case 'POST': {
        const payload = JSON.parse(event.body || '{}');
        const candidate = await createCandidate({
          tenantId,
          candidate: payload.candidate ?? payload,
          file: null,
        });
        return respond(201, { candidate });
      }
      case 'PATCH': {
        const payload = JSON.parse(event.body || '{}');
        const candidateId = event.pathParameters?.id || payload.id;
        const candidate = await updateCandidate(candidateId, tenantId, payload.updates ?? payload);
        return respond(200, { candidate });
      }
      case 'DELETE': {
        const candidateId = event.pathParameters?.id || event.queryStringParameters?.id;
        await removeCandidate(candidateId, tenantId);
        return respond(200, { success: true });
      }
      default:
        return respond(405, { error: `Unsupported method ${method}` });
    }
  } catch (error) {
    console.error('[api/candidates] Error', error);
    return respond(500, { error: error.message || 'Unexpected error' });
  }
}

export default handler;
