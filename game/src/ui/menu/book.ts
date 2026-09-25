// みました帳 (30_level_art 10.7, 10_narrative 12.3 / 13; chapter 2: 50_ch2_story
// 8.11, 52_ch2_level_art 13.2): the 自由研究 notebook with three sections —
// ふしぎ, あいて and ツッコミ. The left page is the index (unrecorded rows are
// a dotted 「…………」), the right page shows the chosen entry. ←→ turns the
// section, ↑↓ moves in the index.
//
// Once chapter 2 has begun there are two notebooks: ① 夕鳴町 (ふしぎ 12,
// あいて 7, ツッコミ 19) and ② 星見台 (ふしぎ 10, あいて 6, ツッコミ 17). Two
// little sticky flags on the notebook's left edge (① #7FD1E8, ② #9BCB6B)
// show which one is open; ←→ past the last section goes on into the other
// notebook, and ダッシュ (Shift) swaps them directly. Changing notebooks
// lays the other one's cover over the left page for a moment and opens it:
// ① is navy (#2F4A8A), ② deep green (#2E6B4A) with a tomato and a gold
// star sticker; after chapter 2 its title reads 「星見台 みました帳 ②」 with
// a 朱 はなまる in the corner.

import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { charWidth } from '../../engine/font';
import { makeCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { ease } from '../../engine/tween';
import { flag, state } from '../../game/state';
import { getEnemy } from '../../data/battle';
import { sfx } from '../../audio';
import { charSprite, hasChar, idleFrame } from '../../art/chars';
import { hanamaruFrame, kakimojiSmall, ovalStamp } from '../../battle/art/stamps';
import { getFushigi } from '../../world/fushigi';
import { digitsWidth, drawDigits } from '../digits';
import { tomatoIcon } from '../icons';
import { ctxText, drawCursor, drawMarker, dottedLine, drawTape, fitWrap, pencilLine, phraseWrap as wrap, rectA, textW, UI } from '../window';
import { drawHeader, drawScroll, FOLD, LP, RP, SP } from './notebook';
import type { MenuCtx, MenuPage } from './types';

// ---- data: ① 夕鳴町 ----------------------------------------------------------------------------

/** 13.1 みました帳「ふしぎ」の見出し, place, and the stamped text (00_concept 12). */
export const FUSHIGI_BOOK: [string, string, string][] = [
  ['おくれる カーブミラー', 'ひぐらし坂', '鏡の中の ミナトが あわてて 追いついた。'],
  ['半歩 おくれる 猫の影', 'ひぐらし坂', '影が 猫に 追いついて、ちょっと 照れた。'],
  ['五線譜の スズメ', 'ひぐらし坂', 'スズメたちは 別の 曲を はじめた。'],
  ['止まらない まいど', '夕鳴銀座', 'まめ吉は『……まいど』を 1回で やめた。'],
  ['まだ 乾かない 3番', 'コインランドリー', '中から『乾いた』と 声が した。'],
  ['落とし物：17時', '交番', '掲示に 受付印が 押された。'],
  ['夕日の 堤防', '夕鳴公園', '女の子は ほこらしげに 胸を はった。'],
  ['正確さが 自慢の 時計塔', '夕鳴公園', '時計は 見られて いることに 気づいて、秒針だけ 動かした。'],
  ['家出した カートたち', 'モール駐車場', 'カートたちは 1列に 並んで 戻っていった。'],
  ['噴水の 10円玉', 'ユウナリ 1F', '願いごとが 1枚ぶん かなった 気がする。'],
  ['お礼を 言う エスカレーター', 'ユウナリ 1F', 'エスカレーターは 1回だけ『いらっしゃいませ』と 言った。'],
  ['名前の ない 回転焼き', 'ユウナリ フードコート', '回転焼き機は ようやく 止まった。'],
];

/** The seven 「あいて」 (カネナリくんとオムカエマチは数えない). */
export const BOOK_ENEMIES = [
  'enemy_hato_kakaricho',
  'enemy_semi_final',
  'enemy_cone_vocal',
  'enemy_wasuregasa',
  'enemy_ojigi_jihanki',
  'enemy_soujirou',
  'enemy_momisugi',
];

/** Enemies whose ツッコミ lines are in the book (19 in all, 10_narrative 9.2). */
export const TSUKKOMI_ENEMIES = [...BOOK_ENEMIES, 'boss_omukaemachi'];

// ---- data: ② 星見台 (50_ch2_story 8.1–8.11, 6.9) ----------------------------------------------

/** ② ふしぎ: 見出し, place, and the first page of what the stamp did. */
export const FUSHIGI2_BOOK: [string, string, string][] = [
  ['待っている 駅ノート', '星見台駅', '白い ページに、ミナトの 字で『夕鳴町から 来ました』と 書かれた。'],
  ['4:59に なりたい 時刻表', '転回場', '時刻表は 照れて、『6:12』に 落ちついた。'],
  ['流されていく 星', '用水路', '星たちは 流れに さからって、空と 同じ 場所に もどった。'],
  ['回らない 回覧板', '空き家', '『森本』の 欄に、『みました』の 判が 押された。'],
  ['田んぼの 夕焼け', '棚田', '夕焼けは、あわてて 西の ほうへ 帰っていった。'],
  ['はなまるトマト', '3号ハウス', 'トマトは、見て もらえて、ぽっと 明るく なった。'],
  ['息を する ハウス', '3号ハウス', 'ビニールは 深呼吸を 1回して、静かに なった。'],
  ['そろった 反すう', '石黒牛舎', '牛たちは、それぞれの ペースに もどった。'],
  ['決まらない 日直', '旧分校', '日直の 欄に、はなまるが 描かれた。'],
  ['本日は 晴天なり', '旧分校', 'マイクは 小さく、『……本日は 晴天なり』と 言った。'],
];

/** The six 「あいて」 of ② (the boss is not counted). */
export const BOOK2_ENEMIES = ['enemy_sune_tomato', 'enemy_henoheno_kacho', 'enemy_biribiri_ban', 'enemy_chototsu', 'enemy_mujin_hanbaiin', 'enemy_tetsuya'];

/** ② ツッコミ: 17 lines (6.9), with the boss. */
export const TSUKKOMI2_ENEMIES = [...BOOK2_ENEMIES, 'boss_yobimodoshi'];

interface BookText {
  name: string;
  shotai: string;
  hitokoto: string;
  tsukkomi: string[];
}

/** What ② writes down about an enemy: the battle data's name, 正体, ひとこと and ツッコミ. */
function textOf(id: string): BookText | null {
  const e = getEnemy(id);
  if (!e) return null;
  return { name: e.name, shotai: e.book?.shotai ?? '', hitokoto: e.book?.hitokoto ?? '', tsukkomi: e.tsukkomi ?? [] };
}

// ---- the two notebooks ------------------------------------------------------------------------

export interface TsukkomiEntry {
  enemy: string;
  n: number;
  line: string;
}

interface Volume {
  n: 1 | 2;
  fushigi: [string, string, string][];
  done(i: number): boolean;
  pressed(i: number): string;
  enemies: string[];
  tsukkomiEnemies: string[];
  /** Header tape and the chosen section tab. */
  tape: string;
  tabOn: string;
  flag: string;
}

function fushigiId(vol: 1 | 2, i: number): string {
  const nn = String(i + 1).padStart(2, '0');
  return vol === 1 ? `fushigi_${nn}` : `fushigi_ch2_${nn}`;
}

export function fushigiDoneN(i: number): boolean {
  return flag(`flag_fushigi_${String(i + 1).padStart(2, '0')}`) > 0;
}

export function fushigi2Done(i: number): boolean {
  return flag(`flag_fushigi_ch2_${String(i + 1).padStart(2, '0')}`) > 0;
}

/** The first page of the stamped text, from the ふしぎ definition when the world has it. */
function pressedFrom(id: string, fallback: string): string {
  const d = getFushigi(id);
  if (d?.pressed) {
    const first = d.pressed.split(/\n\s*\/\s*\n/)[0];
    const lines = first
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l && !/^[@>?![]/.test(l))
      .map((l) => l.replace(/\{[^}]*\}/g, ''));
    // an authored line break is a phrase break: keep it as a space (none after 、。)
    if (lines.length) return lines.reduce((a, l) => (a ? a + (/[、。！？」』）]$/.test(a) ? '' : ' ') + l : l), '');
  }
  return fallback;
}

/** First page of the stamped text of ① ふしぎ i. */
export function pressedText(i: number): string {
  return pressedFrom(fushigiId(1, i), FUSHIGI_BOOK[i][2]);
}

/** First page of the stamped text of ② ふしぎ i. */
export function pressedText2(i: number): string {
  return pressedFrom(fushigiId(2, i), FUSHIGI2_BOOK[i][2]);
}

const VOL1: Volume = {
  n: 1,
  fushigi: FUSHIGI_BOOK,
  done: fushigiDoneN,
  pressed: pressedText,
  enemies: BOOK_ENEMIES,
  tsukkomiEnemies: TSUKKOMI_ENEMIES,
  tape: '#7FD1E8',
  tabOn: '#BDEFFA',
  flag: '#7FD1E8',
};

const VOL2: Volume = {
  n: 2,
  fushigi: FUSHIGI2_BOOK,
  done: fushigi2Done,
  pressed: pressedText2,
  enemies: BOOK2_ENEMIES,
  tsukkomiEnemies: TSUKKOMI2_ENEMIES,
  tape: '#9BCB6B',
  tabOn: '#D6EDB8',
  flag: '#9BCB6B',
};

function linesOf(id: string, vol: Volume): string[] {
  if (vol.n === 1) return getEnemy(id)?.tsukkomi ?? [];
  return textOf(id)?.tsukkomi ?? [];
}

/** Seen ツッコミ lines of a notebook, in the order they were first seen (flag insertion order). */
function seenIn(vol: Volume): TsukkomiEntry[] {
  const out: TsukkomiEntry[] = [];
  for (const k of Object.keys(state.flags)) {
    if (!k.startsWith('flag_tsukkomi_') || !state.flags[k]) continue;
    const m = /^flag_tsukkomi_(.+)_(\d+)$/.exec(k);
    if (!m || !vol.tsukkomiEnemies.includes(m[1])) continue;
    const n = Number(m[2]);
    const line = linesOf(m[1], vol)[n - 1];
    if (!line) continue;
    out.push({ enemy: m[1], n, line });
  }
  return out;
}

function totalIn(vol: Volume, fallback: number): number {
  let n = 0;
  for (const id of vol.tsukkomiEnemies) n += linesOf(id, vol).length;
  return n || fallback;
}

/** ① ツッコミ seen so far. */
export function seenTsukkomi(): TsukkomiEntry[] {
  return seenIn(VOL1);
}

export function tsukkomiTotal(): number {
  return totalIn(VOL1, 19);
}

/** ② ツッコミ seen so far. */
export function seenTsukkomi2(): TsukkomiEntry[] {
  return seenIn(VOL2);
}

export function tsukkomiTotalCh2(): number {
  return totalIn(VOL2, 17);
}

export function bookCounts(): { fushigi: number; aite: number; tsukkomi: number } {
  let f = 0;
  for (let i = 0; i < 12; i++) if (fushigiDoneN(i)) f++;
  const a = BOOK_ENEMIES.filter((id) => flag('flag_book_' + id)).length;
  return { fushigi: f, aite: a, tsukkomi: seenTsukkomi().length };
}

/** みました帳 ②'s counts (ふしぎ /10, あいて /6, ツッコミ /17). */
export function bookCountsCh2(): { fushigi: number; aite: number; tsukkomi: number } {
  let f = 0;
  for (let i = 0; i < FUSHIGI2_BOOK.length; i++) if (fushigi2Done(i)) f++;
  const a = BOOK2_ENEMIES.filter((id) => flag('flag_book_' + id)).length;
  return { fushigi: f, aite: a, tsukkomi: seenTsukkomi2().length };
}

/** Chapter 2 has begun: the book has its second notebook. */
export function hasBook2(): boolean {
  return flag('flag_ch2_started') > 0;
}

// ---- covers ---------------------------------------------------------------------------------

const COVER = { w: 148, h: 176 };
const coverCache = new Map<string, HTMLCanvasElement>();

/**
 * A notebook's cover (148×176): cloth in the notebook's colour with a
 * darker binding strip, a paper title label with the title written in by
 * hand, the class and name line under it. ② has its stickers — a red
 * tomato (10×10) and a gold star (7×7) — and, once chapter 2 is finished,
 * its long title and a 朱 はなまる.
 */
export function bookCover(vol: 1 | 2, done: boolean, tag = false): HTMLCanvasElement {
  const key = `${vol}:${done}:${tag}`;
  let c = coverCache.get(key);
  if (c) return c;
  const { w, h } = COVER;
  const [cv, ctx] = makeCanvas(w + 3, h + 3);
  const r = (x: number, y: number, ww: number, hh: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
    ctx.globalAlpha = 1;
  };
  const base = vol === 1 ? '#2F4A8A' : '#2E6B4A';
  const dark = vol === 1 ? '#22386C' : '#1F4E36';
  const light = vol === 1 ? '#4A6AB0' : '#3FA66B';
  r(3, 3, w, h, '#0B0B14', 0.45);
  r(1, 0, w - 2, h, UI.border);
  r(0, 1, w, h - 2, UI.border);
  r(1, 1, w - 2, h - 2, base);
  // cloth weave, lighter toward the top left
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const n = hash2(x, y, vol * 7 + 3);
      if (n < 0.05) r(x, y, 1, 1, (x + y) % 2 ? light : dark);
      else if (n > 0.985 && x + y < w) r(x, y, 1, 1, light);
    }
  r(2, 1, w - 4, 1, light);
  r(1, h - 2, w - 2, 1, dark);
  // binding strip on the left (a darker cloth tape with stitches)
  r(1, 1, 16, h - 2, dark);
  r(16, 1, 1, h - 2, UI.border, 0.35);
  for (let y = 8; y < h - 6; y += 10) r(8, y, 2, 4, light);
  // the paper title label
  const lx = 28;
  const ly = 30;
  const lw = w - 40;
  const lh = 58;
  r(lx - 1, ly - 1, lw + 2, lh + 2, UI.border);
  r(lx, ly, lw, lh, '#FBF7EC');
  r(lx + 2, ly + 2, lw - 4, 1, base);
  r(lx + 2, ly + lh - 3, lw - 4, 1, base);
  r(lx, ly, lw, 1, '#FFFFFF');
  // printed 「じゆうけんきゅう」 small and the class / name line
  const kx = lx + 6;
  ctx.globalAlpha = 1;
  drawSmall(ctx, 'じゆうけんきゅう', kx, ly + 6, base);
  // hand-written title (pencil, doubled 1px like the ending's cover)
  const lines = vol === 1 ? ['夕鳴町', 'みました帳 ①'] : done ? ['星見台', 'みました帳 ②'] : ['', 'みました帳 ②'];
  lines.forEach((l, i) => {
    if (!l) return;
    const tw = textW(l);
    let x = Math.round(lx + lw / 2 - tw / 2);
    const y = ly + 18 + i * 18 - (lines[0] ? 0 : 8);
    [...l].forEach((ch, j) => {
      const dy = [0, 1, 0, -1, 0, 1][j % 6];
      ctxText(ctx, ch, x, y + dy, UI.pencil);
      ctxText(ctx, ch, x + 1, y + dy, UI.pencil);
      x += charWidth(ch);
    });
  });
  r(lx + 44, ly + lh + 18, lw - 44, 1, light);
  drawSmall(ctx, '5年2組', lx, ly + lh + 8, '#FBF3DC');
  drawSmall(ctx, '潮見 ミナト', lx + 46, ly + lh + 7, '#FBF3DC');
  if (vol === 2) {
    // a red tomato sticker and a gold star sticker, a little crooked
    ctx.drawImage(stickerTomato(), lx + lw - 8, ly - 7);
    ctx.drawImage(stickerStar(), 22, h - 36);
    if (tag) ctx.drawImage(stickerEarTag(), 32, h - 30);
    if (done) {
      // the teacher's 朱 はなまる, pressed at the bottom right
      const hm = hanamaruFrame(30, 1, false, 2);
      ctx.globalAlpha = 0.95;
      ctx.drawImage(hm, w - 42, h - 44);
      ctx.globalAlpha = 1;
    }
  } else {
    // ① has seen a summer: a scuffed corner and a faded strip where the hand holds it
    r(w - 10, h - 10, 8, 8, light, 0.35);
    for (let y = 100; y < 150; y++) if (hash2(0, y, 12) < 0.4) r(w - 6, y, 4, 1, light, 0.3);
  }
  c = cv;
  coverCache.set(key, c);
  return c;
}

function drawSmall(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string): void {
  ctxText(ctx, s, x, y, color);
}

let tomatoStickerC: HTMLCanvasElement | null = null;
/** 10×10 round sticker: the tomato on white with a thin border. */
export function stickerTomato(): HTMLCanvasElement {
  if (tomatoStickerC) return tomatoStickerC;
  const [c, ctx] = makeCanvas(14, 14);
  ctx.fillStyle = '#F4F1E8';
  for (let y = 0; y < 14; y++)
    for (let x = 0; x < 14; x++) {
      const d = Math.hypot(x + 0.5 - 7, y + 0.5 - 7);
      if (d <= 6.8) ctx.fillRect(x, y, 1, 1);
    }
  ctx.drawImage(tomatoIcon('ready'), 1, 1);
  tomatoStickerC = c;
  return c;
}

let starStickerC: HTMLCanvasElement | null = null;
/** 7×7 gold star sticker (#F6D98A with a darker gold edge). */
let earTagC: HTMLCanvasElement | null = null;
/**
 * おてつだいのシール (52 13.2): a yellow ear tag (10×8, #FFD23F, its shade
 * #D9A441), the hole it hangs by, two black lines where the number is —
 * you can't read it. Stuck on ②'s cover once the barn work is done.
 */
export function stickerEarTag(): HTMLCanvasElement {
  if (earTagC) return earTagC;
  const rows = ['.oooooooo.', 'oYYYhYYYYo', 'oYYYYYYYYo', 'oYkkkkkkYo', 'oYYYYYYYYo', 'oYkkkkkYdo', 'oYYYYYYddo', '.oooooooo.'];
  const pal: Record<string, string> = { o: '#B8862A', Y: '#FFD23F', h: '#6A4A1A', k: '#2A2440', d: '#D9A441' };
  const [c, ctx] = makeCanvas(10, 8);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  earTagC = c;
  return c;
}

/** The barn work is done: ② has its ear tag sticker. */
export function hasEarTag(): boolean {
  return flag('flag_ch2_barn_work') > 0;
}

export function stickerStar(): HTMLCanvasElement {
  if (starStickerC) return starStickerC;
  const rows = ['...o...', '...O...', 'oOOjOOo', '.OjjjO.', '..OjO..', '.OO.OO.', 'oO...Oo'];
  const [c, ctx] = makeCanvas(7, 7);
  rows.forEach((row, y) =>
    [...row].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === 'j' ? '#FFF1B8' : ch === 'O' ? '#F6D98A' : '#D9A441';
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  starStickerC = c;
  return c;
}

// ---- page ------------------------------------------------------------------------------

const SECTIONS = ['ふしぎ', 'あいて', 'ツッコミ'];
/** Lines of the index on the left page. */
const VISIBLE = 8;
/** Width of an index label (to just short of the fold). */
const LABEL_W = FOLD - 4 - (LP.x + 14);
/** The notebook flags on the left edge (16×12). */
const FLAG_Y = [SP.y + 34, SP.y + 50];
/** Changing notebooks: the cover lies there, then opens. */
const COVER_IN = 110;
const COVER_HOLD = 300;
const COVER_OPEN = 230;

interface Row {
  lines: string[];
  done: boolean;
  num: string;
  color: string;
}
const ROW_H = 18;
const LIST_Y = SP.y + 30;

export class BookPage implements MenuPage {
  private vol: 1 | 2 = 1;
  private sec = 0;
  private sel = [
    [0, 0, 0],
    [0, 0, 0],
  ];
  private scroll = [
    [0, 0, 0],
    [0, 0, 0],
  ];
  private moveT = 999;
  private secT = 999;
  /** Since the notebooks were swapped (the cover animation). */
  private volT = 999;
  private fromVol: 1 | 2 = 1;

  private get v(): Volume {
    return this.vol === 2 ? VOL2 : VOL1;
  }

  private opened = false;

  show(): void {
    // the notebook of the chapter being played is the one on top when the menu opens
    if (!this.opened) {
      this.opened = true;
      this.vol = hasBook2() ? 2 : 1;
      this.sec = 0;
    }
    if (!hasBook2()) this.vol = 1;
  }

  enter(): boolean {
    if (!hasBook2()) this.vol = 1;
    return true;
  }

  private count(): number {
    const v = this.v;
    return this.sec === 0 ? v.fushigi.length : this.sec === 1 ? v.enemies.length : totalIn(v, v.n === 1 ? 19 : 17);
  }

  update(_m: MenuCtx, dt: number, input: Input): boolean {
    this.moveT += dt;
    this.secT += dt;
    this.volT += dt;
    if (input.repeat('right')) this.turn(1);
    else if (input.repeat('left')) this.turn(-1);
    else if (input.pressed('dash') && hasBook2()) this.swap(this.vol === 1 ? 2 : 1, 0);
    const n = this.count();
    if (input.repeat('down')) this.move(1, n);
    else if (input.repeat('up')) this.move(-1, n);
    this.fixScroll(this.rows());
    if (input.pressed('cancel')) {
      sfx('se_cancel');
      return false;
    }
    return true;
  }

  /** ←→: the next section; past the last one, on into the other notebook. */
  private turn(d: number): void {
    const next = this.sec + d;
    if (hasBook2() && (next > 2 || next < 0)) {
      this.swap(this.vol === 1 ? 2 : 1, next > 2 ? 0 : 2);
      return;
    }
    this.sec = (next + 3) % 3;
    this.secT = 0;
    sfx('se_page');
  }

  private swap(vol: 1 | 2, sec: number): void {
    if (vol === this.vol) return;
    this.fromVol = this.vol;
    this.vol = vol;
    this.sec = sec;
    this.secT = 0;
    this.volT = 0;
    sfx('se_page', { pitch: 0.8 });
    sfx('se_paper_bag', { vol: 0.35, pitch: 1.2 });
  }

  private move(d: number, n: number): void {
    const s = this.sec;
    const sel = this.sel[this.vol - 1];
    sel[s] = (sel[s] + d + n) % n;
    this.moveT = 0;
    sfx('se_cursor');
  }

  draw(g: Gfx, m: MenuCtx): void {
    const v = this.v;
    const two = hasBook2();
    if (two) {
      // the notebook's number written on the header tape after its name
      drawTape(g, LP.x, SP.y + 6, textW('みました帳') + 28, 18, '', { color: v.tape, seed: 9 + v.n });
      g.text('みました帳', LP.x + 8, SP.y + 7, { color: UI.text });
      drawCircledNum(g, v.n, LP.x + 8 + textW('みました帳') + 2, SP.y + 11, UI.text);
    } else drawHeader(g, 'みました帳', LP.x, SP.y + 6, v.tape, 1, 9 + v.n);
    const c = v.n === 1 ? bookCounts() : bookCountsCh2();
    const have = this.sec === 0 ? c.fushigi : this.sec === 1 ? c.aite : c.tsukkomi;
    drawDigits(g, `${have}/${this.count()}`, FOLD - (two ? 6 : 12), SP.y + 12, { color: UI.pencil, align: 'right' });
    const k = Math.min(1, this.secT / 120);
    g.alpha(k, () => {
      this.drawList(g, m);
      this.drawDetail(g, m);
    });
    this.drawCoverSwap(g);
  }

  drawBehind(g: Gfx, m: MenuCtx): void {
    // section tabs sticking out of the notebook's top edge
    let tx = SP.x + 80;
    const v = this.v;
    if (m.focus) {
      // ←→ turns the section: little pencil chevrons either side of the tabs
      const b = Math.floor(m.t / 300) % 2;
      chevron(g, tx - 8 - b, SP.y - 10, -1);
      chevron(g, tx + SECTIONS.reduce((a, n) => a + textW(n) + 16, 0) + 4 + b, SP.y - 10, 1);
    }
    SECTIONS.forEach((name, i) => {
      const w = textW(name) + 14;
      const sel = i === this.sec;
      const y = SP.y - 18 - (sel ? 2 : 0);
      drawTape(g, tx, y, w, 20, '', { color: sel ? v.tabOn : '#D8CBA8', seed: 20 + i });
      g.text(name, tx + 7, y + 1, { color: sel ? UI.text : UI.pencil });
      if (sel && m.focus) {
        g.rect(tx + 2, y + 17, w - 4, 1, UI.accent);
      }
      tx += w + 2;
    });
    if (hasBook2()) this.drawFlags(g, m);
  }

  /**
   * ① ② flags (16×12) tucked under the notebook's left edge like index
   * stickers; the open one sticks out 3 px further and is the brighter.
   */
  private drawFlags(g: Gfx, m: MenuCtx): void {
    ([1, 2] as const).forEach((n, i) => {
      const on = n === this.vol;
      const col = n === 1 ? VOL1.flag : VOL2.flag;
      const x = SP.x - 14 - (on ? 3 : 0);
      const y = FLAG_Y[i];
      rectA(g, x + 1, y + 2, 20, 12, UI.night, 0.35);
      g.rect(x, y, 20, 12, n === 1 ? '#4A8AA0' : '#4E7A36');
      g.rect(x + 1, y + 1, 19, 10, on ? col : blendFlag(col));
      g.rect(x + 1, y + 1, 19, 1, '#FFFFFF');
      g.rect(x + 1, y + 9, 19, 2, n === 1 ? '#5FB0C8' : '#6FA04A');
      drawCircledNum(g, n, x + 3, y + 1, on ? UI.text : UI.pencil);
      // the page is open on this one: a 朱 tick by its number
      if (on && m.focus) g.rect(x + 1, y + 4, 1, 3, UI.accent);
    });
  }

  /**
   * The other notebook's cover is laid over the left page (0.11 s), rests
   * a moment and is opened like a page (0.23 s) onto the new index.
   */
  private drawCoverSwap(g: Gfx): void {
    const t = this.volT;
    if (t >= COVER_IN + COVER_HOLD + COVER_OPEN) return;
    const img = bookCover(this.vol, !!flag('flag_ch2_clear'), this.vol === 2 && hasEarTag());
    const x0 = SP.x + 5;
    const y0 = SP.y + 6;
    if (t < COVER_IN) {
      const k = ease.cubicOut(t / COVER_IN);
      g.img(img, x0 + Math.round((1 - k) * 18), y0 + Math.round((1 - k) * 4), { alpha: k });
      return;
    }
    if (t < COVER_IN + COVER_HOLD) {
      g.img(img, x0, y0);
      return;
    }
    // the cover turns over at its left edge: it narrows toward the binding
    const k = ease.quadIn((t - COVER_IN - COVER_HOLD) / COVER_OPEN);
    const w = Math.max(1, Math.round(img.width * (1 - k)));
    g.ctx.drawImage(img, x0, y0, w, img.height);
    // the underside of the turning cover catches a little light
    if (w > 2) g.alpha(0.25 * k, () => g.rect(x0 + w - 2, y0 + 1, 2, img.height - 4, '#FFFFFF'));
  }

  /**
   * The index: ふしぎ by their titles, あいて by name, ツッコミ by the line
   * itself — so no two rows read the same. A row that doesn't fit the
   * column wraps onto a second line (by phrase); places, names and the rest
   * are on the right page.
   */
  private rows(): Row[] {
    const v = this.v;
    const wrapRow = (label: string, done: boolean, num: string, color: string): Row => {
      const lines = done ? wrap(label, LABEL_W).slice(0, 2) : [''];
      return { lines, done, num, color };
    };
    const num = (i: number) => String(i + 1).padStart(2, '0');
    if (this.sec === 0) return v.fushigi.map((f, i) => wrapRow(f[0], v.done(i), num(i), UI.text));
    if (this.sec === 1) return v.enemies.map((id, i) => wrapRow(nameOf(id, v), !!flag('flag_book_' + id), num(i), UI.text));
    const seen = seenIn(v);
    const out: Row[] = [];
    for (let i = 0; i < this.count(); i++) {
      const e = seen[i];
      out.push(wrapRow(e ? e.line : '', !!e, num(i), UI.accent));
    }
    return out;
  }

  /** Keep the chosen row (all its lines) inside the 8 visible lines. */
  private fixScroll(rows: Row[]): void {
    const s = this.sec;
    const sel = this.sel[this.vol - 1][s];
    const scroll = this.scroll[this.vol - 1];
    if (sel < scroll[s]) scroll[s] = sel;
    const linesTo = (from: number, to: number) => rows.slice(from, to + 1).reduce((a, r) => a + r.lines.length, 0);
    while (scroll[s] < sel && linesTo(scroll[s], sel) > VISIBLE) scroll[s]++;
  }

  private drawList(g: Gfx, m: MenuCtx): void {
    const rows = this.rows();
    const s = this.sec;
    const scroll = this.scroll[this.vol - 1];
    const selIdx = this.sel[this.vol - 1][s];
    let line = 0;
    let k = scroll[s];
    for (; k < rows.length; k++) {
      const r = rows[k];
      if (line + r.lines.length > VISIBLE) break;
      const y = LIST_Y + line * ROW_H;
      const sel = k === selIdx;
      drawDigits(g, r.num, LP.x - 1, y + 5, { color: r.done ? UI.accent : UI.textDim });
      const lx = LP.x + 14;
      const mk = m.focus ? Math.min(1, this.moveT / 70) : 1;
      const mc = m.focus ? UI.marker : '#EFE4C6';
      if (r.done) {
        r.lines.forEach((l, j) => {
          // the second line is tucked in a little, like a note that ran on
          const x = lx + (j ? 8 : 0);
          if (sel) drawMarker(g, x - 2, y + j * ROW_H + 1, textW(l) + 4, 15, mk, mc);
          g.text(l, x, y + j * ROW_H, { color: r.color });
        });
      } else {
        if (sel) drawMarker(g, lx - 2, y + 1, 70, 15, mk, mc);
        dottedLine(g, lx, y + 12, lx + 64, UI.textDim, 3);
      }
      if (sel && m.focus) drawCursor(g, SP.x + 1, y, m.t);
      line += r.lines.length;
    }
    if (scroll[s] > 0) drawScroll(g, FOLD - 18, LIST_Y - 7, true, m.t);
    if (k < rows.length) drawScroll(g, FOLD - 18, LIST_Y + VISIBLE * ROW_H + 2, false, m.t);
  }

  private drawDetail(g: Gfx, m: MenuCtx): void {
    const v = this.v;
    const s = this.sec;
    const i = this.sel[this.vol - 1][s];
    const x = RP.x;
    let y = SP.y + 28;
    const w = RP.w;
    const empty = () => {
      dottedLine(g, x, y + 14, x + w - 8, UI.textDim, 3);
      dottedLine(g, x, y + 32, x + w - 40, UI.textDim, 3);
      g.text('まだ 書いていない。', x, y + 44, { color: UI.textDim });
    };
    if (s === 0) {
      if (!v.done(i)) return empty();
      const [title, place] = v.fushigi[i];
      const tl = wrap(title, w);
      tl.forEach((l, j) => g.text(l, x, y + j * 17, { color: UI.text }));
      y += tl.length * 17 + 1;
      pencilLine(g, x, y, w - 6, 1, UI.pencil, i);
      y += 4;
      // a map pin and the place
      g.rect(x + 1, y + 5, 3, 3, UI.accent);
      g.px(x + 2, y + 8, UI.accentDark);
      // long place names wrap (with tightened spacing) instead of running off the page
      const pl = fitWrap(place, w - 8).slice(0, 2);
      pl.forEach((l, j) => g.text(l.text, x + 7, y + j * 16, { color: UI.pencil, spacing: l.spacing }));
      const placeY = y;
      y += 6 + pl.length * 16;
      // the whole stamped text; the 「みました」 seal goes under its last line,
      // or — when the text fills the page — beside the place line, so it
      // never lands on the text and nothing is cut
      const seal = ovalStamp('みました', 36, 22, 0.1, i + 3 + (v.n - 1) * 20);
      const body = fitWrap(v.pressed(i), w);
      const bottom = SP.y + SP.h - 10;
      const sealX = SP.x + SP.w - 12 - seal.width;
      const below = body.length * 17 + 2 + seal.height <= bottom - y;
      const placeRight = x + 7 + Math.max(...pl.map((l) => textW(l.text)));
      const lineH = below ? 17 : Math.max(15, Math.min(17, Math.floor((bottom - y) / Math.max(1, body.length))));
      body.slice(0, Math.floor((bottom - y) / lineH)).forEach((l, j) => g.text(l.text, x, y + j * lineH, { color: UI.text, spacing: l.spacing }));
      if (below) g.img(seal, sealX, y + body.length * 17 + 2);
      else g.img(seal, sealX, placeRight + 6 <= sealX ? placeY - 4 : SP.y + 6);
      return;
    }
    if (s === 1) {
      const id = v.enemies[i];
      if (!flag('flag_book_' + id)) return empty();
      const e = v.n === 1 ? getEnemy(id) : null;
      const bt = v.n === 1 ? (e ? { name: e.name, shotai: e.book.shotai, hitokoto: e.book.hitokoto, tsukkomi: e.tsukkomi } : null) : textOf(id);
      if (!bt) return;
      // the field look and the 「思いだした姿」 side by side
      // (チョトツ has none: it went back to the woods — its back and its hoofprints, 52 13.2)
      const boar = id === 'enemy_chototsu';
      const a = sprite(id, m.t);
      const b = boar ? null : sprite('restored_' + id, m.t);
      const by = y + 44;
      if (a) g.img(a, x + 18 - Math.round(a.width / 2), by - a.height);
      if (a && (b || boar)) {
        // pencil arrow
        for (let k = 0; k < 14; k++) g.px(x + 40 + k, by - 10, UI.pencil);
        g.px(x + 52, by - 11, UI.pencil);
        g.px(x + 52, by - 9, UI.pencil);
        g.px(x + 51, by - 12, UI.pencil);
        g.px(x + 51, by - 8, UI.pencil);
      }
      if (b) g.img(b, x + 76 - Math.round(b.width / 2), by - b.height);
      else if (boar) drawBoarGoingHome(g, x + 60, by, m.t);
      g.rect(x, by + 1, w - 6, 1, UI.bg2);
      // 正体 in ink, ひとこと in pencil (the name itself is the index entry)
      y = by + 5;
      const body = wrap(bt.shotai, w + 2);
      body.slice(0, 3).forEach((l, j) => g.text(l, x, y + j * 17, { color: UI.text }));
      y += Math.min(3, body.length) * 17 + 3;
      const hk = wrap(bt.hitokoto, w - 4);
      hk.slice(0, 3).forEach((l, j) => g.text(l, x + 4, y + j * 17, { color: UI.pencil }));
      // tsukkomi seen for this one
      let seen = 0;
      const tl = linesOf(id, v);
      for (let n = 1; n <= tl.length; n++) if (flag(`flag_tsukkomi_${id}_${n}`)) seen++;
      // on the page's top line, clear of the pictures
      const cs = `${seen}/${tl.length}`;
      const cx = SP.x + SP.w - 12 - digitsWidth(cs);
      drawDigits(g, cs, SP.x + SP.w - 12, SP.y + 12, { color: UI.accent, align: 'right' });
      g.text('ツッコミ', cx - 4 - textW('ツッコミ'), SP.y + 7, { color: UI.pencil });
      return;
    }
    const seen = seenIn(v);
    const ent = seen[i];
    if (!ent) return empty();
    // the line in the battle's 書き文字 lettering, wrapped by phrase
    const parts = ent.line.split(' ');
    const lines: string[] = [];
    let cur = '';
    for (const p of parts) {
      const cand = cur ? cur + ' ' + p : p;
      if (textW(cand) + 8 > w && cur) {
        lines.push(cur);
        cur = p;
      } else cur = cand;
    }
    if (cur) lines.push(cur);
    lines.forEach((l, j) => {
      const img = kakimojiSmall(l);
      g.img(img, x - 3, y + 6 + j * 24);
    });
    y += 12 + lines.length * 24;
    // 「―― ハト係長」: the name set to the right, a pencil dash leading to it
    const name = nameOf(ent.enemy, v);
    const nx = x + w - 4 - textW(name);
    g.text(name, nx, y, { color: UI.pencil });
    const dw = Math.min(24, nx - 6 - (x + 8));
    if (dw >= 8) g.rect(nx - 6 - dw, y + 8, dw, 1, UI.pencil);
    const sp = sprite(ent.enemy, m.t);
    if (sp) g.img(sp, x + w - 24 - Math.round(sp.width / 2), SP.y + SP.h - 30 - sp.height);
  }
}

function nameOf(id: string, v: Volume): string {
  if (v.n === 1) return getEnemy(id)?.name ?? id;
  return textOf(id)?.name ?? id;
}

function blendFlag(col: string): string {
  return col === VOL1.flag ? '#B8DDE6' : '#C3D9AE';
}

/** ① / ② in 5×7 pixels inside a 9×9 ring. */
export function drawCircledNum(g: Gfx, n: 1 | 2, x: number, y: number, color: string): void {
  const ring = ['..xxxxx..', '.x.....x.', 'x.......x', 'x.......x', 'x.......x', 'x.......x', 'x.......x', '.x.....x.', '..xxxxx..'];
  const one = ['.x.', 'xx.', '.x.', '.x.', 'xxx'];
  const two = ['xx.', '..x', '.x.', 'x..', 'xxx'];
  ring.forEach((r, j) => [...r].forEach((c, i) => c === 'x' && g.px(x + i, y + j, color)));
  (n === 1 ? one : two).forEach((r, j) => [...r].forEach((c, i) => c === 'x' && g.px(x + 3 + i, y + 2 + j, color)));
}

function chevron(g: Gfx, x: number, y: number, dir: number): void {
  for (let i = 0; i < 4; i++) {
    g.px(x + (dir > 0 ? i : -i), y + i, UI.bg);
    g.px(x + (dir > 0 ? i : -i), y + 6 - i, UI.bg);
    g.px(x + (dir > 0 ? i : -i) + dir, y + i, UI.border);
    g.px(x + (dir > 0 ? i : -i) + dir, y + 6 - i, UI.border);
  }
}

let boarC: HTMLCanvasElement | null = null;
/**
 * チョトツ has no 「思いだした姿」: it went back to the woods. Its back view
 * (16×10, #5A3A22, the tail and the hind legs) heading up the page, and
 * three split-hoof prints leading to it.
 */
function boarBack(): HTMLCanvasElement {
  if (boarC) return boarC;
  const rows = ['....oooooo......', '..oooOOOOooo....', '.ooOOOOOOOOoo...', 'ooOOOOOOOOOOoo..', 'oOOOOOOOOOOOOo..', 'oOOOOOOOOOOOOoo.', '.oOOOOOOOOOOOo.t', '..oOO....OOo...t', '..oO......Oo....', '..oo......oo....'];
  const [c, ctx] = makeCanvas(16, 10);
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === 'O' ? '#5A3A22' : ch === 't' ? '#3A2616' : '#3A2616';
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  // bristles along the back catch a little light
  ctx.fillStyle = '#7A5638';
  for (const x of [5, 7, 9]) ctx.fillRect(x, 1, 1, 1);
  boarC = c;
  return c;
}

function drawBoarGoingHome(g: Gfx, x: number, by: number, t: number): void {
  // hoofprints (two little ovals each) climbing toward the boar
  const prints: [number, number][] = [
    [x - 6, by - 3],
    [x + 2, by - 9],
    [x + 8, by - 15],
  ];
  prints.forEach(([px, py], i) => {
    const a = 0.5 + 0.15 * i;
    g.alpha(a, () => {
      g.rect(px, py, 1, 2, '#5A3A22');
      g.rect(px + 2, py, 1, 2, '#5A3A22');
      g.px(px + 1, py + 2, '#8A6A4A');
    });
  });
  const bob = Math.floor(t / 400) % 2;
  g.img(boarBack(), x + 10, by - 34 - bob);
  // the edge of the woods it goes into
  for (let i = 0; i < 26; i++) {
    const h = 4 + Math.round(hash2(i, 1, 9) * 5);
    g.rect(x + 2 + i, by - 38 - h, 1, h, i % 3 ? '#3F6B4A' : '#2E5A3C');
  }
}

function sprite(id: string, t: number): HTMLCanvasElement | null {
  if (!hasChar(id)) return null;
  const s = charSprite(id);
  return idleFrame(s, 'down', t);
}
