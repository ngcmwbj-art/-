// BattleScene: owns battle state, time control (own hitstop / freeze / slow
// motion), rendering, and the helper API used by the battle flow coroutines.

import type { Co } from '../engine/co';
import { Runner } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { Particles, type BurstOpts } from '../engine/particles';
import { rng } from '../engine/rng';
import { makeCanvas } from '../engine/pixel';
import { flag, state } from '../game/state';
import { sfx } from '../audio';
import * as audio from '../audio';
import type { BattleOpts, BattleResult } from './api';
import { getEnemy } from '../data/battle';
import { desaturate } from '../art/enemies/lib';
import { makeBackground, type Background } from './bg';
import { EnemyUnit, PartyUnit, type BossPart } from './model';
import { DamageNumber, type NumOpts } from './fx/numbers';
import { MessageBand } from './ui/message';
import {
  drawChimeSticky, drawCommand, drawInfoCard, drawKire, drawList, drawPanel, PANEL_POS, type CardData, type CmdView, type ListRow,
} from './ui/panels';
import { C, cursorStamp, drawBar, labelCanvas, stickyCanvas, tapeCanvas } from './ui/note';
import { ovalStamp, pekeMark } from './art/stamps';
import { sweatDrop } from './art/fxart';

export const FRAME = 1000 / 60;

export interface Fx {
  t: number;
  dur: number;
  layer: 'back' | 'world' | 'top';
  /** Keeps animating during hitstop (UI-ish effects). */
  ui?: boolean;
  draw(g: Gfx, t: number, p: number): void;
  update?(dt: number): void;
  done?: boolean;
}

export interface BossHooks {
  drawUnder?(g: Gfx): void;
  drawOver?(g: Gfx): void;
  update?(dt: number): void;
}

/** Enemy x positions by count (15.4). */
export const SLOTS: Record<number, number[]> = { 1: [192], 2: [140, 244], 3: [96, 192, 288] };

export class BattleScene implements Scene {
  transparent = true;
  result: BattleResult | null = null;
  finished = false;
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
  target: { kind: 'enemy'; e: EnemyUnit; part?: { x: number; y: number; w: number } } | { kind: 'party'; u: PartyUnit } | null = null;
  card: { data: CardData; t: number; closing: boolean } | null = null;
  sticky: { text: string; t: number; pulse?: boolean } | null = null;
  cursorPressed = 0;
  /** Directional screen shake. */
  private shk = { ax: 0, ay: 0, t: 0, dur: 0, x: 0, y: 0 };
  flashes: { color: string; alpha: number; frames: number }[] = [];
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
  private scratch: HTMLCanvasElement;
  private scratchCtx: CanvasRenderingContext2D;
  private scratch2: HTMLCanvasElement;
  private scratch2Ctx: CanvasRenderingContext2D;
  private desatCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
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
      if (this.card.closing && this.card.t > 160) this.card = null;
    }
    if (this.sticky) this.sticky.t += dt;
  }

  /** Blocking message pages may be skipped with confirm. */
  private msgConfirm(): boolean {
    if (!this.msgInteractive) return false;
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
      if (u.trailWait > 0) u.trailWait -= dt;
      else u.hpTrail = Math.max(u.m.hp, u.hpTrail - (u.m.maxHp / 250) * dt * 1.2);
    } else u.hpTrail = u.m.hp;
  }

  private updateEnemy(e: EnemyUnit, dt: number): void {
    e.poseT += dt;
    if (e.x !== e.xTarget) {
      const d = e.xTarget - e.x;
      e.x += Math.sign(d) * Math.min(Math.abs(d), dt * 0.25);
    }
    if (e.whiteFrames > 0) e.whiteFrames--;
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

  number(x: number, y: number, n: number, o: NumOpts = {}): DamageNumber {
    const d = new DamageNumber(x, y, n, o);
    this.numbers.push(d);
    return d;
  }

  /** Ink-stamp label that pops and fades. */
  label(text: string, x: number, y: number, tone: 'shu' | 'gray' = 'shu', ms = 600, worn = false): void {
    const img = labelCanvas(text, tone, worn);
    this.addFx({
      layer: 'top',
      dur: ms,
      ui: true,
      draw: (g, t) => {
        const pop = t < 70 ? 1.5 - 0.5 * (t / 70) : 1;
        const a = t > ms - 150 ? Math.max(0, (ms - t) / 150) : 1;
        const w = img.width * pop;
        const h = img.height * pop;
        g.alpha(a, () => g.ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h)));
      },
    });
  }

  burst(x: number, y: number, o: BurstOpts, top = false): void {
    (top ? this.partsTop : this.parts).burst(x, y, o);
  }

  /** Paper bits (紙片). */
  paper(x: number, y: number, n: number, speed: [number, number] = [60, 120]): void {
    this.burst(x, y, { count: n, speed, angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [260, 360], colors: ['#FBF3DC', '#E8D9B5', '#F4F1E8'], gravity: 200, shape: 'sq', size: [2, 3], sizeEnd: 2 });
  }
  stars(x: number, y: number, n: number, speed: [number, number] = [80, 160]): void {
    this.burst(x, y, { count: n, speed, life: [260, 420], colors: ['#FFF6D8', '#FFD23F', '#FFD23F'], gravity: 60, drag: 2, shape: 'star', size: [2, 2], sizeEnd: 1 });
  }
  shuSplash(x: number, y: number, n: number, alpha70 = false): void {
    const cols = alpha70 ? ['#E86A5E', '#E86A5E'] : ['#E23B2E', '#E23B2E', '#E23B2E', '#FF6A4D', '#B8241E'];
    this.burst(x, y, { count: n, speed: [60, 160], life: [400, 700], colors: cols, gravity: 300, drag: 1, shape: 'sq', size: [1, 3], sizeEnd: 1 });
  }
  petals(x: number, y: number, n: number, spread = 20, top = true): void {
    this.burst(x, y, { count: n, speed: [40, 150], life: [700, 1300], colors: ['#FF6A4D', '#F7C27A', '#FFD9B8', '#E0567A'], gravity: 90, drag: 1.5, shape: 'sq', size: [2, 3], sizeEnd: 2, spread }, top);
  }
  sweat(x: number, y: number, n = 6): void {
    this.burst(x, y, { count: n, speed: [60, 140], angle: [-Math.PI, 0], life: [300, 500], colors: ['#E8F4F8', '#7FD1E8'], gravity: 400, shape: 'sq', size: [2, 2], sizeEnd: 1 }, true);
  }

  sfx(id: string, o?: { pitch?: number; pan?: number; vol?: number }): void {
    sfx(id, o);
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
    for (const n of this.numbers) n.draw(g);
    this.partsTop.draw(g);
    ctx.restore();
    if (this.tint) g.rect(0, 0, 384, 216, this.tint.color, this.tint.alpha);
    if (this.tint2) g.rect(0, 0, 384, 216, this.tint2.color, this.tint2.alpha);
    for (const f of this.flashes) g.rect(0, 0, 384, 216, f.color, f.alpha);
    this.transitionDraw?.(g);
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
    const a = 0.35 * e.alpha * (e.appearT >= 0 && e.appearT < 300 ? e.appearT / 300 : 1);
    g.alpha(a, () => {
      g.ctx.fillStyle = C.ink;
      ellipse(g.ctx, x + w / 2, y + 3, w / 2, 3);
    });
  }

  /** Current frame composed with decals / blush / ボケ負け desaturation. */
  enemyImage(e: EnemyUnit): HTMLCanvasElement | null {
    const art = e.art;
    if (!art) return null;
    const v = e.view(this.t);
    let src = art.frame(v);
    if (e.status.bokemake && e.alive) {
      if (art.dynamic) src = desaturate(src, 0.4, this.scratch2);
      else {
        let d = this.desatCache.get(src);
        if (!d) {
          d = desaturate(src, 0.4);
          this.desatCache.set(src, d);
        }
        src = d;
      }
    }
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

  /** Screen-space top-left of the enemy canvas (before scaling). */
  enemyCanvasXY(e: EnemyUnit): [number, number] {
    const art = e.art!;
    return [e.left - art.ox + e.offX + e.jitterX, e.top - art.oy + e.offY + e.jitterY];
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
    // 溜め中 sticky
    if (e.status.tame) {
      const img = tapeCanvas(52, 16, '溜め中', C.tape, 7);
      g.img(img, Math.round(e.x - 26 + e.jitterX), e.headY - 10 - 16);
    }
  }

  private drawUi(g: Gfx): void {
    const a = this.uiAlpha;
    // enemy HP bars (みました済み) during command input & target selection
    if (this.cmd && !this.hideEnemyHp) {
      for (const e of this.enemies) {
        if (!e.alive || !flag('flag_mimashita_' + e.id) || e.def.invulnerable) continue;
        const w = Math.min(40, e.sizeW);
        drawBar(g, Math.round(e.x - w / 2), e.headY - 6 - 3, w, 3, e.hp / e.maxHp, C.shu, C.grid, e.hpTrail / e.maxHp, C.white);
      }
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
      const px = this.target.part ? this.target.part.x : e.x;
      const py = this.target.part ? this.target.part.y : e.headY - (flag('flag_mimashita_' + e.id) ? 14 : 4);
      g.img(cursorStamp(this.cursorPressed > 0), Math.round(px - 4), Math.round(py - 12 + bob));
    }
    if (this.card) {
      const t = this.card.t;
      const slide = this.card.closing ? Math.max(0, 1 - t / 160) : Math.min(1, t / 160);
      drawInfoCard(g, this.card.data, 1 - (1 - slide) * (1 - slide));
    }
    if (this.sticky) {
      const img = stickyCanvas(this.sticky.text);
      const k = Math.min(1, this.sticky.t / 120);
      const glow = this.sticky.pulse && Math.floor(this.rt / 200) % 2 === 0;
      g.alpha(k, () => g.img(img, 8, 52 - Math.round((1 - k) * 6)));
      if (glow) g.alpha(0.35 * k, () => g.rect(8, 52, img.width - 3, img.height - 3, '#FFFFFF'));
    }
  }

  private drawIdleCommandBox(g: Gfx, a: number): void {
    // while not choosing: the command notebook stays, showing the round number doodle
    drawCommand(g, { icons: [], index: 0, pressed: false, noriTab: false, onTab: true }, this.rt, a);
  }

  private drawEmptySlot(g: Gfx, a: number): void {
    // right-hand slot before Kanenari-kun joins: a torn-out page corner
    g.alpha(a * 0.9, () => {
      const x = 250;
      const y = 158;
      g.rect(x + 2, y + 2, 124, 48, C.shadow, 0.35);
      g.rect(x, y, 124, 48, '#EFE3C4');
      for (let yy = y + 7; yy < y + 48; yy += 8) g.rect(x + 1, yy, 122, 1, '#E3D3AE');
      for (let i = 0; i < 124; i += 3) g.rect(x + i, y, 2, (i / 3) % 2 ? 2 : 1, '#DCCB9F');
      g.rect(x + 12, y + 1, 1, 46, '#E8A0AE');
      g.text('じゆうけんきゅう', x + 22, y + 10, { color: '#C8B48C' });
      g.text('（まだ まっしろ）', x + 22, y + 28, { color: '#C8B48C' });
    });
  }
}

function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, rx: number, ry: number): void {
  for (let y = -Math.ceil(ry); y <= Math.ceil(ry); y++) {
    const k = 1 - (y * y) / (ry * ry);
    if (k < 0) continue;
    const hw = Math.round(rx * Math.sqrt(k));
    ctx.fillRect(Math.round(cx - hw), Math.round(cy + y), hw * 2, 1);
  }
}
