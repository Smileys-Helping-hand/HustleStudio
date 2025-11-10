import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getEnvValue } from './env.js';

const firebaseConfig = {
  apiKey: getEnvValue('VITE_FIREBASE_API_KEY', ''),
  authDomain: getEnvValue('VITE_FIREBASE_AUTH_DOMAIN', ''),
  projectId: getEnvValue('VITE_FIREBASE_PROJECT_ID', ''),
  storageBucket: getEnvValue('VITE_FIREBASE_STORAGE_BUCKET', ''),
  messagingSenderId: getEnvValue('VITE_FIREBASE_SENDER_ID', ''),
  appId: getEnvValue('VITE_FIREBASE_APP_ID', ''),
  measurementId: getEnvValue('VITE_FIREBASE_MEASUREMENT_ID', ''),
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
export const storage = getStorage(app);
export { firebaseConfig };
export default app;
