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
import { hGroundImg, lamp, NIGHT_LAMP, once, paint } from './_kit_b';

const W = 328;
const H = 112;
const D = 12;
const CX = 110;
const CY = 62;
const GROUND_ROW = 102;
const VX = [CX - 62, CX - 6, CX + 50];

/** クズの つる 3本（2D と 同じ 描き方：0 巻いている・1 切れはし・2 なし）。絵の 部分と 同じ 大きさ。 */
function vinesImg(key: string): HTMLCanvasElement {
  return once(`hmvines:${key}`, () =>
    paint(W, H, (g) => {
      key.split('').forEach((c, v) => {
        const s = Number(c);
        const x0 = VX[v];
        const cy = CY;
        if (s === 2) return;
        if (s === 0) {
          for (let w = 0; w < 5; w++) {
            const x = x0 + w * 6;
            g.rect(x, cy - 9, 3, 18, '#5A6A2A');
            g.rect(x + 1, cy - 9, 1, 18, '#7A8A3A');
            g.line(x, cy - 9, x + 6, cy + 9, '#4A5A22');
          }
          g.line(x0 - 2, cy - 8, x0 - 14, cy - 24, '#5A6A2A');
          g.line(x0 - 1, cy - 8, x0 - 13, cy - 24, '#7A8A3A');
          g.rect(x0 - 18, cy - 30, 7, 6, '#4E7A32');
          g.px(x0 - 16, cy - 29, '#6E9A4A');
          g.line(x0 + 30, cy + 8, x0 + 44, cy + 34, '#5A6A2A');
          for (let f = 0; f < 4; f++) g.rect(x0 + 40 + (f % 2) * 3, cy + 26 + f * 3, 3, 3, f % 2 ? '#9A5AB0' : '#B878C8');
        } else {
          g.rect(x0 + 8, cy - 6, 6, 12, '#5A6A2A');
          g.line(x0 + 8, cy - 6, x0 + 14, cy + 6, '#4A5A22');
        }
      });
    }),
  );
}

/** 奥の 畑の クズ（暗い 葉の かたまり）。 */
function kuzuImg(v: number): HTMLCanvasElement {
  return once(`hmkuzu:${v}`, () => {
    const p = new PixelCanvas(30, 16);
    const rng = new Rng(300 + v);
    for (let i = 0; i < 9; i++) p.ellipse(4 + Math.floor(rng.next() * 22), 8 + Math.floor(rng.next() * 6), 4, 3, i % 2 ? '#3E5A2A' : '#4E6A32');
    if (v % 2) p.rect(12, 4, 2, 3, '#9A5AB0');
    return p.toCanvas();
  });
}

registerPanel3d('himo', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 120 },
  light: { ...NIGHT_LAMP, hemiI: 0.7 },
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
    const metal = k.material(null, { tint: '#8A8E96' });
    const shaftG = k.own(new THREE.CylinderGeometry(3 * px, 3 * px, 192 * px, 12));
    shaftG.rotateZ(Math.PI / 2);
    const shaft = new THREE.Mesh(shaftG, metal);
    shaft.position.copy(c);
    shaft.castShadow = true;
    k.scene.add(shaft);
    // 曲がった 爪（軸から 外へ、先で 曲がる）・先の 土
    const tine = k.material(null, { tint: '#A8AEB6' });
    const dirt = k.material(null, { tint: '#5A4A3A' });
    const blade = (r0: number, a0: number, r1: number, a1: number): THREE.BufferGeometry => {
      const p0 = new THREE.Vector2(Math.cos(a0) * r0, Math.sin(a0) * r0);
      const p1 = new THREE.Vector2(Math.cos(a1) * r1, Math.sin(a1) * r1);
      const len = p0.distanceTo(p1);
      const g = k.own(new THREE.BoxGeometry(2.4 * px, len, 0.9 * px));
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
    lamp(k, '#ffb070', 20, k.atDepth(CX, CY - 4, -D + 3.2)!, 0, 2);
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
