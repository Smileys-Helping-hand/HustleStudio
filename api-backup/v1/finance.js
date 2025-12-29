import express from 'express';
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { recordTelemetry } from '../../src/lib/telemetry.js';

const router = express.Router();

router.get('/invoices', async (req, res) => {
  try {
    const invoicesRef = collection(req.firestore, `tenants/${req.tenantId}/billing/invoices`);
    const snapshot = await getDocs(query(invoicesRef, orderBy('createdAt', 'desc')));
    res.json({ data: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/invoices', async (req, res) => {
  const payload = req.body || {};
  if (!payload.customer || !payload.amount) {
    res.status(400).json({ error: 'Invoice requires customer and amount' });
    return;
  }
  try {
    const invoicesRef = collection(req.firestore, `tenants/${req.tenantId}/billing/invoices`);
    const docRef = await addDoc(invoicesRef, {
      ...payload,
      createdAt: serverTimestamp(),
      status: payload.status || 'pending',
    });
    await recordTelemetry('api.finance.invoice.created', req.tenantId, { amount: payload.amount });
    res.status(201).json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/transactions', async (req, res) => {
  try {
    const txRef = collection(req.firestore, `tenants/${req.tenantId}/finance/transactions`);
    const snapshot = await getDocs(query(txRef, orderBy('createdAt', 'desc')));
    res.json({ data: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
