// 大写し「夜の 海」（第3章 灯台の 名のり、events/ch3/nanori.ts NightSeaPanel）を HD-2D で（2026-11-23）。
// 防波堤の 石の ベンチから 見た クリア後の 夜：手前の 防波堤の ふち、左に テルの 灯台（夜の 影）、
// 沖の 島、港の 口の ブイ、夜の 漁の 船、暗い 海と 水平線。光（灯台・島・ブイ・船・星）は はかる 遊びの
// 物なので 2D の まま 上に（時間・位置を 変えない）。3D の 物は 光の 所（LIGHTS の x, y）に 合わせて 置く。

import * as THREE from 'three';
import { Rng } from '../../engine/rng';
import { LIGHTS } from '../../data/text/c3_nanori';
import { registerPanel3d } from '../panel3d';
import { bandSky, groundImg, pix, propImg } from './_kit_f';

/** 絵の 大きさ（NightSeaPanel の 左の 絵：RX - SX - 4 × CH）。 */
const W = 214;
const H = 112;
const HORIZON = 46;

/** 夜の 海（暗い 青、月の うすい 光の 筋）。 */
function nightSea(): HTMLCanvasElement {
  return pix('nn:sea', 64, 32, (p) => {
    const rng = new Rng(4401);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 64; x++) {
        const n = rng.next();
        p.set(x, y, n < 0.08 ? '#08101F' : n > 0.95 ? '#16224A' : '#0C1830');
      }
    for (let k = 0; k < 7; k++) {
      const y = (k * 9 + 2) % 32;
      const x = (k * 23) % 64;
      for (let i = 0; i < 4 + (k % 4); i++) p.set((x + i) % 64, y, '#1C2C58');
    }
  });
}

const at = (id: string) => LIGHTS.find((l) => l.id === id)!;

registerPanel3d('nanori', {
  cam: { fov: 24, pitch: 2.1, pos: [0, 2.6, 0], far: 3000 },
  light: { sun: '#a8b8ff', sky: '#5a68a0', ground: '#2a2a40', fog: '#141C3C', sunI: 1.1, hemiI: 2.1, el: 40, az: 200 },
  fog: [120, 2200],
  shadow: null,
  focus: 0.8,
  tilt: 1.0,
  build(k) {
    k.sky(bandSky('nn:sky', [[0, '#0A1028'], [0.3, '#0E1430'], [0.41, '#141C3C'], [0.42, '#0C1830'], [1, '#0A1428']]));
    // 海
    k.tiled(nightSea(), -3000, 3000, -3000, 4, 0, 3);
    // 手前の 防波堤の ふち（石の ベンチの 前）
    const BW = 1.5;
    const edge = k.ground(W / 2, H - 8, BW);
    if (edge) {
      const conc = groundImg('c3_bouhatei', 64, 16);
      k.box(-40, 40, -0.6, BW, edge.z, 2, { top: conc, front: conc });
    }
    // テルの 灯台：灯の 所が 2D の 光（teru）に 来る ように
    const toudai = propImg('prop_c3_toudai');
    const T = at('teru');
    const Z = -11;
    const BT = 0.9;
    const near = k.atDepth(T.x, H - 4, Z);
    const top = k.atDepth(T.x, T.y - 10, Z);
    const ROWS = 82;
    if (toudai && near && top) {
      const foot = new THREE.Vector3(near.x, BT, Z);
      const px = (top.y - BT) / ROWS;
      const conc = groundImg('c3_bouhatei', 64, 16);
      k.box(foot.x - 14, foot.x + 1.0, -0.5, BT, Z - 1.2, Z + 0.8, { front: conc, top: conc, right: conc });
      k.stand(toudai, foot, { px, depth: 8, rows: [0, ROWS] });
    }
    // 沖の 島（水平線の 上の 低い 影）
    // （霧に とけない 近さに：山の 稜線が 夜空より 少し 明るく 見える）
    const IZ = -520;
    const islA = k.atDepth(124, HORIZON, IZ);
    const islB = k.atDepth(154, HORIZON, IZ);
    const islT = k.atDepth(140, HORIZON - 7, IZ);
    if (islA && islB && islT) {
      const body = pix('nn:isl', 16, 16, (p) => {
        p.fill('#1A2244');
        p.hline(0, 15, 0, '#34406E');
        for (let x = 0; x < 16; x += 5) p.set(x, 3 + (x % 3), '#222A52');
      });
      const h = islT.y;
      const w = islB.x - islA.x;
      k.box(islA.x, islB.x, -1, h * 0.55, IZ - 20, IZ, { front: body, top: body });
      k.box(islA.x + w * 0.27, islB.x - w * 0.25, -1, h, IZ - 30, IZ - 5, { front: body, top: body });
    }
    // 港の 口の ブイ（緑の 灯が 上）
    const buoy = pix('nn:buoy', 9, 16, (p) => {
      // 灯の 枠（上）、緑の 塗りの 胴、海に つかる 赤い 下
      p.rect(3, 0, 3, 4, '#3A4048');
      p.rect(1, 4, 7, 2, '#2A3038');
      p.poly([[1, 6], [7, 6], [8, 13], [0, 13]], '#2E7A4A');
      p.vline(2, 7, 12, '#4A9A64');
      p.rect(0, 13, 9, 3, '#8A2A22');
      p.outline('#10141E');
    });
    const B = at('buoy');
    const bz = -17;
    const bFoot = k.atDepth(B.x, B.y + 10, bz);
    const bTop = k.atDepth(B.x, B.y - 1, bz);
    if (buoy && bFoot && bTop) k.stand(buoy, new THREE.Vector3(bFoot.x, -0.15, bz), { px: (bTop.y + 0.15) / buoy.height, depth: 6 });
    // 夜の 漁の 船（灯の 下に 船体）
    const fune = propImg('prop_c3_fune', { hull: '#C8D0D8' });
    const G = at('gyosen');
    const gz = -160;
    const gAt = k.atDepth(G.x, G.y + 4, gz);
    if (fune && gAt) {
      const px = k.pxAt(-gz) * 0.5;
      k.stand(fune, new THREE.Vector3(gAt.x, 0, gz), { px, depth: 10, rows: [4, 36], tint: '#7880a0' });
    }
  },
});
