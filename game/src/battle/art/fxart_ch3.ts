// 第3章の 戦闘の 小物の 絵（61 9.1・10.7・11.7・6.1・6.2・17.6〜17.8）：
// 値札、おかわりの 皿、空の どんぶり、いただきます・ごちそうさまの 判、
// 黒い 判「まだ」、巻きもどしの 時計の 針。

import { PixelCanvas, makeCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { ovalStamp } from './stamps';

const INK = '#2A2440';
const SHU = '#E23B2E';

let tagC: HTMLCanvasElement | null = null;
/** The wooden price tag ネフダマヨイ throws (10×8): a worn corner, a stroke of ink. */
export function priceTag(): HTMLCanvasElement {
  if (tagC) return tagC;
  const p = new PixelCanvas(10, 8);
  p.rect(0, 0, 10, 8, '#D8B878');
  p.hline(0, 9, 0, '#F2D8A0');
  p.hline(0, 9, 7, '#A88848');
  p.vline(9, 1, 7, '#A88848');
  p.set(0, 0, 'transparent');
  p.set(9, 7, 'transparent');
  p.hline(2, 6, 3, INK);
  p.set(7, 3, INK);
  p.hline(3, 5, 5, INK);
  p.outline(INK);
  tagC = p.toCanvas();
  return tagC;
}

let dishC: HTMLCanvasElement | null = null;
/** おかわりの 皿 (14×8): a white plate heaped with the stew, a thread of steam. */
export function okawariDish(): HTMLCanvasElement {
  if (dishC) return dishC;
  const p = new PixelCanvas(14, 8);
  p.ellipse(7, 6, 6, 2, '#F4F1E8');
  p.hline(2, 11, 7, '#C8C2B4');
  p.ellipse(7, 4, 4, 2, '#8A5A2A');
  p.hline(5, 8, 3, '#C8884A');
  p.set(6, 0, '#F4F1E8');
  p.set(7, 1, '#F4F1E8');
  p.set(6, 2, '#F4F1E8');
  p.outline(INK);
  dishC = p.toCanvas();
  return dishC;
}

let bowlC: HTMLCanvasElement | null = null;
/** ごちそうさまの 空の どんぶり (20×12, 61 6.2): no steam, a pair of chopsticks laid across. */
export function emptyBowl(): HTMLCanvasElement {
  if (bowlC) return bowlC;
  const p = new PixelCanvas(22, 13);
  // the bowl
  for (let y = 4; y < 12; y++) {
    const half = Math.round(10 - (y - 4) * 0.9);
    p.hline(11 - half, 10 + half, y, y < 6 ? '#F4F1E8' : y < 10 ? '#E8E4D8' : '#C8C2B4');
  }
  p.hline(1, 20, 4, '#FFFFFF');
  p.hline(3, 18, 5, '#C8C2B4');
  // a blue band round it
  p.hline(4, 17, 8, '#4A6AB0');
  // the foot
  p.hline(7, 14, 12, '#9AA0A8');
  // chopsticks across the rim
  p.line(2, 2, 19, 4, '#C08A38');
  p.line(3, 1, 20, 3, '#A8742A');
  p.outline(INK);
  bowlC = p.toCanvas();
  return bowlC;
}

const sealCache = new Map<string, HTMLCanvasElement>();

/**
 * いただきます (88×36, 61 6.1): the big oval with a pair of hands pressed
 * together under it (朱 line art, 12×10).
 */
export function itadakiSeal(worn = 0): HTMLCanvasElement {
  const key = 'ita:' + worn;
  let c = sealCache.get(key);
  if (c) return c;
  const oval = ovalStamp('いただきます', 88, 36, worn, 11);
  const [cv, ctx] = makeCanvas(oval.width, oval.height + 12);
  ctx.drawImage(oval, 0, 0);
  const p = new PixelCanvas(12, 11);
  // two hands pressed together, the fingertips up
  for (const [x0, dir] of [[5, -1], [6, 1]] as [number, number][]) {
    p.vline(x0, 0, 8, SHU);
    p.line(x0, 0, x0 + dir * 2, 3, SHU);
    p.line(x0 + dir * 2, 3, x0 + dir * 3, 8, SHU);
    p.line(x0 + dir * 3, 8, x0 + dir, 10, SHU);
  }
  ctx.drawImage(p.toCanvas(), Math.round(oval.width / 2 - 6), oval.height);
  sealCache.set(key, cv);
  return cv;
}

/** ごちそうさま (88×36, 61 6.2): the oval with two chopsticks laid down at its lower right. */
export function gochisouSeal(worn = 0): HTMLCanvasElement {
  const key = 'goc:' + worn;
  let c = sealCache.get(key);
  if (c) return c;
  const oval = ovalStamp('ごちそうさま', 88, 36, worn, 13);
  const [cv, ctx] = makeCanvas(oval.width + 8, oval.height + 4);
  ctx.drawImage(oval, 0, 0);
  ctx.fillStyle = SHU;
  for (let i = 0; i < 18; i++) {
    ctx.fillRect(oval.width - 20 + i, oval.height - 6 + Math.round(i * 0.25), 1, 1);
    ctx.fillRect(oval.width - 21 + i, oval.height - 3 + Math.round(i * 0.25), 1, 1);
  }
  sealCache.set(key, cv);
  return cv;
}

const madaCache = new Map<string, HTMLCanvasElement>();
/**
 * ツガオの 黒い 判「まだ」(62 11.6): a black oval, worn, the left half of 「ま」
 * missing. `w`×`h` (10×8 on a small enemy). `broken`: split in two (it falls).
 */
export function madaMark(w = 10, h = 8, seed = 3): HTMLCanvasElement {
  const key = `${w}:${h}:${seed}`;
  let c = madaCache.get(key);
  if (c) return c;
  const p = new PixelCanvas(w, h);
  const cx = (w - 1) / 2;
  const cy = (h - 1) / 2;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x - cx) / (w / 2);
      const dy = (y - cy) / (h / 2);
      const d = dx * dx + dy * dy;
      if (d > 1) continue;
      const rim = d > 0.55;
      if (rim && hash2(x, y, seed) < 0.18) continue;
      if (!rim && hash2(x, y, seed + 7) < 0.1) continue;
      p.set(x, y, rim ? '#1B1733' : '#0B0B14');
    }
  // 「ま」 in the paper's colour, its left half worn away
  const mx = Math.round(cx);
  const my = Math.round(cy);
  p.hline(mx, mx + 2, my - 2, '#C8C2B4');
  p.hline(mx, mx + 2, my, '#C8C2B4');
  p.vline(mx + 1, my - 3, my + 2, '#C8C2B4');
  p.set(mx + 2, my + 2, '#C8C2B4');
  c = p.toCanvas();
  madaCache.set(key, c);
  return c;
}
