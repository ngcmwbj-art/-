// みました帳③の すみの 1ページ『目が、暗さに なれるまで』（03_ch3_index、events/ch3/kurayami.ts）：深海の 展示室で
// 説明板 3枚を 待って 読み、出口で グソっ君の「見えへん ときは、…」を 聞いた あと（flag_me_done）。③の「ふしぎ」の
// 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題と、まっくらな 四角に 白い えんぴつで 3枚の 板の 字
// （うすい 字・中の 字・こい 字）、すみに 目を つむって しゅんの うしろを 歩く グソっ君と、手を つなぐ 線 1本。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.meBookText()、bookPeek('me')

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { ME_BOOK } from '../../data/text/c3_kurayami';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasMePage(): boolean {
  return flag('flag_me_done') > 0;
}

export const ME_ROW_LABEL = ME_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
/** まっくらな 四角（板の 字 3行 ＋ 歩く 2人）。 */
const DARK_H = 3 * 15 + 22;
const DARK = '#1E2430';

function count(): number {
  return [1, 2, 3].filter((i) => flag(`flag_me_ita_${i}`) > 0).length;
}

/** 目を つむった グソっ君が、しゅんの うしろを 歩く（白い えんぴつ）。手を つなぐ 線 1本。 */
function walkers(g: Gfx, x: number, y: number): void {
  const wc = '#DCE2EC';
  // しゅん（前、右向き）：頭と 体
  const sx = x + 30;
  g.ring(sx, y + 4, 3, wc);
  g.line(sx, y + 7, sx, y + 14, wc);
  g.line(sx, y + 14, sx - 2, y + 19, wc);
  g.line(sx, y + 14, sx + 2, y + 19, wc);
  // the stamp case's 朱 at his chest (one dot)
  g.px(sx + 1, y + 10, '#E07060');
  // グソっ君（うしろ）：丸い 背と 帯、つむった 目は 横線
  const kx = x + 10;
  g.ring(kx, y + 12, 5, wc);
  g.line(kx - 3, y + 10, kx - 3, y + 15, '#8A92A0');
  g.line(kx, y + 8, kx, y + 16, '#8A92A0');
  g.line(kx + 3, y + 9, kx + 5, y + 9, wc);
  // the one line of the held hands
  g.line(kx + 5, y + 12, sx - 1, y + 11, wc);
}

export function drawMePage(g: Gfx, x: number, y: number, w: number): void {
  ME_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * ME_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 131);
  let ly = y + th + 6;
  const dw = w - 8;
  g.rect(x + 2, ly, dw, DARK_H, DARK);
  // the three boards' words in white pencil: faint, middle, dark
  const ink = [0.35, 0.65, 1];
  ME_BOOK.ita.forEach((l, i) => g.alpha(ink[i], () => g.text(l, x + 8, ly + 2 + i * 15, { color: '#E8ECF2' })));
  walkers(g, x + dw - 44, ly + DARK_H - 22);
  ly += DARK_H + 4;
  const n = count();
  pageText(g, ME_BOOK.yometa(n), x + 2, ly, { color: n >= 3 ? UI.accent : UI.text });
}

export function meBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(ME_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of ME_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  for (const l of ME_BOOK.ita) if (8 + textW(l) > room - 8) bad.push(`${l}: ${8 + textW(l)}px`);
  if (2 + textW(ME_BOOK.yometa(3)) > room) bad.push(`${ME_BOOK.yometa(3)}: wide`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H * ME_BOOK.titleLines.length + 6 + DARK_H + 4 + LINE_H;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('meBookText', () => meBookCheck());
addBookPeek('me', drawMePage);
