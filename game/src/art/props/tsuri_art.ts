// ザリガニ釣りの絵（02_ch2_index #66、30_level_art 3.13・9.3、10_narrative 7.21）。
//
// 水の中が見える断面：田んぼの側から、畦の のり面を正面に見る。上から
//   - 空の帯（段階の色）と、向こう岸の家並みの影
//   - 畦の上の草（左の半分は、水面まで 垂れる 長い草。根が 水の中へ）
//   - 水口の土管（のり面の 水面の上。ここから 用水路の水が 落ちる）
//   - 水面（空の色が うつる）、ウキクサ
//   - のり面の 水の中：ザリガニの 穴（左）
//   - 底の泥、水口の 石（まん中）、古い 土管（右。口が こっちを 向く）、
//     ペットボトルの しかけ、手前の稲（右の端。穂が 出て 垂れはじめた 8月31日の稲）
// 背景は段階ごとに1枚だけ焼いて とっておく（毎フレーム 合成しない）。動く物
// （落ちる水、泡、ゴミ、アメンボ、糸、するめ、ザリガニ、たも網）は widget が描く。
//
// ザリガニ：横から見た形（左向き）。体長（額の先から 尾の先まで）＝ 2px／cm で
// 描くので、定規の上で たもつの 盛りが 見える。はさみと ひげは 体長に入れない。
//   kozari 小さい（黄土色がかった茶）／zari 中くらい（赤茶）／makka 大きい赤
//   （マッカチン）／nushi ぬし（黒っぽい えんじ、背に苔、手前の はさみが 小さい）

import { PixelCanvas, mix } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { h01, ihash, valueNoise } from '../tiles/noise';

export const SCN_W = 328;
export const SCN_H = 116;
/** 水面の行。 */
export const WATER_Y = 40;
/** 底の泥の上の行（物が のる所）。 */
export const FLOOR_Y = 100;
/** 水口の土管（のり面、水面の上）の口のまん中。 */
export const INLET: [number, number] = [142, 27];
/** 1cm あたりの px（体長）。 */
export const PX_PER_CM = 2;

export type Spot = 'kusa' | 'ishi' | 'dokan';
export type CatchKind = 'kozari' | 'zari' | 'makka' | 'nushi' | 'boot' | 'can';

export interface SpotGeom {
  /** するめが 底に つく所（x）。 */
  x: number;
  /** すみか（穴・石の陰・土管の口）の まん中。 */
  home: [number, number];
  /** すみかは するめの どちら側か（-1 左、1 右）。 */
  side: -1 | 1;
}
export const SPOTS: Record<Spot, SpotGeom> = {
  kusa: { x: 72, home: [42, 93], side: -1 },
  ishi: { x: 160, home: [186, 97], side: 1 },
  dokan: { x: 246, home: [272, 93], side: 1 },
};
export const SPOT_ORDER: Spot[] = ['kusa', 'ishi', 'dokan'];

const cache = new Map<string, HTMLCanvasElement>();
function cached(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = build()));
  return c;
}

// ---------------------------------------------------------------- 段階の色

/** 空（上 → 地平）、全体に かける色、水面に うつる色。 */
export const STAGE_SKY: Record<number, { top: string; low: string; horizon?: string; tint: string; water: string }> = {
  0: { top: P.sky, low: P.sun, tint: '#FFF3E6', water: '#F7C27A' },
  1: { top: P.peach, low: P.sun, tint: '#F9E4EC', water: '#D9728A' },
  2: { top: P.lilac, low: P.crimson, horizon: P.horizon, tint: '#E4D8F0', water: '#B87AA8' },
};

/** 水の色（水面の近く → 底の近く）。田んぼの水は 少し にごった みどり。 */
const WATER_TOP = '#5E8C7A';
const WATER_DEEP = '#2E4A44';

function mulHex(c: string, t: string): string {
  const a = parseInt(c.slice(1), 16);
  const b = parseInt(t.slice(1), 16);
  const r = Math.round((((a >> 16) & 255) * ((b >> 16) & 255)) / 255);
  const g = Math.round((((a >> 8) & 255) * ((b >> 8) & 255)) / 255);
  const bl = Math.round(((a & 255) * (b & 255)) / 255);
  return '#' + [r, g, bl].map((v) => v.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- 断面の背景

/** 段階 0/1/2 の断面の背景（328×116、1回だけ焼く）。 */
export function sceneBg(stage: number): HTMLCanvasElement {
  const s = Math.max(0, Math.min(2, stage));
  return cached(`tsuri:bg:${s}`, () => buildBg(s));
}

function buildBg(stage: number): HTMLCanvasElement {
  const W = SCN_W;
  const H = SCN_H;
  const sk = STAGE_SKY[stage];
  const p = new PixelCanvas(W, H);
  const lean = stage === 2 ? 1 : 0;

  // ---- 空と、向こう岸の家並み（y 0–9）
  for (let y = 0; y < 10; y++) {
    const k = y / 9;
    const c = mix(sk.top, sk.low, k);
    for (let x = 0; x < W; x++) p.set(x, y, (x + y) % 2 === 0 && k > 0.45 && k < 0.6 ? mix(c, sk.low, 0.5) : c);
  }
  if (sk.horizon) p.hline(0, W - 1, 8, sk.horizon);
  // far roofs and trees across the canal, a muted violet silhouette
  const far = mix(P.shade, sk.low, 0.35);
  for (let x = 0; x < W; x++) {
    const n = valueNoise(x / 9, 0.5, 6601);
    const roof = Math.floor(x / 23) % 3 === 1 ? 2 : 0;
    const top = 6 - Math.round(n * 3) - roof;
    for (let y = top; y < 10; y++) p.set(x, y, far);
  }
  // a utility pole over there
  p.vline(118, 1, 9, mix(far, P.ink, 0.3));
  p.hline(115, 121, 2, mix(far, P.ink, 0.3));

  // ---- 畦の のり面（y 9 → 底）：土の壁。上ほど 夕日が 当たり、水ぎわは しめって 暗い
  for (let y = 9; y < FLOOR_Y + 2; y++)
    for (let x = 0; x < W; x++) {
      const n = valueNoise(x / 11, y / 4, 6603);
      const n2 = h01(x, y, 6605);
      const lit = y < 24 ? 1 : y < 32 ? 0.5 : 0;
      // horizontal strata of the packed earth, a little texture
      const band = Math.floor((y + Math.round(valueNoise(x / 30, 1, 6606) * 3)) / 5) % 2;
      let c: string = band ? P.wood : mix(P.wood, P.woodDark, 0.35);
      if (n > 0.7) c = mix(c, P.brassOld, 0.5);
      else if (n < 0.22) c = mix(c, P.woodDark, 0.6);
      if (lit && n2 > 1 - 0.12 * lit) c = mix(c, P.brass, 0.45);
      // damp, darker near the water
      if (y > WATER_Y - 5 && y < WATER_Y) c = mix(c, P.woodDark, 0.45 + (y - (WATER_Y - 5)) * 0.08);
      // pebbles in the earth
      if (n2 > 0.988) c = P.steel;
      else if (n2 > 0.98) c = P.concrete;
      p.set(x, y, c);
    }
  // thin roots running through the earth above the water
  for (let i = 0; i < 12; i++) {
    let x = Math.floor(h01(i, 21, 6608) * W);
    let y = 13 + Math.floor(h01(i, 22, 6608) * 20);
    for (let j = 0; j < 8 + (i % 5) * 2; j++) {
      p.set(x, y, mix(P.woodLt, P.wood, 0.3));
      x += ihash(i, j, 6610) % 3 === 0 ? 0 : 1;
      y += ihash(i, j, 6612) % 2;
      if (y >= WATER_Y - 1) break;
    }
  }
  // ---- 水口の土管（のり面、水面の上）：コンクリの輪、中は暗い
  const [ix, iy] = INLET;
  // the earth round it cut back a little, a wet dark stain under the mouth
  for (let y = iy + 6; y < WATER_Y; y++) for (let x = ix - 5; x <= ix + 5; x++) if (h01(x, y, 6611) < 0.8) p.set(x, y, P.woodDark);
  p.ellipse(ix, iy, 8, 7, P.concrete);
  p.ellipse(ix, iy, 8, 7, P.concrete);
  for (let a = 0; a < 40; a++) {
    const t = (a / 40) * Math.PI * 2;
    const x = Math.round(ix + Math.cos(t) * 8);
    const y = Math.round(iy + Math.sin(t) * 7);
    p.set(x, y, Math.cos(t) < -0.2 || Math.sin(t) < -0.5 ? P.concreteLt : P.steel);
  }
  p.ellipse(ix, iy, 5, 4, P.ink);
  p.ellipse(ix + 1, iy + 1, 3, 2, P.night);
  p.hline(ix - 4, ix + 3, iy + 4, P.charcoal); // the lip the water runs over
  p.set(ix - 6, iy - 4, P.white);
  p.set(ix - 7, iy - 2, P.white);
  // moss on the ring
  for (const [dx, dy] of [[-7, 2], [-6, 4], [6, 3], [7, 1], [5, 5]]) p.set(ix + dx, iy + dy, P.leafShade);

  // ---- 水（y WATER_Y → 底）：のり面が すけて見える。上は空の色、下は暗い
  for (let y = WATER_Y; y < FLOOR_Y + 2; y++) {
    const k = (y - WATER_Y) / (FLOOR_Y - WATER_Y);
    const wc = mix(mix(WATER_TOP, sk.water, 0.4 * (1 - k) * (1 - k)), WATER_DEEP, k * 0.9);
    const a = 0.74 + 0.2 * k;
    for (let x = 0; x < W; x++) p.set(x, y, mix(hexOf(p.get(x, y)), wc, a));
  }
  // light shafts from the low sun (west, upper left), slanting down to the right
  for (let i = 0; i < 5; i++) {
    const x0 = 30 + i * 64 + Math.round(h01(i, 31, 6614) * 20);
    const wdt = 6 + (i % 3) * 3;
    for (let y = WATER_Y + 1; y < FLOOR_Y; y++) {
      const k = (y - WATER_Y) / (FLOOR_Y - WATER_Y);
      const xs = Math.round(x0 + (y - WATER_Y) * 0.55);
      for (let x = xs; x < xs + wdt; x++) {
        if (x < 0 || x >= W) continue;
        const edge = x === xs || x === xs + wdt - 1 ? 0.5 : 1;
        const al = 0.16 * (1 - k) * edge;
        if (al > 0.01) p.set(x, y, mix(hexOf(p.get(x, y)), '#D8F0E0', al));
      }
    }
  }
  // the surface: a bright line of the sky, a softer band under it, small ripples
  for (let x = 0; x < W; x++) {
    p.set(x, WATER_Y, mix(sk.water, P.glint, 0.45));
    p.set(x, WATER_Y + 1, mix(hexOf(p.get(x, WATER_Y + 1)), sk.water, 0.55));
    p.set(x, WATER_Y + 2, mix(hexOf(p.get(x, WATER_Y + 2)), sk.water, 0.3));
    if ((x >> 2) % 5 === 0) p.set(x, WATER_Y + 3, mix(hexOf(p.get(x, WATER_Y + 3)), P.glint, 0.18));
  }

  // ---- ザリガニの 穴（のり面の下、左）
  const [bx, by] = SPOTS.kusa.home;
  p.ellipse(bx, by, 7, 5, mix(P.woodDark, WATER_DEEP, 0.5));
  p.ellipse(bx, by, 5, 4, P.night);
  p.ellipse(bx + 1, by + 1, 3, 2, P.void);
  for (let i = -6; i <= 6; i += 3) p.set(bx + i, by + 5 + (i & 1), mix(P.wood, WATER_DEEP, 0.55)); // spoil heaped at the mouth

  // ---- 草（左の 3分の1）：畦の 草が 水面まで 垂れて、根が 水の中へ
  for (let i = 0; i < 70; i++) {
    const x0 = 1 + Math.floor(h01(i, 1, 6613) * 112);
    const len = 10 + Math.floor(h01(i, 2, 6615) * 30);
    const bend = (h01(i, 3, 6617) - 0.35) * 8 + lean * 5;
    const col = i % 6 === 0 ? P.leafYoung : i % 4 === 0 ? P.leafShade : i % 2 ? P.leafDeep : P.leaf;
    for (let j = 0; j < len; j++) {
      const y = 9 + j;
      const x = Math.round(x0 + (bend * j * j) / (len * len));
      if (y > WATER_Y + 5) break;
      const wet = y > WATER_Y;
      const c = wet ? mix(col, WATER_TOP, 0.6) : j < 2 ? P.leafLt : j > len - 3 ? mix(col, P.leafLt, 0.4) : col;
      p.set(x, y, c);
      if (j < len / 3 && !wet && i % 3 === 0) p.set(x + 1, y, mix(col, P.ink, 0.2));
    }
  }
  // a few seed heads of the grass (メヒシバ), pale, at the ridge's top
  for (let i = 0; i < 7; i++) {
    const x = 6 + i * 15 + (i % 2) * 4;
    for (let j = 0; j < 4; j++) p.set(x + j, 5 + (j >> 1), P.goldPale);
    p.set(x - 1, 7, P.leafYoung);
    p.vline(x - 1, 8, 10, P.leaf);
  }
  // roots hanging in the water under the grass
  for (let i = 0; i < 16; i++) {
    let x = 6 + Math.floor(h01(i, 7, 6619) * 96);
    const len = 8 + Math.floor(h01(i, 8, 6621) * 22);
    for (let j = 0; j < len; j++) {
      const y = WATER_Y + 3 + j;
      if (ihash(i, j, 6623) % 4 === 0) x += ihash(i, j, 6625) % 2 ? 1 : -1;
      p.set(x, y, mix(P.brassOld, WATER_DEEP, 0.45 + j / len / 3));
    }
  }

  // ---- 底の泥（手前の面）
  for (let y = FLOOR_Y; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = valueNoise(x / 6, y / 3, 6627);
      const n2 = h01(x, y, 6629);
      let c: string = n > 0.6 ? '#4A3426' : n < 0.3 ? '#2E2230' : '#3A2B2A';
      if (y === FLOOR_Y) c = mix(P.woodDark, WATER_TOP, 0.35);
      else if (y === FLOOR_Y + 1) c = '#4A3426';
      if (n2 > 0.97) c = mix(P.steel, WATER_DEEP, 0.4); // grit
      else if (n2 > 0.955) c = mix(P.brassOld, WATER_DEEP, 0.5); // a bit of straw
      p.set(x, y, c);
    }
  // the foot of the ridge wall meets the mud: a dark seam
  for (let x = 0; x < W; x++) p.set(x, FLOOR_Y - 1, mix(hexOf(p.get(x, FLOOR_Y - 1)), P.ink, 0.35));

  // ---- 水口の 石（まん中）：水が 落ちて 掘れる所に 置いた石。下に 陰
  const rock = (cx: number, cy: number, rx: number, ry: number, seed: number) => {
    for (let y = cy - ry; y <= cy + ry; y++)
      for (let x = cx - rx; x <= cx + rx; x++) {
        const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
        if (d > 1) continue;
        const lit = (x - cx) / rx + (y - cy) / ry < -0.5;
        const dark = (x - cx) / rx + (y - cy) / ry > 0.7;
        let c = lit ? '#8E9A94' : dark ? '#4A5856' : '#6B7A76';
        if (h01(x, y, seed) > 0.9) c = mix(c, P.leafShade, 0.6);
        if (y < cy - ry * 0.4 && h01(x, y, seed + 1) > 0.55) c = mix(P.leafShade, WATER_TOP, 0.3); // moss on the top
        p.set(x, y, mix(c, WATER_DEEP, 0.25));
      }
  };
  const [sx0] = SPOTS.ishi.home;
  // the shade under the stones where a crayfish waits
  p.ellipse(sx0, FLOOR_Y - 1, 12, 3, mix(P.void, WATER_DEEP, 0.2));
  rock(sx0 + 12, FLOOR_Y - 8, 12, 8, 6631);
  rock(sx0 - 4, FLOOR_Y - 6, 9, 6, 6633);
  rock(sx0 + 26, FLOOR_Y - 4, 7, 5, 6635);
  // the shade gap under the front stone (the 陰)
  p.hline(sx0 - 8, sx0 + 4, FLOOR_Y - 1, P.void);
  p.hline(sx0 - 6, sx0 + 2, FLOOR_Y - 2, mix(P.void, WATER_DEEP, 0.4));
  // a pond snail on the big stone
  p.set(sx0 + 8, FLOOR_Y - 16, '#5A4A3A');
  p.set(sx0 + 9, FLOOR_Y - 16, '#7A6A4A');
  p.set(sx0 + 8, FLOOR_Y - 17, '#7A6A4A');

  // ---- 古い 土管（右）：口が こっちを 向いて、下は泥に うまっている
  const [dx0, dy0] = SPOTS.dokan.home;
  for (let y = dy0 - 13; y <= FLOOR_Y + 1; y++)
    for (let x = dx0 - 14; x <= dx0 + 14; x++) {
      const d = ((x - dx0) / 13.5) ** 2 + ((y - dy0) / 12.5) ** 2;
      if (d > 1) continue;
      const inner = ((x - dx0) / 9) ** 2 + ((y - dy0 - 1) / 8.5) ** 2 < 1;
      let c: string;
      if (inner) {
        const dd = ((x - dx0) / 9) ** 2 + ((y - dy0 - 1) / 8.5) ** 2;
        c = dd < 0.45 ? P.void : dd < 0.8 ? P.night : '#2A2238';
      } else {
        const lit = x - dx0 + (y - dy0) < -6;
        c = lit ? '#B8B2A4' : x - dx0 + (y - dy0) > 8 ? '#6E6A66' : '#948E82';
        if (h01(x, y, 6637) > 0.86) c = mix(c, P.leafShade, 0.7);
        if (y < dy0 - 8 && h01(x, y, 6639) > 0.45) c = mix(P.leafShade, WATER_TOP, 0.2);
      }
      p.set(x, y, mix(c, WATER_DEEP, inner ? 0 : 0.28));
    }
  // the mud heaped over its bottom
  for (let x = dx0 - 16; x <= dx0 + 16; x++) {
    const top = FLOOR_Y - 2 + (Math.abs(x - dx0) > 10 ? 1 : 0) - (h01(x, 1, 6641) > 0.7 ? 1 : 0);
    for (let y = top; y <= FLOOR_Y + 1; y++) p.set(x, y, y === top ? mix(P.woodDark, WATER_TOP, 0.3) : '#3A2B2A');
  }

  // ---- ペットボトルの しかけ（底に 横だおし、口は左）。糸が 上へ
  const tx = 96;
  const ty = FLOOR_Y - 4;
  const glass = mix(P.aqua, WATER_TOP, 0.45);
  p.rect(tx, ty - 3, 18, 6, mix(glass, WATER_DEEP, 0.2));
  p.hline(tx, tx + 17, ty - 3, mix(P.aqua, P.glint, 0.3));
  p.hline(tx + 1, tx + 16, ty + 2, mix(glass, WATER_DEEP, 0.5));
  p.vline(tx + 17, ty - 2, ty + 1, mix(glass, P.glint, 0.3));
  // the funnel end (the cut-off top pushed in)
  p.vline(tx - 1, ty - 2, ty + 1, mix(glass, P.glint, 0.2));
  p.vline(tx + 2, ty - 1, ty, mix(P.aqua, P.glint, 0.4));
  p.set(tx + 3, ty, mix(P.aqua, P.glint, 0.4));
  // a scrap of するめ inside, a stone to weigh it down
  p.rect(tx + 8, ty, 3, 1, mix('#E8D9B5', WATER_TOP, 0.35));
  p.set(tx + 4, ty - 2, P.glint);
  p.set(tx + 5, ty - 2, P.glint);
  rock(tx + 21, FLOOR_Y - 2, 3, 2, 6643);
  // the string up to the stake on the ridge
  for (let y = 12; y < ty - 3; y++) {
    const x = tx + 17 + Math.round((y - ty) * -0.06);
    p.set(x, y, y > WATER_Y ? mix('#E8E4D8', WATER_TOP, 0.5) : '#E8E4D8');
  }

  // ---- 手前の稲（右の端）：株が 2つ。茎は 水の中から、長い葉が 弓なりに、穂は 垂れはじめ
  //      （8月31日：穂が 出て 2〜3週間。もみは まだ 黄緑、先の方から 色づく）
  const hills = [300, 318];
  hills.forEach((hx, hi) => {
    // the stems: from the mud up out of the water
    for (let s2 = -2; s2 <= 2; s2++) {
      const topY = 8 + ((s2 + 2 + hi) % 3) * 2;
      for (let y = FLOOR_Y + 1; y >= topY; y--) {
        const k = (FLOOR_Y + 1 - y) / (FLOOR_Y + 1 - topY);
        const x = Math.round(hx + s2 * (0.6 + k * 1.6) + lean * k * 2);
        const wet = y > WATER_Y;
        const base = s2 % 2 ? P.leafDeep : P.leaf;
        p.set(x, y, wet ? mix(base, WATER_TOP, 0.55) : y < 16 ? P.leafYoung : base);
      }
    }
    // long leaves arching out to both sides
    for (const [dir, y0, len] of [[-1, 18, 16], [1, 22, 14], [-1, 30, 12], [1, 12, 12]] as [number, number, number][]) {
      for (let j = 0; j < len; j++) {
        const x = hx + dir * (2 + Math.round(j * 0.75));
        const y = y0 - 4 + Math.round(((j - len * 0.35) ** 2) / (len * 0.9));
        p.set(x, y, j > len - 3 ? P.leafDeep : j < 3 ? P.leafYoung : P.leaf);
      }
    }
    // the ears: out of the top of the stems, bending over and hanging (grains in two rows)
    for (let e = 0; e < 3; e++) {
      const ex = hx - 2 + e * 2 + lean * 2;
      const ey = 7 + (e % 2) * 2 + hi;
      for (let j = 0; j < 10; j++) {
        const x = ex + Math.round(Math.sin((j / 10) * 1.9) * 4);
        const y = ey + Math.round(j * 0.9);
        const grain = j > 2 && j % 2 === 0;
        p.set(x, y, j < 2 ? P.leafYoung : j > 6 ? P.goldPale : P.leafLt);
        if (grain) p.set(x + 1, y, j > 6 ? P.brass : P.goldPale);
      }
    }
  });

  // ---- ウキクサ（水面のみどりの点、右の半分）
  for (let i = 0; i < 26; i++) {
    const x = 170 + Math.floor(h01(i, 11, 6645) * 130);
    const c = i % 3 ? P.leafYoung : P.leaf;
    p.set(x, WATER_Y, c);
    p.set(x + 1, WATER_Y, c);
    if (i % 4 === 0) p.set(x, WATER_Y + 1, mix(P.leaf, WATER_TOP, 0.4));
  }

  // ---- 段階の色を 全体に（7.3 の乗算。背景だけ、焼くときに1回）
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = p.get(x, y);
      if (!v) continue;
      p.set(x, y, mulHex(hexOf(v), sk.tint));
    }
  return p.toCanvas();
}

function hexOf(v: number): string {
  return '#' + [v & 255, (v >>> 8) & 255, (v >>> 16) & 255].map((n) => n.toString(16).padStart(2, '0')).join('');
}

// ---------------------------------------------------------------- ザリガニ

type Tones = [dark: string, shade: string, base: string, light: string];
const CRAY: Record<'kozari' | 'zari' | 'makka' | 'nushi', { col: Tones; claw: number; nearClaw?: number; moss?: boolean }> = {
  // 小さいのは 黄土色がかった 茶（まだ 赤くない）
  kozari: { col: ['#3A2B24', '#5E4A30', '#86703E', '#B09A5E'], claw: 0.85 },
  // 中くらいは 赤茶
  zari: { col: ['#4A1E1A', '#7A3024', '#A84A34', '#C8643A'], claw: 1.0 },
  // マッカチン：あざやかな赤、はさみに 白っぽい いぼ
  makka: { col: ['#5E1E2A', '#B8241E', '#E23B2E', '#FF6A4D'], claw: 1.2 },
  // ぬし：黒っぽい えんじ、背に苔。手前の はさみが 小さい（生えかわり）
  nushi: { col: ['#2A1420', '#5E1E2A', '#8A2E3A', '#B04A5A'], claw: 1.3, nearClaw: 0.5, moss: true },
};

export interface CrayPose {
  /** 0/1: 足の 動き。 */
  leg: number;
  /** はさみが 開いている（0 閉じ、1 開き）。 */
  open: number;
  /** しっぽを まるめている（逃げる）。 */
  curl?: boolean;
  /** ひげの ゆれ（0/1）。 */
  ant?: number;
}

export interface CrayImg {
  img: HTMLCanvasElement;
  /** 額の先（体長の0）の キャンバス内の位置。 */
  ax: number;
  /** 足が 底に つく行。 */
  ay: number;
  /** 手前の はさみの 先（するめを はさむ所）。 */
  tip: [number, number];
}

/** 横から見た ザリガニ（左向き）。`cm` の体長（2px/cm）。 */
export function crayfish(kind: 'kozari' | 'zari' | 'makka' | 'nushi', cm: number, pose: CrayPose): CrayImg {
  const key = `cray:${kind}:${cm}:${pose.leg}:${pose.open}:${pose.curl ? 1 : 0}:${pose.ant ?? 0}`;
  const hit = crayMeta.get(key);
  if (hit) return hit;
  const r = buildCray(kind, cm, pose);
  crayMeta.set(key, r);
  return r;
}
const crayMeta = new Map<string, CrayImg>();

function buildCray(kind: 'kozari' | 'zari' | 'makka' | 'nushi', cm: number, pose: CrayPose): CrayImg {
  const spec = CRAY[kind];
  const [D, S, B, Lt] = spec.col;
  const L = Math.max(8, Math.round(cm * PX_PER_CM));
  // proportions (x from the forehead, the tip of the rostrum; y down; cy = the body's middle row)
  const carRy = Math.max(2, Math.round(L * 0.15));
  const clawK = spec.claw;
  const nearK = spec.nearClaw ?? clawK;
  const palm = (k: number) => ({ rx: Math.max(2, L * 0.17 * k), ry: Math.max(1.2, L * 0.095 * k), fing: Math.max(2, Math.round(L * 0.2 * k)) });
  const pn = palm(nearK);
  const pf = palm(clawK);
  const reachOf = (p: { rx: number; fing: number }) => Math.round(L * 0.05 + p.rx * 2 + p.fing);
  const reach = Math.max(reachOf(pn), reachOf(pf));
  const antLen = Math.round(L * 0.9);
  const padL = Math.max(reach, Math.round(antLen * 0.7)) + 2;
  const W = padL + L + 2;
  const top = Math.round(L * 0.42) + 2;
  const H = top + carRy * 2 + 5;
  const floor = H - 1;
  const cy = floor - 2 - carRy;
  const X = (x: number) => Math.round(padL + x);
  // tone grid: 0 none, 1 dark, 2 shade, 3 base, 4 light (5 = the near claw's own base, to keep it apart)
  const body = new Uint8Array(W * H);
  const front = new Uint8Array(W * H);
  let tone = body;
  const put = (x: number, y: number, t: number) => {
    x = Math.round(x);
    y = Math.round(y);
    if (x >= 0 && y >= 0 && x < W && y < H) tone[y * W + x] = t;
  };
  /** A lit ellipse: top row light, bottom rows shade (the sun from the upper left). */
  const blob = (cx: number, ccy: number, rx: number, ry: number, far = false) => {
    for (let y = Math.floor(ccy - ry); y <= Math.ceil(ccy + ry); y++)
      for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x++) {
        const d = ((x - cx) / (rx + 0.35)) ** 2 + ((y - ccy) / (ry + 0.35)) ** 2;
        if (d > 1) continue;
        const up = (y - ccy) / (ry + 0.35);
        let t = up < -0.55 ? 4 : up > 0.5 ? 2 : 3;
        if (far) t = Math.max(2, t - 1);
        put(x, y, t);
      }
  };
  /**
   * A claw raised forward and up (the crayfish's threat pose, its most telling shape):
   * the arm from under the head, the palm as an oval along `ang` (0 = straight ahead,
   * up is positive), the two fingers to the tip (open: a V). Returns the tip (canvas px).
   */
  const claw = (p: { rx: number; ry: number; fing: number }, ang: number, far: boolean): [number, number] => {
    const ux = -Math.cos(ang);
    const uy = -Math.sin(ang);
    const vx = -uy;
    const vy = ux;
    // the shoulder under the head, the palm's centre out along the arm
    const sx0 = L * 0.12;
    const sy0 = cy + carRy * 0.45 + (far ? -1 : 0);
    const arm = L * 0.12 + p.rx * 0.6;
    const bx = sx0 + ux * (arm + p.rx);
    const by = sy0 + uy * (arm + p.rx);
    // the arm: a 2px bar
    const n = Math.ceil(arm + 1);
    for (let i = 0; i <= n; i++) {
      put(X(sx0 + ux * i), sy0 + uy * i, far ? 2 : 3);
      put(X(sx0 + ux * i), sy0 + uy * i + 1, 2);
    }
    // the palm
    const R = Math.ceil(Math.max(p.rx, p.ry)) + 1;
    for (let y = Math.floor(by - R); y <= Math.ceil(by + R); y++)
      for (let x = Math.floor(bx - R); x <= Math.ceil(bx + R); x++) {
        const du = (x - bx) * ux + (y - by) * uy;
        const dv = (x - bx) * vx + (y - by) * vy;
        const d = (du / (p.rx + 0.4)) ** 2 + (dv / (p.ry + 0.4)) ** 2;
        if (d > 1) continue;
        const lit = y - by < -p.ry * 0.4;
        const dark = y - by > p.ry * 0.5;
        put(X(x), y, far ? (lit ? 3 : 2) : lit ? 4 : dark ? 2 : 3);
      }
    // the fingers from the palm's front to the tip
    const fx = bx + ux * p.rx;
    const fy = by + uy * p.rx;
    const open = pose.open ? 1 : 0;
    let tip: [number, number] = [X(fx), Math.round(fy)];
    for (let i = 1; i <= p.fing; i++) {
      const k = i / p.fing;
      const cx0 = fx + ux * i;
      const cy0 = fy + uy * i;
      const off = open ? 0.6 + k * 1.6 : Math.max(0, (1 - k) * (p.ry - 0.3));
      put(X(cx0 + vx * off), cy0 + vy * off, far ? 2 : k < 0.5 ? 4 : 3);
      put(X(cx0 - vx * off), cy0 - vy * off, far ? 2 : 2);
      if (!open && off >= 1 && k < 0.45) put(X(cx0), cy0, far ? 2 : 3);
      tip = [X(cx0), Math.round(cy0)];
    }
    // the bumps (tubercles) of the big red ones: pale dots along the palm's top
    if (kind === 'makka' && !far)
      for (let i = -p.rx + 1; i < p.rx; i += 2) put(X(bx + ux * i - vx * (p.ry - 0.2)), by + uy * i - vy * (p.ry - 0.2), 5);
    return tip;
  };

  // ---- the far claw first (behind, a shade darker, a row higher)
  claw(pf, 0.95, true);
  // ---- the tail fan and the abdomen (or curled under the body: the escape flip)
  const xc = L * 0.5;
  const xt = L * 0.84;
  if (!pose.curl) {
    for (let x = Math.round(xc); x <= Math.round(xt); x++) {
      const k = (x - xc) / (xt - xc);
      const half = carRy * (0.95 - 0.35 * k);
      const mid = cy + 0.4 + k * 0.8;
      for (let y = Math.round(mid - half); y <= Math.round(mid + half); y++) {
        const up = (y - mid) / half;
        put(X(x), y, up < -0.6 ? 4 : up > 0.55 ? 2 : 3);
      }
    }
    // the segment rings
    const seg = Math.max(2, Math.round(L * 0.08));
    for (let x = Math.round(xc) + seg; x < xt; x += seg) {
      const k = (x - xc) / (xt - xc);
      const half = carRy * (0.95 - 0.35 * k);
      const mid = cy + 0.4 + k * 0.8;
      for (let y = Math.round(mid - half) + 1; y <= Math.round(mid + half); y++) put(X(x), y, 2);
    }
    // the fan: the telson and the uropods, spread
    const fy = cy + 1.2;
    for (let x = Math.round(xt) + 1; x <= L - 1; x++) {
      const k = (x - xt) / Math.max(1, L - 1 - xt);
      const half = Math.round(carRy * (0.5 + 0.55 * k));
      for (let y = Math.round(fy - half); y <= Math.round(fy + half); y++) put(X(x), y, (y - Math.round(fy)) % 2 === 0 ? 3 : 2);
      put(X(x), Math.round(fy - half), 4);
    }
  } else {
    // folded under: the segments go down and forward, the fan under the head
    for (let x = Math.round(xc - 1); x <= Math.round(xc + carRy + 1); x++)
      for (let y = cy - carRy + 1; y <= cy + carRy; y++) put(X(x), y, y === cy - carRy + 1 ? 4 : 3);
    for (let x = Math.round(L * 0.15); x <= Math.round(xc); x++) {
      put(X(x), cy + carRy + 1, 2);
      put(X(x), cy + carRy, 3);
    }
  }
  // ---- the carapace (頭胸甲) and the rostrum
  blob(X(L * 0.25), cy - 0.3, L * 0.23, carRy + 0.4);
  put(X(0), cy - 1, 3);
  put(X(1), cy - 1, 4);
  put(X(1), cy, 3);
  // the cervical groove
  const gx = X(L * 0.3);
  for (let y = cy - carRy + 1; y <= cy + carRy - 1; y++) put(gx + (y > cy ? 1 : 0), y, 2);
  // moss on the ぬし's back
  if (spec.moss) for (let x = 2; x < L * 0.8; x += 3) if (ihash(x, cm, 6651) % 3 !== 0) put(X(x), cy - carRy + (x > xc ? 1 : 0), 6);
  // ---- the near claw last (in front), on its own layer
  tone = front;
  // (the ぬし's small claw, grown back after a fight, is held lower: it shows beside the big one)
  const tip = claw(pn, spec.nearClaw ? 0.15 : 0.5, false);

  // ---- to pixels: the body with its outline, then the near claw with its own over it
  const col = ['', D, S, B, Lt, '#F6D98A', '#3F6E4A'];
  const layer = (g: Uint8Array) => {
    const c = new PixelCanvas(W, H);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = g[y * W + x];
        if (t) c.set(x, y, col[t]);
      }
    c.outline(D);
    return c;
  };
  const p = layer(body);
  const fc = layer(front);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const v = fc.get(x, y);
      if (v) p.data[y * W + x] = v;
    }
  // ---- legs: four thin walking legs from under the carapace to the floor (they step)
  for (let i = 0; i < 4; i++) {
    const x = X(L * (0.14 + 0.09 * i));
    const sw = (i + pose.leg) % 2 === 0 ? -1 : 1;
    const y0 = cy + carRy + 1;
    p.set(x, y0, D);
    p.set(x + sw, Math.min(floor, y0 + 1), D);
    for (let y = y0 + 2; y <= floor; y++) p.set(x + sw * 2, y, D);
  }
  // ---- feelers: two long antennae rising from the head and sweeping back over the body,
  // two short ones (antennules) forward
  const hx = X(1);
  const hy = cy - carRy + 1;
  const wav = pose.ant ?? 0;
  for (let a = 0; a < 2; a++) {
    const len = a ? Math.round(antLen * 0.7) : antLen;
    let px = -1;
    let py = -1;
    for (let i = 1; i <= len; i++) {
      const k = i / len;
      const th = Math.PI * (0.78 - 0.62 * k) + (a ? 0.1 : 0);
      const r = L * (0.3 + 0.62 * k);
      const x = Math.round(hx + L * 0.2 + Math.cos(Math.PI - th) * r * 0.85);
      const y = Math.round(hy - 1 - Math.sin(th) * r * (0.62 - a * 0.14) - (wav && k > 0.75 ? 1 : 0));
      if (x === px && y === py) continue;
      // a continuous 1px line (no gaps on the steep part of the arc)
      if (px >= 0) p.line(px, py, x, y, a ? S : D);
      else if (x >= 0 && x < W && y >= 0) p.set(x, y, a ? S : D);
      px = x;
      py = y;
    }
  }
  p.set(hx - 1, hy, S);
  p.set(hx - 2, hy - 1, S);
  p.set(hx - 1, hy + 1, S);
  // the stalked eye
  const ex = X(L * 0.1);
  p.set(ex, cy - carRy + 1, P.ink);
  p.set(ex + 1, cy - carRy, D);
  if (L >= 14) p.set(ex, cy - carRy, Lt);
  return { img: p.toCanvas(), ax: padL, ay: floor, tip };
}

/** 90度 まわした（頭が 上）：ぶら下がる ザリガニ。 */
export function crayHang(kind: 'kozari' | 'zari' | 'makka' | 'nushi', cm: number, pose: CrayPose): CrayImg {
  const key = `hang:${kind}:${cm}:${pose.leg}:${pose.open}:${pose.ant ?? 0}`;
  const hit = crayMeta.get(key);
  if (hit) return hit;
  const src = crayfish(kind, cm, pose);
  const sw = src.img.width;
  const sh = src.img.height;
  const cv = document.createElement('canvas');
  cv.width = sh;
  cv.height = sw;
  const ctx = cv.getContext('2d')!;
  // rotate 90° clockwise: (x, y) → (sh - 1 - y, x); the head (left) goes up
  ctx.translate(sh, 0);
  ctx.rotate(Math.PI / 2);
  ctx.drawImage(src.img, 0, 0);
  const rot = (x: number, y: number): [number, number] => [sh - 1 - y, x];
  const [ax, ay] = rot(src.ax, src.ay);
  const r: CrayImg = { img: cv, ax, ay, tip: rot(src.tip[0], src.tip[1]) };
  crayMeta.set(key, r);
  return r;
}

// ---------------------------------------------------------------- するめ、長靴、空き缶

/** するめ（たこ糸の先）。5×3。 */
export function baitImg(): HTMLCanvasElement {
  return cached('tsuri:bait', () => {
    const p = new PixelCanvas(6, 5);
    p.rect(0, 1, 6, 3, '#E8D9B5');
    p.hline(0, 5, 1, '#FBF3DC');
    p.hline(1, 5, 3, '#C8A06A');
    p.set(5, 2, '#C8A06A');
    p.set(0, 4, '#C8A06A');
    p.set(4, 4, '#C8A06A');
    // the knot of the string on top
    p.set(2, 0, '#F4F1E8');
    p.set(3, 0, '#C8C2B4');
    return p.toCanvas();
  });
}

/** 長靴（片方。泥つき）。横から、つま先が 左。 */
export function bootImg(): HTMLCanvasElement {
  return cached('tsuri:boot', () => {
    const p = new PixelCanvas(17, 19);
    const K = '#2E3A34';
    const Ks = '#1E2622';
    const Kl = '#4E5E54';
    const Kh = '#6B7A70';
    // the shaft, its rolled top (the lining shows) and a yellow band
    p.rect(8, 2, 8, 12, K);
    p.vline(8, 3, 13, Kl);
    p.vline(9, 3, 13, Kh);
    p.vline(15, 3, 13, Ks);
    p.rect(8, 0, 8, 2, '#3A3F48');
    p.hline(8, 15, 0, '#9AA0A8');
    p.hline(9, 14, 1, '#C8A06A');
    p.hline(8, 15, 6, '#C8A04A');
    p.hline(8, 15, 7, '#8A6A2A');
    // the foot, toe to the left, the sole and its tread
    p.rect(1, 12, 15, 4, K);
    p.hline(2, 14, 12, Kl);
    p.hline(1, 3, 13, Kh);
    p.rect(0, 15, 16, 2, Ks);
    for (let x = 1; x < 15; x += 3) p.set(x, 16, '#0E1412');
    // mud splashed on it, a leaf stuck to the heel, water running out of the top
    for (const [x, y] of [[2, 14], [5, 14], [10, 15], [13, 13], [12, 10], [14, 4]]) p.set(x, y, '#5A3A2A');
    p.set(15, 11, '#5FA85A');
    p.set(14, 12, '#3FA66B');
    p.set(11, 3, '#7FD1E8');
    p.set(11, 4, '#4AA8E0');
    p.outline('#1B1733');
    return p.toCanvas();
  });
}

/** 空き缶（横だおし）。中に 小さいザリガニ（はさみが 2つ のぞく）。 */
export function canImg(stage = 0): HTMLCanvasElement {
  return cached(`tsuri:can:${stage}`, () => {
    const p = new PixelCanvas(17, 10);
    // the can, lying on its side, its open end to the left
    p.rect(4, 1, 12, 8, '#C8C2B4');
    p.hline(4, 15, 1, '#E8E4D8');
    p.hline(4, 15, 2, '#E8E4D8');
    p.hline(4, 15, 8, '#9AA0A8');
    p.vline(15, 2, 7, '#9AA0A8');
    // a faded label band and the dent
    p.rect(7, 2, 6, 6, '#4AA8E0');
    p.rect(8, 3, 4, 3, '#7FD1E8');
    p.set(13, 4, '#9AA0A8');
    p.set(14, 7, '#A8742A'); // rust
    // the open end: the dark inside and the rim
    p.rect(3, 2, 2, 6, '#1B1733');
    p.vline(4, 1, 8, '#9AA0A8');
    // two small claws poking out of it (a young crayfish lives inside)
    for (const [y, d] of [[3, -1], [6, 1]] as [number, number][]) {
      p.hline(0, 3, y, '#86703E');
      p.set(0, y + d, '#86703E');
      p.set(1, y, '#B09A5E');
      p.set(3, y + 1, '#5E4A30');
    }
    p.outline('#3A3F48');
    return p.toCanvas();
  });
}

// ---------------------------------------------------------------- 計る：定規と紙（ノート）

/** たもつの 定規（白木、0〜20cm、1cm ごとの目もり）。1× で 2px/cm。 */
export function rulerImg(): HTMLCanvasElement {
  return cached('tsuri:ruler', () => {
    const len = 20 * PX_PER_CM;
    const p = new PixelCanvas(len + 5, 7);
    p.rect(0, 0, len + 5, 7, P.woodLt);
    p.hline(0, len + 4, 0, '#E8C890');
    p.hline(0, len + 4, 6, P.brassOld);
    p.vline(len + 4, 0, 6, P.brassOld);
    for (let c = 0; c <= 20; c++) {
      const x = 2 + c * PX_PER_CM;
      const h = c % 5 === 0 ? 4 : 2;
      p.vline(x, 1, h, P.woodDark);
    }
    // a worn patch and a nail hole (it is old)
    p.set(len - 6, 5, P.brass);
    p.set(len - 5, 5, P.brass);
    p.set(len + 2, 3, P.woodDark);
    p.outline(P.wood);
    return p.toCanvas();
  });
}

/** ザリガニの形の なぞり線（えんぴつ）。`crayfish()` と同じ形の 外まわり。 */
export function traceImg(kind: 'kozari' | 'zari' | 'makka' | 'nushi', cm: number): CrayImg {
  const key = `trace:${kind}:${cm}`;
  const hit = crayMeta.get(key);
  if (hit) return hit;
  const src = crayfish(kind, cm, { leg: 0, open: 0 });
  const w = src.img.width;
  const h = src.img.height;
  const cv = document.createElement('canvas');
  cv.width = w;
  cv.height = h;
  const sctx = src.img.getContext('2d', { willReadFrequently: true })!;
  const d = sctx.getImageData(0, 0, w, h).data;
  const ctx = cv.getContext('2d')!;
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && d[(y * w + x) * 4 + 3] > 0;
  ctx.fillStyle = '#4A3A6E';
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      if (!on(x, y)) continue;
      // the edge of the silhouette only (a traced line), a few pixels skipped (a hand)
      if (on(x - 1, y) && on(x + 1, y) && on(x, y - 1) && on(x, y + 1)) continue;
      if (ihash(x, y, 6653) % 9 === 0) continue;
      ctx.fillRect(x, y, 1, 1);
    }
  const r: CrayImg = { img: cv, ax: src.ax, ay: src.ay, tip: src.tip };
  crayMeta.set(key, r);
  return r;
}

/** ザリ拓の 小さい紙（つりえさ屋の壁、12×13）。段階2は ザリガニが 北東を向く。 */
export function zariTakuWall(ne: boolean): HTMLCanvasElement {
  return cached(`tsuri:wall:${ne ? 1 : 0}`, () => {
    const p = new PixelCanvas(13, 14);
    // the paper, a strip of tape at the top, a red 認 stamp in the corner
    p.rect(1, 2, 11, 11, P.paper);
    p.vline(12, 3, 12, '#D8CCAE');
    p.hline(2, 12, 13, '#D8CCAE');
    p.rect(4, 0, 5, 3, '#F7C27Ad9');
    const ink = '#4A3A6E';
    if (!ne) {
      // a crayfish traced in pencil, facing left: claws, body, fan
      const rows = ['..##.......', '.#..#......', '#....####..', '.#.##....#.', '..#......##', '...######.#', '..#.#.#....'];
      rows.forEach((r, j) => [...r].forEach((c, i) => c === '#' && p.set(1 + i, 3 + j, ink)));
    } else {
      // the same, turned to the north-east
      const rows = ['........##.', '......##.#.', '....##...#.', '..##....#..', '.#.....#...', '#.#..##....', '.#.##......'];
      rows.forEach((r, j) => [...r].forEach((c, i) => c === '#' && p.set(1 + i, 3 + j, ink)));
    }
    p.rect(9, 10, 2, 2, P.verm);
    p.hline(2, 7, 11, '#9AA0A8');
    return p.toCanvas();
  });
}
