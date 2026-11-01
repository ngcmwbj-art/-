// みました帳③の すみの 1ページ『やっと、魚の 昼』（03_ch3_index、events/ch3/sakana.ts）：ツリノの 釣りの あと
// （flag_sk_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、波の 立つ 海に
// しずむ 浮きと、ふくらんだ クサフグの 鉛筆の 絵、子どもの 字で「アジ 1・フグ 1・えさ とられ N」、ツリノの
// 「町の 昼が 終わって、やっと 魚の 昼じゃ。」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.skBookText()、bookPeek('sk')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { SK_BOOK } from '../../data/text/c3_sakana';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasSkPage(): boolean {
  return flag('flag_sk_done') > 0;
}

export const SK_ROW_LABEL = SK_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;
/** 子どもの 字（えんぴつ より 少し 赤い）。 */
const KID_INK = '#A85A5A';

export function drawSkPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(SK_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 117);
  let ly = y + TITLE_H + 6;
  // the sea with waves standing up (little arcs), the float going under (its red head just showing)
  const sea = ly + 14;
  for (let i = 0; i < 8; i++) {
    const cx = x + 8 + i * 14;
    g.line(cx, sea, cx + 4, sea - 2, UI.pencil);
    g.line(cx + 4, sea - 2, cx + 8, sea, UI.pencil);
  }
  const fx = x + 34;
  g.line(fx, sea - 1, fx, sea + 6, '#5A6A8A');
  g.rect(fx - 1, sea - 2, 3, 2, '#C25A72');
  for (const r of [3, 6]) {
    g.px(fx - r, sea + 1, UI.pencil);
    g.px(fx + r, sea + 1, UI.pencil);
  }
  // the round puffed-up クサフグ (a circle, its fins, a dot of an eye, spots on its back)
  const cx = x + 86;
  const cy = ly + 14;
  for (let a = 0; a < 24; a++) {
    const th = (a / 24) * Math.PI * 2;
    g.px(Math.round(cx + Math.cos(th) * 8), Math.round(cy + Math.sin(th) * 7), UI.pencil);
  }
  g.px(cx - 4, cy - 2, UI.pencil);
  g.px(cx + 1, cy - 4, UI.pencil);
  g.px(cx + 4, cy - 3, UI.pencil);
  g.rect(cx - 6, cy - 1, 2, 2, UI.text);
  g.line(cx + 8, cy, cx + 12, cy - 3, UI.pencil);
  g.line(cx + 8, cy, cx + 12, cy + 3, UI.pencil);
  ly += PIC_H;
  for (const l of SK_BOOK.tally(flag('flag_sk_esa'))) {
    pageText(g, l, x + 2, ly, { color: KID_INK });
    ly += LINE_H;
  }
  ly += 4;
  for (const l of SK_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function skBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(SK_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(SK_BOOK.title) > room) bad.push(`${SK_BOOK.title}: ${textW(SK_BOOK.title)}px`);
  for (const l of SK_BOOK.tally(99)) if (2 + textW(l) > room) bad.push(`${l}: ${2 + textW(l)}px > ${room}`);
  for (const l of SK_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (8 + 8 * 14 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * SK_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('skBookText', () => skBookCheck());
addBookPeek('sk', drawSkPage);
