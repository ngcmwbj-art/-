// みました帳②の すみの 1ページ『鉄棒』（分校の 鉄棒と『懸垂、1回』、02_ch2_index #100、50 10.33・8.11）：
// 1回の あと（flag_tetsu_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。
// 右の ページに しゅんの 字で 題、さびの 手の 形の 絵（大きな 手 2つ・小さな 手 2つ・グソっ君の 点々）、
// 『懸垂 0回 → 1回』、3段の 練習の 札（ぶら下がる・肩を 下げる・1回）に 朱の 丸、はたちまで ぶら下がったら
// 『はたち』の 印、グソっ君の さかさまを とおまで 見とどけたら 絵の 吹き出し（グソっ君の 字）。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.tetsuBookText()（wrapCheck も 呼ぶ）。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { ovalStamp } from '../../battle/art/stamps';
import { TETSU_BOOK, TETSU_UI } from '../../data/text/hoshi_tetsubou';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';

export function hasTetsuPage(): boolean {
  return flag('flag_tetsu_done') > 0;
}

export const TETSU_ROW_LABEL = TETSU_BOOK.title;

const TITLE_H = 17;
const LINE_H = 15;
const PIC_H = 26;

/** The bar in pencil, the rust worn off: two big hands, two small ones, グソっ君's row of dots. */
function drawBar(g: Gfx, x: number, y: number, w: number): void {
  const by = y + 12;
  g.rect(x + 2, by - 1, 2, PIC_H - 12, UI.pencil);
  g.rect(x + w - 8, by - 1, 2, PIC_H - 12, UI.pencil);
  g.rect(x + 2, by, w - 8, 2, UI.pencil);
  const rust = '#A8603A';
  for (const hx of [x + 12, x + 24]) g.rect(hx, by - 1, 8, 4, rust);
  for (const hx of [x + 38, x + 46]) g.rect(hx, by, 5, 3, rust);
  for (let i = 0; i < 7; i++) g.rect(x + 60 + i * 3, by + (i % 2), 1, 1, rust);
  if (flag('flag_tetsu_kane_too')) {
    // グソっ君's balloon over his dots
    const t = TETSU_BOOK.kane;
    const bw = textW(t) + 6;
    const bx = Math.max(x, x + w - 6 - bw);
    g.rect(bx, y - 8, bw, 15, '#FFFFFF', 0.5);
    g.frame(bx, y - 8, bw, 15, UI.pencil);
    g.rect(x + 63, y + 7, 1, 3, UI.pencil);
    pageText(g, t, bx + 3, y - 9, { color: UI.pencil });
  }
}

export function drawTetsuPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(TETSU_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 100);
  let ly = y + TITLE_H + 18;
  drawBar(g, x, ly, w);
  ly += PIC_H;
  pageText(g, TETSU_BOOK.kiroku, x, ly, { color: UI.text });
  ly += LINE_H + 3;
  // the three tags of the practice, each with a 朱 ring
  for (const name of TETSU_UI.fuda) {
    g.ring(x + 5, ly + 8, 4, '#D9483A');
    pageText(g, name, x + 14, ly, { color: UI.pencil });
    ly += LINE_H;
  }
  if (flag('flag_tetsu_hatachi')) g.img(ovalStamp(TETSU_BOOK.hatachi, 52, 22, 0.06, 100), x, ly + 3);
}

export function tetsuBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(TETSU_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  for (const t of [TETSU_BOOK.title, TETSU_BOOK.kiroku]) if (textW(t) > RP.w - 6) bad.push(`${t}: ${textW(t)}px > ${RP.w - 6}`);
  for (const t of TETSU_UI.fuda) if (14 + textW(t) > RP.w - 6) bad.push(`${t}: too wide`);
  if (textW(TETSU_BOOK.kane) + 6 > RP.w - 6) bad.push(`吹き出し: ${textW(TETSU_BOOK.kane)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 18 + PIC_H + LINE_H + 3 + LINE_H * 3 + 3 + 22;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('tetsuBookText', () => tetsuBookCheck());
