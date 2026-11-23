// 大写し「牛房の 床」（第2章 牛舎の 南4、events/ch2/neru.ts YukaPanel）を HD-2D で（2026-11-23 依頼主
// 「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：通路から 少し 上から 見た 牛房 —— 奥の 柵（鉄パイプ 2本）と その 向こうの
// 牛の 黒い おしり、おがくずの 床。かき出す ときは ぬれた 所（灯りが 低いほど はっきり：state.light）、
// かき出した 所は コンクリートの 灰色、前の 左の 柱の 水飲み。しく ときは 5列の おがくずの 山（state.piles）。
// トマトの 灯り（はなまるトマト）は 点の 光：低いほど 輪が 小さく 明るい。
// 床・柵・牛は フィールドの 牛舎と 同じ 絵（おがくず h_sawdust、牛 cowFrame の うしろ姿）。
// 床の 上の 物は 2D の 絵の 四角（パネルの px）を Kit.ground で 床に 置く：カーソルの 四角（2D）と 合う。
// カーソル・フォーク・右の 列は 2D の まま 上に。

import * as THREE from 'three';
import { cowFrame } from '../../art/chars/hoshi_cattle';
import { registerPanel3d, type Kit } from '../panel3d';
import { CH2_ROOM, hGround, paint } from './_kit_c';

/** 2D の 床の 四角（パネルの px）。 */
const FX = 12;
const FY = 22;
const FW = 196;
const FH = 84;
const W = 222;
/** パネルの 絵の 高さ（2D の CH）。 */
const CH_ROWS = 112;

/** パネルの 四角（px）を 床（高さ y）に 貼る 板。 */
function floorQuad(k: Kit, img: HTMLCanvasElement, x: number, y: number, w: number, h: number, yy: number, o: { opacity?: number; color?: string } = {}): THREE.Mesh | null {
  const a = k.ground(x, y + h, yy);
  const b = k.ground(x + w, y + h, yy);
  const c = k.ground(x + w, y, yy);
  const d = k.ground(x, y, yy);
  if (!a || !b || !c || !d) return null;
  const g = k.own(new THREE.BufferGeometry());
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray()], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setAttribute('normal', new THREE.Float32BufferAttribute([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0], 3));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const m = k.material(k.tex(img), { tint: o.color }) as THREE.MeshLambertMaterial;
  if (o.opacity !== undefined) {
    m.transparent = true;
    m.opacity = o.opacity;
    m.depthWrite = false;
    m.alphaTest = 0.01;
  }
  const mesh = new THREE.Mesh(g, m);
  mesh.receiveShadow = true;
  k.scene.add(mesh);
  return mesh;
}

/** ぬれた おがくず（茶色の しみ：まわりが ぼける）。 */
const wetImg = () =>
  paint('nr:wet', 24, 20, (p) => {
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < 24; x++) {
        const dx = Math.abs(x - 11.5) / 12;
        const dy = Math.abs(y - 9.5) / 10;
        const d = Math.max(dx * 1.1, dy) + ((x * 7 + y * 13) % 5) * 0.03;
        if (d < 0.78) p.set(x, y, (x + y) % 5 === 0 ? '#4A3820' : '#5A4428');
        else if (d < 0.95 && (x + y) % 2 === 0) p.set(x, y, '#6A5434');
      }
  });
/** かき出した 所（コンクリート、少し しめって）。 */
const scrapedImg = () =>
  paint('nr:scraped', 16, 16, (p) => {
    p.fill('#A8A8A0');
    for (let i = 0; i < 20; i++) p.set((i * 7) % 16, (i * 5) % 16, '#8E8E88');
    for (let i = 0; i < 6; i++) p.set((i * 11 + 3) % 16, (i * 3 + 1) % 16, '#C8B48C');
  });
const pipe = () => paint('nr:pipe', 16, 4, (p) => {
  p.fill('#9AA0A8');
  p.hline(0, 15, 0, '#C8CCD4');
  p.hline(0, 15, 3, '#6A7078');
});
const curb = () => paint('nr:curb', 16, 16, (p) => {
  p.fill('#8A8A84');
  for (let i = 0; i < 12; i++) p.set((i * 5) % 16, (i * 7) % 16, '#7A7A74');
});

registerPanel3d('neru', {
  cam: { fov: 26, pitch: 58, pos: [0, 8, 0], far: 200 },
  light: CH2_ROOM,
  fog: null,
  // (牛舎の 中：フィールドの 夜の 色の 仕上げは かけず、灯りの 色で：2D の 大写しと 同じ 明るさ)
  grade: () => null,
  shadow: { x: 0, z: -5, hw: 6, hd: 6 },
  focus: 0.55,
  tilt: 0.7,
  build(k, s) {
    // 床（おがくず）と まわりの コンクリート
    const p0 = k.ground(0, 0, 0)!;
    const p1 = k.ground(W, CH_ROWS, 0)!;
    k.tiled(hGround('h_barnfloor', 64, 64), p0.x - 6, p1.x + 6, p0.z - 6, p1.z + 4, -0.02, 16);
    const f0 = k.ground(FX, FY, 0)!;
    const f1 = k.ground(FX + FW, FY + FH, 0)!;
    k.tiled(hGround('h_sawdust', 64, 64), Math.min(f0.x, k.ground(FX, FY + FH, 0)!.x), Math.max(f1.x, k.ground(FX + FW, FY, 0)!.x), f0.z, f1.z, 0, 16);
    // 奥の 柵（2D：行 10〜17 の 鉄パイプ 2本）と 柱
    const back = k.ground(W / 2, 17, 0)!;
    const zb = back.z;
    const top = k.atDepth(W / 2, 10, zb)!;
    const xl = p0.x - 6;
    const xr = p1.x + 6;
    const pr = 0.06;
    for (const yy of [top.y, top.y - 0.35]) k.box(xl, xr, yy - pr, yy + pr, zb - pr, zb + pr, { front: pipe(), top: pipe() });
    for (let x = Math.ceil(xl); x < xr; x += 2.5) k.box(x - 0.06, x + 0.06, 0, top.y + 0.1, zb - 0.06, zb + 0.06, { front: pipe(), left: pipe(), right: pipe() });
    // 奥の 牛（柵の 向こうの 黒い おしり：2D の x 60・110・160）
    const cow = cowFrame('rear', 'base');
    for (const [x, sx] of [[60, 0], [110, 1], [160, 0]] as const) {
      const at = k.ground(x, 17, 0)!;
      k.stand(cow, new THREE.Vector3(at.x, 0, zb - 0.7 - sx * 0.2), { px: 1 / 16 * 1.25, depth: 10, unlit: true, flip: sx === 1 });
    }
    // 床の ふちの コンクリートの 低い 縁
    const fl = k.ground(FX, FY + FH, 0)!;
    k.box(fl.x - 0.2, k.ground(FX + FW, FY + FH, 0)!.x + 0.2, 0, 0.06, fl.z, fl.z + 0.25, { top: curb(), front: curb() });
    // 前の 左の 柱の 水飲み（2D：fx−6, fy−6 の 12 × 10）
    if (s.mode === 'kaki') {
      const w0 = k.ground(FX - 6, FY + 4, 0)!;
      const w1 = k.ground(FX + 6, FY + 4, 0)!;
      const cup = paint('nr:cup', 16, 16, (p) => p.fill('#9AA0A8'));
      const water = paint('nr:water', 16, 16, (p) => {
        p.fill('#4AA8E0');
        p.hline(2, 9, 4, '#8AD0F0');
      });
      k.box(w0.x, w1.x, 0, 0.45, w0.z - (w1.x - w0.x) * 0.8, w0.z, { front: cup, left: cup, right: cup });
      k.box(w0.x + 0.05, w1.x - 0.05, 0.4, 0.43, w0.z - (w1.x - w0.x) * 0.8 + 0.05, w0.z - 0.05, { top: water });
    }
    // トマトの 灯り（点の 光）
    const lamp = new THREE.PointLight('#FFB070', 0, 7, 2);
    k.scene.add(lamp);
    k.bag.lamp = lamp;
    k.bag.center = k.ground(FX + FW / 2, FY + FH / 2, 0)!;
  },
  update(k, _t, s) {
    const lamp = k.bag.lamp as THREE.PointLight;
    const c = k.bag.center as THREE.Vector3;
    const light = Number(s.light ?? 3);
    // 低いほど 床に 近く、明るい 輪が 小さい
    lamp.position.set(c.x, 1.2 + light * 0.8, c.z + 0.3);
    lamp.intensity = 3 + (3 - light) * 1.1;
    const key = JSON.stringify([s.mode, s.wet, s.piles, light]);
    if (k.bag.key === key) return;
    k.bag.key = key;
    const old = k.bag.group as THREE.Group | undefined;
    if (old) k.scene.remove(old);
    const before = k.scene.children.length;
    const cw = FW / 4;
    const rh = FH / 2;
    if (s.mode === 'kaki') {
      const low = (3 - light) / 3;
      const spots = s.spots as { c: number; r: number; wet: boolean }[];
      const gone = Number(s.wet) || 0;
      spots.forEach((sp, i) => {
        const x = FX + sp.c * cw;
        const y = FY + sp.r * rh;
        const g = gone & (1 << i);
        if (sp.wet && !g) floorQuad(k, wetImg(), x + 8, y + 5, cw - 16, rh - 10, 0.012, { opacity: 0.15 + 0.75 * low });
        if (g) floorQuad(k, scrapedImg(), x + 10, y + 8, cw - 20, rh - 16, 0.014, { opacity: 0.85 });
      });
    } else {
      // おがくずの 山（5列）：数だけ 高く・奥行きも 広く
      const piles = (s.piles as number[]) ?? [];
      const sw = FW / piles.length;
      const saw = hGround('h_sawdust', 32, 32, 7, 3);
      piles.forEach((n, i) => {
        if (n <= 0) return;
        const hh = 6 + (n - 1) * 7;
        const a = k.ground(FX + i * sw + 4, FY + FH / 2 + hh / 2, 0)!;
        const b = k.ground(FX + (i + 1) * sw - 4, FY + FH / 2 - hh / 2, 0)!;
        const h = 0.08 + n * 0.07;
        k.box(a.x, b.x, 0, h, b.z, a.z, { top: saw, front: saw, left: saw, right: saw, back: saw });
      });
    }
    // (box は finish() で 1つに まとまる)
    k.finish();
    const grp = new THREE.Group();
    for (const o of k.scene.children.slice(before)) grp.add(o);
    k.scene.add(grp);
    k.bag.group = grp;
    k.shadowDirty = true;
  },
});
