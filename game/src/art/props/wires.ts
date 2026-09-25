// Overhead electric wires strung between utility poles (30_level_art 3.7):
// sagging parabolas drawn in the foreground layer (above characters).
//
// Readability rules (review round 1):
//   - an ordinary span has two lines: one high wire from the crossarm and one
//     low cable; only the fushigi_03 "music staff" span has five low wires;
//   - lines are #3A2B5C, the first at α62%, every other line at α40%, so they
//     read as thin overhead lines and never as ink strokes over the art;
//   - where a line crosses a character (player, follower, NPCs) that part is
//     faded to α30% in 0.2s, like tree canopies, so wires never hide people.
//
// The whole map's wires are rasterised once per sway phase into an alpha
// buffer (max-blend, so crossings don't darken) and blitted each frame.

import type { Gfx } from '../../engine/gfx';
import { H, W } from '../../engine/screen';

export interface WireLine {
  /** Pole positions (tile coords of the pole's footprint). */
  pts: [number, number][];
  /** Five parallel low wires (the "music staff", fushigi_03). */
  staff?: boolean;
  /** Only the low cable (short spans across a street). */
  thin?: boolean;
  /** Service drop: a single cable from the first pole to a roof point (world px in `to`). */
  to?: [number, number];
}

export interface WireSet {
  lines: WireLine[];
  map: string;
}

/** Pole geometry: attachment points relative to the pole foot (world px). */
export const POLE = {
  height: 64,
  arm: 56, // crossarm height above the foot
  armSpan: [-7, 0, 7] as const,
  low: 44, // low cable height
};

/** Wire colour #3A2B5C and the two line strengths. */
const RGB = [58, 43, 92];
/** The music-staff span (fushigi_03) is drawn in ink #2A2440 at α80% so it reads as a staff (review round 2). */
const RGB_STAFF = [42, 36, 64];
const A_STAFF = 0.8;
/** Staff geometry: five lines exactly 3px apart, a shallow 4px sag. */
const STAFF_GAP = 3;
const STAFF_SAG = 4;
const A_MAIN = 0.62;
const A_SUB = 0.4;
/** Alpha multiplier where a line crosses a character. */
const A_OVER_CHAR = 0.3;

export function poleFoot(tx: number, ty: number): [number, number] {
  return [tx * 16 + 8, ty * 16 + 13];
}

/** Sample point on a sagging span from a to b at t∈[0,1]. */
export function spanPoint(a: [number, number], b: [number, number], t: number, sag: number): [number, number] {
  const x = a[0] + (b[0] - a[0]) * t;
  const y = a[1] + (b[1] - a[1]) * t + sag * 4 * t * (1 - t);
  return [x, y];
}

function spanSag(a: [number, number], b: [number, number]): number {
  const dist = Math.hypot(b[0] - a[0], b[1] - a[1]);
  return Math.min(10, 5 + dist / 40);
}

interface Baked {
  c: HTMLCanvasElement;
  x0: number;
  y0: number;
  /** Alpha (0..255) per pixel, for "is there a wire here" tests. */
  a: Uint8Array;
  w: number;
  h: number;
}

const baked = new Map<string, Baked>();

/** Rasterise one sagging span into the alpha buffer (max blend). */
function rasterSpan(buf: Uint8Array, col: Uint8Array, bw: number, bh: number, x0: number, y0: number, a: [number, number], b: [number, number], sag: number, alpha: number, ci = 0): void {
  const len = Math.max(Math.abs(b[0] - a[0]), Math.abs(b[1] - a[1]) + sag);
  const n = Math.max(2, Math.ceil(len * 1.5));
  const v = Math.round(alpha * 255);
  let px = Math.round(a[0] - x0);
  let py = Math.round(a[1] - y0);
  const plot = (x: number, y: number) => {
    if (x < 0 || y < 0 || x >= bw || y >= bh) return;
    const i = y * bw + x;
    if (buf[i] < v) {
      buf[i] = v;
      col[i] = ci;
    }
  };
  plot(px, py);
  for (let i = 1; i <= n; i++) {
    const [x, y] = spanPoint(a, b, i / n, sag);
    const nx = Math.round(x - x0);
    const ny = Math.round(y - y0);
    if (nx === px && ny === py) continue;
    plot(nx, ny);
    px = nx;
    py = ny;
  }
}

/** All spans of a set with their line strengths (shared by bake and the sparrow helpers). */
interface Span {
  a: [number, number];
  b: [number, number];
  sag: number;
  alpha: number;
  /** 1 = ink (the music staff). */
  ci?: number;
}

function spans(set: WireSet, sway: number): Span[] {
  const out: Span[] = [];
  for (const line of set.lines) {
    if (line.to) {
      const [fx, fy] = poleFoot(...line.pts[0]);
      out.push({ a: [fx + 2, fy - POLE.low - 1], b: line.to, sag: 4 + sway * 0.5, alpha: A_SUB });
      continue;
    }
    for (let i = 0; i + 1 < line.pts.length; i++) {
      const [ax, ay] = poleFoot(...line.pts[i]);
      const [bx, by] = poleFoot(...line.pts[i + 1]);
      const sag = spanSag([ax, ay], [bx, by]);
      if (!line.thin) out.push({ a: [ax - 7, ay - POLE.arm], b: [bx - 7, by - POLE.arm], sag: sag + sway, alpha: A_MAIN });
      if (line.staff) {
        const sg = STAFF_SAG + sway * 0.3;
        for (let k = 0; k < 5; k++) out.push({ a: staffEnd(ax, ay, k), b: staffEnd(bx, by, k), sag: sg, alpha: A_STAFF, ci: 1 });
        // the bar line at the left end of the staff (a short straight segment)
        const t = 0.035;
        const top = spanPoint(staffEnd(ax, ay, 0), staffEnd(bx, by, 0), t, sg);
        const bot = spanPoint(staffEnd(ax, ay, 4), staffEnd(bx, by, 4), t, sg);
        out.push({ a: [Math.round(top[0]), top[1]], b: [Math.round(top[0]), bot[1]], sag: 0, alpha: A_STAFF, ci: 1 });
      } else {
        out.push({ a: [ax + 2, ay - POLE.low], b: [bx + 2, by - POLE.low], sag: sag + 2 + sway * 0.8, alpha: line.thin ? A_MAIN * 0.8 : A_SUB });
      }
    }
  }
  return out;
}

function bake(set: WireSet, q: number): Baked {
  let x0 = 1e9;
  let y0 = 1e9;
  let x1 = -1e9;
  let y1 = -1e9;
  for (const line of set.lines) {
    for (const pt of line.pts) {
      const [fx, fy] = poleFoot(...pt);
      x0 = Math.min(x0, fx - 16);
      x1 = Math.max(x1, fx + 16);
      y0 = Math.min(y0, fy - POLE.height - 4);
      y1 = Math.max(y1, fy + 16);
    }
    if (line.to) {
      x0 = Math.min(x0, line.to[0] - 4);
      x1 = Math.max(x1, line.to[0] + 4);
      y0 = Math.min(y0, line.to[1] - 4);
      y1 = Math.max(y1, line.to[1] + 16);
    }
  }
  x0 = Math.floor(x0);
  y0 = Math.floor(y0);
  const w = Math.max(1, Math.ceil(x1 - x0));
  const h = Math.max(1, Math.ceil(y1 - y0));
  const a = new Uint8Array(w * h);
  const ci = new Uint8Array(w * h);
  for (const s of spans(set, q * 0.45)) rasterSpan(a, ci, w, h, x0, y0, s.a, s.b, s.sag, s.alpha, s.ci ?? 0);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  const id = ctx.createImageData(w, h);
  for (let i = 0; i < a.length; i++) {
    if (!a[i]) continue;
    const rgb = ci[i] ? RGB_STAFF : RGB;
    id.data[i * 4] = rgb[0];
    id.data[i * 4 + 1] = rgb[1];
    id.data[i * 4 + 2] = rgb[2];
    id.data[i * 4 + 3] = a[i];
  }
  ctx.putImageData(id, 0, 0);
  return { c, x0, y0, a, w, h };
}

/** A character rectangle (screen px) that wires fade over; `key` keeps the fade state. */
export interface WireOccluder {
  x: number;
  y: number;
  w: number;
  h: number;
  key: object;
}

const fadeOf = new WeakMap<object, number>();
let lastT = -1;

/** Does any wire pixel fall inside this world rect? */
function wireIn(b: Baked, x: number, y: number, w: number, h: number): boolean {
  const lx0 = Math.max(0, Math.floor(x - b.x0));
  const ly0 = Math.max(0, Math.floor(y - b.y0));
  const lx1 = Math.min(b.w, Math.ceil(x + w - b.x0));
  const ly1 = Math.min(b.h, Math.ceil(y + h - b.y0));
  for (let yy = ly0; yy < ly1; yy++) {
    const row = yy * b.w;
    for (let xx = lx0; xx < lx1; xx++) if (b.a[row + xx]) return true;
  }
  return false;
}

/**
 * Draw the wires. They are baked once per map and sway phase (3 phases)
 * into a world-space layer, then blitted; the parts over characters fade.
 */
export function drawWires(g: Gfx, set: WireSet, cx: number, cy: number, mt: number, stage: number, t: number, occ: WireOccluder[] = []): void {
  const q = stage === 1 ? 0 : Math.round(Math.sin(mt / 1400) * 1.4);
  const key = set.map + ':' + q;
  let b = baked.get(key);
  if (!b) {
    b = bake(set, q);
    baked.set(key, b);
  }
  const dt = lastT < 0 ? 16.7 : Math.max(0, Math.min(100, t - lastT));
  lastT = t;
  const ctx = g.ctx;
  const dx = Math.round(b.x0 - cx);
  const dy = Math.round(b.y0 - cy);
  // fade state per character: towards 0.3 while a wire crosses it (0.2s)
  const faded: { r: WireOccluder; a: number }[] = [];
  for (const r of occ) {
    if (r.x + r.w < 0 || r.y + r.h < 0 || r.x > W || r.y > H) continue;
    const under = wireIn(b, r.x + cx, r.y + cy, r.w, r.h);
    const cur = fadeOf.get(r.key) ?? 1;
    const tgt = under ? A_OVER_CHAR : 1;
    const step = (dt / 200) * (1 - A_OVER_CHAR);
    const next = cur + Math.sign(tgt - cur) * Math.min(Math.abs(tgt - cur), step);
    fadeOf.set(r.key, next);
    if (under || next < 0.999) faded.push({ r, a: next });
  }
  if (!faded.length) {
    ctx.drawImage(b.c, dx, dy);
    return;
  }
  // everything except the character rects at full strength …
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  for (const { r } of faded) ctx.rect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
  ctx.clip('evenodd');
  ctx.drawImage(b.c, dx, dy);
  ctx.restore();
  // … and the rects themselves faded
  for (const { r, a } of faded) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(Math.round(r.x), Math.round(r.y), Math.round(r.w), Math.round(r.h));
    ctx.clip();
    ctx.globalAlpha = a;
    ctx.drawImage(b.c, dx, dy);
    ctx.restore();
  }
}

/** World position on the k-th staff wire between two poles at t. */
export function staffPoint(a: [number, number], b: [number, number], k: number, t: number): [number, number] {
  const [ax, ay] = poleFoot(...a);
  const [bx, by] = poleFoot(...b);
  return spanPoint(staffEnd(ax, ay, k), staffEnd(bx, by, k), t, STAFF_SAG);
}

/** Attachment point of staff line k (0 = top) on the pole whose foot is (fx, fy). */
function staffEnd(fx: number, fy: number, k: number): [number, number] {
  return [fx, fy - POLE.low + k * STAFF_GAP - 2 * STAFF_GAP];
}

/** World position on the low cable between two poles at t (sparrows perch here). */
export function lowPoint(a: [number, number], b: [number, number], t: number): [number, number] {
  const [ax, ay] = poleFoot(...a);
  const [bx, by] = poleFoot(...b);
  const sag = spanSag([ax, ay], [bx, by]) + 2;
  return spanPoint([ax + 2, ay - POLE.low], [bx + 2, by - POLE.low], t, sag);
}
