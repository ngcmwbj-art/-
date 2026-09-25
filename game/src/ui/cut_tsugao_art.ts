// The pictures of cut_tsugao_room (52_ch2_level_art 12.5): the back of an old
// office at night, lit by one green-shaded desk lamp. Built once and cached;
// cut_tsugao.ts puts the moving layers on top (the clocks' hands, ツガオ's
// arms and hands, the nightcap, the cards, the circular's page, the stamp,
// ダコク).
//
// Sixteen colours (12.5 「光と色」), plus ダコク's rust. The room is dark;
// the only light is the lamp's cone and its pool on the desk. 朱 appears on
// the report cards only.
//
// Layout (screen px). The dialog window covers y148–212 for most of the
// scene, so everything that acts stands on the desk top (y122–146) or above:
//   clocks   夕鳴町 (96,34) · 星見台 (192,30) · 海ぞいの町 (288,34), Ø24, plates 28×7 below
//   lamp     shade x80–122 y84–103, base on the desk at x92–114
//   hat stand x132–147 (beside the chair, where ツガオ can reach), the cap on its left hook
//   chair    x150–234 y50–126 · ツガオ x160–224 · desk top y122–146
//   circular x176–208 y126–146 · stamp pad x226–244 · teacup x264–276 · ダコク x290–314 y108–136

import { BAYER4, makeCanvas, PixelCanvas } from '../engine/pixel';
import { hash2, valueNoise } from '../engine/rng';
import { ovalStamp } from '../battle/art/stamps';

export const P = {
  K: '#0B0B14',
  N: '#1B1733',
  D: '#2A2440',
  G: '#3A3F48',
  B: '#5A3A2A',
  L: '#8A5A3A',
  S: '#C98A6A',
  W: '#E8E4D8',
  Pp: '#F4F1E8',
  C: '#E8D9B5',
  c: '#C8A06A',
  V: '#3FA66B',
  Y: '#F6D98A',
  U: '#2F4A8A',
  R: '#E23B2E',
  A: '#7FD1E8',
  rust: '#A8742A',
} as const;

/** The bulb (the light's centre) and the pool on the desk. */
export const LAMP = { x: 101, y: 104 };
export const POOL = { x: 116, y: 134, rx: 64, ry: 12 };
export const CLOCKS = {
  yunari: { x: 96, y: 34, label: '夕鳴町' },
  hoshimi: { x: 192, y: 30, label: '星見台' },
  umi: { x: 288, y: 34, label: '海ぞいの町' },
} as const;
export type ClockId = keyof typeof CLOCKS;
export const DESK_Y = 122;
export const BOARD = { x: 176, y: 126, w: 32, h: 20 };
export const PAD = { x: 226, y: 130 };
export const STAMP_REST = { x: 248, y: 116 };
export const CUP = { x: 264, y: 120 };
export const DAKOKU = { x: 290, y: 108 };
/** The hook the nightcap hangs from. */
export const HOOK = { x: 134, y: 50 };

const bay = (x: number, y: number) => (BAYER4[y & 3][x & 3] + 0.5) / 16;

/** A value 0..1 through `levels` (dark → light), ordered-dithered between steps. */
function step(levels: readonly string[], v: number, x: number, y: number): string {
  const t = Math.max(0, Math.min(1, v)) * (levels.length - 1);
  const i = Math.floor(t);
  return levels[Math.min(levels.length - 1, i + (t - i > bay(x, y) ? 1 : 0))];
}

function rows(p: PixelCanvas, art: string[], pal: Record<string, string>, ox: number, oy: number): void {
  art.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && pal[ch] && p.set(ox + x, oy + y, pal[ch])));
}

/** How much of the lamp reaches the back wall here (0..1). */
function wallLight(x: number, y: number): number {
  const d = Math.hypot(x - LAMP.x, (y - LAMP.y) * 1.3);
  let v = 0.22 + 0.62 * Math.exp(-d / 105);
  // the shade throws the light down: above it, only what bounces off the desk
  if (y < LAMP.y - 8) v -= 0.1 * Math.min(1, (LAMP.y - 8 - y) / 50);
  if (y < 20) v -= (20 - y) * 0.006;
  return v;
}

/** The pool of light on the desk (0..1). */
export function poolLight(x: number, y: number): number {
  const dx = (x - POOL.x) / POOL.rx;
  const dy = (y - POOL.y) / POOL.ry;
  const d = dx * dx + dy * dy;
  return d >= 1 ? 0 : (1 - d) * (1 - d);
}

// ---- the room behind ツガオ ---------------------------------------------------------------

const WALL = [P.K, P.N, P.D, P.G] as const;

function drawWall(p: PixelCanvas): void {
  for (let y = 0; y < 108; y++)
    for (let x = 0; x < 384; x++) {
      let v = wallLight(x, y);
      // old stains: soft blotches, a damp patch under the ceiling, two drips
      const n = valueNoise(x / 22, y / 16, 41);
      if (n > 0.7) v -= (n - 0.7) * 0.45;
      if (y < 30 && valueNoise(x / 40, 3.1, 7) > 0.6) v -= (30 - y) * 0.004;
      if ((x === 214 || x === 57) && y > 4 && y < 30 + (x % 7) * 3) v -= 0.12;
      // plaster grain
      if (hash2(x, y, 3) < 0.05) v -= 0.06;
      p.set(x, y, step(WALL, v, x, y));
    }
  // a picture rail (a strip of dark wood) at y 12
  for (let x = 0; x < 384; x++) {
    const v = wallLight(x, 12);
    p.set(x, 12, v > 0.55 ? P.B : P.N);
    p.set(x, 13, P.K);
  }
  // baseboard and the floor between the wall and the desk
  for (let x = 0; x < 384; x++) {
    const v = wallLight(x, 108);
    p.set(x, 106, v > 0.5 ? P.G : P.D);
    for (let y = 107; y < 111; y++) p.set(x, y, v > 0.62 ? P.B : P.N);
    for (let y = 111; y < DESK_Y; y++) {
      const f = 0.12 + 0.55 * Math.exp(-Math.hypot(x - LAMP.x, (y - 118) * 3) / 90);
      p.set(x, y, step([P.K, P.N, P.D], f + (hash2(x >> 3, y, 9) < 0.3 ? -0.08 : 0), x, y));
    }
  }
}

/** A wall clock's frame, with the nail and the plate's two strings (the face is drawn live). */
function drawClockFrame(p: PixelCanvas, id: ClockId): void {
  const c = CLOCKS[id];
  const lit = wallLight(c.x, c.y + 8) > 0.45;
  // a soft shadow on the wall, down and right (the light is low and to the left)
  for (let y = -12; y <= 13; y++)
    for (let x = -12; x <= 13; x++) if (x * x + y * y <= 144 && (x - 2) * (x - 2) + (y - 2) * (y - 2) > 144 === false && x * x + y * y > 140) p.set(c.x + x + 2, c.y + y + 2, P.K);
  for (let y = -12; y <= 12; y++)
    for (let x = -12; x <= 12; x++) {
      const d = Math.hypot(x + 0.5, y + 0.5);
      if (d > 12) continue;
      if (d > 10.2) {
        // the rim: dark wood, lit from the bottom left
        const lower = y > 0 && x < 4;
        p.set(c.x + x, c.y + y, d > 11.3 ? P.K : lower && lit ? P.L : lower ? P.B : P.N);
      }
    }
  // the nail at the top
  p.set(c.x, c.y - 14, P.G);
  p.set(c.x, c.y - 13, P.N);
  // the plate hangs from two strings
  p.set(c.x - 9, c.y + 12, P.G);
  p.set(c.x + 8, c.y + 12, P.G);
  p.set(c.x - 9, c.y + 13, P.G);
  p.set(c.x + 8, c.y + 13, P.G);
}

function drawHatStand(p: PixelCanvas): void {
  const x0 = 139;
  // pole (lit on the left, toward the lamp)
  for (let y = 46; y < DESK_Y; y++) {
    const v = wallLight(x0, y);
    p.set(x0 - 1, y, v > 0.5 ? P.L : P.B);
    p.set(x0, y, P.B);
    p.set(x0 + 1, y, P.N);
    if (y % 13 === 5) p.set(x0, y, P.L); // a ring turned on the lathe
  }
  // the knob
  rows(p, ['.LB.', 'LBBN', 'BBBN', '.NN.'], { L: P.L, B: P.B, N: P.N }, x0 - 2, 42);
  // hooks: two out to the left, two to the right, curling up at the ends
  const hook = (dir: number, y: number) => {
    for (let i = 1; i <= 6; i++) p.set(x0 + dir * i, y + Math.floor(i / 3), i < 3 ? P.B : P.N);
    p.set(x0 + dir * 6, y + 1, P.N);
    p.set(x0 + dir * 7, y, P.B);
    p.set(x0 + dir * 7, y - 1, P.L);
  };
  hook(-1, 48);
  hook(1, 49);
  hook(-1, 58);
  hook(1, 57);
}

function drawShelf(p: PixelCanvas): void {
  const x0 = 322;
  const x1 = 376;
  const y0 = 36;
  for (let y = y0; y < 110; y++)
    for (let x = x0; x <= x1; x++) {
      const edge = x === x0 || x === x1 || y === y0 || x === x0 + 1;
      p.set(x, y, edge ? (x === x0 + 1 ? P.D : P.K) : P.N);
    }
  // shelves and what stands on them
  const shelfY = [54, 74, 94];
  let seed = 3;
  for (const sy of shelfY) {
    for (let x = x0 + 2; x < x1; x++) {
      p.set(x, sy, P.D);
      p.set(x, sy + 1, P.K);
    }
    let x = x0 + 4;
    while (x < x1 - 4) {
      seed++;
      const bw = 3 + Math.floor(hash2(seed, sy, 5) * 3);
      const bh = 12 + Math.floor(hash2(seed, sy, 6) * 5);
      const lean = hash2(seed, sy, 8) < 0.15 && x > x0 + 10;
      const col = [P.D, P.N, P.G, P.D][seed % 4];
      for (let yy = 0; yy < bh; yy++)
        for (let xx = 0; xx < bw; xx++) {
          const px = x + xx + (lean ? Math.floor(yy / 5) - 2 : 0);
          if (px >= x1) continue;
          p.set(px, sy - 1 - yy, xx === 0 ? P.G : xx === bw - 1 ? P.K : col);
        }
      // a small label on the spine
      if (bh > 13 && !lean) {
        p.set(x + 1, sy - bh + 3, P.W);
        p.set(x + 1, sy - bh + 4, P.G);
      }
      x += bw + (hash2(seed, sy, 9) < 0.25 ? 3 : 0);
    }
  }
  // a box file lying on top
  for (let y = 30; y < 36; y++) for (let x = 330; x < 356; x++) p.set(x, y, y === 30 ? P.G : x === 355 ? P.K : P.D);
  for (let x = 334; x < 344; x++) p.set(x, 33, P.G);
  // the glass of the doors catches one faint streak
  for (let i = 0; i < 18; i++) p.set(x0 + 14 + Math.floor(i / 3), 40 + i * 3, P.D);
}

/** The high-backed black leather chair behind ツガオ. */
function drawChair(p: PixelCanvas): void {
  const x0 = 150;
  const x1 = 234;
  const y0 = 50;
  for (let y = y0; y < DESK_Y + 4; y++) {
    // rounded top corners, a slight flare toward the seat
    const inset = y - y0 < 6 ? [6, 3, 2, 1, 1, 0][y - y0] : 0;
    for (let x = x0 + inset; x <= x1 - inset; x++) {
      let col: string = P.N;
      if (x === x0 + inset || y === y0) col = P.K;
      else if (x === x1 - inset) col = P.K;
      else if (x === x0 + inset + 1) col = P.D; // the lit edge
      // two vertical sheens on the lamp side
      else if ((x === x0 + 7 || x === x0 + 12) && y > y0 + 6 && y < y0 + 60 && (y < y0 + 40 || bay(x, y) < 0.5)) col = P.G;
      // the stitched border, 4px in
      else if ((x === x0 + inset + 4 || x === x1 - inset - 4) && y > y0 + 4 && y % 2 === 0) col = P.D;
      else if (y === y0 + 4 && x > x0 + 4 && x < x1 - 4 && x % 2 === 0) col = P.D;
      // the head cushion's lower seam
      else if (y === y0 + 12 && x > x0 + 4 && x < x1 - 4) col = P.K;
      else if (y === y0 + 11 && x > x0 + 4 && x < x1 - 4 && x < 190) col = P.D;
      p.set(x, y, col);
    }
  }
}

/** Wall, floor, clocks' frames, hat stand, shelf, chair. */
export function buildRoomBack(): HTMLCanvasElement {
  const p = new PixelCanvas(384, 216);
  p.fill(P.K);
  drawWall(p);
  for (const id of Object.keys(CLOCKS) as ClockId[]) drawClockFrame(p, id);
  drawShelf(p);
  drawHatStand(p);
  drawChair(p);
  return p.toCanvas();
}

// ---- the desk and what stays on it -------------------------------------------------------

const WOOD = [P.N, P.D, P.B, P.L, P.c] as const;

function drawDesk(p: PixelCanvas): void {
  for (let y = DESK_Y; y < 216; y++)
    for (let x = 0; x < 384; x++) {
      if (y < 146) {
        // the top: grain running across, the pool of light on it
        const grain = valueNoise(x / 30, y * 1.7, 12) * 0.16 - 0.08 + (hash2(x >> 2, y, 4) < 0.1 ? -0.05 : 0);
        const amb = 0.3 + 0.2 * Math.exp(-Math.abs(x - LAMP.x) / 140);
        let v = amb + 0.62 * poolLight(x, y) + grain;
        if (y === DESK_Y) v -= 0.18; // the far edge, in the shadow of what stands on it
        if (y >= 144) {
          // the front lip: rounded, the corners worn pale
          v = y === 144 ? v + 0.18 : v - 0.1;
          if (y === 144 && hash2(x >> 1, 0, 5) < 0.08) v += 0.15;
        }
        p.set(x, y, step(WOOD, v, x, y));
      } else {
        // the front: panels and drawers in the dark
        const v = 0.28 + 0.3 * Math.exp(-Math.hypot(x - LAMP.x, y - 146) / 70);
        p.set(x, y, step([P.K, P.N, P.D, P.B], v, x, y));
      }
    }
  // drawers: two stacks, their edges and pulls
  const drawer = (x0: number, x1: number, y0: number, y1: number) => {
    for (let x = x0; x <= x1; x++) {
      p.set(x, y0, P.K);
      p.set(x, y1, P.D);
    }
    for (let y = y0; y <= y1; y++) {
      p.set(x0, y, P.K);
      p.set(x1, y, P.D);
    }
    const cx = Math.round((x0 + x1) / 2);
    const lit = Math.abs(cx - LAMP.x) < 70;
    for (let x = cx - 3; x <= cx + 3; x++) p.set(x, y0 + 5, lit ? P.L : P.B);
    p.set(cx - 3, y0 + 6, P.N);
    p.set(cx + 3, y0 + 6, P.N);
  };
  for (const [x0, x1] of [
    [20, 104],
    [280, 364],
  ])
    for (const [y0, y1] of [
      [150, 170],
      [173, 193],
      [196, 216],
    ])
      drawer(x0, x1, y0, y1);
  // the centre panel: a long shallow drawer under the top
  for (let x = 112; x <= 272; x++) p.set(x, 150, P.K);
  for (let x = 112; x <= 272; x++) p.set(x, 162, P.D);
}

function drawPapers(p: PixelCanvas): void {
  // two stacks, sheets seen edge-on (lighter toward the lamp)
  const stack = (x0: number, x1: number, top: number, bottom: number, seed: number) => {
    for (let y = top; y <= bottom; y++) {
      const off = Math.floor(hash2(y, seed, 1) * 3) - 1;
      for (let x = x0 + off; x <= x1 + off; x++) {
        const lit = poolLight(x, 134) * 0.8 + 0.3 * Math.exp(-Math.abs(x - LAMP.x) / 40);
        const sheet = (y - top) % 2 === 0;
        p.set(x, y, sheet ? step([P.D, P.G, P.W], lit + 0.25, x, y) : step([P.K, P.N, P.D], lit + 0.2, x, y));
      }
    }
    // the top sheet, seen from above
    for (let x = x0; x <= x1; x++) p.set(x, top - 1, step([P.G, P.W, P.Pp], 0.35 + poolLight(x, 134), x, top));
  };
  stack(24, 56, 110, 127, 3);
  stack(50, 74, 118, 129, 8);
  // a black binder clip on the tall stack, a loose sheet on the desk
  rows(p, ['.GG.', 'GKKG', 'KKKK'], { G: P.G, K: P.K }, 36, 107);
  for (let y = 136; y < 142; y++) for (let x = 30 + (y - 136); x < 58 + (y - 136); x++) p.set(x, y, step([P.G, P.W], 0.3 + poolLight(x, y), x, y));
}

function drawLamp(p: PixelCanvas): void {
  // base on the desk
  for (let y = 127; y < 135; y++)
    for (let x = 92; x <= 114; x++) {
      const dx = (x - 103) / 11.5;
      const dy = (y - 131) / 4;
      if (dx * dx + dy * dy > 1) continue;
      p.set(x, y, y <= 128 ? P.G : x < 98 ? P.D : P.N);
    }
  // stem
  for (let y = 100; y < 129; y++) {
    p.set(102, y, P.G);
    p.set(103, y, P.D);
    p.set(104, y, P.N);
  }
  // the switch: a little chain with a bead
  for (let y = 104; y < 112; y++) p.set(110, y, y % 2 ? P.G : P.D);
  p.set(110, 112, P.c);
  // the shade: a green dome, lit from inside at its rim
  for (let y = 83; y <= 102; y++) {
    const t = (y - 83) / 19;
    const hw = 5 + Math.round(Math.sqrt(t) * 16);
    for (let x = LAMP.x - hw; x <= LAMP.x + hw; x++) {
      const u = (x - (LAMP.x - hw)) / (2 * hw);
      let col: string;
      if (y === 83) col = P.D;
      else if (y >= 101) col = u > 0.25 && u < 0.75 ? (y === 102 ? P.Pp : P.Y) : P.Y;
      else if (u < 0.12) col = P.V;
      else if (u > 0.16 && u < 0.26 && y > 85 && y < 98) col = y < 93 || bay(x, y) < 0.5 ? P.Y : P.V; // the sheen on the dome
      else if (u > 0.78) col = bay(x, y) < 0.6 ? P.D : P.V;
      else if (u > 0.6) col = bay(x, y) < 0.25 ? P.D : P.V;
      else col = P.V;
      if (x === LAMP.x - hw || x === LAMP.x + hw) col = y >= 101 ? P.V : P.N;
      p.set(x, y, col);
    }
  }
  // the finial
  rows(p, ['.GG.', 'GDDN'], { G: P.G, D: P.D, N: P.N }, LAMP.x - 2, 80);
}

function drawTeacup(p: PixelCanvas): void {
  // a yunomi, half drunk, gone cold (no steam); far from the lamp, so dim
  const { x, y } = CUP;
  rows(
    p,
    [
      '.GGGGGGGGGG.',
      'GWDVVVVVVDGN',
      'GDVVVVVVVVDN',
      '.GDDDDDDDDN.',
      '.GDDDDDDDDN.',
      '.GDDDDDDDDN.',
      '.GDDDNDDDDN.',
      '.GDDDDDDDDN.',
      '.GDDDDDDDDN.',
      '.GDDDDDDDDN.',
      '..GDDDDDDN..',
      '..NNNNNNNN..',
    ],
    { G: P.G, W: P.W, D: P.D, V: P.V, N: P.N },
    x,
    y,
  );
  // the tea itself sits low in the cup: darker
  for (let i = 3; i < 9; i++) p.set(x + i, y + 2, P.D);
}

function drawPad(p: PixelCanvas): void {
  // a black ink pad, its lid open and standing behind it
  const { x, y } = PAD;
  rows(
    p,
    [
      '.NNNNNNNNNNNNNNNNN.',
      'NGDDDDDDDDDDDDDDDDN',
      'NDDDDDDDDDDDDDDDDDN',
      'NDDDDDDDDDDDDDDDDDN',
      'NDDDDDDDDDDDDDDDDDN',
      'NDDDDDDDDDDDDDDDDDN',
      'NNNNNNNNNNNNNNNNNNN',
      'NGGGGGGGGGGGGGGGGGN',
      'NGKKKKKKKKKKKKKKKGN',
      'NGKKGKKKKKKKKGKKKGN',
      'NGKKKKKKKKKKKKKKKGN',
      'NNNNNNNNNNNNNNNNNNN',
      '.KKKKKKKKKKKKKKKKK.',
    ],
    { N: P.N, G: P.G, D: P.D, K: P.K },
    x,
    y - 8,
  );
}

/** Desk, papers, lamp, teacup, ink pad (in front of ツガオ's chair). */
export function buildRoomFront(): HTMLCanvasElement {
  const p = new PixelCanvas(384, 216);
  drawDesk(p);
  drawPapers(p);
  drawTeacup(p);
  drawPad(p);
  drawLamp(p);
  return p.toCanvas();
}

/**
 * The lamp's cone (#F6D98A, α up to 35%) from the shade's rim down to the
 * desk, and the pool on the desk (α up to 50% at its middle) — laid over
 * everything that stands in it (ツガオ's near hand, the cards).
 */
export function buildLight(): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(384, 216);
  const img = ctx.createImageData(384, 216);
  const d = img.data;
  const [r, g, b] = [0xf6, 0xd9, 0x8a];
  for (let y = 103; y < 146; y++)
    for (let x = 30; x < 210; x++) {
      const t = (y - 103) / 30;
      // the cone widens from the rim (x81–121) to the desk (x52–180)
      const l = LAMP.x - 20 - t * 29;
      const rr = LAMP.x + 20 + t * 59;
      let a = 0;
      if (y < DESK_Y + 2 && x >= l && x <= rr) {
        const u = (x - l) / (rr - l);
        const edge = Math.min(1, Math.min(u, 1 - u) * 6);
        a = (0.35 - 0.2 * Math.min(1, t)) * edge;
      }
      a = Math.max(a, 0.5 * poolLight(x, y) * (y >= DESK_Y ? 1 : 0.3));
      if (a <= 0.01) continue;
      // stepped to the Bayer grid so it stays pixel-crisp
      const q = Math.floor(a * 20 + bay(x, y)) / 20;
      const i = (y * 384 + x) * 4;
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = Math.round(q * 255);
    }
  ctx.putImageData(img, 0, 0);
  return c;
}

// ---- clocks ---------------------------------------------------------------------------------

/** The face (Ø21): white, 12 marks, the upper half in the shadow. Hands are drawn live. */
export function clockFace(id: ClockId): HTMLCanvasElement {
  const dim = wallLight(CLOCKS[id].x, CLOCKS[id].y + 8) < 0.45 ? 0.12 : 0;
  const p = new PixelCanvas(21, 21);
  for (let y = 0; y < 21; y++)
    for (let x = 0; x < 21; x++) {
      const dx = x - 10;
      const dy = y - 10;
      if (dx * dx + dy * dy > 100.5) continue;
      // the top half in the lamp shade's shadow, in three clean steps
      const sh = (dy <= -6 ? 0.75 : dy <= -3 ? 0.5 : dy < 0 ? 0.25 : 0) + (dy < 0 ? dim : 0);
      p.set(x, y, bay(x, y) < sh ? P.G : P.W);
    }
  // hour marks
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    const x = Math.round(10 + Math.sin(a) * 8.5);
    const y = Math.round(10 - Math.cos(a) * 8.5);
    p.set(x, y, h % 3 === 0 ? P.K : P.G);
    if (h % 3 === 0) p.set(Math.round(10 + Math.sin(a) * 7.5), Math.round(10 - Math.cos(a) * 7.5), P.K);
  }
  return p.toCanvas();
}

// Hand-drawn glyphs (1px pen, a little shaky): 6px tall for the plates and
// the circular's page, 5px for the circular's cover (まだまだ団).
const GLYPH6: Record<string, string[]> = {
  夕: ['..#..', '.####', '#...#', '.##.#', '...#.', '.##..'],
  鳴: ['...#..', '##.###', '##.###', '...#..', '...###', '..#.##'],
  町: ['###.##', '#.#..#', '###..#', '#.#..#', '###..#', '....##'],
  星: ['.###.', '.#.#.', '.###.', '#.#..', '.###.', '#####'],
  見: ['.###.', '.###.', '.#.#.', '.###.', '.#.#.', '#..##'],
  台: ['..#..', '.#.#.', '#####', '.###.', '.#.#.', '.###.'],
  海: ['#.#..', '..###', '#.#.#', '.####', '..#.#', '#.###'],
  ぞ: ['###.#', '..#.#', '#####', '.#...', '#....', '.###.'],
  い: ['#....', '#....', '#..#.', '#...#', '#...#', '.#...'],
  の: ['.###.', '#.#.#', '#.#.#', '#.#.#', '#..#.', '.#...'],
};
const GLYPH5: Record<string, string[]> = {
  ま: ['..#..', '#####', '..#..', '#####', '###..'],
  だ: ['#..##', '###..', '#.###', '#....', '#.###'],
  団: ['#####', '#..##', '####.', '#.#.#', '#####'],
};

/** Hand-lettered text (6px glyphs, else 5px; unknown characters are skipped). */
export function glyphs5(text: string, color: string, gap = 1): HTMLCanvasElement {
  const set = [...text].every((ch) => GLYPH6[ch] || ch === ' ') ? GLYPH6 : GLYPH5;
  const chars = [...text].filter((ch) => set[ch]);
  const h = set === GLYPH6 ? 6 : 5;
  const widths = chars.map((ch) => set[ch][0].length);
  const w = Math.max(1, widths.reduce((a, b) => a + b, 0) + (chars.length - 1) * gap);
  const p = new PixelCanvas(w, h);
  let x = 0;
  chars.forEach((ch, i) => {
    rows(p, set[ch], { '#': color }, x, 0);
    x += widths[i] + gap;
  });
  return p.toCanvas();
}

/** The name plate under a clock: a white board 28×7, black handwriting. */
export function plateImg(id: ClockId): HTMLCanvasElement {
  const p = new PixelCanvas(28, 9);
  const lit = wallLight(CLOCKS[id].x, CLOCKS[id].y + 16) > 0.45;
  for (let y = 0; y < 9; y++) for (let x = 0; x < 28; x++) p.set(x, y, y === 8 || x === 27 ? P.G : x === 0 || y === 0 ? (lit ? P.Pp : P.W) : P.W);
  const c = p.toCanvas();
  const text = glyphs5(CLOCKS[id].label, P.K, CLOCKS[id].label.length > 3 ? 0 : 2);
  c.getContext('2d')!.drawImage(text, Math.round((28 - text.width) / 2), 1);
  return c;
}

// ---- ツガオ -------------------------------------------------------------------------------

const HEAD_PAL: Record<string, string> = { K: P.K, N: P.N, D: P.D, G: P.G, S: P.S, s: P.L, b: P.B };

/**
 * The head (22×27): a flat-topped crew cut, the eyes in the lamp shade's
 * shadow (only the bottom edge of the thick brows catches the light),
 * a mouth pressed straight with its corners a pixel down, a square jaw.
 * Lit from the left.
 */
const HEAD_ROWS = [
  '....KKKKKKKKKKKKKK....',
  '...KGNNGNNGNNGNNGNNK..',
  '..KGNNNGNNNNGNNNGNNNK.',
  '..KNNNNNNNNNNNNNNNNNK.',
  '..KGNNGNNNNGNNNNGNNNK.',
  '..KNNNNNNNNNNNNNNNNNK.',
  '..KNNNNNNNNNNNNNNNNNK.',
  '..KNNbbbbbbbbbbbbNNNK.',
  '..KNbbDbbbbbbbbDbbNNK.',
  '..bbbbbbbbbbbbbbbbbbK.',
  '..bbKKKKKKbbbKKKKKKbK.',
  '..bKKKKKKKbbbKKKKKKKK.',
  '.SSbbbbbbbbsbbbbbbbbsK',
  '.SSbbDDDbbbsbbbDDDbbsK',
  '.SSbbbDbbbbsbbbbDbbbsK',
  '.SSsbsbsbsbSbsbsbsbssK',
  '.SSSSSSSSSSsSSSSSsssK.',
  '.SSSSSSSSSSsSSSSSsssK.',
  '..SSSSSSSSbbbSSSSsssK.',
  '..SSSSSSSSSSSSSSSsssK.',
  '..SSSSSKKKKKKKSSSsssK.',
  '..SSSSKSSSSSSSKSSsssK.',
  '..SSSSSSSSSSSSSSSsssK.',
  '..sSSSSSSSSSSSSSssssK.',
  '..ssSSSSSSSSSSSsssssK.',
  '..bsssssssssssssssssK.',
  '...bbbbbbbbbbbbbbbbb..',
];
export const HEAD_W = 22;

export function headImg(): HTMLCanvasElement {
  const p = new PixelCanvas(HEAD_W, HEAD_ROWS.length);
  rows(p, HEAD_ROWS, HEAD_PAL, 0, 0);
  return p.toCanvas();
}

/**
 * The nightcap (white with navy dots, a white pompom). `hang`: drooping
 * from the hook (13×20); `worn`: a soft cone on the head, flopping to the
 * right, the pompom by the ear (28×20, its band over the hairline at y 14).
 */
export function capImg(kind: 'hang' | 'worn'): HTMLCanvasElement {
  const pal: Record<string, string> = { W: P.W, P: P.Pp, U: P.U, G: P.G, N: P.N };
  // hanging by its band from the hook (or from his fist): the long cone
  // droops straight down, the pompom at its tip
  const hang = [
    '.NNNNNNNNNN.',
    'NPPPPPPPPPWN',
    'NWWWWWWWWWGN',
    'NGGGGGGGGGGN',
    '.NPWUWWWUWN.',
    '.NPWWWWWWGN.',
    '.NPUWWWUWGN.',
    '..NWWWWWGN..',
    '..NPWUWWGN..',
    '..NPWWWUGN..',
    '...NWWWGN...',
    '...NPUWGN...',
    '...NPWWN....',
    '....NWGN....',
    '....NWN.....',
    '...NPPWN....',
    '..NPPPWWN...',
    '..NPPWWWN...',
    '...NWWWN....',
    '....NNN.....',
  ];


  if (kind === 'hang') {
    const p = new PixelCanvas(hang[0].length, hang.length);
    rows(p, hang, pal, 0, 0);
    return p.toCanvas();
  }
  // worn (31×24): a long soft cone from the band over the forehead, up and
  // over to the right, its tip drooping past the ear with the pompom on it
  const p = new PixelCanvas(31, 24);
  p.poly(
    [
      [1, 20],
      [22, 20],
      [22, 12],
      [24, 11],
      [26, 14],
      [28, 12],
      [26, 6],
      [21, 3],
      [15, 3],
      [9, 7],
      [4, 13],
    ],
    P.W,
  );
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < 31; x++) {
      if (p.get(x, y) === 0) continue;
      // light from the lower left: the left slope pale, the droop's underside grey
      if (x + y < 20 || (x < 6 && y < 19)) p.set(x, y, P.Pp);
      if ((x > 22 && y > 9) || (x > 19 && y < 7 && x - 19 > y - 1)) p.set(x, y, bay(x, y) < 0.5 ? P.G : P.W);
      // navy dots, staggered
      if (y < 18 && (x + (Math.floor(y / 4) % 2) * 2) % 4 === 0 && y % 4 === 1) p.set(x, y, P.U);
    }
  // the band: a turned-up hem across the forehead
  for (let x = 1; x <= 22; x++) {
    p.set(x, 18, P.Pp);
    p.set(x, 19, P.W);
    p.set(x, 20, P.G);
  }
  // pompom
  for (let y = 12; y <= 18; y++)
    for (let x = 24; x <= 30; x++) {
      const d = Math.hypot(x - 27, y - 15);
      if (d > 3.2) continue;
      p.set(x, y, d > 2.2 && (x > 27 || y > 15) ? P.W : P.Pp);
    }
  p.outline(P.N);
  return p.toCanvas();
}

/**
 * The upper body (76×40, placed at x154 y92): a double-breasted suit in
 * charcoal with fine stripes, broad square shoulders, peak lapels, white
 * shirt, black tie, black pocket square; the chair's edges are not in it.
 * The forearms and hands are drawn live.
 */
export const TORSO = { x: 154, y: 88, w: 76, h: 44 };
export function torsoImg(): HTMLCanvasElement {
  const p = new PixelCanvas(TORSO.w, TORSO.h);
  const cx = 38; // screen x192
  // neck (in the shadow under the jaw)
  for (let y = 0; y < 8; y++) for (let x = cx - 5; x <= cx + 4; x++) p.set(x, y, y < 2 ? P.B : x < cx - 2 ? P.S : P.L);
  // jacket silhouette: shoulders at y8, padded, square
  const half = (y: number) => (y < 8 ? 0 : y === 8 ? 22 : y === 9 ? 27 : y === 10 ? 29 : 30);
  for (let y = 8; y < TORSO.h; y++) {
    const h = half(y);
    for (let x = cx - h; x <= cx + h - 1; x++) {
      const u = x - (cx - h);
      let col: string = P.D;
      if (x % 4 === 1 && y > 10) col = P.G; // stripes
      if (u === 0) col = P.G; // lit edge (the lamp is to the left)
      else if (u === 1 && y > 9) col = bay(x, y) < 0.5 ? P.G : P.D;
      if (x >= cx + h - 2) col = P.N; // the far edge
      if (y === 8 || (y === 9 && (u < 6 || x > cx + h - 7))) col = y === 8 ? P.G : P.D;
      p.set(x, y, col);
    }
  }
  // the shoulder seams and the arm's crease (upper arms along the sides)
  for (let y = 12; y < TORSO.h; y++) {
    p.set(cx - 22, y, P.N);
    p.set(cx + 21, y, P.N);
    p.set(cx - 23, y, bay(0, y) < 0.5 ? P.G : P.D);
  }
  // shirt: the V between the lapels, from the collar to the top button
  for (let y = 6; y < 28; y++) {
    const hw = Math.max(0, Math.round(7 - (y - 6) * 0.33));
    for (let x = cx - hw; x <= cx + hw - 1; x++) p.set(x, y, x < cx - 2 ? P.Pp : P.W);
  }
  // collar points
  rows(p, ['PP.......WW', 'PPP.....WWG', '.PPP...WWG.', '..PP...WG..'], { P: P.Pp, W: P.W, G: P.G }, cx - 6, 5);
  // tie: knot, then the blade down behind the button
  rows(p, ['.KKK.', 'KGKKK', '.KKK.'], { K: P.K, G: P.G }, cx - 3, 8);
  for (let y = 11; y < 28; y++) {
    const hw = y < 14 ? 1 : 2;
    for (let x = cx - hw - 1; x <= cx + hw - 1; x++) p.set(x, y, x === cx - hw - 1 ? P.G : P.K);
  }
  // lapels: wide peaks, the lit edge on the left
  for (let y = 8; y < 30; y++) {
    const inner = Math.max(0, Math.round(7 - (y - 6) * 0.33));
    const w = y < 14 ? 4 + (y - 8) : Math.max(2, 10 - Math.floor((y - 14) / 2));
    for (let i = 0; i < w; i++) {
      const lx = cx - inner - 1 - i;
      const rx = cx + inner + i;
      p.set(lx, y, i === 0 ? P.G : i === w - 1 ? P.N : P.D);
      p.set(rx, y, i === 0 ? P.N : i === w - 1 ? P.K : P.D);
    }
    // the peak's notch
    if (y === 13) {
      p.set(cx - inner - w, y, P.K);
      p.set(cx + inner + w - 1, y, P.K);
    }
  }
  // double-breasted: the overlap line and two pairs of buttons
  for (let y = 28; y < TORSO.h; y++) p.set(cx + 5, y, P.N);
  for (const [bx, by] of [
    [cx - 7, 29],
    [cx + 8, 29],
    [cx - 7, 37],
    [cx + 8, 37],
  ]) {
    p.set(bx, by, P.K);
    p.set(bx + 1, by, P.K);
    p.set(bx, by - 1, P.G);
  }
  // the breast pocket with its black square (the wearer's left: screen right)
  for (let x = cx + 12; x < cx + 20; x++) p.set(x, 22, P.N);
  rows(p, ['.K.K..', 'KGKGK.', 'KKKKKK'], { K: P.K, G: P.G }, cx + 13, 19);
  return p.toCanvas();
}

/** A big hand (12×9), palm down on the desk, fingertips toward us, ink on three of them. */
export function handImg(kind: 'rest' | 'point' | 'open' | 'grip', flip = false): HTMLCanvasElement {
  const pal: Record<string, string> = { W: P.W, S: P.S, s: P.L, b: P.B, K: P.K, D: P.D };
  const art: Record<string, string[]> = {
    rest: [
      'WWWWWWWWWW..',
      'bSSSSSSSSsb.',
      'SSSSSSSSSSsb',
      'SSSSSSSSSSss',
      'SsSSsSSsSSss',
      'SsSSsSSsSSs.',
      'SsSSsSSsSSs.',
      'KbsKbsKbsbs.',
      '.bb.bb.bb.b.',
    ],
    point: [
      'WWWWWWWWWW..',
      'bSSSSSSSSsb.',
      'SSSSSSSSSSsb',
      'SSSSSSSSSSss',
      'bsbbsbbsSSs.',
      '.......sSSs.',
      '.......sSSs.',
      '.......sSSs.',
      '.......KbS..',
      '........b...',
    ],
    open: [
      '.S..S..S....',
      'SsSSsSSsS...',
      'SsSSsSSsS.S.',
      'SsSSsSSsSSs.',
      'SSSSSSSSSSs.',
      'SSSSSSSSSs..',
      'bSSSSSSSsb..',
      'WWWWWWWWW...',
    ],
    grip: [
      'WWWWWWWWWW..',
      'bSSSSSSSSsb.',
      'SSSSSSSSSSsb',
      'SbsSbsSbsSs.',
      'SSsSSsSSsSs.',
      'KbbKbbKbbbs.',
    ],
  };
  const a = art[kind];
  const p = new PixelCanvas(12, a.length);
  rows(p, flip ? a.map((r) => [...r].reverse().join('')) : a, pal, 0, 0);
  return p.toCanvas();
}

// ---- things on the desk ---------------------------------------------------------------------

/** ダコク's box (24×22) — a cream time recorder; `legs` are drawn apart (they bend when it sinks). */
export function dakokuBox(): HTMLCanvasElement {
  const pal: Record<string, string> = { C: P.C, c: P.c, r: P.rust, D: P.D, N: P.N, K: P.K, W: P.W, P: P.Pp, G: P.G, B: P.B };
  const art = [
    '.........NNNNNN.........',
    '.........NGGGGN.........',
    '.........N....N.........',
    '.NNNNNNNNNNNNNNNNNNNNNN.',
    'NrCCCCCCCCCCCCCCCCCCCcrN',
    'NCPCCCCCCNNNNNNCCCCCCccN',
    'NCCCCCCNNWPPPPWNNCCCCccN',
    'NCCCCCNWPPPPPPPPWNCCCccN',
    'NCCCCNWPPPPKPPPPPWNCCccN',
    'NCCCCNPPPPPKPPPPPPNCCccN',
    'NCCCNWPPPPPKPPPPPPWNCccN',
    'NCCCNPKPPPPKKKKPPKPNCccN',
    'NCCCNWPPPPPPPPPPPPWNCccN',
    'NCCCCNPPPPPPPPPPPPNCCccN',
    'NCCCCNWPPPPPKPPPPWNCCccN',
    'NCCCCCNWPPPPPPPPWNCCCccN',
    'NCCCCCCNNWWWWWWNNCCCCccN',
    'NCCCCCCCCNNNNNNCCCCCCccN',
    'NCCCCCKKKKKKKKKKKKCCCccN',
    'NCCCCCcDDDDDDDDDDcCCCccN',
    'NrccccccccccccccccccccrN',
    '.NNNNNNNNNNNNNNNNNNNNNN.',
  ];
  const p = new PixelCanvas(24, art.length);
  rows(p, art, pal, 0, 0);
  // rust flecks down the right side
  p.set(21, 9, P.rust);
  p.set(22, 15, P.rust);
  return p.toCanvas();
}

/**
 * A report card (28×18): white with faint lines, the time box at the top
 * left, and its little picture — 1: the back of オムカエマチ's lost-child tag,
 * a black 「まだ」 under a slanted 朱 「おかえりなさい」; 2: the loudspeaker's
 * horn, a black 「まだ」 under the square 朱 「おやすみなさい」 with its stars.
 */
export function cardImg(n: 1 | 2): HTMLCanvasElement {
  const p = new PixelCanvas(28, 18);
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < 28; x++) {
      let col: string = P.Pp;
      if (x === 0 || y === 0) col = P.W;
      if (x === 27 || y === 17) col = P.G;
      else if (y > 5 && y % 3 === 0 && x > 1 && x < 26) col = P.W;
      p.set(x, y, col);
    }
  // time box, top left
  for (let x = 1; x < 13; x++) {
    p.set(x, 1, P.G);
    p.set(x, 6, P.G);
  }
  p.set(1, 2, P.G);
  p.set(1, 5, P.G);
  p.set(12, 2, P.G);
  p.set(12, 5, P.G);
  const digits: Record<string, string[]> = {
    '1': ['.#', '##', '.#'],
    '7': ['##', '.#', '#.'],
    '0': ['##', '##', '##'],
    '4': ['#.', '##', '.#'],
    '5': ['##', '#.', '##'],
    '9': ['##', '##', '.#'],
    ':': ['.', '#', '#'],
  };
  let dx = 2;
  for (const ch of n === 1 ? '17:00' : '4:59') {
    rows(p, digits[ch].map((r) => r.replace(/#/g, 'K')), { K: P.D }, dx, 2);
    dx += ch === ':' ? 2 : 3;
  }
  if (n === 1) {
    // the tag's back: a white tag with a string through its hole
    rows(
      p,
      [
        '..GGGGGGG..',
        '.GWWWWWWWG.',
        'GWWGWWWWWWG',
        'GWWWWWWWWWG',
        'GWWWWWWWWWG',
        'GWWWWWWWWWG',
        'GWWWWWWWWWG',
        '.GGGGGGGGG.',
      ],
      { G: P.G, W: P.W },
      14,
      6,
    );
    for (let i = 0; i < 4; i++) p.set(17 - i, 8 - Math.floor(i / 2), P.D);
    // black 「まだ」 (an oval) …
    rows(p, ['.KKKKK.', 'K.K.KKK', 'KKK.K.K', '.KKKKK.'], { K: P.K }, 15, 9);
    // … under the slanted 朱 「おかえりなさい」
    rows(p, ['...RRRR', '.RR..RR', 'RR.RR.R', 'R.R..R.', 'RR..RR.', '.RRRR..'], { R: P.R }, 18, 9);
  } else {
    // the horn of the loudspeaker
    rows(
      p,
      [
        '......GG',
        '....GGWG',
        '..GGWWWG',
        'GGWWWWWG',
        'GDWWWWWG',
        'GGWWWWWG',
        '..GGWWWG',
        '....GGWG',
        '......GG',
      ],
      { G: P.G, W: P.W, D: P.D },
      15,
      6,
    );
    rows(p, ['.KKKK.', 'KK.KKK', 'K.KK.K', '.KKKK.'], { K: P.K }, 19, 8);
    // the square 朱 「おやすみなさい」, stars around it
    rows(p, ['RRRRR', 'R.R.R', 'RR.RR', 'R.R.R', 'RRRRR'], { R: P.R }, 21, 10);
    p.set(20, 9, P.R);
    p.set(26, 10, P.R);
    p.set(26, 15, P.R);
    p.set(20, 15, P.R);
  }
  return p.toCanvas();
}

/**
 * The black circular (32×20) seen on the desk. `page` 0: its black cover
 * with 「まだまだ団」 in white; 1: turned — a white page, 「海ぞいの町」 at
 * the top, lines under it. The clip at the top is steel.
 */
export function boardImg(page: 0 | 1): HTMLCanvasElement {
  const p = new PixelCanvas(BOARD.w, BOARD.h);
  for (let y = 0; y < BOARD.h; y++)
    for (let x = 0; x < BOARD.w; x++) p.set(x, y, x === 0 || y === BOARD.h - 1 ? P.K : y === 0 || x === 1 ? P.G : P.D);
  if (page === 0) {
    const t = glyphs5('まだまだ団', P.Pp, 1);
    const c = p.toCanvas();
    c.getContext('2d')!.drawImage(t, Math.round((BOARD.w - t.width) / 2), 8);
    addClip(c);
    return c;
  }
  // a white sheet clipped on (a pixel in from the edges)
  for (let y = 3; y < BOARD.h - 2; y++) for (let x = 2; x < BOARD.w - 2; x++) p.set(x, y, x === BOARD.w - 3 || y === BOARD.h - 3 ? P.W : P.Pp);
  for (let y = 12; y < BOARD.h - 3; y += 2) for (let x = 4; x < BOARD.w - 5 - (y % 4) * 3; x++) if (hash2(x >> 1, y, 2) > 0.2) p.set(x, y, P.G);
  const c = p.toCanvas();
  const t = glyphs5('海ぞいの町', P.K, 0);
  c.getContext('2d')!.drawImage(t, Math.round((BOARD.w - t.width) / 2), 4);
  addClip(c);
  return c;
}

function addClip(c: HTMLCanvasElement): void {
  const ctx = c.getContext('2d')!;
  const p = new PixelCanvas(12, 4);
  rows(p, ['.GGGGGGGGGG.', 'GWGGGGGGGGGN', 'GGGNNNNNNGGN', '.NNNNNNNNNN.'], { G: P.G, W: P.W, N: P.N }, 0, 0);
  ctx.drawImage(p.toCanvas(), 10, 0);
}

/** The page turning over the clip (3 frames: lifted, upright, laid back). */
export function boardFlip(i: 0 | 1 | 2): HTMLCanvasElement {
  const hs = [12, 4, 6];
  const h = hs[i];
  const p = new PixelCanvas(BOARD.w, 14);
  const top = i === 2 ? 14 - h : 14 - h;
  for (let y = top; y < 14; y++)
    for (let x = 1; x < BOARD.w - 1; x++) {
      const back = i === 2; // the cover's back is black too, with a grey edge
      p.set(x, y, y === top ? P.G : back ? P.N : P.D);
    }
  return p.toCanvas();
}

/** The black stamp, standing: a turned handle (10×16) with a knob. */
export function stampImg(): HTMLCanvasElement {
  const art = [
    '...NNNN...',
    '..NGDDDN..',
    '..NGDDDN..',
    '...NDDN...',
    '....DN....',
    '...NDDN...',
    '..NGDDDN..',
    '..NGDDDN..',
    '..NGDDDN..',
    '..NGDDDN..',
    '..NGDDDN..',
    '..NGDDDN..',
    '.NNNNNNNN.',
    'NGDDDDDDDN',
    'NKKKKKKKKN',
    '.KKKKKKKK.',
  ];
  const p = new PixelCanvas(10, art.length);
  rows(p, art, { N: P.N, G: P.G, D: P.D, K: P.K }, 0, 0);
  return p.toCanvas();
}

/** The stamp's face coming at us (black rubber, the 「まだ」 in relief), at a size. */
export function stampFace(w: number, h: number): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(w, h);
  const img = ctx.createImageData(w, h);
  const d = img.data;
  const set = (x: number, y: number, hex: string) => {
    const i = (y * w + x) * 4;
    d[i] = parseInt(hex.slice(1, 3), 16);
    d[i + 1] = parseInt(hex.slice(3, 5), 16);
    d[i + 2] = parseInt(hex.slice(5, 7), 16);
    d[i + 3] = 255;
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - w / 2) / (w / 2);
      const dy = (y + 0.5 - h / 2) / (h / 2);
      const r = dx * dx + dy * dy;
      if (r > 1) continue;
      set(x, y, r > 0.8 ? P.D : dx < -0.5 && dy < 0 ? P.D : P.N);
    }
  ctx.putImageData(img, 0, 0);
  // the letters in relief, mirrored (a stamp's face)
  const t = ovalStamp('まだ', Math.max(16, Math.round(w * 0.9)), Math.max(10, Math.round(h * 0.9)), 0, 5);
  ctx.save();
  ctx.translate(w, 0);
  ctx.scale(-1, 1);
  ctx.globalAlpha = 0.5;
  const s = Math.min((w * 0.9) / t.width, (h * 0.9) / t.height);
  ctx.drawImage(silhouetteOf(t, P.G), Math.round((w - t.width * s) / 2), Math.round((h - t.height * s) / 2), Math.round(t.width * s), Math.round(t.height * s));
  ctx.restore();
  return c;
}

function silhouetteOf(src: HTMLCanvasElement, color: string): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, src.width, src.height);
  return c;
}

/**
 * The print the black stamp leaves on the screen (96×40): the ink has run
 * out — only the left half of 「ま」 and a piece of the oval's left arc come
 * through, and those at 60% (ordered dither).
 */
export function madaPrint(): HTMLCanvasElement {
  const w = 96;
  const h = 40;
  const src = ovalStamp('まだ', w, h, 0.1, 9);
  const [c, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  const img = ctx.getImageData(0, 0, src.width, src.height);
  const d = img.data;
  const sw = src.width;
  // 「ま」 is the left glyph (16px, just left of the middle): keep its left half and the oval's left arc
  const cut = Math.round(sw / 2 - 8);
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4;
      if (!d[i + 3]) continue;
      const keep = x < cut - (hash2(x >> 1, y >> 1, 4) < 0.5 ? 2 : 0) && bay(x, y) < 0.6 && !(x < 12 && (y < 8 || y > 31) && hash2(x, y, 6) < 0.6);
      if (!keep) {
        d[i + 3] = 0;
        continue;
      }
      d[i] = 0x0b;
      d[i + 1] = 0x0b;
      d[i + 2] = 0x14;
    }
  // wet ink shines a little along its upper-left edges (so the black reads on a dark picture)
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < sw && y < src.height && d[(y * sw + x) * 4 + 3] > 0 && d[(y * sw + x) * 4] === 0x0b;
  const sheen: number[] = [];
  for (let y = 0; y < src.height; y++)
    for (let x = 0; x < sw; x++) if (!on(x, y) && (on(x + 1, y) || on(x, y + 1))) sheen.push(x, y);
  for (let k = 0; k < sheen.length; k += 2) {
    const i = (sheen[k + 1] * sw + sheen[k]) * 4;
    d[i] = 0x3a;
    d[i + 1] = 0x3f;
    d[i + 2] = 0x48;
    d[i + 3] = 200;
  }
  ctx.putImageData(img, 0, 0);
  return c;
}
