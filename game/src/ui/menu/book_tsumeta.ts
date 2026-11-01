// みました帳③の すみの 1ページ『穴は、だれかの ごちそうさま』（03_ch3_index、events/ch3/tsumeta.ts）：ツメタガイの 殻を
// 見て、貝がらを もどした あと（flag_tm_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の
// ページに 題、穴の あいた 二枚貝と 丸い ツメタガイの 殻の 鉛筆の 絵（すみに、手を 上げて「無実」の 顔の グソっ君）、
// 見た 貝がらと くらべた カードの 数、カイトの 字「まんまるの 穴 ＝ ツメタガイ」。ふしぎの 数（/10）には 入れない。
// （案の「てっぺんの 近くに」は 出典が ないので 書かない：会議 10-28）
//
// QA：__game.cmd.tmBookText()、bookPeek('tm')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { TM_BOOK } from '../../data/text/c3_tsumeta';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasTmPage(): boolean {
  return flag('flag_tm_done') > 0;
}

export const TM_ROW_LABEL = TM_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 32;
/** カイトの 字（監視員の ボールペン、少し 青い）。 */
const KAITO_C = '#3A5A8A';

function count(ids: string[]): number {
  return ids.filter((id) => flag(id) > 0).length;
}

/** 穴の あいた 二枚貝 2つ・ふちの 欠けた 貝・丸い 巻貝の 殻・手を 上げた グソっ君（鉛筆）。 */
function pic(g: Gfx, x: number, y: number): void {
  const pc = UI.pencil;
  const by = y + 24;
  // three bivalves: a rounded fan with the hinge on top; two with a small round hole, one with a notch at the rim
  const fan: [number, number][] = [[-2, -10], [-6, -7], [-8, -3], [-6, 0], [0, 1], [6, 0], [8, -3], [6, -7], [2, -10], [-2, -10]];
  for (let i = 0; i < 3; i++) {
    const cx = x + 9 + i * 19;
    for (let j = 0; j + 1 < fan.length; j++) {
      // (the chipped one: a gap in its rim, bottom right)
      if (i === 2 && j === 4) continue;
      g.line(cx + fan[j][0], by + fan[j][1], cx + fan[j + 1][0], by + fan[j + 1][1], pc);
    }
    if (i === 2) {
      g.line(cx, by + 1, cx + 2, by - 2, pc);
      g.line(cx + 2, by - 2, cx + 6, by, pc);
    }
    g.line(cx, by - 9, cx, by - 1, '#B0A898');
    g.line(cx - 4, by - 7, cx - 5, by - 1, '#B0A898');
    g.line(cx + 4, by - 7, cx + 5, by - 1, '#B0A898');
    if (i < 2) g.ring(cx, by - 5, 1, pc);
  }
  // the round moon-snail shell, its coil
  const sx = x + 67;
  g.ring(sx, by - 5, 7, pc);
  g.ring(sx + 2, by - 6, 3, pc);
  g.line(x, by + 2, x + 92, by + 2, '#9AA0A8');
  // グソっ君 in the corner, both claws up (無実)
  const kx = x + 86;
  g.ring(kx, by - 6, 5, pc);
  g.line(kx - 3, by - 1, kx - 4, by + 1, pc);
  g.line(kx + 3, by - 1, kx + 4, by + 1, pc);
  g.line(kx - 4, by - 9, kx - 6, by - 17, pc);
  g.line(kx + 4, by - 9, kx + 6, by - 17, pc);
  g.line(kx - 6, by - 17, kx - 8, by - 15, pc);
  g.line(kx + 6, by - 17, kx + 8, by - 15, pc);
}

export function drawTmPage(g: Gfx, x: number, y: number, w: number): void {
  TM_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * TM_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 120);
  let ly = y + th + 6;
  pic(g, x + 4, ly);
  ly += PIC_H;
  const kai = count(['flag_tm_kai_1', 'flag_tm_kai_2', 'flag_tm_kai_3']);
  const card = count(['flag_tm_card_hasami', 'flag_tm_card_kuchibashi', 'flag_tm_card_ishi']);
  pageText(g, TM_BOOK.kai(kai), x + 2, ly, { color: kai >= 3 ? UI.accent : UI.text });
  ly += LINE_H;
  pageText(g, TM_BOOK.card(card), x + 2, ly, { color: card >= 3 ? UI.accent : UI.text });
  ly += LINE_H + 4;
  TM_BOOK.kaito.forEach((l, i) => pageText(g, l, x + 6 + i * 12, ly + i * LINE_H, { color: KAITO_C }));
}

export function tmBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(TM_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of TM_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  for (const l of [TM_BOOK.kai(3), TM_BOOK.card(3)]) if (2 + textW(l) > room) bad.push(`${l}: wide`);
  TM_BOOK.kaito.forEach((l, i) => {
    if (6 + i * 12 + textW(l) > room) bad.push(`${l}: ${6 + i * 12 + textW(l)}px`);
  });
  if (4 + 92 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H * TM_BOOK.titleLines.length + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H * TM_BOOK.kaito.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('tmBookText', () => tmBookCheck());
addBookPeek('tm', drawTmPage);
