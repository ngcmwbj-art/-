// Enemy actions (9.4, 10.3, 11, 16.6–16.7): telegraph text → wind-up →
// "！" → frame-exact tsukkomi windows → hit(s) → results.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag } from '../game/state';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { fillAll, getEnemy, getSkill, LABEL, SYS, type SkillDef } from '../data/battle';
import type { AiCtx } from '../data/battle/types';
import type { BattleScene } from './scene';
import { FRAME, SLOTS } from './scene';
import { calcDamage, EnemyUnit, statusChance, type PartyUnit } from './model';
import {
  addKire, changeStage, giveStatus, hideSticky, healParty, hurtEnemy, hurtParty, kireFullPages, panelImpact, showSticky, statusText, tsukkomiFeel, type Guarded,
} from './common';
import {
  bokemakeLabel, lateTip, markLineSeen, pickLine, popBang, RING_LEAD, showBang, showFlip, showKakimoji, showTsukRing, tsukkomiUnit, tsukkomiWindows, type TsukRing,
} from './tsukkomi';
import { coinShiny, glove, meishiCard, musicNote, uwabaki, waterDrop, feather, spring, drawArc } from './art/fxart';
import { PANEL_POS } from './ui/panels';
import { C } from './ui/note';

// ---- AI --------------------------------------------------------------------------------

export function aiContext(s: BattleScene, e: EnemyUnit, round: number): AiCtx {
  return {
    round,
    hpRate: e.hpRate,
    mem: e.mem,
    shared: s.shared,
    sameCount: s.aliveEnemies.filter((o) => o.id === e.id).length,
    enemyCount: s.aliveEnemies.length,
    mimasareta: e.mimaEver,
    atkStage: e.stages.atk.lv,
    targets: s.party.filter((u) => u.targetable).map((u) => ({ id: u.id, hpRate: u.hpRate, grabbed: u.has('status_tsukamare'), canAct: u.canAct })),
    has: (st: string) => !!(e.status as Record<string, unknown>)[st.replace('status_', '')] || (st === 'status_hiraki' && !!e.status.hiraki) || (st === 'status_tame' && !!e.status.tame),
    pick: (table) => pickWeighted(e, table),
  };
}

function pickWeighted(e: EnemyUnit, table: [string, number][]): string {
  const last2 = e.lastSkills.slice(-2);
  const tripled = (id: string) => last2.length === 2 && last2[0] === id && last2[1] === id;
  let t = table.filter(([id, w]) => w > 0 && !tripled(id));
  if (!t.length) t = table.filter(([, w]) => w > 0);
  if (!t.length) return 'skill_idle';
  return rng.weighted(t);
}

export function decideEnemy(s: BattleScene, e: EnemyUnit, round: number): string {
  const id = e.def.ai(aiContext(s, e, round));
  return id;
}

// ---- targets ---------------------------------------------------------------------------

function targetable(s: BattleScene): PartyUnit[] {
  return s.party.filter((u) => u.targetable);
}

function pickTarget(s: BattleScene, e: EnemyUnit, sk: SkillDef): PartyUnit | undefined {
  const list = targetable(s);
  if (!list.length) return undefined;
  if (sk.id === 'skill_momi_momi') return [...list].sort((a, b) => b.hpRate - a.hpRate)[0];
  if (sk.id === 'skill_kasa_dakitsuki') {
    const free = list.filter((u) => !u.has('status_tsukamare'));
    if (free.length) return rng.pick(free);
  }
  if (sk.id.startsWith('skill_kn_')) return s.minato;
  if (sk.target === 'kanenari') return s.kanenari && s.kanenari.targetable ? s.kanenari : undefined;
  return rng.pick(list);
}

// ---- generic hit loop -------------------------------------------------------------------

export interface HitRes {
  res: Guarded | 'miss';
  /** Resolved frame (relative to the windup start). */
  f: number;
}

export interface LoopOpts {
  /** Frames from windup start to the first hit. */
  windupF: number;
  /** Intervals (frames) before each subsequent hit; [0] for a single hit. */
  hits: number[];
  /** Panels that get the "!" for hit i. */
  bang: (i: number) => PartyUnit[];
  /** Tsukkomi allowed at all. */
  tsukkomi: boolean;
  onFrame?: (f: number, hitIndex: number, framesToHit: number) => void;
  onHit: (i: number, r: Guarded | null) => Co | void;
  /** Tutorial freeze at hit −8f (the very first tsukkomi). */
  tutorial?: boolean;
}

/**
 * Frame-accurate wind-up + hits with the tsukkomi windows of 10.3. Returns the
 * per-hit results.
 */
export function* hitLoop(s: BattleScene, o: LoopOpts): Co<(Guarded | null)[]> {
  const W = tsukkomiWindows();
  const hitFrames: number[] = [];
  let acc = o.windupF;
  o.hits.forEach((iv, i) => {
    acc += i === 0 ? 0 : Math.max(14, iv);
    hitFrames.push(acc);
  });
  const results: (Guarded | null)[] = [];
  let hi = 0;
  let pending: Guarded = null;
  let kabuse = false;
  let bangShown = false;
  let bangDone = false;
  let frozenTut = false;
  let ring: TsukRing | null = null;
  // after a hit failed without an answer, a press in the next 24 frames is
  // a late reaction to the "!" (watched in real time, through the hitstop)
  let late: { on: boolean } | null = null;
  s.takeConfirm();
  for (let f = 0; hi < hitFrames.length; f++) {
    const hf = hitFrames[hi];
    const rel = f - hf;
    if (o.tsukkomi && !ring && rel >= -RING_LEAD) {
      ring = { rel, state: 'live', okT: 0 };
      showTsukRing(s, o.bang(hi), ring);
    }
    if (ring) ring.rel = rel;
    // the next hit's window is open: a press now answers that hit
    if (late && o.tsukkomi && rel >= W.from) late.on = false;
    if (o.tsukkomi && !bangShown && rel >= W.show) {
      bangShown = true;
      bangDone = false;
      const who = o.bang(hi);
      s.sfx('se_warn');
      showBang(s, who, () => bangDone, !!o.tutorial);
    }
    if (o.tutorial && rel === -8 && !frozenTut) {
      // time stops; the "!" pulses until the player presses (counts as just)
      frozenTut = true;
      showSticky(s, 'tsukkomi', 'flag_tut_tsukkomi', true);
      s.takeConfirm();
      while (!s.takeConfirm() && !s.auto.tsuk) {
        yield null;
      }
      hideSticky(s);
      pending = 'just';
      popBang(s, o.bang(hi), true);
      bangDone = true;
      if (ring) ring.state = 'ok';
    }
    let pressed = s.takeConfirm();
    const at = s.auto.tsuk;
    if (at === 'just' && rel === -1) pressed = true;
    if (at === 'ok' && rel === -8) pressed = true;
    if (at === 'kabuse' && rel === W.from - 5) pressed = true;
    if (o.tsukkomi && pressed && !pending && !kabuse) {
      if (rel < W.from) {
        kabuse = true;
        if (ring) ring.state = 'gray';
        s.sfx('se_kabuse');
        const [px, py] = PANEL_POS[o.bang(hi)[0]?.id ?? 'minato'];
        // beside the "!" bubble it jumped the gun on (never on the name tag)
        s.labelNear(LABEL.kabuse, () => ({ x0: px + 24, y0: py - 24, x1: px + 40, y1: py - 4 }), ['right', 'above', 'left'], 'gray', 700, true);
      } else if (rel <= W.to) {
        pending = rel >= W.justFrom && rel <= W.justTo ? 'just' : 'ok';
        popBang(s, o.bang(hi), pending === 'just');
        bangDone = true;
        if (ring) ring.state = 'ok';
      }
    }
    o.onFrame?.(f, hi, hf - f);
    let resolve = false;
    let r: Guarded | null = null;
    if (rel >= 0 && pending) {
      resolve = true;
      r = pending;
    } else if (rel >= W.to + 1 || (!o.tsukkomi && rel >= 0)) {
      resolve = true;
      r = null;
    }
    if (resolve) {
      bangDone = true;
      if (ring && ring.state !== 'ok') ring.state = 'done';
      ring = null;
      if (o.tsukkomi && !r && !kabuse) {
        if (late) late.on = false;
        late = watchLate(s, 24);
      }
      results.push(r);
      const co = o.onHit(hi, r);
      if (co) yield* co;
      hi++;
      pending = null;
      kabuse = false;
      bangShown = false;
    }
    yield null;
  }
  return results;
}

/** Watch `frames` frames (real time) for a late confirm press after a failed hit. */
function watchLate(s: BattleScene, frames: number): { on: boolean } {
  const w = { on: true };
  s.addFx({
    layer: 'top',
    dur: frames * FRAME,
    ui: true,
    draw: () => {},
    update() {
      if (!w.on) this.done = true;
      else if (game.input.pressed('confirm')) {
        lateTip(s);
        this.done = true;
      }
    },
  });
  return w;
}

// ---- small visual helpers ------------------------------------------------------------------

/** Where a thrown thing lands on a member's panel: the photo (the face that takes it). */
export function panelHitPoint(u: PartyUnit | null): [number, number] {
  if (!u) return [192, 170];
  const [px, py] = PANEL_POS[u.id];
  return [px + 20, py + 20];
}

interface ProjOpts {
  /** Afterimages (2 ghosts) behind it. */
  trail?: boolean;
  /** Landing offset from the photo centre. */
  dx?: number;
  dy?: number;
  /** Horizontal motion is linear (a lob) instead of accelerating (a throw). */
  lob?: boolean;
  /** Drops a little glint along the way. */
  sparkle?: boolean;
  /** A 4-point twinkle flashes on its rim every other 4 frames (a new coin). */
  glint?: boolean;
}

/**
 * A sprite flies from (x0,y0) to the member's photo while growing (it comes
 * toward the camera), arriving exactly at the hit frame.
 */
function projectile(s: BattleScene, img: () => HTMLCanvasElement, x0: number, y0: number, to: PartyUnit | null, frames: number, s0: number, s1: number, arc = 0, o: ProjOpts = {}): void {
  const [hx, hy] = panelHitPoint(to);
  const tx = hx + (o.dx ?? 0);
  const ty = hy + (o.dy ?? 0);
  const dur = frames * FRAME;
  const at = (t: number): [number, number, number] => {
    const p = Math.max(0, Math.min(1, t / dur));
    const k = o.lob ? p : ease.quadIn(p);
    const x = x0 + (tx - x0) * k;
    const y = y0 + (ty - y0) * (o.lob ? p * p : k) - Math.sin(p * Math.PI) * arc;
    return [x, y, s0 + (s1 - s0) * ease.quadIn(p)];
  };
  s.addFx({
    layer: 'top',
    dur,
    update() {
      if (o.sparkle && Math.floor(this.t / FRAME) % 3 === 0) {
        const [x, y] = at(this.t);
        s.burst(x, y, { count: 1, speed: [5, 20], life: [180, 260], colors: ['#FFF6D8', '#FFE7A3'], shape: 'sq', size: [1, 2], sizeEnd: 1 }, true);
      }
    },
    draw: (g, t) => {
      const im = img();
      const put = (tt: number, a: number) => {
        const [x, y, sc] = at(tt);
        const w = im.width * sc;
        const h = im.height * sc;
        g.alpha(a, () => g.ctx.drawImage(im, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h)));
      };
      if (o.trail) {
        put(t - 2 * FRAME, 0.22);
        put(t - FRAME, 0.45);
      }
      put(t, 1);
      if (o.glint && Math.floor(t / (4 * FRAME)) % 2 === 0) {
        const [x, y, sc] = at(t);
        const gx = Math.round(x + (im.width * sc) / 2 - 2);
        const gy = Math.round(y - (im.height * sc) / 2 + 1);
        g.rect(gx - 2, gy, 5, 1, '#FFF6D8');
        g.rect(gx, gy - 2, 1, 5, '#FFF6D8');
        g.px(gx, gy, '#FFFFFF');
      }
    },
  });
}

/** Lunge toward the camera: scale 1 → k → 1. */
function lunge(s: BattleScene, e: EnemyUnit, k: number, frames: number): void {
  rush(s, e, { scale: k, inF: frames, outF: frames });
}

/**
 * The enemy lunges at the party: it grows (toward the camera) and travels
 * (dx, dy) in `inF` frames — arriving on the hit — holds `holdF` and goes
 * back in `outF`. Hits during the hold get the whole body in the blow.
 */
function rush(s: BattleScene, e: EnemyUnit, o: { scale?: number; dx?: number; dy?: number; inF: number; holdF?: number; outF: number }): void {
  const inMs = o.inF * FRAME;
  const holdMs = (o.holdF ?? 0) * FRAME;
  const outMs = o.outF * FRAME;
  const k = o.scale ?? 1;
  s.addFx({
    layer: 'back',
    dur: inMs + holdMs + outMs,
    draw: () => {},
    update() {
      const t = this.t;
      let v: number;
      if (t < inMs) v = ease.quadIn(t / inMs);
      else if (t < inMs + holdMs) v = 1;
      else v = 1 - ease.quadInOut(Math.min(1, (t - inMs - holdMs) / outMs));
      if (e.dying) {
        this.done = true;
        return;
      }
      e.sx = e.sy = 1 + (k - 1) * v;
      e.offX = Math.round((o.dx ?? 0) * v);
      e.offY = Math.round((o.dy ?? 0) * v);
      if (t >= inMs + holdMs + outMs - 1) {
        e.sx = e.sy = 1;
        e.offX = e.offY = 0;
      }
    },
  });
}

/** Horizontal step toward a member's panel, capped (the enemy leans at them). */
function towardX(e: EnemyUnit, t: PartyUnit | null | undefined, k = 0.18, cap = 18): number {
  if (!t) return 0;
  const [hx] = panelHitPoint(t);
  return Math.max(-cap, Math.min(cap, Math.round((hx - e.x) * k)));
}

/**
 * A sound wave aimed at the party (熱唱): rings leave the enemy's mouth and
 * keep growing past the bottom of the screen — they visibly wash over the
 * panels — in warm yellow (#FFD23F α40%) with a lighter leading edge.
 */
function soundWave(s: BattleScene, x: number, y: number, n: number, gap = 120, ms = 520): void {
  for (let i = 0; i < n; i++) {
    const d = i * gap;
    s.addFx({
      layer: 'top',
      dur: ms + d,
      draw: (g, t) => {
        if (t < d) return;
        const p = (t - d) / ms;
        const r = 8 + ease.quadOut(p) * 190;
        const a = 0.4 * (1 - p * 0.6);
        g.alpha(a, () => {
          const steps = Math.max(24, Math.round(r * 2.2));
          for (let k = 0; k < steps; k++) {
            const an = (k / steps) * Math.PI * 2;
            const cx = x + Math.cos(an) * r;
            const cy = y + Math.sin(an) * r * 0.72;
            g.rect(Math.round(cx), Math.round(cy), 2, 2, '#FFD23F');
          }
        });
        g.alpha(a * 0.9, () => {
          const steps = Math.max(24, Math.round(r * 2.2));
          for (let k = 0; k < steps; k += 2) {
            const an = (k / steps) * Math.PI * 2;
            g.px(Math.round(x + Math.cos(an) * (r + 2)), Math.round(y + Math.sin(an) * (r + 2) * 0.72), '#FFF6D8');
          }
        });
      },
    });
  }
}

/** Expanding elliptical sound rings from a point. */
function soundRings(s: BattleScene, x: number, y: number, color: string, n: number, alpha = 0.6, ms = 600): void {
  for (let i = 0; i < n; i++) {
    const d = i * 140;
    s.addFx({
      layer: 'world',
      dur: ms + d,
      draw: (g, t) => {
        if (t < d) return;
        const p = (t - d) / ms;
        g.alpha(alpha * (1 - p), () => {
          const r = 6 + p * 60;
          for (let a = 0; a < 64; a++) {
            const an = (a / 64) * Math.PI * 2;
            g.px(Math.round(x + Math.cos(an) * r), Math.round(y + Math.sin(an) * r * 0.6), color);
            g.px(Math.round(x + Math.cos(an) * (r + 1)), Math.round(y + Math.sin(an) * (r + 1) * 0.6), color);
          }
        });
      },
    });
  }
}

/**
 * A voice that fills the air (セミの「人生最後の一声」, QA round 1): thick
 * rings (2px #F4F1E8 with an ink edge on the outside) burst from the mouth
 * and roll out past the edges of the stage, fading as they go. They are
 * the telegraph: you can see the scream coming at the panels.
 */
function voiceRings(s: BattleScene, x: () => number, y: () => number, n: number, gap = 110, ms = 560): void {
  for (let i = 0; i < n; i++) {
    const d = i * gap;
    s.addFx({
      layer: 'world',
      dur: ms + d,
      draw: (g, t) => {
        if (t < d) return;
        const p = (t - d) / ms;
        const r = 7 + ease.quadOut(p) * 150;
        const cx = x();
        const cy = y();
        const steps = Math.max(32, Math.round(r * 3));
        g.alpha(0.95 * (1 - p) ** 0.7, () => {
          for (let k = 0; k < steps; k++) {
            const an = (k / steps) * Math.PI * 2;
            const ca = Math.cos(an);
            const sa = Math.sin(an) * 0.72;
            g.px(Math.round(cx + ca * (r + 2)), Math.round(cy + sa * (r + 2)), C.ink);
            g.px(Math.round(cx + ca * (r + 1)), Math.round(cy + sa * (r + 1)), '#F4F1E8');
            g.px(Math.round(cx + ca * r), Math.round(cy + sa * r), '#F4F1E8');
          }
        });
      },
    });
  }
}

/**
 * Wind-up lean (QA round 1): over `frames` the enemy draws back away from
 * its target — the top of it tips back (shear), it slides back a few px and
 * squats a little — ready to spring.
 */
function leanBack(s: BattleScene, e: EnemyUnit, dir: number, frames: number): void {
  const ms = frames * FRAME;
  s.addFx({
    layer: 'back',
    dur: ms,
    draw: () => {},
    update() {
      if (e.dying) {
        this.done = true;
        return;
      }
      const k = ease.quadOut(Math.min(1, this.t / ms));
      e.shear = -dir * Math.round(5 * k);
      e.offX = -dir * Math.round(3 * k);
      e.offY = -Math.round(2 * k);
      e.sy = 1 - 0.06 * k;
      e.sx = 1 + 0.04 * k;
      if (this.t >= ms - 1) {
        e.shear = 0;
        e.sx = e.sy = 1;
      }
    },
  });
}

// ---- common hit resolution ----------------------------------------------------------------

function damageTo(s: BattleScene, e: EnemyUnit, t: PartyUnit, power: number, r: Guarded | null, stack = 0, scatter = false): number {
  const dmg = calcDamage({
    atk: e.def.atk,
    atkStage: e.stages.atk.lv,
    def: t.m.def,
    defStage: t.stages.def.lv,
    power,
    guard: t.guard,
    tsukkomi: !!r,
  });
  hurtParty(s, t, dmg, { tsukkomi: r, stack, scatter });
  return dmg;
}

interface ActState {
  anySuccess: boolean;
  lastJust: boolean;
  lastLine: number;
  results: (Guarded | null)[];
}

/** Tsukkomi aftermath (bokemake, kire, lettering) once the move's hits are done. */
function* tsukkomiAftermath(s: BattleScene, e: EnemyUnit, sk: SkillDef, st: ActState, letterMs = 0): Co {
  if (!st.anySuccess) {
    if (e.id === 'enemy_hato_kakaricho' && s.memo.tsukCount >= 1 && !s.memo.rhythmTip) {
      s.memo.rhythmTip = 1;
      showSticky(s, 'rhythm', undefined, false, 2800);
    }
    return;
  }
  if (e.alive) {
    // the very first tsukkomi success: a longer ボケ負け label and its sticky (10.5)
    const first = !s.memo.bokeTut && e.id === 'enemy_hato_kakaricho';
    e.status.bokemake = true;
    if (first) showSticky(s, 'tsukkomiOk', undefined, false, 2600, letterMs);
    bokemakeLabel(s, e, first, letterMs);
    s.memo.bokeTut = 1;
  }
  addKire(s, 1 + (st.lastJust ? 1 : 0));
  s.memo.tsukCount = (s.memo.tsukCount ?? 0) + 1;
  void sk;
}

function lineFor(s: BattleScene, e: EnemyUnit, sk: SkillDef, st: ActState): { n: number; text: string } {
  let linked = sk.tsukkomi;
  if (sk.id === 'skill_souji_dansa' && e.mem.dansaFail) linked = undefined;
  if (sk.id === 'skill_ojigi_otsuri' && !st.lastJust && st.results[st.results.length - 1] === null) linked = sk.tsukkomi;
  const n = pickLine(s, e, sk.id, linked);
  return { n, text: e.def.tsukkomi[n - 1] ?? '' };
}

/**
 * Show the lettering for the move (Minato's inner voice, or Kanenari's flip).
 * Returns how long it stays on screen (ms).
 */
function letter(s: BattleScene, e: EnemyUnit, sk: SkillDef, st: ActState): number {
  const tu = tsukkomiUnit(s);
  const { n, text } = lineFor(s, e, sk, st);
  st.lastLine = n;
  if (!text) return 0;
  markLineSeen(s, e, n);
  s.memo['used_' + sk.id] = 1;
  if (tu?.id === 'kanenari') return showFlip(s, text);
  return showKakimoji(s, text, st.lastJust);
}

// ---- the move runner ----------------------------------------------------------------------

export function* doEnemyAction(s: BattleScene, e: EnemyUnit, skillId: string, extra = false): Co {
  if (!e.alive) return;
  const sk = getSkill(skillId);
  if (!sk) return;
  // the command notebook notes the boke being played (a ボケ seal + its name)
  s.noteActing(skillId === 'skill_idle' || !sk.name ? e.name : sk.name, undefined, true);
  e.lastSkills.push(skillId);
  if (e.lastSkills.length > 4) e.lastSkills.shift();
  const eventKn = e.id === 'enemy_kanenari';
  const tu = tsukkomiUnit(s);
  const canTsuk = !eventKn && !!tu;
  const target = sk.target === 'enemy' || sk.target === 'kanenari' ? pickTarget(s, e, sk) : undefined;
  if ((sk.target === 'enemy' || sk.target === 'kanenari') && !target) {
    if (sk.target === 'kanenari') {
      // よいこは with nobody to send home: falls back to a plain move
      yield* doEnemyAction(s, e, 'skill_omu_tebukuro');
    }
    return;
  }
  const all = targetable(s);
  const st: ActState = { anySuccess: false, lastJust: false, lastLine: 0, results: [] };
  const bangSelf = () => (tu ? [tu] : []);
  const bang = (i: number): PartyUnit[] => {
    if (sk.target === 'allies') return all;
    if (sk.target === 'self' || sk.target === 'none') return bangSelf();
    if (sk.id === 'skill_ojigi_otsuri') return [otsuriTargets[i] ?? all[0]];
    return target ? [target] : bangSelf();
  };
  const otsuriTargets: PartyUnit[] = [];
  if (sk.id === 'skill_ojigi_otsuri') for (let i = 0; i < 5; i++) otsuriTargets.push(rng.pick(all));

  // 1. telegraph (the boke) — text keeps typing while the wind-up plays
  let tele = e.def.texts.tele[skillId] ?? [];
  if (skillId === 'skill_idle') {
    e.mem.idleN = ((e.mem.idleN ?? -1) + 1) % Math.max(1, e.def.texts.idle.length);
    tele = e.def.texts.idle[e.mem.idleN] ?? [];
  }
  if (skillId === 'skill_semi_shindafuri' && e.mem.shindafuriShown) tele = [];
  if (skillId === 'skill_semi_shindafuri') e.mem.shindafuriShown = 1;
  s.msg.replace(tele.slice(0, 1));
  const telePages = tele.slice(1);
  if (sk.big) for (const u of s.party) u.moodHold = 'surprised';
  if (sk.id === 'skill_kn_pose') e.params.pose = rng.int(0, 2);
  yield 250;

  // 2. wind-up → hits
  const windupF = Math.max(6, Math.round((sk.windupMs ?? 400) / FRAME));
  e.setPose('windup', skillId);
  const tutorial = e.id === 'enemy_hato_kakaricho' && skillId === 'skill_hato_meishi' && !flag('flag_tut_tsukkomi') && canTsuk;
  const hits = sk.hits ?? [0];
  const resolveGuard = (r: Guarded | null, i: number) => {
    st.results.push(r);
    if (r) {
      st.anySuccess = true;
      tsukkomiFeel(s, tu, r === 'just');
    }
    st.lastJust = i === hits.length - 1 ? r === 'just' : st.lastJust;
  };

  const common = {
    windupF,
    hits,
    bang,
    tsukkomi: canTsuk,
    tutorial,
  };

  switch (skillId) {
    // ---- ハト係長 --------------------------------------------------------------
    case 'skill_hato_meishi': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (toHit === 12) {
            e.setPose('attack', skillId);
            projectile(s, meishiCard, e.coreX - 14, e.coreY - 8, target!, 12, 1, 3);
            s.sfx('se_meishi');
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, target!, 0.6, r);
        },
      });
      break;
    }
    case 'skill_hato_kaigi': {
      s.sfx('se_coo');
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 20) s.sfx('se_coo', { pitch: 1.1 });
          if (toHit === 4) e.setPose('attack', skillId);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx(r ? 'se_bishi' : 'se_status');
          if (!r) target!.shakeT = 120;
        },
      });
      if (st.anySuccess) telePages.push(...e.def.texts.extra.kaigiGuard);
      else telePages.push(...changeStage(s, target!, 'hit', -1, 3, true), ...fillAll(e.def.texts.extra.kaigiResult, { target: target!.name }));
      break;
    }
    case 'skill_hato_teiji': {
      yield* selfMove(s, common, resolveGuard, () => e.setPose('attack', skillId));
      telePages.push(...e.def.texts.extra.teijiResult);
      break;
    }
    // ---- セミファイナル --------------------------------------------------------
    case 'skill_semi_shindafuri': {
      e.status.shindafuri = true;
      e.setPose('dead');
      yield* selfMove(s, { ...common }, resolveGuard, () => {
        e.setPose('twitch');
      });
      e.setPose('dead');
      break;
    }
    case 'skill_semi_final': {
      e.status.shindafuri = false;
      s.sfx('se_semi_buzz');
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 6) {
            e.setPose('attack', skillId);
            rush(s, e, { scale: 1.15, dy: 6, dx: towardX(e, target, 0.12, 12), inF: 6, holdF: 2, outF: 8 });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, target!, 0.45, r, i);
          s.sfx('se_semi_buzz', { pitch: 1 + i * 0.1 });
        },
      });
      telePages.push(...e.def.texts.extra.finalResult);
      break;
    }
    case 'skill_semi_miin': {
      e.status.shindafuri = false;
      s.sfx('se_semi_miin');
      e.setPose('attack', skillId);
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          // the whole body trembles harder as the scream builds
          const amp = toHit > 18 ? 1 : 2;
          e.offX = f % 2 ? amp : -amp;
          e.offY = f % 4 < 2 ? 0 : -1;
          // thick rings from the mouth, rolling out over the stage
          if (f % 9 === 0) voiceRings(s, () => e.faceX - 2, () => e.faceY + 2, 1);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          e.offX = e.offY = 0;
          voiceRings(s, () => e.faceX - 2, () => e.faceY + 2, 3, 70, 480);
        },
      });
      telePages.push(...e.def.texts.extra.miinResult);
      telePages.push(...applyStatusAll(s, all, sk, st));
      break;
    }
    // ---- コーン・ボーカル -------------------------------------------------------
    case 'skill_cone_nessho': {
      s.sfx('se_cone_sing');
      yield* hitLoop(s, {
        ...common,
        onFrame: (f) => {
          if (f % 10 === 0) {
            soundRings(s, e.x, e.headY + 6, '#F7C27A', 1, 0.55, 500);
            projectile(s, () => musicNote(f / 10), e.x + rng.int(-8, 8), e.headY + 4, rng.pick(all), 18, 1, 1.6, 12, { lob: true, dx: rng.int(-8, 8), dy: rng.int(-10, 0) });
          }
          // the belt-out itself: rings roll from the cone's mouth over the panels
          if (f % 9 === 3) soundWave(s, e.x, e.headY + 8, 1);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t, k) => damageTo(s, e, t, 0.5, r, k * 0));
        },
      });
      telePages.push(...e.def.texts.extra.nesshoResult);
      telePages.push(...applyStatusAll(s, all, sk, st));
      break;
    }
    case 'skill_cone_tsukodome': {
      s.sfx('se_siren');
      yield* hitLoop(s, {
        ...common,
        onHit: (i, r) => {
          resolveGuard(r, i);
          panelImpact(s, target!, true);
          if (!r) target!.shakeT = 120;
        },
      });
      if (st.anySuccess) telePages.push(...fillAll(e.def.texts.extra.tsukodomeGuard, { target: target!.name }));
      else telePages.push(...applyStatusOne(s, target!, sk, st));
      break;
    }
    case 'skill_cone_konkon': {
      yield* selfMove(s, common, resolveGuard, () => {
        s.sfx('se_cone_tap');
        e.setPose('attack', skillId);
      }, (f) => {
        if (f === 6) s.sfx('se_cone_tap', { pitch: 0.9 });
      });
      const called = yield* callCone(s);
      telePages.push(...(called ? e.def.texts.extra.konkonOk : e.def.texts.extra.konkonFail));
      break;
    }
    // ---- ワスレガサ ---------------------------------------------------------------
    case 'skill_kasa_dakitsuki': {
      const dir = Math.sign(towardX(e, target, 1, 999)) || 1;
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          // gathers itself: leans back away from the one it will hug
          if (f === 0) leanBack(s, e, dir, Math.max(1, toHit - 9));
          if (toHit === 9) {
            e.setPose('attack', skillId);
            // then springs out of its spot at the member's panel (1.0 → 1.3,
            // well toward them and down) and falls back
            rush(s, e, { scale: 1.3, dy: 14, dx: towardX(e, target, 0.3, 26), inF: 9, holdF: 5, outF: 10 });
            s.sfx('se_hug');
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          panelImpact(s, target!, !!r);
          if (!r) target!.shakeT = 160;
        },
      });
      if (st.anySuccess) telePages.push(...fillAll(e.def.texts.extra.dakitsukiGuard, { target: target!.name }));
      else telePages.push(...applyStatusOne(s, target!, sk, st));
      break;
    }
    case 'skill_kasa_hiraku': {
      yield* selfMove(s, common, resolveGuard, () => {
        s.sfx('se_umbrella_open');
        e.status.hiraki = 3;
        e.setPose('open');
      });
      break;
    }
    case 'skill_kasa_shizuku': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 14) projectile(s, waterDrop, e.x - 8 + rng.int(0, 16), e.top + e.sizeH * 0.55, target!, 14, 1, 2.2, 6);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx('se_drip');
          damageTo(s, e, target!, 0.35, r, i);
        },
      });
      break;
    }
    // ---- おじぎ自販機 -------------------------------------------------------------
    case 'skill_ojigi_otsuri': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, i, toHit) => {
          if (toHit === 16 && otsuriTargets[i]) {
            e.setPose('attack', skillId);
            // 1–3 ten-yen coins spray out of the dispenser and rain down on
            // the member's photo, spinning, arriving on the hit
            const n = rng.int(1, 3);
            const sx = e.left + 32;
            const sy = e.top + 70;
            for (let c = 0; c < n; c++) {
              const ph = rng.int(0, 3);
              const img = () => coinShiny(Math.floor(s.t / 50) + ph);
              projectile(s, img, sx + rng.int(-6, 6), sy, otsuriTargets[i], 16 - c, 1, 2, 34 + c * 10 + rng.int(0, 8), { lob: true, trail: true, sparkle: true, glint: true, dx: rng.int(-9, 9), dy: rng.int(-6, 4) });
            }
            s.burst(sx, sy + 2, { count: 3, speed: [30, 70], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [150, 250], colors: ['#FFE7A3', '#E8B070'], shape: 'sq', size: [1, 2] });
            s.sfx('se_coin', { pitch: 1 + i * 0.06 });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          const t = otsuriTargets[i];
          if (t && t.alive) {
            damageTo(s, e, t, 0.22, r, 0, true);
            // the coins bounce off the panel with a glint (チャリン)
            const [hx, hy] = panelHitPoint(t);
            s.burst(hx, hy - 4, { count: 3, speed: [50, 110], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [250, 380], colors: ['#E8B070', '#C08040', '#FFE7A3'], gravity: 420, shape: 'sq', size: [2, 2], sizeEnd: 1 }, true);
          }
        },
      });
      telePages.push(...e.def.texts.extra.otsuriResult);
      break;
    }
    case 'skill_ojigi_charge': {
      yield* selfMove(s, common, resolveGuard, () => e.setPose('charge'));
      e.status.tame = 'skill_ojigi_press';
      e.setPose('charge');
      const bg = s.bg as { charging?: boolean };
      if (bg.charging !== undefined) bg.charging = true;
      break;
    }
    case 'skill_ojigi_press': {
      e.status.tame = undefined;
      const bg = s.bg as { charging?: boolean };
      if (bg.charging !== undefined) bg.charging = false;
      const shadow = { a: 0 };
      const shFx = s.addFx({ layer: 'top', dur: 0, draw: (g) => g.rect(0, 0, 384, Math.round(216 * Math.min(1, shadow.a * 1.4)), '#1B1733', 0.5 * Math.min(1, shadow.a * 2)) });
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 13) e.setPose('rise');
          if (toHit === 7) {
            e.setPose('attack', skillId);
            lunge(s, e, 1.35, 7);
          }
          if (toHit <= 7) shadow.a = Math.min(1, (7 - toHit) / 7);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx('se_ojigi_press');
          s.shake(6, 6, 14);
          all.forEach((t) => damageTo(s, e, t, 1.4, r));
        },
      });
      for (let k = 0; k < 10; k++) {
        shadow.a = 1 - k / 10;
        yield null;
      }
      shFx.done = true;
      break;
    }
    case 'skill_ojigi_roulette': {
      s.sfx('se_roulette');
      e.setPose('roulette');
      let atari = false;
      yield* selfMove(s, common, resolveGuard, () => {
        atari = rng.next() < 1 / 3;
        e.params.roulette = atari ? 2 : 1;
        s.sfx(atari ? 'se_atari' : 'se_hazure');
      });
      yield* flushAfter(s, e, sk, st, [], tu);
      yield* s.say(atari ? e.def.texts.extra.atari : e.def.texts.extra.hazure);
      e.params.roulette = 0;
      e.setPose('idle');
      if (atari && !extra && e.alive && s.party.some((u) => u.targetable)) {
        const next = e.stages.atk.lv >= 2 ? 'skill_ojigi_otsuri' : rng.weighted<string>([['skill_ojigi_otsuri', 60], ['skill_ojigi_arigatou', 40]]);
        yield* doEnemyAction(s, e, next, true);
      }
      return;
    }
    case 'skill_ojigi_arigatou': {
      s.sfx('se_vending_voice');
      yield* selfMove(s, common, resolveGuard, () => {
        e.setPose('talk');
        soundRings(s, e.coreX, e.coreY, '#E84E3C', 2, 0.3, 500);
      });
      telePages.push(...changeStage(s, e, 'atk', 1, 3));
      break;
    }
    // ---- ソウジロウ ---------------------------------------------------------------
    case 'skill_souji_teinei': {
      s.sfx('se_vacuum');
      yield* hitLoop(s, {
        ...common,
        onFrame: (f) => {
          if (f % 3 === 0) {
            const [px, py] = PANEL_POS[target!.id];
            const sx = px + 20 + rng.int(-10, 10);
            const sy = py + rng.int(0, 10);
            s.addFx({
              layer: 'top',
              dur: 400,
              draw: (g, t) => {
                const p = ease.quadIn(t / 400);
                g.px(Math.round(sx + (e.coreX - sx) * p), Math.round(sy + (e.coreY - sy) * p), '#5CE1FF');
              },
            });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          const d = damageTo(s, e, target!, 0.8, r);
          e.hp = Math.min(e.maxHp, e.hp + d);
          const [nx, ny] = s.enemyNumberXY(e);
          s.number(nx, ny, d, { kind: 'heal' }, 'enemy', e);
        },
      });
      telePages.push(...fillAll(e.def.texts.extra.teineiResult, { target: target!.name }));
      break;
    }
    case 'skill_souji_dansa': {
      const ok = rng.next() < 0.5;
      e.mem.dansaFail = ok ? 0 : 1;
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 16) e.setPose('lift');
          if (toHit === 6) {
            if (ok) {
              e.setPose('attack', skillId);
              // clears the step and charges the member (8px forward)
              rush(s, e, { scale: 1.3, dy: 8, dx: towardX(e, target, 0.12, 12), inF: 6, holdF: 4, outF: 12 });
            } else e.setPose('fall');
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          if (ok) damageTo(s, e, target!, 1.2, r);
          else {
            s.sfx('se_bump');
            hurtEnemy(s, e, 8);
            s.shake(2, 2, 6);
          }
        },
      });
      if (!ok) telePages.push(...e.def.texts.extra.dansaFail);
      break;
    }
    case 'skill_souji_juden': {
      yield* selfMove(s, common, resolveGuard, () => e.setPose('charge'));
      telePages.push(...e.def.texts.extra.judenResult);
      break;
    }
    // ---- モミスギ ---------------------------------------------------------------------
    case 'skill_momi_momi': {
      s.sfx('se_momi');
      let over = false;
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 8) {
            e.setPose('attack', skillId);
            rush(s, e, { scale: 1.1, dy: 6, dx: towardX(e, target, 0.1, 10), inF: 8, holdF: 3, outF: 10 });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          const t = target!;
          const H = e.def.atk * 2 * (1 + 0.25 * e.stages.atk.lv);
          const overflow = t.m.hp + H - t.m.maxHp;
          if (overflow > 0) {
            over = true;
            let d = Math.round(overflow * 0.8);
            if (r) d = Math.round(d / 2);
            const newHp = Math.max(0, t.m.maxHp - d);
            const loss = t.m.hp - newHp;
            if (loss > 0) hurtParty(s, t, loss, { tsukkomi: r });
            else if (loss < 0) healParty(s, t, -loss);
          } else healParty(s, t, H);
        },
      });
      if (over) telePages.push(...e.def.texts.extra.momiOver);
      else telePages.push(...fillAll(e.def.texts.extra.momiHeal, { target: target!.name }));
      if (!st.anySuccess && target!.alive && rng.next() < statusChance(0.3, target!.m.luck)) {
        giveStatus(s, target!, 'status_nemuri', rng.int(1, 2));
        telePages.push(...fillAll(e.def.texts.extra.momiSleep, { target: target!.name }));
      }
      break;
    }
    case 'skill_momi_kyou': {
      s.sfx('se_remote');
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 8) {
            e.setPose('attack', skillId);
            // the chair tips forward at the member on the strong setting
            rush(s, e, { scale: 1.12, dy: 7, dx: towardX(e, target, 0.1, 10), inF: 8, holdF: 4, outF: 12 });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, target!, 1.2, r);
        },
      });
      break;
    }
    case 'skill_momi_otameshi': {
      yield* selfMove(s, common, resolveGuard, () => e.setPose('attack', skillId));
      const before = e.hp;
      e.hp = Math.min(e.maxHp, e.hp + 20);
      const [nx, ny] = s.enemyNumberXY(e);
      s.number(nx, ny, e.hp - before, { kind: 'heal' }, 'enemy', e);
      s.sfx('se_heal');
      telePages.push(...e.def.texts.extra.otameshiResult);
      break;
    }
    // ---- カネナリくん（加入戦） ------------------------------------------------------
    case 'skill_kn_fuusen':
    case 'skill_kn_goaisatsu':
    case 'skill_kn_pose': {
      yield windupF * FRAME;
      e.setPose('attack', skillId);
      if (skillId === 'skill_kn_fuusen') {
        s.sfx('se_balloon');
        healParty(s, target!, 12);
        telePages.push(...e.def.texts.extra.fuusenResult);
      } else if (skillId === 'skill_kn_goaisatsu') {
        s.sfx('se_bow');
        changeStage(s, target!, 'atk', -1, 2, true);
        telePages.push(...e.def.texts.extra.goaisatsuResult);
      } else telePages.push(...e.def.texts.extra.poseResult);
      yield 300;
      break;
    }
    // ---- なにもしない --------------------------------------------------------------
    case 'skill_idle': {
      yield* selfMove(s, common, resolveGuard, () => e.setPose('idleact'));
      break;
    }
    default: {
      yield* bossMove(s, e, sk, common, resolveGuard, target, all, telePages, st);
      break;
    }
  }
  yield* flushAfter(s, e, sk, st, telePages, tu);
}

/** Lettering, kire, bokemake, then the result pages. */
function* flushAfter(s: BattleScene, e: EnemyUnit, sk: SkillDef, st: ActState, pages: string[], _tu: PartyUnit | null): Co {
  const shownMs = st.anySuccess ? letter(s, e, sk, st) : 0;
  const t0 = s.t;
  yield* tsukkomiAftermath(s, e, sk, st, shownMs);
  for (const u of s.party) u.moodHold = null;
  yield 260;
  if (e.pose !== 'dead' && e.pose !== 'charge' && e.pose !== 'open') e.setPose('idle');
  const all = [...pages.slice(0, 3), ...kireFullPages(s)];
  if (all.length) yield* s.say(all);
  else yield 200;
  // let the lettering finish crossing before the next thing starts
  if (shownMs) yield () => s.t - t0 >= shownMs;
  st.anySuccess = false;
}

/** Self-targeted move (buff, idle, call): the "!" still appears at the tsukkomi-er. */
function* selfMove(
  s: BattleScene,
  common: Omit<LoopOpts, 'onHit'>,
  resolveGuard: (r: Guarded | null, i: number) => void,
  atHit: () => void,
  onFrame?: (f: number) => void,
): Co {
  yield* hitLoop(s, {
    ...common,
    hits: [0],
    onFrame: (f) => onFrame?.(f),
    onHit: (i, r) => {
      resolveGuard(r, i);
      atHit();
    },
  });
}

function applyStatusOne(s: BattleScene, t: PartyUnit, sk: SkillDef, st: ActState): string[] {
  const a = sk.status;
  if (!a || !t.alive) return [];
  if (st.anySuccess) return fillAll(SYS.guarded, { target: t.name });
  if (a.id.startsWith('buff_')) return [];
  if (rng.next() >= statusChance(a.chance, t.m.luck)) return [];
  const turns = a.id === 'status_nemuri' ? rng.int(1, 2) : a.turns ?? 1;
  giveStatus(s, t, a.id, turns);
  return statusText(a.id, 'on', t.name);
}

function applyStatusAll(s: BattleScene, list: PartyUnit[], sk: SkillDef, st: ActState): string[] {
  const out: string[] = [];
  if (st.anySuccess) {
    if (list.length) out.push(...fillAll(SYS.guarded, { target: list.length > 1 ? 'ミナトたち' : list[0].name }));
    return out.slice(0, 1);
  }
  for (const t of list) {
    const r = applyStatusOne(s, t, sk, st);
    if (r.length) out.push(...r);
  }
  return out.slice(0, 2);
}

/** コーン・コン: a new cone drops into the rightmost free slot (max 3, twice per battle). */
function* callCone(s: BattleScene): Co<boolean> {
  const alive = s.aliveEnemies;
  if (alive.length >= 3 || (s.shared.coneCalls ?? 0) >= 2) return false;
  s.shared.coneCalls = (s.shared.coneCalls ?? 0) + 1;
  const def = getEnemy('enemy_cone_vocal')!;
  const n = alive.length + 1;
  const xs = SLOTS[n];
  const sorted = [...alive].sort((a, b) => a.x - b.x);
  sorted.forEach((e, i) => (e.xTarget = xs[i]));
  const ne = new EnemyUnit(def, xs[n - 1]);
  ne.appearT = 0;
  ne.offY = -80;
  s.enemies.push(ne);
  s.nameEnemies();
  s.sfx('se_enemy_appear');
  for (let i = 0; i <= 12; i++) {
    ne.offY = -80 + 80 * ease.bounceOut(i / 12);
    yield null;
  }
  ne.offY = 0;
  s.shake(0, 2, 6);
  s.sfx('se_cone_tap');
  return true;
}

// ---- boss moves (delegated) ------------------------------------------------------------------

import { bossMoveImpl } from './boss';

function* bossMove(
  s: BattleScene,
  e: EnemyUnit,
  sk: SkillDef,
  common: Omit<LoopOpts, 'onHit'>,
  resolveGuard: (r: Guarded | null, i: number) => void,
  target: PartyUnit | undefined,
  all: PartyUnit[],
  pages: string[],
  st: ActState,
): Co {
  yield* bossMoveImpl({ s, e, sk, common, resolveGuard, target, all, pages, damageTo, projectile, soundRings, lunge, st });
}

export type BossMoveCtx = {
  s: BattleScene;
  e: EnemyUnit;
  sk: SkillDef;
  common: Omit<LoopOpts, 'onHit'>;
  resolveGuard: (r: Guarded | null, i: number) => void;
  target: PartyUnit | undefined;
  all: PartyUnit[];
  pages: string[];
  damageTo: typeof damageTo;
  projectile: typeof projectile;
  soundRings: typeof soundRings;
  lunge: typeof lunge;
  st: ActState;
};

export { glove, uwabaki, feather, spring, drawArc, C };
