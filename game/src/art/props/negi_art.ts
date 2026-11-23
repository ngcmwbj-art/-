// 土を 寄せるほど、白く なる（02_ch2_index、events/ch2/negi.ts）の 絵。
//
//   prop_nh_negi     裏の ネギ畑の 畝 1マスぶん（ネギ 3本と、根もとに 寄せた 土の 山）。opts.r：畝（0〜2）、opts.i：マスの 番号。
//                    土の 高さは その 畝の 土の 段（nhLevel：flag を 読む）。分かれ目より 下は 白、上は 緑の 葉。
//   prop_nh_taihi    よく ねかせた 堆肥の 小さな 山（黒く ぼろぼろ。湯気は 出さない：2026-10-30 会議）。
//   prop_nh_dougu    鍬と 移植ごて（石垣に 立てかけ）。
//   prop_nh_kame     雨水の かめ（ふちに ひしゃく）。
//   prop_nh_boushi   母の 麦わら帽子を かけた 杭。
//   prop_nh_monooki  小さな 物置（板壁、トタンの 片屋根、軒に わらの 束）。2×1。
//   prop_nh_fuda     3本目の 東の はしの 去年の 札『ここは 私』（板の 札。字は 細い すじ）。
//   prop_nh_kido     丸太の 柵の 木戸。opts.side 'out'：村の がわ（マサルの 家の 庭の 東の はし、マスの 東の ふち）、
//                    'in'：畑の がわ（マスの 西の ふち）。
//   prop_nh_uzumi    グソっ君（flag_nh_uzumi 1：畝の はしに 寝ころぶ、2：首まで 土。opts.at 1 は 3・4 の とき〈南の 通路〉）。
//                    0 の ときは 何も 描かない。

import { mix, PixelCanvas } from '../../engine/pixel';
import { charSprite, idleFrame } from '../chars';
import { ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { registerProp } from './registry';
import { standProp } from './hoshi_kit';
import type { PropArt, PropEnv } from './types';

export const NH_SOIL = '#3A2A22';
export const NH_SOIL_LT = '#5A4234';
export const NH_SOIL_DK = '#241A16';
export const NH_WHITE = '#F4F1E4';
export const NH_WHITE_SH = '#C8C8B4';
/** 土から 出た 葉鞘（光が 当たって うすい 緑）。 */
export const NH_PALE = '#B8D49A';
export const NH_LEAF = '#4E9A4A';
export const NH_LEAF_LT = '#7CC06A';
export const NH_LEAF_DK = '#2E6A36';

/** 土の 段：0〜NH_MAX。分かれ目は NH_FORK（そこまで 土が 来ると 分かれ目が 埋まる）。 */
export const NH_MAX = 8;
export const NH_FORK = 6;
/** 畝ごとの はじめの 段（1本目：見本〈寄せた ばかり〉、2本目：寄せて いない、3本目：寄せすぎ）。 */
export const NH_START_LV = [5, 1, 7] as const;
/** 畝 r の 土の 段を しまう flag（値 = 段 + 1。0 は はじめの 段）。 */
export const nhLvFlag = (r: number): string => `flag_nh_lv_${r}`;
export function nhLevelOf(r: number, v: number): number {
  return v > 0 ? v - 1 : NH_START_LV[r] ?? 0;
}

// ---------------------------------------------------------------- 畝 1マス

/** 1段 = 1px（マスの 中の 絵。ネギは 人の 半分ほどの 高さ：通路の 人を かくさない）。 */
const LPX = 1;
const NW = 18;
const NHT = 22;

function rowTile(r: number, i: number, lv: number): HTMLCanvasElement {
  const p = new PixelCanvas(NW, NHT);
  const base = NHT - 3;
  const seed = r * 31 + i * 7;
  // three leeks a tile, a little apart, each a white-to-green stalk, the leaves fanning from the fork
  const xs = [4, 9, 14];
  for (let k = 0; k < xs.length; k++) {
    const x = xs[k] + ((ihash(k, seed, 11) % 3) - 1);
    const fork = base - NH_FORK * LPX - (ihash(k, seed, 13) % 2);
    // the sheath (white under the soil, pale green above it: drawn white here, the soil covers it below)
    for (let y = fork; y <= base; y++) {
      const soilY = base - lv * LPX;
      const c = y >= soilY ? NH_WHITE : NH_PALE;
      p.set(x, y, c);
      p.set(x + 1, y, y >= soilY ? NH_WHITE_SH : mix(NH_PALE, NH_LEAF, 0.4));
    }
    // the leaves from the fork: four, up and out (the green)
    const lean = (ihash(k, seed, 17) % 3) - 1;
    const leaves: [number, number][] = [[-4, -7], [-1, -10], [2, -9], [4, -6]];
    for (const [dx, dy] of leaves) p.line(x, fork, x + dx + lean, fork + dy, dx < 0 ? NH_LEAF_DK : NH_LEAF);
    p.set(x + lean, fork - 9, NH_LEAF_LT);
    // the fork's notch (a dark dot where the leaves part)
    p.set(x, fork, NH_LEAF_DK);
  }
  // the ridge of soil drawn up to the leeks (a mound as high as the level, crumbs on its face)
  const top = base - lv * LPX;
  for (let x = 0; x < NW; x++) {
    const edge = Math.min(x, NW - 1 - x);
    const h = Math.max(0, base - top - Math.max(0, 3 - edge));
    for (let y = base - h; y <= base + 2; y++) {
      const c = y === base - h ? NH_SOIL_LT : (ihash(x, y, seed) % 7 === 0 ? NH_SOIL_DK : NH_SOIL);
      p.set(x, y, c);
    }
  }
  return p.toCanvas();
}

registerProp('prop_nh_negi', (opts) => {
  const r = Number(opts.r ?? 0);
  const i = Number(opts.i ?? 0);
  const cache = new Map<number, HTMLCanvasElement>();
  const img = (env: PropEnv) => {
    const lv = nhLevelOf(r, env.flag(nhLvFlag(r)));
    let c = cache.get(lv);
    if (!c) {
      c = rowTile(r, i, lv);
      cache.set(lv, c);
    }
    return c;
  };
  return { ox: -1, oy: 16 - NHT + 2, w: NW, h: NHT, foot: 14, img, contact: 14, shadow: 8 } satisfies PropArt;
});

// ---------------------------------------------------------------- 堆肥の 山

registerProp('prop_nh_taihi', () =>
  standProp(
    20,
    14,
    (p) => {
      // a low heap of well-rotted compost: black-brown, crumbly (no steam: it is ready)
      p.ellipse(10, 11, 9, 6, NH_SOIL);
      p.ellipse(10, 9, 6, 4, NH_SOIL_LT);
      for (let k = 0; k < 18; k++) p.set(3 + (ihash(k, 5, 3) % 14), 6 + (ihash(k, 7, 3) % 7), k % 3 ? NH_SOIL_DK : '#6A5040');
      // a few wood-shaving flecks gone dark (the sawdust)
      p.set(7, 9, '#8A6A4A');
      p.set(13, 10, '#8A6A4A');
    },
    { cx: 8, base: 16, foot: 14, shadow: 3, contact: 16 },
  ),
);

// ---------------------------------------------------------------- 鍬と 移植ごて

registerProp('prop_nh_dougu', () =>
  standProp(
    16,
    26,
    (p) => {
      // the hoe leaning (a long handle, the blade at the foot)
      p.line(4, 2, 9, 23, P.woodLt);
      p.line(5, 2, 10, 23, P.wood);
      p.rect(6, 21, 8, 3, P.steel);
      p.hline(6, 13, 21, mix(P.steel, P.white, 0.4));
      // the trowel stuck in the ground beside it
      p.rect(12, 14, 2, 5, P.wood);
      p.poly([[11, 19], [15, 19], [13, 24]], P.steel);
    },
    { cx: 8, base: 26, foot: 24, shadow: 6, contact: 10, extra: { oy: 16 - 26 } },
  ),
);

// ---------------------------------------------------------------- 雨水の かめ

registerProp('prop_nh_kame', () =>
  standProp(
    16,
    18,
    (p) => {
      p.ellipse(8, 11, 6, 6, '#6A4A3A');
      p.ellipse(8, 10, 5, 5, '#8A5E44');
      p.rect(3, 4, 11, 2, '#6A4A3A');
      p.hline(4, 12, 5, '#2A3448');
      p.hline(5, 11, 6, '#3A4A64');
      // the dipper hung on the rim
      p.line(12, 3, 15, 0, P.woodLt);
      p.ellipse(11, 5, 2, 1, P.wood);
    },
    { cx: 8, base: 18, foot: 16, shadow: 4, contact: 12, extra: { oy: 16 - 18 } },
  ),
);

// ---------------------------------------------------------------- 麦わら帽子の 杭

registerProp('prop_nh_boushi', () =>
  standProp(
    16,
    26,
    (p) => {
      p.rect(7, 8, 2, 18, P.wood);
      p.vline(8, 8, 25, P.woodDark);
      // the straw hat on the stake's top (a wide brim, a crown, a faded ribbon; a smudge of soil at the brim)
      p.ellipse(8, 8, 7, 2, P.goldPale);
      p.ellipse(8, 6, 4, 3, mix(P.goldPale, P.woodLt, 0.3));
      p.hline(4, 12, 7, '#A86A5A');
      p.set(2, 9, NH_SOIL_LT);
      p.set(3, 9, NH_SOIL_LT);
    },
    { cx: 8, base: 26, foot: 24, shadow: 8, contact: 6, extra: { oy: 16 - 26 } },
  ),
);

// ---------------------------------------------------------------- 物置

registerProp('prop_nh_monooki', () =>
  standProp(
    32,
    30,
    (p) => {
      p.rect(2, 10, 28, 19, P.wood);
      for (let x = 2; x < 30; x += 4) p.vline(x, 10, 28, P.woodDark);
      p.rect(18, 15, 9, 14, mix(P.wood, P.woodLt, 0.3));
      p.rect(19, 21, 2, 2, P.ink);
      p.poly([[0, 10], [32, 6], [32, 9], [0, 13]], P.steel);
      p.line(0, 10, 31, 6, mix(P.steel, P.white, 0.4));
      // bundles of straw for tying the leeks, hung under the eave
      for (const x of [6, 11]) {
        p.rect(x, 12, 3, 8, P.goldPale);
        p.hline(x, x + 2, 14, P.brassOld);
      }
    },
    { cx: 16, base: 30, foot: 28, shadow: 10, contact: 26, extra: { oy: 16 - 30 } },
  ),
);

// ---------------------------------------------------------------- 去年の 札

registerProp('prop_nh_fuda', () =>
  standProp(
    16,
    20,
    (p) => {
      p.rect(7, 8, 2, 12, P.wood);
      p.rect(3, 1, 10, 9, mix(P.paper, P.woodLt, 0.45));
      p.strokeRect(3, 1, 10, 9, P.woodDark);
      // a faded hand (thin strokes)
      const c = mix(P.ink, P.woodLt, 0.35);
      p.vline(6, 3, 7, c);
      p.hline(8, 10, 4, c);
      p.vline(9, 4, 8, c);
    },
    { cx: 8, base: 18, foot: 16, shadow: 5, contact: 6, extra: { oy: 16 - 20 } },
  ),
);

// ---------------------------------------------------------------- 木戸

registerProp('prop_nh_kido', (opts) => {
  const out = opts.side === 'out';
  const W = 16;
  const H = 26;
  const p = new PixelCanvas(W, H);
  // (village side: the gate stands across the east edge of its tile, as the log fence does; field side: the west edge)
  const x0 = 3;
  // two log posts
  for (const x of [x0, x0 + 9]) {
    p.rect(x, 4, 3, 22, P.wood);
    p.vline(x + 2, 4, 25, P.woodDark);
    p.hline(x, x + 2, 4, P.woodLt);
  }
  // the board door between, a diagonal brace, the wooden bar (かんぬき)
  p.rect(x0 + 3, 9, 6, 15, mix(P.wood, P.woodLt, 0.35));
  for (let y = 9; y < 24; y += 3) p.hline(x0 + 3, x0 + 8, y, P.woodDark);
  p.line(x0 + 3, 23, x0 + 8, 10, P.woodDark);
  p.rect(x0 + 1, 15, 11, 2, P.woodLt);
  const img = p.toCanvas();
  return { ox: out ? 6 : -6, oy: 16 - H + 1, w: W, h: H, foot: 15, img: () => img, contact: 0, shadow: 6 } satisfies PropArt;
});

// ---------------------------------------------------------------- グソっ君（寝ころぶ・首まで）

registerProp('prop_nh_uzumi', (opts) => {
  const at = Number(opts.at ?? 0);
  const W = 32;
  const H = 24;
  let lie: HTMLCanvasElement | null = null;
  let buried: HTMLCanvasElement | null = null;
  let empty: HTMLCanvasElement | null = null;
  const make = (k: 1 | 2): HTMLCanvasElement => {
    const fr = idleFrame(charSprite('kanenari'), 'down', 0);
    const c = document.createElement('canvas');
    c.width = W;
    c.height = H;
    const g = c.getContext('2d')!;
    g.imageSmoothingEnabled = false;
    if (k === 1) {
      // lying on his side along the row's end (the sprite turned a quarter, head to the west)
      g.save();
      // (rotate -90°: the frame's x runs up the screen, its y to the right → its top, the head, ends at the west)
      g.translate(W / 2, H - 2 - fr.width);
      g.rotate(-Math.PI / 2);
      g.drawImage(fr, -fr.width, -fr.height / 2);
      g.restore();
    } else {
      // up to the neck in soil: the head above a long mound
      g.drawImage(fr, 0, 0, fr.width, 12, Math.round(W / 2 - fr.width / 2), 2, fr.width, 12);
      const m = new PixelCanvas(W, H);
      for (let x = 1; x < W - 1; x++) {
        const t = Math.abs(x - W / 2) / (W / 2);
        const h = Math.round(10 * Math.sqrt(1 - t * t));
        for (let y = H - 2 - h; y < H - 1; y++) m.set(x, y, y === H - 2 - h ? NH_SOIL_LT : ihash(x, y, 9) % 6 === 0 ? NH_SOIL_DK : NH_SOIL);
      }
      g.drawImage(m.toCanvas(), 0, 0);
    }
    return c;
  };
  const img = (env: PropEnv) => {
    const k = env.flag('flag_nh_uzumi') - at * 2;
    if (k === 1) return (lie ??= make(1));
    if (k === 2) return (buried ??= make(2));
    // (an empty canvas, not null: the HD-2D keeps the prop's billboard and swaps its picture)
    if (!empty) {
      empty = document.createElement('canvas');
      empty.width = W;
      empty.height = H;
    }
    return empty;
  };
  return { ox: 8 - W / 2, oy: 16 - H + 2, w: W, h: H, foot: 14, img, contact: 0, shadow: 0 } satisfies PropArt;
});
