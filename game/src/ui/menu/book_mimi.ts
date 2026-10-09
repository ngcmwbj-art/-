// みました帳②の すみの 1ページ『耳の あいさつ』（ふくじんづけと 耳の あいさつ、02_ch2_index #95、
// 50 10.31・8.11）：〔片目だけ〕の あと（flag_mimi_start）、②の「ふしぎ」の 一覧の いちばん下に
// 番号なしの 1行（鉛筆の 字）。右の ページに しゅんの 字で 題と ○/5、5人の コツ（名前は 鉛筆、
// 聞いた コツは インク。聞く 前は 点線）。マサル〔mimi〕の あと、犬と グソっ君の 耳の 絵（上・横・下）、
// 1回も まちがえなければ 朱の『耳 名人』、5回目が そろえば ちょうちょ 2ひき。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.mimiBookText()（wrapCheck も 呼ぶ）。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { measure } from '../../engine/font';
import { ovalStamp } from '../../battle/art/stamps';
import { MIMI_BOOK, MIMI_WHO, type MimiWho } from '../../data/text/hoshi_mimi';
import { earMark } from '../../art/props/mimi_art';
import { dottedLine, pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { clearRight, clearSpacing, FOLD, LP, pageText, RP, SP, squeezable } from './notebook';

export function hasMimiPage(): boolean {
  return flag('flag_mimi_start') > 0;
}

export const MIMI_ROW_LABEL = MIMI_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const ROWS_DY = TITLE_H + 5;

const heard = (w: MimiWho) => flag(`flag_mimi_tip_${w}`) > 0;

/** The tips' column: after the longest name (the names in a column of their own). */
function tipDx(): number {
  return Math.max(...MIMI_WHO.map((w) => textW(MIMI_BOOK.rows[w].who))) + 6;
}

export function drawMimiPage(g: Gfx, x: number, y: number, w: number): void {
  const n = MIMI_WHO.filter(heard).length;
  g.text(MIMI_BOOK.title, x, y, { color: UI.text });
  const count = `${n}/${MIMI_WHO.length}`;
  const cw = textW(count);
  g.text(count, Math.min(x + w - 6 - cw, clearRight(999, y, y + 16) + 1 - cw), y, { color: n >= MIMI_WHO.length ? UI.accent : UI.pencil });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 95);
  const y0 = y + ROWS_DY;
  MIMI_WHO.forEach((who, i) => {
    const ry = y0 + i * LINE_H;
    const r = MIMI_BOOK.rows[who];
    const dx = tipDx();
    if (heard(who)) {
      // the name in pencil, the tip in ink
      g.text(r.who, x, ry, { color: UI.pencil });
      pageText(g, r.tip, x + dx, ry, { color: UI.text });
    } else {
      g.text(r.who, x, ry, { color: UI.textDim });
      dottedLine(g, x + dx, ry + 12, x + dx + 40, UI.textDim, 3);
    }
  });
  // after マサル saw them: the two pairs of ears, up / out / back
  let ly = y0 + MIMI_WHO.length * LINE_H + 4;
  if (flag('flag_mimi_gen')) {
    MIMI_BOOK.ears.forEach((lab, i) => {
      const ex = x + i * 46;
      const kind = (['up', 'side', 'down'] as const)[i];
      g.img(earMark(kind), ex, ly + 1);
      g.img(earMark(kind, '#D49A5C'), ex + 13, ly + 1);
      g.text(lab, ex + 27, ly - 3, { color: UI.pencil });
    });
    ly += LINE_H;
  }
  if (flag('flag_mimi_meijin')) {
    const st = ovalStamp(MIMI_BOOK.meijin, 58, 22, 0.08, 95);
    const sx = Math.min(x, clearRight(999, ly, ly + st.height) + 1 - st.width);
    g.img(st, sx, ly + 2);
  }
  if (flag('flag_mimi_five')) {
    // two butterflies (the ears), pencil
    const bx = x + 70;
    const by = ly + 8;
    for (const dx of [0, 22]) {
      for (const s of [-1, 1]) {
        g.rect(bx + dx + s * 3 - 1, by - 3, 3, 3, UI.pencil);
        g.rect(bx + dx + s * 2 - 1, by + 1, 2, 2, UI.pencil);
      }
      g.rect(bx + dx, by - 3, 1, 6, UI.text);
    }
  }
}

export function mimiBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(MIMI_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const y = SP.y + 28;
  if (textW(MIMI_BOOK.title) + 8 + textW('5/5') > RP.w - 6) bad.push(`題: ${textW(MIMI_BOOK.title)}px + 5/5 > ${RP.w - 6}`);
  const y0 = y + ROWS_DY;
  MIMI_WHO.forEach((who, i) => {
    const ry = y0 + i * LINE_H;
    const room = Math.min(RP.w, clearRight(999, ry, ry + 16) + 1 - RP.x) - tipDx();
    const t = MIMI_BOOK.rows[who].tip;
    if (!squeezable(t, room)) bad.push(`${who}: ${t} ${measure(t, clearSpacing(t, RP.x + tipDx(), ry))}px > ${room}`);
  });
  const ly = y0 + MIMI_WHO.length * LINE_H + 4 + LINE_H + 26;
  if (ly > SP.y + SP.h - 2) bad.push(`本文: bottom ${ly} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('mimiBookText', () => mimiBookCheck());
