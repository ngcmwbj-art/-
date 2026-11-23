// 大写し「耳あわせ」（第2章 牛舎の 前、events/ch2/mimi.ts MimiPanel）を HD-2D で（2026-11-23 依頼主
// 「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：左に ふくじんづけの 顔（耳：立てる・横・うしろ、片目）、右に グソっ君の
// 頭（耳の 板、顔：ふつう・うれしい・しょんぼり）。2D の 絵の 写真の 背景（紫の 夜）の かわりに、
// 夜明け前の 牛舎の 前（フィールドの 牛舎 prop_h_bld_barn の 前の 壁と 波板の 屋根、コンクリートの 土間）。
// 2人の 顔は 2D と 同じ 所・同じ 大きさ（1 ドット = パネル 2px）に ボクセルで 立てる。
// 真ん中の 字（犬と 同じ 耳に・↑←→↓）と 時間の 帯・札は 2D の まま 上に。

import * as THREE from 'three';
import { dogFace, kaneHead, type DogEar } from '../../art/props/mimi_art';
import { registerPanel3d } from '../panel3d';
import { building, CH2_NIGHT, contactShadow, glowDisc, hGround, keyOut, nightSky, once, standAt, swap } from './_kit_c';

/** 2D の 置き場所（パネルの 左上からの px）：犬の 顔 32×32 と グソっ君の 頭 40×36、どちらも 2倍。 */
const CW = 328;
const DOG = [10, 10] as const;
const KANE = [CW - 86, 6] as const;

const dogImg = (ear: DogEar, wink: boolean) => once(`mimi:dog:${ear}:${wink}`, () => keyOut(dogFace(ear, wink ? 'wink' : 'open'), ['#7A76B0', '#B08AA8']));

registerPanel3d('mimi', {
  cam: { fov: 26, pitch: 3, pos: [0, 1.25, 0], far: 400 },
  light: CH2_NIGHT,
  fog: [20, 70],
  shadow: { x: 0, z: -8, hw: 14, hd: 10 },
  focus: 0.82,
  tilt: 0.9,
  build(k) {
    k.sky(nightSky(0.35, 0.6));
    // コンクリートの 土間（牛舎の 前）と 奥の 土
    k.tiled(hGround('h_concrete', 64, 64), -30, 30, -16, 2, 0, 16);
    k.tiled(hGround('h_road', 64, 64), -80, 80, -60, -16, 0, 16);
    // 牛舎（前の 壁と 波板の 屋根）：奥に 横長に
    building(k, 'prop_h_bld_barn', -20, 0, -24, 0.25, { roofDepth: 12, roofRise: 4 });
    // 足もとの 灯り（しゅんの 頭の トマトの 灯り）
    const mid = k.ground(CW / 2, 80, 0);
    if (mid) glowDisc(k, mid, 2.2, '#F28A3A', 0.35);
    // 2人の 足もとの 影
    for (const [x, y, w] of [[DOG[0] + 32, DOG[1] + 64, 50], [KANE[0] + 40, KANE[1] + 72, 60]] as const) {
      const at = k.ground(x, y, 0);
      if (at) contactShadow(k, at.add(new THREE.Vector3(0, 0, -0.05)), k.pxAt(-at.z) * w, k.pxAt(-at.z) * 14);
    }
  },
  update(k, _t, s) {
    const ear = (s.dog as DogEar) ?? 'side';
    const wink = !!s.wink;
    swap(k, 'dog', `${ear}:${wink}`, () => {
      return standAt(k, dogImg(ear, wink), DOG[0], DOG[1], 2, { depth: 6, unlit: true, rows: [0, 29] });
    });
    const kane = (s.kane as DogEar) ?? 'side';
    const mood = (s.mood as 'normal' | 'happy' | 'sad') ?? 'normal';
    swap(k, 'kane', `${kane}:${mood}`, () => standAt(k, kaneHead(kane, mood), KANE[0], KANE[1], 2, { depth: 6, unlit: true }));
  },
});
