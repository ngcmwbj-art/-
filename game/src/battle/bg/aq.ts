// 旧水族館の 戦闘背景（61 18.8〜18.10）。館の 中は 部屋の 明かりが 消えていて、光は 奥の 水槽からの
// 青だけ。HD-2D では 戦闘が 始まった 部屋の 立体（place.ts）を 下に 敷き、意味を 持つ 物だけを 重ねる。
//
//  bg_c3_aq_kairo  回廊（ジュンロ）：暗い 廊下、壁 一面の 集荷伝票（白い 四角の 格子）、空の 水槽の 青い 光。
//                  重ね物：床の「順路」の 矢印の 跡（両面テープの 白い 線）
//  bg_c3_aq_hall   大水槽の ホール（ツガオ）：空の 大水槽の ガラス（水の ない 青い 光の ゆらぎ）、長いす、
//                  冷めた 焼きそばの パック。重ね物：光の ゆらぎ（コースティクス）
//  bg_c3_aq_rouka  倉庫の 外の 廊下（ヒロスケ・ポコシャ）：古い 冷凍庫の 扉、オキアミの 空き箱、非常口の
//                  緑の 明かり。重ね物：すみに 小さな『マフィ屋』の 看板（ジオラマで 見た 店の、色あせた 本物）

import type { Gfx } from '../../engine/gfx';
import { makeCanvas } from '../../engine/pixel';
import { drawText } from '../../engine/font';
import { hash2 } from '../../engine/rng';
import { Background, BG_H, gradientTexture } from './common';

export const AQ_BG_IDS = ['bg_c3_aq_kairo', 'bg_c3_aq_hall', 'bg_c3_aq_rouka'];

export function makeAqBackground(id: string): Background | null {
  return AQ_BG_IDS.includes(id) ? new AqBg(id) : null;
}

function px(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, c: string, a = 1): void {
  ctx.globalAlpha = a;
  ctx.fillStyle = c;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
  ctx.globalAlpha = 1;
}

class AqBg extends Background {
  private still: HTMLCanvasElement;

  constructor(id: string) {
    super(id);
    this.wave = { A: 1, lambda: 90, f: 0.08, A2: 0, lambda2: 40, f2: 0.3, interlace: false };
    this.bottom = '#141C28';
    const [c, ctx] = makeCanvas(384, BG_H);
    ctx.drawImage(gradientTexture(['#0E1622', '#16243A', '#1E2A3A'], 104), 0, 0);
    if (id === 'bg_c3_aq_kairo') {
      // the wall of 40 years of delivery slips, a grid of pale squares
      for (let y = 10; y < 92; y += 9)
        for (let x = (y / 9) % 2 ? 0 : 4; x < 384; x += 10) {
          const a = 0.35 + 0.25 * hash2(x, y, 51);
          px(ctx, x, y, 8, 7, '#E8E4D8', a * 0.6);
          px(ctx, x + 1, y + 2, 5, 1, '#6B7186', a * 0.5);
        }
      // two empty tanks set in the wall, their blue glow
      for (const tx of [40, 260]) {
        px(ctx, tx, 30, 84, 46, '#1E3A5A');
        px(ctx, tx, 30, 84, 1, '#6FC3E0', 0.8);
        px(ctx, tx + 2, 32, 80, 42, '#2E5A80', 0.6);
        for (let k = 0; k < 6; k++) px(ctx, tx + 6 + k * 13, 40 + (k % 3) * 9, 6, 1, '#6FC3E0', 0.35);
      }
    } else if (id === 'bg_c3_aq_hall') {
      // the great empty tank filling the back
      px(ctx, 0, 6, 384, 92, '#1E3A5A');
      px(ctx, 0, 6, 384, 1, '#6FC3E0', 0.8);
      for (let x = 0; x < 384; x += 48) px(ctx, x, 6, 2, 92, '#2A2440', 0.7);
      ctx.globalAlpha = 0.2;
      ctx.drawImage(gradientTexture(['#6FC3E0', '#2E5A80', '#1E3A5A'], 92), 0, 6);
      ctx.globalAlpha = 1;
      // the bench in front of the glass, the cold pack of 焼きそば on it
      px(ctx, 120, 92, 144, 6, '#6B5A4A');
      px(ctx, 120, 92, 144, 1, '#8A7A6A');
      px(ctx, 128, 98, 4, 10, '#4A3A2E');
      px(ctx, 252, 98, 4, 10, '#4A3A2E');
      px(ctx, 230, 86, 18, 6, '#F4F1E8');
      px(ctx, 231, 87, 16, 3, '#C8A060');
    } else {
      // the corridor outside the store: the old freezer door, crates, the green exit light
      px(ctx, 236, 22, 70, 76, '#8E95A6');
      px(ctx, 238, 24, 66, 72, '#C8CDD4');
      px(ctx, 238, 24, 66, 1, '#E8ECF0');
      px(ctx, 294, 54, 6, 14, '#4A4A55');
      for (let k = 0; k < 4; k++) {
        px(ctx, 20 + k * 30 + (k % 2) * 6, 74 - (k % 2) * 12, 26, 14, '#B8A888');
        px(ctx, 20 + k * 30 + (k % 2) * 6, 74 - (k % 2) * 12, 26, 1, '#D8C8A8');
        drawText(ctx, 'オキアミ', 21 + k * 30 + (k % 2) * 6, 74 - (k % 2) * 12, { color: '#6B5A4A' });
      }
      px(ctx, 330, 8, 30, 10, '#2E8A4A');
      px(ctx, 332, 10, 26, 6, '#5AC87A');
      px(ctx, 340, 11, 6, 4, '#F4F1E8');
    }
    // the floor: dark tiles, the blue of the tanks on it
    ctx.drawImage(gradientTexture(['#1A2232', '#222C3E', '#2A3448'], BG_H - 104), 0, 104);
    for (let x = 0; x < 384; x += 24) px(ctx, x, 104, 1, BG_H - 104, '#141C28');
    for (let y = 104; y < BG_H; y += 12) px(ctx, 0, y, 384, 1, '#141C28');
    px(ctx, 0, 104, 384, 1, '#6FC3E0', 0.35);
    this.still = c;
  }

  protected paintL0(ctx: CanvasRenderingContext2D): void {
    ctx.drawImage(this.still, 0, 0);
  }

  protected paintL1(): void {}

  /** What carries meaning (also over the 3D room). */
  protected drawL2(g: Gfx): void {
    const ctx = g.ctx;
    if (this.id === 'bg_c3_aq_kairo') {
      // where ジュンロ stood up: the double-sided tape's white lines, the arrow pointing on
      px(ctx, 170, 128, 44, 1, '#F4F1E8', 0.7);
      px(ctx, 170, 138, 44, 1, '#F4F1E8', 0.7);
      px(ctx, 214, 126, 1, 15, '#F4F1E8', 0.5);
    } else if (this.id === 'bg_c3_aq_hall') {
      // the light rippling with no water in the tank (caustics)
      for (let i = 0; i < 18; i++) {
        const x = ((i * 67 + this.t * 9 * (1 + (i % 3))) % 420) - 20;
        const y = 14 + ((i * 29) % 80) + Math.sin(this.t * 0.9 + i) * 3;
        px(ctx, x, y, 10 + (i % 4) * 3, 1, '#6FC3E0', 0.18);
        px(ctx, x + 3, y + 1, 5, 1, '#9FD8EC', 0.12);
      }
    } else {
      // the little 『マフィ屋』 sign in the corner, faded (the real one the diorama showed)
      px(ctx, 10, 62, 36, 18, '#6B4A2A');
      px(ctx, 11, 63, 34, 16, '#C8A878', 0.85);
      drawText(ctx, 'マフィ屋', 12, 63, { color: '#5A3A2A' });
    }
  }
}
