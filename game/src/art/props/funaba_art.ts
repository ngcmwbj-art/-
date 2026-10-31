// お昼の あとで、こする（03_ch3_index、events/ch3/funaba.ts）の 絵：船揚げ場 map_c3_funaba と 港の 坂。
//
//   prop_fb_saka    港の 倉庫の 東の 路地の 岩の 切れ目 (52,21)：東へ 下りる コンクリの 坂（路地と 同じ 石の 色）、
//                   手前に 木の 札『船揚げ場』と 矢じるし。
//   prop_fb_funa    ゴロウの 船（10–19,5–8。横から 見た 腹、へさきは 西）。木の 台車に のって、車輪は レールの 上。
//                   水の 線より 下（船の 底）は：こする 前 = くすんだ 赤に 白い つぶ（フジツボ）と 緑の ひも（海藻）、
//                   区切りごとに こすると その 区切りだけ つるっと（flag_fb_bu_<k>）、塗った あと = あざやかな 赤（flag_fb_nuru）。
//                   ともの 下に スクリューと 舵。
//   prop_fb_reiru   レール 1本ぶん（2本の 鉄の レール、まくら木。地面に 平ら。海の 中へ 続く）。
//   prop_fb_koya    巻き上げ機の 小屋（2–5,1–3）：トタンの 小屋、戸、ワイヤーの 出る 穴。
//   prop_fb_dai     塗料の 台 (23,4)：木の 台に 赤い 缶（ふたが 閉まっている／開いて はけ）と 紙。
//   prop_fb_hako    軍手と ヘラの 箱 (24,6)。
//   prop_fb_baketsu ホースと 海水の バケツ (25,8)。
//   prop_fb_kami    台車の わきの 杭に 紙 (20,8)。
//   prop_fb_kara    落ちた フジツボの 殻（地面に 平ら）。

import { PixelCanvas } from '../../engine/pixel';
import { standProp } from './hoshi_kit';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const WOOD = '#8A6A48';
const WOOD_LT = '#B08A5E';
const WOOD_DK = '#5A4030';
const IRON = '#5E6478';
const IRON_LT = '#8E95A6';
const HULL = '#F2EFE6';
const HULL_DK = '#C8C2B4';
const STRIPE = '#2F6A9A';
const OLD_RED = '#7E4A40';
const OLD_RED_DK = '#5E3830';
const NEW_RED = '#C23A2E';
const NEW_RED_LT = '#E0584A';
const FUJI = '#EDE8DA';
const FUJI_DK = '#A8A090';
const MO = '#4E8A4A';
const MO_LT = '#7AB060';

// ---------------------------------------------------------------- 港の 坂

registerProp('prop_fb_saka', () => {
  // the sign on the cut's north lip: a little wooden board on a post, 『船揚げ場』 as three dark marks and a red arrow
  const p = new PixelCanvas(14, 20);
  p.vline(3, 7, 19, WOOD_DK);
  p.vline(4, 7, 19, WOOD);
  p.rect(0, 0, 14, 8, WOOD_LT);
  p.hline(0, 13, 0, '#D0AA7A');
  p.hline(0, 13, 7, WOOD);
  for (const x of [2, 5, 8]) p.rect(x, 2, 2, 3, '#3A2A22');
  p.line(11, 2, 13, 4, '#C23A2E');
  p.line(11, 6, 13, 4, '#C23A2E');
  p.hline(10, 12, 4, '#C23A2E');
  const img = p.toCanvas();
  return { ox: 1, oy: -12, w: 14, h: 20, foot: 7, img: () => img, contact: 0 } satisfies PropArt;
});

registerProp('prop_fb_saka_yuka', () => {
  // the slope itself, lying on the ground: the alley's stone, ridged across, darker as it goes down east
  const p = new PixelCanvas(16, 16);
  for (let x = 0; x < 16; x++) p.vline(x, 0, 15, x < 5 ? '#B4AE9E' : x < 10 ? '#A09A8C' : '#8A8578');
  for (let x = 2; x < 16; x += 3) p.vline(x, 1, 14, '#7A766C');
  p.hline(0, 15, 0, '#5A5954');
  p.hline(0, 15, 15, '#5A5954');
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 16, h: 16, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

// ---------------------------------------------------------------- ゴロウの 船（台車の 上）

const BW = 160;
const BH = 76;
/** 水の 線（この 下が 船の 底）。 */
const WL = 44;
/** 区切りの x（へさき・まん中・とも・スクリュー）。 */
export const FB_BU_X: [number, number][] = [
  [8, 52],
  [52, 104],
  [104, 140],
  [140, 156],
];

/** 船の 腹の 下の はし（へさきは 上がる）。 */
function keel(x: number): number {
  if (x < 40) return Math.round(62 - ((40 - x) / 34) ** 2 * 22);
  return 62;
}
function gunwale(x: number): number {
  return x < 30 ? Math.round(24 - (30 - x) * 0.3) : 24;
}

/** 区切り k の 付いた 物の 位置（決まった 並び）。 */
export function fbSpots(k: number): { x: number; y: number; mo: boolean }[] {
  const [x0, x1] = FB_BU_X[k];
  const out: { x: number; y: number; mo: boolean }[] = [];
  let s = 17 + k * 31;
  for (let x = x0 + 3; x < x1 - 2; x += 4) {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    const bottom = keel(x);
    if (bottom - WL < 6) continue;
    const y = WL + 2 + (s % Math.max(1, bottom - WL - 5));
    out.push({ x, y, mo: s % 5 === 0 });
  }
  return out;
}

function paintBoat(done: boolean[], painted: boolean): HTMLCanvasElement {
  const p = new PixelCanvas(BW, BH);
  // the cradle: two wooden sleds on wheels, one over each rail (x 24 and x 136), beams up to the keel
  for (const rx of [24, 136]) {
    p.rect(rx - 12, 64, 24, 5, WOOD);
    p.hline(rx - 12, rx + 11, 64, WOOD_LT);
    p.hline(rx - 12, rx + 11, 68, WOOD_DK);
    for (const dx of [-8, 8]) {
      p.circle(rx + dx, 72, 3, IRON);
      p.set(rx + dx, 71, IRON_LT);
    }
    p.rect(rx - 3, 58, 6, 6, WOOD_DK);
  }
  p.rect(20, 66, 120, 2, WOOD_DK);
  // the hull
  for (let x = 6; x < 152; x++) {
    const top = gunwale(x);
    const bot = keel(x);
    for (let y = top; y <= bot; y++) {
      let c: string;
      if (y >= WL) c = painted ? (y === WL ? NEW_RED_LT : NEW_RED) : y > bot - 2 ? OLD_RED_DK : OLD_RED;
      else if (y >= WL - 4 && y <= WL - 2) c = STRIPE;
      else c = y === top ? '#FFFFFF' : y > WL - 8 ? HULL_DK : HULL;
      p.set(x, y, c);
    }
  }
  // the transom (stern, east) and the bow's stem
  p.vline(151, 24, 62, HULL_DK);
  p.line(6, 15, 18, 51, '#9AA0A8');
  // the wheelhouse, the mast, the rail
  p.rect(96, 8, 28, 16, '#F4F1E8');
  p.rect(95, 6, 30, 3, '#3A7EA8');
  p.rect(99, 12, 7, 5, '#2A3A4A');
  p.rect(110, 12, 7, 5, '#2A3A4A');
  p.set(100, 13, '#B8E8F4');
  p.vline(70, 0, 23, '#9AA0A8');
  p.hline(66, 74, 4, '#9AA0A8');
  p.hline(20, 150, 22, '#C8C2B4');
  // the screw and the rudder under the stern (pale grey bronze — untouched)
  p.rect(140, 57, 6, 2, IRON);
  p.ellipse(146, 58, 2, 5, '#B8A070');
  p.set(146, 54, '#D8C090');
  p.rect(150, 46, 4, 18, IRON_LT);
  p.vline(153, 46, 63, IRON);
  // what grows on the bottom (not on a scrubbed section; nothing once painted)
  if (!painted)
    for (let k = 0; k < 3; k++) {
      if (done[k]) {
        // scrubbed: a few paler scrape marks
        const [x0, x1] = FB_BU_X[k];
        for (let x = x0 + 4; x < x1 - 2; x += 7) p.line(x, WL + 3, x + 3, Math.min(keel(x) - 2, WL + 12), '#946058');
        continue;
      }
      for (const s of fbSpots(k)) {
        if (s.mo) {
          // seaweed: a green strand hanging
          for (let i = 0; i < 6; i++) p.set(s.x + (i % 3 === 1 ? 1 : 0), s.y + i, i < 3 ? MO_LT : MO);
        } else {
          // a barnacle: a little white cone, its dark mouth
          p.rect(s.x - 1, s.y, 3, 2, FUJI);
          p.set(s.x, s.y - 1, FUJI);
          p.set(s.x, s.y, FUJI_DK);
          p.set(s.x + 1, s.y + 1, FUJI_DK);
          // a second, smaller one beside
          p.set(s.x + 2, s.y + 3, FUJI);
        }
      }
    }
  p.outline('#2A2236');
  return p.toCanvas();
}

registerProp('prop_fb_funa', () => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (env: PropEnv) => {
    const done = [0, 1, 2].map((k) => env.flag(`flag_fb_bu_${k}`) > 0);
    const painted = env.flag('flag_fb_nuru') > 0;
    const key = done.map((d) => (d ? 1 : 0)).join('') + (painted ? 'p' : '');
    let c = cache.get(key);
    if (!c) {
      c = paintBoat(done, painted);
      cache.set(key, c);
    }
    return c;
  };
  return {
    ox: 0,
    oy: 16 - BH,
    w: BW,
    h: BH,
    foot: 15,
    img: get,
    shadow: 0,
    contact: 140,
    contactX: 80,
  } satisfies PropArt;
});

// ---------------------------------------------------------------- レール・小屋・台・箱・バケツ・紙・殻

registerProp('prop_fb_reiru', (opts) => {
  const n = Number(opts.n ?? 9);
  const p = new PixelCanvas(16, n * 16);
  for (let y = 2; y < n * 16; y += 6) {
    p.rect(1, y, 14, 2, '#6E5A44');
    p.hline(1, 14, y, '#8A7458');
  }
  for (const x of [3, 11]) {
    p.vline(x, 0, n * 16 - 1, IRON_LT);
    p.vline(x + 1, 0, n * 16 - 1, IRON);
  }
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 16, h: n * 16, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

registerProp('prop_fb_koya', () =>
  standProp(64, 52, (p) => {
    // a tin shed: corrugated walls, a low roof, the door (west), the hole the wire comes out of (east)
    p.rect(1, 10, 62, 40, '#8E95A6');
    for (let x = 2; x < 62; x += 3) p.vline(x, 11, 49, '#7A8090');
    p.rect(0, 4, 64, 7, '#6B7186');
    p.hline(0, 63, 4, '#9AA0A8');
    p.rect(12, 24, 16, 26, '#5A4A3A');
    p.vline(26, 34, 38, '#D8C090');
    p.rect(46, 38, 8, 6, '#2A2236');
    p.line(50, 44, 63, 50, '#3A3A42');
    // salt-rust streaks
    for (const x of [6, 36, 58]) p.vline(x, 12, 22, '#A07050');
  }, { cx: 32, base: 16, shadow: 24 }),
);

registerProp('prop_fb_dai', () => {
  const mk = (aki: boolean) =>
    standProp(18, 22, (p) => {
      p.rect(1, 12, 16, 3, WOOD_LT);
      p.vline(2, 15, 21, WOOD_DK);
      p.vline(15, 15, 21, WOOD_DK);
      // the red can
      p.rect(5, 4, 8, 8, '#B83A2E');
      p.hline(5, 12, 4, aki ? '#7A1E18' : '#8E95A6');
      p.rect(6, 7, 6, 3, '#F4F1E8');
      if (aki) {
        // the brush leaning on it
        p.line(13, 0, 15, 11, WOOD);
        p.rect(12, 0, 3, 2, NEW_RED);
      } else {
        // the paper under the lid's edge
        p.rect(1, 9, 4, 3, '#F4F1E8');
        p.set(2, 10, '#3A2A22');
      }
    }, { cx: 8, base: 16, shadow: 8 });
  const shut = mk(false);
  const open = mk(true);
  return { ...shut, img: (env: PropEnv) => (env.flag('flag_fb_nuru') ? open.img(env) : shut.img(env)) } satisfies PropArt;
});

registerProp('prop_fb_hako', () =>
  standProp(16, 14, (p) => {
    p.rect(1, 4, 14, 9, WOOD);
    p.hline(1, 14, 4, WOOD_LT);
    p.hline(1, 14, 8, WOOD_DK);
    // gloves (white, blue cuffs) and a scraper's handle
    p.rect(3, 2, 4, 3, '#F4F1E8');
    p.hline(3, 6, 4, '#3A7EA8');
    p.line(9, 3, 13, 1, '#C8A06A');
    p.rect(12, 0, 3, 2, IRON_LT);
  }, { cx: 8, base: 16, shadow: 6 }),
);

registerProp('prop_fb_baketsu', () =>
  standProp(16, 14, (p) => {
    // a blue bucket of sea water, the green hose coiled beside it
    p.rect(2, 4, 8, 9, '#3A6AA8');
    p.hline(2, 9, 4, '#6A9AD8');
    p.hline(3, 8, 5, '#9AD0E8');
    p.ring(12, 10, 3, 2, '#3FA66B');
    p.ring(12, 10, 2, 1, '#2E8A50');
  }, { cx: 8, base: 16, shadow: 6 }),
);

registerProp('prop_fb_kami', () =>
  standProp(10, 18, (p) => {
    p.vline(4, 4, 17, WOOD_DK);
    p.vline(5, 4, 17, WOOD);
    p.rect(1, 2, 8, 7, '#F4F1E8');
    p.hline(2, 7, 4, '#3A2A22');
    p.hline(2, 6, 6, '#3A2A22');
  }, { cx: 8, base: 16, shadow: 8 }),
);

registerProp('prop_fb_kara', () => {
  const p = new PixelCanvas(16, 10);
  for (const [x, y] of [[4, 4], [9, 6], [12, 3], [6, 8]] as const) {
    p.rect(x - 1, y, 3, 2, FUJI);
    p.set(x, y - 1, FUJI);
    p.set(x, y, FUJI_DK);
  }
  p.set(2, 7, MO);
  p.set(3, 8, MO);
  const img = p.toCanvas();
  return { ox: 0, oy: 4, w: 16, h: 10, foot: 0, flat: true, img: () => img } satisfies PropArt;
});
