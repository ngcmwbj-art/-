// 大写し「天突き」（第3章 つるっと、終われる、events/ch3/tokoro.ts TentsukiPanel）を HD-2D で（2026-11-23）。
// 食堂かもめの 台所の カウンター：奥に 白い タイルの 壁（目地）、手前に 木の 台（天板と 前の 板）、左に
// 半分 切った ところてんの 流し箱（金物の 箱に 白く すけた 寒天）、筒の 下の 青い どんぶり（2D と 同じ 所・
// 同じ 大きさ）。天突きの 筒・突き棒・手・出て くる ところてんは 遊びの 物なので 2D の まま 上に。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { h01 } from '../../art/tiles/noise';
import { registerPanel3d } from '../panel3d';
import { lathe, disc, pix } from './_kit_f';
import type { Kit } from '../panel3d';

/** 絵の 大きさ（左：RX - SX - 4 × CH）。 */
const W = 202;
const H = 112;
/** 台の 奥（壁と 天板の さかい）・前の ふち（パネルの px）。 */
const BACK = 92;
const FRONT = 100;
/** どんぶり（筒の 真下：2D の NX - SX）。 */
const BX = 100;

/** 白い タイルの 壁（目地 12 × 10 px、1 ドット = パネル 1px）。 */
function wallImg(): HTMLCanvasElement {
  return pix('tk:wall', W, BACK, (p) => {
    for (let y = 0; y < BACK; y++)
      for (let x = 0; x < W; x++) {
        let c = h01(x >> 2, y >> 2, 7311) > 0.85 ? '#E8E4DA' : '#E2DED2';
        if ((y - 8 + 100) % 10 === 0) c = '#CFCABC';
        else if ((x - 6 + 120) % 12 === 0) c = '#D6D1C4';
        else if ((y - 9 + 100) % 10 === 0) c = '#F0ECE2';
        p.set(x, y, c);
      }
  });
}

function woodTop(): HTMLCanvasElement {
  return pix('tk:top', 48, 16, (p) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 48; x++) p.set(x, y, h01(x >> 3, y, 7321) > 0.7 ? '#D2AA74' : '#C8A06A');
    p.hline(0, 47, 15, '#E8C890');
  });
}
function woodFront(): HTMLCanvasElement {
  return pix('tk:front', 48, 16, (p) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 48; x++) p.set(x, y, h01(x, y >> 1, 7331) > 0.75 ? '#7A4E32' : '#8A5A3A');
    p.hline(0, 47, 0, '#A87A4A');
  });
}
function metal(): HTMLCanvasElement {
  return pix('tk:metal', 16, 8, (p) => {
    p.fill('#A8B0B8');
    p.hline(0, 15, 0, '#C8CED4');
    p.hline(0, 15, 7, '#7A828C');
  });
}
/** 流し箱の 中の 寒天（白く すける、切った 面）。 */
function kantenImg(): HTMLCanvasElement {
  return pix('tk:kanten', 24, 12, (p) => {
    p.fill('#D8DCC8');
    p.hline(0, 23, 0, '#ECEEE0');
    for (let x = 2; x < 24; x += 5) p.set(x, 4 + (x % 3), '#E4E8D6');
  });
}

registerPanel3d('tentsuki', {
  cam: { fov: 26, pitch: 6, pos: [0, 0.9, 0], far: 60 },
  // 台所の 天井の 明かり（左手前の 上から：筒の 影が 奥の タイルに 落ちる）
  light: { sun: '#fff0dc', sky: '#f0e8dc', ground: '#b8a890', fog: '#3a3028', sunI: 1.6, hemiI: 1.9, el: 42, az: 330 },
  fog: null,
  shadow: { x: 0, z: -4, hw: 3, hd: 3 },
  focus: 0.7,
  tilt: 0.6,
  build(k) {
    const back = k.ground(W / 2, BACK, 0)!;
    const front = k.ground(W / 2, FRONT, 0)!;
    const zw = back.z;
    const zf = front.z;
    // 壁（パネルの 0..BACK に ぴったり）
    const a = k.atDepth(0, 0, zw)!;
    const b = k.atDepth(W, BACK, zw)!;
    const ex = (b.x - a.x) * 0.04;
    k.quad(wallImg(), [a.x - ex, 0, zw], [b.x + ex, 0, zw], [b.x + ex, a.y, zw], [a.x - ex, a.y, zw]);
    // 台：天板と 前の 板
    k.box(-8, 8, -3, 0, zw - 0.01, zf, { top: woodTop(), front: woodFront() });
    // 流し箱（左、半分 切った）
    const zc = zw + 0.25;
    const l = k.ground(14, BACK, 0)!;
    const r = k.ground(54, BACK, 0)!;
    const xl = l.x * (k.camera.position.z - zc) / (k.camera.position.z - zw);
    const xr = r.x * (k.camera.position.z - zc) / (k.camera.position.z - zw);
    const hh = 8 * k.pxAt(k.camera.position.z - zc);
    const mt = metal();
    k.box(xl, xr, 0, hh, zc - 0.45, zc, { front: mt, top: mt, left: mt, right: mt });
    // 中の 寒天（左 半分 だけ 残って いる）
    k.box(xl + 0.03, xl + (xr - xl) * 0.58, hh * 0.3, hh + 0.012, zc - 0.42, zc - 0.03, { top: kantenImg(), front: kantenImg(), right: kantenImg() });
    // どんぶり（筒の 真下）：上の ふちが 2D の 80px、幅 36px
    const zb = zw + 0.45;
    const d = k.camera.position.z - zb;
    const px = k.pxAt(d);
    const c = k.ground(BX, BACK, 0)!;
    const cx = c.x * d / (k.camera.position.z - zw);
    const R = 18 * px;
    const hgt = 12 * px;
    const bowlImg = pix('tk:bowl', 4, 16, (p) => {
      for (let y = 0; y < 16; y++) p.rect(0, y, 4, 1, mix('#3A4A7A', '#5A6A9A', y / 15));
      p.rect(0, 14, 4, 2, '#F4F1E8');
    });
    lathe(k, [[0, 0], [R * 0.45, 0], [R * 0.5, hgt * 0.08], [R * 0.86, hgt * 0.55], [R, hgt], [R * 0.95, hgt], [R * 0.8, hgt * 0.5], [R * 0.4, hgt * 0.15], [0, hgt * 0.15]], new THREE.Vector3(cx, 0, zb), { img: bowlImg });
    disc(k, R * 0.42, new THREE.Vector3(cx, hgt * 0.16, zb), { color: '#2A3A6A' });
    buildTube(k, zb);
  },
  update(k, _t, s) {
    const t = k.bag.tube as THREE.Group | undefined;
    if (!t) return;
    const px = k.bag.px as number;
    t.rotation.z = -(Number(s.ang) || 0);
    const pd = Number(s.pd) || 0;
    (k.bag.plunger as THREE.Object3D).position.y = pd * px;
    (k.bag.hand as THREE.Object3D).visible = !!s.hold;
    k.shadowDirty = true;
  },
});

// ---------------------------------------------------------------- 天突き（筒・突き棒・手）

/** 筒の 長さ・幅（2D と 同じ px）と 足もと（網）の 所。 */
const TUBE_L = 34;
const TUBE_W = 22;
const FOOT_Y = 56;

function tubeWood(): HTMLCanvasElement {
  return pix('tk:tube', 22, 34, (p) => {
    for (let y = 0; y < 34; y++)
      for (let x = 0; x < 22; x++) {
        const n = h01(x, y >> 2, 7341);
        let c = n > 0.8 ? '#C49C64' : n < 0.15 ? '#A8824E' : '#B8925A';
        if (x < 2) c = '#8A6444';
        if (x > 19) c = '#D8B07A';
        if ((33 - y) % 9 === 0) c = '#9A7448';
        p.set(x, y, c);
      }
  });
}
function tubeEdge(): HTMLCanvasElement {
  return pix('tk:tubeEdge', 4, 4, (p) => {
    p.fill('#D8B07A');
    p.set(1, 1, '#C49C64');
  });
}
function rodWood(): HTMLCanvasElement {
  return pix('tk:rod', 4, 8, (p) => {
    p.fill('#A8825A');
    p.vline(0, 0, 7, '#8A6444');
  });
}
function netImg(): HTMLCanvasElement {
  return pix('tk:net', 22, 22, (p) => {
    p.fill('#6A707A');
    for (let y = 1; y < 22; y += 3) for (let x = 1; x < 22; x += 3) p.set(x, y, '#C8CDD4');
  });
}
const skin = () => pix('tk:skin', 4, 4, (p) => {
  p.fill('#E8B890');
  p.hline(0, 3, 0, '#F4CCA4');
  p.hline(0, 3, 3, '#C88A62');
});
const sleeve = () => pix('tk:sleeve', 4, 4, (p) => {
  p.fill('#3E8A4E');
  p.hline(0, 3, 0, '#5AA86A');
  p.hline(0, 3, 3, '#2E6A3C');
});

/** 木の 四角い 筒（足もとの 網を 軸に 傾く）、中の 突き板と 棒と 持ち手、左手で 筒を 持ち、突く ときは 右手が 持ち手に。 */
function buildTube(k: Kit, zb: number): void {
  const d = k.camera.position.z - zb;
  const px = k.pxAt(d);
  const foot = k.atDepth(BX, FOOT_Y, zb)!;
  const g = new THREE.Group();
  g.position.copy(foot);
  k.scene.add(g);
  const L = TUBE_L * px;
  const hw = (TUBE_W / 2) * px;
  const th = 2 * px;
  const mat = k.material(k.tex(tubeWood()));
  const edge = k.material(k.tex(tubeEdge()));
  const box = (w: number, h: number, dd: number, m: THREE.Material, x: number, y: number, z: number, parent: THREE.Object3D) => {
    const mesh = new THREE.Mesh(k.own(new THREE.BoxGeometry(w, h, dd)), m);
    mesh.position.set(x, y, z);
    mesh.castShadow = mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };
  // 4枚の 板（前・後ろ・左・右）、上の ふちは 明るい 木口
  box(hw * 2, L, th, mat, 0, L / 2, hw - th / 2, g);
  box(hw * 2, L, th, mat, 0, L / 2, -hw + th / 2, g);
  box(th, L, hw * 2, mat, -hw + th / 2, L / 2, 0, g);
  box(th, L, hw * 2, mat, hw - th / 2, L / 2, 0, g);
  box(hw * 2, px * 0.6, hw * 2, edge, 0, L, 0, g).scale.set(1, 1, 1);
  // 足もとの 網（ステンレスの 目）
  const net = new THREE.Mesh(k.own(new THREE.PlaneGeometry(hw * 2, hw * 2)), k.material(k.tex(netImg()), { side: THREE.DoubleSide }));
  net.rotation.x = -Math.PI / 2;
  net.position.set(0, px * 0.5, 0);
  g.add(net);
  box(hw * 2 + px, 2 * px, hw * 2 + px, k.material(null, { tint: '#6A707A' }), 0, px, 0, g);
  // 突き板・棒・持ち手（棒は 2D より 長め：持ち手が 筒の 外に 出た まま 下がる）
  const plunger = new THREE.Group();
  g.add(plunger);
  const rod = k.material(k.tex(rodWood()));
  box(hw * 2 - th * 2.2, 3 * px, hw * 2 - th * 2.2, k.material(null, { tint: '#7A5A3A' }), 0, 1.5 * px, 0, plunger);
  box(2 * px, 32 * px, 2 * px, rod, 0, 17 * px, 0, plunger);
  box(18 * px, 4 * px, 5 * px, k.material(null, { tint: '#9A7448' }), 0, 33 * px, 0, plunger);
  // 突く ときの 右手（持ち手を 上から 押さえる）と そで
  const hand = new THREE.Group();
  plunger.add(hand);
  const sk = k.material(k.tex(skin()));
  const sl = k.material(k.tex(sleeve()));
  box(11 * px, 5 * px, 7 * px, sk, -1 * px, 37 * px, 0, hand);
  box(16 * px, 6 * px, 8 * px, sl, 12 * px, 39 * px, 0, hand).rotation.z = 0.25;
  // 筒を 支える 左手（筒の 左の 板を にぎる：指は 前へ 回る）
  const lh = new THREE.Group();
  g.add(lh);
  box(4 * px, 9 * px, hw * 2 + 2 * px, sk, -hw - 2 * px, L * 0.55, 0, lh);
  for (let i = 0; i < 3; i++) box(6 * px, 2.2 * px, 2 * px, sk, -hw + 1 * px, L * 0.55 + (i - 1) * 3 * px, hw + 0.8 * px, lh);
  box(18 * px, 7 * px, 9 * px, sl, -hw - 12 * px, L * 0.48, -1 * px, lh).rotation.z = -0.35;
  k.bag.tube = g;
  k.bag.plunger = plunger;
  k.bag.hand = hand;
  k.bag.px = px;
}
