import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { getEngagementMetrics } from '../lib/analyticsEngine.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useNotify } from '../context/NotificationContext.jsx';
import { useTenant } from '../context/TenantContext.jsx';
import { tenantCollection } from '../lib/tenant.js';

const resolveRefreshInterval = () => {
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_ANALYTICS_REFRESH_MS) {
    return Number(import.meta.env.VITE_ANALYTICS_REFRESH_MS);
  }
  const nodeEnv =
    typeof globalThis !== 'undefined' &&
    typeof globalThis.process === 'object' &&
    globalThis.process !== null &&
    typeof globalThis.process.env === 'object'
      ? globalThis.process.env
      : undefined;
  if (nodeEnv?.VITE_ANALYTICS_REFRESH_MS) {
    return Number(nodeEnv.VITE_ANALYTICS_REFRESH_MS);
  }
  return 30000;
};

export const useAnalytics = () => {
  const { user } = useAuth();
  const { activeTenantId } = useTenant();
  const notify = useNotify();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ sales: null, usage: null, team: null });
  const [error, setError] = useState(null);
  const lastSaleIdRef = useRef(null);
  const intervalRef = useRef(null);

  const refresh = useCallback(async () => {
    if (!user || !activeTenantId) {
      setMetrics({ sales: null, usage: null, team: null });
      setLoading(false);
      return;
    }
    try {
      setLoading(true);
      const data = await getEngagementMetrics(user.uid, activeTenantId);
      setMetrics(data);
      setError(null);
    } catch (err) {
      console.error('[Analytics] Failed to refresh metrics', err);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [activeTenantId, user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const interval = resolveRefreshInterval();
    if (!user || interval <= 0) return undefined;

    intervalRef.current = setInterval(refresh, interval);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [user, refresh]);

  useEffect(() => {
    if (!user || !activeTenantId) return undefined;

    const salesQuery = query(
      tenantCollection(activeTenantId, 'sales'),
      orderBy('createdAt', 'desc'),
      limit(1)
    );
    let initialised = false;
    const unsubscribe = onSnapshot(salesQuery, (snapshot) => {
      const docSnapshot = snapshot.docs[0];
      if (!docSnapshot) return;
      if (!initialised) {
        initialised = true;
        lastSaleIdRef.current = docSnapshot.id;
        return;
      }
      if (lastSaleIdRef.current !== docSnapshot.id) {
        lastSaleIdRef.current = docSnapshot.id;
        notify({
          title: 'New sale captured',
          description: 'A fresh sale landed in the till — view analytics for details.',
          type: 'success',
        });
        refresh();
      }
    });

    return () => unsubscribe();
  }, [activeTenantId, notify, refresh, user]);

  return useMemo(
    () => ({ metrics, loading, error, refresh }),
    [metrics, loading, error, refresh]
  );
};
