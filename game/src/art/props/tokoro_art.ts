// つるっと、終われる（03_ch3_index、events/ch3/tokoro.ts）の 絵：食堂かもめの 台所の 小さな 鍋と 湯気、
// カウンターの 流し箱、ゴロウの 前の 小鉢。
//
//   prop_tk_nabe     カウンターの 西の はし (1,4) の カセットコンロと 小さな 鍋（flag_tk_nabe 1 煮ている：湯気、2 火を 止めた）。
//                    湯気の 量と 鍋の 中の 高さは tkFx（煮る あいだ 少しずつ 減る。events/ch3/tokoro.ts が 動かす）。
//   prop_tk_bako     カウンター (5,4) の 上の 流し箱（flag_tk_bako 1 とろりと した 汁、2 固まった、3 洗って ふせてある）。
//   prop_tk_kobachi  ゴロウの 席の 前 (3,4) の 小鉢（flag_tk_goro）。細く 長い ところてん。
//   (白い 物は 真っ白に しない：HD-2D の 光で 飛ばない よう、少し 色を のせる)

import { PixelCanvas } from '../../engine/pixel';
import { registerProp } from './registry';
import { outline } from './kit';
import type { PropArt } from './types';

/** 煮る あいだの 湯気（0〜1）と 鍋の 中の 高さ（1 いっぱい 〜 0.5 半分）。 */
export const tkFx = { steam: 1, level: 1 };

const STEAM = '#E6EAE8';

// (the HD-2D room builds a prop's planes from its first picture: these always give one, and come and go by
// their map objects' cond — flag_tk_nabe・flag_tk_bako・flag_tk_goro — with refreshPresence: events/ch3/tokoro.ts)

registerProp('prop_tk_nabe', () => {
  const W = 20;
  const H = 34;
  const cache = new Map<string, HTMLCanvasElement>();
  const make = (lv: number, st: number, k: number): HTMLCanvasElement => {
    const key = `${lv}|${st}|${k}`;
    const hit = cache.get(key);
    if (hit) return hit;
    const p = new PixelCanvas(W, H);
    // a portable gas stove on the counter's end (the big stove behind is the set meal's), its small flame
    const by = H - 1;
    p.rect(2, by - 4, 16, 4, '#3A3F48');
    p.hline(2, 17, by - 4, '#5A606A');
    p.rect(13, by - 2, 3, 1, '#C8452E');
    if (st > 0.05) for (let i = 0; i < 3; i++) p.set(7 + i * 3, by - 5, i % 2 ? '#F2894B' : '#4A8AE0');
    // the small pot: aluminium body, two ear handles, seen a little from above
    const pb = by - 6;
    p.rect(5, pb - 7, 10, 7, '#A8AEB6');
    p.hline(5, 14, pb - 1, '#7A808A');
    p.vline(5, pb - 7, pb - 1, '#8E949E');
    p.vline(14, pb - 7, pb - 1, '#C8CDD4');
    p.rect(3, pb - 6, 2, 2, '#6A707A');
    p.rect(15, pb - 6, 2, 2, '#6A707A');
    p.ellipse(10, pb - 8, 5, 2, '#C8CDD4');
    // what is in it: the amber-brown 天草 broth, lower as it boils down
    const ry = pb - 8 + Math.round((1 - lv) * 2);
    p.ellipse(10, ry, 4, 1, lv > 0.75 ? '#B8925A' : '#A8804A');
    outline(p, { soft: true });
    // the steam (after the outline: soft, no dark rim): small puffs going up and drifting, fewer as it boils down
    if (st > 0.05) {
      const n = Math.max(1, Math.round(st * 4));
      for (let i = 0; i < n; i++) {
        const ph = (k + i * 3) % 8;
        const y = pb - 12 - ph * 2 - i * 2;
        const x = 10 + Math.round(Math.sin((ph + i) * 0.9) * 2) + (i % 2 ? 2 : -2);
        const r = ph > 5 ? 0 : 1;
        p.ellipse(x, y, r + (st > 0.6 ? 1 : 0), Math.max(1, r), STEAM);
      }
    }
    const c = p.toCanvas();
    cache.set(key, c);
    return c;
  };
  return {
    // (on the counter's west end (1,4), the surface 4 px above the tile's top: after the counter's picture, foot 15)
    ox: -2,
    oy: -3 - H,
    w: W,
    h: H,
    foot: 16,
    img: (env) => {
      const s = env.flag('flag_tk_nabe');
      if (s >= 2) return make(0.5, 0, 0);
      const lv = Math.round(tkFx.level * 4) / 4;
      const st = Math.round(tkFx.steam * 4) / 4;
      return make(lv, st, Math.floor(env.t / 220) % 8);
    },
    contact: 0,
  } satisfies PropArt;
});

registerProp('prop_tk_bako', () => {
  const W = 18;
  const H = 8;
  const tray = (fill: (p: PixelCanvas) => void): HTMLCanvasElement => {
    const p = new PixelCanvas(W, H);
    fill(p);
    outline(p, { soft: true });
    return p.toCanvas();
  };
  // a stainless 流し箱 on the counter: the box, its inner lid at one end
  const box = (p: PixelCanvas) => {
    p.rect(2, 2, 14, 5, '#A8B0B8');
    p.hline(2, 15, 2, '#D8DDE2');
    p.hline(2, 15, 6, '#7A828C');
  };
  const shiru = tray((p) => {
    box(p);
    p.rect(3, 3, 12, 2, '#C8A060');
    p.hline(4, 9, 3, '#D8B878');
  });
  const katai = tray((p) => {
    box(p);
    p.rect(3, 3, 12, 2, '#D8DCC8');
    p.hline(4, 12, 3, '#ECEEE0');
    p.set(13, 4, '#B8C0A8');
  });
  const fuse = tray((p) => {
    // washed and put upside down to dry: the bottom up, a few drops by it
    p.rect(2, 3, 14, 4, '#B8C0C8');
    p.hline(2, 15, 3, '#E0E4E8');
    p.hline(3, 14, 6, '#7A828C');
    p.set(1, 6, '#9AC8DC');
    p.set(16, 7, '#9AC8DC');
  });
  return {
    ox: -1,
    oy: -1 - H,
    w: W,
    h: H,
    // (on the counter (1–6,4): after its picture, foot 15)
    foot: 16,
    img: (env) => {
      const s = env.flag('flag_tk_bako');
      return s === 1 ? shiru : s >= 3 ? fuse : katai;
    },
    contact: 0,
  } satisfies PropArt;
});

registerProp('prop_tk_kobachi', () => {
  const W = 12;
  const H = 8;
  const p = new PixelCanvas(W, H);
  // a small blue bowl (its sides narrowing to the foot), the long thin strands heaped in it, a drop of 酢じょうゆ
  p.rect(2, 4, 8, 2, '#4A5A8A');
  p.rect(3, 6, 6, 1, '#3A4A7A');
  p.hline(1, 10, 3, '#6A7AAA');
  p.ellipse(6, 3, 4, 1, '#DCE2D2');
  for (let x = 3; x <= 9; x += 2) p.vline(x, 1, 3, '#D0D8C8');
  p.set(7, 2, '#8A5A3A');
  outline(p, { soft: true });
  const img = p.toCanvas();
  return {
    // (left of ゴロウの 茶わんの 塔 on the counter, in front of his seat (3,5))
    ox: -6,
    oy: -2 - H,
    w: W,
    h: H,
    foot: 16,
    img: () => img,
    contact: 0,
  } satisfies PropArt;
});
