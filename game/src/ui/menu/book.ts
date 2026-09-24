// みました帳 (30_level_art 10.7, 10_narrative 12.3 / 13): the 自由研究 notebook
// with three sections — ふしぎ (12), あいて (7) and ツッコミ (19). The left
// page is the index (unrecorded rows are a dotted 「…………」), the right page
// shows the chosen entry. ←→ turns the section, ↑↓ moves in the index.

import type { Gfx } from '../../engine/gfx';
import type { Input } from '../../engine/input';
import { flag, state } from '../../game/state';
import { getEnemy } from '../../data/battle';
import { sfx } from '../../audio';
import { charSprite, hasChar, idleFrame } from '../../art/chars';
import { kakimojiSmall, ovalStamp } from '../../battle/art/stamps';
import { getFushigi } from '../../world/fushigi';
import { digitsWidth, drawDigits } from '../digits';
import { drawCursor, drawMarker, dottedLine, drawTape, fitWrap, pencilLine, phraseWrap as wrap, textW, UI } from '../window';
import { drawHeader, drawScroll, FOLD, LP, RP, SP } from './notebook';
import type { MenuCtx, MenuPage } from './types';

// ---- data -----------------------------------------------------------------------------

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

export function fushigiDoneN(i: number): boolean {
  return flag(`flag_fushigi_${String(i + 1).padStart(2, '0')}`) > 0;
}

/** First page of the stamped text: from the ふしぎ definition when the world has it. */
export function pressedText(i: number): string {
  const id = `fushigi_${String(i + 1).padStart(2, '0')}`;
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
  return FUSHIGI_BOOK[i][2];
}

export interface TsukkomiEntry {
  enemy: string;
  n: number;
  line: string;
}

/** Seen ツッコミ lines in the order they were first seen (flag insertion order). */
export function seenTsukkomi(): TsukkomiEntry[] {
  const out: TsukkomiEntry[] = [];
  for (const k of Object.keys(state.flags)) {
    if (!k.startsWith('flag_tsukkomi_') || !state.flags[k]) continue;
    const m = /^flag_tsukkomi_(.+)_(\d+)$/.exec(k);
    if (!m) continue;
    const e = getEnemy(m[1]);
    const n = Number(m[2]);
    const line = e?.tsukkomi[n - 1];
    if (!e || !line || !TSUKKOMI_ENEMIES.includes(e.id)) continue;
    out.push({ enemy: e.id, n, line });
  }
  return out;
}

export function tsukkomiTotal(): number {
  let n = 0;
  for (const id of TSUKKOMI_ENEMIES) n += getEnemy(id)?.tsukkomi.length ?? 0;
  return n || 19;
}

export function bookCounts(): { fushigi: number; aite: number; tsukkomi: number } {
  let f = 0;
  for (let i = 0; i < 12; i++) if (fushigiDoneN(i)) f++;
  const a = BOOK_ENEMIES.filter((id) => flag('flag_book_' + id)).length;
  return { fushigi: f, aite: a, tsukkomi: seenTsukkomi().length };
}

// ---- page ------------------------------------------------------------------------------

const SECTIONS = ['ふしぎ', 'あいて', 'ツッコミ'];
/** Lines of the index on the left page. */
const VISIBLE = 8;
/** Width of an index label (to just short of the fold). */
const LABEL_W = FOLD - 4 - (LP.x + 14);

interface Row {
  lines: string[];
  done: boolean;
  num: string;
  color: string;
}
const ROW_H = 18;
const LIST_Y = SP.y + 30;

export class BookPage implements MenuPage {
  private sec = 0;
  private sel = [0, 0, 0];
  private scroll = [0, 0, 0];
  private moveT = 999;
  private secT = 999;

  enter(): boolean {
    return true;
  }

  private count(): number {
    return this.sec === 0 ? 12 : this.sec === 1 ? BOOK_ENEMIES.length : tsukkomiTotal();
  }

  update(_m: MenuCtx, dt: number, input: Input): boolean {
    this.moveT += dt;
    this.secT += dt;
    if (input.repeat('right')) this.turn(1);
    else if (input.repeat('left')) this.turn(-1);
    const n = this.count();
    const s = this.sec;
    if (input.repeat('down')) this.move(1, n);
    else if (input.repeat('up')) this.move(-1, n);
    this.fixScroll(this.rows());
    if (input.pressed('cancel')) {
      sfx('se_cancel');
      return false;
    }
    return true;
  }

  private turn(d: number): void {
    this.sec = (this.sec + d + 3) % 3;
    this.secT = 0;
    sfx('se_page');
  }

  private move(d: number, n: number): void {
    const s = this.sec;
    this.sel[s] = (this.sel[s] + d + n) % n;
    this.moveT = 0;
    sfx('se_cursor');
  }

  draw(g: Gfx, m: MenuCtx): void {
    drawHeader(g, 'みました帳', LP.x, SP.y + 6, '#7FD1E8', 1, 9);
    const c = bookCounts();
    const have = this.sec === 0 ? c.fushigi : this.sec === 1 ? c.aite : c.tsukkomi;
    drawDigits(g, `${have}/${this.count()}`, FOLD - 12, SP.y + 12, { color: UI.pencil, align: 'right' });
    const k = Math.min(1, this.secT / 120);
    g.alpha(k, () => {
      this.drawList(g, m);
      this.drawDetail(g, m);
    });
  }

  drawBehind(g: Gfx, m: MenuCtx): void {
    // section tabs sticking out of the notebook's top edge
    let tx = SP.x + 80;
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
      drawTape(g, tx, y, w, 20, '', { color: sel ? '#BDEFFA' : '#D8CBA8', seed: 20 + i });
      g.text(name, tx + 7, y + 1, { color: sel ? UI.text : UI.pencil });
      if (sel && m.focus) {
        g.rect(tx + 2, y + 17, w - 4, 1, UI.accent);
      }
      tx += w + 2;
    });
  }

  /**
   * The index: ふしぎ by their titles (13.1), あいて by name, ツッコミ by the
   * line itself — so no two rows read the same. A row that doesn't fit the
   * column wraps onto a second line (by phrase); places, names and the rest
   * are on the right page.
   */
  private rows(): Row[] {
    const wrapRow = (label: string, done: boolean, num: string, color: string): Row => {
      const lines = done ? wrap(label, LABEL_W).slice(0, 2) : [''];
      return { lines, done, num, color };
    };
    const num = (i: number) => String(i + 1).padStart(2, '0');
    if (this.sec === 0) return FUSHIGI_BOOK.map((f, i) => wrapRow(f[0], fushigiDoneN(i), num(i), UI.text));
    if (this.sec === 1) return BOOK_ENEMIES.map((id, i) => wrapRow(getEnemy(id)?.name ?? id, !!flag('flag_book_' + id), num(i), UI.text));
    const seen = seenTsukkomi();
    const out: Row[] = [];
    for (let i = 0; i < tsukkomiTotal(); i++) {
      const e = seen[i];
      out.push(wrapRow(e ? e.line : '', !!e, num(i), UI.accent));
    }
    return out;
  }

  /** Keep the chosen row (all its lines) inside the 8 visible lines. */
  private fixScroll(rows: Row[]): void {
    const s = this.sec;
    const sel = this.sel[s];
    if (sel < this.scroll[s]) this.scroll[s] = sel;
    const linesTo = (from: number, to: number) => rows.slice(from, to + 1).reduce((a, r) => a + r.lines.length, 0);
    while (this.scroll[s] < sel && linesTo(this.scroll[s], sel) > VISIBLE) this.scroll[s]++;
  }

  private drawList(g: Gfx, m: MenuCtx): void {
    const rows = this.rows();
    const s = this.sec;
    let line = 0;
    let k = this.scroll[s];
    for (; k < rows.length; k++) {
      const r = rows[k];
      if (line + r.lines.length > VISIBLE) break;
      const y = LIST_Y + line * ROW_H;
      const sel = k === this.sel[s];
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
    if (this.scroll[s] > 0) drawScroll(g, FOLD - 18, LIST_Y - 7, true, m.t);
    if (k < rows.length) drawScroll(g, FOLD - 18, LIST_Y + VISIBLE * ROW_H + 2, false, m.t);
  }

  private drawDetail(g: Gfx, m: MenuCtx): void {
    const s = this.sec;
    const i = this.sel[s];
    const x = RP.x;
    let y = SP.y + 28;
    const w = RP.w;
    const empty = () => {
      dottedLine(g, x, y + 14, x + w - 8, UI.textDim, 3);
      dottedLine(g, x, y + 32, x + w - 40, UI.textDim, 3);
      g.text('まだ 書いていない。', x, y + 44, { color: UI.textDim });
    };
    if (s === 0) {
      if (!fushigiDoneN(i)) return empty();
      const [title, place] = FUSHIGI_BOOK[i];
      const tl = wrap(title, w);
      tl.forEach((l, j) => g.text(l, x, y + j * 17, { color: UI.text }));
      y += tl.length * 17 + 1;
      pencilLine(g, x, y, w - 6, 1, UI.pencil, i);
      y += 4;
      // a map pin and the place
      g.rect(x + 1, y + 5, 3, 3, UI.accent);
      g.px(x + 2, y + 8, UI.accentDark);
      g.text(place, x + 7, y, { color: UI.pencil });
      y += 22;
      const body = fitWrap(pressedText(i), w);
      body.slice(0, 4).forEach((l, j) => g.text(l.text, x, y + j * 17, { color: UI.text, spacing: l.spacing }));
      // the 「みました」 seal on the corner of the page
      const seal = ovalStamp('みました', 36, 22, 0.1, i + 3);
      g.img(seal, SP.x + SP.w - 12 - seal.width, SP.y + SP.h - 48);
      return;
    }
    if (s === 1) {
      const id = BOOK_ENEMIES[i];
      if (!flag('flag_book_' + id)) return empty();
      const e = getEnemy(id);
      if (!e) return;
      // the field look and the 「思いだした姿」 side by side
      const a = sprite(id, m.t);
      const b = sprite('restored_' + id, m.t);
      const by = y + 44;
      if (a) g.img(a, x + 18 - Math.round(a.width / 2), by - a.height);
      // pencil arrow
      for (let k = 0; k < 14; k++) g.px(x + 40 + k, by - 10, UI.pencil);
      g.px(x + 52, by - 11, UI.pencil);
      g.px(x + 52, by - 9, UI.pencil);
      g.px(x + 51, by - 12, UI.pencil);
      g.px(x + 51, by - 8, UI.pencil);
      if (b) g.img(b, x + 76 - Math.round(b.width / 2), by - b.height);
      g.rect(x, by + 1, w - 6, 1, UI.bg2);
      // 正体 in ink, ひとこと in pencil (the name itself is the index entry)
      y = by + 5;
      const body = wrap(e.book.shotai, w + 2);
      body.slice(0, 3).forEach((l, j) => g.text(l, x, y + j * 17, { color: UI.text }));
      y += Math.min(3, body.length) * 17 + 3;
      const hk = wrap(e.book.hitokoto, w - 4);
      hk.slice(0, 3).forEach((l, j) => g.text(l, x + 4, y + j * 17, { color: UI.pencil }));
      // tsukkomi seen for this one
      let seen = 0;
      for (let n = 1; n <= e.tsukkomi.length; n++) if (flag(`flag_tsukkomi_${id}_${n}`)) seen++;
      // on the page's top line, clear of the pictures
      const cs = `${seen}/${e.tsukkomi.length}`;
      const cx = SP.x + SP.w - 12 - digitsWidth(cs);
      drawDigits(g, cs, SP.x + SP.w - 12, SP.y + 12, { color: UI.accent, align: 'right' });
      g.text('ツッコミ', cx - 4 - textW('ツッコミ'), SP.y + 7, { color: UI.pencil });
      return;
    }
    const seen = seenTsukkomi();
    const ent = seen[i];
    if (!ent) return empty();
    const e = getEnemy(ent.enemy);
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
    const name = e?.name ?? '';
    const nx = x + w - 4 - textW(name);
    g.text(name, nx, y, { color: UI.pencil });
    const dw = Math.min(24, nx - 6 - (x + 8));
    if (dw >= 8) g.rect(nx - 6 - dw, y + 8, dw, 1, UI.pencil);
    const sp = sprite(ent.enemy, m.t);
    if (sp) g.img(sp, x + w - 24 - Math.round(sp.width / 2), SP.y + SP.h - 30 - sp.height);
  }
}

function chevron(g: Gfx, x: number, y: number, dir: number): void {
  for (let i = 0; i < 4; i++) {
    g.px(x + (dir > 0 ? i : -i), y + i, UI.bg);
    g.px(x + (dir > 0 ? i : -i), y + 6 - i, UI.bg);
    g.px(x + (dir > 0 ? i : -i) + dir, y + i, UI.border);
    g.px(x + (dir > 0 ? i : -i) + dir, y + 6 - i, UI.border);
  }
}

function sprite(id: string, t: number): HTMLCanvasElement | null {
  if (!hasChar(id)) return null;
  const s = charSprite(id);
  return idleFrame(s, 'down', t);
}
