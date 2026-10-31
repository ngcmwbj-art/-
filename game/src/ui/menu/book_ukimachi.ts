// みました帳③の すみの 1ページ『浮いて、待つ』（03_ch3_index、events/ch3/ukimachi.ts）：海水浴場の 砂の 上の 背浮きの
// 練習の あと（flag_uk_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 砂の 上に 5人と グソっ君が あおむけで ならぶ 鉛筆の 絵（グソっ君だけ 足が 上＝向きが 逆）、すみに たたんだ 遊泳旗、
// 背浮きの 3つの 数、カイトの 字「すう・あご・ぬく」ほか。ふしぎの 数（/10）には 入れない。
// （オオグソクムシの 泳ぎ方は 出典が 弱いので、生き物の 説明は 書かない：グソっ君の 絵だけ）
//
// QA：__game.cmd.ukBookText()、bookPeek('uk')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { UK_BOOK } from '../../data/text/c3_ukimachi';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasUkPage(): boolean {
  return flag('flag_uk_done') > 0;
}

export const UK_ROW_LABEL = UK_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;
const PIC_W = 128;
/** カイトの 字（監視員の ボールペン、少し 青い）。 */
const KAITO_C = '#3A5A8A';

/** 砂の 線の 上に、あおむけの 5人（頭は 左、手足を 開く）と、足を 上に した グソっ君。すみに たたんだ 旗。 */
function pic(g: Gfx, x: number, y: number): void {
  const pc = UI.pencil;
  const by = y + 22;
  for (let i = 0; i < 5; i++) {
    const px = x + 4 + i * 20;
    // head, body, arms and legs a little open (lying, seen from the side, face up)
    g.ring(px + 2, by - 3, 2, pc);
    g.line(px + 5, by - 2, px + 13, by - 2, pc);
    g.line(px + 7, by - 2, px + 8, by - 6, pc);
    g.line(px + 13, by - 2, px + 16, by - 4, pc);
    g.line(px + 13, by - 2, px + 16, by, pc);
  }
  // グソっ君: the plated back down, legs up (the other way round)
  const gx = x + 104;
  g.line(gx, by, gx + 12, by, pc);
  g.line(gx, by, gx + 1, by - 3, pc);
  g.line(gx + 12, by, gx + 11, by - 3, pc);
  g.line(gx + 1, by - 3, gx + 11, by - 3, pc);
  for (let i = 0; i < 5; i++) g.line(gx + 2 + i * 2, by - 3, gx + 2 + i * 2, by - 6, pc);
  // the sand
  g.line(x, by + 2, x + PIC_W - 4, by + 2, '#9AA0A8');
  // the folded flag in the corner (a pole and a small folded square)
  const fx = x + PIC_W - 8;
  g.line(fx, by - 20, fx, by - 4, pc);
  g.ring(fx - 4, by - 8, 2, '#C8402E');
}

export function drawUkPage(g: Gfx, x: number, y: number, w: number): void {
  UK_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * UK_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 120);
  let ly = y + th + 6;
  pic(g, x + 2, ly);
  ly += PIC_H;
  const n = ['flag_uk_suu', 'flag_uk_ago', 'flag_uk_nuku'].filter((id) => flag(id) > 0).length;
  pageText(g, UK_BOOK.count(n), x + 2, ly, { color: n >= 3 ? UI.accent : UI.text });
  ly += LINE_H + 4;
  UK_BOOK.kaito.forEach((l, i) => pageText(g, l, x + 6 + i * 6, ly + i * LINE_H, { color: KAITO_C }));
}

export function ukBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(UK_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of UK_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  if (2 + textW(UK_BOOK.count(3)) > room) bad.push('数: wide');
  UK_BOOK.kaito.forEach((l, i) => {
    if (6 + i * 6 + textW(l) > room) bad.push(`${l}: ${6 + i * 6 + textW(l)}px`);
  });
  if (2 + PIC_W > room) bad.push(`絵: wide ${2 + PIC_W} > ${room}`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H * UK_BOOK.titleLines.length + 6 + PIC_H + LINE_H + 4 + LINE_H * UK_BOOK.kaito.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('ukBookText', () => ukBookCheck());
addBookPeek('uk', drawUkPage);
