# 🔌 Hustle Connect - API Integration System

## Overview

Hustle Connect is the official API layer for Hustle Studio, enabling secure data exchange between Hustle Studio and external applications like WorkspaceOS.

## 📋 What's Included

### 1. Developer Settings UI (`/settings/developer`)
- API key generation with scope selection
- One-time key display (security best practice)
- Key management (view, revoke, delete)
- Usage tracking and analytics

### 2. REST API Endpoints
- **GET** `/api/v1/business-health` - Business metrics dashboard
- **GET** `/api/v1/clients` - Client list with filtering
- **POST** `/api/v1/invoices/draft` - Create draft invoices

### 3. Deep Link System
- `/link/invoice-builder` - Pre-fill invoice forms via URL parameters
- Enables external apps to trigger workflows with context

### 4. Security Layer
- SHA-256 key hashing
- Scope-based permissions
- CORS protection
- Request authentication middleware
- Usage monitoring

## 🚀 Quick Start

### For Hustle Studio Users

1. Navigate to **Settings → Developer Settings**
2. Click **Generate New Key**
3. Configure:
   - Name (e.g., "WorkspaceOS Production")
   - Environment (live/test)
   - Scopes (permissions)
4. Copy the key immediately (shown only once!)
5. Use in external apps

### For Developers

```javascript
// Install the SDK (copy from docs/hustle-connect-sdk.js)
import HustleConnect from './hustle-connect-sdk.js';

// Initialize
const hustle = new HustleConnect('hs_live_your_api_key');

// Get business health
const health = await hustle.getBusinessHealth();
console.log(`Revenue: $${health.revenue}`);

// Create invoice
const invoice = await hustle.createInvoiceDraft({
  clientName: 'Acme Corp',
  lineItems: [
    { description: 'Consulting', quantity: 20, rate: 150 }
  ]
});

// Generate deep link
const link = hustle.generateInvoiceLink({
  project: 'Unity Game',
  hours: 40,
  rate: 75
});
```

## 📚 Documentation

- **[HUSTLE_CONNECT_API.md](./HUSTLE_CONNECT_API.md)** - Complete API reference
- **[HUSTLE_CONNECT_SETUP.md](./HUSTLE_CONNECT_SETUP.md)** - Setup guide
- **[docs/hustle-connect-sdk.js](./docs/hustle-connect-sdk.js)** - JavaScript SDK

## 🔐 Security

### Key Storage
- Keys are hashed (SHA-256) before storage
- Original keys never stored in database
- Displayed only once during generation

### Permissions (Scopes)
- `invoices:read` - View invoices
- `invoices:write` - Create/update invoices
- `clients:read` - View clients
- `clients:write` - Create/update clients
- `health:read` - View business metrics
- `projects:read` - View projects
- `projects:write` - Create/update projects

### CORS
Pre-configured for:
- `https://workspace-os.web.app`
- `http://localhost:*` (development)

## 🛠️ Development Setup

### Prerequisites

The API endpoints use Firebase Admin SDK, which requires credentials:

1. **Generate Service Account Key**
   - Go to Firebase Console → Project Settings → Service Accounts
   - Click "Generate new private key"
   - Download the JSON file

2. **Set Environment Variable** (for local development)
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="/path/to/service-account-key.json"
   ```

3. **For Vercel Deployment**
   - Convert service account JSON to base64
   - Add as environment variable in Vercel dashboard
   - Configure in `vercel.json` or project settings

### Running Locally

```bash
# Install dependencies
npm install

# Start dev server
npm run dev

# Access Developer Settings
http://localhost:3010/settings/developer

# Test API endpoint
curl -H "x-api-key: your_test_key" \
  http://localhost:3010/api/v1/business-health
```

## 🧪 Testing

### Generate Test Key
1. Go to `/settings/developer`
2. Create key with environment = "test"
3. Use for development/testing

### Test Endpoints

```bash
# Business health
curl -H "x-api-key: hs_test_..." \
  http://localhost:3010/api/v1/business-health

# Clients list
curl -H "x-api-key: hs_test_..." \
  http://localhost:3010/api/v1/clients?status=active

# Create invoice
curl -X POST \
  -H "x-api-key: hs_test_..." \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Test Corp","lineItems":[{"description":"Service","quantity":1,"price":100}]}' \
  http://localhost:3010/api/v1/invoices/draft
```

### Test Deep Link

Visit: `http://localhost:3010/link/invoice-builder?project=Test&hours=10&rate=50`

## 📊 Monitoring

API key usage is tracked:
- Last used timestamp
- Total request count
- View in Developer Settings

## 🤝 Integration Examples

### WorkspaceOS Dashboard Widget

```javascript
const hustle = new HustleConnect(process.env.HUSTLE_API_KEY);

async function updateBusinessMetrics() {
  const health = await hustle.getBusinessHealth();
  
  document.querySelector('.revenue').textContent = 
    `$${health.revenue.toLocaleString()}`;
  document.querySelector('.clients').textContent = 
    health.activeClients;
  document.querySelector('.pending').textContent = 
    health.pendingInvoices;
}

// Update every 5 minutes
setInterval(updateBusinessMetrics, 5 * 60 * 1000);
```

### Create Invoice Button

```html
<button onclick="createInvoice()">
  Create Invoice in Hustle Studio
</button>

<script>
async function createInvoice() {
  const hustle = new HustleConnect(API_KEY);
  
  const invoice = await hustle.createInvoiceDraft({
    clientName: currentProject.client,
    projectRef: currentProject.name,
    lineItems: currentProject.tasks.map(task => ({
      description: task.name,
      quantity: task.hours,
      rate: 75
    }))
  });
  
  alert(`Invoice ${invoice.invoiceNumber} created!`);
}
</script>
```

### Deep Link Integration

```javascript
function generateHustleInvoiceLink(projectData) {
  const hustle = new HustleConnect(API_KEY);
  
  return hustle.generateInvoiceLink({
    project: projectData.name,
    client: projectData.clientName,
    hours: projectData.totalHours,
    rate: projectData.hourlyRate || 75,
    description: `Services for ${projectData.name}`
  });
}

// In WorkspaceOS: Add link to project cards
const link = generateHustleInvoiceLink(project);
projectCard.innerHTML += `
  <a href="${link}" target="_blank" class="btn-invoice">
    📄 Create Invoice
  </a>
`;
```

## 🐛 Troubleshooting

### API Key Issues
- **"Missing API key"**: Ensure `x-api-key` header is set
- **"Invalid key"**: Key may be revoked/deleted, generate new one
- **"Missing scope"**: Generate key with required permissions

### CORS Errors
- Check origin is in ALLOWED_ORIGINS (api/middleware.js)
- Verify request includes proper headers

### Deep Link Not Working
- Check query parameters are URL-encoded
- Ensure user is logged into Hustle Studio
- Verify route is registered in App.jsx

## 🚢 Deployment

### Vercel Configuration

```json
{
  "env": {
    "GOOGLE_APPLICATION_CREDENTIALS": "@firebase-admin-key"
  }
}
```

### Required Environment Variables
- `GOOGLE_APPLICATION_CREDENTIALS` - Firebase Admin SDK credentials
- `VITE_FIREBASE_*` - Firebase client config (already configured)

## 📞 Support

- **Documentation**: [HUSTLE_CONNECT_API.md](./HUSTLE_CONNECT_API.md)
- **Issues**: GitHub Issues
- **Security**: security@hustlestudio.co.za

## 🎉 Ready to Connect!

Hustle Connect is now live and ready to power integrations between Hustle Studio and your external applications.

**Next Steps:**
1. ✅ Generate your first API key
2. ✅ Test an endpoint
3. ✅ Integrate with WorkspaceOS
4. ✅ Create your first deep link

Happy building! 🚀
