import { useEffect, useState } from "react";
import { Activity, CheckCircle, XCircle, Clock } from "lucide-react";

interface HealthCheck {
  status: "ok" | "degraded" | "down";
  timestamp: string;
  checks: {
    name: string;
    status: "pass" | "fail";
    message?: string;
    duration_ms?: number;
  }[];
  meta: {
    version: string;
    environment: string;
    uptime_ms: number;
  };
}

/**
 * Client-side health status page.
 * Performs basic health checks of the dashboard and its dependencies.
 */
export default function HealthPage() {
  const [health, setHealth] = useState<HealthCheck | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    runHealthChecks();
  }, []);

  async function runHealthChecks() {
    setLoading(true);
    const startTime = performance.now();
    const checks: HealthCheck["checks"] = [];

    // Check 1: API connectivity
    try {
      const apiStart = performance.now();
      const res = await fetch("/api/health", {
        signal: AbortSignal.timeout(5000),
      });
      checks.push({
        name: "Railway API",
        status: res.ok ? "pass" : "fail",
        message: res.ok ? "Connected" : `HTTP ${res.status}`,
        duration_ms: Math.round(performance.now() - apiStart),
      });
    } catch (e) {
      checks.push({
        name: "Railway API",
        status: "fail",
        message: e instanceof Error ? e.message : "Connection failed",
      });
    }

    // Check 2: Local storage
    try {
      localStorage.setItem("health_check", Date.now().toString());
      localStorage.removeItem("health_check");
      checks.push({
        name: "Local Storage",
        status: "pass",
        message: "Available",
      });
    } catch {
      checks.push({
        name: "Local Storage",
        status: "fail",
        message: "Unavailable or disabled",
      });
    }

    // Check 3: Session storage
    try {
      sessionStorage.setItem("health_check", Date.now().toString());
      sessionStorage.removeItem("health_check");
      checks.push({
        name: "Session Storage",
        status: "pass",
        message: "Available",
      });
    } catch {
      checks.push({
        name: "Session Storage",
        status: "fail",
        message: "Unavailable or disabled",
      });
    }

    // Check 4: Network connection
    checks.push({
      name: "Network Status",
      status: navigator.onLine ? "pass" : "fail",
      message: navigator.onLine ? "Online" : "Offline",
    });

    // Determine overall status
    const failCount = checks.filter((c) => c.status === "fail").length;
    let status: HealthCheck["status"] = "ok";
    if (failCount > 0 && failCount < checks.length) status = "degraded";
    if (failCount === checks.length) status = "down";

    setHealth({
      status,
      timestamp: new Date().toISOString(),
      checks,
      meta: {
        version: import.meta.env.VITE_APP_VERSION || "dev",
        environment: import.meta.env.MODE,
        uptime_ms: Math.round(performance.now()),
      },
    });
    setLoading(false);
  }

  if (loading) {
    return (
      <div className="fantasy-panel p-8 space-y-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Activity className="animate-spin" size={20} />
          <span>Running health checks...</span>
        </div>
      </div>
    );
  }

  if (!health) {
    return (
      <div className="fantasy-panel p-8 space-y-4">
        <p className="text-muted-foreground">Health check failed to initialize.</p>
      </div>
    );
  }

  const statusColor = {
    ok: "text-success",
    degraded: "text-warning",
    down: "text-danger",
  }[health.status];

  const statusBg = {
    ok: "bg-success/10 border-success/30",
    degraded: "bg-warning/10 border-warning/30",
    down: "bg-danger/10 border-danger/30",
  }[health.status];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl gold-text mb-2">Dashboard Health</h1>
        <p className="text-muted-foreground">
          Real-time health status and diagnostics
        </p>
      </div>

      <div className={`fantasy-panel p-6 border ${statusBg}`}>
        <div className="flex items-center gap-3 mb-2">
          <Activity className={statusColor} size={24} />
          <h2 className={`text-xl font-bold ${statusColor}`}>
            Status: {health.status.toUpperCase()}
          </h2>
        </div>
        <p className="text-sm text-muted-foreground">
          Last checked: {new Date(health.timestamp).toLocaleString()}
        </p>
      </div>

      <div className="fantasy-panel p-6 space-y-4">
        <h3 className="text-lg font-semibold mb-4">Health Checks</h3>
        <div className="space-y-3">
          {health.checks.map((check, i) => (
            <div
              key={i}
              className="flex items-start justify-between p-3 rounded border border-border bg-muted/30"
            >
              <div className="flex items-center gap-3">
                {check.status === "pass" ? (
                  <CheckCircle className="text-success" size={20} />
                ) : (
                  <XCircle className="text-danger" size={20} />
                )}
                <div>
                  <p className="font-medium">{check.name}</p>
                  <p className="text-sm text-muted-foreground">{check.message}</p>
                </div>
              </div>
              {check.duration_ms && (
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Clock size={12} />
                  {check.duration_ms}ms
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="fantasy-panel p-6">
        <h3 className="text-lg font-semibold mb-4">System Information</h3>
        <dl className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <dt className="text-muted-foreground">Version</dt>
            <dd className="font-mono">{health.meta.version}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Environment</dt>
            <dd className="font-mono">{health.meta.environment}</dd>
          </div>
          <div>
            <dt className="text-muted-foreground">Client Uptime</dt>
            <dd className="font-mono">
              {Math.round(health.meta.uptime_ms / 1000)}s
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">User Agent</dt>
            <dd className="font-mono text-xs truncate">
              {navigator.userAgent}
            </dd>
          </div>
        </dl>
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={() => runHealthChecks()}
          className="px-4 py-2 bg-primary text-primary-foreground rounded hover:bg-primary/90 transition-colors"
        >
          Rerun Health Checks
        </button>
      </div>
    </div>
  );
}
