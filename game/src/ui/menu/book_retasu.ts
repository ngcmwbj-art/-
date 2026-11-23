// みました帳②の すみの 1ページ『寝とる うちに、とる』（02_ch2_index、events/ch2/retasu.ts）：ペロと コンテナの 前の
// 話の あと（flag_rt_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// ヘッドライトの 光の 筋の 中の レタスの 畝と、白い 汁の 出た 切り口の 鉛筆の 絵。すみに「牛乳 出た！」と 指さす
// グソっ君。ペロの 作業日誌の 字で「ちしゃ＝乳草」。とった 玉 ○/2・見送った 玉 ○/1・洗った 切り口 ○/2。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.rtBookText()、bookPeek('rt')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { RT_BOOK } from '../../data/text/hoshi_retasu';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasRtPage(): boolean {
  return flag('flag_rt_done') > 0;
}

export const RT_ROW_LABEL = RT_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 32;

const taken = () => [0, 1, 2].filter((k) => flag(`flag_rt_tama_${k}`) === 1).length;
const left = () => [0, 1, 2].filter((k) => flag(`flag_rt_tama_${k}`) === 2).length;

export function drawRtPage(g: Gfx, x: number, y: number, w: number): void {
  RT_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * RT_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 131);
  const ly = y + th + 6;
  const pc = UI.pencil;
  // the beam of the head lamp coming down over the row (pencil lines fanning), three heads in it
  const bx = x + 4;
  for (let k = 0; k < 4; k++) g.line(bx + 30, ly, bx + 6 + k * 14, ly + PIC_H - 8, '#C8BC90');
  for (let k = 0; k < 3; k++) {
    const hx = bx + 10 + k * 16;
    g.ring(hx, ly + PIC_H - 10, 5, pc);
    g.line(hx - 8, ly + PIC_H - 4, hx + 8, ly + PIC_H - 4, '#8AA07A');
  }
  // the cut: the stem's round face, white beads on it
  const cx = x + 82;
  const cy = ly + 14;
  g.ring(cx, cy, 10, pc);
  g.circle(cx, cy, 8, '#E8F0D0');
  for (const [dx, dy] of [[-3, -2], [2, -3], [0, 1], [4, 2], [-4, 3]] as const) {
    g.rect(cx + dx, cy + dy, 2, 2, '#FFFFFF');
    g.px(cx + dx + 1, cy + dy + 1, '#B8B0A0');
  }
  // グソっ君 in the corner pointing at it (a round head, an arm)
  const gx = x + 104;
  g.ring(gx + 6, ly + 22, 4, pc);
  g.line(gx + 2, ly + 22, cx + 11, cy + 3, pc);
  let ty = ly + PIC_H;
  pageText(g, RT_BOOK.kn, x + w - 6 - textW(RT_BOOK.kn), ty, { color: '#8A5A7A' });
  ty += LINE_H + 1;
  const counts = [`${taken()}/2`, `${left()}/1`, `${taken()}/2`];
  RT_BOOK.rows.forEach((r, i) => {
    pageText(g, r, x + 2, ty, { color: UI.text });
    pageText(g, counts[i], x + w - 6 - textW(counts[i]), ty, { color: UI.text });
    ty += LINE_H;
  });
  // ペロの 作業日誌の 字
  pageText(g, RT_BOOK.nisshi, x + 4, ty, { color: '#5A6A8A' });
}

export function rtBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(RT_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of RT_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  for (const r of RT_BOOK.rows) if (2 + textW(r) + 8 + textW('2/2') > room) bad.push(`${r}: wide`);
  if (4 + textW(RT_BOOK.nisshi) > room) bad.push(`${RT_BOOK.nisshi}: wide`);
  if (textW(RT_BOOK.kn) > room) bad.push(`${RT_BOOK.kn}: wide`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H * RT_BOOK.titleLines.length + 6 + PIC_H + LINE_H + 1 + LINE_H * (RT_BOOK.rows.length + 1);
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('rtBookText', () => rtBookCheck());
addBookPeek('rt', drawRtPage);
