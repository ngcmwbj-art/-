// 大写し「ナスの 花」（第2章 区長の 家の 西の 路地、events/ch2/akinasu.ts NasuPanel）を HD-2D で。
//
// 見せる 物は 2D の 絵と 同じ：夜の 路地、花の まわりの 大きな ナスの 葉（波うつ ふち、紫の 葉脈）、
// 上の 枝から 下がる 紫の 茎、下から 近づく トマトの 灯り（赤い 灯りと その だいだいの 光）。
// 灯りが 近づくほど（state.L）光が 強く なり、葉と 茎と 家の 板壁が 照らされる。
// 花（実）は 2D の まま 上に のる（akinasu.ts：花だけに 暗さを かける）。右の 列の 字も 2D。
//
// 置き場所は パネルの 2D の 座標で（Kit.atDepth）：葉は 2D の 楕円と 同じ 所、灯りは 下の まん中。

import * as THREE from 'three';
import { PixelCanvas, mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { fillWall, wallBoards } from '../../art/props/bkit';
import { registerPanel3d, type Kit } from '../panel3d';
import { glowAt, hGroundImg, lamp, once } from './_kit_a';

const W = 200;
const H = 112;
/** 花の まん中（パネルの px）と 花の 面の 奥行き。 */
const CX = 100;
const CY = 34;
const D = 4;

/** ナスの 葉（大きく 波うつ ふち、紫の 主脈と 側脈、表は 濃い 緑）。 */
function leafImg(rx: number, ry: number, seed: number): HTMLCanvasElement {
  return once(`an:leaf:${rx}x${ry}:${seed}`, () => {
    const w = rx * 2 + 2;
    const h = ry * 2 + 2;
    const p = new PixelCanvas(w, h);
    const rng = new Rng(seed);
    const cx = w / 2;
    const cy = h / 2;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const dx = (x - cx) / rx;
        const dy = (y - cy) / ry;
        // 波うつ ふち（ナスの 葉の ゆるい 切れこみ）
        const a = Math.atan2(dy, dx);
        const r = 1 - 0.1 * Math.abs(Math.sin(a * 3 + seed));
        const d = Math.hypot(dx, dy);
        if (d > r) continue;
        const up = dy < 0;
        let c = up ? '#4A7A3E' : '#3A6634';
        if (d > r - 0.12) c = up ? '#6A9A4E' : '#467A3A';
        else if (d < 0.5 && up) c = '#548A44';
        if (rng.next() < 0.06) c = mix(c, '#1E3420', 0.5);
        p.set(x, y, c);
      }
    // 主脈（紫）と 側脈
    for (let x = 2; x < w - 2; x++) {
      const y = Math.round(cy + Math.sin(x / 7) * 0.6);
      if (p.alpha(x, y) > 0) p.set(x, y, '#5A3462');
    }
    for (let k = -3; k <= 3; k++) {
      if (!k) continue;
      const x0 = Math.round(cx + k * (rx / 4));
      for (let i = 0; i < ry * 0.7; i++) {
        for (const s of [-1, 1]) {
          const x = x0 + Math.round(i * 0.6 * Math.sign(k));
          const y = Math.round(cy + s * i);
          if (p.alpha(x, y) > 0) p.set(x, y, mix('#5A3462', '#2E4E2A', 0.45));
        }
      }
    }
    p.outline('#1A2A1E');
    return p.toCanvas();
  });
}

/** 上の 枝と 花の 茎（紫がかった 緑、細い 毛）。 */
function stalkImg(h: number): HTMLCanvasElement {
  return once(`an:stalk:${h}`, () => {
    const p = new PixelCanvas(5, h);
    p.rect(1, 0, 3, h, '#4A3050');
    p.vline(1, 0, h - 1, '#6A4A70');
    for (let y = 2; y < h; y += 4) p.set(4, y, '#7A6A80');
    return p.toCanvas();
  });
}

function branchImg(): HTMLCanvasElement {
  return once('an:branch', () => {
    const p = new PixelCanvas(150, 7);
    for (let x = 0; x < 150; x++) {
      const y = 2 + Math.round(Math.sin(x / 19) * 1.5);
      p.vline(x, y, y + 3, '#3E2A44');
      p.set(x, y, '#5A4260');
    }
    return p.toCanvas();
  });
}

/** トマトの 灯り（赤い 丸、へたの 緑、光る 窓）。 */
function lanternImg(): HTMLCanvasElement {
  return once('an:lantern', () => {
    const p = new PixelCanvas(15, 16);
    p.circle(7, 9, 6, '#E23B2E');
    p.circle(6, 8, 3, '#FF6A4A');
    p.rect(5, 6, 3, 2, '#FF8A6A');
    p.rect(6, 1, 3, 3, '#4E7A34');
    p.hline(4, 10, 3, '#4E7A34');
    p.outline('#3A1410');
    return p.toCanvas();
  });
}

/** 家の 板壁（夜：焼けた 杉板）。 */
function wallImg(): HTMLCanvasElement {
  return once('an:wall', () => {
    const p = new PixelCanvas(128, 96);
    fillWall(p, 0, 0, 128, 96, wallBoards('#4A3A30', 3, 6));
    // 戸袋の 影と 雨どいの 縦
    p.rect(96, 0, 4, 96, '#2A2220');
    p.vline(97, 0, 95, '#5A5048');
    return p.toCanvas();
  });
}

function build(k: Kit): void {
  k.sky(once('an:sky', () => {
    const p = new PixelCanvas(4, 8);
    p.fill('#0C0E14');
    return p.toCanvas();
  }));
  // 家の 板壁（花の うしろ）と 路地の 土
  const wl = k.atDepth(-20, H + 30, -7.5)!;
  const wr = k.atDepth(W + 20, -20, -7.5)!;
  k.box(wl.x, wr.x, wl.y, wr.y, -7.8, -7.5, { front: wallImg() });
  const floorY = k.atDepth(0, H, -D)!.y - 0.25;
  k.tiled(hGroundImg('h_road', 64, 64), -6, 6, -8, 0, floorY, 18);
  // 上の 枝と 茎（花の まん中へ）
  const br = k.atDepth(CX - 75, 6, -D - 0.6)!;
  k.stand(branchImg(), br, { px: k.pxAt(D + 0.6), depth: 4, anchor: 'left' });
  const sh = CY - 20;
  const st = k.atDepth(CX, CY - 18, -D - 0.1)!;
  k.stand(stalkImg(sh), st, { px: k.pxAt(D + 0.1), depth: 3 });
  // 葉（2D と 同じ 楕円の 所。奥行きを 少し ずらす）
  const leaves: [number, number, number, number, number][] = [
    [26, 30, 26, 16, -0.5],
    [176, 26, 26, 15, -0.7],
    [34, 92, 30, 16, 0.4],
    [172, 90, 28, 16, 0.3],
    [100, 4, 30, 10, -0.9],
  ];
  leaves.forEach(([lx, ly, rx, ry, dz], i) => {
    const z = -D + dz;
    const img = leafImg(rx, ry, i + 1);
    const foot = k.atDepth(lx, ly + ry + 1, z)!;
    const m = k.stand(img, foot, { px: k.pxAt(-z), depth: 4 });
    // （少し 傾けて：葉の 面が 灯りに 向く）
    m.rotation.x = ly > 60 ? -0.35 : 0.25;
  });
  // 奥の 葉（暗がりの 中の 株の 続き）
  for (const [lx, ly, z] of [[60, 70, -6.2], [150, 58, -6.4], [10, 64, -6.6], [196, 70, -6.3]] as const) {
    const img = leafImg(22, 13, 9);
    k.stand(img, k.atDepth(lx, ly, z)!, { px: k.pxAt(-z), depth: 3, tint: '#8A9A8A' });
  }
  // トマトの 灯り（下の まん中）と その 光
  const la = k.atDepth(CX, H + 2, -D + 0.6)!;
  k.stand(lanternImg(), la, { px: k.pxAt(D - 0.6) * 1.3, depth: 6, emissive: 1.4, cast: false });
  k.bag.light = lamp(k, la.clone(), { color: '#FF9A50', i: 1, dist: 7, decay: 1.3 });
  k.bag.glow = glowAt(k, k.atDepth(CX, CY + 6, -D - 0.4)!, 1.0, '#F28A3A', 0.15);
  k.bag.base = la.clone();
  k.bag.top = k.atDepth(CX, H - 25, -D + 0.6)!;
}

registerPanel3d('akinasu', {
  cam: { fov: 30, pitch: 0, pos: [0, 0, 0], near: 0.2, far: 80 },
  light: { sun: '#8090c0', sky: '#2a3050', ground: '#14141c', fog: '#0C0E14', sunI: 0.5, hemiI: 0.9, el: 50, az: 200 },
  fog: [5, 14],
  shadow: { x: 0, z: -5, hw: 5, hd: 4 },
  focus: 0.3,
  tilt: 0.45,
  build: (k) => build(k),
  update(k, _t, s) {
    const L = Number(s.L ?? 0);
    const l = k.bag.light as THREE.PointLight;
    const base = k.bag.base as THREE.Vector3;
    const top = k.bag.top as THREE.Vector3;
    // 灯りの 光：近づくほど 強く、上へ（2D の 光の 輪が 上がるのと 同じ）
    l.position.lerpVectors(base, top, L);
    l.position.z += 0.4;
    l.intensity = 2 + L * 14;
    const g = k.bag.glow as THREE.Mesh;
    (g.material as THREE.MeshBasicMaterial).opacity = 0.06 + 0.16 * L;
    g.scale.setScalar(0.6 + L * 0.6);
  },
});
