// API v1 - Clients Endpoint
// GET /api/v1/clients
// Returns list of clients

import { withAuth, sendSuccess, sendError } from '../middleware.js';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

async function clientsHandler(req, res, auth) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }

  const { tenantId } = auth;

  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const status = url.searchParams.get('status') || 'active';
    const limit = parseInt(url.searchParams.get('limit') || '50', 10);

    let query = db
      .collection('tenants')
      .doc(tenantId)
      .collection('clients');

    if (status !== 'all') {
      query = query.where('status', '==', status);
    }

    query = query.limit(Math.min(limit, 100)); // Max 100 results

    const snapshot = await query.get();

    const clients = snapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        email: data.email,
        company: data.company,
        status: data.status,
        phone: data.phone,
        createdAt: data.createdAt,
        totalProjects: data.totalProjects || 0,
        totalRevenue: data.totalRevenue || 0,
      };
    });

    sendSuccess(res, clients, {
      count: clients.length,
      status,
      tenantId,
    });
  } catch (error) {
    console.error('[API] Clients error:', error);
    sendError(res, 500, 'Failed to fetch clients');
  }
}

export default withAuth(clientsHandler, {
  requireScope: 'clients:read',
});
