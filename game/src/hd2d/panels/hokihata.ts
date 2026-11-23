// 大写し「節」（第2章 区長の 家と 民家3の あいだの ホウキモロコシの 畑、events/ch2/hokihata.ts FushiPanel）を
// HD-2D で（2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜、トマトの 灯りの 前の 1株（茎・3つの 節・葉・赤茶の 穂）、
// 両わきの となりの 株。株の 絵は 2D と 同じ 描き方（hokihata.ts hbPlant）を 立てて 押し出し、
// 切ると 上が 持ち上がり（切った 所で 2つに 分ける）、止め葉は 取ると 下へ 落ちて 消える。
// 後ろは 暗い 畑：フィールドの 株の 絵（prop_hb_kabu）を 何列も、地面は 第2章の 土の 模様。
// 名前（穂・穂首・節）と 鎌は 2D の まま 上に 乗る（2D の 字の 位置と 合う よう 株は Kit.atDepth で 置く）。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { texHoshiDirt } from '../../art/tiles/hoshi_ground';
import { CUT_Y, GROUND_Y, hbPlant } from '../../events/ch2/hokihata';
import { Rng } from '../../engine/rng';
import { registerPanel3d, type Kit } from '../panel3d';
import { fade, lamp, NIGHT_LAMP, once, paint, propImg } from './_kit_b';

const W = 218;
const H = 112;
/** 株の 奥行き（カメラから）。 */
const D = 12;
/** 株の 絵の 幅と 真ん中（2D の cx = 絵の 左から 104）。 */
const PW = 140;
const CX = 70;
const PLANT_X = 104;

function plantImg(cutAt: number, part: 'body' | 'flag'): HTMLCanvasElement {
  return once(`hbplant:${cutAt}:${part}`, () => paint(PW, GROUND_Y, (g) => hbPlant(g, CX, (y) => y, cutAt, part)));
}

function dirtImg(): HTMLCanvasElement {
  return once('hbdirt', () => {
    const p = new PixelCanvas(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) p.set(x, y, texHoshiDirt(x, y, 0));
    return p.toCanvas();
  });
}

interface Pieces {
  whole: THREE.Mesh;
  /** cutAt ごと：[上, 下]。 */
  cut: [THREE.Mesh, THREE.Mesh][];
  flag: THREE.Mesh;
  px: number;
}

registerPanel3d('hokihata', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 120 },
  light: NIGHT_LAMP,
  fog: [D + 1, D + 24],
  shadow: { x: 0, z: -D - 4, hw: 10, hd: 10 },
  grade: () => null,
  focus: 0.5,
  tilt: 0.45,
  build(k: Kit) {
    const px = k.pxAt(D);
    // カメラの 高さ：地面（y = 0）が 株の 奥行きで 2D の 地面の 行に 来る
    const camY = (GROUND_Y - H / 2) * px;
    k.camera.position.y = camY;
    k.camera.updateMatrixWorld();
    k.tiled(dirtImg(), -40, 40, -D - 40, -D + 6, 0, 16);
    // 株の 絵
    const at = (py: number, z = -D) => {
      const v = k.atDepth(PLANT_X, py, z)!;
      return v;
    };
    const pieces: Pieces = {
      whole: k.stand(plantImg(-1, 'body'), at(GROUND_Y), { px, depth: 3 }),
      cut: CUT_Y.map((cy, i) => {
        const img = plantImg(i, 'body');
        const up = k.stand(img, at(cy), { px, depth: 3, rows: [0, cy] });
        const dn = k.stand(img, at(GROUND_Y), { px, depth: 3, rows: [cy, GROUND_Y] });
        up.visible = dn.visible = false;
        return [up, dn] as [THREE.Mesh, THREE.Mesh];
      }),
      flag: k.stand(plantImg(-1, 'flag'), at(GROUND_Y, -D + 0.05), { px, depth: 2 }),
      px,
    };
    k.bag.p = pieces;
    // となりの 株（2D と 同じ：左に 2本、右に 1本）と、後ろの 暗い 畑の 列
    const rng = new Rng(2717);
    const kabu = [0, 1, 2].map((i) => propImg('prop_hb_kabu', { i })).filter((c): c is HTMLCanvasElement => !!c);
    if (kabu.length) {
      const put = (x: number, z: number, i: number) => {
        const img = kabu[Math.abs(i) % kabu.length];
        const v = k.atDepth(x, 0, z)!;
        v.y = 0;
        k.stand(img, v, { px: 3.4 / img.height, depth: 3, flip: Math.abs(i) % 2 === 1 });
      };
      put(18, -D - 0.8, 0);
      put(30, -D - 1.6, 1);
      put(W - 22, -D - 1, 2);
      for (let row = 0; row < 5; row++) {
        const z = -D - 6 - row * 3.4;
        for (let x = -30; x < W + 30; x += 20 + rng.next() * 16) put(x, z + rng.next(), row + Math.floor(x));
      }
    }
    // トマトの 灯り（株の 左前、少し 上）と、月の 青い 返し
    lamp(k, '#ffc890', 16, k.atDepth(PLANT_X - 14, 50, -D + 2.2)!, 0, 2);
  },
  update(k: Kit, _t, s) {
    const p = k.bag.p as Pieces;
    const cutAt = Number(s.cutAt);
    const lift = Number(s.lift) * p.px;
    p.whole.visible = cutAt < 0;
    p.cut.forEach(([up, dn], i) => {
      up.visible = dn.visible = i === cutAt;
      if (i === cutAt) up.position.y = k.atDepth(PLANT_X, CUT_Y[i], -D)!.y + lift;
    });
    // 止め葉：1つ目の 節（y 44〜62）。切った 所が それより 下なら いっしょに 持ち上がる。取ると 下へ
    const flagLift = cutAt >= 1 ? lift : 0;
    p.flag.position.y = k.atDepth(PLANT_X, GROUND_Y, -D)!.y + flagLift - Number(s.sd) * p.px;
    fade(p.flag, Number(s.sa));
    k.shadowDirty = true;
  },
});
