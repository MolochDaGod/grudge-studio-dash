import { useRef, useEffect, useState, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import TopBar from "../components/TopBar";
import { gameApi } from "../lib/api";
import {
  BattleEngine,
  type BattleChar,
  type BattleLogEntry,
  type SpellType,
  CLASS_ICONS,
  CLASS_COLORS,
  SPELL_COLORS,
} from "../lib/battle/engine";

const CANVAS_W = 1120;
const CANVAS_H = 760;

const SPELLS: { id: SpellType; label: string; icon: string; mp: number; desc: string }[] = [
  { id: "fireball", label: "Fireball", icon: "🔥", mp: 10, desc: "Launches a fiery projectile — applies Burn" },
  { id: "ice_lance", label: "Ice Lance", icon: "❄️", mp: 10, desc: "A shard of ice — applies Freeze" },
  { id: "lightning", label: "Lightning", icon: "⚡", mp: 10, desc: "A bolt of lightning — applies Shock" },
  { id: "shadow_bolt", label: "Shadow Bolt", icon: "🌑", mp: 10, desc: "Dark energy bolt — applies Poison" },
  { id: "earth_spike", label: "Earth Spike", icon: "🪨", mp: 10, desc: "A spike of stone erupts from below" },
  { id: "heal", label: "Heal", icon: "💚", mp: 15, desc: "Restores HP to an ally — applies Regen" },
];

const LOG_COLORS: Record<BattleLogEntry["type"], string> = {
  action: "text-primary",
  damage: "text-danger",
  heal: "text-success",
  status: "text-warning",
  system: "text-muted-foreground",
};

export default function Battle() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<BattleEngine | null>(null);
  const logEndRef = useRef<HTMLDivElement>(null);

  const [selectedChar, setSelectedChar] = useState<BattleChar | null>(null);
  const [battleLog, setBattleLog] = useState<BattleLogEntry[]>([]);
  const [activeSpell, setActiveSpell] = useState<SpellType | null>(null);
  const [, setTick] = useState(0); // force re-renders

  // Fetch characters from API (falls back to demo if unavailable)
  const charsQuery = useQuery({
    queryKey: ["battle-characters"],
    queryFn: () => gameApi.characters(),
    retry: 1,
    staleTime: 60_000,
  });

  // Initialize engine
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_W;
    canvas.height = CANVAS_H;

    const engine = new BattleEngine(canvas);
    engineRef.current = engine;

    engine.onLogUpdate = (log) => {
      setBattleLog([...log]);
      setTimeout(() => logEndRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    };
    engine.onSelectionChange = (ch) => setSelectedChar(ch ? { ...ch } : null);
    engine.onStateChange = () => setTick((t) => t + 1);

    engine.initDefaultBattle(charsQuery.data ?? undefined);
    engine.start();

    return () => engine.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [charsQuery.data]);

  // Handle spell target click
  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const engine = engineRef.current;
      if (!engine || !activeSpell || !selectedChar) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const scaleX = CANVAS_W / rect.width;
      const scaleY = CANVAS_H / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      // Find target character
      for (const ch of engine.chars) {
        if (ch.state === "dead") continue;
        const dx = ch.pos.x - mx;
        const dy = ch.pos.y - my;
        if (Math.sqrt(dx * dx + dy * dy) < 36) {
          engine.castSpell(selectedChar.id, activeSpell, ch.id);
          setActiveSpell(null);
          return;
        }
      }
    },
    [activeSpell, selectedChar]
  );

  const handleAttack = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !selectedChar) return;
    // Auto-attack first alive enemy
    const enemies = engine.getEnemyChars().filter((c) => c.state !== "dead");
    if (enemies.length > 0) {
      engine.autoAttackTarget(selectedChar.id, enemies[0].id);
    }
  }, [selectedChar]);

  const handleReset = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.initDefaultBattle(charsQuery.data ?? undefined);
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
        {/* ── Main battle canvas ───────────────────────────── */}
        <div className="flex-1 min-w-0">
          <div className="fantasy-panel p-2 battle-canvas-container">
            <canvas
              ref={canvasRef}
              className={`w-full rounded cursor-crosshair ${activeSpell ? "battle-targeting" : ""}`}
              style={{ imageRendering: "auto", aspectRatio: `${CANVAS_W}/${CANVAS_H}` }}
              onClick={handleCanvasClick}
            />
          </div>

          {/* ── Action bar ──────────────────────────────────── */}
          <div className="fantasy-panel mt-3 p-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs text-primary font-bold uppercase tracking-wider">Actions</span>
              {selectedChar && (
                <span className="text-xs text-muted-foreground">
                  — {selectedChar.name} ({selectedChar.charClass})
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
                    style={
                      isActive
                        ? { boxShadow: `0 0 12px ${SPELL_COLORS[spell.id].glow}40` }
                        : undefined
                    }
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
                onClick={() => engine?.selectChar(ch.id)}
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
                onClick={() => engine?.selectChar(ch.id)}
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
}: {
  char: BattleChar;
  isSelected: boolean;
  onClick: () => void;
}) {
  const hpPct = Math.round((ch.hp / ch.maxHp) * 100);
  const mpPct = Math.round((ch.mp / ch.maxMp) * 100);
  const isDead = ch.state === "dead";

  return (
    <button
      onClick={onClick}
      className={`w-full text-left px-2 py-1.5 rounded mb-1 transition-all text-xs border
        ${isDead ? "opacity-40 border-border" : isSelected ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent/30"}
      `}
    >
      <div className="flex items-center gap-2">
        <span className="text-sm">{isDead ? "💀" : CLASS_ICONS[ch.charClass]}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <span className={`font-bold truncate ${isDead ? "line-through text-muted-foreground" : "text-foreground"}`}>
              {ch.name}
            </span>
            <span className="text-[10px] text-muted-foreground ml-1">Lv.{ch.level}</span>
          </div>
          {/* HP bar */}
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex-1 h-1.5 bg-black/40 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm transition-all"
                style={{
                  width: `${hpPct}%`,
                  background: hpPct > 60 ? "#2ecc71" : hpPct > 30 ? "#f39c12" : "#e74c3c",
                }}
              />
            </div>
            <span className="text-[9px] text-muted-foreground w-14 text-right">{ch.hp}/{ch.maxHp}</span>
          </div>
          {/* MP bar */}
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex-1 h-1 bg-black/40 rounded-sm overflow-hidden">
              <div
                className="h-full rounded-sm bg-blue-500 transition-all"
                style={{ width: `${mpPct}%` }}
              />
            </div>
            <span className="text-[9px] text-blue-400 w-14 text-right">{ch.mp}/{ch.maxMp}</span>
          </div>
          {/* Status */}
          {ch.statusEffects.length > 0 && (
            <div className="flex gap-1 mt-0.5">
              {ch.statusEffects.map((s, i) => (
                <span
                  key={i}
                  className="inline-block px-1 py-0 text-[8px] rounded border"
                  style={{
                    borderColor: statusColor(s.type),
                    color: statusColor(s.type),
                  }}
                >
                  {s.type}
                </span>
              ))}
            </div>
          )}
          {/* State */}
          {ch.state !== "idle" && ch.state !== "dead" && (
            <span className="text-[9px] text-warning">{ch.state}</span>
          )}
        </div>
      </div>
    </button>
  );
}

function statusColor(type: string): string {
  const map: Record<string, string> = {
    burn: "#ff6348", freeze: "#74b9ff", shock: "#feca57",
    regen: "#55efc4", shield: "#a29bfe", poison: "#6ab04c",
  };
  return map[type] ?? "#888";
}
