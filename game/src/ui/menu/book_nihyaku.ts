// みました帳②の すみの 1ページ『二百十日の 前の 晩』（げむきか10/1の5、02_ch2_index #78、
// 50 10.24・8.11）：4人に 聞きおえると（flag_nihyaku_done）、②の「ふしぎ」の 一覧の
// いちばん下に 番号なしの 1行（鉛筆の 字）が 足され、右の ページに しゅんの 字で
// 題と 4人の 行（名前は 鉛筆、聞いたことは インク）。すみに、小屋の 表を 写した
// 朱の『風』。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.nihyakuBookText()（wrapCheck も 呼ぶ）。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { NIHYAKU_BOOK } from '../../data/text/hoshi_nihyaku';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, RP, SP } from './notebook';

/** The four have answered: ② has its corner page. */
export function hasNihyakuPage(): boolean {
  return flag('flag_nihyaku_done') > 0;
}

/** The title as the index row shows it (pencil, no number; broken after 「二百十日の」). */
export const NIHYAKU_ROW_LABEL = NIHYAKU_BOOK.title.replace('の ', 'の\n');

const TITLE_H = 17;
const LINE_H = 16;
const ROWS_DY = TITLE_H + 5;

interface Ln {
  name: string;
  note: string;
  /** Second line of a note (tucked in under its name). */
  dx: number;
}

/** The page's lines: 「名前：聞いたこと」 on one line when it fits, else the name and the note under it. */
function pageLines(w: number): { lines: Ln[]; forced: number; wide: number } {
  const lines: Ln[] = [];
  let forced = 0;
  let wide = 0;
  for (const [name, note] of NIHYAKU_BOOK.rows) {
    if (textW(`${name}：${note}`) <= w) {
      lines.push({ name: `${name}：`, note, dx: 0 });
      continue;
    }
    lines.push({ name: `${name}：`, note: '', dx: 0 });
    const r = phraseWrapInfo(note, w - 8);
    forced += r.forced;
    for (const l of r.lines) {
      if (textW(l) > w - 8) wide++;
      lines.push({ name: '', note: l, dx: 8 });
    }
  }
  return { lines, forced, wide };
}

/** The room under the title on the right page, in lines. */
function room(y: number): number {
  const bottom = SP.y + SP.h - 10;
  return Math.floor((bottom - (y + ROWS_DY)) / LINE_H);
}

/** The right page: the title (ink), a pencil rule, the four (names in pencil), a 朱『風』 copied from the chart. */
export function drawNihyakuPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(NIHYAKU_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 21);
  const { lines } = pageLines(w);
  let ly = y + ROWS_DY;
  let lastRight = x;
  for (const l of lines) {
    if (l.name) g.text(l.name, x, ly, { color: UI.pencil });
    const nx = x + (l.name ? textW(l.name) : l.dx);
    if (l.note) g.text(l.note, nx, ly, { color: UI.text });
    lastRight = l.note ? nx + textW(l.note) : x + textW(l.name);
    ly += LINE_H;
  }
  // the corner: 『風』 in 朱, in a pencil box, as on the chart in the shed (clear of the last line)
  const bx = x + w - 26;
  const by = SP.y + SP.h - 30;
  if (by >= ly - 2 || lastRight + 6 <= bx) {
    g.rect(bx, by, 20, 1, UI.pencil);
    g.rect(bx, by + 19, 20, 1, UI.pencil);
    g.rect(bx, by, 1, 20, UI.pencil);
    g.rect(bx + 19, by, 1, 20, UI.pencil);
    g.text('風', bx + 2, by + 1, { color: UI.accent });
  }
}

/** QA: the index row and the page fit (the row: 2 lines at the label width; the page: its room under the title). */
export function nihyakuBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(NIHYAKU_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  if (textW(NIHYAKU_BOOK.title) > RP.w - 6) bad.push(`題: ${textW(NIHYAKU_BOOK.title)}px > ${RP.w - 6}`);
  const p = pageLines(RP.w);
  const r = room(SP.y + 28);
  if (p.lines.length > r) bad.push(`本文: ${p.lines.length} lines > ${r}`);
  if (p.forced || p.wide) bad.push(`本文: forced ${p.forced}, wide ${p.wide}`);
  return { pages: 1, bad };
}

registerDebug('nihyakuBookText', () => nihyakuBookCheck());
