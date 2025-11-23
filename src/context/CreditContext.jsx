import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { doc, onSnapshot, runTransaction, serverTimestamp, setDoc } from 'firebase/firestore';
import { loadStripe } from '@stripe/stripe-js';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase.js';
import { useAuth } from './AuthContext.jsx';
import { useNotify } from './NotificationContext.jsx';
import { useTenant } from './TenantContext.jsx';
import { tenantCollection, tenantDoc } from '../lib/tenant.js';

const resolveEnv = (key) => {
  if (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env[key]) {
    return import.meta.env[key];
  }
  if (
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process !== null &&
    typeof globalThis.process.env === 'object' &&
    globalThis.process.env[key]
  ) {
    return globalThis.process.env[key];
  }
  return '';
};

const stripePromise = () => {
  const publishableKey = resolveEnv('VITE_STRIPE_PUBLISHABLE_KEY');
  return publishableKey ? loadStripe(publishableKey) : Promise.resolve(null);
};

const getPaymentsEndpoint = () => resolveEnv('VITE_PAYMENTS_ENDPOINT');

export const CreditContext = createContext({
  balance: 0,
  loading: true,
  refresh: () => {},
  addCredits: async () => {},
  startCheckout: async () => {},
});

const ensureBalanceDoc = async (tenantId, userId) => {
  const balanceRef = tenantDoc(tenantId, 'users', userId, 'credits', 'balance');
  await setDoc(balanceRef, { balance: 120, updatedAt: serverTimestamp() }, { merge: true });
};

export const CreditProvider = ({ children }) => {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshIndex, setRefreshIndex] = useState(0);
  const lowCreditNotifiedRef = useRef(false);
  const notify = useNotify();

  useEffect(() => {
    if (!user) {
      setBalance(0);
      setLoading(false);
      lowCreditNotifiedRef.current = false;
      return () => {};
    }

    const balanceRef = tenantDoc(activeTenantId, 'users', user.uid, 'credits', 'balance');
    setLoading(true);
    const unsubscribe = onSnapshot(
      balanceRef,
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          setBalance(Number(data.balance ?? 0));
        } else {
          await ensureBalanceDoc(activeTenantId, user.uid);
          setBalance(120);
        }
        const value = snapshot.exists() ? Number(snapshot.data()?.balance ?? 0) : 120;
        if (!lowCreditNotifiedRef.current && value < 25) {
          notify({
            title: 'Low credit balance',
            description: 'Recharge credits soon to keep assistants online.',
            type: 'warning',
          });
          lowCreditNotifiedRef.current = true;
        }
        setLoading(false);
      },
      (error) => {
        console.error('[Credits] Failed to read balance.', error);
        toast.error('Unable to load credit balance.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [activeTenantId, notify, refreshIndex, user]);

  useEffect(() => {
    if (balance >= 25) {
      lowCreditNotifiedRef.current = false;
    }
  }, [balance]);

  const refresh = useCallback(() => {
    setRefreshIndex((value) => value + 1);
  }, []);

  const addCredits = useCallback(
    async (amount, metadata = {}) => {
      if (!user) {
        toast.error('Sign in to adjust credits.');
        return;
      }
      if (amount <= 0) return;
      const balanceRef = tenantDoc(activeTenantId, 'users', user.uid, 'credits', 'balance');
      const transactionRef = doc(tenantCollection(activeTenantId, 'users', user.uid, 'transactions'));

      await runTransaction(db, async (transaction) => {
        const snapshot = await transaction.get(balanceRef);
        const current = snapshot.exists() ? Number(snapshot.data().balance ?? 0) : 0;
        const newBalance = current + amount;
        transaction.set(balanceRef, { balance: newBalance, updatedAt: serverTimestamp() }, { merge: true });
        transaction.set(transactionRef, {
          type: 'top-up',
          amount,
          provider: metadata.provider ?? 'manual',
          reference: metadata.reference ?? 'manual-topup',
          createdAt: serverTimestamp(),
        });
      });
      notify({
        title: 'Credits updated',
        description: `Credits added: ${amount.toFixed(2)}`,
        type: 'success',
      });
    },
    [activeTenantId, notify, user]
  );

  const startCheckout = useCallback(
    async (amount) => {
      if (!user) {
        toast.error('Sign in to top up credits.');
        return;
      }
      if (!amount || amount < 1) {
        toast.error('Select a top-up amount.');
        return;
      }
      const endpoint = getPaymentsEndpoint();
      if (!endpoint) {
        toast.error('Payments endpoint not configured.');
        return;
      }

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount, userId: user.uid }),
        });
        if (!response.ok) {
          throw new Error('Failed to create checkout session.');
        }
        const data = await response.json();
        const stripe = await stripePromise();
        if (stripe && data.sessionId) {
          await stripe.redirectToCheckout({ sessionId: data.sessionId });
          return;
        }
        if (data.checkoutUrl) {
          window.location.href = data.checkoutUrl;
        }
      } catch (error) {
        console.error('[Credits] Checkout error.', error);
        toast.error('Unable to start checkout.');
      }
    },
    [user]
  );

  const value = useMemo(
    () => ({ balance, loading, refresh, addCredits, startCheckout }),
    [addCredits, balance, loading, refresh, startCheckout]
  );

  return <CreditContext.Provider value={value}>{children}</CreditContext.Provider>;
};

CreditProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useCreditContext = () => useContext(CreditContext);
