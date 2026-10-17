// 脇芽は 朝に かく（02_ch2_index #73、52 7.6、50 10.23）：ミニゲームの 絵。
//
// ペロの 1号ハウスの トマト 1株の 大写し（384×216、縦1画面）。主枝に 葉が 左右
// 交互に 6枚。葉の つけ根（主枝と 葉柄の あいだ）から 出る 脇芽が 3つ、葉と 葉の
// あいだの 茎から 出る 花房が 2つ（下の 花房は 青い 実が つきはじめ）。ほかの
// つけ根には、前に かいた 脇芽の 古い 切り口。てっぺんは 生長点の 若い 葉。株に
// 誘引ひもが からむ。背景は 夜の ハウス（ビニールの 継ぎ目、となりの 株の 影、
// 黒い マルチと かん水チューブ、屋根の ビニールごしに にじむ 星）。
//
// どの絵も「明るい（灯りの 中）」と「暗い（灯りの 外）」の 2枚。暗いほうは 明るい
// ほうを 夜の 4色に 写したもの（形は 見えるが、脇芽と 花房の 見分けは つかない）。
// 株と 背景は 株ごとに 1回だけ 焼く。脇芽と 花房は しなりの 5コマ（0〜4）を 焼いて
// とっておく。毎フレーム 合成するのは 灯りの 円の 中だけ（events/ch2/wakime.ts）。

import { makeCanvas, mix, PixelCanvas, rgba32 } from '../../engine/pixel';
import { h01, ihash } from '../tiles/noise';

export const SCN_W = 384;
export const SCN_H = 216;
/** The main stem's x at the foot (it sways ±2px up the screen). */
export const STEM_X = 192;
/** Bend frames of a side shoot / a truss (0 = still … 4 = bent all the way). */
export const BEND_FRAMES = 5;

export type TargetKind = 'me' | 'hana';

/** Something that sticks out of the plant: a side shoot (脇芽) or a truss (花房). */
export interface TargetDef {
  i: number;
  kind: TargetKind;
  side: 1 | -1;
  /** Where it grows from the stem (screen px). */
  bx: number;
  by: number;
  /** Its middle: where the finger takes it and the ring closes (screen px). */
  cx: number;
  cy: number;
  /** me: the length of the shoot (px). */
  size: number;
  /** hana: 'fruit' (two green fruit setting, two flowers, a bud) or 'flower' (four flowers, a bud). */
  truss: 'fruit' | 'flower';
  seed: number;
}

interface LeafDef {
  k: number;
  y: number;
  side: 1 | -1;
  len: number;
}

export interface PlantDef {
  n: number;
  seed: number;
  leaves: LeafDef[];
  /** Sorted from the foot up (by cy, falling). */
  targets: TargetDef[];
  /** The old cuts at the leaf joints without a shoot. */
  scars: { x: number; y: number; side: 1 | -1 }[];
}

/** Where leaf k (0 = the lowest) joins the stem. */
export function leafY(k: number): number {
  return 198 - 30 * k;
}

/** The main stem's x at screen y (a slow sway). */
export function stemX(y: number, seed: number): number {
  return STEM_X + Math.round(2 * Math.sin((y + seed * 23) / 31));
}

/**
 * The three plants: which leaf joints have a shoot (k, length) and under which
 * leaves a truss hangs (k: from the stem just above leaf k, on the other side;
 * so a truss and a shoot are never at the same height — 12px or more apart).
 */
const SETUP: { seed: number; buds: [number, number][]; trusses: [number, 'fruit' | 'flower'][] }[] = [
  { seed: 3, buds: [[1, 19], [2, 21], [4, 15]], trusses: [[2, 'fruit'], [5, 'flower']] },
  { seed: 7, buds: [[0, 21], [3, 17], [5, 13]], trusses: [[1, 'fruit'], [4, 'flower']] },
  { seed: 11, buds: [[1, 20], [3, 17], [4, 16]], trusses: [[2, 'fruit'], [5, 'flower']] },
];

/** The shoot grows up and out from the joint, 55° over the level. */
const BUD_DX = Math.cos((55 * Math.PI) / 180);
const BUD_DY = -Math.sin((55 * Math.PI) / 180);

const defCache = new Map<number, PlantDef>();
export function plantDef(n: number): PlantDef {
  const hit = defCache.get(n);
  if (hit) return hit;
  const s = SETUP[n % SETUP.length];
  const seed = s.seed;
  const leaves: LeafDef[] = [];
  for (let k = 0; k < 6; k++) leaves.push({ k, y: leafY(k), side: (k + n) % 2 ? 1 : -1, len: 96 - 7 * k });
  const targets: TargetDef[] = [];
  const scars: { x: number; y: number; side: 1 | -1 }[] = [];
  for (const L of leaves) {
    const bud = s.buds.find(([k]) => k === L.k);
    const bx = stemX(L.y - 3, seed) + L.side * 2;
    const by = L.y - 3;
    if (bud) {
      const size = bud[1];
      targets.push({ i: 0, kind: 'me', side: L.side, bx, by, cx: Math.round(bx + L.side * BUD_DX * size * 0.55), cy: Math.round(by + BUD_DY * size * 0.55), size, truss: 'flower', seed: seed + L.k });
    } else scars.push({ x: bx, y: by + 1, side: L.side });
  }
  for (const [k, truss] of s.trusses) {
    const side = -leaves[k].side as 1 | -1;
    const by = leafY(k) - 6;
    const bx = stemX(by, seed) + side * 2;
    targets.push({ i: 0, kind: 'hana', side, bx, by, cx: bx + side * 15, cy: by + 11, size: 22, truss, seed: seed * 5 + k });
  }
  targets.sort((a, b) => b.cy - a.cy);
  targets.forEach((t, i) => (t.i = i));
  const d = { n, seed, leaves, targets, scars };
  defCache.set(n, d);
  return d;
}

// ================================================================ colours

const C = {
  outline: '#1E3A2C',
  leafLit: '#5FA85A',
  leafMid: '#4E9656',
  leafDown: '#3C7F4F',
  leafEdge: '#2E6B4A',
  rib: '#8CC47A',
  vein: '#6AAE62',
  gloss: '#9BCB6B',
  young: '#9BCB6B',
  youngLit: '#C9E08A',
  youngDown: '#6FA85E',
  stem: '#7DB866',
  stemLit: '#A8D47E',
  stemDark: '#4E8A50',
  hair: '#D8ECA0',
  petiole: '#5E9A55',
  petal: '#FFD23F',
  petalLit: '#FFE7A3',
  petalDown: '#E0B030',
  cone: '#C89A2E',
  coneDark: '#A8742A',
  fruit: '#8CC47A',
  fruitLit: '#D8ECA0',
  fruitDown: '#5FA85A',
  calyx: '#3FA66B',
  string: '#E8E2D4',
  stringDark: '#B8B0A0',
  scarOld: '#B8C48A',
  scarRing: '#4E7A4E',
  cutFresh: '#E8F4C0',
};

/** Night: four tones (the lightest is shared by the shoots and the flowers, so they can't be told apart in the dark). */
const NIGHT = ['#171A2E', '#1F2539', '#283046', '#323C55'].map((c) => rgba32(c));

/** The same pixels mapped to the night's tones by their lightness. */
export function nightOf(src: PixelCanvas): PixelCanvas {
  const out = new PixelCanvas(src.w, src.h);
  const d = src.data;
  for (let i = 0; i < d.length; i++) {
    const v = d[i];
    if (v >>> 24 === 0) continue;
    const r = v & 255;
    const g = (v >>> 8) & 255;
    const b = (v >>> 16) & 255;
    const L = (0.3 * r + 0.59 * g + 0.11 * b) / 255;
    out.data[i] = NIGHT[Math.max(0, Math.min(3, Math.floor(L * 5)))];
  }
  return out;
}

// ================================================================ leaves

/**
 * One leaflet: an ovate blade from (x0, y0) along `ang` (screen radians),
 * `L` long and `Wd` wide, with a toothed edge, the midrib and side veins,
 * the face turned up lighter.
 */
function leaflet(p: PixelCanvas, x0: number, y0: number, ang: number, L: number, Wd: number, seed: number, young = false): void {
  const ca = Math.cos(ang);
  const sa = Math.sin(ang);
  const r = Math.ceil(L) + 2;
  for (let y = Math.floor(y0 - r); y <= Math.ceil(y0 + r); y++)
    for (let x = Math.floor(x0 - r); x <= Math.ceil(x0 + r); x++) {
      const dx = x - x0;
      const dy = y - y0;
      const u = dx * ca + dy * sa;
      const v = -dx * sa + dy * ca;
      if (u < 0 || u > L) continue;
      const t = u / L;
      const half = (Wd / 2) * Math.pow(Math.sin(Math.PI * Math.min(1, t * 0.92 + 0.06)), 0.7) * (1.12 - 0.4 * t);
      const av = Math.abs(v);
      if (av > half) continue;
      const edge = av > half - 1.1;
      if (edge && t > 0.18 && (Math.round(u) + seed) % 3 === 0) continue;
      const faceDown = (v >= 0 ? ca : -ca) > 0.15;
      let c: string;
      if (young) {
        c = av < 0.7 ? C.youngLit : faceDown ? C.youngDown : edge ? C.youngLit : C.young;
      } else if (av < 0.7 && t < 0.92) c = C.rib;
      else if (av > 1 && av < half - 1.2 && (Math.round(u) + (v < 0 ? 0 : 2)) % 5 === 0) c = C.vein;
      else if (faceDown) c = edge ? C.leafEdge : C.leafDown;
      else c = edge && h01(x, y, seed) < 0.35 ? C.gloss : av < half * 0.55 ? C.leafLit : C.leafMid;
      p.set(x, y, c);
    }
}

/** A compound leaf from the stem at (x0, y0): the petiole out and drooping, three pairs of leaflets, small ones between, the end one. */
function drawLeaf(p: PixelCanvas, x0: number, y0: number, side: 1 | -1, len: number, seed: number): void {
  const pts: [number, number][] = [];
  for (let i = 0; i <= len; i++) {
    const t = i / len;
    pts.push([x0 + side * i, y0 - Math.round(i * 0.3) + Math.round(t * t * len * 0.45)]);
  }
  const at = (t: number) => pts[Math.min(len, Math.round(t * len))];
  const dirAt = (t: number) => {
    const [ax, ay] = at(Math.max(0, t - 0.04));
    const [bx, by] = at(Math.min(1, t + 0.04));
    return Math.atan2(by - ay, bx - ax);
  };
  const s = len / 90;
  // the small leaflets between the pairs (drawn first: under)
  for (const t of [0.38, 0.62]) {
    const [x, y] = at(t);
    const d = dirAt(t);
    leaflet(p, x, y, d - side * 1.15, 9 * s + 3, 6, seed + 7);
    leaflet(p, x, y, d + side * 1.05, 8 * s + 3, 5, seed + 9);
  }
  // three pairs: one over the petiole (reaching up and out), one under (down and out)
  ([[0.26, 0.82], [0.5, 0.96], [0.74, 1]] as const).forEach(([t, big], j) => {
    const [x, y] = at(t);
    const d = dirAt(t);
    const L = Math.round(len * 0.31 * big) + 3;
    const Wd = Math.max(8, Math.round(L * 0.64));
    leaflet(p, x, y, d - side * (0.9 - j * 0.08), L, Wd, seed + j * 3);
    leaflet(p, x, y, d + side * (0.8 - j * 0.1), Math.round(L * 0.9), Wd - 1, seed + j * 3 + 1);
  });
  // the end leaflet, along the petiole
  {
    const [x, y] = pts[len];
    const d = dirAt(1);
    leaflet(p, x - side * 2, y, d + side * 0.12, Math.round(len * 0.33) + 3, Math.max(10, Math.round(len * 0.22)), seed + 11);
  }
  // the petiole over the bases (2px near the stem)
  pts.forEach(([x, y], i) => {
    p.set(x, y, C.petiole);
    if (i < len * 0.7) p.set(x, y + 1, C.leafEdge);
    if (i < len * 0.3) p.set(x, y - 1, C.rib);
  });
}

/** The young leaves at the growing tip (folded, pale). */
function drawTip(p: PixelCanvas, seed: number): void {
  const x = stemX(20, seed);
  leaflet(p, x, 31, -Math.PI / 2 - 0.95, 17, 10, seed + 21, true);
  leaflet(p, x, 31, -Math.PI / 2 + 1.0, 16, 9, seed + 23, true);
  leaflet(p, x, 21, -Math.PI / 2 - 0.55, 11, 7, seed + 25, true);
  leaflet(p, x, 21, -Math.PI / 2 + 0.6, 10, 6, seed + 27, true);
  // the growing point bent over
  p.set(x, 12, C.youngLit);
  p.set(x + 1, 11, C.youngLit);
  p.set(x + 2, 11, C.young);
  p.set(x + 3, 12, C.young);
}

// ================================================================ the plant (stem, leaves, old cuts, string)

function drawPlant(n: number): PixelCanvas {
  const d = plantDef(n);
  const seed = d.seed;
  const p = new PixelCanvas(SCN_W, SCN_H);
  // the string behind the stem (where it winds round the back)
  const stringX = (y: number) => stemX(y, seed) + Math.round(3 * Math.sin(y / 9));
  for (let y = 0; y < SCN_H; y++) if (Math.cos(y / 9) <= 0) p.set(stringX(y), y, C.stringDark);
  // leaves, from the foot up (the upper ones over the lower)
  for (const L of d.leaves) drawLeaf(p, stemX(L.y, seed) + L.side, L.y, L.side, L.len, seed + L.k * 13);
  drawTip(p, seed);
  // the stem: thick at the foot, lit on the left, fine hairs
  for (let y = 12; y < SCN_H; y++) {
    const w = y > 150 ? 6 : y > 90 ? 5 : y > 40 ? 4 : 3;
    const x0 = stemX(y, seed) - Math.floor(w / 2);
    for (let i = 0; i < w; i++) p.set(x0 + i, y, i === 0 ? C.stemLit : i === w - 1 ? C.stemDark : C.stem);
    if (ihash(y, 3, seed) % 5 === 0) p.set(x0 - 1, y, C.hair);
    if (ihash(y, 7, seed) % 6 === 0) p.set(x0 + w, y, C.hair);
  }
  // the old cuts (the shoots taken last week): a dry round scar at the joint
  for (const s of d.scars) {
    const x = s.x + s.side * 2;
    p.rect(x - 1, s.y - 1, 3, 3, C.scarRing);
    p.set(x, s.y, C.scarOld);
    p.set(x - s.side, s.y - 1, C.scarOld);
  }
  // where the trusses leave the stem: a small knuckle
  for (const t of d.targets) if (t.kind === 'hana') p.set(t.bx, t.by, C.stemLit);
  // the string in front
  for (let y = 0; y < SCN_H; y++) if (Math.cos(y / 9) > 0) p.set(stringX(y), y, C.string);
  p.outline(C.outline);
  return p;
}

// ================================================================ the house at night behind it

/**
 * The house behind the plant, at night. The lit copy is the same picture
 * warmed a little (the lantern reaches the plant, hardly the film behind it):
 * the plant stands out in the light, not a disc of colour.
 */
function drawBg(lit: boolean): HTMLCanvasElement {
  const p = new PixelCanvas(SCN_W, SCN_H);
  const top = '#12112A';
  const bot = '#1D1B38';
  for (let y = 0; y < SCN_H; y++) {
    const k = y / SCN_H;
    for (let x = 0; x < SCN_W; x++) {
      // four bands, dithered at their edges
      const kk = k * 4 + (((x + y) & 1) ? 0.12 : -0.12);
      p.set(x, y, mix(top, bot, Math.min(1, Math.max(0, Math.floor(kk) / 3))));
    }
  }
  // stars through the old roof film, blurred
  for (let i = 0; i < 14; i++) {
    const x = 8 + (ihash(i, 1, 4071) % (SCN_W - 16));
    const y = 4 + (ihash(i, 2, 4071) % 56);
    p.set(x, y, '#3A3A66');
    p.set(x + 1, y, '#2C2C52');
    p.set(x, y + 1, '#2C2C52');
    if (i % 3 === 0) p.set(x, y, '#5A5A88');
  }
  // the film's seams and a few creases
  const seam = '#26244A';
  for (const sx of [38, 118, 262, 346]) for (let y = 0; y < 200; y++) if ((y >> 1) % 7 !== 0) p.set(sx, y, seam);
  for (let i = 0; i < 6; i++) {
    const y = 30 + i * 27 + (ihash(i, 5, 4073) % 9);
    const x0 = ihash(i, 6, 4073) % 300;
    for (let x = x0; x < x0 + 24; x++) if (x % 3) p.set(x, y + ((x >> 3) & 1), seam);
  }
  // the wire the strings hang from
  p.hline(0, SCN_W - 1, 5, '#2E3048');
  p.hline(0, SCN_W - 1, 6, '#0E0E1C');
  // the neighbours in the row (only their shapes), left and right
  const nb = '#191D30';
  const nb2 = '#1E2336';
  for (const cx of [48, 336]) {
    for (let y = 8; y < 206; y++) p.set(cx + Math.round(2 * Math.sin((y + cx) / 29)), y, nb2);
    for (let k = 0; k < 7; k++) {
      const y = 40 + k * 26 + (ihash(k, cx, 4077) % 7);
      const side = (k + cx) % 2 ? 1 : -1;
      for (let i = 0; i < 34; i++) {
        const yy = y - Math.round(i * 0.25) + Math.round((i * i) / 90);
        const w = Math.round(4 * Math.sin((Math.PI * i) / 34)) + 1;
        for (let j = -w; j <= w; j++) p.set(cx + side * i, yy + j, (i + j + k) % 5 === 0 ? nb2 : nb);
      }
    }
  }
  // the black mulch and the drip tube along it
  p.rect(0, 206, SCN_W, 10, '#0C0C14');
  p.hline(0, SCN_W - 1, 206, '#1A1A26');
  p.hline(0, SCN_W - 1, 210, '#161622');
  p.hline(0, SCN_W - 1, 211, '#161622');
  for (let x = 3; x < SCN_W; x += 11) p.set(x, 210, '#2A2A3A');
  return (lit ? warmed(p, '#F2894B', 0.14) : p).toCanvas();
}

/** The same pixels pulled toward a warm colour (the lantern's rim #F2894B). */
function warmed(src: PixelCanvas, c: string, k: number): PixelCanvas {
  const out = new PixelCanvas(src.w, src.h);
  const w = rgba32(c);
  const wr = w & 255;
  const wg = (w >>> 8) & 255;
  const wb = (w >>> 16) & 255;
  for (let i = 0; i < src.data.length; i++) {
    const v = src.data[i];
    if (v >>> 24 === 0) continue;
    const r = Math.round((v & 255) * (1 - k) + wr * k);
    const g = Math.round(((v >>> 8) & 255) * (1 - k) + wg * k);
    const b = Math.round(((v >>> 16) & 255) * (1 - k) + wb * k);
    out.data[i] = ((v >>> 24) << 24) | (b << 16) | (g << 8) | r;
  }
  return out;
}

const plantCache = new Map<number, { lit: HTMLCanvasElement; dark: HTMLCanvasElement }>();

/** Plant n with the house behind it: lit (in the lantern) and dark (outside it). Baked once. */
export function plantImgs(n: number): { lit: HTMLCanvasElement; dark: HTMLCanvasElement } {
  const hit = plantCache.get(n);
  if (hit) return hit;
  const d = plantDef(n);
  const plant = drawPlant(n);
  const bake = (bg: HTMLCanvasElement, fg: PixelCanvas) => {
    const [c, ctx] = makeCanvas(SCN_W, SCN_H);
    ctx.drawImage(bg, 0, 0);
    ctx.drawImage(fg.toCanvas(), 0, 0);
    return c;
  };
  const out = { lit: bake(drawBg(true), plant), dark: bake(drawBg(false), nightOf(plant)) };
  plantCache.set(n, out);
  return out;
}

// ================================================================ the side shoot and the truss (bend frames)

/** Sprite canvas of a shoot / truss: 72×72, the root on the stem at (ROOT_X, ROOT_Y). */
export const SPR = 72;
export const ROOT_X = 36;
export const ROOT_Y = 36;

/**
 * A side shoot of `size` px growing up to the right (flipped for the left),
 * bent by b (0..1) outward and down: its own little stem (2px near the joint,
 * hairy), a small leaf part way up and the young folded leaves at its tip —
 * a small copy of the plant's own top, the way a real side shoot looks.
 */
function budPixels(size: number, b: number, seed: number): PixelCanvas {
  const p = new PixelCanvas(SPR, SPR);
  const th0 = Math.atan2(BUD_DY, BUD_DX);
  let x = ROOT_X;
  let y = ROOT_Y;
  const pts: [number, number, number][] = [];
  for (let s = 0; s <= size; s++) {
    const th = th0 + b * 1.25 * Math.pow(s / size, 1.3);
    pts.push([Math.round(x), Math.round(y), th]);
    x += Math.cos(th);
    y += Math.sin(th);
  }
  const [tx, ty, tth] = pts[pts.length - 1];
  const k = size / 20;
  // a small leaf part way up (on the outer side), then the young leaves at the tip
  const [mx, my, mth] = pts[Math.round(size * 0.55)];
  leaflet(p, mx, my, mth + 1.0, Math.round(8 * k) + 1, Math.round(5 * k) + 1, seed + 2, true);
  leaflet(p, tx, ty, tth - 0.95, Math.round(9 * k) + 1, Math.round(6 * k) + 1, seed + 3, true);
  leaflet(p, tx, ty, tth + 0.85, Math.round(9 * k) + 1, Math.round(6 * k) + 1, seed + 4, true);
  leaflet(p, tx, ty, tth - 0.1, Math.round(10 * k) + 1, Math.round(6 * k), seed + 5, true);
  // the shoot's stem (2px near the joint), with its hairs
  pts.forEach(([px, py, th], s) => {
    p.set(px, py, C.rib);
    if (s < size * 0.6) p.set(px + Math.round(Math.sin(th)), py - Math.round(Math.cos(th)) + 1, C.youngDown);
    if (s % 3 === 1) p.set(px - Math.round(Math.sin(th) * 1.6), py + Math.round(Math.cos(th) * 1.6), C.hair);
  });
  p.outline(C.outline);
  return p;
}

/** A star flower (11×11) at (cx, cy): five yellow petals turned back, the anther cone in the middle. */
function flower(p: PixelCanvas, cx: number, cy: number, rot: number): void {
  for (let dy = -5; dy <= 5; dy++)
    for (let dx = -5; dx <= 5; dx++) {
      const r = Math.hypot(dx, dy);
      const a = Math.atan2(dy, dx);
      const R = 1.8 + 3.3 * Math.pow(0.5 + 0.5 * Math.cos(5 * (a - rot)), 1.4);
      if (r > R + 0.2) continue;
      p.set(cx + dx, cy + dy, r < 1.6 ? C.cone : dy < -1 ? C.petalLit : dy > 1 ? C.petalDown : C.petal);
    }
  p.set(cx, cy, C.coneDark);
  p.set(cx, cy + 1, C.coneDark);
  p.set(cx - 1, cy, C.cone);
}

/** A green fruit just set (9×9) at (cx, cy), the calyx star on top. */
function greenFruit(p: PixelCanvas, cx: number, cy: number): void {
  p.ellipse(cx, cy, 4, 4, C.fruit);
  for (const [dx, dy] of [[-2, -2], [-1, -2], [-2, -1], [-3, 0], [-2, 0]]) p.set(cx + dx, cy + dy, C.fruitLit);
  p.set(cx - 1, cy - 1, '#F0F8D0');
  for (const [dx, dy] of [[3, 1], [2, 2], [3, 2], [1, 3], [2, 3], [0, 4]]) p.set(cx + dx, cy + dy, C.fruitDown);
  for (const [dx, dy] of [[0, -4], [-1, -4], [1, -4], [-2, -3], [2, -3], [-3, -4], [3, -4], [0, -5]]) p.set(cx + dx, cy + dy, C.calyx);
}

/** A truss out to the right (flipped for the left): the stalk from the stem, bending down by b, with its flowers / fruit hanging. */
function trussPixels(kind: 'fruit' | 'flower', b: number, seed: number): PixelCanvas {
  const p = new PixelCanvas(SPR, SPR);
  const len = 22;
  let x = ROOT_X;
  let y = ROOT_Y;
  const pts: [number, number][] = [];
  for (let s = 0; s <= len; s++) {
    const th = -0.25 + 0.04 * s + b * 1.0 * (s / len);
    pts.push([Math.round(x), Math.round(y)]);
    x += Math.cos(th);
    y += Math.sin(th);
  }
  const hang = kind === 'fruit' ? ['fruit', 'fruit', 'flower', 'flower', 'bud'] : ['flower', 'flower', 'flower', 'flower', 'bud'];
  const at = [6, 10, 14, 18, 22];
  // the stalk (2px near the stem)
  pts.forEach(([px, py], i) => {
    p.set(px, py, C.petiole);
    if (i < 12) p.set(px, py + 1, C.leafEdge);
  });
  // the far ones first (the near ones over them)
  [...hang.keys()].reverse().forEach((j) => {
    const h = hang[j];
    const [px, py] = pts[at[j]];
    const dl = 4 + ((ihash(j, 1, seed) % 3) as number) + (j % 2 ? 3 : 0);
    const lean = j % 2 ? 1 : -1;
    for (let i = 1; i <= dl; i++) p.set(px + (i > 3 ? lean : 0) + (i > 6 ? lean : 0), py + i, C.petiole);
    const fx = px + lean * (dl > 6 ? 2 : 1);
    const fy = py + dl + 4;
    if (h === 'fruit') greenFruit(p, fx, fy + 1);
    else if (h === 'flower') {
      // the sepals behind, then the flower
      for (const dx of [-2, 0, 2]) p.set(fx + dx, fy - 5, C.calyx);
      flower(p, fx, fy, -Math.PI / 2 + ((ihash(j, 2, seed) % 7) - 3) * 0.12);
    } else {
      // a flower bud: green, the yellow showing at its end
      p.rect(fx - 1, fy - 3, 3, 4, C.fruit);
      p.set(fx - 1, fy - 3, C.fruitLit);
      p.set(fx, fy + 1, C.petal);
      p.set(fx - 1, fy + 1, C.petalLit);
      p.set(fx + 1, fy + 1, C.petalDown);
    }
  });
  p.outline(C.outline);
  return p;
}

const sprCache = new Map<string, HTMLCanvasElement>();
function cached(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = sprCache.get(key);
  if (!c) {
    c = make();
    sprCache.set(key, c);
  }
  return c;
}

/** The shoot / truss of a target at bend frame f (0..4), lit or dark; drawn with its root (ROOT_X, ROOT_Y) on (bx, by). */
export function targetImg(t: TargetDef, f: number, lit: boolean): HTMLCanvasElement {
  const b = Math.max(0, Math.min(BEND_FRAMES - 1, f)) / (BEND_FRAMES - 1);
  return cached(`${t.kind}:${t.size}:${t.truss}:${t.seed}:${t.side}:${f}:${lit ? 1 : 0}`, () => {
    let px = t.kind === 'me' ? budPixels(t.size, b, t.seed) : trussPixels(t.truss, b, t.seed);
    if (t.side < 0) px = px.flipped();
    if (!lit) px = nightOf(px);
    return px.toCanvas();
  });
}

/** Where a sprite is drawn so its root sits on the target's root. */
export function targetOrigin(t: TargetDef): [number, number] {
  return [t.side > 0 ? t.bx - ROOT_X : t.bx - (SPR - 1 - ROOT_X), t.by - ROOT_Y];
}

// ================================================================ marks on the stem after a cut

/** A clean cut (ぽきっ): a small fresh round wound at the joint (5×5, centred). */
export function cutImg(): HTMLCanvasElement {
  return cached('cut', () => {
    const p = new PixelCanvas(5, 5);
    for (const [x, y] of [[2, 1], [1, 2], [3, 2], [2, 3]]) p.set(x, y, C.young);
    p.set(2, 2, C.cutFresh);
    p.outline(C.outline);
    return p.toCanvas();
  });
}

/**
 * A torn joint (切り口が ぎざぎざ): a jagged wound and a strip of skin peeled
 * down the stem, a shred hanging out (12×14; the joint at (3,3), right-hand).
 */
export function gizaImg(side: 1 | -1): HTMLCanvasElement {
  return cached(`giza:${side}`, () => {
    let p = new PixelCanvas(12, 14);
    // the jagged face
    for (const [x, y] of [[2, 2], [3, 2], [4, 3], [2, 3], [3, 3], [3, 4], [2, 4], [4, 2]]) p.set(x, y, C.cutFresh);
    for (const [x, y] of [[1, 2], [5, 3], [2, 5], [4, 5], [5, 1]]) p.set(x, y, C.youngDown);
    // the peeled strip down the stem
    for (let y = 5; y < 13; y++) p.set(2 + (y > 9 ? 1 : 0), y, y % 2 ? C.youngLit : C.cutFresh);
    // the shred of the shoot's skin, hanging out and down
    for (const [x, y] of [[5, 4], [6, 5], [7, 6], [7, 7], [8, 8]]) p.set(x, y, C.rib);
    p.outline(C.outline);
    if (side < 0) p = p.flipped();
    return p.toCanvas();
  });
}

// ================================================================ しゅん's fingers

const SKIN = ['#FFD9B8', '#F2B894', '#E0A882', '#9A5E48'];
/** The sleeve of しゅん's oversized green tee at the wrist (30 9.1, art/chars/people/minato.ts). */
const SLEEVE = ['#6CC48A', '#3FA66B'];

/**
 * しゅん's hand from the right, pointing left (flipped for a target on the
 * left): 'point' (the forefinger out, the thumb under) or 'pinch' (the two
 * tips together). 18×13; the fingertips at (0,5). `green` 0..1 stains the tips.
 */
export function handImg(pose: 'point' | 'pinch', side: 1 | -1, green: number): HTMLCanvasElement {
  const g = Math.round(green * 4) / 4;
  return cached(`hand:${pose}:${side}:${g}`, () => {
    let p = new PixelCanvas(18, 13);
    const tip = (c: string) => (g > 0 ? mix(c, '#7DB866', g * 0.7) : c);
    // the palm and the back of the hand
    p.rect(8, 2, 6, 9, SKIN[0]);
    p.rect(8, 8, 6, 3, SKIN[1]);
    // the forefinger
    const fy = pose === 'pinch' ? 4 : 3;
    p.rect(1, fy, 8, 3, SKIN[0]);
    p.hline(1, 8, fy + 2, SKIN[1]);
    p.set(0, fy + 1, tip(SKIN[1]));
    p.set(1, fy, tip(SKIN[0]));
    p.set(1, fy + 1, tip(SKIN[0]));
    p.set(2, fy + 1, '#FFF0E0'); // the nail
    // the thumb (under; up to the finger when pinching)
    const ty = pose === 'pinch' ? 6 : 8;
    p.rect(3, ty, 6, 2, SKIN[1]);
    p.hline(3, 8, ty + 1, SKIN[2]);
    p.set(2, ty, tip(SKIN[1]));
    p.set(2, ty + 1, tip(SKIN[2]));
    // the other fingers curled in the palm
    p.hline(9, 12, 6, SKIN[2]);
    p.hline(9, 12, 8, SKIN[2]);
    // the sleeve (the tee is oversized: a wide cuff)
    p.rect(14, 1, 4, 11, SLEEVE[0]);
    p.vline(14, 1, 11, SLEEVE[1]);
    p.hline(14, 17, 11, SLEEVE[1]);
    // the stain: the first pixels of the finger and the thumb go green with each shoot
    if (g > 0)
      for (let y = 0; y < 13; y++)
        for (let x = 0; x <= 4; x++) {
          const v = p.get(x, y);
          if (v >>> 24 === 0) continue;
          const hex = SKIN.find((c) => rgba32(c) === v);
          if (hex && (x <= 2 || (x <= 4 && g >= 0.75))) p.set(x, y, tip(hex));
        }
    p.outline(SKIN[3]);
    if (side < 0) p = p.flipped();
    return p.toCanvas();
  });
}

// ================================================================ the lantern's disc

const maskCache = new Map<number, HTMLCanvasElement>();
/** A disc of radius r (size 2r+1): full inside, a 2px checker at its rim (the lantern's border, 52 8.5). */
export function lightMask(r: number): HTMLCanvasElement {
  const hit = maskCache.get(r);
  if (hit) return hit;
  const size = r * 2 + 1;
  const p = new PixelCanvas(size, size);
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - r, y - r);
      if (d <= r - 3 || (d <= r && ((x >> 1) + (y >> 1)) % 2 === 0)) p.set(x, y, '#FFFFFF');
    }
  const c = p.toCanvas();
  maskCache.set(r, c);
  return c;
}

/** QA: every shoot and truss of the three plants at bends 0, 2, 4, lit and dark, and the hand and the marks. */
export function wakimeSheet(scale = 3): HTMLCanvasElement {
  const cols = 6;
  const rows: HTMLCanvasElement[][] = [];
  for (let n = 0; n < 3; n++)
    for (const t of plantDef(n).targets) rows.push([0, 2, 4].flatMap((f) => [targetImg(t, f, true), targetImg(t, f, false)]));
  const extra = [handImg('point', 1, 0), handImg('pinch', 1, 0.5), handImg('pinch', -1, 1), cutImg(), gizaImg(1), gizaImg(-1)];
  const cw = SPR + 4;
  const [c, ctx] = makeCanvas(cw * cols * scale, (rows.length + 1) * cw * scale);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#3A2C3C';
  ctx.fillRect(0, 0, c.width, c.height);
  rows.forEach((r, j) => r.forEach((im, i) => ctx.drawImage(im, i * cw * scale, j * cw * scale, im.width * scale, im.height * scale)));
  extra.forEach((im, i) => ctx.drawImage(im, i * cw * scale, rows.length * cw * scale, im.width * scale, im.height * scale));
  return c;
}
