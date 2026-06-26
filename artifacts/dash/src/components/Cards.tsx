import type { HealthResult } from "../lib/api";
import type { ProjectDef } from "../lib/config";
import { ExternalLink } from "lucide-react";
import type { ReactNode } from "react";

// ── Service health card ─────────────────────────────────────────
export function ServiceCard({ svc }: { svc: HealthResult }) {
  return (
    <div className="fantasy-panel p-4 flex items-center gap-3">
      <span
        className={`w-3 h-3 rounded-full shrink-0 ${
          svc.ok ? "bg-success animate-pulse-dot" : "bg-danger"
        }`}
        style={{ boxShadow: svc.ok ? "0 0 8px hsl(142 71% 45%)" : "0 0 8px hsl(0 84% 60%)" }}
      />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-foreground truncate">{svc.name}</p>
        <p className="text-[0.65rem] text-muted-foreground truncate">{svc.url}</p>
      </div>
      <span className="text-xs text-muted-foreground">{svc.ms}ms</span>
    </div>
  );
}

// ── Stat card ───────────────────────────────────────────────────
export function StatCard({ icon, value, label }: { icon: ReactNode; value: string | number; label: string }) {
  return (
    <div className="fantasy-panel p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <p className="text-2xl font-bold text-primary">{value}</p>
      <p className="text-[0.65rem] uppercase tracking-widest text-muted-foreground mt-1">{label}</p>
    </div>
  );
}

// ── Project card ────────────────────────────────────────────────
export function ProjectCard({
  project,
  online,
}: {
  project: ProjectDef;
  online?: boolean;
}) {
  return (
    <div className="fantasy-panel p-4 flex flex-col gap-2 hover:border-primary transition-colors">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xl">{project.icon}</span>
          <h3 className="text-sm font-semibold text-foreground">{project.name}</h3>
        </div>
        <span
          className={`w-2.5 h-2.5 rounded-full ${
            online === undefined ? "bg-muted" : online ? "bg-success" : "bg-danger"
          }`}
        />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{project.description}</p>
      <div className="flex items-center gap-3 mt-auto pt-1">
        {project.liveUrl && (
          <a
            href={project.liveUrl}
            target="_blank"
            rel="noreferrer"
            className="text-[0.65rem] text-primary hover:text-gold-light flex items-center gap-1"
          >
            <ExternalLink size={10} /> Live
          </a>
        )}
        {project.repo && (
          <a
            href={`https://github.com/${project.repo}`}
            target="_blank"
            rel="noreferrer"
            className="text-[0.65rem] text-muted-foreground hover:text-foreground"
          >
            GitHub
          </a>
        )}
      </div>
    </div>
  );
}

// ── Data table ──────────────────────────────────────────────────
export function DataTable({
  columns,
  rows,
  emptyMsg = "No data",
}: {
  columns: { key: string; label: string }[];
  rows: Record<string, any>[];
  emptyMsg?: string;
}) {
  if (!rows.length) {
    return <div className="inset-panel p-6 text-center text-muted-foreground text-sm">{emptyMsg}</div>;
  }
  return (
    <div className="inset-panel overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-3 py-2 text-[0.65rem] uppercase tracking-wider text-primary font-bold">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border/50 hover:bg-accent/30 transition-colors">
              {columns.map((col) => (
                <td key={col.key} className="px-3 py-2 text-foreground">
                  {String(row[col.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
