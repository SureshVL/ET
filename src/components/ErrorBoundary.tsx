import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export default class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      let isQuotaError = false;
      let errorMessage = 'Something went wrong. Please try again later.';

      try {
        const errorData = JSON.parse(this.state.error?.message || '{}');
        if (errorData.error && errorData.error.includes('Quota limit exceeded')) {
          isQuotaError = true;
          errorMessage = 'Daily database limit reached. The application will be fully functional again tomorrow when the quota resets.';
        }
      } catch (e) {
        // Not a JSON error
        if (this.state.error?.message.includes('Quota limit exceeded')) {
          isQuotaError = true;
          errorMessage = 'Daily database limit reached. The application will be fully functional again tomorrow when the quota resets.';
        }
      }

      return (
        <div className="min-h-screen bg-brand-secondary/30 flex items-center justify-center p-4">
          <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl p-8 text-center border border-brand-primary/5">
            <div className="w-20 h-20 bg-brand-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertTriangle size={40} className="text-brand-primary" />
            </div>
            
            <h2 className="text-2xl font-serif mb-4">
              {isQuotaError ? 'Daily Limit Reached' : 'Oops! Something went wrong'}
            </h2>
            
            <p className="text-gray-500 mb-8 leading-relaxed">
              {errorMessage}
            </p>

            <div className="space-y-4">
              <button
                onClick={this.handleReset}
                className="w-full flex items-center justify-center gap-2 bg-brand-primary text-white px-8 py-4 rounded-full font-bold hover:opacity-90 transition-all active:scale-95"
              >
                <RefreshCcw size={18} />
                Refresh Page
              </button>
              
              <a
                href="/"
                className="block text-sm font-bold text-brand-primary hover:opacity-70 transition-all"
              >
                Back to Home
              </a>
            </div>

            {isQuotaError && (
              <div className="mt-8 pt-8 border-t border-brand-primary/5">
                <p className="text-[10px] uppercase tracking-widest text-gray-400">
                  Note: This is a free tier limitation and will reset automatically.
                </p>
              </div>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
