// 大写し「穂」（第2章 いちばん 上の 段の 西の 田、events/ch2/hana.ts HoPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜明け 前の 田。手前に 見る 穂（咲いた あと・これから 咲く・まだ 葉の 中）、
// となりの 穂（2本の 所・咲いた あとの 所・葉の 中の 所）、まわりの 暗い 稲、田の 水、星。トマトの 灯りが
// 見る 穂を 照らす（点の 光）。穂の 絵は 2D と 同じ 描き方（hana.ts hnEar）を 立てて 押し出す。
// 咲いた あとの 葯（白い 糸）は ゆれるので 2D の まま 上に 乗る（同じ px に 来る よう Kit.atDepth で 置く）。

import * as THREE from 'three';
import { PixelCanvas, mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { hnEar, type HoLook } from '../../events/ch2/hana';
import { registerPanel3d, type Kit } from '../panel3d';
import { lamp, NIGHT_LAMP, once, paint } from './_kit_b';

const W = 328;
const H = 112;
/** 穂の 奥行き（カメラから）と、絵の 中の 水面の 行。 */
const D = 14;
const GY = H - 20;
/** 穂の 絵：幅 170、根もとは 絵の 左から 40・下の はし（上は 窓より 高く 伸びる）。 */
const EW = 170;
const EH = 136;
const BX = 40;

function earImg(look: HoLook, scale: number): HTMLCanvasElement {
  return once(`hnear:${look}:${scale}`, () => paint(EW, EH, (g) => hnEar(g, BX, EH - 1, look, scale, 0, 'body')));
}

/** まわりの 稲の 株（細い 葉の 束、首を たれた 穂が 少し）。 */
function tuftImg(v: number): HTMLCanvasElement {
  return once(`hntuft:${v}`, () => {
    const w = 28;
    const h = 46;
    const rng = new Rng(910 + v);
    return paint(w, h, (g) => {
      for (let i = 0; i < 9; i++) {
        const x0 = 12 + Math.round(rng.next() * 4);
        const dx = Math.round((rng.next() - 0.5) * 24);
        const top = 4 + Math.round(rng.next() * 16);
        g.line(x0, h - 1, x0 + dx, top, i % 3 ? '#2E5A2A' : '#3E7A32');
      }
      for (let i = 0; i < 3; i++) {
        const x = 8 + i * 6 + Math.round(rng.next() * 3);
        const y = 8 + Math.round(rng.next() * 8);
        g.line(x, y + 8, x + 4, y, '#4E7A34');
        for (let k = 0; k < 4; k++) g.px(x + 4 + k, y + k, '#6A9A3A');
      }
    });
  });
}

/** 田の 水（夜：紺、空と 星を 映す 小さな 明るい 点）。 */
function waterImg(): HTMLCanvasElement {
  return once('hnwater', () => {
    const p = new PixelCanvas(64, 64);
    const rng = new Rng(733);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const n = rng.next();
        p.set(x, y, n < 0.04 ? '#3A4A5A' : n > 0.995 ? '#C8CCE0' : mix('#1A2430', '#24304A', ((x * 7 + y * 3) % 11) / 22));
      }
    for (let k = 0; k < 9; k++) {
      const y = (k * 7 + 3) % 64;
      const x = (k * 19) % 64;
      for (let i = 0; i < 5; i++) p.set((x + i) % 64, y, '#34465E');
    }
    return p.toCanvas();
  });
}

/** 夜明け 前の 空（上が 深い 紺、下へ 少し 明るく）と 星。 */
function skyImg(): HTMLCanvasElement {
  return once('hnsky', () => {
    const p = new PixelCanvas(W, H);
    const rng = new Rng(61);
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const t = Math.floor((y / 60) * 4 + ((x + y * 2) % 4) / 4 - 0.1) / 4;
        p.set(x, y, mix('#10162A', '#2A3452', Math.max(0, Math.min(1, t))));
      }
    // 2D と 同じ 4つの 星 ＋ 小さな 星
    for (const [x, y] of [[14, 8], [70, 4], [250, 10], [300, 6]]) p.set(x, y, '#C8CCE0');
    for (let i = 0; i < 14; i++) p.set(Math.floor(rng.next() * W), Math.floor(rng.next() * 40), '#6A7290');
    return p.toCanvas();
  });
}

registerPanel3d('hana', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 200 },
  light: { ...NIGHT_LAMP, hemiI: 0.8, sunI: 0.5 },
  fog: [D + 2, D + 60],
  shadow: null,
  grade: () => null,
  focus: 0.55,
  tilt: 0.55,
  build(k: Kit, s) {
    const look = String(s.look) as HoLook;
    const extra = String(s.extra);
    const px = k.pxAt(D);
    // カメラの 高さ：水面（y = 0）が 穂の 奥行きで 2D の 水面の 行に 来る
    k.camera.position.y = (GY - H / 2) * px;
    k.camera.updateMatrixWorld();
    k.sky(skyImg());
    k.tiled(waterImg(), -80, 80, -D - 120, -D + 8, 0, 14);
    const at = (x: number, z: number) => {
      const v = k.atDepth(x, GY, z)!;
      v.y = 0;
      return v;
    };
    // まわりの 暗い 稲（2D と 同じ 14 株の 並び ＋ 奥へ 何列も）
    const rng = new Rng(4421);
    for (let i = 0; i < 14; i++) {
      const img = tuftImg(i % 4);
      k.stand(img, at(8 + i * 23 + 3, -D - 1.5 - (i % 3) * 0.6), { px: px * (0.9 + rng.next() * 0.4), depth: 2, flip: i % 2 === 1, cast: false });
    }
    for (let row = 0; row < 4; row++) {
      const z = -D - 6 - row * 6;
      for (let x = -40; x < W + 40; x += 16 + rng.next() * 18) {
        const img = tuftImg((row + Math.floor(x)) & 3);
        const v = k.atDepth(x, GY, z)!;
        v.y = 0;
        k.stand(img, v, { px: px * 1.1, depth: 2, flip: rng.next() < 0.5, cast: false, tint: '#8890a0' });
      }
    }
    // となりの 穂（2D と 同じ 所）と 見る 穂
    const ear = (bx: number, lk: HoLook, scale: number, z: number, glow: number) => k.stand(earImg(lk, scale), at(bx - BX + EW / 2, z), { px, depth: 2, cast: false, emissive: glow });
    if (extra === 'two' || extra === 'ato') ear(206, 'kore', 0.8, -D - 0.4, 0.3);
    if (extra === 'mae') ear(210, 'kore', 0.75, -D - 0.4, 0.3);
    ear(110, look, 1.15, -D, 0.45);
    // トマトの 灯り（2D の 暖かい 輪の 中心：パネルの 150, 54 の 前）
    lamp(k, '#ffd8a8', 30, k.atDepth(140, 30, -D + 3)!, 0, 2);
    lamp(k, '#ffb070', 3, new THREE.Vector3(0, 6, -D - 20), 0, 2);
  },
});
