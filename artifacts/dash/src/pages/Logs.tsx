import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { DataTable } from "../components/Cards";
import { accountApi } from "../lib/api";
import { useState } from "react";

const FILTERS = ["All", "login", "logout", "create", "update", "delete", "link_account"] as const;

export default function Logs() {
  const [filter, setFilter] = useState<string>("All");
  const auditLog = useQuery({ queryKey: ["logs"], queryFn: accountApi.auditLog, refetchInterval: 30_000 });

  const filtered = auditLog.data
    ? filter === "All"
      ? auditLog.data
      : auditLog.data.filter((entry: any) => entry.action === filter)
    : [];

  return (
    <div>
      <TopBar title="Logs" />

      <p className="text-sm text-muted-foreground mb-4">
        System audit log from the account service. Auto-refreshes every 30s.
      </p>

      {/* Filter bar */}
      <div className="flex gap-1 mb-4 flex-wrap">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs rounded transition-colors ${
              filter === f
                ? "bg-primary text-primary-foreground font-bold"
                : "bg-secondary text-muted-foreground hover:text-foreground"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      {auditLog.isLoading && <p className="text-sm text-muted-foreground">Loading logs...</p>}

      {auditLog.isError && (
        <div className="inset-panel p-4 text-sm text-danger">
          Could not load audit log — ensure Account API is running.
        </div>
      )}

      {auditLog.data && (
        <>
          <p className="text-xs text-muted-foreground mb-2">
            Showing {filtered.length} of {auditLog.data.length} entries
          </p>
          <DataTable
            columns={[
              { key: "timestamp", label: "Time" },
              { key: "user_id", label: "User" },
              { key: "action", label: "Action" },
              { key: "ip_address", label: "IP" },
              { key: "details", label: "Details" },
            ]}
            rows={filtered.slice(0, 100)}
            emptyMsg="No log entries match this filter"
          />
        </>
      )}
    </div>
  );
}
