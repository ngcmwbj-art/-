// 大写し「花」（第2章 そば畑の 夜、events/ch2/soba.ts SobaPanel）を HD-2D で（2026-11-23 依頼主
// 「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：トマトの 灯りの 輪の 中に そばの 株 6本（赤い 茎、ハートの 葉 2枚、
// 白い 小さな 花の かたまり）。のぞいた 花の 下の 字（長・短）、組に 立てた 札、えらんだ 輪、カーソルの
// 矢印、灯りの トマトは 2D の まま 上に。奥は 夜の そば畑（同じ 株が 並ぶ）と 杉の 林。
// さわって 選ぶ 大写し：6本は 2D の 当たり（TouchPick：FX(i)−12 .. +14、行 26〜94）と 同じ px に 立てる
// （standAt：絵の 茎が 2D の x、根もとが 2D の 地面の 行）。

import * as THREE from 'three';
import { SB_ANTHER, SB_FLOWER, SB_FLOWER_SH, SB_LEAF, SB_LEAF_DK, SB_STEM, SB_STEM_LT } from '../../art/props/soba_art';
import { registerPanel3d } from '../panel3d';
import { CH2_NIGHT, glowDisc, hGround, nightSky, paint, standAt, sugiWall } from './_kit_c';

const W = 182;
const GY = 92;
const FX = (i: number): number => 22 + i * 28;

/** そばの 株 1本（2D の drawScene と 同じ 形）。絵の 列 8 が 茎（2D の x）、行 5 が 花の top。 */
function plantImg(h: number): HTMLCanvasElement {
  return paint(`sb:plant:${h}`, 20, h + 5, (p) => {
    const x = 8;
    const top = 5;
    const gy = h + 5;
    p.rect(x, top + 6, 2, gy - top - 6, SB_STEM);
    p.set(x, top + 10, SB_STEM_LT);
    for (const [lx, ly, s] of [[x - 6, gy - 22, -1], [x + 4, gy - 34, 1]] as const) {
      if (ly < top + 6) continue;
      p.rect(lx, ly, 6, 3, SB_LEAF);
      p.rect(lx + 1, ly - 1, 4, 1, SB_LEAF);
      p.rect(lx + (s < 0 ? 4 : 0), ly + 3, 2, 1, SB_LEAF_DK);
    }
    for (const [fx, fy] of [[-5, 2], [4, 1], [0, -3], [-2, 5], [5, 6]] as const) {
      const px = x + fx;
      const py = top + fy;
      p.rect(px - 2, py - 1, 5, 3, SB_FLOWER_SH);
      p.rect(px - 1, py - 2, 3, 5, SB_FLOWER_SH);
      p.rect(px - 1, py - 1, 3, 3, SB_FLOWER);
      p.set(px, py, SB_ANTHER);
    }
  });
}

/** 奥の 畑の 株の 列（1枚に 何本も：ドローコールを 少なく）。 */
function stripImg(): HTMLCanvasElement {
  return paint('sb:strip', 120, 49, (p) => {
    const one = plantImg(44);
    for (let x = 0; x < 112; x += 9) {
      const src = one.getContext('2d')!.getImageData(0, 0, one.width, one.height);
      for (let yy = 0; yy < one.height; yy++)
        for (let xx = 0; xx < one.width; xx++) {
          const i = (yy * one.width + xx) * 4;
          if (src.data[i + 3] < 128) continue;
          const tx = x + xx - 4;
          const ty = yy + ((x * 7) % 5);
          if (tx >= 0 && tx < 120 && ty < 49) p.set(tx, ty, `#${[0, 1, 2].map((c) => src.data[i + c].toString(16).padStart(2, '0')).join('')}`);
        }
    }
  });
}

registerPanel3d('soba', {
  cam: { fov: 28, pitch: 6, pos: [0, 1.4, 0], far: 300 },
  light: CH2_NIGHT,
  fog: [10, 50],
  shadow: { x: 0, z: -5, hw: 6, hd: 6 },
  focus: 0.7,
  tilt: 0.9,
  build(k) {
    k.sky(nightSky(0.35, 1));
    const g0 = k.ground(W / 2, GY, 0)!;
    // 畑（耕した 土）と 奥の 草
    k.tiled(hGround('h_tilled', 64, 64), -20, 20, -40, 3, 0, 16);
    k.tiled(hGround('h_urayama', 64, 64), -80, 80, -90, -40, 0, 16);
    // 手前の 6本（2D と 同じ px）
    for (let i = 0; i < 6; i++) {
      const top = 34 + ((i * 7) % 3) * 3;
      standAt(k, plantImg(GY - top), FX(i) - 8, top - 5, 1, { depth: 2 });
    }
    // 奥の そば畑（同じ 株が 列に）
    const strip = stripImg();
    const sp = k.pxAt(-g0.z) * 0.8;
    for (let row = 0; row < 12; row++) {
      const z = g0.z - 1.2 - row * 0.9;
      const w = 120 * sp;
      for (let x = -12; x <= 12; x += w * 0.95) k.stand(strip, new THREE.Vector3(x + (row % 2) * w * 0.4, 0, z), { px: sp, depth: 2, cast: false, flip: row % 2 === 1 });
    }
    k.stand(sugiWall(400, 64, 21), new THREE.Vector3(0, 0, -44), { px: 0.15, depth: 2, cast: false });
    // トマトの 灯り（2D：輪の 中心 行 gy−34、右下に 低く 持つ）
    const lamp = new THREE.PointLight('#FFC890', 3.5, 5, 1.3);
    const lp = k.ground(W - 10, 104, 0)!;
    lamp.position.set((lp.x + g0.x) / 2, 0.9, g0.z + 0.6);
    k.scene.add(lamp);
    glowDisc(k, new THREE.Vector3(g0.x, 0, g0.z - 0.3), 2.6, '#F2A060', 0.22);
  },
});
