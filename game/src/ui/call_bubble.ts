// The loudspeaker's call over 星見台 — fx_h_call_bubble (52_ch2_level_art
// 13.1, 50_ch2_story 3.13, 53_ch2_audio 7.4). A window-less little bubble at
// the top middle of the screen (tip at (192,14)), notebook paper with a 1px
// ink edge like the bubbles over people's heads, but its tail points UP:
// the voice comes from the mountain. A small grey horn (7×7) sits left of
// the words. It pops in over 0.12 s, the line is typed in, it stays 2.4 s
// and fades over 0.3 s. On the hill's plaza (y ≤ 7) it hangs 16 px over the
// pole's horns instead, tail down to them — you can see where the voice is.
// Indoors there is no bubble (only the muffled voice).
//
//   showCallBubble('……おぴぴちゃん。')            // returns a handle at once
//   yield* playCallBubble('……シュンスケくん。', { voice: 'broadcast' })
//                                                   // types with the voice's blips,
//                                                   // resolves when the line is out
//
// The field HUD draws it (under dialogs and menus), so it never covers a
// conversation window and it leaves with the field under a battle.

import type { Co } from '../engine/co';
import { charWidth, drawText } from '../engine/font';
import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import { W } from '../engine/screen';
import { ease } from '../engine/tween';
import { textBlip } from '../audio';
import type { FieldScene } from '../world/field';
import { field } from '../world/field';
import { textW, UI } from './window';

const POP_MS = 120;
const HOLD_MS = 2400;
const FADE_MS = 300;
/** Default pace: a far voice, slower than a conversation (the events type theirs at 12/s). */
const CPS = 12;
/** The speaker pole on the hill (map_hoshi_hill (15–16, 2–3)): the horns' top, in world px. */
const HORNS = { x: 16 * 16, y: 2 * 16 - 10 };

export interface CallBubbleHandle {
  /** The whole line is out. */
  typed: boolean;
  /** The bubble has gone. */
  gone: boolean;
}

interface Live {
  text: string;
  chars: string[];
  shown: number;
  acc: number;
  cps: number;
  voice: string | null;
  t: number;
  typedAt: number;
  hold: number;
  at: 'auto' | 'top' | 'speaker';
  handle: CallBubbleHandle;
}

let live: Live | null = null;

/**
 * Show a call in the bubble (the line is typed at `cps`; with `voice` the
 * bubble plays the blips itself — leave it out when the caller does).
 * `at`: 'auto' (default: over the horns on the hill's plaza, else the top
 * of the screen), 'top' or 'speaker'.
 */
export function showCallBubble(text: string, o: { cps?: number; voice?: string; at?: 'auto' | 'top' | 'speaker'; hold?: number } = {}): CallBubbleHandle {
  if (live) live.handle.typed = live.handle.gone = true;
  const handle: CallBubbleHandle = { typed: false, gone: false };
  const f = field();
  if (f && f.map.def.kind === 'indoor') {
    // through the walls: no bubble, the caller's voice only
    handle.typed = handle.gone = true;
    return handle;
  }
  live = { text, chars: [...text], shown: 0, acc: 0, cps: o.cps ?? CPS, voice: o.voice ?? null, t: 0, typedAt: -1, hold: o.hold ?? HOLD_MS, at: o.at ?? 'auto', handle };
  return handle;
}

/** Show the call with the loudspeaker's voice and wait until the line is out. */
export function* playCallBubble(text: string, o: { cps?: number; voice?: string; at?: 'auto' | 'top' | 'speaker' } = {}): Co {
  const h = showCallBubble(text, { ...o, voice: o.voice ?? 'broadcast' });
  yield () => h.typed;
}

export function clearCallBubbleUi(): void {
  if (live) live.handle.typed = live.handle.gone = true;
  live = null;
}

export function callBubbleShowing(): boolean {
  return !!live;
}

/** Advance the bubble (the HUD calls it while the field runs). */
export function updateCallBubbleUi(dt: number): void {
  const b = live;
  if (!b) return;
  b.t += dt;
  if (b.t >= POP_MS && b.shown < b.chars.length) {
    b.acc += (dt / 1000) * b.cps;
    while (b.acc >= 1 && b.shown < b.chars.length) {
      const ch = b.chars[b.shown++];
      // with its own voice the ellipsis is drawn out a little and a comma is a
      // breath; when the caller plays the voice, the letters keep its even pace
      b.acc -= !b.voice ? 1 : ch === '…' ? 1.4 : ch === '、' ? 2.5 : 1;
      if (b.voice && ch.trim() && ch !== '…' && ch !== '。' && ch !== '、') textBlip(b.voice, ch);
    }
    if (b.shown >= b.chars.length) {
      b.typedAt = b.t;
      b.handle.typed = true;
    }
  }
  if (b.typedAt >= 0 && b.t >= endOf(b) + FADE_MS) {
    b.handle.gone = true;
    live = null;
  }
}

function endOf(b: Live): number {
  // held 2.4 s from the pop, and at least a moment after the last letter
  return Math.max(POP_MS + b.hold, b.typedAt >= 0 ? b.typedAt + 900 : Infinity);
}

let hornC: HTMLCanvasElement | null = null;
/** The loudspeaker horn (7×7, #C8CDD4): a flared mouth to the right, a lit top edge. */
function horn(): HTMLCanvasElement {
  if (hornC) return hornC;
  const rows = ['....oo.', '..ooHo.', 'ooHhhoo', 'ohhhhho', 'ooGhhoo', '..ooGo.', '....oo.'];
  const [c, ctx] = makeCanvas(7, 7);
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      if (ch === '.') return;
      ctx.fillStyle = ch === 'o' ? '#6B7186' : ch === 'H' ? '#F4F1E8' : ch === 'G' ? '#9AA0A8' : '#C8CDD4';
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  hornC = c;
  return c;
}

const frameCache = new Map<string, HTMLCanvasElement>();

/** The empty bubble, sized for the whole line (it doesn't grow while typing). */
function frame(text: string, tailUp: boolean): HTMLCanvasElement {
  const key = `${text}|${tailUp}`;
  let c = frameCache.get(key);
  if (c) return c;
  const w = textW(text) + 22;
  const h = 18;
  const [cv, ctx] = makeCanvas(w + 2, h + 8);
  const oy = tailUp ? 4 : 0;
  const r = (x: number, y: number, ww: number, hh: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(x, y + oy, ww, hh);
    ctx.globalAlpha = 1;
  };
  // soft shadow, frame with the corners cut, paper, a lighter top edge
  r(2, 2, w - 1, h - 1, UI.night, 0.35);
  r(1, 0, w - 2, h, UI.border);
  r(0, 1, w, h - 2, UI.border);
  r(1, 1, w - 2, h - 2, UI.bg);
  r(1, 1, w - 2, 1, '#FFFBEE');
  r(1, h - 2, w - 2, 1, '#F1E4C4');
  // the tail, centred
  const tx = Math.floor(w / 2) - 2;
  if (tailUp) {
    r(tx, 0, 5, 1, UI.bg);
    r(tx - 1, 0, 1, 1, UI.border);
    r(tx + 5, 0, 1, 1, UI.border);
    r(tx + 1, -1, 3, 1, UI.bg);
    r(tx, -1, 1, 1, UI.border);
    r(tx + 4, -1, 1, 1, UI.border);
    r(tx + 2, -2, 1, 1, UI.bg);
    r(tx + 1, -2, 1, 1, UI.border);
    r(tx + 3, -2, 1, 1, UI.border);
    r(tx + 2, -3, 1, 1, UI.border);
  } else {
    const by = h - 1;
    r(tx, by, 5, 1, UI.bg);
    r(tx - 1, by, 1, 1, UI.border);
    r(tx + 5, by, 1, 1, UI.border);
    r(tx + 1, by + 1, 3, 1, UI.bg);
    r(tx, by + 1, 1, 1, UI.border);
    r(tx + 4, by + 1, 1, 1, UI.border);
    r(tx + 2, by + 2, 1, 1, UI.bg);
    r(tx + 1, by + 2, 1, 1, UI.border);
    r(tx + 3, by + 2, 1, 1, UI.border);
    r(tx + 2, by + 3, 1, 1, UI.border);
  }
  ctx.drawImage(horn(), 5, 5 + oy);
  c = cv;
  frameCache.set(key, c);
  return c;
}

/** Draw the bubble over the field (called by the HUD). */
export function drawCallBubbleUi(g: Gfx, f: FieldScene | null): void {
  const b = live;
  if (!b) return;
  let at = b.at;
  if (at === 'auto') at = f && f.map.id === 'map_hoshi_hill' && f.player.y < 8 * 16 ? 'speaker' : 'top';
  const tailUp = at === 'top';
  // where the tail's tip is
  let tipX = Math.round(W / 2);
  let tipY = 5;
  if (at === 'speaker' && f) {
    const [sx, sy] = f.worldToScreen(HORNS.x, HORNS.y - 16);
    tipX = Math.round(sx);
    tipY = Math.round(sy);
  }
  const img = frame(b.text, tailUp);
  const w = img.width;
  const h = img.height;
  const x = Math.max(4, Math.min(W - 4 - w, tipX - Math.floor(w / 2)));
  const y = tailUp ? tipY : tipY - h;
  const k = Math.min(1, b.t / POP_MS);
  const end = endOf(b);
  const a = (b.t > end ? Math.max(0, 1 - (b.t - end) / FADE_MS) : 1) * Math.min(1, k * 2);
  if (a <= 0) return;
  const s = 1.2 - 0.2 * ease.cubicOut(k);
  const ctx = g.ctx;
  ctx.save();
  ctx.globalAlpha *= a;
  // pop: scale round the tail's tip
  ctx.translate(tipX, tipY);
  ctx.scale(s, s);
  ctx.translate(-tipX, -tipY);
  ctx.drawImage(img, x, y);
  // the letters typed so far; the newest sits a pixel high for a moment
  let cx = x + 15;
  const ty = y + (tailUp ? 4 : 0) + 1;
  for (let i = 0; i < b.shown; i++) {
    const ch = b.chars[i];
    const fresh = i === b.shown - 1 && b.shown < b.chars.length && b.acc < 0.5;
    drawText(ctx, ch, cx, ty - (fresh ? 1 : 0), { color: UI.text });
    cx += charWidth(ch);
  }
  ctx.restore();
}
