// 水辺の 図鑑：対岸の ザリガニ釣り（src/events/tamotsu.ts）に 足す 所（02_ch2_index #81）。
// tamotsu.ts から 呼ぶ（このファイルは tamotsu.ts を import しない）。
//
//   ・はじめての 1ぴきの ラムネの つぎ：『みずべ』の 欄が できる（みました帳を 持っていれば。
//     持っていなければ、手に入れた あと 次に おぴぃと 話したとき）。
//   ・釣った 種と 記録を『みずべ』に（本当の cm と おぴぃ 認定の cm）。段階1の 1ぴきは
//     ページの すみに『止まっていた 1ぴき』（地の文は 1回）。
//   ・ザリ拓は 場所ごとに 3枚（草の下・石の陰・土管の口）。その 場所の 記録を こえると なぞりなおす。
//   ・ザリガニを 1ぴき 釣ったあと、釣りの おわりの「また 来な」の かわりに 堰への 誘い（1回）。

import type { Co } from '../engine/co';
import { flag, hasItem, setFlag } from '../game/state';
import { msg } from '../world/api';
import { field } from '../world/field';
import { sfx } from '../audio';
import { MIZUBE_ZARI } from '../data/text/mizube';
import { setZukanStill, zukanRecord, zukanSee } from '../data/text/mizube_book';

export const MZ = {
  /** ①の『みずべ』の 欄。 */
  book: 'flag_mizube_book',
  /** 堰へ 誘われた（おぴぃが 堰に いる）。 */
  seki: 'flag_mizube_seki',
  /** 段階1の 1ぴきの 地の文（1回）。 */
  stillNote: 'flag_mizube_still_note',
  /** ザリガニの ぬしを グソっ君と 見た（片手の 大将で グソっ君が 先に 言う）。 */
  nushiKane: 'flag_mizube_nushi_kane',
} as const;

/** ザリ拓（場所ごと）：その 場所の いちばん 大きい 認定の cm。 */
export const takuFlag = (spot: string) => `flag_zari_taku_${spot}`;
export const TAKU_SPOTS = ['kusa', 'ishi', 'dokan'] as const;

export function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower && f.follower.visible && flag('flag_kanenari_joined') > 0;
}

function hasNotebook(): boolean {
  return hasItem('item_mimashita_cho');
}

/** 欄が できる 場面（はじめての 1ぴきの ラムネの つぎ、または あとで 話したとき）。 */
function* openBook(later: boolean): Co {
  setFlag(MZ.book, 1);
  yield* msg(later ? MIZUBE_ZARI.book_later : MIZUBE_ZARI.book);
  sfx('se_pen_write');
  yield* msg(MIZUBE_ZARI.book_sys);
}

/** はじめての 1ぴき（ラムネの あと）。 */
export function* mizubeAfterFirstZari(): Co {
  if (flag(MZ.book) || !hasNotebook()) return;
  yield* openBook(false);
}

/** おぴぃと 話したとき：釣った あとで みました帳を 手に入れた 人に 欄を。言ったら true。 */
export function* mizubeBookLater(): Co<boolean> {
  if (flag(MZ.book) || !hasNotebook() || flag('flag_zari_count') <= 0) return false;
  yield* openBook(true);
  return true;
}

const ZARI_ID: Record<string, string> = { kozari: 'kozari', zari: 'zari', makka: 'makka', can: 'can' };

/** 計った ザリガニを『みずべ』に。 */
export function zariZukan(kind: string, cm: number, cert: number): void {
  const id = ZARI_ID[kind];
  if (id) zukanRecord(id, cm, cert);
}

/** ぬし（計らない）。グソっ君が いれば その ことを 覚えておく。 */
export function zariNushiZukan(): void {
  zukanSee('zari_nushi');
  if (kanenariHere()) setFlag(MZ.nushiKane, 1);
}

/** 段階1の 1ぴき：ページの すみに『止まっていた 1ぴき』（地の文は 1回）。 */
export function* zariStillNote(kind: string): Co {
  const id = ZARI_ID[kind];
  if (id) setZukanStill(id);
  if (!flag(MZ.book) || flag(MZ.stillNote)) return;
  setFlag(MZ.stillNote, 1);
  yield* msg(MIZUBE_ZARI.still_note);
}

/** その 場所の ザリ拓の cm（場所ごとの 記録が ない 古い セーブは 0）。 */
export function takuBest(spot: string): number {
  return flag(takuFlag(spot));
}

/** ザリガニを 1ぴき 釣ったあとで、まだ 誘っていない。 */
export function sekiInviteDue(): boolean {
  return flag('flag_zari_count') > 0 && !flag(MZ.seki) && flag('flag_stage') <= 2;
}

/** 釣りの おわりの「また 来な」の かわりに 堰への 誘い（1回）。 */
export function* sekiInvite(): Co {
  setFlag(MZ.seki, 1);
  yield* msg(MIZUBE_ZARI.seki);
}
