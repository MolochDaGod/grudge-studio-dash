import { useRef, useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { gameApi } from "../lib/api";
import {
  BattleEngine3D,
  type BattleChar,
  type BattleLogEntry,
  type SpellType,
  SPELL_COLORS,
} from "../lib/battle/engine";

const SPELLS: { id: SpellType; label: string; icon: string; mp: number; desc: string }[] = [
  { id: "fireball", label: "Fireball", icon: "🔥", mp: 10, desc: "Fiery projectile" },
  { id: "ice_lance", label: "Ice Lance", icon: "❄️", mp: 10, desc: "Shard of ice" },
  { id: "lightning", label: "Lightning", icon: "⚡", mp: 10, desc: "Lightning bolt" },
  { id: "shadow_bolt", label: "Shadow Bolt", icon: "🌑", mp: 10, desc: "Dark energy" },
  { id: "heal", label: "Heal", icon: "💚", mp: 15, desc: "Restores HP" },
];

const RACE_ICONS: Record<string, string> = {
  human: "🧑", barbarian: "🪓", dwarf: "⛏️", elf: "🧝", orc: "👹", undead: "💀",
};
const CLASS_ICONS: Record<string, string> = {
  warrior: "⚔️", mage: "🔮", ranger: "🏹", worg: "🐺",
};

const LOG_COLORS: Record<BattleLogEntry["type"], string> = {
  action: "text-primary",
  damage: "text-danger",
  heal: "text-success",
  status: "text-warning",
  system: "text-muted-foreground",
};

export default function Battle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const engineRef = useRef<BattleEngine3D | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [selectedChar, setSelectedChar] = useState<BattleChar | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [activeSpell, setActiveSpell] = useState<SpellType | null>(null);
  const [loadMsg, setLoadMsg] = useState<string | null>("Initializing...");
  const [, setTick] = useState(0);

  const charsQuery = useQuery({
    queryKey: ["battle-characters"],
    queryFn: () => gameApi.characters(),
    retry: 1,
    staleTime: 60_000,
  });

  // Initialize 3D engine
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const w = container.clientWidth;
    const h = Math.min(w * 0.65, 700);

    const engine = new BattleEngine3D(canvas, w, h);
    engineRef.current = engine;

    engine.onLogUpdate = (log) => {
      setBattleLog([...log]);
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };
    engine.onSelectionChange = (ch) => setSelectedChar(ch ? { ...ch } : null);
    engine.onStateChange = () => setTick((t) => t + 1);
    engine.onLoadProgress = (msg) => setLoadMsg(msg);

    engine.start();
    engine.initBattle(charsQuery.data ?? undefined);

    const onResize = () => {
      const nw = container.clientWidth;
      const nh = Math.min(nw * 0.65, 700);
      engine.resize(nw, nh);
    };
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
      engine.destroy();
    };
  }, [charsQuery.data]);

  // Spell targeting: click a character in the sidebar to cast on them
  const handleSpellTarget = useCallback((targetId: number) => {
    const engine = engineRef.current;
    if (!engine || !activeSpell || !selectedChar) return;
    engine.castSpell(selectedChar.id, activeSpell, targetId);
    setActiveSpell(null);
  }, [activeSpell, selectedChar]);

  const handleAttack = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !selectedChar) return;
    const enemies = engine.getEnemyChars().filter((c) => c.state !== "dead");
    if (enemies.length > 0) engine.autoAttack(selectedChar.id, enemies[0].id);
  }, [selectedChar]);

  const handleReset = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.initBattle(charsQuery.data ?? undefined);
    setBattleLog([]);
    setSelectedChar(null);
    setActiveSpell(null);
  }, [charsQuery.data]);

  const engine = engineRef.current;
  const playerChars = engine?.getPlayerChars() ?? [];
  const enemyChars = engine?.getEnemyChars() ?? [];

  return (
    <div>
      <TopBar title="Battle Arena" />
      <p className="text-sm text-muted-foreground mb-4">
        Interactive battle system — click characters to select, click grid to move, use spells to fight.
        {activeSpell && (
          <span className="text-primary ml-2 font-bold">
            🎯 Click a target for {activeSpell.replace("_", " ")}
          </span>
        )}
      </p>

      <div className="flex gap-4">
        {/* ── Main 3D battle canvas ─────────────────────────── */}
        <div className="flex-1 min-w-0" ref={containerRef}>
          <div className="fantasy-panel p-2 battle-canvas-container relative">
            <canvas
              ref={canvasRef}
              className={`w-full rounded ${activeSpell ? "battle-targeting cursor-crosshair" : "cursor-pointer"}`}
            />
            {loadMsg && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/60 rounded z-10">
                <div className="text-center">
                  <div className="text-primary text-sm font-bold mb-2 animate-pulse">{loadMsg}</div>
                  <div className="w-32 h-1 bg-muted rounded overflow-hidden mx-auto">
                    <div className="h-full bg-primary animate-[shimmer_1.5s_infinite]" style={{ width: "60%" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── Action bar ──────────────────────────────────── */}
          <div className="fantasy-panel mt-3 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-primary font-bold uppercase tracking-wider">Actions</span>
              {selectedChar && (
                <span className="text-xs text-muted-foreground">
                  — {selectedChar.name} ({selectedChar.classId})
                  <span className="ml-2 text-blue-400">{selectedChar.mp}/{selectedChar.maxMp} MP</span>
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {/* Basic attack */}
              <button
                onClick={handleAttack}
                disabled={!selectedChar || selectedChar.state === "dead"}
                className="gilded-button px-3 py-1.5 text-xs disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ⚔️ Attack
              </button>

              {/* Spell buttons */}
              {SPELLS.map((spell) => {
                const isActive = activeSpell === spell.id;
                const canCast = selectedChar && selectedChar.mp >= spell.mp && selectedChar.state !== "dead";
                return (
                  <button
                    key={spell.id}
                    onClick={() => setActiveSpell(isActive ? null : spell.id)}
                    disabled={!canCast}
                    className={`px-3 py-1.5 text-xs rounded transition-all border-2 font-bold
                      ${isActive
                        ? "bg-primary/20 border-primary text-primary shadow-[0_0_12px_rgba(212,175,55,0.3)]"
                        : "border-border bg-secondary hover:border-primary/50 text-foreground"
                      }
                      disabled:opacity-40 disabled:cursor-not-allowed`}
                    title={spell.desc}
                  >
                    {spell.icon} {spell.label}
                    <span className="ml-1 text-[10px] text-blue-400">{spell.mp}mp</span>
                  </button>
                );
              })}

              <div className="flex-1" />
              <button onClick={handleReset} className="px-3 py-1.5 text-xs rounded border border-danger text-danger hover:bg-danger/10 transition-colors">
                🔄 Reset Battle
              </button>
            </div>
          </div>
        </div>

        {/* ── Right sidebar ─────────────────────────────────── */}
        <div className="w-72 flex-shrink-0 space-y-3">
          {/* Player party */}
          <div className="fantasy-panel p-3">
            <h3 className="text-xs text-primary font-bold uppercase tracking-wider mb-2">🛡️ Party</h3>
            {playerChars.map((ch) => (
              <CharCard
                key={ch.id}
                char={ch}
                isSelected={ch.id === selectedChar?.id}
                onClick={() => activeSpell ? handleSpellTarget(ch.id) : engine?.selectChar(ch.id)}
                targeting={!!activeSpell}
              />
            ))}
          </div>

          {/* Enemy roster */}
          <div className="fantasy-panel p-3">
            <h3 className="text-xs text-danger font-bold uppercase tracking-wider mb-2">☠️ Enemies</h3>
            {enemyChars.map((ch) => (
              <CharCard
                key={ch.id}
                char={ch}
                isSelected={ch.id === selectedChar?.id}
                onClick={() => activeSpell ? handleSpellTarget(ch.id) : engine?.selectChar(ch.id)}
                targeting={!!activeSpell}
              />
            ))}
          </div>

          {/* Battle log */}
          <div className="fantasy-panel p-3">
            <h3 className="text-xs text-primary font-bold uppercase tracking-wider mb-2">📜 Battle Log</h3>
            <div className="inset-panel p-2 h-48 overflow-y-auto text-[11px] space-y-0.5 battle-log-scroll">
              {battleLog.length === 0 && (
                <p className="text-muted-foreground text-center py-4">Battle not started</p>
              )}
              {battleLog.map((entry, i) => (
                <p key={i} className={LOG_COLORS[entry.type]}>
                  {entry.text}
                </p>
              ))}
              <div ref={logEndRef} />
            </div>
          </div>

          {/* Controls help */}
          <div className="inset-panel p-3 text-[10px] text-muted-foreground space-y-1">
            <p><strong className="text-primary">Click</strong> a character to select</p>
            <p><strong className="text-primary">Click</strong> a grid cell to move there</p>
            <p><strong className="text-primary">Short distance</strong> = walk, <strong className="text-primary">long distance</strong> = run</p>
            <p><strong className="text-primary">Select a spell</strong> then click a target</p>
            <p><strong className="text-primary">⚔️ Attack</strong> auto-targets the first enemy</p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Character card sub-component ────────────────────────────────
function CharCard({
  char: ch,
  isSelected,
  onClick,
  targeting = false,
}: {
  char: BattleChar;
  isSelected: boolean;
  onClick: () => void;
  targeting?: boolean;
}) {
  const hpPct = Math.round((ch.hp / ch.maxHp) * 100);
  const mpPct = Math.round((ch.mp / ch.maxMp) * 100);
  const isDead = ch.state === "dead";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded mb-1 transition-all text-xs border
        ${isDead ? "opacity-40 border-border" : isSelected ? "border-primary bg-primary/10" : targeting ? "border-warning/50 hover:bg-warning/10" : "border-transparent hover:bg-accent/30"}
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{isDead ? "💀" : (RACE_ICONS[ch.raceId] ?? "🧑")}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`font-bold truncate ${isDead ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {ch.name}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">
              {CLASS_ICONS[ch.classId] ?? ""} Lv.{ch.level}
            </span>
          </div>
          <div className="text-[9px] text-muted-foreground mb-0.5">{ch.raceId} {ch.classId}</div>
          {/* HP bar */}
          <div className="flex items-center gap-1">
            <div className="flex-1 h-1.5 bg-black/40 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{ width: `${hpPct}%`, background: hpPct > 60 ? "#2ecc71" : hpPct > 30 ? "#f39c12" : "#e74c3c" }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground w-14 text-right">{ch.hp}/{ch.maxHp}</span>
          </div>
          {/* MP bar */}
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex-1 h-1 bg-black/40 rounded-sm overflow-hidden">
              <div className="h-full rounded-sm bg-blue-500 transition-all" style={{ width: `${mpPct}%` }} />
            </div>
            <span className="text-[9px] text-blue-400 w-14 text-right">{ch.mp}/{ch.maxMp}</span>
          </div>
          {ch.state !== "idle" && ch.state !== "dead" && (
            <span className="text-[9px] text-warning">{ch.state}</span>
          )}
          {targeting && !isDead && (
            <span className="text-[9px] text-warning">🎯 Click to target</span>
          )}
        </div>
      </div>
    </button>
  );
}
