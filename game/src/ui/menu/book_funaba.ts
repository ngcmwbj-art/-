// みました帳③の すみの 1ページ『お昼の あとで、こする』（03_ch3_index、events/ch3/funaba.ts）：段階2 の〔ぬる〕の
// あと（flag_fb_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 船の 腹の 鉛筆の 絵（上半分は 白い つぶ、下半分は 赤い 塗り）、すみに 空の フジツボの 殻を のぞく グソっ君と
// 軍手の 手形 3つ、こすった 区切り ○/3 と 付いた 物の 形 ○/2、ゴロウの 字の「塗るのは わし」。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.fbBookText()、bookPeek('fb')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { FB_BOOK } from '../../data/text/c3_funaba';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasFbPage(): boolean {
  return flag('flag_fb_done') > 0;
}

export const FB_ROW_LABEL = FB_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;

function buN(): number {
  return [0, 1, 2].filter((k) => flag(`flag_fb_bu_${k}`)).length;
}
function kataN(): number {
  return ['flag_fb_kata_fuji', 'flag_fb_kata_mo'].filter((f) => flag(f)).length;
}

export function drawFbPage(g: Gfx, x: number, y: number, w: number): void {
  const pen = UI.pencil;
  FB_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * FB_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, pen, 151);
  const ly = y + th + 6;
  // the boat's side: the gunwale, the hull curving up to the bow (west), the water line
  const x0 = x + 4;
  const x1 = x + 92;
  g.line(x0, ly + 2, x1, ly + 2, pen);
  g.line(x0, ly + 2, x0 + 10, ly + 24, pen);
  g.line(x0 + 10, ly + 24, x1, ly + 24, pen);
  g.line(x1, ly + 2, x1, ly + 24, pen);
  g.line(x0 + 4, ly + 12, x1, ly + 12, pen);
  // the upper half of the bottom: white grains; the lower half: the red coat
  for (let i = 0; i < 9; i++) g.rect(x0 + 12 + i * 8, ly + 14 + (i % 2), 2, 2, '#8A8478');
  for (let xx = x0 + 11; xx < x1; xx += 2) g.line(xx, ly + 19, xx + 1, ly + 23, '#C25A4A');
  // the cradle's wheels on the rail
  g.line(x0 + 6, ly + 30, x1 + 4, ly + 30, pen);
  for (const cx of [x0 + 22, x0 + 74]) g.frame(cx - 2, ly + 26, 5, 4, pen);
  // in the corner: グソっ君 peering into an empty barnacle shell, and three glove prints
  const kx = x + 100;
  g.frame(kx, ly + 18, 10, 8, pen);
  g.line(kx + 2, ly + 18, kx, ly + 14, pen);
  g.rect(kx + 12, ly + 20, 5, 4, '#8A8478');
  g.rect(kx + 14, ly + 21, 1, 1, UI.text);
  for (let i = 0; i < 3; i++) {
    const hx = kx - 2 + i * 7;
    g.frame(hx, ly + 2, 5, 6, '#A8A0B8');
    g.rect(hx + 1, ly, 1, 2, '#A8A0B8');
    g.rect(hx + 3, ly, 1, 2, '#A8A0B8');
  }
  let yy = ly + PIC_H;
  pageText(g, FB_BOOK.kn, x + 2, yy, { color: '#8A6A8A' });
  yy += LINE_H;
  pageText(g, FB_BOOK.kosuri(buN()), x + 2, yy, { color: UI.text });
  yy += LINE_H;
  pageText(g, FB_BOOK.kata(kataN()), x + 2, yy, { color: UI.text });
  yy += LINE_H + 4;
  for (const l of FB_BOOK.quote) {
    pageText(g, l, x + 4, yy, { color: '#5A6A8A' });
    yy += LINE_H;
  }
}

export function fbBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(FB_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of FB_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  if (2 + textW(FB_BOOK.kn) > room) bad.push('グソっ君: wide');
  if (2 + textW(FB_BOOK.kosuri(3)) > room) bad.push('こすった: wide');
  if (2 + textW(FB_BOOK.kata(2)) > room) bad.push('付いた 物: wide');
  for (const l of FB_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (120 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H * FB_BOOK.titleLines.length + 6 + PIC_H + LINE_H * 3 + 4 + LINE_H * FB_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('fbBookText', () => fbBookCheck());
addBookPeek('fb', drawFbPage);
