import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 text-white font-sans selection:bg-indigo-500/30">
          <div className="relative max-w-md w-full bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-2xl p-8 text-center shadow-2xl overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 -left-12 w-32 h-32 bg-indigo-500/10 rounded-full blur-2xl"></div>
            <div className="absolute -bottom-12 -right-12 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl"></div>

            {/* Icon */}
            <div className="mx-auto w-16 h-16 bg-rose-500/10 border border-rose-500/20 rounded-full flex items-center justify-center mb-6">
              <svg className="w-8 h-8 text-rose-500 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>

            {/* Title & Description */}
            <h1 className="text-2xl font-bold text-slate-100 mb-2">Something went wrong</h1>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Smart Document Agent encountered an unexpected error. Don't worry, your documents and sessions are safe.
            </p>

            {/* Error Detail (collapsed/scrollable) */}
            {this.state.error && (
              <div className="bg-slate-950/80 border border-slate-800/50 rounded-lg p-3 text-left mb-6 overflow-x-auto max-h-32 text-xs font-mono text-rose-400/90 scrollbar-thin">
                {this.state.error.toString()}
              </div>
            )}

            {/* Actions */}
            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-indigo-600 hover:from-indigo-600 hover:to-indigo-700 active:scale-[0.98] text-white font-medium rounded-xl transition duration-200 shadow-lg shadow-indigo-500/20 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              Refresh Application
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
