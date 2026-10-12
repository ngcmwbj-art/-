// 旧水族館 (62_ch3_level_art 4.8〜4.17, 7.4, 8.5〜8.8): the rooms of the
// chapter's third part, inside the old aquarium on the cape. Inside it is
// still 12:00 (stage 3): nothing moves but the marine snow in the deep-sea
// room and the second hands of 夕鳴町's and 星見台's clocks over the models.
//
//  - 入口と券売所: white tiles gone grey, the blue band, porthole windows, the
//    ticket booth's window, the empty shop, the penguin sign, the sunfish
//    hanging from the ceiling;
//  - 回廊: the north wall papered with 40 years of ツガオ便's slips — yellow in
//    the west, white in the east, three hands (thick strokes, then thin ones
//    from x14, round dots from x27), the twelve with a red-pencil mark, the
//    blank day lit by the one slanting light; green exit lamps;
//  - ジオラマの 部屋: a black room, three models of the towns on black stands,
//    each under its own hour's light, the three clocks;
//  - 深海の 展示室: rows of empty cases in the dark, the scratched tank;
//  - えさの 部屋: the keeper's room under its one tube;
//  - 大水槽の ホール: the empty tank across the north wall, its blue left in
//    the glass, the noon light in a column onto the bench;
//  - えさの 倉庫 / 廊下: concrete, bare bulbs; 事務所: 52 12.5's room.
//
// Words on signs and slips are strokes, never letters (62 10.0).

import { mix, PixelCanvas } from '../../engine/pixel';
import type { Gfx } from '../../engine/gfx';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { CP } from '../tiles/c3_ground';
import { getMapDef } from '../../world/maps';
import { blend, dust, lightQuad, paintShell, screenPool, warmPool } from './ishell';
import { boards } from '../tiles/ifloor';
import { outline } from './kit';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';
import { dioramaTown, dollSpots } from './c3_aq_diorama';
import { state } from '../../game/state';

/** Frames cached by key. */
function cached<K>(make: (k: K) => HTMLCanvasElement): (k: K) => HTMLCanvasElement {
  const m = new Map<K, HTMLCanvasElement>();
  return (k) => {
    let c = m.get(k);
    if (!c) m.set(k, (c = make(k)));
    return c;
  };
}

/** The aquarium's palette (62 8.2: the house's white tiles, the blue band, the dark of the back rooms). */
export const AQ = {
  tile: '#E0DCD0',
  tileLt: '#ECE8DE',
  tileDk: '#C4C0B4',
  grout: '#9A968C',
  band: CP.aqBand,
  bandDk: '#2A5A82',
  wall: '#D8D4C8',
  wallDk: '#B8B4A8',
  glass: CP.glass,
  ink: '#2A2440',
  black: '#0B0B14',
  mada: '#0B0B14',
  shu: '#E23B2E',
  paperOld: '#E8D9B5',
  paperNew: '#F4F1E8',
  redPencil: '#E84E3C',
  exitGreen: '#3FA66B',
  bulb: '#FFE7A3',
  deep: '#1A2A3A',
  deepLt: '#2A3E52',
} as const;

/** The black stamp 「まだ」 (52 12.5's shape: an oval, the left half of ま worn away), w × h. */
export function madaStamp(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number): void {
  p.ellipse(cx, cy, rx, ry, AQ.mada);
  // the worn part, and the two strokes of the letters as darker lines inside
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx - Math.round(rx * 0.3); x++) if (ihash(x, y, 7101) % 3 === 0 && p.alpha(x, y)) p.set(x, y, '#2A2440');
  if (rx >= 5) {
    p.hline(cx - 1, cx + Math.round(rx * 0.5), cy - 1, '#2A2440');
    p.vline(cx + 1, cy - Math.round(ry * 0.6), cy + Math.round(ry * 0.5), '#2A2440');
  }
}

/** Old white tiles, gone grey, a grout line every 16px, chips and stains (62 4.8). */
function aqFloor(x: number, y: number, seed: number, dim = 0): string {
  const lx = x & 15;
  const ly = y & 15;
  if (lx === 15 || ly === 15) return mix(AQ.grout, '#3A3F48', dim);
  const t = ihash(x >> 4, y >> 4, seed);
  let c: string = t % 5 === 0 ? AQ.tileDk : t % 3 === 0 ? AQ.tileLt : AQ.tile;
  if (lx === 0 || ly === 0) c = mix(c, '#FFFFFF', 0.25);
  const n = valueNoise(x / 9, y / 7, seed + 1);
  if (n > 0.7) c = mix(c, '#A89C88', 0.25);
  if (h01(x, y, seed + 2) > 0.993) c = '#8A8678';
  return mix(c, '#3A4A5A', dim);
}

/** The aquarium's wall: white plaster, the blue band at eye height, a dark skirting (fh px tall). */
function aqWall(x: number, y: number, fh: number, dim = 0): string {
  const bandY = Math.round(fh * 0.55);
  let c: string;
  if (y >= bandY && y < bandY + 4) c = y === bandY ? mix(AQ.band, '#FFFFFF', 0.2) : AQ.band;
  else c = valueNoise(x / 8, y / 6, 7103) > 0.75 ? AQ.wallDk : AQ.wall;
  // damp stains down from the ceiling
  if (y < bandY && valueNoise(x / 13, 0.5, 7105) > 0.72 && y < valueNoise(x / 5, 3, 7107) * bandY) c = mix(c, '#A89C88', 0.35);
  return mix(c, '#3A4A5A', dim);
}

/** A porthole window in a wall face (r px): the brass ring, the bright noon outside through the dust. */
function porthole(p: PixelCanvas, cx: number, cy: number, r: number): void {
  p.ellipse(cx, cy, r + 2, r + 2, '#8A6A2A');
  p.ellipse(cx, cy, r + 1, r + 1, '#D9A441');
  p.ellipse(cx, cy, r, r, '#C8E4EC');
  for (let y = cy - r; y <= cy + r; y++)
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) continue;
      if (y > cy + 1) p.set(x, y, mix(CP.umi, '#C8E4EC', 0.4));
      if (x - cx + (y - cy) < -r * 0.6) p.set(x, y, '#F4FAFC');
    }
  for (let k = 0; k < 6; k++) {
    const a = (k / 6) * Math.PI * 2;
    p.set(Math.round(cx + Math.cos(a) * (r + 1.5)), Math.round(cy + Math.sin(a) * (r + 1.5)), '#5A4A2A');
  }
}

/** A paper notice with stroked lines (never letters). */
function notice(p: PixelCanvas, x: number, y: number, w: number, h: number, paper: string, ink: string, lines = 3): void {
  p.rect(x, y, w, h, paper);
  p.hline(x, x + w - 1, y + h - 1, mix(paper, '#000000', 0.15));
  for (let k = 0; k < lines; k++) {
    const yy = y + 2 + k * Math.max(2, Math.floor((h - 3) / lines));
    if (yy >= y + h - 1) break;
    p.hline(x + 2, x + 2 + Math.max(2, Math.round((w - 5) * (0.6 + 0.4 * h01(k, w, 7109)))), yy, ink);
  }
}

/** A green emergency-exit lamp on the wall (2px light, 62 8.6): the box, its running figure as strokes. */
function exitLamp(p: PixelCanvas, x: number, y: number): void {
  p.rect(x, y, 10, 5, '#E8E4D8');
  p.rect(x + 1, y + 1, 8, 3, '#3FA66B');
  p.set(x + 3, y + 2, '#F4F1E8');
  p.line(x + 4, y + 3, x + 6, y + 1, '#F4F1E8');
}

function glowExit(g: Gfx, x: number, y: number): void {
  g.rect(x + 1, y + 1, 8, 3, '#5FD08B', 0.85);
  screenPool(g, x + 5, y + 3, 10, 7, '#3FA66B', 0.35);
}

// ================================================================ 4.8 入口と券売所

registerProp('prop_c3_aq_iriguchi_shell', () => {
  const rows = getMapDef('map_c3_aq_iriguchi')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y, tx, ty, ch) => {
      if (ch === 'e') {
        // inside the ticket booth: old linoleum, a step darker
        return (x + y) % 6 === 0 ? '#7A6A5A' : '#8A7A66';
      }
      if (ch === '.') {
        // the shop: a different, smaller tile (the gift shop's)
        const c = ((x >> 3) + (y >> 3)) & 1 ? '#D0C8B8' : '#C4BCA8';
        return (x & 7) === 7 || (y & 7) === 7 ? '#A8A090' : c;
      }
      return aqFloor(x, y, 7111);
    },
    wall: (x, y, fh) => aqWall(x, y, fh),
    trim: '#B8B4A8',
    base: '#4A5A6A',
    baseH: 4,
  });
  const p = sh.p;
  // the north wall (y0–1): portholes, the old poster (the deep-sea show), the doorway 「順路 →」 at (10,1)
  for (const x of [3, 6, 14]) porthole(p, x * 16 + 8, 12, 5);
  // the doorway to the corridor: the dark beyond, a painted arch, the sign over it (strokes and an arrow)
  const dx = 10 * 16;
  p.rect(dx + 1, 16, 14, 16, '#1A2230');
  p.rect(dx + 3, 20, 10, 12, '#22303E');
  p.hline(dx, dx + 15, 15, AQ.band);
  notice(p, dx - 2, 4, 20, 7, '#F4F1E8', AQ.ink, 1);
  p.line(dx + 11, 7, dx + 15, 7, AQ.shu);
  p.line(dx + 13, 5, dx + 15, 7, AQ.shu);
  p.line(dx + 13, 9, dx + 15, 7, AQ.shu);
  // the loudspeaker high up at (12,1)
  const sx = 12 * 16 + 8;
  p.rect(sx - 4, 3, 9, 6, '#C8C4B8');
  p.rect(sx - 3, 4, 7, 4, '#6B7186');
  for (let k = 0; k < 3; k++) p.hline(sx - 2, sx + 2, 4 + k + (k > 0 ? k - 1 : 0), '#3A3F48');
  // a faded floor plan of the house beside the bench (a board of rooms and arrows)
  p.rect(17 * 16 - 2, 6, 22, 16, '#C8C4B8');
  p.rect(17 * 16, 8, 18, 12, '#E8E4D8');
  for (let k = 0; k < 4; k++) p.strokeRect(17 * 16 + 1 + (k % 2) * 8, 9 + Math.floor(k / 2) * 5, 7, 4, '#6B7186');
  p.set(17 * 16 + 8, 13, AQ.shu);
  // the south side: the booth's wall (y6) with its window, the shop's half wall
  // (the window's glass at (5,6–9): a pale pane, a slot at the counter, the price card)
  for (let ty = 6; ty <= 9; ty++) {
    const X = 5 * 16;
    const Y = ty * 16;
    p.rect(X, Y, 16, 16, '#A8A498');
    p.rect(X + 2, Y + 1, 12, 13, mix(AQ.glass, '#E8E4D8', 0.55));
    for (let j = 0; j < 13; j++) if ((j + ty) % 5 === 0) p.set(X + 3 + (j % 10), Y + 1 + j, '#F4FAFC');
    p.hline(X, X + 15, Y + 14, '#8A867C');
  }
  p.rect(5 * 16 + 4, 8 * 16 + 11, 8, 2, '#3A3F48');
  notice(p, 5 * 16 + 3, 7 * 16 + 3, 10, 7, '#FBF3DC', AQ.ink, 2);
  // inside the booth (dim): the stack of tickets, a calendar on the back wall, a stool
  p.rect(1 * 16 + 4, 7 * 16 + 2, 8, 10, '#F4F1E8');
  p.hline(1 * 16 + 4, 1 * 16 + 11, 7 * 16 + 6, '#C8C2B4');
  p.rect(3 * 16 + 2, 9 * 16 + 4, 8, 6, '#6B5A4A');
  // the shop's cracked counter line and the glass doors' threshold
  p.hline(9 * 16, 19 * 16 - 1, 7 * 16, '#9A968C');
  for (let x = 7 * 16; x < 9 * 16; x++) p.set(x, 11 * 16 + 1, '#8A867C');
  // the light through the glass doors (12:00 outside): a pale patch on the floor
  for (let y = 9 * 16; y < 11 * 16; y++) for (let x = 6 * 16; x < 10 * 16; x++) if ((x + y) % 2 === 0 && Math.abs(x - 8 * 16) < 26 - (11 * 16 - y) * 0.4) blend(p, x, y, '#FFF6D8', 0.28);
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: sh.w * 16,
    h: sh.h * 16,
    foot: 0,
    flat: true,
    img: () => img,
    light: (g, x, y) => {
      // the day through the glass doors: the brightest place in the house
      warmPool(g, x + 8 * 16, y + 10 * 16 + 8, 30, 18, '#FFF6D8', 0.5);
      for (const px of [3, 6, 14]) screenPool(g, x + px * 16 + 8, y + 26, 10, 8, '#E8F4FA', 0.2);
    },
  } satisfies PropArt;
});

/** The old bench of the entrance hall (3–4,3): blue plastic seats on a steel rail, one seat cracked. */
registerProp('prop_c3_aq_bench_s', () =>
  standProp(32, 18, (p) => {
    p.rect(1, 12, 2, 6, '#6B7186');
    p.rect(29, 12, 2, 6, '#6B7186');
    p.rect(0, 10, 32, 2, '#8E95A6');
    for (let k = 0; k < 4; k++) {
      const x = 1 + k * 8;
      p.rect(x, 3, 7, 8, AQ.band);
      p.hline(x, x + 6, 3, mix(AQ.band, '#FFFFFF', 0.3));
      p.rect(x, 8, 7, 3, AQ.bandDk);
    }
    p.line(17, 4, 20, 9, '#1A2A3A');
  }, { cx: 16, base: 16, shadow: 6 }),
);

/** The penguin-shaped sign 「順路 →」 (16–17,3): a cut-out penguin holding a board with an arrow. */
registerProp('prop_c3_aq_penguin', () =>
  standProp(30, 34, (p) => {
    // the penguin: black back, white belly, orange beak and feet; the paint flaking
    p.ellipse(10, 20, 8, 12, '#2A2A3A');
    p.ellipse(11, 22, 5, 9, '#F4F1E8');
    p.ellipse(10, 8, 6, 6, '#2A2A3A');
    p.ellipse(12, 9, 3, 3, '#F4F1E8');
    p.set(12, 8, '#0B0B14');
    p.poly([[15, 9], [19, 10], [15, 11]], '#E8A040');
    p.rect(6, 31, 4, 2, '#E8A040');
    p.rect(12, 31, 4, 2, '#E8A040');
    for (let k = 0; k < 6; k++) p.set(4 + ((k * 5) % 12), 14 + ((k * 7) % 14), '#C8C4B8');
    // the board in its flipper: 「順路」 strokes and the red arrow pointing north (up the hall)
    p.rect(17, 12, 12, 10, '#F4F1E8');
    p.strokeRect(17, 12, 12, 10, '#6B7186');
    p.hline(19, 23, 14, AQ.ink);
    p.hline(19, 22, 16, AQ.ink);
    p.line(19, 19, 27, 19, AQ.shu);
    p.line(25, 17, 27, 19, AQ.shu);
    p.line(25, 21, 27, 19, AQ.shu);
    p.line(16, 20, 18, 18, '#2A2A3A');
    // the stand
    p.rect(8, 33, 14, 1, '#6B7186');
  }, { cx: 16, base: 16, shadow: 30 }),
);

/** The old till behind the booth's window (2,8). */
registerProp('prop_c3_aq_reji', () =>
  standProp(16, 14, (p) => {
    p.rect(1, 6, 14, 8, '#B8B4A8');
    p.hline(1, 14, 6, '#D8D4C8');
    p.rect(3, 1, 9, 6, '#8E95A6');
    p.rect(4, 2, 7, 3, '#3A5A4A');
    p.set(5, 3, '#7AE0A0');
    for (let k = 0; k < 3; k++) p.hline(3, 12, 8 + k * 2, '#6B7186');
  }, { cx: 8, base: 16, shadow: 8 }),
);

/** The gift shop's empty shelves (11–12,8)・(15–16,8); v=1 keeps one dusty plush seal (62 16.2). */
registerProp('prop_c3_aq_tana', (opts) =>
  standProp(32, 26, (p) => {
    p.rect(0, 2, 32, 24, '#B8A888');
    p.rect(2, 4, 28, 20, '#8A7A60');
    for (const y of [9, 16, 23]) {
      p.hline(1, 30, y, '#D8C8A8');
      p.hline(1, 30, y + 1, '#6A5A48');
    }
    // dust lines where goods once stood
    for (let k = 0; k < 5; k++) p.hline(4 + k * 5, 6 + k * 5, 8, '#A89878');
    p.rect(2, 0, 28, 3, '#C8B898');
    if (opts.v === 1) {
      // a small grey seal plush, sitting, faded, a ribbon
      p.ellipse(22, 13, 4, 3, '#B8BCC4');
      p.ellipse(19, 11, 2, 2, '#C8CDD4');
      p.set(18, 11, '#2A2440');
      p.set(22, 12, AQ.shu);
    }
  }, { cx: 16, base: 16, shadow: 16 }),
);

/**
 * ポコシャ's hand-drawn arrow at each room's way on (60 5.3, decal_c3_pokosha_ya):
 * a sheet of paper taped to the floor, a thick round-cornered marker arrow.
 */
registerProp('prop_c3_aq_ya', (opts) => {
  const dir = String(opts.dir ?? 'up');
  const p = new PixelCanvas(14, 12);
  p.rect(1, 1, 12, 10, '#F4F1E8');
  p.rect(0, 0, 3, 2, '#E8D9A0');
  p.rect(11, 10, 3, 2, '#E8D9A0');
  // the arrow (drawn pointing right, turned below), the round marker's ends
  const q = new PixelCanvas(10, 8);
  q.rect(1, 3, 5, 2, '#1B1733');
  q.poly([[5, 0], [9, 4], [5, 8]], '#1B1733');
  q.set(1, 3, '#3A3F48');
  for (let y = 0; y < 8; y++)
    for (let x = 0; x < 10; x++) {
      if (!q.alpha(x, y)) continue;
      const c = q.get(x, y);
      let X = x;
      let Y = y;
      if (dir === 'left') X = 9 - x;
      if (dir === 'up') [X, Y] = [y + 1, 9 - x];
      if (dir === 'down') [X, Y] = [y + 1, x];
      p.set(2 + X, 1 + Y, c);
    }
  const img = p.toCanvas();
  return { ox: 1, oy: 2, w: 14, h: 12, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

/** Where the sunfish hangs (picture px from the map's corner). */
export const MANBOU_X = 13 * 16 - 16;
export const MANBOU_Y = 5 * 16 - 60;

/** The sunfish hanging from the ceiling (62 4.8・7.4): faded grey-blue, its strings; drawn over everyone. */
registerProp('prop_c3_aq_manbou', () => {
  const p = new PixelCanvas(48, 44);
  // the strings up into the dark
  for (const x of [14, 34]) p.vline(x, 0, 14, '#9AA0A8');
  // the body: a tall disc, the fins above and below, the clipped tail
  p.ellipse(24, 26, 15, 11, '#7A8A9A');
  p.ellipse(22, 23, 11, 7, '#9AAAB8');
  p.poly([[22, 16], [26, 3], [30, 16]], '#7A8A9A');
  p.poly([[22, 36], [26, 43], [30, 36]], '#6A7A8A');
  p.rect(38, 20, 4, 13, '#6A7A8A');
  p.ellipse(14, 24, 2, 2, '#F4F1E8');
  p.set(14, 24, '#2A2440');
  p.hline(10, 13, 28, '#4A5A6A');
  // dust on its back, a seam of the old papier-mâché
  for (let k = 0; k < 12; k++) p.set(12 + ((k * 7) % 22), 16 + ((k * 3) % 4), '#C8C4B8');
  p.line(24, 17, 26, 35, '#6A7A8A');
  outline(p, { soft: true });
  const img = p.toCanvas();
  // anchored at the map's corner (a flat prop with its fg part where it hangs: over (13,4), its
  // belly 24 px over the floor; the HD-2D hangs it there, room_tune.ts HANG)
  return {
    ox: 0,
    oy: 0,
    w: MANBOU_X + 48,
    h: MANBOU_Y + 44,
    foot: 0,
    flat: true,
    img: () => null,
    fg: [{ ox: MANBOU_X, oy: MANBOU_Y, img: () => img }],
  } satisfies PropArt;
});

// ================================================================ 4.11 回廊（40年の 伝票）

/** The colour of a slip at x (world px): 40 years ago (west) yellowed, today (east) white. */
function slipPaper(x: number, W: number): string {
  return mix(AQ.paperOld, AQ.paperNew, Math.max(0, Math.min(1, x / W)));
}

/**
 * The corridor's slips: the north wall's two rows of faces (y16–47) covered
 * in small slips 4×3 px every 4–5 px, three hands of strokes (ツガオ thick and
 * short, ヒロスケ thin from x14, ポコシャ round dots from x27), the twelve with
 * notes a red-pencil tick on their edge, the blank day (38,2) a size bigger
 * and pure white.
 */
function denpyoWall(p: PixelCanvas, W: number): void {
  const top = 24;
  const bot = 44;
  for (let y = top; y < bot; y += 5)
    for (let x = 18 + ((y >> 2) & 1) * 2; x < W - 20; x += 5) {
      const tx = x / 16;
      const h = ihash(x, y, 7121);
      const col = slipPaper(x, W);
      const w = 4;
      p.rect(x, y, w, 3, col);
      p.set(x + w - 1, y + 2, mix(col, '#8A7A60', 0.4));
      // whose hand
      const r = h % 7;
      if (tx >= 27 && r < 2) {
        p.set(x + 1, y + 1, '#3A3F48');
        p.set(x + 3, y + 1, '#3A3F48');
      } else if (tx >= 14 && r < 4) {
        p.set(x + 1, y + 1, '#6B7186');
        p.set(x + 2, y + 1, '#6B7186');
      } else {
        p.hline(x, x + 2, y + 1, '#1B1733');
      }
      // a pin
      if (h % 11 === 0) p.set(x + 1, y - 1, '#9AA0A8');
    }
  // the twelve slips with notes: (4+3k, 2) — a red-pencil tick on the right edge
  for (let k = 0; k < 12; k++) {
    const x = (4 + 3 * k) * 16 + 4;
    const y = 2 * 16 + 4;
    const col = slipPaper(x, W);
    p.rect(x, y, 8, 6, col);
    p.hline(x, x + 7, y + 5, mix(col, '#8A7A60', 0.4));
    p.hline(x + 1, x + 5, y + 2, k < 4 || k === 6 || k === 9 || k === 10 ? '#1B1733' : k === 7 || k === 8 || k === 11 ? '#3A3F48' : '#6B7186');
    p.vline(x + 7, y, y + 3, AQ.redPencil);
  }
  // the blank day (38,2): 8×6, pure white, only the date's box ruled
  const bx = 38 * 16 + 4;
  const by = 2 * 16 + 3;
  p.rect(bx, by, 9, 7, '#FFFFFF');
  p.strokeRect(bx + 1, by + 1, 3, 2, '#C8C4B8');
  p.hline(bx, bx + 8, by + 6, '#D8D4C8');
}

registerProp('prop_c3_aq_kairo_shell', () => {
  const rows = getMapDef('map_c3_aq_kairo')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      let c = aqFloor(x, y, 7123, 0.12);
      // the painted route line down the middle of the corridor (blue, worn) with arrows east
      if (y >= 4 * 16 + 6 && y <= 4 * 16 + 8) c = mix(c, AQ.band, 0.55);
      return c;
    },
    wall: (x, y, fh) => {
      // a cork-brown board behind the slips; the blue band under it
      if (y >= fh - 8 && y < fh - 4) return y === fh - 8 ? mix(AQ.band, '#FFFFFF', 0.2) : AQ.band;
      return valueNoise(x / 6, y / 5, 7125) > 0.6 ? '#8A6A4A' : '#7A5A3E';
    },
    trim: '#9A968C',
    base: '#3A4A5A',
    baseH: 4,
  });
  const p = sh.p;
  const W = sh.w * 16;
  denpyoWall(p, W);
  // arrows on the route line (east), every 4 tiles
  for (let tx = 3; tx < 38; tx += 4) {
    const x = tx * 16 + 4;
    const y = 4 * 16 + 7;
    p.line(x, y, x + 7, y, mix(AQ.band, '#F4F1E8', 0.4));
    p.line(x + 5, y - 2, x + 7, y, mix(AQ.band, '#F4F1E8', 0.4));
    p.line(x + 5, y + 2, x + 7, y, mix(AQ.band, '#F4F1E8', 0.4));
  }
  // the exit lamps, every 8 tiles, at the wall's top over the slips
  for (let tx = 4; tx < 40; tx += 8) exitLamp(p, tx * 16 + 3, 17);
  // the staff door in the south wall (20,6): grey steel, its plate 『関係者以外』 (strokes)
  // (the south wall is not seen; its door is a dark notch with the plate on the floor's edge)
  p.rect(20 * 16 + 1, 6 * 16, 14, 3, '#6B7186');
  notice(p, 20 * 16 + 3, 5 * 16 + 11, 10, 4, '#F4F1E8', AQ.shu, 1);
  // the slanting light onto the blank day (38,1–2), and its patch on the floor below
  for (let y = 16; y < 3 * 16; y++) for (let x = 37 * 16 + 4; x < 39 * 16 + 4; x++) if (Math.abs(x - (38 * 16 + 8) - (y - 30) * 0.3) < 12 && (x + y) % 2 === 0) blend(p, x, y, '#FFF6D8', 0.2);
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: W,
    h: sh.h * 16,
    foot: 0,
    flat: true,
    img: () => img,
    glow: (g, x, y) => {
      for (let tx = 4; tx < 40; tx += 8) glowExit(g, x + tx * 16 + 3, y + 17);
      // the one shaft of light left from the old display lighting, onto the blank day
      lightQuad(g, x + 38 * 16 - 2, y, 18, 3 * 16 + 4, 0.3, '#FFF6D8', 0.16);
      dust(g, x + 38 * 16 - 2, y + 4, 16, 44, 0.3, 8, 0, 7127, 0.55);
    },
    light: (g, x, y) => {
      for (let tx = 4; tx < 40; tx += 8) screenPool(g, x + tx * 16 + 8, y + 40, 22, 14, '#3FA66B', 0.18);
      screenPool(g, x + 38 * 16 + 8, y + 3 * 16 + 4, 18, 10, '#FFF6D8', 0.4);
    },
  } satisfies PropArt;
});

/** The old display stands along the south wall: empty glass, a box of bundled slips on top (v: which). */
registerProp('prop_c3_aq_tenjidai', (opts) =>
  standProp(32, 22, (p) => {
    const v = Number(opts.v ?? 0);
    p.rect(1, 8, 30, 14, '#6B5A4A');
    p.hline(1, 30, 8, '#8A7A66');
    p.rect(2, 2, 28, 7, mix(AQ.glass, '#3A4A5A', 0.55));
    p.hline(2, 29, 2, '#C8E4EC');
    p.set(4 + v * 5, 4, '#F4FAFC');
    // the bundle: slips tied with string in a cardboard box
    p.rect(9, 10, 14, 7, '#B8946A');
    p.hline(9, 22, 10, '#D8B48A');
    for (let k = 0; k < 4; k++) p.hline(10, 21, 11 + k, slipPaper(v * 300, 1200));
    p.vline(16, 10, 16, '#C8452E');
  }, { cx: 16, base: 16, shadow: 10 }),
);

// ================================================================ 4.12 ジオラマの 部屋

/** The clock face over a model: h:m stopped (red mark), the second hand running when `run`. */
function clockFace(p: PixelCanvas, cx: number, cy: number, r: number, hh: number, mm: number): void {
  p.ellipse(cx, cy, r + 1, r + 1, '#3A3F48');
  p.ellipse(cx, cy, r, r, '#F4F1E8');
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    p.set(Math.round(cx + Math.sin(a) * (r - 1)), Math.round(cy - Math.cos(a) * (r - 1)), '#6B7186');
  }
  const ha = ((hh % 12) / 12 + mm / 720) * Math.PI * 2;
  const ma = (mm / 60) * Math.PI * 2;
  p.line(cx, cy, Math.round(cx + Math.sin(ha) * (r - 3)), Math.round(cy - Math.cos(ha) * (r - 3)), '#1B1733');
  p.line(cx, cy, Math.round(cx + Math.sin(ma) * (r - 1)), Math.round(cy - Math.cos(ma) * (r - 1)), '#1B1733');
  // the small red mark at the hour it stopped
  p.set(Math.round(cx + Math.sin(ha) * (r + 2)), Math.round(cy - Math.cos(ha) * (r + 2)), AQ.shu);
}

/** The three clocks (62 4.12): x of each (world px) and its stopped hour. */
const DIO_CLOCKS: { tx: number; h: number; m: number; run: boolean }[] = [
  { tx: 5, h: 5, m: 0, run: true },
  { tx: 11, h: 12, m: 0, run: false },
  { tx: 16, h: 4, m: 59, run: true },
];

registerProp('prop_c3_aq_diorama_shell', () => {
  const rows = getMapDef('map_c3_aq_diorama')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      // dark carpet, worn where the visitors walked round the models
      const n = valueNoise(x / 12, y / 9, 7131);
      let c = n > 0.55 ? '#3A3A4A' : '#33333F';
      if (h01(x, y, 7133) > 0.97) c = '#4A4A5A';
      return c;
    },
    wall: (x, y, fh) => (y >= fh - 4 ? '#1A1A24' : valueNoise(x / 9, y / 9, 7135) > 0.7 ? '#2E2E3A' : '#26262F'),
    trim: '#3A3A4A',
    base: '#16161E',
    baseH: 4,
    section: '#0E0E16',
  });
  const p = sh.p;
  // the three clocks on the black wall, each with its town's name plate (strokes)
  for (const c of DIO_CLOCKS) {
    const cx = c.tx * 16 + 8;
    clockFace(p, cx, 18, 7, c.h, c.m);
    notice(p, cx - 7, 28, 14, 4, '#C8C4B8', '#3A3F48', 1);
  }
  // the black curtain at the way on (23,3)
  for (let y = 2 * 16; y < 4 * 16; y++) for (let x = 22 * 16 + 10; x < 24 * 16; x++) p.set(x, y, (x >> 1) % 2 ? '#14141C' : '#1E1E28');
  // the route's dim floor lights along the walls (round, set in the carpet)
  for (let tx = 2; tx < 23; tx += 4) {
    p.ellipse(tx * 16 + 8, 14 * 16 + 12, 2, 1, '#6B7186');
    p.ellipse(tx * 16 + 8, 3 * 16 + 3, 2, 1, '#6B7186');
  }
  const img = p.toCanvas();
  // the second hands (夕鳴町 and 星見台 run: their towns were unwound; 海ぞいの町 stands at 12:00)
  return {
    ox: 0,
    oy: 0,
    w: sh.w * 16,
    h: sh.h * 16,
    foot: 0,
    flat: true,
    img: () => img,
    over: (g, x, y, env) => {
      for (const c of DIO_CLOCKS) {
        if (!c.run) continue;
        const a = ((Math.floor(env.t / 1000) % 60) / 60) * Math.PI * 2;
        const cx = x + c.tx * 16 + 8;
        const cy = y + 18;
        for (let k = 1; k <= 6; k++) g.rect(Math.round(cx + Math.sin(a) * k), Math.round(cy - Math.cos(a) * k), 1, 1, AQ.shu);
      }
    },
    light: (g, x, y) => {
      for (let tx = 2; tx < 23; tx += 4) {
        screenPool(g, x + tx * 16 + 8, y + 14 * 16 + 12, 10, 5, '#8E95A6', 0.25);
        screenPool(g, x + tx * 16 + 8, y + 3 * 16 + 3, 10, 5, '#8E95A6', 0.25);
      }
    },
  } satisfies PropArt;
});

/** Each model's light: the hour its town stopped at (62 4.12). */
const DIO_LIGHT: Record<string, string> = { yunari: '#F7A04A', hoshi: '#7A8ACA', umi: '#FFFDF2' };

/**
 * A model of a town on a waist-high black stand (62 4.12・7.4): the town's
 * own map drawn small (c3_aq_diorama.ts), its name plate on the front edge,
 * a little lamp over it in its own hour's colour. 夕鳴町's has マフィ屋 in the
 * ginza's corner — only here, never in the real ginza (62 7.4).
 */
registerProp('prop_c3_aq_diorama', (opts) => {
  const town = String(opts.town ?? 'umi') as 'yunari' | 'hoshi' | 'umi';
  const tw = town === 'umi' ? 9 : 5;
  const W = tw * 16;
  const H = 3 * 16 + 14;
  const p = new PixelCanvas(W, H);
  // the stand: a black box, its front 14px tall below the model's top
  const topH = 3 * 16 - 2;
  p.rect(0, 2, W, topH, '#16161E');
  p.rect(0, topH + 2, W, H - topH - 2, '#22222C');
  p.hline(0, W - 1, topH + 2, '#3A3A4A');
  // the model
  const model = dioramaTown(town, W - 6, topH - 4);
  p.blit(model, 3, 4);
  // its name plate on the front edge (white paper, strokes)
  notice(p, Math.round(W / 2) - 9, topH + 6, 18, 5, '#E8E4D8', '#3A3F48', 1);
  outline(p, { bottom: true, soft: true });
  const img = p.toCanvas();
  const lamp = DIO_LIGHT[town];
  return {
    ox: 0,
    oy: -2,
    w: W,
    h: H,
    foot: 3 * 16 - 1,
    img: () => img,
    shadow: 6,
    contact: W - 4,
    contactX: W / 2,
    glow: (g, x, y, env) => {
      // the small lamp over the model and its light on the town
      g.rect(x + W / 2 - 2, y - 2, 4, 2, lamp, 0.9);
      screenPool(g, x + W / 2, y + topH / 2, W * 0.45, topH * 0.45, lamp, 0.22);
      // fx_c3_doll_glow (60 S17): the dolls examined so far, each where its clock had stopped — a small
      // warm light that pulses (the scenario sets flag_ch3_doll_<npc id>; this town's are counted)
      const lit = litDolls(town);
      const spots = dollSpots(town, W - 6, topH - 4);
      for (let i = 0; i < Math.min(lit, spots.length); i++) {
        const [dx, dy] = spots[i];
        const a = 0.55 + 0.35 * Math.sin(env.t / 260 + i);
        g.rect(x + 3 + dx, y + 2 + dy, 1, 2, '#FFF6D8', a);
        screenPool(g, x + 3 + dx, y + 3 + dy, 4, 3, '#F6D98A', a * 0.6);
      }
    },
    light: (g, x, y) => warmPool(g, x + W / 2, y + topH / 2, W * 0.6, topH * 0.6, lamp, 0.85),
  } satisfies PropArt;
});

/** How many of `town`'s dolls are lit (flag_ch3_doll_<npc id>: 星見台's are npc_hoshi_*, this town's npc_c3_*). */
function litDolls(town: 'yunari' | 'hoshi' | 'umi'): number {
  let n = 0;
  for (const [k, v] of Object.entries(state.flags)) {
    if (!v || !k.startsWith('flag_ch3_doll_')) continue;
    const id = k.slice('flag_ch3_doll_'.length);
    const t = id.startsWith('npc_hoshi_') ? 'hoshi' : id.startsWith('npc_c3_') ? 'umi' : 'yunari';
    if (t === town) n++;
  }
  return n;
}

/** The explanation boards (3,12)・(20,12): a lectern with a faded panel (strokes, a little map of the cape). */
registerProp('prop_c3_aq_setsumei', (opts) =>
  standProp(16, 24, (p) => {
    p.rect(7, 12, 2, 12, '#3A3F48');
    p.poly([[1, 3], [15, 1], [15, 12], [1, 13]], '#6B7186');
    p.poly([[2, 4], [14, 2], [14, 11], [2, 12]], '#C8C4B8');
    for (let k = 0; k < 3; k++) p.hline(4, 12, 5 + k * 2, '#3A3F48');
    p.set(opts.v ? 11 : 5, 10, AQ.shu);
  }, { cx: 8, base: 16, shadow: 10 }),
);

// ================================================================ 4.13 深海の 展示室

registerProp('prop_c3_aq_shinkai_shell', () => {
  const rows = getMapDef('map_c3_aq_shinkai')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      // a dark blue resin floor, the old route's dots
      let c = valueNoise(x / 10, y / 10, 7141) > 0.55 ? '#2A3E52' : '#24364A';
      if ((x & 15) === 8 && (y & 15) === 8) c = '#3A5A72';
      if (h01(x, y, 7143) > 0.99) c = '#3A4E62';
      return c;
    },
    wall: (x, y, fh) => (y >= fh - 4 ? '#0E1A26' : valueNoise(x / 7, y / 9, 7145) > 0.7 ? '#1E2E40' : '#1A2A3A'),
    trim: '#2A3E52',
    base: '#0E1A26',
    baseH: 4,
    section: '#0A1018',
  });
  const p = sh.p;
  // the faded letters of the show over the north wall: 「ふしぎな 深海生物展」 as worn strokes
  for (let k = 0; k < 9; k++) if (k !== 4) p.rect(3 * 16 + k * 10, 6, 6, 4, ihash(k, 1, 7147) % 3 ? '#3A5A72' : '#2A3E52');
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: sh.w * 16, h: sh.h * 16, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

/**
 * The dark room's show cases and tank pillars (every Q cell): a dark frame,
 * glass with the deep blue behind it, empty. Neighbouring cells join into
 * one long case; `v` shades them. 16 × 26.
 */
function caseCell(left: boolean, right: boolean, v: number): HTMLCanvasElement {
  const p = new PixelCanvas(16, 28);
  const frame = '#1A2430';
  p.rect(0, 2, 16, 26, frame);
  // the glass: deep blue, a highlight, the dust
  for (let y = 4; y < 22; y++)
    for (let x = left ? 0 : 2; x < (right ? 16 : 14); x++) {
      let c = mix('#1E3A52', '#2A4E6A', (22 - y) / 18);
      if ((x + y + v) % 13 === 0) c = '#3A6A8A';
      p.set(x, y, c);
    }
  if (!left) p.vline(2, 4, 21, '#4A7A9A');
  // the sand in the bottom, a rock, nothing alive
  p.rect(left ? 0 : 2, 19, (right ? 16 : 14) - (left ? 0 : 2), 3, '#4A5A62');
  if (v % 3 === 0) p.ellipse(8, 19, 3, 2, '#3A4A52');
  // the base cabinet
  p.rect(0, 22, 16, 6, '#121A22');
  p.hline(0, 15, 22, '#2A3440');
  p.hline(0, 15, 2, '#2A3440');
  return p.toCanvas();
}

registerProp('prop_c3_aq_case', (opts) => {
  const l = !!opts.l;
  const r = !!opts.r;
  const v = Number(opts.v ?? 0);
  const img = caseCell(l, r, v);
  return { ox: 0, oy: -12, w: 16, h: 28, foot: 15, img: () => img, contact: 0, shadow: 0 } satisfies PropArt;
});

/** The name card on a case (60 9.5: 『ダイオウイカ（標本）』…): a small white plate, strokes. */
registerProp('prop_c3_aq_nafuda_case', (opts) =>
  standProp(10, 6, (p) => {
    p.rect(0, 0, 10, 5, '#C8C4B8');
    p.hline(2, 6 + (Number(opts.v ?? 0) % 3), 2, '#3A3F48');
  }, { cx: 8, base: 13, shadow: 0, outline: false, foot: 16 }),
);

/**
 * The empty tank at the far end (11–13,1), set in the north wall (62 7.4): the
 * glass, sand on its floor, the name plate scraped grey, and inside the glass
 * the scratches — fine white lines in rows of 14, a claw's tip each.
 */
registerProp('prop_c3_aq_kara_suisou', () => {
  const p = new PixelCanvas(48, 32);
  p.rect(0, 0, 48, 32, '#1A2430');
  for (let y = 3; y < 26; y++)
    for (let x = 3; x < 45; x++) {
      let c = mix('#1E3A52', '#2E5A7A', (26 - y) / 23);
      if ((x * 3 + y * 5) % 37 === 0) c = '#3A6A8A';
      p.set(x, y, c);
    }
  p.rect(3, 22, 42, 4, '#5A6A6E');
  p.hline(3, 44, 22, '#7A8A8A');
  // the scratches: rows of 14 short strokes, low on the glass (where something stood and pressed)
  for (let row = 0; row < 3; row++)
    for (let k = 0; k < 14; k++) {
      const x = 8 + k * 2 + row;
      const y = 12 + row * 3;
      p.set(x, y, mix('#E8E4D8', '#2E5A7A', 0.35));
      p.set(x + 1, y + 1, mix('#E8E4D8', '#2E5A7A', 0.5));
    }
  // the scraped name plate
  p.rect(18, 27, 12, 4, '#8E95A6');
  for (let x = 19; x < 29; x++) if (x % 2) p.set(x, 28 + (x % 3 === 0 ? 1 : 0), '#B8BCC4');
  p.hline(3, 44, 3, '#4A7A9A');
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 48, h: 32, foot: 31, flat: true, img: () => img } satisfies PropArt;
});

/**
 * マリンスノー (17,2): a pillar tank, empty, where white specks keep falling
 * slowly from top to bottom — the only thing that moves in the house (8.8).
 */
registerProp('prop_c3_aq_marine', () => {
  const base = caseCell(false, false, 1);
  return {
    ox: 0,
    oy: -12,
    w: 16,
    h: 28,
    foot: 15,
    img: () => base,
    contact: 0,
    glow: (g, x, y, env) => {
      const t = env.t / 1000;
      for (let k = 0; k < 9; k++) {
        const h = ihash(k, 3, 7151);
        const sp = 2 + (h % 5) * 0.6;
        const yy = ((h % 18) + t * sp) % 18;
        const xx = 3 + (h >>> 5) % 10 + Math.round(Math.sin(t * 0.7 + k) * 0.6);
        g.rect(x + xx, y - 8 + Math.floor(yy), 1, 1, '#F4F8FC', 0.85);
      }
    },
  } satisfies PropArt;
});

/**
 * A scrap of the keeper's diary on the floor (60 S18, 7.4: yellowed, ツガオ's
 * thick hand). In the dark it glints 1px when the eyes' light falls on it.
 */
registerProp('prop_c3_aq_nisshi', () => {
  const p = new PixelCanvas(8, 6);
  p.poly([[0, 1], [7, 0], [7, 5], [1, 5]], AQ.paperOld);
  p.hline(1, 4, 2, '#1B1733');
  p.hline(2, 5, 4, '#1B1733');
  p.set(7, 0, '#C8B898');
  const img = p.toCanvas();
  return {
    ox: 4,
    oy: 6,
    w: 8,
    h: 6,
    foot: 0,
    flat: true,
    img: () => img,
    glow: (g, x, y, env) => {
      // the glint: a white pixel on and off (every 1.6 s)
      if (Math.floor(env.t / 800 + env.seed * 3) % 2 === 0) g.rect(x + 9, y + 7, 1, 1, '#FFFFFF', 0.9);
    },
  } satisfies PropArt;
});

// ================================================================ 4.14 えさの 部屋

registerProp('prop_c3_aq_esa_shell', () => {
  const rows = getMapDef('map_c3_aq_esa')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      // grey vinyl, a drain in the corner, wet rings where buckets stood
      const n = valueNoise(x / 11, y / 8, 7161);
      let c = n > 0.6 ? '#B8BCB4' : '#ACB0A8';
      if (h01(x, y, 7163) > 0.985) c = '#8E928A';
      return c;
    },
    wall: (x, y, fh) => {
      if (y >= fh - 10) return y === fh - 10 ? '#7A9A8A' : '#5A7A6A';
      return valueNoise(x / 6, y / 6, 7165) > 0.78 ? '#D0D4CC' : '#C4C8C0';
    },
    trim: '#9AA098',
    base: '#3A4A44',
    baseH: 3,
  });
  const p = sh.p;
  // the whiteboard (9–10,1): the feeding times' table, the keeper's column rubbed out, one word left in the corner
  const bx = 9 * 16 - 4;
  p.rect(bx, 4, 40, 22, '#9AA0A8');
  p.rect(bx + 1, 5, 38, 20, '#F4F6F4');
  for (let k = 0; k < 4; k++) p.hline(bx + 3, bx + 36, 9 + k * 4, '#C8CDD4');
  p.vline(bx + 14, 6, 23, '#C8CDD4');
  for (let k = 0; k < 4; k++) {
    p.hline(bx + 4, bx + 10, 11 + k * 4, '#2F4A8A');
    p.hline(bx + 17, bx + 24, 11 + k * 4, '#2A2440');
  }
  // the keeper's column, rubbed out: a grey smear
  for (let y = 7; y < 24; y++) for (let x = bx + 27; x < bx + 37; x++) if (h01(x, y, 7167) > 0.4) p.set(x, y, '#D0D4D8');
  // 『係長』 that would not come off: two small strokes in the bottom corner
  p.hline(bx + 31, bx + 34, 22, '#8E95A6');
  p.hline(bx + 35, bx + 37, 22, '#8E95A6');
  p.rect(bx + 2, 25, 10, 2, '#6B7186');
  // the clock (6,1): 12:00
  clockFace(p, 6 * 16 + 8, 14, 6, 12, 0);
  // the one fluorescent tube that is on, over the desk
  p.rect(4 * 16, 1, 3 * 16, 3, '#E8ECE8');
  p.rect(9 * 16 + 30, 1, 3 * 16, 3, '#9AA098');
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: sh.w * 16,
    h: sh.h * 16,
    foot: 0,
    flat: true,
    img: () => img,
    glow: (g, x, y) => g.rect(x + 4 * 16 + 1, y + 2, 3 * 16 - 2, 1, '#FFFFFF', 0.9),
    light: (g, x, y) => warmPool(g, x + 5 * 16 + 16, y + 5 * 16, 56, 40, '#F4F8F0', 0.6),
  } satisfies PropArt;
});

/** The sink (1–2,2): stainless, a rubber hose coiled on the tap. */
registerProp('prop_c3_aq_nagashi', () =>
  standProp(32, 24, (p) => {
    p.rect(0, 8, 32, 16, '#9AA0A8');
    p.rect(2, 9, 28, 6, '#C8CDD4');
    p.rect(4, 10, 24, 4, '#7A8088');
    p.vline(16, 2, 9, '#C8CDD4');
    p.hline(16, 20, 2, '#C8CDD4');
    p.ring(24, 6, 4, 2, '#2E6A3A');
    p.ring(24, 6, 3, 1, '#2E6A3A');
  }, { cx: 16, base: 16, shadow: 12 }),
);

/** The work table under the whiteboard (9–10,2): a cutting board, the knife's place, scales. */
registerProp('prop_c3_aq_sagyoudai', () =>
  standProp(32, 20, (p) => {
    p.rect(0, 6, 32, 14, '#8E95A6');
    p.rect(0, 4, 32, 4, '#C8CDD4');
    p.rect(4, 2, 12, 4, '#E8E4D8');
    p.rect(20, 1, 8, 5, '#6B7186');
    p.rect(21, 0, 6, 2, '#C8CDD4');
  }, { cx: 16, base: 16, shadow: 10 }),
);

/** The lockers (11–12,2) and (12,3): grey steel, a name slot on each (empty; one still taped: strokes). */
registerProp('prop_c3_aq_locker', () =>
  standProp(32, 46, (p) => {
    for (const [x, y, w, h] of [[0, 2, 16, 28], [16, 2, 16, 44]] as const) {
      p.rect(x, y, w, h, '#8E95A6');
      p.vline(x, y, y + h - 1, '#A8AEB6');
      p.vline(x + w - 1, y, y + h - 1, '#6B7186');
      for (let k = 0; k < 3; k++) p.hline(x + 3, x + 10, y + 3 + k * 2, '#6B7186');
      p.rect(x + 4, y + 10, 8, 3, '#E8E4D8');
      p.rect(x + 11, y + 16, 2, 4, '#C8CDD4');
    }
    p.hline(5, 9, 13, '#2A2440');
  }, { cx: 16, base: 16, foot: 15, shadow: 30 }),
);

/**
 * The keeper's desk (5–6,4–5): an old notebook, the feed bucket and the empty
 * krill box 『冷凍』 (60 9.5), a mug, the tube's light on it.
 */
registerProp('prop_c3_aq_esa_desk', () =>
  standProp(32, 36, (p) => {
    p.rect(0, 12, 32, 22, '#8A6A4A');
    p.rect(0, 10, 32, 4, '#A88A62');
    p.hline(0, 31, 10, '#C8A878');
    p.rect(2, 30, 3, 6, '#5A4A3A');
    p.rect(27, 30, 3, 6, '#5A4A3A');
    // the notebook, open
    p.rect(3, 4, 12, 7, '#F4F1E8');
    p.vline(9, 4, 10, '#C8C2B4');
    for (let k = 0; k < 3; k++) p.hline(4, 8, 6 + k * 2, '#2A2440');
    // the bucket, blue, with the krill box in it
    p.rect(18, 2, 11, 9, '#3A7EA8');
    p.hline(18, 28, 2, '#5AA0C8');
    p.rect(20, 0, 7, 4, '#E8E4D8');
    p.hline(21, 25, 1, '#2F4A8A');
  }, { cx: 16, base: 32, foot: 31, shadow: 16 }),
);

/** The old chest freezer (1,7): white enamel, a rusty hinge. */
registerProp('prop_c3_aq_reitouko', () =>
  standProp(16, 22, (p) => {
    p.rect(0, 4, 16, 18, '#E0E0DA');
    p.rect(0, 2, 16, 4, '#F4F4EE');
    p.hline(0, 15, 6, '#9AA0A8');
    p.rect(6, 7, 4, 2, '#6B7186');
    p.set(2, 5, '#A8742A');
    p.set(13, 5, '#A8742A');
  }, { cx: 8, base: 16, shadow: 12 }),
);

/**
 * The rack of feeding-time tags (10–11,7, 60 S19): four wooden tags on hooks,
 * their times as strokes (9:00・11:00・12:00・15:00), one hook empty.
 */
registerProp('prop_c3_aq_fudakake', () =>
  standProp(32, 26, (p) => {
    p.rect(2, 2, 28, 6, '#8A6A4A');
    p.hline(2, 29, 2, '#A88A62');
    p.rect(4, 8, 2, 18, '#6A4A32');
    p.rect(26, 8, 2, 18, '#6A4A32');
    for (let k = 0; k < 5; k++) {
      const x = 4 + k * 6;
      p.set(x + 2, 8, '#C8CDD4');
      if (k === 4) continue;
      p.rect(x, 9, 5, 8, '#D8C8A0');
      p.hline(x, x + 4, 16, '#A89870');
      p.hline(x + 1, x + 3, 11, '#2A2440');
      p.hline(x + 1, x + 2, 13, '#2A2440');
    }
  }, { cx: 16, base: 16, shadow: 14 }),
);

// ================================================================ 4.15 大水槽の ホール

registerProp('prop_c3_aq_hall_shell', () => {
  const rows = getMapDef('map_c3_aq_hall')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      // polished dark stone, the tank's blue in it
      const n = valueNoise(x / 14, y / 10, 7171);
      let c = n > 0.55 ? '#4A5A6A' : '#425262';
      if ((x & 31) === 31 || (y & 31) === 31) c = '#3A4A58';
      if (h01(x, y, 7173) > 0.992) c = '#6A7A8A';
      return c;
    },
    wall: () => '#22303E',
    trim: '#2A3A4A',
    base: '#1A2430',
    baseH: 3,
    section: '#0E1620',
  });
  const p = sh.p;
  const W = sh.w * 16;
  // the big tank (x1–24, y1–4): the frame, the glass, the white sand and the made rocks inside, no water
  const tx0 = 16;
  const tx1 = 25 * 16;
  p.rect(tx0 - 2, 12, tx1 - tx0 + 4, 5 * 16 - 12, '#1A2430');
  for (let y = 16; y < 5 * 16 - 2; y++)
    for (let x = tx0; x < tx1; x++) {
      const u = (y - 16) / (4 * 16);
      let c = mix('#2E5A7A', '#1E3A52', u);
      // the blue left in the glass (#7FD1E8 α20%, still): a few broad faint bands
      if (valueNoise(x / 30, y / 18, 7175) > 0.6) c = mix(c, AQ.glass, 0.2);
      p.set(x, y, c);
    }
  // the made rocks and the sand
  for (let y = 4 * 16 - 6; y < 5 * 16 - 2; y++) for (let x = tx0; x < tx1; x++) p.set(x, y, valueNoise(x / 6, y / 3, 7177) > 0.5 ? '#D8D4C8' : '#C8C4B8');
  for (const [rx, rw, rh] of [[40, 30, 18], [120, 44, 26], [210, 24, 14], [290, 50, 22], [360, 26, 16]] as const)
    for (let y = 0; y < rh; y++) {
      const half = Math.round((rw / 2) * Math.sqrt(1 - (y / rh) ** 2));
      p.hline(rx + rw / 2 - half, rx + rw / 2 + half, 5 * 16 - 6 - y, y > rh * 0.6 ? '#7A7468' : '#8E887C');
    }
  // the glass's frame bars every 4 tiles, and the highlight along its top
  for (let x = tx0 + 64; x < tx1; x += 64) p.rect(x, 14, 3, 5 * 16 - 14, '#1A2430');
  p.hline(tx0, tx1 - 1, 17, '#7FD1E8');
  // the skylight's light on the floor over the bench (10–14,6–9): a square, a net of light (still)
  for (let y = 6 * 16; y < 10 * 16; y++)
    for (let x = 9 * 16; x < 16 * 16; x++) {
      const inside = Math.abs(x - 12.5 * 16) < 48 - (y - 6 * 16) * 0.1;
      if (!inside) continue;
      blend(p, x, y, '#FFF6D8', 0.16);
      const net = Math.abs(Math.sin(x / 6 + Math.sin(y / 9) * 1.4)) < 0.12 || Math.abs(Math.sin(y / 5 + Math.sin(x / 11))) < 0.1;
      if (net) blend(p, x, y, '#E8F8FF', 0.28);
    }
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: W,
    h: sh.h * 16,
    foot: 0,
    flat: true,
    img: () => img,
    glow: (g, x, y) => {
      // the noon column from the skylight onto the bench (62 8.6), its dust hanging still
      lightQuad(g, x + 10 * 16 - 4, y - 16, 5 * 16 + 8, 8 * 16 + 4, 0.02, '#FFF6D8', 0.2);
      dust(g, x + 10 * 16, y, 5 * 16, 8 * 16, 0.02, 18, 0, 7179, 0.6);
      // the tank's blue, faint on the glass
      g.rect(x + tx0, y + 18, tx1 - tx0, 1, AQ.glass, 0.4);
    },
    light: (g, x, y) => {
      warmPool(g, x + 12.5 * 16, y + 7.5 * 16, 64, 40, '#FFF6D8', 0.95);
      screenPool(g, x + W / 2, y + 5 * 16, W * 0.5, 30, AQ.glass, 0.18);
    },
  } satisfies PropArt;
});

/** The rail in front of the tank (y5): brass on posts. Drawn as part of the bench's row: one picture 24 tiles wide. */
registerProp('prop_c3_aq_hall_rail', () =>
  standProp(24 * 16, 18, (p) => {
    for (let x = 4; x < 24 * 16; x += 32) p.rect(x, 4, 2, 14, '#6B5A3A');
    p.hline(0, 24 * 16 - 1, 4, '#D9A441');
    p.hline(0, 24 * 16 - 1, 5, '#8A6A2A');
    p.hline(0, 24 * 16 - 1, 12, '#8A6A2A');
  }, { cx: 12 * 16, base: 16, shadow: 0 }),
);

/** The long bench in front of the tank (10–14,7): wood, no back, the middle a little sunk (62 7.4). */
registerProp('prop_c3_aq_hall_bench', () =>
  standProp(80, 16, (p) => {
    p.rect(0, 4, 80, 5, '#A87A4A');
    p.hline(0, 79, 4, '#C8A06A');
    // the dip in the middle where he always sits
    for (let x = 30; x < 50; x++) p.set(x, 4, '#8A5A3A');
    p.hline(0, 79, 8, '#6A4A32');
    for (const x of [3, 38, 74]) p.rect(x, 9, 3, 7, '#5A3A2A');
  }, { cx: 40, base: 16, shadow: 6 }),
);

/** The explanation stands either side (3–5,10)・(19–21,10): a sloped panel of the tank's old fish (silhouettes). */
registerProp('prop_c3_aq_hall_dai', (opts) =>
  standProp(48, 22, (p) => {
    p.rect(2, 10, 44, 12, '#1A2430');
    p.poly([[0, 6], [48, 2], [48, 12], [0, 14]], '#3A4A5A');
    p.poly([[2, 7], [46, 3], [46, 11], [2, 13]], '#5A6A7A');
    for (let k = 0; k < 4; k++) {
      const x = 6 + k * 10 + Number(opts.v ?? 0);
      p.ellipse(x, 8, 3, 1, '#8EA6B8');
      p.set(x + 4, 8, '#8EA6B8');
    }
  }, { cx: 24, base: 16, shadow: 8 }),
);

/** The cold yakisoba in its clear pack (62 7.4): a rubber band, たかし's red mark, no steam. */
registerProp('prop_c3_aq_yakisoba', () =>
  standProp(12, 8, (p) => {
    p.rect(0, 1, 11, 6, '#E8F0F4');
    p.rect(1, 2, 9, 4, '#A8743A');
    for (let k = 0; k < 4; k++) p.set(2 + k * 2, 3, '#C8945A');
    p.set(4, 4, '#3A7A3A');
    p.set(7, 2, '#E84E3C');
    p.vline(5, 1, 6, '#C8452E');
  }, { cx: 8, base: 9, shadow: 0 }),
);

// ================================================================ 4.16 えさの 倉庫

registerProp('prop_c3_aq_souko_shell', () => {
  const rows = getMapDef('map_c3_aq_souko')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      // cold concrete, the old freezer's drain grooves
      const n = valueNoise(x / 9, y / 7, 7181);
      let c = n > 0.6 ? '#9A9AA0' : n < 0.3 ? '#808088' : '#8E8E96';
      if (y % 32 === 31) c = '#6B6B74';
      if (h01(x, y, 7183) > 0.99) c = '#5A5A62';
      return c;
    },
    wall: (x, y, fh) => {
      // insulated panels of the old freezer: white, gone grey, rivets
      if (y >= fh - 4) return '#4A4A54';
      let c = valueNoise(x / 7, y / 9, 7185) > 0.7 ? '#B8BCC0' : '#C8CCD0';
      if (x % 24 === 0) c = '#9AA0A8';
      if (x % 24 === 3 && y % 8 === 4) c = '#7A8088';
      return c;
    },
    trim: '#9AA0A8',
    base: '#3A3A44',
    baseH: 3,
  });
  const p = sh.p;
  // the bulb's cord down from the ceiling at (6,1)
  p.vline(6 * 16 + 8, 0, 20, '#2A2440');
  // the door's little window lets the corridor's light in: a band across the floor to the door
  for (let y = 5 * 16; y < 8 * 16; y++) for (let x = 5 * 16; x < 7 * 16; x++) if ((x + y) % 2 === 0 && Math.abs(x - 6 * 16) < 6 + (8 * 16 - y) * 0.15) blend(p, x, y, '#FFE7A3', 0.25);
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: sh.w * 16,
    h: sh.h * 16,
    foot: 0,
    flat: true,
    img: () => img,
    glow: (g, x, y, env) => {
      if (env.flag('flag_c3_souko_night')) return; // S22's night: the bulb is off
      // the bare bulb, swinging a little (it is the only thing that does)
      const sw = Math.round(Math.sin(env.t / 900) * 1.5);
      const bx = x + 6 * 16 + 8 + sw;
      g.rect(bx - 1, y + 20, 3, 4, '#FFF6D8', 0.95);
      screenPool(g, bx, y + 22, 8, 6, '#FFE7A3', 0.5);
    },
    light: (g, x, y, env) => {
      if (!env.flag('flag_c3_souko_night')) warmPool(g, x + 6 * 16 + 8, y + 3 * 16 + 8, 46, 36, '#FFE7A3', 0.7);
      screenPool(g, x + 6 * 16, y + 7 * 16, 20, 18, '#FFE7A3', 0.35);
    },
  } satisfies PropArt;
});

/** Stacks of empty krill boxes 『南極産』 and cardboard (v: which stack). */
registerProp('prop_c3_aq_hakoyama', (opts) => {
  const v = Number(opts.v ?? 0);
  const wide = v === 0 || v === 1 || v === 2 || v === 3 || v === 5 || v === 6 ? 2 : 1;
  const W = wide * 16;
  return standProp(W, 30, (p) => {
    const rows = 2 + (v % 2);
    for (let r = 0; r < rows; r++)
      for (let k = 0; k < wide * 2; k++) {
        if (r === rows - 1 && ihash(k, v, 7191) % 3 === 0) continue;
        const x = k * 8;
        const y = 30 - (r + 1) * 9;
        const kraft = ihash(k, r + v, 7193) % 2;
        p.rect(x, y, 8, 9, kraft ? '#B8946A' : '#E8E4D8');
        p.hline(x, x + 7, y, kraft ? '#D8B48A' : '#F4F4EE');
        p.vline(x + 7, y + 1, y + 8, kraft ? '#8A6A4A' : '#B8BCC0');
        if (!kraft) {
          p.rect(x + 2, y + 3, 4, 3, '#3A7EA8');
          p.hline(x + 2, x + 5, y + 7, '#2A2440');
        }
      }
  }, { cx: W / 2, base: 16, shadow: 18 });
});

/** The old freezer's machine (3,2): a grey box, a fan grille, a dead dial. */
registerProp('prop_c3_aq_reitouki', () =>
  standProp(16, 28, (p) => {
    p.rect(0, 4, 16, 24, '#8E95A6');
    p.vline(0, 4, 27, '#A8AEB6');
    p.ellipse(8, 12, 5, 5, '#3A3F48');
    for (let k = -4; k <= 4; k += 2) p.hline(4, 12, 12 + k, '#6B7186');
    p.ellipse(8, 22, 2, 2, '#E8E4D8');
    p.set(8, 21, '#E23B2E');
    p.vline(14, 0, 4, '#3A3F48');
  }, { cx: 8, base: 16, shadow: 24 }),
);

/** エゴ's empty trolley place (10,2): the rubber stops on the floor and a worn tyre track. */
registerProp('prop_c3_aq_daisha_oki', () => {
  const p = new PixelCanvas(16, 16);
  p.rect(2, 3, 2, 3, '#2A2440');
  p.rect(12, 3, 2, 3, '#2A2440');
  for (let y = 6; y < 16; y++) {
    p.set(4, y, '#7A7A84');
    p.set(11, y, '#7A7A84');
  }
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 16, h: 16, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

/** The steel shelf (10,7): rope, a bucket, a box of rubber gloves. */
registerProp('prop_c3_aq_souko_tana', () =>
  standProp(16, 30, (p) => {
    for (const x of [0, 15]) p.vline(x, 2, 29, '#6B7186');
    for (const y of [6, 16, 26]) p.hline(0, 15, y, '#9AA0A8');
    p.ring(6, 12, 4, 3, '#C8A06A');
    p.rect(9, 20, 5, 6, '#3A7EA8');
    p.rect(2, 2, 8, 4, '#E8C83A');
  }, { cx: 8, base: 16, shadow: 24 }),
);

/** The plate on a box with the cold sweet potato (S21); empty once they have eaten it. */
registerProp('prop_c3_aq_imo_sara', (opts) =>
  standProp(16, 22, (p) => {
    p.rect(1, 8, 14, 14, '#B8946A');
    p.hline(1, 14, 8, '#D8B48A');
    p.ellipse(8, 7, 6, 2, '#F4F1E8');
    p.ring(8, 7, 6, 2, '#C8C2B4');
    if (!opts.empty) {
      p.ellipse(8, 5, 4, 2, '#8A3A5A');
      p.set(5, 4, '#A8546E');
      p.rect(7, 4, 2, 2, '#F6D98A');
      // the newspaper it came wrapped in
      p.rect(12, 3, 4, 4, '#E8E4D8');
      p.hline(12, 15, 4, '#9AA0A8');
    }
  }, { cx: 8, base: 16, shadow: 12 }),
);

/**
 * The old freezer's door on the south wall (5–6,8): heavy steel, the big lever,
 * the little window. From S21 until ヤキソバン scrapes it off (S23,
 * flag_ch3_yakisoban) its inside wears the black stamp 「まだ」 (24×12, 7.4).
 */
registerProp('prop_c3_aq_souko_door', () => {
  const make = (mada: boolean) => {
    const p = new PixelCanvas(32, 20);
    p.rect(0, 2, 32, 18, '#9AA0A8');
    p.rect(1, 3, 30, 16, '#B8BCC0');
    p.hline(1, 30, 3, '#D8DCE0');
    p.vline(16, 3, 18, '#7A8088');
    // the little window with the corridor's light behind it
    p.rect(12, 5, 8, 4, '#3A3F48');
    p.rect(13, 6, 6, 2, '#FFE7A3');
    // the lever
    p.rect(24, 9, 6, 2, '#6B7186');
    p.rect(27, 8, 2, 5, '#3A3F48');
    if (mada) madaStamp(p, 10, 14, 7, 3);
    return p.toCanvas();
  };
  const on = make(true);
  const off = make(false);
  return {
    ox: 0,
    oy: -6,
    w: 32,
    h: 20,
    foot: 0,
    flat: true,
    img: (env) => (env.flag('flag_ch3_souko') && !env.flag('flag_ch3_yakisoban') && !env.flag('flag_ch3_souko_open') ? on : off),
    // S22: エゴ at the little window (flag_c3_ego_window) — his clock face behind the glass, faintly lit
    glow: (g, x, y, env) => {
      if (!env.flag('flag_c3_ego_window')) return;
      g.rect(x + 13, y - 6 + 6, 6, 2, '#F6D98A', 0.9);
      g.rect(x + 15, y - 6 + 6, 1, 2, '#1B1733', 1);
      g.rect(x + 15, y - 6 + 7, 2, 1, '#1B1733', 1);
      screenPool(g, x + 16, y + 2, 12, 9, '#F6D98A', 0.45);
    },
  } satisfies PropArt;
});

// ================================================================ 4.17 倉庫の外の 廊下

const ROUKA_BULBS = [5, 11, 17];

registerProp('prop_c3_aq_rouka_shell', () => {
  const rows = getMapDef('map_c3_aq_rouka')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      const n = valueNoise(x / 10, y / 6, 7201);
      let c = n > 0.6 ? '#A8A49A' : '#9A968C';
      if ((x & 31) === 31) c = '#8A867C';
      if (h01(x, y, 7203) > 0.99) c = '#7A766C';
      return c;
    },
    wall: (x, y, fh) => {
      if (y >= fh - 10) return y === fh - 10 ? '#7A8A6A' : '#5A6A4A';
      return valueNoise(x / 8, y / 6, 7205) > 0.75 ? '#C8C0AC' : '#BCB4A0';
    },
    trim: '#9A9484',
    base: '#3A3A30',
    baseH: 3,
  });
  const p = sh.p;
  for (const tx of ROUKA_BULBS) p.vline(tx * 16 + 8, 0, 18, '#2A2440');
  exitLamp(p, 1 * 16 + 2, 6);
  // pipes along the wall's top
  p.hline(16, sh.w * 16 - 17, 3, '#8A8070');
  p.hline(16, sh.w * 16 - 17, 4, '#6A6050');
  // the short steps down to the store's door (5–6,6)
  for (let k = 0; k < 2; k++) p.hline(5 * 16, 7 * 16 - 1, 6 * 16 - 3 + k * 2, '#7A766C');
  // the far east end dark (where ヤキソバン comes from)
  for (let y = 3 * 16; y < 6 * 16; y++) for (let x = 19 * 16; x < 21 * 16; x++) blend(p, x, y, '#2A2440', ((x - 19 * 16) / 32) * 0.4);
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: sh.w * 16,
    h: sh.h * 16,
    foot: 0,
    flat: true,
    img: () => img,
    glow: (g, x, y) => {
      for (const tx of ROUKA_BULBS) {
        g.rect(x + tx * 16 + 7, y + 18, 3, 4, '#FFF6D8', 0.95);
        screenPool(g, x + tx * 16 + 8, y + 20, 8, 6, '#FFE7A3', 0.45);
      }
      glowExit(g, x + 16 + 2, y + 6);
    },
    light: (g, x, y) => {
      for (const tx of ROUKA_BULBS) warmPool(g, x + tx * 16 + 8, y + 4 * 16, 48, 30, '#FFE7A3', 0.8);
    },
  } satisfies PropArt;
});

/** The desk by the west door (1–2,5): a plain office desk. */
registerProp('prop_c3_aq_rouka_desk', () =>
  standProp(32, 20, (p) => {
    p.rect(0, 4, 32, 4, '#8E95A6');
    p.hline(0, 31, 4, '#A8AEB6');
    p.rect(1, 8, 10, 12, '#6B7186');
    p.rect(2, 10, 8, 3, '#8E95A6');
    p.rect(2, 14, 8, 3, '#8E95A6');
    p.rect(28, 8, 2, 12, '#6B7186');
  }, { cx: 16, base: 16, shadow: 12 }),
);

/**
 * しゅん's stamp case on the desk (S21〜S23, 62 7.4: 30 10.7's case at 10×8;
 * nothing is done to it — no black stamp on it).
 */
registerProp('prop_c3_aq_hankocase', () =>
  standProp(12, 10, (p) => {
    p.rect(1, 2, 10, 7, '#C8452E');
    p.hline(1, 10, 2, '#E86A4E');
    p.rect(1, 6, 10, 1, '#8A2E22');
    p.rect(5, 4, 2, 2, '#D9A441');
    p.hline(1, 10, 8, '#6A2418');
  }, { cx: 10, base: 12, shadow: 0, foot: 15 }),
);

/** The old bench (10–11,5). */
registerProp('prop_c3_aq_rouka_bench', () =>
  standProp(32, 16, (p) => {
    p.rect(0, 5, 32, 4, '#8A6A4A');
    p.hline(0, 31, 5, '#A88A62');
    for (const x of [2, 28]) p.rect(x, 9, 2, 7, '#5A4A3A');
  }, { cx: 16, base: 16, shadow: 6 }),
);

/** The fire extinguisher's red box and a route board (19–20,5). */
registerProp('prop_c3_aq_shoukaki', () =>
  standProp(32, 30, (p) => {
    p.rect(1, 8, 12, 22, '#C8452E');
    p.hline(1, 12, 8, '#E86A4E');
    p.rect(3, 12, 8, 4, '#F4F1E8');
    p.hline(4, 9, 14, '#C8452E');
    p.rect(17, 2, 14, 12, '#C8C4B8');
    p.rect(18, 3, 12, 10, '#E8E4D8');
    for (let k = 0; k < 3; k++) p.hline(20, 27, 5 + k * 3, '#6B7186');
    p.rect(23, 14, 2, 16, '#6B7186');
  }, { cx: 16, base: 16, shadow: 20 }),
);

// ================================================================ 4.9 事務所（52 12.5 の部屋）

registerProp('prop_c3_aq_jimusho_shell', () => {
  const rows = getMapDef('map_c3_aq_jimusho')?.rows ?? [];
  const wood = boards({ bh: 6, lit: '#6A5A48', base: '#5A4A3A', shade: '#4A3A2E', gap: '#2A2420', nail: '#3A3028', seed: 7211 });
  const sh = paintShell({
    rows,
    floor: (x, y) => wood(x, y),
    wall: (x, y, fh) => {
      if (y >= fh - 8) return '#3A2E28';
      return valueNoise(x / 9, y / 9, 7213) > 0.7 ? '#4A4458' : '#423C50';
    },
    trim: '#5A5068',
    base: '#2A2420',
    baseH: 4,
    section: '#1B1733',
  });
  const p = sh.p;
  // the three clocks with their name plates (3,1) 夕鳴町・(6,1) 星見台・(9,1) 海ぞいの町
  for (const [tx, h, m] of [[3, 5, 0], [6, 4, 59], [9, 12, 0]] as const) {
    clockFace(p, tx * 16 + 8, 14, 6, h, m);
    notice(p, tx * 16 + 2, 23, 12, 4, '#C8C4B8', '#3A3F48', 1);
  }
  // the frosted glass door (13,5)
  p.rect(13 * 16, 4 * 16 + 4, 4, 28, '#C8CDD4');
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: sh.w * 16,
    h: sh.h * 16,
    foot: 0,
    flat: true,
    img: () => img,
    light: (g, x, y) => warmPool(g, x + 6.5 * 16, y + 4 * 16, 40, 28, '#F6D98A', 0.9),
  } satisfies PropArt;
});

/** The hat stand (1,2): the spotted nightcap (52 12.5), the pompom a little squashed. */
registerProp('prop_c3_aq_boushikake', () =>
  standProp(16, 36, (p) => {
    p.vline(8, 4, 34, '#5A3A2A');
    p.hline(4, 12, 35, '#5A3A2A');
    p.line(8, 6, 3, 9, '#5A3A2A');
    p.line(8, 6, 13, 9, '#5A3A2A');
    // the nightcap hung on the left peg
    p.poly([[1, 9], [7, 9], [5, 18], [2, 17]], '#F4F1E8');
    for (const [x, y] of [[3, 11], [5, 13], [3, 15]] as const) p.set(x, y, '#2F4A8A');
    p.ellipse(4, 19, 2, 1, '#F4F1E8');
  }, { cx: 8, base: 16, shadow: 30 }),
);

/**
 * The desk (5–8,3–4): the green-shaded lamp, the black stamp pad, a cold cup of
 * tea, and the black 回覧板 「まだまだ団」 (52 12.5). エゴ's place at its right
 * end is empty (he is on his trolley): the card slot's marks only.
 */
registerProp('prop_c3_aq_jimu_desk', () =>
  standProp(64, 42, (p) => {
    p.rect(0, 14, 64, 26, '#5A3A2A');
    p.rect(0, 10, 64, 6, '#7A5A3A');
    p.hline(0, 63, 10, '#9A7A52');
    p.rect(4, 18, 24, 10, '#4A2E22');
    p.rect(36, 18, 24, 10, '#4A2E22');
    // the lamp
    p.vline(10, 2, 10, '#3A3F48');
    p.poly([[4, 4], [16, 4], [14, 0], [6, 0]], '#2E6A3A');
    p.hline(4, 15, 4, '#4A8A4A');
    // the stamp pad and the cup
    p.rect(20, 6, 6, 4, '#0B0B14');
    p.rect(30, 4, 5, 6, '#E8E4D8');
    p.hline(31, 33, 5, '#A8946A');
    // the black circulating board 「まだまだ団」 (white strokes)
    p.rect(38, 3, 16, 8, '#2A2440');
    p.hline(41, 50, 6, '#F4F1E8');
    p.rect(44, 2, 4, 2, '#9AA0A8');
    // エゴ's empty place: the card's marks
    p.hline(57, 61, 8, '#3A2E28');
  }, { cx: 32, base: 32, foot: 31, shadow: 20 }),
);

/** The filing shelf (12,2–4). */
registerProp('prop_c3_aq_shoruidana', () =>
  standProp(16, 56, (p) => {
    p.rect(0, 2, 16, 54, '#5A4A3A');
    for (let k = 0; k < 4; k++) {
      const y = 6 + k * 12;
      p.hline(1, 14, y + 9, '#7A6A52');
      for (let j = 0; j < 6; j++) p.rect(2 + j * 2, y, 2, 9, ['#E8D9B5', '#C8C2B4', '#2F4A8A', '#E8D9B5', '#8A2E22', '#C8C2B4'][(j + k) % 6]);
    }
  }, { cx: 8, base: 48, foot: 47, shadow: 40 }),
);

/** The umbrella stand by the door (1,6): his black umbrella. */
registerProp('prop_c3_aq_jimu_kasa', () =>
  standProp(16, 26, (p) => {
    p.rect(4, 14, 8, 12, '#6B7186');
    p.hline(4, 11, 14, '#8E95A6');
    p.line(8, 0, 8, 14, '#1B1733');
    p.poly([[6, 2], [10, 2], [11, 12], [5, 12]], '#1B1733');
    p.set(8, 0, '#D9A441');
  }, { cx: 8, base: 16, shadow: 20 }),
);

void cached;
void (null as unknown as PropEnv);
