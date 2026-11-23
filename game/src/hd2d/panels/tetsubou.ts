// 大写し「鉄棒」（第2章 分校の 校庭の 夜、events/ch2/tetsubou.ts TetsuPanel）を HD-2D で（2026-11-23 依頼主
// 「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜の 校庭の 3段の 鉄棒（手前が いちばん 低い 段、奥の 2段は 右へ 高く）、
// ぶら下がる・体を 上げる しゅん、さかさまの グソっ君、横で 見る まつ先生、トマトの 灯り、星。奥に 分校。
// 2D の 2倍の 切り抜きの かわりに、場面ぜんたいを TETSU_S 倍に 引いて（2D の 置き場所を tetsuAt() で 写す）、
// 人物を フィールドと 同じくらいの 大きさの ボクセル（光を 受けない 人物、足もとの 影）で 立てる。
// 体を 上げる 動き（state.lift）は 2D と 同じ：体は 上がり、手の 列は 棒に 残る。
// 数・息・肩・ゲージ・手の あとは 2D の まま 上に（パネルが tetsuAt()〈events/ch2/tetsubou_at.ts〉で 同じ 所に 描く）。

import * as THREE from 'three';
import { charSprite, poseFrame } from '../../art/chars';
import { HANG_GRIP_ROW, HANG_H } from '../../art/chars/people/minato';
import { tetsuAt, TETSU_S } from '../../events/ch2/tetsubou_at';
import { registerPanel3d, type Kit } from '../panel3d';
import { building, CH2_NIGHT, contactShadow, flipV, hGround, nightSky, paint, rebuild } from './_kit_c';

const BAR_Y = 30;
const BAR_X0 = 34;
const BAR_X1 = 206;
const GROUND_Y = 92;
const SHUN_X = 62;
const KANE_X = 112;
const FUMI_X = 172;
const D = 5;
/** 人物 1 ドット = パネル の px。 */
const DOT = 2 * TETSU_S;

const post = () =>
  paint('tt:post', 4, 16, (p) => {
    p.fill('#7A8094');
    p.vline(0, 0, 15, '#9AA0B4');
    p.vline(3, 0, 15, '#5A6074');
    p.set(1, 5, '#8A6A58');
    p.set(2, 11, '#8A6A58');
  });
const rail = () =>
  paint('tt:rail', 16, 4, (p) => {
    p.fill('#A0907A');
    p.hline(0, 15, 0, '#C8B8A2');
    p.hline(0, 15, 3, '#6A5A48');
    p.set(4, 1, '#8A6A50');
    p.set(11, 2, '#8A6A50');
  });
const backPost = () => paint('tt:bpost', 4, 16, (p) => {
  p.fill('#5A6074');
  p.vline(0, 0, 15, '#6A7084');
});

/** 2D の 四角（パネルの px：x, y, w, h）を 引いた 所の 柱・棒に（奥行き z、太さ = 細い ほう）。 */
function bar(k: Kit, x: number, y: number, w: number, h: number, z: number, img: HTMLCanvasElement, y0?: number): void {
  const [ax, ay] = tetsuAt(x, y + h);
  const [bx, by] = tetsuAt(x + w, y);
  const a = k.atDepth(ax, ay, z)!;
  const b = k.atDepth(bx, by, z)!;
  const t = Math.max(0.03, Math.min(b.x - a.x, b.y - a.y));
  k.box(a.x, b.x, y0 ?? a.y, b.y, z - t, z, { front: img, top: img, left: img, right: img });
}

/** 人物を 2D の 中心 x・足もと（絵の 下の はし）py に（引いた 所）。cols / rows で 一部だけ。 */
function person(k: Kit, img: HTMLCanvasElement, cx: number, bottom: number, o: { cols?: [number, number]; rows?: [number, number]; dz?: number } = {}): THREE.Mesh | null {
  // (rows の とき：その 一部の 下の はしが 足もと)
  const [x, y] = tetsuAt(cx, bottom - (img.height - (o.rows?.[1] ?? img.height)) * 2);
  const at = k.atDepth(x, y, -D + 0.25 + (o.dz ?? 0));
  if (!at) return null;
  const u = k.pxAt(D - 0.25) * DOT;
  const c0 = o.cols?.[0] ?? 0;
  const c1 = o.cols?.[1] ?? img.width;
  // (cols の とき：絵の 中心が cx に なるよう 横に ずらす)
  at.x += ((c0 + c1) / 2 - img.width / 2) * u;
  return k.stand(img, at, { px: u, depth: 3, unlit: true, cols: o.cols, rows: o.rows });
}

registerPanel3d('tetsubou', {
  cam: { fov: 30, pitch: 0, pos: [0, 0, 0], far: 200 },
  light: CH2_NIGHT,
  fog: [10, 40],
  shadow: { x: 0, z: -5, hw: 5, hd: 4 },
  focus: 0.66,
  tilt: 0.8,
  build(k, s) {
    k.sky(nightSky(0.3, 1.2));
    const [, gyy] = tetsuAt(100, GROUND_Y);
    const fl = k.atDepth(100, gyy, -D)!.y;
    k.bag.fl = fl;
    k.tiled(hGround('h_kotei', 64, 64), -40, 40, -40, 2, fl, 16);
    building(k, 'prop_h_bld_school', -15, fl, -24, 0.16, { roofDepth: 6, roofRise: 2.4 });
    // 低い 段：柱 2本と 棒
    bar(k, BAR_X0, BAR_Y - 2, 3, GROUND_Y - BAR_Y + 2, -D, post(), fl);
    bar(k, BAR_X1 - 3, BAR_Y - 2, 3, GROUND_Y - BAR_Y + 2, -D, post(), fl);
    bar(k, BAR_X0, BAR_Y, BAR_X1 - BAR_X0, 3, -D, rail());
    // 奥の 2段（右へ 高く：少し 奥に）
    const z2 = -D - 0.6;
    bar(k, BAR_X1 - 70, BAR_Y - 22, 2, GROUND_Y - BAR_Y + 22, z2, backPost(), fl);
    bar(k, BAR_X1 - 40, BAR_Y - 14, 2, GROUND_Y - BAR_Y + 14, z2, backPost(), fl);
    bar(k, BAR_X1 - 70, BAR_Y - 22, 70, 2, z2, rail());
    bar(k, BAR_X1 - 110, BAR_Y - 14, 70, 2, z2, rail());
    // トマトの 灯り（しゅんの まわり）
    if (!s.dark) {
      const [lx, ly] = tetsuAt(SHUN_X, BAR_Y + 20);
      const at = k.atDepth(lx, ly, -D)!;
      const lamp = new THREE.PointLight('#FFB070', 3.5, 4, 1.4);
      lamp.position.set(at.x, at.y + 0.3, -D + 0.9);
      k.scene.add(lamp);
    }
  },
  update(k, _t, s) {
    const fl = k.bag.fl as number;
    const key = JSON.stringify([s.shun, s.frame, s.lift, s.kane, s.fumi]);
    rebuild(k, 'people', key, () => {
      const groundAt = (cx: number) => k.atDepth(tetsuAt(cx, GROUND_Y)[0], tetsuAt(cx, GROUND_Y)[1], -D + 0.25)!;
      const u = k.pxAt(D - 0.25) * DOT;
      // しゅん
      if (s.shun === 'stand') {
        const img = charSprite('minato').walk.down[0];
        person(k, img, SHUN_X, GROUND_Y + 1);
        contactShadow(k, groundAt(SHUN_X).setY(fl), 12 * u, 4 * u, 0.55);
      } else {
        const img = poseFrame(charSprite('minato_hang'), String(s.frame));
        const grip = (img.height - HANG_H + HANG_GRIP_ROW) * 2;
        const bottom = BAR_Y - grip + 1 + img.height * 2;
        const L = Number(s.lift) || 0;
        const w = img.width;
        if (!L) person(k, img, SHUN_X, bottom);
        else {
          // 体は 上へ、手の 列（左右 3 ドット）は 棒に 残す
          person(k, img, SHUN_X, bottom - L * 2, { cols: [3, w - 3] });
          person(k, img, SHUN_X, bottom, { cols: [0, 3], rows: [0, Math.ceil(grip / 2) + 2] });
          person(k, img, SHUN_X, bottom, { cols: [w - 3, w], rows: [0, Math.ceil(grip / 2) + 2] });
        }
        // ぶら下がった 足の 下の 地面に うすい 影
        contactShadow(k, groundAt(SHUN_X).setY(fl), 12 * u, 4 * u, 0.45);
      }
      if (s.kane) {
        const img = flipV(charSprite('kanenari').walk.down[0]);
        person(k, img, KANE_X, BAR_Y + 2 + img.height * 2, { dz: -0.02 });
        contactShadow(k, groundAt(KANE_X).setY(fl), 12 * u, 4 * u, 0.45);
      }
      if (s.fumi) {
        const img = charSprite('npc_hoshi_fumi').walk.left[0];
        person(k, img, FUMI_X, GROUND_Y + 2);
        contactShadow(k, groundAt(FUMI_X).setY(fl), 13 * u, 4 * u, 0.55);
      }
    });
  },
});
