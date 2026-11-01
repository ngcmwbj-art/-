// みました帳③の すみの 1ページ『下の 紙』（03_ch3_index、events/ch3/shita.ts）：こすった 物 3つの あと
// （flag_sh_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、こすった
// 紙の 写し（えんぴつの 黒の 中の 白い 字・消した 1行の へこみ・足あと 3つ）、こすった 物の ○。2枚目で
// やりなおして いれば 写しは うすい 字の 版で、グソっ君の えんぴつの 字「2まいめ」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.shBookText()

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { SH_BOOK } from '../../data/text/c3_shita';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasShPage(): boolean {
  return flag('flag_sh_done') > 0;
}

export const SH_ROW_LABEL = SH_BOOK.title;

const TITLE_H = 17;
const ROW_H = 16;
const COPY_H = 52;

export function drawShPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(SH_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 108);
  let ly = y + TITLE_H + 6;
  // the copy: graphite, the white letters, the struck line, three little feet
  const nimai = flag('flag_sh_nimai') > 0;
  const cw = w - 10;
  g.rect(x + 2, ly, cw, COPY_H, nimai ? '#A8A8B0' : '#7A7A84');
  const white = nimai ? '#D8D8DC' : '#FFFFFF';
  SH_BOOK.copy.forEach((l, i) => pageText(g, l, x + 6, ly + 2 + i * 16, { color: white }));
  // the struck-out line in the bottom corner: little dents of letters under one stroke
  for (let k = 0; k < 6; k++) g.rect(x + cw - 40 + k * 6, ly + COPY_H - 12, 4, 5, nimai ? '#C0C0C6' : '#D8D8DE');
  g.rect(x + cw - 42, ly + COPY_H - 10, 38, 1, white);
  for (let f = 0; f < 3; f++) {
    const fx = x + 10 + f * 8;
    const fy = ly + COPY_H - 4 - (f % 2) * 2;
    g.line(fx, fy, fx - 2, fy - 3, white);
    g.line(fx, fy, fx, fy - 4, white);
    g.line(fx, fy, fx + 2, fy - 3, white);
  }
  if (nimai) pageText(g, SH_BOOK.nimai, x + cw - textW(SH_BOOK.nimai) - 2, ly + COPY_H + 1, { color: UI.pencil });
  ly += COPY_H + 16;
  const got = [flag('flag_sh_tsuzuri') > 0, flag('flag_sh_01') > 0, flag('flag_sh_hakushi') > 0];
  SH_BOOK.rows.forEach((name, i) => {
    pageText(g, got[i] ? '○' : '・', x + 2, ly, { color: got[i] ? UI.accent : UI.pencil });
    pageText(g, name, x + 18, ly, { color: UI.text });
    ly += ROW_H;
  });
}

export function shBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(SH_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(SH_BOOK.title) > room) bad.push(`${SH_BOOK.title}: ${textW(SH_BOOK.title)}px`);
  for (const l of SH_BOOK.copy) if (6 + textW(l) > room - 6) bad.push(`${l}: ${6 + textW(l)}px`);
  for (const n of SH_BOOK.rows) if (18 + textW(n) > room) bad.push(`${n}: ${16 + textW(n)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + COPY_H + 16 + ROW_H * SH_BOOK.rows.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('shBookText', () => shBookCheck());
addBookPeek('sh', drawShPage);
