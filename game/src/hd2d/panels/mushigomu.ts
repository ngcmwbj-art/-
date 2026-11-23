// 大写し「たらい」「空気入れ」（第2章 分校の 前の 夜、events/ch2/mushigomu.ts TaraiPanel・PumpPanel）を
// HD-2D で（2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：
//   たらい：左の 水道の 柱と 蛇口、トタンの たらいに 半分 しずんだ 自転車の タイヤ（スポーク・口〈虫ゴム〉）。
//           ←→ で タイヤが 回る（state.ang：2D と 同じ 角度で 回す）。泡・「ぷく」・暗さは 2D の まま 上に。
//   空気入れ：赤い 空気入れ（押すと 取っ手が 下がる：state.push）、ホースで タイヤの 口へ。やわらかいと
//           タイヤの 下が つぶれる（state.flat）。
// 後ろは 夜の 分校の 前（フィールドの 分校 prop_h_bld_school の 前の 壁、校庭の 土 h_kotei）、戸口の 灯り。
// 置き場所は 2D の 絵の px（タイヤの 中心・たらい・柱）を Kit.atDepth で 同じ 所に。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { registerPanel3d, type Kit } from '../panel3d';
import { building, CH2_NIGHT, glowDisc, hGround, nightSky, paint } from './_kit_c';

const TIRE = '#2A2630';
const TIRE_LT = '#4A4652';
const RIM = '#B8BCC8';
const SPOKE = '#8C909C';

/** 自転車の タイヤ（横から）：半径 r、口の 向き valveAt（2D の 画面の 角、下向きが +）。中は 透明（スポークの 間から 後ろが 見える）。 */
function tireImg(r: number, valveAt: number | null, small: boolean): HTMLCanvasElement {
  return paint(`mg:tire:${r}:${valveAt}:${small}`, r * 2 + 3, r * 2 + 3, (p) => {
    const c = r + 1;
    for (let y = 0; y < r * 2 + 3; y++)
      for (let x = 0; x < r * 2 + 3; x++) {
        const d = Math.hypot(x - c, y - c);
        if (d > r + 0.5) continue;
        if (d > r - 1.5) p.set(x, y, TIRE);
        else if (d > r - 2.5) p.set(x, y, TIRE_LT);
        else if (d > r - 5.5) p.set(x, y, TIRE);
        else if (d > r - 6.5) p.set(x, y, RIM);
        else if (d > r - 7.5) p.set(x, y, '#8A8E9A');
      }
    // the tread marks going round
    const n = small ? 12 : 18;
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      p.set(Math.round(c + Math.cos(t) * (r - 1)), Math.round(c + Math.sin(t) * (r - 1)), '#5A5662');
    }
    for (let i = 0; i < n; i++) {
      const t = (i / n) * Math.PI * 2;
      p.line(c, c, Math.round(c + Math.cos(t) * (r - 7)), Math.round(c + Math.sin(t) * (r - 7)), SPOKE);
    }
    p.ellipse(c, c, 3, 3, RIM);
    p.ellipse(c, c, 1, 1, '#5A5E6A');
    if (valveAt === null) return;
    const vx = Math.round(c + Math.cos(valveAt) * (r - 8));
    const vy = Math.round(c + Math.sin(valveAt) * (r - 8));
    const ix = Math.round(c + Math.cos(valveAt) * (r - 14));
    const iy = Math.round(c + Math.sin(valveAt) * (r - 14));
    p.line(vx, vy, ix, iy, '#C8A040');
    p.rect(ix - 1, iy - 1, 3, 3, '#E8C060');
  });
}

/** タイヤを 立てて 中心で 回せる ように（グループの 原点 = タイヤの 中心）。 */
function tire(k: Kit, img: HTMLCanvasElement, cx: number, cy: number, z: number, depth = 4): THREE.Group | null {
  const at = k.atDepth(cx, cy, z);
  if (!at) return null;
  const u = k.pxAt(-z + k.camera.position.z);
  const gr = new THREE.Group();
  const m = k.stand(img, new THREE.Vector3(0, (-img.height / 2) * u, (depth / 2) * u), { px: u, depth });
  gr.add(m);
  gr.position.copy(at);
  k.scene.add(gr);
  return gr;
}

/** 金物の 灰色・トタンの 絵。 */
const metal = (key: string, base: string, lines: string) =>
  paint(`mg:metal2:${key}`, 32, 32, (p) => {
    // トタン・鉄：亜鉛の まだら（スパングル）、すじ、さび の 点、こすれた 明るい 所
    const rng = new Rng(key.length * 13 + 5);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const sp = Math.sin(x * 0.9 + Math.sin(y * 0.7) * 2) * Math.sin(y * 0.8 + x * 0.2);
        const n = rng.next();
        let c = sp > 0.5 ? mix(base, '#FFFFFF', 0.12) : sp < -0.5 ? mix(base, '#000000', 0.1) : base;
        if (n < 0.015) c = '#8A5A3A';
        else if (n < 0.03) c = mix(base, '#6A4A30', 0.4);
        p.set(x, y, c);
      }
    for (let x = 0; x < 32; x += 8) p.vline(x, 0, 31, lines);
    for (let x = 1; x < 32; x += 8) p.vline(x, 0, 31, mix(base, '#FFFFFF', 0.2));
  });

/** 夜の 分校の 前：空・校舎の 前の 壁・校庭の 土・戸口の 灯り。床の 高さを 返す。 */
function backdrop(k: Kit, floorRow: number): number {
  k.sky(nightSky(0.3, 0.8));
  const fl = k.atDepth(100, floorRow, -5)!.y;
  k.tiled(hGround('h_kotei', 64, 64), -40, 40, -30, 2, fl, 16);
  building(k, 'prop_h_bld_school', -9, fl, -13, 0.12, { roofDepth: 5, roofRise: 2 });
  // 戸口の 灯り（壁に ぼんやり、地面に 輪）
  glowDisc(k, new THREE.Vector3(-1.2, fl + 1.6, -12.9), 3.2, '#FFB070', 0.45, false);
  glowDisc(k, new THREE.Vector3(-0.6, fl, -7), 4, '#FFB070', 0.3);
  return fl;
}

registerPanel3d('mg_tarai', {
  cam: { fov: 30, pitch: 0, pos: [0, 0, 0], far: 200 },
  light: CH2_NIGHT,
  fog: [14, 40],
  shadow: { x: 0, z: -6, hw: 8, hd: 8 },
  focus: 0.6,
  tilt: 0.8,
  build(k, s) {
    const fl = backdrop(k, 103);
    // 水道の 柱と 蛇口（2D：x 18〜22、y 30〜100）
    const a = k.atDepth(18, 30, -5.6)!;
    const b = k.atDepth(22, 30, -5.6)!;
    const u = b.x - a.x;
    k.box(a.x, b.x, fl, a.y, -5.6 - u, -5.6, { front: metal('post', '#6A6E7A', '#5A5E6A'), left: metal('post', '#6A6E7A', '#5A5E6A'), right: metal('post', '#6A6E7A', '#5A5E6A'), top: metal('post', '#6A6E7A', '#5A5E6A') });
    const c = k.atDepth(36, 34, -5.6)!;
    k.box(a.x, c.x, a.y - u, a.y, -5.6 - u, -5.6, { front: metal('tap', '#8A8E9A', '#7A7E8A'), top: metal('tap', '#8A8E9A', '#7A7E8A'), right: metal('tap', '#8A8E9A', '#7A7E8A') });
    k.box(c.x - u * 0.8, c.x, a.y - u * 2, a.y - u, -5.6 - u, -5.6, { front: metal('tap', '#8A8E9A', '#7A7E8A') });
    // たらい（2D：x 44〜166、水の 線 y 74、底 y 102）
    const L = k.atDepth(44, 74, -5)!;
    const R = k.atDepth(166, 74, -5)!;
    const wy = L.y;
    const top = wy + (k.atDepth(44, 68, -5)!.y - wy);
    const z0 = -5.9;
    const z1 = -4.1;
    const tin = metal('tub', '#8A909C', '#7A808C');
    const rim = metal('rim', '#B8BCC4', '#A8ACB4');
    k.box(L.x, R.x, fl, fl + 0.06, z0, z1, { top: metal('tubIn', '#5A606C', '#50566A') });
    k.box(L.x, R.x, fl, top, z0 - 0.06, z0, { front: tin, top: rim });
    k.box(L.x - 0.06, L.x, fl, top, z0, z1, { right: tin, left: tin, top: rim, front: rim });
    k.box(R.x, R.x + 0.06, fl, top, z0, z1, { left: tin, right: tin, top: rim, front: rim });
    // 前の ふち（低い：水の 中の タイヤが 見える ように 手前は 低く）
    k.box(L.x, R.x, fl, fl + 0.1, z1, z1 + 0.06, { front: rim, top: rim });
    // 水：上の 面と 前の 面（すける）
    const wm = k.own(new THREE.MeshLambertMaterial({ color: '#5A9ABA', transparent: true, opacity: 0.38, depthWrite: false }));
    const wg = k.own(new THREE.BoxGeometry(R.x - L.x, wy - fl, z1 - z0));
    const water = new THREE.Mesh(wg, wm);
    water.position.set((L.x + R.x) / 2, (wy + fl) / 2, (z0 + z1) / 2);
    water.renderOrder = 2;
    k.scene.add(water);
    const lm = k.own(new THREE.MeshBasicMaterial({ color: '#BDEFFA', transparent: true, opacity: 0.8, depthWrite: false }));
    const lg = k.own(new THREE.PlaneGeometry(R.x - L.x, 0.025));
    const line = new THREE.Mesh(lg, lm);
    line.position.set((L.x + R.x) / 2, wy, z1 + 0.01);
    line.renderOrder = 3;
    k.scene.add(line);
    // タイヤ（2D：中心 104, 48、半径 38、小さい 車輪は 32）
    const small = !!s.small;
    const r = small ? 32 : 38;
    const valveAt = (5 * Math.PI * 2) / 8 + Math.PI / 2;
    k.bag.tire = tire(k, tireImg(r, valveAt, small), 104, 48, -5);
  },
  update(k, _t, s) {
    const g = k.bag.tire as THREE.Group | null;
    if (!g) return;
    // 2D：a = −ang·2π/8（画面の 角、下向き +）→ 3D は 逆回り
    const rz = ((Number(s.ang) || 0) * Math.PI * 2) / 8;
    if (g.rotation.z !== rz) {
      g.rotation.z = rz;
      k.shadowDirty = true;
    }
  },
});

registerPanel3d('mg_pump', {
  cam: { fov: 30, pitch: 0, pos: [0, 0, 0], far: 200 },
  light: CH2_NIGHT,
  fog: [14, 40],
  shadow: { x: 0, z: -6, hw: 8, hd: 8 },
  focus: 0.6,
  tilt: 0.8,
  build(k) {
    const fl = backdrop(k, 96);
    // 空気入れ（2D：x 40、筒 y 40〜94、台 y 92〜96 幅 24）
    const Z = -5.2;
    const u = k.pxAt(5.2);
    const p0 = k.atDepth(40, 94, Z)!;
    const red = paint('mg:red2', 16, 48, (p) => {
      // 赤い 筒：左に つやの 光、右に 影、白い ラベルと 目盛り、こすれた 傷
      for (let y = 0; y < 48; y++)
        for (let x = 0; x < 16; x++) p.set(x, y, x < 3 ? '#E86A5A' : x === 3 ? '#F49A8A' : x > 12 ? '#A82A20' : '#C83A2E');
      p.rect(4, 16, 8, 12, '#F4F1E8');
      for (let y = 18; y < 27; y += 2) p.hline(5, 9 + (y % 4 === 0 ? 2 : 0), y, '#3A3A44');
      p.rect(5, 17, 6, 1, '#2A5AA0');
      for (const [x, y] of [[6, 6], [9, 34], [5, 40], [11, 10]] as const) p.hline(x, x + 2, y, '#E8A090');
      p.hline(0, 15, 0, '#2A2A30');
      p.hline(0, 15, 47, '#2A2A30');
    });
    const dark = metal('base', '#3A3A44', '#30303A');
    k.box(p0.x - 10 * u, p0.x + 14 * u, fl, fl + 3 * u, Z - 6 * u, Z + 4 * u, { front: dark, top: dark, left: dark, right: dark });
    const top = k.atDepth(40, 40, Z)!.y;
    k.box(p0.x, p0.x + 6 * u, fl, top, Z - 3 * u, Z + 3 * u, { front: red, left: red, right: red, top: metal('cap', '#2A2A30', '#2A2A30') });
    // 取っ手（押すと 下がる）
    const shaft = paint('mg:shaft', 4, 16, (p) => p.fill('#C8CCD8'));
    const grip = paint('mg:grip', 16, 4, (p) => {
      p.fill('#2A2A30');
      p.hline(0, 15, 0, '#7A7A88');
      p.hline(0, 15, 3, '#18181E');
    });
    const hg = new THREE.Group();
    const sm = k.own(new THREE.BoxGeometry(2 * u, 18 * u + 0.001, 2 * u));
    const shaftM = new THREE.Mesh(sm, k.material(k.tex(shaft)));
    shaftM.position.set(p0.x + 3 * u, top + 9 * u, Z);
    const gm = k.own(new THREE.BoxGeometry(26 * u, 4 * u, 4 * u));
    const gripM = new THREE.Mesh(gm, k.material(k.tex(grip)));
    gripM.position.set(p0.x + 3 * u, top + 18 * u + 2 * u, Z);
    shaftM.castShadow = gripM.castShadow = true;
    hg.add(shaftM, gripM);
    k.scene.add(hg);
    k.bag.handle = hg;
    k.bag.u = u;
    // タイヤ（2D：中心 140, 54、半径 36、角 −0.3、口 0.85π）
    const valveAt = Math.PI * 0.85;
    const img = tireImg(36, valveAt, false);
    const gr = tire(k, img, 140, 54, -5);
    if (gr) {
      gr.rotation.z = 0.3;
      k.bag.tire = gr;
      // ホース：空気入れの 台 → 地面 → タイヤの 口
      const tu = k.pxAt(5);
      const t = valveAt - 0.3;
      const valve = new THREE.Vector3(gr.position.x + Math.cos(t) * (36 - 8) * tu, gr.position.y - Math.sin(t) * (36 - 8) * tu, -5 + 0.05);
      const curve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(p0.x + 3 * u, fl + 4 * u, Z + 3 * u),
        new THREE.Vector3(p0.x + 20 * u, fl + 0.02, Z + 6 * u),
        new THREE.Vector3((p0.x + valve.x) / 2 + 0.3, fl + 0.03, -4.6),
        new THREE.Vector3(valve.x - 0.05, valve.y - 0.25, -4.85),
        valve,
      ]);
      const hose = new THREE.Mesh(k.own(new THREE.TubeGeometry(curve, 40, 1.2 * u, 5, false)), k.material(null, { tint: '#2A2A30' }));
      hose.castShadow = true;
      k.scene.add(hose);
    }
  },
  update(k, _t, s) {
    const hg = k.bag.handle as THREE.Group | undefined;
    const u = k.bag.u as number;
    if (hg) {
      const y = -(Number(s.push) || 0) * 18 * u;
      if (hg.position.y !== y) {
        hg.position.y = y;
        k.shadowDirty = true;
      }
    }
    // やわらかい タイヤ：下が つぶれる（縦に 少し 低く、地面に つく）
    const gr = k.bag.tire as THREE.Group | undefined;
    if (gr) {
      const f = Number(s.flat) || 0;
      const sy = 1 - f * 0.06;
      if (gr.scale.y !== sy) {
        gr.scale.y = sy;
        k.shadowDirty = true;
      }
    }
  },
});
