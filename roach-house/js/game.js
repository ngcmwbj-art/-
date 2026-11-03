// ゲームの中身（ゴキブリ・仲間・農場主・わな・殺虫剤）
import * as THREE from 'three';
import {
  BOUNDS, ROWS, TABLES, TABLE_TOP, CRATE, CRATE_SPOTS, DOOR, PATROL_POINTS, INITIAL_TRAPS,
  PLAYER_START, FARMER_START, rowAt, tableAt, truckSlot,
  SURFACES, PLANT_FRUITS, dropPlantFruit, resetPlantFruits, WIND_LANES, SAFE_SPOTS,
} from './world.js';
import {
  makeRoach, animateRoach, makeFarmer, makeCrate, setCrateRot, animateFlies, makeTrap, makeEgg,
  makeCloud, makeRing, makeCone, disposeObject, makeBait, makeFogger, VEG_COLORS, makeCat, makeInspector,
} from './models.js';
import { paprikaMaterial } from './paprika.js';
import { seededRand } from './features.js';
import { Grid } from './pathfind.js';
import { clamp, lerp, dampAngle, angleDiff, smooth, rand, randRange, pick, rectDist, inRect, setSeed } from './util.js';

// 6つのステージ（だんだん難しくなる）
export const STAGES = [
  { key: 's1', no: 1, label: 'ステージ1', name: 'はじめての夜明け', desc: '農場主はのんびり屋。まずはかじって、隠れて、慣れよう', target: 6, baits: 0, fSpeed: 0.85, susp: 0.7, patrol: [9, 13], patrolP: 0.8, loadT: 8, traps: 2, hatch: 8, sprayDmg: 20, fumAt: 0.5,
    tip: 'まずはコンテナを1箱かじってみよう。見つかったら栽培槽の下へ' },
  { key: 's2', no: 2, label: 'ステージ2', name: 'ホイホイ増量中', desc: 'わなが増え、見回りも多くなる。足もとに気をつけろ', target: 7, baits: 0, fSpeed: 0.92, susp: 0.85, patrol: [7, 10], patrolP: 0.7, loadT: 7, traps: 3, hatch: 9, sprayDmg: 23, fumAt: 0.5,
    tip: 'ホイホイ（黄色い家）が多い。地図の×印を見て、通り道を選ぼう' },
  { key: 's3', no: 3, label: 'ステージ3', name: '毒エサの日', desc: '黒い容器の毒エサが置かれる。JAの検品も来る', target: 7, baits: 1, fSpeed: 0.95, susp: 0.86, patrol: [5, 8], patrolP: 0.6, loadT: 9, traps: 3, hatch: 10, sprayDmg: 21, fumAt: 0.5, inspect: true,
    tip: '黒い丸い容器は毒エサ。JAの検品員が来たら、近づかずに待とう' },
  { key: 's4', no: 4, label: 'ステージ4', name: '怒りっぽい農場主', desc: '足も目も速い。ハウスのネコもうろつく', target: 8, baits: 1, fSpeed: 0.97, susp: 0.92, patrol: [4, 7], patrolP: 0.6, loadT: 10, traps: 3, hatch: 10, sprayDmg: 23, fumAt: 0.5, inspect: true, cat: true,
    tip: '鈴の音はネコ。ネコは台や栽培槽の上には来ない' },
  { key: 's5', no: 5, label: 'ステージ5', name: '出荷の大一番', desc: '9箱をダメにしろ。わなも毒エサも最大。農場主は本気だ', target: 9, baits: 2, fSpeed: 1.0, susp: 0.98, patrol: [4, 6], patrolP: 0.6, loadT: 12, traps: 4, hatch: 11, sprayDmg: 24, fumAt: 0.5, inspect: true, cat: true,
    tip: '仲間をたくさん増やして、探索と囮で一気に攻めよう' },
  { key: 's6', no: 6, label: 'ステージ6', name: '夜なべの選果場', desc: '真っ暗なハウス。農場主の懐中電灯の光だけに気をつけろ', target: 8, baits: 2, fSpeed: 0.97, susp: 0.95, patrol: [4, 7], patrolP: 0.55, loadT: 11, traps: 4, hatch: 11, sprayDmg: 23, fumAt: 0.5, inspect: false, cat: true, night: true,
    tip: '暗いので光の外なら見つかりにくい。懐中電灯の光の輪に入るな' },
];
export const DIFFS = Object.fromEntries(STAGES.map((st) => [st.key, st]));
// 以前の呼び名（テスト用）
DIFFS.easy = STAGES[0];
DIFFS.normal = STAGES[2];
DIFFS.hard = STAGES[4];

// 仲間の数に上限はない（栄養がたまるたびに卵を産める）
export const MAX_NYMPHS = Infinity;
const EAT_REACH = 0.42;
const ATTACK_RANGE = 3.6;
const ATTACK_CD = 22;
const MODES = { search: '探索', decoy: '囮', follow: '集合' };
// がっつきゲージの「ちょうどいい帯」
export const NICE_LO = 55, NICE_HI = 85;
const TROUGH0 = TABLES.length; // SURFACES のうち、この番号から先が栽培槽
const BAIT_SPOTS = [{ x: 5.6, z: -9.6 }, { x: -19.6, z: 4.6 }, { x: 18.6, z: 3.2 }];

// 隠れ場所（畝の下・台の下）
const HIDE_SPOTS = [];
for (const r of ROWS) for (let x = r.x0 + 1; x < r.x1; x += 2.5) HIDE_SPOTS.push({ x, z: r.z });
for (const t of TABLES) for (const dx of [-3.4, -1, 1.4, 3.6]) HIDE_SPOTS.push({ x: t.x + dx, z: t.z });

export class Game {
  constructor({ scene, sfx, ui }) {
    this.scene = scene;
    this.sfx = sfx;
    this.ui = ui;
    this.grid = new Grid();
    this.root = null;
    this.state = 'title';
    this.clock = 0;
    this.shake = 0;
    this.camYaw = Math.PI / 2;
    this.snapRequests = [];
    this.soundPings = [];
    this.highlights = [];
    this.baits = [];
    this.fallers = [];
    this.fog = null;
    this.fogLevel = 0;
    this.safeRings = [];
    this.tutorial = null;
    this.niceT = 0;
  }

  // ---------------- 開始 ----------------
  // opts：{ tutorial, wing, layoutSeed }
  start(diffKey, seed, opts = {}) {
    if (seed !== undefined) setSeed(seed);
    if (this.root) {
      if (this.farmerModel) { this.farmerModel.root.removeFromParent(); this.farmerCone.removeFromParent(); }
      this.scene.remove(this.root);
      disposeObject(this.root);
    }
    this.root = new THREE.Group();
    this.scene.add(this.root);
    const D = (this.diff = DIFFS[diffKey] || DIFFS.normal);
    this.elapsed = 0;
    this.shipLimit = CRATE_SPOTS.length - D.target + 1; // これだけ出荷されたら負け
    this.mode = 'follow';
    this.state = 'play';
    this.result = null;
    this.stats = {
      ruined: 0, shipped: 0, born: 0, lost: 0, attacks: 0, deaths: 0, eggs: 0, chased: 0, ate: 0,
      ruinedColor: [0, 0, 0], stuck: 0, escapes: 0, nice: 0, fruits: 0, winds: 0, baits: 0, smokeSurvived: 0, seen: [],
    };
    this.baits = [];
    this.fallers = [];
    this.fog = null;
    this.fogLevel = 0;
    this.fumigated = false;
    this.safeRings = [];
    this.highlights = [];
    this.snapRequests = [];
    this.soundPings = [];
    this.minHp = 100;
    this.niceT = 0;
    this.cat = null;
    this.inspector = null;
    this.inspectDone = false;
    this.safeLine = null;
    this.lastDeathCause = null;
    this.night = !!D.night;
    this.wing = opts.wing || 'normal';
    this.calm = !!opts.tutorial;
    this.tutorial = opts.tutorial ? { step: 0, t: 0, sx: PLAYER_START.x, sz: PLAYER_START.z, yaw: Math.PI / 2, hideT: 0 } : null;
    resetPlantFruits();
    // 日替わりの配置：コンテナの色と最初のわなの場所
    const lr = seededRand(opts.layoutSeed || 12345);
    this.layoutRand = lr;
    this.ruined = 0;
    this.shipped = 0;
    this.roaches = [];
    this.eggs = [];
    this.clouds = [];
    this.traps = [];
    this.flash = [];
    this.nutrition = 0;
    this.attackCD = 6;
    this.shake = 0;
    this.events = [];

    this.crates = CRATE_SPOTS.map((s, i) => {
      const colorIdx = Math.floor(lr() * VEG_COLORS.length);
      const m = makeCrate(i, colorIdx);
      const c = {
        i, colorIdx, x: s.x, z: s.z, table: s.table, baseY: s.table >= 0 ? TABLE_TOP : 0,
        hp: 100, rotten: false, shipped: false, carried: false, discovered: false, model: m, lastBite: -9, rect: null,
      };
      m.group.userData.isCrate = true;
      this.placeCrate(c);
      this.root.add(m.group);
      return c;
    });
    const trapList = [...INITIAL_TRAPS].sort(() => lr() - 0.5);
    trapList.slice(0, D.traps).forEach((t) => this.addTrap(t.x, t.z, t.r));
    BAIT_SPOTS.slice(0, D.baits).forEach((b) => this.addBait(b.x, b.z));

    this.player = this.spawnRoach(PLAYER_START.x, PLAYER_START.z, false, 0, -1, this.wing);
    this.player.isPlayer = true;
    this.player.h = Math.PI / 2;
    this.camYaw = Math.PI / 2;
    this.marker = makeRing(0xffe14d, 0.3, 0.38, 0.85);
    this.root.add(this.marker);

    if (!this.farmerModel) { this.farmerModel = makeFarmer(); this.farmerCone = makeCone(1, 0.78); }
    const fm = this.farmerModel, cone = this.farmerCone;
    for (const ch of [...fm.root.children]) if (ch.userData.isCrate) fm.root.remove(ch);
    fm.root.visible = true;
    this.root.add(fm.root);
    this.root.add(cone);
    this.farmer = {
      x: FARMER_START.x, z: FARMER_START.z, h: -Math.PI / 2, model: fm, cone,
      state: 'WORK', phase: 'idle', timer: 5, path: [], pi: 0, repath: 0, carry: null, crate: null,
      susp: 0, anger: 0, lastSeen: null, suspect: null, target: null, lostT: 0,
      sprayCD: 2, whackCD: 0, act: null, trapQueue: [], speech: '', speechT: 0,
      walkPhase: 0, stepAcc: 0, moveSpeed: 0, baseH: 0, lookT: 0, inv: null, coneRange: 10,
      glanceT: 3, glanceDir: 1, glanceDur: 0, lookOff: 0, view: -Math.PI / 2,
    };
    // 夜：農場主の懐中電灯（右手の先から前を照らす）
    if (!this.flashlight) {
      this.flashlight = new THREE.SpotLight(0xfff1c8, 0, 18, 0.42, 0.45, 1.2);
      this.flashlight.position.set(0.9, 4.0, 0.8);
      this.flashlight.target.position.set(0, 0, 9);
      fm.root.add(this.flashlight, this.flashlight.target);
    }
    this.flashlight.intensity = this.night ? 140 : 0;
    this.flashlight.visible = this.night;
    if (D.cat) this.spawnCat();
    if (this.tutorial) { this.farmer.timer = 1e9; this.say('（農場主はまだラジオを聞いている）'); }
    else this.say('さて、今日も出荷するか。手間かけさせんなよ');
  }

  addBait(x, z) {
    const m = makeBait();
    m.position.set(x, 0, z);
    this.root.add(m);
    const b = { x, z, model: m, alive: true };
    this.baits.push(b);
    return b;
  }

  seen(id) { if (!this.stats.seen.includes(id)) this.stats.seen.push(id); }

  // 名場面の写真を頼む（main.js が描いた直後に撮る）
  snap(type, text, replace = false) {
    const have = this.highlights.find((h) => h.type === type);
    if (have && !replace) return;
    this.snapRequests.push({ type, text, t: this.elapsed });
  }

  placeCrate(c) {
    c.rect = { minX: c.x - CRATE.w / 2, maxX: c.x + CRATE.w / 2, minZ: c.z - CRATE.d / 2, maxZ: c.z + CRATE.d / 2 };
    c.model.group.position.set(c.x, c.baseY, c.z);
    c.model.group.rotation.set(0, 0, 0);
  }

  spawnRoach(x, z, nymph, y = 0, surface = -1, wing = 'normal') {
    const m = makeRoach(nymph, wing);
    if (nymph) m.root.scale.setScalar(0.62);
    this.root.add(m.root);
    const r = {
      kind: 'roach', id: this.roaches.length, nymph, isPlayer: false, x, y, z, h: rand() * Math.PI * 2,
      hp: nymph ? 30 : 100, maxHp: nymph ? 30 : 100, alive: true, surface, st: 'move',
      phase: rand() * 6, greed: 0, eatingCrate: null, moving: false, dashing: false, climb: null, fly: null,
      vy: 0, trap: null, struggle: 0, stuckT: 0, trapImmune: 0, hurtT: 0, deadT: 0, grow: 0,
      ai: { target: null, retarget: 0, hideT: 0, jitterT: 0, jx: 0, jz: 0, lastX: x, lastZ: z, stallT: 0, slot: rand() },
      model: m, crunchT: 0, poison: 0, glide: null, eatingFruit: null, eatingBait: null, baitT: 0,
    };
    this.roaches.push(r);
    return r;
  }

  addTrap(x, z, rot = rand() * Math.PI) {
    const m = makeTrap();
    m.position.set(x, 0, z);
    m.rotation.y = rot;
    this.root.add(m);
    const t = { x, z, model: m };
    this.traps.push(t);
    return t;
  }

  say(text) {
    this.farmer.speech = text;
    this.farmer.speechT = 2.6;
  }
  toast(text, kind = '') { this.ui.toast(text, kind); }

  get nymphs() { return this.roaches.filter((r) => r.alive && !r.isPlayer); }
  surfY(r) { return r.surface >= 0 ? SURFACES[r.surface].top : 0; }
  onTrough(r) { return r.surface >= TROUGH0; }

  // ---------------- 毎フレーム ----------------
  update(dt, inp) {
    this.clock += dt;
    this.shake = Math.max(0, this.shake - dt * 2.5);
    if (this.state !== 'play') {
      if (this.root) this.animateAll(dt);
      return;
    }
    this.elapsed += dt;
    this.attackCD = Math.max(0, this.attackCD - dt);
    this.niceT = Math.max(0, this.niceT - dt);
    if (this.tutorial) this.updateTutorial(dt);

    if (inp.consume('cmd1')) this.setMode('search');
    if (inp.consume('cmd2')) this.setMode('decoy');
    if (inp.consume('cmd3')) this.setMode('follow');

    for (const r of this.roaches) {
      if (!r.alive) continue;
      if (r.isPlayer) this.updatePlayer(r, dt, inp);
      else this.updateNymph(r, dt);
      this.updateRoachCommon(r, dt);
    }
    this.updateEggs(dt);
    this.updateFarmer(dt);
    this.updateClouds(dt);
    this.updateTraps(dt);
    this.updateCrates(dt);
    this.updateFallers(dt);
    this.updateFog(dt);
    this.updateCat(dt);
    this.updateInspector(dt);
    this.updateSafeLine();
    const p = this.player;
    if (p && p.alive && p.hp < this.minHp - 8 && p.hp < 45) {
      this.minHp = p.hp;
      this.snap('close', `体力が残り ${Math.max(1, Math.round(p.hp))} まで追いつめられた`, true);
    }
    this.animateAll(dt);
    this.checkEnd();
  }

  setMode(m) {
    if (this.mode === m) return;
    this.mode = m;
    for (const r of this.nymphs) { r.ai.target = null; r.ai.retarget = 0; }
    this.sfx.click();
    const n = this.nymphs.length;
    const msg = { search: '仲間に指示：エサを探して食べろ！', decoy: '仲間に指示：農場主の気を引け！（囮）', follow: '仲間に指示：ついて来い！' }[m];
    this.toast(n ? msg : `${msg}（まだ仲間がいない）`, 'info');
  }

  // ---------------- 自分のゴキブリ ----------------
  updatePlayer(p, dt, inp) {
    p.moving = false; p.dashing = false;
    const wasEating = p.eatingCrate || p.eatingFruit;
    const prevGreed = p.greed;
    p.eatingCrate = null;
    p.eatingFruit = null;
    const wasBait = p.eatingBait;
    p.eatingBait = null;
    if (p.poison > 0) {
      p.poison = Math.max(0, p.poison - dt);
      this.damage(p, 2.2 * dt, 'poison');
      if (!p.alive) return;
    }
    if (p.st === 'stuck') {
      if (inp.consume('action')) { p.struggle += 15; this.sfx.click(); }
      p.struggle = Math.max(0, p.struggle - 9 * dt);
      this.damage(p, 3 * dt, 'trap');
      if (!p.alive) return;
      if (p.struggle >= 100) { this.freeFromTrap(p); this.stats.escapes++; }
      p.greed = Math.max(0, p.greed - 60 * dt);
      return;
    }
    if (p.st !== 'move') { p.greed = Math.max(0, p.greed - 60 * dt); return; }

    // カメラ基準の移動
    const fx = Math.sin(this.camYaw), fz = Math.cos(this.camYaw);
    let dx = fx * inp.mz - fz * inp.mx;
    let dz = fz * inp.mz + fx * inp.mx;
    const mag = Math.hypot(dx, dz);

    const crate = this.crateInReach(p);
    const fruit = crate ? null : this.fruitInReach(p);
    const bait = crate || fruit ? null : this.baitInReach(p);
    const lane = crate || fruit || bait ? null : this.windLaneAt(p);
    const actionPressed = inp.consume('action');

    // 捕まった仲間を助ける
    let rescued = false;
    if (actionPressed) {
      const victim = this.roaches.find((r) => r.alive && r !== p && r.st === 'stuck' && Math.hypot(r.x - p.x, r.z - p.z) < 1.3);
      if (victim) {
        this.freeFromTrap(victim);
        this.toast('仲間をホイホイから助け出した！', 'good');
        rescued = true;
      }
    }

    const food = crate || fruit;
    if (inp.actionHeld && food && mag < 0.15) {
      // 食べる：長押しするほど早く食べられるが、がっつきすぎると音が出る
      if (crate) p.eatingCrate = crate; else p.eatingFruit = fruit;
      p.greed += 34 * dt;
      const rate = 3.5 + 12.5 * (p.greed / 100);
      if (crate) this.bite(crate, rate * dt, p); else this.biteFruit(fruit, rate * dt);
      this.nutrition = Math.min(100, this.nutrition + rate * 0.6 * dt);
      p.hp = Math.min(p.maxHp, p.hp + rate * 0.3 * dt);
      p.h = dampAngle(p.h, Math.atan2(food.x - p.x, food.z - p.z), 6, dt);
      p.crunchT -= dt;
      if (p.crunchT <= 0) { this.sfx.crunch(0.08 + p.greed / 100 * 0.3); p.crunchT = 0.24 - p.greed / 100 * 0.12; }
      this.noise(p, p.greed > 65 ? 6 : 3.5, (p.greed > 65 ? 14 : 6) * dt);
      if (p.greed >= 100) {
        p.greed = 55;
        this.sfx.crunchLoud();
        this.noise(p, 16, 75);
        this.shake = Math.max(this.shake, 0.35);
        this.toast('バリバリッ！ がっつきすぎて音が出た！', 'bad');
      }
      if (!wasEating) this.events.push('eat');
    } else {
      // ちょうどいい帯で離したら「ナイス！」：少し多く食べられる
      if (wasEating && prevGreed >= NICE_LO && prevGreed <= NICE_HI) {
        const target = wasEating;
        if (target.kind === 'fruit') this.biteFruit(target, 6); else if (!target.rotten && !target.carried && !target.shipped) this.bite(target, 7, p);
        this.nutrition = Math.min(100, this.nutrition + 6);
        this.stats.nice++;
        this.niceT = 0.9;
        this.sfx.nice();
        this.events.push('nice');
      }
      p.greed = Math.max(0, p.greed - 55 * dt);
      // 毒エサ：長押しで食べる（栄養は満タン、でも毒が回る）
      if (inp.actionHeld && bait && mag < 0.15) {
        p.eatingBait = bait;
        p.baitT = (wasBait === bait ? p.baitT : 0) + dt;
        if (p.baitT >= 1.2) this.eatBait(p, bait);
      }
      if (actionPressed && !food && !rescued && !bait) {
        if (lane) this.startGlide(p, lane);
        else {
          const c = this.canClimb(p);
          if (c) this.startClimb(p, c);
        }
      }
    }

    if (!p.eatingCrate && !p.eatingFruit && !p.eatingBait && mag > 0.05) {
      const dash = inp.dash;
      const spd = (dash ? 4.6 : 2.7) * Math.min(1, mag + 0.2) * (p.grow > 0 ? 0.9 : 1);
      this.moveRoach(p, dx / mag, dz / mag, spd, dt);
      p.dashing = dash;
      if (dash && p.surface < 0) this.noise(p, 4.5, 12 * dt);
    }

    if (inp.consume('egg')) this.tryLayEgg(p);
    if (inp.consume('attack')) this.tryAttack(p);
  }

  // 株の実：栽培槽の上から届く高さのもの
  fruitInReach(r) {
    if (!this.onTrough(r)) return null;
    let best = null, bd = 0.6;
    for (const f of PLANT_FRUITS) {
      if (!f.alive) continue;
      const dy = f.y - r.y;
      if (dy < -0.4 || dy > 1.0) continue;
      const d = Math.hypot(f.x - r.x, f.z - r.z);
      if (d < bd) { bd = d; best = f; }
    }
    if (best) best.kind = 'fruit';
    return best;
  }

  biteFruit(f, amt) {
    if (!f.alive) return;
    f.hp -= amt;
    this.stats.ate += amt * 0.3;
    if (f.hp <= 0) this.dropFruit(f);
  }

  // 実が落ちる：栄養たっぷり、でも床に落ちてドスンと音がする
  dropFruit(f) {
    dropPlantFruit(f);
    for (const r of this.roaches) if (r.eatingFruit === f) r.eatingFruit = null;
    const mat = paprikaMaterial(f.hex);
    const m = new THREE.Mesh(f.geo, mat);
    m.userData.ownMaterial = true;
    m.scale.setScalar(f.s);
    m.position.set(f.x, f.y, f.z);
    m.castShadow = true;
    this.root.add(m);
    this.fallers.push({ m, vy: 0, x: f.x, y: f.y, z: f.z, landed: false, t: 0, spin: (rand() - 0.5) * 6 });
    this.nutrition = Math.min(100, this.nutrition + 35);
    if (this.player) this.player.hp = Math.min(this.player.maxHp, this.player.hp + 15);
    this.stats.fruits++;
    this.seen('fruit');
    this.toast('株の実を落とした！ 栄養たっぷり。でも床に落ちる音で気づかれるかも', 'good');
    this.events.push('fruit');
  }

  updateFallers(dt) {
    const keep = [];
    for (const f of this.fallers) {
      f.t += dt;
      if (!f.landed) {
        f.vy -= 20 * dt;
        f.y += f.vy * dt;
        f.m.rotation.x += f.spin * dt;
        if (f.y <= 0.2) {
          f.y = 0.2; f.landed = true;
          const dp = this.player ? Math.hypot(this.player.x - f.x, this.player.z - f.z) : 99;
          this.sfx.thud();
          if (dp < 8) this.shake = Math.max(this.shake, 0.3);
          this.noise({ x: f.x, y: 0, z: f.z }, 11, 55);
        }
        f.m.position.set(f.x, f.y, f.z);
      }
      if (f.t > 9) { this.root.remove(f.m); disposeObject(f.m); } else keep.push(f);
    }
    this.fallers = keep;
  }

  baitInReach(r) {
    if (r.surface >= 0) return null;
    for (const b of this.baits) if (b.alive && Math.hypot(b.x - r.x, b.z - r.z) < 0.62) return b;
    return null;
  }

  eatBait(p, b) {
    b.alive = false;
    this.root.remove(b.model);
    p.eatingBait = null;
    p.baitT = 0;
    this.nutrition = 100;
    p.poison = 18;
    this.stats.baits++;
    this.seen('bait');
    this.sfx.poison();
    this.toast('毒エサを食べた！ 栄養は満タン。でも毒が回って体力が減っていく…', 'warn');
    this.events.push('bait');
  }

  // 風の道の入口（渦）にいるか
  windLaneAt(r) {
    if (r.surface >= 0 || r.y > 0.1 || r.nymph) return null;
    for (const L of WIND_LANES) if (Math.hypot(L.x0 - r.x, L.z - r.z) < 0.9) return L;
    return null;
  }

  startGlide(p, L) {
    p.st = 'glide';
    p.glide = { t: 0, sx: p.x, sz: p.z, L, dur: 2.4 + (L.x1 - L.x0) * 0.02 };
    p.h = Math.PI / 2;
    this.stats.winds++;
    this.seen('wind');
    this.sfx.wind();
    this.events.push('wind');
  }

  crateInReach(r) {
    let best = null, bd = EAT_REACH;
    const y = this.surfY(r);
    for (const c of this.crates) {
      if (c.rotten || c.shipped || c.carried) continue;
      if (Math.abs(c.baseY - y) > 0.3) continue;
      const d = rectDist(r.x, r.z, c.rect);
      if (d <= bd) { bd = d; best = c; }
    }
    return best;
  }

  bite(c, amt, who) {
    if (c.rotten) return;
    c.hp -= amt;
    c.lastBite = this.clock;
    this.stats.ate += amt;
    if (c.hp <= 0) this.ruinCrate(c, who);
  }

  ruinCrate(c) {
    c.hp = 0;
    c.rotten = true;
    c.model.flies.visible = true;
    setCrateRot(c.model, 1);
    this.ruined++;
    this.stats.ruined = this.ruined;
    this.stats.ruinedColor[c.colorIdx || 0]++;
    if (this.ruined >= this.diff.target) this.snap('last', '最後のコンテナをかじりつくした！');
    this.sfx.ruin();
    this.toast(`コンテナを1箱ダメにした！（${this.ruined} / ${this.diff.target}）`, 'good');
    this.events.push('ruin');
    for (const r of this.roaches) if (r.eatingCrate === c) r.eatingCrate = null;
  }

  tryLayEgg(p) {
    if (this.nutrition < 100) { this.toast(`栄養が足りない（${Math.floor(this.nutrition)} / 100）。野菜を食べよう`, 'info'); return; }
    const pending = this.eggs.filter((e) => e.alive).length * 3;
    if (this.nymphs.length + pending >= MAX_NYMPHS) return;
    if (p.st !== 'move') return;
    this.nutrition = 0;
    const m = makeEgg();
    let bx = p.x - Math.sin(p.h) * 0.35, bz = p.z - Math.cos(p.h) * 0.35;
    if (p.surface >= 0) {
      const T = SURFACES[p.surface];
      bx = clamp(bx, T.minX + 0.2, T.maxX - 0.2);
      bz = clamp(bz, T.minZ + 0.2, T.maxZ - 0.2);
    }
    const e = { kind: 'egg', x: bx, y: this.surfY(p), z: bz, surface: p.surface, t: 0, alive: true, model: m, sprayT: 0 };
    m.position.set(e.x, e.y, e.z);
    m.rotation.y = p.h;
    this.root.add(m);
    this.eggs.push(e);
    this.stats.eggs++;
    this.sfx.lay();
    const hid = this.hideFactor(e) < 0.5;
    this.toast(hid ? '卵を産んだ！ 隠れた場所なので見つかりにくい' : '卵を産んだ！ 目立つ場所だと踏みつぶされるかも…', hid ? 'good' : 'info');
    this.events.push('egg');
  }

  tryAttack(p) {
    const f = this.farmer;
    if (p.st !== 'move') return;
    if (this.attackCD > 0) { this.toast(`突撃はあと ${Math.ceil(this.attackCD)} 秒で使える`, 'info'); return; }
    if (f.state === 'PANIC') return;
    const d = Math.hypot(f.x - p.x, f.z - p.z);
    if (d > ATTACK_RANGE) { this.toast('農場主の足もとまで近づかないと届かない', 'info'); return; }
    p.st = 'fly';
    p.fly = { phase: 0, t: 0, sx: p.x, sy: p.y, sz: p.z };
    p.surface = -1;
    this.attackCD = ATTACK_CD;
    this.stats.attacks++;
    this.sfx.whoosh();
  }

  // ---------------- 仲間（幼虫）の動き ----------------
  updateNymph(r, dt) {
    r.moving = false; r.dashing = false;
    r.eatingCrate = null;
    if (r.st === 'stuck') {
      r.stuckT += dt;
      if (r.stuckT > 7) this.kill(r, 'trap');
      return;
    }
    if (r.st !== 'move') return;
    const f = this.farmer;
    const ai = r.ai;
    let tx = null, tz = null, spd = 2.4, eatTarget = null;

    // 叩きつぶし・殺虫剤の予告からは逃げる
    let danger = null;
    if (f.act && !f.act.done) {
      const d = Math.hypot(f.act.x - r.x, f.act.z - r.z);
      if (d < f.act.radius + 0.5 && Math.abs(f.act.y - r.y) < 1) danger = f.act;
    }
    for (const c of this.clouds) {
      if (Math.hypot(c.x - r.x, c.z - r.z) < c.r + 0.3 && Math.abs(c.y - r.y) < 1.5) danger = c;
    }

    if (this.fog || (f.state === 'FUMIGATE')) {
      // 燻煙剤：いちばん近い逃げ場へ
      const sp = this.nearestSafe(r);
      tx = sp.x; tz = sp.z; spd = 3.9;
      if (Math.hypot(sp.x - r.x, sp.z - r.z) < sp.r * 0.6) tx = null;
    } else if (danger) {
      const dx = r.x - danger.x, dz = r.z - danger.z, d = Math.hypot(dx, dz) || 1;
      tx = r.x + (dx / d) * 2; tz = r.z + (dz / d) * 2; spd = 3.8;
    } else if (f.state === 'CHASE' && f.target === r && this.mode !== 'decoy') {
      // 追われたら隠れ場所へ
      if (!ai.hide || ai.retarget <= 0) { ai.hide = this.pickHideSpot(r); ai.retarget = 3; }
      tx = ai.hide.x; tz = ai.hide.z; spd = 3.8;
    } else if (this.mode === 'search') {
      ai.retarget -= dt;
      const t = ai.target;
      if (!t || t.rotten || t.shipped || t.carried || ai.retarget <= 0) {
        ai.target = this.pickCrateFor(r);
        ai.retarget = 6;
      }
      const c = ai.target;
      if (c) {
        if (this.crateInReach(r) === c) {
          eatTarget = c;
        } else if (c.table >= 0 && r.surface !== c.table && r.surface < 0) {
          const T = TABLES[c.table];
          const side = r.z < T.z ? T.minZ - 0.25 : T.maxZ + 0.25;
          tx = c.x + 0.0; tz = side;
          if (Math.hypot(tx - r.x, tz - r.z) < 0.5) {
            const cl = this.canClimb(r);
            if (cl) { this.startClimb(r, cl); return; }
          }
        } else {
          const T = c.table >= 0 ? TABLES[c.table] : null;
          tx = c.x; tz = T ? (r.z < c.z ? c.z - 0.75 : c.z + 0.75) : (r.z < c.z ? c.z - 0.7 : c.z + 0.7);
        }
      } else {
        tx = this.player.x; tz = this.player.z;
      }
    } else if (this.mode === 'decoy') {
      // 農場主の前をうろちょろして気を引く
      const a = this.clock * 0.9 + ai.slot * 6.28;
      const ahead = 3.2 + Math.sin(this.clock * 0.7 + ai.slot * 10) * 1.2;
      tx = f.x + Math.sin(f.h) * ahead + Math.cos(a) * 1.8;
      tz = f.z + Math.cos(f.h) * ahead + Math.sin(a) * 1.8;
      spd = 3.1;
    } else {
      // 集合：自分の後ろについていく
      const p = this.player;
      const k = ai.slot * 6.28;
      const back = 0.6 + (ai.slot * 0.6);
      tx = p.x - Math.sin(p.h + Math.sin(k) * 0.9) * back;
      tz = p.z - Math.cos(p.h + Math.sin(k) * 0.9) * back;
      if (p.surface >= 0 && r.surface < 0) {
        const T = SURFACES[p.surface];
        tz = r.z < T.z ? T.minZ - 0.25 : T.maxZ + 0.25;
        tx = clamp(p.x, T.minX + 0.4, T.maxX - 0.4);
        if (Math.hypot(tx - r.x, tz - r.z) < 0.5) {
          const cl = this.canClimb(r);
          if (cl) { this.startClimb(r, cl); return; }
        }
      }
      const d = Math.hypot(tx - r.x, tz - r.z);
      spd = d > 3 ? 4.0 : 2.6;
      if (d < 0.25) { tx = null; }
    }

    if (eatTarget) {
      r.eatingCrate = eatTarget;
      r.h = dampAngle(r.h, Math.atan2(eatTarget.x - r.x, eatTarget.z - r.z), 6, dt);
      this.bite(eatTarget, 1.5 * dt, r);
      this.noise(r, 2.5, 4 * dt);
      r.crunchT -= dt;
      if (r.crunchT <= 0) {
        r.crunchT = 0.4 + rand() * 0.3;
        const dp = Math.hypot(this.player.x - r.x, this.player.z - r.z);
        if (dp < 8) this.sfx.crunch(0.05 * (1 - dp / 8));
      }
      return;
    }
    if (tx === null) return;

    let dx = tx - r.x, dz = tz - r.z;
    const d = Math.hypot(dx, dz);
    if (d < 0.08) return;
    dx /= d; dz /= d;
    // わなと毒エサを避ける
    for (const t of [...this.traps, ...this.baits.filter((b) => b.alive)]) {
      const ex = r.x - t.x, ez = r.z - t.z, ed = Math.hypot(ex, ez);
      if (ed < 1.5 && ed > 0.001) { const w = (1.5 - ed) * 2.2; dx += (ex / ed) * w; dz += (ez / ed) * w; }
    }
    // 仲間どうし少し離れる
    for (const o of this.roaches) {
      if (o === r || !o.alive) continue;
      const ex = r.x - o.x, ez = r.z - o.z, ed = Math.hypot(ex, ez);
      if (ed < 0.35 && ed > 0.001) { dx += (ex / ed) * 0.8; dz += (ez / ed) * 0.8; }
    }
    // 引っかかったら少しずらす
    ai.jitterT -= dt;
    if (ai.jitterT > 0) { dx += ai.jx; dz += ai.jz; }
    const m = Math.hypot(dx, dz) || 1;
    this.moveRoach(r, dx / m, dz / m, Math.min(spd, d / dt), dt);
    r.dashing = spd > 3.5;
    ai.stallT += dt;
    if (ai.stallT > 1.2) {
      const moved = Math.hypot(r.x - ai.lastX, r.z - ai.lastZ);
      if (moved < 0.3 && d > 0.6) { ai.jitterT = 0.8; const a = rand() * 6.28; ai.jx = Math.cos(a) * 1.5; ai.jz = Math.sin(a) * 1.5; }
      ai.lastX = r.x; ai.lastZ = r.z; ai.stallT = 0;
    }
  }

  pickCrateFor(r) {
    let best = null, bs = Infinity;
    for (const c of this.crates) {
      if (c.rotten || c.shipped || c.carried) continue;
      const users = this.roaches.filter((o) => o.alive && o !== r && !o.isPlayer && o.ai.target === c).length;
      const df = Math.hypot(c.x - this.farmer.x, c.z - this.farmer.z);
      const s = Math.hypot(c.x - r.x, c.z - r.z) + users * 6 + (df < 5 ? 8 : 0) + (100 - c.hp) * -0.05;
      if (s < bs) { bs = s; best = c; }
    }
    return best;
  }

  nearestSafe(r) {
    let best = SAFE_SPOTS[0], bd = Infinity;
    for (const s of SAFE_SPOTS) { const d = Math.hypot(s.x - r.x, s.z - r.z); if (d < bd) { bd = d; best = s; } }
    return best;
  }

  pickHideSpot(r) {
    const f = this.farmer;
    let best = HIDE_SPOTS[0], bs = Infinity;
    for (const s of HIDE_SPOTS) {
      const s1 = Math.hypot(s.x - r.x, s.z - r.z) - 0.7 * Math.hypot(s.x - f.x, s.z - f.z);
      if (s1 < bs) { bs = s1; best = s; }
    }
    return { x: best.x + randRange(-0.5, 0.5), z: best.z + randRange(-0.3, 0.3) };
  }

  // ---------------- 共通の動き ----------------
  moveRoach(r, dx, dz, spd, dt) {
    r.h = dampAngle(r.h, Math.atan2(dx, dz), 12, dt);
    r.x += dx * spd * dt;
    r.z += dz * spd * dt;
    r.phase += spd * dt * (r.nymph ? 26 : 18);
    r.moving = true;
    this.collide(r);
    if (r.surface >= 0 && !inRect(r.x, r.z, SURFACES[r.surface], 0.02)) {
      r.surface = -1;
      r.st = 'fall';
      r.vy = 0;
    }
  }

  collide(r) {
    r.x = clamp(r.x, BOUNDS.minX, BOUNDS.maxX);
    r.z = clamp(r.z, BOUNDS.minZ, BOUNDS.maxZ);
    const y = r.st === 'fall' ? 0 : this.surfY(r);
    const pad = r.nymph ? 0.09 : 0.13;
    for (const c of this.crates) {
      if (c.shipped || c.carried) continue;
      if (Math.abs(c.baseY - y) > 0.3) continue;
      const R = c.rect;
      if (r.x > R.minX - pad && r.x < R.maxX + pad && r.z > R.minZ - pad && r.z < R.maxZ + pad) {
        const pl = r.x - (R.minX - pad), pr = (R.maxX + pad) - r.x, pb = r.z - (R.minZ - pad), pf = (R.maxZ + pad) - r.z;
        const m = Math.min(pl, pr, pb, pf);
        if (m === pl) r.x = R.minX - pad; else if (m === pr) r.x = R.maxX + pad;
        else if (m === pb) r.z = R.minZ - pad; else r.z = R.maxZ + pad;
      }
    }
    r.x = clamp(r.x, BOUNDS.minX, BOUNDS.maxX);
    r.z = clamp(r.z, BOUNDS.minZ, BOUNDS.maxZ);
  }

  canClimb(r) {
    if (r.surface !== -1 || r.st !== 'move') return null;
    for (let i = 0; i < SURFACES.length; i++) {
      const T = SURFACES[i];
      const d = rectDist(r.x, r.z, T);
      let px = clamp(r.x, T.minX, T.maxX), pz = clamp(r.z, T.minZ, T.maxZ);
      if (d === 0) {
        const e = [r.x - T.minX, T.maxX - r.x, r.z - T.minZ, T.maxZ - r.z];
        const m = Math.min(...e);
        if (m > 0.75) continue;
        if (m === e[0]) px = T.minX; else if (m === e[1]) px = T.maxX; else if (m === e[2]) pz = T.minZ; else pz = T.maxZ;
      } else if (d > 0.65) continue;
      return {
        table: i,
        tx: clamp(px, T.minX + 0.35, T.maxX - 0.35),
        tz: clamp(pz, T.minZ + 0.32, T.maxZ - 0.32),
      };
    }
    return null;
  }

  startClimb(r, c) {
    r.st = 'climb';
    r.climb = { t: 0, sx: r.x, sz: r.z, sy: r.y, tx: c.tx, tz: c.tz, table: c.table };
    r.h = Math.atan2(c.tx - r.x, c.tz - r.z);
    if (r.isPlayer) this.events.push('climb');
  }

  updateRoachCommon(r, dt) {
    r.trapImmune = Math.max(0, r.trapImmune - dt);
    r.hurtT = Math.max(0, r.hurtT - dt);
    if (r.grow > 0) {
      r.grow = Math.max(0, r.grow - dt);
      r.model.root.scale.setScalar(lerp(1, 0.62, r.grow));
    }
    if (r.st === 'climb') {
      const c = r.climb;
      c.t += dt / 0.8;
      const t = Math.min(1, c.t);
      const e = smooth(t);
      r.x = lerp(c.sx, c.tx, e);
      r.z = lerp(c.sz, c.tz, e);
      r.y = lerp(c.sy, SURFACES[c.table].top, smooth(t * 1.35));
      r.phase += dt * 20;
      r.moving = true;
      if (c.t >= 1) {
        r.st = 'move';
        r.surface = c.table;
        r.y = SURFACES[c.table].top;
        r.climb = null;
        this.collide(r);
      }
    } else if (r.st === 'fall') {
      r.vy -= 22 * dt;
      r.y += r.vy * dt;
      if (r.y <= 0) {
        r.y = 0; r.vy = 0; r.st = 'move'; r.surface = -1;
        this.collide(r);
      }
    } else if (r.st === 'fly') {
      this.updateFly(r, dt);
    } else if (r.st === 'glide') {
      const G = r.glide;
      G.t += dt;
      const k = Math.min(1, G.t / G.dur);
      const e = smooth(k);
      r.x = lerp(G.sx, G.L.x1, e);
      r.z = lerp(G.sz, G.L.z, Math.min(1, k * 3));
      r.y = Math.sin(Math.PI * k) * 3.2;
      r.h = Math.PI / 2;
      r.phase += dt * 30;
      if (k >= 1) {
        r.st = 'move'; r.y = 0; r.surface = -1; r.glide = null; r.trapImmune = 0.6;
        this.collide(r);
      }
    } else if (r.st === 'move') {
      r.y = this.surfY(r);
    }
  }

  updateFly(r, dt) {
    const f = this.farmer, F = r.fly;
    F.t += dt;
    const face = { x: f.x + Math.sin(f.h) * 0.6, y: 5.0, z: f.z + Math.cos(f.h) * 0.6 };
    r.phase += dt * 30;
    if (F.phase === 0) {
      const t = Math.min(1, F.t / 0.5);
      r.x = lerp(F.sx, face.x, t);
      r.z = lerp(F.sz, face.z, t);
      r.y = lerp(F.sy, face.y, t) + Math.sin(Math.PI * t) * 1.2;
      r.h = Math.atan2(face.x - F.sx, face.z - F.sz);
      if (t >= 1) { F.phase = 1; F.t = 0; this.farmerPanic(); }
    } else if (F.phase === 1) {
      r.x = face.x + Math.sin(this.clock * 40) * 0.06;
      r.y = face.y + Math.cos(this.clock * 33) * 0.06;
      r.z = face.z;
      r.h = f.h + Math.PI;
      if (F.t > 0.8) {
        F.phase = 2; F.t = 0;
        F.sx = r.x; F.sy = r.y; F.sz = r.z;
        let best = null;
        for (let k = 0; k < 16; k++) {
          const a = rand() * Math.PI * 2, d = 3 + rand() * 1.5;
          const x = clamp(f.x + Math.cos(a) * d, BOUNDS.minX + 0.3, BOUNDS.maxX - 0.3);
          const z = clamp(f.z + Math.sin(a) * d, BOUNDS.minZ + 0.3, BOUNDS.maxZ - 0.3);
          if (this.crates.some((c) => !c.shipped && !c.carried && c.baseY === 0 && rectDist(x, z, c.rect) < 0.3)) continue;
          if (this.traps.some((t) => Math.hypot(t.x - x, t.z - z) < 0.9)) continue;
          best = { x, z };
          // 隠れ場所に近い所を優先
          if (this.hideFactor({ x, y: 0, z }) < 0.5) break;
        }
        F.lx = best ? best.x : clamp(f.x + 3, BOUNDS.minX, BOUNDS.maxX);
        F.lz = best ? best.z : f.z;
        this.sfx.whoosh();
      }
    } else {
      const t = Math.min(1, F.t / 0.55);
      r.x = lerp(F.sx, F.lx, t);
      r.z = lerp(F.sz, F.lz, t);
      r.y = lerp(F.sy, 0, t) + Math.sin(Math.PI * t) * 0.8;
      r.h = Math.atan2(F.lx - F.sx, F.lz - F.sz);
      if (t >= 1) {
        r.st = 'move'; r.y = 0; r.surface = -1; r.fly = null; r.trapImmune = 0.6;
        this.collide(r);
      }
    }
  }

  freeFromTrap(r) {
    const t = r.trap;
    r.st = 'move';
    r.trap = null;
    r.struggle = 0;
    r.stuckT = 0;
    r.trapImmune = 1.6;
    if (t) {
      let dx = r.x - t.x, dz = r.z - t.z;
      let d = Math.hypot(dx, dz);
      if (d < 0.01) { dx = Math.sin(r.h); dz = Math.cos(r.h); d = 1; }
      r.x = t.x + (dx / d) * 0.95;
      r.z = t.z + (dz / d) * 0.95;
      this.collide(r);
    }
    if (r.isPlayer) this.toast('ホイホイからぬけ出した！', 'good');
    this.sfx.whoosh();
  }

  damage(r, amt, cause) {
    if (!r.alive || amt <= 0) return;
    r.hp -= amt;
    if (r.isPlayer) {
      if (r.hurtT <= 0 && amt > 0.2) { this.sfx.hurt(); r.hurtT = 0.4; }
      this.ui.hurt(Math.min(1, amt / 20));
    }
    if (r.hp <= 0) this.kill(r, cause);
  }

  kill(r, cause) {
    if (!r.alive) return;
    r.alive = false;
    r.hp = 0;
    r.deadT = 0;
    r.st = 'dead';
    r.eatingCrate = null;
    if (r.trap) r.trap = null;
    r.model.body.rotation.z = Math.PI;
    r.model.body.position.y = 0.17;
    const cname = { spray: '殺虫剤', whack: '叩きつぶし', trap: 'ホイホイ' }[cause] || '';
    if (!r.isPlayer) {
      this.stats.lost++;
      const dp = Math.hypot(this.player.x - r.x, this.player.z - r.z);
      if (dp < 12) this.toast(`仲間がやられた…（${cname}）`, 'bad');
      return;
    }
    this.sfx.die();
    this.stats.deaths++;
    this.lastDeathCause = cause;
    // 仲間がいれば意識を移す
    let next = null, bd = Infinity;
    for (const o of this.roaches) {
      if (!o.alive || o === r) continue;
      const d = Math.hypot(o.x - r.x, o.z - r.z) + (o.st === 'stuck' ? 50 : 0);
      if (d < bd) { bd = d; next = o; }
    }
    if (!next) {
      const egg = this.eggs.find((e) => e.alive);
      if (egg) { this.hatch(egg); next = this.nymphs[0] || null; }
    }
    r.isPlayer = false;
    if (next) {
      next.isPlayer = true;
      next.nymph = false;
      next.maxHp = 70;
      next.hp = 70;
      next.grow = 1;
      next.ai.target = null;
      this.player = next;
      this.toast(`やられた…（${cname}）　仲間に意識を移した！ 残り ${this.nymphs.length} 匹`, 'bad');
      this.events.push('transfer');
    } else {
      this.endGame(false, 'dead');
    }
  }

  // ---------------- 卵 ----------------
  updateEggs(dt) {
    for (const e of this.eggs) {
      if (!e.alive) continue;
      e.t += dt;
      const k = e.t / this.diff.hatch;
      e.model.scale.setScalar(1 + Math.sin(this.clock * 8) * 0.04 * k);
      if (e.t >= this.diff.hatch) this.hatch(e);
    }
  }

  hatch(e) {
    if (!e.alive) return;
    e.alive = false;
    this.root.remove(e.model);
    const n = 3;
    for (let i = 0; i < n; i++) {
      const a = (i / 3) * Math.PI * 2;
      let x = e.x + Math.cos(a) * 0.3, z = e.z + Math.sin(a) * 0.3;
      if (e.surface >= 0) {
        const T = SURFACES[e.surface];
        x = clamp(x, T.minX + 0.12, T.maxX - 0.12);
        z = clamp(z, T.minZ + 0.12, T.maxZ - 0.12);
      }
      const r = this.spawnRoach(x, z, true, e.y, e.surface);
      this.collide(r);
      this.stats.born++;
    }
    this.sfx.hatch();
    this.toast(`卵がかえった！ 仲間が ${n} 匹ふえた（いま ${this.nymphs.length} 匹）`, 'good');
    this.events.push('hatch');
  }

  // ---------------- 農場主 ----------------
  farmerSpeed(kind) {
    const f = this.farmer;
    const base = { work: 2.3, inv: 2.7, chase: 3.45, carry: 2.0 }[kind];
    return base * this.diff.fSpeed * (1 + 0.07 * f.anger);
  }

  pathTo(x, z) {
    const f = this.farmer;
    f.path = this.grid.find(f.x, f.z, x, z);
    f.pi = 0;
  }

  // 道に沿って歩く。着いたら true
  walk(dt, speed) {
    const f = this.farmer;
    if (f.pi >= f.path.length) { f.moveSpeed = 0; return true; }
    const p = f.path[f.pi];
    const dx = p.x - f.x, dz = p.z - f.z, d = Math.hypot(dx, dz);
    if (d < 0.2) { f.pi++; return f.pi >= f.path.length; }
    const step = Math.min(d, speed * dt);
    f.x += (dx / d) * step;
    f.z += (dz / d) * step;
    f.h = dampAngle(f.h, Math.atan2(dx, dz), 7, dt);
    f.moveSpeed = speed;
    f.stepAcc += step;
    if (f.stepAcc > 1.7) {
      f.stepAcc = 0;
      const dp = Math.hypot(this.player.x - f.x, this.player.z - f.z);
      const v = Math.max(0, 1 - dp / 26);
      this.sfx.boot(v * v * 0.8, this.panOf(f.x, f.z));
      if (v > 0.15) this.soundPings.push({ x: f.x, z: f.z, v: Math.min(1, v * 1.2), kind: 'step' });
      if (dp < 5) this.shake = Math.max(this.shake, (1 - dp / 5) * 0.25);
    }
    return false;
  }

  hideFactor(t) {
    if (t.surface >= TROUGH0 && t.y > 1) return 0.45; // 栽培槽の上：葉にまぎれる
    if (t.y < 0.4) {
      if (tableAt(t.x, t.z, -0.1) >= 0) return 0.13;
      if (rowAt(t.x, t.z)) return 0.22;
      return 1;
    }
    return 1.1;
  }

  visibility(t) {
    if (t.kind === 'egg') return t.alive ? this.hideFactor(t) * 0.75 : 0;
    if (!t.alive || t.st === 'fly' || t.st === 'glide' || t.st === 'dead') return 0;
    let v = this.hideFactor(t);
    v *= t.moving ? (t.dashing ? 1.5 : 1) : 0.4;
    if (t.eatingCrate) v *= t.isPlayer ? 1 + t.greed / 100 * 0.9 : 1.3;
    if (t.st === 'stuck') v = Math.max(v, 1.0);
    if (t.st === 'climb') v = Math.max(v, 0.9);
    if (t.nymph) v *= 0.8;
    return v;
  }

  // 株の列（葉の壁）が間にあると見えない
  plantsBetween(ax, az, bx, bz) {
    const ra = rowAt(ax, az, 0.3), rb = rowAt(bx, bz, 0.3);
    const d = Math.hypot(bx - ax, bz - az);
    const n = Math.ceil(d / 0.4);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const r = rowAt(ax + (bx - ax) * t, az + (bz - az) * t, -0.2);
      if (r && r !== ra && r !== rb) return true;
    }
    return false;
  }

  sight(t) {
    const f = this.farmer;
    const dx = t.x - f.x, dz = t.z - f.z, d = Math.hypot(dx, dz);
    const range = f.coneRange;
    if (d > range) return 0;
    if (t.y < 4.5 && this.plantsBetween(f.x, f.z, t.x, t.z)) return 0;
    const dot = d > 0.01 ? (dx * Math.sin(f.view) + dz * Math.cos(f.view)) / d : 1;
    if (this.night) {
      // 夜は懐中電灯の光の中だけよく見える。すぐ近くはうっすら
      if (d <= 1.8 && dot > -0.3) return this.visibility(t) * 0.45;
      if (dot < 0.9) return 0;
      return this.visibility(t) * (1 - (d / range) * 0.5) * 1.1;
    }
    if (d > 2.2 && dot < 0.71) return 0;
    if (d <= 2.2 && dot < -0.3) return 0;
    return this.visibility(t) * (1 - (d / range) * 0.65);
  }

  noise(src, radius, amount) {
    const f = this.farmer;
    if (!f || f.state === 'PANIC') return;
    const d = Math.hypot(src.x - f.x, src.z - f.z);
    if (d > radius) return;
    f.susp = Math.min(100, f.susp + amount * (1 - (d / radius) * 0.5) * this.diff.susp);
    f.lastSeen = { x: src.x, y: src.y, z: src.z };
    f.suspect = src;
  }

  // 音の左右：画面の右にあれば +、左にあれば -
  panOf(x, z) {
    const p = this.player;
    if (!p) return 0;
    const dx = x - p.x, dz = z - p.z, d = Math.hypot(dx, dz) || 1;
    return ((dx / d) * -Math.cos(this.camYaw) + (dz / d) * Math.sin(this.camYaw)) * 0.9;
  }

  updateFarmer(dt) {
    const f = this.farmer;
    f.speechT -= dt;
    f.sprayCD = Math.max(0, f.sprayCD - dt);
    f.whackCD = Math.max(0, f.whackCD - dt);
    f.coneRange = this.night ? 13 : 10 + f.anger * 1.2;
    // ネコが足にじゃれている間は動けない
    if (f.catHold > 0 && f.state !== 'PANIC' && f.state !== 'FUMIGATE') {
      f.catHold -= dt;
      f.moveSpeed = 0;
      f.view = f.h;
      return;
    }
    f.moveSpeed = 0;
    // 歩きながら時々よそ見をする（視界が横にふれる）
    f.glanceT -= dt;
    if (f.glanceT <= 0) { f.glanceT = randRange(2.5, 5.5); f.glanceDir = rand() < 0.5 ? -1 : 1; f.glanceDur = 1.3; }
    f.glanceDur -= dt;
    const glancing = f.glanceDur > 0 && (f.state === 'WORK' || f.state === 'INVESTIGATE') && !f.act;
    f.lookOff += ((glancing ? f.glanceDir * 0.95 : 0) - f.lookOff) * (1 - Math.exp(-6 * dt));
    f.view = f.h + f.lookOff;
    if (f.state !== 'PANIC' && f.state !== 'FUMIGATE' && !this.calm) this.sense(dt);
    if (this.calm) { f.moveSpeed = 0; f.h = f.baseH + Math.sin(this.clock * 0.6) * 0.5; return; }

    if (f.act) { this.updateAct(dt); return; }
    switch (f.state) {
      case 'FUMIGATE': this.farmerFumigate(dt); break;
      case 'WORK': this.farmerWork(dt); break;
      case 'INVESTIGATE': this.farmerInvestigate(dt); break;
      case 'CHASE': this.farmerChase(dt); break;
      case 'PANIC':
        f.timer -= dt;
        if (f.timer <= 0) {
          if ((f.panicCount || 0) >= 3) {
            f.state = 'WORK'; f.phase = 'choose'; f.susp = 0; f.focusT = 10;
            this.say(pick(['もう慣れたぞ！ そんな手が何度も効くか！', 'いいかげんにしろ！ 出荷が先だ！']));
          } else {
            this.startInvestigate(this.player, true);
            f.susp = 70;
            this.say('くそったれ…どこ行きやがった！');
          }
        }
        break;
      default: f.state = 'WORK'; f.phase = 'choose';
    }
  }

  sense(dt) {
    const f = this.farmer;
    let best = null, bs = 0;
    for (const r of this.roaches) {
      if (!r.alive) continue;
      const s = this.sight(r);
      if (s > bs) { bs = s; best = r; }
    }
    for (const e of this.eggs) {
      if (!e.alive) continue;
      const s = this.sight(e);
      if (s > bs) { bs = s; best = e; }
    }
    // 出荷に集中しているあいだは気づきにくい
    f.focusT = Math.max(0, (f.focusT || 0) - dt);
    const mul = this.diff.susp * (1 + 0.3 * f.anger) * (f.focusT > 0 ? 0.35 : 1);
    if (best && bs > 0.04) {
      f.susp = Math.min(100, f.susp + 58 * bs * mul * dt);
      if (f.state !== 'CHASE') {
        f.lastSeen = { x: best.x, y: best.y, z: best.z };
        f.suspect = best;
        if (f.state === 'INVESTIGATE' && f.inv) { f.inv.x = best.x; f.inv.y = best.y; f.inv.z = best.z; f.inv.dirty = true; }
      }
    } else if (f.state !== 'CHASE') {
      f.susp = Math.max(0, f.susp - 9 * dt);
    }
    if (f.state === 'WORK' && f.susp >= 40 && f.lastSeen) {
      this.startInvestigate(f.lastSeen, false);
      this.say(pick(['ん？ 今なんか動いたな？', 'おい…誰かいんのか？', 'なんだ今の音は！']));
      this.sfx.huh();
    }
    if ((f.state === 'WORK' || f.state === 'INVESTIGATE') && f.susp >= 100 && f.suspect) {
      this.startChase(f.suspect);
    }
    // ダメになったコンテナに気づく
    for (const c of this.crates) {
      if (!c.rotten || c.discovered) continue;
      const t = { x: c.x, y: c.baseY, z: c.z };
      const dx = t.x - f.x, dz = t.z - f.z, d = Math.hypot(dx, dz);
      if (d > 9) continue;
      const dot = (dx * Math.sin(f.view) + dz * Math.cos(f.view)) / (d || 1);
      if (dot < 0.5 && d > 2.5) continue;
      c.discovered = true;
      f.anger = Math.min(3, f.anger + 1);
      this.say(pick(['ふざけんな！ 売り物にならねえじゃねえか！', '食い荒らしやがって…ぶっ殺す！', 'ゴキブリの分際で！']));
      this.queueTrapNear(c.x, c.z);
      if (f.state === 'WORK') { f.phase = 'shock'; f.timer = 1.6; f.path = []; }
      this.toast(`農場主が怒った！（怒り ${f.anger}）ホイホイが増えるぞ`, 'warn');
    }
  }

  queueTrapNear(x, z) {
    const f = this.farmer;
    if (this.traps.length + f.trapQueue.length >= 9) return;
    for (let k = 0; k < 24; k++) {
      const a = rand() * Math.PI * 2, d = 1.2 + rand() * 1.6;
      const tx = x + Math.cos(a) * d, tz = z + Math.sin(a) * d;
      if (tx < BOUNDS.minX + 0.8 || tx > BOUNDS.maxX - 0.8 || tz < BOUNDS.minZ + 0.8 || tz > BOUNDS.maxZ - 0.8) continue;
      if (this.crates.some((c) => !c.shipped && c.baseY === 0 && rectDist(tx, tz, c.rect) < 0.8)) continue;
      if (this.traps.some((t) => Math.hypot(t.x - tx, t.z - tz) < 1.6)) continue;
      if (f.trapQueue.some((t) => Math.hypot(t.x - tx, t.z - tz) < 1.6)) continue;
      if (Math.hypot(tx - DOOR.x, tz - DOOR.z) < 2) continue;
      // ステージ3からは3回に1回は毒エサ（ステージ5は2回に1回）
      const every = this.diff.no >= 5 ? 2 : 3;
      const n = this.traps.length + this.baits.length + f.trapQueue.length;
      const kind = this.diff.no >= 3 && n % every === every - 1 ? 'bait' : 'trap';
      f.trapQueue.push({ x: tx, z: tz, kind });
      return;
    }
  }

  startInvestigate(p, spray) {
    const f = this.farmer;
    f.state = 'INVESTIGATE';
    f.inv = { x: p.x, y: p.y || 0, z: p.z, look: 0, spray };
    f.target = null;
    this.pathTo(p.x, p.z);
  }

  startChase(t) {
    const f = this.farmer;
    if (f.state !== 'CHASE') {
      this.stats.chased++;
      this.sfx.alert();
      if (t.kind === 'egg') this.say('卵まで産みやがって！ つぶしてやる！');
      else this.say(pick(['出やがったな、このゴキブリが！', '待てコラァ！', 'そこか！ 逃がすかよ！']));
      if (t === this.player) this.events.push('spotted');
    }
    if (f.carry) this.dropCarry('農場主がコンテナを床に置いた！ チャンス！');
    f.state = 'CHASE';
    f.target = t;
    f.susp = 100;
    f.lostT = 0;
    f.chaseT = 0;
    f.repath = 0;
    f.lastSeen = { x: t.x, y: t.y, z: t.z };
  }

  farmerPanic() {
    const f = this.farmer;
    this.dropCarry();
    if (f.act && f.act.marker) { this.root.remove(f.act.marker); disposeObject(f.act.marker); }
    f.act = null;
    f.state = 'PANIC';
    // 何度も飛びつかれると慣れてくる（パニックが短くなる）
    f.panicCount = (f.panicCount || 0) + 1;
    f.timer = Math.max(1.8, 5.5 - (f.panicCount - 1) * 1.0);
    f.target = null;
    f.susp = 0;
    f.anger = Math.min(3, f.anger + 1);
    f.path = [];
    this.say('うわぁぁっ！ 顔に！！ ふざけんなっ！');
    this.snap('panic', '農場主の顔に飛びついた！');
    this.sfx.scream();
    this.shake = 0.6;
    this.events.push('panic');
  }

  dropCarry(msg = '農場主がコンテナを落とした！ チャンス！') {
    const f = this.farmer;
    const c = f.carry;
    if (!c) return;
    f.carry = null;
    c.carried = false;
    c.table = -1;
    c.baseY = 0;
    const okAt = (x, z) => x > BOUNDS.minX + 1 && x < BOUNDS.maxX - 1 && z > BOUNDS.minZ + 0.8 && z < BOUNDS.maxZ - 0.8 &&
      !rowAt(x, z, 0.8) && tableAt(x, z, 0.9) < 0 &&
      !this.traps.some((t) => Math.hypot(t.x - x, t.z - z) < 1.4) &&
      !this.crates.some((o) => o !== c && !o.shipped && !o.carried && o.baseY === 0 && Math.abs(o.x - x) < CRATE.w + 0.1 && Math.abs(o.z - z) < CRATE.d + 0.1);
    let x = f.x + Math.sin(f.h) * 1.2, z = f.z + Math.cos(f.h) * 1.2;
    let found = okAt(x, z);
    for (let k = 0; k < 60 && !found; k++) {
      const a = rand() * 6.28, d = 1.2 + k * 0.12;
      x = f.x + Math.cos(a) * d;
      z = f.z + Math.sin(a) * d;
      found = okAt(x, z);
    }
    if (!found) { const p = this.grid.nearestFree(f.x, f.z); x = p.x; z = p.z; }
    x = clamp(x, BOUNDS.minX + 1, BOUNDS.maxX - 1);
    z = clamp(z, BOUNDS.minZ + 0.8, BOUNDS.maxZ - 0.8);
    c.x = x; c.z = z;
    this.root.attach(c.model.group);
    this.placeCrate(c);
    this.toast(msg, 'good');
  }

  farmerWork(dt) {
    const f = this.farmer;
    switch (f.phase) {
      case 'idle':
      case 'shock':
        f.timer -= dt;
        if (f.phase === 'idle') f.h = f.baseH + Math.sin(this.clock * 1.1) * 0.9;
        if (f.timer <= 0) f.phase = 'choose';
        break;
      case 'choose': {
        f.baseH = f.h;
        if (!this.fumigated && f.anger >= 3 && this.ruined >= Math.ceil(this.diff.target * (this.diff.fumAt || 0.5)) && !f.carry) {
          this.startFumigation();
          break;
        }
        if (f.trapQueue.length) {
          const t = f.trapQueue[0];
          f.phase = 'trap';
          this.pathTo(t.x, t.z);
          break;
        }
        if (f.carry) { f.phase = 'toDoor'; this.pathTo(DOOR.x, DOOR.z); break; }
        const c = this.pickWorkCrate();
        if (c) { f.crate = c; f.phase = 'toCrate'; this.pathTo(c.x, c.z); }
        else this.startPatrol();
        break;
      }
      case 'toCrate': {
        const c = f.crate;
        if (!c || c.rotten || c.shipped || c.carried) { f.phase = 'choose'; break; }
        const d = Math.hypot(c.x - f.x, c.z - f.z);
        if (d < 2.9) { f.phase = 'pack'; f.timer = 1.6; f.path = []; break; }
        if (this.walk(dt, this.farmerSpeed('work'))) {
          if (d < 3.6) { f.phase = 'pack'; f.timer = 1.6; }
          else { c.skipUntil = this.clock + 15; f.phase = 'choose'; }
        }
        break;
      }
      case 'pack': {
        const c = f.crate;
        if (!c || c.rotten || c.shipped || c.carried) { f.phase = 'choose'; break; }
        f.h = dampAngle(f.h, Math.atan2(c.x - f.x, c.z - f.z), 6, dt);
        f.timer -= dt;
        if (f.timer <= 0) {
          f.carry = c;
          c.carried = true;
          for (const r of this.roaches) if (r.eatingCrate === c) r.eatingCrate = null;
          f.model.root.attach(c.model.group);
          c.model.group.position.set(0, 2.85, 1.15);
          c.model.group.rotation.set(0, 0, 0);
          f.phase = 'toDoor';
          this.pathTo(DOOR.x, DOOR.z);
          if (c.hp < 85) {
            this.say('かじられてんじゃねえか…ナメやがって');
            this.queueTrapNear(c.x, c.z);
          }
        }
        break;
      }
      case 'toDoor':
        if (!f.carry) { f.phase = 'choose'; break; }
        if (this.walk(dt, this.farmerSpeed('carry'))) {
          const c = f.carry;
          f.carry = null;
          c.carried = false;
          c.shipped = true;
          this.root.attach(c.model.group);
          const s = truckSlot(this.shipped);
          c.model.group.position.set(s.x, s.y, s.z);
          c.model.group.rotation.set(0, 0, 0);
          c.x = s.x; c.z = s.z;
          this.shipped++;
          this.stats.shipped = this.shipped;
          this.sfx.ship();
          this.say(pick(['よし、一箱出荷だ', 'まず一箱。邪魔すんなよ', 'よいしょっと…次だ次']));
          this.toast(`1箱出荷されてしまった（あと ${this.shipLeft()} 箱出荷されたら負け）`, 'warn');
          this.events.push('ship');
          // トラックに積みこんで、ひもをかける
          f.phase = 'loading'; f.timer = this.diff.loadT; f.baseH = f.h;
        }
        break;
      case 'loading':
        f.timer -= dt;
        f.h = dampAngle(f.h, Math.PI / 2, 4, dt);
        if (f.timer <= 0) {
          if (rand() < this.diff.patrolP) this.startPatrol();
          else { f.phase = 'idle'; f.timer = 1.2; f.baseH = f.h; }
        }
        break;
      case 'patrol':
        if (this.walk(dt, this.farmerSpeed('work'))) {
          f.phase = 'tend';
          f.timer = randRange(this.diff.patrol[0], this.diff.patrol[1]);
          f.baseH = f.h;
        }
        break;
      case 'tend':
        f.timer -= dt;
        f.h = f.baseH + Math.sin(this.clock * 0.9) * 1.1;
        if (f.timer <= 0) f.phase = 'choose';
        break;
      case 'trap': {
        const t = f.trapQueue[0];
        if (!t) { f.phase = 'choose'; break; }
        const d = Math.hypot(t.x - f.x, t.z - f.z);
        if (d < 2.2 || this.walk(dt, this.farmerSpeed('work'))) {
          f.phase = 'placing'; f.timer = 1.3; f.path = [];
        }
        break;
      }
      case 'placing': {
        const t = f.trapQueue[0];
        if (t) f.h = dampAngle(f.h, Math.atan2(t.x - f.x, t.z - f.z), 6, dt);
        f.timer -= dt;
        if (f.timer <= 0) {
          f.trapQueue.shift();
          if (t) {
            if (t.kind === 'bait') { this.addBait(t.x, t.z); this.say('毒エサだ。食ったら最後だぞ'); }
            else { this.addTrap(t.x, t.z); this.say('ホイホイ置いとくぞ。覚えとけよ'); }
          }
          f.phase = 'choose';
        }
        break;
      }
      default: f.phase = 'choose';
    }
  }

  startPatrol() {
    const f = this.farmer;
    const p = pick(PATROL_POINTS);
    f.phase = 'patrol';
    this.pathTo(p.x, p.z);
  }

  pickWorkCrate() {
    const f = this.farmer;
    let best = null, bd = Infinity;
    for (const c of this.crates) {
      if (c.rotten || c.shipped || c.carried || (c.skipUntil || 0) > this.clock) continue;
      const d = Math.hypot(c.x - f.x, c.z - f.z) + (c.table < 0 ? 4 : 0);
      if (d < bd) { bd = d; best = c; }
    }
    return best;
  }

  farmerInvestigate(dt) {
    const f = this.farmer, I = f.inv;
    if (!I) { f.state = 'WORK'; f.phase = 'choose'; return; }
    if (I.dirty) {
      f.repath -= dt;
      if (f.repath <= 0) { I.dirty = false; I.look = 0; f.repath = 0.6; this.pathTo(I.x, I.z); }
    }
    if (I.look <= 0) {
      const d = Math.hypot(I.x - f.x, I.z - f.z);
      if (d < 2.2 || this.walk(dt, this.farmerSpeed('inv'))) {
        I.look = 0.001;
        f.baseH = d > 0.3 ? Math.atan2(I.x - f.x, I.z - f.z) : f.h;
        f.path = [];
      }
      return;
    }
    I.look += dt;
    f.h = f.baseH + Math.sin(I.look * 1.6) * 1.0;
    if (I.look > 3) {
      if (I.spray && f.anger >= 1 && f.sprayCD <= 0) {
        this.startAct('spray', I.x, I.y, I.z);
        this.say('念のため、まいとくぞ。くたばれ');
      } else if (rand() < 0.5) this.say('…チッ、気のせいか');
      f.state = 'WORK';
      f.phase = 'choose';
      f.susp = Math.min(f.susp, 30);
      f.inv = null;
    }
  }

  farmerChase(dt) {
    // 追いかけっこは長くは続けない。出荷が先だ
    this.farmer.chaseT = (this.farmer.chaseT || 0) + dt;
    if (this.farmer.chaseT > 18 && !this.farmer.act) {
      const f0 = this.farmer;
      f0.state = 'WORK'; f0.phase = 'choose'; f0.target = null; f0.susp = 0; f0.focusT = 14;
      this.say(pick(['チッ、キリがねえ。出荷が先だ', 'くそっ、相手してる暇はねえ！', '覚えてろよ…今は出荷だ']));
      return;
    }
    const f = this.farmer, t = f.target;
    if (!t || !t.alive) {
      f.state = 'INVESTIGATE';
      f.inv = { x: f.lastSeen ? f.lastSeen.x : f.x, y: f.lastSeen ? f.lastSeen.y || 0 : 0, z: f.lastSeen ? f.lastSeen.z : f.z, look: 0.001, spray: false };
      f.baseH = f.h;
      f.susp = 50;
      if (t && t.kind !== 'egg') this.say('やったか…？ ざまあみろ');
      return;
    }
    const dx = t.x - f.x, dz = t.z - f.z, d = Math.hypot(dx, dz);
    const seen = d < 16 && (d < 1.3 || (this.visibility(t) * (1 - (d / 16) * 0.5) > 0.14 && !this.plantsBetween(f.x, f.z, t.x, t.z)));
    if (seen) { f.lostT = 0; f.lastSeen = { x: t.x, y: t.y, z: t.z }; }
    else {
      f.lostT += dt;
      if (f.lostT > 3.2) {
        this.say(pick(['チッ、どこ行きやがった', '隠れやがったな…出てこい！', 'くそ、見失った']));
        this.startInvestigate(f.lastSeen, true);
        f.susp = 60;
        return;
      }
    }
    if (!f.lastSeen) f.lastSeen = { x: t.x, y: t.y, z: t.z };
    const L = f.lastSeen;
    const ld = Math.hypot(L.x - f.x, L.z - f.z);
    const underTable = t.y < 0.4 && tableAt(t.x, t.z, 0.1) >= 0;
    if (seen && d < 2.1 && f.whackCD <= 0 && !underTable) { this.startAct('whack', t.x, t.y, t.z); return; }
    if (seen && (t.kind === 'roach' || underTable) && d < 5.6 && (d > 1.2 || underTable) && f.sprayCD <= 0) { this.startAct('spray', t.x, t.y, t.z); return; }
    if (ld > 1.6) {
      f.repath -= dt;
      if (f.repath <= 0) { this.pathTo(L.x, L.z); f.repath = 0.5; }
      this.walk(dt, this.farmerSpeed('chase'));
    } else {
      f.h = dampAngle(f.h, Math.atan2(L.x - f.x, L.z - f.z), 8, dt);
    }
  }

  startAct(type, x, y, z) {
    const f = this.farmer;
    const spray = type === 'spray';
    const radius = spray ? 1.7 : 0.95;
    const marker = makeRing(spray ? 0xffd23c : 0xff3b30, radius * 0.86, radius, 0.7);
    marker.position.set(x, y + 0.04, z);
    this.root.add(marker);
    f.act = { type, t: 0, x, y, z, wind: spray ? 0.65 : 0.8, radius, marker, done: false };
    f.path = [];
    if (spray) { this.sfx.hissStart(); this.seen('spray'); if (rand() < 0.5) this.say(pick(['くらえ！', '死ねっ！'])); }
  }

  updateAct(dt) {
    const f = this.farmer, A = f.act;
    A.t += dt;
    f.h = dampAngle(f.h, Math.atan2(A.x - f.x, A.z - f.z), 10, dt);
    const k = Math.min(1, A.t / A.wind);
    A.marker.material.opacity = 0.35 + 0.5 * Math.abs(Math.sin(A.t * 14));
    A.marker.scale.setScalar(0.6 + 0.4 * k);
    if (!A.done && A.t >= A.wind) {
      A.done = true;
      if (A.type === 'spray') {
        this.spawnCloud(A.x, A.y, A.z);
        f.sprayCD = Math.max(1.6, 3.8 - 0.6 * f.anger);
        this.sfx.hiss();
      } else {
        this.impact(A);
        f.whackCD = 1.3;
      }
      this.root.remove(A.marker);
      disposeObject(A.marker);
    }
    if (A.t >= A.wind + 0.45) f.act = null;
  }

  impact(A) {
    this.sfx.thump();
    const dp = Math.hypot(this.player.x - A.x, this.player.z - A.z);
    this.shake = Math.max(this.shake, Math.max(0, 1 - dp / 8) * 0.8);
    for (const r of this.roaches) {
      if (!r.alive || r.st === 'fly') continue;
      if (Math.hypot(r.x - A.x, r.z - A.z) <= A.radius && Math.abs(r.y - A.y) < 0.7) {
        this.damage(r, r.isPlayer ? 75 : 999, 'whack');
      }
    }
    for (const e of this.eggs) {
      if (e.alive && Math.hypot(e.x - A.x, e.z - A.z) <= A.radius + 0.1 && Math.abs(e.y - A.y) < 0.7) {
        e.alive = false;
        this.root.remove(e.model);
        this.toast('卵がつぶされた…', 'bad');
      }
    }
  }

  // ---------------- 殺虫剤の霧 ----------------
  spawnCloud(x, y, z) {
    const m = makeCloud();
    m.group.position.set(x, y, z);
    this.root.add(m.group);
    this.clouds.push({ x, y, z, t: 0, life: 4.5, r: 1.7, model: m });
  }

  updateClouds(dt) {
    for (const c of this.clouds) {
      c.t += dt;
      const grow = Math.min(1, c.t / 0.35);
      const fade = c.t > c.life - 1 ? Math.max(0, c.life - c.t) : 1;
      c.model.mat.opacity = 0.28 * fade;
      for (const p of c.model.puffs) {
        const o = p.userData.off;
        p.position.set(o.x * grow * 1.6, o.y + c.t * 0.12, o.z * grow * 1.6);
        p.scale.setScalar(p.userData.s * (0.5 + grow) * (1 + c.t * 0.05));
      }
      if (c.t < c.life - 0.5) {
        for (const r of this.roaches) {
          if (!r.alive || r.st === 'fly') continue;
          if (Math.hypot(r.x - c.x, r.z - c.z) <= c.r && Math.abs(r.y - c.y) < 1.5) {
            this.damage(r, this.diff.sprayDmg * dt * (r.nymph ? 1.3 : 1), 'spray');
          }
        }
        for (const e of this.eggs) {
          if (!e.alive || Math.hypot(e.x - c.x, e.z - c.z) > c.r || Math.abs(e.y - c.y) > 1.5) continue;
          e.sprayT += dt;
          if (e.sprayT > 1.5) {
            e.alive = false;
            this.root.remove(e.model);
            this.toast('卵が殺虫剤でやられた…', 'bad');
          }
        }
      }
    }
    const keep = [];
    for (const c of this.clouds) {
      if (c.t >= c.life) { this.root.remove(c.model.group); disposeObject(c.model.group); }
      else keep.push(c);
    }
    this.clouds = keep;
  }

  // ---------------- わな ----------------
  updateTraps() {
    for (const r of this.roaches) {
      if (!r.alive || r.st !== 'move' || r.y > 0.1 || r.trapImmune > 0) continue;
      for (const t of this.traps) {
        if (Math.hypot(r.x - t.x, r.z - t.z) < 0.5) {
          r.st = 'stuck';
          r.trap = t;
          r.struggle = 0;
          r.stuckT = 0;
          r.eatingCrate = null;
          if (r.isPlayer) {
            this.sfx.stuck();
            this.stats.stuck++;
            this.seen('trap');
            this.toast('ホイホイにくっついた！ スペース（食べる）を連打して脱出！', 'bad');
            this.events.push('stuck');
          }
          break;
        }
      }
    }
  }

  updateCrates() {
    for (const c of this.crates) {
      if (c.rotten || c.shipped) continue;
      setCrateRot(c.model, Math.min(0.85, 1 - c.hp / 100));
    }
  }

  // ---------------- 見た目の更新 ----------------
  animateAll(dt) {
    const t = this.clock;
    for (const r of this.roaches) {
      const m = r.model;
      if (!r.alive) {
        r.deadT += dt;
        if (r.deadT > 4 && m.root.parent) m.root.parent.remove(m.root);
        continue;
      }
      m.root.position.set(r.x, r.y, r.z);
      m.root.rotation.y = r.h;
      const mv = r.st === 'stuck' ? 0.6 : r.moving ? 1 : 0;
      const ph = r.st === 'stuck' ? t * 30 : r.phase;
      // 遠くの仲間は脚と触角を描かない（数が多くても重くならないように）
      if (!r.isPlayer) {
        const far = this.player && Math.hypot(r.x - this.player.x, r.z - this.player.z) > 9;
        if (m.farLod !== far) {
          m.farLod = far;
          for (const L of m.legs) L.g.visible = !far;
          for (const A of m.antennae) A.g.visible = !far;
          for (const P of m.palps) P.visible = !far;
        }
        if (far) continue;
      } else if (m.farLod) {
        m.farLod = false;
        for (const L of m.legs) L.g.visible = true;
        for (const A of m.antennae) A.g.visible = true;
        for (const P of m.palps) P.visible = true;
      }
      animateRoach(m, ph, mv, t + r.id, !!(r.eatingCrate || r.eatingFruit));
      if (r.st === 'climb') {
        const c = r.climb;
        m.body.rotation.x = -1.25 * Math.sin(Math.PI * Math.min(1, c.t));
      }
      if (r.st === 'fall') m.body.rotation.x = 0.4;
      const air = r.st === 'fly' || r.st === 'glide';
      m.wings.visible = air;
      m.shadow.visible = !air && r.st !== 'fall';
      if (air) {
        m.wings.children.forEach((w) => { w.rotation.z = w.userData.s * (0.5 + Math.sin(t * 60) * 0.5); });
        m.body.rotation.x = r.st === 'fly' && r.fly && r.fly.phase === 1 ? -1.4 : -0.3;
      }
      if (r.st === 'stuck') m.body.rotation.z = Math.sin(t * 25) * 0.12;
      else if (r.poison > 0) m.body.rotation.z = Math.sin(t * 9) * 0.08;
      else m.body.rotation.z = 0;
    }
    if (this.player && this.marker) {
      const p = this.player;
      this.marker.visible = p.alive;
      this.marker.position.set(p.x, (p.st === 'fly' || p.st === 'glide' ? 0 : p.y) + 0.03, p.z);
      this.marker.scale.setScalar(1 + Math.sin(t * 4) * 0.06);
    }
    for (const c of this.crates) animateFlies(c.model, t + c.i);
    if (this.farmer) this.animFarmer(dt);
  }

  animFarmer(dt) {
    const f = this.farmer, m = f.model, t = this.clock;
    m.root.position.set(f.x, 0, f.z);
    m.root.rotation.y = f.h;
    f.walkPhase += f.moveSpeed * dt * 2.1;
    const sw = f.moveSpeed > 0.1 ? Math.sin(f.walkPhase) * 0.55 : 0;
    const [L, R] = m.legs;
    L.rotation.x = sw; R.rotation.x = -sw;
    const [aL, aR] = m.arms;
    aL.arm.rotation.set(-sw * 0.6, 0, -0.12);
    aR.arm.rotation.set(sw * 0.6, 0, 0.12);
    aL.fore.rotation.x = -0.25; aR.fore.rotation.x = -0.25;
    m.headG.rotation.set(0, f.lookOff, 0);
    m.root.position.y = f.moveSpeed > 0.1 ? Math.abs(Math.sin(f.walkPhase)) * 0.08 : 0;
    if (f.carry) {
      aL.arm.rotation.set(-1.25, 0, -0.25); aR.arm.rotation.set(-1.25, 0, 0.25);
      aL.fore.rotation.x = -0.35; aR.fore.rotation.x = -0.35;
    }
    if (f.state === 'WORK' && (f.phase === 'pack' || f.phase === 'placing')) {
      aL.arm.rotation.x = -0.9; aR.arm.rotation.x = -0.9;
      m.headG.rotation.x = 0.35;
    }
    if (f.state === 'WORK' && f.phase === 'tend') {
      aL.arm.rotation.x = -0.7 + Math.sin(t * 3) * 0.2;
      m.headG.rotation.x = 0.2;
    }
    const A = f.act;
    if (A) {
      const k = Math.min(1, A.t / A.wind);
      if (A.type === 'spray') {
        aR.arm.rotation.set(-1.45, 0, 0.1);
        aR.fore.rotation.x = -0.2;
        m.headG.rotation.x = 0.3;
      } else if (A.y > 1) {
        aR.arm.rotation.set(A.done ? -0.7 : lerp(-0.5, -2.8, k), 0, 0.15);
        m.headG.rotation.x = 0.35;
      } else {
        R.rotation.x = A.done ? 0 : lerp(0, -1.2, k);
        m.headG.rotation.x = 0.45;
      }
    }
    if (f.state === 'PANIC') {
      aL.arm.rotation.set(Math.sin(t * 19) * 0.8 - 1.5, 0, -1.4 - Math.sin(t * 23) * 0.6);
      aR.arm.rotation.set(Math.cos(t * 21) * 0.8 - 1.5, 0, 1.4 + Math.sin(t * 17) * 0.6);
      m.headG.rotation.y = Math.sin(t * 26) * 0.45;
      m.root.position.y = Math.abs(Math.sin(t * 12)) * 0.25;
      f.h += Math.sin(t * 3) * dt * 2;
    }
    const angry = f.state === 'CHASE' || f.anger >= 2;
    for (const e of m.eyes) {
      e.brow.rotation.z = angry ? -e.s * 0.4 : f.state === 'PANIC' ? e.s * 0.4 : 0;
      e.e.scale.y = f.state === 'PANIC' ? 0.12 : 0.08;
    }
    m.mouth.scale.set(f.state === 'PANIC' ? 0.8 : 1, f.state === 'PANIC' || f.state === 'CHASE' ? 3 : 1, 1);
    // 視界の扇形
    const c = f.cone;
    c.visible = f.state !== 'PANIC' && !this.night && !f.hidden;
    c.position.set(f.x, 0.04, f.z);
    c.rotation.y = f.h + f.lookOff;
    c.scale.setScalar(f.coneRange);
    const col = f.state === 'CHASE' ? 0xff3b30 : f.state === 'INVESTIGATE' || f.susp > 35 ? 0xffc83c : 0xffffff;
    c.material.color.setHex(col);
    c.material.opacity = f.state === 'CHASE' ? 0.16 : 0.1 + f.susp / 100 * 0.08;
  }

  // ---------------- 燻煙剤（農場主が本気で怒ったとき1回だけ） ----------------
  startFumigation() {
    const f = this.farmer;
    this.fumigated = true;
    f.state = 'FUMIGATE';
    f.fum = { phase: 'toCenter', t: 0, x: -7, z: -2.5 };
    f.path = [];
    this.pathTo(f.fum.x, f.fum.z);
    this.dropCarry('農場主がコンテナを置いた');
    this.say('もう許さん！ 燻煙剤たいて、全部いぶし出してやる！');
    this.sfx.siren();
    this.seen('fogger');
    this.toast('燻煙剤だ！ 緑の輪（出入り口・換気口）へ逃げろ！', 'bad');
    this.events.push('fumigate');
    for (const sp of SAFE_SPOTS) {
      const ring = makeRing(0x6dff7a, sp.r * 0.8, sp.r, 0.75);
      ring.position.set(sp.x, 0.05, sp.z);
      this.root.add(ring);
      this.safeRings.push(ring);
    }
  }

  farmerFumigate(dt) {
    const f = this.farmer, F = f.fum;
    F.t += dt;
    if (F.phase === 'toCenter') {
      if (this.walk(dt, this.farmerSpeed('chase')) || Math.hypot(F.x - f.x, F.z - f.z) < 1.2) { F.phase = 'placing'; F.t = 0; f.path = []; }
    } else if (F.phase === 'placing') {
      if (F.t > 1.4) {
        const can = makeFogger();
        can.position.set(f.x + Math.sin(f.h) * 1.2, 0, f.z + Math.cos(f.h) * 1.2);
        this.root.add(can);
        this.fog = { x: can.position.x, z: can.position.z, r: 0, t: 0, can, puffs: [], cleared: false, eggMsg: false };
        this.sfx.fogger();
        this.say('閉めきって30分だ。くたばれ、ゴキブリども');
        F.phase = 'leave';
        this.pathTo(DOOR.x, DOOR.z);
      }
    } else if (F.phase === 'leave') {
      if (this.walk(dt, this.farmerSpeed('chase'))) { F.phase = 'outside'; f.x = DOOR.x; f.z = DOOR.z; f.hidden = true; f.model.root.visible = false; }
    } else if (F.phase === 'outside') {
      f.moveSpeed = 0;
      if (this.fog && this.fog.cleared) {
        f.hidden = false;
        f.model.root.visible = true;
        f.state = 'WORK'; f.phase = 'choose'; f.anger = 2; f.susp = 0;
        const alive = this.player && this.player.alive;
        this.say(alive ? 'よし、全滅だろ…なんだと！？ まだいやがる！' : 'ふう、これで全滅だな');
        if (alive) { this.stats.smokeSurvived = 1; this.snap('smoke', '燻煙剤の煙から逃げきった！'); }
      }
    }
  }

  updateFog(dt) {
    const F = this.fog;
    if (!F || F.cleared) return;
    F.t += dt;
    const growing = F.t < 30;
    F.r = Math.min(34, F.t * 1.25);
    // 煙のかたまりを足していく
    if (growing && F.puffs.length < 70 && rand() < dt * 6) {
      const m = makeCloud();
      const a = rand() * Math.PI * 2, d = rand() * F.r;
      m.group.position.set(clamp(F.x + Math.cos(a) * d, -21, 21), 0, clamp(F.z + Math.sin(a) * d, -13, 13));
      m.group.scale.setScalar(2.2 + rand() * 1.5);
      m.mat.color.setHex(0xdcdcd4);
      this.root.add(m.group);
      F.puffs.push({ m, t: 0 });
    }
    const fade = F.t > 30 ? Math.max(0, 1 - (F.t - 30) / 8) : Math.min(1, F.t / 3);
    for (const p of F.puffs) {
      p.t += dt;
      p.m.mat.opacity = 0.22 * fade;
      for (const pf of p.m.puffs) {
        const o = pf.userData.off;
        pf.position.set(o.x * 1.6, o.y + Math.sin(p.t * 0.5) * 0.2, o.z * 1.6);
        pf.scale.setScalar(pf.userData.s * 1.4);
      }
    }
    this.fogLevel = fade;
    // 煙の中は体力が減る（逃げ場の輪の中は平気）
    if (growing) {
      for (const r of this.roaches) {
        if (!r.alive || r.st === 'fly' || r.st === 'glide') continue;
        if (Math.hypot(r.x - F.x, r.z - F.z) > F.r) continue;
        if (SAFE_SPOTS.some((sp) => Math.hypot(sp.x - r.x, sp.z - r.z) < sp.r)) continue;
        this.damage(r, 5.5 * dt * (r.nymph ? 1.3 : 1), 'smoke');
      }
      if (!F.eggMsg && this.eggs.some((e) => e.alive && Math.hypot(e.x - F.x, e.z - F.z) < F.r)) {
        F.eggMsg = true;
        this.toast('卵は殻が固くて煙に強い。卵は無事だ', 'info');
      }
    }
    if (F.t > 38) {
      F.cleared = true;
      this.fogLevel = 0;
      for (const p of F.puffs) { this.root.remove(p.m.group); disposeObject(p.m.group); }
      F.puffs = [];
      for (const ring of this.safeRings) { this.root.remove(ring); disposeObject(ring); }
      this.safeRings = [];
      this.toast('煙が晴れた！', 'good');
    }
  }

  // ---------------- ハウスのネコ（ステージ4以降） ----------------
  spawnCat() {
    const m = makeCat();
    this.root.add(m.root);
    this.cat = { x: -19.5, z: -12.5, h: 0, m, st: 'wander', t: 0, tx: -10, tz: -12.5, target: null, cd: 3, bellT: 0, phase: 0, speed: 0, pounce: null, marker: null, bored: 0, pesterT: 20 + rand() * 15 };
  }

  updateCat(dt) {
    const C = this.cat;
    if (!C) return;
    const f = this.farmer, m = C.m;
    m.root.visible = !this.fog || this.fog.cleared;
    if (!m.root.visible || this.calm) { m.root.position.set(C.x, 0, C.z); return; }
    C.t += dt; C.cd = Math.max(0, C.cd - dt); C.pesterT -= dt;
    let tx = C.tx, tz = C.tz, spd = 1.6;
    if (C.st === 'wander') {
      if (Math.hypot(C.tx - C.x, C.tz - C.z) < 0.6 || C.t > 9) {
        C.tx = randRange(-20, 20); C.tz = randRange(-12.5, 12.5); C.t = 0;
      }
      // 獲物（床の上のゴキブリ）をさがす
      if (C.cd <= 0) {
        let best = null, bd = 5;
        for (const r of this.roaches) {
          if (!r.alive || r.y > 0.3 || r.st === 'fly' || r.st === 'glide') continue;
          const d = Math.hypot(r.x - C.x, r.z - C.z);
          const ang = Math.abs(angleDiff(C.h, Math.atan2(r.x - C.x, r.z - C.z)));
          if (d < bd && ang < 0.9 && (this.hideFactor(r) > 0.5 || r.moving) && (r.isPlayer || rand() < 0.5)) { bd = d; best = r; }
        }
        if (best) { C.st = 'stalk'; C.target = best; C.t = 0; this.sfx.meow(); if (best.isPlayer) this.toast('ネコに見つかった！ 台や栽培槽の上へ！', 'bad'); }
      }
      // ときどき農場主の足にじゃれる
      if (C.pesterT <= 0 && f.state === 'WORK' && !f.hidden) { C.st = 'pester'; C.t = 0; C.pesterT = 25 + rand() * 20; }
    } else if (C.st === 'stalk') {
      const r = C.target;
      if (!r || !r.alive || r.y > 0.3 || C.t > 6) { C.st = 'wander'; C.cd = 6; C.target = null; }
      else {
        tx = r.x; tz = r.z; spd = 2.3;
        if (Math.hypot(r.x - C.x, r.z - C.z) < 1.7) {
          C.st = 'pounce'; C.t = 0;
          C.pounce = { x: r.x, z: r.z, sx: C.x, sz: C.z };
          C.marker = makeRing(0xff3b30, 0.45, 0.6, 0.75);
          C.marker.position.set(r.x, 0.04, r.z);
          this.root.add(C.marker);
          this.sfx.hiss2();
        }
      }
    } else if (C.st === 'pounce') {
      const P = C.pounce;
      spd = 0;
      tx = null;
      C.h = dampAngle(C.h, Math.atan2(P.x - C.x, P.z - C.z), 10, dt);
      if (C.t > 0.55 && !P.done) {
        // とびかかる
        const k = Math.min(1, (C.t - 0.55) / 0.25);
        C.x = lerp(P.sx, P.x, k); C.z = lerp(P.sz, P.z, k);
        if (k >= 1) {
          P.done = true;
          for (const r of this.roaches) {
            if (!r.alive || r.y > 0.3 || r.st === 'fly' || r.st === 'glide') continue;
            if (Math.hypot(r.x - P.x, r.z - P.z) < 0.5) {
              // 自分には大けが（でも一撃ではやられない）。仲間はひとたまりもない。物音で農場主も気づく
              if (r.isPlayer) { this.damage(r, Math.min(30, Math.max(0, r.hp - 8)), 'cat'); this.noise(r, 9, 35); this.toast('ネコにはたかれた！ 高い所へ逃げろ！', 'bad'); }
              else this.damage(r, 999, 'cat');
            }
          }
          this.sfx.thump();
        }
      }
      if (C.t > 1.1) {
        if (C.marker) { this.root.remove(C.marker); disposeObject(C.marker); C.marker = null; }
        C.st = 'wander'; C.cd = 10; C.target = null; C.t = 0;
      }
    } else if (C.st === 'pester') {
      tx = f.x + Math.sin(C.t * 2) * 0.9; tz = f.z + Math.cos(C.t * 2) * 0.9; spd = 2.4;
      if (Math.hypot(f.x - C.x, f.z - C.z) < 1.4 && !C.hit) {
        C.hit = true;
        f.catHold = 4;
        this.say(pick(['こら、ミケ！ 足にじゃれるな！', 'うおっ、ミケ！ 今いそがしいんだよ！']));
        this.sfx.meow();
      }
      if (C.t > 7) { C.st = 'wander'; C.hit = false; C.t = 0; }
    }
    if (tx !== null) {
      const dx = tx - C.x, dz = tz - C.z, d = Math.hypot(dx, dz);
      if (d > 0.05) {
        const st = Math.min(d, spd * dt);
        C.x = clamp(C.x + (dx / d) * st, BOUNDS.minX, BOUNDS.maxX);
        C.z = clamp(C.z + (dz / d) * st, BOUNDS.minZ, BOUNDS.maxZ);
        C.h = dampAngle(C.h, Math.atan2(dx, dz), 6, dt);
        C.speed = spd;
      } else C.speed = 0;
    } else C.speed = 0;
    // 見た目：歩き・しのび足・とびかかり・しっぽ・まばたき・耳
    C.phase += C.speed * dt * 3.2;
    m.root.position.set(C.x, 0, C.z);
    m.root.rotation.y = C.h;
    const walking = C.speed > 0.1;
    const crouch = C.st === 'stalk' ? 1 : (C.st === 'pounce' && C.t < 0.55 ? 1.4 : 0);
    C.crouch = (C.crouch || 0) + (crouch - (C.crouch || 0)) * Math.min(1, dt * 6);
    const cr = C.crouch;
    // 足の順番：左後ろ→左前→右後ろ→右前
    const offs = [0.5, 1.5, 0, 1];
    m.legs.forEach((L, i) => {
      const ph = C.phase + offs[i] * Math.PI;
      const sw = walking ? Math.sin(ph) * (0.45 - cr * 0.15) : 0;
      const lift = walking ? Math.max(0, Math.cos(ph)) : 0;
      const hind = L.userData.hind;
      const c1 = Math.min(1, cr);
      L.rotation.x = sw + (hind ? -0.25 - c1 * 0.6 : 0.1 + c1 * 0.65);
      L.userData.knee.rotation.x = hind ? 0.55 + c1 * 1.05 + lift * 0.4 : -0.15 - c1 * 1.35 - lift * 0.5;
      L.userData.paw.rotation.x = -(L.rotation.x + L.userData.knee.rotation.x);
    });
    const bob = walking ? Math.abs(Math.sin(C.phase)) * 0.015 : Math.sin(this.clock * 1.6) * 0.004;
    m.body.position.y = -Math.min(1, cr) * 0.17 + bob;
    m.body.rotation.x = C.st === 'pounce' && C.t >= 0.55 && C.t < 0.8 ? -0.25 : cr * 0.04;
    m.body.rotation.z = C.st === 'pounce' && C.t < 0.55 ? Math.sin(this.clock * 30) * 0.02 : 0; // おしりふりふり
    // 頭：獲物をじっと見る・ふだんはきょろきょろ
    let look = Math.sin(this.clock * 0.7) * 0.35;
    if (C.target && (C.st === 'stalk' || C.st === 'pounce')) look = clamp(angleDiff(C.h, Math.atan2(C.target.x - C.x, C.target.z - C.z)), -0.8, 0.8);
    m.neck.rotation.y += (look - m.neck.rotation.y) * Math.min(1, dt * 5);
    m.neck.rotation.x = cr * 0.25 + (walking ? Math.sin(C.phase * 2) * 0.03 : 0);
    // しっぽ：ふだんはゆらゆら、ねらうときは先だけピクピク
    const tw = C.st === 'stalk' ? 0.15 : 0.35;
    m.tail.rotation.x = -0.9 + cr * 0.75;
    m.tailSegs.forEach((S, k) => {
      S.rotation.z = Math.sin(this.clock * 2.2 - k * 0.55) * tw * (0.3 + k * 0.12);
      S.rotation.x = (C.st === 'stalk' ? -0.02 : 0.1) + (k > 5 && C.st === 'stalk' ? Math.sin(this.clock * 14) * 0.25 : 0);
    });
    // まばたき
    C.blinkT = (C.blinkT ?? 2) - dt;
    if (C.blinkT < 0) C.blinkT = 2 + rand() * 4;
    const closed = C.blinkT < 0.12 ? 1 : 0;
    for (const lid of m.lids) lid.rotation.x = -1.45 + closed * 1.2;
    // 耳：ときどきピクッ、ねらうときは前へ
    m.ears.forEach((E, i) => { E.rotation.x = -0.15 - cr * 0.25 + (Math.sin(this.clock * 0.9 + i * 2) > 0.97 ? 0.3 : 0); });
    // 鈴は歩くとゆれる
    m.bell.rotation.x = walking ? Math.sin(C.phase * 2) * 0.35 : 0;
    // 鈴の音（動くと鳴る）
    C.bellT -= dt;
    if (C.speed > 0.3 && C.bellT <= 0 && this.player) {
      C.bellT = 0.55;
      const dp = Math.hypot(C.x - this.player.x, C.z - this.player.z);
      this.sfx.bell(Math.max(0, 1 - dp / 16) * 0.6, this.panOf(C.x, C.z));
      if (dp < 16) this.soundPings.push({ x: C.x, z: C.z, v: Math.max(0.3, 1 - dp / 16), kind: 'bell' });
      this.events.push('bell');
    }
  }

  // ---------------- JAの検品（ステージ3〜5で1回） ----------------
  updateInspector(dt) {
    if (!this.diff.inspect || this.inspectDone || this.calm) return;
    const I = this.inspector;
    if (!I) {
      if ((this.shipped >= 3 || this.elapsed > 160) && (!this.fog || this.fog.cleared) && this.farmer.state !== 'FUMIGATE') {
        this.inspector = { st: 'coming', t: 0 };
        this.toast('JAの検品員が来る！ 10秒後、台のまわりをまわる。近づくな！', 'warn');
        this.sfx.chime();
        this.say('おっ、JAさんが来るな。ちゃんとしとかねえと');
        this.events.push('inspect');
      }
      return;
    }
    I.t += dt;
    if (I.st === 'coming') {
      if (I.t < 10) return;
      const m = makeInspector();
      this.root.add(m.root);
      Object.assign(I, { st: 'walk', m, x: DOOR.x, z: DOOR.z, h: -Math.PI / 2, stops: [[13, 8.7], [13, 3.4], [13, -4.4], [13, -10.6], [DOOR.x, DOOR.z]], si: 0, path: [], pi: 0, wait: 0, phase: 0, spotted: false, speech: 'JAです、検品にまいりました', speechT: 3 });
      I.path = this.grid.find(I.x, I.z, I.stops[0][0], I.stops[0][1]);
      return;
    }
    I.speechT -= dt;
    let moving = false;
    if (I.st === 'walk') {
      const p = I.path[I.pi];
      if (!p) {
        I.st = 'look'; I.wait = 4.5; I.baseH = I.h;
      } else {
        const dx = p.x - I.x, dz = p.z - I.z, d = Math.hypot(dx, dz);
        if (d < 0.2) I.pi++;
        else { const st = Math.min(d, 2.2 * dt); I.x += dx / d * st; I.z += dz / d * st; I.h = dampAngle(I.h, Math.atan2(dx, dz), 6, dt); moving = true; }
      }
    } else if (I.st === 'look') {
      I.wait -= dt;
      I.h = I.baseH + Math.sin(I.t * 1.4) * 1.3;
      if (I.wait <= 0) {
        I.si++;
        if (I.si >= I.stops.length) {
          this.root.remove(I.m.root); disposeObject(I.m.root);
          this.inspector = null; this.inspectDone = true;
          this.toast('JAの検品が終わった', 'info');
          return;
        }
        if (I.si === I.stops.length - 1) { I.speech = 'はい、問題…なさそうですね'; I.speechT = 2.5; }
        I.st = 'walk'; I.pi = 0;
        I.path = this.grid.find(I.x, I.z, I.stops[I.si][0], I.stops[I.si][1]);
      }
    }
    // 見る：見つかると農場主を呼ぶ
    if (!I.spotted) {
      for (const r of this.roaches) {
        if (!r.alive || r.st === 'fly' || r.st === 'glide') continue;
        const dx = r.x - I.x, dz = r.z - I.z, d = Math.hypot(dx, dz);
        if (d > 6) continue;
        const dot = (dx * Math.sin(I.h) + dz * Math.cos(I.h)) / (d || 1);
        if (dot < 0.6) continue;
        if (this.visibility(r) * (1 - d / 9) > 0.25) {
          I.spotted = true;
          I.speech = 'ちょっと！ ゴキブリいますよ！'; I.speechT = 3;
          this.farmer.anger = Math.min(3, this.farmer.anger + 1);
          if (this.farmer.state !== 'FUMIGATE' && this.farmer.state !== 'PANIC') this.startChase(r);
          this.say('なにっ！？ JAさんの前でかよ！');
          this.toast('検品員に見つかった！ 農場主が飛んでくる！', 'bad');
          break;
        }
      }
    }
    I.phase += moving ? dt * 4.5 : 0;
    const sw = moving ? Math.sin(I.phase) * 0.5 : 0;
    I.m.legs[0].rotation.x = sw; I.m.legs[1].rotation.x = -sw;
    I.m.root.position.set(I.x, 0, I.z);
    I.m.root.rotation.y = I.h;
  }

  // ---------------- 燻煙剤のとき、いちばん近い逃げ場への緑の線 ----------------
  updateSafeLine() {
    const on = this.safeRings.length > 0 && this.player && this.player.alive;
    if (!on) {
      if (this.safeLine) { this.root.remove(this.safeLine); disposeObject(this.safeLine); this.safeLine = null; }
      return;
    }
    const p = this.player, sp = this.nearestSafe(p);
    if (!this.safeLine) {
      const geo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
      const mat = new THREE.LineDashedMaterial({ color: 0x6dff7a, dashSize: 0.5, gapSize: 0.3, depthTest: false, transparent: true, toneMapped: false });
      this.safeLine = new THREE.Line(geo, mat);
      this.safeLine.renderOrder = 20;
      this.safeLine.frustumCulled = false;
      this.safeLine.userData.ownMaterial = true;
      this.safeLine.userData.ownGeometry = true;
      this.root.add(this.safeLine);
    }
    const pos = this.safeLine.geometry.attributes.position;
    pos.setXYZ(0, p.x, p.y + 0.3, p.z);
    pos.setXYZ(1, sp.x, 0.3, sp.z);
    pos.needsUpdate = true;
    this.safeLine.computeLineDistances();
    this.safeLine.material.opacity = 0.6 + 0.4 * Math.sin(this.clock * 6);
  }

  // ---------------- 練習（はじめての人だけ） ----------------
  updateTutorial(dt) {
    const T = this.tutorial, p = this.player;
    if (!T || !p) return;
    T.t += dt;
    const next = () => { T.step++; T.t = 0; this.sfx.nice(); };
    switch (T.step) {
      case 0: if (Math.hypot(p.x - T.sx, p.z - T.sz) > 2.5) next(); break;
      case 1: if (Math.abs(angleDiff(this.camYaw, T.yaw)) > 0.7) next(); break;
      case 2: if (this.stats.ate >= 12) next(); break;
      case 3: if (this.stats.nice >= 1 || T.t > 25) next(); break;
      case 4:
        if (p.y < 0.4 && rowAt(p.x, p.z, 0)) T.hideT += dt; else T.hideT = 0;
        if (T.hideT > 1.2) next();
        break;
      default: this.endTutorial(true);
    }
  }

  endTutorial(done) {
    if (!this.tutorial) return;
    this.tutorial = null;
    this.calm = false;
    this.farmer.timer = 3;
    this.farmer.phase = 'idle';
    this.say('さて、出荷するか。……ん？ なんか気配がするな');
    this.toast(done ? '練習おわり！ ここからが本番だ。農場主が動き出した' : '練習をとばした。農場主が動き出した', 'good');
    this.events.push('tutorialDone');
  }

  tutorialText(touch) {
    const T = this.tutorial;
    if (!T) return null;
    const L = [
      touch ? '練習 1/5　左下を指でなぞって歩いてみよう' : '練習 1/5　W A S D（矢印キー）で歩いてみよう',
      touch ? '練習 2/5　画面の右側をなぞって、まわりを見てみよう' : '練習 2/5　マウスでドラッグ（または Q・E）して、まわりを見てみよう',
      touch ? '練習 3/5　緑の矢印のコンテナまで行き、「食べる」を長押し' : '練習 3/5　緑の矢印のコンテナまで行き、スペースを長押しして食べよう',
      '練習 4/5　がっつきゲージが緑の帯のときに離すと「ナイス！」。やってみよう',
      '練習 5/5　白い栽培槽の下にもぐって、じっと隠れてみよう',
    ];
    return L[Math.min(T.step, L.length - 1)];
  }

  // 画面に出す案内の矢印の行き先
  guideTarget() {
    const T = this.tutorial, p = this.player;
    if (!T || !p) return null;
    if (T.step === 2 || T.step === 3) {
      let best = null, bd = Infinity;
      for (const c of this.crates) {
        if (c.rotten || c.shipped || c.carried || c.table >= 0) continue;
        const d = Math.hypot(c.x - p.x, c.z - p.z);
        if (d < bd) { bd = d; best = c; }
      }
      return best ? { x: best.x, y: 1.2, z: best.z } : null;
    }
    if (T.step === 4) {
      const r = ROWS.reduce((a, b) => (Math.abs(b.z - p.z) < Math.abs(a.z - p.z) ? b : a));
      return { x: clamp(p.x, r.minX + 1, r.maxX - 1), y: 1.0, z: r.z };
    }
    return null;
  }

  // ---------------- 勝ち負け ----------------
  // 時間制限はなし。目標の箱数をダメにしたら勝ち、出荷されすぎたら負け
  checkEnd() {
    if (this.state !== 'play' || this.tutorial) return;
    if (this.ruined >= this.diff.target) { this.endGame(true, 'ruined'); return; }
    const avail = this.crates.filter((c) => !c.rotten && !c.shipped).length;
    if (this.ruined + avail < this.diff.target) this.endGame(false, 'shipped');
  }

  shipLeft() { return Math.max(0, this.shipLimit - this.shipped); }

  endGame(win, reason) {
    if (this.state !== 'play') return;
    this.state = 'over';
    const alive = this.nymphs.length;
    const fast = Math.max(0, 420 - this.elapsed) * 3;
    const score = Math.round(this.ruined * 1000 + this.shipLeft() * 200 + alive * 150 - this.stats.deaths * 200 + (win ? fast : 0));
    let rank = 'D';
    if (win) rank = this.stats.shipped <= 2 ? 'S' : this.stats.shipped <= 4 ? 'A' : 'B';
    else if (this.ruined >= Math.ceil(this.diff.target / 2)) rank = 'C';
    this.result = {
      win, reason, score: Math.max(0, score), rank, alive, elapsed: this.elapsed, diff: this.diff.key,
      stats: { ...this.stats, ruinedColor: [...this.stats.ruinedColor], seen: [...this.stats.seen] },
      grumble: this.grumble(win, reason),
      advice: this.advice(win, reason),
      highlights: this.highlights,
    };
    if (win) { this.sfx.win(); this.say('ふざけんな！ 今日の出荷どうしてくれんだ！'); }
    else { this.sfx.lose(); this.say(reason === 'dead' ? 'ざまあみろ！ 二度と来んな！' : '見たか虫けら！ 全部出荷してやったぞ！'); }
    this.ui.gameOver(this.result);
  }

  // 負けたときの「次はこうしてみよう」（記録された理由だけを使う）
  advice(win, reason) {
    const s = this.stats;
    if (win) {
      if (s.shipped > 3) return '星を集めるなら：出荷を3箱以内におさえよう。運んでいる農場主に突撃すると、コンテナを落とす';
      if (s.chased > 2) return '星を集めるなら：見つかる回数を2回以内に。栽培槽の下を通って近づこう';
      return '';
    }
    if (reason === 'dead') {
      return {
        spray: '黄色い輪は殺虫剤の予告。輪が出たらすぐ横へ逃げよう。霧はしばらく残る',
        whack: '赤い輪は踏みつけ・叩きの予告。輪の外へ走ろう。台の下なら踏まれない',
        trap: 'ホイホイは地図の×印。くっついたら食べるボタンを連打して抜け出そう',
        poison: '毒エサは体力が多いときだけ食べよう。毒の間は隠れて待つ',
        smoke: '燻煙剤のサイレンが鳴ったら、すぐ緑の輪（出入り口・換気口）へ。緑の線をたどろう',
        cat: 'ネコは台や栽培槽の上には来ない。鈴の音が近づいたら高い所へ',
      }[this.lastDeathCause] || '見つかったら、栽培槽の下や台の下でじっとしよう。仲間がいれば乗りかわれる';
    }
    if (s.attacks === 0) return '出荷が早かった。農場主の足もとで「突撃」すると、運んでいるコンテナを落とさせて時間をかせげる';
    if (s.born < 3) return '仲間をふやそう。栄養が満タンになったらすぐ産卵し、「探索」で同時に何箱もかじらせる';
    return '「囮」の仲間で農場主を引きつけ、そのすきに台の上のコンテナを一気にかじろう';
  }

  // 結果画面の農場主のぼやき（強めの口調）
  grumble(win, reason) {
    const s = this.stats, L = [];
    if (win) {
      L.push(pick([
        'ふざけんな！ 今日の出荷どうしてくれんだ！ JAになんて言やいいんだよ！',
        'ちくしょう…一年かけて育てたパプリカだぞ。虫けらにパーにされてたまるか！',
        'また単価下がったってのに、この上ゴキブリかよ！ やってらんねえ！',
      ]));
    } else if (reason === 'dead') {
      L.push(pick(['ざまあみろ！ ゴキブリなんざ、こうだ！', '見たか！ うちのハウスで好き勝手はさせねえ！']));
    } else {
      L.push(pick(['見たか虫けら！ 全部出荷してやったぞ！ 二度と来んじゃねえ！', 'へっ、今日も出荷完了だ。ゴキブリごときに負けるかよ']));
    }
    if (s.attacks >= 1) L.push('顔に飛んでくるとか反則だろうが！ 心臓止まるかと思ったぞ！');
    if (s.fruits >= 1) L.push('株になってるやつまで落としやがって…あれはまだ育ててたんだぞ！');
    if (this.traps.length >= 6) L.push('ホイホイ代だってタダじゃねえんだぞ、ちくしょう！');
    if (s.baits >= 1) L.push('毒エサ食っといてまだ動いてんのか…しぶとすぎんだろ！');
    if (s.smokeSurvived) L.push('燻煙剤までたいたのに生き残りやがった…どうなってんだ！');
    return L.slice(0, 3);
  }

  // カメラ用の情報
  camInfo() {
    const p = this.player;
    if (!p) return null;
    const under = p.y < 0.4 && p.st !== 'fly' && p.st !== 'glide';
    return {
      x: p.x, y: p.y, z: p.z,
      underTable: under && tableAt(p.x, p.z, 0.6) >= 0,
      underRow: under && !!rowAt(p.x, p.z, 0.5),
      onTrough: this.onTrough(p) && p.st === 'move',
      flying: p.st === 'fly' || p.st === 'glide',
    };
  }

  // 画面の文字表示用
  context() {
    const p = this.player;
    if (!p || !p.alive || this.state !== 'play') return null;
    if (p.st === 'stuck') return { key: 'action', text: '連打で脱出！', urgent: true, struggle: p.struggle };
    if (p.st !== 'move') return null;
    const stuckMate = this.roaches.find((r) => r.alive && r !== p && r.st === 'stuck' && Math.hypot(r.x - p.x, r.z - p.z) < 1.3);
    if (stuckMate) return { key: 'action', text: '仲間を助ける' };
    const c = this.crateInReach(p);
    if (c) return { key: 'action', text: '長押しで食べる', hold: true, crate: c };
    const f = this.fruitInReach(p);
    if (f) return { key: 'action', text: '長押しで実を食べる', hold: true, fruit: f };
    const b = this.baitInReach(p);
    if (b) return { key: 'action', text: '毒エサ（長押しで食べる・毒あり）', hold: true, bait: b, warn: true };
    if (this.windLaneAt(p)) return { key: 'action', text: '風に乗る' };
    if (this.canClimb(p)) return { key: 'action', text: '登る' };
    return null;
  }

  canAttackNow() {
    const p = this.player, f = this.farmer;
    if (!p || p.st !== 'move' || this.attackCD > 0 || f.state === 'PANIC') return false;
    return Math.hypot(f.x - p.x, f.z - p.z) <= ATTACK_RANGE;
  }

  modeLabel() { return MODES[this.mode]; }

  // テスト・確認用（NaN などの異常を見つける）
  sanity() {
    const bad = [];
    const num = (v, n) => { if (!Number.isFinite(v)) bad.push(n); };
    for (const r of this.roaches) { num(r.x, 'r.x'); num(r.y, 'r.y'); num(r.z, 'r.z'); num(r.h, 'r.h'); num(r.hp, 'r.hp'); }
    const f = this.farmer;
    if (f) { num(f.x, 'f.x'); num(f.z, 'f.z'); num(f.h, 'f.h'); num(f.susp, 'f.susp'); }
    for (const c of this.crates) num(c.hp, 'c.hp');
    if (f && !f.hidden && (f.x < -22 || f.x > 22 || f.z < -14 || f.z > 14)) bad.push('farmer out of house');
    for (const r of this.roaches) if (r.alive && (r.x < -22 || r.x > 22 || r.z < -14 || r.z > 14)) bad.push('roach out');
    return bad;
  }
}

export { angleDiff };
