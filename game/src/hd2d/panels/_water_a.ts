// グループ a：水の 断面の 大写し（第1章の ザリガニ釣り tsuri・テナガエビ釣り seki）の 共通の 組み立て。
//
// 2D の 絵（tsuri_art / seki_tsuri_art の 背景）は「上から 空 → 岸 → 水の 中 → 底」の 帯。それを
// 奥行きの ちがう 層に 分けて 立てる（パネルの px と 同じ 所に 映る：カメラは 正面、pitch 0）：
//   ・空と 向こう岸           ずっと 奥（ぼける）
//   ・岸（水の 上）          断面の 奥の 壁：ドットを 押し出した 厚い 板（光と 影を 受ける）
//   ・水の 中の 奥の 壁       同じ 奥行きの 板
//   ・底                     手前へ のびる 本当の 面（砂・小石の 模様、影を 受ける）
//   ・底の 石・物            底に 立てて 押し出す（影を 落とす）
//   ・水の 中                 斜めの 光の すじ（足し算）と 手前の うすい 水の 色
// 生き物・浮き・糸・網・泡・落ちる 水は 2D の まま 上に 重ねる（パネルの 座標が その まま 合う）。

import * as THREE from 'three';
import { PixelCanvas, mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import type { Kit } from '../panel3d';
import { once } from './_kit_a';

/** 断面の 奥の 壁の 奥行き（カメラから）。 */
export const ZB = -14;

/** 絵の 一部を 切り出す。 */
export function crop(key: string, src: HTMLCanvasElement, x: number, y: number, w: number, h: number): HTMLCanvasElement {
  return once(`crop:${key}:${x},${y},${w}x${h}`, () => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, x, y, w, h, 0, 0, w, h);
    return c;
  });
}

/** 絵 img を パネルの 行 py0（上）から、奥行き z に パネルの px と ぴったり 合うように 立てる。 */
export function layer(k: Kit, img: HTMLCanvasElement, px0: number, py0: number, z: number, depth: number, o: { unlit?: boolean; cast?: boolean; tint?: string } = {}): THREE.Mesh {
  const at = k.atDepth(px0, py0 + img.height, z)!;
  return k.stand(img, at, { px: k.pxAt(-z), depth, anchor: 'left', unlit: o.unlit, cast: o.cast, tint: o.tint });
}

/** 石（楕円、左上が 明るい、苔・ぬれ）：2D の 背景の 石と 同じ 塗り方。 */
export function stoneImg(rx: number, ry: number, seed: number, wet: number, deep: string): HTMLCanvasElement {
  return once(`stone:${rx}x${ry}:${seed}:${wet}:${deep}`, () => {
    const w = Math.ceil(rx * 2) + 2;
    const h = Math.ceil(ry * 2) + 2;
    const p = new PixelCanvas(w, h);
    const rng = new Rng(seed);
    const cx = w / 2;
    const cy = h / 2;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        const lit = dx + dy < -0.5;
        const dark = dx + dy > 0.6 || d > 0.8;
        let c: string = lit ? '#B8B4A8' : dark ? '#5E6462' : '#8E9290';
        const n = rng.next();
        if (n > 0.86) c = mix(c, '#6E6A5E', 0.6);
        if (dy < -0.3 && rng.next() > 0.55) c = mix(c, '#3E5A2E', 0.6);
        if (wet > 0) c = mix(c, deep, wet);
        p.set(x, y, c);
      }
    return p.toCanvas();
  });
}

/** 底の 砂・小石（くり返しの 模様）。 */
export function bedImg(key: string, base: [string, string, string], grit: [string, string], deep: string): HTMLCanvasElement {
  return once(`bed:${key}`, () => {
    const N = 64;
    const p = new PixelCanvas(N, N);
    const rng = new Rng(key.length * 97 + 13);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const n = (Math.sin(x * 0.9 + Math.sin(y * 0.7) * 2) + Math.sin(y * 1.3 + x * 0.21) + 2) / 4;
        let c = n > 0.62 ? base[0] : n < 0.32 ? base[2] : base[1];
        const r = rng.next();
        if (r > 0.96) c = grit[0];
        else if (r > 0.93) c = grit[1];
        p.set(x, y, mix(c, deep, 0.25));
      }
    return p.toCanvas();
  });
}

/** 斜めの 光の すじ（上の 水面から 底へ、右下へ 傾く。足し算）。 */
export function shafts(k: Kit, W: number, WY: number, FY: number, xs: number[], color = '#D8F0E0', a = 0.1): void {
  const img = once('shaft', () => {
    const p = new PixelCanvas(4, 32);
    for (let y = 0; y < 32; y++) {
      const v = Math.round((1 - y / 32) * 255 * 0.9);
      for (let x = 0; x < 4; x++) p.set(x, y, ((((x === 0 || x === 3 ? v >> 1 : v) & 255) << 24) | 0xffffff) >>> 0);
    }
    return p.toCanvas();
  });
  const t = k.tex(img);
  t.magFilter = THREE.LinearFilter;
  const m = k.own(new THREE.MeshBasicMaterial({ map: t, color: new THREE.Color(color), transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false }));
  xs.forEach((x0, i) => {
    const wdt = 5 + (i % 3) * 3;
    const z = ZB + 1.5 + (i % 3) * 1.2;
    const a0 = k.atDepth(x0, WY, z)!;
    const a1 = k.atDepth(x0 + wdt, WY, z)!;
    const b0 = k.atDepth(x0 + (FY - WY) * 0.5, FY, z)!;
    const b1 = k.atDepth(x0 + wdt + (FY - WY) * 0.5, FY, z)!;
    const g = k.own(new THREE.BufferGeometry());
    g.setAttribute('position', new THREE.Float32BufferAttribute([...b0.toArray(), ...b1.toArray(), ...a1.toArray(), ...a0.toArray()], 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
    g.setIndex([0, 1, 2, 0, 2, 3]);
    const mesh = new THREE.Mesh(g, m);
    mesh.renderOrder = 6;
    k.scene.add(mesh);
  });
  void W;
}

/** 下から 見た 水面（空の 色の 帯、少し 透ける）：手前 zf から 奥の 壁まで。（いまは 使わない：岸に かぶる） */
export function surface(k: Kit, WY: number, zf: number, color: string, a = 0.55): THREE.Mesh {
  const y = k.atDepth(0, WY, ZB)!.y;
  const img = once(`surf:${color}`, () => {
    const p = new PixelCanvas(32, 32);
    const rng = new Rng(5);
    for (let yy = 0; yy < 32; yy++)
      for (let x = 0; x < 32; x++) p.set(x, yy, rng.next() < 0.12 ? mix(color, '#FFFFFF', 0.5) : rng.next() < 0.3 ? mix(color, '#2E4A44', 0.3) : color);
    return p.toCanvas();
  });
  const t = k.tex(img, true).clone();
  t.needsUpdate = true;
  t.repeat.set(12, 3);
  k.own(t);
  const m = k.own(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: a, depthWrite: false, side: THREE.DoubleSide }));
  const g = k.own(new THREE.PlaneGeometry(60, ZB - zf < 0 ? zf - ZB : 1));
  g.rotateX(Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(0, y, (zf + ZB) / 2);
  mesh.renderOrder = 4;
  k.scene.add(mesh);
  return mesh;
}

/** 水の 中の 色（手前の 透ける 板：水面の 行から 下へ、上が 明るく 下が 暗い）。 */
export function waterVeil(k: Kit, W: number, H: number, WY: number, z: number, top: string, deep: string, a = 0.3): void {
  const img = once(`veil:${top}:${deep}`, () => {
    const p = new PixelCanvas(2, 32);
    for (let y = 0; y < 32; y++) {
      const c = mix(top, deep, y / 31);
      p.set(0, y, c);
      p.set(1, y, c);
    }
    return p.toCanvas();
  });
  const a0 = k.atDepth(-4, H + 4, z)!;
  const a1 = k.atDepth(W + 4, H + 4, z)!;
  const b1 = k.atDepth(W + 4, WY + 1, z)!;
  const b0 = k.atDepth(-4, WY + 1, z)!;
  const g = k.own(new THREE.BufferGeometry());
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a0.toArray(), ...a1.toArray(), ...b1.toArray(), ...b0.toArray()], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  const t = k.tex(img);
  t.magFilter = THREE.LinearFilter;
  const m = k.own(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: a, depthWrite: false }));
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = 7;
  k.scene.add(mesh);
}

/** 底の 面：奥の 壁の 下の はし（行 FY）から 手前へ。 */
export function bed(k: Kit, img: HTMLCanvasElement, FY: number, zf: number): number {
  const y = k.atDepth(0, FY, ZB)!.y;
  // （1 ドット ≈ 奥の 壁の 所で パネル 1px）
  k.tiled(img, -30, 30, ZB, zf, y, Math.round(1 / k.pxAt(-ZB)));
  return y;
}

export interface CrossOpts {
  /** 断面の 大きさ（パネルの px）、水面の 行、底の 行。 */
  W: number;
  H: number;
  WY: number;
  FY: number;
  /** 2D の 背景の 絵（同じ 大きさ）。 */
  bg: HTMLCanvasElement;
  key: string;
  /** 空・向こう岸の 下の はしの 行。 */
  skyY: number;
  /** 岸を 2つに 分ける（左 x < split は 行 splitY から：堰の 上の 空を 岸に しない）。 */
  split?: [number, number];
  water: string;
  deep: string;
  bedBase: [string, string, string];
  bedGrit: [string, string];
  /** 底に 立てる 石 [cx, cy, rx, ry]（2D の 背景の 石と 同じ 所）。 */
  stones: [number, number, number, number][];
  shafts: number[];
}

/** 水の 断面を 組む（空・岸・水の 中・底・底の 石・水面・光の すじ）。底の 高さを 返す。 */
export function buildCross(k: Kit, o: CrossOpts): number {
  const { W, H, WY, FY, bg, key } = o;
  // 空と 向こう岸（ずっと 奥：ぼけて 小さく 動かない）
  k.sky(crop(key, bg, 0, 0, W, 2));
  layer(k, crop(key, bg, 0, 0, W, o.skyY + 1), 0, 0, -70, 0, { unlit: true, cast: false });
  // 岸（水の 上）：押し出した 厚い 板
  if (o.split) {
    const [sx, sy] = o.split;
    layer(k, crop(key, bg, 0, sy, sx, WY - sy), 0, sy, ZB - 0.2, 10);
    layer(k, crop(key, bg, sx, o.skyY, W - sx, WY - o.skyY), sx, o.skyY, ZB - 0.2, 10);
  } else layer(k, crop(key, bg, 0, o.skyY, W, WY - o.skyY), 0, o.skyY, ZB - 0.2, 10);
  // 水の 中の 奥（2D の 背景の まま：石・流木・水草）
  layer(k, crop(key, bg, 0, WY, W, FY - WY + 1), 0, WY, ZB, 0, { cast: false, unlit: true });
  // 底：手前へ のびる 面
  const yb = k.atDepth(0, FY, ZB)!.y;
  const front = k.ground(W / 2, H + 2, yb);
  const zf = front ? Math.min(front.z, ZB + 6) : ZB + 4;
  bed(k, bedImg(key, o.bedBase, o.bedGrit, o.deep), FY, zf);
  // 底の 石（底に すわる：2D と 同じ px）
  o.stones.forEach(([cx, cy, rx, ry], i) => {
    const at = k.ground(cx, Math.max(FY + 2, Math.min(H - 1, cy + ry - 1)), yb);
    if (!at) return;
    k.stand(stoneImg(rx, ry, 8223 + cx, 0.38, o.deep), at, { px: k.pxAt(-at.z), depth: Math.round(ry * 1.4) });
    void i;
  });
  // 光の すじと 水の 色（底と 石に うすく かかる）
  shafts(k, W, WY, FY, o.shafts);
  waterVeil(k, W, H, WY, (zf + ZB) / 2 + 1.2, o.water, o.deep, 0.12);
  return yb;
}
