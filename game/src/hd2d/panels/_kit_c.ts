// 大写しの HD-2D（グループ c：第2章 星見台の 大写し 21〜30）で 使い回す 部品。
// 共通の Kit（hd2d/panel3d.ts）に 無い 物だけ：第2章の 地面の 絵（hoshi_ground H_TEX）、小物の 絵、
// 建物の 絵（bkit.registerBuilding の 1枚）を 前の 壁と 屋根に 分けて 立てる、絵の 背景色を 抜く、
// 状態で 絵が 変わる 物（犬の 耳・グソっ君の 顔 など）の 入れ替え、第2章の 夜明け前の 光と 空。

import * as THREE from 'three';
import { mix, PixelCanvas } from '../../engine/pixel';
import { makeCanvas } from '../../engine/pixel';
import { flag } from '../../game/state';
import { field } from '../../world/field';
import { getProp } from '../../art/props/registry';
import type { PropEnv } from '../../art/props/types';
import { H_TEX, type HGround } from '../../art/tiles/hoshi_ground';
import { Rng } from '../../engine/rng';
import type { Kit, PanelLight, StandOpts } from '../panel3d';

// ---------------------------------------------------------------- 絵（1回 作って 使い回す）

const cache = new Map<string, HTMLCanvasElement>();
export function once(key: string, make: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = make()));
  return c;
}

/** PixelCanvas に 描いて キャンバスに（1回だけ）。 */
export function paint(key: string, w: number, h: number, fn: (p: PixelCanvas) => void): HTMLCanvasElement {
  return once(key, () => {
    const p = new PixelCanvas(w, h);
    fn(p);
    return p.toCanvas();
  });
}

/** 第2章の 段階（flag_ch2_stage）。 */
export const ch2Stage = (): number => flag('flag_ch2_stage');

/** 小物の 絵（止まった 1枚：今の 段階、今の フィールドの 色）。 */
export function propImg(id: string, opts: Record<string, unknown> = {}, stage = ch2Stage()): HTMLCanvasElement | null {
  const a = getProp(id, opts);
  const f = field();
  if (!a || !f) return null;
  const env: PropEnv = { t: 0, stage, grade: f.grade, motion: 0, mt: 0, flag, seed: 0, near: 999, px: 0, py: 0 };
  return a.img(env);
}

/** 建物の 絵と 屋根・前の 壁の 行（bkit の 建物：上 top px、屋根 R タイル、前の 壁 F タイル）。 */
export function bldImg(id: string, opts: Record<string, unknown> = {}): { img: HTMLCanvasElement; top: number; R: number; F: number } | null {
  const a = getProp(id, opts);
  const img = propImg(id, opts);
  if (!a?.box || !img) return null;
  return { img, top: a.box.top, R: a.box.R, F: a.box.F };
}

/** 第2章の 地面の 絵（フィールドと 同じ 模様）w × h ドット。 */
export function hGround(g: HGround, w: number, h: number, ox = 0, oy = 0): HTMLCanvasElement {
  return once(`hg:${g}:${w}x${h}:${ox},${oy}`, () => {
    const p = new PixelCanvas(w, h);
    const tex = H_TEX[g];
    const ctx = { ground: () => g };
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) p.set(x, y, tex(x + ox, y + oy, 0, ctx));
    return p.toCanvas();
  });
}

/** 絵の 一部（x, y, w, h）を 切り出す。 */
export function crop(img: HTMLCanvasElement, x: number, y: number, w: number, h: number, key?: string): HTMLCanvasElement {
  const make = () => {
    const [c, ctx] = makeCanvas(w, h);
    ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
    return c;
  };
  return key ? once(key, make) : make();
}

/** 絵の 背景色（写真の 空など）を 透明に。`near`：色の 差（0〜255 の 和）が これ 以下も 抜く。 */
export function keyOut(img: HTMLCanvasElement, colors: string[], near = 0, rows?: [number, number]): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(img.width, img.height, { willReadFrequently: true });
  ctx.drawImage(img, 0, 0);
  const d = ctx.getImageData(0, 0, img.width, img.height);
  const cs = colors.map((h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)]);
  const [r0, r1] = rows ?? [0, img.height];
  for (let y = r0; y < r1; y++)
    for (let x = 0; x < img.width; x++) {
      const i = (y * img.width + x) * 4;
      for (const [r, g, b] of cs) if (Math.abs(d.data[i] - r) + Math.abs(d.data[i + 1] - g) + Math.abs(d.data[i + 2] - b) <= near) d.data[i + 3] = 0;
    }
  ctx.putImageData(d, 0, 0);
  return c;
}

// ---------------------------------------------------------------- 光と 空

/**
 * 第2章の 夜（星見台）：フィールドの view.ts と 同じ 考え方 —— 空の 光は 白（π）で 物の 色の まま、
 * 暗さと 青さは フィールドの Grade（掛け算）が つける。月の 弱い 光で 少し だけ 立体に。
 */
export const CH2_NIGHT: PanelLight = { sun: '#c8d0ff', sky: '#d8dcf4', ground: '#b8b0c8', fog: '#4a5078', sunI: 0.8, hemiI: 2.2, el: 48, az: 210 };
/** 部屋の 中・牛舎の 中（夜：灯りの 下）。 */
export const CH2_ROOM: PanelLight = { sun: '#fff0dc', sky: '#c8c4d8', ground: '#a89c94', fog: '#6a6070', sunI: 0.35, hemiI: 1.1, el: 70, az: 20 };

/** 夜明け前の 空（上 濃い 紺、下へ 明るい 青紫、星が 少し）。`dawn`：東の 下が 白む 強さ 0..1。 */
export function nightSky(dawn = 0.4, stars = 1): HTMLCanvasElement {
  return once(`nsky:${dawn}:${stars}`, () => {
    const H = 112;
    const p = new PixelCanvas(64, H);
    const rng = new Rng(311);
    const stops: [number, string][] = [
      [0, '#3A4478'],
      [0.45, '#56609A'],
      [0.8, mix('#7078B0', '#B8A8C8', dawn)],
      [1, mix('#8088B8', '#E8C8C0', dawn)],
    ];
    for (let y = 0; y < H; y++) {
      const v = y / H;
      let i = 0;
      while (i < stops.length - 2 && v > stops[i + 1][0]) i++;
      const [a, ca] = stops[i];
      const [b, cb] = stops[i + 1];
      const t = Math.max(0, Math.min(1, (v - a) / (b - a)));
      for (let x = 0; x < 64; x++) {
        const q = Math.floor(t * 4 + ((x + y * 2) % 4) / 4 - 0.12) / 4;
        p.set(x, y, mix(ca, cb, Math.max(0, Math.min(1, q))));
      }
    }
    for (let k = 0; k < 40 * stars; k++) {
      const x = Math.floor(rng.next() * 64);
      const y = Math.floor(rng.next() * rng.next() * H * 0.7);
      p.set(x, y, rng.next() < 0.3 ? '#FFFFFF' : '#C8D0F0');
    }
    return p.toCanvas();
  });
}

// ---------------------------------------------------------------- 立てる

/**
 * 2D の 絵を パネルの 2D の 四角（左上 px, py、`scale` 倍）に 見える ように 立てる：絵の 下の はしを
 * 高さ y の 地面に 置き（ground）、その 奥行きで 1 ドット = パネルの scale px。2D の 絵と 同じ 所・大きさ。
 * 地面が 見えない（行が 地平線より 上）ときは 奥行き `zFallback` に。
 */
export function standAt(k: Kit, img: HTMLCanvasElement, px: number, py: number, scale: number, o: StandOpts & { y?: number; zFallback?: number; bottom?: number } = {}): THREE.Mesh | null {
  const [r0, r1] = o.rows ?? [0, img.height];
  const [c0, c1] = o.cols ?? [0, img.width];
  const w = (c1 - c0) * scale;
  const bottom = py + (o.bottom ?? (r1 - r0) * scale);
  const y = o.y ?? 0;
  let at = k.ground(px + w / 2, bottom, y);
  if (!at && o.zFallback !== undefined) at = k.atDepth(px + w / 2, bottom, o.zFallback);
  if (!at) return null;
  const d = -(at.z - k.camera.position.z);
  return k.stand(img, at, { ...o, px: k.pxAt(d) * scale });
}

/**
 * 建物（bkit の 1枚の 絵）を 立てる：前の 壁（F タイル）を 箱の 前の 面に、屋根（R タイル）を
 * 前の 軒から 奥へ 上る 1枚の 坂に。x0 = 左の はし、z = 前の 壁、u = 1 ドットの 大きさ。
 */
export function building(k: Kit, id: string, x0: number, y: number, z: number, u = 1 / 16, o: { opts?: Record<string, unknown>; roofDepth?: number; roofRise?: number } = {}): void {
  const b = bldImg(id, o.opts);
  if (!b) return;
  const W = b.img.width;
  const fh = b.F * 16;
  const rh = b.R * 16;
  const face = crop(b.img, 0, b.top + rh, W, fh, `bf:${id}`);
  const roof = crop(b.img, 0, 0, W, b.top + rh, `br:${id}`);
  const x1 = x0 + W * u;
  const yt = y + fh * u;
  const depth = o.roofDepth ?? rh * u;
  k.box(x0, x1, y, yt, z - depth, z, { front: face, left: face, right: face });
  // 屋根：前の 軒（yt, z + 少し）から 奥の 棟（yt + rise, z - depth）へ
  const rise = o.roofRise ?? depth * 0.5;
  const e = 4 * u;
  k.quad(roof, [x0 - e, yt - e * 0.5, z + e], [x1 + e, yt - e * 0.5, z + e], [x1 + e, yt + rise, z - depth], [x0 - e, yt + rise, z - depth]);
}

/**
 * 状態で 絵が 変わる 物：`key` ごとに 1回 作り、今の key の 物だけ 見せる（犬の 耳、顔 など）。
 * update() で 毎回 呼ぶ。作った 物が 変わったら 影を 描き直す。
 */
export function swap(k: Kit, slot: string, key: string, make: () => THREE.Object3D | null): void {
  const all = (k.bag[`swap:${slot}`] ??= new Map<string, THREE.Object3D | null>()) as Map<string, THREE.Object3D | null>;
  if (!all.has(key)) all.set(key, make());
  let changed = false;
  for (const [kk, o] of all) {
    if (!o) continue;
    const v = kk === key;
    if (o.visible !== v) {
      o.visible = v;
      changed = true;
    }
  }
  if (changed) k.shadowDirty = true;
}

/** 足もとの 丸い 影（フィールドの 人物と 同じ）。 */
export function contactShadow(k: Kit, at: THREE.Vector3, w: number, d: number, opacity = 0.3): THREE.Mesh {
  const sh = paint('contact', 24, 8, (p) => p.ellipse(12, 4, 11, 3, '#1E1A2A'));
  const m = k.material(k.tex(sh), { unlit: true }) as THREE.MeshBasicMaterial;
  m.transparent = true;
  m.opacity = opacity;
  m.alphaTest = 0.01;
  m.depthWrite = false;
  const g = k.own(new THREE.PlaneGeometry(w, d));
  g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.set(at.x, at.y + 0.01, at.z);
  k.scene.add(mesh);
  return mesh;
}

/** 光る 丸（灯りの 輪・ランプ）：足し算で 重ねる 板。 */
export function glowDisc(k: Kit, at: THREE.Vector3, r: number, color: string, opacity = 0.5, flat = true): THREE.Mesh {
  const img = paint(`glow:${color}`, 32, 32, (p) => {
    for (let y = 0; y < 32; y++)
      for (let x = 0; x < 32; x++) {
        const d = Math.hypot(x - 15.5, y - 15.5) / 16;
        if (d < 1) p.set(x, y, mix('#000000', color, Math.pow(1 - d, 1.6)));
      }
  });
  const t = k.tex(img);
  t.magFilter = THREE.LinearFilter;
  t.minFilter = THREE.LinearFilter;
  const m = k.own(new THREE.MeshBasicMaterial({ map: t, transparent: true, opacity, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
  const g = k.own(new THREE.PlaneGeometry(r * 2, r * 2));
  if (flat) g.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(g, m);
  mesh.position.copy(at);
  if (flat) mesh.position.y += 0.02;
  k.scene.add(mesh);
  return mesh;
}

/** 杉の 林の 帯（夜の 山の ふち：フィールドの 杉の 壁の 色）。幅 w ドット、高さ h。 */
export function sugiWall(w: number, h: number, seed = 5): HTMLCanvasElement {
  return paint(`sugi:${w}x${h}:${seed}`, w, h, (p) => {
    const rng = new Rng(seed);
    const cols = ['#1E3A34', '#24463C', '#2C5444', '#386050'];
    for (let layer = 0; layer < 3; layer++) {
      for (let x = -4; x < w + 4; x += 5 + Math.floor(rng.next() * 4)) {
        const th = Math.floor(h * (0.55 + layer * 0.15 + rng.next() * 0.25));
        const top = h - th;
        const half = 3 + Math.floor(rng.next() * 3);
        const c = cols[layer + (rng.next() < 0.5 ? 1 : 0)];
        for (let y = top; y < h; y++) {
          const t = (y - top) / th;
          const hw = Math.max(0, Math.round(half * Math.min(1, t * 1.6)));
          // ギザギザの 枝の 段
          const jag = (y - top) % 4 === 0 ? 1 : 0;
          p.hline(x - hw - jag, x + hw + jag, y, c);
          if (y % 4 === 1) p.set(x - hw, y, cols[3]);
        }
      }
    }
  });
}

/**
 * 状態で 組み直す 物（段階・場面ごとの 小物）：`key` が 変わった ときだけ、前の 物を 外して `make` で
 * 組み直す（box / quad は その場で 1つに まとめる）。update() で 呼ぶ。
 */
export function rebuild(k: Kit, slot: string, key: string, make: () => void): void {
  if (k.bag[`rb:${slot}`] === key) return;
  k.bag[`rb:${slot}`] = key;
  const old = k.bag[`rbg:${slot}`] as THREE.Group | undefined;
  if (old) k.scene.remove(old);
  const before = new Set(k.scene.children);
  make();
  k.finish();
  const grp = new THREE.Group();
  for (const o of [...k.scene.children]) if (!before.has(o)) grp.add(o);
  k.scene.add(grp);
  k.bag[`rbg:${slot}`] = grp;
  k.shadowDirty = true;
}

/** 平たく 寝かせた 絵（地面・台の 上に 横たわる 物）：パネルの 2D の 四角の 上の 行 py に、左 px から 幅 w ドット。 */
export function lay(k: Kit, img: HTMLCanvasElement, px: number, py: number, y: number, o: StandOpts & { scale?: number } = {}): THREE.Mesh | null {
  const w = (o.cols ? o.cols[1] - o.cols[0] : img.width) * (o.scale ?? 1);
  const at = k.ground(px + w / 2, py, y);
  if (!at) return null;
  const u = k.pxAt(-(at.z - k.camera.position.z)) * (o.scale ?? 1);
  // (上下を 返した 絵を 立てて 手前へ 倒す：絵の 上が 奥に なる)
  const m = k.stand(flipV(img), at, { ...o, px: u });
  m.rotation.x = Math.PI / 2;
  return m;
}

/** 絵の 上下を 返す。 */
export function flipV(img: HTMLCanvasElement): HTMLCanvasElement {
  const key = `flipV`;
  const all = ((flipV as unknown as Record<string, WeakMap<HTMLCanvasElement, HTMLCanvasElement>>)[key] ??= new WeakMap());
  let c = all.get(img);
  if (!c) {
    const [cv, ctx] = makeCanvas(img.width, img.height);
    ctx.translate(0, img.height);
    ctx.scale(1, -1);
    ctx.drawImage(img, 0, 0);
    all.set(img, (c = cv));
  }
  return c;
}
