// 大写し「玉」（第2章 上の 畑の 夜明け前、events/ch2/retasu.ts TamaPanel）を HD-2D で（2026-11-23 依頼主
// 「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：耕した 畑に レタスの 株 1つ（巻いた 玉〈やわらかい・かたい・とりごろ で 大きさ〉、
// 玉に そう 外の 葉 2枚、地面に 広がる 外の 葉、露）、両わきの となりの 株。玉は 押すと 少し つぶれ（state.ry）、
// 切ると 持ち上がる（state.lift）。しゅんの 頭の ライトの 白い 光。
// 奥は フィールドの 上の 畑の 株（prop_rt_retasu）の 列と 杉の 林、夜明け前の 青い 空。
// 手・包丁・霧吹き・切り口の 汁・字は 2D の まま 上に（2D の 絵と 同じ px に 玉を 置く：Kit.atDepth）。

import * as THREE from 'three';
import { RT_HEAD, RT_HEAD_LT, RT_LEAF, RT_LEAF_DK, RT_LEAF_LT } from '../../art/props/retasu_art';
import { registerPanel3d } from '../panel3d';
import { CH2_NIGHT, glowDisc, hGround, nightSky, paint, propImg, sugiWall, swap } from './_kit_c';

const W = 218;
const CX = 96;
const GY = 92;

/** 玉（2D の drawScene と 同じ 描き方）：size・縦の 半径 ry。足もとが 絵の 下の はし。 */
function headImg(size: number, ry: number): HTMLCanvasElement {
  const w = size * 2 + 20;
  const h = ry * 2 + 4;
  return paint(`rt:head:${size}:${ry}`, w, h, (p) => {
    const cx = Math.floor(w / 2);
    const hy = ry + 1;
    const ell = (x0: number, y0: number, rx: number, rr: number, c: string) => {
      for (let y = -rr; y <= rr; y++) {
        const hh = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (rr * rr))));
        if (hh > 0) p.hline(x0 - hh, x0 + hh - 1, y0 + y, c);
      }
    };
    ell(cx, hy, size, ry, RT_HEAD);
    ell(cx - 4, hy - 4, size - 8, Math.max(1, ry - 7), RT_HEAD_LT);
    for (let s = -1; s <= 1; s += 2)
      for (let i = 0; i < ry * 2 - 4; i++) {
        const y = hy - ry + 3 + i;
        const x = cx + s * Math.round(size * 0.55 * Math.sin((i / (ry * 2)) * Math.PI));
        p.set(x, y, RT_LEAF);
      }
    p.line(cx, hy - ry + 2, cx, hy + ry - 4, '#9AC860');
    const top = hy - ry + 8;
    const bot = hy + ry;
    for (let s = -1; s <= 1; s += 2) {
      for (let y = top; y <= bot; y++) {
        const t = (y - top) / (bot - top);
        const lw = Math.round(3 + 7 * Math.sin(Math.min(1, t * 1.3) * Math.PI * 0.5) - (t > 0.8 ? (t - 0.8) * 20 : 0));
        const mid = cx + s * Math.round(size - 6 + 3 * Math.sin(t * Math.PI) + (y % 3 === 0 && t < 0.25 ? 1 : 0));
        if (lw > 0) p.hline(mid - lw, mid + lw - 1, y, t < 0.12 ? RT_LEAF_LT : RT_LEAF);
      }
      p.line(cx + s * (size - 6), top + 2, cx + s * (size - 8), bot - 1, RT_LEAF_DK);
      p.set(cx + s * (size - 2), top + 1, '#FFFFFF');
    }
    for (const [dx, ddy] of [[-size + 2, -2], [size - 3, 0], [-6, -ry + 1], [8, -ry + 2]] as const) p.hline(cx + dx, cx + dx + 1, hy + ddy, '#FFFFFF');
  });
}

/** 地面に 広がる 外の 葉（上から 見た 輪：まん中は 茎の 所）。 */
function rosetteImg(): HTMLCanvasElement {
  return paint('rt:rosette', 64, 40, (p) => {
    const blob = (x0: number, y0: number, rx: number, ry: number, c: string) => p.ellipse(x0, y0, rx, ry, c);
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2;
      blob(32 + Math.round(Math.cos(a) * 20), 20 + Math.round(Math.sin(a) * 12), 11, 7, k % 2 ? RT_LEAF : RT_LEAF_DK);
    }
    blob(32, 20, 22, 13, RT_LEAF);
    for (let k = 0; k < 14; k++) {
      const a = (k / 14) * Math.PI * 2;
      p.set(32 + Math.round(Math.cos(a) * 29), 20 + Math.round(Math.sin(a) * 17), '#FFFFFF');
    }
    for (let k = 0; k < 9; k++) {
      const a = (k / 9) * Math.PI * 2 + 0.3;
      p.line(32, 20, 32 + Math.round(Math.cos(a) * 22), 20 + Math.round(Math.sin(a) * 13), '#A8D878');
    }
  });
}

registerPanel3d('retasu', {
  cam: { fov: 28, pitch: 9, pos: [0, 1.5, 0], far: 300 },
  light: CH2_NIGHT,
  fog: [14, 60],
  shadow: { x: 0, z: -8, hw: 8, hd: 10 },
  focus: 0.72,
  tilt: 1.0,
  build(k) {
    k.sky(nightSky(0.55, 0.6));
    const base = k.ground(CX, GY, 0)!;
    k.bag.z = base.z;
    // 耕した 畑と その 奥の 草
    k.tiled(hGround('h_tilled', 64, 64), -20, 20, -40, 4, 0, 16);
    k.tiled(hGround('h_urayama', 64, 64), -80, 80, -90, -40, 0, 16);
    // 地面に 広がる 外の 葉（玉の まわり）
    const ro = rosetteImg();
    const u = k.pxAt(-base.z);
    const rw = 96 * u;
    const rd = rw * 0.62;
    const m = k.material(k.tex(ro));
    const g = k.own(new THREE.PlaneGeometry(rw, rd));
    g.rotateX(-Math.PI / 2);
    const leaves = new THREE.Mesh(g, m);
    leaves.position.set(base.x, 0.02, base.z - rd * 0.3);
    leaves.receiveShadow = true;
    k.scene.add(leaves);
    // となりの 株（2D：両はし x 14 と W−14）と、奥の 畝の 株
    const kabu = (i: number) => propImg('prop_rt_retasu', { i, t: -1 });
    for (const x of [14, W - 14]) {
      const at = k.ground(x, GY, 0);
      const img = kabu(x);
      if (at && img) k.stand(img, at, { px: u * 2.2, depth: 8 });
    }
    for (let row = 0; row < 7; row++) {
      const z = base.z - 4 - row * 1.8;
      for (let x = -12; x <= 12; x += 2.2) {
        const img = kabu(row * 7 + Math.round(x * 3));
        if (img) k.stand(img, new THREE.Vector3(x + (row % 2) * 0.7, 0, z), { px: 1 / 16, depth: 6 });
      }
    }
    // 杉の 林
    k.stand(sugiWall(400, 64, 9), new THREE.Vector3(0, 0, -46), { px: 0.16, depth: 2, cast: false });
    // しゅんの 頭の ライト（右上から）
    const spot = new THREE.SpotLight('#FFF2C0', 9, 14, 0.5, 0.6, 1.6);
    spot.position.set(base.x + 1.6, 3.2, base.z + 2);
    spot.target.position.set(base.x, 0.4, base.z);
    k.scene.add(spot, spot.target);
    glowDisc(k, new THREE.Vector3(base.x + 0.1, 0.55, base.z - 0.6), 1.5, '#FFF2C0', 0.22, false);
    glowDisc(k, new THREE.Vector3(base.x, 0, base.z), 1.4, '#FFF2C0', 0.2);
  },
  update(k, _t, s) {
    const size = Number(s.size) || 28;
    const ry = Number(s.ry) || 24;
    const lift = Number(s.lift) || 0;
    swap(k, 'head', `${size}:${ry}`, () => {
      const img = headImg(size, ry);
      // 足もと（2D：玉の 下 = gy − 6 − lift）
      const at = k.atDepth(CX, GY - 6 + 2, k.bag.z as number)!;
      const m = k.stand(img, at, { px: k.pxAt(-(k.bag.z as number)), depth: Math.round(size * 1.2), unlit: true });
      m.userData.y0 = at.y;
      return m;
    });
    const all = k.bag['swap:head'] as Map<string, THREE.Mesh>;
    const u = k.pxAt(-(k.bag.z as number));
    for (const m of all.values()) {
      const y = (m.userData.y0 as number) + lift * u;
      if (m.position.y !== y) {
        m.position.y = y;
        k.shadowDirty = true;
      }
    }
  },
});
