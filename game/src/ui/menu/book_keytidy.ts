// みました帳②の すみの 1ページ「あずかった 物は、わたした」（改善会議 2026-10-31 の 5、events/keytidy.ts）：
// 章が 進んで、持ち主へ わたす 前の 物を 袋から 外した とき、②の ふしぎの 一覧の いちばん下に 番号なしの
// 1行（鉛筆の 字。何個 あっても 1行に まとめる）。右の ページに 題と「わたした 人」の 名前（・で つないで ページの 幅で 折る）。
// ふしぎの 数には 入れない。クリア後に 物が 袋へ もどると 消える。
//
// QA：__game.cmd.ktBookText()、bookPeek('kt')

import type { Gfx } from '../../engine/gfx';
import { registerDebug } from '../../debug';
import { KT_BOOK } from '../../data/text/keytidy';
import { KEY_TIDY, keyTidyPeople } from '../../events/keytidy';
import { pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { FOLD, LP, pageText, RP, SP } from './notebook';
import { addBookPeek } from './book_yuwaka';

export function hasKtPage(): boolean {
  return keyTidyPeople().length > 0;
}

export const KT_ROW_LABEL = KT_BOOK.row;

const TITLE_H = 17;
const LINE_H = 16;

/** 名前を「・」で つないで、幅 w に 折る（行の 終わりの「・」も 幅に 入れる）。 */
function nameLines(names: string[], w: number): string[] {
  const out: string[] = [];
  let cur = '';
  for (const n of names) {
    const next = cur ? `${cur}・${n}` : n;
    if (cur && textW(`${next}・`) > w) {
      out.push(`${cur}・`);
      cur = n;
    } else cur = next;
  }
  if (cur) out.push(cur);
  return out;
}

/** ページの 下の ふち（場所の 名前の テープ）の 上まで に 入る 行。あふれる ときは 最後の 行を「ほか」に。 */
function shownLines(people: string[], w: number, top: number): string[] {
  const max = Math.max(1, Math.floor((SP.y + SP.h - 12 - top) / LINE_H));
  const lines = nameLines(people, w);
  if (lines.length <= max) return lines;
  // 入る 名前だけ 並べて、残りは「ほか」
  for (let k = people.length - 1; k > 0; k--) {
    const l = nameLines([...people.slice(0, k), 'ほか'], w);
    if (l.length <= max) return l;
  }
  return ['ほか'];
}

export function drawKtPage(g: Gfx, x: number, y: number, w: number, people = keyTidyPeople()): void {
  KT_BOOK.titleLines.forEach((l, i) => g.text(l, x, y + i * TITLE_H, { color: UI.text }));
  const th = TITLE_H * KT_BOOK.titleLines.length;
  pencilLine(g, x, y + th + 1, w - 6, 1, UI.pencil, 157);
  shownLines(people, w - 8, y + th + 7).forEach((l, i) => pageText(g, l, x + 2, y + th + 7 + i * LINE_H, { color: UI.text }));
}

export function ktBookCheck(): { pages: number; bad: string[]; info: string[] } {
  const bad: string[] = [];
  const info: string[] = [];
  const row = phraseWrapInfo(KT_ROW_LABEL, FOLD - 4 - (LP.x + 14));
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const room = RP.w - 6;
  for (const l of KT_BOOK.titleLines) if (textW(l) > room) bad.push(`${l}: ${textW(l)}px`);
  // いちばん 多い とき（全部の 人）
  const all = [...new Set(KEY_TIDY.map((e) => e.to))];
  const top = SP.y + 28 + TITLE_H * KT_BOOK.titleLines.length + 7;
  const lines = shownLines(all, RP.w - 8, top);
  for (const l of lines) if (2 + textW(l) > room) bad.push(`${l}: wide`);
  if (nameLines(all, RP.w - 8).length > lines.length) info.push(`全部の 人の ときは「ほか」: ${lines.join('／')}`);
  const y = SP.y + 28;
  const bottom = y + TITLE_H * KT_BOOK.titleLines.length + 7 + LINE_H * lines.length;
  if (bottom > SP.y + SP.h - 12) bad.push(`本文: bottom ${bottom} > ${SP.y + SP.h - 12}`);
  return { pages: 1, bad, info };
}

if (import.meta.env.DEV) registerDebug('ktBookText', () => ktBookCheck());
addBookPeek('kt', (g, x, y, w) => drawKtPage(g, x, y, w, [...new Set(KEY_TIDY.map((e) => e.to))].slice(0, 6)));
addBookPeek('ktall', (g, x, y, w) => drawKtPage(g, x, y, w, [...new Set(KEY_TIDY.map((e) => e.to))]));
