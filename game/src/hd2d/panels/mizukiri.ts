// 大写し「水切り」（第3章 浜、events/ch3/mizukiri.ts MizukiriPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：昼の 空と、南の 遠い 水平線（この 浜から だけ 見える）、空を 映す 鏡の
// 海（段階2 は 12:01 の 波が 寄る）、手前の 丸い 石の 浜、左に 横向きの しゅん（かがむ ほど 低く）。
// 水平線は 2D と 同じ 行（絵の 上から 40px）に 来る よう カメラを 少し 下へ 向ける。
// 腕・持った 石・跳ねる 石と 輪は 2D の まま 上に（腰の 高さで 毎フレーム 動く ため。肩の 位置は
// mzBoy() で 3D の しゅんと 合わせる）。

import * as THREE from 'three';
import { mix, PixelCanvas } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { charSprite } from '../../art/chars/registry';
import { CP } from '../../art/tiles/c3_ground';
import { h01 } from '../../art/tiles/noise';
import { registerPanel3d, type Kit } from '../panel3d';
import { contact, D0, noonSky, once, pix } from './_kit_e';
import { mzBoy } from '../../events/ch3/mizukiri';

/** 絵の 大きさ（2D と 同じ）。 */
const W = 210;
const H = 112;
/** 水平線の 行。 */
const HZ = 40;

/** 鏡の 海：空の 色を 映した 淡い 青、横に 長い 光の 線（nami：白い 波頭）。 */
export function seaImg(nami: boolean): HTMLCanvasElement {
  return once(`mz:sea:${nami}`, () => {
    const p = new PixelCanvas(64, 32);
    const rng = new Rng(nami ? 97 : 93);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 64; x++) {
        const n = rng.next();
        p.set(x, y, n < 0.03 ? mix(CP.umi, '#7AB0D4', 0.5) : n > 0.97 ? '#B8D8EC' : mix('#7AB0D4', '#9CC8E2', 0.4));
      }
    for (let k = 0; k < 10; k++) {
      const y = (k * 7) % 32;
      const x = (k * 23) % 64;
      const l = 8 + ((k * 5) % 11);
      for (let i = 0; i < l; i++) p.set((x + i) % 64, y, '#D8ECF8');
    }
    if (nami)
      for (let k = 0; k < 8; k++) {
        const y = (k * 11 + 3) % 32;
        const x = (k * 17) % 64;
        for (let i = 0; i < 6; i++) p.set((x + i) % 64, y, '#E8F4FA');
        p.set((x + 2) % 64, (y + 1) % 32, '#C8E4F0');
      }
    return p.toCanvas();
  });
}

/** 丸い 石の 浜（上から）。 */
function pebbleImg(): HTMLCanvasElement {
  return pix('mz:pebble', 64, 64, (p) => {
    p.fill('#8E8C86');
    const rng = new Rng(4421);
    for (let n = 0; n < 150; n++) {
      const x = Math.floor(rng.next() * 64);
      const y = Math.floor(rng.next() * 64);
      const r = 1.5 + rng.next() * 2.2;
      const c = rng.next() < 0.6 ? '#BDB6A6' : rng.next() < 0.5 ? '#A8A49A' : '#D2CCBE';
      for (let dy = -3; dy <= 3; dy++)
        for (let dx = -3; dx <= 3; dx++) {
          if (dx * dx + dy * dy * 1.6 > r * r) continue;
          const xx = (x + dx + 64) % 64;
          const yy = (y + dy + 64) % 64;
          p.set(xx, yy, dy < -r * 0.4 ? mix(c, '#FFFFFF', 0.3) : dy > r * 0.4 ? mix(c, '#5A5650', 0.3) : c);
        }
    }
  });
}

/** 波打ちぎわ（ぬれた 石）。 */
function wetImg(): HTMLCanvasElement {
  return pix('mz:wet', 64, 16, (p) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 64; x++) p.set(x, y, h01(x, y, 4423) > 0.7 ? '#7A7A74' : y < 3 ? mix('#9CC8E2', '#6E6C66', y / 3) : '#6E6C66');
    for (let x = 0; x < 64; x += 5) p.set(x, 2, '#E8F4FA');
  });
}

function build(k: Kit, s: Record<string, unknown>): void {
  const nami = !!s.nami;
  k.sky(noonSky([[0, '#8EC0E0'], [0.12, '#8EC0E0'], [0.25, '#A8D0EA'], [0.33, '#C8E2F2'], [1, '#D8EAF4']], 'mz'));
  // 浜の 高さ：しゅんの 足もと（絵の 下から 8px、奥行き D0）
  const foot = k.atDepth(mzBoy(0).x, mzBoy(0).foot, -D0)!;
  const by = foot.y;
  const sea = k.tiled(seaImg(nami), -3000, 3000, -3000, -D0 - 3, by - 0.25, 3);
  k.bag.sea = sea;
  k.tiled(wetImg(), -60, 60, -D0 - 3.6, -D0 - 2.6, by - 0.12, 16);
  k.tiled(pebbleImg(), -60, 60, -D0 - 2.6, 2, by, 16);
  // しゅん（横向き、背中が 左）
  const s0 = charSprite('minato_nonet').walk.right[0];
  const b = mzBoy(0);
  const boy = k.stand(s0, foot, { px: k.pxAt(D0) * b.scale, depth: 2, unlit: true });
  k.bag.boy = boy;
  k.bag.boyY = boy.scale.y;
  contact(k, new THREE.Vector3(foot.x, by, foot.z), 1.6, 0.6, 0.3);
}

registerPanel3d('mizukiri', {
  // （水平線が 上から 40px：tan(pitch) = (56 − 40) / 56 × tan 12°）
  cam: { fov: 24, pitch: (Math.atan((((H / 2 - HZ) / (H / 2)) * Math.tan((12 * Math.PI) / 180))) * 180) / Math.PI, pos: [0, 0, 0], far: 4000 },
  light: 'noon',
  fog: [200, 2600],
  shadow: { x: 0, z: -D0, hw: 10, hd: 8 },
  focus: 0.86,
  tilt: 0.5,
  animated: (s) => !!s.nami,
  fps: 20,
  build,
  update(k, t, s) {
    const boy = k.bag.boy as THREE.Mesh | undefined;
    if (boy) boy.scale.y = (k.bag.boyY as number) * mzBoy(Number(s.v ?? 0)).squash;
    const sea = k.bag.sea as THREE.Mesh | undefined;
    if (sea && s.nami) {
      const map = (sea.material as THREE.MeshLambertMaterial).map;
      if (map) map.offset.y = (t / 6000) % 1;
    }
  },
});
