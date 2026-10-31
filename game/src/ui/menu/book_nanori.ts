// みました帳③の すみの 1ページ『名のり帳』（灯台の 名のり、05_postgame 2.3・03_ch3_index、events/ch3/nanori.ts）：
// 止めない 時計の あと（flag_nn_done）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。
// 右の ページに 題、5つの 光（色の 点・名前・はかった 数、はかれない 2つは「名のらない」）。3回とも 0.1秒 以内の
// 光には はなまる。テルの 灯台の 欄には、次の 夜から ミナトの 字で『4秒 0。ずれとらん』。夜光虫を 見たら、
// すみに 青い 点。ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.nnBookText()

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { hanamaruFrame } from '../../battle/art/stamps';
import { fillNames } from '../../data/text/c3_names';
import { fmtSec, LIGHTS, NN_BOOK, NN_UI, nnNightId as nightId } from '../../data/text/c3_nanori';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';

export function hasNnPage(): boolean {
  return flag('flag_nn_done') > 0;
}

export const NN_ROW_LABEL = NN_BOOK.title;

const TITLE_H = 17;
const ROW_H = 26;

/** The best of the three measures (nearest the light's own). */
function best(id: string, period: number): number {
  let b = flag(`flag_nn_v_${id}_0`);
  for (let i = 1; i < 3; i++) {
    const v = flag(`flag_nn_v_${id}_${i}`);
    if (Math.abs(v - period / 100) < Math.abs(b - period / 100)) b = v;
  }
  return b;
}

export function drawNnPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(NN_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 100);
  let ly = y + TITLE_H + 6;
  for (const L of LIGHTS) {
    g.circle(x + 4, ly + 8, 3, L.color);
    g.ring(x + 4, ly + 8, 3, UI.pencil);
    pageText(g, fillNames(NN_UI.names[L.id]), x + 12, ly, { color: UI.text });
    let note = '';
    if (L.period === null) note = flag(`flag_nn_no_${L.id}`) ? NN_UI.nanoranai : '';
    else if (flag(`flag_nn_m_${L.id}`) >= 3) note = fmtSec(best(L.id, L.period));
    if (L.id === 'teru' && flag('flag_nn_done') && nightId() > flag('flag_nn_night')) note = NN_BOOK.minato;
    const mine = L.id === 'teru' && note === NN_BOOK.minato;
    if (note) pageText(g, note, x + (mine ? 2 : 18), ly + 11, { color: mine ? '#3A4A8A' : UI.pencil });
    if (flag(`flag_nn_hana_${L.id}`)) g.img(hanamaruFrame(14, 1), x + w - 24, ly + 3);
    ly += ROW_H - 4;
  }
  if (flag('flag_nn_yakou')) for (const [dx, dy] of [[0, 0], [4, 2], [2, 5]]) g.rect(x + w - 16 + dx, y + 4 + dy, 2, 2, '#3A8AE0');
}

export function nnBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(NN_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  for (const L of LIGHTS) if (12 + textW(fillNames(NN_UI.names[L.id])) > RP.w - 28) bad.push(`${L.id}: ${textW(fillNames(NN_UI.names[L.id]))}px`);
  if (2 + textW(fillNames(NN_BOOK.minato)) > RP.w - 6) bad.push(`minato: ${textW(NN_BOOK.minato)}px`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 6 + (ROW_H - 4) * LIGHTS.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('nnBookText', () => nnBookCheck());
