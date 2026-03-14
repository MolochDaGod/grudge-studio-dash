import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { DataTable } from "../components/Cards";
import { accountApi } from "../lib/api";

export default function Accounts() {
  const accounts = useQuery({ queryKey: ["accounts"], queryFn: accountApi.list });
  const sessions = useQuery({ queryKey: ["sessions"], queryFn: accountApi.sessions });
  const auditLog = useQuery({ queryKey: ["audit-log"], queryFn: accountApi.auditLog });

  return (
    <div>
      <TopBar title="Accounts" />

      <p className="text-sm text-muted-foreground mb-6">
        Cross-ecosystem account management — Steam, Google, Discord, Solana linked accounts across all Grudge Studio games.
      </p>

      {/* Accounts table */}
      <section className="mb-6">
        <h2 className="text-lg mb-3">Users</h2>
        {accounts.isLoading && <p className="text-muted-foreground text-sm">Loading accounts...</p>}
        {accounts.isError && (
          <div className="inset-panel p-4 text-sm text-danger">
            Failed to load accounts — ensure Account API is running at account.grudge-studio.com
          </div>
        )}
        {accounts.data && (
          <DataTable
            columns={[
              { key: "id", label: "ID" },
              { key: "username", label: "Username" },
              { key: "email", label: "Email" },
              { key: "display_name", label: "Display Name" },
              { key: "wallet_address", label: "Wallet" },
              { key: "is_premium", label: "Premium" },
              { key: "created_at", label: "Created" },
            ]}
            rows={accounts.data}
            emptyMsg="No accounts found"
          />
        )}
      </section>

      {/* Active sessions */}
      <section className="mb-6">
        <h2 className="text-lg mb-3">Active Sessions</h2>
        {sessions.isError && (
          <div className="inset-panel p-4 text-sm text-danger">Could not load sessions</div>
        )}
        {sessions.data && (
          <DataTable
            columns={[
              { key: "user_id", label: "User" },
              { key: "game", label: "Game" },
              { key: "ip", label: "IP" },
              { key: "started_at", label: "Started" },
            ]}
            rows={sessions.data}
            emptyMsg="No active sessions"
          />
        )}
        {!sessions.data && !sessions.isError && (
          <div className="inset-panel p-4 text-sm text-muted-foreground">Loading sessions...</div>
        )}
      </section>

      {/* Audit log */}
      <section>
        <h2 className="text-lg mb-3">Audit Log</h2>
        {auditLog.data && (
          <DataTable
            columns={[
              { key: "timestamp", label: "Time" },
              { key: "user_id", label: "User" },
              { key: "action", label: "Action" },
              { key: "details", label: "Details" },
            ]}
            rows={auditLog.data.slice(0, 50)}
            emptyMsg="No audit entries"
          />
        )}
        {!auditLog.data && (
          <div className="inset-panel p-4 text-sm text-muted-foreground">
            {auditLog.isError ? "Could not load audit log" : "Loading..."}
          </div>
        )}
      </section>
    </div>
  );
}
