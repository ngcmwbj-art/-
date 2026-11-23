// 大写し「待つ 釣り」（第1章 堰の 下の 淵の テナガエビ釣り、events/seki_tsuri.ts SekiPanel）を HD-2D で。
//
// 見せる 物は 2D の 絵（art/props/seki_tsuri_art.ts sekiBg）と 同じ：夕方の 空と 向こう岸の 木、左の 堰
// （コンクリの 段と 落ちる 水の 幕）、右の 石の 護岸と 上の 草、水の 中の 石の 山と すき間、沈んだ 流木、
// 底の 砂と 堰の 下の 大きな 石。奥行きの ある 層に 分けて（hd2d/panels/_water_a.ts buildCross）、
// 底は 手前へ のびる 面、底の 石は 押し出して 影を 落とす。光の すじは 足し算、水の 色は 手前に うすく。
// エビ・浮き・糸・網・泡・落ちる 水の すじ・点は 2D の まま 上に 重ねる（seki_tsuri.ts drawScene）。

import { SCN_H, SCN_W, SK_FALL, SK_FLOOR_Y, SK_WATER_Y, sekiBg } from '../../art/props/seki_tsuri_art';
import { STAGE_SKY } from '../../art/props/tsuri_art';
import { registerPanel3d } from '../panel3d';
import { buildCross } from './_water_a';

registerPanel3d('seki', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 400 },
  light: 'eve',
  fog: null,
  shadow: { x: 0, z: -12, hw: 12, hd: 6 },
  focus: 0.62,
  tilt: 0.8,
  build(k, s) {
    const st = Math.max(0, Math.min(2, Number(s.stage ?? 0)));
    buildCross(k, {
      W: SCN_W,
      H: SCN_H,
      WY: SK_WATER_Y,
      FY: SK_FLOOR_Y,
      bg: sekiBg(st),
      key: `seki${st}`,
      skyY: 9,
      split: [SK_FALL.x1 + 8, SK_FALL.crest - 2],
      water: STAGE_SKY[st].water,
      deep: '#1E3A3A',
      bedBase: ['#6E6450', '#544C40', '#3E3A34'],
      bedGrit: ['#9A9282', '#B8B09A'],
      // 堰の 下の 大きな 石（2D の 背景と 同じ）
      stones: [[20, 96, 14, 9], [52, 101, 9, 5], [94, 99, 8, 5], [292, 101, 10, 5], [318, 98, 9, 7]],
      shafts: [46, 110, 160, 222, 276],
    });
  },
});
