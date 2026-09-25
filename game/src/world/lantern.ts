// The dark and the tomato light (52 8.4 / 8.5, 50 4.5, 51 11.3, 02_ch2 6.3).
//
// A map lists its dark tiles (MapDef.dark). In the light map (render.ts,
// the canvas multiplied over the graded world) they are painted #10101A,
// the border dithered 3 steps deep into the dark (1/3, 2/3, full over 12px,
// 2px cells) and wobbled ±2px so no tile corner shows. Without the lantern
// Minato keeps a little starlight round his feet (16px, dithered out to
// 24px). With the はなまるトマト in his net (flag_ch2_got_tomato) three
// rings are *mixed* over the light map (source-over, not added: the night
// under them is blue, adding would never give a warm colour), stronger in
// the dark than on the ordinary night outside it.
//
// Things standing on dark tiles (NPCs, symbols, objects to examine, props
// up to 32px) are only drawn — and only examinable — while they are inside
// the light (R − 6px from its centre; symbols R + 8px): they fade in over
// 0.15 s and out over 0.25 s. Buildings, walls, fences, trees are always
// drawn: the light map just sinks them.
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

/** Lantern radius (px), breathing amplitude (px) and rate (Hz) — 52 8.5. */
export const LANTERN_R = 72;
export const LANTERN_AMP = 3.2;
export const LANTERN_HZ = 0.8;
/** Colour of the dark in the light map. */
export const DARK_COL = '#10101A';
/** Things are shown within R − 6px, symbols within R + 8px (02_ch2 5章 #9). */
export const SHOW_MARGIN = -6;
export const SYM_MARGIN = 8;
const FADE_IN = 150;
const FADE_OUT = 250;

// ---------------------------------------------------------------- defaults (52 1.7)

/** Used when a 星見台 map doesn't give MapDef.dark / darkLights / starlight itself. */
const DEFAULT_DARK: Record<string, TileRect[]> = {
  map_hoshimidai: [{ x: 37, y: 0, w: 23, h: 18 }],
  map_hoshi_house: [{ x: 0, y: 0, w: 9, h: 18 }],
  map_hoshi_barn: [{ x: 0, y: 0, w: 22, h: 12 }],
  map_hoshi_school: [{ x: 10, y: 0, w: 16, h: 12 }],
  map_hoshi_hill: [{ x: 0, y: 8, w: 24, h: 12 }],
};
const DEFAULT_DARK_LIGHTS: Record<string, DarkLight[]> = {
  // the はなまるトマト on its vine (5,2), 5th truss: until it is picked
  map_hoshi_house: [{ x: 5, y: 2, ox: 8, oy: 4, r: 80, amp: 3, k: 0.6, cond: { notFlag: ['flag_ch2_got_tomato', 'flag_ch2_tomato_picked'] } }],
};
const DEFAULT_STARLIGHT: Record<string, StarlightSpot[]> = {
  map_hoshi_house: [{ x: 4, y: 16, r: 1.5 }],
};

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
  const col = 0xff1a1010; // #10101A (ABGR)
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
          if (e < 16) s += (valueNoise(wx / 7, wy / 7, 4711) * 2 - 1) * 2;
          if (s < 0) continue;
          const density = s < 4 ? 1 : s < 8 ? 2 : 3;
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

type RingMode = 'in' | 'out';
const RING_COL: [number, number, number][] = [
  [0xff, 0xe7, 0xc0], // centre #FFE7C0
  [0xf7, 0xb0, 0x70], // middle #F7B070
  [0xf2, 0x89, 0x4b], // rim    #F2894B
];
/** Mixing strength of the three rings in the dark / on the ordinary night (52 8.5). */
const RING_A: Record<RingMode, number[]> = { in: [1, 0.67, 0.33], out: [0.7, 0.47, 0.23] };

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

// ---------------------------------------------------------------- the light state of the field

export interface LightCircle {
  x: number;
  y: number;
  r: number;
  /** Strength of its rings (1 = the lantern). */
  k: number;
  kind: 'lantern' | 'fixed' | 'star';
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
  private darkThings: { key: object; x: number; y: number }[] = [];

  constructor(private f: FieldScene) {}

  /** Does the current map have dark tiles (while it's night: none in the morning)? */
  get hasDark(): boolean {
    return darkOf(this.f.map).any && (!isCh2Map(this.f.map.def) || currentStage() <= 2) && !darkOffFlag();
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

  /** The net's centre: Minato's feet + (−4, −6), bobbing 1px with his steps. */
  lanternCentre(): [number, number] {
    const p = this.f.player;
    let bob = 0;
    if (p.moving) {
      const ms = p.running ? p.sprite.runFrameMs ?? 85 : p.sprite.walkFrameMs ?? 130;
      bob = Math.floor(p.walkT / ms) % 2 ? -1 : 0;
    }
    return [Math.round(p.x - 4), Math.round(p.y - 6 + bob)];
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
      const [x, y] = this.lanternCentre();
      this.lantern = { x, y, r: this.radius(f.t), k: this.held ? 0.75 : 1, kind: 'lantern' };
      src.push(this.lantern);
    } else if (!wanted && f.player.visible && m.id === 'map_hoshi_house' && flag('flag_ch2_tomato_picked') && !flag('flag_ch2_got_tomato')) {
      // the はなまるトマト has dropped into his hands (evt_ch2_tomato): its glow goes with him
      const r = Math.round(HELD_R + 1.5 * Math.sin(2 * Math.PI * LANTERN_HZ * (f.t / 1000)));
      src.push({ x: Math.round(f.player.x), y: Math.round(f.player.y - 12), r, k: 0.6, kind: 'fixed' });
    }
    const sw = this.swell();
    for (const l of darkLightsOf(m)) {
      if (!condOk(l.cond)) continue;
      const r = Math.round(l.r + (l.amp ?? 0) * Math.sin(2 * Math.PI * LANTERN_HZ * (f.t / 1000)) + (sw - 1) * 24);
      src.push({ x: l.x * 16 + (l.ox ?? 8), y: l.y * 16 + (l.oy ?? 8), r, k: Math.min(1, (l.k ?? 1) * sw), kind: 'fixed' });
    }
    for (const s of starlightOf(m)) if (condOk(s.cond)) src.push({ x: s.x * 16 + 8, y: s.y * 16 + 8, r: Math.round(s.r * 16), k: 0, kind: 'star' });
    if (!this.lantern) {
      // starlight round Minato's feet (16px, 50% out to 24px)
      src.push({ x: Math.round(f.player.x), y: Math.round(f.player.y - 4), r: 16, k: 0, kind: 'star' });
    }
    this.sources = src;
    if (!this.hasDark && !this.darkThings.some((d) => (d.key as { litOnly?: boolean }).litOnly)) return;
    // fade the dark things in and out
    for (const a of f.actors) {
      if (a.kind === 'player' || a.kind === 'follower') continue;
      if (!this.actorInDark(a)) {
        this.vis.delete(a);
        continue;
      }
      const margin = a.kind === 'sym' ? SYM_MARGIN : SHOW_MARGIN;
      this.fade(a, this.inLight(a.x, a.y - 4, margin), dt);
    }
    for (const d of this.darkThings) {
      if (!this.hasDark && !(d.key as { litOnly?: boolean }).litOnly) {
        this.vis.set(d.key, 1);
        continue;
      }
      this.fade(d.key, this.inLight(d.x, d.y, SHOW_MARGIN), dt);
    }
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

  /** Is this actor standing in the dark (its feet on a dark tile)? */
  actorInDark(a: Actor): boolean {
    if (!this.hasDark) return false;
    if (a.kind === 'player' || a.kind === 'follower') return false;
    return isDarkPx(this.f.map, a.x, a.y - 2);
  }

  /** Drawing alpha of a thing (actor, PropInst, ExamineObj): 1 unless it stands in the dark. */
  alphaOf(key: object): number {
    const v = this.vis.get(key);
    return v === undefined ? 1 : v;
  }

  /** Visibility of an actor (1 when it is not in the dark). */
  actorAlpha(a: Actor): number {
    if (!this.actorInDark(a)) return 1;
    return this.vis.get(a) ?? 0;
  }

  /** Can this examinable object be examined (α ≥ 0.5)? */
  canExamine(o: ExamineObj): boolean {
    return this.alphaOf(o) >= 0.5;
  }

  /** Props and examinable objects whose visibility follows the light (52 8.5). */
  private collectDarkThings(): void {
    const f = this.f;
    const m = f.map;
    this.vis = new WeakMap();
    this.darkThings = [];
    const hasDark = darkOf(m).any;
    const seen = new Set<object>();
    for (const p of f.props) {
      const a = p.art;
      const o = p.obj;
      const lit = !!o.litOnly;
      const fx = p.x + (a.contactX ?? a.ox + a.w / 2);
      const fy = p.y + (a.flat ? a.oy + a.h / 2 : a.foot);
      const small = a.w <= 32 && a.h <= 32;
      const inDark = hasDark && isDarkPx(m, fx, Math.max(0, fy - 2));
      if (lit || (inDark && small && !a.flat)) {
        this.darkThings.push({ key: p, x: fx, y: fy - 4 });
        seen.add(p);
        if (o.t === 'obj') {
          this.darkThings.push({ key: o, x: fx, y: fy - 4 });
          seen.add(o);
        }
      }
    }
    // objects to examine (with or without art) standing in the dark
    for (const o of m.objects) {
      if (o.t !== 'obj' || seen.has(o)) continue;
      const cx = (o.x + (o.w ?? 1) / 2) * 16;
      const cy = (o.y + (o.h ?? 1) / 2) * 16;
      let inDark = !!o.litOnly;
      if (!inDark && hasDark)
        for (let y = o.y; y < o.y + (o.h ?? 1) && !inDark; y++) for (let x = o.x; x < o.x + (o.w ?? 1); x++) if (isDarkTile(m, x, y)) inDark = true;
      if (inDark) this.darkThings.push({ key: o, x: cx, y: cy });
    }
  }

  /** Re-collect after props were rebuilt (a new map: a lantern already lit is simply lit). */
  refresh(): void {
    this.lastMap = null;
    this.wasWanted = null;
    this.held = false;
    this.onT = 1;
  }

  /**
   * Is this symbol within the reach of a light (its feet within R + 8px of
   * the lantern's centre, 51 11.3)? Symbols off the dark are always seen.
   */
  symbolLit(a: Actor): boolean {
    if (!this.actorInDark(a)) return true;
    return this.inLight(a.x, a.y - 4, SYM_MARGIN);
  }

  // ------------------------------------------------------------ painting into the light map

  /**
   * Paint the dark, the starlight and the rings into the light map `lx`
   * (screen space, camera at cx, cy). The base colour is already there.
   */
  paint(lx: CanvasRenderingContext2D, cx: number, cy: number, base: string, W: number, H: number): void {
    const m = this.f.map;
    const dc = this.hasDark ? darkCanvas(m) : null;
    lx.save();
    lx.globalAlpha = 1;
    lx.globalCompositeOperation = 'source-over';
    if (dc) blitRegion(lx, dc, cx, cy, 0, 0, W, H);
    // starlight: the base colour back over the dark (only matters in the dark)
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
        sctx.fillStyle = base;
        sctx.fillRect(0, 0, disc.width, disc.height);
        lx.drawImage(sc, 0, 0, disc.width, disc.height, sx, sy, disc.width, disc.height);
      }
    for (const s of this.sources) {
      if (s.kind === 'star' || s.k <= 0) continue;
      this.paintRings(lx, dc, s.x - cx, s.y - cy, s.r, s.k, cx, cy, W, H);
    }
    lx.restore();
  }

  /** The three rings at screen (x, y): the 'out' strength off the dark, 'in' on it. */
  private paintRings(lx: CanvasRenderingContext2D, dc: HTMLCanvasElement | null, x: number, y: number, r: number, k: number, cx: number, cy: number, W: number, H: number): void {
    const size = r * 2 + 1;
    const sx = Math.round(x) - r;
    const sy = Math.round(y) - r;
    if (sx > W || sy > H || sx + size < 0 || sy + size < 0) return;
    const out = ringImage(r, 'out');
    const inn = ringImage(r, 'in');
    lx.globalAlpha = Math.min(1, k);
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

// ---------------------------------------------------------------- rims and shadows (52 8.4 / 8.9)

const rimCache = new WeakMap<HTMLCanvasElement, Map<string, HTMLCanvasElement>>();
/**
 * The 1px rim of a sprite on the side facing (dx, dy) (each −1, 0 or 1):
 * the sprite's own edge pixels whose neighbour that way is empty, in
 * `color`. Cached per frame canvas, side and colour.
 */
export function rimOf(img: HTMLCanvasElement, dx: number, dy: number, color: string): HTMLCanvasElement {
  let m = rimCache.get(img);
  if (!m) {
    m = new Map();
    rimCache.set(img, m);
  }
  const key = `${dx},${dy},${color}`;
  const hit = m.get(key);
  if (hit) return hit;
  const w = img.width;
  const h = img.height;
  const src = img.getContext('2d', { willReadFrequently: true })?.getImageData(0, 0, w, h).data;
  const [c, ctx] = makeCanvas(w, h);
  if (src) {
    const out = ctx.createImageData(w, h);
    const d = out.data;
    const [r, g, b] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
    const opaque = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && src[(y * w + x) * 4 + 3] > 40;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!opaque(x, y)) continue;
        // lit from that side: the neighbour that way is empty (diagonals: either axis)
        const lit = (dx !== 0 && !opaque(x + dx, y)) || (dy !== 0 && !opaque(x, y + dy)) || (dx !== 0 && dy !== 0 && !opaque(x + dx, y + dy) && (!opaque(x + dx, y) || !opaque(x, y + dy)));
        if (!lit) continue;
        // the feet row stays unlit (the rim is on the body, not the ground contact)
        if (dy > 0 && y >= h - 1) continue;
        const i = (y * w + x) * 4;
        d[i] = r;
        d[i + 1] = g;
        d[i + 2] = b;
        d[i + 3] = 255;
      }
    ctx.putImageData(out, 0, 0);
  }
  m.set(key, c);
  return c;
}

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

/** Which side a thing at (x, y) is lit from by light l, as −1/0/1 steps (8 directions). */
export function sideToward(l: { x: number; y: number }, x: number, y: number): [number, number] {
  const a = Math.atan2(l.y - y, l.x - x);
  const oct = Math.round(a / (Math.PI / 4));
  const dirs: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
  return dirs[((oct % 8) + 8) % 8];
}

export type { PropInst };
