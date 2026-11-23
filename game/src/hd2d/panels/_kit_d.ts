// 大写しの HD-2D（グループ d）で 使い回す 小さな 道具：絵の 使い回し・小物の 絵・地面の 絵・
// 足もとの 影・光を 受けない 板・霧の かからない 物。（共通の Kit に 無い 物だけ。hd2d/panel3d.ts は さわらない）

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { flag } from '../../game/state';
import { field } from '../../world/field';
import { getProp } from '../../art/props/registry';
import type { PropEnv } from '../../art/props/types';
import { H_TEX, type HGround } from '../../art/tiles/hoshi_ground';
import type { Kit } from '../panel3d';

const cache = new Map<string, HTMLCanvasElement>();
/** 絵を 1回 作って 使い回す。 */
export function once(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = make()));
  return c;
}

/** 小物の 絵（止まった 1枚）。`flags`：絵が 見る flag を 上書き。 */
export function propImg(id: string, opts: Record<string, unknown> = {}, o: { stage?: number; near?: number; flags?: Record<string, number> } = {}): HTMLCanvasElement | null {
  const a = getProp(id, opts);
  if (!a) return null;
  const f = field();
  const env: PropEnv = {
    t: 0,
    stage: o.stage ?? 1,
    grade: f!.grade,
    motion: 0,
    mt: 0,
    flag: (k) => (o.flags && k in o.flags ? o.flags[k] : flag(k)),
    seed: 0,
    near: o.near ?? 999,
    px: 0,
    py: 0,
  };
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

/** PixelCanvas を 作って 描いて 1回だけ。 */
export function pix(key: string, w: number, h: number, paint: (p: PixelCanvas) => void): HTMLCanvasElement {
  return once(key, () => {
    const p = new PixelCanvas(w, h);
    paint(p);
    return p.toCanvas();
  });
}

/** 霧を かけない（遠くの 尾根・空の 物）。 */
export function noFog(m: THREE.Mesh): THREE.Mesh {
  (m.material as THREE.Material & { fog: boolean }).fog = false;
  (m.material as THREE.Material).needsUpdate = true;
  return m;
}

/** 足もとの 丸い 影（フィールドの 人物の 足もとの 影）：中心 at、幅 w・奥行き d（単位）、濃さ a。 */
export function contactShadow(k: Kit, at: THREE.Vector3, w: number, d: number, a = 0.28): THREE.Mesh {
  const sh = pix('contact', 24, 8, (p) => p.ellipse(12, 4, 11, 3, '#1E2A2A'));
  const m = k.material(k.tex(sh), { unlit: true }) as THREE.MeshBasicMaterial;
  m.transparent = true;
  m.opacity = a;
  m.alphaTest = 0.01;
  m.depthWrite = false;
  const g = k.own(new THREE.PlaneGeometry(w, d));
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(at.x, at.y + 0.01, at.z);
  k.scene.add(mesh);
  return mesh;
}

/** 平らな 板（絵 1枚、カメラに 向く 縦の 面）：左下 (x0, y0)、幅 w・高さ h、奥行き z。光を 受けない・霧なし を 選べる。 */
export function plate(k: Kit, img: HTMLCanvasElement, x0: number, y0: number, w: number, h: number, z: number, o: { unlit?: boolean; fog?: boolean; transparent?: boolean; opacity?: number } = {}): THREE.Mesh {
  const m = k.material(k.tex(img), { unlit: o.unlit }) as THREE.MeshBasicMaterial;
  if (o.fog === false) m.fog = false;
  if (o.transparent) {
    m.transparent = true;
    m.alphaTest = 0.01;
    m.depthWrite = false;
    if (o.opacity !== undefined) m.opacity = o.opacity;
  }
  const g = k.own(new THREE.PlaneGeometry(w, h));
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(x0 + w / 2, y0 + h / 2, z);
  k.scene.add(mesh);
  return mesh;
}

/** パネルの 四角（px0, py0)〜(px1, py1) が 奥行き z で 映る 3D の 四角（x0, y0, w, h）。 */
export function rectAt(k: Kit, px0: number, py0: number, px1: number, py1: number, z: number): { x0: number; y0: number; w: number; h: number } {
  const a = k.atDepth(px0, py1, z)!;
  const b = k.atDepth(px1, py0, z)!;
  return { x0: a.x, y0: a.y, w: b.x - a.x, h: b.y - a.y };
}
