// 大写し「ひげと 先」（第2章 裏の とうもろこし畑、events/ch2/yuwaka.ts CornPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜明け前の 暗い 畑、トマトの 灯りの 暖かい 光が 実に 当たる。絵を 縦に
// 通る 茎（節）、うしろの 葉、茎から 右上へ ななめに 出た 実（皮の 長い 葉の すじ、根もとの 柄）、先の 形
// （とりごろ：丸く 太い／早い：とがって やわらかい／かじられ：皮が 開いて 粒）と ひげ（熟れ：茶色く 乾く／
// 早い：うすい 緑）。引っぱる（pull）と ゆれ、下へ 折る（poki）と 実が 下へ 曲がる（2D と 同じ 角度と 速さ）。
// 3D：うしろに 奥へ 続く とうもろこしの 列と 畝の 土、茎・葉・実は 2D と 同じ 形の 絵を 立てて 押し出す。
// 「ポキッ」の 字は 2D の まま。

import * as THREE from 'three';
import { Rng } from '../../engine/rng';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { hGroundImg, pix } from './_kit_d';

const W = 328;
const H = 112;
/** 茎と 実の 面。 */
const Z0 = -5;
const STALK_X = 120;
const LEN = 96;

const LIGHT: PanelLight = { sun: '#8a94c8', sky: '#4a5478', ground: '#1a1a20', fog: '#12161e', sunI: 0.3, hemiI: 0.9, el: 40, az: 200 };

/** 実（bend 0 の 形：皮の すじ、根もとの 葉先、先、ひげ）。足もと（茎の 側の まん中）は 行 FOOT_ROW、列 0。 */
const EAR_H = 76;
const FOOT_ROW = 60;
function earImg(kind: string): HTMLCanvasElement {
  return pix(`yw:ear:${kind}`, LEN + 36, EAR_H, (p) => {
    const ey = FOOT_ROW;
    for (let i = 0; i < LEN; i++) {
      const t = i / LEN;
      const full = kind === 'hayai' ? 10 : 13;
      const w = Math.max(2, Math.round(full * (t < 0.12 ? 0.55 + (t / 0.12) * 0.45 : t > 0.78 ? Math.max(0.25, (1 - t) / 0.22) : 1)));
      const y = ey - Math.round(i * 0.42);
      for (let j = -w; j < w; j++) {
        const stripe = ((j + w) * 3 + Math.round(t * 7)) % 7 < 2;
        p.set(i, y + j, j === -w ? '#A8D070' : j >= w - 2 ? '#3E6A2A' : stripe ? '#5E8E3A' : '#78A848');
      }
    }
    // the husk's loose leaf tips at the foot
    p.line(2, ey - 12, 26, ey - 22, '#A8D070');
    p.line(2, ey + 10, 30, ey + 2, '#5E8E3A');
    const tx = LEN;
    const ty = ey - Math.round(LEN * 0.42);
    if (kind === 'kajiri') {
      p.rect(tx - 16, ty - 8, 16, 14, '#F2D25A');
      for (let y = 0; y < 14; y += 3) for (let x = 0; x < 16; x += 3) p.set(tx - 16 + x + ((y / 3) % 2), ty - 8 + y, '#C8A838');
      p.line(tx - 18, ty - 9, tx - 6, ty - 10, '#D8D0A0');
      p.line(tx - 18, ty + 6, tx - 8, ty + 8, '#D8D0A0');
    } else if (kind === 'tori') {
      p.ellipse(tx - 4, ty, 6, 6, '#6E9E42');
      p.ellipse(tx - 4, ty - 1, 4, 4, '#86B052');
    } else {
      p.line(tx - 6, ty - 3, tx + 6, ty, '#6E9E42');
      p.line(tx - 6, ty + 3, tx + 6, ty, '#3E6A2A');
    }
    if (kind !== 'kajiri') {
      const silk = kind === 'hayai' ? ['#C8E098', '#A8C878'] : ['#8A5A32', '#A87848'];
      for (let s = 0; s < 9; s++) p.line(tx + 2, ty - 1 + (s % 3), tx + 16 + s * 2, ty - 12 + s * 3, silk[s % 2]);
    }
  });
}

/** 茎（太い 緑、左が 明るい、節）。 */
function stalkImg(): HTMLCanvasElement {
  return pix('yw:stalk', 6, 112, (p) => {
    p.fill('#4E7A32');
    p.vline(0, 0, 111, '#6A9A42');
    p.vline(1, 0, 111, '#6A9A42');
    p.vline(5, 0, 111, '#3E6A2A');
    for (const y of [20, 74]) p.rect(0, y, 6, 2, '#2E4A22');
  });
}

/** うしろの 葉（茎から 左へ たれる 長い 葉）。 */
function leafImg(): HTMLCanvasElement {
  return pix('yw:leaf', 92, 56, (p) => {
    for (let i = 0; i < 90; i++) {
      const x = 90 - i;
      const y = Math.round(Math.sin(i / 30) * 10 + (i / 90) * (i / 90) * 40) + 10;
      p.rect(x, y, 1, 3, '#3E6A2A');
      p.set(x, y, '#5E8A3A');
    }
  });
}

/** 遠くの とうもろこし（形：茎と 何枚かの 葉、穂）。 */
function cornImg(v: number): HTMLCanvasElement {
  return pix(`yw:corn${v}`, 40, 96, (p) => {
    const rng = new Rng(300 + v);
    const cx = 20;
    p.rect(cx - 1, 6, 3, 90, '#3E6A2A');
    p.vline(cx - 1, 6, 95, '#5A8A3A');
    // the tassel
    for (let k = -3; k <= 3; k++) p.line(cx, 6, cx + k * 2, 0 + Math.abs(k), '#B8A860');
    for (let k = 0; k < 7; k++) {
      const y = 16 + k * 11 + Math.floor(rng.next() * 4);
      const side = (k + v) % 2 ? 1 : -1;
      const L = 12 + Math.floor(rng.next() * 8);
      for (let i = 0; i < L; i++) {
        const yy = y - Math.round(i * 0.5) + Math.round((i * i) / 18);
        p.set(cx + side * (i + 1), yy, i % 4 ? '#4E7A32' : '#6A9A42');
        p.set(cx + side * (i + 1), yy + 1, '#3E6A2A');
      }
    }
    if (v % 2 === 0) {
      p.ellipse(cx + 4, 56, 2.5, 5, '#6E9E42');
      p.line(cx + 6, 51, cx + 9, 48, '#8A5A32');
    }
    p.outline('#1A2416');
  });
}

registerPanel3d('yuwaka', {
  cam: { fov: 26, pitch: 2, pos: [0, 0, 0], far: 200, near: 0.1 },
  light: LIGHT,
  fog: [5, 18],
  shadow: { x: 0, z: -6, hw: 4, hd: 4 },
  focus: 0.55,
  tilt: 0.8,
  grade: () => null,
  build(k, s) {
    const u = k.pxAt(-Z0);
    k.bag.u = u;
    // the ground (the bed's soil) under the picture's foot, far below the ear
    const floor = k.atDepth(W / 2, H + 40, Z0)!.y;
    k.tiled(hGroundImg('h_tilled', 64, 64), -20, 20, -40, 0, floor, 14, { tint: '#9a8a7a' });
    // the rows of corn going back into the dark
    const rng = new Rng(7711);
    const hgt = k.atDepth(0, -30, Z0)!.y - floor;
    for (let r = 0; r < 7; r++) {
      const z = Z0 - 1.4 - r * 1.6;
      for (let x = -14 + (r % 2) * 0.7; x <= 14; x += 1.3 + rng.next() * 0.8) {
        const img = cornImg(Math.floor(rng.next() * 4));
        k.stand(img, new THREE.Vector3(x, floor, z + (rng.next() - 0.5) * 0.4), { px: (hgt * (0.85 + rng.next() * 0.3)) / img.height, depth: 2, cast: false, flip: rng.next() < 0.5, tint: '#55607a' });
      }
    }
    // the stalk through the picture, the leaf behind it
    const st = k.atDepth(STALK_X, H + 40, Z0)!;
    k.stand(stalkImg(), new THREE.Vector3(st.x, st.y, Z0), { px: u, depth: 6, anchor: 'left' }).scale.y = u * ((H + 60) / 112);
    const lf = k.atDepth(STALK_X - 90, 30 + 56 - 10, Z0 - 0.3)!;
    k.stand(leafImg(), lf, { px: k.pxAt(-(Z0 - 0.3)), depth: 2, anchor: 'left' });
    // the ear (in a pivot at its foot on the stalk: pull shakes it, poki bends it down)
    const pivot = new THREE.Group();
    const ear = k.stand(earImg(String(s.kind)), new THREE.Vector3(0, 0, 0), { px: u, depth: 10, anchor: 'left' });
    pivot.add(ear);
    ear.position.set(0, -(EAR_H - FOOT_ROW) * u, 0.12);
    k.scene.add(pivot);
    k.bag.pivot = pivot;
    // the shank into the stalk
    const sh = k.atDepth(STALK_X + 4, 68, Z0 + 0.06)!;
    k.box(sh.x, sh.x + 6 * u, sh.y - 4 * u, sh.y, Z0, Z0 + 0.12, { front: pix('yw:shank', 4, 4, (p) => p.fill('#5E8A3A')) });
    // the lantern's warm light on the ear (2D：the warm pool at (164, 56))
    const lamp = new THREE.PointLight('#ffc890', 5, 7, 1.0);
    lamp.position.copy(k.atDepth(164, 50, Z0 + 1.4)!);
    k.scene.add(lamp);
  },
  update(k, _t, s) {
    const pivot = k.bag.pivot as THREE.Group;
    const bend = Number(s.bend) || 0;
    const foot = k.atDepth(STALK_X + 8 + Number(s.pull || 0), 70 + Math.round(bend * 10), Z0)!;
    pivot.position.copy(foot);
    // 2D：傾き 0.42 → 0.07（下へ 約 19°）
    pivot.rotation.z = Math.atan(0.42 - bend * 0.35) - Math.atan(0.42);
    k.shadowDirty = true;
  },
});
