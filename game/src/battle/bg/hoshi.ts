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
import { drawLoop, loopHeight, ridgeTile, tuftTile } from './hoshi_scenery';

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
    // the strings and their bunches, one tile of BG_H that loops upward:
    // thin trained vines with a green tomato here and there, dark in the night
    const [c, ctx] = makeCanvas(384, BG_H);
    for (let x = 6; x < 384; x += 12) {
      ctx.fillStyle = '#2A3A5E';
      ctx.fillRect(x, 0, 1, BG_H);
      // the vine winding round the string, a leaf now and then
      for (let y = 0; y < BG_H; y += 2) {
        const wob = Math.round(Math.sin((y + x) / 7) * 1.5);
        ctx.fillStyle = '#1E3A34';
        ctx.fillRect(x + wob, y, 1, 2);
        if (hash2(x, y, 9) < 0.08) {
          ctx.fillStyle = '#244A3A';
          ctx.fillRect(x + wob + (hash2(x, y, 10) < 0.5 ? -3 : 1), y, 3, 2);
        }
      }
      // a truss of green tomatoes at its own height on each string
      for (let k = 0; k < 2; k++) {
        const y = Math.floor(hash2(x, k, 3) * BG_H);
        const n = 2 + Math.floor(hash2(x, k, 4) * 3);
        for (let j = 0; j < n; j++) {
          const rr = 2 + Math.floor(hash2(x + j, k, 5) * 2);
          const bx = x + (j % 2 ? 3 : -2) + Math.floor(hash2(x, j, 6) * 3) - 1;
          const by = (y + j * 5) % BG_H;
          fillCircle(ctx, bx, by, rr, '#1E4A34');
          fillCircle(ctx, bx - 1, by - 1, Math.max(1, rr - 1), '#2E5A3E');
          // the lantern's light catches the lower left edge
          ctx.fillStyle = TOMATO;
          ctx.fillRect(bx - rr, by + 1, 1, 1);
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
  private stars = makeStars(33, 12, 44);
  private cds: { x: number; y: number; ph: number; spd: number }[] = [];
  private glintAt = 0;
  private glintCd = 0;
  /** The six steps (far → near): crest line, stone face, the flooded paddy. */
  private steps: { y: number; tile: HTMLCanvasElement; refl: { x: number; y: number; ph: number }[]; ripples: { x: number; y: number; w: number; ph: number }[] }[] = [];
  private far: HTMLCanvasElement;

  constructor() {
    super('bg_h_tanada');
    this.wave = { A: 2, lambda: 40, f: 0.3, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.distortL1Only = true;
    this.bottom = '#1B1733';
    const r = new Rng(8);
    for (let i = 0; i < 4; i++) this.cds.push({ x: i * 110 + r.int(0, 40), y: 22 + r.int(0, 30), ph: r.range(0, 6.28), spd: r.range(9, 14) });
    // the dark hill the terraces are cut into, cedars on its shoulder
    this.far = ridgeTile('tanada_far', 40, (x) => loopHeight(x, 14, [[5, 1, 0.4], [3, 3, 1.9], [1.5, 7, 0.2]]), '#141028', { rim: '#5B4A7A', rimA: 0.7, trees: 0.16, treeH: 9, seed: 31, canopy: '#1B1733' });
    const tops = [64, 74, 86, 100, 116, 135];
    const walls = [2, 2, 3, 3, 4, 5];
    tops.forEach((y, i) => {
      const next = tops[i + 1] ?? BG_H + 4;
      const h = BG_H - y + 6;
      const [c, ctx] = makeCanvas(384, h);
      const amp = 1.5 + i * 0.6;
      const crest = (x: number) => Math.round(3 + loopHeight(x, 0, [[amp, 1, i * 1.7], [amp * 0.4, 3, i * 0.9 + 2]]));
      const refl: { x: number; y: number; ph: number }[] = [];
      const ripples: { x: number; y: number; w: number; ph: number }[] = [];
      for (let x = 0; x < 384; x++) {
        const top = crest(x);
        const wallH = walls[i];
        const waterTop = top + 1 + wallH;
        const waterBot = h;
        // the ridge's crest catching starlight, a darker grassy lip under it
        ctx.fillStyle = '#5B4A7A';
        ctx.fillRect(x, top, 1, 1);
        ctx.fillStyle = hash2(x, i, 11) < 0.3 ? '#8E95C8' : '#3A2B5C';
        if (hash2(x, i, 12) < 0.5) ctx.fillRect(x, top, 1, 1);
        // the stone face of the step (a few lit stones)
        for (let y = top + 1; y < waterTop; y++) {
          const n = hash2(x >> 1, y >> 1, 13 + i);
          ctx.fillStyle = n < 0.18 ? '#2A2440' : '#141028';
          ctx.fillRect(x, y, 1, 1);
        }
        // the flooded paddy reflecting the sky: the wall's dark near the top,
        // the lighter horizon toward us (dithered steps)
        const span = Math.max(1, next - y - (top - 3) - 1 - wallH);
        for (let y = waterTop; y < waterBot; y++) {
          const q = Math.min(1, (y - waterTop) / Math.max(4, span));
          const lv = q * 2.2;
          const k = Math.floor(lv) + (BAYER4[y & 3][x & 3] < (lv % 1) * 16 ? 1 : 0);
          ctx.fillStyle = ['#1B1733', '#2A2440', '#3A2B5C', '#3A2B5C'][Math.min(3, k)];
          ctx.fillRect(x, y, 1, 1);
        }
      }
      // rice standing in rows in the water (the far steps: short strokes;
      // near: taller clumps with a drooping ear), gaps of open water between
      const rowGap = 3 + i;
      const colGap = 7 + i * 3;
      for (let row = 0; row < (i < 2 ? 1 : 2); row++) {
        for (let x0 = (row * 3) % colGap; x0 < 384; x0 += colGap) {
          const x = x0 + Math.floor(hash2(x0, row, 20 + i) * 2);
          const base = crest(x) + 1 + walls[i] + 2 + row * rowGap + Math.min(2, i);
          if (base >= Math.min(h - 1, next - y + 1)) continue;
          const tall = 1 + Math.floor(i * 0.7) + (hash2(x, row, 21) < 0.3 ? 1 : 0);
          ctx.fillStyle = '#20302C';
          ctx.fillRect(x, base - tall, 1, tall + 1);
          if (i >= 2) ctx.fillRect(x + 1, base - tall + 1, 1, tall);
          if (i >= 3 && hash2(x, row, 22) < 0.5) {
            ctx.fillStyle = '#5A5030';
            ctx.fillRect(x + 2, base - tall, 1, 2);
          }
          // its dark reflection under it
          ctx.fillStyle = '#141028';
          if (base + 1 < h) ctx.fillRect(x, base + 1, 1, Math.min(tall, 2));
        }
      }
      // rice ears drooping over the ridge (dark gold against the water)
      for (let x = 0; x < 384; x++) {
        if (hash2(x, i, 7) > 0.22) continue;
        const top = crest(x);
        ctx.fillStyle = '#2A3A2A';
        ctx.fillRect(x, top - 2 - (i >> 1), 1, 2 + (i >> 1));
        if (hash2(x, i, 8) < 0.55) {
          ctx.fillStyle = '#6A5A3A';
          ctx.fillRect(x + 1, top - 2 - (i >> 1), 1, 1);
          ctx.fillRect(x + 1, top - 1 - (i >> 1), 1, 1);
        }
      }
      // where the reflected stars and the ripples lie (water only)
      for (let k = 0; k < 6 + i * 2; k++) {
        const x = r.int(0, 383);
        const top = crest(x) + 1 + walls[i];
        const room = Math.max(2, Math.min(h, next - y + 2) - top - 2);
        refl.push({ x, y: top + 2 + r.int(0, room - 1), ph: r.range(0, 6.28) });
      }
      for (let k = 0; k < 4 + i; k++) {
        const x = r.int(0, 383);
        const top = crest(x) + 1 + walls[i];
        const room = Math.max(2, Math.min(h, next - y + 2) - top - 2);
        ripples.push({ x, y: top + 3 + r.int(0, room - 1), w: 3 + r.int(0, 3 + i), ph: r.range(0, 6.28) });
      }
      this.steps.push({ y: y - 3, tile: c, refl, ripples });
    });
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
    // the sky pales toward the ridge so the hill's line reads
    ctx.drawImage(gradientTexture(['#0B0B14', '#141028', '#1B1733', '#2A2440', '#3A2B5C'], 66), 0, 0);
    ctx.fillStyle = '#3A2B5C';
    ctx.fillRect(0, 66, 384, BG_H - 66);
    drawStars(ctx, this.stars, t);
    drawLoop(ctx, this.far, -t * 2, 40);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    const stiff = (this.flags.stiff ?? 0) > 0;
    this.steps.forEach((st, i) => {
      // the terraces drift right (8px/s), each step swaying on its own phase;
      // 立ちっぱなし: everything holds still (stiff)
      const sway = stiff ? 0 : 3 * Math.sin(2 * Math.PI * (t * 0.3 + i / 6));
      const off = t * 8 + sway;
      drawLoop(ctx, st.tile, off, st.y);
      const xo = ((Math.round(off) % 384) + 384) % 384;
      // stars reflected in the paddy, twinkling
      ctx.fillStyle = '#FFF6D8';
      for (const p of st.refl) {
        const a = 0.25 + 0.6 * Math.max(0, Math.sin(t * 1.3 + p.ph));
        if (a < 0.3) continue;
        ctx.globalAlpha = a;
        ctx.fillRect((p.x + xo) % 384, st.y + p.y, 1, 1);
      }
      // ripples: short pale lines that come and go
      ctx.fillStyle = '#5B4A7A';
      for (const p of st.ripples) {
        const a = Math.sin(t * 0.9 + p.ph);
        if (a < 0.2) continue;
        ctx.globalAlpha = Math.min(1, a) * 0.8;
        const w = Math.round(p.w * (0.6 + 0.4 * a));
        const x = (p.x + xo + Math.round(Math.sin(t * 0.5 + p.ph) * 2)) % 384;
        ctx.fillRect(x, st.y + p.y, w, 1);
      }
      ctx.globalAlpha = 1;
      // the lowest paddies hold the lantern's light (the one band, y124),
      // broken up by the water's ripples
      if (i === 4) {
        tomatoBand(ctx, 124, t);
        ctx.fillStyle = '#2A2440';
        for (let y = 124; y < 134; y++) {
          const ph = Math.sin(y * 1.7 + t * 2.2) * 40 + y * 29;
          for (let x = 0; x < 384; x++) if (((x + Math.round(ph) + 1000) % 23) < 3) ctx.fillRect(x, y, 1, 1);
        }
      }
    });
    // a thin mist over the paddies behind the scarecrow (keeps the suit's edge)
    enemyLift(ctx, 0.55);
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
        ctx.fillStyle = yy < -2 ? '#E8ECF0' : yy > 2 ? '#8E95A6' : '#C8CDD4';
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
  private stars = makeStars(44, 12, 50);
  private pulseX = -40;
  private lastPulse = -1;
  private far: HTMLCanvasElement;
  private bush: HTMLCanvasElement;
  private ground: HTMLCanvasElement;
  private rows: { y: number; gap: number; post: number; h: number; tile: HTMLCanvasElement; wire: string }[] = [];

  constructor() {
    super('bg_h_fence');
    this.wave = { A: 1, lambda: 48, f: 0.2, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#1B1733';
    // the mountain the boars come down from, cedars along its shoulder
    this.far = ridgeTile('fence_far', 44, (x) => loopHeight(x, 16, [[7, 1, 2.1], [3, 2, 0.3], [2, 5, 1.1]]), '#141028', { rim: '#5B4A7A', rimA: 0.8, trees: 0.2, treeH: 11, seed: 41, canopy: '#1B1733' });
    // kudzu and brush at the forest's foot (lumpy, a few leaves catching starlight)
    this.bush = ridgeTile('fence_bush', 20, (x) => loopHeight(x, 7, [[2.5, 4, 0.7], [1.5, 11, 2.2], [1, 23, 0.1]]), '#1B1733', { rim: '#3A2B5C', rimA: 1, seed: 42 });
    // the mown strip along the fences and the field beyond (static)
    const [g, gctx] = makeCanvas(384, BG_H - 86);
    gctx.drawImage(gradientTexture(['#1B1733', '#2A2440', '#3A2B5C', '#2A2440'], BG_H - 86), 0, 0);
    for (let y = 0; y < BG_H - 86; y += 2)
      for (let x = 0; x < 384; x++) {
        const n = hash2(x, y, 44);
        const depth = y / (BG_H - 86);
        if (n < 0.05 + depth * 0.08) {
          gctx.fillStyle = n < 0.02 ? '#5B4A7A' : '#1E2A2E';
          gctx.fillRect(x, y, 1, 1 + Math.round(depth * 2));
        }
      }
    this.ground = g;
    // three rows of fence, far to near: thin dark → white FRP posts with caps
    const specs = [
      { y: 92, gap: 3, post: 22, h: 8, wire: '#5B4A7A', postC: '#5B4A7A', postS: '#3A2B5C', w: 1 },
      { y: 106, gap: 5, post: 32, h: 13, wire: '#9AA0A8', postC: '#9AA0A8', postS: '#6B7186', w: 1 },
      { y: 136, gap: 9, post: 48, h: 24, wire: '#E8E4D8', postC: '#E8E4D8', postS: '#9AA0A8', w: 2 },
    ];
    for (const r of specs) {
      const [c, ctx] = makeCanvas(384, r.h + 4);
      const base = r.h + 2;
      // mown grass along the line
      for (let x = 0; x < 384; x++) if (hash2(x, r.y, 45) < 0.55) {
        ctx.fillStyle = '#1E2A2E';
        ctx.fillRect(x, base - 1 - Math.floor(hash2(x, r.y, 46) * (r.w + 1)), 1, 2);
      }
      for (let x = 8; x < 384; x += r.post) {
        // the post (lit a little from the lantern on the left), a black cap
        ctx.fillStyle = r.postC;
        ctx.fillRect(x, base - r.h, r.w, r.h);
        if (r.w > 1) {
          ctx.fillStyle = r.postS;
          ctx.fillRect(x + 1, base - r.h, 1, r.h);
        }
        ctx.fillStyle = '#2A2440';
        ctx.fillRect(x - (r.w > 1 ? 1 : 0), base - r.h - 1, r.w + (r.w > 1 ? 2 : 0), 2);
        // black insulator clips where the two wires meet it
        for (const wy of [base - Math.round(r.h * 0.35), base - Math.round(r.h * 0.35) - r.gap]) {
          ctx.fillStyle = '#0B0B14';
          ctx.fillRect(x - 1, wy - (r.w > 1 ? 1 : 0), r.w + 2, r.w > 1 ? 3 : 2);
        }
      }
      this.rows.push({ y: r.y - r.h - 2, gap: r.gap, post: r.post, h: r.h, tile: c, wire: r.wire });
    }
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
    // the sky pales toward the mountain so its line and the cedars read
    ctx.drawImage(gradientTexture(['#0B0B14', '#141028', '#1B1733', '#2A2440', '#3A2B5C'], 76), 0, 0);
    ctx.fillStyle = '#3A2B5C';
    ctx.fillRect(0, 76, 384, 10);
    drawStars(ctx, this.stars, t);
    drawLoop(ctx, this.far, 0, 40);
    drawLoop(ctx, this.bush, 0, 74);
    ctx.drawImage(this.ground, 0, 86);
    // the ground under the lantern: the one band of tomato light
    tomatoBand(ctx, 120, t);
    enemyLift(ctx, 0.6);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, _t: number): void {
    const charged = (this.flags.charged ?? 0) > 0;
    for (const r of this.rows) {
      ctx.drawImage(r.tile, 0, r.y);
      const base = r.y + r.h + 2;
      const near = r.wire === '#E8E4D8';
      for (const wy of [base - Math.round(r.h * 0.35), base - Math.round(r.h * 0.35) - r.gap]) {
        // the wire: near, a white-and-black twist; its 1px shadow below
        ctx.fillStyle = r.wire;
        ctx.fillRect(0, wy, 384, 1);
        if (near) {
          ctx.fillStyle = '#2A2440';
          for (let x = 0; x < 384; x += 3) ctx.fillRect(x, wy, 1, 1);
          ctx.fillStyle = '#6B7186';
          ctx.fillRect(0, wy + 1, 384, 1);
        }
        if (charged) {
          ctx.globalAlpha = 0.2;
          ctx.fillStyle = '#7CFF9A';
          ctx.fillRect(0, wy - 1, 384, 3);
          ctx.globalAlpha = 1;
        }
        // the pulse: a 3px cream core and a 12px green tail (a soft glow round it)
        const px = Math.round(this.pulseX);
        if (px > -16 && px < 400) {
          ctx.globalAlpha = 0.25;
          ctx.fillStyle = '#7CFF9A';
          ctx.fillRect(px - 6, wy - 2, 9, 5);
          for (let k = 0; k < 12; k++) {
            ctx.globalAlpha = 1 - k / 12;
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
      const y = 97;
      ctx.fillStyle = '#2A2440';
      ctx.fillRect(x - 1, y - 1, 14, 10);
      ctx.fillStyle = '#FFD23F';
      ctx.fillRect(x, y, 12, 8);
      ctx.fillStyle = '#D9A441';
      ctx.fillRect(x, y + 7, 12, 1);
      ctx.fillRect(x + 11, y, 1, 8);
      ctx.fillStyle = '#2A2440';
      for (let k = 0; k < 3; k++) ctx.fillRect(x + 2, y + 2 + k * 2, k === 1 ? 6 : 8, 1);
      // its wire hooks
      ctx.fillStyle = '#9AA0A8';
      ctx.fillRect(x + 2, y - 2, 1, 1);
      ctx.fillRect(x + 9, y - 2, 1, 1);
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

  private near: HTMLCanvasElement;
  private grass: HTMLCanvasElement;

  constructor() {
    super('bg_h_yama');
    this.wave = { A: 2, lambda: 64, f: 0.3, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#1B1733';
    this.grass = tuftTile('yama_grass', 10, 0.3, '#141028', '#3A2B5C', 57);
    // the slope in front: pebbles lit on top, dark clumps, a rooted-up patch
    // of soil and the wallow's puddles holding the lantern's orange
    const [c, ctx] = makeCanvas(384, 40);
    for (let y = 0; y < 40; y++)
      for (let x = 0; x < 384; x++) {
        const n = hash2(x, y, 58);
        const depth = y / 40;
        if (n < 0.012 + depth * 0.02) {
          ctx.fillStyle = '#3A2B5C';
          ctx.fillRect(x, y, 2, 1);
          ctx.fillStyle = '#2A2440';
          ctx.fillRect(x, y + 1, 2, 1);
        } else if (n > 0.985 - depth * 0.02) {
          ctx.fillStyle = '#141028';
          ctx.fillRect(x, y, 1, 2 + Math.round(depth * 2));
        }
      }
    // turned soil where the boar dug (dithered browns)
    for (const [cx, cy, rw] of [[70, 18, 22], [250, 26, 30]] as [number, number, number][])
      for (let y = -6; y <= 6; y++)
        for (let x = -rw; x <= rw; x++) {
          const k = 1 - (x * x) / (rw * rw) - (y * y) / 36;
          if (k <= 0 || BAYER4[(cy + y) & 3][(cx + x) & 3] > k * 20) continue;
          ctx.fillStyle = hash2(cx + x, cy + y, 59) < 0.3 ? '#4A3A2A' : '#2A2020';
          ctx.fillRect(cx + x, cy + y, 1, 1);
        }
    // puddles of the wallow, catching the light
    for (const [cx, cy, rw] of [[160, 30, 18], [330, 22, 12]] as [number, number, number][])
      for (let y = -3; y <= 3; y++) {
        const hw = Math.round(rw * Math.sqrt(1 - (y * y) / 12));
        ctx.fillStyle = '#141028';
        ctx.fillRect(cx - hw, cy + y, hw * 2, 1);
        if (y === -1 || y === 0) {
          ctx.fillStyle = TOMATO;
          ctx.globalAlpha = y === 0 ? 0.5 : 0.25;
          ctx.fillRect(cx - hw + 3, cy + y, hw * 2 - 8, 1);
          ctx.globalAlpha = 1;
        }
      }
    this.near = c;
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
    // the slope in front, with its grass, stones and the wallow's puddles
    drawLoop(ctx, this.near, -this.px[2], 112);
    drawLoop(ctx, this.grass, -this.px[2] * 1.2, 118);
    // the lantern's light along the nearest ridge's edge (the tomato band, y112)
    ctx.save();
    ctx.globalAlpha = 0.18 * (1 + 0.1 * Math.sin(t * Math.PI * 2 * 0.8));
    ctx.fillStyle = TOMATO;
    ctx.fillRect(0, 108, 384, 10);
    ctx.restore();
    // a dark boar on dark hills: the sky behind it is lifted (51 15.1)
    enemyLift(ctx, 1);
    enemyLift(ctx, 0.5);
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
    // four spin frames of a silver coin (r9): no real coin's design — a
    // milled rim, an inner ring and a plain 「100」 (0: face on … 2: edge on)
    const DIG: Record<string, string[]> = { '1': ['.#', '##', '.#', '.#', '.#'], '0': ['###', '#.#', '#.#', '#.#', '###'] };
    for (let f = 0; f < 4; f++) {
      const [c, ctx] = makeCanvas(20, 20);
      const w = [9, 6, 2, 6][f];
      for (let y = -9; y <= 9; y++) {
        const hw = Math.round(w * Math.sqrt(1 - (y * y) / 81));
        for (let x = -hw; x <= hw; x++) {
          const edge = Math.abs(x) >= hw || Math.abs(y) >= 9 || (Math.abs(x) >= hw - 1 && w > 3) || Math.abs(y) >= 8;
          const lit = x + y < -3;
          const dark = x + y > 5;
          ctx.fillStyle = edge ? (lit ? '#C8C2B4' : '#6B7186') : lit ? '#F4F1E8' : dark ? '#8E95A6' : '#C8C2B4';
          ctx.fillRect(10 + x, 10 + y, 1, 1);
        }
      }
      if (w >= 6) {
        // the inner ring
        ctx.fillStyle = '#8E95A6';
        for (let a = 0; a < 32; a++) {
          const an = (a / 32) * Math.PI * 2;
          ctx.fillRect(Math.round(10 + Math.cos(an) * (w - 3)), Math.round(10 + Math.sin(an) * 6), 1, 1);
        }
        // 「100」, squeezed with the turn
        const glyphs = ['1', '0', '0'];
        const gw = f === 0 ? [2, 3, 3] : [1, 2, 2];
        let x0 = 10 - Math.floor((gw[0] + gw[1] + gw[2] + 2) / 2);
        glyphs.forEach((d, i) => {
          DIG[d].forEach((row, yy) => [...row].forEach((v, xx) => {
            if (v !== '#') return;
            const sx = gw[i] === 3 ? xx : Math.min(gw[i] - 1, Math.floor((xx * gw[i]) / row.length));
            ctx.fillStyle = '#6B7186';
            ctx.fillRect(x0 + sx, 8 + yy, 1, 1);
          }));
          x0 += gw[i] + 1;
        });
        // a glint on the rim
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(10 - Math.round(w * 0.6), 4, 1, 1);
      }
      this.coinC.push(c);
    }
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.drawImage(gradientTexture(['#1B1733', '#2A2440', '#3A2B5C'], BG_H), 0, 0);
    enemyLift(ctx, 0.6);
    void t;
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
          // a pale rim on its upper left, then the dark green body
          ctx.fillStyle = '#3F5A3A';
          rows.forEach((row, yy) => [...row].forEach((v, xx) => v === '#' && ctx.fillRect(x - 5 + xx, y - 4 + yy, 1, 1)));
          ctx.fillStyle = '#20302A';
          rows.forEach((row, yy) => [...row].forEach((v, xx) => v === '#' && ctx.fillRect(x - 4 + xx, y - 3 + yy, 1, 1)));
          continue;
        }
        // the coins turn in a wave across the grid
        const f = Math.floor(t * 4 + gx * 0.5 + gy * 0.3) % 4;
        ctx.globalAlpha = 0.42;
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
    // the tomato line: the lower band's bottom edge, lit by the lantern (y142, 2px)
    ctx.save();
    ctx.globalAlpha = 0.6 * (1 + 0.1 * Math.sin(t * Math.PI * 2 * 0.8));
    ctx.fillStyle = TOMATO;
    ctx.fillRect(0, 142, 384, 2);
    ctx.restore();
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
  private far: HTMLCanvasElement;
  private hill: HTMLCanvasElement;
  private weeds: HTMLCanvasElement;
  /** The ploughed field in 16 phases of its flow toward us (one ridge a second). */
  private fieldFrames: HTMLCanvasElement[] = [];

  constructor() {
    super('bg_h_tetsuya');
    this.wave = { A: 1, lambda: 48, f: 0.2, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#1B1733';
    this.far = ridgeTile('tetsuya_far', 40, (x) => loopHeight(x, 20, [[8, 1, 0.9], [4, 2, 2.4], [2, 6, 0.5]]), '#141028', { rim: '#5B4A7A', rimA: 0.7, trees: 0.22, treeH: 10, seed: 61, canopy: '#1B1733' });
    // the abandoned field's edge: a low bank with susuki and weeds standing up
    this.hill = ridgeTile('tetsuya_bank', 16, (x) => loopHeight(x, 9, [[2, 2, 1.3], [1, 9, 0.2]]), '#1B1733', { rim: '#3A2B5C', rimA: 1, seed: 62 });
    this.weeds = tuftTile('tetsuya_weeds', 16, 0.13, '#141028', '#5B4A7A', 63);
    const H = BG_H - 100;
    for (let f = 0; f < 16; f++) {
      const [c, ctx] = makeCanvas(384, H);
      const img = ctx.createImageData(384, H);
      const ph = f / 16;
      const pal = {
        valley: [0x14, 0x10, 0x28],
        slope: [0x1b, 0x17, 0x33],
        side: [0x2a, 0x24, 0x40],
        crest: [0x3a, 0x2b, 0x5c],
        lit: [0x5b, 0x4a, 0x7a],
        clod: [0x4a, 0x3a, 0x2a],
        clodLit: [0x6b, 0x5a, 0x4a],
        weed: [0x2a, 0x3a, 0x2a],
      };
      for (let y = 0; y < H; y++) {
        const sy = y + 100;
        const d = sy - 70; // distance below the vanishing point (30 … 80)
        const v = 60 / d; // depth: 2 (far) … 0.75 (near)
        const near = (sy - 100) / H; // 0 far … 1 near
        for (let x = 0; x < 384; x++) {
          // lateral position on the ground: furrows run toward (192,70)
          const u = (x - 192) / d;
          const s = u * 5 + 100;
          const fr = s - Math.floor(s); // 0 … 1 across one ridge
          const ridge = Math.floor(s);
          // the profile of a ridge: valley → sunlit side (left, the lantern) → crest → shade
          let col = fr < 0.18 ? pal.valley : fr < 0.42 ? pal.side : fr < 0.58 ? pal.crest : fr < 0.8 ? pal.slope : pal.valley;
          if (fr >= 0.42 && fr < 0.58 && near > 0.55 && BAYER4[sy & 3][x & 3] < (near - 0.55) * 30) col = pal.lit;
          // clods and weeds along the ridge, flowing toward us with the depth
          const w = v * 6 - ph * 1;
          const cell = Math.floor(w * 3);
          const hsh = hash2(ridge, cell, 64);
          if (fr > 0.3 && fr < 0.75 && hsh < 0.16) {
            const inCell = w * 3 - cell;
            if (inCell < 0.35 + near * 0.3) col = hsh < 0.05 ? pal.weed : fr < 0.5 ? pal.clodLit : pal.clod;
          }
          // the far field fades into the night (dithered)
          if (near < 0.3 && BAYER4[sy & 3][x & 3] < (0.3 - near) * 40) col = pal.slope;
          const i = (y * 384 + x) * 4;
          img.data[i] = col[0];
          img.data[i + 1] = col[1];
          img.data[i + 2] = col[2];
          img.data[i + 3] = 255;
        }
      }
      ctx.putImageData(img, 0, 0);
      this.fieldFrames.push(c);
    }
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
    ctx.drawImage(gradientTexture(['#0B0B14', '#141028', '#1B1733', '#2A2440', '#3A2B5C'], 90), 0, 0);
    ctx.fillStyle = '#3A2B5C';
    ctx.fillRect(0, 90, 384, 10);
    drawStars(ctx, this.stars, t);
    // the mountain the path climbs, the bank of the old field, its susuki
    drawLoop(ctx, this.far, 0, 50);
    drawLoop(ctx, this.hill, 0, 86);
    drawLoop(ctx, this.weeds, 0, 82);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    // the ploughed ridges come toward us, one a second (not a checkerboard)
    const k = Math.floor(((this.flow % 1) + 1) * 16) % 16;
    ctx.drawImage(this.fieldFrames[k], 0, 100);
    // the horizon: the lantern's orange along the far edge of the field
    tomatoBand(ctx, 96, t, 8, 0.55);
    enemyLift(ctx, 0.5);
  }

  protected drawL2(g: Gfx, _t: number): void {
    const ctx = g.ctx;
    const m = this.mode();
    // the headlight's fan crossing the screen every 3s (brighter while 徹夜)
    const a = m === 'rest' ? 0.06 : (this.flags.tetsuya ?? 1) > 0 ? 0.24 : 0.18;
    const p = (this.sweep % 3) / 3;
    const cx = -80 + p * 544;
    ctx.save();
    ctx.globalAlpha = m === 'stall' ? 0.06 : a;
    ctx.fillStyle = '#FFE7A3';
    ctx.beginPath();
    ctx.moveTo(192, 64);
    ctx.lineTo(cx - 60, BG_H);
    ctx.lineTo(cx + 60, BG_H);
    ctx.closePath();
    ctx.fill();
    // its brighter core
    ctx.globalAlpha *= 0.6;
    ctx.beginPath();
    ctx.moveTo(192, 64);
    ctx.lineTo(cx - 22, BG_H);
    ctx.lineTo(cx + 22, BG_H);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
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
  private tags: { wire: number; x: number; hot: number; sw: number }[] = [];
  private tagSpeed = 16;
  private sky: HTMLCanvasElement;
  private ranges: HTMLCanvasElement;
  private hill: HTMLCanvasElement;
  private poles: HTMLCanvasElement;

  constructor() {
    super('bg_h_boss');
    this.wave = { A: 2, lambda: 56, f: 0.25, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#0B0B14';
    const r = new Rng(12);
    for (let i = 0; i < 9; i++) this.tags.push({ wire: r.int(0, 4), x: r.int(0, 383), hot: 0, sw: r.range(0, 6.28) });
    // the night sky, two screens tall so it can slide down forever: the
    // bands, and the Milky Way crossing it (a dusty diagonal of tiny stars)
    const SH = BG_H * 2;
    const [sky, sctx] = makeCanvas(384, SH);
    sctx.drawImage(gradientTexture(['#0B0B14', '#1B1733', '#3A2B5C', '#1B1733', '#0B0B14'], SH), 0, 0);
    const way = sctx.getImageData(0, 0, 384, SH);
    const put = (x: number, y: number, c: [number, number, number], a: number) => {
      const i = (((y % SH) + SH) % SH * 384 + x) * 4;
      way.data[i] = Math.round(way.data[i] + (c[0] - way.data[i]) * a);
      way.data[i + 1] = Math.round(way.data[i + 1] + (c[1] - way.data[i + 1]) * a);
      way.data[i + 2] = Math.round(way.data[i + 2] + (c[2] - way.data[i + 2]) * a);
    };
    for (let x = 0; x < 384; x++)
      for (let y = 0; y < SH; y++) {
        const cy = 60 + x * 0.42;
        let d = y - cy;
        d = ((d % SH) + SH * 1.5) % SH - SH / 2;
        const k = Math.max(0, 1 - Math.abs(d) / 26);
        if (k <= 0) continue;
        const n = hash2(x, y, 71);
        if (BAYER4[y & 3][x & 3] < k * 7) put(x, y, [0x5b, 0x4a, 0x7a], 0.35 * k);
        if (n < 0.05 * k) put(x, y, [0xe8, 0xe4, 0xf0], 0.5 + 0.5 * k);
        else if (n < 0.1 * k) put(x, y, [0x8e, 0x95, 0xc8], 0.6);
      }
    sctx.putImageData(way, 0, 0);
    this.sky = sky;
    // the far ranges and the top of 星見の丘 where it stands
    this.ranges = ridgeTile('boss_ranges', 40, (x) => loopHeight(x, 18, [[9, 1, 2.6], [4, 3, 0.8], [2, 7, 1.9]]), '#1B1733', { rim: '#5B4A7A', rimA: 0.55, seed: 72 });
    this.hill = ridgeTile('boss_hill', 26, (x) => loopHeight(x, 12, [[5, 1, 4.4], [2, 4, 1.2]]), '#0B0B14', { rim: '#3A2B5C', rimA: 1, trees: 0.05, treeH: 8, seed: 73 });
    // two utility poles at the edges carry the five wires (crossarms, insulators)
    const [p, pctx] = makeCanvas(384, BG_H);
    for (const px of [30, 352]) {
      pctx.fillStyle = '#141028';
      pctx.fillRect(px - 1, 30, 3, BG_H - 30);
      pctx.fillStyle = '#2A2440';
      pctx.fillRect(px - 1, 30, 1, BG_H - 30);
      for (let i = 0; i < 5; i++) {
        const y = 40 + i * 8;
        if (i % 2 === 0) {
          pctx.fillStyle = '#141028';
          pctx.fillRect(px - 9, y + 1, 19, 2);
          pctx.fillStyle = '#2A2440';
          pctx.fillRect(px - 9, y + 1, 19, 1);
        }
        // the white insulator
        pctx.fillStyle = '#8E95A6';
        pctx.fillRect(px - 7 + (i % 2) * 12, y - 1, 2, 2);
      }
      // a step bolt now and then
      pctx.fillStyle = '#2A2440';
      for (let y = 80; y < BG_H; y += 9) pctx.fillRect(px + (y % 18 ? 2 : -2), y, 1, 1);
    }
    this.poles = p;
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
    // five sagging wires, the poles at x30 and x352 (beyond them, the next span)
    const span = x < 30 ? (x + 322 - 352 + 384) / 322 : x > 352 ? (x - 352) / 322 : (x - 30) / 322;
    return 40 + i * 8 + Math.round(4 * Math.sin(Math.max(0, Math.min(1, span)) * Math.PI));
  }

  protected paintL0(ctx: CanvasRenderingContext2D, t: number): void {
    const f = this.flags;
    const SH = BG_H * 2;
    // the sky slides down, 4px a second
    const off = Math.floor(t * 4) % SH;
    ctx.drawImage(this.sky, 0, off - SH);
    ctx.drawImage(this.sky, 0, off);
    drawStars(ctx, this.stars, t);
    // the morning star low in the east: it does not twinkle (3×3 from phase 2)
    ctx.fillStyle = '#FFF6D8';
    if ((f.phase2 ?? 0) > 0) ctx.fillRect(343, 117, 3, 3);
    else ctx.fillRect(344, 118, 2, 2);
    ctx.globalAlpha = 0.25;
    ctx.fillRect(342, 118, 1, 2);
    ctx.fillRect(347, 118, 1, 2);
    ctx.globalAlpha = 1;
    drawLoop(ctx, this.ranges, 0, 104);
    if ((f.light ?? 0) > 0) tomatoBand(ctx, 96, t);
    drawLoop(ctx, this.hill, 0, 126);
  }

  protected paintL1(ctx: CanvasRenderingContext2D, t: number): void {
    ctx.drawImage(this.poles, 0, 0);
    for (let i = 0; i < 5; i++) for (let x = 0; x < 384; x++) {
      ctx.fillStyle = '#3A2B5C';
      ctx.fillRect(x, this.wireY(i, x), 1, 1);
    }
    for (const tg of this.tags) {
      const x = Math.round(tg.x);
      // hung from the wire by a thread, swaying a little
      const wy = this.wireY(tg.wire, x + 5);
      const sway = this.tagSpeed < 1 ? 0 : Math.round(Math.sin(t * 2 + tg.sw));
      const y = wy + 2;
      const fade = x > 360 ? Math.max(0, (384 - x) / 24) : 1;
      ctx.globalAlpha = (tg.hot > 0 ? 1 : 0.75) * fade;
      ctx.fillStyle = '#9AA0A8';
      ctx.fillRect(x + 5, wy, 1, 2);
      ctx.fillStyle = tg.hot > 0 ? '#FFFFFF' : '#F4F1E8';
      ctx.fillRect(x + sway, y, 10, 6);
      ctx.fillStyle = '#C8C2B4';
      ctx.fillRect(x + sway, y + 5, 10, 1);
      ctx.fillStyle = '#9AA0A8';
      ctx.fillRect(x + sway + 2, y + 2, 6, 1);
      ctx.fillRect(x + sway + 2, y + 4, 4, 1);
      if (tg.hot > 0) {
        ctx.fillStyle = '#FFE7A3';
        ctx.fillRect(x + sway - 1, y - 1, 12, 1);
        ctx.fillRect(x + sway - 1, y + 6, 12, 1);
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
