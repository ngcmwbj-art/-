// 大写し「船の 底」（第3章 船揚げ場、events/ch3/funaba.ts FunaPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：船揚げ場の 台車に のった こねぎの 船の 腹を 横から 寄りで。水の 線
// より 上は 白、青い 帯、下は くすんだ 赤の 船底（へさきは 左で 上へ 反る）、竜骨の 下の 木の 台車の
// 横木、ともの スクリューと 舵、船底に 付いた フジツボ（白い つぶ、ひびが 入る）と 海藻（緑の ひも）。
// 船の 腹は 2D と 同じ 形の 絵を 厚みの ある 板に（フィールドの 船 prop_fb_funa と 同じ 色）、付いた 物は
// 2D の 当たり（TouchPick：区切りごと）と 同じ px に 立てる。船の 下には 船揚げ場の コンクリと レール、
// 奥に 港の 水と 昼の 空。チョークの 区切り・こすった 跡・ともの 白い かげ・落ちる 物・カーソルは 2D。

import * as THREE from 'three';
import { valueNoise } from '../../engine/rng';
import { h01 } from '../../art/tiles/noise';
import { FB_HULL, FB_KATA, fbThingPos } from '../../events/ch3/funaba';
import { PANEL_LIGHT, registerPanel3d, type Kit } from '../panel3d';
import { c3Ground, D0, gfxImg, mix, noonSky, pix, propImg } from './_kit_e';

const H = 112;
const { W, WL, KEEL, BU, keelAt } = FB_HULL;

const HULL = '#F2EFE6';
const STRIPE = '#2F6A9A';
const RED = '#7E4A40';
const RED_DK = '#5E3830';
const FUJI = '#EDE8DA';
const FUJI_DK = '#9A9284';
const MO = '#4E8A4A';
const MO_LT = '#7AB060';

/** 船の 腹（2D と 同じ 形・色に、塗りの むらと 板の 継ぎ目）。 */
function hullImg(): HTMLCanvasElement {
  return pix('fb:hull', W, KEEL, (p) => {
    for (let dx = 0; dx < W; dx++) {
      const bot = keelAt(dx);
      for (let y = 0; y < bot; y++) {
        let c: string;
        if (y < WL - 4) c = valueNoise(dx / 9, y / 5, 7601) > 0.72 ? '#E4E0D4' : HULL;
        else if (y < WL - 1) c = y === WL - 4 ? '#4A82B2' : STRIPE;
        else if (y >= bot - 2) c = RED_DK;
        else {
          const n = valueNoise(dx / 7, y / 4, 7603);
          c = n > 0.7 ? mix(RED, '#9A6A5A', 0.4) : n < 0.25 ? mix(RED, RED_DK, 0.5) : RED;
          if (h01(dx, y, 7605) > 0.985) c = '#C8BCA8';
        }
        // 板の 継ぎ目（横に 長い）
        if (y > 2 && y % 11 === 0 && y < bot - 3) c = mix(c, '#3A2A28', 0.25);
        p.set(dx, y, c);
      }
      // 船べりの 縁
      p.set(dx, 0, '#FFFFFF');
      p.set(dx, 1, '#D8D4C8');
    }
  });
}

/** 付いた 物 1つ（2D と 同じ 形）を パネルの 大きさの 絵に。 */
function thingImg(k: number, i: number, hp: number): HTMLCanvasElement {
  return gfxImg(`fb:th:${k}:${i}:${hp}`, W, H, (g) => {
    const [x, y] = fbThingPos(k, i);
    if (FB_KATA[k][i] === 'mo') {
      for (let j = 0; j < 14; j++) {
        const wv = Math.round(Math.sin(j / 2.5) * 1.5);
        g.rect(x + wv - 1, y + j - 4, 3, 1, j < 6 ? MO_LT : MO);
      }
      g.rect(x + 3, y - 2, 2, 8, MO);
      return;
    }
    g.rect(x - 6, y - 1, 13, 6, FUJI);
    g.rect(x - 4, y - 4, 9, 3, FUJI);
    g.rect(x - 6, y + 4, 13, 1, FUJI_DK);
    g.rect(x - 1, y - 4, 3, 2, '#6A6458');
    if (hp === 1) {
      g.rect(x - 4, y, 1, 3, FUJI_DK);
      g.rect(x - 3, y + 2, 4, 1, FUJI_DK);
      g.rect(x + 2, y - 1, 1, 3, FUJI_DK);
    }
    g.rect(x + 8, y + 6, 4, 3, FUJI);
    g.rect(x + 9, y + 5, 2, 1, FUJI);
  });
}

function wood(): HTMLCanvasElement {
  return pix('fb:wood', 16, 8, (p) => {
    p.fill('#8A6A48');
    p.hline(0, 15, 0, '#B08A5E');
    p.hline(0, 15, 7, '#5A4030');
    p.hline(2, 9, 3, '#7A5A3A');
  });
}
function iron(c: string): HTMLCanvasElement {
  return pix(`fb:iron:${c}`, 4, 8, (p) => {
    p.fill(c);
    p.vline(0, 0, 7, mix(c, '#FFFFFF', 0.3));
  });
}

function build(k: Kit): void {
  k.sky(noonSky([[0, '#8EC0E0'], [0.25, '#A8CCE0'], [0.5, '#C0D8E6'], [1, '#D0E2EC']], 'fb'));
  const z = -D0;
  const px = k.pxAt(D0);
  // 船の 腹（厚さ 3 単位：竜骨より 上だけ。2D と 同じ px に）
  const at = k.atDepth(0, KEEL, z)!;
  k.stand(hullImg(), at, { px, depth: 40, anchor: 'left' });
  // 船揚げ場の コンクリ（竜骨の 少し 下）、レール 2本、奥の 港の 水
  const fy = k.atDepth(0, KEEL + 8, z)!.y;
  k.tiled(c3Ground('c3_quay', 64, 32), -30, 30, -60, 1, fy, 16);
  const rail = propImg('prop_fb_reiru', { n: 9 });
  if (rail) for (const x of [-4, 6]) k.tiled(rail, x, x + 1, -60, 0, fy + 0.02, 16);
  k.tiled(c3Ground('c3_minato', 64, 64), -400, 400, -600, -60, fy - 0.6, 8);
  // 竜骨の 下の 台車の 横木（2D と 同じ 所）
  for (const fx of [0.35, 0.78]) {
    const a = k.atDepth(fx * W - 8, KEEL + 8, z + 0.3)!;
    const b = k.atDepth(fx * W + 8, KEEL, z + 0.3)!;
    k.box(a.x, b.x, fy, b.y, z - 3.4, z + 0.5, { front: wood(), top: wood(), left: wood(), right: wood() });
  }
  // ともの スクリュー（軸と 羽）と 舵
  const s0 = BU[3] * W;
  const sw = (BU[4] - BU[3]) * W;
  const box2 = (x0: number, y0: number, x1: number, y1: number, zz: number, d: number, c: HTMLCanvasElement) => {
    const a = k.atDepth(x0, y1, zz)!;
    const b = k.atDepth(x1, y0, zz)!;
    k.box(a.x, b.x, a.y, b.y, zz - d, zz, { front: c, top: c, left: c, right: c });
  };
  box2(s0 - 4, 62, s0 + 10, 66, z + 0.6, 0.3, iron('#5E6478'));
  box2(s0 + 9, 50, s0 + 13, 78, z + 0.9, 0.25, iron('#B8A070'));
  box2(s0 + 6, 62, s0 + 16, 66, z + 0.9, 0.5, iron('#B8A070'));
  box2(s0 + sw - 10, 30, s0 + sw - 4, 82, z + 0.4, 0.2, iron('#8E95A6'));
  // 付いた 物（こすると 減る：hp ごとの 絵を 作り、update で 見せる 物を 切りかえる）
  const things: { k: number; i: number; hp: number; m: THREE.Mesh }[] = [];
  for (let kk = 0; kk < 3; kk++)
    FB_KATA[kk].forEach((kind, i) => {
      for (const hp of kind === 'fuji' ? [2, 1] : [1]) {
        const zz = z + 0.06;
        const m = k.stand(thingImg(kk, i, hp), k.atDepth(0, H, zz)!, { px: k.pxAt(-zz), depth: kind === 'fuji' ? 4 : 2, anchor: 'left' });
        things.push({ k: kk, i, hp, m });
      }
    });
  k.bag.things = things;
}

registerPanel3d('funaba', {
  cam: { fov: 24, pitch: 0, pos: [0, 0, 0], far: 1200 },
  // （昼の 光を カメラの 後ろ 斜め 上から：船の 腹に 日が 当たる）
  light: { ...PANEL_LIGHT.noon, el: 48, az: 35 },
  fog: [120, 800],
  shadow: { x: 0, z: -D0, hw: 16, hd: 14 },
  focus: 0.45,
  tilt: 0.5,
  build,
  update(k, _t, s) {
    const hp = (s.hp as number[][] | undefined) ?? [];
    for (const t of k.bag.things as { k: number; i: number; hp: number; m: THREE.Mesh }[]) t.m.visible = (hp[t.k]?.[t.i] ?? 0) === t.hp;
    k.shadowDirty = true;
  },
});
