/**
 * /asset-browser — Full Grudge Warlords asset catalog
 *
 * Loads every row from D1 asset_registry (api.grudge-studio.com/assets)
 * and lets you search / filter / open CDN URLs. SSOT binaries stay on
 * assets.grudge-studio.com — this page never invents mesh paths.
 */
import { useCallback, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  Package,
  LayoutGrid,
  List,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  Filter,
} from "lucide-react";
import { Link } from "wouter";
import TopBar from "../components/TopBar";
import { StatCard } from "../components/Cards";
import {
  ASSET_REGISTRY_API,
  ASSETS_CDN,
  type RegistryAsset,
  type AssetFilters,
  fetchAllAssets,
  computeStats,
  filterAssets,
  formatBytes,
  categoryIcon,
  cdnUrlFor,
  isImageAsset,
  isModelAsset,
  isAudioAsset,
  sortedKeys,
  extFromKey,
} from "../lib/assetRegistry";

const PAGE = 48;

type ViewMode = "grid" | "list";

function useDebounced<T>(value: T, ms = 250): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

function CopyBtn({ text, label = "Copy" }: { text: string; label?: string }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      title={label}
      className="inline-flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded border border-border hover:border-primary text-muted-foreground hover:text-primary transition-colors"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
          setOk(true);
          setTimeout(() => setOk(false), 1200);
        } catch {
          /* ignore */
        }
      }}
    >
      {ok ? <Check size={11} className="text-success" /> : <Copy size={11} />}
      {ok ? "Copied" : label}
    </button>
  );
}

function AssetThumb({ asset }: { asset: RegistryAsset }) {
  const [broken, setBroken] = useState(false);
  const url = cdnUrlFor(asset);

  if (isImageAsset(asset) && !broken) {
    return (
      <img
        src={url}
        alt={asset.name}
        loading="lazy"
        className="w-full h-full object-contain p-2"
        onError={() => setBroken(true)}
      />
    );
  }

  const icon = isModelAsset(asset)
    ? "🧊"
    : isAudioAsset(asset)
      ? "🔊"
      : categoryIcon(asset.category);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-muted-foreground">
      <span className="text-3xl opacity-80">{icon}</span>
      <span className="text-[0.55rem] uppercase tracking-widest opacity-70">
        {(asset.format || extFromKey(asset.r2Key) || asset.category || "file").toString()}
      </span>
    </div>
  );
}

function DetailDrawer({
  asset,
  onClose,
}: {
  asset: RegistryAsset | null;
  onClose: () => void;
}) {
  if (!asset) return null;
  const url = cdnUrlFor(asset);

  return (
    <div className="fixed inset-0 z-[80] flex justify-end">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Close"
        onClick={onClose}
      />
      <aside className="relative w-full max-w-md fantasy-panel h-full overflow-y-auto border-l-2 border-primary/40 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <p className="text-[0.6rem] uppercase tracking-widest text-primary mb-1">
              {asset.category || "asset"}
            </p>
            <h2 className="text-lg font-semibold text-foreground leading-snug">{asset.name}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded border border-border hover:border-primary"
          >
            <X size={16} />
          </button>
        </div>

        <div className="aspect-square rounded border border-border bg-obsidian/60 mb-4 overflow-hidden">
          <AssetThumb asset={asset} />
        </div>

        <dl className="space-y-3 text-xs">
          <div>
            <dt className="text-muted-foreground uppercase tracking-wider text-[0.6rem] mb-0.5">CDN URL</dt>
            <dd className="font-mono break-all text-primary/90">{url}</dd>
            <div className="flex flex-wrap gap-2 mt-1.5">
              <CopyBtn text={url} label="Copy URL" />
              <a
                href={url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[0.65rem] px-2 py-0.5 rounded border border-border hover:border-primary text-muted-foreground hover:text-primary"
              >
                <ExternalLink size={11} /> Open
              </a>
            </div>
          </div>
          <div>
            <dt className="text-muted-foreground uppercase tracking-wider text-[0.6rem] mb-0.5">R2 key</dt>
            <dd className="font-mono break-all">{asset.r2Key}</dd>
            <div className="mt-1"><CopyBtn text={asset.r2Key} label="Copy key" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <dt className="text-muted-foreground uppercase tracking-wider text-[0.6rem]">UUID</dt>
              <dd className="font-mono break-all text-[0.7rem]">{asset.grudgeUuid}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground uppercase tracking-wider text-[0.6rem]">Size</dt>
              <dd>{formatBytes(asset.fileSize)}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground uppercase tracking-wider text-[0.6rem]">Format</dt>
              <dd className="uppercase">{asset.format || extFromKey(asset.r2Key) || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground uppercase tracking-wider text-[0.6rem]">Source set</dt>
              <dd>{asset.sourceSet || "—"}</dd>
            </div>
            {asset.weaponType && (
              <div>
                <dt className="text-muted-foreground uppercase tracking-wider text-[0.6rem]">Weapon</dt>
                <dd>{asset.weaponType}</dd>
              </div>
            )}
            {asset.boneMap && (
              <div>
                <dt className="text-muted-foreground uppercase tracking-wider text-[0.6rem]">Bone map</dt>
                <dd className="font-mono">{asset.boneMap}</dd>
              </div>
            )}
          </div>
          <div>
            <dt className="text-muted-foreground uppercase tracking-wider text-[0.6rem] mb-0.5">Registry id</dt>
            <dd className="font-mono break-all text-[0.7rem] text-muted-foreground">{asset.id}</dd>
          </div>
        </dl>

        <p className="mt-6 text-[0.65rem] text-muted-foreground leading-relaxed">
          Canonical Warlords meshes come from this registry + R2 CDN only. Do not substitute Meshy/AI
          heroes or capsule placeholders in production loaders.
        </p>
      </aside>
    </div>
  );
}

export default function AssetBrowser() {
  const [loadProgress, setLoadProgress] = useState({ loaded: 0, total: 0 });
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [format, setFormat] = useState("");
  const [sourceSet, setSourceSet] = useState("");
  const [view, setView] = useState<ViewMode>("grid");
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<RegistryAsset | null>(null);

  const debouncedSearch = useDebounced(search, 200);

  const catalog = useQuery({
    queryKey: ["warlords-asset-catalog"],
    queryFn: () =>
      fetchAllAssets((loaded, total) => setLoadProgress({ loaded, total })),
    staleTime: 5 * 60_000,
    refetchOnWindowFocus: false,
  });

  const assets = catalog.data ?? [];
  const stats = useMemo(() => computeStats(assets), [assets]);

  const filters: AssetFilters = useMemo(
    () => ({ search: debouncedSearch, category, format, sourceSet }),
    [debouncedSearch, category, format, sourceSet],
  );

  const filtered = useMemo(() => filterAssets(assets, filters), [assets, filters]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, category, format, sourceSet]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const slice = filtered.slice(safePage * PAGE, safePage * PAGE + PAGE);

  const categories = sortedKeys(stats.byCategory);
  const formats = sortedKeys(stats.byFormat);
  const sourceSets = sortedKeys(stats.bySourceSet);

  const clearFilters = useCallback(() => {
    setSearch("");
    setCategory("");
    setFormat("");
    setSourceSet("");
  }, []);

  const loading = catalog.isLoading || catalog.isFetching;
  const progressPct =
    loadProgress.total > 0
      ? Math.min(100, Math.round((loadProgress.loaded / loadProgress.total) * 100))
      : 0;

  return (
    <div>
      <TopBar title="Warlords Asset Catalog" />

      <p className="text-sm text-muted-foreground mb-6 max-w-4xl">
        Live index of every binary registered for Grudge Warlords — D1{" "}
        <code className="text-primary">asset_registry</code> via{" "}
        <a
          href={`${ASSET_REGISTRY_API}/assets?limit=5`}
          target="_blank"
          rel="noreferrer"
          className="text-primary hover:underline"
        >
          {ASSET_REGISTRY_API}/assets
        </a>
        . Files resolve on{" "}
        <a href={ASSETS_CDN} target="_blank" rel="noreferrer" className="text-violet-300 hover:underline">
          {ASSETS_CDN}
        </a>
        . Topology map:{" "}
        <Link href="/assets" className="text-primary hover:underline">
          Assets &amp; SSOT
        </Link>
        .
      </p>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={<Package size={22} className="mx-auto text-primary" />}
          value={catalog.isLoading ? "…" : stats.total.toLocaleString()}
          label="Registry assets"
        />
        <StatCard
          icon="📁"
          value={catalog.isLoading ? "…" : categories.length}
          label="Categories"
        />
        <StatCard
          icon="🧊"
          value={catalog.isLoading ? "…" : (stats.byFormat.glb ?? 0) + (stats.byFormat.fbx ?? 0)}
          label="3D models (glb+fbx)"
        />
        <StatCard
          icon="💾"
          value={catalog.isLoading ? "…" : formatBytes(stats.totalBytes)}
          label="Indexed size"
        />
      </div>

      {/* Load progress */}
      {loading && (
        <div className="inset-panel p-3 mb-4 flex items-center gap-3 text-xs">
          <Loader2 size={16} className="animate-spin text-primary" />
          <div className="flex-1">
            <div className="flex justify-between mb-1">
              <span>Loading registry…</span>
              <span className="font-mono text-muted-foreground">
                {loadProgress.loaded.toLocaleString()}
                {loadProgress.total ? ` / ${loadProgress.total.toLocaleString()}` : ""} ({progressPct}%)
              </span>
            </div>
            <div className="h-1.5 rounded bg-muted overflow-hidden">
              <div
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${progressPct || 8}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {catalog.isError && (
        <div className="fantasy-panel p-4 mb-4 text-sm text-danger">
          Failed to load asset registry: {(catalog.error as Error)?.message || "unknown error"}
          <button
            type="button"
            className="gilded-button ml-3 px-2 py-1 text-xs"
            onClick={() => catalog.refetch()}
          >
            Retry
          </button>
        </div>
      )}

      {/* Filters */}
      <div className="fantasy-panel p-4 mb-5 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <Filter size={14} className="text-primary" />
          <span className="text-xs uppercase tracking-widest text-primary">Filters</span>
          {(search || category || format || sourceSet) && (
            <button
              type="button"
              onClick={clearFilters}
              className="text-[0.65rem] text-muted-foreground hover:text-primary ml-auto"
            >
              Clear all
            </button>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Search</span>
            <div className="relative mt-1">
              <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="name, r2 key, uuid…"
                className="w-full pl-8 pr-3 py-2 text-sm rounded border border-border bg-obsidian/50 focus:outline-none focus:border-primary"
              />
            </div>
          </label>

          <label className="block">
            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Category</span>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm rounded border border-border bg-obsidian/50 focus:outline-none focus:border-primary"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {categoryIcon(c)} {c} ({stats.byCategory[c]})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Format</span>
            <select
              value={format}
              onChange={(e) => setFormat(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm rounded border border-border bg-obsidian/50 focus:outline-none focus:border-primary"
            >
              <option value="">All formats</option>
              {formats.map((f) => (
                <option key={f} value={f}>
                  .{f} ({stats.byFormat[f]})
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="text-[0.6rem] uppercase tracking-wider text-muted-foreground">Source set</span>
            <select
              value={sourceSet}
              onChange={(e) => setSourceSet(e.target.value)}
              className="w-full mt-1 px-3 py-2 text-sm rounded border border-border bg-obsidian/50 focus:outline-none focus:border-primary"
            >
              <option value="">All source sets</option>
              {sourceSets.map((s) => (
                <option key={s} value={s}>
                  {s} ({stats.bySourceSet[s]})
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Category chips */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={`text-[0.65rem] px-2 py-1 rounded border transition-colors ${
              !category ? "border-primary text-primary bg-primary/10" : "border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            All
          </button>
          {categories.slice(0, 12).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(category === c ? "" : c)}
              className={`text-[0.65rem] px-2 py-1 rounded border transition-colors ${
                category === c
                  ? "border-primary text-primary bg-primary/10"
                  : "border-border text-muted-foreground hover:border-primary/50"
              }`}
            >
              {categoryIcon(c)} {c}
              <span className="opacity-60 ml-1">{stats.byCategory[c]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <p className="text-xs text-muted-foreground">
          Showing{" "}
          <span className="text-foreground font-semibold">{filtered.length.toLocaleString()}</span>
          {filtered.length !== assets.length && (
            <>
              {" "}
              of <span className="text-foreground">{assets.length.toLocaleString()}</span>
            </>
          )}{" "}
          assets
          {filtered.length > 0 && (
            <>
              {" · "}page {safePage + 1}/{pageCount}
            </>
          )}
        </p>
        <div className="flex items-center gap-2">
          <button
            type="button"
            title="Grid"
            onClick={() => setView("grid")}
            className={`p-1.5 rounded border ${view === "grid" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            <LayoutGrid size={15} />
          </button>
          <button
            type="button"
            title="List"
            onClick={() => setView("list")}
            className={`p-1.5 rounded border ${view === "list" ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Grid / list */}
      {view === "grid" ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-6 gap-3 mb-6">
          {slice.map((a) => (
            <button
              key={a.id}
              type="button"
              onClick={() => setSelected(a)}
              className="fantasy-panel text-left overflow-hidden hover:border-primary/60 transition-colors group"
            >
              <div className="aspect-square bg-obsidian/40 border-b border-border/50">
                <AssetThumb asset={a} />
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold truncate group-hover:text-primary">{a.name}</p>
                <p className="text-[0.6rem] text-muted-foreground truncate mt-0.5">{a.r2Key}</p>
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[0.55rem] uppercase tracking-wide text-primary/80">
                    {a.category}
                  </span>
                  <span className="text-[0.55rem] text-muted-foreground">{formatBytes(a.fileSize)}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="inset-panel overflow-x-auto mb-6">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary">Name</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary">Category</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary">Format</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary">Source</th>
                <th className="text-right px-3 py-2 text-[0.65rem] uppercase text-primary">Size</th>
                <th className="text-left px-3 py-2 text-[0.65rem] uppercase text-primary">R2 key</th>
              </tr>
            </thead>
            <tbody>
              {slice.map((a) => (
                <tr
                  key={a.id}
                  className="border-b border-border/40 hover:bg-accent/30 cursor-pointer"
                  onClick={() => setSelected(a)}
                >
                  <td className="px-3 py-2 font-medium">{a.name}</td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">
                    {categoryIcon(a.category)} {a.category}
                  </td>
                  <td className="px-3 py-2 text-xs uppercase font-mono">
                    {a.format || extFromKey(a.r2Key) || "—"}
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{a.sourceSet || "—"}</td>
                  <td className="px-3 py-2 text-xs text-right font-mono">{formatBytes(a.fileSize)}</td>
                  <td className="px-3 py-2 text-[0.65rem] font-mono text-muted-foreground max-w-[280px] truncate">
                    {a.r2Key}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!loading && filtered.length === 0 && (
        <div className="text-center py-16 text-muted-foreground text-sm">
          No assets match these filters.
          <button type="button" onClick={clearFilters} className="block mx-auto mt-3 text-primary hover:underline">
            Clear filters
          </button>
        </div>
      )}

      {/* Pagination */}
      {filtered.length > PAGE && (
        <div className="flex items-center justify-center gap-3 mb-8">
          <button
            type="button"
            disabled={safePage <= 0}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            className="gilded-button px-3 py-1.5 text-xs disabled:opacity-40 flex items-center gap-1"
          >
            <ChevronLeft size={14} /> Prev
          </button>
          <span className="text-xs font-mono text-muted-foreground">
            {safePage + 1} / {pageCount}
          </span>
          <button
            type="button"
            disabled={safePage >= pageCount - 1}
            onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
            className="gilded-button px-3 py-1.5 text-xs disabled:opacity-40 flex items-center gap-1"
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      )}

      <DetailDrawer asset={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
