// 海ぞいの町の人と調べる物（60_ch3_story 3.2・9.1〜9.3・10.32、62 3.4・3.5）— 第1期の分。
//
// The people of 海ぞいの町 say their usual lines of stage 1 (keys c1_1, c1_2…;
// the scenes ①〜③ S07〜S09 come in the second part: until then each stops at
// their usual words). Every examinable of the first part (obj_c3_*) gets its
// text here, so the maps can place them with any text. 港のポスト is the
// save point. The scripts are registered by id; the maps (src/data/maps, W)
// place the people and things.

import type { Co } from '../../engine/co';
import { flag } from '../../game/state';
import { hasMap, registerScript, setFlag } from '../../world/api';
import { saveConfirm, saveWithStamp } from '../../ui/save';
import { C3_KID_AGAIN, C3_OBJ, C3_TALK, C3_TSUGAOBIN, EDGE_ROAD, EDGE_SEA, SAVE_POST, SAVE_POST_DONE, SAVE_POST_OPTIONS } from '../../data/text/c3_events';
import { se } from '../ch2/compat';
import { c3Stage, knOnce, pickC3, say3 } from './common';

// ---------------------------------------------------------------- the people (3.2)

/** Talk tables by npc id (the 干物屋 couple share one, so do the three children). */
const TABLE_OF: Record<string, string> = {
  npc_c3_himono_otto: 'npc_c3_himono',
  npc_c3_himono_tsuma: 'npc_c3_himono',
  npc_c3_kid_a: 'npc_c3_kid',
  npc_c3_kid_b: 'npc_c3_kid',
  npc_c3_kid_c: 'npc_c3_kid',
};

function* talkC3(id: string): Co {
  const tid = TABLE_OF[id] ?? id;
  const table = C3_TALK[tid];
  if (!table) return;
  // the children: the whole exchange the first time, then each one's own line
  if (tid === 'npc_c3_kid' && flag('flag_seen_npc_c3_kid_c1')) {
    yield* say3(C3_KID_AGAIN[id], id);
    return;
  }
  const key = pickC3(tid, table, Math.max(1, c3Stage()));
  if (!key) return;
  yield* say3(table[key], id);
  // テル's second visit is about グソっ君 (60 3.2 flag_c3_teru_kn)
  if (id === 'npc_c3_toudai' && key === 'c1_2') setFlag('flag_c3_teru_kn', 1);
  // テルと話したら、灯台の扉が開く（62 1.4 door_c3_toudai：中は第2期）
  // (the room is the second part's: until it is registered the door stays shut with its paper)
  if (id === 'npc_c3_toudai' && hasMap('map_c3_toudai')) setFlag('flag_ch3_toudai_open', 1);
}

for (const id of [
  'npc_c3_shokudo',
  'npc_c3_jouren',
  'npc_c3_seri',
  'npc_c3_seri_deshi',
  'npc_c3_toudai',
  'npc_c3_mago',
  'npc_c3_kanshiin',
  'npc_c3_himono_otto',
  'npc_c3_himono_tsuma',
  'npc_c3_tsuri',
  'npc_c3_uketsuke',
  'npc_c3_kid_a',
  'npc_c3_kid_b',
  'npc_c3_kid_c',
])
  registerScript(id, function* (): Co {
    yield* talkC3(id);
  });

// ミナト stays up the tower till S12 (60 3.2): if a map stands him at its door, the door's paper speaks
registerScript('npc_c3_sirenban', function* (): Co {
  yield* say3(C3_OBJ.obj_c3_siren_zaishitsu.text);
});

// ツガオ便の2人（表の顔。map_umizoi が script 'c3_hirosuke_umi' / 'c3_pokosha_umi' で置く）
registerScript('c3_hirosuke_umi', function* (): Co {
  yield* say3(C3_TSUGAOBIN.hirosuke);
});
registerScript('c3_pokosha_umi', function* (): Co {
  yield* say3(C3_TSUGAOBIN.pokosha);
});

// ---------------------------------------------------------------- the things (9.1〜9.3)

function* examineC3(id: string): Co {
  const o = C3_OBJ[id];
  if (!o) return;
  se('se_examine');
  const seen = `flag_seen_${id}`;
  if (o.again && flag(seen)) yield* say3(o.again);
  else yield* say3(o.text);
  setFlag(seen, 1);
  if (o.kn && knOnce(id)) yield* say3(o.kn);
}

// obj_c3_tv / obj_c3_randoseru / obj_c3_yakisoban_statue are the stage-0 faces of
// chapter 1's things (prologue.ts / town0.ts wrap those); they answer by their own ids too.
for (const id of Object.keys(C3_OBJ))
  registerScript(id, function* (): Co {
    yield* examineC3(id);
  });

// ---------------------------------------------------------------- 港のポスト (10.32): save

function* savePost(): Co {
  se('se_examine');
  const yes = yield* saveConfirm('narr', { text: SAVE_POST, options: SAVE_POST_OPTIONS });
  if (!yes) return;
  se('se_stamp', { vol: 0.6 });
  const ok = yield* saveWithStamp();
  if (ok) yield* say3(SAVE_POST_DONE);
}
registerScript('obj_c3_post', savePost);
registerScript('evt_ch3_save_post', savePost);

// ---------------------------------------------------------------- the edges (62 1.6)

registerScript('trig_ch3_edge_sea', function* (): Co {
  // グソっ君: where he could go in (once; nothing after)
  if (flag('flag_ch3_edge_sea')) return;
  setFlag('flag_ch3_edge_sea', 1);
  yield* say3(EDGE_SEA);
});
registerScript('trig_ch3_edge_road', function* (): Co {
  yield* say3(EDGE_ROAD);
});
