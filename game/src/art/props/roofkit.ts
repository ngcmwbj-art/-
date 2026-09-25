// Rooftops seen from above (QA round 1): the flat roofs and tin roofs of the
// shopping street fill a third of the ginza / kawabe screens, so each gets a
// surface that reads as a material (concrete slab joints and hairline
// cracks, waterproof-sheet seams, dried puddle rings, the drain and its dirt
// fan, rain streaks under the parapet, moss in the damp corners, fallen
// leaves) and its own clutter (air-con rows with their pipes, a TV antenna,
// a laundry pole, planters, a skylight, a stair house...). Shadows between
// neighbouring roofs are painted as ambient occlusion at the roof's edges.
// All colours are palette colours so the kit's shade/light ramps apply.

import type { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { castRight, dk, lightRect, lt, shadeRect } from './kit';

type Rect = [number, number, number, number];

// ---------------------------------------------------------------- decks

/**
 * Concrete deck inside a parapet. 'slab': cast slabs with sealed expansion
 * joints and hairline cracks; 'sheet': a waterproof membrane laid in strips,
 * each overlap a lit edge and a shadow line.
 */
export function deckConcrete(p: PixelCanvas, x: number, y: number, w: number, h: number, base: string, seed: number, style: 'slab' | 'sheet' = 'slab'): void {
  const hi = lt(base);
  const lo = dk(base);
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      // a very quiet two-tone weathering, dithered where the tones meet (no camouflage)
      const n = valueNoise((i + seed * 7) / 44, (j + seed * 3) / 30, 931 + seed);
      let c = base;
      if (n > 0.7) c = (i + j) & 1 ? hi : base;
      if (n > 0.73) c = hi;
      if (style === 'sheet') {
        // strips 18px tall, every other strip a hair lighter (newer)
        const k = Math.floor((j - y) / 18);
        const r = (j - y) % 18;
        if (k % 2 === 1 && c === base && (i + j) % 3 === 0) c = hi;
        if (r === 0) c = hi; // the lit overlap edge
        if (r === 1) c = lo; // its shadow
        if (r === 0 && (i - x) % 6 === 3) c = lo; // weld dots along the seam
      } else {
        // expansion joints: every 30 × 22 px, filled with dark sealant; the sealant has cracked here and there
        const jx = (i - x) % 30 === 29;
        const jy = (j - y) % 22 === 21;
        if (jx || jy) c = h01(i, j, 941 + seed) < 0.12 ? hi : lo;
      }
      p.set(i, j, c);
    }
  if (style === 'slab') {
    // hairline cracks: short random walks
    for (let k = 0; k < Math.max(2, Math.round((w * h) / 900)); k++) {
      let cx = x + 4 + (ihash(k, 1, seed + 951) % Math.max(1, w - 8));
      let cy = y + 4 + (ihash(k, 2, seed + 951) % Math.max(1, h - 8));
      const len = 5 + (ihash(k, 3, seed) % 8);
      for (let s = 0; s < len; s++) {
        p.set(cx, cy, lo);
        const r = ihash(k, s, seed + 953) % 4;
        cx += r === 0 ? -1 : r === 1 ? 1 : 0;
        cy += r >= 2 ? 1 : 0;
        if (cx <= x || cx >= x + w - 1 || cy >= y + h - 1) break;
      }
    }
  }
}

/** Shade inside the parapet: the top and right inner edges, darker corners (AO). */
export function deckShade(p: PixelCanvas, x: number, y: number, w: number, h: number): void {
  shadeRect(p, x, y, w, 2, 1);
  shadeRect(p, x, y, w, 1, 1);
  shadeRect(p, x + w - 2, y, 2, h, 1);
  shadeRect(p, x, y + h - 1, w, 1, 1);
  for (const [cx, cy] of [[x, y], [x + w - 3, y], [x + w - 3, y + h - 3]] as [number, number][]) shadeRect(p, cx, cy, 3, 3, 1);
}

/** Rain streaks running from under the (north) parapet down the deck. */
export function streaks(p: PixelCanvas, x: number, y: number, w: number, seed: number, every = 9): void {
  for (let i = x + 2; i < x + w - 2; i++) {
    const hh = ihash(i, 7, seed + 961);
    if (hh % every) continue;
    const len = 3 + ((hh >>> 8) % 5);
    for (let j = 0; j < len; j++) if (j < 2 || (hh >>> (10 + j)) & 1) shadeRect(p, i, y + 2 + j, 1, 1, 1);
  }
}

/** A dried puddle ring (水たまりの跡): a dithered darker outline and dirt specks inside. */
export function puddleMark(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number, seed: number): void {
  for (let j = -ry - 1; j <= ry + 1; j++)
    for (let i = -rx - 1; i <= rx + 1; i++) {
      const wob = 1 + 0.18 * Math.sin(Math.atan2(j * 2, i) * 3 + seed);
      const d = Math.sqrt((i / (rx * wob)) ** 2 + (j / (ry * wob)) ** 2);
      if (d > 0.82 && d <= 1.02 && (i + j + seed) % 3 !== 0) shadeRect(p, cx + i, cy + j, 1, 1, 1);
      else if (d < 0.82 && h01(cx + i, cy + j, seed + 971) < 0.08) shadeRect(p, cx + i, cy + j, 1, 1, 1);
    }
}

/** Roof drain (ルーフドレン) with its grate, a rust ring and the dirt fanning in towards it. */
export function drain(p: PixelCanvas, x: number, y: number, seed: number): void {
  // dirt fan
  for (let j = -4; j <= 1; j++)
    for (let i = -6; i <= 8; i++) {
      const d = Math.hypot(i / 7, (j + 1) / 4);
      if (d < 1 && h01(x + i, y + j, seed + 981) < 0.45 * (1 - d)) shadeRect(p, x + i, y + j, 1, 1, 1);
    }
  p.rect(x, y, 4, 3, P.charcoal);
  p.hline(x, x + 3, y, P.asphalt);
  p.set(x + 1, y + 1, P.ink);
  p.set(x + 3, y + 1, P.ink);
  p.set(x - 1, y + 1, P.brassOld);
  p.set(x + 4, y + 2, P.brassOld);
  p.hline(x, x + 3, y + 3, P.wood);
}

/** Moss / algae in a damp corner: a clump of 1px leaf tones. */
export function moss(p: PixelCanvas, x: number, y: number, r: number, seed: number): void {
  for (let j = -r; j <= r; j++)
    for (let i = -r; i <= r; i++) {
      const d = Math.hypot(i, j * 1.3) / r;
      const hh = h01(x + i, y + j, seed + 991);
      if (d > 1 || hh > 0.8 - d * 0.5) continue;
      p.set(x + i, y + j, hh < 0.25 ? P.leafDeep : hh < 0.55 ? P.leafShade : P.leaf);
    }
}

/** A few fallen leaves (2–3px, in autumn-ish and green tones) with a 1px shade. */
export function leaves(p: PixelCanvas, r: Rect, n: number, seed: number): void {
  const cols = [P.brass, P.brassOld, P.leaf, P.sunDeep, P.woodLt];
  for (let k = 0; k < n; k++) {
    const hh = ihash(k, 5, seed + 1001);
    const lx = r[0] + 1 + (hh % Math.max(1, r[2] - 3));
    const ly = r[1] + 1 + ((hh >>> 9) % Math.max(1, r[3] - 3));
    const c = cols[(hh >>> 18) % cols.length];
    p.set(lx, ly, c);
    p.set(lx + 1, ly, c);
    if ((hh >>> 22) & 1) p.set(lx + 1, ly - 1, lt(c));
    shadeRect(p, lx + 1, ly + 1, 2, 1, 1);
  }
}

/** Ambient occlusion where this roof meets its neighbours: the east edge and the top edge darken. */
export function roofAO(p: PixelCanvas, x: number, y: number, w: number, h: number): void {
  shadeRect(p, x + w - 1, y, 1, h, 2);
  shadeRect(p, x + w - 2, y, 1, h, 1);
  shadeRect(p, x, y, w, 1, 1);
}

// ---------------------------------------------------------------- rooftop things

/** Outdoor air-con unit (12×9), top view with its fan grille, on a steel stand. */
export function acUnitTop(p: PixelCanvas, x: number, y: number, k = 0): void {
  castRight(p, x, y, 12, 10, 3);
  p.hline(x + 1, x + 10, y + 9, P.asphalt); // the stand
  p.rect(x, y, 12, 9, k % 3 === 2 ? P.concrete : P.concreteLt);
  p.hline(x, x + 11, y, P.white);
  p.vline(x, y, y + 8, P.white);
  p.hline(x, x + 11, y + 8, P.steel);
  p.vline(x + 11, y + 1, y + 8, P.steel);
  p.ellipse(x + 4.5, y + 4.5, 3.5, 3.5, P.charcoal);
  p.ring(x + 4.5, y + 4.5, 3.5, 3.5, P.steel);
  p.set(x + 4, y + 4, P.concrete);
  p.set(x + 3, y + 3, P.asphalt);
  for (let j = y + 2; j < y + 7; j += 2) p.hline(x + 8, x + 10, j, P.steel);
  if (k % 2) p.set(x + 9, y + 1, P.brassOld); // a rust spot
}

/** A row of air-con units and the insulated pipes running from them to the roof edge (east, then down). */
export function acRow(p: PixelCanvas, x: number, y: number, n: number, pipeTo: number): void {
  for (let k = 0; k < n; k++) acUnitTop(p, x + k * 14, y, k);
  // pipes: taped white insulation with the grey tape bands
  const py = y + 11;
  p.hline(x + 2, pipeTo, py, P.white);
  p.hline(x + 2, pipeTo, py + 1, P.concrete);
  for (let i = x + 4; i < pipeTo; i += 5) p.set(i, py, P.steel);
  for (let k = 0; k < n; k++) p.vline(x + k * 14 + 6, y + 9, py, P.concrete);
  shadeRect(p, x + 2, py + 2, pipeTo - x - 1, 1, 1);
}

/** Yagi TV antenna on a mast with guy wires and its shadow thrown east. */
export function tvAntenna(p: PixelCanvas, x: number, y0: number, y1: number): void {
  for (let j = y0 + 3; j <= y1; j += 1) if ((j & 1) === 0) shadeRect(p, x + 3 + Math.round((j - y0) * 0.35), j, 1, 1, 1);
  p.vline(x, y0, y1, P.steel);
  p.vline(x + 1, y0 + 2, y1, P.charcoal);
  for (const [dy, w] of [[1, 11], [4, 9], [7, 7], [10, 5]] as const) {
    p.hline(x - Math.floor(w / 2), x + Math.floor(w / 2), y0 + dy, P.concrete);
    for (let i = x - Math.floor(w / 2); i <= x + Math.floor(w / 2); i += 2) p.set(i, y0 + dy + 1, P.steel);
  }
  p.line(x, y0 + 8, x - 8, y1, P.asphalt);
  p.line(x + 1, y0 + 8, x + 9, y1, P.asphalt);
  p.rect(x - 1, y1 - 1, 4, 2, P.asphalt);
}

/** Laundry pole (物干し) on two stands, the clothes hanging from it: towels, T-shirts, socks, an apron. */
export function laundry(p: PixelCanvas, x: number, y: number, w: number, seed: number): void {
  for (const lx of [x, x + w - 1]) {
    p.vline(lx, y, y + 8, P.steel);
    p.hline(lx - 2, lx + 2, y + 8, P.asphalt);
    castRight(p, lx, y, 1, 8, 2);
  }
  p.hline(x, x + w - 1, y, P.concreteLt);
  p.hline(x, x + w - 1, y + 1, P.asphalt);
  type Cloth = { c: string; w: number; rows: string[] };
  const kinds: Cloth[] = [
    // towel with a stripe
    { c: P.white, w: 6, rows: ['######', '######', '#-----', '######', '######', '######', '/./././'] },
    // T-shirt: sleeves out, body down
    { c: P.blue, w: 8, rows: ['########', '########', '.######.', '..####..', '..####..', '..####..'] },
    // socks, a pair
    { c: P.goldPale, w: 5, rows: ['##.##', '##.##', '##.##', '###.###'] },
    // apron with ties
    { c: P.peach, w: 7, rows: ['.#####.', '#######', '.#####.', '.#####.', '.#####.', '..###..'] },
    { c: P.leafYoung, w: 6, rows: ['######', '######', '######', '#-##-#', '######'] },
    { c: P.white, w: 8, rows: ['########', '########', '.######.', '..####..', '..####..', '..####..', '..####..'] },
  ];
  let cx = x + 2;
  let k = ihash(seed, 1, 1011) % kinds.length;
  while (cx < x + w - 4) {
    const cl = kinds[k % kinds.length];
    if (cx + cl.w > x + w - 2) break;
    for (let j = 0; j < cl.rows.length; j++)
      for (let i = 0; i < cl.rows[j].length && i < cl.w + 1; i++) {
        const ch = cl.rows[j][i];
        if (ch === '.' || ch === undefined) continue;
        let c = cl.c;
        if (ch === '-') c = cl.c === P.white ? P.blue : P.white;
        else if (ch === '/') c = dk(cl.c);
        else if (j === 0) c = lt(cl.c);
        else if (i === cl.w - 1 || cl.rows[j][i + 1] === '.') c = dk(cl.c);
        p.set(cx + i, y + 2 + j, c);
      }
    p.set(cx + 1, y + 1, P.verm); // pegs
    p.set(cx + cl.w - 2, y + 1, P.aqua);
    castRight(p, cx, y + 2, cl.w, cl.rows.length, 2);
    cx += cl.w + 2;
    k++;
  }
}

/** Styrofoam planter boxes with vegetables / flowers (seed picks the planting). */
export function planters(p: PixelCanvas, x: number, y: number, n: number, seed: number): void {
  for (let k = 0; k < n; k++) {
    const px = x + k * 15;
    const kind = ihash(k, seed, 1021) % 3;
    castRight(p, px, y + 2, 13, 8, 2);
    p.rect(px, y + 4, 13, 6, kind === 2 ? P.skin4 : P.white);
    p.hline(px, px + 12, y + 4, kind === 2 ? P.skin3 : P.concreteLt);
    p.hline(px, px + 12, y + 9, kind === 2 ? P.wood : P.concrete);
    p.rect(px + 1, y + 5, 11, 2, P.woodDark); // soil
    for (let i = 0; i < 11; i += 2) {
      const hh = ihash(i, k, seed + 1023);
      const top = y + 1 + (hh % 3);
      p.vline(px + 1 + i, top, y + 5, P.leaf);
      p.set(px + 1 + i, top, P.leafYoung);
      if (kind === 1 && hh % 4 === 0) p.set(px + 1 + i, top, P.red);
      if (kind === 0 && hh % 5 === 0) p.set(px + 1 + i, top - 1, P.gold);
    }
  }
}

/** Skylight (天窓): a steel-framed glass box; the glass takes the sky (mask) with a diagonal glint. */
export function skylight(p: PixelCanvas, mask: PixelCanvas | null, x: number, y: number, w: number, h: number): void {
  castRight(p, x, y, w, h, 3);
  p.rect(x, y, w, h, P.steel);
  p.rect(x + 1, y + 1, w - 2, h - 2, P.navy);
  for (let i = 1; i < w - 1; i++) p.set(x + i, y + 1, P.blue);
  for (let k = 0; k < Math.min(w, h) - 3; k++) p.set(x + 2 + k, y + h - 3 - k, P.aqua);
  p.vline(x + Math.floor(w / 2), y + 1, y + h - 2, P.steel);
  p.hline(x, x + w - 1, y, P.concreteLt);
  if (mask) mask.rect(x + 1, y + 1, w - 2, h - 2, P.white);
}

/** Stair house (塔屋): its flat top, the south face with a steel door and a vent, shadow east. */
export function stairHouse(p: PixelCanvas, x: number, y: number, w: number, h: number, seed: number): void {
  const top = Math.round(h * 0.45);
  castRight(p, x, y, w, h, 4);
  // top
  deckConcrete(p, x, y, w, top, P.concreteLt, seed);
  p.hline(x, x + w - 1, y, P.white);
  p.vline(x, y, y + top - 1, P.white);
  p.hline(x, x + w - 1, y + top - 1, P.steel);
  // face
  p.rect(x, y + top, w, h - top, P.concrete);
  shadeRect(p, x, y + top, w, 1, 1);
  const dw = Math.min(7, w - 4);
  const dx = x + 2;
  p.rect(dx, y + top + 2, dw, h - top - 2, P.steel);
  p.vline(dx, y + top + 2, y + h - 1, P.concreteLt);
  p.set(dx + dw - 2, y + top + 2 + Math.floor((h - top - 2) / 2), P.charcoal);
  p.rect(x + w - 5, y + top + 2, 3, 2, P.asphalt);
  p.hline(x, x + w - 1, y + h - 1, P.asphalt);
  lightRect(p, x, y, 1, h, 1);
}

/** Round vent cap on a short pipe. */
export function ventCap(p: PixelCanvas, x: number, y: number): void {
  castRight(p, x, y, 5, 5, 2);
  p.ellipse(x + 2, y + 2, 2.6, 2.6, P.steel);
  p.set(x + 1, y + 1, P.concreteLt);
  p.set(x + 2, y + 2, P.asphalt);
  p.set(x + 3, y + 3, P.charcoal);
}

/** Galvanised storage box / cabinet. */
export function storageBox(p: PixelCanvas, x: number, y: number, w: number, h: number): void {
  castRight(p, x, y, w, h, 3);
  p.rect(x, y, w, h, P.concrete);
  p.hline(x, x + w - 1, y, P.concreteLt);
  p.hline(x, x + w - 1, y + h - 1, P.steel);
  for (let i = x + 2; i < x + w - 1; i += 3) p.vline(i, y + 2, y + h - 3, P.steel);
}

// ---------------------------------------------------------------- tin roofs

/**
 * Details over a corrugated tin roof: sheets of different age (one darker,
 * one newer), rust drips running down from the nail rows, a replaced
 * translucent sheet, the eave gutter (雨どい) with leaves caught in it and
 * dirt settled at the foot of the ribs.
 */
export function tinDetails(p: PixelCanvas, x: number, y: number, w: number, h: number, seed: number, opts: { clear?: boolean; rust?: number } = {}): void {
  const ridge = y + 3;
  const sheets = Math.floor(w / 24);
  // sheet ages
  for (let s = 0; s < sheets; s++) {
    const hh = ihash(s, 3, seed + 1101);
    const sx = x + s * 24;
    if (hh % 5 === 0) shadeRect(p, sx + 1, ridge, 23, h - (ridge - y) - 4, 1, (i, j) => (i - x) % 4 !== 0 || (j & 1) === 0);
    else if (hh % 7 === 1) lightRect(p, sx + 1, ridge, 23, h - (ridge - y) - 4, 1, (i) => (i - x) % 4 === 1);
    // sheet edge (overlap): a dark line and its shadow
    if (s > 0) {
      shadeRect(p, sx, ridge, 1, h - (ridge - y) - 4, 2);
      shadeRect(p, sx + 1, ridge, 1, h - (ridge - y) - 4, 1);
    }
  }
  // the translucent replacement sheet (波板の明かり取り)
  if (opts.clear) {
    const s = 1 + (ihash(seed, 9, 1103) % Math.max(1, sheets - 2));
    const sx = x + s * 24 + 1;
    for (let j = ridge + 1; j < y + h - 5; j++)
      for (let i = sx; i < sx + 22; i++) {
        const lx = (i - x) % 4;
        p.set(i, j, lx === 0 ? P.glint : lx === 3 ? P.aqua : (j + i) % 7 === 0 ? P.concreteLt : P.white);
      }
    for (let j = ridge + 3; j < y + h - 7; j += 5) p.set(sx + 10 + ((j * 3) % 7), j, P.steel); // leaves on top of it
  }
  // rust drips from nails (every 16px along each 18px course)
  const rust = opts.rust ?? 0.35;
  for (let j = ridge + 8; j < y + h - 6; j += 18)
    for (let i = x + 2; i < x + w - 2; i += 8) {
      const hh = ihash(i, j, seed + 1107);
      if (h01(i, j, seed + 1109) > rust) continue;
      const len = 2 + (hh % 6);
      for (let k = 0; k < len; k++) p.set(i + (k > 3 ? 1 : 0), j + 1 + k, k < 2 ? P.wood : k < len - 1 ? P.brassOld : P.brass);
    }
  // rust band along the eave (dithered)
  for (let i = x; i < x + w; i++) {
    if (h01(i, 1, seed + 1111) < rust * 0.9) p.set(i, y + h - 4, P.brassOld);
    if (h01(i, 2, seed + 1111) < rust * 0.45) p.set(i, y + h - 5, P.wood);
  }
  // dirt settled in the valleys near the eave
  for (let i = x + 3; i < x + w; i += 4) if (h01(i, 3, seed + 1113) < 0.6) shadeRect(p, i, y + h - 7, 1, 2, 1);
  // gutter: a half pipe along the eave, lit rim, a downpipe outlet at the east end
  p.hline(x, x + w - 1, y + h - 3, P.concreteLt);
  p.hline(x, x + w - 1, y + h - 2, P.steel);
  p.hline(x, x + w - 1, y + h - 1, P.asphalt);
  p.rect(x + w - 6, y + h - 3, 3, 3, P.charcoal);
  p.set(x + w - 5, y + h - 3, P.asphalt);
  leaves(p, [x + 2, y + h - 4, w - 10, 2], Math.max(2, Math.round(w / 24)), seed);
}

/** A blue tarp (ブルーシート) over a leak, its folds and grommets, held down by two old tyres. */
export function tarp(p: PixelCanvas, x: number, y: number, w: number, h: number, seed: number): void {
  castRight(p, x, y, w, h, 2);
  for (let j = y; j < y + h; j++)
    for (let i = x; i < x + w; i++) {
      // wavy folds running across the sheet
      const f = Math.sin((i - x) * 0.45 + (j - y) * 0.9 + seed) + Math.sin((i - x) * 0.13 - (j - y) * 0.4);
      p.set(i, j, f > 1.1 ? P.aqua : f < -0.9 ? P.navy : P.blue);
    }
  p.hline(x, x + w - 1, y, P.aqua);
  p.hline(x, x + w - 1, y + h - 1, P.navy);
  for (const [gx, gy] of [[x + 1, y + 1], [x + w - 2, y + 1], [x + 1, y + h - 2], [x + w - 2, y + h - 2]] as [number, number][]) p.set(gx, gy, P.concreteLt);
  // tyres
  for (const [tx, ty] of [[x + 3, y + 2], [x + w - 11, y + h - 9]] as [number, number][]) {
    castRight(p, tx, ty, 8, 7, 2);
    p.ellipse(tx + 4, ty + 3.5, 4, 3.5, P.charcoal);
    p.ellipse(tx + 4, ty + 3.5, 2, 1.6, P.blue);
    p.set(tx + 2, ty + 1, P.asphalt);
    p.set(tx + 3, ty + 1, P.asphalt);
  }
}
