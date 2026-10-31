// みました帳③の すみの 1ページ『背中は 海の 色』（03_ch3_index、events/ch3/mure.ts）：防波堤の ツリノに 背中と 腹の
// 話を 聞いた あと（flag_mr_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 小アジ 1ぴきを 上・下・横から 描いた 3つの 鉛筆の 絵（上は 青黒く ぬって、下は 白い まま、横は 銀と 青黒の 2色）、
// 見え方と 横から 見た 群れの 数、ツリノの 字「背は 海、腹は 空」。すみに、背中と 腹を 同じ 色で ぬって しまった
// グソっ君。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.mrBookText()、bookPeek('mr')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { MR_BOOK } from '../../data/text/c3_mure';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasMrPage(): boolean {
  return flag('flag_mr_done') > 0;
}

export const MR_ROW_LABEL = MR_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;
/** ツリノの 字（鉛筆の 濃い 字）。 */
const TSURI_C = '#3A3A4A';
const BLUE = '#5A7A96';

function count(ids: string[]): number {
  return ids.filter((id) => flag(id) > 0).length;
}

/** 1ぴき（鉛筆の 線）。back：背を ぬる 色、belly：腹を ぬる 色（null＝ぬらない）。 */
function fish(g: Gfx, x: number, y: number, back: string | null, belly: string | null): void {
  const pc = UI.pencil;
  if (back) g.rect(x + 2, y - 2, 12, 2, back);
  if (belly) g.rect(x + 2, y + 1, 12, 2, belly);
  g.line(x, y, x + 4, y - 3, pc);
  g.line(x + 4, y - 3, x + 12, y - 3, pc);
  g.line(x + 12, y - 3, x + 16, y, pc);
  g.line(x, y, x + 4, y + 3, pc);
  g.line(x + 4, y + 3, x + 12, y + 3, pc);
  g.line(x + 12, y + 3, x + 16, y, pc);
  g.line(x + 16, y, x + 19, y - 3, pc);
  g.line(x + 16, y, x + 19, y + 3, pc);
  g.rect(x + 3, y - 1, 1, 1, pc);
}

function pic(g: Gfx, x: number, y: number): void {
  const pc = UI.pencil;
  const by = y + 12;
  // from above: a slim back, filled dark (it melts into the sea)
  g.rect(x + 2, by - 1, 16, 3, BLUE);
  g.line(x + 1, by, x + 18, by, pc);
  g.line(x + 18, by, x + 21, by - 2, pc);
  g.line(x + 18, by, x + 21, by + 2, pc);
  // from below: the belly, left white
  g.line(x + 28, by - 1, x + 45, by - 1, pc);
  g.line(x + 28, by + 2, x + 45, by + 2, pc);
  // from the side: the back dark, the belly silver
  fish(g, x + 52, by, BLUE, '#C8D0D8');
  MR_BOOK.labels.forEach((l, i) => pageText(g, l, x + 4 + i * 26, by + 6, { color: UI.pencil }));
  // グソっ君 in the corner: back and belly coloured the same
  const kx = x + 90;
  g.rect(kx - 5, by - 4, 10, 8, '#B8B0C8');
  g.ring(kx, by, 5, pc);
  g.line(kx - 4, by + 4, kx - 6, by + 7, pc);
  g.line(kx + 4, by + 4, kx + 6, by + 7, pc);
}

export function drawMrPage(g: Gfx, x: number, y: number, w: number): void {
  MR_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * MR_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 120);
  let ly = y + th + 6;
  pic(g, x + 4, ly);
  ly += PIC_H;
  const mie = count(['flag_mr_ue', 'flag_mr_shita', 'flag_mr_yoko']);
  const mure = count(['flag_mr_mure_1', 'flag_mr_mure_2', 'flag_mr_mure_3']);
  pageText(g, MR_BOOK.mie(mie), x + 2, ly, { color: mie >= 3 ? UI.accent : UI.text });
  ly += LINE_H;
  pageText(g, MR_BOOK.mure(mure), x + 2, ly, { color: mure >= 3 ? UI.accent : UI.text });
  ly += LINE_H + 4;
  MR_BOOK.tsuri.forEach((l, i) => pageText(g, l, x + 6 + i * 12, ly + i * LINE_H, { color: TSURI_C }));
}

export function mrBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(MR_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of MR_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  for (const l of [MR_BOOK.mie(3), MR_BOOK.mure(3)]) if (2 + textW(l) > room) bad.push(`${l}: wide`);
  MR_BOOK.tsuri.forEach((l, i) => {
    if (6 + i * 12 + textW(l) > room) bad.push(`${l}: ${6 + i * 12 + textW(l)}px`);
  });
  if (4 + 97 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H * MR_BOOK.titleLines.length + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * MR_BOOK.tsuri.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('mrBookText', () => mrBookCheck());
addBookPeek('mr', drawMrPage);
