import fetch from 'node-fetch';
import { getApps, initializeApp } from 'firebase/app';
import { collection, doc, getFirestore, setDoc } from 'firebase/firestore';

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
};

if (!config.apiKey || !config.projectId) {
  console.error('[pluginSync] Missing Firebase credentials.');
  process.exit(1);
}

const app = getApps().length ? getApps()[0] : initializeApp(config);
const db = getFirestore(app);
const marketplaceEndpoint = process.env.VITE_MARKETPLACE_API || 'https://api.hustlestudio.co.za/plugins';

async function run() {
  const response = await fetch(marketplaceEndpoint);
  if (!response.ok) {
    const text = await response.text();
    throw new Error(text || 'Unable to fetch marketplace catalogue.');
  }
  const payload = await response.json();
  const plugins = Array.isArray(payload) ? payload : payload?.plugins ?? [];
  await Promise.all(
    plugins.map(async (plugin) => {
      if (!plugin?.id) return;
      await setDoc(doc(collection(db, 'marketplacePlugins'), plugin.id), plugin, { merge: true });
    })
  );
  console.log(`[pluginSync] Synced ${plugins.length} plugins.`);
}

run()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('[pluginSync] Failed to sync marketplace', error);
    process.exit(1);
  });
