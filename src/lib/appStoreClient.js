import { addDoc, collection, doc, getDocs, serverTimestamp, setDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { tenantCollection, tenantDoc } from './tenant.js';

const defaultApps = [
  {
    id: 'ai-briefs',
    name: 'AI Campaign Briefs',
    description: 'Generate guided campaign briefs and launch playbooks in seconds.',
    category: 'marketing',
    rating: 4.7,
  },
  {
    id: 'finance-forecast',
    name: 'Finance Forecast Pack',
    description: 'Blend sales, expense, and inventory data to produce rolling forecasts.',
    category: 'finance',
    rating: 4.5,
  },
  {
    id: 'workflow-sync',
    name: 'Workflow Sync',
    description: 'Send key Hustle Studio events to Slack, Teams, or Zapier instantly.',
    category: 'automation',
    rating: 4.3,
  },
];

const snapshotDocs = async (query) => {
  const snap = await getDocs(query);
  return snap.docs.map((item) => ({ id: item.id, ...item.data() }));
};

export const fetchAppCatalog = async () => {
  try {
    const catalogSnap = await snapshotDocs(collection(db, 'appsCatalog'));
    if (catalogSnap.length === 0) {
      return defaultApps;
    }
    return catalogSnap;
  } catch (error) {
    console.warn('[AppStore] Falling back to default catalog', error);
    return defaultApps;
  }
};

export const fetchInstalledApps = async (tenantId) => {
  if (!tenantId) return [];
  try {
    return await snapshotDocs(tenantCollection(tenantId, 'apps'));
  } catch (error) {
    console.warn('[AppStore] Unable to load installed apps', error);
    return [];
  }
};

export const installApp = async (tenantId, app) => {
  if (!tenantId) throw new Error('A tenant must be selected before installing apps.');
  const payload = {
    name: app.name,
    appId: app.id,
    description: app.description,
    installedAt: serverTimestamp(),
    category: app.category,
  };
  await addDoc(tenantCollection(tenantId, 'apps'), payload);
  return payload;
};

export const submitApp = async (submission) => {
  const payload = {
    ...submission,
    status: 'pending-review',
    submittedAt: serverTimestamp(),
  };
  await addDoc(collection(db, 'appSubmissions'), payload);
  return payload;
};

export const reviewAppSubmission = async (submissionId, status, reviewerId) => {
  const docRef = doc(db, 'appSubmissions', submissionId);
  await setDoc(
    docRef,
    {
      status,
      reviewedAt: serverTimestamp(),
      reviewerId,
    },
    { merge: true }
  );
};

export const recordAppRating = async (tenantId, appId, rating) => {
  if (!tenantId) return;
  const ratingDoc = tenantDoc(tenantId, 'apps', appId, 'ratings', rating.toString());
  await setDoc(
    ratingDoc,
    {
      rating,
      submittedAt: serverTimestamp(),
    },
    { merge: true }
  );
};
