// 大写し「穴」（第3章 穴は、だれかの ごちそうさま、events/ch3/tsumeta.ts TsumePanel）を HD-2D で（2026-11-23）。
// 12:01 の 海水浴場の 波打ちぎわの ぬれた 砂（フィールドの 砂の 絵）を 真上から、その 上の 貝がら：
//   tsume_look   1つを 大きく（穴の あいた 二枚貝・ふちの 欠けた 貝・ツメタガイの 殻・砂の お茶わん）
//   tsume_cards  くらべる：左に この 穴の 貝、右に 選んだ カードなら 残る 形の 貝（state.mark で 切りかえ）
// 貝の 絵は 2D の 描き方（bivalve・snail・chawan）を そのまま 押し出す。2D と 同じ 所・同じ 大きさ。
// 寄せる 泡・札・≠・カード（さわって 選ぶ）は 2D の まま 上に（カードの 当たりは 2D の 座標の まま）。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { bivalve, chawan, snail, type Look, type Mark } from '../../events/ch3/tsumeta';
import { registerPanel3d, type Kit } from '../panel3d';
import { blob, dome, flat, groundImg, paint, pix } from './_kit_f';

/** 絵の 大きさ（TsumePanel の 左：SW × CH）。 */
const W = 202;
const H = 112;
const SHELL_X = 58;
const SHELL_Y = 43;
/** 白い 殻は 昼の 日で 飛ばない ように 少し 落とす。 */
const WHITE = '#d8d4cc';

/** ぬれた 砂（c3_sand を 波打ちぎわの 色に）。 */
function wetSand(): HTMLCanvasElement {
  const base = groundImg('c3_sand', 64, 64);
  return pix('tm:sand', 64, 64, (p) => {
    const d = base.getContext('2d')!.getImageData(0, 0, 64, 64).data;
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const i = (y * 64 + x) * 4;
        const c = `#${[d[i], d[i + 1], d[i + 2]].map((v) => v.toString(16).padStart(2, '0')).join('')}`;
        p.set(x, y, mix(c, '#B8A47C', 0.38));
      }
  });
}

/** 2D の 絵の 影（ずらした 暗い 砂色）を ぬいて、物だけに（影は 3D の 光で 落とす）。 */
function noShadow(c: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = c.getContext('2d')!;
  const im = ctx.getImageData(0, 0, c.width, c.height);
  const d = im.data;
  for (let i = 0; i < d.length; i += 4) if (d[i] === 0xb0 && d[i + 1] === 0x9c && d[i + 2] === 0x70) d[i + 3] = 0;
  ctx.putImageData(im, 0, 0);
  return c;
}

function shellImg(kind: Look | Mark, rx: number, ry: number): HTMLCanvasElement {
  const w = rx * 2 + 8;
  const h = ry * 2 + 8;
  return noShadow(paint(`tm:shell:${kind}:${rx}`, w, h, (g) => bivalve(g, rx + 4, ry + 4, rx, ry, kind as Mark)));
}

/** 寝かせて 置く（パネルの (cx, cy) が 絵の まん中）。 */
function lay(k: Kit, img: HTMLCanvasElement, cx: number, cy: number, depth: number, tint?: string): THREE.Mesh | null {
  const at = k.ground(cx, cy, 0);
  if (!at) return null;
  return flat(k, img, at, { px: k.pxAt(8), depth, tint });
}

/** ふくらんだ 殻（2D の 絵を 上から 投影した 半分の 楕円体：厚みと 陰、砂に 落ちる 影）。h = 高さ（px）。 */
function shell(k: Kit, img: HTMLCanvasElement, cx: number, cy: number, h: number, tint?: string): THREE.Object3D | null {
  const at = k.ground(cx, cy, 0);
  if (!at) return null;
  const px = k.pxAt(8);
  // 砂に 落ちる 影（日は 奥の 高い 所：手前へ 少し）
  const ww = img.width * px;
  const dd = img.height * px;
  const grp = new THREE.Group();
  const sh = blob(k, at.x + ww * 0.04, 0, at.z + dd * 0.12, ww * 1.02, dd * 0.95, 0.3, '#6A5636');
  // （絵の まん中から 少し 沈めて、ふちが 砂に うまる）
  const m = dome(k, img, new THREE.Vector3(at.x, -h * px * 0.12, at.z), ww * 1.04, dd * 1.04, h * px, { tint });
  grp.add(sh, m);
  k.scene.add(grp);
  return grp;
}

/** まわりの 小さな 物（砂つぶの 小石・貝の かけら）。 */
function bits(k: Kit, keep: [number, number, number][]): void {
  const rng = new Rng(2811);
  const peb = pix('tm:peb', 5, 4, (p) => {
    p.ellipse(2, 2, 2, 1.5, '#9A948A');
    p.set(1, 1, '#C8C2B8');
  });
  const frag = pix('tm:frag', 5, 4, (p) => {
    p.poly([[0, 3], [4, 3], [2, 0]], '#E8E2D4');
  });
  for (let i = 0; i < 14; i++) {
    const x = rng.next() * W;
    const y = 12 + rng.next() * (H - 14);
    if (keep.some(([kx, ky, r]) => Math.hypot(x - kx, y - ky) < r)) continue;
    lay(k, i % 3 ? peb : frag, x, y, 1);
  }
}

const base = (k: Kit) => {
  k.tiled(wetSand(), -10, 10, -6, 6, 0, 16);
};

registerPanel3d('tsume_look', {
  cam: { fov: 30, pitch: 90, pos: [0, 8, 0], far: 50 },
  light: 'noon',
  fog: null,
  shadow: { x: 0, z: 0, hw: 4, hd: 3 },
  focus: 0.5,
  tilt: 0.4,
  build(k) {
    base(k);
    const cx = W / 2;
    const cy = 62;
    const list: Record<string, THREE.Object3D | null> = {
      ana: shell(k, shellImg('ana', 38, 30), cx, cy, 12, WHITE),
      kake: shell(k, shellImg('kake', 38, 30), cx, cy, 12, WHITE),
      tsumeta: shell(k, noShadow(paint('tm:snail', 72, 72, (g) => snail(g, 34, 34, 30))), cx, cy, 26),
      chawan: lay(k, paint('tm:chawan', 100, 48, (g) => chawan(g, 50, 22, 46)), cx, cy + 6, 5),
    };
    k.bag.list = list;
    bits(k, [[cx, cy, 52]]);
  },
  update(k, _t, s) {
    const list = k.bag.list as Record<string, THREE.Object3D | null>;
    for (const [id, m] of Object.entries(list)) if (m) m.visible = id === s.look;
    k.shadowDirty = true;
  },
});

registerPanel3d('tsume_cards', {
  cam: { fov: 30, pitch: 90, pos: [0, 8, 0], far: 50 },
  light: 'noon',
  fog: null,
  shadow: { x: 0, z: 0, hw: 4, hd: 3 },
  focus: 0.5,
  tilt: 0.4,
  build(k) {
    base(k);
    shell(k, shellImg('ana', 24, 19), SHELL_X, SHELL_Y, 8, WHITE);
    const right: Record<string, THREE.Object3D | null> = {};
    for (const m of ['ana', 'nashi', 'ware', 'kake'] as const) right[m] = shell(k, shellImg(m, 24, 19), W - SHELL_X, SHELL_Y, 8, WHITE);
    k.bag.right = right;
    bits(k, [[SHELL_X, SHELL_Y, 34], [W - SHELL_X, SHELL_Y, 44], [W / 2, SHELL_Y, 14]]);
  },
  update(k, _t, s) {
    const right = k.bag.right as Record<string, THREE.Object3D | null>;
    for (const [id, m] of Object.entries(right)) if (m) m.visible = id === s.mark;
    k.shadowDirty = true;
  },
});
