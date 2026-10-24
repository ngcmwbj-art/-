// みました帳②の すみの 1ページ『2枚の うず』（02_ch2_index #108、events/ch2/uzu.ts）：線香を 置いた あと（flag_uz_done）、
// ②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、うず巻きの 線香と うずの 形の
// 灰の 鉛筆の 絵、はずし方（するっと・2本）、ポコシャの「……割れたのも、ちゃんと 燃えるんですね。」。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.uzBookText()、bookPeek('uz')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { UZ_BOOK } from '../../data/text/hoshi_uzu';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasUzPage(): boolean {
  return flag('flag_uz_done') > 0;
}

export const UZ_ROW_LABEL = UZ_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 40;

/** うず巻き（鉛筆の 線）。ash：灰の 色で、外側が 少し ほどけた 形。 */
function spiral(g: Gfx, cx: number, cy: number, c: string, ash: boolean): void {
  let prev: [number, number] | null = null;
  const n = 90;
  for (let i = 0; i <= n; i++) {
    const k = i / n;
    const th = k * 2.6 * Math.PI * 2;
    const r = 2 + k * 15;
    const x = Math.round(cx + Math.cos(th) * r);
    const y = Math.round(cy + Math.sin(th) * r * 0.62);
    if (prev && !(ash && i % 9 === 0)) g.line(prev[0], prev[1], x, y, c);
    prev = [x, y];
  }
}

export function drawUzPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(UZ_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 108);
  let ly = y + TITLE_H + 6;
  // the coil (green, pencil) and its ash (grey) beside it, the smoke going straight up from the ash
  spiral(g, x + 26, ly + 20, '#4E7A3A', false);
  g.frame(x + 22, ly + 18, 9, 5, UI.pencil);
  spiral(g, x + 78, ly + 22, '#9A968C', true);
  g.px(x + 93, ly + 22, '#C8503A');
  for (let k = 0; k < 18; k++) g.px(x + 93 + (k % 6 === 3 ? 1 : 0), ly + 20 - k, UI.pencil);
  ly += PIC_H;
  const how = flag('flag_uz_how') === 2 ? UZ_BOOK.how.nihon : UZ_BOOK.how.suru;
  pageText(g, UZ_BOOK.label, x + 2, ly, { color: UI.text });
  pageText(g, how, x + 14, ly + LINE_H, { color: UI.accent });
  ly += LINE_H * 2 + 4;
  for (const l of UZ_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function uzBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(UZ_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(UZ_BOOK.title) > room) bad.push(`${UZ_BOOK.title}: ${textW(UZ_BOOK.title)}px`);
  for (const h of Object.values(UZ_BOOK.how)) if (14 + textW(h) > room || 2 + textW(UZ_BOOK.label) > room) bad.push(`${UZ_BOOK.label}${h}: wide`);
  for (const l of UZ_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (100 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * UZ_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('uzBookText', () => uzBookCheck());
addBookPeek('uz', drawUzPage);
