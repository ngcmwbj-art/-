// 大写し「古い 山の 断面」「切り返し」（第2章 堆肥舎の 夜、events/ch2/taihi.ts TaihiPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：
//   掘る（dig）：堆肥の 山を 縦に 切った 断面（11 × 5 の ます：上の 段は かわいた 皮、下の まん中は 熱い 芯）。
//     断面は 2D の ますと 同じ 所（パネルの px）の 面に 貼り、その 奥へ 山の 丸い 背中が つづく。トマトの 灯りは
//     カーソルの ますに ついて 動く 点の 光（state.cx・cy）。穴・つぶつぶ・湯気・カーソル・幼虫・下の 字は 2D の まま 上に。
//   切り返し（kaeshi）：丸い 山（返すほど 小さく：state.done）と 右に 返した 山。温度計・湯気・フォーク・字は 2D の まま。
// 後ろは フィールドの 堆肥舎：コンクリートの 床、ブロックの 奥の 壁、木の 仕切り板。

import * as THREE from 'three';
import { Rng } from '../../engine/rng';
import { registerPanel3d, type Kit } from '../panel3d';
import { CH2_ROOM, hGround, paint, rebuild } from './_kit_c';

const COLS = 11;
const ROWS = 5;
const CEL_W = 18;
const CEL_H = 15;
const HX = 6;
const HY = 16;
const HEAP_W = COLS * CEL_W;
const HEAP_H = ROWS * CEL_H;
const MOUND = { cx: HEAP_W / 2, cy: HEAP_H + 2, rx: 100, ry: 76 };
const CH = 112;
const D = 5;

function cellKind(c: number, r: number): 'out' | 'dry' | 'soil' | 'hot' {
  const x = (c * CEL_W + CEL_W / 2 - MOUND.cx) / MOUND.rx;
  const y = (r * CEL_H + CEL_H / 2 - MOUND.cy) / MOUND.ry;
  if (x * x + y * y > 1) return 'out';
  if (r === 0) return 'dry';
  if ((r === 3 && c === 5) || (r === 4 && c >= 4 && c <= 6)) return 'hot';
  return 'soil';
}
function moundTop(x: number): number {
  const d = (x - MOUND.cx) / MOUND.rx;
  if (Math.abs(d) >= 1) return HEAP_H;
  return Math.max(0, MOUND.cy - MOUND.ry * Math.sqrt(1 - d * d));
}

/** 断面（2D の ますの 色：灯りの 当たらない 色。明るさは 点の 光が つける）。 */
function cutImg(): HTMLCanvasElement {
  return paint('th:cut', HEAP_W, HEAP_H, (p) => {
    const rng = new Rng(5);
    for (let r = 0; r < ROWS; r++)
      for (let c = 0; c < COLS; c++) {
        const kind = cellKind(c, r);
        if (kind === 'out') continue;
        const base = kind === 'dry' ? '#9A7A58' : kind === 'hot' ? '#8A4430' : r <= 1 ? '#6A4E38' : '#5A4030';
        for (let y = 0; y < CEL_H; y++)
          for (let x = 0; x < CEL_W; x++) {
            const n = rng.next();
            p.set(c * CEL_W + x, r * CEL_H + y, n < 0.08 ? '#3A2A20' : n > 0.94 ? (kind === 'dry' ? '#C8AC84' : '#8A6A4E') : base);
          }
      }
    // 丸い 上の ふち の 外は 透明に（2D の 角を 落とす 線と 同じ）
    for (let x = 0; x < HEAP_W; x++) {
      const top = Math.round(moundTop(x));
      for (let y = 0; y < top; y++) p.set(x, y, 0);
    }
  });
}
const compost = () =>
  paint('th:compost', 32, 32, (p) => {
    const rng = new Rng(9);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      const n = rng.next();
      p.set(x, y, n < 0.15 ? '#3A2A20' : n > 0.9 ? '#8A6A4E' : n > 0.75 ? '#7A6046' : '#5A4030');
    }
  });
const blocks = () =>
  paint('th:blocks', 32, 16, (p) => {
    p.fill('#8A8A90');
    for (let y = 0; y < 16; y += 8) {
      p.hline(0, 31, y, '#6A6A72');
      for (let x = (y / 8) % 2 ? 8 : 0; x < 32; x += 16) p.vline(x, y, y + 7, '#6A6A72');
    }
  });
const planks = () =>
  paint('th:planks', 16, 16, (p) => {
    p.fill('#6A4A30');
    for (let y = 0; y < 16; y += 4) p.hline(0, 15, y, '#4A3020');
    p.set(5, 2, '#8A6A44');
    p.set(11, 9, '#8A6A44');
  });

/** 山（半分の だ円体）：中心 c（床の 高さ）、半径 rx・ry・rz（単位）。back：奥の 半分だけ（断面の 後ろ）。 */
function dome(k: Kit, c: THREE.Vector3, rx: number, ry: number, rz: number, back: boolean): THREE.Mesh {
  const g = k.own(new THREE.SphereGeometry(1, 28, 12, back ? Math.PI : 0, back ? Math.PI : Math.PI * 2, 0, Math.PI / 2));
  const t = k.tex(compost(), true);
  t.repeat.set(6, 3);
  const m = new THREE.Mesh(g, k.material(t, { side: THREE.DoubleSide }));
  m.scale.set(rx, ry, rz);
  m.position.copy(c);
  m.castShadow = m.receiveShadow = true;
  k.scene.add(m);
  return m;
}

registerPanel3d('taihi', {
  cam: { fov: 30, pitch: 4, pos: [0, 1.2, 0], far: 120 },
  light: CH2_ROOM,
  fog: null,
  // (堆肥舎の 中：灯りの 色で 見せる。夜の 仕上げは かけない)
  grade: () => null,
  shadow: { x: 0, z: -6, hw: 6, hd: 6 },
  focus: 0.6,
  tilt: 0.7,
  build(k) {
    const floorRow = HY + HEAP_H;
    const f = k.atDepth(HX + HEAP_W / 2, floorRow, -D)!;
    const y0 = f.y;
    k.bag.y0 = y0;
    k.tiled(hGround('h_concrete', 64, 64), -20, 20, -16, 3, y0, 16);
    // 奥の ブロックの 壁と 両わきの 木の 仕切り
    k.box(-20, 20, y0, y0 + 6, -11, -10.8, { front: blocks() });
    for (const x of [-4.6, 4.4]) k.box(x, x + 0.15, y0, y0 + 1.6, -10.8, -3.2, { left: planks(), right: planks(), top: planks(), front: planks() });
    const lamp = new THREE.PointLight('#FFB070', 4, 4, 1.4);
    k.scene.add(lamp);
    k.bag.lamp = lamp;
  },
  update(k, _t, s) {
    const y0 = k.bag.y0 as number;
    const lamp = k.bag.lamp as THREE.PointLight;
    if (s.mode === 'dig') {
      rebuild(k, 'heap', 'dig', () => {
        const a = k.atDepth(HX, HY + HEAP_H, -D)!;
        const b = k.atDepth(HX + HEAP_W, HY, -D)!;
        k.quad(cutImg(), [a.x, a.y, -D], [b.x, a.y, -D], [b.x, b.y, -D], [a.x, b.y, -D]);
        const u = k.pxAt(D);
        const c = k.atDepth(HX + MOUND.cx, HY + MOUND.cy, -D)!;
        dome(k, new THREE.Vector3(c.x, c.y, -D), MOUND.rx * u, MOUND.ry * u, 2.2, true);
      });
      const at = k.atDepth(HX + Number(s.cx) * CEL_W + CEL_W / 2, HY + Number(s.cy) * CEL_H + CEL_H / 2, -D)!;
      lamp.position.set(at.x, at.y + 0.1, -D + 0.9);
      lamp.intensity = s.lit ? 4 : 1.2;
    } else {
      const done = Number(s.done) || 0;
      rebuild(k, 'heap', `k${done}`, () => {
        const base = CH - 18;
        const u = k.pxAt(D);
        const c = k.atDepth(HX + 70, base, -D)!;
        dome(k, new THREE.Vector3(c.x, y0, -D - 0.6), (66 - done * 6) * u, (58 - done * 6) * u, 1.6 - done * 0.15, false);
        if (done) {
          const p = k.atDepth(HX + 168, base, -D)!;
          dome(k, new THREE.Vector3(p.x, y0, -D - 0.3), (10 + done * 6) * u, (6 + done * 5) * u, 0.4 + done * 0.15, false);
        }
        // 熱い 芯の 光（山の 中から もれる）
        const glow = new THREE.PointLight('#E07A3A', 2.5, 3, 1.5);
        glow.position.set(c.x, y0 + 0.4, -D + 0.6);
        k.scene.add(glow);
      });
      const at = k.atDepth(HX + 70, 40, -D)!;
      lamp.position.set(at.x + 0.6, at.y, -D + 1.6);
      lamp.intensity = 3;
    }
  },
});
