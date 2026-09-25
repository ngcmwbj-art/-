// "夏休みのノート" (30_level_art 10, 00_concept 15): every window is a torn-out
// piece of graph-paper notebook. Shared by dialog, menus, shop, title and the
// HUD. The signature of drawWindow() is a contract (ARCHITECTURE.md); the
// extra helpers here are the notebook's stationery: masking tape, the little
// vermilion hanko cursor, the highlighter stroke and dotted rules.

import type { Gfx } from '../engine/gfx';
import { drawText, measure } from '../engine/font';
import { makeCanvas, PixelCanvas } from '../engine/pixel';
import { hash2 } from '../engine/rng';

export interface WindowStyle {
  bg: string;
  bg2: string;
  border: string;
  borderDark: string;
  shadow: string;
  text: string;
  textDim: string;
  accent: string;
}

/** UI colours (30_level_art 10.2). The first eight keys are the WindowStyle contract. */
export const UI = {
  bg: '#FBF3DC', // notebook paper
  bg2: '#E8D9B5', // grid lines, back of the paper
  border: '#2A2440', // 2px frame, text
  borderDark: '#5B4A7A', // window shadow (α50%, +2,+2)
  shadow: '#5B4A7A',
  text: '#2A2440',
  textDim: '#9AA0A8', // items that can't be chosen
  accent: '#E23B2E', // 朱: cursor, item names, emphasis
  accentDark: '#B8241E',
  accentLight: '#FF6A4D',
  tape: '#F7C27A', // masking tape (α85%)
  tapeOn: '#F6B25E', // the chosen strip of tape in a menu: the strongest colour
  tapeOff: '#EADFC3', // strips not chosen: pale, so the chosen one stands out
  marker: '#FFE7A3', // highlighter (α70%)
  margin: '#E0567A', // red margin line (α50%)
  flipPaper: '#F4F1E8', // Kanenari's flip board
  sys: '#4A3A6E', // system text (受けとった！ …)
  pencil: '#4A3A6E',
  paperDark: '#E8D9B5',
  paperWarm: '#F6E9C8',
  sticky: '#F6D98A',
  stickyEdge: '#D9A441',
  wood: '#C8A06A',
  woodLight: '#E8C890',
  woodDark: '#8A5A3A',
  gold: '#D9A441',
  night: '#1B1733',
  darkest: '#0B0B14',
  white: '#F4F1E8',
  cream: '#FFF6D8',
  sunset: '#F2894B',
} as const;

UI satisfies WindowStyle;

export type UIColor = (typeof UI)[keyof typeof UI];

export interface WindowOpts {
  /** Graph-paper grid (default true). */
  grid?: boolean;
  /** Red margin line this many px from the left edge (dialog windows: 14). */
  margin?: number;
  /** Paper colour override (flip board: UI.flipPaper). */
  paper?: string;
  /** Fold the bottom-right corner (default: windows 80px tall or more). */
  curl?: boolean;
  /** Drop shadow (default true). */
  shadow?: boolean;
  /** Frame colour override (active panels). */
  frame?: string;
}

const winCache = new Map<string, HTMLCanvasElement>();

function styleKey(s: WindowStyle): string {
  return `${s.bg}${s.bg2}${s.border}${s.shadow}`;
}

/**
 * Pre-rendered window of exactly w×h (the drop shadow is drawn separately so
 * the cached canvas stays w×h). Paper fibres are seeded by size so two
 * windows of the same size look alike but different sizes don't repeat.
 */
function windowCanvas(w: number, h: number, s: WindowStyle, o: WindowOpts): HTMLCanvasElement {
  const grid = o.grid !== false;
  const curl = o.curl ?? h >= 80;
  const paper = o.paper ?? s.bg;
  const frame = o.frame ?? s.border;
  const key = `${w}x${h}|${styleKey(s)}|${grid}|${o.margin ?? -1}|${paper}|${curl}|${frame}`;
  let c = winCache.get(key);
  if (c) return c;
  const [cv, ctx] = makeCanvas(w, h);
  const r = (x: number, y: number, ww: number, hh: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
    ctx.globalAlpha = 1;
  };
  // 2px frame, corners rounded by 1px (the corner pixel is left out)
  r(1, 0, w - 2, h, frame);
  r(0, 1, w, h - 2, frame);
  // paper
  r(2, 2, w - 4, h - 4, paper);
  // inner corner pixels keep the 2px frame looking round
  r(2, 2, 1, 1, frame);
  r(w - 3, 2, 1, 1, frame);
  r(2, h - 3, 1, 1, frame);
  r(w - 3, h - 3, 1, 1, frame);
  if (grid) {
    const gc = s.bg2;
    for (let x = 2 + 8; x < w - 2; x += 8) r(x, 3, 1, h - 6, gc);
    for (let y = 2 + 8; y < h - 2; y += 8) r(3, y, w - 6, 1, gc);
  }
  // paper fibres: a few warmer / brighter specks
  const seed = w * 31 + h * 7;
  for (let y = 3; y < h - 3; y++)
    for (let x = 3; x < w - 3; x++) {
      const n = hash2(x, y, seed);
      if (n < 0.01) r(x, y, 1, 1, '#F1E4C4');
      else if (n > 0.995) r(x, y, 1, 1, '#FFFBEE');
    }
  // top-left light: one brighter row just inside the frame
  r(3, 2, Math.min(w - 6, 24), 1, '#FFFBEE');
  if (o.margin !== undefined) r(o.margin, 2, 1, h - 4, UI.margin, 0.5);
  if (curl) {
    // the bottom-right corner is folded over by 4px: the cut corner becomes
    // transparent, the frame follows the diagonal, and the flap (the back of
    // the paper, #E8D9B5) lies mirrored on the page with a 1px shadow
    const X = w - 1;
    const Y = h - 1;
    for (let dy = 0; dy < 12; dy++)
      for (let dx = 0; dx < 12; dx++) {
        const x = X - dx;
        const y = Y - dy;
        const d = dx + dy;
        if (d < 5) ctx.clearRect(x, y, 1, 1);
        else if (d <= 6) r(x, y, 1, 1, frame);
        else if (dx <= 6 && dy <= 6 && d <= 11) {
          if (dx === 6 || dy === 6) r(x, y, 1, 1, frame);
          else r(x, y, 1, 1, s.bg2);
        } else if ((dx === 7 && dy <= 6 && d <= 12) || (dy === 7 && dx <= 6 && d <= 12)) r(x, y, 1, 1, s.shadow, 0.35);
      }
  }
  c = cv;
  if (winCache.size > 160) winCache.delete(winCache.keys().next().value as string);
  winCache.set(key, c);
  return c;
}

/** Draw a framed window. (x, y, w, h) is the outer rectangle. */
export function drawWindow(g: Gfx, x: number, y: number, w: number, h: number, s: WindowStyle = UI, alpha = 1, o: WindowOpts = {}): void {
  x = Math.round(x);
  y = Math.round(y);
  w = Math.round(w);
  h = Math.round(h);
  if (w < 8 || h < 8 || alpha <= 0) return;
  const a = Math.min(1, alpha);
  if (o.shadow !== false) {
    // shadow: the outer rectangle offset by (+2,+2), #5B4A7A α50%
    const curl = o.curl ?? h >= 80;
    const cut = curl ? 5 : 0;
    g.alpha(a * 0.5, () => {
      g.rect(x + w, y + 3, 2, h - 2 - cut, s.shadow);
      g.rect(x + 3, y + h, w - 3 - cut, 2, s.shadow);
      g.rect(x + w, y + 2, 1, 1, s.shadow);
      if (curl) for (let i = 0; i < 6; i++) g.rect(x + w - 5 + i, y + h + 1 - i, 1, 2, s.shadow);
    });
  }
  g.img(windowCanvas(w, h, s, o), x, y, a < 1 ? { alpha: a } : {});
}

// ---- masking tape ------------------------------------------------------------

const tapeCache = new Map<string, HTMLCanvasElement>();

/**
 * Masking tape strip (w×h) with 2px zig-zag torn ends, α85% baked in, a
 * lighter top edge and faint paper fibres. `seed` varies the tear.
 */
export function tapeImg(w: number, h = 16, color: string = UI.tape, seed = 1): HTMLCanvasElement {
  w = Math.max(6, Math.round(w));
  const key = `${w}x${h}:${color}:${seed}`;
  let c = tapeCache.get(key);
  if (c) return c;
  const [cr, cg, cb] = rgb(color);
  const shade = (k: number) => `#${hx(cr * k)}${hx(cg * k)}${hx(cb * k)}d9`;
  const p = new PixelCanvas(w, h);
  const teeth = [0, 1, 2, 1];
  for (let y = 0; y < h; y++) {
    const lx = teeth[(y + seed) % 4];
    const rx = teeth[(y + seed * 3 + 2) % 4];
    for (let x = lx; x < w - rx; x++) {
      let k = 1;
      if (y === 0) k = 1.07;
      else if (y === h - 1) k = 0.9;
      const n = hash2(x, y, seed * 17 + w);
      if ((x + seed) % 9 === 0 && n < 0.5) k *= 1.04; // paper fibres
      if (n < 0.04) k *= 0.95;
      if (x === lx || x === w - rx - 1) k *= 0.94;
      p.set(x, y, shade(Math.min(1.12, k)));
    }
  }
  c = p.toCanvas();
  tapeCache.set(key, c);
  return c;
}

/** Tape with centred ink text (name tags, menu tapes). Height 16 fits the 16px font with the glyph baseline centred. */
export function drawTape(g: Gfx, x: number, y: number, w: number, h: number, text = '', o: { color?: string; seed?: number; alpha?: number; ink?: string; align?: 'center' | 'left'; pad?: number } = {}): void {
  const img = tapeImg(w, h, o.color ?? UI.tape, o.seed ?? 1);
  const a = o.alpha ?? 1;
  g.img(img, x, y, a < 1 ? { alpha: a } : {});
  if (text) {
    const ty = Math.round(y + (h - 15) / 2);
    const col = o.ink ?? UI.text;
    if (o.align === 'left') g.text(text, x + (o.pad ?? 6), ty, { color: col, alpha: a });
    else g.text(text, Math.round(x + w / 2), ty, { color: col, align: 'center', alpha: a });
  }
}

// ---- the little vermilion hanko cursor (8×10) -----------------------------------

let curUp: HTMLCanvasElement | null = null;
let curDown: HTMLCanvasElement | null = null;

function buildCursor(pressed: boolean): HTMLCanvasElement {
  // wooden knob + neck (#C8A06A, lit on the left), vermilion base
  const pal: Record<string, string> = {
    o: UI.border,
    h: UI.woodLight,
    s: UI.wood,
    d: '#9A7448',
    r: UI.accent,
    l: UI.accentLight,
    k: UI.accentDark,
  };
  const rows = pressed
    ? ['........', '........', '..oooo..', '.ohhsdo.', '..ohdo..', '..ohdo..', '.oooooo.', 'olrrrrko', 'okkkkkko', '.oooooo.']
    : ['..oooo..', '.ohhsdo.', '.ohsddo.', '..ohdo..', '..ohdo..', '.oooooo.', 'olrrrrko', 'orrrrrko', 'okkkkkko', '.oooooo.'];
  return PixelCanvas.fromArt(rows, pal).toCanvas();
}

/** The 8×10 hanko cursor; `pressed` shows it pushed down 1px (決定). */
export function cursorImg(pressed = false): HTMLCanvasElement {
  if (pressed) return (curDown ??= buildCursor(true));
  return (curUp ??= buildCursor(false));
}

/**
 * Draw the hanko cursor pointing at a row whose text top is `y`. Idle it bobs
 * 1px at 2Hz; `pressT` ≥ 0 (ms since 決定) sinks it and leaves a tiny ink dot.
 */
export function drawCursor(g: Gfx, x: number, y: number, t: number, pressT = -1): void {
  if (pressT >= 0 && pressT < 220) {
    g.img(cursorImg(true), x, y + 3);
    if (pressT > 40) g.alpha(Math.max(0, 1 - pressT / 220), () => g.rect(x + 1, y + 13, 6, 1, UI.accent));
    return;
  }
  const bob = Math.floor(t / 250) % 2;
  g.img(cursorImg(false), x, y + 3 + bob);
}

// ---- highlighter & rules ----------------------------------------------------------

/**
 * Highlighter stroke behind a selected row (#FFE7A3 α70%, text height + 2px,
 * both ends ragged by a pixel). `k` 0..1 lets it be drawn in from the left.
 */
export function drawMarker(g: Gfx, x: number, y: number, w: number, h = 14, k = 1, color: string = UI.marker): void {
  const ww = Math.round(w * Math.min(1, k));
  if (ww <= 1) return;
  g.alpha(0.7, () => {
    g.rect(x + 1, y, ww - 2, h, color);
    // ragged ends: the left end starts a pixel late on top, the right end
    // stops early at the bottom (a quick swipe)
    g.rect(x, y + 1, 1, h - 1, color);
    if (k >= 1) g.rect(x + ww - 1, y, 1, h - 2, color);
  });
}

/** Dotted rule (1px dots every 2px). */
export function dottedLine(g: Gfx, x0: number, y: number, x1: number, color: string = UI.bg2, step = 2): void {
  for (let x = x0; x <= x1; x += step) g.px(x, y, color);
}

/** Dotted vertical rule. */
export function dottedVLine(g: Gfx, x: number, y0: number, y1: number, color: string = UI.bg2, step = 2): void {
  for (let y = y0; y <= y1; y += step) g.px(x, y, color);
}

/** Pencil underline (slightly wavy, drawn in by `k`). */
export function pencilLine(g: Gfx, x: number, y: number, w: number, k = 1, color: string = UI.pencil, seed = 3): void {
  const n = Math.round(w * Math.min(1, k));
  for (let i = 0; i < n; i++) {
    const dy = hash2(i >> 3, 0, seed) > 0.72 ? 1 : 0;
    g.px(x + i, y + dy, color);
  }
}

/** Screen-space text with the paper-and-ink outline (place names, floating text; 10.3). */
export function outlinedText(g: Gfx, s: string, x: number, y: number, o: { align?: 'left' | 'center' | 'right'; alpha?: number; color?: string } = {}): number {
  return g.text(s, x, y, { color: o.color ?? UI.bg, outline: UI.border, align: o.align, alpha: o.alpha });
}

/** Width of a string in the game font. */
export function textW(s: string): number {
  return measure(s);
}

/** Draw text into a 2D context (for pre-rendered canvases). */
export function ctxText(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string = UI.text, align: 'left' | 'center' | 'right' = 'left'): void {
  drawText(ctx, s, x, y, { color, align });
}

// ---- helpers -----------------------------------------------------------------------

export function rgb(c: string): [number, number, number] {
  let h = c.replace('#', '');
  if (h.length === 3) h = h.split('').map((x) => x + x).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function hx(v: number): string {
  return Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
}

/** Blend two colours (t=0 → a). */
export function blend(a: string, b: string, t: number): string {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return `#${hx(r1 + (r2 - r1) * t)}${hx(g1 + (g2 - g1) * t)}${hx(b1 + (b2 - b1) * t)}`;
}

/**
 * Translucent rectangle that respects an enclosing g.alpha() (Gfx.rect's own
 * alpha argument replaces the global alpha instead of multiplying it).
 */
export function rectA(g: Gfx, x: number, y: number, w: number, h: number, color: string, a: number): void {
  g.alpha(a, () => g.rect(x, y, w, h, color));
}

/**
 * Wrap Japanese text for the notebook's text columns (分かち書き, 10_narrative
 * 1.2). Break opportunities, best first:
 *   1. the spaces between phrases;
 *   2. right after 、。！？ inside a phrase (「がま口。／ぱちん、」);
 *   3. inside a phrase that is still too wide: after a particle that follows
 *      kanji / katakana (「猫の／影」), or where hiragana and katakana meet;
 *   4. only if none of those fits: between characters, with kinsoku
 *      (a line never starts with 、。ー or a small kana).
 * A word is never split inside its kana, so 「あわて／て」「ま／んなかが」
 * can't happen. Lines are subsequences of the input (only the spaces at the
 * break points are dropped), which the dialog's markup mapping relies on.
 */
export function phraseWrap(text: string, maxW: number, o: WrapOpts = {}): string[] {
  return phraseWrapInfo(text, maxW, o).lines;
}

export interface WrapOpts {
  /**
   * Don't leave a phrase of one or two letters alone at the head of a line
   * (「確認印／用。」「半分／回復。」): the phrase before it comes down with it.
   * For the short descriptions of items (the bag, the shops); dialogs keep
   * the plain rule, so their pages stay as written.
   */
  glue?: boolean;
}

/** phraseWrap plus how many breaks had to fall between characters (rule 4; QA). */
export function phraseWrapInfo(text: string, maxW: number, o: WrapOpts = {}): { lines: string[]; forced: number } {
  const out: string[] = [];
  let forced = 0;
  for (const para of text.split('\n')) {
    // segments: split at spaces (joined back with a space) and after
    // punctuation inside a word (joined back with nothing)
    const segs: { s: string; sp: boolean }[] = [];
    para.split(' ').forEach((word, wi) => {
      if (!word) return;
      splitAfterPunct(word).forEach((s, si) => segs.push({ s, sp: wi > 0 && si === 0 && segs.length > 0 }));
    });
    let line = '';
    for (const seg of segs) {
      const cand = line ? line + (seg.sp ? ' ' : '') + seg.s : seg.s;
      if (fitW(cand) <= maxW) {
        line = cand;
        continue;
      }
      // closing punctuation may hang past the margin
      if (line && CLOSE_ONLY.test(seg.s) && measure(cand) <= maxW + 16) {
        line = cand;
        continue;
      }
      if (fitW(seg.s) <= maxW) {
        // it fits on a line of its own: keep the phrase whole
        if (o.glue && line && seg.sp && [...seg.s.replace(/[、。！？」』）…]+$/, '')].length <= 2) {
          // …but a one- or two-letter phrase takes the phrase before it along (not left alone)
          const k = line.lastIndexOf(' ');
          const moved = k > 0 ? line.slice(k + 1) + ' ' + seg.s : '';
          if (k > 0 && fitW(moved) <= maxW) {
            out.push(line.slice(0, k));
            line = moved;
            continue;
          }
        }
        if (line) out.push(line);
        line = seg.s;
        continue;
      }
      // a phrase wider than the column has to be broken somewhere: fill the
      // current line up to its best soft break first (「名刺の 裏に／『帰りたい』。」)
      let rest = [...seg.s];
      let sp = seg.sp;
      while (rest.length) {
        const joint = line ? line + (sp ? ' ' : '') : '';
        if (fitW(joint + rest.join('')) <= maxW) {
          line = joint + rest.join('');
          rest = [];
          break;
        }
        const cut = softCut(rest, maxW - measure(joint));
        if (cut) {
          out.push(joint + rest.slice(0, cut).join(''));
          rest = rest.slice(cut);
        } else if (line) {
          out.push(line);
        } else {
          // last resort: between characters, kinsoku-safe
          forced++;
          const c = hardCut(rest, maxW);
          out.push(rest.slice(0, c).join(''));
          rest = rest.slice(c);
        }
        line = '';
        sp = false;
      }
    }
    out.push(line);
  }
  return { lines: out, forced };
}

const CLOSE_ONLY = /^[、。！？」』）…]+$/;

/**
 * Width of a line for fitting: a trailing 、 or 。 counts half, its ink sits in
 * the left half of the cell (ぶら下げ, half a character).
 */
function fitW(s: string): number {
  const w = measure(s);
  return /[、。]$/.test(s) ? w - 8 : w;
}
const BREAK_AFTER = new Set([...'、。！？」』）…']);
const PARTICLE = new Set([...'がをにはへでともの']);
const NO_LINE_START = new Set([...'、。，．！？」』）ーっゃゅょぁぃぅぇぉッャュョァィゥェォ…〜']);

const isHira = (c: string) => c >= '\u3041' && c <= '\u309F';
const isKata = (c: string) => (c >= '\u30A0' && c <= '\u30FF') || c === 'ー';
const isKanji = (c: string) => (c >= '\u4E00' && c <= '\u9FFF') || c === '々';

/** 「がま口。ぱちん、と」 → ["がま口。", "ぱちん、", "と"] */
function splitAfterPunct(word: string): string[] {
  const out: string[] = [];
  let cur = '';
  const ch = [...word];
  ch.forEach((c, i) => {
    cur += c;
    // keep runs of punctuation together (「！？」「。」」)
    if (BREAK_AFTER.has(c) && i < ch.length - 1 && !BREAK_AFTER.has(ch[i + 1])) {
      out.push(cur);
      cur = '';
    }
  });
  if (cur) out.push(cur);
  return out;
}

/** Break positions inside one phrase (index = number of chars before the break). */
function softBreaks(ch: string[]): Set<number> {
  const at = new Set<number>();
  for (let i = 1; i < ch.length; i++) {
    const a = ch[i - 1];
    const b = ch[i];
    if (NO_LINE_START.has(b)) continue;
    // after a particle that follows kanji / katakana / digits (猫の|影, ミナトが|…)
    const p = ch[i - 2];
    if (PARTICLE.has(a) && p && (isKanji(p) || isKata(p) || /[0-9０-９]/.test(p))) at.add(i);
    // before an opening bracket (小さく|『帰りたい』)
    else if ('「『（'.includes(b)) at.add(i);
    // where hiragana and katakana meet (あわてた|ミナト, ミナト|まで is covered above)
    else if ((isHira(a) && isKata(b)) || (isKata(a) && isHira(b) && !PARTICLE.has(b))) at.add(i);
  }
  return at;
}

/** Longest prefix (in chars) ending at a soft break that fits in `room`; 0 if none. */
function softCut(ch: string[], room: number): number {
  if (room <= 0) return 0;
  const soft = softBreaks(ch);
  for (let i = ch.length - 1; i >= 1; i--) if (soft.has(i) && fitW(ch.slice(0, i).join('')) <= room) return i;
  return 0;
}

/** As many characters as fit, but never leaving 、。ー or a small kana to start the next line. */
function hardCut(ch: string[], maxW: number): number {
  let i = 1;
  while (i < ch.length && fitW(ch.slice(0, i + 1).join('')) <= maxW) i++;
  while (i > 1 && i < ch.length && NO_LINE_START.has(ch[i])) i--;
  return i;
}

/**
 * phraseWrap for a narrow column that must not break a long word: when a
 * phrase is wider than the whole column (『イラッシャイマセ』 in a 9-letter
 * page), the text is wrapped a little wider and those lines are set with the
 * letters drawn up to 2px closer (字詰め) instead of splitting the word.
 */
export function fitWrap(text: string, maxW: number): { text: string; spacing: number }[] {
  const plain = phraseWrapInfo(text, maxW);
  if (!plain.forced) return plain.lines.map((l) => ({ text: l, spacing: 0 }));
  for (const sp of [-1, -2]) {
    const wide = phraseWrapInfo(text, maxW + 12 * -sp);
    if (wide.forced) continue;
    const out = wide.lines.map((l) => {
      const n = [...l].length;
      const over = fitW(l) - maxW;
      const s = over <= 0 ? 0 : Math.max(sp, -Math.ceil(over / Math.max(1, n - 1)));
      return { text: l, spacing: s, ok: fitW(l) + s * (n - 1) <= maxW };
    });
    if (out.every((o) => o.ok)) return out.map(({ text, spacing }) => ({ text, spacing }));
  }
  return plain.lines.map((l) => ({ text: l, spacing: 0 }));
}
