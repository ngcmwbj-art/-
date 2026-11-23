// 大写し「浮き」（第3章 やっと、魚の 昼、events/ch3/sakana.ts UkiPanel）を HD-2D で（2026-11-23）。
// 防波堤の 先から 横に 見た 12:01 の 海：昼の 空と 水平線、波の もどった 海（うねりが 防波堤へ 寄る：
// animated）、手前 左下に 防波堤の ふちの コンクリートと 消波ブロックの 足。遠くに 沖の 島。
// 浮き・糸・竿の 先・波の 線・魚・手は 遊びの 物なので 2D の まま 上に（時間を 変えない）。

import * as THREE from 'three';
import { registerPanel3d } from '../panel3d';
import { groundImg, noonSea, noonSky, pix, tetrapod } from './_kit_f';

/** 絵の 大きさ（UkiPanel の 左：RX - SX - 4 × CH）。 */
const W = 210;
const H = 112;
const SEA = 0;

registerPanel3d('sakana', {
  // 水平線が 2D と 同じ 22px
  cam: { fov: 24, pitch: 7.3, pos: [0, 3.0, 0], far: 3000 },
  light: 'noon',
  fog: [200, 3000],
  shadow: { x: -2, z: -4, hw: 6, hd: 5 },
  focus: 0.72,
  tilt: 1.0,
  animated: true,
  fps: 20,
  build(k) {
    k.sky(noonSky());
    k.bag.sea = k.tiled(noonSea(true), -3000, 3000, -3000, 6, SEA, 7);
    // 沖の 島（右の 奥、低く 青い 影）
    const isl = pix('sk:isl', 8, 8, (p) => p.fill('#4E6E84'));
    const a = k.atDepth(150, 22, -1500);
    const b = k.atDepth(196, 22, -1500);
    if (a && b) {
      k.box(a.x, b.x, 0, 14, -1520, -1500, { front: isl, top: isl });
      k.box(a.x + 12, b.x - 10, 0, 26, -1530, -1510, { front: isl, top: isl });
    }
    // 手前 左下：防波堤の ふち（コンクリート）と 消波ブロック
    const conc = groundImg('c3_bouhatei', 64, 16);
    const edge = k.ground(52, H - 9, 1.2);
    const left = k.ground(0, H, 1.2);
    if (edge && left) {
      k.box(left.x - 3, edge.x, -1, 1.2, edge.z - 1.5, edge.z + 0.02, { front: conc, top: conc, right: conc });
      k.box(left.x - 3, edge.x, -1, 1.2, edge.z, 3, { top: conc });
      tetrapod(k, new THREE.Vector3(edge.x + 0.7, 0.2, edge.z - 0.9), 0.9, 0.6);
      tetrapod(k, new THREE.Vector3(edge.x + 0.3, -0.2, edge.z - 2.6), 0.9, 1.7);
    }
  },
  update(k, t) {
    const sea = k.bag.sea as THREE.Mesh | undefined;
    const map = sea && (sea.material as THREE.MeshLambertMaterial).map;
    if (map) {
      // うねりが 防波堤（左・手前）へ 寄る
      map.offset.y = (t / 7000) % 1;
      map.offset.x = (t / 26000) % 1;
    }
  },
});
