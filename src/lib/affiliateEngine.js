import { addDoc, doc, increment, serverTimestamp, setDoc, updateDoc } from 'firebase/firestore';
import { db } from './firebase.js';
import { tenantCollection, tenantDoc } from './tenant.js';

export async function registerReferral(referrerId, referredEmail) {
  if (!referrerId || !referredEmail) {
    throw new Error('Referrer and email are required.');
  }
  const id = `${referrerId}_${Date.now()}`;
  const record = {
    referrerId,
    referredEmail,
    status: 'pending',
    createdAt: serverTimestamp(),
  };
  await setDoc(doc(db, 'referrals', id), record);
  return id;
}

export async function markReferralPaid(referralId, amount = 0) {
  if (!referralId) throw new Error('Referral id required');
  await setDoc(
    doc(db, 'referrals', referralId),
    {
      status: 'paid',
      amount,
      paidAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function incrementAffiliateCredits(tenantId, userId, amount) {
  if (!tenantId || !userId || !amount) return;
  const creditDoc = tenantDoc(tenantId, 'users', userId);
  await setDoc(
    creditDoc,
    {
      affiliateCredits: increment(amount),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

export async function logReferralEvent(tenantId, payload) {
  if (!tenantId) return;
  await addDoc(tenantCollection(tenantId, 'referralLogs'), {
    ...payload,
    createdAt: serverTimestamp(),
  });
}

export async function updateAffiliateTotals(tenantId, totals) {
  if (!tenantId) return;
  await updateDoc(tenantDoc(tenantId, 'affiliates', 'summary'), {
    ...totals,
    updatedAt: serverTimestamp(),
  }).catch(async () => {
    await setDoc(
      tenantDoc(tenantId, 'affiliates', 'summary'),
      {
        ...totals,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  });
}
