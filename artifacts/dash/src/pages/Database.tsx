import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import TopBar from "../components/TopBar";
import { StatCard, DataTable } from "../components/Cards";
import { dbApi } from "../lib/api";
import { API } from "../lib/config";

/** Railway Postgres SSOT tables (Drizzle shared/schema.ts) — not D1 / not legacy VPS MySQL */
const SSOT_TABLES = [
  "users",
  "accounts",
  "characters",
  "account_inventory",
  "account_resources",
  "home_islands",
  "player_ships",
  "character_professions",
  "parties",
  "player_resources",
  "uuid_ledger",
  "gbux_transactions",
  "linked_wallets",
  "world_zones",
  "player_blocks",
];

export default function DatabasePage() {
  const tables = useQuery({ queryKey: ["db-tables"], queryFn: dbApi.tables });
  const stats = useQuery({ queryKey: ["db-stats"], queryFn: dbApi.stats });

  return (
    <div>
      <TopBar title="Database tables" />

      <p className="text-sm text-muted-foreground mb-4 max-w-3xl">
        Authoritative game state is <span className="text-primary font-semibold">Railway Postgres</span> (
        <code className="text-xs">{API.api}</code>
        ). Legacy VPS MySQL may still hold parallel tables — see{" "}
        <Link href="/settings" className="text-primary hover:underline">
          Settings → Database connections
        </Link>{" "}
        for the full map (Neon host, D1, R2, Supabase).
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="◆" value={tables.data?.length ?? SSOT_TABLES.length} label="Tables" />
        <StatCard icon="📊" value={stats.data?.totalRows ?? "—"} label="Total Rows" />
        <StatCard icon="💾" value={stats.data?.dbSize ?? "—"} label="DB Size" />
        <StatCard icon="⚡" value={stats.data?.redisKeys ?? "—"} label="Redis Keys" />
      </div>

      <section className="mb-6">
        <h2 className="text-lg mb-3">Tables</h2>
        {tables.data ? (
          <DataTable
            columns={[
              { key: "name", label: "Table" },
              { key: "rows", label: "Rows" },
              { key: "size", label: "Size" },
              { key: "engine", label: "Engine" },
            ]}
            rows={tables.data}
          />
        ) : (
          <div className="inset-panel overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-3 py-2 text-[0.65rem] uppercase tracking-wider text-primary font-bold">
                    Table
                  </th>
                  <th className="text-left px-3 py-2 text-[0.65rem] uppercase tracking-wider text-primary font-bold">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {SSOT_TABLES.map((t) => (
                  <tr key={t} className="border-b border-border/50">
                    <td className="px-3 py-1.5 text-foreground text-xs font-mono">{t}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">
                      {tables.isError ? "API unreachable" : "Loading…"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {tables.isError && (
        <div className="inset-panel p-4 text-sm text-danger space-y-2">
          <p>Could not list tables via admin DB API (expected if route is admin-only or not exposed).</p>
          <p className="text-muted-foreground">
            Connection topology is still available without live table stats on{" "}
            <Link href="/settings" className="text-primary hover:underline">
              Settings
            </Link>
            .
          </p>
        </div>
      )}
    </div>
  );
}
