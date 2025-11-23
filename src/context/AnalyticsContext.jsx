import { createContext, useContext, useEffect, useMemo, useRef } from 'react';
import PropTypes from 'prop-types';
import { useLocation } from 'react-router-dom';
import { logEvent as logTelemetryEvent, setTelemetryOptIn, installClientErrorTelemetry } from '../lib/telemetryEngine.js';
import { useTenant } from './TenantContext.jsx';
import { useAuth } from './AuthContext.jsx';

const AnalyticsContext = createContext({
  track: async () => {},
});

export const useAnalytics = () => useContext(AnalyticsContext);

export const AnalyticsProvider = ({ children }) => {
  const location = useLocation();
  const { activeTenant } = useTenant();
  const { user } = useAuth();
  const tenantId = activeTenant?.id ?? 'none';
  const userId = user?.uid ?? 'guest';
  const sessionStartPathRef = useRef(location.pathname);

  useEffect(() => {
    setTelemetryOptIn(tenantId, activeTenant?.telemetryEnabled);
  }, [tenantId, activeTenant?.telemetryEnabled]);

  useEffect(() => {
    const cleanup = installClientErrorTelemetry();
    return cleanup;
  }, []);

  useEffect(() => {
    sessionStartPathRef.current = location.pathname;
  }, [location.pathname]);

  useEffect(() => {
    logTelemetryEvent(tenantId, userId, 'session_start', {
      path: sessionStartPathRef.current,
    });
    return () => {
      logTelemetryEvent(tenantId, userId, 'session_end');
    };
  }, [tenantId, userId]);

  useEffect(() => {
    logTelemetryEvent(tenantId, userId, 'page_view', {
      path: location.pathname,
    });
  }, [tenantId, userId, location.pathname]);

  const value = useMemo(
    () => ({
      track: (type, payload = {}) => logTelemetryEvent(tenantId, userId, type, payload),
    }),
    [tenantId, userId]
  );

  return <AnalyticsContext.Provider value={value}>{children}</AnalyticsContext.Provider>;
};

AnalyticsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
