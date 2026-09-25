// BattleScene: owns battle state, time control (own hitstop / freeze / slow
// motion), rendering, and the helper API used by the battle flow coroutines.

import type { Co } from '../engine/co';
import { Runner } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { Particles, type BurstOpts } from '../engine/particles';
import { rng } from '../engine/rng';
import { BAYER4, makeCanvas } from '../engine/pixel';
import { drawText, measure } from '../engine/font';
import { flag, state } from '../game/state';
import { sfx, type SfxOpts } from '../audio';
import * as audio from '../audio';
import type { BattleOpts, BattleResult } from './api';
import { getEnemy } from '../data/battle';
import { makeBackground, type Background } from './bg';
import { EnemyUnit, PartyUnit, type BossPart } from './model';
import { DamageNumber, type NumOpts, type NumRect } from './fx/numbers';
import { MessageBand, type BandPageOpts } from './ui/message';
import { emptySlotCanvas } from './ui/panels';
import {
  CARD_H, CARD_Y, drawActing, drawChimeSticky, drawCommand, drawInfoCard, drawKire, drawList, drawPanel, KIRE_TAB, PANEL_POS, TAG, type CardData, type CmdView, type ListRow,
} from './ui/panels';
import { C, cursorStamp, cursorStampSide, drawBar, slantTape, STICKY_PAD, stickyCanvas, tapeCanvas } from './ui/note';
import { inkLabel, ovalStamp, pekeMark, petalSprites } from './art/stamps';
import { hitCrack, hitSplash, sweatDrop } from './art/fxart';
import { boarIcon, moyamoya } from './art/fxart_ch2';
import { syncCh2Bg } from './ch2rules';

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
  /** Cost per step down the `sides` list (how strongly the order is kept). */
  sideCost?: number;
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
  /** The boss's own stickies under the band (replaces the chime sticky). */
  drawUi?(g: Gfx): void;
  /** Over everything but the flashes (the finale's overlays). */
  drawTop?(g: Gfx): void;
}

/** Enemy x positions by count (15.4). */
export const SLOTS: Record<number, number[]> = { 1: [192], 2: [140, 244], 3: [96, 192, 288] };
/** Top of the stage: numbers and labels stay under the 2-line band (y4–48). */
export const STAGE_TOP = 51;
/** Where drawList() puts the hanko / item list. */
const LIST_RECT = { x0: 4, y0: 58, x1: 204, y1: 146 };
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
  /** Which boss this is ('' for other battles). */
  bossKind: '' | 'omukaemachi' | 'yobimodoshi' = '';
  /** A battle on the 星見台 maps (第2章: the tomato's light, ボケD). */
  hoshi: boolean;
  /** Only the band on black (ヨビモドシ's quiet results). */
  blackStage = false;
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
  private shk = { ax: 0, ay: 0, t: 0, dur: 0, x: 0, y: 0, n: 0 };
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
  /** Members knocked to 0 by the action playing out (〔へばった〕 is said once it ends). */
  fallen: PartyUnit[] = [];
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
    this.bossKind = !this.isBoss ? '' : opts.enemies.includes('boss_yobimodoshi') ? 'yobimodoshi' : 'omukaemachi';
    this.hoshi = (state.map ?? '').startsWith('map_hoshi') || opts.enemies.some((id) => getEnemy(id)?.chapter === 2);
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
    if (this.hoshi) syncCh2Bg(this);
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
      if (this.shk.t > 0) this.stepShake();
      else this.shk.x = this.shk.y = 0;
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
        const back = e.status.shindafuri ? 'dead' : e.status.tame ? 'charge' : e.status.hiraki ? 'open' : e.status.kyuukei ? 'rest' : e.hurtReturn;
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

  /**
   * Directional shake (px amplitude on each axis) for `frames` (QA round 2:
   * a random offset with a squared decay rounded to 0px on most frames).
   * The first three frames swing the full amplitude with alternating signs,
   * then it decays linearly — never below 1px while it lasts. It keeps going
   * through the hitstop (it is the hit's own jolt).
   */
  shake(ax: number, ay: number, frames: number): void {
    const ms = frames * FRAME;
    const curA = Math.max(this.shk.ax, this.shk.ay) * (this.shk.t > 0 ? this.shk.t / this.shk.dur : 0);
    if (Math.max(ax, ay) >= curA) {
      this.shk.ax = ax;
      this.shk.ay = ay;
      this.shk.t = ms;
      this.shk.dur = ms;
      this.shk.n = 0;
      // the frame the hit is drawn on already jolts
      this.stepShake();
    }
  }

  private stepShake(): void {
    const sh = this.shk;
    const n = sh.n++;
    const k = n < 3 ? 1 : Math.max(0, sh.t / sh.dur);
    const mag = (a: number) => (a <= 0 ? 0 : Math.max(1, Math.round(a * k)));
    // x flips every frame; with both axes y flips every other frame, so the
    // jolt never slides along one diagonal (a vertical-only one flips each frame)
    sh.x = (n % 2 ? 1 : -1) * mag(sh.ax);
    sh.y = (sh.ax > 0 ? ((n + 1) >> 1) % 2 : n % 2) ? mag(sh.ay) : -mag(sh.ay);
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
  private occ: { r: Rect; until: number; num?: boolean }[] = [];
  /** Labels are drawn after the numbers and every effect, so nothing cuts them. */
  labels: FloatLabel[] = [];
  /** Most recent number per enemy (labels pair with it). */
  private lastNum = new Map<EnemyUnit | PartyUnit, { d: DamageNumber; at: number; path: Rect }>();

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
    // the chime tag hangs under the band and moves down with it when a
    // 2-line page grows it (QA round 3: a label placed under a 1-line band
    // ended up under the tag): keep its lowest reach clear
    if (this.isBoss) out.push({ x0: 292, y0: 0, x1: 382, y1: 4 + 44 + 2 + 24 + 2 });
    // an enemy's 溜め中 tape
    for (const e of this.enemies) {
      const r = this.tameRect(e);
      if (r) out.push(r);
    }
    // a sticky still waiting to peel on (it follows the lettering) already
    // owns its spot: a label placed in the same frame must not take it
    const sp = this.stickyPlace();
    if (sp) out.push({ x0: sp.x - STICKY_PAD, y0: sp.y - STICKY_PAD, x1: sp.x + sp.img.width - STICKY_PAD, y1: sp.y + sp.img.height - STICKY_PAD });
    if (this.card) {
      const d = this.card.data;
      const x = d.x ?? (d.side === 'left' ? 8 : 216);
      out.push({ x0: x - 2, y0: CARD_Y - 6, x1: x + (d.w ?? 160) + 4, y1: CARD_Y + CARD_H + 2 });
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
      if (e.dead || !e.visible) continue;
      out.push({ x0: e.faceX - 12, y0: e.faceY - 12, x1: e.faceX + 12, y1: e.faceY + 12 });
    }
    return out;
  }

  /**
   * Enemy bodies (the middle 70% of the sprite): a hit label goes beside the
   * enemy, not over the × decal or the body it is about (QA round 3). The
   * boss is left out — its body is the whole stage; its labels have their
   * own spots (the cap, the parts' outer sides).
   */
  bodyRects(): Rect[] {
    const out: Rect[] = [];
    for (const e of this.enemies) {
      // a finishing hit's label is placed while the body is still there
      // (it turns white and shrinks away afterwards)
      if (e.dead || !e.visible || e.def.boss) continue;
      const w = e.sizeW;
      const h = e.sizeH;
      const x0 = e.left + e.offX;
      const y0 = e.top + e.offY;
      out.push({ x0: Math.round(x0 + w * 0.15), y0: Math.round(y0 + h * 0.15), x1: Math.round(x0 + w * 0.85), y1: Math.round(y0 + h * 0.85) });
    }
    return out;
  }

  /**
   * The status tapes stuck over an enemy's head (51 7.2 / 13.5), oldest
   * first: 「徹夜中」 or 「休憩中」, then 「溜め中」 on top (14px up). A tall
   * enemy whose head is up under the band gets them stuck on its side, a
   * third of the way down, stacking downward (clear of the band).
   */
  enemyTapes(e: EnemyUnit): { text: string; color: string; x: number; y: number; kind: string }[] {
    if (!e.alive || !e.visible) return [];
    const list: { text: string; color: string; kind: string }[] = [];
    if (e.status.kyuukei || (e.status.kyuukeiSkipped && !e.status.tetsuya)) list.push({ text: '休憩中', color: '#9BCB6B', kind: 'kyuukei' });
    else if (e.status.tetsuya) list.push({ text: '徹夜中', color: '#F6D98A', kind: 'tetsuya' });
    if (e.status.tame) list.push({ text: '溜め中', color: C.tape, kind: 'tame' });
    if (!list.length) return [];
    let y = e.headY - 10 - 16;
    let x = Math.round(e.x - 26);
    let dy = -14;
    if (y + dy * (list.length - 1) < STAGE_TOP) {
      y = Math.max(STAGE_TOP + 4, e.top + Math.round(e.sizeH * 0.3));
      x = Math.round(e.x + e.sizeW / 2 - 6);
      if (x + 52 > 381) x = Math.round(e.x - e.sizeW / 2 - 46);
      dy = 18;
    }
    return list.map((l, i) => ({ ...l, x, y: y + dy * i }));
  }

  /** Where an enemy's status tapes are (null without any): numbers and labels keep clear. */
  tameRect(e: EnemyUnit): Rect | null {
    const t = this.enemyTapes(e);
    if (!t.length) return null;
    const x0 = Math.min(...t.map((q) => q.x)) - 2;
    const y0 = Math.min(...t.map((q) => q.y));
    const y1 = Math.max(...t.map((q) => q.y)) + 16;
    // the ▲ of 徹夜中 hang off its right end
    return { x0, y0, x1: x0 + 56 + (e.status.tetsuya ? 12 : 0), y1 };
  }

  /**
   * Is `r` on screen, clear of the fixed UI and of every live reservation
   * (and, for labels, the faces and — with `bodies` — the enemies' bodies)?
   */
  fits(r: Rect, ignoreOcc = false, faces = false, bodies = false): boolean {
    if (r.x0 < 2 || r.x1 > 382 || r.y0 < 0 || r.y1 > 214) return false;
    for (const b of this.blockedRects()) if (BattleScene.overlap(r, b, 0)) return false;
    if (bodies) for (const b of this.bodyRects()) if (BattleScene.overlap(r, b, 0)) return false;
    if (faces) {
      for (const b of this.faceRects()) if (BattleScene.overlap(r, b, 0)) return false;
      for (const f of this.fx) {
        const b = !f.done && f.blockLabels ? f.blockLabels() : null;
        if (b && BattleScene.overlap(r, b, 0)) return false;
      }
    }
    // a live number is never covered; `ignoreOcc` only lets a label touch
    // another label's fading spot
    for (const o of this.occ) if (o.until > this.rt && (!ignoreOcc || o.num) && BattleScene.overlap(r, o.r)) return false;
    return true;
  }

  reserve(r: Rect, ms: number, num = false): void {
    this.occ = this.occ.filter((o) => o.until > this.rt);
    this.occ.push({ r, until: this.rt + ms, num });
  }

  /**
   * Pop a damage / heal number. `lay` picks how it gets out of the way of
   * live numbers and labels: 'enemy' puts a multi-hit's next number
   * diagonally off the previous one (then further out), 'party' lines them
   * up in a row along the top of the panel, 'free' keeps the exact spot.
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
      const cands: [number, number][] = [];
      // a small enemy's face (its × eyes, its squash) is the hit's other
      // half: no number comes to rest on it
      const face = owner?.kind === 'enemy' && !owner.def.boss && owner.sizeH <= 48 ? this.faceBox(owner) : null;
      const prev = lay === 'enemy' && owner ? this.recentNumberRect(owner, 700) : null;
      if (lay === 'enemy') {
        if (prev) {
          // QA round 2: the next hit of a multi-hit never sits level with the
          // last one ("16" "19" read as "1619"): it goes diagonally above it
          // with a 4px gap, else diagonally below, else well to the side —
          // and pops almost in place (4px rise), so it never crosses the
          // first one on its way up
          d.setRise(4);
          const r0 = d.restRect();
          const to = (x0: number, y0: number): [number, number] => [x0 - r0.x0, y0 - r0.y0];
          const pw = prev.x1 - prev.x0;
          cands.push(
            to(prev.x0 + Math.round(pw * 0.45), prev.y0 - 4 - h),
            to(prev.x0 - Math.round(w * 0.45), prev.y0 - 4 - h),
            to(prev.x1 + 4, prev.y0 - 10),
            to(prev.x0 - 4 - w, prev.y0 - 10),
            to(prev.x0 + Math.round(pw * 0.45), prev.y1 + 4),
            to(prev.x1 + 4, prev.y1 - 6),
            to(prev.x0 - 4 - w, prev.y1 - 6),
            to(prev.x1 + 8, prev.y1 + 4),
            to(prev.x0 - 8 - w, prev.y1 + 4),
          );
        } else cands.push([0, 0]);
        // (+10, −6) stacking; when the band is in the way, step down and
        // out instead — never level with a neighbour (two numbers side by
        // side at one height read as one: "20 17" → "2017")
        for (let k = 1; k <= 7; k++) cands.push([10 * k, -6 * k]);
        for (let k = 1; k <= 5; k++) cands.push([-10 * k, -6 * k]);
        for (let k = 1; k <= 4; k++) cands.push([(w + 6) * k, 10 * k], [-(w + 6) * k, 10 * k]);
      } else {
        cands.push([0, 0]);
        // a row along the top of the panel, first leftward (away from the
        // tsukkomi "!" over the photo's right half), then past it to the
        // right; neighbours step up 6px and keep a 6px gap so two single
        // digits never read as one number
        for (let row = 0; row < 3; row++) {
          for (let k = row ? 0 : 1; k <= 3; k++) cands.push([-(w + 6) * k, -(h + 4) * row - (k % 2) * 6]);
          for (let k = 1; k <= 6; k++) cands.push([(w + 6) * k, -(h + 4) * row - (k % 2) * 6]);
        }
      }
      const clear = (r: Rect) => {
        if (!this.fits(r)) return false;
        if (face && (BattleScene.overlap(r, face, 0) || BattleScene.overlap(this.popRect(d), face, 0))) return false;
        if (prev && (BattleScene.overlap(r, prev, 3) || BattleScene.overlap(this.popRect(d, 1), prev, 0))) return false;
        return true;
      };
      let ok = false;
      for (const [dx, dy] of cands) {
        d.x = x + dx;
        d.y = y + dy;
        if (clear(d.restRect())) {
          ok = true;
          break;
        }
      }
      if (!ok) {
        d.x = x;
        d.y = y;
      }
    }
    // the whole path is reserved, from where it pops to where it rests: a
    // label placed a few frames later never sits across the rising digits
    const pr = this.popRect(d, 1.2);
    const rr = d.restRect();
    const path = lay === 'party' ? rr : { x0: Math.min(pr.x0, rr.x0), y0: rr.y0, x1: Math.max(pr.x1, rr.x1), y1: Math.max(pr.y1, rr.y1) };
    this.reserve(path, d.life, true);
    this.numbers.push(d);
    if (owner) this.lastNum.set(owner, { d, at: this.rt, path });
    // debris born this frame never sits on (or flies into) the number
    this.clearAround(d);
    return d;
  }

  /** A small enemy's face box (the eyes and a little around them). */
  private faceBox(e: EnemyUnit): Rect {
    return { x0: e.faceX - 10, y0: e.faceY - 8, x1: e.faceX + 10, y1: e.faceY + 8 };
  }

  /** The number's rect on the frame it pops (1.6× wide, bottom on its origin). */
  private popRect(d: DamageNumber, k = 1.6): Rect {
    const w = d.img.width * k;
    return { x0: Math.round(d.x - w / 2), y0: Math.round(d.y - d.img.height), x1: Math.round(d.x + w / 2), y1: Math.round(d.y) };
  }

  /**
   * Particles born in the last few frames that lie on the number's path (its
   * pop rect up to its rest rect) are moved just outside it, sideways or
   * below, and turned away from it: frozen through the hitstop, they would
   * otherwise sit on the digits (a scrap left of "32" reads as "-32").
   */
  private clearAround(d: DamageNumber): void {
    const a = this.popRect(d);
    const b = d.restRect();
    const R = { x0: Math.min(a.x0, b.x0) - 3, y0: Math.min(a.y0, b.y0) - 3, x1: Math.max(a.x1, b.x1) + 3, y1: Math.max(a.y1, b.y1) + 3 };
    for (const ps of [this.partsTop, this.parts])
      for (const p of ps.list) {
        if (p.maxLife - p.life > 90) continue;
        const hw = ((p.img?.width ?? p.size) as number) / 2 + 1;
        const hh = ((p.img?.height ?? p.size) as number) / 2 + 1;
        if (p.x + hw < R.x0 || p.x - hw > R.x1 || p.y + hh < R.y0 || p.y - hh > R.y1) continue;
        const dl = p.x - R.x0;
        const dr = R.x1 - p.x;
        const db = R.y1 - p.y;
        if (db <= dl && db <= dr) {
          p.y = R.y1 + hh;
          p.vy = Math.abs(p.vy) * 0.6 + 20;
        } else if (dl < dr) {
          p.x = R.x0 - hw;
          p.vx = -Math.abs(p.vx);
          if (p.vy < 0) p.vy *= 0.4;
        } else {
          p.x = R.x1 + hw;
          p.vx = Math.abs(p.vx);
          if (p.vy < 0) p.vy *= 0.4;
        }
      }
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

  /** The whole path (pop spot to rest spot) of that number: a label sits beside all of it. */
  recentNumberPath(owner: EnemyUnit | PartyUnit, ms = 400): Rect | null {
    const r = this.lastNum.get(owner);
    if (!r || this.rt - r.at > ms || r.d.done) return null;
    return r.path;
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
    sideCost = 6,
  ): void {
    const img = inkLabel(text, tone, worn);
    this.labels.push({ img, t: -delay, ms, x: 0, y: 0, placed: false, anchor, sides, sideCost });
  }

  private placeLabel(l: FloatLabel): void {
    const a = l.anchor();
    const w = l.img.width;
    const h = l.img.height;
    const acx = (a.x0 + a.x1) / 2;
    const acy = (a.y0 + a.y1) / 2;
    // `out` steps a side label further out from its anchor (right / left):
    // beside a number over a wide enemy's head that clears the body's edge
    const at = (side: LabelSide, nudge: number, out = 0): [number, number] => {
      switch (side) {
        case 'center':
          return [acx - w / 2 + nudge, acy - h / 2];
        case 'above':
          return [acx - w / 2 + nudge, a.y0 - 2 - h];
        case 'below':
          return [acx - w / 2 + nudge, a.y1 + 2];
        case 'right':
          return [a.x1 + 3 + out, acy - h / 2 + nudge];
        case 'left':
          return [a.x0 - 3 - w - out, acy - h / 2 + nudge];
        case 'aboveRight':
          return [a.x1 - 4 + nudge, a.y0 - 2 - h];
        case 'aboveLeft':
          return [a.x0 + 4 - w + nudge, a.y0 - 2 - h];
      }
    };
    const nudges = [0, 4, -4, 8, -8, 12, -12, 16, -16, 20, -20];
    // how far (px) a label may stand from what it is about: further out it
    // no longer reads as that hit's label (QA round 3: with a sticky up, the
    // いい音！ of a hit flew 60px off to the corner)
    const NEAR = 32;
    const gap = (r: Rect) => Math.max(0, a.x0 - r.x1, r.x0 - a.x1, a.y0 - r.y1, r.y0 - a.y1);
    // pass 1: clear of everything, bodies too; 2: may touch a fading
    // reservation; 3: may touch a body (but not a face); 4: may touch a face
    // (a crowded moment still gets its label, right next to its hit)
    const passes: [boolean, boolean, boolean][] = [
      [false, true, true],
      [true, true, true],
      [true, true, false],
      [true, false, false],
    ];
    for (const [ignoreOcc, faces, bodies] of passes) {
      // of every free spot, the one nearest the anchor wins (the side order
      // breaks ties): a label stays next to what it is about
      let best: Rect | null = null;
      let bestCost = Infinity;
      l.sides.forEach((side, si) => {
        const outs = side === 'left' || side === 'right' ? [0, 6, 12, 20] : [0];
        for (const n of side === 'center' ? [0] : nudges)
        for (const o of outs) {
          const [x, y] = at(side, n, o);
          const r = { x0: Math.round(x), y0: Math.round(y), x1: Math.round(x + w), y1: Math.round(y + h) };
          if (side !== 'center' && gap(r) > NEAR) continue;
          if (!this.fits(r, ignoreOcc, faces, bodies)) continue;
          const cost = Math.hypot((r.x0 + r.x1) / 2 - acx, (r.y0 + r.y1) / 2 - acy) + si * (l.sideCost ?? 6);
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
    // crowded: any side, further along the edges, rather than over a number
    const all: LabelSide[] = ['above', 'right', 'left', 'below', 'aboveRight', 'aboveLeft'];
    let best: Rect | null = null;
    let bestCost = Infinity;
    for (const side of all)
      for (const n of [0, 6, -6, 12, -12, 20, -20, 28, -28, 36, -36]) {
        const [x, y] = at(side, n);
        const r = { x0: Math.round(x), y0: Math.round(y), x1: Math.round(x + w), y1: Math.round(y + h) };
        if (!this.fits(r, true, false)) continue;
        const cost = Math.hypot((r.x0 + r.x1) / 2 - acx, (r.y0 + r.y1) / 2 - acy);
        if (cost < bestCost) {
          bestCost = cost;
          best = r;
        }
      }
    if (best) {
      const r: Rect = best;
      l.x = r.x0;
      l.y = r.y0;
      l.placed = true;
      this.reserve(r, l.ms);
      return;
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
    if (!e.def.boss) {
      // a tall enemy whose head is up under the band (the vending machine):
      // over its head the number would come to rest on its face — it pops
      // beside the body instead, a third of the way down (QA round 3)
      const head = e.headY + e.offY;
      const restBottom = Math.max(Math.min(e.coreY, head - 4), STAGE_TOP + NUM_RISE + h) - NUM_RISE;
      if (restBottom - head > 8) {
        const half = 12;
        let x = e.left + e.offX + e.sizeW + 4 + half;
        // its 溜め中 tape hangs on that side: the number takes the other
        const tape = this.tameRect(e);
        if (x + half + 8 > 380 || (tape && tape.x0 >= e.x)) x = e.left + e.offX - 4 - half - 6;
        const y = e.top + e.offY + Math.round(e.sizeH * 0.4) + NUM_RISE - stack * 6;
        return [Math.round(x + stack * 10), Math.round(Math.max(y, STAGE_TOP + NUM_RISE + h))];
      }
    }
    const x = (e.def.boss ? e.coreX + 36 : e.coreX) + stack * 10;
    // QA round 2: over the head (headY − 4), not from the core — the number
    // and its plate covered a small enemy's whole face, and its hurt face
    // (× eyes, the squash) is half of what the hit feels like
    const y = (e.def.boss ? e.coreY : Math.min(e.coreY, e.headY + e.offY - 4)) - stack * 6;
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
      () => this.recentNumberPath(e) ?? { x0: e.coreX - 8, y0: e.coreY - 24, x1: e.coreX + 8, y1: e.coreY - 8 },
      ['above', 'right', 'left', 'below'],
      tone,
      ms,
      worn,
      delay,
      // beside the number beats under it (under it is the body)
      14,
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
      // alternately to the right and to the left, level to a little below:
      // never up into the number that rises out of the hit (QA round 2)
      const angle: [number, number] = i % 2 === 0 ? [-Math.PI * 0.14, Math.PI * 0.32] : [Math.PI * 0.68, Math.PI * 1.14];
      this.burst(x, y, { count: 1, speed, angle, life: [260, 380], colors: ['#FBF3DC'], gravity: 200, shape: 'img', img: bits[i % bits.length] }, true);
      this.leadOut(this.partsTop, 7 + (i % 3) * 2);
    }
  }
  stars(x: number, y: number, n: number, speed: [number, number] = [80, 160]): void {
    const st = starBits();
    for (let i = 0; i < n; i++) {
      const angle: [number, number] = i % 2 === 0 ? [-Math.PI * 0.22, Math.PI * 0.25] : [Math.PI * 0.75, Math.PI * 1.22];
      this.burst(x, y, { count: 1, speed, angle, life: [280, 440], colors: ['#FFD23F'], gravity: 60, drag: 2, shape: 'img', img: st[i % 2] }, true);
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
  /**
   * Vermilion drops of a firm stamp (QA round 2: 1–3px squares of pure
   * vermilion vanished into the red X and the sunset): 2–3px drops and
   * teardrops with an ink rim and a cream glint, flung out and falling.
   */
  shuDrops(x: number, y: number, n: number): void {
    const imgs = shuDropBits();
    for (let i = 0; i < n; i++) {
      this.burst(x, y, { count: 1, speed: [70, 170], angle: [-Math.PI * 1.05, Math.PI * 0.05], life: [420, 700], colors: ['#E23B2E'], gravity: 320, drag: 1, shape: 'img', img: imgs[i % imgs.length] }, true);
      // frozen through the hitstop: they are born already flung out, a
      // splash crown round the seal instead of a clot on its centre
      this.leadOut(this.partsTop, 10 + (i % 4) * 4);
    }
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
  private confirmFrame = -99;

  /**
   * Battle SE with the transients kept apart (40_audio 1.6-3 "a reply to
   * each press"): the "!" ping owns its frame — a move's own SE asked for on
   * the same frame (the card toss, the glove, the kick…) follows 100ms later
   * instead of smearing into it.
   */
  sfx(id: string, o?: SfxOpts): void {
    if (id === 'se_confirm') this.confirmFrame = this.frame;
    // the net's whoosh right on the last command's confirm click (the first
    // action starts on that frame) waits 70ms: two transients, not one smear
    if (id === 'se_swing' && this.frame - this.confirmFrame <= 2) {
      this.sfxLater(id, o, 70);
      return;
    }
    if (id === 'se_warn') this.warnFrame = this.frame;
    else if (this.frame - this.warnFrame <= 1 && !WARN_COMPANIONS.has(id)) {
      this.sfxLater(id, o, 100);
      return;
    }
    if (STAGGER_SFX.has(id)) {
      // the same thud twice on one frame (a party-wide hit: one per member)
      // would just stack +3–6dB into the limiter: the next one follows
      // 50ms later, a little lower (QA round 2)
      const n = this.sfxFrame.get(id);
      const k = n && n.frame === this.frame ? n.count : 0;
      this.sfxFrame.set(id, { frame: this.frame, count: k + 1 });
      if (k > 0) {
        this.sfxLater(id, { ...o, pitch: (o?.pitch ?? 1) * (1 - 0.06 * k), vol: (o?.vol ?? 1) * 0.8 }, 50 * k);
        return;
      }
    }
    sfx(id, o);
  }
  private sfxFrame = new Map<string, { frame: number; count: number }>();

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
  *say(pages: string[] | string, manual = false, o: BandPageOpts = {}): Co {
    this.msgInteractive = true;
    yield* this.msg.show(pages, { ...o, manual });
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
    if (this.blackStage) {
      // 51 16.2: the night has gone to sleep — only the band (and the report
      // card) on black, no stage, no panels
      g.clear('#0B0B14');
      if (!this.msg.hidden) {
        this.msg.alpha = 1;
        this.msg.draw(g);
      }
      for (const f of this.fx) if (f.layer === 'top' && f.ui) f.draw(g, f.t, f.dur ? Math.min(1, f.t / f.dur) : 0);
      for (const f of this.flashes) g.rect(0, 0, 384, 216, f.color, f.alpha);
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
    // debris, stars, sweat and petals fly over the stage and the panels but
    // pass behind the band (its lines stay whole) and under the numbers —
    // the number is the reward of the hit and is never cut (QA round 2)
    if (this.showUi && !this.msg.hidden) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(-8, this.msg.bottom, 400, 240);
      ctx.clip();
      this.partsTop.draw(g);
      ctx.restore();
    } else this.partsTop.draw(g);
    for (const n of this.numbers) n.draw(g);
    for (const f of this.fx) if (f.layer === 'over') f.draw(g, f.t, f.dur ? Math.min(1, f.t / f.dur) : 0);
    this.drawLabels(g);
    this.boss?.drawTop?.(g);
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
    if (this.hoshi) {
      // 51 8.0: at night the light behind the enemy is the tomato's — a warm
      // orange ellipse (w×0.9, h×0.6) a little down-left of the core; in the
      // first スネトマト battle the はなまるトマト itself glows at its back
      const house = this.opts.enemies[0] === 'enemy_sune_tomato' && !flag('flag_ch2_got_tomato');
      const bl = house ? warmBacklight(e.sizeW, e.sizeH, true) : warmBacklight(e.sizeW, e.sizeH, false);
      const bx = e.coreX - (house ? 0 : 6);
      const by = e.coreY + (house ? -4 : 6);
      g.alpha(e.alpha * appear, () => g.img(bl, Math.round(bx - bl.width / 2), Math.round(by - bl.height / 2)));
      // the foot shadow: #0B0B14 α40%, 6px tall, 3px to the right
      const fw = Math.round(e.sizeW * 0.7);
      g.alpha(0.4 * e.alpha * appear, () => {
        g.ctx.fillStyle = '#0B0B14';
        ellipse(g.ctx, e.x + 3 + e.offX * 0.5, e.footY - 1, fw / 2, 3);
      });
      return;
    }
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
        const img =
          d.kind === 'peke'
            ? pekeMark(20, d.variant, d.kasure)
            : d.kind === 'otsukare'
              ? ovalStamp('おつかれ', 28, 12, d.kasure ? 0.4 : 0.1 + d.variant * 0.05, 5 + d.variant)
              : ovalStamp('みました', 28, 14, d.kasure ? 0.4 : 0.1 + d.variant * 0.05, 3 + d.variant);
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
    if (e.whiteFrames > 0) {
      if (e.id === 'boss_yobimodoshi' && (e.params.light ?? 1) < 0.5 && e.alive) {
        // 51 10.9: in the dark only the silhouette's outline flashes white
        const rim = rimFor(src);
        ctx.drawImage(this.tinted(rim, '#FFF6D8', 2), Math.round(dx - sx), Math.round(dy - sy), Math.round(rim.width * sx), Math.round(rim.height * sy));
      } else ctx.drawImage(this.tinted(src, '#FFF6D8', 2), dx, dy, Math.round(w), Math.round(h));
    }
    ctx.globalAlpha = prevA;
    // live overlays (the vending machine's LED…) sit under a white flash,
    // not on top of it (QA round 3: a green 17:00 floated on the white)
    if (e.alive && !(e.whiteFrames > 0)) art.over?.(g, dx, dy, v);
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
    // status tapes (溜め中 / 徹夜中 / 休憩中): 10px over the head, or on the side
    for (const tp of this.enemyTapes(e)) {
      const img = tapeCanvas(52, 16, tp.text, tp.color, tp.kind === 'tame' ? 7 : tp.kind === 'tetsuya' ? 9 : 11);
      const pop = e.params['tapeAt_' + tp.kind];
      const k = pop !== undefined && this.t - pop < 140 ? 1.4 - 0.4 * ((this.t - pop) / 140) : 1;
      const jx = tp.kind === 'tame' ? e.jitterX : 0;
      if (k !== 1) {
        const w = Math.round(img.width * k);
        const h = Math.round(img.height * k);
        g.ctx.drawImage(img, Math.round(tp.x + jx + 26 - w / 2), Math.round(tp.y + 8 - h / 2), w, h);
      } else g.img(img, tp.x + jx, tp.y);
      if (tp.kind === 'tetsuya') {
        // one red ▲ (5×4) per まもり step
        for (let i = 0; i < Math.max(0, e.stages.def.lv); i++) {
          const ax = tp.x + 54 + i * 6;
          const ay = tp.y + 6;
          g.rect(ax + 2, ay, 1, 1, '#E84E3C');
          g.rect(ax + 1, ay + 1, 3, 1, '#E84E3C');
          g.rect(ax, ay + 2, 5, 1, '#E84E3C');
          g.rect(ax, ay + 3, 5, 1, '#B8241E');
        }
      }
      if (tp.kind === 'kyuukei') {
        // three thin lines of steam rise (600ms) over and over
        for (let i = 0; i < 3; i++) {
          const ph = ((this.t + i * 200) % 600) / 600;
          const sx = tp.x + 18 + i * 8;
          const sy = tp.y - 2 - Math.round(ph * 10);
          g.alpha(0.6 * (1 - ph), () => {
            for (let j = 0; j < 5; j++) g.px(sx + Math.round(Math.sin((j + ph * 6) * 1.3)), sy - j, '#F4F1E8');
          });
        }
      }
    }
    // すねている: a grey fret cloud puffs up over its head every 2 seconds
    if (e.status.sune) {
      const cyc = (this.t + e.uid * 377) % 2000;
      if (cyc < 900) {
        const p = cyc / 900;
        const x = e.x + 8 + Math.round(p * 4);
        const y = e.headY - 6 - Math.round(p * 8);
        g.alpha(p < 0.2 ? p / 0.2 : 1 - (p - 0.2) / 0.8, () => g.img(moyamoya(), x, y));
      }
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
    if (this.boss?.drawUi) this.boss.drawUi(g);
    else if (this.isBoss) drawChimeSticky(g, this.msg.bottom + 2, this.bossChime.lit, this.bossChime.pops, this.t, this.bossChime.gold);
    // command window area
    if (this.cmd) drawCommand(g, { ...this.cmd, pressed: this.cursorPressed > 0 }, this.rt, a);
    else if (this.party.length) this.drawIdleCommandBox(g, a);
    for (const u of this.party) drawPanel(g, u, { t: this.t, kanenariJoined: this.kanenariJoined, alpha: a });
    // チョトツ glares at X while it charges: a small boar head over X's name tag
    for (const e of this.enemies) {
      if (!e.alive || !e.status.stareAt) continue;
      const tag = TAG[e.status.stareAt];
      const u = this.party.find((p) => p.id === e.status.stareAt);
      if (!tag || !u) continue;
      const pulse = this.memo.starePulse && Math.floor(this.rt / 120) % 2 === 0;
      const img = boarIcon();
      const k = pulse ? 1.3 : 1;
      const iw = Math.round(img.width * k);
      g.alpha(a, () => g.ctx.drawImage(img, Math.round(tag[0] + tag[2] - 6 - iw / 2), Math.round(tag[1] - 9 - (iw - img.width) / 2 + Math.round(Math.sin(this.rt / 200))), iw, iw));
    }
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

  private stickyLay: { key: string; text: string; x: number; y: number; right: boolean } | null = null;

  /**
   * Where the tutorial sticky sits and how its text wraps (QA round 2: it
   * was stuck over Kanenari-kun's bell and the vending machine's top — the
   * very thing the note asks you to look at). The spot is solved once per
   * note: the left (8,52) or right corner under the band, the text re-wrapped
   * narrower phrase by phrase until the note clears every enemy's box.
   */
  stickyPlace(): { img: HTMLCanvasElement; x: number; y: number; right: boolean } | null {
    const st = this.sticky;
    if (!st) return null;
    const key = `${st.text}|${st.pos ?? 'left'}`;
    if (this.stickyLay?.key !== key) this.stickyLay = { key, ...this.solveSticky(st.text, st.pos === 'right') };
    const l = this.stickyLay;
    return { img: stickyCanvas(l.text), x: l.x, y: l.y, right: l.right };
  }

  private solveSticky(text: string, preferRight: boolean): { text: string; x: number; y: number; right: boolean } {
    const P = STICKY_PAD;
    // each enemy owns a column: its sprite, the timing ring around its core
    // (r≈44) and the number / label spot over its head, from the band down
    // to its feet (QA round 3: the ring's edge and the hato's tail touched
    // the sticky, a number landed on its tape). The boss fills the stage;
    // there only its own sprite counts.
    const yobi = this.enemies.find((e) => e.id === 'boss_yobimodoshi' && e.alive && e.visible);
    const boxes: Rect[] = this.enemies
      .filter((e) => e.alive && e.visible && e !== yobi)
      .map((e) =>
        e.def.boss
          ? { x0: e.left - 3, y0: e.top - 3, x1: e.left + e.sizeW + 3, y1: e.footY }
          : { x0: Math.min(e.left - 3, e.coreX - 48), y0: STAGE_TOP, x1: Math.max(e.left + e.sizeW + 3, e.coreX + 48), y1: e.footY },
      );
    if (yobi) {
      // ヨビモドシ is a pole with four horns (51 13.1): the notes keep off each
      // horn (the thing the notes ask you to look at) and the pole, not off
      // the empty night between them
      const L = yobi.left;
      const T = yobi.top;
      for (const [x, y, w, h] of [[44, 6, 40, 20], [0, 16, 46, 28], [46, 26, 36, 30], [82, 16, 46, 28], [60, 0, 8, 14], [38, 24, 52, 84], [52, 106, 24, 54]])
        boxes.push({ x0: L + x - 2, y0: T + y - 2, x1: L + x + w + 2, y1: T + y + h + 2 });
    }
    // the top of the hanko close-up's ink ring (its くっきり zone) rises there
    boxes.push({ x0: 14, y0: 108, x1: 92, y1: 150 });
    const variants = [text];
    for (const mw of [150, 120, 96]) {
      const v = wrapPhrases(text, mw);
      if (!variants.includes(v)) variants.push(v);
    }
    let best: { text: string; x: number; y: number; right: boolean } | null = null;
    let bestCost = Infinity;
    for (const v of variants) {
      const img = stickyCanvas(v);
      const w = img.width - P - 3;
      const h = img.height - P - 3;
      const sides = preferRight ? [true, false] : [false, true];
      // (beside ヨビモドシ the notes may also sit lower, under its horns)
      const spots: [boolean, number][] = [];
      for (const right of sides) spots.push([right, right && this.isBoss ? this.msg.bottom + 26 : 52]);
      if (yobi) for (const right of sides) spots.push([right, yobi.top + 48]);
      for (const [right, y0] of spots) {
        const x = right ? 381 - w - 3 : 8;
        const y = Math.max(this.msg.bottom + 4, Math.min(y0, 141 - h));
        const r = { x0: x, y0: y, x1: x + w, y1: y + h };
        let cost = 0;
        for (const b of boxes) {
          const ox = Math.min(r.x1, b.x1) - Math.max(r.x0, b.x0);
          const oy = Math.min(r.y1, b.y1) - Math.max(r.y0, b.y0);
          if (ox > 0 && oy > 0) cost += ox * oy;
        }
        if (y + h > 142) cost += 5000;
        if (cost === 0) return { text: v, x, y, right };
        if (cost < bestCost) {
          bestCost = cost;
          best = { text: v, x, y, right };
        }
      }
    }
    return best ?? { text, x: 8, y: 52, right: false };
  }

  /**
   * The tutorial sticky: stuck on the glass, over the net's pole and the
   * effects of the stage (it is what the player must read), under the
   * numbers and labels (which keep clear of it).
   */
  private drawSticky(g: Gfx): void {
    const sp = this.stickyPlace();
    // a hanko / item list opened over the sticky's spot hides it until the
    // list closes (QA round 3: it covered the first row and its cursor)
    if (sp && this.list) {
      const w = sp.img.width - STICKY_PAD - 3;
      const h = sp.img.height - STICKY_PAD - 3;
      if (BattleScene.overlap({ x0: sp.x, y0: sp.y, x1: sp.x + w, y1: sp.y + h }, LIST_RECT, 0)) return;
    }
    if (this.sticky && sp && this.sticky.t >= 0) {
      const img = sp.img;
      const st = this.sticky;
      const out = st.ttl && st.t > st.ttl ? Math.min(1, (st.t - st.ttl) / 200) : 0;
      const k = Math.min(1, st.t / 120) * (1 - out);
      const glow = st.pulse && Math.floor(this.rt / 200) % 2 === 0;
      const P = STICKY_PAD;
      const sx = sp.x;
      const sy = sp.y;
      const dir = sp.right ? 1 : -1;
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

  /** The move being played out, jotted in the command notebook (null: blank page). */
  acting: { icon?: string; name: string; enemy?: boolean; t0: number } | null = null;

  /** Note the move that is starting in the command notebook. */
  noteActing(name: string, icon?: string, enemy = false): void {
    this.acting = name ? { name, icon, enemy, t0: this.rt } : null;
  }

  private drawIdleCommandBox(g: Gfx, a: number): void {
    // while not choosing: the notebook shows the move being played out
    const v = this.acting;
    drawActing(g, v ? { icon: v.icon, name: v.name, enemy: v.enemy, t: this.rt - v.t0 } : null, this.rt, a);
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

const warmCache = new Map<string, HTMLCanvasElement>();
/**
 * 51 8.0: the tomato's glow behind a chapter-2 enemy — #F2894B at α≈22%
 * (w×0.9 × h×0.6), in dithered steps; `house` = the はなまるトマト's own
 * backlight in the first スネトマト battle (#FFE7A3 → #F2894B, α≈35%).
 */
function warmBacklight(w: number, h: number, house: boolean): HTMLCanvasElement {
  const key = `${w}x${h}:${house}`;
  let c = warmCache.get(key);
  if (c) return c;
  const rx = Math.max(8, Math.round((w * 0.9) / 2) + (house ? 6 : 0));
  const ry = Math.max(6, Math.round((h * 0.6) / 2) + (house ? 6 : 0));
  const [cv, ctx] = makeCanvas(rx * 2, ry * 2);
  const img = ctx.createImageData(rx * 2, ry * 2);
  const inner = [0xff, 0xe7, 0xa3];
  const outer = [0xf2, 0x89, 0x4b];
  const peak = house ? 0.35 : 0.22;
  for (let y = 0; y < ry * 2; y++)
    for (let x = 0; x < rx * 2; x++) {
      const dx = (x + 0.5 - rx) / rx;
      const dy = (y + 0.5 - ry) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d >= 1) continue;
      const v = (1 - d) * 4;
      const step = Math.floor(v) + (BAYER4[y & 3][x & 3] < Math.round((v % 1) * 16) ? 1 : 0);
      if (!step) continue;
      const k = Math.min(4, step) / 4;
      const col = house && d < 0.45 ? inner : outer;
      const i = (y * rx * 2 + x) * 4;
      img.data[i] = col[0];
      img.data[i + 1] = col[1];
      img.data[i + 2] = col[2];
      img.data[i + 3] = Math.round(255 * peak * k);
    }
  ctx.putImageData(img, 0, 0);
  warmCache.set(key, cv);
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

/** Heavy SEs that are staggered instead of stacked when asked twice on one frame. */
const STAGGER_SFX = new Set(['se_damage']);

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

/** Re-wrap a note phrase by phrase (at its spaces) to lines at most `maxW` px wide. */
function wrapPhrases(text: string, maxW: number): string {
  const out: string[] = [];
  for (const line of text.split('\n')) {
    let cur = '';
    for (const ph of line.split(' ')) {
      const next = cur ? `${cur} ${ph}` : ph;
      if (cur && measure(next) > maxW) {
        out.push(cur);
        cur = ph;
      } else cur = next;
    }
    if (cur) out.push(cur);
  }
  return out.join('\n');
}

let shuDropC: HTMLCanvasElement[] | null = null;
/** Ink-rimmed vermilion drops (4×4, 5×5 and a 5×6 teardrop) with a cream glint. */
function shuDropBits(): HTMLCanvasElement[] {
  if (shuDropC) return shuDropC;
  const pal: Record<string, string> = { k: '#2A2440', H: '#FFF6D8', r: '#E23B2E', R: '#B8241E', l: '#FF6A4D' };
  const mk = (rows: string[]) => {
    const [c, ctx] = makeCanvas(rows[0].length, rows.length);
    rows.forEach((r, y) => [...r].forEach((ch, x) => {
      if (!pal[ch]) return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }));
    return c;
  };
  shuDropC = [
    mk(['.kk.', 'kHrk', 'krRk', '.kk.']),
    mk(['.kkk.', 'kHlrk', 'klrrk', 'krrRk', '.kkk.']),
    mk(['..k..', '.kHk.', 'kHlrk', 'krrrk', 'krrRk', '.kkk.']),
  ];
  return shuDropC;
}
