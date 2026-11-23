// 大写し「なべの 中」（第3章 海の 水で 寄せる、events/ch3/yose.ts NabePanel）を HD-2D で（2026-11-23）。
// あぜ道市の くま吉の 豆腐の 屋台、正午：上に 青と 白の 日よけ（ふちの 波形）、奥に 屋台の 板壁、台の 上の
// こんろ（ごとく、弱い 青い 火：ゆれる）、その 上の なべ（金物の ふち）と 豆乳。豆乳の 面は 2D の 絵と 同じ
// 所・同じ 大きさ（まん中 (100, 67)、横 50・縦 18 px）：海の 水の 色・寄る 白い 雲・へら・びんは 2D の まま 上に。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { h01 } from '../../art/tiles/noise';
import { registerPanel3d, type Kit } from '../panel3d';
import { disc, lathe, pix } from './_kit_f';

/** 絵の 大きさ（左：RX - SX - 4 × CH）。 */
const W = 202;
const H = 112;
/** 豆乳の 面の まん中（パネルの px）と 横の 半径（px）。 */
const MX = 100;
const MY = 67;
const MR = 50;

function plankImg(): HTMLCanvasElement {
  return pix('yd:plank', 32, 32, (p) => {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        let c = h01(x >> 2, y, 6611) > 0.75 ? '#846A4E' : '#7A6248';
        if (y % 8 === 0) c = '#6A5440';
        if (y % 8 === 1) c = '#8E7458';
        p.set(x, y, c);
      }
  });
}
function awningImg(): HTMLCanvasElement {
  return pix('yd:awning', 32, 12, (p) => {
    for (let x = 0; x < 32; x++) {
      const c = x % 16 < 8 ? '#3A5A8A' : '#F4F1E8';
      const bottom = 9 + Math.round(Math.sin(((x % 8) / 8) * Math.PI) * 2);
      for (let y = 0; y < bottom; y++) p.set(x, y, y === 0 ? mix(c, '#000000', 0.15) : c);
    }
  });
}
function tableImg(): HTMLCanvasElement {
  return pix('yd:table', 32, 16, (p) => {
    for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) p.set(x, y, h01(x >> 3, y, 6621) > 0.7 ? '#A88458' : '#9A7650');
    p.hline(0, 31, 0, '#C8A06A');
  });
}
function potImg(): HTMLCanvasElement {
  return pix('yd:pot', 4, 16, (p) => {
    for (let y = 0; y < 16; y++) p.rect(0, y, 4, 1, y > 13 ? '#C0C6CE' : mix('#6A6E78', '#9AA0A8', y / 13));
  });
}
function milkImg(): HTMLCanvasElement {
  return pix('yd:milk', 32, 32, (p) => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) p.set(x, y, h01(x, y, 6631) > 0.93 ? '#F8F2DC' : '#F2EAD0');
  });
}

function flames(k: Kit, at: THREE.Vector3, r: number, px: number): THREE.Mesh[] {
  const list: THREE.Mesh[] = [];
  const img = pix('yd:flame', 4, 8, (p) => {
    p.rect(1, 2, 2, 6, '#4A8AE0');
    p.rect(1, 0, 2, 3, '#9AC8F8');
    p.set(1, 7, '#2A5AB0');
  });
  const tip = pix('yd:flameTip', 4, 8, (p) => {
    p.rect(1, 3, 2, 5, '#4A8AE0');
    p.rect(1, 1, 2, 3, '#F2894B');
    p.set(1, 0, '#FFD080');
  });
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const m = k.stand(i % 2 ? tip : img, new THREE.Vector3(at.x + Math.cos(a) * r, at.y, at.z + Math.sin(a) * r * 0.9), { px, depth: 0, unlit: true, cast: false, emissive: 1 });
    list.push(m);
  }
  return list;
}

registerPanel3d('nabe', {
  cam: { fov: 24, pitch: 18.8, pos: [0, 3.2, 0], far: 80 },
  light: 'noon',
  fog: null,
  shadow: { x: 0, z: -8, hw: 4, hd: 4 },
  focus: 0.6,
  tilt: 0.7,
  animated: true,
  fps: 12,
  build(k) {
    // 豆乳の 面（なべの 中）の まん中と 大きさ
    const MILK = 0;
    const c = k.ground(MX, MY, MILK)!;
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(k.camera.quaternion);
    const d = c.clone().sub(k.camera.position).dot(fwd);
    const R = MR * k.pxAt(d);
    // なべ：ふちの 外 R*1.12、深さ R*0.55
    const rim = R * 1.12;
    const depth = R * 0.3;
    const base = new THREE.Vector3(c.x, MILK - depth * 0.82, c.z);
    lathe(k, [[0, 0], [rim * 0.9, 0], [rim * 0.97, depth * 0.1], [rim, depth], [rim * 1.04, depth * 1.02], [rim * 1.0, depth * 1.06], [rim * 0.94, depth], [rim * 0.94, depth * 0.1], [0, depth * 0.1]], base, { img: potImg(), seg: 40 });
    disc(k, rim * 0.94, new THREE.Vector3(c.x, MILK, c.z), { img: milkImg(), seg: 40 });
    // こんろ（ごとくと 台）
    const top = base.y - 0.02;
    const ink = pix('yd:ink', 4, 4, (p) => p.fill('#3A3F48'));
    const dk = pix('yd:dk', 4, 4, (p) => p.fill('#2A2E36'));
    k.box(c.x - rim * 0.95, c.x + rim * 0.95, top - R * 0.35, top - R * 0.28, c.z - rim * 0.7, c.z + rim * 0.7, { front: ink, top: ink, left: ink, right: ink });
    k.box(c.x - rim * 0.8, c.x + rim * 0.8, top - R * 0.6, top - R * 0.35, c.z - rim * 0.6, c.z + rim * 0.6, { front: dk, top: dk, left: dk, right: dk });
    for (const s of [-1, 1]) k.box(c.x + s * rim * 0.7 - 0.03, c.x + s * rim * 0.7 + 0.03, top - R * 0.28, top, c.z - 0.03, c.z + 0.03, { front: ink, left: ink, right: ink });
    k.bag.flames = flames(k, new THREE.Vector3(c.x, top - R * 0.28, c.z), rim * 0.62, k.pxAt(d) * 0.9);
    // 台（屋台の 天板と 前の 板）
    const ty = top - R * 0.6;
    k.box(c.x - 8, c.x + 8, ty - 3, ty, c.z - 3, c.z + 2.2, { top: tableImg(), front: plankImg() });
    // 奥の 板壁、上の 日よけ
    const zw = c.z - 2.6;
    const a = k.atDepth(-10, -10, zw)!;
    const b = k.atDepth(W + 10, H, zw)!;
    const wall = pix('yd:wall', 224, 128, (p) => {
      for (let y = 0; y < 128; y++)
        for (let x = 0; x < 224; x++) {
          let col = h01(x >> 2, y, 6641) > 0.75 ? '#846A4E' : '#7A6248';
          if (y % 8 === 0) col = '#6A5440';
          if (y % 8 === 1) col = '#8E7458';
          if ((x + (y >> 3) * 37) % 96 === 0) col = '#5E4A38';
          p.set(x, y, col);
        }
    });
    k.quad(wall, [a.x, ty - 3, zw], [b.x, ty - 3, zw], [b.x, a.y, zw], [a.x, a.y, zw]);
    const za = c.z + 0.2;
    const aw0 = k.atDepth(-4, -2, za)!;
    const aw1 = k.atDepth(W + 4, 11, za)!;
    const awn = awningImg();
    const n = Math.max(1, Math.round((aw1.x - aw0.x) / ((aw0.y - aw1.y) * 2.6)));
    for (let i = 0; i < n; i++) {
      const x0 = aw0.x + ((aw1.x - aw0.x) * i) / n;
      const x1 = aw0.x + ((aw1.x - aw0.x) * (i + 1)) / n;
      k.quad(awn, [x0, aw1.y, za], [x1, aw1.y, za], [x1, aw0.y, za - 0.6], [x0, aw0.y, za - 0.6]);
    }
  },
  update(k, t) {
    const list = k.bag.flames as THREE.Mesh[] | undefined;
    if (!list) return;
    list.forEach((m, i) => {
      const s = 0.75 + Math.abs(Math.sin(t / 120 + i)) * 0.45;
      m.scale.y = Math.abs(m.scale.x) * s;
    });
  },
});
