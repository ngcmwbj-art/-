// 焼きそばのたかし (5.4, 6.2) and 駄菓子 ひのや (5.5, 6.3, 12.1). The first
// visit to たかし ends with last night's leftover for グソっ君 (★2026-09-29,
// 04_gusokkun_plan 2章 1: item_urenokori, flag_got_urenokori).

import type { Co } from '../engine/co';
import { flag, setFlag, state } from '../game/state';
import { actor, face, msg, registerScript, setClock, stage } from '../world/api';
import { pickTalk } from '../world/interact';
import { openShop } from '../ui/api';
import { sfx } from '../audio';
import * as T from '../data/text/events';
import { NPC } from '../data/text/npcs';
import { F, getKeyItem, onMap, stageKeys } from './lib';
import { sparkle } from './fx';
import { talkZoom, zoomOut } from './stage';

/** 4.1: the first shop visited moves the clock 16:55 → 16:58. */
function firstShopClock(): void {
  if (!flag('flag_met_maruyama') && !flag('flag_met_obaa') && flag('flag_clock') < 2) setClock(2);
}

// ---------------------------------------------------------------- 5.4 evt_maruyama_first

function* maruyamaFirst(): Co {
  if (flag('flag_met_maruyama')) return;
  const f = F();
  const m = actor('npc_maruyama');
  f.player.dir = 'up';
  yield 250;
  if (m) {
    // arms folded behind the teppan counter; he looks up
    m.data.scripted = true;
    m.pose = null;
    m.lift = 90;
    face('npc_maruyama', 'player');
  }
  // close on the two across the counter (2×) for the first talk
  const z = yield* talkZoom(f.player, m);
  yield* msg(T.MARUYAMA_FIRST_A);
  // a glance at the griddle; the iron catches the light once
  if (m) {
    m.pose = 'peek';
    yield 350;
    // (on a spatula's blade laid on the griddle, to his right)
    sparkle(4 * 16 + 12, 3 * 16 + 12, 520);
    sfx('se_glint', { vol: 0.5 });
    yield 650;
    m.pose = null;
    face('npc_maruyama', 'player');
    yield 150;
  }
  yield* giveUrenokori(T.MARUYAMA_URENOKORI);
  yield* msg(T.MARUYAMA_FIRST_B);
  yield* zoomOut(z, 300);
  firstShopClock();
  setFlag('flag_met_maruyama', 1);
  if (m) delete m.data.scripted;
}
registerScript('evt_maruyama_first', maruyamaFirst);

/**
 * Last night's leftover: he reaches under the counter and sets a cold pack
 * in front of しゅん (「ゆうべの 売れ残りだ。……腹 へってる やつに でも
 * やってくれ。」). Once.
 */
function* giveUrenokori(text: string): Co {
  if (flag('flag_got_urenokori')) return;
  const m = actor('npc_maruyama');
  if (m) {
    m.pose = null;
    face('npc_maruyama', 'player');
    m.hop(1, 140);
  }
  yield* msg(text);
  sfx('se_paper_bag');
  setFlag('flag_got_urenokori', 1);
  yield* getKeyItem('item_urenokori', T.MARUYAMA_URENOKORI_GET);
}

/** グソっ君 not met yet and no leftover (the insurance 17:00 came before this shop): he gives it now. */
function needsUrenokori(): boolean {
  return stage() === 1 && !flag('flag_got_urenokori') && !flag('flag_kanenari_joined');
}

registerScript('npc_maruyama', function* (): Co {
  const s = stage();
  if (s === 0 && !flag('flag_met_maruyama')) {
    yield* maruyamaFirst();
    return;
  }
  if (s >= 3) return;
  if (needsUrenokori()) {
    firstShopClock();
    setFlag('flag_met_maruyama', 1);
    yield* giveUrenokori(T.MARUYAMA_URENOKORI_LATE);
    return;
  }
  const m = actor('npc_maruyama');
  if (m) m.pose = null;
  const t = stageKeys(NPC.npc_maruyama);
  const key = pickTalk('npc_maruyama', t);
  if (key) yield* msg(t[key]);
});

// ---------------------------------------------------------------- 5.5 evt_obaa_first / 12.1 the shop

function* shop(): Co {
  const before = state.money;
  yield* openShop('shop_hinoya');
  if (state.money < before) setFlag('flag_bought', 1);
}

function* obaaFirst(): Co {
  if (flag('flag_met_obaa')) return;
  const f = F();
  const o = actor('npc_obaa');
  f.player.dir = 'up';
  // she is breathing on her marking stamp (はーっ)
  if (o) {
    o.data.scripted = true;
    o.pose = 'breathe';
  }
  yield 700;
  if (o) {
    o.pose = null;
    o.lift = 90;
    face('npc_obaa', 'player');
  }
  // close on the two across the counter (2×) for the first talk
  const z = yield* talkZoom(f.player, o);
  yield* msg(T.OBAA_FIRST);
  if (!flag('flag_met_maruyama')) yield* msg(T.OBAA_FIRST_NOMEAT);
  yield* zoomOut(z, 300);
  firstShopClock();
  setFlag('flag_met_obaa', 1);
  if (o) delete o.data.scripted;
  yield* shop();
}
registerScript('evt_obaa_first', obaaFirst);

/**
 * おばあ: in ひのや her line of the stage, then the shop every time. On the
 * street (evt_hanko_given → evt_obaa_park_hint) she waits at the storefront.
 */
registerScript('npc_obaa', function* (): Co {
  const s = stage();
  const t = NPC.npc_obaa;
  if (onMap('map_town')) {
    yield* msg(t.wait);
    return;
  }
  if (s === 0 && !flag('flag_met_obaa')) {
    yield* obaaFirst();
    return;
  }
  if (s >= 3) return;
  const o = actor('npc_obaa');
  if (o) o.pose = null;
  if (s === 0) yield* msg(t.s0_1);
  else if (s === 1 && flag('flag_got_hanko') && !flag('flag_park_hint')) yield* msg(t.wait);
  else if (s === 1) {
    const key = pickTalk('npc_obaa', { s1_1: t.s1_1, s1_2: t.s1_2 });
    if (key) yield* msg(key === 's1_1' ? t.s1_1 : t.s1_2);
  } else {
    const key = pickTalk('npc_obaa', { s2_1: t.s2_1, s2_2: t.s2_2, s2_3: t.s2_3 });
    if (key === 's2_2' && !flag('flag_kanenari_joined')) yield* msg(t.s2_3);
    else if (key) yield* msg(t[key]);
  }
  yield* shop();
});

