// 夕鳴小学校の 校庭（map_school_kotei, 36×22。30_level_art 3.17、10_narrative 7.25、02_ch2_index #82。
// 2026-10-05 依頼主の採用：げむきかの新しい案1「二人十五脚」）と、裏庭 map_school の 西の 生け垣の 口。
//
//   bld_kotei_kousha  校舎の 正面（36×4 タイル）。2F の 窓の 列、まん中に 大時計の 出っぱり
//                     （段階0 は 4時58分ごろで 動く、段階1 から 5時で 止まる、段階2 は 秒針が ふるえ、
//                     針の 影だけ 北東を さす）、2F の 床の 帯、1F の 教室の 窓（カーテン、すきまに
//                     机に あげた いす）、昇降口（ひさし、ガラスの 引き戸、奥に くつ箱）、雨どい。
//   prop_kotei_track  消えかけた トラックの 白線（平ら。小さな 1周：直線 128px、半円 2つ）。3本の 線と、
//                     北の 直線の ゴールの 線（ちょっと 太い）。KOTEI_TRACK が 線と 走る 道の 形。
//   prop_kotei_chorei 朝礼台（鉄の 台、×の すじかい、東に 階段、てっぺんに 白い ペンキの 足形 2つ）。
//   prop_kotei_nobori のぼり棒 5本（赤・黄・青・緑・白。いちばん 右は てっぺんの 色が はげている。
//                     段階2 は 北東へ 少し かたむく）。
//   prop_kotei_sunaba 走り幅とびの 砂場の 木の 枠、トンボの あと、ふみきり板、しまい忘れた メジャー（平ら）。
//   prop_kotei_hidokei 卒業記念の 日時計（石の 台、青銅の 文字盤、指針。影は 段階0 で 5の 線の 手前、
//                     段階1 で 5の 線の 上、段階2 は 北東）。
//   bld_kotei_souko   体育倉庫（トタン屋根、スチールの 引き戸、札『運動会 用具』。戸の すきまから 綱の
//                     はし。段階2 は 戸が 少し 開いて、中は 綱の ぶんだけ 空いている）。
//   prop_kotei_nishi  裏庭 map_school (0,11)–(0,12) の 西の 生け垣の 口（2マス）：砂利の 通路が 校舎の 西を 回る。
//   prop_kotei_fuda   裏庭 (6,11) の 立て札『← 校庭』（2026-10-06）。
// 赤とんぼ・白線の 粉・はちまき・ヒキヅナの 綱は world の fx（events/kotei.ts）。絵は 段階ごとに 1回 焼く。

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas } from '../../engine/pixel';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { castRight, dk, finish, lt, shadeRect } from './kit';
import { drainPipe, eaveShadow, facadeFoot, fillWall, glassPane, KAWARA_IBUSHI, registerBuilding, roofTin, wallMortar, type Bld } from './bkit';
import { flat, stand } from './pkit';
import { registerProp } from './registry';
import { printLines } from './text';
import type { PropArt, PropEnv } from './types';

// ================================================================ the track (shared with events/kotei.ts)

/**
 * The little track (world px): the middle of its two straights at (cx, cy), straights a·2
 * long, half-circles at each end. r1 = the inner lane (なんばるわんと コタロウ), r2 = the outer
 * lane (しゅんと グソっ君); lines = the three chalk lines; goalX = the start / goal line across
 * the north straight. Running is counter-clockwise from above (west along the north straight first).
 */
export const KOTEI_TRACK = { cx: 288, cy: 196, a: 64, r1: 50, r2: 76, lines: [40, 63, 89], goalX: 264 } as const;

/** The lap length of a lane of radius r (px). */
export function lapLen(r: number): number {
  const T = KOTEI_TRACK;
  return 4 * T.a + 2 * Math.PI * r;
}

/**
 * The point s px along the lane of radius r from the goal line (counter-clockwise),
 * its direction of travel (unit) and its outward normal (unit).
 */
export function laneAt(r: number, s: number): { x: number; y: number; tx: number; ty: number; nx: number; ny: number } {
  const T = KOTEI_TRACK;
  const L = lapLen(r);
  let d = ((s % L) + L) % L;
  const w = T.cx - T.a;
  const e = T.cx + T.a;
  const l1 = T.goalX - w;
  if (d < l1) return { x: T.goalX - d, y: T.cy - r, tx: -1, ty: 0, nx: 0, ny: -1 };
  d -= l1;
  const arc = Math.PI * r;
  if (d < arc) {
    const th = -Math.PI / 2 - d / r;
    return { x: w + r * Math.cos(th), y: T.cy + r * Math.sin(th), tx: Math.sin(th), ty: -Math.cos(th), nx: Math.cos(th), ny: Math.sin(th) };
  }
  d -= arc;
  if (d < 2 * T.a) return { x: w + d, y: T.cy + r, tx: 1, ty: 0, nx: 0, ny: 1 };
  d -= 2 * T.a;
  if (d < arc) {
    const th = Math.PI / 2 - d / r;
    return { x: e + r * Math.cos(th), y: T.cy + r * Math.sin(th), tx: Math.sin(th), ty: -Math.cos(th), nx: Math.cos(th), ny: Math.sin(th) };
  }
  d -= arc;
  return { x: e - d, y: T.cy - r, tx: -1, ty: 0, nx: 0, ny: -1 };
}

/** Where the last curve (the east one) ends, as a fraction of the lap (lane r). */
export function lastCurveEnd(r: number): number {
  const T = KOTEI_TRACK;
  return (T.goalX - (T.cx - T.a) + 2 * Math.PI * r + 2 * T.a) / lapLen(r);
}

// the image's frame: tile (8,6) = world (128,96)
const TX0 = 128;
const TY0 = 96;
const TW = 320;
const TH = 196;

const TRACK_IMG = (() => {
  const T = KOTEI_TRACK;
  const p = new PixelCanvas(TW, TH);
  const chalk = (x: number, y: number, k: number) => {
    const X = Math.round(x) - TX0;
    const Y = Math.round(y) - TY0;
    if (!p.inside(X, Y)) return;
    // worn away in patches (消えかけた): a slow noise along the line, and loose grains
    const h = ihash(Math.floor(x / 7), Math.floor(y / 7), 9101 + k) % 10;
    const g = ihash(X, Y, 9103) % 10;
    if (h < 3 && g < 7) return;
    if (g === 0) return;
    p.set(X, Y, h < 5 ? mix(P.concreteLt, P.woodLt, 0.35) : g < 3 ? P.concreteLt : P.white);
  };
  T.lines.forEach((r, k) => {
    const L = lapLen(r);
    for (let s = 0; s < L; s += 0.5) {
      const q = laneAt(r, s);
      chalk(q.x, q.y, k);
    }
  });
  // the start / goal line across the north straight: 2px, freshly drawn (ちょっと 太い)
  for (let y = T.cy - T.lines[2]; y <= T.cy - T.lines[0]; y++)
    for (const dx of [0, 1]) {
      const X = T.goalX - TX0 + dx;
      const Y = y - TY0;
      if (ihash(X, Y, 9107) % 9 === 0) continue;
      p.set(X, Y, dx ? P.concreteLt : P.white);
    }
  // the lane numbers by the line, in chalk (1, 2), half rubbed out
  const num = (x: number, y: number, rows: string[]) => {
    rows.forEach((row, j) => [...row].forEach((c, i) => c === '#' && ihash(i, j, 9109 + x) % 4 && p.set(x - TX0 + i, y - TY0 + j, P.concreteLt)));
  };
  num(T.goalX + 6, T.cy - 58, ['.#.', '##.', '.#.', '.#.', '###']);
  num(T.goalX + 6, T.cy - 82, ['##.', '..#', '.#.', '#..', '###']);
  return p.toCanvas();
})();

registerProp('prop_kotei_track', () => flat(TRACK_IMG, 0, 0));

// ================================================================ 校舎の 正面 bld_kotei_kousha (0,0)

/** The clock tower bay (canvas x range) and its clock face (centre, radius). */
const BAY: [number, number] = [268, 308];
export const KOTEI_CLOCK: [number, number, number] = [288, 11, 9];
/** The 1F classroom windows; the entrance (昇降口). */
const WIN1: [number, number][] = [[12, 54], [62, 104], [116, 158], [166, 196], [318, 360], [368, 410], [422, 464], [472, 514], [526, 566]];
const WIN2: [number, number][] = [[12, 54], [62, 104], [116, 158], [166, 208], [216, 258], [318, 360], [368, 410], [422, 464], [472, 514], [526, 566]];
const SHOKO: [number, number] = [206, 262];
const F1_Y = 31;
const F1_H = 22;
const F2_Y = 2;
const F2_H = 13;

function curtain(p: PixelCanvas, x0: number, x1: number, y: number, h: number, seed: number): void {
  const gap = x0 + 6 + (ihash(seed, 3, 9121) % Math.max(1, x1 - x0 - 12));
  for (let x = x0; x <= x1; x++) {
    if (x >= gap && x <= gap + 2) {
      // the room through the gap: a chair up on its desk
      for (let j = 0; j < h; j++) p.set(x, y + j, j > h - 9 && j < h - 3 && ((x + j) & 1) ? P.ink : j === h - 10 ? P.asphalt : P.nightShade);
      continue;
    }
    const f = (x - x0) % 4;
    const c = f === 0 ? P.paperGrid : f === 3 ? P.woodLt : P.paper;
    for (let j = 0; j < h; j++) p.set(x, y + j, j === 0 ? P.woodLt : c);
    p.set(x, y + h - 1, f === 0 ? P.woodLt : P.paperGrid);
  }
}

function aluWindow(b: Bld, x0: number, x1: number, y: number, h: number): void {
  const p = b.p;
  p.rect(x0 - 1, y - 1, x1 - x0 + 2, h + 2, P.steel);
  p.hline(x0 - 1, x1, y - 1, P.concreteLt);
  p.vline(x0 - 1, y - 1, y + h, P.concreteLt);
  glassPane(p, b.mask, x0, y, x1 - x0, h, { base: P.shadeDeep, glint: true });
  // the evening sky in the upper panes
  for (let x = x0; x < x1; x++) {
    p.set(x, y, P.sky);
    if ((x + y) % 3 === 0) p.set(x, y + 1, P.horizon);
  }
  // the sashes
  const n = Math.max(2, Math.round((x1 - x0) / 14));
  for (let k = 1; k < n; k++) p.vline(x0 + Math.round(((x1 - x0) * k) / n), y, y + h - 1, P.steel);
  p.hline(x0 - 2, x1 + 1, y + h + 1, P.white);
  p.hline(x0 - 2, x1 + 1, y + h + 2, P.steel);
  castRight(p, x0 - 1, y - 1, x1 - x0 + 2, h + 2, 2);
}

function kousha(b: Bld): void {
  const p = b.p;
  const W = b.w;
  const bot = b.botY;
  fillWall(p, 0, 0, W, bot, wallMortar(P.concreteLt, 7));
  // ---- 2F: the windows (their lower part; the rest is above the screen), the sky in the glass
  WIN2.forEach(([x0, x1]) => aluWindow(b, x0, x1, F2_Y, F2_H));
  // ---- the 2F floor band
  for (let x = 0; x < W; x++) {
    p.set(x, 19, P.white);
    p.set(x, 20, P.concreteLt);
    p.set(x, 21, P.concrete);
    p.set(x, 22, x % 48 === 47 ? P.asphalt : P.steel);
  }
  eaveShadow(p, 0, 23, W, 2);
  for (let x = 2; x < W; x++) if (ihash(x, 23, 9123) % 9 === 0) for (let j = 0; j < 2 + (x % 4); j++) shadeRect(p, x, 25 + j, 1, 1);
  // ---- the clock bay: a step proud of the wall, from the top of the screen to the band
  const [bx0, bx1] = BAY;
  for (let y = 0; y < 19; y++)
    for (let x = bx0; x < bx1; x++) p.set(x, y, x < bx0 + 3 ? P.white : x > bx1 - 3 ? P.concrete : ihash(x, y, 9125) % 11 === 0 ? P.concrete : P.concreteLt);
  castRight(p, bx0, -1, bx1 - bx0, 20, 3);
  // the face: a white disc in a dark ring, twelve ticks (the hands are drawn per frame)
  const [kx, ky, kr] = KOTEI_CLOCK;
  p.circle(kx, ky, kr + 1, P.ink);
  p.circle(kx, ky, kr, P.white);
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const r = i % 3 === 0 ? kr - 2 : kr - 1;
    p.set(Math.round(kx + Math.sin(a) * r), Math.round(ky - Math.cos(a) * r), i % 3 === 0 ? P.ink : P.asphalt);
    if (i % 3 === 0) p.set(Math.round(kx + Math.sin(a) * (r - 1)), Math.round(ky - Math.cos(a) * (r - 1)), P.asphalt);
  }
  p.set(kx - 4, ky - 6, P.glint);
  p.set(kx - 5, ky - 5, P.glint);
  // ---- 1F classroom windows, curtains drawn
  WIN1.forEach(([x0, x1], i) => {
    aluWindow(b, x0, x1, F1_Y, F1_H);
    curtain(p, x0, x1 - 1, F1_Y + 2, F1_H - 2, i);
  });
  // ---- 昇降口: the canopy, four glass doors, the shoe boxes behind them
  const [sx0, sx1] = SHOKO;
  p.rect(sx0, 31, sx1 - sx0, bot - 34, P.shadeDeep);
  // shoe boxes: a grid of little cubbies, a pair of white 上ばき in one
  for (let y = 36; y < bot - 6; y += 4)
    for (let x = sx0 + 2; x < sx1 - 2; x += 4) {
      p.rect(x, y, 3, 3, P.nightShade);
      p.hline(x, x + 2, y + 3, P.shade);
    }
  p.rect(sx0 + 34, 44, 2, 2, P.white);
  p.rect(sx0 + 37, 44, 2, 2, P.white);
  // the doors' frames (4 leaves) over the glass
  for (let k = 0; k <= 4; k++) p.vline(sx0 + Math.round(((sx1 - sx0) * k) / 4), 31, bot - 4, P.steel);
  p.hline(sx0, sx1, 31, P.concreteLt);
  for (let y = 33; y < bot - 6; y += 9) for (let x = sx0 + 2; x < sx1 - 2; x += 14) p.set(x, y, P.glint);
  for (let j = 31; j < bot - 4; j++) for (let i = sx0; i < sx1; i++) b.mask.set(i, j, '#ffffff');
  // a paper on the glass: 『夏休み中は 職員玄関へ』
  p.rect(sx0 + 20, 40, 9, 7, P.paper);
  printLines(p, sx0 + 21, 41, 7, 3, P.asphalt, 7, 2);
  // the canopy
  p.rect(sx0 - 8, 26, sx1 - sx0 + 16, 4, P.concreteLt);
  p.hline(sx0 - 8, sx1 + 7, 26, P.white);
  p.hline(sx0 - 8, sx1 + 7, 29, P.steel);
  eaveShadow(p, sx0 - 7, 30, sx1 - sx0 + 14, 2);
  // the step
  p.rect(sx0 - 4, bot - 5, sx1 - sx0 + 8, 3, P.concrete);
  p.hline(sx0 - 4, sx1 + 3, bot - 5, P.white);
  // ---- the school's name plate by the entrance (too small to read) and a fire hose box
  p.rect(sx1 + 12, 34, 6, 18, P.white);
  p.strokeRect(sx1 + 11, 33, 8, 20, P.steel);
  for (let y = 36; y < 50; y += 3) p.hline(sx1 + 13, sx1 + 16, y, P.asphalt);
  castRight(p, sx1 + 11, 33, 8, 20, 2);
  p.rect(sx0 - 22, 38, 10, 12, P.verm);
  p.strokeRect(sx0 - 22, 38, 10, 12, P.vermShade);
  p.hline(sx0 - 21, sx0 - 14, 39, P.vermLt);
  p.rect(sx0 - 20, 41, 6, 3, P.white);
  castRight(p, sx0 - 22, 38, 10, 12, 2);
  // drain pipes
  for (const x of [4, 110, 264, 312, 418, 520, 570]) drainPipe(p, x, 0, bot - 2);
  facadeFoot(p, 0, bot, W, P.concrete);
}

registerBuilding({
  id: 'bld_kotei_kousha',
  W: 36,
  R: 0,
  F: 4,
  band: 0,
  paint(b) {
    kousha(b);
  },
  over(g, x, y, env) {
    const [kx, ky] = KOTEI_CLOCK;
    const cx = x + kx;
    const cy = y + ky;
    const s = env.stage;
    // stage 0: 4:58 and going (the frozen-time clock); from stage 1: 5:00 and stopped
    const min = s === 0 ? 58 + ((env.mt / 60000) % 2) : 60;
    const hour = 4 + min / 60;
    const ma = (min / 60) * Math.PI * 2;
    const ha = (hour / 12) * Math.PI * 2;
    if (s >= 2) {
      // the hands' shadow alone points north-east
      g.line(cx + 1, cy + 1, Math.round(cx + 1 + 5), Math.round(cy + 1 - 5), P.concrete);
    }
    g.line(cx, cy, Math.round(cx + Math.sin(ha) * 4), Math.round(cy - Math.cos(ha) * 4), P.ink);
    g.line(cx, cy, Math.round(cx + Math.sin(ma) * 7), Math.round(cy - Math.cos(ma) * 7), P.ink);
    // the second hand: going (0), stopped at 12 (1), trembling there (2)
    const sa = s === 0 ? ((env.mt / 1000) % 60) / 60 * Math.PI * 2 : s === 2 ? (Math.floor(env.t / 90) % 2 ? 0.08 : -0.08) : 0;
    g.line(cx, cy, Math.round(cx + Math.sin(sa) * 7), Math.round(cy - Math.cos(sa) * 7), P.verm);
    g.px(cx, cy, P.verm);
  },
});

// ================================================================ 朝礼台 prop_kotei_chorei (2,11)

const CHOREI = (() => {
  const w = 52;
  const h = 36;
  const p = new PixelCanvas(w, h);
  const top = 6;
  const face = 16;
  const green = '#4F8A6A';
  const greenLt = '#6FAE86';
  const greenDk = '#2E6B4A';
  // the top plate (chequered steel, painted), its lit front edge
  p.rect(2, top, 44, 10, greenLt);
  for (let y = top + 1; y < top + 9; y += 2) for (let x = 3 + ((y >> 1) & 1); x < 45; x += 3) p.set(x, y, green);
  p.hline(2, 45, top, P.white);
  p.hline(2, 45, top + 9, greenDk);
  // the two white footprints (足形)
  for (const [fx, fy] of [[19, top + 3], [26, top + 3]]) {
    p.rect(fx, fy, 3, 4, P.white);
    p.set(fx + 1, fy - 1, P.white);
    p.set(fx, fy + 4, P.concreteLt);
  }
  // the front: a frame with cross braces, the legs
  p.rect(2, face, 44, 16, greenDk);
  p.rect(3, face + 1, 42, 13, green);
  for (let k = 0; k < 3; k++) {
    const x0 = 4 + k * 14;
    p.line(x0, face + 2, x0 + 12, face + 12, greenDk);
    p.line(x0 + 12, face + 2, x0, face + 12, greenDk);
  }
  p.vline(2, face, h - 2, greenDk);
  p.vline(45, face, h - 2, greenDk);
  p.vline(16, face, h - 2, greenDk);
  p.vline(31, face, h - 2, greenDk);
  p.hline(2, 45, face + 15, greenDk);
  // the steps on the east side (three treads)
  for (let k = 0; k < 3; k++) {
    const sx = 46;
    const sy = top + 8 + k * 7;
    p.rect(sx, sy, 5, 2, greenLt);
    p.hline(sx, sx + 4, sy, P.white);
    p.vline(sx + 4, sy, h - 2, greenDk);
  }
  // rust at the feet, the paint chipped on the corner
  for (let x = 2; x < 46; x++) if (ihash(x, 2, 9131) % 5 === 0) p.set(x, h - 3, P.wood);
  p.set(45, face + 1, P.steel);
  p.set(44, face + 2, P.steel);
  finish(p, { rim: true, soft: true });
  return p.toCanvas();
})();

registerProp('prop_kotei_chorei', () => stand(CHOREI, { cx: 25, base: 32, shadow: 18, contact: 44 }));

// ================================================================ のぼり棒 prop_kotei_nobori (30,8)

const NOBORI_COLS = [P.verm, P.gold, P.blue, P.leaf, P.white];

function nobori(lean: boolean): HTMLCanvasElement {
  const w = 84;
  const h = 62;
  const p = new PixelCanvas(w, h);
  const top = 4;
  const base = h - 3;
  const lx = (x: number, y: number) => (lean ? x + Math.round((2 * (base - y)) / (base - top)) : x);
  // the top bar
  for (let x = 2; x < w - 2; x++) {
    const X = lean ? x + 2 : x;
    p.set(X, top, P.concreteLt);
    p.set(X, top + 1, P.steel);
    p.set(X, top + 2, P.asphalt);
  }
  // five poles, each its colour, lit on the left
  NOBORI_COLS.forEach((c, i) => {
    const x = 8 + i * 16;
    for (let y = top + 3; y <= base; y++) {
      const X = lx(x, y);
      // the rightmost: its paint worn off at the top (the one they climb)
      const worn = i === 4 && y < top + 14 && ihash(x, y, 9141) % 3 !== 0;
      const col = worn ? P.steel : c;
      p.set(X, y, lt(col));
      p.set(X + 1, y, col);
      p.set(X + 2, y, dk(col));
    }
    // the foot set in concrete
    p.rect(x - 2, base, 7, 2, P.concrete);
    p.hline(x - 2, x + 4, base, P.concreteLt);
  });
  // the end frames
  for (let y = top; y <= base; y++) {
    p.set(lx(2, y), y, P.steel);
    p.set(lx(3, y), y, P.asphalt);
    p.set(lx(w - 4, y), y, P.steel);
    p.set(lx(w - 3, y), y, P.asphalt);
  }
  finish(p, { rim: true, soft: true, rimEvery: 4 });
  return p.toCanvas();
}

registerProp('prop_kotei_nobori', () => {
  const a = nobori(false);
  const b = nobori(true);
  const art = stand(a, { cx: 40, base: 16, shadow: 40, contact: 76 });
  return { ...art, img: (env: PropEnv) => (env.stage >= 2 ? b : a) };
});

// ================================================================ 砂場 prop_kotei_sunaba (1,17) — flat

const SUNABA = (() => {
  const w = 104;
  const h = 50;
  const p = new PixelCanvas(w, h);
  // the wooden frame round the pit (5×3 tiles, from (1,17))
  const fx1 = 80;
  const fy1 = 48;
  for (let x = 0; x < fx1; x++) {
    p.set(x, 0, P.woodLt);
    p.set(x, 1, P.wood);
    p.set(x, fy1 - 2, P.woodLt);
    p.set(x, fy1 - 1, P.woodDark);
  }
  for (let y = 0; y < fy1; y++) {
    p.set(fx1 - 2, y, P.woodLt);
    p.set(fx1 - 1, y, P.woodDark);
  }
  // the rake's lines across the sand (トンボで ならしてある)
  for (let y = 6; y < fy1 - 4; y += 4) for (let x = 2; x < fx1 - 4; x++) if (ihash(x, y, 9151) % 6) p.set(x, y, mix(P.goldPale, P.woodLt, 0.6));
  // the take-off board (ふみきり板) on the runway east of the pit, and the measuring tape coil
  p.rect(fx1 + 4, 20, 4, 12, P.white);
  p.vline(fx1 + 7, 20, 31, P.concrete);
  p.hline(fx1 + 4, fx1 + 7, 31, P.steel);
  p.circle(fx1 + 16, 38, 3, P.gold);
  p.circle(fx1 + 16, 38, 1, P.charcoal);
  p.line(fx1 + 13, 38, fx1 + 4, 36, P.goldPale);
  return p.toCanvas();
})();

registerProp('prop_kotei_sunaba', () => flat(SUNABA, 0, 0));

// ================================================================ 日時計 prop_kotei_hidokei (31,17)

function hidokei(stage: number): HTMLCanvasElement {
  const w = 22;
  const h = 26;
  const p = new PixelCanvas(w, h);
  // the stone pedestal
  p.rect(5, 10, 12, 14, P.concrete);
  p.vline(5, 10, 23, P.concreteLt);
  p.vline(6, 10, 23, P.white);
  p.vline(16, 10, 23, P.steel);
  p.hline(4, 17, 23, P.steel);
  p.hline(3, 18, 24, P.asphalt);
  // the plate 『卒業記念』 (too small to read)
  p.rect(7, 14, 8, 5, P.brassOld);
  printLines(p, 8, 15, 6, 2, P.goldPale, 3, 2);
  // the dial on top (an ellipse seen from above), the hour lines
  p.ellipse(11, 7, 9, 4, P.brassOld);
  p.ellipse(11, 7, 8, 3, '#7A8A6A');
  for (let i = 0; i < 9; i++) {
    const a = Math.PI * (0.05 + (i / 8) * 0.9);
    p.set(Math.round(11 - Math.cos(a) * 7), Math.round(7 + Math.sin(a) * 2.6), P.goldPale);
  }
  // the gnomon (a bronze triangle, its edge up to the north)
  p.line(11, 7, 11, 2, P.brass);
  p.line(12, 7, 11, 2, P.brassOld);
  // the shadow: short of the 5 line (0), on it (1), north-east (2)
  const sh = stage >= 2 ? [[12, 6], [13, 5], [14, 5], [15, 4]] : stage === 1 ? [[12, 7], [13, 8], [14, 8], [15, 9]] : [[12, 7], [13, 7], [14, 8], [15, 8]];
  for (const [x, y] of sh) p.set(x, y, '#3E4A3A');
  finish(p, { rim: true, soft: true });
  return p.toCanvas();
}

registerProp('prop_kotei_hidokei', () => {
  const imgs = [hidokei(0), hidokei(1), hidokei(2)];
  const art = stand(imgs[0], { cx: 8, base: 16, shadow: 20, contact: 14 });
  return { ...art, img: (env: PropEnv) => imgs[Math.max(0, Math.min(2, Math.floor(env.stage)))] };
});

// ================================================================ 体育倉庫 bld_kotei_souko (1,5)

function souko(b: Bld, s2: boolean): void {
  const p = b.p;
  const W = b.w;
  roofTin(p, 0, 0, W, b.faceY, KAWARA_IBUSHI, 11, 0.4);
  const fy = b.faceY;
  const bot = b.botY;
  const wall = '#9AB0A0';
  fillWall(p, 0, fy, W, bot - fy, (i, j) => (i % 5 === 4 ? dk(wall) : (i + j * 7) % 23 === 0 ? lt(wall) : wall));
  eaveShadow(p, 0, fy, W, 2);
  // the steel sliding doors, a padlock, the sign 『運動会 用具』
  const dx0 = 14;
  const dx1 = 50;
  p.rect(dx0, fy + 3, dx1 - dx0, bot - fy - 4, P.steel);
  p.vline(Math.floor((dx0 + dx1) / 2), fy + 3, bot - 2, P.asphalt);
  p.hline(dx0, dx1 - 1, fy + 3, P.concreteLt);
  for (let x = dx0 + 2; x < dx1 - 1; x += 3) p.vline(x, fy + 5, bot - 3, mix(P.steel, P.asphalt, 0.4));
  p.rect(Math.floor((dx0 + dx1) / 2) - 1, fy + 8, 2, 3, P.gold);
  p.rect(dx0 + 3, fy + 4, 10, 4, P.white);
  printLines(p, dx0 + 4, fy + 5, 8, 2, P.asphalt, 11, 2);
  if (s2) {
    // the door slid back a little: the dark inside, room where the rope was
    p.rect(Math.floor((dx0 + dx1) / 2) - 3, fy + 4, 5, bot - fy - 6, P.night);
    p.vline(Math.floor((dx0 + dx1) / 2) + 2, fy + 4, bot - 3, P.concreteLt);
  } else {
    // the end of a thick rope through the gap at the foot
    for (let x = Math.floor((dx0 + dx1) / 2) - 1; x < Math.floor((dx0 + dx1) / 2) + 6; x++) {
      p.set(x, bot - 3, x % 2 ? P.woodLt : P.goldPale);
      p.set(x, bot - 2, x % 2 ? P.wood : P.woodLt);
    }
  }
  castRight(p, dx0, fy + 3, dx1 - dx0, bot - fy - 5, 1);
  facadeFoot(p, 0, bot, W, P.concrete);
}

registerBuilding({
  id: 'bld_kotei_souko',
  W: 4,
  R: 1,
  F: 1,
  top: 6,
  band: 6,
  paint(b) {
    souko(b, false);
  },
  stage(b, s) {
    if (s < 2) return null;
    return (p) => {
      const keep = b.p;
      b.p = p;
      souko(b, true);
      b.p = keep;
    };
  },
});

// ================================================================ 裏庭の 西の 生け垣の 口 prop_kotei_nishi (map_school (0,11)–(0,12)) — flat

// (2026-10-06: the gap 2 tiles wide, 依頼主「校庭に 入る 所が 分かりづらい」)
const NISHI = (() => {
  const p = new PixelCanvas(24, 34);
  // gravel running off to the west, its edge stones
  for (let y = 2; y < 32; y++)
    for (let x = 0; x < 22; x++) {
      const h = ihash(x, y, 9161) % 9;
      p.set(x, y, h === 0 ? P.steel : h < 3 ? P.concrete : h < 5 ? P.concreteLt : mix(P.concrete, P.woodLt, 0.3));
    }
  p.hline(0, 21, 1, P.asphalt);
  p.hline(0, 21, 32, P.asphalt);
  return p.toCanvas();
})();

registerProp('prop_kotei_nishi', () => flat(NISHI, -8, -17));

// ================================================================ 立て札『← 校庭』 prop_kotei_fuda (map_school (6,11))

/** A wooden post and a white board: a red arrow pointing west, a line of hand lettering under it. */
registerProp('prop_kotei_fuda', () => {
  const p = new PixelCanvas(18, 24);
  p.rect(8, 12, 2, 12, P.wood);
  p.vline(8, 12, 23, P.woodLt);
  p.rect(1, 1, 16, 12, P.white);
  p.strokeRect(1, 1, 16, 12, P.wood);
  // ← (the tip at x 3, a 2 px shaft to x 14)
  for (let i = 0; i < 3; i++) p.vline(3 + i, 6 - i, 7 + i, P.verm);
  p.rect(6, 6, 9, 2, P.verm);
  printLines(p, 4, 10, 10, 1, P.asphalt, 5);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 8, base: 16, shadow: 14, contact: 6 });
});

export type { Gfx };

// ================================================================ なんばるわんの家の トロフィー棚の はちまき prop_kotei_dochaku (map_madam (1,2))

/**
 * After the race (flag_kotei_done): on the bottom shelf, on the dust ring where the ramune stood,
 * the red-and-white hachimaki folded once, 『同着』 in marker on the white half. The same frame as
 * in_md_trophy (32×44, its bottom centre on the tile's), drawn just after it.
 */
const DOCHAKU = (() => {
  const p = new PixelCanvas(32, 44);
  p.rect(19, 35, 4, 2, P.verm);
  p.hline(19, 22, 35, P.vermLt);
  p.rect(23, 35, 5, 2, P.white);
  p.hline(23, 27, 35, '#FFFFFF');
  p.set(24, 36, P.ink);
  p.set(26, 36, P.ink);
  p.set(18, 36, P.vermShade);
  p.set(28, 37, P.concrete);
  return p.toCanvas();
})();

registerProp('prop_kotei_dochaku', () => stand(DOCHAKU, { cx: 16, base: 16, foot: 16, contact: 0, shadow: 0 }));
