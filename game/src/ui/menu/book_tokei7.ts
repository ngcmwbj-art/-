// みました帳①の すみの 1ページ『チクタク堂の 7つの 時計』（チクタク堂の ばらばら時計、02_ch2_index #88、
// 10_narrative 6.22、30_level_art 10.7）：ゆうに 頼まれると（flag_tokei7_start）、①の「ふしぎ」の 一覧の
// いちばん下に 番号なしの 1行（鉛筆の 字）が 足され、右の ページに しゅんの 字で 書く。ページは
// 決定で めくる（右下に 何枚目か）：
//   1枚目『チクタク堂の 7つの 時計』○/6 … 7つの 札の 絵（ウィンドウの 真ちゅうの 札）と、聞いた 時刻
//     （5×7 の 数字。かずゆきは「7時の 少し 前」なので『6:5?』）と 持ち主。7つ目は 空きの 札、
//     終えると『5:00 ゆう『鳩』』（朱）。
//   2枚目『父の 思い出』… 札ごとの 1行（めがねの 湯気、3時の 将棋、ほえない コタロウ、地面の ぐあい、
//     13回目の おまけ、元日の 時計、5時の 鳩）。
//   3枚目『町の 朝』（6つ そろってから）… 町の 小さな 地図に、4時の 豆腐屋から 5時の 時計屋まで、
//     父の 歩いた 順に 朱の 線。
// ふしぎの 数（/12）には 入れない。
//
// QA：__game.cmd.tokei7BookText()（wrapCheck も 呼ぶ）、__game.cmd.tokei7('book')。

import type { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { registerDebug } from '../../debug';
import { measure } from '../../engine/font';
import { fudaIcon, type FudaKind } from '../../art/props/tokei7';
import { TOKEI_BOOK, TOKEI_FUDA, TOKEI_NANA, type TokeiKey } from '../../data/text/tokei7';
import { drawDigits, digitsWidth } from '../digits';
import { dottedLine, pencilLine, phraseWrapInfo, textW, UI } from '../window';
import { clearRight, clearSpacing, FOLD, LP, pageText, RP, SP, squeezable } from './notebook';

/** ゆうに 頼まれた：① に すみの ページが ある。 */
export function hasTokeiPage(): boolean {
  return flag('flag_tokei7_start') > 0;
}

/** The title as the index row shows it (pencil, no number; broken after 「チクタク堂の」). */
export const TOKEI_ROW_LABEL = TOKEI_BOOK.title.replace('の ', 'の\n');

const KIND: Record<TokeiKey, FudaKind> = { kinu: 'tofu', yuzu: 'mikan', kazuo: 'inu', chizu: 'jouro', tsurumi: 'tetsubo', master: 'cup' };

const heard = (k: TokeiKey): boolean => flag(`flag_tokei7_${k}`) > 0;
const done = (): boolean => flag('flag_tokei7_done') > 0;

/** How many of the six have told theirs. */
export function tokeiHeard(): number {
  return TOKEI_FUDA.filter((f) => heard(f.key)).length;
}

// ---- the leaves (決定 turns them) ----------------------------------------------------------

let leaf = 0;

/** 2 leaves, 3 once the six are in (the map). */
export function tokeiLeaves(): number {
  return tokeiHeard() >= 6 ? 3 : 2;
}

/** 決定 on the page: the next leaf (round to the first). */
export function tokeiTurn(): void {
  leaf = (leaf + 1) % tokeiLeaves();
}

const TITLE_H = 17;
const ROW_H = 15;
const ROW_H2 = 16;
const TIME_X = 15;
const NAME_X = 47;

/** The right page: the leaf shown, and which one it is in the corner. */
export function drawTokeiPage(g: Gfx, x: number, y: number, w: number): void {
  const n = tokeiLeaves();
  if (leaf >= n) leaf = 0;
  if (leaf === 0) drawClocks(g, x, y, w);
  else if (leaf === 1) drawOmoide(g, x, y, w);
  else drawAsa(g, x, y, w);
  // which leaf, in the bottom corner: 「1/3」 and a folded corner (clear of a touch button)
  const s = `${leaf + 1}/${n}`;
  const by = SP.y + SP.h - 11;
  const right = clearRight(SP.x + SP.w - 10, by - 2, by + 8);
  const dw = digitsWidth(s);
  const dx = right - 9 - dw;
  drawDigits(g, s, dx, by, { color: UI.pencil });
  // the dog-ear: a small triangle of the paper's back
  for (let k = 0; k < 6; k++) g.rect(right - 6 + k, by + 6 - k, 6 - k, 1, UI.bg2);
  g.px(right - 6, by + 6, UI.pencil);
  for (let k = 0; k < 6; k++) g.px(right - 6 + k, by + 6 - k, UI.pencil);
}

/** 1枚目：題と ○/6、7つの 札・時刻・持ち主。 */
function drawClocks(g: Gfx, x: number, y: number, w: number): void {
  const [t1, t2] = TOKEI_BOOK.titleLines;
  g.text(t1, x, y, { color: UI.text });
  g.text(t2, x, y + TITLE_H, { color: UI.text });
  const got = tokeiHeard();
  const count = `${got}/6`;
  const cw = textW(count);
  g.text(count, Math.min(x + w - 6 - cw, clearRight(999, y + TITLE_H, y + TITLE_H + 16) + 1 - cw), y + TITLE_H, { color: got >= 6 ? UI.accent : UI.pencil });
  pencilLine(g, x, y + TITLE_H * 2 + 1, w - 6, 1, UI.pencil, 27);
  const y0 = y + TITLE_H * 2 + 5;
  TOKEI_FUDA.forEach((f, i) => {
    const ry = y0 + i * ROW_H;
    g.img(fudaIcon(KIND[f.key]), x, ry + 3);
    if (!heard(f.key)) {
      dottedLine(g, x + TIME_X, ry + 11, x + TIME_X + 22, UI.textDim, 3);
      dottedLine(g, x + NAME_X, ry + 11, x + NAME_X + 40, UI.textDim, 3);
      return;
    }
    drawDigits(g, f.time, x + TIME_X, ry + 5, { color: UI.pencil });
    pageText(g, f.name, x + NAME_X, ry, { color: UI.text });
  });
  // the 7th: an empty tag, until 『鳩』
  const ry = y0 + 6 * ROW_H;
  g.img(fudaIcon('nana', done()), x, ry + 3);
  if (!done()) {
    dottedLine(g, x + TIME_X, ry + 11, x + TIME_X + 22, UI.textDim, 3);
    dottedLine(g, x + NAME_X, ry + 11, x + NAME_X + 40, UI.textDim, 3);
    return;
  }
  drawDigits(g, TOKEI_NANA.time, x + TIME_X, ry + 5, { color: UI.accent });
  const nw = pageText(g, TOKEI_NANA.name, x + NAME_X, ry, { color: UI.text });
  pageText(g, TOKEI_NANA.hato, x + NAME_X + nw + 2, ry, { color: UI.accent });
}

/** 2枚目：父の 思い出（札ごとの 1行）。 */
function drawOmoide(g: Gfx, x: number, y: number, w: number): void {
  g.text(TOKEI_BOOK.omoide, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 29);
  const y0 = y + TITLE_H + 5;
  const rows: { icon: HTMLCanvasElement; text: string | null; color: string }[] = [
    ...TOKEI_FUDA.map((f) => ({ icon: fudaIcon(KIND[f.key]), text: heard(f.key) ? f.omoide : null, color: UI.text })),
    { icon: fudaIcon('nana', done()), text: done() ? TOKEI_NANA.omoide : null, color: UI.accent },
  ];
  rows.forEach((r, i) => {
    const ry = y0 + i * ROW_H2;
    g.img(r.icon, x, ry + 3);
    if (!r.text) {
      dottedLine(g, x + TIME_X, ry + 11, x + TIME_X + 60, UI.textDim, 3);
      return;
    }
    pageText(g, r.text, x + TIME_X, ry, { color: r.color });
  });
}

// ---- 3枚目：町の 朝 ------------------------------------------------------------------------

/**
 * しゅん's sketch of the town (not to scale, page px in a 136×118 box): the park up on the left,
 * 夕鳴銀座 across the middle (しんごの 家, 豆腐 くま吉, チクタク堂, 喫茶 初日の出 along its north side),
 * the alley up to the park, the slope down to the south road. Each place has its tag, its time
 * beside it, and the father's walk runs through them in 朱 in the order he walked it.
 */
const ASA: { at: [number, number]; time: string; kind: FudaKind | 'clock'; label: 'r' | 'l' | 'u' | 'd' }[] = [
  { at: [64, 44], time: '4:00', kind: 'tofu', label: 'u' }, // 豆腐 くま吉
  { at: [46, 14], time: '5:30', kind: 'tetsubo', label: 'r' }, // 公園の 鉄棒
  { at: [33, 82], time: '6:00', kind: 'inu', label: 'r' }, // 坂（コタロウの 朝の 散歩）
  { at: [122, 44], time: '6:5?', kind: 'cup', label: 'd' }, // 喫茶 初日の出
  { at: [16, 106], time: '10:00', kind: 'jouro', label: 'r' }, // ちずの 水まき
  { at: [12, 44], time: '3:00', kind: 'mikan', label: 'd' }, // しんごの 家（3時の 将棋）
  { at: [93, 44], time: '5:00', kind: 'clock', label: 'u' }, // チクタク堂
];

function drawAsa(g: Gfx, x: number, y: number, w: number): void {
  g.text(TOKEI_BOOK.asa, x, y, { color: UI.text });
  pencilLine(g, x, y + TITLE_H + 1, w - 6, 1, UI.pencil, 31);
  const mx = x;
  const my = y + TITLE_H + 5;
  const pen = UI.pencil;
  const faint = UI.textDim;
  const P = (px: number, py: number): [number, number] => [mx + px, my + py];
  // the park: a dotted box, a few trees
  for (let k = 26; k <= 74; k += 2) {
    g.px(mx + k, my + 2, faint);
    g.px(mx + k, my + 28, faint);
  }
  for (let k = 2; k <= 28; k += 2) {
    g.px(mx + 26, my + k, faint);
    g.px(mx + 74, my + k, faint);
  }
  for (const [tx, ty] of [[31, 8], [68, 9], [33, 22], [66, 22]]) {
    g.rect(mx + tx - 1, my + ty - 1, 3, 2, faint);
    g.px(mx + tx, my + ty + 1, faint);
  }
  // 夕鳴銀座 (two lines), the alley up to the park, the slope down to the south road
  g.rect(...P(0, 59), w - 8, 1, pen);
  g.rect(...P(0, 65), w - 8, 1, pen);
  for (let k = 29; k <= 58; k++) {
    g.px(mx + 44, my + k, pen);
    g.px(mx + 49, my + k, pen);
  }
  for (let k = 66; k <= 98; k++) {
    const sx = 28 - Math.round(((k - 66) / 32) * 6);
    g.px(mx + sx, my + k, pen);
    g.px(mx + sx + 5, my + k, pen);
  }
  g.rect(...P(0, 98), w - 8, 1, pen);
  g.rect(...P(0, 114), w - 8, 1, faint);
  // the father's walk: a vermilion line from 4時 to 5時, dot after dot
  for (let i = 0; i + 1 < ASA.length; i++) {
    const [ax, ay] = P(...ASA[i].at);
    const [bx, by] = P(...ASA[i + 1].at);
    const n = Math.max(Math.abs(bx - ax), Math.abs(by - ay));
    for (let k = 0; k <= n; k += 2) g.px(Math.round(ax + ((bx - ax) * k) / n), Math.round(ay + ((by - ay) * k) / n), UI.accent);
  }
  // the places: the tag (the clock shop: a little clock), and the time beside it (the first and the last in 朱)
  ASA.forEach((r, i) => {
    const [cx, cy] = P(...r.at);
    if (r.kind === 'clock') {
      g.rect(cx - 5, cy - 5, 11, 11, UI.text);
      g.rect(cx - 4, cy - 4, 9, 9, UI.bg);
      g.rect(cx, cy - 3, 1, 4, UI.text);
      g.rect(cx, cy, 3, 1, UI.text);
    } else g.img(fudaIcon(r.kind), cx - 6, cy - 4);
    const tw = digitsWidth(r.time);
    const col = i === 0 || i === ASA.length - 1 ? UI.accent : pen;
    const [lx, ly] =
      r.label === 'r' ? [cx + 8, cy - 3] : r.label === 'l' ? [cx - 8 - tw, cy - 3] : r.label === 'u' ? [cx - Math.round(tw / 2), cy - 14] : [cx - Math.round(tw / 2), cy + 7];
    g.rect(lx - 1, ly - 1, tw + 2, 9, UI.bg);
    drawDigits(g, r.time, Math.max(mx, Math.min(mx + w - 8 - tw, lx)), ly, { color: col });
  });
}

/**
 * QA: the index row and the leaves fit (the row: 2 lines at the label width; each line of a leaf
 * within the page and clear of an iPad's touch buttons, at most 2px a letter tighter — pageText).
 */
export function tokeiBookCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  const labelW = FOLD - 4 - (LP.x + 14);
  const row = phraseWrapInfo(TOKEI_ROW_LABEL, labelW);
  if (row.lines.length > 2 || row.forced) bad.push(`一覧: ${row.lines.join('／')}`);
  const y = SP.y + 28;
  for (const t of TOKEI_BOOK.titleLines) if (textW(t) > RP.w - 6) bad.push(`題: ${t} ${textW(t)}px`);
  if (textW(TOKEI_BOOK.titleLines[1]) + 8 + textW('6/6') > RP.w - 6) bad.push('題と 6/6');
  const fit = (s: string, x: number, ly: number, right = RP.x + RP.w) => {
    const room = Math.min(right, clearRight(999, ly, ly + 16) + 1) - x;
    if (!squeezable(s, room)) bad.push(`${s} (${measure(s, clearSpacing(s, x, ly))}px > ${room})`);
  };
  const y0 = y + TITLE_H * 2 + 5;
  TOKEI_FUDA.forEach((f, i) => {
    fit(f.name, RP.x + NAME_X, y0 + i * ROW_H);
    if (digitsWidth(f.time) > NAME_X - TIME_X - 3) bad.push(`時刻 ${f.time}`);
  });
  fit(TOKEI_NANA.name + TOKEI_NANA.hato, RP.x + NAME_X, y0 + 6 * ROW_H);
  if (y0 + 7 * ROW_H > SP.y + SP.h - 12) bad.push(`1枚目: bottom ${y0 + 7 * ROW_H}`);
  const y1 = y + TITLE_H + 5;
  [...TOKEI_FUDA.map((f) => f.omoide), TOKEI_NANA.omoide].forEach((s, i) => fit(s, RP.x + TIME_X, y1 + i * ROW_H2));
  if (y1 + 7 * ROW_H2 > SP.y + SP.h - 12) bad.push(`2枚目: bottom ${y1 + 7 * ROW_H2}`);
  return { pages: 3, bad };
}

if (import.meta.env.DEV) registerDebug('tokei7BookText', () => tokeiBookCheck());
