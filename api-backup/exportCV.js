import { generateCvDraft } from '../src/lib/cvGenerator.js';

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

export async function handler(event) {
  try {
    const payload = JSON.parse(event.body || '{}');
    const draft = await generateCvDraft({
      candidate: payload.candidate,
      template: payload.template,
      overrides: payload.overrides,
    });
    return respond(200, { draft });
  } catch (error) {
    console.error('[api/exportCV] Error', error);
    return respond(500, { error: error.message || 'Unexpected error' });
  }
}

export default handler;
