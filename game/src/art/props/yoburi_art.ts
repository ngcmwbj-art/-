// 夜振りの 絵（星見台の 用水路、夜。02_ch2_index #81、52_ch2_level_art 7.9・13.2）。
//
// 小窓（ザリガニ・テナガエビと 同じ 328×116）の 断面：南の 岸から 北を 見る。
//   - 夜の 空（段階の 色、星。h2 は 地平に #3A2B5C の すじ）と 棚田の 影
//   - 北の 岸の 石垣（水の 上と 下。右は すき間の 多い 古い 石垣）
//   - 水口（まん中：棚田から 落ちる 水の 土管）
//   - 水（暗い 青みどり）と 泥の 底（左は やわらかい 泥だまり）
//   - いちばん 右に 橋の 脚の 影
// 夜の 絵（dark）と、トマトの 灯りが 当たった ときの 絵（lit：暖かい 色と こまかい ところ）を
// 段階ごとに 1枚ずつ 焼く。widget が 灯りの 輪の 中だけ lit を 重ねる。
//
// 生き物（横から、左向き。体長 2px/cm）：ドジョウ（細長い、まだら、口ひげ 10本）、
// ちびドジョウ、大きい ドジョウ、用水路の ぬし（ぶち、長い ひげ）、ヤゴ（トンボの 子。
// 大きな 目と、えらそうな 顔）、カワニナ（細い 巻き貝）。泥に もぐっている ときは 目と ひげだけ。

import { PixelCanvas, mix } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { SCN_H, SCN_W } from './tsuri_art';

export { SCN_W, SCN_H };
export const YB_WATER_Y = 30;
export const YB_FLOOR_Y = 98;
/** 水口（土管）の 口の まん中。 */
export const YB_INLET: [number, number] = [164, 18];
export const YB_PX_PER_CM = 2;

export type YoburiSpot = 'doro' | 'minakuchi' | 'ishigaki';
export type YoburiKind = 'dojou' | 'chibi' | 'ooki' | 'yago' | 'kawanina' | 'dojou_nushi';

/** 場所の x の はんい（灯りの 輪の まん中が どこに あるかで 名前が かわる）。 */
export const YB_SPOTS: Record<YoburiSpot, [number, number]> = {
  doro: [0, 116],
  minakuchi: [116, 214],
  ishigaki: [214, 328],
};
export const YB_ORDER: YoburiSpot[] = ['doro', 'minakuchi', 'ishigaki'];

export function spotAt(x: number): YoburiSpot {
  for (const s of YB_ORDER) if (x < YB_SPOTS[s][1]) return s;
  return 'ishigaki';
}

const cache = new Map<string, HTMLCanvasElement>();
function cached(key: string, build: () => HTMLCanvasElement): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) cache.set(key, (c = build()));
  return c;
}

/** 夜の 空（h1・h2）。 */
const NIGHT: Record<number, { top: string; low: string; horizon?: string }> = {
  1: { top: '#0B0B14', low: '#1B1733' },
  2: { top: '#0B0B14', low: '#2A2440', horizon: '#3A2B5C' },
};

// ---------------------------------------------------------------- 背景（dark と lit）

export function yoburiBg(stage: number, lit: boolean): HTMLCanvasElement {
  const s = stage >= 2 ? 2 : 1;
  return cached(`yoburi:bg:${s}:${lit ? 1 : 0}`, () => buildBg(s, lit));
}

function buildBg(stage: number, lit: boolean): HTMLCanvasElement {
  const W = SCN_W;
  const H = SCN_H;
  const sk = NIGHT[stage];
  const p = new PixelCanvas(W, H);
  const WY = YB_WATER_Y;
  const FY = YB_FLOOR_Y;
  // the warm light brings the colours and the small things back; the night sinks them
  const tone = (day: string, k = 1) => (lit ? mix(day, '#FFB070', 0.12 * k) : mix(mix(day, '#2A2440', 0.62), '#1B1733', 0.25));
  // ---- the night sky (y 0–8) with stars, the terraces' black line
  for (let y = 0; y < 9; y++) {
    const c = mix(sk.top, sk.low, y / 8);
    for (let x = 0; x < W; x++) p.set(x, y, c);
  }
  if (sk.horizon) p.hline(0, W - 1, 7, sk.horizon);
  for (let i = 0; i < 22; i++) {
    const x = ihash(i, 1, 8301) % W;
    const y = ihash(i, 2, 8301) % 6;
    if (stage === 2 && i % 2) continue;
    p.set(x, y, i % 5 === 0 ? '#FFF6D8' : '#B4AEDA');
  }
  for (let x = 0; x < W; x++) {
    const top = 6 + Math.round(valueNoise(x / 18, 0.3, 8303) * 2);
    for (let y = top; y < 9; y++) p.set(x, y, '#0E0C1A');
  }
  // ---- the north bank's stone wall, above the water (y 8–WY) and on down under it
  // a dry-stone wall (野面積み): rounded field stones of different sizes, packed in staggered rows
  const stoneWall = (y0: number, y1: number, under: boolean) => {
    for (let y = y0; y < y1; y++) for (let x = 0; x < W; x++) p.set(x, y, tone(under ? mix('#22262C', '#1E3A3A', 0.5) : '#22262C'));
    let row = 0;
    for (let y = y0 + 3; y < y1 + 3; y += 6) {
      let x = row % 2 ? -5 : 0;
      while (x < W + 6) {
        const rx = 4 + (ihash(x, y, 8305) % 4);
        const ry = 2.6 + (ihash(x, y, 8306) % 3) * 0.4;
        const cx = x + rx;
        const cy = y + ((ihash(x, y, 8304) % 3) - 1) * 0.6;
        for (let yy = Math.floor(cy - ry); yy <= Math.ceil(cy + ry); yy++)
          for (let xx = Math.floor(cx - rx); xx <= Math.ceil(cx + rx); xx++) {
            if (xx < 0 || xx >= W || yy < y0 || yy >= y1) continue;
            const dx = (xx + 0.5 - cx) / rx;
            const dy = (yy + 0.5 - cy) / ry;
            const d = dx * dx + dy * dy;
            if (d > 1) continue;
            let c: string = dx + dy < -0.55 ? '#9A9E9C' : d > 0.75 || dx + dy > 0.55 ? '#4E5456' : '#727876';
            if (h01(xx, yy, 8307) > 0.88) c = mix(c, P.leafShade, 0.6);
            if (under) c = mix(c, '#1E3A3A', 0.45 + (yy - WY) / 160);
            p.set(xx, yy, tone(c));
          }
        x += rx * 2 + 1;
      }
      row++;
    }
  };
  stoneWall(8, WY, false);
  // grass and the rice of the terrace hanging over the wall's top
  for (let x = 0; x < W; x++) {
    const len = 1 + (ihash(x, 3, 8309) % 4);
    for (let j = 0; j < len; j++) p.set(x, 8 + j, tone(j ? P.leaf : P.leafYoung));
  }
  // ---- the inlet: a concrete pipe mouth in the wall, the water falling from it
  const [ix, iy] = YB_INLET;
  for (let y = iy - 6; y <= iy + 6; y++)
    for (let x = ix - 7; x <= ix + 7; x++) {
      const d = ((x - ix) / 7) ** 2 + ((y - iy) / 6) ** 2;
      if (d > 1) continue;
      const inner = ((x - ix) / 4.5) ** 2 + ((y - iy) / 3.6) ** 2 < 1;
      p.set(x, y, inner ? '#0B0B14' : tone(x - ix + y - iy < -3 ? P.concreteLt : P.concrete));
    }
  // ---- the water
  for (let y = WY; y < FY + 2; y++) {
    const k = (y - WY) / (FY - WY);
    const c = lit ? mix('#4E7E72', '#2E4A44', k) : mix('#1E2A3A', '#0E1420', k);
    for (let x = 0; x < W; x++) if (p.alpha(x, y) === 0) p.set(x, y, c);
  }
  // the wall under the water (its stones go on down to the bed)
  stoneWall(WY + 1, 60, true);
  // the old wall on the right: big stones, deep gaps between them (the 石垣の すき間)
  const big: [number, number, number, number][] = [
    [236, 72, 13, 9], [262, 68, 11, 8], [288, 74, 12, 9], [250, 88, 12, 8], [276, 90, 11, 7], [306, 86, 12, 9], [316, 66, 9, 7],
  ];
  for (const [cx, cy, rx, ry] of big)
    for (let y = cy - ry; y <= cy + ry; y++)
      for (let x = cx - rx; x <= cx + rx; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d > 1 || x < 0 || x >= W) continue;
        let c: string = dx + dy < -0.5 ? '#8E9290' : d > 0.8 || dx + dy > 0.6 ? '#4A5052' : '#6E7472';
        if (dy < -0.3 && h01(x, y, 8311) > 0.5) c = mix(c, P.leafShade, 0.55);
        p.set(x, y, tone(mix(c, '#1E3A3A', 0.4)));
      }
  // the gaps (black)
  for (const [x, y, rx, ry] of [[249, 78, 4, 2], [276, 80, 5, 2], [300, 76, 3, 2], [263, 96, 4, 2]] as [number, number, number, number][]) p.ellipse(x, y, rx, ry, '#05050A');
  // the bridge's pier at the far right, in its own shadow
  for (let y = 8; y < FY + 2; y++)
    for (let x = W - 12; x < W; x++) p.set(x, y, tone(x === W - 12 ? P.concrete : y < WY ? P.steel : mix(P.steel, '#1E3A3A', 0.5)));
  // ---- the bed: the soft mud pool on the left (little holes where loaches went in),
  //      pebbles under the inlet, firmer mud on the right
  for (let y = FY; y < H; y++)
    for (let x = 0; x < W; x++) {
      const n = valueNoise(x / 7, y / 3, 8313);
      let c: string = n > 0.62 ? '#5A4636' : n < 0.3 ? '#2E2420' : '#443428';
      if (x < 116 && y === FY) c = '#6E5A44';
      if (y === FY && x >= 116) c = mix('#5A4A3A', '#4E7E72', 0.3);
      p.set(x, y, tone(c));
    }
  for (let x = 4; x < 110; x += 9 + (ihash(x, 7, 8315) % 7)) p.set(x, FY, tone('#1B1410'));
  for (let i = 0; i < 9; i++) {
    const x = 130 + ((i * 11) % 70);
    const y = FY - 1 + (i % 2);
    p.rect(x, y, 3, 2, tone(i % 3 ? '#8E9290' : '#B8B4A8'));
  }
  // weeds along the bed (in the light only their colour shows)
  for (let i = 0; i < 14; i++) {
    let x = 8 + ((i * 23) % 300);
    let y = FY - 1;
    for (let j = 0; j < 6 + (i % 4); j++) {
      p.set(x, y, tone(mix(P.leafShade, '#1E3A3A', 0.3)));
      y -= 1;
      if (j % 2) x += i % 2 ? 1 : -1;
    }
  }
  // the surface line
  for (let x = 0; x < W; x++) p.set(x, WY, lit ? mix('#4E7E72', '#FFE7C0', 0.35) : '#2A3448');
  return p.toCanvas();
}

// ---------------------------------------------------------------- 生き物

export interface YbImg {
  img: HTMLCanvasElement;
  /** 頭の 先（体長の 0）。 */
  ax: number;
  /** 腹が 泥に つく 行。 */
  ay: number;
  /** 目の 位置。 */
  eye: [number, number];
}

const meta = new Map<string, YbImg>();

const LOACH: Record<'dojou' | 'chibi' | 'ooki' | 'dojou_nushi', { base: string; dark: string; light: string; belly: string; spots: number; whisker: number }> = {
  dojou: { base: '#8A7450', dark: '#4A3A26', light: '#B8A070', belly: '#D8C8A0', spots: 7, whisker: 3 },
  chibi: { base: '#9A845E', dark: '#5E4A30', light: '#C8B080', belly: '#E0D0A8', spots: 3, whisker: 2 },
  ooki: { base: '#7A6444', dark: '#3E301E', light: '#A88E62', belly: '#C8B890', spots: 9, whisker: 4 },
  // ぬし：ぶち（まだらが 大きい）、ひげが 長い
  dojou_nushi: { base: '#6E5A3A', dark: '#2A2016', light: '#9A845A', belly: '#C0AE84', spots: 14, whisker: 7 },
};

/** ドジョウ（横から、左向き）。`wig` 0/1：体の くねり。 */
export function loach(kind: 'dojou' | 'chibi' | 'ooki' | 'dojou_nushi', cm: number, wig: number): YbImg {
  const key = `loach:${kind}:${cm}:${wig}`;
  const hit = meta.get(key);
  if (hit) return hit;
  const s = LOACH[kind];
  const L = Math.max(8, Math.round(cm * YB_PX_PER_CM));
  const padL = s.whisker + 2;
  const w = padL + L + 3;
  const h = Math.max(7, Math.round(L * 0.14) + 6);
  const p = new PixelCanvas(w, h);
  const cy = Math.round(h / 2);
  const th = Math.max(1, Math.round(L * 0.055));
  for (let x = 0; x < L; x++) {
    const k = x / L;
    const half = k < 0.1 ? Math.max(1, Math.round(th * (0.6 + k * 4))) : k > 0.85 ? Math.max(1, Math.round(th * (1 - (k - 0.85) * 3))) : th;
    const yo = Math.round(Math.sin(k * Math.PI * 2 + wig * Math.PI) * (k > 0.3 ? 1 : 0));
    for (let y = cy - half; y <= cy + half; y++) {
      const v = (y - (cy - half)) / Math.max(1, half * 2);
      let c = v < 0.3 ? s.light : v > 0.7 ? s.belly : s.base;
      if (v < 0.75 && ihash(x, y, 8321 + s.spots) % Math.max(2, 12 - s.spots) === 0) c = s.dark;
      p.set(padL + x, y + yo, c);
    }
  }
  // the tail fin, round
  const tx = padL + L;
  p.vline(tx, cy - th - 1, cy + th + 1, s.light);
  p.vline(tx + 1, cy - th, cy + th, s.dark);
  // the small eye high on the head, the whiskers (five pairs: drawn as a short fan)
  const eye: [number, number] = [padL + 2, cy - th + 1];
  p.set(eye[0], eye[1], '#0B0B14');
  for (let i = 0; i < 3; i++) {
    const len = s.whisker - (i === 2 ? 1 : 0);
    for (let j = 1; j <= len; j++) p.set(padL - j, cy + 1 + i - Math.round(j * (i - 1) * 0.3), i === 1 ? s.dark : s.light);
  }
  p.outline('#0B0B14');
  // (the eye catches the light: one bright pixel over the outline)
  const r: YbImg = { img: p.toCanvas(), ax: padL, ay: cy + th + 1, eye };
  meta.set(key, r);
  return r;
}

/** ヤゴ（トンボの 子）：大きな 目、平たい 体、6本の 足。 */
export function yago(cm: number, wig: number): YbImg {
  const key = `yago:${cm}:${wig}`;
  const hit = meta.get(key);
  if (hit) return hit;
  const L = Math.max(8, Math.round(cm * YB_PX_PER_CM));
  const w = L + 6;
  const h = Math.round(L * 0.5) + 4;
  const p = new PixelCanvas(w, h);
  const cy = Math.round(h / 2);
  const ax = 2;
  for (let x = 0; x < L; x++) {
    const k = x / L;
    const half = k < 0.25 ? 2 : k < 0.75 ? 3 : Math.max(1, Math.round(3 - (k - 0.75) * 8));
    for (let y = cy - half; y <= cy + half; y++) {
      const v = (y - (cy - half)) / (half * 2 || 1);
      let c = v < 0.3 ? '#8A8A5A' : v > 0.7 ? '#4A4A30' : '#6A6A44';
      if (k > 0.3 && Math.round(k * L) % 3 === 0) c = '#3A3A24';
      p.set(ax + x, y, c);
    }
  }
  // the big eyes, the "mask" under the face (it looks smug)
  p.rect(ax, cy - 3, 3, 2, '#2A2A18');
  p.set(ax + 1, cy - 3, '#C8C890');
  p.hline(ax - 1, ax + 2, cy + 1, '#9A9A60');
  // six legs
  for (let i = 0; i < 3; i++) {
    const lx = ax + 4 + i * 3;
    p.line(lx, cy + 2, lx - 2 + wig + i, cy + 4, '#4A4A30');
    p.line(lx, cy - 2, lx - 1 + i, cy - 4, '#4A4A30');
  }
  p.outline('#0B0B14');
  const r: YbImg = { img: p.toCanvas(), ax, ay: cy + 3, eye: [ax + 1, cy - 3] };
  meta.set(key, r);
  return r;
}

/** カワニナ（細い 巻き貝。殻の 先を 右上に）。 */
export function kawanina(): YbImg {
  const key = 'kawanina';
  const hit = meta.get(key);
  if (hit) return hit;
  const p = new PixelCanvas(10, 7);
  const rows = ['.......oo.', '.....oooTo', '...ooBoTo.', '.oBBoBo...', 'oBLBBo....', 'oBBo......', '.oo.......'];
  p.art(rows, { o: '#0B0B14', B: '#4A3A26', L: '#8A7450', T: '#2A2016' });
  const r: YbImg = { img: p.toCanvas(), ax: 0, ay: 6, eye: [1, 5] };
  meta.set(key, r);
  return r;
}

export function creature(kind: YoburiKind, cm: number, wig: number): YbImg {
  if (kind === 'yago') return yago(cm, wig);
  if (kind === 'kawanina') return kawanina();
  return loach(kind, cm, wig);
}

// ---------------------------------------------------------------- 灯り（トマトの 入った 虫とりアミ）と たも網の 柄

/** 水の 上に さし出した 灯り：虫とりアミの 輪の 中の トマト（光る）。 */
export function lanternImg(): HTMLCanvasElement {
  return cached('yoburi:lantern', () => {
    const p = new PixelCanvas(16, 18);
    // the net's ring and its mesh, the tomato glowing inside
    for (let a = 0; a < 24; a++) {
      const th = (a / 24) * Math.PI * 2;
      p.set(Math.round(8 + Math.cos(th) * 6), Math.round(6 + Math.sin(th) * 2), '#C8C2B4');
    }
    for (let y = 7; y < 15; y++) {
      const half = Math.round(5 * Math.sqrt(1 - (y - 7) / 9));
      for (let x = -half; x <= half; x += 2) p.set(8 + x + (y % 2), y, '#E8E4D8');
    }
    p.ellipse(8, 10, 3.2, 3, '#F2894B');
    p.ellipse(7, 9, 1.6, 1.4, '#FFE7C0');
    p.set(8, 6, '#3FA66B');
    p.set(9, 6, '#9BCB6B');
    // the handle going up out of the window
    p.vline(14, 0, 5, '#C8A06A');
    p.line(14, 5, 13, 6, '#C8A06A');
    return p.toCanvas();
  });
}

/** マルの たも網の 柄（白木、小刀で 刻んだ 目盛り 1cm ごと、0〜20cm、柄じりに『マル』の 刻み）。 */
export function handleRuler(): HTMLCanvasElement {
  return cached('yoburi:handle', () => {
    const len = 20 * YB_PX_PER_CM;
    const p = new PixelCanvas(len + 14, 7);
    p.rect(0, 1, len + 14, 5, '#C8A06A');
    p.hline(0, len + 13, 1, '#E8C890');
    p.hline(0, len + 13, 5, '#8A5A3A');
    for (let c = 0; c <= 20; c++) {
      const x = 2 + c * YB_PX_PER_CM;
      // hand-cut notches: a little uneven
      const hh = c % 5 === 0 ? 3 : 2;
      p.vline(x + (ihash(c, 1, 8331) % 7 === 0 ? 1 : 0), 2, 1 + hh, '#5A3A2A');
    }
    // 『マル』 cut small at the butt end (two marks, the tool's way)
    const mx = len + 6;
    p.hline(mx, mx + 3, 2, '#5A3A2A');
    p.line(mx + 3, 2, mx + 1, 4, '#5A3A2A');
    p.ellipse(mx + 6, 3, 1.5, 1.2, '#5A3A2A');
    p.set(mx + 6, 3, '#C8A06A');
    p.outline('#5A3A2A');
    return p.toCanvas();
  });
}

/** ドジョウの シール（②の 表紙、14×8）。 */
export function stickerDojou(): HTMLCanvasElement {
  return cached('yoburi:sticker', () => {
    const p = new PixelCanvas(16, 9);
    p.ellipse(8, 4, 7.5, 4, '#F4F1E8');
    const im = loach('chibi', 4, 0).img;
    const c = p.toCanvas();
    c.getContext('2d')!.drawImage(im, 1, 1);
    return c;
  });
}

// ---------------------------------------------------------------- 小屋の たも網・沢ガニ（フィールドの 小物）

import { registerProp } from './registry';
import { stand } from './pkit';
import { finish } from './kit';

/** マルの たも網：農具小屋の 西の 壁に 立てかけてある（柄の 短い、竹の 輪の 網。柄に 小さく 刻み）。 */
registerProp('prop_yoburi_tamo', () => {
  const p = new PixelCanvas(16, 30);
  // the handle, leaning: from the floor up to the hoop
  for (let i = 0; i < 17; i++) {
    const x = 11 - Math.round(i * 0.25);
    const y = 28 - i;
    p.set(x, y, '#C8A06A');
    p.set(x + 1, y, '#8A5A3A');
  }
  // the notches cut in it (the marks) and the little 『マル』 near the butt
  for (let i = 2; i < 14; i += 2) p.set(11 - Math.round(i * 0.25), 28 - i, '#5A3A2A');
  p.set(12, 26, '#5A3A2A');
  // the hoop (bent bamboo) seen from the side, the bag of the net hanging from it
  p.ring(7, 7, 6, 5, '#C8A06A');
  p.ring(7, 7, 5, 4, '#8A5A3A');
  for (let y = 3; y < 13; y++) for (let x = 3; x < 12; x++) if (((x + y) & 1) === 0 && ((x - 7) / 5) ** 2 + ((y - 7) / 4.3) ** 2 < 1) p.set(x, y, '#E8E4D8');
  for (let y = 12; y < 17; y++) for (let x = 5 + (y - 12); x < 10 - (y - 12) / 2; x += 2) p.set(x, y, '#C8C2B4');
  finish(p, { soft: true, rim: false });
  return stand(p.toCanvas(), { cx: 6, base: 14, shadow: 0, contact: 6 });
});

/** 沢ガニ（小さい。はさみを 上げて じっと している）。opts.red：赤い 沢ガニ。灯りの 中だけ（litOnly）。 */
registerProp('prop_yoburi_kani', (opts) => {
  const red = !!opts.red;
  const B = red ? '#C8402E' : '#7A5A3A';
  const L = red ? '#E8705A' : '#A8845A';
  const D = red ? '#7A2418' : '#4A3426';
  const p = new PixelCanvas(12, 9);
  p.ellipse(6, 5, 3.5, 2.2, B);
  p.hline(4, 7, 4, L);
  // claws up, legs out
  p.set(2, 3, B);
  p.set(1, 2, L);
  p.set(2, 1, B);
  p.set(9, 3, B);
  p.set(10, 2, L);
  p.set(9, 1, B);
  for (const [x, y] of [[2, 6], [1, 7], [3, 7], [9, 6], [10, 7], [8, 7]] as [number, number][]) p.set(x, y, D);
  p.set(5, 3, '#0B0B14');
  p.set(7, 3, '#0B0B14');
  p.outline('#1B1733');
  const img = p.toCanvas();
  return stand(img, { cx: 8, base: 13, shadow: 0, contact: 6 });
});
