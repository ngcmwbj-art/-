// グソっ君's own lines in battle (★2026-09-29, 04_gusokkun_plan: the flip
// board is gone — he talks). A line of his goes in the message band like any
// other page, with his name on a tape tag in the band's left margin and his
// voice's blips as it types (the words are written without 「」: the tag says
// who is talking). The member id stays 'kanenari'.

import type { Co } from '../engine/co';
import type { BattleScene } from './scene';
import type { BandPageOpts } from './ui/message';
import { drawText, measure } from '../engine/font';
import { makeCanvas } from '../engine/pixel';
import { ease } from '../engine/tween';
import { PANEL_POS } from './ui/panels';
import { KN_TSUKKOMI } from '../data/battle/text';
import { miniText } from './art/stamps';
import { C, tapeCanvas } from './ui/note';

export const KN_TAG = 'グソっ君';
export const KN_VOICE = 'gusokkun';

/** The band options of a page he says. */
export function knOpts(o: BandPageOpts = {}): BandPageOpts {
  return { ...o, tag: KN_TAG, voice: KN_VOICE };
}

/** グソっ君 says these pages (wait until read; `manual` waits for 決定). */
export function* knSay(s: BattleScene, pages: string[] | string, manual = false): Co {
  yield* s.say(pages, manual, knOpts());
}

/** グソっ君 says these pages without waiting. */
export function knPost(s: BattleScene, pages: string[] | string): void {
  s.msg.post(pages, knOpts());
}

// ---- the speech balloon over his status panel ------------------------------------------


const INK = '#2A2440';
const PAPER = '#F4F1E8';
const SHADOW = '#5B4A7A';
const balloonCache = new Map<string, HTMLCanvasElement>();

/**
 * A white speech balloon (1px ink outline, 2px drop shadow, rounded corners)
 * with 1–2 lines of text and a tail at the bottom, `tailX` px from its left.
 */
export function speechBalloon(text: string, tailX = 18): HTMLCanvasElement {
  const key = `${text}:${tailX}`;
  const hit = balloonCache.get(key);
  if (hit) return hit;
  const lines = text.split('\n');
  const tw = Math.max(...lines.map((l) => measure(l)));
  const w = tw + 14;
  const h = lines.length * 18 + 8;
  const [cv, ctx] = makeCanvas(w + 2, h + 8);
  const box = (x: number, y: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x + 1, y, w - 2, h);
    ctx.fillRect(x, y + 1, w, h - 2);
  };
  box(2, 2, SHADOW);
  box(0, 0, INK);
  ctx.fillStyle = PAPER;
  ctx.fillRect(1, 1, w - 2, h - 2);
  ctx.fillStyle = '#FFFFFF';
  ctx.fillRect(2, 1, w - 4, 1);
  // the tail: a little wedge down and to the left, outlined
  for (let i = 0; i < 6; i++) {
    const x0 = tailX - 3 + Math.floor(i / 2);
    const len = 6 - i;
    ctx.fillStyle = INK;
    ctx.fillRect(x0 - 1, h - 1 + i, len + 2, 1);
    if (len > 0) {
      ctx.fillStyle = PAPER;
      ctx.fillRect(x0, h - 1 + i, len, 1);
    }
  }
  ctx.fillStyle = INK;
  ctx.fillRect(tailX - 3 + 2, h + 5, 2, 1);
  lines.forEach((l, i) => drawText(ctx, l, 7, 4 + i * 18, { color: INK }));
  balloonCache.set(key, cv);
  return cv;
}

/**
 * グソっ君 says a short line in a balloon over his status panel (it pops up
 * and stays `ms`): his tsukkomi when しゅん can't, his asides. Returns `ms`.
 */
export function showKnLine(s: BattleScene, text: string, ms = 1300 + Math.max(0, [...text].length - 6) * 80): number {
  const [px, py] = PANEL_POS.kanenari ?? [244, 150];
  const img = speechBalloon(text, 16);
  // the tail over his photo; the balloon kept on screen
  const x = Math.max(4, Math.min(380 - img.width, px + 6));
  const y = py - 8 - img.height;
  s.addFx({
    layer: 'top',
    dur: ms,
    ui: true,
    draw: (g, t) => {
      const pop = t < 110 ? ease.backOut(t / 110) : 1;
      const a = t > ms - 160 ? Math.max(0, (ms - t) / 160) : 1;
      const w = Math.max(1, Math.round(img.width * pop));
      const h = Math.max(1, Math.round(img.height * pop));
      g.alpha(a, () => g.ctx.drawImage(img, x + 16 - Math.round(16 * pop), y + img.height - h, w, h));
    },
  });
  return ms;
}

let tsukN = 0;
/** His tsukkomi when しゅん can't (asleep, away, down): 「なんでやねん！」 and friends. */
export function showKnTsukkomi(s: BattleScene): number {
  const line = KN_TSUKKOMI[tsukN++ % KN_TSUKKOMI.length];
  s.sfx('se_bishi', { vol: 0.5, pitch: 1.2 });
  return showKnLine(s, line);
}

// ---- おすそわけ: the little rice balls he hands round ------------------------------------

const RICE_ROWS = [
  '....kk....',
  '...kWWk...',
  '..kWWwWk..',
  '.kWWwwwWk.',
  'kWWwwwwwwk',
  'kwnnnnnnwk',
  'kwnNnnnnwk',
  '.kkkkkkkk.',
];
const RICE_PAL: Record<string, string> = { k: INK, W: '#FFFFFF', w: '#E8E4F0', n: '#2A3A34', N: '#3E5A4A' };
const riceCache = new Map<string, HTMLCanvasElement>();

/** A rice ball (10×8) for おすそわけ; `half` = the half left after he took a bite. */
export function riceBall(half = false): HTMLCanvasElement {
  const key = half ? 'half' : 'whole';
  const hit = riceCache.get(key);
  if (hit) return hit;
  const rows = half ? RICE_ROWS.map((r, y) => r.slice(0, 5) + (y === 0 || y === 7 ? '.....' : 'k....')) : RICE_ROWS;
  const [cv, ctx] = makeCanvas(10, 8);
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      const col = RICE_PAL[ch];
      if (!col) return;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  riceCache.set(key, cv);
  return cv;
}

const taggedCache = new Map<string, HTMLCanvasElement>();
/**
 * The balloon with his name on a strip of masking tape over its top-left
 * corner (for a line with no status panel under it: the game-over page).
 */
export function taggedBalloon(text: string): HTMLCanvasElement {
  const hit = taggedCache.get(text);
  if (hit) return hit;
  const b = speechBalloon(text, 24);
  const name = miniText(KN_TAG, 0.62, INK);
  const tw = name.width + 10;
  const tape = tapeCanvas(tw, name.height + 5, '', C.tape, 2);
  const [cv, ctx] = makeCanvas(b.width + 4, b.height + tape.height - 5);
  ctx.drawImage(b, 0, tape.height - 5);
  ctx.drawImage(tape, 6, 0);
  ctx.drawImage(name, 11, 3);
  taggedCache.set(text, cv);
  return cv;
}
