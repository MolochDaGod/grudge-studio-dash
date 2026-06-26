import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { StatCard, DataTable } from "../components/Cards";
import { dbApi } from "../lib/api";

// Actual tables from packages/database/src/schema.ts (Drizzle ORM)
const KNOWN_TABLES = [
  "users", "characters", "inventory_items", "crafted_items",
  "unlocked_skills", "unlocked_recipes", "crafting_jobs", "shop_transactions",
  "islands", "ai_agents", "game_sessions", "afk_jobs",
  "uuid_ledger", "resource_ledger", "auth_tokens", "battle_arena_stats",
];

export default function DatabasePage() {
  const tables = useQuery({ queryKey: ["db-tables"], queryFn: dbApi.tables });
  const stats = useQuery({ queryKey: ["db-stats"], queryFn: dbApi.stats });

  return (
    <div>
      <TopBar title="Database" />

      <p className="text-sm text-muted-foreground mb-6">
        MySQL database <span className="text-primary">grudge_game</span> on VPS — {KNOWN_TABLES.length} known tables. Redis cache active.
      </p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard icon="🗃️" value={tables.data?.length ?? KNOWN_TABLES.length} label="Tables" />
        <StatCard icon="📊" value={stats.data?.totalRows ?? "—"} label="Total Rows" />
        <StatCard icon="💾" value={stats.data?.dbSize ?? "—"} label="DB Size" />
        <StatCard icon="🔴" value={stats.data?.redisKeys ?? "—"} label="Redis Keys" />
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
                  <th className="text-left px-3 py-2 text-[0.65rem] uppercase tracking-wider text-primary font-bold">Table</th>
                  <th className="text-left px-3 py-2 text-[0.65rem] uppercase tracking-wider text-primary font-bold">Status</th>
                </tr>
              </thead>
              <tbody>
                {KNOWN_TABLES.map((t) => (
                  <tr key={t} className="border-b border-border/50">
                    <td className="px-3 py-1.5 text-foreground text-xs">{t}</td>
                    <td className="px-3 py-1.5 text-muted-foreground text-xs">
                      {tables.isError ? "Unreachable" : "Loading..."}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {tables.isError && (
        <div className="inset-panel p-4 text-sm text-danger">
          Could not connect to database API — ensure the /api/db proxy is configured on the Game API.
        </div>
      )}
    </div>
  );
}
