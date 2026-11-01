// Pixel art for the sound test: an evening desk with a spiral notebook, sticky
// index tabs, masking tape, a hanko cursor and ink stamps (30_level_art 10,
// "夏休みのノート"). Everything is built once and cached.

import { mix, PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { f5 } from './font5';

export const C = {
  paper: '#FBF3DC',
  grid: '#E8D9B5',
  ink: '#2A2440',
  shadow: '#5B4A7A',
  dim: '#9AA0A8',
  shu: '#E23B2E',
  shuLight: '#FF6A4D',
  shuDark: '#B8241E',
  tape: '#F7C27A',
  marker: '#FFE7A3',
  margin: '#E0567A',
  sys: '#4A3A6E',
  white: '#F4F1E8',
  wood: '#8A5A3A',
  woodDark: '#5A3A2A',
  woodLight: '#C8A06A',
  night: '#1B1733',
  deep: '#3A2B5C',
  dusk: '#B04A7A',
  sun: '#F2894B',
  steel: '#9AA0A8',
  concrete: '#C8C2B4',
  green: '#9BCB6B',
  water: '#7FD1E8',
  gold: '#D9A441',
};

const cache = new Map<string, HTMLCanvasElement>();
function cached(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = build();
    cache.set(key, c);
  }
  return c;
}

// ---------------------------------------------------------------------------
// the desk

/** Dark evening desk: planks with grain, a warm band of window light, vignette. */
export function deskArt(w: number, h: number): HTMLCanvasElement {
  return cached(`desk${w}x${h}`, () => {
    const p = new PixelCanvas(w, h);
    const plankH = 27;
    for (let y = 0; y < h; y++) {
      const plank = Math.floor(y / plankH);
      const inPlank = y % plankH;
      for (let x = 0; x < w; x++) {
        // wavy grain: a few long dark lines per plank
        const wave = Math.sin((x + plank * 53) / 23) * 2 + Math.sin((x + plank * 17) / 7.3) * 0.8;
        const gy = (inPlank + wave + plank * 5) % 9;
        let col = C.woodDark;
        if (gy < 1.1 && hash2(x >> 1, y + plank * 31) > 0.25) col = mix(C.woodDark, C.deep, 0.55);
        else if (gy > 4.5 && gy < 5.3 && hash2(x, y) > 0.6) col = mix(C.woodDark, C.wood, 0.35);
        p.set(x, y, col);
      }
      // plank seams: a dark line and a lit edge under it
      if (inPlank === 0) for (let x = 0; x < w; x++) p.set(x, y, C.ink);
      if (inPlank === 1) for (let x = 0; x < w; x++) p.set(x, y, mix(C.woodDark, C.wood, 0.5));
    }
    // a knot here and there
    for (const [kx, ky] of [
      [52, 180],
      [331, 40],
      [210, 98],
    ]) {
      p.ellipse(kx, ky, 4, 2, mix(C.woodDark, C.deep, 0.6));
      p.ellipse(kx, ky, 2, 1, C.deep);
    }
    // the evening sun from the window, top left: a soft diagonal band
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const d = (x * 0.8 + y * 1.25 - 120) / 150;
        const band = Math.exp(-d * d * 2.2);
        if (band > 0.12) {
          const k = Math.min(0.5, band * 0.42);
          const bay = [0, 8, 2, 10][y & 3] + [12, 4, 14, 6][x & 3];
          if (bay / 24 < band * 0.55) p.set(x, y, mix(C.dusk, C.sun, 0.3));
          else if (bay / 24 < band) p.set(x, y, mix(C.woodDark, C.dusk, k));
        }
      }
    // vignette
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const dx = (x - w / 2) / (w / 2);
        const dy = (y - h / 2) / (h / 2);
        const v = dx * dx * 0.6 + dy * dy * 0.9;
        if (v > 0.75 && hash2(x * 7, y * 3) < (v - 0.75) * 1.6) p.set(x, y, C.night);
      }
    return p.toCanvas();
  });
}

// ---------------------------------------------------------------------------
// paper

/**
 * A spiral-bound graph-paper page (rings on the left edge). The drop shadow
 * is part of the image, so draw it at (x − 0, y − 0) and the paper starts at
 * (6, 0) — the rings stick out on the left.
 */
export function pageArt(w: number, h: number): HTMLCanvasElement {
  return cached(`page${w}x${h}`, () => {
    const RING = 6;
    const p = new PixelCanvas(w + RING + 2, h + 2);
    const x0 = RING;
    // shadow (+2, +2)
    p.rect(x0 + 2, 2, w, h, mix(C.shadow, C.woodDark, 0.4));
    // paper and grid (8 px, from the inner top-left)
    p.rect(x0, 0, w, h, C.paper);
    for (let y = 6; y < h - 1; y += 8) for (let x = x0 + 1; x < x0 + w - 1; x++) p.set(x, y, C.grid);
    for (let x = x0 + 10; x < x0 + w - 1; x += 8) for (let y = 1; y < h - 1; y++) p.set(x, y, C.grid);
    // red margin line
    for (let y = 1; y < h - 1; y++) p.set(x0 + 22, y, mix(C.paper, C.margin, 0.55));
    // frame, with 1 px rounded corners
    p.strokeRect(x0, 0, w, h, C.ink);
    for (const [cx, cy] of [
      [x0, 0],
      [x0 + w - 1, 0],
      [x0, h - 1],
      [x0 + w - 1, h - 1],
    ])
      p.set(cx, cy, 'transparent');
    // punched holes and wire rings
    for (let y = 8; y < h - 6; y += 12) {
      p.rect(x0 + 4, y, 3, 3, mix(C.woodDark, C.ink, 0.5));
      p.set(x0 + 4, y, C.grid);
      // the wire: over the edge, from the hole to the left
      p.hline(x0 - RING + 1, x0 + 5, y + 1, C.steel);
      p.hline(x0 - RING + 1, x0 + 5, y + 2, mix(C.steel, C.ink, 0.5));
      p.set(x0 - RING, y + 1, mix(C.steel, C.ink, 0.35));
      p.set(x0 - RING, y + 2, mix(C.steel, C.ink, 0.6));
      p.set(x0 - RING + 2, y + 1, C.white);
    }
    // dog-ear at the bottom right: the corner folded back onto the page
    const e = 7;
    for (let dy = 0; dy < e; dy++)
      for (let dx = 0; dx < e; dx++) {
        const x = x0 + w - 1 - dx;
        const y = h - 1 - dy;
        const sum = dx + dy;
        if (sum < e - 1) p.set(x, y, dx + dy === e - 2 ? mix(C.shadow, C.woodDark, 0.4) : 'transparent');
        else if (sum === e - 1) p.set(x, y, C.ink);
        else if (dx === e - 1 || dy === e - 1) p.set(x, y, C.ink);
        else p.set(x, y, sum === e ? mix(C.grid, C.shadow, 0.25) : C.grid);
      }
    return p.toCanvas();
  });
}

/** A torn-off note card (paper, ink frame, soft shadow). */
export function cardArt(w: number, h: number, paper = C.paper, grid = true): HTMLCanvasElement {
  return cached(`card${w}x${h}${paper}${grid}`, () => {
    const p = new PixelCanvas(w + 2, h + 2);
    p.rect(2, 2, w, h, mix(C.shadow, C.woodDark, 0.4));
    p.rect(0, 0, w, h, paper);
    if (grid) {
      for (let y = 5; y < h - 1; y += 8) for (let x = 1; x < w - 1; x++) p.set(x, y, mix(paper, C.grid, 0.8));
      for (let x = 5; x < w - 1; x += 8) for (let y = 1; y < h - 1; y++) p.set(x, y, mix(paper, C.grid, 0.8));
    }
    p.strokeRect(0, 0, w, h, C.ink);
    // the top edge is torn: a few pixels bitten out
    for (let x = 1; x < w - 1; x++) if (hash2(x * 13, w) > 0.72) p.set(x, 0, 'transparent');
    for (let x = 1; x < w - 1; x++) if (p.alpha(x, 0) === 0) p.set(x, 1, C.ink);
    p.set(0, h - 1, 'transparent');
    p.set(w - 1, h - 1, 'transparent');
    return p.toCanvas();
  });
}

/** Masking tape with zig-zag torn ends (α≈85 %). */
export function tapeArt(w: number, h: number, color = C.tape): HTMLCanvasElement {
  return cached(`tape${w}x${h}${color}`, () => {
    const p = new PixelCanvas(w, h);
    const a = 'd9';
    for (let y = 0; y < h; y++) {
      const cut = (y % 4 < 2 ? y % 2 : 1 - (y % 2)) + (y % 3 === 0 ? 1 : 0);
      for (let x = cut; x < w - ((y + 1) % 3 === 0 ? 2 : (y % 2) + 0); x++) {
        const fiber = hash2(x * 3, y * 11) > 0.86;
        p.set(x, y, (fiber ? mix(color, C.white, 0.35) : color) + a);
      }
    }
    // a slightly darker lower edge
    for (let x = 1; x < w - 2; x++) if (p.alpha(x, h - 1)) p.set(x, h - 1, mix(color, C.wood, 0.3) + a);
    return p.toCanvas();
  });
}

/** A sticky index tab (the colour of its section), text drawn by the caller. */
export function tabArt(w: number, h: number, color: string, active: boolean): HTMLCanvasElement {
  return cached(`tab${w}x${h}${color}${active}`, () => {
    const p = new PixelCanvas(w, h);
    p.rect(1, 0, w - 2, h, color);
    p.rect(0, 1, w, h - 1, color);
    // paper grain and the fold shadow at the bottom (where it goes under the page)
    for (let y = 1; y < h; y++) for (let x = 1; x < w - 1; x++) if (hash2(x * 5 + w, y * 7) > 0.9) p.set(x, y, mix(color, C.white, 0.25));
    p.hline(1, w - 2, 1, mix(color, C.white, 0.45));
    if (!active) for (let x = 0; x < w; x++) p.set(x, h - 2, mix(color, C.ink, 0.25));
    // outline (open at the bottom)
    p.hline(1, w - 2, 0, C.ink);
    p.vline(0, 1, h - 1, C.ink);
    p.vline(w - 1, 1, h - 1, C.ink);
    p.set(0, 0, 'transparent');
    p.set(w - 1, 0, 'transparent');
    return p.toCanvas();
  });
}

// ---------------------------------------------------------------------------
// the hanko cursor and ink

const HANKO = [
  '..hhhh..',
  '.hHHHHh.',
  '.hHHHHd.',
  '..HHHd..',
  '..hHHd..',
  '..hHHd..',
  '.kkkkkk.',
  'rRRRRRRr',
  'rRRRRRRr',
  '.rrrrrr.',
];

/** The vermilion hanko cursor (8×10 + outline). `pressed` sinks the handle 1 px. */
export function hankoArt(pressed = false): HTMLCanvasElement {
  return cached(`hanko${pressed}`, () => {
    const p = new PixelCanvas(10, 12);
    const rows = pressed ? ['........', ...HANKO.slice(0, 6), ...HANKO.slice(7)] : HANKO;
    p.art(rows, { h: '#E6C58E', H: C.woodLight, d: C.wood, k: C.woodDark, r: C.shuDark, R: C.shu }, 1, 1);
    p.set(3, 8 + (pressed ? 0 : 1), C.shuLight);
    p.outline(C.ink);
    return p.toCanvas();
  });
}

/**
 * A round ink stamp (13×13) left on the page: 'note' for a playing song,
 * 'wave' for a running ambience, 'check' for a fired cue step. Slightly
 * worn (かすれ) so it reads as ink, not a UI icon.
 */
export function stampArt(kind: 'note' | 'wave' | 'check', color = C.shu): HTMLCanvasElement {
  return cached(`stamp${kind}${color}`, () => {
    const p = new PixelCanvas(13, 13);
    p.ring(6.5, 6.5, 6.5, 6.5, color);
    p.ring(6.5, 6.5, 5.5, 5.5, color);
    const icon: Record<string, string[]> = {
      note: ['....##.', '....#.#', '....#..', '....#..', '.###...', '####...', '.##....'],
      wave: ['.......', '.......', '.##..#.', '#..##.#', '.......', '.......', '.......'],
      check: ['.......', '......#', '.....#.', '#...#..', '.#.#...', '..#....', '.......'],
    };
    p.art(icon[kind], { '#': color }, 3, 3);
    // wear
    for (let i = 0; i < 13 * 13; i++) {
      const x = i % 13;
      const y = Math.floor(i / 13);
      if (p.alpha(x, y) && hash2(x * 9 + kind.length, y * 5) > 0.84) p.set(x, y, 'transparent');
    }
    return p.toCanvas();
  });
}

/** A keyboard key cap (11×11) with a 5×7 label, for the hint line. */
export function keyArt(label: string): HTMLCanvasElement {
  return cached(`key${label}`, () => {
    const w = Math.max(11, label.length * 6 + 5);
    const c = document.createElement('canvas');
    c.width = w;
    c.height = 12;
    const p = new PixelCanvas(w, 12);
    p.rect(1, 0, w - 2, 11, C.concrete);
    p.rect(0, 1, w, 10, C.concrete);
    p.rect(1, 1, w - 2, 8, C.white);
    p.hline(2, w - 3, 1, '#FFFFFF');
    p.strokeRect(0, 0, w, 11, C.ink);
    p.set(0, 0, 'transparent');
    p.set(w - 1, 0, 'transparent');
    p.set(0, 10, 'transparent');
    p.set(w - 1, 10, 'transparent');
    p.hline(1, w - 2, 11, mix(C.ink, C.woodDark, 0.5) + '80');
    const ctx = c.getContext('2d')!;
    ctx.drawImage(p.toCanvas(), 0, 0);
    f5(ctx, label, Math.floor((w - (label.length * 6 - 1)) / 2), 2, C.ink);
    return c;
  });
}

/** A yellow pencil lying on the desk (decoration), 44×7. */
export function pencilArt(): HTMLCanvasElement {
  return cached('pencil', () => {
    const p = new PixelCanvas(46, 8);
    // eraser + ferrule
    p.rect(1, 2, 4, 4, C.margin);
    p.hline(1, 4, 2, '#F09AB0');
    p.rect(5, 2, 3, 4, C.steel);
    p.vline(6, 2, 5, C.white);
    // hexagonal body in three faces
    p.rect(8, 2, 28, 1, '#FFE7A3');
    p.rect(8, 3, 28, 2, '#FFD23F');
    p.rect(8, 5, 28, 1, C.gold);
    // print on the body
    for (let x = 14; x < 26; x += 3) p.set(x, 4, C.woodDark);
    // sharpened wood cone and lead
    p.poly(
      [
        [36, 2],
        [42, 3],
        [42, 4],
        [36, 5],
      ],
      '#E6C58E',
    );
    p.set(36, 5, C.woodLight);
    p.rect(42, 3, 2, 2, C.ink);
    p.set(44, 3, '#3A3F48');
    p.outline(C.ink);
    // a soft cast shadow below
    const s = new PixelCanvas(46, 8);
    for (let x = 3; x < 44; x++) s.set(x, 7, '#1B173380');
    s.blit(p, 0, 0);
    return s.toCanvas();
  });
}

/** The same pencil standing on its end (lying along the page's right edge). */
export function pencilArtV(): HTMLCanvasElement {
  return cached('pencilV', () => {
    const src = pencilArt();
    const c = document.createElement('canvas');
    c.width = src.height;
    c.height = src.width;
    const ctx = c.getContext('2d')!;
    ctx.translate(src.height, 0);
    ctx.rotate(Math.PI / 2);
    ctx.drawImage(src, 0, 0);
    return c;
  });
}

/** A small spectrum bar in coloured pencil (hatched), cached per height. */
export function pencilBar(h: number, color: string): HTMLCanvasElement {
  return cached(`pbar${h}${color}`, () => {
    const p = new PixelCanvas(5, Math.max(1, h));
    for (let y = 0; y < h; y++)
      for (let x = 0; x < 5; x++) {
        const hatch = (x + y) % 3 !== 0;
        p.set(x, y, hatch ? color : mix(color, C.paper, 0.55));
      }
    for (let x = 0; x < 5; x++) p.set(x, 0, mix(color, C.ink, 0.35));
    return p.toCanvas();
  });
}
