// API v1 - Contacts Endpoint
// GET /api/v1/contacts - List contacts
// POST /api/v1/contacts - Create contact
// PATCH /api/v1/contacts/:id - Update contact
// DELETE /api/v1/contacts/:id - Delete contact

import { withAuth, sendSuccess, sendError } from '../middleware.js';
import { query, queryOne } from '../lib/neonDb.js';

async function contactsHandler(req, res, auth) {
  const { pathname } = new URL(req.url, `http://${req.headers.host}`);
  const { tenantId } = auth;

  try {
    // GET /api/v1/contacts - List contacts
    if (req.method === 'GET' && pathname === '/api/v1/contacts') {
      const stage = req.query?.stage;
      let sql = 'SELECT * FROM contacts WHERE tenant_id = $1 ORDER BY created_at DESC';
      const params = [tenantId];

      if (stage) {
        sql += ' AND stage = $2';
        params.push(stage);
      }

      const contacts = await query(sql, params);
      return sendSuccess(res, { contacts });
    }

    // GET /api/v1/contacts/:id - Get single contact
    if (req.method === 'GET') {
      const idMatch = pathname.match(/\/api\/v1\/contacts\/(\d+)$/);
      if (idMatch) {
        const contactId = idMatch[1];
        const contact = await queryOne(
          'SELECT * FROM contacts WHERE id = $1 AND tenant_id = $2',
          [contactId, tenantId]
        );

        if (!contact) {
          return sendError(res, 404, 'Contact not found');
        }

        return sendSuccess(res, { contact });
      }
    }

    // POST /api/v1/contacts - Create contact
    if (req.method === 'POST' && pathname === '/api/v1/contacts') {
      const body = req.body;

      if (!body.name) {
        return sendError(res, 400, 'name is required');
      }

      const contact = await queryOne(
        `INSERT INTO contacts (
          tenant_id, name, email, phone, company, stage, status
        ) VALUES ($1, $2, $3, $4, $5, $6, $7)
        RETURNING *`,
        [
          tenantId,
          body.name,
          body.email || null,
          body.phone || null,
          body.company || null,
          body.stage || 'Discovery',
          body.status || 'active',
        ]
      );

      return sendSuccess(res, { contact }, { tenantId });
    }

    // PATCH /api/v1/contacts/:id - Update contact
    if (req.method === 'PATCH') {
      const idMatch = pathname.match(/\/api\/v1\/contacts\/(\d+)$/);
      if (idMatch) {
        const contactId = idMatch[1];
        const body = req.body;

        const updates = [];
        const params = [contactId, tenantId];
        let paramIndex = 3;

        if (body.name !== undefined) {
          updates.push(`name = $${paramIndex++}`);
          params.push(body.name);
        }

        if (body.email !== undefined) {
          updates.push(`email = $${paramIndex++}`);
          params.push(body.email);
        }

        if (body.phone !== undefined) {
          updates.push(`phone = $${paramIndex++}`);
          params.push(body.phone);
        }

        if (body.company !== undefined) {
          updates.push(`company = $${paramIndex++}`);
          params.push(body.company);
        }

        if (body.stage !== undefined) {
          updates.push(`stage = $${paramIndex++}`);
          params.push(body.stage);
        }

        if (body.status !== undefined) {
          updates.push(`status = $${paramIndex++}`);
          params.push(body.status);
        }

        if (updates.length === 0) {
          return sendError(res, 400, 'No fields to update');
        }

        updates.push(`updated_at = CURRENT_TIMESTAMP`);

        const contact = await queryOne(
          `UPDATE contacts SET ${updates.join(', ')}
           WHERE id = $1 AND tenant_id = $2 RETURNING *`,
          params
        );

        if (!contact) {
          return sendError(res, 404, 'Contact not found');
        }

        return sendSuccess(res, { contact });
      }
    }

    // DELETE /api/v1/contacts/:id - Delete contact
    if (req.method === 'DELETE') {
      const idMatch = pathname.match(/\/api\/v1\/contacts\/(\d+)$/);
      if (idMatch) {
        const contactId = idMatch[1];

        await query(
          'DELETE FROM contacts WHERE id = $1 AND tenant_id = $2',
          [contactId, tenantId]
        );

        return sendSuccess(res, { deleted: true, id: contactId });
      }
    }

    sendError(res, 404, 'Endpoint not found');
  } catch (error) {
    console.error('[API] Contacts error:', error);
    sendError(res, 500, error.message || 'Failed to process contact request');
  }
}

export default withAuth(contactsHandler, { requireScope: 'contacts:read' });
