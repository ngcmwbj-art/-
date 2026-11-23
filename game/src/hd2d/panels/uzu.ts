// 大写し「2枚の うず」（第2章 転回場の 軽トラの そば、events/ch2/uzu.ts UzPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：夜の 転回場（西から 駅前の 明かり）、地面に しいた 新聞、重なった
// 2枚の 蚊取り線香（下の 1枚は 動かない、上の 1枚が 右へ わかれる：すきま sep・ねじり tw）、まん中を
// つまむ しゅんの 指（グソっ君は はさみ）。折れた とき（ore）は 外側の はし（上の 1枚）か まん中（下の 1枚、2本）が
// ずれて 落ちる。線香は ほんとうの うず巻きの 帯（立体）、2D と 同じ 巻き数・大きさ・位置（パネルの 2D の 座標）。
// 折れた くずの 点・右の 列・ゲージは 2D の まま。

import * as THREE from 'three';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { hGroundImg, pix } from './_kit_d';

const W = 202;
const H = 112;
/** うずの まん中（パネルの px：uzu.ts CX − SX, CY）。 */
const CX = 104;
const CY = 58;
const SEP_PX = 54;
const TURNS = 3.3;
const R0 = 5;
const R = 42;

/** 夜（西＝左上から 駅前の 明かり、上は 暗い 空あかり）。 */
const LIGHT: PanelLight = { sun: '#f2d8a0', sky: '#4a5070', ground: '#2a2630', fog: '#1a1a26', sunI: 1.1, hemiI: 1.1, el: 30, az: 300 };

/** 線香の 帯の 色（上・わき・下）。 */
function coilImg(): HTMLCanvasElement {
  return pix('uz:coil', 4, 8, (p) => {
    p.vline(0, 0, 7, '#3E7A3A');
    p.vline(1, 0, 7, '#4A8A42');
    p.vline(2, 0, 7, '#3E7A3A');
    p.vline(3, 0, 7, '#2E5A2A');
    p.set(1, 3, '#6AA25A');
    p.set(2, 6, '#6AA25A');
  });
}

/** 新聞（字の 行、見出しの 太い 帯、写真の 四角）。 */
function paperImg(): HTMLCanvasElement {
  return pix('uz:paper', 150, 52, (p) => {
    p.fill('#BEB8A8');
    for (let y = 3; y < 50; y += 3) for (let x = 4; x < 146; x++) if ((x * 7 + y * 3) % 11 > 2 && !(x > 96 && x < 140 && y > 8 && y < 30)) p.set(x, y, '#8A8678');
    p.rect(8, 4, 60, 4, '#5A5650');
    p.rect(98, 10, 40, 18, '#7A766C');
    p.rect(100, 12, 36, 14, '#9A968A');
    for (let x = 0; x < 150; x += 38) p.vline(x, 0, 51, '#A8A294');
    p.hline(0, 149, 0, '#D8D2C2');
  });
}

/** しゅんの 指（親指と 人さし指で つまむ）・グソっ君の はさみ。 */
function fingersImg(): HTMLCanvasElement {
  return pix('uz:fingers', 12, 18, (p) => {
    p.rect(1, 0, 10, 8, '#E8B890');
    p.hline(1, 10, 0, '#F2C8A0');
    p.rect(0, 8, 4, 9, '#F2C8A0');
    p.rect(8, 8, 4, 9, '#F2C8A0');
    p.vline(0, 8, 16, '#C89A7A');
    p.vline(8, 8, 16, '#C89A7A');
    p.hline(0, 3, 16, '#E8A890');
    p.hline(8, 11, 16, '#E8A890');
    p.outline('#5A3A2A');
  });
}
function clawImg(): HTMLCanvasElement {
  return pix('uz:claw', 14, 20, (p) => {
    p.rect(3, 0, 8, 8, '#9A4A30');
    p.hline(3, 10, 0, '#B85A3A');
    p.rect(0, 8, 5, 11, '#B85A3A');
    p.rect(9, 8, 5, 11, '#B85A3A');
    p.hline(1, 3, 8, '#E08A6A');
    p.hline(10, 12, 8, '#E08A6A');
    p.set(4, 18, '#7A3A22');
    p.set(9, 18, '#7A3A22');
    p.outline('#3A1A12');
  });
}

/** うず巻きの 帯（k0..k1 の 部分）：中心 (0,0,0)、平らに 寝かせた 帯（幅 w・厚み th）。u：パネルの 1px の 大きさ。 */
function coilGeo(k0: number, k1: number, u: number, w: number, th: number): THREE.BufferGeometry {
  const pos: number[] = [];
  const nor: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const n = Math.max(2, Math.round((k1 - k0) * 260));
  const quad = (a: number[], b: number[], c: number[], d: number[], nn: number[], u0: number, u1: number) => {
    const base = pos.length / 3;
    for (const v of [a, b, c, d]) pos.push(...v);
    for (let i = 0; i < 4; i++) nor.push(...nn);
    uv.push(u0, 0, u1, 0, u1, 1, u0, 1);
    idx.push(base, base + 1, base + 2, base, base + 2, base + 3);
  };
  const at = (k: number, dr: number, y: number): number[] => {
    const th0 = k * TURNS * Math.PI * 2;
    const r = (R0 + k * R + dr) * u;
    // (2D：x = cos · r、y = sin · r · 0.62 — screen-down is toward the camera: +z)
    return [Math.cos(th0) * r, y, Math.sin(th0) * r];
  };
  for (let i = 0; i < n; i++) {
    const a = k0 + ((k1 - k0) * i) / n;
    const b = k0 + ((k1 - k0) * (i + 1)) / n;
    // top
    quad(at(a, -w / 2, th), at(b, -w / 2, th), at(b, w / 2, th), at(a, w / 2, th), [0, 1, 0], 0.25, 0.75);
    // outer side and inner side
    const ta = a * TURNS * Math.PI * 2;
    quad(at(a, w / 2, 0), at(a, w / 2, th), at(b, w / 2, th), at(b, w / 2, 0), [Math.cos(ta), 0, Math.sin(ta)], 0.75, 1);
    quad(at(a, -w / 2, th), at(a, -w / 2, 0), at(b, -w / 2, 0), at(b, -w / 2, th), [-Math.cos(ta), 0, -Math.sin(ta)], 0, 0.25);
  }
  // the end caps
  for (const [k, s] of [
    [k0, -1],
    [k1, 1],
  ] as const) {
    const t = k * TURNS * Math.PI * 2;
    const tn = [-Math.sin(t) * s, 0, Math.cos(t) * s];
    quad(at(k, -w / 2, 0), at(k, w / 2, 0), at(k, w / 2, th), at(k, -w / 2, th), tn, 0.5, 0.75);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  g.setIndex(idx);
  return g;
}

interface Coil {
  /** 中心の 組（回して 動かす）。 */
  grp: THREE.Group;
  /** 折れて とれる 所（cut の あと）。 */
  piece: THREE.Mesh;
}

function makeCoil(k: Kit, cut: number, u: number, th: number): Coil {
  const mat = k.material(k.tex(coilImg()), { side: THREE.DoubleSide });
  const grp = new THREE.Group();
  const main = new THREE.Mesh(k.own(coilGeo(0, cut, u, 4.2, th)), mat);
  const piece = new THREE.Mesh(k.own(coilGeo(cut, 1, u, 4.2, th)), mat);
  for (const m of [main, piece]) {
    m.castShadow = true;
    m.receiveShadow = true;
    grp.add(m);
  }
  // the stub at the middle (the hole for the stand)
  const stub = new THREE.Mesh(k.own(new THREE.CylinderGeometry(2.2 * u, 2.2 * u, th * 1.05, 10)), k.material(null, { tint: '#2E5A2A' }));
  stub.position.y = th / 2;
  grp.add(stub);
  k.scene.add(grp);
  return { grp, piece };
}

registerPanel3d('uzu', {
  cam: { fov: 24, pitch: 38, pos: [0, 7, 0], far: 200, near: 0.2 },
  light: LIGHT,
  fog: [20, 60],
  shadow: { x: 0, z: -9, hw: 6, hd: 6 },
  focus: 0.52,
  tilt: 0.9,
  grade: () => null,
  build(k) {
    const c = k.ground(CX, CY, 0)!;
    const u = k.pxAt(c.distanceTo(k.camera.position));
    k.bag.c = c;
    k.bag.u = u;
    // the ground of the turning place (asphalt) and the newspaper under the coils (2D：x 30..180, rows CH−30..CH−4)
    k.tiled(hGroundImg('h_road', 64, 64), c.x - 30, c.x + 30, c.z - 30, c.z + 12, -0.02, 14, { tint: '#8a8a98' });
    const p0 = k.ground(28, 36, 0)!;
    const p1 = k.ground(182, 108, 0)!;
    k.box(p0.x, p1.x, -0.02, 0, p0.z, p1.z, { top: paperImg() });
    const th = 3.4 * u;
    const under = makeCoil(k, 0.55, u, th);
    under.grp.position.copy(c);
    const top = makeCoil(k, 0.86, u, th);
    top.grp.position.copy(c).add(new THREE.Vector3(0, th, 0));
    k.bag.under = under;
    k.bag.top = top;
    // the hand at the top one's middle
    const hand = k.stand(fingersImg(), new THREE.Vector3(0, 0, 0), { px: u, depth: 4, unlit: true });
    const claw = k.stand(clawImg(), new THREE.Vector3(0, 0, 0), { px: u, depth: 4 });
    k.bag.hand = hand;
    k.bag.claw = claw;
    // the station's light from the west (the 2D's glow at the top left)
    const lamp = new THREE.PointLight('#f2d8a0', 2.2, 40, 0.8);
    const at = k.ground(10, 8, 0)!;
    lamp.position.set(at.x, 5, at.z);
    k.scene.add(lamp);
  },
  update(k, _t, s) {
    const c = k.bag.c as THREE.Vector3;
    const u = k.bag.u as number;
    const sep = Number(s.sep) || 0;
    const tw = Number(s.tw) || 0;
    const under = k.bag.under as Coil;
    const top = k.bag.top as Coil;
    // 2D：上の 1枚は (sep · 54 + tw · 2) 右へ、sep · 6 上へ（奥へ）、回し π + tw · 0.08
    const dx = (Math.round(sep * SEP_PX) + Math.round(tw * 2)) * u;
    const dz = -Math.round(sep * 6) * u / 0.62;
    const th = 3.4 * u;
    top.grp.position.set(c.x + dx, c.y + th + sep * th * 0.6, c.z + dz);
    top.grp.rotation.y = -(Math.PI + tw * 0.08);
    under.grp.rotation.y = 0;
    // the broken pieces: off by the 2D's drop (px → units on the ground)
    under.piece.position.set(s.ore === 'naka' ? 10 * u : 0, 0, s.ore === 'naka' ? (8 * u) / 0.62 : 0);
    // (top's piece is in its own turned frame: the drop is turned back)
    const d = new THREE.Vector3(14 * u, -th, (10 * u) / 0.62).applyAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI + tw * 0.08);
    if (s.ore === 'soto') top.piece.position.copy(d);
    else top.piece.position.set(0, 0, 0);
    const hand = k.bag.hand as THREE.Mesh;
    const claw = k.bag.claw as THREE.Mesh;
    hand.visible = !s.claw;
    claw.visible = !!s.claw;
    for (const m of [hand, claw]) {
      const w = (m === hand ? 12 : 14) * u;
      m.position.set(top.grp.position.x - w / 2, top.grp.position.y + th * 0.2, top.grp.position.z + 0.02);
    }
    k.shadowDirty = true;
  },
});
