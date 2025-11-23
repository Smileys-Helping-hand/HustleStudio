import React from 'react';

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    this.setState({ error, info });
    // You could also log to a remote service here
    // console.error('[ErrorBoundary] Caught error:', error, info);
  }

  render() {
    const { error, info } = this.state;
    if (error) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[var(--theme-background)] text-[var(--theme-text)]">
          <div className="max-w-2xl rounded-xl border border-red-600/30 bg-black/60 p-6">
            <h2 className="text-xl font-semibold text-red-300">Something went wrong</h2>
            <pre className="mt-4 max-h-64 overflow-auto whitespace-pre-wrap text-sm text-white/80">{String(error && (error.stack || error.message || error))}</pre>
            {info?.componentStack && (
              <details className="mt-4 text-xs text-white/60">
                <summary>Component stack</summary>
                <pre className="whitespace-pre-wrap">{info.componentStack}</pre>
              </details>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
