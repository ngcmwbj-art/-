// みました帳②の すみの 1ページ『当たりは、かじって みんと』（02_ch2_index、events/ch2/shishito.ts）：七輪で 焼いた
// あと（flag_ss_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、七輪の
// 網の 上の シシトウと はじけた 1本の 鉛筆の 絵、しゅんの 字の「あたり：」（当たった 人の 名前が 並ぶ）、
// ペロの「当たりは、かじって みんと 分からんさ。」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.ssBookText()、bookPeek('ss')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { SS_BOOK } from '../../data/text/hoshi_shishito';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasSsPage(): boolean {
  return flag('flag_ss_done') > 0;
}

export const SS_ROW_LABEL = SS_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 26;
const WHO = ['shun', 'kn', 'pero'];

/** 網の 上の 1本（鉛筆）。burst：はじけた 1本。 */
function pod(g: Gfx, x: number, y: number, burst: boolean): void {
  const c = UI.pencil;
  if (burst) {
    g.line(x, y, x + 5, y - 1, c);
    g.line(x + 8, y - 2, x + 13, y, c);
    for (const [dx, dy] of [[6, -5], [9, -6], [4, -6], [11, -4]] as const) g.px(x + dx, y + dy, c);
    return;
  }
  g.line(x, y - 1, x + 13, y - 1, c);
  g.line(x, y + 1, x + 12, y + 1, c);
  g.px(x + 13, y, c);
  g.line(x - 3, y, x, y, '#6A8A3A');
}

export function drawSsPage(g: Gfx, x: number, y: number, w: number): void {
  // the title on two lines if it does not fit
  const titleLines = textW(SS_BOOK.title) > w - 6 ? ['当たりは、', 'かじって みんと'] : [SS_BOOK.title];
  titleLines.forEach((l, i) => g.text(l, x, y + i * 14, { color: UI.text }));
  const ty = y + (titleLines.length - 1) * 14;
  pencilLine(g, x, ty + TITLE_H + 1, w - 6, 1, UI.pencil, 112);
  let ly = ty + TITLE_H + 6;
  // the net (a few lines across and down) and the pods on it, the one that burst at the end
  const nx = x + 8;
  for (let i = 0; i <= 4; i++) g.line(nx, ly + 4 + i * 5, nx + 70, ly + 4 + i * 5, '#A8A4B4');
  for (let i = 0; i <= 7; i++) g.line(nx + i * 10, ly + 4, nx + i * 10, ly + 24, '#A8A4B4');
  for (let i = 0; i < 3; i++) pod(g, nx + 4 + i * 22, ly + 9, false);
  for (let i = 0; i < 2; i++) pod(g, nx + 10 + i * 22, ly + 19, false);
  pod(g, nx + 54, ly + 19, true);
  ly += PIC_H;
  pageText(g, SS_BOOK.atari, x + 2, ly, { color: UI.text });
  // the names after the label; those that do not fit on the next line
  const names = WHO.filter((k) => flag(`flag_ss_hit_${k}`)).map((k) => SS_BOOK.names[k]);
  let ax = x + 4 + textW(SS_BOOK.atari);
  for (const n of names) {
    if (ax + textW(n) > x + w - 6) {
      ly += LINE_H;
      ax = x + 10;
    }
    pageText(g, n, ax, ly, { color: UI.accent });
    ax += textW(n) + 6;
  }
  ly += LINE_H + 4;
  for (const l of SS_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function ssBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(SS_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  const twoLine = textW(SS_BOOK.title) > room;
  if (twoLine) for (const l of ['当たりは、', 'かじって みんと']) if (textW(l) > room) bad.push(`題: ${l}: ${textW(l)}px`);
  for (const l of SS_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  // the names: after the label, the rest on the next line (never a third)
  const names = WHO.map((k) => SS_BOOK.names[k]);
  let ax = 4 + textW(SS_BOOK.atari);
  let lines = 1;
  for (const n of names) {
    if (ax + textW(n) > room) {
      lines++;
      ax = 10;
    }
    if (ax + textW(n) > room) bad.push(`あたり: ${n}: wide`);
    ax += textW(n) + 6;
  }
  if (lines > 2) bad.push(`あたり: ${lines} lines`);
  const y = SP.y + 28 + (twoLine ? 14 : 0);
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * lines + 4 + LINE_H * SS_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('ssBookText', () => ssBookCheck());
addBookPeek('ss', drawSsPage);
