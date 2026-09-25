// Message box + choice window, driven from coroutines (contract: ARCHITECTURE.md):
//
//   yield* say('こんにちは！{w=300}\nいい天気ですね。', { name: 'おばあ', voice: 'obaa' });
//   yield* say(['1ページ目', '2ページ目']);
//   const i = yield* choose(['はい', 'いいえ']);
//   const j = yield* ask('ソースは？', ['べつ', 'いっしょ'], { name: '母', voice: 'mother' });
//
// Inline markup:  {w=300} / {w} pause · {spd=0.5} typing speed · {c=#E23B2E}…{/c} colour
//                 {shake}…{/shake} trembling · {wave}…{/wave} wavy · \n line break
// A page holds 3 lines × 336px; longer text pages automatically.
//
// Look (30_level_art 10.4): graph-paper window (8,148) 368×64 with the red
// margin line, a masking-tape name tag, a little vermilion hanko as the
// "next" mark. Speakers pick a style: normal, narr (地の文), sys (システム:
// #4A3A6E, item names in 朱), flip (カネナリくんのフリップ: plain white
// board, marker-bold letters, a mini board in the corner, pen squeak) and
// inner (ミナトの心の声: pencil, no tag, no blips).
//
// One dialog box persists across consecutive say()/choose() calls of a
// script, so a conversation doesn't blink closed between speakers, and a
// question stays on screen while its choices are open.

import type { Co } from '../engine/co';
import { charWidth, drawGlyph, LINE_H } from '../engine/font';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import type { Input } from '../engine/input';
import { H, W } from '../engine/screen';
import { makeCanvas } from '../engine/pixel';
import { ease } from '../engine/tween';
import { sfx, textBlip, textFastForward } from '../audio';
import { flipBoardMini, flipIcon } from '../art/chars';
import { allItems, getSkill } from '../data/battle';
import { textSpeedMul } from './settings';
import { cursorImg, drawCursor, drawMarker, drawWindow, phraseWrap, tapeImg, textW, UI } from './window';

export type DialogStyle = 'normal' | 'narr' | 'sys' | 'flip' | 'inner';

export interface SayOpts {
  name?: string;
  voice?: string;
  /** Box position. */
  pos?: 'bottom' | 'top';
  /** Chars per second (default 40, scaled by the 文字の はやさ setting). */
  cps?: number;
  /** Auto-advance after the page is complete (ms), no key needed. */
  auto?: number;
  /** Style override (otherwise derived from voice / name). */
  style?: DialogStyle;
}

export interface ChooseOpts {
  /** Index returned when the player cancels (no cancel if omitted). */
  cancel?: number;
  x?: number;
  y?: number;
  /** Options that are shown greyed out and can't be picked. */
  disabled?: (number | boolean)[];
  /** Initial cursor position. */
  index?: number;
}

interface Glyph {
  ch: string;
  x: number;
  y: number;
  color: string;
  fx: '' | 'shake' | 'wave';
  /** Pause (ms) to apply after this glyph appears. */
  pause: number;
  speed: number;
}

/** Dialog window geometry (30_level_art 10.4). */
export const BOX = { x: 8, w: W - 16, h: 64, padX: 18, padY: 8, y: H - 68, textX: 26 };
const LINES_PER_PAGE = 3;
const TEXT_W = 336;
const OPEN_MS = 120;
const CLOSE_MS = 90;

// ---- markup ---------------------------------------------------------------------

/** Strip markup to measure / wrap. Returns plain text and a list of tokens. */
function parse(text: string): { plain: string; marks: { at: number; tag: string }[] } {
  const marks: { at: number; tag: string }[] = [];
  let plain = '';
  const re = /\{([^}]*)\}/g;
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    plain += text.slice(last, m.index);
    marks.push({ at: [...plain].length, tag: m[1].trim() });
    last = m.index + m[0].length;
  }
  plain += text.slice(last);
  return { plain, marks };
}

/** Lay out one message into pages of positioned glyphs. */
export function layoutPages(text: string, maxW = TEXT_W, baseColor: string = UI.text): Glyph[][] {
  const { plain, marks } = parse(text);
  // 分かち書き text breaks between phrases; lines already short enough stay as written
  const lines = phraseWrap(plain, maxW);
  const chars = [...plain];
  const pages: Glyph[][] = [];
  let color = baseColor;
  let fx: Glyph['fx'] = '';
  let speed = 1;
  let ci = 0;
  let mi = 0;
  const applyMarks = (glyphs: Glyph[]) => {
    while (mi < marks.length && marks[mi].at <= ci) {
      const t = marks[mi].tag;
      if (t === 'w' || t.startsWith('w=')) {
        const last = glyphs[glyphs.length - 1];
        const ms = t === 'w' ? 300 : parseInt(t.slice(2), 10) || 0;
        if (last) last.pause += ms;
        else pendingPause += ms;
      } else if (t.startsWith('c=')) color = t.slice(2);
      else if (t === '/c') color = baseColor;
      else if (t === 'shake' || t === 'wave') fx = t;
      else if (t === '/shake' || t === '/wave') fx = '';
      else if (t.startsWith('spd=')) speed = parseFloat(t.slice(4)) || 1;
      else if (t === '/spd') speed = 1;
      mi++;
    }
  };
  let pendingPause = 0;
  let page: Glyph[] = [];
  let lineInPage = 0;
  for (const line of lines) {
    if (lineInPage === LINES_PER_PAGE) {
      pages.push(page);
      page = [];
      lineInPage = 0;
    }
    let x = 0;
    for (const ch of line) {
      // skip characters that wrap() dropped (spaces at wrap points)
      while (ci < chars.length && chars[ci] !== ch) {
        applyMarks(page);
        ci++;
      }
      applyMarks(page);
      page.push({ ch, x, y: lineInPage * LINE_H, color, fx, pause: 0, speed });
      if (pendingPause) {
        // a pause before the first glyph of a page becomes a lead-in on it
        page[page.length - 1].pause = 0;
        (page as Glyph[] & { lead?: number }).lead = pendingPause;
        pendingPause = 0;
      }
      x += charWidth(ch);
      ci++;
    }
    applyMarks(page);
    if (chars[ci] === '\n') ci++;
    lineInPage++;
  }
  applyMarks(page);
  pages.push(page);
  return pages.filter((p, i) => p.length > 0 || i === 0);
}

// ---- styles -------------------------------------------------------------------------

const NAMELESS_VOICES = new Set(['narr', 'sys', 'none']);
/**
 * ムジン販売員 talks with a cardboard sign on a split chopstick, the way
 * Kanenari-kun talks with his flip board (50_ch2_story 6.5, 52 13.6).
 */
const CARD_VOICE = 'h_mujin';

export function styleFor(o: SayOpts): DialogStyle {
  if (o.style) return o.style;
  const v = o.voice ?? '';
  if (v === 'flip' || v === 'npc_kanenari' || v === 'kanenari' || v === CARD_VOICE) return 'flip';
  if (v === 'sys' || v === 'system') return 'sys';
  if (v === 'narr' || v === 'narration') return 'narr';
  if (v === 'minato' || v === 'inner' || ((o.name === 'minato' || o.name === 'ミナト') && !v)) return 'inner';
  return 'normal';
}

function textColor(s: DialogStyle): string {
  return s === 'sys' ? UI.sys : s === 'inner' ? UI.pencil : UI.text;
}

let itemRes: RegExp[] | null = null;
/**
 * System lines: item names (and 『hanko』 names) are written in 朱 (10.4).
 * Spans the script already coloured ({c=…}…{/c}) are left as written; the
 * rest of the line is still marked (「ハンコケースを 受けとった！」 above a
 * line whose hanko names were coloured by hand).
 */
function markSys(text: string): string {
  return text
    .split(/(\{c=[^}]*\}[\s\S]*?\{\/c\})/)
    .map((seg, i) => (i % 2 ? seg : markPlain(seg)))
    .join('');
}

function markPlain(text: string): string {
  if (!text) return text;
  if (!itemRes) {
    // the text is 分かち書き: 「揚げたて コロッケ」 must match 「揚げたてコロッケ」
    const names = allItems()
      .map((i) => i.name)
      .sort((a, b) => b.length - a.length);
    itemRes = names.map((n) => new RegExp([...n].map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(' ?'), 'g'));
  }
  let out = text;
  for (const re of itemRes) out = out.replace(re, (m) => (m.includes('\u0001') ? m : `\u0001${m}\u0002`));
  out = out.replace(/『([^』]{1,12})』/g, (m, inner: string) => (getSkillByName(inner) ? `『\u0001${inner}\u0002』` : m));
  // nested marks (a short name inside a longer one) collapse to the outer one
  out = out.replace(/\u0001([^\u0002]*)\u0001([^\u0002]*)\u0002/g, '\u0001$1$2');
  return out.replace(/\u0001/g, `{c=${UI.accent}}`).replace(/\u0002/g, '{/c}');
}

const SKILL_NAMES = ['みました', 'ペケ', 'はなまる', 'やりなおし', 'おかえりなさい', 'おやすみなさい'];
function getSkillByName(n: string): boolean {
  return SKILL_NAMES.includes(n) || !!getSkill('skill_' + n);
}

// ---- requests --------------------------------------------------------------------------

type Page = Glyph[] & { lead?: number };

interface Request {
  pages: Page[];
  o: SayOpts;
  style: DialogStyle;
  done: boolean;
  /** ask(): show the choice as soon as the last page is typed. */
  ask?: { options: string[]; o: ChooseOpts; result: number };
}

function buildRequest(text: string | string[], o: SayOpts): Request {
  const style = styleFor(o);
  const col = textColor(style);
  const src = Array.isArray(text) ? text : [text];
  const pages: Page[] = [];
  for (const t of src) {
    const tt = style === 'sys' ? markSys(t) : t;
    pages.push(...(layoutPages(tt, TEXT_W, col) as Page[]));
  }
  return { pages, o, style, done: false };
}

// ---- the dialog box ----------------------------------------------------------------------

class DialogBox implements Widget {
  done = false;
  queue: Request[] = [];
  cur: Request | null = null;
  /** Choice window attached to this box (stays open while it's up). */
  choice: ChoiceBox | null = null;
  private page = 0;
  private shown = 0;
  private acc = 0;
  private pauseLeft = 0;
  private pageT = 0;
  private autoLeft = -1;
  private t = 0;
  /** 0..1 open amount. */
  openK = 0;
  private closing = false;
  private idle = 0;
  // what's on screen (kept while lingering)
  private viewStyle: DialogStyle = 'normal';
  private viewName = '';
  private viewPos: 'bottom' | 'top' = 'bottom';
  /** The flip is ムジン販売員's cardboard sign. */
  private viewCard = false;
  private tagT = 999;
  private prevName = '';
  private styleT = 999;
  private pressT = -1;
  private ffwd = false;
  private skipped = false;

  get modal(): boolean {
    return !!this.cur && !this.done;
  }

  get visible(): boolean {
    return !this.done && this.openK > 0;
  }

  /** Top of the window on screen. */
  get top(): number {
    return this.viewPos === 'top' ? 8 : BOX.y;
  }

  enqueue(r: Request): void {
    this.queue.push(r);
    if (this.closing) this.closing = false;
    this.idle = 0;
  }

  private start(r: Request): void {
    this.cur = r;
    this.page = 0;
    this.resetPage();
    const card = r.style === 'flip' && r.o.voice === CARD_VOICE;
    const name = r.style === 'flip' ? r.o.name ?? (card ? 'ムジン販売員' : 'カネナリくん') : NAMELESS_VOICES.has(r.o.voice ?? '') || r.style === 'inner' ? '' : r.o.name ?? '';
    if (card !== this.viewCard && r.style === 'flip') this.styleT = 0;
    this.viewCard = card;
    if (name !== this.viewName) {
      this.prevName = this.viewName;
      this.tagT = this.openK > 0.5 ? 0 : 999;
    }
    if (r.style !== this.viewStyle || (r.style === 'flip' && this.openK < 0.5)) this.styleT = r.style === 'flip' || this.openK > 0.5 ? 0 : 999;
    this.viewName = name;
    this.viewStyle = r.style;
    this.viewPos = r.o.pos ?? 'bottom';
  }

  private resetPage(): void {
    this.shown = 0;
    this.acc = 0;
    this.pageT = 0;
    this.autoLeft = -1;
    this.skipped = false;
    const pg = this.glyphs as Page;
    this.pauseLeft = pg.lead ?? 0;
  }

  private get glyphs(): Glyph[] {
    return this.cur?.pages[this.page] ?? [];
  }

  private get pageDone(): boolean {
    return this.shown >= this.glyphs.length;
  }

  private get lastPage(): boolean {
    return !!this.cur && this.page >= this.cur.pages.length - 1;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    this.tagT += dt;
    this.styleT += dt;
    if (this.pressT >= 0) this.pressT += dt;
    if (!this.cur && this.queue.length) this.start(this.queue.shift()!);
    if (!this.cur) {
      if (this.choice && !this.choice.done) {
        this.idle = 0;
        return;
      }
      this.choice = null;
      this.idle++;
      if (this.idle >= 2) this.closing = true;
      if (this.closing) {
        this.openK -= dt / CLOSE_MS;
        if (this.openK <= 0) {
          this.openK = 0;
          this.done = true;
          if (box === this) box = null;
        }
      }
      return;
    }
    this.closing = false;
    this.idle = 0;
    this.openK = Math.min(1, this.openK + dt / OPEN_MS);
    // text starts while the window is still settling (first 60 ms)
    if (this.openK < 0.5) return;
    this.pageT += dt;
    this.ffwd = input.down('cancel') && this.pageT > 120;
    const r = this.cur;
    if (!this.pageDone) {
      const cps = (r.o.cps ?? 40) * textSpeedMul() * (this.ffwd ? 4 : 1);
      if (this.pauseLeft > 0) this.pauseLeft -= dt * (this.ffwd ? 3 : 1);
      else {
        this.acc += (dt / 1000) * cps * (this.glyphs[this.shown]?.speed ?? 1);
        while (this.acc >= 1 && !this.pageDone) {
          this.acc -= 1;
          const gl = this.glyphs[this.shown++];
          if (r.style !== 'inner') textBlip(r.o.voice ?? 'default', gl.ch);
          if (gl.pause) {
            this.pauseLeft = gl.pause;
            this.acc = 0;
            break;
          }
          if ('。！？!?'.includes(gl.ch) && this.shown < this.glyphs.length) {
            this.pauseLeft = 110;
            this.acc = 0;
            break;
          }
          if ('、…'.includes(gl.ch) && this.shown < this.glyphs.length && this.glyphs[this.shown].ch !== '…') {
            this.pauseLeft = 45;
            this.acc = 0;
            break;
          }
        }
      }
      // 決定: show the whole page at once (one soft page sound, no more blips)
      if (input.pressed('confirm') && this.pageT > 60) {
        this.shown = this.glyphs.length;
        this.pauseLeft = 0;
        if (!this.skipped) textFastForward();
        this.skipped = true;
      }
      if (this.pageDone) this.onPageDone();
      return;
    }
    if (r.ask && this.lastPage) {
      // the choice window is in charge (an empty last page gets it too)
      if (!this.choice) this.onPageDone();
      return;
    }
    if (this.autoLeft >= 0) {
      this.autoLeft -= dt;
      if (this.autoLeft <= 0) this.advance();
      return;
    }
    if (this.ffwd && this.pageT > 0) {
      this.autoLeft = 110;
      return;
    }
    if (input.pressed('confirm') || input.pressed('cancel')) {
      sfx('se_cursor', { pitch: 0.8, vol: 0.8 });
      this.pressT = 0;
      this.advance();
    }
  }

  private onPageDone(): void {
    const r = this.cur!;
    if (r.ask && this.lastPage && !this.choice) {
      const c = new ChoiceBox(r.ask.options, r.ask.o, this);
      this.choice = c;
      game.ui.push(c);
      const req = r;
      c.onDone = (i) => {
        req.ask!.result = i;
        req.done = true;
        if (this.cur === req) this.cur = null;
      };
      return;
    }
    if (r.o.auto !== undefined) this.autoLeft = r.o.auto;
  }

  private advance(): void {
    const r = this.cur!;
    if (this.page < r.pages.length - 1) {
      this.page++;
      this.resetPage();
    } else {
      r.done = true;
      this.cur = null;
      this.idle = 0;
    }
  }

  draw(g: Gfx): void {
    if (this.openK <= 0) return;
    const k = this.openK;
    const e = ease.cubicOut(k);
    const rise = Math.round((1 - e) * 6) * (this.viewPos === 'top' ? -1 : 1);
    const by = this.top + rise;
    const alpha = Math.min(1, k * 1.4);
    const st = this.viewStyle;
    const flip = st === 'flip';
    // the flip board is lifted into the window (0.2 s, a little overshoot)
    let fdy = 0;
    if (flip && this.styleT < 200) fdy = Math.round((1 - ease.backOut(this.styleT / 200)) * 10);
    const wy = by + fdy;
    const card = flip && this.viewCard;
    drawWindow(g, BOX.x, wy, BOX.w, BOX.h, UI, alpha, flip ? { grid: false, paper: card ? CARD_PAPER : UI.flipPaper, curl: false } : { margin: 14, curl: false });
    if (card) drawCardboard(g, BOX.x, wy, BOX.w, BOX.h, alpha);
    else if (flip) this.drawFlipDecor(g, wy, alpha);
    if (st === 'inner') this.drawThought(g, wy, alpha);
    this.drawTag(g, by, alpha);
    if (k < 0.5) return;
    const ox = BOX.textX;
    const oy = wy + BOX.padY;
    const ctx = g.ctx;
    const glyphs = this.glyphs.length || !this.lastShown ? this.glyphs : this.lastShown;
    const n = this.cur ? this.shown : glyphs.length;
    if (this.cur) this.lastShown = this.glyphs;
    ctx.save();
    ctx.globalAlpha = alpha;
    for (let i = 0; i < n && i < glyphs.length; i++) {
      const gl = glyphs[i];
      let dx = 0;
      let dy = 0;
      if (gl.fx === 'shake') {
        const ph = Math.floor(this.t / 50);
        dx = Math.round(Math.sin(ph * 2.1 + i * 3.1) * 0.9);
        dy = Math.round(Math.cos(ph * 1.7 + i * 1.7) * 0.9);
      } else if (gl.fx === 'wave') dy = Math.round(Math.sin(this.t / 130 + i * 0.55) * 1.6);
      // freshly typed glyphs pop up by a pixel for 2 frames
      if (this.cur && i >= n - 1 && !this.pageDone && this.acc < 0.6) dy -= 1;
      const x = ox + gl.x + dx;
      const y = oy + gl.y + dy;
      drawGlyph(ctx, gl.ch, x, y, gl.color);
      if (flip) drawGlyph(ctx, gl.ch, x + 1, y, gl.color);
    }
    ctx.restore();
    // "next" mark: the little hanko bobbing at 2 Hz (not before a choice)
    const waitingKey = this.cur && this.pageDone && this.autoLeft < 0 && !(this.cur.ask && this.lastPage);
    const mx = BOX.x + BOX.w - 14;
    const my = wy + BOX.h - 14;
    if (waitingKey && !this.ffwd) {
      const bob = Math.floor(this.t / 250) % 2;
      g.img(cursorImg(false), mx, my + bob, alpha < 1 ? { alpha } : {});
    } else if (this.pressT >= 0 && this.pressT < 160) {
      drawCursor(g, mx, my - 3, this.t, this.pressT);
    }
    if (this.ffwd && this.cur) {
      // fast-forward: two pencil chevrons
      const fx = mx - 2;
      const fyy = my + 2;
      for (let c = 0; c < 2; c++)
        for (let i = 0; i < 4; i++) {
          g.px(fx + c * 4 + i, fyy + i, UI.pencil);
          g.px(fx + c * 4 + i, fyy + 6 - i, UI.pencil);
        }
    }
  }

  private lastShown: Glyph[] | null = null;

  private drawTag(g: Gfx, by: number, alpha: number): void {
    const name = this.viewName;
    const flip = this.viewStyle === 'flip';
    const k = Math.min(1, this.tagT / 110);
    const tagY = this.viewPos === 'top' ? by + BOX.h - 5 : by - 13;
    if (this.prevName && k < 1) {
      const pw = textW(this.prevName) + 12;
      g.img(tapeImg(pw, 18, UI.tape, this.prevName.length), 16, tagY - Math.round(k * 4), { alpha: alpha * (1 - k) });
    }
    if (!name) return;
    const icon = flip ? (this.viewCard ? 18 : 14) : 0;
    const w = textW(name) + 12 + icon;
    const dy = Math.round((1 - ease.backOut(k)) * -4);
    const a = alpha * k;
    g.img(tapeImg(w, 18, UI.tape, name.length + (flip ? 3 : 0)), 16, tagY + dy, a < 1 ? { alpha: a } : {});
    g.text(name, 22, tagY + dy + 1, { color: UI.text, alpha: a });
    if (flip && this.viewCard) g.img(cardSignIcon(), 22 + textW(name) + 2, tagY + dy + 3, a < 1 ? { alpha: a } : {});
    else if (flip) g.img(flipIcon(), 22 + textW(name) + 3, tagY + dy + 5, a < 1 ? { alpha: a } : {});
  }

  private drawFlipDecor(g: Gfx, wy: number, alpha: number): void {
    // the mini board in the top-left corner, pinned over the frame
    const mini = flipBoardMini();
    g.img(mini, BOX.x + BOX.w - 24, wy - 5, alpha < 1 ? { alpha } : {});
    // a faint ghost of an erased word on the board (it's been used a lot)
    g.alpha(alpha * 0.35, () => {
      for (let i = 0; i < 22; i++) if ((i * 7) % 5 !== 0) g.px(BOX.x + BOX.w - 64 + i, wy + BOX.h - 9 + ((i >> 2) % 2), '#C8C2B4');
    });
  }

  private drawThought(g: Gfx, wy: number, alpha: number): void {
    // three little pencil circles: a thought, not a line
    g.alpha(alpha, () => {
      g.ring(16, wy + 12, 3, UI.pencil);
      g.ring(13, wy + 21, 2, UI.pencil);
      g.rect(12, wy + 27, 2, 2, UI.pencil);
    });
  }
}

/** ムジン販売員's cardboard (52 13.6): #D8B888 with its flutes. */
const CARD_PAPER = '#D8B888';

/**
 * The window as a piece of cardboard: a vertical flute every 3 px
 * (#C8A06A), the corners a little crushed, a strip of packing tape across
 * the top left.
 */
function drawCardboard(g: Gfx, x: number, y: number, w: number, h: number, alpha: number): void {
  g.alpha(alpha, () => {
    for (let fx = x + 4; fx < x + w - 3; fx += 3) g.rect(fx, y + 3, 1, h - 6, '#C8A06A');
    // lighter ridges beside the flutes near the top edge (the card's been bent)
    for (let fx = x + 5; fx < x + w - 3; fx += 6) g.px(fx, y + 3, '#E6CCA0');
    // crushed corners: the edge dented in, a darker bruise
    for (const [cx, cy, dx, dy] of [
      [x + 2, y + 2, 1, 1],
      [x + w - 3, y + 2, -1, 1],
      [x + 2, y + h - 3, 1, -1],
      [x + w - 3, y + h - 3, -1, -1],
    ]) {
      g.px(cx, cy, '#A88452');
      g.px(cx + dx, cy, '#B8925E');
      g.px(cx, cy + dy, '#B8925E');
    }
    // packing tape across the top left corner
    g.rect(x + 18, y - 2, 30, 6, '#E8D8A8');
    g.alpha(0.5, () => g.rect(x + 18, y - 2, 30, 1, '#FFF6D8'));
  });
}

let cardIconC: HTMLCanvasElement | null = null;
/** The sign on its split chopstick (16×12) beside ムジン販売員's name. */
function cardSignIcon(): HTMLCanvasElement {
  if (cardIconC) return cardIconC;
  const rows = ['.oooooooooo.....', 'oCCCCCCCCCCo....', 'oCkkCkCkkCCo....', 'oCCCCCCCCCCo....', 'oCkCkkkCkCCo....', 'oCCCCCCCCCCo....', '.oooooSSoooo....', '......SS........', '......SS........', '......SS........', '......Ss........', '......ss........'];
  const pal: Record<string, string> = { o: '#8A6A42', C: '#D8B888', k: '#2A2440', S: '#E8D8B0', s: '#B89A6A' };
  const [c, ctx] = makeCanvas(16, 12);
  rows.forEach((r, yy) =>
    [...r].forEach((ch, xx) => {
      if (ch === '.') return;
      ctx.fillStyle = pal[ch];
      ctx.fillRect(xx, yy, 1, 1);
    }),
  );
  cardIconC = c;
  return c;
}

let box: DialogBox | null = null;

function ensureBox(): DialogBox {
  if (!box || box.done) {
    box = new DialogBox();
    game.ui.push(box);
  }
  return box;
}

/** Top edge of the dialog window on screen (148 at the bottom, 8 at the top), or null. */
export function dialogTop(): number | null {
  return box && box.visible ? box.top : null;
}

/** Is a dialog window on screen (typing, waiting, or lingering)? */
export function dialogVisible(): boolean {
  return !!box && box.visible;
}

// ---- say --------------------------------------------------------------------------

/** Show one or more messages; resumes when the player closes the last page. */
export function* say(text: string | string[], o: SayOpts = {}): Co {
  const r = buildRequest(text, o);
  ensureBox().enqueue(r);
  yield () => r.done;
}

// ---- the choice window ----------------------------------------------------------------

export class ChoiceBox implements Widget {
  modal = true;
  done = false;
  index = 0;
  result = -1;
  onDone: ((i: number) => void) | null = null;
  private t = 0;
  private moveT = 999;
  private pressT = -1;
  private readonly w: number;
  private readonly h: number;

  constructor(private options: string[], private o: ChooseOpts = {}, private owner: DialogBox | null = null) {
    this.w = Math.max(...options.map((s) => textW(s))) + 12 + 12 + 12;
    this.h = options.length * 18 + 10;
    this.index = o.index ?? 0;
    if (this.isDisabled(this.index)) this.index = this.nextEnabled(this.index, 1);
  }

  private isDisabled(i: number): boolean {
    const d = this.o.disabled;
    if (!d) return false;
    return d.some((v, k) => (typeof v === 'boolean' ? v && k === i : v === i));
  }

  private nextEnabled(from: number, dir: number): number {
    const n = this.options.length;
    for (let s = 1; s <= n; s++) {
      const i = (((from + dir * s) % n) + n) % n;
      if (!this.isDisabled(i)) return i;
    }
    return from;
  }

  update(dt: number, input: Input): void {
    this.t += dt;
    this.moveT += dt;
    if (this.pressT >= 0) {
      this.pressT += dt;
      if (this.pressT >= 110) this.finish();
      return;
    }
    if (this.t < 90) return;
    const n = this.options.length;
    if (input.repeat('down')) this.move(1, n);
    else if (input.repeat('up')) this.move(-1, n);
    if (input.pressed('confirm')) {
      if (this.isDisabled(this.index)) {
        sfx('se_buzzer');
        return;
      }
      sfx('se_confirm');
      this.result = this.index;
      this.pressT = 0;
    } else if (input.pressed('cancel') && this.o.cancel !== undefined) {
      sfx('se_cancel');
      this.result = this.o.cancel;
      this.finish();
    }
  }

  private move(d: number, n: number): void {
    // the cursor may rest on a greyed-out option (so the player can read it)
    const i = (this.index + d + n) % n;
    if (i !== this.index) {
      this.index = i;
      this.moveT = 0;
      sfx('se_cursor');
    }
  }

  private finish(): void {
    this.done = true;
    this.onDone?.(this.result);
  }

  private get pos(): [number, number] {
    let x = this.o.x ?? 376 - this.w;
    let y = this.o.y;
    if (y === undefined) {
      const top = this.owner?.visible || dialogVisible() ? (box?.top ?? BOX.y) : BOX.y;
      y = top === 8 ? 8 + BOX.h + 6 : top - 4 - this.h;
    }
    x = Math.max(4, Math.min(W - this.w - 4, x));
    return [Math.round(x), Math.round(y)];
  }

  draw(g: Gfx): void {
    const [x, y0] = this.pos;
    const k = Math.min(1, this.t / 100);
    const y = y0 + Math.round((1 - ease.cubicOut(k)) * 4);
    drawWindow(g, x, y, this.w, this.h, UI, k, { curl: false });
    if (k < 0.6) return;
    this.options.forEach((s, i) => {
      const ry = y + 5 + i * 18;
      const sel = i === this.index;
      const dim = this.isDisabled(i);
      if (sel) drawMarker(g, x + 22, ry + 1, textW(s) + 5, 15, Math.min(1, this.moveT / 70));
      g.text(s, x + 24, ry, { color: dim ? UI.textDim : UI.text });
      if (sel) drawCursor(g, x + 11, ry, this.t, this.pressT);
    });
  }
}

/** Ask the player to pick an option; returns its index. */
export function* choose(options: string[], o: ChooseOpts = {}): Co<number> {
  const owner = box && !box.done && box.visible ? box : null;
  const c = new ChoiceBox(options, o, owner);
  if (owner) owner.choice = c;
  game.ui.push(c);
  yield () => c.done;
  return c.result;
}

/**
 * Message whose last page stays open while a choice is made (multi-page
 * text works: the choice appears once the final page is typed).
 */
export function* ask(text: string | string[], options: string[], o: SayOpts & ChooseOpts = {}): Co<number> {
  const r = buildRequest(text, o);
  r.ask = { options, o: { cancel: o.cancel, disabled: o.disabled, index: o.index }, result: -1 };
  ensureBox().enqueue(r);
  yield () => r.done;
  return r.ask.result;
}

// ---- captions (text straight on the screen, no window) ------------------------------------

class Caption implements Widget {
  modal = true;
  done = false;
  private t = 0;
  private line = 0;
  private shown = 0;
  private acc = 0;
  private wait = 0;
  private fade = -1;
  private readonly overlay = (g: Gfx) => this.paint(g);
  constructor(private lines: string[], private o: { cps: number; gap: number; hold: number; y: number; color: string; voice: string }) {
    // drawn after the screen fade, so it reads on a faded-out (black) screen
    game.overlays.push(this.overlay);
  }

  update(dt: number): void {
    this.t += dt;
    if (this.fade >= 0) {
      this.fade += dt;
      if (this.fade >= 500) this.finish();
      return;
    }
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    const cur = [...this.lines[this.line]];
    if (this.shown < cur.length) {
      this.acc += (dt / 1000) * this.o.cps;
      while (this.acc >= 1 && this.shown < cur.length) {
        this.acc -= 1;
        textBlip(this.o.voice, cur[this.shown]);
        this.shown++;
      }
      if (this.shown >= cur.length) this.wait = this.line < this.lines.length - 1 ? this.o.gap : this.o.hold;
      return;
    }
    if (this.line < this.lines.length - 1) {
      this.line++;
      this.shown = 0;
      this.acc = 0;
    } else this.fade = 0;
  }

  private finish(): void {
    this.done = true;
    const i = game.overlays.indexOf(this.overlay);
    if (i >= 0) game.overlays.splice(i, 1);
  }

  draw(): void {
    /* painted as an overlay (see constructor) */
  }

  private paint(g: Gfx): void {
    if (this.done) return;
    const a = this.fade >= 0 ? 1 - this.fade / 500 : 1;
    const total = this.lines.length;
    for (let i = 0; i <= this.line; i++) {
      const s = [...this.lines[i]];
      const n = i < this.line ? s.length : this.shown;
      const full = textW(this.lines[i]);
      const x0 = Math.round(W / 2 - full / 2);
      const y = this.o.y - Math.round(((total - 1) * 24) / 2) + i * 24;
      let x = x0;
      for (let j = 0; j < n; j++) {
        const fresh = i === this.line && j >= n - 1 && this.shown < s.length;
        g.text(s[j], x, y - (fresh ? 1 : 0), { color: this.o.color, alpha: a });
        x += charWidth(s[j]);
      }
    }
  }
}

/**
 * Lines typed one by one in the middle of the screen without a window
 * (evt_opening 「8月31日。」「夏休み、最後の日。」; #FBF3DC, 12 chars/s),
 * then faded out.
 */
export function* caption(lines: string | string[], o: { cps?: number; gap?: number; hold?: number; y?: number; color?: string; voice?: string } = {}): Co {
  const c = new Caption(Array.isArray(lines) ? lines : [lines], {
    cps: o.cps ?? 12,
    gap: o.gap ?? 600,
    hold: o.hold ?? 800,
    y: o.y ?? 100,
    color: o.color ?? UI.bg,
    voice: o.voice ?? 'narr',
  });
  game.ui.push(c);
  yield () => c.done;
}
