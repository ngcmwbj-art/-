// みました帳③の すみの 1ページ『落とすけえ、甘うなる』（03_ch3_index、events/ch3/mikan.ts）：店先で 2人に かごを
// 見せた あと（flag_mk_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 下を 向いた 実が 残った 枝と、町を 見下ろす ベンチの 鉛筆の 絵、2人の 字の 名札（かたい 字と 丸い 字）、
// 目安の 1行、ホシミの「落とすけえ、残りが 甘うなる。」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.mkBookText()、bookPeek('mk')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { MK_BOOK } from '../../data/text/c3_mikan';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasMkPage(): boolean {
  return flag('flag_mk_done') > 0;
}

export const MK_ROW_LABEL = MK_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;

export function drawMkPage(g: Gfx, x: number, y: number, w: number): void {
  const pen = UI.pencil;
  g.text(MK_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, pen, 117);
  let ly = y + TITLE_H + 6;
  // left: the branch, the fruit left hanging down (and a gap where the cut ones were)
  g.line(x + 2, ly + 6, x + 58, ly + 12, pen);
  g.line(x + 2, ly + 7, x + 58, ly + 13, pen);
  for (const [i, dx] of [12, 30, 48].entries()) {
    const bx = x + dx;
    const by = ly + 8 + Math.round(dx / 10);
    g.line(bx, by, bx, by + 5, pen);
    g.frame(bx - 3, by + 5, 7, 7, '#5A8A4A');
    if (i === 1) g.px(bx - 1, by + 7, '#5A8A4A');
  }
  for (let i = 0; i < 9; i++) g.line(x + 6 + i * 6, ly + 4 + (i % 3), x + 10 + i * 6, ly + 2 + (i % 3), pen);
  // right: the bench from behind, the roofs below it, the sea and the horizon
  const rx = x + 72;
  g.line(rx, ly + 4, rx + 80, ly + 4, pen);
  for (let i = 0; i < 5; i++) g.frame(rx + 2 + i * 16, ly + 14 + (i % 2) * 2, 13, 6, pen);
  g.rect(rx + 26, ly + 26, 28, 2, pen);
  g.line(rx + 30, ly + 28, rx + 30, ly + 32, pen);
  g.line(rx + 50, ly + 28, rx + 50, ly + 32, pen);
  ly += PIC_H;
  // the two tags: a square hand and a round one
  g.text(MK_BOOK.fuda[0], x + 2, ly, { color: '#3A3450' });
  g.text(MK_BOOK.fuda[1], x + 2 + textW(MK_BOOK.fuda[0]) + 12, ly, { color: '#7A5AA0' });
  ly += LINE_H;
  pageText(g, MK_BOOK.meyasu, x + 2, ly, { color: UI.text });
  ly += LINE_H + 4;
  for (const l of MK_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function mkBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(MK_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(MK_BOOK.title) > room) bad.push(`${MK_BOOK.title}: ${textW(MK_BOOK.title)}px`);
  if (2 + textW(MK_BOOK.fuda[0]) + 12 + textW(MK_BOOK.fuda[1]) > room) bad.push('名札: wide');
  if (2 + textW(MK_BOOK.meyasu) > room) bad.push(`${MK_BOOK.meyasu}: wide`);
  for (const l of MK_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (72 + 82 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * MK_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('mkBookText', () => mkBookCheck());
addBookPeek('mk', drawMkPage);
