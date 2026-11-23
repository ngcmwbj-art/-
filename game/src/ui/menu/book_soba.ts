// みました帳②の すみの 1ページ『ちがう 花が、となりに』（02_ch2_index、events/ch2/soba.ts）：まつ先生の 話の あと
// （flag_sb_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、灯りの 輪の
// 中の 白い そばの 花と 赤い 茎、「長」「短」の 札が 3組の 鉛筆の 絵。すみに 花を 星と 見まちがえて 見上げる
// グソっ君。まつ先生の 字で「夏は 花、冬は そば」。のぞいた 花 ○/6・立てた 札 ○/3。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.sbBookText()、bookPeek('sb')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { SB_BOOK } from '../../data/text/hoshi_soba';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasSbPage(): boolean {
  return flag('flag_sb_done') > 0;
}

export const SB_ROW_LABEL = SB_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;

const nbits = (v: number, n: number) => {
  let c = 0;
  for (let k = 0; k < n; k++) if (v & (1 << k)) c++;
  return c;
};

export function drawSbPage(g: Gfx, x: number, y: number, w: number): void {
  SB_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * SB_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 137);
  const ly = y + th + 6;
  const pc = UI.pencil;
  // the lantern's ring (a pencil circle), six flowers in it on red stems, the tags under them in pairs
  const cx = x + 44;
  const gy = ly + PIC_H - 4;
  g.ring(cx, ly + 16, 17, '#C8BC90');
  for (let i = 0; i < 6; i++) {
    const fx = cx - 25 + i * 10;
    g.line(fx, ly + 10, fx, gy, '#C86A7A');
    g.ring(fx, ly + 8, 2, pc);
    g.px(fx, ly + 8, '#FFFFFF');
  }
  for (let k = 0; k < 3; k++) {
    const tx = cx - 25 + k * 20;
    g.rect(tx - 1, gy - 2, 14, 5, '#FBF3DC');
    g.frame(tx - 1, gy - 2, 14, 5, pc);
  }
  // グソっ君 in the corner, looking up (a round head, a line up to a little star)
  const gx = x + 94;
  g.ring(gx, ly + 24, 5, pc);
  g.line(gx + 2, ly + 19, gx + 10, ly + 6, pc);
  g.px(gx + 11, ly + 5, pc);
  g.px(gx + 12, ly + 4, pc);
  g.px(gx + 10, ly + 4, pc);
  let ty = ly + PIC_H;
  const counts = [`${nbits(flag('flag_sb_mi'), 6)}/6`, `${nbits(flag('flag_sb_fuda'), 3)}/3`];
  SB_BOOK.rows.forEach((r, i) => {
    pageText(g, r, x + 2, ty, { color: UI.text });
    pageText(g, counts[i], x + w - 6 - textW(counts[i]), ty, { color: UI.text });
    ty += LINE_H;
  });
  // まつ先生の 字
  SB_BOOK.quote.forEach((l, i) => pageText(g, l, x + 4 + i * 12, ty + 1 + i * LINE_H, { color: '#5A6A8A' }));
}

export function sbBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(SB_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of SB_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  for (const r of SB_BOOK.rows) if (2 + textW(r) + 8 + textW('6/6') > room) bad.push(`${r}: wide`);
  SB_BOOK.quote.forEach((l, i) => {
    if (4 + i * 12 + textW(l) > room) bad.push(`${l}: wide`);
  });
  const y = SP.y + 28;
  const bottom = y + TITLE_H * SB_BOOK.titleLines.length + 6 + PIC_H + LINE_H * (SB_BOOK.rows.length + SB_BOOK.quote.length) + 1;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('sbBookText', () => sbBookCheck());
addBookPeek('sb', drawSbPage);
