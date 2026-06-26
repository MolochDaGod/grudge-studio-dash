import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { checkAllHealth } from "../lib/api";
import { SERVICES } from "../lib/config";
import { Clock } from "lucide-react";
import { useState, useEffect } from "react";

export default function Services() {
  const health = useQuery({ queryKey: ["health"], queryFn: checkAllHealth, refetchInterval: 30_000 });
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  useEffect(() => {
    if (health.dataUpdatedAt) setLastChecked(new Date(health.dataUpdatedAt));
  }, [health.dataUpdatedAt]);

  return (
    <div>
      <TopBar title="Services" />

      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-6">
        <Clock size={12} />
        {lastChecked ? `Last checked: ${lastChecked.toLocaleTimeString()}` : "Checking..."}
        <span className="ml-2">• Auto-refresh every 30s</span>
      </div>

      <div className="space-y-4">
        {SERVICES.map((svc) => {
          const result = health.data?.find((h) => h.key === svc.key);
          const ok = result?.ok ?? false;
          const ms = result?.ms ?? 0;

          return (
            <div key={svc.key} className="fantasy-panel p-5">
              <div className="flex items-center gap-4">
                <span
                  className={`w-4 h-4 rounded-full shrink-0 ${ok ? "bg-success animate-pulse-dot" : "bg-danger"}`}
                  style={{ boxShadow: ok ? "0 0 12px hsl(142 71% 45%)" : "0 0 12px hsl(0 84% 60%)" }}
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">{svc.name}</h3>
                    <span className={`text-xs font-bold ${ok ? "text-success" : "text-danger"}`}>
                      {ok ? "ONLINE" : "OFFLINE"}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{svc.description}</p>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4 mt-4 pt-3 border-t border-border/50">
                <div>
                  <p className="text-[0.6rem] uppercase text-muted-foreground">Response Time</p>
                  <p className="text-sm font-semibold">{ms}ms</p>
                </div>
                <div>
                  <p className="text-[0.6rem] uppercase text-muted-foreground">Endpoint</p>
                  <p className="text-sm font-semibold truncate">
                    {svc.url}{svc.key === "survival" ? "/api/health" : "/health"}
                  </p>
                </div>
                <div>
                  <p className="text-[0.6rem] uppercase text-muted-foreground">Status</p>
                  <p className={`text-sm font-semibold ${ok ? "text-success" : "text-danger"}`}>{ok ? "Healthy" : result?.error ? "Error" : "Unreachable"}</p>
                </div>
              </div>

              {result?.error && (
                <div className="mt-2 p-2 bg-destructive/10 border border-destructive/30 rounded text-xs text-danger">
                  {result.error}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
