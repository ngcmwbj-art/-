// 大写し「雲の 海」（第2章 峠の カーブ、events/ch2/touge.ts KumoPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜明け前の 空（星、東の 低い 所が 少し 明るい）、遠くの 尾根、
// 雲の 海（手前ほど 白い）、雲から 出た 3つの 目印（お寺の 屋根・大杉・鉄塔の 頭）、手前の
// ガードレールと トマトの 灯り。県道の 線・札・手紙・番号・カーソルは 2D の まま 上に 重ねる。
//
// 目印は フィールドの 峠の カーブと 同じ 小物の 絵（art/props/touge_art.ts prop_ks2_shima_1〜3）を
// 立てて 押し出し、雲は フィールドの 雲の 地面の 絵（hoshi_ground h_kumo）。
// 置き場所は パネルの 2D の 座標（Kit.ground）：目印の 足もとは 2D の 当たり（TouchPick）と 同じ px。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { KS_KUMO } from '../../art/props/touge_art';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { hGroundImg, noFog, pix, plate, propImg, rectAt } from './_kit_d';

/** 絵の 大きさ（パネルの px：touge.ts SW × CH）。 */
const W = 204;
const H = 112;
/** 島の 位置（touge.ts ISLE と 同じ）。 */
const ISLE = [
  { x: 166, y: 80, s: 1.7, h: 20 },
  { x: 50, y: 62, s: 1.3, h: 29 },
  { x: 120, y: 50, s: 1, h: 28 },
];

/** 夜明け前の 月あかり（雲の 照り返しで 下から 少し 明るい）。 */
const LIGHT: PanelLight = { sun: '#c8d0ff', sky: '#a8b0d8', ground: '#e6eaf2', fog: KS_KUMO[3], sunI: 1.0, hemiI: 2.2, el: 28, az: 200 };

/** 空：2D と 同じ 色の 帯、東（右）の 低い 所の ぼんやり 明るい 輪、星 18 個（2D と 同じ 所）。 */
function skyImg(): HTMLCanvasElement {
  return pix('ks:sky', W, H, (p) => {
    p.fill('#1E2440');
    for (let y = 18; y < 28; y++) for (let x = 0; x < W; x++) p.set(x, y, (x + y) % 3 === 0 && (y === 18 || y === 27) ? '#1E2440' : '#2A3050');
    // the east's glow (dithered rings)
    const cx = W - 20;
    const cy = 26;
    for (let y = 0; y < 60; y++)
      for (let x = cx - 34; x < W; x++) {
        const d = Math.hypot(x - cx, y - cy);
        if (d > 30) continue;
        const k = 1 - d / 30;
        const base = y >= 18 && y < 28 ? '#2A3050' : '#1E2440';
        if (k > 0.66 || (k > 0.33 && (x + y) % 2 === 0) || (k > 0.1 && (x + 2 * y) % 4 === 0)) p.set(x, y, mix(base, '#4A4A6A', 0.35 + 0.3 * k));
      }
    for (let i = 0; i < 18; i++) {
      const x = (i * 53) % W;
      const y = 2 + ((i * 29) % 16);
      p.set(x, y, i % 4 ? '#C8D0F0' : '#FFF6D8');
      if (i % 4 === 0) {
        p.set(x - 1, y, mix('#1E2440', '#FFF6D8', 0.4));
        p.set(x + 1, y, mix('#1E2440', '#FFF6D8', 0.4));
      }
    }
  });
}

/** 尾根（2倍の 細かさ）：奥の 尾根は 少し 明るく、手前の 尾根は 2D と 同じ 線で 杉の ぎざぎざ。 */
function ridgeImg(): HTMLCanvasElement {
  return pix('ks:ridge', W * 2, 60, (p) => {
    const rng = new Rng(311);
    for (let x = 0; x < W * 2; x++) {
      const X = x / 2;
      const far = 6 + Math.round(2 * (3 * Math.sin(X / 37 + 2) + 2 * Math.sin(X / 13)));
      p.vline(x, far, 59, mix('#2A2848', '#2A3050', 0.4));
      if (far > 0) p.set(x, far, '#3A3A5E');
    }
    for (let x = 0; x < W * 2; x += 2) {
      const X = x / 2;
      const r = 2 * (24 + Math.round(4 * Math.sin(X / 23) + 2 * Math.sin(X / 7 + 1))) - 36;
      const tip = rng.next() < 0.4 ? 2 + Math.floor(rng.next() * 3) : 0;
      p.vline(x, r - tip, 59, '#141228');
      p.vline(x + 1, r - (tip ? tip - 1 : 0), 59, '#141228');
    }
  });
}

/** 雲の かたまり（上が 白く 下が 灰色の まるい 山）。 */
function puffImg(v: number): HTMLCanvasElement {
  return pix(`ks:puff${v}`, 40, 12, (p) => {
    const rng = new Rng(500 + v);
    for (let k = 0; k < 6; k++) {
      const cx = 6 + rng.next() * 28;
      const rx = 5 + rng.next() * 6;
      const ry = 3 + rng.next() * 3;
      p.ellipse(cx, 11 - ry * 0.6, rx, ry, KS_KUMO[2]);
    }
    for (let k = 0; k < 5; k++) {
      const cx = 8 + rng.next() * 24;
      p.ellipse(cx, 8 - rng.next() * 2, 4 + rng.next() * 4, 2.5, KS_KUMO[1]);
    }
    for (let k = 0; k < 4; k++) {
      const cx = 10 + rng.next() * 20;
      p.ellipse(cx, 6 - rng.next() * 2, 3 + rng.next() * 3, 1.5, KS_KUMO[0]);
    }
  });
}

/** ガードレールの 波板（上の ふちが 星あかりで 明るい）。 */
function railImg(): HTMLCanvasElement {
  return pix('ks:rail', 32, 8, (p) => {
    p.fill('#6A7088');
    p.hline(0, 31, 0, '#A8B0C8');
    p.hline(0, 31, 1, '#8A90A8');
    p.hline(0, 31, 4, '#4A5068');
    p.hline(0, 31, 5, '#7A8098');
    p.hline(0, 31, 7, '#3A3E50');
    for (const x of [6, 22]) {
      p.set(x, 3, '#3A3E50');
      p.set(x, 5, '#3A3E50');
    }
  });
}
function postImg(): HTMLCanvasElement {
  return pix('ks:post', 4, 8, (p) => {
    p.fill('#3A3E50');
    p.vline(0, 0, 7, '#5A6078');
    p.vline(3, 0, 7, '#2A2E40');
  });
}

/** トマトの 灯り（2D の 赤い 丸と へた）。 */
function tomatoImg(): HTMLCanvasElement {
  return pix('ks:tomato', 11, 12, (p) => {
    p.ellipse(5, 7, 4.5, 4.2, '#E23B2E');
    p.ellipse(4, 6, 2, 1.6, '#FF6A4A');
    p.set(3, 5, '#FFC8A0');
    p.rect(4, 1, 2, 3, '#4E7A34');
    p.hline(3, 7, 3, '#4E7A34');
    p.outline('#5A1A1A');
  });
}

function buildBack(k: Kit): void {
  k.sky(skyImg());
  // the ridges far beyond the cloud (no fog: they stand against the sky)
  const r = rectAt(k, 0, 14, W, 44, -260);
  noFog(plate(k, ridgeImg(), r.x0 - 4, r.y0, r.w + 8, r.h, -260, { unlit: true, fog: false }));
}

function buildCloud(k: Kit): void {
  // the sea of cloud: the field's cloud ground, white near and greyer into the distance (the fog)
  const sea = k.tiled(hGroundImg('h_kumo', 128, 72), -320, 320, -240, 4, 0, 7, { unlit: true, tint: '#dde2ee' });
  k.bag.sea = sea;
  // billows standing up out of it (between the islands, never over their feet)
  const rng = new Rng(4411);
  const puffs: THREE.Mesh[] = [];
  for (let i = 0; i < 26; i++) {
    const px = rng.next() * W;
    const py = 40 + rng.next() * 64;
    if (ISLE.some((c) => Math.abs(px - c.x) < 26 * c.s && py > c.y - 6 && py < c.y + 14)) continue;
    const at = k.ground(px, py, -0.05);
    if (!at) continue;
    const s = k.pxAt(-at.z) * (0.8 + rng.next() * 0.7);
    puffs.push(k.stand(puffImg(i % 4), at, { px: s, depth: 6, unlit: true, tint: '#e8ebf4', cast: false, receive: false, flip: i % 2 === 1 }));
  }
  k.bag.puffs = puffs;
}

function buildIsles(k: Kit): void {
  ISLE.forEach((c, i) => {
    const img = propImg(`prop_ks2_shima_${i + 1}`);
    const at = k.ground(c.x, c.y, -0.15);
    if (!img || !at) return;
    // 2D の 目印と 同じ 高さ（c.h × s px）に
    const px = (k.pxAt(-at.z) * c.h * c.s) / img.height;
    k.stand(img, at, { px, depth: 6, cast: false });
  });
}

function buildRail(k: Kit): void {
  const z = -2.6;
  const top = k.atDepth(0, H - 7, z)!;
  const bot = k.atDepth(0, H - 3, z)!;
  const l = k.atDepth(-10, H, z)!;
  const rr = k.atDepth(W + 10, H, z)!;
  k.box(l.x, rr.x, bot.y, top.y, z - 0.1, z, { front: railImg(), top: postImg() });
  const low = k.atDepth(0, H + 4, z)!;
  for (let x = 10; x < W; x += 26) {
    const a = k.atDepth(x, H, z)!;
    const w = k.pxAt(-z) * 2;
    k.box(a.x, a.x + w, low.y, top.y + w * 0.5, z - 0.05, z + 0.12, { front: postImg(), top: postImg(), left: postImg(), right: postImg() });
  }
  // the tomato low at the left, glowing a little
  const t = k.atDepth(12, H - 8, z + 0.2)!;
  k.stand(tomatoImg(), t, { px: k.pxAt(-t.z) * 0.95, depth: 4, emissive: 0.9, cast: false });
}

registerPanel3d('touge_kumo', {
  cam: { fov: 30, pitch: 7.6, pos: [0, 4, 0], far: 1000, near: 0.3 },
  light: LIGHT,
  fog: [10, 200],
  shadow: null,
  focus: 0.62,
  tilt: 0.9,
  grade: () => null,
  animated: true,
  fps: 10,
  build(k) {
    buildBack(k);
    buildCloud(k);
    buildIsles(k);
    buildRail(k);
  },
  update(k, t) {
    // the cloud drifts very slowly (2D：t / 4000 の ゆれ)
    const sea = k.bag.sea as THREE.Mesh | undefined;
    const map = sea && (sea.material as THREE.MeshBasicMaterial).map;
    if (map) {
      map.offset.x = (t / 260000) % 1;
      map.offset.y = Math.sin(t / 4000) * 0.004;
    }
    const puffs = k.bag.puffs as THREE.Mesh[] | undefined;
    puffs?.forEach((m, i) => {
      const b = (m.userData.x0 ??= m.position.x) as number;
      m.position.x = b + Math.sin(t / 4000 + i * 1.7) * 0.06 * (1 + (i % 3));
    });
  },
});
