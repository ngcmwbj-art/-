// みました帳②の すみの 1ページ『穂は ほうき、茎は 柄』（02_ch2_index、events/ch2/hokihata.ts）：ハモ区長の
// 5 の あと（flag_hb_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 竹ざおに かかった ホウキモロコシの 束と、穂首の 1つ 下の 節に 矢じるしの 鉛筆の 絵。すみに さかさに 立った
// 去年の ほうきと、それを 見上げる グソっ君。区長の 字で「穂首の 1つ 下」、すみに 小さく「えー」。
// 刈った 穂の ◎（ちょうどの 節）・△（穂だけ）。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.hbBookText()、bookPeek('hb')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { HB_BOOK } from '../../data/text/hoshi_hokihata';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasHbPage(): boolean {
  return flag('flag_hb_done') > 0;
}

export const HB_ROW_LABEL = HB_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 44;

const marks = (): number[] => [0, 1, 2].map((k) => flag(`flag_hb_kabu_${k}`));

export function drawHbPage(g: Gfx, x: number, y: number, w: number): void {
  HB_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * HB_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 131);
  const ly = y + th + 6;
  const pc = UI.pencil;
  // the bamboo pole on its two forked sticks, the bundle over it (the heads reddish-brown)
  const sx = x + 4;
  g.line(sx, ly + 6, sx + 52, ly + 6, pc);
  g.line(sx + 2, ly + 6, sx + 2, ly + PIC_H - 4, pc);
  g.line(sx + 50, ly + 6, sx + 50, ly + PIC_H - 4, pc);
  for (let k = 0; k < 3; k++) {
    g.line(sx + 18 + k, ly + 6, sx + 18 + k, ly + 22, '#7A8A4A');
    g.line(sx + 26 + k * 2, ly + 6, sx + 28 + k * 3, ly + 26, '#A8583A');
  }
  g.rect(sx + 16, ly + 4, 10, 3, '#C8B070');
  // one stalk close: the head, its neck, the node below with the arrow
  const cx = x + 74;
  g.line(cx, ly + 10, cx, ly + PIC_H - 2, pc);
  for (let s = -2; s <= 2; s++) g.line(cx, ly + 10, cx + 6 + s * 2, ly + 2 + Math.abs(s) * 2, '#A8583A');
  g.line(cx - 2, ly + 10, cx + 2, ly + 10, pc);
  g.line(cx - 3, ly + 24, cx + 3, ly + 24, pc);
  g.line(cx - 3, ly + 36, cx + 3, ly + 36, pc);
  g.line(cx + 6, ly + 24, cx + 14, ly + 24, '#C8402E');
  g.line(cx + 6, ly + 24, cx + 9, ly + 22, '#C8402E');
  g.line(cx + 6, ly + 24, cx + 9, ly + 26, '#C8402E');
  // in the corner: last year's broom upside down, グソっ君 looking up at it
  const bx = x + w - 22;
  g.line(bx, ly + 20, bx, ly + PIC_H - 2, pc);
  for (let s = -2; s <= 2; s++) g.line(bx, ly + 20, bx + s * 2, ly + 8, '#B8A060');
  g.ring(bx + 10, ly + PIC_H - 8, 4, pc);
  g.px(bx + 9, ly + PIC_H - 10, pc);
  g.px(bx + 12, ly + PIC_H - 10, pc);
  let ty = ly + PIC_H;
  pageText(g, HB_BOOK.marks(marks()), x + 2, ty, { color: UI.text });
  // the 区長's tiny 「えー」 in the corner (at the end of the count's line)
  pageText(g, HB_BOOK.kucho, x + w - 6 - textW(HB_BOOK.kucho), ty, { color: UI.pencil });
  ty += LINE_H;
  for (const l of HB_BOOK.quote) {
    pageText(g, l, x + 4, ty, { color: '#8A5A3A' });
    ty += LINE_H;
  }
}

export function hbBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(HB_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of HB_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  if (2 + textW(HB_BOOK.marks([1, 2, 1])) > room) bad.push('◎△: wide');
  for (const l of HB_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (2 + textW(HB_BOOK.marks([1, 2, 1])) + 8 + textW(HB_BOOK.kucho) > room) bad.push('えー が 字に かかる');
  const y = SP.y + 28;
  const bottom = y + TITLE_H * HB_BOOK.titleLines.length + 6 + PIC_H + LINE_H * (1 + HB_BOOK.quote.length);
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('hbBookText', () => hbBookCheck());
addBookPeek('hb', drawHbPage);
