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
import logger from '../lib/logger.js';

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
    logger.log('[TenantContext] hydrateTenants called', {
      hasUser: !!user,
      membershipsCount: memberships?.length ?? 0,
      memberships,
    });

    if (!user) {
      logger.log('[TenantContext] No user, clearing tenants');
      setTenantSummaries([]);
      setActiveTenantId(null);
      setLoading(false);
      return [];
    }
    if (!memberships || memberships.length === 0) {
      logger.log('[TenantContext] No memberships, clearing tenants');
      setTenantSummaries([]);
      setActiveTenantId(null);
      setLoading(false);
      return [];
    }

    setLoading(true);
    try {
      logger.log('[TenantContext] Fetching tenant details for memberships:', memberships);
      const mapped = await Promise.all(
        memberships.map(async (membership) => {
          const tenantRef = doc(db, 'tenants', membership.tenantId);
          const snapshot = await getDoc(tenantRef);
          const data = snapshot.exists() ? decodeTenantData(snapshot.data()) : {};
          logger.log(`[TenantContext] Fetched tenant ${membership.tenantId}:`, data);
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
      logger.log('[TenantContext] Mapped tenants:', mapped);
      setTenantSummaries(mapped);
      setActiveTenantId((current) => {
        if (current && mapped.some((tenant) => tenant.id === current)) {
          logger.log('[TenantContext] Keeping current active tenant:', current);
          return current;
        }
        const newActive = mapped[0]?.id ?? null;
        logger.log('[TenantContext] Setting new active tenant:', newActive);
        return newActive;
      });
      return mapped;
    } catch (error) {
      logger.error('[Tenant] Failed to load tenant profiles.', error);
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
    logger.log('[TenantContext] switchTenant called:', tenantId);
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
        logger.error('[Tenant] Failed to save branding', error);
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
        logger.error('[Tenant] Failed to update telemetry preference', error);
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
        throw new Error('User not authenticated');
      }
      
      try {
        logger.log('[TenantContext] Creating workspace:', { name, accent });
        
        // Create tenant document
        const tenantRef = doc(collection(db, 'tenants'));
        await setDoc(tenantRef, {
          name: name || 'New Workspace',
          accent: accent || '#6366f1',
          createdAt: serverTimestamp(),
          ownerId: user.uid,
          plan: import.meta.env.VITE_TENANT_DEFAULT_PLAN || 'free',
          telemetryEnabled: getTelemetryDefault(),
        });
        
        logger.log('[TenantContext] Tenant document created:', tenantRef.id);
        
        // Create member document
        const memberRef = doc(db, 'tenants', tenantRef.id, 'users', user.uid);
        await setDoc(memberRef, {
          uid: user.uid,
          role: 'Owner',
          email: user.email ?? '',
          joinedAt: serverTimestamp(),
        });
        
        logger.log('[TenantContext] Member document created');
        
        // Refresh memberships and tenants
        await refreshMemberships(user.uid);
        logger.log('[TenantContext] Memberships refreshed');
        
        await hydrateTenants();
        logger.log('[TenantContext] Tenants hydrated');
        
        // Switch to new tenant
        setActiveTenantId(tenantRef.id);
        logger.log('[TenantContext] Switched to new tenant:', tenantRef.id);
        
        toast.success(`Workspace "${name}" created successfully!`);
        
        // Log event
        try {
          await logEvent(tenantRef.id, user.uid, 'Created Workspace', { name });
        } catch (logError) {
          logger.warn('[TenantContext] Failed to log event:', logError);
        }
        
        return tenantRef.id;
      } catch (error) {
        logger.error('[TenantContext] Failed to create workspace:', error);
        toast.error('Failed to create workspace. Please try again.');
        throw error;
      }
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
