// Consolidated API handler for Vercel free tier (max 12 functions)
// This single handler routes to different modules based on the path

import codes from './codes.js';
import health from './health.js';
import businessHealth from './v1/business-health.js';
import clients from './v1/clients.js';
import invoicesDraft from './v1/invoices-draft.js';

export default async function handler(req, res) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  
  // API v1 routes
  if (pathname === '/api/v1/business-health') {
    return businessHealth(req, res);
  }
  
  if (pathname === '/api/v1/clients') {
    return clients(req, res);
  }
  
  if (pathname === '/api/v1/invoices/draft') {
    return invoicesDraft(req, res);
  }
  
  // Legacy routes
  if (pathname.startsWith('/api/codes')) {
    return codes(req, res);
  }
  
  if (pathname === '/api/health') {
    return health(req, res);
  }
  
  // Default 404 response
  res.status(404).json({ error: 'API endpoint not found' });
}
