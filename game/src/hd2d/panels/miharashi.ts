// 大写し「上の 段から」（第3章 みかん畑の 上の 段の ベンチ、events/ch3/mikan.ts MiharashiPanel）を
// HD-2D で（2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」：大写しの 見本）。
//
// 見せる 物は 2D の 絵と 同じ：手前の みかんの 木、丸太の ベンチに すわる しゅん と グソっ君 の
// 後ろ姿、段々の 下の 段の 木、坂の 下の 町の 屋根（いぶし瓦・茶の 瓦・スレート）、市場の 大屋根
// （波板）、岸壁と 港の 船、防波堤と 先の 赤い 灯台、止まった 海（段階2 では 波）と 水平線、
// 止まった かもめ（段階2 では いない）。12時の 光（view.ts の 昼と 同じ 色）。
//
// 絵の 部品は フィールドの 海ぞいの町の 物：灯台・船・みかんの 木は 小物の 絵（art/props/c3_props.ts）
// を 立てて 押し出し、屋根は bkit の 屋根の 絵、地面と 海は 第3章の 地面の 絵（c3_ground C3_TEX）。
//
// 置き場所は パネルの 2D の 座標で 決める（Kit.ground）：ベンチは 2D の 絵と 同じ 所、木も 同じ 列。

import * as THREE from 'three';
import { PixelCanvas, mix } from '../../engine/pixel';
import { flag } from '../../game/state';
import { field } from '../../world/field';
import { charSprite } from '../../art/chars/registry';
import { getProp } from '../../art/props/registry';
import type { PropEnv } from '../../art/props/types';
import { fillWall, KAWARA_IBUSHI, roofKawara, roofSlate, roofTin, wallPlaster, wallSiding } from '../../art/props/bkit';
import { C3_TEX, CP, type C3Ground } from '../../art/tiles/c3_ground';
import { Rng } from '../../engine/rng';
import { registerPanel3d, type Kit } from '../panel3d';

// ---------------------------------------------------------------- 絵（1回 作って 使い回す）

const cache = new Map<string, HTMLCanvasElement>();
function once(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = make()));
  return c;
}

/** 小物の 絵（止まった 昼の 1枚）。 */
function propImg(id: string, opts: Record<string, unknown> = {}): HTMLCanvasElement | null {
  const a = getProp(id, opts);
  if (!a) return null;
  const f = field();
  const env: PropEnv = { t: 0, stage: 1, grade: f!.grade, motion: 0, mt: 0, flag: (k) => (k === 'flag_ch3_stage' ? 1 : flag(k)), seed: 0, near: 999, px: 0, py: 0 };
  return a.img(env);
}

/** 第3章の 地面の 絵（フィールドと 同じ 模様）w × h ドット。 */
function groundImg(g: C3Ground, w: number, h: number): HTMLCanvasElement {
  return once(`g:${g}:${w}x${h}`, () => {
    const p = new PixelCanvas(w, h);
    const tex = C3_TEX[g];
    const ctx = { ground: () => g };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.set(x, y, tex(x, y, 0, ctx));
    return p.toCanvas();
  });
}

/** 昼の 空：上が 濃く、水平線へ 白く（ドットの 帯、境目は ディザ）。 */
function skyImg(): HTMLCanvasElement {
  return once('sky', () => {
    const H = 112;
    const p = new PixelCanvas(8, H);
    const stops: [number, string][] = [
      [0, '#78B4E0'],
      [0.12, '#8EC0E0'],
      [0.22, '#A8D0EA'],
      [0.3, '#C8E2F2'],
      [1, '#D8EAF4'],
    ];
    for (let y = 0; y < H; y++) {
      const v = y / H;
      let i = 0;
      while (i < stops.length - 2 && v > stops[i + 1][0]) i++;
      const [a, ca] = stops[i];
      const [b, cb] = stops[i + 1];
      const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
      for (let x = 0; x < 8; x++) {
        // 4 段の 帯 + ベイヤーの ディザ（HD-2D の 空の ドットの 帯）
        const q = Math.floor(t * 4 + ((x + y * 2) % 4) / 4 - 0.12) / 4;
        p.set(x, y, mix(ca, cb, Math.max(0, Math.min(1, q))));
      }
    }
    return p.toCanvas();
  });
}

/** 海（止まった 鏡の 昼の 海）：第3章の 海の 色、明るい 線。`nami`：白い 波頭。 */
function seaImg(nami: boolean): HTMLCanvasElement {
  return once(`sea:${nami}`, () => {
    const p = new PixelCanvas(64, 32);
    const rng = new Rng(nami ? 77 : 71);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 64; x++) {
        const n = rng.next();
        p.set(x, y, n < 0.08 ? CP.umiDk : n > 0.9 ? mix(CP.umi, CP.umiLt, 0.6) : mix(CP.umi, CP.umiLt, 0.35));
      }
    // 空を 映す 長い 明るい 線（止まった 海：動かない）
    for (let k = 0; k < 10; k++) {
      const y = (k * 7) % 32;
      const x = (k * 23) % 64;
      const l = 6 + ((k * 5) % 9);
      for (let i = 0; i < l; i++) p.set((x + i) % 64, y, '#A8D4E8');
    }
    if (nami)
      for (let k = 0; k < 8; k++) {
        const y = (k * 11 + 3) % 32;
        const x = (k * 17) % 64;
        for (let i = 0; i < 5; i++) p.set((x + i) % 64, y, '#E8F4FA');
        p.set((x + 1) % 64, (y + 1) % 32, '#C8E4F0');
      }
    return p.toCanvas();
  });
}

/** 港の 中の 水（フィールドの 港の 青緑）。 */
function minatoImg(): HTMLCanvasElement {
  return groundImg('c3_minato', 64, 64);
}

/** 家の 前の 壁：しっくい（白・クリーム）か 下見板、窓と 戸。 */
function wallImg(kind: number, w: number, h: number): HTMLCanvasElement {
  return once(`wall:${kind}:${w}x${h}`, () => {
    const p = new PixelCanvas(w, h);
    const base = kind === 0 ? '#E8E4D8' : kind === 1 ? '#D8CCB0' : kind === 2 ? '#8A6A4A' : '#C8C2B4';
    fillWall(p, 0, 0, w, h, kind === 2 ? wallSiding(base, kind) : wallPlaster(base, kind));
    // 窓（すりガラス、桟）と 戸
    for (let x = 3; x + 6 < w - 2; x += 11) {
      p.rect(x, 4, 6, 5, '#3A3F48');
      p.rect(x + 1, 5, 4, 3, '#7A9AB0');
      p.vline(x + 3, 5, 7, '#3A3F48');
    }
    p.rect(w - 9, h - 9, 6, 9, '#5A3A2A');
    p.hline(0, w - 1, h - 1, '#6B6A66');
    p.hline(0, w - 1, 0, mix(base, '#3A3F48', 0.4));
    return p.toCanvas();
  });
}

/** 屋根の 絵（上から 見た 1枚：奥の 軒 → 棟 → 前の 軒）。 */
function roofImg(kind: number, w: number, h: number, seed: number): HTMLCanvasElement {
  return once(`roof:${kind}:${w}x${h}:${seed}`, () => {
    const p = new PixelCanvas(w, h);
    if (kind === 0) roofKawara(p, 0, 0, w, h, KAWARA_IBUSHI, seed, 0.45);
    else if (kind === 1) roofKawara(p, 0, 0, w, h, { hi: '#B87A52', base: '#8A5A3A', lo: '#6A4030', deep: '#3A2A22' }, seed, 0.45);
    else if (kind === 2) roofSlate(p, 0, 0, w, h, seed);
    else roofTin(p, 0, 0, w, h, { hi: '#B8C4CC', base: '#9AA0A8', lo: '#7A808A', deep: '#4A505A' }, seed, 0.15);
    return p.toCanvas();
  });
}

/** 市場の 大屋根：明るい 灰色の 波板（フィールドの 市場と 同じ 波板の 絵）。 */
function ichibaRoofImg(): HTMLCanvasElement {
  return once('ichibaRoof', () => {
    const p = new PixelCanvas(160, 40);
    roofTin(p, 0, 0, 160, 40, { hi: '#D8DCE0', base: '#B8BCC4', lo: '#9AA0A8', deep: '#6B7186' }, 3, 0.05);
    return p.toCanvas();
  });
}
function ichibaWallImg(): HTMLCanvasElement {
  return once('ichibaWall', () => {
    const p = new PixelCanvas(160, 20);
    fillWall(p, 0, 0, 160, 20, wallPlaster('#E8E4D8', 5));
    for (let x = 8; x < 150; x += 22) {
      p.rect(x, 5, 10, 5, '#3A3F48');
      p.rect(x + 1, 6, 8, 3, '#5A5A8A');
    }
    p.rect(70, 6, 18, 14, '#4A505A');
    p.rect(71, 7, 16, 13, '#7A8090');
    p.hline(0, 159, 19, '#8E8A80');
    return p.toCanvas();
  });
}

/** 防波堤の 側面（コンクリート、継ぎ目、波に ぬれた 下）。 */
function bouhateiImg(): HTMLCanvasElement {
  return groundImg('c3_bouhatei', 64, 16);
}

/** 段々畑の 石垣（野づら積み）。 */
function ishigakiImg(): HTMLCanvasElement {
  return once('ishigaki', () => {
    const p = new PixelCanvas(64, 32);
    const rng = new Rng(19);
    p.fill(CP.rock);
    for (let y = 0; y < 32; y += 5)
      for (let x = (y / 5) % 2 ? -4 : 0; x < 64; x += 8 + Math.floor(rng.next() * 3)) {
        const w = 6 + Math.floor(rng.next() * 3);
        p.rect(x + 1, y + 1, w, 3, rng.next() < 0.5 ? CP.stone : CP.rockLt);
        p.hline(x + 1, x + w - 1, y + 1, '#C8C4B8');
        if (rng.next() < 0.25) p.set(x + 2, y + 3, CP.moss);
      }
    return p.toCanvas();
  });
}

/** 丸太の ベンチ（横から：半割りの 丸太と 2つの 切り株）。 */
function benchImg(): HTMLCanvasElement {
  return once('bench', () => {
    const p = new PixelCanvas(30, 11);
    p.rect(0, 1, 30, 4, '#B8885A');
    p.hline(0, 29, 1, '#D8B080');
    p.hline(0, 29, 4, '#8A5A3A');
    for (let x = 2; x < 28; x += 5) p.set(x, 2, '#A07448');
    p.ellipse(0, 3, 0, 2, '#E8C890');
    p.ellipse(29, 3, 0, 2, '#E8C890');
    for (const x of [4, 21]) {
      p.rect(x, 5, 5, 6, '#8A5A3A');
      p.vline(x, 5, 10, '#B8885A');
      p.vline(x + 4, 5, 10, '#5A3A2A');
    }
    p.outline('#2A2440');
    return p.toCanvas();
  });
}

/** 止まった かもめ（翼を 広げた まま）。 */
function gullImg(): HTMLCanvasElement {
  return once('gull', () => {
    const p = new PixelCanvas(9, 4);
    p.hline(0, 3, 1, '#F4F1E8');
    p.hline(5, 8, 1, '#F4F1E8');
    p.set(1, 0, '#F4F1E8');
    p.set(7, 0, '#F4F1E8');
    p.rect(3, 1, 3, 2, '#E8E4D8');
    p.set(4, 3, '#9AA0A8');
    p.hline(0, 1, 2, '#9AA0A8');
    p.hline(7, 8, 2, '#9AA0A8');
    return p.toCanvas();
  });
}

/** 人物の 後ろ姿の 上半分（すわって ベンチの 丸太に かくれる 所から 上）。 */
function backOf(id: string): HTMLCanvasElement {
  const s = id === 'player' ? field()?.player.sprite ?? charSprite('minato') : charSprite(id);
  return s.walk.up[0];
}

// ---------------------------------------------------------------- 立体

const W = 328;
const H = 112;
/** 町の 地面の 高さ（坂の 下）と 海の 高さ。上の 段の 地面が 0、カメラは その 3.2 上。 */
const TOWN_Y = -13;
const SEA_Y = -13.6;

function buildTown(k: Kit): void {
  const rng = new Rng(8331);
  // 町の 地面（道と 路地）：家の 間に 見える 所だけ
  k.tiled(groundImg('c3_road', 64, 64), -140, 140, -112, -48, TOWN_Y, 10);
  // 家：奥へ 4 列、前ほど 大きい 間隔。棟は 東西
  for (let row = 0; row < 6; row++) {
    const z = -56 - row * 9.5 - rng.next() * 2;
    const half = (-z * 0.62) + 8;
    for (let x = -half; x < half; ) {
      const w = 6 + rng.next() * 3.5;
      const d = 4.2 + rng.next() * 1.6;
      // 市場の あたりは 家を 置かない（大屋根）
      const inIchiba = row >= 4 && x > -78 && x < -22;
      if (!inIchiba && rng.next() < 0.88) {
        const kind = rng.next() < 0.5 ? 0 : rng.next() < 0.45 ? 1 : rng.next() < 0.6 ? 2 : 3;
        const wallK = rng.next() < 0.6 ? 0 : rng.next() < 0.5 ? 1 : rng.next() < 0.5 ? 2 : 3;
        const two = rng.next() < 0.35;
        const tw = Math.round(w * 8);
        const th = Math.round(d * 8);
        k.gable({
          x0: x,
          x1: x + w,
          z0: z - d,
          z1: z,
          y: TOWN_Y,
          wallH: two ? 3.6 : 2.3,
          roofH: 1.3,
          wall: wallImg(wallK, tw, two ? 28 : 18),
          side: wallImg(wallK, Math.round(d * 8), two ? 28 : 18),
          roof: roofImg(kind, tw, th, Math.floor(rng.next() * 9)),
          ridge: 0.45,
        });
      }
      x += w + 1.2 + rng.next() * 2.2;
    }
  }
  // 市場の 大屋根（岸壁の 前、西より）と 岸壁
  k.gable({ x0: -76, x1: -24, z0: -106, z1: -96, y: TOWN_Y, wallH: 3.2, roofH: 1.2, wall: ichibaWallImg(), side: ichibaWallImg(), roof: ichibaRoofImg(), ridge: 0.4, eave: 0.4 });
  k.tiled(groundImg('c3_quay', 64, 32), -140, 140, -114, -106, TOWN_Y + 0.05, 10);
  k.box(-140, 140, SEA_Y - 0.6, TOWN_Y + 0.05, -114, -113.6, { front: bouhateiImg() });
}

function buildHarbour(k: Kit, nami: boolean): void {
  // 港の 中の 水と 外の 海
  k.tiled(minatoImg(), -150, 40, -150, -113.6, SEA_Y, 6);
  const sea = k.tiled(seaImg(nami), -2200, 2200, -2200, -150, SEA_Y, 3);
  k.tiled(seaImg(nami), 40, 2200, -150, -113.6, SEA_Y, 3);
  k.bag.sea = sea;
  // 防波堤：西から 海へ、先に 赤い 灯台
  const bw = bouhateiImg();
  k.box(-150, -42, SEA_Y - 0.4, SEA_Y + 1.4, -152, -149, { front: bw, top: groundImg('c3_bouhatei', 64, 16) });
  const toudai = propImg('prop_c3_toudai');
  if (toudai) k.stand(toudai, new THREE.Vector3(-128, SEA_Y + 1.4, -150.5), { px: 0.15, depth: 8 });
  // 港の 船（止まった まま）
  for (const [x, z, s, hull] of [
    [-62, -128, 0.12, '#E8E4D8'],
    [-36, -134, 0.13, '#E8E4D8'],
    [-12, -126, 0.11, '#C8D8E8'],
  ] as const) {
    const img = propImg('prop_c3_fune', { hull });
    if (img) k.stand(img, new THREE.Vector3(x, SEA_Y - 0.2, z), { px: s, depth: 10, rows: [4, 36] });
  }
}

function buildTerraces(k: Kit, kn: boolean): void {
  // 上の 段（ベンチの 段）：みかん畑の 土、前の はしは 石垣で 下の 段へ
  const soil = groundImg('c3_mikan', 64, 64);
  k.tiled(soil, -30, 30, -12.6, 3, 0, 16);
  k.box(-30, 30, -3.2, 0, -12.7, -12.6, { front: ishigakiImg() });
  // 下の 段：2段 下に（木の 頭だけ 見える）
  k.tiled(soil, -40, 40, -24, -12.6, -3.2, 16);
  k.box(-40, 40, -6.4, -3.2, -24.1, -24, { front: ishigakiImg() });
  k.tiled(soil, -60, 60, -36, -24, -6.4, 16);
  const tree = propImg('prop_c3_mikan');
  const rng = new Rng(4127);
  if (tree) {
    // 下の 段の 木（町の 屋根の 手前に 頭が 並ぶ）
    for (const [y, z, n, sp] of [
      [-3.2, -18, 13, 3.6],
      [-6.4, -30, 17, 4.2],
    ] as const)
      for (let i = 0; i < n; i++) {
        const x = (i - (n - 1) / 2) * sp + (rng.next() - 0.5) * 1.2;
        k.stand(tree, new THREE.Vector3(x, y, z + (rng.next() - 0.5) * 1.5), { px: 0.075, depth: 6, flip: rng.next() < 0.5 });
      }
    // 手前の 木：2D の 絵と 同じ 列（パネルの 下の はし）、ベンチの 前は あける
    for (let i = 0; i < 9; i++) {
      const px = i * 40 + ((i * 11) % 9);
      if (px > 100 && px < 190) continue;
      const at = k.ground(px, 120, 0);
      if (at) k.stand(tree, at, { px: 0.07, depth: 8, flip: i % 2 === 1 });
    }
  }
  // 丸太の ベンチ（2D の 絵と 同じ 所：パネルの 左寄り）と 2人の 後ろ姿
  const bx = W / 2 - 40 + 14;
  const seat = k.ground(bx, 104, 0);
  if (!seat) return;
  const d = -seat.z;
  const px = k.pxAt(d) * 1.05;
  const bench = benchImg();
  k.stand(bench, seat, { px, depth: 7 });
  const top = 10 * px; // 丸太の 上（ベンチの 絵の 下から 10 ドット）
  // しゅん：腰から 上（すわって 丸太に かくれる）
  const shun = backOf('player');
  k.stand(shun, new THREE.Vector3(seat.x - 6 * px, seat.y + top - 2 * px, seat.z - 2.5 * px), { px, depth: 2, rows: [0, Math.round(shun.height * 0.62)], unlit: true });
  if (kn) {
    const g = backOf('kanenari');
    k.stand(g, new THREE.Vector3(seat.x + 8 * px, seat.y + top - 2 * px, seat.z - 2.5 * px), { px, depth: 2, rows: [0, Math.round(g.height * 0.72)], unlit: true });
  }
  // ベンチと 2人の 下の 丸い 影（フィールドの 人物の 足もとの 影）
  const sh = once('contact', () => {
    const p = new PixelCanvas(24, 8);
    p.ellipse(12, 4, 11, 3, '#1E2A2A');
    return p.toCanvas();
  });
  const m = k.material(k.tex(sh), { unlit: true });
  (m as THREE.MeshBasicMaterial).transparent = true;
  (m as THREE.MeshBasicMaterial).opacity = 0.28;
  (m as THREE.MeshBasicMaterial).alphaTest = 0.01;
  (m as THREE.MeshBasicMaterial).depthWrite = false;
  const g = k.own(new THREE.PlaneGeometry(36 * px, 8 * px));
  g.rotateX(-Math.PI / 2);
  const shadow = new THREE.Mesh(g, m);
  shadow.position.set(seat.x, seat.y + 0.01, seat.z - 2 * px);
  k.scene.add(shadow);
}

function buildGulls(k: Kit): void {
  const img = gullImg();
  const list: THREE.Mesh[] = [];
  // 2D と 同じ 所（パネルの px）に 止まって いる
  for (const [x, y] of [[150, 14], [232, 22], [280, 10]] as const) {
    const at = k.atDepth(x, y, -60);
    if (at) list.push(k.stand(img, at, { px: k.pxAt(60) * 1.1, depth: 0, unlit: true, cast: false }));
  }
  k.bag.gulls = list;
}

registerPanel3d('miharashi', {
  cam: { fov: 24, pitch: 5.6, pos: [0, 3.2, 0], far: 4000 },
  light: 'noon',
  fog: [140, 1500],
  shadow: { x: 0, z: -60, hw: 150, hd: 110 },
  focus: 0.82,
  tilt: 1.6,
  animated: (s) => !!s.nami,
  fps: 20,
  build(k, s) {
    const nami = !!s.nami;
    k.sky(skyImg());
    buildTown(k);
    buildHarbour(k, nami);
    buildTerraces(k, !!s.kn);
    if (!nami) buildGulls(k);
  },
  update(k, t, s) {
    // 段階2：海が 動く（波頭が 岸へ 寄る）
    const sea = k.bag.sea as THREE.Mesh | undefined;
    if (sea && s.nami) {
      const map = (sea.material as THREE.MeshLambertMaterial).map;
      if (map) {
        map.offset.y = (t / 9000) % 1;
        map.offset.x = Math.sin(t / 2400) * 0.01;
      }
    }
  },
});
