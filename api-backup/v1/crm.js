import express from 'express';
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { recordTelemetry } from '../../src/lib/telemetry.js';

const router = express.Router();

router.get('/leads', async (req, res) => {
  try {
    const leadsRef = collection(req.firestore, `tenants/${req.tenantId}/leads`);
    const snapshot = await getDocs(query(leadsRef, orderBy('createdAt', 'desc')));
    const leads = snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() }));
    await recordTelemetry('api.crm.leads.list', req.tenantId, { count: leads.length });
    res.json({ data: leads });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/leads', async (req, res) => {
  const payload = req.body || {};
  if (!payload.email) {
    res.status(400).json({ error: 'Lead email is required' });
    return;
  }
  try {
    const leadsRef = collection(req.firestore, `tenants/${req.tenantId}/leads`);
    const docRef = await addDoc(leadsRef, {
      ...payload,
      createdAt: serverTimestamp(),
      status: payload.status || 'new',
    });
    await recordTelemetry('api.crm.leads.created', req.tenantId, { email: payload.email });
    res.status(201).json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/clients', async (req, res) => {
  try {
    const clientsRef = collection(req.firestore, `tenants/${req.tenantId}/clients`);
    const snapshot = await getDocs(clientsRef);
    res.json({ data: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
