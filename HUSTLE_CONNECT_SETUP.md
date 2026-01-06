# Hustle Connect - Quick Setup Guide

## 🚀 What Was Built

The **Hustle Connect API System** enables external applications (like WorkspaceOS) to securely integrate with Hustle Studio. This implementation includes:

### ✅ Components Delivered

1. **API Key Management** (`/settings/developer`)
   - Generate keys with scope-based permissions
   - One-time key display (like Stripe/GitHub)
   - Revoke/delete keys
   - Usage tracking

2. **Secure API Endpoints** (`/api/v1/*`)
   - `GET /api/v1/business-health` - Business metrics
   - `POST /api/v1/invoices/draft` - Create draft invoices
   - `GET /api/v1/clients` - List clients

3. **Deep Link Handler** (`/link/invoice-builder`)
   - Pre-fill invoice forms via URL params
   - Seamless external app integration

4. **Security Features**
   - SHA-256 key hashing
   - Scope-based permissions
   - CORS configuration
   - Request authentication middleware

---

## 📦 New Files Created

```
src/
├── lib/
│   └── apiKeys.js                    # Key generation, hashing, validation
├── pages/
│   ├── DeveloperSettings.jsx         # API key management UI
│   └── links/
│       └── InvoiceBuilderLink.jsx    # Deep link handler
api/
├── middleware.js                     # Auth & CORS middleware
├── v1/
│   ├── business-health.js            # Business metrics endpoint
│   ├── clients.js                    # Clients list endpoint
│   └── invoices-draft.js             # Invoice creation endpoint
HUSTLE_CONNECT_API.md                 # Complete API documentation
```

### 📝 Modified Files

- `src/App.jsx` - Added routes for Developer Settings and deep link
- `src/pages/Settings.jsx` - Added navigation to Developer Settings
- `src/pages/CRM/InvoicesV2.jsx` - Added pre-fill data reading
- `api/index.js` - Added v1 API routing

---

## 🎯 How to Use

### For Hustle Studio Users

1. **Navigate to Developer Settings**
   - Go to Settings → "Developer & API Settings"
   - Click "Manage APIs"

2. **Create an API Key**
   - Click "Generate New Key"
   - Name it (e.g., "WorkspaceOS Production")
   - Select environment (live/test)
   - Choose scopes (permissions)
   - Copy the key **immediately** (shown only once!)

3. **Use the Key in External Apps**
   ```javascript
   fetch('https://hustlestudio.vercel.app/api/v1/business-health', {
     headers: { 'x-api-key': 'hs_live_your_key_here' }
   })
   ```

### For External App Developers

1. **Get an API Key** from a Hustle Studio user/admin

2. **Make API Requests**
   ```javascript
   // Example: Fetch business health
   const response = await fetch('https://hustlestudio.vercel.app/api/v1/business-health', {
     headers: {
       'x-api-key': process.env.HUSTLE_API_KEY
     }
   });
   const data = await response.json();
   ```

3. **Create Deep Links**
   ```html
   <a href="https://hustlestudio.vercel.app/link/invoice-builder?project=Unity&hours=20&rate=75">
     Create Invoice in Hustle Studio
   </a>
   ```

---

## 🔐 Security Notes

1. **API Keys are Hashed** - Stored as SHA-256 hashes in Firestore
2. **Scope-Based Access** - Each key has specific permissions
3. **CORS Protected** - Only allowed origins can make requests
4. **Usage Tracking** - Last used timestamp and request count

### Storage Location

API keys are stored in:
```
Firestore: /api_keys/{keyId}
```

Structure:
```json
{
  "tenantId": "tenant_xyz",
  "name": "Production API",
  "hashedKey": "sha256_hash_here",
  "keyPreview": "•••••••• abcd1234",
  "scopes": ["invoices:read", "clients:read"],
  "environment": "live",
  "createdAt": "timestamp",
  "lastUsed": "timestamp",
  "usageCount": 42,
  "isActive": true
}
```

---

## 🧪 Testing

### Test the Developer Settings Page

1. Start the dev server: `npm run dev`
2. Navigate to `http://localhost:3010/settings/developer`
3. Generate a test key with `invoices:read` scope
4. Verify key is displayed once and masked in the list

### Test API Endpoints Locally

Since the API uses Firebase Admin SDK, you'll need to:

1. **Set up Firebase Admin credentials** (if not already)
2. **Test with curl**:
   ```bash
   curl -H "x-api-key: hs_test_your_key" \
     http://localhost:3010/api/v1/business-health
   ```

### Test Deep Link

1. Visit: `http://localhost:3010/link/invoice-builder?project=TestProject&hours=10&rate=50`
2. Verify redirect to invoice page with pre-filled data

---

## 📚 Available API Scopes

| Scope | Description |
|-------|-------------|
| `invoices:read` | View invoice data |
| `invoices:write` | Create and update invoices |
| `clients:read` | View client data |
| `clients:write` | Create and update clients |
| `health:read` | View business metrics |
| `projects:read` | View project data |
| `projects:write` | Create and update projects |

---

## 🌐 CORS Configuration

Allowed origins:
- `https://workspace-os.web.app`
- `https://workspace-os.firebaseapp.com`
- `http://localhost:*` (any port, for development)

To add more origins, edit `api/middleware.js`:
```javascript
const ALLOWED_ORIGINS = [
  'https://workspace-os.web.app',
  'https://your-app.com',  // Add here
];
```

---

## 🐛 Troubleshooting

### "Missing API key" Error
- Ensure `x-api-key` header is included
- Check for typos in header name (case-sensitive)

### "Invalid or inactive API key" Error
- Verify key hasn't been deleted/revoked
- Check if using correct environment (test vs live)

### "Missing required scope" Error
- Generate a new key with the required scope
- Or add the scope to existing key (requires re-generation)

### CORS Errors
- Verify your domain is in the ALLOWED_ORIGINS list
- Check browser console for specific CORS error details

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Set up Firebase Admin credentials in Vercel
- [ ] Configure CORS for production domains
- [ ] Test all API endpoints in staging
- [ ] Verify API keys are properly hashed
- [ ] Test deep links with real URLs
- [ ] Review rate limiting settings
- [ ] Document API keys for team members
- [ ] Set up monitoring/logging for API usage

---

## 📖 Full Documentation

See [HUSTLE_CONNECT_API.md](./HUSTLE_CONNECT_API.md) for:
- Complete endpoint documentation
- Request/response examples
- Integration guides
- Security best practices
- Rate limiting details

---

## 🎉 Ready to Use!

The Hustle Connect API system is now fully implemented and ready for integration with WorkspaceOS and other external applications.

**Next Steps:**
1. Generate your first API key
2. Test an endpoint
3. Integrate with WorkspaceOS
4. Create your first deep link

Happy integrating! 🚀
