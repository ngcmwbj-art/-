// S08 ② 食堂かもめ「おかわりの まま」と S11 いただきます（60_ch3_story 10.8・10.11、
// 62 4.3、63 12.6・12.9、61 10 オカワリナベ・6.1）:
//
//   ナミエ〔c1_1〕・ゴロウ〔c1_1〕→ ゴロウ〔c1_2〕の本音（flag_ch3_goro_honne）→
//   ナミエ evt_ch3_shokudo（最後の日替わり定食。flag_ch3_shokudo_start）→ 品を集める
//   （魚＝①の決着、干物＝干物屋の言い合いを「どっちも ほどよい」で止める、豆腐・
//   トマト・コーヒー＝来た人。最低2品。flag_ch3_teishoku_<id>, _n）→ ナミエに話すと
//   evt_ch3_okawari：盛りつけ（3問）→ オカワリナベ → ゴロウの「……ごちそうさま。」
//   （flag_ch3_shokudo_done, flag_ch3_part_gassho）。
//   S11: 3つの部品がそろって食堂に入ると evt_ch3_itadakimasu（flag_ch3_got_itadakimasu）。

import type { Co } from '../../engine/co';
import { flag, setFlag, removeItem, state } from '../../game/state';
import { playBgm, stopBgm } from '../../audio';
import { registerScript } from '../../world/api';
import { syncProgressSkills } from '../../data/battle';
import * as T from '../../data/text/c3_story2';
import { C3_TALK } from '../../data/text/c3_events';
import { grace } from '../lib';
import { hankoLearn, musicParam, se } from '../ch2/compat';
import { addToMap, c3Battle, c3Stage, inCh3, kitaSay, partsDone, pickC3, say3 } from './common';
import { talkC3 } from './umizoi';
import { addDish } from './azemichi';

const dishes = (): number => flag('flag_ch3_teishoku_n');

/**
 * fix1016 H3: the people who came lend a hand in here only once they are in the room — in at the door
 * (7–8,7), up beside the counter, the line, and back out to their place (all four stand in the market: azemichi.ts KITA).
 */
const SHOKUDO = 'map_c3_shokudo';
const IN_L: [number, number][] = [[7, 7], [7, 6], [6, 6]];
const IN_R: [number, number][] = [[8, 7], [8, 6], [5, 6]];

// ---------------------------------------------------------------- ナミエ

function* talkNamie(): Co {
  if (flag('flag_ch3_shokudo_done')) {
    // 看板の『か』 from the harbour floor (9.4)
    if (state.inventory.includes('item_c3_kanban_ka')) {
      yield* say3(T.RETURN_KA);
      removeItem('item_c3_kanban_ka');
      setFlag('flag_ch3_kanban_ka', 1);
      return;
    }
    yield* say3(T.C2_TALK.npc_c3_shokudo);
    return;
  }
  if (!flag('flag_ch3_shokudo_start')) {
    if (!flag('flag_seen_npc_c3_shokudo_c1_1') || !flag('flag_ch3_goro_honne')) {
      yield* talkC3('npc_c3_shokudo');
      return;
    }
    yield* evtShokudo();
    return;
  }
  // the fish of ① comes as the first dish
  if (flag('flag_ch3_ichiba_done') && !flag('flag_ch3_teishoku_sakana')) {
    yield* say3(T.TEISHOKU.sakana.nami);
    yield* addDish('sakana');
  }
  if (dishes() >= 2) {
    yield* evtOkawari();
    return;
  }
  yield* say3(dishes() === 0 && !flag('flag_ch3_ichiba_done') ? T.S08_MORE_SAKANA : T.S08_MORE);
}

/** evt_ch3_shokudo: after ゴロウ's true reason, ナミエ (10.8). */
export function* evtShokudo(): Co {
  if (flag('flag_ch3_shokudo_start')) return;
  yield* say3(T.S08_START_A);
  yield* kitaSay('npc_obaa', T.S08_OBAA, SHOKUDO, IN_L);
  yield* say3(T.S08_START_B);
  setFlag('flag_ch3_shokudo_start', 1);
  // what's already at hand: the fish of ①, the ほどよい 干物
  if (flag('flag_ch3_ichiba_done')) {
    yield* say3(T.TEISHOKU.sakana.nami);
    yield* addDish('sakana');
  }
}

registerScript('npc_c3_shokudo', function* (): Co {
  if (!inCh3()) return;
  yield* talkNamie();
});
registerScript('evt_ch3_shokudo', evtShokudo);

// ---------------------------------------------------------------- ゴロウ

registerScript('npc_c3_jouren', function* (): Co {
  if (!inCh3()) return;
  if (flag('flag_ch3_shokudo_done')) {
    yield* say3(T.C2_TALK.npc_c3_jouren);
    return;
  }
  const t = C3_TALK.npc_c3_jouren;
  if (!flag('flag_seen_npc_c3_jouren_c1_1')) {
    pickC3('npc_c3_jouren', t, 1);
    yield* say3(t.c1_1, 'npc_c3_jouren');
    // ナミエ already said 「40杯目よ」: his reason comes at once
    if (!flag('flag_talked_npc_c3_shokudo')) return;
  }
  pickC3('npc_c3_jouren', t, 1);
  yield* say3(t.c1_2, 'npc_c3_jouren');
  setFlag('flag_ch3_goro_honne', 1);
});

// ---------------------------------------------------------------- 干物屋（S08 の材料）

function* talkHimono(id: string): Co {
  if (c3Stage() >= 2) {
    yield* say3(T.C2_TALK.npc_c3_himono);
    return;
  }
  if (flag('flag_ch3_himono_hodo')) {
    yield* say3(T.HIMONO_AFTER);
    return;
  }
  if (flag('flag_ch3_shokudo_start') && !flag('flag_ch3_shokudo_done')) {
    const i = yield* say3(T.HIMONO_ASK);
    if (i === 0) {
      yield* say3(T.HIMONO_OK);
      setFlag('flag_ch3_himono_hodo', 1);
      yield* addDish('himono');
    } else yield* say3(T.HIMONO_NG);
    return;
  }
  yield* talkC3(id);
}
for (const id of ['npc_c3_himono_otto', 'npc_c3_himono_tsuma'])
  registerScript(id, function* (): Co {
    if (!inCh3()) return;
    yield* talkHimono(id);
  });

// ---------------------------------------------------------------- evt_ch3_okawari

export function* evtOkawari(): Co {
  if (flag('flag_ch3_shokudo_done')) return;
  if (!flag('flag_ch3_mori_done')) {
    yield* kitaSay('npc_hoshi_sawako', T.S08_SAWAKO, SHOKUDO, IN_L);
    yield* kitaSay('npc_fudeno', T.S08_FUDENO, SHOKUDO, IN_R);
    yield* say3(T.MORI_INTRO);
    for (const step of T.MORI_STEPS) {
      const i = yield* say3(step.ask);
      se('se_c3_teishoku', { vol: 0.6 });
      yield* say3(i === step.ok ? T.MORI_OK : T.MORI_NG);
    }
    yield* say3(T.MORI_DONE);
    setFlag('flag_ch3_mori_done', 1);
  }
  // the big pot's lid rattles: オカワリナベ
  se('se_c3_futa');
  yield 400;
  yield* say3(T.S08_NABE);
  if ((yield* c3Battle({ enemies: ['enemy_okawarinabe'], music: 'bgm_midboss', background: 'bg_c3_shokudo' })) === 'load') return;
  setFlag('flag_ch3_okawari_beaten', 1);
  grace();
  yield* gochisou();
}

/** 〔オカワリナベのあと〕ゴロウの「ごちそうさま」— the siren doesn't sound (63 12.6). */
function* gochisou(): Co {
  stopBgm(1.0);
  yield 1000;
  yield 1000;
  yield* say3(T.S08_GOCHISOU_A);
  se('se_c3_gochisou');
  yield 600;
  yield* say3(T.S08_GOCHISOU_B);
  se('se_c3_gassho', { count: 1 });
  yield 500;
  yield* say3(T.S08_GOCHISOU_C);
  playBgm('bgm_umi_noon', { fade: 2.0, variant: 'shokudo' });
  yield* kitaSay('npc_master', T.S08_COFFEE, SHOKUDO, IN_L);
  setFlag('flag_ch3_shokudo_done', 1);
  setFlag('flag_ch3_part_gassho', 1);
  se('se_c3_part', { level: 1 });
  yield* say3(T.S08_GOT_GASSHO);
  musicParam('c3_shokudo', 1);
  yield* say3(T.S08_OUTSIDE);
  // the last of the three: いただきます right here (S11)
  if (partsDone() >= 3) {
    yield 400;
    yield* evtItadakimasu();
  }
}
registerScript('evt_ch3_okawari', function* (): Co {
  if (!flag('flag_ch3_shokudo_start') || dishes() < 2) return;
  yield* evtOkawari();
});

// ---------------------------------------------------------------- S11 evt_ch3_itadakimasu

export function* evtItadakimasu(): Co {
  if (flag('flag_ch3_got_itadakimasu') || partsDone() < 3) return;
  stopBgm(1.0);
  yield 600;
  yield* say3(T.S11_A);
  // the case opens by itself; chopsticks, hands, voice go in as red light (1.2 s)
  se('se_c3_hanko_float');
  yield 1200;
  yield* say3(T.S11_B);
  setFlag('flag_ch3_got_itadakimasu', 1);
  syncProgressSkills();
  const shown = yield* hankoLearn('skill_itadakimasu');
  if (!shown) {
    se('se_stamp_heavy');
    yield 300;
    yield* say3(T.S11_GOT);
  }
  yield* say3(T.S11_C);
  // far off: the siren tower's iron door opens
  se('se_door_heavy', { vol: 0.4 });
  playBgm('bgm_umi_noon', { fade: 2.0, variant: 'shokudo' });
}
registerScript('evt_ch3_itadakimasu', function* (): Co {
  if (!inCh3()) return;
  yield 200;
  yield* evtItadakimasu();
});

addToMap('map_c3_shokudo', [], ['evt_ch3_itadakimasu']);
