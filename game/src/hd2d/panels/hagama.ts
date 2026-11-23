// 大写し「羽釜の 中」（水加減）と「かまど」（はじめ ちょろちょろ）（第2章 ペロの 家の 土間、
// events/ch2/hagama.ts MizuPanel・HiPanel）を HD-2D で（2026-11-23 依頼主「ミニゲームの絵が雑すぎるから
// …HD -2Dにして」）。
//
// 見せる 物は 2D の 絵と 同じ：
//   hg_mizu  暗い 土間、ランプの 暖かい 光。切って 中を 見せた 羽釜（つば）、研いだ 米、米の 上の 水
//            （高さは 2D と 同じ px）、米に 立てた 人さし指と こぶし・腕（水の 下は 水の 色が かかる）。
//            ふしの しるしの 点線・ひしゃく・注ぐ 水は 2D の まま 上に 乗る。
//   hg_hi    暗い 土間、かまど（土の 色、ひび、口の 中は 暗い）、口の 中の 火（大きさ 0〜4、2D と 同じ
//            速さで ゆれる：animated 20fps）・おき・薪（入れた 数）、上に 羽釜と 木の ふた。火の 光は 点の 光
//            （火の 大きさで 強く）。湯気・泡・吹く 息・音の 字は 2D の まま 上に 乗る。
// 釜は 2D の drawKama と 同じ 形を、鉄の 鈍い 光・さび・すすまで 描き込んで 立てて 押し出す（ふたは 木目、かまどは
// 土の まだら・ひび・れんがの 焚き口・すす・こげ）。絵の 部分と 同じ 大きさの キャンバスに
// 2D の 座標の まま 描いて 立てるので、2D の 上の 物（点線・ひしゃく・湯気）と ずれない。

import * as THREE from 'three';
import { PixelCanvas } from '../../engine/pixel';
import { fillWall, wallBoards } from '../../art/props/bkit';
import { texHoshiDirt } from '../../art/tiles/hoshi_ground';
import { MZ_BOT, MZ_TOP, RICE_TOP, WRIST } from '../../events/ch2/hagama';
import { registerPanel3d, type Kit } from '../panel3d';
import { crack, fade, grain, lamp, once, paint, ramp, ROOM_LAMP, soft } from './_kit_b';
import { h01 } from '../../art/tiles/noise';

/** 絵の 部分（2D の drawScene の 幅）。立てる 絵は 幅 208（真ん中 = 2D の cx 104）。 */
const W = 206;
const H = 112;
const FW = 208;
const CX = 104;
const D = 12;

function dirtImg(): HTMLCanvasElement {
  return once('hgdirt', () =>
    paint(64, 64, (g) => {
      const p = new PixelCanvas(64, 64);
      for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) p.set(x, y, texHoshiDirt(x, y, 2));
      g.ctx.drawImage(p.toCanvas(), 0, 0);
      g.rect(0, 0, 64, 64, '#2A1E16', 0.45);
    }),
  );
}

function wallImg(): HTMLCanvasElement {
  return once('hgwall', () => {
    const p = new PixelCanvas(260, 140);
    fillWall(p, 0, 0, 260, 140, wallBoards('#4A3C30', 7, 6));
    return p.toCanvas();
  });
}

/** 土間の 床と 奥の 板壁（どちらの 大写しも）。floorRow：床が 2D の 絵の 何行目に 来るか（奥行き D で）。 */
function doma(k: Kit, floorRow: number): void {
  const px = k.pxAt(D);
  k.camera.position.y = (floorRow - H / 2) * px;
  k.camera.updateMatrixWorld();
  k.tiled(dirtImg(), -30, 30, -D - 8, -D + 8, 0, 20);
  const z = -D - 6;
  const a = k.atDepth(-30, -30, z)!;
  const b = k.atDepth(W + 30, H, z)!;
  k.quad(wallImg(), [a.x, 0, z], [b.x, 0, z], [b.x, a.y, z], [a.x, a.y, z]);
}

// ---------------------------------------------------------------- 水加減

const half = (y: number) => Math.round(54 - ((y - MZ_TOP) / (MZ_BOT - MZ_TOP)) ** 2 * 18) - 4;



// ---------------------------------------------------------------- 描き込んだ 絵（羽釜・ふた・かまど・米・指）

const IRON = ['#0E0E12', '#16161C', '#1E1E26', '#282832', '#34343E', '#42424E', '#54545F', '#6A6A76'];
const RUST = ['#4A2A1C', '#6A3A22', '#8A4A28', '#A86436'];

/** 鉄の 1ドット：左上から 光（u：-1 左 … 1 右）、鈍い 光の 帯、まだら、さび。 */
function ironAt(x: number, y: number, u: number, rustK: number, seed: number): string {
  const n = soft(x, y, 6, seed) - 0.5;
  const band = Math.exp(-(((u + 0.45) / 0.16) ** 2));
  let l = 0.4 - 0.34 * u + n * 0.26 + band * 0.3 + (grain(x, y, seed) - 0.5) * 0.08;
  const r = soft(x, y, 5, seed + 3);
  if (r > 0.84 - rustK * 0.2 && grain(x, y, seed + 9) < 0.6) return ramp(RUST, (r - 0.6) * 2.2 + (grain(x, y, seed + 2) - 0.5) * 0.3);
  if (grain(x, y, seed + 4) < 0.012) l += 0.25;
  return ramp(IRON, l);
}

/** 羽釜（2D の drawKama と 同じ 形）。cut：切って 中を 見せる（鉄の 断面・中の 暗さ）。 */
function kamaArt(p: PixelCanvas, cx: number, top: number, bot: number, cut: boolean): void {
  const half = (y: number) => Math.round(54 - ((y - top) / (bot - top)) ** 2 * 18);
  for (let y = top; y <= bot; y++) {
    const h = half(y);
    const nearFlange = Math.max(0, 1 - Math.abs(y - (top + 14)) / 8);
    for (let x = cx - h; x < cx + h; x++) {
      const u = (x - cx + 0.5) / h;
      let c = ironAt(x, y, u, nearFlange * 0.8 + (y > bot - 6 ? 0.3 : 0), 61);
      // 底の すす
      if (y > bot - 5 && grain(x, y, 63) < 0.6) c = IRON[grain(x, y, 64) < 0.5 ? 0 : 1];
      p.set(x, y, c);
    }
    if (cut && y >= top + 4 && y <= bot - 4) {
      // 中（切った 所）：鉄の 断面（明るい 縁）と、奥の 暗い 内側
      const hi = half(y) - 4;
      for (let x = cx - hi; x < cx + hi; x++) {
        // 内側の 奥の 壁：まん中が 少し 明るい 丸み、上は 暗い、古い 水の 線の しみ
        const u = (x - cx + 0.5) / hi;
        let v = 0.42 - Math.abs(u) * 0.3 - (1 - (y - top) / (bot - top)) * 0.18 + (soft(x, y, 7, 71) - 0.5) * 0.18;
        if (Math.abs(y - (top + 30)) < 1 || Math.abs(y - (top + 36)) < 1) v += 0.12;
        let c = ramp(['#0C0B0E', '#141318', '#1C1A22', '#26242E', '#302E3A', '#3C3A46'], v * 1.6);
        if (soft(x, y, 4, 73) > 0.8 && grain(x, y, 74) < 0.5) c = '#4A2A1C';
        p.set(x, y, c);
      }
      for (const x of [cx - hi - 1, cx + hi]) p.set(x, y, grain(x, y, 72) < 0.25 ? '#8A4A28' : '#7A7A86');
      p.set(cx - hi - 2, y, '#5A5A66');
    }
  }
  // 口の ふち
  for (let x = cx - half(top); x < cx + half(top); x++) p.set(x, top, grain(x, top, 66) < 0.2 ? '#6A3A22' : '#6A6A76');
  // つば（まわりの 張り出し）：上が 光り、下は 影、さびと へこみ
  const ty = top + 12;
  for (let x = cx - 64; x < cx + 64; x++) {
    const u = (x - cx) / 64;
    for (let j = 0; j < 4; j++) {
      const l = [0.85, 0.62, 0.45, 0.22][j] - u * 0.22 + (soft(x, j, 4, 67) - 0.5) * 0.2;
      let c = ramp(IRON, l);
      if (soft(x, j * 3, 4, 68) > 0.74 && grain(x, j, 69) < 0.8) c = ramp(RUST, 0.4 + grain(x, j, 70) * 0.6);
      p.set(x, ty + j, c);
    }
  }
}

/** 木の ふた（板 4枚の 厚みの 面：木目・継ぎ目・くぎ）と 取っ手。 */
function lidArt(p: PixelCanvas, cx: number): void {
  const WOOD = ['#6A4428', '#8A5C34', '#A2703E', '#B8864A', '#CC9A5C', '#DCB074'];
  const x0 = cx - 50;
  for (let x = x0; x < cx + 50; x++) {
    const plank = Math.floor((x - x0) / 25);
    const px0 = x0 + plank * 25;
    for (let y = 22; y < 30; y++) {
      const g = Math.sin((x * 0.35 + Math.sin(x * 0.09 + plank * 2) * 3 + y * 1.7 + plank * 5) * 1.1);
      let l = 0.55 + g * 0.12 + (soft(x, y, 9, 80 + plank) - 0.5) * 0.25 - (y - 22) * 0.03;
      if (y === 22) l = 0.92;
      if (y === 29) l = 0.1;
      if (x === px0 && plank > 0) l = 0.05;
      if (x === px0 + 1 && plank > 0) l += 0.15;
      // 節
      const kx = px0 + 9 + plank * 3;
      if (Math.hypot(x - kx, (y - 26) * 1.6) < 1.6) l = 0.15;
      p.set(x, y, ramp(WOOD, l));
    }
    // 湯気で 黒ずんだ 下の ふち
    if (grain(x, 28, 83) < 0.4) p.set(x, 28, WOOD[1]);
  }
  for (const x of [x0 + 12, x0 + 37, x0 + 62, x0 + 87]) p.set(x, 25, '#3A3A44');
  // 取っ手（横木）
  for (let x = cx - 8; x < cx + 8; x++)
    for (let y = 18; y < 22; y++) p.set(x, y, ramp(WOOD, [0.75, 0.55, 0.42, 0.2][y - 18] + (grain(x, y, 85) - 0.5) * 0.15));
  p.set(cx - 8, 18, WOOD[5]);
  p.set(cx + 7, 21, WOOD[0]);
}

/** かまどの 前（140 × 54）：土の しっくい、れんがの 焚き口、ひび、すす、こげ。 */
function kamadoArt(): HTMLCanvasElement {
  return once('hgkamado2', () => {
    const p = new PixelCanvas(140, 54);
    const CLAY = ['#4A2C1C', '#5E3A24', '#74482C', '#8A5A3A', '#9A6844', '#AC7A50', '#BE8E60'];
    const mx = 70;
    const my = 22;
    for (let y = 0; y < 54; y++)
      for (let x = 0; x < 140; x++) {
        let l = 0.58 + (soft(x, y, 10, 90) - 0.5) * 0.35 + (grain(x, y, 91) - 0.5) * 0.14;
        // ぬり直しの あと（明るい まだら）
        if (soft(x, y, 14, 92) > 0.66) l += 0.12;
        // 上の ふち（少し 出っぱる）と 下の 土ぼこり
        if (y < 2) l = 0.86 - y * 0.12 + (grain(x, y, 93) < 0.15 ? -0.3 : 0);
        if (y === 2) l -= 0.22;
        if (y > 48) l -= (y - 48) * 0.05;
        // すす：焚き口の 上へ 広がる
        const dy = my - y;
        const spread = 24 + Math.max(0, dy) * 1.1;
        const s = Math.max(0, 1 - Math.abs(x - mx) / spread) * (y < my + 6 ? 1 : 0.5) * Math.min(1, (y + 6) / 18);
        l -= s * 0.55 * (0.7 + soft(x, y, 6, 94) * 0.6);
        p.set(x, y, ramp(CLAY, l));
      }
    // ひび
    const cr = [[8, 14, 22, 1, 101], [118, 9, 18, 1, 102], [130, 30, 14, -1, 103], [14, 38, 16, 1, 104], [100, 44, 12, 1, 105], [30, 6, 10, 1, 106]] as const;
    for (const [x, y, l, d, s] of cr) crack(p, x, y, l, d, s, '#3A2014', '#C89868');
    // 焚き口：まわりの れんが（アーチ）
    const BRICK = ['#5A2418', '#6E2E1E', '#823A26', '#964A30'];
    for (let y = 0; y < 54; y++)
      for (let x = 40; x < 100; x++) {
        const d = y <= my ? Math.hypot(x - mx, y - my) : Math.abs(x - mx);
        if (d < 22 || d >= 28) continue;
        let key: number;
        if (y <= my) {
          const a = Math.atan2(y - my, x - mx);
          key = Math.floor((a + Math.PI) / (Math.PI / 9));
          const ra = ((a + Math.PI) / (Math.PI / 9)) % 1;
          if (ra < 0.12 || Math.abs(d - 25) < 0.5) {
            p.set(x, y, '#A88A6A');
            continue;
          }
        } else {
          key = Math.floor((y - my) / 5) * 2 + (x > mx ? 1 : 0);
          if ((y - my) % 5 === 0) {
            p.set(x, y, '#A88A6A');
            continue;
          }
        }
        // 内側ほど 焦げる
        const burn = Math.max(0, 1 - (d - 22) / 4);
        let l = 0.35 + (h01(key, 0, 107) - 0.5) * 0.5 + (grain(x, y, 108) - 0.5) * 0.2 - burn * 0.5;
        p.set(x, y, l < 0.05 ? '#1E120C' : ramp(BRICK, l));
      }
    // 口の 中：奥は 真っ暗、下に おきの 赤い 照り返し
    for (let y = 0; y < 54; y++)
      for (let x = 48; x < 92; x++) {
        const inArch = y <= my ? Math.hypot(x - mx, y - my) < 22 : true;
        if (!inArch) continue;
        const glow = Math.max(0, (y - 36) / 18) * (1 - Math.abs(x - mx) / 26);
        const v = glow * 0.9 + (grain(x, y, 109) - 0.5) * 0.08;
        p.set(x, y, ramp(['#08060A', '#100A08', '#1E0E08', '#3A1408', '#5A1E0C'], v));
      }
    return p.toCanvas();
  });
}

function clayTopArt(): HTMLCanvasElement {
  return once('hgclay2', () => {
    const p = new PixelCanvas(48, 48);
    for (let y = 0; y < 48; y++)
      for (let x = 0; x < 48; x++) {
        const l = 0.5 + (soft(x, y, 8, 120) - 0.5) * 0.4 + (grain(x, y, 121) - 0.5) * 0.15 - Math.max(0, 1 - Math.hypot(x - 24, y - 24) / 22) * 0.35;
        p.set(x, y, ramp(['#3A2216', '#5E3A24', '#74482C', '#8A5A3A', '#9A6844', '#AC7A50'], l));
      }
    return p.toCanvas();
  });
}

/** 研いだ 米（粒：白・すこし 黄・影）。 */
function riceArt(): HTMLCanvasElement {
  return once('hgrice2', () => {
    const p = new PixelCanvas(FW, H);
    for (let y = RICE_TOP; y <= MZ_BOT - 4; y++) {
      const h = half(y);
      for (let x = CX - h; x < CX + h; x++) {
        // 粒（2×1 の 楕円が ずれて 重なる）
        const gx = Math.floor((x + (y % 2) * 1) / 2);
        const r = h01(gx, y, 130);
        const edge = Math.min(x - (CX - h), CX + h - 1 - x) < 2 ? 0.25 : 0;
        let l = 0.55 + (r - 0.5) * 0.5 - edge - (y - RICE_TOP) * 0.004;
        if (((x + (y % 2)) & 1) === 1 && r > 0.5) l -= 0.18;
        if (y === RICE_TOP) l += 0.2;
        p.set(x, y, ramp(['#A8A294', '#C8C2B4', '#D8D2C4', '#E8E4D8', '#F2EEE4', '#FAF8F2'], l));
      }
    }
    return p.toCanvas();
  });
}

/** 人さし指・こぶし・腕（はだの 陰影、つめ、しわ）。 */
function fingerArt(): HTMLCanvasElement {
  return once('hgfinger2', () => {
    const p = new PixelCanvas(FW, H);
    const SKIN = ['#9A6A4E', '#B88A6A', '#D2A482', '#E6B892', '#F2C8A0', '#F8D8B6', '#FCE6CC'];
    const rt = RICE_TOP;
    const fx = CX - 2;
    const fTop = rt - 26;
    const put = (x: number, y: number, l: number) => p.set(x, y, ramp(SKIN, l + (grain(x, y, 140) - 0.5) * 0.06));
    // 指（左が 光る 丸い 筒）
    for (let y = fTop; y < rt; y++) for (let i = 0; i < 4; i++) put(fx + i, y, [0.78, 0.66, 0.5, 0.3][i]);
    // つめ（先、手前）
    p.set(fx + 1, rt - 2, '#F8E4D8');
    p.set(fx + 2, rt - 2, '#E8C8B8');
    p.set(fx + 1, rt - 1, '#D8A890');
    // 2つ目の ふしの しわ
    for (let i = 0; i < 3; i++) p.set(fx + i, fTop + 7, SKIN[2]);
    // こぶし（にぎった 指の 段）
    for (let y = fTop - 9; y < fTop; y++)
      for (let x = fx - 2; x < fx + 9; x++) {
        let l = 0.7 - (x - fx + 2) * 0.03 - (y - fTop + 9) * 0.02;
        if (x >= fx + 4 && (y - (fTop - 7)) % 3 === 0) l = 0.32;
        if (x === fx - 2 || y === fTop - 9) l += 0.1;
        put(x, y, l);
      }
    // 腕（右上へ：上が 光、下が 影）
    for (let i = 0; i < 30; i++) {
      const top = fTop - 9 - Math.round(i * 0.9);
      for (let j = 0; j < 7; j++) put(fx + 7 + i, top + j, [0.86, 0.78, 0.7, 0.62, 0.55, 0.45, 0.28][j] - (i > 20 ? 0.05 : 0));
    }
    // 指の 1つ目の ふし（水を そこまで）
    const wy = rt - WRIST;
    for (let i = -1; i < 5; i++) p.set(fx + i, wy, '#A85A3A');
    for (let i = 0; i < 4; i++) p.set(fx + i, wy + 1, SKIN[1]);
    return p.toCanvas();
  });
}

/** 米の 上の 水（lv px）。 */
function waterImg(lv: number): HTMLCanvasElement {
  return once(`hgwater:${lv}`, () =>
    paint(FW, H, (g) => {
      const wl = RICE_TOP - lv;
      for (let y = wl; y <= MZ_BOT - 4; y++) {
        const h = half(y);
        g.rect(CX - h, y, h * 2, 1, y === wl && lv > 0 ? '#BDEFFA' : '#4A8AC8');
      }
    }),
  );
}

registerPanel3d('hg_mizu', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 100 },
  light: { ...ROOM_LAMP, hemiI: 0.8, sunI: 0.5 },
  fog: null,
  shadow: null,
  grade: () => null,
  focus: 0.5,
  tilt: 0.4,
  build(k: Kit) {
    doma(k, MZ_BOT + 6);
    const px = k.pxAt(D);
    const foot = (z: number) => k.atDepth(CX, H, z)!;
    // 切った 羽釜（鉄の 厚み）・米・指
    k.stand(
      once('hgkamacut2', () => {
        const p = new PixelCanvas(FW, H);
        kamaArt(p, CX, MZ_TOP, MZ_BOT, true);
        return p.toCanvas();
      }),
      foot(-D - 0.5),
      { px: k.pxAt(D + 0.5), depth: 8 },
    );
    k.stand(riceArt(), foot(-D - 0.1), { px: k.pxAt(D + 0.1), depth: 4, cast: false });
    k.stand(fingerArt(), foot(-D + 0.15), { px: k.pxAt(D - 0.15), depth: 4, cast: false });
    k.bag.water = new Map<number, THREE.Mesh>();
    k.bag.px = px;
    // ランプの 暖かい 光（2D の 輪の 中心：釜の 上の 方）
    lamp(k, '#ffd8a8', 34, k.atDepth(CX - 20, 30, -D + 3.2)!, 0, 2);
  },
  update(k: Kit, _t, s) {
    const lv = Math.max(0, Math.min(30, Number(s.lv)));
    const water = k.bag.water as Map<number, THREE.Mesh>;
    let m = water.get(lv);
    if (!m) {
      // （水の 高さごとに 1枚：はじめて その 高さに なった とき 作る）
      m = k.stand(waterImg(lv), k.atDepth(CX, H, -D + 0.3)!, { px: k.pxAt(D - 0.3), depth: 0, cast: false, receive: false });
      fade(m, 0.45);
      water.set(lv, m);
    }
    for (const [v, w] of water) w.visible = v === lv;
  },
});

// ---------------------------------------------------------------- かまど

/** 羽釜と 木の ふた（2D と 同じ 所）。 */
function kamaLidImg(): HTMLCanvasElement {
  return once('hgkamalid2', () => {
    const p = new PixelCanvas(FW, H);
    kamaArt(p, CX, 30, 60, false);
    lidArt(p, CX);
    return p.toCanvas();
  });
}
/** 火の 舌 1本（3 × 30、下から 赤・橙・先が 黄）。 */
function flameImg(): HTMLCanvasElement {
  return once('hgflame2', () => {
    // 下が 太く 先へ 細る 舌：外が 赤、中が 橙、芯が 黄白（縦に ゆらぐ ふち）
    const p = new PixelCanvas(5, 30);
    for (let y = 0; y < 30; y++) {
      const w = 0.6 + (y / 29) * 2.0 + Math.sin(y * 0.9) * 0.25;
      for (let x = 0; x < 5; x++) {
        const d = Math.abs(x - 2) / w;
        if (d > 1) continue;
        const core = (1 - d) * (0.3 + (y / 29) * 0.9);
        p.set(x, y, ramp(['#B8281A', '#E8482A', '#F06A2A', '#FF9A38', '#FFC050', '#FFE7A3', '#FFF6DC'], core));
      }
    }
    return p.toCanvas();
  });
}

/** おき（赤く 光る 炭の かけら、灰）と 薪（樹皮）。 */
function emberArt(on: boolean): HTMLCanvasElement {
  return once(`hgember2:${on}`, () => {
    const p = new PixelCanvas(36, 3);
    for (let y = 0; y < 3; y++)
      for (let x = 0; x < 36; x++) {
        const r = soft(x, y, 3, 150);
        p.set(x, y, on ? ramp(['#3A1A10', '#7A2414', '#C8402A', '#F07A3A', '#FFC060'], r * 1.1 - y * 0.08) : ramp(['#2A1E18', '#3A2418', '#5A4A40', '#8A8078'], r));
      }
    return p.toCanvas();
  });
}
function stickArt(): HTMLCanvasElement {
  return once('hgstick2', () => {
    const p = new PixelCanvas(26, 3);
    for (let x = 0; x < 26; x++) {
      p.set(x, 0, grain(x, 0, 160) < 0.3 ? '#6A4A2A' : '#8A6A42');
      p.set(x, 1, grain(x, 1, 161) < 0.25 ? '#3A2618' : '#6A4A2A');
      p.set(x, 2, '#3A2618');
    }
    // 焦げた 先と 切り口
    for (let y = 0; y < 3; y++) p.set(0, y, '#1A0E08');
    p.set(25, 1, '#C8A070');
    p.set(25, 0, '#D8B080');
    return p.toCanvas();
  });
}

const FLAME_H = [0, 8, 14, 22, 30];

registerPanel3d('hg_hi', {
  cam: { fov: 22, pitch: 0, pos: [0, 0, 0], near: 0.3, far: 100 },
  light: { ...ROOM_LAMP, sun: '#ffb080', sky: '#8a6a50', hemiI: 0.35, sunI: 0.15 },
  fog: null,
  shadow: null,
  grade: () => null,
  focus: 0.5,
  tilt: 0.4,
  animated: true,
  fps: 20,
  build(k: Kit) {
    doma(k, H);
    const px = k.pxAt(D);
    // かまど（前の 面が 2D の かまどの 所）
    const l = k.atDepth(CX - 70, H, -D)!;
    const r = k.atDepth(CX + 70, H, -D)!;
    const top = 54 * px;
    k.box(l.x, r.x, 0, top, -D - 2.4, -D, { front: kamadoArt(), top: clayTopArt(), left: clayTopArt(), right: clayTopArt() });
    // 羽釜と ふた：かまどの 上の 穴に（奥行き まん中）
    const zk = -D - 1.2;
    k.stand(kamaLidImg(), k.atDepth(CX, 62, zk)!, { px: k.pxAt(D + 1.2), depth: 10, rows: [16, 62], emissive: 0.12 });
    // 火の 舌 9本・おき・薪
    const flames: THREE.Mesh[] = [];
    for (let i = 0; i < 9; i++) {
      const at = k.atDepth(CX - 18 + i * 4.5 + 1.5, 110, -D + 0.05)!;
      flames.push(k.stand(flameImg(), at, { px, depth: 1, unlit: true, cast: false, emissive: 1 }));
    }
    const ember = (on: boolean) => k.stand(emberArt(on), k.atDepth(CX, 111, -D + 0.03)!, { px, depth: 2, unlit: true, cast: false });
    const emberOn = ember(true);
    const emberOff = ember(false);
    const stick = stickArt();

    const sticks = [0, 1, 2].map((n) => k.stand(stick, k.atDepth(CX - 16 + n * 5 + 13, 108 - n, -D + 0.08 + n * 0.01)!, { px, depth: 2, cast: false }));
    // 火の 光（口の 中）
    const fire = lamp(k, '#ff8a3a', 0, k.atDepth(CX, 92, -D + 1.4)!, 0, 2);
    // 焚き口の 前の 床と かまどの 前を 照らす ゆらぐ 光
    const glow = lamp(k, '#ff7030', 0, k.atDepth(CX, 104, -D + 2.6)!, 0, 2);
    // 土間の ランプ（釜の 鉄と ふたに 弱い 光）
    lamp(k, '#ffd0a0', 16, k.atDepth(CX - 30, 4, -D + 2)!, 0, 2);
    Object.assign(k.bag, { flames, emberOn, emberOff, sticks, fire, glow, firePos: fire.position.clone(), px });
  },
  update(k: Kit, t, s) {
    const fl = Number(s.fl);
    const px = k.bag.px as number;
    const fh = FLAME_H[Math.max(0, Math.min(4, fl))];
    (k.bag.flames as THREE.Mesh[]).forEach((m, i) => {
      // （2D と 同じ ゆれ：sin(t / 90 + i * 1.3)）
      const h = Math.max(0, Math.round(fh * (0.6 + 0.4 * Math.sin(t / 90 + i * 1.3))));
      m.visible = h > 0;
      m.scale.y = (px * h) / 30;
    });
    (k.bag.emberOn as THREE.Mesh).visible = fl > 0;
    (k.bag.emberOff as THREE.Mesh).visible = fl <= 0;
    (k.bag.sticks as THREE.Mesh[]).forEach((m, n) => (m.visible = n < Math.min(3, Number(s.fire))));
    const fire = k.bag.fire as THREE.PointLight;
    // 炎の ゆらぎ：強さと 位置が 少し ゆれ、まわりの 土・釜・床に 映る
    const flick = 0.78 + 0.14 * Math.sin(t / 70) + 0.08 * Math.sin(t / 31 + 1.7);
    fire.intensity = fl <= 0 ? 0.6 : fl * 7 * flick;
    fire.position.copy(k.bag.firePos as THREE.Vector3);
    fire.position.x += Math.sin(t / 53) * 0.05;
    fire.position.y += Math.sin(t / 41) * 0.04;
    (k.bag.glow as THREE.PointLight).intensity = fl <= 0 ? 0.2 : fl * 2.2 * (0.7 + 0.3 * Math.sin(t / 47 + 0.6));
  },
});
