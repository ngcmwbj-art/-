// みました帳③の すみの 1ページ『急かすと、甘うならん』（03_ch3_index、events/ch3/imo.ts）：水槽の うらで ヒロスケと
// 焼き芋を 焼いた あと（flag_im_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 小石の 上に ならんだ 芋 3本と「弱」に 回った つまみの 鉛筆の 絵、すみに 新聞紙の 包み。ヒロスケの 角ばった 字で「弱」、
// グソっ君の 字で「あっま」。「強」に 回した 回数は すみに 小さく（数で 何かが 変わる ことは ない）。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.imBookText()、bookPeek('im')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { IM_BOOK } from '../../data/text/c3_imo';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasImPage(): boolean {
  return flag('flag_im_done') > 0;
}

export const IM_ROW_LABEL = IM_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 40;

/** 鉛筆の 芋 1本（横に ねた 形、焼け目）。 */
function imo(g: Gfx, x: number, y: number): void {
  for (let i = 0; i < 18; i++) {
    const h = Math.max(1, Math.round(5 * Math.sin((i / 17) * Math.PI)));
    g.rect(x + i, y + 5 - h, 1, h * 2, i % 5 === 2 ? '#7A3A4A' : '#9A4A62');
  }
  g.rect(x + 5, y + 2, 5, 1, '#C8A0A8');
}

/** 小石の 列（引き出しの 底）。 */
function stones(g: Gfx, x: number, y: number, w: number): void {
  for (let i = 0; i < w; i += 5) g.circle(x + i + 2, y + ((i / 5) % 2), 2, UI.pencil);
}

/** つまみ（「弱」に 回った）。 */
function knob(g: Gfx, x: number, y: number): void {
  g.ring(x + 6, y + 6, 6, UI.pencil);
  g.line(x + 6, y + 6, x + 2, y + 2, UI.pencil);
}

/** 新聞紙の 包み。 */
function tsutsumi(g: Gfx, x: number, y: number): void {
  g.frame(x, y, 14, 7, UI.pencil);
  for (let i = 2; i < 12; i += 3) g.rect(x + i, y + 3, 2, 1, '#9A9AA0');
  g.rect(x + 14, y + 2, 3, 3, '#9A4A62');
}

export function drawImPage(g: Gfx, x: number, y: number, w: number): void {
  // (the title in two lines: the page is narrow)
  IM_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * IM_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 113);
  let ly = y + th + 6;
  // the three on the stones, the knob turned to 弱 (ヒロスケ's square hand next to it)
  for (let i = 0; i < 3; i++) imo(g, x + 4 + i * 22, ly + 8);
  stones(g, x + 2, ly + 21, 68);
  knob(g, x + 78, ly + 4);
  pageText(g, IM_BOOK.hiro, x + 94, ly + 2, { color: UI.text });
  tsutsumi(g, x + 78, ly + 24);
  ly += PIC_H;
  pageText(g, IM_BOOK.imo(3), x + 2, ly, { color: UI.text });
  ly += LINE_H;
  // グソっ君's hand, and the times the knob went to 強 (small, in the corner)
  pageText(g, IM_BOOK.kn, x + 8, ly, { color: '#5A6A8A' });
  const n = flag('flag_im_kyou');
  if (n > 0) pageText(g, IM_BOOK.kyou(n), x + w - 6 - textW(IM_BOOK.kyou(n)), ly, { color: UI.pencil });
}

export function imBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(IM_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of IM_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  if (94 + textW(IM_BOOK.hiro) > room) bad.push(`${IM_BOOK.hiro}: wide`);
  if (2 + textW(IM_BOOK.imo(3)) > room) bad.push(`${IM_BOOK.imo(3)}: wide`);
  if (8 + textW(IM_BOOK.kn) + 8 + textW(IM_BOOK.kyou(9)) > room) bad.push(`${IM_BOOK.kn} ${IM_BOOK.kyou(9)}: wide`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H * IM_BOOK.titleLines.length + 6 + PIC_H + LINE_H * 2;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('imBookText', () => imBookCheck());
addBookPeek('im', drawImPage);
