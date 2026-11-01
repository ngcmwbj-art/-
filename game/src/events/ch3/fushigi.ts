// みました帳 ③ — 海ぞいの町の ふしぎ 10（60_ch3_story 8章、62 の置き場所）:
//
//   調べる（その物のいつもの文）→『みました』を 押しますか？ → 判 → 押したあとの文 →
//   「朱肉が 2 たまった。みました帳 ③に 書きこんだ。（ふしぎ n/10）」
//
// 押せるとき（fushigiActive のこの章の決まり）：01〜04・06 は正午（段階1）、05 は灯台のレンズ
// （段階1・2）、07〜09 は旧水族館（段階3）、10 は S28 の退勤の打刻のあと（段階4。決着の場面の
// 中で聞く。押し忘れたらクリア後）。物は W の地図の `fushigi:` の物で、文と動きはそれぞれの
// 台本の script。ここは、その script のあとに『みました』を足す（wrap）。
// 茶わんの山（obj_c3_chawan、62 4.3）は W の地図に無いので、ここで食堂のカウンターに足す。

import type { Co } from '../../engine/co';
import { flag, setFlag, state } from '../../game/state';
import { sfx } from '../../audio';
import { registerScript } from '../../world/api';
import { getScript } from '../../world/scripts';
import { registerFushigi, setFushigiActiveRule } from '../../world/fushigi';
import { runMsg } from '../../world/msg';
import type { MapObj } from '../../world/types';
import { FUSHIGI3, fushigiRewardCh3, CHAWAN, CHAWAN_LATER } from '../../data/text/c3_fushigi';
import { stampFushigi } from '../stamp';
import { addToMap, say3 } from './common';
import { pgBand, pgMin, pgOn } from '../../world/postgame';
import { PG_FUSHIGI3 } from '../../data/text/pg_rows';

export const FUSHIGI_CH3 = Object.keys(FUSHIGI3);

export function fushigiCh3Done(id: string): boolean {
  return flag('flag_' + id) > 0;
}

export function fushigiCh3Count(): number {
  return FUSHIGI_CH3.filter(fushigiCh3Done).length;
}

/** Stampable now (not yet stamped, in its stage). */
export function fushigiCh3Active(id: string): boolean {
  if (fushigiCh3Done(id)) return false;
  if (!flag('flag_ch3_started')) return false;
  if (pgOn()) return pgFushigiWindow(id);
  const s = flag('flag_ch3_stage');
  const n = Number(id.slice(-2));
  if (n === 10) return s >= 4 && (!!flag('flag_ch3_boss_beaten') || !!flag('flag_ch3_clear'));
  if (n >= 7) return s === 3;
  if (n === 5) return s === 1 || s === 2;
  return s === 1;
}

/**
 * クリア後の窓（05_postgame 3.5・6.4）：01 真下の影は 11:30〜12:30、02〜06 は昼、
 * 07〜09（旧水族館）は 9:00〜16:59、10 は いつでも（after.ts のエゴ）。
 */
function pgFushigiWindow(id: string): boolean {
  const n = Number(id.slice(-2));
  const m = pgMin();
  if (n === 10) return true;
  if (n === 1) return m >= 11 * 60 + 30 && m <= 12 * 60 + 30;
  if (n >= 7) return m >= 9 * 60 && m < 17 * 60;
  return pgBand() === 'hiru';
}

/** クリア後の 01・03・04 の文（窓の中の文・窓の外の文・押したとき・押したあと）。 */
function pgF3(id: string): (typeof PG_FUSHIGI3)[string] | null {
  return pgOn() ? (PG_FUSHIGI3[id] ?? null) : null;
}

function giveMp(n: number): void {
  const m = state.party.find((p) => p.id === 'minato');
  if (m) m.mp = Math.min(m.maxMp, m.mp + n);
}

/**
 * After the thing's own text: 『みました』を 押しますか？ and the stamp (if it can be pressed now).
 * Returns true when it was stamped.
 */
export function* offerFushigiCh3(id: string): Co<boolean> {
  const d = FUSHIGI3[id];
  if (!d || !flag('flag_got_hanko') || !fushigiCh3Active(id)) return false;
  const i = yield* runMsg(`@sys
『みました』を 押しますか？
? 押す | やめておく`);
  if (i !== 0) return false;
  yield* stampFushigi(id);
  setFlag('flag_' + id, 1);
  yield* runMsg(pgF3(id)?.pressed ?? d.pressed);
  giveMp(2);
  yield* runMsg(fushigiRewardCh3(fushigiCh3Count()));
  return true;
}

// the world's table (the HUD's hint, the hanko menu's list) and this chapter's rule
for (const [id, d] of Object.entries(FUSHIGI3)) registerFushigi({ id, seen: d.pressed, pressed: d.pressed, after: d.after });
setFushigiActiveRule('fushigi_ch3_', fushigiCh3Active);

/** The things that are ふしぎ (W's objects; the ids of their scripts). */
const OBJ: Record<string, string> = {
  obj_c3_kage: 'fushigi_ch3_01',
  obj_c3_chawan: 'fushigi_ch3_02',
  obj_c3_bouhatei: 'fushigi_ch3_03',
  obj_c3_kamome: 'fushigi_ch3_04',
  obj_c3_lens: 'fushigi_ch3_05',
  obj_c3_himono_dai: 'fushigi_ch3_06',
  obj_c3_denpyo_hakushi: 'fushigi_ch3_07',
  obj_c3_diorama_clock: 'fushigi_ch3_08',
  obj_c3_marine_snow: 'fushigi_ch3_09',
};

// 62 4.3: the tower of bowls on the counter in front of ゴロウ's stool (examined from beside him)
addToMap('map_c3_shokudo', [{ t: 'obj', id: 'obj_c3_chawan', x: 2, y: 4, w: 3, face: 'up', fushigi: 'fushigi_ch3_02', priority: 1 } as unknown as MapObj]);
registerScript('obj_c3_chawan', function* (): Co {
  sfx('se_examine');
  yield* say3(flag('flag_ch3_stage') >= 2 && !fushigiCh3Done('fushigi_ch3_02') ? CHAWAN_LATER : CHAWAN);
});

/**
 * Each thing's script, then the stamp. Wrapped once every scenario file has registered its
 * scripts (events/ch3/index.ts imports this last); a stamped one says its `after` text
 * every other time.
 */
export function wrapFushigiObjects(): void {
  for (const [obj, fid] of Object.entries(OBJ)) {
    const before = getScript(obj);
    registerScript(obj, function* (ctx): Co {
      // クリア後の 01・03・04（6.4）：流れる昼の文。窓の外は ふつうの景色
      const pg = pgF3(fid);
      if (pg) {
        sfx('se_examine');
        if (!fushigiCh3Active(fid) && !fushigiCh3Done(fid)) {
          yield* runMsg(pg.off);
          return;
        }
        if (fushigiCh3Done(fid)) {
          yield* runMsg(pgFushigiWindow(fid) ? pg.after : pg.off);
          return;
        }
        yield* runMsg(pg.seen);
        yield* offerFushigiCh3(fid);
        return;
      }
      if (fushigiCh3Done(fid) && flag(`flag_seen_after_${fid}`) % 2 === 0) {
        setFlag(`flag_seen_after_${fid}`, flag(`flag_seen_after_${fid}`) + 1);
        sfx('se_examine');
        yield* runMsg(FUSHIGI3[fid].after);
        return;
      }
      if (fushigiCh3Done(fid)) setFlag(`flag_seen_after_${fid}`, flag(`flag_seen_after_${fid}`) + 1);
      if (before) yield* before(ctx);
      else yield* ctx.runDefault();
      yield* offerFushigiCh3(fid);
    });
  }
}
