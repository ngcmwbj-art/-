// Battle message band (20_systems_battle.md 9.2, 15.3): graph-paper strip at
// the top, 2 lines, types at 90 chars/s, auto-advances (≥0.35s after the page
// is complete and ≥0.6s after it appeared). Blocking pages can be skipped
// with confirm. Supports {c=#hex}…{/c}, {shake}, {wave}, {w=ms}, {spd=x}.

import type { Co } from '../../engine/co';
import { charWidth, drawGlyph } from '../../engine/font';
import type { Gfx } from '../../engine/gfx';
import { C, drawNote, tapeCanvas } from './note';
import { miniText } from '../art/stamps';

interface G {
  ch: string;
  x: number;
  line: number;
  color: string;
  fx: '' | 'shake' | 'wave';
  pause: number;
  speed: number;
}

function layout(text: string): { glyphs: G[]; lines: number } {
  const glyphs: G[] = [];
  let color = C.ink;
  let fx: G['fx'] = '';
  let speed = 1;
  let x = 0;
  let line = 0;
  const re = /\{([^}]*)\}|\n|./gsu;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const tok = m[0];
    if (m[1] !== undefined) {
      const t = m[1];
      if (t.startsWith('w=')) {
        const last = glyphs[glyphs.length - 1];
        if (last) last.pause += parseInt(t.slice(2), 10) || 0;
      } else if (t.startsWith('c=')) color = t.slice(2);
      else if (t === '/c') color = C.ink;
      else if (t === 'shake' || t === 'wave') fx = t;
      else if (t === '/shake' || t === '/wave') fx = '';
      else if (t.startsWith('spd=')) speed = parseFloat(t.slice(4)) || 1;
      continue;
    }
    if (tok === '\n') {
      line++;
      x = 0;
      continue;
    }
    glyphs.push({ ch: tok, x, line, color, fx, pause: 0, speed });
    x += charWidth(tok);
  }
  return { glyphs, lines: line + 1 };
}

/**
 * Boss battles (15.3): the band is one line so the boss's cap — a target —
 * stays in view. A 2-line page is laid out on one line when it fits (the
 * break after punctuation simply closes up, any other break becomes a
 * space); only a page too long for that grows the band.
 */
function oneLineLayout(text: string, maxW: number): { glyphs: G[]; lines: number } {
  const L = layout(text);
  if (L.lines !== 2) return L;
  const joined = layout(text.replace(/([、。！？」』…）])\n/g, '$1').replace(/\n/g, ' '));
  const last = joined.glyphs[joined.glyphs.length - 1];
  return last && last.x + charWidth(last.ch) <= maxW ? joined : L;
}

/** 「せんせいより」→「せんせい」「より」: split a tag into two short lines. */
function splitTag(t: string): string[] {
  const ch = [...t];
  if (ch.length <= 3) return [t];
  const cut = t.endsWith('より') ? ch.length - 2 : Math.ceil(ch.length / 2);
  return [ch.slice(0, cut).join(''), ch.slice(cut).join('')];
}

/** How long the band takes to unroll when its first line arrives (ms). */
const OPEN_MS = 110;

export interface BandPageOpts {
  /** Wait for confirm instead of auto-advancing. */
  manual?: boolean;
  /** Multiply the auto-advance delays (weak-enemy battles use shorter). */
  autoMs?: number;
  /** Typing speed (chars/s). */
  cps?: number;
  /** Shown fully typed at once (a counter redrawn every frame). */
  instant?: boolean;
}

interface Page {
  text: string;
  o: BandPageOpts;
}

export class MessageBand {
  x = 8;
  y = 4;
  w = 368;
  /** Boss battles use a 1-line band that grows for 2-line pages. */
  bossMode = false;
  private h = 44;
  private queue: Page[] = [];
  private cur: { glyphs: G[]; lines: number } | null = null;
  private curOpts: BandPageOpts = {};
  private shown = 0;
  private acc = 0;
  private pause = 0;
  private age = 0;
  private doneAge = 0;
  private t = 0;
  /** Static text shown when nothing is queued (様子, descriptions). */
  private staticText = '';
  private staticLayout: { glyphs: G[]; lines: number } | null = null;
  /**
   * The last page read stays on the band (fully typed) until something else
   * is posted or a static text takes over, so the band never sits empty
   * while an action plays out (15.3: the text of the action stays up).
   */
  private linger: { glyphs: G[]; lines: number } | null = null;
  /** Extra drawing inside the band (e.g. target HP bar). */
  extra: ((g: Gfx, x: number, y: number) => void) | null = null;
  /** Tape label on the left end (せんせいより). */
  tag = '';
  alpha = 1;
  hidden = false;
  /** Default auto-advance hold after the page completes. */
  autoHold = 350;
  minShow = 600;
  private blockingId = 0;
  private finishedId = 0;
  private waitingManual = false;
  /**
   * The band stays closed until its first line arrives, then unrolls with
   * it (QA round 2: at every battle start it sat open and blank for 0.5–1s,
   * all through the boss's rise out of the dark).
   */
  private opened = false;
  private openT = 0;

  get busy(): boolean {
    return this.cur !== null || this.queue.length > 0;
  }

  /**
   * The page on screen can only be closed with confirm (manual). Whoever
   * drives the band must route confirm presses to it, or it would never close.
   */
  get wantsConfirm(): boolean {
    return this.cur !== null && !!this.curOpts.manual;
  }

  get height(): number {
    return Math.round(this.h);
  }

  /** Bottom edge (for things hanging under the band). */
  get bottom(): number {
    return this.y + Math.round(this.h);
  }

  /** Queue pages without blocking (auto-advance). */
  post(pages: string[] | string, o: BandPageOpts = {}): void {
    const list = typeof pages === 'string' ? [pages] : pages;
    for (const text of list) this.queue.push({ text, o });
    if (!this.cur) this.next();
  }

  /** Replace whatever is showing with these pages (non-blocking). */
  replace(pages: string[] | string, o: BandPageOpts = {}): void {
    this.queue = [];
    this.cur = null;
    this.linger = null;
    this.post(pages, o);
  }

  /** Show pages and wait until they have all been read. */
  *show(pages: string[] | string, o: BandPageOpts = {}): Co {
    const list = typeof pages === 'string' ? [pages] : pages;
    if (!list.length) return;
    this.post(list, o);
    const id = ++this.blockingId;
    // mark: the flow waits until the queue drains
    yield () => !this.busy;
    this.finishedId = id;
  }

  setStatic(text: string, extra: MessageBand['extra'] = null): void {
    if (text) this.linger = null;
    if (text !== this.staticText) {
      this.staticText = text;
      this.staticLayout = text ? layout(text) : null;
    }
    this.extra = extra;
  }

  clearStatic(): void {
    this.setStatic('');
  }

  clear(): void {
    this.queue = [];
    this.cur = null;
    this.linger = null;
  }

  /** Drop the lingering last page (the band shows blank paper). */
  clearLinger(): void {
    this.linger = null;
  }

  /** Text of the page on the band (typing, static or lingering) — QA. */
  get text(): string {
    const L = this.cur ?? this.staticLayout ?? this.linger;
    return L ? L.glyphs.map((g) => g.ch).join('') : '';
  }

  private next(): void {
    const p = this.queue.shift();
    if (!p) {
      // the finished page stays up (typed out) until something replaces it
      if (this.cur) this.linger = this.cur;
      this.cur = null;
      return;
    }
    this.linger = null;
    // (a tagged page — せんせいより, one line per member — keeps its lines)
    this.cur = this.bossMode && !this.tag ? oneLineLayout(p.text, this.w - 22) : layout(p.text);
    this.curOpts = p.o;
    this.shown = p.o.instant ? this.cur.glyphs.length : 0;
    this.acc = 0;
    this.pause = 0;
    this.age = 0;
    this.doneAge = 0;
    this.waitingManual = false;
  }

  /** `confirm` = a confirm press this frame (only used for blocking pages). */
  update(dt: number, confirm: boolean): void {
    this.t += dt;
    if (!this.opened && (this.cur || this.staticLayout || this.linger)) this.opened = true;
    if (this.opened && this.openT < OPEN_MS) this.openT = Math.min(OPEN_MS, this.openT + dt);
    const L0 = this.cur ?? this.staticLayout ?? this.linger;
    const lines = L0 ? L0.lines : 1;
    const targetH = this.bossMode ? (lines >= 2 ? 44 : 26) : 44;
    if (this.h !== targetH) {
      const step = (18 / 80) * dt;
      this.h = this.h < targetH ? Math.min(targetH, this.h + step) : Math.max(targetH, this.h - step);
    }
    if (!this.cur) return;
    this.age += dt;
    const g = this.cur.glyphs;
    const cps = this.curOpts.cps ?? 90;
    if (this.shown < g.length) {
      if (confirm && this.shown > 0) {
        this.shown = g.length;
        this.pause = 0;
        confirm = false;
      } else if (this.pause > 0) this.pause -= dt;
      else {
        this.acc += (dt / 1000) * cps * (g[this.shown]?.speed ?? 1);
        while (this.acc >= 1 && this.shown < g.length) {
          this.acc -= 1;
          const gl = g[this.shown++];
          if (gl.pause) {
            this.pause = gl.pause;
            this.acc = 0;
            break;
          }
        }
      }
      return;
    }
    this.doneAge += dt;
    if (this.curOpts.manual) {
      this.waitingManual = true;
      if (confirm) this.next();
      return;
    }
    const hold = this.curOpts.autoMs ?? this.autoHold;
    if ((this.doneAge >= hold && this.age >= this.minShow) || confirm) this.next();
  }

  draw(g: Gfx): void {
    if (this.hidden || !this.opened) return;
    // unrolls from its top edge in OPEN_MS (the text rows appear as they fit)
    const k = this.openT >= OPEN_MS ? 1 : 1 - (1 - this.openT / OPEN_MS) ** 2;
    const h = Math.max(6, Math.round(this.h * k));
    drawNote(g, this.x, this.y, this.w, h, { margin: 8 }, this.alpha);
    let tagW = 0;
    if (this.tag) {
      // the tape tag (せんせいより) sits in the left margin, its words on two
      // short lines, so the band keeps almost its full width for the text
      const words = splitTag(this.tag);
      const imgs = words.map((w) => miniText(w, 0.62, C.ink));
      tagW = Math.max(...imgs.map((i) => i.width)) + 8;
      const th = imgs.reduce((a, i) => a + i.height + 1, 3);
      g.img(tapeCanvas(tagW, th, '', C.tape, 3), this.x - 3, this.y + Math.round((h - th) / 2));
      let ty = this.y + Math.round((h - th) / 2) + 2;
      for (const im of imgs) {
        g.img(im, this.x - 3 + Math.round((tagW - im.width) / 2), ty);
        ty += im.height + 1;
      }
    }
    const L = this.cur ?? this.staticLayout ?? this.linger;
    if (!L) return;
    const shown = this.cur ? this.shown : L.glyphs.length;
    const ox = this.x + 14 + (this.tag ? tagW - 10 : 0);
    const oy = this.y + 5;
    const ctx = g.ctx;
    const prev = ctx.globalAlpha;
    ctx.globalAlpha = prev * this.alpha;
    for (let i = 0; i < shown && i < L.glyphs.length; i++) {
      const gl = L.glyphs[i];
      if (gl.line * 18 + 16 > h - 2) continue;
      let dx = 0;
      let dy = 0;
      if (gl.fx === 'shake') {
        dx = Math.round(Math.sin(this.t * 0.09 + i * 3.1) * 0.8);
        dy = Math.round(Math.cos(this.t * 0.11 + i * 1.7) * 0.8);
      } else if (gl.fx === 'wave') dy = Math.round(Math.sin(this.t / 120 + i * 0.6) * 1.5);
      drawGlyph(ctx, gl.ch, ox + gl.x + dx, oy + gl.line * 18 + dy, gl.color);
    }
    ctx.globalAlpha = prev;
    if (!this.cur && this.extra) this.extra(g, this.x, this.y);
    if (this.cur && this.waitingManual) {
      // bouncing next marker (small vermilion triangle)
      const bx = this.x + this.w - 14;
      const by = this.y + h - 10 + (Math.floor(this.t / 250) % 2);
      g.rect(bx, by, 7, 1, C.shu);
      g.rect(bx + 1, by + 1, 5, 1, C.shu);
      g.rect(bx + 2, by + 2, 3, 1, C.shu);
      g.rect(bx + 3, by + 3, 1, 1, C.shu);
    }
  }
}
