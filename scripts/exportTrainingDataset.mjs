import fs from 'fs';
import { initializeApp } from 'firebase/app';
import { collection, getDocs, getFirestore } from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase.js';

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const exportDataset = async () => {
  const snapshot = await getDocs(collection(firestore, 'ai_audit_logs'));
  const dataset = snapshot.docs.map((docSnapshot) => {
    const data = docSnapshot.data();
    return {
      prompt: data.prompt ?? '',
      response: data.response ?? '',
      score: Number(data?.overall ?? 0),
      assistant: data.assistant ?? null,
      tenantId: data.tenantId ?? null,
    };
  });

  fs.writeFileSync('training-dataset.json', JSON.stringify(dataset, null, 2));
  console.log(`✅ Training dataset exported → training-dataset.json (${dataset.length} entries)`);
};

exportDataset()
  .catch((error) => {
    console.error('[Dataset Export] Failed to export training dataset.', error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (typeof process !== 'undefined' && process.exit) {
      process.exit();
    }
  });
