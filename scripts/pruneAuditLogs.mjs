import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  deleteDoc,
  getDocs,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { firebaseConfig } from '../src/lib/firebase.js';

const resolveRetentionDays = () => {
  const explicit =
    process.env.VITE_AI_AUDIT_RETENTION_DAYS ||
    process.env.AI_AUDIT_RETENTION_DAYS ||
    process.env.AI_LOG_RETENTION_DAYS;
  const parsed = Number(explicit);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return 30;
  }
  return parsed;
};

const retentionDays = resolveRetentionDays();
const cutoffDate = new Date(Date.now() - retentionDays * 24 * 60 * 60 * 1000);

const app = initializeApp(firebaseConfig);
const firestore = getFirestore(app);

const prune = async () => {
  const cutoffTimestamp = Timestamp.fromDate(cutoffDate);
  const auditQuery = query(collection(firestore, 'ai_audit_logs'), where('createdAt', '<', cutoffTimestamp));
  const snapshot = await getDocs(auditQuery);

  if (snapshot.empty) {
    console.log(`[Audit Prune] No audit entries older than ${retentionDays} day(s).`);
    return;
  }

  await Promise.all(snapshot.docs.map((doc) => deleteDoc(doc.ref)));
  console.log(`[Audit Prune] Removed ${snapshot.size} audit log(s) older than ${retentionDays} day(s).`);
};

prune()
  .catch((error) => {
    console.error('[Audit Prune] Failed to prune audit logs.', error);
    process.exitCode = 1;
  })
  .finally(() => {
    if (typeof process !== 'undefined' && process.exit) {
      process.exit();
    }
  });
