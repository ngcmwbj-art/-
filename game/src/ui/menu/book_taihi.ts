// みました帳②の すみの 1ページ『堆肥の 山の 住人』（堆肥の 中の 親戚、02_ch2_index #97、50 10.32・8.11）：
// 切り返しの あと（flag_taihi_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。
// 右の ページに しゅんの 字で 題、幼虫 6ぴきの 小さな 絵と『6ぴき』、『古い 山の 中』（鉛筆）、
// グソっ君の 字『しんせき』（線で 消して ある）と しゅんの 字『カブトムシの 子』、名人の 朱の 印
// （『ていねい』『湯気 名人』）、ペロ・トマじいの あとの まわる 線（わら→牛→堆肥→田んぼ・ハウス）。
// ふしぎの 数（/10）にも『むし』の 自由研究にも 入れない。
//
// QA：__game.cmd.taihiBookText()（wrapCheck も 呼ぶ）。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { ovalStamp } from '../../battle/art/stamps';
import { TAIHI_BOOK, TAIHI_N } from '../../data/text/hoshi_taihi';
import { larvaTiny } from '../../art/props/taihi_art';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';

export function hasTaihiPage(): boolean {
  return flag('flag_taihi_done') > 0;
}

export const TAIHI_ROW_LABEL = TAIHI_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;

/** The cycle's two lines: トマじい gives わら→牛→堆肥→田んぼ, ペロ adds ハウス. */
function cycleLines(): string[] {
  const [wara, ushi, taihi, ta, house] = TAIHI_BOOK.cycle;
  const tome = flag('flag_taihi_tome') > 0;
  const pero = flag('flag_taihi_pero') > 0;
  if (tome && pero) return [`${wara}→${ushi}→${taihi}`, `→${ta}・${house}`];
  if (tome) return [`${wara}→${ushi}→${taihi}`, `→${ta}`];
  if (pero) return [`${taihi}→${house}`];
  return [];
}

export function drawTaihiPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(TAIHI_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 97);
  let ly = y + TITLE_H + 7;
  // the six, little, in a row, and the count in pencil
  for (let i = 0; i < TAIHI_N; i++) g.img(larvaTiny(), x + i * 10, ly + 3);
  g.text(`${TAIHI_N}ぴき`, x + TAIHI_N * 10 + 4, ly, { color: UI.pencil });
  ly += LINE_H;
  pageText(g, TAIHI_BOOK.place, x, ly, { color: UI.pencil });
  ly += LINE_H + 2;
  // グソっ君's word (wobbly pencil, struck through) and しゅん's under it
  const kw = textW(TAIHI_BOOK.kane);
  g.text(TAIHI_BOOK.kane, x + 2, ly, { color: UI.pencil });
  pencilLine(g, x, ly + 8, kw + 4, 1, UI.text, 31);
  ly += LINE_H;
  pageText(g, TAIHI_BOOK.shun, x, ly, { color: UI.text });
  ly += LINE_H + 4;
  // the two marks (朱)
  let sx = x;
  if (flag('flag_taihi_teinei')) {
    const st = ovalStamp(TAIHI_BOOK.teinei, 58, 22, 0.06, 97);
    g.img(st, sx, ly);
    sx += st.width + 4;
  }
  if (flag('flag_taihi_yuge')) g.img(ovalStamp(TAIHI_BOOK.yuge, 64, 22, 0.07, 98), sx, ly);
  if (flag('flag_taihi_teinei') || flag('flag_taihi_yuge')) ly += 26;
  // the round of straw, cows, compost and fields (after ペロ / トマじい)
  for (const l of cycleLines()) {
    pageText(g, l, x, ly, { color: UI.pencil });
    ly += LINE_H;
  }
}

export function taihiBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(TAIHI_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const [wara, ushi, taihi, ta, house] = TAIHI_BOOK.cycle;
  for (const t of [TAIHI_BOOK.title, TAIHI_BOOK.place, TAIHI_BOOK.shun, `${wara}→${ushi}→${taihi}`, `→${ta}・${house}`])
    if (textW(t) > RP.w - 6) bad.push(`${t}: ${textW(t)}px > ${RP.w - 6}`);
  if (TAIHI_N * 10 + 4 + textW(`${TAIHI_N}ぴき`) > RP.w - 6) bad.push(`ぴき: too wide`);
  if (58 + 4 + 64 > RP.w - 6) bad.push('印: too wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 7 + LINE_H + LINE_H + 2 + LINE_H + LINE_H + 4 + 26 + LINE_H * 2;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('taihiBookText', () => taihiBookCheck());
