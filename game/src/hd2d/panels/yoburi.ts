// 小窓「夜振りの ドジョウ」（第2章 用水路、events/ch2/yoburi.ts YoburiPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：用水路を 横から 切った 見え方。上に 夜空と 棚田の 黒い 線、北の 岸の
// 野づら積みの 石垣（上に 草と 稲）、水口の 土管、水の 中へ 続く 石垣、右の 古い 石垣の 大きな 石と すき間、
// 右はしの 橋の 脚、底の 泥（左は やわらかい 泥だまり、水口の 下は 小石、右は かたい 泥）、底の 水草。
// 3D では 石垣は 奥の 面、底の 泥は 手前へ 少し 見える 床、手前は 水槽の ガラスの ように 切った 面（水の 色）。
// 灯りは ほんとうの 光（スポットライト）が 輪の x（rx）に：外は 夜の 色、輪の 中だけ 色が もどる。
// 生き物・泡・水口から 落ちる 水の 糸・灯りの 輪の ふちと まぶしい まん中・灯り・たも網は 2D の まま 上に 重ねる。
//
// 置き場所は パネルの 2D の 行（水面 30・底 98）で 決める：カメラは 水面の 高さ、水面の 行が 30 に なる ように 下を 向く。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { Rng, valueNoise } from '../../engine/rng';
import { YB_FLOOR_Y, YB_INLET, YB_WATER_Y } from '../../art/props/yoburi_art';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { noFog, pix, plate, rectAt } from './_kit_d';

const W = 328;
const H = 116;
const WY = YB_WATER_Y;
const FY = YB_FLOOR_Y;
/** 奥の 石垣の 面と、手前の 切った 面。 */
const WALL_Z = -8.2;
const CUT_Z = -3.6;
const RING_Y = FY - 6;
const RX_R = 37;

const LIGHT: PanelLight = { sun: '#8a90c8', sky: '#7a80b8', ground: '#2a2a40', fog: '#141c2c', sunI: 0.4, hemiI: 1.5, el: 50, az: 180 };

function skyImg(stage: number): HTMLCanvasElement {
  return pix(`yb:sky${stage}`, W, H, (p) => {
    for (let y = 0; y < H; y++) p.hline(0, W - 1, y, mix('#0B0B14', stage >= 2 ? '#2A2440' : '#1B1733', Math.min(1, y / 9)));
    if (stage >= 2) p.hline(0, W - 1, 7, '#3A2B5C');
    const rng = new Rng(8301);
    for (let i = 0; i < 22; i++) {
      const x = Math.floor(rng.next() * W);
      const y = Math.floor(rng.next() * 6);
      if (stage === 2 && i % 2) continue;
      p.set(x, y, i % 5 === 0 ? '#FFF6D8' : '#B4AEDA');
    }
  });
}

/** 野づら積み（丸い 野の 石を 段に）。under：水の 中（緑に しずむ）。 */
function stoneImg(under: boolean): HTMLCanvasElement {
  return pix(`yb:stone${under}`, 64, 36, (p) => {
    const base = under ? mix('#22262C', '#1E3A3A', 0.5) : '#22262C';
    p.fill(base);
    let row = 0;
    for (let y = 3; y < 39; y += 6) {
      let x = row % 2 ? -5 : 0;
      while (x < 70) {
        const h = Math.abs(Math.sin(x * 12.9898 + y * 78.233) * 43758.5453) % 1;
        const rx = 4 + Math.floor(h * 4);
        const ry = 2.6 + Math.floor(h * 3) * 0.4;
        const cx = x + rx;
        for (let yy = Math.floor(y - ry); yy <= Math.ceil(y + ry); yy++)
          for (let xx = Math.floor(cx - rx); xx <= Math.ceil(cx + rx); xx++) {
            const dx = (xx + 0.5 - cx) / rx;
            const dy = (yy + 0.5 - y) / ry;
            const d = dx * dx + dy * dy;
            if (d > 1) continue;
            let c = dx + dy < -0.55 ? '#9A9E9C' : d > 0.75 || dx + dy > 0.55 ? '#4E5456' : '#727876';
            if (under) c = mix(c, '#1E3A3A', 0.5);
            p.set(((xx % 64) + 64) % 64, ((yy % 36) + 36) % 36, c);
          }
        x += rx * 2 + 1;
      }
      row++;
    }
  });
}

/** 岸の 上の 草と 稲（ぎざぎざ）。 */
function grassImg(): HTMLCanvasElement {
  return pix('yb:grass', W, 8, (p) => {
    for (let x = 0; x < W; x++) {
      const len = 2 + ((x * 7 + (x >> 2)) % 5);
      for (let j = 0; j < len; j++) p.set(x, 7 - j, j === len - 1 ? '#6A9A4A' : j % 2 ? '#3F6A3A' : '#4E7A3A');
      if (x % 9 === 0) p.vline(x, 0, 7, '#8AB060');
    }
  });
}

/** 底の 泥：左は やわらかい 泥だまり（穴）、水口の 下は 小石、右は かたい 泥。 */
function mudTopImg(): HTMLCanvasElement {
  return pix('yb:mudtop', W, 24, (p) => {
    for (let y = 0; y < 24; y++)
      for (let x = 0; x < W; x++) {
        const n = valueNoise(x / 7, y / 3, 8313);
        let c = n > 0.62 ? '#5A4636' : n < 0.3 ? '#2E2420' : '#443428';
        if (x < 116 && n > 0.5) c = '#6E5A44';
        if (x >= 116 && x < 214 && valueNoise(x / 1.7, y / 1.3, 8316) > 0.78) c = (x + y) % 3 ? '#8E9290' : '#B8B4A8';
        p.set(x, y, c);
      }
    for (let x = 4; x < 110; x += 9 + (x % 7)) p.set(x, 22, '#1B1410');
  });
}
function mudFaceImg(): HTMLCanvasElement {
  return pix('yb:mudface', W, 20, (p) => {
    for (let y = 0; y < 20; y++)
      for (let x = 0; x < W; x++) {
        const n = valueNoise(x / 7, (y + 30) / 3, 8313);
        p.set(x, y, n > 0.62 ? '#6A5440' : n < 0.3 ? '#3A2E26' : '#55412F');
      }
    p.hline(0, W - 1, 0, '#6E5A44');
  });
}

/** 右の 古い 石垣（大きな 石と 黒い すき間）：2D と 同じ 石の 並び（パネルの x 220..328、行 56..100）。 */
function bigStonesImg(): HTMLCanvasElement {
  return pix('yb:big', 108, 44, (p) => {
    const big: [number, number, number, number][] = [
      [236, 72, 13, 9],
      [262, 68, 11, 8],
      [288, 74, 12, 9],
      [250, 88, 12, 8],
      [276, 90, 11, 7],
      [306, 86, 12, 9],
      [316, 66, 9, 7],
    ];
    for (const [cx, cy, rx, ry] of big)
      for (let y = cy - ry; y <= cy + ry; y++)
        for (let x = cx - rx; x <= cx + rx; x++) {
          const dx = (x + 0.5 - cx) / rx;
          const dy = (y + 0.5 - cy) / ry;
          const d = dx * dx + dy * dy;
          if (d > 1) continue;
          let c = dx + dy < -0.5 ? '#8E9290' : d > 0.8 || dx + dy > 0.6 ? '#4A5052' : '#6E7472';
          if (dy < -0.3 && (x * 5 + y * 3) % 4 === 0) c = mix(c, '#3A5A2E', 0.55);
          p.set(x - 220, y - 56, mix(c, '#1E3A3A', 0.35));
        }
    for (const [x, y, rx, ry] of [
      [249, 78, 4, 2],
      [276, 80, 5, 2],
      [300, 76, 3, 2],
      [263, 96, 4, 2],
    ] as [number, number, number, number][])
      p.ellipse(x - 220, y - 56, rx, ry, '#05050A');
  });
}

/** 水口の 土管の 口（コンクリートの 輪、中は 黒）。 */
function pipeImg(): HTMLCanvasElement {
  return pix('yb:pipe', 15, 13, (p) => {
    p.ellipse(7, 6, 7, 6, '#9A9890');
    p.ellipse(6, 5, 5, 4, '#B8B4A8');
    p.ellipse(7, 6, 4.5, 3.6, '#0B0B14');
  });
}
function weedImg(v: number): HTMLCanvasElement {
  return pix(`yb:weed${v}`, 6, 12, (p) => {
    let x = 3;
    for (let y = 11; y > 2 + (v % 3); y--) {
      p.set(x, y, y % 3 ? '#3A6A3A' : '#5A8A4A');
      if (y % 2) x += v % 2 ? 1 : -1;
      x = Math.max(0, Math.min(5, x));
    }
  });
}
function concreteImg(): HTMLCanvasElement {
  return pix('yb:pier', 8, 16, (p) => {
    p.fill('#8A8E90');
    p.vline(0, 0, 15, '#B8BCBE');
    for (let y = 2; y < 16; y += 5) p.set(3, y, '#6E7274');
  });
}

function build(k: Kit, stage: number): void {
  k.sky(skyImg(stage));
  // the far bank: the terraces' black line, the wall over the water and on down to the bed
  const top = rectAt(k, -10, 6, W + 10, 9, WALL_Z - 0.3);
  noFog(plate(k, pix('yb:terrace', 4, 4, (p) => p.fill('#0E0C1A')), top.x0, top.y0, top.w, top.h + 2, WALL_Z - 0.3, { unlit: true, fog: false }));
  const yTop = k.atDepth(0, 8, WALL_Z)!.y;
  const yWater = 0;
  // (the bed is level: its front edge at the cut on the 2D's bed row, its back under the wall's foot, row ≈ 60)
  const yBed = k.atDepth(0, FY, CUT_Z)!.y;
  const xl = k.atDepth(-12, 0, WALL_Z)!.x;
  const xr = k.atDepth(W + 12, 0, WALL_Z)!.x;
  k.box(xl, xr, yWater, yTop, WALL_Z - 0.4, WALL_Z, { front: stoneImg(false), top: grassImg() });
  k.box(xl, xr, yBed - 0.5, yWater, WALL_Z - 0.4, WALL_Z, { front: stoneImg(true) });
  // grass and rice hanging over the wall's top
  const g = rectAt(k, -12, 7, W + 12, 13, WALL_Z + 0.02);
  plate(k, grassImg(), g.x0, g.y0, g.w, g.h, WALL_Z + 0.02);
  // the inlet (a concrete pipe mouth sticking out a little)
  const [ix, iy] = YB_INLET;
  const pm = k.atDepth(ix, iy + 6, WALL_Z + 0.2)!;
  k.stand(pipeImg(), pm, { px: k.pxAt(-(WALL_Z + 0.2)), depth: 6 });
  // the bed: its top (from the wall to the cut) and the cut face of the mud
  const xl2 = k.atDepth(-12, 0, CUT_Z)!.x;
  const xr2 = k.atDepth(W + 12, 0, CUT_Z)!.x;
  k.box(xl2, xr2, yBed - 1.2, yBed, WALL_Z, CUT_Z, { top: mudTopImg(), front: mudFaceImg() });
  // the old wall's big stones on the right, standing on the bed against the wall
  const bz = CUT_Z - 0.5;
  const b0 = k.atDepth(220, 100, bz)!;
  const b1 = k.atDepth(328, 56, bz)!;
  const bpx = (b1.x - b0.x) / 108;
  k.stand(bigStonesImg(), new THREE.Vector3(b0.x, yBed, bz), { px: bpx, depth: 14, anchor: 'left' });
  // the bridge's pier at the far right
  const p0 = k.atDepth(W - 12, 0, WALL_Z + 0.6)!;
  const p1 = k.atDepth(W + 6, 0, WALL_Z + 0.6)!;
  k.box(p0.x, p1.x, yBed, yTop + 0.3, WALL_Z + 0.2, WALL_Z + 1.0, { front: concreteImg(), left: concreteImg(), right: concreteImg() });
  // weeds on the bed
  const rng = new Rng(8317);
  for (let i = 0; i < 18; i++) {
    const x = 8 + ((i * 23) % 300);
    const z = WALL_Z + 0.3 + rng.next() * (CUT_Z - WALL_Z - 0.4);
    const at = k.atDepth(x, FY, z)!;
    at.y = yBed;
    k.stand(weedImg(i % 4), at, { px: k.pxAt(-z) * 1.1, depth: 1, cast: false });
  }
  // the water: the cut face is a pane of water colour (the front of the tank), and its surface line
  const wv = rectAt(k, -12, WY, W + 12, FY, CUT_Z + 0.02);
  const water = plate(k, pix('yb:water', 4, 16, (p) => {
    for (let y = 0; y < 16; y++) p.hline(0, 3, y, mix('#2E5E58', '#14303A', y / 15));
  }), wv.x0, wv.y0, wv.w, wv.h, CUT_Z + 0.02, { unlit: true, transparent: true, opacity: 0.4 });
  water.renderOrder = 3;
  const sl = rectAt(k, -12, WY, W + 12, WY + 1, CUT_Z + 0.03);
  const line = plate(k, pix('yb:surf', 4, 1, (p) => p.fill('#6E9EA8')), sl.x0, sl.y0, sl.w, sl.h, CUT_Z + 0.03, { unlit: true, transparent: true, opacity: 0.7 });
  line.renderOrder = 4;
  // the lantern's light: from above the water at rx, down onto the bed at the ring's middle
  const spot = new THREE.SpotLight('#ffc890', 10, 18, 0.5, 0.3, 0.6);
  spot.castShadow = true;
  spot.shadow.mapSize.set(1024, 1024);
  spot.shadow.bias = -0.001;
  k.scene.add(spot, spot.target);
  k.bag.spot = spot;
  k.bag.yBed = yBed;
}

registerPanel3d('yoburi', {
  cam: { fov: 30, pitch: 7.4, pos: [0, 0, 0], far: 120, near: 0.1 },
  light: LIGHT,
  fog: [6, 22],
  shadow: null,
  focus: 0.8,
  tilt: 0.7,
  grade: () => null,
  build(k, s) {
    build(k, Number(s.st) || 1);
  },
  update(k, _t, s) {
    const spot = k.bag.spot as THREE.SpotLight;
    const rx = Number(s.rx);
    // the ring on the wall's foot (2D：輪の まん中 RING_Y、横 ±37 px)
    // (aimed at the bed's front, where they lie in the mud; from over the water a little in front of it)
    const mid = k.atDepth(rx, RING_Y, CUT_Z - 0.6)!;
    const edge = k.atDepth(rx + RX_R, RING_Y, CUT_Z - 0.6)!;
    const from = k.atDepth(rx, 4, CUT_Z - 0.6)!;
    from.y += 0.4;
    spot.position.copy(from);
    spot.target.position.copy(mid);
    spot.target.updateMatrixWorld();
    const a = mid.clone().sub(from).normalize();
    const b = edge.clone().sub(from).normalize();
    spot.angle = Math.acos(a.dot(b)) * 1.05;
    k.shadowDirty = true;
  },
});
