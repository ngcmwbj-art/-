// みました帳②の すみの 1ページ『朝の 前の 色』（02_ch2_index #104、events/ch2/asairo.ts）：
// 名場面の あと（flag_as_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。
// 右の ページに 題、3つの 露（サトイモの 葉の 玉・稲の 葉の 先の 玉・クモの 巣の 首かざり）の 鉛筆の 絵と
// ソワカの ひとこと、露 3/3、うすい 墨の ひとはけ。かくしの トマトの 露を 入れたら、トマトの 葉の 絵が 1つ 足される。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.asBookText()

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { AS_BOOK } from '../../data/text/hoshi_asairo';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';

export function hasAsPage(): boolean {
  return flag('flag_as_done') > 0;
}

export const AS_ROW_LABEL = AS_BOOK.title;

const TITLE_H = 17;
const ROW_H = 16;
const LINE_H = 16;
const DEW = '#7FB8D0';
/** うすい 墨（夜と 朝の あいだ）。 */
const SUMI = ['#3A3F5A', '#5A5A78', '#8A84A0', '#B8A8B8'];

/** 小さな 鉛筆の 絵（0 サトイモ・1 稲・2 クモの 巣・3 トマト）と、その 露。 */
function sketch(g: Gfx, k: number, x: number, y: number): void {
  const pc = UI.pencil;
  if (k === 0) {
    for (let dx = -6; dx <= 6; dx++) g.px(x + dx, y + 4 - Math.round(Math.abs(dx) / 3), pc);
    g.px(x, y + 5, pc);
    g.px(x, y + 6, pc);
    g.circle(x + 1, y + 1, 2, DEW);
  } else if (k === 1) {
    for (let dy = 0; dy < 9; dy++) g.px(x - 3 + Math.round(dy / 3), y + 8 - dy, pc);
    g.px(x, y - 1, DEW);
    g.px(x + 1, y - 1, DEW);
    g.px(x, y - 2, DEW);
  } else if (k === 2) {
    for (let a = 0; a < 6; a++) g.line(x, y + 2, Math.round(x + Math.cos(a) * 6), Math.round(y + 2 + Math.sin(a) * 5), pc);
    for (const [dx, dy] of [[-3, 0], [2, -2], [4, 3], [-2, 5]] as const) g.px(x + dx, y + 2 + dy, DEW);
  } else {
    for (let dx = -5; dx <= 5; dx++) g.px(x + dx, y + 3 + (dx % 2 === 0 ? 0 : 1), pc);
    g.px(x - 5, y + 2, DEW);
    g.px(x + 5, y + 2, DEW);
    g.px(x, y + 1, DEW);
  }
}

export function drawAsPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(AS_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 104);
  let ly = y + TITLE_H + 6;
  const rows: [string, string][] = [...AS_BOOK.rows];
  if (flag('flag_as_tsuyu_tomato')) rows.push(AS_BOOK.tomato);
  rows.forEach(([name], i) => {
    sketch(g, i, x + 7, ly + 2);
    pageText(g, name, x + 18, ly, { color: UI.text });
    ly += ROW_H;
  });
  if (rows.length < 4) ly += ROW_H;
  // ソワカの ひとこと（クモの 巣の 墨）
  pageText(g, AS_BOOK.quote, x + 4, ly + 2, { color: '#5A5A78' });
  ly += LINE_H + 4;
  // 露 3/3、そして うすい 墨の ひとはけ
  pageText(g, `${AS_BOOK.count} 3/3`, x, ly, { color: UI.pencil });
  const bx = x + w - 62;
  SUMI.forEach((c, k) => g.rect(bx + k * 12, ly + 5 - (k % 2), 14, 4, c));
  pageText(g, AS_BOOK.hake, x + w - 6 - textW(AS_BOOK.hake), ly + LINE_H, { color: '#5A5A78' });
}

export function asBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(AS_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(AS_BOOK.title) > room) bad.push(`${AS_BOOK.title}: ${textW(AS_BOOK.title)}px`);
  for (const [name] of [...AS_BOOK.rows, AS_BOOK.tomato]) if (18 + textW(name) > room) bad.push(`${name}: ${18 + textW(name)}px`);
  if (4 + textW(AS_BOOK.quote) > room) bad.push(`${AS_BOOK.quote}: ${4 + textW(AS_BOOK.quote)}px`);
  if (textW(`${AS_BOOK.count} 3/3`) > room - 64) bad.push(`count: ${textW(`${AS_BOOK.count} 3/3`)}px`);
  if (textW(AS_BOOK.hake) > room) bad.push(`${AS_BOOK.hake}: ${textW(AS_BOOK.hake)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + ROW_H * 4 + LINE_H + 4 + LINE_H * 2;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('asBookText', () => asBookCheck());
