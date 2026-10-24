// みました帳②の すみの 1ページ『絵の きゅうりは、とり遅れない』（02_ch2_index、events/ch2/kyuri.ts）：札と くらべた
// あと（flag_ky_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、札の 細い
// きゅうりの 絵と、その 横に 並べた 3本（ちょうど・まがった 1本・腕くらいの 1本）の 鉛筆の 絵、すみに トゲに おどろく
// グソっ君、ソワカの「絵の きゅうりは、とり遅れないのよ。」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.kyBookText()、bookPeek('ky')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { KY_BOOK } from '../../data/text/hoshi_kyuri';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasKyPage(): boolean {
  return flag('flag_ky_done') > 0;
}

export const KY_ROW_LABEL = KY_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 46;

/** きゅうり 1本（鉛筆。たて）。k 0 まっすぐ・1 くの字・2 腕くらい・3 札の 絵（細くて まっすぐ、色つき）。 */
function cuke(g: Gfx, x: number, y: number, k: number): void {
  const c = k === 3 ? '#4E8A3E' : UI.pencil;
  const len = k === 0 ? 26 : k === 1 ? 28 : k === 2 ? 34 : 24;
  const half = k === 2 ? 4 : k === 1 ? 2 : k === 3 ? 1 : 2;
  for (let j = 0; j <= len; j += 1) {
    const bend = k === 1 ? Math.round(Math.max(0, j - len * 0.45) * 0.35) : 0;
    const h = j < 2 || j > len - 2 ? Math.max(1, half - 1) : half;
    g.px(x - h + bend, y + j, c);
    g.px(x + h + bend, y + j, c);
  }
  g.line(x - 1, y - 2, x + 1, y - 2, c);
  // the spines
  if (k !== 3) for (let j = 3; j < len; j += 6) g.px(x - half - 1, y + j, c);
}

export function drawKyPage(g: Gfx, x: number, y: number, w: number): void {
  const lines = textW(KY_BOOK.title) > w - 6 ? KY_BOOK.titleLines : [KY_BOOK.title];
  lines.forEach((l, i) => g.text(l, x, y + i * 14, { color: UI.text }));
  const ty = y + (lines.length - 1) * 14;
  pencilLine(g, x, ty + TITLE_H + 1, w - 6, 1, UI.pencil, 119);
  let ly = ty + TITLE_H + 6;
  // the sign (a little card with its drawn cucumber), then the three real ones
  g.frame(x + 4, ly + 2, 18, 34, '#A8A4B4');
  g.text(KY_BOOK.fuda, x + 6, ly + 36, { color: UI.pencil });
  cuke(g, x + 13, ly + 7, 3);
  for (let k = 0; k < 3; k++) cuke(g, x + 38 + k * 18, ly + 4, k);
  // グソっ君 startled by the spines (a round head, a little 「!」)
  const gx = x + 100;
  g.line(gx + 2, ly + 14, gx + 10, ly + 14, UI.pencil);
  g.line(gx, ly + 16, gx, ly + 24, UI.pencil);
  g.line(gx + 12, ly + 16, gx + 12, ly + 24, UI.pencil);
  g.line(gx + 2, ly + 26, gx + 10, ly + 26, UI.pencil);
  g.px(gx + 4, ly + 20, UI.pencil);
  g.px(gx + 8, ly + 20, UI.pencil);
  g.line(gx + 16, ly + 6, gx + 16, ly + 11, UI.pencil);
  g.px(gx + 16, ly + 13, UI.pencil);
  ly += PIC_H;
  for (const l of KY_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function kyBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(KY_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  const lines = textW(KY_BOOK.title) > room ? KY_BOOK.titleLines : [KY_BOOK.title];
  for (const l of lines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  for (const l of KY_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (118 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + (lines.length - 1) * 14 + TITLE_H + 6 + PIC_H + LINE_H * KY_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('kyBookText', () => kyBookCheck());
addBookPeek('ky', drawKyPage);
