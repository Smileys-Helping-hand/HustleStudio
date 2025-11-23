import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase.js';

const isEnabled = () => {
  const viteFlag = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GLOBAL_INSIGHTS_ENABLED : undefined;
  const nodeEnv =
    typeof process !== 'undefined' && process.env
      ? process.env.VITE_GLOBAL_INSIGHTS_ENABLED ?? process.env.GLOBAL_INSIGHTS_ENABLED
      : undefined;
  const value = viteFlag ?? nodeEnv;
  if (value === undefined || value === null || value === '') {
    return true;
  }
  const normalized = String(value).toLowerCase();
  return !(normalized === 'false' || normalized === '0' || normalized === 'off');
};

const collectionName = () => {
  const viteName = typeof import.meta !== 'undefined' ? import.meta.env?.VITE_GLOBAL_INSIGHTS_COLLECTION : undefined;
  const nodeEnv = typeof process !== 'undefined' ? process.env?.VITE_GLOBAL_INSIGHTS_COLLECTION ?? process.env?.GLOBAL_INSIGHTS_COLLECTION : undefined;
  return (viteName || nodeEnv || 'global_insights').trim();
};

export async function recordGlobalEvent(type, data = {}) {
  if (!isEnabled()) {
    return null;
  }
  if (!type) {
    return null;
  }

  try {
    const payload = {
      type,
      payload: JSON.stringify(data ?? {}),
      createdAt: serverTimestamp(),
    };
    return await addDoc(collection(db, collectionName()), payload);
  } catch (error) {
    console.warn('[GlobalInsights] Failed to record event.', error);
    return null;
  }
}
