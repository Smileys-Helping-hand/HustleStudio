// API v1 - Quotes Endpoint
// GET /api/v1/quotes - List quotes
// POST /api/v1/quotes - Create quote
// GET /api/v1/quotes/:id - Get quote
// PATCH /api/v1/quotes/:id - Update quote
// DELETE /api/v1/quotes/:id - Delete quote

import { withAuth, sendSuccess, sendError } from '../middleware.js';
import { query, queryOne } from '../lib/neonDb.js';

async function quotesHandler(req, res, auth) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const { tenantId } = auth;

  try {
    // GET /api/v1/quotes - List quotes
    if (req.method === 'GET' && pathname === '/api/v1/quotes') {
      const status = req.query?.status;
      let sql = 'SELECT * FROM quotes WHERE tenant_id = $1 ORDER BY created_at DESC';
      const params = [tenantId];

      if (status) {
        sql += ' AND status = $2';
        params.push(status);
      }

      const quotes = await query(sql, params);
      return sendSuccess(res, { quotes });
    }

    // GET /api/v1/quotes/:id - Get single quote
    if (req.method === 'GET') {
      const idMatch = pathname.match(/\/api\/v1\/quotes\/(\d+)$/);
      if (idMatch) {
        const quoteId = idMatch[1];
        const quote = await queryOne(
          'SELECT * FROM quotes WHERE id = $1 AND tenant_id = $2',
          [quoteId, tenantId]
        );

        if (!quote) {
          return sendError(res, 404, 'Quote not found');
        }

        return sendSuccess(res, { quote });
      }
    }

    // POST /api/v1/quotes - Create quote
    if (req.method === 'POST' && pathname === '/api/v1/quotes') {
      const body = req.body;

      if (!body.quoteNumber) {
        return sendError(res, 400, 'quoteNumber is required');
      }

      if (!body.clientName) {
        return sendError(res, 400, 'clientName is required');
      }

      if (!Array.isArray(body.lineItems) || body.lineItems.length === 0) {
        return sendError(res, 400, 'lineItems array is required');
      }

      const quote = await queryOne(
        `INSERT INTO quotes (
          tenant_id, quote_number, client_name, client_email,
          client_address, company_name, company_email, company_phone,
          total, currency, status, validity_days, notes, line_items, created_by
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
        RETURNING *`,
        [
          tenantId,
          body.quoteNumber,
          body.clientName,
          body.clientEmail || null,
          body.clientAddress || null,
          body.companyName || null,
          body.companyEmail || null,
          body.companyPhone || null,
          body.total || 0,
          body.currency || 'R',
          body.status || 'draft',
          body.validityDays || 30,
          body.notes || '',
          JSON.stringify(body.lineItems),
          auth.keyId || 'api',
        ]
      );

      return sendSuccess(res, { quote }, { tenantId });
    }

    // PATCH /api/v1/quotes/:id - Update quote
    if (req.method === 'PATCH') {
      const idMatch = pathname.match(/\/api\/v1\/quotes\/(\d+)$/);
      if (idMatch) {
        const quoteId = idMatch[1];
        const body = req.body;

        const updates = [];
        const params = [quoteId, tenantId];
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

        if (body.validityDays !== undefined) {
          updates.push(`validity_days = $${paramIndex++}`);
          params.push(body.validityDays);
        }

        if (updates.length === 0) {
          return sendError(res, 400, 'No fields to update');
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        const quote = await queryOne(
          `UPDATE quotes SET ${updates.join(', ')}
           WHERE id = $1 AND tenant_id = $2 RETURNING *`,
          params
        );

        if (!quote) {
          return sendError(res, 404, 'Quote not found');
        }

        return sendSuccess(res, { quote });
      }
    }

    // DELETE /api/v1/quotes/:id - Delete quote
    if (req.method === 'DELETE') {
      const idMatch = pathname.match(/\/api\/v1\/quotes\/(\d+)$/);
      if (idMatch) {
        const quoteId = idMatch[1];

        await query(
          'DELETE FROM quotes WHERE id = $1 AND tenant_id = $2',
          [quoteId, tenantId]
        );

        return sendSuccess(res, { deleted: true, id: quoteId });
      }
    }

    sendError(res, 404, 'Endpoint not found');
  } catch (error) {
    console.error('[API] Quotes error:', error);
    sendError(res, 500, error.message || 'Failed to process quote request');
  }
}

export default withAuth(quotesHandler, { requireScope: 'quotes:read' });
