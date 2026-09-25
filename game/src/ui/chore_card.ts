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
//
// おとどけの札 (52 13.1, 50 10.20): the same tape in the same place, two
// rows (128×28) while Minato carries the vegetables with ポコシャさん —
// 「おとどけ 0/5」 and 「つぎ：タケじい」 (31px tall: the 16px letters keep
// their size), a little yellow delivery slip at its
// left end. Each parcel bumps the number and rewrites the second row with
// the next name (0.2 s); at 5/5 it reads 「軽トラへ」 and 「済」 is pressed;
// the strip stays up until the delivery closes at the truck (〔しめ〕).
//
//   showDeliveryCard({ total: 5, next: 'タケじい' });
//   setDeliveryCount(n, next)                 // after each parcel (n = total: 軽トラへ, 済)
//   yield* completeDeliveryCard();            // all five: 「済」 (if not yet), settles
//   hideDeliveryCard();                       // 〔しめ〕 or given up (0.3 s)

import type { Co } from '../engine/co';
import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import { ease } from '../engine/tween';
import { sfx } from '../audio';
import { flag } from '../game/state';
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
  deli = null;
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

/** Take the strip away (given up): it fades in `ms`. `ms` 0 also clears the おとどけ strip (the HUD's reset). */
export function hideChoreCard(ms = 300): void {
  if (ms <= 0) {
    card = null;
    deli = null;
    return;
  }
  if (!card || card.outT >= 0) return;
  card.outT = 0;
  card.outMs = ms;
}

export function choreCardShowing(): boolean {
  return !!card;
}

/** Advance the strips (the HUD calls it while the field runs). */
export function updateChoreCard(dt: number): void {
  updateDeliveryCard(dt);
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

/** Draw the strips (called by the field HUD). */
export function drawChoreCard(g: Gfx): void {
  drawDeliveryCard(g);
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

// ---- おとどけの札 (evt_ch2_delivery) ------------------------------------------------------------

interface DeliCard {
  total: number;
  count: number;
  next: string;
  /** The name being wiped off (the 0.2 s rewrite), and the clock of it. */
  prevNext: string;
  nextT: number;
  bumpT: number;
  t: number;
  doneT: number;
  outT: number;
  outMs: number;
}

let deli: DeliCard | null = null;
/** Two rows of the 16px letters need 31px (52 13.1 says 28: the letters keep their size). */
const DELI_H = 31;
const TRUCK = '軽トラへ';
const NEXT_HEAD = 'つぎ：';
/** Room at the right for 「済」 (it goes at the end of the first row). */
const SEAL_ROOM = 15;

/** Put the おとどけ strip up: `total` parcels, the first stop's name. */
export function showDeliveryCard(o: { total?: number; next?: string } = {}): void {
  deli = { total: o.total ?? 5, count: 0, next: o.next ?? '', prevNext: '', nextT: 1e9, bumpT: -1e9, t: 0, doneT: -1, outT: -1, outMs: 300 };
  card = null;
}

/** `n` parcels delivered; `next` is the next stop (at `total`: 「軽トラへ」, and 「済」 is pressed). */
export function setDeliveryCount(n: number, next = ''): void {
  const d = deli;
  if (!d) return;
  const v = Math.max(0, Math.min(d.total, n));
  if (v > d.count) d.bumpT = d.t;
  d.count = v;
  const name = v >= d.total ? TRUCK : next;
  if (name && name !== d.next) {
    d.prevNext = d.next;
    d.next = name;
    d.nextT = 0;
  }
  if (v >= d.total && d.doneT < 0) {
    d.doneT = 0;
    sfx('se_stamp', { vol: 0.55, pitch: 1.25 });
  }
}

/** All delivered: 「軽トラへ」 and 「済」 (if not already). The strip stays until hideDeliveryCard or 〔しめ〕. */
export function* completeDeliveryCard(): Co {
  const d = deli;
  if (!d) return;
  const pressedNow = d.count < d.total || d.doneT < 0;
  if (pressedNow) setDeliveryCount(d.total);
  // (timed here, not by the HUD's clock: it settles even if the field is held)
  if (pressedNow || d.doneT < 300) yield 350;
}

/** Take the おとどけ strip away: it fades in `ms`. */
export function hideDeliveryCard(ms = 300): void {
  if (!deli) return;
  if (ms <= 0) {
    deli = null;
    return;
  }
  if (deli.outT >= 0) return;
  deli.outT = 0;
  deli.outMs = ms;
}

export function deliveryCardShowing(): boolean {
  return !!deli;
}

function updateDeliveryCard(dt: number): void {
  const d = deli;
  if (!d) return;
  d.t += dt;
  d.nextT += dt;
  if (d.doneT >= 0) d.doneT += dt;
  // finished and the delivery closed at the truck (〔しめ〕 writes flag_ch2_delivery): the strip goes
  if (d.doneT > 300 && d.outT < 0 && flag('flag_ch2_delivery')) hideDeliveryCard(300);
  if (d.outT >= 0) {
    d.outT += dt;
    if (d.outT >= d.outMs) deli = null;
  }
}

let slipC: HTMLCanvasElement | null = null;
/** The little yellow delivery slip (6×8): #FFD23F, ruled in 1px lines, a torn-off stub at the top. */
function slipImg(): HTMLCanvasElement {
  if (slipC) return slipC;
  const rows = ['cYcYcY', 'YYYYYY', 'YccccY', 'YYYYYY', 'YcccYY', 'YYYYYY', 'YccYYY', 'dddddd'];
  const pal: Record<string, string> = { Y: '#FFD23F', c: '#C8A06A', d: '#A8742A' };
  const [c, ctx] = makeCanvas(6, 8);
  rows.forEach((r, y) =>
    [...r].forEach((ch, x) => {
      ctx.fillStyle = pal[ch];
      ctx.fillRect(x, y, 1, 1);
    }),
  );
  slipC = c;
  return c;
}

function drawDeliveryCard(g: Gfx): void {
  const d = deli;
  if (!d) return;
  const inK = ease.cubicOut(Math.min(1, d.t / 180));
  const outK = d.outT >= 0 ? Math.min(1, d.outT / d.outMs) : 0;
  const a = inK * (1 - outK);
  if (a <= 0) return;
  const num = `${d.count}/${d.total}`;
  const row1 = textW('おとどけ') + 3 + digitsWidth(`${d.total}/${d.total}`) + SEAL_ROOM;
  const row2 = textW(NEXT_HEAD) + Math.max(textW(d.next), textW(TRUCK));
  const w = 16 + Math.max(row1, row2) + 4;
  const x = X - Math.round((1 - inK) * 12);
  g.alpha(a, () => {
    rectA(g, x + 2, Y + 2, w, DELI_H, UI.night, 0.3);
    drawTape(g, x, Y, w, DELI_H, '', { color: UI.tape, seed: 29 });
    g.img(slipImg(), x + 5, Y + Math.round((DELI_H - 8) / 2));
    const tx = x + 14;
    // row 1: おとどけ n/5 (the number hops for two frames when it goes up)
    let cx = tx + g.text('おとどけ', tx, Y, { color: UI.text }) + 3;
    const hop = d.t - d.bumpT < 34 ? 1 : 0;
    drawDigits(g, num, cx, Y + 6 - hop, { color: d.count >= d.total ? UI.accent : UI.text });
    cx += digitsWidth(num);
    // row 2: つぎ：name — rewritten in 0.2 s (the old name wiped off left to right, the new one written in)
    const ROW2 = Y + 15;
    const nx = tx + g.text(NEXT_HEAD, tx, ROW2, { color: UI.text });
    const clipText = (text: string, from: number, to: number) => {
      const tw = textW(text);
      g.clip(nx + Math.round(tw * from), Y + 14, Math.max(0, Math.round(tw * (to - from))), 18, () => g.text(text, nx, ROW2, { color: UI.text }));
    };
    if (d.nextT < 100 && d.prevNext) clipText(d.prevNext, d.nextT / 100, 1);
    else if (d.nextT < 200) clipText(d.next, 0, Math.max(0, (d.nextT - 100) / 100));
    else g.text(d.next, nx, ROW2, { color: UI.text });
    if (d.doneT >= 0) {
      // 「済」 comes down (1.4 → 1.0 in 4 frames) at the first row's right end
      const k = Math.min(1, d.doneT / 67);
      const s = 1.4 - 0.4 * ease.quadIn(k);
      const img = doneSeal();
      const sw = Math.round(10 * s);
      const sx = x + w - 15;
      g.ctx.drawImage(img, Math.round(sx + 5 - sw / 2), Math.round(Y + 9 - sw / 2), sw, sw);
    }
  });
}

/** The bottom edge (screen y) of the strip showing at the top left, or 0: the HUD's item notes go under it. */
export function choreStripBottom(): number {
  if (deli) return Y + DELI_H + 2;
  if (card) return Y + H + 2;
  return 0;
}
