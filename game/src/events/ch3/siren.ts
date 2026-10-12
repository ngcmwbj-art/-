// S12 ナリオサメ・S13 ごちそうさま・S14 案A「いつもの 軽トラ」
// （60_ch3_story 10.12〜10.14、61 11、62 4.4・3.4・1.4・1.6、63 12.10〜12.12）:
//
//   S12 サイレン塔（map_c3_siren）：入るとミナト（evt_ch3_siren）→ 見晴らし台の
//       サイレンの前（trig_ch3_siren_top）でナリオサメ・テル → 戦闘（最終局面と
//       鳴りきり・12:01 は戦闘の中、61 11.8）→ 勝ったら flag_ch3_nariosame_beaten、
//       flag_ch3_stage=2、flag_ch3_clock=1 → evt_ch3_nariosame_end（見晴らし台）。
//   S13 町じゅうの「ごちそうさま」→ ハンコ（flag_ch3_got_gochisou）→ 防波堤の ござで
//       「いただきます！」→ 操作がもどる（グソっ君「……港、なんか 来とる。」）。
//   S14 港の軽トラのまわり（trig_ch3_truck_trap）→「やり残し ないか？」→ ツガオ便
//       「送ってくぞ！」→ 黒い回覧板 → ポコシャが あおりを閉める → 荷台（map_c3_nidai、
//       景色2）→ 町はずれの旧水族館の前に着く（flag_ch3_truck_trap）。第2期はここまで：
//       入口のガラス戸の前に立って、いつもの〔休館〕の文（S15 は第3期）。

import type { Co } from '../../engine/co';
import { game, type Scene } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { flag, removeItem, setFlag, state, type Dir } from '../../game/state';
import { chorusBlips, playAmbient, playBgm, stopAmbient, stopBgm, waitBar } from '../../audio';
import { startUgokidasu } from '../../world/c3sea';
import { SPEAKERS } from '../../world/msg';
import { KITA } from './azemichi';
import { despawn, registerScript, setFollowerVisible, spawn, walk } from '../../world/api';
import { getScript } from '../../world/scripts';
import { hasMap } from '../../world/maps';
import type { MapObj } from '../../world/types';
import type { Actor } from '../../world/actor';
import { getEnemy, syncProgressSkills } from '../../data/battle';
import { showBubble } from '../../ui/bubble';
import { setClockText, showClock } from '../../ui/hud';
import * as T from '../../data/text/c3_story2';
import { C3_OBJ } from '../../data/text/c3_events';
import { F, grace, panBack, panTo, stepBack } from '../lib';
import { ambEvent, hankoLearn, musicParam, se } from '../ch2/compat';
import { addToMap, c3Battle, inCh3, kita, say3 } from './common';
import { jumpMap, spawnTruck } from './prologue';

/** A dark page under everything (a room that isn't there yet). */
class DarkPage implements Scene {
  transparent = false;
  update(): void {}
  draw(g: Gfx): void {
    g.clear('#0B0B14');
  }
}

const ready = (): boolean => inCh3() && !!flag('flag_ch3_got_itadakimasu') && !flag('flag_ch3_nariosame_beaten');

// ---------------------------------------------------------------- places (62 4.4・1.6)

addToMap('map_c3_siren', [{ t: 'trig', id: 'trig_ch3_siren_top', x: 5, y: 2, w: 4, h: 3, script: 'trig_ch3_siren_top', cond: { notFlag: 'flag_ch3_nariosame_beaten' } } as unknown as MapObj], ['evt_ch3_siren']);
addToMap('map_umizoi', [
  // (no tower room yet: the iron door itself)
  { t: 'trig', id: 'trig_ch3_siren_door', x: 34, y: 7, w: 1, h: 1, on: 'bump', script: 'trig_ch3_siren_door', cond: { when: () => ready() && !hasMap('map_c3_siren') } } as unknown as MapObj,
  // S14: round ツガオ便 on the quay (62 1.6)
  { t: 'trig', id: 'trig_ch3_truck_trap', x: 42, y: 24, w: 10, h: 3, script: 'trig_ch3_truck_trap', cond: { flag: 'flag_ch3_got_gochisou', notFlag: 'flag_ch3_truck_trap' } } as unknown as MapObj,
]);

// ---------------------------------------------------------------- S12 evt_ch3_siren

/** ミナト at the button (the room): 〔来たか〕. */
export function* evtSiren(): Co {
  if (!ready() || flag('flag_ch3_siren_talk')) return;
  setFlag('flag_ch3_siren_talk', 1);
  yield 300;
  playAmbient('amb_c3_siren_room', { fade: 0.6 });
  yield* say3(T.S12_A);
  if (state.inventory.includes('item_c3_megane')) {
    yield* say3(T.S12_MEGANE);
    removeItem('item_c3_megane');
    setFlag('flag_ch3_megane_back', 1);
  }
  yield* say3(T.S12_GO_UP);
}
registerScript('evt_ch3_siren', evtSiren);
registerScript('npc_c3_sirenban', function* (): Co {
  if (!inCh3()) return;
  if (flag('flag_ch3_nariosame_beaten')) {
    yield* say3(T.C2_TALK.npc_c3_sirenban);
    return;
  }
  if (F().map.id === 'map_c3_siren') {
    if (!flag('flag_ch3_siren_talk')) yield* evtSiren();
    else yield* say3(T.S12_GO_UP);
    return;
  }
  // (outside, before S11: the paper on the door speaks — 60 3.2)
  yield* say3(C3_OBJ.obj_c3_siren_zaishitsu.text);
});

/** The siren on the lookout: ナリオサメ, テル, the battle, the end. */
export function* sirenTop(): Co {
  if (!ready()) return;
  if (!flag('flag_ch3_siren_talk')) yield* evtSiren();
  const f = F();
  f.player.dir = 'up';
  ambEvent('amb_c3_siren_room', 'unari');
  yield 500;
  if (!flag('flag_ch3_siren_told')) {
    yield* say3(T.S12_B);
    if (kita('npc_tokio')) yield* say3(T.S12_TOKIO);
    setFlag('flag_ch3_siren_told', 1);
  } else yield* say3(T.S12_RETRY);
  if (getEnemy('enemy_nariosame') && !(import.meta.env.DEV && flag('flag_qa_c3_nobattle'))) {
    if ((yield* c3Battle({ enemies: ['enemy_nariosame'], music: 'bgm_boss_nariosame', background: 'bg_c3_siren' })) === 'load') return;
  } else {
    // (the battle isn't there yet: the siren sounds out here — QA goes on)
    se('se_c3_siren_btn');
    yield 1000;
    se('se_c3_siren_full');
    yield 3000;
    se('se_c3_clock_1201');
  }
  stopAmbient('amb_c3_siren_hold', 0.5);
  setFlag('flag_ch3_nariosame_beaten', 1);
  setFlag('flag_ch3_stage', 2);
  setFlag('flag_ch3_clock', 1);
  musicParam('c3_noon', 1);
  grace();
  yield* nariosameEnd();
}
registerScript('trig_ch3_siren_top', function* (): Co {
  yield* sirenTop();
});

/** (no tower room yet) The door at the foot: up over a dark page. */
registerScript('trig_ch3_siren_door', function* (): Co {
  if (!ready() || F().player.dir !== 'up') return;
  se('se_door_heavy');
  yield* game.fadeOut(400, '#0B0B14');
  const page = new DarkPage();
  game.push(page);
  yield* game.fadeIn(300);
  yield* evtSiren();
  yield* sirenTop();
  if (game.top === page) game.pop();
});

/** 〔evt_ch3_nariosame_end〕 on the lookout: the town at 12:01 — then S13. */
function* nariosameEnd(): Co {
  showClock(5000);
  ambEvent('amb_c3_umi', 'wave_on', 3);
  yield 600;
  yield* say3(T.S12_END);
  yield 500;
  yield* gochisouTown();
}
registerScript('evt_ch3_nariosame_end', function* (): Co {
  if (flag('flag_ch3_nariosame_beaten') && !flag('flag_ch3_got_gochisou')) yield* nariosameEnd();
});

// ---------------------------------------------------------------- S13

/** The ござ on the breakwater (62 3.4・5.4): the town's people in the back row y31, しゅん's in front y32. */
const GOZA: [string, number, number][] = [
  ['npc_c3_toudai', 22, 31],
  ['npc_c3_shokudo', 23, 31],
  ['npc_c3_jouren', 24, 31],
  ['npc_c3_seri', 25, 31],
  ['npc_c3_seri_deshi', 26, 31],
  ['npc_c3_sirenban', 27, 31],
  ['npc_c3_mago', 34, 31],
  ['npc_c3_kanshiin', 35, 31],
  ['npc_c3_himono_otto', 37, 31],
  ['npc_c3_himono_tsuma', 38, 31],
  ['npc_c3_uketsuke', 39, 31],
  ['npc_c3_kid_a', 33, 32],
  ['npc_c3_kid_b', 34, 32],
  ['npc_c3_kid_c', 35, 32],
];
const GOZA_SHUN = { x: 30, y: 32 };

/** The voices of the whole town for 「ごちそうさま」 and 「いただきます」 (and the people who came; 12 at most is the audio's job). */
function townVoices(): string[] {
  const v = ['c3_shokudo', 'c3_jouren', 'c3_seri', 'c3_seri_deshi', 'c3_sirenban', 'c3_toudai', 'c3_mago', 'c3_kanshiin', 'c3_himono_otto', 'c3_himono_tsuma', 'c3_tsuri', 'c3_kid'];
  for (const k of KITA) if (kita(k.id) && SPEAKERS[k.id]?.voice) v.push(SPEAKERS[k.id].voice!);
  return v;
}

export function* gochisouTown(): Co {
  if (flag('flag_ch3_got_gochisou')) return;
  const f = F();
  yield* game.fadeOut(600, '#FFF6D8');
  if (game.top instanceof DarkPage) game.pop();
  const onUmi = hasMap('map_umizoi');
  if (onUmi) {
    setFollowerVisible(true);
    // (the tower's plaza first: the mats on the breakwater come out with 「ござ 出して！」)
    jumpMap('map_umizoi', 34, 8, 'down');
    playBgm('bgm_umi_noon', { fade: 0.6, variant: 'outdoor' });
    playAmbient('amb_c3_umi', { fade: 0.6 });
  }
  yield 200;
  // 12:01 spreads from the tower over the town (W: the ring, the grade 12:00 → 12:01)
  if (onUmi) startUgokidasu(f);
  yield* game.fadeIn(800);
  // the camera round the town: 市場 → 食堂 → 干物屋 → 海の家 (1.2 s each)
  if (onUmi) {
    for (const [x, y] of [
      [10, 24],
      [30, 16],
      [18, 14],
      [59, 22],
    ] as [number, number][]) {
      yield* panTo(x, y, 500);
      yield 700;
    }
  }
  void chorusBlips(townVoices(), 'gochisousama');
  yield* say3(T.S13_A);
  setFlag('flag_ch3_got_gochisou', 1);
  syncProgressSkills();
  se('se_c3_hanko_float', { level: 9 });
  const shown = yield* hankoLearn('skill_gochisousama');
  if (!shown) yield* say3(T.S13_GOT);
  yield* say3(T.S13_B);
  // the breakwater: everyone on the mats
  yield* game.fadeOut(500, '#FFF6D8');
  const moved: [Actor, number, number, Dir][] = [];
  const staged: string[] = [];
  if (onUmi) {
    yield* panBack(1);
    f.player.x = GOZA_SHUN.x * 16 + 8;
    f.player.y = GOZA_SHUN.y * 16 + 16;
    f.player.dir = 'down';
    for (const [id, x, y] of GOZA) {
      let a = f.actorById(id);
      if (a) {
        moved.push([a, a.x, a.y, a.dir]);
        a.data.scripted = true;
      } else {
        a = spawn(`c3_goza_${id}`, x, y, { sprite: id, dir: 'down', ghost: true });
        a.data.scripted = true;
        staged.push(a.id);
      }
      a.x = x * 16 + 8;
      a.y = y * 16 + 16;
      a.dir = 'down';
      a.visible = true;
    }
  }
  se('se_c3_goza');
  playBgm('bgm_hirugohan', { fade: 2.0, variant: 'minna' });
  yield 300;
  yield* game.fadeIn(700);
  yield 600;
  yield* say3(T.S13_C.split('\n@sys')[0]);
  // 「いただきます！」 on the bar H5 of the lunch song (63 12.11)
  let bar = false;
  waitBar('H5', 8).then(() => (bar = true), () => (bar = true));
  const t0 = performance.now();
  yield () => bar || performance.now() - t0 > 8000;
  void chorusBlips(townVoices(), 'itadakimasu');
  se('se_c3_gassho', { count: 12 });
  yield* say3('@sys' + T.S13_C.split('\n@sys')[1]);
  yield 500;
  yield* say3(T.S13_D);
  // the town goes back to its places (W's stage 2); しゅん is free on the breakwater
  for (const [a, x, y, d] of moved) {
    a.x = x;
    a.y = y;
    a.dir = d;
    delete a.data.scripted;
  }
  for (const id of staged) despawn(id);
  yield 600;
  showBubble('kanenari', T.S13_BUBBLE, 2600);
}

// ---------------------------------------------------------------- S14 evt_ch3_truck_trap

registerScript('trig_ch3_truck_trap', function* (): Co {
  if (!flag('flag_ch3_got_gochisou') || flag('flag_ch3_truck_trap')) return;
  const i = yield* say3(T.S14_CONFIRM);
  if (i !== 0) {
    stepBack();
    return;
  }
  yield* truckTrap();
});
registerScript('evt_ch3_truck_trap', function* (): Co {
  if (flag('flag_ch3_got_gochisou') && !flag('flag_ch3_truck_trap')) yield* truckTrap();
});

/** The truck's bed is at its east end (parked facing west, 62 3.1): しゅん stands behind it. */
const BED = { x: 49, y: 25 };

export function* truckTrap(): Co {
  const f = F();
  stopBgm(2.0);
  // ツガオ便 comes round and stops: the parked truck has ツガオ at the wheel now (表の顔)
  se('se_keitora_go', { vol: 0.6 });
  yield 900;
  se('se_keitora_stop');
  let t = f.actorById('c3_truck_quay');
  if (t) t.data.vehicle = 'tsugao_truck';
  else t = spawnTruck('c3_truck_trap', 47, 25, 'left');
  yield 400;
  const p = f.player;
  if (p.tileX !== BED.x || p.tileY !== BED.y + 1) yield* walk('player', [[p.tileX, BED.y + 1], [BED.x, BED.y + 1]], { speed: 4 });
  p.dir = 'left';
  yield* say3(T.S14_A);
  // the basket on the bed: the black 回覧板
  musicParam('c3_wana', 1);
  p.dir = 'up';
  se('se_examine', { vol: 0.5 });
  yield 300;
  yield* say3(T.S14_KAIRAN);
  // グソっ君 stops dead (0.8 s); no reason given
  const kn = f.actorById('kanenari');
  if (kn) kn.data.scripted = true;
  yield 800;
  yield* say3(T.S14_KN_STOP);
  // ポコシャ behind them, closing the tailgate
  const po = spawn('c3_trap_pokosha', BED.x + 1, BED.y + 1, { sprite: 'npc_pokosha', dir: 'left', ghost: true });
  po.data.scripted = true;
  yield 400;
  yield* say3(T.S14_POKOSHA);
  se('se_truck_aori');
  musicParam('c3_wana', 2);
  stopBgm(0.3);
  ambEvent('amb_c3_keitora', 'hako');
  yield 300;
  yield* game.fadeOut(600, '#0B0B14');
  despawn('c3_trap_pokosha');
  if (kn) delete kn.data.scripted;
  setFlag('flag_ch3_truck_trap', 1);
  // ◆ the bed: 港 → 町はずれの坂 → 岬の上の古い建物
  se('se_keitora_go');
  let page: DarkPage | null = null;
  if (hasMap('map_c3_nidai')) {
    jumpMap('map_c3_nidai', 4, 3, 'right');
    setFollowerVisible(false);
    const k = spawn('c3_trap_kn', 5, 3, { sprite: 'kanenari', dir: 'right', ghost: true });
    k.data.scripted = true;
  } else {
    page = new DarkPage();
    game.push(page);
  }
  setFlag('flag_c3_nidai_view', 2);
  // (the song stopped when the tailgate shut: only the engine, in the box)
  playAmbient('amb_c3_keitora', { fade: 0.4 });
  ambEvent('amb_c3_keitora', 'hako');
  yield 300;
  yield* game.fadeIn(700);
  yield 3500;
  yield* say3(T.S14_KN_OYA);
  // no answer: 1 s of nothing (the cap off onto the passenger seat — only a hand)
  yield 3000;
  yield* game.fadeOut(700, '#0B0B14');
  if (page && game.top === page) game.pop();
  despawn('c3_trap_kn');
  yield* arriveAq();
}

/** At the old aquarium on the cape: the engine stops, M7 once. The second part ends here. */
function* arriveAq(): Co {
  const f = F();
  stopBgm(0.3);
  if (hasMap('map_umizoi')) {
    jumpMap('map_umizoi', 73, 30, 'up');
    setFollowerVisible(true);
  }
  se('se_keitora_stop');
  yield 500;
  // ツガオの動機 M7, four notes, once (63 12.12)
  se('se_c3_wana_m7');
  stopAmbient('amb_c3_keitora', 0.4);
  musicParam('c3_wana', 0);
  yield 400;
  yield* game.fadeIn(900);
  f.player.dir = 'up';
  setClockText(null);
}

// the truck stays parked before the aquarium (S15 is the third part's)
addToMap('map_umizoi', [
  {
    t: 'npc', id: 'c3_truck_aq', sprite: 'npc_tsugao', vehicle: 'tsugao_truck_empty', x: 70, y: 31, dir: 'up', noTurn: true,
    cond: { flag: 'flag_ch3_truck_trap', notFlag: 'flag_ch3_aq_enter' },
  } as unknown as MapObj,
]);
registerScript('c3_truck_aq', function* (): Co {
  se('se_examine', { vol: 0.5 });
  yield* say3(T.TRUCK_AQ);
});

// the tower room's things (W's ids)
for (const id of ['obj_c3_siren_ban', 'obj_c3_siren_kikai', 'obj_c3_nariosame']) {
  const o = T.C3_OBJ2[id];
  registerScript(id, function* (): Co {
    se('se_examine');
    yield* say3(o.after && flag('flag_ch3_nariosame_beaten') ? o.after : o.text);
  });
}

// the children at 12:01 (〔c2〕): the whole exchange (E)
for (const id of ['npc_c3_kid_a', 'npc_c3_kid_b', 'npc_c3_kid_c']) {
  const before = getScript(id);
  registerScript(id, function* (ctx): Co {
    if (inCh3() && flag('flag_ch3_stage') >= 2) {
      yield* say3(T.C2_TALK.npc_c3_kid);
      return;
    }
    if (before) yield* before(ctx);
  });
}
