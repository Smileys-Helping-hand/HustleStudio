// Business Notifications Manager Component
// Provides a centralized service for running periodic business checks

import { useEffect, useRef } from 'react';
import { useTenant } from '../context/TenantContext.jsx';
import { useNotify } from '../context/NotificationContext.jsx';
import { runBusinessChecks } from '../lib/businessNotifications.js';

/**
 * Business Notifications Manager
 * Runs automated checks for business events every 5 minutes
 * Place this component in your App.jsx to enable automatic notifications
 */
export default function BusinessNotificationsManager() {
  const { activeTenantId } = useTenant();
  const notify = useNotify();
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!activeTenantId || !notify) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Run checks immediately on mount
    runBusinessChecks(activeTenantId, notify);

    // Then run checks every 5 minutes
    intervalRef.current = setInterval(() => {
      runBusinessChecks(activeTenantId, notify);
    }, 5 * 60 * 1000); // 5 minutes

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [activeTenantId, notify]);

  // This component doesn't render anything
  return null;
}
