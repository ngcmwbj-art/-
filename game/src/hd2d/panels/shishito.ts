// 大写し「七輪」（第2章 ペロの 古民家の 縁側の 夜、events/ch2/shishito.ts ShichirinPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ、場面ごとに：
//   串（kushi）：まな板に シシトウ 2列 × 3本（グソっ君の 1本は 横）。串の さす 動きは 2D の まま 上に。
//   焼く（yaku・pan）：七輪（土の 胴・口の 炭の 火・網）に 串の シシトウ、焼き色（state.heat）で 緑 → 焦げ。
//                       グソっ君の 1本（はじけると 開く：state.burst）。煙と「パンッ！」は 2D の まま 上に。
//   くじ（kuji）：縁側の 白い 皿に 焼けた 3本、えらんだ 1本が 少し 浮く（state.sel）。矢印は 2D の まま。
// 後ろは 夜の 縁側：板の 床、古民家（フィールドの prop_h_bld_kominka）の 前の 壁と 障子の 灯り。
// シシトウは 2D と 同じ 形・所（パネルの px）に ボクセルで 立てる（standAt）。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { registerPanel3d, type Kit } from '../panel3d';
import { building, CH2_NIGHT, glowDisc, paint, rebuild, standAt } from './_kit_c';

const W = 204;
const CX = Math.round(W / 2);

/** シシトウ 1本（2D の drawShishito と 同じ 形）。絵の (6, 2) が 2D の (x, y)。 */
function podImg(len: number, heat: number, burst = 0): HTMLCanvasElement {
  const hb = Math.round(heat * 20) / 20;
  const bb = Math.round(burst * 5) / 5;
  return paint(`ss:pod:${len}:${hb}:${bb}`, len + 8, 14, (p: PixelCanvas) => {
    const X = 6;
    const Y = 2;
    const green = hb < 0.35 ? '#4E9A3A' : hb < 0.7 ? '#5A8A34' : hb < 0.9 ? '#4E6A2A' : '#3A4220';
    const lt = hb < 0.5 ? '#86C860' : '#7AA048';
    const dk = '#2E5A22';
    if (bb > 0) {
      for (let i = 0; i < len; i += 2) p.rect(X + i, Y + 2 + Math.round(Math.sin(i) * bb * 2), 2, 3, green);
      return;
    }
    for (let i = 0; i < len; i++) {
      const t = i / len;
      const h = t < 0.1 ? 5 + Math.round(t * 30) : t > 0.82 ? Math.max(3, Math.round(8 - ((t - 0.82) / 0.18) * 5)) : 8 + (Math.floor(i / 5) % 2);
      const bend = Math.round(Math.sin(t * Math.PI) * 2);
      const y0 = Y + 4 - Math.floor(h / 2) + bend;
      p.rect(X + i, y0, 1, h, green);
      p.set(X + i, y0, lt);
      p.set(X + i, Y + 4 + Math.ceil(h / 2) - 1 + bend, dk);
      if (i % 7 === 3 && t > 0.15 && t < 0.8) p.set(X + i, Y + 4 + bend, dk);
    }
    p.rect(X - 4, Y + 2, 5, 2, '#6A8A3A');
    p.rect(X - 6, Y + 1, 2, 2, '#8A9A4A');
    if (hb > 0.45) for (let i = 4; i < len - 2; i += 6) p.rect(X + i, Y + 2 + Math.round(Math.sin((i / len) * Math.PI) * 2), 2, 5, hb > 0.85 ? '#1A1A12' : '#3A3A1C');
  });
}

/** シシトウを 2D の (x, y) に（上に 乗る 面の 高さ y0）。 */
function pod(k: Kit, x: number, y: number, len: number, heat: number, y0: number, burst = 0): THREE.Mesh | null {
  return standAt(k, podImg(len, heat, burst), x - 6, y - 2, 1, { y: y0, depth: 6 });
}

const boards = () =>
  paint('ss:boards', 32, 32, (p) => {
    p.fill('#4A3A2E');
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) if ((x * 3 + y * 7) % 11 === 0) p.set(x, y, '#3E3026');
    for (const x of [0, 16]) p.vline(x, 0, 31, '#2A2018');
    p.vline(1, 0, 31, '#5A4838');
    p.vline(17, 0, 31, '#5A4838');
  });
const wood = (c: string, key: string) =>
  paint(`ss:wood:${key}`, 32, 8, (p) => {
    p.fill(c);
    for (let x = 0; x < 32; x += 5) p.set(x, (x * 3) % 8, '#8A6A44');
    p.hline(0, 31, 0, '#D0AA76');
  });
const clay = () =>
  paint('ss:clay', 64, 16, (p) => {
    p.fill('#B8834E');
    for (let y = 0; y < 16; y += 4) p.hline(0, 63, y, '#9A6A42');
    // 前の 空気の 窓（u = 0 が カメラの 方）
    for (const x0 of [0, 58]) p.rect(x0, 9, 6, 6, '#5A3A22');
  });
const coals = () =>
  paint('ss:coals', 32, 32, (p) => {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const d = Math.hypot(x - 15.5, y - 15.5);
        if (d > 16) continue;
        const n = (x * 7 + y * 13) % 9;
        p.set(x, y, n < 2 ? '#FFE7A3' : n < 5 ? '#FF6A2A' : n < 7 ? '#E8482A' : '#3A2018');
      }
  });
const net = () =>
  paint('ss:net', 32, 32, (p) => {
    for (let i = 0; i < 32; i += 4) {
      p.hline(0, 31, i, '#9A9A94');
      p.vline(i, 0, 31, '#9A9A94');
    }
  });
const plate = () =>
  paint('ss:plate', 32, 32, (p) => {
    p.fill('#E8E4D8');
    p.ellipse(16, 16, 13, 13, '#F4F1E8');
  });

registerPanel3d('shishito', {
  cam: { fov: 28, pitch: 26, pos: [0, 3.2, 0], far: 200 },
  light: CH2_NIGHT,
  fog: [16, 50],
  shadow: { x: 0, z: -6, hw: 6, hd: 6 },
  focus: 0.6,
  tilt: 0.8,
  build(k) {
    // 縁側の 板の 床、奥に 古民家の 前の 壁（障子に 灯り）
    k.tiled(boards(), -20, 20, -30, 4, 0, 16);
    building(k, 'prop_h_bld_kominka', -7.7, 0, -9.5, 0.12, { roofDepth: 4, roofRise: 1.8 });
    glowDisc(k, new THREE.Vector3(1, 1.4, -9.4), 3.5, '#FFC890', 0.4, false);
    glowDisc(k, new THREE.Vector3(0, 0, -9), 5, '#FFB070', 0.18);
    // 障子の 灯りが 縁側を 照らす
    const lamp = new THREE.PointLight('#FFC890', 9, 14, 1.2);
    lamp.position.set(0.5, 2.4, -7.5);
    k.scene.add(lamp);
  },
  update(k, _t, s) {
    const phase = String(s.phase);
    const heat = Number(s.heat) || 0;
    const key = JSON.stringify([phase === 'pan' ? 'yaku' : phase, s.first, s.loose, Math.round(heat * 20), s.burst, s.sel, s.active]);
    rebuild(k, 'scene', key, () => {
      if (phase === 'kushi') {
        // まな板（2D：x 12〜W−12、行 18〜94）
        const t = 0.15;
        const a = k.ground(12, 94, t)!;
        const b = k.ground(W - 12, 18, t)!;
        k.box(a.x, b.x, 0, t, b.z, a.z, { top: wood('#B08A5A', 'board'), front: wood('#7A5A3A', 'boardF'), left: wood('#7A5A3A', 'boardF'), right: wood('#7A5A3A', 'boardF') });
        for (let r = 0; r < 2; r++) for (let i = 0; i < 3; i++) pod(k, 34 + i * 48, 32 + r * 30, 38, 0, t);
        if (!s.loose) pod(k, W - 46, 82, 26, 0, t);
        return;
      }
      if (phase === 'kuji') {
        const c = k.ground(CX, 60, 0)!;
        const u = k.pxAt(-c.z + 0);
        const pg = k.own(new THREE.CylinderGeometry(86 * u, 80 * u, 0.06, 28));
        const pm = new THREE.Mesh(pg, k.material(k.tex(plate())));
        pm.position.set(c.x, 0.03, c.z - 0.3);
        pm.scale.z = 0.6;
        pm.receiveShadow = pm.castShadow = true;
        k.scene.add(pm);
        for (let i = 0; i < 3; i++) {
          const lift = i === Number(s.sel) && s.active ? -4 : 0;
          pod(k, CX - 70 + i * 52, 52 + lift, 40, 0.62, 0.06);
        }
        return;
      }
      // 七輪（2D：口の 網は 行 42〜58、胴は 下へ）
      const top = 1.0;
      const c = k.ground(CX, 54, top)!;
      const u = k.pxAt(-c.z);
      const r = 62 * u;
      const body = k.own(new THREE.CylinderGeometry(r * 1.02, r * 0.78, top, 32, 1, true));
      const bm = new THREE.Mesh(body, k.material(k.tex(clay(), true), { side: THREE.DoubleSide }));
      bm.position.set(c.x, top / 2, c.z);
      bm.castShadow = bm.receiveShadow = true;
      k.scene.add(bm);
      // 口の ふち（明るい 土）と 炭の 火
      const rim = k.own(new THREE.RingGeometry(r * 0.86, r * 1.03, 32));
      rim.rotateX(-Math.PI / 2);
      const rm = new THREE.Mesh(rim, k.material(null, { tint: '#D09A62' }));
      rm.position.set(c.x, top, c.z);
      k.scene.add(rm);
      const cg = k.own(new THREE.CircleGeometry(r * 0.86, 28));
      cg.rotateX(-Math.PI / 2);
      const cm = new THREE.Mesh(cg, k.material(k.tex(coals()), { emissive: 1.2, unlit: true }));
      cm.position.set(c.x, top - 0.12, c.z);
      k.scene.add(cm);
      k.scene.add(new THREE.PointLight('#FF7A3A', 5, 5, 1.4).translateX(c.x).translateY(top + 0.3).translateZ(c.z));
      // 網（すける 格子）
      const ng = k.own(new THREE.CircleGeometry(r * 0.98, 28));
      ng.rotateX(-Math.PI / 2);
      const nt = k.tex(net(), true);
      nt.repeat.set(3, 3);
      const nm = new THREE.Mesh(ng, k.material(nt));
      nm.position.set(c.x, top + 0.01, c.z);
      k.scene.add(nm);
      // 串の シシトウ（1回目は 2本、2回目から 1本）と グソっ君の 1本
      const rows = s.first ? 2 : 1;
      for (let row = 0; row < rows; row++) {
        const y = 36 + row * 7;
        for (let i = 0; i < 3; i++) pod(k, CX - 58 + i * 40, y, 34, heat, top);
        // 串（竹）
        const a = k.ground(CX - 72, y + 9, top)!;
        const b = k.ground(CX + 72, y + 9, top)!;
        const sk = wood('#E8D8A8', 'kushi');
        k.box(a.x, b.x, top + 3 * u, top + 4.2 * u, a.z - 4 * u, a.z - 2.8 * u, { front: sk, top: sk });
      }
      if (s.loose) pod(k, CX + 10, 50, 30, heat, top, Number(s.burst) || 0);
    });
  },
});

