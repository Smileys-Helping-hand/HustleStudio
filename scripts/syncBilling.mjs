import { getApps, initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import dotenv from 'dotenv';
import { planLookup } from '../src/config/plans.js';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

if (!firebaseConfig.projectId) {
  console.error('[syncBilling] Missing Firebase credentials.');
  process.exit(1);
}

const defaultPlan = process.env.VITE_TENANT_PLAN_DEFAULT || 'starter';
const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig);
const db = getFirestore(app);

const run = async () => {
  const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
  console.log(`[syncBilling] Found ${tenantsSnapshot.size} tenants.`);
  for (const tenant of tenantsSnapshot.docs) {
    const tenantId = tenant.id;
    const subscriptionRef = doc(db, 'tenants', tenantId, 'billing', 'subscription');
    const desiredPlan = tenant.data().planId && planLookup[tenant.data().planId] ? tenant.data().planId : defaultPlan;
    await setDoc(
      subscriptionRef,
      {
        planId: desiredPlan,
        limits: planLookup[desiredPlan]?.limits ?? planLookup[defaultPlan].limits,
        syncedAt: new Date().toISOString(),
      },
      { merge: true }
    );
    console.log(`[syncBilling] Synced ${tenantId} -> ${desiredPlan}.`);
  }
};

run()
  .then(() => {
    console.log('[syncBilling] Complete.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('[syncBilling] Failed', error);
    process.exit(1);
  });
