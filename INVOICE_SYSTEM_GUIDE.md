# Invoice System Guide - HustleStudio

## Overview
The invoice system has been completely refined with proper data persistence, tracking, and management capabilities.

## Features Implemented

### 1. **Invoice Creation** (`/crm/invoices`)
- **Client Information Form**: Add client name, email, and billing address
- **Line Items Management**: Add/remove line items with descriptions, quantities, and prices
- **Customization**: 
  - Custom branding (company name, logo, colors)
  - Tax rate configuration
  - Currency selection
  - Custom invoice numbering
- **Live Preview**: See invoice in real-time as you edit
- **PDF Generation**: Download professional PDF invoices
- **Auto-Save to Database**: Invoices are automatically saved to Firestore when generated

### 2. **Invoice History** (`/crm/invoices-list`)
- **Complete Invoice List**: View all invoices with pagination
- **Search & Filter**:
  - Search by client name, invoice number, or email
  - Filter by status (Draft, Sent, Paid, Overdue)
- **Invoice Actions**:
  - Download PDF
  - Delete invoice
  - View details
- **Summary Stats**: Total invoices, total value, paid count, pending count
- **Real-time Updates**: Changes reflect immediately

### 3. **CRM Integration** (`/crm`)
- **Contact Management**: Create and manage client contacts
- **Quick Access**: Links to create invoices or view invoice history
- **Client Information**: Store company, email, phone, and pipeline stage
- **Status Tracking**: Track clients through discovery → closed won

## Database Structure

### Firestore Collections

```
tenants/
  └── {tenantId}/
      ├── contacts/
      │   └── {contactId}/
      │       ├── name
      │       ├── email
      │       ├── phone
      │       ├── company
      │       ├── stage
      │       └── createdAt
      │
      └── invoices/
          └── {invoiceId}/
              ├── invoiceNumber
              ├── clientName
              ├── clientEmail
              ├── clientAddress
              ├── companyName
              ├── companyAddress
              ├── companyEmail
              ├── companyPhone
              ├── lineItems []
              ├── subtotal
              ├── tax
              ├── taxRate
              ├── total
              ├── currency
              ├── notes
              ├── status (draft|sent|paid|overdue)
              ├── primaryColor
              ├── createdAt
              └── updatedAt
```

## How to Use

### Creating an Invoice

1. Navigate to **CRM > Create Invoice**
2. Fill in **Branding & Customization**:
   - Upload logo (optional)
   - Set company name and contact details
   - Customize colors
3. Enter **Client Information**:
   - Client name (required)
   - Email and billing address
4. Add **Line Items**:
   - Description, quantity, and price for each item
   - Click "Add Line Item" to add more
5. Review **Live Preview** on the right side
6. Click **"Download PDF"** to:
   - Generate professional PDF
   - Save invoice data to database
   - Receive success notification

### Managing Invoices

1. Navigate to **CRM > View Invoices**
2. **Search**: Use the search box to find invoices by:
   - Client name
   - Invoice number
   - Client email
3. **Filter**: Select status from dropdown:
   - All Status
   - Draft
   - Sent
   - Paid
   - Overdue
4. **Actions**:
   - **Download**: Get PDF copy of invoice
   - **Delete**: Remove invoice from records
5. **View Stats**: See at bottom:
   - Total invoices created
   - Total value of all invoices
   - Count of paid invoices
   - Count of pending invoices

## Data Persistence

All invoice data is saved to Firestore:
- ✅ Automatic saving when PDF is generated
- ✅ Real-time synchronization across devices
- ✅ Offline persistence enabled (data available offline)
- ✅ Secure tenant-scoped storage

## Invoice Workflow

```
1. Create Contact in CRM
   ↓
2. Navigate to Create Invoice
   ↓
3. Select client from contacts (optional)
   ↓
4. Configure invoice details & branding
   ↓
5. Add line items
   ↓
6. Review live preview
   ↓
7. Download PDF (auto-saves to database)
   ↓
8. Invoice now appears in Invoice History
   ↓
9. Track invoice status: Draft → Sent → Paid
```

## Invoice Status Meanings

| Status | Meaning | When to Use |
|--------|---------|-----------|
| **Draft** | Invoice created but not sent | Before finalizing with client |
| **Sent** | Invoice delivered to client | After sending invoice to client |
| **Paid** | Payment received | After client pays the invoice |
| **Overdue** | Payment is past due | If client hasn't paid by due date |

## Configuration

### Environment Variables Needed
```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

## Features Coming Soon

- [ ] Email invoices directly to clients
- [ ] Recurring invoice templates
- [ ] Payment tracking and reminders
- [ ] Invoice modifications and versioning
- [ ] Bulk invoice operations
- [ ] Custom invoice templates
- [ ] Integration with payment processors

## Troubleshooting

### Invoice not saving?
- Ensure workspace is selected
- Check Firebase connection
- Verify Firestore permissions

### Can't view invoices?
- Refresh the page
- Check if invoices exist for current workspace
- Verify Firestore rules allow read access

### PDF not generating?
- Ensure all required fields are filled
- Check browser console for errors
- Verify jsPDF library is loaded

## Support & Feedback

For issues or feature requests related to the invoice system, check:
- Browser console for error messages
- Firestore dashboard for data verification
- Network tab for API/Firestore communication logs
