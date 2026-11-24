// 大写し「型ぬき」（第1章 駄菓子屋 ひのや、ui/katanuki_game.ts KatanukiGame）を HD-2D で。
//
// 型ぬきの 板そのものが 遊びの 中身なので、板の 絵（線・針・ひび・しめり）は 2D の まま。その 下を 3D に：
// 真上から 見た 駄菓子屋の 古い 木の 台（濃い 板目・節・すり傷）に、厚みの ある 型ぬきの 板（上の 面は 2D の
// 板の 絵に 粉の ざらつき・色むら・型の 溝の 影と 光・欠けた ふちを 足した 物、ふちは 砂糖菓子の 断面）が
// のって、本当の 影を 落とす。板の 上の 面は 2D と 同じ px（形・線は 同じ）。針の つやと 影は 2D 側（katanuki_game.ts）。
// 右の 列（型の 名前・しめりの めもり）と グソっ君の 1行は 紙の まま。

import * as THREE from 'three';
import { PixelCanvas, mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { P } from '../../art/tiles/palette';
import { BOARD_H, BOARD_W, kataShape, katanukiBoardArt } from '../../ui/katanuki_game';
import type { KataKey } from '../../data/text/katanuki';
import { registerPanel3d } from '../panel3d';
import { lamp, once } from './_kit_a';

/** 古い 木の 台（2026-11-24「足して」：濃い 板目・年輪の 波・節・しみ・すり傷・板の 継ぎ目）。 */
function tableImg(): HTMLCanvasElement {
  return once('kt:table2', () => {
    const N = 128;
    const p = new PixelCanvas(N, N);
    const rng = new Rng(61);
    const knots: [number, number][] = [[30, 12], [96, 52], [58, 100]];
    for (let y = 0; y < N; y++) {
      const plank = Math.floor(y / 32);
      for (let x = 0; x < N; x++) {
        // 節の まわりで 木目が 曲がる
        let bend = 0;
        for (const [kx, ky] of knots) {
          const d = Math.hypot(x - kx, (y - ky) * 2.2);
          if (d < 14) bend += ((14 - d) / 14) * 3 * Math.sign(y - ky || 1);
        }
        const g1 = Math.sin((y + bend) * 1.15 + plank * 2.3 + Math.sin(x / 17 + plank) * 1.6 + Math.sin(x / 43) * 2);
        let c: string = mix(P.wood, P.woodLt, 0.4);
        if (g1 > 0.75) c = mix(P.wood, P.woodDark, 0.55);
        else if (g1 > 0.35) c = mix(P.wood, P.woodDark, 0.2);
        else if (g1 < -0.8) c = mix(P.woodLt, '#E8C890', 0.25);
        // 色むら（日焼け・手あか）
        const m = Math.sin(x / 29 + y / 41) + Math.sin(y / 19 - x / 53);
        if (m > 1.2) c = mix(c, '#3A2418', 0.18);
        if (rng.next() > 0.985) c = mix(c, '#2A1A10', 0.45);
        if (y % 32 === 31) c = '#2A1A10';
        else if (y % 32 === 0) c = mix(P.woodLt, '#F0D8A8', 0.3);
        p.set(x, y, c);
      }
    }
    for (const [kx, ky] of knots) {
      p.ellipse(kx, ky, 4, 2, '#4A2A1A');
      p.ellipse(kx, ky, 2, 1, '#2A1A10');
    }
    // すり傷・水の 輪じみ
    for (let i = 0; i < 9; i++) {
      const x = Math.floor(rng.next() * (N - 20));
      const y = Math.floor(rng.next() * N);
      p.line(x, y, x + 6 + Math.floor(rng.next() * 14), y + Math.floor(rng.next() * 3) - 1, mix(P.woodLt, '#F4E0B8', 0.4));
    }
    p.ring(80, 20, 7, 5, mix(P.wood, '#2A1A10', 0.35));
    return p.toCanvas();
  });
}

/** 板の ふち（砂糖菓子の 断面：粉の 白い 粒、欠けた でこぼこ）。 */
function edgeImg(): HTMLCanvasElement {
  return once('kt:edge2', () => {
    const p = new PixelCanvas(48, 6);
    const rng = new Rng(3);
    for (let y = 0; y < 6; y++)
      for (let x = 0; x < 48; x++) {
        let c = y === 0 ? '#FBE3DC' : y === 5 ? '#B97E80' : '#E8B7B3';
        const r = rng.next();
        if (r > 0.85) c = '#FFF3EE';
        else if (r < 0.1) c = '#D49A9C';
        p.set(x, y, c);
      }
    // 欠け
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(rng.next() * 46);
      p.set(x, 0, 0);
      p.set(x + 1, 0, 0);
      p.set(x, 1, '#C98A8E');
    }
    return p.toCanvas();
  });
}

/** 板の 上の 面：2D の 板の 絵に 粉の ざらつき・色むら・型の 溝の 影と 光・割れそうな ふちを 足す（形は 同じ）。 */
function boardTop(kata: string): HTMLCanvasElement {
  return once(`kt:top:${kata}`, () => {
    const src = katanukiBoardArt();
    const W = src.width;
    const H = src.height;
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const ctx = c.getContext('2d', { willReadFrequently: true })!;
    ctx.drawImage(src, 0, 0);
    const img = ctx.getImageData(0, 0, W, H);
    const d = img.data;
    const rng = new Rng(kata.length * 31 + 7);
    const at = (x: number, y: number) => (y * W + x) * 4;
    const tone = (x: number, y: number, k: number) => {
      if (x < 0 || y < 0 || x >= W || y >= H) return;
      const i = at(x, y);
      if (d[i + 3] === 0) return;
      for (let j = 0; j < 3; j++) d[i + j] = k >= 0 ? d[i + j] + (255 - d[i + j]) * k : d[i + j] * (1 + k);
    };
    for (let y = 2; y < H - 2; y++)
      for (let x = 2; x < W - 2; x++) {
        // 色むら（焼きむら：ゆっくり 変わる）と 粉の ざらつき
        const m = Math.sin(x / 13 + Math.sin(y / 9) * 1.4) * 0.5 + Math.sin(y / 17 - x / 23) * 0.5;
        let k = m * 0.045 + (m > 0.75 ? 0.06 : 0);
        const r = rng.next();
        if (r > 0.93) k += 0.14;
        else if (r > 0.88) k += 0.07;
        else if (r < 0.04) k -= 0.08;
        // 光の 向き（左上が 少し 明るい）
        k += (0.5 - (x / W) * 0.6 - (y / H) * 0.4) * 0.08;
        tone(x, y, k);
      }
    // 型の 溝：線の 点の 上を 少し へこませる（左上の 壁は 陰、右下の 壁は 光）
    const sh = kataShape(kata as KataKey);
    for (const [x, y] of sh.pts) {
      tone(x, y, -0.3);
      tone(x - 1, y - 1, -0.16);
      tone(x - 1, y, -0.08);
      tone(x + 1, y + 1, 0.32);
      tone(x + 1, y, 0.12);
      tone(x + 2, y + 2, 0.1);
    }
    // 割れそうな ふち：欠けと 細い ひび（はしから 内へ）
    const chip = (x: number, y: number) => {
      const i = at(x, y);
      d[i + 3] = 0;
    };
    for (let i = 0; i < 16; i++) {
      const side = Math.floor(rng.next() * 4);
      const t = 6 + Math.floor(rng.next() * ((side % 2 ? H : W) - 12));
      const [x, y] = side === 0 ? [t, 0] : side === 1 ? [W - 1, t] : side === 2 ? [t, H - 1] : [0, t];
      chip(x, y);
      if (rng.next() < 0.5) chip(Math.min(W - 1, x + 1), y);
      // ひび
      if (rng.next() < 0.45) {
        const [dx, dy] = side === 0 ? [0, 1] : side === 1 ? [-1, 0] : side === 2 ? [0, -1] : [1, 0];
        let cx = x;
        let cy = y;
        for (let j = 0; j < 3 + Math.floor(rng.next() * 4); j++) {
          cx += dx + (dy ? Math.round(rng.next() * 2 - 1) : 0);
          cy += dy + (dx ? Math.round(rng.next() * 2 - 1) : 0);
          tone(cx, cy, -0.22);
        }
      }
    }
    ctx.putImageData(img, 0, 0);
    return c;
  });
}

registerPanel3d('katanuki', {
  cam: { fov: 30, pitch: 90, pos: [0, 8, 0], near: 0.5, far: 40 },
  light: { sun: '#fff0dc', sky: '#f0e8dc', ground: '#b8a890', fog: '#3a3028', sunI: 1.5, hemiI: 1.9, el: 62, az: 210 },
  fog: null,
  // 板の 色は 2D と 同じに（フィールドの 夕方の 仕上げを かけない）
  grade: () => null,
  shadow: { x: 0, z: 0, hw: 5, hd: 4 },
  focus: 0.5,
  tilt: 0.1,
  build(k, s) {
    k.tiled(tableImg(), -10, 10, -10, 10, 0, Math.round(1 / k.pxAt(8)));
    // 板：上の 面は パネルの 板の 四角（左上 8,6）に ぴったり
    const th = 0.18;
    const a = k.ground(8, 6, th)!;
    const b = k.ground(8 + BOARD_W, 6 + BOARD_H, th)!;
    k.box(a.x, b.x, 0, th, a.z, b.z, { top: boardTop(String(s.kata ?? 'hyoutan')), front: edgeImg(), left: edgeImg(), right: edgeImg(), back: edgeImg() });
    lamp(k, new THREE.Vector3(-2.5, 4, -2), { color: '#ffe8c8', i: 1.2, dist: 14, decay: 1 });
  },
});
