import { useMutation } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { dbApi } from "../lib/api";
import { useState } from "react";
import { Play, Copy } from "lucide-react";

const EXAMPLE_QUERIES = [
  "SELECT COUNT(*) AS total FROM users;",
  "SELECT id, display_name, wallet_address FROM users LIMIT 20;",
  "SELECT c.id, c.name, c.race, c.class, u.display_name FROM characters c JOIN users u ON c.user_id = u.id LIMIT 20;",
  "SELECT table_name, table_rows FROM information_schema.tables WHERE table_schema = 'grudge_game';",
  "SELECT * FROM battle_arena_stats ORDER BY total_kills DESC LIMIT 10;",
];

export default function Query() {
  const [sql, setSql] = useState("");
  const [results, setResults] = useState<any[] | null>(null);
  const [error, setError] = useState("");
  const [execTime, setExecTime] = useState(0);

  const queryMut = useMutation({
    mutationFn: async (query: string) => {
      const start = performance.now();
      const data = await dbApi.query(query);
      setExecTime(Math.round(performance.now() - start));
      return data;
    },
    onSuccess: (data) => { setResults(data.rows ?? data); setError(""); },
    onError: (err: any) => { setError(err.message ?? "Query failed"); setResults(null); },
  });

  const run = () => {
    if (!sql.trim()) return;
    queryMut.mutate(sql.trim());
  };

  const columnKeys = results && results.length > 0 ? Object.keys(results[0]) : [];

  return (
    <div>
      <TopBar title="SQL Query" />

      <p className="text-sm text-muted-foreground mb-4">Run read-only queries against the Grudge database.</p>

      {/* Query input */}
      <div className="mb-4">
        <textarea
          value={sql}
          onChange={(e) => setSql(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) run(); }}
          className="w-full bg-input border border-border rounded p-3 text-sm text-foreground font-mono min-h-[120px]"
          placeholder="SELECT * FROM users LIMIT 10;"
        />
        <div className="flex items-center gap-3 mt-2">
          <button onClick={run} disabled={queryMut.isPending || !sql.trim()} className="gilded-button flex items-center gap-1 px-4 py-2 text-xs disabled:opacity-50">
            <Play size={14} /> {queryMut.isPending ? "Running..." : "Run Query"}
          </button>
          <span className="text-xs text-muted-foreground">Ctrl+Enter to execute</span>
          {results && <span className="text-xs text-muted-foreground ml-auto">{results.length} rows · {execTime}ms</span>}
        </div>
      </div>

      {error && <div className="inset-panel p-4 text-sm text-danger mb-4 font-mono">{error}</div>}

      {/* Results */}
      {results && results.length > 0 && (
        <section className="mb-6 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                {columnKeys.map((k) => (
                  <th key={k} className="text-left px-3 py-2 text-xs text-muted-foreground font-semibold">{k}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {results.map((row, i) => (
                <tr key={i} className="border-b border-border/50 hover:bg-white/5">
                  {columnKeys.map((k) => (
                    <td key={k} className="px-3 py-2 text-foreground/80">{String(row[k] ?? "NULL")}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {results && results.length === 0 && <div className="inset-panel p-4 text-sm text-muted-foreground">Query returned 0 rows.</div>}

      {/* Examples */}
      <section>
        <h2 className="text-lg mb-3">Example Queries</h2>
        <div className="space-y-2">
          {EXAMPLE_QUERIES.map((q, i) => (
            <div key={i} className="fantasy-panel p-3 flex items-center justify-between">
              <code className="text-xs text-foreground/80 font-mono">{q}</code>
              <button onClick={() => setSql(q)} className="text-xs text-accent hover:text-accent/70 flex items-center gap-1">
                <Copy size={12} /> Use
              </button>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
