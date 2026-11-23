// 大写しの 遊びにも「ひろい」（改善会議 2026-10-28 の 5）。
// 置き場：ui/closeup.ts からも export（events から は どちらでも）。軽い ファイルに 分けたのは、ui/ の 遊び
// （型ぬき・報告書）から 読んでも 読み込みの 輪に ならない ため。
//
// 新しい 切りかえは 作らず、せっていの「ツッコミ判定：ひろい」（flag_opt_tsukkomi_wide、ui/settings.ts）を
// 大写しの 遊びにも 効かせる。絵は 変えずに 当たりの 幅だけ 広げる：
//   const tol = 6 * closeupWide();            // 幅（px・秒・フレーム・度 …）に かける
//   const [lo, hi] = widenRange(0.42, 0.58);  // まん中は そのまま、両はしを 広げる（0..1 に 収める）
//   const n = widenInt(3);                    // フレーム数 など 整数（ひろいで 少なくとも +1）

import { flag } from '../game/state';

/** ひろい の とき 当たりの 幅に かける 倍率（ふつう 1）。 */
export const CLOSEUP_WIDE_MUL = 1.5;

/** 大写しの 当たりの 幅の 倍率：ツッコミ判定 ひろい = 1.5、ふつう = 1。 */
export function closeupWide(): number {
  return flag('flag_opt_tsukkomi_wide') ? CLOSEUP_WIDE_MUL : 1;
}

/** 整数の 幅（フレーム数・ます数）：ひろい なら round(n×1.5)、少なくとも n+1。 */
export function widenInt(n: number): number {
  if (closeupWide() === 1) return n;
  return Math.max(n + 1, Math.round(n * CLOSEUP_WIDE_MUL));
}

/** [lo, hi] を まん中は そのまま 広げる（clampLo..clampHi に 収める。ふつう なら そのまま）。 */
export function widenRange(lo: number, hi: number, clampLo = -Infinity, clampHi = Infinity): [number, number] {
  const k = closeupWide();
  if (k === 1) return [lo, hi];
  const c = (lo + hi) / 2;
  const h = ((hi - lo) / 2) * k;
  return [Math.max(clampLo, c - h), Math.min(clampHi, c + h)];
}

