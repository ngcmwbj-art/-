// おてつだいの札 (52_ch2_level_art 13.1, 50_ch2_story 10.19): while Minato
// helps in 石黒牛舎 (evt_ch2_barn_work) a strip of masking tape sits at the
// top left of the field, 「エサ寄せ 0/6　水 0/3」. Each job done bumps its
// number for two frames; when every one is done a small 朱 seal 「済」 is
// pressed on the right end (se_stamp, small) and 0.8 s later the strip goes;
// if Minato gives up it just fades (0.3 s). Drawn by the field HUD, under
// dialogs and menus.
//
//   showChoreCard();                          // エサ寄せ 0/6, 水 0/3
//   setChoreCount(0, n) / setChoreCount(1, n) // after each job
//   yield* completeChoreCard();               // 「済」, then away (≈1.1 s)
//   hideChoreCard();                          // given up
//
// The counts are not saved (50 10.19): a load starts the work over.

import type { Co } from '../engine/co';
import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import { ease } from '../engine/tween';
import { sfx } from '../audio';
import { digitsWidth, drawDigits } from './digits';
import { drawTape, rectA, textW, UI } from './window';

export interface ChoreItem {
  label: string;
  total: number;
}

interface Card {
  items: ChoreItem[];
  counts: number[];
  /** When each count last changed (ms of the card's clock), for the bump. */
  bumped: number[];
  t: number;
  /** ms since 「済」 was pressed (-1: not yet). */
  doneT: number;
  /** ms since it started to fade away (-1: showing). */
  outT: number;
  outMs: number;
}

let card: Card | null = null;

const X = 8;
const Y = 24;
const H = 16;
/** The gap between the two jobs (a full-width space, as the text is written). */
const GAP = 12;

/** Put the strip up (default: the barn's two jobs, 50 10.19). */
export function showChoreCard(items: ChoreItem[] = [
  { label: 'エサ寄せ', total: 6 },
  { label: '水', total: 3 },
]): void {
  card = { items, counts: items.map(() => 0), bumped: items.map(() => -1e9), t: 0, doneT: -1, outT: -1, outMs: 300 };
}

/** Set how many of job `i` are done (the number bumps when it goes up). */
export function setChoreCount(i: number, n: number): void {
  if (!card || i < 0 || i >= card.counts.length) return;
  const v = Math.max(0, Math.min(card.items[i].total, n));
  if (v > card.counts[i]) card.bumped[i] = card.t;
  card.counts[i] = v;
}

/** How many of job `i` are done. */
export function choreCount(i: number): number {
  return card?.counts[i] ?? 0;
}

/** Everything is done: 「済」 is pressed on the strip, which goes 0.8 s later. Resolves when it has gone. */
export function* completeChoreCard(): Co {
  if (!card) return;
  const c = card;
  c.counts = c.items.map((it) => it.total);
  c.doneT = 0;
  sfx('se_stamp', { vol: 0.55, pitch: 1.25 });
  yield 800;
  c.outT = 0;
  c.outMs = 300;
  yield () => card !== c;
}

/** Take the strip away (given up): it fades in `ms`. */
export function hideChoreCard(ms = 300): void {
  if (ms <= 0) {
    card = null;
    return;
  }
  if (!card || card.outT >= 0) return;
  card.outT = 0;
  card.outMs = ms;
}

export function choreCardShowing(): boolean {
  return !!card;
}

/** Advance the strip (the HUD calls it while the field runs). */
export function updateChoreCard(dt: number): void {
  const c = card;
  if (!c) return;
  c.t += dt;
  if (c.doneT >= 0) c.doneT += dt;
  if (c.outT >= 0) {
    c.outT += dt;
    if (c.outT >= c.outMs) card = null;
  }
}

let sealC: HTMLCanvasElement | null = null;
/** 「済」 (10×10): a 1 px 朱 ring round a carved 8×8 済, lighter at the top left. */
function doneSeal(): HTMLCanvasElement {
  if (sealC) return sealC;
  const glyph = ['#....#..', '...#####', '#...#.#.', '....###.', '...#...#', '#..#####', '.#.#...#', '#.#....#'];
  const [c, ctx] = makeCanvas(10, 10);
  const put = (x: number, y: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  for (let i = 1; i < 9; i++) {
    put(i, 0, i < 5 ? UI.accentLight : UI.accent);
    put(i, 9, UI.accentDark);
    put(0, i, i < 5 ? UI.accentLight : UI.accent);
    put(9, i, UI.accentDark);
  }
  glyph.forEach((row, y) => [...row].forEach((ch, x) => ch === '#' && put(1 + x, 1 + y, x + y < 6 ? UI.accentLight : UI.accent)));
  sealC = c;
  return c;
}

/** Draw the strip (called by the field HUD). */
export function drawChoreCard(g: Gfx): void {
  const c = card;
  if (!c) return;
  const inK = ease.cubicOut(Math.min(1, c.t / 180));
  const outK = c.outT >= 0 ? Math.min(1, c.outT / c.outMs) : 0;
  const a = inK * (1 - outK);
  if (a <= 0) return;
  // the width follows the words: label, a thin space, n/total, the gap to the next job
  const parts = c.items.map((it, i) => ({ label: it.label, num: `${c.counts[i]}/${it.total}` }));
  // (room is kept at the right end for 「済」)
  const w = 12 + parts.reduce((s, p, i) => s + textW(p.label) + 3 + digitsWidth(p.num) + (i < parts.length - 1 ? GAP : 0), 0) + 13;
  const x = X - Math.round((1 - inK) * 12);
  g.alpha(a, () => {
    rectA(g, x + 2, Y + 2, w, H, UI.night, 0.3);
    drawTape(g, x, Y, w, H, '', { color: UI.tape, seed: 23 });
    let cx = x + 6;
    parts.forEach((p, i) => {
      cx += g.text(p.label, cx, Y - 1, { color: UI.text });
      cx += 3;
      // a count that just went up hops for two frames
      const hop = c.t - c.bumped[i] < 34 ? 1 : 0;
      drawDigits(g, p.num, cx, Y + 5 - hop, { color: c.counts[i] >= c.items[i].total ? UI.accent : UI.text });
      cx += digitsWidth(p.num) + GAP;
    });
    if (c.doneT >= 0) {
      // 「済」 comes down (1.4 → 1.0 in 4 frames) on the strip's right end
      const k = Math.min(1, c.doneT / 67);
      const s = 1.4 - 0.4 * ease.quadIn(k);
      const img = doneSeal();
      const sw = Math.round(10 * s);
      const sx = x + w - 13;
      g.ctx.drawImage(img, Math.round(sx + 5 - sw / 2), Math.round(Y + 8 - sw / 2), sw, sw);
    }
  });
}
