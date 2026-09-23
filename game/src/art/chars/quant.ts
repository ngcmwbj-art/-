// Palette budget and stage rim light for finished character sprites.
//
// finalizeSprite() runs once per sprite (registry.charSprite):
//  1. Palette law (30_level_art 7.1): every opaque pixel is snapped to the
//     master palette plus at most MAX_CUSTOM colors of the character's own.
//     Colors are ranked by how many pixels use them; a color close to one
//     already allowed joins it, a distinct one becomes a custom color (the
//     design's named character colors win when close), and once the budget
//     is spent everything left joins its nearest allowed color. Near-copies
//     of one tone collapse, so a material keeps its four tones and nothing
//     in between. Translucent pixels (the umbrella membrane, water, wings,
//     the shadow man's α70%) keep their see-through look but take an
//     allowed color and one of four alpha steps, so they add no colors of
//     their own either. Glows are drawn with opaque pixels in the first
//     place (glow.ts, the cone's beam).
//  2. Sunset rim (7.3 / 7.5): Fig writes the outline-column rim as marker
//     colors; their positions are recorded per canvas and painted with the
//     rim of the current stage. setRimLight() repaints every built sprite in
//     place, so actors holding a CharSprite see the change at once.

import { flag, state } from '../../game/state';
import {
  EXTRA_PACKED,
  MASTER_SET,
  SNAP_TARGETS,
  MAX_CUSTOM,
  RIM_DEFAULT,
  RIM_MARK,
  RIM_MARK_HI,
  nearest,
  packHex,
  snapTol,
} from './palette';
import type { CharSprite } from './registry';

/** Alpha steps for translucent pixels (see finalizeSprite). */
const ALPHAS = [0x55, 0x99, 0xb3, 0xdd];

function alphaStep(a: number): number {
  let best = ALPHAS[0];
  for (const s of ALPHAS) if (Math.abs(s - a) < Math.abs(best - a)) best = s;
  return best;
}

/** Colors closer than this (CIE94) to an allowed color join it. */
const SNAP = 6;
/** A 1–2px color merges into a well-used one closer than this. */
const RARE = 10;

const MARK = packHex(RIM_MARK);
const MARK_HI = packHex(RIM_MARK_HI);

export function spriteCanvases(s: CharSprite): HTMLCanvasElement[] {
  const set = new Set<HTMLCanvasElement>();
  const add = (c: HTMLCanvasElement | undefined) => c && set.add(c);
  for (const d of ['down', 'up', 'left', 'right'] as const) {
    s.walk[d]?.forEach(add);
    s.idle?.[d]?.forEach(add);
    s.run?.[d]?.forEach(add);
  }
  for (const c of Object.values(s.extra ?? {})) add(c);
  for (const o of Object.values(s.extraDir ?? {})) for (const c of Object.values(o)) add(c);
  for (const a of Object.values(s.anims ?? {})) a.frames.forEach(add);
  for (const o of Object.values(s.animsDir ?? {})) for (const a of Object.values(o)) a?.frames.forEach(add);
  return [...set];
}

/** Packed 0xRRGGBB of a little-endian RGBA Uint32 pixel. */
function rgbOf(v: number): number {
  return ((v & 255) << 16) | (v & 0xff00) | ((v >>> 16) & 255);
}

function pixOf(rgb: number): number {
  return (0xff000000 | ((rgb & 255) << 16) | (rgb & 0xff00) | ((rgb >>> 16) & 255)) >>> 0;
}

/** Choose the sprite palette: mapping of every off-palette color to its replacement. */
export function choosePalette(hist: Map<number, number>, budget = MAX_CUSTOM): { map: Map<number, number>; customs: number[] } {
  const allowed: number[] = [...SNAP_TARGETS];
  const customs: number[] = [];
  const map = new Map<number, number>();
  const off = [...hist.entries()].filter(([c]) => !MASTER_SET.has(c)).sort((a, b) => b[1] - a[1]);
  for (const [c] of off) {
    const [m, d] = nearest(c, allowed);
    if (d <= snapTol(c, SNAP)) {
      map.set(c, m);
      continue;
    }
    if (customs.length < budget) {
      const [e, de] = nearest(c, EXTRA_PACKED);
      const k = de <= SNAP ? e : c;
      if (!allowed.includes(k)) {
        allowed.push(k);
        customs.push(k);
      }
      if (k !== c) map.set(c, k);
      continue;
    }
    map.set(c, m);
  }
  return { map, customs };
}

// ---- rim light ------------------------------------------------------------

interface RimSpots {
  c: HTMLCanvasElement;
  lo: number[];
  hi: number[];
}

const spots: RimSpots[] = [];
let rimLo: string | null = RIM_DEFAULT;
let rimHi: string | null = '#F7C27A';
let manual = false;
let autoKey = '';

const OUTLINE = '#2A2440';

function paint(r: RimSpots): void {
  const g = r.c.getContext('2d')!;
  const w = r.c.width;
  const draw = (list: number[], col: string | null) => {
    if (!list.length) return;
    g.fillStyle = col ?? OUTLINE;
    for (const i of list) g.fillRect(i % w, (i / w) | 0, 1, 1);
  };
  draw(r.lo, rimLo);
  draw(r.hi, rimHi);
}

/**
 * Rim light color of the field (30_level_art 7.3): '#F2894B' at stages 0–1,
 * '#E0567A' at stage 2, '#F4E6A8' in the mall, null at night (the rim
 * pixels become plain outline). Repaints every built sprite in place.
 * Calling this switches the automatic stage tracking off; `auto()` turns
 * it back on.
 */
export function setRimLight(color: string | null, hi?: string | null): void {
  manual = true;
  applyRim(color, hi === undefined ? (color === RIM_DEFAULT ? '#F7C27A' : color) : hi);
}

/** Resume following flag_stage / the current map for the rim color. */
export function autoRimLight(): void {
  manual = false;
  autoKey = '';
  syncRimLight();
}

function applyRim(lo: string | null, hi: string | null): void {
  if (lo === rimLo && hi === rimHi) return;
  rimLo = lo;
  rimHi = hi;
  for (const r of spots) paint(r);
}

/** Rim colors for a stage and map (pal_stage0/1/2, pal_mall, pal_night). */
export function rimForStage(stage: number, map = ''): [string | null, string | null] {
  if (stage >= 3) return [null, null];
  if (map.startsWith('map_mall')) return ['#F4E6A8', '#F4E6A8'];
  if (stage === 2) return ['#E0567A', '#E0567A'];
  return [RIM_DEFAULT, '#F7C27A'];
}

/**
 * Follow the world's stage automatically (cheap; called from the frame
 * lookups the field uses every frame).
 */
export function syncRimLight(): void {
  if (manual) return;
  const st = flag('flag_stage') | 0;
  const key = `${st}|${state.map}`;
  if (key === autoKey) return;
  autoKey = key;
  const [lo, hi] = rimForStage(st, state.map);
  applyRim(lo, hi);
}

export function currentRim(): string | null {
  return rimLo;
}

// ---- finalize ---------------------------------------------------------------

export interface PaletteReport {
  /** Colors outside the 48-color master palette (opaque and translucent). */
  customs: string[];
  /** Distinct RGBA values over every frame (rim pixels at the current stage's color). */
  colors: number;
  /** Most distinct RGBA values in a single frame, and the average. */
  perFrameMax: number;
  perFrameAvg: number;
  /** Frames checked (every walk / idle / run / extra / anim frame). */
  frames: number;
  /** Translucent pixels over all frames, and their distinct RGBA values. */
  translucent: number;
  translucentColors: number;
}

const reports = new Map<string, PaletteReport>();

/**
 * Palette of a built sprite, measured on its finished canvases (every
 * frame: walk, idle, run, extras, anims — composited glows and boards
 * included), so it reports what is actually on screen.
 */
export function paletteReport(id: string): PaletteReport | undefined {
  return reports.get(id);
}

function measure(id: string, canv: HTMLCanvasElement[]): void {
  const all = new Set<number>();
  const off = new Set<number>();
  const trans = new Set<number>();
  let nTrans = 0;
  let maxF = 0;
  let sumF = 0;
  for (const c of canv) {
    const u = new Uint32Array(c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data.buffer);
    const fr = new Set<number>();
    for (let i = 0; i < u.length; i++) {
      const v = u[i];
      if (!(v >>> 24)) continue;
      fr.add(v);
      all.add(v);
      const rgb = rgbOf(v);
      if (v >>> 24 !== 255) {
        nTrans++;
        trans.add(v);
      }
      if (!MASTER_SET.has(rgb)) off.add(rgb);
    }
    maxF = Math.max(maxF, fr.size);
    sumF += fr.size;
  }
  reports.set(id, {
    customs: [...off].map((c) => '#' + c.toString(16).padStart(6, '0').toUpperCase()),
    colors: all.size,
    perFrameMax: maxF,
    perFrameAvg: Math.round((sumF / Math.max(1, canv.length)) * 10) / 10,
    frames: canv.length,
    translucent: nTrans,
    translucentColors: trans.size,
  });
}

/** Canvases already finalized (sprites that alias another sprite's frames). */
const done = new WeakSet<HTMLCanvasElement>();

export function finalizeSprite(s: CharSprite, budget = MAX_CUSTOM): CharSprite {
  const every = spriteCanvases(s);
  const canv = every.filter((c) => !done.has(c));
  if (!canv.length) {
    measure(s.id, every);
    return s;
  }
  for (const c of canv) done.add(c);
  const imgs = canv.map((c) => c.getContext('2d')!.getImageData(0, 0, c.width, c.height));
  const hist = new Map<number, number>();
  for (const im of imgs) {
    const u = new Uint32Array(im.data.buffer);
    for (let i = 0; i < u.length; i++) {
      const v = u[i];
      if (v >>> 24 !== 255) continue;
      const c = rgbOf(v);
      if (c === MARK || c === MARK_HI) continue;
      hist.set(c, (hist.get(c) ?? 0) + 1);
    }
  }
  const { map, customs } = choosePalette(hist, budget);
  // 1–2px tones: a color that never covers more than two pixels of a frame
  // joins the nearest better-used color when that one is close (an extra
  // step squeezed between two tones reads as noise, 7.2 / 7.9). Distinct
  // accents (a key, an LED) have nothing close and stay.
  const perFrameMax = new Map<number, number>();
  for (const im of imgs) {
    const u = new Uint32Array(im.data.buffer);
    const n = new Map<number, number>();
    for (let i = 0; i < u.length; i++) {
      const v = u[i];
      if (v >>> 24 !== 255) continue;
      let c = rgbOf(v);
      if (c === MARK || c === MARK_HI) continue;
      c = map.get(c) ?? c;
      n.set(c, (n.get(c) ?? 0) + 1);
    }
    for (const [c, k] of n) perFrameMax.set(c, Math.max(perFrameMax.get(c) ?? 0, k));
  }
  const solid = [...perFrameMax.entries()].filter(([, k]) => k > 2).map(([c]) => c);
  const merge = new Map<number, number>();
  if (solid.length)
    for (const [c, k] of perFrameMax) {
      if (k > 2) continue;
      const [m, d] = nearest(c, solid);
      if (d <= RARE) merge.set(c, m);
    }
  for (const [c] of hist) {
    const a = map.get(c) ?? c;
    const b = merge.get(a);
    if (b !== undefined) map.set(c, b);
  }
  const pix = new Map<number, number>();
  for (const [a, b] of map) pix.set(pixOf(a), pixOf(b));
  // translucent pixels: an allowed color (master or this sprite's own) and an alpha step
  const allowedAll = [...SNAP_TARGETS, ...customs];
  const allowedSet = new Set(allowedAll);
  const tmap = new Map<number, number>();
  const translucent = (v: number): number => {
    const c = rgbOf(v);
    let r = tmap.get(c);
    if (r === undefined) {
      const m = map.get(c) ?? c;
      r = allowedSet.has(m) || MASTER_SET.has(m) ? m : nearest(m, allowedAll)[0];
      tmap.set(c, r);
    }
    return ((pixOf(r) & 0x00ffffff) | (alphaStep(v >>> 24) << 24)) >>> 0;
  };
  imgs.forEach((im, k) => {
    const u = new Uint32Array(im.data.buffer);
    const lo: number[] = [];
    const hi: number[] = [];
    let dirty = false;
    for (let i = 0; i < u.length; i++) {
      const v = u[i];
      if (!(v >>> 24)) continue;
      if (v >>> 24 !== 255) {
        const t = translucent(v);
        if (t !== v) {
          u[i] = t;
          dirty = true;
        }
        continue;
      }
      const c = rgbOf(v);
      if (c === MARK) {
        lo.push(i);
        continue;
      }
      if (c === MARK_HI) {
        hi.push(i);
        continue;
      }
      const r = pix.get(v);
      if (r !== undefined) {
        u[i] = r;
        dirty = true;
      }
    }
    if (dirty) canv[k].getContext('2d')!.putImageData(im, 0, 0);
    if (lo.length || hi.length) {
      const r = { c: canv[k], lo, hi };
      spots.push(r);
      paint(r);
    }
  });
  measure(s.id, every);
  return s;
}
