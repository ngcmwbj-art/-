// 穂は ほうき、茎は 柄（02_ch2_index、events/ch2/hokihata.ts）の 絵：
//
//   prop_hb_kabu   区長の 家の 東の 路地の ホウキモロコシ（(40,33)・(40,34)・(40,35) の 3株。opts.i 0〜2）。
//                  人の 背より 高い 茎に 節、節から 長い 葉。てっぺんに 赤茶の 重たい 穂が たれる。
//                  刈った あと（flag_hb_kabu_<i>）は 茎の 下の ほうと 下の 葉だけ（切り口は 白っぽく）。
//   prop_hb_sao    分校の 軒下の 竹ざお（(32,28)。二股の 棒 2本に 竹）。かけた あと（flag_hb_hung）は
//                  わら縄で 束ねた 3本が ざおに かかる。
//   prop_hb_houki  集会所の 西の 壁ぎわの 去年の 座敷ほうき（(1,6)）。さかさに 立てた あと（flag_hb_sakasa）は
//                  穂が 上。

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { outline } from './kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

export const HB_STEM = '#6E8A3A';
export const HB_STEM_DK = '#4E6A2A';
export const HB_NODE = '#3E5222';
export const HB_LEAF = '#4E7A34';
export const HB_LEAF_LT = '#7AA04A';
export const HB_HO = '#9A4A2A';
export const HB_HO_LT = '#C8743A';
export const HB_HO_DK = '#6A3020';
const STRAW = '#C8B070';
const STRAW_DK = '#9A8450';
const BAMBOO = '#A8B060';
const BAMBOO_DK = '#788040';

// ---------------------------------------------------------------- 株

const KW = 22;
const KH = 50;

function kabu(i: number, cut: boolean): HTMLCanvasElement {
  const p = new PixelCanvas(KW, KH);
  const sx = 11 + (i === 1 ? -1 : 0);
  const lean = i === 2 ? 1 : 0;
  // the soil at its foot
  p.rect(5, KH - 3, 12, 3, P.woodDark);
  p.hline(6, 15, KH - 3, '#5A4030');
  const top = cut ? 26 : 12;
  // the stalk (a little lean at the top on the third)
  for (let y = top; y < KH - 2; y++) {
    const x = sx + (y < 22 ? lean : 0);
    p.set(x, y, HB_STEM);
    p.set(x + 1, y, HB_STEM_DK);
  }
  // the nodes (darker rings) and a leaf from each, left and right in turn
  const nodes = [44, 36, 28, 20];
  nodes.forEach((ny, k) => {
    if (ny < top) return;
    p.hline(sx - 1, sx + 2, ny, HB_NODE);
    const s = k % 2 === 0 ? -1 : 1;
    // a long blade arching out and drooping (the low ones longer)
    const len = 9 - Math.floor(k / 2);
    for (let t = 0; t <= len; t++) {
      const lx = sx + (s < 0 ? 0 : 1) + s * (1 + t);
      const ly = ny - 2 + Math.round((t * t) / 9) - (t < 3 ? 1 : 0);
      if (lx < 0 || lx >= KW) continue;
      p.set(lx, ly, t < len / 2 ? HB_LEAF_LT : HB_LEAF);
      p.set(lx, ly + 1, HB_LEAF);
    }
  });
  if (cut) {
    // the cut end, pale
    p.hline(sx, sx + 1, top, '#E8E0B0');
  } else {
    // the 穂首 (the bare neck) and the heavy reddish-brown head, drooping to one side
    const hx = sx + lean;
    for (let y = 8; y < 13; y++) p.set(hx, y, HB_STEM);
    const dir = i === 1 ? -1 : 1;
    for (let k = -3; k <= 3; k++) {
      // each strand from the neck out and down
      for (let t = 0; t < 9; t++) {
        const x = hx + Math.round(k * 0.7 + dir * t * 0.55);
        const y = 7 - Math.round(t * 0.2) + Math.round((t * t) / 6) + Math.abs(k) - 3;
        if (x < 0 || x >= KW || y < 0) continue;
        p.set(x, y + 2, (k + t) % 3 === 0 ? HB_HO_LT : (k + t) % 3 === 1 ? HB_HO : HB_HO_DK);
      }
    }
    p.set(hx, 3, HB_HO_DK);
  }
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

registerProp('prop_hb_kabu', (opts) => {
  const i = Number(opts.i ?? 0);
  const cache = new Map<string, HTMLCanvasElement>();
  const img = (env: PropEnv) => {
    const cut = env.flag(`flag_hb_kabu_${i}`) > 0;
    const key = cut ? 'cut' : 'stand';
    let c = cache.get(key);
    if (!c) {
      c = kabu(i, cut);
      cache.set(key, c);
    }
    return c;
  };
  return { ox: -3, oy: 16 - KH, w: KW, h: KH, foot: 15, img, contact: 10, shadow: 16 } satisfies PropArt;
});

// ---------------------------------------------------------------- 竹ざお

const SW = 26;
const SH = 30;

function sao(hung: boolean): HTMLCanvasElement {
  const p = new PixelCanvas(SW, SH);
  // two forked poles
  for (const x of [2, SW - 3]) {
    p.rect(x, 8, 1, SH - 9, '#7A5A3A');
    p.set(x - 1, 7, '#7A5A3A');
    p.set(x + 1, 7, '#7A5A3A');
    p.set(x - 1, 6, '#7A5A3A');
    p.set(x + 1, 6, '#7A5A3A');
  }
  // the bamboo across, its joints
  p.hline(0, SW - 1, 7, BAMBOO);
  p.hline(0, SW - 1, 8, BAMBOO_DK);
  for (const x of [7, 14, 21]) p.set(x, 7, '#D0D890');
  if (hung) {
    // the bundle over the pole: tied in the middle with straw rope, stalks down one side, the heads down the other
    const bx = 9;
    for (let k = 0; k < 3; k++) {
      // stalks (green-gold, a little dry)
      for (let y = 9; y < 20; y++) p.set(bx + k, y, k === 1 ? HB_STEM_DK : HB_STEM);
      // the heads hanging
      for (let y = 9; y < 22; y++) {
        const x = bx + 5 + k * 2 + (y > 16 ? (y - 16) >> 1 : 0);
        p.set(x, y, (y + k) % 3 === 0 ? HB_HO_LT : HB_HO);
        if (y > 12) p.set(x + 1, y, HB_HO_DK);
      }
    }
    p.rect(bx - 1, 6, 10, 2, STRAW);
    p.hline(bx - 1, bx + 8, 8, STRAW_DK);
  }
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

registerProp('prop_hb_sao', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  const img = (env: PropEnv) => {
    const hung = env.flag('flag_hb_hung') > 0;
    const key = hung ? 'h' : 'e';
    let c = cache.get(key);
    if (!c) {
      c = sao(hung);
      cache.set(key, c);
    }
    return c;
  };
  return { ox: -5, oy: 16 - SH, w: SW, h: SH, foot: 15, img, contact: 18, shadow: 10 } satisfies PropArt;
});

// ---------------------------------------------------------------- 去年の ほうき

const HW = 10;
const HH = 26;

function houki(sakasa: boolean): HTMLCanvasElement {
  const p = new PixelCanvas(HW, HH);
  // the broom: a short handle of bound stalks, the head of dried 穂 (straw-gold, worn)
  const head = (y0: number, down: boolean) => {
    for (let k = 0; k < 11; k++) {
      const y = y0 + k;
      const half = down ? 1 + Math.floor(k / 3) : 4 - Math.floor(k / 3);
      p.hline(5 - half, 4 + half, y, k % 2 ? STRAW : '#D8C488');
    }
  };
  if (!sakasa) {
    p.rect(4, 1, 2, 13, '#A8904A');
    for (const y of [3, 7, 11]) p.hline(3, 6, y, '#7A3A2A');
    head(14, true);
  } else {
    head(1, false);
    p.rect(4, 12, 2, 13, '#A8904A');
    for (const y of [14, 18, 22]) p.hline(3, 6, y, '#7A3A2A');
  }
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

registerProp('prop_hb_houki', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  const img = (env: PropEnv) => {
    const s = env.flag('flag_hb_sakasa') > 0;
    const key = s ? 's' : 'n';
    let c = cache.get(key);
    if (!c) {
      c = houki(s);
      cache.set(key, c);
    }
    return c;
  };
  return { ox: 3, oy: 16 - HH, w: HW, h: HH, foot: 15, img, contact: 6, shadow: 8 } satisfies PropArt;
});
