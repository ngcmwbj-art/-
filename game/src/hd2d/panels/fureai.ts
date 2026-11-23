// 大写し「ふれあい」（第3章 旧水族館の ふれあいの 磯、events/ch3/fureai.ts FureaiPanel）の 左の 絵を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：水の ぬけた 昔の タッチプールの 中、ごつごつした 岩の 上で まるく なった
// グソっ君（横から 少し 上の 寄り：触角・14本の 足・しっぽの 扇）、水の あった 高さの 白い 線、天井の
// 小窓から 落ちる 12:00 の 白い 光の 柱。グソっ君は 2D と 同じ 絵（frBody）を 厚みの ある 体に して
// 2D の 絵と 同じ px に 立てる（3か所の 印・指・選ぶ 枠は 2D の まま 上に：当たりと 合う）。

import * as THREE from 'three';
import { valueNoise } from '../../engine/rng';
import { h01 } from '../../art/tiles/noise';
import { frBody, FR_PIC } from '../../events/ch3/fureai';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { D0, gfxImg, pix, plane } from './_kit_e';

const W = 210;
const H = 112;
const { IW, IH } = FR_PIC;
const IX = Math.round((W - IW) / 2);
const IY = 2;

/** 旧水族館の 中（昼の 小窓の 光、白い タイルの 照り返し）。 */
const AQ_LIGHT: PanelLight = { sun: '#FFF6E0', sky: '#E0E4E8', ground: '#7A8080', fog: '#2E343C', sunI: 1.9, hemiI: 1.35, el: 72, az: 30 };

/** 乾いた 水槽の 底（灰色、白い 塩の つぶ）。 */
function floorImg(): HTMLCanvasElement {
  return pix('fr:floor', 64, 64, (p) => {
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const n = valueNoise(x / 6, y / 5, 7701);
        let c = n > 0.62 ? '#A8B0AC' : n < 0.3 ? '#8A9490' : '#9AA29E';
        if ((x * 7 + y * 13) % 29 === 0) c = '#D8DCD4';
        p.set(x, y, c);
      }
  });
}

/** 水槽の 奥の 壁（コンクリに 水の あった 高さの 白い 線、その 下は 水あか）。 */
function wallImg(): HTMLCanvasElement {
  return pix('fr:wall', 64, 48, (p) => {
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 64; x++) {
        const n = valueNoise(x / 8, y / 6, 7703);
        let c = y < 20 ? (n > 0.7 ? '#B8BEBA' : '#A8B0AC') : n > 0.6 ? '#8A9490' : '#7E8884';
        if (y === 20 || (y === 21 && x % 2 === 0)) c = '#E8ECE4';
        if (y > 21 && h01(x, y, 7705) > 0.96) c = '#6A746E';
        p.set(x, y, c);
      }
  });
}

/** 岩（2D の 岩の 形：上が 狭い 台形、ごつごつ）を パネルの px で。 */
function rockImg(): HTMLCanvasElement {
  return gfxImg('fr:rock', W, H, (g) => {
    for (let y = 60; y < IH + 6; y++) {
      const half = 92 - (y - 62) * 0.4 + Math.round(Math.sin(y * 1.7) * 2);
      for (let x = 104 - Math.round(half); x < 104 + half; x++) {
        const n = valueNoise(x / 5, y / 4, 7707);
        const c = y < 64 ? '#7A7064' : (x + y) % 5 === 0 ? '#6E6458' : n > 0.6 ? '#6A6054' : '#5E564C';
        g.px(IX + x, IY + y, c);
      }
    }
    // 岩の 上の 照り（光の 柱の 下）
    for (let x = 70; x < 140; x++) if (h01(x, 1, 7709) > 0.5) g.px(IX + x, IY + 61, '#9A8E7E');
  });
}

/** ほこりの 粒（光の 柱の 中）。 */
function dustImg(): HTMLCanvasElement {
  return pix('fr:dust', 40, 96, (p) => {
    for (let n = 0; n < 40; n++) p.set(Math.floor(h01(n, 1, 7711) * 40), Math.floor(h01(n, 2, 7713) * 96), '#FFF6D8');
  });
}
function solid(c: string): HTMLCanvasElement {
  return pix(`solid:${c}`, 4, 4, (p) => p.fill(c));
}

function build(k: Kit): void {
  const z = -D0;
  const px = k.pxAt(D0);
  // 水槽の 底（岩の 足もと）と 奥の 壁、手前の 縁
  const by = k.atDepth(0, IY + IH - 4, z)!.y;
  k.tiled(floorImg(), -20, 20, z - 8, z + 4, by, 16);
  const wz = z - 6;
  const wt = k.atDepth(0, -20, wz)!.y;
  k.box(-24, 24, by, wt, wz - 0.3, wz, { front: wallImg() });
  for (let x = -24; x < 24; x += 4) k.quad(wallImg(), [x, by, wz + 0.01], [x + 4, by, wz + 0.01], [x + 4, by + 3, wz + 0.01], [x, by + 3, wz + 0.01]);
  // 岩（グソっ君の 下）
  k.stand(rockImg(), k.atDepth(0, H, z - 0.5)!, { px: k.pxAt(D0 + 0.5), depth: 28, anchor: 'left' });
  // 奥の 小さな 岩（水槽の 中の ほかの 岩）
  const small = rockImg();
  for (const [x, s] of [[-7.5, 0.5], [6.8, 0.42]] as const)
    k.stand(small, new THREE.Vector3(x, by, wz + 2), { px: px * s, depth: 30, rows: [IY + 58, IY + IH + 6], cols: [IX + 20, IX + 190], tint: '#C8C4BC' });
  // グソっ君（2D と 同じ 絵を 厚みの ある 体に）
  const at = k.atDepth(IX, IY + IH, z)!;
  k.stand(frBody(), at, { px, depth: 22, anchor: 'left' });
  // 天井の 小窓から 落ちる 光の 柱（背中の 上）と ほこり
  const cx = k.atDepth(IX + 100, 0, z)!.x;
  plane(k, solid('#FFF6D8'), new THREE.Vector3(cx, by + 4, z - 1), 3, 9, { add: true, opacity: 0.16, order: 4 });
  plane(k, solid('#FFF6D8'), new THREE.Vector3(cx, by + 0.02, z - 1), 3.4, 2.4, { face: 'floor', add: true, opacity: 0.12, order: 4 });
  plane(k, dustImg(), new THREE.Vector3(cx, by + 4, z - 0.6), 2.5, 6, { add: true, opacity: 0.5, order: 5, unlit: true });
}

registerPanel3d('fureai', {
  cam: { fov: 24, pitch: 0, pos: [0, 0, 0], far: 200 },
  light: AQ_LIGHT,
  fog: [26, 70],
  shadow: { x: 0, z: -D0, hw: 12, hd: 10 },
  focus: 0.5,
  tilt: 0.45,
  build,
});
