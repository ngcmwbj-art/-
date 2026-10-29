// みました帳②の すみの 1ページ『雲の 下にも、郵便受け』（02_ch2_index、events/ch2/touge.ts）：さんかどに 返した あと
// （flag_ks2_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、ガードレールの
// 向こうの 雲の 海と、雲から 出た お寺の 屋根・大杉・鉄塔、3通の 手紙が 道の 順に 並んだ 鉛筆の 絵。すみに、雲を
// 海と まちがえて 両手を 広げる グソっ君。さんかどの 字で「道順」。手紙の 行き先 ○/3・峠の 物 ○/5。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.ksBookText()、bookPeek('ks')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { KS_BOOK } from '../../data/text/hoshi_touge';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasKsPage(): boolean {
  return flag('flag_ks2_done') > 0;
}

export const KS_ROW_LABEL = KS_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;

const nbits = (v: number, n: number) => {
  let c = 0;
  for (let k = 0; k < n; k++) if (v & (1 << k)) c++;
  return c;
};

export function drawKsPage(g: Gfx, x: number, y: number, w: number): void {
  KS_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * KS_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 151);
  const ly = y + th + 6;
  const pc = UI.pencil;
  // the cloud's line (soft waves), the three landmarks out of it: the temple roof, the cedar, the pylon
  const cy = ly + 18;
  for (let k = 0; k < 80; k += 2) g.px(x + 4 + k, cy + Math.round(Math.sin(k / 5) * 1.5), pc);
  // お寺の 屋根
  g.line(x + 10, cy - 1, x + 14, cy - 6, pc);
  g.line(x + 14, cy - 6, x + 24, cy - 6, pc);
  g.line(x + 24, cy - 6, x + 28, cy - 1, pc);
  // 大杉
  g.line(x + 40, cy - 1, x + 44, cy - 12, pc);
  g.line(x + 44, cy - 12, x + 48, cy - 1, pc);
  // 鉄塔
  g.line(x + 62, cy - 1, x + 65, cy - 14, pc);
  g.line(x + 68, cy - 1, x + 65, cy - 14, pc);
  g.line(x + 60, cy - 10, x + 70, cy - 10, pc);
  g.line(x + 61, cy - 6, x + 69, cy - 6, pc);
  // the guardrail in front, and the three letters in a row with their numbers
  g.line(x + 2, ly + 24, x + 84, ly + 24, pc);
  for (let k = 0; k < 3; k++) {
    const ex = x + 10 + k * 24;
    g.rect(ex, ly + 27, 12, 7, '#FBF3DC');
    g.frame(ex, ly + 27, 12, 7, pc);
    g.line(ex, ly + 27, ex + 6, ly + 30, pc);
    g.line(ex + 11, ly + 27, ex + 6, ly + 30, pc);
  }
  // グソっ君 in the corner, both arms (claws) up at the "sea"
  const gx = x + 98;
  g.ring(gx, ly + 24, 5, pc);
  g.line(gx - 4, ly + 21, gx - 9, ly + 13, pc);
  g.line(gx + 4, ly + 21, gx + 9, ly + 13, pc);
  g.px(gx - 10, ly + 12, pc);
  g.px(gx + 10, ly + 12, pc);
  let ty = ly + PIC_H + 4;
  const counts = [`${nbits(flag('flag_ks2_ate'), 3)}/3`, `${nbits(flag('flag_ks2_mono'), 5)}/5`];
  KS_BOOK.rows.forEach((r, i) => {
    pageText(g, r, x + 2, ty, { color: UI.text });
    pageText(g, counts[i], x + w - 6 - textW(counts[i]), ty, { color: UI.text });
    ty += LINE_H;
  });
  // さんかどの 字
  KS_BOOK.quote.forEach((l, i) => pageText(g, l, x + 4 + i * 12, ty + 1 + i * LINE_H, { color: '#5A6A8A' }));
}

export function ksBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(KS_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of KS_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  for (const r of KS_BOOK.rows) if (2 + textW(r) + 8 + textW('5/5') > room) bad.push(`${r}: wide`);
  KS_BOOK.quote.forEach((l, i) => {
    if (4 + i * 12 + textW(l) > room) bad.push(`${l}: wide`);
  });
  const y = SP.y + 28;
  const bottom = y + TITLE_H * KS_BOOK.titleLines.length + 6 + PIC_H + 4 + LINE_H * (KS_BOOK.rows.length + KS_BOOK.quote.length) + 1;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('ksBookText', () => ksBookCheck());
addBookPeek('ks', drawKsPage);
