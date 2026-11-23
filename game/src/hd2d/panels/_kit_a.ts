// グループ a の 大写し（hd2d/panels の 第1章の 釣り・報告書・型ぬき、第2章の 秋ナス・朝の 前の 色・
// バスの 幕）で 使う 小さな 部品。Kit（hd2d/panel3d.ts）に 無い 物だけ：
//   ・once()       絵を 1回 作って 使い回す
//   ・propImg()    小物の 絵（止まった env）
//   ・hGroundImg() 第2章の 地面の 絵（フィールドと 同じ 模様）
//   ・bands()      縦の 帯の 空（ディザの 段）
//   ・lamp()       点の 灯り（フィールドの 夜の 灯りと 同じ 色・減り方）
//   ・glowAt()     光の にじみ（足し算の 板：灯りの まわり）
//   ・veil()       半分 透ける 板（水の 色・影）
//   ・rectAt()     パネルの px の 四角 → 奥行き z の 面の 単位の 四角
//   ・panelBox()   パネルの px の 四角に ぴったり 映る 箱（前の 面が 奥行き z）

import * as THREE from 'three';
import { PixelCanvas, mix } from '../../engine/pixel';
import { flag } from '../../game/state';
import { field } from '../../world/field';
import { getProp } from '../../art/props/registry';
import type { PropEnv } from '../../art/props/types';
import { H_TEX, type HGround } from '../../art/tiles/hoshi_ground';
import type { BoxFaces, Kit } from '../panel3d';

const cache = new Map<string, HTMLCanvasElement>();

export function once(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = make()));
  return c;
}

/** 小物の 絵（止まった 1枚）。flags で フラグを 上書き。 */
export function propImg(id: string, opts: Record<string, unknown> = {}, flags: Record<string, number> = {}): HTMLCanvasElement | null {
  const a = getProp(id, opts);
  if (!a) return null;
  const f = field();
  const env: PropEnv = { t: 0, stage: 1, grade: f?.grade ?? (null as unknown as PropEnv['grade']), motion: 0, mt: 0, flag: (k) => (k in flags ? flags[k] : flag(k)), seed: 0, near: 999, px: 0, py: 0 };
  return a.img(env);
}

/** 第2章の 地面の 絵（w × h ドット）。 */
export function hGroundImg(g: HGround, w: number, h: number): HTMLCanvasElement {
  return once(`hg:${g}:${w}x${h}`, () => {
    const p = new PixelCanvas(w, h);
    const tex = H_TEX[g];
    const ctx = { ground: () => g };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.set(x, y, tex(x, y, 0, ctx));
    return p.toCanvas();
  });
}

/** 縦の 帯（上から 下へ stops の 色、4段 + ベイヤーの ディザ）。stars：星の 数。 */
export function bands(key: string, stops: [number, string][], H = 112, stars = 0, W = 8): HTMLCanvasElement {
  return once(`bands:${key}`, () => {
    const p = new PixelCanvas(W, H);
    for (let y = 0; y < H; y++) {
      const v = y / H;
      let i = 0;
      while (i < stops.length - 2 && v > stops[i + 1][0]) i++;
      const [a, ca] = stops[i];
      const [b, cb] = stops[i + 1];
      const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
      for (let x = 0; x < W; x++) {
        const q = Math.floor(t * 4 + ((x + y * 2) % 4) / 4 - 0.12) / 4;
        p.set(x, y, mix(ca, cb, Math.max(0, Math.min(1, q))));
      }
    }
    let s = 7;
    for (let i = 0; i < stars; i++) {
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const x = s % W;
      s = (s * 1103515245 + 12345) & 0x7fffffff;
      const y = s % Math.floor(H * 0.6);
      p.set(x, y, i % 4 === 0 ? '#F4F1E8' : '#9AA4C8');
    }
    return p.toCanvas();
  });
}

/** 点の 灯り（フィールドの 夜の 灯り：#ffb468、距離 4.5、減り 1.6 が 基本）。 */
export function lamp(k: Kit, at: THREE.Vector3, o: { color?: string; i?: number; dist?: number; decay?: number } = {}): THREE.PointLight {
  const l = new THREE.PointLight(o.color ?? '#ffb468', o.i ?? 2.2, o.dist ?? 4.5, o.decay ?? 1.6);
  l.position.copy(at);
  k.scene.add(l);
  return l;
}

/** 丸い にじみの 絵（中心ほど 濃い、ドットの 輪）。 */
function glowImg(color: string): HTMLCanvasElement {
  return once(`glow:${color}`, () => {
    const N = 32;
    const p = new PixelCanvas(N, N);
    for (let y = 0; y < N; y++)
      for (let x = 0; x < N; x++) {
        const d = Math.hypot(x - N / 2 + 0.5, y - N / 2 + 0.5) / (N / 2);
        if (d >= 1) continue;
        // 4 段の 輪（ドットの にじみ）
        const a = Math.floor((1 - d) * 4) / 4;
        if (a <= 0) continue;
        const [r, g, b] = [parseInt(color.slice(1, 3), 16), parseInt(color.slice(3, 5), 16), parseInt(color.slice(5, 7), 16)];
        p.set(x, y, ((Math.round(a * 255) << 24) | (b << 16) | (g << 8) | r) >>> 0);
      }
    return p.toCanvas();
  });
}

/** 光の にじみ（足し算で 重ねる 板、カメラに 向く）：中心 at、半径 r（単位）、強さ a。 */
export function glowAt(k: Kit, at: THREE.Vector3, r: number, color: string, a = 0.5): THREE.Mesh {
  const t = k.tex(glowImg(color));
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  const m = k.own(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity: a, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const g = k.own(new THREE.PlaneGeometry(r * 2, r * 2));
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(at);
  mesh.renderOrder = 5;
  k.scene.add(mesh);
  return mesh;
}

/** 半分 透ける 板（4 隅、色・透明度）。水の 色や 影に。 */
export function veil(k: Kit, a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3, d: THREE.Vector3, color: string, opacity: number, o: { map?: HTMLCanvasElement; lit?: boolean; order?: number } = {}): THREE.Mesh {
  const g = k.own(new THREE.BufferGeometry());
  g.setAttribute('position', new THREE.Float32BufferAttribute([...a.toArray(), ...b.toArray(), ...c.toArray(), ...d.toArray()], 3));
  g.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  g.setIndex([0, 1, 2, 0, 2, 3]);
  g.computeVertexNormals();
  const opts = { color: new THREE.Color(color), transparent: true, opacity, depthWrite: false, side: THREE.DoubleSide, map: o.map ? k.tex(o.map) : null };
  const m = k.own(o.lit ? new THREE.MeshLambertMaterial(opts) : new THREE.MeshBasicMaterial(opts));
  const mesh = new THREE.Mesh(g, m);
  mesh.renderOrder = o.order ?? 3;
  mesh.receiveShadow = !!o.lit;
  k.scene.add(mesh);
  return mesh;
}

/** パネルの px の 四角（x0,y0 〜 x1,y1）が 奥行き z で 占める 単位の 四角 [x0, x1, y0, y1]（y0 が 下）。 */
export function rectAt(k: Kit, px0: number, py0: number, px1: number, py1: number, z: number): [number, number, number, number] {
  const a = k.atDepth(px0, py1, z)!;
  const b = k.atDepth(px1, py0, z)!;
  return [a.x, b.x, a.y, b.y];
}

/** パネルの px の 四角に 前の 面が ぴったり 映る 箱（前の 面の 奥行き z、奥へ depth）。 */
export function panelBox(k: Kit, px0: number, py0: number, px1: number, py1: number, z: number, depth: number, f: BoxFaces): [number, number, number, number] {
  const r = rectAt(k, px0, py0, px1, py1, z);
  k.box(r[0], r[1], r[2], r[3], z - depth, z, f);
  return r;
}

/** 塗りの 絵（w × h、色 c、ふちを 少し 明るく／暗く）。 */
export function flat(c: string, w = 8, h = 8, edge = 0): HTMLCanvasElement {
  return once(`flat:${c}:${w}x${h}:${edge}`, () => {
    const p = new PixelCanvas(w, h);
    p.fill(c);
    if (edge) {
      p.hline(0, w - 1, 0, mix(c, '#FFFFFF', edge));
      p.hline(0, w - 1, h - 1, mix(c, '#000000', edge));
    }
    return p.toCanvas();
  });
}

/** 足もとの 丸い 影（人物・小物の 下）。 */
export function contact(k: Kit, at: THREE.Vector3, w: number, d: number, opacity = 0.3): void {
  const img = once('contact', () => {
    const p = new PixelCanvas(24, 8);
    p.ellipse(12, 4, 11, 3, '#1E2A2A');
    return p.toCanvas();
  });
  const m = k.own(new THREE.MeshBasicMaterial({ map: k.tex(img), transparent: true, opacity, depthWrite: false, alphaTest: 0.01 }));
  const g = k.own(new THREE.PlaneGeometry(w, d));
  g.rotateX(-Math.PI / 2);
  const s = new THREE.Mesh(g, m);
  s.position.set(at.x, at.y + 0.01, at.z);
  k.scene.add(s);
}
