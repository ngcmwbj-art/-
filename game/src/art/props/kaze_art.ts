// 日じゃ なくて、風（03_ch3_index、events/ch3/kaze.ts）の 絵：干物屋の 路地の 干し網の かぎ（3つ）と、
// 路地の 出口の 角の 物干し（手ぬぐい・タオル・洗濯ばさみの ピンチハンガー）。
//
//   ・かぎ prop_kz_kagi（opts.k = 0..2）：木の 柱と 腕、先に かぎ。flag_kz_at が k+1 の とき 3段の 干し網が 下がる。
//     ③（k = 2）だけ、段階2 で 風に ゆれる（下ほど 大きく、西へ かたむいて 行ったり 来たり）。①② は まっすぐ。
//   ・物干し prop_kz_sentaku：段階1 は すそが ななめの まま 止まって いる。段階2 は 手ぬぐいと 洗濯ばさみが ゆれる。
//   ゆれは スマホ縦（1倍）でも 見えるよう、すその 動きを 4〜5px に した（会議「ゆれは スマホでも はっきり」）。
//   HD-2D では 1px の 板（tune.ts の SOLID に ここから 足す）：絵の 前の 面は 四角 全部なので、ゆれた 所も 切れない。

import { PixelCanvas } from '../../engine/pixel';
import { SOLID } from '../../hd2d/tune';
import { outline } from './kit';
import { registerProp } from './registry';
import type { PropEnv } from './types';

/** 何コマで 1回 ゆれるか・1コマの ms。 */
const N = 8;
const MS = 140;

/** コマ i の ずれ（px、−＝西）：−4〜+1。 */
export function swayDx(i: number, amp = 2.5): number {
  return Math.round(-2 + amp * Math.sin((2 * Math.PI * i) / N));
}

function frameOf(env: PropEnv): number {
  return Math.floor(env.t / MS) % N;
}

const swaying = (env: PropEnv): boolean => env.flag('flag_ch3_stage') === 2;

// ---------------------------------------------------------------- かぎ

const KW = 20;
const KH = 34;
const HOOK_X = 12;

function paintKagi(p: PixelCanvas): void {
  // 柱・足・腕・すじかい・かぎ
  p.rect(2, 3, 2, 29, '#6A4A2A');
  p.vline(2, 3, 31, '#8A6A4A');
  p.rect(0, 31, 7, 3, '#5A3A2A');
  p.hline(0, 6, 31, '#7A5A3A');
  p.rect(2, 3, 12, 2, '#6A4A2A');
  p.hline(2, 13, 3, '#8A6A4A');
  p.line(4, 8, 8, 5, '#6A4A2A');
  p.set(HOOK_X, 5, '#9AA0A8');
  p.set(HOOK_X, 6, '#9AA0A8');
  p.set(HOOK_X + 1, 7, '#6B7186');
}

/** 3段の 干し網（かぎから 下がる）。dx：いちばん 下の ずれ。 */
function paintAmi(p: PixelCanvas, dx: number): void {
  const off = (y: number) => Math.round((dx * Math.max(0, y - 7)) / 22);
  // ひも
  for (let y = 7; y <= 9; y++) p.set(HOOK_X + off(y), y, '#C8C2B4');
  for (let y = 10; y <= 29; y++) {
    const o = off(y);
    const narrow = y >= 28 ? 2 : 0;
    const x0 = HOOK_X - 4 + o + narrow;
    const x1 = HOOK_X + 4 + o - narrow;
    const rim = y === 10 || y === 16 || y === 22 || y === 27;
    if (rim) {
      p.hline(x0, x1, y, '#3E5A4E');
      continue;
    }
    // 網の 目（うすい 緑）、両はしの 縦の すじ
    for (let x = x0; x <= x1; x++) if ((x + y) % 2 === 0) p.set(x, y, '#8AB0A0');
    p.set(x0, y, '#3E5A4E');
    p.set(x1, y, '#3E5A4E');
  }
  // 段ごとに アジの 開き 2枚
  for (const ty of [12, 18, 24]) {
    for (const fx of [-3, 1]) {
      const o = off(ty + 1);
      const x = HOOK_X + fx + o;
      p.rect(x, ty, 3, 2, '#C89A6A');
      p.set(x, ty, '#E8C8A0');
      p.set(x + 2, ty + 1, '#A8743A');
    }
  }
}

const kagiCache = new Map<string, HTMLCanvasElement>();
function kagiImg(hung: boolean, dx: number): HTMLCanvasElement {
  const key = `${hung ? 1 : 0}:${dx}`;
  let c = kagiCache.get(key);
  if (!c) {
    const p = new PixelCanvas(KW, KH);
    paintKagi(p);
    if (hung) paintAmi(p, dx);
    outline(p, { bottom: true, soft: true });
    c = p.toCanvas();
    kagiCache.set(key, c);
  }
  return c;
}

registerProp('prop_kz_kagi', (opts) => {
  const k = Number((opts as { k?: number }).k ?? 0);
  return {
    ox: -1,
    oy: 16 - KH,
    w: KW,
    h: KH,
    foot: 15,
    img: (env: PropEnv) => {
      const hung = env.flag('flag_kz_at') === k + 1;
      if (!hung) return kagiImg(false, 0);
      return kagiImg(true, k === 2 && swaying(env) ? swayDx(frameOf(env)) : 0);
    },
    contact: 6,
  };
});

// ---------------------------------------------------------------- 物干し

const SW = 30;
const SH = 30;
const BAR = 5;

function paintSentaku(p: PixelCanvas, dx: number): void {
  const off = (y: number) => Math.round((dx * Math.max(0, y - BAR)) / 12);
  // 2本の 柱と 竿
  for (const x of [1, 28]) {
    p.rect(x, BAR - 1, 1, SH - BAR, '#9AA0A8');
    p.rect(x - 1, SH - 2, 3, 2, '#6B7186');
  }
  p.hline(0, 29, BAR - 1, '#C8CCD2');
  p.hline(0, 29, BAR, '#9AA0A8');
  // 手ぬぐい（白に 青い すじ）
  for (let y = BAR + 1; y <= BAR + 13; y++) {
    const o = off(y);
    const c = y === BAR + 4 || y === BAR + 10 ? '#4A6AB0' : '#F4F1E8';
    p.hline(4 + o, 10 + o, y, c);
    p.set(10 + o, y, y === BAR + 4 || y === BAR + 10 ? '#2F4A8A' : '#C8C2B4');
  }
  // タオル（黄色）
  for (let y = BAR + 1; y <= BAR + 11; y++) {
    const o = off(y);
    p.hline(13 + o, 18 + o, y, y >= BAR + 10 ? '#D9A441' : '#FFD23F');
    p.set(18 + o, y, '#D9A441');
  }
  // ピンチハンガー：かぎ、四角い わく、洗濯ばさみ 3つ（赤・青・黄）と 小さい 靴下
  const ho = off(BAR + 3);
  p.set(23, BAR + 1, '#6B7186');
  p.set(23 + off(BAR + 2), BAR + 2, '#6B7186');
  p.hline(20 + ho, 26 + ho, BAR + 3, '#E8E4D8');
  const clips = ['#E23B2E', '#4AA8E0', '#E23B2E'];
  [20, 23, 26].forEach((x, i) => {
    const co = off(BAR + 5);
    p.set(x + co, BAR + 4, clips[i]);
    p.set(x + co, BAR + 5, clips[i]);
    for (let y = BAR + 6; y <= BAR + 10; y++) p.set(x + off(y), y, i === 1 ? '#F4F1E8' : '#9AC0E0');
    p.set(x + 1 + off(BAR + 10), BAR + 10, i === 1 ? '#F4F1E8' : '#9AC0E0');
  });
}

const sentakuCache = new Map<number, HTMLCanvasElement>();
function sentakuImg(dx: number): HTMLCanvasElement {
  let c = sentakuCache.get(dx);
  if (!c) {
    const p = new PixelCanvas(SW, SH);
    paintSentaku(p, dx);
    outline(p, { bottom: true, soft: true });
    c = p.toCanvas();
    sentakuCache.set(dx, c);
  }
  return c;
}

registerProp('prop_kz_sentaku', () => ({
  ox: -7,
  oy: 16 - SH,
  w: SW,
  h: SH,
  foot: 15,
  // 段階1：すそが ななめの まま 止まって いる。段階2：風で ゆれる（コマは かぎの ③と 少し ずらす）
  img: (env: PropEnv) => sentakuImg(swaying(env) ? swayDx((frameOf(env) + 2) % N, 3) : -3),
  contact: 20,
}));

// HD-2D：うすい 板（絵の 前の 面が ゆれを そのまま 見せる）
SOLID.prop_kz_kagi = { kind: 'slab', depth: 1 };
SOLID.prop_kz_sentaku = { kind: 'slab', depth: 1 };
