// みました帳②の すみの 1ページ『よるの 足あと』（夜の 足あと帳、02_ch2_index #87、50 10.28・8.11）：
// マサル〔ashiato〕の あと（flag_ashiato_start）、②の「ふしぎ」の 一覧の いちばん下（『70年の 色紙』の
// 下）に 番号なしの 1行（鉛筆の 字）が 足され、右の ページに しゅんの 字で 題と ○/6、足あとの 6行：
//   見つける 前   点線の 四角と、場所（うすい 鉛筆）
//   見つけた      足あとの えんぴつの 絵、ゆびや ひづめの 数（小さな 数字）、場所（鉛筆）と「？」
//   知らせた      絵と 数、犯人の 名前（インク）
// その下に、うり坊を 数えたら『うり坊 5』と 数えた 回数、1回で ぴったりなら 朱の『数え名人』、マサルに
// 知らせたら グソっ君の 足あと（点の 2列）と『グ 1』。ふしぎの 数（/10）には 入れない。
// （知らせた 人の ひとことは ページの 幅に 入らないので、犯人の 名前が インクに なる ことで 残す。）
//
// QA：__game.cmd.ashiatoBookText()（wrapCheck も 呼ぶ）。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { measure } from '../../engine/font';
import { ovalStamp } from '../../battle/art/stamps';
import { drawDigits } from '../digits';
import { ASHIATO_BOOK, ASHIATO_KINDS, type AshiatoKind } from '../../data/text/hoshi_ashiato';
import { ASHIATO_TOES, ashiatoSketch, guSketch } from '../../art/props/ashiato_art';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { clearRight, clearSpacing, FOLD, LP, pageText, RP, SP, squeezable } from './notebook';

/** マサル〔ashiato〕を 聞いた：② に すみの ページが ある。 */
export function hasAshiatoPage(): boolean {
  return flag('flag_ashiato_start') > 0;
}

/** The title as the index row shows it (pencil, no number; one line). */
export const ASHIATO_ROW_LABEL = ASHIATO_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const ROWS_DY = TITLE_H + 5;
/** The text after the sketch and its number. */
const TEXT_DX = 28;

const found = (k: AshiatoKind) => flag(`flag_ashiato_f_${k}`) > 0;
const told = (k: AshiatoKind) => flag(`flag_ashiato_t_${k}`) > 0;

/** One row's words and their colour. */
function rowText(k: AshiatoKind, all = false): { text: string; color: string; q: boolean } {
  const r = ASHIATO_BOOK.rows[k];
  if (all || told(k)) return { text: r.who, color: UI.text, q: false };
  if (found(k)) return { text: r.place, color: UI.pencil, q: true };
  return { text: r.place, color: UI.textDim, q: false };
}

/** The right page: the title and ○/6, a pencil rule, the six rows, the boars and グソっ君 under them. */
export function drawAshiatoPage(g: Gfx, x: number, y: number, w: number): void {
  const n = ASHIATO_KINDS.filter(found).length;
  g.text(ASHIATO_BOOK.title, x, y, { color: UI.text });
  const count = `${n}/${ASHIATO_KINDS.length}`;
  const cw = textW(count);
  g.text(count, Math.min(x + w - 6 - cw, clearRight(999, y, y + 16) + 1 - cw), y, { color: n >= ASHIATO_KINDS.length ? UI.accent : UI.pencil });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 29);
  const y0 = y + ROWS_DY;
  ASHIATO_KINDS.forEach((k, i) => {
    const ry = y0 + i * LINE_H;
    if (found(k)) {
      // the pencil sketch (2×, its toes up), and the number of toes or hooves
      const sk = ashiatoSketch(k, UI.pencil);
      g.img(sk, x + 1 + Math.round((14 - sk.width) / 2), ry + Math.round((LINE_H - sk.height) / 2));
      drawDigits(g, ASHIATO_TOES[k], x + 18, ry + 9, { color: UI.accent });
    } else {
      // not yet: a dotted square where the sketch goes
      for (let d = 0; d < 12; d += 3) {
        g.rect(x + 1 + d, ry + 2, 1, 1, UI.textDim);
        g.rect(x + 1 + d, ry + 13, 1, 1, UI.textDim);
        g.rect(x + 1, ry + 2 + d, 1, 1, UI.textDim);
        g.rect(x + 13, ry + 2 + d, 1, 1, UI.textDim);
      }
    }
    const t = rowText(k);
    const tx = x + TEXT_DX;
    const right = pageText(g, t.text, tx, ry, { color: t.color });
    if (t.q && tx + right + 2 + 16 <= Math.min(x + w, clearRight(999, ry, ry + 16) + 1)) g.text(ASHIATO_BOOK.unknown, tx + right + 2, ry, { color: UI.accent });
  });
  // under the six: the boars counted, and グソっ君
  let ly = y0 + ASHIATO_KINDS.length * LINE_H + 3;
  if (flag('flag_ashiato_uribo')) {
    const meijin = flag('flag_ashiato_meijin') > 0;
    const tries = Math.max(1, flag('flag_ashiato_tries'));
    const uw = pageText(g, meijin ? ASHIATO_BOOK.uribo : `${ASHIATO_BOOK.uribo}${ASHIATO_BOOK.tries(tries)}`, x, ly, { color: UI.text });
    if (meijin) {
      // 朱の『数え名人』：『うり坊 5』の となり（iPad の ボタンを よける）
      const st = ovalStamp(ASHIATO_BOOK.meijin, 58, 22, 0.08, 87);
      const sy = ly - 2;
      const sx = Math.min(x + uw + 6, clearRight(999, sy, sy + st.height) + 1 - st.width);
      g.img(st, sx, sy);
    }
    ly += LINE_H + 2;
  }
  if (flag('flag_ashiato_gu_told')) {
    const gs = guSketch(UI.pencil);
    g.img(gs, x + 4, ly + 1);
    pageText(g, ASHIATO_BOOK.gu, x + 14, ly, { color: UI.pencil });
  }
}

/**
 * QA: the index row and the page fit (the row: one line at the label width; the page: the title and the
 * count on one line, each row's words after the sketch, the lines under it above the page's bottom).
 * Run on an iPad held sideways it also checks each line beside a touch button can be set tight enough (pageText).
 */
export function ashiatoBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(ASHIATO_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const y = SP.y + 28;
  if (textW(ASHIATO_BOOK.title) + 8 + textW('6/6') > RP.w - 6) bad.push(`題: ${textW(ASHIATO_BOOK.title)}px + 6/6 > ${RP.w - 6}`);
  const y0 = y + ROWS_DY;
  ASHIATO_KINDS.forEach((k, i) => {
    const ry = y0 + i * LINE_H;
    const room = Math.min(RP.w - TEXT_DX, clearRight(999, ry, ry + 16) + 1 - (RP.x + TEXT_DX));
    for (const t of [ASHIATO_BOOK.rows[k].place, ASHIATO_BOOK.rows[k].who])
      if (!squeezable(t, room)) bad.push(`${k}: ${t} ${measure(t, clearSpacing(t, RP.x + TEXT_DX, ry))}px > ${room}`);
  });
  let ly = y0 + ASHIATO_KINDS.length * LINE_H + 3;
  const uw = textW(`${ASHIATO_BOOK.uribo}${ASHIATO_BOOK.tries(9)}`);
  if (uw > RP.w) bad.push(`うり坊: ${uw}px > ${RP.w}`);
  const st = ovalStamp(ASHIATO_BOOK.meijin, 58, 22, 0.08, 87);
  if (textW(ASHIATO_BOOK.uribo) + 6 + st.width > RP.w) bad.push(`数え名人: ${textW(ASHIATO_BOOK.uribo) + 6 + st.width}px > ${RP.w}`);
  ly += LINE_H + 2;
  if (ly + 16 > SP.y + SP.h - 2) bad.push(`本文: bottom ${ly + 16} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('ashiatoBookText', () => ashiatoBookCheck());
