import fetch from 'node-fetch';

const resolveApi = () => {
  if (process.env.VITE_MARKETPLACE_API) return process.env.VITE_MARKETPLACE_API;
  return 'https://api.hustlestudio.co.za/plugins';
};

export default async function handler(request, response) {
  if (request.method !== 'GET') {
    response.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const { id } = request.query ?? {};
  const base = resolveApi();
  try {
    const target = id ? `${base}/${id}` : base;
    const upstream = await fetch(target);
    if (!upstream.ok) {
      const text = await upstream.text();
      response.status(upstream.status).json({ error: text || 'Upstream error' });
      return;
    }
    const payload = await upstream.json();
    response.status(200).json(payload);
  } catch (error) {
    response.status(500).json({ error: error.message });
  }
}
