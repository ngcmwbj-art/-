// Minato's 64×64 tsukkomi close-up: the photo that slides in during the
// nori-tsukkomi (portrait('minato', 'tsukkomi', { size: 64 })). Drawn at 64
// rather than doubled from the 32×32 face, so it sits at the same 1x pixel
// density as the rest of the battle screen. Same boy as the small face —
// bed-head, oversized green tee with the mystery fish, blue key string, the
// net hoop behind his head — with room for the moment itself: brows slammed
// down, eyes narrowed at the boke on the right, mouth wide open mid-shout,
// a red anger mark on the hair, a flush on the cheeks, the ahoge stiff as a
// lightning bolt and his hand up in the chop, on a burst of speed lines.

import { PixelCanvas, mix } from '../../engine/pixel';
import { Fig, flat, mat, type Mats } from './fig';
import { registerPortrait } from './registry';
import { MIN } from './portraits';
import { C } from './palette';

const S = 64;

const M64: Mats = {
  ...MIN,
  // a darker coloured outline than the 32 face: at 64 the skin has to hold
  // its edge against the burst behind it
  skin: mat('#FFD9B8', { shade: '#EBB08E', light: '#FFEBD8', dark: '#C98A6A', rim: '#FFC08E', ol: '#8A5A3A' }),
  hoop: mat('#C8A06A', { shade: '#A8742A', light: '#F6D98A', dark: '#8A5A3A' }),
  net: flat('#F4F1E8'),
  collar: mat('#2E6B4A', { shade: '#245A44', light: '#3FA66B', dark: '#1B3A30' }),
  print: flat('#F4F1E8'),
  printD: flat('#2E6B4A'),
  keyD: flat('#D9A441'),
  anger: mat('#E23B2E', { shade: '#B8241E', light: '#FF6A4D', dark: '#8A2E3A' }),
  lip: flat('#2A2440'),
  throat: flat('#3A2B5C'),
  mouthIn: flat('#8A2E3A'),
  tongue: mat('#E8706A', { shade: '#C8564E', light: '#F79A84' }),
  flush: flat('#E8706A'),
  shine: flat('#FFF6D8'),
  hand: mat('#FFD9B8', { shade: '#EBB08E', light: '#FFEBD8', dark: '#C98A6A', rim: '#FFC08E', ol: '#8A5A3A' }),
};

// ---- geometry helpers -----------------------------------------------------

type Pt = [number, number];

function inPoly(x: number, y: number, pts: Pt[]): boolean {
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i];
    const [xj, yj] = pts[j];
    if (yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

function inEll(x: number, y: number, cx: number, cy: number, rx: number, ry: number): boolean {
  const dx = (x - cx) / rx;
  const dy = (y - cy) / ry;
  return dx * dx + dy * dy <= 1;
}

/** Pixels whose centres lie within r of the segment a–b. */
function capsule(f: Fig, ax: number, ay: number, bx: number, by: number, r: number): void {
  const x0 = Math.floor(Math.min(ax, bx) - r - 1);
  const x1 = Math.ceil(Math.max(ax, bx) + r + 1);
  const y0 = Math.floor(Math.min(ay, by) - r - 1);
  const y1 = Math.ceil(Math.max(ay, by) + r + 1);
  const dx = bx - ax;
  const dy = by - ay;
  const L = dx * dx + dy * dy || 1;
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const px = x + 0.5;
      const py = y + 0.5;
      const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L));
      const qx = ax + dx * t - px;
      const qy = ay + dy * t - py;
      if (qx * qx + qy * qy <= r * r) f.px(x, y);
    }
}

/** Paint every pixel of the bounding box that `test` accepts, with a per-pixel tone. */
function fill(f: Fig, x0: number, y0: number, x1: number, y1: number, test: (x: number, y: number) => boolean, tone?: (x: number, y: number) => number | null): void {
  for (let y = y0; y <= y1; y++)
    for (let x = x0; x <= x1; x++) {
      const cx = x + 0.5;
      const cy = y + 0.5;
      if (!test(cx, cy)) continue;
      f.t(tone ? tone(cx, cy) : null).px(x, y);
    }
  f.t(null);
}

// ---- backdrop: sunset burst + concentration lines -------------------------

const BAYER = [[0, 8, 2, 10], [12, 4, 14, 6], [3, 11, 1, 9], [15, 7, 13, 5]];
const FOCUS: Pt = [27, 34];

function hash(i: number): number {
  let h = (i * 374761393) ^ 0x5bd1e995;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function backdrop(p: PixelCanvas): void {
  const bands = [C.sun0, C.sun1, C.sun2, C.sun3];
  const [fx, fy] = FOCUS;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const r = Math.hypot(x + 0.5 - fx, (y + 0.5 - fy) * 1.1);
      const band = Math.max(0, (r - 14) / 13);
      const k = Math.floor(band);
      const fr = band - k;
      const t = fr > 0.72 && (fr - 0.72) / 0.28 > BAYER[y & 3][x & 3] / 16 ? 1 : 0;
      p.set(x, y, bands[Math.min(bands.length - 1, k + t)]);
    }
  // concentration lines: thin at their inner end, 2px at the frame edge
  const N = 34;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const dx = x + 0.5 - fx;
      const dy = y + 0.5 - fy;
      const r = Math.hypot(dx, dy);
      const a = (Math.atan2(dy, dx) / (Math.PI * 2) + 1) % 1;
      const k = Math.round(a * N);
      const i = ((k % N) + N) % N;
      const ai = (i + (hash(i) - 0.5) * 0.5) / N;
      let da = a - ai;
      if (da > 0.5) da -= 1;
      if (da < -0.5) da += 1;
      const dist = Math.abs(da) * Math.PI * 2 * r;
      const r0 = 23 + hash(i + 99) * 12;
      if (r < r0) continue;
      const th = Math.min(1.1, 0.25 + (r - r0) / 16);
      if (dist < th) p.set(x, y, hash(i + 7) < 0.3 ? C.sun1 : C.white);
    }
}

// ---- the figure -------------------------------------------------------------

// Bed-head silhouette, clockwise from the left sideburn; the last run is the
// lower edge of the bangs (right → left) with the forehead showing between
// the tips, and the brows left clear.
const HAIR: Pt[] = [
  [10, 36], [8, 31], [5, 29], [7, 25], [3, 21], [7, 18], [4, 12], [10, 12], [10, 7], [16, 8], [18, 3], [23, 6], [27, 5], [31, 6], [36, 2],
  [38, 8], [44, 6], [43, 12], [49, 13], [46, 18], [50, 22], [46, 25], [47, 30], [44, 31], [43, 36],
  [41, 36], [41, 28], [39, 23], [37, 25], [34, 21], [31, 24], [28, 20], [26, 28], [24, 20], [21, 24], [18, 21], [15, 25], [13, 23], [12, 36],
];
const BANG_TIPS: Pt[] = [[37, 25], [31, 24], [26, 28], [21, 24], [15, 25]];

const FACE_C: Pt = [26, 33];
const JAW: Pt[] = [[11.5, 35], [40.5, 35], [37.5, 45], [32, 50], [26, 51.5], [20, 50], [14.5, 45]];

const inHair = (x: number, y: number) => inPoly(x, y, HAIR);
const inFace = (x: number, y: number) => inEll(x, y, FACE_C[0], FACE_C[1], 15.5, 15.5) || inPoly(x, y, JAW);

function hoop(f: Fig): void {
  f.part('hoop', { shade: 'rb', light: 't' });
  fill(f, 0, 1, 14, 15, (x, y) => inEll(x, y, 7, 8, 7, 6.5) && !inEll(x, y, 7, 8, 5, 4.5));
  f.part('net', { flat: true, rim: false, ol: false });
  fill(f, 0, 1, 14, 15, (x, y) => inEll(x, y, 7, 8, 5, 4.5) && ((Math.floor(x) + Math.floor(y)) % 3 === 0 || (Math.floor(x) - Math.floor(y) + 60) % 3 === 0));
}

function torso(f: Fig): void {
  // oversized tee: shoulders run off both sides of the photo
  f.part('shirt', { shade: 'rb', light: 't' });
  fill(f, 0, 50, 63, 63, (x, y) => inPoly(x, y, [[-2, 65], [-1, 59], [6, 55.5], [18, 52.5], [34, 52.5], [45, 54.5], [53, 58], [60, 65]]));
  f.part('shirt', { flat: true });
  // folds from the shoulders and under the raised arm
  f.t(-1);
  f.line(7, 58, 10, 63).line(8, 58, 11, 63).line(45, 57, 42, 63).line(49, 59, 47, 63);
  f.t(1).line(2, 58, 6, 56).line(16, 54, 19, 54);
  f.t(null);
  // the mystery fish print, lower left
  f.part('print', { flat: true, rim: false });
  fill(f, 5, 56, 20, 63, (x, y) => inEll(x, y, 11.5, 60, 4.8, 2.4) || inPoly(x, y, [[15.5, 60], [19.5, 57.2], [19.5, 62.8]]));
  f.part('printD', { flat: true, rim: false });
  f.px(9, 59).px(13, 58).px(13, 59).px(13, 60).px(13, 61).px(18, 60).px(7, 60);
  // collar rib
  f.part('collar', { shade: 'b', light: '' });
  fill(f, 16, 51, 36, 59, (x, y) => inEll(x, y, 26, 52.5, 9, 5.5) && !inEll(x, y, 26, 52, 7, 4) && y > 52);
}

function neck(f: Fig): void {
  f.part('skin', { shade: 'r', light: 'l' });
  fill(f, 19, 44, 33, 58, (x, y) => (x > 21.5 && x < 31 && y < 56) || inEll(x, y, 26, 52, 7, 4), (x, y) => (y < 51 ? -1 : null));
  // blue key string round the neck, the key on the chest
  f.part('string', { flat: true, rim: false });
  f.line(21, 54, 23, 58).line(23, 58, 25, 61).line(31, 54, 29, 58).line(29, 58, 27, 61);
  f.part('key', { flat: true, rim: false });
  f.rect(25, 61, 3, 2).px(26, 63);
  f.part('keyD', { flat: true, rim: false });
  f.px(27, 62).px(27, 63);
}

function ears(f: Fig): void {
  f.part('skin', { shade: 'rb', light: 't' });
  fill(f, 6, 30, 14, 42, (x, y) => inEll(x, y, 10, 36, 3.2, 4.8));
  fill(f, 38, 30, 46, 42, (x, y) => inEll(x, y, 42, 36, 3.2, 4.8), () => -1);
  f.part('skin', { flat: true });
  f.t(-1).vl(10, 34, 38).px(9, 39).t(-2).vl(42, 34, 38).px(43, 39).t(null);
}

function face(f: Fig): void {
  f.part('skin', { shade: 'rb', light: '' });
  // west light: the right cheek and jaw turn away; the bangs cast a band of
  // shade on the forehead; a soft light on the upper-left cheek
  const tone = (x: number, y: number): number | null => {
    if (inHair(x, y - 1.5) || inHair(x, y - 2.5)) return -1;
    const d = (x - FACE_C[0]) / 15 + 0.4 * ((y - FACE_C[1]) / 16);
    if (d > 0.66) return -1;
    if ((x - 15.5) ** 2 / 4 + (y - 37.5) ** 2 / 1.2 < 1) return 1;
    return null;
  };
  fill(f, 9, 16, 43, 52, inFace, tone);
}

function hair(f: Fig): void {
  f.part('hair', { shade: '', light: '' });
  const tone = (x: number, y: number): number | null => {
    const nx = (x - 26) / 22;
    const ny = (y - 18) / 17;
    // shine band (upper left), broken into strands
    const r = Math.hypot(x - 21, (y - 16) * 1.15);
    if (r > 8.2 && r < 10.2 && x < 26 && y < 20 && (Math.floor(x) * 2 + Math.floor(y)) % 5 !== 0) return x < 17 && y < 14 ? 2 : 1;
    if (nx * 0.75 + ny * 0.65 > 0.62) {
      // a dimmer sheen on the far side keeps the shaded mass from going flat
      const r2 = Math.hypot(x - 30, (y - 15) * 1.2);
      if (r2 > 13 && r2 < 14.3 && y < 24 && (Math.floor(x) + Math.floor(y) * 2) % 4 !== 0) return 0;
      return -1;
    }
    return 0;
  };
  fill(f, 0, 0, 52, 40, inHair, tone);
  // clump lines: a dark strand running into every bang tip and top spike
  f.t(-1);
  for (const [tx, ty] of BANG_TIPS) f.line(tx + 1, ty - 7, tx, ty - 1);
  f.line(17, 10, 19, 5).line(34, 8, 35, 4).line(41, 11, 43, 8).line(44, 17, 47, 15).line(9, 17, 6, 14).line(8, 24, 5, 22);
  f.t(null);
  // the ahoge, stiff as a lightning bolt
  f.part('hair', { shade: '', light: '' });
  f.rows(26, 0, ['...##', '..##.', '.####', '..##.', '.##..', '##...'], { '#': ['hair', 0] });
  // anger mark on the hair
  f.part('anger', { shade: 'rb', light: 't' });
  f.rows(37, 10, ['..#.#..', '.##.##.', '##...##', '.......', '##...##', '.##.##.', '..#.#..']);
}

function features(f: Fig): void {
  const part = (m: string) => f.part(m, { flat: true, rim: false });
  // brows slammed down toward the nose (3px at the inner end)
  part('brow');
  for (let x = 13; x <= 23; x++) {
    const y = Math.round(26.5 + (x - 13) * 0.33);
    f.vl(x, y, y + (x < 16 ? 1 : 2));
  }
  for (let x = 29; x <= 39; x++) {
    const y = Math.round(26.5 + (39 - x) * 0.33);
    f.vl(x, y, y + (x > 36 ? 1 : 2));
  }
  // eyes narrowed, the pupils cut hard to the right (at the boke)
  const map = { e: 'eye', w: 'white', i: 'iris', s: 'shine' } as const;
  f.part('eye', { flat: true, rim: false });
  f.rows(14, 30, ['ee.......', '.eeeeee..', '..eeeeeee', '..wwwwsie', '..wwwwiie', '...eeeee.'], map);
  f.rows(29, 30, ['.......ee', '..eeeeee.', 'eeeeeee..', 'ewwwsie..', 'ewwwiie..', '.eeeee...'], map);
  // nose
  f.part('skin', { flat: true });
  f.t(-1).px(27, 38).px(27, 39).px(26, 40).t(1).px(25, 38).t(null);
  // mouth wide open mid-shout
  f.part('lip', { flat: true, rim: false });
  f.rows(19, 41, [
    '...LLLLLLLLL...',
    '..LtttttttttL..',
    '.LmdddddddddmL.',
    '.LmmdddddddmmL.',
    '.LmmmmmmmmmmmL.',
    '.LmmmmgggmmmmL.',
    '..LmmgGGGgmmL..',
    '...LLgGGGgLL...',
    '.....LLLLL.....',
  ], { L: 'lip', t: 'teeth', m: 'mouthIn', d: 'throat', g: ['tongue', 0], G: ['tongue', 1] });
  // flush strokes on both cheeks
  part('flush');
  for (const x of [13, 16, 19]) f.px(x, 39).px(x + 1, 38);
  for (const x of [32, 35, 38]) f.px(x, 39).px(x + 1, 38);
}

// The back of his left hand, flat, fingers together and pointing at the
// boke on the right (the back-of-the-hand slap); thumb along the top,
// knuckles catching the west light. H light, d shade, D the gap lines.
const HAND = [
  '...................',
  '....HHHHHHH........',
  '...H#######dd......',
  '..H#####DDDHHHHH...',
  '.H##############d..',
  '.H######DDDDDDDDd..',
  '.#######HHHHHHHHH..',
  '.################d.',
  '.d######DDDDDDDDD..',
  '.d######HHHHHHHH...',
  '..d#############d..',
  '..dd####DDDDDDDd...',
  '...dd###HHHHH......',
  '....ddd#######d....',
  '......ddddddd......',
];

function arm(f: Fig): void {
  // the forearm rising out of the baggy sleeve to the hand
  f.part('hand', { shade: 'rb', light: 'l' });
  capsule(f, 42.5, 67, 47.5, 44, 3.6);
  f.part('shirt', { shade: 'rb', light: 't' });
  fill(f, 34, 57, 55, 63, (x, y) => inEll(x, y, 43.5, 64, 7.5, 5));
  f.part('shirt', { flat: true });
  f.t(-1).line(39, 61, 43, 60).line(46, 60, 48, 62).t(1).line(38, 60, 40, 59).t(null);
  f.part('hand', { shade: 'rb', light: 't' });
  f.rows(44, 32, HAND);
  // knuckles
  f.t(1).px(51, 36).px(51, 39).px(51, 42).t(null);
}

function tsukkomi64(): HTMLCanvasElement {
  const f = new Fig(S, S, M64);
  hoop(f);
  torso(f);
  neck(f);
  ears(f);
  face(f);
  hair(f);
  features(f);
  arm(f);
  const out = new PixelCanvas(S, S);
  backdrop(out);
  out.blit(f.render(), 0, 0);
  // photo edge: a 1px darker line on the right and bottom so it sits on the paper
  for (let i = 0; i < S; i++) {
    out.set(i, S - 1, mix(hexAt(out, i, S - 1), C.ol, 0.35));
    out.set(S - 1, i, mix(hexAt(out, S - 1, i), C.ol, 0.35));
  }
  return out.toCanvas();
}

function hexAt(p: PixelCanvas, x: number, y: number): string {
  const v = p.get(x, y);
  return '#' + [v & 255, (v >>> 8) & 255, (v >>> 16) & 255].map((n) => n.toString(16).padStart(2, '0')).join('');
}

registerPortrait('minato', (mood) => (mood === 'tsukkomi' ? tsukkomi64() : null), 64);
