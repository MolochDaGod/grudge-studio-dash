import { useState, useEffect } from "react";

const GGE_API = "https://gdevelop-assistant.vercel.app";
const GBUX_MINT = "55TpSoMNxbfsNJ9U1dQoo9H3dRtDmjBZVMcKqvU2nray";
const RAYDIUM_URL = `https://raydium.io/swap/?inputMint=sol&outputMint=${GBUX_MINT}`;
const DEXSCREENER_URL = `https://dexscreener.com/solana/${GBUX_MINT}`;
const SOLSCAN_URL = `https://solscan.io/token/${GBUX_MINT}`;

function fmt(n: number, decimals = 2): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(decimals)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(decimals)}K`;
  return n.toFixed(decimals);
}

function fmtUsd(n: number): string {
  if (n < 0.01) return `$${n.toFixed(6)}`;
  return `$${n.toFixed(4)}`;
}

export default function Economy() {
  const [overview, setOverview] = useState<any>(null);
  const [agentWallet, setAgentWallet] = useState<any>(null);
  const [pool, setPool] = useState<any>(null);
  const [supply, setSupply] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<string>("");

  async function fetchAll() {
    setLoading(true);
    setError(null);
    try {
      const [ov, aw, pl, sp] = await Promise.all([
        fetch(`${GGE_API}/api/economy/overview`).then(r => r.json()).catch(() => null),
        fetch(`${GGE_API}/api/economy/agent-wallet`).then(r => r.json()).catch(() => null),
        fetch(`${GGE_API}/api/economy/raydium/pool`).then(r => r.json()).catch(() => null),
        fetch(`${GGE_API}/api/economy/gbux/supply`).then(r => r.json()).catch(() => null),
      ]);
      setOverview(ov);
      setAgentWallet(aw);
      setPool(pl);
      setSupply(sp);
      setLastRefresh(new Date().toLocaleTimeString());
    } catch (e: any) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => { fetchAll(); const t = setInterval(fetchAll, 60000); return () => clearInterval(t); }, []);

  const price = overview?.gbux;
  const changeColor = (price?.priceChange24h || 0) >= 0 ? "#22c55e" : "#ef4444";

  return (
    <div style={{ maxWidth: 1200, margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ fontSize: 28, fontWeight: 700, margin: 0 }}>GBUX Economy</h1>
          <p style={{ color: "#888", margin: "4px 0 0" }}>Live on-chain data from Raydium + Solana RPC</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#666" }}>Last: {lastRefresh}</span>
          <button onClick={fetchAll} disabled={loading} style={{ padding: "6px 16px", background: "#1a1a2e", border: "1px solid #333", borderRadius: 6, color: "#fff", cursor: "pointer" }}>
            {loading ? "Loading..." : "Refresh"}
          </button>
        </div>
      </div>

      {error && <div style={{ background: "#2d1515", border: "1px solid #5c2020", borderRadius: 8, padding: 12, marginBottom: 16, color: "#f87171" }}>{error}</div>}

      {/* Price Header */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 16, marginBottom: 24 }}>
        <Card title="GBUX Price">
          <p style={{ fontSize: 32, fontWeight: 700, margin: 0 }}>{price ? fmtUsd(price.priceUsd) : "—"}</p>
          {price && <p style={{ color: changeColor, fontSize: 14, margin: "4px 0 0" }}>{price.priceChange24h >= 0 ? "+" : ""}{price.priceChange24h?.toFixed(2)}% (24h)</p>}
          <p style={{ fontSize: 12, color: "#666", marginTop: 4 }}>Source: {price?.source || "—"}</p>
        </Card>
        <Card title="24h Volume">
          <p style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>${price ? fmt(price.volume24h) : "—"}</p>
        </Card>
        <Card title="Market Cap">
          <p style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>${price ? fmt(price.marketCap) : "—"}</p>
        </Card>
        <Card title="Liquidity">
          <p style={{ fontSize: 24, fontWeight: 600, margin: 0 }}>${price ? fmt(price.liquidity) : "—"}</p>
        </Card>
      </div>

      {/* Supply + Agent Wallet */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
        <Card title="Token Supply">
          <Row label="Total Supply" value={supply ? fmt(supply.totalSupply, 0) + " GBUX" : "—"} />
          <Row label="Decimals" value={supply?.decimals?.toString() || "—"} />
          <Row label="Mint" value={GBUX_MINT} mono />
          <Row label="FDV" value={price ? "$" + fmt(price.fdv) : "—"} />
        </Card>
        <Card title="AI Agent Wallet">
          <Row label="Address" value={agentWallet?.address || "—"} mono />
          <Row label="SOL Balance" value={agentWallet ? agentWallet.solBalance?.toFixed(4) + " SOL" : "—"} />
          <Row label="GBUX Balance" value={agentWallet ? fmt(agentWallet.gbuxBalance, 2) + " GBUX" : "—"} />
          <Row label="GBUX Value" value={agentWallet ? fmtUsd(agentWallet.gbuxValueUsd || 0) : "—"} />
        </Card>
      </div>

      {/* Raydium Pool */}
      <Card title="Raydium Pool" style={{ marginBottom: 24 }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12 }}>
          <Row label="DEX" value={pool?.dexId || "—"} />
          <Row label="Pair" value={pool ? `${pool.baseToken?.symbol}/${pool.quoteToken?.symbol}` : "—"} />
          <Row label="Price (USD)" value={pool ? fmtUsd(pool.priceUsd) : "—"} />
          <Row label="Price (SOL)" value={pool ? pool.priceNative?.toFixed(10) : "—"} />
          <Row label="Volume 24h" value={pool ? "$" + fmt(pool.volume24h) : "—"} />
          <Row label="Liquidity" value={pool ? "$" + fmt(pool.liquidity) : "—"} />
        </div>
      </Card>

      {/* Links */}
      <Card title="Quick Links" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          <ExtLink href={RAYDIUM_URL} label="Buy on Raydium" color="#7c3aed" />
          <ExtLink href={DEXSCREENER_URL} label="DexScreener" color="#22c55e" />
          <ExtLink href={SOLSCAN_URL} label="Solscan" color="#3b82f6" />
          <ExtLink href={`${GGE_API}/api/economy/overview`} label="API: Overview" color="#6b7280" />
          <ExtLink href={`${GGE_API}/api/economy/gbux/price-history`} label="API: Price History" color="#6b7280" />
          <ExtLink href={`${GGE_API}/api/economy/gbux/supply`} label="API: Supply" color="#6b7280" />
        </div>
      </Card>

      {/* API Endpoints Reference */}
      <Card title="Economy API Endpoints">
        <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
          <thead><tr style={{ borderBottom: "1px solid #333", textAlign: "left" }}><th style={{ padding: "6px 8px" }}>Method</th><th style={{ padding: "6px 8px" }}>Endpoint</th><th style={{ padding: "6px 8px" }}>Description</th></tr></thead>
          <tbody>
            {[
              ["GET", "/api/economy/overview", "Full economy snapshot"],
              ["GET", "/api/economy/gbux/price", "Current GBUX price"],
              ["GET", "/api/economy/gbux/price-history", "Price over time (24h)"],
              ["GET", "/api/economy/gbux/supply", "On-chain total supply"],
              ["GET", "/api/economy/raydium/pool", "Raydium pool stats"],
              ["GET", "/api/economy/agent-wallet", "AI agent wallet balances"],
              ["GET", "/api/economy/wallet/:addr", "Any wallet SOL+GBUX"],
              ["GET", "/api/economy/wallets", "All server wallets"],
              ["GET", "/api/economy/transactions", "Recent transactions"],
              ["POST", "/api/economy/swap/quote", "Swap quote (live price)"],
            ].map(([m, p, d]) => (
              <tr key={p} style={{ borderBottom: "1px solid #222" }}>
                <td style={{ padding: "6px 8px", color: m === "POST" ? "#f59e0b" : "#22c55e", fontFamily: "monospace" }}>{m}</td>
                <td style={{ padding: "6px 8px", fontFamily: "monospace", fontSize: 12 }}>{p}</td>
                <td style={{ padding: "6px 8px", color: "#888" }}>{d}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: "#111827", border: "1px solid #1f2937", borderRadius: 12, padding: 20, ...style }}>
      <h3 style={{ fontSize: 14, fontWeight: 600, color: "#9ca3af", marginBottom: 12, textTransform: "uppercase", letterSpacing: 1 }}>{title}</h3>
      {children}
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: "1px solid #1f2937" }}>
      <span style={{ color: "#6b7280" }}>{label}</span>
      <span style={{ fontWeight: 500, fontFamily: mono ? "monospace" : "inherit", fontSize: mono ? 11 : 13, maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis" }}>{value}</span>
    </div>
  );
}

function ExtLink({ href, label, color }: { href: string; label: string; color: string }) {
  return (
    <a href={href} target="_blank" rel="noopener noreferrer" style={{ padding: "8px 16px", background: color + "22", border: `1px solid ${color}44`, borderRadius: 8, color, fontSize: 13, fontWeight: 600, textDecoration: "none" }}>
      {label} ↗
    </a>
  );
}
