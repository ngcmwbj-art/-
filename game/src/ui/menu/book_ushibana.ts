// みました帳②の すみの 1ページ『鼻が しゃべる』（02_ch2_index、events/ch2/ushibana.ts）：3房の 牛の 鼻を 見た
// あと（flag_ub_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、柵越しの
// 3頭の 鼻の 鉛筆の 絵（光る 鼻・舌・粉）、すみに 顔を 突き出した グソっ君と、その 横に マサルの 字で「鼻？」、
// 見た 鼻 ○/3・見た 所 ○/3、マサルの「牛は、しゃべらん。……鼻が しゃべる。」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.ubBookText()、bookPeek('ub')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { UB_BOOK } from '../../data/text/hoshi_ushibana';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasUbPage(): boolean {
  return flag('flag_ub_done') > 0;
}

export const UB_ROW_LABEL = UB_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;

const bits = (b: number) => [0, 1, 2].filter((i) => b & (1 << i)).length;

/** 鼻 1つ（鉛筆）：鼻の 板と 2つの 穴。k 0 光る・1 舌・2 粉。 */
function nose(g: Gfx, x: number, y: number, k: number): void {
  const c = UI.pencil;
  g.line(x + 2, y, x + 20, y, c);
  g.line(x, y + 2, x, y + 8, c);
  g.line(x + 22, y + 2, x + 22, y + 8, c);
  g.line(x + 2, y + 10, x + 20, y + 10, c);
  g.px(x + 1, y + 1, c);
  g.px(x + 21, y + 1, c);
  g.px(x + 1, y + 9, c);
  g.px(x + 21, y + 9, c);
  for (const dx of [5, 15]) {
    g.line(x + dx, y + 4, x + dx + 2, y + 4, c);
    g.line(x + dx, y + 6, x + dx + 2, y + 6, c);
  }
  // the rail in front
  g.line(x - 2, y + 14, x + 24, y + 14, '#A8A4B4');
  if (k === 0) for (const [dx, dy] of [[4, -3], [11, -4], [18, -3], [8, -2]] as const) g.px(x + dx, y + dy, c);
  if (k === 1) {
    // the tongue up into a nostril
    g.line(x + 6, y + 13, x + 3, y + 9, '#C86A78');
    g.line(x + 3, y + 9, x + 5, y + 5, '#C86A78');
  }
  if (k === 2) for (const [dx, dy] of [[4, 2], [9, 8], [14, 3], [18, 7], [11, 1]] as const) g.px(x + dx, y + dy, '#B09060');
}

/** グソっ君の 顔（鉛筆）：丸い 頭の 節と 目。 */
function kaneFace(g: Gfx, x: number, y: number): void {
  const c = UI.pencil;
  g.line(x + 3, y, x + 11, y, c);
  g.line(x, y + 3, x, y + 10, c);
  g.line(x + 14, y + 3, x + 14, y + 10, c);
  g.line(x + 3, y + 13, x + 11, y + 13, c);
  g.px(x + 1, y + 1, c);
  g.px(x + 13, y + 1, c);
  g.px(x + 1, y + 12, c);
  g.px(x + 13, y + 12, c);
  g.line(x + 2, y + 5, x + 12, y + 5, c);
  g.px(x + 4, y + 8, c);
  g.px(x + 10, y + 8, c);
}

export function drawUbPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(UB_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 117);
  let ly = y + TITLE_H + 6;
  for (let k = 0; k < 3; k++) nose(g, x + 6 + k * 30, ly + 6, k);
  kaneFace(g, x + 100, ly + 2);
  g.text(UB_BOOK.memo, x + 100, ly + 18, { color: '#5A6A8A' });
  ly += PIC_H;
  const h = bits(flag('flag_ub_pen'));
  const t = bits(flag('flag_ub_part'));
  pageText(g, UB_BOOK.hana(h), x + 2, ly, { color: h >= 3 ? UI.accent : UI.text });
  ly += LINE_H;
  pageText(g, UB_BOOK.tokoro(t), x + 2, ly, { color: t >= 3 ? UI.accent : UI.text });
  ly += LINE_H + 2;
  for (const l of UB_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function ubBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(UB_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(UB_BOOK.title) > room) bad.push(`${UB_BOOK.title}: ${textW(UB_BOOK.title)}px`);
  if (2 + textW(UB_BOOK.hana(3)) > room) bad.push(`${UB_BOOK.hana(3)}: wide`);
  if (2 + textW(UB_BOOK.tokoro(3)) > room) bad.push(`${UB_BOOK.tokoro(3)}: wide`);
  if (100 + textW(UB_BOOK.memo) > room) bad.push(`${UB_BOOK.memo}: wide`);
  for (const l of UB_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * 2 + 2 + LINE_H * UB_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('ubBookText', () => ubBookCheck());
addBookPeek('ub', drawUbPage);
