// みました帳②の すみの 1ページ『70年の 色紙』（70年の 色紙と 小さな 夏祭り、02_ch2_index #84、
// 50 10.26・8.11）：ぴょん夫人から 色紙を あずかると（flag_shikishi_start）、②の「ふしぎ」の 一覧の
// いちばん下（『二百十日の 前の 晩』の 下）に 番号なしの 1行（鉛筆の 字）が 足され、右の
// ページに しゅんの 字で 題と ○/7、ひとことを くれた 人の 名前（もらった 順に 2列。まだの
// ところは 点線）、さいごの ひとこと（朱）、聞いた 寝言（鉛筆）。7つ そろうと ○/7 が 朱に なる。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.shikishiBookText()（wrapCheck も 呼ぶ）。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { measure } from '../../engine/font';
import { SHIKISHI_BOOK, SHIKISHI_WHO } from '../../data/text/hoshi_shikishi';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { clearRight, clearSpacing, FOLD, LP, pageText, RP, SP, squeezable } from './notebook';

/** ぴょん夫人から 色紙を あずかった：② に すみの ページが ある。 */
export function hasShikishiPage(): boolean {
  return flag('flag_shikishi_start') > 0;
}

/** The title as the index row shows it (pencil, no number; broken after 「70年の」). */
export const SHIKISHI_ROW_LABEL = SHIKISHI_BOOK.title.replace('の ', 'の\n');

const TITLE_H = 17;
const LINE_H = 16;
const ROWS_DY = TITLE_H + 5;
/** The two columns of names. */
const COL_W = 72;

/** The writers' names in the order they wrote. */
function names(): string[] {
  return SHIKISHI_WHO.filter((w) => flag(`flag_shikishi_${w.who}`) > 0)
    .sort((a, b) => flag(`flag_shikishi_${a.who}`) - flag(`flag_shikishi_${b.who}`))
    .map((w) => w.name);
}

/** The notes under the names: the last word (朱), the sleep-talks heard (pencil). */
function notes(all = false): { text: string; color: string }[] {
  const out: { text: string; color: string }[] = [];
  const last = flag('flag_shikishi_last');
  if (last || all) out.push({ text: last === 1 ? SHIKISHI_BOOK.last.shun : SHIKISHI_BOOK.last.gk, color: UI.accent });
  if (flag('flag_shikishi_haha') || all) out.push({ text: SHIKISHI_BOOK.negoto.haha, color: UI.pencil });
  if (flag('flag_matsuri_take') || all) out.push({ text: SHIKISHI_BOOK.negoto.take, color: UI.pencil });
  return out;
}

/** The right page: the title (ink) and ○/7, a pencil rule, the seven's names (2 columns), the notes. */
export function drawShikishiPage(g: Gfx, x: number, y: number, w: number): void {
  const got = names();
  g.text(SHIKISHI_BOOK.title, x, y, { color: UI.text });
  const count = `${got.length}/${SHIKISHI_WHO.length}`;
  const cw = textW(count);
  g.text(count, Math.min(x + w - 6 - cw, clearRight(999, y, y + 16) + 1 - cw), y, { color: got.length >= SHIKISHI_WHO.length ? UI.accent : UI.pencil });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 23);
  const y0 = y + ROWS_DY;
  for (let i = 0; i < SHIKISHI_WHO.length; i++) {
    const nx = x + (i % 2) * COL_W;
    const ny = y0 + Math.floor(i / 2) * LINE_H;
    const name = got[i];
    if (name) {
      // (beside an iPad's touch button: a little tighter, pageText)
      pageText(g, name, nx, ny, { color: UI.text });
      continue;
    }
    // not yet: a dotted line where the name will go
    for (let k = 0; k < 40; k += 3) g.rect(nx + k, ny + 12, 1, 1, UI.textDim);
  }
  let ly = y0 + Math.ceil(SHIKISHI_WHO.length / 2) * LINE_H + 4;
  for (const n of notes()) {
    pageText(g, n.text, x, ly, { color: n.color });
    ly += LINE_H;
  }
}

/**
 * QA: the index row and the page fit (the row: 2 lines at the label width; the page: the title and
 * the count on one line, every name in its column, every note, all of them under the page's bottom).
 * Run on an iPad held sideways it also checks each line beside a touch button can be set tight enough (pageText).
 */
export function shikishiBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(SHIKISHI_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const y = SP.y + 28;
  if (textW(SHIKISHI_BOOK.title) + 8 + textW('7/7') > RP.w - 6) bad.push(`題: ${textW(SHIKISHI_BOOK.title)}px + 7/7 > ${RP.w - 6}`);
  const y0 = y + ROWS_DY;
  SHIKISHI_WHO.forEach((wh, i) => {
    const nx = RP.x + (i % 2) * COL_W;
    const ny = y0 + Math.floor(i / 2) * LINE_H;
    const room = Math.min(i % 2 ? RP.w - COL_W : COL_W - 4, clearRight(999, ny, ny + 16) + 1 - nx);
    if (!squeezable(wh.name, room)) bad.push(`名前 ${wh.name}: ${measure(wh.name, clearSpacing(wh.name, nx, ny))}px > ${room}`);
  });
  let ly = y0 + Math.ceil(SHIKISHI_WHO.length / 2) * LINE_H + 4;
  for (const n of [...notes(true), { text: SHIKISHI_BOOK.last.shun, color: '' }]) {
    if (!squeezable(n.text, Math.min(RP.w, clearRight(999, ly, ly + 16) + 1 - RP.x))) bad.push(`${n.text} (beside a touch button, ${measure(n.text, clearSpacing(n.text, RP.x, ly))}px)`);
    if (n.color) ly += LINE_H;
  }
  if (ly > SP.y + SP.h - 6) bad.push(`本文: bottom ${ly} > ${SP.y + SP.h - 6}`);
  return { pages: 1, bad };
}

registerDebug('shikishiBookText', () => shikishiBookCheck());
