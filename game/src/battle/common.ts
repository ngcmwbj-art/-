// Shared battle mechanics used by party and enemy actions: damage and
// healing presentation, statuses and buffs, kire, and the もとにもどる defeat.

import type { Co } from '../engine/co';
import { all } from '../engine/co';
import { charIds, charSprite } from '../art/chars';
import { flag, setFlag } from '../game/state';
import { ease } from '../engine/tween';
import { rng } from '../engine/rng';
import { fillAll, SYS, TUT } from '../data/battle';
import type { BattleScene } from './scene';
import { STAT_NAME, type EnemyUnit, type PartyUnit, type Stages } from './model';
import { ovalStamp } from './art/stamps';
import { statArrow } from './art/fxart';
import { PANEL_POS } from './ui/panels';
import { statusIcon } from './art/icons';

// ---- kire ------------------------------------------------------------------------

export function addKire(s: BattleScene, n: number): void {
  if (!s.kanenariJoined || n <= 0) return;
  const before = s.kire;
  s.kire = Math.min(3, s.kire + n);
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
          s.sfx('se_kire_up', { pitch: 1 + idx * 0.12 });
          this.done = true;
        }
      },
    });
  }
  if (s.kire !== before) {
    s.bg.kire = s.kire;
    s.setMusicParam('kire', s.kire);
  }
  if (s.kire >= 3 && before < 3) {
    s.sfx('se_kire_full');
    s.memo.kireJustFull = 1;
  }
}

export function resetKire(s: BattleScene): void {
  s.kire = 0;
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
  const [px, py] = PANEL_POS[u.id];
  if (!o.silent && dmg > 0) {
    const stack = o.stack ?? 0;
    let nx = px + 22 + stack * 10;
    let ny = py - 2 - stack * 6;
    if (o.scatter) {
      nx = px + 22 + rng.int(-12, 12);
      ny = py - 2 + rng.int(-6, 4);
    }
    s.number(nx, ny, dmg, { rise: 12, pop: o.tsukkomi ? 0.8 : 1 });
  }
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
    s.sfx('se_damage');
  }
  if (fell) {
    u.m.status = {};
    u.m.status.status_hebatta = 1;
    u.stages = { atk: { lv: 0, turns: 0 }, def: { lv: 0, turns: 0 }, hit: { lv: 0, turns: 0 } };
    u.drop = 3;
    s.sfx('se_ko');
  }
  return fell;
}

/** Tsukkomi success hit feel (16.6) — call once per resolved hit. */
export function tsukkomiFeel(s: BattleScene, u: PartyUnit | null, just: boolean): void {
  s.hitstop(just ? 8 : 6);
  s.shake(just ? 4 : 3, 0, just ? 10 : 8);
  s.flash('#FFFFFF', just ? 0.15 : 0.08, 1);
  s.sfx('se_bishi');
  if (just) s.sfx('se_kiran');
  if (u) s.mood(u, 'tsukkomi', 700);
}

export function healParty(s: BattleScene, u: PartyUnit, amount: number, o: { mp?: boolean; stack?: number } = {}): number {
  const [px, py] = PANEL_POS[u.id];
  if (o.mp) {
    if (u.m.maxMp <= 0) return 0;
    const before = u.m.mp;
    u.m.mp = Math.min(u.m.maxMp, u.m.mp + Math.round(amount));
    const n = u.m.mp - before;
    s.number(px + 22, py - 2, n, { kind: 'mp', rise: 12 });
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
  s.number(px + 22 + (o.stack ?? 0) * 10, py - 2, n, { kind: 'heal', rise: 12 });
  s.sfx('se_heal');
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
}

/** Subtract HP and pop a number above the enemy. Returns true if it reached 0. */
export function hurtEnemy(s: BattleScene, e: EnemyUnit, dmg: number, o: EnemyHitOpts = {}): boolean {
  const x = e.coreX + (o.stack ?? 0) * 10;
  const y = e.headY + Math.min(16, e.def.core[1] * 0.4) - (o.stack ?? 0) * 6;
  if (o.zero) {
    s.number(e.coreX, y, 0, { kind: 'zero' });
    return false;
  }
  if (e.def.invulnerable) return false;
  const before = e.hp;
  e.hp = Math.max(0, e.hp - Math.max(0, Math.round(dmg)));
  // boss HP floor before the final phase (13.7)
  if (e.def.boss && !s.memo.bossFinal && e.hp < 1) e.hp = 1;
  e.trailWait = 400;
  e.hpTrail = Math.max(e.hpTrail, before);
  if (!o.noNumber) s.number(x, y, Math.max(0, Math.round(dmg)), { kind: o.crit ? 'crit' : 'dmg', big: o.big || o.crit });
  if (e.status.bokemake) s.memo.bokeHit = 1;
  return e.hp <= 0;
}

/** Knockback (4px right, back in 150ms) + squash 1.12/0.9 → 1.0 in 120ms. */
export function knock(s: BattleScene, e: EnemyUnit, px = 4): void {
  s.addFx({
    layer: 'back',
    dur: 160,
    draw: () => {},
    update() {
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
      const t = this.t;
      e.offX = t < 100 ? -Math.round(6 * ease.quadOut(t / 100)) : -Math.round(6 * (1 - ease.quadInOut(Math.min(1, (t - 100) / 150))));
      if (t >= 250) e.offX = 0;
    },
  });
}

/** Small restored-object sprite: chars team's restored_<id> if registered, else ours. */
export function restoredSprite(e: EnemyUnit): HTMLCanvasElement {
  const id = 'restored_' + e.id;
  if (charIds().includes(id)) {
    const cs = charSprite(id);
    const fr = cs.idle?.down?.[0] ?? cs.walk.down[0];
    if (fr) return fr;
  }
  return e.art!.restored();
}

/**
 * もとにもどる (16.8). Runs the full timeline for one enemy (hitstop is
 * already applied by the caller at t=0). `dropDelay` staggers multi-kills.
 */
export function* defeatEnemy(s: BattleScene, e: EnemyUnit, dropDelay = 0, lastOne = true): Co {
  e.dying = true;
  s.hitstop(14);
  e.whiteFrames = 0;
  yield 1; // hitstop runs first (scene time frozen)
  // 233ms: full-screen flash 2f, shake 3px 8f
  s.flash('#FFF6D8', 0.85, 2);
  s.shake(3, 3, 8);
  yield 34;
  // 267ms: white silhouette + confetti from the core
  const cx = e.coreX;
  const cy = e.coreY;
  s.burst(cx, cy, { count: 20, speed: [60, 200], life: [500, 900], colors: e.def.colors.slice(0, 4), gravity: 240, drag: 1, shape: 'sq', size: [2, 3], sizeEnd: 2 });
  e.whiteFrames = 999;
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
    yield* dropObject(s, e, core.x, core.y, fy, x0);
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

/** Restored object drops to the foot line, bounces, gets a みました seal. */
function* dropObject(s: BattleScene, e: EnemyUnit, x: number, y: number, floor: number, _x0: number): Co {
  const img = restoredSprite(e);
  const st = { y, vy: -40, landed: false, bounce: 0, t: 0, alpha: 1, seal: 0 };
  const ground = floor - img.height;
  const fx = s.addFx({
    layer: 'world',
    dur: 0,
    draw: (g) => {
      g.alpha(st.alpha, () => {
        g.alpha(0.3, () => g.rect(Math.round(x - img.width * 0.35 + 2), floor - 2, Math.round(img.width * 0.7), 2, '#2A2440'));
        g.img(img, Math.round(x - img.width / 2), Math.round(st.y));
        if (st.seal > 0) {
          const seal = ovalStamp('みました', 40, 20, 0, 5);
          const k = Math.min(1, st.seal / 67);
          const sc = 1.6 - 0.6 * k;
          const w = seal.width * sc;
          const h = seal.height * sc;
          g.ctx.drawImage(seal, Math.round(x + img.width / 2 + 2 + 20 - w / 2), Math.round(floor - 16 - h / 2), Math.round(w), Math.round(h));
        }
      });
    },
  });
  // fall with gravity 900 px/s²
  let t = 0;
  while (st.y < ground) {
    yield null;
    const dt = 1 / 60;
    t += dt;
    st.vy += 900 * dt;
    st.y = Math.min(ground, st.y + st.vy * dt);
  }
  s.sfx('se_poton');
  // one 6px bounce (180ms)
  yield* animateMs(180, (p) => (st.y = ground - 6 * Math.sin(p * Math.PI)));
  st.y = ground;
  yield 40;
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

/** セミファイナル: a tiny cicada flutters up and away instead of dropping. */
function* semiFlyAway(s: BattleScene, x: number, y: number): Co {
  const st = { x, y, t: 0 };
  s.addFx({
    layer: 'world',
    dur: 1200,
    draw: (g, t) => {
      const f = Math.floor(t / 60) % 2;
      const px = Math.round(st.x);
      const py = Math.round(st.y);
      // 12×10 cicada, wings flapping
      g.rect(px - 2, py - 1, 4, 6, '#5A3A22');
      g.rect(px - 1, py, 2, 4, '#7A5A3A');
      g.px(px - 2, py - 1, '#2A1A12');
      g.px(px + 1, py - 1, '#2A1A12');
      const wc = '#C9D8DE';
      if (f) {
        g.rect(px - 6, py - 3, 4, 2, wc);
        g.rect(px + 2, py - 3, 4, 2, wc);
      } else {
        g.rect(px - 6, py + 1, 4, 2, wc);
        g.rect(px + 2, py + 1, 4, 2, wc);
      }
    },
    update(dt) {
      st.t += dt;
      st.y -= dt * 0.12;
      st.x += Math.sin(st.t / 90) * 0.8;
    },
  });
  s.sfx('se_semi_buzz', { vol: 0.4 });
  yield 500;
  s.sfx('se_stamp');
  s.sfx('se_defeat_chord');
  const seal = ovalStamp('みました', 40, 20, 0, 5);
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
export function showSticky(s: BattleScene, key: keyof typeof TUT, flagId?: string, pulse = false): boolean {
  if (flagId && flag(flagId)) return false;
  if (!flagId && s.memo['stk_' + key]) return false;
  if (flagId) setFlag(flagId, 1);
  s.memo['stk_' + key] = 1;
  s.sticky = { text: TUT[key], t: 0, pulse };
  return true;
}

export function hideSticky(s: BattleScene): void {
  s.sticky = null;
}

export { all };
