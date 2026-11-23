// 大写し「スリットと ドーム」（見上げる 画面）と「接眼レンズ」（第2章 分校の 裏の 丘の 天文台、
// events/ch2/dome.ts DomeSkyPanel・DomeEyePanel）を HD-2D で（2026-11-23 依頼主「ミニゲームの絵が雑すぎるから
// …HD -2Dにして」）。
//
//   dome_eye  接眼レンズを のぞいた 所：視野の 外は 暗い 中に 見口の ゴムの 筒（輪の みぞ）が 奥へ 細く
//             なって いき、奥の はしに 金属の 視野環。天文台の 赤い 明かりが うっすら 当たる。
//             視野の 中（星の 像・ぼけ）・ふちの ぼかし・まん中の 輪・札は 2D の まま 上に 乗る。
//   dome_sky  ドームの 中から 見上げる 所：ドームの 内側の 殻（暗い 板、骨）が 頭の 上へ 丸く かぶさり、
//             前に スリット（両わきの レール、びょう）。スリットの 中に 空（2D と 同じ 空の 絵、ドームの 向きで
//             動く）と、閉じて いる 間の シャッターの 板。下に 台の 輪（鋼、びょう）と 白い 筒の 壁。
//             ちり・星の 名札・方位の 帯・ハンドル・札は 2D の まま 上に 乗る。
// ドームの 殻は カメラを 中心に した 球なので、スリットの ふちは 画面で まっすぐ 縦に 見える（2D の スリットと
// 同じ 所に 合わせる）。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { HOR, LOOK, PAN_W, panX, skyPanorama, SLIT_W } from '../../art/props/dome_sky_art';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { grain, lamp, once, paint, ramp, soft } from './_kit_b';

const W = 384;
const H = 216;

/** 天文台の 中（赤い 明かり、空の 光は ほとんど なし）。 */
const RED_ROOM: PanelLight = { sun: '#8a90c8', sky: '#3a3c5a', ground: '#1a1420', fog: '#05050a', sunI: 0.25, hemiI: 0.5, el: 70, az: 180 };

// ---------------------------------------------------------------- 接眼レンズ

/** 見口の ゴム（筒の 内側：輪の みぞ）。 */
function rubberImg(): HTMLCanvasElement {
  return once('dmrubber', () => {
    const p = new PixelCanvas(64, 32);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 64; x++) p.set(x, y, y % 8 === 0 ? '#08080C' : y % 8 === 1 ? '#2A2A34' : (x * 7 + y * 3) % 23 === 0 ? '#1E1E26' : '#16161E');
    return p.toCanvas();
  });
}

registerPanel3d('dome_eye', {
  cam: { fov: 40, pitch: 0, pos: [0, 0, 0], near: 0.05, far: 50 },
  light: { ...RED_ROOM, hemiI: 1.1 },
  fog: null,
  shadow: null,
  grade: () => null,
  focus: 0.5,
  tilt: 0.9,
  build(k: Kit) {
    // 視野の 中心（2D の EYE：192, 104）へ 向く 筒。奥の はしが 視野の ふち（半径 84px）に 来る
    const far = 6;
    const c = k.atDepth(192, 104, -far)!;
    const r = 86 * k.pxAt(far);
    const len = far - 0.3;
    const tex = k.tex(rubberImg(), true).clone();
    tex.needsUpdate = true;
    tex.repeat.set(6, 10);
    k.own(tex);
    const g = k.own(new THREE.CylinderGeometry(r, r * 1.35, len, 48, 1, true));
    g.rotateX(Math.PI / 2);
    const m = new THREE.Mesh(g, k.material(tex, { side: THREE.BackSide }));
    m.position.set(c.x, c.y, -0.3 - len / 2);
    k.scene.add(m);
    // 奥の はしの 金属の 視野環
    const ringG = k.own(new THREE.TorusGeometry(r * 1.02, r * 0.05, 8, 64));
    const ring = new THREE.Mesh(ringG, k.material(null, { tint: '#6B7186' }));
    ring.position.set(c.x, c.y, -far);
    k.scene.add(ring);
    // 天文台の 赤い 明かり（左下の 箱から）と、星の 光の 返し
    lamp(k, '#ff3a2a', 5, new THREE.Vector3(c.x - r * 1.6, c.y - r * 1.4, -1.2), 0, 2);
    lamp(k, '#a8b8ff', 0.6, new THREE.Vector3(c.x, c.y, -far + 0.5), 0, 2);
  },
});

// ---------------------------------------------------------------- 見上げる 画面

/** ドームの 内側の 殻：暗い 板、縦の 骨、横の 継ぎ目（2D の lookFrame と 同じ 色）。 */
function shellImg(): HTMLCanvasElement {
  return once('dmshell2', () => {
    // 鋼板の 継ぎ目、縦の 骨（光る ふち）、びょうの 列、古い さびの すじ、板ごとの 色の ちがい
    const p = new PixelCanvas(256, 64);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 256; x++) {
        const panel = Math.floor(x / 32) + Math.floor(y / 22) * 8;
        let l = 0.45 + (grain(panel, 0, 900) - 0.5) * 0.18 + (soft(x, y, 8, 901) - 0.5) * 0.15 - (y < 22 ? 0.08 : 0);
        const lx = x % 32;
        if (lx === 0) l = 0.85;
        else if (lx === 1) l = 0.7;
        else if (lx === 2) l = 0.12;
        if (y % 22 === 0) l = 0.08;
        if (y % 22 === 1) l = 0.62;
        if ((lx === 4 || lx === 29) && y % 6 === 3) l = 0.95;
        let c = ramp(['#121322', '#191A2E', '#1E2036', '#24263E', '#2C2F4A', '#34385A', '#4A4E72', '#6A6E90'], l);
        if (soft(x * 3, y * 0.3, 6, 902) > 0.78 && lx > 3) c = '#3A2A30';
        p.set(x, y, c);
      }
    return p.toCanvas();
  });
}

/** 台の 輪（鋼、びょう、ローラー）と 下の 白い 筒の 壁。 */
function ringImg(): HTMLCanvasElement {
  return once('dmring', () => {
    const p = new PixelCanvas(256, 16);
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 256; x++) {
        let c = y === 0 ? '#5A606C' : y < 3 ? '#7E8590' : y < 9 ? '#6B7186' : '#4A5060';
        if (y === 5 && x % 16 === 8) c = '#A6ADB6';
        p.set(x, y, c);
      }
    return p.toCanvas();
  });
}
function drumImg(): HTMLCanvasElement {
  return once('dmdrum', () => {
    const p = new PixelCanvas(256, 32);
    for (let y = 0; y < 32; y++) for (let x = 0; x < 256; x++) p.set(x, y, (x * 17 + y * 5) % 31 === 0 ? '#7E8298' : '#8A8EA6');
    return p.toCanvas();
  });
}
/** スリットの レール（両わき、びょう）。 */
function railImg(): HTMLCanvasElement {
  return once('dmrail', () =>
    paint(4, 64, (g) => {
      g.rect(0, 0, 1, 64, '#3A3F48');
      g.rect(1, 0, 1, 64, '#6B7186');
      g.rect(2, 0, 1, 64, '#9AA0A8');
      g.rect(3, 0, 1, 64, '#3A3F48');
      for (let y = 7; y < 64; y += 14) g.px(1, y, '#C8CDD4');
    }),
  );
}

registerPanel3d('dome_sky', {
  cam: { fov: 64, pitch: 0, pos: [0, 0, 0], near: 0.05, far: 200 },
  // （殻と 筒の 壁は 2D と 同じ くらいの 明るさに：空の 光を 強く、赤い 明かりは 下から 少し）
  light: { ...RED_ROOM, sky: '#d0d4ff', ground: '#9a98b8', hemiI: 2.4, sunI: 0.6 },
  fog: null,
  shadow: null,
  grade: () => null,
  focus: 0.3,
  tilt: 0.6,
  build(k: Kit) {
    const R = 8;
    // スリットの ふち：画面の LOOK.slitX と slitX + SLIT_W（縦の まっすぐな 線）
    const l = k.atDepth(LOOK.slitX - 4, 108, -R)!;
    const half = Math.atan2(-l.x, R);
    // 台の 輪の 高さ：画面の 真ん中の 列で 2D の 輪の 行（HOR）
    const ringP = k.atDepth(192, HOR, -R)!;
    const yr = ringP.y;
    // 殻：球（カメラが 中心）の 上半分 ＋ 輪までの 筒。スリットの 所（前の -Z、角度 ±half）を あける
    // （three の 球：x = -R cos φ sin θ、z = R sin φ sin θ。前の -Z は φ = 3π/2。筒：x = R sin θ、z = R cos θ、-Z は θ = π）
    const phi0 = (Math.PI * 3) / 2 + half;
    const shellTex = k.tex(shellImg(), true).clone();
    shellTex.needsUpdate = true;
    shellTex.repeat.set(8, 3);
    k.own(shellTex);
    const shellMat = k.material(shellTex, { side: THREE.BackSide });
    const dome = k.own(new THREE.SphereGeometry(R, 64, 24, phi0, Math.PI * 2 - 2 * half, 0, Math.PI / 2));
    k.scene.add(new THREE.Mesh(dome, shellMat));
    const wallH = -yr;
    const cyl = k.own(new THREE.CylinderGeometry(R, R, wallH, 64, 1, true, Math.PI + half, Math.PI * 2 - 2 * half));
    cyl.translate(0, yr + wallH / 2, 0);
    k.scene.add(new THREE.Mesh(cyl, shellMat));
    // 台の 輪と 筒の 壁（スリットの 下も ぐるり）
    const ringTex = k.tex(ringImg(), true).clone();
    ringTex.needsUpdate = true;
    ringTex.repeat.set(10, 1);
    k.own(ringTex);
    const rh = 12 * k.pxAt(R);
    const ring = k.own(new THREE.CylinderGeometry(R * 0.98, R * 0.98, rh, 96, 1, true));
    ring.translate(0, yr - rh / 2, 0);
    k.scene.add(new THREE.Mesh(ring, k.material(ringTex, { side: THREE.BackSide })));
    const drumTex = k.tex(drumImg(), true).clone();
    drumTex.needsUpdate = true;
    drumTex.repeat.set(10, 2);
    k.own(drumTex);
    const dh = 6;
    const drum = k.own(new THREE.CylinderGeometry(R * 0.96, R * 0.96, dh, 96, 1, true));
    drum.translate(0, yr - rh - dh / 2, 0);
    k.scene.add(new THREE.Mesh(drum, k.material(drumTex, { side: THREE.BackSide })));
    // スリットの レール（両わきの 縦の 帯：前の 面の 2D の 所）
    for (const x of [LOOK.slitX - 4, LOOK.slitX + SLIT_W]) {
      const a = k.atDepth(x, H, -R * 0.995)!;
      const b = k.atDepth(x + 4, -400, -R * 0.995)!;
      k.quad(railImg(), [a.x, yr, a.z], [b.x, yr, a.z], [b.x, b.y, a.z], [a.x, b.y, a.z]);
    }
    // スリットの 中の 空（2D の 空の 絵を、スリットの 四角に そのまま：奥の 面）
    const sc = document.createElement('canvas');
    sc.width = SLIT_W;
    sc.height = HOR + 1;
    const skyTex = k.tex(sc);
    const s0 = k.atDepth(LOOK.slitX, 0, -60)!;
    const s1 = k.atDepth(LOOK.slitX + SLIT_W, HOR + 1, -60)!;
    const sg = k.own(new THREE.PlaneGeometry(s1.x - s0.x, s0.y - s1.y));
    const skyM = new THREE.Mesh(sg, k.material(skyTex, { unlit: true }));
    skyM.position.set((s0.x + s1.x) / 2, (s0.y + s1.y) / 2, -60);
    k.scene.add(skyM);
    // シャッターの 板（閉じて いる 間：スリットの 上から 下へ）
    const plateImg = once('dmplate', () =>
      paint(SLIT_W, 9, (g) => {
        g.rect(0, 0, SLIT_W, 9, '#4A505C');
        g.rect(0, 8, SLIT_W, 1, '#2E3440');
        g.rect(2, 0, 1, 9, '#5E6470');
        g.rect(0, 0, SLIT_W, 1, '#6A707C');
      }),
    );
    const plates: THREE.Mesh[] = [];
    const n = Math.ceil(HOR / 9) + 1;
    for (let i = 0; i < n; i++) {
      const p0 = k.atDepth(LOOK.slitX, i * 9, -R * 1.02)!;
      const p1 = k.atDepth(LOOK.slitX + SLIT_W, i * 9 + 9, -R * 1.02)!;
      const pg = k.own(new THREE.PlaneGeometry(p1.x - p0.x, p0.y - p1.y));
      const pm = new THREE.Mesh(pg, k.material(k.tex(plateImg)));
      pm.position.set((p0.x + p1.x) / 2, (p0.y + p1.y) / 2, -R * 1.02);
      k.scene.add(pm);
      plates.push(pm);
    }
    // 天文台の 赤い 明かりと、スリットから 入る 星あかり
    lamp(k, '#ff4a3a', 6, new THREE.Vector3(-3, yr + 0.5, -2), 0, 2);
    lamp(k, '#a8b8ff', 6, new THREE.Vector3(0, 2, -R + 1), 0, 2);
    Object.assign(k.bag, { sc, skyTex, plates, lastSx: -1 });
  },
  update(k: Kit, _t, s) {
    // 空：ドームの 向き（2D と 同じ 切り出し：パノラマの はじめは 終わりに くり返す）
    let sx = Math.round(panX(Number(s.az)) - SLIT_W / 2);
    if (sx < 0) sx += PAN_W;
    if (sx !== k.bag.lastSx) {
      k.bag.lastSx = sx;
      const sc = k.bag.sc as HTMLCanvasElement;
      const ctx = sc.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      ctx.clearRect(0, 0, sc.width, sc.height);
      ctx.drawImage(skyPanorama(), sx, 0, SLIT_W, HOR + 1, 0, 0, SLIT_W, HOR + 1);
      (k.bag.skyTex as THREE.Texture).needsUpdate = true;
    }
    // シャッター：開いた 所まで（下の はし bot から 上が 板）
    const bot = Math.round(HOR * (1 - Number(s.shutter)));
    (k.bag.plates as THREE.Mesh[]).forEach((m, i) => (m.visible = i * 9 < bot));
  },
});
