// 大写し「長靴」（第2章 分校の 昇降口の 外、events/ch2/kutsu.ts KuPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：
//   kutsu_pick  夜の 昇降口の 外。軒の 下の 板壁、校庭の 土、6足の 長靴（1足ずつ 2本、右が 少し 奥）。
//               選んで いる 足は 少し 持ち上がり、すんだ 足は うすく。トマトの 灯りが 下から。
//               矢印・名札・ふった 数は 2D の まま 上に 乗る。
//   kutsu_furu  逆さに 持った 長靴 1本（底を しゅんの 両手で）。ふると 底を 支点に 口が ゆれる（2D の 傾きと
//               同じ 量だけ 回す）。地面と 灯り。口の 暗い 所・出てくる 生き物・右の 列は 2D の まま 上に 乗る。
// 長靴の 絵は 2D と 同じ 描き方（kutsu.ts drawBoot）を 立てて 押し出す。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { fillWall, wallSiding } from '../../art/props/bkit';
import { BOOT_H, drawBoot } from '../../events/ch2/kutsu';
import { registerPanel3d, type Kit } from '../panel3d';
import { fade, hGroundImg, lamp, NIGHT_LAMP, once, paint } from './_kit_b';

const W = 360;
const H = 128;
const D = 14;

/** 長靴 1本（s 倍、up：逆さ）。幅 15 マス、x = -6 の はしが 絵の 左。 */
function bootImg(i: number, s: number, up: boolean): HTMLCanvasElement {
  return once(`kuboot:${i}:${s}:${up}`, () => paint(15 * s, BOOT_H * s, (g) => drawBoot(g, i, 6 * s, 0, s, up)));
}

function wallImg(): HTMLCanvasElement {
  return once('kuwall', () => {
    const p = new PixelCanvas(400, 120);
    fillWall(p, 0, 0, 400, 120, wallSiding('#6E665A', 5));
    // 昇降口の ガラス戸（暗い）
    for (const x of [150, 196]) {
      p.rect(x, 30, 42, 90, '#3A3A40');
      p.rect(x + 3, 34, 36, 40, '#1A2030');
      p.rect(x + 3, 78, 36, 38, '#1A2030');
    }
    return p.toCanvas();
  });
}

/** 夜の 地面・板壁・軒。groundRow：奥行き D で 地面が 来る 絵の 行。 */
function yard(k: Kit, groundRow: number): void {
  const px = k.pxAt(D);
  k.camera.position.y = (groundRow - H / 2) * px;
  k.camera.updateMatrixWorld();
  k.tiled(hGroundImg('h_kotei', 64, 64), -40, 40, -D - 4, -D + 10, 0, 16);
  const z = -D - 3;
  const a = k.atDepth(-40, -10, z)!;
  const b = k.atDepth(W + 40, H, z)!;
  k.quad(wallImg(), [a.x, 0, z], [b.x, 0, z], [b.x, a.y, z], [a.x, a.y, z]);
  // 軒（上の 暗い 帯）
  k.box(a.x, b.x, a.y - 0.3, a.y + 1, z, -D + 1.5, { front: once('kueave', () => paint(8, 8, (g) => g.rect(0, 0, 8, 8, '#2A2420'))) });
}

registerPanel3d('kutsu_pick', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 120 },
  light: { ...NIGHT_LAMP, hemiI: 1.0, sunI: 0.5 },
  fog: null,
  shadow: { x: 0, z: -D, hw: 10, hd: 5 },
  grade: () => null,
  focus: 0.62,
  tilt: 0.5,
  build(k: Kit) {
    yard(k, H - 30);
    const pairs: THREE.Mesh[][] = [];
    for (let i = 0; i < 6; i++) {
      const cx = 32 + i * 59;
      const img = bootImg(i, 2, false);
      // （絵の 真ん中 = 2D の drawBoot の cx + 3。右の 1本は 地面の 2px 奥）
      const r = k.ground(cx + 10 + 3, H - 30, 0)!;
      const l = k.ground(cx - 6 + 3, H - 28, 0)!;
      pairs.push([k.stand(img, r, { px: k.pxAt(-r.z), depth: 6 }), k.stand(img, l, { px: k.pxAt(-l.z), depth: 6 })]);
    }
    k.bag.pairs = pairs;
    lamp(k, '#ffd0a8', 26, new THREE.Vector3(0, 2.2, -D + 5), 0, 2);
  },
  update(k: Kit, _t, s) {
    const cur = Number(s.cur);
    const done = String(s.done);
    (k.bag.pairs as THREE.Mesh[][]).forEach((pair, i) => {
      pair.forEach((m) => {
        m.position.y = i === cur ? 3 * k.pxAt(-m.position.z) : 0;
        fade(m, done[i] === '1' ? 0.4 : 1);
      });
    });
    k.shadowDirty = true;
  },
});

registerPanel3d('kutsu_furu', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 120 },
  light: { ...NIGHT_LAMP, hemiI: 1.0, sunI: 0.5 },
  fog: null,
  shadow: { x: 0, z: -D, hw: 8, hd: 6 },
  grade: () => null,
  focus: 0.4,
  tilt: 0.5,
  build(k: Kit, s) {
    yard(k, H - 10);
    const i = Number(s.sel);
    const px = k.pxAt(D);
    // 底（支点）：2D の 長靴の 上の 真ん中（cx + 6 = 絵の 左から 118、y 6）
    if (i >= 0) {
      const img = bootImg(i, 4, true);
      const pivot = new THREE.Group();
      pivot.position.copy(k.atDepth(118, 6, -D)!);
      const m = k.stand(img, new THREE.Vector3(0, -img.height * px, 0), { px, depth: 7 });
      pivot.add(m);
      k.scene.add(pivot);
      k.bag.pivot = pivot;
      // しゅんの 両手（底を 持つ）
      const hand = once('kuhand', () =>
        paint(9, 11, (g) => {
          g.rect(0, 0, 9, 11, '#F2C8A0');
          g.rect(0, 0, 2, 11, '#C89A7A');
          g.rect(0, 3, 9, 1, '#D8A880');
          g.rect(0, 6, 9, 1, '#D8A880');
        }),
      );
      const cx = 112;
      k.stand(hand, k.atDepth(cx - 20 - 8 + 4.5, 7 + 11, -D + 0.3)!, { px, depth: 4, unlit: true });
      k.stand(hand, k.atDepth(cx + 36 - 1 + 4.5, 7 + 11, -D + 0.3)!, { px, depth: 4, unlit: true, flip: true });
    }
    lamp(k, '#ffd0a8', 20, k.atDepth(112, H - 30, -D + 3.5)!, 0, 2);
  },
  update(k: Kit, _t, s) {
    const pivot = k.bag.pivot as THREE.Group | undefined;
    // （2D の 傾き：口の ほうが 1マス（4px）ごとに sw × 0.9 px ずれる）
    if (pivot) pivot.rotation.z = Math.atan((Number(s.sw) * 0.9) / 4);
    k.shadowDirty = true;
  },
});
