// みました帳②の すみの 1ページ『上へ 降る 雪』（02_ch2_index #101、events/ch2/mushigomu.ts）：
// 名場面の あと（flag_mg_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。
// 右の ページに 題、たらいの 泡の 絵（タイヤの 下の 口から、まっすぐ 上へ 上がる 泡）、古い 虫ゴム（ひびが 3つ）と
// 新しい 虫ゴム、自転車置き場の 2台（直した 台に 朱の 丸）。つけかえる 前に 1周 たしかめたら、すみに はなまる。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.mgBookText()

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { hanamaruFrame } from '../../battle/art/stamps';
import { MG_BOOK } from '../../data/text/hoshi_mushigomu';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';

export function hasMgPage(): boolean {
  return flag('flag_mg_done') > 0;
}

export const MG_ROW_LABEL = MG_BOOK.title;

const TITLE_H = 17;
const LINE_H = 15;
const PIC_H = 34;

/** The tub in pencil: the water line, the tyre's bottom, the bubbles going straight up from the valve. */
function drawTub(g: Gfx, x: number, y: number): void {
  const cx = x + 44;
  const wy = y + 22;
  // the tyre's lower arc
  for (let i = 0; i <= 20; i++) {
    const t = Math.PI * (0.15 + (0.7 * i) / 20);
    g.px(Math.round(cx + Math.cos(t) * 24), Math.round(y + 2 + Math.sin(t) * 24), UI.pencil);
  }
  // the water, the tub's edge
  g.rect(x + 6, wy, 76, 1, UI.pencil);
  g.rect(x + 6, wy + 11, 76, 1, UI.pencil);
  g.rect(x + 6, wy, 1, 12, UI.pencil);
  g.rect(x + 81, wy, 1, 12, UI.pencil);
  // the valve at the bottom, the bubbles up
  g.rect(cx, y + 22, 1, 5, '#A8742A');
  const blue = '#5A8AC8';
  for (const [dx, dy, r] of [[0, 16, 1], [1, 10, 2], [0, 4, 1], [1, -2, 2]] as const) g.ring(cx + dx, y + dy, r, blue);
}

export function drawMgPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(MG_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 100);
  let ly = y + TITLE_H + 10;
  drawTub(g, x, ly);
  ly += PIC_H;
  // the two rubbers: the old (three cracks), the new
  g.rect(x + 2, ly + 6, 20, 4, '#6A4A3A');
  for (const xx of [6, 11, 16]) g.rect(x + xx, ly + 7, 1, 2, '#E8D0B0');
  pageText(g, MG_BOOK.hibi, x + 28, ly, { color: UI.pencil });
  ly += LINE_H;
  g.rect(x + 2, ly + 6, 20, 4, '#202020');
  pageText(g, MG_BOOK.atarashii, x + 28, ly, { color: UI.pencil });
  ly += LINE_H + 2;
  // the bike rack: two names, a 朱 ring on each one put right
  pageText(g, MG_BOOK.kids, x, ly, { color: UI.text });
  ly += LINE_H;
  const kids: [string, string][] = [['もと', 'flag_mg_kid_moto'], ['アスカ', 'flag_mg_kid_asuka']];
  for (const [name, f] of kids) {
    pageText(g, `『${name}』`, x + 14, ly, { color: UI.pencil });
    if (flag(f)) {
      g.ring(x + 6, ly + 8, 4, '#D9483A');
      g.ring(x + 6, ly + 8, 3, '#D9483A');
    } else g.ring(x + 6, ly + 8, 3, UI.textDim);
    ly += LINE_H;
  }
  if (flag('flag_mg_isshuu')) g.img(hanamaruFrame(26, 1), x + w - 34, y + TITLE_H + 6);
}

export function mgBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(MG_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  for (const t of [MG_BOOK.title, MG_BOOK.kids]) if (textW(t) > RP.w - 6) bad.push(`${t}: ${textW(t)}px > ${RP.w - 6}`);
  for (const t of [MG_BOOK.hibi, MG_BOOK.atarashii]) if (28 + textW(t) > RP.w - 6) bad.push(`${t}: ${textW(t)}px`);
  if (14 + textW('『アスカ』') > RP.w - 6) bad.push('kids: too wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 10 + PIC_H + LINE_H * 2 + 2 + LINE_H * 3;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('mgBookText', () => mgBookCheck());
