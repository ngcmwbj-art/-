// 大写し「葉の かげ」（第2章 ソワカの 家の 西の 路地の きゅうりの 棚、events/ch2/kyuri.ts KyPanel）を
// HD-2D で（2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜の 棚。後ろに 家の 下見板の 壁、きゅうりの ネット（12px の 目）、
// 両はしの 支柱、4 × 3 の 目に 重なる 大きな 葉（1目に 3枚）、葉の かげの 実（3本、灯りの 当たった
// 所だけ 見える）、黄色い 花。トマトの 灯りは 点の 光：当たった 葉だけ 明るい 緑に なり、実の ある 目の
// 葉は うすく なって 実が すける（2D の 絵と 同じ 決まり）。灯りの 輪と はさみは 2D の まま 上に 乗る。
//
// 置き場所は パネルの 2D の 座標（Kit.atDepth）：目の 中心は 2D の cellXY と 同じ px。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { fillWall, wallSiding } from '../../art/props/bkit';
import { drawCuke, KY_AT } from '../../events/ch2/kyuri';
import { registerPanel3d, type Kit } from '../panel3d';
import { fade, grain, lamp, NIGHT_LAMP, once, paint, ramp, soft } from './_kit_b';

/** 絵の 四角（パネルの 絵の 部分：2D の drawScene の 幅）。 */
const W = 204;
const H = 112;
/** ネットの 奥行き（カメラから）。 */
const NET = 20;
const LIGHT_R = 24;
/** 目の 中心（絵の 左上からの px：2D の cellXY と 同じ）。 */
const cell = (c: number, r: number): [number, number] => [28 + c * 50, 26 + r * 30];

/** きゅうりの 葉（ひらいた 手の ような 浅い 切れこみ、ぎざぎざの ふち、主脈と 網の 目の 細い 脈、まだら、毛）。rr：半径。 */
function leafImg(rr: number, v: number): HTMLCanvasElement {
  return once(`kyleaf2:${rr}:${v}`, () => {
    const w = rr * 2 + 3;
    const h = Math.round(rr * 1.7) + 3;
    const p = new PixelCanvas(w, h);
    const cx = w / 2;
    const cy = h / 2;
    const bx = cx;
    const by = cy + rr * 0.55;
    const LEAF = ['#1E3A1A', '#2A4A22', '#36582A', '#426832', '#4E7A3A', '#5E8A44', '#72A050', '#8AB866'];
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const dx = (x + 0.5 - cx) / rr;
        const dy = (y + 0.5 - cy) / (rr * 0.82);
        const a = Math.atan2(dy, dx);
        const lobe = 1 - 0.16 * Math.abs(Math.sin(a * 2.5 + v)) ** 3 - (grain(x, y, 800 + v) < 0.25 ? 0.05 : 0);
        const r = Math.hypot(dx, dy);
        if (r > lobe) continue;
        // 葉の 面：もとから 外へ 少し 明るく、ふくらみの 陰、まだら
        let l = 0.5 + (soft(x, y, 3, 801 + v) - 0.5) * 0.3 - (dy > 0 ? dy * 0.12 : 0) + (r > lobe - 0.12 ? -0.15 : 0);
        // 網の 目（細い 脈）
        const ang = Math.atan2(y + 0.5 - by, x + 0.5 - bx);
        if (Math.abs(Math.sin(ang * 7 + v)) < 0.12 && r > 0.2) l += 0.15;
        if ((x * 3 + y * 5 + v) % 11 === 0 && r < lobe - 0.15) l -= 0.12;
        p.set(x, y, ramp(LEAF, l));
      }
    // 主脈：もとから 放射に 3本 ＋ 枝
    for (const ang of [-2.5, -1.57, -0.64]) {
      for (let i = 2; i < rr * 1.1; i++) {
        const x = Math.round(bx + Math.cos(ang) * i);
        const y = Math.round(by + Math.sin(ang) * i * 0.9);
        if (p.alpha(x, y) > 0) p.set(x, y, LEAF[7]);
        if (i % 4 === 2) {
          for (const s2 of [-0.7, 0.7])
            for (let j = 1; j < 4; j++) {
              const xx = Math.round(x + Math.cos(ang + s2) * j);
              const yy = Math.round(y + Math.sin(ang + s2) * j);
              if (p.alpha(xx, yy) > 0) p.set(xx, yy, LEAF[6]);
            }
        }
      }
    }
    // ふち：濃い 色と 細かい 毛（白っぽい 点）
    p.edge((x, y, o) => (o.l || o.r || o.t || o.b ? (grain(x, y, 805) < 0.2 ? '#A8C890' : '#24401E') : null));
    return p.toCanvas();
  });
}

/** きゅうり 1本（2D の drawCuke：へたが 上）。 */
function cukeImg(k: number): HTMLCanvasElement {
  return once(`kycuke:${k}`, () => paint(20, 46, (g) => drawCuke(g, 9, 4, k)));
}

/** ネット（緑の 細い 糸、12px の 目）。 */
function netImg(): HTMLCanvasElement {
  return once('kynet', () => {
    const p = new PixelCanvas(W, H);
    for (let i = 6; i < W; i += 12) p.vline(i, 0, H - 1, '#6A7A5A');
    for (let i = 6; i < H; i += 12) p.hline(0, W - 1, i, '#6A7A5A');
    return p.toCanvas();
  });
}

/** 家の 壁：古い 下見板。 */
function wallImg(): HTMLCanvasElement {
  return once('kywall', () => {
    const p = new PixelCanvas(220, 130);
    fillWall(p, 0, 0, 220, 130, wallSiding('#4A443C', 3));
    // 雨だれと 古い 板の しみ、くぎの あと
    for (let y = 0; y < 130; y++)
      for (let x = 0; x < 220; x++) {
        if (soft(x * 4, y * 0.15, 8, 820) > 0.7 && (x + y) % 2 === 0) p.set(x, y, '#2E2A24');
        if (grain(x, y, 821) < 0.004) p.set(x, y, '#6A5A48');
      }
    return p.toCanvas();
  });
}

/** 支柱（竹）。 */
function poleImg(): HTMLCanvasElement {
  return once('kypole', () => {
    const p = new PixelCanvas(3, 64);
    p.fill('#9A8A5A');
    p.vline(0, 0, 63, '#C8B87A');
    p.vline(2, 0, 63, '#6A5A3A');
    for (let y = 6; y < 64; y += 14) p.hline(0, 2, y, '#5A4A2A');
    return p.toCanvas();
  });
}

function flowerImg(): HTMLCanvasElement {
  return once('kyflower', () => {
    const p = new PixelCanvas(5, 5);
    p.rect(1, 0, 3, 5, '#F4D23A');
    p.rect(0, 1, 5, 3, '#F4D23A');
    p.set(2, 2, '#D8A82A');
    return p.toCanvas();
  });
}

interface Leaf {
  m: THREE.Mesh;
  x: number;
  y: number;
  rr: number;
  c: number;
  r: number;
}

registerPanel3d('kyuri', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.5, far: 200 },
  light: NIGHT_LAMP,
  fog: null,
  shadow: null,
  grade: () => null,
  focus: 0.5,
  tilt: 0.5,
  build(k: Kit) {
    const px = k.pxAt(NET);
    // 家の 壁（ネットの 少し 奥）・ネット・支柱
    const a = k.atDepth(-20, -20, -NET - 3)!;
    const b = k.atDepth(W + 20, H + 20, -NET - 3)!;
    const wall = wallImg();
    k.quad(wall, [a.x, b.y, a.z], [b.x, b.y, a.z], [b.x, a.y, a.z], [a.x, a.y, a.z]);
    const n0 = k.atDepth(0, 0, -NET - 0.4)!;
    const n1 = k.atDepth(W, H, -NET - 0.4)!;
    k.quad(netImg(), [n0.x, n1.y, n0.z], [n1.x, n1.y, n0.z], [n1.x, n0.y, n0.z], [n0.x, n0.y, n0.z]);
    for (const x of [3, W - 4]) {
      const f = k.atDepth(x, H + 4, -NET - 0.2)!;
      k.stand(poleImg(), f, { px: px * 1.1, depth: 3, rows: [0, 64] });
    }
    // 葉：1目に 3枚（2D と 同じ ずれ）。手前の 葉ほど カメラに 寄る
    const leaves: Leaf[] = [];
    let v = 0;
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < 4; c++) {
        const [x, y] = cell(c, r);
        for (const [ox, oy, rr] of [[-12, -8, 13], [10, -2, 12], [-4, 10, 11]] as const) {
          const cx = x + ox + ((r * 7 + c * 3) % 5) - 2;
          const cy = y + oy;
          const z = -NET + 0.3 + (v % 3) * 0.12;
          const img = leafImg(rr, v % 4);
          const at = k.atDepth(cx, cy + img.height / 2, z)!;
          const m = k.stand(img, at, { px, depth: 2, flip: v % 2 === 1, cast: false });
          leaves.push({ m, x: cx, y: cy, rr, c, r });
          v++;
        }
      }
    // 実：葉の かげ（葉より 奥、ネットの 前）に つるされる
    const fruit = KY_AT.map(([c, r], i) => {
      const [x, y] = cell(c, r);
      const img = cukeImg(i);
      const at = k.atDepth(x + 1, y - 18 + img.height, -NET + 0.05)!;
      return k.stand(img, at, { px, depth: 2, cast: false, emissive: 0.45 });
    });
    // 黄色い 花
    for (const [x, y] of [[32, 8], [122, 76]] as const) k.stand(flowerImg(), k.atDepth(x + 2, y + 5, -NET + 0.7)!, { px, depth: 1, cast: false, emissive: 0.2 });
    // トマトの 灯り（ネットの 前に 浮く 点の 光）と、葉の 上の 弱い 返し
    const light = lamp(k, '#ffa060', 0, new THREE.Vector3(), 0, 2);
    k.bag.leaves = leaves;
    k.bag.fruit = fruit;
    k.bag.light = light;
  },
  update(k: Kit, _t, s) {
    const lx = Number(s.lx);
    const ly = Number(s.ly);
    const got = Number(s.got);
    const light = k.bag.light as THREE.PointLight;
    light.position.copy(k.atDepth(lx, ly, -NET + 1.8)!);
    light.intensity = 14;
    light.distance = 0;
    const has = (c: number, r: number) => KY_AT.some(([fc, fr], i) => fc === c && fr === r && !(got & (1 << i)));
    for (const l of k.bag.leaves as Leaf[]) {
      const d = Math.hypot(l.x - lx, l.y - ly);
      const lit = Math.max(0, 1 - d / (LIGHT_R + 10));
      // （2D の 絵：実の ある 目の 葉は 灯りで うすく なる。ほかは ほとんど そのまま）
      fade(l.m, has(l.c, l.r) ? 0.92 - lit * 0.65 : 1 - lit * 0.1);
    }
    (k.bag.fruit as THREE.Mesh[]).forEach((m, i) => {
      const [c, r] = KY_AT[i];
      const [x, y] = cell(c, r);
      const d = Math.hypot(x - lx, y - ly);
      fade(m, got & (1 << i) ? 0 : Math.max(0, 1 - d / (LIGHT_R + 6)) * 0.95);
    });
  },
});
