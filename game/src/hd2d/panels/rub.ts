// 大写し「下の 紙の 字」（第3章、events/ch3/shita.ts RubPanel）を HD-2D で（2026-11-23）。
// 紙が 中身の 大写しなので、紙そのものは 2D の 絵と 同じ 所・同じ 大きさに 置き、まわりを 立体に：
// 旧水族館の 券売所の 木の 台（板の 目、天井の 明かり）、その 上の 入場券の つづり（紙の 束の 厚み、
// 下の 紙の ふち、台に 落ちる 影）。こすった 黒鉛・浮かぶ 字・えんぴつは 遊びの 物なので 2D の まま 上に。

import { mix } from '../../engine/pixel';
import { h01 } from '../../art/tiles/noise';
import { registerPanel3d } from '../panel3d';
import { pix } from './_kit_f';

/** つづり（2D と 同じ：パネルの px）。 */
const PX0 = 10;
const PY0 = 8;
const PW = 212;
const PH = 96;
/** 紙の 束の 厚み（単位）。 */
const PAD = 0.14;

/** 券売所の 台（こげ茶の 板、縦の 目地、木目）。 */
function counterImg(): HTMLCanvasElement {
  return pix('rb:counter', 36, 32, (p) => {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 36; x++) {
        const n = h01(x, y >> 2, 9101);
        let c = n > 0.8 ? '#64523F' : n < 0.2 ? '#4E4032' : '#5A4A3A';
        if (x % 9 === 0) c = '#3E3226';
        if (x % 9 === 1) c = '#6A5844';
        p.set(x, y, c);
      }
  });
}

/** いちばん 上の 紙（白に 近い クリーム、上の 帯は うすい 赤）。1 ドット = パネル 1px。 */
function sheetImg(): HTMLCanvasElement {
  return pix('rb:sheet', PW, PH, (p) => {
    for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) p.set(x, y, h01(x, y, 9111) > 0.985 ? '#EEE8DA' : '#F8F4EA');
    p.rect(0, 0, PW, 12, '#E8C8C0');
    p.hline(0, PW - 1, 12, '#C8A8A0');
  });
}

/** 束の 横（紙の 重なりの すじ）。 */
function edgeImg(): HTMLCanvasElement {
  return pix('rb:edge', 32, 8, (p) => {
    for (let y = 0; y < 8; y++) p.hline(0, 31, y, y % 2 ? '#D8D2C2' : mix('#E8E2D2', '#C8C0AE', y / 8));
  });
}

registerPanel3d('rub', {
  cam: { fov: 30, pitch: 90, pos: [0, 6, 0], far: 50 },
  light: { sun: '#fff4e4', sky: '#f4ece0', ground: '#b8a890', fog: '#3a3028', sunI: 1.35, hemiI: 1.9, el: 62, az: 140 },
  fog: null,
  shadow: { x: 0, z: 0, hw: 4, hd: 3 },
  focus: 0.5,
  tilt: 0.35,
  build(k) {
    k.tiled(counterImg(), -10, 10, -6, 6, 0, 16);
    // 下の 紙（右下へ 少し ずれて ふちが 見える）
    const edge = edgeImg();
    const b0 = k.ground(PX0 + 3, PY0 + 3, PAD - 0.05)!;
    const b1 = k.ground(PX0 + 3 + PW, PY0 + 3 + PH, PAD - 0.05)!;
    k.box(b0.x, b1.x, 0, PAD - 0.05, b0.z, b1.z, { top: pix('rb:under', 4, 4, (p) => p.fill('#D8D2C2')), front: edge, right: edge, left: edge });
    const m0 = k.ground(PX0 + 1, PY0 + 1, PAD - 0.02)!;
    const m1 = k.ground(PX0 + 1 + PW, PY0 + 1 + PH, PAD - 0.02)!;
    k.box(m0.x, m1.x, PAD - 0.05, PAD - 0.02, m0.z, m1.z, { top: pix('rb:mid', 4, 4, (p) => p.fill('#E8E2D2')), front: edge, right: edge });
    // いちばん 上の 紙（2D の 黒鉛・字と ぴったり 重なる 所）
    const t0 = k.ground(PX0, PY0, PAD)!;
    const t1 = k.ground(PX0 + PW, PY0 + PH, PAD)!;
    k.box(t0.x, t1.x, PAD - 0.02, PAD, t0.z, t1.z, { top: sheetImg(), front: edge, right: edge, left: edge });
  },
});
