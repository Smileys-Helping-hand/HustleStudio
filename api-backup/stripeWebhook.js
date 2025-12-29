import Stripe from 'stripe';
import { buffer } from 'node:stream/consumers';
import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc, collection, addDoc, serverTimestamp } from 'firebase/firestore';

const stripeSecret = process.env.VITE_STRIPE_SECRET_KEY || process.env.STRIPE_SECRET_KEY || '';
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

if (!stripeSecret) {
  console.warn('[stripeWebhook] Stripe secret key missing. Events will be ignored.');
}

const stripe = stripeSecret ? new Stripe(stripeSecret, { apiVersion: '2024-09-30.acacia' }) : null;

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const persistInvoice = async (tenantId, invoice) => {
  if (!tenantId) return;
  const ref = doc(db, 'tenants', tenantId, 'billing', 'subscription');
  await setDoc(ref, { planId: invoice.planId ?? 'starter', updatedAt: serverTimestamp(), status: invoice.status }, { merge: true });
  await addDoc(collection(db, 'tenants', tenantId, 'billing', 'invoices'), {
    ...invoice,
    createdAt: serverTimestamp(),
  });
};

export default async function handler(request, response) {
  if (request.method !== 'POST') {
    response.setHeader('Allow', 'POST');
    response.status(405).end('Method Not Allowed');
    return;
  }
  if (!stripe || !webhookSecret) {
    response.status(200).json({ skipped: true });
    return;
  }
  let event;
  try {
    const rawBody = await buffer(request);
    const signature = request.headers['stripe-signature'];
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (error) {
    console.error('[stripeWebhook] Invalid signature', error);
    response.status(400).send(`Webhook Error: ${error.message}`);
    return;
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const tenantId = session.metadata?.tenantId;
        await persistInvoice(tenantId, {
          id: session.id,
          total: session.amount_total / 100,
          status: session.payment_status,
          planId: session.metadata?.planId,
          downloadUrl: session.invoice_pdf,
        });
        break;
      }
      case 'invoice.paid': {
        const invoice = event.data.object;
        const tenantId = invoice.metadata?.tenantId;
        await persistInvoice(tenantId, {
          id: invoice.id,
          total: invoice.amount_paid / 100,
          status: invoice.status,
          planId: invoice.lines?.data?.[0]?.price?.nickname ?? 'starter',
          downloadUrl: invoice.hosted_invoice_url,
        });
        break;
      }
      default:
        console.log('[stripeWebhook] Unhandled event', event.type);
    }
  } catch (error) {
    console.error('[stripeWebhook] Handler failed', error);
    response.status(500).json({ error: error.message });
    return;
  }

  response.status(200).json({ received: true });
}
