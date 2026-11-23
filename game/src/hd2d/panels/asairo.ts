// 大写し「朝の 前の 色」（第2章 星見台の 夜明け前、events/ch2/asairo.ts AsPanel）を HD-2D で。
//
// 見せる 物は 2D の 絵と 同じ：夜明け前の 暗い 空と 星、低い 地面、そばで かかげた トマトの 灯りの
// だいだいの 光。場所ごとの 景色を 後ろに：
//   satoimo  サトイモの 畑（フィールドの サトイモの 株を 並べる）
//   ine      稲の 田（株の 列、水の 面に 灯りが 映る）
//   kumo     火の見やぐらの 2本の 柱（2D の 柱と 同じ 所）、後ろに 村の 家
//   tomato   3号ハウスの 中（トマトの 株の 列と ビニールの 骨）
// 葉・露の 玉・クモの 巣・絵皿・右の 列は 2D の まま 上に 重ねる（asairo.ts）。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { fillWall, KAWARA_IBUSHI, roofKawara, wallBoards } from '../../art/props/bkit';
import { registerPanel3d, type Kit } from '../panel3d';
import { bands, glowAt, hGroundImg, lamp, once, propImg } from './_kit_a';

const W = 206;
const H = 112;
/** 灯りを かかげる 所（2D の 光の 輪の 中心）。 */
const LX = 120;
const LY = 30;

function skyImg(): HTMLCanvasElement {
  return bands('as:sky', [[0, '#0C1020'], [0.4, '#141A30'], [0.72, '#1E2540'], [1, '#2C2C48']], 112, 30, 206);
}

/** 遠くの 山（夜明け前：空より 暗い）。 */
function hillsImg(): HTMLCanvasElement {
  return once('as:hills', () => {
    const w = 260;
    const h = 30;
    const p = new PixelCanvas(w, h);
    for (let x = 0; x < w; x++) {
      const t = Math.round(13 + Math.sin(x / 31) * 7 + Math.sin(x / 11) * 2);
      for (let y = h - 1; y >= h - t; y--) p.set(x, y, y === h - t ? '#262C44' : '#121626');
    }
    return p.toCanvas();
  });
}

/** 稲の 株（細い 葉の 束、穂が 少し たれる）。 */
function riceImg(seed: number): HTMLCanvasElement {
  return once(`as:rice:${seed}`, () => {
    const p = new PixelCanvas(14, 22);
    const rng = new Rng(seed);
    for (let i = 0; i < 9; i++) {
      const x0 = 6 + Math.round((rng.next() - 0.5) * 3);
      const lean = (rng.next() - 0.5) * 0.7;
      const len = 14 + Math.floor(rng.next() * 7);
      for (let j = 0; j < len; j++) {
        const x = Math.round(x0 + lean * j + (j > len - 5 ? lean * 2 : 0));
        p.set(Math.max(0, Math.min(13, x)), 21 - j, j > len - 4 ? '#8ABA5A' : i % 2 ? '#5A8A3A' : '#6A9A3A');
      }
    }
    // 穂（実り はじめ）
    p.rect(9, 3, 2, 5, '#C8B860');
    p.set(10, 8, '#A89848');
    return p.toCanvas();
  });
}

function postImg(): HTMLCanvasElement {
  return once('as:post', () => {
    const p = new PixelCanvas(8, 64);
    p.fill('#5A4A3A');
    p.vline(1, 0, 63, '#7A6A54');
    p.vline(6, 0, 63, '#3A2E24');
    for (let y = 6; y < 64; y += 13) p.hline(0, 7, y, '#4A3C30');
    return p.toCanvas();
  });
}

function houseWall(w: number, lit: boolean): HTMLCanvasElement {
  return once(`as:wall:${w}:${lit}`, () => {
    const p = new PixelCanvas(w, 18);
    fillWall(p, 0, 0, w, 18, wallBoards('#4A3C30', w, 5));
    for (let x = 4; x + 7 < w - 2; x += 13) {
      p.rect(x, 5, 7, 6, '#1A1820');
      if (lit) p.rect(x + 1, 6, 5, 4, '#FFC070');
    }
    return p.toCanvas();
  });
}
function houseRoof(w: number, d: number): HTMLCanvasElement {
  return once(`as:roof:${w}x${d}`, () => {
    const p = new PixelCanvas(w, d);
    roofKawara(p, 0, 0, w, d, KAWARA_IBUSHI, w, 0.45);
    return p.toCanvas();
  });
}

function village(k: Kit, y: number, z: number): void {
  const rng = new Rng(77);
  for (let i = 0; i < 6; i++) {
    const x = -26 + i * 10 + rng.next() * 3;
    const zz = z - rng.next() * 8;
    const lit = i % 2 === 1;
    k.gable({ x0: x, x1: x + 6, z0: zz - 4, z1: zz, y, wallH: 2.2, roofH: 1.3, wall: houseWall(48, lit), side: houseWall(32, false), roof: houseRoof(48, 32) });
    if (lit) lamp(k, new THREE.Vector3(x + 3, y + 1.4, zz + 1), { i: 2.5, dist: 5 });
  }
}

function build(k: Kit, kind: string): void {
  k.sky(skyImg());
  const G = 0;
  const hl = k.atDepth(-30, 84, -160);
  if (hl) k.stand(hillsImg(), hl, { px: k.pxAt(160) * 1.2, depth: 0, unlit: true, cast: false, anchor: 'left' });
  if (kind === 'satoimo') {
    k.tiled(hGroundImg('h_tilled', 64, 64), -60, 60, -60, 2, G, 14);
    const rng = new Rng(31);
    for (let row = 0; row < 5; row++) {
      const z = -15 - row * 5;
      for (let x = -12 - row * 3; x < 12 + row * 3; x += 1.9 + rng.next() * 0.6) {
        const img = propImg('prop_as_satoimo', { v: (row + Math.round(x)) % 3 });
        if (img) k.stand(img, new THREE.Vector3(x + rng.next() * 0.4, G, z), { px: 1 / 16, depth: 6 });
      }
    }
    village(k, G, -62);
  } else if (kind === 'ine') {
    k.tiled(hGroundImg('h_nuta', 64, 64), -60, 60, -60, 2, G, 14);
    k.tiled(hGroundImg('h_aze', 64, 64), -60, 60, -13, -11, G + 0.05, 14);
    for (let row = 0; row < 9; row++) {
      const z = -14 - row * 3;
      for (let x = -12 - row * 2; x < 12 + row * 2; x += 0.8) k.stand(riceImg((row * 7 + Math.round(x * 3)) % 5), new THREE.Vector3(x + (row % 2) * 0.4, G, z), { px: 1 / 16, depth: 3 });
    }
    village(k, G, -62);
  } else if (kind === 'kumo') {
    k.tiled(hGroundImg('h_road', 64, 64), -60, 60, -60, 2, G, 14);
    // 火の見やぐらの 柱（2D の 柱と 同じ 所：左 18、右 192）
    const z = -3;
    for (const px of [20, 194]) {
      const a = k.atDepth(px, H + 8, z)!;
      k.stand(postImg(), a, { px: k.pxAt(-z) * 1.0, depth: 6, rows: [0, 64] });
      const b = k.atDepth(px, 58, z)!;
      k.stand(postImg(), b, { px: k.pxAt(-z) * 1.0, depth: 6 });
    }
    const tower = propImg('prop_h_hinomi');
    if (tower) k.stand(tower, new THREE.Vector3(9, G, -30), { px: 1 / 16, depth: 8 });
    village(k, G, -40);
  } else {
    // 3号ハウスの 中：トマトの 列、ビニールの 骨（アーチ）、通路の マルチ
    k.tiled(hGroundImg('h_mulch', 64, 64), -8, 8, -40, 2, G, 14);
    for (const x of [-4.5, -1.6, 1.6, 4.5]) {
      for (let i = 0; i < 9; i++) {
        const img = propImg('prop_h_tomato', { i, n: 13 });
        if (img) k.stand(img, new THREE.Vector3(x, G, -12 - i * 3.2), { px: 1 / 16, depth: 5 });
      }
    }
    const pipe = once('as:pipe', () => {
      const p = new PixelCanvas(2, 2);
      p.fill('#7A8090');
      return p.toCanvas();
    });
    for (let i = 0; i < 8; i++) {
      const z = -10 - i * 5;
      for (let a = 0; a < 16; a++) {
        const t0 = (a / 16) * Math.PI;
        const t1 = ((a + 1) / 16) * Math.PI;
        const r = 6.5;
        const x0 = -Math.cos(t0) * r;
        const y0 = Math.sin(t0) * 4.2;
        const x1 = -Math.cos(t1) * r;
        const y1 = Math.sin(t1) * 4.2;
        k.quad(pipe, [x0, y0, z], [x1, y1, z], [x1, y1 + 0.08, z], [x0, y0 + 0.08, z]);
      }
    }
  }
  // そばで かかげた トマトの 灯り（2D の 光の 輪の 中心）
  const at = k.atDepth(LX, LY, -2.6)!;
  lamp(k, at, { color: '#FF9A50', i: 9, dist: 9, decay: 1.3 });
  glowAt(k, at, 1.6, '#F28A3A', 0.1);
}

registerPanel3d('asairo', {
  cam: { fov: 30, pitch: -6, pos: [0, 2.2, 0], near: 0.2, far: 600 },
  light: { sun: '#8a9ad8', sky: '#3a4470', ground: '#1a1a28', fog: '#1A1E34', sunI: 1.3, hemiI: 2.0, el: 30, az: 160 },
  fog: [30, 220],
  shadow: { x: 0, z: -8, hw: 14, hd: 10 },
  // 夜明け前の 色は この 絵で 決める（フィールドの 仕上げを かけると 暗く つぶれる）
  grade: () => null,
  focus: 0.45,
  tilt: 0.6,
  build: (k, s) => build(k, String(s.kind ?? 'satoimo')),
});

