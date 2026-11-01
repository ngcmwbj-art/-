// みました帳③の すみの 1ページ『掃除は 上から』（03_ch3_index、events/ch3/okujou.ts）：屋上の 排水口の
// あと（flag_oj_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 屋上の 排水口と 網・止まった カモメの 鉛筆の 絵、屋上の 物 ○/5、ボール（下へ・持っている・返した）、
// ハキコの「下を 掃く 人と、上を 掃く 人。」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.ojBookText()、bookPeek('oj')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { OJ_BOOK } from '../../data/text/c3_okujou';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasOjPage(): boolean {
  return flag('flag_oj_done') > 0;
}

export const OJ_ROW_LABEL = OJ_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;

/** 排水口の ふたの 網（鉛筆）。 */
function ami(g: Gfx, x: number, y: number): void {
  const pc = UI.pencil;
  g.frame(x, y + 8, 28, 22, pc);
  for (let k = 1; k < 7; k++) g.line(x + k * 4, y + 9, x + k * 4, y + 28, pc);
  for (let k = 1; k < 4; k++) g.line(x + 1, y + 8 + k * 5, x + 26, y + 8 + k * 5, pc);
}

/** 止まった カモメ（鉛筆、羽を 広げた まま）。 */
function kamome(g: Gfx, x: number, y: number): void {
  const pc = UI.pencil;
  g.line(x, y + 2, x + 7, y + 6, pc);
  g.line(x + 7, y + 6, x + 14, y + 2, pc);
  g.line(x + 1, y + 3, x + 7, y + 7, pc);
  g.line(x + 7, y + 7, x + 13, y + 3, pc);
  g.circle(x + 7, y + 7, 1, '#FFFFFF');
}

export function drawOjPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(OJ_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 112);
  let ly = y + TITLE_H + 6;
  ami(g, x + 8, ly);
  kamome(g, x + 50, ly + 2);
  // the clump that came out, by the drain: a feather, the sand
  g.line(x + 42, ly + 26, x + 56, ly + 20, UI.pencil);
  g.circle(x + 66, ly + 26, 3, '#D8503A');
  ly += PIC_H;
  let n = 0;
  for (const k of ['kamome', 'tank', 'tenmado', 'shitsugaiki', 'haisui']) if (flag(`flag_oj_mono_${k}`)) n++;
  pageText(g, OJ_BOOK.mono(n), x + 2, ly, { color: n >= 5 ? UI.accent : UI.text });
  ly += LINE_H;
  const b = OJ_BOOK.ball[flag('flag_oj_ball')];
  if (b) pageText(g, b, x + 2, ly, { color: UI.text });
  ly += LINE_H + 4;
  for (const l of OJ_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function ojBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(OJ_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(OJ_BOOK.title) > room) bad.push(`${OJ_BOOK.title}: ${textW(OJ_BOOK.title)}px`);
  if (2 + textW(OJ_BOOK.mono(5)) > room) bad.push(`${OJ_BOOK.mono(5)}: wide`);
  for (const v of Object.values(OJ_BOOK.ball)) if (2 + textW(v) > room) bad.push(`${v}: wide`);
  for (const l of OJ_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * OJ_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('ojBookText', () => ojBookCheck());
addBookPeek('oj', drawOjPage);
