// The dark and the tomato light (52 8.4 / 8.5, 50 4.5, 51 11.3, 02_ch2 6.3).
//
// A map lists its dark tiles (MapDef.dark). In the light map (render.ts,
// the canvas multiplied over the graded world) they are painted DARK_COL —
// since 2026-09-26 (the client's "4:59 is nearly morning; it's too hard to
// see") a step darker than the ordinary night, not black: the ground, the
// paths, fences, trees, people, symbols and things to examine all still
// read in it. The border is dithered 3 steps deep into the dark (1/3, 2/3,
// full over 12px, 2px cells) and wobbled ±2px so no tile corner shows.
// Without the lantern Minato keeps a little of the ordinary night round his
// feet (16px, dithered out to 24px). With the はなまるトマト in his net
// (flag_ch2_got_tomato) three rings are *mixed* over the light map
// (source-over, not added: the night under them is blue, adding would never
// give a warm colour): in the dark they bring back the warm colour and the
// detail; on the ordinary night and in the lit rooms they are only a warm
// wash, never a spotlight.
//
// Everything is drawn and examinable in the dark too. Only the little finds
// off the story's path that the light alone brings out (MapObj litOnly: the
// child's footprints, the hearth) are drawn — and examinable — while inside
// the light (R − 6px from its centre): they fade in over 0.15 s and out over
// 0.25 s. Symbols in the dark are always seen; they only notice Minato once
// the light's edge (R + 8px) reaches them (symbols.ts: 「？」 and 0.5 s).
//
// Everything expensive is cached: the dark coverage once per map, the ring
// images once per radius (the radius breathes 69–75px at 0.8 Hz in whole
// pixels, so 7 images), the fans of テツヤ's headlight once per angle.

import { makeCanvas } from '../engine/pixel';
import { valueNoise } from '../engine/rng';
import { ease } from '../engine/tween';
import { flag } from '../game/state';
import type { Actor } from './actor';
import type { FieldScene, PropInst } from './field';
import { condOk, currentStage, isCh2Map, type LoadedMap } from './maps';
import type { DarkLight, ExamineObj, StarlightSpot, TileRect } from './types';
import { lanternOf } from '../art/chars/nightlight';
import { roomMorningK } from './hoshi';

/** Lantern radius (px), breathing amplitude (px) and rate (Hz) — 52 8.5. */
export const LANTERN_R = 72;
export const LANTERN_AMP = 3.2;
export const LANTERN_HZ = 0.8;
/** Colour of the dark in the light map: a step darker than the night of pal_h0 (#9894C4). */
export const DARK_COL = '#46446E';
/** The starlight round Minato's feet in a room's dark part (the night through its windows). */
export const STARLIGHT_ROOM = '#7C78AA';
/** Things are shown within R − 6px, symbols within R + 8px (02_ch2 5章 #9). */
export const SHOW_MARGIN = -6;
export const SYM_MARGIN = 8;
const FADE_IN = 150;
const FADE_OUT = 250;

// ---------------------------------------------------------------- defaults (52 1.7)

/**
 * Used when a 星見台 map doesn't give MapDef.dark / darkLights / starlight
 * itself. The greenhouse has its lamps on and the barn its tubes (2026-09-26):
 * only 南5 of the barn, under its one dead tube, is dim.
 */
const DEFAULT_DARK: Record<string, TileRect[]> = {
  map_hoshimidai: [{ x: 37, y: 0, w: 23, h: 18 }],
  map_hoshi_barn: [{ x: 17, y: 8, w: 3, h: 3 }],
  map_hoshi_school: [{ x: 10, y: 0, w: 16, h: 12 }],
  map_hoshi_hill: [{ x: 0, y: 8, w: 24, h: 12 }],
};
const DEFAULT_DARK_LIGHTS: Record<string, DarkLight[]> = {
  // the はなまるトマト on its vine (5,2), 5th truss: until it is picked — it
  // has to glow in the lit house too (its halo, 52 4.2)
  map_hoshi_house: [{ x: 5, y: 2, ox: 8, oy: 4, r: 88, amp: 4, k: 1, halo: 18, cond: { notFlag: ['flag_ch2_got_tomato', 'flag_ch2_tomato_picked'] } }],
};
const DEFAULT_STARLIGHT: Record<string, StarlightSpot[]> = {};

export function darkRectsOf(m: LoadedMap): TileRect[] {
  return m.def.dark ?? (isCh2Map(m.def) ? DEFAULT_DARK[m.id] ?? [] : []);
}
function darkLightsOf(m: LoadedMap): DarkLight[] {
  return m.def.darkLights ?? DEFAULT_DARK_LIGHTS[m.id] ?? [];
}
function starlightOf(m: LoadedMap): StarlightSpot[] {
  return m.def.starlight ?? DEFAULT_STARLIGHT[m.id] ?? [];
}

// ---------------------------------------------------------------- dark coverage (per map)

interface DarkMap {
  /** 1 per dark tile. */
  tiles: Uint8Array;
  w: number;
  h: number;
  any: boolean;
  /** #10101A where it is dark (the dithered, wobbled border included), transparent elsewhere; map-sized. */
  canvas: HTMLCanvasElement | null;
}

const darkCache = new WeakMap<LoadedMap, DarkMap>();

export function darkOf(m: LoadedMap): DarkMap {
  let d = darkCache.get(m);
  if (d) return d;
  const tiles = new Uint8Array(m.w * m.h);
  let any = false;
  for (const r of darkRectsOf(m))
    for (let y = Math.max(0, r.y); y < Math.min(m.h, r.y + r.h); y++)
      for (let x = Math.max(0, r.x); x < Math.min(m.w, r.x + r.w); x++) {
        tiles[y * m.w + x] = 1;
        any = true;
      }
  d = { tiles, w: m.w, h: m.h, any, canvas: null };
  darkCache.set(m, d);
  return d;
}

/** Is tile (tx, ty) a dark tile? (tiles off the map continue the edge: dark if the edge is). */
export function isDarkTile(m: LoadedMap, tx: number, ty: number): boolean {
  const d = darkOf(m);
  if (!d.any) return false;
  const x = Math.max(0, Math.min(d.w - 1, tx));
  const y = Math.max(0, Math.min(d.h - 1, ty));
  return d.tiles[y * d.w + x] === 1;
}

/** Is world pixel (x, y) on a dark tile? */
export function isDarkPx(m: LoadedMap, x: number, y: number): boolean {
  return isDarkTile(m, Math.floor(x / 16), Math.floor(y / 16));
}

function hexRgb(h: string): [number, number, number] {
  const v = parseInt(h.replace('#', ''), 16);
  return [(v >> 16) & 255, (v >> 8) & 255, v & 255];
}

/** The dark coverage canvas of a map (built on first use; null when the map has no dark). */
function darkCanvas(m: LoadedMap): HTMLCanvasElement | null {
  const d = darkOf(m);
  if (!d.any) return null;
  if (d.canvas) return d.canvas;
  const W = m.w * 16;
  const H = m.h * 16;
  const [c, ctx] = makeCanvas(W, H);
  const img = ctx.createImageData(W, H);
  const px = new Uint32Array(img.data.buffer);
  const [cr, cg, cb] = hexRgb(m.def.darkCol ?? DARK_COL);
  const col = (0xff << 24) | (cb << 16) | (cg << 8) | cr; // ABGR
  // the dithered edge: 3 steps over `edge` px (12 by default)
  const edge = Math.max(3, m.def.darkEdge ?? 12);
  const wob = edge >= 9 ? 2 : 1;
  const dark = (tx: number, ty: number) => isDarkTile(m, tx, ty);
  for (let ty = 0; ty < m.h; ty++)
    for (let tx = 0; tx < m.w; tx++) {
      const me = dark(tx, ty);
      // neighbours whose state differs: their rects bound the border band
      const diff: [number, number][] = [];
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) if ((dx || dy) && dark(tx + dx, ty + dy) !== me) diff.push([dx, dy]);
      if (!me && !diff.length) continue;
      if (me && !diff.length) {
        // deep in the dark: the whole tile
        for (let ly = 0; ly < 16; ly++) px.fill(col, (ty * 16 + ly) * W + tx * 16, (ty * 16 + ly) * W + tx * 16 + 16);
        continue;
      }
      for (let ly = 0; ly < 16; ly++)
        for (let lx = 0; lx < 16; lx++) {
          const wx = tx * 16 + lx;
          const wy = ty * 16 + ly;
          let e = Infinity;
          for (const [dx, dy] of diff) {
            // distance from the pixel centre to that neighbour tile's rect
            const cx = lx + 0.5;
            const cy = ly + 0.5;
            const ex = dx < 0 ? cx : dx > 0 ? 16 - cx : 0;
            const ey = dy < 0 ? cy : dy > 0 ? 16 - cy : 0;
            e = Math.min(e, Math.hypot(ex, ey));
          }
          // signed: + into the dark, − out of it; then the ±2px wobble
          let s = me ? e : -e;
          if (e < 16) s += (valueNoise(wx / 7, wy / 7, 4711) * 2 - 1) * wob;
          if (s < 0) continue;
          const density = s < edge / 3 ? 1 : s < (edge * 2) / 3 ? 2 : 3;
          if (density < 3) {
            const v = ((((wx >> 1) + 2 * (wy >> 1)) % 3) + 3) % 3;
            if (v >= density) continue;
          }
          px[wy * W + wx] = col;
        }
    }
  ctx.putImageData(img, 0, 0);
  d.canvas = c;
  return c;
}

// ---------------------------------------------------------------- ring images (per radius)

type RingMode = 'in' | 'out' | 'room';
const RING_COL: [number, number, number][] = [
  [0xff, 0xe7, 0xc0], // centre #FFE7C0
  [0xf7, 0xb0, 0x70], // middle #F7B070
  [0xf2, 0x89, 0x4b], // rim    #F2894B
];
/**
 * Mixing strength of the three rings (52 8.5): in the dark (the warm colour
 * and the detail come back), on the ordinary night (a warm wash over the
 * lighter night of 2026-09-26, not a spotlight) and in a lit room (the
 * barn's tubes, the greenhouse's lamps: just a warmth round him).
 */
const RING_A: Record<RingMode, number[]> = { in: [0.85, 0.6, 0.3], out: [0.42, 0.28, 0.14], room: [0.22, 0.16, 0.09] };

const ringCache = new Map<string, HTMLCanvasElement>();

/** The three rings of radius r (size 2r+1, centre at (r, r)), for mixing in or out of the dark. */
export function ringImage(r: number, mode: RingMode): HTMLCanvasElement {
  const key = `${r}:${mode}`;
  const hit = ringCache.get(key);
  if (hit) return hit;
  const size = r * 2 + 1;
  const [c, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const t = [0.3 * r, 0.6 * r, r];
  const A = RING_A[mode];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - r, y - r);
      // which ring: 2px checker across each border (light.ts `step`)
      let zone = 3;
      for (let k = 0; k < 3; k++) {
        const b = t[k];
        if (dist < b - 1) {
          zone = k;
          break;
        }
        if (dist < b + 1) {
          zone = (x + y) & 1 ? k : k + 1;
          break;
        }
      }
      if (zone >= 3) continue;
      const i = (y * size + x) * 4;
      const [cr, cg, cb] = RING_COL[zone];
      d[i] = cr;
      d[i + 1] = cg;
      d[i + 2] = cb;
      d[i + 3] = Math.round(A[zone] * 255);
    }
  ctx.putImageData(img, 0, 0);
  ringCache.set(key, c);
  if (ringCache.size > 160) {
    // radii of the lighting-up animation are not needed again
    const first = ringCache.keys().next().value as string;
    ringCache.delete(first);
  }
  return c;
}

const starCache = new Map<number, HTMLCanvasElement>();
/** Starlight disc: full inside r, a 50% checker out to r + 8 (white; tinted to the base colour when used). */
function starDisc(r: number): HTMLCanvasElement {
  const hit = starCache.get(r);
  if (hit) return hit;
  const R = r + 8;
  const size = R * 2 + 1;
  const [c, ctx] = makeCanvas(size, size);
  ctx.fillStyle = '#fff';
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - R, y - R);
      if (d <= r || (d <= R && (x + y) % 2 === 0)) ctx.fillRect(x, y, 1, 1);
    }
  starCache.set(r, c);
  return c;
}

const fanCache = new Map<number, HTMLCanvasElement>();
const FAN_LEN = 64;
const FAN_STEPS = 48;
/**
 * テツヤ's headlight (52 8.5 例外): a 64px fan of #FFE7A3 in 3 steps (α .5 /
 * .33 / .17) opening ±28° from `angle` (radians, 0 = east, π/2 = south),
 * for adding into the light map. Centre of the image = the lamp.
 */
export function fanImage(angle: number): HTMLCanvasElement {
  const k = ((Math.round((angle / (Math.PI * 2)) * FAN_STEPS) % FAN_STEPS) + FAN_STEPS) % FAN_STEPS;
  const hit = fanCache.get(k);
  if (hit) return hit;
  const a0 = (k / FAN_STEPS) * Math.PI * 2;
  const size = FAN_LEN * 2 + 1;
  const [c, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const half = (28 * Math.PI) / 180;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = x - FAN_LEN;
      const dy = y - FAN_LEN;
      const dist = Math.hypot(dx, dy);
      if (dist > FAN_LEN || dist < 2) continue;
      let da = Math.atan2(dy, dx) - a0;
      da = Math.atan2(Math.sin(da), Math.cos(da));
      // the cone narrows at the lamp and its sides are dithered 2px
      const edge = Math.abs(da) - half;
      if (edge > 0.04) continue;
      if (edge > -0.04 && (x + y) & 1) continue;
      const u = dist / FAN_LEN;
      let step = u < 1 / 3 ? 0 : u < 2 / 3 ? 1 : 2;
      const b = [FAN_LEN / 3, (FAN_LEN * 2) / 3][step];
      if (b !== undefined && Math.abs(dist - b) < 1 && (x + y) & 1) step = Math.min(2, step + 1);
      if (dist > FAN_LEN - 2 && (x + y) & 1) continue;
      const a = [0.5, 0.33, 0.17][step];
      const i = (y * size + x) * 4;
      d[i] = 0xff * a;
      d[i + 1] = 0xe7 * a;
      d[i + 2] = 0xa3 * a;
      d[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  fanCache.set(k, c);
  return c;
}

const haloCache = new Map<string, HTMLCanvasElement>();
/**
 * The halo of a light that has to read in a lit room too (DarkLight.halo:
 * the はなまるトマト among the greenhouse's lamps, 52 4.2), in two layers,
 * both 3 steps with a 2px checker between them, centre at (R, R):
 * - 'core' (screened over the frame, radius r): #FFE7A3 / #F7B070 / #F2894B
 *   at α .7 / .45 / .22 — the fruit shines;
 * - 'veil' (mixed over it, radius 1.8r): #F7B070 / #F2894B / #F2894B at
 *   α .26 / .16 / .08 — the sunset colour round it, which screening alone
 *   would bleach out on the lamps' white.
 */
export function haloImage(r: number, layer: 'core' | 'veil' = 'core'): HTMLCanvasElement {
  const key = `${r}:${layer}`;
  const hit = haloCache.get(key);
  if (hit) return hit;
  const R = layer === 'core' ? r : Math.round(r * 1.8);
  const size = R * 2 + 1;
  const [c, ctx] = makeCanvas(size, size);
  const img = ctx.createImageData(size, size);
  const d = img.data;
  const t = [0.35 * R, 0.68 * R, R];
  const A = layer === 'core' ? [0.7, 0.45, 0.22] : [0.26, 0.16, 0.08];
  const C = layer === 'core' ? [[0xff, 0xe7, 0xa3], RING_COL[1], RING_COL[2]] : [RING_COL[1], RING_COL[2], RING_COL[2]];
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dist = Math.hypot(x - R, y - R);
      let zone = 3;
      for (let k = 0; k < 3; k++) {
        if (dist < t[k] - 1) {
          zone = k;
          break;
        }
        if (dist < t[k] + 1) {
          zone = (x + y) & 1 ? k : k + 1;
          break;
        }
      }
      if (zone >= 3) continue;
      const i = (y * size + x) * 4;
      const col = C[zone];
      d[i] = col[0];
      d[i + 1] = col[1];
      d[i + 2] = col[2];
      d[i + 3] = Math.round(A[zone] * 255);
    }
  ctx.putImageData(img, 0, 0);
  haloCache.set(key, c);
  if (haloCache.size > 40) haloCache.delete(haloCache.keys().next().value as string);
  return c;
}

// ---------------------------------------------------------------- the light state of the field

export interface LightCircle {
  x: number;
  y: number;
  r: number;
  /** Strength of its rings (1 = the lantern). */
  k: number;
  kind: 'lantern' | 'fixed' | 'star';
  /** A halo (px) screened over the frame so it reads in a lit room too (DarkLight.halo). */
  halo?: number;
}

/** Is the lantern (the はなまるトマト in Minato's net) lit here? */
export function lanternWanted(f: FieldScene): boolean {
  if (override !== null) return override;
  if (!isCh2Map(f.map.def)) return false;
  if (!flag('flag_ch2_got_tomato')) return false;
  if (flag('flag_ch2_stage') >= 3) return false;
  return !flag('flag_ch2_lantern_off');
}

let override: boolean | null = null;
/** Scripts: force the lantern on / off (null = by the flags). */
export function setLanternOverride(on: boolean | null): void {
  override = on;
}

/** The tomato held in Minato's hands / freshly in the net, before fx_h_lantern_on opens it (px). */
const HELD_R = 22;
/** A lantern lit mid-scene that nobody opens with lanternOn() opens by itself after this long (ms). */
const HELD_MAX = 9000;

export class LightState {
  /** The lantern this frame (null: not lit). */
  lantern: LightCircle | null = null;
  /** Every light that reveals dark things this frame. */
  sources: LightCircle[] = [];
  /** 0..1 progress of fx_h_lantern_on (1 = done). */
  onT = 1;
  private onDur = 800;
  /**
   * The lantern was lit during this map (evt_ch2_tomato gives the tomato,
   * then evt_ch2_light opens its circle): it glows small in the net until
   * lightUp() — so the item pages between the two don't show the full circle.
   */
  private held = false;
  private heldT = 0;
  private wasWanted: boolean | null = null;
  /** A swell of the lights standing in the dark (pulseDarkLight): strength × k for ms. */
  private pulseK = 1;
  private pulseT = 0;
  private pulseDur = 0;
  private vis = new WeakMap<object, number>();
  /** Radius override (QA: __game.cmd.lanternR). */
  forceR: number | null = null;
  private lastMap: LoadedMap | null = null;
  /** Things whose visibility follows the light; `lit`: litOnly (also off the dark). */
  private darkThings: { key: object; x: number; y: number; lit: boolean }[] = [];

  constructor(private f: FieldScene) {}

  /** Does the current map have dark tiles (while it's night: none in the morning)? */
  get hasDark(): boolean {
    return darkOf(this.f.map).any && this.darkK() > 0.001 && !darkOffFlag();
  }

  /**
   * How strong the dark is (0..1): 1 through the night; gone in the
   * morning — in a room it goes as the morning comes in (the barn's dim pen
   * in ending cut 2a, hoshi.ts roomMorningK).
   */
  darkK(): number {
    const m = this.f.map;
    if (!isCh2Map(m.def)) return 1;
    if (m.def.kind === 'indoor') return 1 - roomMorningK(this.f);
    return currentStage() <= 2 ? 1 : 0;
  }

  /** fx_h_lantern_on: the circle opens 24 → 72px over 0.8 s (ease-out) with a light ring running once. */
  lightUp(ms = 800): void {
    this.held = false;
    this.heldT = 0;
    this.onT = 0;
    this.onDur = Math.max(1, ms);
  }

  /** Is the lantern lit but still waiting, small, for lightUp()? */
  get waiting(): boolean {
    return this.held;
  }

  /** The lights standing in the dark swell (× k, sin envelope over ms). */
  pulse(k = 1.5, ms = 300): void {
    this.pulseK = k;
    this.pulseT = 0;
    this.pulseDur = Math.max(1, ms);
  }

  /** Current swell factor of the fixed dark lights (1 = none). */
  private swell(): number {
    if (this.pulseT >= this.pulseDur) return 1;
    return 1 + (this.pulseK - 1) * Math.sin(Math.PI * (this.pulseT / this.pulseDur));
  }

  /** Current lantern radius (px, whole pixels). */
  radius(t: number): number {
    if (this.forceR !== null) return this.forceR;
    if (this.held) return Math.round(HELD_R + 1.5 * Math.sin(2 * Math.PI * LANTERN_HZ * (t / 1000)));
    const breathe = LANTERN_R + LANTERN_AMP * Math.sin(2 * Math.PI * LANTERN_HZ * (t / 1000));
    if (this.onT < 1) return Math.round(24 + (breathe - 24) * ease.cubicOut(this.onT));
    return Math.round(breathe);
  }

  /**
   * The pool's centre: where Minato's frame says his net hangs (chars'
   * lanternOf: his feet + (−4, −6), 12px higher while he holds it up),
   * bobbing 1px with his steps. Also the frame's radius scale (×1.2 held up).
   */
  lanternCentre(): [number, number, number] {
    const p = this.f.player;
    let bob = 0;
    if (p.moving) {
      const ms = p.running ? p.sprite.runFrameMs ?? 85 : p.sprite.walkFrameMs ?? 130;
      bob = Math.floor(p.walkT / ms) % 2 ? -1 : 0;
    }
    let dx = -4;
    let dy = -6;
    let scale = 1;
    const info = lanternOf(p.frame());
    if (info) {
      dx = info.dx + p.ox;
      dy = info.dy + p.oy;
      scale = info.scale;
      // the walking frames carry the bob already
      if (p.moving) bob = 0;
    }
    return [Math.round(p.x + dx), Math.round(p.y + dy + bob), scale];
  }

  update(dt: number): void {
    const f = this.f;
    const m = f.map;
    if (m !== this.lastMap) {
      this.lastMap = m;
      this.collectDarkThings();
    }
    if (this.onT < 1) this.onT = Math.min(1, this.onT + dt / this.onDur);
    if (this.pulseT < this.pulseDur) this.pulseT += dt;
    const wanted = lanternWanted(f);
    // lit while on this map (not on arrival): wait, small, for lightUp()
    if (this.wasWanted === false && wanted && this.forceR === null) {
      this.held = true;
      this.heldT = 0;
    }
    if (!wanted) this.held = false;
    this.wasWanted = wanted;
    if (this.held && (this.heldT += dt) > HELD_MAX) this.lightUp(800);
    const src: LightCircle[] = [];
    this.lantern = null;
    if (wanted && f.player.visible) {
      const [x, y, scale] = this.lanternCentre();
      const r = this.radius(f.t);
      this.lantern = { x, y, r: this.forceR === null && !this.held ? Math.round(r * scale) : r, k: this.held ? 0.75 : 1, kind: 'lantern' };
      src.push(this.lantern);
    } else if (!wanted && f.player.visible && m.id === 'map_hoshi_house' && flag('flag_ch2_tomato_picked') && !flag('flag_ch2_got_tomato')) {
      // the はなまるトマト has dropped into his hands (evt_ch2_tomato): its glow goes with him
      const r = Math.round(HELD_R + 1.5 * Math.sin(2 * Math.PI * LANTERN_HZ * (f.t / 1000)));
      src.push({ x: Math.round(f.player.x), y: Math.round(f.player.y - 12), r, k: 0.6, kind: 'fixed', halo: 10 });
    }
    const sw = this.swell();
    for (const l of darkLightsOf(m)) {
      if (!condOk(l.cond)) continue;
      const r = Math.round(l.r + (l.amp ?? 0) * Math.sin(2 * Math.PI * LANTERN_HZ * (f.t / 1000)) + (sw - 1) * 24);
      src.push({ x: l.x * 16 + (l.ox ?? 8), y: l.y * 16 + (l.oy ?? 8), r, k: Math.min(1, (l.k ?? 1) * sw), kind: 'fixed', halo: l.halo ? Math.round(l.halo * sw) : undefined });
    }
    for (const s of starlightOf(m)) if (condOk(s.cond)) src.push({ x: s.x * 16 + 8, y: s.y * 16 + 8, r: Math.round(s.r * 16), k: 0, kind: 'star' });
    if (!this.lantern && m.def.darkStar !== false) {
      // the ordinary night round Minato's feet (16px, 50% out to 24px)
      src.push({ x: Math.round(f.player.x), y: Math.round(f.player.y - 4), r: 16, k: 0, kind: 'star' });
    }
    this.sources = src;
    // only the little finds shown by the light alone (litOnly) fade in and out
    for (const d of this.darkThings) this.fade(d.key, this.inLight(d.x, d.y, SHOW_MARGIN), dt);
  }

  private fade(key: object, on: boolean, dt: number): void {
    const cur = this.vis.get(key) ?? 0;
    const next = on ? Math.min(1, cur + dt / FADE_IN) : Math.max(0, cur - dt / FADE_OUT);
    this.vis.set(key, next);
  }

  /** Is world point (x, y) within `margin` px of the edge of a light? */
  inLight(x: number, y: number, margin = 0): boolean {
    for (const s of this.sources) {
      const r = s.kind === 'star' ? s.r : s.r + margin;
      if (r <= 0) continue;
      const dx = x - s.x;
      const dy = y - s.y;
      if (dx * dx + dy * dy <= r * r) return true;
    }
    return false;
  }

  /**
   * How much the tomato light is *the* light at world point (x, y), for its
   * short shadows and its rims (2026-09-26): full in the dark, a little less
   * on the lighter night, and in a lit room (the barn's tubes, the
   * greenhouse's lamps, the meeting room) no shadows and only a faint rim.
   */
  lightWeight(x: number, y: number, what: 'shadow' | 'rim'): number {
    const m = this.f.map;
    if (this.hasDark && isDarkPx(m, x, y)) return Math.min(1, this.darkK());
    if (m.def.kind === 'indoor') return what === 'shadow' ? 0 : 0.35;
    return 0.8;
  }

  /** Is this actor standing in the dark (its feet on a dark tile)? */
  actorInDark(a: Actor): boolean {
    if (!this.hasDark) return false;
    if (a.kind === 'player' || a.kind === 'follower') return false;
    return isDarkPx(this.f.map, a.x, a.y - 2);
  }

  /** Drawing alpha of a thing (PropInst, ExamineObj): 1 unless it is a litOnly find outside the light. */
  alphaOf(key: object): number {
    const v = this.vis.get(key);
    return v === undefined ? 1 : v;
  }

  /**
   * Visibility of an actor: always 1 — people, animals and symbols in the
   * dark are drawn and can be talked to (2026-09-26); the dark only sinks
   * them in the light map.
   */
  actorAlpha(a: Actor): number {
    void a;
    return 1;
  }

  /** Can this examinable object be examined (α ≥ 0.5: a litOnly find only inside the light)? */
  canExamine(o: ExamineObj): boolean {
    return this.alphaOf(o) >= 0.5;
  }

  /**
   * The litOnly finds (52 8.5, 2026-09-26): only these follow the light.
   * They start unseen (a map entered with the lantern lit shows them as it
   * reaches them).
   */
  private collectDarkThings(): void {
    const f = this.f;
    const m = f.map;
    this.vis = new WeakMap();
    this.clipped = new WeakSet();
    this.darkThings = [];
    const seen = new Set<object>();
    const add = (key: object, x: number, y: number) => {
      this.darkThings.push({ key, x, y, lit: true });
      this.vis.set(key, 0);
      seen.add(key);
    };
    for (const p of f.props) {
      const a = p.art;
      const o = p.obj;
      if (!o.litOnly) continue;
      const fx = p.x + (a.contactX ?? a.ox + a.w / 2);
      const fy = p.y + (a.flat ? a.oy + a.h / 2 : a.foot);
      if (!(a.w <= 32 && a.h <= 32) && !a.flat) {
        // a big find only the light shows: drawn cut to the lights' circles rather than faded as one
        this.clipped.add(p);
        continue;
      }
      add(p, fx, fy - 4);
      if (o.t === 'obj') add(o, fx, fy - 4);
    }
    // litOnly objects to examine without art of their own
    for (const o of m.objects) {
      if (o.t !== 'obj' || seen.has(o) || !o.litOnly) continue;
      add(o, (o.x + (o.w ?? 1) / 2) * 16, (o.y + (o.h ?? 1) / 2) * 16);
    }
  }

  /** Big `litOnly` props, drawn cut to the lights (see clipToLights). */
  private clipped = new WeakSet<object>();

  /** Is this prop drawn only where the lights reach (a big litOnly prop)? */
  isClipped(p: PropInst): boolean {
    return this.clipped.has(p);
  }

  /**
   * Clip `ctx` (screen space, camera at cx, cy) to the circles things are
   * seen in (each light's R − 6px; starlight its own radius). False when
   * no light is on: then nothing of it is drawn.
   */
  clipToLights(ctx: CanvasRenderingContext2D, cx: number, cy: number): boolean {
    let any = false;
    ctx.beginPath();
    for (const s of this.sources) {
      const r = s.kind === 'star' ? s.r : s.r + SHOW_MARGIN;
      if (r <= 0) continue;
      ctx.moveTo(s.x - cx + r, s.y - cy);
      ctx.arc(s.x - cx, s.y - cy, r, 0, Math.PI * 2);
      any = true;
    }
    if (any) ctx.clip();
    return any;
  }

  /** Re-collect after props were rebuilt (a new map: a lantern already lit is simply lit). */
  refresh(): void {
    this.lastMap = null;
    this.wasWanted = null;
    this.held = false;
    this.onT = 1;
  }

  /**
   * Has the light reached this symbol (its feet within R + 8px of the
   * lantern's centre, 51 11.3)? A symbol in the dark is always seen, but
   * only notices Minato once the light has reached it (symbols.ts: the
   * 「？」 and 0.5 s dazzled). Symbols off the dark notice as usual.
   */
  symbolLit(a: Actor): boolean {
    if (!this.actorInDark(a)) return true;
    return this.inLight(a.x, a.y - 4, SYM_MARGIN);
  }

  // ------------------------------------------------------------ painting into the light map

  /**
   * Paint the dark, the starlight and the rings into the light map `lx`
   * (screen space, camera at cx, cy). The base colour is already there;
   * `star` is the colour put back round his feet in the dark.
   */
  paint(lx: CanvasRenderingContext2D, cx: number, cy: number, star: string, W: number, H: number): void {
    const m = this.f.map;
    const dc = this.hasDark ? darkCanvas(m) : null;
    const dk = dc ? this.darkK() : 0;
    lx.save();
    lx.globalAlpha = 1;
    lx.globalCompositeOperation = 'source-over';
    if (dc) {
      lx.globalAlpha = Math.min(1, dk);
      blitRegion(lx, dc, cx, cy, 0, 0, W, H);
      lx.globalAlpha = 1;
    }
    // starlight: the night's colour back over the dark (only matters in the dark)
    if (dc)
      for (const s of this.sources) {
        if (s.kind !== 'star') continue;
        const disc = starDisc(s.r);
        const R = (disc.width - 1) / 2;
        const sx = Math.round(s.x - cx - R);
        const sy = Math.round(s.y - cy - R);
        if (sx > W || sy > H || sx + disc.width < 0 || sy + disc.height < 0) continue;
        const [sc, sctx] = scratch(disc.width, disc.height);
        sctx.globalCompositeOperation = 'copy';
        sctx.drawImage(disc, 0, 0);
        sctx.globalCompositeOperation = 'source-in';
        sctx.fillStyle = star;
        sctx.fillRect(0, 0, disc.width, disc.height);
        // only where it is dark (off the dark the place keeps its own light)
        sctx.globalCompositeOperation = 'destination-in';
        blitRegion(sctx, dc, sx + cx, sy + cy, 0, 0, disc.width, disc.height);
        lx.globalAlpha = Math.min(1, dk);
        lx.drawImage(sc, 0, 0, disc.width, disc.height, sx, sy, disc.width, disc.height);
        lx.globalAlpha = 1;
      }
    for (const s of this.sources) {
      if (s.kind === 'star' || s.k <= 0) continue;
      this.paintRings(lx, dc, s, cx, cy, W, H);
    }
    lx.restore();
  }

  /**
   * The three rings of a light: the 'in' strength on the dark, off it the
   * 'out' one on the night or the 'room' one in a lit room (a light with a
   * halo — the はなまるトマト — mixes at full strength there, to read among
   * the lamps).
   */
  private paintRings(lx: CanvasRenderingContext2D, dc: HTMLCanvasElement | null, l: LightCircle, cx: number, cy: number, W: number, H: number): void {
    const r = l.r;
    const size = r * 2 + 1;
    const sx = Math.round(l.x - cx) - r;
    const sy = Math.round(l.y - cy) - r;
    if (sx > W || sy > H || sx + size < 0 || sy + size < 0) return;
    const offMode: RingMode = this.f.map.def.kind !== 'indoor' ? 'out' : l.halo ? 'in' : 'room';
    const out = ringImage(r, offMode);
    const inn = ringImage(r, 'in');
    lx.globalCompositeOperation = 'source-over';
    lx.globalAlpha = Math.min(1, l.k);
    if (!dc) {
      lx.drawImage(out, sx, sy);
      lx.globalAlpha = 1;
      return;
    }
    const [sc, sctx] = scratch(size, size);
    // off the dark
    sctx.globalCompositeOperation = 'copy';
    sctx.drawImage(out, 0, 0);
    sctx.globalCompositeOperation = 'destination-out';
    blitRegion(sctx, dc, sx + cx, sy + cy, 0, 0, size, size);
    lx.drawImage(sc, 0, 0, size, size, sx, sy, size, size);
    // on the dark
    sctx.globalCompositeOperation = 'copy';
    sctx.drawImage(inn, 0, 0);
    sctx.globalCompositeOperation = 'destination-in';
    blitRegion(sctx, dc, sx + cx, sy + cy, 0, 0, size, size, true);
    lx.drawImage(sc, 0, 0, size, size, sx, sy, size, size);
    lx.globalAlpha = 1;
  }
}

/**
 * Remove the dark parts of the map from `ctx` (screen space, camera at cx,
 * cy): what is drawn after the grade — the sky mirrored in the water — must
 * not shine out of the dark (the wallow's puddles, 52 8.5).
 */
export function eraseDark(ctx: CanvasRenderingContext2D, f: FieldScene, cx: number, cy: number, W: number, H: number): void {
  if (!f.light.hasDark) return;
  const dc = darkCanvas(f.map);
  if (!dc) return;
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  // the dark is a step darker than the night, not black: the sky still
  // shows in its puddles, a little more than half gone
  ctx.globalAlpha = 0.6 * Math.min(1, f.light.darkK());
  blitRegion(ctx, dc, cx, cy, 0, 0, W, H);
  ctx.restore();
}

/** Is the dark switched off by a script (the barn's lights at 5:00)? */
function darkOffFlag(): boolean {
  return !!flag('flag_ch2_dark_off');
}

let scratchC: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
function scratch(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  if (!scratchC) scratchC = makeCanvas(Math.max(w, 200), Math.max(h, 200));
  const [c, ctx] = scratchC;
  if (c.width < w || c.height < h) {
    c.width = Math.max(c.width, w);
    c.height = Math.max(c.height, h);
    ctx.imageSmoothingEnabled = false;
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, w, h);
  return scratchC;
}

/**
 * Draw the part of map-sized canvas `src` whose top-left is world (wx, wy)
 * and size w×h at (dx, dy) of `ctx`, clipping to the map. With `fillOutside`,
 * the part off the map is treated as covered (the dark goes on past an edge).
 */
function blitRegion(ctx: CanvasRenderingContext2D, src: HTMLCanvasElement, wx: number, wy: number, dx: number, dy: number, w: number, h: number, fillOutside = false): void {
  const x0 = Math.max(0, wx);
  const y0 = Math.max(0, wy);
  const x1 = Math.min(src.width, wx + w);
  const y1 = Math.min(src.height, wy + h);
  if (x1 > x0 && y1 > y0) ctx.drawImage(src, x0, y0, x1 - x0, y1 - y0, dx + (x0 - wx), dy + (y0 - wy), x1 - x0, y1 - y0);
  void fillOutside;
}

// ---------------------------------------------------------------- shadows (52 8.4; the rims are chars' litRim)

const shadowSil = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
/** A sprite as a #0B0B14 silhouette (the tomato light's shadows). */
export function nightSilhouette(img: HTMLCanvasElement): HTMLCanvasElement {
  let s = shadowSil.get(img);
  if (!s) {
    const [c, ctx] = makeCanvas(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#0B0B14';
    ctx.fillRect(0, 0, img.width, img.height);
    s = c;
    shadowSil.set(img, s);
  }
  return s;
}

/**
 * Short shadow of a thing in the lantern's circle (fx_h_lantern_shadow):
 * away from the light, L = 0.4 + 1.2·(d/R), α = 0.35·(1 − (d/R)²).
 * Returns null when the thing is outside the circle.
 */
export function lanternShadow(l: LightCircle, footX: number, footY: number): { dx: number; dy: number; len: number; alpha: number } | null {
  const vx = footX - l.x;
  const vy = footY - l.y;
  const d = Math.hypot(vx, vy);
  if (d >= l.r || d < 1) return null;
  const q = d / l.r;
  return { dx: vx / d, dy: vy / d, len: 0.4 + 1.2 * q, alpha: 0.35 * (1 - q * q) };
}

export type { PropInst };
