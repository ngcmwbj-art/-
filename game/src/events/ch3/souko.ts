// えさの倉庫と廊下（60_ch3_story 10.21〜10.24、61 5.1・8.4・13、62 4.16・4.17・1.6、
// 63 12.16〜12.18）:
//
//   S21 捕らわれて地下の倉庫（map_c3_aq_souko (4,6)、グソっ君 (5,6)）：ヒロスケの焼き芋、
//       エゴがハンコケースを運ぶ、グソっ君が弱る、半分の焼き芋 → 全回復（flag_ch3_souko）。
//   S22 倉庫の中だけの夜：エゴの白紙のカード、錠の「カチ」（flag_ch3_ego_night）。
//   S23 扉を調べる → 黒い「まだ」→ 鉄板の音 → ヘラでこそげる → ヤキソバン → 廊下の机の
//       ハンコケース → 仲間に（flag_ch3_yakisoban、addYakisoban）→ オートセーブ。
//   S24 廊下の先（trig_ch3_hp）→ ヒロスケ・ポコシャ戦（B）→ ポコシャの大きな声 →
//       2人が道をあける（flag_ch3_hp_beaten）。第3期はここまで：廊下の西の戸は
//       S25 から（いつもの調べる文で止まる）。
//
// フィールドのヤキソバン：グソっ君のうしろを歩く（c3_yk_follow。旧水族館の部屋だけ。
// S29 で隊列から外れるのは第4期）。

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, setFlag, state, type Dir } from '../../game/state';
import { playBgm, stopBgm } from '../../audio';
import { despawn, registerScript, spawn, walk } from '../../world/api';
import { getScript } from '../../world/scripts';
import { hasMap } from '../../world/maps';
import { registerWorldFx } from '../../world/fx';
import type { FieldScene } from '../../world/field';
import type { MapObj } from '../../world/types';
import type { Actor } from '../../world/actor';
import { hasChar } from '../../art/chars/registry';
import * as battleData from '../../data/battle';
import { getEnemy } from '../../data/battle';
import { autosaveSoon } from '../../ui/autosave';
import * as T from '../../data/text/c3_story3';
import { F, grace, panBack, panTo } from '../lib';
import { ambEvent, fnOf, se, seLoop } from '../ch2/compat';
import { addToMap, c3Battle, inCh3, say3 } from './common';
import { jumpMap } from './prologue';

const YK = 'c3_yk_follow';

/** ヤキソバン's field sprite (W's, else たかし's). */
function ykSprite(): string {
  return hasChar('npc_yakisoban') ? 'npc_yakisoban' : 'npc_maruyama';
}

// ================================================================ S20 → S21

/** After the dark of S20: the store underground, then S21 and S22 straight on. */
export function* capturedToSouko(): Co {
  const f = F();
  if (hasMap('map_c3_aq_souko')) {
    jumpMap('map_c3_aq_souko', 4, 6, 'up');
    f.syncFollower(true);
  }
  const kn = f.actorById('kanenari');
  if (kn) {
    kn.data.scripted = true;
    kn.x = 5 * 16 + 8;
    kn.y = 6 * 16 + 16;
    kn.dir = 'up';
  }
  stopBgm(0.2);
  yield 600;
  game.fadeColor = '#0B1420';
  yield* game.fadeIn(1200);
  yield* evtSouko();
  yield* evtEgo();
  if (kn) delete kn.data.scripted;
  grace();
}

// ================================================================ S21 evt_ch3_souko

function* evtSouko(): Co {
  if (flag('flag_ch3_souko')) return;
  const f = F();
  const p = f.player;
  const kn = f.actorById('kanenari');
  yield 800;
  // ヒロスケ behind the door's little window
  p.dir = 'down';
  if (kn) kn.dir = 'down';
  yield* say3(T.SOUKO_A);
  se('se_yakiimo', { vol: 0.6 });
  yield 900;
  // エゴ's cart past the window, しゅんの ハンコケース on it
  const cart = seLoop('se_c3_aq_cart', { vol: 0.6 });
  yield 700;
  yield* say3(T.SOUKO_EGO_NARR);
  yield* say3(T.SOUKO_EGO);
  se('se_dakoku', { vol: 0.7 });
  yield 900;
  cart.stop(1.2);
  // a long pause; the bulb sways
  yield 2000;
  if (kn) kn.dir = 'left';
  yield* say3(T.SOUKO_B);
  // しゅん breaks the cold sweet potato in two
  p.dir = 'right';
  yield 300;
  se('se_c3_aq_imo_waru');
  yield* say3(T.SOUKO_IMO);
  yield* say3(T.SOUKO_C);
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = m.maxMp;
    m.status = {};
  }
  se('se_heal', { vol: 0.5 });
  yield* say3(T.SOUKO_HEAL);
  setFlag('flag_ch3_souko', 1);
  // the store's own night (W's dark and the bulb out)
  setFlag('flag_c3_souko_night', 1);
  ambEvent('amb_c3_aq_souko', 'yoru');
}

// ================================================================ S22 evt_ch3_ego

function* evtEgo(): Co {
  if (flag('flag_ch3_ego_night')) return;
  const f = F();
  const p = f.player;
  const kn = f.actorById('kanenari');
  // the store's own night (W's dark: souko and not yet ego_night)
  yield 2400;
  const cart = seLoop('se_c3_aq_cart', { vol: 0.5 });
  yield 1400;
  cart.stop(0.4);
  p.dir = 'down';
  if (kn) kn.dir = 'down';
  // エゴ at the window: its clock face in the little window (W: flag_c3_ego_window)
  setFlag('flag_c3_ego_window', 1);
  yield 500;
  yield* say3(T.EGO_A);
  se('se_c3_aq_card');
  yield 400;
  yield* say3(T.EGO_CARD_NARR);
  yield* say3(T.EGO_CARD);
  yield 600;
  setFlag('flag_c3_ego_window', 0);
  const away = seLoop('se_c3_aq_cart', { vol: 0.5 });
  yield 600;
  // on its way, the lock: カチ (whether it undid it is not said)
  se('se_c3_aq_kachi');
  yield 900;
  away.stop(1.0);
  yield 1000;
  yield* say3(T.EGO_KACHI);
  setFlag('flag_ch3_ego_night', 1);
  setFlag('flag_c3_souko_night', 0);
  ambEvent('amb_c3_aq_souko', 'asa');
}

// ================================================================ S23 evt_ch3_yakisoban

function* evtYakisoban(): Co {
  const f = F();
  const p = f.player;
  const kn = f.actorById('kanenari');
  if (kn) kn.data.scripted = true;
  // in front of the door (5–6,8)
  if (p.tileY !== 7 || (p.tileX !== 5 && p.tileX !== 6)) yield* walk('player', [[p.tileX, 7], [5, 7]], { speed: 2.4, face: 'down' });
  p.dir = 'down';
  if (kn && (kn.tileX !== 6 || kn.tileY !== 6)) yield* walk('kanenari', [[6, 6]], { speed: 2.4, face: 'down' });
  se('se_examine', { vol: 0.5 });
  yield* say3(T.YK_A);
  // 1 s; then, before anyone is seen, the sauce on a hot plate beyond the door
  yield 1000;
  se('se_fry', { vol: 0.6 });
  yield 1200;
  yield* say3(T.YK_NIOI);
  // a steel spatula through the gap scrapes the black 「まだ」 off, slowly (3 times)
  for (let i = 0; i < 3; i++) {
    se('se_c3_kosogeru');
    yield 700;
  }
  yield* say3(T.YK_KOGE);
  setFlag('flag_ch3_souko_open', 1);
  yield 500;
  se('se_door_heavy');
  yield 300;
  // in the corridor's light, in the doorway
  const yk = spawn('c3_yk_door', 6, 8, { sprite: ykSprite(), dir: 'up', ghost: true });
  yk.data.scripted = true;
  yield 500;
  playBgm('bgm_jingle_yakisoban');
  yield* say3(T.YK_SANJO);
  yield* say3(T.YK_B);
  yield* say3(T.YK_C);
  // ◆ the corridor: the case on the desk
  yield* game.fadeOut(500, '#0B0B14');
  despawn('c3_yk_door');
  setFlag('flag_ch3_yakisoban_scene', 1);
  if (hasMap('map_c3_aq_rouka')) {
    jumpMap('map_c3_aq_rouka', 3, 5, 'left');
    f.syncFollower(true);
  }
  const kn2 = f.actorById('kanenari');
  if (kn2) {
    kn2.data.scripted = true;
    kn2.x = 4 * 16 + 8;
    kn2.y = 4 * 16 + 16;
    kn2.dir = 'left';
  }
  const yk2 = spawn('c3_yk_scene', 5, 4, { sprite: ykSprite(), dir: 'left', ghost: true });
  yk2.data.scripted = true;
  // (ヒロスケ and ポコシャ down the corridor are the map's: they stand there once flag_ch3_yakisoban is up)
  yield 300;
  yield* game.fadeIn(600);
  se('se_item', { vol: 0.7 });
  yield* say3(T.YK_CASE);
  f.player.dir = 'right';
  yield* say3(T.YK_D);
  // 仲間に（61 5.1）
  setFlag('flag_ch3_yakisoban', 1);
  fnOf(battleData, 'addYakisoban')?.();
  playBgm('bgm_jingle_join');
  yield* say3(T.YK_JOIN);
  yield 400;
  // 廊下の先に、ヒロスケとポコシャ
  yield 200;
  yield* panTo(11, 3, 900);
  yield 900;
  yield* panBack(700);
  despawn('c3_yk_scene');
  if (kn2) delete kn2.data.scripted;
  placeFollowYk(f, 5, 4, 'left');
  autosaveSoon();
  grace();
}

registerScript('obj_c3_souko_door', function* (): Co {
  if (!inCh3()) return;
  if (flag('flag_ch3_yakisoban') || flag('flag_ch3_souko_open')) {
    se('se_examine');
    yield* say3(`@narr\n重い 扉。{w=300}\n内側の 黒い 判は、もう ない。`);
    return;
  }
  if (!flag('flag_ch3_ego_night')) {
    se('se_examine');
    yield* say3(T.SOUKO_DOOR_LOCKED);
    return;
  }
  yield* evtYakisoban();
});
registerScript('evt_ch3_yakisoban', function* (): Co {
  if (inCh3() && flag('flag_ch3_ego_night') && !flag('flag_ch3_yakisoban')) yield* evtYakisoban();
});
// a load in the store between S20 and S22 (the scene didn't finish): pick it up
registerScript('evt_ch3_souko', function* (): Co {
  if (!inCh3() || !flag('flag_ch3_tsugao1') || flag('flag_ch3_ego_night')) return;
  yield 300;
  yield* evtSouko();
  yield* evtEgo();
  grace();
});
addToMap('map_c3_aq_souko', [], ['evt_ch3_souko']);

for (const id of ['obj_c3_souko_box', 'obj_c3_souko_denkyu'])
  registerScript(id, function* (): Co {
    se('se_examine');
    yield* say3(T.AQ_OBJ[id]);
  });
registerScript('obj_c3_rouka_desk', function* (): Co {
  se('se_examine');
  yield* say3(T.ROUKA_DESK);
});

// ================================================================ ヤキソバン in the field (behind グソっ君)

/** Where the leader walked (グソっ君), for ヤキソバン a step behind him. */
const trail: [number, number, Dir][] = [];
const YK_DELAY = 14;

function placeFollowYk(f: FieldScene, tx: number, ty: number, dir: Dir): Actor {
  despawn(YK);
  const a = spawn(YK, tx, ty, { sprite: ykSprite(), dir, ghost: true });
  a.solid = false;
  a.data.noSpace = true;
  trail.length = 0;
  void f;
  return a;
}

registerWorldFx({
  map: '',
  update(f: FieldScene, dt: number) {
    const want = inCh3() && !!flag('flag_ch3_yakisoban') && f.map.id.startsWith('map_c3_aq') && !flag('flag_ch3_yk_left');
    let a = f.actorById(YK) ?? null;
    if (!want) {
      if (a) despawn(YK);
      return;
    }
    const lead = f.actorById('kanenari') ?? f.player;
    if (!a) {
      // a new room: one tile behind グソっ君
      const p = f.player;
      a = placeFollowYk(f, lead.tileX, lead.tileY, p.dir);
      a.x = lead.x;
      a.y = lead.y;
      // a step off グソっ君 (behind him, else beside), not on top of him
      const [dx, dy] = p.dir === 'up' ? [0, 1] : p.dir === 'down' ? [0, -1] : p.dir === 'left' ? [1, 0] : [-1, 0];
      for (const [ex, ey] of [[dx, dy], [dy, dx], [-dy, -dx]] as const)
        if (f.free(a, lead.x + ex * 16, lead.y + ey * 16, true) && Math.hypot(lead.x + ex * 16 - p.x, lead.y + ey * 16 - p.y) > 8) {
          a.x = lead.x + ex * 16;
          a.y = lead.y + ey * 16;
          break;
        }
    }
    if (a.data.scripted) return;
    if (lead.moving) {
      trail.push([lead.x, lead.y, lead.dir]);
      if (trail.length > 120) trail.shift();
    }
    const idx = trail.length - 1 - YK_DELAY;
    if (lead.moving && idx >= 0) {
      const [tx, ty, td] = trail[idx];
      a.moving = Math.hypot(tx - a.x, ty - a.y) > 0.05;
      a.dir = a.moving ? (Math.abs(tx - a.x) > Math.abs(ty - a.y) ? (tx > a.x ? 'right' : 'left') : ty > a.y ? 'down' : 'up') : td;
      a.x = tx;
      a.y = ty;
      trail.splice(0, idx);
    } else if (!lead.moving) a.moving = false;
    a.update(dt);
  },
});

let ykTalk = 0;
registerScript(YK, function* (): Co {
  yield* say3(T.YK_TALK[ykTalk++ % T.YK_TALK.length]);
});

// グソっ君's word of the place in the old aquarium (62 1.8 c3_aq)
let knAq = 0;
for (const m of ['map_c3_aq_iriguchi', 'map_c3_aq_kairo', 'map_c3_aq_diorama', 'map_c3_aq_shinkai', 'map_c3_aq_esa', 'map_c3_aq_hall', 'map_c3_aq_souko', 'map_c3_aq_rouka', 'map_c3_aq_jimusho']) {
  const before = getScript('kanenari_' + m);
  registerScript('kanenari_' + m, function* (ctx): Co {
    if (!inCh3()) {
      if (before) yield* before(ctx);
      else yield* ctx.runDefault();
      return;
    }
    const text = m === 'map_c3_aq_souko' && !flag('flag_ch3_yakisoban') ? T.KN_SOUKO : T.KN_AQ[knAq++ % T.KN_AQ.length];
    yield* say3(`@npc_kanenari\n${text}`);
  });
}

// ================================================================ S24 ヒロスケ・ポコシャ戦

addToMap('map_c3_aq_rouka', [
  { t: 'trig', id: 'trig_ch3_hp', x: 8, y: 3, w: 7, h: 3, script: 'trig_ch3_hp', cond: { flag: 'flag_ch3_yakisoban', notFlag: 'flag_ch3_hp_beaten' } } as unknown as MapObj,
]);

function* evtHp(): Co {
  const f = F();
  const p = f.player;
  const hi = f.actorById('npc_hirosuke');
  const po = f.actorById('npc_pokosha');
  if (hi) hi.data.scripted = true;
  if (po) po.data.scripted = true;
  // face them from a tile off (ヒロスケ (10,3), ポコシャ (12,3), facing west)
  if (p.tileX > 8 || p.tileY !== 3) yield* walk('player', [[Math.min(p.tileX, 8), p.tileY], [8, 3]], { speed: 2.6, face: 'right' });
  p.dir = 'right';
  stopBgm(1.0);
  yield 400;
  yield* say3(T.HP_INTRO);
  // 戦闘（61 13。B）：はなまるを名札に押すまで戦闘の中
  const r = getEnemy('boss_hirosuke')
    ? yield* c3Battle({ enemies: ['boss_hirosuke', 'boss_pokosha'], boss: true, music: 'bgm_boss_madamada', background: 'bg_c3_aq_rouka', canLose: true })
    : 'standin';
  if (r === 'load') return;
  if (po) po.dir = 'left';
  if (hi) hi.dir = 'left';
  // 〔2段目のあと〕：ポコシャの大きな声とぴーちゃんは戦闘の中（B）。戦闘が無いときだけここで
  if (r === 'standin' || (import.meta.env.DEV && flag('flag_qa_c3_nobattle'))) {
    yield* say3(T.HP_STANDIN);
    yield* say3(T.HP_END_A);
  }
  yield* say3(T.HP_END);
  stopBgm(2.0);
  se('se_star', { vol: 0.6 });
  yield* say3(T.HP_END_B);
  setFlag('flag_ch3_hp_beaten', 1);
  // ヒロスケ runs for the entrance, ポコシャ for the PA room (both through the west door)
  const out: [string, Actor | undefined][] = [
    ['npc_hirosuke', hi],
    ['npc_pokosha', po],
  ];
  for (const [id, a] of out) {
    if (!a) continue;
    yield* walk(id, [[a.tileX, 4], [1, 4], [1, 3]], { speed: 4.2 });
    se('se_door', { vol: 0.5 });
    a.visible = false;
    // (their cond is over now: the map takes them off)
    delete a.data.scripted;
  }
  grace();
}
registerScript('trig_ch3_hp', function* (): Co {
  if (inCh3() && flag('flag_ch3_yakisoban') && !flag('flag_ch3_hp_beaten')) yield* evtHp();
});
registerScript('evt_ch3_hp_intro', function* (): Co {
  if (inCh3() && flag('flag_ch3_yakisoban') && !flag('flag_ch3_hp_beaten')) yield* evtHp();
});

