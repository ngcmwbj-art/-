// みました帳③の すみの 1ページ『海の 寄せ豆腐』（03_ch3_index 28、events/ch3/yose.ts）：寄せ豆腐の あと
// （flag_yd_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、なべの 中の
// 白い 雲と びん 1本の 鉛筆の 絵、豆腐の でき（寄せ・おぼろ・しょっぱい）、沖の 物 ○/4、くま吉の「畑の 豆と、海の 水。」。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.ydBookText()、bookPeek('yd')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { YD_BOOK } from '../../data/text/c3_yose';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasYdPage(): boolean {
  return flag('flag_yd_done') > 0;
}

export const YD_ROW_LABEL = YD_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;
const DEKI = ['', 'yose', 'oboro', 'shoppai'];

/** なべ（鉛筆）と 中の 白い 雲。 */
function nabe(g: Gfx, x: number, y: number, oboro: boolean): void {
  const pc = UI.pencil;
  g.line(x, y + 8, x + 44, y + 8, pc);
  g.line(x + 2, y + 8, x + 6, y + 24, pc);
  g.line(x + 42, y + 8, x + 38, y + 24, pc);
  g.line(x + 6, y + 24, x + 38, y + 24, pc);
  g.line(x - 3, y + 10, x, y + 10, pc);
  g.line(x + 44, y + 10, x + 47, y + 10, pc);
  const clouds: [number, number, number][] = oboro
    ? [[10, 12, 1], [16, 14, 1], [22, 11, 1], [28, 14, 1], [34, 12, 1], [19, 17, 1], [26, 18, 1], [13, 18, 1]]
    : [[14, 13, 4], [24, 12, 5], [32, 15, 3], [20, 18, 3]];
  for (const [cx, cy, r] of clouds) {
    g.circle(x + cx, y + cy, r, '#FFFFFF');
    g.ring(x + cx, y + cy, r, '#B8B4A8');
  }
}

/** びん 1本（鉛筆、中に 青い 水）。 */
function bin(g: Gfx, x: number, y: number): void {
  g.frame(x + 3, y, 4, 4, UI.pencil);
  g.frame(x, y + 4, 10, 18, UI.pencil);
  g.rect(x + 1, y + 10, 8, 11, '#9ACCE0');
}

export function drawYdPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(YD_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 110);
  let ly = y + TITLE_H + 6;
  const d = DEKI[flag('flag_yd_deki')] || 'yose';
  nabe(g, x + 8, ly, d === 'oboro');
  bin(g, x + 70, ly + 4);
  if (flag('flag_yd_tomato')) g.circle(x + 32, ly + 12, 2, '#E23B2E');
  ly += PIC_H;
  pageText(g, YD_BOOK.dekiLabel, x + 2, ly, { color: UI.text });
  pageText(g, YD_BOOK.deki[d], x + 2 + textW(YD_BOOK.dekiLabel) + 2, ly, { color: UI.accent });
  ly += LINE_H;
  let n = 0;
  for (const k of ['kusari', 'mo', 'mure', 'dan']) if (flag(`flag_yd_oki_${k}`)) n++;
  pageText(g, YD_BOOK.oki(n), x + 2, ly, { color: n >= 4 ? UI.accent : UI.text });
  ly += LINE_H + 4;
  for (const l of YD_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function ydBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(YD_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(YD_BOOK.title) > room) bad.push(`${YD_BOOK.title}: ${textW(YD_BOOK.title)}px`);
  for (const v of Object.values(YD_BOOK.deki)) if (4 + textW(YD_BOOK.dekiLabel) + textW(v) > room) bad.push(`${YD_BOOK.dekiLabel}${v}: wide`);
  if (2 + textW(YD_BOOK.oki(4)) > room) bad.push(`${YD_BOOK.oki(4)}: wide`);
  for (const l of YD_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * YD_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('ydBookText', () => ydBookCheck());
addBookPeek('yd', drawYdPage);
