// ヨビモドシ (128×160, 51 10.9): the village's outdoor disaster-radio
// loudspeaker on 星見の丘 — a concrete pole with its brass-less nameplate,
// the grey control box (「制御盤」 in two white lines, a handle, vent slits),
// the red lamp that is its eye (the point of light inside it moves to look at
// you), the flange of the neck, the bracket, and four horn speakers facing
// the four directions: the south one's round mouth is its face; east and
// west flare out sideways; the north one faces away, only its rim showing.
// A thin antenna with a speck of light on top.
//
// Two forms. Dark: a #0B0B14 silhouette with a 1px #1B1733 edge and a faint
// starlit top edge — only the red lamp and a 1px glint deep in each whole
// horn's mouth can be seen (each glint breathes every 2–4s). Lit (the
// はなまるトマト held up): full colour, lit from below by the lantern — warm
// on every face turned down, violet on the ones turned up. The change is a
// 4×4 Bayer dither sweeping up (300ms, lighting) or down (400ms, going dark).
// A broken horn droops (a pre-drawn frame, no rotation), its glint out, a
// small みました seal left on it.
//
// Driven by the battle through EnemyView.params: light, lightDir, lampX,
// lampOff, intro, mouthOn_<k>, mouthPulse_<k>, shake_<k>, droopAt_<k>,
// shutterAt, finale, hl; and flags.broken_<k>.

import type { Gfx } from '../../engine/gfx';
import { BAYER4, makeCanvas, PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { ovalStamp } from '../../battle/art/stamps';
import { registerEnemyArt, type EnemyArt, type EnemyView } from './index';
import { Mask, mixU32, shade, type Ramp } from './lib';

const SW = 128;
const SH = 160;
const OX = 8;
const OY = 6;
const W = SW + OX * 2;
const H = SH + OY + 4;

type K = 'east' | 'west' | 'south' | 'north';
const KEYS: K[] = ['east', 'west', 'south', 'north'];

/** Lit from below by the lantern (51 10.9). */
const UNDER: [number, number, number] = [-0.25, 0.78, 0.58];

const HORN: Ramp = ['#4A4F68', '#5B5F7A', '#6B7186', '#8E95A6', '#AEB4C4', '#C8CDD4', '#E8ECF0'];
const GREY: Ramp = ['#3A3F58', '#4A4F68', '#6B7186', '#8E95A6', '#A6ACBC', '#B8BECC'];
const CONC: Ramp = ['#3E4158', '#565A70', '#6B7186', '#80879A', '#9AA0A8', '#B4B8C0'];

function ushade(p: PixelCanvas, m: Mask, ramp: Ramp, o: Parameters<typeof shade>[3] = {}): void {
  shade(p, m, ramp, { light: UNDER, gradDir: [0, 1], grad: 0.25, ...o });
}

// ---- geometry of the horns -------------------------------------------------------------------

interface HornGeo {
  /** Throat (at the bracket) and mouth centres, sprite coords. */
  tx: number;
  ty: number;
  mx: number;
  my: number;
  /** Mouth radii across / along the view (the ellipse we see). */
  rx: number;
  ry: number;
  /** Throat radius. */
  r0: number;
  /** Is the mouth's inside visible (south / sides) or only the rim's back (north)? */
  inside: 'full' | 'side' | 'back' | 'top';
}

function hornGeo(k: K, droop: boolean): HornGeo {
  switch (k) {
    case 'west':
      return droop ? { tx: 50, ty: 30, mx: 12, my: 44, rx: 6, ry: 10, r0: 4, inside: 'top' } : { tx: 50, ty: 30, mx: 7, my: 30, rx: 7, ry: 12, r0: 4, inside: 'side' };
    case 'east':
      return droop ? { tx: 78, ty: 30, mx: 116, my: 44, rx: 6, ry: 10, r0: 4, inside: 'top' } : { tx: 78, ty: 30, mx: 121, my: 30, rx: 7, ry: 12, r0: 4, inside: 'side' };
    case 'south':
      return droop ? { tx: 64, ty: 32, mx: 64, my: 50, rx: 14, ry: 6, r0: 5, inside: 'top' } : { tx: 64, ty: 36, mx: 64, my: 41, rx: 15, ry: 13, r0: 5, inside: 'full' };
    case 'north':
      return droop ? { tx: 64, ty: 26, mx: 64, my: 16, rx: 17, ry: 4, r0: 4, inside: 'back' } : { tx: 64, ty: 26, mx: 64, my: 11, rx: 20, ry: 5, r0: 4, inside: 'back' };
  }
}

/** The horn's body mask (a flaring cone of ellipses from the throat to the mouth). */
function hornMask(g: HornGeo): Mask {
  const m = new Mask(W, H);
  const n = 26;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const f = Math.pow(t, 2.1);
    const cx = g.tx + (g.mx - g.tx) * t;
    const cy = g.ty + (g.my - g.ty) * t;
    const rx = g.r0 + (g.rx - g.r0) * f;
    const ry = g.r0 + (g.ry - g.r0) * f;
    m.ellipse(cx + OX, cy + OY, Math.max(1.5, rx), Math.max(1.5, ry));
  }
  return m;
}

/** Paint one horn (lit) into p; returns its mask. */
function paintHorn(p: PixelCanvas, k: K, droop: boolean): Mask {
  const g = hornGeo(k, droop);
  const m = hornMask(g);
  ushade(p, m, HORN, { mode: 'bevel', bevel: 4, base: 0.52, k: 0.75, dither: 0.4 });
  const MX = g.mx + OX;
  const MY = g.my + OY;
  // ribs: two bands round the bell
  for (const t of [0.45, 0.72]) {
    const f = Math.pow(t, 2.1);
    const cx = g.tx + (g.mx - g.tx) * t + OX;
    const cy = g.ty + (g.my - g.ty) * t + OY;
    const rx = g.r0 + (g.rx - g.r0) * f;
    const ry = g.r0 + (g.ry - g.r0) * f;
    const horiz = Math.abs(g.mx - g.tx) > Math.abs(g.my - g.ty);
    if (horiz) for (let y = Math.round(cy - ry); y <= Math.round(cy + ry); y++) p.set(Math.round(cx), y, '#9AA0A8');
    else for (let x = Math.round(cx - rx); x <= Math.round(cx + rx); x++) if (m.in(x, Math.round(cy))) p.set(x, Math.round(cy), '#9AA0A8');
  }
  if (g.inside === 'full') {
    // facing us: a lit rim, the dark throat going back into the pole
    const inner = new Mask(W, H).ellipse(MX, MY, g.rx - 3, g.ry - 3);
    inner.each((x, y) => {
      const d = ((x - MX) / (g.rx - 3)) ** 2 + ((y - MY) / (g.ry - 3)) ** 2;
      p.set(x, y, d > 0.55 ? '#3A3456' : d > 0.25 ? '#2A2440' : '#1B1733');
    });
    // the grille's rings
    for (let a = 0; a < 40; a++) {
      const an = (a / 40) * Math.PI * 2;
      p.set(Math.round(MX + Math.cos(an) * (g.rx - 6)), Math.round(MY + Math.sin(an) * (g.ry - 6)), '#3A3456');
    }
    p.rect(MX - 1, MY - 1, 3, 3, '#0B0B14');
    // the lower lip catches the lantern
    for (let a = 10; a < 30; a++) {
      const an = (a / 40) * Math.PI * 2;
      p.set(Math.round(MX + Math.cos(an) * (g.rx - 1)), Math.round(MY + Math.sin(an) * (g.ry - 1)), '#F7C27A');
    }
  } else if (g.inside === 'side') {
    // seen from the side: the mouth an upright ellipse, dark inside, rim bright
    const dir = Math.sign(g.mx - g.tx);
    const inner = new Mask(W, H).ellipse(MX + dir, MY, Math.max(1, g.rx - 3), g.ry - 2);
    inner.each((x, y) => p.set(x, y, (x - MX) * dir > 1 ? '#1B1733' : '#2A2440'));
    for (let y = MY - g.ry + 1; y <= MY + g.ry - 1; y++) {
      const hw = Math.round(g.rx * Math.sqrt(Math.max(0, 1 - ((y - MY) / g.ry) ** 2)));
      p.set(MX - dir * hw, y, y > MY ? '#F7C27A' : '#E8ECF0');
    }
  } else if (g.inside === 'top') {
    // a drooped horn: we look at the top of its bell, the mouth turned to the ground
    for (let x = MX - g.rx; x <= MX + g.rx; x++) {
      const y = Math.round(MY + g.ry * Math.sqrt(Math.max(0, 1 - ((x - MX) / g.rx) ** 2)));
      p.set(x, y, '#2A2440');
      p.set(x, y - 1, '#6B7186');
    }
  } else {
    // facing away: only the rim of the far side peeks over the top
    for (let x = MX - g.rx + 1; x <= MX + g.rx - 1; x++) {
      const y = Math.round(MY - g.ry * Math.sqrt(Math.max(0, 1 - ((x - MX) / g.rx) ** 2)));
      p.set(x, y, '#E8ECF0');
      p.set(x, y + 1, '#2A2440');
      if (Math.abs(x - MX) < g.rx - 4) p.set(x, y + 2, '#3A3456');
    }
  }
  return m;
}

/** Where each horn's glint (deep in its mouth) sits, sprite coords. */
function glintAt(k: K): [number, number] {
  const g = hornGeo(k, false);
  if (k === 'south') return [g.mx, g.my];
  if (k === 'north') return [g.mx, g.my - g.ry + 2];
  return [g.mx + Math.sign(g.mx - g.tx) * 1, g.my];
}

// ---- the body --------------------------------------------------------------------------------

function paintBody(p: PixelCanvas): Mask {
  const all = new Mask(W, H);
  const X = (v: number) => v + OX;
  const Y = (v: number) => v + OY;
  // antenna
  const ant = new Mask(W, H).rect(X(62), Y(0), 2, 14);
  ushade(p, ant, CONC, { base: 0.6 });
  p.rect(X(62), Y(0), 2, 1, '#FFF6D8');
  all.or(ant);
  // the pole (concrete), the nameplate, moss
  const pole = new Mask(W, H).rect(X(52), Y(104), 24, 56);
  ushade(p, pole, CONC, { mode: 'cyl', cx: X(63), rx: 12, base: 0.5, k: 0.7, dither: 0.5 });
  pole.each((x, y) => {
    const n = hash2(x, y, 51);
    if (n < 0.03) p.set(x, y, '#5FA85A');
    else if (n < 0.05) p.set(x, y, '#565A70');
  });
  p.rect(X(56), Y(110), 16, 6, '#F4F1E8');
  p.hline(X(58), X(69), Y(112), '#2A2440');
  p.hline(X(58), X(66), Y(114), '#2A2440');
  p.set(X(57), Y(111), '#9AA0A8');
  p.set(X(70), Y(111), '#9AA0A8');
  all.or(pole);
  // the control box
  const box = new Mask(W, H).rect(X(38), Y(72), 52, 34);
  ushade(p, box, GREY, { mode: 'bevel', bevel: 3, base: 0.55, k: 0.6, dither: 0.35 });
  // its door: a frame, 「制御盤」 as two white lines, a handle, four vent slits
  for (let x = X(42); x <= X(85); x++) {
    p.set(x, Y(75), '#6B7186');
    p.set(x, Y(103), '#B8BECC');
  }
  for (let y = Y(75); y <= Y(103); y++) {
    p.set(X(42), y, '#6B7186');
    p.set(X(85), y, '#B8BECC');
  }
  p.hline(X(52), X(75), Y(80), '#F4F1E8');
  p.hline(X(55), X(72), Y(84), '#F4F1E8');
  p.rect(X(80), Y(88), 2, 7, '#3A3F58');
  p.set(X(80), Y(88), '#B8BECC');
  for (let i = 0; i < 4; i++) {
    p.hline(X(50), X(77), Y(92 + i * 3), '#4A4F68');
    p.hline(X(50), X(77), Y(93 + i * 3), '#A6ACBC');
  }
  all.or(box);
  // the lamp housing (the lamp itself is drawn live) and the neck flange
  const neck = new Mask(W, H).rect(X(56), Y(56), 16, 6);
  ushade(p, neck, CONC, { base: 0.6 });
  p.hline(X(56), X(71), Y(61), '#F7C27A');
  all.or(neck);
  const housing = new Mask(W, H).rect(X(56), Y(61), 16, 11);
  ushade(p, housing, GREY, { base: 0.45 });
  all.or(housing);
  // the pipe from the neck up into the bracket
  const pipe = new Mask(W, H).rect(X(61), Y(34), 6, 22);
  ushade(p, pipe, CONC, { mode: 'cyl', cx: X(64), rx: 3, base: 0.55 });
  all.or(pipe);
  // the bracket
  const br = new Mask(W, H).rect(X(54), Y(24), 20, 12);
  ushade(p, br, GREY, { mode: 'bevel', base: 0.55 });
  for (const [bx, by] of [[56, 26], [71, 26], [56, 33], [71, 33]] as [number, number][]) {
    p.set(X(bx), Y(by), '#6B7186');
    p.set(X(bx), Y(by) + 1, '#B8BECC');
  }
  all.or(br);
  return all;
}

// ---- building the layers ----------------------------------------------------------------------

interface Layers {
  bodyLit: HTMLCanvasElement;
  bodyDark: HTMLCanvasElement;
  horn: Record<string, { lit: HTMLCanvasElement; dark: HTMLCanvasElement; edge: HTMLCanvasElement }>;
  bodyEdge: HTMLCanvasElement;
}

/** Warm the down-facing edges, cool the up-facing ones (under-lit), then the ink edge. */
function underFinish(p: PixelCanvas): void {
  const src = p.data.slice();
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] >>> 24 !== 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      const v = src[y * W + x];
      // the upper faces sink toward #5B4A7A (the top of the sprite most)
      const top = 1 - y / H;
      let c = mixU32(v, '#5B4A7A', 0.2 * top);
      if (!on(x, y + 1)) c = mixU32(v, y > H * 0.5 ? '#F7C27A' : '#F2894B', 0.6);
      else if (!on(x - 1, y)) c = mixU32(v, '#F2894B', 0.35);
      else if (!on(x, y - 1)) c = mixU32(v, '#5B4A7A', 0.45);
      p.set(x, y, c);
    }
  p.outline('#2A2440');
}

/** The dark form: a flat silhouette, a 1px edge and starlight on the top edges. */
function darkOf(p: PixelCanvas): PixelCanvas {
  const d = new PixelCanvas(W, H);
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && p.data[y * W + x] >>> 24 !== 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      const edge = !on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1);
      const topEdge = !on(x, y - 1);
      d.set(x, y, topEdge ? mixU32(0xff33222a, '#8E95C8', 0.4) : edge ? '#1B1733' : '#0B0B14');
    }
  return d;
}

/** A 1px light ring round a mask (selection highlight). */
function edgeOf(p: PixelCanvas): HTMLCanvasElement {
  const e = new PixelCanvas(W, H);
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && p.data[y * W + x] >>> 24 !== 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (on(x, y)) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) e.set(x, y, '#FFF6D8');
    }
  return e.toCanvas();
}

let layers: Layers | null = null;
function build(): Layers {
  if (layers) return layers;
  const body = new PixelCanvas(W, H);
  paintBody(body);
  underFinish(body);
  const horn: Layers['horn'] = {};
  for (const k of KEYS)
    for (const droop of [false, true]) {
      const p = new PixelCanvas(W, H);
      paintHorn(p, k, droop);
      underFinish(p);
      horn[k + (droop ? ':d' : '')] = { lit: p.toCanvas(), dark: darkOf(p).toCanvas(), edge: edgeOf(p) };
    }
  layers = { bodyLit: body.toCanvas(), bodyDark: darkOf(body).toCanvas(), horn, bodyEdge: edgeOf(body) };
  return layers;
}

// ---- the dither sweep between the forms ----------------------------------------------------------

const sweepCache = new Map<string, HTMLCanvasElement>();
/**
 * A mask canvas: opaque where the lit form shows at progress k (0..1).
 * dir +1 = rising from the bottom, −1 = sinking from the top.
 */
function sweepMask(k: number, _dir: number): HTMLCanvasElement {
  // the lit form holds the lower part: rising (k ↑) it climbs from the feet,
  // sinking (k ↓) the dark comes down from the top — the same edge either way
  const lv = Math.round(k * 24);
  const key = String(lv);
  let c = sweepCache.get(key);
  if (c) return c;
  const [cv, ctx] = makeCanvas(W, H);
  const img = ctx.createImageData(W, H);
  const kk = lv / 24;
  for (let y = 0; y < H; y++) {
    const edge = kk * 1.25 - (1 - y / H);
    const th = Math.max(0, Math.min(16, Math.round(((edge + 0.12) / 0.24) * 16)));
    for (let x = 0; x < W; x++) if (BAYER4[y & 3][x & 3] < th) img.data[(y * W + x) * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  sweepCache.set(key, cv);
  c = cv;
  return c;
}

// ---- per-frame composition ------------------------------------------------------------------------

let outC: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
let litC: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;

function shakeOf(v: EnemyView, k: K): [number, number] {
  const t0 = v.params?.['shake_' + k];
  if (t0 === undefined) return [0, 0];
  const dt = v.gt - t0;
  if (dt < 0 || dt > 520) return [0, 0];
  const f = Math.floor(dt / 45);
  return [[1, -1, 1, 0, -1, 1, 0, -1, 1, 0, 0, 0][f] ?? 0, [0, 1, 0, -1, 0, 0, 1, 0, 0, 0, 0, 0][f] ?? 0];
}

function composeForm(ctx: CanvasRenderingContext2D, L: Layers, v: EnemyView, lit: boolean): void {
  const pr = v.params ?? {};
  ctx.clearRect(0, 0, W, H);
  // the north horn is behind the body; the others in front of the bracket
  const draw = (k: K) => {
    const broken = !!v.flags['broken_' + k];
    const droopAt = pr['droopAt_' + k];
    const droop = broken && (droopAt === undefined || v.gt >= droopAt);
    const h = L.horn[k + (droop ? ':d' : '')];
    const [dx, dy] = shakeOf(v, k);
    ctx.drawImage(lit ? h.lit : h.dark, dx, dy);
  };
  draw('north');
  ctx.drawImage(lit ? L.bodyLit : L.bodyDark, 0, 0);
  draw('west');
  draw('east');
  draw('south');
}

function buildFrame(v: EnemyView): HTMLCanvasElement {
  const L = build();
  outC ??= makeCanvas(W, H);
  litC ??= makeCanvas(W, H);
  const [out, octx] = outC;
  const [lc, lctx] = litC;
  const pr = v.params ?? {};
  const intro = pr.intro ?? 1;
  const light = Math.max(pr.light ?? 0, pr.finale ?? 0, v.flags.previewLight ?? 0);
  octx.clearRect(0, 0, W, H);
  // the dark form (during the entrance only its outline creeps in: 0.5 → 1)
  if (intro > 0.5) {
    octx.globalAlpha = Math.min(1, (intro - 0.5) * 2);
    composeForm(octx, L, v, false);
    octx.globalAlpha = 1;
  }
  if (light > 0) {
    composeForm(lctx, L, v, true);
    if (light < 1) {
      lctx.globalCompositeOperation = 'destination-in';
      lctx.drawImage(sweepMask(light, pr.lightDir ?? 1), 0, 0);
      lctx.globalCompositeOperation = 'source-over';
    }
    octx.drawImage(lc, 0, 0);
  }
  const X = (x: number) => x + OX;
  const Y = (y: number) => y + OY;
  // 雨戸: a black board rolling down over the south mouth (3f), then the slam
  const sa = pr.shutterAt;
  if (sa !== undefined && v.gt - sa >= 0 && v.gt - sa < 900 && !v.flags.broken_south) {
    const dt = v.gt - sa;
    const k = Math.min(1, dt / 360);
    const g = hornGeo('south', false);
    const top = Y(g.my - g.ry);
    const h = Math.round(g.ry * 2 * k);
    octx.fillStyle = '#2A2440';
    octx.fillRect(X(g.mx - g.rx + 2), top, g.rx * 2 - 4, h);
    octx.fillStyle = '#3A3456';
    for (let y = top + 2; y < top + h; y += 3) octx.fillRect(X(g.mx - g.rx + 2), y, g.rx * 2 - 4, 1);
  }
  // the red lamp (its eye): glow ring, lens, and the point of light that looks about
  const off = pr.lampOff ?? 0;
  const lampA = (intro < 0.5 ? intro * 2 : 1) * (1 - off);
  if (lampA > 0) {
    const lx = X(64);
    const ly = Y(66);
    octx.save();
    octx.globalAlpha = 0.4 * lampA;
    octx.fillStyle = '#FF6A4D';
    for (let yy = -6; yy <= 6; yy++) {
      const hw = Math.round(Math.sqrt(36 - yy * yy));
      octx.fillRect(lx - hw, ly + yy, hw * 2, 1);
    }
    octx.globalAlpha = lampA;
    octx.fillStyle = '#B8241E';
    octx.fillRect(X(58), Y(62), 12, 9);
    octx.fillStyle = '#E84E3C';
    octx.fillRect(X(59), Y(63), 10, 7);
    octx.fillStyle = '#FF6A4D';
    octx.fillRect(X(59), Y(63), 10, 2);
    const px = Math.round(lx - 1 + (pr.lampX ?? 0) * 3.5);
    octx.fillStyle = '#FFE7A3';
    octx.fillRect(px, ly - 1, 2, 2);
    octx.fillStyle = '#FFF6D8';
    octx.fillRect(px, ly - 1, 1, 1);
    octx.restore();
  }
  // the glint deep in each whole horn's mouth: breathing, strongest as it calls
  if (!v.flags.mouthsOff) {
    for (const k of KEYS) {
      if (v.flags['broken_' + k]) continue;
      const on = pr['mouthOn_' + k];
      if (intro < 1 && !on) continue;
      const [gx, gy] = glintAt(k);
      const [dx, dy] = shakeOf(v, k);
      const ph = hash2(KEYS.indexOf(k), 1, 3) * 3000;
      const per = 2000 + hash2(KEYS.indexOf(k), 2, 3) * 2000;
      const breath = ((v.gt + ph) % per) / per;
      const pulse = pr['mouthPulse_' + k];
      const calling = pulse !== undefined && v.gt - pulse >= 0 && v.gt - pulse < 350;
      const strong = calling || breath < 0.08;
      octx.fillStyle = '#FFF6D8';
      octx.fillRect(X(gx) + dx, Y(gy) + dy, 1, 1);
      if (strong) {
        octx.globalAlpha = calling ? 0.9 : 0.5;
        octx.fillStyle = '#FFE7A3';
        octx.fillRect(X(gx) - 1 + dx, Y(gy) + dy, 3, 1);
        octx.fillRect(X(gx) + dx, Y(gy) - 1 + dy, 1, 3);
        octx.globalAlpha = 1;
      }
    }
  }
  // the antenna's tip twinkles
  if (Math.floor(v.gt / 700) % 3 === 0) {
    octx.fillStyle = '#FFFFFF';
    octx.fillRect(X(62), Y(0), 2, 1);
  }
  // selection highlight (hl: 1 east, 2 west, 3 south, 4 north, 5 the whole body)
  const hl = pr.hl ?? 0;
  if (hl && Math.floor(v.gt / 140) % 2 === 0) {
    octx.globalAlpha = 0.85;
    if (hl === 5) octx.drawImage(L.bodyEdge, 0, 0);
    else {
      const k = (['', 'east', 'west', 'south', 'north'] as const)[hl] as K;
      const broken = !!v.flags['broken_' + k];
      octx.drawImage(L.horn[k + (broken ? ':d' : '')].edge, 0, 0);
    }
    octx.globalAlpha = 1;
  }
  // a broken horn keeps a little みました on it
  for (const k of KEYS) {
    if (!v.flags['broken_' + k]) continue;
    const droopAt = pr['droopAt_' + k];
    if (droopAt !== undefined && v.gt < droopAt) continue;
    const g = hornGeo(k, true);
    const seal = ovalStamp('みました', 20, 10, 0.12, 4 + KEYS.indexOf(k));
    const sx = X(Math.round(g.tx + (g.mx - g.tx) * 0.62)) - 10;
    const sy = Y(Math.round(g.ty + (g.my - g.ty) * 0.62)) - 5;
    octx.globalAlpha = light > 0.5 ? 1 : 0.55;
    octx.drawImage(seal, sx, sy);
    octx.globalAlpha = 1;
  }
  return out;
}

let restoredC: HTMLCanvasElement | null = null;
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(12, 24);
  p.rect(5, 6, 3, 18, '#9AA0A8');
  p.rect(2, 2, 8, 4, '#C8CDD4');
  p.rect(4, 10, 5, 3, '#8E95A6');
  p.set(6, 9, '#6B7186');
  p.outline('#2A2440');
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('boss_yobimodoshi', (): EnemyArt => ({
  id: 'boss_yobimodoshi',
  w: W,
  h: H,
  ox: OX,
  oy: OY,
  dynamic: true,
  frame: buildFrame,
  over(_g: Gfx): void {},
  restored,
  gallery: [
    { pose: 'idle' },
    { pose: 'idle', flags: { previewLight: 1 } },
    { pose: 'idle', flags: { previewLight: 0.5 } },
    { pose: 'idle', flags: { previewLight: 1, broken_east: 1, broken_south: 1, broken_west: 1, broken_north: 1 } },
  ],
}));

/** The gallery can't pass params: expose a lit preview for QA (51 10.9 明るい姿). */
export function yobiPreview(light: number, broken: K[] = []): HTMLCanvasElement {
  const flags: Record<string, number> = {};
  for (const k of broken) flags['broken_' + k] = 1;
  const c = buildFrame({ pose: 'idle', t: 0, gt: 1000, hpRate: 1, flags, params: { light, lightDir: 1, intro: 1 } });
  const [cv, ctx] = makeCanvas(c.width, c.height);
  ctx.drawImage(c, 0, 0);
  return cv;
}
