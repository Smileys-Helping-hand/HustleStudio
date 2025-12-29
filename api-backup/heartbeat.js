import fetch from 'node-fetch';
import { getApps, initializeApp } from 'firebase/app';
import {
  addDoc,
  collection,
  doc,
  getFirestore,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!config.apiKey || !config.projectId) {
  console.error('[heartbeat] Missing Firebase credentials.');
  process.exit(1);
}

const app = getApps().length ? getApps()[0] : initializeApp(config);
const db = getFirestore(app);

const target = process.env.HEARTBEAT_TARGET ?? 'https://hustlestudio.co.za';

const ping = async () => {
  let status = 'ok';
  let siteResponse = null;
  let responseTimeMs = null;

  try {
    const start = Date.now();
    const response = await fetch(target, { method: 'HEAD', redirect: 'follow' });
    responseTimeMs = Date.now() - start;
    siteResponse = response.status;
    if (!response.ok) {
      status = 'degraded';
    }
  } catch (error) {
    status = 'error';
    siteResponse = error.message;
  }

  const timestamp = serverTimestamp();
  const basePayload = {
    status,
    siteResponse,
    responseTimeMs,
    target,
    lastPing: timestamp,
    updatedAt: timestamp,
  };

  await setDoc(doc(db, 'system', 'heartbeat'), basePayload, { merge: true });
  await addDoc(collection(db, 'system/heartbeats/log'), {
    ...basePayload,
    createdAt: serverTimestamp(),
  });

  console.log('[heartbeat] Recorded heartbeat with status:', status);
};

ping()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[heartbeat] Failed to log heartbeat.', error);
    process.exit(1);
  });
