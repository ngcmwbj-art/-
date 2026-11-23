// 大写し「畝の 断面」（第2章 裏の ネギ畑、events/ch2/negi.ts NegiPanel）を HD-2D で（2026-11-23 依頼主
// 「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：畝を 横に 切った 断面 —— 寄せた 土の 山（段で 高く・低く なる：state.lv）、
// その 切り口に ネギ 1本（根・土の 下の 白い 葉鞘・光の 当たる うす緑・分かれ目から 扇に 開く 葉）、下の 土。
// 2D の 平たい 絵の かわりに、切り口から 奥へ 畝が つづき（フィールドの ネギ畑の 畝 prop_nh_negi が 並ぶ）、
// となりの 畝、杉の 林、夜明け前の 空。目もり・分かれ目の 点線・字は 2D の まま 上に。
// 切り口は 2D の 絵と 同じ 面（パネルの px：ネギの 中心 x 128、地面の 行 96、1段 6px）に 置く。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { NH_FORK, NH_LEAF, NH_LEAF_DK, NH_LEAF_LT, NH_PALE, NH_SOIL, NH_SOIL_DK, NH_SOIL_LT, NH_WHITE, NH_WHITE_SH } from '../../art/props/negi_art';
import { registerPanel3d, type Kit } from '../panel3d';
import { CH2_NIGHT, hGround, nightSky, paint, propImg, sugiWall, swap } from './_kit_c';
import { Rng } from '../../engine/rng';

const CX = 128;
const BASE = 96;
const STEP = 6;
const D = 4;
const FORK_Y = BASE - NH_FORK * STEP;

/** 切り口の 土（断面：暗い 土に 小石・明るい 粒）。 */
function cutSoil(): HTMLCanvasElement {
  return paint('nh:cut', 32, 32, (p) => {
    const rng = new Rng(41);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const n = rng.next();
        p.set(x, y, n < 0.12 ? NH_SOIL_DK : n > 0.92 ? NH_SOIL_LT : NH_SOIL);
      }
  });
}
/** 下の 土（地面の 下：もっと 暗い）。 */
function deepSoil(): HTMLCanvasElement {
  return paint('nh:deep', 32, 32, (p) => {
    const rng = new Rng(43);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const n = rng.next();
        p.set(x, y, n < 0.15 ? '#1A1210' : n > 0.95 ? NH_SOIL : NH_SOIL_DK);
      }
  });
}

/** ネギの 葉（分かれ目から 扇に、2D と 同じ 線）。左下が 分かれ目の 左 (cx−40)。 */
function leavesImg(): HTMLCanvasElement {
  return paint('nh:leaves', 82, 50, (p) => {
    const fx = 40;
    const fy = 49;
    const leaves: [number, number][] = [[-36, -34], [-16, -44], [6, -48], [24, -40], [38, -26]];
    for (const [dx, dh] of leaves) {
      p.line(fx, fy, fx + dx, fy + dh, dx < 0 ? NH_LEAF_DK : NH_LEAF);
      p.line(fx + 1, fy, fx + 1 + dx, fy + dh, NH_LEAF);
      p.set(fx + dx, fy + dh, NH_LEAF_LT);
    }
    p.set(fx, fy, NH_LEAF_DK);
  });
}

/** 葉鞘（分かれ目から 地面まで 8 × 36）：土の 下は 白、上は うす緑。soil：土の 行（上から）。 */
function sheathImg(soil: number): HTMLCanvasElement {
  const h = BASE - FORK_Y;
  return paint(`nh:sheath:${soil}`, 9, h, (p) => {
    for (let y = 0; y < h; y++) {
      const under = y + FORK_Y >= soil;
      p.hline(0, 7, y, under ? NH_WHITE : NH_PALE);
      p.set(8, y, under ? NH_WHITE_SH : NH_LEAF);
      p.set(0, y, under ? mix(NH_WHITE, NH_WHITE_SH, 0.4) : mix(NH_PALE, NH_LEAF, 0.3));
    }
  });
}

/** 根（地面の 下に 4本）。 */
function rootsImg(): HTMLCanvasElement {
  return paint('nh:roots', 16, 14, (p) => {
    for (const [dx, len] of [[-6, 10], [-2, 13], [3, 12], [7, 9]] as const) p.line(8, 0, 8 + dx, len, '#D8CCB0');
  });
}

/** 寄せた 土の 山（断面の 形を 奥へ 押し出す）：半分の 幅 hw、高さ hh（単位）。 */
function mound(k: Kit, hw: number, hh: number, y0: number, len: number): THREE.Mesh {
  const s = new THREE.Shape();
  const n = 24;
  s.moveTo(-hw - 0.02, y0 - 0.02);
  for (let i = 0; i <= n; i++) {
    const x = -hw + (2 * hw * i) / n;
    const t = Math.abs(x) / hw;
    s.lineTo(x, y0 + hh * (1 - t * t));
  }
  s.lineTo(hw + 0.02, y0 - 0.02);
  const g = k.own(new THREE.ExtrudeGeometry(s, { depth: len, bevelEnabled: false, steps: 1 }));
  g.translate(0, 0, -len);
  const cap = k.tex(cutSoil(), true);
  const side = k.tex(hGround('h_tilled', 32, 32), true);
  // (ExtrudeGeometry の uv は 単位：1 単位に 絵 1枚 → 細かく くり返す)
  cap.repeat.set(3, 3);
  side.repeat.set(3, 3);
  const m = new THREE.Mesh(g, [k.material(cap), k.material(side)]);
  m.castShadow = true;
  m.receiveShadow = true;
  k.scene.add(m);
  return m;
}

registerPanel3d('negi', {
  cam: { fov: 30, pitch: 0, pos: [0, 0, 0], far: 200 },
  light: CH2_NIGHT,
  fog: [10, 40],
  shadow: { x: 0, z: -8, hw: 8, hd: 8 },
  focus: 0.75,
  tilt: 0.9,
  build(k) {
    k.sky(nightSky(0.45, 0.7));
    const u = k.pxAt(D);
    const c = k.atDepth(CX + 1, BASE, -D)!;
    const y0 = c.y;
    k.bag.u = u;
    k.bag.c = c;
    // 地面（奥の 畑：畝の 間の 耕した 土、まわりの 草）と、切り口の 下の 土
    k.tiled(hGround('h_tilled', 64, 64), -6, 6, -24, -D, y0, 16);
    k.tiled(hGround('h_urayama', 64, 64), -60, 60, -80, -24, y0, 16);
    k.tiled(hGround('h_urayama', 64, 64), -60, -6, -24, -D, y0, 16);
    k.tiled(hGround('h_urayama', 64, 64), 6, 60, -24, -D, y0, 16);
    k.box(-8, 8, y0 - 3, y0, -D - 0.5, -D, { front: deepSoil(), top: deepSoil() });
    // 根（切り口の 下）
    k.stand(rootsImg(), new THREE.Vector3(c.x, y0 - 14 * u, -D + 0.02), { px: u, depth: 1, cast: false, unlit: true });
    // 奥へ つづく 畝の ネギ（フィールドの ネギ畑の 1マスの 絵）と、となりの 畝
    for (const [x, r] of [[c.x, 1], [c.x - 2.9, 0], [c.x + 2.9, 2]] as const) {
      const img = propImg('prop_nh_negi', { r, i: 0 });
      if (!img) continue;
      for (let z = x === c.x ? -D - 1.2 : -D - 0.4; z > -18; z -= 1.1) {
        k.stand(img, new THREE.Vector3(x + Math.sin(z * 3.1) * 0.05, y0, z), { px: 1 / 16 * 1.05, depth: 3, rows: [0, 21] });
      }
    }
    // 杉の 林（畑の 奥）
    k.stand(sugiWall(320, 64), new THREE.Vector3(0, y0, -26), { px: 0.12, depth: 2, cast: false });
    // 葉（分かれ目から 扇に）
    k.stand(leavesImg(), new THREE.Vector3(c.x, k.atDepth(CX, FORK_Y, -D)!.y - 1 * u, -D + 0.03), { px: u, depth: 2, anchor: 'foot', unlit: true });
  },
  update(k, _t, s) {
    const u = k.bag.u as number;
    const c = k.bag.c as THREE.Vector3;
    const lv = Number(s.lv) || 0;
    const soilRow = Math.round(BASE - lv * STEP);
    // 土の 山（段が 変わると 作り直す）
    const key = String(Math.round(lv * 20) / 20);
    if (k.bag.lvKey !== key) {
      k.bag.lvKey = key;
      const old = k.bag.mound as THREE.Mesh | undefined;
      if (old) k.scene.remove(old);
      const hw = (40 + lv * 4) * u;
      k.bag.mound = mound(k, hw, Math.max(0.001, lv * STEP * u), c.y, 18);
      (k.bag.mound as THREE.Mesh).position.set(c.x, 0, -D);
      k.shadowDirty = true;
    }
    // 葉鞘（土の 下は 白）
    swap(k, 'sheath', String(soilRow), () => k.stand(sheathImg(soilRow), new THREE.Vector3(c.x + 0.5 * u, c.y, -D + 0.04), { px: u, depth: 3, unlit: true }));
  },
});
