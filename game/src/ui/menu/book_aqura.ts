// みました帳③の すみの 1ページ『水槽の うら』（03_ch3_index、events/ch3/aq_ura.ts）：うらの 物 6つを 見た あと
// （flag_aqura_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 5つの 道具と 搬入口の えんぴつの 絵と 名前、ヒロスケの「水は、飛んで いく。塩は、残る。」（真水の 話を 聞いた とき）。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.auBookText()

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { AU_BOOK } from '../../data/text/c3_aq_ura';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';

export function hasAuPage(): boolean {
  return flag('flag_aqura_done') > 0;
}

export const AU_ROW_LABEL = AU_BOOK.title;

const TITLE_H = 17;
const ROW_H = 15;
const LINE_H = 14;

/** 小さな えんぴつの 絵（0 塩の 輪・1 タンク・2 比重計・3 ろ過槽・4 アクリルふき・5 シャッター）。 */
function sketch(g: Gfx, k: number, x: number, y: number): void {
  const pc = UI.pencil;
  if (k === 0) {
    g.frame(x, y + 1, 10, 9, pc);
    for (let r = 0; r < 3; r++) g.rect(x + 1, y + 3 + r * 2, 8, 1, '#C8CCC8');
  } else if (k === 1) {
    g.frame(x + 1, y, 8, 11, pc);
    g.rect(x + 7, y + 8, 1, 2, '#4A8AC8');
  } else if (k === 2) {
    g.rect(x + 4, y, 2, 8, pc);
    g.circle(x + 5, y + 8, 2, pc);
  } else if (k === 3) {
    g.frame(x, y + 1, 11, 9, pc);
    g.rect(x + 1, y + 5, 9, 2, '#C8B488');
    g.rect(x + 1, y + 7, 9, 2, '#8A8478');
  } else if (k === 4) {
    g.rect(x + 5, y, 1, 8, pc);
    g.rect(x + 3, y + 8, 5, 3, '#E8C840');
  } else {
    g.frame(x, y + 1, 11, 9, pc);
    for (let r = 0; r < 4; r++) g.rect(x + 1, y + 2 + r * 2, 9, 1, pc);
  }
}

export function drawAuPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(AU_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 106);
  let ly = y + TITLE_H + 6;
  AU_BOOK.rows.forEach((name, i) => {
    sketch(g, i, x + 1, ly + 1);
    pageText(g, name, x + 16, ly, { color: UI.text });
    ly += ROW_H;
  });
  ly += 3;
  if (flag('flag_aqura_hiro')) for (const l of AU_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function auBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(AU_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(AU_BOOK.title) > room) bad.push(`${AU_BOOK.title}: ${textW(AU_BOOK.title)}px`);
  for (const n of AU_BOOK.rows) if (16 + textW(n) > room) bad.push(`${n}: ${16 + textW(n)}px`);
  for (const l of AU_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + ROW_H * 6 + 3 + LINE_H * AU_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('auBookText', () => auBookCheck());
