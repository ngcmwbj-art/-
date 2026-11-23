// みました帳②の すみの 1ページ『前から 寝る』（02_ch2_index、events/ch2/neru.ts）：南4の 牛が 寝た あと
// （flag_nr_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、
// 前の ひざを 折った 牛と 新しい おがくずの 鉛筆の 絵、ぬれた 所 ○/4、平らに しけたか、マサルの
// 「牛は、しゃべらん。……寝るか 寝んかで、言うんだ。」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.nrBookText()、bookPeek('nr')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { NR_BOOK } from '../../data/text/hoshi_neru';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasNrPage(): boolean {
  return flag('flag_nr_done') > 0;
}

export const NR_ROW_LABEL = NR_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 32;

/** 前の ひざを 折った 牛（鉛筆）：うしろは まだ 上、前が 下がって 頭が 低い。 */
function kneelCow(g: Gfx, x: number, y: number): void {
  const pc = UI.pencil;
  // the back sloping down to the front, the rump up on straight hind legs
  g.line(x + 6, y + 14, x + 40, y + 6, pc);
  g.line(x + 40, y + 6, x + 44, y + 10, pc);
  g.line(x + 42, y + 10, x + 42, y + 24, pc);
  g.line(x + 38, y + 12, x + 38, y + 24, pc);
  g.line(x + 8, y + 22, x + 36, y + 18, pc);
  // the front knees folded under
  g.line(x + 10, y + 22, x + 14, y + 24, pc);
  g.line(x + 14, y + 24, x + 20, y + 24, pc);
  // the head low, an ear with its tag
  g.line(x + 6, y + 14, x + 1, y + 20, pc);
  g.line(x + 1, y + 20, x + 4, y + 24, pc);
  g.px(x + 5, y + 15, '#D9A441');
}

export function drawNrPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(NR_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 114);
  let ly = y + TITLE_H + 6;
  // the new sawdust under it (white specks), the cow going down front first
  for (let k = 0; k < 22; k++) g.px(x + 4 + ((k * 7) % 60), ly + 26 + (k % 3), k % 2 ? '#C8B898' : UI.pencil);
  kneelCow(g, x + 10, ly);
  ly += PIC_H;
  let n = 0;
  for (let i = 0; i < 8; i++) if (flag('flag_nr_wet') & (1 << i)) n++;
  pageText(g, NR_BOOK.wet(n), x + 2, ly, { color: n >= 4 ? UI.accent : UI.text });
  ly += LINE_H;
  const t = NR_BOOK.taira[flag('flag_nr_taira')];
  if (t) pageText(g, t, x + 2, ly, { color: UI.text });
  ly += LINE_H + 2;
  for (const l of NR_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function nrBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(NR_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(NR_BOOK.title) > room) bad.push(`${NR_BOOK.title}: ${textW(NR_BOOK.title)}px`);
  if (2 + textW(NR_BOOK.wet(4)) > room) bad.push(`${NR_BOOK.wet(4)}: wide`);
  for (const v of Object.values(NR_BOOK.taira)) if (2 + textW(v) > room) bad.push(`${v}: wide`);
  for (const l of NR_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * 2 + 2 + LINE_H * NR_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('nrBookText', () => nrBookCheck());
addBookPeek('nr', drawNrPage);
