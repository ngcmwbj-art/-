// みました帳②の すみの 1ページ『上の 柵』（上の 柵ぞいの 見回り、02_ch2_index #99、50 10.34）：
// 見回りの あと（flag_saku_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。
// 右の ページに しゅんの 字で 題、柵の 鉛筆の 絵（2段の 線、支柱 8本、直した 所の 小さな ○）と
// 『直した 所 6』、柵を はさんで『マサル｜トマじい』、マサルの 朱の 印（良し・まあ 良し・もう 1回）、
// 森の 目を 出さなかった 人は イノシシの 足あとの 小さな 絵と『森へ 帰った』。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.sakuzoiBookText()（wrapCheck も 呼ぶ）。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { ovalStamp } from '../../battle/art/stamps';
import { SAKU_BOOK, SAKU_SPOTS } from '../../data/text/hoshi_sakuzoi';
import { SAKU_POST_X, SAKU_SPOT_AT, SAKU_W } from '../../data/maps/hoshi_sakuzoi';
import { ashiatoSketch } from '../../art/props/ashiato_art';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';

export function hasSakuPage(): boolean {
  return flag('flag_saku_done') > 0;
}

export const SAKU_ROW_LABEL = SAKU_BOOK.title;

const TITLE_H = 17;
const LINE_H = 16;
const FENCE_H = 22;
const STAMP_H = 24;

function rankKey(): 'yoshi' | 'maa' | 'mou' {
  const r = flag('flag_saku_rank');
  return r === 1 ? 'yoshi' : r === 2 ? 'maa' : 'mou';
}

export function drawSakuPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(SAKU_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 99);
  let ly = y + TITLE_H + 8;
  // the fence in pencil: west (8) on the left, the two wires, the posts, a ring where each fix was
  const fw = Math.min(w - 10, 150);
  const fx = (tile: number) => Math.round(x + 2 + (tile / (SAKU_W - 1)) * fw);
  const wireY = ly + 10;
  pencilLine(g, x + 2, wireY, fw, 1, UI.pencil, 31);
  pencilLine(g, x + 2, wireY + 4, fw, 1, UI.pencil, 37);
  for (const px of SAKU_POST_X) g.rect(fx(px), wireY - 3, 1, 10, UI.pencil);
  for (const k of SAKU_SPOTS) g.ring(fx(SAKU_SPOT_AT[k] + 0.5), wireY + 2, 3, '#E23B2E');
  ly += FENCE_H;
  pageText(g, SAKU_BOOK.fixed(SAKU_SPOTS.length), x, ly, { color: UI.pencil });
  ly += LINE_H + 2;
  pageText(g, SAKU_BOOK.two, x, ly, { color: UI.text });
  ly += LINE_H + 4;
  // マサル's mark (朱)
  const st = ovalStamp(SAKU_BOOK.rank[rankKey()], 84, 22, 0.06, 99);
  g.img(st, x, ly);
  ly += STAMP_H + 2;
  // no eyes at all: the boar's print going home, and a pencil line
  if (flag('flag_saku_me_seen') === 0) {
    g.img(ashiatoSketch('ino', UI.pencil), x + 2, ly + 2);
    pageText(g, SAKU_BOOK.ashi, x + 18, ly, { color: UI.pencil });
  }
}

export function sakuBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(SAKU_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  for (const t of [SAKU_BOOK.title, SAKU_BOOK.fixed(6), SAKU_BOOK.two]) if (textW(t) > RP.w - 6) bad.push(`${t}: ${textW(t)}px > ${RP.w - 6}`);
  if (18 + textW(SAKU_BOOK.ashi) > RP.w - 6) bad.push(`${SAKU_BOOK.ashi}: too wide`);
  for (const r of Object.values(SAKU_BOOK.rank)) if (textW(r) > 78) bad.push(`印 ${r}: ${textW(r)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 8 + FENCE_H + LINE_H + 2 + LINE_H + 4 + STAMP_H + 2 + LINE_H;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('sakuzoiBookText', () => sakuBookCheck());
