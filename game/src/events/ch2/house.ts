// 西の斜面と3号ハウス (50_ch2_story 10.6〜10.7, 53 12.4〜12.5):
//   evt_ch2_mitsu  — ミツばあ at the door of 3号 (after the gathering)
//   evt_ch2_house  — the first step into the dark house; the far end glows
//   evt_ch2_sune   — a green tomato rolls out and blocks the middle aisle → battle
//   evt_ch2_tomato — 『みました』 on the はなまるトマト (fushigi_ch2_06 ★)
//   evt_ch2_light  — the net becomes a lantern; stage 1 「ともしび」
//   (leaving the house) — ミツばあ: 「見えるぞ。夕焼け色じゃ。」

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, state } from '../../game/state';
import { playBgm, sfx, stopAmbient } from '../../audio';
import { defeatSymbol, face, registerScript, setStage } from '../../world/api';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { uiHud } from '../../ui/hud';
import * as T from '../../data/text/hoshi_events';
import { HOSHI_OBJ } from '../../data/text/hoshi_objects';
import { F, floatLine, giveKey, panBack } from '../lib';
import { burst, ring, sparkle } from '../fx';
import { stampFushigi } from '../stamp';
import { ambVol, musicParam, world } from './compat';
import { animIf, firstThisLoad, hStage, npc, poseIf, storyBattle, unpose } from './common';
import { fushigiReward } from './fushigi';
import { resetCallTimer } from './calls';

// ---------------------------------------------------------------- 10.6 evt_ch2_mitsu

export function* evtMitsu(): Co {
  if (flag('flag_ch2_met_mitsu') || !flag('flag_ch2_yoriai')) return;
  const f = F();
  const m = npc('npc_hoshi_mitsu');
  if (m) {
    m.data.scripted = true;
    // she gets up off the crate (no sound for standing up, 53 12.4) and squints at Minato
    poseIf(m, 'stand');
    face('npc_hoshi_mitsu', 'player');
  }
  f.player.dir = m ? (m.x > f.player.x + 8 ? 'right' : m.x < f.player.x - 8 ? 'left' : m.y < f.player.y ? 'up' : 'down') : f.player.dir;
  yield 500;
  yield* runMsg(T.MITSU_A);
  setFlag('flag_ch2_met_mitsu', 1);
  // she sits back down on the crate; 3号's door opens
  if (m) {
    unpose(m);
    m.dir = 'right';
    delete m.data.scripted;
  }
}
registerScript('evt_ch2_mitsu', evtMitsu);
registerScript('trig_ch2_mitsu', function* (): Co {
  if (flag('flag_ch2_yoriai') && !flag('flag_ch2_met_mitsu')) yield* evtMitsu();
});

// ---------------------------------------------------------------- 10.7 evt_ch2_house

export function* evtHouse(): Co {
  if (state.taken['evt:evt_ch2_house']) return;
  state.taken['evt:evt_ch2_house'] = true;
  if (!firstThisLoad('evt_ch2_house')) return;
  const f = F();
  f.player.dir = 'up';
  // the tomato's own sound: nearer is louder (the world scales it by place)
  ambVol('amb_h_tomato', 1, 0.6);
  yield 450;
  yield* runMsg(T.HOUSE_ENTER);
}
registerScript('evt_ch2_house', evtHouse);

// ---------------------------------------------------------------- 10.7 evt_ch2_sune

/** Where the green tomato rolls out from (the base of the plant west of the aisle) and stops. */
const SUNE_FROM: [number, number] = [3, 8];
const SUNE_AT: [number, number] = [4, 8];

export function* evtSune(): Co {
  if (flag('flag_ch2_sune_beaten')) return;
  for (;;) {
    const f = F();
    const p = f.player;
    p.dir = 'up';
    // the symbol (its field sprite) rolls out of the plant row into the aisle
    const s = f.actorById('sym_hoshi_house_00');
    if (s) {
      s.data.scripted = true;
      s.visible = true;
      s.x = SUNE_FROM[0] * 16 + 8;
      s.y = SUNE_FROM[1] * 16 + 16;
      s.alpha = 0;
      s.dir = 'right';
    }
    yield 250;
    sfx('se_h_roll');
    if (s) {
      const x0 = s.x;
      yield* animate(
        520,
        (q) => {
          s.alpha = Math.min(1, q * 3);
          s.x = x0 + (SUNE_AT[0] * 16 + 8 - x0) * ease.quadOut(q);
          s.y = SUNE_AT[1] * 16 + 16 - Math.round(Math.abs(Math.sin(q * Math.PI * 2)) * 2);
        },
        ease.linear,
      );
      s.y = SUNE_AT[1] * 16 + 16;
      // ぷいっ: its back to Minato
      yield 160;
      s.dir = 'up';
      s.hop(2, 140);
    } else yield 520;
    sfx('se_h_sune');
    yield 200;
    yield* runMsg(T.SUNE_A);
    // a glance at the red one at the far end, and away again
    if (s) {
      s.dir = 'up';
      yield 300;
      s.dir = 'down';
      yield 260;
      s.dir = 'up';
      s.hop(2, 140);
    }
    sfx('se_h_sune', { pitch: 1.1 });
    yield 200;
    yield* runMsg(T.SUNE_B);
    const r = yield* storyBattle({ enemies: ['enemy_sune_tomato'], music: 'bgm_battle', background: 'bg_h_house', canLose: true }, 'sune');
    if (r === 'load') return;
    if (r === 'win') {
      setFlag('flag_ch2_sune_beaten', 1);
      // it goes back up on the plant at (3,8), at the height of the 5th truss
      defeatSymbol('sym_hoshi_house_00');
      if (s) delete s.data.scripted;
      return;
    }
    // 「戦う前から やりなおす」: from the top of the scene, a step back down the aisle
    p.x = 4 * 16 + 8;
    p.y = 11 * 16 + 16;
    p.dir = 'up';
    f.syncFollower(true);
    f.snapCamera();
    yield* game.fadeIn(400);
  }
}
registerScript('evt_ch2_sune', evtSune);
registerScript('trig_ch2_sune', function* (): Co {
  if (!flag('flag_ch2_sune_beaten')) yield* evtSune();
});

// ---------------------------------------------------------------- 10.7 evt_ch2_tomato → evt_ch2_light

/** The はなまるトマト on its vine: plant (5,2), the 5th truss (12 px up from the tile's foot). */
const TOMATO_PX: [number, number] = [5 * 16 + 5, 2 * 16 + 4];

/** After 『押す』 on fushigi_ch2_06. */
export function* evtTomato(): Co {
  if (flag('flag_ch2_got_tomato')) return;
  const f = F();
  const p = f.player;
  const k = f.follower;
  p.dir = 'right';
  // 『みました』 on it
  yield* stampFushigi('fushigi_ch2_06');
  setFlag('flag_fushigi_ch2_06', 1);
  // it blushes: two pulses, the light 1.5× for a moment; the green ones lean towards it
  const [tx, ty] = TOMATO_PX;
  sfx('se_emote_light');
  ambVol('amb_h_tomato', 1.6, 0.6);
  for (let i = 0; i < 2; i++) {
    ring(tx, ty, '#FFE7A3', 380);
    burst(tx, ty, '#F7B070', 300);
    world('pulseDarkLight', 'map_hoshi_house', 1.5, 300);
    yield 300;
  }
  yield 200;
  yield* runMsg(T.TOMATO_A);
  // it lets go of the branch and drops into his hands: ぽすっ
  sfx('se_h_tomato_catch');
  stopAmbient('amb_h_tomato', 0.8);
  sparkle(p.x, p.y - 14, 420);
  setFlag('flag_ch2_tomato_picked', 1);
  poseIf(p, 'hold');
  yield 1000;
  // カネナリくん points at the net on his back
  if (k) {
    k.dir = 'left';
    poseIf(k, 'point');
  }
  yield 300;
  sfx('se_flip');
  yield* runMsg(T.TOMATO_FLIP);
  unpose(k);
  // the net round to the front, the tomato in, the pole on the shoulder: a lantern
  sfx('se_h_lantern_set');
  yield* animIf(p, 'lantern_set', 1200);
  unpose(p);
  // the item: jingle and the two @sys pages; the lantern lights with the flag
  giveKey('item_hanamaru_tomato');
  setFlag('flag_ch2_got_tomato', 1);
  yield 34;
  uiHud.clearNotes();
  playBgm('bgm_jingle_item');
  yield* runMsg(T.TOMATO_GET);
  yield* fushigiReward();
  yield* evtLight();
}
registerScript('evt_ch2_tomato', evtTomato);

/** 10.7 evt_ch2_light: the circle opens (0.8 s, 1.5 → 4.5 tiles), stage 1. */
export function* evtLight(): Co {
  const f = F();
  sfx('se_h_light_spread');
  // fx_h_lantern_on (the world grows the lantern's circle); the stage turns h0 → h1
  world('lanternOn', 800);
  ring(f.player.x - 4, f.player.y - 6, '#FFE7A3', 800);
  setFlag('flag_ch2_stage', 1);
  if (field()?.map.id.startsWith('map_hoshi')) setStage(1, { ms: 800 });
  // the lantern's tune comes in at the next bar
  musicParam('h_stage', 1);
  resetCallTimer();
  yield 2000;
  // at the far end of the east aisle, two green ones look round — and turn their backs
  sfx('se_h_sune', { vol: 0.4 });
  const pair = f.actorById('sym_hoshi_house_01');
  if (pair) {
    pair.dir = 'down';
    yield 380;
    pair.dir = 'up';
    pair.hop(2, 140);
  }
  yield 300;
  yield* runMsg(T.LIGHT_A);
}
registerScript('evt_ch2_light', evtLight);

// ---------------------------------------------------------------- leaving the house

/** 〔ハウスを出たとき〕 (trig_ch2_house_exit, once): she gets up and sees the light. */
export function* houseExitLine(): Co {
  if (!flag('flag_ch2_got_tomato') || flag('flag_ch2_house_exit')) return;
  setFlag('flag_ch2_house_exit', 1);
  const f = F();
  const m = npc('npc_hoshi_mitsu');
  if (m) {
    m.data.scripted = true;
    poseIf(m, 'stand');
    face('npc_hoshi_mitsu', 'player');
  }
  f.player.dir = m && m.x > f.player.x ? 'right' : 'down';
  yield 400;
  yield* runMsg(T.HOUSE_EXIT);
  if (m) {
    unpose(m);
    m.dir = 'right';
    delete m.data.scripted;
  }
}
registerScript('trig_ch2_house_exit', houseExitLine);

/** Out of the house onto the village map (the enter hook calls this). */
export function* leftHouse(): Co {
  const f = F();
  if (f.player.tileX !== 2 || f.player.tileY !== 31) return;
  if (flag('flag_ch2_got_tomato')) {
    if (!flag('flag_ch2_house_exit')) yield* houseExitLine();
    return;
  }
  // before the tomato: once, a look back at the light still on at the far end
  if (flag('flag_ch2_met_mitsu') && !flag('flag_seen_obj_hoshi_house_door')) {
    setFlag('flag_seen_obj_hoshi_house_door', 1);
    floatLine(String(HOSHI_OBJ.obj_hoshi_house_door).replace(/^@narr\n/, ''), 1500);
  }
}

void hStage;
void panBack;
