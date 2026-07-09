# Neon PostgreSQL Database Setup Guide

## Overview

This guide walks through setting up and migrating the Hustle Studio app to use Neon PostgreSQL for data storage while keeping Firebase Storage for media files.

### Architecture
```
Frontend (React)
    ↓
Neon API Endpoints (/api/v1/invoices, quotes, contacts)
    ↓
Neon PostgreSQL (Data)
    ↓
Firebase Storage (Media - logos, PDFs, images)
```

## Prerequisites

- Neon account and database created
- Neon connection string (provided via .env.local)
- PostgreSQL client (`pg` npm package - already installed)
- Node.js 16+

## Step 1: Environment Setup

Add your Neon connection string to `.env.local`:

```env
# Neon PostgreSQL
DATABASE_URL=postgresql://neondb_owner:npg_VSn0muZgLK7O@ep-long-wind-ab82jcwn-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require
VITE_NEON_CONNECTION_STRING=postgresql://neondb_owner:npg_VSn0muZgLK7O@ep-long-wind-ab82jcwn-pooler.eu-west-2.aws.neon.tech/neondb?sslmode=require&channel_binding=require

# Firebase (kept for media storage)
VITE_FIREBASE_PROJECT_ID=side-hustle-studio
VITE_FIREBASE_API_KEY=...
# ... other Firebase config
```

## Step 2: Initialize Database Schema

Run the setup script to create all tables and indexes:

```bash
npm run setup:neon
```

This will:
- ✅ Create `users` table
- ✅ Create `tenants` table
- ✅ Create `invoices` table
- ✅ Create `quotes` table
- ✅ Create `contacts` table
- ✅ Create performance indexes

**Output example:**
```
🔄 Connecting to Neon Database...
✅ Connected to Neon Database
✅ Created/Updated: users
✅ Created/Updated: tenants
✅ Created/Updated: invoices
✅ Created/Updated: quotes
✅ Created/Updated: contacts
✅ Database setup complete!
```

## Step 3: API Endpoints

The following endpoints are now available:

### Invoices
```
POST   /api/v1/invoices              - Create invoice
GET    /api/v1/invoices?tenant=ID    - List invoices
GET    /api/v1/invoices/:id          - Get single invoice
PATCH  /api/v1/invoices/:id          - Update invoice
DELETE /api/v1/invoices/:id          - Delete invoice
```

### Quotes
```
POST   /api/v1/quotes                - Create quote
GET    /api/v1/quotes?tenant=ID      - List quotes
GET    /api/v1/quotes/:id            - Get single quote
PATCH  /api/v1/quotes/:id            - Update quote
DELETE /api/v1/quotes/:id            - Delete quote
```

### Contacts
```
POST   /api/v1/contacts              - Create contact
GET    /api/v1/contacts?tenant=ID    - List contacts
PATCH  /api/v1/contacts/:id          - Update contact
DELETE /api/v1/contacts/:id          - Delete contact
```

## Step 4: Frontend Integration

### Using NeonClient (Frontend)

```javascript
import { getNeonClient } from '@/lib/neonClient';

const neon = getNeonClient();

// Create invoice
const invoice = await neon.createInvoice(tenantId, {
  invoiceNumber: 'INV-001',
  clientName: 'John Doe',
  clientEmail: 'john@example.com',
  lineItems: [
    { description: 'Service', quantity: 1, amount: 1000 }
  ],
  total: 1000,
  status: 'draft'
});

// Get invoices
const invoices = await neon.getInvoices(tenantId);

// Update invoice
await neon.updateInvoice(tenantId, invoiceId, { status: 'sent' });

// Delete invoice
await neon.deleteInvoice(tenantId, invoiceId);
```

### Components Updated

✅ **InvoicesV2.jsx**
- Changed from Firestore to Neon API
- Uses `neon.createInvoice()` for saving
- Supports both invoices and quotes

✅ **BusinessDocuments.jsx**
- Changed from Firestore listeners to Neon API
- Polls every 30 seconds for updates
- Combines invoices and quotes data

### Components Still to Update

- QuoteGenerator.jsx - Update to use NeonClient
- InvoicesList.jsx - Update to use NeonClient

## Step 5: Firebase Storage Integration

Media files (logos, PDFs, attachments) still use Firebase Storage:

```javascript
import { storage } from '@/lib/firebase';
import { ref, uploadBytes } from 'firebase/storage';

// Upload logo
const logoRef = ref(storage, `tenants/${tenantId}/logo.png`);
await uploadBytes(logoRef, logoFile);
```

**Stored in Firebase:**
- ✅ Company logos
- ✅ Generated PDFs
- ✅ Signature images
- ✅ Document attachments
- ✅ Profile photos

**Stored in Neon:**
- ✅ Invoice/Quote metadata
- ✅ Line items and totals
- ✅ Client information
- ✅ Payment status
- ✅ Document history

## Step 6: Data Migration (Optional)

To migrate existing Firestore data to Neon:

```javascript
// This would be a one-time script
// Not included yet - manual migration recommended

// Steps:
// 1. Export invoices from Firestore
// 2. Transform to Neon format
// 3. Insert via API endpoints
// 4. Verify all data migrated
// 5. Keep Firestore as backup for 1 week
```

## Step 7: Testing

### Manual Testing

1. **Create an invoice:**
   ```bash
   curl -X POST http://localhost:3010/api/v1/invoices \
     -H "x-api-key: YOUR_API_KEY" \
     -H "Content-Type: application/json" \
     -d '{
       "tenantId": "tenant-123",
       "invoiceNumber": "INV-001",
       "clientName": "Test Client",
       "lineItems": [{"description": "Service", "quantity": 1, "amount": 100}],
       "total": 100,
       "status": "draft"
     }'
   ```

2. **List invoices:**
   ```bash
   curl http://localhost:3010/api/v1/invoices?tenant=tenant-123 \
     -H "x-api-key: YOUR_API_KEY"
   ```

3. **In the app:**
   - Go to CRM → Invoices & Quotes
   - Create an invoice
   - Check that it appears in Business Documents
   - Verify it's saved to Neon DB

### Performance Monitoring

Monitor your Neon database via:
- Neon Console: https://console.neon.tech
- Query performance with `EXPLAIN ANALYZE`
- Connection pool utilization

## Troubleshooting

### Connection Error
```
Error: DATABASE_URL not set
```
**Fix:** Ensure `.env.local` has `DATABASE_URL` or `VITE_NEON_CONNECTION_STRING`

### Table Already Exists
```
Error: relation "invoices" already exists
```
**Fix:** This is safe to ignore - tables are only created if they don't exist

### Slow Queries
**Fix:** Check indexes are created:
```sql
SELECT * FROM pg_indexes WHERE tablename IN ('invoices', 'quotes', 'contacts');
```

### Connection Pool Exhausted
**Fix:** Neon auto-manages, but you can monitor:
- Neon Console → Monitoring
- Max connections: 20 per app instance
- Idle timeout: 30 seconds

## Performance Tips

1. **Connection Pooling** - Automatically handled by Neon
2. **Indexes** - Already created on tenant_id, numbers, status
3. **Query Optimization** - Use LIMIT for large datasets
4. **Caching** - Optional: Add Redis for frequently accessed data

## Rollback Plan

If you need to revert to Firestore:

1. Keep Firestore data in sync (dual-write during migration)
2. Feature flag to switch between APIs
3. No data loss - both systems have complete copies

## FAQ

**Q: Will API calls be faster than Firestore?**
A: Depends on your region and network, but generally comparable. Neon's connection pooling helps.

**Q: Can I still use Firestore for real-time features?**
A: Yes! Firebase is still available for auth, real-time messaging, etc. Only data storage moved to Neon.

**Q: What about offline support?**
A: Offline support handled by frontend caching. When online, data syncs to Neon via API.

**Q: How do I handle concurrent edits?**
A: Use `updated_at` timestamps. Recommended: Last-write-wins or implement optimistic locking.

## Next Steps

1. ✅ Database schema created
2. ✅ API endpoints deployed
3. ✅ Frontend components updated
4. ⏳ Complete remaining components (QuoteGenerator, InvoicesList)
5. ⏳ Data migration from Firestore (optional)
6. ⏳ Load testing and optimization

## Support

For issues:
- Check Neon documentation: https://neon.tech/docs
- Check PostgreSQL docs: https://www.postgresql.org/docs
- Review DATABASE_MIGRATION_GUIDE.md for more details
