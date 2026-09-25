// The village's talk (50_ch2_story 3章): every NPC of 星見台 with its stage
// lines (h0_1 …), the branches on the story flags, エー夫人's tea (HP back,
// evt_ch2_rest_yoriai), ソワカさん's 無人販売所 (7.3; the UI's shop
// 'shop_hoshi_mujin') and カネナリくん's flips by place (3.1, 52 1.8).
// The ids keep the old names (npc_hoshi_mitsu = ペロリ, _gen = マサルさん …).

import type { Co } from '../../engine/co';
import { flag, setFlag, state } from '../../game/state';
import { registerScript } from '../../world/api';
import { field, type FieldScene } from '../../world/field';
import { runMsg } from '../../world/msg';
import { openShop } from '../../ui/shop';
import { KANENARI_USUAL } from '../../data/maps/town_text';
import { HOSHI_NPC, KANENARI_FLIPS_HOSHI, KANENARI_FLIP_MUJIN_H1, KANENARI_USUAL_HOSHI } from '../../data/text/hoshi_npcs';
import { panBack, panTo } from '../lib';
import { se } from './compat';
import { hStage, isHoshi, npc, pickH, say } from './common';

const T = HOSHI_NPC;

/** A table of only the given keys (a stage's lines, some keys dropped). */
function only(t: Record<string, string>, keys: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of keys) if (t[k] !== undefined) o[k] = t[k];
  return o;
}

function* talk(id: string, table: Record<string, string>, stage?: number): Co<string | null> {
  const key = pickH(id, table, stage);
  if (key) yield* say(table[key]);
  return key;
}

// ---------------------------------------------------------------- 3.3 さんかど（郵便配達員）

registerScript('npc_hoshi_busdriver', function* (): Co {
  const key = yield* talk('npc_hoshi_busdriver', T.npc_hoshi_busdriver);
  if (key === 'h0_1') {
    // 「明かりが 見えるだろ。」: the camera looks north at the gathering room's window (0.6 s) and back
    const f = field();
    if (f && f.map.id === 'map_hoshimidai') {
      yield* panTo(26, 26, 600);
      yield 700;
      yield* panBack(600);
    }
  }
});

// ---------------------------------------------------------------- 3.5 エー区長

registerScript('npc_hoshi_kucho', function* (): Co {
  if (!flag('flag_ch2_yoriai')) {
    const { evtYoriai } = (yield import('./village')) as typeof import('./village');
    yield* evtYoriai();
    return;
  }
  yield* talk('npc_hoshi_kucho', only(T.npc_hoshi_kucho, ['h0_2', 'h0_3', 'h1_1', 'h1_2', 'h2_1', 'h2_2']));
});

// ---------------------------------------------------------------- 3.6 エー夫人（evt_ch2_rest_yoriai）

/** The tea: HP full (not 朱肉), as often as he likes. */
function* tea(): Co {
  se('se_heal');
  for (const m of state.party) m.hp = m.maxHp;
  setFlag('flag_ch2_rest_count', flag('flag_ch2_rest_count') + 1);
  yield* say(T.npc_hoshi_yoshie.tea);
}

function* yoshie(): Co {
  if (!flag('flag_ch2_yoriai')) {
    const { evtYoriai } = (yield import('./village')) as typeof import('./village');
    yield* evtYoriai();
    return;
  }
  const t = T.npc_hoshi_yoshie;
  const n = flag('flag_ch2_yoshie_talks');
  setFlag('flag_ch2_yoshie_talks', n + 1);
  const s = Math.min(2, hStage());
  let key: string;
  // 〔h0_3〕: the third time only, once, at whatever stage
  if (n === 2 && !flag('flag_seen_npc_hoshi_yoshie_h0_3')) key = 'h0_3';
  else if (s === 0) key = n === 0 ? 'h0_1' : 'h0_2';
  else {
    const first = `flag_seen_npc_hoshi_yoshie_h${s}_1`;
    key = flag(first) ? 'h0_2' : `h${s}_1`;
  }
  setFlag(`flag_seen_npc_hoshi_yoshie_${key}`, 1);
  yield* say(t[key]);
  yield* tea();
  if (key === 'h1_1') yield* say(t.h1_1_after);
}
registerScript('npc_hoshi_yoshie', yoshie);
registerScript('evt_ch2_rest_yoriai', yoshie);

// ---------------------------------------------------------------- 3.7 まつ先生

registerScript('npc_hoshi_fumi', function* (): Co {
  if (!flag('flag_ch2_yoriai')) {
    const { evtYoriai } = (yield import('./village')) as typeof import('./village');
    yield* evtYoriai();
    return;
  }
  const t = T.npc_hoshi_fumi;
  if (hStage() >= 2) {
    yield* say(t.h2);
    return;
  }
  yield* talk('npc_hoshi_fumi', only(t, ['h0_2', 'h0_3', 'h1_1', 'h1_2', 'h1_3']));
});

// ---------------------------------------------------------------- 3.8 ペロリ

registerScript('npc_hoshi_mitsu', function* (): Co {
  const t = T.npc_hoshi_mitsu;
  if (!flag('flag_ch2_yoriai')) {
    yield* say(t.h0_0);
    return;
  }
  if (!flag('flag_ch2_met_mitsu')) {
    const { evtMitsu } = (yield import('./house')) as typeof import('./house');
    yield* evtMitsu();
    return;
  }
  if (!flag('flag_ch2_got_tomato')) {
    yield* say(t.h0_2);
    return;
  }
  if (!flag('flag_ch2_house_exit')) {
    const { houseExitLine } = (yield import('./house')) as typeof import('./house');
    yield* houseExitLine();
    return;
  }
  yield* talk('npc_hoshi_mitsu', only(t, ['h1_1', 'h1_2', 'h1_3', 'h2_1', 'h2_2']));
});

/** 3号ハウス's closed door (door_hoshi_house before flag_ch2_met_mitsu): he calls from beside it. */
function* houseClosed(): Co {
  const t = T.npc_hoshi_mitsu;
  const m = npc('npc_hoshi_mitsu');
  const f = field();
  if (m && f) {
    m.dir = f.player.x < m.x ? 'left' : 'up';
    m.lift = 70;
  }
  if (!flag('flag_ch2_yoriai')) {
    yield* say(t.h0_0);
    return;
  }
  if (!flag('flag_ch2_met_mitsu')) {
    const { evtMitsu } = (yield import('./house')) as typeof import('./house');
    yield* evtMitsu();
    return;
  }
  yield* say(t.h0_2);
}
registerScript('door_hoshi_house_closed', houseClosed);

// ---------------------------------------------------------------- 3.9 マサルさん

registerScript('npc_hoshi_gen', function* (): Co {
  const t = T.npc_hoshi_gen;
  const barn = (yield import('./barn')) as typeof import('./barn');
  if (!flag('flag_ch2_got_tomato')) {
    yield* talk('npc_hoshi_gen', only(t, ['h0_1', 'h0_2']), 0);
    return;
  }
  if (!flag('flag_ch2_met_gen')) {
    yield* barn.evtGenStop();
    return;
  }
  if (!flag('flag_ch2_gate_open')) {
    // (in the barn, before the round is done)
    if (field()?.map.id === 'map_hoshi_barn') yield* barn.evtBarn();
    return;
  }
  if (hStage() >= 2) {
    yield* barn.genTalkH2();
    return;
  }
  yield* barn.genTalkH1();
});

/** The barn's door before マサルさん asked for the light: his h0 lines (10.4 〔牛舎の入口（段階0）〕). */
function* barnClosed(): Co {
  const g = npc('npc_hoshi_gen');
  const f = field();
  if (g && f && g.visible) {
    g.dir = f.player.x < g.x ? 'left' : f.player.x > g.x ? 'right' : 'down';
    g.lift = 70;
  }
  if (flag('flag_ch2_got_tomato') && !flag('flag_ch2_met_gen')) {
    const { evtGenStop } = (yield import('./barn')) as typeof import('./barn');
    yield* evtGenStop();
    return;
  }
  yield* talk('npc_hoshi_gen', only(T.npc_hoshi_gen, ['h0_1', 'h0_2']), 0);
}
registerScript('door_hoshi_barn_closed', barnClosed);

// ---------------------------------------------------------------- 3.10 トマじい

registerScript('npc_hoshi_tome', function* (): Co {
  const t = T.npc_hoshi_tome;
  // 〔h2_2〕 of 3.10: both ヘノヘノ課長 beaten, at any stage, once
  if (state.taken['sym_hoshi_03'] && state.taken['sym_hoshi_06'] && !flag('flag_seen_npc_hoshi_tome_kacho_done')) {
    setFlag('flag_seen_npc_hoshi_tome_kacho_done', 1);
    yield* say(t.kacho_done);
    return;
  }
  yield* talk('npc_hoshi_tome', only(t, ['h0_1', 'h0_2', 'h0_3', 'h1_1', 'h1_2', 'h2_1']));
});

// ---------------------------------------------------------------- 3.11 ソワカさん（→ 無人販売所 7.3）

registerScript('npc_hoshi_sawako', function* (): Co {
  const t = T.npc_hoshi_sawako;
  const mujinGone = !!state.taken['sym_hoshi_02'];
  const s = hStage();
  if (mujinGone && !flag('flag_seen_npc_hoshi_sawako_mujin_done')) {
    // 〔h1_2〕 of 3.11: ムジン販売員 beaten (at any stage, once)
    setFlag('flag_seen_npc_hoshi_sawako_mujin_done', 1);
    yield* say(t.mujin_done);
  } else if (s >= 2) yield* talk('npc_hoshi_sawako', only(t, ['h2_1']));
  else if (s === 1 && !mujinGone) yield* talk('npc_hoshi_sawako', only(t, ['h1_1']));
  else {
    // stage 0 (and stage 1 once the box has calmed down): 〔h0_3〕 only after the gathering
    const keys = flag('flag_ch2_yoriai') ? ['h0_1', 'h0_2', 'h0_3'] : ['h0_1', 'h0_2'];
    yield* talk('npc_hoshi_sawako', only(t, keys), 0);
  }
  yield* openShop('shop_hoshi_mujin');
});

// ---------------------------------------------------------------- 3.12 ふくじんづけ

registerScript('npc_hoshi_gon', function* (): Co {
  const t = T.npc_hoshi_gon;
  const s = Math.min(2, hStage());
  const a = npc('npc_hoshi_gon');
  if (s === 0) {
    // asleep on the blanket: he doesn't get up to look at anyone
    if (a) a.dir = 'down';
    yield* talk('npc_hoshi_gon', only(t, ['h0_1', 'h0_2']), 0);
    return;
  }
  yield* say(s >= 2 ? t.h2 : t.h1);
});

// ---------------------------------------------------------------- 3.1 カネナリくんのフリップ（場所ごと）

/** The place key of 52 1.8 (checked top to bottom) for where Minato stands. */
export function hoshiPlaceKey(f: FieldScene): string {
  const m = f.map.id;
  const x = f.player.tileX;
  const y = f.player.tileY;
  const inR = (x0: number, x1: number, y0: number, y1: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  const v = m === 'map_hoshimidai';
  if (m === 'map_hoshi_train') return 'hoshi_train';
  if (v && inR(19, 24, 36, 39)) return 'hoshi_mujin';
  if (v && inR(33, 45, 40, 45)) return 'hoshi_bus';
  if (v && inR(14, 32, 40, 46)) return 'hoshi_station';
  if ((v && inR(0, 5, 29, 34)) || m === 'map_hoshi_house') return 'hoshi_house';
  if ((v && inR(47, 59, 30, 39)) || m === 'map_hoshi_barn') return 'hoshi_barn';
  if (v && inR(47, 59, 18, 23)) return 'hoshi_fence';
  if ((v && inR(21, 33, 26, 31)) || m === 'map_hoshi_school') return 'hoshi_school';
  if (v && inR(14, 18, 37, 37)) return 'hoshi_akiya';
  if (v && inR(14, 35, 1, 19)) return 'hoshi_tanada';
  if (v && inR(37, 59, 0, 17)) return 'hoshi_houki';
  if (m === 'map_hoshi_hill') return 'hoshi_hill';
  return '';
}

/**
 * The flip for talking to カネナリくん on 星見台, as one msg block: the
 * place's flip the first time there (flag_kanenari_flip_<place>), else the
 * three usual ones of chapter 2 in turn (counted apart from chapter 1's).
 */
export function hoshiFlipText(f: FieldScene): string {
  const key = hoshiPlaceKey(f);
  if (key === 'hoshi_mujin' && (hStage() >= 1 || flag('flag_book_enemy_mujin_hanbaiin'))) {
    if (!flag('flag_kanenari_flip_hoshi_mujin_h1')) {
      setFlag('flag_kanenari_flip_hoshi_mujin_h1', 1);
      return KANENARI_FLIP_MUJIN_H1;
    }
  } else if (key && KANENARI_FLIPS_HOSHI[key] && !flag(`flag_kanenari_flip_${key}`)) {
    setFlag(`flag_kanenari_flip_${key}`, 1);
    let text = KANENARI_FLIPS_HOSHI[key];
    // the one who came: まつ先生, if he is in the gathering room
    if (key === 'hoshi_school' && f.map.id === 'map_hoshi_school' && f.actorById('npc_hoshi_fumi')) text += '\n' + T.npc_hoshi_fumi.school_flip;
    return text;
  }
  const n = flag('flag_kanenari_usual_hoshi');
  setFlag('flag_kanenari_usual_hoshi', n + 1);
  return KANENARI_USUAL_HOSHI[n % KANENARI_USUAL_HOSHI.length];
}

export function* kanenariFlipHoshi(): Co<boolean> {
  const f = field();
  if (!f || !isHoshi(f.map.id)) return false;
  se('se_flip');
  yield* runMsg(hoshiFlipText(f));
  return true;
}

/**
 * The world asks for カネナリくん's words through chapter 1's table (it has no
 * hook for a chapter's own flips yet): on 星見台 the entries of that table
 * answer with chapter 2's flips. Off 星見台 they are chapter 1's own.
 */
{
  const own = [...KANENARI_USUAL];
  own.forEach((text, i) =>
    Object.defineProperty(KANENARI_USUAL, i, {
      configurable: true,
      enumerable: true,
      get(): string {
        const f = field();
        return f && isHoshi(f.map.id) ? hoshiFlipText(f) : text;
      },
    }),
  );
}

registerScript('evt_ch2_kanenari_flip', function* (): Co {
  yield* kanenariFlipHoshi();
});
