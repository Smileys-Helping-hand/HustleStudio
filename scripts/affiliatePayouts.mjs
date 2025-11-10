import { getApps, initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore, serverTimestamp, setDoc, doc } from 'firebase/firestore';

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

if (!config.apiKey || !config.projectId) {
  console.error('[affiliatePayouts] Missing Firebase credentials.');
  process.exit(1);
}

const app = getApps().length ? getApps()[0] : initializeApp(config);
const db = getFirestore(app);

async function run() {
  const snapshot = await getDocs(collection(db, 'referrals'));
  let processed = 0;
  await Promise.all(
    snapshot.docs
      .filter((docSnapshot) => docSnapshot.data().status === 'pending')
      .map(async (docSnapshot) => {
        await setDoc(
          doc(db, 'referrals', docSnapshot.id),
          {
            status: 'queued',
            queuedAt: serverTimestamp(),
          },
          { merge: true }
        );
        processed += 1;
      })
  );
  console.log(`[affiliatePayouts] Queued ${processed} referrals for payout.`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[affiliatePayouts] Failed to prepare payouts', error);
    process.exit(1);
  });
