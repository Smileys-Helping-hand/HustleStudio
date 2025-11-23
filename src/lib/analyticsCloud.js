import { addDoc, collection, getDocs, limit, orderBy, query, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';
import { tenantCollection } from './tenant.js';

export const fetchWarehouseSnapshots = async (tenantId) => {
  try {
    const ref = tenantCollection(tenantId, 'analyticsWarehouse');
    const snap = await getDocs(query(ref, orderBy('capturedAt', 'desc'), limit(12)));
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error('[AnalyticsCloud] Unable to load snapshots', error);
    return [];
  }
};

export const recordWarehouseSnapshot = async (tenantId, payload) => {
  const ref = tenantCollection(tenantId, 'analyticsWarehouse');
  const doc = {
    ...payload,
    capturedAt: serverTimestamp(),
  };
  await addDoc(ref, doc);
  return doc;
};

export const fetchGlobalWarehouseSummary = async () => {
  try {
    const snap = await getDocs(collection(db, 'analyticsWarehouseGlobal'));
    return snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.warn('[AnalyticsCloud] Falling back to synthetic summary', error);
    return [
      {
        id: 'benchmark',
        capturedAt: new Date().toISOString(),
        salesGrowth: 0.18,
        averageCreditUsage: 0.64,
        activeTenants: 42,
      },
    ];
  }
};

export const queueAnalyticsExport = async (tenantId) => {
  const ref = collection(db, 'analyticsExportQueue');
  await addDoc(ref, {
    tenantId: tenantId || 'global',
    requestedAt: serverTimestamp(),
    status: 'queued',
  });
};
