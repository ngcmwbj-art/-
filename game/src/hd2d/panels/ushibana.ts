// 大写し「牛の 顔」（第2章 牛舎、events/ch2/ushibana.ts UbPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜の 牛舎（蛍光灯は ついた まま、柱、おがくずの 床）、柵の 向こうの
// 黒毛の 牛の 顔（角は 切って ある、耳に 黄色い 耳標、北4 は 額に 白い 星）、手前の 柵と 飼槽。
// 頭・耳・鼻の 皿は 2D と 同じ 形の 絵を 立てて 押し出し（Kit.stand）、パネルの 2D の 座標に そのまま 重なる
// （顔の 面 z = HEAD_Z で 1 ドット = パネル 1px）。トマトの 灯りは ほんとうの 光（暖かい 点の 光）が lx・ly に。
// 目の ひかり・ぬれた 鼻の ひかり・粉・口（反すう）・舌・選ぶ 輪は 2D の まま 上に 重ねる。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { hGroundImg, pix, plate, rectAt } from './_kit_d';

const W = 204;
const H = 112;
const CX = 102;
/** 顔の 面（この 奥行きで 1 ドット = パネル 1px）。 */
const HEAD_Z = -8;
const BLACK = '#1E1C22';
const DARK = '#141218';

/** 夜の 牛舎（蛍光灯の 白い 光、上から）。 */
const LIGHT: PanelLight = {
  sun: '#eef2ff',
  sky: '#d8e0f0',
  ground: '#9a8c70',
  fog: '#3a4050',
  sunI: 1.5,
  hemiI: 1.9,
  el: 66,
  az: 170,
};

function oval(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number, c: string): void {
  for (let y = -ry; y <= ry; y++) {
    const h = Math.round(rx * Math.sqrt(Math.max(0, 1 - (y * y) / (ry * ry))));
    if (h > 0) p.rect(cx - h, cy + y, h * 2, 1, c);
  }
}

/** 耳（両わき、耳標つき）。 */
function earsImg(): HTMLCanvasElement {
  return pix('ub2:ears', W, H, (p) => {
    for (const s of [-1, 1]) {
      oval(p, CX + s * 48, 30, 15, 6, BLACK);
      oval(p, CX + s * 50, 30, 9, 3, '#3A2E36');
      p.rect(CX + s * 50 - 3, 32, 6, 7, '#E8C43A');
      p.rect(CX + s * 50 - 3, 32, 6, 1, '#F8E07A');
      p.set(CX + s * 50, 35, '#B8942A');
    }
  });
}

/** 頭（額から あごまで。2D と 同じ 線）、額の 巻き毛、北4 の 白い 星、目。 */
function headImg(kind: number): HTMLCanvasElement {
  return pix(`ub2:head${kind}`, W, H, (p) => {
    for (let y = 0; y <= 84; y++) {
      const t = y / 84;
      const half = Math.round(
        t < 0.1
          ? 26 + Math.sqrt(t / 0.1) * 7
          : t < 0.34
            ? 33 + ((t - 0.1) / 0.24) * 2
            : t < 0.78
              ? 35 - ((t - 0.34) / 0.44) * 13
              : 22 + Math.sin(((t - 0.78) / 0.22) * Math.PI * 0.6) * 4 - Math.max(0, t - 0.93) * 90,
      );
      p.set(CX - half - 1, 12 + y, '#4A4652');
      p.set(CX + half, 12 + y, '#4A4652');
      p.rect(CX - half, 12 + y, half * 2, 1, BLACK);
    }
    // the hair: a lighter sheen down the forehead, the poll's curls, short hair strokes
    for (let y = 20; y < 50; y++) for (let x = CX - 6; x < CX + 6; x++) if ((x + y) % 2 === 0) p.set(x, y, '#2A2830');
    for (let i = 0; i < 12; i++) p.set(CX - 14 + ((i * 7) % 28), 14 + (i % 3) * 2, '#34303A');
    for (let i = 0; i < 40; i++) p.set(CX - 28 + ((i * 17) % 56), 18 + ((i * 11) % 50), '#28262E');
    if (kind === 2) {
      oval(p, CX + 2, 28, 6, 5, '#E6E2D8');
      oval(p, CX - 2, 31, 4, 3, '#E6E2D8');
      p.rect(CX + 1, 33, 2, 4, '#E6E2D8');
      p.set(CX + 7, 26, '#E6E2D8');
    }
    for (const s of [-1, 1]) {
      oval(p, CX + s * 26, 36, 6, 4, DARK);
      p.rect(CX + s * 26 - 6, 33, 12, 1, '#2E2A34');
    }
  });
}

/** 鼻の 皿（ぬれた 鼻、2つの 穴、まん中の すじ）。 */
function muzzleImg(): HTMLCanvasElement {
  return pix('ub2:muzzle', W, H, (p) => {
    oval(p, CX, 78, 25, 11, '#34303A');
    for (let y = 68; y < 89; y++) for (let x = CX - 24; x < CX + 24; x++) if (p.get(x, y) >>> 24 && (x * 3 + y * 5) % 11 === 0) p.set(x, y, '#3E3A44');
    p.rect(CX - 1, 68, 2, 20, '#2C2830');
    for (const s of [-1, 1]) {
      oval(p, CX + s * 12, 79, 5, 4, DARK);
      p.set(CX + s * 12 - s * 3, 76, '#4A4652');
    }
  });
}

/** 牛舎の 奥の 壁（波板、腰の コンクリート）。 */
function wallImg(): HTMLCanvasElement {
  return pix('ub2:wall', 64, 48, (p) => {
    p.fill('#5A6070');
    for (let x = 0; x < 64; x += 4) {
      p.vline(x, 0, 33, '#646A7A');
      p.vline(x + 1, 0, 33, '#525868');
    }
    p.rect(0, 34, 64, 14, '#6E6E70');
    p.hline(0, 63, 34, '#8A8A8C');
    for (let x = 3; x < 64; x += 13) p.set(x, 40 + (x % 5), '#5E5E60');
  });
}
function tubeImg(): HTMLCanvasElement {
  return pix('ub2:tube', 8, 2, (p) => {
    p.fill('#F4F8FF');
    p.hline(0, 7, 1, '#C8D0DA');
  });
}
function pipeImg(): HTMLCanvasElement {
  return pix('ub2:pipe', 4, 8, (p) => {
    p.fill('#8A909A');
    p.vline(0, 0, 7, '#B8BEC8');
    p.vline(3, 0, 7, '#5A606A');
  });
}
function troughImg(): HTMLCanvasElement {
  return pix('ub2:trough', 16, 8, (p) => {
    p.fill('#6A6A70');
    p.hline(0, 15, 0, '#9A9AA0');
    p.hline(0, 15, 7, '#4A4A50');
    for (let x = 2; x < 16; x += 5) p.set(x, 4, '#5A5A60');
  });
}

function buildBarn(k: Kit): void {
  // the back wall and the floor of sawdust (the floor's far edge at row 50 of the panel, as in 2D)
  const zb = -60;
  const floor = k.atDepth(0, 50, zb)!.y;
  const r = rectAt(k, -20, -10, W + 20, 50, zb);
  k.box(r.x0, r.x0 + r.w, floor, r.y0 + r.h, zb - 0.2, zb, {
    front: wallImg(),
  });
  // (far enough that the floor passes under the chin: the head stands over it)
  k.tiled(hGroundImg('h_sawdust', 64, 64), r.x0, r.x0 + r.w, zb, -5.5, floor, 10, { tint: '#b4a282' });
  // the tubes along the ceiling (on all night)
  for (const [z, n] of [
    [-58, 4],
    [-36, 3],
  ] as const) {
    const y = k.atDepth(0, 2.5, z)!.y;
    for (let i = 0; i < n; i++) {
      const a = k.atDepth(10 + (i * (W - 20)) / Math.max(1, n - 1) - 16, 2, z)!;
      const b = k.atDepth(10 + (i * (W - 20)) / Math.max(1, n - 1) + 16, 2, z)!;
      const m = k.stand(tubeImg(), new THREE.Vector3((a.x + b.x) / 2, y, z), {
        px: (b.x - a.x) / 8,
        depth: 2,
        emissive: 1.4,
        cast: false,
        unlit: true,
      });
      m.scale.y = k.pxAt(-z) * 1.6;
    }
  }
  // the pen's pipe posts in front of the wall (2D：every 36 px)
  for (let x = 10; x < W; x += 36) {
    const at = k.atDepth(x, 51, -44)!;
    at.y = floor;
    const top = k.atDepth(x, 6, -44)!.y;
    const w = k.pxAt(44) * 2;
    k.box(at.x - w / 2, at.x + w / 2, floor, top, -44.2, -43.8, {
      front: pipeImg(),
      left: pipeImg(),
      right: pipeImg(),
    });
  }
  const ra = k.atDepth(-10, 26, -44)!;
  const rb = k.atDepth(W + 10, 28, -44)!;
  const rw = k.pxAt(44) * 1.6;
  k.box(ra.x, rb.x, ra.y - rw, ra.y, -44.3, -43.9, {
    front: pipeImg(),
    top: pipeImg(),
  });
}

function buildHead(k: Kit, kind: number): void {
  const z = HEAD_Z;
  const px = k.pxAt(-z);
  const foot = (zz: number) => k.atDepth(CX, H, zz)!;
  k.stand(earsImg(), foot(z - 0.5), { px: k.pxAt(-(z - 0.5)), depth: 5 });
  k.stand(headImg(kind), foot(z), { px, depth: 16 });
  k.stand(muzzleImg(), foot(z + 0.25), { px: k.pxAt(-(z + 0.25)), depth: 8 });
  // the neck going back into the dark of the pen
  const n = k.atDepth(CX, 70, z - 0.6)!;
  const nb = k.atDepth(CX, H + 10, z - 0.6)!;
  const hw = px * 26;
  k.box(n.x - hw, n.x + hw, nb.y, n.y, z - 3, z - 0.6, {
    front: pix('ub2:neck', 4, 4, (p) => p.fill('#18161C')),
    left: pix('ub2:neck', 4, 4, (p) => p.fill('#18161C')),
    right: pix('ub2:neck', 4, 4, (p) => p.fill('#18161C')),
    top: pix('ub2:neck', 4, 4, (p) => p.fill('#18161C')),
  });
}

function buildRail(k: Kit): void {
  // the rail in front (2D：rows 100–103) and the trough's edge (rows 106–112)
  const zr = -6;
  const a = k.atDepth(-10, 103, zr)!;
  const b = k.atDepth(W + 10, 100, zr)!;
  k.box(a.x, b.x, a.y, b.y, zr - 0.12, zr, {
    front: pipeImg(),
    top: pipeImg(),
  });
  const zt = -5.4;
  const c = k.atDepth(-10, H + 2, zt)!;
  const d = k.atDepth(W + 10, 106, zt)!;
  k.box(c.x, d.x, c.y, d.y, zt - 0.5, zt, {
    front: troughImg(),
    top: troughImg(),
  });
}

registerPanel3d('ushibana', {
  cam: { fov: 24, pitch: 3, pos: [0, 0, 0], far: 200, near: 0.2 },
  light: LIGHT,
  fog: [70, 220],
  shadow: { x: 0, z: -10, hw: 8, hd: 10 },
  focus: 0.55,
  tilt: 0.45,
  grade: () => null,
  build(k, s) {
    buildBarn(k);
    buildHead(k, Number(s.kind) || 0);
    buildRail(k);
    // the tomato's light (moved in update: where it is aimed)
    const lamp = new THREE.PointLight('#ffb070', 2.4, 4.5, 1.6);
    k.scene.add(lamp);
    k.bag.lamp = lamp;
  },
  update(k, _t, s) {
    const lamp = k.bag.lamp as THREE.PointLight;
    const at = k.atDepth(Number(s.lx), Number(s.ly), HEAD_Z + 1.6);
    if (at) lamp.position.copy(at);
  },
});
