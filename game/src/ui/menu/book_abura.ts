// みました帳③の すみの 1ページ『毎晩の 油』（03_ch3_index 28、events/ch3/abura.ts）：ヘラ 2本の あと（flag_ab_done）、
// ③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、黒く 光る ヘラ 2本と 店の 前の
// 置物の 鉛筆の 絵、2本の でき（黒く 光った・べたべた）、ヤキソバンの「鉄は、毎日 さわって やりゃ、さびねえ。」。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.abBookText()、bookPeek('ab')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { AB_BOOK } from '../../data/text/c3_abura';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasAbPage(): boolean {
  return flag('flag_ab_done') > 0;
}

export const AB_ROW_LABEL = AB_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;

/** 鉛筆の ヘラ 1本（黒く 光る 刃と 木の 柄）。 */
function hera(g: Gfx, x: number, y: number): void {
  for (let i = 0; i < 14; i++) g.rect(x + i, y + 6 - Math.round(i * 0.2), 1, 8 + Math.round(i * 0.4), '#3A3A42');
  g.rect(x + 2, y + 7, 9, 1, '#C8D0DC');
  g.rect(x + 14, y + 9, 12, 3, '#8A6444');
  g.frame(x - 1, y + 3, 16, 13, UI.pencil);
}

/** 店の 前の 置物（マントの ヒーローが ヘラを 掲げる、鉛筆の 線）。 */
function okimono(g: Gfx, x: number, y: number): void {
  const pc = UI.pencil;
  g.frame(x + 4, y + 26, 14, 4, pc);
  g.circle(x + 11, y + 6, 3, pc);
  g.line(x + 11, y + 9, x + 11, y + 19, pc);
  g.line(x + 11, y + 19, x + 8, y + 26, pc);
  g.line(x + 11, y + 19, x + 14, y + 26, pc);
  g.line(x + 9, y + 10, x + 4, y + 22, '#5A8A4A');
  g.line(x + 11, y + 12, x + 19, y + 5, pc);
  g.rect(x + 18, y + 1, 4, 4, '#3A3A42');
  g.px(x + 19, y + 1, '#FFFFFF');
}

export function drawAbPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(AB_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 109);
  let ly = y + TITLE_H + 6;
  hera(g, x + 6, ly);
  hera(g, x + 6, ly + 16);
  okimono(g, x + 70, ly);
  ly += PIC_H;
  pageText(g, AB_BOOK.dekiLabel, x + 2, ly, { color: UI.text });
  ly += LINE_H;
  [flag('flag_ab_hon_1'), flag('flag_ab_hon_2')].forEach((v, i) => {
    const d = v === 2 ? AB_BOOK.deki.beta : AB_BOOK.deki.kuro;
    pageText(g, `${i + 1}`, x + 4, ly, { color: UI.pencil });
    pageText(g, d, x + 16, ly, { color: v === 2 ? '#A88A3A' : UI.text });
    ly += LINE_H;
  });
  ly += 2;
  for (const l of AB_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function abBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(AB_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(AB_BOOK.title) > room) bad.push(`${AB_BOOK.title}: ${textW(AB_BOOK.title)}px`);
  if (2 + textW(AB_BOOK.dekiLabel) > room) bad.push(`${AB_BOOK.dekiLabel}: wide`);
  for (const d of Object.values(AB_BOOK.deki)) if (16 + textW(d) > room) bad.push(`${d}: ${16 + textW(d)}px`);
  for (const l of AB_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * 3 + 2 + LINE_H * AB_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('abBookText', () => abBookCheck());
addBookPeek('ab', drawAbPage);
