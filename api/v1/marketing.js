import express from 'express';
import { addDoc, collection, getDocs, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { recordTelemetry } from '../../src/lib/telemetry.js';

const router = express.Router();

router.get('/campaigns', async (req, res) => {
  try {
    const campaignsRef = collection(req.firestore, `tenants/${req.tenantId}/marketingCampaigns`);
    const snapshot = await getDocs(query(campaignsRef, orderBy('createdAt', 'desc')));
    res.json({ data: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/campaigns', async (req, res) => {
  const payload = req.body || {};
  if (!payload.name) {
    res.status(400).json({ error: 'Campaign name is required' });
    return;
  }
  try {
    const campaignsRef = collection(req.firestore, `tenants/${req.tenantId}/marketingCampaigns`);
    const docRef = await addDoc(campaignsRef, {
      ...payload,
      createdAt: serverTimestamp(),
      status: payload.status || 'draft',
    });
    await recordTelemetry('api.marketing.campaign.created', req.tenantId, { name: payload.name });
    res.status(201).json({ id: docRef.id });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/performance', async (req, res) => {
  try {
    const performanceRef = collection(req.firestore, `tenants/${req.tenantId}/marketingPerformance`);
    const snapshot = await getDocs(performanceRef);
    res.json({ data: snapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })) });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
