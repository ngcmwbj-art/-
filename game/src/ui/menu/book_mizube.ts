// みました帳の『みずべ』（水辺の 図鑑、02_ch2_index #81、30_level_art 10.7、52_ch2_level_art 13.2）。
// ① 夕鳴町（ザリガニ・テナガエビ・メダカ・ツバメ 12種＋らん外 おぴぃの 長靴）、② 星見台（ドジョウ・
// ヤゴ・カワニナ・沢ガニ・用水路の ぬし 7種）。②の『むし』と 同じ 作り：左の ページに 名前の 一覧
// （見ていない 種は「…………」）、右の ページに しゅんの えんぴつの 絵・名前・場所（ピン）・記録の
// 2つの 欄（本当／おぴぃ 認定。②は『トマじいは 盛らない』）・ひとこと。見ていない 種は「…………」と、
// どこに いそうかの 1行だけ。段階1に 取った 種は すみに『止まっていた 1ぴき』。
//
// 一覧の いちばん 下に 番号なしの 行：『釣った 数』（場所ごとの ザリ拓と 数）、①を ぜんぶ うめて
// おぴぃが 書きこんだら『おぴぃの 書きこみ』（ちがう 筆の 字と 朱の「認」）。
// 数（/12・/7）には らん外と 下の 行を 入れない。
//
// QA：__game.cmd.mizube({ all: true }) で ①を うめる、wrapCheck() が ページの 字を 見る。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { dottedLine, fitWrap, pencilLine, UI } from '../window';
import { pageText, SP } from './notebook';
import { OPI_NOTE, STILL_LABEL, TOME_LABEL, ZUKAN, zukanBook, zukanCm, zukanCount, zukanSeen, zukanStill, type ZukanEntry } from '../../data/text/mizube_book';
import { bootImg, canImg, crayfish } from '../../art/props/tsuri_art';
import { goby, pencilOf, shrimp } from '../../art/props/seki_tsuri_art';
import { creature } from '../../art/props/yoburi_art';
import { PixelCanvas } from '../../engine/pixel';

export const MIZUBE_TAB = 'みずべ';

/** The notebook has its 『みずべ』 section. */
export function hasMizube(vol: 1 | 2): boolean {
  return zukanBook(vol);
}

/** A row of the index: a kind, or one of the unnumbered pages at the bottom. */
export interface MizubeRow {
  id: string;
  name: string;
  /** Number shown (01–12), or '' for the bonus and the bottom pages. */
  num: string;
  done: boolean;
  /** The bottom pages: pencil. */
  pencil?: boolean;
  entry?: ZukanEntry;
}

const COUNT_ROW = { 1: '釣った 数', 2: 'すくった 数' } as const;
const OPI_ROW = 'おぴぃの 書きこみ';

export function mizubeRows(vol: 1 | 2): MizubeRow[] {
  const list = ZUKAN.filter((e) => e.vol === vol);
  const rows: MizubeRow[] = [];
  let n = 0;
  for (const e of list) {
    if (e.bonus && !zukanSeen(e.id)) continue;
    rows.push({ id: e.id, name: e.name, num: e.bonus ? '' : String(++n).padStart(2, '0'), done: zukanSeen(e.id), entry: e });
  }
  const counted = vol === 1 ? flag('flag_zari_count') + flag('flag_mizube_count') : flag('flag_yoburi_count');
  if (counted > 0) rows.push({ id: 'count', name: COUNT_ROW[vol], num: '', done: true, pencil: true });
  if (vol === 1 && flag('flag_mizube_yurai_done')) rows.push({ id: 'opi', name: OPI_ROW, num: '', done: true, pencil: true });
  return rows;
}

export function mizubeHave(vol: 1 | 2): [number, number] {
  return zukanCount(vol);
}

// ---------------------------------------------------------------- the sketches

const sketchCache = new Map<string, HTMLCanvasElement>();

/** A small fish for the bait shop's medaka (12×6). */
function medakaImg(): HTMLCanvasElement {
  const p = new PixelCanvas(13, 6);
  p.art(['....oooo.....', '..oLLLLLoo.o.', '.oLeLLLLLLoLo', '.oBBBBBBBBoBo', '..oBBBBBoo.o.', '....ooo......'], {
    o: '#2A2440',
    L: '#C8B890',
    B: '#E8D8B0',
    e: '#0B0B14',
  });
  return p.toCanvas();
}

/** A swallow gliding (16×9): the forked tail, the long wings, the white belly. */
function tsubameImg(): HTMLCanvasElement {
  const p = new PixelCanvas(17, 9);
  p.art(
    ['oo.............oo', '.oKo.........oKo.', '..oKKo.....oKKo..', '...oKKKoooKKKo...', '....oKKRRKKo.....', '.....oWWWWo......', '......oWWo.......', '.....oo..oo......', '....o......o.....'],
    { o: '#2A2440', K: '#2F4A8A', R: '#B8241E', W: '#F4F1E8' },
  );
  return p.toCanvas();
}

/** A stream crab (10×7). */
function kaniImg(): HTMLCanvasElement {
  const p = new PixelCanvas(11, 8);
  p.art(['.o.......o.', 'oRo.....oRo', '.oRo...oRo.', '..oRRRRRo..', '.oRReRReRo.', 'oRRRRRRRRRo', '.o.o.o.o.o.', 'o.o.....o.o'], { o: '#2A2440', R: '#C8402E', e: '#0B0B14' });
  return p.toCanvas();
}

function spriteOf(id: string): HTMLCanvasElement | null {
  const [cm] = zukanCm(id);
  switch (id) {
    case 'kozari':
    case 'zari':
    case 'makka':
      return crayfish(id, Math.max(id === 'kozari' ? 5 : id === 'zari' ? 8 : 11, Math.min(12, cm || 0)), { leg: 0, open: 0 }).img;
    case 'zari_nushi':
      return crayfish('nushi', 13, { leg: 0, open: 0 }).img;
    case 'can':
      return canImg();
    case 'boot':
      return bootImg();
    case 'mesu':
    case 'osu':
    case 'tamago':
    case 'taisho':
      return shrimp(id, id === 'taisho' ? 9 : Math.max(5, Math.min(9, cm || (id === 'osu' ? 8 : 6))), { leg: 0 }).img;
    case 'goby':
      return goby(Math.max(4, Math.min(6, cm || 5)), { leg: 0 }).img;
    case 'medaka':
      return medakaImg();
    case 'tsubame':
      return tsubameImg();
    case 'sawagani':
      return kaniImg();
    case 'dojou':
    case 'chibi':
    case 'ooki':
    case 'yago':
    case 'kawanina':
    case 'dojou_nushi':
      return creature(id, id === 'dojou_nushi' ? 20 : Math.max(2, cm || (id === 'chibi' ? 5 : id === 'ooki' ? 16 : id === 'yago' ? 4 : id === 'kawanina' ? 3 : 11)), 0).img;
  }
  return null;
}

/** しゅんの えんぴつの 絵（その 種の いちばん 大きい 記録の 大きさで）。 */
function sketch(id: string): HTMLCanvasElement | null {
  const [cm] = zukanCm(id);
  const key = `${id}:${cm}`;
  const hit = sketchCache.get(key);
  if (hit) return hit;
  const src = spriteOf(id);
  if (!src) return null;
  const c = pencilOf(src, `mizube:${key}`, UI.pencil);
  sketchCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- the right page

/** One row's page. `x, y, w`: the right page's column. */
export function drawMizubePage(g: Gfx, row: MizubeRow | undefined, x: number, y: number, w: number, vol: 1 | 2): void {
  if (!row) return;
  if (row.id === 'count') return drawCountPage(g, x, y, w, vol);
  if (row.id === 'opi') return drawOpiPage(g, x, y, w);
  const e = row.entry!;
  if (!row.done) {
    // not seen: dots, and where it might be
    g.text('…………', x, y + 6, { color: UI.textDim });
    dottedLine(g, x, y + 30, x + w - 8, UI.textDim, 3);
    if (e.hint) fitWrap(`（${e.hint}）`, w).slice(0, 2).forEach((l, j) => pageText(g, l.text, x, y + 40 + j * 17, { color: UI.pencil, spacing: l.spacing }));
    return;
  }
  // the sketch, as large as the column lets it be (2×, or 1× when that is too tall)
  const img = sketch(e.id);
  let ty = y;
  if (img) {
    const sc = img.width * 2 <= w - 6 && img.height * 2 <= 34 ? 2 : 1;
    const ih = img.height * sc;
    g.img(img, x + Math.round((w - 6 - img.width * sc) / 2), y - 4, { scale: sc });
    ty = y + Math.min(34, ih) + 2;
  }
  const nm = fitWrap(e.name, w)[0];
  pageText(g, nm.text, x, ty, { color: UI.text, spacing: nm.spacing });
  ty += 17;
  // the place, with a map pin
  g.rect(x + 1, ty + 5, 3, 3, UI.accent);
  g.px(x + 2, ty + 8, UI.accentDark);
  const pl = fitWrap(e.place, w - 8).slice(0, 2);
  pl.forEach((l, j) => pageText(g, l.text, x + 7, ty + j * 16, { color: UI.pencil, spacing: l.spacing }));
  ty += pl.length * 16 + 1;
  // the record: 本当 (pencil) and 認定 (red) on one line when they fit; ②: トマじいは 盛らない
  const [real, cert] = zukanCm(e.id);
  if (e.measure === 'none' || e.measure === 'see') {
    pageText(g, e.measure === 'none' ? '計らない' : '見た', x, ty, { color: UI.accent });
    ty += 17;
  } else if (real > 0) {
    const a = `本当${real}cm`;
    const b = vol === 2 ? TOME_LABEL : `認定${cert || real}cm${e.id === 'osu' && cert >= real + 5 ? '（手こみ）' : ''}`;
    if (g.measure(`${a} ${b}`) <= w - 2) {
      pageText(g, a, x, ty, { color: UI.pencil });
      pageText(g, b, x + g.measure(a + ' '), ty, { color: UI.accent });
      ty += 17;
    } else {
      pageText(g, a, x, ty, { color: UI.pencil });
      fitWrap(b, w).slice(0, 1).forEach((l) => pageText(g, l.text, x, ty + 16, { color: UI.accent, spacing: l.spacing }));
      ty += 33;
    }
  }
  // its word (who said it, in pencil)
  const note = fitWrap(e.note, w);
  const bottom = SP.y + SP.h - 10;
  const still = zukanStill(e.id);
  const room = Math.floor((bottom - ty - (still ? 16 : 0)) / 16);
  note.slice(0, Math.max(1, room)).forEach((l, j) => pageText(g, l.text, x, ty + j * 16, { color: UI.text, spacing: l.spacing }));
  ty += Math.min(note.length, Math.max(1, room)) * 16;
  if (still) {
    // the corner of the page: 『止まっていた 1ぴき』
    const t = fitWrap(STILL_LABEL, w)[0];
    pageText(g, t.text, x, Math.min(ty, bottom - 15), { color: UI.pencil, spacing: t.spacing });
  }
}

/** 『釣った 数』（①：場所ごとの ザリ拓と 数）／『すくった 数』（②）。 */
function drawCountPage(g: Gfx, x: number, y: number, w: number, vol: 1 | 2): void {
  const lines: [string, string][] = [];
  if (vol === 1) {
    const taku = [
      ['草の下', flag('flag_zari_taku_kusa')],
      ['石の陰', flag('flag_zari_taku_ishi')],
      ['土管', flag('flag_zari_taku_dokan')],
    ] as [string, number][];
    const gobies = flag('flag_mizube_count_goby');
    lines.push(['ザリガニ', `${flag('flag_zari_count')}ひき`]);
    lines.push(['テナガエビ', `${Math.max(0, flag('flag_mizube_count') - gobies)}ひき`]);
    if (gobies) lines.push(['ヨシノボリ', `${gobies}ひき`]);
    const best = flag('flag_mizube_best');
    if (best) lines.push(['エビの 記録', `${best}cm`]);
    g.text(COUNT_ROW[1], x, y, { color: UI.text });
    pencilLine(g, x, y + 17, w - 6, 1, UI.pencil, 41);
    let ty = y + 22;
    for (const [a, b] of lines) {
      pageText(g, a, x, ty, { color: UI.pencil });
      g.text(b, x + w - 8, ty, { color: UI.accent, align: 'right' });
      ty += 17;
    }
    ty += 4;
    g.text('ザリ拓', x, ty, { color: UI.text });
    ty += 17;
    for (const [a, b] of taku) {
      pageText(g, a, x + 8, ty, { color: UI.pencil });
      g.text(b ? `${b}cm` : '……', x + w - 8, ty, { color: b ? UI.accent : UI.textDim, align: 'right' });
      ty += 16;
    }
    return;
  }
  g.text(COUNT_ROW[2], x, y, { color: UI.text });
  pencilLine(g, x, y + 17, w - 6, 1, UI.pencil, 43);
  let ty = y + 22;
  for (const [a, b] of [
    ['すくった', `${flag('flag_yoburi_count')}ひき`],
    ['夜振り', `${flag('flag_yoburi_rounds')}回`],
  ] as [string, string][]) {
    pageText(g, a, x, ty, { color: UI.pencil });
    g.text(b, x + w - 8, ty, { color: UI.accent, align: 'right' });
    ty += 17;
  }
  ty += 4;
  fitWrap('数えて、放した。', w).forEach((l, j) => pageText(g, l.text, x, ty + j * 16, { color: UI.text, spacing: l.spacing }));
}

/** おぴぃの 書きこみ：ちがう 筆（インクの 紺）の 字と、朱の「認」。 */
function drawOpiPage(g: Gfx, x: number, y: number, w: number): void {
  const ink = '#2F4A8A';
  let ty = y + 8;
  for (const l of OPI_NOTE) {
    fitWrap(l, w).forEach((f) => {
      pageText(g, f.text, x + 2, ty, { color: ink, spacing: f.spacing });
      ty += 18;
    });
  }
  // her seal: the vermilion 認
  const sx = x + w - 34;
  const sy = ty + 8;
  g.rect(sx, sy, 22, 22, UI.accent);
  g.rect(sx + 2, sy + 2, 18, 18, UI.bg);
  g.text('認', sx + 3, sy + 3, { color: UI.accent });
}

/** The words a row shows in the index (its name; the bottom pages in pencil). */
export function mizubeRowLabel(r: MizubeRow): string {
  return r.name;
}

let zariStickerC: HTMLCanvasElement | null = null;
/** ザリガニの シール（①の 表紙の すみ、16×12）：白い 丸に 赤い ザリガニ。 */
export function stickerZari(): HTMLCanvasElement {
  if (zariStickerC) return zariStickerC;
  const p = new PixelCanvas(18, 12);
  p.ellipse(9, 6, 8.5, 5.6, '#F4F1E8');
  const c = p.toCanvas();
  const im = crayfish('makka', 6, { leg: 0, open: 0 }).img;
  c.getContext('2d')!.drawImage(im, Math.round(9 - im.width / 2), Math.round(6 - im.height / 2));
  zariStickerC = c;
  return c;
}

// ---------------------------------------------------------------- QA

import { registerDebug } from '../../debug';
import { phraseWrap } from '../window';
import { bookLabelW } from './book';
import { RP } from './notebook';

/** Every row and page of 『みずべ』 fits: the index in 2 lines, the place in 2, the hint and the word in 2 (wrapCheck). */
registerDebug('mizubeBookText', () => {
  const bad: string[] = [];
  let pages = 0;
  const w = RP.w;
  for (const e of ZUKAN) {
    pages++;
    if (phraseWrap(e.name, bookLabelW()).length > 2) bad.push(`${e.id}: name ${e.name}`);
    if (fitWrap(e.name, w).length > 1) bad.push(`${e.id}: name on the page ${e.name}`);
    if (fitWrap(e.place, w - 8).length > 2) bad.push(`${e.id}: place ${e.place}`);
    if (e.hint && fitWrap(`（${e.hint}）`, w).length > 2) bad.push(`${e.id}: hint ${e.hint}`);
    if (fitWrap(e.note, w).length > 2) bad.push(`${e.id}: note ${e.note}`);
  }
  for (const l of OPI_NOTE) if (fitWrap(l, w).length > 2) bad.push(`line: ${l}`);
  for (const l of [STILL_LABEL, TOME_LABEL]) if (fitWrap(l, w).length > 1) bad.push(`line: ${l}`);
  return { pages, bad };
});
