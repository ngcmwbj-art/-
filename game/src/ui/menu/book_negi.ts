// みました帳②の すみの 1ページ『土を 寄せるほど、白く なる』（02_ch2_index、events/ch2/negi.ts）：マサルの 話の あと
// （flag_nh_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、畝の 断面の
// えんぴつの 絵（土の 線・白い 所・分かれ目）と 3本の 畝の くらべ。すみに 首まで 土に 入った グソっ君と 麦わら帽子。
// 母の 札『ここは 私』。寄せた 畝 ○/2・見た 畝 ○/3。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.nhBookText()、bookPeek('nh')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { NH_BOOK } from '../../data/text/hoshi_negi';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasNhPage(): boolean {
  return flag('flag_nh_done') > 0;
}

export const NH_ROW_LABEL = NH_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 36;

export function drawNhPage(g: Gfx, x: number, y: number, w: number): void {
  NH_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * NH_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 139);
  const ly = y + th + 6;
  const pc = UI.pencil;
  // one leek from the side: the soil line, the white part under it, the fork (a dot), the leaves
  const cx = x + 18;
  const gy = ly + PIC_H - 4;
  const soil = gy - 12;
  const fork = gy - 18;
  g.line(cx, gy, cx, fork, pc);
  g.line(cx + 2, gy, cx + 2, fork, pc);
  g.rect(cx + 1, soil, 1, gy - soil, '#FFFFFF');
  for (const [dx, dy] of [[-7, -12], [-2, -16], [4, -15], [8, -10]] as const) g.line(cx + 1, fork, cx + 1 + dx, fork + dy, '#6A9A5A');
  g.px(cx + 1, fork, '#C86A5A');
  g.line(cx - 12, soil, cx + 14, soil, '#8A6A4A');
  g.line(x + 2, gy, x + 34, gy, pc);
  // three rows compared (low, just right, too high): three little mounds against a dashed fork line
  for (let k = 0; k < 3; k++) {
    const bx = x + 44 + k * 14;
    const h = [3, 8, 12][k];
    g.line(bx, gy, bx + 5, gy - h, pc);
    g.line(bx + 5, gy - h, bx + 10, gy, pc);
    g.line(bx + 5, gy - h, bx + 5, fork - 4, '#6A9A5A');
  }
  for (let xx = x + 42; xx < x + 86; xx += 4) g.px(xx, fork, '#C86A5A');
  // グソっ君 up to the neck (a round head on a mound) and the straw hat
  const gx = x + 98;
  g.ring(gx, gy - 9, 4, pc);
  g.line(gx - 9, gy, gx - 4, gy - 5, pc);
  g.line(gx + 4, gy - 5, gx + 9, gy, pc);
  g.line(gx + 6, ly + 4, gx + 16, ly + 4, '#B8A060');
  g.ring(gx + 11, ly + 2, 3, '#B8A060');
  let ty = ly + PIC_H;
  const counts = [`${(flag('flag_nh_ni') ? 1 : 0) + (flag('flag_nh_san') ? 1 : 0)}/2`, `${(flag('flag_nh_ichi') ? 1 : 0) + (flag('flag_nh_ni') ? 1 : 0) + (flag('flag_nh_san') ? 1 : 0)}/3`];
  NH_BOOK.rows.forEach((r, i) => {
    pageText(g, r, x + 2, ty, { color: UI.text });
    pageText(g, counts[i], x + w - 6 - textW(counts[i]), ty, { color: UI.text });
    ty += LINE_H;
  });
  // the mother's tag
  NH_BOOK.quote.forEach((l, i) => pageText(g, l, x + 4 + i * 12, ty + 1 + i * LINE_H, { color: '#5A6A8A' }));
}

export function nhBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(NH_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of NH_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  for (const r of NH_BOOK.rows) if (2 + textW(r) + 8 + textW('3/3') > room) bad.push(`${r}: wide`);
  NH_BOOK.quote.forEach((l, i) => {
    if (4 + i * 12 + textW(l) > room) bad.push(`${l}: wide`);
  });
  const y = SP.y + 28;
  const bottom = y + TITLE_H * NH_BOOK.titleLines.length + 6 + PIC_H + LINE_H * (NH_BOOK.rows.length + NH_BOOK.quote.length) + 1;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('nhBookText', () => nhBookCheck());
addBookPeek('nh', drawNhPage);
