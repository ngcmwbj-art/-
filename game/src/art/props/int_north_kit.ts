// Shared painters of the north row's rooms (02_ch2_index #58, 30_level_art
// 4.7–4.12): tatami and the entrance's tataki, a wet concrete floor, wooden
// boards, plaster walls over a wainscot, the doorway in the south wall, the
// room's shell set into the town (withExterior), the clock time of a stage,
// and small animated pieces (a hanging bulb, a desk fan, a pendulum clock).

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { boards } from '../tiles/ifloor';
import { ihash, valueNoise } from '../tiles/noise';
import { P } from '../tiles/palette';
import { clockFace } from './ifurn';
import { depthShade, dust, lightPool, paintShell, screenPool, screenSpill, shellProp, type Shell } from './ishell';
import { castRight, dk, lt } from './kit';
import { exteriorGlow, exteriorImg, exteriorOver, withExterior, type ExteriorSpec } from './iexterior';
import type { PropArt, PropEnv } from './types';

export function rgbHex(c: [number, number, number]): string {
  const h = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${h(c[0])}${h(c[1])}${h(c[2])}`;
}

// ---------------------------------------------------------------- floors

const TATAMI = { base: '#C9C48A', lit: '#DCD8A2', dark: '#A9A46C', edge: '#2E6B4A', edgeLt: '#3FA66B' };

/** Tatami: 32×16 mats (every other row turned), woven lines, green cloth edges. */
export function tatami(seed: number): (x: number, y: number) => string {
  return (x, y) => {
    const row = Math.floor(y / 16);
    const turned = (row + seed) % 2 === 1;
    const off = turned ? 16 : 0;
    const mx = Math.floor((x + off) / 32);
    const lx = (x + off) - mx * 32;
    const ly = y - row * 16;
    if (ly === 0) return TATAMI.edgeLt;
    if (ly === 15) return TATAMI.edge;
    if (lx === 0) return TATAMI.dark;
    const worn = valueNoise(x / 30, y / 20, seed + 3) > 0.7;
    if ((x & 1) === 0) return (ly & 1) === 0 ? (worn ? TATAMI.lit : TATAMI.base) : TATAMI.lit;
    return ly % 3 === 0 ? TATAMI.dark : worn ? TATAMI.lit : TATAMI.base;
  };
}

/** The entrance's tataki: slate tiles in a running bond. */
export function tataki(seed: number): (x: number, y: number) => string {
  return (x, y) => {
    const row = Math.floor(y / 8);
    const off = row % 2 ? 5 : 0;
    const col = Math.floor((x + off) / 10);
    const lx = (x + off) % 10;
    const ly = y % 8;
    if (lx === 9 || ly === 7) return P.charcoal;
    const h = ihash(col, row, seed);
    const c = h % 3 === 0 ? P.asphalt : h % 3 === 1 ? P.steel : '#7E8496';
    if (ly === 0 || lx === 0) return lt(c);
    return c;
  };
}

/** A wet concrete floor (the tofu shop's back): trowel marks, puddles, a gutter. */
export function wetConcrete(seed: number, gutterY: number): (x: number, y: number) => string {
  return (x, y) => {
    if (y >= gutterY && y < gutterY + 4) {
      if (y === gutterY) return P.charcoal;
      return (x >> 1) % 3 === 0 ? P.asphalt : P.charcoal;
    }
    const n = valueNoise(x / 10, y / 8, seed);
    const wet = valueNoise(x / 26 + 7, y / 18, seed + 5) > 0.72;
    // 32px trowelled slabs with a fine joint
    if (x % 32 === 0 || y % 32 === 0) return '#B4AEA0';
    if (wet) return n > 0.5 ? '#A8AAB0' : '#B4B4B4';
    return n > 0.78 ? P.concreteLt : n < 0.2 ? '#BCB6A8' : P.concrete;
  };
}

/** Wooden boards (shops). */
export function woodFloor(seed: number, tone: 'warm' | 'dark' = 'warm'): (x: number, y: number) => string {
  return tone === 'dark'
    ? boards({ bh: 6, lit: P.wood, base: '#6E4630', shade: P.woodDark, gap: '#3A2B2A', nail: P.brassOld, seed })
    : boards({ bh: 6, lit: P.woodLt, base: '#A8784A', shade: P.wood, gap: P.woodDark, nail: P.brassOld, seed });
}

/** Square quarry tiles (the sake shop). */
export function shopTiles(seed: number): (x: number, y: number) => string {
  return (x, y) => {
    const lx = x % 12;
    const ly = y % 12;
    if (lx === 11 || ly === 11) return '#8A8474';
    const h = ihash(Math.floor(x / 12), Math.floor(y / 12), seed);
    const c = h % 5 === 0 ? '#B4AEA0' : h % 5 === 1 ? P.concreteLt : P.concrete;
    if (valueNoise(x / 18, y / 18, seed + 1) > 0.72) return '#B4AEA0';
    return lx === 0 || ly === 0 ? lt(c) : c;
  };
}

// ---------------------------------------------------------------- walls

/** Plaster above a wooden wainscot (the wainscot's top at `rail` px from the face's top). */
export function plasterWall(seed: number, plaster: string, rail = 20, wood = P.wood): (x: number, y: number, fh: number) => string {
  return (x, y) => {
    if (y < rail) return valueNoise(x / 7, y / 5, seed) > 0.8 ? lt(plaster) : valueNoise(x / 13, y / 9, seed + 2) < 0.2 ? dk(plaster) : plaster;
    if (y === rail) return P.woodLt;
    if (y === rail + 1) return P.woodDark;
    if (x % 9 === 8) return dk(wood);
    return valueNoise(Math.floor(x / 9) * 1.7, y / 5, seed + 4) > 0.7 ? lt(wood) : wood;
  };
}

// ---------------------------------------------------------------- the doorway (south wall)

export type DoorKind = 'shoji' | 'glass' | 'wood' | 'noren' | 'glassPair';

/** The door in the south wall at door cell tx (the room's bottom row). */
export function paintDoorway(sh: Shell, tx: number, kind: DoorKind): void {
  const p = sh.p;
  const dx = tx * 16;
  const dy = (sh.h - 1) * 16;
  // sill
  p.rect(dx - 3, dy, 22, 2, P.wood);
  p.hline(dx - 3, dx + 18, dy, P.woodLt);
  if (kind === 'noren') {
    // the way through to the shop front: a short noren over the opening
    p.rect(dx, dy + 2, 16, 10, P.shadeDeep);
    sh.glass.rect(dx + 1, dy + 6, 14, 5, '#ffffff');
    p.rect(dx - 1, dy + 2, 18, 5, P.navy);
    p.vline(dx + 5, dy + 2, dy + 6, P.shadeDeep);
    p.vline(dx + 10, dy + 2, dy + 6, P.shadeDeep);
    p.hline(dx - 1, dx + 16, dy + 2, P.blue);
    p.set(dx + 2, dy + 4, P.white);
    p.set(dx + 13, dy + 4, P.white);
    p.hline(dx - 1, dx + 17, dy + 11, P.ink);
    return;
  }
  p.rect(dx, dy + 2, 16, 9, P.shadeDeep);
  if (kind === 'shoji') {
    p.rect(dx + 1, dy + 3, 14, 7, P.paper);
    for (let i = dx + 1; i < dx + 16; i += 4) p.vline(i, dy + 3, dy + 9, P.woodLt);
    p.hline(dx + 1, dx + 14, dy + 6, P.woodLt);
    sh.glass.rect(dx + 2, dy + 7, 12, 3, '#ffffff');
  } else if (kind === 'wood') {
    p.rect(dx + 1, dy + 3, 14, 7, P.wood);
    for (let i = dx + 2; i < dx + 15; i += 2) p.vline(i, dy + 3, dy + 9, P.woodDark);
    p.set(dx + 12, dy + 6, P.brass);
  } else {
    sh.glass.rect(dx + 1, dy + 3, 14, 7, '#ffffff');
    p.vline(dx + 8, dy + 2, dy + 10, kind === 'glassPair' ? P.woodDark : P.steel);
    p.hline(dx, dx + 16, dy + 2, kind === 'glassPair' ? P.woodDark : P.steel);
    if (kind === 'glass') p.set(dx + 13, dy + 6, P.brass);
  }
  p.hline(dx - 1, dx + 17, dy + 11, P.ink);
}

// ---------------------------------------------------------------- the room in the town

export interface RoomSpec {
  map: string;
  floor: (x: number, y: number, tx: number, ty: number, ch: string) => string;
  wall: (x: number, y: number, fh: number) => string;
  trim?: string;
  base?: string;
  baseH?: number;
  door: DoorKind;
  ext: Omit<ExteriorSpec, 'rows'>;
  /** Wall and floor decor, painted before the room is set into the town. */
  deco?: (p: PixelCanvas, sh: Shell) => void;
  /** Lamps over the room: [x, y, rx, ry, colour] in room px (pools on the floor). */
  lamps?: [number, number, number, number, string][];
  /** The ceiling tube instead of warm lamps (a flicker now and then). */
  tube?: number;
  over?(g: Gfx, x: number, y: number, env: PropEnv): void;
  glow?(g: Gfx, x: number, y: number, env: PropEnv): void;
}

/** Paint a room's shell and set it into the town round its door. */
export function roomShell(s: RoomSpec): PropArt {
  const rows = getMapDef(s.map)?.rows ?? [];
  const sh = paintShell({ rows, floor: s.floor, wall: s.wall, trim: s.trim, base: s.base, baseH: s.baseH });
  s.deco?.(sh.p, sh);
  const last = [...rows[rows.length - 1]];
  paintDoorway(sh, Math.max(0, last.indexOf('D')), s.door);
  const W = sh.p.w;
  const H = sh.p.h;
  const doorX = Math.max(0, last.indexOf('D')) * 16 + 8;
  const ext = withExterior(sh.p, sh.glass, { rows, ...s.ext });
  return shellProp({
    img: ext.p.toCanvas(),
    imgFor: exteriorImg(ext),
    glass: ext.glass.toCanvas(),
    ox: ext.ox,
    oy: ext.oy,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      exteriorOver(g, x, y, ext, env);
      depthShade(g, x + 16, y + 32, W - 32, H - 48, 0.16);
      const n = env.grade.night;
      dust(g, x + doorX - 30, y + H - 70, 60, 50, 0.1, 10, env.t, 7300 + W, 0.5 - n * 0.3);
      for (const [lx, ly, rx, ry, c] of s.lamps ?? []) screenPool(g, x + lx, y + ly, rx, ry, c, 0.2 + n * 0.14);
      // the late sun comes in low through the door (stage colours)
      screenSpill(g, x + doorX, y + H, 18, 40, 30, rgbHex(env.grade.skyBot), 0.22 - n * 0.14, true);
      s.over?.(g, x, y, env);
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      exteriorGlow(g, x, y, ext, env);
      s.glow?.(g, x, y, env);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      const n = env.grade.night;
      for (const [lx, ly, rx, ry, c] of s.lamps ?? []) lightPool(g, x + lx, y + ly, rx * 1.6, ry * 1.8, c, 0.1 + n * 0.55);
      if (s.tube) lightPool(g, x + W / 2, y + H / 2, W / 2, H / 3, P.white, 0.08 + n * 0.5);
    },
  });
}

// ---------------------------------------------------------------- clocks

/** A chapter-1 wall clock in this stage: [h, m, s]. 16:52 → 16:55 → 16:58 (flag_clock), 17:00 from stage 1. */
export function stageTime(env: PropEnv): [number, number, number] {
  if (env.stage >= 3) return [5, 1, Math.floor(env.t / 1000) % 60];
  if (env.stage === 1) return [5, 0, 0];
  if (env.stage === 2) return [5, 0, Math.floor(env.t / 1100) % 3 === 2 ? 59 : 0];
  const c = env.flag('flag_clock');
  return [4, c >= 2 ? 58 : c >= 1 ? 55 : 52, Math.floor(env.t / 1000) % 60];
}

/** A clock face with the red second hand, cached per displayed time. */
export function clockImg(cache: Map<string, HTMLCanvasElement>, r: number, h: number, m: number, sec: number, o: { rim?: string; face?: string; second?: boolean } = {}): HTMLCanvasElement {
  const k = `${r}:${h}:${m}:${o.second === false ? 0 : sec}:${o.rim}:${o.face}`;
  let img = cache.get(k);
  if (!img) {
    const d = r * 2 + 3;
    const p = new PixelCanvas(d, d);
    const c = r + 1;
    clockFace(p, c, c, r, h, m, { rim: o.rim ?? P.woodDark, face: o.face });
    if (o.second !== false && r >= 4) {
      const sa = (sec / 60) * Math.PI * 2;
      p.line(c, c, Math.round(c + Math.sin(sa) * (r - 0.6)), Math.round(c - Math.cos(sa) * (r - 0.6)), P.red);
      p.set(c, c, P.ink);
    }
    castRight(p, 0, 0, d - 1, d - 1, 1);
    img = p.toCanvas();
    cache.set(k, img);
  }
  return img;
}

/** Pendulum swing in this stage: -1..1 (stage 1 holds it out to the right; stage 2 swings back and hitches). */
export function pendulum(env: PropEnv, period = 1600): number {
  if (env.stage === 1) return 0.9;
  const a = Math.sin((env.mt / period) * Math.PI * 2);
  if (env.stage === 2) return Math.floor(env.t / 1300) % 4 === 3 ? -a : a;
  return a;
}

/** Spin phase for fans and records: forward in stage 0, frozen in 1, backwards in 2. */
export function spin(env: PropEnv, ms: number): number {
  const t = env.stage === 2 ? -env.mt : env.mt;
  return (((t / ms) % 1) + 1) % 1;
}
