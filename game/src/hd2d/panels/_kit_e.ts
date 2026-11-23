// グループ e（大写し 40〜49：第3章の 水族館の うら・模型・船場・ふれあい・放送・焼き芋・磯・のぞき窓・
// みかん畑の 枝・水切り）で 使う 小さな 部品。共通の Kit（hd2d/panel3d.ts）に 無い 物だけ。
//
//  ・once()      絵を 1回 作って 使い回す
//  ・propImg()   フィールドの 小物の 絵（止まった 昼の 1枚：見本 miharashi.ts と 同じ）
//  ・c3Ground()  第3章の 地面の 絵（c3_ground C3_TEX）
//  ・pix() / gfxImg()  PixelCanvas か Gfx（パネルの 2D の 絵の 関数）で 描いた 絵
//  ・crop()      絵の 一部（部屋の 殻の 絵から 壁・床を 切り出す）
//  ・noonSky()   昼の 空（見本と 同じ 帯）
//  ・plane()     自分で 置く 板（半透明の ガラス・光の 帯・丸い 影）：向き・透明度つき
//  ・D0          1 パネル px が 1/16 単位に なる 奥行き（fov 24、絵の 高さ 112 → 16.5）

import * as THREE from 'three';
import { PixelCanvas, mix } from '../../engine/pixel';
import { Gfx } from '../../engine/gfx';
import { flag } from '../../game/state';
import { field } from '../../world/field';
import { getProp } from '../../art/props/registry';
import type { PropEnv } from '../../art/props/types';
import { C3_TEX, type C3Ground } from '../../art/tiles/c3_ground';
import type { Kit } from '../panel3d';

const cache = new Map<string, HTMLCanvasElement>();

/** 絵を 1回 作って 使い回す（key が 同じなら 同じ 絵）。 */
export function once(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = make()));
  return c;
}

/** 小物の 絵（止まった 昼の 1枚）。 */
export function propImg(id: string, opts: Record<string, unknown> = {}, stage = 1): HTMLCanvasElement | null {
  const key = `prop:${id}:${JSON.stringify(opts)}:${stage}`;
  const hit = cache.get(key);
  if (hit) return hit;
  const a = getProp(id, opts);
  if (!a) return null;
  const f = field();
  const env: PropEnv = {
    t: 0,
    stage,
    grade: f!.grade,
    motion: 0,
    mt: 0,
    flag: (k) => (k === 'flag_ch3_stage' ? stage : flag(k)),
    seed: 0,
    near: 999,
    px: 0,
    py: 0,
  };
  const img = a.img(env);
  if (img) cache.set(key, img);
  return img;
}

/** 第3章の 地面の 絵（フィールドと 同じ 模様）w × h ドット。 */
export function c3Ground(g: C3Ground, w: number, h: number): HTMLCanvasElement {
  return once(`g:${g}:${w}x${h}`, () => {
    const p = new PixelCanvas(w, h);
    const tex = C3_TEX[g];
    const ctx = { ground: () => g };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.set(x, y, tex(x, y, 0, ctx));
    return p.toCanvas();
  });
}

/** PixelCanvas で 描いた 絵。 */
export function pix(key: string, w: number, h: number, draw: (p: PixelCanvas) => void): HTMLCanvasElement {
  return once(key, () => {
    const p = new PixelCanvas(w, h);
    draw(p);
    return p.toCanvas();
  });
}

/** Gfx（パネルの 2D の 絵の 関数）で 描いた 絵（透明の 上に）。 */
export function gfxImg(key: string, w: number, h: number, draw: (g: Gfx) => void, keep = true): HTMLCanvasElement {
  const make = (): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;
    draw(new Gfx(ctx, w, h));
    return c;
  };
  return keep ? once(key, make) : make();
}

/** 絵の 一部を 切り出す。 */
export function crop(src: HTMLCanvasElement, x: number, y: number, w: number, h: number, key?: string): HTMLCanvasElement {
  const make = (): HTMLCanvasElement => {
    const c = document.createElement('canvas');
    c.width = w;
    c.height = h;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, x, y, w, h, 0, 0, w, h);
    return c;
  };
  return key ? once(key, make) : make();
}

/** 昼の 空：上が 濃く、水平線へ 白く（ドットの 帯、境目は ディザ。見本 miharashi.ts と 同じ）。 */
export function noonSky(stops: [number, string][] = [[0, '#78B4E0'], [0.12, '#8EC0E0'], [0.22, '#A8D0EA'], [0.3, '#C8E2F2'], [1, '#D8EAF4']], key = 'noon'): HTMLCanvasElement {
  return once(`sky:${key}`, () => {
    const H = 112;
    const p = new PixelCanvas(8, H);
    for (let y = 0; y < H; y++) {
      const v = y / H;
      let i = 0;
      while (i < stops.length - 2 && v > stops[i + 1][0]) i++;
      const [a, ca] = stops[i];
      const [b, cb] = stops[i + 1];
      const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
      for (let x = 0; x < 8; x++) {
        const q = Math.floor(t * 4 + ((x + y * 2) % 4) / 4 - 0.12) / 4;
        p.set(x, y, mix(ca, cb, Math.max(0, Math.min(1, q))));
      }
    }
    return p.toCanvas();
  });
}

/** 1 パネル px が 1/16 単位（フィールドの 1 ドット）に なる 奥行き（fov 24°、絵の 高さ 112px）。 */
export const D0 = 16.5;

export interface PlaneOpts {
  /** 'front'：カメラに 向く 縦の 板（既定）、'floor'：上を 向く 床の 板。 */
  face?: 'front' | 'floor';
  opacity?: number;
  unlit?: boolean;
  tint?: string;
  /** 加算（光の 帯・湯気の 光）。 */
  add?: boolean;
  /** 深さを 書かない（後ろの 物を 隠さない）。既定：opacity < 1 なら true。 */
  depthWrite?: boolean;
  cast?: boolean;
  receive?: boolean;
  repeat?: [number, number];
  order?: number;
}

/** 板を 置く（中心 at、幅 w × 高さ h 単位）。半透明・加算も（Kit.quad は 1枚の アトラスで 不透明だけ）。 */
export function plane(k: Kit, img: HTMLCanvasElement | null, at: THREE.Vector3, w: number, h: number, o: PlaneOpts = {}): THREE.Mesh {
  const op = o.opacity ?? 1;
  let map: THREE.Texture | null = null;
  if (img) {
    map = k.tex(img, !!o.repeat);
    if (o.repeat) {
      map = k.own(map.clone());
      map.needsUpdate = true;
      map.repeat.set(o.repeat[0], o.repeat[1]);
    }
  }
  const color = new THREE.Color(o.tint ?? '#ffffff');
  const trans = op < 1 || !!o.add;
  const common = {
    map,
    color,
    transparent: trans,
    opacity: op,
    alphaTest: trans ? 0.01 : 0.5,
    depthWrite: o.depthWrite ?? !trans,
    side: THREE.DoubleSide,
    blending: o.add ? THREE.AdditiveBlending : THREE.NormalBlending,
  };
  const m = k.own(o.unlit || o.add ? new THREE.MeshBasicMaterial(common) : new THREE.MeshLambertMaterial(common));
  const g = k.own(new THREE.PlaneGeometry(w, h));
  if (o.face === 'floor') g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(at);
  mesh.castShadow = o.cast ?? false;
  mesh.receiveShadow = o.receive ?? !(o.unlit || o.add);
  if (o.order !== undefined) mesh.renderOrder = o.order;
  k.scene.add(mesh);
  return mesh;
}

/** 足もとの 丸い 影（フィールドの 人物・小物の 足もとの 影）。 */
export function contact(k: Kit, at: THREE.Vector3, w: number, d: number, opacity = 0.3): THREE.Mesh {
  const img = once('contact', () => {
    const p = new PixelCanvas(24, 8);
    p.ellipse(12, 4, 11, 3, '#1E2A2A');
    return p.toCanvas();
  });
  return plane(k, img, new THREE.Vector3(at.x, at.y + 0.01, at.z), w, d, { face: 'floor', opacity, unlit: true });
}

/** 色を 混ぜる（mix の 別名：ここで まとめて import できる ように）。 */
export { mix };
