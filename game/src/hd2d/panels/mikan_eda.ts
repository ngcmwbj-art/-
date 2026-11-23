// 大写し「枝」（第3章 みかん畑、events/ch3/mikan.ts EdaPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：みかんの 木の 中の 濃い 葉の かげ、すきまの 昼の 空、左から のびて 右へ
// 少し 下がる 枝、枝ぞいの 葉、青い 実 5つ（小さい 実・傷の ある 実・上を 向く 実が 1つ ずつ まじる）、
// 下の かご（切った 実が 入る）。実と 枝は 2D の 当たり（TouchPick：枝の 付け根から 実まで）と 同じ px に
// 置く（パネルの 2D の 座標を 奥行き D0 の 面に そのまま 写す：1 px = 1 ドット）。
// 奥には みかんの 木（フィールドの 小物）を 何本も 重ねて 葉の かげを、手前には ぼけた 葉を。
// 選ぶ しるし・はさみ・落ちる 実は 2D の まま 上に（events/ch3/mikan.ts）。

import * as THREE from 'three';
import { Rng } from '../../engine/rng';
import type { Gfx } from '../../engine/gfx';
import { CP } from '../../art/tiles/c3_ground';
import { registerPanel3d, type Kit } from '../panel3d';
import { contact, D0, gfxImg, noonSky, pix, propImg } from './_kit_e';

/** 2D と 同じ（events/ch3/mikan.ts）。 */
const W = 222;
const H = 112;
type Mi = 'futsu' | 'chiisai' | 'kizu' | 'ue';
const EDA_MI: Mi[][] = [
  ['futsu', 'futsu', 'futsu', 'chiisai', 'futsu'],
  ['futsu', 'kizu', 'futsu', 'futsu', 'futsu'],
  ['futsu', 'futsu', 'ue', 'futsu', 'futsu'],
];
function branchAt(i: number): [number, number] {
  return [28 + i * 42, 24 + Math.round(i * 2.2)];
}
function miAt(k: number, i: number): [number, number] {
  const [x, by] = branchAt(i);
  const kind = EDA_MI[k][i];
  if (kind === 'ue') return [x, by - 12];
  return [x, by + (kind === 'chiisai' ? 16 : 22)];
}

/** パネル 全体の 大きさの 絵（2D の 関数で 描く）を、奥行き z の 面に 立てる（2D と 同じ px に 出る）。 */
function standPanel(k: Kit, img: HTMLCanvasElement, z: number, depth: number, o: { unlit?: boolean; emissive?: number } = {}): THREE.Mesh {
  const at = k.atDepth(0, H, z)!;
  return k.stand(img, at, { px: k.pxAt(-z), depth, anchor: 'left', unlit: o.unlit, emissive: o.emissive });
}

/** 枝（2D と 同じ 線：3本の 色の 線を 重ねた 太さ 3px）。 */
function branchImg(): HTMLCanvasElement {
  return gfxImg('eda:branch', W, H, (g) => {
    let prev: [number, number] = [-2, 20];
    for (let i = 0; i < 5; i++) {
      const p = branchAt(i);
      for (let d = 0; d < 3; d++) g.line(prev[0], prev[1] + d, p[0] + 20, p[1] + 1 + d, d === 0 ? '#8A6A44' : d === 1 ? '#5A3A2A' : '#3A2418');
      prev = [p[0] + 20, p[1] + 1];
    }
    // 小枝（実の 付け根へ）
    for (let i = 0; i < 5; i++) {
      const [x, y] = branchAt(i);
      g.line(x - 6, y + 1, x - 1, y + 1, '#5A3A2A');
    }
  });
}

/** 枝ぞいの 葉（2D と 同じ 60枚、少し 大きく 葉脈つき）。front：枝の 手前の 半分。 */
function leavesImg(front: boolean): HTMLCanvasElement {
  return gfxImg(`eda:leaves:${front}`, W, H, (g) => {
    for (let i = 0; i < 60; i++) {
      if ((i % 3 === 0) !== front) continue;
      const [bx, by] = branchAt(i % 5);
      const lx = bx - 20 + ((i * 13) % 40);
      const ly = by - 14 + ((i * 7) % 12) + (i % 2 ? 0 : 10);
      leaf(g, lx, ly, i);
    }
  });
}
function leaf(g: Gfx, x: number, y: number, i: number): void {
  const c = i % 3 ? CP.mikanLeaf : '#3A7A3A';
  g.rect(x + 1, y, 8, 4, c);
  g.rect(x, y + 1, 10, 2, c);
  g.rect(x + 2, y, 5, 1, CP.mikanLeafLt);
  g.rect(x + 1, y + 2, 8, 1, '#2E6A3A');
  g.px(x + 10, y + 2, '#2E6A3A');
}

/** 実 1つと その 柄（2D と 同じ 形）。 */
function miImg(k: number, i: number): HTMLCanvasElement {
  return gfxImg(`eda:mi:${k}:${i}`, W, H, (g) => {
    const kind = EDA_MI[k][i];
    const [, by] = branchAt(i);
    const [x, y] = miAt(k, i);
    const r = kind === 'chiisai' ? 4 : kind === 'ue' ? 10 : 8;
    if (kind === 'ue') g.rect(x - 1, y + r - 1, 3, by - (y + r) + 2, '#5A6A3A');
    else g.rect(x - 1, by + 2, 2, y - r - by - 1, '#5A6A3A');
    g.circle(x, y, r, '#5A9040');
    g.circle(x, y, r - 1, '#6AA04A');
    g.circle(x + Math.round(r / 4), y + Math.round(r / 4), Math.round(r * 0.7), '#5A9040');
    g.circle(x - Math.round(r / 3), y - Math.round(r / 3), Math.max(1, Math.round(r / 3)), '#9BCB6B');
    // 油胞の 点（みかんの 皮の つぶつぶ）
    for (let a = 0; a < r * 2; a++) g.px(x - r + 2 + ((a * 7) % (r * 2 - 2)), y - r + 3 + ((a * 5) % (r * 2 - 4)), '#7AB058');
    g.rect(x - 2, y - r, 4, 2, '#3A5A2A');
    if (kind === 'kizu') {
      g.line(x - 4, y - 2, x + 3, y + 4, '#8A5A3A');
      g.line(x - 3, y - 3, x + 4, y + 3, '#A8784A');
      g.line(x - 1, y - 3, x + 1, y + 1, '#8A5A3A');
    }
  });
}

/** かご（竹を 編んだ 前の 面）。 */
function kagoImg(): HTMLCanvasElement {
  return pix('eda:kago', 44, 12, (p) => {
    p.fill('#C8A06A');
    p.hline(0, 43, 0, '#E8C890');
    p.hline(0, 43, 1, '#A8804A');
    for (let x = 3; x < 44; x += 4) p.vline(x, 2, 10, '#A8804A');
    for (let y = 4; y < 12; y += 3) for (let x = (y % 2) * 2; x < 44; x += 4) p.set(x, y, '#D8B47A');
    p.hline(0, 43, 11, '#7A5A34');
  });
}
function kagoTopImg(): HTMLCanvasElement {
  return pix('eda:kagoTop', 44, 16, (p) => {
    p.fill('#5A3A22');
    p.strokeRect(0, 0, 44, 16, '#E8C890');
  });
}
function greenBall(): HTMLCanvasElement {
  return pix('eda:ball', 9, 9, (p) => {
    p.circle(4, 4, 4, '#5A9040');
    p.circle(4, 4, 3, '#6AA04A');
    p.set(3, 2, '#9BCB6B');
    p.set(2, 3, '#9BCB6B');
  });
}

function build(k: Kit, s: Record<string, unknown>): void {
  const kk = Number(s.k ?? 0);
  k.sky(noonSky());
  const rng = new Rng(911 + kk);
  // 奥：葉の かげ（みかんの 木を 何本も 重ねる。すきまに 昼の 空）
  const tree = propImg('prop_c3_mikan');
  if (tree) {
    // （幹の 見えない 葉の 所だけ：絵の 上 18 行）
    for (let layer = 0; layer < 4; layer++) {
      const z = -D0 - 3 - layer * 4;
      const n = 12 + layer * 3;
      for (let j = 0; j < n; j++) {
        const px = -40 + ((j + rng.next() * 0.8) / n) * (W + 80);
        const py = 20 + rng.next() * 110;
        const at = k.atDepth(px, py, z);
        const tint = ['#A8BCA0', '#7E907C', '#647462', '#4E5C50'][layer];
        if (at) k.stand(tree, at, { px: k.pxAt(-z) * (1.7 + rng.next() * 0.5), depth: 12, rows: [0, 18], flip: j % 2 === 1, tint });
      }
    }
  }
  // 枝の 後ろの 葉・枝・手前の 葉
  standPanel(k, leavesImg(false), -D0 - 0.5, 2);
  standPanel(k, branchImg(), -D0, 5);
  standPanel(k, leavesImg(true), -D0 + 0.35, 2, { emissive: 0.08 });
  // 実（切った 実は 2D の 絵で 落ちる：ここでは 消す）
  const mis: THREE.Mesh[] = [];
  for (let i = 0; i < 5; i++) {
    const r = EDA_MI[kk][i] === 'chiisai' ? 4 : EDA_MI[kk][i] === 'ue' ? 10 : 8;
    mis.push(standPanel(k, miImg(kk, i), -D0 + 0.15, Math.round(r * 1.3), { emissive: 0.22 }));
  }
  k.bag.mis = mis;
  // かご（下の まん中）と 中の 実
  const zk = -D0 + 1.2;
  const kx = W / 2 - 22;
  const a = k.atDepth(kx, H, zk)!;
  const b = k.atDepth(kx + 44, H - 12, zk)!;
  k.box(a.x, b.x, a.y, b.y, zk - 1.6, zk, { front: kagoImg(), top: kagoTopImg(), left: kagoImg(), right: kagoImg() });
  contact(k, new THREE.Vector3((a.x + b.x) / 2, a.y, zk - 0.8), (b.x - a.x) * 1.3, 2.4, 0.25);
  const balls: THREE.Mesh[] = [];
  const pz = k.pxAt(-zk + 0.8);
  for (let i = 0; i < 3; i++) {
    const at = k.atDepth(kx + 10 + i * 12, H - 12, zk - 0.8)!;
    balls.push(k.stand(greenBall(), new THREE.Vector3(at.x, b.y - 4 * pz, at.z), { px: pz, depth: 7 }));
  }
  k.bag.balls = balls;
  // 手前の ぼけた 葉（四すみ、実に かからない 所）
  if (tree) {
    for (const [px, py, f] of [[-20, 150, false], [W + 14, 150, true], [W + 20, 40, true]] as const) {
      const z = -6;
      const at = k.atDepth(px, py, z);
      if (at) k.stand(tree, at, { px: k.pxAt(-z) * 2.2, depth: 6, rows: [0, 18], flip: f, tint: '#6A8A6A', cast: false });
    }
  }
}

registerPanel3d('mikan_eda', {
  cam: { fov: 24, pitch: 0, pos: [0, 0, 0], far: 400 },
  light: 'noon',
  fog: [40, 120],
  shadow: { x: 0, z: -D0 - 4, hw: 20, hd: 14 },
  focus: 0.45,
  tilt: 0.8,
  build,
  update(k, _t, s) {
    const cut = Number(s.cut ?? -1);
    (k.bag.mis as THREE.Mesh[] | undefined)?.forEach((m, i) => (m.visible = i !== cut));
    const n = Number(s.inK ?? 0);
    (k.bag.balls as THREE.Mesh[] | undefined)?.forEach((m, i) => (m.visible = i < n));
    k.shadowDirty = true;
  },
});
