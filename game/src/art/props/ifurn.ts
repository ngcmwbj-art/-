// Helpers for interior furniture and wall decor (shops and mall): paper
// notices with tape, framed pictures, analogue clocks, goods on shelves,
// cardboard boxes, stools. Everything paints into a PixelCanvas with the
// master palette; lighting follows 7.4 (lit from the upper left).

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { ihash } from '../tiles/noise';
import { castRight, dk, finish, lt } from './kit';
import { mkFrames, stand, standAnim, type StandOpts } from './pkit';
import { printLines } from './text';
import type { PropArt, PropEnv } from './types';

export const pc = (w: number, h: number) => new PixelCanvas(w, h);

/** A finished standing prop from a painter (outline + rim light). */
export function prop(w: number, h: number, paint: (p: PixelCanvas) => void, o: StandOpts & { rim?: boolean; soft?: boolean } = {}): PropArt {
  const p = pc(w, h);
  paint(p);
  finish(p, { soft: o.soft ?? true, rim: o.rim });
  return stand(p.toCanvas(), o);
}

/** Animated standing prop: n frames, picked per env. */
export function propAnim(
  n: number,
  w: number,
  h: number,
  paint: (p: PixelCanvas, k: number) => void,
  pickFn: (env: PropEnv) => number,
  o: StandOpts & { rim?: boolean; soft?: boolean } = {},
): PropArt {
  const frames = mkFrames(n, w, h, paint, (p) => finish(p, { soft: o.soft ?? true, rim: o.rim }));
  return standAnim(frames, pickFn, o);
}

/** Paper notice with a tape strip on top (or pins), text lines, a 1px shadow right. */
export function notice(
  p: PixelCanvas,
  x: number,
  y: number,
  w: number,
  h: number,
  o: { paper?: string; ink?: string; head?: string; tape?: boolean; seed?: number; rows?: number; tilt?: boolean } = {},
): void {
  const paper = o.paper ?? P.paper;
  p.rect(x, y, w, h, paper);
  p.hline(x, x + w - 1, y + h - 1, dk(paper));
  p.vline(x + w - 1, y, y + h - 1, dk(paper));
  if (o.head) p.rect(x + 1, y + 1, w - 2, 2, o.head);
  if (o.tape ?? true) {
    p.rect(x + Math.floor(w / 2) - 2, y - 1, 4, 2, P.goldPale);
  } else {
    p.set(x + 1, y + 1, P.verm);
    p.set(x + w - 2, y + 1, P.verm);
  }
  printLines(p, x + 1, y + (o.head ? 4 : 2), w - 3, o.rows ?? Math.max(1, Math.floor((h - 4) / 2)), o.ink ?? P.steel, o.seed ?? x * 7 + y);
  castRight(p, x, y, w, h, 1);
  if (o.tilt) {
    // one lifted corner
    p.set(x + w - 1, y + h - 1, dk(paper, 2));
    p.set(x + w - 2, y + h - 1, 'transparent');
  }
}

/** Picture frame (wood or metal) around a filled picture; returns the inner rect. */
export function framed(p: PixelCanvas, x: number, y: number, w: number, h: number, frame: string = P.wood): [number, number, number, number] {
  p.rect(x, y, w, h, frame);
  p.hline(x, x + w - 1, y, lt(frame));
  p.vline(x, y, y + h - 1, lt(frame));
  p.hline(x, x + w - 1, y + h - 1, dk(frame));
  p.vline(x + w - 1, y, y + h - 1, dk(frame));
  castRight(p, x, y, w, h, 2);
  return [x + 1, y + 1, w - 2, h - 2];
}

/** Analogue clock face with hands (h 0–11, m 0–59). */
export function clockFace(p: PixelCanvas, cx: number, cy: number, r: number, hh: number, mm: number, o: { rim?: string; face?: string; hand?: string; ticks?: boolean } = {}): void {
  const rim = o.rim ?? P.woodDark;
  p.ellipse(cx + 0.5, cy + 0.5, r + 1, r + 1, rim);
  p.ellipse(cx + 0.5, cy + 0.5, r, r, o.face ?? P.white);
  // lit upper-left arc of the rim
  p.set(cx - r, cy - 1, lt(rim));
  p.set(cx - r + 1, cy - r + 1, lt(rim));
  if (o.ticks ?? r >= 4) for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) p.set(cx + dx * (r - 1), cy + dy * (r - 1), P.steel);
  const hand = o.hand ?? P.ink;
  const ma = (mm / 60) * Math.PI * 2;
  const ha = ((hh % 12) / 12 + mm / 720) * Math.PI * 2;
  p.line(cx, cy, Math.round(cx + Math.sin(ma) * (r - 1)), Math.round(cy - Math.cos(ma) * (r - 1)), hand);
  p.line(cx, cy, Math.round(cx + Math.sin(ha) * (r - 2.2)), Math.round(cy - Math.cos(ha) * (r - 2.2)), hand);
  p.set(cx, cy, P.verm);
}

/** Small goods packets on a shelf row: coloured bags with a lit top and a label dot. */
export function goodsRow(p: PixelCanvas, x: number, y: number, w: number, h: number, seed: number, cols: string[] = [P.red, P.gold, P.aqua, P.leaf, P.crimson, P.blue, P.sun]): void {
  let cx = x;
  let k = 0;
  while (cx < x + w - 1) {
    const hh = ihash(k, seed, 811);
    const bw = 2 + (hh % 3);
    const bh = Math.max(2, h - (hh >>> 3) % 3);
    const c = cols[(hh >>> 6) % cols.length];
    const ww = Math.min(bw, x + w - cx);
    p.rect(cx, y + h - bh, ww, bh, c);
    p.hline(cx, cx + ww - 1, y + h - bh, lt(c));
    if (ww > 1) p.vline(cx + ww - 1, y + h - bh + 1, y + h - 1, dk(c));
    if (bh >= 4 && ww >= 3) p.set(cx + 1, y + h - bh + 2, (hh >>> 9) & 1 ? P.white : P.paper);
    cx += ww + ((hh >>> 12) % 4 === 0 ? 1 : 0);
    k++;
  }
}

/** Cardboard box (top face + front face) with tape and a printed mark. */
export function cardboard(p: PixelCanvas, x: number, y: number, w: number, h: number, top: number, seed = 0): void {
  const base = P.woodLt;
  p.rect(x, y, w, top, P.goldPale);
  p.rect(x, y + top, w, h - top, base);
  p.hline(x, x + w - 1, y + top, P.brass);
  p.vline(x + w - 1, y + top, y + h - 1, P.brassOld);
  p.hline(x, x + w - 1, y + h - 1, P.brassOld);
  // tape across the top and down the front
  const tx = x + Math.floor(w / 2) - 1;
  p.rect(tx, y, 2, top, P.paperGrid);
  p.rect(tx, y + top, 2, Math.min(3, h - top - 1), P.paperGrid);
  const hh = ihash(seed, x, 823);
  if (h - top >= 6 && w >= 8) {
    // printed mark: 「ワレモノ」 glass icon or an arrow pair
    const mx = x + 2 + (hh % Math.max(1, w - 7));
    const my = y + top + 2;
    if (hh & 1) {
      // 『ワレモノ』: a wine-glass icon
      p.vline(mx + 1, my + 1, my + 2, P.wood);
      p.hline(mx, mx + 2, my, P.wood);
      p.hline(mx, mx + 2, my + 3, P.wood);
    } else {
      // 『天地無用』: two arrows pointing up
      for (const ax of [mx, mx + 3]) {
        p.vline(ax + 1, my, my + 3, P.wood);
        p.set(ax, my + 1, P.wood);
        p.set(ax + 2, my + 1, P.wood);
      }
    }
  }
}

/** Plastic stool / chair seat seen from the front-top. */
export function stool(p: PixelCanvas, x: number, y: number, c: string): void {
  p.rect(x, y, 8, 3, c);
  p.hline(x, x + 7, y, lt(c));
  p.rect(x + 1, y + 3, 1, 5, dk(c));
  p.rect(x + 6, y + 3, 1, 5, dk(c));
  p.hline(x + 1, x + 6, y + 6, dk(c, 2));
}

/** A stack of paper sheets (forms) seen from above. */
export function paperStack(p: PixelCanvas, x: number, y: number, w: number, h: number): void {
  for (let k = 2; k >= 0; k--) {
    p.rect(x + k, y + k, w, h, k === 0 ? P.white : P.concreteLt);
  }
  printLines(p, x + 1, y + 1, w - 2, Math.max(1, Math.floor(h / 2)), P.concrete, x + y);
}

/** Seven-colour crayon kid drawing (sun, house or a stick family) with a red hanamaru. */
export function kidDrawing(p: PixelCanvas, x: number, y: number, w: number, h: number, seed: number): void {
  p.rect(x, y, w, h, P.white);
  p.hline(x, x + w - 1, y + h - 1, P.concreteLt);
  p.rect(x + Math.floor(w / 2) - 1, y - 1, 3, 1, P.goldPale);
  const kind = seed % 4;
  const cx = x + Math.floor(w / 2);
  if (kind === 0) {
    // sun with rays
    p.ellipse(cx - 1, y + 4, 2, 2, P.sun);
    p.set(cx - 4, y + 2, P.gold);
    p.set(cx + 2, y + 2, P.gold);
    p.hline(x + 1, x + w - 2, y + h - 3, P.leaf);
  } else if (kind === 1) {
    // house
    p.rect(cx - 3, y + 5, 6, 4, P.gold);
    p.line(cx - 4, y + 5, cx, y + 2, P.red);
    p.line(cx, y + 2, cx + 3, y + 5, P.red);
    p.set(cx - 1, y + 7, P.blue);
  } else if (kind === 2) {
    // two stick people holding hands
    p.set(cx - 3, y + 3, P.skin3);
    p.vline(cx - 3, y + 4, y + 7, P.blue);
    p.set(cx + 2, y + 3, P.skin3);
    p.vline(cx + 2, y + 4, y + 7, P.crimson);
    p.hline(cx - 2, cx + 1, y + 5, P.woodDark);
  } else {
    // a cat
    p.rect(cx - 3, y + 4, 5, 3, P.sun);
    p.set(cx - 3, y + 3, P.sun);
    p.set(cx + 1, y + 3, P.sun);
    p.set(cx - 2, y + 5, P.ink);
    p.hline(cx + 2, cx + 3, y + 6, P.sun);
  }
  // hanamaru (red spiral) in the corner
  p.ring(x + w - 3, y + h - 4, 2, 2, P.verm);
  p.set(x + w - 3, y + h - 4, P.verm);
}

/** A 1px long hanging cord. */
export function cord(p: PixelCanvas, x: number, y0: number, y1: number, c: string = P.charcoal): void {
  p.vline(x, y0, y1, c);
}

// ---------------------------------------------------------------- tiny hand-set katakana (5×7)
//
// Half-size DotGothic loses the dakuten (ガ reads as オ), so small balloons
// use these hand-set glyphs (30_level_art 6.2: signs get their own glyphs).

const KANA: Record<string, string[]> = {
  ア: ['#####', '....#', '..#.#', '..##.', '..#..', '.#...', '#....'],
  リ: ['#...#', '#...#', '#...#', '#...#', '....#', '...#.', '..#..'],
  カ: ['..#..', '#####', '..#.#', '..#.#', '.#..#', '.#..#', '#..#.'],
  ト: ['.#...', '.#...', '.##..', '.#.#.', '.#...', '.#...', '.#...'],
  ウ: ['..#..', '#####', '#...#', '#...#', '....#', '...#.', '.##..'],
  コ: ['#####', '....#', '....#', '....#', '....#', '....#', '#####'],
  サ: ['.#.#.', '#####', '.#.#.', '.#.#.', '...#.', '..#..', '.#...'],
  イ: ['....#', '...#.', '..#..', '.##..', '#.#..', '..#..', '..#..'],
  マ: ['#####', '....#', '...#.', '#.#..', '.#...', '..#..', '...#.'],
  シ: ['##..#', '....#', '#...#', '.#.#.', '...#.', '..#..', '##...'],
  タ: ['.#...', '.####', '#...#', '#.#.#', '...#.', '..#..', '##...'],
  セ: ['.#...', '.#..#', '#####', '.#.#.', '.#...', '.#...', '..###'],
  ン: ['#....', '.#..#', '....#', '....#', '...#.', '..#..', '##...'],
};
const DAKU: Record<string, string> = { ガ: 'カ', ゴ: 'コ', ザ: 'サ' };

/** Width of a string in the tiny kana. */
export function kanaWidth(s: string): number {
  let w = 0;
  for (const ch of s) w += DAKU[ch] ? 8 : 6;
  return Math.max(0, w - 1);
}

/** Draw tiny hand-set katakana (5×7, dakuten as two ticks). */
export function kanaSmall(p: PixelCanvas, s: string, x: number, y: number, c: string): number {
  let cx = x;
  for (const ch of s) {
    const base = DAKU[ch] ?? ch;
    const g = KANA[base];
    if (g) for (let j = 0; j < 7; j++) for (let i = 0; i < 5; i++) if (g[j][i] === '#') p.set(cx + i, y + j, c);
    if (DAKU[ch]) {
      p.set(cx + 5, y, c);
      p.set(cx + 5, y + 1, c);
      p.set(cx + 7, y, c);
      p.set(cx + 7, y + 1, c);
      cx += 8;
    } else cx += 6;
  }
  return cx - x;
}

export { finish, stand, standAnim, mkFrames, castRight, dk, lt };
