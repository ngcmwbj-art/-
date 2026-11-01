// 目で、いちばん 長く（03_ch3_index、events/ch3/fureai.ts）の 絵：旧水族館の ふれあいの 磯 map_c3_aq_fureai と、
// 回廊の 南の 壁の 木の 戸。字は 書かない（札・貼り紙の 字は 線だけ：62 の 決まり）。
//
//   prop_fr_shell     床と 北の 壁（1枚の 平らな 絵）。床は 館の 白い タイル（灰色に あせた）。壁は しっくいと 青い 帯。
//                     西の すみに 貼り紙 (1–2,1)（線の 字 3行と、いちばん 下の かすれた 1行）、北の 戸 (6,1)（木の 戸、
//                     上に 札）。glow：天井の 小窓から 水槽の 岩へ まっすぐ 落ちる 12:00 の 白い 光の 柱と ほこり。
//                     3つ すんだ あと（flag_fr_fureai）は 貼り紙の すみにも 小さな 光。
//   prop_fr_suisou    昔の タッチプール (3–8,3–5)：腰の 高さの 低い 水槽（¾ の 絵。HD-2D では 上が 寝て、前の 縁が 立つ：
//                     room_tune.ts LIE）。水は ぬけて、ごつごつした 岩、岩に 水の あった 高さの 白い 線。
//                     グソっ君が 生き物 役の 間（flag_fr_in）は まん中の 岩の 上で まるく なった グソっ君。
//                     すんだ あと（flag_fr_done）、いない ときは 岩の 上の 小さな くぼみ。
//   prop_fr_jaguchi   手洗い場 (10,2)：白い 流し、古い 蛇口、からの 石けん置き。
//   prop_fr_fumidai   子ども用の 木の 踏み台 (4,6)：上の 板が すりへって 白っぽい。
//   prop_fr_oke       ふちの 欠けた プラスチックの 手おけ (10,6)。
//   prop_fr_kairo_to  回廊の 南の 壁の 戸 (33,6)（map_c3_aq_kairo の 上に 平らな 絵。南の 壁は 見えないので、事務所の 戸と
//                     同じく 床の はしの 暗い 切れ目と、色の あせた 札）。

import { mix, PixelCanvas } from '../../engine/pixel';
import type { Gfx } from '../../engine/gfx';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { getMapDef } from '../../world/maps';
import { blend, dust, lightQuad, paintShell, screenPool, warmPool } from './ishell';
import { outline } from './kit';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const IN = 'flag_fr_in';
const DONE = 'flag_fr_done';
const FUREAI = 'flag_fr_fureai';
const INK = '#2A2440';
const PAPER = '#E8DCC0';
const BAND = '#3A7AA8';
const WOOD = '#8A6A4A';
const WOOD_DK = '#5E4632';
const NOON = '#FFF6D8';

/** 天井の 小窓からの 光の 柱（部屋の px：上の はし、幅、水槽の 岩の 上の 落ちる 所）。 */
const SHAFT = { x: 5 * 16 + 6, w: 22, y1: 4 * 16 + 4 };
/** 貼り紙（壁の 絵の px）。 */
const NOTE = { x: 16 + 6, y: 4, w: 20, h: 24 };

registerProp('prop_fr_shell', () => {
  const rows = getMapDef('map_c3_aq_fureai')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      // the house's white tiles gone grey, a grout line every 16 px; paler where the children stood round the pool
      const lx = x & 15;
      const ly = y & 15;
      if (lx === 15 || ly === 15) return '#9A968C';
      const t = ihash(x >> 4, y >> 4, 7701);
      let c = t % 5 === 0 ? '#C4C0B4' : t % 3 === 0 ? '#ECE8DE' : '#E0DCD0';
      if (lx === 0 || ly === 0) c = mix(c, '#FFFFFF', 0.25);
      if (valueNoise(x / 9, y / 7, 7703) > 0.72) c = mix(c, '#A89C88', 0.22);
      if (h01(x, y, 7705) > 0.993) c = '#8A8678';
      return c;
    },
    wall: (x, y, fh) => {
      // white plaster, the blue band at a child's eye height, damp stains from the ceiling
      const bandY = Math.round(fh * 0.6);
      if (y >= bandY && y < bandY + 4) return y === bandY ? mix(BAND, '#FFFFFF', 0.25) : BAND;
      let c = valueNoise(x / 8, y / 6, 7707) > 0.75 ? '#C8C4B8' : '#DAD6CA';
      if (y < bandY && valueNoise(x / 13, 0.5, 7709) > 0.74 && y < valueNoise(x / 5, 3, 7711) * bandY) c = mix(c, '#A89C88', 0.3);
      return c;
    },
    trim: '#B8B4A8',
    base: '#4A5A6A',
    baseH: 4,
  });
  const p = sh.p;
  // the notice 『ふれあいの やくそく』 (1–2,1): a title line, three rules (a number and a line each), the faded last line
  const n = NOTE;
  p.rect(n.x - 1, n.y - 1, n.w + 2, n.h + 2, '#9A9688');
  p.rect(n.x, n.y, n.w, n.h, PAPER);
  p.hline(n.x + 3, n.x + n.w - 4, n.y + 2, '#3A7AA8');
  for (let k = 0; k < 3; k++) {
    const yy = n.y + 6 + k * 5;
    p.rect(n.x + 2, yy - 1, 2, 3, '#E23B2E');
    p.hline(n.x + 6, n.x + 6 + Math.round(9 + 4 * h01(k, 3, 7713)), yy, INK);
  }
  // the last line, small and faded (dots)
  for (let x = n.x + 4; x < n.x + n.w - 4; x += 2) if (h01(x, 1, 7715) > 0.35) p.set(x, n.y + n.h - 3, mix(INK, PAPER, 0.7));
  // a drawing pin in each top corner
  p.set(n.x + 1, n.y + 1, '#C8452E');
  p.set(n.x + n.w - 2, n.y + 1, '#C8452E');
  // the door to the corridor (6,1): wood, a small window gone milky, its plate over it
  const dx = 6 * 16;
  p.rect(dx + 1, 8, 14, 24, WOOD_DK);
  p.rect(dx + 2, 9, 12, 23, WOOD);
  p.rect(dx + 4, 12, 8, 6, mix('#C8E4EC', '#E8E4D8', 0.5));
  p.hline(dx + 2, dx + 13, 9, '#A8865E');
  p.rect(dx + 11, 21, 2, 2, '#D9A441');
  p.rect(dx + 2, 2, 12, 5, '#E8E4D8');
  p.hline(dx + 4, dx + 11, 4, INK);
  // the little window high in the ceiling is not seen (the back wall's top): only its light, in glow()
  // the dry floor round the pool: a few pale rings where buckets stood, worn tiles in front of it
  for (let y = 6 * 16; y < 7 * 16; y++) for (let x = 3 * 16; x < 9 * 16; x++) if ((x + y) % 3 === 0 && h01(x, y, 7717) > 0.6) blend(p, x, y, '#F4F1E8', 0.12);
  // the light's patch on the floor beside the pool's front (the column falls onto the rocks; a little spills)
  for (let y = 6 * 16; y < 6 * 16 + 10; y++) for (let x = SHAFT.x - 4; x < SHAFT.x + SHAFT.w + 4; x++) if ((x + y) % 2 === 0) blend(p, x, y, NOON, 0.18);
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: sh.w * 16,
    h: sh.h * 16,
    foot: 0,
    flat: true,
    img: () => img,
    glow: (g: Gfx, x: number, y: number, env: PropEnv) => {
      // the noon column from the little window straight down onto the rocks, its dust
      lightQuad(g, x + SHAFT.x, y, SHAFT.w, SHAFT.y1, 0, NOON, 0.28);
      dust(g, x + SHAFT.x, y + 4, SHAFT.w, SHAFT.y1 - 6, 0, 10, env.t, 7719, 0.5);
      // once the three are done: the light on the notice's corner (the faded line)
      if (env.flag(FUREAI)) {
        g.rect(x + n.x + 2, y + n.y + n.h - 6, n.w - 4, 5, NOON, 0.35);
        g.rect(x + n.x + 4, y + n.y + n.h - 3, n.w - 8, 1, '#FFFFFF', 0.25);
      }
    },
    light: (g, x, y, env) => {
      // the room's own dim ceiling, the noon pool on the rocks
      warmPool(g, x + 6 * 16, y + 5 * 16, 70, 34, '#E8ECF0', 0.18);
      screenPool(g, x + SHAFT.x + SHAFT.w / 2, y + SHAFT.y1, 22, 12, NOON, 0.45);
      if (env.flag(FUREAI)) screenPool(g, x + n.x + n.w / 2, y + n.y + n.h - 3, 12, 6, NOON, 0.4);
    },
  } satisfies PropArt;
});

// ================================================================ 水槽

const TW = 6 * 16;
const TH = 3 * 16;
/** 前の 縁の 高さ（px。HD-2D では ここが 立つ：room_tune.ts LIE）。 */
export const FR_RIM = 12;
const RIM_C = '#8EAEB8';
const RIM_LT = '#B8D0D8';
const RIM_DK = '#5E7A86';
/** まん中の 岩（グソっ君の 席）：水槽の 絵の px。 */
const SEAT: [number, number] = [50, 17];

function rock(p: PixelCanvas, cx: number, cy: number, rx: number, ry: number, seed: number): void {
  for (let y = cy - ry; y <= cy + ry; y++)
    for (let x = cx - rx; x <= cx + rx; x++) {
      const d = ((x - cx) / rx) ** 2 + ((y - cy) / ry) ** 2;
      if (d > 1 - 0.25 * h01(x, y, seed)) continue;
      let c = valueNoise(x / 3, y / 3, seed) > 0.5 ? '#6E6458' : '#5E564C';
      if (y - cy < -ry * 0.3 && x - cx < rx * 0.2) c = '#8A8070';
      if (d > 0.7 && y > cy) c = '#4A443C';
      p.set(x, y, c);
    }
}

/** グソっ君、まるく なって（上から 少し 前の 寄り）。 */
function kanenariCurled(p: PixelCanvas, cx: number, cy: number): void {
  // the round body: ochre, a darker shade on its lower side, segment lines across
  p.ellipse(cx, cy, 8, 6, '#5A3A2A');
  p.ellipse(cx, cy, 7, 5, '#D49A5C');
  for (let y = cy + 1; y <= cy + 5; y++) for (let x = cx - 7; x <= cx + 7; x++) if (p.alpha(x, y) && ((x - cx) / 7) ** 2 + ((y - cy) / 5) ** 2 <= 1 && y > cy + 2) p.set(x, y, '#A8693A');
  for (const sx of [-4, -1, 2, 5]) for (let y = cy - 4; y <= cy + 3; y++) if (p.alpha(sx + cx, y)) p.set(cx + sx, y, '#A8693A');
  p.hline(cx - 5, cx + 1, cy - 4, '#EBBF86');
  // the headband, the eyes and a cheek on the head end (west)
  p.vline(cx - 6, cy - 3, cy + 2, '#FBF3DC');
  p.set(cx - 5, cy - 1, '#2A2440');
  p.set(cx - 5, cy - 2, '#FFF6D8');
  p.set(cx - 4, cy + 1, '#F08A7A');
  // the tail fan tucked at the east end
  p.set(cx + 7, cy - 1, '#A8693A');
  p.set(cx + 8, cy, '#A8693A');
  p.set(cx + 7, cy + 1, '#A8693A');
}

function suisou(state: 'empty' | 'in' | 'kubomi'): HTMLCanvasElement {
  const p = new PixelCanvas(TW, TH);
  const top = TH - FR_RIM;
  // the rim all round (seen from above), the basin inside
  p.rect(0, 0, TW, top, RIM_C);
  p.hline(0, TW - 1, 0, RIM_LT);
  p.rect(4, 4, TW - 8, top - 6, '#B4BCB8');
  // the basin's floor: dry, pale grey with a white crust where the salt dried
  for (let y = 5; y < top - 2; y++)
    for (let x = 5; x < TW - 5; x++) {
      let c = valueNoise(x / 5, y / 4, 7721) > 0.55 ? '#A8B0AC' : '#9CA4A0';
      if (h01(x, y, 7723) > 0.9) c = '#D8DCD4';
      if (y < 7) c = mix(c, '#5E6A6E', 0.35);
      p.set(x, y, c);
    }
  // the rocks (and the seat in the middle)
  rock(p, 18, 20, 11, 7, 7725);
  rock(p, SEAT[0], SEAT[1] + 2, 13, 8, 7727);
  rock(p, 78, 21, 10, 6, 7729);
  rock(p, 34, 11, 6, 4, 7731);
  rock(p, 66, 10, 7, 4, 7733);
  // the white line: how high the water was (a dotted ring across the rocks, the inner wall)
  for (let x = 5; x < TW - 5; x++) {
    const yy = 15 + Math.round(Math.sin(x / 7) * 0.6);
    if (p.alpha(x, yy) && (x % 3 !== 0 || h01(x, 2, 7735) > 0.5)) {
      const cur = p.get(x, yy);
      const r = cur & 255;
      if (r < 0x90) p.set(x, yy, '#E8ECE4');
    }
    if (x % 2 === 0) p.set(x, 6, '#E8ECE4');
  }
  // the drain in the corner, a little dry weed
  p.ellipse(TW - 10, top - 5, 2, 1, '#3A3F48');
  p.set(9, 23, '#6E8A5A');
  p.set(10, 22, '#6E8A5A');
  // who sits on the middle rock
  if (state === 'in') kanenariCurled(p, SEAT[0], SEAT[1]);
  else if (state === 'kubomi') {
    p.ellipse(SEAT[0], SEAT[1] + 1, 6, 3, '#4A443C');
    p.hline(SEAT[0] - 5, SEAT[0] + 5, SEAT[1] - 2, '#8A8070');
  }
  // the front: the tank's wall at a child's waist, a blue band, a worn edge where hands leaned
  p.rect(0, top, TW, FR_RIM, RIM_C);
  p.hline(0, TW - 1, top, RIM_LT);
  p.rect(0, top + 4, TW, 3, BAND);
  p.hline(0, TW - 1, top + 4, mix(BAND, '#FFFFFF', 0.25));
  p.hline(0, TW - 1, TH - 1, RIM_DK);
  for (let x = 20; x < 76; x += 2) if (h01(x, 5, 7737) > 0.5) p.set(x, top + 1, '#D8E4E8');
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

registerProp('prop_fr_suisou', () => {
  const imgs = { empty: suisou('empty'), in: suisou('in'), kubomi: suisou('kubomi') };
  return {
    ox: 0,
    oy: 0,
    w: TW,
    h: TH,
    foot: TH - 1,
    img: (env) => (env.flag(IN) ? imgs.in : env.flag(DONE) ? imgs.kubomi : imgs.empty),
    shadow: 4,
    contact: TW - 6,
    contactX: TW / 2,
  } satisfies PropArt;
});

// ================================================================ 部屋の 物

/** 手洗い場 (10,2)：白い 流し、古い 蛇口、からの 石けん置き。 */
registerProp('prop_fr_jaguchi', () =>
  standProp(16, 28, (p) => {
    // the pipe up the wall, the tap and its handle
    p.vline(8, 0, 9, '#8E95A6');
    p.rect(6, 6, 6, 2, '#B8BEC8');
    p.rect(10, 8, 2, 3, '#8E95A6');
    p.rect(5, 4, 4, 2, '#C8452E');
    // the sink: white, on a steel bracket
    p.rect(1, 12, 14, 7, '#E8ECEC');
    p.hline(1, 14, 12, '#FFFFFF');
    p.rect(3, 13, 10, 3, '#B8C4C8');
    p.set(8, 15, '#3A3F48');
    p.rect(2, 19, 12, 2, '#B8BEC8');
    p.vline(7, 21, 27, '#8E95A6');
    // the soap dish at the side: empty
    p.rect(12, 9, 4, 2, '#D8D4C8');
    p.hline(12, 15, 9, '#F4F1E8');
  }, { base: 16, cx: 8, shadow: 6 }),
);

/** 子ども用の 踏み台 (4,6)：木、上の 板が すりへって 白っぽい。 */
registerProp('prop_fr_fumidai', () =>
  standProp(16, 12, (p) => {
    p.rect(1, 2, 14, 3, '#C8A878');
    p.hline(1, 14, 2, '#E8D4B0');
    for (let x = 4; x < 12; x++) p.set(x, 3, '#E0CCA4');
    p.rect(2, 5, 2, 7, WOOD);
    p.rect(12, 5, 2, 7, WOOD);
    p.hline(3, 12, 8, WOOD_DK);
  }, { base: 15, cx: 8, shadow: 4 }),
);

/** ふちの 欠けた プラスチックの 手おけ (10,6)。 */
registerProp('prop_fr_oke', () =>
  standProp(14, 10, (p) => {
    p.rect(1, 2, 12, 7, '#4A8AB8');
    p.hline(1, 12, 2, '#7AB0D4');
    p.rect(2, 3, 10, 2, '#2E5A82');
    p.hline(2, 11, 9, '#2E5A82');
    // the chip in the rim
    p.set(9, 2, 0);
    p.set(10, 2, 0);
    p.set(10, 3, '#2E5A82');
    // the handle
    p.rect(0, 4, 1, 2, '#3A6A92');
    p.rect(13, 4, 1, 2, '#3A6A92');
  }, { base: 14, cx: 8, shadow: 3 }),
);

/** 回廊の 南の 壁の 戸 (33,6)：床の はしの 暗い 切れ目と、色の あせた 札（字は 線と 矢印）。 */
registerProp('prop_fr_kairo_to', () => {
  const p = new PixelCanvas(16, 32);
  // the notch at the floor's south edge (the wooden door seen from above: its top edge)
  p.rect(1, 16, 14, 3, '#5E4632');
  p.hline(1, 14, 16, '#8A6A4A');
  // the faded plate on the floor's edge: blue gone pale, a line and an arrow
  p.rect(2, 10, 12, 5, mix('#3A7AA8', '#E8E4D8', 0.55));
  p.hline(3, 8, 12, '#4A5A6A');
  p.line(10, 12, 12, 12, '#C8452E');
  p.set(11, 11, '#C8452E');
  p.set(11, 13, '#C8452E');
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 16, h: 32, foot: 0, flat: true, img: () => img } satisfies PropArt;
});
