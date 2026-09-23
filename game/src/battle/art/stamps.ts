// Hanko impressions and seals: みました ovals, ペケ brush X, round seals
// (「！」「先制」「不意打ち」「100てん」「キマった」), はなまる swirl strokes,
// and the big 32px inner-voice lettering (書き文字).

import { glyphImage, charWidth, measure } from '../../engine/font';
import { makeCanvas } from '../../engine/pixel';
import { hash2, Rng } from '../../engine/rng';

const SHU = '#E23B2E';
const SHU_D = '#B8241E';
const SHU_L = '#FF6A4D';
const INK = '#2A2440';
const PAPER = '#FBF3DC';
const WHITE = '#F4F1E8';

type Grid = { w: number; h: number; d: Uint8Array };

function grid(w: number, h: number): Grid {
  return { w, h, d: new Uint8Array(w * h) };
}

function toCanvas(g: Grid, pal: string[]): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(g.w, g.h);
  const img = ctx.createImageData(g.w, g.h);
  const rgb = pal.map((p) => {
    const h = p.replace('#', '');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  });
  for (let i = 0; i < g.d.length; i++) {
    const v = g.d[i];
    if (!v) continue;
    const [r, gg, b] = rgb[v - 1];
    img.data[i * 4] = r;
    img.data[i * 4 + 1] = gg;
    img.data[i * 4 + 2] = b;
    img.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Glyph coverage mask of a text at 16px, scaled by s (area coverage threshold). */
function textMask(text: string, s: number, thr = 0.3): Grid {
  const w16 = measure(text);
  const [c, ctx] = makeCanvas(w16 + 2, 18);
  let x = 0;
  for (const ch of text) {
    ctx.drawImage(glyphImage(ch, '#ffffff'), x, 0);
    x += charWidth(ch);
  }
  const src = ctx.getImageData(0, 0, c.width, c.height).data;
  const W = Math.max(1, Math.round(c.width * s));
  const H = Math.max(1, Math.round(16 * s));
  const g = grid(W, H);
  for (let y = 0; y < H; y++)
    for (let xx = 0; xx < W; xx++) {
      const x0 = xx / s;
      const y0 = y / s;
      const x1 = (xx + 1) / s;
      const y1 = (y + 1) / s;
      let tot = 0;
      let on = 0;
      for (let sy = Math.floor(y0); sy < Math.ceil(y1); sy++)
        for (let sx = Math.floor(x0); sx < Math.ceil(x1); sx++) {
          if (sx >= c.width || sy >= c.height) continue;
          tot++;
          if (src[(sy * c.width + sx) * 4 + 3] > 128) on++;
        }
      if (tot && on / tot >= thr) g.d[y * W + xx] = 1;
    }
  return g;
}

/** Knock random specks out of an ink grid (value 1 → 0) for a worn stamp. */
function wear(g: Grid, amount: number, seed: number): void {
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const i = y * g.w + x;
      if (!g.d[i]) continue;
      const n = hash2(x, y, seed);
      const blot = hash2(x >> 2, y >> 2, seed + 9);
      if (n < amount * (0.5 + blot)) g.d[i] = 0;
    }
}

/** Shade ink pixels: 1 = main, 2 = dark (lower/right edges), 3 = light specks. */
function inkTone(g: Grid, seed: number): void {
  const src = g.d.slice();
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const i = y * g.w + x;
      if (src[i] !== 1) continue;
      const below = y + 1 < g.h ? src[i + g.w] : 0;
      const right = x + 1 < g.w ? src[i + 1] : 0;
      if (!below || !right) g.d[i] = 2;
      else if (hash2(x, y, seed + 3) < 0.06) g.d[i] = 3;
    }
}

function ellipseRing(g: Grid, cx: number, cy: number, rx: number, ry: number, th: number, v = 1): void {
  for (let y = 0; y < g.h; y++)
    for (let x = 0; x < g.w; x++) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      const dx2 = (x + 0.5 - cx) / (rx - th);
      const dy2 = (y + 0.5 - cy) / (ry - th);
      const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (d <= 1 && d2 > 1) g.d[y * g.w + x] = v;
    }
}

function blit(dst: Grid, src: Grid, ox: number, oy: number, v: number): void {
  for (let y = 0; y < src.h; y++)
    for (let x = 0; x < src.w; x++) {
      if (!src.d[y * src.w + x]) continue;
      const xx = x + ox;
      const yy = y + oy;
      if (xx >= 0 && yy >= 0 && xx < dst.w && yy < dst.h) dst.d[yy * dst.w + xx] = v;
    }
}

const cache = new Map<string, HTMLCanvasElement>();
function cached(key: string, f: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = f();
    cache.set(key, c);
  }
  return c;
}

/**
 * Oval seal with text (みました / おかえりなさい): double ellipse frame and
 * text in vermilion. `worn` 0..1 for かすれ.
 */
export function ovalStamp(text: string, w: number, h: number, worn = 0, seed = 1): HTMLCanvasElement {
  return cached(`oval:${text}:${w}x${h}:${worn}:${seed}`, () => {
    const g = grid(w, h);
    const th = w >= 60 ? 3 : 2;
    ellipseRing(g, w / 2, h / 2, w / 2, h / 2, th);
    if (w >= 40) ellipseRing(g, w / 2, h / 2, w / 2 - th - 1.5, h / 2 - th - 1.5, 1);
    // text scaled to fit inside
    const inner = w - th * 2 - (w >= 40 ? 10 : 6);
    const s = Math.min(1, inner / measure(text), (h - th * 2 - 4) / 16);
    const tm = textMask(text, s, s < 0.7 ? 0.28 : 0.4);
    blit(g, tm, Math.round((w - tm.w) / 2), Math.round((h - tm.h) / 2), 1);
    if (worn) wear(g, worn, seed);
    inkTone(g, seed);
    return toCanvas(g, [SHU, SHU_D, SHU_L]);
  });
}

/** Round seal, filled vermilion with knocked-out (paper) text. */
export function roundSeal(text: string, size: number, color = SHU, seed = 2): HTMLCanvasElement {
  return cached(`round:${text}:${size}:${color}:${seed}`, () => {
    const g = grid(size, size);
    const r = size / 2;
    const rr = new Rng(seed * 31 + size);
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const dx = x + 0.5 - r;
        const dy = y + 0.5 - r;
        const a = Math.atan2(dy, dx);
        const edge = r - 0.6 - 0.9 * hash2(Math.round(a * 8), 0, seed);
        const d = Math.hypot(dx, dy);
        if (d <= edge) g.d[y * size + x] = 1;
        if (d <= edge - 3 && d > edge - 4.2) g.d[y * size + x] = 4; // inner ring line (paper)
      }
    const lines = text.split('\n');
    const maxW = size - 12;
    const scale = Math.min(1, maxW / Math.max(...lines.map((l) => measure(l))), (size - 14) / (lines.length * 16));
    const lh = Math.round(16 * scale) + 1;
    const totalH = lh * lines.length - 1;
    lines.forEach((l, i) => {
      const tm = textMask(l, scale, scale < 0.7 ? 0.3 : 0.45);
      blit(g, tm, Math.round((size - tm.w) / 2), Math.round((size - totalH) / 2 + i * lh), 4);
    });
    // worn specks inside the solid fill
    for (let i = 0; i < size * 0.8; i++) {
      const x = Math.floor(rr.next() * size);
      const y = Math.floor(rr.next() * size);
      if (g.d[y * size + x] === 1) g.d[y * size + x] = 3;
    }
    const src = g.d.slice();
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x;
        if (src[i] === 1 && (y + 1 >= size || !src[i + size] || x + 1 >= size || !src[i + 1])) g.d[i] = 2;
      }
    const dark = color === SHU ? SHU_D : '#2A2440';
    const light = color === SHU ? SHU_L : '#6A5A8E';
    return toCanvas(g, [color, dark, light, color === SHU ? PAPER : WHITE]);
  });
}

/** Big brush-stroke ペケ (96×96) or small decal (20×20, 3 worn variants). */
export function pekeMark(size: number, variant = 0, kasure = false): HTMLCanvasElement {
  return cached(`peke:${size}:${variant}:${kasure}`, () => {
    const g = grid(size, size);
    const s = size / 96;
    const rr = new Rng(17 + variant * 7);
    const stroke = (x0: number, y0: number, x1: number, y1: number, w0: number, w1: number) => {
      const n = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 1.5);
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        // brush pressure: thick in the middle, dry-brush tail
        const w = (w0 + (w1 - w0) * t) * (0.75 + 0.35 * Math.sin(Math.PI * Math.min(1, t * 1.1)));
        const x = x0 + (x1 - x0) * t + Math.sin(t * 5 + variant) * 1.2 * s;
        const y = y0 + (y1 - y0) * t;
        const r = Math.max(0.6, w / 2);
        for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++)
          for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++) {
            if (xx < 0 || yy < 0 || xx >= size || yy >= size) continue;
            if ((xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 > r * r) continue;
            // dry streaks near the tail
            if (t > 0.78 && hash2(Math.round((xx - x) * 3 + (yy - y) * 2), variant, 5) < (t - 0.78) * 3.2) continue;
            g.d[yy * size + xx] = 1;
          }
      }
    };
    stroke(14 * s, 12 * s, 84 * s, 86 * s, 17 * s, 9 * s);
    stroke(82 * s, 10 * s, 12 * s, 84 * s, 16 * s, 8 * s);
    // splatter dots
    for (let i = 0; i < 10 * s + 2; i++) {
      const x = Math.floor(rr.range(0.08, 0.92) * size);
      const y = Math.floor(rr.range(0.08, 0.92) * size);
      if (hash2(x, y, 3) < 0.5) g.d[y * size + x] = 1;
    }
    if (kasure) wear(g, 0.45, 40 + variant);
    else if (size <= 24) wear(g, 0.08 + variant * 0.05, 11 + variant);
    inkTone(g, variant + 1);
    return toCanvas(g, [SHU, SHU_D, SHU_L]);
  });
}

/** Hanamaru swirl path points (spiral + scalloped petals), normalized to radius 1. */
export function hanamaruPath(): [number, number][] {
  const pts: [number, number][] = [];
  // inner spiral (2 turns)
  for (let i = 0; i <= 80; i++) {
    const t = i / 80;
    const a = -Math.PI / 2 + t * Math.PI * 4;
    const r = 0.08 + t * 0.42;
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  // petals: scalloped loop around
  const n = 9;
  for (let i = 0; i <= 180; i++) {
    const t = i / 180;
    const a = -Math.PI / 2 + t * Math.PI * 2 + Math.PI * 4;
    const r = 0.62 + 0.3 * Math.abs(Math.sin((t * n * Math.PI) / 1));
    pts.push([Math.cos(a) * r, Math.sin(a) * r]);
  }
  return pts;
}

/**
 * Hanamaru drawn up to fraction `k` of the path (size×size). `broken` leaves
 * gaps in the line (かすれ).
 */
export function hanamaruFrame(size: number, k: number, broken = false, thick = 2): HTMLCanvasElement {
  const kk = Math.round(k * 24) / 24;
  return cached(`hana:${size}:${kk}:${broken}:${thick}`, () => {
    const g = grid(size, size);
    const pts = hanamaruPath();
    const n = Math.floor((pts.length - 1) * kk);
    const R = size / 2 - thick;
    for (let i = 0; i < n; i++) {
      if (broken && hash2(i >> 3, 0, 5) < 0.3) continue;
      const [x0, y0] = pts[i];
      const [x1, y1] = pts[i + 1];
      const steps = 4;
      for (let s = 0; s <= steps; s++) {
        const x = size / 2 + (x0 + (x1 - x0) * (s / steps)) * R;
        const y = size / 2 + (y0 + (y1 - y0) * (s / steps)) * R;
        const r = thick / 2;
        for (let yy = Math.floor(y - r); yy <= Math.ceil(y + r); yy++)
          for (let xx = Math.floor(x - r); xx <= Math.ceil(x + r); xx++)
            if (xx >= 0 && yy >= 0 && xx < size && yy < size && (xx + 0.5 - x) ** 2 + (yy + 0.5 - y) ** 2 <= r * r + 0.3)
              g.d[yy * size + xx] = 1;
      }
    }
    inkTone(g, 4);
    return toCanvas(g, [SHU, SHU_D, SHU_L]);
  });
}

// ---- 書き文字 (inner voice, 32px) -----------------------------------------------

/**
 * Large lettering: DotGothic16 ×2 (32px), paper-white fill, 2px vermilion
 * edge, 1px ink outside. `just` = 3px edge + 2px drop shadow. Each glyph
 * jitters ±1px vertically (seeded).
 */
export function kakimoji(text: string, just = false, seed = 7, scale = 2): HTMLCanvasElement {
  return cached(`kaki:${text}:${just}:${seed}:${scale}`, () => {
    const rr = new Rng(seed);
    const edge = just ? 3 : 2;
    const pad = edge + 1 + (just ? 2 : 0) + 1;
    const w1 = measure(text);
    const W = w1 * scale + pad * 2;
    const H = 16 * scale + pad * 2 + 2;
    const g = grid(W, H);
    let x = 0;
    for (const ch of text) {
      const dy = rr.int(-1, 1);
      const gi = glyphImage(ch, '#ffffff');
      const gctx = gi.getContext('2d')!;
      const d = gctx.getImageData(0, 0, gi.width, gi.height).data;
      for (let yy = 0; yy < gi.height; yy++)
        for (let xx = 0; xx < gi.width; xx++) {
          if (d[(yy * gi.width + xx) * 4 + 3] < 128) continue;
          for (let sy = 0; sy < scale; sy++)
            for (let sx = 0; sx < scale; sx++) {
              const px = pad + x * scale + xx * scale + sx;
              const py = pad + 1 + dy + yy * scale + sy;
              if (px >= 0 && py >= 0 && px < W && py < H) g.d[py * W + px] = 1;
            }
        }
      x += charWidth(ch);
    }
    const dilate = (from: number, to: number, times: number) => {
      for (let t = 0; t < times; t++) {
        const src = g.d.slice();
        for (let y = 0; y < H; y++)
          for (let xx = 0; xx < W; xx++) {
            const i = y * W + xx;
            if (src[i]) continue;
            let hit = false;
            for (let oy = -1; oy <= 1 && !hit; oy++)
              for (let ox = -1; ox <= 1; ox++) {
                if (!ox && !oy) continue;
                if (t === 0 && ox && oy && times > 1) continue;
                const X = xx + ox;
                const Y = y + oy;
                if (X < 0 || Y < 0 || X >= W || Y >= H) continue;
                const v = src[Y * W + X];
                if (v && v <= from) {
                  hit = true;
                  break;
                }
              }
            if (hit) g.d[i] = to;
          }
      }
    };
    dilate(2, 2, edge);
    dilate(3, 3, 1);
    if (just) {
      // drop shadow: copy of the silhouette offset (+2,+2)
      const src = g.d.slice();
      for (let y = H - 1; y >= 0; y--)
        for (let xx = W - 1; xx >= 0; xx--) {
          const i = y * W + xx;
          if (src[i]) continue;
          const sx = xx - 2;
          const sy = y - 2;
          if (sx >= 0 && sy >= 0 && src[sy * W + sx]) g.d[i] = 4;
        }
    }
    // highlight: top pixel row of each fill run gets the flash color
    const src = g.d.slice();
    for (let y = 1; y < H; y++)
      for (let xx = 0; xx < W; xx++) {
        const i = y * W + xx;
        if (src[i] === 1 && src[i - W] !== 1) g.d[i] = 5;
      }
    return toCanvas(g, [WHITE, SHU, INK, '#5B4A7A', '#FFF6D8']);
  });
}

/** Small 16px lettering with the same treatment (ノリツッコミ upper line). */
export function kakimojiSmall(text: string): HTMLCanvasElement {
  return kakimoji(text, false, 3, 1);
}
