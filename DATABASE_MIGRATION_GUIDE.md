# Database Migration Guide - Firebase to Neon DB

## Overview

**Migration Strategy:**
- **Data:** Move to Neon PostgreSQL (via Neon DB)
- **Media:** Keep Firebase Storage for images, PDFs, documents
- **Real-time:** Replace Firestore listeners with API polling or webhooks

---

## Architecture

### Before (Firestore Only)
```
App → Firestore (data + media)
```

### After (Hybrid)
```
App → Neon DB API ← PostgreSQL (data)
   → Firebase Storage (media/files)
```

---

## Setup Steps

### 1. **Neon DB Connection Setup**

Your connection string:
```
postgresql://neondb_owner:npg_VSn0muZgLK7O@ep-long-wind-ab82jcwn-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

Add to `.env.local`:
```env
VITE_NEON_CONNECTION_STRING=postgresql://neondb_owner:npg_VSn0muZgLK7O@ep-long-wind-ab82jcwn-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
VITE_DATABASE_URL=postgresql://neondb_owner:npg_VSn0muZgLK7O@ep-long-wind-ab82jcwn-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
```

### 2. **Database Schema**

Create tables in Neon:

```sql
-- Users table
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  uid VARCHAR(255) UNIQUE NOT NULL,
  email VARCHAR(255) NOT NULL,
  name VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tenants table
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  owner_id INTEGER REFERENCES users(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Invoices table
CREATE TABLE invoices (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(255) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_address TEXT,
  company_name VARCHAR(255),
  company_email VARCHAR(255),
  company_phone VARCHAR(20),
  subtotal DECIMAL(10, 2),
  tax DECIMAL(10, 2),
  tax_rate DECIMAL(5, 2),
  total DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'R',
  status VARCHAR(50) DEFAULT 'draft',
  notes TEXT,
  line_items JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- Quotes table
CREATE TABLE quotes (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  quote_number VARCHAR(255) UNIQUE NOT NULL,
  client_name VARCHAR(255) NOT NULL,
  client_email VARCHAR(255),
  client_address TEXT,
  company_name VARCHAR(255),
  company_email VARCHAR(255),
  company_phone VARCHAR(20),
  total DECIMAL(10, 2),
  currency VARCHAR(3) DEFAULT 'R',
  status VARCHAR(50) DEFAULT 'draft',
  validity_days INTEGER DEFAULT 30,
  notes TEXT,
  line_items JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(255),
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- Contacts table
CREATE TABLE contacts (
  id SERIAL PRIMARY KEY,
  tenant_id VARCHAR(255) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(20),
  company VARCHAR(255),
  stage VARCHAR(100) DEFAULT 'Discovery',
  status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (tenant_id) REFERENCES tenants(tenant_id)
);

-- Create indexes for performance
CREATE INDEX idx_invoices_tenant ON invoices(tenant_id);
CREATE INDEX idx_invoices_number ON invoices(invoice_number);
CREATE INDEX idx_quotes_tenant ON quotes(tenant_id);
CREATE INDEX idx_quotes_number ON quotes(quote_number);
CREATE INDEX idx_contacts_tenant ON contacts(tenant_id);
CREATE INDEX idx_users_uid ON users(uid);
```

### 3. **API Endpoints Setup**

Backend needs these endpoints:

```
POST   /api/v1/invoices           - Create invoice
GET    /api/v1/invoices?tenant=X  - List invoices
GET    /api/v1/invoices/:id       - Get invoice
PATCH  /api/v1/invoices/:id       - Update invoice
DELETE /api/v1/invoices/:id       - Delete invoice

POST   /api/v1/quotes             - Create quote
GET    /api/v1/quotes?tenant=X    - List quotes
GET    /api/v1/quotes/:id         - Get quote
PATCH  /api/v1/quotes/:id         - Update quote
DELETE /api/v1/quotes/:id         - Delete quote

POST   /api/v1/contacts           - Create contact
GET    /api/v1/contacts?tenant=X  - List contacts
PATCH  /api/v1/contacts/:id       - Update contact
DELETE /api/v1/contacts/:id       - Delete contact

GET    /api/v1/health             - Health check
```

---

## Frontend Integration

### Using NeonClient

```javascript
import { getNeonClient } from '@/lib/neonClient';

const neon = getNeonClient();

// Create invoice
const invoice = await neon.createInvoice(tenantId, {
  invoiceNumber: 'INV-001',
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  lineItems: [...],
  total: 1000,
  status: 'draft'
});

// Get invoices
const invoices = await neon.getInvoices(tenantId, {
  status: 'draft',
  limit: 50
});

// Update invoice
await neon.updateInvoice(tenantId, invoiceId, {
  status: 'sent'
});

// Delete invoice
await neon.deleteInvoice(tenantId, invoiceId);
```

---

## Firebase Media Storage

Keep using Firebase for:
- ✅ Company logos
- ✅ Invoice PDFs
- ✅ Signature images
- ✅ Attachments
- ✅ Profile photos

```javascript
import { storage } from '@/lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';

// Upload logo to Firebase
const logoRef = ref(storage, `tenants/${tenantId}/logo.png`);
await uploadBytes(logoRef, logoFile);
```

---

## Migration Checklist

- [ ] Set up Neon DB connection
- [ ] Create database schema (run SQL scripts above)
- [ ] Create API endpoints for invoices/quotes/contacts
- [ ] Update frontend to use NeonClient instead of Firestore
- [ ] Migrate existing Firestore data to Neon
- [ ] Keep Firebase Storage for media files
- [ ] Test all CRUD operations
- [ ] Set up database backups
- [ ] Monitor performance and optimize queries
- [ ] Add database connection pooling
- [ ] Implement caching layer (optional)

---

## Performance Tips

1. **Connection Pooling** - Neon provides built-in connection pooler
2. **Indexes** - Already created on tenant_id and unique fields
3. **Query Optimization** - Use EXPLAIN ANALYZE for slow queries
4. **Caching** - Cache frequently accessed data in memory
5. **Pagination** - Use LIMIT/OFFSET for large result sets

---

## Monitoring

Check Neon DB console for:
- Query performance
- Connection health
- Database size
- Backup status

---

## Rollback Plan

If needed to rollback:
1. Keep Firestore data in sync during migration
2. Dual-write approach (write to both databases)
3. Quick switch via feature flag
4. After 2 weeks of stability, archive old Firestore data

---

## Questions?

Refer to:
- Neon documentation: https://neon.tech/docs
- PostgreSQL docs: https://www.postgresql.org/docs
- Backend API setup: See `/api` directory
