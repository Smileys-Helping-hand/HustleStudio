import React from 'react';
import { FiAlertTriangle, FiRefreshCw, FiMail } from 'react-icons/fi';
import logger from '../lib/logger.js';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null, errorId: null };
  }

  static getDerivedStateFromError(error) {
    return { error, errorId: `err-${Date.now()}` };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    
    // Log error to console (production-safe logger)
    logger.error('[ErrorBoundary] Caught error:', error, info);
    
    // Log to Firebase or external error tracking service
    this.logErrorToService(error, info);
  }

  logErrorToService(error, info) {
    try {
      // In production, send to Firebase or error tracking service
      const errorData = {
        message: error.message,
        stack: error.stack,
        componentStack: info?.componentStack,
        timestamp: new Date().toISOString(),
        userAgent: navigator.userAgent,
        url: window.location.href,
      };

      // Log to Firebase Analytics if available
      if (window.gtag) {
        window.gtag('event', 'exception', {
          description: error.message,
          fatal: true,
        });
      }

      logger.log('[ErrorBoundary] Error logged:', errorData);
    } catch (loggingError) {
      logger.error('[ErrorBoundary] Failed to log error:', loggingError);
    }
  }

  handleRefresh = () => {
    window.location.reload();
  };

  handleReport = () => {
    const { error, errorId } = this.state;
    const subject = `Error Report: ${errorId}`;
    const body = `Error ID: ${errorId}%0A%0AError Message: ${error?.message || 'Unknown error'}%0A%0APlease describe what you were doing when this error occurred:%0A%0A`;
    window.location.href = `mailto:support@hustlestudio.co.za?subject=${subject}&body=${body}`;
  };

  render() {
    const { error, info, errorId } = this.state;
    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-gradient-to-br from-[#0a0a14] via-[#14122a] to-[#1e1640]">
          <div className="max-w-2xl w-full rounded-2xl border border-red-500/30 bg-black/80 backdrop-blur-xl p-8 shadow-2xl">
            <div className="flex items-start gap-4">
              <div className="rounded-full bg-red-500/20 p-3">
                <FiAlertTriangle className="w-8 h-8 text-red-400" />
              </div>
              <div className="flex-1">
                <h2 className="text-2xl font-bold text-white mb-2">Something went wrong</h2>
                <p className="text-white/70 mb-1">
                  We're sorry for the inconvenience. The application encountered an unexpected error.
                </p>
                <p className="text-xs text-white/50 mb-4">Error ID: {errorId}</p>
                
                <div className="flex flex-wrap gap-3 mb-6">
                  <button
                    onClick={this.handleRefresh}
                    className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 hover:scale-105"
                  >
                    <FiRefreshCw className="w-4 h-4" />
                    Refresh Page
                  </button>
                  <button
                    onClick={this.handleReport}
                    className="flex items-center gap-2 rounded-lg border border-white/20 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    <FiMail className="w-4 h-4" />
                    Report Issue
                  </button>
                </div>

                {import.meta.env.DEV && (
                  <>
                    <details className="mt-4">
                      <summary className="cursor-pointer text-sm font-medium text-red-300 hover:text-red-200">
                        Error Details (Dev Mode)
                      </summary>
                      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap rounded-lg bg-black/60 p-4 text-xs text-white/80 border border-red-500/20">
                        {String(error && (error.stack || error.message || error))}
                      </pre>
                    </details>
                    {info?.componentStack && (
                      <details className="mt-2">
                        <summary className="cursor-pointer text-sm font-medium text-red-300 hover:text-red-200">
                          Component Stack
                        </summary>
                        <pre className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-black/60 p-4 text-xs text-white/60 border border-red-500/20">
                          {info.componentStack}
                        </pre>
                      </details>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
