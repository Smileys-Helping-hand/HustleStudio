import { useEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import logger from '../lib/logger.js';

/**
 * PerformanceMonitor - Tracks page load times and navigation performance
 * Logs metrics in development and can send to analytics in production
 */
export default function PerformanceMonitor() {
  const location = useLocation();
  const navigationStart = useRef(Date.now());
  const previousPath = useRef(location.pathname);

  // Track page navigation performance
  useEffect(() => {
    const navEnd = Date.now();
    const navDuration = navEnd - navigationStart.current;

    if (previousPath.current !== location.pathname) {
      logger.log(`[Performance] Navigation to ${location.pathname} took ${navDuration}ms`);
      
      // Track in analytics if available
      if (window.gtag) {
        window.gtag('event', 'page_navigation', {
          page_path: location.pathname,
          duration_ms: navDuration,
        });
      }

      previousPath.current = location.pathname;
      navigationStart.current = navEnd;
    }
  }, [location.pathname]);

  // Track Web Vitals when available
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint (LCP)
      const lcpObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        logger.log(`[Performance] LCP: ${lastEntry.renderTime || lastEntry.loadTime}ms`);
      });

      // First Input Delay (FID)
      const fidObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          logger.log(`[Performance] FID: ${entry.processingStart - entry.startTime}ms`);
        });
      });

      // Cumulative Layout Shift (CLS)
      let clsScore = 0;
      const clsObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          if (!entry.hadRecentInput) {
            clsScore += entry.value;
          }
        });
        logger.log(`[Performance] CLS: ${clsScore.toFixed(4)}`);
      });

      try {
        lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
        fidObserver.observe({ type: 'first-input', buffered: true });
        clsObserver.observe({ type: 'layout-shift', buffered: true });
      } catch (e) {
        // Some browsers might not support all metrics
        logger.warn('[Performance] Some metrics not available:', e.message);
      }

      return () => {
        lcpObserver.disconnect();
        fidObserver.disconnect();
        clsObserver.disconnect();
      };
    }
  }, []);

  // Track long tasks
  useEffect(() => {
    if ('PerformanceObserver' in window) {
      const longTaskObserver = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        entries.forEach((entry) => {
          logger.warn(`[Performance] Long task detected: ${entry.duration.toFixed(0)}ms`);
        });
      });

      try {
        longTaskObserver.observe({ type: 'longtask', buffered: true });
      } catch (e) {
        // longtask might not be supported
      }

      return () => longTaskObserver.disconnect();
    }
  }, []);

  return null; // This component doesn't render anything
}
