// ふくじんづけと 耳の あいさつ（02_ch2_index #95、52 7.12）の 絵：
//   dogFace(ear, eye)  耳あわせの 大写しの ふくじんづけ（オスの パピヨン、32×32 の 写真。2倍で 出す）：
//     タンの 顔に 白い 鼻すじ、ちょうちょの 羽のような 大きな 耳（内がわは 桃色、外の ふちに 白い 飾り毛）。
//     ear：'up' 立てる／'side' 横に 開く／'down' うしろに 寝かせる。eye：'open'／'wink'（片目を 閉じる）。
//   earMark(kind)  耳の 形の 小さな しるし（12×9。みました帳の『上・横・下』と 大写しの 合図）。
// 色は 52 10.4 の ふくじんづけ（art/chars/hoshi_dog.ts）と 同じ。

import { PixelCanvas } from '../../engine/pixel';

const WHITE = '#F4F1E8';
const WHITE_S = '#C8C2B4';
const TAN = '#A8742A';
const TAN_S = '#7A5424';
const TAN_L = '#C8A06A';
const INNER = '#E8A08C';
const NOSE = '#2A2440';
const OUT = '#3A2B24';
const SKY_T = '#7A76B0';
const SKY_B = '#B08AA8';

export type DogEar = 'up' | 'side' | 'down';

const cache = new Map<string, HTMLCanvasElement>();

/** The dog's face for the ear game (32×32). */
export function dogFace(ear: DogEar, eye: 'open' | 'wink' = 'open'): HTMLCanvasElement {
  const key = `${ear}:${eye}`;
  let c = cache.get(key);
  if (c) return c;
  c = drawFace(ear, eye).toCanvas();
  cache.set(key, c);
  return c;
}

/** Ear triangles (left side; the right is mirrored): [base inner, base outer, tip]. */
const EARS: Record<DogEar, [number, number][]> = {
  up: [[13, 12], [8, 16], [4, 1]],
  side: [[11, 13], [9, 19], [0, 9]],
  down: [[13, 13], [10, 21], [1, 25]],
};

function drawFace(ear: DogEar, eye: 'open' | 'wink'): PixelCanvas {
  const p = new PixelCanvas(32, 32);
  // the night behind (the barn's floor light, a soft violet)
  for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.set(x, y, (x + y) % 2 === 0 && y > 16 ? SKY_B : y > 22 ? SKY_B : SKY_T);
  const mir = (pts: [number, number][]): [number, number][] => pts.map(([x, y]) => [31 - x, y]);
  // ---- the ears (behind the head)
  for (const side of [0, 1]) {
    const t = side ? mir(EARS[ear]) : EARS[ear];
    p.poly(t, TAN);
    // the pink inside: a smaller triangle towards the base
    const [a, b, tip] = t;
    const inner: [number, number][] = [
      [Math.round((a[0] * 3 + tip[0]) / 4), Math.round((a[1] * 3 + tip[1]) / 4)],
      [Math.round((b[0] * 3 + tip[0]) / 4), Math.round((b[1] * 3 + tip[1]) / 4)],
      [Math.round((a[0] + b[0] + tip[0] * 2) / 4), Math.round((a[1] + b[1] + tip[1] * 2) / 4)],
    ];
    p.poly(inner, INNER);
    // the fringe: long white hairs along the outer edge, from the tip down
    for (let k = 0; k <= 6; k++) {
      const x = Math.round(tip[0] + ((b[0] - tip[0]) * k) / 6);
      const y = Math.round(tip[1] + ((b[1] - tip[1]) * k) / 6);
      const dx = side ? 1 : -1;
      p.set(x + dx, y, WHITE);
      if (k % 2 === 0) p.set(x + dx * 2, y + (ear === 'up' ? 0 : 1), WHITE);
    }
    p.set(tip[0], tip[1], WHITE);
  }
  // ---- the head: tan, round
  p.ellipse(16, 18, 8, 7, TAN);
  p.ellipse(15, 15, 5, 3, TAN_L);
  // the white blaze from the brow down to the muzzle
  for (let y = 11; y <= 25; y++) {
    const w = y < 16 ? 0 : y < 20 ? 1 : 3;
    p.hline(16 - w, 16 + w - (w ? 0 : 0), y, WHITE);
  }
  p.ellipse(16, 24, 4, 2.5, WHITE);
  p.hline(13, 19, 26, WHITE_S);
  // the cheeks' shadow
  p.set(9, 21, TAN_S);
  p.set(23, 21, TAN_S);
  p.set(10, 23, TAN_S);
  p.set(22, 23, TAN_S);
  // nose and mouth
  p.rect(15, 22, 3, 2, NOSE);
  p.set(16, 21, NOSE);
  p.set(15, 25, TAN_S);
  p.set(17, 25, TAN_S);
  // eyes: dark and round, a glint; the wink closes the left one into a line
  const eyeAt = (x: number, shut: boolean) => {
    if (shut) {
      p.hline(x - 1, x + 1, 19, NOSE);
      p.set(x - 2, 18, NOSE);
      return;
    }
    p.rect(x - 1, 17, 3, 3, NOSE);
    p.set(x, 17, WHITE);
  };
  eyeAt(12, eye === 'wink');
  eyeAt(20, false);
  // the chest frill at the bottom
  for (let x = 8; x <= 24; x++) p.set(x, 30 - (x % 3 === 0 ? 1 : 0), WHITE);
  p.rect(9, 31, 15, 1, WHITE);
  p.outline(OUT);
  return p;
}

const markCache = new Map<string, HTMLCanvasElement>();

/** A little sign of an ear's shape (12×9): one ear standing, out to the side, or laid back. */
export function earMark(kind: DogEar, col = TAN): HTMLCanvasElement {
  const key = `${kind}:${col}`;
  let c = markCache.get(key);
  if (c) return c;
  const p = new PixelCanvas(12, 9);
  p.ellipse(6, 7, 3, 2, col);
  const t: Record<DogEar, [number, number][]> = {
    up: [[4, 5], [7, 5], [5, 0]],
    side: [[3, 5], [4, 8], [0, 3]],
    down: [[3, 6], [4, 8], [0, 8]],
  };
  p.poly(t[kind], col);
  p.poly(t[kind].map(([x, y]) => [11 - x, y] as [number, number]), col);
  c = p.toCanvas();
  markCache.set(key, c);
  return c;
}

// ---------------------------------------------------------------- グソっ君の 頭（耳の 板つき）

const OCHRE = '#D49A5C';
const OCHRE_D = '#A8693A';
const OCHRE_L = '#EBBF86';
const PLATE = '#B87842';
const PLATE_L = '#E0A868';
const BAND = '#FBF3DC';
const BAND_S = '#E8D9B5';
const EYE = '#1B1733';
const CHEEK = '#F08A7A';
const TUSK = '#F0CB98';

/** The ear plates (left one; the right is mirrored): up and out, straight out, laid back down. */
const PLATES: Record<DogEar, [number, number][]> = {
  up: [[9, 14], [4, 4], [8, 2], [12, 11]],
  side: [[9, 14], [1, 12], [1, 18], [9, 20]],
  down: [[9, 18], [3, 28], [7, 30], [12, 21]],
};

const headCache = new Map<string, HTMLCanvasElement>();

/**
 * グソっ君's head for the ear game (40×36, drawn 2×): the ochre round head with the white headband,
 * big black eyes, pink cheeks, the two long ones from under the nose, and the ear plates set big
 * and clear at its sides (30 9.2's look). mood: 'normal' | 'happy' (そろった) | 'sad' (まちがえた).
 */
export function kaneHead(ear: DogEar, mood: 'normal' | 'happy' | 'sad' = 'normal'): HTMLCanvasElement {
  const key = `${ear}:${mood}`;
  let c = headCache.get(key);
  if (c) return c;
  const p = new PixelCanvas(40, 36);
  const cx = 20;
  const cy = 18;
  // the plates first (the head over their roots)
  for (const s of [0, 1]) {
    const pts = PLATES[ear].map(([x, y]) => [s ? 39 - x : x, y] as [number, number]);
    p.poly(pts, PLATE);
    // a light edge along the top
    const [a, b] = [pts[1], pts[2]];
    p.line(a[0], a[1], b[0], b[1], PLATE_L);
  }
  // shoulders and the striped tummy at the bottom
  p.ellipse(cx, 37, 15, 7, OCHRE);
  for (const y of [32, 35]) p.hline(cx - 13, cx + 13, y, OCHRE_D);
  // the head: round, lit from the upper left
  p.ellipse(cx, cy, 12, 10.5, OCHRE);
  for (let y = cy - 10; y <= cy + 10; y++)
    for (let x = cx - 12; x <= cx + 12; x++) {
      const dx = (x - cx) / 12;
      const dy = (y - cy) / 10.5;
      if (dx * dx + dy * dy > 1) continue;
      if (dx + dy > 0.95) p.set(x, y, OCHRE_D);
      else if (dx + dy < -1.0) p.set(x, y, OCHRE_L);
    }
  // the headband across the brow
  for (let x = cx - 12; x <= cx + 12; x++)
    for (let j = 0; j < 4; j++) {
      const y = cy - 7 + j + Math.round((cx - x) * 0.06);
      const dx = (x - cx) / 12;
      const dy = (y - cy) / 10.5;
      if (dx * dx + dy * dy <= 1.02) p.set(x, y, j === 3 ? BAND_S : BAND);
    }
  // eyes
  for (const ex of [cx - 5, cx + 5]) {
    if (mood === 'happy') {
      p.hline(ex - 2, ex + 2, cy, EYE);
      p.set(ex - 2, cy + 1, EYE);
      p.set(ex + 2, cy + 1, EYE);
    } else {
      p.rect(ex - 2, cy - 1, 5, 5, EYE);
      p.set(ex - 2, cy - 1, OCHRE);
      p.set(ex + 2, cy - 1, OCHRE);
      p.set(ex - 2, cy + 3, OCHRE);
      p.set(ex + 2, cy + 3, OCHRE);
      if (mood === 'sad') p.hline(ex - 2, ex + 2, cy - 1, OCHRE_D);
      else p.rect(ex, cy - 1, 2, 2, '#FFFFFF');
    }
  }
  // cheeks
  p.hline(cx - 10, cx - 8, cy + 4, CHEEK);
  p.hline(cx + 8, cx + 10, cy + 4, CHEEK);
  // the two long ones, hanging over the tummy
  p.line(cx - 2, cy + 5, cx - 3, cy + 15, TUSK);
  p.line(cx + 2, cy + 5, cx + 3, cy + 15, TUSK);
  p.set(cx - 3, cy + 16, OUT);
  p.set(cx + 3, cy + 16, OUT);
  p.outline(OUT);
  c = p.toCanvas();
  headCache.set(key, c);
  return c;
}
