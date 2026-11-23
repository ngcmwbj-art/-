// 大写し「爪」（第2章 山道の 入口の 前の テツヤ（耕うん機）の 爪、events/ch2/himo.ts TsumePanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜の 畑（テツヤが 夜通し 耕した 土）、トマトの 灯り。横に のびる 爪の 軸、
// 軸の まわりを 回る 曲がった 爪 6本（土が ついて いる）、軸に 巻きついた クズの つる 3本（巻き始めの はしと 葉、
// 畑へ のびる つると 紫の 花）。切ると 切れはしだけ・取れると なし。爪は 2D と 同じ 角度で 回る（止める
// レバーの あと ゆっくり 止まる）。切る 所の 輪・右の 丸い 拡大は 2D の まま 上に 乗る。
// 3D では 爪は 軸の まわりを 本当に 回る（軸は 横、爪の 先は 手前と 奥を 通る）。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { registerPanel3d, type Kit } from '../panel3d';
import { grain, hGroundImg, lamp, NIGHT_LAMP, once, paint, ramp, soft } from './_kit_b';

const W = 328;
const H = 112;
const D = 12;
const CX = 110;
const CY = 62;
const GROUND_ROW = 102;
const VX = [CX - 62, CX - 6, CX + 50];

/** クズの つる 3本（2D と 同じ 描き方：0 巻いている・1 切れはし・2 なし）。絵の 部分と 同じ 大きさ。 */
function vinesImg(key: string): HTMLCanvasElement {
  return once(`hmvines2:${key}`, () =>
    paint(W, H, (g) => {
      key.split('').forEach((c, v) => {
        const s = Number(c);
        const x0 = VX[v];
        const cy = CY;
        if (s === 2) return;
        if (s === 0) {
          // 巻いた つる：ねじれた 太い つる（左が 光、右が 影）、茶色の 細かい 毛、巻きの すき間は 暗い
          for (let w = 0; w < 5; w++) {
            const x = x0 + w * 6;
            for (let y = cy - 9; y < cy + 9; y++) {
              const t = (y - cy + 9) / 18;
              const xx = x + Math.round(t * 2);
              g.px(xx, y, '#7A8A3A');
              g.px(xx + 1, y, (y + w) % 3 ? '#62722E' : '#7A8A3A');
              g.px(xx + 2, y, '#4A5A22');
              g.px(xx + 3, y, '#2E3818');
              if ((y * 7 + w * 3) % 5 === 0) g.px(xx - 1, y, '#9A8A5A');
              if ((y * 5 + w) % 7 === 0) g.px(xx + 4, y, '#8A7A4A');
            }
          }
          // 巻き始めの はし（毛の ある つる）と 3枚の 小葉
          g.line(x0 - 2, cy - 8, x0 - 14, cy - 24, '#5A6A2A');
          g.line(x0 - 1, cy - 8, x0 - 13, cy - 24, '#7A8A3A');
          for (let k = 0; k < 6; k++) g.px(x0 - 4 - k * 2, cy - 11 - k * 2 - (k % 2), '#9A8A5A');
          for (const [lx, ly, r] of [[x0 - 15, cy - 30, 4], [x0 - 20, cy - 26, 3], [x0 - 10, cy - 26, 3]] as const) {
            g.circle(lx, ly, r, '#3E6A2A');
            g.circle(lx - 1, ly - 1, r - 1, '#5A8A3A');
            g.line(lx, ly + r - 1, lx, ly - r + 1, '#7AA04A');
          }
          g.line(x0 + 30, cy + 8, x0 + 44, cy + 34, '#5A6A2A');
          for (let f = 0; f < 4; f++) g.rect(x0 + 40 + (f % 2) * 3, cy + 26 + f * 3, 3, 3, f % 2 ? '#9A5AB0' : '#B878C8');
        } else {
          // 爪の すき間に 残った 切れはし（切り口は 淡い 緑、ささくれ）
          for (let y = cy - 6; y < cy + 6; y++) {
            g.px(x0 + 8, y, '#7A8A3A');
            g.rect(x0 + 9, y, 3, 1, (y & 1) ? '#62722E' : '#5A6A2A');
            g.px(x0 + 12, y, '#3A4A1C');
            g.px(x0 + 13, y, '#2E3818');
          }
          g.rect(x0 + 8, cy - 7, 6, 1, '#C8D8A0');
          g.rect(x0 + 8, cy + 6, 6, 1, '#B8C890');
          g.px(x0 + 7, cy - 8, '#9A8A5A');
          g.px(x0 + 14, cy + 7, '#9A8A5A');
        }
      });
    }),
  );
}

/** 奥の 畑の クズ（暗い 葉の かたまり）。 */
function kuzuImg(v: number): HTMLCanvasElement {
  return once(`hmkuzu2:${v}`, () => {
    // クズの 葉（3枚 1組の 丸い 小葉、葉脈）が 重なる かたまり、ときどき 紫の 花穂
    const p = new PixelCanvas(34, 20);
    const rng = new Rng(300 + v);
    const LEAF = ['#24361C', '#2E4422', '#3A5428', '#4A6632', '#5A783C', '#6E8C48'];
    for (let i = 0; i < 7; i++) {
      const cx = 5 + Math.floor(rng.next() * 24);
      const cy = 7 + Math.floor(rng.next() * 9);
      for (const [dx, dy] of [[0, -3], [-3, 1], [3, 1]]) {
        const lx = cx + dx;
        const ly = cy + dy;
        for (let y = -3; y <= 3; y++)
          for (let x = -3; x <= 3; x++) {
            if (x * x + y * y * 1.3 > 9.5) continue;
            const l = 0.55 - y * 0.06 - x * 0.04 + (rng.next() - 0.5) * 0.12 - i * 0.03;
            p.set(lx + x, ly + y, ramp(LEAF, l));
          }
        p.set(lx, ly, LEAF[4]);
        p.set(lx, ly - 1, LEAF[5]);
      }
    }
    if (v % 2) for (let k = 0; k < 4; k++) p.set(14 + (k & 1), 3 + k, k % 2 ? '#9A5AB0' : '#C88AD8');
    return p.toCanvas();
  });
}

/** 爪の 軸（鋼：長い すじ、油よごれ、さび、こびりついた 土）。 */
function shaftImg(): HTMLCanvasElement {
  return once('hmshaft', () => {
    const p = new PixelCanvas(96, 16);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 96; x++) {
        let l = 0.5 + (soft(x * 0.3, y * 2, 4, 330) - 0.5) * 0.35 + (grain(x, y, 331) - 0.5) * 0.1;
        let c = ramp(['#2E3036', '#44484E', '#5A5E66', '#70767E', '#8A9098', '#A8AEB6'], l);
        if (soft(x, y, 5, 332) > 0.72) c = ramp(['#5A3420', '#7A4426', '#985A30'], soft(x, y, 3, 333));
        if (soft(x, y, 7, 334) > 0.7 && grain(x, y, 335) < 0.7) c = grain(x, y, 336) < 0.5 ? '#4A3A2A' : '#6A5440';
        p.set(x, y, c);
      }
    return p.toCanvas();
  });
}

/** 爪（使いこんだ 鋼：先ほど 土で 茶色、刃の ふちは 光る）。 */
function tineImg(): HTMLCanvasElement {
  return once('hmtine', () => {
    const p = new PixelCanvas(8, 32);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 8; x++) {
        let c = ramp(['#3A3E46', '#545A64', '#6E7682', '#8A94A0', '#B0B8C4'], 0.55 - Math.abs(x - 3) * 0.08 + (grain(x, y, 340) - 0.5) * 0.2);
        if (x === 0) c = '#C8D0DA';
        if (y > 18 && soft(x, y, 3, 341) < (y - 18) / 16) c = grain(x, y, 342) < 0.5 ? '#5A4A3A' : '#7A644C';
        p.set(x, y, c);
      }
    return p.toCanvas();
  });
}

registerPanel3d('himo', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 120 },
  light: { ...NIGHT_LAMP, sun: '#c8d4ff', hemiI: 1.1, sunI: 0.8 },
  fog: [D + 2, D + 30],
  shadow: { x: 0, z: -D, hw: 8, hd: 5 },
  grade: () => null,
  focus: 0.55,
  tilt: 0.5,
  build(k: Kit) {
    const px = k.pxAt(D);
    k.camera.position.y = (GROUND_ROW - H / 2) * px;
    k.camera.updateMatrixWorld();
    // 耕した 土と、奥の クズの 畑
    k.tiled(hGroundImg('h_tilled', 64, 64), -40, 40, -D - 40, -D + 8, 0, 16);
    const rng = new Rng(77);
    for (let row = 0; row < 4; row++)
      for (let x = -40; x < W + 40; x += 18 + rng.next() * 20) {
        const v = k.atDepth(x, GROUND_ROW, -D - 6 - row * 5)!;
        v.y = 0;
        k.stand(kuzuImg(Math.floor(rng.next() * 4)), v, { px: px * 1.6, depth: 3, cast: false });
      }
    // 爪の 軸（2D の 軸の 所）
    const c = k.atDepth(CX, CY, -D)!;
    const metal = k.material(k.tex(shaftImg()));
    const shaftG = k.own(new THREE.CylinderGeometry(3 * px, 3 * px, 192 * px, 12));
    shaftG.rotateZ(Math.PI / 2);
    const shaft = new THREE.Mesh(shaftG, metal);
    shaft.position.copy(c);
    shaft.castShadow = true;
    k.scene.add(shaft);
    // 曲がった 爪（軸から 外へ、先で 曲がる）・先の 土
    const tine = k.material(k.tex(tineImg()));
    const dirt = k.material(null, { tint: '#5A4A3A' });
    const blade = (r0: number, a0: number, r1: number, a1: number): THREE.BufferGeometry => {
      const p0 = new THREE.Vector2(Math.cos(a0) * r0, Math.sin(a0) * r0);
      const p1 = new THREE.Vector2(Math.cos(a1) * r1, Math.sin(a1) * r1);
      const len = p0.distanceTo(p1);
      const g = k.own(new THREE.BoxGeometry(3.5 * px, len, 1.2 * px));
      g.rotateX(-(Math.atan2(p1.y - p0.y, p1.x - p0.x) - Math.PI / 2));
      g.translate(0, (p0.y + p1.y) / 2, (p0.x + p1.x) / 2);
      return g;
    };
    // （2D：中ほど 半径 14〜18 で 角度 +0.5、先は 半径 22〜30）
    const g1 = blade(2 * px, 0.5, 17 * px, 0.5);
    const g2 = blade(17 * px, 0.5, 27 * px, 0);
    const tipG = k.own(new THREE.BoxGeometry(3 * px, 2 * px, 2 * px));
    tipG.translate(0, 0, 27 * px);
    const rotor: THREE.Group[] = [];
    for (let i = 0; i < 6; i++) {
      const grp = new THREE.Group();
      grp.position.copy(k.atDepth(CX - 70 + i * 28, CY, -D)!);
      for (const [geo, m] of [[g1, tine], [g2, tine], [tipG, dirt]] as const) {
        const mesh = new THREE.Mesh(geo, m);
        mesh.castShadow = true;
        grp.add(mesh);
      }
      k.scene.add(grp);
      rotor.push(grp);
    }
    k.bag.rotor = rotor;
    k.bag.vines = new Map<string, THREE.Mesh>();
    // トマトの 灯り（2D の 暖かい 輪の 中心の 前）
    lamp(k, '#ffc890', 26, k.atDepth(CX, CY - 10, -D + 3.6)!, 0, 2);
  },
  update(k: Kit, _t, s) {
    const ang = Number(s.ang);
    (k.bag.rotor as THREE.Group[]).forEach((g, i) => (g.rotation.x = -(ang + (i * Math.PI) / 3)));
    const key = String(s.vines);
    const vines = k.bag.vines as Map<string, THREE.Mesh>;
    if (!vines.has(key)) {
      // （軸の 前の 面に：巻いた つるは 軸の 手前に 見える）
      vines.set(key, k.stand(vinesImg(key), k.atDepth(W / 2, H, -D + 0.28)!, { px: k.pxAt(D - 0.28), depth: 3 }));
    }
    for (const [kk, m] of vines) m.visible = kk === key;
    k.shadowDirty = true;
  },
});
