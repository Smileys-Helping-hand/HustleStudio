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
  updateWorkspace: async () => {},
});

export const TenantProvider = ({ children }) => {
  const { user, memberships, refreshMemberships } = useAuth();
  const [tenantSummaries, setTenantSummaries] = useState([]);
  const [activeTenantId, setActiveTenantId] = useState(() => {
    // Try to restore from localStorage
    try {
      const saved = localStorage.getItem('hustleStudio_activeTenant');
      return saved || null;
    } catch (error) {
      logger.warn('[TenantContext] Failed to restore active tenant from localStorage:', error);
      return null;
    }
  });
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
        // Check if current tenant is valid
        if (current && mapped.some((tenant) => tenant.id === current)) {
          logger.log('[TenantContext] Keeping current active tenant:', current);
          return current;
        }
        
        // Try to restore from localStorage if current is not set or invalid
        if (!current || !mapped.some((tenant) => tenant.id === current)) {
          try {
            const saved = localStorage.getItem('hustleStudio_activeTenant');
            if (saved && mapped.some((tenant) => tenant.id === saved)) {
              logger.log('[TenantContext] Restoring active tenant from localStorage:', saved);
              return saved;
            }
          } catch (error) {
            logger.warn('[TenantContext] Failed to restore from localStorage:', error);
          }
        }
        
        // Default to first tenant
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

  // Persist active tenant ID to localStorage
  useEffect(() => {
    if (activeTenantId) {
      try {
        localStorage.setItem('hustleStudio_activeTenant', activeTenantId);
        logger.log('[TenantContext] Saved active tenant to localStorage:', activeTenantId);
      } catch (error) {
        logger.warn('[TenantContext] Failed to save active tenant to localStorage:', error);
      }
    } else {
      try {
        localStorage.removeItem('hustleStudio_activeTenant');
        logger.log('[TenantContext] Cleared active tenant from localStorage');
      } catch (error) {
        logger.warn('[TenantContext] Failed to clear active tenant from localStorage:', error);
      }
    }
  }, [activeTenantId]);

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

  const updateWorkspace = useCallback(
    async (updates) => {
      if (!activeTenantId) {
        toast.error('Select a workspace first.');
        return;
      }
      try {
        await setDoc(
          doc(db, 'tenants', activeTenantId),
          {
            ...updates,
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        );
        await hydrateTenants();
        toast.success('Workspace updated');
      } catch (error) {
        logger.error('[Tenant] Failed to update workspace', error);
        toast.error('Unable to update workspace.');
        throw error;
      }
    },
    [activeTenantId, hydrateTenants]
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
        
        // Log event
        try {
          await logEvent(tenantRef.id, user.uid, 'Created Workspace', { name });
        } catch (logError) {
          logger.warn('[TenantContext] Failed to log event:', logError);
        }
        
        // Directly verify the documents were created before proceeding
        logger.log('[TenantContext] Verifying workspace creation...');
        let verified = false;
        let verifyRetries = 5;
        
        while (verifyRetries > 0 && !verified) {
          try {
            const tenantDoc = await getDoc(tenantRef);
            const memberDoc = await getDoc(memberRef);
            
            if (tenantDoc.exists() && memberDoc.exists()) {
              verified = true;
              logger.log('[TenantContext] Workspace documents verified');
            } else {
              logger.warn('[TenantContext] Documents not yet available, waiting...');
              await new Promise(resolve => setTimeout(resolve, 300));
              verifyRetries--;
            }
          } catch (verifyError) {
            logger.warn('[TenantContext] Verification attempt failed:', verifyError);
            verifyRetries--;
            if (verifyRetries > 0) {
              await new Promise(resolve => setTimeout(resolve, 300));
            }
          }
        }
        
        if (!verified) {
          logger.error('[TenantContext] Could not verify workspace creation');
          throw new Error('Workspace creation could not be verified');
        }
        
        // Retry logic to load the new workspace
        let retries = 5;
        let workspaceLoaded = false;
        
        while (retries > 0 && !workspaceLoaded) {
          logger.log('[TenantContext] Loading workspace, attempt:', 6 - retries);
          
          // Refresh memberships
          const loadedMemberships = await refreshMemberships(user.uid);
          logger.log('[TenantContext] Memberships loaded:', loadedMemberships.length);
          
          // Small delay to allow state update
          await new Promise(resolve => setTimeout(resolve, 200));
          
          // Check if the new tenant is in memberships
          if (loadedMemberships.some(m => m.tenantId === tenantRef.id)) {
            // Force hydrate tenants
            const tenants = await hydrateTenants();
            logger.log('[TenantContext] Tenants hydrated:', tenants.length);
            
            if (tenants.some(t => t.id === tenantRef.id)) {
              workspaceLoaded = true;
              logger.log('[TenantContext] New workspace successfully loaded');
              break;
            }
          }
          
          logger.warn('[TenantContext] Workspace not yet loaded, retrying...');
          retries--;
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
        
        if (!workspaceLoaded) {
          logger.error('[TenantContext] Failed to load new workspace after all retries');
          toast.warning('Workspace created! Refreshing to load it...');
          // Force a page reload as a fallback
          window.location.reload();
          return tenantRef.id;
        }
        
        // Switch to new tenant
        setActiveTenantId(tenantRef.id);
        logger.log('[TenantContext] Switched to new tenant:', tenantRef.id);
        
        toast.success(`Workspace "${name}" created successfully!`);
        
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
      updateWorkspace,
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
    updateWorkspace,
  ]);

  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
};

TenantProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

export const useTenant = () => useContext(TenantContext);
