// みました帳②の すみの 1ページ『幕の 中の 停留所』（02_ch2_index、events/ch2/busmaku.ts）：幕を『ユウナリ前』に
// もどした あと（flag_bm_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 巻物を ひらいた 鉛筆の 絵（5つの 行き先が 順に 並ぶ。見た 行き先だけ 字が 入る。『分校前』に しゅんの 字で 小さな 丸）、
// 見た 行き先の 数、さんかどの「宛先が なくなっても、幕は 覚えてるんだね。」。ふしぎの 数には 入れない。
//
// QA：__game.cmd.bmBookText()、bookPeek('bm')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { BM_BOOK, BM_MAKU } from '../../data/text/hoshi_busmaku';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasBmPage(): boolean {
  return flag('flag_bm_done') > 0;
}

export const BM_ROW_LABEL = BM_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
/** 巻物の 1こまの 高さ（絵）。 */
const ROW = 16;
/** 2つの 列（左：回送・星見台・貸切、右：ユウナリ前・分校前）。 */
const COL_X = [0, 52];
const COL_W = [50, 82];

function seenCount(): number {
  let n = 0;
  for (let i = 0; i < BM_MAKU.length; i++) if (flag('flag_bm_seen') & (1 << i)) n++;
  return n;
}

export function drawBmPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(BM_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 119);
  let ly = y + TITLE_H + 6;
  // the roll laid open: the five stops in their order (left, then right), each in its frame of the film;
  // the ones not seen are blank frames
  const rx = x + 2;
  g.rect(rx - 2, ly - 2, COL_X[1] + COL_W[1] + 2, 2, UI.pencil);
  for (let i = 0; i < BM_MAKU.length; i++) {
    const cx = rx + COL_X[i % 2];
    const cw = COL_W[i % 2];
    const top = ly + 1 + Math.floor(i / 2) * ROW;
    g.line(cx, top + ROW - 1, cx + cw - 2, top + ROW - 1, '#9A94A8');
    if (flag('flag_bm_seen') & (1 << i)) pageText(g, BM_MAKU[i], cx + 2, top - 1, { color: UI.text });
    // しゅん's small circle round 『分校前』's corner
    if (i === 3 && flag('flag_bm_seen') & 8) {
      const ox = cx + cw - 8;
      const oy = top + 5;
      for (let a = 0; a < 12; a++) g.px(Math.round(ox + Math.cos((a / 12) * Math.PI * 2) * 4), Math.round(oy + Math.sin((a / 12) * Math.PI * 2) * 4), '#A85A5A');
    }
  }
  // how many of the five were seen (in the last row's empty half)
  pageText(g, BM_BOOK.seen(seenCount()), rx + COL_X[1] + 6, ly + 1 + 2 * ROW - 1, { color: UI.pencil });
  ly += 1 + 3 * ROW + 1;
  g.rect(rx - 2, ly, COL_X[1] + COL_W[1] + 2, 2, UI.pencil);
  ly += 6;
  for (const l of BM_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function bmBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(BM_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(BM_BOOK.title) > room) bad.push(`${BM_BOOK.title}: ${textW(BM_BOOK.title)}px`);
  if (2 + COL_X[1] + 6 + textW(BM_BOOK.seen(5)) > room) bad.push(`${BM_BOOK.seen(5)}: wide`);
  for (const l of BM_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px > ${room}`);
  BM_MAKU.forEach((n, i) => {
    if (2 + textW(n) + (i === 3 ? 12 : 0) > COL_W[i % 2]) bad.push(`${n}: 幕に 入らない`);
  });
  if (2 + COL_X[1] + COL_W[1] > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + 1 + 3 * ROW + 1 + 6 + LINE_H * BM_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('bmBookText', () => bmBookCheck());
addBookPeek('bm', drawBmPage);
