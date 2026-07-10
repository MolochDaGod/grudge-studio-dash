import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import TopBar from "../components/TopBar";
import { DataTable, StatCard } from "../components/Cards";
import { accountApi } from "../lib/api";
import { roleLevel, ROLE_LEVELS } from "../lib/config";
import { Search } from "lucide-react";

export default function Accounts() {
  const [search, setSearch] = useState("");
  const [lookupId, setLookupId] = useState("");
  const [submittedLookup, setSubmittedLookup] = useState("");

  const accounts = useQuery({
    queryKey: ["accounts", search],
    queryFn: () => accountApi.list(search || undefined, 1, 50),
    refetchInterval: 60_000,
  });

  const stats = useQuery({
    queryKey: ["id-stats"],
    queryFn: accountApi.identityStats,
    refetchInterval: 60_000,
  });

  const profile = useQuery({
    queryKey: ["account-profile", submittedLookup],
    queryFn: () => accountApi.profileByGrudgeId(submittedLookup),
    enabled: submittedLookup.length >= 3,
  });

  const sessions = useQuery({ queryKey: ["sessions"], queryFn: accountApi.sessions });
  const auditLog = useQuery({ queryKey: ["audit-log"], queryFn: accountApi.auditLog });

  const s = stats.data?.stats;
  const users = accounts.data?.users ?? [];

  return (
    <div>
      <TopBar title="Accounts" />

      <p className="text-sm text-muted-foreground mb-6">
        Cross-ecosystem accounts — role level, Warlords characters, Survival (Grudox) saves, linked wallets.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="👥" value={s?.totalUsers ?? "—"} label="Total Users" />
        <StatCard icon="🔋" value={s?.activeUsers24h ?? "—"} label="Active 24h" />
        <StatCard icon="⚿" value={s?.totalCharacters ?? "—"} label="Characters" />
        <StatCard icon="🚫" value={s?.bannedUsers ?? "—"} label="Banned" />
      </div>

      {/* GrudgeId lookup */}
      <section className="fantasy-panel p-4 mb-6">
        <h2 className="text-sm font-semibold mb-3">Account lookup by Grudge ID</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmittedLookup(lookupId.trim());
          }}
        >
          <input
            type="text"
            value={lookupId}
            onChange={(e) => setLookupId(e.target.value)}
            placeholder="grudgeId — guest_*, puter_*, or GRG-*"
            className="flex-1 bg-input border border-border rounded px-3 py-2 text-sm"
          />
          <button type="submit" className="gilded-button px-4 py-2 text-xs flex items-center gap-1">
            <Search size={14} /> Lookup
          </button>
        </form>
        {profile.isFetching && (
          <p className="text-xs text-muted-foreground mt-3">Querying Game API + Survival API…</p>
        )}
        {profile.data && (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="inset-panel p-3 space-y-1">
              <p className="text-xs uppercase text-muted-foreground mb-2">Identity (Game API)</p>
              {profile.data.source === "survival" && (
                <p className="text-xs text-muted-foreground mb-2">No Game API user — Survival-only account</p>
              )}
              <p><span className="text-muted-foreground">Username:</span> {profile.data.username ?? "—"}</p>
              <p><span className="text-muted-foreground">Grudge ID:</span> {profile.data.grudgeId ?? submittedLookup}</p>
              <p>
                <span className="text-muted-foreground">Role:</span>{" "}
                {profile.data.role ?? "—"}{" "}
                <span className="text-primary">(level {roleLevel(profile.data.role)})</span>
              </p>
              <p><span className="text-muted-foreground">Email:</span> {profile.data.email ?? "—"}</p>
              <p><span className="text-muted-foreground">Wallet:</span> {profile.data.walletAddress ?? "—"}</p>
              <p><span className="text-muted-foreground">Last login:</span> {profile.data.lastLoginAt ?? "—"}</p>
            </div>
            <div className="inset-panel p-3 space-y-1">
              <p className="text-xs uppercase text-muted-foreground mb-2">Grudox (Survival API)</p>
              {profile.data.survival?.account ? (
                <>
                  <p><span className="text-muted-foreground">Account ID:</span> {profile.data.survival.account.id}</p>
                  <p><span className="text-muted-foreground">Display:</span> {profile.data.survival.account.displayName ?? "—"}</p>
                  <p><span className="text-muted-foreground">Characters:</span> {profile.data.survival.characters?.length ?? 0}</p>
                </>
              ) : (
                <p className="text-muted-foreground">No Survival row for this grudgeId</p>
              )}
            </div>
          </div>
        )}
        {submittedLookup && !profile.isFetching && profile.isError && (
          <p className="text-sm text-danger mt-3">Lookup failed — check admin token and grudgeId.</p>
        )}
      </section>

      {/* Search + users table */}
      <section className="mb-6">
        <div className="flex items-center justify-between mb-3 gap-3">
          <h2 className="text-lg">Users</h2>
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search username, email, grudgeId…"
            className="bg-input border border-border rounded px-3 py-1.5 text-sm w-64"
          />
        </div>
        {accounts.isLoading && <p className="text-muted-foreground text-sm">Loading accounts…</p>}
        {accounts.isError && (
          <div className="inset-panel p-4 text-sm text-danger">
            Failed to load accounts — sign in with an admin token; endpoint is Railway /api/admin/users
          </div>
        )}
        {users.length > 0 && (
          <DataTable
            columns={[
              { key: "id", label: "ID" },
              { key: "username", label: "Username" },
              { key: "grudgeId", label: "Grudge ID" },
              { key: "role", label: "Role" },
              { key: "email", label: "Email" },
              { key: "isBanned", label: "Banned" },
              { key: "lastLoginAt", label: "Last login" },
            ]}
            rows={users.map((u) => ({
              ...u,
              role: u.role ? `${u.role} (L${roleLevel(u.role)})` : "—",
            }))}
            emptyMsg="No accounts found"
          />
        )}
        <p className="text-xs text-muted-foreground mt-2">
          Role levels: {Object.entries(ROLE_LEVELS).map(([k, v]) => `${k}=${v}`).join(", ")}
        </p>
      </section>

      <section className="mb-6">
        <h2 className="text-lg mb-3">Active Sessions</h2>
        {sessions.data && sessions.data.length > 0 ? (
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
        ) : (
          <div className="inset-panel p-4 text-sm text-muted-foreground">
            {sessions.isError ? "Could not load sessions" : "No active sessions"}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg mb-3">Audit Log</h2>
        {auditLog.data && auditLog.data.length > 0 ? (
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
        ) : (
          <div className="inset-panel p-4 text-sm text-muted-foreground">
            {auditLog.isError ? "Could not load audit log" : "No audit entries"}
          </div>
        )}
      </section>
    </div>
  );
}