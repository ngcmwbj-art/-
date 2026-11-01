// みました帳③の すみの 1ページ『正午の 3まい』（03_ch3_index、events/ch3/mahiru.ts）：3枚を 主人に 見せた あと
// （flag_mh_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、3人の 写真を
// 貼った 形（ちょうど／惜しい で 写真の 顔の 光が 変わる。4枚目が あれば 4つ目の 枠）、下に グソっ君の
// えんぴつの 字「照明係 わい」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.mhBookText()

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { MH_BOOK } from '../../data/text/c3_mahiru';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';
import { mhPortrait as portrait, mhShot as shotOf } from '../mahiru_face';

export function hasMhPage(): boolean {
  return flag('flag_mh_done') > 0;
}

export const MH_ROW_LABEL = MH_BOOK.title;

const TITLE_H = 17;
const PH_W = 30;
const PH_H = 34;
/** 写真の 間（2枚 ずつ 2段）。 */
const COL = 70;
const ROW = 56;

/** 1枚の 写真（白い ふち、顔、下に 名前と ちょうど／惜しい）。 */
function photo(g: Gfx, x: number, y: number, name: string, ids: [string, string?][], level: number, br = false): void {
  g.rect(x + 1, y + 1, PH_W, PH_H, '#C8BC9C');
  g.rect(x, y, PH_W, PH_H, '#FBF8F0');
  g.rect(x + 2, y + 2, PH_W - 4, PH_H - 10, '#7AB8E8');
  g.rect(x + 2, y + 2 + 14, PH_W - 4, PH_H - 26, '#3A86C0');
  g.clip(x + 2, y + 2, PH_W - 4, PH_H - 10, () => {
    ids.forEach(([id, pose], i) => {
      const pic = portrait(id, level, br, pose);
      if (!pic) return;
      const cx = x + (ids.length > 1 ? 9 + i * 12 : PH_W / 2);
      g.img(pic, Math.round(cx - pic.width / 2), y + 3);
    });
  });
  // a corner of tape
  g.rect(x + PH_W - 8, y - 2, 8, 4, '#E8D8A8');
  pageText(g, name, x, y + PH_H + 1, { color: UI.text });
}

export function drawMhPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(MH_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 109);
  const ly = y + TITLE_H + 8;
  const who = [
    ['kaito', 'npc_c3_kanshiin'],
    ['teru', 'npc_c3_toudai'],
    ['umi', 'npc_c3_mago'],
  ] as const;
  // two by two: カイト・テル / ウミ・（4枚目）
  const at = (i: number): [number, number] => [x + (i % 2) * COL, ly + Math.floor(i / 2) * ROW];
  who.forEach(([k, id], i) => {
    const r = shotOf(k);
    if (!r) return;
    const lvl = r === 1 ? 1 : r === 2 ? 0 : 2;
    const [px, py] = at(i);
    photo(g, px, py, MH_BOOK.names[i], [[id]], lvl, k === 'umi' && flag('flag_mh_umi_br') > 0);
    pageText(g, MH_BOOK.marks[r === 1 ? 0 : 1], px + PH_W + 2, py + 1, { color: r === 1 ? UI.accent : UI.pencil });
  });
  if (shotOf('four')) {
    const [px, py] = at(3);
    photo(g, px, py, MH_BOOK.names[3], [['minato'], ['kanenari', 'happy']], 1);
  }
  pageText(g, MH_BOOK.pencil, x + 4, ly + ROW * 2, { color: UI.pencil });
}

export function mhBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(MH_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(MH_BOOK.title) > room) bad.push(`${MH_BOOK.title}: ${textW(MH_BOOK.title)}px`);
  for (const n of MH_BOOK.names) if (textW(n) > COL - 4) bad.push(`${n}: ${textW(n)}px`);
  for (const m of MH_BOOK.marks) if (COL + PH_W + 2 + textW(m) > room) bad.push(`mark ${m}: wide`);
  if (4 + textW(MH_BOOK.pencil) > room) bad.push(`${MH_BOOK.pencil}: wide`);
  if (PH_H + 1 + 16 > ROW) bad.push('写真と 名前が 次の 段に かかる');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 8 + ROW * 2 + 16;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('mhBookText', () => mhBookCheck());
addBookPeek('mh', drawMhPage);
