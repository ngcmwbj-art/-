// 大写し「幕」（第2章 転回場の 村営バス、events/ch2/busmaku.ts MakuPanel）を HD-2D で。
//
// 見せる 物は 2D の 絵と 同じ：運転席の うしろから 見た 夜の バスの 前 —— 天井の 下の 行き先の 幕の 箱、
// 大きな 前の 窓（窓わくと まん中の 柱）、窓の 外の 転回場の 夜（星の 空、山の 線、村の 家の 灯り）、
// ダッシュボード、眠った 運転手さんの 後ろ姿（帽子を 前に たおして）と 座席の 背もたれ。
// 幕の 字・ハンドル・手・グソっ君の 足・「ぐう」・鍵の 札は 2D の まま 上に 重ねる（busmaku.ts drawRoll）。
//
// 置き場所は パネルの 2D の 座標で（_kit_a rectAt / panelBox）：前の 窓は 2D と 同じ 四角、幕の 箱も 同じ 所。

import * as THREE from 'three';
import { PixelCanvas, mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { fillWall, KAWARA_IBUSHI, roofKawara, roofTin, wallBoards, wallPlaster } from '../../art/props/bkit';
import { registerPanel3d, type Kit } from '../panel3d';
import { bands, glowAt, hGroundImg, lamp, once, panelBox, rectAt } from './_kit_a';

const W = 328;
const H = 124;
/** 前の 窓（パネルの px）と 幕の 箱。 */
const WIN0 = { x0: 20, x1: 308, y0: 60, y1: 108 };
const BOX = { x0: 64, x1: 260, y0: 6, y1: 58 };
/** 前の 壁（窓の 面）の 奥行き。 */
const ZW = -3;

/** 車内の ぬった 鉄板（つや消しの 紺、継ぎ目と リベット）。 */
function panelImg(w: number, h: number, base = '#262434', seam = 24): HTMLCanvasElement {
  return once(`bm:panel:${w}x${h}:${base}`, () => {
    const p = new PixelCanvas(w, h);
    p.fill(base);
    const rng = new Rng(w * 7 + h);
    for (let i = 0; i < (w * h) / 18; i++) p.set(Math.floor(rng.next() * w), Math.floor(rng.next() * h), mix(base, '#3A3650', 0.35));
    for (let x = seam; x < w; x += seam) {
      p.vline(x, 0, h - 1, mix(base, '#000000', 0.35));
      p.vline(x + 1, 0, h - 1, mix(base, '#4A4458', 0.3));
      for (let y = 3; y < h; y += 6) p.set(x - 2, y, mix(base, '#6A6478', 0.5));
    }
    return p.toCanvas();
  });
}

/** 窓わく（ゴムの ふち、少し 光る 縁）。 */
function frameImg(): HTMLCanvasElement {
  return once('bm:frame', () => {
    const p = new PixelCanvas(8, 8);
    p.fill('#2E2A3A');
    p.hline(0, 7, 0, '#46405A');
    p.hline(0, 7, 7, '#16141F');
    return p.toCanvas();
  });
}

/** 幕の 箱の 前（わく・ねじ。窓の 所は 2D の 幕が のる）。 */
function boxImg(): HTMLCanvasElement {
  return once('bm:box', () => {
    const w = BOX.x1 - BOX.x0;
    const h = BOX.y1 - BOX.y0;
    const p = new PixelCanvas(w, h);
    p.fill('#2A2836');
    p.hline(0, w - 1, 0, '#5A5468');
    p.hline(0, w - 1, h - 1, '#16141F');
    p.vline(0, 0, h - 1, '#4A4458');
    p.vline(w - 1, 0, h - 1, '#16141F');
    for (const [x, y] of [[4, 4], [w - 5, 4], [4, h - 5], [w - 5, h - 5]]) {
      p.set(x, y, '#8A84A0');
      p.set(x + 1, y + 1, '#16141F');
    }
    // 幕の 窓の まわりの 段（くぼみ）
    p.rect(12, 6, w - 24, h - 12, '#201E2A');
    p.hline(12, w - 13, 6, '#16141F');
    p.hline(12, w - 13, h - 7, '#3A3648');
    return p.toCanvas();
  });
}

/** ダッシュボードの 上（ざらざらの 黒い 樹脂、計器の 山）。 */
function dashTopImg(): HTMLCanvasElement {
  return once('bm:dashTop', () => {
    const p = new PixelCanvas(96, 24);
    const rng = new Rng(5);
    p.fill('#24212E');
    for (let i = 0; i < 400; i++) p.set(Math.floor(rng.next() * 96), Math.floor(rng.next() * 24), rng.next() < 0.5 ? '#2C2938' : '#1C1A24');
    p.hline(0, 95, 23, '#3A3648');
    return p.toCanvas();
  });
}
function dashFrontImg(): HTMLCanvasElement {
  return once('bm:dashFront', () => {
    const p = new PixelCanvas(W, 20);
    p.fill('#221F2C');
    p.hline(0, W - 1, 0, '#3A3648');
    // 計器の 丸と 小さな 緑の 灯り（消えて いる）、スイッチの 列
    for (const x of [214, 236]) {
      p.circle(x, 9, 5, '#14121A');
      p.ring(x, 9, 5, 5, '#4A4458');
      p.line(x, 9, x + 3, 6, '#8A84A0');
    }
    for (let x = 40; x < 120; x += 8) p.rect(x, 7, 4, 3, '#3A3648');
    p.set(52, 8, '#3E6A4A');
    return p.toCanvas();
  });
}

/** 座席の 背もたれ（くたびれた 紺の ビニール、縫い目）。 */
function seatImg(): HTMLCanvasElement {
  return once('bm:seat', () => {
    const p = new PixelCanvas(52, 34);
    p.fill('#363446');
    p.hline(1, 50, 0, '#5A566A');
    p.hline(0, 51, 1, '#3E3B4C');
    for (let y = 8; y < 34; y += 8) p.hline(3, 48, y, '#24222E');
    p.vline(26, 3, 33, '#24222E');
    p.set(0, 0, 0);
    p.set(51, 0, 0);
    return p.toCanvas();
  });
}

/** 運転手さんの 後ろ姿（肩・首・前に たおした 帽子）。 */
function driverImg(): HTMLCanvasElement {
  return once('bm:driver', () => {
    const p = new PixelCanvas(36, 40);
    // 肩と 背中（紺の 制服）
    p.rect(2, 22, 32, 18, '#2A3050');
    p.hline(3, 32, 22, '#3A4268');
    p.rect(1, 25, 2, 15, '#2A3050');
    p.rect(33, 25, 2, 15, '#2A3050');
    p.vline(17, 24, 39, '#222844');
    // 首と 後ろ頭（短い 髪）
    p.rect(13, 18, 10, 5, '#C89A78');
    p.rect(10, 6, 16, 14, '#1A1820');
    p.hline(11, 24, 18, '#2A2630');
    p.set(10, 13, '#C89A78');
    p.set(25, 13, '#C89A78');
    // 帽子（前に たおれて つばが 右前へ）
    p.rect(8, 2, 20, 7, '#22284A');
    p.hline(9, 26, 2, '#343C64');
    p.rect(26, 1, 8, 3, '#22284A');
    p.hline(8, 27, 8, '#C8A040');
    p.outline('#0E0C14');
    return p.toCanvas();
  });
}

/** 遠くの 山の 線（夜：空より 少し 暗い 紺）。 */
function hillsImg(): HTMLCanvasElement {
  return once('bm:hills', () => {
    const w = 320;
    const h = 30;
    const p = new PixelCanvas(w, h);
    for (let x = 0; x < w; x++) {
      const t = Math.round(12 + Math.sin(x / 23) * 6 + Math.sin(x / 9) * 2 + Math.sin(x / 61) * 5);
      for (let y = h - 1; y >= h - t - 2 && y >= 0; y--) p.set(x, y, y === h - t - 2 ? '#2A3250' : '#141A2C');
    }
    return p.toCanvas();
  });
}

/** 夜の 家の 壁（板壁か しっくい、灯りの ついた 窓）。lit：窓が 光る。 */
function nightWall(kind: number, w: number, h: number, lit: boolean): HTMLCanvasElement {
  return once(`bm:wall:${kind}:${w}x${h}:${lit}`, () => {
    const p = new PixelCanvas(w, h);
    fillWall(p, 0, 0, w, h, kind === 0 ? wallBoards('#5A4A3A', kind, 4) : wallPlaster('#B8B0A0', kind));
    for (let x = 4; x + 8 < w - 3; x += 14) {
      p.rect(x, 5, 8, 6, '#1E1A20');
      if (lit) {
        p.rect(x + 1, 6, 6, 4, '#FFC870');
        p.vline(x + 4, 6, 9, '#C88A40');
      } else p.rect(x + 1, 6, 6, 4, '#2A3048');
    }
    p.rect(w - 10, h - 10, 6, 10, '#3A2A22');
    return p.toCanvas();
  });
}

function roofImg(kind: number, w: number, h: number): HTMLCanvasElement {
  return once(`bm:roof:${kind}:${w}x${h}`, () => {
    const p = new PixelCanvas(w, h);
    if (kind === 0) roofKawara(p, 0, 0, w, h, KAWARA_IBUSHI, 3, 0.45);
    else roofTin(p, 0, 0, w, h, { hi: '#7A5A4A', base: '#6A3A2E', lo: '#4A2A22', deep: '#2A1A18' }, 5, 0.2);
    return p.toCanvas();
  });
}

// ---------------------------------------------------------------- 組む

function buildOutside(k: Kit): void {
  // 空（夜明けの ずっと 前：上が 黒い 紺、山の 上が 少し 明るい）と 星
  k.sky(bands('bm:sky', [[0, '#0E1020'], [0.45, '#151B34'], [0.7, '#1E2846'], [1, '#2A3658']], 124, 0));
  // 星（2D と 同じ 所：窓の 上の 方）
  const star = once('bm:star', () => {
    const p = new PixelCanvas(1, 1);
    p.set(0, 0, '#F4F1E8');
    return p.toCanvas();
  });
  for (const [sx, sy] of [[44, 4], [90, 10], [132, 3], [180, 12], [226, 6], [262, 14], [300, 5], [70, 20], [150, 18], [248, 22]] as const) {
    const at = k.atDepth(sx, WIN0.y0 + sy + 1, -300);
    if (at) k.stand(star, at, { px: k.pxAt(300) * 1.5, depth: 0, unlit: true, cast: false, emissive: 1 });
  }
  // 山（遠く、窓の 下の はしに 2D と 同じ 高さで）
  const hl = k.atDepth(0, WIN0.y1 + 2, -220)!;
  k.stand(hillsImg(), hl, { px: k.pxAt(220) * 1.05, depth: 0, unlit: true, cast: false, anchor: 'left' });
  // 転回場の 土と 村の 道
  k.tiled(hGroundImg('h_road', 64, 64), -40, 40, -60, -4, -1.2, 12);
  k.tiled(hGroundImg('h_aze', 64, 64), -200, 200, -200, -60, -1.2, 8);
  // 村の 家（灯りの ついた 窓が 少し）
  const rng = new Rng(2310);
  const houses: [number, number, number, number, boolean][] = [
    [-17, -22, 6, 4, true],
    [-7, -30, 5, 4, false],
    [4, -26, 6, 4.5, true],
    [15, -34, 7, 5, true],
    [-27, -36, 6, 5, false],
    [25, -24, 5, 4, true],
    [-2, -44, 6, 4, true],
  ];
  for (const [x, z, w, d, lit] of houses) {
    const kind = rng.next() < 0.6 ? 0 : 1;
    const wk = rng.next() < 0.5 ? 0 : 1;
    k.gable({ x0: x - w / 2, x1: x + w / 2, z0: z - d, z1: z, y: -1.2, wallH: 2.2, roofH: 1.3, wall: nightWall(wk, w * 8, 18, lit), side: nightWall(wk, d * 8, 18, false), roof: roofImg(kind, w * 8, d * 8) });
    if (lit) {
      lamp(k, new THREE.Vector3(x, 0.4, z + 1.2), { i: 3, dist: 6 });
      glowAt(k, new THREE.Vector3(x, 0.1, z + 0.3), 1.6, '#FFB468', 0.35);
    }
  }
  // 防火灯の 電柱と 灯り（転回場の はし）
  const pole = once('bm:pole', () => {
    const p = new PixelCanvas(5, 64);
    p.rect(1, 0, 3, 64, '#3A3430');
    p.vline(1, 0, 63, '#4A443E');
    p.rect(0, 8, 5, 2, '#2A2622');
    p.rect(0, 4, 5, 3, '#FFE0A0');
    return p.toCanvas();
  });
  const pa = new THREE.Vector3(9, -1.2, -11);
  k.stand(pole, pa, { px: 0.08, depth: 3 });
  lamp(k, new THREE.Vector3(9, 3.6, -10.6), { color: '#FFD890', i: 5, dist: 9, decay: 1.4 });
  glowAt(k, new THREE.Vector3(9, 3.9, -10.8), 0.9, '#FFE0A0', 0.6);
}

function buildCab(k: Kit): void {
  const wall = panelImg(W, 60);
  // 前の 壁：窓の 上（幕の 箱が つく 所）、左右の 柱
  panelBox(k, -20, -20, W + 20, WIN0.y0, ZW, 0.3, { front: panelImg(W + 40, 80) });
  panelBox(k, -20, WIN0.y0, WIN0.x0, WIN0.y1, ZW, 0.3, { front: panelImg(40, 48, '#1C1A28', 12), right: frameImg() });
  panelBox(k, WIN0.x1, WIN0.y0, W + 20, WIN0.y1, ZW, 0.3, { front: panelImg(40, 48, '#1C1A28', 12), left: frameImg() });
  // 窓わく（上・下）と まん中の 柱
  const fr = frameImg();
  panelBox(k, WIN0.x0, WIN0.y0, WIN0.x1, WIN0.y0 + 2, ZW + 0.02, 0.3, { front: fr, top: fr });
  panelBox(k, WIN0.x0, WIN0.y1 - 2, WIN0.x1, WIN0.y1, ZW + 0.02, 0.3, { front: fr, top: fr });
  panelBox(k, W / 2 - 1, WIN0.y0, W / 2 + 1, WIN0.y1, ZW + 0.02, 0.3, { front: fr, left: fr, right: fr });
  void wall;
  // 天井（窓の 上の 壁から 手前へ）
  const [cx0, cx1, , cy1] = rectAt(k, -20, -20, W + 20, 0, ZW);
  k.box(cx0, cx1, cy1, cy1 + 0.4, ZW, 1, { front: panelImg(W, 20, '#16141F', 40) });
  // 幕の 箱（壁から 少し 出る）
  panelBox(k, BOX.x0, BOX.y0, BOX.x1, BOX.y1, ZW + 0.35, 0.35, { front: boxImg(), left: frameImg(), right: frameImg(), top: frameImg() });
  // ダッシュボード：窓の 下の はしから 手前へ（上の 面が 見える）
  const [dx0, dx1, , dyTop] = rectAt(k, -40, WIN0.y1, W + 40, WIN0.y1 + 1, ZW);
  k.box(dx0, dx1, dyTop - 1.6, dyTop, ZW, ZW + 1.1, { top: dashTopImg(), front: dashFrontImg() });
  // 座席の 背もたれと 運転手さん（2D と 同じ 右寄り）
  const zs = -1.55;
  const seat = k.atDepth(196 + 22, H + 6, zs)!;
  const px = k.pxAt(-zs) * 1.0;
  const zd = -1.95;
  const drv = k.atDepth(196 + 22, H - 8, zd)!;
  k.stand(driverImg(), drv, { px: k.pxAt(-zd) * 1.05, depth: 6, unlit: true, tint: '#A8B0D0' });
  k.stand(seatImg(), seat, { px, depth: 8 });
  // ハンドル（座席の 左前、横から 見た 輪の 上の はし）
  const wheel = once('bm:wheel', () => {
    const p = new PixelCanvas(34, 6);
    p.rect(2, 1, 30, 3, '#14121A');
    p.hline(3, 30, 1, '#3A3648');
    p.outline('#0A0910');
    return p.toCanvas();
  });
  k.stand(wheel, k.atDepth(196 + 4, WIN0.y1 + 8, -2.3)!, { px: k.pxAt(2.3), depth: 5 });
  // 車内の 灯り：幕の 箱の 中の うす明かり と、窓の 外の 灯の 青白い 照り返し
  lamp(k, new THREE.Vector3(0.5, 2.2, ZW + 1.2), { color: '#C8C0E8', i: 2.5, dist: 5 });
  lamp(k, new THREE.Vector3(1.2, 1.4, -0.6), { color: '#8090C8', i: 1.6, dist: 3 });
}

registerPanel3d('maku', {
  cam: { fov: 40, pitch: -9, pos: [0, 1.3, 0], near: 0.3, far: 600 },
  light: { sun: '#9fb4ff', sky: '#5a68a0', ground: '#2a2a40', fog: '#1A2038', sunI: 1.1, hemiI: 1.5, el: 40, az: 160 },
  fog: [60, 900],
  shadow: { x: 0, z: -12, hw: 30, hd: 20 },
  focus: 0.35,
  tilt: 0.9,
  build(k) {
    buildOutside(k);
    buildCab(k);
  },
});
