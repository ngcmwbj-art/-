// 大写し「塩の 輪」（第3章 水槽の うら、events/ch3/aq_ura.ts ShioPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：うらの 部屋の 灰色の 光の 中、鉄の 棚に 置かれた からっぽの 予備水槽を
// 寄りで。水が ひいて 塩だけ 残った 白い 輪が ガラスに 10段、底に 塩の かたまり、ガラスの 光。
// 立体に した ので 輪は 前の ガラスだけで なく 横と 奥の ガラスにも 一周 回って 見える（水位の 跡）。
// 部屋の 壁は フィールドの うらの 部屋と 同じ 色（しっくいの 灰緑、腰の 濃い 帯、むき出しの 蛍光灯と 配管）。

import * as THREE from 'three';
import { valueNoise } from '../../engine/rng';
import { h01 } from '../../art/tiles/noise';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { D0, mix, pix, plane, propImg } from './_kit_e';

/** 2D の 水槽（パネルの px）。 */
const GX = 60;
const GY = 10;
const GW = 210;
const GH = 84;
/** 水槽の 奥行き（単位）。 */
const DEPTH = 4.2;

const STEEL = '#6B7186';

/** うらの 部屋の 光：むき出しの 蛍光灯（白緑）、上から。 */
const URA_LIGHT: PanelLight = { sun: '#F0F6EC', sky: '#E8F0E4', ground: '#4A5048', fog: '#2E322E', sunI: 1.5, hemiI: 1.55, el: 62, az: 15 };

/** 輪の 高さ（水槽の 上からの px、2D と 同じ）。 */
function ringY(r: number, x: number): number {
  return 12 + r * 7 + Math.round(Math.sin(x / 13 + r) * 0.8);
}

/** ガラスの 面（w × GH ドット）：白い 輪 10段、底の 塩。back：奥の ガラス（少し 青く 淡い）。 */
function glassImg(kind: 'front' | 'back' | 'side', w: number): HTMLCanvasElement {
  return pix(`shio:${kind}:${w}`, w, GH, (p) => {
    const dim = kind === 'front' ? 0 : kind === 'side' ? 0.18 : 0.3;
    for (let r = 0; r < 10; r++) {
      const c = mix(r % 3 === 0 ? '#FFFFFF' : '#E8ECEA', '#9AB0B8', dim);
      for (let x = 0; x < w; x++) {
        const y = ringY(r, x + (kind === 'back' ? 7 : 0));
        p.set(x, y, c);
        if ((x + r) % 4 === 0) p.set(x, y + 1, mix('#D8DCD8', '#9AB0B8', dim));
        // 塩の 小さな 粒（輪の 下に ぽつぽつ）
        if (h01(x, r, 7411 + w) > 0.86) p.set(x, y + 2, mix('#F4F6F2', '#9AB0B8', dim + 0.2));
      }
    }
    // 底の 塩の かたまり（前の ガラスの 下の 帯）
    p.rect(0, GH - 6, w, 6, mix('#E8E8E0', '#9AB0B8', dim));
    for (let x = 0; x < w; x += 3) p.set(x, GH - 7, mix('#F8F8F4', '#9AB0B8', dim));
  });
}

/** 底の 塩（上から）：白い ざらざら。 */
function saltImg(): HTMLCanvasElement {
  return pix('shio:salt', 64, 32, (p) => {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 64; x++) {
        const n = valueNoise(x / 5, y / 4, 7413);
        p.set(x, y, n > 0.66 ? '#F8F8F4' : n > 0.35 ? '#E8E8E0' : '#D8D8CE');
      }
  });
}

/** うらの 部屋の 壁：しっくいの 灰緑、天井から の しみ、下に 濃い 腰の 帯と 配管 2本。 */
function wallImg(): HTMLCanvasElement {
  return pix('shio:wall', 128, 96, (p) => {
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 128; x++) {
        let c = valueNoise(x / 8, y / 6, 7307) > 0.75 ? '#B8BCB0' : '#ACB0A4';
        if (y < 30 && valueNoise(x / 11, 0.5, 7309) > 0.7) c = mix(c, '#8A8A7A', 0.4);
        if (y >= 80) c = y === 80 ? '#6A7A6A' : '#4A5A4A';
        p.set(x, y, c);
      }
    // 配管（2本）と 赤い 弁
    for (const [y, a, b] of [[60, '#7A8A8A', '#5A6A6A'], [65, '#8A7A6A', '#6A5A4A']] as const) {
      p.hline(0, 127, y, a);
      p.hline(0, 127, y + 1, b);
    }
    p.rect(90, 57, 4, 3, '#C8452E');
    p.set(91, 56, '#E86A4E');
    // 古い 貼り紙（字は 線）
    p.rect(20, 22, 12, 8, '#E8D9B5');
    p.hline(22, 29, 24, '#3A3F48');
    p.hline(22, 27, 27, '#3A3F48');
  });
}

/** 鉄の 棚の 前の 面（リベット、すり傷）。 */
function shelfImg(): HTMLCanvasElement {
  return pix('shio:shelf', 64, 16, (p) => {
    p.fill('#5A6070');
    p.hline(0, 63, 0, '#8A90A0');
    p.hline(0, 63, 1, '#6B7186');
    p.hline(0, 63, 15, '#3A3E46');
    for (let x = 4; x < 64; x += 16) p.set(x, 4, '#8A90A0');
    for (let x = 0; x < 64; x++) if (h01(x, 3, 7415) > 0.9) p.set(x, 8 + (x % 5), '#4A5060');
  });
}
function shelfTopImg(): HTMLCanvasElement {
  return pix('shio:shelfTop', 64, 16, (p) => {
    p.fill('#6B7186');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 64; x++) if (h01(x, y, 7417) > 0.94) p.set(x, y, '#7A8096');
    p.hline(0, 63, 15, '#8A90A0');
  });
}
function solid(c: string): HTMLCanvasElement {
  return pix(`solid:${c}`, 4, 4, (p) => p.fill(c));
}
/** 蛍光灯（白い 管）。 */
function tubeImg(lit: boolean): HTMLCanvasElement {
  return pix(`shio:tube:${lit}`, 32, 4, (p) => {
    p.fill('#7A7C76');
    p.hline(1, 30, 1, lit ? '#F4F6EE' : '#9A9C96');
    p.hline(1, 30, 2, lit ? '#E8ECE4' : '#8A8C86');
  });
}

function build(k: Kit): void {
  const z1 = -D0;
  const z0 = z1 - DEPTH;
  const tl = k.atDepth(GX, GY, z1)!;
  const br = k.atDepth(GX + GW, GY + GH, z1)!;
  const x0 = tl.x;
  const x1 = br.x;
  const yt = tl.y;
  const yb = br.y;
  // 部屋の 壁（奥）と 床
  const wz = z0 - 3.2;
  const wall = wallImg();
  const wTop = k.atDepth(0, -10, wz)!;
  const wBot = yb - 3.4;
  k.box(-40, 40, wBot, wTop.y + 2, wz - 0.2, wz, { front: wall });
  // （壁の 絵を くり返す：quad を 横に 並べる）
  for (let x = -40; x < 40; x += 8) k.quad(wall, [x, wBot, wz + 0.01], [x + 8, wBot, wz + 0.01], [x + 8, wBot + 6, wz + 0.01], [x, wBot + 6, wz + 0.01]);
  k.tiled(pix('shio:floor', 64, 64, (p) => {
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) p.set(x, y, valueNoise(x / 9, y / 7, 7301) > 0.62 ? '#A8A69C' : '#9C9A90');
    p.vline(63, 0, 63, '#86847C');
  }), -40, 40, wz, 4, wBot, 16);
  // むき出しの 蛍光灯（壁の 上、ひとつ おきに 点く）
  for (const [i, tx] of [-12, -4, 4, 12].entries()) {
    const lit = i % 2 === 0;
    plane(k, tubeImg(lit), new THREE.Vector3(tx, wTop.y - 0.6, wz + 0.15), 2.2, 0.28, { unlit: true });
    if (lit) plane(k, solid('#E8F4EE'), new THREE.Vector3(tx, wTop.y - 1.6, wz + 0.12), 4.5, 2.4, { add: true, opacity: 0.12 });
  }
  // 鉄の 棚：天板（水槽の 下）と 前の 面、脚
  const st = yb - 0.15;
  k.box(-30, 30, st - 0.9, st, z0 - 0.8, z1 + 1.1, { front: shelfImg(), top: shelfTopImg() });
  for (const lx of [-17, -2, 15]) k.box(lx, lx + 0.35, wBot, st - 0.9, z1 + 0.6, z1 + 1.0, { front: solid('#4A5060'), left: solid('#3A3E46'), right: solid('#3A3E46') });
  // 水槽：奥と 横の ガラスの 輪、底の 塩、前の ガラス
  const back = glassImg('back', GW);
  k.quad(back, [x0, yb, z0], [x1, yb, z0], [x1, yt, z0], [x0, yt, z0]);
  const side = glassImg('side', 64);
  k.quad(side, [x0, yb, z1], [x0, yb, z0], [x0, yt, z0], [x0, yt, z1]);
  k.quad(side, [x1, yb, z0], [x1, yb, z1], [x1, yt, z1], [x1, yt, z0]);
  // 底の 塩（上の 面）と 前の ガラスの 輪
  k.tiled(saltImg(), x0, x1, z0, z1, yb + 6 / 16, 16);
  const front = glassImg('front', GW);
  k.quad(front, [x0, yb, z1 + 0.01], [x1, yb, z1 + 0.01], [x1, yt, z1 + 0.01], [x0, yt, z1 + 0.01]);
  // 鉄の 枠（角の 柱、上と 下の 縁）
  const steel = solid(STEEL);
  const steelLt = solid('#8A90A0');
  const e = 0.12;
  for (const x of [x0, x1])
    for (const z of [z0, z1]) k.box(x - e, x + e, yb - e, yt + e, z - e, z + e, { front: steel, left: steelLt, right: steel, top: steelLt });
  for (const y of [yb, yt]) {
    k.box(x0 - e, x1 + e, y - e, y + e, z1 - e, z1 + e, { front: steel, top: steelLt });
    k.box(x0 - e, x1 + e, y - e, y + e, z0 - e, z0 + e, { front: steel, top: steelLt });
    k.box(x0 - e, x0 + e, y - e, y + e, z0, z1, { top: steelLt, left: steel });
    k.box(x1 - e, x1 + e, y - e, y + e, z0, z1, { top: steelLt, right: steel });
  }
  // ガラスの 色（うすい 青灰）と 光（2D と 同じ 縦の 2本）
  plane(k, solid('#B8CCD2'), new THREE.Vector3((x0 + x1) / 2, (yt + yb) / 2, z1 - 0.03), x1 - x0, yt - yb, { opacity: 0.16, unlit: true, order: 2 });
  plane(k, solid('#9AB0B8'), new THREE.Vector3((x0 + x1) / 2, (yt + yb) / 2, z0 + 0.02), x1 - x0, yt - yb, { opacity: 0.32, unlit: true, order: 1 });
  const px = k.pxAt(D0);
  const shineH = (GH - 12) * px;
  plane(k, solid('#F4FAFC'), new THREE.Vector3(x0 + 15.5 * px, yt - 4 * px - shineH / 2, z1 + 0.05), 3 * px, shineH, { opacity: 0.5, unlit: true, order: 3 });
  plane(k, solid('#F4FAFC'), new THREE.Vector3(x0 + 20.5 * px, yt - 4 * px - shineH / 2, z1 + 0.05), 1 * px, shineH, { opacity: 0.4, unlit: true, order: 3 });
  // 蛍光灯の 映りこみ（前の ガラスの 上に 横に 2本）と、棚の 天板に 落ちる 光
  plane(k, solid('#FFFFFF'), new THREE.Vector3(x0 + (x1 - x0) * 0.62, yt - 2.2 * px, z1 + 0.06), (x1 - x0) * 0.22, 1 * px, { opacity: 0.55, unlit: true, order: 3 });
  plane(k, solid('#FFFFFF'), new THREE.Vector3(x0 + (x1 - x0) * 0.25, yt - 2.2 * px, z1 + 0.06), (x1 - x0) * 0.16, 1 * px, { opacity: 0.4, unlit: true, order: 3 });
  plane(k, solid('#E8F4EE'), new THREE.Vector3(0, st + 0.02, z1 + 0.5), 34, 1.4, { face: 'floor', add: true, opacity: 0.14 });
  // 棚の 上の ほかの 物：右に 比重計の 棚、左の 奥に 真水の タンク（フィールドの 小物）
  const hijuu = propImg('prop_c3_ura_hijuu');
  if (hijuu) k.stand(hijuu, new THREE.Vector3(x1 + 2.6, st, z1 - 1.2), { px: px * 1.1, depth: 6 });
  const tank = propImg('prop_c3_ura_tank');
  if (tank) k.stand(tank, new THREE.Vector3(x0 - 4.2, wBot, wz + 1.4), { px: px * 1.5, depth: 10 });
}

registerPanel3d('aq_shio', {
  cam: { fov: 24, pitch: 4, pos: [0, 0, 0], far: 200 },
  light: URA_LIGHT,
  fog: [34, 90],
  shadow: { x: 0, z: -D0 - 3, hw: 18, hd: 10 },
  focus: 0.5,
  tilt: 0.45,
  build,
});
