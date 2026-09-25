// The village's talk (50_ch2_story 3章): every NPC of 星見台 with its stage
// lines (h0_1 …), the branches on the story flags, ヨシエさん's tea (HP back,
// evt_ch2_rest_yoriai), サワコさん's 無人販売所 (7.3) and カネナリくん's flips by
// place (3.1, 52 1.8).

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, setFlag, state } from '../../game/state';
import { sfx } from '../../audio';
import { registerScript } from '../../world/api';
import { field, type FieldScene } from '../../world/field';
import { runMsg } from '../../world/msg';
import { getShop, openShop, registerShop } from '../../ui/shop';
import { getItem } from '../../data/battle';
import { HOSHI_NPC, KANENARI_FLIPS_HOSHI, KANENARI_FLIP_MUJIN_H1, KANENARI_USUAL_HOSHI, MUJIN_SHOP } from '../../data/text/hoshi_npcs';
import { panBack, panTo } from '../lib';
import { hStage, npc, pickH, say } from './common';

const T = HOSHI_NPC;

/** A table of only the given keys (a stage's lines, some keys dropped). */
function only(t: Record<string, string>, keys: string[]): Record<string, string> {
  const o: Record<string, string> = {};
  for (const k of keys) if (t[k] !== undefined) o[k] = t[k];
  return o;
}

function* talk(id: string, table: Record<string, string>): Co<string | null> {
  const key = pickH(id, table);
  if (key) yield* say(table[key]);
  return key;
}

// ---------------------------------------------------------------- 3.3 運転手

registerScript('npc_hoshi_busdriver', function* (): Co {
  const t = T.npc_hoshi_busdriver;
  const key = yield* talk('npc_hoshi_busdriver', t);
  if (key === 'h0_1') {
    // 「明かりが 見えるだろ。」: the camera looks north at the gathering room's window
    const f = field();
    if (f && f.map.id === 'map_hoshimidai') {
      yield* panTo(23, 29, 600);
      yield 700;
      yield* panBack(600);
    }
  }
});

// ---------------------------------------------------------------- 3.4 運転士（車内。2回目の台詞のあとは、すぐ着く）

registerScript('npc_hoshi_traindriver', function* (): Co {
  const t = T.npc_hoshi_traindriver;
  if (!flag('flag_seen_npc_hoshi_traindriver_first')) {
    setFlag('flag_seen_npc_hoshi_traindriver_first', 1);
    yield* say(t.first);
    return;
  }
  yield* say(t.second);
  if (!flag('flag_ch2_arrived')) {
    const { evtArrive } = (yield import('./train')) as typeof import('./train');
    yield* evtArrive(true);
  }
});

// ---------------------------------------------------------------- 3.5 区長

registerScript('npc_hoshi_kucho', function* (): Co {
  if (!flag('flag_ch2_yoriai')) {
    const { evtYoriai } = (yield import('./village')) as typeof import('./village');
    yield* evtYoriai();
    return;
  }
  yield* talk('npc_hoshi_kucho', T.npc_hoshi_kucho);
});

// ---------------------------------------------------------------- 3.6 ヨシエさん（evt_ch2_rest_yoriai）

function* tea(): Co {
  sfx('se_heal');
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
  // stages 1 and 2 go back to 〔h0_2〕 after their first line
  const table = { ...only(t, ['h0_1', 'h0_2', 'h1_1', 'h2_1']), h1_2: t.h0_2, h2_2: t.h0_2 };
  const key = yield* talk('npc_hoshi_yoshie', table);
  yield* tea();
  if (key === 'h1_1') yield* say(t.h1_1_after);
}
registerScript('npc_hoshi_yoshie', yoshie);
registerScript('evt_ch2_rest_yoriai', yoshie);

// ---------------------------------------------------------------- 3.7 フミ先生

registerScript('npc_hoshi_fumi', function* (): Co {
  if (!flag('flag_ch2_yoriai')) {
    const { evtYoriai } = (yield import('./village')) as typeof import('./village');
    yield* evtYoriai();
    return;
  }
  yield* talk('npc_hoshi_fumi', only(T.npc_hoshi_fumi, ['h0_2', 'h0_3', 'h1_1', 'h1_2', 'h1_3', 'h2']));
});

// ---------------------------------------------------------------- 3.8 ミツばあ

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

/** 3号ハウス's closed door (door_hoshi_house before flag_ch2_met_mitsu): she calls from beside it. */
function* houseClosed(): Co {
  const t = T.npc_hoshi_mitsu;
  if (!flag('flag_ch2_yoriai')) {
    const m = npc('npc_hoshi_mitsu');
    const f = field();
    if (m && f) {
      m.dir = f.player.x < m.x ? 'left' : f.player.y < m.y ? 'up' : 'left';
      m.lift = 70;
    }
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

// ---------------------------------------------------------------- 3.9 ゲンさん

registerScript('npc_hoshi_gen', function* (): Co {
  const t = T.npc_hoshi_gen;
  if (!flag('flag_ch2_got_tomato')) {
    yield* talk('npc_hoshi_gen', only(t, ['h0_1', 'h0_2']));
    return;
  }
  if (!flag('flag_ch2_met_gen')) {
    const { evtGenStop } = (yield import('./barn')) as typeof import('./barn');
    yield* evtGenStop();
    return;
  }
  if (!flag('flag_ch2_gate_open')) {
    // (in the barn, before the round is done)
    const f = field();
    if (f?.map.id === 'map_hoshi_barn') {
      const { evtBarn } = (yield import('./barn')) as typeof import('./barn');
      yield* evtBarn();
    }
    return;
  }
  // the shipping talk is his second line of stage 1, said once; nothing in the music changes for it
  yield* talk('npc_hoshi_gen', only(t, ['h1_1', 'h1_2', 'h1_3', 'h2_1', 'h2_2']));
});

/** The barn's door before ゲンさん asked for the light: his h0 lines (10.4 〔牛舎の入口（段階0）〕). */
function* barnClosed(): Co {
  const g = npc('npc_hoshi_gen');
  const f = field();
  if (g && f) {
    g.dir = f.player.x < g.x ? 'left' : f.player.x > g.x ? 'right' : 'down';
    g.lift = 70;
  }
  if (flag('flag_ch2_got_tomato') && !flag('flag_ch2_met_gen')) {
    const { evtGenStop } = (yield import('./barn')) as typeof import('./barn');
    yield* evtGenStop();
    return;
  }
  yield* talk('npc_hoshi_gen', only(HOSHI_NPC.npc_hoshi_gen, ['h0_1', 'h0_2']));
}
registerScript('door_hoshi_barn_closed', barnClosed);

// ---------------------------------------------------------------- 3.10 トメじい

registerScript('npc_hoshi_tome', function* (): Co {
  const t = T.npc_hoshi_tome;
  if (state.taken['sym_hoshi_03'] && state.taken['sym_hoshi_06'] && !flag('flag_seen_npc_hoshi_tome_kacho_done')) {
    setFlag('flag_seen_npc_hoshi_tome_kacho_done', 1);
    yield* say(t.kacho_done);
    return;
  }
  yield* talk('npc_hoshi_tome', only(t, ['h0_1', 'h0_2', 'h1_1', 'h1_2', 'h2_1']));
});

// ---------------------------------------------------------------- 3.11 サワコさん（→ 無人販売所 7.3）

/** The UI team's 無人販売所 (02 6.6) under whichever of these ids it registers; ours last. */
const MUJIN_SHOP_IDS = ['shop_hoshi_mujin', 'shop_mujin', 'shop_hoshi'];
const OWN_SHOP_ID = 'shop_hoshi_mujin_ev';

/**
 * 無人販売所 — サワコさん sells, everything 100円, at most 3 / 1 / 2 of a thing
 * per visit (walking off and back in restocks). Stands in until the UI's
 * shop is registered.
 */
function mujinShopId(): string {
  for (const id of MUJIN_SHOP_IDS) if (getShop(id)) return id;
  if (!getShop(OWN_SHOP_ID)) {
    const S = MUJIN_SHOP;
    registerShop({
      id: OWN_SHOP_ID,
      title: S.title,
      keeper: { name: 'サワコさん', voice: 'h_sawako' },
      goods: () => S.goods.filter((id) => !!getItem(id)),
      price: () => S.price,
      limit: (id) => S.limits[id] ?? 3,
      onBuy: (id, n) => {
        sfx('se_h_coin_box');
        if (id === 'item_toumorokoshi' && !flag('flag_ch2_mujin_corn')) {
          setFlag('flag_ch2_mujin_corn', 1);
          return S.corn;
        }
        if (!flag('flag_ch2_mujin_first')) {
          setFlag('flag_ch2_mujin_first', 1);
          return S.first;
        }
        return S.again[n % 2];
      },
      noMoney: S.noMoney,
      bagFull: S.bagFull,
      bye: () => S.bye,
    });
  }
  return OWN_SHOP_ID;
}

/** 1回の買い物の上限: a new visit starts with a full shelf. */
function restock(shopId: string): void {
  for (const id of MUJIN_SHOP.goods) {
    const k = `flag_shop_sold_${shopId}_${id}`;
    if (state.flags[k]) state.flags[k] = 0;
  }
}

function* sawakoShop(): Co {
  const id = mujinShopId();
  restock(id);
  yield* openShop(id);
}

registerScript('npc_hoshi_sawako', function* (): Co {
  const t = T.npc_hoshi_sawako;
  const mujinGone = !!state.taken['sym_hoshi_02'];
  if (mujinGone && !flag('flag_seen_npc_hoshi_sawako_mujin_done')) {
    setFlag('flag_seen_npc_hoshi_sawako_mujin_done', 1);
    yield* say(t.mujin_done);
  } else {
    const s = hStage();
    if (s >= 2) yield* talk('npc_hoshi_sawako', only(t, ['h2_1']));
    else if (s === 1 && !mujinGone) yield* talk('npc_hoshi_sawako', only(t, ['h1_1']));
    else {
      // stage 0 (and stage 1 once the box has calmed down): h0_3 only after the gathering
      const keys = flag('flag_ch2_yoriai') ? ['h0_1', 'h0_2', 'h0_3'] : ['h0_1', 'h0_2'];
      const key = pickH('npc_hoshi_sawako', only(t, keys), 0);
      if (key) yield* say(t[key]);
    }
  }
  yield* sawakoShop();
});

// ---------------------------------------------------------------- 3.12 ゴン

registerScript('npc_hoshi_gon', function* (): Co {
  const t = T.npc_hoshi_gon;
  const s = Math.min(2, hStage());
  const a = npc('npc_hoshi_gon');
  // asleep in stage 0: he doesn't get up to look at anyone
  if (a && s === 0) a.dir = (a.data.homeDir as typeof a.dir) ?? a.dir;
  yield* say(s >= 2 ? t.h2 : s === 1 ? t.h1 : t.h0);
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
 * Talking to カネナリくn while he follows, on 星見台: the place's flip the first
 * time (flag_kanenari_flip_hoshi_<place>), else the three usual ones of
 * chapter 2 in turn. Returns false off 星見台 (chapter 1's flips apply).
 */
export function* kanenariFlipHoshi(): Co<boolean> {
  const f = field();
  if (!f || !f.map.id.startsWith('map_hoshi')) return false;
  sfx('se_flip');
  const key = hoshiPlaceKey(f);
  if (key === 'hoshi_mujin' && hStage() >= 1) {
    if (!flag('flag_kanenari_flip_hoshi_mujin_h1')) {
      setFlag('flag_kanenari_flip_hoshi_mujin_h1', 1);
      yield* runMsg(KANENARI_FLIP_MUJIN_H1);
      return true;
    }
  } else if (key && KANENARI_FLIPS_HOSHI[key] && !flag(`flag_kanenari_flip_${key}`)) {
    setFlag(`flag_kanenari_flip_${key}`, 1);
    yield* runMsg(KANENARI_FLIPS_HOSHI[key]);
    // the one who came: フミ先生, if she is in the room
    if (key === 'hoshi_school' && f.map.id === 'map_hoshi_school' && f.actorById('npc_hoshi_fumi')) yield* runMsg(T.npc_hoshi_fumi.school_flip);
    return true;
  }
  const n = flag('flag_kanenari_usual_hoshi');
  setFlag('flag_kanenari_usual_hoshi', n + 1);
  yield* runMsg(KANENARI_USUAL_HOSHI[n % KANENARI_USUAL_HOSHI.length]);
  return true;
}

registerScript('evt_ch2_kanenari_flip', function* (): Co {
  yield* kanenariFlipHoshi();
});
// (the world may look the follower's talk up by this id)
registerScript('kanenari_flip', function* (ctx): Co {
  const ok = yield* kanenariFlipHoshi();
  if (!ok) yield* ctx.runDefault();
});

void game;
