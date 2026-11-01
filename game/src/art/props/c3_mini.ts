// The pictures of chapter 3's little games (62_ch3_level_art 13.6): the
// scenario's windows draw them (events/ch3). Every function returns a cached
// canvas; nothing here reads the game state.
//
//  - fuchoHand(n, who): a buyer's hand at the auction (S07), 32×32 — the
//    fingers up say the price (this town's own signs: 62 16.1 の5, nothing
//    taken from a real market's), the sleeve says whose hand it is;
//  - fuchoNote(n): a scrap of the master's sign notebook, 24×20 — yellowed
//    paper with the hand's shape drawn in pencil (what the sign means is
//    written in the window, not here);
//  - teishokuTray(items): the last 日替わり on its tray (S08), 128×72 — rice
//    and miso soup, and each dish that has come;
//  - lensView(lit, aim): the sea from the lamp room (S09), 384×216 — the
//    three marked buoys, the waves woken round those already lit, the beam
//    towards `aim` with its arrow.
//  - denpyoSlip(k): a collection slip from the corridor's wall (S16), 160×96 —
//    ツガオ便's form, the paper's age, whose hand (01〜12, 60 10.16), the
//    red-pencil corner where the note is (the note's words are the window's);
//  - nisshiScrap(k): a torn scrap of the keeper's diary (S18), 128×72 — the
//    same thick hand as the oldest slips (only the player may notice);
//  - fudaRack(order): the feeding-time tags on their rack (S19), 192×96 —
//    the four tags (9:00・11:00・12:00・15:00) hung in `order` (indexes into
//    FUDA_TIMES; missing ones leave an empty hook).

import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, valueNoise } from '../tiles/noise';
import { CP } from '../tiles/c3_ground';
import { outline } from './kit';
import { blend } from './ishell';
import { fontTextSmall } from './text';

function memo<K extends string | number>(make: (k: K) => HTMLCanvasElement): (k: K) => HTMLCanvasElement {
  const m = new Map<K, HTMLCanvasElement>();
  return (k) => {
    let c = m.get(k);
    if (!c) m.set(k, (c = make(k)));
    return c;
  };
}

// ---------------------------------------------------------------- the auction's hands

export type FuchoWho = 'namie' | 'hoshimi' | 'hirosuke' | 'other';

const SLEEVE: Record<FuchoWho, [string, string]> = {
  namie: ['#F4F1E8', '#C8C2B4'],
  hoshimi: ['#E8E4D8', '#B8B2A4'],
  hirosuke: ['#5A7A5A', '#3A5A3A'],
  other: ['#2F3A5A', '#1B2440'],
};
const SKIN = { base: '#D9A07A', shade: '#B87A5A', light: '#F2B894', dark: '#8A5A3A' };

/** A hand raised palm out, n fingers up (1–5; 5 = the open hand), the rest folded. */
function hand(n: number, who: FuchoWho): HTMLCanvasElement {
  const p = new PixelCanvas(32, 32);
  const [sl, sd] = SLEEVE[who];
  // the sleeve and the wrist
  p.rect(9, 25, 14, 7, sl);
  p.vline(22, 25, 31, sd);
  p.hline(9, 22, 25, mix(sl, '#FFFFFF', 0.3));
  p.rect(11, 20, 10, 5, SKIN.base);
  // the palm
  p.rect(9, 12, 14, 10, SKIN.base);
  p.vline(22, 12, 21, SKIN.shade);
  p.hline(9, 22, 21, SKIN.shade);
  p.hline(10, 21, 12, SKIN.light);
  // fingers: index, middle, ring, little (left to right), the thumb on the left
  const fx = [10, 13, 16, 19];
  const fl = [9, 10, 9, 7];
  const up = [n >= 1, n >= 2, n >= 3, n >= 4];
  for (let k = 0; k < 4; k++) {
    if (up[k]) {
      p.rect(fx[k], 12 - fl[k], 3, fl[k], SKIN.base);
      p.vline(fx[k] + 2, 12 - fl[k] + 1, 11, SKIN.shade);
      p.hline(fx[k], fx[k] + 2, 12 - fl[k], SKIN.light);
      p.set(fx[k] + 1, 12 - fl[k] + 1, '#F6D8C8');
    } else {
      // folded: the knuckle on the palm's top
      p.rect(fx[k], 10, 3, 3, SKIN.shade);
      p.hline(fx[k], fx[k] + 2, 10, SKIN.base);
    }
  }
  // the thumb: out to the side for 5, folded across the palm otherwise
  if (n >= 5) {
    p.rect(4, 15, 6, 3, SKIN.base);
    p.hline(4, 9, 15, SKIN.light);
    p.hline(4, 9, 17, SKIN.shade);
  } else {
    p.rect(9, 16, 6, 3, SKIN.shade);
    p.hline(9, 14, 16, SKIN.base);
  }
  // the lines of the palm
  p.line(12, 18, 18, 15, SKIN.shade);
  outline(p, { ink: '#3A2A22', bottom: false, soft: false });
  return p.toCanvas();
}

const handMemo = memo((k: string) => {
  const [n, who] = k.split('|');
  return hand(Number(n), who as FuchoWho);
});

/** A buyer's hand sign at the auction (S07): n fingers up (1–5), the sleeve of `who`. 32×32. */
export function fuchoHand(n: number, who: FuchoWho = 'other'): HTMLCanvasElement {
  return handMemo(`${Math.max(1, Math.min(5, Math.round(n)))}|${who}`);
}

/** A scrap of the master's sign notebook (S07): yellowed paper, the hand's shape in pencil. 24×20. */
export const fuchoNote = memo((n: number) => {
  const p = new PixelCanvas(24, 20);
  // the torn paper
  for (let y = 0; y < 20; y++)
    for (let x = 0; x < 24; x++) {
      const torn = (y === 0 && h01(x, 0, 3801 + n) < 0.4) || (x === 23 && h01(0, y, 3803 + n) < 0.4);
      if (torn) continue;
      p.set(x, y, valueNoise(x / 5, y / 5, 3805 + n) > 0.7 ? '#E8D9B5' : '#F2E6C8');
    }
  // the ruled lines, the hand drawn small: the fingers up as strokes over a palm
  for (let y = 4; y < 20; y += 4) p.hline(1, 22, y, '#E0D0A8');
  const pen = '#5A5E66';
  p.rect(6, 11, 6, 5, pen);
  p.rect(7, 12, 4, 3, '#F2E6C8');
  for (let k = 0; k < 4; k++) {
    if (k < Math.min(4, n)) p.vline(7 + k, 6 + (k === 3 ? 2 : 0), 11, pen);
    else p.set(7 + k, 11, pen);
  }
  if (n >= 5) p.hline(3, 6, 13, pen);
  // the master's tick beside it, the price strokes
  p.line(15, 9, 16, 11, '#C8452E');
  p.line(16, 11, 19, 6, '#C8452E');
  for (let k = 0; k < n; k++) p.vline(14 + k * 2, 14, 17, pen);
  return p.toCanvas();
});

// ---------------------------------------------------------------- the last 日替わり (S08)

export type TeishokuItem = 'sakana' | 'himono' | 'tofu' | 'tomato' | 'coffee';

/** The tray with rice, miso soup and the dishes that have come (in the order given). 128×72. */
export function teishokuTray(items: TeishokuItem[]): HTMLCanvasElement {
  return trayMemo([...new Set(items)].sort().join(','));
}

const trayMemo = memo((key: string) => {
  const items = new Set(key ? key.split(',') : []);
  const p = new PixelCanvas(128, 72);
  // the tray: lacquered red-brown, its rim lit on the top edge
  p.rect(2, 8, 124, 62, '#7A2E22');
  p.rect(4, 10, 120, 58, '#9A3A2A');
  p.hline(2, 125, 8, '#C8604A');
  p.hline(2, 125, 69, '#4A1A14');
  for (let x = 6; x < 122; x += 9) p.vline(x, 12, 66, '#8A3426');
  const bowl = (cx: number, cy: number, rx: number, ry: number, rim: string, food: string, foodLt: string) => {
    p.ellipse(cx, cy + 2, rx, ry, '#3A2A22');
    p.ellipse(cx, cy, rx, ry, rim);
    p.ellipse(cx, cy - 1, rx - 2, ry - 2, food);
    p.ellipse(cx - 2, cy - 2, Math.max(1, rx - 6), Math.max(1, ry - 4), foodLt);
  };
  // rice (front left), miso soup (front right)
  bowl(26, 52, 13, 9, '#F4F1E8', '#FFFFFF', '#FFFFFF');
  for (let k = 0; k < 8; k++) p.set(20 + ((k * 5) % 12), 48 + ((k * 3) % 6), '#E8E4D8');
  bowl(102, 52, 13, 9, '#5A2A1A', '#B8863A', '#D8A85A');
  p.set(98, 50, '#3FA66B');
  p.set(104, 51, '#F4F1E8');
  // the dishes that have come
  if (items.has('sakana')) {
    // the simmered fish on a long plate (the middle back)
    p.ellipse(64, 26, 22, 8, '#3A2A22');
    p.ellipse(64, 24, 22, 8, '#E8E4D8');
    p.ellipse(64, 24, 15, 5, '#8A5A2A');
    p.ellipse(62, 22, 10, 2, '#B8803A');
    p.poly([[79, 24], [86, 19], [86, 29]], '#7A4A20');
    p.set(52, 23, '#2A2440');
  }
  if (items.has('himono')) {
    // the dried horse mackerel, just right (the front middle)
    p.ellipse(64, 54, 14, 8, '#3A2A22');
    p.ellipse(64, 52, 14, 8, '#F4F1E8');
    p.ellipse(64, 52, 10, 5, '#C89A6A');
    p.ellipse(64, 52, 7, 3, '#E8C8A0');
    p.vline(64, 48, 56, '#A87A4A');
  }
  if (items.has('tofu')) {
    // the tofu in its small bowl, the corners sharp
    bowl(20, 24, 10, 7, '#2F4A8A', '#2F4A8A', '#2F4A8A');
    p.rect(16, 19, 8, 6, '#F4F1E8');
    p.hline(16, 23, 19, '#FFFFFF');
    p.set(18, 18, '#3FA66B');
  }
  if (items.has('tomato')) {
    // 星見台のトマト, quartered
    bowl(108, 24, 10, 7, '#F4F1E8', '#F4F1E8', '#F4F1E8');
    for (const [x, y] of [[104, 22], [110, 21], [107, 26]] as const) {
      p.ellipse(x, y, 3, 2, '#E23B2E');
      p.set(x, y - 1, '#FF8A6A');
    }
  }
  if (items.has('coffee')) {
    // the coffee after the meal, just off the tray's edge
    p.ellipse(118, 6, 8, 4, '#E8E4D8');
    p.ellipse(118, 4, 6, 3, '#F4F1E8');
    p.ellipse(118, 4, 4, 2, '#3A2418');
    p.set(117, 3, '#7A5A3A');
  }
  // the chopsticks on their rest
  p.line(30, 66, 96, 62, '#C8A06A');
  p.line(30, 67, 96, 63, '#A87A4A');
  p.rect(44, 64, 4, 3, '#F4F1E8');
  return p.toCanvas();
});

// ---------------------------------------------------------------- the lens (S09)

/** The three marked spots on the sea (in the picture): the harbour's mouth, outside the breakwater, off the beach. */
export const LENS_SPOTS_PX: [number, number][] = [
  [70, 150],
  [190, 176],
  [312, 150],
];

/**
 * The sea from the lamp room (S09): the gallery's rail in front, the still
 * mirror of the sea under the noon sky, the breakwater and the beach far
 * off, the three buoys with their marks; round each spot already lit (`lit`)
 * the sea moves again; the beam of the lens towards `aim` (−1: none) with an
 * arrow where it will fall. 384×216.
 */
export function lensView(lit: number, aim: number): HTMLCanvasElement {
  return lensMemo(`${Math.max(0, Math.min(3, lit))}|${aim}`);
}

const lensMemo = memo((key: string) => {
  const [litS, aimS] = key.split('|');
  const lit = Number(litS);
  const aim = Number(aimS);
  const W = 384;
  const H = 216;
  const p = new PixelCanvas(W, H);
  const hz = 40;
  // the sky and the horizon
  for (let y = 0; y < hz; y++) for (let x = 0; x < W; x++) p.set(x, y, mix(CP.skyTop, CP.skyBot, y / hz));
  for (const [cx, cy, rx] of [[80, 14, 14], [92, 12, 9], [300, 20, 18]] as const) p.ellipse(cx, cy, rx, 3, '#FFFFFF');
  // a far island
  p.poly([[250, hz], [262, hz - 6], [276, hz - 7], [290, hz]], '#6B8A8A');
  // the sea: the mirror, a band of the sky's colour laid in, darker nearer
  for (let y = hz; y < H; y++)
    for (let x = 0; x < W; x++) {
      const t = (y - hz) / (H - hz);
      let c = mix('#8CC4EC', CP.umiDk, Math.min(1, t * 1.3));
      if (valueNoise(x / 90, y / 8, 3811) > 0.72) c = mix(c, '#E8F4FA', 0.35);
      p.set(x, y, c);
    }
  p.hline(0, W - 1, hz, '#E8F4FA');
  // the breakwater running out from the left, the beach on the right
  p.poly([[0, 120], [150, 118], [150, 124], [0, 128]], '#C8C4B8');
  p.hline(0, 150, 118, '#E8E4D8');
  p.poly([[300, 96], [W, 92], [W, 118], [330, 112]], CP.sand);
  p.hline(300, W - 1, 96, CP.sandLt);
  // the waves woken round the spots already lit (and the whole beach's sea after the third)
  const moving = (x: number, y: number) => {
    if (lit >= 3 && x > 260 && y > 100) return true;
    for (let k = 0; k < Math.min(3, lit); k++) {
      const [sx, sy] = LENS_SPOTS_PX[k];
      if (Math.hypot(x - sx, (y - sy) * 2) < 46) return true;
    }
    return false;
  };
  for (let y = hz + 4; y < H; y += 5)
    for (let x = (y * 7) % 11; x < W; x += 11) {
      if (!moving(x, y)) continue;
      const len = 4 + ((x + y) % 4);
      p.hline(x, x + len, y, CP.umiLt);
      if ((x + y) % 3 === 0) p.set(x + 1, y - 1, '#F4F1E8');
    }
  // the buoys with their marks (yellow, a red flag); lit ones with a ring of light
  for (const [k, [bx, by]] of LENS_SPOTS_PX.entries()) {
    p.ellipse(bx, by + 3, 6, 2, mix(CP.umiDk, '#000000', 0.2));
    p.ellipse(bx, by, 4, 4, '#FFD23F');
    p.hline(bx - 3, bx + 3, by - 2, '#FFF6D8');
    p.vline(bx, by - 12, by - 4, '#3A3F48');
    p.rect(bx + 1, by - 12, 5, 3, '#E84E3C');
    if (k < lit) p.ring(bx, by + 1, 12, 5, '#FFF6D8');
  }
  // the beam from the lens (top centre) to the aimed spot, and the arrow
  if (aim >= 0 && aim < 3) {
    const [ax, ay] = LENS_SPOTS_PX[aim];
    const sx = 192;
    const sy = 214;
    for (let i = 0; i <= 100; i++) {
      const t = i / 100;
      const x = Math.round(sx + (ax - sx) * t);
      const y = Math.round(sy + (ay - sy) * t);
      const w = Math.round(3 - t * 1.5);
      for (let d = -w; d <= w; d++) if (((x + d + y) & 1) === 0 || Math.abs(d) < 1) blend(p, x + d, y, '#FFF6D8', 0.55);
    }
    // the arrow over the spot
    p.poly([[ax - 6, ay - 26], [ax + 6, ay - 26], [ax, ay - 18]], '#E23B2E');
    p.rect(ax - 2, ay - 34, 5, 8, '#E23B2E');
  }
  // the gallery's rail in front (white iron), the lamp room's glass frame at the edges
  p.rect(0, 200, W, 3, '#E8E4D8');
  p.hline(0, W - 1, 200, '#FFFFFF');
  for (let x = 6; x < W; x += 24) p.vline(x, 203, 215, '#C8C2B4');
  p.rect(0, 0, 6, H, '#3A3F48');
  p.rect(W - 6, 0, 6, H, '#3A3F48');
  return p.toCanvas();
});


// ---------------------------------------------------------------- 回廊の 伝票・飼育日誌・えさの 札 (S16・S18・S19)

/** Whose hand each of the twelve slips is in (60 10.16): t = ツガオ (thick), h = ヒロスケ (thin), p = ポコシャ (round). */
const DENPYO_HAND = ['t', 't', 't', 't', 'h', 'h', 't', 'p', 'p', 't', 't', 'p'] as const;

/** Thick, thin or round strokes in a box (the hand, not letters). */
function handStrokes(p: PixelCanvas, x: number, y: number, w: number, rows: number, hand: 't' | 'h' | 'p', seed: number): void {
  for (let r = 0; r < rows; r++) {
    let cx = x;
    const yy = y + r * 8;
    while (cx < x + w - 6) {
      const len = 3 + Math.floor(h01(cx, yy, seed) * 6);
      if (hand === 't') {
        p.rect(cx, yy, len, 2, '#1B1733');
        if (h01(cx, yy, seed + 1) > 0.6) p.rect(cx + 1, yy - 2, 2, 2, '#1B1733');
      } else if (hand === 'h') {
        p.hline(cx, cx + len, yy, '#3A3F48');
        if (h01(cx, yy, seed + 1) > 0.5) p.line(cx + 1, yy - 3, cx + 2, yy, '#3A3F48');
      } else {
        p.ring(cx + 2, yy, 2, 2, '#3A3F48');
        if (len > 5) p.ring(cx + 6, yy, 2, 2, '#3A3F48');
      }
      cx += len + 3;
    }
  }
}

/** A slip of the corridor's wall, close up (k = 1..12; 13 = the blank day). */
export const denpyoSlip = memo((k: number): HTMLCanvasElement => {
  const W = 160;
  const H = 96;
  const p = new PixelCanvas(W, H);
  const blank = k === 13;
  const age = blank ? 1 : (k - 1) / 11;
  const paper = blank ? '#FFFFFF' : mix('#E8D9B5', '#F4F1E8', age);
  p.rect(2, 2, W - 4, H - 4, paper);
  // the paper's age: foxing and a bent corner
  for (let y = 2; y < H - 2; y++)
    for (let x = 2; x < W - 2; x++) if (!blank && valueNoise(x / 9, y / 9, 7401 + k) > 0.78 - (1 - age) * 0.1) blend(p, x, y, '#C8A06A', 0.18);
  p.poly([[W - 14, 2], [W - 2, 2], [W - 2, 14]], mix(paper, '#8A7A60', 0.3));
  // ツガオ便's form: the title band, the boxes (date, from, to, goods), the stamp circle
  const ink = '#C8452E';
  p.rect(6, 6, W - 12, 10, mix(paper, ink, 0.15));
  p.hline(6, W - 7, 16, ink);
  for (const [x, y, w, h] of [[6, 20, 46, 14], [56, 20, 98, 14], [6, 38, 148, 14], [6, 56, 100, 30]] as const) p.strokeRect(x, y, w, h, ink);
  p.ring(132, 70, 12, 12, mix(paper, ink, 0.5));
  if (!blank) {
    const hand = DENPYO_HAND[(k - 1) % 12];
    handStrokes(p, 10, 27, 40, 1, hand, 7403 + k);
    handStrokes(p, 60, 27, 90, 1, hand, 7405 + k);
    handStrokes(p, 10, 45, 140, 1, hand, 7407 + k);
    // the note in the corner box, ticked in red pencil (its words are the window's)
    handStrokes(p, 10, 64, 92, 3, hand, 7409 + k);
    p.line(108, 58, 112, 84, '#E84E3C');
    p.line(109, 58, 113, 84, '#E84E3C');
    // ツガオ便's own stamp in the circle (black, an old one)
    p.ring(132, 70, 9, 9, '#2A2440');
    p.hline(128, 136, 70, '#2A2440');
  } else {
    // only the date's box ruled; a slanting light falls on the white
    for (let y = 2; y < H - 2; y++) for (let x = 2; x < W - 2; x++) if (x - y * 0.4 > 70 && x - y * 0.4 < 110 && (x + y) % 2 === 0) blend(p, x, y, '#FFF6D8', 0.35);
  }
  outline(p, { soft: true });
  return p.toCanvas();
});

/** A scrap of the keeper's diary (k = 1..6): torn edges, a ruled page, ツガオ's thick strokes. */
export const nisshiScrap = memo((k: number): HTMLCanvasElement => {
  const W = 128;
  const H = 72;
  const p = new PixelCanvas(W, H);
  const paper = '#E8D9B5';
  for (let y = 4; y < H - 4; y++)
    for (let x = 4; x < W - 4; x++) {
      // the torn edge: in by a few px, ragged
      const edge = 4 + Math.floor(valueNoise(x / 3, y / 3, 7411 + k) * 6);
      if (x < edge || x > W - edge || y < edge - 2 || y > H - edge + 1) continue;
      let c = paper;
      if ((y - 6) % 10 === 0) c = '#B8C8D8';
      if (valueNoise(x / 12, y / 12, 7413 + k) > 0.74) c = mix(c, '#A8742A', 0.25);
      p.set(x, y, c);
    }
  handStrokes(p, 14, 21, 100, 4, 't', 7415 + k);
  outline(p, { soft: true });
  return p.toCanvas();
});

/** The feeding times on the tags (60 10.19). */
export const FUDA_TIMES = ['9:00', '11:00', '12:00', '15:00'] as const;

/** The tag rack, close up: tags hung in `order` (indexes into FUDA_TIMES), the empty hooks after them. */
export function fudaRack(order: number[]): HTMLCanvasElement {
  const W = 192;
  const H = 96;
  const p = new PixelCanvas(W, H);
  // the board on the wall
  p.rect(0, 0, W, H, '#C4C8C0');
  p.rect(8, 8, W - 16, 22, '#8A6A4A');
  p.hline(8, W - 9, 8, '#A88A62');
  p.hline(8, W - 9, 29, '#5A4A3A');
  for (let i = 0; i < 4; i++) {
    const hx = 30 + i * 44;
    p.rect(hx - 1, 26, 3, 6, '#9AA0A8');
    const t = order[i];
    if (t === undefined) continue;
    // a wooden tag on its string, the time in black
    p.line(hx, 30, hx, 36, '#5A4A3A');
    p.rect(hx - 16, 36, 32, 44, '#D8C8A0');
    p.hline(hx - 16, hx + 15, 36, '#E8D9B5');
    p.hline(hx - 16, hx + 15, 79, '#A89870');
    p.vline(hx + 15, 37, 79, '#A89870');
    p.ring(hx, 40, 2, 2, '#8A6A4A');
    const label = FUDA_TIMES[t];
    const lw = label.length * 6;
    fontTextSmall(p, label, hx - Math.floor(lw / 2), 54, '#2A2440', 1);
  }
  outline(p, { soft: true });
  return p.toCanvas();
}
