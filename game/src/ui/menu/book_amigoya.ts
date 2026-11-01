// みました帳③の すみの 1ページ『破れたら、つくろう』（03_ch3_index、events/ch3/amigoya.ts）：網小屋で 破れを 3つ
// つくろった あと（flag_ag_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 窓の 光に かざした 網と、つくろった 目（新しい 糸）の 鉛筆の 絵、床に 落ちる 網目の 影、すみに 結び目を 押さえる
// グソっ君と 小さく「親戚が すんません」、つくろった 破れ ○/3 と 結んだ 目の 数、ゴロウの 字の「また 出る」。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.agBookText()、bookPeek('ag')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { AG_BOOK } from '../../data/text/c3_amigoya';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasAgPage(): boolean {
  return flag('flag_ag_done') > 0;
}

export const AG_ROW_LABEL = AG_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;

function anaN(): number {
  return [0, 1, 2].filter((k) => flag(`flag_ag_ana_${k}`)).length;
}
function meN(): number {
  return [0, 1, 2].reduce((s, k) => s + flag(`flag_ag_me_${k}`), 0);
}

export function drawAgPage(g: Gfx, x: number, y: number, w: number): void {
  const pen = UI.pencil;
  AG_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * AG_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, pen, 137);
  const ly = y + th + 6;
  // the window (top right) and the net held up to its light: diamonds, the mended ones in green
  g.frame(x + 96, ly, 20, 14, pen);
  g.line(x + 106, ly, x + 106, ly + 13, pen);
  for (let i = 0; i < 5; i++)
    for (let j = 0; j < 2; j++) {
      const cx = x + 10 + i * 14 + (j % 2) * 7;
      const cy = ly + 6 + j * 7;
      const col = i === 2 && j === 1 ? '#4A8A5A' : pen;
      g.line(cx - 6, cy, cx, cy - 5, col);
      g.line(cx, cy - 5, cx + 6, cy, col);
      g.line(cx + 6, cy, cx, cy + 5, col);
      g.line(cx, cy + 5, cx - 6, cy, col);
    }
  // the mesh's shadow on the floor: a few light diamonds slanting under it
  for (let i = 0; i < 4; i++) {
    const cx = x + 18 + i * 14;
    const cy = ly + 27;
    g.line(cx - 5, cy, cx - 1, cy - 3, '#A8A0B8');
    g.line(cx - 1, cy - 3, cx + 5, cy, '#A8A0B8');
  }
  // グソっ君 pressing a knot, in the corner
  const kx = x + 104;
  g.frame(kx, ly + 20, 12, 9, pen);
  g.line(kx + 3, ly + 20, kx + 1, ly + 16, pen);
  g.line(kx + 9, ly + 20, kx + 11, ly + 16, '#C25A4A');
  g.rect(kx + 10, ly + 15, 3, 2, '#C25A4A');
  let yy = ly + PIC_H;
  pageText(g, AG_BOOK.kn, x + 2, yy, { color: '#8A6A8A' });
  yy += LINE_H;
  pageText(g, AG_BOOK.ana(anaN()), x + 2, yy, { color: UI.text });
  yy += LINE_H;
  pageText(g, AG_BOOK.me(meN()), x + 2, yy, { color: UI.text });
  yy += LINE_H + 4;
  for (const l of AG_BOOK.quote) {
    pageText(g, l, x + 4, yy, { color: '#5A6A8A' });
    yy += LINE_H;
  }
}

export function agBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(AG_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of AG_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  if (2 + textW(AG_BOOK.kn) > room) bad.push('グソっ君: wide');
  if (2 + textW(AG_BOOK.ana(3)) > room) bad.push('破れ: wide');
  if (2 + textW(AG_BOOK.me(99)) > room) bad.push('目: wide');
  for (const l of AG_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (118 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H * AG_BOOK.titleLines.length + 6 + PIC_H + LINE_H * 3 + 4 + LINE_H * AG_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('agBookText', () => agBookCheck());
addBookPeek('ag', drawAgPage);
