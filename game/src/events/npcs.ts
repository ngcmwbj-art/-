// Every NPC's talk (10_narrative 6章) with its stage / second-time / flag
// branches. 母 is in home.ts, 丸山 and おばあ in shops.ts, カネナリくん's
// flips while following are the world's (6.17 key by place).

import type { Co } from '../engine/co';
import { flag, setFlag } from '../game/state';
import { actor, msg, registerScript, stage } from '../world/api';
import { pickTalk } from '../world/interact';
import { fushigiDone, runFushigi } from '../world/fushigi';
import { NPC } from '../data/text/npcs';
import { once, stageKeys } from './lib';

/** Plain NPCs: the stage line, counting visits (6.0). */
function simple(id: string): void {
  registerScript(id, function* (): Co {
    if (stage() >= 3) return;
    const t = stageKeys(NPC[id]);
    const key = pickTalk(id, t);
    if (key) yield* msg(t[key]);
  });
}

for (const id of ['npc_tsurumi', 'npc_sae', 'npc_jk', 'npc_chugaku', 'npc_postman', 'npc_gacha_boy', 'npc_ojii', 'npc_mizumaki', 'npc_shadow_man', 'npc_cat_mike', 'npc_cow_statue'])
  simple(id);

// ---------------------------------------------------------------- 6.5 乾: the f05 line once after fushigi_05

registerScript('npc_inui', function* (): Co {
  const t = NPC.npc_inui;
  if (fushigiDone('fushigi_05') && once('flag_seen_npc_inui_f05')) {
    yield* msg(t.f05);
    return;
  }
  const s = stageKeys(t);
  const key = pickTalk('npc_inui', s);
  if (key) yield* msg(s[key]);
});

// ---------------------------------------------------------------- 6.4 まめ吉 (fushigi_04 ★ tutorial)

registerScript('npc_mamekichi', function* (): Co {
  const t = NPC.npc_mamekichi;
  const s = stage();
  const m = actor('npc_mamekichi');
  if (m) m.pose = null;
  if (s === 0) {
    const key = pickTalk('npc_mamekichi', { s0_1: t.s0_1, s0_2: t.s0_2 });
    if (key) yield* msg(key === 's0_1' ? t.s0_1 : t.s0_2);
    return;
  }
  if (s === 1) {
    if (!fushigiDone('fushigi_04')) {
      // the talk, then 『みました』を 押しますか？ (and the tutorial's 「よくできました」)
      const key = pickTalk('npc_mamekichi', { s1_1: t.s1_1, s1_2: t.s1_2 });
      yield* runFushigi('fushigi_04', key === 's1_2' ? t.s1_2 : t.s1_1);
      return;
    }
    const key = pickTalk('npc_mamekichi_done', { s1_1: t.done_1, s1_2: t.done_2 });
    yield* msg(key === 's1_1' ? t.done_1 : t.done_2);
    return;
  }
  if (s === 2) {
    const key = pickTalk('npc_mamekichi', { s2_1: t.s2_1, s2_2: t.s2_2 });
    const line = key === 's2_1' ? t.s2_1 : t.s2_2;
    if (!fushigiDone('fushigi_04')) {
      yield* msg(t.pre_s2);
      yield* runFushigi('fushigi_04', line);
      return;
    }
    yield* msg(line);
  }
});

// ---------------------------------------------------------------- 6.12 女の子 (fushigi_07)

registerScript('npc_sand_girl', function* (): Co {
  const t = NPC.npc_sand_girl;
  const g = actor('npc_sand_girl');
  if (fushigiDone('fushigi_07') && once('flag_seen_npc_sand_girl_f07')) {
    yield* msg(t.f07);
    return;
  }
  const s = stageKeys(t);
  const key = pickTalk('npc_sand_girl', s);
  const line = key ? s[key] : t.s1_1;
  if (!fushigiDone('fushigi_07')) {
    yield* runFushigi('fushigi_07', line);
    if (fushigiDone('fushigi_07') && g) {
      // proud of her embankment
      g.pose = g.sprite.extra?.proud ? 'proud' : null;
    }
    return;
  }
  yield* msg(line);
});

// ---------------------------------------------------------------- 6.19 ネコ（ソース）(fushigi_02)

registerScript('npc_cat_sauce', function* (): Co {
  const t = NPC.npc_cat_sauce;
  const s = stage();
  if (flag('flag_read_poster_sauce') && once('flag_seen_sauce_poster')) {
    yield* msg(t.poster);
    return;
  }
  if (s === 0) {
    yield* msg(t.s0);
    return;
  }
  if (fushigiDone('fushigi_02')) {
    if (s >= 2) yield* msg(t.s2_done);
    else yield* runFushigi('fushigi_02');
    return;
  }
  if (s >= 2) yield* runFushigi('fushigi_02', t.s2);
  else yield* runFushigi('fushigi_02');
});

// ---------------------------------------------------------------- カラス

registerScript('npc_crow', function* (): Co {
  const t = NPC.npc_crow;
  if (stage() <= 1) {
    yield* msg(t.s1);
    return;
  }
  const key = pickTalk('npc_crow', { s2_1: t.s2_1, s2_2: flag('flag_kanenari_joined') ? t.s2_2 : t.s2_1 });
  yield* msg(key === 's2_2' && flag('flag_kanenari_joined') ? t.s2_2 : t.s2_1);
});

// ---------------------------------------------------------------- 6.11 日傘の人とコタロウ (both stop when either is spoken to)

function pairTalk(id: string, other: string): void {
  registerScript(id, function* (): Co {
    const o = actor(other);
    if (o) o.data.scripted = true;
    try {
      const t = stageKeys(NPC[id]);
      const key = pickTalk(id, t);
      if (key) yield* msg(t[key]);
    } finally {
      if (o) delete o.data.scripted;
    }
  });
}
pairTalk('npc_madam', 'npc_kotaro');
pairTalk('npc_kotaro', 'npc_madam');

// ---------------------------------------------------------------- 6.18 ハト（段階0）and the restored one

registerScript('npc_hato', function* (): Co {
  const t = NPC.npc_hato;
  const h = actor('npc_hato');
  const key = pickTalk('npc_hato', { s0_1: t.s0_1, s0_2: t.s0_2 });
  if (h) {
    h.pose = null;
    h.playAnim('bow');
  }
  yield* msg(key === 's0_2' ? t.s0_2 : t.s0_1);
  if (h) {
    h.anim = null;
    h.pose = 'peck';
  }
  if (key === 's0_1') setFlag('flag_seen_hato_card', 1);
});

registerScript('restored_enemy_hato_kakaricho', function* (): Co {
  yield* msg(NPC.npc_hato.restored);
});
