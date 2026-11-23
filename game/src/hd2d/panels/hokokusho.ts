// 大写し「ダンゴムシ ちゃうで」の 報告書の ミニ遊び（第1章 交番、ui/hokokusho_games.ts）を HD-2D で。
// 報告書の 紙（窓の わく・見出しの 行）は 2D の まま、その 下の 絵の 所を 交番の 中の 場面に する：
//
//   hk_size  『大きさ』：交番の 奥の 壁（上は しっくい、下は 板の 腰壁 —— フィールドの 交番と 同じ）と
//            床の タイル、身長計の 木の 台と 白い 柱（2D と 同じ 所）、壁の 時計。
//            グソっ君・目盛り・下りる バー・ツッコミ・はかった 値は 2D の まま 上に。
//   hk_legs  『足の 数』：上から 見た 交番の 机（緑の デスクマット）。報告書・鉛筆・朱肉と ハンコ・湯のみ。
//            あおむけの グソっ君（2D の 絵）は まん中に のる。
//   hk_food  『好物』：交番の 奥の 壁と、灰色の 鉄の 机（前の 面と 上の 面）。食べ物 5つは 机の 上に
//            立てて 押し出す（2D と 同じ 横の 位置、さわる 当たりと 重なる 所）。えらんだ 物は 少し 上がる。
//            グソっ君・カーソル・名前は 2D の まま 上に。
//
// 置き場所は パネルの 2D の 座標で（Kit.atDepth / Kit.ground）。

import * as THREE from 'three';
import { PixelCanvas, mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { P } from '../../art/tiles/palette';
import { registerPanel3d, type Kit } from '../panel3d';
import { hkFoodImg } from '../../ui/hokokusho_games';
import { lamp, once, propImg } from './_kit_a';

/** 交番の 壁（上 しっくい、木の 見切り、下 板の 腰壁）：w × h ドット、腰の 高さ wain。 */
function wallImg(w: number, h: number, wain: number): HTMLCanvasElement {
  return once(`hk:wall:${w}x${h}:${wain}`, () => {
    const p = new PixelCanvas(w, h);
    const rng = new Rng(w + h);
    const top = h - wain;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let c: string;
        if (y < top - 2) c = rng.next() > 0.93 ? P.white : P.concreteLt;
        else if (y < top) c = y === top - 2 ? P.woodLt : P.wood;
        else if (x % 8 === 7) c = P.woodDark;
        else c = ((Math.floor(x / 8) * 7) % 5) > 2 ? mix(P.woodLt, P.wood, 0.4) : mix(P.wood, P.woodLt, 0.25);
        p.set(x, y, c);
      }
    // 腰壁の 上の 影、床ぎわの 幅木
    p.hline(0, w - 1, top + 1, mix(P.wood, P.woodDark, 0.5));
    p.rect(0, h - 3, w, 3, P.woodDark);
    return p.toCanvas();
  });
}

/** 交番の 床（灰緑の タイル、目地）。 */
function floorImg(): HTMLCanvasElement {
  return once('hk:floor', () => {
    const p = new PixelCanvas(32, 32);
    const rng = new Rng(141);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        let c = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? '#B8BCB0' : '#C8CCC0';
        if (x % 16 === 0 || y % 16 === 0) c = '#8E9288';
        if (rng.next() > 0.95) c = mix(c, '#6E7268', 0.5);
        p.set(x, y, c);
      }
    return p.toCanvas();
  });
}

function plain(c: string, w = 8, h = 8, hi?: string, lo?: string): HTMLCanvasElement {
  return once(`hk:plain:${c}:${w}x${h}:${hi}:${lo}`, () => {
    const p = new PixelCanvas(w, h);
    p.fill(c);
    if (hi) p.hline(0, w - 1, 0, hi);
    if (lo) p.hline(0, w - 1, h - 1, lo);
    return p.toCanvas();
  });
}

/** 部屋の 奥の 壁と 床：壁の 面の 奥行き zw、床の 行 fpy（パネルの px）。床の 高さを 返す。 */
function room(k: Kit, zw: number, fpy: number, wain: number): number {
  const W = k.w;
  const H = k.h;
  const [x0, x1] = [k.atDepth(-30, fpy, zw)!.x, k.atDepth(W + 30, fpy, zw)!.x];
  const yf = k.atDepth(0, fpy, zw)!.y;
  const yt = k.atDepth(0, -40, zw)!.y;
  const pxw = k.pxAt(-zw);
  const wh = Math.round((yt - yf) / pxw);
  const ww = Math.round((x1 - x0) / pxw);
  k.box(x0, x1, yf, yt, zw - 0.2, zw, { front: wallImg(ww, wh, Math.round(wain)) });
  k.tiled(floorImg(), x0 - 4, x1 + 4, zw, 2, yf, Math.round(1 / pxw));
  void H;
  return yf;
}

/** 壁の 時計（フィールドの 交番の 時計）。 */
function clock(k: Kit, px: number, py: number, zw: number): void {
  const img = propImg('in_kb_clock');
  if (img) k.stand(img, k.atDepth(px, py, zw + 0.05)!, { px: k.pxAt(-zw) * 1.6, depth: 2 });
}

// ---------------------------------------------------------------- 大きさ

registerPanel3d('hk_size', {
  cam: { fov: 28, pitch: 0, pos: [0, 0, 0], near: 0.2, far: 60 },
  light: 'room',
  fog: null,
  shadow: { x: 0, z: -6, hw: 5, hd: 3 },
  focus: 0.7,
  tilt: 0.4,
  build(k, s) {
    const ZW = -6;
    // （窓の 中の y 124 が 身長計の 台の 上 = この 絵の 行 fy）
    const fy = Number(s.fy ?? 102);
    const pole = Number(s.pole ?? 66);
    const yf = room(k, ZW, fy + 5, 26);
    // 身長計の 木の 台（2D の 床の 板と 同じ 横の はば：x+40〜190）
    const [bx0, bx1] = [Number(s.b0 ?? 36), Number(s.b1 ?? 186)];
    const zf = ZW + 1.4;
    const t0 = k.atDepth(bx0, fy, ZW + 0.6)!;
    const t1 = k.atDepth(bx1, fy, ZW + 0.6)!;
    k.box(t0.x, t1.x, yf, t0.y, ZW + 0.05, zf, { front: plain('#B88A56', 32, 6, '#C8A06A', '#8A5A3A'), top: plain('#C8A06A', 32, 16, '#D8B47E'), left: plain('#8A5A3A'), right: plain('#8A5A3A') });
    // 白い 柱（2D と 同じ 所：幅 4px、右に 灰の 影）
    const p0 = k.atDepth(pole, fy, ZW + 0.3)!;
    const p1 = k.atDepth(pole + 4, -20, ZW + 0.3)!;
    k.box(p0.x, p1.x, t0.y, p1.y, ZW + 0.1, ZW + 0.3, { front: plain('#E8E4D8', 4, 32), right: plain('#8A90A0', 4, 32), left: plain('#C8CCD4', 4, 32) });
    clock(k, 26, 30, ZW);
    // 天井の 明かり（右上の 手前）
    lamp(k, new THREE.Vector3(1.5, 2.2, ZW + 3), { color: '#fff0dc', i: 3, dist: 9, decay: 1.2 });
  },
});

// ---------------------------------------------------------------- 足の 数（上から 見た 机）

function matImg(): HTMLCanvasElement {
  return once('hk:mat', () => {
    const p = new PixelCanvas(64, 64);
    const rng = new Rng(9);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) p.set(x, y, rng.next() > 0.96 ? '#5E8A6A' : '#4E7A5E');
    return p.toCanvas();
  });
}
function deskTopImg(): HTMLCanvasElement {
  return once('hk:desktop', () => {
    const p = new PixelCanvas(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) p.set(x, y, (x + y * 3) % 23 === 0 ? '#A8ACB4' : '#B8BCC4');
    return p.toCanvas();
  });
}
function paperImg(): HTMLCanvasElement {
  return once('hk:paper', () => {
    const p = new PixelCanvas(36, 48);
    p.fill('#E0DCD0');
    p.rect(3, 3, 30, 4, '#C8C2B4');
    for (let y = 11; y < 46; y += 5) p.hline(3, 32, y, '#C8CCD4');
    p.vline(12, 9, 45, '#C8CCD4');
    p.rect(26, 38, 6, 6, '#E8A8A0');
    p.outline('#8E8A80');
    return p.toCanvas();
  });
}
function pencilImg(): HTMLCanvasElement {
  return once('hk:pencil', () => {
    const p = new PixelCanvas(30, 3);
    p.rect(0, 0, 24, 3, '#2E6A3A');
    p.hline(0, 23, 0, '#4E9A5A');
    p.rect(24, 0, 4, 3, '#E8C890');
    p.set(28, 1, '#3A3A40');
    return p.toCanvas();
  });
}
function cupImg(): HTMLCanvasElement {
  return once('hk:cup', () => {
    const p = new PixelCanvas(16, 16);
    p.circle(8, 8, 7, '#8A6A4A');
    p.circle(8, 8, 6, '#B89A6A');
    p.circle(8, 8, 5, '#7A8A3A');
    p.set(6, 6, '#A8B85A');
    return p.toCanvas();
  });
}
function hankoImg(): HTMLCanvasElement {
  return once('hk:hanko', () => {
    const p = new PixelCanvas(22, 12);
    p.rect(0, 1, 12, 10, '#3A3A48');
    p.rect(1, 2, 10, 8, '#C83A3A');
    p.circle(17, 6, 3, '#C8A06A');
    p.circle(17, 6, 2, '#E8C890');
    return p.toCanvas();
  });
}

registerPanel3d('hk_legs', {
  // 真上から 少し 手前へ ねかせた 目（机の 面が パネルいっぱいに）
  cam: { fov: 30, pitch: 78, pos: [0, 6, 1.2], near: 0.2, far: 40 },
  light: 'room',
  fog: null,
  shadow: { x: 0, z: 0, hw: 5, hd: 4 },
  focus: 0.5,
  tilt: 0.35,
  build(k) {
    // 机の 面（鉄の 机：灰）と その 上の 緑の デスクマット
    k.tiled(deskTopImg(), -8, 8, -8, 8, 0, 14);
    const m0 = k.ground(18, 2, 0.01)!;
    const m1 = k.ground(k.w - 18, k.h - 2, 0.01)!;
    const mat = k.tiled(matImg(), m0.x, m1.x, m0.z, m1.z, 0.01, 16);
    mat.receiveShadow = true;
    // 机の 上の 物（2D の グソっ君の まわり：はしに）
    const lay = (img: HTMLCanvasElement, px: number, py: number, s: number, rot = 0, h = 0.02) => {
      const c = k.ground(px, py, h)!;
      const w = img.width * s;
      const d = img.height * s;
      const g = k.own(new THREE.PlaneGeometry(w, d));
      g.rotateX(-Math.PI / 2);
      g.rotateY(rot);
      const mesh = new THREE.Mesh(g, k.material(k.tex(img)));
      mesh.position.copy(c);
      mesh.receiveShadow = true;
      k.scene.add(mesh);
      return mesh;
    };
    const px = k.pxAt(6);
    lay(paperImg(), 30, 50, px * 1.2, 0.08);
    lay(pencilImg(), 40, 92, px * 1.2, -0.3, 0.05);
    lay(hankoImg(), k.w - 34, 86, px * 1.3, 0.1, 0.04);
    // 湯のみ（立てて：上から 見た 丸）
    const cup = k.ground(k.w - 30, 30, 0)!;
    const cg = k.own(new THREE.CylinderGeometry(0.28, 0.24, 0.45, 12));
    const cm = k.material(k.tex(cupImg()));
    const cyl = new THREE.Mesh(cg, cm);
    cyl.position.set(cup.x, 0.22, cup.z);
    cyl.castShadow = true;
    k.scene.add(cyl);
    lamp(k, new THREE.Vector3(-2, 4, -1), { color: '#fff0dc', i: 1.5, dist: 12, decay: 1.2 });
  },
});

// ---------------------------------------------------------------- 好物（鉄の 机の 上の 食べ物）

registerPanel3d('hk_food', {
  cam: { fov: 28, pitch: 14, pos: [0, 1.6, 0], near: 0.2, far: 60 },
  light: 'room',
  fog: null,
  shadow: { x: 0, z: -5, hw: 6, hd: 3 },
  focus: 0.6,
  tilt: 0.4,
  build(k, s) {
    const dy = Number(s.dy ?? 44);
    const ZW = -9;
    room(k, ZW, dy + 4, 30);
    clock(k, 30, 14, ZW);
    // 鉄の 机：上の 面は dy - 2 〜 dy + 38、前の 面は その 下（食べ物の 上の はしが グソっ君の 足より 下）（2D の 机と 同じ 横の はば）
    const [dx0, dx1] = [Number(s.d0 ?? 10), Number(s.d1 ?? k.w - 10)];
    const zFront = -4.6;
    const front = k.atDepth(dx0, dy + 38, zFront)!;
    const yTop = front.y;
    const back = k.ground(dx0, dy - 2, yTop)!;
    const r = k.atDepth(dx1, dy + 38, zFront)!;
    const fb = k.atDepth(dx0, k.h + 10, zFront)!;
    k.box(front.x, r.x, fb.y, yTop, back.z, zFront, {
      front: plain('#8A90A0', 64, 24, '#C8CCD4', '#5A5F6E'),
      top: plain('#9AA0AC', 64, 24, '#7A808C', '#C8CCD4'),
    });
    // 引き出しの 線（前の 面）
    const dr = once('hk:drawer', () => {
      const p = new PixelCanvas(64, 3);
      p.hline(0, 63, 1, '#5A5F6E');
      p.hline(28, 36, 0, '#C8CCD4');
      return p.toCanvas();
    });
    const l0 = k.atDepth(dx0 + 8, dy + 48, zFront + 0.01)!;
    const l1 = k.atDepth(dx1 - 8, dy + 50, zFront + 0.01)!;
    k.quad(dr, [l0.x, l1.y, zFront + 0.01], [l1.x, l1.y, zFront + 0.01], [l1.x, l0.y, zFront + 0.01], [l0.x, l0.y, zFront + 0.01]);
    // 食べ物（2D の 絵を 2倍で、机の 上に 立てる。えらんだ 物は 少し 上がる、ためした 物は 色を 落とす）
    const xs = (s.xs as number[]) ?? [];
    const imgs = (s.imgs as string[]) ?? [];
    const tried = (s.tried as number[]) ?? [];
    const foods: { m: THREE.Mesh; y: number; lift: number }[] = [];
    const zFood = (back.z + zFront) / 2 + 0.2;
    xs.forEach((x, i) => {
      const img = hkFoodImg(imgs[i]);
      const at = k.ground(x + 20, dy + 36, yTop)!;
      at.z = Math.max(at.z, zFood - 0.3);
      const px = k.pxAt(-at.z) * 2;
      const m = k.stand(img, at, { px, depth: 6, tint: tried.includes(i) ? '#8A8A8A' : undefined });
      foods.push({ m, y: at.y, lift: tried.includes(i) ? 0 : k.pxAt(-at.z) * 3 });
    });
    k.bag.foods = foods;
    lamp(k, new THREE.Vector3(1.5, 3.4, -2), { color: '#fff0dc', i: 4, dist: 10, decay: 1.2 });
  },
  update(k, _t, s) {
    // えらんで いる 物が 少し 上がる（2D と 同じ）
    const sel = Number(s.sel ?? -1);
    const foods = (k.bag.foods as { m: THREE.Mesh; y: number; lift: number }[]) ?? [];
    foods.forEach((f, i) => (f.m.position.y = f.y + (i === sel ? f.lift : 0)));
    k.shadowDirty = true;
  },
});
