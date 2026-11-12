// みました帳③の すみの 1ページ『背中から、1回で』（03_ch3_index、events/ch3/nukegara.ts）：名人の 判定の あと
// （flag_ng_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、見つけた
// ぬけがらを 大きさの 順に 並べた 鉛筆の 絵、うしろ 半分の 話を 聞いて いれば 2つに 分かれた よろいの 線画と
// グソっ君の 字「わいは 2回」、子どもの 字で「名人 しゅん（たぶん）」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.ngBookText()、bookPeek('ng')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { NG_BOOK } from '../../data/text/c3_nukegara';
import { drawSemi, SEMI_ORDER } from '../../art/props/nukegara_art';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasNgPage(): boolean {
  return flag('flag_ng_done') > 0;
}

export const NG_ROW_LABEL = NG_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;
const YOROI_H = 22;
/** 子どもの 字（えんぴつ より 少し 赤い）。グソっ君の 字は 青い。 */
const KID_INK = '#A85A5A';
const KN_INK = '#5A6A8A';

export function drawNgPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(NG_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 119);
  let ly = y + TITLE_H + 6;
  // the shells found, in the order of their size (small to large), in pencil
  SEMI_ORDER.forEach((k, i) => {
    if (!flag(`flag_ng_got_${k}`)) return;
    drawSemi(g, k, x + 12 + i * 28, ly + 15, 0.55, UI.pencil);
  });
  ly += PIC_H;
  if (flag('flag_ng_ushiro')) {
    // グソっ君's armour, in two: the back half pulled away a little from the front half
    const cy = ly + 8;
    const seg = (sx: number, n: number) => {
      for (let i = 0; i < n; i++) {
        const xx = sx + i * 5;
        const h = 6 - Math.abs(i - (n - 1) / 2) * 0.6;
        g.line(xx, Math.round(cy - h), xx + 4, Math.round(cy - h), UI.pencil);
        g.line(xx, Math.round(cy - h), xx, Math.round(cy + h), UI.pencil);
        g.line(xx, Math.round(cy + h), xx + 4, Math.round(cy + h), UI.pencil);
      }
    };
    seg(x + 4, 4);
    seg(x + 30, 3);
    g.line(x + 45, Math.round(cy - 5), x + 45, Math.round(cy + 5), UI.pencil);
    pageText(g, NG_BOOK.kn, x + 54, cy - 7, { color: KN_INK });
    ly += YOROI_H;
  }
  pageText(g, NG_BOOK.kid[0], x + 2, ly, { color: KID_INK });
  pageText(g, NG_BOOK.kid[1], x + w - 6 - textW(NG_BOOK.kid[1]), ly + LINE_H, { color: KID_INK });
}

export function ngBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(NG_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(NG_BOOK.title) > room) bad.push(`${NG_BOOK.title}: ${textW(NG_BOOK.title)}px`);
  if (54 + textW(NG_BOOK.kn) > room) bad.push(`${NG_BOOK.kn}: wide`);
  for (const [i, l] of NG_BOOK.kid.entries()) {
    const lx = i === 0 ? 2 : room - textW(l);
    if (lx + textW(l) > room) bad.push(`${l}: ${lx + textW(l)}px`);
  }
  if (12 + 3 * 28 + 8 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + YOROI_H + LINE_H * 2;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('ngBookText', () => ngBookCheck());
addBookPeek('ng', drawNgPage);
