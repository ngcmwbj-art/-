// 大写し「群れ」（第3章 背中は 海の 色、events/ch3/mure.ts MurePanel）を HD-2D で（2026-11-23 依頼主
// 「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。見え方ごとに 1つの 絵：
//   mure_ue     上から：防波堤の 港がわの ふち（手前の コンクリート）から のぞく、鏡の 海の 下の 暗い 青。
//               小アジの 背中が 海の 色に とけて、目を こらすと 分かる くらい（2D と 同じ 並び LAYOUT.oki）。
//   mure_shita  下から：潜って 見上げる 明るい 水面と 日の 光の すじ。白っぽい 腹が 光に とける。
//   mure_yoko   横から：同じ 深さ、港の 底の 砂（c3_soko）。銀色の 小アジが 同じ 向きで 止まって いる
//               （state.size の 数、one で 1ぴきの 寄り）。魚の 絵は 2D の fishSide() を そのまま 押し出す。
// まだ 見て いない 見え方（字の カード）は 2D の まま。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { fishSide, LAYOUT } from '../../events/ch3/mure';
import type { Size } from '../../data/text/c3_mure';
import { registerPanel3d, type Kit, type Panel3dDef } from '../panel3d';
import { bandSky, blob, flat, glassy, groundImg, paint, pix, propImg, UNDERWATER } from './_kit_f';

/** 絵の 大きさ（パネルの 左の 絵の 部分：MurePanel の SW × CH）。 */
const W = 202;
const H = 112;

// ---------------------------------------------------------------- 絵

/** 鏡の 昼の 海を 上から（暗い 青、空を 映す 長い 線）。 */
function seaTop(): HTMLCanvasElement {
  return pix('mr:seaTop', 64, 64, (p) => {
    const rng = new Rng(311);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const n = rng.next();
        p.set(x, y, n < 0.05 ? '#22405A' : n > 0.97 ? '#3A5E78' : '#2A4A62');
      }
    for (let k = 0; k < 6; k++) {
      const y = (k * 23 + 5) % 64;
      const x = (k * 37) % 64;
      const l = 10 + ((k * 7) % 14);
      for (let i = 0; i < l; i++) p.set((x + i) % 64, y, mix('#2A4A62', '#DCEAF2', 0.45));
    }
  });
}

/** 小アジの 背中（上から：頭が 左、二つに 分かれた 尾）。 */
function backImg(): HTMLCanvasElement {
  return pix('mr:back', 18, 6, (p) => {
    p.ellipse(8, 3, 7, 1.6, '#1A3044');
    p.hline(3, 10, 2, '#1C3448');
    p.set(15, 2, '#1C3248');
    p.set(16, 1, '#1C3248');
    p.set(15, 4, '#1C3248');
    p.set(16, 5, '#1C3248');
  });
}

/** 小アジの 腹（下から：白っぽい 銀、ふちだけ 少し 灰）。 */
function bellyImg(): HTMLCanvasElement {
  return pix('mr:belly', 18, 6, (p) => {
    p.ellipse(8, 3, 7, 1.8, '#D8EAF2');
    p.ellipse(8, 3, 6, 1, '#EEF6FA');
    p.set(15, 2, '#D8EAF2');
    p.set(16, 1, '#D8EAF2');
    p.set(15, 4, '#D8EAF2');
    p.set(16, 5, '#D8EAF2');
  });
}

/** 水面を 下から（明るい 白、さざなみの 光の 網）。 */
function surfaceUnder(): HTMLCanvasElement {
  return pix('mr:under', 64, 64, (p) => {
    p.fill('#E6F2F8');
    const rng = new Rng(77);
    for (let k = 0; k < 90; k++) {
      const x = Math.floor(rng.next() * 64);
      const y = Math.floor(rng.next() * 64);
      const l = 3 + Math.floor(rng.next() * 6);
      for (let i = 0; i < l; i++) p.set((x + i) % 64, (y + (i > l / 2 ? 1 : 0)) % 64, '#FFFFFF');
    }
    for (let k = 0; k < 40; k++) p.set(Math.floor(rng.next() * 64), Math.floor(rng.next() * 64), '#CCE4EE');
  });
}

/** 横から 見た 小アジ（2D の fishSide() の 絵を そのまま 1枚に）。 */
function fishImg(len: number): HTMLCanvasElement {
  const w = len * 2 + Math.round(len * 0.4) + 6;
  const h = Math.round(len * 0.7) + 8;
  return paint(`mr:fish:${len}`, w, h, (g) => fishSide(g, len + 2, Math.round(h / 2), len));
}

// ---------------------------------------------------------------- 上から

registerPanel3d('mure_ue', {
  cam: { fov: 30, pitch: 64, pos: [0, 7, 0], far: 200 },
  light: 'noon',
  fog: [18, 60],
  shadow: { x: 0, z: -3, hw: 10, hd: 8 },
  focus: 0.5,
  tilt: 0.8,
  build(k) {
    k.sky(bandSky('mr:ueSky', [[0, '#2A4A62'], [1, '#1C3650']]));
    const SEA = -1.3;
    // 深い 所（暗い 青）と、鏡の 水面（すける：小アジの 背中が かすかに）
    k.tiled(pix('mr:deep', 8, 8, (p) => p.fill('#16304A')), -40, 40, -60, 10, SEA - 4, 8, { unlit: true });
    glassy(k, seaTop(), -40, 40, -60, 10, SEA, { texels: 10, opacity: 0.82, unlit: true });
    // 小アジの 背中（2D と 同じ 並び）
    const img = backImg();
    for (const [fx, fy] of LAYOUT.oki) {
      const at = k.ground(fx * W, fy * H, SEA - 0.7);
      if (!at) continue;
      const d = at.distanceTo(k.camera.position);
      flat(k, img, at, { px: k.pxAt(d) * 0.75, depth: 1, cast: false });
    }
    // 手前の 防波堤の ふち（港がわ）：コンクリートの 上、係船柱
    const edge = k.ground(W / 2, H - 12, 0);
    if (edge) {
      k.box(-30, 30, SEA - 0.4, 0, edge.z, edge.z + 6, { top: groundImg('c3_bouhatei', 64, 16), back: groundImg('c3_bouhatei', 64, 16) });
      const bitt = propImg('prop_c3_bitt');
      const at = k.ground(28, H - 4, 0);
      if (bitt && at) {
        k.stand(bitt, at, { px: k.pxAt(at.distanceTo(k.camera.position)), depth: 6 });
        blob(k, at.x, 0, at.z - 0.1, 0.9, 0.5, 0.3);
      }
    }
  },
});

// ---------------------------------------------------------------- 下から

registerPanel3d('mure_shita', {
  cam: { fov: 34, pitch: -58, pos: [0, -7, 0], far: 200 },
  light: { ...UNDERWATER, fog: '#B4D6E4' },
  fog: [8, 30],
  shadow: null,
  focus: 0.45,
  tilt: 0.6,
  build(k) {
    k.sky(bandSky('mr:shitaSky', [[0, '#E2F0F6'], [1, '#B4D6E4']]));
    const surf = k.tiled(surfaceUnder(), -60, 60, -60, 20, 0, 10, { unlit: true });
    (surf.material as THREE.Material).side = THREE.DoubleSide;
    // 日：水面の まん中の 上（2D と 同じ 所）
    const sun = k.ground(W / 2, 4, -0.05);
    if (sun) {
      const sunImg = pix('mr:sun', 32, 32, (p) => {
        p.circle(16, 16, 15, '#F4FAFC');
        p.circle(16, 16, 11, '#FFFFFF');
      });
      const d = sun.distanceTo(k.camera.position);
      flat(k, sunImg, sun, { px: k.pxAt(d) * 1.0, depth: 0, down: true, unlit: true, cast: false, emissive: 1 });
      // 光の すじ：日から 下へ 広がる
      const mat = k.own(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
      for (let i = -4; i <= 4; i++) {
        const end = k.ground(W / 2 + i * 28, H + 4, -6.5);
        if (!end) continue;
        const dir = end.clone().sub(sun);
        const side = new THREE.Vector3(-dir.z, 0, dir.x).normalize();
        if (side.lengthSq() < 0.01) side.set(1, 0, 0);
        const a = sun.clone().addScaledVector(side, -0.05);
        const b = sun.clone().addScaledVector(side, 0.05);
        const c = end.clone().addScaledVector(side, 0.25);
        const e = end.clone().addScaledVector(side, -0.25);
        const g = k.own(new THREE.BufferGeometry());
        g.setAttribute('position', new THREE.Float32BufferAttribute([a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z, a.x, a.y, a.z, c.x, c.y, c.z, e.x, e.y, e.z], 3));
        const beam = new THREE.Mesh(g, mat);
        beam.renderOrder = 3;
        k.scene.add(beam);
      }
    }
    // 腹（2D と 同じ 並び）：水面の 少し 下
    const img = bellyImg();
    for (const [fx, fy] of LAYOUT.oki) {
      const at = k.ground(fx * W, fy * H, -1.6);
      if (!at) continue;
      const d = at.distanceTo(k.camera.position);
      flat(k, img, at, { px: k.pxAt(d) * 0.75, depth: 1, down: true, unlit: true, cast: false });
    }
  },
});

// ---------------------------------------------------------------- 横から

function buildYoko(k: Kit, size: Size, one: boolean): void {
  k.sky(bandSky('mr:yokoSky', [[0, '#5A96B4'], [0.4, '#3C7694'], [1, '#2E6684']]));
  // 港の 底の 砂・岩
  k.tiled(groundImg('c3_soko', 64, 64), -60, 60, -80, 6, 0, 16);
  const rng = new Rng(907);
  const iwa = groundImg('c3_soko_iwa', 32, 32);
  for (let i = 0; i < 9; i++) {
    const x = -14 + i * 3.6 + rng.next() * 1.5;
    const z = -9 - rng.next() * 10;
    const w = 0.8 + rng.next() * 1.6;
    const h = 0.4 + rng.next() * 1.0;
    k.box(x, x + w, 0, h, z - w * 0.7, z, { front: iwa, top: iwa, left: iwa, right: iwa });
  }
  // 岸壁の 下（奥の 左：港の 石垣が 水の 中へ）
  k.box(-40, -9, 0, 9, -30, -26, { front: groundImg('c3_bouhatei', 64, 16) });
  // 光の すじ（上から、うすく）
  const mat = k.own(new THREE.MeshBasicMaterial({ color: '#cfeefa', transparent: true, opacity: 0.12, depthWrite: false, side: THREE.DoubleSide, blending: THREE.AdditiveBlending }));
  for (let i = 0; i < 5; i++) {
    const g = k.own(new THREE.PlaneGeometry(0.6 + (i % 2) * 0.5, 16));
    const m = new THREE.Mesh(g, mat);
    m.position.set(-6 + i * 3.2, 7, -12 - (i % 3) * 3);
    m.rotation.z = 0.35;
    m.renderOrder = 3;
    k.scene.add(m);
  }
  // 小アジ：2D と 同じ 所・同じ 大きさ（パネル 1px = 絵の 1 ドット）
  const Z = -8;
  const place = (fx: number, fy: number, len: number) => {
    const img = fishImg(len);
    const at = k.atDepth(fx, fy, Z);
    if (!at) return;
    const px = k.pxAt(-Z);
    at.y -= (img.height / 2) * px;
    at.x += (img.width / 2 - (len + 2)) * px;
    k.stand(img, at, { px, depth: one ? 4 : 2, cast: false });
  };
  if (one) place(W / 2, H / 2, 34);
  else for (const [fx, fy] of LAYOUT[size]) place(fx * W, fy * H, 12);
}

const yokoDef = (one: boolean): Panel3dDef => ({
  cam: { fov: 28, pitch: -9, pos: [0, 1.7, 0] as [number, number, number], far: 200 },
  light: UNDERWATER,
  fog: [4, 34],
  shadow: null,
  focus: 0.5,
  tilt: 0.7,
  build(k: Kit, s: Record<string, unknown>) {
    buildYoko(k, (s.size as Size) ?? 'oki', one);
  },
});
registerPanel3d('mure_yoko', yokoDef(false));
registerPanel3d('mure_one', yokoDef(true));

