import { useContext } from 'react';
import { collection, doc, runTransaction, serverTimestamp } from 'firebase/firestore';
import { CreditContext } from '../context/CreditContext.jsx';
import { db } from '../lib/firebase.js';
import { tenantCollection, tenantDoc } from '../lib/tenant.js';

export const CREDIT_COST_PER_TOKEN = 0.01;
export const MINIMUM_CREDITS_PER_REQUEST = 1;

export const calculateCreditCost = (tokensUsed) => {
  if (!tokensUsed) return 0;
  return Number((tokensUsed * CREDIT_COST_PER_TOKEN).toFixed(2));
};

export const deductCredits = async (userId, tokensUsed, metadata = {}) => {
  if (!userId) {
    throw new Error('User ID required to deduct credits.');
  }
  const creditsUsed = calculateCreditCost(tokensUsed);
  if (!creditsUsed) {
    return { creditsUsed: 0 };
  }

  const tenantId = metadata.tenantId ?? null;

  const balanceRef = tenantDoc(tenantId, 'users', userId, 'credits', 'balance');
  const usageRef = doc(tenantCollection(tenantId, 'users', userId, 'usageLogs'));
  const globalUsageRef = doc(collection(db, 'aiUsageLogs'));

  await runTransaction(db, async (transaction) => {
    const snapshot = await transaction.get(balanceRef);
    const current = snapshot.exists() ? Number(snapshot.data().balance ?? 0) : 0;
    if (current < creditsUsed) {
      throw new Error('Insufficient credits for this request.');
    }

    transaction.set(balanceRef, { balance: current - creditsUsed, updatedAt: serverTimestamp() }, { merge: true });
    transaction.set(usageRef, {
      userId,
      assistant: metadata.assistant ?? 'unknown',
      promptTokens: metadata.promptTokens ?? 0,
      completionTokens: metadata.completionTokens ?? 0,
      tokensUsed,
      creditsUsed,
      model: metadata.model ?? 'gpt-4o-mini',
      tenantId,
      createdAt: serverTimestamp(),
    });
    transaction.set(globalUsageRef, {
      userId,
      assistant: metadata.assistant ?? 'unknown',
      tokensUsed,
      creditsUsed,
      model: metadata.model ?? 'gpt-4o-mini',
      tenantId,
      createdAt: serverTimestamp(),
    });
  });

  return { creditsUsed };
};

export const useCredits = () => useContext(CreditContext);
