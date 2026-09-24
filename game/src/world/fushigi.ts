// 「ふしぎ」(00_concept 12章 / 10_narrative 8章): anomalies the player can
// stamp with 『みました』 once they own the hanko case. Examining runs the
// "seen" text, then offers the stamp; stamping plays the stamp effect, the
// "pressed" text and gives the reward (朱肉+2, sometimes an item).
//
// Other teams can add or override entries with registerFushigi().

import type { Co } from '../engine/co';
import { flag, setFlag, state, addItem } from '../game/state';
import { runMsg } from './msg';
import { hasScript, getScript } from './scripts';
import * as snd from './audio';

export interface FushigiDef {
  id: string;
  /** Stages where it is an anomaly (before: plain examine text). */
  stage?: string;
  /** Text when examined (before stamping). */
  seen: string;
  /** Text right after stamping. */
  pressed: string;
  /** Text when examined after stamping. */
  after: string;
  item?: string;
  money?: number;
  /** Called after stamping (effects, follow-up events). */
  onPress?: () => Co | void;
}

const defs = new Map<string, FushigiDef>();
export function registerFushigi(d: FushigiDef): void {
  defs.set(d.id, d);
}
export function getFushigi(id: string): FushigiDef | undefined {
  return defs.get(id);
}
export function fushigiIds(): string[] {
  return [...defs.keys()];
}

export function fushigiDone(id: string): boolean {
  return flag('flag_' + id) > 0;
}
export function fushigiCount(): number {
  let n = 0;
  for (let i = 1; i <= 12; i++) if (flag(`flag_fushigi_${String(i).padStart(2, '0')}`)) n++;
  return n;
}

/** Hook for the stamp visual (installed by the field). */
let stampFx: ((id: string) => Co) | null = null;
/** The installed visual plays se_stamp itself, on its own impact frame. */
let stampFxSound = false;
export function setStampFx(fn: (id: string) => Co, opts: { ownSound?: boolean } = {}): void {
  stampFx = fn;
  stampFxSound = !!opts.ownSound;
}
/** Listeners notified when a fushigi is pressed (world effects). */
const pressListeners: ((id: string) => void)[] = [];
export function onFushigiPressed(fn: (id: string) => void): void {
  pressListeners.push(fn);
}

/** Is it currently an active (stampable) anomaly? */
export function fushigiActive(id: string): boolean {
  const d = defs.get(id);
  if (!d) return false;
  if (fushigiDone(id)) return false;
  if (!d.stage) return true;
  const s = flag('flag_stage');
  const m = /^(\d)(\+|-(\d))?$/.exec(d.stage);
  if (!m) return true;
  const lo = +m[1];
  const hi = m[2] === '+' ? 9 : m[3] !== undefined ? +m[3] : lo;
  return s >= lo && s <= hi;
}

function giveMp(n: number): void {
  const m = state.party.find((p) => p.id === 'minato');
  if (m) m.mp = Math.min(m.maxMp, m.mp + n);
}

/**
 * Full examine flow of a fushigi. `seenOverride` replaces the "seen" text
 * (e.g. an NPC's own talk that precedes the stamp question).
 */
export function* runFushigi(id: string, seenOverride?: string): Co {
  const d = defs.get(id);
  if (!d) return;
  if (fushigiDone(id)) {
    yield* runMsg(d.after);
    return;
  }
  yield* runMsg(seenOverride ?? d.seen);
  if (!flag('flag_got_hanko') || !fushigiActive(id)) return;
  const i = yield* runMsg(`@sys
『みました』を 押しますか？
? 押す | やめておく`);
  if (i !== 0) return;
  if (!stampFx || !stampFxSound) snd.se('se_stamp');
  if (stampFx) yield* stampFx(id);
  setFlag('flag_' + id, 1);
  for (const f of pressListeners) f(id);
  yield* runMsg(d.pressed);
  const r = d.onPress?.();
  if (r) yield* r;
  if (d.item) {
    if (addItem(d.item)) {
      snd.se('se_item');
    }
  }
  if (d.money) state.money += d.money;
  giveMp(2);
  yield* runMsg(`@sys
朱肉が 2 たまった。
みました帳に 書きこんだ。（ふしぎ ${fushigiCount()}/12）`);
  // the tutorial fushigi leads to evt_obaa_park_hint
  if (id === 'fushigi_04' && !flag('flag_park_hint') && flag('flag_stage') === 1 && hasScript('evt_obaa_park_hint')) {
    const fn = getScript('evt_obaa_park_hint')!;
    yield* fn({ source: id, map: state.map, runDefault: function* () {} });
  }
}

// ---- defaults (10_narrative 8章) -----------------------------------------------------

registerFushigi({
  id: 'fushigi_01',
  stage: '0+',
  seen: `@narr
カーブミラーに ミナトが
映っている。{w=600}
……一拍 おくれて、得意顔を した。`,
  pressed: `@narr
鏡の 中の ミナトが、
あわてて 追いついた。`,
  after: `@narr
カーブミラーの ミナトは、
ぴったり 同じ 顔を している。`,
});
registerFushigi({
  id: 'fushigi_02',
  stage: '1+',
  seen: `!se se_cat
@npc_cat_sauce
ニャ。
@narr
猫が あくびを した。{w=300}
影は、まだ 口を 閉じている。`,
  pressed: `@narr
影が 猫に 追いついて、
ちょっと 照れた。`,
  after: `@narr
猫と 影が、
同時に あくびを した。`,
});
registerFushigi({
  id: 'fushigi_03',
  stage: '1+',
  seen: `@narr
電線の スズメが、
五線譜みたいに 並んでいる。{w=300}
同じ 曲を、ずっと くり返している。`,
  pressed: `@narr
スズメたちは、
別の 曲を はじめた。`,
  after: `@narr
スズメたちの 曲が、
少し 上手に なっている。`,
});
registerFushigi({
  id: 'fushigi_04',
  stage: '1+',
  seen: `@npc_mamekichi
まいど！ まいど！{w=300}
まい……ど？
/
おれ 今日、何回
まいどって 言った？{w=300}
まいど！`,
  pressed: `@narr
まめ吉は 『……まいど』を、
1回で やめた。`,
  after: `@npc_mamekichi
まいど。{w=300}
……1回で いいんだな、これ。`,
});
registerFushigi({
  id: 'fushigi_05',
  stage: '0+',
  seen: `@narr
3番の 乾燥機。{w=300}
40分、回り続けている。
/
中から、自分の 声で
『まだ 乾いてない』と
聞こえる。`,
  pressed: `@narr
中から 『乾いた』と 声が した。
!se se_door_small
@sys
ハッカあめを 手に入れた！`,
  after: `@narr
3番の 乾燥機。{w=300}
中は からっぽで、あたたかい。`,
  item: 'item_hakka_ame',
});
registerFushigi({
  id: 'fushigi_06',
  stage: '1+',
  seen: `@narr
掲示板 『本日の 落とし物』。{w=300}
『17時（1個）』。
/
……落とし物に 入るのか。`,
  pressed: `@narr
掲示に、受付印が 押された。`,
  after: `@narr
『17時（1個） 受付済み』。{w=300}
あとは、落とし主を 待つだけ。`,
});
registerFushigi({
  id: 'fushigi_07',
  stage: '1+',
  seen: `@npc_sand_girl
夕日が 沈まないように、
砂で せきとめてるの。`,
  pressed: `@narr
女の子は ほこらしげに
胸を はった。`,
  after: `@npc_sand_girl
見てた？{w=300}
ていぼう、すごいでしょ。`,
});
registerFushigi({
  id: 'fushigi_08',
  stage: '1+',
  seen: `@narr
時計塔は 17:00で 止まっている。{w=300}
長い 針が、12の 上で
ふるえている。`,
  pressed: `@narr
時計は 見られていることに
気づいて、秒針だけ 動かした。
/
……すぐ 止まった。`,
  after: `@narr
時計塔は 17:00。{w=300}
ときどき 秒針が、
こっちを 気に している。`,
});
registerFushigi({
  id: 'fushigi_09',
  stage: '2+',
  seen: `@narr
ショッピングカートが 3台、
勝手に うろうろ している。
/
1台が こっちに 寄ってきて、
ちょっと 止まって、また 離れた。`,
  pressed: `@narr
カートたちは 1列に 並んで、
カート置き場へ 戻っていった。`,
  after: `@narr
カートたちは 置き場で、
ぴったり 重なっている。`,
});
registerFushigi({
  id: 'fushigi_10',
  stage: '0+',
  seen: `@narr
枯れた 噴水。{w=300}
底に、10円玉が 1枚。
/
1年ぶんの 願いごとを、
1枚で 背負っている。`,
  pressed: `@narr
願いごとが 1枚ぶん、
かなった 気が する。
!se se_coin
@sys
10円 ひろった。`,
  after: `@narr
枯れた 噴水。{w=300}
底には、もう 何も ない。`,
  money: 10,
});
registerFushigi({
  id: 'fushigi_11',
  stage: '0+',
  seen: `@narr
止まった エスカレーター。{w=300}
のぼると、1段ごとに
お礼を 言われる。`,
  pressed: `@narr
エスカレーターは 1回だけ、
『イラッシャイマセ』と 言った。`,
  after: `@narr
エスカレーター。{w=300}
のぼっても、もう
お礼を 言わない。`,
});
