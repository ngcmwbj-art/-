// S09 ③ 海水浴場「今年 最後の 海」（60_ch3_story 9.4・10.9、62 1.4・4.5・4.7、63 12.7）:
//
//   ウミ〔c1_1〕・カイト〔c1_1〕→ evt_ch3_kaisui（flag_ch3_kaisui_start）→ グソっ君の
//   潜り evt_ch3_moguri（港の階段・浜の波打ちぎわで海へ押す → map_c3_umi をグソっ君
//   だけで歩く。落とし物4つ、必須はウミの貝のブレスレット。flag_ch3_moguri_<id>）→
//   ウミに返す（テル「波は、光で 起こせるよ。」flag_ch3_lens_ok）→ 灯台のレンズ
//   evt_ch3_lens（ブイ3つに光を当てる。flag_ch3_lens_n）→ ウミに話すと最後の海
//   （flag_ch3_umi_done, flag_ch3_part_koe）。
//
// Where map_c3_umi / map_c3_toudai aren't registered yet, the dive and the lens
// run over a dark page with the same lines.

import type { Co } from '../../engine/co';
import { game, type Scene } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { flag, setFlag, removeItem, state, type Dir } from '../../game/state';
import { playAmbient, playBgm, setUnderwater, stopAmbient } from '../../audio';
import { registerScript, setFollowerVisible } from '../../world/api';
import { hasMap } from '../../world/maps';
import { registerWorldFx } from '../../world/fx';
import type { FieldScene } from '../../world/field';
import type { MapObj } from '../../world/types';
import { showBubble } from '../../ui/bubble';
import * as T from '../../data/text/c3_story2';
import { C3_TALK } from '../../data/text/c3_events';
import { fillNames } from '../../data/text/c3_names';
import { F, getKeyItem } from '../lib';
import { ambEvent, musicParam, se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, kitaSay, npc, partsDone, pickC3, say3 } from './common';
import { talkC3 } from './umizoi';
import { pgBand, pgOn } from '../../world/postgame';

// ---------------------------------------------------------------- places (62 1.4・4.7)

/** The two ways into the sea and the land side each comes back to. */
const ENTRY = {
  minato: { under: [2, 11, 'right'] as [number, number, Dir], land: [28, 26, 'down'] as [number, number, Dir] },
  // (beside ウミ, who stands on (60,30))
  hama: { under: [45, 1, 'left'] as [number, number, Dir], land: [61, 30, 'left'] as [number, number, Dir] },
};
type Entry = keyof typeof ENTRY;

/** The four things on the sea floor (62 4.7). */
const FINDS = [
  { id: 'ka', item: 'item_c3_kanban_ka', name: '『か』の 字', x: 18, y: 9 },
  { id: 'shikake', item: 'item_c3_shikake', name: '切れた 仕掛け', x: 4, y: 1 },
  { id: 'bracelet', item: 'item_c3_bracelet', name: '貝の ブレスレット', x: 29, y: 12 },
  { id: 'megane', item: 'item_c3_megane', name: 'めがね', x: 44, y: 6 },
] as const;

addToMap('map_umizoi', [
  { t: 'trig', id: 'trig_ch3_dive_minato', x: 28, y: 27, w: 2, h: 1, on: 'bump', script: 'trig_ch3_dive_minato', cond: { stage: '1-2' } } as unknown as MapObj,
  { t: 'trig', id: 'trig_ch3_dive_hama', x: 53, y: 31, w: 14, h: 1, on: 'bump', script: 'trig_ch3_dive_hama', cond: { stage: '1-2' } } as unknown as MapObj,
]);
// クリア後（05_postgame 2.3 yr_c3_moguri）：昼の港の階段から、グソっ君が 残りの落とし物を探しに潜る
const pgDiveOpen = (): boolean => pgOn() && pgBand() === 'hiru' && flag('flag_ch3_moguri_n') < FINDS.length;
addToMap('map_umizoi', [
  { t: 'trig', id: 'trig_pg_dive_minato', x: 28, y: 27, w: 2, h: 1, on: 'bump', script: 'trig_pg_dive_minato', cond: { when: pgDiveOpen } } as unknown as MapObj,
]);
registerScript('trig_pg_dive_minato', function* (): Co {
  const f = F();
  if (!pgDiveOpen() || f.player.dir !== 'down' || !flag('flag_pg_kn') || !f.follower?.visible) return;
  const i = yield* say3(T.DIVE_ASK);
  if (i !== 0) return;
  yield* dive('minato');
});

addToMap('map_c3_umi', [
  // (W's picture: prop_c3_umi_otoshimono, a glint on the sand)
  ...FINDS.map(
    (d) => ({ t: 'obj', id: `obj_c3_moguri_${d.id}`, x: d.x, y: d.y, flat: true, prop: 'prop_c3_umi_otoshimono', opts: { v: d.id }, cond: { notFlag: `flag_ch3_moguri_${d.id}` } }) as unknown as MapObj,
  ),
  { t: 'obj', id: 'obj_c3_umi_fuchi', x: 45, y: 12, flat: true } as unknown as MapObj,
  // the ways up (62 4.7 `^`): stepping on them, or pushing at them from beside
  { t: 'trig', id: 'trig_ch3_umi_up_minato', x: 1, y: 11, w: 1, h: 1, script: 'trig_ch3_umi_up' } as unknown as MapObj,
  { t: 'trig', id: 'trig_ch3_umi_up_minato_b', x: 2, y: 11, w: 1, h: 1, on: 'bump', script: 'trig_ch3_umi_up' } as unknown as MapObj,
  { t: 'trig', id: 'trig_ch3_umi_up_hama', x: 46, y: 1, w: 1, h: 1, script: 'trig_ch3_umi_up' } as unknown as MapObj,
  { t: 'trig', id: 'trig_ch3_umi_up_hama_b', x: 45, y: 1, w: 1, h: 1, on: 'bump', script: 'trig_ch3_umi_up' } as unknown as MapObj,
]);

/** A dark page under everything (a room that isn't there yet). */
class DarkPage implements Scene {
  transparent = false;
  update(): void {}
  draw(g: Gfx): void {
    g.clear('#0B1A2A');
  }
}

/** Change the field's map under a black screen (no enter scripts, no door). */
function jumpMap(id: string, x: number, y: number, dir: Dir): void {
  const f = F();
  const from = f.map.id;
  const prevKind = f.map.def.kind;
  f.loadMap(id, x, y, dir, from);
  if (prevKind !== f.map.def.kind) f.renderer.onMapChange();
}

// ---------------------------------------------------------------- ウミ・カイト

function* maybeStart(): Co {
  if (flag('flag_ch3_kaisui_start')) return;
  if (!flag('flag_seen_npc_c3_mago_c1_1') || !flag('flag_seen_npc_c3_kanshiin_c1_1')) return;
  yield* evtKaisui();
}

export function* evtKaisui(): Co {
  if (flag('flag_ch3_kaisui_start')) return;
  yield* say3(T.S09_START);
  setFlag('flag_ch3_kaisui_start', 1);
  yield* say3(T.S09_WHERE);
}

registerScript('npc_c3_mago', function* (): Co {
  if (!inCh3()) return;
  if (flag('flag_ch3_umi_done') || c3Stage() >= 2) {
    yield* say3(T.C2_TALK.npc_c3_mago);
    return;
  }
  if (!flag('flag_ch3_kaisui_start')) {
    if (!flag('flag_seen_npc_c3_mago_c1_1')) {
      pickC3('npc_c3_mago', C3_TALK.npc_c3_mago, 1);
      yield* say3(C3_TALK.npc_c3_mago.c1_1, 'npc_c3_mago');
      yield* maybeStart();
      return;
    }
    if (flag('flag_seen_npc_c3_kanshiin_c1_1')) yield* evtKaisui();
    else yield* talkC3('npc_c3_mago');
    return;
  }
  if (!flag('flag_ch3_bracelet_given')) {
    if (state.inventory.includes('item_c3_bracelet')) yield* braceletBack();
    else yield* say3(T.S09_MAGO_WAIT);
    return;
  }
  if (flag('flag_ch3_lens_n') < 3) {
    yield* say3(T.S09_MAGO_LENS);
    return;
  }
  yield* lastSea();
});

registerScript('npc_c3_kanshiin', function* (): Co {
  if (!inCh3()) return;
  if (flag('flag_ch3_umi_done') || c3Stage() >= 2) {
    yield* say3(T.C2_TALK.npc_c3_kanshiin);
    return;
  }
  if (!flag('flag_ch3_kaisui_start')) {
    if (!flag('flag_seen_npc_c3_kanshiin_c1_1')) {
      pickC3('npc_c3_kanshiin', C3_TALK.npc_c3_kanshiin, 1);
      yield* say3(C3_TALK.npc_c3_kanshiin.c1_1, 'npc_c3_kanshiin');
      yield* maybeStart();
      return;
    }
    if (flag('flag_seen_npc_c3_mago_c1_1')) yield* evtKaisui();
    else yield* talkC3('npc_c3_kanshiin');
    return;
  }
  yield* talkC3('npc_c3_kanshiin');
});
registerScript('evt_ch3_kaisui', evtKaisui);

// ---------------------------------------------------------------- the dive (9.4)

function* diveAsk(entry: Entry): Co {
  if (!inCh3() || F().player.dir !== 'down') return;
  if (!flag('flag_ch3_kaisui_start')) {
    if (!flag('flag_ch3_dive_notyet')) {
      setFlag('flag_ch3_dive_notyet', 1);
      yield* say3(T.DIVE_NOT_YET);
    }
    return;
  }
  const i = yield* say3(T.DIVE_ASK);
  if (i !== 0) return;
  yield* dive(entry);
}
registerScript('trig_ch3_dive_minato', function* (): Co {
  yield* diveAsk('minato');
});
registerScript('trig_ch3_dive_hama', function* (): Co {
  yield* diveAsk('hama');
});
registerScript('evt_ch3_moguri', function* (): Co {
  yield* dive('hama');
});

/** Into the sea: グソっ君 alone (しゅん waits on the shore). */
export function* dive(entry: Entry): Co {
  const f = F();
  setFlag('flag_ch3_diving', entry === 'minato' ? 1 : 2);
  se('se_c3_dive_in');
  yield* game.fadeOut(500, '#0B1A2A');
  setUnderwater(1);
  if (hasMap('map_c3_umi')) {
    const [x, y, d] = ENTRY[entry].under;
    setFollowerVisible(false);
    f.player.setSprite('kanenari');
    jumpMap('map_c3_umi', x, y, d);
    playBgm('bgm_umi_noon', { fade: 0.8, variant: 'suichu' });
    playAmbient('amb_c3_suichu', { fade: 0.8 });
    yield 200;
    yield* game.fadeIn(600);
    se('se_c3_gusoku_eye', { vol: 0.6 });
    if (!flag('flag_ch3_moguri_first')) {
      setFlag('flag_ch3_moguri_first', 1);
      yield* say3(T.MOGURI.first);
    }
    return;
  }
  // (no sea floor yet: a dark page, the same lines, the bracelet found)
  const page = new DarkPage();
  game.push(page);
  yield* game.fadeIn(400);
  yield* say3(T.MOGURI_DARK);
  if (!flag('flag_ch3_moguri_first')) {
    setFlag('flag_ch3_moguri_first', 1);
    yield* say3(T.MOGURI.first);
  }
  if (!flag('flag_ch3_moguri_bracelet')) yield* pick(FINDS[2]);
  yield* game.fadeOut(400, '#0B1A2A');
  if (game.top === page) game.pop();
  yield* surface(entry, false);
}

function* pick(d: (typeof FINDS)[number]): Co {
  if (flag(`flag_ch3_moguri_${d.id}`)) return;
  setFlag(`flag_ch3_moguri_${d.id}`, 1);
  setFlag('flag_ch3_moguri_n', flag('flag_ch3_moguri_n') + 1);
  se('se_c3_moguri_get');
  yield* say3(T.MOGURI[d.id]);
  yield* getKeyItem(d.item, T.moguriGot(d.id === 'megane' ? fillNames(`{name:npc_c3_sirenban}の めがね`) : d.name), false);
}

for (const d of FINDS)
  registerScript(`obj_c3_moguri_${d.id}`, function* (): Co {
    yield* pick(d);
  });
registerScript('obj_c3_umi_fuchi', function* (): Co {
  se('se_examine');
  yield* say3(T.MOGURI.fuchi);
});

registerScript('trig_ch3_umi_up', function* (): Co {
  const f = F();
  const t = f.player.tileX;
  const entry: Entry = t <= 2 ? 'minato' : 'hama';
  // from beside: only when pushing towards the way up
  if ((t === 2 && f.player.dir !== 'left') || (t === 45 && f.player.dir !== 'right')) return;
  const i = yield* say3(T.UMI_UP_ASK);
  if (i !== 0) return;
  se('se_c3_dive_out');
  yield* game.fadeOut(500, '#0B1A2A');
  yield* surface(entry, true);
});

/** Back on the shore: しゅん again, グソっ君 behind him. */
function* surface(entry: Entry, onMap: boolean): Co {
  const f = F();
  setUnderwater(0);
  stopAmbient('amb_c3_suichu', 0.5);
  setFlag('flag_ch3_diving', 0);
  f.player.setSprite('minato');
  setFollowerVisible(true);
  if (onMap || f.map.id !== 'map_umizoi') {
    const [x, y, d] = ENTRY[entry].land;
    jumpMap('map_umizoi', x, y, d);
    playBgm('bgm_umi_noon', { fade: 0.8, variant: 'outdoor' });
  } else {
    const [x, y, d] = ENTRY[entry].land;
    f.player.x = x * 16 + 8;
    f.player.y = y * 16 + 16;
    f.player.dir = d;
  }
  yield 200;
  yield* game.fadeIn(600);
  // the bracelet back to ウミ at once when they come up on the beach
  if (entry === 'hama' && state.inventory.includes('item_c3_bracelet') && !flag('flag_ch3_bracelet_given')) {
    yield 300;
    yield* braceletBack();
  }
}

/**
 * Keep who walks right after a load (an autosave on the sea floor, or a save
 * written while diving): on the sea floor グソっ君 alone, anywhere else しゅん
 * with グソっ君 behind him.
 */
registerWorldFx({
  map: '',
  update(f: FieldScene) {
    // (沖の ブイの 下 map_c3_umi_oki も 海の 中：海の 水で 寄せる、03_ch3_index 28)
    const under = f.map.id === 'map_c3_umi' || f.map.id === 'map_c3_umi_oki';
    const isKn = f.player.spriteId === 'kanenari';
    if (under && !isKn) {
      f.player.setSprite('kanenari');
      setFollowerVisible(false);
      if (!flag('flag_ch3_diving')) setFlag('flag_ch3_diving', 1);
    } else if (!under && (isKn || flag('flag_ch3_diving')) && (inCh3() || pgOn())) {
      if (isKn) f.player.setSprite('minato');
      setFlag('flag_ch3_diving', 0);
      setUnderwater(0);
      setFollowerVisible(true);
    }
  },
});

// ---------------------------------------------------------------- the bracelet → テル

function* braceletBack(): Co {
  removeItem('item_c3_bracelet');
  setFlag('flag_ch3_bracelet_given', 1);
  se('se_item', { vol: 0.6 });
  yield* say3(T.S09_BRACELET);
  yield* say3(T.S09_TERU);
  setFlag('flag_ch3_lens_ok', 1);
  if (hasMap('map_c3_toudai')) setFlag('flag_ch3_toudai_open', 1);
}

registerScript('npc_c3_toudai', function* (): Co {
  if (!inCh3()) return;
  const f = F();
  if (flag('flag_ch3_lens_ok') && flag('flag_ch3_lens_n') < 3) {
    if (f.map.id === 'map_c3_toudai') {
      yield* lens();
      return;
    }
    yield* say3(T.S09_TERU);
    // no lighthouse room yet: up the stairs over a dark page
    if (!hasMap('map_c3_toudai')) {
      const page = new DarkPage();
      yield* game.fadeOut(400, '#0B1A2A');
      game.push(page);
      yield* game.fadeIn(300);
      yield* lens();
      yield* game.fadeOut(400, '#0B1A2A');
      if (game.top === page) game.pop();
      yield* game.fadeIn(500);
    }
    return;
  }
  yield* talkC3('npc_c3_toudai');
});

// ---------------------------------------------------------------- the lens (evt_ch3_lens)

registerScript('obj_c3_lens', function* (): Co {
  if (flag('flag_ch3_lens_ok') && flag('flag_ch3_lens_n') < 3) {
    yield* lens();
    return;
  }
  se('se_examine');
  yield* say3(T.C3_OBJ2.obj_c3_lens.text);
});
registerScript('evt_ch3_lens', function* (): Co {
  if (flag('flag_ch3_lens_ok') && flag('flag_ch3_lens_n') < 3) yield* lens();
});
addToMap('map_c3_toudai', [{ t: 'obj', id: 'obj_c3_lens', x: 3, y: 2, w: 3, h: 2 } as unknown as MapObj]);

export function* lens(): Co {
  if (!flag('flag_ch3_lens_teru')) {
    setFlag('flag_ch3_lens_teru', 1);
    se('se_c3_lens_polish');
    yield* say3(T.LENS_TERU);
    // (fix1016 H3: the people who came speak in the lamp room only once they have climbed up into it)
    yield* kitaSay('npc_hoshi_fumi', T.LENS_FUMI, 'map_c3_toudai', [[4, 5], [4, 4], [1, 4]], 'right');
  }
  if (!flag('flag_ch3_lens_dir_set')) {
    setFlag('flag_ch3_lens_dir_set', 1);
    setFlag('flag_ch3_lens_dir', 3);
  }
  for (;;) {
    const n = flag('flag_ch3_lens_n');
    if (n >= 3) break;
    let dir = flag('flag_ch3_lens_dir');
    const i = yield* say3(T.lensAsk(dir, n));
    if (i === 3 || i < 0) return;
    if (i === 0 || i === 1) {
      dir = Math.max(0, Math.min(T.LENS_DIRS.length - 1, dir + (i === 0 ? -1 : 1)));
      setFlag('flag_ch3_lens_dir', dir);
      se('se_c3_lens_polish', { pitch: 0.9 + dir * 0.05, vol: 0.6 });
      continue;
    }
    se('se_c3_lens_beam');
    yield 400;
    const b = T.LENS_BUOYS.findIndex((x) => x.dir === dir);
    if (b < 0) {
      yield* say3(T.LENS_MISS);
      continue;
    }
    if (flag(`flag_ch3_lens_${b}`)) {
      yield* say3(T.LENS_AGAIN);
      continue;
    }
    setFlag(`flag_ch3_lens_${b}`, 1);
    setFlag('flag_ch3_lens_n', n + 1);
    ambEvent('amb_c3_umi', 'wave_on', n + 1);
    yield* say3(T.lensHit(T.LENS_BUOYS[b].place, n + 1));
    if (n === 0) yield* kitaSay('npc_hoshi_gen', T.LENS_GEN, 'map_c3_toudai', [[4, 5], [4, 4], [1, 4], [1, 3]], 'right');
  }
  yield* say3(T.LENS_DONE);
}

// ---------------------------------------------------------------- the last sea

function* lastSea(): Co {
  yield* say3(T.S09_FIN_A);
  se('se_c3_dive_in', { vol: 0.6 });
  yield 900;
  yield* say3(T.S09_FIN_B);
  se('se_c3_dive_in', { pitch: 1.3, vol: 0.6 });
  yield 700;
  yield* say3(T.S09_FIN_C);
  // (fix1016 H3: サエ comes over from the quay onto the beach, beside しゅん, before her line)
  {
    const p = F().player;
    const m = npc('npc_c3_mago');
    let tx = p.tileX - 1;
    if (m && m.tileX === tx && m.tileY === p.tileY) tx = p.tileX + 1;
    yield* kitaSay('npc_sae', T.S09_SAE, 'map_umizoi', [[52, 25], [tx, 25], [tx, p.tileY]], tx < p.tileX ? 'right' : 'left');
  }
  se('se_c3_flag');
  yield 600;
  yield* say3(T.S09_FIN_D);
  setFlag('flag_ch3_umi_done', 1);
  setFlag('flag_ch3_part_koe', 1);
  se('se_c3_part_koe');
  yield 200;
  se('se_c3_part', { level: 2 });
  yield* say3(T.S09_GOT_KOE);
  musicParam('c3_umi', 1);
  if (partsDone() >= 3) showBubble('kanenari', fillNames(T.GUIDE_PARTS), 2600);
}
registerScript('evt_ch3_umi_last', function* (): Co {
  if (flag('flag_ch3_lens_n') >= 3 && !flag('flag_ch3_umi_done')) yield* lastSea();
});

// ---------------------------------------------------------------- ツリノ: the line back (9.4)

registerScript('npc_c3_tsuri', function* (): Co {
  if (!inCh3()) return;
  if (state.inventory.includes('item_c3_shikake')) {
    yield* say3(T.RETURN_SHIKAKE);
    removeItem('item_c3_shikake');
    setFlag('flag_ch3_shikake_back', 1);
    return;
  }
  yield* talkC3('npc_c3_tsuri');
});

// ---------------------------------------------------------------- the rooms' things (W's ids; the words are the scenario's)

for (const id of ['obj_c3_uminoie_menu', 'obj_c3_uminoie_kakigori_ki', 'obj_c3_umi_post']) {
  const o = T.C3_OBJ2[id];
  registerScript(id, function* (): Co {
    se('se_examine');
    if (id === 'obj_c3_umi_post') setFlag('flag_ch3_hidden_kaitei', 1);
    yield* say3(o.text);
  });
}
