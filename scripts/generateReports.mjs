#!/usr/bin/env node
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { generateDailySummary } from '../src/lib/reportGenerator.js';

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

const tenantId =
  process.env.TENANT_ID ||
  process.env.VITE_DEFAULT_TENANT_ID ||
  process.env.VITE_TENANT_ID ||
  null;

async function generate() {
  const report = await generateDailySummary(tenantId);
  fs.writeFileSync(path.join(reportsDir, `auto-report-${Date.now()}.json`), JSON.stringify(report, null, 2));
  console.log('✅ Generated aggregated sales report.');
}

generate().catch((error) => {
  console.error('❌ Failed to generate reports', error);
  process.exit(1);
});
