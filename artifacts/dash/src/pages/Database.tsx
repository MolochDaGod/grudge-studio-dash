import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import {
  Database,
  ExternalLink,
  RefreshCw,
  TableProperties,
  Search,
  ShieldCheck,
  AlertTriangle,
} from "lucide-react";
import TopBar from "../components/TopBar";
import { StatCard, DataTable } from "../components/Cards";
import { dbApi, checkDeployment } from "../lib/api";
import { API } from "../lib/config";
import {
  GAME_DATABASES,
  RAILWAY_SSOT_TABLES,
  ENGINE_LABEL,
  ROLE_LABEL,
  type GameDatabase,
  type DbRole,
} from "../lib/gameDatabases";

type HubTab = "map" | "tables" | "browse" | "health";

const ROLE_COLOR: Record<DbRole, string> = {
  ssot: "text-success",
  cache: "text-muted-foreground",
  index: "text-primary",
  defs: "text-warning",
  binary: "text-gold-light",
  legacy: "text-danger",
  auth: "text-primary",
};

function roleBadge(role: DbRole) {
  return (
    <span className={`text-[0.6rem] font-bold uppercase tracking-wide ${ROLE_COLOR[role]}`}>
      {ROLE_LABEL[role]}
    </span>
  );
}

export default function DatabasePage() {
  const [tab, setTab] = useState<HubTab>("map");
  const [selectedTable, setSelectedTable] = useState<string>("characters");
  const [gameFilter, setGameFilter] = useState<string>("all");

  const tables = useQuery({ queryKey: ["db-tables"], queryFn: dbApi.tables, retry: 1 });
  const stats = useQuery({ queryKey: ["db-stats"], queryFn: dbApi.stats, retry: 1 });
  const tableRows = useQuery({
    queryKey: ["db-table", selectedTable],
    queryFn: () => dbApi.tableData(selectedTable, 40),
    enabled: tab === "browse" && selectedTable.length > 0,
    retry: 1,
  });

  const health = useQuery({
    queryKey: ["db-endpoints-health"],
    queryFn: async () => {
      const probes = GAME_DATABASES.filter((d) => d.endpoint && d.healthPath);
      return Promise.all(
        probes.map(async (d) => {
          const st = await checkDeployment(d.endpoint!, d.healthPath || "/");
          return { id: d.id, label: d.label, ...st };
        }),
      );
    },
    refetchInterval: 60_000,
    enabled: tab === "health" || tab === "map",
  });

  const games = useMemo(() => {
    const set = new Set(GAME_DATABASES.map((d) => d.game));
    return ["all", ...Array.from(set)];
  }, []);

  const filtered = useMemo(() => {
    if (gameFilter === "all") return GAME_DATABASES;
    return GAME_DATABASES.filter((d) => d.game === gameFilter);
  }, [gameFilter]);

  const onlineCount = health.data?.filter((h) => h.online).length ?? 0;
  const ssotCount = GAME_DATABASES.filter((d) => d.role === "ssot").length;

  const tableList: Array<{ name: string; rows?: number | string; size?: string; engine?: string }> =
    tables.data?.map((t: any) => ({
      name: t.name ?? t.table_name ?? t.table ?? String(t),
      rows: t.rows ?? t.row_count ?? t.n_live_tup ?? "—",
      size: t.size ?? t.total_size ?? "—",
      engine: t.engine ?? "postgres",
    })) ??
    RAILWAY_SSOT_TABLES.map((name) => ({
      name,
      rows: tables.isError ? "API down" : "…",
      size: "—",
      engine: "postgres",
    }));

  const browseColumns =
    tableRows.data && tableRows.data.length > 0
      ? Object.keys(tableRows.data[0]).slice(0, 12).map((k) => ({ key: k, label: k }))
      : [];

  const tabs: { id: HubTab; label: string }[] = [
    { id: "map", label: "Game DB map" },
    { id: "tables", label: "Postgres tables" },
    { id: "browse", label: "Browse rows" },
    { id: "health", label: "Endpoint health" },
  ];

  return (
    <div>
      <TopBar title="Game Databases" />

      <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
        Studio data plane for every game.{" "}
        <strong className="text-primary">Player state SSOT</strong> is Railway Postgres (
        <code className="text-xs">{API.api}</code>
        ). Asset indexes live in D1; definitions in ObjectStore; binaries on R2. Never treat Puter KV or
        D1 game-state as authoritative characters.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon={<Database size={22} className="mx-auto text-primary" />} value={GAME_DATABASES.length} label="DB targets" />
        <StatCard icon={<ShieldCheck size={22} className="mx-auto text-success" />} value={ssotCount} label="SSOT sources" />
        <StatCard
          icon="📊"
          value={tables.data?.length ?? RAILWAY_SSOT_TABLES.length}
          label="Postgres tables"
        />
        <StatCard
          icon="⚡"
          value={health.data ? `${onlineCount}/${health.data.length}` : "—"}
          label="Endpoints up"
        />
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs rounded border transition-colors ${
              tab === t.id
                ? "border-primary text-primary bg-accent"
                : "border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {t.label}
          </button>
        ))}
        <Link
          href="/schema"
          className="px-3 py-1.5 text-xs rounded border border-border text-muted-foreground hover:text-primary inline-flex items-center gap-1"
        >
          <TableProperties size={12} /> Schema
        </Link>
        <Link
          href="/query"
          className="px-3 py-1.5 text-xs rounded border border-border text-muted-foreground hover:text-primary inline-flex items-center gap-1"
        >
          <Search size={12} /> SQL Query
        </Link>
      </div>

      {tab === "map" && (
        <section className="space-y-4">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-muted-foreground">Filter by game:</span>
            {games.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => setGameFilter(g)}
                className={`px-2 py-0.5 text-[0.65rem] rounded border ${
                  gameFilter === g
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground"
                }`}
              >
                {g === "all" ? "All" : g}
              </button>
            ))}
          </div>

          <div className="grid gap-3">
            {filtered.map((db: GameDatabase) => {
              const h = health.data?.find((x) => x.id === db.id);
              return (
                <div key={db.id} className="fantasy-panel p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2 mb-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-foreground">{db.label}</h3>
                        {roleBadge(db.role)}
                        <span className="text-[0.65rem] text-muted-foreground">
                          {ENGINE_LABEL[db.engine]}
                        </span>
                      </div>
                      <p className="text-[0.7rem] text-muted-foreground mt-0.5">{db.game}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {h && (
                        <span
                          className={`text-[0.65rem] ${h.online ? "text-success" : "text-danger"}`}
                        >
                          {h.online ? `Up ${h.ms}ms` : h.error || "Down"}
                        </span>
                      )}
                      {db.dashPath && (
                        <Link href={db.dashPath} className="text-[0.65rem] text-primary hover:underline">
                          Open in dash
                        </Link>
                      )}
                      {db.endpoint && (
                        <a
                          href={db.endpoint}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[0.65rem] text-muted-foreground hover:text-primary inline-flex items-center gap-0.5"
                        >
                          Endpoint <ExternalLink size={10} />
                        </a>
                      )}
                    </div>
                  </div>
                  {db.notes && <p className="text-xs text-muted-foreground mb-2">{db.notes}</p>}
                  {db.tables && db.tables.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {db.tables.slice(0, 16).map((t) => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setSelectedTable(t);
                            setTab("browse");
                          }}
                          className="text-[0.6rem] font-mono px-1.5 py-0.5 rounded bg-accent/60 text-muted-foreground hover:text-primary"
                        >
                          {t}
                        </button>
                      ))}
                      {db.tables.length > 16 && (
                        <span className="text-[0.6rem] text-muted-foreground">
                          +{db.tables.length - 16}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      )}

      {tab === "tables" && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg">Railway Postgres tables</h2>
            <button
              type="button"
              className="text-xs text-primary flex items-center gap-1"
              onClick={() => {
                void tables.refetch();
                void stats.refetch();
              }}
            >
              <RefreshCw size={12} /> Refresh
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
            <StatCard icon="◆" value={stats.data?.totalRows ?? "—"} label="Total rows" />
            <StatCard icon="💾" value={stats.data?.dbSize ?? "—"} label="DB size" />
            <StatCard icon="⚡" value={stats.data?.redisKeys ?? "—"} label="Redis keys" />
          </div>
          {tables.isError && (
            <div className="inset-panel p-3 mb-3 text-sm text-danger flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                Admin DB list unreachable (auth or route). Showing canonical SSOT table names.
                Use{" "}
                <Link href="/query" className="text-primary underline">
                  SQL Query
                </Link>{" "}
                with an admin token, or check{" "}
                <Link href="/settings" className="text-primary underline">
                  Settings → connections
                </Link>
                .
              </div>
            </div>
          )}
          <DataTable
            columns={[
              { key: "name", label: "Table" },
              { key: "rows", label: "Rows" },
              { key: "size", label: "Size" },
              { key: "engine", label: "Engine" },
            ]}
            rows={tableList}
            emptyMsg="No tables"
          />
          <p className="text-xs text-muted-foreground mt-2">
            Click a table name in Browse tab to inspect rows (admin API).
          </p>
        </section>
      )}

      {tab === "browse" && (
        <section>
          <div className="flex flex-wrap items-center gap-2 mb-4">
            <label className="text-xs text-muted-foreground">Table</label>
            <select
              value={selectedTable}
              onChange={(e) => setSelectedTable(e.target.value)}
              className="bg-input border border-border rounded px-2 py-1.5 text-sm font-mono"
            >
              {(tables.data
                ? tableList.map((t) => t.name)
                : [...RAILWAY_SSOT_TABLES]
              ).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => void tableRows.refetch()}
              className="gilded-button px-3 py-1.5 text-xs"
            >
              Load 40 rows
            </button>
          </div>
          {tableRows.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
          {tableRows.isError && (
            <div className="inset-panel p-4 text-sm text-danger">
              Could not load <code>{selectedTable}</code> — admin token +{" "}
              <code>/api/admin/db/tables/:name</code> required.
            </div>
          )}
          {tableRows.data && browseColumns.length > 0 && (
            <DataTable columns={browseColumns} rows={tableRows.data} emptyMsg="Empty table" />
          )}
          {tableRows.data && tableRows.data.length === 0 && (
            <div className="inset-panel p-4 text-sm text-muted-foreground">Table is empty.</div>
          )}
        </section>
      )}

      {tab === "health" && (
        <section>
          <h2 className="text-lg mb-3">Database-related endpoints</h2>
          {health.isLoading && <p className="text-sm text-muted-foreground">Probing…</p>}
          <div className="grid gap-2">
            {(health.data ?? []).map((h) => (
              <div
                key={h.id}
                className="fantasy-panel p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{h.label}</p>
                  <p className="text-[0.65rem] text-muted-foreground truncate">{h.probeUrl}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className={`text-xs font-semibold ${h.online ? "text-success" : "text-danger"}`}>
                    {h.online ? "UP" : "DOWN"}
                  </span>
                  <p className="text-[0.6rem] text-muted-foreground">{h.ms}ms</p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
