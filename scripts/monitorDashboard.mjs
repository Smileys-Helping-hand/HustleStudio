import express from "express";
import fs from "fs";
import fetch from "node-fetch";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

const app = express();
const PORT = process.env.PORT || 5050;

const config = {
  apiKey: process.env.VITE_FIREBASE_API_KEY,
  authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
};
const firebaseApp = initializeApp(config);
const db = getFirestore(firebaseApp);

async function checkFirestore() {
  try {
    const inv = await getDocs(collection(db, "inventory"));
    const rep = await getDocs(collection(db, "reports"));
    const team = await getDocs(collection(db, "team"));
    return {
      ok: true,
      counts: { inventory: inv.size, reports: rep.size, team: team.size },
    };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

async function checkCDN() {
  try {
    const res = await fetch(`${process.env.VITE_CDN_DOMAIN}/assets/manifest.json`);
    return { ok: res.ok, status: res.status };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}

app.get("/monitor", async (_, res) => {
  const firestore = await checkFirestore();
  const cdn = await checkCDN();
  const qaReport = fs.existsSync("README.md")
    ? fs.readFileSync("README.md", "utf8").split("## 🚀").slice(-1)[0].trim()
    : "No QA report found.";

  res.send(`
  <style>
    body { font-family: Inter, sans-serif; background:#0f0f17; color:#fff; padding:40px; }
    h1 { font-size:2rem; margin-bottom:1rem; }
    section { background:#1a1a1a; padding:1rem 1.5rem; border-radius:10px; margin-bottom:1rem; }
    pre { background:#000; padding:1rem; border-radius:8px; overflow:auto; }
    .ok { color:#22c55e; } .fail { color:#ef4444; }
  </style>
  <h1>🩺 Hustle Studio System Monitor</h1>
  <section>
    <h2>Firestore</h2>
    <p>Status: ${firestore.ok ? "<span class='ok'>OK</span>" : "<span class='fail'>FAIL</span>"}<br>
    ${firestore.ok ? JSON.stringify(firestore.counts) : firestore.error}</p>
  </section>
  <section>
    <h2>CDN</h2>
    <p>Status: ${cdn.ok ? "<span class='ok'>OK</span>" : "<span class='fail'>FAIL</span>"} (HTTP ${cdn.status || ""})</p>
  </section>
  <section>
    <h2>Last QA Summary</h2>
    <pre>${qaReport}</pre>
  </section>
  `);
});

app.listen(PORT, () => console.log(`[HS Monitor] Listening on http://localhost:${PORT}/monitor`));
