// みました帳①の すみの 1ページ『型ぬき 番付』（型ぬき 番付、01_ch1_index の 変更の 記録 2026-10-13）：
// いかりが ぬけて 番付を 書きかえると（flag_katanuki_rank）、①の「ふしぎ」の 一覧の いちばん下に 番号なしの
// 1行（鉛筆の 字）。右の ページは 決定で めくる（右下に 何枚目か）：
//   1枚目『型ぬき 番付』… 新しい 番付の 写し（段と 名前。グソっ君の 札は 朱、『名人』か『独学』）と、
//     題の 横に ぬけた いかりの 絵。
//   2枚目『型の 記録』… 型ごとの 絵・名前・ぬけた 回数・赤ペンの しるし、割った 数、コツの 数。
// ふしぎの 数（/12）には 入れない。
//
// QA：__game.cmd.katanukiBookText()（wrapCheck も 呼ぶ）、__game.cmd.katanuki('book')。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { measure } from '../../engine/font';
import { BANZUKE_CARD, BANZUKE_ROWS, KATA_NAME, KATA_ORDER, KATANUKI_BOOK, TIP_ORDER } from '../../data/text/katanuki';
import { drawPenMark, kataIcon } from '../katanuki_game';
import { drawDigits, digitsWidth } from '../digits';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { clearRight, clearSpacing, FOLD, LP, pageText, RP, SP, squeezable } from './notebook';

/** 番付を 書きかえた：① に すみの ページが ある。 */
export function hasKatanukiPage(): boolean {
  return flag('flag_katanuki_rank') > 0;
}

/** The title as the index row shows it (pencil, no number). */
export const KATANUKI_ROW_LABEL = KATANUKI_BOOK.title;

let leaf = 0;

/** 決定 on the page: the next leaf (round to the first). */
export function katanukiTurn(): void {
  leaf = (leaf + 1) % 2;
}

const TITLE_H = 17;
const ROW_H = 15;
const ROW_H2 = 22;
const NAME_X = 36;

/** The rows of the new ranking as the copy has them: [rank or '', name, グソっ君's]. */
function copyRows(): { rank: string; name: string; kn: boolean }[] {
  const r = flag('flag_katanuki_rank');
  const out: { rank: string; name: string; kn: boolean }[] = [];
  for (const b of BANZUKE_ROWS) {
    out.push({ rank: b.rank, name: b.name, kn: false });
    if ((b.rank === '横綱' && r === 1) || (b.rank === '大関' && r === 2)) out.push({ rank: '', name: BANZUKE_CARD.kn, kn: true });
  }
  return out;
}

/** The right page: the leaf shown, and which one it is in the corner. */
export function drawKatanukiPage(g: Gfx, x: number, y: number, w: number): void {
  if (leaf === 0) drawCopy(g, x, y, w);
  else drawKiroku(g, x, y, w);
  const s = `${leaf + 1}/2`;
  const by = SP.y + SP.h - 11;
  const right = clearRight(SP.x + SP.w - 10, by - 2, by + 8);
  const dw = digitsWidth(s);
  drawDigits(g, s, right - 9 - dw, by, { color: UI.pencil });
  for (let k = 0; k < 6; k++) g.rect(right - 6 + k, by + 6 - k, 6 - k, 1, UI.bg2);
  g.px(right - 6, by + 6, UI.pencil);
  for (let k = 0; k < 6; k++) g.px(right - 6 + k, by + 6 - k, UI.pencil);
}

/** 1枚目：番付の 写しと、いかりの 絵。 */
function drawCopy(g: Gfx, x: number, y: number, w: number): void {
  g.text(KATANUKI_BOOK.title, x, y, { color: UI.text });
  const ic = kataIcon('ikari', 24);
  const ix = Math.min(x + w - 30, clearRight(999, y - 6, y + 20) - 26);
  g.img(ic, ix, y - 6);
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 41);
  const y0 = y + TITLE_H + 5;
  copyRows().forEach((r, i) => {
    const ry = y0 + i * ROW_H;
    if (r.rank) g.text(r.rank, x, ry, { color: UI.accent });
    if (!r.kn) {
      pageText(g, r.name, x + NAME_X, ry, { color: UI.text });
      return;
    }
    const nw = pageText(g, r.name, x + NAME_X, ry, { color: UI.accent });
    const mark = flag('flag_katanuki_meijin') ? BANZUKE_CARD.meijin : flag('flag_katanuki_dokugaku') ? BANZUKE_CARD.dokugaku : '';
    if (mark) pageText(g, mark, x + NAME_X + nw + 4, ry, { color: flag('flag_katanuki_meijin') ? UI.accent : UI.pencil });
  });
}

/** 2枚目：型ごとの 記録、割った 数、コツ。 */
function drawKiroku(g: Gfx, x: number, y: number, w: number): void {
  g.text(KATANUKI_BOOK.kiroku, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 43);
  const y0 = y + TITLE_H + 5;
  KATA_ORDER.forEach((k, i) => {
    const ry = y0 + i * ROW_H2;
    const best = flag(`flag_katanuki_${k}`);
    g.img(kataIcon(k, 18), x, ry);
    pageText(g, KATA_NAME[k], x + 22, ry + 1, { color: best ? UI.text : UI.textDim });
    const n = flag(`flag_katanuki_n_${k}`);
    if (n > 0) drawDigits(g, String(Math.min(99, n)), x + 22 + 82, ry + 6, { color: UI.pencil });
    if (best) drawPenMark(g, best >= 3 ? 'hanamaru' : best === 2 ? 'maru' : 'chon', Math.min(x + w - 14, clearRight(999, ry, ry + 16) - 8), ry + 8);
  });
  const yb = y0 + 4 * ROW_H2 + 2;
  const wari = String(Math.min(999, flag('flag_katanuki_wari')));
  pageText(g, KATANUKI_BOOK.wari, x, yb, { color: UI.pencil });
  drawDigits(g, wari, x + textW(KATANUKI_BOOK.wari) + 6, yb + 5, { color: UI.pencil });
  const tips = TIP_ORDER.filter((t) => flag(`flag_katanuki_tip_${t}`) > 0).length;
  pageText(g, KATANUKI_BOOK.kotsu, x, yb + 16, { color: UI.pencil });
  drawDigits(g, `${tips}/5`, x + textW(KATANUKI_BOOK.kotsu) + 6, yb + 21, { color: tips >= 5 ? UI.accent : UI.pencil });
}

/** QA: the index row and each line of both leaves fit (page width, an iPad's buttons, the page's bottom). */
export function katanukiBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(KATANUKI_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const y = SP.y + 28;
  if (textW(KATANUKI_BOOK.title) + 30 > RP.w) bad.push(`題: ${textW(KATANUKI_BOOK.title)}px`);
  const fit = (s: string, x: number, ly: number, right = RP.x + RP.w) => {
    const room = Math.min(right, clearRight(999, ly, ly + 16) + 1) - x;
    if (!squeezable(s, room)) bad.push(`${s} (${measure(s, clearSpacing(s, x, ly))}px > ${room})`);
  };
  const y0 = y + TITLE_H + 5;
  // the longest: a row with グソっ君 and its mark, and every name
  BANZUKE_ROWS.forEach((b, i) => fit(b.name, RP.x + NAME_X, y0 + i * ROW_H));
  fit(`${BANZUKE_CARD.kn} ${BANZUKE_CARD.meijin}`, RP.x + NAME_X, y0 + 5 * ROW_H);
  if (y0 + 6 * ROW_H > SP.y + SP.h - 12) bad.push(`1枚目: bottom ${y0 + 6 * ROW_H}`);
  KATA_ORDER.forEach((k, i) => fit(KATA_NAME[k], RP.x + 22, y0 + i * ROW_H2 + 1, RP.x + 22 + 80));
  const yb = y0 + 4 * ROW_H2 + 2;
  if (yb + 32 > SP.y + SP.h - 12) bad.push(`2枚目: bottom ${yb + 32}`);
  return { pages: 2, bad };
}

if (import.meta.env.DEV) registerDebug('katanukiBookText', () => katanukiBookCheck());
