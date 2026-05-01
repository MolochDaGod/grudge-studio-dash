// ════════════════════════════════════════════════════════════════
// Grudge Battle Engine — Canvas-based 2D RPG battle renderer
// Character rendering, walk/run movement, spell casting VFX
// ════════════════════════════════════════════════════════════════

// ── Types ───────────────────────────────────────────────────────
export type CharClass = "warrior" | "mage" | "rogue" | "healer" | "ranger";
export type Team = "player" | "enemy";
export type SpellType = "fireball" | "ice_lance" | "lightning" | "heal" | "shadow_bolt" | "earth_spike";
export type CharState = "idle" | "walking" | "running" | "casting" | "attacking" | "hit" | "dead";

export interface Vec2 { x: number; y: number; }

export interface BattleChar {
  id: number;
  name: string;
  charClass: CharClass;
  team: Team;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  pos: Vec2;          // current rendered position (world px)
  gridPos: Vec2;      // grid cell
  targetPos: Vec2 | null;
  state: CharState;
  moveSpeed: number;  // pixels per second
  facing: number;     // radians
  animFrame: number;
  animTimer: number;
  statusEffects: StatusEffect[];
  castTimer: number;
  castDuration: number;
  castSpell: SpellType | null;
  castTarget: Vec2 | null;
  hitFlashTimer: number;
}

export interface StatusEffect {
  type: "burn" | "freeze" | "shock" | "regen" | "shield" | "poison";
  duration: number;  // seconds remaining
  strength: number;
}

export interface Particle {
  x: number; y: number;
  vx: number; vy: number;
  life: number; maxLife: number;
  size: number;
  color: string;
  alpha: number;
  gravity: number;
  decay: number;
  glow: number;
  type: "circle" | "spark" | "ring" | "trail";
}

export interface SpellProjectile {
  spell: SpellType;
  from: Vec2;
  to: Vec2;
  pos: Vec2;
  speed: number;
  progress: number;
  particles: Particle[];
  alive: boolean;
  onImpact: (() => void) | null;
}

export interface BattleLogEntry {
  time: number;
  text: string;
  type: "action" | "damage" | "heal" | "status" | "system";
}

export interface ScreenShake {
  intensity: number;
  duration: number;
  elapsed: number;
}

// ── Constants ───────────────────────────────────────────────────
const GRID_COLS = 10;
const GRID_ROWS = 6;
const TILE_W = 96;
const TILE_H = 96;
const GRID_OFFSET_X = 80;
const GRID_OFFSET_Y = 80;
const CHAR_RADIUS = 28;
const HP_BAR_W = 56;
const HP_BAR_H = 6;
const MP_BAR_H = 4;
const ANIM_FPS = 8;
const RUN_THRESHOLD = 3; // grid distance to trigger running vs walking

const CLASS_COLORS: Record<CharClass, string> = {
  warrior: "#e74c3c",
  mage: "#9b59b6",
  rogue: "#2ecc71",
  healer: "#f1c40f",
  ranger: "#e67e22",
};

const CLASS_ICONS: Record<CharClass, string> = {
  warrior: "⚔️",
  mage: "🔮",
  rogue: "🗡️",
  healer: "✨",
  ranger: "🏹",
};

const SPELL_COLORS: Record<SpellType, { primary: string; secondary: string; glow: string }> = {
  fireball:     { primary: "#ff6b35", secondary: "#ffcc02", glow: "#ff4500" },
  ice_lance:    { primary: "#74b9ff", secondary: "#dfe6e9", glow: "#0984e3" },
  lightning:    { primary: "#fdcb6e", secondary: "#ffeaa7", glow: "#f9ca24" },
  heal:         { primary: "#55efc4", secondary: "#00b894", glow: "#00cec9" },
  shadow_bolt:  { primary: "#6c5ce7", secondary: "#a29bfe", glow: "#5f27cd" },
  earth_spike:  { primary: "#b2bec3", secondary: "#636e72", glow: "#d63031" },
};

const STATUS_COLORS: Record<string, string> = {
  burn: "#ff6348",
  freeze: "#74b9ff",
  shock: "#feca57",
  regen: "#55efc4",
  shield: "#a29bfe",
  poison: "#6ab04c",
};

// ── Utilities ───────────────────────────────────────────────────
function gridToWorld(gx: number, gy: number): Vec2 {
  return {
    x: GRID_OFFSET_X + gx * TILE_W + TILE_W / 2,
    y: GRID_OFFSET_Y + gy * TILE_H + TILE_H / 2,
  };
}

function worldToGrid(wx: number, wy: number): Vec2 {
  return {
    x: Math.floor((wx - GRID_OFFSET_X) / TILE_W),
    y: Math.floor((wy - GRID_OFFSET_Y) / TILE_H),
  };
}

function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function gridDist(a: Vec2, b: Vec2): number {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}

function randomRange(lo: number, hi: number): number {
  return lo + Math.random() * (hi - lo);
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

// ── Particle Factory ────────────────────────────────────────────
function spawnParticles(spell: SpellType, x: number, y: number, count: number): Particle[] {
  const c = SPELL_COLORS[spell];
  const particles: Particle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomRange(20, 120);
    const isPrimary = Math.random() > 0.4;
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      life: randomRange(0.3, 1.2),
      maxLife: randomRange(0.3, 1.2),
      size: randomRange(2, 8),
      color: isPrimary ? c.primary : c.secondary,
      alpha: 1,
      gravity: spell === "earth_spike" ? 120 : (spell === "heal" ? -60 : 0),
      decay: 1,
      glow: randomRange(4, 16),
      type: Math.random() > 0.6 ? "spark" : "circle",
    });
  }
  return particles;
}

function spawnTrailParticle(spell: SpellType, x: number, y: number): Particle {
  const c = SPELL_COLORS[spell];
  return {
    x: x + randomRange(-4, 4),
    y: y + randomRange(-4, 4),
    vx: randomRange(-15, 15),
    vy: randomRange(-15, 15),
    life: 0.4,
    maxLife: 0.4,
    size: randomRange(2, 5),
    color: Math.random() > 0.5 ? c.primary : c.secondary,
    alpha: 0.8,
    gravity: spell === "heal" ? -40 : 0,
    decay: 1,
    glow: 8,
    type: "trail",
  };
}

function spawnImpactParticles(spell: SpellType, x: number, y: number): Particle[] {
  const c = SPELL_COLORS[spell];
  const particles: Particle[] = [];
  const count = spell === "lightning" ? 30 : 40;
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = randomRange(40, 200);
    particles.push({
      x, y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - (spell === "earth_spike" ? 100 : 0),
      life: randomRange(0.4, 1.5),
      maxLife: randomRange(0.4, 1.5),
      size: randomRange(3, 12),
      color: Math.random() > 0.3 ? c.primary : c.glow,
      alpha: 1,
      gravity: spell === "earth_spike" ? 200 : (spell === "heal" ? -80 : 30),
      decay: 1,
      glow: randomRange(8, 24),
      type: Math.random() > 0.5 ? "spark" : (Math.random() > 0.5 ? "ring" : "circle"),
    });
  }
  return particles;
}

// ── BattleEngine ────────────────────────────────────────────────
export class BattleEngine {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  chars: BattleChar[] = [];
  particles: Particle[] = [];
  projectiles: SpellProjectile[] = [];
  log: BattleLogEntry[] = [];
  selectedCharId: number | null = null;
  hoveredCell: Vec2 | null = null;
  screenShake: ScreenShake | null = null;
  running = false;
  lastTime = 0;
  turnIndex = 0;
  onLogUpdate: ((log: BattleLogEntry[]) => void) | null = null;
  onSelectionChange: ((char: BattleChar | null) => void) | null = null;
  onStateChange: (() => void) | null = null;
  ambientParticleTimer = 0;
  gridPulse = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.canvas.addEventListener("click", this.handleClick);
    this.canvas.addEventListener("mousemove", this.handleMouseMove);
  }

  // ── Initialization ──────────────────────────────────────────
  initDefaultBattle(apiChars?: any[]) {
    this.chars = [];
    if (apiChars && apiChars.length > 0) {
      // Map API characters to battle characters
      const playerChars = apiChars.slice(0, Math.min(apiChars.length, 4));
      playerChars.forEach((c, i) => {
        const gx = 1;
        const gy = 1 + i;
        const wp = gridToWorld(gx, gy);
        this.chars.push({
          id: c.id ?? i + 1,
          name: c.name ?? `Hero ${i + 1}`,
          charClass: this.mapApiClass(c.class ?? c.character_class ?? "warrior"),
          team: "player",
          level: c.level ?? 1,
          hp: c.hp ?? c.health ?? 100,
          maxHp: c.max_hp ?? c.health ?? 100,
          mp: c.mp ?? c.mana ?? 50,
          maxMp: c.max_mp ?? c.mana ?? 50,
          pos: { ...wp },
          gridPos: { x: gx, y: gy },
          targetPos: null,
          state: "idle",
          moveSpeed: 200,
          facing: 0,
          animFrame: 0,
          animTimer: 0,
          statusEffects: [],
          castTimer: 0,
          castDuration: 0,
          castSpell: null,
          castTarget: null,
          hitFlashTimer: 0,
        });
      });
    } else {
      // Default demo characters
      const playerDefs: [string, CharClass, number, number][] = [
        ["Kael", "warrior", 1, 1],
        ["Lyra", "mage", 1, 2],
        ["Shade", "rogue", 1, 3],
        ["Sera", "healer", 1, 4],
      ];
      playerDefs.forEach(([name, cls, gx, gy], i) => {
        const wp = gridToWorld(gx, gy);
        this.chars.push({
          id: i + 1, name, charClass: cls, team: "player",
          level: randomRange(3, 12) | 0,
          hp: 100, maxHp: 100, mp: 60, maxMp: 60,
          pos: { ...wp }, gridPos: { x: gx, y: gy }, targetPos: null,
          state: "idle", moveSpeed: 200, facing: 0,
          animFrame: 0, animTimer: 0, statusEffects: [],
          castTimer: 0, castDuration: 0, castSpell: null, castTarget: null,
          hitFlashTimer: 0,
        });
      });
    }

    // Enemy characters
    const enemyDefs: [string, CharClass, number, number][] = [
      ["Dread Knight", "warrior", 8, 1],
      ["Dark Mage", "mage", 8, 2],
      ["Shadow", "rogue", 8, 3],
      ["Necro", "healer", 8, 4],
    ];
    enemyDefs.forEach(([name, cls, gx, gy], i) => {
      const wp = gridToWorld(gx, gy);
      this.chars.push({
        id: 100 + i, name, charClass: cls, team: "enemy",
        level: randomRange(3, 12) | 0,
        hp: 80 + randomRange(0, 40) | 0, maxHp: 120, mp: 50, maxMp: 50,
        pos: { ...wp }, gridPos: { x: gx, y: gy }, targetPos: null,
        state: "idle", moveSpeed: 180, facing: Math.PI,
        animFrame: 0, animTimer: 0, statusEffects: [],
        castTimer: 0, castDuration: 0, castSpell: null, castTarget: null,
        hitFlashTimer: 0,
      });
    });

    this.addLog("Battle begins!", "system");
  }

  private mapApiClass(cls: string): CharClass {
    const map: Record<string, CharClass> = {
      warrior: "warrior", fighter: "warrior", knight: "warrior", paladin: "warrior",
      mage: "mage", wizard: "mage", sorcerer: "mage",
      rogue: "rogue", thief: "rogue", assassin: "rogue",
      healer: "healer", cleric: "healer", priest: "healer",
      ranger: "ranger", archer: "ranger", hunter: "ranger",
    };
    return map[cls.toLowerCase()] ?? "warrior";
  }

  // ── Game loop ───────────────────────────────────────────────
  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    requestAnimationFrame(this.loop);
  }

  stop() {
    this.running = false;
  }

  private loop = (now: number) => {
    if (!this.running) return;
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;
    this.update(dt);
    this.render();
    requestAnimationFrame(this.loop);
  };

  // ── Update ──────────────────────────────────────────────────
  private update(dt: number) {
    this.gridPulse += dt;
    this.ambientParticleTimer += dt;

    // Ambient particles on grid
    if (this.ambientParticleTimer > 0.3) {
      this.ambientParticleTimer = 0;
      const rx = GRID_OFFSET_X + Math.random() * GRID_COLS * TILE_W;
      const ry = GRID_OFFSET_Y + Math.random() * GRID_ROWS * TILE_H;
      this.particles.push({
        x: rx, y: ry, vx: randomRange(-5, 5), vy: -randomRange(10, 30),
        life: 2, maxLife: 2, size: randomRange(1, 3),
        color: "hsl(43,85%,55%)", alpha: 0.3, gravity: -5, decay: 1, glow: 4,
        type: "circle",
      });
    }

    // Update characters
    for (const ch of this.chars) {
      if (ch.state === "dead") continue;

      // Hit flash
      if (ch.hitFlashTimer > 0) ch.hitFlashTimer -= dt;

      // Movement
      if (ch.targetPos && (ch.state === "walking" || ch.state === "running")) {
        const d = dist(ch.pos, ch.targetPos);
        const speed = ch.state === "running" ? ch.moveSpeed * 1.8 : ch.moveSpeed;
        if (d < 4) {
          ch.pos = { ...ch.targetPos };
          ch.targetPos = null;
          ch.state = "idle";
          ch.animFrame = 0;
        } else {
          const dx = ch.targetPos.x - ch.pos.x;
          const dy = ch.targetPos.y - ch.pos.y;
          const len = Math.sqrt(dx * dx + dy * dy);
          ch.pos.x += (dx / len) * speed * dt;
          ch.pos.y += (dy / len) * speed * dt;
          ch.facing = Math.atan2(dy, dx);

          // Walk dust particles
          if (Math.random() > 0.7) {
            this.particles.push({
              x: ch.pos.x + randomRange(-8, 8),
              y: ch.pos.y + CHAR_RADIUS - 4,
              vx: randomRange(-10, 10), vy: randomRange(-5, -20),
              life: 0.5, maxLife: 0.5, size: randomRange(2, 4),
              color: "#8b7355", alpha: 0.5, gravity: 0, decay: 1, glow: 0,
              type: "circle",
            });
          }
        }
        // Animate walk/run bobbing
        ch.animTimer += dt;
        if (ch.animTimer > 1 / (ch.state === "running" ? ANIM_FPS * 2 : ANIM_FPS)) {
          ch.animTimer = 0;
          ch.animFrame = (ch.animFrame + 1) % 4;
        }
      }

      // Casting
      if (ch.state === "casting" && ch.castSpell) {
        ch.castTimer += dt;
        // Cast aura particles
        if (Math.random() > 0.5) {
          const angle = Math.random() * Math.PI * 2;
          const r = CHAR_RADIUS + 10;
          const c = SPELL_COLORS[ch.castSpell];
          this.particles.push({
            x: ch.pos.x + Math.cos(angle) * r,
            y: ch.pos.y + Math.sin(angle) * r,
            vx: Math.cos(angle) * -20,
            vy: Math.sin(angle) * -20 - 15,
            life: 0.6, maxLife: 0.6, size: randomRange(2, 5),
            color: c.primary, alpha: 0.8, gravity: -30, decay: 1, glow: 12,
            type: "circle",
          });
        }
        if (ch.castTimer >= ch.castDuration) {
          // Fire the spell
          if (ch.castTarget) {
            this.fireSpell(ch, ch.castSpell, ch.castTarget);
          }
          ch.state = "idle";
          ch.castTimer = 0;
          ch.castSpell = null;
          ch.castTarget = null;
        }
      }

      // Status effect timers
      ch.statusEffects = ch.statusEffects.filter(s => {
        s.duration -= dt;
        // Status particle
        if (Math.random() > 0.85) {
          const c = STATUS_COLORS[s.type] ?? "#fff";
          this.particles.push({
            x: ch.pos.x + randomRange(-12, 12),
            y: ch.pos.y - CHAR_RADIUS + randomRange(-5, 5),
            vx: randomRange(-8, 8), vy: -randomRange(15, 30),
            life: 0.6, maxLife: 0.6, size: randomRange(2, 4),
            color: c, alpha: 0.6, gravity: -10, decay: 1, glow: 6,
            type: "circle",
          });
        }
        // Regen tick
        if (s.type === "regen" && Math.random() > 0.95) {
          ch.hp = Math.min(ch.maxHp, ch.hp + 1);
        }
        // Burn tick
        if (s.type === "burn" && Math.random() > 0.97) {
          ch.hp = Math.max(0, ch.hp - 1);
          if (ch.hp <= 0) ch.state = "dead";
        }
        return s.duration > 0;
      });

      // Idle breathing animation
      if (ch.state === "idle") {
        ch.animTimer += dt;
        if (ch.animTimer > 1 / 3) {
          ch.animTimer = 0;
          ch.animFrame = (ch.animFrame + 1) % 2;
        }
      }
    }

    // Update projectiles
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.progress += (proj.speed / dist(proj.from, proj.to)) * dt;
      proj.pos.x = lerp(proj.from.x, proj.to.x, easeInOutQuad(Math.min(proj.progress, 1)));
      proj.pos.y = lerp(proj.from.y, proj.to.y, easeInOutQuad(Math.min(proj.progress, 1)));

      // Projectile trail
      if (Math.random() > 0.3) {
        this.particles.push(spawnTrailParticle(proj.spell, proj.pos.x, proj.pos.y));
      }

      // Lightning special: random sparks along path
      if (proj.spell === "lightning" && Math.random() > 0.6) {
        this.particles.push({
          x: proj.pos.x + randomRange(-20, 20),
          y: proj.pos.y + randomRange(-20, 20),
          vx: randomRange(-60, 60), vy: randomRange(-60, 60),
          life: 0.15, maxLife: 0.15, size: 2,
          color: "#ffeaa7", alpha: 1, gravity: 0, decay: 1, glow: 16,
          type: "spark",
        });
      }

      if (proj.progress >= 1) {
        proj.alive = false;
        // Impact
        this.particles.push(...spawnImpactParticles(proj.spell, proj.to.x, proj.to.y));
        // Screen shake
        this.screenShake = { intensity: proj.spell === "lightning" ? 8 : 5, duration: 0.3, elapsed: 0 };
        proj.onImpact?.();
      }
    }
    this.projectiles = this.projectiles.filter(p => p.alive || p.progress < 1.5);

    // Update particles
    for (const p of this.particles) {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.life -= dt;
      p.alpha = clamp(p.life / p.maxLife, 0, 1);
    }
    this.particles = this.particles.filter(p => p.life > 0);

    // Screen shake
    if (this.screenShake) {
      this.screenShake.elapsed += dt;
      if (this.screenShake.elapsed >= this.screenShake.duration) {
        this.screenShake = null;
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────
  private render() {
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;

    ctx.save();

    // Screen shake
    if (this.screenShake) {
      const t = 1 - this.screenShake.elapsed / this.screenShake.duration;
      const shakeX = (Math.random() - 0.5) * this.screenShake.intensity * t * 2;
      const shakeY = (Math.random() - 0.5) * this.screenShake.intensity * t * 2;
      ctx.translate(shakeX, shakeY);
    }

    // Background
    this.renderBackground(ctx, w, h);

    // Grid
    this.renderGrid(ctx);

    // Characters (sorted by y for depth)
    const sortedChars = [...this.chars].sort((a, b) => a.pos.y - b.pos.y);
    for (const ch of sortedChars) {
      this.renderCharacter(ctx, ch);
    }

    // Projectiles
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      this.renderProjectile(ctx, proj);
    }

    // Particles
    for (const p of this.particles) {
      this.renderParticle(ctx, p);
    }

    // Hover cell highlight
    if (this.hoveredCell) {
      const wx = GRID_OFFSET_X + this.hoveredCell.x * TILE_W;
      const wy = GRID_OFFSET_Y + this.hoveredCell.y * TILE_H;
      ctx.strokeStyle = "rgba(212,175,55,0.4)";
      ctx.lineWidth = 2;
      ctx.strokeRect(wx, wy, TILE_W, TILE_H);
    }

    ctx.restore();
  }

  private renderBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
    // Dark gradient background
    const bg = ctx.createLinearGradient(0, 0, 0, h);
    bg.addColorStop(0, "hsl(225,30%,6%)");
    bg.addColorStop(0.5, "hsl(225,28%,10%)");
    bg.addColorStop(1, "hsl(225,30%,6%)");
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, w, h);

    // Subtle vignette
    const vg = ctx.createRadialGradient(w / 2, h / 2, w * 0.2, w / 2, h / 2, w * 0.7);
    vg.addColorStop(0, "transparent");
    vg.addColorStop(1, "rgba(0,0,0,0.4)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, w, h);
  }

  private renderGrid(ctx: CanvasRenderingContext2D) {
    const pulse = Math.sin(this.gridPulse * 0.8) * 0.15 + 0.35;

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const x = GRID_OFFSET_X + col * TILE_W;
        const y = GRID_OFFSET_Y + row * TILE_H;
        const isEven = (row + col) % 2 === 0;

        // Tile fill
        ctx.fillStyle = isEven ? "rgba(30,35,50,0.6)" : "rgba(20,25,40,0.6)";
        ctx.fillRect(x, y, TILE_W, TILE_H);

        // Tile border
        ctx.strokeStyle = `rgba(212,175,55,${pulse * 0.3})`;
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, TILE_W - 1, TILE_H - 1);

        // Corner ornaments on some tiles
        if ((row === 0 || row === GRID_ROWS - 1) && (col === 0 || col === GRID_COLS - 1)) {
          ctx.fillStyle = `rgba(212,175,55,${pulse * 0.5})`;
          ctx.beginPath();
          ctx.arc(x + (col === 0 ? 8 : TILE_W - 8), y + (row === 0 ? 8 : TILE_H - 8), 3, 0, Math.PI * 2);
          ctx.fill();
        }
      }
    }

    // Team zone indicators
    ctx.fillStyle = "rgba(46,204,113,0.05)";
    ctx.fillRect(GRID_OFFSET_X, GRID_OFFSET_Y, TILE_W * 3, TILE_H * GRID_ROWS);
    ctx.fillStyle = "rgba(231,76,60,0.05)";
    ctx.fillRect(GRID_OFFSET_X + TILE_W * 7, GRID_OFFSET_Y, TILE_W * 3, TILE_H * GRID_ROWS);

    // Zone labels
    ctx.font = "11px 'Spectral SC', serif";
    ctx.fillStyle = "rgba(46,204,113,0.3)";
    ctx.textAlign = "center";
    ctx.fillText("ALLIES", GRID_OFFSET_X + TILE_W * 1.5, GRID_OFFSET_Y - 10);
    ctx.fillStyle = "rgba(231,76,60,0.3)";
    ctx.fillText("ENEMIES", GRID_OFFSET_X + TILE_W * 8.5, GRID_OFFSET_Y - 10);
    ctx.textAlign = "start";
  }

  private renderCharacter(ctx: CanvasRenderingContext2D, ch: BattleChar) {
    if (ch.state === "dead") {
      this.renderDeadCharacter(ctx, ch);
      return;
    }

    const { x, y } = ch.pos;
    const isSelected = ch.id === this.selectedCharId;
    const bob = ch.state === "idle" ? Math.sin(ch.animTimer * 3) * 2 : 0;
    const walkBob = (ch.state === "walking" || ch.state === "running")
      ? Math.abs(Math.sin(ch.animFrame * Math.PI / 2)) * 4 : 0;
    const drawY = y + bob - walkBob;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(x, y + CHAR_RADIUS + 4, CHAR_RADIUS * 0.8, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    // Selection ring
    if (isSelected) {
      ctx.strokeStyle = "rgba(212,175,55,0.8)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(x, y + CHAR_RADIUS + 4, CHAR_RADIUS + 6, 8, 0, 0, Math.PI * 2);
      ctx.stroke();

      // Animated selection particles
      const selAngle = this.gridPulse * 2;
      for (let i = 0; i < 4; i++) {
        const sa = selAngle + (i * Math.PI / 2);
        const sx = x + Math.cos(sa) * (CHAR_RADIUS + 6);
        const sy = y + CHAR_RADIUS + 4 + Math.sin(sa) * 8;
        ctx.fillStyle = "rgba(212,175,55,0.6)";
        ctx.beginPath();
        ctx.arc(sx, sy, 2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Hit flash
    const flashAlpha = ch.hitFlashTimer > 0 ? Math.sin(ch.hitFlashTimer * 30) * 0.5 + 0.5 : 0;

    // Character body (main circle with gradient)
    const teamColor = ch.team === "player" ? CLASS_COLORS[ch.charClass] : "#c0392b";
    const bodyGrad = ctx.createRadialGradient(x - 6, drawY - 6, 2, x, drawY, CHAR_RADIUS);
    bodyGrad.addColorStop(0, teamColor);
    bodyGrad.addColorStop(0.7, teamColor);
    bodyGrad.addColorStop(1, "rgba(0,0,0,0.5)");

    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(x, drawY, CHAR_RADIUS, 0, Math.PI * 2);
    ctx.fill();

    // Outline
    ctx.strokeStyle = ch.team === "player" ? "rgba(212,175,55,0.6)" : "rgba(192,57,43,0.6)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // Hit flash overlay
    if (flashAlpha > 0) {
      ctx.fillStyle = `rgba(255,255,255,${flashAlpha})`;
      ctx.beginPath();
      ctx.arc(x, drawY, CHAR_RADIUS, 0, Math.PI * 2);
      ctx.fill();
    }

    // Class icon
    ctx.font = "20px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(CLASS_ICONS[ch.charClass], x, drawY);

    // Casting glow
    if (ch.state === "casting" && ch.castSpell) {
      const castProgress = ch.castTimer / ch.castDuration;
      const c = SPELL_COLORS[ch.castSpell];
      const glowRadius = CHAR_RADIUS + 10 + Math.sin(this.gridPulse * 6) * 4;
      ctx.save();
      ctx.globalAlpha = 0.3 + castProgress * 0.4;
      ctx.shadowBlur = 20 + castProgress * 20;
      ctx.shadowColor = c.glow;
      ctx.strokeStyle = c.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(x, drawY, glowRadius, 0, Math.PI * 2);
      ctx.stroke();
      // Cast progress arc
      ctx.strokeStyle = c.secondary;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, drawY, glowRadius + 4, -Math.PI / 2, -Math.PI / 2 + castProgress * Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    // Name
    ctx.font = "bold 10px 'Spectral SC', serif";
    ctx.textAlign = "center";
    ctx.fillStyle = ch.team === "player" ? "rgba(212,175,55,0.9)" : "rgba(231,76,60,0.9)";
    ctx.fillText(ch.name, x, drawY - CHAR_RADIUS - 28);

    // Level badge
    ctx.font = "bold 8px 'Spectral SC', serif";
    ctx.fillStyle = "rgba(255,255,255,0.7)";
    ctx.fillText(`Lv.${ch.level}`, x, drawY - CHAR_RADIUS - 18);

    // HP bar
    const hpBarX = x - HP_BAR_W / 2;
    const hpBarY = drawY + CHAR_RADIUS + 8;
    const hpRatio = ch.hp / ch.maxHp;
    // BG
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(hpBarX - 1, hpBarY - 1, HP_BAR_W + 2, HP_BAR_H + 2);
    // HP fill
    const hpColor = hpRatio > 0.6 ? "#2ecc71" : hpRatio > 0.3 ? "#f39c12" : "#e74c3c";
    ctx.fillStyle = hpColor;
    ctx.fillRect(hpBarX, hpBarY, HP_BAR_W * hpRatio, HP_BAR_H);
    // HP glow
    if (hpRatio < 0.3) {
      ctx.shadowBlur = 6;
      ctx.shadowColor = "#e74c3c";
      ctx.fillRect(hpBarX, hpBarY, HP_BAR_W * hpRatio, HP_BAR_H);
      ctx.shadowBlur = 0;
    }

    // MP bar
    const mpBarY = hpBarY + HP_BAR_H + 2;
    const mpRatio = ch.mp / ch.maxMp;
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.fillRect(hpBarX - 1, mpBarY - 1, HP_BAR_W + 2, MP_BAR_H + 2);
    ctx.fillStyle = "#3498db";
    ctx.fillRect(hpBarX, mpBarY, HP_BAR_W * mpRatio, MP_BAR_H);

    // Status effect icons
    let statusX = x - (ch.statusEffects.length * 10) / 2;
    for (const se of ch.statusEffects) {
      ctx.fillStyle = STATUS_COLORS[se.type] ?? "#fff";
      ctx.shadowBlur = 4;
      ctx.shadowColor = ctx.fillStyle;
      ctx.beginPath();
      ctx.arc(statusX + 5, mpBarY + MP_BAR_H + 8, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      statusX += 10;
    }

    // Walking/running indicator
    if (ch.state === "walking" || ch.state === "running") {
      ctx.font = "8px 'Spectral SC', serif";
      ctx.fillStyle = ch.state === "running" ? "#e74c3c" : "#3498db";
      ctx.textAlign = "center";
      ctx.fillText(ch.state === "running" ? "🏃 RUN" : "🚶 WALK", x, drawY - CHAR_RADIUS - 38);
    }

    ctx.textBaseline = "alphabetic";
  }

  private renderDeadCharacter(ctx: CanvasRenderingContext2D, ch: BattleChar) {
    const { x, y } = ch.pos;
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#555";
    ctx.beginPath();
    ctx.ellipse(x, y + 10, CHAR_RADIUS, CHAR_RADIUS * 0.4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = "16px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("💀", x, y);
    ctx.font = "bold 10px 'Spectral SC', serif";
    ctx.fillStyle = "#888";
    ctx.fillText(ch.name, x, y - 20);
    ctx.globalAlpha = 1;
    ctx.textBaseline = "alphabetic";
  }

  private renderProjectile(ctx: CanvasRenderingContext2D, proj: SpellProjectile) {
    const { x, y } = proj.pos;
    const c = SPELL_COLORS[proj.spell];

    ctx.save();

    // Outer glow
    ctx.shadowBlur = 20;
    ctx.shadowColor = c.glow;

    // Core
    const coreGrad = ctx.createRadialGradient(x, y, 0, x, y, 12);
    coreGrad.addColorStop(0, "#fff");
    coreGrad.addColorStop(0.3, c.secondary);
    coreGrad.addColorStop(1, c.primary);
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.fill();

    // Extra glow ring
    ctx.strokeStyle = c.primary;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.4;
    ctx.beginPath();
    ctx.arc(x, y, 14, 0, Math.PI * 2);
    ctx.stroke();

    // Lightning bolt special
    if (proj.spell === "lightning") {
      ctx.globalAlpha = 0.8;
      ctx.strokeStyle = c.primary;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x, y);
      for (let i = 0; i < 4; i++) {
        ctx.lineTo(
          x + randomRange(-15, 15),
          y + randomRange(-15, 15)
        );
      }
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderParticle(ctx: CanvasRenderingContext2D, p: Particle) {
    ctx.save();
    ctx.globalAlpha = p.alpha;

    if (p.glow > 0) {
      ctx.shadowBlur = p.glow;
      ctx.shadowColor = p.color;
    }

    ctx.fillStyle = p.color;

    switch (p.type) {
      case "circle":
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
        break;
      case "spark":
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.moveTo(p.x - p.vx * 0.02, p.y - p.vy * 0.02);
        ctx.lineTo(p.x + p.vx * 0.02, p.y + p.vy * 0.02);
        ctx.stroke();
        break;
      case "ring":
        ctx.strokeStyle = p.color;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (1 + (1 - p.alpha) * 3), 0, Math.PI * 2);
        ctx.stroke();
        break;
      case "trail":
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * p.alpha, 0, Math.PI * 2);
        ctx.fill();
        break;
    }

    ctx.restore();
  }

  // ── Actions ─────────────────────────────────────────────────
  moveCharTo(charId: number, gx: number, gy: number) {
    const ch = this.chars.find(c => c.id === charId);
    if (!ch || ch.state === "dead" || ch.state === "casting") return;
    gx = clamp(gx, 0, GRID_COLS - 1);
    gy = clamp(gy, 0, GRID_ROWS - 1);
    const target = gridToWorld(gx, gy);
    const gd = gridDist(ch.gridPos, { x: gx, y: gy });
    ch.targetPos = target;
    ch.gridPos = { x: gx, y: gy };
    ch.state = gd >= RUN_THRESHOLD ? "running" : "walking";
    ch.animFrame = 0;
    this.addLog(`${ch.name} ${ch.state === "running" ? "runs" : "walks"} to (${gx},${gy})`, "action");
    this.onStateChange?.();
  }

  castSpell(casterId: number, spell: SpellType, targetId: number) {
    const caster = this.chars.find(c => c.id === casterId);
    const target = this.chars.find(c => c.id === targetId);
    if (!caster || !target || caster.state === "dead" || target.state === "dead") return;

    const mpCost = spell === "heal" ? 15 : 10;
    if (caster.mp < mpCost) {
      this.addLog(`${caster.name} doesn't have enough MP!`, "system");
      return;
    }
    caster.mp -= mpCost;

    caster.state = "casting";
    caster.castSpell = spell;
    caster.castTarget = { ...target.pos };
    caster.castDuration = 1.0;
    caster.castTimer = 0;
    caster.facing = Math.atan2(target.pos.y - caster.pos.y, target.pos.x - caster.pos.x);

    this.addLog(`${caster.name} begins casting ${spell.replace("_", " ")}...`, "action");
    this.onStateChange?.();
  }

  private fireSpell(caster: BattleChar, spell: SpellType, targetPos: Vec2) {
    const proj: SpellProjectile = {
      spell,
      from: { ...caster.pos },
      to: { ...targetPos },
      pos: { ...caster.pos },
      speed: spell === "lightning" ? 600 : 350,
      progress: 0,
      particles: [],
      alive: true,
      onImpact: () => {
        // Find target char at position
        const target = this.chars.find(c =>
          c.state !== "dead" && dist(c.pos, targetPos) < CHAR_RADIUS * 2
        );
        if (target) {
          if (spell === "heal") {
            const healAmt = 20 + Math.floor(Math.random() * 15);
            target.hp = Math.min(target.maxHp, target.hp + healAmt);
            this.addLog(`${caster.name} heals ${target.name} for ${healAmt} HP!`, "heal");
            target.statusEffects.push({ type: "regen", duration: 5, strength: 2 });
          } else {
            const dmg = 15 + Math.floor(Math.random() * 20);
            target.hp = Math.max(0, target.hp - dmg);
            target.hitFlashTimer = 0.4;
            this.addLog(`${caster.name} hits ${target.name} with ${spell.replace("_", " ")} for ${dmg} damage!`, "damage");

            // Apply status based on spell
            if (spell === "fireball") target.statusEffects.push({ type: "burn", duration: 4, strength: 3 });
            if (spell === "ice_lance") target.statusEffects.push({ type: "freeze", duration: 3, strength: 2 });
            if (spell === "lightning") target.statusEffects.push({ type: "shock", duration: 2, strength: 4 });
            if (spell === "shadow_bolt") target.statusEffects.push({ type: "poison", duration: 5, strength: 2 });

            if (target.hp <= 0) {
              target.state = "dead";
              this.addLog(`${target.name} has been defeated!`, "system");
              // Death particles
              this.particles.push(...spawnImpactParticles(spell, target.pos.x, target.pos.y));
            }
          }
        }
        this.onStateChange?.();
      },
    };
    this.projectiles.push(proj);
  }

  autoAttackTarget(attackerId: number, targetId: number) {
    const attacker = this.chars.find(c => c.id === attackerId);
    const target = this.chars.find(c => c.id === targetId);
    if (!attacker || !target || attacker.state === "dead" || target.state === "dead") return;

    attacker.state = "attacking";
    attacker.facing = Math.atan2(target.pos.y - attacker.pos.y, target.pos.x - attacker.pos.x);

    const dmg = 8 + Math.floor(Math.random() * 12);
    target.hp = Math.max(0, target.hp - dmg);
    target.hitFlashTimer = 0.3;

    // Attack slash particles
    const angle = Math.atan2(target.pos.y - attacker.pos.y, target.pos.x - attacker.pos.x);
    for (let i = 0; i < 10; i++) {
      const a = angle + randomRange(-0.5, 0.5);
      this.particles.push({
        x: target.pos.x, y: target.pos.y,
        vx: Math.cos(a) * randomRange(30, 80),
        vy: Math.sin(a) * randomRange(30, 80),
        life: 0.3, maxLife: 0.3, size: randomRange(2, 5),
        color: "#fff", alpha: 1, gravity: 0, decay: 1, glow: 6,
        type: "spark",
      });
    }

    this.addLog(`${attacker.name} attacks ${target.name} for ${dmg} damage!`, "damage");
    this.screenShake = { intensity: 3, duration: 0.15, elapsed: 0 };

    if (target.hp <= 0) {
      target.state = "dead";
      this.addLog(`${target.name} has been defeated!`, "system");
    }

    setTimeout(() => {
      if (attacker.state === "attacking") attacker.state = "idle";
    }, 400);

    this.onStateChange?.();
  }

  // ── Input ───────────────────────────────────────────────────
  private handleClick = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;

    // Check if clicked on a character
    for (const ch of this.chars) {
      if (ch.state === "dead") continue;
      if (dist(ch.pos, { x: mx, y: my }) < CHAR_RADIUS + 4) {
        this.selectedCharId = ch.id;
        this.onSelectionChange?.(ch);
        return;
      }
    }

    // Check if clicked on grid — move selected char
    const cell = worldToGrid(mx, my);
    if (cell.x >= 0 && cell.x < GRID_COLS && cell.y >= 0 && cell.y < GRID_ROWS) {
      if (this.selectedCharId != null) {
        this.moveCharTo(this.selectedCharId, cell.x, cell.y);
      }
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const cell = worldToGrid(mx, my);
    if (cell.x >= 0 && cell.x < GRID_COLS && cell.y >= 0 && cell.y < GRID_ROWS) {
      this.hoveredCell = cell;
    } else {
      this.hoveredCell = null;
    }
  };

  // ── Helpers ─────────────────────────────────────────────────
  private addLog(text: string, type: BattleLogEntry["type"]) {
    this.log.push({ time: Date.now(), text, type });
    if (this.log.length > 100) this.log.shift();
    this.onLogUpdate?.(this.log);
  }

  getPlayerChars(): BattleChar[] {
    return this.chars.filter(c => c.team === "player");
  }

  getEnemyChars(): BattleChar[] {
    return this.chars.filter(c => c.team === "enemy");
  }

  getSelectedChar(): BattleChar | null {
    return this.chars.find(c => c.id === this.selectedCharId) ?? null;
  }

  selectChar(id: number | null) {
    this.selectedCharId = id;
    this.onSelectionChange?.(id != null ? this.chars.find(c => c.id === id) ?? null : null);
  }

  destroy() {
    this.running = false;
    this.canvas.removeEventListener("click", this.handleClick);
    this.canvas.removeEventListener("mousemove", this.handleMouseMove);
  }
}

export { GRID_COLS, GRID_ROWS, TILE_W, TILE_H, CLASS_ICONS, CLASS_COLORS, SPELL_COLORS };
