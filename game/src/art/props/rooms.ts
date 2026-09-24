// Indoor rooms (30_level_art 4.0–4.2): the room shell (north wall face,
// wall cross-sections, floor shading, window / stair light) and the
// furniture of the Shiomi house. The shell is a flat prop anchored at (0,0)
// that reads the map's ASCII; furniture are depth-sorted props.
//
// Other indoor maps can reuse the shell through the prop id 'room_shell'
// with opts { map, wall: 'plaster'|'wallpaper'|'tile'|'wood'|'mall'|'concrete',
// base, trim, section } (bottom of this file), or call roomShell() directly.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas, hex, toRgb } from '../../engine/pixel';
import { getMapDef } from '../../world/maps';
import { P } from '../tiles/palette';
import { ihash, valueNoise } from '../tiles/noise';
import { castRight, cylinder, dk, finish, lt, maskOf, shadeRect } from './kit';
import { flat, mkFrames, stand, standAnim } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, printLines, tiny } from './text';
import { drawLight, drawLightAt, halo, LIGHT, poolEllipse, poolTrapezoid } from './light';
import type { PropArt, PropEnv } from './types';

const pc = (w: number, h: number) => new PixelCanvas(w, h);

export interface RoomStyle {
  /** Wall-face painter (x, y within the wall face, face height). */
  wall(x: number, y: number, fh: number): string;
  /** Baseboard colour. */
  base?: string;
  /** Top trim (moulding) colour. */
  trim?: string;
  /** Cross-section colour of the wall thickness. */
  section?: string;
}

/**
 * Paint the shell of an indoor map: wall faces for 'W' cells, 4px wall
 * sections where the dark outside touches the room, floor shadows.
 */
export function roomShell(
  rows: string[],
  style: RoomStyle,
  extra?: (p: PixelCanvas, glass: PixelCanvas) => void,
): { img: HTMLCanvasElement; glass: HTMLCanvasElement; floorShade: [number, number, number][] } {
  const h = rows.length;
  const w = Math.max(...rows.map((r) => [...r].length));
  const p = pc(w * 16, h * 16);
  const glass = pc(w * 16, h * 16);
  const ch = (x: number, y: number) => (y < 0 || y >= h || x < 0 || x >= w ? '#' : [...rows[y]][x] ?? '#');
  const isRoom = (c: string) => c !== '#' && c !== 'W';
  const floorShade: [number, number, number][] = [];
  const section = style.section ?? P.nightShade;
  // wall faces: contiguous W runs per column
  for (let x = 0; x < w; x++) {
    let y = 0;
    while (y < h) {
      if (ch(x, y) !== 'W') {
        y++;
        continue;
      }
      let y1 = y;
      while (ch(x, y1) === 'W') y1++;
      const fh = (y1 - y) * 16;
      for (let j = 0; j < fh; j++)
        for (let i = 0; i < 16; i++) {
          let c = style.wall(x * 16 + i, j, fh);
          if (j < 3) c = j === 0 ? section : j === 1 ? (style.trim ?? P.woodLt) : dk(style.trim ?? P.woodLt);
          if (j >= fh - 4) c = j === fh - 4 ? lt(style.base ?? P.wood) : j === fh - 1 ? dk(style.base ?? P.wood) : style.base ?? P.wood;
          p.set(x * 16 + i, y * 16 + j, c);
        }
      y = y1;
    }
  }
  // wall cross-sections where the outside touches the room or a wall face
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (ch(x, y) !== '#') continue;
      const R = (c: string) => isRoom(c) || c === 'W';
      if (R(ch(x + 1, y))) for (let j = 0; j < 16; j++) for (let i = 12; i < 16; i++) p.set(x * 16 + i, y * 16 + j, i === 15 ? dk(section) : section);
      if (R(ch(x - 1, y))) for (let j = 0; j < 16; j++) for (let i = 0; i < 4; i++) p.set(x * 16 + i, y * 16 + j, i === 0 ? dk(section) : section);
      if (R(ch(x, y - 1))) for (let j = 0; j < 4; j++) for (let i = 0; i < 16; i++) p.set(x * 16 + i, y * 16 + j, j === 0 ? lt(section) : section);
    }
  // floor: 2px shadow under the north wall, 1px on the side walls
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!isRoom(ch(x, y))) continue;
      if (ch(x, y - 1) === 'W') for (let i = 0; i < 16; i++) for (let j = 0; j < 3; j++) floorShade.push([x * 16 + i, y * 16 + j, j < 2 ? 0.4 : 0.2]);
      if (ch(x - 1, y) === '#') for (let j = 0; j < 16; j++) floorShade.push([x * 16, y * 16 + j, 0.35]);
      if (ch(x + 1, y) === '#') for (let j = 0; j < 16; j++) floorShade.push([x * 16 + 15, y * 16 + j, 0.35]);
    }
  // floor shading as translucent pixels (the floor itself is the baked ground)
  for (const [x, y, a] of floorShade) {
    const aa = Math.round(a * 255).toString(16).padStart(2, '0');
    if (!p.alpha(x, y)) p.set(x, y, section + aa);
  }
  extra?.(p, glass);
  return { img: p.toCanvas(), glass: glass.toCanvas(), floorShade };
}

/** Alpha-blend a colour over an existing pixel. */
function blendPx(p: PixelCanvas, x: number, y: number, col: string, a: number): void {
  const v = p.get(x, y);
  if (!(v >>> 24)) return;
  const [r, g, b] = toRgb(col);
  const r0 = v & 255;
  const g0 = (v >>> 8) & 255;
  const b0 = (v >>> 16) & 255;
  p.set(x, y, hex(r0 + (r - r0) * a, g0 + (g - g0) * a, b0 + (b - b0) * a));
}

/** Wallpaper with a faint vertical stripe / dot pattern. */
function wallpaper(base: string, accent: string, seed: number): RoomStyle['wall'] {
  return (x, y) => {
    if (x % 8 === 0 && y % 4 < 2) return accent;
    const n = valueNoise(x / 6, y / 6, seed);
    return n > 0.82 ? lt(base) : n < 0.12 ? dk(base) : base;
  };
}

let CORNER: HTMLCanvasElement | null = null;
/** A quarter-disc of dark (#1B1733) for the room corners, in 3 flat steps with checker bands. */
function cornerShade(): HTMLCanvasElement {
  if (CORNER) return CORNER;
  const R = 34;
  const p = pc(R, R);
  for (let y = 0; y < R; y++)
    for (let x = 0; x < R; x++) {
      const d = Math.hypot(x / R, (y / R) * 1.15);
      const v = (1 - d) * 3;
      if (v <= 0) continue;
      const step = Math.floor(v);
      const frac = v - step;
      const k = Math.min(3, step + (frac > 0.65 ? 1 : frac > 0.3 ? (x + y) & 1 : 0));
      if (k <= 0) continue;
      p.set(x, y, P.night + ['00', '55', 'aa', 'ff'][k]);
    }
  CORNER = p.toCanvas();
  return CORNER;
}

/** Indoor light & depth overlay (flat layer, before characters). */
function roomLight(g: Gfx, x: number, y: number, w: number, h: number, env: PropEnv, patches: [number, number, number, number, number][]): void {
  const ctx = g.ctx;
  ctx.save();
  // depth: the back of the room darker (multiply #5B4A7A)
  ctx.globalCompositeOperation = 'multiply';
  const gr = ctx.createLinearGradient(0, y, 0, y + h);
  gr.addColorStop(0, 'rgba(91,74,122,0.2)');
  gr.addColorStop(1, 'rgba(91,74,122,0)');
  ctx.fillStyle = gr;
  ctx.fillRect(x, y, w, h);
  // the four corners of the room sink into shadow (#1B1733, deeper at night)
  ctx.globalCompositeOperation = 'source-over';
  const ca = 0.12 + 0.14 * env.grade.night;
  const corner = cornerShade();
  for (const [fx, fy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    const cx = fx ? x + w - 16 - corner.width : x + 16;
    const cy = fy ? y + h - 16 - corner.height : y;
    ctx.globalAlpha = ca;
    ctx.save();
    ctx.translate(cx + (fx ? corner.width : 0), cy + (fy ? corner.height : 0));
    ctx.scale(fx ? -1 : 1, fy ? -1 : 1);
    ctx.drawImage(corner, 0, 0);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'multiply';
  // window / stair light: parallelograms (screen #F7C27A), clipped to the floor
  ctx.beginPath();
  ctx.rect(x + 16, y, w - 32, h - 16);
  ctx.clip();
  ctx.globalCompositeOperation = 'screen';
  const night = env.grade.night;
  for (const [px, py, pw, ph, a] of patches) {
    ctx.fillStyle = `rgba(247,194,122,${(a * (1 - night)).toFixed(3)})`;
    ctx.beginPath();
    ctx.moveTo(x + px, y + py);
    ctx.lineTo(x + px + pw, y + py);
    ctx.lineTo(x + px + pw + ph * 0.6, y + py + ph);
    ctx.lineTo(x + px + ph * 0.6, y + py + ph);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ---------------------------------------------------------------- stairs (review round 2)

/** Tread (lit, 3px) and riser (dark, 2px) colours of a wooden step, darkened by `d` (0..3 steps). */
function stepCols(d: number): [string, string, string, string] {
  const ramp = [P.goldPale, P.woodLt, P.wood, P.woodDark, P.nightShade, P.ink, P.night];
  const k = Math.min(ramp.length - 4, Math.max(0, d));
  return [ramp[k], ramp[k + 1], ramp[k + 2], ramp[k + 3]];
}

/**
 * 1F stairs going up to the north: `x` is the tile's left edge, `bottom`
 * the floor row the first step stands on. Six steps (3px tread + 2px riser)
 * climb into a dark opening in the wall, each a little narrower; a stringer
 * on each side, a handrail with balusters on the west (open) side.
 */
function paintStairsUp(p: PixelCanvas, x: number, bottom: number): void {
  const steps = 6;
  const topY = bottom - steps * 5 + 1;
  // the opening in the wall (the upper floor is dark) in a wooden frame
  p.rect(x + 1, 4, 14, topY - 3, P.nightShade);
  p.rect(x + 1, 4, 14, 4, P.ink);
  p.rect(x + 1, 8, 14, 3, P.night);
  p.rect(x, 1, 16, 3, P.wood);
  p.hline(x, x + 15, 1, P.woodLt);
  p.hline(x, x + 15, 3, P.woodDark);
  p.vline(x + 15, 1, bottom, P.woodDark);
  p.vline(x + 14, 4, topY, P.wood);
  for (let i = 0; i < steps; i++) {
    const y1 = bottom - i * 5; // bottom of this step's riser
    const l = x + 4 + Math.floor(i / 3);
    const r = x + 13;
    const [lit, tread, riser, riserDk] = stepCols(Math.floor(i / 2));
    // tread (3px, lit nosing on top) above its riser (2px, facing the viewer)
    p.hline(l, r, y1 - 4, lit);
    p.hline(l, r, y1 - 3, tread);
    p.hline(l, r, y1 - 2, tread);
    p.hline(l, r, y1 - 1, riser);
    p.hline(l, r, y1, riserDk);
    p.set(l, y1 - 4, i < 2 ? P.glint : lit);
    // wear in the middle of the tread
    p.set(l + 4 + (i % 3), y1 - 3, lit);
    // stringer on the west, the wall's stringer on the east
    p.vline(l - 1, y1 - 4, y1, P.woodDark);
    p.set(r + 1, y1 - 4, P.woodLt);
  }
  // handrail on the open (west) side: a rail running up the flight, a
  // baluster at every step, the newel post at the foot
  for (let y = topY - 1; y <= bottom - 11; y++) {
    const xx = x + 1 + (y < bottom - 20 ? 1 : 0);
    p.set(xx, y, P.woodLt);
    p.set(xx + 1, y, P.wood);
  }
  for (let i = 0; i < steps - 1; i++) {
    const by = bottom - 6 - i * 5;
    const xx = x + 2 + (by < bottom - 20 ? 1 : 0);
    p.set(xx + 1, by - 1, P.woodDark);
    p.set(xx + 1, by, P.woodDark);
    p.set(xx + 2, by, P.woodDark);
  }
  p.rect(x + 1, bottom - 12, 3, 13, P.wood);
  p.vline(x + 1, bottom - 12, bottom, P.woodLt);
  p.vline(x + 3, bottom - 12, bottom, P.woodDark);
  p.hline(x + 1, x + 3, bottom - 13, P.goldPale);
  p.set(x + 2, bottom - 14, P.woodLt);
}

/**
 * 2F stair well going down (south) at tile (x, y): three steps visible,
 * each tread with its lit nosing and the riser under it facing the
 * viewer, darker the deeper they go; wooden sides; a handrail with
 * balusters along the north edge and a newel post.
 */
function paintStairsDown(p: PixelCanvas, x: number, y: number): void {
  // wooden sides of the well
  p.rect(x, y, 16, 16, P.woodDark);
  p.vline(x + 1, y, y + 15, P.wood);
  p.vline(x + 14, y, y + 15, P.ink);
  const cols: [string, string, string, string][] = [
    [P.goldPale, P.woodLt, P.wood, P.woodDark],
    [P.woodLt, P.wood, P.woodDark, P.nightShade],
    [P.wood, P.woodDark, P.nightShade, P.ink],
  ];
  for (let i = 0; i < 3; i++) {
    const t = y + 1 + i * 5;
    const l = x + 2;
    const r = x + 13;
    const [lit, tread, riser, riserDk] = cols[i];
    p.hline(l, r, t, lit);
    p.hline(l, r, t + 1, tread);
    p.hline(l, r, t + 2, tread);
    if (t + 3 < y + 16) p.hline(l, r, t + 3, riser);
    if (t + 4 < y + 16) p.hline(l, r, t + 4, riserDk);
    p.set(l, t, i === 0 ? P.glint : lit);
  }
  // the landing's edge
  p.hline(x, x + 15, y, P.goldPale);
  // handrail along the north edge: rail 8px up, balusters every 4px, newel post
  p.hline(x - 2, x + 15, y - 8, P.woodLt);
  p.hline(x - 2, x + 15, y - 7, P.wood);
  for (let k = 0; k <= 4; k++) {
    const bx = x - 1 + k * 4;
    p.vline(bx, y - 6, y - 1, P.woodDark);
    p.set(bx, y - 6, P.wood);
  }
  p.rect(x - 2, y - 10, 3, 10, P.wood);
  p.vline(x - 2, y - 10, y - 1, P.woodLt);
  p.hline(x - 2, x, y - 11, P.goldPale);
}

// ---------------------------------------------------------------- 2F shell

registerProp('room_home_2f', () => {
  const rows = getMapDef('map_home_2f')?.rows ?? [];
  const { img, glass } = (
    roomShell(rows, { wall: wallpaper(P.paperGrid, P.paper, 3), base: P.wood, trim: P.woodLt }, (p, gm) => {
      // window (6–7, 0–1): the room's light source, sky shows through
      const wx = 6 * 16 + 2;
      const wy = 5;
      p.rect(wx - 2, wy - 2, 32, 24, P.woodLt);
      p.strokeRect(wx - 2, wy - 2, 32, 24, P.wood);
      p.rect(wx, wy, 28, 20, P.shadeDeep);
      gm.rect(wx, wy, 28, 20, '#ffffff');
      p.vline(wx + 14, wy, wy + 19, P.woodLt);
      p.hline(wx, wx + 27, wy + 10, P.woodLt);
      // curtains
      p.rect(wx - 4, wy - 3, 5, 25, P.aqua);
      p.vline(wx - 4, wy - 3, wy + 21, P.white);
      p.rect(wx + 27, wy - 3, 5, 25, P.aqua);
      p.vline(wx + 31, wy - 3, wy + 21, P.blue);
      p.hline(wx - 5, wx + 32, wy - 4, P.steel);
      // sill with a cactus
      p.rect(wx - 2, wy + 21, 32, 2, P.woodLt);
      p.rect(wx + 20, wy + 17, 4, 4, P.skin4);
      p.rect(wx + 21, wy + 13, 2, 4, P.leaf);
      // calendar (3,1): August, red × on every day but the 31st
      const cx = 3 * 16 + 1;
      const cy = 10;
      p.rect(cx, cy, 14, 18, P.white);
      p.rect(cx, cy, 14, 5, P.sunDeep);
      tiny(p, '8', cx + 5, cy, P.white);
      for (let d = 0; d < 20; d++) {
        const dx = cx + 1 + (d % 6) * 2;
        const dy = cy + 7 + Math.floor(d / 6) * 3;
        p.set(dx, dy, d === 19 ? P.verm : P.red);
      }
      p.ring(cx + 11, cy + 15, 2, 1.5, P.verm);
      castRight(p, cx, cy, 14, 18, 2);
      // poster of a stag beetle
      p.rect(1 * 16 + 3, 8, 22, 16, P.leafShade);
      p.strokeRect(1 * 16 + 3, 8, 22, 16, P.white);
      p.ellipse(1 * 16 + 14, 17, 4, 5, P.woodDark);
      p.line(1 * 16 + 11, 12, 1 * 16 + 13, 14, P.woodDark);
      p.line(1 * 16 + 17, 12, 1 * 16 + 15, 14, P.woodDark);
      castRight(p, 1 * 16 + 3, 8, 22, 16, 2);
      // stair opening (8,5): a well going down to the 1F, the treads darker
      // the deeper they go, side walls, a handrail with balusters on the north
      paintStairsDown(p, 8 * 16, 5 * 16);
    })
  );
  const W = img.width;
  const H = img.height;
  return {
    ox: 0,
    oy: 0,
    w: W,
    h: H,
    foot: 0,
    flat: true,
    img: () => img,
    glass,
    over(g, x, y, env) {
      roomLight(g, x, y + 32, W, H - 32, env, [[5 * 16 + 4, 3 * 16, 44, 26, 0.25]]);
    },
    glow(g, x, y, env) {
      // warm light rising out of the stair well from the 1F (#F7C27A, α30% at
      // the bottom), in flat steps; stronger at night when the 1F lamps are on
      const k = 0.75 + 0.5 * env.grade.night;
      const sx = x + 8 * 16 + 1;
      const sy = y + 5 * 16;
      const bands: [number, number, number][] = [[11, 5, 0.34], [6, 5, 0.22], [2, 4, 0.1]];
      for (const [dy, h, a] of bands) g.rect(sx + 1, sy + dy, 12, h, P.sky, a * k);
      for (let i = 0; i < 12; i += 2) g.rect(sx + 1 + i, sy + 10, 1, 1, P.sky, 0.25 * k);
      g.rect(sx + 1, sy + 15, 12, 1, P.horizon, 0.45 * k);
    },
  };
});

// ---------------------------------------------------------------- 2F furniture

registerProp('obj_bed', () => {
  const p = pc(34, 52);
  // wooden frame with headboard against the wall
  p.rect(1, 0, 32, 8, P.wood);
  p.hline(1, 32, 0, P.woodLt);
  p.hline(1, 32, 7, P.woodDark);
  p.rect(1, 8, 32, 42, P.woodDark);
  p.rect(2, 8, 30, 40, P.white);
  // pillow + manga
  p.rect(4, 9, 16, 7, P.concreteLt);
  p.hline(4, 19, 9, P.glint);
  p.rect(22, 10, 7, 5, P.gold);
  p.rect(23, 11, 5, 2, P.verm);
  // twisted light-blue towel blanket (#7FD1E8)
  for (let y = 18; y < 46; y++)
    for (let x = 3; x < 31; x++) {
      const tw = Math.sin(y / 5 + x / 9) * 3;
      if (x > 8 + tw && x < 28 - tw * 0.5) p.set(x, y, (x + y) % 7 === 0 ? P.white : y % 6 < 2 ? P.aqua : P.blue);
    }
  p.line(10, 22, 26, 40, P.white);
  p.rect(1, 48, 32, 3, P.wood);
  p.hline(1, 32, 50, P.ink);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 16, base: 48, shadow: 0, contact: 28 });
});

registerProp('obj_desk_room', () => {
  // 学習机 x4–5, one floor tile deep (row 2) like its collision; the hutch
  // hangs on the north wall. The blank notebook (obj_jiyukenkyu, left half)
  // and its 1px twinkle are part of this layer so nothing of the desk is ever
  // drawn over the player standing in row 3. The chair is pushed in under
  // the knee space on the right.
  const p = pc(34, 42); // world y 6..48 (anchor tile (5,2) top = 32)
  const Y = 0;
  // hutch on the wall: side panels, two shelves, books, a clock and a lamp
  p.rect(1, Y, 32, 19, P.woodLt);
  p.hline(1, 32, Y, P.goldPale);
  p.rect(3, Y + 2, 28, 7, P.woodDark);
  p.rect(3, Y + 10, 28, 7, P.woodDark);
  p.hline(3, 30, Y + 9, P.woodLt);
  const books = [P.red, P.navy, P.gold, P.leafDeep, P.white, P.aqua, P.verm, P.brass];
  for (let k = 0; k < 8; k++) {
    const h = 5 + (k % 3 === 1 ? 1 : 0);
    p.rect(4 + k * 2 + (k > 4 ? 2 : 0), Y + 8 - h + 1, 2, h, books[k]);
    p.set(4 + k * 2 + (k > 4 ? 2 : 0), Y + 8 - h + 1, lt(books[k]));
  }
  // lower shelf: dictionary lying flat, a pencil cup, a small alarm clock
  p.rect(4, Y + 14, 9, 3, P.navy);
  p.hline(4, 12, Y + 14, P.blue);
  p.rect(15, Y + 12, 3, 5, P.leafYoung);
  p.set(15, Y + 11, P.red);
  p.set(17, Y + 10, P.gold);
  p.ellipse(24, Y + 14, 2.5, 2.5, P.white);
  p.set(24, Y + 13, P.ink);
  p.set(25, Y + 14, P.ink);
  p.set(22, Y + 11, P.verm);
  p.set(26, Y + 11, P.verm);
  p.vline(31, Y + 1, Y + 18, P.wood);
  // desk top (seen from above): light wood, a pale mat on the left half
  p.rect(0, Y + 19, 34, 9, P.woodLt);
  p.hline(0, 33, Y + 19, P.goldPale);
  p.rect(2, Y + 20, 16, 7, P.paperGrid);
  p.hline(2, 17, Y + 26, P.brass);
  // the blank notebook (obj_jiyukenkyu) on the mat
  p.rect(4, Y + 20, 11, 6, P.white);
  p.hline(4, 14, Y + 20, P.glint);
  p.vline(4, Y + 20, Y + 25, P.concreteLt);
  p.hline(6, 12, Y + 22, P.concrete);
  p.hline(5, 14, Y + 26, P.concrete);
  // pencil and eraser crumbs ("a small mountain range")
  p.line(20, Y + 25, 25, Y + 23, P.gold);
  p.set(25, Y + 23, P.woodDark);
  for (const [x, y] of [[21, 21], [22, 22], [23, 21], [27, 22]] as const) p.set(x, Y + y, P.peach);
  // desk lamp (right, clamped to the hutch) with its green shade
  p.vline(29, Y + 12, Y + 22, P.steel);
  p.rect(26, Y + 10, 6, 3, P.leafDeep);
  p.hline(26, 31, Y + 10, P.leafYoung);
  p.rect(27, Y + 22, 5, 2, P.steel);
  // front face: drawers on the left, knee space with the chair on the right
  p.rect(0, Y + 28, 34, 13, P.wood);
  p.hline(0, 33, Y + 28, P.woodDark);
  p.rect(2, Y + 29, 13, 5, P.woodLt);
  p.rect(2, Y + 35, 13, 5, P.woodLt);
  p.hline(2, 14, Y + 33, P.brassOld);
  p.hline(2, 14, Y + 39, P.brassOld);
  p.rect(7, Y + 31, 3, 1, P.brass);
  p.rect(7, Y + 37, 3, 1, P.brass);
  // knee space (dark) and the chair back tucked into it
  p.rect(17, Y + 29, 15, 12, P.nightShade);
  p.rect(17, Y + 29, 15, 2, P.ink);
  p.rect(19, Y + 30, 11, 7, P.blue);
  p.hline(19, 29, Y + 30, P.aqua);
  p.vline(19, Y + 30, Y + 36, P.aqua);
  p.hline(20, 29, Y + 36, P.navy);
  p.rect(20, Y + 37, 9, 2, P.steel);
  p.vline(21, Y + 39, Y + 40, P.charcoal);
  p.vline(27, Y + 39, Y + 40, P.charcoal);
  // legs
  p.rect(0, Y + 41, 2, 1, P.woodDark);
  p.rect(32, Y + 41, 2, 1, P.woodDark);
  p.rect(15, Y + 29, 2, 12, P.woodDark);
  finish(p, { soft: true });
  const img = p.toCanvas();
  // anchored on (5,2): cx 0 → x 4–5; bottom on the bottom edge of row 2
  const a = stand(img, { cx: 0, base: 16, shadow: 0, contact: 0 });
  a.glow = (g, x, y, env) => {
    // night: the desk lamp is on — the bulb under the green shade
    const n = env.grade.night;
    if (n < 0.05) return;
    g.rect(x + a.ox + 27, y + a.oy + 13, 4, 1, P.glint, 0.95 * n);
    g.rect(x + a.ox + 26, y + a.oy + 14, 6, 1, P.horizon, 0.6 * n);
    halo(g, x + a.ox + 29, y + a.oy + 15, 8, LIGHT.lamp, 0.35 * n);
  };
  a.light = (g, x, y, env) => {
    // a bright oval on the desk top under the lamp, a softer spill on the floor
    const n = env.grade.night;
    if (n < 0.05) return;
    drawLight(g, poolEllipse(16, 7, LIGHT.lamp), x + a.ox + 25, y + a.oy + 23, 0.9 * n);
    drawLight(g, poolEllipse(34, 20, LIGHT.lamp), x + a.ox + 22, y + a.oy + 44, 0.45 * n);
    drawLight(g, poolEllipse(22, 14, LIGHT.lamp), x + a.ox + 26, y + a.oy + 10, 0.35 * n);
  };
  a.over = (g, x, y, env) => {
    // 1px twinkle on the notebook's corner every other second (#FFF6D8)
    if (Math.floor(env.t / 1000) % 2) {
      g.rect(x + a.ox + 13, y + a.oy + 21, 1, 1, P.glint);
      g.rect(x + a.ox + 12, y + a.oy + 21, 1, 1, P.glint);
      g.rect(x + a.ox + 13, y + a.oy + 20, 1, 1, P.glint);
    }
  };
  return a;
});

registerProp('obj_mushikago', () => {
  const p = pc(16, 26);
  // stool
  p.rect(2, 12, 12, 3, P.woodLt);
  p.vline(3, 15, 25, P.wood);
  p.vline(12, 15, 25, P.wood);
  // bug cage: green lid, clear body, a beetle
  p.rect(3, 4, 10, 8, P.aqua);
  for (let x = 4; x < 12; x += 2) p.vline(x, 5, 11, P.white);
  p.rect(3, 2, 10, 3, P.leafDeep);
  p.hline(3, 12, 2, P.leaf);
  p.rect(7, 9, 3, 2, P.woodDark);
  p.set(6, 9, P.woodDark);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 0, contact: 12, base: 18 });
});

registerProp('obj_bookshelf_room', () => {
  const p = pc(18, 44);
  p.rect(1, 6, 16, 37, P.wood);
  p.vline(1, 6, 42, P.woodLt);
  p.vline(16, 6, 42, P.woodDark);
  for (let s = 0; s < 3; s++) {
    const y = 9 + s * 11;
    p.rect(3, y, 12, 9, P.woodDark);
    for (let k = 0; k < 5; k++) {
      const c = [P.red, P.navy, P.gold, P.leafDeep, P.peach, P.aqua, P.white][(k + s * 2) % 7];
      p.rect(3 + k * 2 + (k > 2 ? 1 : 0), y + 1 + (k % 2), 2, 8 - (k % 2), c);
    }
  }
  // globe on top
  p.ellipse(9, 3, 4, 3.5, P.blue);
  p.set(7, 2, P.leafYoung);
  p.set(10, 4, P.leafYoung);
  p.vline(9, 6, 6, P.brass);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { base: 16, shadow: 0, contact: 14 });
});

registerProp('obj_randoseru', () => {
  const p = pc(16, 16);
  p.rect(3, 3, 10, 11, P.charcoal);
  p.rect(3, 3, 10, 5, P.ink);
  p.hline(3, 12, 3, P.asphalt);
  p.set(8, 6, P.brass);
  // lunch bag hanging on the side
  p.rect(12, 7, 3, 5, P.paper);
  p.set(13, 8, P.verm);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 0, contact: 10 });
});

const FAN = mkFrames(5, 16, 26, (p, k) => {
  // white fan, blue blades; frames 0–3 oscillate, 4 = stuck tilted (stage 1)
  p.rect(5, 22, 6, 3, P.white);
  p.hline(5, 10, 24, P.concrete);
  p.vline(8, 12, 22, P.concreteLt);
  const face = k === 4 ? 2 : [-1, 0, 1, 0][k];
  p.ellipse(8 + face, 8, 6, 6, P.white);
  p.ring(8 + face, 8, 6, 6, P.concrete);
  p.ellipse(8 + face, 8, 4, 4, P.aqua);
  const bl = [[[6, 6], [10, 10]], [[10, 6], [6, 10]], [[8, 5], [8, 11]], [[5, 8], [11, 8]]][k % 4];
  for (const [x, y] of bl) {
    p.set(x + face, y, P.blue);
    p.set(x + face + (x < 8 ? 1 : -1), y, P.blue);
  }
  p.set(8 + face, 8, P.steel);
}, (p) => finish(p, { soft: true }));

registerProp('obj_fan', () =>
  standAnim(FAN, (env) => (env.stage >= 1 && env.stage < 3 ? 4 : Math.floor(env.mt / 400) % 4), { shadow: 0, contact: 10 }),
);

registerProp('room_home_2f_decor', () => {
  // round rug, crumpled paper, a soccer ball (flat)
  const p = pc(80, 40);
  p.ellipse(34, 18, 30, 14, P.paperGrid);
  p.ring(34, 18, 30, 14, P.brass);
  p.ring(34, 18, 24, 10, P.goldPale);
  p.ellipse(12, 30, 2.5, 2, P.white);
  p.set(11, 29, P.concrete);
  p.ellipse(52, 8, 2, 1.5, P.white);
  // soccer ball
  p.ellipse(66, 30, 4, 4, P.white);
  p.set(65, 29, P.ink);
  p.set(67, 31, P.ink);
  p.set(64, 32, P.ink);
  return flat(p.toCanvas(), 0, 0);
});

// ---------------------------------------------------------------- ceiling light (pendant, foreground)

/**
 * 天井の照明: a round pendant hanging from the ceiling (so in the 3/4 view
 * it floats well above its floor spot): cord and ceiling rose, a paper
 * shade (笠) on a wooden ring, the milk-glass globe under it and a pull
 * string with a wooden knob that sways (3 frames, frozen in stage 1).
 * Frame 0 is the lamp off (day), frame 1 lit (night).
 */
function pendantFrames(): HTMLCanvasElement[] {
  return [0, 1].map((lit) => {
    const p = pc(28, 22);
    const cx = 14;
    // ceiling rose and cord
    p.rect(cx - 3, 0, 6, 2, P.concreteLt);
    p.hline(cx - 3, cx + 2, 0, P.white);
    p.vline(cx, 2, 6, P.charcoal);
    p.set(cx - 1, 3, P.steel);
    // paper shade: a shallow cone, narrow top (rim ring), wide bottom
    const top = 7;
    const hgt = 7;
    for (let j = 0; j < hgt; j++) {
      const half = 3 + Math.round((j / (hgt - 1)) * 7);
      for (let i = -half; i < half; i++) {
        const u = (i + half) / (half * 2);
        let c: string = lit ? (u < 0.25 ? P.glint : u > 0.78 ? P.goldPale : P.horizon) : u < 0.22 ? P.white : u > 0.75 ? P.paperGrid : P.paper;
        if (!lit && j === hgt - 2 && u > 0.3) c = P.concreteLt;
        p.set(cx + i, top + j, c);
      }
    }
    // wooden rings at the top and the rim
    p.hline(cx - 3, cx + 2, top, P.woodLt);
    p.hline(cx - 10, cx + 9, top + hgt - 1, P.wood);
    p.set(cx - 10, top + hgt - 1, P.woodLt);
    p.set(cx + 9, top + hgt - 1, P.woodDark);
    // ribs of the paper shade
    for (const i of [-5, 0, 5]) p.line(cx + Math.round(i / 2), top + 1, cx + i, top + hgt - 2, lit ? P.goldPale : P.paperGrid);
    // milk-glass globe under the shade
    const gy = top + hgt + 1;
    p.ellipse(cx - 0.5, gy, 4, 2.5, lit ? P.glint : P.white);
    p.hline(cx - 3, cx + 1, gy - 2, lit ? P.glint : P.concreteLt);
    if (!lit) p.hline(cx - 3, cx + 2, gy + 1, P.concrete);
    finish(p, { soft: true, rim: false });
    return p.toCanvas();
  });
}

registerProp('prop_ceiling_light', (opts) => {
  const [off, on] = pendantFrames();
  const W = off.width;
  const string = mkFrames(3, 5, 12, (p, k) => {
    const d = [-1, 0, 1][k];
    p.line(2, 0, 2 + d, 8, P.concrete);
    p.rect(1 + d, 9, 3, 3, P.woodLt);
    p.set(1 + d, 9, P.goldPale);
    p.set(3 + d, 11, P.woodDark);
  });
  // the lamp hangs above its floor spot (anchor tile): opts.ly is the image
  // top relative to the tile top (a low pendant over a table: about -30)
  const LY = Number(opts.ly ?? -34);
  // (QA round 1) so it reads as hanging, not floating: the cord goes on up
  // out of sight to the ceiling, and the floor under it takes a soft shadow
  // of the shade by day (the warm pool of light at night)
  const CL = Number(opts.cord ?? 18);
  const cordImg = (() => {
    const p = pc(3, CL);
    for (let j = 0; j < CL; j++) p.set(1, j, j % 3 === 2 ? P.asphalt : P.charcoal);
    p.set(0, CL - 4, P.steel); // the cord's lit side catches a little light
    p.set(0, CL - 9, P.steel);
    return p.toCanvas();
  })();
  return {
    ox: -6,
    oy: LY,
    w: W,
    h: 22,
    foot: 0,
    flat: true,
    img: () => null,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      const n = env.grade.night;
      if (n > 0.6) return;
      const a = 0.16 * (1 - n);
      // the shade's shadow on the floor straight below it, dithered edge
      for (let j = -3; j <= 3; j++) {
        const half = Math.round(10 * Math.sqrt(1 - (j / 3.6) ** 2));
        g.rect(x + 8 - half + 2, y + 10 + j, half * 2 - 4, 1, P.ink, a);
        g.rect(x + 8 - half, y + 10 + j, 2, 1, P.ink, a * 0.5);
        g.rect(x + 8 + half - 2, y + 10 + j, 2, 1, P.ink, a * 0.5);
      }
    },
    glowFg: true,
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      // night: the shade glows and the globe is bright (emissive)
      const n = env.grade.night;
      if (n < 0.05) return;
      g.img(on, x - 6, y + LY, { alpha: Math.min(1, n * 1.2) });
      halo(g, x + 8, y + LY + 17, 14, LIGHT.lamp, 0.3 * n);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      // the room's warm centre: a squashed pool on the floor under the lamp
      const n = env.grade.night;
      if (n < 0.05) return;
      drawLight(g, poolEllipse(60, 36, LIGHT.lamp), x + 8, y + 10, 0.72 * n);
      drawLight(g, poolEllipse(26, 16, LIGHT.lamp), x + 8, y + 10, 0.25 * n);
      // light on the walls/ceiling round the shade
      drawLight(g, poolEllipse(40, 26, LIGHT.lamp), x + 8, y + LY + 12, 0.35 * n);
    },
    fg: [
      { ox: 7, oy: LY - CL + 1, img: () => cordImg },
      { ox: -6, oy: LY, img: () => off, fade: { x: -2, y: LY - 4, w: 20, h: 36, alpha: 0.5 } },
      { ox: 6, oy: LY + 18, img: (env: PropEnv) => (env.stage === 1 ? string[1] : string[[0, 1, 2, 1][Math.floor(env.mt / 400) % 4]]) },
    ],
  } as PropArt;
});

// ---------------------------------------------------------------- 1F shell

/** The kitchen's fluorescent fixture (room px): over the sink and the cutting board. */
const TUBE_X = 16 + 2;
const TUBE_Y = 2;
const TUBE_W = 30;

registerProp('room_home_1f', () => {
  const rows = getMapDef('map_home_1f')?.rows ?? [];
  const kitchenWall = (x: number, y: number, fh: number) => {
    // kitchen x1–6: tiled backsplash under plaster; living room: plaster with pillars
    const tx = Math.floor(x / 16);
    if (tx <= 6) {
      if (y > fh * 0.45) return (x % 5 === 4 || y % 5 === 4) ? P.concrete : P.white;
      return valueNoise(x / 5, y / 5, 7) > 0.8 ? P.paper : P.paperGrid;
    }
    if (x % 64 < 3) return x % 64 === 0 ? P.woodLt : P.wood; // pillars
    return valueNoise(x / 5, y / 5, 9) > 0.82 ? P.paper : P.goldPale;
  };
  const { img, glass } = (
    roomShell(rows, { wall: kitchenWall, base: P.woodDark, trim: P.wood }, (p, gm) => {
      // kitchen window above the sink (1–2, 0–1)
      const wx = 16 + 4;
      p.rect(wx - 2, 6, 28, 14, P.woodLt);
      p.rect(wx, 8, 24, 10, P.shadeDeep);
      gm.rect(wx, 8, 24, 10, '#ffffff');
      p.vline(wx + 12, 8, 17, P.woodLt);
      // range hood above the stove (4,1)
      p.rect(4 * 16 + 1, 4, 14, 10, P.steel);
      p.hline(4 * 16 + 1, 4 * 16 + 14, 4, P.concreteLt);
      p.rect(4 * 16 + 3, 12, 10, 3, P.asphalt);
      castRight(p, 4 * 16 + 1, 4, 14, 10, 2);
      // fluorescent fixture on the wall over the sink and the board: a steel
      // housing, the tube under it, end caps, a pull cord with a knob
      p.rect(TUBE_X, TUBE_Y, TUBE_W, 4, P.concreteLt);
      p.hline(TUBE_X, TUBE_X + TUBE_W - 1, TUBE_Y, P.white);
      p.hline(TUBE_X, TUBE_X + TUBE_W - 1, TUBE_Y + 3, P.steel);
      p.hline(TUBE_X + 2, TUBE_X + TUBE_W - 3, TUBE_Y + 4, P.white);
      p.hline(TUBE_X + 2, TUBE_X + TUBE_W - 3, TUBE_Y + 5, P.concrete);
      p.rect(TUBE_X, TUBE_Y + 4, 2, 2, P.steel);
      p.rect(TUBE_X + TUBE_W - 2, TUBE_Y + 4, 2, 2, P.asphalt);
      p.vline(TUBE_X + TUBE_W - 5, TUBE_Y + 6, TUBE_Y + 11, P.concrete);
      p.set(TUBE_X + TUBE_W - 5, TUBE_Y + 12, P.verm);
      castRight(p, TUBE_X, TUBE_Y, TUBE_W, 6, 2);
      // cat calendar on the pillar (6,1)
      const cx = 6 * 16 + 3;
      p.rect(cx, 8, 10, 14, P.white);
      p.rect(cx + 2, 10, 6, 5, P.woodLt); // the cat in a box
      p.rect(cx + 3, 9, 4, 2, P.brass);
      p.set(cx + 4, 10, P.ink);
      printLines(p, cx + 1, 17, 8, 2, P.steel, 3);
      castRight(p, cx, 8, 10, 14, 2);
      // framed picture and a clock in the living room
      p.rect(10 * 16 + 2, 6, 20, 12, P.wood);
      p.rect(10 * 16 + 4, 8, 16, 8, P.aqua);
      p.rect(10 * 16 + 4, 12, 16, 4, P.leafYoung);
      castRight(p, 10 * 16 + 2, 6, 20, 12, 2);
      p.ellipse(7 * 16 + 8, 10, 4, 4, P.white);
      p.ring(7 * 16 + 8, 10, 4, 4, P.woodDark);
      p.vline(7 * 16 + 8, 7, 10, P.ink);
      p.hline(7 * 16 + 8, 7 * 16 + 10, 10, P.ink);
      // stairs up (12,2): six steps rising north into an opening in the wall,
      // narrowing as they climb, stringers and a handrail with balusters
      paintStairsUp(p, 12 * 16, 2 * 16 + 15);
      // genkan door (2,8): sliding lattice door seen from inside, light through the glass
      const dx = 2 * 16;
      const dy = 8 * 16;
      p.rect(dx - 2, dy, 20, 6, P.woodDark);
      for (let i = dx; i < dx + 16; i += 3) p.vline(i, dy + 1, dy + 4, P.goldPale);
      p.hline(dx - 2, dx + 17, dy, P.wood);
      // engawa (y7, x5–12): the sliding glass doors to the garden along the south edge
      const ey = 8 * 16;
      p.rect(5 * 16, ey, 8 * 16, 5, P.woodLt);
      for (let i = 5 * 16; i < 13 * 16; i += 32) p.vline(i, ey, ey + 4, P.woodDark);
      p.hline(5 * 16, 13 * 16 - 1, ey + 1, P.glint);
    })
  );
  const W = img.width;
  const H = img.height;
  return {
    ox: 0,
    oy: 0,
    w: W,
    h: H,
    foot: 0,
    flat: true,
    img: () => img,
    glass,
    over(g, x, y, env) {
      roomLight(g, x, y + 32, W, H - 32, env, [
        [5 * 16, 7 * 16 - 32, 8 * 16, 20, 0.2],
        [16, 32, 30, 20, 0.18],
      ]);
    },
    glow(g, x, y, env) {
      // night: the kitchen's fluorescent tube (cool white, a rare flicker)
      const n = env.grade.night;
      if (n < 0.05) return;
      const flick = Math.floor(env.t / 70) % 97 === 0 ? 0.4 : 1;
      g.rect(x + TUBE_X + 2, y + TUBE_Y + 4, TUBE_W - 4, 1, P.glint, 0.95 * n * flick);
      g.rect(x + TUBE_X + 1, y + TUBE_Y + 5, TUBE_W - 2, 1, P.white, 0.5 * n * flick);
      halo(g, x + TUBE_X + TUBE_W / 2, y + TUBE_Y + 6, 6, LIGHT.tube, 0.3 * n * flick);
    },
    light(g, x, y, env) {
      const n = env.grade.night;
      if (n < 0.05) return;
      const flick = Math.floor(env.t / 70) % 97 === 0 ? 0.4 : 1;
      // on the worktop and the kitchen floor, and a band on the wall under it
      drawLight(g, poolEllipse(44, 26, LIGHT.tube), x + TUBE_X + TUBE_W / 2, y + 3 * 16 + 10, 0.6 * n * flick);
      drawLight(g, poolEllipse(30, 10, LIGHT.tube), x + TUBE_X + TUBE_W / 2, y + TUBE_Y + 10, 0.45 * n * flick);
    },
  };
});

// ---------------------------------------------------------------- 1F furniture

function counter(p: PixelCanvas, x: number, w: number, top: string = P.concreteLt): void {
  p.rect(x, 8, w, 4, top);
  p.hline(x, x + w - 1, 8, P.white);
  p.rect(x, 12, w, 18, P.woodLt);
  p.hline(x, x + w - 1, 12, P.wood);
  p.hline(x, x + w - 1, 29, P.woodDark);
  p.vline(x + w - 1, 12, 29, P.wood);
}

registerProp('obj_cabbage', () => {
  // sink with a colander of shredded cabbage
  const p = pc(16, 32);
  counter(p, 0, 16, P.steel);
  p.rect(2, 9, 12, 3, P.asphalt);
  p.vline(12, 2, 9, P.steel);
  p.hline(9, 12, 2, P.steel);
  p.ellipse(8, 7, 5, 3, P.concrete);
  for (let i = 0; i < 9; i++) p.set(4 + i, 5 + (i % 3), i % 2 ? P.leafLt : P.leafYoung);
  p.rect(3, 16, 10, 8, P.wood);
  return stand(p.toCanvas(), { base: 16, shadow: 0, contact: 0 });
});

const BOARD = mkFrames(2, 16, 32, (p, k) => {
  counter(p, 0, 16);
  p.rect(2, 5, 12, 5, P.woodLt);
  p.hline(2, 13, 5, P.goldPale);
  for (let i = 3; i < 9; i++) p.set(i, 7, P.leafLt);
  // knife up/down
  p.rect(10, k ? 2 : 4, 1, 4, P.concreteLt);
  p.rect(10, k ? 6 : 8, 2, 2, P.woodDark);
});
registerProp('prop_cutting_board', () => standAnim(BOARD, (env) => Math.floor(env.t / 180) % 2, { base: 16, shadow: 0, contact: 0 }));

const COOKER = mkFrames(3, 16, 32, (p, k) => {
  counter(p, 0, 16);
  p.rect(3, 2, 10, 8, P.white);
  p.hline(3, 12, 2, P.glint);
  p.rect(5, 6, 3, 2, P.ink);
  p.set(6, 6, P.leafYoung); // 保温 lamp
  const s = [[7, 0], [8, -1], [7, -2]][k];
  p.set(s[0], 0 + s[1] + 1, P.concreteLt);
});
registerProp('obj_rice_cooker', () => standAnim(COOKER, (env) => (env.stage === 1 ? 0 : Math.floor(env.mt / 250) % 3), { base: 16, shadow: 0, contact: 0 }));

const STOVE = mkFrames(2, 16, 32, (p, k) => {
  counter(p, 0, 16, P.charcoal);
  p.ring(5, 10, 3, 1.5, P.asphalt);
  p.ring(11, 10, 3, 1.5, P.asphalt);
  // pot with a rattling lid
  p.rect(2, 4, 8, 6, P.steel);
  p.hline(2, 9, 4, P.concreteLt);
  p.rect(1, k ? 2 : 3, 10, 2, P.concrete);
  p.set(6, k ? 1 : 2, P.charcoal);
  p.rect(3, 16, 10, 10, P.charcoal);
  p.rect(4, 17, 8, 5, P.ink);
});
registerProp('prop_stove', () => standAnim(STOVE, (env) => (env.stage === 1 ? 0 : Math.floor(env.mt / 200) % 2), { base: 16, shadow: 0, contact: 0 }));

registerProp('obj_fridge', () => {
  const p = pc(16, 44);
  p.rect(1, 1, 14, 42, P.white);
  p.vline(1, 1, 42, P.glint);
  p.vline(14, 2, 42, P.concrete);
  p.hline(1, 14, 16, P.concreteLt);
  p.vline(12, 6, 12, P.steel);
  p.vline(12, 20, 28, P.steel);
  // magnets and Minato's drawing
  p.rect(3, 20, 7, 6, P.paper);
  p.set(5, 22, P.sunDeep);
  p.set(7, 23, P.leaf);
  p.set(4, 8, P.red);
  p.set(8, 5, P.gold);
  p.hline(1, 14, 42, P.steel);
  return stand(p.toCanvas(), { base: 16, shadow: 0, contact: 0 });
});

registerProp('obj_cat_calendar', () => {
  // the pillar between kitchen and living room
  const p = pc(8, 32);
  p.rect(2, 0, 4, 31, P.wood);
  p.vline(2, 0, 30, P.woodLt);
  p.vline(5, 0, 30, P.woodDark);
  return stand(p.toCanvas(), { base: 16, shadow: 0, contact: 0 });
});

registerProp('obj_tv', () => {
  const p = pc(32, 32);
  // low TV stand
  p.rect(1, 20, 30, 10, P.woodDark);
  p.hline(1, 30, 20, P.wood);
  p.rect(4, 23, 10, 5, P.ink);
  p.rect(18, 23, 10, 5, P.ink);
  // flat TV
  p.rect(3, 3, 26, 16, P.ink);
  p.rect(4, 4, 24, 13, P.navy);
  p.rect(14, 19, 4, 1, P.charcoal);
  return {
    ...stand(p.toCanvas(), { cx: 16, base: 16, shadow: 0, contact: 0 }),
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      // flickering screen (news / looping / "please wait" / weather)
      const sx = x + 16 - 16 + 4;
      const sy = y + 16 - 32 + 4;
      const f = Math.floor(env.t / 260) % 4;
      const cols = env.stage === 2 ? [P.lilac, P.lilac, P.shade, P.lilac] : [P.aqua, P.blue, P.aqua, P.glow];
      g.rect(sx, sy, 24, 13, cols[f]);
      if (env.stage === 2) {
        g.rect(sx + 4, sy + 4, 16, 5, P.white);
      } else {
        g.rect(sx + 2, sy + 8, 10, 4, P.skin2);
        g.rect(sx + 3, sy + 4, 8, 4, P.woodDark);
        g.rect(sx + 14, sy + 3, 8, 6, P.white);
      }
    },
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      // at night the picture itself is the brightest thing in the room
      const n = env.grade.night;
      if (n < 0.05) return;
      const sx = x + 4;
      const sy = y + 16 - 32 + 4;
      const f = Math.floor(env.t / 260) % 4;
      const cols = [P.aqua, P.blue, P.aqua, P.glow];
      g.rect(sx, sy, 24, 13, cols[f], 0.55 * n);
      g.rect(sx + 14, sy + 3, 8, 6, P.white, 0.6 * n);
      halo(g, x + 16, y - 6, 16, LIGHT.tv, (0.2 + 0.06 * (f % 2)) * n);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      // screen light thrown on the tatami in front of it (#7FD1E8), flickering in 2 frames
      const n = env.grade.night;
      const k = Math.floor(env.t / 260) % 2;
      const a = (0.12 + 0.55 * n) * (k ? 0.78 : 1);
      drawLightAt(g, poolTrapezoid(28, 56, 34, LIGHT.tv), x + 16 - 28, y + 16, a);
      drawLight(g, poolEllipse(22, 12, LIGHT.tv), x + 16, y + 4, a * 0.6);
    },
  } as PropArt;
});

registerProp('obj_chabudai', () => {
  const p = pc(34, 22);
  // round low table with four cushions
  for (const [cx, cy] of [[4, 11], [30, 11], [17, 3], [17, 19]]) {
    p.rect(cx - 4, cy - 2, 8, 5, P.verm);
    p.hline(cx - 4, cx + 3, cy - 2, P.vermLt);
  }
  p.ellipse(17, 10, 12, 6, P.wood);
  p.ellipse(16, 9, 10, 4.5, P.woodLt);
  // barley tea pot and the ring stain
  p.rect(14, 5, 4, 5, P.aqua);
  p.set(14, 5, P.white);
  p.ring(21, 10, 2, 1, P.wood);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 16, base: 20, shadow: 0, contact: 26 });
});

registerProp('obj_newspaper', () => {
  const p = pc(14, 10);
  p.rect(1, 1, 12, 8, P.white);
  printLines(p, 2, 2, 10, 3, P.steel, 7);
  p.ring(9, 6, 2, 1.5, P.verm);
  return flat(p.toCanvas(), 1, 6);
});

registerProp('obj_genkan', () => {
  // shoe cabinet with the key tray
  const p = pc(16, 30);
  p.rect(1, 6, 14, 23, P.woodLt);
  p.hline(1, 14, 6, P.goldPale);
  p.vline(8, 7, 28, P.wood);
  p.set(6, 16, P.brass);
  p.set(10, 16, P.brass);
  p.rect(4, 3, 8, 3, P.concrete); // key tray (empty spot)
  p.set(9, 4, P.blue);
  p.rect(2, 1, 4, 5, P.leafDeep); // a small plant
  p.set(3, 0, P.leaf);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { base: 16, shadow: 0, contact: 12 });
});

const KATORI = mkFrames(4, 16, 22, (p, k) => {
  // pig-shaped mosquito coil holder, smoke rising (frame 3 = frozen smoke)
  p.ellipse(8, 16, 6, 4.5, P.leafShade);
  p.ellipse(7, 15, 4, 3, P.leafDeep);
  p.ellipse(2.5, 16, 1.5, 2, P.leafShade);
  p.set(4, 14, P.ink);
  p.set(1, 16, P.ink);
  const s = k === 3 ? [[8, 9], [9, 6], [8, 3]] : [[8, 10 - k], [9, 7 - k], [8 + (k % 2), 4 - k]];
  for (const [x, y] of s) {
    if (y < 0) continue;
    p.set(x, y, P.concreteLt);
    p.set(x + 1, y - 1, P.concrete);
  }
});
registerProp('obj_katori', () => standAnim(KATORI, (env) => (env.stage === 1 ? 3 : Math.floor(env.mt / 300) % 3), { base: 16, shadow: 0, contact: 10 }));

registerProp('obj_furin', () => {
  // 風鈴 (review round 2): it hangs from the eave beam (軒桁) along the south
  // edge of the engawa (the y=8 line), drawn in the foreground; the glass
  // bell and its paper strip hang in front of the dark garden below it.
  const frames = mkFrames(3, 10, 19, (p, k) => {
    const sx = [0, 1, -1][k];
    p.vline(5, 0, 2, P.steel);
    p.ellipse(5, 5.5, 3.2, 3, P.aqua);
    p.hline(3, 5, 3, P.glint);
    p.set(3, 4, P.glint);
    p.ellipse(5, 6, 1.6, 1.2, P.white);
    p.set(4, 5, P.red); // painted goldfish
    p.hline(2, 8, 8, P.blue);
    p.vline(5, 9, 11, P.steel);
    p.set(5 + sx, 9, P.steel);
    // the paper strip (短冊) swinging, a red stroke on it
    p.rect(4 + sx, 12, 3, 7, P.paper);
    p.vline(6 + sx, 12, 18, P.paperGrid);
    p.set(5 + sx, 14, P.verm);
    p.set(5 + sx, 15, P.verm);
  }, (p) => finish(p, { soft: true, rim: false }));
  const beam = (() => {
    const p = pc(8 * 16 + 4, 6);
    p.rect(0, 0, p.w, 4, P.wood);
    p.hline(0, p.w - 1, 0, P.woodLt);
    p.hline(0, p.w - 1, 1, P.goldPale);
    p.hline(0, p.w - 1, 3, P.woodDark);
    for (let x = 6; x < p.w; x += 9) p.set(x, 2, P.woodDark);
    // posts' tops at the ends and the middle
    for (const x of [0, 64, p.w - 4]) {
      p.rect(x, 0, 4, 6, P.woodDark);
      p.vline(x, 0, 5, P.wood);
    }
    // the hook for the chime
    p.set(10 * 16 + 9 - 5 * 16 + 2, 4, P.steel);
    finish(p, { soft: true, rim: false });
    return p.toCanvas();
  })();
  // anchor (10,7): the eave line is the top of row 8 (world y 128)
  const BY = 16 - 2;
  return {
    ox: 4,
    oy: BY,
    w: 10,
    h: 19,
    foot: 0,
    img: () => null,
    fg: [
      { ox: -5 * 16 - 2, oy: BY, img: () => beam },
      { ox: 4, oy: BY + 4, img: (env: PropEnv) => frames[env.stage === 1 ? 1 : Math.floor(env.mt / 700) % 3] },
    ],
  } as PropArt;
});

export { roomShell as paintRoomShell, blendPx };

// ---------------------------------------------------------------- generic shell for other indoor maps

const WALL_PRESETS: Record<string, RoomStyle['wall']> = {
  wallpaper: wallpaper(P.paperGrid, P.paper, 11),
  plaster: (x, y) => (valueNoise(x / 5, y / 5, 13) > 0.8 ? P.paper : P.goldPale),
  tile: (x, y) => (x % 5 === 4 || y % 5 === 4 ? P.concrete : P.white),
  wood: (x, y) => (x % 6 === 5 ? P.woodDark : valueNoise(Math.floor(x / 6) * 3, y / 4, 17) > 0.7 ? P.wood : P.woodLt),
  mall: (x, y) => (valueNoise(x / 9, y / 9, 19) > 0.75 ? P.concreteLt : P.paperGrid),
  concrete: (x, y) => (valueNoise(x / 6, y / 6, 23) > 0.78 ? P.concreteLt : P.concrete),
};

/**
 * 'room_shell' — the wall faces / wall sections / floor shading of any indoor
 * map. Place it at (0,0): { t: 'prop', prop: 'room_shell', x: 0, y: 0,
 * opts: { map: 'map_koban', wall: 'plaster', base: '#5A3A2A', trim: '#C8A06A' } }.
 */
registerProp('room_shell', (opts) => {
  const rows = getMapDef(String(opts.map ?? ''))?.rows ?? [];
  const wall = WALL_PRESETS[String(opts.wall ?? 'plaster')] ?? WALL_PRESETS.plaster;
  const { img, glass } = roomShell(rows, {
    wall,
    base: (opts.base as string | undefined) ?? P.wood,
    trim: (opts.trim as string | undefined) ?? P.woodLt,
    section: (opts.section as string | undefined) ?? P.nightShade,
  });
  const W = img.width;
  const H = img.height;
  return {
    ox: 0,
    oy: 0,
    w: W,
    h: H,
    foot: 0,
    flat: true,
    img: () => img,
    glass,
    over(g, x, y, env) {
      roomLight(g, x, y + 32, W, H - 32, env, []);
    },
  };
});
