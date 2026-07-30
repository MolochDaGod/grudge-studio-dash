import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "wouter";
import TopBar from "../components/TopBar";
import { DataTable, StatCard } from "../components/Cards";
import { accountApi } from "../lib/api";
import { roleLevel, ROLE_LEVELS, API } from "../lib/config";
import { Search, Shield, Ban, UserCog, RefreshCw } from "lucide-react";

type AccountTab = "users" | "sessions" | "audit" | "roles";

export default function Accounts() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [lookupId, setLookupId] = useState("");
  const [submittedLookup, setSubmittedLookup] = useState("");
  const [tab, setTab] = useState<AccountTab>("users");
  const [selectedUserId, setSelectedUserId] = useState<string | number | null>(null);
  const [roleDraft, setRoleDraft] = useState("member");
  const [banReason, setBanReason] = useState("");
  const [actionMsg, setActionMsg] = useState("");

  const accounts = useQuery({
    queryKey: ["accounts", search, page],
    queryFn: () => accountApi.list(search || undefined, page, 50),
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

  const detail = useQuery({
    queryKey: ["account-detail", selectedUserId],
    queryFn: () => accountApi.byId(selectedUserId!),
    enabled: selectedUserId != null,
  });

  const sessions = useQuery({
    queryKey: ["sessions"],
    queryFn: accountApi.sessions,
    enabled: tab === "sessions",
  });
  const auditLog = useQuery({
    queryKey: ["audit-log"],
    queryFn: accountApi.auditLog,
    enabled: tab === "audit",
  });

  const banMut = useMutation({
    mutationFn: ({ id, banned }: { id: string | number; banned: boolean }) =>
      accountApi.banUser(id, banned, banReason || undefined),
    onSuccess: () => {
      setActionMsg("Ban state updated");
      void qc.invalidateQueries({ queryKey: ["accounts"] });
      void qc.invalidateQueries({ queryKey: ["account-detail"] });
    },
    onError: (e: Error) => setActionMsg(e.message),
  });

  const roleMut = useMutation({
    mutationFn: ({ id, role }: { id: string | number; role: string }) =>
      accountApi.setRole(id, role),
    onSuccess: () => {
      setActionMsg("Role updated");
      void qc.invalidateQueries({ queryKey: ["accounts"] });
      void qc.invalidateQueries({ queryKey: ["account-detail"] });
    },
    onError: (e: Error) => setActionMsg(e.message),
  });

  const s = stats.data?.stats;
  const users = accounts.data?.users ?? [];
  const total = accounts.data?.pagination?.total ?? users.length;

  const roleBreakdown = useMemo(() => {
    const rb = s?.roleBreakdown ?? {};
    return Object.entries(rb).sort((a, b) => Number(b[1]) - Number(a[1]));
  }, [s]);

  return (
    <div>
      <TopBar title="Accounts" />

      <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
        Cross-ecosystem identity directory on Game API (
        <code className="text-xs">{API.api}</code>
        ). Roles, bans, Warlords characters, Survival (Grudox) saves, and linked wallets. SSO mint is{" "}
        <a href={API.auth} className="text-primary hover:underline" target="_blank" rel="noreferrer">
          id.grudge-studio.com
        </a>
        .
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="👥" value={s?.totalUsers ?? total ?? "—"} label="Total Users" />
        <StatCard icon="🔋" value={s?.activeUsers24h ?? "—"} label="Active 24h" />
        <StatCard icon="⚿" value={s?.totalCharacters ?? "—"} label="Characters" />
        <StatCard icon="🚫" value={s?.bannedUsers ?? "—"} label="Banned" />
      </div>

      {/* Lookup */}
      <section className="fantasy-panel p-4 mb-6">
        <h2 className="text-sm font-semibold mb-3 flex items-center gap-2">
          <Search size={14} /> Account lookup by Grudge ID
        </h2>
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
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="inset-panel p-3 space-y-1">
              <p className="text-xs uppercase text-muted-foreground mb-2">Identity</p>
              {profile.data.source === "survival" && (
                <p className="text-xs text-warning mb-2">Survival-only — no Game API user row</p>
              )}
              <p>
                <span className="text-muted-foreground">Username:</span>{" "}
                {profile.data.username ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Grudge ID:</span>{" "}
                {profile.data.grudgeId ?? submittedLookup}
              </p>
              <p>
                <span className="text-muted-foreground">Role:</span> {profile.data.role ?? "—"}{" "}
                <span className="text-primary">(L{roleLevel(profile.data.role)})</span>
              </p>
              <p>
                <span className="text-muted-foreground">Email:</span> {profile.data.email ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Wallet:</span>{" "}
                <span className="font-mono text-xs break-all">
                  {profile.data.walletAddress ?? "—"}
                </span>
              </p>
              <p>
                <span className="text-muted-foreground">Last login:</span>{" "}
                {profile.data.lastLoginAt ?? "—"}
              </p>
              {profile.data.id != null && (
                <button
                  type="button"
                  className="mt-2 text-xs text-primary hover:underline"
                  onClick={() => {
                    setSelectedUserId(profile.data!.id!);
                    setTab("users");
                  }}
                >
                  Open admin actions →
                </button>
              )}
            </div>
            <div className="inset-panel p-3 space-y-1">
              <p className="text-xs uppercase text-muted-foreground mb-2">
                Warlords characters ({profile.data.characters?.length ?? 0})
              </p>
              <ul className="text-xs font-mono max-h-36 overflow-auto space-y-1">
                {(profile.data.characters ?? []).map((c: any, i: number) => (
                  <li key={i} className="border-b border-border/30 py-0.5">
                    {c.name ?? c.id} · L{c.level ?? "?"} · {c.race ?? "?"}
                  </li>
                ))}
                {!(profile.data.characters?.length) && (
                  <li className="text-muted-foreground">None</li>
                )}
              </ul>
              <Link href="/characters" className="text-[0.65rem] text-primary hover:underline inline-block mt-2">
                Characters page →
              </Link>
            </div>
            <div className="inset-panel p-3 space-y-1">
              <p className="text-xs uppercase text-muted-foreground mb-2">Grudox / Survival</p>
              {profile.data.survival?.account ? (
                <>
                  <p>
                    <span className="text-muted-foreground">Account:</span>{" "}
                    {profile.data.survival.account.id}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Display:</span>{" "}
                    {profile.data.survival.account.displayName ?? "—"}
                  </p>
                  <p>
                    <span className="text-muted-foreground">Chars:</span>{" "}
                    {profile.data.survival.characters?.length ?? 0}
                  </p>
                </>
              ) : (
                <p className="text-muted-foreground text-xs">No Survival row for this grudgeId</p>
              )}
              {(profile.data.wallets?.length ?? 0) > 0 && (
                <p className="mt-2 text-xs">
                  <span className="text-muted-foreground">Linked wallets:</span>{" "}
                  {profile.data.wallets!.length}
                </p>
              )}
            </div>
          </div>
        )}
        {submittedLookup && !profile.isFetching && profile.isError && (
          <p className="text-sm text-danger mt-3">
            Lookup failed — check admin token and grudgeId.
          </p>
        )}
      </section>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            ["users", "Users"],
            ["sessions", "Sessions"],
            ["audit", "Audit log"],
            ["roles", "Role map"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`px-3 py-1.5 text-xs rounded border ${
              tab === id
                ? "border-primary text-primary bg-accent"
                : "border-border text-muted-foreground"
            }`}
          >
            {label}
          </button>
        ))}
        <button
          type="button"
          onClick={() => void accounts.refetch()}
          className="ml-auto text-xs text-primary flex items-center gap-1"
        >
          <RefreshCw size={12} /> Refresh
        </button>
      </div>

      {tab === "users" && (
        <section className="mb-6">
          <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
            <h2 className="text-lg">Users</h2>
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search username, email, grudgeId…"
              className="bg-input border border-border rounded px-3 py-1.5 text-sm w-64"
            />
          </div>
          {accounts.isLoading && <p className="text-muted-foreground text-sm">Loading accounts…</p>}
          {accounts.isError && (
            <div className="inset-panel p-4 text-sm text-danger">
              Failed to load accounts — sign in with an admin token. Endpoint:{" "}
              <code className="text-xs">/api/admin/users</code>
            </div>
          )}
          {users.length > 0 && (
            <>
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
                  isBanned: u.isBanned ? "yes" : "no",
                }))}
                emptyMsg="No accounts found"
              />
              <div className="flex items-center gap-2 mt-3 text-xs">
                <button
                  type="button"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  className="px-2 py-1 border border-border rounded disabled:opacity-40"
                >
                  Prev
                </button>
                <span className="text-muted-foreground">
                  Page {page} · {total} total
                </span>
                <button
                  type="button"
                  disabled={users.length < 50}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-2 py-1 border border-border rounded disabled:opacity-40"
                >
                  Next
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="text-xs text-muted-foreground self-center">Select for admin:</span>
                <select
                  className="bg-input border border-border rounded px-2 py-1 text-xs"
                  value={selectedUserId ?? ""}
                  onChange={(e) =>
                    setSelectedUserId(e.target.value ? e.target.value : null)
                  }
                >
                  <option value="">— user —</option>
                  {users.map((u) => (
                    <option key={String(u.id)} value={String(u.id)}>
                      {u.username ?? u.id} ({u.grudgeId ?? "no-gid"})
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

          {selectedUserId != null && (
            <div className="fantasy-panel p-4 mt-4 space-y-3">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <UserCog size={14} /> Admin actions · user {selectedUserId}
              </h3>
              {detail.data?.user && (
                <p className="text-xs text-muted-foreground">
                  {detail.data.user.username} · {detail.data.user.role} ·{" "}
                  {detail.data.characters?.length ?? 0} characters ·{" "}
                  {detail.data.wallets?.length ?? 0} wallets
                </p>
              )}
              <div className="flex flex-wrap gap-3 items-end">
                <div>
                  <label className="text-[0.65rem] text-muted-foreground block mb-1">Role</label>
                  <select
                    value={roleDraft}
                    onChange={(e) => setRoleDraft(e.target.value)}
                    className="bg-input border border-border rounded px-2 py-1.5 text-sm"
                  >
                    {Object.keys(ROLE_LEVELS).map((r) => (
                      <option key={r} value={r}>
                        {r} (L{ROLE_LEVELS[r]})
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="gilded-button px-3 py-1.5 text-xs flex items-center gap-1"
                  disabled={roleMut.isPending}
                  onClick={() =>
                    roleMut.mutate({ id: selectedUserId, role: roleDraft })
                  }
                >
                  <Shield size={12} /> Set role
                </button>
                <div className="flex-1 min-w-[12rem]">
                  <label className="text-[0.65rem] text-muted-foreground block mb-1">
                    Ban reason
                  </label>
                  <input
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    className="w-full bg-input border border-border rounded px-2 py-1.5 text-sm"
                    placeholder="Optional reason"
                  />
                </div>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs border border-danger text-danger rounded flex items-center gap-1"
                  disabled={banMut.isPending}
                  onClick={() => banMut.mutate({ id: selectedUserId, banned: true })}
                >
                  <Ban size={12} /> Ban
                </button>
                <button
                  type="button"
                  className="px-3 py-1.5 text-xs border border-success text-success rounded"
                  disabled={banMut.isPending}
                  onClick={() => banMut.mutate({ id: selectedUserId, banned: false })}
                >
                  Unban
                </button>
              </div>
              {actionMsg && (
                <p className="text-xs text-muted-foreground">{actionMsg}</p>
              )}
              {(detail.data?.characters?.length ?? 0) > 0 && (
                <div>
                  <p className="text-xs uppercase text-muted-foreground mb-1">Characters</p>
                  <ul className="text-xs font-mono max-h-28 overflow-auto">
                    {detail.data!.characters.map((c: any, i: number) => (
                      <li key={i}>
                        {c.name ?? c.id} · L{c.level ?? "?"}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      )}

      {tab === "sessions" && (
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
      )}

      {tab === "audit" && (
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
      )}

      {tab === "roles" && (
        <section>
          <h2 className="text-lg mb-3">Role hierarchy</h2>
          <div className="fantasy-panel p-4 mb-4">
            <p className="text-xs text-muted-foreground mb-3">
              Mirrors Game API <code>ROLE_LEVELS</code> — higher level wins for admin gates.
            </p>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {Object.entries(ROLE_LEVELS).map(([role, level]) => (
                <div key={role} className="inset-panel p-3 flex justify-between text-sm">
                  <span className="font-mono">{role}</span>
                  <span className="text-primary">L{level}</span>
                </div>
              ))}
            </div>
          </div>
          {roleBreakdown.length > 0 && (
            <>
              <h3 className="text-sm font-semibold mb-2">Live breakdown</h3>
              <DataTable
                columns={[
                  { key: "role", label: "Role" },
                  { key: "count", label: "Users" },
                ]}
                rows={roleBreakdown.map(([role, count]) => ({ role, count }))}
              />
            </>
          )}
        </section>
      )}
    </div>
  );
}
