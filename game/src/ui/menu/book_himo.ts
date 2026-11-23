// みました帳②の すみの 1ページ『紐の 番』（02_ch2_index、events/ch2/himo.ts。案の 題は「鍵は ポケットに」、
// ID は 案の まま）：つるを 取った あと（flag_hm_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。
// 右の ページに 題、ロータリーの 爪と クズの 花・紐の 鉛筆の 絵、はしから 切った つる ○/3、枕もとへ とどけたか、
// まつ先生の「紐の 番が おれば、手は、安心して 出せるのよ。」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.hmBookText()、bookPeek('hm')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { HM_BOOK } from '../../data/text/hoshi_himo';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasHmPage(): boolean {
  return flag('flag_hm_done') > 0;
}

export const HM_ROW_LABEL = HM_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 32;

/** 爪（鉛筆）：軸と 曲がった 爪、紐の 握り、クズの 花。 */
function tsume(g: Gfx, x: number, y: number): void {
  const pc = UI.pencil;
  g.line(x, y + 14, x + 52, y + 14, pc);
  for (let i = 0; i < 5; i++) {
    const bx = x + 4 + i * 11;
    g.line(bx, y + 14, bx + 4, y + 6, pc);
    g.line(bx + 4, y + 6, bx + 8, y + 8, pc);
    g.line(bx + 2, y + 14, bx + 6, y + 22, pc);
    g.line(bx + 6, y + 22, bx + 9, y + 21, pc);
  }
  // the starter cord's grip hanging on its cord
  g.line(x + 62, y, x + 66, y + 16, pc);
  g.frame(x + 63, y + 16, 7, 4, pc);
  // the kuzu's purple flowers
  for (let f = 0; f < 5; f++) g.rect(x + 76 + (f % 2) * 3, y + 6 + f * 3, 3, 3, f % 2 ? '#9A5AB0' : '#B878C8');
  g.line(x + 78, y + 4, x + 80, y + 22, '#4E7A3A');
}

export function drawHmPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(HM_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 116);
  let ly = y + TITLE_H + 6;
  tsume(g, x + 6, ly);
  ly += PIC_H;
  const n = Math.min(3, flag('flag_hm_hashi'));
  pageText(g, HM_BOOK.how(n), x + 2, ly, { color: n >= 3 ? UI.accent : UI.text });
  ly += LINE_H;
  if (flag('flag_hm_makura')) pageText(g, HM_BOOK.makura, x + 2, ly, { color: UI.text });
  ly += LINE_H + 2;
  for (const l of HM_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function hmBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(HM_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(HM_BOOK.title) > room) bad.push(`${HM_BOOK.title}: ${textW(HM_BOOK.title)}px`);
  if (2 + textW(HM_BOOK.how(3)) > room) bad.push(`${HM_BOOK.how(3)}: wide`);
  if (2 + textW(HM_BOOK.makura) > room) bad.push(`${HM_BOOK.makura}: wide`);
  for (const l of HM_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (94 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * 2 + 2 + LINE_H * HM_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('hmBookText', () => hmBookCheck());
addBookPeek('hm', drawHmPage);
