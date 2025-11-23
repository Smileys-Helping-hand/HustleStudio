import { loadStripe } from '@stripe/stripe-js';
import { getDoc, collection, getDocs, query, orderBy, setDoc, serverTimestamp } from 'firebase/firestore';
import { tenantCollection, tenantDoc } from './tenant.js';
import { db } from './firebase.js';
import { encryptField, decryptField } from './encryption.js';

let stripePromise;
const resolveEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process !== null &&
    typeof globalThis.process.env === 'object' &&
    globalThis.process.env[key]
  ) {
    return globalThis.process.env[key];
  }
  return '';
};

const getStripe = () => {
  if (!stripePromise) {
    const publishableKey = resolveEnv('VITE_STRIPE_PUBLISHABLE_KEY');
    if (!publishableKey) {
      console.warn('[Billing] Stripe publishable key missing. Checkout disabled.');
      return null;
    }
    stripePromise = loadStripe(publishableKey);
  }
  return stripePromise;
};

const paymentsEndpoint = resolveEnv('VITE_PAYMENTS_ENDPOINT') || 'https://api.hustlestudio.co.za';

export const createCheckoutSession = async (planId, tenantId, userId) => {
  const stripe = await getStripe();
  if (!stripe) throw new Error('Stripe is not configured.');
  const response = await fetch(`${paymentsEndpoint}/checkout`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ planId, tenantId, userId }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unable to create checkout session.');
  }
  const session = await response.json();
  if (!session?.id) throw new Error('Invalid checkout session response.');
  await stripe.redirectToCheckout({ sessionId: session.id });
};

export const openBillingPortal = async (tenantId) => {
  const response = await fetch(`${paymentsEndpoint}/portal`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'Unable to open billing portal.');
  }
  const payload = await response.json();
  if (payload?.url) {
    window.location.href = payload.url;
  }
};

export const fetchSubscription = async (tenantId) => {
  if (!tenantId) return null;
  const subscriptionDoc = await getDoc(tenantDoc(tenantId, 'billing', 'subscription'));
  if (!subscriptionDoc.exists()) return null;
  const data = subscriptionDoc.data();
  if (data.paymentMethodToken) {
    data.paymentMethodToken = decryptField(data.paymentMethodToken);
  }
  if (data.portalUrl) {
    data.portalUrl = decryptField(data.portalUrl);
  }
  return data;
};

export const fetchInvoices = async (tenantId) => {
  if (!tenantId) return [];
  const invoiceQuery = query(collection(db, 'tenants', tenantId, 'billing', 'invoices'), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(invoiceQuery);
  return snapshot.docs.map((docSnapshot) => {
    const payload = docSnapshot.data();
    if (payload.downloadUrlEncrypted && !payload.downloadUrl) {
      payload.downloadUrl = decryptField(payload.downloadUrlEncrypted);
    }
    return { id: docSnapshot.id, ...payload };
  });
};

export const loadUsageStats = async (tenantId) => {
  if (!tenantId) return { users: 0, items: 0 };
  const [users, items] = await Promise.all([
    getDocs(tenantCollection(tenantId, 'users')),
    getDocs(tenantCollection(tenantId, 'inventory')),
  ]);
  return { users: users.size, items: items.size };
};

const parseBoolean = (value) => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
  }
  return false;
};

export const autoTopUpIfNeeded = async (tenantId, usageRatio) => {
  const enabledEnv = resolveEnv('VITE_AUTOTOPUP_ENABLED') || 'false';
  if (!parseBoolean(enabledEnv)) return false;

  const thresholdEnv = resolveEnv('VITE_AUTOTOPUP_THRESHOLD') || '0.8';
  const threshold = Number(thresholdEnv);
  if (!tenantId || Number.isNaN(threshold)) return false;

  if (usageRatio < threshold) {
    return false;
  }

  const response = await fetch(`${paymentsEndpoint}/auto-topup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ tenantId }),
  });

  if (!response.ok) {
    console.warn('[Billing] Auto top-up request failed', await response.text());
    return false;
  }

  try {
    const payload = await response.json();
    if (payload?.token) {
      const encrypted = encryptField(payload.token);
      if (encrypted) {
        await setDoc(
          tenantDoc(tenantId, 'billing', 'secrets'),
          { autoTopUpToken: encrypted, updatedAt: serverTimestamp() },
          { merge: true }
        );
      }
    }
  } catch (error) {
    console.warn('[Billing] Unable to store auto-top up token', error.message);
  }

  return true;
};
