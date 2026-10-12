// 第3章の 戦闘背景（61 18.1・18.2・18.6・18.7・62 11.9）：海ぞいの町は 正午で 止まっている。
// 光は 真上からの 白い 日ざしと、下からの 海の 照り返し。HD-2D では 戦闘が 始まった 場所の
// 立体（place.ts。市場・食堂の 台所は 部屋）を 下に 敷き、意味を 持つ 物だけを 重ねる。
//
//  bg_c3_ichiba   市場の セリ場：鉄骨の 屋根、明かり取りの 光の 帯、トロ箱の 列と 番号札、
//                 ぬれた 床の 照り返し。重ね物：セリの 鐘（振鈴）と 氷の 瞬き
//  bg_c3_shokudo  食堂かもめの 台所：白い タイル、黒板『本日の 日替わり』、のれん、棚の どんぶり。
//                 重ね物：湯気、コンロの 青い 火の 照り返し
//  bg_c3_siren    サイレン塔の 見晴らし台から 南：空、鏡のように 止まった 海、港と 町の 屋根、
//                 遠くの 町の 時計（12:00。最終局面で 12:01）、防波堤と 赤い 灯台、手前に 塔の 手すり。
//                 いただきますの あと 空が 少し 午後へ（flags.after）、鳴りきると 波が 1つ 寄せる
//                 （flags.wave）。HD-2D でも この 絵（塔の 部屋の 立体からは 町と 海が 見えない。
//                 62 8.9 の 塔の 上から 見下ろす 立体の カメラは 第3期に。報告書）
//
// 町の 外の 背景（干物屋・浜・防波堤・旧水族館）は 任意の 敵と 第3期の 分。

import type { Gfx } from '../../engine/gfx';
import { makeCanvas } from '../../engine/pixel';
import { drawText } from '../../engine/font';
import { hash2 } from '../../engine/rng';
import { Background, BG_H, fillCircle, gradientTexture, mixHex } from './common';
import { AQ_BG_IDS, makeAqBackground } from './aq';

export const C3_BG_IDS = ['bg_c3_ichiba', 'bg_c3_shokudo', 'bg_c3_siren', 'bg_c3_himono', 'bg_c3_kaisui', 'bg_c3_bouhatei', ...AQ_BG_IDS];
/** The ones whose 3D place stands under them in HD-2D (a room: the market, the diner's kitchen). */
export const C3_PLACE_BG_IDS = ['bg_c3_ichiba', 'bg_c3_shokudo', 'bg_c3_himono', 'bg_c3_kaisui', 'bg_c3_bouhatei', ...AQ_BG_IDS];

export function makeC3Background(id: string): Background | null {
  const aq = makeAqBackground(id);
  if (aq) return aq;
  switch (id) {
    case 'bg_c3_ichiba':
      return new IchibaBg();
    case 'bg_c3_shokudo':
      return new ShokudoBg();
    case 'bg_c3_siren':
      return new SirenBg();
    case 'bg_c3_himono':
    case 'bg_c3_kaisui':
    case 'bg_c3_bouhatei':
      return new SeasideBg(id);
  }
  return null;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, a = 1): void {
  ctx.globalAlpha = a;
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.globalAlpha = 1;
}

// ---- 市場の セリ場 -------------------------------------------------------------------------------

class IchibaBg extends Background {
  private still: HTMLCanvasElement;

  constructor() {
    super('bg_c3_ichiba');
    this.wave = { A: 1, lambda: 72, f: 0.15, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#2A3440';
    const [c, ctx] = makeCanvas(384, BG_H);
    // the dim hall under its roof
    ctx.drawImage(gradientTexture(['#2A3440', '#3A4A55', '#4A5A62'], 96), 0, 0);
    // roof girders (a truss), the skylights between them
    for (let x = -20; x < 400; x += 64) {
      px(ctx, x, 0, 64, 2, '#4A5A6A');
      for (let i = 0; i < 64; i += 2) px(ctx, x + i, Math.round(2 + Math.abs(32 - i) * 0.4), 1, 1, '#5A6A7A');
      px(ctx, x + 30, 0, 4, 52, '#3A4855');
      px(ctx, x + 30, 0, 1, 52, '#6A7A88');
      px(ctx, x + 6, 0, 18, 6, '#DCEFF6', 0.7);
    }
    // the stalls along the back: crates of fish on ice, number cards
    for (let i = 0; i < 12; i++) {
      const x = 4 + i * 32;
      const y = 62 + (i % 2) * 2;
      px(ctx, x, y, 28, 14, '#F4F6F8');
      px(ctx, x, y, 28, 1, '#FFFFFF');
      px(ctx, x, y + 13, 28, 1, '#C8CDD4');
      for (let k = 0; k < 9; k++) px(ctx, x + 2 + k * 3, y + 2 + (k % 2), 2, 1, k % 3 ? '#DFF4FA' : '#8E95A6');
      // fish: silver bodies in the ice
      for (let k = 0; k < 3; k++) {
        px(ctx, x + 3 + k * 8, y + 5, 6, 2, '#A8B4C0');
        px(ctx, x + 3 + k * 8, y + 5, 6, 1, '#DCE4EA');
        px(ctx, x + 9 + k * 8, y + 5, 1, 2, '#6B7186');
      }
      // the number card
      px(ctx, x + 18, y - 7, 9, 7, '#D8B878');
      px(ctx, x + 20, y - 5, 5, 1, '#2A2440');
      px(ctx, x + 21, y - 3, 3, 1, '#2A2440');
    }
    // the wet concrete floor, its sheen of the skylights
    ctx.drawImage(gradientTexture(['#4A5A62', '#5A6A70', '#6A7A80'], BG_H - 78), 0, 78);
    for (let y = 82; y < BG_H; y += 3)
      for (let x = 0; x < 384; x += 1) if (hash2(x >> 3, y, 301) < 0.07) px(ctx, x, y, 3, 1, '#8FD3E8', 0.45);
    // puddles reflecting the white light
    for (const [x, y, w] of [[60, 120, 40], [210, 132, 54], [300, 112, 30]] as [number, number, number][]) {
      px(ctx, x, y, w, 2, '#9ECBDA', 0.6);
      px(ctx, x + 6, y, w - 18, 1, '#F4F6F8', 0.6);
    }
    this.still = c;
  }

  protected paintL0(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.still, 0, 0);
    // the light from the skylights: three slanting white bands (α25%)
    for (let i = 0; i < 3; i++) {
      const x0 = 70 + i * 120;
      for (let y = 0; y < BG_H; y += 1) px(ctx, x0 + y * 0.35, y, 22, 1, '#FFF6D8', 0.13);
    }
  }

  protected paintL1(): void {}

  /** The bell and the ice glinting (also over the 3D market). */
  protected drawL2(g: Gfx): void {
    const ctx = g.ctx;
    // ice twinkles in the crates
    for (let i = 0; i < 14; i++) {
      const on = Math.floor(this.t * 3 + i * 1.7) % 5 === 0;
      if (!on) continue;
      const x = 8 + ((i * 53) % 368);
      const y = 66 + (i % 3) * 3;
      px(ctx, x, y, 1, 1, '#FFFFFF');
      px(ctx, x - 1, y, 3, 1, '#DFF4FA', 0.7);
    }
    // the auction bell (振鈴) on its stand, front left
    const bx = 22;
    const by = 112;
    px(ctx, bx + 4, by + 10, 2, 28, '#6B4A2A');
    px(ctx, bx, by + 36, 10, 2, '#4A3A2A');
    ctx.fillStyle = '#C8A048';
    ctx.beginPath();
    ctx.moveTo(bx - 1, by + 10);
    ctx.lineTo(bx + 11, by + 10);
    ctx.lineTo(bx + 8, by);
    ctx.lineTo(bx + 2, by);
    ctx.closePath();
    ctx.fill();
    px(ctx, bx + 2, by, 6, 1, '#FFF6D8');
    px(ctx, bx + 4, by - 6, 2, 6, '#6B4A2A');
  }
}

// ---- 食堂かもめの 台所 ---------------------------------------------------------------------------

class ShokudoBg extends Background {
  private still: HTMLCanvasElement;

  constructor() {
    super('bg_c3_shokudo');
    this.wave = { A: 1, lambda: 72, f: 0.12, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#3A2B24';
    const [c, ctx] = makeCanvas(384, BG_H);
    // white tiles, their grout
    px(ctx, 0, 0, 384, 100, '#F4F1E8');
    for (let y = 0; y < 100; y += 8) px(ctx, 0, y, 384, 1, '#C8C2B4');
    for (let y = 0; y < 100; y += 8) for (let x = (y / 8) % 2 ? 4 : 0; x < 384; x += 8) px(ctx, x, y, 1, 8, '#C8C2B4');
    // the light from the window above (noon): the upper wall brighter
    ctx.drawImage(gradientTexture(['#FFFFFF', '#F4F1E8'], 30), 0, 0, 384, 30);
    // the noren at the doorway, left (blue, a white 『かもめ』 bird mark), under the band
    px(ctx, 6, 44, 60, 40, '#2F4A8A');
    px(ctx, 6, 44, 60, 2, '#4A6AB0');
    for (let i = 1; i < 4; i++) px(ctx, 6 + i * 15, 54, 1, 30, '#1F3466');
    ctx.fillStyle = '#F4F1E8';
    ctx.fillRect(26, 62, 7, 1);
    ctx.fillRect(33, 61, 7, 1);
    ctx.fillRect(32, 62, 2, 1);
    ctx.fillRect(25, 63, 2, 1);
    ctx.fillRect(39, 62, 2, 1);
    // the blackboard 『本日の 日替わり』 (empty below: the last menu is yet to be written)
    px(ctx, 276, 48, 96, 48, '#6A4A2A');
    px(ctx, 279, 51, 90, 42, '#2E4A3A');
    drawText(ctx, '本日の', 286, 53, { color: '#E8ECE0' });
    drawText(ctx, '日替わり', 286, 71, { color: '#E8ECE0' });
    px(ctx, 282, 89, 84, 1, '#8EA69A', 0.6);
    // the shelf of bowls
    px(ctx, 92, 70, 150, 3, '#A8742A');
    px(ctx, 92, 73, 150, 1, '#6A4A2A');
    for (let i = 0; i < 10; i++) {
      const x = 96 + i * 15;
      px(ctx, x, 62, 12, 8, i % 3 === 0 ? '#E8E4D8' : '#F4F1E8');
      px(ctx, x + 1, 65, 10, 1, '#4A6AB0');
      px(ctx, x, 62, 12, 1, '#FFFFFF');
      px(ctx, x + 1, 69, 10, 1, '#C8C2B4');
    }
    // the stove top and the counter
    ctx.drawImage(gradientTexture(['#8A6A4A', '#6A4A2A', '#4A3424'], 50), 0, 100);
    px(ctx, 0, 100, 384, 2, '#C8A068');
    for (let x = 0; x < 384; x += 1) if (hash2(x >> 2, 3, 311) < 0.2) px(ctx, x, 104 + (x % 5), 1, 1, '#5A3A22');
    // the stove's grate, under where the pot stands
    px(ctx, 140, 112, 104, 6, '#3A3F48');
    px(ctx, 140, 112, 104, 1, '#6B7186');
    this.still = c;
  }

  protected paintL0(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.still, 0, 0);
  }

  protected paintL1(): void {}

  /** The steam going up slowly, the stove's blue light at the pot's feet. */
  protected drawL2(g: Gfx): void {
    const ctx = g.ctx;
    ctx.globalAlpha = 0.15 + 0.05 * Math.sin(this.t * 8);
    ctx.fillStyle = '#4A8AE0';
    ctx.beginPath();
    ctx.ellipse(192, 140, 40, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    for (let i = 0; i < 6; i++) {
      const ph = (this.t / 4 + i / 6) % 1;
      const x = 120 + i * 30 + Math.sin(ph * 6 + i) * 6;
      const y = 100 - ph * 60;
      ctx.globalAlpha = 0.2 * (1 - ph);
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(Math.round(x), Math.round(y), 6 + ph * 8, 4 + ph * 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}

// ---- サイレン塔の 見晴らし台 -----------------------------------------------------------------------

const HORIZON = 58;

class SirenBg extends Background {
  private skyNoon: HTMLCanvasElement;
  private skyAfter: HTMLCanvasElement;
  private town: HTMLCanvasElement;
  private rail: HTMLCanvasElement;
  private afterT = 0;
  private waveT = 0;

  constructor() {
    super('bg_c3_siren');
    this.wave = { A: 0, lambda: 72, f: 0.1, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#2A2440';
    this.skyNoon = gradientTexture(['#7EC6E0', '#8FD3E8', '#DCEFF6'], HORIZON);
    this.skyAfter = gradientTexture(['#8ABCD8', '#9CCBE0', '#E2EEF2'], HORIZON);
    // the town and harbour seen from above: rows of small roofs down to the quay
    const [t, tx] = makeCanvas(384, BG_H);
    // the still sea (a mirror), the breakwater and the red lighthouse
    tx.drawImage(gradientTexture(['#9ED8EC', '#6FB8D8', '#5AA4C8'], 40), 0, HORIZON);
    for (let y = HORIZON + 2; y < HORIZON + 40; y += 3) px(tx, 0, y, 384, 1, '#BEE6F2', 0.35 + (y % 2) * 0.1);
    px(tx, 0, HORIZON, 384, 1, '#F4F6F8');
    px(tx, 228, HORIZON + 18, 140, 4, '#B8B8B0');
    px(tx, 228, HORIZON + 18, 140, 1, '#E0E0D8');
    px(tx, 352, HORIZON + 4, 6, 14, '#E23B2E');
    px(tx, 352, HORIZON + 4, 6, 1, '#FF6A4D');
    px(tx, 351, HORIZON + 2, 8, 2, '#F4F1E8');
    // boats moored at the quay
    for (let i = 0; i < 4; i++) {
      const bx = 60 + i * 34;
      px(tx, bx, HORIZON + 30, 18, 4, '#F4F1E8');
      px(tx, bx + 2, HORIZON + 33, 14, 1, '#4A6AB0');
      px(tx, bx + 8, HORIZON + 22, 1, 8, '#6B7186');
    }
    // the quay (a stone edge), then the town climbing away from it: scattered
    // roofs of houses, sheds and the market's long roof, with lanes between
    px(tx, 0, HORIZON + 37, 384, 2, '#C8C2B4');
    px(tx, 0, HORIZON + 39, 384, 52, '#D8D0B8');
    for (let y = HORIZON + 44; y < BG_H; y += 11) px(tx, 0, y, 384, 1, '#C8BEA4');
    const roofs = ['#6B7186', '#8E95A6', '#4A6AB0', '#A8302A', '#5A6B62', '#9A6A4A'];
    // the market's long roof by the quay
    px(tx, 150, HORIZON + 40, 90, 8, '#8E95A6');
    px(tx, 150, HORIZON + 40, 90, 1, '#E0E4E8');
    px(tx, 150, HORIZON + 48, 90, 4, '#E8E4D8');
    for (let row = 0; row < 5; row++) {
      const y = HORIZON + 46 + row * 11;
      for (let x = -6 + (row % 2) * 13; x < 392; x += 26 + Math.floor(hash2(x, row, 333) * 14)) {
        const h = hash2(x, row, 331);
        if (h < 0.22 || (row === 0 && x > 140 && x < 246)) continue;
        const col = roofs[Math.floor(h * roofs.length)];
        const w = 12 + Math.floor(h * 8);
        // wall, a window, the roof with the sun on its top edge, its short shadow below
        px(tx, x, y + 3, w, 6, '#F4F1E8');
        px(tx, x + 3, y + 5, 2, 2, '#4A5A6A');
        px(tx, x - 1, y, w + 2, 4, col);
        px(tx, x - 1, y, w + 2, 1, mixHex(col, '#FFF6D8', 0.55));
        px(tx, x - 1, y + 9, w + 2, 1, '#1E3A4A', 0.35);
        // a tree between some of them
        if (h > 0.8) {
          fillCircle(tx, x + w + 6, y + 4, 3, '#5FA85A');
          px(tx, x + w + 5, y + 2, 2, 1, '#9BCB6B');
        }
      }
    }
    // the town clock on its pole (far, mid-left): drawn live (12:00 → 12:01)
    this.town = t;
    // the tower's railing in front (white paint, rust at the joints)
    const [r, rx] = makeCanvas(384, 30);
    px(rx, 0, 6, 384, 3, '#E8ECF0');
    px(rx, 0, 6, 384, 1, '#FFFFFF');
    px(rx, 0, 18, 384, 2, '#C8CDD4');
    for (let x = 4; x < 384; x += 24) {
      px(rx, x, 6, 3, 24, '#E8ECF0');
      px(rx, x, 6, 1, 24, '#FFFFFF');
      px(rx, x + 2, 6, 1, 24, '#A8AEB8');
      px(rx, x, 9, 3, 2, '#A86A3A');
    }
    px(rx, 0, 26, 384, 4, '#6B7186');
    this.rail = r;
  }

  update(dt: number): void {
    super.update(dt);
    if (this.flags.after) this.afterT = Math.min(1, this.afterT + dt / 2000);
    if (this.flags.wave) this.waveT += dt / 1000;
  }

  protected paintL0(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.skyNoon, 0, 0);
    if (this.afterT > 0) {
      ctx.globalAlpha = this.afterT;
      ctx.drawImage(this.skyAfter, 0, 0);
      ctx.globalAlpha = 1;
    }
    // one cloud that does not move (the noon stopped)
    fillCircle(ctx, 300, 14, 7, '#F4F6F8');
    fillCircle(ctx, 309, 16, 6, '#F4F6F8');
    fillCircle(ctx, 292, 17, 5, '#F4F6F8');
    px(ctx, 288, 20, 28, 3, '#F4F6F8');
    ctx.drawImage(this.town, 0, 0);
    // the wave that comes in once when the siren has rung out
    if (this.waveT > 0 && this.waveT < 3) {
      const y = HORIZON + 4 + this.waveT * 10;
      px(ctx, 0, y, 384, 1, '#F4F6F8', 0.8 * (1 - this.waveT / 3));
    }
    // the town clock (far): 12:00, 12:01 at the end
    const cx = 48;
    const cy = HORIZON + 26;
    px(ctx, cx - 1, cy + 5, 2, 18, '#4A4A55');
    fillCircle(ctx, cx, cy, 6, '#F4F1E8');
    ctx.globalAlpha = 1;
    px(ctx, cx, cy - 5, 1, 5, '#2A2440');
    const min = this.flags.clock ? 1 : 0;
    const a = -Math.PI / 2 + (min / 60) * Math.PI * 2;
    for (let r = 0; r < 4; r++) px(ctx, cx + Math.cos(a) * r, cy + Math.sin(a) * r, 1, 1, '#E23B2E');
    // a band of light runs over the roofs as it rings out (after the clock)
    if (this.flags.clock) {
      const k = (this.t * 0.4) % 1;
      px(ctx, -60 + k * 500, HORIZON + 38, 60, 54, '#FFF6D8', 0.12);
    }
  }

  protected paintL1(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.rail, 0, BG_H - 30);
  }
}

// ---- 町の 外：干物屋の 路地・海水浴場・防波堤（任意の 敵。61 18.3〜18.5） --------------------------

/**
 * One noon seaside for the three: the sky (#8FD3E8 → white), then by place —
 * 干物屋: drying racks of fish and the 『干物』 noren; 浜: the still mirror sea,
 * sand, the swimming flag (white with a blue wave, 03 #12) on the lifeguard's
 * chair; 防波堤: the sea, concrete, tetrapods, the red lighthouse far off. Over
 * the HD-2D place: the sun's white lines (干物屋), the sand's glare (浜), a far
 * kite's shadow wheeling (防波堤).
 */
class SeasideBg extends Background {
  private still: HTMLCanvasElement;

  constructor(id: string) {
    super(id);
    this.wave = { A: 1, lambda: 80, f: 0.1, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = id === 'bg_c3_kaisui' ? '#8A7A5A' : '#4A4A55';
    const [c, ctx] = makeCanvas(384, BG_H);
    ctx.drawImage(gradientTexture(['#7EC6E0', '#8FD3E8', '#F4F6F8'], 70), 0, 0);
    if (id === 'bg_c3_himono') {
      // the alley: the shop's wall, its noren, racks of fish in the sun
      px(ctx, 0, 54, 384, 50, '#C8B898');
      for (let x = 0; x < 384; x += 6) px(ctx, x, 54, 1, 50, '#B8A888');
      px(ctx, 250, 54, 70, 30, '#2F4A8A');
      drawText(ctx, '干物', 268, 58, { color: '#F4F1E8' });
      for (const rx of [20, 130]) {
        px(ctx, rx, 70, 100, 2, '#6B5A4A');
        px(ctx, rx, 72, 100, 22, '#9AA0A8', 0.35);
        for (let k = 0; k < 6; k++) {
          px(ctx, rx + 4 + k * 16, 76, 10, 14, '#C8884A');
          px(ctx, rx + 4 + k * 16, 76, 10, 1, '#F2C88A');
          px(ctx, rx + 8 + k * 16, 78, 1, 11, '#E8D8B8');
        }
        px(ctx, rx, 94, 2, 30, '#6B5A4A');
        px(ctx, rx + 98, 94, 2, 30, '#6B5A4A');
      }
      ctx.drawImage(gradientTexture(['#B8B0A0', '#A8A090', '#988E7E'], BG_H - 104), 0, 104);
    } else if (id === 'bg_c3_kaisui') {
      // the mirror sea, the sand, the flag on the lifeguard's chair
      ctx.drawImage(gradientTexture(['#BEE6F2', '#6FB8D8', '#5AA4C8'], 44), 0, 56);
      px(ctx, 0, 56, 384, 1, '#F4F6F8');
      for (let y = 60; y < 100; y += 4) px(ctx, 0, y, 384, 1, '#DFF4FA', 0.3);
      ctx.drawImage(gradientTexture(['#F2E4C0', '#E8D8B0', '#D8C49A'], BG_H - 100), 0, 100);
      for (let x = 0; x < 384; x += 2) if (hash2(x, 7, 341) < 0.2) px(ctx, x, 104 + (x % 40), 1, 1, '#C8B488');
      px(ctx, 320, 66, 3, 48, '#F4F1E8');
      px(ctx, 330, 66, 3, 48, '#F4F1E8');
      px(ctx, 316, 84, 22, 4, '#E23B2E');
      px(ctx, 323, 50, 1, 16, '#6B7186');
      px(ctx, 324, 50, 14, 9, '#F4F1E8');
      for (let k = 0; k < 14; k++) px(ctx, 324 + k, 54 + Math.round(Math.sin(k * 0.9)), 1, 1, '#4A6AB0');
    } else {
      // the breakwater: the sea, the concrete top, tetrapods, the lighthouse
      ctx.drawImage(gradientTexture(['#9ED8EC', '#6FB8D8', '#4A94B8'], 50), 0, 54);
      px(ctx, 0, 54, 384, 1, '#F4F6F8');
      px(ctx, 330, 34, 8, 20, '#E23B2E');
      px(ctx, 329, 32, 10, 2, '#F4F1E8');
      for (let k = 0; k < 9; k++) {
        const tx = 10 + k * 42;
        ctx.fillStyle = '#A8A8A0';
        ctx.beginPath();
        ctx.moveTo(tx, 104);
        ctx.lineTo(tx + 12, 92);
        ctx.lineTo(tx + 24, 104);
        ctx.closePath();
        ctx.fill();
        px(ctx, tx + 10, 92, 4, 1, '#E0E0D8');
      }
      ctx.drawImage(gradientTexture(['#D0D0C8', '#B8B8B0', '#A0A098'], BG_H - 104), 0, 104);
      px(ctx, 0, 104, 384, 1, '#F0F0E8');
      for (let x = 0; x < 384; x += 48) px(ctx, x, 104, 1, BG_H - 104, '#98988E');
    }
    this.still = c;
  }

  protected paintL0(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.still, 0, 0);
  }

  protected paintL1(): void {}

  protected drawL2(g: Gfx): void {
    const ctx = g.ctx;
    if (this.id === 'bg_c3_himono') {
      // straight-down white lines of sun, slowly (α20%)
      for (let i = 0; i < 3; i++) {
        const x = 90 + i * 100 + Math.sin(this.t * 0.3 + i) * 10;
        px(ctx, x, 0, 1, BG_H, '#FFF6D8', 0.2);
      }
    } else if (this.id === 'bg_c3_kaisui') {
      ctx.globalAlpha = 0.12;
      ctx.drawImage(gradientTexture(['#F4F6F8', '#FFF1B8'], 30), 0, BG_H - 30);
      ctx.globalAlpha = 1;
    } else {
      // a far kite wheeling high over the sea (2 s a turn), its tiny shape
      const a = this.t * Math.PI;
      const x = 120 + Math.cos(a) * 40;
      const y = 22 + Math.sin(a) * 6;
      px(ctx, x - 3, y, 7, 1, '#5A3A2A');
      px(ctx, x, y + 1, 1, 1, '#5A3A2A');
    }
  }
}
