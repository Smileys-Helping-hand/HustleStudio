import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const getEnvValue = (key) => {
  const viteValue = import.meta.env?.[key];
  if (viteValue) {
    console.info(`[FirebaseInit] Loaded ${key} from Vite environment.`);
    return viteValue;
  }

  const nodeEnv =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process !== null &&
    typeof globalThis.process.env === 'object'
      ? globalThis.process.env
      : undefined;

  if (nodeEnv) {
    const serverKey = key.replace(/^VITE_/, '');
    if (nodeEnv[serverKey]) {
      console.info(`[FirebaseInit] Loaded ${serverKey} from process.env fallback.`);
    }
    return nodeEnv[serverKey] ?? '';
  }

  console.warn(`[FirebaseInit] Missing environment value for ${key}.`);
  return '';
};

const firebaseConfig = {
  apiKey: getEnvValue('VITE_FIREBASE_API_KEY'),
  authDomain: getEnvValue('VITE_FIREBASE_AUTH_DOMAIN'),
  projectId: getEnvValue('VITE_FIREBASE_PROJECT_ID'),
  storageBucket: getEnvValue('VITE_FIREBASE_STORAGE_BUCKET'),
  messagingSenderId: getEnvValue('VITE_FIREBASE_SENDER_ID'),
  appId: getEnvValue('VITE_FIREBASE_APP_ID'),
  measurementId: getEnvValue('VITE_FIREBASE_MEASUREMENT_ID'),
};

let app;
try {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  console.info('[FirebaseInit] Firebase app initialised.');
} catch (error) {
  console.error('[FirebaseInit] Failed to initialise Firebase.', error);
  throw error;
}

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
