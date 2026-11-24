// 大写し「ダンゴムシ ちゃうで」の 報告書の ミニ遊び（第1章 交番、ui/hokokusho_games.ts）を HD-2D で。
// 報告書の 紙（窓の わく・見出しの 行）は 2D の まま、その 下の 絵の 所を 交番の 中の 場面に する：
//
//   hk_size  『大きさ』：交番の 奥の 壁（上は しっくい、下は 板の 腰壁 —— フィールドの 交番と 同じ）と
//            床の タイル、身長計の 木の 台と 白い 柱（2D と 同じ 所）、壁の 時計。
//            グソっ君・目盛り・下りる バー・ツッコミ・はかった 値は 2D の まま 上に。
//   hk_legs  『足の 数』：上から 見た 交番の 机（緑の デスクマット）。報告書・鉛筆・朱肉と ハンコ・湯のみ。
//            あおむけの グソっ君（2D の 絵）は まん中に のる。
//   hk_food  『好物』：交番の 奥の 壁と、灰色の 鉄の 机（前の 面と 上の 面）。食べ物 5つは 机の 上に
//            立てて 押し出す（2D と 同じ 横の 位置、さわる 当たりと 重なる 所）。えらんだ 物は 少し 上がる。
//            グソっ君・カーソル・名前は 2D の まま 上に。
//
// 置き場所は パネルの 2D の 座標で（Kit.atDepth / Kit.ground）。

import * as THREE from 'three';
import { PixelCanvas, mix } from '../../engine/pixel';
import { Rng } from '../../engine/rng';
import { P } from '../../art/tiles/palette';
import { registerPanel3d, type Kit } from '../panel3d';
import { hkFoodImg } from '../../ui/hokokusho_games';
import { lamp, once, propImg } from './_kit_a';

/** 交番の 壁（上 しっくい、木の 見切り、下 板の 腰壁）：w × h ドット、腰の 高さ wain。
 *  生活感（2026-11-24 依頼主「足して」）：雨じみ・手あかの 黒ずみ・画びょうの 跡・セロハンテープの 残り・
 *  腰壁の すり傷と 床ぎわの ほこり・板の 節。 */
function wallImg(w: number, h: number, wain: number): HTMLCanvasElement {
  return once(`hk:wall:${w}x${h}:${wain}`, () => {
    const p = new PixelCanvas(w, h);
    const rng = new Rng(w + h);
    const top = h - wain;
    // ゆっくり 変わる むら（しっくいの 色むら・雨じみ）
    const blot = (x: number, y: number) => Math.sin(x / 23 + Math.sin(y / 17) * 1.5) * 0.5 + Math.sin(y / 11 + x / 37) * 0.5;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let c: string;
        if (y < top - 2) {
          c = rng.next() > 0.93 ? P.white : P.concreteLt;
          const b = blot(x, y);
          if (b > 0.55) c = mix(c, '#C8BEA8', 0.35);
          else if (b < -0.7) c = mix(c, '#FFFFFF', 0.25);
          if (rng.next() > 0.985) c = mix(c, '#9A9284', 0.5);
          // 天井から 下りる うすい 雨じみの すじ
          if ((x * 7) % 61 < 2 && y < (top - 2) * (0.3 + ((x * 13) % 7) / 14)) c = mix(c, '#B8AE98', 0.3);
        } else if (y < top) c = y === top - 2 ? P.woodLt : P.wood;
        else if (x % 8 === 7) c = P.woodDark;
        else {
          const plank = Math.floor(x / 8);
          c = ((plank * 7) % 5) > 2 ? mix(P.woodLt, P.wood, 0.4) : mix(P.wood, P.woodLt, 0.25);
          // 板目（縦の すじ）
          if (Math.sin(y / 3 + plank * 1.7 + (x % 8) * 0.9) > 0.8) c = mix(c, P.woodDark, 0.35);
          // 手あか・すり傷（腰の 高さ）と 床ぎわの ほこり
          if (y < top + 6 && rng.next() > 0.9) c = mix(c, '#3A2A22', 0.3);
          if (y > h - 8 && rng.next() > 0.7) c = mix(c, '#7A7468', 0.35);
          if (rng.next() > 0.995) c = mix(c, '#E8D8B8', 0.5);
        }
        p.set(x, y, c);
      }
    // 板の 節
    for (let i = 0; i < Math.floor(w / 40); i++) {
      const x = 4 + Math.floor(rng.next() * (w - 8));
      const y = top + 4 + Math.floor(rng.next() * Math.max(1, wain - 10));
      p.ellipse(x, y, 1.5, 1, P.woodDark);
    }
    // 画びょうの 跡・テープの 残り（はがした 掲示の 名残）
    for (let i = 0; i < Math.floor(w / 25); i++) {
      const x = Math.floor(rng.next() * (w - 20));
      const y = 4 + Math.floor(rng.next() * Math.max(1, top - 30));
      if (rng.next() < 0.5) {
        p.set(x, y, '#8A8478');
        p.set(x + 14, y, '#8A8478');
      } else {
        p.rect(x, y, 5, 2, '#E8E0B8');
        p.rect(x + 16, y + 18, 5, 2, '#E0D8B0');
      }
    }
    // 腰壁の 上の 影、床ぎわの 幅木
    p.hline(0, w - 1, top + 1, mix(P.wood, P.woodDark, 0.5));
    p.rect(0, h - 3, w, 3, P.woodDark);
    p.hline(0, w - 1, h - 3, mix(P.woodDark, P.woodLt, 0.35));
    return p.toCanvas();
  });
}

/** 壁の 小物（コンセント・スイッチ・掲示・カレンダー・交通安全の ポスター）。 */
function outletImg(): HTMLCanvasElement {
  return once('hk:outlet', () => {
    const p = new PixelCanvas(6, 8);
    p.fill('#ECE8DC');
    p.hline(0, 5, 0, '#FFFFFF');
    p.vline(5, 0, 7, '#B8B2A4');
    p.hline(0, 5, 7, '#9A9488');
    p.vline(2, 2, 3, '#3A3A40');
    p.vline(3, 2, 3, '#3A3A40');
    p.vline(2, 5, 6, '#3A3A40');
    p.vline(3, 5, 6, '#3A3A40');
    return p.toCanvas();
  });
}
function switchImg(): HTMLCanvasElement {
  return once('hk:switch', () => {
    const p = new PixelCanvas(6, 9);
    p.fill('#ECE8DC');
    p.hline(0, 5, 0, '#FFFFFF');
    p.vline(5, 0, 8, '#B8B2A4');
    p.rect(2, 2, 2, 5, '#D8D2C4');
    p.set(2, 2, '#FFFFFF');
    p.hline(1, 4, 8, '#7A7468');
    return p.toCanvas();
  });
}
function calendarImg(): HTMLCanvasElement {
  return once('hk:cal', () => {
    const p = new PixelCanvas(18, 24);
    p.fill('#F4F1E8');
    p.rect(0, 0, 18, 9, '#6A9AC8');
    p.rect(2, 2, 14, 5, '#9AC8E0');
    p.rect(4, 4, 6, 3, '#4E8A4E');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 5; c++) p.set(2 + c * 3, 11 + r * 3, c === 0 ? '#C83A3A' : '#5A5A68');
    p.set(8, 14, '#C83A3A');
    p.ring(8, 14, 1.5, 1.5, '#C83A3A');
    p.hline(0, 17, 23, '#C8C2B4');
    p.set(9, 0, '#3A3A40');
    p.outline('#8E8A80');
    return p.toCanvas();
  });
}
function posterImg(): HTMLCanvasElement {
  return once('hk:poster', () => {
    const p = new PixelCanvas(20, 28);
    p.fill('#F8F0D8');
    // 交通安全：手を あげて 横断歩道を わたる 子（字の かわりの 絵）
    p.rect(0, 0, 20, 5, '#2E5AA8');
    p.hline(2, 17, 2, '#F4F1E8');
    for (let i = 0; i < 5; i++) p.rect(1 + i * 4, 22, 2, 4, '#F4F1E8');
    p.rect(0, 21, 20, 1, '#5A5A68');
    p.rect(0, 26, 20, 2, '#5A5A68');
    p.circle(10, 10, 2, '#E8B890');
    p.rect(9, 12, 3, 5, '#F2C230');
    p.vline(12, 7, 12, '#E8B890');
    p.vline(9, 17, 20, '#3A3A48');
    p.vline(11, 17, 20, '#3A3A48');
    p.rect(8, 7, 5, 2, '#E23B2E');
    p.outline('#9A9080');
    // 角の 1つが めくれて いる
    p.set(19, 27, 0);
    p.set(18, 27, '#D8D0B8');
    p.set(19, 26, '#D8D0B8');
    return p.toCanvas();
  });
}

/** 壁に 小物を 貼る：パネルの px（左上）・奥行き zw の 壁から 少し 手前。 */
function onWall(k: Kit, img: HTMLCanvasElement, px: number, py: number, zw: number, depth = 1, scale = 1): void {
  const at = k.atDepth(px, py + img.height * scale, zw + 0.03)!;
  k.stand(img, at, { px: k.pxAt(-zw) * scale, depth, anchor: 'left' });
}

/** 交番の 床（灰緑の タイル、目地、すり減りと 靴の 黒い あと）。 */
function floorImg(): HTMLCanvasElement {
  return once('hk:floor', () => {
    const p = new PixelCanvas(64, 64);
    const rng = new Rng(141);
    for (let y = 0; y < 64; y++)
      for (let x = 0; x < 64; x++) {
        let c = (Math.floor(x / 16) + Math.floor(y / 16)) % 2 ? '#B8BCB0' : '#C8CCC0';
        if (Math.sin(x / 9 + y / 13) > 0.7) c = mix(c, '#D8DCD0', 0.4);
        if (x % 16 === 0 || y % 16 === 0) c = '#8E9288';
        if (rng.next() > 0.95) c = mix(c, '#6E7268', 0.5);
        if (rng.next() > 0.995) c = '#4A4A48';
        p.set(x, y, c);
      }
    p.line(20, 40, 27, 37, mix('#B8BCB0', '#3A3A40', 0.4));
    return p.toCanvas();
  });
}

/** 使いこんだ 木（濃い 板目・節・ふちの すり減り）：w × h、edge：上の ふちの すり減り。 */
function woodImg(key: string, w: number, h: number, base: string, edge: boolean): HTMLCanvasElement {
  return once(`hk:wood:${key}:${w}x${h}`, () => {
    const p = new PixelCanvas(w, h);
    const rng = new Rng(w * 3 + h);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const g1 = Math.sin(y * 1.3 + Math.sin(x / 11) * 2.2 + Math.sin(x / 29) * 1.5);
        let c = base;
        if (g1 > 0.6) c = mix(base, P.woodDark, 0.45);
        else if (g1 > 0.2) c = mix(base, P.woodDark, 0.18);
        else if (g1 < -0.75) c = mix(base, P.woodLt, 0.3);
        if (rng.next() > 0.97) c = mix(c, '#3A2418', 0.4);
        p.set(x, y, c);
      }
    // 節
    for (let i = 0; i < Math.max(1, Math.floor(w / 30)); i++) {
      const x = 3 + Math.floor(rng.next() * (w - 6));
      const y = 1 + Math.floor(rng.next() * Math.max(1, h - 2));
      p.ellipse(x, y, 2, 1, '#4A2A1A');
      p.set(x, y, '#2A1A10');
    }
    if (edge) {
      // ふちの すり減り（明るく 毛ば立つ）と 角の 欠け
      for (let x = 0; x < w; x++) {
        if (rng.next() > 0.3) p.set(x, 0, mix(base, '#F0D8A8', 0.55));
        if (rng.next() > 0.6) p.set(x, 1, mix(base, '#E8C890', 0.3));
        if (rng.next() > 0.5) p.set(x, h - 1, mix(base, '#2A1A10', 0.5));
      }
      p.set(0, 0, 0);
      p.set(1, 0, 0);
      p.set(0, 1, 0);
      p.set(w - 1, 0, 0);
    }
    return p.toCanvas();
  });
}

/** 交番の 鉄の 机（灰の 塗り：すり傷・塗りの はげ・角の 光）。 */
function steelImg(key: string, w: number, h: number, base: string): HTMLCanvasElement {
  return once(`hk:steel:${key}`, () => {
    const p = new PixelCanvas(w, h);
    const rng = new Rng(w + h * 7);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        let c = base;
        if (Math.sin(x / 13 + y / 7) > 0.85) c = mix(c, '#B8BEC8', 0.25);
        if (rng.next() > 0.985) c = mix(c, '#5A5F6E', 0.35);
        p.set(x, y, c);
      }
    for (let i = 0; i < 10; i++) {
      const x = Math.floor(rng.next() * (w - 12));
      const y = 2 + Math.floor(rng.next() * (h - 4));
      p.line(x, y, x + 4 + Math.floor(rng.next() * 8), y + (rng.next() < 0.5 ? 0 : 1), '#C8CCD4');
    }
    // 塗りの はげ（下の 鉄の 色）
    for (let i = 0; i < 3; i++) p.ellipse(4 + Math.floor(rng.next() * (w - 8)), 3 + Math.floor(rng.next() * (h - 6)), 1.5, 1, '#6A6460');
    p.hline(0, w - 1, 0, '#D8DCE4');
    p.hline(0, w - 1, h - 1, '#5A5F6E');
    return p.toCanvas();
  });
}

/** 身長計の 柱（つや消しの 銀：左が 光り 右が 陰、細い すり傷）。 */
function poleImg(h: number): HTMLCanvasElement {
  return once(`hk:pole:${h}`, () => {
    h = h * 2 + 40;
    const p = new PixelCanvas(8, h);
    const tones = ['#B8C0CA', '#F4F8FC', '#FFFFFF', '#E8EEF4', '#D0D8E0', '#B8C2CC', '#98A2AE', '#7A848E'];
    for (let x = 0; x < 8; x++) p.vline(x, 0, h - 1, tones[x]);
    const rng = new Rng(h);
    for (let y = 0; y < h; y += 1) if (rng.next() > 0.92) p.set(2 + Math.floor(rng.next() * 4), y, '#C8CED6');
    // 光の すじが ところどころ 強く（上の 明かりの 映り）
    for (let y = 6; y < h; y += 37) p.vline(2, y, Math.min(h - 1, y + 5), '#FFFFFF');
    return p.toCanvas();
  });
}

/** 柱の 左の 細かい 目盛りの 板（1cm ごと、5cm で 長く：2D の 10cm の 目盛りの 下に）。 */
function rulerImg(h: number, fy: number, ppc: number): HTMLCanvasElement {
  return once(`hk:ruler:${h}:${fy}:${ppc}`, () => {
    const p = new PixelCanvas(6, h);
    p.fill('#F4F0E4');
    p.vline(5, 0, h - 1, '#C8C2B4');
    p.vline(0, 0, h - 1, '#FFFFFF');
    for (let cm = 0; cm <= 200; cm++) {
      const y = Math.round(fy - cm * ppc);
      if (y < 0) break;
      if (y >= h) continue;
      const len = cm % 10 === 0 ? 5 : cm % 5 === 0 ? 4 : 2;
      p.hline(6 - len, 5, y, cm % 10 === 0 ? '#2A2A3A' : '#5A5A6E');
    }
    return p.toCanvas();
  });
}

function plain(c: string, w = 8, h = 8, hi?: string, lo?: string): HTMLCanvasElement {
  return once(`hk:plain:${c}:${w}x${h}:${hi}:${lo}`, () => {
    const p = new PixelCanvas(w, h);
    p.fill(c);
    if (hi) p.hline(0, w - 1, 0, hi);
    if (lo) p.hline(0, w - 1, h - 1, lo);
    return p.toCanvas();
  });
}

/** 部屋の 奥の 壁と 床：壁の 面の 奥行き zw、床の 行 fpy（パネルの px）。床の 高さを 返す。 */
function room(k: Kit, zw: number, fpy: number, wain: number): number {
  const W = k.w;
  const H = k.h;
  const [x0, x1] = [k.atDepth(-30, fpy, zw)!.x, k.atDepth(W + 30, fpy, zw)!.x];
  const yf = k.atDepth(0, fpy, zw)!.y;
  const yt = k.atDepth(0, -40, zw)!.y;
  const pxw = k.pxAt(-zw);
  const wh = Math.round((yt - yf) / pxw);
  const ww = Math.round((x1 - x0) / pxw);
  k.box(x0, x1, yf, yt, zw - 0.2, zw, { front: wallImg(ww, wh, Math.round(wain)) });
  k.tiled(floorImg(), x0 - 4, x1 + 4, zw, 2, yf, Math.round(1 / pxw));
  void H;
  return yf;
}

/** 壁の 時計（フィールドの 交番の 時計）。 */
function clock(k: Kit, px: number, py: number, zw: number): void {
  const img = propImg('in_kb_clock');
  if (img) k.stand(img, k.atDepth(px, py, zw + 0.05)!, { px: k.pxAt(-zw) * 1.6, depth: 2 });
}

// ---------------------------------------------------------------- 大きさ

registerPanel3d('hk_size', {
  cam: { fov: 28, pitch: 0, pos: [0, 0, 0], near: 0.2, far: 60 },
  light: 'room',
  fog: null,
  shadow: { x: 0, z: -6, hw: 5, hd: 3 },
  focus: 0.7,
  tilt: 0.4,
  build(k, s) {
    const ZW = -6;
    // （窓の 中の y 124 が 身長計の 台の 上 = この 絵の 行 fy）
    const fy = Number(s.fy ?? 102);
    const pole = Number(s.pole ?? 66);
    const yf = room(k, ZW, fy + 5, 26);
    // 身長計の 木の 台（2D の 床の 板と 同じ 横の はば：x+40〜190）。濃い 板目と すり減った ふち
    const [bx0, bx1] = [Number(s.b0 ?? 36), Number(s.b1 ?? 186)];
    const zf = ZW + 1.4;
    const t0 = k.atDepth(bx0, fy, ZW + 0.6)!;
    const t1 = k.atDepth(bx1, fy, ZW + 0.6)!;
    const bw = bx1 - bx0;
    k.box(t0.x, t1.x, yf, t0.y, ZW + 0.05, zf, {
      front: woodImg('front', bw, 8, '#A87A4A', true),
      top: woodImg('top', bw, 24, '#B88A56', true),
      left: woodImg('side', 16, 8, '#7A4E30', false),
      right: woodImg('side', 16, 8, '#7A4E30', false),
    });
    // 柱：銀の 角柱（左が 光り 右が 陰）、左に 細かい 目盛りの 板
    const p0 = k.atDepth(pole, fy, ZW + 0.3)!;
    const p1 = k.atDepth(pole + 4, -20, ZW + 0.3)!;
    const ph = fy + 20;
    // （光を 受けない 銀：つやの すじが 絵の まま 見える。押し出して 厚み）
    k.stand(poleImg(ph), new THREE.Vector3(p0.x, t0.y, ZW + 0.3), { px: (p1.x - p0.x) / 8, depth: 6, anchor: 'left', unlit: true, rows: [0, Math.min(ph * 2 + 40, Math.round((p1.y - t0.y) / ((p1.x - p0.x) / 8)))] });
    const ppc = Number(s.ppc ?? 0.6);
    const r0 = k.atDepth(pole - 6, fy, ZW + 0.22)!;
    const r1 = k.atDepth(pole, -20, ZW + 0.22)!;
    k.quad(rulerImg(ph, fy + 20, ppc), [r0.x, t0.y, ZW + 0.22], [r1.x, t0.y, ZW + 0.22], [r1.x, r1.y, ZW + 0.22], [r0.x, r1.y, ZW + 0.22]);
    clock(k, 26, 30, ZW);
    // 壁の 小物：掲示板（交番の 落とし物の 掲示）、交通安全の ポスター、カレンダー、コンセントと スイッチ
    const board = propImg('in_kb_board');
    if (board) onWall(k, board, k.w - 52, 10, ZW, 2, 1.3);
    onWall(k, posterImg(), 8, 44, ZW, 1);
    onWall(k, calendarImg(), k.w - 88, 22, ZW, 1);
    onWall(k, outletImg(), k.w - 30, fy - 16, ZW, 1);
    onWall(k, switchImg(), 14, 22, ZW, 1);
    // 天井の 明かり（右上の 手前）
    lamp(k, new THREE.Vector3(1.5, 2.2, ZW + 3), { color: '#fff0dc', i: 3, dist: 9, decay: 1.2 });
  },
});

// ---------------------------------------------------------------- 足の 数（上から 見た 机）

function matImg(): HTMLCanvasElement {
  return once('hk:mat', () => {
    // 使いこんだ 緑の デスクマット：色むら・こすれた 白っぽい 所・小さな 傷・消しゴムの かす
    const p = new PixelCanvas(96, 96);
    const rng = new Rng(9);
    for (let y = 0; y < 96; y++)
      for (let x = 0; x < 96; x++) {
        let c = rng.next() > 0.96 ? '#5E8A6A' : '#4E7A5E';
        const m = Math.sin(x / 17 + Math.sin(y / 13) * 2) + Math.sin(y / 23 - x / 31);
        if (m > 1.1) c = mix(c, '#7AA088', 0.35);
        else if (m < -1.2) c = mix(c, '#3A5E48', 0.4);
        if (rng.next() > 0.9985) c = '#C8D8C8';
        p.set(x, y, c);
      }
    for (let i = 0; i < 6; i++) {
      const x = Math.floor(rng.next() * 80);
      const y = Math.floor(rng.next() * 90);
      p.line(x, y, x + 6 + Math.floor(rng.next() * 10), y + Math.floor(rng.next() * 3) - 1, '#6E9A7E');
    }
    return p.toCanvas();
  });
}
function deskTopImg(): HTMLCanvasElement {
  return once('hk:desktop', () => {
    const p = new PixelCanvas(64, 64);
    for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) p.set(x, y, (x + y * 3) % 23 === 0 ? '#A8ACB4' : '#B8BCC4');
    return p.toCanvas();
  });
}
function paperImg(): HTMLCanvasElement {
  return once('hk:paper', () => {
    const p = new PixelCanvas(36, 48);
    p.fill('#E0DCD0');
    p.rect(3, 3, 30, 4, '#C8C2B4');
    for (let y = 11; y < 46; y += 5) p.hline(3, 32, y, '#C8CCD4');
    p.vline(12, 9, 45, '#C8CCD4');
    p.rect(26, 38, 6, 6, '#E8A8A0');
    p.outline('#8E8A80');
    return p.toCanvas();
  });
}
function pencilImg(): HTMLCanvasElement {
  return once('hk:pencil', () => {
    const p = new PixelCanvas(30, 3);
    p.rect(0, 0, 24, 3, '#2E6A3A');
    p.hline(0, 23, 0, '#4E9A5A');
    p.rect(24, 0, 4, 3, '#E8C890');
    p.set(28, 1, '#3A3A40');
    return p.toCanvas();
  });
}
function cupImg(): HTMLCanvasElement {
  return once('hk:cup', () => {
    const p = new PixelCanvas(16, 16);
    p.circle(8, 8, 7, '#8A6A4A');
    p.circle(8, 8, 6, '#B89A6A');
    p.circle(8, 8, 5, '#7A8A3A');
    p.set(6, 6, '#A8B85A');
    return p.toCanvas();
  });
}
function hankoImg(): HTMLCanvasElement {
  return once('hk:hanko', () => {
    const p = new PixelCanvas(22, 12);
    p.rect(0, 1, 12, 10, '#3A3A48');
    p.rect(1, 2, 10, 8, '#C83A3A');
    p.circle(17, 6, 3, '#C8A06A');
    p.circle(17, 6, 2, '#E8C890');
    return p.toCanvas();
  });
}

registerPanel3d('hk_legs', {
  // 真上から 少し 手前へ ねかせた 目（机の 面が パネルいっぱいに）
  cam: { fov: 30, pitch: 78, pos: [0, 6, 1.2], near: 0.2, far: 40 },
  light: 'room',
  fog: null,
  shadow: { x: 0, z: 0, hw: 5, hd: 4 },
  focus: 0.5,
  tilt: 0.35,
  build(k) {
    // 机の 面（鉄の 机：灰）と その 上の 緑の デスクマット
    k.tiled(deskTopImg(), -8, 8, -8, 8, 0, 14);
    const m0 = k.ground(18, 2, 0.01)!;
    const m1 = k.ground(k.w - 18, k.h - 2, 0.01)!;
    const mat = k.tiled(matImg(), m0.x, m1.x, m0.z, m1.z, 0.01, Math.round(1 / k.pxAt(6)));
    mat.receiveShadow = true;
    // 机の 上の 物（2D の グソっ君の まわり：はしに）
    const lay = (img: HTMLCanvasElement, px: number, py: number, s: number, rot = 0, h = 0.02) => {
      const c = k.ground(px, py, h)!;
      const w = img.width * s;
      const d = img.height * s;
      const g = k.own(new THREE.PlaneGeometry(w, d));
      g.rotateX(-Math.PI / 2);
      g.rotateY(rot);
      const mesh = new THREE.Mesh(g, k.material(k.tex(img)));
      mesh.position.copy(c);
      mesh.receiveShadow = true;
      k.scene.add(mesh);
      return mesh;
    };
    const px = k.pxAt(6);
    lay(paperImg(), 30, 50, px * 1.2, 0.08);
    lay(pencilImg(), 40, 92, px * 1.2, -0.3, 0.05);
    lay(hankoImg(), k.w - 34, 86, px * 1.3, 0.1, 0.04);
    // 湯のみ（立てて：上から 見た 丸）
    const cup = k.ground(k.w - 30, 30, 0)!;
    const cg = k.own(new THREE.CylinderGeometry(0.28, 0.24, 0.45, 12));
    const cm = k.material(k.tex(cupImg()));
    const cyl = new THREE.Mesh(cg, cm);
    cyl.position.set(cup.x, 0.22, cup.z);
    cyl.castShadow = true;
    k.scene.add(cyl);
    lamp(k, new THREE.Vector3(-2, 4, -1), { color: '#fff0dc', i: 1.5, dist: 12, decay: 1.2 });
  },
});

// ---------------------------------------------------------------- 好物（鉄の 机の 上の 食べ物）

registerPanel3d('hk_food', {
  cam: { fov: 28, pitch: 14, pos: [0, 1.6, 0], near: 0.2, far: 60 },
  light: 'room',
  fog: null,
  shadow: { x: 0, z: -5, hw: 6, hd: 3 },
  focus: 0.6,
  tilt: 0.4,
  build(k, s) {
    const dy = Number(s.dy ?? 44);
    const ZW = -9;
    room(k, ZW, dy + 4, 30);
    clock(k, 30, 14, ZW);
    // 壁の 小物（グソっ君の うしろを あけて 左右に）
    onWall(k, posterImg(), 62, 2, ZW, 1);
    onWall(k, calendarImg(), k.w - 70, 4, ZW, 1);
    const board = propImg('in_kb_board');
    if (board) onWall(k, board, k.w - 44, 2, ZW, 2, 1.1);
    onWall(k, outletImg(), 16, dy - 12, ZW, 1);
    // 鉄の 机：上の 面は dy - 2 〜 dy + 38、前の 面は その 下（食べ物の 上の はしが グソっ君の 足より 下）（2D の 机と 同じ 横の はば）
    const [dx0, dx1] = [Number(s.d0 ?? 10), Number(s.d1 ?? k.w - 10)];
    const zFront = -4.6;
    const front = k.atDepth(dx0, dy + 38, zFront)!;
    const yTop = front.y;
    const back = k.ground(dx0, dy - 2, yTop)!;
    const r = k.atDepth(dx1, dy + 38, zFront)!;
    const fb = k.atDepth(dx0, k.h + 10, zFront)!;
    k.box(front.x, r.x, fb.y, yTop, back.z, zFront, {
      front: steelImg('front', 96, 24, '#8A90A0'),
      top: steelImg('top', 96, 32, '#9AA0AC'),
    });
    // 引き出しの 線（前の 面）
    const dr = once('hk:drawer', () => {
      const p = new PixelCanvas(64, 3);
      p.hline(0, 63, 1, '#5A5F6E');
      p.hline(28, 36, 0, '#C8CCD4');
      return p.toCanvas();
    });
    const l0 = k.atDepth(dx0 + 8, dy + 48, zFront + 0.01)!;
    const l1 = k.atDepth(dx1 - 8, dy + 50, zFront + 0.01)!;
    k.quad(dr, [l0.x, l1.y, zFront + 0.01], [l1.x, l1.y, zFront + 0.01], [l1.x, l0.y, zFront + 0.01], [l0.x, l0.y, zFront + 0.01]);
    // 食べ物（2D の 絵を 2倍で、机の 上に 立てる。えらんだ 物は 少し 上がる、ためした 物は 色を 落とす）
    const xs = (s.xs as number[]) ?? [];
    const imgs = (s.imgs as string[]) ?? [];
    const tried = (s.tried as number[]) ?? [];
    const foods: { m: THREE.Mesh; y: number; lift: number }[] = [];
    const zFood = (back.z + zFront) / 2 + 0.2;
    xs.forEach((x, i) => {
      const img = hkFoodImg(imgs[i]);
      const at = k.ground(x + 20, dy + 36, yTop)!;
      at.z = Math.max(at.z, zFood - 0.3);
      const px = k.pxAt(-at.z) * 2;
      const m = k.stand(img, at, { px, depth: 6, tint: tried.includes(i) ? '#8A8A8A' : undefined });
      foods.push({ m, y: at.y, lift: tried.includes(i) ? 0 : k.pxAt(-at.z) * 3 });
    });
    k.bag.foods = foods;
    lamp(k, new THREE.Vector3(1.5, 3.4, -2), { color: '#fff0dc', i: 2.4, dist: 10, decay: 1.2 });
  },
  update(k, _t, s) {
    // えらんで いる 物が 少し 上がる（2D と 同じ）
    const sel = Number(s.sel ?? -1);
    const foods = (k.bag.foods as { m: THREE.Mesh; y: number; lift: number }[]) ?? [];
    foods.forEach((f, i) => (f.m.position.y = f.y + (i === sel ? f.lift : 0)));
    k.shadowDirty = true;
  },
});
