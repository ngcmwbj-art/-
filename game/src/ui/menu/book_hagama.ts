// みました帳②の すみの 1ページ『はじめ ちょろちょろ』（02_ch2_index #105、events/ch2/hagama.ts）：
// 炊いた あと（flag_hg_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。
// 右の ページに 題、歌の 5つの 段（かまどの 火の 大きさの 絵）、いちばん よかった 炊きあがりと おこげ。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.hgBookText()

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { HG_BOOK, KAMA_OF, OKOGE_OF } from '../../data/text/hoshi_hagama';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';

export function hasHgPage(): boolean {
  return flag('flag_hg_done') > 0;
}

export const HG_ROW_LABEL = HG_BOOK.title;

const TITLE_H = 17;
const ROW_H = 16;
const LINE_H = 16;
/** 段ごとの 火の 大きさ（ちょろちょろ・ぱっぱ・ふいたら 引く・わら・ふた 取るな）。 */
const FIRE = [1, 3, 1, 4, 0];

function flameIcon(g: Gfx, x: number, y: number, n: number): void {
  if (!n) {
    // the lid shut (a line)
    g.rect(x, y + 8, 12, 2, UI.pencil);
    return;
  }
  for (let k = 0; k < n; k++) {
    const h = 3 + k * 2;
    g.rect(x + k * 3, y + 11 - h, 2, h, k === n - 1 ? '#D9483A' : '#E8873A');
  }
}

export function drawHgPage(g: Gfx, x: number, y: number, w: number): void {
  // (the title is wider than the page: two lines)
  HG_BOOK.titleLines.forEach((l, i) => g.text(l, x + i * 12, y + i * TITLE_H, { color: UI.text }));
  const ty = y + TITLE_H * (HG_BOOK.titleLines.length - 1);
  pencilLine(g, x, ty + TITLE_H + 1, w - 6, 1, UI.pencil, 105);
  let ly = ty + TITLE_H + 4;
  HG_BOOK.dan.forEach((d, i) => {
    flameIcon(g, x + 2, ly + 1, FIRE[i]);
    pageText(g, d, x + 18, ly, { color: UI.text });
    ly += ROW_H;
  });
  ly += 4;
  const kama = KAMA_OF(flag('flag_hg_best_kama'));
  const okoge = OKOGE_OF(flag('flag_hg_best_okoge'));
  pageText(g, `${HG_BOOK.kamaLabel} ${kama ? HG_BOOK.kama[kama] : ''}`, x, ly, { color: UI.pencil });
  pageText(g, `${HG_BOOK.okogeLabel} ${okoge ? HG_BOOK.okoge[okoge] : ''}`, x, ly + LINE_H, { color: okoge === 'kitsune' ? '#B8742A' : UI.pencil });
}

export function hgBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(HG_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  HG_BOOK.titleLines.forEach((l, i) => {
    if (i * 12 + textW(l) > room) bad.push(`${l}: ${i * 12 + textW(l)}px > ${room}`);
  });
  for (const d of HG_BOOK.dan) if (18 + textW(d) > room) bad.push(`${d}: ${18 + textW(d)}px`);
  for (const v of Object.values(HG_BOOK.kama)) if (textW(`${HG_BOOK.kamaLabel} ${v}`) > room) bad.push(`${v}: ${textW(`${HG_BOOK.kamaLabel} ${v}`)}px`);
  for (const v of Object.values(HG_BOOK.okoge)) if (textW(`${HG_BOOK.okogeLabel} ${v}`) > room) bad.push(`${v}: ${textW(`${HG_BOOK.okogeLabel} ${v}`)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H * HG_BOOK.titleLines.length + 4 + ROW_H * 5 + 4 + LINE_H * 2;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('hgBookText', () => hgBookCheck());
