// ヨビモドシ (51 10章): the village's disaster-radio loudspeaker on 星見の丘.
// Dark / light (the はなまるトマト held up: 2 rounds light, 2 rounds to
// recharge), the four ラッパ broken by みました while lit, the 点呼 name
// tags that fill on dark round ends (the 4th: 夜ふかし), phase 2 (tags two at
// a time, おなまえ よびだし), and the finale: Kanenari-kun lights the village,
// the picture, 「おやすみなさい」, the lamp goes out, and the quiet results.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { BAYER4, makeCanvas } from '../engine/pixel';
import { flag, setFlag } from '../game/state';
import { muteMusic, sfx, stopAllAmbient } from '../audio';
import { BOSS_PARTS, fillAll, LABEL, SYS, SYS2, TENKO_NAMES } from '../data/battle';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import { fixedDamage, JUDGE_MUL, type BossPart, type EnemyUnit, type Judge, type PartyUnit } from './model';
import { changeStage, giveStatus, hideSticky, hurtEnemy, hurtParty, knock, showSticky } from './common';
import type { BossMoveCtx } from './enemy';
import { hitLoop, panelHitPoint } from './enemy';
import { bokemakeLabel, showFlip } from './tsukkomi';
import { holdStamp } from './party';
import { playHankoLearnIn } from './learn';
import { ovalStamp, finalSeal } from './art/stamps';
import { kanenariBack } from '../art/enemies/kanenari';
import { henjiHand, nameTag, tomatoIcon, tomatoNet, trainWindow } from './art/fxart_ch2';
import { thickLine } from './art/fxart';
import { PANEL_POS } from './ui/panels';
import { C, tapeCanvas } from './ui/note';
import { battleCut } from './api';
import { drawVillageLit } from './art/village_lit';
import { hitDown } from './enemy_ch2';

// ---- state -------------------------------------------------------------------------------

interface Yobi {
  light: boolean;
  /** Which light round we are in (1, 2) while light. */
  lightRound: number;
  /** Rounds before the tomato can be held up again. */
  charge: number;
  /** Who held it up (marker over their panel). */
  raiser: string | null;
  raiseT: number;
  /** 0 = dark sprite, 1 = lit sprite (the dithered reveal). */
  lightK: number;
  lightTo: number;
  /** Reveal direction: +1 grows from the bottom (lighting), −1 sinks from the top. */
  lightDir: number;
  /** Warm under-glow over the stage (#F2894B α12% at 1). */
  glow: number;
  glowTo: number;
  /** Index into TENKO_NAMES. */
  names: number;
  /** The boss's previous action (for 山びこ). */
  lastMove: string;
  tomatoUsed: boolean;
  /** Night steps after 夜ふかし (the background dims, max 2). */
  darkSteps: number;
  /** A tape of the tomato's state that popped (ms of the pop). */
  tagPop: number;
  /** The finale's light (0 → 1 over 2.0s): the whole screen warms. */
  finale: number;
  /** Picture cross-fade (0 = battle, 1 = the village picture). */
  cut: number;
  cutT: number;
  cutCue: number;
  /** The finale's net raised by Kanenari-kun. */
  kanenariUp: { x: number; y: number; frame: string; a: number } | null;
  /** 0..1: the red lamp dies away. */
  lampOff: number;
  /** Screen-space shapes floating in a broken ラッパ's mouth. */
  shapes: { part: string; t: number }[];
  /** Everything drawn in black (the quiet results). */
  black: boolean;
  /** The big 「おやすみなさい」 seal sitting on the core. */
  seal: { img: HTMLCanvasElement; y: number } | null;
}

const ST = new WeakMap<BattleScene, Yobi>();

export function yobiState(s: BattleScene): Yobi {
  let y = ST.get(s);
  if (!y) {
    y = {
      light: false,
      lightRound: 0,
      charge: 0,
      raiser: null,
      raiseT: 0,
      lightK: 0,
      lightTo: 0,
      lightDir: 1,
      glow: 0,
      glowTo: 0,
      names: 0,
      lastMove: '',
      tomatoUsed: false,
      darkSteps: 0,
      tagPop: 0,
      finale: 0,
      cut: 0,
      cutT: 0,
      cutCue: 0,
      kanenariUp: null,
      lampOff: 0,
      shapes: [],
      black: false,
      seal: null,
    };
    ST.set(s, y);
  }
  return y;
}

/** Boss wipes this session (a retry is short and re-teaches the tomato). */
export const bossTries = { lost: 0 };

const RAPPA_ORDER = ['boss_yobimodoshi_east', 'boss_yobimodoshi_west', 'boss_yobimodoshi_south', 'boss_yobimodoshi_north'];
/** ハウリング pitch per ラッパ (53 8.6). */
const HOWL_PITCH: Record<string, number> = { east: 1.0, west: 0.89, south: 0.84, north: 0.75 };
/** 点呼 notes by the count after it lights (53 8.6). */
const TENKO_NOTES = ['D6', 'A5', 'F5'];

/** Sprite-space mouth centres of the ラッパ and the lamp (51 10.9). */
export const YOBI_SPOTS = {
  east: [123, 30] as [number, number],
  west: [5, 30] as [number, number],
  south: [64, 41] as [number, number],
  north: [64, 12] as [number, number],
  lamp: [64, 66] as [number, number],
};

function key(partId: string): 'east' | 'west' | 'south' | 'north' {
  return partId.replace('boss_yobimodoshi_', '') as 'east' | 'west' | 'south' | 'north';
}

function boss(s: BattleScene): EnemyUnit | undefined {
  return s.enemies.find((e) => e.id === 'boss_yobimodoshi');
}

function broken(s: BattleScene, k: string): boolean {
  return !!s.bossParts.find((p) => p.id === 'boss_yobimodoshi_' + k)?.broken;
}

function brokenCount(s: BattleScene): number {
  return s.bossParts.filter((p) => p.broken).length;
}

/** Is the stage lit (the tomato) right now? */
export function yobiLit(s: BattleScene): boolean {
  return yobiState(s).light;
}

/** Rounds of recharge left (0 = the tomato can be held up). */
export function yobiCharge(s: BattleScene): number {
  return yobiState(s).charge;
}

// ---- setup -------------------------------------------------------------------------------

export function initBoss(s: BattleScene): void {
  const y = yobiState(s);
  s.bossParts = BOSS_PARTS.boss_yobimodoshi.map((p) => ({ id: p.id, name: p.name, box: p.box, action: p.action, broken: false, glow: false }));
  s.memo.bossPhase = 1;
  setFlag('flag_ch2_boss_phase', 1);
  setFlag('flag_ch2_boss_light', 0);
  s.bossChime.lit = 0;
  const e = boss(s);
  if (e) {
    e.params.light = 0;
    e.params.lampX = 0;
    syncBossFlags(s, e);
  }
  s.boss = {
    update: (dt) => update(s, dt),
    drawUnder: (g) => drawUnder(s, g),
    drawOver: (g) => drawOver(s, g),
    drawUi: (g) => drawBossUi(s, g),
    drawTop: (g) => drawTop(s, g),
  };
  void y;
}

export function syncBossFlags(s: BattleScene, e: EnemyUnit): void {
  const y = yobiState(s);
  for (const p of s.bossParts) {
    const k = key(p.id);
    e.flags['broken_' + k] = p.broken ? 1 : 0;
    // while it is light every whole ラッパ can be seen (and broken)
    p.glow = y.light && !p.broken;
  }
  e.flags.phase = s.memo.bossPhase ?? 1;
  setFlag('flag_ch2_boss_light', y.light ? 1 : 0);
}

function update(s: BattleScene, dt: number): void {
  const y = yobiState(s);
  const e = boss(s);
  // the dithered reveal: 300ms up (light), 400ms down (dark)
  if (y.lightK !== y.lightTo) {
    const step = dt / (y.lightTo > y.lightK ? 300 : 400);
    y.lightK = y.lightTo > y.lightK ? Math.min(y.lightTo, y.lightK + step) : Math.max(y.lightTo, y.lightK - step);
  }
  if (y.glow !== y.glowTo) {
    const step = dt / 400;
    y.glow = y.glowTo > y.glow ? Math.min(y.glowTo, y.glow + step) : Math.max(y.glowTo, y.glow - step);
  }
  if (e) {
    e.params.light = y.lightK;
    e.params.lightDir = y.lightDir;
    e.params.lampOff = y.lampOff;
    e.params.finale = y.finale;
    e.params.phase = s.memo.bossPhase ?? 1;
    // the lamp's point of light swings slowly (4s), twice as fast in phase 2
    const spd = (s.memo.bossPhase ?? 1) >= 2 ? 2 : 1;
    if (!e.flags.lampHold && !s.memo.bossFinal) e.params.lampX = Math.sin((s.t / 4000) * Math.PI * 2 * spd);
  }
  for (const sh of y.shapes) sh.t += dt;
  y.shapes = y.shapes.filter((sh) => sh.t < 1000);
  const bg = s.bg;
  bg.flags.light = y.light ? 1 : 0;
  bg.flags.dark = y.darkSteps;
  bg.flags.finale = y.finale;
}

// ---- drawing ------------------------------------------------------------------------------

function drawUnder(_s: BattleScene, _g: Gfx): void {}

/** Broken ラッパ: the shape it was calling floats white in its mouth for a second. */
function drawOver(s: BattleScene, g: Gfx): void {
  const y = yobiState(s);
  const e = boss(s);
  if (!e) return;
  for (const sh of y.shapes) {
    const k = key(sh.part);
    const [mx, my] = YOBI_SPOTS[k];
    const x = e.left + mx;
    const yy = e.top + my + s.bandDip(e);
    const a = sh.t < 150 ? sh.t / 150 : sh.t > 800 ? (1000 - sh.t) / 200 : 1;
    g.alpha(a, () => drawShape(g, k, x, yy));
  }
}

/** The four shapes (51 10.9): 東＝時刻表, 西＝ハウスの輪, 南＝表札, 北＝山. */
function drawShape(g: Gfx, k: string, x: number, y: number): void {
  const W = '#FFF6D8';
  if (k === 'east') {
    // a little timetable grid
    g.rect(x - 6, y - 5, 12, 10, W);
    g.rect(x - 5, y - 4, 10, 8, '#8E95A6');
    for (let i = 0; i < 3; i++) g.rect(x - 5, y - 2 + i * 3, 10, 1, W);
    g.rect(x - 1, y - 4, 1, 8, W);
  } else if (k === 'west') {
    // the greenhouse's hoops
    for (let i = 0; i < 3; i++) for (let a = 0; a <= 12; a++) {
      const an = Math.PI + (a / 12) * Math.PI;
      g.px(Math.round(x - 4 + i * 4 + Math.cos(an) * 5), Math.round(y + 3 + Math.sin(an) * 6), W);
    }
    g.rect(x - 9, y + 3, 18, 1, W);
  } else if (k === 'south') {
    // an empty house's name plate
    g.rect(x - 4, y - 6, 8, 12, W);
    g.rect(x - 3, y - 5, 6, 10, '#C8C2B4');
    g.rect(x - 2, y - 3, 4, 1, '#8E95A6');
    g.rect(x - 2, y, 4, 1, '#8E95A6');
    g.rect(x - 2, y + 2, 3, 1, '#8E95A6');
  } else {
    // the mountain
    for (let i = 0; i <= 8; i++) {
      g.px(x - 8 + i, y + 4 - i, W);
      g.px(x + i, y - 4 + i, W);
    }
    g.px(x - 3, y + 1, W);
    g.px(x + 3, y + 1, W);
  }
}

/** The stickies under the band: the 名札 row (点呼) and the tomato's tag (13.2). */
function drawBossUi(s: BattleScene, g: Gfx): void {
  const y = yobiState(s);
  if (y.black) return;
  const top = s.msg.bottom + 2;
  drawNametagSticky(g, top, s.bossChime.lit, s.bossChime.pops, s.t, y.light);
  drawTomatoTag(g, top, y, s.t);
  // the member who held it up: the net's tomato peeks over their panel (13.4)
  if (y.light && y.raiser && !s.memo.bossFinal) {
    const [px] = PANEL_POS[y.raiser] ?? [104, 150];
    const img = tomatoNet(22, true);
    const bob = Math.round(Math.sin((s.t / 1000) * Math.PI * 2 * 0.8) * 1);
    const cx = px + 4 + 6;
    const cy = 126 + 6 + bob;
    haloAt(g, cx, cy, 10, '#FFE7A3', 0.4);
    g.img(img, Math.round(cx - img.width / 2), Math.round(cy - 10));
  }
}

function haloAt(g: Gfx, x: number, y: number, r: number, col: string, a: number): void {
  const ctx = g.ctx;
  ctx.save();
  for (let yy = -r; yy <= r; yy++) {
    const hw = Math.round(Math.sqrt(Math.max(0, r * r - yy * yy)));
    ctx.globalAlpha = a * (1 - Math.abs(yy) / (r + 1)) * 0.8;
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x - hw), Math.round(y + yy), hw * 2, 1);
  }
  ctx.restore();
}

/**
 * The 点呼 sticky (76×20 at (300, band + 2)): four name tags (14×16) at
 * x305/322/339/356 — pencil outlines when unlit; lit, a cream card with two
 * lines and a vermilion dot (a name written on it), a glow and a pulsing ring.
 * While it is light the tape brightens and a thin orange rule runs over the
 * tags: the roll call has stopped.
 */
export function drawNametagSticky(g: Gfx, y: number, lit: number, pops: number[], t: number, light: boolean): void {
  g.rect(302, y + 2, 76, 20, C.shadow, 0.45);
  g.rect(300, y, 76, 20, C.stickyEdge);
  g.rect(301, y + 1, 74, 18, light ? '#FFF2C4' : C.sticky);
  g.img(tapeCanvas(18, 6, '', light ? '#FFE7A3' : C.tape, 8), 329, y - 3);
  const xs = [305, 322, 339, 356];
  for (let i = 0; i < 4; i++) {
    const on = i < lit;
    const p = pops[i] ?? 0;
    const x = xs[i];
    const yy = y + 2;
    const sc = on && p > 0 ? 1 + 0.6 * (p / 150) : 1;
    const draw = (gx: Gfx) => {
      if (on) {
        gx.rect(x + 1, yy + 1, 12, 14, '#2A2440');
        gx.rect(x + 2, yy + 2, 10, 12, '#F4F1E8');
        gx.rect(x + 2, yy + 2, 10, 1, '#FFFFFF');
        gx.rect(x + 4, yy + 5, 6, 1, '#2A2440');
        gx.rect(x + 4, yy + 8, 5, 1, '#2A2440');
        gx.rect(x + 8, yy + 11, 2, 2, '#E23B2E');
        gx.rect(x + 12, yy + 3, 1, 11, '#C8C2B4');
      } else {
        gx.frame(x + 2, yy + 2, 10, 12, '#9AA0A8');
        gx.rect(x + 4, yy + 5, 6, 1, '#C8C2B4');
        gx.rect(x + 4, yy + 8, 5, 1, '#C8C2B4');
      }
    };
    if (sc !== 1) {
      const ctx = g.ctx;
      ctx.save();
      ctx.translate(x + 7, yy + 8);
      ctx.scale(sc, sc);
      ctx.translate(-(x + 7), -(yy + 8));
      draw(g);
      ctx.restore();
      g.px(x - 2, yy + 3, C.gold);
      g.px(x - 3, yy + 5, C.gold);
      g.px(x + 16, yy + 3, C.gold);
      g.px(x + 17, yy + 5, C.gold);
    } else draw(g);
    if (on && !light && Math.floor(t / 400) % 2 === 0) g.alpha(0.35, () => g.ring(x + 7, yy + 8, 9, '#FFE7A3'));
    if (on) g.alpha(0.3, () => g.rect(x + 1, yy + 1, 12, 14, '#FFF6D8'));
  }
  if (light) g.rect(302, y + 9, 72, 1, '#F2894B');
}

/** The tomato's tag (38×20 at (258, band + 2)): ready / lit (rounds left) / recharging. */
function drawTomatoTag(g: Gfx, y: number, st: Yobi, t: number): void {
  const x = 258;
  const state: 'ready' | 'lit' | 'charge' = st.light ? 'lit' : st.charge > 0 ? 'charge' : 'ready';
  g.rect(x + 2, y + 2, 38, 20, C.shadow, 0.4);
  g.alpha(0.85, () => g.img(tapeCanvas(38, 20, '', '#F7C27A', 13), x, y));
  const icon = tomatoIcon(state);
  const pop = t - st.tagPop < 160 ? 1.4 - 0.4 * ((t - st.tagPop) / 160) : 1;
  const iw = Math.round(icon.width * pop);
  if (state === 'ready' && Math.floor(t / 500) % 2 === 0) g.alpha(0.6, () => g.ring(x + 10, y + 10, 7, '#FFE7A3'));
  if (state === 'lit')
    for (const [dx, dy] of [[-8, 0], [8, 0], [0, -8], [0, 8]] as [number, number][]) g.rect(x + 10 + dx - (dx ? 0 : 0), y + 10 + dy, dx ? 2 : 1, dy ? 2 : 1, '#FFE7A3');
  g.ctx.drawImage(icon, Math.round(x + 10 - iw / 2), Math.round(y + 10 - iw / 2), iw, iw);
  const n = state === 'lit' ? 3 - st.lightRound : state === 'charge' ? st.charge : 0;
  if (n > 0) handDigit(g, n, x + 22, y + 4, state === 'charge' ? '#6B7186' : '#B8241E');
}

/** Hand-written digits (8×12) for the tomato tag. */
function handDigit(g: Gfx, n: number, x: number, y: number, col: string): void {
  const rows: Record<number, string[]> = {
    1: ['...##...', '..###...', '.#.##...', '...##...', '...##...', '...##...', '...##...', '...##...', '...##...', '...##...', '.######.', '........'],
    2: ['..####..', '.##..##.', '.....##.', '.....##.', '....##..', '...##...', '..##....', '.##.....', '.##.....', '.##...#.', '.######.', '........'],
    3: ['..####..', '.##..##.', '.....##.', '.....##.', '...###..', '.....##.', '.....##.', '.....##.', '.##..##.', '.##..##.', '..####..', '........'],
  };
  const r = rows[n] ?? rows[1];
  r.forEach((row, yy) => [...row].forEach((c, xx) => c === '#' && g.px(x + xx, y + yy, col)));
}

/** Over everything: the warm under-glow, the finale's light, the picture, the dark. */
function drawTop(s: BattleScene, g: Gfx): void {
  const y = yobiState(s);
  if (y.glow > 0.01 && !y.black) {
    // the warm light bouncing up from below (#F2894B α12% at the bottom)
    const ctx = g.ctx;
    const grad = ctx.createLinearGradient(0, 216, 0, 40);
    grad.addColorStop(0, `rgba(242,137,75,${0.12 * y.glow})`);
    grad.addColorStop(1, 'rgba(242,137,75,0)');
    ctx.save();
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 384, 216);
    ctx.restore();
  }
  if (y.kanenariUp) {
    const k = y.kanenariUp;
    const img = kanenariBack(k.frame);
    g.alpha(k.a, () => {
      const ctx = g.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 384, 150);
      ctx.clip();
      g.img(img, Math.round(k.x - img.width / 2), Math.round(k.y - img.height));
      if (k.frame === 'hold') {
        const net = tomatoNet(64, true);
        g.img(net, Math.round(k.x + 13 - net.width / 2), Math.round(k.y - img.height - net.height + 22));
      }
      ctx.restore();
    });
  }
  if (y.cut > 0) {
    const draw = battleCut('cut_h_village_lit') ?? drawVillageLit;
    g.alpha(y.cut, () => draw(g, y.cutT, y.cutCue));
  }
  if (y.black) g.rect(0, 0, 384, 216, '#0B0B14');
}

// ---- appearance (14.15) ----------------------------------------------------------------------

/** 0–400ms the lamp; 400–800ms the ラッパ mouths E→W→S→N; the lamp looks at Minato. */
export function* yobiAppear(s: BattleScene, fast: boolean): Co {
  const e = boss(s);
  if (!e) return;
  e.appearT = -1;
  e.alpha = 1;
  e.params.intro = 0;
  const k = fast ? 0.45 : 1;
  for (let t = 0; t < 400 * k; t += FRAME) {
    e.params.intro = (t / (400 * k)) * 0.5;
    yield null;
  }
  for (let i = 0; i < 4; i++) {
    e.params['mouthOn_' + key(RAPPA_ORDER[i])] = 1;
    e.params.intro = 0.5 + (i + 1) * 0.125;
    yield 100 * k;
  }
  e.params.intro = 1;
  // the lamp's point of light comes to rest on Minato's panel
  e.flags.lampHold = 1;
  for (let t = 0; t < 300; t += FRAME) {
    e.params.lampX = -0.7 * ease.quadOut(t / 300);
    yield null;
  }
  yield 200 * k;
  e.flags.lampHold = 0;
}

// ---- AI (10.5) -------------------------------------------------------------------------------

function weighted(e: EnemyUnit, t: [string, number][]): string {
  const last2 = e.lastSkills.slice(-2);
  let list = t.filter(([id, w]) => w > 0 && !(last2.length === 2 && last2[0] === id && last2[1] === id));
  if (!list.length) list = t.filter(([, w]) => w > 0);
  return list.length ? rng.weighted(list) : 'skill_idle';
}

export function bossDecide(s: BattleScene, e: EnemyUnit): string {
  const y = yobiState(s);
  const E = broken(s, 'east') ? 0 : 1;
  const Wst = broken(s, 'west') ? 0 : 1;
  const S = broken(s, 'south') ? 0 : 1;
  const yama = !broken(s, 'north') && ['skill_yobi_ressha', 'skill_yobi_sukima', 'skill_yobi_amado'].includes(y.lastMove) ? 1 : 0;
  const all = brokenCount(s) >= 4;
  const phase = s.memo.bossPhase ?? 1;
  const free = s.party.some((u) => u.targetable && !u.has('status_henji'));
  if (phase < 2 && !all) {
    if ((e.mem.acts ?? 0) === 0 && E) return 'skill_yobi_ressha';
    return weighted(e, [['skill_yobi_ressha', 30 * E], ['skill_yobi_sukima', 25 * Wst], ['skill_yobi_amado', 25 * S], ['skill_yobi_yamabiko', 15 * yama], ['skill_idle', 5]]);
  }
  if (s.memo.phase2Fresh) {
    s.memo.phase2Fresh = 0;
    if (free) return 'skill_yobi_onamae';
  }
  if (all) return free ? rng.weighted<string>([['skill_yobi_onamae', 70], ['skill_idle', 30]]) : 'skill_idle';
  const onOk = free && e.lastSkills[e.lastSkills.length - 1] !== 'skill_yobi_onamae' ? 1 : 0;
  return weighted(e, [
    ['skill_yobi_onamae', 30 * onOk],
    ['skill_yobi_ressha', 20 * E],
    ['skill_yobi_sukima', 15 * Wst],
    ['skill_yobi_amado', 20 * S],
    ['skill_yobi_yamabiko', 10 * yama],
    ['skill_idle', 5],
  ]);
}

// ---- moves (10.6) ----------------------------------------------------------------------------

/** Pitch / echo factor for 山びこ's replay (×0.5, no status, the north ラッパ plays it). */
interface Echo {
  mul: number;
  echo: boolean;
}

export function* bossMoveImpl(c: BossMoveCtx): Co {
  const { s, e, sk } = c;
  const y = yobiState(s);
  if (sk.id === 'skill_yobi_yamabiko') {
    // 山びこ: the previous ラッパ move once more at half strength, same rhythm,
    // voiced by the north ラッパ (and three echo rings)
    const prev = y.lastMove;
    s.sfx('se_h_yamabiko');
    const [nx, ny] = YOBI_SPOTS.north;
    for (let i = 0; i < 3; i++) s.sfxLater('se_none', undefined, 1);
    echoRings(s, e.left + nx, e.top + ny, 3);
    yield 300;
    if (prev && prev !== 'skill_yobi_yamabiko') {
      yield* runMove(c, prev, { mul: 0.5, echo: true });
    } else yield 300;
    return;
  }
  yield* runMove(c, sk.id, { mul: 1, echo: false });
  if (['skill_yobi_ressha', 'skill_yobi_sukima', 'skill_yobi_amado'].includes(sk.id)) y.lastMove = sk.id;
  else if (sk.id !== 'skill_yobi_yofukashi') y.lastMove = sk.id;
}

function mouth(e: EnemyUnit, k: 'east' | 'west' | 'south' | 'north'): [number, number] {
  const [x, y] = YOBI_SPOTS[k];
  return [e.left + x, e.top + y];
}

function* runMove(c: BossMoveCtx, id: string, o: Echo): Co {
  const { s, e, common, resolveGuard, all, pages, damageTo, st } = c;
  // a single-target move picks its own target (山びこ may replay one)
  const pickOne = (): PartyUnit | undefined => {
    if (c.target && c.target.targetable && !o.echo) return c.target;
    const list = s.party.filter((u) => u.targetable);
    return list.length ? rng.pick(list) : undefined;
  };
  const vol = o.echo ? 0.5 : 1;
  switch (id) {
    case 'skill_yobi_ressha': {
      const t = pickOne();
      if (!t) break;
      const [mx, my] = mouth(e, 'east');
      e.params.shake_east = s.t;
      yield* hitLoop(s, {
        ...common,
        hits: [0, 24, 24, 24],
        bang: () => [t],
        onFrame: (_f, i, toHit) => {
          if (toHit === 16) {
            c.projectile(s, trainWindow, mx, my, t, 16, 1, 1.8, 6, { trail: true, sparkle: true });
            e.params.mouthPulse_east = s.t;
          }
          void i;
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx('se_h_ressha', { level: i % 2, vol });
          damageTo(s, e, t, 0.3 * o.mul, r, i);
        },
      });
      if (!st.anySuccess && !o.echo) pages.push(...e.def.texts.extra.resshaResult);
      break;
    }
    case 'skill_yobi_sukima': {
      const [mx, my] = mouth(e, 'west');
      s.sfx('se_h_sukima', { vol });
      e.params.shake_west = s.t;
      yield* hitLoop(s, {
        ...common,
        hits: [0],
        bang: () => all,
        onFrame: (f) => {
          if (f % 6 === 0) windLines(s, mx, my, all);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t) => damageTo(s, e, t, 0.5 * o.mul, r));
        },
      });
      if (!o.echo) {
        const hit = hitDown(s, all, 0.7, st.anySuccess);
        if (hit.length) pages.push(...fillAll(['まぶしくて、みんなの\n命中が 下がった！'].map(() => '$targetの 命中が 下がった！'), { target: hit.length > 1 ? 'みんな' : hit[0].name }));
      }
      break;
    }
    case 'skill_yobi_amado': {
      const t = pickOne();
      if (!t) break;
      s.sfx('se_h_amado', { vol });
      e.params.shutterAt = s.t;
      e.params.shake_south = s.t;
      yield* hitLoop(s, {
        ...common,
        hits: [0],
        bang: () => [t],
        onFrame: (_f, _i, toHit) => {
          if (toHit === 6) e.params.shutterSlam = s.t;
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.shake(3, 3, 10);
          damageTo(s, e, t, 1.6 * o.mul, r);
        },
      });
      if (!o.echo) pages.push(...e.def.texts.extra.amadoResult);
      break;
    }
    case 'skill_yobi_onamae': {
      const t = c.target;
      if (!t) break;
      // the lamp looks straight at them; a name tag flies out of the south mouth
      e.flags.lampHold = 1;
      e.params.lampX = t.id === 'minato' ? -0.8 : 0.8;
      const [mx, my] = mouth(e, 'south');
      yield* hitLoop(s, {
        ...common,
        hits: [0],
        bang: () => [t],
        onFrame: (_f, _i, toHit) => {
          if (toHit === 14) {
            s.sfx('se_h_onamae');
            e.params.mouthPulse_south = s.t;
            c.projectile(s, nameTag, mx, my, t, 14, 1, 2, 10, { trail: true });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, t, 0.8, r);
        },
      });
      e.flags.lampHold = 0;
      if (st.anySuccess) pages.push(...fillAll(SYS2.henjiGuard, { target: t.name }));
      else if (t.alive) {
        // 14.12: the panel hops, the face is surprised, the raised hand is stamped on
        yield 200;
        t.bounceT = 250;
        t.bounceAmp = 4;
        s.mood(t, 'surprised', 600);
        giveStatus(s, t, 'status_henji', 1);
        s.sfx('se_emote');
        const [px, py] = PANEL_POS[t.id];
        const img = henjiHand();
        s.addFx({
          layer: 'top',
          dur: 500,
          ui: true,
          draw: (g, tt) => {
            const k = tt < 90 ? 1.8 - 0.8 * (tt / 90) : 1;
            const w = Math.round(img.width * k);
            g.alpha(tt > 380 ? (500 - tt) / 120 : 1, () => g.ctx.drawImage(img, Math.round(px + 8 - w / 2), Math.round(py + 44 - w / 2), w, w));
          },
        });
        pages.push(...(t.id === 'kanenari' ? SYS2.henjiOnKanenari : SYS2.henjiOnMinato));
      }
      break;
    }
    case 'skill_yobi_yofukashi': {
      yield* yofukashi(c);
      break;
    }
    default:
      yield 300;
  }
}

/** White wavy lines (#E8ECF0 α50%) blowing from the west mouth across the panels. */
function windLines(s: BattleScene, x0: number, y0: number, to: PartyUnit[]): void {
  for (const t of to) {
    const [hx, hy] = panelHitPoint(t);
    const ph = rng.range(0, 6.28);
    s.addFx({
      layer: 'top',
      dur: 520,
      draw: (g, tt) => {
        const p = tt / 520;
        g.alpha(0.5 * (1 - p * 0.5), () => {
          for (let k = 0; k < 3; k++) {
            const q = Math.max(0, Math.min(1, p * 1.3 - k * 0.12));
            const x = x0 + (hx - x0) * q;
            const y = y0 + (hy - 10 - y0) * q + (k - 1) * 6;
            for (let j = 0; j < 12; j++) g.px(Math.round(x - j * 2), Math.round(y + Math.sin(j * 0.8 + ph + tt / 60) * 1.5), '#E8ECF0');
          }
        });
      },
    });
  }
}

/** Echo rings from the north mouth (山びこ). */
function echoRings(s: BattleScene, x: number, y: number, n: number): void {
  for (let i = 0; i < n; i++) {
    const d = 120 + i * 140;
    s.addFx({
      layer: 'world',
      dur: 600 + d,
      draw: (g, t) => {
        if (t < d) return;
        const p = (t - d) / 600;
        g.alpha(0.45 * (1 - p), () => {
          const r = 6 + p * 46;
          for (let a = 0; a < 56; a++) {
            const an = (a / 56) * Math.PI * 2;
            g.px(Math.round(x + Math.cos(an) * r), Math.round(y + Math.sin(an) * r * 0.55), '#F4F1E8');
          }
        });
      },
    });
  }
}

/**
 * 夜ふかし (14.5): page 1, the four tags pulse; 900ms of every whole ラッパ
 * shaking with its howl and a dark wave coming down; "!" on both panels;
 * the wave covers and passes (10f), shake 4px; fixed damage (4.2) halved by
 * a tsukkomi and by まもる; sleep 30%. Then the tags go out right to left.
 */
function* yofukashi(c: BossMoveCtx): Co {
  const { s, e, common, resolveGuard, all, pages, st } = c;
  const y = yobiState(s);
  const wave = { y: -60, a: 0 };
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g) => {
      if (wave.a <= 0) return;
      g.alpha(wave.a, () => {
        const top = Math.round(wave.y);
        g.rect(0, Math.max(0, top - 60), 384, 60, '#0B0B14', 0.5);
        for (let x = 0; x < 384; x += 2) {
          const yy = top + Math.round(Math.sin(x / 11 + s.t / 90) * 3);
          g.rect(x, yy, 2, 2, '#1B1733');
        }
      });
    },
  });
  // the tags pulse together
  for (let i = 0; i < 4; i++) s.bossChime.pops[i] = 150;
  let k = 0;
  for (const p of s.bossParts) {
    if (p.broken) continue;
    const kk = key(p.id);
    s.sfxLater('se_h_howl', { pitch: HOWL_PITCH[kk] }, 200 * k++);
    e.params['shake_' + kk] = s.t;
  }
  yield* hitLoop(s, {
    ...common,
    windupF: Math.round(900 / FRAME),
    hits: [0],
    bang: () => all,
    onFrame: (f, _i, toHit) => {
      wave.a = Math.min(1, f / 20);
      wave.y = -60 + Math.min(1, f / 54) * 80;
      if (toHit === 0) wave.y = 250;
    },
    onHit: (i, r) => {
      resolveGuard(r, i);
      s.sfx('se_h_yofukashi');
      s.shake(4, 4, 12);
      for (const t of all) {
        const base = e.def.atk * 3 * (1 + 0.25 * e.stages.atk.lv) - t.m.def * (1 + 0.25 * t.stages.def.lv) * 0.5;
        const d = fixedDamage(Math.max(1, base), (r ? 0.5 : 1) * (t.guard ? 0.5 : 1));
        hurtParty(s, t, d, { tsukkomi: r });
      }
    },
  });
  for (let t = 0; t < 10; t++) {
    wave.y = 100 + t * 30;
    wave.a = 1 - t / 10;
    yield null;
  }
  fx.done = true;
  pages.push(...e.def.texts.extra.yofukashiHit);
  if (!st.anySuccess) {
    for (const t of all) {
      if (!t.alive) continue;
      if (rng.next() < 0.3 * (1 - t.m.luck / 100)) {
        giveStatus(s, t, 'status_nemuri', rng.int(1, 2));
        pages.push(...fillAll(SYS.nemuriOn, { target: t.name }));
      }
    }
  }
  // the dark stays: the background sinks one step (max 2)
  y.darkSteps = Math.min(2, y.darkSteps + 1);
}

// ---- round start / end (10.4) ---------------------------------------------------------------

export function* bossRoundStart(_s: BattleScene): Co {}

/**
 * Round end (10.4): light → 「……だれか、いますか？」 (no roll call);
 * dark → 点呼 (1 name, 2 in phase 2 unless two ラッパ are broken); the 4th
 * tag → 夜ふかし at once; then the light rounds / the tomato's recharge move on.
 */
export function* bossRoundEnd(s: BattleScene): Co {
  const e = boss(s);
  if (!e || !e.alive || s.memo.bossFinal) return;
  const y = yobiState(s);
  const auto = { autoMs: 500, minMs: 500, voice: 'yobimodoshi' };
  if (y.light) {
    yield* s.say(e.def.texts.extra.tenkoLight, false, auto);
  } else {
    const n = (s.memo.bossPhase ?? 1) >= 2 && brokenCount(s) < 2 ? 2 : 1;
    yield* tenko(s, e, n);
    if (s.bossChime.lit >= 4) {
      yield* s.say(e.def.texts.extra.tenko4 ?? [], false);
      const { doEnemyAction } = (yield import('./enemy')) as typeof import('./enemy');
      yield* doEnemyAction(s, e, 'skill_yobi_yofukashi');
      // the tags go out from the right, 100ms apart
      for (let i = 3; i >= 0; i--) {
        s.bossChime.lit = i;
        yield 100;
      }
      s.setMusicParam('tenko', 0);
      if (s.party.some((u) => u.alive)) yield* s.say(e.def.texts.extra.yofukashiAfter);
    } else if (s.bossChime.lit >= 3 && !y.tomatoUsed && !s.memo.tomatoTutShown) {
      // 付箋 flag_tut_tomato: the first time three tags are lit and the tomato is unused
      s.memo.tomatoTutShown = 1;
      s.memo.tomatoTut = 1;
    }
  }
  // the light rounds and the recharge move on
  if (y.light) {
    y.lightRound++;
    if (y.lightRound > 2) yield* dim(s, e);
  } else if (y.charge > 0) {
    y.charge--;
    y.tagPop = s.t;
  }
}

/** One 点呼 (14.4): the south mouth lights, "……$name。", a tag lights (1.6 → 1.0), 「へんじが ありません。」. */
function* tenko(s: BattleScene, e: EnemyUnit, n: number): Co {
  const y = yobiState(s);
  const names = [TENKO_NAMES[y.names % TENKO_NAMES.length], TENKO_NAMES[(y.names + 1) % TENKO_NAMES.length]];
  y.names += n;
  e.params.mouthPulse_south = s.t;
  (s.bg as { tenkoAt?: number }).tenkoAt = s.t;
  s.bg.flags.tenkoAt = s.t;
  const [mx, my] = mouth(e, 'south');
  s.addFx({
    layer: 'world',
    dur: 700,
    draw: (g, t) => {
      const p = t / 700;
      g.alpha(0.3 * (1 - p), () => {
        const r = 4 + p * 40;
        for (let a = 0; a < 48; a++) {
          const an = (a / 48) * Math.PI * 2;
          g.px(Math.round(mx + Math.cos(an) * r), Math.round(my + Math.sin(an) * r * 0.6), '#F4F1E8');
        }
      });
    },
  });
  yield 150;
  const auto = { autoMs: 500, minMs: 500, voice: 'yobimodoshi' };
  const light = (i: number) => {
    const lit = Math.min(4, s.bossChime.lit + 1);
    s.bossChime.lit = lit;
    s.bossChime.pops[lit - 1] = 150;
    if (lit <= 3) s.sfx('se_h_tenko', { note: TENKO_NOTES[lit - 1] });
    s.setMusicParam('tenko', lit);
    void i;
  };
  if (n === 1) {
    s.msg.post(fillAll(e.def.texts.extra.tenko.slice(0, 1), { name: names[0] }), auto);
    yield 250;
    light(0);
    yield () => !s.msg.busy;
    yield* s.say(e.def.texts.extra.tenko.slice(1), false, auto);
  } else {
    s.msg.post(fillAll(e.def.texts.extra.tenko2, { name: names[0], name2: names[1] }), { ...auto, autoMs: 700, minMs: 900 });
    yield 250;
    light(0);
    yield 150;
    if (s.bossChime.lit < 4) light(1);
    yield () => !s.msg.busy;
  }
}

/** 14.3: the light settles — the glow and the orange band fade, the boss sinks dark (top-down). */
function* dim(s: BattleScene, e: EnemyUnit): Co {
  const y = yobiState(s);
  y.light = false;
  y.lightRound = 0;
  y.lightTo = 0;
  y.lightDir = -1;
  y.glowTo = 0;
  y.charge = 2;
  y.tagPop = s.t;
  s.sfx('se_h_dim');
  s.setMusicParam('h_light', 0);
  syncBossFlags(s, e);
  // the marker's tomato turns dull and fades
  const who = y.raiser;
  y.raiser = null;
  if (who) {
    const [px] = PANEL_POS[who] ?? [104, 150];
    const img = tomatoIcon('charge');
    s.addFx({ layer: 'top', dur: 400, ui: true, draw: (g, t) => g.alpha(1 - t / 400, () => g.img(img, px + 4, 126 + Math.round(t / 80))) });
  }
  yield* s.say(SYS2.tomatoDim);
}

// ---- the tomato (10.3, 14.2) ------------------------------------------------------------------

/** Party action: hold up the はなまるトマト (priority +2). */
export function* raiseTomato(s: BattleScene, u: PartyUnit): Co {
  const y = yobiState(s);
  const e = boss(s);
  if (!e) return;
  if (y.light) {
    yield* s.say(SYS2.tomatoLit);
    return;
  }
  if (y.charge > 0) {
    yield* s.say(SYS2.tomatoCharging);
    return;
  }
  y.tomatoUsed = true;
  hideSticky(s);
  const kan = u.id === 'kanenari';
  const pages = fillAll(kan ? SYS2.tomatoRaiseKanenari : SYS2.tomatoRaise, { actor: u.name });
  s.msgInteractive = true;
  s.msg.post(pages.slice(0, 1));
  // 0–300ms: the net rises (Minato: lower left → (96,120); Kanenari-kun: his back from the lower right)
  const net = { x: kan ? 300 : 96, y: 216 + 40, a: 1 };
  const back = kan ? { x: 330, y: 250, frame: 'hold' } : null;
  const netFx = s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    draw: (g) => {
      if (back) {
        const img = kanenariBack(back.frame);
        g.alpha(net.a, () => g.img(img, Math.round(back.x - img.width / 2), Math.round(back.y - img.height)));
      }
      const img = tomatoNet(72, true);
      g.alpha(net.a, () => g.img(img, Math.round(net.x - img.width / 2), Math.round(net.y - 10)));
    },
  });
  for (let t = 0; t <= 300; t += FRAME) {
    const p = ease.backOut(Math.min(1, t / 300));
    net.y = 256 - (256 - 110) * p;
    if (back) {
      back.x = 330 - 30 * p;
      back.y = 250 - (250 - 168) * p;
      net.y = back.y - 52 - 12 * (1 - p);
    }
    yield null;
  }
  // 300ms: the light spreads from the net (0 → 260px in 400ms, additive α35%)
  s.sfx('se_h_tomato_glow');
  lightBurst(s, net.x, net.y, 400, 0.35);
  yield 400;
  // 700ms: the boss lights from the bottom up; the band's orange; the tags stop
  y.light = true;
  y.lightRound = 1;
  y.lightTo = 1;
  y.lightDir = 1;
  y.raiser = u.id;
  y.raiseT = s.t;
  y.tagPop = s.t;
  syncBossFlags(s, e);
  s.setMusicParam('h_light', 1);
  yield 300;
  // 1000ms: it settles — the under-glow stays, the net shrinks to the marker
  y.glowTo = 1;
  const [px] = PANEL_POS[u.id] ?? [104, 150];
  const x0 = net.x;
  const y0 = net.y;
  for (let t = 0; t <= 200; t += FRAME) {
    const p = ease.quadIn(Math.min(1, t / 200));
    net.x = x0 + (px + 10 - x0) * p;
    net.y = y0 + (126 - y0) * p;
    net.a = 1 - p;
    if (back) back.y += 4;
    yield null;
  }
  netFx.done = true;
  yield () => !s.msg.busy;
  yield* s.say(pages.slice(1));
  s.msgInteractive = false;
  // 付箋 flag_tut_rappa: the first time it is light
  if (!s.memo.rappaTutShown) {
    s.memo.rappaTutShown = 1;
    showSticky(s, 'rappa', 'flag_tut_rappa', false, 0, 0, 'left');
    s.memo.rappaTut = 1;
  }
}

/** The light spreading from a point: radius 0 → 260px over `ms` (#FFE7A3 core, #F2894B rim). */
function lightBurst(s: BattleScene, x: number, y: number, ms: number, alpha: number, hold = 300): void {
  s.addFx({
    layer: 'top',
    dur: ms + hold,
    ui: true,
    draw: (g, t) => {
      const p = Math.min(1, t / ms);
      const r = Math.round(260 * ease.quadOut(p));
      const a = alpha * (t > ms ? 1 - (t - ms) / hold : 1);
      const ctx = g.ctx;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const grad = ctx.createRadialGradient(x, y, 0, x, y, Math.max(1, r));
      grad.addColorStop(0, `rgba(255,231,163,${a})`);
      grad.addColorStop(0.6, `rgba(242,137,75,${a * 0.8})`);
      grad.addColorStop(1, 'rgba(242,137,75,0)');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 384, 216);
      ctx.restore();
    },
  });
}

// ---- parts (10.2, 14.6) -----------------------------------------------------------------------

/** みました on a lit ラッパ: 部位破壊 (50 × the judgement), the shape, the howl, it droops. */
export function* onBossPartBreak(s: BattleScene, e: EnemyUnit, part: BossPart, j: Judge): Co {
  part.broken = true;
  part.glow = false;
  syncBossFlags(s, e);
  const k = key(part.id);
  s.sfx('se_part_break');
  s.hitstop(10);
  s.flash('#FFF6D8', 0.4, 2);
  const x = e.left + part.box[0] + part.box[2] / 2;
  const yy = e.top + part.box[1] + part.box[3] / 2;
  s.stars(x, yy, 6);
  const box = { x0: e.left + part.box[0], y0: e.top + part.box[1], x1: e.left + part.box[0] + part.box[2], y1: e.top + part.box[1] + part.box[3] };
  s.labelNear(LABEL.buhin, () => box, x < e.x ? ['left', 'below', 'aboveLeft', 'right'] : ['right', 'below', 'aboveRight', 'left'], 'shu', 900, false, 2 * FRAME);
  const dmg = fixedDamage(50 * JUDGE_MUL[j]);
  hurtEnemy(s, e, dmg, { big: j === 'kukkiri', at: [Math.round(x), Math.round(yy)] });
  knock(s, e, 2);
  // the shape it called floats in its mouth for 1s; the howl dies away (0.6s); it droops (150ms)
  const y = yobiState(s);
  y.shapes.push({ part: part.id, t: 0 });
  s.sfxLater('se_h_howl', { pitch: HOWL_PITCH[k] }, 120);
  e.params['droopAt_' + k] = s.t + 600;
  yield 400;
  yield* s.say([
    ...fillAll(e.def.texts.extra.breakFirst, { part: part.name }),
    ...(e.def.texts.extra['break_' + part.id] ?? []),
  ]);
  yield* checkBossPhase(s, e);
}

export function* onBossBodyMimashita(s: BattleScene, e: EnemyUnit): Co {
  yield* s.say(e.def.texts.extra.bodyMimashita);
}

/** やりなおし: the last lit tag is circled in red pen and goes blank. */
export function* bossUndo(s: BattleScene, e: EnemyUnit, j: Judge): Co {
  if (s.bossChime.lit > 0) {
    const i = s.bossChime.lit - 1;
    s.addFx({
      layer: 'top',
      dur: 500,
      ui: true,
      draw: (g, t) => {
        const x = [305, 322, 339, 356][i] + 7;
        const y = s.msg.bottom + 2 + 10;
        const k = Math.min(1, t / 250);
        for (let a = 0; a < 40 * k; a++) {
          const an = -Math.PI / 2 - (a / 40) * Math.PI * 2;
          g.px(Math.round(x + Math.cos(an) * 10), Math.round(y + Math.sin(an) * 10), '#E23B2E');
        }
      },
    });
    s.sfx('se_h_tenko', { note: TENKO_NOTES[Math.min(2, i)], pitch: 0.5, vol: 0.5 });
    yield 300;
    s.bossChime.lit--;
    s.setMusicParam('tenko', s.bossChime.lit);
    yield* s.say(SYS2.yarinaoshiTenko);
  } else yield* s.say(SYS.yarinaoshiNone);
  if (j === 'kukkiri') {
    e.status.bokemake = true;
    bokemakeLabel(s, e);
  }
}

// ---- phases (10.7, 10.8) -------------------------------------------------------------------------

export function* checkBossPhase(s: BattleScene, e: EnemyUnit): Co<boolean> {
  if (s.memo.bossFinal) return false;
  if (e.hp <= e.maxHp * 0.2) {
    yield* bossFinal(s, e);
    return true;
  }
  if ((s.memo.bossPhase ?? 1) < 2 && e.hp <= e.maxHp * 0.5) yield* bossPhase2(s, e);
  return false;
}

function* bossPhase2(s: BattleScene, e: EnemyUnit): Co {
  s.memo.bossPhase = 2;
  s.memo.phase2Fresh = 1;
  s.hitstop(8);
  s.shake(3, 3, 10);
  e.whiteFrames = 1;
  yield 200;
  // the name tags flow twice as fast (800ms), the waves swell
  s.bg.flags.phase2 = 1;
  s.bg.waveTarget = { A: 3 };
  yield 200;
  // 400ms: 0.3s of sunset in the sky (the tomato's memory); one silent beat
  s.bg.flags.sunsetAt = s.t;
  muteMusic(0.45);
  yield 300;
  sfx('se_boss_voice');
  yield* s.say(e.def.texts.extra.phase2, false, { voice: 'yobimodoshi' });
  s.setMusicParam('boss_phase', 2);
  setFlag('flag_ch2_boss_phase', 2);
  syncBossFlags(s, e);
}

/** The final phase (10.8). */
function* bossFinal(s: BattleScene, e: EnemyUnit): Co {
  const y = yobiState(s);
  s.memo.bossFinal = 1;
  s.memo.bossPhase = 3;
  setFlag('flag_ch2_boss_phase', 3);
  e.flags.final = 1;
  hideSticky(s);
  // 0: the tags slow to a stop (500ms); the music sleeps in 1.0s, the insects stay
  s.bg.flags.final = 1;
  s.setMusicParam('boss_phase', 3);
  yield 600;
  const voice = { voice: 'yobimodoshi' };
  yield* s.say(e.def.texts.extra.final1);
  yield* s.say(e.def.texts.extra.final2, false, voice);
  // Kanenari-kun steps forward: his panel hops 4px, his back walks up to (192,176)
  const k = s.kanenari;
  if (k) {
    k.bounceT = 250;
    k.bounceAmp = 4;
    k.away = false;
    for (const st2 of ['status_rusu', 'status_henji', 'status_nemuri', 'status_toosenbo']) delete k.m.status[st2];
  }
  s.msg.post(e.def.texts.extra.final3);
  yield 300;
  y.kanenariUp = { x: 192, y: 250, frame: 'walk1', a: 1 };
  for (let t = 0, n = 0; t < 500; t += FRAME) {
    y.kanenariUp.y = 250 - 74 * ease.quadOut(t / 500);
    y.kanenariUp.frame = Math.floor(t / 150) % 2 ? 'walk1' : 'walk2';
    if (t >= n * 170 && n < 3) {
      sfx('se_step_kanenari');
      n++;
    }
    yield null;
  }
  y.kanenariUp.frame = 'raise';
  yield () => !s.msg.busy;
  // +800ms: the net arcs from Minato's panel into his hand (200ms)
  const net = { x: 124, y: 150, a: 1 };
  sfx('se_swing', { vol: 0.5 });
  const netFx = s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    draw: (g) => {
      const img = tomatoNet(40, true);
      g.alpha(net.a, () => g.img(img, Math.round(net.x - img.width / 2), Math.round(net.y - 10)));
    },
  });
  for (let t = 0; t <= 200; t += FRAME) {
    const p = Math.min(1, t / 200);
    net.x = 124 + (205 - 124) * p;
    net.y = 150 + (120 - 150) * p - Math.sin(p * Math.PI) * 40;
    yield null;
  }
  netFx.done = true;
  y.kanenariUp.frame = 'hold';
  yield* s.say(e.def.texts.extra.final4);
  // +1000ms: held up high like a banner (the net at (192,112)); the light fills the screen (2.0s)
  sfx('se_h_tomato_glow', { grade: 'kukkiri' });
  y.light = true;
  y.lightTo = 1;
  y.lightDir = 1;
  y.glowTo = 1;
  syncBossFlags(s, e);
  s.setMusicParam('h_light', 1);
  lightBurst(s, 205, 100, 2000, 0.35, 600);
  for (let t = 0; t < 2000; t += FRAME) {
    y.finale = Math.min(1, t / 2000);
    yield null;
  }
  // +3000ms: two flips
  yield* s.say(e.def.texts.extra.finalFlipText.slice(0, 1), false);
  showFlip(s, e.def.texts.extra.finalFlip[0].replace(/[（）]/g, ''), 1400);
  yield 600;
  showFlip(s, e.def.texts.extra.finalFlip[1].replace(/[（）]/g, ''), 1600);
  yield* s.say(e.def.texts.extra.finalFlipText.slice(1), false);
  // the picture (0.8s cross-fade); only the insects; the village is seen
  y.cutT = 0;
  y.cutCue = 0;
  const cutFx = s.addFx({
    layer: 'back',
    dur: 0,
    ui: true,
    draw: () => {},
    update(dt) {
      y.cutT += dt;
    },
  });
  for (let t = 0; t <= 800; t += FRAME) {
    y.cut = Math.min(1, t / 800);
    yield null;
  }
  const cut = e.def.texts.extra.finalCut;
  for (let i = 0; i < cut.length; i++) {
    y.cutCue = i;
    yield* s.say([cut[i]], false, i === 0 ? {} : voice);
  }
  // back to the battle (0.6s) — Kanenari-kun still holding it up
  for (let t = 0; t <= 600; t += FRAME) {
    y.cut = 1 - Math.min(1, t / 600);
    yield null;
  }
  y.cut = 0;
  cutFx.done = true;
  // the hanko case: the おやすみなさい outline fills with vermilion
  const mi = s.minato;
  yield* playHankoLearnIn(s, 'skill_oyasuminasai', e.def.texts.extra.final5);
  if (mi && !mi.m.skills.includes('skill_oyasuminasai')) mi.m.skills.push('skill_oyasuminasai');
  s.msg.setStatic(e.def.texts.extra.finalPrompt[0]);
  if (mi && !mi.alive) {
    mi.m.hp = 1;
    delete mi.m.status.status_hebatta;
    mi.drop = 0;
  }
  if (mi) for (const st2 of ['status_nemuri', 'status_tsukamare', 'status_toosenbo', 'status_konran', 'status_henji']) delete mi.m.status[st2];
}

// ---- おやすみなさい (5.2, 10.8) -------------------------------------------------------------------

/** The last stamp: any judgement works. */
export function* doOyasuminasai(s: BattleScene, u: PartyUnit): Co {
  const e = boss(s);
  if (!e) return;
  const y = yobiState(s);
  s.msg.setStatic(e.def.texts.extra.finalPrompt[0]);
  const j = yield* holdStamp(s, u);
  s.msg.clearStatic();
  const big = oyasumiSeal(j === 'kasure' ? 0.3 : 0);
  const cx = e.coreX;
  const cy = e.coreY + s.bandDip(e);
  const drop = { p: 0 };
  y.seal = { img: big, y: -40 };
  const markFx = s.addFx({
    layer: 'world',
    dur: 0,
    draw: (g) => {
      const yy = -40 + (cy + 40) * ease.cubicIn(drop.p);
      g.alpha(1 - y.lampOff * 0.3, () => g.img(big, Math.round(cx - big.width / 2), Math.round(yy - big.height / 2)));
    },
  });
  for (let i = 1; i <= 5; i++) {
    drop.p = i / 5;
    yield null;
  }
  // impact: hitstop 20f, white 3f, no shake
  s.hitstop(20);
  s.flash('#FFF6D8', 1, 3);
  sfx('se_stamp_heavy', { pitch: 0.85 });
  sfx('se_star');
  starRain(s, j === 'kukkiri' ? 200 : 40, 1500);
  for (const p of s.party) s.mood(p, 'happy', 12000);
  s.msg.post(e.def.texts.extra.finalStamp);
  yield 1000;
  yield () => !s.msg.busy;
  yield* s.say(e.def.texts.extra.finalGoodnight, false, { voice: 'yobimodoshi' });
  // the lamp dies away (1.0s) with the closing chime an octave down; the mouths go dark E→W→S→N
  sfx('se_pa_chime_end', { pitch: 0.5, vol: 0.8 });
  for (let t = 0; t <= 1000; t += FRAME) {
    y.lampOff = Math.min(1, t / 1000);
    const n = Math.floor(t / 150);
    for (let i = 0; i < 4 && i <= n; i++) e.params['mouthOn_' + key(RAPPA_ORDER[i])] = 0;
    yield null;
  }
  e.params.mouthsOff = 1;
  yield* s.say(e.def.texts.extra.finalLamp);
  // darkness (2.0s, complete silence): the night falls asleep
  stopAllAmbient(1.5);
  const dark = { a: 0 };
  const darkFx = s.addFx({ layer: 'top', dur: 0, ui: true, draw: (g) => g.rect(0, 0, 384, 216, '#0B0B14', dark.a) });
  s.showUi = false;
  for (let t = 0; t <= 800; t += FRAME) {
    dark.a = Math.min(1, t / 800);
    yield null;
  }
  y.black = true;
  y.kanenariUp = null;
  darkFx.done = true;
  markFx.done = true;
  yield 1200;
  e.dead = true;
  e.visible = false;
  e.hp = 0;
  s.memo.bossWon = 1;
}

/** Tiny stars fill the screen (1px #FFF6D8) and twinkle out over 1.5s — the night closing its eyes. */
function starRain(s: BattleScene, n: number, ms: number): void {
  const list: { x: number; y: number; t0: number; tw: number }[] = [];
  for (let i = 0; i < n; i++) list.push({ x: rng.int(2, 381), y: rng.int(s.msg.bottom + 2, 146), t0: rng.range(0, ms * 0.5), tw: rng.range(80, 200) });
  s.addFx({
    layer: 'top',
    dur: ms + 600,
    ui: true,
    draw: (g, t) => {
      for (const st of list) {
        if (t < st.t0) continue;
        const life = t - st.t0;
        const a = life < 120 ? life / 120 : Math.max(0, 1 - (t - ms * 0.8) / (ms * 0.2 + 600));
        if (a <= 0) continue;
        const tw = Math.floor(life / st.tw) % 3 === 0;
        g.alpha(a, () => {
          g.px(st.x, st.y, '#FFF6D8');
          if (tw) {
            g.px(st.x - 1, st.y, '#FFE7A3');
            g.px(st.x + 1, st.y, '#FFE7A3');
            g.px(st.x, st.y - 1, '#FFE7A3');
            g.px(st.x, st.y + 1, '#FFE7A3');
          }
        });
      }
    },
  });
}

const sealCache = new Map<number, HTMLCanvasElement>();
/** The big 「おやすみなさい」 seal with five 1px stars round it (2 up, 1 each side, 1 down). */
function oyasumiSeal(worn: number): HTMLCanvasElement {
  let c = sealCache.get(worn);
  if (c) return c;
  const base = finalSeal('おやすみなさい', worn);
  const [cv, ctx] = makeCanvas(base.width + 12, base.height + 12);
  ctx.drawImage(base, 6, 6);
  const W = cv.width;
  const H = cv.height;
  const star = (x: number, y: number) => {
    ctx.fillStyle = '#E23B2E';
    ctx.fillRect(x, y - 1, 1, 3);
    ctx.fillRect(x - 1, y, 3, 1);
    ctx.fillStyle = '#FFF6D8';
    ctx.fillRect(x, y, 1, 1);
  };
  star(Math.round(W * 0.35), 2);
  star(Math.round(W * 0.65), 2);
  star(2, Math.round(H / 2));
  star(W - 3, Math.round(H / 2));
  star(Math.round(W / 2), H - 3);
  c = cv;
  sealCache.set(worn, c);
  void BAYER4;
  return c;
}

// ---- the quiet results (16.2) -------------------------------------------------------------------

/** Is the screen in the finale's black (results drawn on black)? */
export function yobiBlack(s: BattleScene): boolean {
  return yobiState(s).black;
}

/** A 1-line "ボス の 名札" icon used by the target list. */
export function rappaTargetName(s: BattleScene, part: BossPart): string {
  return yobiState(s).light ? part.name : SYS2.rappaUnknown;
}

export { ovalStamp, changeStage };
