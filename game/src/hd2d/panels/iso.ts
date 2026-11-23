// 大写し「石めくり」（第3章 クリア後の 磯、events/ch3/iso.ts IsoPanel）の 左の 図を HD-2D で
// （2026-11-23 依頼主「ミニゲームの絵が雑すぎるから…HD -2Dにして」）。
//
// 見せる 物は 2D の 図と 同じ：上から 見た 引き潮の 磯（30×14 マス：北の 崖と 石段、岩場、潮だまり 6つ、
// 乾いた 大きな 岩、東の 取水管、なぎさ、海）、めくれる 石 12（めくった 石は 横に ずれ、下の ぬれた 所が
// 見える）、満ちて くる 潮（下の 行から 水に）。地面・崖・海は フィールドの 磯と 同じ 絵（c3_iwa・c3_nagisa・
// c3_ishidan・c3_minato・c3_umi）。
// 1マス（2D の 6px）の 4 すみを Kit.ground() で 置く ので、斜め 上から 見た 立体（崖と 岩は 高く、潮だまりと
// 海は 低い）でも 2D の 図と 同じ px に 出る（カーソルの 輪・生き物・しるし・波の 線は 2D の まま 上に）。

import * as THREE from 'three';
import { mix } from '../../engine/pixel';
import { ISO_H, ISO_ROWS, ISO_STONES, ISO_W } from '../../data/maps/c3_iso';
import type { C3Ground } from '../../art/tiles/c3_ground';
import { registerPanel3d, type Kit } from '../panel3d';
import { c3Ground, pix, plane } from './_kit_e';

const H = 112;
const TS = 6;
/** 図の 左上（絵の 左上から）：2D と 同じ。 */
const MX = 2;
const MY = Math.floor((H - ISO_H * TS) / 2);

/** マスの 高さ（単位）と 地面の 絵。 */
function cellOf(ch: string, y: number, x: number): { h: number; g: C3Ground; tint?: string } {
  if (ch === 'K') return y <= 1 ? { h: 0.9, g: 'c3_iwa', tint: '#9A968E' } : { h: 0.45, g: 'c3_iwa', tint: '#C8C4BC' };
  if (ch === 'n') return { h: 0.9 - (y / 2) * 0.1, g: 'c3_ishidan' };
  if (ch === 'p') return { h: -0.18, g: 'c3_minato' };
  if (ch === '~') return { h: -0.3, g: 'c3_umi' };
  if (ch === 'z') return { h: -0.06, g: 'c3_nagisa' };
  if (ch === 'P') return { h: 0.22, g: 'c3_iwa', tint: '#B07A58' };
  void x;
  return { h: 0, g: 'c3_iwa' };
}

/** 色を かけた 地面の 絵（崖は 暗く、取水管は 赤茶）。 */
function groundTex(g: C3Ground, tint?: string): HTMLCanvasElement {
  const base = c3Ground(g, 64, 64);
  return pix(`iso:${g}:${tint ?? ''}`, 64, 64, (p) => {
    const ctx = base.getContext('2d')!;
    const d = ctx.getImageData(0, 0, 64, 64).data;
    const lum = (i: number) => d[i * 4] * 0.3 + d[i * 4 + 1] * 0.59 + d[i * 4 + 2] * 0.11;
    let avg = 0;
    for (let i = 0; i < 64 * 64; i++) avg += lum(i);
    avg /= 64 * 64;
    const hex = (r: number, gg: number, b: number) => `#${[r, gg, b].map((v) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')).join('')}`;
    for (let i = 0; i < 64 * 64; i++) {
      // 1マスが 6px の 図では 岩の 白い 粒が ざらついて 見える：明るい 粒は まわりの 色へ 寄せ、少し 暗く 落ち着かせる
      let r = d[i * 4];
      let gg = d[i * 4 + 1];
      let b = d[i * 4 + 2];
      const over = lum(i) - avg;
      if (over > 12) {
        const x = i % 64;
        const y = Math.floor(i / 64);
        let n = 0;
        let sr = 0;
        let sg = 0;
        let sb = 0;
        for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [-2, 0], [2, 0]]) {
          const j = ((y + dy + 64) % 64) * 64 + ((x + dx + 64) % 64);
          if (lum(j) - avg > 12) continue;
          sr += d[j * 4];
          sg += d[j * 4 + 1];
          sb += d[j * 4 + 2];
          n++;
        }
        if (n) {
          r = sr / n;
          gg = sg / n;
          b = sb / n;
        }
      }
      const k = 0.9;
      let c = hex(r * k, gg * k, b * k);
      if (tint) c = mix(c, tint, 0.45);
      p.set(i % 64, Math.floor(i / 64), c);
    }
  });
}

/** めくれる 石（上から 見た 丸い 石）と、めくった 跡の ぬれた 所。 */
function stoneImg(): HTMLCanvasElement {
  return pix('iso:stone', 8, 6, (p) => {
    p.ellipse(4, 3, 3.6, 2.6, '#4A4842');
    p.ellipse(4, 3, 3, 2, '#62605A');
    p.ellipse(3, 2, 1.6, 1, '#B8B4A8');
  });
}
function wetImg(): HTMLCanvasElement {
  return pix('iso:wet', 8, 6, (p) => {
    p.ellipse(4, 3, 3.6, 2.6, '#5A564E');
    p.ellipse(4, 3, 2.4, 1.6, '#4A463E');
  });
}

function build(k: Kit): void {
  const g = (px: number, py: number, y: number): [number, number, number] => {
    const v = k.ground(px, py, y)!;
    return [v.x, v.y, v.z];
  };
  const hOf = (x: number, y: number): number => (x < 0 || y < 0 || x >= ISO_W || y >= ISO_H ? -0.3 : cellOf(ISO_ROWS[y][x], y, x).h);
  for (let y = 0; y < ISO_H; y++)
    for (let x = 0; x < ISO_W; x++) {
      const c = cellOf(ISO_ROWS[y][x], y, x);
      const img = groundTex(c.g, c.tint);
      const x0 = MX + x * TS;
      const x1 = x0 + TS;
      const y0 = MY + y * TS;
      const y1 = y0 + TS;
      // 上の 面（1マス = 絵の 12 ドット：フィールドの 模様の 細かさに 近く）
      const u0 = ((x * 6) % 60) / 64;
      const v0 = ((y * 6) % 60) / 64;
      k.quad(img, g(x0, y1, c.h), g(x1, y1, c.h), g(x1, y0, c.h), g(x0, y0, c.h), [u0, 1 - v0 - 6 / 64, u0 + 6 / 64, 1 - v0]);
      // 前の 面（下の マスより 高い とき：崖・岩の 側面）
      const below = hOf(x, y + 1);
      if (c.h > below + 0.01) {
        const a = g(x0, y1, c.h);
        const b = g(x1, y1, c.h);
        k.quad(groundTex(c.g, '#4A463E'), [a[0], below, a[2]], [b[0], below, b[2]], b, a, [u0, 0.5, u0 + 6 / 64, 0.5 + 3 / 64]);
      }
      // 横の 面（となりより 高い とき）
      for (const [dx, xe] of [[-1, x0], [1, x1]] as const) {
        const nb = hOf(x + dx, y);
        if (c.h <= nb + 0.01) continue;
        const f = g(xe, y1, c.h);
        const r = g(xe, y0, c.h);
        const tex = groundTex(c.g, '#5A564E');
        if (dx < 0) k.quad(tex, [r[0], nb, r[2]], [f[0], nb, f[2]], f, r, [0.2, 0.2, 0.3, 0.3]);
        else k.quad(tex, [f[0], nb, f[2]], [r[0], nb, r[2]], r, f, [0.2, 0.2, 0.3, 0.3]);
      }
    }
  // 図の 外の 海（2D の 図の まわりの 青）
  k.tiled(c3Ground('c3_umi', 64, 64), -60, 60, -60, 10, -0.32, 16);
  // 満ちる 潮：行ごとの 水の 板（下の 行から 見せる。崖と 大きな 岩は 上に 出る）
  const water = pix('iso:water', 4, 4, (p) => p.fill('#3A6E96'));
  const rows: THREE.Mesh[] = [];
  for (let y = 0; y < ISO_H; y++) {
    const a = k.ground(MX + (ISO_W * TS) / 2, MY + y * TS + TS / 2, 0.06)!;
    const l = k.ground(MX, MY + y * TS + TS / 2, 0.06)!;
    const r = k.ground(MX + ISO_W * TS, MY + y * TS + TS / 2, 0.06)!;
    const f = k.ground(MX + (ISO_W * TS) / 2, MY + y * TS + TS, 0.06)!;
    const b = k.ground(MX + (ISO_W * TS) / 2, MY + y * TS, 0.06)!;
    const m = plane(k, water, a, (r.x - l.x) * 1.02, Math.abs(f.z - b.z) * 1.02, { face: 'floor', opacity: 0.82, unlit: true, order: 2 });
    m.visible = false;
    rows.push(m);
  }
  k.bag.rows = rows;
  // めくれる 石（めくった 石は 横に ずれる：update）
  const stones: { m: THREE.Mesh; home: THREE.Vector3; away: THREE.Vector3; wet: THREE.Mesh }[] = [];
  const st = stoneImg();
  for (const [x, y] of ISO_STONES) {
    const cx = MX + x * TS + 3;
    const cy = MY + y * TS + 3;
    const home = k.ground(cx, cy + 2.5, 0)!;
    const away = k.ground(cx + 6, cy - 1, 0)!;
    const d = home.distanceTo(k.camera.position);
    const m = k.stand(st, home, { px: k.pxAt(d) * 0.95, depth: 4 });
    const wet = plane(k, wetImg(), k.ground(cx, cy, 0.01)!, k.pxAt(d) * 7, k.pxAt(d) * 7, { face: 'floor', unlit: true });
    wet.visible = false;
    stones.push({ m, home, away, wet });
  }
  k.bag.stones = stones;
}

registerPanel3d('iso', {
  cam: { fov: 24, pitch: 52, pos: [0, 14, 0], far: 400 },
  light: 'noon',
  fog: null,
  shadow: null,
  focus: 0.5,
  tilt: 0.4,
  build,
  update(k, _t, s) {
    const from = Number(s.flood ?? 99);
    (k.bag.rows as THREE.Mesh[]).forEach((m, y) => (m.visible = y >= from && ISO_ROWS[y][0] !== undefined));
    const fl = Number(s.flipped ?? -1);
    (k.bag.stones as { m: THREE.Mesh; home: THREE.Vector3; away: THREE.Vector3; wet: THREE.Mesh }[]).forEach((e, i) => {
      const p = i === fl ? e.away : e.home;
      const w = (8 * e.m.scale.x) / 2;
      e.m.position.set(p.x - w, p.y, p.z);
      e.wet.visible = i === fl;
    });
    k.shadowDirty = true;
  },
});
