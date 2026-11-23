// 村営天文台の中（map_hoshi_dome、50 10.25、52 4.7、02_ch2_index #77）：丸い 部屋を 南から
// 見下ろした 1画面。10年 閉めきりで まっくら（マップの 暗がり）、トマトの 灯りで 見る。
//
//   prop_dome_shell    部屋の 殻（平らな 層）：ドームの 内がわの 天井（地図の 上の 余白に
//                      はみ出す）、北の 円い 壁（ドームの 台の 輪と 方位の 印、観望会の 写真）、
//                      西の 壁の 手回しの ハンドル 2つ（スリット・ドーム）と 天井へ のぼる 鎖、
//                      塗った コンクリートの 丸い 床（台の まわりの 白い 線、すり減った 輪）。
//                      天井の スリットは 毎フレーム（閉じた 鉄板／開いて 星空。ドームの 向きで
//                      位置が 動く）、開いたら 床に 星あかりの 帯（光の 層）。
//   prop_dome_scope    柱の 上の 屈折望遠鏡と ドイツ式 赤道儀（極軸は 北の 空へ、反対に
//                      つりあいの おもり 2つ、微動ハンドルの ひも 2本、ファインダー）。
//                      カバーを かぶった 姿 → 白い 筒（ふた つき／ふたを とった レンズ）。
//                      筒の 向きは 見ている 星の 高さと 方角から（さかさまでは ない、外の 姿）。
//   prop_dome_desk     机：開いた『観望会の 記録』、星座早見盤、赤い セロハンの 電気スタンド
//   prop_dome_lightbox 段ボール箱：『観望会用 赤い ライト』の 懐中電灯
//   prop_dome_chairs   重ねた パイプいすと 子ども用の 踏み台
//
// 夜の 絵は 昼の 色で 描いて、暗がりと 灯りに まかせる（52 7章の はじめ・8.5）。
// 焼いて とっておく。毎フレームは スリットの 帯（約60×40）と 星の 点だけ。

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas } from '../../engine/pixel';
import { h01 } from '../tiles/noise';
import { getMapDef } from '../../world/maps';
import { P } from '../tiles/palette';
import { outline } from './kit';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

/** The map's size (52 4.7): 12×10 tiles. */
export const DOME_TW = 12;
export const DOME_TH = 10;
/** The ceiling drawn above the map's top edge (the fixed camera shows 28px of it). */
const TOP = 28;

const C = {
  ceil: '#262840',
  ceilDk: '#1C1D32',
  ceilLt: '#323552',
  rib: '#3A3E5C',
  ribLt: '#4A4F70',
  wall: '#D8D6CC',
  wallLt: '#E8E6DC',
  wallDk: '#B8B4A8',
  wallSh: '#9C988E',
  ring: '#7E8590',
  ringLt: '#A6ADB6',
  ringDk: '#5A606C',
  floor: '#5E6A6C',
  floorLt: '#6E7A7A',
  floorDk: '#4C5658',
  wear: '#748080',
  lineW: '#D8D2BC',
  shutter: '#5A606C',
  shutterLt: '#7A808C',
  shutterDk: '#3E4450',
  sky: '#141634',
  skyLt: '#1E2046',
  star: '#E8ECFF',
  starDim: '#9AA0C8',
  tube: '#ECEAE2',
  tubeLt: '#FFFFFF',
  tubeDk: '#B8B6AE',
  tubeSh: '#8E8C86',
  metal: '#6B7186',
  metalLt: '#9AA0A8',
  metalDk: '#3A3F48',
  cloth: '#C8BC9C',
  clothLt: '#DCD2B4',
  clothDk: '#A89C7E',
  clothSh: '#8A7E64',
  dust: '#ECE8DC',
  glass: '#2E4A6E',
  glassLt: '#7FD1E8',
  cap: '#24242C',
  capLt: '#4A4A56',
};

// ---------------------------------------------------------------- the dome's direction

/** The slit's azimuth (degrees, 0 north, 90 east): parked to the south until it is turned. */
export function domeAz(flag: (id: string) => number): number {
  const v = flag('flag_dome_az');
  return v > 0 ? v : 180;
}

/** Where the slit crosses the ceiling band (canvas x of the shell), by azimuth. */
function slitX(az: number): number {
  return Math.round(96 + Math.sin((az * Math.PI) / 180) * 70);
}

// ---------------------------------------------------------------- the shell

interface Shell {
  img: HTMLCanvasElement;
  W: number;
  H: number;
}

let shellCache: Shell | null = null;

/** The back wall's top edge (canvas y): the dome's base ring, higher in the middle (the drum seen from the south). */
const ringTop = (x: number) => TOP - 3 + Math.round(10 * (1 - Math.sqrt(Math.max(0, 1 - ((x - 96) / 104) ** 2))));
/** The back wall's foot (canvas y): the top of row 2. */
const WALL_FOOT = TOP + 32;
/** The side walls' inner faces: x 0–15 (west) and 176–191 (east), from the back wall down to row 8. */
const SIDE_W = 12;

function buildShell(rows: string[]): Shell {
  const W = DOME_TW * 16;
  const H = DOME_TH * 16 + TOP;
  const p = new PixelCanvas(W, H);
  const seed = 7701;
  const at = (tx: number, ty: number): string => (ty < 0 || ty >= rows.length || tx < 0 || tx >= DOME_TW ? '#' : [...rows[ty]][tx] ?? '#');
  const isFloor = (tx: number, ty: number) => {
    const c = at(tx, ty);
    return c !== '#' && c !== 'W' && c !== 'D';
  };
  // ---- the ceiling: the inside of the dome, ribs running up to the top
  for (let x = 0; x < W; x++) {
    const top = ringTop(x);
    for (let y = 0; y < top; y++) {
      const u = (x - 96) / Math.max(8, top - y + 70);
      const ribK = Math.abs(((u * 7 + 100.5) % 1) - 0.5);
      const side = Math.abs(x - 96) / 96;
      let c: string = side > 0.75 ? C.ceilDk : side < 0.3 && y < 12 ? C.ceilLt : C.ceil;
      if (ribK < 0.045) c = side > 0.6 ? C.rib : C.ribLt;
      if ((top - y) % 11 === 0 || h01(x, y, seed) < 0.012) c = mix(c, C.ceilDk, 0.5);
      p.set(x, y, c);
    }
  }
  // ---- the back wall: the drum, its top the dome's base ring with the bearings' marks
  for (let x = 0; x < W; x++) {
    const top = ringTop(x);
    const side = (x - 96) / 96;
    for (let y = top; y < WALL_FOOT; y++) {
      const j = y - top;
      let c: string = side < -0.55 ? C.wallLt : side > 0.6 ? C.wallSh : side > 0.25 ? C.wallDk : C.wall;
      if (j <= 1) c = j === 0 ? C.ringDk : C.ring;
      else if (j === 2) c = C.ringLt;
      else if (j === 3 || j === 4) c = C.ring;
      else if (j === 5) c = C.ringDk;
      else if (y === WALL_FOOT - 2) c = mix(c, C.wallSh, 0.6);
      else if (y === WALL_FOOT - 1) c = C.wallSh;
      else if (h01(x, y, seed + 1) < 0.03) c = mix(c, C.wallSh, 0.4);
      p.set(x, y, c);
    }
    if (x % 12 === 6) p.set(x, top + 3, C.ringLt);
  }
  // the bearing ticks on the ring: 北 over the middle (red), 東 and 西 at the ends
  const tick = (x: number, col: string) => p.vline(x, ringTop(x) + 1, ringTop(x) + 4, col);
  tick(96, P.verm);
  tick(10, P.ink);
  tick(182, P.ink);
  // ---- the side walls: the drum's inner face going down to the front, a band each side
  for (let ty = 2; ty < DOME_TH; ty++)
    for (let y = ty * 16 + TOP; y < ty * 16 + TOP + 16; y++) {
      const k = (y - WALL_FOOT) / (DOME_TH * 16 + TOP - WALL_FOOT);
      for (let i = 0; i < SIDE_W; i++) {
        const wx = 16 - SIDE_W + i - Math.round(k * 4);
        const ex = 176 + SIDE_W - 1 - i + Math.round(k * 4);
        const cW = i === SIDE_W - 1 ? C.wallSh : i < 2 ? C.wallDk : C.wallLt;
        const cE = i === SIDE_W - 1 ? C.wallSh : i < 2 ? C.wallSh : C.wallDk;
        if (wx >= 0) p.set(wx, y, mix(cW, P.ink, k * 0.35));
        if (ex < W) p.set(ex, y, mix(cE, P.ink, k * 0.35));
      }
    }
  // ---- the floor: painted concrete over the floor tiles, worn into a ring round the pier, the white line
  for (let ty = 2; ty < DOME_TH; ty++)
    for (let tx = 1; tx < DOME_TW - 1; tx++) {
      if (!isFloor(tx, ty)) continue;
      for (let y = ty * 16 + TOP; y < ty * 16 + TOP + 16; y++)
        for (let x = tx * 16; x < tx * 16 + 16; x++) {
          let c: string = C.floor;
          const n = h01(x, y, seed + 2);
          if (n < 0.06) c = C.floorDk;
          else if (n > 0.96) c = C.floorLt;
          const pr = Math.hypot(x - 96, (y - (TOP + 88)) / 0.62);
          if (pr > 42 && pr < 58 && h01(x >> 1, y >> 1, seed + 3) < 0.5) c = C.wear;
          if (Math.abs(pr - 34) < 0.8 && (Math.floor(Math.atan2(y - (TOP + 88), x - 96) * 9) & 1) === 0) c = C.lineW;
          // rounded corners: the floor tiles next to the void darken toward it
          const nearVoid = (!isFloor(tx - 1, ty) && x - tx * 16 < 3) || (!isFloor(tx + 1, ty) && tx * 16 + 15 - x < 3) || (!isFloor(tx, ty + 1) && ty * 16 + TOP + 15 - y < 2);
          if (nearVoid) c = mix(c, P.ink, 0.3);
          if (y - WALL_FOOT < 3) c = mix(c, P.ink, 0.35);
          p.set(x, y, c);
        }
    }
  // the round room's corners: the wall curving in over the corner tiles
  for (const [tx, ty] of [
    [1, 2],
    [10, 2],
    [1, 8],
    [10, 8],
  ] as [number, number][]) {
    if (isFloor(tx, ty)) continue;
    const cx0 = tx * 16 + (tx < 6 ? 16 : 0);
    const cy0 = ty * 16 + TOP + (ty < 5 ? 16 : 0);
    for (let y = ty * 16 + TOP; y < ty * 16 + TOP + 16; y++)
      for (let x = tx * 16; x < tx * 16 + 16; x++) {
        const d = Math.hypot(x - cx0, y - cy0);
        if (d < 13) p.set(x, y, mix(h01(x, y, seed + 2) < 0.06 ? C.floorDk : C.floor, P.ink, 0.2 + (d / 13) * 0.2));
        else if (d < 15) p.set(x, y, mix(C.floor, P.ink, 0.5));
        else if (ty < 5) p.set(x, y, d < 17 ? C.wallSh : mix(C.wallDk, C.wallSh, 0.5));
      }
  }
  // ---- the door in the south wall (6,9): a dark gap with the iron door swung in
  const dx = 6 * 16;
  const dy = 9 * 16 + TOP;
  p.rect(dx - 2, dy, 20, 2, C.metal);
  p.hline(dx - 2, dx + 17, dy, C.metalLt);
  p.rect(dx, dy + 2, 16, 12, P.night);
  p.rect(dx + 11, dy + 2, 5, 10, C.metal);
  p.vline(dx + 12, dy + 2, dy + 11, C.metalDk);
  p.hline(dx - 1, dx + 16, dy + 13, P.ink);
  // ---- the west wall's two hand cranks (tiles (0,3) スリット and (0,5) ドーム) and the chain up to the slit
  crank(p, 10, TOP + 3 * 16 + 8, 'slit');
  crank(p, 10, TOP + 5 * 16 + 8, 'rot');
  for (let y = 2; y < TOP + 3 * 16 - 6; y += 2) {
    const x = 11 + Math.round(Math.max(0, TOP + 30 - y) * 0.9);
    if (x > 60) continue;
    p.set(x, y, (y >> 1) % 2 ? C.metalLt : C.metalDk);
  }
  // ---- the star party's photo on the north wall (3,1), a calendar of the star parties at (7,1)
  photo(p, 3 * 16 + 1, TOP + 10);
  const kx = 7 * 16 + 4;
  const ky = TOP + 10;
  p.rect(kx, ky, 9, 12, P.paper);
  p.hline(kx, kx + 8, ky, P.verm);
  for (let k = 0; k < 4; k++) p.hline(kx + 1, kx + 7, ky + 3 + k * 2, P.paperGrid);
  p.set(kx + 5, ky + 7, P.verm);
  p.strokeRect(kx - 1, ky - 1, 11, 14, P.ink);
  return { img: p.toCanvas(), W, H };
}

/** A hand crank on the west wall: a gear wheel, its handle, the plate above (スリット / ドーム). */
function crank(p: PixelCanvas, x: number, y: number, k: 'slit' | 'rot'): void {
  // the bracket on the wall
  p.rect(x - 4, y - 7, 9, 15, C.wallDk);
  p.strokeRect(x - 4, y - 7, 9, 15, C.wallSh);
  // the wheel
  for (let a = 0; a < 16; a++) {
    const t = (a / 16) * Math.PI * 2;
    const r = a % 2 ? 5 : 6;
    p.set(x + Math.round(Math.cos(t) * r), y + Math.round(Math.sin(t) * r), C.metalDk);
  }
  p.circle(x, y, 4, C.metal);
  p.circle(x, y, 2, C.metalLt);
  p.set(x, y, C.metalDk);
  // the handle: an arm out to the room and its wooden grip
  p.line(x, y, x + 5, y + 4, C.metalDk);
  p.rect(x + 5, y + 3, 3, 4, k === 'slit' ? P.woodLt : P.wood);
  p.set(x + 5, y + 3, P.woodLt);
  // the plate (a white card in a holder, a red word for スリット, black for ドーム)
  p.rect(x - 3, y - 13, 9, 5, P.paper);
  p.strokeRect(x - 4, y - 14, 11, 7, C.metalDk);
  p.hline(x - 2, x + 4, y - 11, k === 'slit' ? P.verm : P.ink);
}

/** 観望会の 写真 (14×12): the white dome, children in a row pointing up, a man in the middle. */
function photo(p: PixelCanvas, x: number, y: number): void {
  p.rect(x - 1, y - 1, 16, 13, P.woodDark);
  p.rect(x, y, 14, 11, '#3A4A78');
  // the sky's dusk and the dome
  p.rect(x, y + 6, 14, 5, '#5A6A58');
  p.ellipse(x + 4, y + 5, 3, 3, P.white);
  p.rect(x + 1, y + 5, 7, 2, P.concreteLt);
  // the children (small heads), the teacher (taller, white shirt) — one with a black cap in his arms
  const kids = [2, 5, 9, 11, 12];
  for (const k of kids) {
    p.set(x + k, y + 7, P.ink);
    p.set(x + k, y + 8, k === 9 ? P.white : k % 2 ? P.red : P.blue);
  }
  p.set(x + 7, y + 5, P.ink);
  p.vline(x + 7, y + 6, y + 8, P.white);
  p.set(x + 2, y + 9, P.ink); // the cap held by the smallest
  // arms up to the sky
  p.set(x + 5, y + 6, P.ink);
  p.set(x + 12, y + 6, P.ink);
}

/** The slit on the ceiling: closed shutter plates, or the night between its rails. */
function drawSlit(g: Gfx, x0: number, y0: number, env: PropEnv): void {
  const az = domeAz(env.flag);
  const open = env.flag('flag_dome_slit') > 0;
  const sx = slitX(az);
  // the band runs from the top of the screen down to the ring (it follows the ceiling's curve)
  const foot = ringTop(sx);
  const top = 0;
  const w = 12;
  const left = x0 + sx - w / 2;
  // rails
  g.rect(left - 2, y0 + top, 2, foot - top, C.metalDk);
  g.rect(left + w, y0 + top, 2, foot - top, C.metalDk);
  if (!open) {
    g.rect(left, y0 + top, w, foot - top, C.shutter);
    for (let y = top + 2; y < foot; y += 5) g.rect(left, y0 + y, w, 1, C.shutterDk);
    g.rect(left, y0 + top, 1, foot - top, C.shutterLt);
    return;
  }
  g.rect(left, y0 + top, w, foot - top, C.sky);
  g.rect(left, y0 + top, w, 3, C.skyLt);
  // a few stars between the rails (a slow twinkle; the planet doesn't)
  for (let k = 0; k < 6; k++) {
    const sxk = left + 1 + Math.floor(h01(k, Math.floor(az), 7703) * (w - 2));
    const syk = y0 + top + 2 + Math.floor(h01(k, Math.floor(az), 7704) * (foot - top - 4));
    const tw = 0.55 + 0.45 * Math.sin(env.t * 0.004 + k * 1.7);
    g.rect(sxk, syk, 1, 1, k === 0 ? C.star : C.starDim, k === 0 ? 1 : tw);
  }
}

registerProp('prop_dome_shell', () => {
  const get = () => (shellCache ??= buildShell(getMapDef('map_hoshi_dome')?.rows ?? []));
  const a: PropArt = {
    ox: 0,
    oy: -TOP,
    get w() {
      return get().W;
    },
    get h() {
      return get().H;
    },
    foot: 0,
    flat: true,
    img: () => get().img,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      drawSlit(g, x, y - TOP, env);
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      // the starlight through the open slit: a cool narrow band from under the slit across the floor
      if (!(env.flag('flag_dome_slit') > 0)) return;
      const sx = slitX(domeAz(env.flag));
      const ctx = g.ctx;
      const prev = ctx.globalAlpha;
      ctx.globalAlpha = 0.5;
      ctx.fillStyle = 'rgb(120,128,190)';
      ctx.beginPath();
      const fx = 96 + (96 - sx) * 0.5;
      ctx.moveTo(x + sx - 5, y + 4);
      ctx.lineTo(x + sx + 5, y + 4);
      ctx.lineTo(x + fx + 12, y + 132);
      ctx.lineTo(x + fx - 12, y + 132);
      ctx.closePath();
      ctx.fill();
      ctx.globalAlpha = prev;
    },
  } as PropArt;
  return a;
});

// ---------------------------------------------------------------- the telescope

/** The tube's direction on the screen for a star at (az, alt): x right, y down (an oblique view from the south). */
export function tubeDir(az: number, alt: number): [number, number] {
  const A = (az * Math.PI) / 180;
  const h = (alt * Math.PI) / 180;
  const dx = Math.cos(h) * Math.sin(A);
  const dy = -Math.sin(h) - Math.cos(h) * Math.cos(A) * 0.5;
  return [dx, dy];
}

/** Where the telescope points per aim (flag_dome_aim): 0 parked (low to the north-west, under its cover), 1 金星, 2 オリオン座の 星雲, 3 すばる. */
export const AIM_ALTAZ: [number, number][] = [
  [300, 25],
  [84, 28],
  [135, 38],
  [149, 77],
];

const SCOPE = { W: 112, H: 104, cx: 56, foot: 98 };
const scopeCache = new Map<string, HTMLCanvasElement>();

/** A thick segment shaded like a cylinder lit from the upper left. */
function tube(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, r: number, cols: [string, string, string, string]): void {
  const vx = x1 - x0;
  const vy = y1 - y0;
  const L2 = vx * vx + vy * vy || 1;
  const L = Math.sqrt(L2);
  // the normal pointing up-left (the lit side)
  let nx = -vy / L;
  let ny = vx / L;
  if (nx + ny > 0) {
    nx = -nx;
    ny = -ny;
  }
  const minX = Math.floor(Math.min(x0, x1) - r - 1);
  const maxX = Math.ceil(Math.max(x0, x1) + r + 1);
  const minY = Math.floor(Math.min(y0, y1) - r - 1);
  const maxY = Math.ceil(Math.max(y0, y1) + r + 1);
  for (let y = minY; y <= maxY; y++)
    for (let x = minX; x <= maxX; x++) {
      const t = ((x + 0.5 - x0) * vx + (y + 0.5 - y0) * vy) / L2;
      if (t < 0 || t > 1) continue;
      const d = (x + 0.5 - x0) * nx + (y + 0.5 - y0) * ny;
      if (Math.abs(d) > r) continue;
      const k = d / r; // +1 on the lit side
      p.set(x, y, k > 0.45 ? cols[0] : k > -0.15 ? cols[1] : k > -0.65 ? cols[2] : cols[3]);
    }
}

/** The end of a tube seen at an angle: an ellipse face across it. */
function tubeEnd(p: PixelCanvas, x: number, y: number, dx: number, dy: number, r: number, face: string, rim: string, glint?: string): void {
  const L = Math.hypot(dx, dy) || 1;
  const ux = dx / L;
  const uy = dy / L;
  // the face is a squashed disc across the tube's axis
  for (let j = -r - 1; j <= r + 1; j++)
    for (let i = -r - 1; i <= r + 1; i++) {
      const a = i * -uy + j * ux; // across
      const b = i * ux + j * uy; // along
      const e = (a / (r + 0.4)) ** 2 + (b / (r * 0.45 + 0.6)) ** 2;
      if (e > 1) continue;
      p.set(x + i, y + j, e > 0.62 ? rim : face);
    }
  if (glint) p.set(x - 1, y - 1, glint);
}

function scopeImg(variant: 'cover' | 'cap' | 'open', aim: number): HTMLCanvasElement {
  const key = `${variant}:${aim}`;
  const hit = scopeCache.get(key);
  if (hit) return hit;
  const p = new PixelCanvas(SCOPE.W, SCOPE.H);
  const cx = SCOPE.cx;
  const foot = SCOPE.foot;
  // ---- the pier: a concrete column, its round top, a little wider at the floor
  const pTop = foot - 26;
  for (let y = pTop; y <= foot; y++) {
    const half = y > foot - 4 ? 10 : 8;
    for (let x = cx - half; x <= cx + half; x++) {
      const u = (x - (cx - half)) / (half * 2);
      let c: string = u < 0.25 ? P.concreteLt : u < 0.6 ? P.concrete : u < 0.85 ? P.steel : P.asphalt;
      if (y === foot - 4) c = P.steel;
      if (h01(x, y, 7711) < 0.04) c = P.steel;
      p.set(x, y, c);
    }
  }
  p.ellipse(cx, pTop, 8, 3, P.concreteLt);
  p.hline(cx - 6, cx + 6, pTop - 2, P.white);
  // ---- the mount's head: the RA housing tilted up to the pole (north = up the screen)
  const hx = cx;
  const hy = pTop - 4;
  p.rect(hx - 5, hy - 2, 10, 6, C.metal);
  p.hline(hx - 5, hx + 4, hy - 2, C.metalLt);
  tube(p, hx, hy, hx - 1, hy - 13, 3.2, [C.tubeLt, C.tube, C.tubeDk, C.tubeSh]);
  // the slow-motion cables (flex handles) hanging, a knob each
  p.line(hx + 4, hy + 1, hx + 9, hy + 12, C.metalDk);
  p.rect(hx + 8, hy + 12, 3, 3, C.metalLt);
  p.line(hx - 4, hy + 1, hx - 7, hy + 13, C.metalDk);
  p.rect(hx - 8, hy + 13, 3, 3, C.metalLt);
  // ---- the counterweight shaft and its two weights (down and away from the tube)
  const [adx, ady] = tubeDir(AIM_ALTAZ[aim][0], AIM_ALTAZ[aim][1]);
  const L = Math.hypot(adx, ady) || 1;
  const ux = adx / L;
  const uy = ady / L;
  // the dec axis comes off the head's top; the tube rides on its far end, the weights on the near one
  const dx0 = hx - 1;
  const dy0 = hy - 12;
  const wx = dx0 + Math.round(-uy * -10 - ux * 4);
  const wy = dy0 + Math.round(ux * -10 * -1 + 8);
  p.line(dx0, dy0, wx, wy + 6, C.metalDk);
  p.rect(wx - 3, wy + 2, 7, 5, C.metalDk);
  p.hline(wx - 3, wx + 3, wy + 2, C.metal);
  p.rect(wx - 3, wy + 8, 7, 4, C.metalDk);
  p.hline(wx - 3, wx + 3, wy + 8, C.metal);
  // ---- the tube: 0.62 of its length ahead of the saddle, the rest behind it
  const len = 50 * Math.max(0.55, L);
  const sx = dx0;
  const sy = dy0 - 3;
  const fx = Math.round(sx + ux * len * 0.62);
  const fy = Math.round(sy + uy * len * 0.62);
  const bx = Math.round(sx - ux * len * 0.38);
  const by = Math.round(sy - uy * len * 0.38);
  if (variant === 'cover') {
    // a canvas cover over all of it: the tube's shape fattened, its folds hanging, dust on top
    tube(p, bx, by, fx, fy, 6, [C.clothLt, C.cloth, C.clothDk, C.clothSh]);
    // the skirt hanging down round the mount
    for (let k = -1; k <= 1; k++) p.line(sx + k * 5, sy + 2, sx + k * 7, sy + 13, C.clothDk);
    p.poly(
      [
        [sx - 8, sy + 2],
        [sx + 8, sy + 2],
        [sx + 10, sy + 14],
        [sx - 10, sy + 14],
      ],
      C.cloth,
    );
    for (let k = -2; k <= 2; k++) p.line(sx + k * 4, sy + 3, sx + k * 5, sy + 14, k % 2 ? C.clothDk : C.clothLt);
    // the dust: white specks on the top side
    for (let i = 0; i < 40; i++) {
      const t = h01(i, 3, 7712);
      const x = Math.round(bx + (fx - bx) * t + (h01(i, 4, 7712) - 0.5) * 6);
      const y = Math.round(by + (fy - by) * t - 2 - h01(i, 5, 7712) * 4);
      if (p.alpha(x, y)) p.set(x, y, C.dust);
    }
  } else {
    // the white tube, its dew shield a step wider at the objective end, a black band at the focuser
    tube(p, bx, by, fx, fy, 4, [C.tubeLt, C.tube, C.tubeDk, C.tubeSh]);
    const hx2 = Math.round(sx + ux * len * 0.42);
    const hy2 = Math.round(sy + uy * len * 0.42);
    tube(p, hx2, hy2, fx, fy, 4.8, [C.tubeLt, C.tube, C.tubeDk, C.tubeSh]);
    // the rings holding it to the saddle
    for (const t of [-0.06, 0.16]) {
      const rx = Math.round(sx + ux * len * t);
      const ry = Math.round(sy + uy * len * t);
      tube(p, rx - ux, ry - uy, rx + ux, ry + uy, 5, [C.metalLt, C.metal, C.metalDk, C.metalDk]);
    }
    // the finder on top (a little tube beside it, up-left)
    const fdx = Math.round(-uy * -4);
    const fdy = Math.round(ux * -4 - 3);
    tube(p, sx + fdx, sy + fdy, sx + fdx + Math.round(ux * 16), sy + fdy + Math.round(uy * 16), 1.6, [C.tubeLt, C.tube, C.tubeDk, C.tubeSh]);
    // the focuser and the eyepiece at the back end, the focus knob
    tube(p, bx, by, Math.round(bx - ux * 6), Math.round(by - uy * 6), 2.2, [C.metalLt, C.metal, C.metalDk, C.metalDk]);
    p.rect(Math.round(bx - ux * 3) + 3, Math.round(by - uy * 3) - 1, 2, 2, C.metalLt);
    // the objective end: the cap, or the lens
    if (variant === 'cap') tubeEnd(p, fx, fy, ux, uy, 5, C.cap, C.capLt);
    else tubeEnd(p, fx, fy, ux, uy, 5, C.glass, C.metalDk, C.glassLt);
  }
  outline(p, { bottom: true, soft: true });
  const c = p.toCanvas();
  scopeCache.set(key, c);
  return c;
}

registerProp('prop_dome_scope', () => {
  // anchor (5,4): the pier's centre at the anchor's left edge + 16, its foot at the bottom of row 5
  const ox = 16 - SCOPE.cx;
  const oy = 32 - SCOPE.foot;
  return {
    ox,
    oy,
    w: SCOPE.W,
    h: SCOPE.H,
    foot: 31,
    contact: 22,
    contactX: 16,
    img: (env: PropEnv) => {
      const variant = env.flag('flag_dome_cover') ? (env.flag('flag_dome_cap') ? 'open' : 'cap') : 'cover';
      const aim = Math.max(0, Math.min(3, env.flag('flag_dome_aim')));
      return scopeImg(variant, variant === 'cover' ? 0 : aim);
    },
    xray: 0.35,
  } as PropArt;
});

/** QA: the telescope's pictures (cover, cap, open × the four aims) side by side. */
export function scopeSheet(scale = 2): HTMLCanvasElement {
  const imgs = [scopeImg('cover', 0), scopeImg('cap', 0), scopeImg('cap', 1), scopeImg('open', 1), scopeImg('open', 2), scopeImg('open', 3)];
  const c = document.createElement('canvas');
  c.width = imgs.length * SCOPE.W * scale;
  c.height = SCOPE.H * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#5E6A6C';
  ctx.fillRect(0, 0, c.width, c.height);
  imgs.forEach((im, i) => ctx.drawImage(im, i * SCOPE.W * scale, 0, SCOPE.W * scale, SCOPE.H * scale));
  return c;
}

// ---------------------------------------------------------------- the furniture

/** 机 (9–10,2): the open record book, the planisphere, the desk lamp with red cellophane, a pencil cup. */
registerProp('prop_dome_desk', () =>
  standProp(
    34,
    30,
    (p) => {
      // the top and the front
      p.rect(1, 8, 32, 6, P.woodLt);
      p.hline(1, 32, 8, '#DCC08A');
      p.rect(1, 14, 32, 11, P.wood);
      p.hline(1, 32, 14, P.woodDark);
      p.rect(14, 17, 8, 4, P.woodDark);
      p.set(18, 18, P.brass);
      // legs
      p.rect(2, 25, 3, 5, P.woodDark);
      p.rect(29, 25, 3, 5, P.woodDark);
      // the open notebook (the record of the star parties), its lines and a red hanamaru
      p.rect(4, 6, 13, 6, P.paper);
      p.vline(10, 6, 11, P.paperGrid);
      for (let k = 0; k < 2; k++) {
        p.hline(5, 9, 7 + k * 2, P.asphalt);
        p.hline(11, 15, 7 + k * 2, P.asphalt);
      }
      p.set(14, 10, P.verm);
      p.set(15, 10, P.verm);
      // the planisphere (a cream disc in its dark holder)
      p.ellipse(23, 9, 5, 3, P.navy);
      p.ellipse(23, 9, 4, 2, P.goldPale);
      p.set(22, 9, P.navy);
      p.set(24, 8, P.navy);
      // the lamp: its stem, its shade with a red cellophane, off
      p.vline(30, 1, 8, C.metalDk);
      p.rect(27, 0, 6, 3, C.metal);
      p.hline(27, 32, 3, '#C8443A');
      // a pencil in a cup
      p.rect(18, 4, 3, 4, P.steel);
      p.vline(19, 1, 4, P.gold);
    },
    { cx: 16, base: 16, foot: 15, shadow: 0 },
  ),
);

/** 段ボール箱 (2,7): 『観望会用 赤い ライト』, flashlights with red cellophane over their heads. */
registerProp('prop_dome_lightbox', () =>
  standProp(
    18,
    16,
    (p) => {
      p.rect(1, 6, 16, 10, P.woodLt);
      p.hline(1, 16, 6, '#DCC08A');
      p.rect(1, 6, 1, 10, '#DCC08A');
      p.rect(13, 7, 4, 9, '#A88050');
      // the open flaps
      p.poly(
        [
          [1, 6],
          [5, 2],
          [8, 2],
          [5, 6],
        ],
        '#D8B880',
      );
      p.poly(
        [
          [12, 6],
          [15, 3],
          [17, 4],
          [16, 6],
        ],
        '#B89060',
      );
      // the label
      p.rect(4, 9, 8, 4, P.paper);
      p.hline(5, 10, 10, P.verm);
      p.hline(5, 9, 12, P.ink);
      // flashlights sticking out, red heads
      for (const [x, y] of [
        [5, 3],
        [8, 4],
        [11, 3],
      ] as [number, number][]) {
        p.vline(x, y + 1, 6, C.metal);
        p.rect(x - 1, y, 3, 2, '#C8443A');
        p.set(x, y, '#FF8A70');
      }
    },
    { cx: 8, base: 16, foot: 15, shadow: 0 },
  ),
);

/** パイプいす (9–10,7): four folded chairs leaning, the child's wooden step at their foot. */
registerProp('prop_dome_chairs', () =>
  standProp(
    34,
    30,
    (p) => {
      // the chairs: steel frames, navy seats, folded flat and leaning on each other
      for (let i = 0; i < 4; i++) {
        const x = 4 + i * 6;
        p.line(x, 4 + i, x + 6, 24, C.metalLt);
        p.line(x + 2, 4 + i, x + 8, 24, C.metal);
        p.rect(x + 1, 8 + i, 6, 9, P.navy);
        p.hline(x + 1, x + 6, 8 + i, '#4A6AB0');
        p.rect(x + 2, 3 + i, 4, 2, P.navy);
      }
      // the step: a low wooden box, the name written and crossed out, another word under it
      p.rect(6, 22, 20, 8, P.woodLt);
      p.hline(6, 25, 22, '#DCC08A');
      p.rect(6, 27, 20, 3, P.wood);
      p.hline(9, 15, 24, P.ink);
      p.hline(8, 16, 24, P.ink);
      p.line(8, 25, 16, 23, P.verm);
      p.hline(18, 23, 25, P.ink);
    },
    { cx: 16, base: 16, foot: 15, shadow: 0 },
  ),
);

