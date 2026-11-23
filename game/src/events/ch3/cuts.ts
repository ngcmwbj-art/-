// 第3章の1枚絵の差しこみ口（62 12章）。W が描いた1枚絵（2D の 384×216、HD-2D は同じ構図の
// 立体）を、E の台本が名前で呼ぶ。登録されていない絵は、台本がフィールドの上で代わりに見せる
// （第2章のエンディングと同じ「フィールドで撮る」形）。
//
//   registerC3Cut('cut_c3_photo', function* (o) { … })   // W
//   if (hasC3Cut('cut_c3_photo')) yield* playC3Cut('cut_c3_photo', { kita })   // E
//
// o.kita：来た人の id（60 3.4 の順）、o.town：話しかけた海ぞいの町の人の id。

import type { Co } from '../../engine/co';

export interface C3CutOpts {
  kita?: string[];
  town?: string[];
  /** The cut's length the script expects (ms); the cut may ignore it. */
  ms?: number;
}

const cuts = new Map<string, (o: C3CutOpts) => Co>();

export function registerC3Cut(id: string, fn: (o: C3CutOpts) => Co): void {
  cuts.set(id, fn);
}

export function hasC3Cut(id: string): boolean {
  return cuts.has(id);
}

export function* playC3Cut(id: string, o: C3CutOpts = {}): Co<boolean> {
  const fn = cuts.get(id);
  if (!fn) return false;
  yield* fn(o);
  return true;
}
