// Effect sprites: bug net, projectiles, particles-with-shapes, the hanko
// close-up, the "!" tsukkomi bubble, flip board, crow, balloons, arrows.

import type { Gfx } from '../../engine/gfx';
import { drawText, measure } from '../../engine/font';
import { makeCanvas, PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';

const P: Record<string, string> = {
  k: '#2A2440', w: '#F4F1E8', W: '#FFFFFF', d: '#C8C2B4', r: '#E23B2E', R: '#B8241E', l: '#FF6A4D',
  y: '#C8A06A', Y: '#E8C890', b: '#9A7448', B: '#6A4A2A', g: '#9AA0A8', G: '#6B7186', n: '#2F4A8A',
  p: '#E0567A', P: '#A83A5A', o: '#D9A441', O: '#FFD23F', h: '#A8742A', H: '#FFF6D8', s: '#F2894B',
  S: '#C8643A', t: '#F7C27A', c: '#CFE3EA', C: '#7FD1E8', e: '#E8F4F8', u: '#4AA8E0', U: '#2F7AB0',
  m: '#C08040', M: '#E8B070', a: '#8A5A2A', A: '#6A4020', x: '#3A2B24', v: '#8A5FB0', q: '#5B4A7A',
};

const cache = new Map<string, HTMLCanvasElement>();
function spr(key: string, rows: string[]): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = PixelCanvas.fromArt(rows, P).toCanvas();
    cache.set(key, c);
  }
  return c;
}

// ---- bug net (drawn procedurally at any angle) ------------------------------------

/**
 * Draw the bug net. (px, py) = the hand (pivot); angle = pole direction
 * (radians, 0 = right). Hoop centre ends up `len` px from the pivot.
 */
export function drawNet(g: Gfx, px: number, py: number, angle: number, o: { alpha?: number; len?: number; ghost?: boolean; mesh?: number } = {}): void {
  const len = o.len ?? 52;
  const ca = Math.cos(angle);
  const sa = Math.sin(angle);
  const hx = px + ca * len;
  const hy = py + sa * len;
  const ctx = g.ctx;
  const prevA = ctx.globalAlpha;
  ctx.globalAlpha = prevA * (o.alpha ?? 1);
  if (o.ghost) {
    // smear: a pale arc where the hoop swept through
    for (let i = 0; i < 3; i++) g.circle(hx, hy, 9 - i, i === 0 ? '#FFF6D8' : '#F4F1E8');
    ctx.globalAlpha = prevA;
    return;
  }
  // net bag trailing behind the hoop (dither); `mesh` thins bag + mesh after a
  // hit so the enemy's white flash and the paper bits show through
  const meshA = o.mesh ?? 1;
  ctx.globalAlpha = prevA * (o.alpha ?? 1) * meshA;
  const bx = hx - ca * 7 + sa * 3;
  const by = hy - sa * 7 - ca * 3 + 4;
  for (let yy = -8; yy <= 8; yy++)
    for (let xx = -8; xx <= 8; xx++) {
      const d1 = (xx * xx + yy * yy) / 64;
      if (d1 > 1) continue;
      const X = Math.round(bx + xx);
      const Y = Math.round(by + yy);
      if (((X + Y) & 1) === 0) g.px(X, Y, d1 > 0.7 ? '#C8C2B4' : '#F4F1E8');
    }
  ctx.globalAlpha = prevA * (o.alpha ?? 1);
  // pole: 2px with dark lower edge
  const x2 = px + ca * (len - 9);
  const y2 = py + sa * (len - 9);
  g.line(px + sa, py - ca, x2 + sa, y2 - ca, '#2A2440');
  g.line(px - sa * 2, py + ca * 2, x2 - sa * 2, y2 + ca * 2, '#2A2440');
  g.line(px, py, x2, y2, '#E8C890');
  g.line(px - sa, py + ca, x2 - sa, y2 + ca, '#9A7448');
  // hoop ring (outlined)
  g.ring(hx, hy, 10, '#2A2440');
  g.ring(hx, hy, 8, '#2A2440');
  g.ring(hx, hy, 9, '#F4F1E8');
  // net mesh inside hoop
  ctx.globalAlpha = prevA * (o.alpha ?? 1) * meshA;
  for (let yy = -7; yy <= 7; yy++)
    for (let xx = -7; xx <= 7; xx++) {
      if (xx * xx + yy * yy > 49) continue;
      const X = Math.round(hx + xx);
      const Y = Math.round(hy + yy);
      if ((X + Y) % 3 === 0 || (X - Y) % 3 === 0) g.px(X, Y, '#E8E4D8');
    }
  g.px(Math.round(hx - 6), Math.round(hy - 5), '#FFFFFF');
  ctx.globalAlpha = prevA;
}

// ---- impact burst on a panel (16.7) -------------------------------------------

const burstCache: HTMLCanvasElement[] = [];
/**
 * 12px impact star over a status panel's photo: frame 0 white-hot, 1 white
 * with a vermilion rim, 2 vermilion, 3 a thin broken vermilion ring.
 */
export function impactBurst(frame: number): HTMLCanvasElement {
  const f = Math.max(0, Math.min(3, frame));
  if (burstCache[f]) return burstCache[f];
  const S = 21;
  const c = S >> 1;
  const p = new PixelCanvas(S, S);
  const core = ['#FFFFFF', '#FFF6D8', '#FF6A4D', '#E23B2E'][f];
  const rim = ['#FFF6D8', '#E23B2E', '#B8241E', '#B8241E'][f];
  // 8 spikes, long on the axes, shorter on the diagonals
  for (let a = 0; a < 8; a++) {
    const ang = (a / 8) * Math.PI * 2 + (f % 2 ? 0.2 : 0);
    const len = (a % 2 ? 6 : 9) - (f === 3 ? 2 : 0);
    for (let r = f === 3 ? 4 : 0; r <= len; r++) {
      const x = Math.round(c + Math.cos(ang) * r);
      const y = Math.round(c + Math.sin(ang) * r);
      p.set(x, y, r > len - 2 ? rim : core);
      if (r < len - 3 && f < 3) {
        p.set(x + 1, y, core);
        p.set(x, y + 1, core);
      }
    }
  }
  if (f < 3) {
    for (let y = -3; y <= 3; y++) for (let x = -3; x <= 3; x++) if (x * x + y * y <= 9) p.set(c + x, c + y, f === 2 ? '#FF6A4D' : '#FFFFFF');
  }
  p.outline('#2A2440');
  burstCache[f] = p.toCanvas();
  return burstCache[f];
}

// ---- small sprites ---------------------------------------------------------

export const meishiCard = () => spr('card', ['kkkkkkkkkk', 'kwwwwwwwdk', 'kwnnnnnwdk', 'kwwwwwwwdk', 'kwgggwwwdk', 'kddddddddk', 'kkkkkkkkkk']);

/**
 * Spinning ten-yen coin (9×9): the copper face with its raised rim and a
 * glint, three-quarter, edge-on (a lit sliver) and the back three-quarter.
 */
export function coin(frame: number): HTMLCanvasElement {
  const f = ((frame % 4) + 4) % 4;
  const rows = [
    ['..kkkkk..', '.kMMMmmk.', 'kMHmmmmak', 'kMmaaamak', 'kMmaMamak', 'kmmaaamak', 'kmmmmmaAk', '.kaaaaAk.', '..kkkkk..'],
    ['...kkk...', '..kMmmk..', '.kMHmmak.', '.kMmamak.', '.kMmamak.', '.kmmmmak.', '.kmmmaAk.', '..kaaAk..', '...kkk...'],
    ['....k....', '...kHk...', '...kMk...', '...kMk...', '...kmk...', '...kmk...', '...kak...', '...kAk...', '....k....'],
    ['...kkk...', '..kmmMk..', '.kammmMk.', '.kamammk.', '.kamammk.', '.kammmmk.', '.kAammmk.', '..kAaak..', '...kkk...'],
  ];
  return spr('coin9' + f, rows[f]);
}

const shinyCoins: HTMLCanvasElement[] = [];
/**
 * The same coin as a thrown projectile: brighter copper, a white glint and a
 * 1px paper-white rim outside the ink line, so it never melts into a
 * background that is itself full of coins (bg_ojigi).
 */
export function coinShiny(frame: number): HTMLCanvasElement {
  const f = ((frame % 4) + 4) % 4;
  if (shinyCoins[f]) return shinyCoins[f];
  const base = coin(f);
  const pal: Record<string, string> = { ...P, M: '#FFD08A', m: '#F0A060', a: '#B87038', A: '#8A4A20', H: '#FFFFFF' };
  const rows = [
    ['..kkkkk..', '.kMMMmmk.', 'kMHmmmmak', 'kMmaaamak', 'kMmaMamak', 'kmmaaamak', 'kmmmmmaAk', '.kaaaaAk.', '..kkkkk..'],
    ['...kkk...', '..kMmmk..', '.kMHmmak.', '.kMmamak.', '.kMmamak.', '.kmmmmak.', '.kmmmaAk.', '..kaaAk..', '...kkk...'],
    ['....k....', '...kHk...', '...kMk...', '...kMk...', '...kmk...', '...kmk...', '...kak...', '...kAk...', '....k....'],
    ['...kkk...', '..kmmMk..', '.kammmMk.', '.kamammk.', '.kamammk.', '.kammmmk.', '.kAammmk.', '..kAaak..', '...kkk...'],
  ][f];
  // a paper-white rim outside the ink line: a thrown coin always reads in
  // front of the (dimmed) coin lattice of bg_ojigi
  const p = new PixelCanvas(base.width + 2, base.height + 2);
  p.blit(PixelCanvas.fromArt(rows, pal), 1, 1);
  p.outline('#FFF6D8');
  shinyCoins[f] = p.toCanvas();
  return shinyCoins[f];
}

export const waterDrop = () => spr('drop', ['.k.', 'kWk', 'kck', 'kck', '.k.']);
export const sweatDrop = () => spr('sweat', ['.C.', 'CeC', 'CeC', '.C.']);
export const feather = () => spr('feather', ['.kk.', 'kddk', '.kk.']);
export const heart = () => spr('heart', ['.p.p.', 'pqpqp', 'ppppp', '.ppp.', '..p..'].map((r) => r.replace(/q/g, 'W')));
export const note = (i: number) =>
  spr('note' + i, i === 0 ? ['..kk.', '..kOk', '..k.k', '..k..', 'kkk..', 'kOk..', 'kkk..'] : ['.kkkk', '.kOOk', '.k..k', '.k..k', 'kk.kk', 'Ok.Ok', 'kk.kk']);
const noteCache2 = new Map<number, HTMLCanvasElement>();
/**
 * Coloured music notes for the singing boke (ノリツッコミ): an eighth note, a
 * beamed pair and a quarter note, each in its own warm colour with a white
 * glint on the head and an ink outline.
 */
export function musicNote(i: number): HTMLCanvasElement {
  const k = ((i % 6) + 6) % 6;
  let c = noteCache2.get(k);
  if (c) return c;
  const shapes = [
    ['..cc..', '..c.c.', '..c..c', '..c...', '..c...', '..c...', 'ccc...', 'cHcc..', 'cccc..', '.cc...'],
    ['.cccccc', '.cccccc', '.c....c', '.c....c', '.c....c', '.c....c', 'cc...cc', 'Hcc.Hcc', 'ccc.ccc', '.c...c.'],
    ['...c.', '...c.', '...c.', '...c.', '...c.', '...c.', '.ccc.', 'cHccc', 'ccccc', '.ccc.'],
  ];
  const cols = ['#FFD23F', '#FF6A4D', '#7FD1E8', '#F7C27A', '#E0567A', '#9BCB6B'];
  const rows = shapes[k % 3];
  const p = new PixelCanvas(rows[0].length + 2, rows.length + 2);
  p.blit(PixelCanvas.fromArt(rows, { c: cols[k], H: '#FFF6D8' }), 1, 1);
  p.outline('#2A2440');
  c = p.toCanvas();
  noteCache2.set(k, c);
  return c;
}

export const spring = () => spr('spring', ['.g.', 'g.g', '.g.', 'g.g', '.g.']);
export const petal = (i: number) => {
  const cols = ['l', 't', 'H', 'p'];
  const c = cols[i % 4];
  return spr('petal' + i, [`.${c}${c}.`, `${c}${c}${c}${c}`, `.${c}${c}.`]);
};

/** Balloon 10×12 with string, two tones. */
export function balloon(alt: boolean): HTMLCanvasElement {
  const a = alt ? 't' : 's';
  const b = alt ? 'o' : 'S';
  return spr('balloon' + alt, [
    '...kkkk...',
    '..k' + a + a + a + a + 'k..',
    '.k' + a + 'W' + a + a + a + a + 'k.',
    'k' + a + 'W' + a + a + a + a + a + b + 'k',
    'k' + a + a + a + a + a + a + a + b + 'k',
    'k' + a + a + a + a + a + a + b + b + 'k',
    '.k' + a + a + a + a + b + b + 'k.',
    '..k' + b + b + b + b + 'k..',
    '...kk' + b + 'k...',
    '.....kk...',
    '....w.....',
    '.....w....',
  ]);
}
export const poppedBalloon = () => spr('popped', ['.kk..', 'kSSk.', '.kSk.', '..kw.', '...w.']);

const CROW_ROWS: string[][] = [
  // wings up (swept back over the body)
  [
    '..............kk........',
    '.............kkh........',
    '............kkhh........',
    '...........kkhhk........',
    '..........kkhhk.........',
    '.........kkhhk..........',
    '...kkk..kkhkk...........',
    '..kkkkkkkkkkkk..........',
    'bbkekkkkkkkkkkkkk.......',
    '..kkkkkkkkkkkkkkkkkk.kk.',
    '....kkkkkkkkkkkkkkkkkkk.',
    '......kkkkkkkk....kkkk..',
    '........................',
    '........................',
  ],
  // wings level
  [
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '...kkk..................',
    '..kkkkkkk...............',
    'bbkekkkkkhhhhhhhhkkk....',
    '..kkkkkkkkkkkkkkkkkkk.kk',
    '....kkkkkkkkkkkkkkkkkkkk',
    '......kkkkkkkk....kkkkk.',
    '.........kk.............',
    '........................',
    '........................',
  ],
  // wings down
  [
    '........................',
    '........................',
    '........................',
    '........................',
    '...kkk..................',
    '..kkkkkk................',
    'bbkekkkkkkkkkkk.........',
    '..kkkkkkkkkkkkkkkkkk.kk.',
    '....kkkkkkkkkkkkkkkkkkk.',
    '......kkhhkkkkk...kkkk..',
    '.......khhhkkk..........',
    '........khhkk...........',
    '.........khk............',
    '..........kk............',
  ],
];

const litCrows: HTMLCanvasElement[] = [];
/**
 * The crow of the かねを鳴らす flop (24×14 + rim): a side-on silhouette
 * flying left, beak first, in three wingbeats (up, level, down, level). The
 * body is the ink colour; the sunset behind it catches every upper edge in a
 * pale-gold rim (#F4E6A8) and the rest gets a violet edge, so it reads on
 * the bright sunset and on the dark mall ceiling (#2A2440) alike.
 */
export function crowLit(frame: number): HTMLCanvasElement {
  const f = [0, 1, 2, 1][((frame % 4) + 4) % 4];
  if (litCrows[f]) return litCrows[f];
  const rows = CROW_ROWS[f];
  const W = rows[0].length + 2;
  const H = rows.length + 2;
  const p = new PixelCanvas(W, H);
  p.blit(PixelCanvas.fromArt(rows, { k: '#2A2440', h: '#4A3A6E', b: '#8A809A', e: '#F4E6A8' }), 1, 1);
  const body = (x: number, y: number) => p.inside(x, y) && p.alpha(x, y) > 0;
  const rim: [number, number, string][] = [];
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (body(x, y)) continue;
      const below = body(x, y + 1);
      if (below || body(x - 1, y) || body(x + 1, y) || body(x, y - 1)) rim.push([x, y, below ? '#F4E6A8' : '#6B5A8A']);
    }
  for (const [x, y, c] of rim) p.set(x, y, c);
  litCrows[f] = p.toCanvas();
  return litCrows[f];
}

/** Red up / blue down arrow 5×7. */
export function statArrow(up: boolean): HTMLCanvasElement {
  return up
    ? spr('arrUp', ['..r..', '.rrr.', 'rrrrr', '.rrr.', '.rrr.', '.rrr.', '.rrr.'].map((r) => r.replace(/r/g, 'e')))
    : spr('arrDn', ['.uuu.', '.uuu.', '.uuu.', '.uuu.', 'uuuuu', '.uuu.', '..u..']);
}
P.e = '#E84E3C';

/** "!" tsukkomi bubble 16×20 (vermilion balloon, white mark). */
export function bangBubble(pulse = false): HTMLCanvasElement {
  const r = pulse ? 'l' : 'r';
  return spr('bang' + pulse, [
    '..kkkkkkkkkk....',
    '.k' + r + r + r + r + r + r + r + r + r + r + 'k...',
    'k' + r + r + r + r + 'WW' + r + r + r + r + r + 'k..',
    'k' + r + r + r + 'WWWW' + r + r + r + r + 'k..',
    'k' + r + r + r + 'WWWW' + r + r + r + 'Rk..',
    'k' + r + r + r + 'WWWW' + r + r + r + 'Rk..',
    'k' + r + r + r + 'WWWW' + r + r + r + 'Rk..',
    'k' + r + r + r + r + 'WW' + r + r + r + 'Rk..',
    'k' + r + r + r + r + 'WW' + r + r + r + 'Rk..',
    'k' + r + r + r + r + 'WW' + r + r + r + 'Rk..',
    'k' + r + r + r + r + r + r + r + r + 'RRk..',
    'k' + r + r + r + r + 'WW' + r + r + 'RRk..',
    'k' + r + r + r + r + 'WW' + r + r + 'RRk..',
    '.kRRRRRRRRRk....',
    '..kkkkRRkkk.....',
    '......kRk.......',
    '.......kk.......',
    '................',
    '................',
    '................',
  ].map((row) => row.padEnd(16, '.').slice(0, 16)));
}

// ---- hanko close-up (48×56) ------------------------------------------------------

const hankoCache = new Map<number, HTMLCanvasElement>();
/** Wooden hanko close-up; `squash` 0..3 compresses the handle (charging). */
export function hankoCloseup(squash: number): HTMLCanvasElement {
  let c = hankoCache.get(squash);
  if (c) return c;
  const p = new PixelCanvas(48, 58);
  const hTop = 2 + squash;
  // handle: rounded knob + neck (turned wood)
  const wood = ['#6A4A2A', '#9A7448', '#C8A06A', '#E0BE88', '#F2D8A8'];
  const knob = { cx: 24, cy: hTop + 9, r: 10 };
  for (let y = hTop; y < 44; y++)
    for (let x = 6; x < 42; x++) {
      let inside = false;
      let nx = 0;
      if ((x + 0.5 - knob.cx) ** 2 / 110 + (y + 0.5 - knob.cy) ** 2 / 90 <= 1) {
        inside = true;
        nx = (x + 0.5 - knob.cx) / 10.5;
      } else if (y >= knob.cy && y < 30 && Math.abs(x + 0.5 - 24) <= 6 + (y - knob.cy) * 0.08) {
        inside = true;
        nx = (x + 0.5 - 24) / 7;
      } else if (y >= 30 && y < 44 && Math.abs(x + 0.5 - 24) <= 12 - (y - 30) * 0.05) {
        inside = true;
        nx = (x + 0.5 - 24) / 12;
      }
      if (!inside) continue;
      let v = 0.62 - nx * 0.45 + (hash2(x, y >> 1, 3) - 0.5) * 0.08;
      // wood grain lines
      if (Math.abs(Math.sin((y + x * 0.2) * 0.9)) < 0.12) v -= 0.15;
      const t = [0, 4, 8, 12][(x + y) & 3] / 16 - 0.25;
      const idx = Math.max(0, Math.min(4, Math.floor(v * 5 + t * 0.5)));
      p.set(x, y, wood[idx]);
    }
  // collar ring between neck and base
  p.hline(12, 35, 30, '#6A4A2A');
  p.hline(13, 34, 31, '#E0BE88');
  // base: vermilion-inked rubber face seen from the side
  p.rect(10, 44, 28, 4, '#C8A06A');
  p.hline(10, 37, 44, '#E0BE88');
  p.rect(10, 48, 28, 6, '#E23B2E');
  p.hline(10, 37, 48, '#FF6A4D');
  p.hline(10, 37, 53, '#B8241E');
  p.set(12, 50, '#FF6A4D');
  p.set(20, 51, '#FF6A4D');
  p.outline('#2A2440');
  // left rim light
  for (let y = 0; y < 58; y++)
    for (let x = 1; x < 47; x++) {
      const v = p.get(x, y);
      const l = p.get(x - 1, y);
      if (v >>> 24 && l >>> 24 && (p.get(x - 2, y) >>> 24) === 0) {
        if (y < 44) p.set(x, y, '#F2A060');
      }
    }
  c = p.toCanvas();
  hankoCache.set(squash, c);
  return c;
}

// ---- flip board (カネナリくんのフリップ) -------------------------------------------

/** White marker board with 1–2 lines of text (for flip tsukkomi). */
export function flipBoardText(text: string): HTMLCanvasElement {
  const key = 'flip:' + text;
  let c = cache.get(key);
  if (c) return c;
  const lines = text.split('\n');
  const tw = Math.max(...lines.map((l) => measure(l)));
  const w = tw + 20;
  const h = lines.length * 18 + 14;
  const [cv, ctx] = makeCanvas(w + 2, h + 10);
  const r = (x: number, y: number, ww: number, hh: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
  };
  r(2, 2, w, h, '#5B4A7A');
  r(0, 0, w, h, '#2A2440');
  r(1, 1, w - 2, h - 2, '#F4F1E8');
  r(1, h - 3, w - 2, 2, '#C8C2B4');
  r(2, 1, w - 4, 1, '#FFFFFF');
  lines.forEach((l, i) => drawText(ctx, l, 10, 7 + i * 18, { color: '#2A2440' }));
  // mitten hands holding the board
  r(4, h - 4, 8, 6, '#2A2440');
  r(5, h - 3, 6, 4, '#F2894B');
  r(w - 12, h - 4, 8, 6, '#2A2440');
  r(w - 11, h - 3, 6, 4, '#F2894B');
  r(5, h - 3, 2, 1, '#F7A86A');
  r(w - 11, h - 3, 2, 1, '#F7A86A');
  cache.set(key, cv);
  return cv;
}

/**
 * The flip board Kanenari-kun holds up for the ノリツッコミ boke: a white
 * marker board with a binder clip, a pale ruled line under each line of
 * marker text and a soft shadow; his two mittens grip it by the side edges
 * (half over the board, thumbs on the front), so it reads as held up, not
 * stood on the floor. The board itself starts 6px in from the canvas' left.
 */
export function noriBoard(lines: string[]): HTMLCanvasElement {
  const key = 'nori:' + lines.join('/');
  let c = cache.get(key);
  if (c) return c;
  const tw = Math.max(...lines.map((l) => measure(l)));
  const w = tw + 18;
  const h = lines.length * 16 + 6;
  const L = 6;
  const [cv, ctx] = makeCanvas(w + L * 2 + 2, h + 6);
  const r = (x: number, y: number, ww: number, hh: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
  };
  r(L + 2, 5, w, h, '#5B4A7A');
  r(L, 3, w, h, '#2A2440');
  r(L + 1, 4, w - 2, h - 2, '#F4F1E8');
  r(L + 1, h, w - 2, 1, '#C8C2B4');
  r(L + 2, 4, w - 4, 1, '#FFFFFF');
  for (let i = 0; i < lines.length; i++) r(L + 5, 4 + 3 + i * 16 + 15, w - 10, 1, '#DCE6EC');
  lines.forEach((l, i) => drawText(ctx, l, L + 9, 4 + 3 + i * 16 - 1, { color: '#2A2440' }));
  // binder clip at the top centre
  const cx = L + Math.round(w / 2);
  r(cx - 5, 0, 10, 5, '#2A2440');
  r(cx - 4, 1, 8, 3, '#9AA0A8');
  r(cx - 4, 1, 8, 1, '#E8ECF0');
  // mittens gripping the side edges, a little below the middle
  const my = 3 + Math.round(h / 2) - 1;
  for (const [mx, thumb] of [[0, 8], [L + w - 4, 0]] as [number, number][]) {
    r(mx, my, 10, 9, '#2A2440');
    r(mx + 1, my + 1, 8, 7, '#F2894B');
    r(mx + 1, my + 1, 4, 1, '#F7A86A');
    r(mx + 1, my + 1, 1, 3, '#F7A86A');
    r(mx + 1, my + 7, 8, 1, '#C8643A');
    // the thumb on the front of the board
    r(mx + thumb - (thumb ? 1 : -1), my - 2, 3, 3, '#2A2440');
    r(mx + thumb - (thumb ? 0 : -2), my - 1, 1, 2, '#F2894B');
  }
  cache.set(key, cv);
  return cv;
}

// ---- boss / enemy projectiles ------------------------------------------------------

export function glove(red: boolean): HTMLCanvasElement {
  const a = red ? 'e' : 'C';
  const b = red ? 'R' : 'u';
  return spr('glove' + red, [
    '..kk.kk.kk..',
    '.k' + a + a + 'k' + a + a + 'k' + a + a + 'k.',
    '.k' + a + a + 'k' + a + a + 'k' + a + a + 'k.',
    'kk' + a + a + a + a + a + a + a + a + 'k.',
    'k' + a + 'k' + a + a + a + a + a + a + b + 'k.',
    'k' + a + a + a + a + a + a + a + a + b + 'k.',
    '.k' + a + a + a + a + a + a + b + b + 'k.',
    '.k' + a + a + a + a + a + b + b + b + 'k.',
    '..kwwwwwwwk..',
    '..kkkkkkkkk..',
  ].map((r) => r.padEnd(12, '.').slice(0, 12)));
}

export function uwabaki(): HTMLCanvasElement {
  return spr('uwabaki', [
    '.......kkkkkk...',
    '.....kkwwwwwwk..',
    '...kkwwwwwwwwwk.',
    '..kwwwwwwwwwwwdk',
    '.knnwwwwwwwwwwdk',
    'knnnwwwwwwwwwddk',
    'knnnnwwwwwwwwddk',
    'kkkkkkkkkkkkkkkk',
    '.kgggggggggggggk',
    '..kkkkkkkkkkkkk.',
  ]);
}

/** Speaker ring / sound arc helper. */
export function drawArc(g: Gfx, cx: number, cy: number, r: number, a0: number, a1: number, color: string): void {
  const n = Math.max(6, Math.ceil(r * Math.abs(a1 - a0) * 1.2));
  for (let i = 0; i <= n; i++) {
    const a = a0 + ((a1 - a0) * i) / n;
    g.px(Math.round(cx + Math.cos(a) * r), Math.round(cy + Math.sin(a) * r), color);
  }
}

/** Thick polyline (for the red-pen arrow). */
export function thickLine(g: Gfx, x0: number, y0: number, x1: number, y1: number, w: number, color: string): void {
  if (w <= 1) {
    g.line(x0, y0, x1, y1, color);
    return;
  }
  const n = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0)));
  for (let i = 0; i <= n; i++) {
    const x = x0 + ((x1 - x0) * i) / n;
    const y = y0 + ((y1 - y0) * i) / n;
    g.rect(Math.round(x - w / 2), Math.round(y - w / 2), w, w, color);
  }
}

const letterCache = new Map<string, HTMLCanvasElement>();
/**
 * Quiet manga sound lettering (「カア」): paper-white glyphs with a slate
 * inner edge and an ink outline, so it reads on the sunset and in the dark.
 */
export function mangaLettering(text: string): HTMLCanvasElement {
  let c = letterCache.get(text);
  if (c) return c;
  const w = measure(text) + 6;
  const [cv, ctx] = makeCanvas(w, 24);
  const ink = '#2A2440';
  const edge = '#6B7186';
  const passes: [number, number, string][] = [
    [-2, 0, ink], [2, 0, ink], [0, -2, ink], [0, 2, ink], [-1, -1, ink], [1, 1, ink], [1, -1, ink], [-1, 1, ink],
    [-1, 0, edge], [1, 0, edge], [0, -1, edge], [0, 1, edge], [0, 0, '#F4F1E8'],
  ];
  for (const [dx, dy, col] of passes) drawText(ctx, text, 3 + dx, 4 + dy, { color: col });
  c = cv;
  letterCache.set(text, c);
  return c;
}

// ---- hit impact (16.2, QA round 1) ----------------------------------------------------

const splashCache = new Map<string, HTMLCanvasElement>();

/**
 * The impact itself, drawn over the enemy for the first 2–3 frames of the
 * hitstop so the moment of contact reads as a shape and not only a number:
 * an irregular vermilion ink starburst `size` px across. Frame 0 is the full
 * splat with a white-hot heart (it reads on the enemy's white flash), frame 1
 * bursts open into a ring with a hot inner rim, frame 2 leaves the broken
 * tips. `lines` adds a crown of radial speed lines (いい音,
 * 会心) that fly outward with the frames. Every frame has an ink outline, so
 * it reads on the bright sunset as well as on the boss's shadow body.
 */
export function hitSplash(size: number, frame: number, lines = false, seed = 1): HTMLCanvasElement {
  const f = Math.max(0, Math.min(2, frame));
  const key = `${size}:${f}:${lines}:${seed}`;
  let cv = splashCache.get(key);
  if (cv) return cv;
  const R = size / 2;
  const S = Math.ceil(lines ? size * 1.75 : size + 4) | 1;
  const c = (S - 1) / 2;
  const p = new PixelCanvas(S, S);
  const n = 9;
  const rot = hash2(seed, 3, 17) * Math.PI;
  const pts: [number, number][] = [];
  for (let i = 0; i < n * 2; i++) {
    const a = rot + (i / (n * 2)) * Math.PI * 2;
    const tip = i % 2 === 0;
    const h = hash2(i, seed, 29);
    const r = tip ? R * (0.66 + 0.34 * h) : R * (0.3 + 0.12 * h);
    pts.push([c + Math.cos(a) * r, c + Math.sin(a) * r]);
  }
  const inside = (x: number, y: number) => {
    let ins = false;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const [xi, yi] = pts[i];
      const [xj, yj] = pts[j];
      if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) ins = !ins;
    }
    return ins;
  };
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      if (!inside(px, py)) continue;
      const d = Math.hypot(px - c - 0.5, py - c - 0.5) / R;
      // lit from the upper left: the spikes on that side catch a lighter ink
      const lit = px + py < S * 0.9;
      if (f === 0) p.set(x, y, d < 0.22 ? '#FFFFFF' : d < 0.36 ? '#FFF6D8' : d < 0.46 ? '#FFD23F' : lit ? '#FF6A4D' : '#E23B2E');
      else if (f === 1) {
        if (d < 0.46) continue;
        p.set(x, y, d < 0.56 ? '#FFF6D8' : d > 0.86 ? '#B8241E' : lit ? '#FF6A4D' : '#E23B2E');
      } else if (d > 0.72) p.set(x, y, d > 0.9 ? '#8E1E1A' : '#B8241E');
    }
  if (lines) {
    // speed lines: 12 spokes between the tips, moving out frame by frame
    const r0 = R * (1.02 + 0.22 * f);
    const r1 = R * (1.42 + 0.3 * f);
    for (let i = 0; i < 12; i++) {
      const a = rot + ((i + 0.5) / 12) * Math.PI * 2;
      const len = r1 - r0 - (i % 3 === 1 ? R * 0.18 : 0);
      for (let k = 0; k <= len; k++) {
        const r = r0 + k;
        const x = Math.round(c + Math.cos(a) * r);
        const y = Math.round(c + Math.sin(a) * r);
        if (x < 0 || y < 0 || x >= S || y >= S) continue;
        const thick = k < len * 0.55 && f < 2;
        const col = f === 2 ? '#E8D9B5' : '#FFF6D8';
        p.set(x, y, col);
        if (thick) p.set(x + (Math.abs(Math.sin(a)) > 0.7 ? 1 : 0), y + (Math.abs(Math.sin(a)) > 0.7 ? 0 : 1), col);
      }
    }
  }
  p.outline('#2A2440');
  cv = p.toCanvas();
  splashCache.set(key, cv);
  return cv;
}

const crackCache = new Map<string, HTMLCanvasElement>();

/**
 * A crack struck into the boss's shadow body where a blow lands (the big
 * enemy needs a mark the size of the hit): five jagged white-hot lines with
 * an ink shadow, `size` px across.
 */
export function hitCrack(size: number, seed = 1): HTMLCanvasElement {
  const key = `${size}:${seed}`;
  let cv = crackCache.get(key);
  if (cv) return cv;
  const S = size | 1;
  const c = (S - 1) / 2;
  const p = new PixelCanvas(S, S);
  const light: [number, number][] = [];
  for (let i = 0; i < 5; i++) {
    let a = (i / 5) * Math.PI * 2 + hash2(i, seed, 5) * 0.8;
    let x = c;
    let y = c;
    const len = c * (0.6 + 0.4 * hash2(i, seed, 7));
    for (let k = 0; k < len; k++) {
      a += (hash2(k, i, seed + 11) - 0.5) * 0.7;
      x += Math.cos(a);
      y += Math.sin(a);
      light.push([Math.round(x), Math.round(y)]);
      // a short branch halfway out
      if (k === Math.round(len * 0.5)) {
        const b = a + (hash2(i, k, seed) > 0.5 ? 0.9 : -0.9);
        for (let m = 1; m < len * 0.35; m++) light.push([Math.round(x + Math.cos(b) * m), Math.round(y + Math.sin(b) * m)]);
      }
    }
  }
  // 2px lines near the heart thinning to 1px, over a dark cut
  const near = (x: number, y: number) => Math.hypot(x - c, y - c) < c * 0.55;
  for (const [x, y] of light) {
    p.set(x + 1, y + 1, '#1B1733');
    if (near(x, y)) p.set(x + 2, y + 1, '#1B1733');
  }
  for (const [x, y] of light) {
    const col = Math.hypot(x - c, y - c) < c * 0.4 ? '#FFFFFF' : '#FFE7A3';
    p.set(x, y, col);
    if (near(x, y)) p.set(x + 1, y, col);
  }
  for (let y = -2; y <= 2; y++) for (let x = -2; x <= 2; x++) if (x * x + y * y <= 4) p.set(Math.round(c + x), Math.round(c + y), '#FFFFFF');
  cv = p.toCanvas();
  crackCache.set(key, cv);
  return cv;
}
