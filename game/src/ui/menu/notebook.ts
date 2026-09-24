// The open notebook of the field menu (30_level_art 10.7): a two-page
// graph-paper spread on a navy cover, index tabs on the right edge, the
// がま口 with the money in the top-left corner, and the small building blocks
// every page uses (headers, list rows, sticky-note popups, bars).

import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { makeCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { ease } from '../../engine/tween';
import { sfx } from '../../audio';
import { drawDigits, digitsWidth } from '../digits';
import { purseIcon, tabIcon } from '../icons';
import { blend, drawCursor, drawMarker, drawTape, rectA, textW, UI } from '../window';

/** The spread: (24,22) 320×188; pages split at the fold. */
export const SP = { x: 24, y: 22, w: 320, h: 188 };
export const FOLD = SP.x + SP.w / 2;
/** Content columns (left page / right page). */
export const LP = { x: SP.x + 14, w: SP.w / 2 - 22 };
export const RP = { x: FOLD + 8, w: SP.w / 2 - 16 };

export interface TabDef {
  id: string;
  label: string;
  color: string;
}

/** Index tabs (もちもの #F7C27A／ハンコ #E0567A／つよさ #9BCB6B／みました帳 #7FD1E8／せってい #C8C2B4). */
export const TABS: TabDef[] = [
  { id: 'items', label: 'もちもの', color: '#F7C27A' },
  { id: 'hanko', label: 'ハンコ', color: '#E0567A' },
  { id: 'stats', label: 'つよさ', color: '#9BCB6B' },
  { id: 'book', label: 'みました帳', color: '#7FD1E8' },
  { id: 'settings', label: 'せってい', color: '#C8C2B4' },
];

let spreadC: HTMLCanvasElement | null = null;

/** The static notebook (cover edge, pages, grid, fold, page stack). Cached. */
export function spreadCanvas(): HTMLCanvasElement {
  if (spreadC) return spreadC;
  const W = SP.w + 8;
  const H = SP.h + 8;
  const [c, ctx] = makeCanvas(W, H);
  const r = (x: number, y: number, w: number, h: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  };
  // cover (navy cloth), 3px around the pages, rounded
  const cover = '#2F4A8A';
  const coverD = '#22386C';
  const coverL = '#4A6AB0';
  r(1, 0, W - 2, H - 2, cover);
  r(0, 1, W, H - 4, cover);
  r(1, H - 3, W - 2, 1, coverD);
  r(0, H - 4, 1, 1, coverD);
  r(2, 1, W - 4, 1, coverL);
  // cloth weave
  for (let y = 1; y < H - 3; y++)
    for (let x = 1; x < W - 1; x++) if (hash2(x, y, 5) < 0.07) r(x, y, 1, 1, (x + y) % 2 ? coverL : coverD);
  // page stack (the pages' edges peeking out at the bottom)
  const px = 4;
  const py = 3;
  const pw = SP.w;
  const ph = SP.h;
  r(px + 1, py + ph, pw - 2, 1, '#C8C2B4');
  r(px + 2, py + ph + 1, pw - 4, 1, '#E8D9B5');
  // pages
  r(px, py + 1, pw, ph - 2, UI.bg);
  r(px + 1, py, pw - 2, ph, UI.bg);
  // grid, from each page's top-left
  const half = pw / 2;
  for (const ox of [0, half]) {
    for (let x = ox + 8; x < ox + half; x += 8) r(px + x, py + 1, 1, ph - 2, UI.bg2);
    for (let y = 8; y < ph; y += 8) r(px + ox + 1, py + y, half - 2, 1, UI.bg2);
  }
  // paper fibres
  for (let y = py + 1; y < py + ph - 1; y++)
    for (let x = px + 1; x < px + pw - 1; x++) {
      const n = hash2(x, y, 41);
      if (n < 0.008) r(x, y, 1, 1, '#F1E4C4');
      else if (n > 0.996) r(x, y, 1, 1, '#FFFBEE');
    }
  // red margin line on the left page
  r(px + 11, py + 1, 1, ph - 2, UI.margin, 0.45);
  // the fold: the pages curve down into the spine
  const fx = px + half;
  r(fx - 1, py, 2, ph, '#D8C79E');
  r(fx - 3, py, 2, ph, '#E8D9B5', 0.8);
  r(fx + 1, py, 2, ph, '#E8D9B5', 0.8);
  r(fx - 6, py, 3, ph, '#E8D9B5', 0.35);
  r(fx + 3, py, 3, ph, '#E8D9B5', 0.35);
  // outer page edges: a slightly darker rim
  r(px, py + 1, 1, ph - 2, '#E8D9B5');
  r(px + pw - 1, py + 1, 1, ph - 2, '#E8D9B5');
  // the page edges are a hair lighter at the top-left (sunset from the left)
  r(px + 1, py, 40, 1, '#FFFBEE');
  spreadC = c;
  return c;
}

/** Draw the notebook at an offset (slide-in). */
export function drawSpread(g: Gfx, dx: number, alpha: number): void {
  // drop shadow onto the world
  g.alpha(alpha * 0.45, () => g.rect(SP.x - 4 + 3 + dx, SP.y - 3 + 4, SP.w + 8, SP.h + 8, UI.night));
  g.img(spreadCanvas(), SP.x - 4 + dx, SP.y - 3, alpha < 1 ? { alpha } : {});
}

let tabCache = new Map<string, HTMLCanvasElement>();
function tabCanvas(t: TabDef, sel: boolean): HTMLCanvasElement {
  const key = t.id + sel;
  let c = tabCache.get(key);
  if (c) return c;
  const w = 22;
  const h = 30;
  const [cv, ctx] = makeCanvas(w, h);
  const base = sel ? blend(t.color, '#FFFFFF', 0.12) : t.color;
  const dark = blend(t.color, '#2A2440', 0.35);
  const light = blend(t.color, '#FFFFFF', 0.4);
  ctx.fillStyle = UI.border;
  ctx.fillRect(0, 1, w - 1, h - 2);
  ctx.fillRect(0, 0, w - 2, h);
  ctx.fillStyle = base;
  ctx.fillRect(0, 1, w - 3, h - 2);
  ctx.fillRect(0, 2, w - 2, h - 4);
  ctx.fillStyle = light;
  ctx.fillRect(0, 1, w - 4, 1);
  ctx.fillStyle = dark;
  ctx.fillRect(1, h - 2, w - 4, 1);
  ctx.fillRect(w - 3, 2, 1, h - 4);
  // a crease where the sticky note bends over the page edge
  ctx.fillStyle = dark;
  ctx.globalAlpha = 0.4;
  ctx.fillRect(3, 1, 1, h - 2);
  ctx.globalAlpha = 1;
  ctx.drawImage(tabIcon(t.id), 6, 9);
  c = cv;
  tabCache.set(key, c);
  return c;
}

/** Index tabs on the right edge. The chosen one sticks out 4px further. */
export function drawTabs(g: Gfx, sel: number, dx: number, alpha: number, t: number, focus: boolean, only?: string): void {
  const x0 = SP.x + SP.w - 3 + dx;
  TABS.forEach((tab, i) => {
    if (only && tab.id !== only) return;
    const y = SP.y + 12 + i * 33;
    const s = i === sel;
    const x = x0 + (s ? 4 : 0);
    // sticky notes sit under the right page edge: shadow first
    g.alpha(alpha * 0.4, () => g.rect(x + 2, y + 2, 20, 30, UI.night));
    g.img(tabCanvas(tab, s), x, y, alpha < 1 ? { alpha } : {});
    if (s && focus) drawCursor(g, x + 22, y + 7, t);
  });
}

/** がま口 + money in the top-left corner (500円, 5×7 numerals). */
export function drawMoney(g: Gfx, money: number, dx: number, alpha: number, openT = 999): void {
  const x = SP.x - 8 + dx;
  const y = SP.y - 8;
  const open = openT < 70;
  g.alpha(alpha, () => {
    const s = `${money}円`;
    const w = digitsWidth(s) + 26;
    // a paper price label under the purse
    rectA(g, x + 12 + 2, y + 4 + 2, w, 12, UI.night, 0.35);
    g.rect(x + 12, y + 4, w, 12, UI.border);
    g.rect(x + 13, y + 5, w - 2, 10, UI.flipPaper);
    drawDigits(g, s, x + 12 + w - 4, y + 7, { color: UI.text, align: 'right' });
    g.img(purseIcon(open), x, y + (open ? -1 : 0));
  });
}

/** Section header: a strip of masking tape with the page title. */
export function drawHeader(g: Gfx, text: string, x: number, y: number, color: string = UI.tape, alpha = 1, seed = 3): void {
  drawTape(g, x, y, textW(text) + 16, 18, text, { color, alpha, seed });
}

/** A list row with the hanko cursor in the margin and the highlighter behind the label. */
export function drawRowCursor(g: Gfx, x: number, y: number, w: number, t: number, sel: boolean, focus: boolean, moveT: number, pressT = -1): void {
  if (!sel) return;
  if (focus) drawMarker(g, x - 2, y + 1, w + 4, 15, Math.min(1, moveT / 70));
  else drawMarker(g, x - 2, y + 1, w + 4, 15, 1, '#EFE4C6');
  if (focus) drawCursor(g, x - 16, y, t, pressT);
}

/** Thin bar with an ink frame (HP / 朱肉 / exp). */
export function drawBar(g: Gfx, x: number, y: number, w: number, h: number, rate: number, fill: string, bg: string = UI.bg2): void {
  g.rect(x, y, w, h, UI.border);
  g.rect(x + 1, y + 1, w - 2, h - 2, bg);
  const fw = Math.round((w - 2) * Math.max(0, Math.min(1, rate)));
  if (fw > 0) {
    g.rect(x + 1, y + 1, fw, h - 2, fill);
    if (h > 3) g.rect(x + 1, y + 1, fw, 1, blend(fill, '#FFFFFF', 0.3));
  }
}

/** HP bar colour (15.7): >50% green, 25–50% gold, <25% vermilion. */
export function hpColor(rate: number): string {
  return rate > 0.5 ? '#5FA85A' : rate >= 0.25 ? '#D9A441' : '#E23B2E';
}

/** Scroll arrows (little pencil chevrons). */
export function drawScroll(g: Gfx, x: number, y: number, up: boolean, t: number): void {
  const b = Math.floor(t / 300) % 2;
  for (let i = 0; i < 4; i++) {
    const yy = up ? y + i - b : y - i + b;
    g.rect(x - i, yy, i * 2 + 1, 1, UI.pencil);
  }
}

// ---- sticky-note popup list -----------------------------------------------------------

export interface PopupOpt {
  label: string;
  disabled?: boolean;
  /** Right-aligned small text (5×7 numerals). */
  sub?: string;
  /** Optional bar under the label. */
  bar?: { rate: number; color: string };
}

/**
 * A sticky note (付箋) with a short list: item actions, targets, confirms.
 * Returns the chosen index from update() once, -1 when cancelled.
 */
export class Popup {
  index = 0;
  private t = 0;
  private moveT = 999;
  private pressT = -1;
  result: number | null = null;
  readonly w: number;
  readonly h: number;
  private rowH: number;

  /** The title, one entry a line ('\n' breaks it). */
  private readonly titleLines: string[];

  constructor(public opts: PopupOpt[], public x: number, public y: number, public title = '', o: { minW?: number; index?: number } = {}) {
    this.rowH = opts.some((p) => p.bar) ? 24 : 18;
    this.titleLines = title ? title.split('\n') : [];
    const ow = Math.max(0, ...opts.map((p) => textW(p.label) + (p.sub ? digitsWidth(p.sub) + 10 : 0))) + 30;
    const tw = Math.max(0, ...this.titleLines.map((l) => textW(l) + 16));
    this.w = Math.max(o.minW ?? 0, ow, tw);
    this.h = opts.length * this.rowH + 10 + this.titleLines.length * 16;
    this.index = o.index ?? 0;
    if (this.x + this.w > 376) this.x = 376 - this.w;
    if (this.y + this.h > 210) this.y = 210 - this.h;
  }

  update(dt: number, input: Input): number | null {
    this.t += dt;
    this.moveT += dt;
    if (this.pressT >= 0) {
      this.pressT += dt;
      if (this.pressT > 100) {
        const r = this.index;
        this.pressT = -1;
        return r;
      }
      return null;
    }
    if (this.t < 80) return null;
    const n = this.opts.length;
    if (input.repeat('down')) this.move(1, n);
    else if (input.repeat('up')) this.move(-1, n);
    if (input.pressed('confirm')) {
      if (this.opts[this.index].disabled) sfx('se_buzzer');
      else {
        sfx('se_confirm');
        this.pressT = 0;
      }
    } else if (input.pressed('cancel')) {
      sfx('se_cancel');
      return -1;
    }
    return null;
  }

  private move(d: number, n: number): void {
    this.index = (this.index + d + n) % n;
    this.moveT = 0;
    sfx('se_cursor');
  }

  draw(g: Gfx): void {
    const k = Math.min(1, this.t / 110);
    const e = ease.backOut(k);
    const x = Math.round(this.x);
    const y = Math.round(this.y + (1 - e) * 6);
    const w = this.w;
    const h = this.h;
    g.alpha(Math.min(1, k * 1.5), () => {
      rectA(g, x + 2, y + 3, w, h, UI.night, 0.4);
      g.rect(x, y, w, h, UI.stickyEdge);
      g.rect(x + 1, y + 1, w - 2, h - 2, UI.sticky);
      g.rect(x + 1, y + 1, w - 2, 1, '#FBE7A8');
      // the curl of the sticky note's bottom-right corner
      g.rect(x + w - 5, y + h - 5, 4, 4, '#E9C46E');
      g.rect(x + w - 4, y + h - 4, 3, 3, '#FBE7A8');
      // a strip of tape holding it
      drawTape(g, x + Math.round(w / 2) - 11, y - 3, 22, 7, '', { seed: w });
      let yy = y + 5;
      for (const l of this.titleLines) {
        g.text(l, x + 8, yy, { color: UI.pencil });
        yy += 16;
      }
      this.opts.forEach((p, i) => {
        const ry = yy + i * this.rowH;
        const sel = i === this.index;
        if (sel) drawMarker(g, x + 20, ry + 1, w - 26, 15, Math.min(1, this.moveT / 70), '#FFF3C4');
        g.text(p.label, x + 22, ry, { color: p.disabled ? UI.textDim : UI.text });
        if (p.sub) drawDigits(g, p.sub, x + w - 7, ry + 5, { color: p.disabled ? UI.textDim : UI.pencil, align: 'right' });
        if (p.bar) drawBar(g, x + 22, ry + 17, w - 30, 4, p.bar.rate, p.bar.color);
        if (sel) drawCursor(g, x + 9, ry, this.t, this.pressT);
      });
    });
  }
}
