// みました帳③の すみの 1ページ『つるっと、終われる』（03_ch3_index、events/ch3/tokoro.ts）：ところてんの あと
// （flag_tk_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、流し箱と 天突きの
// 鉛筆の 絵（にゅるっと 出た ところてんの 線：長く 突いた 杯が 多いほど 長い）、すみに 布の はしを 持つ グソっ君、
// 突いた 杯の 長い・短い、おばあの 赤ペンの 字、ナミエの「最後の 小鉢が、海の 草で よかった。」。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.tkBookText()、bookPeek('tk')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { TK_BOOK } from '../../data/text/c3_tokoro';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasTkPage(): boolean {
  return flag('flag_tk_done') > 0;
}

export const TK_ROW_LABEL = TK_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 28;
const RED = '#C8452E';

/** 流し箱・天突き・ところてんの 線・布を 持つ グソっ君（鉛筆）。 */
function pic(g: Gfx, x: number, y: number, long: number): void {
  const pc = UI.pencil;
  // the 流し箱 (a long low box)
  g.frame(x, y + 18, 30, 7, pc);
  g.line(x + 20, y + 18, x + 20, y + 24, pc);
  // the 天突き: the tube, the handle up top
  const tx = x + 44;
  g.frame(tx, y + 4, 10, 11, pc);
  g.line(tx + 5, y, tx + 5, y + 4, pc);
  g.line(tx, y, tx + 10, y, pc);
  // what came out: the longer the more cups were long
  const len = 3 + long * 3;
  for (let i = 0; i < 3; i++) g.line(tx + 2 + i * 3, y + 16, tx + 2 + i * 3 + (i - 1), y + 16 + len, '#9AA0A8');
  // グソっ君 in the corner, holding the cloth's end (a small round body, two claws up)
  const kx = x + 72;
  g.ring(kx + 6, y + 20, 5, pc);
  g.line(kx + 1, y + 16, kx - 1, y + 10, pc);
  g.line(kx + 11, y + 16, kx + 13, y + 10, pc);
  g.line(kx - 1, y + 10, kx + 13, y + 10, '#B8B4A8');
}

export function drawTkPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(TK_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 120);
  let ly = y + TITLE_H + 6;
  const n = flag('flag_tk_n');
  const long = flag('flag_tk_long');
  pic(g, x + 6, ly, long);
  ly += PIC_H;
  pageText(g, TK_BOOK.hai(long, Math.max(0, n - long)), x + 2, ly, { color: n >= 3 && long >= 3 ? UI.accent : UI.text });
  ly += LINE_H + 2;
  for (const l of TK_BOOK.aka) {
    pageText(g, l, x + 4, ly, { color: RED });
    ly += LINE_H;
  }
  ly += 2;
  for (const l of TK_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function tkBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(TK_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(TK_BOOK.title) > room) bad.push(`${TK_BOOK.title}: ${textW(TK_BOOK.title)}px`);
  if (2 + textW(TK_BOOK.hai(3, 3)) > room) bad.push(`${TK_BOOK.hai(3, 3)}: wide`);
  for (const l of [...TK_BOOK.aka, ...TK_BOOK.quote]) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H + 2 + LINE_H * TK_BOOK.aka.length + 2 + LINE_H * TK_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('tkBookText', () => tkBookCheck());
addBookPeek('tk', drawTkPage);
