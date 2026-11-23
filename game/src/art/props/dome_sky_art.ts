// 天文台の 中の 大写しの 絵（50 10.25、52 7.7、02_ch2_index #77）。どれも 1回 焼いて とっておく。
//
//   skyPanorama()   スリットごしの 空：方位 0〜360°（4px/度）× 高さ 0〜90°（1.9px/度）。
//                   夏の 終わりの 夜明け前、北緯35.5°・恒星時 3.3時の 本当の 星の 位置
//                   （明るい 星の 表から 計算）：東に 金星（明けの明星、高さ約27°）、
//                   その 右に 冬の 星座（オリオン座、こいぬ座、ふたご座、低く シリウス）、
//                   南南東の 高い ところに すばる。東の 地平は 夜明け前の 青。山の 影。
//   lookFrame()     見上げた ドームの 内がわ（384×216）：まん中に スリット（幅56）、レール、
//                   リブ、下に ドームの 台の 輪と 方位の 帯（帯の 字は 毎フレーム）。
//   eyePatch(n)     接眼レンズの 中（280×280、星を まん中に）：上下左右 さかさまの 像。
//                   ①金星：半分 光った 小さな 円（光る 側は 右上＝ほんとうは 左下の 太陽の 側）
//                   ②オリオン座の 大星雲：灰緑の 雲が 鳥の 羽の ように 広がり、まん中に 台形の
//                   4つの 星（トラペジウム）、暗い 入江　③すばる：明るい 9つと 40ほどの 星。
//                   ぼけの 6段（0 = ピントが 合っている）を 前もって 作る（星は ぼけると 丸く
//                   広がって 暗く なる。雲は 雲の まま）。
//   compoundEye()   グソっ君の 目：視野の 絵が 蜂の 巣の ように いっぱいに 並ぶ。
//   hanamaruStroke() まつ先生の 赤ペンの はなまる：まん中から 渦（1と3/4巻き）、つづけて
//                   花びら 8つ（第2章の 手描きの はなまる。はっち先生の は 1枚 多い）。
//   halfMoon()      カードの 1つめの 欄の 鉛筆の 絵（12×12、右上 半分を 塗った 丸）。

import { BAYER4, makeCanvas, mix, PixelCanvas } from '../../engine/pixel';
import { valueNoise } from '../../engine/rng';
import { h01 } from '../tiles/noise';
import { P } from '../tiles/palette';

// ---------------------------------------------------------------- the sky (52 8.7, real positions)

export const PXD = 4; // px per degree of azimuth
export const VS = 1.9; // px per degree of altitude
export const HOR = 176; // the horizon's y in the panorama (and in the look-up frame)
export const SLIT_W = 56;
export const PAN_W = 360 * PXD;
export const PAN_H = 180;

const LAT = 35.5;
const LST = 3.3; // hours: before dawn at the end of August (the sun about 11° below the east horizon)

/** Altitude and azimuth (degrees; azimuth from north through east) of RA (h) / Dec (°). */
export function altAz(ra: number, dec: number): [number, number] {
  const r = Math.PI / 180;
  const H = (LST - ra) * 15 * r;
  const d = dec * r;
  const f = LAT * r;
  const sinAlt = Math.sin(f) * Math.sin(d) + Math.cos(f) * Math.cos(d) * Math.cos(H);
  const alt = Math.asin(sinAlt);
  const y = -Math.sin(H) * Math.cos(d);
  const x = Math.sin(d) * Math.cos(f) - Math.cos(d) * Math.sin(f) * Math.cos(H);
  let az = Math.atan2(y, x) / r;
  if (az < 0) az += 360;
  return [alt / r, az];
}

/** The bright stars of the sky before dawn: RA h, Dec °, magnitude, colour. */
const STARS: [string, number, number, number, string][] = [
  ['Sirius', 6.752, -16.72, -1.46, '#E8F0FF'],
  ['Procyon', 7.655, 5.22, 0.34, '#FFF6E8'],
  ['Betelgeuse', 5.919, 7.41, 0.45, '#FFB878'],
  ['Rigel', 5.242, -8.2, 0.13, '#D8E6FF'],
  ['Bellatrix', 5.419, 6.35, 1.64, '#E0EAFF'],
  ['Saiph', 5.796, -9.67, 2.06, '#E0EAFF'],
  ['Alnitak', 5.679, -1.94, 1.77, '#E8EEFF'],
  ['Alnilam', 5.604, -1.2, 1.69, '#E8EEFF'],
  ['Mintaka', 5.533, -0.3, 2.23, '#E8EEFF'],
  ['Aldebaran', 4.599, 16.51, 0.86, '#FFC890'],
  ['Elnath', 5.438, 28.61, 1.65, '#F0F4FF'],
  ['Capella', 5.278, 46.0, 0.08, '#FFF2C8'],
  ['Menkalinan', 5.992, 44.95, 1.9, '#F0F4FF'],
  ['Castor', 7.577, 31.89, 1.58, '#F0F4FF'],
  ['Pollux', 7.755, 28.03, 1.14, '#FFE0B0'],
  ['Alhena', 6.628, 16.4, 1.9, '#F0F4FF'],
  ['Mirfak', 3.405, 49.86, 1.79, '#FFF6E0'],
  ['Algol', 3.136, 40.96, 2.1, '#F0F4FF'],
  ['Hamal', 2.12, 23.46, 2.0, '#FFE0B8'],
  ['Menkar', 3.038, 4.09, 2.5, '#FFD0A8'],
  ['Alpheratz', 0.14, 29.09, 2.06, '#F0F4FF'],
  ['Mirach', 1.162, 35.62, 2.05, '#FFD8B0'],
  ['Almach', 2.065, 42.33, 2.1, '#FFE0B0'],
  ['Polaris', 2.53, 89.26, 2.0, '#FFF6E0'],
  ['Dubhe', 11.06, 61.75, 1.8, '#FFE0B8'],
  ['Merak', 11.03, 56.38, 2.4, '#F0F4FF'],
  ['Diphda', 0.727, -17.99, 2.0, '#FFE0B8'],
  ['Mirzam', 6.378, -17.96, 1.98, '#E8F0FF'],
  ['Hyades', 4.477, 15.87, 3.4, '#FFE8C8'],
  ['ain', 4.477, 19.18, 3.5, '#FFE8C8'],
];
/** 金星（明けの明星）: RA/Dec of an evening… of a morning apparition near the greatest western elongation, in Cancer. */
export const VENUS_RADEC: [number, number] = [7.95, 20.0];
/** M42 and the Pleiades (Alcyone). */
export const M42_RADEC: [number, number] = [5.588, -5.39];
export const SUBARU_RADEC: [number, number] = [3.791, 24.1];

/** The three targets: where they stand (alt, az). */
export function targetAltAz(n: 1 | 2 | 3): [number, number] {
  const rd = n === 1 ? VENUS_RADEC : n === 2 ? M42_RADEC : SUBARU_RADEC;
  return altAz(rd[0], rd[1]);
}

/** Panorama y of an altitude, x of an azimuth. */
export const panY = (alt: number) => Math.round(HOR - alt * VS);
export const panX = (az: number) => Math.round((((az % 360) + 360) % 360) * PXD);

/** The ridge of the hills round 星見台 (altitude, degrees) by azimuth. */
function ridge(az: number): number {
  const a = az / 360;
  let h = 1.6 + 2.6 * valueNoise(a * 9, 0.5, 811) + 1.4 * valueNoise(a * 31, 1.5, 812);
  // the higher hills to the west and north, the village's valley opening to the east
  h += 2.2 * Math.max(0, Math.cos(((az - 300) * Math.PI) / 180));
  return h;
}

let panCache: HTMLCanvasElement | null = null;

/** The whole sky through the slit as one strip (PAN_W + SLIT_W wide: the start repeats at the end). */
export function skyPanorama(): HTMLCanvasElement {
  if (panCache) return panCache;
  const W = PAN_W + SLIT_W;
  const p = new PixelCanvas(W, PAN_H);
  const sunAz = altAz(10.67, 8.3)[1];
  // the sky: dark above, a little lighter down to the horizon, the dawn's blue low in the east
  for (let x = 0; x < W; x++) {
    const az = (x / PXD) % 360;
    const dAz = Math.abs(((az - sunAz + 540) % 360) - 180);
    const glowAz = Math.max(0, 1 - dAz / 70);
    for (let y = 0; y < PAN_H; y++) {
      const alt = (HOR - y) / VS;
      const t = Math.max(0, Math.min(1, alt / 90));
      let c = mix('#1C1A3E', '#0B0D22', Math.sqrt(t));
      const g = glowAz * glowAz * Math.max(0, 1 - alt / 28);
      if (g > 0) {
        const k = Math.min(1, g * 1.25);
        const th = BAYER4[y & 3][x & 3] / 16;
        c = mix(c, k > 0.55 && th < k - 0.45 ? '#4E3A6E' : P.nightShade, Math.min(1, k * 1.1));
      }
      p.set(x, y, c);
    }
  }
  // the faint stars (seeded): more of them higher up, fewer in the dawn
  for (let i = 0; i < 2600; i++) {
    const az = h01(i, 1, 9101) * 360;
    const alt = Math.asin(h01(i, 2, 9101)) * (180 / Math.PI);
    const dAz = Math.abs(((az - sunAz + 540) % 360) - 180);
    if (dAz < 50 && alt < 18 && h01(i, 3, 9101) < 0.8) continue;
    const m = h01(i, 4, 9101);
    const x = panX(az);
    const y = panY(alt);
    if (y < 0 || y >= PAN_H) continue;
    const col = m > 0.93 ? '#C8CCF0' : m > 0.7 ? '#8C90BC' : '#5E6290';
    p.set(x, y, col);
    if (x < SLIT_W) p.set(x + PAN_W, y, col);
  }
  const plot = (az: number, alt: number, mag: number, col: string) => {
    for (const ox of [0, PAN_W]) {
      const x = panX(az) + ox;
      if (ox && x >= W) continue;
      const y = panY(alt);
      if (y < 1 || y >= PAN_H - 1 || x < 1 || x >= W - 1) continue;
      p.set(x, y, col);
      if (mag < 1.6) {
        const arm = mix(col, '#2A2C58', mag < 0.5 ? 0.25 : 0.5);
        p.set(x - 1, y, arm);
        p.set(x + 1, y, arm);
        p.set(x, y - 1, arm);
        p.set(x, y + 1, arm);
      }
      if (mag < 0) {
        p.set(x - 2, y, mix(col, '#2A2C58', 0.65));
        p.set(x + 2, y, mix(col, '#2A2C58', 0.65));
        p.set(x, y - 2, mix(col, '#2A2C58', 0.65));
        p.set(x, y + 2, mix(col, '#2A2C58', 0.65));
      }
    }
  };
  for (const [, ra, dec, mag, col] of STARS) {
    const [alt, az] = altAz(ra, dec);
    if (alt > 0.5) plot(az, alt, mag, col);
  }
  // M42: a faint smudge under the belt
  {
    const [alt, az] = altAz(M42_RADEC[0], M42_RADEC[1]);
    for (const [dx, dy] of [
      [0, 0],
      [1, 0],
      [0, 1],
      [-1, 0],
    ])
      for (const ox of [0, PAN_W]) {
        const x = panX(az) + dx + ox;
        if (x < W) p.set(x, panY(alt) + dy, dx === 0 && dy === 0 ? '#B8C4C0' : '#5E6A70');
      }
  }
  // the Pleiades: a tiny dipper of six (drawn three times their size so the eye finds them)
  {
    const [alt, az] = altAz(SUBARU_RADEC[0], SUBARU_RADEC[1]);
    const pts: [number, number][] = [
      [0, 0],
      [3, 1],
      [-3, -1],
      [-1, -3],
      [2, -2],
      [-4, 1],
      [4, -1],
    ];
    for (const [dx, dy] of pts)
      for (const ox of [0, PAN_W]) {
        const x = panX(az) + dx + ox;
        if (x < W) p.set(x, panY(alt) + dy, dx === 0 && dy === 0 ? '#F4F6FF' : '#C8D2F8');
      }
  }
  // 金星: the brightest, with its halo
  {
    const [alt, az] = altAz(VENUS_RADEC[0], VENUS_RADEC[1]);
    for (const ox of [0, PAN_W]) {
      const x = panX(az) + ox;
      const y = panY(alt);
      if (x >= W) continue;
      for (let j = -3; j <= 3; j++)
        for (let i = -3; i <= 3; i++) {
          const d = Math.hypot(i, j);
          if (d > 3.2) continue;
          const c = d < 0.6 ? '#FFFFFF' : d < 1.5 ? '#FFF6D8' : d < 2.3 ? mix('#FFE7A3', '#2A2C58', 0.35) : mix('#FFE7A3', '#2A2C58', 0.75);
          p.set(x + i, y + j, c);
        }
    }
  }
  // the hills: a dark ridge with cedar tips; a little lighter rim against the dawn
  for (let x = 0; x < W; x++) {
    const az = (x / PXD) % 360;
    let h = ridge(az);
    if (h01(x >> 1, 0, 9105) < 0.22) h += 0.8 + h01(x, 1, 9105) * 1.4;
    const top = panY(h);
    for (let y = top; y < PAN_H; y++) p.set(x, y, y === top ? '#191832' : '#0B0B14');
  }
  panCache = p.toCanvas();
  return panCache;
}

// ---------------------------------------------------------------- the dome seen from below (the look-up screen)

export const LOOK = { slitX: 192 - SLIT_W / 2, ringY: HOR, stripY: 190 };
let lookCache: HTMLCanvasElement | null = null;

/** The inside of the dome round the slit (the slit itself left transparent). */
export function lookFrame(): HTMLCanvasElement {
  if (lookCache) return lookCache;
  const W = 384;
  const H = 216;
  const p = new PixelCanvas(W, H);
  const sx0 = LOOK.slitX;
  const sx1 = LOOK.slitX + SLIT_W;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (y < LOOK.ringY && x >= sx0 && x < sx1) continue;
      let c: string;
      if (y < LOOK.ringY) {
        // the dome's inner shell: dark panels, ribs bending toward the top (we look up into it)
        const u = (x - 192) / 192;
        const v = y / LOOK.ringY;
        const bend = u / (0.35 + 0.65 * v);
        const rib = Math.abs(((bend * 4 + 100.5) % 1) - 0.5);
        c = Math.abs(u) > 0.8 ? '#16172A' : v < 0.35 ? '#1E2036' : '#24263E';
        if (rib < 0.03) c = '#34385A';
        if (Math.round(v * 7 * (1 + Math.abs(u))) !== Math.round((v + 1 / LOOK.ringY) * 7 * (1 + Math.abs(u)))) c = '#191A2E';
        if (h01(x, y, 9201) < 0.01) c = '#2E3150';
      } else if (y < LOOK.stripY - 2) {
        // the base ring: steel, rivets, the rollers
        const j = y - LOOK.ringY;
        c = j === 0 ? '#5A606C' : j < 3 ? '#7E8590' : j < 9 ? '#6B7186' : '#4A5060';
        if (j === 5 && x % 16 === 8) c = '#A6ADB6';
      } else {
        // the drum's wall below: painted white, in the dark a grey-blue
        c = y === LOOK.stripY - 2 ? '#3A3F48' : '#8A8EA6';
        if (h01(x, y, 9202) < 0.03) c = '#7E8298';
      }
      p.set(x, y, c);
    }
  // the slit's rails and their rivets
  for (let y = 0; y < LOOK.ringY; y++) {
    for (const [x, c] of [
      [sx0 - 4, '#3A3F48'],
      [sx0 - 3, '#6B7186'],
      [sx0 - 2, '#9AA0A8'],
      [sx0 - 1, '#3A3F48'],
      [sx1, '#3A3F48'],
      [sx1 + 1, '#9AA0A8'],
      [sx1 + 2, '#6B7186'],
      [sx1 + 3, '#3A3F48'],
    ] as [number, string][])
      p.set(x, y, c);
    if (y % 14 === 7) {
      p.set(sx0 - 3, y, '#C8CDD4');
      p.set(sx1 + 2, y, '#C8CDD4');
    }
  }
  lookCache = p.toCanvas();
  return lookCache;
}

// ---------------------------------------------------------------- the eyepiece

export const EYE = { cx: 192, cy: 104, r: 80 };
export const PATCH = 280;
export const BLUR_LEVELS = 6;

let maskCache: HTMLCanvasElement | null = null;
/** The field stop: an opaque disc (r) with a 2px dithered edge, to cut the field with destination-in. */
export function fieldMask(): HTMLCanvasElement {
  if (maskCache) return maskCache;
  const S = EYE.r * 2 + 1;
  const p = new PixelCanvas(S, S);
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      const d = Math.hypot(x - EYE.r, y - EYE.r);
      if (d <= EYE.r - 2 || (d <= EYE.r && (x + y) % 2 === 0)) p.set(x, y, '#FFFFFF');
    }
  maskCache = p.toCanvas();
  return maskCache;
}

let barrelCache: HTMLCanvasElement | null = null;
/** Round the field: the black inside of the eyepiece's barrel, a faint ring of its edge, the vignette. */
export function barrel(): HTMLCanvasElement {
  if (barrelCache) return barrelCache;
  const p = new PixelCanvas(384, 216);
  for (let y = 0; y < 216; y++)
    for (let x = 0; x < 384; x++) {
      const d = Math.hypot(x - EYE.cx, y - EYE.cy);
      if (d < EYE.r - 10) continue;
      let c: string | null = null;
      if (d < EYE.r - 2) {
        // the vignette: a dithered darkening in the field's last px
        const k = (d - (EYE.r - 10)) / 8;
        if (BAYER4[y & 3][x & 3] / 16 < k * 0.55) c = '#05050A';
      } else if (d < EYE.r + 1) c = '#05050A';
      else if (d < EYE.r + 3) c = '#1A1B26';
      else if (d < EYE.r + 4) c = '#2A2C3A';
      else c = '#05050A';
      if (c) p.set(x, y, c);
    }
  barrelCache = p.toCanvas();
  return barrelCache;
}

interface Layers {
  /** point light (stars), RGB 0..1 */
  pts: Float32Array;
  /** extended light (the nebula), RGB 0..1 */
  neb: Float32Array;
}

function newLayers(): Layers {
  return { pts: new Float32Array(PATCH * PATCH * 3), neb: new Float32Array(PATCH * PATCH * 3) };
}

function addPt(L: Float32Array, x: number, y: number, col: string, k: number): void {
  x = Math.round(x);
  y = Math.round(y);
  if (x < 0 || y < 0 || x >= PATCH || y >= PATCH) return;
  const v = parseInt(col.slice(1), 16);
  const i = (y * PATCH + x) * 3;
  L[i] += (((v >> 16) & 255) / 255) * k;
  L[i + 1] += (((v >> 8) & 255) / 255) * k;
  L[i + 2] += ((v & 255) / 255) * k;
}

/** A star: a 1px core, a cross for the brighter ones (kk: the strength itself, else from the magnitude). */
function star(L: Float32Array, x: number, y: number, mag: number, col = '#F0F4FF', kk?: number): void {
  const k = kk ?? Math.min(1.6, Math.pow(2.512, (6 - mag) / 2.2) / 6);
  addPt(L, x, y, col, k);
  if (k > 0.5) for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) addPt(L, x + dx, y + dy, col, k * 0.38);
  if (k > 0.9) for (const [dx, dy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) addPt(L, x + dx, y + dy, col, k * 0.16);
  if (k > 1.2) for (const [dx, dy] of [[2, 0], [-2, 0], [0, 2], [0, -2]]) addPt(L, x + dx, y + dy, col, k * 0.14);
}

/** The faint stars of a patch (seeded), fewer for 金星 (the dawn). */
function background(L: Float32Array, n: number, seed: number): void {
  for (let i = 0; i < n; i++) star(L, h01(i, 1, seed) * PATCH, h01(i, 2, seed) * PATCH, 7.2 + h01(i, 3, seed) * 2.6, h01(i, 4, seed) < 0.2 ? '#FFE8D0' : '#E0E8FF');
}

function venusLayers(): Layers {
  const L = newLayers();
  background(L.pts, 40, 9301);
  const c = PATCH / 2;
  // the lit half faces the sun: in the sky it is down and to the left (the sun below the
  // east horizon); the image is turned round (上下左右 さかさま), so here up and to the right
  const sun = [Math.SQRT1_2, -Math.SQRT1_2];
  // about 25″ across at the greatest elongation; at the star party's low power (≈35×) a little
  // half-moon some 28 px across in this field (about 1.2° wide)
  const R = 13.5;
  for (let y = -18; y <= 18; y++)
    for (let x = -18; x <= 18; x++) {
      const d = Math.hypot(x, y);
      const lit = x * sun[0] + y * sun[1];
      if (d <= R && lit >= -0.3) {
        // a little darker toward the limb and along the terminator
        const edge = d > R - 1.2 ? 0.8 : d > R - 3 ? 0.92 : 1;
        const term = lit < 1.2 ? 0.55 : lit < 3 ? 0.8 : 1;
        addPt(L.neb, c + x, c + y, '#FFF6D8', 1.25 * edge * term);
      }
      // the glare round it
      if (d > R && d < R + 4 && lit > 1) addPt(L.neb, c + x, c + y, '#FFE7A3', 0.14 * (1 - (d - R) / 4));
    }
  return L;
}

function orionLayers(): Layers {
  const L = newLayers();
  background(L.pts, 210, 9302);
  const c = PATCH / 2;
  // the nebula: a bright heart by the four, wings spreading out and back (a bird), a dark bay
  for (let y = -70; y <= 70; y++)
    for (let x = -80; x <= 80; x++) {
      const nx = x / 80;
      const ny = y / 70;
      // the heart
      let b = Math.exp(-((x + 2) ** 2 + (y + 3) ** 2) / 140) * 0.8;
      // the wings: two arcs sweeping from the heart outward and down (the image turned round)
      const wingL = Math.exp(-(((nx + 0.42) / 0.38) ** 2) - (((ny - 0.22 + 0.5 * (nx + 0.42) ** 2) / 0.16) ** 2)) * 0.55;
      const wingR = Math.exp(-(((nx - 0.4) / 0.36) ** 2) - (((ny - 0.18 + 0.45 * (nx - 0.4) ** 2) / 0.15) ** 2)) * 0.5;
      const body = Math.exp(-((nx / 0.3) ** 2) - (((ny + 0.12) / 0.32) ** 2)) * 0.5;
      b += wingL + wingR + body;
      // the dark bay biting in from one side by the heart (the fish's mouth)
      b -= Math.exp(-(((x - 14) / 9) ** 2) - (((y + 12) / 6) ** 2)) * 0.6;
      b *= 0.75 + 0.5 * valueNoise(x / 9, y / 9, 931);
      if (b <= 0.02) continue;
      const k = Math.min(1, b);
      const col = k > 0.7 ? '#D0DCD2' : k > 0.4 ? '#A8BCAE' : '#7E928A';
      addPt(L.neb, c + x, c + y, col, k * 0.42);
    }
  // the Trapezium: four stars in a small trapezoid in the heart
  for (const [dx, dy, m] of [
    [-3, -4, 5.1],
    [2, -5, 6.7],
    [-2, 1, 6.6],
    [3, 0, 5.4],
  ] as [number, number, number][])
    star(L.pts, c + dx, c + dy, m, '#FFFFFF', m < 6 ? 1.15 : 0.85);
  // other stars of the sword: ι Ori (bright, toward the edge), θ2, 42 Ori
  star(L.pts, c + 4, c + 46, 2.8, '#E0E8FF', 1.3);
  star(L.pts, c - 6, c + 10, 5.0, '#E8EEFF', 0.8);
  star(L.pts, c - 4, c - 38, 4.6, '#E8EEFF', 0.85);
  return L;
}

function subaruLayers(): Layers {
  const L = newLayers();
  background(L.pts, 120, 9303);
  const c = PATCH / 2;
  // the bright Pleiades: RA (s of time) and Dec (′) from Alcyone; 1° ≈ 110 px, turned round
  const S: [number, number, number][] = [
    [0, 0, 2.87], // Alcyone
    [100, -3, 3.62], // Atlas
    [-157, 0, 3.7], // Electra
    [-100, 16, 3.87], // Maia
    [-70, -10, 4.18], // Merope
    [-137, 22, 4.3], // Taygeta
    [102, 2, 5.05], // Pleione
    [-161, 11, 5.45], // Celaeno
    [-95, 27, 5.76], // Asterope
  ];
  const k = 92 / 60; // px per arcminute
  for (const [ras, decm, mag] of S) {
    const dx = (ras * 15 * Math.cos((24.1 * Math.PI) / 180)) / 60; // arcmin east
    // east is to the left on the sky as seen; turned round it goes to the right; north (up) goes down
    star(L.pts, c + dx * k, c + decm * k, mag, '#E8F0FF', Math.max(0.75, 1.75 - (mag - 2.8) * 0.33));
  }
  // the fainter members, more of them near the middle (dozens in a low-power field)
  for (let i = 0; i < 90; i++) {
    const a = h01(i, 1, 9304) * Math.PI * 2;
    const r = Math.pow(h01(i, 2, 9304), 0.75) * 92;
    star(L.pts, c + Math.cos(a) * r * 1.25, c + Math.sin(a) * r * 0.9, 7, h01(i, 4, 9304) < 0.15 ? '#FFF0D8' : '#DCE6FF', 0.22 + h01(i, 3, 9304) * 0.45);
  }
  return L;
}

/** Box blur (two passes ≈ a soft disc), in place. */
function boxBlur(src: Float32Array, rad: number): Float32Array {
  if (rad <= 0) return src.slice();
  const N = PATCH;
  let a = src.slice();
  let b = new Float32Array(src.length);
  for (let pass = 0; pass < 2; pass++) {
    // horizontal
    for (let y = 0; y < N; y++)
      for (let ch = 0; ch < 3; ch++) {
        let s = 0;
        const row = y * N;
        for (let x = -rad; x <= rad; x++) s += x >= 0 && x < N ? a[(row + x) * 3 + ch] : 0;
        for (let x = 0; x < N; x++) {
          b[(row + x) * 3 + ch] = s / (2 * rad + 1);
          const out = x - rad;
          const inn = x + rad + 1;
          if (out >= 0) s -= a[(row + out) * 3 + ch];
          if (inn < N) s += a[(row + inn) * 3 + ch];
        }
      }
    [a, b] = [b, a];
    // vertical
    for (let x = 0; x < N; x++)
      for (let ch = 0; ch < 3; ch++) {
        let s = 0;
        for (let y = -rad; y <= rad; y++) s += y >= 0 && y < N ? a[(y * N + x) * 3 + ch] : 0;
        for (let y = 0; y < N; y++) {
          b[(y * N + x) * 3 + ch] = s / (2 * rad + 1);
          const out = y - rad;
          const inn = y + rad + 1;
          if (out >= 0) s -= a[(out * N + x) * 3 + ch];
          if (inn < N) s += a[(inn * N + x) * 3 + ch];
        }
      }
    [a, b] = [b, a];
  }
  return a;
}

const patchCache = new Map<number, HTMLCanvasElement[]>();

/** The eyepiece's view of target n at each blur level (0 sharp … 5 most blurred). */
export function eyePatch(n: 1 | 2 | 3): HTMLCanvasElement[] {
  const hit = patchCache.get(n);
  if (hit) return hit;
  const L = n === 1 ? venusLayers() : n === 2 ? orionLayers() : subaruLayers();
  const out: HTMLCanvasElement[] = [];
  const bg = [7 / 255, 9 / 255, 24 / 255];
  for (let lv = 0; lv < BLUR_LEVELS; lv++) {
    const rad = [0, 1, 2, 3, 5, 7][lv];
    const pts = boxBlur(L.pts, rad);
    const neb = boxBlur(L.neb, Math.round(rad * 0.7));
    // an out-of-focus star spreads into a dimmer disc; keep it visible (the light is all there)
    const gain = rad ? Math.min(30, (2 * rad + 1) ** 2 * 0.12) : 1;
    const [c, ctx] = makeCanvas(PATCH, PATCH);
    const img = ctx.createImageData(PATCH, PATCH);
    for (let i = 0, j = 0; i < PATCH * PATCH; i++, j += 3) {
      for (let ch = 0; ch < 3; ch++) {
        const v = bg[ch] + Math.min(1, pts[j + ch] * gain) + neb[j + ch];
        img.data[i * 4 + ch] = Math.max(0, Math.min(255, Math.round(v * 255)));
      }
      img.data[i * 4 + 3] = 255;
    }
    // quantise lightly so it reads as pixel art (4 levels of brightness in the faint parts)
    for (let i = 0; i < img.data.length; i += 4)
      for (let ch = 0; ch < 3; ch++) {
        const v = img.data[i + ch];
        if (v < 90) img.data[i + ch] = Math.round(v / 12) * 12;
      }
    ctx.putImageData(img, 0, 0);
    out.push(c);
  }
  patchCache.set(n, out);
  return out;
}

let compoundCache: HTMLCanvasElement | null = null;
/** グソっ君's compound eye: the sharp Pleiades many times over, in round cells like a honeycomb. */
export function compoundEye(): HTMLCanvasElement {
  if (compoundCache) return compoundCache;
  const [c, ctx] = makeCanvas(384, 216);
  ctx.fillStyle = '#05050A';
  ctx.fillRect(0, 0, 384, 216);
  const src = eyePatch(3)[0];
  const r = 21;
  const S = r * 2 + 1;
  const [cell, cctx] = makeCanvas(S, S, { willReadFrequently: true });
  // shrink the middle of the field (112 px) into the cell keeping every star: the brightest pixel of each block
  const SRC = 112;
  const sctx = (() => {
    const [c2, x2] = makeCanvas(SRC, SRC, { willReadFrequently: true });
    x2.drawImage(src, PATCH / 2 - SRC / 2, PATCH / 2 - SRC / 2, SRC, SRC, 0, 0, SRC, SRC);
    void c2;
    return x2;
  })();
  const sd = sctx.getImageData(0, 0, SRC, SRC).data;
  const out = cctx.createImageData(S, S);
  const k = SRC / S;
  for (let y = 0; y < S; y++)
    for (let x = 0; x < S; x++) {
      let best = 0;
      let bi = 0;
      for (let j = Math.floor(y * k); j < Math.min(SRC, Math.floor((y + 1) * k)); j++)
        for (let i = Math.floor(x * k); i < Math.min(SRC, Math.floor((x + 1) * k)); i++) {
          const o = (j * SRC + i) * 4;
          const v = sd[o] + sd[o + 1] + sd[o + 2];
          if (v > best) {
            best = v;
            bi = o;
          }
        }
      const q = (y * S + x) * 4;
      out.data[q] = sd[bi];
      out.data[q + 1] = sd[bi + 1];
      out.data[q + 2] = sd[bi + 2];
      out.data[q + 3] = 255;
    }
  cctx.putImageData(out, 0, 0);
  const m = new PixelCanvas(S, S);
  for (let y = 0; y < S; y++) for (let x = 0; x < S; x++) if (Math.hypot(x - r, y - r) <= r - 1) m.set(x, y, '#FFFFFF');
  cctx.globalCompositeOperation = 'destination-in';
  cctx.drawImage(m.toCanvas(), 0, 0);
  ctx.imageSmoothingEnabled = false;
  for (let row = -1; row < 7; row++)
    for (let col = -1; col < 10; col++) {
      const x = col * 44 + (row % 2 ? 22 : 0) - 2;
      const y = row * 38 - 6;
      ctx.drawImage(cell, x, y);
      // the cell's rim (a faint sheen of the eye's facets)
      ctx.strokeStyle = '#1C1E2E';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(x + r + 0.5, y + r + 0.5, r - 0.5, 0, Math.PI * 2);
      ctx.stroke();
    }
  compoundCache = c;
  return c;
}

// ---------------------------------------------------------------- the card's pictures

/**
 * The red pen's hanamaru: a spiral out from the middle (1¾ turns), then
 * eight petals looping round it (52 7.7; the village's hand-drawn hanamaru
 * of chapter 2 — はっち先生's has one more). Points in drawing order, unit
 * radius 1, deduplicated at the given radius.
 */
export function hanamaruStroke(R: number): [number, number][] {
  const out: [number, number][] = [];
  const seen = new Set<string>();
  const add = (x: number, y: number) => {
    const px = Math.round(x);
    const py = Math.round(y);
    const k = `${px},${py}`;
    if (seen.has(k)) return;
    seen.add(k);
    out.push([px, py]);
  };
  const inner = R * 0.52;
  const turns = 1.75;
  const steps = 260;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const a = -Math.PI / 2 + t * turns * Math.PI * 2;
    const r = inner * t;
    add(Math.cos(a) * r, Math.sin(a) * r);
  }
  // the petals: the pen goes on round, a bump outward for each of the eight
  const a0 = -Math.PI / 2 + turns * Math.PI * 2;
  const pSteps = 640;
  for (let i = 0; i <= pSteps; i++) {
    const t = i / pSteps;
    const a = a0 + t * Math.PI * 2;
    const r = inner + (R - inner) * Math.pow(Math.abs(Math.sin(t * Math.PI * 8)), 0.8);
    add(Math.cos(a) * r, Math.sin(a) * r);
  }
  return out;
}

let moonCache: HTMLCanvasElement | null = null;
/** The pencil drawing in the first answer: a circle, its upper-right half filled (12×12). */
export function halfMoon(): HTMLCanvasElement {
  if (moonCache) return moonCache;
  const p = new PixelCanvas(13, 13);
  for (let y = 0; y < 13; y++)
    for (let x = 0; x < 13; x++) {
      const d = Math.hypot(x - 6, y - 6);
      if (d > 6.2) continue;
      if (d > 5.2) p.set(x, y, '#4A4460');
      else if (x - 6 - (y - 6) > 0.5 && (x + y) % 2 === 0) p.set(x, y, '#6A6484');
    }
  // the terminator: a straight line across
  for (let i = -4; i <= 4; i++) p.set(6 + i, 6 + i, '#4A4460');
  moonCache = p.toCanvas();
  return moonCache;
}
