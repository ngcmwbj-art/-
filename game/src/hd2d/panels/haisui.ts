// 大写し「排水口」（第3章 掃除は 上から、events/ch3/okujou.ts HaisuiPanel）を HD-2D で（2026-11-23）。
// 旧水族館の 屋上の 南西の 排水口を 真上から：正午の 日の コンクリート（フィールドの 屋上と 同じ 色・目地・
// 雨の しみ）、まわりの 黒い 輪、四角い 升の 中の ふたの 網、その 上に 下から 砂の 山・ゴムボール・松葉・
// カモメの 羽（2D と 同じ 所）。上の 物から 1つずつ：取ると 上へ 持ち上がって 消え（state.tk）、下の 物を
// 引くと 上の 物が すべる（state.sl）。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { valueNoise } from '../../engine/rng';
import { h01 } from '../../art/tiles/noise';
import { registerPanel3d, type Kit } from '../panel3d';
import { blob, flat, paint, pix } from './_kit_f';

/** 絵の 大きさ（左の 絵：RX - SX - 4 × CH）。 */
const W = 202;
const H = 112;
/** 升（2D の 絵と 同じ：パネルの px）。 */
const WX = 46;
const WY = 10;
const WW = 108;
const WH = 92;
const CX = WX + WW / 2;
const CY = WY + WH / 2;
/** 升の 深さ（単位）。 */
const DEEP = 0.7;

/** 屋上の コンクリート（フィールドの 屋上の 床と 同じ 作り）と 黒い 輪・升の ふち。パネル 1px = 1 ドット。 */
function roofImg(): HTMLCanvasElement {
  return pix('oj:roof', W, H, (p) => {
    for (let y = 0; y < H; y++)
      for (let x = 0; x < W; x++) {
        const n = valueNoise(x / 11, y / 9, 8101);
        let c = n > 0.64 ? '#D4D0C4' : n < 0.3 ? '#B4B0A4' : '#C4C0B4';
        if ((x + 30) % 64 === 0 || (y + 20) % 48 === 0) c = '#A8A498';
        if (h01(x, y, 8103) > 0.988) c = '#9A968C';
        // 輪の 内は 水が たまって 少し 暗い
        const dx = (x - 100) / 110;
        const dy = (y - 58) / 64;
        if (dx * dx + dy * dy < 1) c = mix(c, '#6A6A64', 0.14 * (1 - dx * dx - dy * dy));
        p.set(x, y, c);
      }
    // 黒い 輪（雨の たびに 水が 立った 跡）
    for (let r = 0; r < 3; r++) {
      const rx = 76 + r * 14;
      const ry = 44 + r * 6;
      for (let a = 0; a < 720; a++) {
        const t = (a * Math.PI) / 360;
        const x = Math.round(100 + Math.cos(t) * rx + Math.sin(t * 3 + r) * 1.2);
        const y = Math.round(58 + Math.sin(t) * ry);
        if (x < 0 || y < 0 || x >= W || y >= H) continue;
        p.set(x, y, mix('#C4C0B4', '#3A3A38', 0.5 - r * 0.1));
      }
    }
    // 升の ふち（鉄の 枠）
    p.rect(WX - 4, WY - 4, WW + 8, WH + 8, '#7A766C');
    p.hline(WX - 4, WX + WW + 3, WY - 4, '#9A968C');
    p.rect(WX, WY, WW, WH, '#2A2A28');
  });
}

/** 升の 内の 壁（ぬれた コンクリート、下ほど 黒い）。 */
function wellWall(): HTMLCanvasElement {
  return pix('oj:wall', 32, 16, (p) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) p.set(x, y, mix(h01(x, y, 8131) > 0.7 ? '#6A6862' : '#5A5852', '#2A2A28', y / 16));
  });
}

/** ふたの 網（2D の 絵と 同じ 目）。 */
function netImg(): HTMLCanvasElement {
  return pix('oj:net', WW - 12, WH - 12, (p) => {
    p.fill('#2A2A28');
    for (let x = 2; x < WW - 14; x += 6) p.rect(x, 0, 2, WH - 12, '#8A8A84');
    for (let y = 4; y < WH - 14; y += 8) p.hline(0, WW - 13, y, '#7A7A74');
  });
}

function sandImg(): HTMLCanvasElement {
  return pix('oj:sand', 32, 32, (p) => {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const n = h01(x, y, 8141);
        p.set(x, y, n > 0.86 ? '#C8B890' : n < 0.18 ? '#9A8A62' : '#B0A076');
      }
  });
}

/** カモメの 羽（2D と 同じ 描き方：軸と 羽枝）。 */
function featherImg(): HTMLCanvasElement {
  return paint('oj:feather', 64, 26, (g) => {
    const cx = 32;
    const cy = 24;
    g.line(cx - 30, cy - 2, cx + 26, cy - 20, '#C8CDD4');
    for (let i = 0; i < 26; i++) {
      const x = cx - 26 + i * 2;
      const y = Math.round(cy - 3 - i * 0.64);
      g.line(x, y, x - 3, y - 6 + (i % 2), '#F4F1E8');
      g.line(x, y, x + 2, y + 5, '#E8ECEE');
    }
  });
}

registerPanel3d('haisui', {
  cam: { fov: 30, pitch: 90, pos: [0, 8, 0], far: 100 },
  light: 'noon',
  fog: null,
  shadow: { x: 0, z: 0, hw: 4, hd: 3 },
  focus: 0.5,
  tilt: 0.5,
  build(k) {
    const g = (px: number, py: number, y = 0) => k.ground(px, py, y)!;
    const u = (px: number) => px / W;
    const v = (py: number) => 1 - py / H;
    const roof = roofImg();
    // 屋上の 面：升の 穴を あけて 4枚（左・右・奥・手前）
    const q = (x0: number, y0: number, x1: number, y1: number) => {
      const p0 = g(x0, y0);
      const p1 = g(x1, y1);
      k.quad(roof, [p0.x, 0, p1.z], [p1.x, 0, p1.z], [p1.x, 0, p0.z], [p0.x, 0, p0.z], [u(x0), v(y1), u(x1), v(y0)]);
    };
    q(0, 0, WX, H);
    q(WX + WW, 0, W, H);
    q(WX, 0, WX + WW, WY);
    q(WX, WY + WH, WX + WW, H);
    // 升の 内の 壁と 網
    const w0 = g(WX, WY);
    const w1 = g(WX + WW, WY + WH);
    const wall = wellWall();
    const y0 = -DEEP;
    k.quad(wall, [w0.x, y0, w0.z], [w1.x, y0, w0.z], [w1.x, 0, w0.z], [w0.x, 0, w0.z]);
    k.quad(wall, [w1.x, y0, w1.z], [w0.x, y0, w1.z], [w0.x, 0, w1.z], [w1.x, 0, w1.z]);
    k.quad(wall, [w0.x, y0, w1.z], [w0.x, y0, w0.z], [w0.x, 0, w0.z], [w0.x, 0, w1.z]);
    k.quad(wall, [w1.x, y0, w0.z], [w1.x, y0, w1.z], [w1.x, 0, w1.z], [w1.x, 0, w0.z]);
    k.quad(pix('oj:dark', 4, 4, (p) => p.fill('#2A2A28')), [w0.x, y0 - 0.02, w1.z], [w1.x, y0 - 0.02, w1.z], [w1.x, y0 - 0.02, w0.z], [w0.x, y0 - 0.02, w0.z]);
    const n0 = g(WX + 6, WY + 6, y0);
    const n1 = g(WX + WW - 6, WY + WH - 6, y0);
    k.quad(netImg(), [n0.x, y0, n1.z], [n1.x, y0, n1.z], [n1.x, y0, n0.z], [n0.x, y0, n0.z]);

    // 1 px（網の 高さで）
    const px = k.pxAt(8 + DEEP);
    // 砂の 山（下）
    const c = g(CX, CY, y0);
    const sm = k.material(k.tex(sandImg(), true));
    const sg = k.own(new THREE.SphereGeometry(1, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2));
    const sand = new THREE.Mesh(sg, sm);
    sand.scale.set(44 * px, 0.32, 30 * px);
    sand.position.copy(c);
    sand.castShadow = sand.receiveShadow = true;
    k.scene.add(sand);
    // ゴムボール（少し やわらかい：砂に 少し しずむ）
    const br = 13 * px;
    const bm = k.material(k.tex(pix('oj:ball', 16, 8, (p) => {
      p.fill('#D8503A');
      p.hline(0, 15, 3, '#F4F1E8');
    })));
    const ball = new THREE.Mesh(k.own(new THREE.SphereGeometry(br, 20, 14)), bm);
    const bc = g(CX + 14, CY + 6, y0);
    ball.position.set(bc.x, y0 + 0.2 + br * 0.85, bc.z);
    ball.scale.y = 0.9;
    ball.castShadow = ball.receiveShadow = true;
    k.scene.add(ball);
    // 松葉（26 本、1つの メッシュ）
    const nm = k.own(new THREE.MeshLambertMaterial({ color: '#ffffff' }));
    const needles = new THREE.InstancedMesh(k.own(new THREE.BoxGeometry(1, 0.025, 0.025)), nm, 26);
    const grp = new THREE.Group();
    const m4 = new THREE.Matrix4();
    for (let i = 0; i < 26; i++) {
      const x0 = CX - 34 + ((i * 13) % 52);
      const yy0 = CY - 18 + ((i * 7) % 26);
      const x1 = x0 + 12 - (i % 3) * 6;
      const yy1 = yy0 + 6 + (i % 4);
      const pa = g(x0, yy0, y0);
      const pb = g(x1, yy1, y0);
      const len = Math.max(0.05, pa.distanceTo(pb));
      const mid = pa.clone().add(pb).multiplyScalar(0.5);
      // 砂の 山の 上（まん中ほど 高い）
      const dx = (mid.x - c.x) / (44 * px);
      const dz = (mid.z - c.z) / (30 * px);
      const hy = 0.32 * Math.sqrt(Math.max(0, 1 - dx * dx - dz * dz)) + 0.04 + (i % 3) * 0.02;
      const q4 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), -Math.atan2(pb.z - pa.z, pb.x - pa.x));
      m4.compose(new THREE.Vector3(mid.x, y0 + hy, mid.z), q4, new THREE.Vector3(len, 1, 1));
      needles.setMatrixAt(i, m4);
      needles.setColorAt(i, new THREE.Color(i % 2 ? '#4A6A3A' : '#6A7A44'));
    }
    needles.castShadow = true;
    grp.add(needles);
    k.scene.add(grp);
    // カモメの 羽（いちばん 上）
    const fimg = featherImg();
    const fc = g(CX - 2, CY - 19 + 2, y0);
    const feather = flat(k, fimg, new THREE.Vector3(fc.x, y0 + 0.42, fc.z), { px, depth: 1 });
    // 升の 外の 影（ふちの 下）
    blob(k, c.x, y0, c.z, 50 * px * 2, 34 * px * 2, 0.18);
    k.bag.layers = [feather, grp, ball, sand];
    k.bag.base = [feather, grp, ball, sand].map((o) => o.position.clone());
    k.bag.px = px;
  },
  update(k: Kit, _t, s) {
    const layers = k.bag.layers as THREE.Object3D[];
    const base = k.bag.base as THREE.Vector3[];
    const px = k.bag.px as number;
    const n = Number(s.n) || 0;
    const tk = Number(s.tk) || 0;
    const sl = Number(s.sl) || 0;
    layers.forEach((o, i) => {
      o.visible = i >= n && !(i === n && tk >= 1);
      o.position.copy(base[i]);
      if (i === n && tk > 0) {
        // 取る：上（カメラ）へ 持ち上がって 小さく
        o.position.y += tk * 2.5;
        o.position.z -= tk * 40 * px;
      }
      if (i === n && sl) o.position.x += sl * px;
    });
    k.shadowDirty = true;
  },
});
