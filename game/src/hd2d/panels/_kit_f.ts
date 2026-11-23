// 大写しの HD-2D（グループ f：第3章 50〜59）で 使い回す 小さな 部品（2026-11-23）。
// 共通の Kit（hd2d/panel3d.ts）には 手を 入れず、足りない 物だけ ここに：
//   once()      絵を 1回 作って 使い回す
//   propImg()   小物の 絵（止まった 昼の 1枚：見本 miharashi.ts と 同じ）
//   groundImg() 第3章の 地面の 絵（c3_ground C3_TEX：フィールドと 同じ 模様）
//   pix()/paint()  PixelCanvas / Gfx で 描いた 絵（パネルの 2D の 描き方を そのまま 使える）
//   bandSky()   縦の 帯の 空・水（ドットの 帯、ベイヤーの ディザ）
//   flat()      絵を 地面に 寝かせて 置く（上から 見る 大写し：貝・羽・魚の 背）
//   blob()      うすい 丸い 影（足もとの 影）
//   glassy()    すける 面（水面・水の 膜）
//   lathe()     回した 形（なべ・どんぶり・ボール）

import * as THREE from 'three';
import { Gfx } from '../../engine/gfx';
import { PixelCanvas, mix } from '../../engine/pixel';
import { flag } from '../../game/state';
import { field } from '../../world/field';
import { getProp } from '../../art/props/registry';
import type { PropEnv } from '../../art/props/types';
import { C3_TEX, type C3Ground } from '../../art/tiles/c3_ground';
import type { Kit, PanelLight, StandOpts } from '../panel3d';

const cache = new Map<string, HTMLCanvasElement>();

export function once(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = make()));
  return c;
}

/** 小物の 絵（止まった 昼の 1枚）。 */
export function propImg(id: string, opts: Record<string, unknown> = {}, stage = 1): HTMLCanvasElement | null {
  const a = getProp(id, opts);
  if (!a) return null;
  const f = field();
  const env: PropEnv = { t: 0, stage, grade: f!.grade, motion: 0, mt: 0, flag: (k) => (k === 'flag_ch3_stage' ? stage : flag(k)), seed: 0, near: 999, px: 0, py: 0 };
  return a.img(env);
}

/** 第3章の 地面の 絵 w × h ドット。 */
export function groundImg(g: C3Ground, w: number, h: number): HTMLCanvasElement {
  return once(`g:${g}:${w}x${h}`, () => {
    const p = new PixelCanvas(w, h);
    const tex = C3_TEX[g];
    const ctx = { ground: () => g };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.set(x, y, tex(x, y, 0, ctx));
    return p.toCanvas();
  });
}

export function pix(key: string, w: number, h: number, fn: (p: PixelCanvas) => void): HTMLCanvasElement {
  return once(key, () => {
    const p = new PixelCanvas(w, h);
    fn(p);
    return p.toCanvas();
  });
}

/** 2D の Gfx で 描く（パネルの 絵の 関数を そのまま 使って、立体の 材料に）。 */
export function paint(key: string, w: number, h: number, fn: (g: Gfx) => void): HTMLCanvasElement {
  return once(key, () => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    fn(new Gfx(ctx, w, h));
    return c;
  });
}

/** 縦の 帯（上 0 → 下 1 の 色の 段、境目は ベイヤーの ディザ）。 */
export function bandSky(key: string, stops: [number, string][], H = 112, steps = 4): HTMLCanvasElement {
  return pix(`band:${key}`, 8, H, (p) => {
    for (let y = 0; y < H; y++) {
      const v = y / H;
      let i = 0;
      while (i < stops.length - 2 && v > stops[i + 1][0]) i++;
      const [a, ca] = stops[i];
      const [b, cb] = stops[i + 1];
      const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
      for (let x = 0; x < 8; x++) {
        const q = Math.floor(t * steps + ((x + y * 2) % 4) / 4 - 0.12) / steps;
        p.set(x, y, mix(ca, cb, Math.max(0, Math.min(1, q))));
      }
    }
  });
}

/**
 * 絵を 地面（高さ at.y）に 寝かせる：絵の 上が 奥（-Z）、絵の まん中が at。ドットは 上へ `depth` 押し出す
 * （真上・ななめ上から 見る 大写しの 貝・羽・魚の 背）。`down`：下から 見上げる 絵（水面の 下の 腹）。
 */
export function flat(k: Kit, img: HTMLCanvasElement, at: THREE.Vector3, o: StandOpts & { down?: boolean } = {}): THREE.Mesh {
  const px = o.px ?? 1 / 16;
  const depth = o.depth ?? 2;
  const rows = o.rows ?? [0, img.height];
  const h = (rows[1] - rows[0]) * px;
  const m = k.stand(img, new THREE.Vector3(at.x, at.y, at.z), { ...o, px, depth });
  if (o.down) {
    // 下から 見る：絵の 上が 奥のまま、面は 下（-Y）を 向く
    m.rotation.x = Math.PI / 2;
    m.position.set(m.position.x, at.y - depth * px, at.z - h / 2);
  } else {
    m.rotation.x = -Math.PI / 2;
    m.position.set(m.position.x, at.y + depth * px, at.z + h / 2);
  }
  return m;
}

/** 足もとの うすい 丸い 影（光を 受けない、深さを 書かない）。 */
export function blob(k: Kit, x: number, y: number, z: number, w: number, d: number, opacity = 0.28, color = '#1E2A2A'): THREE.Mesh {
  const img = pix(`blob:${color}`, 24, 12, (p) => p.ellipse(12, 6, 11, 5, color));
  const m = k.material(k.tex(img), { unlit: true }) as THREE.MeshBasicMaterial;
  m.transparent = true;
  m.opacity = opacity;
  m.alphaTest = 0.01;
  m.depthWrite = false;
  const g = k.own(new THREE.PlaneGeometry(w, d));
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x, y + 0.01, z);
  mesh.renderOrder = 1;
  k.scene.add(mesh);
  return mesh;
}

/** すける 面（水面・水の 膜）：x0..x1 × z0..z1、高さ y。`texels` で くり返す 絵（無ければ 色だけ）。 */
export function glassy(
  k: Kit,
  img: HTMLCanvasElement | null,
  x0: number,
  x1: number,
  z0: number,
  z1: number,
  y: number,
  o: { texels?: number; color?: string; opacity?: number; unlit?: boolean; side?: THREE.Side; emissive?: string } = {},
): THREE.Mesh {
  let map: THREE.Texture | null = null;
  if (img) {
    map = k.tex(img, true).clone();
    map.needsUpdate = true;
    const tx = o.texels ?? 16;
    map.repeat.set(((x1 - x0) * tx) / img.width, ((z1 - z0) * tx) / img.height);
    k.own(map);
  }
  const p = { map, color: new THREE.Color(o.color ?? '#ffffff'), transparent: true, opacity: o.opacity ?? 0.6, depthWrite: false, side: o.side ?? THREE.FrontSide };
  const m = k.own(o.unlit ? new THREE.MeshBasicMaterial(p) : new THREE.MeshLambertMaterial({ ...p, ...(o.emissive ? { emissive: new THREE.Color(o.emissive) } : {}) }));
  const g = k.own(new THREE.PlaneGeometry(x1 - x0, z1 - z0));
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set((x0 + x1) / 2, y, (z0 + z1) / 2);
  mesh.receiveShadow = !o.unlit;
  mesh.renderOrder = 2;
  k.scene.add(mesh);
  return mesh;
}

/** 回した 形（なべ・どんぶり）：輪郭 [半径, 高さ] を 下から。色は 帯の 絵（img の 縦が 輪郭に 沿う）か 色。 */
export function lathe(k: Kit, prof: [number, number][], at: THREE.Vector3, o: { img?: HTMLCanvasElement; color?: string; seg?: number; unlit?: boolean } = {}): THREE.Mesh {
  const g = k.own(new THREE.LatheGeometry(prof.map(([r, h]) => new THREE.Vector2(r, h)), o.seg ?? 28));
  const m = k.material(o.img ? k.tex(o.img) : null, { tint: o.color, side: THREE.DoubleSide, unlit: o.unlit });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(at);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  k.scene.add(mesh);
  return mesh;
}

/** 平らな 円（なべの 中の 豆乳・どんぶりの 底）。 */
export function disc(k: Kit, r: number, at: THREE.Vector3, o: { img?: HTMLCanvasElement; color?: string; unlit?: boolean; seg?: number } = {}): THREE.Mesh {
  const g = k.own(new THREE.CircleGeometry(r, o.seg ?? 32));
  g.rotateX(-Math.PI / 2);
  const m = k.material(o.img ? k.tex(o.img) : null, { tint: o.color, unlit: o.unlit });
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(at);
  mesh.receiveShadow = true;
  k.scene.add(mesh);
  return mesh;
}

/** 水の 中の 光（明るい 水色、上から の 光。霧は 水の 色）。 */
export const UNDERWATER: PanelLight = { sun: '#e8f6ff', sky: '#a8dcf0', ground: '#2a5a72', fog: '#3C7694', sunI: 1.7, hemiI: 1.8, el: 72, az: 160 };

/** 昼の 空（見本 miharashi.ts と 同じ 色：上が 濃く、水平線へ 白く）。 */
export function noonSky(): HTMLCanvasElement {
  return bandSky('noon', [[0, '#78B4E0'], [0.12, '#8EC0E0'], [0.22, '#A8D0EA'], [0.3, '#C8E2F2'], [1, '#D8EAF4']]);
}

/** 昼の 海（第3章の 海の 色）。`nami`：12:01 から 波が もどった 海（白い 波頭）。 */
export function noonSea(nami: boolean): HTMLCanvasElement {
  return pix(`sea:${nami}`, 64, 32, (p) => {
    let s = nami ? 77 : 71;
    const rnd = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 64; x++) {
        const n = rnd();
        const dk = nami ? 0.08 : 0.03;
        const lt = nami ? 0.9 : 0.96;
        p.set(x, y, n < dk ? '#2A5A82' : n > lt ? mix('#3A7EA8', '#5AA0C8', 0.6) : mix('#3A7EA8', '#5AA0C8', 0.35));
      }
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
  });
}

/** 消波ブロック（テトラポッド）：4本の 足（コンクリート）。中心 at、足の 長さ len。 */
export function tetrapod(k: Kit, at: THREE.Vector3, len: number, rotY = 0): THREE.Group {
  const img = groundImg('c3_bouhatei', 16, 16);
  const m = k.material(k.tex(img));
  const geo = k.own(new THREE.CylinderGeometry(len * 0.22, len * 0.36, len, 8));
  geo.translate(0, len / 2, 0);
  const grp = new THREE.Group();
  const dirs = [
    [0, 1, 0],
    [0.943, -0.333, 0],
    [-0.471, -0.333, 0.816],
    [-0.471, -0.333, -0.816],
  ];
  for (const d of dirs) {
    const leg = new THREE.Mesh(geo, m);
    leg.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(d[0], d[1], d[2]));
    leg.castShadow = leg.receiveShadow = true;
    grp.add(leg);
  }
  grp.position.copy(at);
  grp.rotation.y = rotY;
  k.scene.add(grp);
  return grp;
}
