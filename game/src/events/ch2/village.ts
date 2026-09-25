// The gathering room and the village's resting places (50_ch2_story 10.4,
// 10.5, 10.18; 53 12.3, 12.15):
//   evt_ch2_yoriai       — the night's meeting: why the morning doesn't come
//   evt_ch2_dark_block   — the dark corridor (and anywhere dark) without a light
//   evt_ch2_save_dosojin — 道祖神 on the road (save)
//   evt_ch2_save_kairan  — the circular on the lectern (save; after the meeting)
//   evt_ch2_save_bench   — the bench on 星見の丘 (HP and 朱肉, then save)
// エー夫人's tea (evt_ch2_rest_yoriai) is in npcs.ts.

import type { Co } from '../../engine/co';
import { flag, setFlag, state } from '../../game/state';
import { emote, face, registerScript, walk } from '../../world/api';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { saveConfirm, saveWithStamp } from '../../ui/save';
import { msgPages } from '../../ui/flow';
import * as T from '../../data/text/hoshi_events';
import { F, getKeyItem, panBack, panTo, stepBack } from '../lib';
import { quietItem } from '../stage';
import { ring, sparkle } from '../fx';
import { ambVol, se } from './compat';
import { firstThisLoad, npc, poseIf, runCue, unpose } from './common';

// ---------------------------------------------------------------- 10.5 evt_ch2_yoriai

export function* evtYoriai(): Co {
  if (flag('flag_ch2_yoriai') || !flag('flag_ch2_arrived')) return;
  const f = F();
  const p = f.player;
  p.dir = 'up';
  // the talk is louder than the snoring (amb_h_school −6 dB while they talk)
  ambVol('amb_h_school', 0.5, 0.6);
  // up the step into the room, カネナリくん beside him: both stand clear of
  // the window (and its name tag at the left) under the ring of cushions
  const k = f.follower;
  if (p.tileY >= 9 && p.tileX >= 3 && p.tileX <= 7) {
    yield* walk('player', [[p.tileX, 9], [7, 9], [7, 8]], { speed: 2.4, face: 'up' });
    if (k && k.visible) yield* walk('kanenari', [[k.tileX, 9], [8, 9], [8, 8]], { speed: 2.4, face: 'up' });
  }
  // the camera goes to the ring of cushions; the people of the meeting
  yield 250;
  yield* panTo(5, 6, 600);
  const kucho = npc('npc_hoshi_kucho');
  const fumi = npc('npc_hoshi_fumi');
  const yoshie = npc('npc_hoshi_yoshie');
  for (const a of [kucho, fumi, yoshie]) if (a) a.data.scripted = true;
  // エー区長 notices them and pushes his glasses up
  yield 300;
  if (kucho) face('npc_hoshi_kucho', 'player');
  yield* emote('npc_hoshi_kucho', 'exclaim', { wait: true });
  yield* runCue(T.YORIAI_A, {
    *yunomi() {
      // two cups on the long desk
      if (yoshie) poseIf(yoshie, 'pour');
      se('se_h_yunomi');
      yield 450;
      se('se_h_yunomi', { pitch: 1.08 });
      yield 350;
      if (yoshie) unpose(yoshie);
    },
    *fumi() {
      // まつ先生 turns round; the star wheel swings, the glasses catch the light
      if (fumi) {
        face('npc_hoshi_fumi', 'player');
        fumi.lift = 70;
        sparkle(fumi.x - 2, fumi.y - 17, 260);
      }
      yield 400;
    },
    *case() {
      // his eyes on Minato's pocket: the case's rim glows red
      se('se_hanko_ready', { vol: 0.35 });
      ring(p.x + 3, p.y - 9, '#F2894B', 500);
      yield 600;
    },
  });
  yield* runMsg(T.YORIAI_CASE);
  yield* runCue(T.YORIAI_B, {
    *map() {
      // エー区長 draws the map on the back of the circular (1.0 s)
      if (kucho) poseIf(kucho, 'write');
      for (let i = 0; i < 6; i++) {
        se('se_pen_write');
        yield 150;
      }
      yield 150;
      if (kucho) unpose(kucho);
    },
  });
  yield* getKeyItem('item_kairan_map', T.YORIAI_GET_MAP);
  yield* runMsg(T.YORIAI_SHUNIKU);
  const ok = yield* quietItem('item_kairan_shuniku');
  se('se_item');
  yield* runMsg(ok ? T.YORIAI_GET_SHUNIKU : `@sys\n回覧板の朱肉を 見つけた。\nでも、もちものが いっぱいだ。`);
  setFlag('flag_ch2_yoriai', 1);
  ambVol('amb_h_school', 1, 1.2);
  yield* panBack(600);
  for (const a of [kucho, fumi, yoshie, k]) if (a) delete a.data.scripted;
  if (fumi) fumi.dir = 'up';
}

registerScript('evt_ch2_yoriai', function* (): Co {
  if (flag('flag_ch2_yoriai') || !flag('flag_ch2_arrived')) return;
  if (!firstThisLoad('evt_ch2_yoriai')) return;
  yield* evtYoriai();
});

// ---------------------------------------------------------------- 10.4 evt_ch2_dark_block

/**
 * Stepping into the dark without the lantern: the input stops for 0.3 s,
 * one step back, and the reason (the first time カネナリくん says a light is
 * needed; the school corridor has its own line after that).
 */
export function* evtDarkBlock(examined = false): Co {
  if (flag('flag_ch2_got_tomato')) return;
  const f = F();
  if (!examined) {
    yield 300;
    stepBack();
    f.syncFollower(true);
  }
  const school = f.map.id === 'map_hoshi_school';
  if (!flag('flag_ch2_dark_block')) {
    setFlag('flag_ch2_dark_block', 1);
    yield* runMsg(T.DARK_FIRST);
    return;
  }
  yield* runMsg(school ? T.DARK_SCHOOL_AGAIN : T.DARK_AGAIN);
}
// walking into it steps him back; examining the dark (obj_hoshi_rouka_dark) only says why
registerScript('evt_ch2_dark_block', function* (ctx): Co {
  yield* evtDarkBlock(ctx.source.startsWith('obj_'));
});
registerScript('trig_ch2_dark_school', function* (): Co {
  yield* evtDarkBlock(false);
});

// ---------------------------------------------------------------- 10.18 セーブ

/** The one page of a msg block (without its speaker / choice lines). */
function pageOf(src: string): string[] {
  return msgPages(src.replace(/^\?.*$/m, ''));
}

function* dosojin(): Co {
  se('se_examine');
  const pages = pageOf(T.SAVE_DOSOJIN);
  yield* runMsg(`@narr\n${pages[0]}`);
  const yes = yield* saveConfirm('narr');
  if (!yes) {
    yield* runMsg(T.SAVE_DOSOJIN_NO);
    return;
  }
  se('se_stamp', { vol: 0.6 });
  const ok = yield* saveWithStamp();
  yield* runMsg(ok ? T.SAVE_DOSOJIN_DONE : T.SAVE_FAILED);
}
registerScript('evt_ch2_save_dosojin', dosojin);
registerScript('obj_hoshi_dosojin', dosojin);

function* kairan(): Co {
  se('se_examine');
  if (!flag('flag_ch2_yoriai')) return;
  const yes = yield* saveConfirm('narr', { text: pageOf(T.SAVE_KAIRAN), options: ['書く', '書かない'] });
  if (!yes) {
    yield* runMsg(T.SAVE_KAIRAN_NO);
    return;
  }
  se('se_pen_write');
  const ok = yield* saveWithStamp();
  if (!ok) {
    yield* runMsg(T.SAVE_FAILED);
    return;
  }
  yield* runMsg(T.SAVE_KAIRAN_DONE);
  if (!flag('flag_ch2_kairan_flip')) {
    setFlag('flag_ch2_kairan_flip', 1);
    se('se_flip');
    yield* runMsg(T.SAVE_KAIRAN_FLIP);
  }
}
registerScript('evt_ch2_save_kairan', kairan);
registerScript('obj_hoshi_kairan', kairan);

function* bench(): Co {
  se('se_examine');
  yield* runMsg(T.SAVE_BENCH);
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = m.maxMp;
    m.status = {};
  }
  se('se_heal');
  const f = field();
  if (f) sparkle(f.player.x, f.player.y - 14, 420);
  const pages = pageOf(T.SAVE_BENCH_HEAL);
  yield* runMsg(`@sys\n${pages[0]}`);
  const yes = yield* saveConfirm('sys');
  if (!yes) return;
  const ok = yield* saveWithStamp();
  yield* runMsg(ok ? T.SAVE_BENCH_DONE : T.SAVE_FAILED);
}
registerScript('evt_ch2_save_bench', bench);
registerScript('obj_hoshi_hill_bench', bench);
