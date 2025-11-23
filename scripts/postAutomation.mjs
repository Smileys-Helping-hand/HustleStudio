import 'dotenv/config';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, query, where, updateDoc, doc } from 'firebase/firestore';
import fetch from 'node-fetch';

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
};

if (!config.apiKey) {
  console.error('[postAutomation] Missing Firebase configuration.');
  process.exit(1);
}

const app = initializeApp(config);
const db = getFirestore(app);

const run = async () => {
  const now = new Date();
  const tenantsSnapshot = await getDocs(collection(db, 'tenants'));
  for (const tenantDoc of tenantsSnapshot.docs) {
    const tenantId = tenantDoc.id;
    const schedulesQuery = query(
      collection(db, 'tenants', tenantId, 'marketingSchedules'),
      where('status', '==', 'scheduled')
    );
    const schedules = await getDocs(schedulesQuery);
    for (const schedule of schedules.docs) {
      const data = schedule.data();
      const scheduledTime = data.start?.toDate ? data.start.toDate() : new Date(data.start);
      if (!scheduledTime || scheduledTime > now) continue;
      try {
        const endpoint = process.env.VITE_PAYMENTS_ENDPOINT;
        if (!endpoint) throw new Error('Missing automation endpoint.');
        await fetch(`${endpoint}/social/post`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tenantId, ...data }),
        });
        await updateDoc(doc(db, 'tenants', tenantId, 'marketingSchedules', schedule.id), { status: 'published' });
        console.log(`[postAutomation] Published ${data.title} for ${tenantId}`);
      } catch (error) {
        console.error('[postAutomation] Failed to post', error.message);
      }
    }
  }
};

run().catch((error) => {
  console.error('[postAutomation] fatal', error);
  process.exit(1);
});
