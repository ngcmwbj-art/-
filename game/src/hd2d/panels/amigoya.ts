// 大写し「網の 目」（第3章 網小屋、events/ch3/amigoya.ts AmiPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：網小屋の 板壁の 前に 下がる 古い 網（同じ 大きさの 菱形の 目）、つくろう 破れ
// （1列の 穴と 切れた 糸の はし。2つめは 底の 岩で 上へ 裂けた すじ、3つめは ふちに 魚の 骨）。
// 3D：板壁（木の 板、すきまの 暗い 線）と、壁から 少し 離れて 下がる 網（2D と 同じ 線を 1枚の 絵に して 板に 貼る。
// 窓からの 昼の 光で 網の 影が 板壁に 落ちる）。新しい 目・目板・網針・はさみ・←→ は 2D の まま（目の 位置は
// 同じ px）。

import * as THREE from 'three';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { pix, plate, rectAt } from './_kit_d';

const W = 222;
const H = 112;
const HALF = 12;
const NET_Z = -4;
const WALL_Z = -4.7;
const ITO = '#7A9A7E';
const ITO_DK = '#5A7A62';

/** 網小屋の 中（窓からの 昼の 光：左上から、少し 暖かい）。 */
const LIGHT: PanelLight = { sun: '#fff2dc', sky: '#e8e0d0', ground: '#6a5040', fog: '#3a2a20', sunI: 2.0, hemiI: 1.5, el: 38, az: 230 };

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

/** 古い 網の 絵（パネルと 同じ 大きさ・同じ 線）：穴（その 列は 糸が ない）、切れた はし、裂け目、魚の 骨。 */
function netImg(k: number, n: number, c0: [number, number]): HTMLCanvasElement {
  return pix(`ag:net:${k}:${n}:${c0.join(',')}`, W, H, (p) => {
    const D = HALF * 2;
    const [c0x, c0y] = c0;
    for (let c = -H - D * 2; c < W + H + D; c += D) {
      const bx = c + (c0x % D) + HALF;
      const by = -2 + (c0y % D);
      p.line(bx, by, bx + H + 4, by + H + 4, ITO);
      p.line(bx, by, bx - H - 4, by + H + 4, ITO);
    }
    // the hole: one row with no twine, the rim's broken ends
    const hx0 = c0x - HALF - 2;
    const hx1 = c0x + (n - 1) * D + HALF + 2;
    const clear = (x0: number, y0: number, w: number, h: number) => {
      for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) p.set(x, y, 0);
    };
    clear(hx0, c0y - HALF - 2, hx1 - hx0, HALF * 2 + 4);
    for (let i = 0; i <= n; i++) {
      const x = c0x - HALF + i * D;
      p.line(x - 3, c0y - HALF - 4, x - 1, c0y - HALF + 1, ITO_DK);
      p.line(x + 3, c0y + HALF + 4, x + 1, c0y + HALF - 1, ITO_DK);
    }
    if (k === 1) {
      const tx = c0x + HALF - 3;
      clear(tx, 0, 6, c0y - HALF - 2);
      p.line(tx - 2, 10, tx, 14, ITO_DK);
      p.line(tx + 8, 22, tx + 6, 26, ITO_DK);
    }
    if (k === 2) {
      const bx = hx1 + 8;
      const by = c0y - 6;
      p.rect(bx, by, 14, 1, '#F4F1E8');
      for (let r = 2; r < 14; r += 3) {
        p.rect(bx + r, by - 3, 1, 3, '#E8E4D8');
        p.rect(bx + r, by + 1, 1, 3, '#E8E4D8');
      }
    }
    // knots where the twines cross (a darker dot): the net's texture
    for (let c = -H - D * 2; c < W + H + D; c += D)
      for (let r = -2; r < H + D; r += D) {
        const x = c + (c0x % D) + HALF;
        const y = r + (c0y % D) + HALF;
        if (p.get(x, y) >>> 24) p.set(x, y, ITO_DK);
      }
  });
}

registerPanel3d('amigoya', {
  cam: { fov: 26, pitch: 0, pos: [0, 0, 0], far: 60, near: 0.1 },
  light: LIGHT,
  fog: null,
  shadow: { x: 0, z: -4.4, hw: 3, hd: 3 },
  focus: 0.5,
  tilt: 0.5,
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
  },
});
