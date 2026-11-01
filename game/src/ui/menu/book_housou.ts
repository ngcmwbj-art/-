// みました帳③の すみの 1ページ『終わりの 音は、下がる』（03_ch3_index、events/ch3/housou.ts）：放送室で 下りの チャイムを
// 鳴らし、電源を 切った あと（flag_hs_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに
// 題、放送の 机と チャイムの 箱、4つの ボタンの 鉛筆の 絵、上がる 4つの 点と 下がる 4つの 点、すみに マイクの 前で
// 自分を 指さす グソっ君、鳴らした チャイム ○/2・読んだ テープ ○/4、ハキコの 字の 決めの 文。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.hsBookText()、bookPeek('hs')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { HS_BOOK } from '../../data/text/c3_housou';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasHsPage(): boolean {
  return flag('flag_hs_done') > 0;
}

export const HS_ROW_LABEL = HS_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;

function chimeN(): number {
  return ['flag_hs_up', 'flag_hs_down'].filter((f) => flag(f)).length;
}
function tapeN(): number {
  return Math.min(3, flag('flag_hs_tana')) + (flag('flag_hs_tape') ? 1 : 0);
}

export function drawHsPage(g: Gfx, x: number, y: number, w: number): void {
  const pen = UI.pencil;
  HS_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * HS_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, pen, 141);
  const ly = y + th + 6;
  // the desk (the mic, the tape machine) and the chime box with its four buttons
  g.frame(x + 2, ly + 10, 44, 8, pen);
  g.line(x + 8, ly + 10, x + 8, ly + 3, pen);
  g.frame(x + 6, ly, 5, 4, pen);
  g.frame(x + 24, ly + 4, 18, 6, pen);
  g.frame(x + 50, ly + 4, 22, 14, pen);
  for (let k = 0; k < 4; k++) g.rect(x + 53 + k * 5, ly + 8, 3, 3, pen);
  // four dots going up, four going down
  for (let k = 0; k < 4; k++) g.rect(x + 4 + k * 7, ly + 30 - k * 3, 2, 2, '#C8452E');
  for (let k = 0; k < 4; k++) g.rect(x + 40 + k * 7, ly + 21 + k * 3, 2, 2, '#4A6A9A');
  // グソっ君 at the mic in the corner, pointing at himself
  const kx = x + 92;
  g.frame(kx, ly + 18, 12, 9, pen);
  g.line(kx + 3, ly + 18, kx + 1, ly + 14, pen);
  g.line(kx + 9, ly + 18, kx + 6, ly + 22, '#C25A4A');
  g.line(kx + 18, ly + 26, kx + 18, ly + 14, pen);
  g.frame(kx + 16, ly + 10, 5, 4, pen);
  let yy = ly + PIC_H;
  pageText(g, HS_BOOK.chime(chimeN()), x + 2, yy, { color: UI.text });
  yy += LINE_H;
  pageText(g, HS_BOOK.tape(tapeN()), x + 2, yy, { color: UI.text });
  yy += LINE_H + 4;
  for (const l of HS_BOOK.quote) {
    pageText(g, l, x + 4, yy, { color: '#5A6A8A' });
    yy += LINE_H;
  }
}

export function hsBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(HS_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of HS_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  if (2 + textW(HS_BOOK.chime(2)) > room) bad.push('チャイム: wide');
  if (2 + textW(HS_BOOK.tape(4)) > room) bad.push('テープ: wide');
  for (const l of HS_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (114 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H * HS_BOOK.titleLines.length + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * HS_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('hsBookText', () => hsBookCheck());
addBookPeek('hs', drawHsPage);
