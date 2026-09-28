// 南の列の部屋（30_level_art 4.7〜4.13、02 #59）の共通部品：部屋の殻
// （床は各マップの地面をそのまま焼く、壁、壁の断面、外の町）と、家具の
// 小さな描き方。部屋ごとの絵は int_south.ts / int_south2.ts。

import type { Gfx } from '../../engine/gfx';
import { hex, PixelCanvas } from '../../engine/pixel';
import { GroundCache } from '../../world/ground_cache';
import { getMapDef, loadMap } from '../../world/maps';
import { bakeGround } from '../tiles/ground';
import { P } from '../tiles/palette';
import { clockFace } from './ifurn';
import { exteriorGlow, exteriorImg, exteriorOver, withExterior, type ExteriorSpec, type ExtPainter } from './iexterior';
import { depthShade, lightPool, paintShell, screenPool, shellProp, tube } from './ishell';
import { castRight, dk, lt } from './kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

export const pcv = (w: number, h: number) => new PixelCanvas(w, h);

/** A ceiling light over the room (map px): a pool on the floor, stronger at night. */
export interface Lamp {
  x: number;
  y: number;
  rx: number;
  ry: number;
  col?: string;
  /** Fluorescent tube that drops out now and then (tube() seed). */
  tube?: number;
  /** Day strength (screen pool alpha); default 0.14. */
  a?: number;
}

export interface SouthShell {
  id: string;
  map: string;
  wall: (x: number, y: number, fh: number) => string;
  trim?: string;
  base?: string;
  baseH?: number;
  section?: string;
  /** Wall decor and floor decals painted into the shell (map px). */
  decor?: (p: PixelCanvas, glass: PixelCanvas) => void;
  town: [number, number];
  bld: [number, number, number];
  skin: [string, string, string];
  roof: ExteriorSpec['roof'];
  seed: number;
  props?: ExteriorSpec['props'];
  skip?: string[];
  outside?: (e: ExtPainter) => void;
  lamps: Lamp[];
  spill?: string;
  spillA?: number;
  over?: (g: Gfx, x: number, y: number, env: PropEnv) => void;
  glow?: (g: Gfx, x: number, y: number, env: PropEnv) => void;
  light?: (g: Gfx, x: number, y: number, env: PropEnv) => void;
}

const hexOf = (v: number) => hex(v & 255, (v >>> 8) & 255, (v >>> 16) & 255);

/**
 * Register a room shell prop: the map's own floor (the field's ground art,
 * baked), the wall faces and sections, the decor, and the town round it
 * (withExterior: the street in front, the neighbours moved out to the walls,
 * the walkers and lamps at run time).
 */
export function southShell(s: SouthShell): void {
  registerProp(s.id, () => {
    const rows = getMapDef(s.map)?.rows ?? [];
    const w = Math.max(...rows.map((r) => [...r].length));
    const h = rows.length;
    const m = loadMap(s.map);
    const ground = m ? bakeGround(new GroundCache(m).src, 0, 0, w * 16, h * 16) : null;
    const sh = paintShell({
      rows,
      // the door's notch shows the floor of the cell above it
      floor: (x, y, _tx, _ty, ch) => (ground ? hexOf(ground.get(x, ch === 'D' ? y - 16 : y)) : P.wood),
      wall: s.wall,
      trim: s.trim,
      base: s.base,
      baseH: s.baseH,
      section: s.section,
    });
    s.decor?.(sh.p, sh.glass);
    const W = sh.p.w;
    const H = sh.p.h;
    const ext = withExterior(sh.p, sh.glass, {
      rows,
      town: s.town,
      bld: s.bld,
      skin: s.skin,
      roof: s.roof,
      seed: s.seed,
      props: s.props,
      skip: s.skip,
      paint: s.outside,
    });
    const lampOn = (l: Lamp, env: PropEnv) => (l.tube ? (tube(env.t, l.tube, [3000, 9000], [50, 140]) ? 1 : 0.3) : 1);
    return shellProp({
      img: ext.p.toCanvas(),
      imgFor: exteriorImg(ext),
      glass: ext.glass.toCanvas(),
      ox: ext.ox,
      oy: ext.oy,
      over(g: Gfx, x: number, y: number, env: PropEnv) {
        exteriorOver(g, x, y, ext, env, { spill: s.spill ?? P.sky, spillA: s.spillA ?? 0.18 });
        depthShade(g, x + 16, y + 32, W - 32, H - 48, 0.12);
        const n = env.grade.night;
        for (const l of s.lamps) screenPool(g, x + l.x, y + l.y, l.rx, l.ry, l.col ?? P.glint, ((l.a ?? 0.14) + n * 0.1) * lampOn(l, env));
        s.over?.(g, x, y, env);
      },
      glow(g: Gfx, x: number, y: number, env: PropEnv) {
        exteriorGlow(g, x, y, ext, env);
        s.glow?.(g, x, y, env);
      },
      light(g: Gfx, x: number, y: number, env: PropEnv) {
        const n = env.grade.night;
        for (const l of s.lamps) lightPool(g, x + l.x, y + l.y, l.rx * 1.4, l.ry * 2, l.col ?? P.white, (0.08 + n * 0.5) * lampOn(l, env));
        s.light?.(g, x, y, env);
      },
    });
  });
}

// ---------------------------------------------------------------- small painters

/** A box lit from the top left: 1px light top/left, dark right/bottom edge. */
export function box(p: PixelCanvas, x: number, y: number, w: number, h: number, base: string, o: { top?: string; edge?: boolean } = {}): void {
  p.rect(x, y, w, h, base);
  p.hline(x, x + w - 1, y, o.top ?? lt(base));
  p.vline(x, y, y + h - 1, lt(base));
  p.vline(x + w - 1, y + 1, y + h - 1, dk(base));
  p.hline(x + 1, x + w - 1, y + h - 1, dk(base));
  if (o.edge) p.strokeRect(x, y, w, h, P.ink);
}

/** A small framed picture on a wall (frame, mat, a scribble of a picture) and its shadow. */
export function frameOn(p: PixelCanvas, x: number, y: number, w: number, h: number, frame: string, fill: (p: PixelCanvas, ix: number, iy: number, iw: number, ih: number) => void): void {
  p.rect(x, y, w, h, frame);
  p.hline(x, x + w - 1, y, lt(frame));
  p.vline(x, y, y + h - 1, lt(frame));
  p.rect(x + 1, y + 1, w - 2, h - 2, P.paper);
  fill(p, x + 2, y + 2, w - 4, h - 4);
  castRight(p, x, y, w, h, 2);
}

/**
 * A wall clock (flat, on the wall): 16:52 / 16:55 / 16:58 by flag_clock in
 * stage 0, 17:00 from stage 1 (the red second hand stops dead; in stage 2
 * it keeps slipping back a second), 17:01 at night.
 */
export function wallClock(id: string, o: { r: number; rim: string; face?: string; ox: number; oy: number; pendulum?: boolean }): void {
  registerProp(id, () => {
    const cache = new Map<string, HTMLCanvasElement>();
    const size = o.r * 2 + 3;
    const ph = o.pendulum ? 18 : 0;
    return {
      ox: o.ox,
      oy: o.oy,
      w: size + (o.pendulum ? 4 : 0),
      h: size + ph,
      foot: 0,
      flat: true,
      img: (env: PropEnv) => {
        const c = env.flag('flag_clock');
        const [hh, mm] = env.stage >= 3 ? [5, 1] : env.stage >= 1 ? [5, 0] : [4, c >= 2 ? 58 : c >= 1 ? 55 : 52];
        const sec = env.stage === 1 ? 0 : env.stage === 2 ? (Math.floor(env.t / 1100) % 3 === 2 ? 59 : 0) : Math.floor(env.t / 1000) % 60;
        // the pendulum: swings in stage 0, stops tilted in stage 1, leans north-east (right) in stage 2
        const sw = !o.pendulum ? 0 : env.stage === 1 ? -2 : env.stage === 2 ? 3 : Math.round(Math.sin(env.mt / 318) * 3);
        const k = `${hh}:${mm}:${sec}:${sw}`;
        let img = cache.get(k);
        if (!img) {
          const p = pcv(size + (o.pendulum ? 4 : 0), size + ph);
          const cx = o.r + 1 + (o.pendulum ? 2 : 0);
          if (o.pendulum) {
            // the wooden case, a glass door over the pendulum
            p.rect(cx - o.r - 2, 0, o.r * 2 + 5, size + ph, o.rim);
            p.vline(cx - o.r - 2, 0, size + ph - 1, lt(o.rim));
            p.vline(cx + o.r + 2, 1, size + ph - 1, dk(o.rim));
            p.hline(cx - o.r - 2, cx + o.r + 2, size + ph - 1, dk(o.rim, 2));
            p.rect(cx - o.r, size + 1, o.r * 2 + 1, ph - 3, P.shadeDeep);
            p.line(cx, size + 1, cx + sw, size + ph - 6, P.brass);
            p.ellipse(cx + sw + 0.5, size + ph - 5, 2, 2, P.gold);
            p.set(cx + sw, size + ph - 6, P.glint);
          }
          clockFace(p, cx, o.r + 1, o.r, hh, mm, { rim: o.rim, face: o.face });
          const sa = (sec / 60) * Math.PI * 2;
          p.line(cx, o.r + 1, Math.round(cx + Math.sin(sa) * (o.r - 1)), Math.round(o.r + 1 - Math.cos(sa) * (o.r - 1)), P.red);
          p.set(cx, o.r + 1, P.ink);
          castRight(p, 0, 0, p.w - 1, p.h - 1, 1);
          img = p.toCanvas();
          cache.set(k, img);
        }
        return img;
      },
    } as PropArt;
  });
}

/** Wooden boards seen from the front (a shelf back or a panel). */
export function boardsV(p: PixelCanvas, x: number, y: number, w: number, h: number, base: string, every = 5): void {
  for (let j = 0; j < h; j++)
    for (let i = 0; i < w; i++) {
      const c = i % every === every - 1 ? dk(base) : (i * 7 + j * 3) % 23 === 0 ? lt(base) : base;
      p.set(x + i, y + j, c);
    }
}
