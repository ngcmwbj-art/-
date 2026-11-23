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
import { mix, PixelCanvas } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { registerPanel3d, type Kit } from '../panel3d';
import { building, glowDisc, paint, rebuild, standAt } from './_kit_c';

const W = 204;
const CX = Math.round(W / 2);

/** 細かさ：シシトウは パネル 1px に 3 ドット（同じ 大きさで 描き込みを 細かく）。 */
const Q = 3;

/**
 * シシトウ 1本（2D の drawShishito と 同じ 長さ・太さ・曲がり・位置）を 3倍の 細かさで：
 * 丸みの 陰（上に つやの 光、下に 影）、しわ（縦の 小さな くぼみ）、先は 丸く 細い、
 * へた（星形の がく と 曲がった 軸）、焼き色（heat）で 緑が くすみ、網の あとの 焦げは むらの ある 茶〜黒。
 * 絵の (6·Q, 2·Q) が 2D の (x, y)。
 */
function podImg(len: number, heat: number, burst = 0): HTMLCanvasElement {
  const hb = Math.round(heat * 20) / 20;
  const bb = Math.round(burst * 5) / 5;
  return paint(`ss:pod3:${len}:${hb}:${bb}`, (len + 8) * Q, 14 * Q, (p: PixelCanvas) => {
    const X = 6 * Q;
    const Y = 2 * Q;
    const green = hb < 0.35 ? '#4E9A3A' : hb < 0.7 ? mix('#4E9A3A', '#5A7A2E', (hb - 0.35) / 0.35) : hb < 0.9 ? '#4E6A2A' : '#3A4220';
    const lt = hb < 0.5 ? '#9AD870' : mix('#9AD870', '#8A9A50', Math.min(1, (hb - 0.5) * 2));
    const dk = mix('#2E5A22', '#1E2A12', hb);
    const rng = new Rng(len * 31 + 7);
    const L = len * Q;
    if (bb > 0) {
      // はじけて 開いた（中の 白い わたと 種が 見える）
      for (let i = 0; i < L; i += 2) {
        const yy = Y + 2 * Q + Math.round(Math.sin(i / Q) * bb * 2 * Q);
        p.rect(X + i, yy, 2, 3 * Q, green);
        if (i % 6 === 0) p.set(X + i, yy + Q, '#F4ECD0');
      }
      return;
    }
    const half = (t: number) => (t < 0.1 ? 2.5 + t * 15 : t > 0.82 ? Math.max(1.5, 4 - ((t - 0.82) / 0.18) * 2.5) : 4 + 0.5 * (Math.floor((t * len) / 5) % 2)) * Q;
    for (let i = 0; i < L; i++) {
      const t = i / L;
      const h = half(t);
      const mid = Y + 4 * Q + Math.sin(t * Math.PI) * 2 * Q;
      const top = Math.round(mid - h);
      const bot = Math.round(mid + h);
      // しわ：ところどころ 縦に くぼむ
      const wr = Math.sin(t * len * 1.7) > 0.86;
      for (let y = top; y <= bot; y++) {
        const v = (y - mid) / h; // −1 上 … 1 下
        let c = v < -0.55 ? mix(green, lt, 0.6) : v > 0.55 ? mix(green, dk, 0.7) : green;
        if (v > -0.62 && v < -0.38 && t > 0.12 && t < 0.85) c = mix(lt, '#FFFFFF', 0.35 * (1 - hb)); // つやの 光
        if (wr && v > -0.4) c = mix(c, dk, 0.45);
        p.set(X + i, y, c);
      }
      p.set(X + i, top, mix(lt, green, 0.3));
      p.set(X + i, bot, dk);
    }
    // 焼き色：網の あとの 焦げ（すじ）と、ぽつぽつの むら
    if (hb > 0.35) {
      const burnt = hb > 0.85 ? '#1A1A12' : hb > 0.6 ? '#3A2E18' : '#5A4A22';
      for (let i = 4 * Q; i < L - 2 * Q; i += 6 * Q) {
        const t = i / L;
        const mid = Y + 4 * Q + Math.sin(t * Math.PI) * 2 * Q;
        for (let y = Math.round(mid - half(t) * 0.8); y < mid + half(t) * 0.8; y++)
          for (let dx = 0; dx < 2 * Q; dx++) if (rng.next() < 0.75) p.set(X + i + dx + (y % 2), y, rng.next() < 0.3 ? mix(burnt, '#000000', 0.3) : burnt);
      }
      const spots = Math.round(hb * 30);
      for (let k2 = 0; k2 < spots; k2++) {
        const i = Math.floor(rng.next() * L * 0.9) + Math.round(L * 0.05);
        const t = i / L;
        const mid = Y + 4 * Q + Math.sin(t * Math.PI) * 2 * Q;
        const y = Math.round(mid + (rng.next() - 0.5) * half(t) * 1.4);
        p.rect(X + i, y, 1 + Math.floor(rng.next() * 3), 1 + Math.floor(rng.next() * 2), rng.next() < 0.5 ? burnt : mix(green, burnt, 0.5));
      }
      // 皮が 少し ふくれて 白っぽい 所（焼けた つや）
      if (hb > 0.5) for (let k2 = 0; k2 < 5; k2++) p.set(X + Math.floor(rng.next() * L), Math.round(Y + 3 * Q + rng.next() * 2 * Q), '#C8D0A0');
    }
    // へた：星形の がく（緑、ふちが 波）と 曲がった 軸
    const cx = X - Q;
    const cy = Y + 4 * Q;
    const calyx = mix('#5A8A2E', '#4A5A22', hb);
    for (let y = -3 * Q; y <= 3 * Q; y++) {
      const w = Math.round((1 - Math.abs(y) / (3 * Q + 1)) * 3 * Q) + (Math.abs(y) % 3 === 0 ? 1 : 0);
      p.hline(cx - w + Q, cx + Q, cy + y, Math.abs(y) < Q ? mix(calyx, '#8AB860', 0.3) : calyx);
    }
    // 軸：がくから 左へ、少し 上へ 曲がる
    for (let i = 0; i < 5 * Q; i++) {
      const yy = cy - Math.round((i / (5 * Q)) ** 2 * 2 * Q);
      p.rect(cx - 2 * Q - i + Q, yy - 1, 1, 3, i > 4 * Q ? '#A8B870' : '#7A9A44');
    }
  });
}

/** シシトウを 2D の (x, y) に（上に 乗る 面の 高さ y0）。 */
function pod(k: Kit, x: number, y: number, len: number, heat: number, y0: number, burst = 0): THREE.Mesh | null {
  return standAt(k, podImg(len, heat, burst), x - 6, y - 2, 1 / Q, { y: y0, depth: 6 * Q });
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
/** 七輪の 胴（珪藻土）：横の 筋、ひび、上の ほうの すす、下の 帯、前の 空気窓（u = 0 が カメラの 方）。 */
const clay = () =>
  paint('ss:clay2', 128, 48, (p) => {
    const rng = new Rng(17);
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 128; x++) {
        const n = rng.next();
        let c = n < 0.08 ? '#9A6A42' : n > 0.93 ? '#D09A62' : '#B8834E';
        // 上の すす（口の 近くほど 黒く、むら）
        const soot = Math.max(0, 1 - y / 16) * (0.55 + 0.35 * Math.sin(x * 0.4 + y * 0.3));
        if (soot > 0) c = mix(c, '#2A1E18', Math.min(0.85, soot));
        p.set(x, y, c);
      }
    for (let y = 6; y < 44; y += 9) for (let x = 0; x < 128; x++) if ((x + y) % 7 !== 0) p.set(x, y, mix('#9A6A42', '#6A4A30', 0.3));
    // ひび（細い 黒い ぎざぎざ）
    for (const [x0, y0, n] of [[20, 4, 14], [70, 8, 18], [104, 2, 10], [44, 26, 12]] as const) {
      let x = x0;
      let y = y0;
      for (let i = 0; i < n; i++) {
        p.set(x, y, '#3A2418');
        p.set(x + 1, y, '#6A4A30');
        y++;
        x += rng.next() < 0.4 ? 1 : rng.next() < 0.5 ? -1 : 0;
        if (i === Math.floor(n / 2)) for (let j = 0; j < 4; j++) p.set(x + j, y + Math.floor(j / 2), '#3A2418');
      }
    }
    // 下の 金の 帯（さびた トタン）
    for (let y = 42; y < 46; y++) p.hline(0, 127, y, y === 42 ? '#8A8A84' : '#5A5852');
    for (let x = 0; x < 128; x += 9) p.set(x, 43, '#8A5A3A');
    // 前の 空気窓（引き戸）
    for (const x0 of [0, 116]) {
      p.rect(x0, 26, 12, 14, '#3A2418');
      p.rect(x0 + 1, 27, 10, 12, '#5A3A22');
      p.vline(x0 + 6, 27, 38, '#2A1810');
    }
  });
/** 炭：黒い かたまりの すき間に 赤い 火、ふちに 白い 灰。 */
const coals = () =>
  paint('ss:coals2', 64, 64, (p) => {
    const rng = new Rng(23);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const d = Math.hypot(x - 31.5, y - 31.5);
        if (d > 32) continue;
        // かたまり の もよう（セル）
        const cell = Math.sin(x * 0.55) + Math.sin(y * 0.6 + Math.sin(x * 0.3) * 2);
        const crack = Math.abs(cell) < 0.25;
        const n = rng.next();
        let c = crack ? (n < 0.5 ? '#FF6A2A' : '#FFB040') : n < 0.75 ? '#2A1E1A' : '#3A2A24';
        if (!crack && n > 0.9) c = '#E8482A';
        // 灰（かたまりの 角、まわり）
        if (!crack && (d > 26 || (cell > 1.3 && n > 0.5))) c = n > 0.6 ? '#C8C4BC' : '#8A8680';
        p.set(x, y, c);
      }
  });
/** 口の ふち（明るい 土、欠け、すす）。 */
const rimImg = () =>
  paint('ss:rim', 32, 8, (p) => {
    const rng = new Rng(31);
    for (let y = 0; y < 8; y++) for (let x = 0; x < 32; x++) {
      const n = rng.next();
      p.set(x, y, y > 5 ? '#4A3020' : n < 0.1 ? '#8A5A38' : n > 0.92 ? '#E8B888' : '#D09A62');
    }
    for (const x of [5, 19, 27]) p.rect(x, 0, 2, 2, '#6A4A30');
  });
const net = () =>
  paint('ss:net2', 64, 64, (p) => {
    for (let i = 0; i < 64; i += 8) {
      p.hline(0, 63, i, '#6A6A66');
      p.vline(i, 0, 63, '#7A7A74');
    }
    // 網に ついた すす・焦げ
    for (let i = 0; i < 30; i++) p.set((i * 23) % 64, ((i * 37) % 8) * 8, '#2A2420');
  });
const plate = () =>
  paint('ss:plate', 32, 32, (p) => {
    p.fill('#E8E4D8');
    p.ellipse(16, 16, 13, 13, '#F4F1E8');
  });

registerPanel3d('shishito', {
  cam: { fov: 28, pitch: 26, pos: [0, 3.2, 0], far: 200 },
  // (シシトウの 緑と 焼き色、炭の 火を 正しい 色で：フィールドの 夜の 仕上げは かけず、夜の 青い 光と
  //  障子・炭の 暖かい 灯りで 見せる)
  light: { sun: '#b8c4ff', sky: '#8a94c8', ground: '#4a4048', fog: '#2a2838', sunI: 0.4, hemiI: 1.2, el: 50, az: 200 },
  grade: () => null,
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
    const lamp = new THREE.PointLight('#FFC890', 3.5, 12, 1.2);
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
      const rm = new THREE.Mesh(rim, k.material(k.tex(rimImg(), true)));
      rm.position.set(c.x, top, c.z);
      k.scene.add(rm);
      const cg = k.own(new THREE.CircleGeometry(r * 0.86, 28));
      cg.rotateX(-Math.PI / 2);
      const cm = new THREE.Mesh(cg, k.material(k.tex(coals()), { emissive: 1.6, unlit: true }));
      cm.position.set(c.x, top - 0.12, c.z);
      k.scene.add(cm);
      // 炭の かたまり（立体：黒に 赤い 火の すじ、白い 灰）
      const rngC = new Rng(5);
      const lumpT = k.tex(coals(), true);
      for (let i = 0; i < 16; i++) {
        const a = rngC.next() * Math.PI * 2;
        const d = Math.sqrt(rngC.next()) * r * 0.7;
        const sz = (5 + rngC.next() * 5) * u;
        const lg = k.own(new THREE.DodecahedronGeometry(sz, 0));
        const lm = new THREE.Mesh(lg, k.material(lumpT, { emissive: 0.5 + rngC.next() * 0.6 }));
        lm.position.set(c.x + Math.cos(a) * d, top - 0.12 + sz * 0.3, c.z + Math.sin(a) * d);
        lm.rotation.set(rngC.next() * 3, rngC.next() * 3, rngC.next() * 3);
        lm.scale.y = 0.6;
        k.scene.add(lm);
      }
      k.scene.add(new THREE.PointLight('#FF7A3A', 3, 4, 1.4).translateX(c.x).translateY(top - 0.05).translateZ(c.z + r * 0.4));
      // 網（すける 格子）
      const ng = k.own(new THREE.CircleGeometry(r * 0.98, 28));
      ng.rotateX(-Math.PI / 2);
      const nt = k.tex(net(), true);
      nt.repeat.set(4, 4);
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

