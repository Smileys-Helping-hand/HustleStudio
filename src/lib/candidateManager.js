import {
  addDoc,
  collection,
  collectionGroup,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  deleteObject,
  getDownloadURL,
  ref,
  uploadBytes,
} from 'firebase/storage';
import { db, storage } from './firebase';

const CANDIDATE_COLLECTION = 'candidates';

function generateId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2, 10)}`;
}

function assertTenant(tenantId) {
  if (!tenantId) {
    throw new Error('Tenant ID is required to perform candidate operations.');
  }
}

function normalizeSearchTerm(term) {
  return term?.trim().toLowerCase() ?? '';
}

function filterBySearch(candidates, term) {
  if (!term) return candidates;
  return candidates.filter((candidate) => {
    const joined = [
      candidate.name,
      candidate.email,
      candidate.phone,
      candidate.source,
      ...(candidate.skills ?? []),
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return joined.includes(term);
  });
}

export async function listCandidates({ tenantId, searchTerm = '', status } = {}) {
  assertTenant(tenantId);
  const baseQuery = query(
    collection(db, CANDIDATE_COLLECTION),
    where('tenantId', '==', tenantId),
    orderBy('uploadedAt', 'desc')
  );
  const snapshot = await getDocs(baseQuery);
  let results = snapshot.docs.map((docSnapshot) => ({
    id: docSnapshot.id,
    ...docSnapshot.data(),
  }));

  if (status && status !== 'all') {
    results = results.filter((candidate) => candidate.status === status);
  }

  const normalizedTerm = normalizeSearchTerm(searchTerm);
  return filterBySearch(results, normalizedTerm);
}

export async function getCandidate(candidateId, tenantId) {
  assertTenant(tenantId);
  const candidateRef = doc(db, CANDIDATE_COLLECTION, candidateId);
  const snapshot = await getDoc(candidateRef);
  if (!snapshot.exists()) {
    return null;
  }

  const data = snapshot.data();
  if (data.tenantId !== tenantId) {
    throw new Error('Attempted to access a candidate belonging to another tenant.');
  }

  return { id: snapshot.id, ...data };
}

async function uploadCandidateCv({ file, tenantId, candidateId }) {
  if (!file) return null;
  const safeName = file.name?.replace(/[^a-zA-Z0-9.\-_]/g, '_') || 'cv.pdf';
  const storageRef = ref(
    storage,
    `candidates/${tenantId}/${candidateId}/${Date.now()}-${safeName}`
  );
  const buffer = await file.arrayBuffer();
  await uploadBytes(storageRef, buffer, { contentType: file.type || 'application/pdf' });
  return getDownloadURL(storageRef);
}

export async function createCandidate({
  tenantId,
  candidate,
  file,
}) {
  assertTenant(tenantId);
  const candidateId = generateId();
  const docRef = doc(db, CANDIDATE_COLLECTION, candidateId);
  const cvUrl = await uploadCandidateCv({ file, tenantId, candidateId });

  const payload = {
    ...candidate,
    status: candidate.status ?? 'new',
    tenantId,
    cvUrl: cvUrl ?? candidate.cvUrl ?? null,
    uploadedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  await setDoc(docRef, payload);

  return { id: candidateId, ...payload, uploadedAt: new Date() };
}

export async function updateCandidate(candidateId, tenantId, updates = {}) {
  assertTenant(tenantId);
  const candidateRef = doc(db, CANDIDATE_COLLECTION, candidateId);
  await updateDoc(candidateRef, {
    ...updates,
    updatedAt: serverTimestamp(),
  });
  return getCandidate(candidateId, tenantId);
}

export async function removeCandidate(candidateId, tenantId) {
  assertTenant(tenantId);
  const candidateRef = doc(db, CANDIDATE_COLLECTION, candidateId);
  const snapshot = await getDoc(candidateRef);
  if (snapshot.exists()) {
    const data = snapshot.data();
    if (data.cvUrl) {
      try {
        const url = new URL(data.cvUrl);
        const pathName = decodeURIComponent(url.pathname.replace(/^\//, ''));
        await deleteObject(ref(storage, pathName));
      } catch (error) {
        console.error('Failed to remove candidate CV from storage', error);
      }
    }
  }
  await deleteDoc(candidateRef);
}

export async function saveCandidateNotes(candidateId, tenantId, notes) {
  return updateCandidate(candidateId, tenantId, { notes });
}

export async function recordCvGeneration({
  tenantId,
  candidateId,
  versionId = generateId(),
  template,
  summary,
  storagePath,
  metrics,
}) {
  assertTenant(tenantId);
  const cvDoc = doc(db, CANDIDATE_COLLECTION, candidateId, 'cvs', versionId);
  await setDoc(cvDoc, {
    template,
    summary,
    storagePath,
    metrics,
    tenantId,
    generatedAt: serverTimestamp(),
  });
  return versionId;
}

export async function listCandidateCvHistory({ tenantId, candidateId }) {
  assertTenant(tenantId);
  const cvsRef = collection(db, CANDIDATE_COLLECTION, candidateId, 'cvs');
  const snapshot = await getDocs(query(cvsRef, orderBy('generatedAt', 'desc')));
  return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
}

export async function listTenantCvHistory({ tenantId }) {
  assertTenant(tenantId);
  const groupRef = collectionGroup(db, 'cvs');
  const snapshot = await getDocs(query(groupRef, where('tenantId', '==', tenantId), orderBy('generatedAt', 'desc')));
  return snapshot.docs.map((docSnapshot) => ({ id: docSnapshot.id, ...docSnapshot.data() }));
}

export async function appendCandidateTimelineEntry({ tenantId, candidateId, entry }) {
  assertTenant(tenantId);
  const timelineCollection = collection(db, CANDIDATE_COLLECTION, candidateId, 'timeline');
  await addDoc(timelineCollection, {
    ...entry,
    createdAt: serverTimestamp(),
  });
}

export async function syncCvGenerationMetrics({ tenantId, candidateId, cost = 0 }) {
  assertTenant(tenantId);
  const analyticsRef = doc(db, 'analytics', tenantId);
  const existing = await getDoc(analyticsRef);
  const increment = existing.exists()
    ? { cvGenerated: (existing.data().cvGenerated ?? 0) + 1, cvCost: (existing.data().cvCost ?? 0) + cost }
    : { cvGenerated: 1, cvCost: cost };
  await setDoc(analyticsRef, increment, { merge: true });
  await appendCandidateTimelineEntry({
    tenantId,
    candidateId,
    entry: {
      type: 'cv_generation',
      cost,
      description: 'CV generated via Hustle Studio AI tools',
    },
  });
}

export default {
  listCandidates,
  getCandidate,
  createCandidate,
  updateCandidate,
  removeCandidate,
  saveCandidateNotes,
  recordCvGeneration,
  listCandidateCvHistory,
  listTenantCvHistory,
  appendCandidateTimelineEntry,
  syncCvGenerationMetrics,
};
