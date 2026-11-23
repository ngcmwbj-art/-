// 大写し「ザリガニは 可」（第1章 田んぼの 水路の ザリガニ釣り、events/tsuri.ts TsuriPanel）を HD-2D で。
//
// 見せる 物は 2D の 絵（art/props/tsuri_art.ts sceneBg）と 同じ：夕方の 空と 向こうの 家並み、畦の のり面
// （土の 壁・水口の 土管・垂れた 草）、水の 中の のり面と ザリガニの 穴、水口の 石、古い 土管、底の 泥。
// 奥行きの ある 層に 分けて（hd2d/panels/_water_a.ts buildCross）、底は 手前へ のびる 面、水口の 石は
// 押し出して 影を 落とす。光の すじは 足し算、水の 色は 手前に うすく。
// ザリガニ・するめ・糸・網・落ちる 水・泡は 2D の まま 上に 重ねる（tsuri.ts drawScene）。

import { FLOOR_Y, SCN_H, SCN_W, SPOTS, STAGE_SKY, WATER_Y, sceneBg } from '../../art/props/tsuri_art';
import { registerPanel3d } from '../panel3d';
import { buildCross } from './_water_a';

registerPanel3d('tsuri', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 400 },
  light: 'eve',
  fog: null,
  shadow: { x: 0, z: -12, hw: 12, hd: 6 },
  focus: 0.62,
  tilt: 0.8,
  build(k, s) {
    const st = Math.max(0, Math.min(2, Number(s.stage ?? 0)));
    const [sx0] = SPOTS.ishi.home;
    buildCross(k, {
      W: SCN_W,
      H: SCN_H,
      WY: WATER_Y,
      FY: FLOOR_Y,
      bg: sceneBg(st),
      key: `tsuri${st}`,
      skyY: 9,
      water: STAGE_SKY[st].water,
      deep: '#2E4A44',
      bedBase: ['#4A3426', '#3A2B2A', '#2E2230'],
      bedGrit: ['#6A6A70', '#8A7A4A'],
      // 水口の 石（2D の 背景と 同じ 所）
      stones: [[sx0 + 12, FLOOR_Y - 8, 12, 8], [sx0 - 4, FLOOR_Y - 6, 9, 6], [sx0 + 26, FLOOR_Y - 4, 7, 5]],
      shafts: [40, 104, 168, 230, 290],
    });
  },
});
