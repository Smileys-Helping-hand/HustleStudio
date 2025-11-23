import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { collection, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext.jsx';
import { db } from '../lib/firebase.js';
import { getBrandConfig } from '../config/branding.js';
import { startPresence, subscribePresence } from '../lib/presenceEngine.js';
import { logEvent } from '../lib/auditLogger.js';
import { getTelemetryDefault } from '../lib/telemetryEngine.js';
import { decodeTenantData } from '../lib/tenant.js';

const TenantContext = createContext({
  tenants: [],
  activeTenantId: null,
  activeTenant: null,
  activeMembership: null,
  loading: true,
  presence: [],
  brand: null,
  switchTenant: () => {},
  createTenant: async () => {},
  refreshTenants: async () => {},
  saveBranding: async () => {},
  updateTelemetryPreference: async () => {},
});

export const TenantProvider = ({ children }) => {
  const { user, memberships, refreshMemberships } = useAuth();
  const [tenantSummaries, setTenantSummaries] = useState([]);
  const [activeTenantId, setActiveTenantId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [presence, setPresence] = useState([]);
  const presenceCleanupRef = useRef(null);

  const hydrateTenants = useCallback(async () => {
    if (!user) {
      setTenantSummaries([]);
      setActiveTenantId(null);
      setLoading(false);
      return [];
    }
    if (!memberships || memberships.length === 0) {
      setTenantSummaries([]);
      setActiveTenantId(null);
      setLoading(false);
      return [];
    }

    setLoading(true);
    try {
      const mapped = await Promise.all(
        memberships.map(async (membership) => {
          const tenantRef = doc(db, 'tenants', membership.tenantId);
          const snapshot = await getDoc(tenantRef);
          const data = snapshot.exists() ? decodeTenantData(snapshot.data()) : {};
          return {
            id: membership.tenantId,
            role: membership.role ?? 'viewer',
            name: data.name ?? 'Workspace',
            accent: data.accent ?? '#6366f1',
            logo: data.branding?.logo ?? data.logo ?? null,
            plan: data.plan ?? (import.meta.env.VITE_TENANT_DEFAULT_PLAN || 'free'),
            branding: data.branding ?? null,
            domain: data.domain ?? '',
            telemetryEnabled: data.telemetryEnabled ?? getTelemetryDefault(),
          };
        })
      );
      setTenantSummaries(mapped);
      setActiveTenantId((current) => {
        if (current && mapped.some((tenant) => tenant.id === current)) {
          return current;
        }
        return mapped[0]?.id ?? null;
      });
      return mapped;
    } catch (error) {
      console.error('[Tenant] Failed to load tenant profiles.', error);
      toast.error('Unable to load workspaces.');
      setTenantSummaries([]);
      setActiveTenantId(null);
      return [];
    } finally {
      setLoading(false);
    }
  }, [memberships, user]);

  useEffect(() => {
    hydrateTenants().catch(() => {});
  }, [hydrateTenants]);

  useEffect(() => {
    if (!user) {
      if (presenceCleanupRef.current) {
        presenceCleanupRef.current();
        presenceCleanupRef.current = null;
      }
      setPresence([]);
      return undefined;
    }

    if (!activeTenantId) {
      setPresence([]);
      return undefined;
    }

    const stopPresence = startPresence(activeTenantId, user);
    presenceCleanupRef.current = stopPresence;
    const unsubscribe = subscribePresence(activeTenantId, setPresence);
    return () => {
      unsubscribe();
      if (presenceCleanupRef.current) {
        presenceCleanupRef.current();
        presenceCleanupRef.current = null;
      }
    };
  }, [activeTenantId, user]);

  const switchTenant = useCallback((tenantId) => {
    setActiveTenantId(tenantId);
  }, []);

  const saveBranding = useCallback(
    async (branding) => {
      if (!activeTenantId) {
        toast.error('Select a workspace first.');
        return;
      }
      try {
        await setDoc(
          doc(db, 'tenants', activeTenantId),
          {
            branding,
            logo: branding?.logo ?? null,
            accent: branding?.colors?.accent ?? branding?.colors?.primary ?? '#6366f1',
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await hydrateTenants();
        toast.success('Branding updated');
      } catch (error) {
        console.error('[Tenant] Failed to save branding', error);
        toast.error('Unable to save branding.');
      }
    },
    [activeTenantId, hydrateTenants]
  );

  const updateTelemetryPreference = useCallback(
    async (enabled) => {
      if (!activeTenantId) {
        toast.error('Select a workspace first.');
        return;
      }
      const nextValue = !!enabled;
      try {
        await setDoc(
          doc(db, 'tenants', activeTenantId),
          {
            telemetryEnabled: nextValue,
            telemetryUpdatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        setTenantSummaries((previous) =>
          previous.map((tenant) =>
            tenant.id === activeTenantId ? { ...tenant, telemetryEnabled: nextValue } : tenant
          )
        );
        toast.success(nextValue ? 'Telemetry enabled' : 'Telemetry disabled');
      } catch (error) {
        console.error('[Tenant] Failed to update telemetry preference', error);
        toast.error('Unable to update telemetry preference.');
        throw error;
      }
    },
    [activeTenantId]
  );

  const createTenant = useCallback(
    async ({ name, accent }) => {
      if (!user) {
        toast.error('Sign in to create a workspace.');
        return null;
      }
      const tenantRef = doc(collection(db, 'tenants'));
      await setDoc(tenantRef, {
        name: name || 'New Workspace',
        accent: accent || '#6366f1',
        createdAt: serverTimestamp(),
        ownerId: user.uid,
        plan: import.meta.env.VITE_TENANT_DEFAULT_PLAN || 'free',
        telemetryEnabled: getTelemetryDefault(),
      });
      const memberRef = doc(db, 'tenants', tenantRef.id, 'users', user.uid);
      await setDoc(memberRef, {
        uid: user.uid,
        role: 'Owner',
        email: user.email ?? '',
        joinedAt: serverTimestamp(),
      });
      await refreshMemberships(user.uid);
      await hydrateTenants();
      setActiveTenantId(tenantRef.id);
      toast.success('Workspace created.');
      await logEvent(tenantRef.id, user.uid, 'Created Workspace', { name });
      return tenantRef.id;
    },
    [hydrateTenants, refreshMemberships, user]
  );

  const refreshTenants = useCallback(async () => {
    await refreshMemberships(user?.uid);
    await hydrateTenants();
  }, [hydrateTenants, refreshMemberships, user]);

  const value = useMemo(() => {
    const activeTenant = tenantSummaries.find((tenant) => tenant.id === activeTenantId) ?? null;
    const brand = getBrandConfig(activeTenant?.id, activeTenant?.branding);
    const activeMembership = memberships?.find((entry) => entry.tenantId === activeTenantId) ?? null;
    return {
      tenants: tenantSummaries,
      activeTenantId,
      activeTenant,
      activeMembership,
      loading,
      presence,
      switchTenant,
      createTenant,
      refreshTenants,
      brand,
      saveBranding,
      updateTelemetryPreference,
    };
  }, [
    tenantSummaries,
    activeTenantId,
    memberships,
    loading,
    presence,
    switchTenant,
    createTenant,
    refreshTenants,
    saveBranding,
    updateTelemetryPreference,
  ]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

TenantProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useTenant = () => useContext(TenantContext);
