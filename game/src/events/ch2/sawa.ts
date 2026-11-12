// マルととまたろうの話・沢の上「水の 元」(50_ch2_story 3.10・10.22、52 4.6、53 12.18、
// 02 #65。2026-09-29 依頼主の採用：げむきかの案2・3を2人の話として1本に)
//
//   tomeSawa()        トマじい（とまたろう）の足す台詞。npcs.ts の台本が先に聞く：
//                     〔wait〕戸の前で待っている／〔ishi〕名前の石を見せる／
//                     〔maru〕第1章のマルの伝言（またはマルに会っただけ）／
//                     〔h1_3〕沢の頼み（段階1〜2、おつかれさまのあと）→ evtSawaAsk
//   evtSawaAsk        頼み → 暗転 → 電気柵の戸 (14,1) の前。トマじいが取っ手をはずす
//                     （flag_ch2_sawa_open）。そのまま戸の横 (15,2) で待つ（flag_ch2_sawa_wait）
//   evt_ch2_seki      セキトメのシンボル（沢の上 (14–17,11)）にふれたとき：監視員の
//                     「閉場 1分前です。……ずっと。」→ 戦闘 → 石がほどけて飛び石に
//                     （flag_ch2_sawa_seki、星が下へ流れ、取水口の水が太くなる）
//   evt_ch2_sawa_back 沢から戸を出たところ (14,2)：「水の 音が 太うなった。」
//                     （名前の石を持っていれば〔ishi〕も）→ トマじいは水口へもどる
//   fumiSawa()        まつ先生〔sawa〕（セキトメのあと、1回）
//   調べる物          沢の上の obj_sawa_*、わき水（HP 全回復、何度でも）、名前の石

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, hasItem, removeItem, setFlag, state } from '../../game/state';
import { defeatSymbol, face, registerScript, walk } from '../../world/api';
import type { Actor } from '../../world/actor';
import { seAt } from '../../world/audio';
import { field } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { runMsg, SPEAKERS } from '../../world/msg';
import { MARU_TOME, SAWA_EVT, SAWA_FLIP, SAWA_FUMI, SAWA_OBJ, SAWA_WAKIMIZU } from '../../data/text/maru';
import { F, getKeyItem } from '../lib';
import { se } from './compat';
import { firstThisLoad, hStage, say, storyBattle } from './common';

SPEAKERS.npc_maru ??= { name: 'マル', voice: 'maru' };

export const SEKI = 'sym_hoshi_sawa_02';
const TOME = 'npc_hoshi_tome';

// ---------------------------------------------------------------- トマじい

/** The next talk to トマじい, when one of the stream's (or マル's) lines is due. True when one was said. */
export function* tomeSawa(): Co<boolean> {
  // waiting by the fence's door for しゅん to come back down
  if (flag('flag_ch2_sawa_wait')) {
    if (hasItem('item_namae_ishi') && !flag('flag_ch2_sawa_ishi')) {
      yield* ishiStory();
      return true;
    }
    yield* say(MARU_TOME.wait);
    return true;
  }
  // the name stone, brought down from the stream (later than the way back)
  if (hasItem('item_namae_ishi') && !flag('flag_ch2_sawa_ishi')) {
    yield* ishiStory();
    return true;
  }
  // マル's word from chapter 1 (after 〔h0_2〕 「ばあさんは、町の 娘の とこへ」, or from stage 1 on)
  const dengon = flag('flag_maru_dengon') > 0;
  if (!flag('flag_ch2_maru_told') && (dengon || flag('flag_met_maru')) && (flag('flag_seen_npc_hoshi_tome_h0_2') || hStage() >= 1)) {
    setFlag('flag_ch2_maru_told', dengon ? 2 : 1);
    yield* say(dengon ? MARU_TOME.dengon : MARU_TOME.met);
    return true;
  }
  // 〔h1_3〕 the request: the upper intake's water is thin
  if (hStage() >= 1 && hStage() <= 2 && flag('flag_ch2_got_otsukare') && !flag('flag_ch2_sawa_open')) {
    yield* evtSawaAsk();
    return true;
  }
  return false;
}

/** 〔ishi〕 the name stone shown: how マル came up on the 5 o'clock bus, the promise; he keeps it. */
function* ishiStory(): Co {
  yield* say(MARU_TOME.ishi);
  se('se_page');
  removeItem('item_namae_ishi');
  setFlag('flag_ch2_sawa_ishi', 1);
  yield* runMsg(SAWA_EVT.ishi_give);
  yield* say(MARU_TOME.ishi_keep);
}

/** 〔h1_3〕 → up to the fence's door: he unhooks its yellow handle and waits there. */
export function* evtSawaAsk(): Co {
  yield* say(MARU_TOME.ask);
  yield* game.fadeOut(400, '#0B0B14');
  setFlag('flag_ch2_sawa_wait', 1);
  const f = F();
  // the placement by the water inlet goes (even if the talk left it scripted), the one by the door comes
  for (const a of [...f.actors]) if (a.id === TOME && a.tileY !== 2) f.removeActor(a);
  f.refreshPresence();
  const p = f.player;
  p.moving = false;
  p.path = [];
  p.x = 14 * 16 + 8;
  p.y = 2 * 16 + 16;
  p.dir = 'up';
  f.syncFollower(true);
  f.snapCamera();
  const t = f.actorById(TOME);
  if (t) {
    t.data.scripted = true;
    t.dir = 'up';
  }
  yield* game.fadeIn(400);
  yield 300;
  // the handle off the wires, hooked on the post: the door `g` lets them through
  se('se_h_gate_hook');
  setFlag('flag_ch2_sawa_open', 1);
  yield 600;
  if (t) t.dir = 'left';
  yield 150;
  yield* say(MARU_TOME.open);
  if (t) delete t.data.scripted;
}

/** Out of the stream's door with the dam undone: the water's sound; then he goes back to his inlet. */
registerScript('evt_ch2_sawa_back', function* (): Co {
  if (!flag('flag_ch2_sawa_seki') || flag('flag_ch2_sawa_back')) return;
  setFlag('flag_ch2_sawa_back', 1);
  const f = F();
  const p = f.player;
  p.moving = false;
  p.path = [];
  const t = f.actors.find((a) => a.id === TOME && a.tileX === 15 && a.tileY === 2) ?? null;
  if (t) {
    t.data.scripted = true;
    face(TOME, 'player');
    p.dir = 'right';
  }
  yield 250;
  yield* say(MARU_TOME.back);
  if (hasItem('item_namae_ishi') && !flag('flag_ch2_sawa_ishi')) yield* ishiStory();
  if (!t) {
    setFlag('flag_ch2_sawa_wait', 0);
    return;
  }
  // along the top ridge and down the stone steps to his water inlet (21,11); the player may walk on
  const walker: Actor = t;
  game.scripts.run(
    (function* (): Co {
      yield* walk(TOME, [[20, 2], [20, 11], [21, 11]], { speed: 2.4, face: 'down' });
      setFlag('flag_ch2_sawa_wait', 0);
      const g = field();
      if (g && g.actors.includes(walker)) {
        g.removeActor(walker);
        g.refreshPresence();
      }
    })(),
  );
});

/** A walk cut short by leaving the village: the next time in, he is at his inlet. */
registerWorldFx({
  map: 'map_hoshimidai',
  update() {
    if (!flag('flag_ch2_sawa_back') || !flag('flag_ch2_sawa_wait')) return;
    if (firstThisLoad('sawa_back_fix')) setFlag('flag_ch2_sawa_wait', 0);
  },
});

/** The fence's door itself (examined from (14,2)). */
registerScript('obj_hoshi_sawa_gate', function* (): Co {
  se('se_examine');
  yield* runMsg(flag('flag_ch2_sawa_open') ? SAWA_EVT.gate_open : SAWA_EVT.gate_shut);
});

// ---------------------------------------------------------------- まつ先生〔sawa〕

export function* fumiSawa(): Co<boolean> {
  if (!flag('flag_ch2_sawa_seki') || flag('flag_seen_npc_hoshi_fumi_sawa')) return false;
  setFlag('flag_seen_npc_hoshi_fumi_sawa', 1);
  yield* say(SAWA_FUMI);
  return true;
}

// ---------------------------------------------------------------- グソっ君のひとこと（沢の上で1回）

export function sawaFlip(): string | null {
  if (flag('flag_kanenari_flip_hoshi_sawa')) return null;
  setFlag('flag_kanenari_flip_hoshi_sawa', 1);
  return SAWA_FLIP;
}

// ---------------------------------------------------------------- セキトメ

function* evtSeki(): Co {
  if (state.taken[SEKI]) return;
  const f = F();
  const p = f.player;
  p.moving = false;
  p.path = [];
  const fromEast = p.x > 16 * 16;
  p.dir = fromEast ? 'left' : 'right';
  se('se_h_whistle');
  yield 200;
  yield* runMsg(SAWA_EVT.seki_a);
  const r = yield* storyBattle({ enemies: ['enemy_sekitome'], background: 'bg_h_sawa' }, 'sune');
  if (r === 'load') return;
  if (r === 'win') {
    setFlag('flag_ch2_sawa_seki', 1);
    defeatSymbol(SEKI);
    se('se_h_seki_undo');
    game.shake(1, 400);
    yield 700;
    yield* runMsg(SAWA_EVT.seki_b);
    return;
  }
  // fled or lost (and retried): back on the bank the player came from, a moment's grace
  const g = F();
  g.player.x = (fromEast ? 18 : 13) * 16 + 8;
  g.player.y = 11 * 16 + 16;
  g.player.dir = fromEast ? 'left' : 'right';
  g.syncFollower(true);
  g.snapCamera();
  g.invincibleUntil = g.t + 1500;
  if (game.fadeAlpha > 0) yield* game.fadeIn(400);
}
registerScript('evt_ch2_seki', evtSeki);

/** The dam's symbol spans its four stones: the picture and the contact box centred on (16,11)'s left edge. */
let whistleAt = 0;
registerWorldFx({
  map: 'map_hoshi_sawa',
  update(f) {
    const a = f.actorById(SEKI);
    if (!a) return;
    a.ox = -8;
    a.bw = 56;
    a.bh = 10;
    // the lifeguard whistles at whoever comes near (its 'beckon'), softly, now and then
    if (a.pose === 'beckon' && f.t > whistleAt) {
      whistleAt = f.t + 1400;
      seAt('se_h_whistle', a.x + a.ox, a.y - 16, { vol: 0.5 });
    }
  },
});

// ---------------------------------------------------------------- 沢の上の調べる物

type Two = { before: string; after: string };
const undone = () => flag('flag_ch2_sawa_seki') > 0;
const OBJ = SAWA_OBJ as unknown as Record<string, string | Two>;

for (const id of ['obj_sawa_kui', 'obj_sawa_sugi', 'obj_sawa_hokora', 'obj_sawa_sandal', 'obj_sawa_iwa', 'obj_sawa_tobiishi', 'obj_sawa_nagare', 'obj_sawa_pool', 'obj_sawa_fuda'])
  registerScript(id, function* (): Co {
    se('se_examine');
    const t = OBJ[id];
    yield* runMsg(typeof t === 'string' ? t : undone() ? t.after : t.before);
  });

registerScript('obj_sawa_nuta', function* (): Co {
  se('se_examine');
  const t = SAWA_OBJ.obj_sawa_nuta;
  yield* runMsg(state.taken['sym_hoshi_sawa_01'] ? t.after : t.before);
});

// the stream crab (a small NPC on the west bank)
registerScript('obj_sawa_kani', function* (): Co {
  yield* runMsg(SAWA_OBJ.obj_sawa_kani);
});

// わき水: the water's source; a scoop of it heals everyone's HP (as often as he likes; 朱肉 not)
registerScript('obj_sawa_wakimizu', function* (): Co {
  se('se_examine');
  const first = !flag('flag_ch2_wakimizu');
  setFlag('flag_ch2_wakimizu', 1);
  const i = yield* runMsg(first ? SAWA_WAKIMIZU.first : SAWA_WAKIMIZU.again);
  if (i !== 0) return;
  se('se_h_watercup');
  yield 250;
  se('se_heal');
  for (const m of state.party) m.hp = m.maxHp;
  setFlag('flag_ch2_wakimizu_count', flag('flag_ch2_wakimizu_count') + 1);
  yield* runMsg(SAWA_WAKIMIZU.drink);
});

// 名前の石: left on the bank once the dam is undone
registerScript('obj_sawa_ishi', function* (): Co {
  if (flag('flag_ch2_sawa_ishi_get')) return;
  se('se_examine');
  yield* runMsg(SAWA_EVT.ishi);
  setFlag('flag_ch2_sawa_ishi_get', 1);
  yield* getKeyItem('item_namae_ishi', SAWA_EVT.ishi_get);
});
