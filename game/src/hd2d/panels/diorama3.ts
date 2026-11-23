// 大写し「模型の 寄り」（第3章 旧水族館の ジオラマの 部屋、events/ch3/diorama3.ts MokeiPanel）の 左の 場面を
// HD-2D で（2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：黒い 台の 上の 町の 模型を 寄りで。星見台の 模型（塗った 草の 段々、牛舎の
// わらと バルサの 奥の 壁と 柱の 前に 黒い 牛の 人形 ／ 山道の 土の 前に 歩く 型の 耕うん機）、海ぞいの 町の
// 模型（昼の 淡い 空の 背景画、止まった 海、防波堤の 白い 灯台 ／ 食堂かもめの 看板）。人形は 2D と 同じ 絵
// （牛の 寝かけ・鍵／紐・豆電球）を 厚みの ある 体に。模型の 上の 小さな 灯り（町ごとの 時刻の 色）で 照らし、
// まわりは ジオラマの 部屋の 暗がり。模型の 名・直した 輪・ヒントの 帯・グソっ君・書き文字は 2D。

import * as THREE from 'three';
import { valueNoise } from '../../engine/rng';
import { h01 } from '../../art/tiles/noise';
import { cow, lighthouse, shopSign, tiller, type Kagi } from '../../events/ch3/diorama3';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { D0, gfxImg, mix, pix, plane } from './_kit_e';

const SW = 202;
const H = 112;
/** 人形の 足もとの 行（2D と 同じ：絵の 下から ヒントの 帯 18 ＋ 10）。 */
const GY = H - 18 - 10;
const CX = Math.round(SW / 2);

/** 星見台の 模型の 灯り（星見台の 夜明け前の 青み）と 海ぞいの 町（12:00 の 白）。 */
const LIGHT_HOSHI: PanelLight = { sun: '#E8ECFF', sky: '#B8C0E8', ground: '#2A2A40', fog: '#0E0E16', sunI: 2.0, hemiI: 1.2, el: 62, az: 30 };
const LIGHT_UMI: PanelLight = { sun: '#FFFDF2', sky: '#E8F0F8', ground: '#3A3A4A', fog: '#0E0E16', sunI: 2.2, hemiI: 1.3, el: 62, az: 30 };

/** 模型の 草（塗った 緑、毛足の 粒）。 */
function grassImg(): HTMLCanvasElement {
  return pix('dm:grass', 64, 64, (p) => {
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        const n = valueNoise(x / 5, y / 4, 7901);
        let c = n > 0.62 ? '#5A8A4A' : n < 0.3 ? '#3E6A38' : '#4A7A42';
        if (h01(x, y, 7903) > 0.94) c = '#6A9A56';
        p.set(x, y, c);
      }
  });
}
function strawImg(ushi: boolean): HTMLCanvasElement {
  return pix(`dm:straw:${ushi}`, 64, 16, (p) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 64; x++) {
        const base = ushi ? '#C8B070' : '#A8946A';
        let c = h01(x, y, 7905) > 0.7 ? mix(base, '#FFFFFF', 0.2) : h01(x, y, 7907) > 0.8 ? mix(base, '#000000', 0.2) : base;
        if (ushi && (x + y * 3) % 7 === 0) c = '#B89A58';
        p.set(x, y, c);
      }
  });
}
/** バルサの 牛舎の 奥の 壁と 柱。 */
function barnImg(): HTMLCanvasElement {
  return pix('dm:barn', 68, 22, (p) => {
    p.fill('#7A5A4A');
    for (let y = 0; y < 22; y += 4) p.hline(0, 67, y, '#6A4C3E');
    for (const x of [10, 44]) p.rect(x, 0, 4, 22, '#5A4236');
    p.hline(0, 67, 21, '#4A3428');
  });
}
/** 模型の 背景画（昼の 淡い 空）。 */
function backdropImg(): HTMLCanvasElement {
  return pix('dm:backdrop', 8, 32, (p) => {
    for (let y = 0; y < 32; y++) for (let x = 0; x < 8; x++) p.set(x, y, mix('#8EC0E0', '#C8E2F2', y / 31));
  });
}
/** 模型の 海（つやの ある 青、止まった 光の 線）。 */
function seaImg(): HTMLCanvasElement {
  return pix('dm:sea', 32, 32, (p) => {
    p.fill('#3A7EA8');
    for (let k = 0; k < 6; k++) p.hline((k * 11) % 24, ((k * 11) % 24) + 7, (k * 5) % 32, '#5A9EC8');
  });
}
function quayImg(): HTMLCanvasElement {
  return pix('dm:quay', 32, 16, (p) => {
    p.fill('#9AA0A8');
    p.hline(0, 31, 0, '#B8BEC6');
    for (let x = 0; x < 32; x += 8) p.vline(x, 1, 15, '#8A9098');
  });
}
function tableImg(): HTMLCanvasElement {
  return pix('dm:table', 16, 16, (p) => {
    p.fill('#16161E');
    p.hline(0, 15, 0, '#3A3A4A');
  });
}

/** 人形の 絵（2D の 関数で、足もと (80, 96)）。 */
function figure(kind: string, st: string, on: boolean): HTMLCanvasElement {
  return gfxImg(`dm:fig:${kind}:${st}:${on}`, 160, 100, (g) => {
    if (kind === 'ushi') cow(g, 80 - 18, 96, st as 'ushiro' | 'mae');
    else if (kind === 'kagi') tiller(g, 80 - 14, 96, st as Kagi);
    else if (kind === 'toudai') lighthouse(g, 80 - 20, 96, on, 0);
    else shopSign(g, 80 - 10, 96);
  });
}

function build(k: Kit, s: Record<string, unknown>): void {
  const spot = String(s.s);
  const hoshi = spot === 'ushi' || spot === 'kagi';
  const z = -D0;
  const px = k.pxAt(D0);
  const gy = k.atDepth(0, GY, z)!.y;
  // 黒い 台（模型の 下）と 部屋の 暗がり
  k.box(-14, 14, gy - 2, hoshi ? gy - 0.02 : gy - 0.62, z - 10, z + 1.2, { front: tableImg(), top: tableImg() });
  if (hoshi) {
    // 塗った 草の 段々（奥へ 上がる）と わら／山道
    k.tiled(grassImg(), -14, 14, z - 10, z + 1.2, gy, 16);
    for (let i = 1; i < 4; i++) k.box(-14, 14, gy, gy + i * 0.5, z - 10, z - 3 - i * 1.6, { top: grassImg(), front: grassImg() });
    k.tiled(strawImg(spot === 'ushi'), -14, 14, z - 0.6, z + 0.9, gy + 0.01, 16);
    if (spot === 'ushi') {
      // 牛舎の 奥の 壁と 柱（バルサ）
      const a = k.atDepth(0, 30, z - 1.6)!;
      k.box(-14, 14, gy, a.y + 0.6, z - 1.8, z - 1.6, { front: barnImg() });
      for (let x = -12; x < 14; x += 5.5) k.box(x, x + 0.25, gy, a.y + 0.6, z - 1.6, z - 1.35, { front: pix('dm:post', 4, 8, (p) => p.fill('#5A4236')) });
    } else {
      // 奥へ 上る 山道（土の 帯）
      const road = strawImg(false);
      k.quad(road, [3, gy + 0.02, z - 0.6], [6.4, gy + 0.02, z - 0.6], [5.2, gy + 2.1, z - 9.6], [3.6, gy + 2.1, z - 9.6]);
    }
  } else {
    // 海ぞいの 町：背景画・海・岸壁
    const top = k.atDepth(0, -10, z - 9)!.y;
    k.box(-16, 16, gy - 0.6, top, z - 9.2, z - 9, { front: backdropImg() });
    k.tiled(seaImg(), -16, 16, z - 9, z - 1.2, gy - 0.25, 16);
    k.box(-16, 16, gy - 0.6, gy, z - 1.2, z + 1.2, { top: quayImg(), front: quayImg() });
    // 止まった 船（小さな 箱の 模型）
    for (const [x, zz] of [[-6, -5.5], [4.5, -3.2]] as const)
      k.box(x, x + 1.6, gy - 0.2, gy + 0.25, z + zz, z + zz + 0.6, { front: pix('dm:boat', 8, 4, (p) => (p.fill('#E8E4D8'), p.hline(0, 7, 3, '#2F6A9A'))), top: pix('dm:boatTop', 4, 4, (p) => p.fill('#C8C4B8')) });
  }
  // 人形（2D と 同じ 絵を 厚みの ある 体に。見せる 物は update で 切りかえ）
  const at = k.atDepth(CX - 80, GY + 4, z)!;
  const figs: { key: string; m: THREE.Mesh; y: number }[] = [];
  const add = (st: string, on = false) => {
    const m = k.stand(figure(spot, st, on), at, { px, depth: spot === 'kanban' ? 3 : 10, anchor: 'left', emissive: spot === 'ushi' ? 0.2 : 0.06 });
    figs.push({ key: `${st}:${on}`, m, y: at.y });
  };
  if (spot === 'ushi') ['ushiro', 'mae'].forEach((x) => add(x));
  else if (spot === 'kagi') ['kagi', 'nuita', 'himo'].forEach((x) => add(x));
  else if (spot === 'toudai') [true, false].forEach((on) => add('', on));
  else add('');
  k.bag.figs = figs;
  k.bag.px = px;
  // 豆電球の 光（灯台：まちがいの 間だけ）
  if (spot === 'toudai') {
    const b = k.atDepth(CX - 20, GY - 54, z + 0.2)!;
    const bulb = new THREE.PointLight('#FFE27A', 6, 6, 1.5);
    bulb.position.copy(b);
    k.scene.add(bulb);
    k.bag.bulb = bulb;
    k.bag.halo = plane(k, pix('dm:halo', 32, 32, (p) => p.circle(16, 16, 15, '#FFF2A0')), b, 1.6, 1.6, { add: true, opacity: 0.22, order: 5 });
  }
  // 模型の 上の 小さな 灯りの 照らす 輪（台の 上）
  plane(k, pix('dm:pool', 32, 16, (p) => p.ellipse(16, 8, 15, 7, '#FFF6E0')), new THREE.Vector3(0, gy + 0.03, z - 0.5), 20, 7, { face: 'floor', add: true, opacity: 0.1, order: 4 });
}

registerPanel3d('diorama3', {
  cam: { fov: 24, pitch: 6, pos: [0, 0, 0], far: 200 },
  light: LIGHT_HOSHI,
  fog: [40, 90],
  shadow: { x: 0, z: -D0, hw: 12, hd: 10 },
  focus: 0.62,
  tilt: 0.45,
  build(k, s) {
    // （町ごとの 灯りの 色：海ぞいの 町は 12:00 の 白）
    if (s.s === 'toudai' || s.s === 'kanban') {
      k.sun.color.set(LIGHT_UMI.sun);
      k.hemi.color.set(LIGHT_UMI.sky);
    }
    build(k, s);
  },
  update(k, _t, s) {
    const key = s.s === 'ushi' ? `${s.ushi}:false` : s.s === 'kagi' ? `${s.kagi}:false` : s.s === 'toudai' ? `:${!!s.on}` : ':false';
    const lift = Number(s.lift ?? 0) * (k.bag.px as number);
    for (const f of k.bag.figs as { key: string; m: THREE.Mesh; y: number }[]) {
      f.m.visible = f.key === key;
      f.m.position.y = f.y + lift;
    }
    if (k.bag.bulb) {
      (k.bag.bulb as THREE.PointLight).visible = !!s.on;
      (k.bag.halo as THREE.Mesh).visible = !!s.on;
    }
    k.shadowDirty = true;
  },
});
