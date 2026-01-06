// API v1 - Business Health Endpoint
// GET /api/v1/business-health
// Returns overview of business metrics

import { withAuth, sendSuccess, sendError } from '../middleware.js';
import admin from 'firebase-admin';

// Initialize Firebase Admin (if not already initialized)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

async function businessHealthHandler(req, res, auth) {
  if (req.method !== 'GET') {
    return sendError(res, 405, 'Method not allowed');
  }

  const { tenantId } = auth;

  try {
    // Fetch invoices for revenue calculation
    const invoicesSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('invoices')
      .get();

    let totalRevenue = 0;
    let pendingInvoices = 0;
    let paidInvoices = 0;

    invoicesSnapshot.forEach((doc) => {
      const invoice = doc.data();
      const amount = invoice.total || invoice.amount || 0;
      
      if (invoice.status === 'paid') {
        totalRevenue += amount;
        paidInvoices++;
      } else if (invoice.status === 'pending' || invoice.status === 'sent') {
        pendingInvoices++;
      }
    });

    // Fetch active clients
    const clientsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('clients')
      .where('status', '==', 'active')
      .get();

    const activeClients = clientsSnapshot.size;

    // Fetch active projects
    const projectsSnapshot = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('projects')
      .where('status', 'in', ['active', 'in-progress'])
      .get();

    const activeProjects = projectsSnapshot.size;

    const healthData = {
      revenue: totalRevenue,
      pendingInvoices,
      paidInvoices,
      totalInvoices: invoicesSnapshot.size,
      activeClients,
      activeProjects,
      currency: 'USD', // TODO: Get from tenant settings
    };

    sendSuccess(res, healthData, {
      tenantId,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[API] Business health error:', error);
    sendError(res, 500, 'Failed to fetch business health data');
  }
}

export default withAuth(businessHealthHandler, {
  requireScope: 'health:read',
});
