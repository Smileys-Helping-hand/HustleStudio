import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  getDocs,
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { firebaseConfig } from '../src/lib/firebase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

const collectionName =
  process.env.VITE_GLOBAL_INSIGHTS_COLLECTION ||
  process.env.GLOBAL_INSIGHTS_COLLECTION ||
  (typeof process.env.VITE_GLOBAL_INSIGHTS_ENABLED !== 'undefined' ? 'global_insights' : 'global_insights');

const snapshot = await getDocs(collection(db, collectionName));
const events = snapshot.docs.map((doc) => {
  const data = doc.data();
  try {
    return { ...data, payload: JSON.parse(data.payload ?? '{}') };
  } catch (error) {
    return { ...data, payload: {} };
  }
});

const summary = {
  totalEvents: events.length,
  topAssistants: {},
  avgScores: {},
};

for (const event of events) {
  const { payload } = event;
  if (payload.assistant) {
    summary.topAssistants[payload.assistant] = (summary.topAssistants[payload.assistant] ?? 0) + 1;
  }
  if (typeof payload.score === 'number') {
    const current = summary.avgScores[payload.assistant || 'unknown'] || { total: 0, count: 0 };
    current.total += payload.score;
    current.count += 1;
    summary.avgScores[payload.assistant || 'unknown'] = current;
  }
}

for (const assistant of Object.keys(summary.avgScores)) {
  const { total, count } = summary.avgScores[assistant];
  summary.avgScores[assistant] = count > 0 ? Number((total / count).toFixed(2)) : 0;
}

const outputPath = path.resolve(__dirname, '../global-summary.json');
fs.writeFileSync(outputPath, JSON.stringify(summary, null, 2));
console.log(`✅ Global insight summary exported → ${outputPath}`);
