// クリア後（05_postgame）の物語のしくみ（E の第1期）：
//
//   - 7章 グソっ君の合流・別れ：焼きそばのたかしのグソっ君（c3_kn_shop。朝・昼・夕方は店の前、
//     夜は店の中）に「いっしょに 行く」→ 隊列へ（flag_pg_kn・flag_pg_yarinokoshi、
//     flag_follower_hidden 0）。たかしの前で隊列のグソっ君に話すと「店に もどる？」。
//     ほかの町の休める所で「グソっ君を 先に 帰す」（仮）。
//   - 8章 ツガオ便：今いる町をのぞいた2つの行き先。乗る間に時間がたつ（pgAdvance：
//     夕鳴町⇔海ぞい 60分、夕鳴町⇔星見台 90分、星見台⇔海ぞい 150分）。夕方の夕鳴町は昼寝を
//     起こす1ページ、夜の星見台にはじめて着くとペロの灯り。
//   - 3.4 待つ・寝る：休める所で「待つ」→ 帯の始まりまで（pgSkipTo）。家の2階のふとんで
//     「寝る」→ 翌朝 5:00・全回復・母の朝の1ページ。今のセーブ・回復はそのまま。
//
// どれも pgOn()（flag_ch3_clear）の中だけ。第1章〜第3章のふつうの遊びは通らない。
// 第1章・第2章・第3章の台本を包むので、events/index.ts で ./ch3 のあとに import する。
//
// QA: __game.cmd.pgE()  今の合流・時刻・帯（W の pg() と組み合わせて使う）

import type { Co } from '../engine/co';
import { flag, setFlag, state, type Dir } from '../game/state';
import { registerDebug } from '../debug';
import { despawn, registerScript } from '../world/api';
import { getScript, type ScriptCtx } from '../world/scripts';
import { hasChar } from '../art/chars/registry';
import type { MapObj } from '../world/types';
import { pgBand, pgMin, pgOn, pgAdvance, pgSkipTo, pgTownOf, type PgBand, type PgTown } from '../world/postgame';
import { fieldCurtain, notifyYarinokoshi } from '../ui/hud';
import { pgClockRun } from '../ui/pg_clock';
import { pgKizami, pgRideArrive, pgRideBoard } from '../world/pgaudio';
import { se } from './ch2/compat';
import { F } from './lib';
import { addToMap, say3 } from './ch3/common';
import { jumpMap } from './ch3/prologue';
import { deliveryOn, pgDeliveryOffer } from './ch2/tsugao';
import { pgSecretAtTruck } from './pg_secret';
import * as C4 from '../data/text/c3_story4';
import * as T from '../data/text/postgame';

const NPC = (o: Record<string, unknown>): MapObj => ({ t: 'npc', ...o }) as unknown as MapObj;
const KN_SPRITE = hasChar('npc_kanenari_cook') ? 'npc_kanenari_cook' : 'kanenari';

/** グソっ君が隊列にいる（合流中）。 */
export function pgKnWith(): boolean {
  return pgOn() && flag('flag_pg_kn') > 0;
}

function town(): PgTown {
  return pgTownOf(F().map.def);
}

// ================================================================ 7 グソっ君の合流・別れ

// 夜は店の中（仕込みのあと片づけ）：客の側の床、レジの前（7,5）
addToMap('map_maruyama', [
  NPC({
    id: 'c3_kn_shop_night', sprite: KN_SPRITE, x: 7, y: 5, dir: 'left', script: 'c3_kn_shop',
    cond: { flag: 'flag_ch3_clear', notFlag: 'flag_pg_kn', when: () => pgBand() === 'yoru' },
  }),
]);

/** 隊列に入れる／外す（flag_pg_kn と flag_follower_hidden をいっしょに）。 */
function setKn(on: boolean): void {
  setFlag('flag_pg_kn', on ? 1 : 0);
  setFlag('flag_follower_hidden', on ? 0 : 1);
  const f = F();
  f.refreshPresence();
  f.syncFollower(true);
}

/** 7.2 焼きそばのたかしのグソっ君（after.ts の〔c4〕を、クリア後はこちらで）。 */
const knShopBefore = getScript('c3_kn_shop');
registerScript('c3_kn_shop', function* (ctx: ScriptCtx): Co {
  if (!pgOn()) {
    if (knShopBefore) yield* knShopBefore(ctx);
    return;
  }
  const night = F().map.id === 'map_maruyama';
  const i = yield* say3(night ? T.PG_KN_ASK_NIGHT : T.PG_KN_ASK);
  if (i === 0) {
    se('se_fry', { vol: 0.5 });
    for (const m of state.party) {
      m.hp = m.maxHp;
      m.mp = m.maxMp;
    }
    yield* say3(C4.C4_KN_EAT);
    return;
  }
  if (i !== 1) {
    yield* say3(T.PG_KN_LATER);
    return;
  }
  const first = !flag('flag_pg_yarinokoshi');
  yield* say3(first ? T.PG_KN_JOIN_FIRST : T.PG_KN_JOIN);
  // 帽子をとって、隊列にもどる（帽子の1コマは W の絵。来るまでは入れかわるだけ）
  se('se_step', { vol: 0.5 });
  despawn(night ? 'c3_kn_shop_night' : 'c3_kn_shop');
  setKn(true);
  if (first) {
    setFlag('flag_pg_yarinokoshi', 1);
    notifyYarinokoshi();
  }
});

/** たかしの店の前（店の入口のまわり）か、店の中。 */
export function pgAtShop(): boolean {
  const f = F();
  if (f.map.id === 'map_maruyama') return true;
  if (f.map.id !== 'map_town') return false;
  const x = f.player.tileX;
  const y = f.player.tileY;
  return x >= 24 && x <= 30 && y >= 21 && y <= 25;
}

/** 7.3 店にもどす：たかしの前で、隊列のグソっ君に話す。ほかは今までの台本。 */
for (const id of ['map_town', 'map_maruyama']) {
  const before = getScript('kanenari_' + id);
  registerScript('kanenari_' + id, function* (ctx: ScriptCtx): Co {
    if (pgKnWith() && pgAtShop()) {
      const i = yield* say3(T.PG_KN_BACK_ASK);
      if (i === 0) {
        yield* say3(T.PG_KN_BACK);
        se('se_step', { vol: 0.5 });
        setKn(false);
      } else yield* say3(T.PG_KN_STAY);
      return;
    }
    if (before) yield* before(ctx);
    else yield* ctx.runDefault();
  });
}

// ================================================================ 8 ツガオ便

/** 着く所（05 8.1。夕鳴町 (43,28) 上向き、海ぞい (21,17) 左、星見台 転回場のそば）。 */
const ARRIVE: Record<PgTown, { map: string; x: number; y: number; dir: Dir }> = {
  yunari: { map: 'map_town', x: 43, y: 28, dir: 'up' }, // (43: 44 is in the truck's body — prologue.ts fitLane, F1 2026-10-14)
  umi: { map: 'map_umizoi', x: 21, y: 17, dir: 'left' },
  hoshi: { map: 'map_hoshimidai', x: 41, y: 44, dir: 'up' },
};
/** 海ぞいの町の 中の 便：岬（旧水族館の 前。2026-10-20 町の 外へ 移した）の 着く所と、かかる 分。 */
const MISAKI = 'map_c3_misaki';
const ARRIVE_MISAKI = { map: MISAKI, x: 21, y: 14, dir: 'right' as Dir }; // 軽トラ (17,13) 横向きの 前
const HOP_MIN = 15;

/** かかる時間（ゲームの分。05 8.2。仮）と、ツガオの言い方。 */
function ride(a: PgTown, b: PgTown): { min: number; say: string } {
  const k = [a, b].sort().join('-');
  if (k === 'umi-yunari') return { min: 60, say: '1時間' };
  if (k === 'hoshi-yunari') return { min: 90, say: '1時間半' };
  return { min: 150, say: '2時間半' };
}

const ORDER: PgTown[] = ['yunari', 'hoshi', 'umi'];

/** 乗る（どの町のツガオ便からも）。 */
export function* pgTruck(): Co {
  if (!pgOn()) return;
  // シークレットエンディング（05 10章）：入口が開いていれば、ツガオが先に ページを見る
  if (yield* pgSecretAtTruck()) return;
  const here = town();
  const band = pgBand();
  // 夜の星見台：配達が まだなら、先に 頼まれる（05 2.2 yr_c2_deli）
  if (here === 'hoshi' && (yield* pgDeliveryOffer())) return;
  // 配達の 途中は 乗せない（おとどけの札を 持ったまま 町へ 行かない）
  if (deliveryOn()) {
    yield* say3(T.PG_TRUCK_DELI_FIRST);
    return;
  }
  // 夕方の夕鳴町：ツガオは昼寝（はじめての1回は長く）
  if (here === 'yunari' && band === 'yu') {
    if (!flag('flag_pg_tsugao_nap')) {
      setFlag('flag_pg_tsugao_nap', 1);
      yield* say3(T.PG_TRUCK_NAP);
    } else yield* say3(T.PG_TRUCK_NAP_AGAIN);
  } else if (here === 'yunari' && !flag('flag_c3_c4_tsugao')) {
    setFlag('flag_c3_c4_tsugao', 1);
    yield* say3(C4.C4_TSUGAO);
  }
  const dests = ORDER.filter((t) => t !== here);
  // 海ぞいの町では 3つめ：港から 岬へ、岬から 港へ（町の 中の 短い 便）
  const onMisaki = F().map.id === MISAKI;
  const hop = here === 'umi' ? (onMisaki ? '港' : '岬') : undefined;
  const i = yield* say3(T.pgTruckAsk(T.PG_TOWN_NAME[dests[0]], T.PG_TOWN_NAME[dests[1]], hop));
  if (hop && i === 2) {
    yield* say3(T.pgTruckHop(hop));
    pgRideBoard();
    const from = pgMin();
    yield* fieldCurtain(1, 500);
    pgAdvance(HOP_MIN);
    const at = onMisaki ? ARRIVE.umi : ARRIVE_MISAKI;
    jumpMap(at.map, at.x, at.y, at.dir);
    F().syncFollower(true);
    yield* pgClockRun(from, pgMin(), 800, pgKizami);
    pgRideArrive();
    yield* fieldCurtain(0, 600);
    return;
  }
  if (i !== 0 && i !== 1) return;
  const to = dests[i];
  const r = ride(here, to);
  yield* say3(T.pgTruckGo(T.PG_TOWN_NAME[to], r.say));
  // 黒の中でエンジンの音と、HUD の時計の早回り（8.2。音は A の pgRideBoard / pgRideArrive）
  pgRideBoard();
  const from = pgMin();
  yield* fieldCurtain(1, 500);
  pgAdvance(r.min);
  const at = ARRIVE[to];
  jumpMap(at.map, at.x, at.y, at.dir);
  F().syncFollower(true);
  yield* pgClockRun(from, pgMin(), 1500, pgKizami);
  pgRideArrive();
  yield* fieldCurtain(0, 600);
  yield* arrived(to);
}

/** 着いたときの1ページ（夜の星見台：はじめての1回、ペロの灯り）。 */
function* arrived(to: PgTown): Co {
  if (to === 'hoshi' && pgBand() === 'yoru' && !flag('flag_pg_pero_lamp')) {
    setFlag('flag_pg_pero_lamp', 1);
    yield* say3(T.PG_PERO_LAMP);
    if (pgKnWith()) yield* say3(T.PG_PERO_LAMP_KN);
  }
}

// 夕鳴町・海ぞいの町の軽トラ（after.ts の c3_truck_c4。クリア後だけ出る）
{
  const before = getScript('c3_truck_c4');
  registerScript('c3_truck_c4', function* (ctx: ScriptCtx): Co {
    if (!pgOn()) {
      if (before) yield* before(ctx);
      return;
    }
    yield* pgTruck();
  });
}
// 星見台の転回場：ツガオ（W の配置が使う）と、止まっている軽トラ（第2章の絵）
registerScript('pg_tsugao_hoshi', function* (): Co {
  yield* pgTruck();
});
{
  const before = getScript('obj_hoshi_tsugao_truck');
  registerScript('obj_hoshi_tsugao_truck', function* (ctx: ScriptCtx): Co {
    if (pgOn()) {
      yield* pgTruck();
      return;
    }
    if (before) yield* before(ctx);
    else yield* ctx.runDefault();
  });
}

// ================================================================ 3.4 待つ・寝る

const WAIT_BANDS: PgBand[] = ['asa', 'hiru', 'yu', 'yoru'];

/** 「待つ」：選んだ時間帯の始まりまで（暗くなって、HUD の時計が早回り 1.5秒）。 */
function* waitMenu(): Co<boolean> {
  if (deliveryOn()) {
    yield* say3(T.PG_WAIT_DELI);
    return false;
  }
  const i = yield* say3(T.PG_WAIT_ASK);
  const b = WAIT_BANDS[i];
  if (!b) return false;
  const from = pgMin();
  yield* fieldCurtain(1, 500);
  pgSkipTo(b);
  yield* pgClockRun(from, pgMin(), 1500, pgKizami);
  yield* fieldCurtain(0, 500);
  return true;
}

/** 休める所（セーブの所）：クリア後は「セーブ｜待つ｜（先に 帰す）｜やめておく」。 */
function wrapRest(id: string, save: boolean): void {
  const before = getScript(id);
  registerScript(id, function* (ctx: ScriptCtx): Co {
    const run = function* (): Co {
      if (before) yield* before(ctx);
      else yield* ctx.runDefault();
    };
    if (!pgOn()) {
      yield* run();
      return;
    }
    if (!save) {
      // セーブの無い休める所（公園のベンチ）：いつもの文のあとに
      yield* run();
      const i = yield* say3(T.PG_REST_ASK_BENCH);
      if (i === 0) yield* waitMenu();
      return;
    }
    se('se_examine');
    const send = pgKnWith() && town() !== 'yunari';
    const i = yield* say3(send ? T.PG_REST_ASK_KN : T.PG_REST_ASK);
    if (i === 0) yield* run();
    else if (i === 1) yield* waitMenu();
    else if (send && i === 2) {
      yield* say3(T.PG_KN_SEND);
      setKn(false);
    }
  });
}

// 夕鳴町：お地蔵さん（セーブ）・公園のベンチ。星見台：道祖神・回覧板・星見の丘のベンチ。海ぞい：港のポスト
for (const id of ['evt_save_jizo', 'evt_ch2_save_dosojin', 'obj_hoshi_dosojin', 'evt_ch2_save_kairan', 'obj_hoshi_kairan', 'evt_ch2_save_bench', 'obj_hoshi_hill_bench', 'obj_c3_post', 'evt_ch3_save_post'])
  wrapRest(id, true);
wrapRest('obj_park_bench', false);

/** 家の2階のふとん：「寝る」→ 翌朝 5:00、HP・朱肉 全回復、母の朝の1ページ。 */
{
  const before = getScript('obj_bed');
  registerScript('obj_bed', function* (ctx: ScriptCtx): Co {
    if (!pgOn()) {
      if (before) yield* before(ctx);
      else yield* ctx.runDefault();
      return;
    }
    se('se_examine');
    const i = yield* say3(T.PG_BED_ASK);
    if (i !== 0) return;
    const from = pgMin();
    yield* fieldCurtain(1, 700);
    yield* say3(T.PG_BED_SLEEP);
    pgSkipTo('asa');
    yield* pgClockRun(from, pgMin(), 1500, pgKizami);
    for (const m of state.party) {
      m.hp = m.maxHp;
      m.mp = m.maxMp;
      m.status = {};
    }
    se('se_heal');
    yield* fieldCurtain(0, 700);
    yield* say3(T.PG_BED_HEAL);
    const n = flag('flag_pg_mom_asa');
    setFlag('flag_pg_mom_asa', n + 1);
    yield* say3(T.PG_MOM_MORNING[n % T.PG_MOM_MORNING.length]);
  });
}

// ================================================================ QA

if (import.meta.env.DEV)
  registerDebug('pgE', () => ({
    on: pgOn(),
    min: pgMin(),
    band: pgBand(),
    kn: flag('flag_pg_kn'),
    hidden: flag('flag_follower_hidden'),
    yarinokoshi: flag('flag_pg_yarinokoshi'),
    town: F() ? town() : null,
  }));
