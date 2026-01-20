/**
 * Customer Management Library
 * Auto-sorts and manages customers from document extractions
 */

import { collection, addDoc, updateDoc, doc, getDocs, query, where, orderBy, serverTimestamp, getDoc } from 'firebase/firestore';
import { db } from './firebase.js';

/**
 * Customer status types
 */
export const CUSTOMER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  PENDING: 'pending',
  ARCHIVED: 'archived',
};

/**
 * Customer source types
 */
export const CUSTOMER_SOURCE = {
  INVOICE: 'invoice',
  BANK_STATEMENT: 'bank_statement',
  MANUAL: 'manual',
  IMPORT: 'import',
};

/**
 * Extract customer information from document data
 */
const extractCustomerFromDocument = (documentData, documentType) => {
  const customer = {
    name: null,
    email: null,
    phone: null,
    address: null,
    company: null,
  };

  if (documentType === 'invoice' || documentType === 'receipt') {
    customer.name = documentData.customerName || documentData.vendorName;
    customer.email = documentData.customerEmail || documentData.vendorEmail;
    customer.phone = documentData.customerPhone || documentData.vendorPhone;
    customer.address = documentData.customerAddress || documentData.vendorAddress;
    customer.company = documentData.customerName || documentData.vendorName;
  } else if (documentType === 'bank_statement') {
    customer.name = documentData.accountHolder;
    customer.company = documentData.bankName;
  } else if (documentType === 'payslip') {
    customer.name = documentData.employeeName;
    customer.email = documentData.employeeEmail;
    customer.company = documentData.employerName;
  }

  return customer;
};

/**
 * Find existing customer by name or email
 */
const findExistingCustomer = async (tenantId, name, email) => {
  if (!name && !email) return null;

  try {
    let q;
    if (email) {
      q = query(
        collection(db, 'tenants', tenantId, 'customers'),
        where('email', '==', email)
      );
    } else if (name) {
      q = query(
        collection(db, 'tenants', tenantId, 'customers'),
        where('name', '==', name)
      );
    }

    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      const docSnap = snapshot.docs[0];
      return { id: docSnap.id, ...docSnap.data() };
    }
  } catch (error) {
    console.error('[CustomerManager] Error finding customer:', error);
  }

  return null;
};

/**
 * Auto-create or update customer from document extraction
 */
export const autoSortCustomerFromDocument = async ({ 
  tenantId, 
  userId, 
  documentData, 
  documentType,
  documentId 
}) => {
  if (!tenantId || !documentData) {
    throw new Error('tenantId and documentData are required');
  }

  const customerInfo = extractCustomerFromDocument(documentData, documentType);

  // Skip if no customer info extracted
  if (!customerInfo.name && !customerInfo.email) {
    console.log('[CustomerManager] No customer info found in document');
    return null;
  }

  try {
    // Check if customer already exists
    const existingCustomer = await findExistingCustomer(
      tenantId,
      customerInfo.name,
      customerInfo.email
    );

    if (existingCustomer) {
      // Update existing customer
      const customerRef = doc(db, 'tenants', tenantId, 'customers', existingCustomer.id);
      
      // Merge new data with existing
      const updates = {
        lastUpdated: serverTimestamp(),
        lastDocumentId: documentId,
        lastDocumentType: documentType,
        documentCount: (existingCustomer.documentCount || 0) + 1,
      };

      // Update fields only if they have new values
      if (customerInfo.email && !existingCustomer.email) updates.email = customerInfo.email;
      if (customerInfo.phone && !existingCustomer.phone) updates.phone = customerInfo.phone;
      if (customerInfo.address && !existingCustomer.address) updates.address = customerInfo.address;
      if (customerInfo.company && !existingCustomer.company) updates.company = customerInfo.company;

      await updateDoc(customerRef, updates);

      console.log('[CustomerManager] Updated existing customer:', existingCustomer.id);
      return { id: existingCustomer.id, ...existingCustomer, ...updates, updated: true };
    } else {
      // Create new customer
      const newCustomer = {
        ...customerInfo,
        tenantId,
        userId,
        status: CUSTOMER_STATUS.ACTIVE,
        source: CUSTOMER_SOURCE[documentType.toUpperCase()] || CUSTOMER_SOURCE.MANUAL,
        createdAt: serverTimestamp(),
        lastUpdated: serverTimestamp(),
        lastDocumentId: documentId,
        lastDocumentType: documentType,
        documentCount: 1,
        totalRevenue: 0,
        tags: [],
        notes: '',
      };

      const docRef = await addDoc(
        collection(db, 'tenants', tenantId, 'customers'),
        newCustomer
      );

      console.log('[CustomerManager] Created new customer:', docRef.id);
      return { id: docRef.id, ...newCustomer, created: true };
    }
  } catch (error) {
    console.error('[CustomerManager] Failed to auto-sort customer:', error);
    throw error;
  }
};

/**
 * Calculate customer metrics from their documents
 */
export const calculateCustomerMetrics = async (tenantId, customerId) => {
  try {
    // Get all document extractions for this customer
    const extractionsQuery = query(
      collection(db, 'documentExtractions'),
      where('tenantId', '==', tenantId)
    );

    const snapshot = await getDocs(extractionsQuery);
    const customerDocs = [];

    // Get customer info
    const customerDoc = await getDoc(doc(db, 'tenants', tenantId, 'customers', customerId));
    if (!customerDoc.exists()) return null;

    const customer = customerDoc.data();

    // Filter documents related to this customer
    snapshot.docs.forEach(docSnap => {
      const data = docSnap.data();
      const extractedData = data.extractedData || {};
      
      // Check if document mentions this customer
      if (
        extractedData.customerName === customer.name ||
        extractedData.vendorName === customer.name ||
        extractedData.accountHolder === customer.name ||
        extractedData.employeeName === customer.name
      ) {
        customerDocs.push({ id: docSnap.id, ...data });
      }
    });

    // Calculate metrics
    const metrics = {
      totalDocuments: customerDocs.length,
      totalInvoices: customerDocs.filter(d => d.documentType === 'invoice').length,
      totalReceipts: customerDocs.filter(d => d.documentType === 'receipt').length,
      totalRevenue: 0,
      lastActivityDate: null,
    };

    // Sum up revenue from invoices and receipts
    customerDocs.forEach(doc => {
      const data = doc.extractedData || {};
      if (data.total) {
        metrics.totalRevenue += parseFloat(data.total) || 0;
      }
      
      // Track last activity
      if (doc.extractedAt) {
        const activityDate = doc.extractedAt.toDate ? doc.extractedAt.toDate() : new Date(doc.extractedAt);
        if (!metrics.lastActivityDate || activityDate > metrics.lastActivityDate) {
          metrics.lastActivityDate = activityDate;
        }
      }
    });

    // Update customer with calculated metrics
    const customerRef = doc(db, 'tenants', tenantId, 'customers', customerId);
    await updateDoc(customerRef, {
      totalRevenue: metrics.totalRevenue,
      documentCount: metrics.totalDocuments,
      lastActivity: metrics.lastActivityDate ? serverTimestamp() : null,
      metricsUpdatedAt: serverTimestamp(),
    });

    return metrics;
  } catch (error) {
    console.error('[CustomerManager] Failed to calculate metrics:', error);
    throw error;
  }
};

/**
 * Get all customers with sorting and filtering
 */
export const listCustomers = async ({ 
  tenantId, 
  status = null, 
  sortBy = 'lastUpdated', 
  sortOrder = 'desc',
  limit = 100 
}) => {
  try {
    let q = collection(db, 'tenants', tenantId, 'customers');

    // Apply filters
    if (status) {
      q = query(q, where('status', '==', status));
    }

    // Apply sorting
    const orderByField = sortBy || 'lastUpdated';
    const orderDirection = sortOrder || 'desc';
    q = query(q, orderBy(orderByField, orderDirection));

    const snapshot = await getDocs(q);
    const customers = snapshot.docs.map(docSnap => ({
      id: docSnap.id,
      ...docSnap.data(),
    }));

    // Sort by additional criteria if needed
    if (sortBy === 'totalRevenue') {
      customers.sort((a, b) => {
        const aRev = parseFloat(a.totalRevenue) || 0;
        const bRev = parseFloat(b.totalRevenue) || 0;
        return sortOrder === 'desc' ? bRev - aRev : aRev - bRev;
      });
    } else if (sortBy === 'documentCount') {
      customers.sort((a, b) => {
        const aCount = parseInt(a.documentCount) || 0;
        const bCount = parseInt(b.documentCount) || 0;
        return sortOrder === 'desc' ? bCount - aCount : aCount - bCount;
      });
    }

    return customers.slice(0, limit);
  } catch (error) {
    console.error('[CustomerManager] Failed to list customers:', error);
    throw error;
  }
};

/**
 * Update customer status
 */
export const updateCustomerStatus = async (tenantId, customerId, status) => {
  try {
    const customerRef = doc(db, 'tenants', tenantId, 'customers', customerId);
    await updateDoc(customerRef, {
      status,
      lastUpdated: serverTimestamp(),
    });

    console.log('[CustomerManager] Updated customer status:', customerId, status);
  } catch (error) {
    console.error('[CustomerManager] Failed to update status:', error);
    throw error;
  }
};

/**
 * Add tags to customer
 */
export const addCustomerTags = async (tenantId, customerId, tags) => {
  try {
    const customerRef = doc(db, 'tenants', tenantId, 'customers', customerId);
    const customerDoc = await getDoc(customerRef);
    
    if (customerDoc.exists()) {
      const existingTags = customerDoc.data().tags || [];
      const newTags = [...new Set([...existingTags, ...tags])];
      
      await updateDoc(customerRef, {
        tags: newTags,
        lastUpdated: serverTimestamp(),
      });
    }

    console.log('[CustomerManager] Added tags to customer:', customerId);
  } catch (error) {
    console.error('[CustomerManager] Failed to add tags:', error);
    throw error;
  }
};

/**
 * Export customers to CSV
 */
export const exportCustomersCSV = (customers) => {
  const headers = ['Name', 'Email', 'Phone', 'Company', 'Status', 'Total Revenue', 'Documents', 'Source', 'Created'];
  
  const rows = customers.map(customer => [
    customer.name || '',
    customer.email || '',
    customer.phone || '',
    customer.company || '',
    customer.status || '',
    customer.totalRevenue || '0',
    customer.documentCount || '0',
    customer.source || '',
    customer.createdAt?.toDate?.()?.toLocaleDateString() || '',
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n');

  return csvContent;
};
