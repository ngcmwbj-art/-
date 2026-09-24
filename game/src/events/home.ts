// ミナトの家: evt_opening (5.2), the 20-second second call, evt_errand (5.3),
// 母 (6.1, evt_mom_rest).

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag, setFlag, state } from '../game/state';
import { actor, emote, face, msg, registerScript, setClock, stage, stopAnim } from '../world/api';
import { registerWorldFx } from '../world/fx';
import { pickTalk } from '../world/interact';
import { caption, showGuide } from '../ui/api';
import { playAmbient, playBgm, sfx, stopAllAmbient, stopBgm } from '../audio';
import * as T from '../data/text/events';
import { NPC } from '../data/text/npcs';
import { uiHud } from '../ui/hud';
import { F, giveKey, healHp, once } from './lib';

// ---------------------------------------------------------------- 5.2 evt_opening

registerScript('evt_opening', function* (): Co {
  if (flag('flag_opening_done')) return;
  const f = F();
  const p = f.player;
  // black screen; the room waits behind it
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  stopBgm(0);
  stopAllAmbient(0);
  // slumped over the desk: from behind, the head sinks onto the desk top
  p.dir = 'up';
  p.playAnim('sleep', true);
  p.oy = 3;
  p.showEmote('zzz', 0);
  // the higurashi through the window (−8 dB, LP 2.5 kHz), 2 s
  playAmbient('amb_higurashi', { vol: 0.4, lp: 2500, fade: 2 });
  yield 700;
  yield* caption(T.OPENING_CAPTION, { gap: 600, hold: 800 });
  playAmbient('amb_fan', { fade: 1.2 });
  yield* game.fadeIn(1200);
  // the clock plate slides in
  setClock(0, false);
  yield 1000;
  yield* msg(T.OPENING_CALL);
  p.emote = null;
  yield* emote('player', 'exclaim');
  // up from the desk (2 frames), turn round
  p.playAnim('wake');
  p.oy = 1;
  yield 90;
  p.oy = 0;
  p.hop(3, 200);
  yield 260;
  stopAnim('player');
  p.dir = 'down';
  yield 120;
  playBgm('bgm_home', { fade: 1.5 });
  setFlag('flag_opening_done', 1);
  showGuide(T.GUIDE_MOVE, 4000);
});

// 20 s without going down: the second call, once
let callT = 0;
registerWorldFx({
  map: 'map_home_2f',
  update(f, dt) {
    if (!flag('flag_opening_done') || flag('flag_errand') || flag('flag_opening_call2')) {
      callT = 0;
      return;
    }
    if (!f.controllable) return;
    callT += dt;
    if (callT >= 20000) {
      setFlag('flag_opening_call2', 1);
      f.startScript(
        (function* () {
          yield* msg(T.OPENING_CALL2);
        })(),
      );
    }
  },
});

// ---------------------------------------------------------------- 5.3 evt_errand

function* momTurns(): Co {
  const mom = actor('npc_mother');
  if (!mom) return;
  mom.data.scripted = true;
  mom.pose = null;
  mom.tempPose = 'turn';
  yield 160;
  mom.tempPose = null;
  face('npc_mother', 'player');
}

function momBackToWork(): void {
  const mom = actor('npc_mother');
  if (!mom) return;
  mom.dir = 'up';
  mom.pose = 'chop';
  delete mom.data.scripted;
}

function* evtErrand(): Co {
  if (flag('flag_errand')) return;
  const f = F();
  f.player.moving = false;
  f.player.path = [];
  yield 150;
  // the chopping stops; she turns round
  yield* momTurns();
  face('player', 'npc_mother');
  yield 200;
  yield* msg(T.ERRAND_A);
  state.money += 500;
  giveKey('item_gamaguchi');
  giveKey('item_otsukai_memo');
  // the @sys lines say it; no HUD pick-up cards on top of them
  yield 34;
  uiHud.clearNotes();
  playBgm('bgm_jingle_item');
  yield* msg(T.ERRAND_GET);
  yield* msg(T.ERRAND_B);
  setClock(1);
  setFlag('flag_errand', 1);
  yield 400;
  momBackToWork();
}
registerScript('evt_errand', evtErrand);

// ---------------------------------------------------------------- 6.1 母 / evt_mom_rest

function* momRest(text: string, after?: string): Co {
  yield* msg(text);
  healHp();
  sfx('se_heal');
  setFlag('flag_mom_rest', flag('flag_mom_rest') + 1);
  if (after) yield* msg(after);
  else yield* msg(T.MOM_REST_SYS);
}

registerScript('npc_mother', function* (): Co {
  const s = stage();
  if (s === 0 && !flag('flag_errand')) {
    yield* evtErrand();
    return;
  }
  if (s >= 3) return;
  yield* momTurns();
  const t = NPC.npc_mother;
  if (s === 0) {
    if (flag('flag_met_maruyama') && once('flag_seen_npc_mother_s0_meat')) yield* msg(t.s0_meat);
    else {
      const key = pickTalk('npc_mother', { s0_1: t.s0_1, s0_2: t.s0_2 }) ?? 's0_2';
      yield* msg(t[key]);
    }
  } else if (s === 1) {
    const key = pickTalk('npc_mother', { s1_1: t.s1_1, s1_2: t.s1_2 }) ?? 's1_2';
    yield* momRest(t[key]);
  } else {
    const key = pickTalk('npc_mother', { s2_1: t.s2_1, s2_2: t.s2_2 }) ?? 's2_2';
    if (key === 's2_1') yield* momRest(t.s2_1, t.s2_1_after);
    else yield* momRest(t.s2_2);
  }
  yield 350;
  momBackToWork();
});
