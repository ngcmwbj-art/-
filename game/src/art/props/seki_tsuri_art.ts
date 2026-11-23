// テナガエビ釣りの 絵（夕鳴川の 堰の 下の 淵。02_ch2_index #81、30_level_art 3.16・10.12）。
//
// 水の 中が 見える 断面（ザリガニ釣りの 小窓 tsuri_art.ts と 同じ 328×116、同じ 作り）：
//   - 空の 帯（段階の 色）と 向こう岸の 木の 影
//   - 左：堰の コンクリの 段と、落ちる 白い 水（すじは widget が 描く）、その 下の 泡の 柱
//   - まん中から 右：石積みの 護岸（水の 上は 乾いた 石と 草、水の 下は 苔の ついた 石）
//   - 水の 中：堰の 下の 泡（左）、石積みの 根の 大きな 石と 暗い すき間（まん中）、
//     ななめに しずんだ 流木と その 陰（右）
//   - 底：砂と 小石
// 段階ごとに 1枚 焼く。動く物（落ちる水、泡、ゴミ、浮き、糸、えさ、エビ、たも網）は widget。
//
// テナガエビ：横から 見た 左向き。体長（額の とげの 先から 尾の 先まで）＝ 2px/cm。長い
// はさみの 足（第2の 歩脚）は 体長に 入れない（おぴぃは「手を 入れとく」）。
//   mesu メス（小さめ、はさみの 足は 短い）／osu オス（はさみの 足が 長く、青みの 茶）／
//   tamago たまごの メス（腹に 緑の 卵）／taisho 片手の 大将（片方の はさみの 足だけ
//   からだより ずっと 長い。背に 苔）。ヨシノボリ goby（ハゼの なかま。頭が 大きく、
//   腹の ひれで 石に すいつく）。

import { PixelCanvas, mix } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { SCN_H, SCN_W, STAGE_SKY } from './tsuri_art';

export { SCN_W, SCN_H };
/** 水面の 行。 */
export const SK_WATER_Y = 34;
/** 底の 行（物が のる 所）。 */
export const SK_FLOOR_Y = 100;
/** 堰の 落ちる 水（左）：縁の 行と、x の はんい。 */
export const SK_FALL = { x0: 8, x1: 92, crest: 12 };
export const SK_PX_PER_CM = 2;

export type SekiSpot = 'awa' | 'sukima' | 'ryuboku';
export type SekiKind = 'mesu' | 'osu' | 'tamago' | 'taisho' | 'goby';

export interface SekiSpotGeom {
  /** 浮きの 下の えさが 底に つく 所（x）。 */
  x: number;
  /** すみか（石の すき間・流木の 下）の まん中。 */
  home: [number, number];
  /** すみかは えさの どちら側か（-1 左、1 右）。 */
  side: -1 | 1;
}
export const SK_SPOTS: Record<SekiSpot, SekiSpotGeom> = {
  awa: { x: 74, home: [46, 95], side: -1 },
  sukima: { x: 160, home: [188, 86], side: 1 },
  ryuboku: { x: 250, home: [280, 95], side: 1 },
};
export const SK_ORDER: SekiSpot[] = ['awa', 'sukima', 'ryuboku'];

const cache = new Map<string, HTMLCanvasElement>();
function cached(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = build()));
  return c;
}
function hexOf(v: number): string {
  return '#' + [v & 255, (v >>> 8) & 255, (v >>> 16) & 255].map((n) => n.toString(16).padStart(2, '0')).join('');
}

/** 川の 水（淵は 深く、少し 青い みどり）。 */
const WATER_TOP = '#4E7E72';
const WATER_DEEP = '#1E3A3A';

// ---------------------------------------------------------------- 背景

export function sekiBg(stage: number): HTMLCanvasElement {
  const s = Math.max(0, Math.min(2, stage));
  return cached(`seki:bg:${s}`, () => buildBg(s));
}

function buildBg(stage: number): HTMLCanvasElement {
  const W = SCN_W;
  const H = SCN_H;
  const sk = STAGE_SKY[stage];
  const p = new PixelCanvas(W, H);
  const WY = SK_WATER_Y;
  const FY = SK_FLOOR_Y;
  // ---- the sky and the far bank's trees (y 0–10)
  for (let y = 0; y < 11; y++) {
    const c = mix(sk.top, sk.low, y / 10);
    for (let x = 0; x < W; x++) p.set(x, y, c);
  }
  if (sk.horizon) p.hline(0, W - 1, 9, sk.horizon);
  const far = mix(P.shade, sk.low, 0.35);
  for (let x = 0; x < W; x++) {
    const n = valueNoise(x / 7, 0.5, 8201);
    const top = 7 - Math.round(n * 5);
    for (let y = top; y < 11; y++) p.set(x, y, far);
  }
  // ---- the weir (left): the concrete step's face, its crest lit by the low sun (west)
  const { x0: fx0, x1: fx1, crest } = SK_FALL;
  for (let y = crest; y < WY; y++)
    for (let x = 0; x < fx1 + 6; x++) {
      const k = (y - crest) / (WY - crest);
      let c: string = mix(P.concrete, P.steel, k);
      if (h01(x, y, 8203) > 0.9) c = mix(c, P.leafShade, 0.5); // moss
      if (y === crest) c = P.white;
      p.set(x, y, c);
    }
  // the falling sheet: glassy and green near the crest, breaking into white lower down
  // (soft streaks of uneven width; the widget runs brighter streaks down over it)
  for (let y = crest + 1; y < WY; y++)
    for (let x = fx0; x <= fx1; x++) {
      const k = (y - crest) / (WY - crest);
      const n = valueNoise(x / 2.3, y / 9, 8205);
      const glass = mix(mix(WATER_TOP, sk.water, 0.35), '#A8D8E0', 0.35 + k * 0.2);
      let c = mix(glass, '#E8F4F0', Math.max(0, Math.min(1, (n - 0.45) * 1.6 + k * 0.7)));
      if (y === crest + 1) c = mix(sk.water, P.glint, 0.5);
      p.set(x, y, c);
    }
  // the weir's end wall (the fish pass beyond it, in shadow)
  p.rect(fx1 + 2, crest - 2, 6, WY - crest + 2, P.concrete);
  p.vline(fx1 + 2, crest - 2, WY, P.concreteLt);
  p.vline(fx1 + 7, crest - 2, WY, P.steel);
  // ---- the stone revetment above the water (middle to right): grass on top, pitched stones
  for (let y = 9; y < WY; y++)
    for (let x = fx1 + 8; x < W; x++) p.set(x, y, '#3A403E');
  const stone = (cx: number, cy: number, rx: number, ry: number, seed: number, wet: number) => {
    for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d > 1 || x < 0 || x >= W || y < 0 || y >= H) continue;
        const lit = dx + dy < -0.5;
        const dark = dx + dy > 0.6 || d > 0.8;
        let c: string = lit ? '#B8B4A8' : dark ? '#5E6462' : '#8E9290';
        if (h01(x, y, seed) > 0.86) c = mix(c, '#6E6A5E', 0.6);
        if (dy < -0.3 && h01(x, y, seed + 5) > 0.55) c = mix(c, P.leafShade, 0.6);
        if (wet > 0) c = mix(c, WATER_DEEP, wet);
        p.set(x, y, c);
      }
  };
  for (let row = 0; row < 4; row++) {
    let x = fx1 + 8 + (row % 2 ? 6 : 0);
    const y = 13 + row * 6;
    while (x < W + 8) {
      const w = 10 + (ihash(x, y, 8207) % 6);
      stone(x + w / 2, y + 2.5, w / 2, 3, 8209 + x * 3 + y, 0);
      x += w + 1;
    }
  }
  // the grass on top of the bank, hanging over the stones
  for (let x = fx1 + 8; x < W; x++) {
    const len = 2 + (ihash(x, 1, 8211) % 5);
    for (let j = 0; j < len; j++) p.set(x, 9 + j, j < 1 ? P.leafLt : x % 3 ? P.leaf : P.leafDeep);
  }
  // ---- the water (y WY → the bed)
  for (let y = WY; y < FY + 2; y++) {
    const k = (y - WY) / (FY - WY);
    const wc = mix(mix(WATER_TOP, sk.water, 0.35 * (1 - k) * (1 - k)), WATER_DEEP, k * 0.85);
    for (let x = 0; x < W; x++) p.set(x, y, wc);
  }
  // light shafts from the low sun (west, the upper left)
  for (let i = 0; i < 5; i++) {
    const x0 = 40 + i * 58 + Math.round(h01(i, 31, 8213) * 18);
    const wdt = 5 + (i % 3) * 3;
    for (let y = WY + 1; y < FY; y++) {
      const k = (y - WY) / (FY - WY);
      const xs = Math.round(x0 + (y - WY) * 0.5);
      for (let x = xs; x < xs + wdt; x++) {
        if (x < 0 || x >= W) continue;
        const al = 0.14 * (1 - k) * (x === xs || x === xs + wdt - 1 ? 0.5 : 1);
        if (al > 0.01) p.set(x, y, mix(hexOf(p.get(x, y)), '#D8F0E0', al));
      }
    }
  }
  // the white water under the falls: a cloud of fine bubbles (left), thinning to the right and down
  for (let y = WY; y < 84; y++)
    for (let x = 0; x < fx1 + 30; x++) {
      const k = Math.max(0, 1 - (y - WY) / 50 - Math.max(0, x - fx1) / 30);
      const n = valueNoise(x / 5, y / 4, 8215);
      if (n < 1 - k * 0.9) continue;
      p.set(x, y, mix(hexOf(p.get(x, y)), '#E8F4F0', 0.35 + k * 0.4));
    }
  // the surface line: the sky's colour, brighter
  for (let x = 0; x < W; x++) {
    p.set(x, WY, mix(sk.water, P.glint, 0.4));
    p.set(x, WY + 1, mix(hexOf(p.get(x, WY + 1)), sk.water, 0.45));
  }
  // ---- the revetment under the water: big mossy stones, the dark gaps between them
  // (a heap sloping from the bank's foot near the surface on the right down to the bed:
  //  stones lean on each other, the dark gaps between them)
  const toe: [number, number, number, number][] = [
    [124, 95, 11, 7], [146, 92, 12, 9], [170, 95, 10, 6], [212, 94, 13, 8], [236, 92, 9, 7],
    [158, 78, 11, 8], [182, 72, 12, 8], [206, 76, 10, 8], [226, 66, 10, 7],
    [196, 56, 11, 7], [220, 47, 10, 7], [236, 40, 8, 5],
  ];
  for (const [cx, cy, rx, ry] of toe) {
    // its shadow first, then the stone (darker, drowned)
    for (let y = cy - ry + 2; y <= cy + ry + 2; y++)
      for (let x = cx - rx + 2; x <= cx + rx + 2; x++)
        if (((x - cx - 2) / rx) ** 2 + ((y - cy - 2) / ry) ** 2 <= 1 && x >= 0 && x < W) p.set(x, y, mix(hexOf(p.get(x, y)), P.void, 0.5));
    stone(cx, cy, rx, ry, 8217 + cx, 0.35 + (cy - WY) / 160);
  }
  // the gaps where the shrimp live: deep black hollows between the stones
  const [hx, hy] = SK_SPOTS.sukima.home;
  p.ellipse(hx, hy, 7, 4, P.void);
  p.ellipse(hx - 1, hy - 1, 4, 2, '#000000');
  p.ellipse(170, 84, 4, 3, P.void);
  p.ellipse(212, 62, 3, 2, P.void);
  // ---- the driftwood, sunk on a slant from the upper right to the bed, its shade under it
  for (let i = 0; i <= 100; i++) {
    const k = i / 100;
    const x = Math.round(332 - k * 92);
    const y = Math.round(28 + k * 68);
    for (let t = -4; t <= 4; t++) {
      const yy = y + t;
      if (x < 0 || x >= W || yy < 0 || yy >= H) continue;
      let c: string = t < -2 ? '#C8BCA2' : t < 2 ? '#8E8470' : '#5E5648';
      if (yy > WY) c = mix(c, WATER_DEEP, 0.35 + (yy - WY) / 200);
      if ((x + yy * 2) % 9 === 0) c = mix(c, '#3A3226', 0.4);
      p.set(x, yy, c);
    }
    // the shade under the log (where the old ones wait)
    if (y + 5 > WY) for (let d = 5; d < 14; d++) if (y + d < FY + 1 && x < W) p.set(x, y + d, mix(hexOf(p.get(x, y + d)), P.void, 0.45 * (1 - d / 16)));
  }
  // a broken branch of it up out of the water
  for (let i = 0; i < 12; i++) p.set(296 + Math.round(i * 0.4), 40 - i, i < 6 ? '#5E5648' : '#8E8470');
  // weed trailing from the log in the current
  for (let i = 0; i < 6; i++) {
    let x = 260 + i * 10;
    let y = 70 - i * 6;
    for (let j = 0; j < 8; j++) {
      p.set(x, y, mix(P.leafShade, WATER_DEEP, 0.3));
      x += 1;
      y += j % 3 === 0 ? 1 : 0;
    }
  }
  // ---- the bed: sand and pebbles, the boulders at the foot of the weir (left)
  for (let y = FY; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = valueNoise(x / 6, y / 3, 8219);
      const n2 = h01(x, y, 8221);
      let c: string = n > 0.6 ? '#6E6450' : n < 0.3 ? '#3E3A34' : '#544C40';
      if (y === FY) c = mix('#7E7460', WATER_TOP, 0.35);
      if (n2 > 0.95) c = '#9A9282';
      else if (n2 > 0.93) c = '#B8B09A';
      p.set(x, y, c);
    }
  for (const [cx, cy, rx, ry] of [[20, 96, 14, 9], [52, 101, 9, 5], [94, 99, 8, 5], [292, 101, 10, 5], [318, 98, 9, 7]] as [number, number, number, number][]) stone(cx, cy, rx, ry, 8223 + cx, 0.4);
  // the shrimp's home under the weir: a hollow among those boulders
  const [ax, ay] = SK_SPOTS.awa.home;
  p.ellipse(ax, ay, 6, 3, P.void);
  // under the log, its deepest shade
  const [rx0, ry0] = SK_SPOTS.ryuboku.home;
  p.ellipse(rx0, ry0, 8, 3, P.void);
  return p.toCanvas();
}

// ---------------------------------------------------------------- テナガエビ

type Tones = [dark: string, shade: string, base: string, light: string];
const SHRIMP: Record<'mesu' | 'osu' | 'tamago' | 'taisho', { col: Tones; arm: Tones; armK: number; nearArmK?: number; moss?: boolean; eggs?: boolean }> = {
  // メス：すけた 黄土の 茶に こげ茶の すじ、はさみの 足は 短め
  mesu: { col: ['#3A3226', '#6E6048', '#9A8A66', '#C8B88A'], arm: ['#3A3226', '#5E5240', '#8A7A5A', '#B8A880'], armK: 0.55 },
  // オス：少し 濃い 茶、長い はさみの 足は 青みの こげ茶
  osu: { col: ['#2E2820', '#5E5240', '#8A7A56', '#B8A87E'], arm: ['#22242E', '#3E4250', '#5E6274', '#8A8EA0'], armK: 1.3 },
  // たまごの メス：腹の 下に 緑の 卵
  tamago: { col: ['#3A3226', '#6E6048', '#9A8A66', '#C8B88A'], arm: ['#3A3226', '#5E5240', '#8A7A5A', '#B8A880'], armK: 0.55, eggs: true },
  // 片手の 大将：濃い こげ茶、背に 苔。手前の はさみの 足が とても 長く、向こうの は ふつう
  taisho: { col: ['#221C16', '#4A3E30', '#6E604A', '#9A8A6A'], arm: ['#1B1A22', '#34364A', '#525670', '#7E829A'], armK: 0.6, nearArmK: 2.1, moss: true },
};

export interface ShrimpPose {
  /** 0/1：足の 動き。 */
  leg: number;
  /** はさみが えさを 抱えている。 */
  carry?: boolean;
  /** ひげの ゆれ（0/1）。 */
  ant?: number;
  /** しっぽを まるめている（逃げる）。 */
  curl?: boolean;
}

export interface ShrimpImg {
  img: HTMLCanvasElement;
  /** 額の とげの 先（体長の 0）。 */
  ax: number;
  /** 足が 底に つく 行。 */
  ay: number;
  /** 手前の はさみの 先（えさを 抱える 所）。 */
  tip: [number, number];
  /** 手前の はさみの 足の 長さ（px）。 */
  arm: number;
}

const meta = new Map<string, ShrimpImg>();

/** 横から 見た テナガエビ（左向き）。`cm` の 体長。 */
export function shrimp(kind: 'mesu' | 'osu' | 'tamago' | 'taisho', cm: number, pose: ShrimpPose): ShrimpImg {
  const key = `shrimp:${kind}:${cm}:${pose.leg}:${pose.carry ? 1 : 0}:${pose.ant ?? 0}:${pose.curl ? 1 : 0}`;
  const hit = meta.get(key);
  if (hit) return hit;
  const r = buildShrimp(kind, cm, pose);
  meta.set(key, r);
  return r;
}

/** はさみの 足の 長さ（cm）。オスは 体より 長い。 */
export function armCm(kind: 'mesu' | 'osu' | 'tamago' | 'taisho', cm: number): number {
  const s = SHRIMP[kind];
  return Math.max(2, Math.round(cm * (s.nearArmK ?? s.armK)));
}

function buildShrimp(kind: 'mesu' | 'osu' | 'tamago' | 'taisho', cm: number, pose: ShrimpPose): ShrimpImg {
  const spec = SHRIMP[kind];
  const [D, S, B, Lt] = spec.col;
  const L = Math.max(10, Math.round(cm * SK_PX_PER_CM));
  const nearA = Math.round(L * (spec.nearArmK ?? spec.armK));
  const farA = Math.round(L * spec.armK);
  const A = Math.max(nearA, farA);
  const padL = A + 4;
  const padT = Math.round(L * 0.45) + 3;
  const w = padL + L + 4;
  const h = padT + Math.round(L * 0.35) + 6;
  const p = new PixelCanvas(w, h);
  const ax = padL;
  const cy = padT; // the body's middle row
  const floor = cy + Math.max(3, Math.round(L * 0.2)) + 1;
  const X = (k: number) => ax + Math.round(k);
  const carH = Math.max(2, Math.round(L * 0.11));
  // ---- the body, side on: the saw-edged rostrum, the domed carapace, the abdomen arching
  //      down from its third segment (see-through, banded), the tail fan spread at the end
  const curl = !!pose.curl;
  const bend = L * (curl ? 0.3 : 0.1);
  for (let x = 0; x < L; x++) {
    const k = x / L;
    let top: number;
    let bot: number;
    if (k < 0.1) {
      // the rostrum: a thin spike, rising a little to its tip
      top = cy - carH + 1 - (k < 0.05 ? 1 : 0);
      bot = top + (k > 0.06 ? 1 : 0);
    } else if (k < 0.4) {
      const t = (k - 0.1) / 0.3;
      top = cy - carH - Math.round(Math.sin(t * Math.PI) * 1.2);
      bot = cy + Math.round(carH * 0.8);
    } else if (k < 0.86) {
      const t = (k - 0.4) / 0.46;
      const hh = carH * (1 - t * 0.5);
      const drop = Math.round(Math.sin(t * Math.PI * 0.5) * bend * (0.4 + t));
      top = Math.round(cy - hh) + drop - (t < 0.35 ? 1 : 0);
      bot = Math.round(cy + hh * 0.75) + drop;
    } else {
      // the tail fan: it spreads
      const t = (k - 0.86) / 0.14;
      const drop = Math.round(bend * 1.4);
      top = cy - 1 - Math.round(t * carH * 1.1) + drop;
      bot = cy + 1 + Math.round(t * carH * 1.1) + drop;
    }
    for (let y = top; y <= bot; y++) {
      const v = (y - top) / Math.max(1, bot - top);
      let c: string = v < 0.25 ? Lt : v > 0.75 ? S : B;
      // the dark bands at the segments of the abdomen; the carapace's grooves
      if (k >= 0.4 && k < 0.86 && Math.round((k - 0.4) * L) % 4 === 0) c = D;
      else if (k >= 0.4 && k < 0.86 && v > 0.2 && v < 0.75) c = c + 'D8'; // see-through
      if (k >= 0.1 && k < 0.4 && y === top + 1 && x % 3 === 0) c = mix(c, D, 0.5);
      if (k >= 0.86 && (x + y) % 2 === 0 && v > 0.2 && v < 0.8) c = mix(c, D, 0.35);
      p.set(X(x), y, c);
    }
    if (spec.moss && k > 0.1 && k < 0.6 && ihash(x, 0, 8231) % 3 === 0) p.set(X(x), top, P.leafShade);
  }
  // the eggs under the abdomen (green, a cluster held by the swimmerets)
  if (spec.eggs) {
    for (let x = Math.round(L * 0.42); x < Math.round(L * 0.78); x++)
      for (let d = 1; d <= 2; d++) if ((x + d) % 2 === 0 || d === 1) p.set(X(x), cy + carH + d - 1 + Math.round(((x / L - 0.4) / 0.46) ** 2 * L * 0.06), d === 1 ? '#7EA84A' : '#4E7A2E');
  }
  // the eye on its stalk
  const ex = X(L * 0.09);
  p.set(ex, cy - carH, P.ink);
  p.set(ex, cy - carH - 1, P.ink);
  p.set(ex + 1, cy - carH - 1, D);
  // (the outline round the body only: the thin legs, feelers and arms stay fine lines)
  p.outline('#1B1733');
  // ---- the far antennae (long, thin, sweeping back over the body), behind
  const antLen = Math.round(L * 1.1);
  const ant = pose.ant ?? 0;
  for (let i = 0; i < antLen; i++) {
    const k = i / antLen;
    const x = X(L * 0.05) - Math.round(Math.sin(k * 1.4) * L * 0.25) + Math.round(k * k * L * 0.9);
    const y = cy - carH - 2 - Math.round(Math.sin(k * Math.PI * 0.9) * (L * 0.38 + ant));
    if (i % 2 === 0 || k < 0.5) p.under(x, y, i < antLen * 0.4 ? D : S);
  }
  // ---- the walking legs (thin, four), behind
  const leg = pose.leg;
  for (let i = 0; i < 4; i++) {
    const lx = X(L * (0.2 + i * 0.09));
    const sw = (i + leg) % 2 ? 1 : -1;
    for (let y = cy + carH + 1; y <= floor; y++) p.under(lx + Math.round(((y - cy - carH - 1) / Math.max(1, floor - cy - carH - 1)) * sw), y, D);
  }
  // ---- the chelipeds (the long second legs): the upper arm, the long wrist, the palm and
  //      two slender fingers. Thin (1px) lines with a 2px palm.
  const carry = !!pose.carry;
  const arm = (len: number, near: boolean): [number, number] => {
    const [ad, as, ab, al] = near ? spec.arm : (spec.arm.map((c) => mix(c, '#1B1733', 0.3)) as unknown as Tones);
    const baseX = X(L * 0.2);
    const y0 = cy + (near ? 2 : 0);
    // a gentle bow (carrying: bent down to the worms on the bed)
    const sag = carry ? Math.round(L * 0.18) : near ? 2 : 1;
    const palm0 = Math.round(len * 0.74);
    let tx = baseX;
    let ty = y0;
    for (let i = 0; i < len; i++) {
      const k = i / len;
      const x = baseX - 1 - i;
      const y = y0 + Math.round(Math.sin(k * Math.PI * 0.75) * sag) - (near ? 0 : 1);
      const joint = i === Math.round(len * 0.28) || i === palm0;
      const put = near ? (xx: number, yy: number, c: string) => p.set(xx, yy, c) : (xx: number, yy: number, c: string) => p.under(xx, yy, c);
      if (i >= palm0) {
        put(x, y, joint ? ad : near && i % 2 ? al : ab);
        put(x, y + 1, as);
      } else put(x, y, joint ? ad : near ? ab : as);
      tx = x;
      ty = y;
    }
    // the two fingers
    const open = carry ? 0 : 1;
    const put = near ? (xx: number, yy: number, c: string) => p.set(xx, yy, c) : (xx: number, yy: number, c: string) => p.under(xx, yy, c);
    put(tx - 1, ty - open, ab);
    put(tx - 2, ty - open, as);
    put(tx - 1, ty + 1 + open, as);
    put(tx - 2, ty + 1 + open, ad);
    return [tx - 2, ty + 1];
  };
  arm(farA, false);
  // ---- the near antennae (shorter, forward) and the near cheliped, in front
  for (let i = 1; i < Math.round(L * 0.5); i++) p.set(X(L * 0.02) - i, cy - carH - 1 - Math.round(i * 0.35), i % 2 ? S : D);
  const tip = arm(nearA, true);
  return { img: p.toCanvas(), ax, ay: floor, tip, arm: nearA };
}

/** 90度 まわした（頭が 上）：えさを 抱えて つり上げられる テナガエビ。 */
export function shrimpHang(kind: 'mesu' | 'osu' | 'tamago' | 'taisho', cm: number, pose: ShrimpPose): ShrimpImg {
  const key = `shang:${kind}:${cm}:${pose.leg}:${pose.ant ?? 0}`;
  const hit = meta.get(key);
  if (hit) return hit;
  const src = shrimp(kind, cm, { ...pose, carry: true });
  const r = rotate(src);
  meta.set(key, r);
  return r;
}

function rotate(src: ShrimpImg): ShrimpImg {
  const sw = src.img.width;
  const sh = src.img.height;
  const cv = document.createElement('canvas');
  cv.width = sh;
  cv.height = sw;
  const ctx = cv.getContext('2d')!;
  ctx.translate(sh, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src.img, 0, 0);
  const rot = (x: number, y: number): [number, number] => [sh - 1 - y, x];
  const [ax, ay] = rot(src.ax, src.ay);
  return { img: cv, ax, ay, tip: rot(src.tip[0], src.tip[1]), arm: src.arm };
}

// ---------------------------------------------------------------- ヨシノボリ

/** 横から 見た ヨシノボリ（左向き）。体長 2px/cm。 */
export function goby(cm: number, pose: { leg: number; curl?: boolean }): ShrimpImg {
  const key = `goby:${cm}:${pose.leg}:${pose.curl ? 1 : 0}`;
  const hit = meta.get(key);
  if (hit) return hit;
  const L = Math.max(8, Math.round(cm * SK_PX_PER_CM));
  const w = L + 6;
  const h = Math.round(L * 0.45) + 6;
  const p = new PixelCanvas(w, h);
  const ax = 2;
  const cy = Math.round(h * 0.55);
  const floor = cy + Math.round(L * 0.14) + 1;
  for (let x = 0; x < L; x++) {
    const k = x / L;
    // a big blunt head, the body tapering to the tail, the round tail fin
    const half = k < 0.3 ? 1 + Math.round(L * 0.13 * Math.min(1, k / 0.12)) : k < 0.85 ? Math.max(1, Math.round(L * 0.13 * (1 - (k - 0.3) * 0.9))) : 1 + Math.round((k - 0.85) * L * 0.5);
    const sw = pose.leg && k > 0.6 ? 1 : 0;
    for (let y = cy - half; y <= cy + half; y++) {
      const v = (y - (cy - half)) / Math.max(1, half * 2);
      let c = v < 0.3 ? '#9A8A62' : v > 0.7 ? '#C8BC98' : '#7A6A4A';
      if (ihash(x, y, 8241) % 5 === 0 && v < 0.7) c = '#4A3E2A'; // the mottle
      p.set(ax + x, y + sw, c);
    }
  }
  // two dorsal fins, the pelvic sucker under the head, the eye high on the head
  for (let i = 0; i < 4; i++) p.set(ax + Math.round(L * 0.35) + i, cy - Math.round(L * 0.13) - 1 - (i < 2 ? 1 : 0), '#6E5E40');
  for (let i = 0; i < 5; i++) p.set(ax + Math.round(L * 0.55) + i, cy - Math.round(L * 0.1) - 1, '#6E5E40');
  p.hline(ax + Math.round(L * 0.18), ax + Math.round(L * 0.32), cy + Math.round(L * 0.13) + 1, '#B8AC88');
  p.set(ax + Math.round(L * 0.12), cy - Math.round(L * 0.08), P.ink);
  p.set(ax + Math.round(L * 0.12) + 1, cy - Math.round(L * 0.08), P.glint);
  // its cheek: the blue line of a male
  p.set(ax + Math.round(L * 0.08), cy + 1, '#4AA8E0');
  p.outline('#1B1733');
  const r: ShrimpImg = { img: p.toCanvas(), ax, ay: floor, tip: [ax + 1, cy + 1], arm: 0 };
  meta.set(key, r);
  return r;
}

/** つり上げられる ヨシノボリ（頭が 上、口に えさ）。 */
export function gobyHang(cm: number, leg: number): ShrimpImg {
  const key = `ghang:${cm}:${leg}`;
  const hit = meta.get(key);
  if (hit) return hit;
  const r = rotate(goby(cm, { leg }));
  meta.set(key, r);
  return r;
}

// ---------------------------------------------------------------- 浮き・えさ

/** 浮き：細い 棒浮き（赤い 頭、白い 帯）。おぴぃの 浮き は 小さい 玉の 浮き（黄色と 朱）。 */
export function floatImg(opi: boolean): HTMLCanvasElement {
  return cached(`seki:float:${opi ? 1 : 0}`, () => {
    if (opi) {
      const p = new PixelCanvas(5, 8);
      p.vline(2, 0, 1, P.ink);
      p.ellipse(2, 3, 2, 1.6, P.verm);
      p.hline(1, 3, 2, P.vermLt);
      p.ellipse(2, 5, 2, 1.4, P.gold);
      p.set(1, 5, P.goldPale);
      p.vline(2, 6, 7, P.woodLt);
      p.outline('#1B1733');
      return p.toCanvas();
    }
    const p = new PixelCanvas(4, 12);
    p.vline(1, 0, 3, P.verm);
    p.vline(2, 0, 3, P.vermShade);
    p.set(1, 0, P.vermLt);
    p.vline(1, 4, 5, P.white);
    p.vline(2, 4, 5, P.concrete);
    p.vline(1, 6, 9, P.woodLt);
    p.vline(2, 6, 9, P.wood);
    p.vline(1, 10, 11, P.ink);
    p.outline('#1B1733');
    return p.toCanvas();
  });
}

/** 赤虫（えさ）：小さな 針に 赤い 虫が 3本。 */
export function akamushiImg(): HTMLCanvasElement {
  return cached('seki:akamushi', () => {
    const p = new PixelCanvas(6, 6);
    p.set(2, 0, P.steel);
    p.vline(2, 1, 4, P.concrete);
    p.set(3, 5, P.concrete);
    p.set(4, 4, P.concrete);
    for (const [x, y] of [[0, 2], [1, 3], [3, 2], [4, 3], [1, 4], [3, 4]]) p.set(x, y, P.red);
    p.set(0, 3, P.vermShade);
    p.set(4, 2, P.vermShade);
    return p.toCanvas();
  });
}

/** ガイドの 点（3つ）：灯る 前（うすい 輪）と 灯った（朱）。 */
export function dotImg(lit: boolean): HTMLCanvasElement {
  return cached(`seki:dot:${lit ? 1 : 0}`, () => {
    const p = new PixelCanvas(7, 7);
    p.ellipse(3, 3, 3, 3, lit ? P.verm : '#E8D9B5');
    if (lit) {
      p.set(2, 2, P.vermLt);
      p.set(3, 2, P.vermLt);
    } else p.ellipse(3, 3, 2, 2, '#FBF3DC');
    p.outline('#1B1733');
    return p.toCanvas();
  });
}

// ---------------------------------------------------------------- えんぴつの 絵（『みずべ』の ページ）

/**
 * しゅんの えんぴつの 絵：絵の 外まわりを なぞり、内側に ななめの 線を 少し。
 * 消しゴムの あとの ように ところどころ うすい。
 */
export function pencilOf(src: HTMLCanvasElement, key: string, ink = '#4A3A6E'): HTMLCanvasElement {
  return cached(`pencil:${key}`, () => {
    const w = src.width;
    const h = src.height;
    const sctx = src.getContext('2d', { willReadFrequently: true })!;
    const d = sctx.getImageData(0, 0, w, h).data;
    const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0 && !(d[(y * w + x) * 4] === 0x1b && d[(y * w + x) * 4 + 1] === 0x17);
    const dark = (x: number, y: number) => {
      const i = (y * w + x) * 4;
      return d[i] + d[i + 1] + d[i + 2] < 300;
    };
    const p = new PixelCanvas(w, h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        if (!on(x, y)) continue;
        const edge = !(on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1));
        if (edge) {
          if (ihash(x, y, 8251) % 11 !== 0) p.set(x, y, ink);
        } else if (dark(x, y) && (x + y) % 3 === 0) p.set(x, y, mix(ink, '#FBF3DC', 0.35));
        else if ((x - y) % 5 === 0 && ihash(x, y, 8253) % 3) p.set(x, y, mix(ink, '#FBF3DC', 0.55));
      }
    return p.toCanvas();
  });
}
