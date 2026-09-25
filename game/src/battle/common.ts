// Shared battle mechanics used by party and enemy actions: damage and
// healing presentation, statuses and buffs, kire, and the もとにもどる defeat.

import type { Co } from '../engine/co';
import type { Gfx } from '../engine/gfx';
import { all } from '../engine/co';
import { charIds, charSprite } from '../art/chars';
import { flag, setFlag } from '../game/state';
import { ease } from '../engine/tween';
import { rng } from '../engine/rng';
import { fillAll, SYS, SYS2, TUT } from '../data/battle';
import type { BattleScene } from './scene';
import { blankStages, STAT_NAME, type EnemyUnit, type PartyUnit, type Stages } from './model';
import { ovalStamp } from './art/stamps';
import { PixelCanvas } from '../engine/pixel';
import { impactBurst, statArrow } from './art/fxart';
import { PANEL_POS } from './ui/panels';
import { statusIcon } from './art/icons';

const FRAME_MS = 1000 / 60;

// ---- kire ------------------------------------------------------------------------

export function addKire(s: BattleScene, n: number): void {
  if (!s.kanenariJoined || n <= 0) return;
  const before = s.kire;
  s.kire = Math.min(3, s.kire + n);
  const full = s.kire >= 3 && before < 3;
  for (let i = before; i < s.kire; i++) {
    const idx = i;
    const delay = (i - before) * 80;
    s.addFx({
      layer: 'top',
      dur: delay + 1,
      ui: true,
      draw: () => {},
      update() {
        if (this.t >= delay) {
          s.kirePops[idx] = 100;
          // the third "!" is answered by the full chord itself (QA round 2:
          // the chord used to fire at t0, before the staggered pops, and
          // the level-3 pop muddied it)
          if (idx === 2 && full) s.sfx('se_kire_full');
          else s.sfx('se_kire_up', { level: idx + 1 });
          this.done = true;
        }
      },
    });
  }
  if (s.kire !== before) {
    s.bg.kire = s.kire;
    s.setMusicParam('kire', s.kire);
  }
  if (full) s.memo.kireJustFull = 1;
}

/**
 * 〔キレ満タン・初回のみ〕: the first time kire reaches 3 the band says so and
 * the kire sticky appears (flag_tut_kire). Returns the pages to show.
 */
export function kireFullPages(s: BattleScene): string[] {
  if (!s.memo.kireJustFull) return [];
  s.memo.kireJustFull = 0;
  if (flag('flag_tut_kire')) return [];
  setFlag('flag_tut_kire', 1);
  s.memo.stk_kire = 1;
  s.sticky = { text: TUT.kire, t: 0, ttl: 3600 };
  return [...SYS.kireFull];
}

export function resetKire(s: BattleScene): void {
  s.kire = 0;
  s.memo.noriTabShown = 0;
  s.bg.kire = 0;
  s.setMusicParam('kire', 0);
}

// ---- party damage / heal -----------------------------------------------------------

export type Guarded = 'ok' | 'just' | null;

export interface PartyHitOpts {
  tsukkomi?: Guarded;
  /** Suppress the number (status-only moves). */
  silent?: boolean;
  /** Stagger for multi-hit numbers. */
  stack?: number;
  scatter?: boolean;
}

/** Apply damage to a party member with the 16.7 / 16.6 feel. Returns true if they fell. */
export function hurtParty(s: BattleScene, u: PartyUnit, dmg: number, o: PartyHitOpts = {}): boolean {
  if (!u.alive) return false;
  dmg = Math.max(0, Math.round(dmg));
  const before = u.m.hp;
  u.m.hp = Math.max(0, u.m.hp - dmg);
  u.trailWait = 400;
  u.hpTrail = Math.max(u.hpTrail, before);
  if (!o.silent && dmg > 0) {
    // pops from the panel's top edge over the photo and rests above the tape
    // row; multi-hits line up along the panel instead of piling up
    const [nx, ny] = partyNumberXY(u);
    s.number(nx, ny + (o.scatter ? -rng.int(0, 3) : 0), dmg, { rise: PARTY_RISE, drift: PARTY_DRIFT }, 'party', u);
  }
  if (dmg > 0) panelImpact(s, u, !!o.tsukkomi);
  if (u.has('status_nemuri') && dmg > 0) {
    delete u.m.status.status_nemuri;
    s.memo['woke_' + u.id] = 1;
  }
  const fell = u.m.hp <= 0 && before > 0;
  if (!o.tsukkomi) {
    s.hitstop(fell ? 8 : 4);
    const big = dmg >= u.m.maxHp * 0.3;
    s.shake(0, big ? 5 : 3, 10);
    if (big) s.flash('#E23B2E', 0.12, 2);
    u.shakeT = 167;
    u.shakeAmp = 3;
    u.flashT = 267;
    s.mood(u, 'hurt', 600);
    // panned to the panel; a party-wide hit staggers the second thud (scene.sfx)
    s.sfx('se_damage', { pan: u.id === 'kanenari' ? 0.35 : -0.2 });
  }
  if (fell) {
    u.m.status = {};
    u.m.status.status_hebatta = 1;
    u.stages = blankStages();
    u.drop = 3;
    s.sfx('se_ko');
    if (!s.fallen.includes(u)) s.fallen.push(u);
  }
  return fell;
}

/**
 * 10〔へばった〕: once the action that knocked them down has played out, one
 * page names who fell (both on one page when a party-wide hit took both).
 * Members already back on their feet (a heal in the same action) are left out.
 */
export function* sayFallen(s: BattleScene): Co {
  const list = s.fallen.filter((u) => !u.alive);
  s.fallen = [];
  if (!list.length) return;
  const names = list.map((u) => u.name).join('と ');
  yield* s.say(fillAll(SYS.hebatta, { target: names }));
}

/** Tsukkomi success hit feel (16.6) — call once per resolved hit. */
export function tsukkomiFeel(s: BattleScene, u: PartyUnit | null, just: boolean): void {
  s.hitstop(just ? 8 : 6);
  s.shake(just ? 4 : 3, 0, just ? 10 : 8);
  s.flash('#FFFFFF', just ? 0.15 : 0.08, 1);
  s.sfx('se_bishi');
  // the glint rings out just after the slap, not on top of it
  if (just) s.sfxLater('se_kiran', undefined, 70);
  if (u) s.mood(u, 'tsukkomi', 700);
}

/** Rise of a party number (16.4: 12px over the panels). */
export const PARTY_RISE = 12;
/** Party numbers drift left as they rise, away from the tsukkomi "!" over the photo. */
const PARTY_DRIFT = -4;

/**
 * Party number origin (15.9, moved): the top edge of the panel right over the
 * photo — the face that took the hit. It rises 12px and rests with its
 * bottom on y141, above the tape row, so a name tag is never covered.
 */
export function partyNumberXY(u: PartyUnit): [number, number] {
  const [px, py] = PANEL_POS[u.id];
  return [px + 12 - PARTY_DRIFT, py + 3];
}

/**
 * Impact on a panel (16.7): a 12px burst over the photo that flashes white →
 * vermilion (3f), and four paper scraps. A tsukkomi'd hit only gets a small
 * white flick.
 */
export function panelImpact(s: BattleScene, u: PartyUnit, soft = false): void {
  const [px, py] = PANEL_POS[u.id];
  const x = px + 20;
  const y = py + 20;
  s.addFx({
    layer: 'top',
    dur: soft ? 2 * FRAME_MS : 4 * FRAME_MS,
    ui: true,
    draw: (g, t) => {
      const f = Math.min(3, Math.floor(t / FRAME_MS));
      const img = impactBurst(soft ? 0 : f);
      g.img(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
    },
  });
  if (!soft) s.paper(x, y - 6, 4, [50, 110]);
}

export function healParty(s: BattleScene, u: PartyUnit, amount: number, o: { mp?: boolean; stack?: number } = {}): number {
  const [nx, ny] = partyNumberXY(u);
  if (o.mp) {
    if (u.m.maxMp <= 0) return 0;
    const before = u.m.mp;
    u.m.mp = Math.min(u.m.maxMp, u.m.mp + Math.round(amount));
    const n = u.m.mp - before;
    s.number(nx, ny, n, { kind: 'mp', rise: PARTY_RISE, drift: PARTY_DRIFT }, 'party', u);
    return n;
  }
  const wasDown = !u.alive;
  const before = u.m.hp;
  u.m.hp = Math.min(u.m.maxHp, u.m.hp + Math.max(0, Math.round(amount)));
  const n = u.m.hp - before;
  if (n > 0) {
    u.hpGrowT = 300;
    u.hpTrail = u.m.hp;
  }
  if (wasDown && u.m.hp > 0) {
    delete u.m.status.status_hebatta;
    u.drop = 0;
    s.memo['revived_' + u.id] = 1;
  }
  s.number(nx, ny, n, { kind: 'heal', rise: PARTY_RISE, drift: PARTY_DRIFT }, 'party', u);
  // a full bar only glints (the number() above plays it); a real heal chimes
  if (n > 0) s.sfx('se_heal');
  return n;
}

// ---- statuses & buffs --------------------------------------------------------------

const STATUS_TEXT: Record<string, { on: keyof typeof SYS; act: keyof typeof SYS; off: keyof typeof SYS }> = {
  status_konran: { on: 'konranOn', act: 'konranAct', off: 'konranOff' },
  status_nemuri: { on: 'nemuriOn', act: 'nemuriAct', off: 'nemuriOff' },
  status_tsukamare: { on: 'tsukamareOn', act: 'tsukamareAct', off: 'tsukamareOff' },
  status_toosenbo: { on: 'toosenboOn', act: 'toosenboAct', off: 'toosenboOff' },
};

export function statusText(id: string, kind: 'on' | 'act' | 'off', target: string): string[] {
  if (id === 'status_henji') {
    // 50 6.7: the one who answers decides the line (Minato says it, Kanenari-kun writes it)
    if (kind === 'on') return [...(target === 'カネナリくん' ? SYS2.henjiOnKanenari : SYS2.henjiOnMinato)];
    return fillAll(kind === 'act' ? SYS2.henjiAct : SYS2.henjiOff, { target });
  }
  const k = STATUS_TEXT[id];
  if (!k) return [];
  return fillAll(SYS[k[kind]], { target });
}

/** Put a status on a party member with the stamp-on-panel pop. */
export function giveStatus(s: BattleScene, u: PartyUnit, id: string, turns: number): void {
  u.m.status[id] = turns;
  u.statusPop.push({ id, t: 200 });
  s.sfx('se_status');
  if (id === 'status_konran') u.wobbleT = 300;
  if (id === 'status_konran' || id === 'status_nemuri') {
    // cancel the member's pending action this round if it hasn't happened yet
    s.memo['disabled_' + u.id] = 1;
  }
}

export function cureStatus(s: BattleScene, u: PartyUnit, id: string): void {
  if (!u.m.status[id]) return;
  delete u.m.status[id];
  const [px, py] = PANEL_POS[u.id];
  s.stars(px + 10, py + 44, 2, [30, 60]);
  s.sfx('se_heal');
}

/** Change a stat stage on a party unit or enemy with rising/falling arrows. */
export function changeStage(s: BattleScene, who: PartyUnit | EnemyUnit, stat: keyof Stages, delta: number, turns: number, silentText = false): string[] {
  // (spd stays within −2..+2 like atk/def; 命中 only goes down)
  const st = who.stages[stat];
  const lo = stat === 'hit' ? -1 : -2;
  const hi = stat === 'hit' ? 0 : 2;
  const before = st.lv;
  st.lv = Math.max(lo, Math.min(hi, st.lv + delta));
  st.turns = turns;
  const up = delta > 0;
  arrows(s, who, up);
  s.sfx(up ? 'se_buff_up' : 'se_buff_down');
  if (silentText) return [];
  const target = who.kind === 'party' ? who.name : who.name;
  if (st.lv === before) return fillAll(up ? SYS.statUp : SYS.statDown, { target, stat: STAT_NAME[stat] });
  if (up && delta >= 2) return fillAll(SYS.statUpBig, { target, stat: STAT_NAME[stat] });
  return fillAll(up ? SYS.statUp : SYS.statDown, { target, stat: STAT_NAME[stat] });
}

export function arrows(s: BattleScene, who: PartyUnit | EnemyUnit, up: boolean): void {
  let x: number;
  let y: number;
  if (who.kind === 'party') {
    const [px, py] = PANEL_POS[who.id];
    x = px + 70;
    y = py + 4;
  } else {
    x = who.x;
    y = who.coreY;
  }
  const img = statArrow(up);
  for (let i = 0; i < 3; i++) {
    const ox = (i - 1) * 9;
    const delay = i * 60;
    s.addFx({
      layer: 'top',
      dur: 400 + delay,
      ui: true,
      draw: (g, t) => {
        if (t < delay) return;
        const p = (t - delay) / 400;
        const dy = up ? -12 * ease.quadOut(p) : 12 * ease.quadIn(p);
        g.alpha(p > 0.7 ? (1 - p) / 0.3 : 1, () => g.img(img, x + ox - 2, y + dy - 4));
      },
    });
  }
}

/** Status icon stamped onto the panel (1.4 → 1.0). */
export function statusStampFx(s: BattleScene, u: PartyUnit, id: string): void {
  const ic = statusIcon(id);
  if (!ic) return;
  u.statusPop.push({ id, t: 200 });
}

// ---- enemy damage & defeat ----------------------------------------------------------

export interface EnemyHitOpts {
  /** Number style. */
  big?: boolean;
  crit?: boolean;
  zero?: boolean;
  /** Offset for stacked multi-hit numbers. */
  stack?: number;
  /** Skip the normal HP bar trail (event battles). */
  noNumber?: boolean;
  /** Where the number pops, when not from the core (a broken boss part). */
  at?: [number, number];
}

/** Enemies patterned like the digits themselves: their numbers sit on an opaque plate. */
const PLATE_ENEMIES = new Set(['enemy_ojigi_jihanki']);

/** Subtract HP and pop a number above the enemy. Returns true if it reached 0. */
export function hurtEnemy(s: BattleScene, e: EnemyUnit, dmg: number, o: EnemyHitOpts = {}): boolean {
  // the 160×128 boss always takes the big digits: a small number on a body
  // that size says the hit was small (QA round 1)
  if (e.def.boss) o = { ...o, big: true };
  const [x, y] = s.enemyNumberXY(e, !!(o.big || o.crit));
  if (o.zero) {
    s.number(x, y, 0, { kind: 'zero', backing: true, plate: PLATE_ENEMIES.has(e.id) }, 'enemy', e);
    return false;
  }
  if (e.def.invulnerable) return false;
  const before = e.hp;
  e.hp = Math.max(0, e.hp - Math.max(0, Math.round(dmg)));
  // boss HP floor before the final phase (13.7)
  if (e.def.boss && !s.memo.bossFinal && e.hp < 1) e.hp = 1;
  e.trailWait = 400;
  e.hpTrail = Math.max(e.hpTrail, before);
  if (!o.noNumber) {
    const [nx, ny] = o.at ?? [x, y];
    // the second hit of a 2段 strike is the inverted colour; a busy enemy
    // (the vending machine's red-and-cream can rows) gets an opaque plate
    const kind = o.crit ? 'crit' : (o.stack ?? 0) > 0 ? 'dmg2' : 'dmg';
    s.number(nx, ny, Math.max(0, Math.round(dmg)), { kind, big: o.big || o.crit, backing: true, plate: PLATE_ENEMIES.has(e.id) }, 'enemy', e);
  }
  if (e.status.bokemake) s.memo.bokeHit = 1;
  if (dmg > 0 && e.hp > 0) enemyHurt(s, e, before);
  return e.hp <= 0;
}

/**
 * The 被弾 state (11.x "被弾"): the hurt frame for ~220ms plus each enemy's
 * own debris — feathers, a spring, sparks, glass cracks.
 */
export function enemyHurt(s: BattleScene, e: EnemyUnit, hpBefore: number): void {
  if (e.dying) return;
  const keep = e.pose;
  if (keep !== 'hurt') e.hurtReturn = keep === 'windup' || keep === 'attack' ? 'idle' : keep;
  e.setPose('hurt', e.skill);
  e.hurtT = 220;
  const cx = e.coreX;
  const cy = e.coreY;
  switch (e.id) {
    case 'enemy_hato_kakaricho':
      // three feathers float down
      s.burst(cx, cy - 6, { count: 3, speed: [30, 70], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [600, 900], colors: ['#B8BECC', '#8E95A6', '#F4F1E8'], gravity: 60, drag: 2.5, shape: 'sq', size: [3, 3], sizeEnd: 2 });
      break;
    case 'enemy_momisugi':
      // a spring pops out
      s.burst(cx + 10, cy, { count: 1, speed: [90, 120], angle: [-Math.PI * 0.7, -Math.PI * 0.55], life: [500, 600], colors: ['#C0C6CC'], gravity: 420, shape: 'sq', size: [3, 5], sizeEnd: 3 });
      s.burst(cx + 10, cy, { count: 3, speed: [40, 80], life: [200, 300], colors: ['#8A4A3E', '#D9C8B0'], gravity: 200, shape: 'sq', size: [1, 2] });
      break;
    case 'enemy_soujirou':
      // two sparks off the bumper
      s.burst(cx + 6, cy + 4, { count: 2, speed: [60, 110], angle: [-Math.PI * 0.8, -Math.PI * 0.2], life: [180, 260], colors: ['#FFD23F', '#FFF6D8'], gravity: 300, shape: 'star', size: [2, 2], sizeEnd: 1 });
      break;
    case 'enemy_ojigi_jihanki': {
      // the glass cracks once at 66% and once more at 33%
      const r0 = hpBefore / e.maxHp;
      const r1 = e.hp / e.maxHp;
      for (const th of [0.66, 0.33]) if (r0 > th && r1 <= th) e.params.cracks = (e.params.cracks ?? 0) + 1;
      s.burst(cx, cy, { count: 3, speed: [40, 90], life: [250, 350], colors: ['#F4F1E8', '#C8313A'], gravity: 250, shape: 'sq', size: [1, 2] });
      break;
    }
    case 'enemy_cone_vocal':
      s.burst(cx, cy + 10, { count: 3, speed: [30, 60], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [200, 300], colors: ['#8A5A3A', '#F07A2A'], gravity: 300, shape: 'sq', size: [1, 2] });
      break;
    case 'enemy_wasuregasa':
      s.burst(cx, cy, { count: 4, speed: [30, 80], life: [300, 450], colors: ['#CFE3EA', '#FFFFFF'], gravity: 260, shape: 'sq', size: [1, 2] });
      break;
    default:
      break;
  }
}

/** Knockback (4px right, back in 150ms) + squash 1.12/0.9 → 1.0 in 120ms. */
export function knock(s: BattleScene, e: EnemyUnit, px = 4): void {
  s.addFx({
    layer: 'back',
    dur: 160,
    draw: () => {},
    update() {
      if (e.dying) {
        this.done = true;
        return;
      }
      const p = Math.min(1, this.t / 150);
      e.offX = Math.round(px * (1 - ease.quadOut(p)));
      const q = Math.min(1, this.t / 120);
      e.sx = 1.12 - 0.12 * q;
      e.sy = 0.9 + 0.1 * q;
      if (this.t >= 150) {
        e.offX = 0;
        e.sx = e.sy = 1;
      }
    },
  });
}

/** Dodge (ミス): step left 6px (100ms) and back (150ms). */
export function dodge(s: BattleScene, e: EnemyUnit): void {
  s.addFx({
    layer: 'back',
    dur: 260,
    draw: () => {},
    update() {
      if (e.dying) {
        this.done = true;
        return;
      }
      const t = this.t;
      e.offX = t < 100 ? -Math.round(6 * ease.quadOut(t / 100)) : -Math.round(6 * (1 - ease.quadInOut(Math.min(1, (t - 100) / 150))));
      if (t >= 250) e.offX = 0;
    },
  });
}

const restoredCache = new Map<string, HTMLCanvasElement>();

/** Small restored-object sprite: chars team's restored_<id> if registered, else ours. */
export function restoredSprite(e: EnemyUnit): HTMLCanvasElement {
  let c = restoredCache.get(e.id);
  if (c) return c;
  const id = 'restored_' + e.id;
  if (charIds().includes(id)) {
    const cs = charSprite(id);
    const fr = cs.idle?.down?.[0] ?? cs.walk.down[0];
    if (fr) c = fr;
  }
  c ??= e.art!.restored();
  restoredCache.set(e.id, c);
  return c;
}

/**
 * Build every enemy's restored object ahead of time, one per frame while the
 * enemies pop in (the chars team's sprites are palette-quantised on first
 * use, which would otherwise hitch the defeat — the best moment of a fight).
 */
export function* precacheRestored(s: BattleScene): Co {
  const seen = new Set<string>();
  for (const e of s.enemies) {
    if (seen.has(e.id) || e.def.boss || e.def.invulnerable) continue;
    seen.add(e.id);
    restoredSprite(e);
    yield null;
  }
}

/**
 * もとにもどる (16.8). Runs the full timeline for one enemy (hitstop is
 * already applied by the caller at t=0). `dropDelay` staggers multi-kills.
 */
export function* defeatEnemy(s: BattleScene, e: EnemyUnit, dropDelay = 0, lastOne = true): Co {
  e.dying = true;
  e.offX = 0;
  e.sx = e.sy = 1;
  e.shear = 0;
  s.hitstop(14);
  e.whiteFrames = 0;
  yield 1; // hitstop runs first (scene time frozen)
  // 233ms: full-screen flash 2f, shake 3px 8f
  s.flash('#FFF6D8', 0.85, 2);
  s.shake(3, 3, 8);
  // the white silhouette is already up under the flash (QA round 2: one or
  // two frames of the old colours flickered between the flash and it)
  e.whiteFrames = 999;
  yield 34;
  // 267ms: white silhouette + confetti from the core
  const cx = e.coreX;
  const cy = e.coreY;
  s.burst(cx, cy, { count: 20, speed: [60, 200], life: [500, 900], colors: e.def.colors.slice(0, 4), gravity: 240, drag: 1, shape: 'sq', size: [2, 3], sizeEnd: 2 });
  e.whiteFrames = 999;
  s.sfx('se_shrink');
  const x0 = e.x;
  const fy = e.footY;
  // shrink toward the core: 1.0 → 1.05 → 0.15 (easeInBack, 350ms)
  const core = { x: cx, y: cy };
  yield* animateMs(350, (p) => {
    const k = ease.backIn(p);
    const sc = 1 + (0.15 - 1) * k;
    e.sx = e.sy = Math.max(0.05, sc);
    // shrink toward the core, not the feet: lift the anchor
    e.offY = -Math.round((fy - core.y) * (1 - sc));
  });
  e.visible = false;
  e.dead = true;
  e.whiteFrames = 0;
  if (dropDelay) yield dropDelay;
  if (e.id === 'enemy_semi_final') {
    yield* semiFlyAway(s, cx, cy);
  } else {
    // lands 8px above the tape row (y144) so nothing of the UI covers it
    yield* dropObject(s, e, core.x, core.y, Math.min(fy, 136), x0);
  }
  if (lastOne) yield 100;
}

function* animateMs(ms: number, fn: (p: number) => void): Co {
  let t = 0;
  fn(0);
  while (t < ms) {
    yield null;
    t += 1000 / 60;
    fn(Math.min(1, t / ms));
  }
}

/** Soft warm halo behind a restored object (#FFE7A3, α50% at the core). */
function drawHalo(g: Gfx, x: number, y: number, r: number, a: number): void {
  const ctx = g.ctx;
  for (let yy = -r; yy <= r; yy++) {
    const hw = Math.round(Math.sqrt(Math.max(0, r * r - yy * yy)));
    const k = 1 - Math.abs(yy) / (r + 1);
    ctx.globalAlpha = a * 0.28;
    ctx.fillStyle = '#FFE7A3';
    ctx.fillRect(Math.round(x - hw), Math.round(y + yy), hw * 2, 1);
    const hi = Math.round(hw * 0.62);
    ctx.globalAlpha = a * 0.3 * k;
    ctx.fillStyle = '#FFF6D8';
    ctx.fillRect(Math.round(x - hi), Math.round(y + yy), hi * 2, 1);
  }
  ctx.globalAlpha = 1;
}

/**
 * Restored object drops to the foot line, bounces, gets a みました seal (16.8).
 * Small objects are shown at 2x — this is the moment the whole game is about —
 * over a warm halo with a floor shadow, and squash on landing.
 */
function* dropObject(s: BattleScene, e: EnemyUnit, x: number, y: number, floor: number, _x0: number): Co {
  const img = restoredSprite(e);
  const sc = Math.max(img.width, img.height) <= 24 ? 2 : 1;
  const W = img.width * sc;
  const H = img.height * sc;
  const st = { y, vy: -40, landed: false, bounce: 0, t: 0, alpha: 1, seal: 0, sq: 0, glow: 0.6 };
  const ground = floor - H;
  const fx = s.addFx({
    layer: 'world',
    dur: 0,
    draw: (g) => {
      const a = st.alpha;
      if (a <= 0) return;
      const ctx = g.ctx;
      const prev = ctx.globalAlpha;
      // halo (brightens on landing) and a floor shadow that grows as it falls
      drawHalo(g, x, st.y + H / 2, Math.round(Math.max(14, Math.max(W, H) * 0.62)), a * st.glow);
      const near = Math.max(0, Math.min(1, 1 - (ground - st.y) / 60));
      ctx.globalAlpha = prev * a * (0.18 + 0.2 * near);
      ctx.fillStyle = '#2A2440';
      const sw = Math.round(W * (0.55 + 0.25 * near));
      ctx.fillRect(Math.round(x - sw / 2 + 2), floor - 1, sw, 2);
      ctx.fillRect(Math.round(x - sw / 2 + 4), floor + 1, sw - 4, 1);
      // squash on landing: 1.25 / 0.8 → 1
      const sx = 1 + 0.25 * st.sq;
      const sy = 1 - 0.2 * st.sq;
      const w = Math.round(W * sx);
      const h = Math.round(H * sy);
      ctx.globalAlpha = prev * a;
      ctx.drawImage(img, Math.round(x - w / 2), Math.round(st.y + H - h), w, h);
      if (st.seal > 0) {
        const seal = ovalStamp('みました', 44, 22, 0, 5, true);
        const k = Math.min(1, st.seal / 67);
        const ss = 1.6 - 0.6 * k;
        const sw2 = seal.width * ss;
        const sh2 = seal.height * ss;
        ctx.drawImage(seal, Math.round(x + W / 2 + 4 + seal.width / 2 - sw2 / 2), Math.round(floor - 12 - sh2 / 2), Math.round(sw2), Math.round(sh2));
      }
      ctx.globalAlpha = prev;
    },
  });
  // fall with gravity 900 px/s²
  while (st.y < ground) {
    yield null;
    const dt = 1 / 60;
    st.vy += 900 * dt;
    st.y = Math.min(ground, st.y + st.vy * dt);
  }
  s.sfx('se_poton');
  s.burst(x, floor - 1, { count: 6, speed: [30, 70], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [200, 320], colors: ['#FFF6D8', '#FFE7A3'], gravity: 260, shape: 'sq', size: [1, 2] });
  st.glow = 1;
  // squash, then one 6px bounce (180ms)
  yield* animateMs(90, (p) => (st.sq = Math.sin(p * Math.PI)));
  st.sq = 0;
  yield* animateMs(180, (p) => {
    st.y = ground - 6 * Math.sin(p * Math.PI);
    st.glow = 1 - 0.3 * p;
  });
  st.y = ground;
  yield 20;
  st.seal = 1;
  s.sfx('se_stamp');
  s.sfx('se_defeat_chord');
  s.addFx({ layer: 'world', dur: 70, draw: () => {}, update: () => (st.seal += 1000 / 60) });
  yield 100;
  // stays until the line is read; the caller fades it later
  s.dropFxs.push({ fx, st });
}

/** Fade out all dropped restored objects (800ms). */
export function* fadeDrops(s: BattleScene): Co {
  const list = s.dropFxs;
  if (!list.length) return;
  yield* animateMs(800, (p) => list.forEach((d) => (d.st.alpha = 1 - p)));
  list.forEach((d) => (d.fx.done = true));
  list.length = 0;
}

/** Same fade, but without holding the flow (the victory seal follows at +200ms). */
export function fadeDropsLater(s: BattleScene): void {
  const list = s.dropFxs.splice(0);
  if (!list.length) return;
  s.addFx({
    layer: 'back',
    dur: 800,
    draw: () => {},
    update() {
      const p = Math.min(1, this.t / 800);
      list.forEach((d) => (d.st.alpha = 1 - p));
      if (p >= 1) list.forEach((d) => (d.fx.done = true));
    },
  });
}

let cicadaC: HTMLCanvasElement[] | null = null;
/**
 * The cicada that flies off (12×10, seen from behind as it climbs): wings
 * raised / swept back, a brown-outlined body with a 1px highlight, green
 * eyes, glassy wings with a blue-grey rim.
 */
function cicadaFrames(): HTMLCanvasElement[] {
  if (cicadaC) return cicadaC;
  const pal: Record<string, string> = { k: '#2A1A12', b: '#5A3A22', B: '#9A7A4A', e: '#8FD39A', v: '#5F7A8A', W: '#E4F0F4', w: '#B9CDD6' };
  const up = [
    '.vv......vv.',
    'vWWv.kk.vWWv',
    'vWwWkeekWwWv',
    '.vWWkbBkWWv.',
    '..vvkbBkvv..',
    '....kbbk....',
    '....kbBk....',
    '....kbbk....',
    '.....kk.....',
    '............',
  ];
  const down = [
    '............',
    '.....kk.....',
    '....keek....',
    '...vkbBkv...',
    '..vWkbBkWv..',
    '.vWwkbbkwWv.',
    'vWWWkbBkWWWv',
    'vWwv.kk.vwWv',
    '.vv......vv.',
    '............',
  ];
  cicadaC = [up, down].map((rows) => PixelCanvas.fromArt(rows, pal).toCanvas());
  return cicadaC;
}

/**
 * セミファイナル: a cicada (12×10, wings flapping at 2 frames) flutters up and
 * away instead of dropping — one small loop over the spot, then up past the
 * wires, drifting side to side (QA round 3: it was a 6×4 speck).
 */
function* semiFlyAway(s: BattleScene, x: number, y: number): Co {
  const st = { x, y, t: 0 };
  const frames = cicadaFrames();
  s.addFx({
    layer: 'world',
    dur: 1400,
    draw: (g, t) => {
      const img = frames[Math.floor(t / 50) % 2];
      g.alpha(t > 1200 ? (1400 - t) / 200 : 1, () => g.img(img, Math.round(st.x - 6), Math.round(st.y - 5)));
    },
    update(dt) {
      st.t += dt;
      const t = st.t;
      if (t < 520) {
        // one flat loop (a circle seen from the side) as it climbs
        const a = (t / 520) * Math.PI * 2;
        st.x = x + Math.sin(a) * 10;
        st.y = y - 18 * (t / 520) - (1 - Math.cos(a)) * 3;
      } else {
        const u = t - 520;
        st.x = x + Math.sin(u / 110) * 4 + u * 0.02;
        st.y = y - 18 - u * 0.16;
      }
    },
  });
  s.sfx('se_semi_buzz', { vol: 0.4 });
  yield 500;
  s.sfx('se_stamp');
  s.sfx('se_defeat_chord');
  const seal = ovalStamp('みました', 44, 22, 0, 5, true);
  s.addFx({
    layer: 'world',
    dur: 1600,
    draw: (g, t) => {
      const sc = t < 67 ? 1.6 - 0.6 * (t / 67) : 1;
      const w = seal.width * sc;
      const h = seal.height * sc;
      g.alpha(t > 1200 ? (1600 - t) / 400 : 1, () => g.ctx.drawImage(seal, Math.round(x - w / 2), Math.round(y - h / 2 + 10), Math.round(w), Math.round(h)));
    },
  });
  yield 200;
}

/** Record the defeat in the book. */
export function markDefeated(e: EnemyUnit): void {
  setFlag('flag_book_' + e.id, 1);
}

/** Tutorial sticky helper (shows once per flag, or per battle when flagless). */
/** `delay` (ms): the sticky waits (e.g. until the lettering has crossed). */
export function showSticky(s: BattleScene, key: keyof typeof TUT, flagId?: string, pulse = false, ttl = 0, delay = 0, pos: 'left' | 'right' = 'left'): boolean {
  if (flagId && flag(flagId)) return false;
  if (!flagId && s.memo['stk_' + key]) return false;
  if (flagId) setFlag(flagId, 1);
  s.memo['stk_' + key] = 1;
  // on the right the sticky is narrow: one phrase per line
  const text = pos === 'right' ? TUT[key].replace(/ /g, '\n').replace(/\n+/g, '\n') : TUT[key];
  s.sticky = { text, t: -delay, pulse, ttl: ttl ? ttl + delay : undefined, pos };
  return true;
}

export function hideSticky(s: BattleScene): void {
  s.sticky = null;
}

export { all };
