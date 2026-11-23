// みました帳②の すみの 1ページ『ええ 色の わけ』（02_ch2_index #103、events/ch2/iro.ts）：
// 名場面の あと（flag_ir_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。
// 右の ページに 題、漬物の 小皿 3つの 色（紫・桃色・赤）と 色の もと 3つ（さびた 釘・お酢・赤じそ）、
// 漬物の 色 3/3。色あわせを 1回も まちがえずに そろえたら、すみに『ええ 目』（ぴょん夫人の 字）。
// 段階2 に すませたら、もう 1ページ『ゆきの 釘』（ぴょん夫人が 足す。flag_ir_yuki_page）。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.irBookText()

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { IR_BOOK } from '../../data/text/hoshi_iro';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';

export function hasIrPage(): boolean {
  return flag('flag_ir_done') > 0;
}
export function hasIrYukiPage(): boolean {
  return flag('flag_ir_done') > 0 && flag('flag_ir_yuki_page') > 0;
}

export const IR_ROW_LABEL = IR_BOOK.title;
export const IR_YUKI_ROW_LABEL = IR_BOOK.yukiTitle;

const TITLE_H = 17;
/** 1つの 皿：名前の 行と 色の もとの 行。 */
const ROW_H = 31;
const LINE_H = 15;
/** 皿の 色（ナス・みょうが・梅干し）。 */
const DISH = ['#4A1E5A', '#F07A98', '#C8242E'];
const SHU = '#D9483A';
/** ぴょん夫人の 字（すこし 丸い 赤むらさき）。 */
const YOSHIE_INK = '#A0446A';

/** 小皿（鉛筆の 楕円）と、その 上の 漬物の 色。 */
function dish(g: Gfx, x: number, y: number, c: string): void {
  for (let dx = -7; dx <= 7; dx++) {
    const h = Math.round(3 * Math.sqrt(1 - (dx / 8) ** 2));
    g.px(x + dx, y - h, UI.pencil);
    g.px(x + dx, y + h, UI.pencil);
  }
  g.rect(x - 4, y - 2, 9, 4, c);
  g.rect(x - 3, y - 3, 7, 1, c);
}

export function drawIrPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(IR_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 101);
  let ly = y + TITLE_H + 8;
  for (let i = 0; i < 3; i++) {
    const [name, , moto] = IR_BOOK.rows[i];
    dish(g, x + 9, ly + 9, DISH[i]);
    pageText(g, name, x + 20, ly, { color: UI.text });
    // the colour's source under it, a little in
    pageText(g, `← ${moto}`, x + 26, ly + LINE_H, { color: UI.pencil });
    ly += ROW_H;
  }
  // 漬物の 色 3/3
  pageText(g, `${IR_BOOK.count} 3/3`, x, ly + 4, { color: UI.pencil });
  g.ring(x + w - 16, ly + 12, 5, SHU);
  g.ring(x + w - 16, ly + 12, 4, SHU);
  if (flag('flag_ir_eeme')) pageText(g, IR_BOOK.eeme, x + w - 6 - textW(IR_BOOK.eeme), ly + 4 + LINE_H, { color: YOSHIE_INK });
}

/** 段階2 の かくし：ぴょん夫人が 足した 1ページ（字は ぴょん夫人）。 */
export function drawIrYukiPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(IR_BOOK.yukiTitle, x, y, { color: YOSHIE_INK });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, YOSHIE_INK, 102);
  let ly = y + TITLE_H + 8;
  // three old nails, side by side
  for (let k = 0; k < 3; k++) {
    const nx = x + 6 + k * 14;
    g.rect(nx, ly, 5, 2, '#5A3424');
    g.rect(nx + 2, ly + 2, 1, 12, '#8A4A2A');
    g.px(nx + 2, ly + 14, '#8A4A2A');
    g.px(nx + 2, ly + 6, '#C86A3A');
  }
  ly += 20;
  for (const l of IR_BOOK.yuki) {
    pageText(g, l, x, ly, { color: YOSHIE_INK });
    ly += LINE_H;
  }
}

export function irBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  for (const label of [IR_ROW_LABEL, IR_YUKI_ROW_LABEL]) {
    const row = phraseWrapInfo(label, labelW);
    if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  }
  const room = RP.w - 6;
  for (const t of [IR_BOOK.title, IR_BOOK.eeme]) if (textW(t) > room) bad.push(`${t}: ${textW(t)}px`);
  for (const [name, , moto] of IR_BOOK.rows) {
    if (20 + textW(name) > room) bad.push(`${name}: ${textW(name)}px`);
    if (26 + textW(`← ${moto}`) > room) bad.push(`${moto}: ${textW(`← ${moto}`)}px`);
  }
  if (textW(`${IR_BOOK.count} 3/3`) > room - 24) bad.push(`count: ${textW(`${IR_BOOK.count} 3/3`)}px`);
  for (const l of [IR_BOOK.yukiTitle, ...IR_BOOK.yuki]) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 8 + ROW_H * 3 + 4 + LINE_H * 2;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  const bottom2 = y + TITLE_H + 8 + 20 + LINE_H * IR_BOOK.yuki.length;
  if (bottom2 > SP.y + SP.h - 2) bad.push(`ゆき: bottom ${bottom2} > ${SP.y + SP.h - 2}`);
  return { pages: 2, bad };
}

if (import.meta.env.DEV) registerDebug('irBookText', () => irBookCheck());
