import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { RefreshCw, Search, UserCircle2 } from "lucide-react";
import TopBar from "../components/TopBar";
import { DataTable, StatCard } from "../components/Cards";
import { adminApi, accountApi, gameApi, survivalApi } from "../lib/api";
import { API } from "../lib/config";

type SourceTab = "warlords" | "accounts" | "grudox";

function pick(row: Record<string, unknown>, keys: string[]): unknown {
  for (const k of keys) {
    if (row[k] != null && row[k] !== "") return row[k];
  }
  return "—";
}

export default function CharactersPage() {
  const [tab, setTab] = useState<SourceTab>("warlords");
  const [search, setSearch] = useState("");
  const [lookup, setLookup] = useState("");
  const [submitted, setSubmitted] = useState("");

  const stats = useQuery({
    queryKey: ["char-stats"],
    queryFn: adminApi.gameStats,
    refetchInterval: 60_000,
  });

  const warlords = useQuery({
    queryKey: ["characters-list"],
    queryFn: gameApi.characters,
    enabled: tab === "warlords",
    retry: 1,
  });

  const accounts = useQuery({
    queryKey: ["accounts-for-chars", search],
    queryFn: () => accountApi.list(search || undefined, 1, 40),
    enabled: tab === "accounts",
  });

  const profile = useQuery({
    queryKey: ["char-profile", submitted],
    queryFn: () => accountApi.profileByGrudgeId(submitted),
    enabled: submitted.length >= 3,
  });

  const engine = useQuery({
    queryKey: ["engine-manifest"],
    queryFn: survivalApi.engineManifest,
    enabled: tab === "grudox",
    staleTime: 5 * 60_000,
  });

  const filteredWarlords = useMemo(() => {
    const list = Array.isArray(warlords.data) ? warlords.data : [];
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((c: any) =>
      JSON.stringify(c).toLowerCase().includes(q),
    );
  }, [warlords.data, search]);

  const warlordRows = filteredWarlords.slice(0, 100).map((c: any) => ({
    id: pick(c, ["id", "characterId", "character_id"]),
    name: pick(c, ["name", "displayName", "characterName"]),
    race: pick(c, ["race", "raceId", "race_id"]),
    class: pick(c, ["class", "classId", "class_id", "heroClass"]),
    level: pick(c, ["level", "lvl"]),
    gold: pick(c, ["gold", "currency", "coins"]),
    owner: pick(c, ["userId", "user_id", "grudgeId", "grudge_id", "accountId"]),
    updated: pick(c, ["updatedAt", "updated_at", "lastPlayedAt", "last_played_at"]),
  }));

  const totalChars = stats.data?.stats?.totalCharacters ?? warlordRows.length ?? "—";

  return (
    <div>
      <TopBar title="Characters" />

      <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
        Cross-game character inventory. Warlords / open-world heroes live on Railway Game API (
        <code className="text-xs">{API.api}</code>
        ). Grudox / Survival uses a separate API. Lookup by Grudge ID joins both.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<UserCircle2 size={22} className="mx-auto text-primary" />} value={totalChars} label="Characters (stats)" />
        <StatCard icon="👥" value={stats.data?.stats?.totalUsers ?? "—"} label="Users" />
        <StatCard icon="⚔️" value={Array.isArray(warlords.data) ? warlords.data.length : "—"} label="API list size" />
        <StatCard icon="◈" value={profile.data?.survival?.characters?.length ?? "—"} label="Last lookup (Grudox)" />
      </div>

      <section className="fantasy-panel p-4 mb-6">
        <h2 className="text-sm font-semibold mb-3">Lookup by Grudge ID</h2>
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            setSubmitted(lookup.trim());
          }}
        >
          <input
            type="text"
            value={lookup}
            onChange={(e) => setLookup(e.target.value)}
            placeholder="grudgeId — guest_*, puter_*, GRG-*"
            className="flex-1 bg-input border border-border rounded px-3 py-2 text-sm"
          />
          <button type="submit" className="gilded-button px-4 py-2 text-xs flex items-center gap-1">
            <Search size={14} /> Lookup
          </button>
        </form>
        {profile.isFetching && (
          <p className="text-xs text-muted-foreground mt-3">Loading Game API + Survival…</p>
        )}
        {profile.data && (
          <div className="mt-4 grid md:grid-cols-2 gap-4 text-sm">
            <div className="inset-panel p-3">
              <p className="text-xs uppercase text-muted-foreground mb-2">Warlords / Game API</p>
              <p>
                <span className="text-muted-foreground">User:</span>{" "}
                {profile.data.username ?? "—"} · {profile.data.role ?? "—"}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Characters ({profile.data.characters?.length ?? 0})
              </p>
              <ul className="mt-1 space-y-1 max-h-40 overflow-auto text-xs font-mono">
                {(profile.data.characters ?? []).map((c: any, i: number) => (
                  <li key={i} className="border-b border-border/40 py-1">
                    {c.name ?? c.displayName ?? c.id} · L{c.level ?? "?"} · {c.race ?? "?"} /{" "}
                    {c.class ?? c.classId ?? "?"}
                  </li>
                ))}
                {(profile.data.characters ?? []).length === 0 && (
                  <li className="text-muted-foreground">None on Game API</li>
                )}
              </ul>
            </div>
            <div className="inset-panel p-3">
              <p className="text-xs uppercase text-muted-foreground mb-2">Grudox / Survival</p>
              <p>
                <span className="text-muted-foreground">Account:</span>{" "}
                {profile.data.survival?.account?.displayName ??
                  profile.data.survival?.account?.id ??
                  "—"}
              </p>
              <ul className="mt-2 space-y-1 max-h-40 overflow-auto text-xs font-mono">
                {(profile.data.survival?.characters ?? []).map((c: any, i: number) => (
                  <li key={i} className="border-b border-border/40 py-1">
                    {c.name ?? c.id} · {c.classId ?? c.class ?? "?"}
                  </li>
                ))}
                {!(profile.data.survival?.characters?.length) && (
                  <li className="text-muted-foreground">No Survival characters</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </section>

      <div className="flex flex-wrap gap-2 mb-4">
        {(
          [
            ["warlords", "Warlords list"],
            ["accounts", "Via accounts"],
            ["grudox", "Grudox engine"],
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
        <Link href="/accounts" className="px-3 py-1.5 text-xs text-primary hover:underline ml-auto">
          → Accounts
        </Link>
        <Link href="/database" className="px-3 py-1.5 text-xs text-primary hover:underline">
          → Databases
        </Link>
      </div>

      {tab === "warlords" && (
        <section>
          <div className="flex items-center gap-3 mb-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter characters…"
              className="bg-input border border-border rounded px-3 py-1.5 text-sm w-64"
            />
            <button
              type="button"
              onClick={() => void warlords.refetch()}
              className="text-xs text-primary flex items-center gap-1"
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          {warlords.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {warlords.isError && (
            <div className="inset-panel p-4 text-sm text-danger">
              Character list failed — endpoint may require auth or return a different shape.
              Use Grudge ID lookup above or{" "}
              <Link href="/query" className="underline text-primary">
                SQL Query
              </Link>
              .
            </div>
          )}
          {warlordRows.length > 0 && (
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                { key: "race", label: "Race" },
                { key: "class", label: "Class" },
                { key: "level", label: "Level" },
                { key: "gold", label: "Gold" },
                { key: "owner", label: "Owner" },
                { key: "updated", label: "Updated" },
              ]}
              rows={warlordRows}
              emptyMsg="No characters"
            />
          )}
        </section>
      )}

      {tab === "accounts" && (
        <section>
          <div className="flex gap-2 mb-3">
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users…"
              className="bg-input border border-border rounded px-3 py-1.5 text-sm w-64"
            />
          </div>
          {accounts.isError && (
            <div className="inset-panel p-4 text-sm text-danger">Admin users API failed.</div>
          )}
          {(accounts.data?.users ?? []).length > 0 && (
            <DataTable
              columns={[
                { key: "id", label: "ID" },
                { key: "username", label: "Username" },
                { key: "grudgeId", label: "Grudge ID" },
                { key: "role", label: "Role" },
                { key: "lastLoginAt", label: "Last login" },
              ]}
              rows={accounts.data!.users}
              emptyMsg="No users"
            />
          )}
          <p className="text-xs text-muted-foreground mt-2">
            Select a grudgeId in lookup to load that account&apos;s character roster.
          </p>
        </section>
      )}

      {tab === "grudox" && (
        <section className="space-y-3">
          <div className="fantasy-panel p-4 text-sm">
            <p className="text-muted-foreground mb-2">
              Survival API: <code className="text-xs">{API.survival}</code>
            </p>
            {engine.data ? (
              <div className="grid sm:grid-cols-2 gap-3 text-xs">
                <p>
                  <span className="text-muted-foreground">Manifest:</span> v{engine.data.version} ·{" "}
                  {engine.data.era}
                </p>
                <p>
                  <span className="text-muted-foreground">Controllers:</span>{" "}
                  {engine.data.controllers.length}
                </p>
                <p>
                  <span className="text-muted-foreground">Anim libs:</span>{" "}
                  {engine.data.animationLibraries.length}
                </p>
                <p>
                  <span className="text-muted-foreground">Updated:</span> {engine.data.updatedAt}
                </p>
              </div>
            ) : (
              <p className="text-muted-foreground text-xs">
                {engine.isError ? "Engine manifest unavailable" : "Loading engine manifest…"}
              </p>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            Per-account Grudox characters load via Grudge ID lookup (Survival API). There is no
            global public character dump.
          </p>
        </section>
      )}
    </div>
  );
}
