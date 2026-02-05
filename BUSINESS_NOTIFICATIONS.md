# Business Notifications System - Documentation

## Overview

Your Hustle Studio app now has a comprehensive business notification system that ensures you never miss critical business events. The system provides real-time alerts for:

✅ **Invoice Management**
- Invoice created notifications
- Overdue payment reminders
- Payment received confirmations

✅ **Inventory Management**
- Low stock alerts (configurable threshold)
- Automatic checks after each sale

✅ **Sales & Revenue**
- Sale completion notifications
- Revenue milestone celebrations (R10k, R50k, R100k, etc.)
- Automatic sales tracking

✅ **Client & Lead Management**
- New lead capture notifications
- Lead status change alerts
- Lead conversion celebrations

✅ **Project Management**
- Upcoming deadline warnings (3-day lookahead)
- Project status updates

## How It Works

### Automated Checks
The system runs automated business checks every 5 minutes to monitor:
- Low inventory levels
- Overdue invoices
- Upcoming project deadlines
- Sales milestones

### Event-Based Notifications
Immediate notifications are triggered when:
- An invoice is created or paid
- A sale is completed
- A new lead is added
- A lead status changes
- Stock levels drop below threshold

### Notification Display
Notifications appear in multiple ways:
1. **Toast notifications** - Immediate pop-up alerts
2. **Notification drawer** - Accessible via bell icon in navbar
3. **Firestore storage** - Persistent notification history per tenant

## Implementation Details

### Core Files

**`src/lib/businessNotifications.js`**
- Central notification logic
- All business event handlers
- Automated check functions

**`src/components/BusinessNotificationsManager.jsx`**
- Background service component
- Runs periodic checks every 5 minutes
- Integrated into App.jsx

### Integration Points

The notification system is integrated into:
- **Till.jsx** - Sale notifications, low stock alerts
- **CRM/Invoices.jsx** - Invoice creation notifications
- **Leads.jsx** - Lead management notifications  
- **Dashboard.jsx** - Sales milestone tracking
- **Projects.jsx** - Project deadline monitoring
- **App.jsx** - BusinessNotificationsManager component

## Configuration

### Stock Alert Threshold
Default: 5 units
Location: `checkLowStockAlerts()` function
```javascript
checkLowStockAlerts(tenantId, notify, 5); // Change threshold here
```

### Project Deadline Lookahead
Default: 3 days
Location: `checkProjectDeadlines()` function
```javascript
checkProjectDeadlines(tenantId, notify, 3); // Change days here
```

### Check Interval
Default: 5 minutes
Location: `BusinessNotificationsManager.jsx`
```javascript
setInterval(() => {
  runBusinessChecks(activeTenantId, notify);
}, 5 * 60 * 1000); // Change interval here
```

### Sales Milestones
Milestones tracked:
- R10,000
- R50,000
- R100,000
- R250,000
- R500,000
- R1,000,000

Location: `checkSalesMilestones()` function in businessNotifications.js

## Usage Examples

### Manual Notification
```javascript
import { useNotify } from '../context/NotificationContext.jsx';
import { notifySaleCompleted } from '../lib/businessNotifications.js';

const notify = useNotify();
const { activeTenantId } = useTenant();

// Send a sale notification
await notifySaleCompleted(activeTenantId, notify, {
  id: saleId,
  total: 1500.00,
  paymentType: 'card'
});
```

### Running Business Checks
```javascript
import { runBusinessChecks } from '../lib/businessNotifications.js';

// Run all business checks at once
await runBusinessChecks(activeTenantId, notify);
```

### Specific Checks
```javascript
import { 
  checkLowStockAlerts,
  checkOverdueInvoices,
  checkProjectDeadlines,
  checkSalesMilestones 
} from '../lib/businessNotifications.js';

// Run individual checks
await checkLowStockAlerts(tenantId, notify, 5);
await checkOverdueInvoices(tenantId, notify);
await checkProjectDeadlines(tenantId, notify, 3);
await checkSalesMilestones(tenantId, notify);
```

## Notification Types

### Success Notifications (Green)
- Invoice created
- Payment received
- Sale completed
- Lead converted
- Milestone reached

### Warning Notifications (Yellow)
- Low stock alert
- Overdue invoices
- Upcoming deadlines

### Info Notifications (Blue)
- New lead captured
- Lead status updated
- General updates

## Data Structure

### Notification Object
```javascript
{
  id: "unique-id",
  title: "Notification Title",
  description: "Detailed message",
  type: "success" | "warning" | "info",
  category: "invoices" | "inventory" | "sales" | "leads" | "projects",
  data: { /* event-specific data */ },
  createdAt: Timestamp,
  read: false
}
```

## Best Practices

1. **Always include tenant context** - Notifications are tenant-scoped
2. **Use descriptive titles** - Help users quickly understand the alert
3. **Include actionable data** - Provide relevant details in the data object
4. **Don't spam** - Use session storage for one-time milestones
5. **Test notifications** - Verify all event handlers work correctly

## Testing Notifications

### Test Low Stock Alert
1. Go to Inventory
2. Reduce an item's quantity to 5 or below
3. Wait 5 minutes or refresh the page
4. Check notification drawer

### Test Invoice Notification
1. Go to CRM > Invoices
2. Create a new invoice
3. Generate PDF
4. Check notification drawer

### Test Sale Notification
1. Go to Till
2. Add items to cart
3. Complete sale
4. Check notification drawer

### Test Lead Notification
1. Go to CRM > Leads
2. Add a new lead
3. Change lead status
4. Check notification drawer

## Troubleshooting

**Notifications not appearing?**
- Check that BusinessNotificationsManager is in App.jsx
- Verify user is authenticated
- Check tenant context is active
- Open browser console for errors

**Duplicate notifications?**
- Notifications use session storage to prevent duplicates
- Clear browser storage if needed

**Missed notifications?**
- Check notification drawer (bell icon)
- Notifications persist in Firestore
- Adjust check interval if needed

## Future Enhancements

Potential additions:
- Email notifications
- SMS/WhatsApp alerts
- Slack/Teams integration
- Notification preferences per user
- Custom notification rules
- Notification scheduling
- Priority levels
- Notification categories filter

## Support

For issues or questions about the notification system:
1. Check browser console for errors
2. Review notification drawer for stored alerts
3. Verify Firestore permissions
4. Test with different tenant contexts
