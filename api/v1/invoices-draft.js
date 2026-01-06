// API v1 - Invoices Draft Endpoint
// POST /api/v1/invoices/draft
// Creates a draft invoice

import { withAuth, sendSuccess, sendError } from '../middleware.js';
import admin from 'firebase-admin';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.applicationDefault(),
  });
}

const db = admin.firestore();

async function invoicesDraftHandler(req, res, auth) {
  if (req.method !== 'POST') {
    return sendError(res, 405, 'Method not allowed');
  }

  const { tenantId } = auth;

  try {
    const body = req.body;

    // Validate required fields
    if (!body.clientName && !body.clientId) {
      return sendError(res, 400, 'Either clientName or clientId is required');
    }

    if (!body.lineItems || !Array.isArray(body.lineItems) || body.lineItems.length === 0) {
      return sendError(res, 400, 'lineItems array is required');
    }

    // Calculate total from line items
    let subtotal = 0;
    const processedLineItems = body.lineItems.map((item) => {
      const quantity = parseFloat(item.quantity || 1);
      const rate = parseFloat(item.rate || item.price || 0);
      const amount = quantity * rate;
      subtotal += amount;

      return {
        description: item.description || 'Service',
        quantity,
        rate,
        amount,
      };
    });

    const tax = body.tax || 0;
    const total = subtotal + tax;

    // Generate invoice number
    const invoiceNumber = `INV-${Date.now()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;

    // Create draft invoice
    const invoiceData = {
      invoiceNumber,
      clientName: body.clientName,
      clientId: body.clientId || null,
      clientEmail: body.clientEmail || null,
      projectRef: body.projectRef || null,
      status: 'draft',
      lineItems: processedLineItems,
      subtotal,
      tax,
      total,
      currency: body.currency || 'USD',
      dueDate: body.dueDate || null,
      notes: body.notes || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      createdBy: 'api',
      apiKeyId: auth.keyId,
    };

    const docRef = await db
      .collection('tenants')
      .doc(tenantId)
      .collection('invoices')
      .add(invoiceData);

    sendSuccess(res, {
      id: docRef.id,
      invoiceNumber,
      status: 'draft',
      total,
      message: 'Draft invoice created successfully',
    }, {
      tenantId,
    });
  } catch (error) {
    console.error('[API] Invoice draft error:', error);
    sendError(res, 500, 'Failed to create draft invoice');
  }
}

export default withAuth(invoicesDraftHandler, {
  requireScope: 'invoices:write',
});
