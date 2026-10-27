// みました帳③の すみの 1ページ『波に 見せる 城』（03_ch3_index、events/ch3/shiro.ts）：城を 波に 見せた あと
// （flag_sr_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、3段の 城と
// 寄せる 波の 鉛筆の 絵（てっぺんに 小枝の 旗、すみに 城の 前で はさみを 広げる グソっ君）、さわった 砂と かざりの 数、
// ウミの 字「みず ちょっとだけ」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.srBookText()、bookPeek('sr')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { SR_BOOK } from '../../data/text/c3_shiro';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasSrPage(): boolean {
  return flag('flag_sr_done') > 0;
}

export const SR_ROW_LABEL = SR_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const PIC_H = 32;
/** ウミの 字（子どもの 鉛筆、少し 青い）。 */
const UMI_C = '#4A6A9A';

function count(ids: string[]): number {
  return ids.filter((id) => flag(id) > 0).length;
}

/** 3段の 城・寄せる 波・小枝の 旗・はさみを 広げる グソっ君（鉛筆）。 */
function pic(g: Gfx, x: number, y: number): void {
  const pc = UI.pencil;
  const by = y + 26;
  const cx = x + 26;
  // the three tiers, smaller going up
  g.frame(cx - 12, by - 8, 24, 8, pc);
  g.frame(cx - 8, by - 14, 16, 6, pc);
  g.frame(cx - 5, by - 19, 10, 5, pc);
  // the twig flag on top
  g.line(cx, by - 19, cx, by - 27, pc);
  g.line(cx, by - 27, cx + 4, by - 25, pc);
  // the waves coming in from the right, two curls
  for (let i = 0; i < 2; i++) {
    const wx = x + 60 + i * 14;
    g.line(wx, by, wx + 8, by - 4, '#7A9AB8');
    g.line(wx + 8, by - 4, wx + 12, by - 1, '#7A9AB8');
  }
  g.line(x, by + 2, x + 92, by + 2, '#9AA0A8');
  // グソっ君 in front of the castle, both claws spread wide
  const kx = x + 48;
  g.ring(kx, by - 6, 5, pc);
  g.line(kx - 3, by - 1, kx - 4, by + 1, pc);
  g.line(kx + 3, by - 1, kx + 4, by + 1, pc);
  g.line(kx - 4, by - 8, kx - 9, by - 14, pc);
  g.line(kx + 4, by - 8, kx + 9, by - 14, pc);
  g.line(kx - 9, by - 14, kx - 11, by - 12, pc);
  g.line(kx + 9, by - 14, kx + 11, by - 12, pc);
}

export function drawSrPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(SR_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 120);
  let ly = y + TITLE_H + 6;
  pic(g, x + 4, ly);
  ly += PIC_H;
  const suna = count(['flag_sr_saw_kawaki', 'flag_sr_saw_doro', 'flag_sr_saw_shittori']);
  const kazari = count(['flag_sr_got_kaigara', 'flag_sr_got_koishi', 'flag_sr_got_eda']);
  pageText(g, SR_BOOK.suna(suna), x + 2, ly, { color: suna >= 3 ? UI.accent : UI.text });
  ly += LINE_H;
  pageText(g, SR_BOOK.kazari(kazari), x + 2, ly, { color: kazari >= 3 ? UI.accent : UI.text });
  ly += LINE_H + 4;
  pageText(g, SR_BOOK.umi, x + 6, ly, { color: UMI_C });
}

export function srBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(SR_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(SR_BOOK.title) > room) bad.push(`${SR_BOOK.title}: ${textW(SR_BOOK.title)}px`);
  for (const l of [SR_BOOK.suna(3), SR_BOOK.kazari(3)]) if (2 + textW(l) > room) bad.push(`${l}: wide`);
  if (6 + textW(SR_BOOK.umi) > room) bad.push(`${SR_BOOK.umi}: ${6 + textW(SR_BOOK.umi)}px`);
  if (4 + 92 > room) bad.push('絵: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + PIC_H + LINE_H * 2 + 4 + LINE_H;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('srBookText', () => srBookCheck());
addBookPeek('sr', drawSrPage);
