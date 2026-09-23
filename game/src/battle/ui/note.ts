// "夏休みのノート" UI primitives for the battle screen (20_systems_battle.md 15.2):
// graph-paper windows, masking-tape name tags, the little vermilion stamp
// cursor, ink-stamp labels and sticky notes. Everything is pre-rendered into
// cached canvases.

import { drawText, measure } from '../../engine/font';
import type { Gfx } from '../../engine/gfx';
import { hash2 } from '../../engine/rng';
import { makeCanvas, PixelCanvas } from '../../engine/pixel';

export const C = {
  paper: '#FBF3DC',
  grid: '#E8D9B5',
  ink: '#2A2440',
  shadow: '#5B4A7A',
  gray: '#9AA0A8',
  grayDark: '#6B7186',
  shu: '#E23B2E',
  shuDark: '#B8241E',
  shuLight: '#FF6A4D',
  tape: '#F7C27A',
  white: '#F4F1E8',
  flash: '#FFF6D8',
  margin: '#E0567A',
  sticky: '#F6D98A',
  stickyEdge: '#D9A441',
  green: '#5FA85A',
  greenLight: '#9BCB6B',
  greenDark: '#2E6B4A',
  gold: '#FFD23F',
  goldLight: '#FFE7A3',
  gold2: '#D9A441',
  brass: '#A8742A',
  night: '#1B1733',
  darkest: '#0B0B14',
  blue: '#4AA8E0',
  navy: '#2F4A8A',
  purple: '#4A3A6E',
  sun: '#F2894B',
};

export interface NoteStyle {
  border?: string;
  borderW?: 2 | 3;
  paper?: string;
  grid?: boolean;
  /** Red margin line at this x (relative to the window). */
  margin?: number;
  shadow?: boolean;
}

const noteCache = new Map<string, HTMLCanvasElement>();

/** Pre-rendered graph-paper window (includes its drop shadow: size w+2 × h+2). */
export function noteCanvas(w: number, h: number, s: NoteStyle = {}): HTMLCanvasElement {
  const border = s.border ?? C.ink;
  const bw = s.borderW ?? 2;
  const paper = s.paper ?? C.paper;
  const key = `${w}x${h}:${border}:${bw}:${paper}:${s.grid !== false}:${s.margin ?? -1}:${s.shadow !== false}`;
  let c = noteCache.get(key);
  if (c) return c;
  const [cv, ctx] = makeCanvas(w + 2, h + 2);
  const r = (x: number, y: number, ww: number, hh: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
    ctx.globalAlpha = 1;
  };
  if (s.shadow !== false) {
    r(3, 2, w - 2, h, C.shadow, 0.5);
    r(2, 3, 1, h - 2, C.shadow, 0.5);
    r(w + 1, 3, 1, h - 2, C.shadow, 0.5);
  }
  // clear shadow under the window body (so alpha shadow stays only outside)
  ctx.clearRect(0, 0, w, h);
  // border with 1px rounded corners
  r(1, 0, w - 2, h, border);
  r(0, 1, w, h - 2, border);
  // paper
  r(bw, bw, w - bw * 2, h - bw * 2, paper);
  if (bw === 2) {
    // inner corner pixels make the rounded border look even
    r(2, 2, 1, 1, border);
    r(w - 3, 2, 1, 1, border);
    r(2, h - 3, 1, 1, border);
    r(w - 3, h - 3, 1, 1, border);
  }
  if (s.grid !== false) {
    ctx.fillStyle = C.grid;
    for (let x = bw + 8; x < w - bw; x += 8) ctx.fillRect(x, bw, 1, h - bw * 2);
    for (let y = bw + 8; y < h - bw; y += 8) ctx.fillRect(bw, y, w - bw * 2, 1);
    // faint paper fibres
    for (let y = bw; y < h - bw; y++)
      for (let x = bw; x < w - bw; x++) {
        const n = hash2(x, y, 77);
        if (n < 0.012) r(x, y, 1, 1, '#F1E4C4');
        else if (n > 0.994) r(x, y, 1, 1, '#FFFBEE');
      }
    if (bw === 2) {
      r(2, 2, 1, 1, border);
      r(w - 3, 2, 1, 1, border);
      r(2, h - 3, 1, 1, border);
      r(w - 3, h - 3, 1, 1, border);
    }
  }
  if (s.margin !== undefined) r(s.margin, bw, 1, h - bw * 2, C.margin, 0.5);
  noteCache.set(key, cv);
  return cv;
}

export function drawNote(g: Gfx, x: number, y: number, w: number, h: number, s: NoteStyle = {}, alpha = 1): void {
  if (w < 6 || h < 6) return;
  const c = noteCanvas(Math.round(w), Math.round(h), s);
  g.img(c, Math.round(x), Math.round(y), alpha < 1 ? { alpha } : {});
}

// ---- masking tape --------------------------------------------------------

const tapeCache = new Map<string, HTMLCanvasElement>();

/** Masking-tape strip with zig-zag ends (and optional centered text). */
export function tapeCanvas(w: number, h = 18, text = '', color = C.tape, seed = 1): HTMLCanvasElement {
  const key = `${w}x${h}:${text}:${color}:${seed}`;
  let c = tapeCache.get(key);
  if (c) return c;
  const p = new PixelCanvas(w, h);
  const [r, gg, b] = hexRgb(color);
  const col = (k: number) => `#${[r, gg, b].map((v) => clamp255(v * k).toString(16).padStart(2, '0')).join('')}d9`;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      // zig-zag torn ends: 2px teeth
      const zz = [0, 1, 2, 1];
      const lx = w > 8 ? zz[(y + seed) % 4] : 0;
      const rx = w > 8 ? zz[(y + seed + 2) % 4] : 0;
      if (x < lx || x >= w - rx) continue;
      let k = 1;
      if (y === 0) k = 1.07;
      else if (y === h - 1) k = 0.9;
      const n = hash2(x, y, seed);
      if ((x + seed * 3) % 7 === 0 && n < 0.6) k *= 1.04;
      if (n < 0.05) k *= 0.95;
      p.set(x, y, col(k));
    }
  c = p.toCanvas();
  if (text) {
    const ctx = c.getContext('2d')!;
    drawText(ctx, text, Math.round(w / 2), Math.round((h - 16) / 2), { color: C.ink, align: 'center' });
  }
  tapeCache.set(key, c);
  return c;
}

/** Small square tape corner (photo corners on the face, 4×4). */
export function tapeCorner(): HTMLCanvasElement {
  return tapeCanvas(4, 4, '', C.tape, 9);
}

// ---- stamp cursor --------------------------------------------------------

let cursorC: HTMLCanvasElement | null = null;
let cursorDown: HTMLCanvasElement | null = null;

function buildCursor(pressed: boolean): HTMLCanvasElement {
  const pal = { o: C.ink, h: '#E8C890', s: '#C8A06A', d: '#9A7448', r: C.shu, l: C.shuLight, k: C.shuDark };
  const rows = pressed
    ? ['........', '..oooo..', '.ohsdo..', '.ohsdo..', '..ohdo..', '.oooooo.', 'olrrrrko', 'okkkkkko', '.oooooo.', '........']
    : ['..oooo..', '.ohhsdo.', '.ohsddo.', '..ohdo..', '..ohdo..', '.oooooo.', 'olrrrrko', 'orrrrrko', 'okkkkkko', '.oooooo.'];
  const p = PixelCanvas.fromArt(rows, pal);
  return p.toCanvas();
}

/** The little vermilion hanko cursor (8×10). `pressed` sinks it 1px. */
export function cursorStamp(pressed = false): HTMLCanvasElement {
  if (pressed) return (cursorDown ??= buildCursor(true));
  return (cursorC ??= buildCursor(false));
}

// ---- ink-stamp labels ----------------------------------------------------

const labelCache = new Map<string, HTMLCanvasElement>();

/**
 * Ink-stamp label (16.0): the 16px text in a thin stamp frame hugging the ink
 * (1px frame, 1px paper margin, 1px ink outline — about 19px tall), so a
 * label never outweighs the damage number or the enemy. The grey tone uses a
 * darker slate on a cool paper (#E8E4D8) so かすれ／ミス stay readable.
 */
export function labelCanvas(text: string, tone: 'shu' | 'gray' = 'shu', worn = false): HTMLCanvasElement {
  const key = `${text}:${tone}:${worn}:v2`;
  let c = labelCache.get(key);
  if (c) return c;
  const ink = tone === 'shu' ? C.shu : C.grayDark;
  const inkDark = tone === 'shu' ? C.shuDark : '#4E5468';
  const paper = tone === 'shu' ? C.paper : '#E8E4D8';
  // measure the text's inked rows
  const tw = measure(text);
  const [tc, tctx] = makeCanvas(tw + 2, 18);
  drawText(tctx, text, 0, 0, { color: '#000000' });
  const td = tctx.getImageData(0, 0, tw + 2, 18).data;
  let top = 18;
  let bot = -1;
  for (let y = 0; y < 18; y++)
    for (let x = 0; x < tw + 2; x++)
      if (td[(y * (tw + 2) + x) * 4 + 3]) {
        top = Math.min(top, y);
        bot = Math.max(bot, y);
      }
  if (bot < 0) {
    top = 0;
    bot = 13;
  }
  const inkH = bot - top + 1;
  // outline(1) frame(1) pad(1 v / 2 h) text pad frame outline
  const w = tw + 8;
  const h = inkH + 6;
  const [cv, ctx] = makeCanvas(w, h);
  const r = (x: number, y: number, ww: number, hh: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
  };
  // ink outline with clipped corners
  r(1, 0, w - 2, h, C.ink);
  r(0, 1, w, h - 2, C.ink);
  // stamp frame
  r(1, 1, w - 2, h - 2, ink);
  // paper
  r(2, 2, w - 4, h - 4, paper);
  // text
  drawText(ctx, text, 4, 3 - top, { color: ink });
  // worn ink: knock out some pixels of the frame and text
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [ir, ig, ib] = hexRgb(ink);
  const [pr, pg, pb] = hexRgb(paper);
  const [dr, dg, db] = hexRgb(inkDark);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i] === ir && d[i + 1] === ig && d[i + 2] === ib) {
        const n = hash2(x, y, text.length * 13 + (worn ? 7 : 3));
        if (n < (worn ? 0.15 : 0.05)) {
          d[i] = pr;
          d[i + 1] = pg;
          d[i + 2] = pb;
        } else if (n > 0.88) {
          d[i] = dr;
          d[i + 1] = dg;
          d[i + 2] = db;
        }
      }
    }
  ctx.putImageData(img, 0, 0);
  void tc;
  labelCache.set(key, cv);
  return cv;
}

// ---- sticky note ---------------------------------------------------------

const stickyCache = new Map<string, HTMLCanvasElement>();

export function stickyCanvas(text: string): HTMLCanvasElement {
  let c = stickyCache.get(text);
  if (c) return c;
  const lines = text.split('\n');
  const tw = Math.max(...lines.map((l) => measure(l)));
  const w = Math.min(200, tw + 14);
  const h = 6 + 18 * lines.length;
  const [cv, ctx] = makeCanvas(w + 3, h + 3);
  const r = (x: number, y: number, ww: number, hh: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
    ctx.globalAlpha = 1;
  };
  r(2, 3, w, h, C.shadow, 0.45);
  r(0, 0, w, h, C.stickyEdge);
  r(1, 1, w - 2, h - 2, C.sticky);
  // curl at the bottom-right corner
  r(w - 5, h - 5, 4, 4, '#E9C46E');
  r(w - 4, h - 4, 3, 3, '#FBE7A8');
  r(w - 1, h - 1, 1, 1, 'rgba(0,0,0,0)');
  lines.forEach((l, i) => drawText(ctx, l, 7, 3 + i * 18, { color: C.ink }));
  // masking tape on the top edge
  const tape = tapeCanvas(22, 7, '', C.tape, 5);
  ctx.drawImage(tape, Math.round(w / 2 - 11), -2);
  stickyCache.set(text, cv);
  return cv;
}

// ---- helpers ------------------------------------------------------------

export function hexRgb(c: string): [number, number, number] {
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function clamp255(v: number): number {
  return Math.max(0, Math.min(255, Math.round(v)));
}

/** Draw a thin 1px progress/HP style bar with an ink frame. */
export function drawBar(g: Gfx, x: number, y: number, w: number, h: number, rate: number, fill: string, bg = C.grid, trailRate = 0, trail = C.white): void {
  g.rect(x, y, w, h, C.ink);
  g.rect(x + 1, y + 1, w - 2, h - 2, bg);
  const iw = w - 2;
  const tr = Math.max(rate, trailRate);
  if (tr > rate) g.rect(x + 1, y + 1, Math.round(iw * tr), h - 2, trail);
  if (rate > 0) {
    const fw = Math.max(1, Math.round(iw * rate));
    g.rect(x + 1, y + 1, fw, h - 2, fill);
    if (h - 2 >= 2) g.rect(x + 1, y + 1, fw, 1, lighten(fill, 0.25));
  }
}

const lightCache = new Map<string, string>();
export function lighten(c: string, k: number): string {
  const key = c + k;
  let v = lightCache.get(key);
  if (!v) {
    const [r, g, b] = hexRgb(c);
    const f = (x: number) => clamp255(x + (255 - x) * k).toString(16).padStart(2, '0');
    v = `#${f(r)}${f(g)}${f(b)}`;
    lightCache.set(key, v);
  }
  return v;
}

export function darken(c: string, k: number): string {
  const [r, g, b] = hexRgb(c);
  const f = (x: number) => clamp255(x * (1 - k)).toString(16).padStart(2, '0');
  return `#${f(r)}${f(g)}${f(b)}`;
}
