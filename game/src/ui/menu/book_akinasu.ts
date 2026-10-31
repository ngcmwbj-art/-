// みました帳②の すみの 1ページ『切ったら、また なる』（02_ch2_index、events/ch2/akinasu.ts）：ぴょん夫人と ハモ区長の
// 話の あと（flag_an_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// ひざの 高さの 切り口から 新しい 枝が のびた 株と、下を 向いた 紫の 花、まん中の めしべの 寄りの 鉛筆の 絵、
// 親指くらいの ナスが 1つ。すみに 灯りで 花を のぞく グソっ君。ぴょん夫人の 字で「めしべが 長いのは 元気」、
// すみに 区長の 字で 小さく「えー」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.anBookText()、bookPeek('an')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { AN_BOOK } from '../../data/text/hoshi_akinasu';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasAnPage(): boolean {
  return flag('flag_an_done') > 0;
}

export const AN_ROW_LABEL = AN_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 44;

export function drawAnPage(g: Gfx, x: number, y: number, w: number): void {
  // (the title in two lines: the page is narrow)
  AN_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * AN_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 127);
  const ly = y + th + 6;
  const pc = UI.pencil;
  // the plant: the old stem cut at knee height, the new branches, a leaf or two, a flower hanging down, the little fruit
  const bx = x + 14;
  const by = ly + PIC_H - 4;
  g.line(bx, by, bx, by - 16, pc);
  g.line(bx - 2, by - 16, bx + 2, by - 16, pc);
  g.line(bx, by - 12, bx - 9, by - 30, pc);
  g.line(bx, by - 12, bx + 10, by - 32, pc);
  g.circle(bx - 11, by - 28, 4, '#8AA07A');
  g.circle(bx + 12, by - 30, 4, '#8AA07A');
  g.rect(bx + 8, by - 26, 4, 4, '#8A6AB8');
  g.rect(bx - 6, by - 20, 3, 6, '#5A3A6A');
  // the close-up of the flower's middle: the stamens' cone (yellow), the pistil out past it (green)
  const cx = x + 64;
  const cy = ly + 4;
  g.frame(cx - 18, cy - 2, 36, 38, pc);
  for (let k = 0; k < 12; k++) {
    const h = 4 + Math.round(k * 1.1);
    g.rect(cx - h, cy + k, h * 2 + 1, 1, '#B898D8');
  }
  for (let k = 0; k < 12; k++) g.rect(cx - Math.max(1, 3 - Math.floor(k / 4)), cy + 4 + k, Math.max(1, 3 - Math.floor(k / 4)) * 2 + 1, 1, '#E0B830');
  g.rect(cx, cy + 16, 1, 12, '#7AAA4A');
  g.rect(cx - 1, cy + 28, 3, 2, '#7AAA4A');
  // グソっ君 peeping at it with the light (a round head, the light's dot)
  const gx = x + 96;
  g.ring(gx + 6, ly + 26, 5, pc);
  g.px(gx + 4, ly + 25, pc);
  g.px(gx + 8, ly + 25, pc);
  g.circle(gx + 6, ly + 36, 2, '#E23B2E');
  let ty = ly + PIC_H;
  pageText(g, AN_BOOK.count(3), x + 2, ty, { color: UI.text });
  ty += LINE_H;
  for (const l of AN_BOOK.quote) {
    pageText(g, l, x + 4, ty, { color: '#8A5A7A' });
    ty += LINE_H;
  }
  // the 区長's tiny 「えー」 in the corner
  pageText(g, AN_BOOK.kucho, x + w - 6 - textW(AN_BOOK.kucho), ty - LINE_H, { color: UI.pencil });
}

export function anBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(AN_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of AN_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  if (2 + textW(AN_BOOK.count(3)) > room) bad.push(`${AN_BOOK.count(3)}: wide`);
  for (const l of AN_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  const last = AN_BOOK.quote[AN_BOOK.quote.length - 1];
  if (4 + textW(last) + 8 + textW(AN_BOOK.kucho) > room) bad.push('えー が 字に かかる');
  const y = SP.y + 28;
  const bottom = y + TITLE_H * AN_BOOK.titleLines.length + 6 + PIC_H + LINE_H * (1 + AN_BOOK.quote.length);
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('anBookText', () => anBookCheck());
addBookPeek('an', drawAnPage);
