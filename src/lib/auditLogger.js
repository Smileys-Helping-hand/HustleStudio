import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

export const logEvent = async (tenantId, userId, action, metadata = {}) => {
  try {
    const targetCollection = tenantId
      ? collection(db, 'tenants', tenantId, 'auditLogs')
      : collection(db, 'auditLogs');
    await addDoc(targetCollection, {
      tenantId: tenantId ?? null,
      userId: userId ?? null,
      action,
      metadata,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.warn('[Audit] Unable to record audit event.', error);
  }
};
