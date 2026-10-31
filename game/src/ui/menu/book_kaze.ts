// みました帳③の すみの 1ページ『日じゃ なくて、風』（03_ch3_index、events/ch3/kaze.ts）：干物屋の 路地の 角で
// 干し網を ゆらした あと（flag_kz_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに
// 題、路地の 出口で ゆれる 干し網と 物干しの 手ぬぐいの 鉛筆の 絵（風の すじ）、ホシオの 四角い「日」と ホシミの 丸い
// 「風」を まとめる 矢印、すみに いっしょに ゆれて みる グソっ君、つるした 所 ○/3、「半分 当たりと、半分 当たり」。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.kzBookText()、bookPeek('kz')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { KZ_BOOK } from '../../data/text/c3_kaze';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasKzPage(): boolean {
  return flag('flag_kz_done') > 0;
}

export const KZ_ROW_LABEL = KZ_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 36;

function spotN(): number {
  return [0, 1, 2].filter((k) => flag(`flag_kz_s_${k}`)).length;
}

export function drawKzPage(g: Gfx, x: number, y: number, w: number): void {
  const pen = UI.pencil;
  KZ_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * KZ_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, pen, 141);
  const ly = y + th + 6;
  // the corner: the hook's post and arm, the net leaning west in the wind (three rims)
  g.line(x + 30, ly + 2, x + 30, ly + 32, pen);
  g.line(x + 30, ly + 2, x + 44, ly + 2, pen);
  g.line(x + 42, ly + 2, x + 40, ly + 7, pen);
  for (let i = 0; i < 4; i++) {
    const yy = ly + 8 + i * 6;
    const dx = -i * 2;
    g.line(x + 35 + dx, yy, x + 45 + dx, yy, pen);
    if (i < 3) {
      g.line(x + 35 + dx, yy, x + 33 + dx, yy + 6, pen);
      g.line(x + 45 + dx, yy, x + 43 + dx, yy + 6, pen);
    }
  }
  // the drying pole and the tenugui with its blue lines, flying west
  g.line(x + 54, ly + 4, x + 54, ly + 32, pen);
  g.line(x + 78, ly + 4, x + 78, ly + 32, pen);
  g.line(x + 54, ly + 4, x + 78, ly + 4, pen);
  g.frame(x + 58, ly + 5, 7, 12, pen);
  g.line(x + 58, ly + 9, x + 64, ly + 9, '#4A6AB0');
  g.line(x + 58, ly + 13, x + 64, ly + 13, '#4A6AB0');
  g.rect(x + 70, ly + 6, 2, 2, '#C25A4A');
  g.rect(x + 74, ly + 6, 2, 2, '#4A8AC0');
  // the wind: three strokes from the harbour side
  for (let i = 0; i < 3; i++) g.line(x + 84 + i * 3, ly + 10 + i * 7, x + 96 + i * 3, ly + 10 + i * 7, '#A8A0B8');
  // 「日」 in a square hand, 「風」 in a round one, an arrow bringing them together
  g.frame(x + 2, ly + 2, 14, 14, '#7A5A4A');
  g.text('日', x + 3, ly + 1, { color: '#7A5A4A' });
  g.text('風', x + 3, ly + 19, { color: '#5A6A8A' });
  g.line(x + 18, ly + 9, x + 24, ly + 18, pen);
  g.line(x + 18, ly + 27, x + 24, ly + 18, pen);
  g.line(x + 24, ly + 18, x + 28, ly + 18, pen);
  // グソっ君 swaying beside the pole (the round grey back, leaning)
  const kx = x + 102;
  g.frame(kx, ly + 22, 12, 8, pen);
  g.line(kx + 2, ly + 22, kx - 1, ly + 17, pen);
  g.line(kx + 9, ly + 22, kx + 7, ly + 17, pen);
  let yy = ly + PIC_H;
  pageText(g, KZ_BOOK.kn, x + 2, yy, { color: '#8A6A8A' });
  yy += LINE_H;
  pageText(g, KZ_BOOK.spots(spotN()), x + 2, yy, { color: UI.text });
  yy += LINE_H + 4;
  for (const l of KZ_BOOK.quote) {
    pageText(g, l, x + 4, yy, { color: '#5A6A8A' });
    yy += LINE_H;
  }
}

export function kzBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(KZ_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of KZ_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  if (2 + textW(KZ_BOOK.kn) > room) bad.push('グソっ君: wide');
  if (2 + textW(KZ_BOOK.spots(3)) > room) bad.push('所: wide');
  for (const l of KZ_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (116 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H * KZ_BOOK.titleLines.length + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * KZ_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('kzBookText', () => kzBookCheck());
addBookPeek('kz', drawKzPage);
