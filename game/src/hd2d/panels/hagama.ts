// 大写し「羽釜の 中」（水加減）と「かまど」（はじめ ちょろちょろ）（第2章 ペロの 家の 土間、
// events/ch2/hagama.ts MizuPanel・HiPanel）を HD-2D で（2026-11-23 依頼主「ミニゲームの絵が雑すぎるから
// …HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：
//   hg_mizu  暗い 土間、ランプの 暖かい 光。切って 中を 見せた 羽釜（つば）、研いだ 米、米の 上の 水
//            （高さは 2D と 同じ px）、米に 立てた 人さし指と こぶし・腕（水の 下は 水の 色が かかる）。
//            ふしの しるしの 点線・ひしゃく・注ぐ 水は 2D の まま 上に 乗る。
//   hg_hi    暗い 土間、かまど（土の 色、ひび、口の 中は 暗い）、口の 中の 火（大きさ 0〜4、2D と 同じ
//            速さで ゆれる：animated 20fps）・おき・薪（入れた 数）、上に 羽釜と 木の ふた。火の 光は 点の 光
//            （火の 大きさで 強く）。湯気・泡・吹く 息・音の 字は 2D の まま 上に 乗る。
// 釜の 絵は 2D と 同じ 描き方（hagama.ts drawKama）を 立てて 押し出す。絵の 部分と 同じ 大きさの キャンバスに
// 2D の 座標の まま 描いて 立てるので、2D の 上の 物（点線・ひしゃく・湯気）と ずれない。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { fillWall, wallBoards } from '../../art/props/bkit';
import { texHoshiDirt } from '../../art/tiles/hoshi_ground';
import { drawKama, MZ_BOT, MZ_TOP, RICE_TOP, WRIST } from '../../events/ch2/hagama';
import { registerPanel3d, type Kit } from '../panel3d';
import { fade, lamp, once, paint, ROOM_LAMP } from './_kit_b';

/** 絵の 部分（2D の drawScene の 幅）。立てる 絵は 幅 208（真ん中 = 2D の cx 104）。 */
const W = 206;
const H = 112;
const FW = 208;
const CX = 104;
const D = 12;

function dirtImg(): HTMLCanvasElement {
  return once('hgdirt', () =>
    paint(64, 64, (g) => {
      const p = new PixelCanvas(64, 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) p.set(x, y, texHoshiDirt(x, y, 2));
      g.ctx.drawImage(p.toCanvas(), 0, 0);
      g.rect(0, 0, 64, 64, '#2A1E16', 0.45);
    }),
  );
}

function wallImg(): HTMLCanvasElement {
  return once('hgwall', () => {
    const p = new PixelCanvas(260, 140);
    fillWall(p, 0, 0, 260, 140, wallBoards('#4A3C30', 7, 6));
    return p.toCanvas();
  });
}

/** 土間の 床と 奥の 板壁（どちらの 大写しも）。floorRow：床が 2D の 絵の 何行目に 来るか（奥行き D で）。 */
function doma(k: Kit, floorRow: number): void {
  const px = k.pxAt(D);
  k.camera.position.y = (floorRow - H / 2) * px;
  k.camera.updateMatrixWorld();
  k.tiled(dirtImg(), -30, 30, -D - 8, -D + 8, 0, 20);
  const z = -D - 6;
  const a = k.atDepth(-30, -30, z)!;
  const b = k.atDepth(W + 30, H, z)!;
  k.quad(wallImg(), [a.x, 0, z], [b.x, 0, z], [b.x, a.y, z], [a.x, a.y, z]);
}

// ---------------------------------------------------------------- 水加減

const half = (y: number) => Math.round(54 - ((y - MZ_TOP) / (MZ_BOT - MZ_TOP)) ** 2 * 18) - 4;

function riceImg(): HTMLCanvasElement {
  return once('hgrice', () =>
    paint(FW, H, (g) => {
      for (let y = RICE_TOP; y <= MZ_BOT - 4; y++) {
        const h = half(y);
        g.rect(CX - h, y, h * 2, 1, '#E8E4D8');
        for (let x = CX - h + ((y * 3) % 5); x < CX + h; x += 5) g.px(x, y, '#C8C2B4');
      }
    }),
  );
}

/** 人さし指（米に 立てる）・こぶし・右上への 腕。水の 下の 色は 前の 水が かける。 */
function fingerImg(): HTMLCanvasElement {
  return once('hgfinger', () =>
    paint(FW, H, (g) => {
      const rt = RICE_TOP;
      const fx = CX - 2;
      const skin = '#F2C8A0';
      const skinDk = '#B88A6A';
      const fTop = rt - 26;
      g.rect(fx, fTop, 4, 26, skin);
      g.rect(fx + 1, rt - 1, 2, 1, skinDk);
      g.rect(fx + 3, fTop, 1, rt - fTop, skinDk);
      g.rect(fx - 2, fTop - 9, 11, 9, skin);
      for (let k = 0; k < 3; k++) g.rect(fx + 4, fTop - 7 + k * 3, 5, 1, skinDk);
      for (let i = 0; i < 30; i++) {
        const top = fTop - 9 - Math.round(i * 0.9);
        g.rect(fx + 7 + i, top, 1, 7, skin);
        g.px(fx + 7 + i, top + 6, skinDk);
      }
      // 指の 1つ目の ふし（水を そこまで）
      const wy = rt - WRIST;
      g.rect(fx - 1, wy, 6, 1, '#A85A3A');
      g.rect(fx, wy + 1, 4, 1, skinDk);
    }),
  );
}

/** 米の 上の 水（lv px）。 */
function waterImg(lv: number): HTMLCanvasElement {
  return once(`hgwater:${lv}`, () =>
    paint(FW, H, (g) => {
      const wl = RICE_TOP - lv;
      for (let y = wl; y <= MZ_BOT - 4; y++) {
        const h = half(y);
        g.rect(CX - h, y, h * 2, 1, y === wl && lv > 0 ? '#BDEFFA' : '#4A8AC8');
      }
    }),
  );
}

registerPanel3d('hg_mizu', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 100 },
  light: { ...ROOM_LAMP, hemiI: 0.5, sunI: 0.3 },
  fog: null,
  shadow: null,
  grade: () => null,
  focus: 0.5,
  tilt: 0.4,
  build(k: Kit) {
    doma(k, MZ_BOT + 6);
    const px = k.pxAt(D);
    const foot = (z: number) => k.atDepth(CX, H, z)!;
    // 切った 羽釜（鉄の 厚み）・米・指
    k.stand(
      once('hgkamacut', () => paint(FW, H, (g) => drawKama(g, CX, MZ_TOP, MZ_BOT, true))),
      foot(-D - 0.5),
      { px: k.pxAt(D + 0.5), depth: 8 },
    );
    k.stand(riceImg(), foot(-D - 0.1), { px: k.pxAt(D + 0.1), depth: 4, cast: false });
    k.stand(fingerImg(), foot(-D + 0.15), { px: k.pxAt(D - 0.15), depth: 4, cast: false });
    k.bag.water = new Map<number, THREE.Mesh>();
    k.bag.px = px;
    // ランプの 暖かい 光（2D の 輪の 中心：釜の 上の 方）
    lamp(k, '#ffc080', 18, k.atDepth(CX, 40, -D + 3)!, 0, 2);
  },
  update(k: Kit, _t, s) {
    const lv = Math.max(0, Math.min(30, Number(s.lv)));
    const water = k.bag.water as Map<number, THREE.Mesh>;
    let m = water.get(lv);
    if (!m) {
      // （水の 高さごとに 1枚：はじめて その 高さに なった とき 作る）
      m = k.stand(waterImg(lv), k.atDepth(CX, H, -D + 0.3)!, { px: k.pxAt(D - 0.3), depth: 0, cast: false, receive: false });
      fade(m, 0.45);
      water.set(lv, m);
    }
    for (const [v, w] of water) w.visible = v === lv;
  },
});

// ---------------------------------------------------------------- かまど

/** かまどの 前（土、ひび、口の アーチは 暗い）140 × 54。 */
function kamadoFront(): HTMLCanvasElement {
  return once('hgkamado', () =>
    paint(140, 54, (g) => {
      g.rect(0, 0, 140, 54, '#8A5A3A');
      g.rect(0, 0, 140, 2, '#A8724A');
      for (let k = 0; k < 6; k++) g.rect(4 + k * 24, 12 + (k % 2) * 14, 16, 1, '#6A4228');
      for (let k = 0; k < 40; k++) g.px((k * 37) % 140, 3 + ((k * 23) % 50), k % 2 ? '#7A4E32' : '#9A6844');
      // 口（アーチ）
      // （アーチの ふちは 上の 半分だけ）
      g.ring(70, 22, 23, '#6A4228');
      g.rect(46, 23, 48, 31, '#8A5A3A');
      g.rect(48, 22, 44, 32, '#0E0A08');
      g.circle(70, 22, 22, '#0E0A08');
      g.rect(47, 23, 1, 31, '#6A4228');
      g.rect(92, 23, 1, 31, '#6A4228');
    }),
  );
}
function clayImg(): HTMLCanvasElement {
  return once('hgclay', () =>
    paint(32, 32, (g) => {
      g.rect(0, 0, 32, 32, '#8A5A3A');
      for (let k = 0; k < 14; k++) g.px((k * 11) % 32, (k * 7) % 32, k % 2 ? '#7A4E32' : '#A8724A');
    }),
  );
}
/** 羽釜と 木の ふた（2D と 同じ 所）。 */
function kamaLidImg(): HTMLCanvasElement {
  return once('hgkamalid', () =>
    paint(FW, H, (g) => {
      drawKama(g, CX, 30, 60, false);
      g.rect(CX - 50, 22, 100, 8, '#B8864A');
      g.rect(CX - 50, 22, 100, 1, '#D8A86A');
      for (let x = CX - 46; x < CX + 50; x += 9) g.rect(x, 23, 1, 7, '#9A7040');
      g.rect(CX - 8, 18, 16, 4, '#8A6444');
    }),
  );
}
/** 火の 舌 1本（3 × 30、下から 赤・橙・先が 黄）。 */
function flameImg(): HTMLCanvasElement {
  return once('hgflame', () =>
    paint(5, 30, (g) => {
      // 下が 太く、先へ 細る 舌
      g.rect(0, 14, 5, 16, '#E8482A');
      g.rect(1, 4, 3, 10, '#E8482A');
      g.rect(2, 0, 1, 4, '#F06A2A');
      g.rect(1, 16, 3, 14, '#FFB040');
      g.rect(2, 8, 1, 8, '#FFB040');
      g.rect(2, 22, 1, 8, '#FFE7A3');
    }),
  );
}

const FLAME_H = [0, 8, 14, 22, 30];

registerPanel3d('hg_hi', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 100 },
  light: { ...ROOM_LAMP, sun: '#ffb080', sky: '#8a6a50', hemiI: 0.35, sunI: 0.15 },
  fog: null,
  shadow: null,
  grade: () => null,
  focus: 0.5,
  tilt: 0.4,
  animated: true,
  fps: 20,
  build(k: Kit) {
    doma(k, H);
    const px = k.pxAt(D);
    // かまど（前の 面が 2D の かまどの 所）
    const l = k.atDepth(CX - 70, H, -D)!;
    const r = k.atDepth(CX + 70, H, -D)!;
    const top = 54 * px;
    k.box(l.x, r.x, 0, top, -D - 2.4, -D, { front: kamadoFront(), top: clayImg(), left: clayImg(), right: clayImg() });
    // 羽釜と ふた：かまどの 上の 穴に（奥行き まん中）
    const zk = -D - 1.2;
    k.stand(kamaLidImg(), k.atDepth(CX, 62, zk)!, { px: k.pxAt(D + 1.2), depth: 10, rows: [16, 62], emissive: 0.3 });
    // 火の 舌 9本・おき・薪
    const flames: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const at = k.atDepth(CX - 18 + i * 4.5 + 1.5, 110, -D + 0.05)!;
      flames.push(k.stand(flameImg(), at, { px, depth: 1, unlit: true, cast: false, emissive: 1 }));
    }
    const ember = (c: string) => k.stand(once(`hgember:${c}`, () => paint(36, 3, (g) => g.rect(0, 0, 36, 3, c))), k.atDepth(CX, 111, -D + 0.03)!, { px, depth: 2, unlit: true, cast: false });
    const emberOn = ember('#C8402A');
    const emberOff = ember('#3A2418');
    const stick = once('hgstick', () =>
      paint(26, 2, (g) => {
        g.rect(0, 0, 26, 2, '#6A4A2A');
        g.rect(0, 0, 26, 1, '#8A6A42');
      }),
    );
    const sticks = [0, 1, 2].map((n) => k.stand(stick, k.atDepth(CX - 16 + n * 5 + 13, 108 - n, -D + 0.08 + n * 0.01)!, { px, depth: 2, cast: false }));
    // 火の 光（口の 中）
    const fire = lamp(k, '#ff8a3a', 0, k.atDepth(CX, 92, -D + 1.4)!, 0, 2);
    // 土間の ランプ（釜の 鉄と ふたに 弱い 光）
    lamp(k, '#ffd0a0', 16, k.atDepth(CX - 30, 4, -D + 2)!, 0, 2);
    Object.assign(k.bag, { flames, emberOn, emberOff, sticks, fire, px });
  },
  update(k: Kit, t, s) {
    const fl = Number(s.fl);
    const px = k.bag.px as number;
    const fh = FLAME_H[Math.max(0, Math.min(4, fl))];
    (k.bag.flames as THREE.Mesh[]).forEach((m, i) => {
      // （2D と 同じ ゆれ：sin(t / 90 + i * 1.3)）
      const h = Math.max(0, Math.round(fh * (0.6 + 0.4 * Math.sin(t / 90 + i * 1.3))));
      m.visible = h > 0;
      m.scale.y = (px * h) / 30;
    });
    (k.bag.emberOn as THREE.Mesh).visible = fl > 0;
    (k.bag.emberOff as THREE.Mesh).visible = fl <= 0;
    (k.bag.sticks as THREE.Mesh[]).forEach((m, n) => (m.visible = n < Math.min(3, Number(s.fire))));
    const fire = k.bag.fire as THREE.PointLight;
    fire.intensity = fl <= 0 ? 0.6 : fl * 7 * (0.85 + 0.15 * Math.sin(t / 70));
  },
});
