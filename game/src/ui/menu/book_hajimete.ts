// みました帳の『はじめて』（グソっ君の はじめて帳、02_ch2_index #89、30_level_art 10.7、52_ch2_level_art 13.2）。
// 『みずべ』と 同じ 作り：左の ページに 名前の 一覧（うまって いない ページは「…………」）、右の ページに
// しゅんの えんぴつの 絵・名前・教えて くれた 人・グソっ君の ひとこと・グソっ君が つける「びっくり度」の
// 欄（★1〜5。出来たての 焼きそばは ★6 で 欄から はみ出す。らん外の 打ち水は「？」）。うまって いない
// ページは「…………」と、どこで 教わるかの 1行だけ（出来たては 点線だけ）。右上の すみに、その 帳の ★の 合計。
//
// ② の いちばん下に 番号なしの 行『裏表紙』（① ② ぜんぶ うめたあと）：グソっ君の えんぴつの、しゅんの 顔と
// 『はじめての ともだち』、からっぽの ★の 欄。数（/13・/6）には らん外と 裏表紙を 入れない。
//
// QA：__game.cmd.hajimete('book') で ① ② を うめる、__game.cmd.hajimeteBookText()（wrapCheck も 呼ぶ）。

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { registerDebug } from '../../debug';
import { pencilOf } from '../../art/props/seki_tsuri_art';
import { digitsWidth, drawDigits } from '../digits';
import { dottedLine, fitWrap, pencilLine, phraseWrap, UI } from '../window';
import { clearRight, pageText, RP, SP } from './notebook';
import { bookLabelW } from './book';
import {
  fromLine,
  HAJIMETE,
  HAJIMETE_TAB,
  hajimeteAll,
  hajimeteBook,
  hajimeteCount,
  hajimeteDone,
  hajimeteStars,
  URA_NOTE,
  URA_ROW,
  URA_TITLE,
  type HajimeteEntry,
} from '../../data/text/hajimete';

export const HAJIMETE_TAB_NAME = HAJIMETE_TAB;

/** The notebook has its 『はじめて』 section. */
export function hasHajimete(vol: 1 | 2): boolean {
  return hajimeteBook(vol);
}

export interface HajimeteRow {
  id: string;
  name: string;
  /** 01–13, or '' for the bonus page and the back cover. */
  num: string;
  done: boolean;
  pencil?: boolean;
  entry?: HajimeteEntry;
}

export function hajimeteRows(vol: 1 | 2): HajimeteRow[] {
  const rows: HajimeteRow[] = [];
  let n = 0;
  for (const e of HAJIMETE) {
    if (e.vol !== vol) continue;
    if (e.bonus && !hajimeteDone(e.id)) continue;
    rows.push({ id: e.id, name: e.name, num: e.bonus ? '' : String(++n).padStart(2, '0'), done: hajimeteDone(e.id), entry: e });
  }
  if (vol === 2 && hajimeteAll()) rows.push({ id: 'ura', name: URA_ROW, num: '', done: true, pencil: true });
  return rows;
}

export function hajimeteHave(vol: 1 | 2): [number, number] {
  return hajimeteCount(vol);
}

// ---------------------------------------------------------------- しゅんの えんぴつの 絵

const FILL = '#C8A06A';
const DARK = '#5A3A2A';

function pc(w: number, h: number, fn: (p: PixelCanvas) => void): HTMLCanvasElement {
  const p = new PixelCanvas(w, h);
  fn(p);
  return p.toCanvas();
}

/** The things, drawn plainly (pencilOf turns them into pencil lines). */
function thingOf(id: string): HTMLCanvasElement | null {
  switch (id) {
    case 'urenokori':
      // a plastic pack, the lid on, a rubber band round it
      return pc(17, 10, (p) => {
        p.rect(0, 3, 17, 7, FILL);
        p.rect(1, 1, 15, 3, '#E8D9B5');
        p.rect(7, 0, 2, 10, DARK);
        p.rect(2, 5, 4, 1, DARK);
        p.rect(10, 6, 5, 1, DARK);
      });
    case 'dekitate':
      // a heap on a paper plate, the steam rising
      return pc(17, 14, (p) => {
        p.ellipse(8.5, 11.5, 8.5, 2.5, '#E8D9B5');
        p.ellipse(8.5, 9.5, 6, 3, FILL);
        p.line(4, 9, 8, 8, DARK);
        p.line(9, 10, 13, 9, DARK);
        for (const x of [5, 9, 12]) {
          p.set(x, 5, DARK);
          p.set(x + 1, 4, DARK);
          p.set(x, 3, DARK);
          p.set(x + 1, 2, DARK);
        }
      });
    case 'ramune':
      return pc(7, 16, (p) => {
        p.rect(2, 0, 3, 3, FILL);
        p.rect(1, 3, 5, 3, FILL);
        p.set(3, 4, DARK);
        p.rect(2, 6, 3, 1, FILL);
        p.rect(0, 7, 7, 9, FILL);
      });
    case 'mikan':
      return pc(12, 12, (p) => {
        p.circle(6, 6.5, 5.5, FILL);
        p.rect(5, 0, 2, 2, DARK);
        p.rect(7, 0, 3, 1, DARK);
      });
    case 'jihanki':
      return pc(11, 16, (p) => {
        p.rect(0, 0, 11, 16, FILL);
        p.rect(1, 1, 9, 5, '#E8D9B5');
        for (let i = 0; i < 4; i++) p.set(2 + i * 2, 7, DARK);
        p.rect(2, 12, 7, 2, DARK);
      });
    case 'uchimizu':
      // a watering can, drops in front of its spout
      return pc(18, 12, (p) => {
        p.rect(3, 4, 9, 8, FILL);
        p.ring(7.5, 3, 3, 2.5, DARK);
        p.line(12, 9, 15, 5, FILL);
        p.line(12, 10, 15, 6, FILL);
        p.set(17, 8, DARK);
        p.set(16, 10, DARK);
        p.set(17, 11, DARK);
      });
    case 'uchimizu_ne':
      // the drops all going one way: up to the right
      return pc(16, 12, (p) => {
        for (const [x, y] of [[1, 10], [4, 7], [2, 5], [7, 9], [6, 4]] as [number, number][]) p.rect(x, y, 2, 2, FILL);
        p.line(8, 9, 14, 3, DARK);
        p.line(11, 2, 14, 2, DARK);
        p.line(14, 2, 14, 5, DARK);
      });
    case 'tofu':
      return pc(13, 10, (p) => {
        p.poly([[0, 3], [4, 0], [13, 0], [9, 3]], '#E8D9B5');
        p.rect(0, 3, 9, 7, '#F4F1E8');
        p.poly([[9, 3], [13, 0], [13, 7], [9, 10]], FILL);
      });
    case 'higasa':
      return pc(17, 15, (p) => {
        // the canopy: the top half of an oval, scalloped along its edge
        for (let yy = 0; yy <= 5; yy++)
          for (let xx = 0; xx < 17; xx++) {
            const dx = (xx + 0.5 - 8.5) / 8.5;
            const dy = (yy + 0.5 - 6) / 6;
            if (dx * dx + dy * dy <= 1) p.set(xx, yy, FILL);
          }
        for (const xx of [2, 6, 10, 14]) p.set(xx, 6, FILL);
        p.rect(8, 0, 1, 1, DARK);
        p.vline(8, 5, 13, DARK);
        p.rect(6, 13, 3, 1, DARK);
      });
    case 'shinbun':
      return pc(15, 11, (p) => {
        p.rect(0, 0, 15, 11, '#F4F1E8');
        p.rect(1, 1, 6, 3, DARK);
        for (let y = 5; y < 10; y += 2) p.hline(1, 6, y, FILL);
        for (let y = 1; y < 10; y += 2) p.hline(8, 13, y, FILL);
        p.vline(7, 0, 10, FILL);
      });
    case 'fude':
      // the brush and, beside it, the inkstone
      return pc(17, 14, (p) => {
        p.line(1, 1, 9, 9, FILL);
        p.line(2, 1, 10, 9, FILL);
        p.poly([[9, 8], [11, 10], [12, 13], [9, 11]], DARK);
        p.rect(11, 3, 6, 5, FILL);
        p.rect(12, 4, 4, 2, DARK);
      });
    case 'kansouki':
      return pc(14, 14, (p) => {
        p.rect(0, 0, 14, 14, '#E8D9B5');
        p.rect(1, 1, 12, 2, FILL);
        p.circle(7, 8.5, 4.5, FILL);
        p.circle(7, 8.5, 2.5, '#F4F1E8');
      });
    case 'keirei':
      // the officer's cap
      return pc(15, 9, (p) => {
        p.poly([[1, 0], [14, 0], [12, 6], [3, 6]], '#2F4A8A');
        p.rect(3, 4, 9, 2, DARK);
        p.rect(6, 1, 3, 2, '#FFD23F');
        p.poly([[2, 6], [13, 6], [11, 9], [4, 9]], DARK);
      });
    case 'atari':
      // a きなこぼう stick, 『当』 burnt on the end
      return pc(8, 17, (p) => {
        p.rect(2, 0, 4, 8, FILL);
        p.rect(3, 8, 2, 9, '#E8D9B5');
        p.rect(3, 13, 2, 2, DARK);
      });
    case 'tsukemono':
      // a small dish of cucumber slices
      return pc(16, 9, (p) => {
        p.ellipse(8, 6, 8, 3, '#E8D9B5');
        for (const x of [4, 8, 12]) {
          p.circle(x, 4, 2.5, FILL);
          p.set(x, 4, DARK);
        }
      });
    case 'tomatoha':
      // a tomato leaf, deeply cut
      return pc(15, 13, (p) => {
        p.line(1, 12, 13, 2, DARK);
        for (const [x, y] of [[4, 8], [7, 6], [10, 4]] as [number, number][]) {
          p.ellipse(x - 1, y - 3, 2.2, 1.6, FILL);
          p.ellipse(x + 2, y + 1, 2.2, 1.6, FILL);
        }
        p.ellipse(13, 1.5, 2, 1.5, FILL);
      });
    case 'inaho':
      // an ear of rice bowing its head
      return pc(14, 15, (p) => {
        p.line(1, 14, 5, 4, DARK);
        p.line(5, 4, 9, 2, DARK);
        p.line(9, 2, 12, 7, DARK);
        for (const [x, y] of [[6, 4], [8, 3], [10, 4], [11, 6], [12, 9], [10, 7]] as [number, number][]) p.ellipse(x + 0.5, y + 0.5, 1.2, 1.6, FILL);
        p.line(3, 9, 0, 6, FILL);
      });
    case 'iro':
      // blue and yellow, and the green between them
      return pc(17, 8, (p) => {
        p.circle(3.5, 4, 3.5, '#2F4A8A');
        p.circle(13.5, 4, 3.5, '#FFD23F');
        p.circle(8.5, 4, 2.5, '#5FA85A');
      });
    case 'shikiji':
      // the folded paper of a speech
      return pc(15, 11, (p) => {
        p.poly([[0, 1], [10, 0], [15, 2], [15, 11], [0, 10]], '#F4F1E8');
        for (let x = 2; x < 14; x += 2) p.vline(x, 3, 8, FILL);
        p.vline(10, 0, 11, FILL);
      });
    case 'tegami':
      return pc(15, 10, (p) => {
        p.rect(0, 0, 15, 10, '#F4F1E8');
        p.line(0, 0, 7, 5, FILL);
        p.line(14, 0, 7, 5, FILL);
        p.rect(11, 1, 3, 3, '#E84E3C');
      });
  }
  return null;
}

const sketchCache = new Map<string, HTMLCanvasElement | null>();
function sketch(id: string): HTMLCanvasElement | null {
  if (sketchCache.has(id)) return sketchCache.get(id)!;
  const src = thingOf(id);
  const c = src ? pencilOf(src, `hajimete:${id}`, UI.pencil) : null;
  sketchCache.set(id, c);
  return c;
}

let faceC: HTMLCanvasElement | null = null;
/**
 * グソっ君の えんぴつの、しゅんの 顔（24×22）：まるい 顔、はねた 1本（アホ毛）、うしろに 虫とりあみの わく、
 * にっこり。少し ゆがんだ 線（グソっ君の 手）。
 */
export function uraFace(): HTMLCanvasElement {
  if (faceC) return faceC;
  const ink = UI.pencil;
  const p = new PixelCanvas(26, 23);
  // the net's hoop behind him, top left
  p.ring(5, 5, 4, 4, ink);
  // the face, a little lopsided
  p.ring(14, 13, 8.5, 8, ink);
  // hair: a jagged line over the brow, the one ahoge
  for (let x = 7; x <= 21; x++) p.set(x, 7 + ((x * 7) % 3 === 0 ? 1 : 0), ink);
  p.line(14, 5, 15, 1, ink);
  p.line(15, 1, 18, 2, ink);
  // the eyes and the smile
  p.rect(10, 11, 2, 2, ink);
  p.rect(17, 11, 2, 2, ink);
  p.line(10, 16, 12, 18, ink);
  p.line(12, 18, 17, 18, ink);
  p.line(17, 18, 19, 16, ink);
  faceC = p.toCanvas();
  return faceC;
}

// ---------------------------------------------------------------- ★

let starC: HTMLCanvasElement | null = null;
/** グソっ君の ★（7×7、朱）。 */
function star(): HTMLCanvasElement {
  if (starC) return starC;
  const p = new PixelCanvas(7, 7);
  p.art(['...o...', '..ooo..', 'ooooooo', '.ooooo.', '..ooo..', '.oo.oo.', 'o.....o'], { o: UI.accent });
  starC = p.toCanvas();
  return starC;
}

const STAR_STEP = 9;
/** The width of the ★ box (five stars). */
export const STAR_BOX_W = 5 * STAR_STEP + 5;

/**
 * The びっくり度 box at (x, y): five places drawn in pencil; `n` stars in 朱 —
 * the sixth sticks out past the box's right edge, a little higher and fatter.
 * `n` 0 writes a 「？」 in it; `empty` leaves it bare (the back cover).
 */
export function drawStars(g: Gfx, x: number, y: number, n: number, empty = false): void {
  const w = STAR_BOX_W;
  g.rect(x, y, w, 1, UI.pencil);
  g.rect(x, y + 11, w, 1, UI.pencil);
  g.rect(x, y, 1, 12, UI.pencil);
  g.rect(x + w - 1, y, 1, 12, UI.pencil);
  if (empty) return;
  if (n <= 0) {
    g.text('？', x + Math.round(w / 2) - 8, y - 3, { color: UI.accent });
    return;
  }
  const s = star();
  for (let i = 0; i < Math.min(5, n); i++) g.img(s, x + 3 + i * STAR_STEP, y + 3);
  // ★6: past the box, drawn bigger, as if the pencil ran on
  for (let i = 5; i < n; i++) g.img(s, x + w + 1 + (i - 5) * 13, y - 3, { scale: 2 });
}

// ---------------------------------------------------------------- the right page

/** One row's page. `x, y, w`: the right page's column. */
export function drawHajimetePage(g: Gfx, row: HajimeteRow | undefined, x: number, y: number, w: number, vol: 1 | 2): void {
  if (!row) return;
  drawStarSum(g, vol);
  if (row.id === 'ura') return drawUraPage(g, x, y, w);
  const e = row.entry!;
  if (!row.done) {
    g.text('…………', x, y + 6, { color: UI.textDim });
    dottedLine(g, x, y + 30, x + w - 8, UI.textDim, 3);
    if (e.hint) fitWrap(`（${e.hint}）`, w).slice(0, 2).forEach((l, j) => pageText(g, l.text, x, y + 40 + j * 17, { color: UI.pencil, spacing: l.spacing }));
    return;
  }
  // the sketch at the top left, the ★ box at the top right
  const img = sketch(e.id);
  if (img) {
    const sc = img.width * 2 <= 40 && img.height * 2 <= 34 ? 2 : 1;
    g.img(img, x + Math.round((40 - img.width * sc) / 2), y + Math.round((30 - img.height * sc) / 2) - 4, { scale: sc });
  }
  // (★6 runs past the box: the box sits that much further in)
  const over = e.stars > 5 ? (e.stars - 5) * 13 + 2 : 0;
  const bx = Math.min(x + w - 6 - STAR_BOX_W - over, clearRight(999, y + 2, y + 14) - STAR_BOX_W - over);
  drawStars(g, Math.max(x + 44, bx), y + 6, e.stars);
  let ty = y + 30;
  const nm = fitWrap(e.name, w).slice(0, 2);
  nm.forEach((l, j) => pageText(g, l.text, x + (j ? 8 : 0), ty + j * 16, { color: UI.text, spacing: l.spacing }));
  ty += nm.length * 16 + 1;
  pencilLine(g, x, ty, w - 6, 1, UI.pencil, 60 + HAJIMETE.indexOf(e));
  ty += 3;
  // who taught it, in pencil
  const fr = fitWrap(fromLine(e), w).slice(0, 2);
  fr.forEach((l, j) => pageText(g, l.text, x + (j ? 8 : 0), ty + j * 16, { color: UI.pencil, spacing: l.spacing }));
  ty += fr.length * 16 + 4;
  // his word
  const bottom = SP.y + SP.h - 10;
  const note = fitWrap(e.note, w);
  note.slice(0, Math.max(1, Math.floor((bottom - ty) / 16))).forEach((l, j) => pageText(g, l.text, x, ty + j * 16, { color: UI.text, spacing: l.spacing }));
}

/** ★ in all, in this notebook: the page's top right corner (like the ツッコミ count of あいて). */
function drawStarSum(g: Gfx, vol: 1 | 2): void {
  const n = String(hajimeteStars(vol));
  const rx = SP.x + SP.w - 12;
  drawDigits(g, n, rx, SP.y + 12, { color: UI.accent, align: 'right' });
  g.img(star(), rx - digitsWidth(n) - 10, SP.y + 11);
}

/** 裏表紙：グソっ君の 絵（しゅんの 顔）、『はじめての ともだち』、からっぽの ★の 欄、ひとこと。 */
function drawUraPage(g: Gfx, x: number, y: number, w: number): void {
  const f = uraFace();
  g.img(f, x + Math.round((w - 6 - f.width * 2) / 2), y - 6, { scale: 2 });
  let ty = y + 42;
  fitWrap(URA_TITLE, w).slice(0, 2).forEach((l, j) => pageText(g, l.text, x, ty + j * 16, { color: UI.text, spacing: l.spacing }));
  ty += fitWrap(URA_TITLE, w).slice(0, 2).length * 16 + 3;
  drawStars(g, x + Math.round((w - 6 - STAR_BOX_W) / 2), ty, 0, true);
  ty += 17;
  fitWrap(URA_NOTE, w).slice(0, 3).forEach((l, j) => pageText(g, l.text, x, ty + j * 16, { color: UI.text, spacing: l.spacing }));
}

/** The back cover drawn for the scene's card (paper `w`×`h` at x, y; 2× inside). */
export function drawUraCard(g: Gfx, x: number, y: number, w: number, h: number): void {
  g.rect(x + 3, y + 4, w, h, '#0B0B14', 0.4);
  g.rect(x, y, w, h, '#2F4A8A');
  g.rect(x + 3, y + 3, w - 6, h - 6, UI.bg);
  const f = uraFace();
  g.img(f, x + Math.round(w / 2 - f.width), y + 10, { scale: 2 });
  const tw = g.measure(URA_TITLE);
  g.text(URA_TITLE, x + Math.round(w / 2 - tw / 2), y + 10 + f.height * 2 + 4, { color: UI.text });
  drawStars(g, x + Math.round(w / 2 - STAR_BOX_W / 2), y + 10 + f.height * 2 + 26, 0, true);
}

export function hajimeteRowLabel(r: HajimeteRow): string {
  return r.name;
}

// ---------------------------------------------------------------- QA

if (import.meta.env.DEV) {
  /** Every row and page of 『はじめて』 fits: the index in 2 lines, the name and who in 1, his word in 3 (wrapCheck). */
  registerDebug('hajimeteBookText', () => {
    const bad: string[] = [];
    let pages = 0;
    const w = RP.w;
    for (const e of HAJIMETE) {
      pages++;
      if (phraseWrap(e.name, bookLabelW()).length > 2) bad.push(`${e.id}: name ${e.name}`);
      const nl = fitWrap(e.name, w).length;
      const fl = fitWrap(fromLine(e), w).length;
      if (nl > 2) bad.push(`${e.id}: name on the page ${e.name}`);
      if (fl > 2) bad.push(`${e.id}: from ${fromLine(e)}`);
      // (the page holds 6 lines under the sketch: name, who, his word)
      if (nl + fl + fitWrap(e.note, w).length > 6) bad.push(`${e.id}: page too full ${e.note}`);
      if (e.hint && fitWrap(`（${e.hint}）`, w).length > 2) bad.push(`${e.id}: hint ${e.hint}`);
      if (!sketch(e.id)) bad.push(`${e.id}: no sketch`);
    }
    if (fitWrap(URA_TITLE, w).length > 2) bad.push(`ura: title`);
    if (fitWrap(URA_NOTE, w).length > 3) bad.push(`ura: note`);
    if (phraseWrap(URA_ROW, bookLabelW()).length > 2) bad.push(`ura: row`);
    return { pages, bad };
  });
}
