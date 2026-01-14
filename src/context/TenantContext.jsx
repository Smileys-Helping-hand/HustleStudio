import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { toast } from 'react-hot-toast';
import { useAuth } from './AuthContext.jsx';
import { getBrandConfig } from '../config/branding.js';
import logger from '../lib/logger.js';

const TenantContext = createContext({
  tenants: [],
  activeTenantId: null,
  activeTenant: null,
  activeMembership: null,
  loading: false,
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
  const { user } = useAuth();
  const [tenantSummaries, setTenantSummaries] = useState([]);
  const [activeTenantId, setActiveTenantId] = useState(() => {
    try {
      const saved = localStorage.getItem('hustleStudio_activeTenant');
      return saved || null;
    } catch (error) {
      logger.warn('[TenantContext] Failed to restore active tenant from localStorage:', error);
      return null;
    }
  });
  const [loading, setLoading] = useState(false);
  const [presence] = useState([]);

  // Initialize default workspace if needed
  useEffect(() => {
    if (user && tenantSummaries.length === 0) {
      const defaultWorkspace = {
        id: 'default',
        role: 'Owner',
        name: 'My Workspace',
        accent: '#6366f1',
        logo: null,
        plan: 'free',
        branding: null,
        domain: '',
        telemetryEnabled: true,
      };
      setTenantSummaries([defaultWorkspace]);
      if (!activeTenantId) {
        setActiveTenantId('default');
      }
    } else if (!user) {
      setTenantSummaries([]);
      setActiveTenantId(null);
    }
  }, [user, activeTenantId, tenantSummaries.length]);

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
        // Update local state
        setTenantSummaries((prev) =>
          prev.map((t) =>
            t.id === activeTenantId
              ? { ...t, branding, logo: branding?.logo, accent: branding?.colors?.accent || t.accent }
              : t
          )
        );
        toast.success('Branding updated');
      } catch (error) {
        logger.error('[Tenant] Failed to save branding', error);
        toast.error('Unable to save branding.');
      }
    },
    [activeTenantId]
  );

  const updateTelemetryPreference = useCallback(
    async (enabled) => {
      if (!activeTenantId) {
        toast.error('Select a workspace first.');
        return;
      }
      const nextValue = !!enabled;
      try {
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
        setTenantSummaries((prev) =>
          prev.map((t) => (t.id === activeTenantId ? { ...t, ...updates } : t))
        );
        toast.success('Workspace updated');
      } catch (error) {
        logger.error('[Tenant] Failed to update workspace', error);
        toast.error('Unable to update workspace.');
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

        const newTenant = {
          id: `workspace-${Date.now()}`,
          name: name || 'New Workspace',
          accent: accent || '#6366f1',
          role: 'Owner',
          logo: null,
          plan: 'free',
          branding: null,
          domain: '',
          telemetryEnabled: true,
        };

        setTenantSummaries((prev) => [...prev, newTenant]);
        setActiveTenantId(newTenant.id);

        toast.success(`Workspace "${name}" created successfully!`);

        return newTenant.id;
      } catch (error) {
        logger.error('[TenantContext] Failed to create workspace:', error);
        toast.error('Failed to create workspace. Please try again.');
        throw error;
      }
    },
    [user]
  );

  const refreshTenants = useCallback(async () => {
    logger.log('[TenantContext] Refresh tenants called');
    // No-op for now - will be implemented with API
  }, []);

  const value = useMemo(() => {
    const activeTenant = tenantSummaries.find((tenant) => tenant.id === activeTenantId) ?? null;
    const brand = getBrandConfig(activeTenant?.id, activeTenant?.branding);
    const activeMembership = activeTenant ? { tenantId: activeTenant.id, role: activeTenant.role } : null;

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
