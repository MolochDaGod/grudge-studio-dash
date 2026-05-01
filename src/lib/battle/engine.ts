// ════════════════════════════════════════════════════════════════
// Grudge 3D Battle Engine — Three.js scene with GLB race models
// Grid arena, walk/run movement, spell casting VFX
// ════════════════════════════════════════════════════════════════

import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { DRACOLoader } from "three/examples/jsm/loaders/DRACOLoader.js";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

// ── Asset CDN ───────────────────────────────────────────────────
const CDN = "https://assets.grudge-studio.com";

// ── Types ───────────────────────────────────────────────────────
export type RaceId = "human" | "barbarian" | "dwarf" | "elf" | "orc" | "undead";
export type ClassId = "warrior" | "mage" | "ranger" | "worg";
export type Team = "player" | "enemy";
export type CharState = "idle" | "walking" | "running" | "casting" | "attacking" | "hit" | "dead";
export type SpellType = "fireball" | "ice_lance" | "lightning" | "heal" | "shadow_bolt";

export interface BattleChar {
  id: number;
  name: string;
  raceId: RaceId;
  classId: ClassId;
  team: Team;
  level: number;
  hp: number;
  maxHp: number;
  mp: number;
  maxMp: number;
  gridX: number;
  gridZ: number;
  state: CharState;
  model: THREE.Group | null;
  mixer: THREE.AnimationMixer | null;
  actions: Map<string, THREE.AnimationAction>;
  targetWorldPos: THREE.Vector3 | null;
  moveSpeed: number;
  castTimer: number;
  castDuration: number;
  castSpell: SpellType | null;
  castTargetId: number | null;
  hitFlash: number;
  nameSprite: THREE.Sprite | null;
  hpBarGroup: THREE.Group | null;
}

export interface BattleLogEntry {
  time: number;
  text: string;
  type: "action" | "damage" | "heal" | "status" | "system";
}

interface VFXParticle {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number;
  maxLife: number;
}

interface SpellProjectile {
  spell: SpellType;
  mesh: THREE.Mesh;
  from: THREE.Vector3;
  to: THREE.Vector3;
  progress: number;
  speed: number;
  alive: boolean;
  onImpact: (() => void) | null;
}

// ── Constants ───────────────────────────────────────────────────
const GRID_COLS = 10;
const GRID_ROWS = 6;
const TILE_SIZE = 4;
const GRID_ORIGIN_X = -(GRID_COLS * TILE_SIZE) / 2;
const GRID_ORIGIN_Z = -(GRID_ROWS * TILE_SIZE) / 2;

const RACE_MODELS: Record<RaceId, { path: string; scale: number }> = {
  human:     { path: "/models/characters/human.glb",     scale: 1.0 },
  barbarian: { path: "/models/characters/barbarian.glb", scale: 1.1 },
  dwarf:     { path: "/models/characters/dwarf.glb",     scale: 0.85 },
  elf:       { path: "/models/characters/elf.glb",       scale: 1.0 },
  orc:       { path: "/models/characters/orc.glb",       scale: 1.15 },
  undead:    { path: "/models/characters/undead.glb",     scale: 1.0 },
};

const SPELL_COLORS: Record<SpellType, number> = {
  fireball:    0xff6b35,
  ice_lance:   0x74b9ff,
  lightning:   0xfdcb6e,
  heal:        0x55efc4,
  shadow_bolt: 0x6c5ce7,
};

// ── Helpers ─────────────────────────────────────────────────────
function gridToWorld(gx: number, gz: number): THREE.Vector3 {
  return new THREE.Vector3(
    GRID_ORIGIN_X + gx * TILE_SIZE + TILE_SIZE / 2,
    0,
    GRID_ORIGIN_Z + gz * TILE_SIZE + TILE_SIZE / 2,
  );
}

function gridDist(a: { x: number; z: number }, b: { x: number; z: number }): number {
  return Math.abs(a.x - b.x) + Math.abs(a.z - b.z);
}

// ── BattleEngine3D ──────────────────────────────────────────────
export class BattleEngine3D {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  clock: THREE.Clock;

  chars: BattleChar[] = [];
  particles: VFXParticle[] = [];
  projectiles: SpellProjectile[] = [];
  log: BattleLogEntry[] = [];

  selectedCharId: number | null = null;
  running = false;
  animFrameId: number | null = null;

  private gltfLoader: GLTFLoader;
  private modelCache = new Map<string, GLTF>();
  private gridGroup: THREE.Group;
  private gridHighlight: THREE.Mesh | null = null;
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();

  onLogUpdate: ((log: BattleLogEntry[]) => void) | null = null;
  onSelectionChange: ((ch: BattleChar | null) => void) | null = null;
  onStateChange: (() => void) | null = null;
  onLoadProgress: ((msg: string | null) => void) | null = null;

  constructor(canvas: HTMLCanvasElement, width: number, height: number) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.3;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x1a1a2e);
    this.scene.fog = new THREE.FogExp2(0x1a1a2e, 0.012);

    this.camera = new THREE.PerspectiveCamera(50, width / height, 0.5, 500);
    this.camera.position.set(0, 35, 30);

    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0, -4);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.maxPolarAngle = Math.PI * 0.45;
    this.controls.minDistance = 15;
    this.controls.maxDistance = 80;
    this.controls.update();

    this.clock = new THREE.Clock();

    this.gltfLoader = new GLTFLoader();
    const draco = new DRACOLoader();
    draco.setDecoderPath("https://www.gstatic.com/draco/versioned/decoders/1.5.7/");
    this.gltfLoader.setDRACOLoader(draco);

    this.gridGroup = new THREE.Group();
    this.scene.add(this.gridGroup);

    this.setupLighting();
    this.buildGrid();

    canvas.addEventListener("click", (e) => this.handleClick(e, canvas));
    canvas.addEventListener("mousemove", (e) => this.handleMouseMove(e, canvas));
  }

  private setupLighting() {
    this.scene.add(new THREE.HemisphereLight(0x6688cc, 0x332211, 0.5));

    const sun = new THREE.DirectionalLight(0xfff4e0, 1.5);
    sun.position.set(20, 40, 15);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    const sc = sun.shadow.camera;
    sc.left = -30; sc.right = 30; sc.top = 20; sc.bottom = -20;
    sc.near = 1; sc.far = 100;
    sun.shadow.bias = -0.001;
    this.scene.add(sun);

    this.scene.add(Object.assign(new THREE.DirectionalLight(0xd4af37, 0.4), { position: new THREE.Vector3(-15, 10, -20) }));

    for (const [x, z] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) {
      const pl = new THREE.PointLight(0xd4af37, 0.3, 20);
      pl.position.set(x * GRID_COLS * TILE_SIZE / 2, 3, z * GRID_ROWS * TILE_SIZE / 2);
      this.scene.add(pl);
    }
  }

  private buildGrid() {
    const floorGeo = new THREE.PlaneGeometry(GRID_COLS * TILE_SIZE + 8, GRID_ROWS * TILE_SIZE + 8);
    const floor = new THREE.Mesh(floorGeo, new THREE.MeshStandardMaterial({ color: 0x16213e, roughness: 0.9, metalness: 0.1 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.05;
    floor.receiveShadow = true;
    this.scene.add(floor);

    for (let row = 0; row < GRID_ROWS; row++) {
      for (let col = 0; col < GRID_COLS; col++) {
        const tileGeo = new THREE.PlaneGeometry(TILE_SIZE - 0.15, TILE_SIZE - 0.15);
        const tile = new THREE.Mesh(tileGeo, new THREE.MeshStandardMaterial({
          color: (row + col) % 2 === 0 ? 0x1e2340 : 0x161b33,
          roughness: 0.85, metalness: 0.05, transparent: true, opacity: 0.9,
        }));
        tile.rotation.x = -Math.PI / 2;
        const wp = gridToWorld(col, row);
        tile.position.set(wp.x, 0.01, wp.z);
        tile.receiveShadow = true;
        tile.userData = { type: "gridTile", col, row };
        this.gridGroup.add(tile);

        const edges = new THREE.LineSegments(
          new THREE.EdgesGeometry(tileGeo),
          new THREE.LineBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0.2 }),
        );
        edges.rotation.x = -Math.PI / 2;
        edges.position.set(wp.x, 0.02, wp.z);
        this.gridGroup.add(edges);
      }
    }

    // Team zones
    for (const [color, xOff] of [[0x2ecc71, GRID_ORIGIN_X + TILE_SIZE * 1.5], [0xe74c3c, -GRID_ORIGIN_X - TILE_SIZE * 1.5]] as [number, number][]) {
      const zone = new THREE.Mesh(
        new THREE.PlaneGeometry(TILE_SIZE * 3, TILE_SIZE * GRID_ROWS),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.04 }),
      );
      zone.rotation.x = -Math.PI / 2;
      zone.position.set(xOff, 0.03, 0);
      this.gridGroup.add(zone);
    }

    // Hover highlight
    this.gridHighlight = new THREE.Mesh(
      new THREE.PlaneGeometry(TILE_SIZE - 0.1, TILE_SIZE - 0.1),
      new THREE.MeshBasicMaterial({ color: 0xd4af37, transparent: true, opacity: 0 }),
    );
    this.gridHighlight.rotation.x = -Math.PI / 2;
    this.gridHighlight.position.y = 0.04;
    this.scene.add(this.gridHighlight);
  }

  // ── Raycasting ────────────────────────────────────────────────
  private updateMouse(e: MouseEvent, canvas: HTMLCanvasElement) {
    const rect = canvas.getBoundingClientRect();
    this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  }

  private handleClick(e: MouseEvent, canvas: HTMLCanvasElement) {
    this.updateMouse(e, canvas);
    this.raycaster.setFromCamera(this.mouse, this.camera);

    for (const ch of this.chars) {
      if (!ch.model || ch.state === "dead") continue;
      if (this.raycaster.intersectObject(ch.model, true).length > 0) {
        this.selectedCharId = ch.id;
        this.onSelectionChange?.(ch);
        this.onStateChange?.();
        return;
      }
    }

    const tileHit = this.raycaster.intersectObjects(this.gridGroup.children, false)
      .find(h => h.object.userData?.type === "gridTile");
    if (tileHit && this.selectedCharId != null) {
      this.moveCharTo(this.selectedCharId, tileHit.object.userData.col, tileHit.object.userData.row);
    }
  }

  private handleMouseMove(e: MouseEvent, canvas: HTMLCanvasElement) {
    this.updateMouse(e, canvas);
    this.raycaster.setFromCamera(this.mouse, this.camera);
    const tileHit = this.raycaster.intersectObjects(this.gridGroup.children, false)
      .find(h => h.object.userData?.type === "gridTile");
    if (tileHit && this.gridHighlight) {
      const wp = gridToWorld(tileHit.object.userData.col, tileHit.object.userData.row);
      this.gridHighlight.position.set(wp.x, 0.04, wp.z);
      (this.gridHighlight.material as THREE.MeshBasicMaterial).opacity = 0.15;
    } else if (this.gridHighlight) {
      (this.gridHighlight.material as THREE.MeshBasicMaterial).opacity = 0;
    }
  }

  // ── Initialization ────────────────────────────────────────────
  async initBattle(apiChars?: any[]) {
    for (const ch of this.chars) {
      if (ch.model) this.scene.remove(ch.model);
      if (ch.nameSprite) this.scene.remove(ch.nameSprite);
      if (ch.hpBarGroup) this.scene.remove(ch.hpBarGroup);
    }
    this.chars = [];
    this.log = [];
    this.selectedCharId = null;

    const playerDefs = apiChars?.length
      ? apiChars.slice(0, 4).map((c: any, i: number) => ({
          name: c.name ?? `Hero ${i + 1}`,
          raceId: (c.race_id ?? c.raceId ?? "human") as RaceId,
          classId: (c.class_id ?? c.classId ?? "warrior") as ClassId,
          gx: 1, gz: 1 + i,
        }))
      : [
          { name: "Kael", raceId: "human" as RaceId, classId: "warrior" as ClassId, gx: 1, gz: 1 },
          { name: "Lyra", raceId: "elf" as RaceId, classId: "mage" as ClassId, gx: 1, gz: 2 },
          { name: "Thrak", raceId: "orc" as RaceId, classId: "worg" as ClassId, gx: 1, gz: 3 },
          { name: "Sera", raceId: "dwarf" as RaceId, classId: "ranger" as ClassId, gx: 1, gz: 4 },
        ];

    const enemyDefs = [
      { name: "Dread Knight", raceId: "undead" as RaceId, classId: "warrior" as ClassId, gx: 8, gz: 1 },
      { name: "Dark Mage", raceId: "barbarian" as RaceId, classId: "mage" as ClassId, gx: 8, gz: 2 },
      { name: "Shadow", raceId: "orc" as RaceId, classId: "ranger" as ClassId, gx: 8, gz: 3 },
      { name: "Lich", raceId: "undead" as RaceId, classId: "mage" as ClassId, gx: 8, gz: 4 },
    ];

    const allDefs = [
      ...playerDefs.map((d, i) => ({ ...d, team: "player" as Team, id: i + 1, level: 5 + Math.floor(Math.random() * 8) })),
      ...enemyDefs.map((d, i) => ({ ...d, team: "enemy" as Team, id: 100 + i, level: 5 + Math.floor(Math.random() * 8) })),
    ];

    this.onLoadProgress?.("Loading character models...");

    for (const def of allDefs) {
      const wp = gridToWorld(def.gx, def.gz);
      const ch: BattleChar = {
        id: def.id, name: def.name, raceId: def.raceId, classId: def.classId,
        team: def.team, level: def.level,
        hp: 100, maxHp: 100, mp: 60, maxMp: 60,
        gridX: def.gx, gridZ: def.gz, state: "idle",
        model: null, mixer: null, actions: new Map(),
        targetWorldPos: null, moveSpeed: def.team === "enemy" ? 8 : 10,
        castTimer: 0, castDuration: 0, castSpell: null, castTargetId: null,
        hitFlash: 0, nameSprite: null, hpBarGroup: null,
      };

      try {
        const raceCfg = RACE_MODELS[def.raceId] ?? RACE_MODELS.human;
        this.onLoadProgress?.(`Loading ${def.name} (${def.raceId})...`);
        const gltf = await this.loadGLTF(CDN + raceCfg.path);
        const model = gltf.scene.clone();
        model.scale.setScalar(raceCfg.scale * 2);
        model.position.set(wp.x, 0, wp.z);
        if (def.team === "enemy") model.rotation.y = Math.PI;
        model.traverse((child) => {
          if ((child as THREE.Mesh).isMesh) { child.castShadow = true; child.receiveShadow = true; }
        });
        this.scene.add(model);
        ch.model = model;

        if (gltf.animations.length > 0) {
          ch.mixer = new THREE.AnimationMixer(model);
          for (const clip of gltf.animations) {
            ch.actions.set(clip.name.toLowerCase(), ch.mixer.clipAction(clip));
          }
          const idle = this.findAction(ch, "idle");
          idle?.reset().play();
        }
      } catch {
        const fb = this.createFallback(def.team, def.raceId);
        fb.position.set(wp.x, 0, wp.z);
        this.scene.add(fb);
        ch.model = fb;
      }

      ch.nameSprite = this.createNameplate(def.name, def.team, def.level);
      this.scene.add(ch.nameSprite);
      ch.hpBarGroup = this.createHPBar();
      this.scene.add(ch.hpBarGroup);
      this.chars.push(ch);
    }

    this.onLoadProgress?.(null);
    this.addLog("Battle begins!", "system");
    this.onStateChange?.();
  }

  private async loadGLTF(url: string): Promise<GLTF> {
    if (this.modelCache.has(url)) return this.modelCache.get(url)!;
    return new Promise((resolve, reject) => {
      this.gltfLoader.load(url, (gltf) => { this.modelCache.set(url, gltf); resolve(gltf); }, undefined, reject);
    });
  }

  private findAction(ch: BattleChar, ...names: string[]): THREE.AnimationAction | null {
    for (const name of names) {
      for (const [key, action] of ch.actions) {
        if (key.includes(name)) return action;
      }
    }
    return ch.actions.values().next().value ?? null;
  }

  private fadeToAction(ch: BattleChar, ...names: string[]) {
    const next = this.findAction(ch, ...names);
    if (!next || !ch.mixer) return;
    ch.mixer.stopAllAction();
    next.reset().fadeIn(0.3).play();
  }

  private createFallback(team: Team, raceId: RaceId): THREE.Group {
    const g = new THREE.Group();
    const colors: Record<string, number> = { human: 0x4488ff, barbarian: 0xaa4422, dwarf: 0x886633, elf: 0x44cc88, orc: 0x448844, undead: 0x664488 };
    const body = new THREE.Mesh(
      new THREE.CapsuleGeometry(0.5, 1.5, 8, 16),
      new THREE.MeshStandardMaterial({ color: team === "enemy" ? 0xcc3333 : (colors[raceId] ?? 0x4488ff), roughness: 0.6 }),
    );
    body.position.y = 1.5;
    body.castShadow = true;
    g.add(body);
    return g;
  }

  private createNameplate(name: string, team: Team, level: number): THREE.Sprite {
    const c = document.createElement("canvas");
    c.width = 256; c.height = 64;
    const ctx = c.getContext("2d")!;
    ctx.fillStyle = "rgba(0,0,0,0.7)";
    ctx.beginPath(); ctx.roundRect(4, 4, 248, 56, 8); ctx.fill();
    ctx.strokeStyle = team === "player" ? "#d4af37" : "#e74c3c";
    ctx.lineWidth = 2; ctx.beginPath(); ctx.roundRect(4, 4, 248, 56, 8); ctx.stroke();
    ctx.fillStyle = team === "player" ? "#d4af37" : "#ff6b6b";
    ctx.font = "bold 20px 'Spectral SC', serif"; ctx.textAlign = "center";
    ctx.fillText(name, 128, 30);
    ctx.fillStyle = "#aaa"; ctx.font = "14px sans-serif"; ctx.fillText(`Lv.${level}`, 128, 50);
    const mat = new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), transparent: true, depthTest: false });
    const s = new THREE.Sprite(mat);
    s.scale.set(4, 1, 1);
    return s;
  }

  private createHPBar(): THREE.Group {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.2), new THREE.MeshBasicMaterial({ color: 0x111111, transparent: true, opacity: 0.8 })));
    const hp = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.18), new THREE.MeshBasicMaterial({ color: 0x2ecc71 }));
    hp.name = "hpFill"; g.add(hp);
    const mp = new THREE.Mesh(new THREE.PlaneGeometry(2.5, 0.12), new THREE.MeshBasicMaterial({ color: 0x3498db }));
    mp.name = "mpFill"; mp.position.y = -0.2; g.add(mp);
    return g;
  }

  // ── Game loop ─────────────────────────────────────────────────
  start() { if (this.running) return; this.running = true; this.clock.start(); this.loop(); }
  stop() { this.running = false; if (this.animFrameId) cancelAnimationFrame(this.animFrameId); }

  private loop = () => {
    if (!this.running) return;
    const dt = Math.min(this.clock.getDelta(), 0.05);
    this.update(dt);
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    this.animFrameId = requestAnimationFrame(this.loop);
  };

  private update(dt: number) {
    for (const ch of this.chars) {
      if (ch.state === "dead") continue;
      ch.mixer?.update(dt);

      // Movement
      if (ch.targetWorldPos && (ch.state === "walking" || ch.state === "running") && ch.model) {
        const dir = new THREE.Vector3().subVectors(ch.targetWorldPos, ch.model.position);
        dir.y = 0;
        const d = dir.length();
        const speed = ch.state === "running" ? ch.moveSpeed * 1.8 : ch.moveSpeed;
        if (d < 0.3) {
          ch.model.position.set(ch.targetWorldPos.x, 0, ch.targetWorldPos.z);
          ch.targetWorldPos = null;
          ch.state = "idle";
          this.fadeToAction(ch, "idle");
        } else {
          dir.normalize();
          ch.model.position.addScaledVector(dir, speed * dt);
          ch.model.rotation.y = Math.atan2(dir.x, dir.z);
        }
      }

      // Casting
      if (ch.state === "casting") {
        ch.castTimer += dt;
        if (ch.model && ch.castSpell && Math.random() > 0.5) {
          this.spawnParticle(
            ch.model.position.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, Math.random() * 3, (Math.random() - 0.5) * 2)),
            new THREE.Vector3((Math.random() - 0.5) * 2, 2, (Math.random() - 0.5) * 2),
            SPELL_COLORS[ch.castSpell], 0.6,
          );
        }
        if (ch.castTimer >= ch.castDuration) {
          if (ch.castSpell && ch.castTargetId != null) this.fireProjectile(ch, ch.castSpell, ch.castTargetId);
          ch.state = "idle"; ch.castTimer = 0; ch.castSpell = null; ch.castTargetId = null;
          this.fadeToAction(ch, "idle");
        }
      }

      // Hit flash
      if (ch.hitFlash > 0) {
        ch.hitFlash -= dt;
        ch.model?.traverse((c) => {
          if ((c as THREE.Mesh).isMesh) {
            const m = (c as THREE.Mesh).material as THREE.MeshStandardMaterial;
            if (m.emissive) { m.emissive.setHex(ch.hitFlash > 0 ? 0xff4444 : 0); m.emissiveIntensity = ch.hitFlash > 0 ? 2 : 0; }
          }
        });
      }

      // UI positions
      if (ch.model) {
        const p = ch.model.position;
        if (ch.nameSprite) ch.nameSprite.position.set(p.x, 4.5, p.z);
        if (ch.hpBarGroup) {
          ch.hpBarGroup.position.set(p.x, 3.8, p.z);
          ch.hpBarGroup.lookAt(this.camera.position);
          const hpFill = ch.hpBarGroup.getObjectByName("hpFill") as THREE.Mesh | undefined;
          if (hpFill) {
            const r = ch.hp / ch.maxHp;
            hpFill.scale.x = Math.max(0.001, r);
            hpFill.position.x = -(1 - r) * 1.25;
            (hpFill.material as THREE.MeshBasicMaterial).color.setHex(r > 0.6 ? 0x2ecc71 : r > 0.3 ? 0xf39c12 : 0xe74c3c);
          }
          const mpFill = ch.hpBarGroup.getObjectByName("mpFill") as THREE.Mesh | undefined;
          if (mpFill) { const r = ch.mp / ch.maxMp; mpFill.scale.x = Math.max(0.001, r); mpFill.position.x = -(1 - r) * 1.25; }
        }
      }
    }

    // Projectiles
    for (const proj of this.projectiles) {
      if (!proj.alive) continue;
      proj.progress += (proj.speed / proj.from.distanceTo(proj.to)) * dt;
      const t = Math.min(proj.progress, 1);
      proj.mesh.position.lerpVectors(proj.from, proj.to, t);
      proj.mesh.position.y += Math.sin(t * Math.PI) * 2;
      if (Math.random() > 0.4) this.spawnParticle(proj.mesh.position.clone(), new THREE.Vector3((Math.random() - 0.5) * 2, Math.random(), (Math.random() - 0.5) * 2), SPELL_COLORS[proj.spell], 0.3);
      if (proj.progress >= 1) {
        proj.alive = false;
        this.scene.remove(proj.mesh);
        for (let i = 0; i < 20; i++) this.spawnParticle(proj.to.clone().add(new THREE.Vector3(0, 1, 0)), new THREE.Vector3((Math.random() - 0.5) * 8, Math.random() * 6, (Math.random() - 0.5) * 8), SPELL_COLORS[proj.spell], 1.0);
        proj.onImpact?.();
      }
    }
    this.projectiles = this.projectiles.filter(p => p.alive);

    // Particles
    for (const p of this.particles) { p.mesh.position.addScaledVector(p.velocity, dt); p.velocity.y -= 3 * dt; p.life -= dt; (p.mesh.material as THREE.MeshBasicMaterial).opacity = p.life / p.maxLife; p.mesh.scale.setScalar(p.life / p.maxLife * 0.3 + 0.05); }
    const dead = this.particles.filter(p => p.life <= 0);
    for (const p of dead) this.scene.remove(p.mesh);
    this.particles = this.particles.filter(p => p.life > 0);
  }

  private spawnParticle(pos: THREE.Vector3, vel: THREE.Vector3, color: number, life: number) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.15, 6, 6), new THREE.MeshBasicMaterial({ color, transparent: true }));
    mesh.position.copy(pos);
    this.scene.add(mesh);
    this.particles.push({ mesh, velocity: vel, life, maxLife: life });
  }

  private fireProjectile(caster: BattleChar, spell: SpellType, targetId: number) {
    const target = this.chars.find(c => c.id === targetId);
    if (!target?.model || !caster.model) return;
    const from = caster.model.position.clone().add(new THREE.Vector3(0, 2, 0));
    const to = target.model.position.clone().add(new THREE.Vector3(0, 1.5, 0));
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.3, 12, 12), new THREE.MeshBasicMaterial({ color: SPELL_COLORS[spell], transparent: true, opacity: 0.9 }));
    mesh.position.copy(from);
    this.scene.add(mesh);
    this.projectiles.push({
      spell, mesh, from, to, progress: 0, speed: spell === "lightning" ? 25 : 15, alive: true,
      onImpact: () => {
        if (spell === "heal") {
          const amt = 20 + Math.floor(Math.random() * 15);
          target.hp = Math.min(target.maxHp, target.hp + amt);
          this.addLog(`${caster.name} heals ${target.name} for ${amt} HP!`, "heal");
        } else {
          const dmg = 15 + Math.floor(Math.random() * 20);
          target.hp = Math.max(0, target.hp - dmg);
          target.hitFlash = 0.4;
          this.addLog(`${caster.name} hits ${target.name} with ${spell.replace("_", " ")} for ${dmg}!`, "damage");
          if (target.hp <= 0) { target.state = "dead"; this.fadeToAction(target, "death"); this.addLog(`${target.name} defeated!`, "system"); }
        }
        this.onStateChange?.();
      },
    });
  }

  // ── Public actions ────────────────────────────────────────────
  moveCharTo(charId: number, gx: number, gz: number) {
    const ch = this.chars.find(c => c.id === charId);
    if (!ch || ch.state === "dead" || ch.state === "casting") return;
    gx = Math.max(0, Math.min(GRID_COLS - 1, gx));
    gz = Math.max(0, Math.min(GRID_ROWS - 1, gz));
    const gd = gridDist({ x: ch.gridX, z: ch.gridZ }, { x: gx, z: gz });
    ch.targetWorldPos = gridToWorld(gx, gz);
    ch.gridX = gx; ch.gridZ = gz;
    ch.state = gd >= 3 ? "running" : "walking";
    this.fadeToAction(ch, ch.state === "running" ? "run" : "walk", "run", "idle");
    this.addLog(`${ch.name} ${ch.state === "running" ? "runs" : "walks"} to (${gx},${gz})`, "action");
    this.onStateChange?.();
  }

  castSpell(casterId: number, spell: SpellType, targetId: number) {
    const caster = this.chars.find(c => c.id === casterId);
    const target = this.chars.find(c => c.id === targetId);
    if (!caster || !target || caster.state === "dead" || target.state === "dead") return;
    const cost = spell === "heal" ? 15 : 10;
    if (caster.mp < cost) { this.addLog(`${caster.name} not enough MP!`, "system"); return; }
    caster.mp -= cost;
    caster.state = "casting"; caster.castSpell = spell; caster.castTargetId = targetId;
    caster.castDuration = 1.0; caster.castTimer = 0;
    this.fadeToAction(caster, "cast", "magic", "attack", "idle");
    if (caster.model && target.model) {
      const dir = new THREE.Vector3().subVectors(target.model.position, caster.model.position);
      caster.model.rotation.y = Math.atan2(dir.x, dir.z);
    }
    this.addLog(`${caster.name} casting ${spell.replace("_", " ")}...`, "action");
    this.onStateChange?.();
  }

  autoAttack(attackerId: number, targetId: number) {
    const a = this.chars.find(c => c.id === attackerId);
    const t = this.chars.find(c => c.id === targetId);
    if (!a || !t || a.state === "dead" || t.state === "dead") return;
    this.fadeToAction(a, "attack", "slash", "kick");
    if (a.model && t.model) a.model.rotation.y = Math.atan2(t.model.position.x - a.model.position.x, t.model.position.z - a.model.position.z);
    a.state = "attacking";
    const dmg = 8 + Math.floor(Math.random() * 12);
    t.hp = Math.max(0, t.hp - dmg); t.hitFlash = 0.3;
    if (t.model) for (let i = 0; i < 8; i++) this.spawnParticle(t.model.position.clone().add(new THREE.Vector3(0, 1.5, 0)), new THREE.Vector3((Math.random() - 0.5) * 6, Math.random() * 4, (Math.random() - 0.5) * 6), 0xffffff, 0.3);
    this.addLog(`${a.name} attacks ${t.name} for ${dmg}!`, "damage");
    if (t.hp <= 0) { t.state = "dead"; this.fadeToAction(t, "death"); this.addLog(`${t.name} defeated!`, "system"); }
    setTimeout(() => { if (a.state === "attacking") { a.state = "idle"; this.fadeToAction(a, "idle"); } }, 800);
    this.onStateChange?.();
  }

  private addLog(text: string, type: BattleLogEntry["type"]) {
    this.log.push({ time: Date.now(), text, type });
    if (this.log.length > 100) this.log.shift();
    this.onLogUpdate?.([...this.log]);
  }

  getPlayerChars() { return this.chars.filter(c => c.team === "player"); }
  getEnemyChars() { return this.chars.filter(c => c.team === "enemy"); }
  getSelectedChar() { return this.chars.find(c => c.id === this.selectedCharId) ?? null; }
  selectChar(id: number | null) { this.selectedCharId = id; this.onSelectionChange?.(id != null ? this.chars.find(c => c.id === id) ?? null : null); }
  resize(w: number, h: number) { this.camera.aspect = w / h; this.camera.updateProjectionMatrix(); this.renderer.setSize(w, h); }
  destroy() { this.stop(); this.renderer.dispose(); }
}

export { GRID_COLS, GRID_ROWS, SPELL_COLORS, CDN };
