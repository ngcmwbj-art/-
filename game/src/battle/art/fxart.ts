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

// ---- small sprites ---------------------------------------------------------

export const meishiCard = () => spr('card', ['kkkkkkkkkk', 'kwwwwwwwdk', 'kwnnnnnwdk', 'kwwwwwwwdk', 'kwgggwwwdk', 'kddddddddk', 'kkkkkkkkkk']);

export function coin(frame: number): HTMLCanvasElement {
  const f = frame % 4;
  const rows = [
    ['.kkkk.', 'kMmmak', 'kmMmak', 'kmmmak', 'kaaaAk', '.kkkk.'],
    ['..kk..', '.kMak.', '.kmak.', '.kmak.', '.kaAk.', '..kk..'],
    ['...k..', '...k..', '...k..', '...k..', '...k..', '...k..'],
    ['..kk..', '.kmMk.', '.kamk.', '.kamk.', '.kAak.', '..kk..'],
  ];
  return spr('coin' + f, rows[f]);
}

export const waterDrop = () => spr('drop', ['.k.', 'kWk', 'kck', 'kck', '.k.']);
export const sweatDrop = () => spr('sweat', ['.C.', 'CeC', 'CeC', '.C.']);
export const feather = () => spr('feather', ['.kk.', 'kddk', '.kk.']);
export const heart = () => spr('heart', ['.p.p.', 'pqpqp', 'ppppp', '.ppp.', '..p..'].map((r) => r.replace(/q/g, 'W')));
export const note = (i: number) =>
  spr('note' + i, i === 0 ? ['..kk.', '..kOk', '..k.k', '..k..', 'kkk..', 'kOk..', 'kkk..'] : ['.kkkk', '.kOOk', '.k..k', '.k..k', 'kk.kk', 'Ok.Ok', 'kk.kk']);
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

export function crow(frame: number): HTMLCanvasElement {
  return spr('crow' + (frame % 2), frame % 2
    ? ['................', '.......kk.......', '......kkkk......', '..kkkkkkkkkk.k..', 'kkkkkkkkkkkkkk..', '...kkkkkkkkkqq..', '.....kkkkk.kq...', '......k..k......', '................', '................']
    : ['.kk.............', '..kkk...........', '...kkkk.........', '....kkkkkk......', '.....kkkkkkk.kq.', '...kkkkkkkkkkqq.', '..kkkkkkkkk.k...', '.kkk...kk.......', 'kk..............', '................']);
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
