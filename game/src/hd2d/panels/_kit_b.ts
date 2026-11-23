// 大写しの HD-2D（グループ b：第2章の 星見台の 大写し）で 使い回す 小さな 部品。
// 共通の Kit（hd2d/panel3d.ts）に ない 物だけ：
//   once()      絵を 1回 作って 使い回す
//   paint()     2D の 描き方（Gfx：パネルの 2D の 絵の 関数）で キャンバスに 描く → stand() で 立てる
//   lamp()      点の 光（トマトの 灯り・ランプ・かまどの 火）。光の 数は 開いた とき 決める（あとで 足さない）
//   fade()      メッシュの 透明度（灯りの 当たった 所だけ 見える 物など）
//   flat()      床・机に 寝かせた 絵（皿・敷き物：上から 見た 1枚）
//   NIGHT_LAMP  星見台の 夜（トマトの 灯り）：月の 青い 光は 弱く、灯りの 点の 光が 主役

import * as THREE from 'three';
import { Gfx } from '../../engine/gfx';
import { makeCanvas, PixelCanvas } from '../../engine/pixel';
import { getProp } from '../../art/props/registry';
import type { PropEnv } from '../../art/props/types';
import { H_TEX, type HGround } from '../../art/tiles/hoshi_ground';
import { field } from '../../world/field';
import { h01, mulberry, valueNoise } from '../../art/tiles/noise';
import type { Kit, PanelLight } from '../panel3d';

const cache = new Map<string, HTMLCanvasElement>();

/** 絵を 1回 作って 使い回す（key が 同じなら 同じ キャンバス）。 */
export function once(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = make()));
  return c;
}

/** w × h の キャンバスに 2D の 描き方（Gfx）で 描く（半透明の ドットは stand() の 型で 抜ける）。 */
export function paint(w: number, h: number, fn: (g: Gfx) => void): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(w, h);
  fn(new Gfx(ctx, w, h));
  return c;
}

/** 点の 光（distance 単位、decay 1.6：フィールドの ランプと 同じ）。 */
export function lamp(k: Kit, color: string, intensity: number, at: THREE.Vector3, distance = 0, decay = 1.6): THREE.PointLight {
  const l = new THREE.PointLight(color, intensity, distance, decay);
  l.position.copy(at);
  k.scene.add(l);
  return l;
}

/** メッシュの 透明度（0 で 見えない）。 */
export function fade(m: THREE.Mesh, a: number): void {
  const mat = m.material as THREE.Material & { opacity: number };
  const on = a < 0.999;
  if (mat.transparent !== on) {
    mat.transparent = on;
    mat.alphaTest = on ? 0.02 : 0.5;
    mat.needsUpdate = true;
  }
  mat.opacity = Math.max(0, Math.min(1, a));
  m.visible = a > 0.01;
}

/** 床・机に 寝かせた 絵（中心 at、幅 w、奥行き d）。 */
export function flat(k: Kit, img: HTMLCanvasElement, at: THREE.Vector3, w: number, d: number, o: { unlit?: boolean; tint?: string } = {}): THREE.Mesh {
  const g = k.own(new THREE.PlaneGeometry(w, d));
  g.rotateX(-Math.PI / 2);
  const m = new THREE.Mesh(g, k.material(k.tex(img), { unlit: o.unlit, tint: o.tint }));
  m.position.copy(at);
  m.receiveShadow = true;
  k.scene.add(m);
  return m;
}

/** 星見台の 夜（トマトの 灯り）：月の 青い 光は 弱く、空の 光も 暗い。灯りは lamp() で。 */
export const NIGHT_LAMP: PanelLight = { sun: '#9fb4ff', sky: '#5a6aa0', ground: '#2a2a40', fog: '#141a2a', sunI: 0.3, hemiI: 0.45, el: 55, az: 200 };

/** 部屋の 夜（集会所・土間：ランプの 明かり）。 */
export const ROOM_LAMP: PanelLight = { sun: '#ffe0b8', sky: '#c8b8a0', ground: '#6a5040', fog: '#1e1612', sunI: 0.5, hemiI: 0.8, el: 70, az: 20 };

/** 小物の 絵（止まった 1枚：フィールドの 小物と 同じ 絵）。flags：絵が 見る flag の 値（ない 物は 0）。 */
export function propImg(id: string, opts: Record<string, unknown> = {}, flags: Record<string, number> = {}): HTMLCanvasElement | null {
  const a = getProp(id, opts);
  if (!a) return null;
  const f = field();
  if (!f) return null;
  const env: PropEnv = { t: 0, stage: 1, grade: f.grade, motion: 0, mt: 0, flag: (k) => flags[k] ?? 0, seed: 0, near: 999, px: 0, py: 0 };
  return a.img(env);
}

/** 第2章の 地面の 絵（フィールドと 同じ 模様）w × h ドット。 */
export function hGroundImg(g: HGround, w: number, h: number): HTMLCanvasElement {
  return once(`hg:${g}:${w}x${h}`, () => {
    const p = new PixelCanvas(w, h);
    const tex = H_TEX[g];
    const ctx = { ground: () => g };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.set(x, y, tex(x, y, 0, ctx));
    return p.toCanvas();
  });
}

/** 0..1 の なめらかな ゆらぎ（大きさ s ドット）。 */
export function soft(x: number, y: number, s: number, seed: number): number {
  return valueNoise(x / s, y / s, seed) * 0.65 + valueNoise((x * 2.3) / s, (y * 2.3) / s, seed + 7) * 0.35;
}
/** 0..1 の ドットごとの ばらつき。 */
export const grain = (x: number, y: number, seed: number): number => h01(x, y, seed);

/** パレット（暗い → 明るい）から 0..1 で 選ぶ。 */
export function ramp(pal: string[], v: number): string {
  return pal[Math.max(0, Math.min(pal.length - 1, Math.floor(v * pal.length)))];
}

/** ひび（ランダムに 曲がる 細い 線、下の ふちに 明るい 欠け）。 */
export function crack(p: PixelCanvas, x: number, y: number, len: number, dir: number, seed: number, dark: string, lip: string): void {
  const rng = mulberry(seed);
  let cx = x;
  let cy = y;
  for (let i = 0; i < len; i++) {
    if (p.alpha(cx, cy) > 0) p.set(cx, cy, dark);
    if (p.alpha(cx, cy + 1) > 0 && rng() < 0.5) p.set(cx, cy + 1, lip);
    cx += dir;
    const r = rng();
    if (r < 0.3) cy--;
    else if (r > 0.72) cy++;
    if (rng() < 0.06) {
      crack(p, cx, cy, Math.floor(len / 3), dir, seed + i, dark, lip);
    }
  }
}
