import { getApps, initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const readEnv = (key) => {
  const globalEnv =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process?.env
      ? globalThis.process.env
      : undefined;
  if (globalEnv && globalEnv[key]) {
    return globalEnv[key];
  }
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  return undefined;
};

const firebaseConfig = {
  apiKey: readEnv('VITE_FIREBASE_API_KEY'),
  authDomain: readEnv('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: readEnv('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: readEnv('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: readEnv('VITE_FIREBASE_SENDER_ID'),
  appId: readEnv('VITE_FIREBASE_APP_ID'),
};

let cachedApp;

export const getServerApp = () => {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  if (existing.length) {
    cachedApp = existing[0];
    return cachedApp;
  }
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    throw new Error('Server Firebase configuration is incomplete.');
  }
  cachedApp = initializeApp(firebaseConfig);
  return cachedApp;
};

export const getServerFirestore = () => getFirestore(getServerApp());
