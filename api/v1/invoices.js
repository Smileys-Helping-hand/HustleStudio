// API v1 - Invoices Endpoint
// GET /api/v1/invoices - List invoices
// POST /api/v1/invoices - Create invoice
// GET /api/v1/invoices/:id - Get invoice
// PATCH /api/v1/invoices/:id - Update invoice
// DELETE /api/v1/invoices/:id - Delete invoice

import { withAuth, sendSuccess, sendError } from '../middleware.js';
import { query, queryOne } from '../lib/neonDb.js';

async function invoicesHandler(req, res, auth) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const { tenantId } = auth;

  try {
    // GET /api/v1/invoices?tenant=X - List invoices
    if (req.method === 'GET' && pathname === '/api/v1/invoices') {
      const status = req.query?.status;
      let sql = 'SELECT * FROM invoices WHERE tenant_id = $1 ORDER BY created_at DESC';
      const params = [tenantId];

      if (status) {
        sql += ' AND status = $2';
        params.push(status);
      }

      const invoices = await query(sql, params);
      return sendSuccess(res, { invoices });
    }

    // GET /api/v1/invoices/:id - Get single invoice
    if (req.method === 'GET') {
      const idMatch = pathname.match(/\/api\/v1\/invoices\/(\d+)$/);
      if (idMatch) {
        const invoiceId = idMatch[1];
        const invoice = await queryOne(
          'SELECT * FROM invoices WHERE id = $1 AND tenant_id = $2',
          [invoiceId, tenantId]
        );

        if (!invoice) {
          return sendError(res, 404, 'Invoice not found');
        }

        return sendSuccess(res, { invoice });
      }
    }

    // POST /api/v1/invoices - Create invoice
    if (req.method === 'POST' && pathname === '/api/v1/invoices') {
      const body = req.body;

      if (!body.invoiceNumber) {
        return sendError(res, 400, 'invoiceNumber is required');
      }

      if (!body.clientName) {
        return sendError(res, 400, 'clientName is required');
      }

      if (!Array.isArray(body.lineItems) || body.lineItems.length === 0) {
        return sendError(res, 400, 'lineItems array is required');
      }

      const invoice = await queryOne(
        `INSERT INTO invoices (
          tenant_id, invoice_number, client_name, client_email,
          client_address, company_name, company_email, company_phone,
          subtotal, tax, tax_rate, total, currency, status, notes,
          line_items, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
        RETURNING *`,
        [
          tenantId,
          body.invoiceNumber,
          body.clientName,
          body.clientEmail || null,
          body.clientAddress || null,
          body.companyName || null,
          body.companyEmail || null,
          body.companyPhone || null,
          body.subtotal || 0,
          body.tax || 0,
          body.taxRate || 0,
          body.total || 0,
          body.currency || 'R',
          body.status || 'draft',
          body.notes || '',
          JSON.stringify(body.lineItems),
          auth.keyId || 'api',
        ]
      );

      return sendSuccess(res, { invoice }, { tenantId });
    }

    // PATCH /api/v1/invoices/:id - Update invoice
    if (req.method === 'PATCH') {
      const idMatch = pathname.match(/\/api\/v1\/invoices\/(\d+)$/);
      if (idMatch) {
        const invoiceId = idMatch[1];
        const body = req.body;

        const updates = [];
        const params = [invoiceId, tenantId];
        let paramIndex = 3;

        if (body.status !== undefined) {
          updates.push(`status = $${paramIndex++}`);
          params.push(body.status);
        }

        if (body.total !== undefined) {
          updates.push(`total = $${paramIndex++}`);
          params.push(body.total);
        }

        if (body.notes !== undefined) {
          updates.push(`notes = $${paramIndex++}`);
          params.push(body.notes);
        }

        if (body.lineItems !== undefined) {
          updates.push(`line_items = $${paramIndex++}`);
          params.push(JSON.stringify(body.lineItems));
        }

        if (updates.length === 0) {
          return sendError(res, 400, 'No fields to update');
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        const invoice = await queryOne(
          `UPDATE invoices SET ${updates.join(', ')}
           WHERE id = $1 AND tenant_id = $2 RETURNING *`,
          params
        );

        if (!invoice) {
          return sendError(res, 404, 'Invoice not found');
        }

        return sendSuccess(res, { invoice });
      }
    }

    // DELETE /api/v1/invoices/:id - Delete invoice
    if (req.method === 'DELETE') {
      const idMatch = pathname.match(/\/api\/v1\/invoices\/(\d+)$/);
      if (idMatch) {
        const invoiceId = idMatch[1];

        const result = await query(
          'DELETE FROM invoices WHERE id = $1 AND tenant_id = $2',
          [invoiceId, tenantId]
        );

        return sendSuccess(res, { deleted: true, id: invoiceId });
      }
    }

    sendError(res, 404, 'Endpoint not found');
  } catch (error) {
    console.error('[API] Invoices error:', error);
    sendError(res, 500, error.message || 'Failed to process invoice request');
  }
}

export default withAuth(invoicesHandler, { requireScope: 'invoices:read' });
