// みました帳③の すみの 1ページ『目で、いちばん 長く』（03_ch3_index、events/ch3/fureai.ts）：ふれあいの 磯で 貼り紙の
// いちばん 下の 字を 読んだ あと（flag_fr_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに
// 題、水の ない 水槽の 岩の 上で まるく なった グソっ君と、のぞきこむ 大きな 目の えんぴつの 絵。すみに 触角・足 14本・
// しっぽの 扇の 3つの 小さな 印。やくそく ○/3・よく 見た 所 ○/3（部屋の 物 ○/3 は 帳面が せまいので 出さない）、貼り紙の 小さな 字の 決めの 文。
// 「持ち上げる」を 選んだ 人だけ、グソっ君の 絵に 小さな 汗の 線が 1本。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.frBookText()、bookPeek('fr')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { FR_BOOK } from '../../data/text/c3_fureai';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasFrPage(): boolean {
  return flag('flag_fr_done') > 0;
}

export const FR_ROW_LABEL = FR_BOOK.title;

const frYakuN = () => ['flag_fr_te', 'flag_fr_yubi', 'flag_fr_fureai'].filter((f) => flag(f)).length;
const frMeN = () => [1, 2, 4].filter((b) => flag('flag_fr_me') & b).length;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;

export function drawFrPage(g: Gfx, x: number, y: number, w: number): void {
  const pen = UI.pencil;
  FR_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * FR_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, pen, 151);
  const ly = y + th + 6;
  // the low tank (its rim), the rock, グソっ君 curled on it
  g.frame(x + 2, ly + 14, 60, 14, pen);
  g.line(x + 2, ly + 14, x + 8, ly + 8, pen);
  g.line(x + 62, ly + 14, x + 56, ly + 8, pen);
  g.line(x + 8, ly + 8, x + 56, ly + 8, pen);
  g.frame(x + 22, ly + 16, 20, 6, pen);
  g.frame(x + 24, ly + 9, 16, 8, pen);
  for (let k = 0; k < 3; k++) g.line(x + 28 + k * 4, ly + 9, x + 28 + k * 4, ly + 16, pen);
  g.line(x + 24, ly + 11, x + 18, ly + 5, pen);
  // a little sweat line (only for who tried to lift him)
  if (flag('flag_fr_mochi')) g.line(x + 42, ly + 6, x + 44, ly + 9, '#4A6A9A');
  // the big eye looking in from the right
  const ex = x + 84;
  g.frame(ex - 12, ly + 2, 24, 14, pen);
  g.rect(ex - 3, ly + 5, 7, 8, pen);
  g.rect(ex - 1, ly + 6, 2, 2, '#FBF3DC');
  // in the corner: the three small marks (feeler, 14 legs, the fan)
  const mx = x + 70;
  const my = ly + 22;
  g.line(mx, my + 6, mx + 6, my, '#C8452E');
  for (let k = 0; k < 7; k++) g.rect(mx + 12 + k * 2, my + 2, 1, 5, '#C8452E');
  g.line(mx + 30, my + 6, mx + 34, my, '#C8452E');
  g.line(mx + 30, my + 6, mx + 36, my + 4, '#C8452E');
  g.line(mx + 30, my + 6, mx + 35, my + 7, '#C8452E');
  let yy = ly + PIC_H;
  pageText(g, FR_BOOK.yaku(frYakuN()), x + 2, yy, { color: UI.text });
  yy += LINE_H;
  pageText(g, FR_BOOK.me(frMeN()), x + 2, yy, { color: UI.text });
  yy += LINE_H + 4;
  for (const l of FR_BOOK.quote) {
    pageText(g, l, x + 4, yy, { color: '#5A6A8A' });
    yy += LINE_H;
  }
}

export function frBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(FR_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of FR_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  if (2 + textW(FR_BOOK.yaku(3)) > room) bad.push('やくそく: wide');
  if (2 + textW(FR_BOOK.me(3)) > room) bad.push('見た 所: wide');
  for (const l of FR_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (108 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H * FR_BOOK.titleLines.length + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * FR_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('frBookText', () => frBookCheck());
addBookPeek('fr', drawFrPage);
