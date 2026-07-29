import { useQuery } from "@tanstack/react-query";
import TopBar from "../../components/TopBar";

const NEMESIS = "https://nemesis.grudge-studio.com";

type ShopCatalog = {
  success: boolean;
  live?: boolean;
  products?: Array<{
    id: string;
    name: string;
    description: string;
    kind: string;
    currency: string;
    priceSol?: number;
    cardsPerPack: number;
    image: string;
    buyPath: string;
    redeemPath?: string;
  }>;
  deepLinks?: Record<string, string>;
};

export default function NexusNemesis() {
  const catalog = useQuery<ShopCatalog>({
    queryKey: ["nexus-shop-catalog"],
    queryFn: async () => {
      const r = await fetch(`${NEMESIS}/api/shop/catalog`);
      if (!r.ok) throw new Error("catalog failed");
      return r.json();
    },
    staleTime: 60_000,
  });

  const systems = useQuery({
    queryKey: ["nexus-systems"],
    queryFn: async () => {
      const r = await fetch(`${NEMESIS}/api/systems/status`);
      if (!r.ok) throw new Error("systems failed");
      return r.json();
    },
    staleTime: 30_000,
  });

  const products = catalog.data?.products ?? [];

  return (
    <div>
      <TopBar title="Nexus Nemesis TCG" />

      <div className="mb-6 flex flex-wrap gap-3 items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground max-w-2xl">
            Season 1 tribe packs · GBuX reward packs · SOL cNFT packs · Foundation turn-in.
            Catalog is live from the Nemesis production API for fleet shop embeds.
          </p>
          <p className="text-xs text-muted-foreground mt-1 font-mono">
            {NEMESIS}/api/shop/catalog
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a
            href={`${NEMESIS}/shop`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-sm font-semibold"
          >
            Open Pack Shop
          </a>
          <a
            href={`${NEMESIS}/packs`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-lg border border-white/15 text-sm"
          >
            Packs hub
          </a>
          <a
            href={`${NEMESIS}/dashboard`}
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-lg border border-white/15 text-sm"
          >
            Dashboard
          </a>
          <a
            href="https://id.grudge-studio.com/login"
            target="_blank"
            rel="noreferrer"
            className="px-4 py-2 rounded-lg border border-amber-500/40 text-amber-200 text-sm"
          >
            Grudge ID
          </a>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="inset-panel p-3">
          <div className="text-2xl font-bold text-emerald-400">{products.length || "—"}</div>
          <div className="text-xs text-muted-foreground">Shop products</div>
        </div>
        <div className="inset-panel p-3">
          <div className="text-2xl font-bold">{systems.data?.cnft?.cardApiHealthy ? "✓" : "…"}</div>
          <div className="text-xs text-muted-foreground">Card API</div>
        </div>
        <div className="inset-panel p-3">
          <div className="text-2xl font-bold">{systems.data?.cnft?.redemptionEnabled ? "Live" : "—"}</div>
          <div className="text-xs text-muted-foreground">Foundation turn-in</div>
        </div>
        <div className="inset-panel p-3">
          <div className="text-2xl font-bold">{systems.data?.fleetProbes?.solanaRpc?.ok ? "✓" : "—"}</div>
          <div className="text-xs text-muted-foreground">Solana RPC</div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="text-lg mb-3">Pack catalog (live)</h2>
        {catalog.isLoading && <p className="text-sm text-muted-foreground">Loading…</p>}
        {catalog.isError && (
          <p className="text-sm text-red-400">Could not load catalog — try {NEMESIS}/shop</p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => (
            <article key={p.id} className="fantasy-panel overflow-hidden flex flex-col">
              <div
                className="h-28 bg-cover bg-center"
                style={{ backgroundImage: `url(${p.image})` }}
              />
              <div className="p-3 flex-1 flex flex-col gap-2">
                <div className="text-[10px] uppercase tracking-wide text-emerald-400/90">{p.kind}</div>
                <h3 className="font-semibold text-sm">{p.name}</h3>
                <p className="text-xs text-muted-foreground flex-1">{p.description}</p>
                <div className="flex justify-between text-xs">
                  <span>{p.cardsPerPack} cards</span>
                  <span className="text-amber-300 font-bold">
                    {p.currency === "SOL" && p.priceSol != null ? `${p.priceSol} SOL` : p.currency}
                  </span>
                </div>
                <a
                  href={`${NEMESIS}${p.redeemPath || p.buyPath || "/shop"}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-center text-sm font-semibold py-2 rounded-md bg-emerald-800/80 hover:bg-emerald-700"
                >
                  Buy / open in Nexus →
                </a>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section className="fantasy-panel p-4 text-sm text-muted-foreground space-y-2">
        <h2 className="text-base text-foreground mb-2">Embed on grudge-studio.com</h2>
        <p>
          Public catalog: <code className="text-accent">{NEMESIS}/api/shop/catalog</code>
        </p>
        <p>
          Embed widget: <code className="text-accent">{NEMESIS}/fleet-shop.html</code>
        </p>
        <pre className="text-[11px] bg-black/40 p-3 rounded overflow-x-auto">{`<iframe src="${NEMESIS}/fleet-shop.html" style="width:100%;min-height:520px;border:0;border-radius:12px" title="Nexus Packs"></iframe>`}</pre>
      </section>
    </div>
  );
}
