// 大写し「牛の 顔」（第2章 牛舎、events/ch2/ushibana.ts UbPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜の 牛舎（蛍光灯は ついた まま、柱、おがくずの 床）、柵の 向こうの
// 黒毛の 牛の 顔（角は 切って ある、耳に 黄色い 耳標、北4 は 額に 白い 星）、手前の 柵と 飼槽。
// 頭・耳・鼻の 皿は 2D と 同じ 形の 絵を 立てて 押し出し（Kit.stand）、パネルの 2D の 座標に そのまま 重なる
// （顔の 面 z = HEAD_Z で 1 ドット = パネル 1px）。トマトの 灯りは ほんとうの 光（暖かい 点の 光）が lx・ly に。
// 目の ひかり・ぬれた 鼻の ひかり・粉・口（反すう）・舌・選ぶ 輪は 2D の まま 上に 重ねる。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { hGroundImg, pix, plate, rectAt } from './_kit_d';

const W = 204;
const H = 112;
const CX = 102;
/** 顔の 面（この 奥行きで 1 ドット = パネル 1px）。 */
const HEAD_Z = -8;

/** 夜の 牛舎（蛍光灯の 白い 光、上から）。 */
const LIGHT: PanelLight = {
  sun: '#eef2ff',
  sky: '#d8e0f0',
  ground: '#9a8c70',
  fog: '#3a4050',
  sunI: 1.8,
  hemiI: 1.9,
  el: 48,
  az: 330,
};

function oval(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number, c: string): void {
  for (let y = -ry; y <= ry; y++) {
    const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    if (h > 0) p.rect(cx - h, cy + y, h * 2, 1, c);
  }
}

// ---------------------------------------------------------------- 牛の 顔（F1：黒毛和種 × ホルスタイン、黒が 多い）
//
// 2D の 当たりと 同じ 所：目は 頭の 横 (CX ± 26, 36)、鼻鏡の まん中 (CX, 78)、口 (CX, 91–98)。
// 額は 広く、鼻すじへ 細く なる 面長。黒い 短い 毛（つむじから 放射、鼻すじは 下へ）、左上からの 光の つや。
// 耳は 頭の 横から 水平、耳標（黄色）は 耳の 中ほど。鼻鏡は ぬれた 黒〜灰色。

/** 黒い 毛の 色（暗い → つや）。 */
const HAIR = ['#0E0C12', '#16141A', '#1E1C22', '#28262E', '#34323C', '#46444F', '#5C5A68', '#7A788A'];
const hair = (v: number): string => HAIR[Math.max(0, Math.min(HAIR.length - 1, Math.round(v)))];

/** 頭の 半分の 幅（2D の 線と 同じ：y = 0 が 頭の てっぺん〈行 12〉、84 が あご〈行 96〉）。 */
function halfAt(y: number): number {
  // the poll rounded between the ears (the horn buds' bumps at its corners), widest at the eyes' bones,
  // narrowing down the long face to the nose, the muzzle flaring, round at the chin
  if (y < 12) return Math.round(15 + 15 * Math.sqrt(y / 12) + (y > 5 && y < 10 ? 1 : 0));
  if (y < 26) return Math.round(30 + ((y - 12) / 14) * 7);
  if (y < 64) return Math.round(37 - ((y - 26) / 38) * 17);
  if (y < 74) return Math.round(20 + Math.sin(((y - 64) / 10) * Math.PI * 0.5) * 6);
  return Math.max(0, Math.round(26 - Math.pow((y - 74) / 10.5, 2) * 12));
}

const hh = (x: number, y: number, s: number): number => {
  let h = (x * 374761393 + y * 668265263 + s * 2147483647) | 0;
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
};

/** 頭の 毛の 明るさ（0..7）：左上からの 光、ふちは 暗く、額と 鼻すじに つや、目の 上の ふくらみ、ほおの くぼみ。 */
function headTone(x: number, y: number): number {
  const yy = y - 12;
  const half = halfAt(yy);
  const dx = (x - CX + 0.5) / Math.max(1, half);
  const ax = Math.abs(dx);
  let v: number;
  if (yy < 28) {
    // the broad forehead: a lit plane, rolling off to the poll and the sides
    v = 4.6 - Math.abs(dx + 0.15) * 2.6 - (yy < 6 ? (6 - yy) * 0.25 : 0);
  } else {
    // the long face: the front (bridge) lit, the cheeks turning away into the dark
    v = ax < 0.42 ? 4.0 - ax * 1.5 : 3.4 - (ax - 0.42) * 4.2;
  }
  // light from the left
  v += dx < 0 ? 0.45 : -0.45;
  // the rim on the left edge (the tubes behind and to the left)
  if (dx < -0.88) v += 1.8;
  // the brows over the eyes: a ridge catching the light, the hollow under it
  for (const s of [-1, 1]) {
    const ex = CX + s * 26;
    const d = Math.hypot((x - ex) / 9, (y - 31) / 3);
    if (d < 1) v += 1.6 * (1 - d) * (s < 0 ? 1.2 : 0.8);
    const d2 = Math.hypot((x - ex) / 8, (y - 43) / 4);
    if (d2 < 1) v -= 1.4 * (1 - d2);
  }
  // the nasal bridge's sheen: a long line just left of the middle
  if (yy > 28 && yy < 58) v += 1.8 * Math.max(0, 1 - Math.abs(x - (CX - 3)) / 3.5) * (1 - Math.abs(yy - 42) / 17);
  // the chin under the muzzle
  if (yy > 76) v -= 1.0;
  return v;
}

/** 頭（毛の 流れ・つや・巻き毛・目・まゆ）。face：額と 鼻すじの 面だけ（前へ 少し 出して 丸みを 出す 層）。 */
function headImg(kind: number, face = false): HTMLCanvasElement {
  return pix(`ub3:head${kind}:${face}`, W, H, (p) => {
    for (let y = 12; y <= 96; y++) {
      const half = halfAt(y - 12);
      for (let x = CX - half; x < CX + half; x++) {
        const dx = (x - CX + 0.5) / half;
        const v = headTone(x, y) + (hh(x, y, 3) - 0.5) * 0.5;
        p.set(x, y, hair(v));
      }
      {
        // the outline (the rim catches the barn's tubes from behind)
        p.set(CX - half - 1, y, y < 60 ? '#4A4652' : '#3A3640');
        p.set(CX + half, y, '#34303A');
      }
    }
    // hair strokes: from the whorl on the forehead outwards, down the face below it (short 2–3 px strokes)
    const wx = CX - 1;
    const wy = 32;
    for (let y = 14; y < 94; y += 3)
      for (let x = CX - 36; x < CX + 36; x += 3) {
        const jx = x + Math.floor(hh(x, y, 7) * 3);
        const jy = y + Math.floor(hh(x, y, 8) * 3);
        if (!(p.get(jx, jy) >>> 24)) continue;
        let ang: number;
        if (jy < 50) ang = Math.atan2(jy - wy, jx - wx);
        else ang = Math.PI / 2 + ((jx - CX) / 40) * 0.6;
        const v = headTone(jx, jy);
        const c = hh(x, y, 9) < 0.45 ? hair(v + 1.1) : hair(v - 1.0);
        for (let i = 0; i < 3; i++) {
          const sx = Math.round(jx + Math.cos(ang) * i);
          const sy = Math.round(jy + Math.sin(ang) * i);
          if (p.get(sx, sy) >>> 24) p.set(sx, sy, c);
        }
      }
    // the poll's top edge: curls standing up out of the outline
    for (let x = CX - 22; x <= CX + 22; x++) {
      const d = Math.abs(x - CX);
      const yEdge = d <= 15 ? 12 : 12 + Math.ceil(((d - 15) / 15) ** 2 * 12);
      const up = hh(x, 0, 41) < 0.45 ? 1 + Math.floor(hh(x, 1, 41) * 2) : 0;
      for (let i = 1; i <= up; i++) p.set(x, yEdge - i, i === up ? '#3A3842' : '#24222A');
    }
    // the poll's curly tuft between the ears
    for (let i = 0; i < 26; i++) {
      const x = CX - 18 + Math.floor(hh(i, 1, 11) * 36);
      const y = 12 + Math.floor(hh(i, 2, 11) * 7);
      if (!(p.get(x, y + 1) >>> 24)) continue;
      p.set(x, y, '#3A3842');
      p.set(x + 1, y, '#4A4854');
      p.set(x, y + 1, '#1A181E');
      p.set(x + 1, y + 1, '#24222A');
    }
    // the whorl itself
    for (let a = 0; a < 10; a++) p.set(Math.round(wx + Math.cos(a * 0.9) * (1 + a * 0.3)), Math.round(wy + Math.sin(a * 0.9) * (1 + a * 0.3)), '#46444F');
    // F1：the white star on 北4's forehead (uneven, hair at its edge)
    if (kind === 2) {
      for (let y = 22; y < 38; y++)
        for (let x = CX - 8; x < CX + 10; x++) {
          const d = Math.hypot((x - CX - 1) / 7, (y - 29) / 6) + (hh(x, y, 13) - 0.5) * 0.35;
          if (d < 1) p.set(x, y, d > 0.8 ? '#B8B4AC' : (x + y) % 5 === 0 ? '#D0CCC4' : '#E6E2D8');
        }
      for (let y = 37; y < 42; y++) p.set(CX + 1 + (y % 2), y, '#DCD8CE');
    }
    // the eyes on the sides: the bulging eyeball, the lid's line and lashes, a lower lid; the socket's shadow
    for (const s of [-1, 1]) {
      const ex = CX + s * 26;
      oval(p, ex, 37, 7, 5, '#0E0C12');
      oval(p, ex, 36, 6, 4, '#2A1E1E');
      oval(p, ex + s, 36, 4, 3, '#140E10');
      for (let i = -6; i <= 6; i++) p.set(ex + i, 33 - (Math.abs(i) < 4 ? 1 : 0), '#3A3842');
      for (let i = -5; i <= 5; i += 2) p.set(ex + i, 32 - (Math.abs(i) < 4 ? 1 : 0), '#0A080C');
      for (let i = -4; i <= 4; i++) p.set(ex + i, 40, '#3A3640');
      // the white of the eye just showing at the back corner
      p.set(ex + s * 5, 36, '#8A8478');
      p.set(ex + s * 5, 37, '#6A645C');
    }
    // the forward layer keeps only the forehead and the nasal bridge
    if (face)
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const half = halfAt(y - 12);
          const dx = (x - CX + 0.5) / Math.max(1, half);
          if (Math.abs(dx) > 0.6 - Math.max(0, (y - 58) / 70) || y < 17 || y > 72) p.set(x, y, 0);
        }
  });
}

/** 耳（頭の 横から 水平、内側は 白い 毛、耳標は まん中）。 */
function earsImg(): HTMLCanvasElement {
  return pix('ub3:ears', W, H, (p) => {
    for (const s of [-1, 1]) {
      const cx = CX + s * 48;
      // the back of the ear (thick, hairy), the inside (hollow, lighter, white hairs at its rim)
      oval(p, cx, 30, 16, 7, '#16141A');
      oval(p, cx - s, 29, 15, 5, '#24222A');
      for (let i = -14; i <= 14; i++) p.set(cx + i, 26 - (Math.abs(i) > 10 ? -1 : 0), '#3A3844');
      oval(p, cx + s * 2, 30, 10, 3, '#4A3C44');
      oval(p, cx + s * 2, 31, 7, 2, '#5E4C54');
      for (let i = -9; i <= 9; i += 2) p.set(cx + s * 2 + i, 28 + (i % 4 === 0 ? 0 : 1), '#9A949E');
      // the ear tag through the middle of the ear: yellow, its number side to us, a little shadow
      const tx = cx + s * 1 - 3;
      p.rect(tx, 32, 7, 8, '#E8C43A');
      p.rect(tx, 32, 7, 1, '#F8E07A');
      p.rect(tx + 6, 33, 1, 7, '#B8942A');
      p.rect(tx, 39, 7, 1, '#B8942A');
      p.hline(tx + 2, tx + 4, 35, '#6A5418');
      p.hline(tx + 2, tx + 4, 37, '#6A5418');
      p.rect(tx + 2, 30, 3, 2, '#C8A830');
    }
  });
}

/** 鼻鏡（ぬれた 黒〜灰色、細かい 粒、鼻の 穴、まん中の みぞ）と 口の まわり。 */
function muzzleImg(): HTMLCanvasElement {
  return pix('ub3:muzzle', W, H, (p) => {
    for (let y = 66; y <= 90; y++)
      for (let x = CX - 26; x <= CX + 26; x++) {
        const d = Math.hypot((x - CX) / 23, (y - 78) / 11);
        if (d > 1) continue;
        // wet grey-black, lighter on top (it faces up a little), mottled
        const v = 0.55 - (y - 78) / 26 - Math.abs(x - CX - 4) / 70 + (hh(x, y, 21) - 0.5) * 0.25;
        p.set(x, y, v > 0.6 ? '#5E5A66' : v > 0.4 ? '#4A4652' : v > 0.15 ? '#3A3640' : '#2A2630');
        if ((x * 3 + y * 5) % 7 === 0 && d < 0.9) p.set(x, y, '#24202A');
      }
    // the hair meeting the muzzle (fuzzy edge on top)
    for (let x = CX - 22; x <= CX + 22; x++) if (hh(x, 1, 23) < 0.6) p.set(x, 67 + Math.floor(hh(x, 2, 23) * 2), '#1E1C22');
    // the groove down the middle
    p.vline(CX, 70, 89, '#24202A');
    p.vline(CX + 1, 72, 88, '#2C2830');
    // the nostrils: comma shapes, dark inside, a lit rim over them
    for (const s of [-1, 1]) {
      const nx = CX + s * 12;
      oval(p, nx, 80, 6, 4, '#3A3640');
      oval(p, nx, 80, 5, 3, '#0A080C');
      oval(p, nx - s, 81, 3, 2, '#000000');
      p.set(nx + s * 3, 77, '#141218');
      p.set(nx + s * 4, 78, '#141218');
      for (let i = -4; i <= 3; i++) p.set(nx + i * s, 76, '#6E6A78');
    }
    // the upper lip under it, the mouth's line and the chin
    for (let x = CX - 20; x <= CX + 20; x++) p.set(x, 90, '#141218');
    for (let y = 91; y <= 95; y++) {
      const w = 18 - (y - 91) * 2;
      for (let x = CX - w; x <= CX + w; x++) p.set(x, y, hair(1.6 - (y - 91) * 0.25 + (hh(x, y, 25) - 0.5)));
    }
  });
}

/** 牛舎の 奥の 壁（波板、腰の コンクリート）。 */
function wallImg(): HTMLCanvasElement {
  return pix('ub2:wall', 64, 48, (p) => {
    p.fill('#5A6070');
    for (let x = 0; x < 64; x += 4) {
      p.vline(x, 0, 33, '#646A7A');
      p.vline(x + 1, 0, 33, '#525868');
    }
    p.rect(0, 34, 64, 14, '#6E6E70');
    p.hline(0, 63, 34, '#8A8A8C');
    for (let x = 3; x < 64; x += 13) p.set(x, 40 + (x % 5), '#5E5E60');
  });
}
function tubeImg(): HTMLCanvasElement {
  return pix('ub2:tube', 8, 2, (p) => {
    p.fill('#F4F8FF');
    p.hline(0, 7, 1, '#C8D0DA');
  });
}
function pipeImg(): HTMLCanvasElement {
  return pix('ub2:pipe', 4, 8, (p) => {
    p.fill('#8A909A');
    p.vline(0, 0, 7, '#B8BEC8');
    p.vline(3, 0, 7, '#5A606A');
  });
}
function troughImg(): HTMLCanvasElement {
  return pix('ub2:trough', 16, 8, (p) => {
    p.fill('#6A6A70');
    p.hline(0, 15, 0, '#9A9AA0');
    p.hline(0, 15, 7, '#4A4A50');
    for (let x = 2; x < 16; x += 5) p.set(x, 4, '#5A5A60');
  });
}

function buildBarn(k: Kit): void {
  // the back wall and the floor of sawdust (the floor's far edge at row 50 of the panel, as in 2D)
  const zb = -60;
  const floor = k.atDepth(0, 50, zb)!.y;
  const r = rectAt(k, -20, -10, W + 20, 50, zb);
  k.box(r.x0, r.x0 + r.w, floor, r.y0 + r.h, zb - 0.2, zb, {
    front: wallImg(),
  });
  // (far enough that the floor passes under the chin: the head stands over it)
  k.tiled(hGroundImg('h_sawdust', 64, 64), r.x0, r.x0 + r.w, zb, -5.5, floor, 10, { tint: '#b4a282' });
  // the tubes along the ceiling (on all night)
  for (const [z, n] of [
    [-58, 4],
    [-36, 3],
  ] as const) {
    const y = k.atDepth(0, 2.5, z)!.y;
    for (let i = 0; i < n; i++) {
      const a = k.atDepth(10 + (i * (W - 20)) / Math.max(1, n - 1) - 16, 2, z)!;
      const b = k.atDepth(10 + (i * (W - 20)) / Math.max(1, n - 1) + 16, 2, z)!;
      const m = k.stand(tubeImg(), new THREE.Vector3((a.x + b.x) / 2, y, z), {
        px: (b.x - a.x) / 8,
        depth: 2,
        emissive: 1.4,
        cast: false,
        unlit: true,
      });
      m.scale.y = k.pxAt(-z) * 1.6;
    }
  }
  // the pen's pipe posts in front of the wall (2D：every 36 px)
  for (let x = 10; x < W; x += 36) {
    const at = k.atDepth(x, 51, -44)!;
    at.y = floor;
    const top = k.atDepth(x, 6, -44)!.y;
    const w = k.pxAt(44) * 2;
    k.box(at.x - w / 2, at.x + w / 2, floor, top, -44.2, -43.8, {
      front: pipeImg(),
      left: pipeImg(),
      right: pipeImg(),
    });
  }
  const ra = k.atDepth(-10, 26, -44)!;
  const rb = k.atDepth(W + 10, 28, -44)!;
  const rw = k.pxAt(44) * 1.6;
  k.box(ra.x, rb.x, ra.y - rw, ra.y, -44.3, -43.9, {
    front: pipeImg(),
    top: pipeImg(),
  });
}

function buildHead(k: Kit, kind: number): void {
  const z = HEAD_Z;
  const px = k.pxAt(-z);
  const foot = (zz: number) => k.atDepth(CX, H, zz)!;
  const at = (zz: number, img: HTMLCanvasElement, depth: number) => k.stand(img, foot(zz), { px: k.pxAt(-zz), depth });
  at(z - 0.45, earsImg(), 5);
  at(z, headImg(kind), 18);
  // the forehead and the nasal bridge a little forward (the head's roundness), the muzzle forward of it
  at(z + 0.12, headImg(kind, true), 4);
  at(z + 0.28, muzzleImg(), 8);
  // the neck going back into the pen, through the headlock (連動スタンチョン)
  const neck = pix('ub3:neck', 8, 8, (p) => {
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) p.set(x, y, hair(1 + hh(x, y, 31) * 1.4));
  });
  const n = k.atDepth(CX, 66, z - 0.6)!;
  const nb = k.atDepth(CX, H + 10, z - 0.6)!;
  const hw = px * 24;
  k.box(n.x - hw, n.x + hw, nb.y, n.y, z - 3.5, z - 0.6, { front: neck, left: neck, right: neck, top: neck });
  // the headlock: pairs of upright pipes either side of each neck, a top bar and the bottom rail over the trough
  const sz = z - 1.0;
  const pipe = pix('ub3:stan', 4, 8, (p) => {
    p.fill('#8A929E');
    p.vline(0, 0, 7, '#C8D0DA');
    p.vline(3, 0, 7, '#5A606C');
  });
  const pw = k.pxAt(-sz) * 2.4;
  const top = k.atDepth(0, 2, sz)!.y;
  const bot = k.atDepth(0, 104, sz)!.y;
  for (const x of [CX - 33, CX + 33, CX - 92, CX + 92, CX - 120, CX + 120]) {
    const a = k.atDepth(x, 50, sz)!;
    k.box(a.x - pw / 2, a.x + pw / 2, bot, top, sz - pw, sz, { front: pipe, left: pipe, right: pipe });
  }
  const l = k.atDepth(-20, 0, sz)!.x;
  const r = k.atDepth(W + 20, 0, sz)!.x;
  k.box(l, r, top - pw, top, sz - pw, sz, { front: pipe, top: pipe });
}

function buildRail(k: Kit): void {
  // the rail in front (2D：rows 100–103) and the trough's edge (rows 106–112)
  const zr = -6;
  const a = k.atDepth(-10, 103, zr)!;
  const b = k.atDepth(W + 10, 100, zr)!;
  k.box(a.x, b.x, a.y, b.y, zr - 0.12, zr, {
    front: pipeImg(),
    top: pipeImg(),
  });
  const zt = -5.4;
  const c = k.atDepth(-10, H + 2, zt)!;
  const d = k.atDepth(W + 10, 106, zt)!;
  k.box(c.x, d.x, c.y, d.y, zt - 0.5, zt, {
    front: troughImg(),
    top: troughImg(),
  });
}

registerPanel3d('ushibana', {
  cam: { fov: 24, pitch: 3, pos: [0, 0, 0], far: 200, near: 0.2 },
  light: LIGHT,
  fog: [70, 220],
  shadow: { x: 0, z: -10, hw: 8, hd: 10 },
  focus: 0.55,
  tilt: 0.25,
  grade: () => null,
  build(k, s) {
    buildBarn(k);
    buildHead(k, Number(s.kind) || 0);
    buildRail(k);
    // the tomato's light (moved in update: where it is aimed)
    const lamp = new THREE.PointLight('#ffb070', 2.4, 4.5, 1.6);
    k.scene.add(lamp);
    k.bag.lamp = lamp;
  },
  update(k, _t, s) {
    const lamp = k.bag.lamp as THREE.PointLight;
    const at = k.atDepth(Number(s.lx), Number(s.ly), HEAD_Z + 1.6);
    if (at) lamp.position.copy(at);
  },
});
