// 第2章の戦闘背景 bg_h_* (51 15章): the night village's seven backdrops.
// Every one is built on the night's six colours (#0B0B14 #141028 #1B1733
// #2A2440 #3A2B5C #5B4A7A) with exactly one band of the tomato's orange
// (#F2894B α60%, breathing ±10% at 0.8Hz like the lantern), a few slow stars,
// a lift of the dark behind the enemy (so a dark enemy never sinks), and the
// silhouettes of what the enemy was: the greenhouse's strings of green
// tomatoes, the terraces' water, the fence's pulse, the ridges, the 100円
// coins, the ploughed ridges under a headlight, the wires and the name tags.
// The battle hands state in through `flags` (charge, stiff, charged, nefuda,
// rest, tetsuya, burst, light, dark, phase2, final, finale, tenkoAt, sunsetAt).

import type { Gfx } from '../../engine/gfx';
import { BAYER4, makeCanvas } from '../../engine/pixel';
import { hash2, Rng } from '../../engine/rng';
import { drawText, measure } from '../../engine/font';
import { flag } from '../../game/state';
import { Background, BG_H, fillCircle, gradientTexture, pxLine, strokeCircle } from './common';

const TOMATO = '#F2894B';

// ---- shared pieces ------------------------------------------------------------------------

/** The one band of tomato light (10px, dithered edges), breathing at 0.8Hz. */
function tomatoBand(ctx: CanvasRenderingContext2D, y: number, t: number, h = 10, base = 0.6): void {
  const a = base * (1 + 0.1 * Math.sin(t * Math.PI * 2 * 0.8));
  ctx.save();
  ctx.globalAlpha = a;
  ctx.fillStyle = TOMATO;
  ctx.fillRect(0, y + 2, 384, h - 4);
  // 2px dithered seams, top and bottom
  for (let x = 0; x < 384; x++) {
    for (const [yy, th] of [[y, 5], [y + 1, 10], [y + h - 2, 10], [y + h - 1, 5]] as [number, number][]) if (BAYER4[yy & 3][x & 3] < th) ctx.fillRect(x, yy, 1, 1);
  }
  ctx.restore();
}

let liftC: HTMLCanvasElement | null = null;
/**
 * The dark lifted behind the enemy (x120–264, y60–140, 51 15.1): a soft
 * dithered ellipse of #5B4A7A over #3A2B5C, so the boar's bristles or the
 * scarecrow's suit keep their edge on a night sky.
 */
function enemyLift(ctx: CanvasRenderingContext2D, alpha = 1): void {
  if (!liftC) {
    const [c, cx] = makeCanvas(160, 96);
    const img = cx.createImageData(160, 96);
    const a = [0x3a, 0x2b, 0x5c];
    const b = [0x5b, 0x4a, 0x7a];
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 160; x++) {
        const dx = (x - 80) / 80;
        const dy = (y - 50) / 46;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d >= 1) continue;
        const k = (1 - d) * 3;
        const lv = Math.floor(k) + (BAYER4[y & 3][x & 3] < (k % 1) * 16 ? 1 : 0);
        if (lv <= 0) continue;
        const col = lv >= 3 ? b : a;
        const i = (y * 160 + x) * 4;
        img.data[i] = col[0];
        img.data[i + 1] = col[1];
        img.data[i + 2] = col[2];
        img.data[i + 3] = lv >= 2 ? 150 : 90;
      }
    cx.putImageData(img, 0, 0);
    liftC = c;
  }
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.drawImage(liftC, 112, 50);
  ctx.restore();
}

interface Star {
  x: number;
  y: number;
  ph: number;
  a: number;
}

function makeStars(seed: number, n: number, yMax: number): Star[] {
  const r = new Rng(seed);
  const out: Star[] = [];
  for (let i = 0; i < n; i++) out.push({ x: r.int(2, 381), y: r.int(2, yMax), ph: r.range(0, 6.28), a: r.range(0.5, 1) });
  return out;
}

function drawStars(ctx: CanvasRenderingContext2D, stars: Star[], t: number): void {
  ctx.fillStyle = '#FFF6D8';
  for (const s of stars) {
    const tw = 0.55 + 0.45 * Math.sin(t * 0.9 + s.ph);
    ctx.globalAlpha = s.a * tw;
    ctx.fillRect(s.x, s.y, 1, 1);
  }
  ctx.globalAlpha = 1;
}

/** A cached text strip in a hand-written marker look (the bold is a 1px double). */
const textCache = new Map<string, HTMLCanvasElement>();
function markerText(text: string, color: string): HTMLCanvasElement {
  const key = text + color;
  let c = textCache.get(key);
  if (c) return c;
  const w = measure(text) + 4;
  const [cv, ctx] = makeCanvas(w, 18);
  drawText(ctx, text, 1, 0, { color });
  drawText(ctx, text, 2, 0, { color });
  textCache.set(key, cv);
  c = cv;
  return c;
}

// ---- bg_h_house (スネトマト) -------------------------------------------------------------------

/** 15.2: inside 3号ハウス at night — strings of green tomatoes rising, the hoops, the tomato's glow. */
export class HoshiHouseBg extends Background {
  private stars = makeStars(21, 10, 40);
  private pollen: { x: number; y: number; a: number; r: number; s: number }[] = [];
  private stringsC: HTMLCanvasElement;

  constructor() {
    super('bg_h_house');
    this.wave = { A: 2, lambda: 48, f: 0.25, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#1B1733';
    const r = new Rng(5);
    for (let i = 0; i < 12; i++) this.pollen.push({ x: 0, y: 0, a: r.range(0, 6.28), r: r.range(10, 40), s: r.range(0.3, 0.8) });
    // the strings and their bunches, one tile of BG_H that loops upward
    const [c, ctx] = makeCanvas(384, BG_H);
    for (let x = 6; x < 384; x += 12) {
      ctx.fillStyle = '#3A4A7A';
      ctx.fillRect(x, 0, 1, BG_H);
      // a bunch every so often along the string, at its own heights
      for (let k = 0; k < 3; k++) {
        const y = Math.floor(hash2(x, k, 3) * BG_H);
        const n = 2 + Math.floor(hash2(x, k, 4) * 3);
        for (let j = 0; j < n; j++) {
          const rr = 4 + Math.floor(hash2(x + j, k, 5) * 4);
          const bx = x + (j % 2 ? 4 : -3) + Math.floor(hash2(x, j, 6) * 3) - 1;
          const by = (y + j * 7) % BG_H;
          fillCircle(ctx, bx, by, rr, '#3A5A4A');
          fillCircle(ctx, bx, by, rr - 1, '#2E6B4A');
          // the lantern's light catches the lower left edge
          ctx.fillStyle = TOMATO;
          ctx.fillRect(bx - rr + 1, by + Math.round(rr * 0.4), 1, 1);
          ctx.fillStyle = '#4A7A5A';
          ctx.fillRect(bx - Math.round(rr * 0.5), by - Math.round(rr * 0.5), 1, 1);
        }
      }
    }
    this.stringsC = c;
  }

  update(dt: number): void {
    super.update(dt);
    // the film breathes: A 2 → 3 → 2 over 4s
    this.wave.A = 2.5 - 0.5 * Math.cos((this.t / 4) * Math.PI * 2);
  }

  private glowing(): boolean {
    return !flag('flag_ch2_got_tomato');
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.drawImage(gradientTexture(['#0B0B14', '#1B1733', '#2A2440'], BG_H), 0, 0);
    drawStars(ctx, this.stars, t);
    enemyLift(ctx, 0.8);
    tomatoBand(ctx, 118, t);
    if (this.glowing()) {
      // the はなまるトマト glowing at the back of the house (r30, ±2px)
      const r = 30 + 2 * Math.sin(t * Math.PI * 2 * 0.8);
      const g = ctx.createRadialGradient(96, 70, 2, 96, 70, r);
      g.addColorStop(0, 'rgba(255,231,163,0.5)');
      g.addColorStop(0.45, 'rgba(242,137,75,0.35)');
      g.addColorStop(1, 'rgba(242,137,75,0)');
      ctx.fillStyle = g;
      ctx.fillRect(96 - 34, 70 - 34, 68, 68);
      fillCircle(ctx, 96, 70, 3, '#FFE7A3');
      ctx.fillStyle = '#FFF6D8';
      ctx.fillRect(95, 69, 1, 1);
    }
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    // rising 6px/s, looping
    const off = Math.floor(t * 6) % BG_H;
    ctx.drawImage(this.stringsC, 0, -off);
    ctx.drawImage(this.stringsC, 0, BG_H - off);
  }

  protected drawL2(g: Gfx, t: number): void {
    const ctx = g.ctx;
    // the hoops of the house, only their tops showing (every 48px)
    ctx.fillStyle = '#5B4A7A';
    for (let cx = 24; cx < 384 + 48; cx += 48) {
      for (let a = 0; a <= 40; a++) {
        const an = Math.PI + (a / 40) * Math.PI;
        const x = Math.round(cx + Math.cos(an) * 30);
        const y = Math.round(40 + Math.sin(an) * 34);
        if (y >= 0) ctx.fillRect(x, y, 2, 2);
      }
    }
    if (!this.glowing()) {
      // after the tomato is picked: a warm bounce from below (#F2894B α12%)
      const gr = ctx.createLinearGradient(0, BG_H, 0, 60);
      gr.addColorStop(0, 'rgba(242,137,75,0.12)');
      gr.addColorStop(1, 'rgba(242,137,75,0)');
      ctx.fillStyle = gr;
      ctx.fillRect(0, 60, 384, BG_H - 60);
      return;
    }
    // pollen-like motes drifting round the light
    ctx.fillStyle = '#F7C27A';
    for (const p of this.pollen) {
      const a = p.a + t * p.s;
      const x = Math.round(96 + Math.cos(a) * p.r * 1.3);
      const y = Math.round(70 + Math.sin(a * 1.3) * p.r * 0.7);
      ctx.globalAlpha = 0.4;
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }
}

// ---- bg_h_tanada (ヘノヘノ課長) -----------------------------------------------------------------

/** 15.3: the terraces — six steps of water, each rippling on its own phase; CDs turning. */
export class HoshiTanadaBg extends Background {
  private stars = makeStars(33, 12, 30);
  private refl: { x: number; step: number; ph: number }[] = [];
  private cds: { x: number; y: number; ph: number; spd: number }[] = [];
  private glintAt = 0;
  private glintCd = 0;

  constructor() {
    super('bg_h_tanada');
    this.wave = { A: 2, lambda: 40, f: 0.3, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.distortL1Only = true;
    this.bottom = '#1B1733';
    const r = new Rng(8);
    for (let i = 0; i < 40; i++) this.refl.push({ x: r.int(0, 383), step: r.int(0, 5), ph: r.range(0, 6.28) });
    for (let i = 0; i < 4; i++) this.cds.push({ x: i * 110 + r.int(0, 40), y: 22 + r.int(0, 30), ph: r.range(0, 6.28), spd: r.range(9, 14) });
  }

  update(dt: number): void {
    super.update(dt);
    // one CD glints every 3s
    if (this.t - this.glintAt > 3) {
      this.glintAt = this.t;
      this.glintCd = Math.floor(this.t) % 4;
    }
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.drawImage(gradientTexture(['#0B0B14', '#141028', '#1B1733', '#2A2440', '#3A2B5C'], BG_H), 0, 0);
    drawStars(ctx, this.stars, t);
    enemyLift(ctx, 0.9);
    // the lowest paddy's water holds the lantern's light
    tomatoBand(ctx, 124, t);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    const stiff = (this.flags.stiff ?? 0) > 0;
    const drift = (t * 8) % 384;
    for (let i = 0; i < 6; i++) {
      const y0 = 60 + i * 15;
      const shift = stiff ? 0 : Math.round(3 * Math.sin(2 * Math.PI * (t * 0.3 + i / 6)));
      // water surface of this step, the ridge (畦) along its lower edge
      for (let x = 0; x < 384; x++) {
        const xx = (x + drift) % 384;
        const curve = Math.round(4 * Math.sin((xx + i * 40) / 60)) + shift;
        const top = y0 + curve;
        ctx.fillStyle = '#3A2B5C';
        ctx.fillRect(x, top, 1, 11);
        ctx.fillStyle = '#2A2440';
        ctx.fillRect(x, top + 11, 1, 2);
        // rice ears drooping over the ridge
        if (hash2(Math.floor(xx), i, 7) < 0.22) {
          ctx.fillStyle = '#2A3A2A';
          ctx.fillRect(x, top - 2, 1, 2);
          if (hash2(Math.floor(xx), i, 8) < 0.5) ctx.fillRect(x + 1, top - 2, 1, 1);
        }
      }
    }
    // stars reflected in the water, twinkling
    ctx.fillStyle = '#FFF6D8';
    for (const r of this.refl) {
      const x = Math.round((r.x + drift) % 384);
      const y0 = 60 + r.step * 15;
      const shift = stiff ? 0 : Math.round(3 * Math.sin(2 * Math.PI * (t * 0.3 + r.step / 6)));
      const y = y0 + Math.round(4 * Math.sin((r.x + r.step * 40) / 60)) + shift + 3 + (r.x % 6);
      ctx.globalAlpha = 0.4 + 0.5 * Math.max(0, Math.sin(t * 1.3 + r.ph));
      ctx.fillRect(x, y, 1, 1);
    }
    ctx.globalAlpha = 1;
  }

  protected drawL2(g: Gfx, t: number): void {
    const ctx = g.ctx;
    const rainbow = ['#E0567A', '#FFD23F', '#5FA85A', '#4AA8E0'];
    this.cds.forEach((c, i) => {
      const x = Math.round(((c.x + t * c.spd) % 440) - 28);
      const y = Math.round(c.y + Math.sin(t * 0.7 + c.ph) * 3);
      // the thread it hangs from
      ctx.fillStyle = '#5B4A7A';
      ctx.fillRect(x, 0, 1, y - 5);
      // the disc turning: its width breathes (seen edge-on now and then)
      const w = Math.max(1, Math.round(5 * Math.abs(Math.cos(t * 1.1 + c.ph))));
      for (let yy = -5; yy <= 5; yy++) {
        const hw = Math.round(w * Math.sqrt(1 - (yy * yy) / 26));
        ctx.fillStyle = '#C8CDD4';
        ctx.fillRect(x - hw, y + yy, hw * 2 + 1, 1);
      }
      ctx.fillStyle = '#2A2440';
      ctx.fillRect(x, y, 1, 1);
      // the rainbow arc cycling (120ms a step)
      if (w >= 3) {
        const k = Math.floor(t / 0.12) + i;
        for (let a = 0; a < 3; a++) {
          ctx.fillStyle = rainbow[(k + a) % 4];
          ctx.fillRect(x - w + 1 + a, y - 3 + a, 1, 1);
        }
      }
      if (i === this.glintCd && this.t - this.glintAt < 0.25) {
        ctx.fillStyle = '#FFF6D8';
        ctx.fillRect(x - 3, y, 7, 1);
        ctx.fillRect(x, y - 3, 1, 7);
      }
    });
  }
}

// ---- bg_h_fence (ビリビリ番) --------------------------------------------------------------------

/** 15.4: three rows of electric fence in perspective, a pulse running along them every second. */
export class HoshiFenceBg extends Background {
  private stars = makeStars(44, 10, 36);
  private pulseX = -40;
  private lastPulse = -1;

  constructor() {
    super('bg_h_fence');
    this.wave = { A: 1, lambda: 48, f: 0.2, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#1B1733';
  }

  private period(): number {
    return (this.flags.charged ?? 0) > 0 ? 0.5 : 1;
  }

  update(dt: number): void {
    super.update(dt);
    const p = this.period();
    const k = Math.floor(this.t / p);
    if (k !== this.lastPulse) {
      this.lastPulse = k;
      this.pulseX = -20;
    }
    this.pulseX += (dt / 1000) * 900;
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.drawImage(gradientTexture(['#0B0B14', '#141028', '#1B1733'], 96), 0, 0);
    ctx.drawImage(gradientTexture(['#1B1733', '#3A2B5C', '#2A2440'], BG_H - 96), 0, 96);
    drawStars(ctx, this.stars, t);
    enemyLift(ctx, 0.85);
    tomatoBand(ctx, 120, t);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, _t: number): void {
    const charged = (this.flags.charged ?? 0) > 0;
    const rows = [
      { y: 70, gap: 8, col: '#5B4A7A', post: 26, h: 16 },
      { y: 96, gap: 12, col: '#9AA0A8', post: 34, h: 24 },
      { y: 128, gap: 16, col: '#C8CDD4', post: 40, h: 32 },
    ];
    for (const r of rows) {
      // posts with a black insulator at each wire
      for (let x = 10; x < 384; x += r.post) {
        ctx.fillStyle = '#5B4A7A';
        ctx.fillRect(x, r.y - r.h + 4, r.post > 30 ? 3 : 2, r.h + 4);
        ctx.fillStyle = '#2A2440';
        ctx.fillRect(x - 1, r.y, 2, 2);
        ctx.fillRect(x - 1, r.y + r.gap, 2, 2);
      }
      for (const wy of [r.y, r.y + r.gap]) {
        ctx.fillStyle = r.col;
        ctx.fillRect(0, wy, 384, 1);
        if (charged) {
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = '#7CFF9A';
          ctx.fillRect(0, wy - 1, 384, 3);
          ctx.globalAlpha = 1;
        }
        // the pulse: a 3px cream core and a 12px green tail
        const px = Math.round(this.pulseX);
        if (px > -16 && px < 400) {
          for (let k = 0; k < 12; k++) {
            ctx.globalAlpha = 1 - k / 12;
            ctx.fillStyle = '#7CFF9A';
            ctx.fillRect(px - 3 - k, wy, 1, 1);
          }
          ctx.globalAlpha = 1;
          ctx.fillStyle = '#FFF6D8';
          ctx.fillRect(px - 2, wy, 3, 1);
          ctx.fillRect(px - 1, wy - 1, 1, 3);
        }
      }
    }
  }

  protected drawL2(g: Gfx, t: number): void {
    const ctx = g.ctx;
    // yellow warning signs hung on the middle row, drifting left 10px/s
    for (let i = 0; i < 5; i++) {
      const x = Math.round(((i * 96 + 30 - t * 10) % 480 + 480) % 480) - 48;
      const y = 99;
      ctx.fillStyle = '#2A2440';
      ctx.fillRect(x - 1, y - 1, 14, 10);
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(x, y, 12, 8);
      ctx.fillStyle = '#D9A441';
      ctx.fillRect(x, y + 7, 12, 1);
      ctx.fillStyle = '#2A2440';
      for (let k = 0; k < 3; k++) ctx.fillRect(x + 2, y + 2 + k * 2, k === 1 ? 6 : 8, 1);
    }
  }

  draw(g: Gfx): void {
    // the electric shiver: 1px to the side on the frame the pulse starts
    const jolt = this.pulseX < 0 ? 1 : 0;
    if (jolt) g.ctx.translate(1, 0);
    super.draw(g);
    if (jolt) g.ctx.translate(-1, 0);
  }
}

// ---- bg_h_yama (チョトツ) ----------------------------------------------------------------------

/** 15.5: three ridges in parallax with cedars, the near edge lit by the lantern; mud flying. */
export class HoshiYamaBg extends Background {
  private stars = makeStars(55, 14, 40);
  private splashes: { x: number; t0: number; dir: number }[] = [];
  private nextSplash = 0;
  private px = [0, 0, 0];

  constructor() {
    super('bg_h_yama');
    this.wave = { A: 2, lambda: 64, f: 0.3, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#1B1733';
  }

  update(dt: number): void {
    super.update(dt);
    const k = (this.flags.charge ?? 0) > 0 ? 3 : 1;
    const s = dt / 1000;
    this.px[0] += 4 * k * s;
    this.px[1] += 8 * k * s;
    this.px[2] += 16 * k * s;
    if (this.t > this.nextSplash) {
      this.nextSplash = this.t + 1.5;
      this.splashes.push({ x: 40 + Math.random() * 300, t0: this.t, dir: Math.random() < 0.5 ? -1 : 1 });
    }
    this.splashes = this.splashes.filter((p) => this.t - p.t0 < 0.9);
  }

  private ridge(ctx: CanvasRenderingContext2D, base: number, amp: number, off: number, col: string, seed: number, cedars: boolean, rim: boolean): void {
    const shake = (this.flags.charge ?? 0) > 0 && Math.floor(this.t * 15) % 2 ? 1 : 0;
    for (let x = 0; x < 384; x++) {
      const xx = x + off;
      const y = Math.round(base + amp * Math.sin(xx / 47 + seed) + amp * 0.5 * Math.sin(xx / 17 + seed * 2)) + shake;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, BG_H - y);
      if (cedars && hash2(Math.floor(xx / 7), seed, 9) < 0.45 && Math.floor(xx) % 7 === 0) {
        const h = 6 + Math.floor(hash2(Math.floor(xx / 7), seed, 10) * 7);
        for (let i = 0; i < h; i++) {
          const hw = Math.floor((i / h) * 3);
          ctx.fillRect(x - hw, y - h + i, hw * 2 + 1, 1);
        }
        if (rim) {
          ctx.fillStyle = TOMATO;
          ctx.fillRect(x - 1, y - h + 2, 1, 1);
        }
      }
      if (rim) {
        ctx.fillStyle = TOMATO;
        ctx.fillRect(x, y, 1, 1);
      }
    }
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.drawImage(gradientTexture(['#0B0B14', '#1B1733', '#3A2B5C', '#5B4A7A'], BG_H), 0, 0);
    drawStars(ctx, this.stars, t);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    this.ridge(ctx, 70, 8, this.px[0], '#3A2B5C', 1, false, false);
    this.ridge(ctx, 92, 6, this.px[1], '#2A2440', 2, true, false);
    this.ridge(ctx, 116, 4, this.px[2], '#1B1733', 3, true, true);
    // the lantern's light along the nearest ridge's edge (the tomato band, y112)
    ctx.save();
    ctx.globalAlpha = 0.18 * (1 + 0.1 * Math.sin(t * Math.PI * 2 * 0.8));
    ctx.fillStyle = TOMATO;
    ctx.fillRect(0, 108, 384, 10);
    ctx.restore();
    enemyLift(ctx, 0.55);
  }

  protected drawL2(g: Gfx, t: number): void {
    const ctx = g.ctx;
    // hoof prints drifting right along the bottom
    ctx.fillStyle = '#2A2440';
    for (let i = 0; i < 8; i++) {
      const x = Math.round(((i * 52 + t * 22) % 416) - 32);
      const y = 138 + (i % 2) * 5;
      ctx.fillRect(x, y, 2, 4);
      ctx.fillRect(x + 3, y, 2, 4);
      ctx.fillRect(x + 1, y + 4, 3, 1);
    }
    // mud splashes arcing up from the bottom edge
    ctx.fillStyle = '#6B5A4A';
    for (const p of this.splashes) {
      const k = (this.t - p.t0) / 0.9;
      for (let j = 0; j < 4; j++) {
        const x = Math.round(p.x + p.dir * (10 + j * 6) * k * 3);
        const y = Math.round(BG_H - 4 - Math.sin(k * Math.PI) * (26 + j * 8));
        ctx.fillRect(x, y, 2, 2);
      }
    }
  }
}

// ---- bg_h_mujin (ムジン販売員) -----------------------------------------------------------------

const VEG = [
  // cucumber, eggplant, corn (silhouettes, #2A3A2A)
  ['.......##', '.....####', '...#####.', '.#####...', '####.....', '.##......'],
  ['..##.', '.####', '#####', '#####', '.###.', '..#..'],
  ['.###.', '#####', '#####', '#####', '.###.', '.###.', '..#..'],
];

/** 15.6: a turning grid of silver 100円 coins, cardboard bands of hand lettering. */
export class HoshiMujinBg extends Background {
  private coinC: HTMLCanvasElement[] = [];

  constructor() {
    super('bg_h_mujin');
    this.wave = { A: 1, lambda: 32, f: 0.4, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#1B1733';
    // four spin frames of a silver coin (r9): no real coin's design, a ring and "100"
    for (let f = 0; f < 4; f++) {
      const [c, ctx] = makeCanvas(20, 20);
      const w = [9, 6, 2, 6][f];
      for (let y = -9; y <= 9; y++) {
        const hw = Math.round(w * Math.sqrt(1 - (y * y) / 81));
        for (let x = -hw; x <= hw; x++) {
          const edge = Math.abs(x) >= hw - 1 || Math.abs(y) >= 8;
          const lit = x < 0 && y < 0;
          ctx.fillStyle = edge ? '#8E95A6' : lit ? '#F4F1E8' : '#C8C2B4';
          ctx.fillRect(10 + x, 10 + y, 1, 1);
        }
      }
      if (w >= 6) {
        // inner ring and the "100" as three little marks
        ctx.fillStyle = '#8E95A6';
        for (let a = 0; a < 24; a++) {
          const an = (a / 24) * Math.PI * 2;
          ctx.fillRect(Math.round(10 + Math.cos(an) * (w - 3)), Math.round(10 + Math.sin(an) * 6), 1, 1);
        }
        ctx.fillRect(10 - Math.round(w * 0.45), 8, 1, 4);
        ctx.fillRect(10 - 1, 8, 2, 4);
        ctx.fillRect(10 + Math.round(w * 0.3), 8, 2, 4);
      }
      this.coinC.push(c);
    }
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.drawImage(gradientTexture(['#1B1733', '#2A2440', '#3A2B5C'], BG_H), 0, 0);
    enemyLift(ctx, 0.6);
    // the tomato line: under the lower lettering band
    ctx.save();
    ctx.globalAlpha = 0.6 * (1 + 0.1 * Math.sin(t * Math.PI * 2 * 0.8));
    ctx.fillStyle = TOMATO;
    ctx.fillRect(0, 142, 384, 2);
    ctx.restore();
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    const doubled = (this.flags.nefuda ?? 0) > 0;
    const ang = (t * 6 * Math.PI) / 180;
    const ca = Math.cos(ang);
    const sa = Math.sin(ang);
    for (let gy = -6; gy <= 6; gy++)
      for (let gx = -8; gx <= 8; gx++) {
        const lx = gx * 32 + (gy % 2 ? 16 : 0);
        const ly = gy * 32;
        const x = Math.round(192 + lx * ca - ly * sa);
        const y = Math.round(80 + lx * sa + ly * ca);
        if (x < -12 || x > 396 || y < -12 || y > BG_H + 12) continue;
        const idx = gx * 7 + gy * 13;
        if (((idx % 5) + 5) % 5 === 0) {
          // every fifth: a vegetable's silhouette
          const rows = VEG[((idx % 3) + 3) % 3];
          ctx.fillStyle = '#2A3A2A';
          rows.forEach((row, yy) => [...row].forEach((v, xx) => v === '#' && ctx.fillRect(x - 4 + xx, y - 3 + yy, 1, 1)));
          continue;
        }
        // the coins turn in a wave across the grid
        const f = Math.floor(t * 4 + gx * 0.5 + gy * 0.3) % 4;
        ctx.globalAlpha = 0.55;
        if (doubled) ctx.drawImage(this.coinC[(f + 1) % 4], x - 8, y - 12);
        ctx.drawImage(this.coinC[(f + 4) % 4], x - 10, y - 10);
        ctx.globalAlpha = 1;
      }
  }

  protected drawL2(g: Gfx, t: number): void {
    const ctx = g.ctx;
    const band = (y: number, text: string, dir: number) => {
      ctx.fillStyle = '#C8A06A';
      ctx.fillRect(0, y - 1, 384, 20);
      ctx.fillStyle = '#D8B888';
      ctx.fillRect(0, y, 384, 18);
      // corrugation: faint vertical flutes every 3px
      ctx.fillStyle = '#CCAA7A';
      for (let x = (Math.floor(t * 24 * dir) % 3 + 3) % 3; x < 384; x += 3) ctx.fillRect(x, y + 1, 1, 16);
      const img = markerText(text, '#2A2440');
      const span = img.width + 40;
      const off = ((t * 24 * dir) % span + span) % span;
      for (let x = -span + off; x < 384; x += span) ctx.drawImage(img, Math.round(x), y + 1);
    };
    band(36, (this.flags.nefuda ?? 0) > 0 ? '全品 200円' : 'どれでも 100円', -1);
    band(124, 'いらっしゃいませ', 1);
  }
}

// ---- bg_h_tetsuya (耕うん機テツヤ) -------------------------------------------------------------

/** 15.7: ploughed ridges rushing out of the dark toward us, a headlight sweeping across. */
export class HoshiTetsuyaBg extends Background {
  private stars = makeStars(66, 12, 50);
  private flow = 0;
  private sweep = 0;
  private clods: { x: number; t0: number; c: string; vx: number }[] = [];
  private nextClod = 0;

  constructor() {
    super('bg_h_tetsuya');
    this.wave = { A: 1, lambda: 48, f: 0.2, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#1B1733';
  }

  private mode(): 'run' | 'rest' | 'stall' {
    if ((this.flags.charge ?? 0) > 0) return 'stall';
    if ((this.flags.rest ?? 0) > 0) return 'rest';
    return 'run';
  }

  update(dt: number): void {
    super.update(dt);
    const m = this.mode();
    const s = dt / 1000;
    if (m === 'run') this.flow += s * ((this.flags.burst ?? 0) > 0 ? 4 : 1);
    if (m !== 'stall') this.sweep += s;
    if (m === 'run' && this.t > this.nextClod) {
      this.nextClod = this.t + 0.35;
      this.clods.push({ x: Math.random() * 384, t0: this.t, c: Math.random() < 0.3 ? '#3F7A3A' : '#6B5A4A', vx: (Math.random() - 0.5) * 60 });
    }
    this.clods = this.clods.filter((c) => this.t - c.t0 < 0.8);
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.drawImage(gradientTexture(['#0B0B14', '#141028', '#1B1733'], BG_H), 0, 0);
    drawStars(ctx, this.stars, t);
    tomatoBand(ctx, 96, t);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, _t: number): void {
    // the field below the horizon (y100): ridges converge on (192,70), rows
    // come toward us one a second (not a checkerboard: the furrows only)
    const vx = 192;
    const vy = 70;
    ctx.fillStyle = '#1B1733';
    ctx.fillRect(0, 100, 384, BG_H - 100);
    // rows (horizontal crests) spaced in perspective, moving toward us
    const ph = this.flow % 1;
    for (let k = 0; k < 14; k++) {
      const z = 1 / (k + 1 - ph + 0.2);
      const y = Math.round(vy + (BG_H - vy) * z * 1.1);
      if (y < 100 || y >= BG_H) continue;
      ctx.fillStyle = '#5B4A7A';
      ctx.fillRect(0, y, 384, 1);
      ctx.fillStyle = '#2A2440';
      for (let x = 0; x < 384; x += 2) if (BAYER4[y & 3][x & 3] < 6) ctx.fillRect(x, y + 1, 1, 1);
    }
    // furrows fanning out from the vanishing point
    for (let i = -12; i <= 12; i++) {
      const bx = vx + i * 34;
      pxLine(ctx, vx + i * 3, 100, bx, BG_H, i % 2 ? '#3A2B5C' : '#2A2440', 1);
    }
    enemyLift(ctx, 0.55);
  }

  protected drawL2(g: Gfx, _t: number): void {
    const ctx = g.ctx;
    const m = this.mode();
    // the headlight's fan crossing the screen every 3s
    const a = m === 'rest' ? 0.06 : (this.flags.tetsuya ?? 1) > 0 ? 0.24 : 0.18;
    if (m !== 'stall' || a > 0) {
      const p = (this.sweep % 3) / 3;
      const cx = -80 + p * 544;
      ctx.save();
      ctx.globalAlpha = m === 'stall' ? 0.08 : a;
      ctx.fillStyle = '#FFE7A3';
      ctx.beginPath();
      ctx.moveTo(192, 64);
      ctx.lineTo(cx - 60, BG_H);
      ctx.lineTo(cx + 60, BG_H);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    // clods and grass jumping up from the bottom
    for (const c of this.clods) {
      const k = (this.t - c.t0) / 0.8;
      const x = Math.round(c.x + c.vx * k);
      const y = Math.round(BG_H - 2 - Math.sin(k * Math.PI) * 30);
      ctx.fillStyle = c.c;
      ctx.fillRect(x, y, 2, 2);
    }
  }

  draw(g: Gfx): void {
    // engine judder: 1px every 3 frames while it runs (5Hz)
    const jit = this.mode() === 'run' && Math.floor(this.t * 20) % 4 === 0 ? 1 : 0;
    if (jit) g.ctx.translate(0, 1);
    super.draw(g);
    if (jit) g.ctx.translate(0, -1);
  }
}

// ---- bg_h_boss (ヨビモドシ) --------------------------------------------------------------------

/** 15.8: the night sky sliding down, five wires, name tags flowing off to the right. */
export class HoshiBossBg extends Background {
  private stars = makeStars(77, 14, 90);
  private tags: { wire: number; x: number; hot: number }[] = [];
  private tagSpeed = 16;

  constructor() {
    super('bg_h_boss');
    this.wave = { A: 2, lambda: 56, f: 0.25, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#0B0B14';
    const r = new Rng(12);
    for (let i = 0; i < 9; i++) this.tags.push({ wire: r.int(0, 4), x: r.int(0, 383), hot: 0 });
  }

  update(dt: number): void {
    super.update(dt);
    const f = this.flags;
    let target = (f.phase2 ?? 0) > 0 ? 32 : 16;
    if ((f.light ?? 0) > 0 || (f.final ?? 0) > 0) target = 0;
    // the tags ease to their speed (the finale: stopped over 500ms)
    this.tagSpeed += (target - this.tagSpeed) * Math.min(1, dt / 500);
    if ((f.phase2 ?? 0) > 0) this.waveTarget = { A: 3 };
    const s = dt / 1000;
    // a 点呼: one tag flares white and races off to the right (300ms)
    if (f.tenkoAt && f.tenkoAt !== this.lastTenko) {
      this.lastTenko = f.tenkoAt;
      const t = this.tags.reduce((a, b) => (Math.abs(b.x - 192) < Math.abs(a.x - 192) ? b : a));
      t.hot = 1;
    }
    for (const t of this.tags) {
      t.x += (t.hot > 0 ? 600 : this.tagSpeed) * s;
      if (t.hot > 0) t.hot = Math.max(0, t.hot - s / 0.3);
      if (t.x > 400) {
        t.x = -16;
        t.wire = Math.floor(Math.random() * 5);
        t.hot = 0;
      }
    }
  }
  private lastTenko = 0;

  private wireY(i: number, x: number): number {
    return 40 + i * 8 + Math.round(3 * Math.sin((x / 384) * Math.PI));
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    const f = this.flags;
    const off = Math.floor(t * 4) % BG_H;
    const tex = gradientTexture(['#0B0B14', '#1B1733', '#3A2B5C', '#1B1733', '#0B0B14'], BG_H * 2);
    ctx.drawImage(tex, 0, -off - BG_H / 2);
    ctx.drawImage(tex, 0, BG_H * 2 - off - BG_H / 2);
    drawStars(ctx, this.stars, t);
    // the morning star low in the east: it does not twinkle (3×3 from phase 2)
    ctx.fillStyle = '#FFF6D8';
    if ((f.phase2 ?? 0) > 0) ctx.fillRect(343, 117, 3, 3);
    else ctx.fillRect(344, 118, 2, 2);
    if ((f.light ?? 0) > 0) tomatoBand(ctx, 96, t);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, _t: number): void {
    for (let i = 0; i < 5; i++) for (let x = 0; x < 384; x++) {
      ctx.fillStyle = '#3A2B5C';
      ctx.fillRect(x, this.wireY(i, x), 1, 1);
    }
    for (const t of this.tags) {
      const x = Math.round(t.x);
      const y = this.wireY(t.wire, x) - 3;
      const fade = x > 360 ? Math.max(0, (384 - x) / 24) : 1;
      ctx.globalAlpha = (t.hot > 0 ? 1 : 0.7) * fade;
      ctx.fillStyle = t.hot > 0 ? '#FFFFFF' : '#F4F1E8';
      ctx.fillRect(x, y, 10, 6);
      ctx.fillStyle = '#9AA0A8';
      ctx.fillRect(x + 2, y + 2, 6, 1);
      ctx.fillRect(x + 2, y + 4, 4, 1);
      if (t.hot > 0) {
        ctx.fillStyle = '#FFE7A3';
        ctx.fillRect(x - 1, y - 1, 12, 1);
        ctx.fillRect(x - 1, y + 6, 12, 1);
      }
      ctx.globalAlpha = 1;
    }
    enemyLift(ctx, 0.5);
  }

  protected drawL2(g: Gfx, _t: number): void {
    const f = this.flags;
    const ctx = g.ctx;
    // the night sinks a step after each 夜ふかし (−10%, max 2)
    const dark = Math.min(2, f.dark ?? 0);
    if (dark > 0) g.rect(0, 0, 384, BG_H, '#0B0B14', 0.1 * dark);
    // lit: the whole backdrop +15%
    if ((f.light ?? 0) > 0 && !(f.finale > 0)) {
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.08;
      ctx.fillStyle = '#5B4A7A';
      ctx.fillRect(0, 0, 384, BG_H);
      ctx.restore();
    }
    // phase 2's 0.3s of sunset (#F2894B α40%)
    if (f.sunsetAt) {
      const dt = this.t * 1000 - (f.sunsetT ?? 0);
      if (!f.sunsetT) this.flags.sunsetT = this.t * 1000;
      if (dt < 300) g.rect(0, 0, 384, 70, TOMATO, 0.4 * (1 - dt / 300));
      else {
        this.flags.sunsetAt = 0;
        this.flags.sunsetT = 0;
      }
    }
    // the finale: every band fills with orange to gold light (2.0s)
    const fin = f.finale ?? 0;
    if (fin > 0) {
      const gr = ctx.createLinearGradient(0, BG_H, 0, 0);
      gr.addColorStop(0, `rgba(255,231,163,${0.55 * fin})`);
      gr.addColorStop(0.5, `rgba(247,194,122,${0.45 * fin})`);
      gr.addColorStop(1, `rgba(242,137,75,${0.35 * fin})`);
      ctx.fillStyle = gr;
      ctx.fillRect(0, 0, 384, BG_H);
    }
    void strokeCircle;
  }
}

/** The chapter-2 backgrounds by id. */
export function makeHoshiBackground(id: string): Background | null {
  switch (id) {
    case 'bg_h_house':
      return new HoshiHouseBg();
    case 'bg_h_tanada':
      return new HoshiTanadaBg();
    case 'bg_h_fence':
      return new HoshiFenceBg();
    case 'bg_h_yama':
      return new HoshiYamaBg();
    case 'bg_h_mujin':
      return new HoshiMujinBg();
    case 'bg_h_tetsuya':
      return new HoshiTetsuyaBg();
    case 'bg_h_boss':
      return new HoshiBossBg();
  }
  return null;
}

export const HOSHI_BG_IDS = ['bg_h_house', 'bg_h_tanada', 'bg_h_fence', 'bg_h_yama', 'bg_h_mujin', 'bg_h_tetsuya', 'bg_h_boss'];
