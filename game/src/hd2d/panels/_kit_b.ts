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
import { makeCanvas } from '../../engine/pixel';
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
