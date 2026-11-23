// みました帳②の すみの 1ページ『店番の 下絵』（無人販売所の 店番、02_ch2_index #94、50 10.30・8.11）：
// できあがった あと（flag_tenban_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。
// 右の ページに しゅんの 字で 題、ソワカの 下絵（1倍。動いた 回数の 絵）、その 右に 級（朱）と
// 『うごいた n回』、下に『売り上げ 100円×5』。0回なら 下絵の すみに はさみの サイン。
// 〔satoshi〕を 聞いたら『本物より うまそう？』（鉛筆）。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.tenbanBookText()（wrapCheck も 呼ぶ）。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { TENBAN_BOOK, tenbanRank } from '../../data/text/hoshi_tenban';
import { SKETCH_H, SKETCH_W, tenbanSketch } from '../../art/props/tenban_art';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { clearRight, FOLD, LP, pageText, RP, SP } from './notebook';

export function hasTenbanPage(): boolean {
  return flag('flag_tenban_done') > 0;
}

export const TENBAN_ROW_LABEL = TENBAN_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;

export function drawTenbanPage(g: Gfx, x: number, y: number, w: number): void {
  const moves = flag('flag_tenban_moves');
  const rank = tenbanRank(moves);
  g.text(TENBAN_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 94);
  const y0 = y + TITLE_H + 7;
  // the sketch, taped in at a slight angle (two bits of tape)
  g.rect(x + 1, y0 + 1, SKETCH_W + 2, SKETCH_H + 2, UI.bg2);
  g.img(tenbanSketch(4, rank, flag('flag_tenban_sign') > 0), x, y0);
  g.rect(x + 4, y0 - 2, 10, 4, UI.tape, 0.8);
  g.rect(x + SKETCH_W - 14, y0 + SKETCH_H - 2, 10, 4, UI.tape, 0.8);
  // beside it: the rank (朱) and the moves (鉛筆)
  const tx = x + SKETCH_W + 4;
  g.text(TENBAN_BOOK.ranks[rank], tx, y0 + 12, { color: UI.accent });
  // under it: the moves, the takings, and her word on サトシくん
  let ly = y0 + SKETCH_H + 8;
  pageText(g, TENBAN_BOOK.moved(moves), x, ly, { color: UI.pencil });
  ly += LINE_H + 2;
  pageText(g, TENBAN_BOOK.uriage, x, ly, { color: UI.text });
  ly += LINE_H + 2;
  if (flag('flag_tenban_satoshi')) pageText(g, TENBAN_BOOK.satoshi, x, ly, { color: UI.pencil });
}

export function tenbanBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(TENBAN_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const y = SP.y + 28;
  const y0 = y + TITLE_H + 7;
  const tx = RP.x + SKETCH_W + 4;
  for (const t of TENBAN_BOOK.ranks) {
    const ry = y0 + 12;
    const room = Math.min(RP.x + RP.w, clearRight(999, ry, ry + 16) + 1) - tx;
    if (textW(t) > room) bad.push(`${t}: ${textW(t)}px > ${room}`);
  }
  let ly = y0 + SKETCH_H + 8;
  for (const t of [TENBAN_BOOK.moved(9), TENBAN_BOOK.uriage, TENBAN_BOOK.satoshi]) {
    if (textW(t) > RP.w) bad.push(`${t}: ${textW(t)}px > ${RP.w}`);
    ly += LINE_H + 2;
  }
  if (ly > SP.y + SP.h - 2) bad.push(`本文: bottom ${ly} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('tenbanBookText', () => tenbanBookCheck());
