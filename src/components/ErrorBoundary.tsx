import { Component, type ReactNode, type ErrorInfo } from "react";
import { logger } from "../lib/logger";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * React Error Boundary with structured logging and telemetry.
 * Catches rendering errors and provides fallback UI.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    // Log to structured logger with full context
    logger.error("React Error Boundary caught error", error, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    this.setState({
      error,
      errorInfo,
    });
  }

  private handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  private handleGoHome = (): void => {
    window.location.href = "/";
  };

  render(): ReactNode {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      const isDev = import.meta.env.DEV;

      return (
        <div className="min-h-screen flex items-center justify-center bg-background p-6">
          <div className="fantasy-panel max-w-2xl w-full p-8 space-y-6">
            <div className="flex items-center gap-3 text-danger">
              <AlertTriangle size={32} />
              <h1 className="text-2xl font-bold">Something went wrong</h1>
            </div>

            <p className="text-muted-foreground">
              The dashboard encountered an unexpected error. Our team has been
              notified and is looking into it.
            </p>

            {isDev && this.state.error && (
              <div className="bg-muted/50 p-4 rounded border border-border">
                <h2 className="font-mono text-sm font-bold mb-2 text-danger">
                  Error Details (Dev Mode)
                </h2>
                <pre className="text-xs overflow-x-auto text-muted-foreground">
                  {this.state.error.toString()}
                </pre>
                {this.state.errorInfo?.componentStack && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-foreground">
                      Component Stack
                    </summary>
                    <pre className="text-[0.65rem] mt-2 overflow-x-auto text-muted-foreground">
                      {this.state.errorInfo.componentStack}
                    </pre>
                  </details>
                )}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
              >
                <RefreshCw size={16} />
                Reload Dashboard
              </button>
              <button
                type="button"
                onClick={this.handleGoHome}
                className="flex items-center gap-2 px-4 py-2 border border-border rounded hover:bg-accent transition-colors"
              >
                <Home size={16} />
                Go to Home
              </button>
            </div>

            <div className="text-xs text-muted-foreground">
              <p>If this problem persists:</p>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Try clearing your browser cache</li>
                <li>Check the browser console for more details</li>
                <li>Contact support with the error details above</li>
              </ul>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

/**
 * Hook to track errors in function components.
 * Use in useEffect or event handlers for explicit error tracking.
 */
export function useErrorTracking() {
  return {
    trackError: (error: Error, context?: Record<string, unknown>) => {
      logger.error("Component error tracked", error, context);
    },
  };
}
