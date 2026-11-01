// みました帳②の すみの 1ページ『稲の 花』（02_ch2_index #107、events/ch2/hana.ts）：花畑の あと（flag_hn_done）、
// ②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、もみ 1つ ＝ 花 1つ ＝ 米 1粒の
// 鉛筆の 絵、数えた「これから 咲く 穂」、見た 見え方の 小さな 絵（3つとも 見ると 3つ目の 枠が 足される）、
// トマじいの「ごはん 一粒は、花 一つじゃ。」。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.hnBookText()

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { HN_BOOK } from '../../data/text/hoshi_hana';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasHnPage(): boolean {
  return flag('flag_hn_done') > 0;
}

export const HN_ROW_LABEL = HN_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
/** もみ・花・米 の 絵の 間。 */
const EQ_GAP = 44;
const GREEN = '#6A9A4A';
const RICE = '#C8B888';

/** もみ（0）・花（1）・米（2）の 小さな 鉛筆の 絵。 */
function eqSketch(g: Gfx, k: number, x: number, y: number): void {
  const pc = UI.pencil;
  if (k === 0) {
    g.frame(x + 2, y, 5, 9, pc);
    g.rect(x + 3, y + 1, 3, 7, GREEN);
    g.rect(x + 4, y + 1, 1, 7, pc);
  } else if (k === 1) {
    g.frame(x + 2, y + 2, 5, 7, pc);
    g.rect(x + 3, y + 3, 3, 5, GREEN);
    for (const dx of [2, 4, 6]) {
      g.px(x + dx, y + 9, '#E8E4D4');
      g.px(x + dx, y + 10, pc);
    }
    g.px(x + 4, y + 1, pc);
  } else {
    g.circle(x + 4, y + 5, 3, pc);
    g.circle(x + 4, y + 5, 2, '#F4F0E8');
  }
}

/** 見え方の 小さな 絵（0 咲いた あと・1 これから・2 出る 前）。 */
function lookSketch(g: Gfx, k: number, x: number, y: number): void {
  const pc = UI.pencil;
  g.line(x, y + 10, x + 4, y + 2, pc);
  g.line(x + 4, y + 2, x + 10, y + 4, pc);
  if (k === 2) {
    g.rect(x + 3, y + 1, 7, 6, GREEN);
    g.frame(x + 3, y + 1, 7, 6, pc);
    return;
  }
  for (const [dx, dy] of [[4, 3], [6, 3], [8, 4], [10, 5]] as const) {
    g.rect(x + dx, y + dy - 2, 2, 3, k === 1 ? GREEN : RICE);
    if (k === 0) g.px(x + dx, y + dy + 2, '#B8B4A4');
  }
}

export function drawHnPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(HN_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 107);
  let ly = y + TITLE_H + 6;
  // もみ ＝ 花 ＝ 米（a row of three sketches with their names under them）
  HN_BOOK.eq.forEach((name, i) => {
    const cx = x + 8 + i * EQ_GAP;
    eqSketch(g, i, cx, ly);
    pageText(g, name, cx - 4, ly + 13, { color: UI.text });
    if (i < 2) pageText(g, '＝', cx + 16, ly, { color: UI.pencil });
  });
  ly += 32;
  let kore = 0;
  for (let i = 0; i < 6; i++) if (flag(`flag_hn_seen_${i}`)) kore += [2, 1, 1, 1, 1, 1][i];
  const [l1, l2] = HN_BOOK.kore(kore);
  pageText(g, l1, x + 2, ly, { color: UI.text });
  pageText(g, l2, x + 2, ly + LINE_H, { color: UI.text });
  // the looks seen, as little framed sketches after the count (the third frame only once all three were seen)
  const all = (['ato', 'kore', 'mae'] as const).every((k) => flag(`flag_hn_look_${k}`));
  let fx = x + 4 + textW(l2) + 8;
  (['ato', 'kore', 'mae'] as const).forEach((k, i) => {
    if (!flag(`flag_hn_look_${k}`) || (i === 2 && !all)) return;
    g.frame(fx - 1, ly + LINE_H, 14, 14, UI.pencil);
    lookSketch(g, i, fx, ly + LINE_H + 1);
    fx += 17;
  });
  ly += LINE_H * 2 + 4;
  for (const l of HN_BOOK.quote) {
    pageText(g, l, x + 4, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
}

export function hnBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(HN_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(HN_BOOK.title) > room) bad.push(`${HN_BOOK.title}: ${textW(HN_BOOK.title)}px`);
  for (const l of HN_BOOK.kore(7)) if (2 + textW(l) > room) bad.push(`${l}: ${2 + textW(l)}px`);
  if (4 + textW(HN_BOOK.kore(7)[1]) + 8 + 17 * 3 > room) bad.push('見え方の 絵: wide');
  for (const l of HN_BOOK.quote) if (4 + textW(l) > room) bad.push(`${l}: ${4 + textW(l)}px`);
  if (8 + 2 * EQ_GAP + textW(HN_BOOK.eq[2]) > room) bad.push('もみ＝花＝米: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + 32 + LINE_H * 2 + 4 + LINE_H * HN_BOOK.quote.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('hnBookText', () => hnBookCheck());
addBookPeek('hn', drawHnPage);
