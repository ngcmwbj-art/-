// みました帳②の すみの 1ページ『湯を わかしてから』（02_ch2_index #106、events/ch2/yuwaka.ts）：ごほうびの あと
// （flag_yw_done）、②の「ふしぎ」の 一覧の いちばん下に 番号なしの 1行（鉛筆の 字）。右の ページに 題、とうもろこしの
// 鉛筆の 絵（茶色い ひげ）、スギばあの 貼り紙の 字、畑の 物（2本・早い 株・かじられ・物置）の ○、いちばん よかった あまさ。
// ふしぎの 数（/10）には 入れない。
//
// QA：__game.cmd.ywBookText()

import type { Gfx } from '../../engine/gfx';
import { game } from '../../engine/game';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { YW_BOOK, YW_UI } from '../../data/text/hoshi_yuwaka';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';

export function hasYwPage(): boolean {
  return flag('flag_yw_done') > 0;
}

export const YW_ROW_LABEL = YW_BOOK.title;

const TITLE_H = 17;
const ROW_H = 16;
const LINE_H = 16;

/** とうもろこしの 鉛筆の 絵（皮・茶色い ひげ）。 */
function corn(g: Gfx, x: number, y: number): void {
  const pc = UI.pencil;
  for (let i = 0; i < 18; i++) {
    const w = Math.round(Math.sin((i / 18) * Math.PI) * 3) + 1;
    g.rect(x + i, y + 8 - w, 1, w * 2, i % 4 === 0 ? pc : '#8AB060');
  }
  for (let s = 0; s < 4; s++) g.line(x + 18, y + 7, x + 22 + s, y + 2 + s * 2, '#8A5A32');
}

export function drawYwPage(g: Gfx, x: number, y: number, w: number): void {
  g.text(YW_BOOK.title, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 106);
  let ly = y + TITLE_H + 5;
  corn(g, x + 2, ly);
  const best = flag('flag_yw_best');
  if (best) pageText(g, `${YW_BOOK.ama} ${YW_UI.marks[best - 1]}`, x + 32, ly + 1, { color: UI.text });
  ly += 18;
  // スギばあの 貼り紙の 字（写し）
  for (const l of YW_BOOK.harigami) {
    pageText(g, l, x + 2, ly, { color: '#5A6A8A' });
    ly += LINE_H;
  }
  ly += 3;
  const got = [flag('flag_yw_moida') >= 2, flag('flag_yw_hayai') > 0, flag('flag_yw_kajiri') > 0, flag('flag_yw_koya') > 0];
  YW_BOOK.rows.forEach((name, i) => {
    pageText(g, got[i] ? '○' : '・', x + 2, ly, { color: got[i] ? UI.accent : UI.pencil });
    pageText(g, name, x + 18, ly, { color: UI.text });
    ly += ROW_H;
  });
}

export function ywBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(YW_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  if (textW(YW_BOOK.title) > room) bad.push(`${YW_BOOK.title}: ${textW(YW_BOOK.title)}px`);
  for (const l of YW_BOOK.harigami) if (2 + textW(l) > room) bad.push(`${l}: ${2 + textW(l)}px`);
  for (const n of YW_BOOK.rows) if (18 + textW(n) > room) bad.push(`${n}: ${16 + textW(n)}px`);
  if (32 + textW(`${YW_BOOK.ama} ◎`) > room) bad.push('あまさ: wide');
  const y = SP.y + 28;
  const bottom = y + TITLE_H + 5 + 18 + LINE_H * YW_BOOK.harigami.length + 3 + ROW_H * YW_BOOK.rows.length;
  if (bottom > SP.y + SP.h - 2) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 2}`);
  return { pages: 1, bad };
}

if (import.meta.env.DEV) registerDebug('ywBookText', () => ywBookCheck());

// QA：__game.cmd.bookPeek('yw'|'hn'|'mh'|'sh') — 10/18 の すみの ページを、帳面の 右の ページの 場所に 1枚だけ 出す
// （決定・もどるで 閉じる。開発サーバーだけ）
const PEEK: Record<string, (g: Gfx, x: number, y: number, w: number) => void> = { yw: drawYwPage };
export function addBookPeek(key: string, draw: (g: Gfx, x: number, y: number, w: number) => void): void {
  PEEK[key] = draw;
}
if (import.meta.env.DEV)
  registerDebug('bookPeek', (key = 'yw') => {
    const draw = PEEK[key];
    if (!draw) return `no page ${key}`;
    const w = {
      modal: true,
      done: false,
      update(_dt: number, input: { pressed(k: string): boolean }) {
        if (input.pressed('confirm') || input.pressed('cancel')) {
          this.done = true;
          game.ui.remove(w);
        }
      },
      draw(g: Gfx) {
        g.rect(0, 0, 384, 216, '#2A2440');
        g.rect(SP.x, SP.y, SP.w, SP.h, '#F4ECD8');
        g.rect(FOLD, SP.y, 1, SP.h, '#C8BC9C');
        draw(g, RP.x, SP.y + 28, RP.w);
      },
    };
    game.ui.push(w);
    return key;
  });
