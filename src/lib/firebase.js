import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import { getFirestore, enableIndexedDbPersistence } from 'firebase/firestore';
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
let db;
try {
  app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
  console.info('[FirebaseInit] Firebase app initialised.');

  db = getFirestore(app);

  // Enable offline persistence
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn('[FirebaseInit] Multiple tabs open, persistence disabled');
    } else if (err.code === 'unimplemented') {
      console.warn('[FirebaseInit] Persistence not supported in this browser');
    }
  });
} catch (error) {
  console.error('[FirebaseInit] Failed to initialise Firebase.', error);
  throw error;
}

export const auth = getAuth(app);
export const storage = getStorage(app);
export { db };

export { firebaseConfig };
export default app;
