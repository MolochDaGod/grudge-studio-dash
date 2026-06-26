import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { dbApi } from "../lib/api";
import { useState } from "react";
import { Plus, Trash2, Save } from "lucide-react";

const KNOWN_TABLES = [
  "users","characters","inventory_items","crafted_items","unlocked_skills","unlocked_recipes",
  "crafting_jobs","shop_transactions","islands","ai_agents","game_sessions","afk_jobs",
  "uuid_ledger","resource_ledger","auth_tokens","battle_arena_stats",
];

interface Column { name: string; type: string; nullable: boolean; default_value: string; is_new?: boolean; }

export default function SchemaEditor() {
  const qc = useQueryClient();
  const [selectedTable, setSelectedTable] = useState(KNOWN_TABLES[0]);
  const schema = useQuery({ queryKey: ["schema", selectedTable], queryFn: () => dbApi.schema(selectedTable) });
  const [newCols, setNewCols] = useState<Column[]>([]);
  const [alterSQL, setAlterSQL] = useState("");

  const migrateMut = useMutation({
    mutationFn: (sql: string) => dbApi.migrate(sql),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["schema", selectedTable] }); setAlterSQL(""); setNewCols([]); },
  });

  const schemaData = schema.data as any;
  const columns: Column[] = schemaData?.columns ?? (Array.isArray(schemaData) ? schemaData : []);

  const addColumn = () => {
    setNewCols([...newCols, { name: "", type: "VARCHAR(255)", nullable: true, default_value: "", is_new: true }]);
  };

  const removeNewCol = (idx: number) => {
    setNewCols(newCols.filter((_, i) => i !== idx));
  };

  const updateNewCol = (idx: number, field: keyof Column, value: any) => {
    const updated = [...newCols];
    (updated[idx] as any)[field] = value;
    setNewCols(updated);
  };

  const generateAlter = () => {
    const stmts: string[] = [];
    for (const col of newCols) {
      if (!col.name) continue;
      let stmt = `ALTER TABLE \`${selectedTable}\` ADD COLUMN \`${col.name}\` ${col.type}`;
      if (!col.nullable) stmt += " NOT NULL";
      if (col.default_value) stmt += ` DEFAULT '${col.default_value}'`;
      stmts.push(stmt + ";");
    }
    setAlterSQL(stmts.join("\n"));
  };

  return (
    <div>
      <TopBar title="Schema Editor" />

      <p className="text-sm text-muted-foreground mb-6">View and modify database table schemas — generate and execute ALTER statements.</p>

      {/* Table selector */}
      <div className="flex items-center gap-3 mb-6">
        <label className="text-sm">Table:</label>
        <select
          value={selectedTable}
          onChange={(e) => { setSelectedTable(e.target.value); setNewCols([]); setAlterSQL(""); }}
          className="bg-input border border-border rounded px-3 py-2 text-sm text-foreground"
        >
          {KNOWN_TABLES.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {/* Current columns */}
      <section className="mb-6">
        <h2 className="text-lg mb-3">Current Columns</h2>
        {schema.isLoading && <div className="inset-panel p-4 text-sm text-muted-foreground">Loading schema...</div>}
        {schema.isError && <div className="inset-panel p-4 text-sm text-danger">Could not fetch schema — ensure /api/db/schema/:table is available.</div>}
        {columns.length > 0 && (
          <div className="space-y-1">
            <div className="grid grid-cols-5 gap-2 text-xs text-muted-foreground font-semibold px-3 py-2">
              <span>Name</span><span>Type</span><span>Nullable</span><span>Default</span><span>Key</span>
            </div>
            {columns.map((col: any, i: number) => (
              <div key={i} className="grid grid-cols-5 gap-2 text-sm fantasy-panel px-3 py-2">
                <span className="text-accent">{col.name ?? col.COLUMN_NAME}</span>
                <span>{col.type ?? col.COLUMN_TYPE}</span>
                <span>{(col.nullable ?? col.IS_NULLABLE) === "YES" ? "✓" : "✗"}</span>
                <span className="text-muted-foreground">{col.default_value ?? col.COLUMN_DEFAULT ?? "—"}</span>
                <span className="text-muted-foreground">{col.key ?? col.COLUMN_KEY ?? "—"}</span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Add new columns */}
      <section className="mb-6">
        <div className="flex justify-between items-center mb-3">
          <h2 className="text-lg">Add Columns</h2>
          <button onClick={addColumn} className="gilded-button flex items-center gap-1 px-3 py-1.5 text-xs">
            <Plus size={14} /> Add Column
          </button>
        </div>

        {newCols.length > 0 && (
          <div className="space-y-2">
            {newCols.map((col, idx) => (
              <div key={idx} className="fantasy-panel p-3 grid grid-cols-5 gap-2 items-center">
                <input value={col.name} onChange={(e) => updateNewCol(idx, "name", e.target.value)} className="bg-input border border-border rounded px-2 py-1 text-sm text-foreground" placeholder="column_name" />
                <select value={col.type} onChange={(e) => updateNewCol(idx, "type", e.target.value)} className="bg-input border border-border rounded px-2 py-1 text-sm text-foreground">
                  <option>VARCHAR(255)</option><option>INT</option><option>BIGINT</option><option>TEXT</option>
                  <option>BOOLEAN</option><option>DATETIME</option><option>TIMESTAMP</option><option>JSON</option>
                  <option>DECIMAL(10,2)</option><option>FLOAT</option>
                </select>
                <label className="flex items-center gap-1 text-xs">
                  <input type="checkbox" checked={col.nullable} onChange={(e) => updateNewCol(idx, "nullable", e.target.checked)} /> Nullable
                </label>
                <input value={col.default_value} onChange={(e) => updateNewCol(idx, "default_value", e.target.value)} className="bg-input border border-border rounded px-2 py-1 text-sm text-foreground" placeholder="default" />
                <button onClick={() => removeNewCol(idx)} className="text-danger hover:text-danger/70"><Trash2 size={14} /></button>
              </div>
            ))}
            <button onClick={generateAlter} className="gilded-button flex items-center gap-1 px-4 py-2 text-xs mt-2">
              <Save size={14} /> Generate ALTER SQL
            </button>
          </div>
        )}
      </section>

      {/* ALTER preview and execute */}
      {alterSQL && (
        <section>
          <h2 className="text-lg mb-3">ALTER Preview</h2>
          <textarea
            value={alterSQL}
            onChange={(e) => setAlterSQL(e.target.value)}
            className="w-full bg-input border border-border rounded p-3 text-sm text-foreground font-mono min-h-[100px]"
          />
          <div className="flex gap-2 mt-2">
            <button
              onClick={() => migrateMut.mutate(alterSQL)}
              disabled={migrateMut.isPending}
              className="gilded-button px-4 py-2 text-xs disabled:opacity-50"
            >
              {migrateMut.isPending ? "Executing..." : "Execute Migration"}
            </button>
            <button onClick={() => setAlterSQL("")} className="text-xs text-muted-foreground hover:text-foreground px-4 py-2">Cancel</button>
          </div>
          {migrateMut.isError && <p className="text-xs text-danger mt-2">Migration failed — check SQL syntax.</p>}
          {migrateMut.isSuccess && <p className="text-xs text-green-400 mt-2">Migration applied successfully.</p>}
        </section>
      )}
    </div>
  );
}
