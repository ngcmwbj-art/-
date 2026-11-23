// 小窓「うり坊を 数える」（第2章 夜の 足あと帳、events/ch2/uribo.ts UriboPanel）を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：電気柵の 内側から 低く した トマトの 灯りで 北を 見る。夜空と 星
// （段階2 は 地平に 紫の すじ）、杉の 山、耕作放棄地の クズの やぶ（右に けものみちの 口）、踏まれた 土、
// 手前の 草と 電気柵（支柱・がいし・2段の 線）。親の イノシシと うり坊 5ひきが 土の 上を 歩く。
// 灯りは ほんとうの 光（スポットライト）：輪の 中だけ 色が 見え、外は 黒い 影。親子の 絵は 2D と 同じ
// （灯りの 中は 色、外は 影の 絵：boarPix / uriboImg の lit）。灯りの 右の はし（数える 所）は 2D の EDGE_X に 合わせる。
// 数える 印・鼻息・放送の 声・数の 字は 2D の まま 上に 重ねる。
//
// 親子の 位置は パネルの 状態（state の m・k：x・奥へ・こま・見え方・向き）から 毎回 置く（Kit.ground）。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { Rng, valueNoise } from '../../engine/rng';
import { UB_GROUND_Y, UB_H, UB_LIGHT, UB_POSTS, UB_W, UB_WIRES, boarPix, lowLantern, uriboImg } from '../../art/props/ashiato_art';
import { registerPanel3d, type Kit, type PanelLight } from '../panel3d';
import { hGroundImg, noFog, pix, plate, rectAt } from './_kit_d';

const W = UB_W;
const H = UB_H;
const EDGE_X = UB_LIGHT.x + UB_LIGHT.rx;

/** 夜（灯りの 外は ほとんど 見えない：月の ない 夜の 空あかり）。 */
const LIGHT: PanelLight = { sun: '#8a90c8', sky: '#5a6090', ground: '#2a2430', fog: '#0e0e18', sunI: 0.25, hemiI: 0.95, el: 40, az: 160 };

function skyImg(stage: number): HTMLCanvasElement {
  return pix(`ub:sky${stage}`, W, H, (p) => {
    for (let y = 0; y < H; y++) {
      const k = Math.min(1, y / 40);
      const c = stage >= 2 && y > 14 && y < 40 ? mix('#2A2440', '#3A2B5C', Math.min(1, (y - 14) / 10)) : mix('#0B0B14', '#1B1733', k);
      p.hline(0, W - 1, y, c);
    }
    const rng = new Rng(701);
    for (let i = 0; i < 26; i++) p.set(Math.floor(rng.next() * W), Math.floor(rng.next() * 22), i % 5 ? '#8E88B8' : '#FFF6D8');
  });
}

/** 杉の 山（遠く：灯りは とどかない 影）。 */
function mountainImg(): HTMLCanvasElement {
  return pix('ub:mt', W * 2, 80, (p) => {
    for (let x = 0; x < W * 2; x++) {
      const X = x / 2;
      const top = Math.round(2 * (Math.round(valueNoise(X / 40, 0.5, 703) * 12 + valueNoise(X / 9, 1.5, 704) * 3)));
      const tip = (x >> 1) % 7 === 3 ? 3 : (x >> 1) % 7 === 2 || (x >> 1) % 7 === 4 ? 1 : 0;
      for (let y = Math.max(0, top - tip); y < 80; y++) p.set(x, y, y <= top - tip + 1 ? '#2A2E44' : valueNoise(x / 3, y / 3, 705) < 0.3 ? '#20243A' : '#181C2E');
    }
  });
}

/** クズの かたまり（大きな 葉、上の ふちは でこぼこ）：v で 形を 変える。low：けものみちの 口の 低い ところ。 */
function kuzuImg(v: number, low = false): HTMLCanvasElement {
  const w = 64;
  const h = low ? 20 : 40;
  return pix(`ub:kuzu${v}:${low}`, w, h, (p) => {
    const rng = new Rng(800 + v * 7 + (low ? 3 : 0));
    // the ragged rounded top
    for (let x = 0; x < w; x++) {
      const edge = Math.min(x, w - 1 - x);
      const round = edge < 10 ? Math.round((10 - edge) * (10 - edge) / 9) : 0;
      const top = Math.round(2 + valueNoise(x / 9, v + 0.5, 806) * 8 + round);
      for (let y = top; y < h; y++) {
        const n = valueNoise(x / 4 + v * 13, y / 3.5, 807);
        p.set(x, y, n > 0.62 ? '#5E8A4A' : n > 0.4 ? '#3F6A3A' : '#2E5233');
      }
      if (top < h) p.set(x, top, '#8AB060');
    }
    // big three-part leaves catching the light (lighter blobs with a dark vein)
    for (let i = 0; i < 9; i++) {
      const cx = 4 + rng.next() * (w - 8);
      const cy = 6 + rng.next() * (h - 10);
      if (!(p.get(Math.round(cx), Math.round(cy - 3)) >>> 24)) continue;
      p.ellipse(cx, cy, 3.2, 2.4, '#6E9A52');
      p.set(Math.round(cx), Math.round(cy) - 1, '#8AB060');
      p.line(Math.round(cx), Math.round(cy), Math.round(cx), Math.round(cy + 2), '#2E5233');
    }
  });
}

/** 電気柵の 支柱（細い 鉄の 棒、がいしは 白い 小さな 箱）。 */
function postImg(): HTMLCanvasElement {
  return pix('ub:post', 3, 34, (p) => {
    p.vline(0, 0, 33, '#B8B0A0');
    p.vline(1, 0, 33, '#8A8478');
    p.vline(2, 0, 33, '#5A564E');
    for (const wy of UB_WIRES) {
      const y = wy - 72;
      p.set(1, y, '#E8E4D8');
    }
  });
}
function insulatorImg(): HTMLCanvasElement {
  return pix('ub:gaishi', 3, 3, (p) => {
    p.fill('#E8E4D8');
    p.set(2, 2, '#A8A498');
  });
}
function wireImg(): HTMLCanvasElement {
  return pix('ub:wire', 8, 1, (p) => {
    p.fill('#C8C2B4');
    p.set(0, 0, '#FFF6D8');
  });
}

function buildBack(k: Kit, stage: number): void {
  k.sky(skyImg(stage));
  const r = rectAt(k, -8, 12, W + 8, 72, -60);
  noFog(plate(k, mountainImg(), r.x0, r.y0, r.w, r.h, -60, { unlit: true, fog: false }));
}

function buildGround(k: Kit): void {
  // the trodden earth beyond the fence and the abandoned field's floor under the kuzu
  const far = k.ground(0, 70, 0)!;
  k.tiled(hGroundImg('h_yamamichi', 64, 64), -30, 30, far.z - 6, -5.6, 0, 18);
  // the grass inside the fence (near side)
  k.tiled(hGroundImg('h_urayama', 64, 64), -30, 30, -5.6, 1, 0.002, 18);
  // the kuzu thicket: clumps in three rows, lower where the animal path comes out (x ≈ 278)
  const rng = new Rng(4219);
  for (let row = 0; row < 3; row++) {
    for (let x = -30 + row * 14; x < W + 40; x += 30 + rng.next() * 10) {
      const path = Math.max(0, 1 - Math.abs(x - 278) / 22);
      const at = k.ground(x, 83 - row * 1.6, 0);
      if (!at) continue;
      at.z -= 0.25 + row * 0.7 + rng.next() * 0.3;
      if (path > 0.4 && row === 0) continue;
      const low = path > 0.2;
      const s = k.pxAt(-at.z) * (0.85 + rng.next() * 0.25 + row * 0.12);
      k.stand(kuzuImg(Math.floor(rng.next() * 5), low), at, { px: s, depth: 10, cast: false, flip: rng.next() < 0.5 });
    }
  }
}

function buildFence(k: Kit): void {
  // posts on the near side (2D: posts at UB_POSTS, from row 72 to 105)
  const z = k.ground(W / 2, 105, 0)!.z;
  const pz = k.pxAt(-z);
  for (const x of UB_POSTS) {
    const at = k.atDepth(x, 105, z)!;
    at.y = 0;
    k.stand(postImg(), at, { px: pz, depth: 2, cast: true });
    for (const wy of UB_WIRES) {
      const a = k.atDepth(x + 2, wy, z)!;
      k.box(a.x - pz * 0.5, a.x + pz * 2.5, a.y - pz * 1.5, a.y + pz * 1.5, z - pz * 1.5, z + pz * 1.5, { front: insulatorImg(), top: insulatorImg(), left: insulatorImg(), right: insulatorImg() });
    }
  }
  // the two wires, sagging a little between the posts
  for (const wy of UB_WIRES)
    for (let i = 0; i < UB_POSTS.length - 1; i++) {
      const a = UB_POSTS[i];
      const b = UB_POSTS[i + 1];
      const n = 8;
      for (let s = 0; s < n; s++) {
        const xa = a + ((b - a) * s) / n;
        const xb = a + ((b - a) * (s + 1)) / n;
        const ya = wy + Math.sin((s / n) * Math.PI) * 1.4;
        const yb = wy + Math.sin(((s + 1) / n) * Math.PI) * 1.4;
        const p0 = k.atDepth(xa, ya, z)!;
        const p1 = k.atDepth(xb, yb, z)!;
        const t = pz * 0.6;
        k.quad(wireImg(), [p0.x, p0.y - t, z], [p1.x, p1.y - t, z], [p1.x, p1.y + t, z], [p0.x, p0.y + t, z]);
      }
    }
  // the outer posts reach past the picture's edges a little: wires out to them
  for (const wy of UB_WIRES) {
    const p0 = k.atDepth(-20, wy, z)!;
    const p1 = k.atDepth(UB_POSTS[0], wy, z)!;
    const p2 = k.atDepth(UB_POSTS[UB_POSTS.length - 1], wy, z)!;
    const p3 = k.atDepth(W + 20, wy, z)!;
    const t = pz * 0.6;
    k.quad(wireImg(), [p0.x, p0.y - t, z], [p1.x, p1.y - t, z], [p1.x, p1.y + t, z], [p0.x, p0.y + t, z]);
    k.quad(wireImg(), [p2.x, p2.y - t, z], [p3.x, p3.y - t, z], [p3.x, p3.y + t, z], [p2.x, p2.y + t, z]);
  }
}

/** トマトの 灯り：低く 持った 実と、輪を 照らす スポットライト（右の はしが 2D の EDGE_X）。 */
function buildLamp(k: Kit): void {
  const lampAt = k.atDepth(UB_LIGHT.x, H - 7, -2.2)!;
  const fruit = k.stand(lowLantern(), lampAt.clone().setY(lampAt.y - k.pxAt(2.2) * 6), { px: k.pxAt(2.2), depth: 4, emissive: 1.1, cast: false, unlit: true });
  fruit.renderOrder = 2;
  // the light: from a little above the fruit, aimed at the walking line under the light's middle
  // (held low, but the light falls mostly on the ground: from over the fruit, down onto the walking line —
  //  the kuzu behind them gets only its foot lit, as in 2D's ring)
  const target = k.ground(UB_LIGHT.x, UB_GROUND_Y + 2, 0)!;
  const from = new THREE.Vector3(target.x, 2.4, target.z + 2.6);
  const edge = k.ground(EDGE_X, UB_GROUND_Y, 0)!;
  const a = target.clone().sub(from).normalize();
  const b = edge.clone().sub(from).normalize();
  const ang = Math.acos(a.dot(b));
  const spot = new THREE.SpotLight('#ffd0a0', 15, 10, ang * 1.06, 0.18, 1.2);
  spot.position.copy(from);
  spot.target.position.copy(target);
  spot.castShadow = true;
  spot.shadow.mapSize.set(k.quality === 'normal' ? 1024 : 512, k.quality === 'normal' ? 1024 : 512);
  spot.shadow.bias = -0.0008;
  spot.shadow.camera.near = 0.2;
  spot.shadow.camera.far = 40;
  k.scene.add(spot, spot.target);
  k.bag.spot = spot;
  k.bag.ang = ang * 1.06;
  // the warm glow round the fruit itself (lights the grass at its foot)
  const glow = new THREE.PointLight('#ff9a60', 1.2, 2.2, 2);
  glow.position.copy(lampAt).add(new THREE.Vector3(0, 0.15, -0.2));
  k.scene.add(glow);
}

// ---------------------------------------------------------------- 親子（毎回 状態から）

type W5 = [number, number, number, number, number];

interface Slot {
  meshes: Map<string, THREE.Mesh>;
}

function walkerMesh(k: Kit, slot: Slot, key: string, img: HTMLCanvasElement, px: number): THREE.Mesh {
  let m = slot.meshes.get(key);
  if (!m) {
    m = k.stand(img, new THREE.Vector3(0, 0, 0), { px, depth: 3, unlit: true, cast: true });
    const mat = m.material as THREE.MeshBasicMaterial;
    mat.transparent = true;
    mat.alphaTest = 0.3;
    m.userData.w = img.width;
    slot.meshes.set(key, m);
  }
  return m;
}

function placeWalkers(k: Kit, s: Record<string, unknown>): void {
  const slots = (k.bag.slots ??= Array.from({ length: 6 }, () => ({ meshes: new Map() }))) as Slot[];
  const list: [W5, boolean][] = [[s.m as W5, true], ...((s.k as W5[]) ?? []).map((w) => [w, false] as [W5, boolean])];
  const z0 = k.ground(W / 2, UB_GROUND_Y, 0)!.z;
  const px = k.pxAt(-z0);
  list.forEach(([w, mother], i) => {
    const slot = slots[i];
    for (const m of slot.meshes.values()) m.visible = false;
    if (!w) return;
    const [x, back, f, alpha, face] = w;
    if (alpha <= 0) return;
    const lit = Math.abs(x - UB_LIGHT.x) < UB_LIGHT.rx && back < 0.4;
    const turned = mother && !!s.turned;
    const img = mother ? boarPix(f, lit, turned) : uriboImg(lit, f, !!s.ears);
    const key = mother ? `b${f}${lit}${turned}` : `u${f}${lit}${!!s.ears}`;
    const m = walkerMesh(k, slot, key, img, px);
    const up = back * 18;
    const at = k.ground(x, UB_GROUND_Y - up + (mother ? 1 : 0), 0);
    if (!at) return;
    const flip = face > 0 && !turned;
    const ww = img.width;
    m.scale.set(flip ? -px : px, px, px);
    m.position.set(at.x - (flip ? -ww / 2 : ww / 2) * px, 0, at.z - i * 0.002);
    (m.material as THREE.MeshBasicMaterial).opacity = alpha * (lit ? 1 : 0.85);
    m.visible = true;
  });
}

registerPanel3d('uribo', {
  cam: { fov: 28, pitch: 3.2, pos: [0, 1.3, 0], far: 200, near: 0.2 },
  light: LIGHT,
  fog: [9, 40],
  shadow: null,
  focus: 0.76,
  tilt: 1.0,
  grade: () => null,
  animated: true,
  fps: 30,
  build(k, s) {
    buildBack(k, Number(s.st) || 1);
    buildGround(k);
    buildFence(k);
    buildLamp(k);
    placeWalkers(k, s);
  },
  update(k, t, s) {
    // the light breathes (2D：sin(t / 220) × 1.5 px)
    const spot = k.bag.spot as THREE.SpotLight | undefined;
    if (spot) spot.angle = (k.bag.ang as number) * (1 + Math.sin(t / 220) * 0.012);
    placeWalkers(k, s);
    k.shadowDirty = true;
  },
});
