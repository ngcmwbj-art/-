// 大写し「畦」（第2章 上の 柵ぞいの 見回り、events/ch2/sakuzoi.ts SakuAzePanel）を HD-2D で（2026-11-23 依頼主
// 「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜の 畦を 横から —— 8つの ますに 草（電気柵の 下の 線に とどく 高い 草）・
// 畦豆（あぜまめ）・刈った 株、電気柵の 白い 柱と 2本の 線（切って ある）、カーソルの ます の まわりの
// 灯りの 輪（点の 光：state.cur に ついて 動く）。奥は 田んぼの 稲（南）と 杉の 林、夜明け前の 空。
// ますの 絵（azeGrass・azeMame・azeStubble）は 2D と 同じ 所・同じ 大きさ（2倍）に ボクセルで 立てる：
// 2D の カーソルの 枠と 合う。カーソル・字・右の 列（グソっ君・のこり）は 2D の まま 上に。

import * as THREE from 'three';
import { azeGrass, azeMame, azeStubble } from '../../art/props/sakuzoi_art';
import { registerPanel3d } from '../panel3d';
import { Rng } from '../../engine/rng';
import { CH2_NIGHT, hGround, nightSky, paint, standAt, sugiWall, swap } from './_kit_c';

const SLOT_W = 26;
const ROW_X = 8;
const GROUND_Y = 98;
const WIRE_Y = GROUND_Y - 50;

/** 稲の 列（田んぼの 向こうの 帯：穂が 垂れた 株）。 */
function riceImg(): HTMLCanvasElement {
  return paint('sk:rice', 96, 18, (p) => {
    const rng = new Rng(13);
    for (let x = 1; x < 96; x += 3) {
      const h = 11 + Math.floor(rng.next() * 5);
      const c = rng.next() < 0.5 ? '#4E7A3A' : '#3E6A34';
      for (let y = 17; y > 17 - h; y--) p.set(x + (y < 17 - h + 4 ? 1 : 0), y, c);
      p.set(x + 1, 17 - h + 1, '#C8B860');
      p.set(x + 2, 17 - h + 2, '#B8A850');
    }
  });
}

/** 畦の 前の 面（土、草の 根）。 */
const azeFace = () =>
  paint('sk:face', 32, 16, (p) => {
    const rng = new Rng(7);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 32; x++) {
        const n = rng.next();
        p.set(x, y, y < 2 ? (n < 0.5 ? '#4E7A3A' : '#6E5440') : n < 0.12 ? '#3A2A20' : n > 0.9 ? '#6E5440' : '#4A3426');
      }
  });
const white = () => paint('sk:post', 4, 16, (p) => {
  p.fill('#E8E4D8');
  p.vline(3, 0, 15, '#B8B2A4');
});

registerPanel3d('sakuzoi', {
  cam: { fov: 30, pitch: 5, pos: [0, 1.3, 0], far: 300 },
  light: CH2_NIGHT,
  fog: [12, 60],
  shadow: { x: 0, z: -5, hw: 7, hd: 6 },
  focus: 0.82,
  tilt: 0.9,
  build(k) {
    k.sky(nightSky(0.4, 0.8));
    const g0 = k.ground(ROW_X, GROUND_Y + 1, 0)!;
    const z = g0.z;
    k.bag.z = z;
    // 畦（土の 帯：上は 草の 混じった 土、前の 面は 土）
    k.tiled(hGround('h_aze', 64, 64), -12, 12, z - 1.2, z + 0.8, 0, 16);
    k.box(-12, 12, -0.5, 0, z + 0.8, z + 0.85, { front: azeFace() });
    // 南の 田んぼ（畦より 低い、水と 稲）
    k.tiled(hGround('h_tanada', 64, 64), -40, 40, -40, z - 1.2, -0.45, 16);
    k.box(-12, 12, -0.45, 0, z - 1.25, z - 1.2, { front: azeFace() });
    const rice = riceImg();
    for (let row = 0; row < 9; row++) {
      const rz = z - 3.2 - row * 1.6;
      for (let x = -16; x < 16; x += 4) k.stand(rice, new THREE.Vector3(x + (row % 2) * 1.5, -0.45, rz), { px: 1 / 24, depth: 2, anchor: 'left', cast: false });
    }
    k.stand(sugiWall(400, 64, 3), new THREE.Vector3(0, -0.45, -38), { px: 0.14, depth: 2, cast: false });
    // 電気柵：白い 柱（2D：x ROW_X−6）と 2本の 線（行 WIRE_Y、WIRE_Y−18）
    const wz = z - 0.35;
    const post = k.atDepth(ROW_X - 6, WIRE_Y - 8, wz)!;
    const pw = k.pxAt(-wz) * 2;
    k.box(post.x, post.x + pw, 0, post.y, wz - pw, wz, { front: white(), left: white(), right: white() });
    const wire = paint('sk:wire', 8, 2, (p) => p.fill('#C8C2B4'));
    for (const row of [WIRE_Y, WIRE_Y - 18]) {
      const a = k.atDepth(0, row, wz)!;
      const b = k.atDepth(ROW_X + SLOT_W * 8, row, wz)!;
      const t = k.pxAt(-wz) * 0.8;
      k.box(-12, b.x, a.y - t / 2, a.y + t / 2, wz - t, wz, { front: wire, top: wire });
    }
    // 灯り（しゅんの 頭の トマト）：カーソルの ますの 上
    const lamp = new THREE.PointLight('#FFB070', 7, 4, 1.4);
    k.scene.add(lamp);
    k.bag.lamp = lamp;
  },
  update(k, _t, s) {
    const row = String(s.row ?? '');
    const cut = (s.cut as boolean[]) ?? [];
    const z = k.bag.z as number;
    for (let i = 0; i < row.length; i++) {
      const x = ROW_X + i * SLOT_W;
      const kind = row[i] === 'm' ? 'm' : cut[i] ? 'c' : 'g';
      swap(k, `slot${i}`, kind, () => {
        if (kind === 'm') return standAt(k, azeMame(60 + i), x + Math.round((SLOT_W - 18) / 2), GROUND_Y - 31, 2, { depth: 4 });
        if (kind === 'c') return standAt(k, azeStubble(i), x + Math.round((SLOT_W - 28) / 2), GROUND_Y - 11, 2, { depth: 4 });
        return standAt(k, azeGrass(i + Number(s.layout) * 3, true), x, GROUND_Y - 51, 2, { depth: 3 });
      });
    }
    // 灯りは カーソルの ますに ついて 動く
    const lamp = k.bag.lamp as THREE.PointLight;
    const at = k.ground(ROW_X + Number(s.cur) * SLOT_W + SLOT_W / 2, GROUND_Y + 1, 0)!;
    lamp.position.set(at.x, 0.9, z + 0.6);
  },
});
