// 海ぞいの町 starts moving again (62_ch3_level_art 6.1〜6.3・8.7・8.8・9.3):
//
//  - the sea: at 12:00 the water is a still mirror (the ground's own
//    picture, art/tiles/c3_ground.ts); once it moves a layer of waves lies
//    over it — the crests and the glints of the sea, the harbour's ripples,
//    the foam running up the beach and back (4 s). paintSea() draws that
//    layer for the 2D (a world effect under the people) and for the HD-2D
//    (hd2d/c3sea3d.ts: a live sheet over the water tiles) alike;
//  - where it moves: everywhere at 12:01 (flag_ch3_stage 2+); before that,
//    S09's lens wakes the sea round each spot the light hits
//    (flag_ch3_lens_n: the harbour's mouth, outside the breakwater, off the
//    beach) and after the third the whole beach's sea (ウミの「入れる海」);
//  - fx_c3_ugokidasu: the ring from the siren tower across the town (about
//    3 s to the edges); what it has passed moves (startUgokidasu(): S12's
//    scene calls it on map_umizoi; it also runs by itself when the stage turns
//    2 while there);
//  - the gulls: at 12:00 they hang in the air (art/props/c3_bld.ts
//    prop_c3_kamome_sora); at 12:01 each flies a wide circle round where it
//    hung, wings beating, its shadow on the ground;
//  - 海の 中 (map_c3_umi): the blue of the water over everything, the shafts
//    of light from the surface (stopped at 12:00), グソっ君's bubbles
//    (fx_c3_bubble);
//  - fx_c3_splash (splashAt): the dive in and out — at 12:00 the drops hang
//    0.3 s in the air before they fall, and rings spread on the mirror.

import type { Gfx } from '../engine/gfx';
import { flag } from '../game/state';
import { valueNoise } from '../engine/rng';
import { registerDebug } from '../debug';
import { fxAt, fxElsewhere, registerWorldFx } from './fx';
import { field, type FieldScene } from './field';
import { groundAt, type LoadedMap } from './maps';

// ---------------------------------------------------------------- where the sea moves

export type SeaKind = 'umi' | 'minato' | 'nagisa';

/** The kind of water of a map tile (null: not water). */
export function seaKind(m: LoadedMap, tx: number, ty: number): SeaKind | null {
  const g = groundAt(m, Math.max(0, Math.min(m.w - 1, tx)), Math.max(0, Math.min(m.h - 1, ty))) as string;
  return g === 'c3_umi' ? 'umi' : g === 'c3_minato' ? 'minato' : g === 'c3_nagisa' ? 'nagisa' : null;
}

/** The siren tower's head (world px): the ring starts there. */
const RING_AT = { x: 34.5 * 16, y: 4 * 16 };
/** How fast the ring runs (px / ms): the far corners of the town in about 3 s. */
const RING_V = 0.32;
/** S09's three spots (62 4.5: tiles) and how far round each the sea wakes. */
const LENS_SPOTS: [number, number][] = [
  [3, 31],
  [25, 35],
  [60, 35],
];
const LENS_R = 5;

/** The ring of fx_c3_ugokidasu: when it started (the effects' clock, ms), or null. */
const ring = { t0: null as number | null };
/** The effects' clock (ms, runs on map_umizoi). */
let clock = 0;
let lastStage = -1;
let lastMap = '';

/** The ring's radius now (px), or Infinity once it has crossed everything. */
function ringR(): number {
  if (ring.t0 === null) return Infinity;
  const r = (clock - ring.t0) * RING_V;
  return r > 1500 ? Infinity : r;
}

/** How much the water (or anything) at world px (x, y) moves: 0 still … 1. */
export function movingAt(x: number, y: number): number {
  if (flag('flag_ch3_stage') >= 2) {
    const r = ringR();
    if (r === Infinity) return 1;
    const d = Math.hypot(x - RING_AT.x, (y - RING_AT.y) * 1.15);
    return d < r - 24 ? 1 : d < r ? (r - d) / 24 : 0;
  }
  if (flag('flag_ch3_stage') !== 1) return 0;
  const n = flag('flag_ch3_lens_n');
  if (n <= 0) return 0;
  const tx = x / 16;
  const ty = y / 16;
  // (after the third: the beach's sea, x52–67 from its wet edge south)
  if (n >= 3 && tx >= 52 && tx < 68 && ty >= 31) return 1;
  for (let k = 0; k < Math.min(3, n); k++) {
    const [sx, sy] = LENS_SPOTS[k];
    const d = Math.hypot(tx - sx - 0.5, ty - sy - 0.5);
    if (d < LENS_R) return 1;
    if (d < LENS_R + 1) return LENS_R + 1 - d;
  }
  return 0;
}

/** Is anything of the sea moving now (a quick test before drawing)? */
export function seaAwake(): boolean {
  return flag('flag_ch3_stage') >= 2 || (flag('flag_ch3_stage') === 1 && flag('flag_ch3_lens_n') > 0);
}

/**
 * fx_c3_ugokidasu: the ring from the siren tower starts now. Called by S12's
 * scene once on map_umizoi (the field's grade tweens 12:00 → 12:01 with it,
 * so the gulls, the steam and the flags start with the ring).
 */
export function startUgokidasu(f?: FieldScene): void {
  ring.t0 = clock;
  if (f && f.map.id === 'map_umizoi') {
    f.setGradeC('c1', 0);
    f.setGradeC('c2', 3000);
  }
}

// ---------------------------------------------------------------- the waves' picture

/** The patterns (64 × 64, transparent) of the waves: 4 frames each. */
interface Patterns {
  umi: HTMLCanvasElement[];
  minato: HTMLCanvasElement[];
}
let patterns: Patterns | null = null;

function makeCanvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

function buildPatterns(): Patterns {
  const umi: HTMLCanvasElement[] = [];
  const minato: HTMLCanvasElement[] = [];
  for (let k = 0; k < 4; k++) {
    // the sea: short crests (a lighter blue with a white top) in rows, each
    // drifting a pixel a frame and rising and falling; glints between them
    const [c, x] = makeCanvas(64, 64);
    for (let row = 0; row < 8; row++) {
      const y0 = row * 8 + (row % 2) * 3;
      for (let i = 0; i < 4; i++) {
        const len = 5 + ((row * 3 + i * 5) % 6);
        const px = (i * 17 + row * 11 + k * (row % 2 ? 1 : -1) + 64) % 64;
        const lift = (k + row + i) % 4 === 0 ? -1 : 0;
        x.fillStyle = '#5AA0C8';
        x.fillRect(px, y0 + 1 + lift, len, 1);
        x.fillStyle = '#A8D4F0';
        x.fillRect(px + 1, y0 + lift, len - 2, 1);
        if ((row + i + k) % 3 === 0) {
          x.fillStyle = '#F4F1E8';
          x.fillRect(px + 2, y0 + lift, 2, 1);
        }
      }
      // the glints that come and go
      if ((row + k) % 2 === 0) {
        x.fillStyle = '#FFFFFF';
        x.fillRect((row * 23 + k * 13) % 64, y0 + 5, 1, 1);
      }
    }
    umi.push(c);
    // the harbour: long low ripples in the teal, a lighter line, fewer glints
    const [c2, x2] = makeCanvas(64, 64);
    for (let row = 0; row < 10; row++) {
      const y0 = Math.round(row * 6.4);
      for (let i = 0; i < 3; i++) {
        const len = 8 + ((row * 5 + i * 3) % 9);
        const px = (i * 23 + row * 7 + k * 2 * (row % 2 ? 1 : -1) + 64) % 64;
        x2.fillStyle = '#4A8A90';
        x2.fillRect(px, y0, len, 1);
        x2.fillStyle = '#1F4E56';
        x2.fillRect(px + 2, y0 + 1, len - 3, 1);
      }
      if ((row + k) % 3 === 0) {
        x2.fillStyle = '#C8E8E8';
        x2.fillRect((row * 29 + k * 7) % 64, y0 + 3, 1, 1);
      }
    }
    minato.push(c2);
  }
  return { umi, minato };
}

/**
 * Draw the moving water of world px rect (x0, y0, w × h) into ctx, whose
 * pixel (0, 0) is world (ox, oy) — the 2D view (ox = the camera) or a sheet
 * (ox = its corner). `kind(tx, ty)` says what water a tile is, `face(tx, ty)`
 * whether its top rows are a quay's face (left still).
 */
export function paintSea(
  ctx: CanvasRenderingContext2D,
  ox: number,
  oy: number,
  x0: number,
  y0: number,
  w: number,
  h: number,
  t: number,
  kind: (tx: number, ty: number) => SeaKind | null,
  face: (tx: number, ty: number) => boolean,
): void {
  if (!seaAwake()) return;
  patterns ??= buildPatterns();
  const frame = Math.floor(t / 220) % 4;
  const drift = Math.floor(t / 900);
  const tx0 = Math.floor(x0 / 16);
  const ty0 = Math.floor(y0 / 16);
  const tx1 = Math.ceil((x0 + w) / 16);
  const ty1 = Math.ceil((y0 + h) / 16);
  // the beach's foam: up the wet sand and back, 4 s (where the beach's sea moves)
  const swash = (Math.sin((t / 4000) * Math.PI * 2) + 1) / 2;
  for (let ty = ty0; ty < ty1; ty++)
    for (let tx = tx0; tx < tx1; tx++) {
      const k = kind(tx, ty);
      if (!k) continue;
      const m = movingAt(tx * 16 + 8, ty * 16 + 8);
      if (m <= 0) continue;
      const X = tx * 16 - ox;
      const Y = ty * 16 - oy;
      if (k === 'nagisa') {
        // the wash: the sea's film reaching up the sand to its line, the foam on its edge
        const reach = Math.round(4 + swash * 9);
        ctx.globalAlpha = 0.55 * m;
        ctx.fillStyle = '#5AA0C8';
        ctx.fillRect(X, Y + 16 - reach + 2, 16, reach - 2);
        ctx.globalAlpha = 0.9 * m;
        ctx.fillStyle = '#F4F1E8';
        for (let i = 0; i < 16; i++) {
          const wob = Math.round(Math.sin((tx * 16 + i) / 5 + t / 700) * 1.2);
          if ((i * 7 + tx) % 5 !== 0) ctx.fillRect(X + i, Y + 16 - reach + wob, 1, 1);
          if ((i + tx + frame) % 4 === 0) ctx.fillRect(X + i, Y + 17 - reach + wob, 1, 1);
        }
        ctx.globalAlpha = 1;
        continue;
      }
      const top = face(tx, ty) ? 6 : 0;
      const pat = (k === 'umi' ? patterns.umi : patterns.minato)[frame];
      const sx = (((tx * 16 + (k === 'umi' ? drift : -drift)) % 64) + 64) % 64;
      const sy = (((ty * 16 + top) % 64) + 64) % 64;
      ctx.globalAlpha = m;
      // (a 16-px column of the pattern, wrapped at its 64-px edge)
      const wa = Math.min(16, 64 - sx);
      const hh = 16 - top;
      const ha = Math.min(hh, 64 - sy);
      ctx.drawImage(pat, sx, sy, wa, ha, X, Y + top, wa, ha);
      if (wa < 16) ctx.drawImage(pat, 0, sy, 16 - wa, ha, X + wa, Y + top, 16 - wa, ha);
      if (ha < hh) {
        ctx.drawImage(pat, sx, 0, wa, hh - ha, X, Y + top + ha, wa, hh - ha);
        if (wa < 16) ctx.drawImage(pat, 0, 0, 16 - wa, hh - ha, X + wa, Y + top + ha, 16 - wa, hh - ha);
      }
      ctx.globalAlpha = 1;
    }
}

/** A water tile whose north neighbour is not water (its top rows show the quay's face). */
export function seaFace(m: LoadedMap, tx: number, ty: number): boolean {
  return !!seaKind(m, tx, ty) && !seaKind(m, tx, ty - 1) && ty > 0;
}

// ---------------------------------------------------------------- the gulls (62 8.8)

interface Gull {
  x: number;
  y: number;
  h: number;
  seed: number;
}

function gullsOf(f: FieldScene): Gull[] {
  const out: Gull[] = [];
  for (const p of f.props) {
    if (p.obj.t !== 'prop' || p.obj.prop !== 'prop_c3_kamome_sora') continue;
    const o = p.obj.opts ?? {};
    out.push({ x: p.x + 8, y: p.y + 8, h: Number(o.h ?? 28), seed: p.x * 0.013 + p.y * 0.007 });
  }
  return out;
}

/** A gull's picture, wings at phase k (0 up, 1 level, 2 down). */
function drawGull(g: Gfx, x: number, y: number, k: number, flip: boolean): void {
  const wy = [-3, -1, 1][k];
  const c = '#F4F1E8';
  const s = flip ? -1 : 1;
  g.rect(x - 1, y - 1, 3, 2, '#FFFFFF');
  g.px(x + 2 * s, y - 1, '#FFD23F');
  for (let i = 1; i <= 6; i++) {
    const yy = y + Math.round((wy * i) / 6) - (i > 3 ? Math.round(((i - 3) * wy) / 6) : 0);
    g.px(x - i, yy, c);
    g.px(x + i, yy, c);
  }
  g.px(x - 7, y + wy - 1, '#3A3F48');
  g.px(x + 7, y + wy - 1, '#3A3F48');
}

// ---------------------------------------------------------------- fx_c3_splash

interface Drop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  z: number;
  vz: number;
  hang: number;
}
let drops: Drop[] = [];
let splashRings: { x: number; y: number; t: number }[] = [];

/** fx_c3_splash at world px (x, y): 12 drops on arcs, a ring on the water (at 12:00 the drops hang 0.3 s first). */
export function splashAt(x: number, y: number): void {
  const still = flag('flag_ch3_stage') < 2 && movingAt(x, y) <= 0;
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    drops.push({ x, y, vx: Math.cos(a) * (0.02 + (i % 3) * 0.01), vy: Math.sin(a) * 0.012, z: 2, vz: 0.07 + (i % 4) * 0.015, hang: still ? 300 : 0 });
  }
  splashRings.push({ x, y, t: 0 });
}

// ---------------------------------------------------------------- the effect

registerWorldFx({
  map: 'map_umizoi',
  anchored: true,
  update(f, dt) {
    if (lastMap !== f.map.id) {
      lastMap = f.map.id;
      drops = [];
      splashRings = [];
    }
    clock += dt;
    const s = flag('flag_ch3_stage');
    // (the stage turned 2 here without the scene asking: the ring goes anyway)
    if (lastStage === 1 && s >= 2 && ring.t0 === null) ring.t0 = clock;
    if (s < 2) ring.t0 = null;
    lastStage = s;
    for (const d of drops) {
      if (d.hang > 0) {
        d.hang -= dt;
        if (d.hang > 0) {
          if (d.z < 10) {
            d.z += d.vz * dt;
            d.x += d.vx * dt;
          }
          continue;
        }
      }
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.z += d.vz * dt;
      d.vz -= 0.0004 * dt;
    }
    drops = drops.filter((d) => d.z > 0);
    for (const r of splashRings) r.t += dt;
    splashRings = splashRings.filter((r) => r.t < 900);
  },
  draw(f, g, cx, cy, layer) {
    // the moving water, under everything standing (2D only; the HD-2D lays its own sheet)
    if (layer === 'ground' && !fxElsewhere(f)) {
      paintSea(g.ctx, cx, cy, cx, cy, 384, 216, f.t, (tx, ty) => seaKind(f.map, tx, ty), (tx, ty) => seaFace(f.map, tx, ty));
      return;
    }
    if (layer === 'sorted') {
      // the splash's rings on the water
      for (const r of splashRings) {
        const k = r.t / 900;
        const rr = 4 + k * 18;
        for (let i = 0; i < 20; i++) {
          const a = (i / 20) * Math.PI * 2;
          const [x, y] = fxAt(f, r.x + Math.cos(a) * rr, r.y + Math.sin(a) * rr * 0.5, cx, cy);
          g.rect(Math.round(x), Math.round(y), 1, 1, '#F4F1E8', 1 - k);
        }
      }
      for (const d of drops) {
        const [x, y] = fxAt(f, d.x, d.y - d.z, cx, cy, d.y);
        g.rect(Math.round(x), Math.round(y), 1, 1, '#F4F1E8');
      }
      return;
    }
    if (layer !== 'top') return;
    // the gulls fly at 12:01, once the ring has passed them
    if (flag('flag_ch3_stage') >= 2) {
      const t = f.t / 1000;
      for (const gl of gullsOf(f)) {
        if (movingAt(gl.x, gl.y) < 0.5) continue;
        const th = t * 0.55 + gl.seed * 9;
        const rx = 40 + (gl.seed * 97) % 24;
        const gx = gl.x + Math.cos(th) * rx;
        const gy = gl.y + Math.sin(th) * rx * 0.45;
        const hh = gl.h + Math.sin(t * 0.9 + gl.seed) * 6;
        const [sx, sy] = fxAt(f, gx, gy, cx, cy);
        g.rect(Math.round(sx) - 4, Math.round(sy), 8, 1, '#2A3A50', 0.16);
        const [x, y] = fxAt(f, gx, gy - hh, cx, cy, gy);
        const k = [0, 1, 2, 1][Math.floor(f.t / 110 + gl.seed * 7) % 4];
        drawGull(g, Math.round(x), Math.round(y), k, Math.sin(th) < 0);
      }
    }
    // fx_c3_ugokidasu: the ring itself, a thin white line running out over the town
    const r = ringR();
    if (flag('flag_ch3_stage') >= 2 && r !== Infinity && r > 4) {
      const a0 = Math.max(0, 1 - r / 1300);
      const n = Math.max(48, Math.round(r / 3));
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const wx = RING_AT.x + Math.cos(a) * r;
        const wy = RING_AT.y + (Math.sin(a) * r) / 1.15;
        const [x, y] = fxAt(f, wx, wy, cx, cy);
        if (x < -2 || y < -2 || x > 386 || y > 218) continue;
        g.rect(Math.round(x), Math.round(y), 2, 1, '#FFFFFF', 0.7 * a0 + 0.2);
      }
    }
  },
});

// 岬（map_c3_misaki、2026-10-20 旧水族館を 移した）：崖の 下の 海も 12:01 から 動く（2D の 波。HD-2D は c3sea3d.ts）
registerWorldFx({
  map: 'map_c3_misaki',
  anchored: true,
  draw(f, g, cx, cy, layer) {
    if (layer !== 'ground' || fxElsewhere(f) || !seaAwake()) return;
    paintSea(g.ctx, cx, cy, cx, cy, 384, 216, f.t, (tx, ty) => seaKind(f.map, tx, ty), (tx, ty) => seaFace(f.map, tx, ty));
  },
});

// 小石の 浜（map_c3_koishi、低う、平たく 03_ch3_index）：12:01 から 波が 寄せる（2D の 波。HD-2D は c3sea3d.ts）
registerWorldFx({
  map: 'map_c3_koishi',
  anchored: true,
  draw(f, g, cx, cy, layer) {
    if (layer !== 'ground' || fxElsewhere(f) || !seaAwake()) return;
    paintSea(g.ctx, cx, cy, cx, cy, 384, 216, f.t, (tx, ty) => seaKind(f.map, tx, ty), (tx, ty) => seaFace(f.map, tx, ty));
  },
});

// ---------------------------------------------------------------- 海の 中

let bubbles: { x: number; y: number; z: number; t: number }[] = [];
let bubbleNext = 0;

registerWorldFx({
  map: 'map_c3_umi',
  anchored: true,
  update(f, dt) {
    const moving = flag('flag_ch3_stage') >= 2;
    bubbleNext -= dt;
    if (bubbleNext <= 0) {
      bubbleNext = 700 + Math.random() * 600;
      bubbles.push({ x: f.player.x + (Math.random() * 4 - 2), y: f.player.y, z: 20, t: 0 });
    }
    // (at 12:00 they rise too — he breathes — but slowly)
    for (const b of bubbles) {
      b.t += dt;
      b.z += dt * (moving ? 0.03 : 0.018);
      b.x += Math.sin(b.t / 200) * 0.05;
    }
    bubbles = bubbles.filter((b) => b.t < 1800);
  },
  draw(f, g, cx, cy, layer) {
    if (layer === 'top') {
      for (const b of bubbles) {
        const [x, y] = fxAt(f, b.x, b.y - b.z, cx, cy, b.y);
        const k = 1 - b.t / 1800;
        g.ring(Math.round(x), Math.round(y), 1, '#E8FAFF');
        if (k < 0.3) g.rect(Math.round(x), Math.round(y), 1, 1, '#E8FAFF', k * 3);
      }
      return;
    }
    if (layer !== 'glow') return;
    // the water over everything (pal_c3_suichu): bluer, deeper to the south of the screen, the surface's light at the top
    g.rect(0, 0, 384, 216, '#1A5A8A', 0.16);
    for (let k = 0; k < 8; k++) g.rect(0, 120 + k * 12, 384, 12, '#0E2A4A', 0.025 * k);
    for (let k = 0; k < 4; k++) g.rect(0, k * 6, 384, 6, '#CDEFF8', 0.12 - k * 0.03);
    // the shafts of light from the surface (slanted bands; stopped at 12:00, swaying at 12:01)
    const t = flag('flag_ch3_stage') >= 2 ? f.t / 1000 : 0;
    g.composite('lighter', () => {
      for (let i = 0; i < 6; i++) {
        const base = ((i * 83 - cx * 0.3) % 460) - 40 + Math.sin(t * 0.6 + i) * 8;
        const a = 0.05 + 0.03 * valueNoise(i * 3.1, t * 0.4, 77);
        for (let y = 0; y < 216; y += 2) {
          const x = Math.round(base + y * 0.35);
          g.rect(x, y, 10 + (i % 3) * 4, 2, '#8AC8E8', a * (1 - y / 260));
        }
      }
    });
  },
});

if (import.meta.env.DEV) {
  /** QA: __game.cmd.c3ring() runs fx_c3_ugokidasu on map_umizoi (set flag_ch3_stage 2 first: __game.cmd.flag('flag_ch3_stage', 2)). */
  registerDebug('c3ring', () => {
    startUgokidasu(field() ?? undefined);
    return 'fx_c3_ugokidasu';
  });
  /** QA: __game.cmd.c3splash() splashes at the player's feet. */
  registerDebug('c3splash', () => {
    const f = field();
    if (f) splashAt(f.player.x, f.player.y + 8);
  });
}
