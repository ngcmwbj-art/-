// 大写し「鉄棒」（第2章 分校の 校庭の 夜、events/ch2/tetsubou.ts TetsuPanel）を HD-2D で（2026-11-23 依頼主
// 「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜の 校庭の 3段の 鉄棒（手前が いちばん 低い 段、奥の 2段は 右へ 高く）、
// 校庭の 土、トマトの 灯り（しゅんの まわり）、星。奥に フィールドの 分校（prop_h_bld_school）の 前の 壁。
// 鉄棒の 柱と 棒は 2D と 同じ px（パネルの 2D の 座標を Kit.atDepth で 同じ 所）に 立てる：2D の まま 上に
// 描く しゅん（ぶら下がり・体を 上げる 動き）・グソっ君・まつ先生・手の あと・数・ゲージが 棒と 合う。
// 段階0（state.dark：灯りなし）は 暗く。

import * as THREE from 'three';
import { registerPanel3d, type Kit } from '../panel3d';
import { building, CH2_NIGHT, hGround, nightSky, paint } from './_kit_c';

const BAR_Y = 30;
const BAR_X0 = 34;
const BAR_X1 = 206;
const GROUND_Y = 92;
const SHUN_X = 62;
const D = 5;

const post = () =>
  paint('tt:post', 4, 16, (p) => {
    p.fill('#7A8094');
    p.vline(0, 0, 15, '#9AA0B4');
    p.vline(3, 0, 15, '#5A6074');
  });
const rail = () =>
  paint('tt:rail', 16, 4, (p) => {
    p.fill('#A0907A');
    p.hline(0, 15, 0, '#C0B09A');
    p.hline(0, 15, 3, '#7A6A58');
  });
const backPost = () => paint('tt:bpost', 4, 16, (p) => p.fill('#5A6074'));

/** 2D の 四角（パネルの px：x, y, w, h）の 柱・棒を 奥行き z の 面に（太さ = 幅）。 */
function bar(k: Kit, x: number, y: number, w: number, h: number, z: number, img: HTMLCanvasElement, y0?: number): void {
  const a = k.atDepth(x, y + h, z)!;
  const b = k.atDepth(x + w, y, z)!;
  const t = Math.min(b.x - a.x, b.y - a.y);
  k.box(a.x, b.x, y0 ?? a.y, b.y, z - t, z, { front: img, top: img, left: img, right: img });
}

registerPanel3d('tetsubou', {
  cam: { fov: 30, pitch: 0, pos: [0, 0, 0], far: 200 },
  light: CH2_NIGHT,
  fog: [10, 40],
  shadow: { x: 0, z: -6, hw: 7, hd: 6 },
  focus: 0.55,
  tilt: 0.8,
  build(k, s) {
    k.sky(nightSky(0.3, 1.2));
    const fl = k.atDepth(100, GROUND_Y, -D)!.y;
    k.tiled(hGround('h_kotei', 64, 64), -40, 40, -40, 2, fl, 16);
    building(k, 'prop_h_bld_school', -15, fl, -24, 0.16, { roofDepth: 6, roofRise: 2.4 });
    // 低い 段：柱 2本と 棒
    bar(k, BAR_X0, BAR_Y - 2, 3, GROUND_Y - BAR_Y + 2, -D, post(), fl);
    bar(k, BAR_X1 - 3, BAR_Y - 2, 3, GROUND_Y - BAR_Y + 2, -D, post(), fl);
    bar(k, BAR_X0, BAR_Y, BAR_X1 - BAR_X0, 3, -D, rail());
    // 奥の 2段（右へ 高く：少し 奥に）
    const z2 = -D - 0.6;
    bar(k, BAR_X1 - 70, BAR_Y - 22, 2, GROUND_Y - BAR_Y + 22, z2, backPost(), fl);
    bar(k, BAR_X1 - 40, BAR_Y - 14, 2, GROUND_Y - BAR_Y + 14, z2, backPost(), fl);
    bar(k, BAR_X1 - 70, BAR_Y - 22, 70, 2, z2, rail());
    bar(k, BAR_X1 - 110, BAR_Y - 14, 70, 2, z2, rail());
    // トマトの 灯り（しゅんの まわり）
    if (!s.dark) {
      const at = k.atDepth(SHUN_X, BAR_Y + 20, -D)!;
      const lamp = new THREE.PointLight('#FFB070', 4, 4, 1.4);
      lamp.position.set(at.x, at.y, -D + 0.8);
      k.scene.add(lamp);
    }
  },
});
