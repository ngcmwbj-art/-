// みました帳③の すみの 1ページ『低う、平たく』（03_ch3_index、events/ch3/mizukiri.ts）：テルの 話の あと
// （flag_mz_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、鏡の 海に
// 止まった 輪の 鉛筆の 絵、しゅんの いちばん 多かった 数（字で。9回 跳ねた ときは となりに テルの 字で 小さく「9」）、
// きょうの 輪（1回の 浜で 残した 輪の 数の いちばん 多い 時）、テルの「低う 投げたら、海が 押し返して くれるんよ。」。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.mzBookText()、bookPeek('mz')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { MZ_BOOK } from '../../data/text/c3_mizukiri';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasMzPage(): boolean {
  return flag('flag_mz_done') > 0;
}

export const MZ_ROW_LABEL = MZ_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 30;

export function drawMzPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(MZ_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 113);
  let ly = y + TITLE_H + 6;
  // the horizon, the still sea, the rings left where the stone touched (smaller further out)
  g.line(x + 4, ly + 4, x + w - 12, ly + 4, UI.pencil);
  const n = Math.max(3, Math.min(9, flag('flag_mz_best')));
  for (let i = 0; i < n; i++) {
    const cx = x + 12 + i * 13;
    const cy = ly + 22 - i;
    const r = Math.max(2, 5 - Math.floor(i / 3));
    g.line(cx - r, cy, cx + r, cy, '#5A6A8A');
    g.px(cx - r - 1, cy - 1, '#5A6A8A');
    g.px(cx + r + 1, cy - 1, '#5A6A8A');
  }
  ly += PIC_H;
  const best = MZ_BOOK.best(flag('flag_mz_best'));
  pageText(g, best, x + 2, ly, { color: UI.text });
  if (flag('flag_mz_nine')) g.text('9', x + 4 + textW(best) + 4, ly - 3, { color: '#C25A72' });
  ly += LINE_H;
  pageText(g, MZ_BOOK.wa(flag('flag_mz_wa')), x + 2, ly, { color: UI.text });
  ly += LINE_H + 4;
  for (const l of MZ_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function mzBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(MZ_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(MZ_BOOK.title) > room) bad.push(`${MZ_BOOK.title}: ${textW(MZ_BOOK.title)}px`);
  for (let i = 0; i <= 9; i++) if (2 + textW(MZ_BOOK.best(i)) + (i === 9 ? 14 : 0) > room) bad.push(`${MZ_BOOK.best(i)}: wide`);
  if (2 + textW(MZ_BOOK.wa(27)) > room) bad.push(`${MZ_BOOK.wa(27)}: wide`);
  for (const l of MZ_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (12 + 8 * 13 + 6 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * MZ_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('mzBookText', () => mzBookCheck());
addBookPeek('mz', drawMzPage);
