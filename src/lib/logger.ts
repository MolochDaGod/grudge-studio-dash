/**
 * Structured logging utility for client-side error tracking and telemetry.
 * Production-ready logging with structured JSON output for observability.
 */

export type LogLevel = "debug" | "info" | "warn" | "error" | "fatal";
export type LogContext = Record<string, unknown>;

export interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
  meta: {
    userAgent: string;
    url: string;
    hostname: string;
  };
}

class Logger {
  private isDevelopment = import.meta.env.DEV;

  private createEntry(
    level: LogLevel,
    message: string,
    context?: LogContext,
    error?: Error,
  ): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      context,
      error: error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : undefined,
      meta: {
        userAgent: navigator.userAgent,
        url: window.location.href,
        hostname: window.location.hostname,
      },
    };
  }

  private log(entry: LogEntry): void {
    // Console output for development
    if (this.isDevelopment) {
      const style = this.getConsoleStyle(entry.level);
      console.log(
        `%c[${entry.level.toUpperCase()}]%c ${entry.message}`,
        style,
        "color: inherit",
        entry.context || "",
        entry.error || "",
      );
    } else {
      // JSON output for production observability
      console.log(JSON.stringify(entry));
    }

    // Ship to observability backend in production
    if (!this.isDevelopment && entry.level === "error" || entry.level === "fatal") {
      this.shipToBackend(entry);
    }
  }

  private getConsoleStyle(level: LogLevel): string {
    const styles: Record<LogLevel, string> = {
      debug: "color: #888",
      info: "color: #0ea5e9",
      warn: "color: #f59e0b; font-weight: bold",
      error: "color: #ef4444; font-weight: bold",
      fatal: "color: #dc2626; font-weight: bold; background: #fee",
    };
    return styles[level] || "";
  }

  private shipToBackend(entry: LogEntry): void {
    // Send to observability backend (future: Sentry, Datadog, custom endpoint)
    try {
      fetch("/api/logs/client", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(entry),
        keepalive: true,
      }).catch(() => {
        // Silently fail if backend unavailable
      });
    } catch {
      // Silently fail
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log(this.createEntry("debug", message, context));
  }

  info(message: string, context?: LogContext): void {
    this.log(this.createEntry("info", message, context));
  }

  warn(message: string, context?: LogContext): void {
    this.log(this.createEntry("warn", message, context));
  }

  error(message: string, error?: Error, context?: LogContext): void {
    this.log(this.createEntry("error", message, context, error));
  }

  fatal(message: string, error?: Error, context?: LogContext): void {
    this.log(this.createEntry("fatal", message, context, error));
  }
}

export const logger = new Logger();

/**
 * Telemetry hook for tracking user interactions and performance metrics.
 */
export function trackEvent(
  event: string,
  properties?: Record<string, unknown>,
): void {
  logger.info(`Event: ${event}`, properties);
}

/**
 * Performance monitoring helper.
 */
export function trackPerformance(
  metric: string,
  duration: number,
  context?: LogContext,
): void {
  logger.info(`Performance: ${metric}`, {
    ...context,
    duration_ms: duration,
  });
}
