// Business Workflow Notification System
// Handles automated notifications for all business operations

import { addDoc, query, where, getDocs, serverTimestamp, Timestamp } from 'firebase/firestore';
import { tenantCollection } from './tenant.js';

/**
 * Send notification for a business event
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 * @param {Object} notification - Notification payload
 */
export const sendBusinessNotification = async (tenantId, notify, notification) => {
  if (!tenantId || !notify) return;

  try {
    // Store notification in Firestore
    await addDoc(tenantCollection(tenantId, 'notifications'), {
      ...notification,
      createdAt: serverTimestamp(),
      read: false,
    });

    // Show in-app notification
    notify({
      title: notification.title,
      description: notification.description,
      type: notification.type || 'info',
    });
  } catch (error) {
    console.error('[BusinessNotifications] Failed to send notification:', error);
  }
};

/**
 * Check for low stock items and send alerts
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 * @param {number} threshold - Stock threshold (default: 5)
 */
export const checkLowStockAlerts = async (tenantId, notify, threshold = 5) => {
  if (!tenantId) return;

  try {
    const inventorySnapshot = await getDocs(tenantCollection(tenantId, 'inventory'));
    const lowStockItems = [];

    inventorySnapshot.forEach((doc) => {
      const item = doc.data();
      const quantity = Number(item.quantity || 0);
      if (!item.archived && quantity > 0 && quantity <= threshold) {
        lowStockItems.push({
          id: doc.id,
          name: item.name,
          sku: item.sku,
          quantity,
        });
      }
    });

    if (lowStockItems.length > 0) {
      await sendBusinessNotification(tenantId, notify, {
        title: `⚠️ Low Stock Alert`,
        description: `${lowStockItems.length} item(s) are running low. Restock needed.`,
        type: 'warning',
        category: 'inventory',
        data: { items: lowStockItems },
      });
    }
  } catch (error) {
    console.error('[BusinessNotifications] Low stock check failed:', error);
  }
};

/**
 * Check for overdue invoices and send reminders
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 */
export const checkOverdueInvoices = async (tenantId, notify) => {
  if (!tenantId) return;

  try {
    const now = new Date();
    const invoicesSnapshot = await getDocs(tenantCollection(tenantId, 'invoices'));
    const overdueInvoices = [];

    invoicesSnapshot.forEach((doc) => {
      const invoice = doc.data();
      const dueDate = invoice.dueDate ? (invoice.dueDate.toDate ? invoice.dueDate.toDate() : new Date(invoice.dueDate)) : null;
      
      if (
        dueDate &&
        dueDate < now &&
        (invoice.status === 'pending' || invoice.status === 'sent' || invoice.status === 'draft')
      ) {
        overdueInvoices.push({
          id: doc.id,
          invoiceNumber: invoice.invoiceNumber,
          clientName: invoice.clientName,
          total: invoice.total,
          dueDate: dueDate,
        });
      }
    });

    if (overdueInvoices.length > 0) {
      const totalOverdue = overdueInvoices.reduce((sum, inv) => sum + (inv.total || 0), 0);
      await sendBusinessNotification(tenantId, notify, {
        title: `💳 Payment Reminders`,
        description: `${overdueInvoices.length} invoice(s) overdue. Total: R${totalOverdue.toFixed(2)}`,
        type: 'warning',
        category: 'invoices',
        data: { invoices: overdueInvoices },
      });
    }
  } catch (error) {
    console.error('[BusinessNotifications] Overdue invoice check failed:', error);
  }
};

/**
 * Send notification when invoice is created
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 * @param {Object} invoice - Invoice data
 */
export const notifyInvoiceCreated = async (tenantId, notify, invoice) => {
  await sendBusinessNotification(tenantId, notify, {
    title: '✅ Invoice Created',
    description: `Invoice ${invoice.invoiceNumber} for ${invoice.clientName} (R${invoice.total.toFixed(2)})`,
    type: 'success',
    category: 'invoices',
    data: { invoiceId: invoice.id },
  });
};

/**
 * Send notification when invoice is paid
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 * @param {Object} invoice - Invoice data
 */
export const notifyInvoicePaid = async (tenantId, notify, invoice) => {
  await sendBusinessNotification(tenantId, notify, {
    title: '💰 Payment Received',
    description: `Invoice ${invoice.invoiceNumber} paid: R${invoice.total.toFixed(2)}`,
    type: 'success',
    category: 'payments',
    data: { invoiceId: invoice.id },
  });
};

/**
 * Check for upcoming project deadlines
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 * @param {number} daysAhead - Days to look ahead (default: 3)
 */
export const checkProjectDeadlines = async (tenantId, notify, daysAhead = 3) => {
  if (!tenantId) return;

  try {
    const projectsSnapshot = await getDocs(
      query(
        tenantCollection(tenantId, 'projects'),
        where('status', 'in', ['active', 'in-progress'])
      )
    );

    const now = new Date();
    const futureDate = new Date(now.getTime() + daysAhead * 24 * 60 * 60 * 1000);
    const upcomingProjects = [];

    projectsSnapshot.forEach((doc) => {
      const project = doc.data();
      const deadline = project.deadline ? (project.deadline.toDate ? project.deadline.toDate() : new Date(project.deadline)) : null;
      
      if (deadline && deadline >= now && deadline <= futureDate) {
        upcomingProjects.push({
          id: doc.id,
          name: project.name,
          deadline: deadline,
        });
      }
    });

    if (upcomingProjects.length > 0) {
      await sendBusinessNotification(tenantId, notify, {
        title: '⏰ Project Deadlines Approaching',
        description: `${upcomingProjects.length} project(s) due within ${daysAhead} days`,
        type: 'warning',
        category: 'projects',
        data: { projects: upcomingProjects },
      });
    }
  } catch (error) {
    console.error('[BusinessNotifications] Project deadline check failed:', error);
  }
};

/**
 * Send notification for new client added
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 * @param {Object} client - Client data
 */
export const notifyNewClient = async (tenantId, notify, client) => {
  await sendBusinessNotification(tenantId, notify, {
    title: '👤 New Client Added',
    description: `${client.name || client.email} added to your client list`,
    type: 'success',
    category: 'clients',
    data: { clientId: client.id },
  });
};

/**
 * Send notification when sale is completed
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 * @param {Object} sale - Sale data
 */
export const notifySaleCompleted = async (tenantId, notify, sale) => {
  await sendBusinessNotification(tenantId, notify, {
    title: '💵 Sale Completed',
    description: `R${sale.total.toFixed(2)} via ${sale.paymentType}`,
    type: 'success',
    category: 'sales',
    data: { saleId: sale.id },
  });
};

/**
 * Check for sales milestones
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 */
export const checkSalesMilestones = async (tenantId, notify) => {
  if (!tenantId) return;

  try {
    // Get sales from last 30 days
    const thirtyDaysAgo = Timestamp.fromDate(new Date(Date.now() - 30 * 24 * 60 * 60 * 1000));
    const salesSnapshot = await getDocs(
      query(
        tenantCollection(tenantId, 'sales'),
        where('createdAt', '>=', thirtyDaysAgo)
      )
    );

    let totalRevenue = 0;
    salesSnapshot.forEach((doc) => {
      const sale = doc.data();
      totalRevenue += sale.totals?.total || sale.total || 0;
    });

    // Check milestones
    const milestones = [
      { amount: 10000, label: 'R10,000' },
      { amount: 50000, label: 'R50,000' },
      { amount: 100000, label: 'R100,000' },
      { amount: 250000, label: 'R250,000' },
      { amount: 500000, label: 'R500,000' },
      { amount: 1000000, label: 'R1,000,000' },
    ];

    for (const milestone of milestones) {
      if (totalRevenue >= milestone.amount) {
        const key = `milestone_${milestone.amount}_${Math.floor(Date.now() / (30 * 24 * 60 * 60 * 1000))}`;
        
        // Check if already notified this month
        if (typeof window !== 'undefined' && !window.sessionStorage.getItem(key)) {
          await sendBusinessNotification(tenantId, notify, {
            title: '🎉 Sales Milestone Reached!',
            description: `Congratulations! You've reached ${milestone.label} in revenue this month.`,
            type: 'success',
            category: 'milestones',
            data: { milestone: milestone.amount, totalRevenue },
          });
          window.sessionStorage.setItem(key, 'true');
          break; // Only notify for the highest milestone reached
        }
      }
    }
  } catch (error) {
    console.error('[BusinessNotifications] Sales milestone check failed:', error);
  }
};

/**
 * Send notification for new lead
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 * @param {Object} lead - Lead data
 */
export const notifyNewLead = async (tenantId, notify, lead) => {
  await sendBusinessNotification(tenantId, notify, {
    title: '📧 New Lead Captured',
    description: `${lead.name} (${lead.email}) - Status: ${lead.status}`,
    type: 'info',
    category: 'leads',
    data: { leadId: lead.id },
  });
};

/**
 * Send notification when lead status changes
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 * @param {Object} lead - Lead data
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 */
export const notifyLeadStatusChange = async (tenantId, notify, lead, oldStatus, newStatus) => {
  if (newStatus === 'Won') {
    await sendBusinessNotification(tenantId, notify, {
      title: '🎯 Lead Converted!',
      description: `${lead.name} converted to client`,
      type: 'success',
      category: 'leads',
      data: { leadId: lead.id },
    });
  } else {
    await sendBusinessNotification(tenantId, notify, {
      title: '📊 Lead Status Updated',
      description: `${lead.name}: ${oldStatus} → ${newStatus}`,
      type: 'info',
      category: 'leads',
      data: { leadId: lead.id },
    });
  }
};

/**
 * Run all periodic business checks
 * @param {string} tenantId - The tenant ID
 * @param {Function} notify - The notification hook function
 */
export const runBusinessChecks = async (tenantId, notify) => {
  if (!tenantId || !notify) return;

  try {
    await Promise.allSettled([
      checkLowStockAlerts(tenantId, notify),
      checkOverdueInvoices(tenantId, notify),
      checkProjectDeadlines(tenantId, notify),
      checkSalesMilestones(tenantId, notify),
    ]);
  } catch (error) {
    console.error('[BusinessNotifications] Business checks failed:', error);
  }
};
