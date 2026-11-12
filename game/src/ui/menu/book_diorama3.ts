// みました帳③の すみの 1ページ『荷台から 見た 村』（03_ch3_index、events/ch3/diorama3.ts）：ジオラマの 模型の まちがいを
// 3つ 直して、水槽の うらの ヒロスケに 話した あと（S19 の あとは グソっ君の「言いそびれたな」の あと。flag_dm_done）、
// ③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、3つの 模型の 台と、直した 牛
// （前の ひざを 折った 形）・紐の 耕うん機・消した 灯台の 鉛筆の 絵（すみに、牛の 横で 同じ 形に 寝て みせる グソっ君）、
// 直した まちがいと 見た 物の 数、ヒロスケの 太い 字「荷台から」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.dmBookText()、bookPeek('dm')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { DM_BOOK } from '../../data/text/c3_diorama3';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasDmPage(): boolean {
  return flag('flag_dm_done') > 0;
}

export const DM_ROW_LABEL = DM_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 34;
/** ヒロスケの 字（太い 黒の マジック）。 */
const HIRO_C = '#2A2A34';

function count(ids: string[]): number {
  return ids.filter((id) => flag(id) > 0).length;
}

/** 3つの 模型の 台と、直した 牛・紐の 耕うん機・消した 灯台、牛の 横で 寝る グソっ君（鉛筆）。 */
function pic(g: Gfx, x: number, y: number): void {
  const pc = UI.pencil;
  const by = y + 28;
  // the three stands (low boxes)
  for (let i = 0; i < 3; i++) {
    const sx = x + i * 31;
    g.line(sx, by, sx + 26, by, pc);
    g.line(sx, by, sx, by - 3, pc);
    g.line(sx + 26, by, sx + 26, by - 3, pc);
    g.line(sx, by - 3, sx + 26, by - 3, '#B0A898');
  }
  // 1 the cow, front knees folded (its front end lower), on the first stand
  const cx = x + 4;
  const cy = by - 8;
  g.line(cx, cy + 1, cx + 12, cy - 2, pc);
  g.line(cx, cy + 4, cx + 12, cy + 2, pc);
  g.line(cx, cy + 1, cx, cy + 4, pc);
  g.line(cx + 12, cy - 2, cx + 12, cy + 2, pc);
  g.ring(cx - 2, cy + 1, 2, pc);
  g.line(cx + 1, cy + 4, cx + 4, cy + 5, pc);
  g.line(cx + 10, cy + 2, cx + 10, by - 3, pc);
  g.line(cx + 12, cy + 2, cx + 12, by - 3, pc);
  // and グソっ君 beside it, lying the same way (bands on his shell)
  g.ring(cx + 18, cy + 2, 3, pc);
  g.line(cx + 16, cy + 1, cx + 16, cy + 4, '#B0A898');
  g.line(cx + 19, cy, cx + 19, cy + 4, '#B0A898');
  // 2 the tiller with its cord's T-grip
  const tx = x + 40;
  g.ring(tx, by - 7, 3, pc);
  g.line(tx - 4, by - 15, tx + 4, by - 15, pc);
  g.line(tx - 4, by - 11, tx + 4, by - 11, pc);
  g.line(tx - 4, by - 15, tx - 4, by - 11, pc);
  g.line(tx + 4, by - 15, tx + 4, by - 11, pc);
  g.line(tx + 4, by - 13, tx + 14, by - 20, pc);
  g.line(tx - 4, by - 13, tx - 9, by - 12, pc);
  g.line(tx - 10, by - 14, tx - 10, by - 10, pc);
  // 3 the lighthouse, its bulb out (an empty ring)
  const lx = x + 76;
  g.line(lx - 3, by - 3, lx - 2, by - 20, pc);
  g.line(lx + 3, by - 3, lx + 2, by - 20, pc);
  g.line(lx - 3, by - 21, lx + 3, by - 21, pc);
  g.ring(lx, by - 24, 2, pc);
  g.line(lx - 2, by - 27, lx, by - 29, pc);
  g.line(lx + 2, by - 27, lx, by - 29, pc);
}

export function drawDmPage(g: Gfx, x: number, y: number, w: number): void {
  DM_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * DM_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 121);
  let ly = y + th + 6;
  pic(g, x + 4, ly);
  ly += PIC_H;
  const fix = count(['flag_dm_ushi', 'flag_dm_himo', 'flag_dm_toudai']);
  const seen = count(['flag_dm_kanban', 'flag_dm_yunari']);
  pageText(g, DM_BOOK.naoshita(fix), x + 2, ly, { color: fix >= 3 ? UI.accent : UI.text });
  ly += LINE_H;
  pageText(g, DM_BOOK.mita(seen), x + 2, ly, { color: seen >= 2 ? UI.accent : UI.text });
  ly += LINE_H + 4;
  // ヒロスケの 太い 字（1px ずらして 2度：太い マジック）
  pageText(g, DM_BOOK.hiro, x + 8, ly, { color: HIRO_C });
  pageText(g, DM_BOOK.hiro, x + 9, ly, { color: HIRO_C });
}

export function dmBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(DM_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of DM_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  for (const l of [DM_BOOK.naoshita(3), DM_BOOK.mita(2)]) if (2 + textW(l) > room) bad.push(`${l}: ${2 + textW(l)}px`);
  if (9 + textW(DM_BOOK.hiro) > room) bad.push(`${DM_BOOK.hiro}: wide`);
  if (4 + 88 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H * DM_BOOK.titleLines.length + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('dmBookText', () => dmBookCheck());
addBookPeek('dm', drawDmPage);
