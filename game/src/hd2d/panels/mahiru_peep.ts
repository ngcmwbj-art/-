// 大写し「のぞき窓」（第3章 真昼の 顔、events/ch3/mahiru.ts PeepPanel）の 窓の 中を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：古い カメラの 小さな のぞき窓の 中、真昼の 海ぞい（かたい 青の 空・海・
// 浜の 砂、灯台の ときは 防波堤の 白い コンクリートと 赤白の 灯台）と、胸から 上の 顔（人物の 絵を
// 5倍：足は 窓の 下へ はみ出す。ふたの 角度で 明るさが 変わる 3枚 ＝ ui/mahiru_face.ts の 絵）。
// 人物は 光を 受けない（フィールドの 人物と 同じ）。カメラの 体・白い ふた・ハサミ・光・フラッシュは 2D。

import * as THREE from 'three';
import { mhPortrait } from '../../ui/mahiru_face';
import { registerPanel3d, type Kit } from '../panel3d';
import { c3Ground, D0, noonSky, propImg } from './_kit_e';
import { seaImg } from './mizukiri';

/** 窓の 大きさ（2D と 同じ）。 */
const VW = 178;
const VH = 100;
/** 水平線の 行・砂の はじまる 行（窓の 上から）。 */
const HZ = 40;
const SHORE = 70;
const CAM_Y = 1.6;

interface Person {
  id: string;
  /** 窓の 中の 真ん中の x（窓の 左から）。 */
  cx: number;
  pose?: string;
  sc: number;
  fixed?: number;
}

function build(k: Kit, s: Record<string, unknown>): void {
  const place = String(s.place ?? 'beach');
  const lh = place === 'lighthouse';
  k.sky(noonSky([[0, '#4A98E0'], [0.16, '#5AA8E8'], [0.3, '#7ABCEC'], [0.4, '#A8D4F0'], [1, '#C8E4F4']], 'mh'));
  // 砂（防波堤）の はじまり：窓の SHORE の 行が 地面に 当たる 所
  const shore = k.ground(VW / 2, SHORE, 0)!;
  k.tiled(seaImg(false), -3000, 3000, -3000, shore.z - 0.2, -0.3, 3);
  if (lh) {
    k.tiled(c3Ground('c3_bouhatei', 64, 16), -80, 80, shore.z, 2, 0, 16);
    k.box(-80, 80, -1.2, 0, shore.z - 0.3, shore.z, { front: c3Ground('c3_bouhatei', 64, 16) });
    // 灯台（2D と 同じ：窓の 右、x 150〜168、上 4 から 下 74 まで）と その 先の 防波堤
    const t = propImg('prop_c3_toudai');
    const zt = -70;
    const at = k.atDepth(159, 74, zt);
    if (t && at) {
      k.stand(t, at, { px: (k.pxAt(-zt) * 70) / t.height, depth: 8 });
      const bw = c3Ground('c3_bouhatei', 64, 16);
      k.box(at.x - 40, at.x + 3, -0.6, at.y, zt - 2, zt + 2, { front: bw, top: bw });
    }
  } else {
    k.tiled(c3Ground('c3_nagisa', 64, 64), -80, 80, shore.z, shore.z + 1.2, 0, 16);
    k.tiled(c3Ground('c3_sand', 64, 64), -80, 80, shore.z + 1.2, 2, 0, 16);
  }
  // 顔（胸から 上）：ふたの 角度 3つ 分を 作って 見せる 物を 切りかえる
  const who = String(s.who ?? '');
  const ppl: Person[] = who === 'four' ? [{ id: 'minato', cx: 62, sc: 4, fixed: 1 }, { id: 'kanenari', cx: 120, pose: 'happy', sc: 4, fixed: 1 }] : [{ id: who, cx: VW / 2 - 6, sc: 5 }];
  const lv: THREE.Mesh[][] = [[], [], []];
  const z = -D0 * 0.6;
  for (const p of ppl) {
    for (let level = 0; level < 3; level++) {
      if (p.fixed !== undefined && level !== p.fixed) continue;
      const pic = mhPortrait(p.id, level, !!s.br, p.pose);
      if (!pic) continue;
      const at = k.atDepth(p.cx, 2 + pic.height * p.sc, z)!;
      const m = k.stand(pic, at, { px: k.pxAt(-z) * p.sc, depth: 2, unlit: true, cast: false });
      // （足もとは 窓の 下の 地面の 中：地面に かくれない よう 前に 描く）
      const mat = m.material as THREE.Material;
      mat.depthTest = false;
      m.renderOrder = 10;
      if (p.fixed !== undefined) for (const l of lv) l.push(m);
      else lv[level].push(m);
    }
  }
  k.bag.lv = lv;
}

registerPanel3d('mahiru_peep', {
  // （水平線が 窓の 上から 40px）
  cam: { fov: 24, pitch: (Math.atan(((VH / 2 - HZ) / (VH / 2)) * Math.tan((12 * Math.PI) / 180)) * 180) / Math.PI, pos: [0, CAM_Y, 0], far: 4000 },
  light: 'noon',
  fog: [300, 2600],
  shadow: { x: 0, z: -30, hw: 30, hd: 30 },
  focus: 0.45,
  tilt: 0.35,
  build,
  update(k, _t, s) {
    const lvl = Number(s.lvl ?? 0);
    const lv = k.bag.lv as THREE.Mesh[][];
    for (let i = 0; i < 3; i++) for (const m of lv[i]) m.visible = false;
    for (const m of lv[lvl] ?? []) m.visible = true;
  },
});
