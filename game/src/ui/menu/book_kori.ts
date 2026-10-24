// みました帳③の すみの 1ページ『明日の 朝の 氷』（03_ch3_index、events/ch3/kori.ts）：荷さばき場で 明日の 朝の
// 氷が できた あと（flag_kr_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 角氷 3本（まわりが すきとおって、まん中が 白い）と 分かれ道で 曲がる 矢印の 鉛筆の 絵、すみに 防寒着の グソっ君、
// ツグミの 字の「いきまーす！」、押した 回数（「〇回で 3本」）、ゲンの「氷を 作るんは、明日が 来ると 思うとる もんだけじゃ。」。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.krBookText()、bookPeek('kr')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { KR_BOOK } from '../../data/text/c3_kori';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasKrPage(): boolean {
  return flag('flag_kr_done') > 0;
}

export const KR_ROW_LABEL = KR_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 24;

export function drawKrPage(g: Gfx, x: number, y: number, w: number): void {
  const pen = UI.pencil;
  KR_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * KR_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, pen, 131);
  const ly = y + th + 6;
  // the ice-road: along, a branch going down and round, an arrow
  g.line(x + 2, ly + 6, x + 70, ly + 6, pen);
  g.line(x + 22, ly + 6, x + 22, ly + 22, pen);
  g.line(x + 22, ly + 22, x + 60, ly + 22, pen);
  g.line(x + 60, ly + 22, x + 60, ly + 6, pen);
  g.line(x + 30, ly + 22, x + 40, ly + 22, '#5A6A8A');
  g.line(x + 37, ly + 19, x + 40, ly + 22, '#5A6A8A');
  g.line(x + 37, ly + 25, x + 40, ly + 22, '#5A6A8A');
  // three blocks: clear round the edge, white in the middle
  for (let i = 0; i < 3; i++) {
    const bx = x + 76 + i * 14;
    g.frame(bx, ly + 1, 12, 10, '#7AA8C8');
    g.rect(bx + 3, ly + 4, 6, 4, '#FFFFFF');
  }
  // グソっ君 in the padded coat, in the corner
  const kx = x + 124;
  g.frame(kx, ly + 12, 12, 9, pen);
  g.rect(kx + 1, ly + 15, 10, 6, '#2F4A8A');
  g.line(kx + 3, ly + 12, kx + 1, ly + 8, pen);
  g.line(kx + 9, ly + 12, kx + 11, ly + 8, pen);
  let yy = ly + PIC_H;
  pageText(g, KR_BOOK.aizu, x + 2, yy, { color: '#4A7AA8' });
  yy += LINE_H;
  pageText(g, KR_BOOK.count(Math.max(3, flag('flag_kr_push'))), x + 2, yy, { color: UI.text });
  yy += LINE_H + 4;
  for (const l of KR_BOOK.quote) {
    pageText(g, l, x + 4, yy, { color: '#5A6A8A' });
    yy += LINE_H;
  }
}

export function krBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(KR_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of KR_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  if (2 + textW(KR_BOOK.aizu) > room) bad.push('合図: wide');
  if (2 + textW(KR_BOOK.count(99)) > room) bad.push('回数: wide');
  for (const l of KR_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (136 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H * KR_BOOK.titleLines.length + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * KR_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('krBookText', () => krBookCheck());
addBookPeek('kr', drawKrPage);
