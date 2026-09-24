// BattleScene: owns battle state, time control (own hitstop / freeze / slow
// motion), rendering, and the helper API used by the battle flow coroutines.

import type { Co } from '../engine/co';
import { Runner } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { Particles, type BurstOpts } from '../engine/particles';
import { rng } from '../engine/rng';
import { BAYER4, makeCanvas } from '../engine/pixel';
import { drawText } from '../engine/font';
import { flag, state } from '../game/state';
import { sfx, type SfxOpts } from '../audio';
import * as audio from '../audio';
import type { BattleOpts, BattleResult } from './api';
import { getEnemy } from '../data/battle';
import { makeBackground, type Background } from './bg';
import { EnemyUnit, PartyUnit, type BossPart } from './model';
import { DamageNumber, type NumOpts, type NumRect } from './fx/numbers';
import { MessageBand } from './ui/message';
import { emptySlotCanvas } from './ui/panels';
import {
  drawChimeSticky, drawCommand, drawInfoCard, drawKire, drawList, drawPanel, KIRE_TAB, PANEL_POS, TAG, type CardData, type CmdView, type ListRow,
} from './ui/panels';
import { C, cursorStamp, cursorStampSide, drawBar, slantTape, STICKY_PAD, stickyCanvas, tapeCanvas } from './ui/note';
import { inkLabel, ovalStamp, pekeMark, petalSprites } from './art/stamps';
import { hitCrack, hitSplash, sweatDrop } from './art/fxart';

export const FRAME = 1000 / 60;

export type Rect = NumRect;
export type LabelSide = 'center' | 'above' | 'below' | 'right' | 'left' | 'aboveRight' | 'aboveLeft';

interface FloatLabel {
  img: HTMLCanvasElement;
  /** ms since it appeared (negative while delayed). */
  t: number;
  ms: number;
  x: number;
  y: number;
  placed: boolean;
  anchor: () => Rect;
  sides: LabelSide[];
}

export interface Fx {
  t: number;
  dur: number;
  /** 'over': above the damage numbers too (the 2–3 frame impact splash). */
  layer: 'back' | 'world' | 'top' | 'over';
  /** Keeps animating during hitstop (UI-ish effects). */
  ui?: boolean;
  draw(g: Gfx, t: number, p: number): void;
  update?(dt: number): void;
  done?: boolean;
  /** Screen rect floating numbers / labels must keep clear of while alive. */
  block?: () => NumRect | null;
  /** Screen rect only labels must keep clear of (numbers may sit over it). */
  blockLabels?: () => NumRect | null;
}

export interface BossHooks {
  drawUnder?(g: Gfx): void;
  drawOver?(g: Gfx): void;
  update?(dt: number): void;
}

/** Enemy x positions by count (15.4). */
export const SLOTS: Record<number, number[]> = { 1: [192], 2: [140, 244], 3: [96, 192, 288] };
/** Top of the stage: numbers and labels stay under the 2-line band (y4–48). */
export const STAGE_TOP = 51;
/** Heights of the damage number sprites (normal / big, incl. the 1px bounce). */
const NUM_H = 16;
const NUM_H_BIG = 19;
const NUM_RISE = 16;

export class BattleScene implements Scene {
  transparent = true;
  result: BattleResult | null = null;
  finished = false;
  /** Lost a battle that isn't canLose: battleImpl runs evt_gameover afterwards. */
  needGameOver = false;
  /** Reverb space of the field (restored when the battle ends). */
  prevSpace: import('../audio').SpaceId | null = null;
  runner = new Runner();
  /** Scene time (ms), stops during hitstop. */
  t = 0;
  /** Real time (ms). */
  rt = 0;
  frame = 0;
  hitstopMs = 0;
  freezeMs = 0;
  timeScale = 1;
  party: PartyUnit[] = [];
  enemies: EnemyUnit[] = [];
  bg: Background;
  msg = new MessageBand();
  round = 0;
  kire = 0;
  kirePops = [0, 0, 0];
  kireFirstFullShown = false;
  kanenariJoined: boolean;
  parts = new Particles();
  partsTop = new Particles();
  numbers: DamageNumber[] = [];
  fx: Fx[] = [];
  boss: BossHooks | null = null;
  bossChime = { lit: 0, pops: [0, 0, 0, 0], gold: false };
  bossParts: BossPart[] = [];
  isBoss: boolean;
  isEvent: boolean;
  // ui state
  showUi = false;
  uiAlpha = 1;
  cmd: CmdView | null = null;
  list: { rows: ListRow[]; index: number; scroll: number } | null = null;
  target:
    | { kind: 'enemy'; e: EnemyUnit; part?: { x: number; y: number; w: number }; aim?: { x: number; y: number; dir: 'down' | 'right' } }
    | { kind: 'party'; u: PartyUnit }
    | null = null;
  card: { data: CardData; t: number; closing: boolean } | null = null;
  /** Tutorial sticky; `ttl` (ms) peels it off by itself. */
  sticky: { text: string; t: number; pulse?: boolean; ttl?: number; pos?: 'left' | 'right' } | null = null;
  cursorPressed = 0;
  /** Directional screen shake. */
  private shk = { ax: 0, ay: 0, t: 0, dur: 0, x: 0, y: 0 };
  flashes: { color: string; alpha: number; frames: number }[] = [];
  /** The frozen-frame look while the screen stands still (かねを鳴らす). */
  freezeLook: { t: number; x: number; y: number } | null = null;
  /** Full-screen dimming (nori, level up). */
  dark = 0;
  tint: { color: string; alpha: number } | null = null;
  tint2: { color: string; alpha: number } | null = null;
  /** Draw nothing but the transition overlay (before reveal / after the battle). */
  hideAll = true;
  /** Transition overlay drawer (in/out). */
  transitionDraw: ((g: Gfx) => void) | null = null;
  // input buffer
  private confirmBuf = false;
  private cancelBuf = false;
  /** Party-wide "surprised" etc. */
  hideEnemyHp = false;
  /** Global per-battle rng seed for kakimoji jitter. */
  seed = rng.int(1, 9999);
  /** Restored objects lying on the floor after defeats. */
  dropFxs: { fx: Fx; st: { alpha: number } }[] = [];
  /** Enemy AI shared memory. */
  shared: Record<string, number> = {};
  /** Tutorial / misc flags for this battle. */
  memo: Record<string, number> = {};
  /** QA: automatic inputs (tsukkomi / ring / hold). */
  auto: { tsuk?: string; ring?: string; hold?: 'kukkiri' | 'futsuu' | 'kasure'; crit?: boolean } = {};
  /** QA: queued party commands for the next input phase. */
  cmdQueue: { who: string; cmd: string; skill?: string; item?: string; target?: number | string; part?: string }[] = [];
  /** QA: forced enemy actions (in order). */
  forceEnemy: string[] = [];
  /** QA: the party always acts before the enemies (deterministic frame captures). */
  qaPartyFirst = false;
  private scratch: HTMLCanvasElement;
  private scratchCtx: CanvasRenderingContext2D;
  private scratch2: HTMLCanvasElement;
  private scratch2Ctx: CanvasRenderingContext2D;
  musicParams = typeof (audio as unknown as { setMusicParam?: unknown }).setMusicParam === 'function';

  constructor(public opts: BattleOpts) {
    const first = getEnemy(opts.enemies[0]);
    this.isBoss = !!opts.boss || !!first?.boss;
    this.isEvent = opts.enemies.some((id) => id === 'enemy_kanenari' || id === 'enemy_hato_kakaricho' || id === 'enemy_ojigi_jihanki') || this.isBoss;
    this.bg = makeBackground(opts.background ?? first?.bg ?? 'bg_residential', opts.enemies[0]);
    this.kanenariJoined = !!flag('flag_kanenari_joined') && state.party.some((m) => m.id === 'kanenari');
    this.party = state.party.filter((m) => m.id === 'minato' || (m.id === 'kanenari' && this.kanenariJoined)).map((m) => new PartyUnit(m));
    const ids = opts.enemies.slice(0, 3);
    const xs = SLOTS[ids.length] ?? SLOTS[3];
    ids.forEach((id, i) => {
      const def = getEnemy(id);
      if (def) this.enemies.push(new EnemyUnit(def, xs[i]));
    });
    this.nameEnemies();
    this.msg.bossMode = this.isBoss;
    [this.scratch, this.scratchCtx] = makeCanvas(96, 112);
    [this.scratch2, this.scratch2Ctx] = makeCanvas(96, 112);
  }

  /** Assign A/B/C suffixes to same-name enemies. */
  nameEnemies(): void {
    const counts = new Map<string, number>();
    for (const e of this.enemies) if (!e.dead) counts.set(e.def.name, (counts.get(e.def.name) ?? 0) + 1);
    const idx = new Map<string, number>();
    for (const e of this.enemies) {
      if ((counts.get(e.def.name) ?? 0) > 1 || e.letter) {
        if (!e.letter) {
          const used = new Set(this.enemies.filter((o) => o.def.name === e.def.name && o.letter).map((o) => o.letter));
          let L = 'A';
          for (const c of 'ABCDEF') if (!used.has(c)) {
            L = c;
            break;
          }
          e.letter = L;
        }
        e.name = e.def.name + e.letter;
      } else e.name = e.def.name;
      idx.set(e.def.name, (idx.get(e.def.name) ?? 0) + 1);
    }
  }

  get minato(): PartyUnit | undefined {
    return this.party.find((u) => u.id === 'minato');
  }
  get kanenari(): PartyUnit | undefined {
    return this.party.find((u) => u.id === 'kanenari');
  }
  get aliveEnemies(): EnemyUnit[] {
    return this.enemies.filter((e) => e.alive);
  }

  // ---- scene lifecycle ---------------------------------------------------------

  enter(): void {}

  run(co: Co): void {
    this.runner.run(co);
  }

  /** Confirm press consumed by the flow (buffered across hitstop). */
  takeConfirm(): boolean {
    const r = this.confirmBuf;
    this.confirmBuf = false;
    return r;
  }
  takeCancel(): boolean {
    const r = this.cancelBuf;
    this.cancelBuf = false;
    return r;
  }
  peekConfirm(): boolean {
    return this.confirmBuf;
  }
  confirmDown(): boolean {
    return game.input.down('confirm');
  }

  update(dt: number): void {
    this.rt += dt;
    this.frame++;
    const inp = game.input;
    if (inp.pressed('confirm')) this.confirmBuf = true;
    if (inp.pressed('cancel')) this.cancelBuf = true;
    if (this.freezeMs > 0) {
      // complete stop (かねを鳴らす): nothing moves
      this.freezeMs -= dt;
      return;
    }
    // hit flashes count frames that were actually shown (16.2 "敵を白く1f"):
    // a flash set during the previous tick has been drawn once by now, so it
    // ticks down here, before anything this tick can set a new one
    for (const e of this.enemies) if (e.whiteFrames > 0 && e.whiteFrames < 900) e.whiteFrames--;
    this.updateUi(dt);
    if (this.hitstopMs > 0) {
      this.hitstopMs -= dt;
      this.endFrame();
      return;
    }
    const sdt = dt * this.timeScale;
    this.t += sdt;
    this.runner.update(sdt);
    this.bg.update(sdt);
    this.parts.update(sdt);
    this.partsTop.update(sdt);
    for (const f of this.fx) if (!f.ui) this.stepFx(f, sdt);
    for (const e of this.enemies) this.updateEnemy(e, sdt);
    this.boss?.update?.(sdt);
    this.endFrame();
  }

  private endFrame(): void {
    // unconsumed presses expire at the end of an unfrozen frame
    if (this.hitstopMs <= 0) {
      this.confirmBuf = false;
      this.cancelBuf = false;
    }
    this.fx = this.fx.filter((f) => !f.done);
    this.numbers = this.numbers.filter((n) => !n.done);
  }

  private stepFx(f: Fx, dt: number): void {
    f.t += dt;
    f.update?.(dt);
    if (f.dur > 0 && f.t >= f.dur) f.done = true;
  }

  private updateUi(dt: number): void {
    this.msg.update(dt, this.msgConfirm());
    for (const f of this.fx) if (f.ui) this.stepFx(f, dt);
    for (const n of this.numbers) n.update(dt);
    this.updateLabels(dt);
    for (let i = 0; i < 3; i++) if (this.kirePops[i] > 0) this.kirePops[i] = Math.max(0, this.kirePops[i] - dt);
    for (let i = 0; i < 4; i++) if (this.bossChime.pops[i] > 0) this.bossChime.pops[i] = Math.max(0, this.bossChime.pops[i] - dt);
    if (this.cursorPressed > 0) this.cursorPressed -= dt;
    if (this.shk.t > 0) {
      this.shk.t -= dt;
      const k = Math.max(0, this.shk.t / this.shk.dur);
      const a = k * k;
      this.shk.x = Math.round((Math.random() * 2 - 1) * this.shk.ax * a);
      this.shk.y = Math.round((Math.random() * 2 - 1) * this.shk.ay * a);
    } else this.shk.x = this.shk.y = 0;
    for (const f of this.flashes) f.frames -= 1;
    this.flashes = this.flashes.filter((f) => f.frames > 0);
    for (const u of this.party) this.updatePanel(u, dt);
    if (this.card) {
      this.card.t += dt;
      // 15.9: the card closes after 1.4s on its own (it never waits for the band)
      if (!this.card.closing && this.card.t >= 1400) {
        this.card.closing = true;
        this.card.t = 0;
      }
      if (this.card.closing && this.card.t > 160) this.card = null;
    }
    if (this.sticky) {
      this.sticky.t += dt;
      if (this.sticky.ttl && this.sticky.t > this.sticky.ttl + 200) this.sticky = null;
    }
  }

  /** Blocking message pages may be skipped with confirm. */
  private msgConfirm(): boolean {
    // a manual page always takes confirm: nothing else could close it
    if (!this.msgInteractive && !this.msg.wantsConfirm) return false;
    if (this.confirmBuf) {
      this.confirmBuf = false;
      return true;
    }
    return false;
  }
  msgInteractive = false;

  private updatePanel(u: PartyUnit, dt: number): void {
    const target = u.acting ? 3 : this.target?.kind === 'party' && this.target.u === u ? 2 : 0;
    u.lift += (target - u.lift) * Math.min(1, dt / 50);
    if (Math.abs(target - u.lift) < 0.2) u.lift = target;
    if (u.shakeT > 0) u.shakeT = Math.max(0, u.shakeT - dt);
    if (u.flashT > 0) u.flashT = Math.max(0, u.flashT - dt);
    if (u.bounceT > 0) u.bounceT = Math.max(0, u.bounceT - dt);
    if (u.squishT > 0) u.squishT = Math.max(0, u.squishT - dt);
    if (u.hpGrowT > 0) u.hpGrowT = Math.max(0, u.hpGrowT - dt);
    for (const s of u.statusPop) s.t = Math.max(0, s.t - dt);
    u.statusPop = u.statusPop.filter((s) => s.t > 0);
    // numbers approach target over ~300ms (ease-out)
    const k = 1 - Math.exp(-dt / 90);
    u.hpShown += (u.m.hp - u.hpShown) * k;
    if (Math.abs(u.hpShown - u.m.hp) < 0.5) u.hpShown = u.m.hp;
    u.mpShown += (u.m.mp - u.mpShown) * k;
    if (Math.abs(u.mpShown - u.m.mp) < 0.5) u.mpShown = u.m.mp;
    if (u.hpTrail > u.m.hp) {
      if (u.trailWait > 0) {
        u.trailWait -= dt;
        // 40_audio 9: one soft tick as the white remainder starts to drain
        if (u.trailWait <= 0) sfx('se_hp_tick', { pan: u.id === 'kanenari' ? 0.35 : -0.1 });
      } else u.hpTrail = Math.max(u.m.hp, u.hpTrail - (u.m.maxHp / 250) * dt * 1.2);
    } else u.hpTrail = u.m.hp;
  }

  private updateEnemy(e: EnemyUnit, dt: number): void {
    e.poseT += dt;
    if (e.hurtT > 0) {
      e.hurtT -= dt;
      if (e.hurtT <= 0 && e.pose === 'hurt') {
        // back to whatever the enemy was doing (playing dead, charging, open…)
        const back = e.status.shindafuri ? 'dead' : e.status.tame ? 'charge' : e.status.hiraki ? 'open' : e.hurtReturn;
        e.setPose(back === 'hurt' ? 'idle' : back);
      }
    }
    if (e.x !== e.xTarget) {
      const d = e.xTarget - e.x;
      e.x += Math.sign(d) * Math.min(Math.abs(d), dt * 0.25);
    }
    if (e.blushT > 0) e.blushT -= dt;
    if (e.shyT > 0) e.shyT -= dt;
    if (e.appearT >= 0) e.appearT += dt;
    if (e.status.bokemake && e.alive) {
      if (this.frame % 2 === 0) {
        e.jitterX = rng.int(-1, 1);
        e.jitterY = rng.int(-1, 1);
      }
      e.sweatT += dt;
    } else {
      e.jitterX = e.jitterY = 0;
    }
    if (e.status.tame && e.alive && this.frame % 2 === 0) e.jitterX = rng.int(-1, 1);
    if (e.hpTrail > e.hp) {
      if (e.trailWait > 0) e.trailWait -= dt;
      else e.hpTrail = Math.max(e.hp, e.hpTrail - (e.maxHp / 250) * dt * 1.2);
    } else e.hpTrail = e.hp;
  }

  // ---- effects API -------------------------------------------------------------

  hitstop(frames: number): void {
    this.hitstopMs = Math.max(this.hitstopMs, frames * FRAME);
  }

  /** Directional shake (px amplitude on each axis) for `frames`, quadratic decay. */
  shake(ax: number, ay: number, frames: number): void {
    const ms = frames * FRAME;
    const curA = Math.max(this.shk.ax, this.shk.ay) * (this.shk.t > 0 ? (this.shk.t / this.shk.dur) ** 2 : 0);
    if (Math.max(ax, ay) >= curA) {
      this.shk.ax = ax;
      this.shk.ay = ay;
      this.shk.t = ms;
      this.shk.dur = ms;
    }
  }

  flash(color: string, alpha: number, frames: number): void {
    this.flashes.push({ color, alpha, frames });
  }

  addFx(f: Omit<Fx, 't'> & { t?: number } & ThisType<Fx>): Fx {
    const fx = { t: 0, ...f } as Fx;
    this.fx.push(fx);
    return fx;
  }

  // ---- floating numbers & labels: a tiny layout solver ------------------------------
  //
  // Every number and label reserves the rectangle where it comes to rest for
  // its lifetime. New ones try a list of candidate spots and take the first
  // that covers nothing live and none of the fixed UI that must stay readable
  // (the band, the name tags, the kire tab, the panels, a sticky, the card).

  /** Live reservations (rest rects of numbers / labels), in real time. */
  private occ: { r: Rect; until: number }[] = [];
  /** Labels are drawn after the numbers and every effect, so nothing cuts them. */
  labels: FloatLabel[] = [];
  /** Most recent number per enemy (labels pair with it). */
  private lastNum = new Map<EnemyUnit | PartyUnit, { d: DamageNumber; at: number }>();

  private static overlap(a: Rect, b: Rect, pad = 1): boolean {
    return a.x0 < b.x1 + pad && b.x0 < a.x1 + pad && a.y0 < b.y1 + pad && b.y0 < a.y1 + pad;
  }

  /** Fixed UI that floating text must never cover. */
  blockedRects(): Rect[] {
    const out: Rect[] = [{ x0: 0, y0: 0, x1: 384, y1: this.msg.bottom + 1 }];
    if (!this.showUi) return out;
    // the tape row (name tags, kire tab) and everything under it
    for (const u of this.party) {
      const t = TAG[u.id];
      if (t) out.push({ x0: t[0], y0: t[1], x1: t[0] + t[2], y1: t[1] + 18 });
    }
    if (this.kanenariJoined) out.push({ x0: KIRE_TAB[0], y0: KIRE_TAB[1], x1: KIRE_TAB[0] + 44, y1: KIRE_TAB[1] + 18 });
    out.push({ x0: 0, y0: 150, x1: 384, y1: 216 });
    if (this.isBoss) out.push({ x0: 300, y0: this.msg.bottom, x1: 378, y1: this.msg.bottom + 24 });
    // a sticky still waiting to peel on (it follows the lettering) already
    // owns its spot: a label placed in the same frame must not take it
    if (this.sticky) {
      const img = stickyCanvas(this.sticky.text);
      const right = this.sticky.pos === 'right';
      const sx = right ? 381 - (img.width - STICKY_PAD) : 8;
      const sy = right ? this.msg.bottom + 26 : 52;
      out.push({ x0: sx - STICKY_PAD, y0: sy - STICKY_PAD, x1: sx + img.width - STICKY_PAD, y1: sy + img.height - STICKY_PAD });
    }
    if (this.card) {
      const x = this.card.data.side === 'left' ? 8 : 216;
      out.push({ x0: x - 2, y0: 42, x1: x + 164, y1: 148 });
    }
    for (const f of this.fx) {
      const b = !f.done && f.block ? f.block() : null;
      if (b) out.push(b);
    }
    return out;
  }

  /**
   * Enemy faces (face ±12px): a label never covers the eyes it is about —
   * the boss's name-tag eyes least of all.
   */
  faceRects(): Rect[] {
    const out: Rect[] = [];
    for (const e of this.enemies) {
      if (!e.alive || !e.visible) continue;
      out.push({ x0: e.faceX - 12, y0: e.faceY - 12, x1: e.faceX + 12, y1: e.faceY + 12 });
    }
    return out;
  }

  /** Is `r` on screen, clear of the fixed UI and of every live reservation (and, for labels, the faces)? */
  fits(r: Rect, ignoreOcc = false, faces = false): boolean {
    if (r.x0 < 2 || r.x1 > 382 || r.y0 < 0 || r.y1 > 214) return false;
    for (const b of this.blockedRects()) if (BattleScene.overlap(r, b, 0)) return false;
    if (faces) {
      for (const b of this.faceRects()) if (BattleScene.overlap(r, b, 0)) return false;
      for (const f of this.fx) {
        const b = !f.done && f.blockLabels ? f.blockLabels() : null;
        if (b && BattleScene.overlap(r, b, 0)) return false;
      }
    }
    if (!ignoreOcc) for (const o of this.occ) if (o.until > this.rt && BattleScene.overlap(r, o.r)) return false;
    return true;
  }

  reserve(r: Rect, ms: number): void {
    this.occ = this.occ.filter((o) => o.until > this.rt);
    this.occ.push({ r, until: this.rt + ms });
  }

  /**
   * Pop a damage / heal number. `lay` picks how it gets out of the way of
   * live numbers and labels: 'enemy' stacks multi-hits at (+10, −6) (then
   * further out), 'party' lines them up in a row along the top of the panel,
   * 'free' keeps the exact spot.
   */
  number(x: number, y: number, n: number, o: NumOpts = {}, lay: 'free' | 'enemy' | 'party' = 'free', owner?: EnemyUnit | PartyUnit): DamageNumber {
    const d = new DamageNumber(x, y, n, o);
    if ((o.kind === 'heal' || o.kind === 'mp') && Math.round(n) <= 0) {
      // already full: no green "0" — just a glint where the number would pop
      d.done = true;
      // where the number would have come to rest
      this.fullGlint(x + (lay === 'party' ? -4 : 0), y - (o.rise ?? 16) - 6);
      return d;
    }
    if (lay !== 'free') {
      const w = d.img.width;
      const h = d.img.height;
      const cands: [number, number][] = [[0, 0]];
      if (lay === 'enemy') {
        // (+10, −6) stacking first; when the band is in the way, step down and
        // out instead — never level with a neighbour (two numbers side by
        // side at one height read as one: "20 17" → "2017")
        for (let k = 1; k <= 7; k++) cands.push([10 * k, -6 * k]);
        for (let k = 1; k <= 5; k++) cands.push([-10 * k, -6 * k]);
        for (let k = 1; k <= 4; k++) cands.push([(w + 6) * k, 10 * k], [-(w + 6) * k, 10 * k]);
      } else {
        // a row along the top of the panel, first leftward (away from the
        // tsukkomi "!" over the photo's right half), then past it to the
        // right; neighbours step up 6px and keep a 6px gap so two single
        // digits never read as one number
        for (let row = 0; row < 3; row++) {
          for (let k = row ? 0 : 1; k <= 3; k++) cands.push([-(w + 6) * k, -(h + 4) * row - (k % 2) * 6]);
          for (let k = 1; k <= 6; k++) cands.push([(w + 6) * k, -(h + 4) * row - (k % 2) * 6]);
        }
      }
      let ok = false;
      for (const [dx, dy] of cands) {
        d.x = x + dx;
        d.y = y + dy;
        if (this.fits(d.restRect())) {
          ok = true;
          break;
        }
      }
      if (!ok) {
        d.x = x;
        d.y = y;
      }
    }
    this.reserve(d.restRect(), d.life);
    this.numbers.push(d);
    if (owner) this.lastNum.set(owner, { d, at: this.rt });
    return d;
  }

  /**
   * 「まんたん」: a heal that had nothing to fill. A 4-point glint opens and
   * closes (300ms) with two tiny stars drifting off — no number.
   */
  fullGlint(x: number, y: number): void {
    const img = glintSprite();
    this.addFx({
      layer: 'top',
      dur: 320,
      ui: true,
      draw: (g, t) => {
        const p = t / 320;
        // opens wide (1.4×), then closes to a point
        const k = p < 0.3 ? p / 0.3 : 1 - (p - 0.3) / 0.7;
        const sz = Math.max(3, Math.round(img.width * 1.4 * k)) | 1;
        g.ctx.drawImage(img, Math.round(x - sz / 2), Math.round(y - sz / 2), sz, sz);
      },
    });
    this.sparkle(x - 5, y + 2);
    this.sparkle(x + 6, y - 1);
    sfx('se_glint', { vol: 0.8 });
  }

  /** Rest rect of the number `owner` popped within the last `ms` (for its label). */
  recentNumberRect(owner: EnemyUnit | PartyUnit, ms = 400): Rect | null {
    const r = this.lastNum.get(owner);
    if (!r || this.rt - r.at > ms || r.d.done) return null;
    return r.d.restRect();
  }

  /** Ink-stamp label that pops and fades, at a fixed centre (after `delay` ms). */
  label(text: string, x: number, y: number, tone: 'shu' | 'gray' = 'shu', ms = 600, worn = false, delay = 0): void {
    this.labelNear(text, () => ({ x0: x, y0: y, x1: x, y1: y }), ['center'], tone, ms, worn, delay);
  }

  /**
   * Label placed next to an anchor rect (resolved when it appears, so it can
   * pair with a number popped in the same frame): the first side in `sides`
   * that is free wins, each side also tried nudged a little along its edge.
   */
  labelNear(
    text: string,
    anchor: () => Rect,
    sides: LabelSide[],
    tone: 'shu' | 'gray' = 'shu',
    ms = 600,
    worn = false,
    delay = 0,
  ): void {
    const img = inkLabel(text, tone, worn);
    this.labels.push({ img, t: -delay, ms, x: 0, y: 0, placed: false, anchor, sides });
  }

  private placeLabel(l: FloatLabel): void {
    const a = l.anchor();
    const w = l.img.width;
    const h = l.img.height;
    const acx = (a.x0 + a.x1) / 2;
    const acy = (a.y0 + a.y1) / 2;
    const at = (side: LabelSide, nudge: number): [number, number] => {
      switch (side) {
        case 'center':
          return [acx - w / 2 + nudge, acy - h / 2];
        case 'above':
          return [acx - w / 2 + nudge, a.y0 - 2 - h];
        case 'below':
          return [acx - w / 2 + nudge, a.y1 + 2];
        case 'right':
          return [a.x1 + 3, acy - h / 2 + nudge];
        case 'left':
          return [a.x0 - 3 - w, acy - h / 2 + nudge];
        case 'aboveRight':
          return [a.x1 - 4 + nudge, a.y0 - 2 - h];
        case 'aboveLeft':
          return [a.x0 + 4 - w + nudge, a.y0 - 2 - h];
      }
    };
    const nudges = [0, 6, -6, 12, -12, 20, -20];
    // pass 1: clear of everything; 2: may touch a fading reservation; 3: may
    // touch a face (a crowded moment still gets its label)
    const passes: [boolean, boolean][] = [[false, true], [true, true], [true, false]];
    for (const [ignoreOcc, faces] of passes) {
      // of every free spot, the one nearest the anchor wins (the side order
      // breaks ties): a label stays next to what it is about
      let best: Rect | null = null;
      let bestCost = Infinity;
      l.sides.forEach((side, si) => {
        for (const n of side === 'center' ? [0] : nudges) {
          const [x, y] = at(side, n);
          const r = { x0: Math.round(x), y0: Math.round(y), x1: Math.round(x + w), y1: Math.round(y + h) };
          if (!this.fits(r, ignoreOcc, faces)) continue;
          const cost = Math.hypot((r.x0 + r.x1) / 2 - acx, (r.y0 + r.y1) / 2 - acy) + si * 6;
          if (cost < bestCost) {
            bestCost = cost;
            best = r;
          }
        }
      });
      if (best) {
        const r: Rect = best;
        l.x = r.x0;
        l.y = r.y0;
        l.placed = true;
        this.reserve(r, l.ms);
        return;
      }
    }
    const [x, y] = at(l.sides[0], 0);
    l.x = Math.round(Math.max(2, Math.min(382 - w, x)));
    l.y = Math.round(Math.max(this.msg.bottom + 2, Math.min(141 - h, y)));
    l.placed = true;
    this.reserve({ x0: l.x, y0: l.y, x1: l.x + w, y1: l.y + h }, l.ms);
  }

  private updateLabels(dt: number): void {
    for (const l of this.labels) {
      l.t += dt;
      if (!l.placed && l.t >= 0) this.placeLabel(l);
    }
    this.labels = this.labels.filter((l) => l.t < l.ms);
  }

  private drawLabels(g: Gfx): void {
    for (const l of this.labels) {
      if (!l.placed || l.t < 0) continue;
      const t = l.t;
      // pressed on like a stamp: 1.4 → 1.0 with a squash (wide and flat,
      // then a hair tall, then settled) in 90ms
      let sx = 1;
      let sy = 1;
      if (t < 90) {
        const p = t / 90;
        if (p < 0.55) {
          const q = p / 0.55;
          sx = 1.4 - 0.45 * q;
          sy = 0.8 + 0.28 * q;
        } else {
          const q = (p - 0.55) / 0.45;
          sx = 0.95 + 0.05 * q;
          sy = 1.08 - 0.08 * q;
        }
      }
      const a = t > l.ms - 150 ? Math.max(0, (l.ms - t) / 150) : 1;
      const w = l.img.width * sx;
      const h = l.img.height * sy;
      const cx = l.x + l.img.width / 2;
      const cy = l.y + l.img.height / 2;
      g.alpha(a, () => g.ctx.drawImage(l.img, Math.round(cx - w / 2), Math.round(cy - h / 2), Math.round(w), Math.round(h)));
    }
  }

  /** Label up-right of a point (the sight / the stamp) when no number pops from it. */
  labelUpRight(text: string, x: number, y: number, tone: 'shu' | 'gray' = 'shu', ms = 600, worn = false, delay = 0): void {
    this.labelNear(text, () => ({ x0: x - 8, y0: y - 8, x1: x + 8, y1: y + 8 }), ['aboveRight', 'aboveLeft', 'right', 'left', 'below'], tone, ms, worn, delay);
  }

  /**
   * Where an enemy's damage number starts (16.4): the core (where the hit
   * lands; the boss's beside it), clamped so the risen number and the hit
   * label stacked above it stay under the band.
   */
  enemyNumberXY(e: EnemyUnit, big = false, stack = 0): [number, number] {
    const h = big ? NUM_H_BIG : NUM_H;
    const x = (e.def.boss ? e.coreX + 36 : e.coreX) + stack * 10;
    const y = e.coreY - stack * 6;
    return [Math.round(x), Math.round(Math.max(y, STAGE_TOP + NUM_RISE + h))];
  }

  /**
   * Hit label (いい音！／くっきり！／かすれ……) paired with the enemy's damage
   * number: it appears 3 frames after the impact, right on top of where the
   * number comes to rest (2px gap), else beside it — never over the number.
   */
  labelForHit(text: string, e: EnemyUnit, _big = false, tone: 'shu' | 'gray' = 'shu', ms = 600, worn = false, delay = 3 * FRAME): void {
    this.labelNear(
      text,
      () => this.recentNumberRect(e) ?? { x0: e.coreX - 8, y0: e.coreY - 24, x1: e.coreX + 8, y1: e.coreY - 8 },
      ['above', 'right', 'left', 'below'],
      tone,
      ms,
      worn,
      delay,
    );
  }

  burst(x: number, y: number, o: BurstOpts, top = false): void {
    (top ? this.partsTop : this.parts).burst(x, y, o);
  }

  /**
   * Paper bits (紙片): ink-outlined scraps drawn above the net and the UI, so
   * they read on the bright sunset and never hide under the hoop's mesh.
   */
  paper(x: number, y: number, n: number, speed: [number, number] = [60, 120]): void {
    const bits = paperBits();
    for (let i = 0; i < n; i++) {
      this.burst(x, y, { count: 1, speed, angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [260, 380], colors: ['#FBF3DC'], gravity: 200, shape: 'img', img: bits[i % bits.length] }, true);
      this.leadOut(this.partsTop, 7 + (i % 3) * 2);
    }
  }
  stars(x: number, y: number, n: number, speed: [number, number] = [80, 160]): void {
    const st = starBits();
    for (let i = 0; i < n; i++) {
      this.burst(x, y, { count: 1, speed, life: [280, 440], colors: ['#FFD23F'], gravity: 60, drag: 2, shape: 'img', img: st[i % 2] }, true);
      this.leadOut(this.partsTop, 9);
    }
  }

  /**
   * The impact splash at a hit point (QA round 1): an ink starburst `size`
   * px across over the enemy for the first `frames` frames of the hitstop
   * (white-hot → vermilion ring → broken tips), with radial speed lines on
   * a good hit. On the boss a crack is struck into the shadow body where the
   * blow landed and lingers a moment, so the hit has the size of the target.
   */
  impact(x: number, y: number, size: number, frames: number, lines: boolean, boss = false): void {
    const seed = rng.int(1, 6);
    const n = Math.max(2, Math.min(3, frames));
    const sz = Math.round(boss ? size * 1.4 : size);
    this.addFx({
      // over the number that pops in the same frame: for these 2–3 frames
      // the contact itself is the picture, then the number takes over
      layer: 'over',
      dur: n * FRAME - 1,
      ui: true,
      draw: (g, t) => {
        const fi = Math.min(n - 1, Math.round(t / FRAME));
        const img = hitSplash(sz, fi, lines, seed);
        g.img(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2));
      },
    });
    if (boss) {
      const crack = hitCrack(Math.round(size * 1.5), seed);
      const cx = Math.round(x - crack.width / 2 + rng.int(-3, 3));
      const cy = Math.round(y - crack.height / 2 + rng.int(-3, 3));
      this.addFx({
        // over the hoop of the net that struck it
        layer: 'top',
        dur: 420,
        ui: true,
        draw: (g, t) => g.alpha(t < 200 ? 1 : 1 - (t - 200) / 220, () => g.img(crack, cx, cy)),
      });
    }
  }

  /**
   * Particles freeze through the hitstop (16.0), so the debris of a hit is
   * born already a little way out — `r` px from the point plus two frames of
   * its flight — instead of sitting under the damage number.
   */
  private leadOut(ps: Particles, r: number): void {
    const p = ps.list[ps.list.length - 1];
    if (!p) return;
    const v = Math.hypot(p.vx, p.vy) || 1;
    const lead = 2 / 60;
    p.x += (p.vx / v) * r + p.vx * lead;
    p.y += (p.vy / v) * r + p.vy * lead;
  }
  /** One glinting star (#FFD23F, core #FFF6D8) drifting up from (x, y). */
  sparkle(x: number, y: number): void {
    const st = starBits();
    this.burst(x, y, { count: 1, speed: [8, 22], angle: [-Math.PI * 0.8, -Math.PI * 0.2], life: [420, 640], colors: ['#FFD23F'], gravity: -10, drag: 1, shape: 'img', img: st[rng.int(1, 2)] }, true);
  }
  shuSplash(x: number, y: number, n: number, alpha70 = false): void {
    const cols = alpha70 ? ['#E86A5E', '#E86A5E'] : ['#E23B2E', '#E23B2E', '#E23B2E', '#FF6A4D', '#B8241E'];
    this.burst(x, y, { count: n, speed: [60, 160], life: [400, 700], colors: cols, gravity: 300, drag: 1, shape: 'sq', size: [1, 3], sizeEnd: 1 });
  }
  /** Petals (16.0: 4×3 ovals in four colours). */
  petals(x: number, y: number, n: number, spread = 20, top = true): void {
    const imgs = petalSprites();
    for (let i = 0; i < n; i++)
      this.burst(x, y, { count: 1, speed: [40, 150], life: [700, 1300], colors: ['#FF6A4D'], gravity: 90, drag: 1.5, shape: 'img', img: imgs[(i * 3 + (i >> 2)) % imgs.length], spread }, top);
  }
  sweat(x: number, y: number, n = 6): void {
    this.burst(x, y, { count: n, speed: [60, 140], angle: [-Math.PI, 0], life: [300, 500], colors: ['#E8F4F8', '#7FD1E8'], gravity: 400, shape: 'sq', size: [2, 2], sizeEnd: 1 }, true);
  }

  /** Frame of the last se_warn (the tsukkomi "!" ping). */
  private warnFrame = -99;

  /**
   * Battle SE with the transients kept apart (40_audio 1.6-3 "a reply to
   * each press"): the "!" ping owns its frame — a move's own SE asked for on
   * the same frame (the card toss, the glove, the kick…) follows 100ms later
   * instead of smearing into it.
   */
  sfx(id: string, o?: SfxOpts): void {
    if (id === 'se_warn') this.warnFrame = this.frame;
    else if (this.frame - this.warnFrame <= 1 && !WARN_COMPANIONS.has(id)) {
      this.sfxLater(id, o, 100);
      return;
    }
    sfx(id, o);
  }

  /** Play an SE `ms` later (real time: hitstop doesn't hold sounds). */
  sfxLater(id: string, o: SfxOpts | undefined, ms: number): void {
    this.addFx({
      layer: 'top',
      dur: ms + 1,
      ui: true,
      draw: () => {},
      update() {
        if (this.t >= ms) {
          sfx(id, o);
          this.done = true;
        }
      },
    });
  }

  setMusicParam(name: string, v: number): void {
    const f = (audio as unknown as { setMusicParam?: (n: string, v: number) => void }).setMusicParam;
    if (typeof f === 'function') f(name, v);
  }

  *wait(ms: number): Co {
    if (ms > 0) yield ms;
  }

  *frames(n: number): Co {
    for (let i = 0; i < n; i++) yield null;
  }

  /** Show pages in the band and wait (confirm skips). */
  *say(pages: string[] | string, manual = false): Co {
    this.msgInteractive = true;
    yield* this.msg.show(pages, { manual });
    this.msgInteractive = false;
  }

  post(pages: string[] | string): void {
    this.msg.post(pages);
  }

  mood(u: PartyUnit | undefined, mood: string, ms: number): void {
    if (!u) return;
    u.moodOverride = { mood, until: this.t + ms };
  }

  panelXY(u: PartyUnit): [number, number] {
    return PANEL_POS[u.id] ?? [104, 150];
  }

  // ---- drawing -------------------------------------------------------------------

  draw(g: Gfx): void {
    const ctx = g.ctx;
    if (this.hideAll) {
      this.transitionDraw?.(g);
      return;
    }
    ctx.save();
    ctx.translate(this.shk.x, this.shk.y);
    this.bg.draw(g);
    for (const f of this.fx) if (f.layer === 'back') f.draw(g, f.t, f.dur ? Math.min(1, f.t / f.dur) : 0);
    this.boss?.drawUnder?.(g);
    const order = [...this.enemies].sort((a, b) => a.footY - b.footY);
    for (const e of order) this.drawEnemyShadow(g, e);
    for (const e of order) this.drawEnemy(g, e);
    this.boss?.drawOver?.(g);
    for (const f of this.fx) if (f.layer === 'world') f.draw(g, f.t, f.dur ? Math.min(1, f.t / f.dur) : 0);
    this.parts.draw(g);
    if (this.showUi) this.drawUi(g);
    for (const f of this.fx) if (f.layer === 'top') f.draw(g, f.t, f.dur ? Math.min(1, f.t / f.dur) : 0);
    if (this.showUi) this.drawSticky(g);
    for (const n of this.numbers) n.draw(g);
    for (const f of this.fx) if (f.layer === 'over') f.draw(g, f.t, f.dur ? Math.min(1, f.t / f.dur) : 0);
    this.partsTop.draw(g);
    this.drawLabels(g);
    ctx.restore();
    if (this.tint) g.rect(0, 0, 384, 216, this.tint.color, this.tint.alpha);
    if (this.tint2) g.rect(0, 0, 384, 216, this.tint2.color, this.tint2.alpha);
    for (const f of this.flashes) g.rect(0, 0, 384, 216, f.color, f.alpha);
    if (this.freezeLook) this.drawFreeze(g);
    this.transitionDraw?.(g);
  }

  /**
   * かねを鳴らす: for the 0.3s standstill the picture drains to grey and dims a
   * step, and 「しーん」 hangs beside the bell — you can see time has stopped.
   */
  private drawFreeze(g: Gfx): void {
    const ctx = g.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'saturation';
    ctx.globalAlpha = 0.85;
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, 384, 216);
    ctx.restore();
    g.rect(0, 0, 384, 216, '#1B1733', 0.22);
    const f = this.freezeLook!;
    const img = shiinLettering();
    g.img(img, Math.round(f.x), Math.round(f.y));
  }

  private drawEnemyShadow(g: Gfx, e: EnemyUnit): void {
    if (!e.visible || e.dead || e.def.boss) return;
    const w = Math.round(e.sizeW * 0.7);
    const x = Math.round(e.x - w / 2 + 3 + e.offX * 0.5);
    const y = e.footY - 3;
    if (e.def.id === 'enemy_soujirou') {
      g.alpha(0.35, () => {
        g.ctx.fillStyle = '#F4E6A8';
        ellipse(g.ctx, e.x, e.footY - 2, 32, 7);
      });
    }
    const appear =
      (e.appearT >= 0 && e.appearT < 300 ? e.appearT / 300 : e.appearT < 0 && e.appearT !== -1 ? 0 : 1) *
      // shrinks away with the silhouette of もとにもどる
      (e.dying ? Math.max(0, Math.min(1, (e.sx - 0.15) / 0.85)) : 1);
    // a soft backlight of dusk behind the enemy (QA round 1): the busy
    // backgrounds (the rain's web, the roofs, the orange of bg_kanenari)
    // step back around it and its outline reads
    const bl = backlight(e.sizeW, e.sizeH);
    g.alpha(e.alpha * appear, () => g.img(bl, Math.round(e.x + e.offX - bl.width / 2), Math.round(e.top + e.offY + e.sizeH * 0.56 - bl.height / 2)));
    // the foot shadow, dark enough to hold on a bright or a dark ground
    const a = 0.5 * e.alpha * appear;
    g.alpha(a, () => {
      g.ctx.fillStyle = C.ink;
      ellipse(g.ctx, x + w / 2, y + 3, w / 2, 3);
      g.ctx.fillStyle = '#1B1733';
      ellipse(g.ctx, x + w / 2, y + 3, Math.max(2, w / 2 - 4), 2);
    });
  }

  /** Current frame composed with decals / blush / ボケ負け desaturation. */
  enemyImage(e: EnemyUnit): HTMLCanvasElement | null {
    const art = e.art;
    if (!art) return null;
    const v = e.view(this.t);
    let src = art.frame(v);
    if (e.status.bokemake && e.alive) src = this.bokeLook(src, !!e.def.boss);
    if (e.decals.length || e.blushT > 0) {
      const c = this.scratch;
      const ctx = this.scratchCtx;
      if (c.width !== src.width || c.height !== src.height) {
        c.width = src.width;
        c.height = src.height;
        ctx.imageSmoothingEnabled = false;
      }
      ctx.clearRect(0, 0, c.width, c.height);
      ctx.drawImage(src, 0, 0);
      ctx.globalCompositeOperation = 'source-atop';
      for (const d of e.decals) {
        const img = d.kind === 'peke' ? pekeMark(20, d.variant, d.kasure) : ovalStamp('みました', 28, 14, d.kasure ? 0.4 : 0.1 + d.variant * 0.05, 3 + d.variant);
        ctx.drawImage(img, Math.round(art.ox + d.x - img.width / 2), Math.round(art.oy + d.y - img.height / 2));
      }
      if (e.blushT > 0) {
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = '#FF6A4D';
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.globalAlpha = 1;
      }
      ctx.globalCompositeOperation = 'source-over';
      src = c;
    }
    return src;
  }

  /**
   * ボケ負け colouring, composited on the GPU (no pixel readback, so dynamic
   * sprites like the boss can be redone every frame): −40% saturation at the
   * same lightness; the boss — whose shadow body is already dark — is instead
   * pulled toward a grey violet, keeping its lightness, so it stays itself.
   */
  private bokeLook(src: HTMLCanvasElement, boss: boolean): HTMLCanvasElement {
    const c = this.scratch2;
    let ctx = this.scratch2Ctx;
    if (c.width !== src.width || c.height !== src.height) {
      c.width = src.width;
      c.height = src.height;
      ctx = this.scratch2Ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
    }
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = boss ? 'color' : 'saturation';
    ctx.globalAlpha = boss ? 0.45 : 0.4;
    ctx.fillStyle = boss ? '#7A6E96' : '#808080';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  }

  /**
   * Boss battles: while a page too long for one line grows the band, the
   * boss sinks with it (up to 10px) so its cap stays in view.
   */
  bandDip(e: EnemyUnit): number {
    if (!e.def.boss || !this.msg.bossMode) return 0;
    return Math.round((Math.max(0, Math.min(18, this.msg.height - 26)) * 10) / 18);
  }

  /** Screen-space top-left of the enemy canvas (before scaling). */
  enemyCanvasXY(e: EnemyUnit): [number, number] {
    const art = e.art!;
    return [e.left - art.ox + e.offX + e.jitterX, e.top - art.oy + e.offY + e.jitterY + this.bandDip(e)];
  }

  drawEnemy(g: Gfx, e: EnemyUnit): void {
    if (!e.visible || !e.art) return;
    const art = e.art;
    const src = this.enemyImage(e);
    if (!src) return;
    const v = e.view(this.t);
    let sx = e.sx;
    let sy = e.sy;
    if (e.appearT >= 0 && e.appearT < 300) {
      const p = e.appearT / 300;
      // 0 → 1.15 → 1.0 (easeOutBack-ish)
      sy *= p < 0.7 ? (p / 0.7) * 1.15 : 1.15 - 0.15 * ((p - 0.7) / 0.3);
    } else if (e.appearT < 0 && e.appearT !== -1) sy = 0;
    const [cx, cy] = this.enemyCanvasXY(e);
    const ctx = g.ctx;
    const w = src.width * sx;
    const h = src.height * sy;
    // anchor: feet (bottom-centre of the logical rect)
    const footX = cx + art.ox + e.sizeW / 2;
    const footY = cy + art.oy + e.sizeH;
    const dx = Math.round(footX - (art.ox + e.sizeW / 2) * sx);
    const dy = Math.round(footY - (art.oy + e.sizeH) * sy);
    const prevA = ctx.globalAlpha;
    ctx.globalAlpha = prevA * e.alpha;
    art.under?.(g, dx, dy, v);
    if (e.status.bokemake && e.alive) {
      // chromatic aberration: red copy −1px, cyan copy +1px, additive α35%
      ctx.globalAlpha = prevA * e.alpha * 0.35;
      ctx.globalCompositeOperation = 'lighter';
      ctx.drawImage(this.tinted(src, '#FF3030', 0), dx - 1, dy, Math.round(w), Math.round(h));
      ctx.drawImage(this.tinted(src, '#30FFFF', 1), dx + 1, dy, Math.round(w), Math.round(h));
      ctx.globalCompositeOperation = 'source-over';
      ctx.globalAlpha = prevA * e.alpha;
    }
    if (!e.def.boss && !e.shear && !art.dynamic) {
      // a 1px dusk rim around the silhouette (QA round 1): pale or orange
      // enemies no longer melt into the web of the rain or their own backdrop
      const rim = rimFor(art.frame(v));
      ctx.globalAlpha = prevA * e.alpha * 0.62;
      ctx.drawImage(rim, Math.round(dx - sx), Math.round(dy - sy), Math.round(rim.width * sx), Math.round(rim.height * sy));
      ctx.globalAlpha = prevA * e.alpha;
    }
    if (e.shear) {
      // lean forward: shift rows (top rows move most)
      const n = src.height;
      for (let r = 0; r < n; r++) {
        const off = Math.round(e.shear * (1 - r / n));
        ctx.drawImage(src, 0, r, src.width, 1, dx + off, dy + Math.round(r * sy), Math.round(w), Math.max(1, Math.round(sy)));
      }
    } else ctx.drawImage(src, dx, dy, Math.round(w), Math.round(h));
    if (e.whiteFrames > 0) ctx.drawImage(this.tinted(src, '#FFF6D8', 2), dx, dy, Math.round(w), Math.round(h));
    ctx.globalAlpha = prevA;
    if (e.alive) art.over?.(g, dx, dy, v);
    this.drawEnemyExtras(g, e);
  }

  private tintCanvases: HTMLCanvasElement[] = [];
  /** Silhouette of `src` in `color` (scratch canvas slot i; not cached). */
  tinted(src: HTMLCanvasElement, color: string, slot: number): HTMLCanvasElement {
    let c = this.tintCanvases[slot];
    if (!c) {
      c = makeCanvas(src.width, src.height)[0];
      this.tintCanvases[slot] = c;
    }
    if (c.width !== src.width || c.height !== src.height) {
      c.width = src.width;
      c.height = src.height;
    }
    const ctx = c.getContext('2d')!;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, c.width, c.height);
    ctx.drawImage(src, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.globalCompositeOperation = 'source-over';
    return c;
  }

  private drawEnemyExtras(g: Gfx, e: EnemyUnit): void {
    if (!e.alive || !e.visible) return;
    // shy lines on the cheek
    if (e.shyT > 0) {
      const fx = e.faceX + 4;
      const fy = e.faceY + 2;
      for (let i = 0; i < 3; i++) g.line(fx + i * 3, fy + 3, fx + i * 3 + 2, fy, C.shu);
    }
    // ボケ負け sweat drops sliding from the top-right of the head
    if (e.status.bokemake) {
      const cyc = e.sweatT % 600;
      const x = e.left + e.sizeW - 6 + e.offX;
      const y = e.headY + 4 + Math.round((cyc / 600) * 10);
      g.alpha(cyc > 480 ? (600 - cyc) / 120 : 1, () => g.img(sweatDrop(), x, y));
    }
    // 溜め中 sticky: 10px over the head; a tall enemy whose head is up under
    // the band gets it stuck on its side instead, a third of the way down
    // (clear of the band and of the vending machine's red ribbons)
    if (e.status.tame) {
      const img = tapeCanvas(52, 16, '溜め中', C.tape, 7);
      let y = e.headY - 10 - 16;
      let x = Math.round(e.x - 26 + e.jitterX);
      if (y < STAGE_TOP) {
        y = Math.max(STAGE_TOP + 4, e.top + Math.round(e.sizeH * 0.3));
        x = Math.round(e.x + e.sizeW / 2 - 6 + e.jitterX);
        if (x + 52 > 381) x = Math.round(e.x - e.sizeW / 2 - 46 + e.jitterX);
      }
      g.img(img, x, y);
    }
  }

  private drawUi(g: Gfx): void {
    const a = this.uiAlpha;
    // enemy HP bars (みました済み) during command input & target selection
    for (const e of this.enemies) {
      const by = this.enemyBarY(e);
      if (by === null) continue;
      const w = Math.min(40, e.sizeW);
      drawBar(g, Math.round(e.x - w / 2), by, w, 3, e.hp / e.maxHp, C.shu, C.grid, e.hpTrail / e.maxHp, C.white);
    }
    this.msg.alpha = a;
    this.msg.draw(g);
    if (this.isBoss) drawChimeSticky(g, this.msg.bottom + 2, this.bossChime.lit, this.bossChime.pops, this.t, this.bossChime.gold);
    // command window area
    if (this.cmd) drawCommand(g, { ...this.cmd, pressed: this.cursorPressed > 0 }, this.rt, a);
    else if (this.party.length) this.drawIdleCommandBox(g, a);
    for (const u of this.party) drawPanel(g, u, { t: this.t, kanenariJoined: this.kanenariJoined, alpha: a });
    if (this.party.length === 1) this.drawEmptySlot(g, a);
    if (this.kanenariJoined) drawKire(g, this.kire, this.kirePops, this.rt, a);
    if (this.list) drawList(g, this.list.rows, this.list.index, this.list.scroll, this.rt, this.cursorPressed > 0);
    if (this.target?.kind === 'enemy') {
      const e = this.target.e;
      const bob = Math.round(Math.sin(this.rt / 130) * 1) + (this.cursorPressed > 0 ? 1 : 0);
      const aim = this.target.aim;
      if (aim && aim.dir === 'right') {
        // lying on its side, pressing at the thing to its right
        const img = cursorStampSide(this.cursorPressed > 0);
        g.img(img, Math.round(aim.x - img.width - 1 + bob), Math.round(aim.y - img.height / 2));
      } else if (!aim && !this.target.part && this.enemyBarY(e) !== null) {
        // an HP bar over the head: the stamp sits 4px above it, never on it;
        // when the bar is up under the band, it lies beside the bar instead
        const by = this.enemyBarY(e)!;
        const w = Math.min(40, e.sizeW);
        const img = cursorStamp(this.cursorPressed > 0);
        const cy = by - 4 - img.height;
        if (cy >= this.msg.bottom + 2) g.img(img, Math.round(e.x - 4), Math.round(cy + bob));
        else {
          const side = cursorStampSide(this.cursorPressed > 0);
          g.img(side, Math.round(e.x - w / 2 - side.width - 3 + bob), Math.round(by + 1 - side.height / 2));
        }
      } else {
        const px = aim ? aim.x : this.target.part ? this.target.part.x : e.x;
        const py = Math.max(this.msg.bottom + 14, aim ? aim.y : this.target.part ? this.target.part.y : e.headY - 4);
        g.img(cursorStamp(this.cursorPressed > 0), Math.round(px - 4), Math.round(py - 12 + bob));
      }
    }
    if (this.card) {
      const t = this.card.t;
      const slide = this.card.closing ? Math.max(0, 1 - t / 160) : Math.min(1, t / 160);
      drawInfoCard(g, this.card.data, 1 - (1 - slide) * (1 - slide));
    }
    // a sticky still waiting to peel on (it follows the lettering) already
    // owns its spot: a label placed in the same frame must not take it
  }

  /**
   * The tutorial sticky: stuck on the glass, over the net's pole and the
   * effects of the stage (it is what the player must read), under the
   * numbers and labels (which keep clear of it).
   */
  private drawSticky(g: Gfx): void {
    if (this.sticky && this.sticky.t >= 0) {
      const img = stickyCanvas(this.sticky.text);
      const st = this.sticky;
      const out = st.ttl && st.t > st.ttl ? Math.min(1, (st.t - st.ttl) / 200) : 0;
      const k = Math.min(1, st.t / 120) * (1 - out);
      const glow = st.pulse && Math.floor(this.rt / 200) % 2 === 0;
      const right = st.pos === 'right';
      // left: (8,52) under the band; right: under the boss's chime sticky
      const P = STICKY_PAD;
      const sx = right ? 381 - (img.width - P) : 8;
      const sy = right ? this.msg.bottom + 26 : 52;
      const dir = right ? 1 : -1;
      g.alpha(k, () => g.img(img, sx - P + dir * Math.round(out * 10), sy - P - Math.round((1 - Math.min(1, st.t / 120)) * 6) + Math.round(out * out * 12)));
      if (glow) g.alpha(0.35 * k, () => g.rect(sx, sy, img.width - P - 3, img.height - P - 3, '#FFFFFF'));
    }
  }

  /**
   * Top of the enemy's overhead HP bar (みました済み, during command input and
   * target selection), or null when it has none: 6px over the head, but
   * never inside the band (tall enemies, the boss).
   */
  enemyBarY(e: EnemyUnit): number | null {
    if (!this.cmd || this.hideEnemyHp || !e.alive || !flag('flag_mimashita_' + e.id) || e.def.invulnerable) return null;
    return Math.max(this.msg.bottom + 3, e.headY - 6 - 3);
  }

  private drawIdleCommandBox(g: Gfx, a: number): void {
    // while not choosing: the command notebook stays, showing the round number doodle
    drawCommand(g, { icons: [], index: 0, pressed: false, noriTab: false, onTab: true }, this.rt, a);
  }

  private drawEmptySlot(g: Gfx, a: number): void {
    // right-hand slot before Kanenari-kun joins: a torn-out page of the blank
    // free-research notebook, taped in at two corners, with a blank name tag
    // that only has a pencilled "？" — a friend's place, still empty
    g.alpha(a * 0.92, () => g.img(emptySlotCanvas(), 248, 156));
    g.alpha(a, () => {
      g.img(slantTape(16, -0.7, '#F7C27A', 2), 243, 151);
      g.img(slantTape(16, -0.7, '#F7C27A', 6), 363, 197);
      g.img(emptyTag(), 280, 144);
    });
  }
}

const rimCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
/** The 1px ring around a sprite's silhouette in #1B1733 (canvas 2px larger). */
function rimFor(src: HTMLCanvasElement): HTMLCanvasElement {
  let c = rimCache.get(src);
  if (c) return c;
  const [cv, ctx] = makeCanvas(src.width + 2, src.height + 2);
  const [sil, sctx] = makeCanvas(src.width, src.height);
  sctx.drawImage(src, 0, 0);
  sctx.globalCompositeOperation = 'source-in';
  sctx.fillStyle = '#1B1733';
  sctx.fillRect(0, 0, src.width, src.height);
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx || dy) ctx.drawImage(sil, 1 + dx, 1 + dy);
  ctx.globalCompositeOperation = 'destination-out';
  ctx.drawImage(src, 1, 1);
  ctx.globalCompositeOperation = 'source-over';
  rimCache.set(src, cv);
  c = cv;
  return c;
}

const backlightCache = new Map<string, HTMLCanvasElement>();
/**
 * A stepped, dithered ellipse of dusk (#1B1733, up to α≈0.3 at the heart)
 * a little larger than the enemy: its backlight against the background.
 */
function backlight(w: number, h: number): HTMLCanvasElement {
  const key = `${w}x${h}`;
  let c = backlightCache.get(key);
  if (c) return c;
  const rx = Math.round(w * 0.7);
  const ry = Math.round(h * 0.62);
  const [cv, ctx] = makeCanvas(rx * 2, ry * 2);
  const img = ctx.createImageData(rx * 2, ry * 2);
  for (let y = 0; y < ry * 2; y++)
    for (let x = 0; x < rx * 2; x++) {
      const dx = (x + 0.5 - rx) / rx;
      const dy = (y + 0.5 - ry) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1) continue;
      const v = (1 - d) * 4;
      // four steps, the edge of each step dithered (Bayer 4×4)
      const step = Math.floor(v) + (BAYER4[y & 3][x & 3] < Math.round((v % 1) * 16) ? 1 : 0);
      if (!step) continue;
      const i = (y * rx * 2 + x) * 4;
      img.data[i] = 0x1b;
      img.data[i + 1] = 0x17;
      img.data[i + 2] = 0x33;
      img.data[i + 3] = Math.round(Math.min(4, step) * 19);
    }
  ctx.putImageData(img, 0, 0);
  backlightCache.set(key, cv);
  c = cv;
  return c;
}

let emptyTagC: HTMLCanvasElement | null = null;
/** The empty slot's name tag: plain masking tape with a pencilled "？". */
function emptyTag(): HTMLCanvasElement {
  if (emptyTagC) return emptyTagC;
  const t = tapeCanvas(40, 18, '', C.tape, 11);
  const [c, ctx] = makeCanvas(t.width, t.height);
  ctx.drawImage(t, 0, 0);
  drawText(ctx, '？', 12, 1, { color: '#8A809A' });
  drawText(ctx, '？', 12, 1, { color: '#6E6480' });
  // a faint eraser smudge where a name was tried and rubbed out
  ctx.globalAlpha = 0.25;
  ctx.fillStyle = '#6E6480';
  for (const [x, y] of [[29, 8], [31, 9], [33, 8], [30, 10], [32, 11]]) ctx.fillRect(x, y, 1, 1);
  emptyTagC = c;
  return c;
}

let shiinC: HTMLCanvasElement | null = null;
/** 「しーん」 in quiet manga lettering: paper-white, a slate edge and an ink outline. */
function shiinLettering(): HTMLCanvasElement {
  if (shiinC) return shiinC;
  const txt = 'しーん';
  const w = 16 * 3 + 6;
  const [c, ctx] = makeCanvas(w, 24);
  for (const [dx, dy, col] of [[-2, 0, '#2A2440'], [2, 0, '#2A2440'], [0, -2, '#2A2440'], [0, 2, '#2A2440'], [-1, -1, '#2A2440'], [1, 1, '#2A2440'], [1, -1, '#2A2440'], [-1, 1, '#2A2440'], [-1, 0, '#6B7186'], [1, 0, '#6B7186'], [0, -1, '#6B7186'], [0, 1, '#6B7186'], [0, 0, '#F4F1E8']] as [number, number, string][])
    drawText(ctx, txt, 3 + dx, 4 + dy, { color: col });
  shiinC = c;
  return c;
}

/** SEs that may share the "!" frame (they are the answer to it). */
const WARN_COMPANIONS = new Set(['se_warn', 'se_bishi', 'se_kiran', 'se_kabuse', 'se_damage']);

let glintC: HTMLCanvasElement | null = null;
/** 13×13 four-point glint (#FFF6D8 core, #FFD23F arms, ink tips). */
function glintSprite(): HTMLCanvasElement {
  if (glintC) return glintC;
  const rows = [
    '......k......',
    '......y......',
    '......y......',
    '.....yWy.....',
    '.....yWy.....',
    '....yWWWy....',
    'kyyyWWWWWyyyk',
    '....yWWWy....',
    '.....yWy.....',
    '.....yWy.....',
    '......y......',
    '......y......',
    '......k......',
  ];
  const [c, ctx] = makeCanvas(13, 13);
  const pal: Record<string, string> = { k: '#B8241E', y: '#FFD23F', W: '#FFF6D8' };
  rows.forEach((r, y) => [...r].forEach((ch, x) => {
    if (!pal[ch]) return;
    ctx.fillStyle = pal[ch];
    ctx.fillRect(x, y, 1, 1);
  }));
  glintC = c;
  return c;
}

let paperBitsC: HTMLCanvasElement[] | null = null;
/**
 * Paper scraps 3×2 – 4×3 (#FBF3DC / #E8D9B5 / #F4F1E8): a lit top row, a
 * shaded bottom-right pixel and a dark ink outline, so each one reads as a
 * torn bit of notebook on the bright sunset.
 */
function paperBits(): HTMLCanvasElement[] {
  if (paperBitsC) return paperBitsC;
  const defs: [number, number, string, string][] = [
    [4, 3, '#FBF3DC', '#C9B68E'],
    [3, 3, '#F4F1E8', '#C9B68E'],
    [4, 2, '#FBF3DC', '#D8C49A'],
    [3, 2, '#E8D9B5', '#B8A278'],
    [4, 3, '#F4F1E8', '#D8C49A'],
  ];
  paperBitsC = defs.map(([w, h, a, b], k) => {
    const [c, ctx] = makeCanvas(w + 2, h + 2);
    ctx.fillStyle = C.ink;
    ctx.fillRect(1, 0, w, h + 2);
    ctx.fillRect(0, 1, w + 2, h);
    ctx.fillStyle = a;
    ctx.fillRect(1, 1, w, h);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(1, 1, w - 1, 1);
    ctx.fillStyle = b;
    ctx.fillRect(w, h, 1, 1);
    if (h > 2) ctx.fillRect(1 + (k % 2), h, 1, 1);
    // a notebook rule line across one of them
    if (k === 0) {
      ctx.fillStyle = '#AFC4E0';
      ctx.fillRect(1, 2, w, 1);
    }
    return c;
  });
  return paperBitsC;
}

let starBitsC: HTMLCanvasElement[] | null = null;
/** Stars (#FFD23F, core #FFF6D8) with an ink outline: 9px and 7px for hits, 5px for glints. */
function starBits(): HTMLCanvasElement[] {
  if (starBitsC) return starBitsC;
  const mk = (rows: string[]) => {
    const [c, ctx] = makeCanvas(rows[0].length, rows.length);
    const pal: Record<string, string> = { k: C.ink, y: '#FFD23F', w: '#FFF6D8' };
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (!pal[ch]) return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }));
    return c;
  };
  starBitsC = [
    mk(['....k....', '...kyk...', '...kyk...', '.kkkykkk.', 'kyyywyyyk', '.kkkykkk.', '...kyk...', '...kyk...', '....k....']),
    mk(['...k...', '..kyk..', '.kkykk.', 'kyywyyk', '.kkykk.', '..kyk..', '...k...']),
    mk(['..k..', '.kyk.', 'kywyk', '.kyk.', '..k..']),
  ];
  return starBitsC;
}

function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    const k = 1 - (y * y) / (ry * ry);
    if (k < 0) continue;
    const hw = Math.round(rx * Math.sqrt(k));
    ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1);
  }
}
