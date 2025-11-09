#!/usr/bin/env node
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const firebaseConfig = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.VITE_FIREBASE_SENDER_ID,
  appId: process.env.VITE_FIREBASE_APP_ID,
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const reportsDir = path.resolve('reports');
if (!fs.existsSync(reportsDir)) {
  fs.mkdirSync(reportsDir);
}

async function generate() {
  const salesSnapshot = await getDocs(collection(db, 'sales'));
  const report = {
    generatedAt: new Date().toISOString(),
    totals: salesSnapshot.docs.reduce(
      (acc, docSnap) => {
        const total = docSnap.data().totals?.total ?? 0;
        acc.revenue += total;
        acc.transactions += 1;
        return acc;
      },
      { revenue: 0, transactions: 0 }
    ),
    sales: salesSnapshot.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })),
  };

  fs.writeFileSync(path.join(reportsDir, `auto-report-${Date.now()}.json`), JSON.stringify(report, null, 2));
  console.log('✅ Generated aggregated sales report.');
}

generate().catch((error) => {
  console.error('❌ Failed to generate reports', error);
  process.exit(1);
});
