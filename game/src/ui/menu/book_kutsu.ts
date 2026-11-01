// みました帳②の すみの 1ページ『はく 前に、ふる』（02_ch2_index #111、events/ch2/kutsu.ts）：トマじいに 話した あと
// （flag_ku_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、逆さに した
// 長靴と 出てきた 5つの 生き物の 鉛筆の 絵（帰した 物だけ。帰さなかった 物は 点線の 丸）、帰した 数（○/5）、
// トマじいの「はく 前に、ふる。……出てきた もんは、草へ 帰したれ。」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.kuBookText()、bookPeek('ku')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { KU_BOOK, KU_MON_ORDER, KU_MONS, type KuMonKey } from '../../data/text/hoshi_kutsu';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasKuPage(): boolean {
  return flag('flag_ku_done') > 0;
}

export const KU_ROW_LABEL = KU_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;

/** 生き物の 小さな 鉛筆の 絵（足もとの まん中 x, y）。 */
function sketch(g: Gfx, k: KuMonKey, x: number, y: number): void {
  const c = UI.pencil;
  if (k === 'kaeru') {
    g.frame(x - 4, y - 4, 8, 4, c);
    g.px(x - 3, y - 5, c);
    g.px(x + 2, y - 5, c);
    g.px(x - 5, y - 1, c);
    g.px(x + 4, y - 1, c);
  } else if (k === 'enma') {
    g.rect(x - 4, y - 3, 8, 2, c);
    g.line(x - 4, y - 3, x - 7, y - 7, c);
    g.line(x + 3, y - 1, x + 6, y, c);
  } else if (k === 'kama') {
    g.line(x - 4, y - 2, x, y - 5, c);
    g.line(x, y - 5, x + 4, y - 2, c);
    g.line(x + 3, y - 3, x + 6, y - 7, c);
    g.line(x + 6, y - 7, x + 7, y, c);
    g.line(x - 4, y - 3, x - 9, y - 8, c);
  } else if (k === 'name') {
    g.rect(x - 5, y - 2, 10, 2, c);
    g.line(x - 5, y - 2, x - 7, y - 5, c);
    g.line(x - 4, y - 2, x - 5, y - 5, c);
  } else {
    g.rect(x - 1, y - 3, 3, 3, c);
    g.line(x, y - 3, x, y - 12, c);
    for (const d of [-1, 1]) {
      g.line(x + d, y - 2, x + d * 4, y - 4, c);
      g.line(x + d, y - 1, x + d * 4, y + 1, c);
    }
  }
}

export function drawKuPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(KU_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 111);
  let ly = y + TITLE_H + 6;
  // the boot upside down (sole up, the mouth down) and the five that came out of the boots, in a row
  const bx = x + 8;
  g.rect(bx, ly, 12, 2, UI.pencil);
  g.frame(bx, ly + 2, 12, 4, UI.pencil);
  g.frame(bx, ly + 6, 8, 20, UI.pencil);
  g.line(bx + 1, ly + 26, bx + 6, ly + 26, '#5A6A8A');
  const back = flag('flag_ku_kaeshi');
  KU_MON_ORDER.forEach((k, i) => {
    const sx = x + 34 + i * 22;
    const sy = ly + 26;
    if (back & (1 << i)) sketch(g, k, sx, sy);
    else for (let a = 0; a < 8; a++) g.px(sx + Math.round(Math.cos(a * 0.785) * 4), sy - 3 + Math.round(Math.sin(a * 0.785) * 3), UI.pencil);
  });
  ly += PIC_H;
  const n = KU_MON_ORDER.filter((_, i) => back & (1 << i)).length;
  pageText(g, `${KU_BOOK.label} ${n}/5`, x + 2, ly, { color: UI.text });
  ly += LINE_H + 4;
  for (const l of KU_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function kuBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(KU_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(KU_BOOK.title) > room) bad.push(`${KU_BOOK.title}: ${textW(KU_BOOK.title)}px`);
  if (2 + textW(`${KU_BOOK.label} 5/5`) > room) bad.push(`${KU_BOOK.label}: wide`);
  for (const l of KU_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (34 + 4 * 22 + 10 > room) bad.push('絵: wide');
  for (const k of KU_MON_ORDER) if (!KU_MONS[k]) bad.push(`生き物: ${k}`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H + 4 + LINE_H * KU_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('kuBookText', () => kuBookCheck());
addBookPeek('ku', drawKuPage);
