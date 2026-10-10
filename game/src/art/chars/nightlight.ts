// Chapter 2 night lighting helpers for character frames (52 8.4–8.9, 10.1).
//
// The field of 星見台 is graded by a dark multiply colour, and the only warm
// light is the tomato lantern Minato carries. Three things the field needs
// from a character frame, all cached per frame canvas so they cost nothing
// after the first call:
//
//  - charGlow(frame): the frame's emissive layer — pixels that give off light
//    (the hanamaru tomato in the bug net, a flashlight bulb, an LED, a
//    headlight) plus their soft halos. Draw it after the night grading (at
//    the frame's position + dx/dy), so it keeps its colour in the dark.
//    Source-over keeps the exact design colours; 'screen' works too.
//  - lanternOf(frame): where the frame's carried light pools on the ground,
//    relative to the feet anchor (Minato: (−4, −6) normally, 12px higher and
//    ×1.2 while he holds the net up; Kanenari's hold_net).
//  - litRim(frame, lx, ly): the night rim (52 8.5 / 8.9) — the 1px outline on
//    the side of the silhouette that faces a light, as an overlay canvas of
//    the frame's size (#F2894B for the lantern; #F7C27A on the right for the
//    morning sun). (lx, ly) is the direction from the character toward the
//    light; it is quantised to 8 directions.

import { frameMeta } from './rig';

export interface CharGlow {
  img: HTMLCanvasElement;
  /** Top-left of `img` relative to the frame's top-left. */
  dx: number;
  dy: number;
}

export interface LanternInfo {
  /** Light-pool centre relative to the feet anchor (bottom centre of the frame). */
  dx: number;
  dy: number;
  /** Radius multiplier (1.2 while the net is held up). */
  scale: number;
}

const glowCache = new WeakMap<HTMLCanvasElement, CharGlow | null>();

function rgb(h: string): [number, number, number] {
  const n = parseInt(h.slice(1, 7), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** The emissive layer of a character frame (null when it has none). */
export function charGlow(frame: HTMLCanvasElement): CharGlow | null {
  if (glowCache.has(frame)) return glowCache.get(frame)!;
  const m = frameMeta(frame);
  let out: CharGlow | null = null;
  if (m && (m.glow.length || m.halo.length)) {
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const g of m.glow) {
      x0 = Math.min(x0, g.x);
      y0 = Math.min(y0, g.y);
      x1 = Math.max(x1, g.x + 1);
      y1 = Math.max(y1, g.y + 1);
    }
    for (const h of m.halo) {
      x0 = Math.min(x0, Math.floor(h.x + 0.5 - h.r));
      y0 = Math.min(y0, Math.floor(h.y + 0.5 - h.r));
      x1 = Math.max(x1, Math.ceil(h.x + 0.5 + h.r));
      y1 = Math.max(y1, Math.ceil(h.y + 0.5 + h.r));
    }
    const w = x1 - x0;
    const hh = y1 - y0;
    const c = document.createElement('canvas');
    c.width = w;
    c.height = hh;
    const ctx = c.getContext('2d')!;
    const im = ctx.createImageData(w, hh);
    const d = im.data;
    // halos: a soft disc, inner colour at the centre fading to the outer
    // one, alpha falling off to 0 at the rim (quantised to 4 steps so the
    // glow stays pixel-art and does not band into dozens of tones)
    for (const h of m.halo) {
      const a = rgb(h.inner);
      const b = rgb(h.outer);
      for (let y = 0; y < hh; y++)
        for (let x = 0; x < w; x++) {
          const dist = Math.hypot(x + x0 + 0.5 - (h.x + 0.5), y + y0 + 0.5 - (h.y + 0.5)) / h.r;
          if (dist >= 1) continue;
          const k = Math.min(1, dist * 1.25);
          const step = Math.ceil((1 - dist) * 4) / 4;
          const al = h.a * step * step;
          const i = (y * w + x) * 4;
          const col = [0, 1, 2].map((j) => Math.round(a[j] + (b[j] - a[j]) * k));
          // "over" onto what is there already
          const ea = d[i + 3] / 255;
          const oa = al + ea * (1 - al);
          if (oa <= 0) continue;
          for (let j = 0; j < 3; j++) d[i + j] = Math.round((col[j] * al + d[i + j] * ea * (1 - al)) / oa);
          d[i + 3] = Math.round(oa * 255);
        }
    }
    for (const g of m.glow) {
      const i = ((g.y - y0) * w + (g.x - x0)) * 4;
      const [r, gg, bb] = rgb(g.c);
      d[i] = r;
      d[i + 1] = gg;
      d[i + 2] = bb;
      d[i + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
    out = { img: c, dx: x0, dy: y0 };
  }
  glowCache.set(frame, out);
  return out;
}

/** The carried light of a frame (null when the frame carries none). */
export function lanternOf(frame: HTMLCanvasElement): LanternInfo | null {
  const m = frameMeta(frame);
  if (!m?.lantern) return null;
  return {
    dx: m.lantern.x + 0.5 - frame.width / 2,
    dy: m.lantern.y + 0.5 - frame.height,
    scale: m.lantern.scale,
  };
}

// ---- night rim --------------------------------------------------------------

const maskCache = new WeakMap<HTMLCanvasElement, Uint8Array>();
const rimCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement | null>>();

// frames are read back through one scratch canvas made for it (reading the
// sprite canvases themselves a second time makes Chrome warn per canvas)
let scratch: CanvasRenderingContext2D | null = null;

function maskOf(frame: HTMLCanvasElement): Uint8Array {
  let m = maskCache.get(frame);
  if (m) return m;
  const w = frame.width;
  const h = frame.height;
  m = new Uint8Array(w * h);
  if (w && h) {
    if (!scratch) {
      const c = document.createElement('canvas');
      scratch = c.getContext('2d', { willReadFrequently: true })!;
    }
    const sc = scratch.canvas;
    if (sc.width < w || sc.height < h) {
      sc.width = Math.max(sc.width, w);
      sc.height = Math.max(sc.height, h);
    }
    scratch.clearRect(0, 0, w, h);
    scratch.drawImage(frame, 0, 0);
    const d = scratch.getImageData(0, 0, w, h).data;
    for (let i = 0; i < w * h; i++) m[i] = d[i * 4 + 3] > 96 ? 1 : 0;
  }
  maskCache.set(frame, m);
  return m;
}

/** 8-way step toward the light. */
function octant(lx: number, ly: number): [number, number] {
  if (Math.abs(lx) < 1e-6 && Math.abs(ly) < 1e-6) return [-1, -1];
  const a = Math.atan2(ly, lx);
  const k = Math.round(a / (Math.PI / 4));
  const dirs: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  return dirs[((k % 8) + 8) % 8];
}

/**
 * The 1px rim on the side of the frame's silhouette that faces a light:
 * every opaque edge pixel whose neighbour toward the light is empty (its
 * outline pixel) is painted `color`. Returns an overlay of the frame's size
 * (null if nothing faces the light). Draw it at the frame's position.
 */
export function litRim(frame: HTMLCanvasElement, lx: number, ly: number, color = '#F2894B'): HTMLCanvasElement | null {
  const [sx, sy] = octant(lx, ly);
  const key = `${sx},${sy},${color}`;
  let per = rimCache.get(frame);
  if (!per) rimCache.set(frame, (per = new Map()));
  if (per.has(key)) return per.get(key)!;
  const w = frame.width;
  const h = frame.height;
  const m = maskOf(frame);
  const at = (x: number, y: number) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : m[y * w + x]);
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = color;
  let any = false;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!m[y * w + x]) continue;
      const open = (sx !== 0 && !at(x + sx, y)) || (sy !== 0 && !at(x, y + sy));
      if (!open) continue;
      ctx.fillRect(x, y, 1, 1);
      any = true;
    }
  const out = any ? c : null;
  per.set(key, out);
  return out;
}
