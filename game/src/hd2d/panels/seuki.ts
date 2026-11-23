// 大写し「背浮き」（第3章 浮いて、待つ、events/ch3/ukimachi.ts UkiPanel）を HD-2D で（2026-11-23）。
//   uki_seuki  砂の 上で あおむけの しゅんを 真上から：12:01 の 海水浴場の 乾いた 砂（フィールドの 砂の 絵）、
//              まわりに 貝がら・小石。しゅん（息・あご・力の ぬけ）と 水の 輪・合図・ゲージは 遊びの
//              物なので 2D の まま 上に（時間を 変えない）。
//   uki_umi    海：あおむけで 泳ぐ グソっ君の 横から。水面の すぐ 下から 見た 海（上に 明るい 水面の 裏、
//              奥へ 青く かすむ 水、下に 海水浴場の 底の 砂）。水面は 12:01 の 波で 動く（animated）。
//              グソっ君と 泡は 2D の まま 上に。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { registerPanel3d } from '../panel3d';
import { bandSky, flat, groundImg, pix } from './_kit_f';

/** 背浮きの 絵の 大きさ（SW × CH）。 */
const W = 202;
const H = 112;
/** しゅんの 体（2D の まん中：cx = SW/2 + 6、cy = BODY_Y）。足あとや 小物で ふさがない 所。 */
const BODY: [number, number, number, number] = [W / 2 - 60, 30, W / 2 + 70, 104];

function shellImg(): HTMLCanvasElement {
  return pix('uk:shell', 6, 5, (p) => {
    p.ellipse(3, 2.5, 2.5, 2, '#F4F1E8');
    p.line(3, 0, 1, 4, '#D8CFC0');
    p.line(3, 0, 5, 4, '#D8CFC0');
  });
}
function pebImg(): HTMLCanvasElement {
  return pix('uk:peb', 5, 4, (p) => {
    p.ellipse(2, 2, 2, 1.5, '#A8A094');
    p.set(1, 1, '#D0C8BC');
  });
}

registerPanel3d('uki_seuki', {
  cam: { fov: 30, pitch: 90, pos: [0, 8, 0], far: 50 },
  light: 'noon',
  fog: null,
  shadow: { x: 0, z: 0, hw: 4, hd: 3 },
  focus: 0.5,
  tilt: 0.4,
  build(k) {
    k.tiled(groundImg('c3_sand', 64, 64), -10, 10, -6, 6, 0, 16);
    const px = k.pxAt(8);
    // 貝がら・小石（体の 所は あける）
    const rng = new Rng(5821);
    const items = [shellImg(), pebImg(), pebImg()];
    for (let i = 0; i < 12; i++) {
      const x = rng.next() * W;
      const y = rng.next() * H;
      if (x > BODY[0] && x < BODY[2] && y > BODY[1] && y < BODY[3]) continue;
      if (x < 120 && y < 34) continue; // (左上の 字の 合図)
      const at = k.ground(x, y, 0);
      if (at) flat(k, items[i % 3], at, { px, depth: 2, flip: i % 2 === 1, tint: i % 3 === 0 ? '#c8c4bc' : '#d8d4cc' });
    }
  },
});

/** 水面の 裏（明るい 水色、光の 網）。 */
function underSurf(): HTMLCanvasElement {
  return pix('uk:under', 64, 64, (p) => {
    p.fill('#9FD2E6');
    const rng = new Rng(611);
    for (let k = 0; k < 70; k++) {
      const x = Math.floor(rng.next() * 64);
      const y = Math.floor(rng.next() * 64);
      const l = 3 + Math.floor(rng.next() * 6);
      for (let i = 0; i < l; i++) p.set((x + i) % 64, (y + (i > l / 2 ? 1 : 0)) % 64, i % 3 ? '#D8F0F8' : '#F4FAFC');
    }
    for (let k = 0; k < 30; k++) p.set(Math.floor(rng.next() * 64), Math.floor(rng.next() * 64), mix('#9FD2E6', '#4A94B8', 0.4));
  });
}

registerPanel3d('uki_umi', {
  // 水面の すぐ 下：水面の 裏が 上の 17px、その 下は 青く かすむ 水
  cam: { fov: 24, pitch: 8.4, pos: [0, -0.6, 0], far: 200 },
  light: { sun: '#e8f6ff', sky: '#bfe4f0', ground: '#2a5a72', fog: '#4A94B8', sunI: 1.6, hemiI: 1.8, el: 70, az: 160 },
  fog: [3, 34],
  shadow: null,
  focus: 0.5,
  tilt: 0.7,
  animated: true,
  fps: 15,
  build(k) {
    k.sky(bandSky('uk:water', [[0, '#8ACCE2'], [0.2, '#6AB4D4'], [1, '#4A94B8']]));
    const surf = k.tiled(underSurf(), -80, 80, -120, 4, 0, 6, { unlit: true });
    (surf.material as THREE.Material).side = THREE.DoubleSide;
    k.bag.surf = surf;
    k.tiled(groundImg('c3_soko', 64, 64), -80, 80, -120, 4, -5, 16);
    // 底の 岩（奥に いくつか）
    const iwa = groundImg('c3_soko_iwa', 32, 32);
    const rng = new Rng(733);
    for (let i = 0; i < 6; i++) {
      const x = -20 + i * 8 + rng.next() * 3;
      const z = -10 - rng.next() * 8;
      const w = 1 + rng.next() * 1.5;
      k.box(x, x + w, -5, -5 + 0.6 + rng.next() * 0.8, z - w * 0.6, z, { front: iwa, top: iwa, left: iwa, right: iwa });
    }
  },
  update(k, t) {
    const surf = k.bag.surf as THREE.Mesh | undefined;
    const map = surf && (surf.material as THREE.MeshBasicMaterial).map;
    if (map) {
      map.offset.x = (t / 5200) % 1;
      map.offset.y = Math.sin(t / 900) * 0.02;
    }
  },
});
