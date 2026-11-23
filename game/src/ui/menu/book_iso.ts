// みました帳③の すみの 1ページ『そとの 展示室』（本日は、開館です。03_ch3_index、events/ch3/iso.ts）：
// 開館の あと（flag_iso_kaikan）、③の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。
// 右の ページに 題、名札 6枚＋空の 水槽の 1枚（○/7。わたした 名札の 名前、まだの 所は 点線）、めくった 石（○/12）、
// 名札に ならない 子（アゴハゼ・イボニシ・タマキビ）。12の 石を 全部 自分で もどしたら、すみに はなまる。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.isoBookText()

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { hanamaruFrame } from '../../battle/art/stamps';
import { ISO_BOOK, ISO_CARDS, ISO_MINI_NAMES } from '../../data/text/c3_iso';
import { dottedLine, pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';

export function hasIsoPage(): boolean {
  return flag('flag_iso_kaikan') > 0;
}

export const ISO_ROW_LABEL = ISO_BOOK.title;

const TITLE_H = 17;
const LINE_H = 12;

export function drawIsoPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(ISO_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 100);
  let ly = y + TITLE_H + 5;
  // the seven cards: the six of the shore, the far tank's
  const ids = Object.keys(ISO_CARDS);
  for (const id of ids) {
    const done = flag(`flag_iso_card_${id}`) > 0;
    g.rect(x, ly + 3, 6, 8, done ? '#FFFFFF' : UI.textDim);
    if (done) {
      // (a name wider than the page: two lines)
      const nm = ISO_CARDS[id].name;
      if (10 + textW(nm) > w - 34) {
        pageText(g, nm.slice(0, 3), x + 10, ly - 1, { color: UI.text });
        ly += LINE_H;
        pageText(g, nm.slice(3), x + 18, ly - 1, { color: UI.text });
      } else pageText(g, nm, x + 10, ly - 1, { color: UI.text });
    } else dottedLine(g, x + 10, ly + 9, x + 70, UI.textDim, 3);
    ly += LINE_H;
  }
  g.rect(x, ly + 3, 6, 8, flag('flag_iso_oku') ? '#D8E4F4' : UI.textDim);
  if (flag('flag_iso_oku')) pageText(g, ISO_BOOK.oku, x + 10, ly - 1, { color: '#3A4A8A' });
  ly += LINE_H + 4;
  // the stones turned, the ones with no card
  let n = 0;
  for (let i = 0; i < 12; i++) if (flag(`flag_iso_ishi_${i}`) > 0) n++;
  pageText(g, `${ISO_BOOK.ishi} ${n}/12`, x, ly, { color: UI.pencil });
  const minis = Object.entries(ISO_MINI_NAMES).filter(([id]) => flag(`flag_iso_seen_${id}`));
  pageText(g, `${ISO_BOOK.mini} ${minis.length}/3`, x, ly + 14, { color: UI.pencil });
  if (ISO_STONE_SELF()) g.img(hanamaruFrame(24, 1), x + w - 30, y + TITLE_H + 4);
}

function ISO_STONE_SELF(): boolean {
  for (let i = 0; i < 12; i++) if (flag(`flag_iso_ishi_${i}`) !== 1) return false;
  return true;
}

export function isoBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(ISO_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  for (const c of Object.values(ISO_CARDS)) {
    const two = 10 + textW(c.name) > RP.w - 34;
    if (two && (10 + textW(c.name.slice(0, 3)) > RP.w - 34 || 18 + textW(c.name.slice(3)) > RP.w - 6)) bad.push(`${c.name}: ${textW(c.name)}px`);
  }
  if (textW(`${ISO_BOOK.mini} 3/3`) > RP.w - 6) bad.push('mini: too wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 5 + LINE_H * 8 + 4 + 14 + 16;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('isoBookText', () => isoBookCheck());
