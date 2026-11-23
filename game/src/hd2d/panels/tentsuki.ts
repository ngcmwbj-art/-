// 大写し「天突き」（第3章 つるっと、終われる、events/ch3/tokoro.ts TentsukiPanel）を HD-2D で（2026-11-23）。
// 食堂かもめの 台所の カウンター：奥に 白い タイルの 壁（目地）、手前に 木の 台（天板と 前の 板）、左に
// 半分 切った ところてんの 流し箱（金物の 箱に 白く すけた 寒天）、筒の 下の 青い どんぶり（2D と 同じ 所・
// 同じ 大きさ）。天突きの 筒・突き棒・手・出て くる ところてんは 遊びの 物なので 2D の まま 上に。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { h01 } from '../../art/tiles/noise';
import { registerPanel3d } from '../panel3d';
import { lathe, disc, pix } from './_kit_f';

/** 絵の 大きさ（左：RX - SX - 4 × CH）。 */
const W = 202;
const H = 112;
/** 台の 奥（壁と 天板の さかい）・前の ふち（パネルの px）。 */
const BACK = 92;
const FRONT = 100;
/** どんぶり（筒の 真下：2D の NX - SX）。 */
const BX = 100;

/** 白い タイルの 壁（目地 12 × 10 px、1 ドット = パネル 1px）。 */
function wallImg(): HTMLCanvasElement {
  return pix('tk:wall', W, BACK, (p) => {
    for (let y = 0; y < BACK; y++)
      for (let x = 0; x < W; x++) {
        let c = h01(x >> 2, y >> 2, 7311) > 0.85 ? '#E8E4DA' : '#E2DED2';
        if ((y - 8 + 100) % 10 === 0) c = '#CFCABC';
        else if ((x - 6 + 120) % 12 === 0) c = '#D6D1C4';
        else if ((y - 9 + 100) % 10 === 0) c = '#F0ECE2';
        p.set(x, y, c);
      }
  });
}

function woodTop(): HTMLCanvasElement {
  return pix('tk:top', 48, 16, (p) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 48; x++) p.set(x, y, h01(x >> 3, y, 7321) > 0.7 ? '#D2AA74' : '#C8A06A');
    p.hline(0, 47, 15, '#E8C890');
  });
}
function woodFront(): HTMLCanvasElement {
  return pix('tk:front', 48, 16, (p) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 48; x++) p.set(x, y, h01(x, y >> 1, 7331) > 0.75 ? '#7A4E32' : '#8A5A3A');
    p.hline(0, 47, 0, '#A87A4A');
  });
}
function metal(): HTMLCanvasElement {
  return pix('tk:metal', 16, 8, (p) => {
    p.fill('#A8B0B8');
    p.hline(0, 15, 0, '#C8CED4');
    p.hline(0, 15, 7, '#7A828C');
  });
}
/** 流し箱の 中の 寒天（白く すける、切った 面）。 */
function kantenImg(): HTMLCanvasElement {
  return pix('tk:kanten', 24, 12, (p) => {
    p.fill('#D8DCC8');
    p.hline(0, 23, 0, '#ECEEE0');
    for (let x = 2; x < 24; x += 5) p.set(x, 4 + (x % 3), '#E4E8D6');
  });
}

registerPanel3d('tentsuki', {
  cam: { fov: 26, pitch: 6, pos: [0, 0.9, 0], far: 60 },
  light: 'room',
  fog: null,
  shadow: { x: 0, z: -4, hw: 3, hd: 3 },
  focus: 0.7,
  tilt: 0.6,
  build(k) {
    const back = k.ground(W / 2, BACK, 0)!;
    const front = k.ground(W / 2, FRONT, 0)!;
    const zw = back.z;
    const zf = front.z;
    // 壁（パネルの 0..BACK に ぴったり）
    const a = k.atDepth(0, 0, zw)!;
    const b = k.atDepth(W, BACK, zw)!;
    const ex = (b.x - a.x) * 0.04;
    k.quad(wallImg(), [a.x - ex, 0, zw], [b.x + ex, 0, zw], [b.x + ex, a.y, zw], [a.x - ex, a.y, zw]);
    // 台：天板と 前の 板
    k.box(-8, 8, -3, 0, zw - 0.01, zf, { top: woodTop(), front: woodFront() });
    // 流し箱（左、半分 切った）
    const zc = zw + 0.25;
    const l = k.ground(14, BACK, 0)!;
    const r = k.ground(54, BACK, 0)!;
    const xl = l.x * (k.camera.position.z - zc) / (k.camera.position.z - zw);
    const xr = r.x * (k.camera.position.z - zc) / (k.camera.position.z - zw);
    const hh = 8 * k.pxAt(k.camera.position.z - zc);
    const mt = metal();
    k.box(xl, xr, 0, hh, zc - 0.45, zc, { front: mt, top: mt, left: mt, right: mt });
    // 中の 寒天（左 半分 だけ 残って いる）
    k.box(xl + 0.03, xl + (xr - xl) * 0.58, hh * 0.3, hh + 0.012, zc - 0.42, zc - 0.03, { top: kantenImg(), front: kantenImg(), right: kantenImg() });
    // どんぶり（筒の 真下）：上の ふちが 2D の 80px、幅 36px
    const zb = zw + 0.45;
    const d = k.camera.position.z - zb;
    const px = k.pxAt(d);
    const c = k.ground(BX, BACK, 0)!;
    const cx = c.x * d / (k.camera.position.z - zw);
    const R = 18 * px;
    const hgt = 12 * px;
    const bowlImg = pix('tk:bowl', 4, 16, (p) => {
      for (let y = 0; y < 16; y++) p.rect(0, y, 4, 1, mix('#3A4A7A', '#5A6A9A', y / 15));
      p.rect(0, 14, 4, 2, '#F4F1E8');
    });
    lathe(k, [[0, 0], [R * 0.45, 0], [R * 0.5, hgt * 0.08], [R * 0.86, hgt * 0.55], [R, hgt], [R * 0.95, hgt], [R * 0.8, hgt * 0.5], [R * 0.4, hgt * 0.15], [0, hgt * 0.15]], new THREE.Vector3(cx, 0, zb), { img: bowlImg });
    disc(k, R * 0.42, new THREE.Vector3(cx, hgt * 0.16, zb), { color: '#2A3A6A' });
  },
});
