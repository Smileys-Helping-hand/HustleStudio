// Consolidated API handler for Vercel free tier (max 12 functions)
// This single handler routes to different modules based on the path

import codes from './codes.js';
import health from './health.js';

export default async function handler(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  // Route to appropriate handler based on path
  if (pathname.startsWith('/api/codes')) {
    return codes(req, res);
  }
  
  if (pathname === '/api/health') {
    return health(req, res);
  }
  
  // Default 404 response
  res.status(404).json({ error: 'API endpoint not found' });
}
