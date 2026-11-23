// 大写し「網の 目」（第3章 網小屋、events/ch3/amigoya.ts AmiPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：網小屋の 板壁の 前に 下がる 古い 網（同じ 大きさの 菱形の 目）、つくろう 破れ
// （1列の 穴と 切れた 糸の はし。2つめは 底の 岩で 上へ 裂けた すじ、3つめは ふちに 魚の 骨）。
// 3D：板壁（木の 板、すきまの 暗い 線）と、壁から 少し 離れて 下がる 網（2D と 同じ 線を 1枚の 絵に して 板に 貼る。
// 窓からの 昼の 光で 網の 影が 板壁に 落ちる）。新しい 目・目板・網針・はさみ・←→ は 2D の まま（目の 位置は
// 同じ px）。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { pix, plate, rectAt } from './_kit_d';

const W = 222;
const H = 112;
const HALF = 12;
const NET_Z = -4;
const WALL_Z = -5.1;
const ITO = '#8AAE8E';
const ITO_DK = '#5A7A62';

/** 網小屋の 中（窓からの 昼の 光：左上から、少し 暖かい）。 */
const LIGHT: PanelLight = { sun: '#fff2dc', sky: '#e8e0d0', ground: '#6a5040', fog: '#3a2a20', sunI: 2.8, hemiI: 2.0, el: 34, az: 235 };

/** 板壁（2D の 色：#4A3628、14 px ごとの 継ぎ目）。 */
function wallImg(): HTMLCanvasElement {
  return pix('ag:wall', 56, 64, (p) => {
    for (let x = 0; x < 56; x++)
      for (let y = 0; y < 64; y++) {
        const plank = Math.floor(x / 14);
        const n = Math.sin(y * 0.7 + plank * 3.1 + Math.sin(x * 0.9) * 0.6);
        p.set(x, y, x % 14 === 0 ? '#3A2A20' : n > 0.75 ? '#56402F' : n < -0.8 ? '#423024' : '#4A3628');
      }
    for (let pl = 0; pl < 4; pl++) {
      p.set(pl * 14 + 3, 10 + pl * 13, '#2A1E16');
      p.set(pl * 14 + 10, 40 + pl * 5, '#2A1E16');
    }
  });
}

/** 網の 糸 1本（よった 糸：太さ th、下側が 暗く、よりの 明るい 点、結び目は 太く）。 */
function twineLine(p: PixelCanvas, x0: number, y0: number, x1: number, y1: number, th: number, c: [string, string, string]): void {
  const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
  for (let i = 0; i <= n; i++) {
    const x = Math.round(x0 + ((x1 - x0) * i) / n);
    const y = Math.round(y0 + ((y1 - y0) * i) / n);
    for (let t = 0; t < th; t++) p.set(x, y + t, t === th - 1 && th > 1 ? c[1] : (i + t) % 3 === 0 ? c[2] : c[0]);
  }
}

/** 菱形の 網（目の 大きさ D、ずれ ox・oy、糸の 太さ th、色）を w × h に。 */
function paintNet(p: PixelCanvas, w: number, h: number, ox: number, oy: number, th: number, c: [string, string, string]): void {
  const D = HALF * 2;
  for (let cc = -h - D * 2; cc < w + h + D; cc += D) {
    const bx = cc + (ox % D) + HALF;
    const by = -2 + (oy % D);
    twineLine(p, bx, by, bx + h + 4, by + h + 4, th, c);
    twineLine(p, bx, by, bx - h - 4, by + h + 4, th, c);
  }
  // the knots where they cross
  for (let cc = -h - D * 2; cc < w + h + D; cc += D)
    for (let r = -2; r < h + D; r += D) {
      const x = cc + (ox % D) + HALF;
      const y = r + (oy % D) + HALF;
      if (p.get(x, y) >>> 24) p.rect(x - 1, y - 1, th + 1, th + 1, c[1]);
    }
}

/** 古い 網の 絵（パネルと 同じ 大きさ・同じ 線）：穴（その 列は 糸が ない）、切れた はし、裂け目、魚の 骨。 */
function netImg(k: number, n: number, c0: [number, number]): HTMLCanvasElement {
  return pix(`ag:net2:${k}:${n}:${c0.join(',')}`, W, H, (p) => {
    const D = HALF * 2;
    const [c0x, c0y] = c0;
    paintNet(p, W, H, c0x, c0y, 2, [ITO, ITO_DK, '#A8C8A8']);
    // the hole: one row with no twine, the rim's broken ends (frayed)
    const hx0 = c0x - HALF - 2;
    const hx1 = c0x + (n - 1) * D + HALF + 2;
    const clear = (x0: number, y0: number, w: number, h: number) => {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) p.set(x, y, 0);
    };
    clear(hx0, c0y - HALF - 2, hx1 - hx0, HALF * 2 + 4);
    for (let i = 0; i <= n; i++) {
      const x = c0x - HALF + i * D;
      twineLine(p, x - 3, c0y - HALF - 4, x - 1, c0y - HALF + 1, 2, [ITO, ITO_DK, '#A8C8A8']);
      twineLine(p, x + 3, c0y + HALF + 3, x + 1, c0y + HALF - 1, 2, [ITO, ITO_DK, '#A8C8A8']);
      p.set(x - 1, c0y - HALF + 2, '#C8E0C0');
      p.set(x + 1, c0y + HALF - 2, '#C8E0C0');
    }
    if (k === 1) {
      const tx = c0x + HALF - 3;
      clear(tx, 0, 6, c0y - HALF - 2);
      twineLine(p, tx - 2, 10, tx, 14, 2, [ITO, ITO_DK, '#A8C8A8']);
      twineLine(p, tx + 8, 22, tx + 6, 26, 2, [ITO, ITO_DK, '#A8C8A8']);
    }
    if (k === 2) {
      const bx = hx1 + 8;
      const by = c0y - 6;
      p.rect(bx, by, 14, 1, '#F4F1E8');
      p.rect(bx, by + 1, 14, 1, '#B8B4A8');
      for (let r = 2; r < 14; r += 3) {
        p.rect(bx + r, by - 3, 1, 3, '#E8E4D8');
        p.rect(bx + r, by + 2, 1, 3, '#D8D4C8');
      }
      p.rect(bx + 13, by - 2, 3, 5, '#E8E4D8');
    }
  });
}

/** 奥の 網（板壁に かかった もう 1枚：細く、暗く、半分 ずれた 目）。 */
function backNetImg(): HTMLCanvasElement {
  return pix('ag:backnet', W + 40, H + 40, (p) => paintNet(p, W + 40, H + 40, 12 + 20, 20, 1, ['#3E5040', '#2E3A30', '#4A5E4C']));
}
/** 手前の 網の たるみ（近くて 太い、暗い）。 */
function frontNetImg(): HTMLCanvasElement {
  return pix('ag:frontnet', W + 40, 40, (p) => {
    for (let x = 0; x < W + 40; x++) {
      // the sagging lower edge: a heavy fold of net close to us
      const sag = 14 + Math.round(Math.sin(x / 23) * 4 + Math.sin(x / 9) * 1.5);
      for (let y = sag; y < 40; y++) p.set(x, y, 0);
    }
    const q = new PixelCanvas(W + 40, 40);
    paintNet(q, W + 40, 40, 7, 5, 3, ['#5E7A60', '#34463A', '#7A9A7C']);
    for (let y = 0; y < 40; y++)
      for (let x = 0; x < W + 40; x++) {
        const sag = 12 + Math.round(Math.sin(x / 23) * 4 + Math.sin(x / 9) * 1.5);
        if (y >= sag && q.get(x, y) >>> 24) p.set(x, y, q.get(x, y));
      }
    // the fold's rolled top edge (twine bunched)
    for (let x = 0; x < W + 40; x++) {
      const sag = 12 + Math.round(Math.sin(x / 23) * 4 + Math.sin(x / 9) * 1.5);
      p.set(x, sag, x % 3 ? '#5E7A60' : '#7A9A7C');
      p.set(x, sag + 1, '#34463A');
    }
  });
}

registerPanel3d('amigoya', {
  cam: { fov: 26, pitch: 0, pos: [0, 0, 0], far: 60, near: 0.1 },
  light: LIGHT,
  fog: null,
  shadow: { x: 0, z: -4.6, hw: 3, hd: 3 },
  focus: 0.41,
  tilt: 1.2,
  grade: () => null,
  build(k, s) {
    // the board wall behind
    const r = rectAt(k, -20, -20, W + 20, H + 20, WALL_Z);
    k.box(r.x0, r.x0 + r.w, r.y0, r.y0 + r.h, WALL_Z - 0.2, WALL_Z, { front: wallImg() });
    // the old net hanging a little off it (1 px of the panel = 1 dot at NET_Z), its shadow on the boards
    const n = rectAt(k, 0, 0, W, H, NET_Z);
    const net = plate(k, netImg(Number(s.k), Number(s.n), s.c0 as [number, number]), n.x0, n.y0, n.w, n.h, NET_Z, {});
    const m = net.material as THREE.MeshLambertMaterial;
    m.side = THREE.DoubleSide;
    m.alphaTest = 0.5;
    net.castShadow = true;
    net.receiveShadow = false;
    // another net hanging on the boards behind (thin, dark, out of the light)
    const bz = WALL_Z + 0.2;
    const br = rectAt(k, -20, -20, W + 20, H + 20, bz);
    const back = plate(k, backNetImg(), br.x0, br.y0, br.w, br.h, bz, {});
    (back.material as THREE.MeshLambertMaterial).side = THREE.DoubleSide;
    back.receiveShadow = true;
    // the fold of net sagging close in front, at the bottom (big, dark, out of focus)
    const fz = NET_Z + 1.4;
    const fr = rectAt(k, -20, H - 30, W + 20, H + 10, fz);
    const front = plate(k, frontNetImg(), fr.x0, fr.y0, fr.w, fr.h, fz, {});
    (front.material as THREE.MeshLambertMaterial).side = THREE.DoubleSide;
    front.castShadow = true;
  },
});
