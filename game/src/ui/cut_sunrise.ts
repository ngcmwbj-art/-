// 1枚絵 cut_h_sunrise (52_ch2_level_art 12.2, 50_ch2_story 10.16 カット1,
// 53_ch2_audio 12.14): the sunrise at the end of chapter 2. The mountains
// and the sky seen over the east fence of 星見の丘 — the title screen in a
// mirror: there the two on the bridge watch the sun go down in the west,
// here the two on the hill watch it come up in the east.
//
//   const cut = yield* openSunriseCut();   // out of the dark (2 s): the sky before dawn
//   yield* morningChime(...);              // (the caller: the chime, the music)
//   yield* cut.rise();                     // the tomato leaves the net and climbs to the
//                                          // ridge; the はなまる sun comes up there, the
//                                          // dawn spreads from the east, the morning star
//                                          // melts into it (about 7 s)
//   yield* say('夕焼けを ためこんだ トマトが、\n朝焼けに なった。', { voice: 'narr' });
//   yield* cut.close();                    // holds 1.5 s, cross-fades back (0.8 s)
//
// The cut plays the picture's own two sounds (se_h_tomato_rise when the
// tomato floats up, se_h_sunrise when it reaches the ridge); the music and
// the ambience are the caller's (53 12.14).

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { BAYER4, PixelCanvas } from '../engine/pixel';
import { hash2 } from '../engine/rng';
import { ease } from '../engine/tween';
import { sfx } from '../audio';
import { tomatoIcon } from './icons';

const W = 384;
const H = 216;
/** Where the sun comes up: a notch in the ridge. */
const SUN = { x: 232, y: 138 };
/** The morning star (does not twinkle). */
const STAR = { x: 250, y: 70 };
/** The tomato in the net over Minato's shoulder. */
const NET = { x: 126, y: 164 };
/** The sky's steps: before dawn and after (top → horizon at y140). */
const SKY_PRE = ['#1B1733', '#221C3E', '#2A2248', '#3A2B5C', '#5A4480', '#7A5AA0'];
const SKY_DAWN = ['#7A5AA0', '#A07098', '#D8948A', '#F7C27A', '#FFD9A0', '#FFE7A3'];
const DAWN_STEPS = 16;
/** Wisps of morning mist over the valley (x, y, length). */
const MIST: [number, number, number][] = [
  [10, 166, 70],
  [120, 170, 96],
  [236, 164, 60],
  [300, 172, 84],
  [60, 176, 54],
];
/** Faint stars still up before the dawn (they fade as it spreads). */
const PRE_STARS: [number, number][] = [
  [22, 12],
  [64, 30],
  [98, 8],
  [150, 22],
  [180, 6],
  [300, 16],
  [338, 34],
  [366, 10],
  [120, 46],
  [276, 50],
];

const dith = (x: number, y: number, v: number) => BAYER4[y & 3][x & 3] < v * 16;

/** The ridge of the far mountains (110–150) with the notch the sun comes up in. */
function ridge(x: number): number {
  const y = 124 + Math.sin(x / 37 + 0.4) * 7 + Math.sin(x / 13 + 2) * 2 + (hash2(x >> 2, 0, 29) - 0.5) * 2;
  // a saddle between two shoulders where the sun comes up
  const bump = Math.exp(-Math.pow((x - SUN.x) / 16, 2));
  return Math.round(Math.min(y + (SUN.y - y) * bump, 146));
}

/** The sky at dawn progress `k` (0..1): the morning spreads from the sun's notch outward, step by step. */
function skyFrame(k: number): HTMLCanvasElement {
  const p = new PixelCanvas(W, 150);
  const front = k * 520;
  for (let y = 0; y < 150; y++) {
    const v = Math.min(1, y / 140) * (SKY_PRE.length - 1);
    const i = Math.min(SKY_PRE.length - 2, Math.floor(v));
    const f = v - i;
    for (let x = 0; x < W; x++) {
      const band = f > 0.6 && dith(x, y, (f - 0.6) / 0.4) ? i + 1 : i;
      const dist = Math.hypot(x - SUN.x, (y - SUN.y) * 1.5);
      const local = Math.max(0, Math.min(1, (front - dist) / 70));
      const pal = local > 0 && dith(x, y, local) ? SKY_DAWN : SKY_PRE;
      p.set(x, y, pal[band]);
    }
  }
  return p.toCanvas();
}

const skies: HTMLCanvasElement[] = [];
function skyAt(k: number): HTMLCanvasElement {
  while (skies.length <= DAWN_STEPS) skies.push(skyFrame(skies.length / DAWN_STEPS));
  return skies[Math.max(0, Math.min(DAWN_STEPS, Math.round(k * DAWN_STEPS)))];
}

/**
 * Build the picture a piece at a time before it is needed (the HUD calls it
 * on 星見の丘): the layers, then one step of the dawn per call. True when
 * everything is ready.
 */
export function prepareSunrise(): boolean {
  if (!layers) {
    layers = buildLayers();
    return false;
  }
  if (skies.length <= DAWN_STEPS) {
    skies.push(skyFrame(skies.length / DAWN_STEPS));
    return false;
  }
  return true;
}

const CLOUDS = [
  { x: 40, y: 44, len: 120, th: 4, seed: 11 },
  { x: 214, y: 30, len: 96, th: 3, seed: 12 },
  { x: 268, y: 92, len: 84, th: 3, seed: 13 },
];

/** A long thin cloud; `lit` 0..1 lights its lower edge (#F2894B) once the sun is up. */
function drawCloud(g: Gfx, c: (typeof CLOUDS)[number], dawn: number, lit: number): void {
  const body = dawn > 0.5 ? '#C88AA0' : '#3A2F5C';
  const top = dawn > 0.5 ? '#E8B0B0' : '#4A3E6E';
  for (let x = 0; x < c.len; x++) {
    const u = x / c.len;
    const h = Math.max(0, Math.round(c.th * Math.sin(Math.PI * u) + (hash2(x >> 3, 0, c.seed) - 0.5) * 1.6));
    if (h <= 0) continue;
    const y0 = c.y + c.th + 1 - h;
    for (let y = y0; y <= c.y + c.th; y++) g.px(c.x + x, y, y === y0 ? top : body);
    // the lower edge: violet before, lit orange after the sunrise (it spreads from the sun's side)
    const reach = lit * 1.4 - Math.abs(c.x + x - SUN.x) / 300;
    g.px(c.x + x, c.y + c.th + 1, reach > 0 && dith(c.x + x, c.y, Math.min(1, reach * 2)) ? '#F2894B' : dawn > 0.5 ? '#A07098' : '#2A2248');
  }
}

let sunC: HTMLCanvasElement | null = null;
/**
 * はなまるの朝日: a #FFE7A3 core, twelve #FFD23F petals (the title's sun in
 * 朱 has the same scalloped rim), lit from the lower right this time.
 */
function sunCanvas(): HTMLCanvasElement {
  if (sunC) return sunC;
  const S = 56;
  const cx = S / 2;
  const p = new PixelCanvas(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - cx;
      const dy = y + 0.5 - cx;
      const a = Math.atan2(dy, dx);
      const d = Math.hypot(dx, dy);
      const R = 19 + 4 * Math.sqrt(Math.abs(Math.cos(a * 6)));
      if (d > R) continue;
      let col = d < 13 ? '#FFE7A3' : d < 16 && dith(x, y, (16 - d) / 3) ? '#FFE7A3' : '#FFD23F';
      if (d > R - 1.2) col = dx + dy > 0 ? '#F2A33A' : '#FFE9A8';
      p.set(x, y, col);
    }
  sunC = p.toCanvas();
  return sunC;
}

/** The red-pen swirl inside the sun (2 turns). */
function drawSwirl(g: Gfx, cx: number, cy: number, rot: number): void {
  let px = -999;
  let py = -999;
  for (let i = 0; i <= 180; i++) {
    const t = i / 180;
    const a = rot + t * Math.PI * 2 * 2;
    const r = 2 + t * 13;
    const x = Math.round(cx + Math.cos(a) * r);
    const y = Math.round(cy + Math.sin(a) * r);
    if (x === px && y === py) continue;
    g.px(x, y, '#F2894B');
    px = x;
    py = y;
  }
}

interface Layers {
  far: HTMLCanvasElement;
  farLit: HTMLCanvasElement;
  mid: HTMLCanvasElement;
  near: HTMLCanvasElement;
  rim: HTMLCanvasElement;
}

let layers: Layers | null = null;

/** Mountains, the valley (cedar tops, the barn's roof far below), the hill's fence and the two from behind. */
function buildLayers(): Layers {
  // far mountains (#3A2B5C) and a copy with their ridge lit near the sun
  const far = new PixelCanvas(W, H);
  const farLit = new PixelCanvas(W, H);
  for (let x = 0; x < W; x++) {
    const top = ridge(x);
    for (let y = top; y < 160; y++) {
      far.set(x, y, '#3A2B5C');
      farLit.set(x, y, '#3A2B5C');
    }
    far.set(x, top, '#4A3868');
    const d = Math.abs(x - SUN.x);
    farLit.set(x, top, d < 90 && dith(x, top, 1 - d / 90) ? '#F7C27A' : '#5A4478');
    if (d < 40 && dith(x, top + 1, 1 - d / 40)) farLit.set(x, top + 1, '#8A5A80');
  }
  // the valley: the cedar tops in a row, the barn's ridge vent far below, the mist over the fields
  const mid = new PixelCanvas(W, H);
  for (let x = 0; x < W; x++) {
    const pointed = hash2(x >> 2, 0, 33) < 0.6;
    const top = 146 + Math.round((pointed ? 5 : 3) * Math.abs(Math.sin(x / (pointed ? 2.4 : 5) + hash2(x >> 2, 1, 33) * 3)) + 3 * hash2(x >> 3, 2, 33));
    for (let y = top; y < H; y++) mid.set(x, y, y < 184 ? '#2A2440' : y < 196 && dith(x, y, (196 - y) / 12) ? '#2A2440' : '#221C3A');
    if (hash2(x, 3, 33) < 0.3) mid.set(x, top, '#3A3258');
  }
  // down in the valley: the barn's long roof and its 越屋根, two farmhouse roofs
  for (let j = 0; j < 5; j++) for (let x = 256 + j * 2; x < 326 - j * 2; x++) mid.set(x, 168 - j, j === 4 ? '#3A3258' : '#231D38');
  for (let x = 268; x < 314; x++) {
    mid.set(x, 162, '#3A3258');
    mid.set(x, 163, '#1A1630');
  }
  for (const [hx, hw] of [
    [196, 16],
    [344, 14],
  ]) {
    for (let j = 0; j < 4; j++) for (let i = j; i < hw - j; i++) mid.set(hx + i, 166 - j, j === 3 ? '#3A3258' : '#231D38');
  }
  // the hill: the fence of two log rails behind them, the ground they stand on, and the two from behind
  const near = new PixelCanvas(W, H);
  const fence = '#231D3A';
  for (let x = 0; x < W; x++) {
    for (const y of [178, 179, 188, 189]) near.set(x, y, fence);
    if (hash2(x, 9, 37) < 0.2) near.set(x, 178, '#2E2748');
  }
  for (let x = 10; x < W; x += 44) for (let y = 173; y < 206; y++) for (let i = 0; i < 3; i++) near.set(x + i, y, fence);
  const col = '#141026';
  for (let x = 0; x < W; x++) {
    const top = 203 + Math.round(Math.sin(x / 30) * 1.5 + hash2(x >> 1, 0, 37) * 2);
    for (let y = top; y < H; y++) near.set(x, y, col);
    // grass tufts along the edge
    if (hash2(x, 1, 37) < 0.4) near.set(x, top - 1, col);
    if (hash2(x, 2, 37) < 0.15) near.set(x, top - 2, col);
  }
  // Minato (the net over his shoulder, empty now) and Kanenari (the bell), from behind
  const who = new PixelCanvas(W, H);
  const fy = 206;
  const mx = 146;
  who.ellipse(mx + 0.5, fy - 25, 5.5, 6, col);
  who.rect(mx - 4, fy - 31, 9, 2, col);
  for (const [px, py] of [
    [-3, -33],
    [-2, -32],
    [2, -33],
    [4, -32],
  ])
    who.set(mx + px, fy + py, col);
  who.rect(mx - 2, fy - 20, 5, 2, col);
  who.rect(mx - 6, fy - 18, 13, 11, col);
  who.rect(mx - 8, fy - 17, 2, 7, col);
  who.rect(mx + 7, fy - 17, 2, 7, col);
  who.rect(mx - 5, fy - 7, 11, 7, col);
  for (let k = 0; k < 22; k++) {
    who.set(mx - 6 - Math.floor(k * 0.5), fy - 15 - k, col);
    who.set(mx - 5 - Math.floor(k * 0.5), fy - 15 - k, col);
  }
  who.ring(mx - 20, fy - 41, 6, 4.5, col);
  who.ring(mx - 20, fy - 41, 5, 3.5, col);
  for (let y = -3; y <= 5; y++) for (let x = -4; x <= 3; x++) if ((x + y) % 2 === 0 && x * x + (y - 1) * (y - 1) < 20) who.set(mx - 21 + x, fy - 36 + y, col);
  const kx = 168;
  for (let y = fy - 40; y <= fy - 19; y++) {
    const u = (y - (fy - 40)) / 21;
    const half = u < 0.3 ? Math.sqrt(Math.max(0, 1 - Math.pow((0.3 - u) / 0.3, 2))) * 6.5 : 6.5 + Math.pow((u - 0.3) / 0.7, 1.6) * 6;
    for (let x = Math.round(kx - half); x <= Math.round(kx + half); x++) who.set(x, y, col);
  }
  who.rect(kx - 13, fy - 20, 27, 2, col);
  who.ring(kx + 0.5, fy - 43, 2.5, 2.5, col);
  who.rect(kx - 9, fy - 18, 19, 13, col);
  who.rect(kx - 11, fy - 16, 3, 8, col);
  who.rect(kx + 9, fy - 16, 3, 8, col);
  who.rect(kx - 8, fy - 5, 17, 5, col);
  // the morning rim: 1 px of #F7C27A on the right edges of the two (the sun is on their right)
  near.blit(who, 0, 0);
  const rim = new PixelCanvas(W, H);
  for (let y = fy - 48; y < 203; y++)
    for (let x = 116; x < 186; x++) {
      if (!who.alpha(x, y) || who.alpha(x + 1, y)) continue;
      rim.set(x, y, '#F7C27A');
    }
  return { far: far.toCanvas(), farLit: farLit.toCanvas(), mid: mid.toCanvas(), near: near.toCanvas(), rim: rim.toCanvas() };
}

class SunriseScene implements Scene {
  transparent = true;
  done = false;
  t = 0;
  /** Whole-picture alpha (the cross-fades). */
  alpha = 0;
  /** ms since the tomato started to float (-1: still in the net). */
  riseT = -1;
  /** ms since the sun started to come up (-1: not yet). */
  sunT = -1;
  private trail: { x: number; y: number; t: number }[] = [];
  private swirl = 0;

  update(dt: number): void {
    this.t += dt;
    if (this.riseT >= 0) this.riseT += dt;
    if (this.sunT >= 0) this.sunT += dt;
    this.swirl += (dt / 20000) * Math.PI * 2;
  }

  /** Where the tomato is, and how big (px), at the rise's time. */
  tomatoAt(rt: number): { x: number; y: number; s: number } {
    if (rt < 0) return { x: NET.x, y: NET.y, s: 11 };
    if (rt < 800) return { x: NET.x, y: NET.y - Math.round(ease.quadOut(rt / 800) * 4), s: 11 };
    // out of the net and up a gentle arc to the notch in the ridge (3.0 s), smaller as it goes
    const k = Math.min(1, (rt - 800) / 3000);
    const e = ease.sineInOut(k);
    const x0 = NET.x;
    const y0 = NET.y - 4;
    const x = x0 + (SUN.x - x0) * e;
    const y = y0 + (SUN.y - 4 - y0) * e - Math.sin(e * Math.PI) * 58;
    return { x, y, s: 11 - 8 * e };
  }

  draw(g: Gfx): void {
    if (this.alpha <= 0) return;
    const L = (layers ??= buildLayers());
    g.alpha(this.alpha, () => {
      const dawn = this.sunT < 0 ? 0 : Math.min(1, this.sunT / 3000);
      const sunUp = this.sunT < 0 ? 0 : Math.min(1, this.sunT / 2000);
      g.img(skyAt(dawn), 0, 0);
      // the sun's halo, then the sun itself coming up out of the notch (behind the ridge)
      if (sunUp > 0) {
        const cy = Math.round(SUN.y + 30 - ease.cubicOut(sunUp) * 30);
        for (const [r, a] of [
          [46, 0.12],
          [34, 0.18],
          [26, 0.26],
        ] as [number, number][])
          g.alpha(a * sunUp, () => g.circle(SUN.x, cy, r, '#FFE7A3'));
        const img = sunCanvas();
        g.img(img, SUN.x - img.width / 2, cy - img.height / 2);
        drawSwirl(g, SUN.x, cy, this.swirl);
      }
      for (const c of CLOUDS) drawCloud(g, c, dawn, dawn);
      // the last faint stars fade as the light spreads
      const fade = 1 - dawn * 1.6;
      if (fade > 0)
        for (const [i, [sx, sy]] of PRE_STARS.entries()) {
          const tw = Math.floor(this.t / (600 + i * 70)) % 4 !== 0;
          g.alpha(fade, () => g.px(sx, sy, tw ? '#C8C2E0' : '#6A5A8E'));
        }
      // the morning star melts into the light, not twinkling (2 s)
      const starA = this.sunT < 0 ? 1 : Math.max(0, 1 - this.sunT / 2000);
      if (starA > 0) g.alpha(starA, () => g.rect(STAR.x, STAR.y, 2, 2, '#FFF6D8'));
      g.img(L.far, 0, 0);
      if (dawn > 0) g.alpha(dawn, () => g.img(L.farLit, 0, 0));
      g.img(L.mid, 0, 0);
      // a morning mist over the valley once the light is up
      if (dawn > 0)
        g.alpha(0.22 * dawn, () => {
          for (const [wx, wy, ww] of MIST) {
            const dx = wx + Math.round(Math.sin(this.t / 3000 + wx) * 2);
            g.rect(dx, wy, ww, 1, '#F2C8B8');
            g.rect(dx + Math.round(ww * 0.2), wy + 1, Math.round(ww * 0.55), 1, '#F2C8B8');
            g.rect(dx - 6, wy + 1, 4, 1, '#F2C8B8');
          }
        });
      g.img(L.near, 0, 0);
      if (dawn > 0) g.alpha(dawn, () => g.img(L.rim, 0, 0));
      this.drawTomato(g);
    });
  }

  private drawTomato(g: Gfx): void {
    const rt = this.riseT;
    // gone into the sun
    if (rt >= 3800) return;
    const p = this.tomatoAt(rt);
    // the trail of #FFE7A3 points behind it
    if (rt >= 800) {
      this.trail.push({ x: Math.round(p.x), y: Math.round(p.y), t: this.t });
      this.trail = this.trail.filter((q) => this.t - q.t < 600);
      for (const q of this.trail) {
        const a = 1 - (this.t - q.t) / 600;
        if (hash2(q.x, q.y, 5) < 0.6) g.alpha(a, () => g.px(q.x, q.y, '#FFE7A3'));
      }
    }
    // a stepped glow round it (0.8 Hz, like the lantern in the field)
    const glow = 1 + 0.15 * Math.sin((this.t / 1000) * Math.PI * 2 * 0.8);
    const cx = Math.round(p.x);
    const cy = Math.round(p.y);
    const r0 = Math.round(p.s * 0.5);
    for (const [dr, a, col] of [
      [8, 0.08, '#F2894B'],
      [5, 0.12, '#F2894B'],
      [3, 0.18, '#FFB27A'],
    ] as [number, number, string][])
      g.alpha(a * glow, () => g.circle(cx, cy, r0 + dr, col));
    const icon = tomatoIcon('lit');
    const s = Math.max(3, Math.round(p.s + 1));
    g.ctx.drawImage(icon, Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    // still in the net: the netting over its lower half
    if (rt < 900) {
      const lift = rt < 0 ? 0 : Math.round(ease.quadOut(Math.min(1, rt / 800)) * 4);
      g.alpha(Math.max(0, 1 - Math.max(0, rt - 500) / 400) * 0.75, () => {
        for (let y = 0; y <= 5; y++)
          for (let x = -4; x <= 4; x++) if ((x + y) % 2 === 0 && x * x + y * y < 22) g.px(NET.x + x, NET.y + 1 + y + (y < 2 ? 0 : 0) - 0 * lift, '#141026');
      });
    }
  }
}

export interface SunriseCut {
  /** The tomato floats up out of the net and climbs to the ridge; the sun comes up; the dawn spreads. */
  rise(): Co;
  /** Hold `holdMs`, then cross-fade back to the field (0.8 s). */
  close(holdMs?: number): Co;
}

/**
 * Put up cut_h_sunrise: it comes out of the dark (or cross-fades over the
 * field) in `fadeMs` (default 2 s: 暗転から夜明け前の青へ), the sky before
 * the dawn, the tomato glowing in the net.
 */
export function* openSunriseCut(o: { fadeMs?: number } = {}): Co<SunriseCut> {
  layers ??= buildLayers();
  skyAt(0);
  const sc = new SunriseScene();
  game.push(sc);
  const ms = o.fadeMs ?? 2000;
  for (let t = 0; t < ms; t += 16.7) {
    sc.alpha = t / ms;
    yield null;
  }
  sc.alpha = 1;
  // the dawn frames are built while the chime plays
  skyAt(1);
  return {
    *rise(): Co {
      sc.riseT = 0;
      sfx('se_h_tomato_rise');
      yield () => sc.riseT >= 3800;
      sc.sunT = 0;
      sfx('se_h_sunrise');
      yield () => sc.sunT >= 3000;
    },
    *close(holdMs = 1500): Co {
      yield holdMs;
      for (let t = 0; t < 800; t += 16.7) {
        sc.alpha = 1 - t / 800;
        yield null;
      }
      sc.alpha = 0;
      const i = game.scenes.indexOf(sc);
      if (i >= 0) game.scenes.splice(i, 1);
      sc.done = true;
    },
  };
}

/** The whole cut in one go (`between` runs once it is up: the chime). */
export function* playSunriseCut(o: { between?: () => Co; hold?: number } = {}): Co {
  const cut = yield* openSunriseCut();
  if (o.between) yield* o.between();
  yield* cut.rise();
  yield* cut.close(o.hold);
}

/** QA: a still of the picture at a moment (0: before, 1: the tomato climbing, 2: the sun up). */
export function sunriseStill(phase: 0 | 1 | 2): Scene {
  layers ??= buildLayers();
  const sc = new SunriseScene();
  sc.alpha = 1;
  sc.transparent = false;
  if (phase >= 1) sc.riseT = phase === 1 ? 2300 : 3800;
  if (phase === 2) sc.sunT = 3200;
  return sc;
}
