# Hustle Connect API Documentation

## Overview

**Hustle Connect** is the official API system for Hustle Studio, enabling external applications (like WorkspaceOS) to securely access and manipulate business data. The API uses key-based authentication with granular scope permissions.

## Getting Started

### 1. Generate an API Key

1. Navigate to **Settings → Developer Settings** (`/settings/developer`)
2. Click **Generate New Key**
3. Enter a descriptive name (e.g., "WorkspaceOS Production")
4. Select the **Environment**: `live` or `test`
5. Choose **Permissions (Scopes)**:
   - `invoices:read` - View invoice data
   - `invoices:write` - Create and update invoices
   - `clients:read` - View client data
   - `clients:write` - Create and update clients
   - `health:read` - View business health metrics
   - `projects:read` - View project data
   - `projects:write` - Create and update projects
6. Click **Generate Key**
7. **IMPORTANT**: Copy the key immediately. It will only be shown once!

### 2. API Key Format

- **Live keys**: `hs_live_[32 random characters]`
- **Test keys**: `hs_test_[32 random characters]`

Keys are hashed (SHA-256) before storage for security.

## API Endpoints

### Base URL

```
Production: https://hustlestudio.vercel.app/api
Development: http://localhost:3010/api
```

### Authentication

All API requests require the `x-api-key` header:

```bash
curl -H "x-api-key: hs_live_abc123..." \
  https://hustlestudio.vercel.app/api/v1/business-health
```

---

## Endpoints

### 1. GET /api/v1/business-health

Returns an overview of business metrics.

**Required Scope**: `health:read`

**Response**:
```json
{
  "success": true,
  "data": {
    "revenue": 45000,
    "pendingInvoices": 3,
    "paidInvoices": 12,
    "totalInvoices": 15,
    "activeClients": 8,
    "activeProjects": 5,
    "currency": "USD"
  },
  "meta": {
    "tenantId": "tenant_xyz",
    "timestamp": "2026-01-06T14:30:00Z"
  },
  "timestamp": "2026-01-06T14:30:00Z"
}
```

**Example**:
```javascript
const response = await fetch('https://hustlestudio.vercel.app/api/v1/business-health', {
  headers: {
    'x-api-key': 'hs_live_your_key_here'
  }
});
const data = await response.json();
console.log(`Revenue: ${data.data.revenue}`);
```

---

### 2. GET /api/v1/clients

Returns a list of clients.

**Required Scope**: `clients:read`

**Query Parameters**:
- `status` (optional): Filter by status (`active`, `inactive`, `all`). Default: `active`
- `limit` (optional): Max results (1-100). Default: `50`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "client_123",
      "name": "Acme Corporation",
      "email": "contact@acme.com",
      "company": "Acme Corp",
      "status": "active",
      "phone": "+1-555-0100",
      "createdAt": "2025-12-01T10:00:00Z",
      "totalProjects": 3,
      "totalRevenue": 15000
    }
  ],
  "meta": {
    "count": 8,
    "status": "active",
    "tenantId": "tenant_xyz"
  }
}
```

**Example**:
```javascript
const url = new URL('https://hustlestudio.vercel.app/api/v1/clients');
url.searchParams.set('status', 'active');
url.searchParams.set('limit', '20');

const response = await fetch(url, {
  headers: { 'x-api-key': 'hs_live_your_key_here' }
});
```

---

### 3. POST /api/v1/invoices/draft

Creates a draft invoice.

**Required Scope**: `invoices:write`

**Request Body**:
```json
{
  "clientName": "Acme Corporation",
  "clientId": "client_123",
  "clientEmail": "billing@acme.com",
  "projectRef": "Project Unity",
  "lineItems": [
    {
      "description": "Web Development",
      "quantity": 40,
      "rate": 75
    },
    {
      "description": "Design Work",
      "quantity": 10,
      "rate": 85
    }
  ],
  "tax": 450,
  "currency": "USD",
  "dueDate": "2026-02-01",
  "notes": "Payment due within 30 days"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "invoice_xyz789",
    "invoiceNumber": "INV-1736172600-A3F9K",
    "status": "draft",
    "total": 3850,
    "message": "Draft invoice created successfully"
  },
  "meta": {
    "tenantId": "tenant_xyz"
  }
}
```

**Example**:
```javascript
const response = await fetch('https://hustlestudio.vercel.app/api/v1/invoices/draft', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'x-api-key': 'hs_live_your_key_here'
  },
  body: JSON.stringify({
    clientName: 'Acme Corp',
    lineItems: [
      { description: 'Consulting', quantity: 20, rate: 150 }
    ]
  })
});
```

---

## Deep Links

Deep links allow external apps to pre-fill Hustle Studio forms with data.

### Invoice Builder Link

**URL**: `/link/invoice-builder`

**Parameters**:
- `project` - Project name/reference
- `client` - Client name
- `clientEmail` - Client email
- `hours` - Number of hours
- `rate` - Hourly rate
- `amount` - Fixed amount (alternative to hours × rate)
- `description` - Service description
- `dueDate` - Due date (ISO format: YYYY-MM-DD)
- `notes` - Additional notes

**Example**:
```
https://hustlestudio.vercel.app/link/invoice-builder?project=Unity&client=Northstar&hours=20&rate=75&description=Development%20Services
```

This will redirect to the invoice form with all fields pre-filled.

---

## CORS Configuration

The API allows requests from:
- `https://workspace-os.web.app`
- `https://workspace-os.firebaseapp.com`
- `http://localhost:*` (development)

If you need additional origins whitelisted, contact support.

---

## Error Responses

All errors follow this format:

```json
{
  "success": false,
  "error": "Error message describing what went wrong",
  "timestamp": "2026-01-06T14:30:00Z"
}
```

**Common Status Codes**:
- `400` - Bad request (missing/invalid parameters)
- `401` - Unauthorized (missing/invalid API key)
- `403` - Forbidden (insufficient permissions/scope)
- `404` - Endpoint not found
- `405` - Method not allowed
- `500` - Internal server error

---

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use environment variables** to store keys
3. **Rotate keys regularly** (every 90 days recommended)
4. **Use test keys** for development/staging
5. **Grant minimum required scopes** (principle of least privilege)
6. **Monitor key usage** in Developer Settings
7. **Revoke compromised keys immediately**

---

## Rate Limiting

- **Default**: 100 requests per minute per API key
- **Burst**: 200 requests per minute (short bursts allowed)

Rate limit headers are included in responses:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1736172660
```

---

## Integration Examples

### WorkspaceOS Dashboard Widget

```javascript
// Fetch and display business health in WorkspaceOS
async function updateHustleWidget() {
  const apiKey = process.env.HUSTLE_API_KEY;
  
  const response = await fetch('https://hustlestudio.vercel.app/api/v1/business-health', {
    headers: { 'x-api-key': apiKey }
  });
  
  const { data } = await response.json();
  
  document.getElementById('revenue').textContent = `$${data.revenue.toLocaleString()}`;
  document.getElementById('clients').textContent = data.activeClients;
  document.getElementById('pending').textContent = data.pendingInvoices;
}
```

### Create Invoice from External App

```javascript
async function createHustleInvoice(projectData) {
  const response = await fetch('https://hustlestudio.vercel.app/api/v1/invoices/draft', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': process.env.HUSTLE_API_KEY
    },
    body: JSON.stringify({
      clientName: projectData.clientName,
      projectRef: projectData.projectName,
      lineItems: projectData.services.map(svc => ({
        description: svc.name,
        quantity: svc.hours,
        rate: svc.hourlyRate
      }))
    })
  });
  
  const result = await response.json();
  console.log(`Invoice ${result.data.invoiceNumber} created!`);
}
```

---

## Support

- **Issues**: Report bugs in the Hustle Studio GitHub repository
- **Feature Requests**: Use the feedback form in Settings
- **Security Concerns**: Email security@hustlestudio.co.za

---

## Changelog

### v1.0.0 (January 2026)
- Initial release
- Business health endpoint
- Clients list endpoint
- Invoice draft creation
- Deep link for invoice builder
- Scope-based permissions
