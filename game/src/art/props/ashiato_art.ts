// 夜の 足あと帳の 絵（第2章。2026-10-06 依頼主の採用：げむきかの 案3、02_ch2_index #87、
// 52_ch2_level_art 7.10）。
//
//   ・足あと（decal_ashiato、opts.k）：灯りの 中だけ 見える 地面の 模様（litOnly。今の 子どもの
//     足あと decal_h_kodomo_ashiato と 同じ 作り）。見つけやすいように、土より 明るい 麦わら色と、
//     くぼみの 濃い 茶。段階1 は それぞれの 場所へ 向かう 向き、段階2 は 山の ほうへ 帰る 向き
//     （ふくじんづけは 家へ 帰るので、どちらも 同じ）。
//       ino  イノシシ   2つの ひづめ ＋ うしろに 副蹄の 小さな 点 2つ。ハウスの 裾は 鼻で 掘りかえした 土。
//       haku ハクビシン 5本ゆびの 手の あと。戸の 柱の 下で 泥が はねている。
//       tanu タヌキ     4本ゆび、ゆびの 間が 広い。
//       shika シカ      細く、つま先の とがった ひづめ 2つ（副蹄は 写らない）。
//       usagi ノウサギ   小さい 丸 2つ（前足）の 前に、長い 2つ（うしろ足）。台の 下に かじった きゅうり。
//       inu  ふくじんづけ 4本ゆびの 小さな 犬の 足。軍手の 白い 糸くず。
//   ・畦豆（prop_ashiato_azemame）：棚田の 4段目の 畦に 植えた 大豆。8月の 終わり：葉が 茂って、
//     さやが つきはじめた ころ。シカに 葉の 先を かじられた 株が 2つ。
//   ・うり坊を 数える 小窓の 絵（柵の 内側から、灯りを 低く して 北を 見る）：夜の 空、山の 影、
//     耕作放棄地の クズ、柵の 向こうの 土、電気柵の 線と 支柱。親の イノシシと うり坊（しまが
//     うすく なりかけ）。灯りの 中だけ 色と ふちの 光。
//   ・みました帳の 足あとの えんぴつの 絵、表紙の うり坊の シール、エンディングの 小さな 影。

import { PixelCanvas, mix } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { h01, valueNoise } from '../tiles/noise';
import { registerProp } from './registry';
import { standProp, hs } from './hoshi_kit';
import type { PropEnv } from './types';

export type AshiatoKind = 'ino' | 'haku' | 'tanu' | 'shika' | 'usagi' | 'inu';

const cache = new Map<string, HTMLCanvasElement>();
function cached(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = build()));
  return c;
}

// ---------------------------------------------------------------- 足あとの 形（北向き = つま先が 上）

/**
 * x = くぼみの ふち（明るい）、d = くぼみの 底（濃い）、. = なし。
 * 北向き（進む 向きが 上）。ほかの 向きは 回して 使う。
 */
const STAMP: Record<AshiatoKind, string[]> = {
  // 丸い 2つの ひづめ、うしろに 副蹄（小さな 点 2つ、少し 外がわ）
  ino: ['xx.xx', 'xd.dx', 'xd.dx', '.x.x.', '.....', 'd...d'],
  // 5本ゆびの 手の あと（3本 上、2本 わき）と 手のひら
  haku: ['.x.x.x.', 'x.....x', '..xxx..', '.xdddx.', '..xxx..'],
  // 4本ゆび、ゆびの 間が 広い。肉球
  tanu: ['.x..x.', 'x....x', '..xx..', '.xddx.', '..xx..'],
  // 細く とがった ひづめ 2つ（先が 寄る）。副蹄は 写らない
  shika: ['.x.x.', '.x.x.', 'xd.dx', 'xd.dx', '.x.x.'],
  // うしろ足（長い 2つ）が 前、前足（小さい 丸 2つ）が うしろに 1列
  usagi: ['x.x', 'd.d', 'd.d', 'x.x', '...', '.x.', '...', '.x.'],
  // 4本ゆび、寄っている。爪の 点
  inu: ['.x.x.', 'x...x', '.xxx.', '.xdx.', '..x..'],
};

/** ゆびや ひづめの 数（みました帳の えんぴつの 数字）。 */
export const ASHIATO_TOES: Record<AshiatoKind, string> = {
  ino: '2',
  haku: '5',
  tanu: '4',
  shika: '2',
  usagi: '4',
  inu: '4',
};

type Dir4 = 'n' | 'e' | 's' | 'w';

/** 北向きの 形を 回す（e = 右へ 90°）。 */
function rotated(rows: string[], dir: Dir4): string[] {
  const h = rows.length;
  const w = rows[0].length;
  const at = (x: number, y: number) => rows[y][x];
  if (dir === 'n') return rows;
  if (dir === 's') return rows.map((r) => [...r].reverse().join('')).reverse();
  const out: string[] = [];
  if (dir === 'e') {
    // 上 → 右：新しい (x, y) = 古い (y, h-1-x)
    for (let y = 0; y < w; y++) {
      let s = '';
      for (let x = 0; x < h; x++) s += at(y, h - 1 - x);
      out.push(s);
    }
  } else {
    for (let y = 0; y < w; y++) {
      let s = '';
      for (let x = 0; x < h; x++) s += at(w - 1 - y, x);
      out.push(s);
    }
  }
  return out;
}

/** 足あとの 色：土より 明るい 麦わら色の ふちと、濃い 茶の 底（灯りの 中で 目に つく）。 */
const RIM = '#FFE2A0';
const PIT = '#8A5230';
const RIM_HI = '#FFF6D8';
/** 足あとの まわりの 濃い ふち（土に 押しこまれた 影）。 */
const EDGE = '#3A2418';

/** 1つの 足あとを (cx, cy) を まん中に 押す（まわりに 濃い ふち：地面から 浮いて 見える）。 */
function stamp(p: PixelCanvas, k: AshiatoKind, cx: number, cy: number, dir: Dir4, seed = 0): void {
  const rows = rotated(STAMP[k], dir);
  const h = rows.length;
  const w = rows[0].length;
  const x0 = Math.round(cx - w / 2);
  const y0 = Math.round(cy - h / 2);
  const on = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.';
  for (let y = -1; y <= h; y++)
    for (let x = -1; x <= w; x++) {
      if (on(x, y)) continue;
      if (on(x - 1, y) || on(x + 1, y) || on(x, y - 1) || on(x, y + 1)) {
        if (p.alpha(x0 + x, y0 + y) === 0) p.set(x0 + x, y0 + y, EDGE);
      }
    }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const ch = rows[y][x];
      if (ch === '.') continue;
      const hi = ch === 'x' && h01(x0 + x, y0 + y, 977 + seed) < 0.18;
      p.set(x0 + x, y0 + y, ch === 'd' ? PIT : hi ? RIM_HI : RIM);
    }
}

/** 掘りかえした 土（イノシシの 鼻）：濃い 土くれと、明るい 砕けた 土。 */
function dug(p: PixelCanvas, x0: number, y0: number, w: number, h: number, seed: number): void {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const n = valueNoise(x / 3, y / 3, seed);
      const r = h01(x, y, seed + 7);
      if (n > 0.52 && r < 0.7) p.set(x, y, r < 0.25 ? '#4A2E1E' : '#6A4430');
      else if (n > 0.42 && r < 0.3) p.set(x, y, '#C8A06A');
    }
}

/** 段階1 は 行き、段階2 は 帰り（山の ほうへ）。 */
function trail(k: AshiatoKind, out: boolean): HTMLCanvasElement {
  return cached(`${k}:${out ? 'out' : 'in'}`, () => {
    switch (k) {
      case 'ino': {
        // 2号と 1号の あいだの 路地 (8,24–27)：北の 獣害柵の ほうから 来て、1号の 裾（東の ふち）を 掘る
        const p = new PixelCanvas(16, 64);
        dug(p, 11, 22, 5, 30, 311);
        dug(p, 10, 34, 3, 10, 312);
        for (let i = 0; i < 6; i++) {
          const y = out ? 58 - i * 10 : 4 + i * 10;
          stamp(p, 'ino', i % 2 ? 9 : 5, y, out ? 'n' : 's', i);
        }
        return p.toCanvas();
      }
      case 'haku': {
        // 3号ハウスの 戸の 前 (1–3,31)：東から 来て 戸の 左の 柱 (2,30 の 西の ふち) の 下へ。柱の 下で 泥が はねる。
        // 帰りは 柱から 西の 竹林の ほうへ（西の はしの コンテナの 手前まで）
        const p = new PixelCanvas(48, 16);
        for (const [x, y] of [
          [15, 1],
          [17, 2],
          [13, 2],
          [16, 0],
          [18, 0],
        ] as [number, number][])
          p.set(x, y, '#6A4430');
        const pts: [number, number, Dir4][] = out
          ? [
              [15, 5, 'w'],
              [9, 9, 'w'],
              [3, 6, 'w'],
            ]
          : [
              [42, 12, 'w'],
              [35, 9, 'w'],
              [27, 10, 'w'],
              [19, 5, 'n'],
            ];
        pts.forEach(([x, y, d], i) => stamp(p, 'haku', x, y, d, i));
        return p.toCanvas();
      }
      case 'tanu': {
        // 体育館と 民家2の あいだの 路地の 口 (39–40,22–23)：用水路の 岸から 上がってきた 泥の 足
        const p = new PixelCanvas(32, 32);
        for (let x = 4; x < 28; x++) if (h01(x, 0, 41) < 0.6) p.set(x, h01(x, 1, 42) < 0.5 ? 0 : 1, '#5A3A2A');
        for (let i = 0; i < 5; i++) {
          const y = out ? 27 - i * 6 : 4 + i * 6;
          stamp(p, 'tanu', i % 2 ? 19 : 12, y, out ? 'n' : 's', i);
        }
        return p.toCanvas();
      }
      case 'shika': {
        // 棚田の 4段目の 畦 (15–17,11)：沢の ほう（西）から 来て 豆を かじり、帰りは 西へ
        const p = new PixelCanvas(48, 16);
        for (let i = 0; i < 6; i++) {
          const x = out ? 44 - i * 8 : 3 + i * 8;
          stamp(p, 'shika', x, i % 2 ? 12 : 9, out ? 'w' : 'e', i);
        }
        return p.toCanvas();
      }
      case 'usagi': {
        // 無人販売所の 台の 下 (21–22,38)：台の 下に かじった きゅうり。跳んで 来た 跡
        const p = new PixelCanvas(32, 16);
        // the cucumber under the stand, bitten (its little tooth marks)
        for (let x = 22; x < 29; x++) p.set(x, 1, x === 22 ? '#3F6A2E' : '#5FA85A');
        for (let x = 22; x < 29; x++) p.set(x, 2, '#3F6A2E');
        p.set(28, 1, '#E8E4C0');
        p.set(27, 2, '#E8E4C0');
        p.set(25, 1, '#C9E08A');
        p.set(29, 2, '#C9E08A');
        if (out) {
          stamp(p, 'usagi', 14, 9, 'w', 0);
          stamp(p, 'usagi', 4, 11, 'w', 1);
        } else {
          stamp(p, 'usagi', 8, 9, 'n', 0);
          stamp(p, 'usagi', 19, 8, 'n', 1);
        }
        return p.toCanvas();
      }
      case 'inu': {
        // 堆肥舎の 戸の 前 (49,44) から マサルの 家の 戸 (57,44) まで。軍手の 白い 糸くず
        const p = new PixelCanvas(144, 16);
        for (let i = 0; i < 16; i++) stamp(p, 'inu', 4 + i * 9, i % 2 ? 10 : 6, 'e', i);
        for (const x of [20, 61, 98, 127]) {
          p.set(x, 13, '#F4F1E8');
          p.set(x + 1, 12, '#F4F1E8');
          p.set(x + 2, 13, '#E8E4D8');
        }
        return p.toCanvas();
      }
    }
  });
}

/** 足あとの 置き場所（その タイルの 左上から）と 大きさ。 */
const TRAIL_BOX: Record<AshiatoKind, { w: number; h: number }> = {
  ino: { w: 16, h: 64 },
  haku: { w: 48, h: 16 },
  tanu: { w: 32, h: 32 },
  shika: { w: 48, h: 16 },
  usagi: { w: 32, h: 16 },
  inu: { w: 144, h: 16 },
};

registerProp('decal_ashiato', (opts) => {
  const k = String(opts.k ?? 'ino') as AshiatoKind;
  const b = TRAIL_BOX[k];
  return {
    ox: 0,
    oy: 0,
    w: b.w,
    h: b.h,
    foot: 0,
    flat: true,
    // ふくじんづけは 家へ 帰る：段階2も 同じ
    img: (env: PropEnv) => trail(k, k !== 'inu' && hs(env) >= 2),
  };
});

// ---------------------------------------------------------------- 畦豆（棚田の 4段目の 畦）

const BEAN = {
  stem: '#6A8A3A',
  leaf: '#6FA84A',
  leafLt: '#A8D070',
  leafDk: '#3F6A34',
  pod: '#C8DC90',
  podDk: '#8AA860',
  bite: '#E8ECC0',
};

/**
 * 1株（9×13）：根元から 3本の 枝、3枚ずつの 葉（三つ葉）、枝の つけ根に 小さな さや。
 * bitten：上の 葉が なく、かじられた 茎の 先と 葉の ふち（明るい 切り口）。
 */
function bean(p: PixelCanvas, x0: number, base: number, bitten: boolean, seed: number): void {
  const top = bitten ? base - 7 : base - 12;
  p.vline(x0 + 4, top + 1, base, BEAN.stem);
  // a broad oval leaflet (not a rice blade): 3 wide, a light top, a dark underside
  const leaflet = (cx: number, cy: number, s: number) => {
    p.set(cx - 1, cy, BEAN.leaf);
    p.set(cx, cy, BEAN.leaf);
    p.set(cx + 1, cy, BEAN.leafDk);
    p.set(cx, cy - 1, BEAN.leafLt);
    p.set(cx - 1, cy - 1, h01(cx, cy, s) < 0.5 ? BEAN.leafLt : BEAN.leaf);
    p.set(cx, cy + 1, BEAN.leafDk);
  };
  const tri = (cx: number, cy: number) => {
    leaflet(cx, cy - 1, seed);
    leaflet(cx - 2, cy + 1, seed + 1);
    leaflet(cx + 2, cy + 1, seed + 2);
  };
  // the lower leaves, both sides
  tri(x0 + 2, base - 4);
  tri(x0 + 6, base - 5);
  if (!bitten) {
    // the young top leaves (the tender ones)
    tri(x0 + 4, base - 10);
    p.set(x0 + 4, top, BEAN.leafLt);
  } else {
    // the stem cut short, the bitten edges pale
    p.set(x0 + 4, top, BEAN.bite);
    p.set(x0 + 3, base - 6, BEAN.bite);
    p.set(x0 + 6, base - 7, BEAN.bite);
  }
  // pods starting at the joints (small, hairy green)
  p.set(x0 + 3, base - 2, BEAN.pod);
  p.set(x0 + 3, base - 1, BEAN.podDk);
  p.set(x0 + 5, base - 3, BEAN.pod);
  p.set(x0 + 5, base - 2, BEAN.podDk);
}

registerProp('prop_ashiato_azemame', () =>
  standProp(
    80,
    15,
    (p) => {
      // 5株、16px ごと。シカの 来た あたり（2・3株目）は かじられている
      for (let i = 0; i < 5; i++) bean(p, 3 + i * 16 + (i % 2), 14, i === 1 || i === 2, 50 + i);
    },
    // 畦の 土の 上に 根元（葉は 上の 稲の きわに かかる）：歩く 人は 前を 通る
    { cx: 40, base: 11, foot: 7, outline: false },
  ),
);

// ---------------------------------------------------------------- みました帳の えんぴつの 絵

/** 足あとの えんぴつの 絵（北向き、2倍）。 */
export function ashiatoSketch(k: AshiatoKind, color: string): HTMLCanvasElement {
  return cached(`sketch:${k}:${color}`, () => {
    const rows = STAMP[k];
    const w = rows[0].length;
    const h = rows.length;
    const p = new PixelCanvas(w * 2, h * 2);
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const ch = rows[y][x];
        if (ch === '.') continue;
        if (ch === 'd') {
          // the pit: hatched
          p.set(x * 2, y * 2, color);
          p.set(x * 2 + 1, y * 2 + 1, color);
        } else p.rect(x * 2, y * 2, 2, 2, color);
      }
    return p.toCanvas();
  });
}

/** グソっ君の 足あと（細かい 点が 2列に 7つずつ）の えんぴつの 絵。 */
export function guSketch(color: string): HTMLCanvasElement {
  return cached(`sketch:gu:${color}`, () => {
    const p = new PixelCanvas(7, 14);
    for (let i = 0; i < 7; i++) {
      p.set(1, i * 2, color);
      p.set(5, i * 2, color);
    }
    return p.toCanvas();
  });
}

// ---------------------------------------------------------------- 表紙の うり坊の シール

/** 14×11 の 丸い シール：白地に、しまの うすい うり坊（左向き）。 */
export function stickerUribo(): HTMLCanvasElement {
  return cached('sticker:uribo', () => {
    const p = new PixelCanvas(15, 12);
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 15; x++) {
        const d = Math.hypot((x + 0.5 - 7.5) / 7.3, (y + 0.5 - 6) / 5.8);
        if (d <= 1) p.set(x, y, '#F4F1E8');
      }
    p.blit(uriboPix(true, 0, false), 1, 2);
    return p.toCanvas();
  });
}

// ---------------------------------------------------------------- うり坊を 数える 小窓（328×116）

export const UB_W = 328;
export const UB_H = 116;
/** 柵の 向こうの 土の 上：イノシシの 足の 行。 */
export const UB_GROUND_Y = 88;
/** 低く した 灯りの 輪（まん中・半径）。 */
export const UB_LIGHT = { x: 150, y: 94, rx: 74, ry: 24 };
/** 電気柵の 線の 行（地面から 20cm・40cm）。 */
export const UB_WIRES = [96, 84];
export const UB_POSTS = [18, 122, 226, 318];

/** 小窓の 背景（dark：夜。lit：灯りが 当たった ところ）。h2：地平に 紫の すじ。 */
export function uriboBg(stage: number, lit: boolean): HTMLCanvasElement {
  return cached(`ubg:${stage}:${lit}`, () => {
    const p = new PixelCanvas(UB_W, UB_H);
    const W = UB_W;
    // sky
    for (let y = 0; y < 26; y++) {
      const k = y / 26;
      const c = stage >= 2 && y > 18 ? mix('#2A2440', '#3A2B5C', (y - 18) / 8) : mix('#0B0B14', '#1B1733', k);
      p.hline(0, W - 1, y, c);
    }
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(h01(i, 3, 701) * W);
      const y = Math.floor(h01(i, 5, 702) * 20);
      p.set(x, y, i % 5 ? '#8E88B8' : '#FFF6D8');
    }
    // the mountain behind the abandoned field: dark cedar, a soft ridge (down to the ground: the kuzu lies over it)
    for (let x = 0; x < W; x++) {
      const top = 14 + Math.round(valueNoise(x / 40, 0.5, 703) * 12 + valueNoise(x / 9, 1.5, 704) * 3);
      for (let y = top; y < UB_GROUND_Y; y++) p.set(x, y, y === top ? '#2A2E44' : y > 44 ? (lit ? '#2A3426' : '#121812') : h01(x, y, 705) < 0.12 ? '#20243A' : '#181C2E');
    }
    // the kuzu thicket of the abandoned field: big leaves, a ragged top, an animal path (the gap at the right)
    for (let x = 0; x < W; x++) {
      // the animal path: a soft V in the kuzu's edge, ragged
      const g = Math.max(0, 1 - Math.abs(x - 278) / 16);
      const gap = Math.round(g * 20 + (g > 0 ? valueNoise(x / 3, 4.5, 710) * 4 : 0));
      const top = 34 + Math.round(valueNoise(x / 14, 2.5, 706) * 14) + gap;
      for (let y = top; y < UB_GROUND_Y - 4; y++) {
        const n = valueNoise(x / 5, y / 4, 707);
        const c = lit ? (n > 0.62 ? '#5E8A4A' : n > 0.4 ? '#3F6A3A' : '#2E5233') : n > 0.62 ? '#24402E' : n > 0.4 ? '#1C3226' : '#14261E';
        p.set(x, y, c);
        if (y === top) p.set(x, y, lit ? '#8AB060' : '#2E4A36');
      }
    }
    // the trodden earth beyond the fence (where they walk)
    for (let y = UB_GROUND_Y - 4; y < 100; y++)
      for (let x = 0; x < W; x++) {
        const n = h01(x, y, 708);
        const c = lit ? (n < 0.15 ? '#8A6A48' : n < 0.5 ? '#6E5038' : '#5E442E') : n < 0.15 ? '#2E2630' : '#241E28';
        p.set(x, y, c);
      }
    // the near side: grass inside the fence (the bottom)
    for (let y = 100; y < UB_H; y++)
      for (let x = 0; x < W; x++) {
        const n = h01(x, y, 709);
        const c = lit ? (n < 0.3 ? '#4E7A3A' : '#3A5E2E') : n < 0.3 ? '#1C2E22' : '#16241C';
        p.set(x, y, c);
        if (n > 0.93 && y > 102) p.set(x, y - 1, lit ? '#6A9A4A' : '#22382A');
      }
    return p.toCanvas();
  });
}

/** 電気柵（手前）：支柱と、がいし、2段の 線。灯りの 中は 線が 光る。 */
export function fencePix(lit: boolean): HTMLCanvasElement {
  return cached(`ufence:${lit}`, () => {
    const p = new PixelCanvas(UB_W, UB_H);
    for (const x of UB_POSTS) {
      p.rect(x - 1, 72, 3, 34, lit ? '#8A8478' : '#2E2C34');
      p.vline(x - 1, 72, 105, lit ? '#B8B0A0' : '#3A3842');
      for (const wy of UB_WIRES) {
        p.rect(x + 1, wy - 1, 3, 3, lit ? '#E8E4D8' : '#4A4652');
      }
    }
    for (const wy of UB_WIRES)
      for (let x = 0; x < UB_W; x++) {
        // a little sag between the posts
        let sag = 0;
        for (let i = 0; i < UB_POSTS.length - 1; i++) {
          const a = UB_POSTS[i];
          const b = UB_POSTS[i + 1];
          if (x >= a && x <= b) sag = Math.round(Math.sin(((x - a) / (b - a)) * Math.PI) * 1.4);
        }
        p.set(x, wy + sag, lit ? (x % 7 === 0 ? '#FFF6D8' : '#C8C2B4') : '#4A4652');
      }
    return p.toCanvas();
  });
}

const BOAR_PAL = { k: '#1E1820', b: '#3A2A26', m: '#5A3E30', l: '#7A5640', s: '#9A7050', r: '#F2894B', e: '#FFF6D8', n: '#C8907A' };

/**
 * 親の イノシシ（左向き、32×18）。f：歩きの こま（0/1）。lit：灯りの 中（毛の 色と、上の ふちの 橙）。
 * turn：柵の 前で 山の ほうへ 向きを 変える（うしろ姿、16×18）。
 */
export function boarPix(f: number, lit: boolean, turn = false): HTMLCanvasElement {
  return cached(`boar:${f}:${lit}:${turn}`, () => {
    const p = new PixelCanvas(32, 18);
    const c = (k: keyof typeof BOAR_PAL) => (lit ? BOAR_PAL[k] : k === 'e' ? '#8E88B8' : k === 'r' ? '#3A3042' : '#120E16');
    if (turn) {
      // from behind: the round rump, the short tail, the bristly ridge, two hind legs
      p.ellipse(16, 9, 9, 7, c('b'));
      p.ellipse(16, 8, 7, 5, c('m'));
      p.hline(11, 21, 2, c('r'));
      p.set(16, 15, c('k'));
      p.vline(16, 12, 14, c('k'));
      p.rect(11, 14, 3, 4, c('k'));
      p.rect(19, 14, 3, 4, c('k'));
      p.set(16, 6, c('l'));
      return p.toCanvas();
    }
    // body: a long barrel, high shoulders, the snout down at the left
    p.ellipse(17, 8, 12, 6, c('b'));
    p.ellipse(18, 7, 10, 4, c('m'));
    // the head and snout
    p.poly(
      [
        [7, 4],
        [2, 9],
        [1, 12],
        [4, 12],
        [9, 10],
      ],
      c('b'),
    );
    p.rect(0, 11, 2, 2, c('n'));
    p.set(0, 12, c('k'));
    // ear, eye
    p.set(8, 2, c('k'));
    p.set(9, 3, c('b'));
    p.set(6, 6, c('e'));
    // the bristly ridge along the back (the lantern catches it)
    for (let x = 8; x < 27; x++) p.set(x, 2 + (x > 20 ? 1 : 0) + (x % 3 === 0 ? -1 : 0), c('r'));
    // tail
    p.set(29, 6, c('k'));
    p.set(30, 7, c('k'));
    // legs (two frames)
    const legs = f ? [8, 13, 21, 26] : [9, 12, 22, 25];
    legs.forEach((x, i) => p.rect(x, 12 + (i % 2 && f ? 0 : 0), 2, 6 - (i % 2 === f ? 1 : 0), c('k')));
    // a little lighter belly line in the light
    if (lit) p.hline(10, 25, 12, c('l'));
    return p.toCanvas();
  });
}

const URI_PAL = { k: '#1E1820', b: '#6A4A36', m: '#7E5A40', st: '#A88660', r: '#F2B070', e: '#FFF6D8' };

function uriboPix(lit: boolean, f: number, ears: boolean): PixelCanvas {
  const p = new PixelCanvas(13, 9);
  const c = (k: keyof typeof URI_PAL) => (lit ? URI_PAL[k] : k === 'e' ? '#8E88B8' : '#1A141C');
  p.ellipse(7, 4, 5, 3, c('b'));
  p.ellipse(7, 4, 4, 2, c('m'));
  // the stripes, faded (the end of summer): faint lighter lines along the body
  if (lit) {
    for (let x = 4; x < 11; x++) if (x % 2 === 0) p.set(x, 3, c('st'));
    for (let x = 5; x < 10; x++) if (x % 2 === 1) p.set(x, 5, c('st'));
  }
  // head and snout (left)
  p.rect(1, 4, 3, 2, c('b'));
  p.set(0, 5, c('k'));
  p.set(3, 3, c('e'));
  // ears: down, or up (h2: the loudspeaker's voice)
  if (ears) {
    p.set(4, 0, c('b'));
    p.set(4, 1, c('b'));
    p.set(5, 0, c('k'));
  } else p.set(5, 1, c('b'));
  // the back's edge: the lantern's orange in the light, a little starlight out of it
  p.hline(4, 10, 1, lit ? c('r') : '#3A3042');
  // legs
  const lx = f ? [3, 6, 8, 11] : [4, 5, 9, 10];
  for (const x of lx) p.vline(x, 7, 8, c('k'));
  // tail
  p.set(12, 3, c('k'));
  return p;
}

/** うり坊（左向き、13×9）。ears：耳を 立てる（h2 の 放送）。 */
export function uriboImg(lit: boolean, f: number, ears = false): HTMLCanvasElement {
  return cached(`uri:${lit}:${f}:${ears}`, () => uriboPix(lit, f, ears).toCanvas());
}

/** 低く した トマトの 灯り（小窓の 下、しゅんの 手の 高さ）。 */
export function lowLantern(): HTMLCanvasElement {
  return cached('ulantern', () => {
    const p = new PixelCanvas(12, 12);
    p.ellipse(6, 7, 4, 4, '#E84E3C');
    p.ellipse(5, 6, 2, 2, '#FF6A4D');
    p.set(4, 5, '#FFE7A3');
    p.rect(5, 1, 3, 2, '#5FA85A');
    p.set(6, 0, '#3F6A2E');
    return p.toCanvas();
  });
}

// ---------------------------------------------------------------- エンディング（カット3）の 小さな 影

/**
 * 林の きわを 行く 親子の イノシシの 影（左向き、46×8）：親 11×6、うり坊 5×4 が 5つ。朝日（東）が
 * 背中の ふちを 橙に する。f：歩きの こま。
 */
export function farBoars(f: number): HTMLCanvasElement {
  return cached(`far:${f}`, () => {
    const p = new PixelCanvas(46, 8);
    const ink = '#2A2440';
    const rim = '#F7C27A';
    // the mother: snout down at the left, high shoulders, short legs
    p.rect(2, 2, 9, 4, ink);
    p.rect(0, 4, 2, 2, ink);
    p.set(3, 1, ink);
    p.hline(3, 9, 1, ink);
    p.hline(4, 10, 0, rim);
    p.set(11, 2, rim);
    for (const [x, d] of [
      [3, 0],
      [5, 1],
      [8, 0],
      [10, 1],
    ] as [number, number][])
      p.set(x, 6 + ((d + f) % 2), ink);
    p.set(3, 6, ink);
    p.set(9, 6, ink);
    // five little ones in a line behind her, a little apart
    for (let i = 0; i < 5; i++) {
      const x = 14 + i * 6 + ((i + f) % 2);
      p.rect(x, 4, 4, 2, ink);
      p.set(x - 1, 5, ink);
      p.hline(x, x + 3, 3, rim);
      p.set(x + ((i + f) % 2) * 2, 6, ink);
      p.set(x + 3 - ((i + f) % 2) * 2, 6, ink);
    }
    return p.toCanvas();
  });
}
