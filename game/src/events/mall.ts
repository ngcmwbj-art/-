// ショッピングプラザ・ユウナリ: evt_mall_enter (5.15), evt_kaitenyaki
// (fushigi_12, 8.12), evt_maigo_door (5.17), evt_boss_intro (5.18).
// The boss battle itself (phases, final stamp) is the battle team's.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { flag, setFlag, state } from '../game/state';
import { syncProgressSkills } from '../data/battle';
import { playHankoLearn } from '../battle';
import { lvTime } from '../art/props/istate';
import { sfx, stopAmbient } from '../audio';
import { actor, despawn, msg, place, registerScript, spawn } from '../world/api';
import { registerWorldFx } from '../world/fx';
import { fushigiCount, fushigiDone } from '../world/fushigi';
import { stampFushigi } from './stamp';
import * as T from '../data/text/events';
import { KAITENYAKI_AGAIN, KAITENYAKI_ANSWER, KAITENYAKI_FLIP, KAITENYAKI_KEY, KAITENYAKI_PRESSED, KAITENYAKI_SEEN, YAKINAMES, YAKINAMES_KANA } from '../data/text/mall';
import { addMp, eventBattle, F, getKeyItem } from './lib';
import { puff, sparkle } from './fx';
import { bossEyes, bossField, BOSS_FIELD } from './art';
import { forceBoxPos, zoomIn, zoomIntoBattle, zoomOut, zoomPan } from './stage';
import { animate, ease } from '../engine/tween';
import type { FieldScene } from '../world/field';
import { evtEnding } from './ending';

// ---------------------------------------------------------------- 5.15 evt_mall_enter

registerScript('evt_mall_enter', function* (): Co {
  if (flag('flag_mall_entered')) return;
  setFlag('flag_mall_entered', 1);
  const f = F();
  const p = f.player;
  p.path = [];
  p.moving = false;
  yield 350;
  // the hall fits the screen, so the look goes in close instead: 2×, from
  // the entrance up to the dry fountain under the skylight (three tiles), and back
  const z = yield* zoomIn(p.x, p.y - 30, 360);
  yield 250;
  yield* zoomPan(z, 11 * 16, 7 * 16 + 8, 1500);
  yield 300;
  yield* msg(T.MALL_ENTER);
  yield* zoomOut(z, 420);
  if (flag('flag_kanenari_joined')) {
    const k = F().follower;
    if (k) {
      k.data.scripted = true;
      k.tempPose = 'flip_hold';
      sfx('se_flip');
    }
    yield* msg(T.MALL_ENTER_FLIP);
    if (k) {
      k.tempPose = null;
      delete k.data.scripted;
    }
  }
});

// ---------------------------------------------------------------- 8.12 evt_kaitenyaki (fushigi_12 ★ the key)

registerScript('evt_kaitenyaki', function* (): Co {
  sfx('se_examine');
  if (fushigiDone('fushigi_12')) {
    const n = Math.max(1, Math.min(3, flag('flag_yakiname') || 3));
    yield* msg(KAITENYAKI_AGAIN(YAKINAMES[n - 1]));
    return;
  }
  yield* msg(KAITENYAKI_SEEN);
  if (!flag('flag_got_hanko')) return;
  const i = yield* msg(`@sys
『みました』を 押しますか？
? 押す | やめておく`);
  if (i !== 0) return;
  // the seal on the plate; the turning slows and stops (1.2 s)
  yield* stampFushigi('fushigi_12');
  sfx('se_kaitenyaki_stop');
  stopAmbient('amb_kaitenyaki', 1.2);
  yield 1200;
  setFlag('flag_fushigi_12', 1);
  puff(10 * 16, 3 * 16 + 10, '#F4F1E8');
  yield 300;
  // it waits for a name: the three names come up under the page
  const k = yield* msg(`${KAITENYAKI_PRESSED}
? ${YAKINAMES.join(' | ')}`);
  setFlag('flag_yakiname', k + 1);
  yield* msg(KAITENYAKI_ANSWER(YAKINAMES_KANA[k]));
  // the key rolls off the plate: ころん — and the stamp's result with it, in
  // one window (朱肉, みました帳, the key)
  sparkle(10 * 16 + 10, 3 * 16 + 12);
  sfx('se_coin', { pitch: 0.8 });
  addMp(2);
  yield 420;
  yield* getKeyItem('item_maigo_key', KAITENYAKI_KEY(fushigiCount()));
  setFlag('flag_got_maigo_key', 1);
  if (flag('flag_kanenari_joined')) {
    const kn = F().follower;
    if (kn) {
      kn.data.scripted = true;
      kn.tempPose = 'flip_hold';
      sfx('se_flip');
    }
    yield* msg(KAITENYAKI_FLIP(k === 1));
    if (kn) {
      kn.tempPose = null;
      delete kn.data.scripted;
    }
  }
  syncProgressSkills();
  yield* playHankoLearn('skill_yarinaoshi');
  F().applyAudio(false);
});

// ---------------------------------------------------------------- 5.17 evt_maigo_door

function* flip(text: string): Co {
  const k = F().follower;
  if (!flag('flag_kanenari_joined') || !k) {
    yield* msg(text);
    return;
  }
  k.data.scripted = true;
  k.tempPose = 'flip_hold';
  sfx('se_flip');
  yield* msg(text);
  k.tempPose = null;
  delete k.data.scripted;
}

registerScript('evt_maigo_door', function* (): Co {
  sfx('se_examine');
  if (flag('flag_maigo_door_open')) {
    yield* msg(T.MAIGO_DOOR_OPENED);
    return;
  }
  if (!flag('flag_got_maigo_key')) {
    yield* msg(T.MAIGO_DOOR_LOCKED);
    if (flag('flag_kanenari_joined')) yield* flip(T.MAIGO_DOOR_LOCKED_FLIP);
    return;
  }
  yield* msg(T.MAIGO_DOOR_USE);
  sfx('se_door_heavy');
  game.shake(1, 200);
  setFlag('flag_maigo_door_open', 1);
  // the level's 「standing at the opened door」 hint must not fire right now,
  // on top of this flip: it waits until Minato walks away and comes back
  state.taken[REST_KEY] = true;
  rest.armed = false;
  yield 600;
  if (flag('flag_kanenari_joined')) yield* flip(T.MAIGO_DOOR_OPEN_FLIP);
});

registerScript('trig_maigo_door_rest', function* (): Co {
  if (!flag('flag_kanenari_joined')) return;
  yield* flip(T.MAIGO_DOOR_REST_FLIP);
});

/**
 * trig_maigo_door_rest (5.17 「扉の前に立ったとき、一度だけ」): after the door is
 * opened, once Minato has stepped away from it, the next time he stands at
 * the door (x18–20, y2–3) カネナリくん suggests the bench.
 */
const REST_KEY = 'trig:map_mall_2f:trig_maigo_door_rest';
const rest = { armed: false };
const atDoor = (f: FieldScene) => f.player.tileX >= 18 && f.player.tileX <= 20 && f.player.tileY >= 2 && f.player.tileY <= 3;
registerWorldFx({
  map: 'map_mall_2f',
  update(f) {
    if (!flag('flag_maigo_door_open') || flag('flag_maigo_rest_hint') || !flag('flag_kanenari_joined')) return;
    if (!f.controllable || game.scripts.busy) return;
    if (!atDoor(f)) {
      rest.armed = true;
      return;
    }
    if (!rest.armed) return;
    setFlag('flag_maigo_rest_hint', 1);
    state.taken[REST_KEY] = true;
    f.runScriptId('trig_maigo_door_rest', 'trig_maigo_door_rest');
  },
});

// ---------------------------------------------------------------- 5.18 evt_boss_intro: the heap rises

const boss = { rise: 0, pupil: 0, open: 0, t: 0, alpha: 1 };
const BOSS_FOOT: [number, number] = [10 * 16 + 4, 6 * 16 + 2];

/**
 * The risen heap at field scale (1×, drawn for the room: see art.ts
 * bossField). It grows up out of a pool of dusk, revealed from the floor up;
 * the outline wavers (4 frames); the tag eyes open and look for Minato.
 */
function drawRisingBoss(g: Gfx, x: number, y: number): void {
  if (boss.rise <= 0) return;
  boss.t += 16.7;
  const w = BOSS_FIELD.w;
  const h = BOSS_FIELD.h;
  // the pool of dusk it rises from
  const pw = Math.round(22 + 18 * Math.min(1, boss.rise * 1.6));
  for (let i = 0; i < 4; i++) {
    const rw = pw - i * 5;
    const rh = Math.max(2, Math.round(rw * 0.22));
    g.alpha(0.35 + i * 0.12, () => {
      for (let yy = -rh; yy <= rh; yy++) {
        const half = Math.round(rw * Math.sqrt(1 - (yy * yy) / (rh * rh)));
        g.rect(x - half, y - 1 + yy, half * 2, 1, i < 2 ? '#1B1733' : '#0B0B14');
      }
    });
  }
  const img = bossField(Math.floor(boss.t / 140));
  const dx = x - Math.floor(w / 2);
  const dy = y - h + 2 + Math.round((1 - ease.cubicOut(boss.rise)) * 14);
  const shown = Math.round(h * boss.rise);
  g.clip(dx - 2, y + 2 - shown - 14, w + 4, shown + 14, () => {
    g.alpha(boss.alpha, () => {
      g.img(img, dx, dy);
      bossEyes(g, dx, dy, boss.pupil, boss.open);
    });
  });
}

function spawnBoss(): void {
  if (actor('boss_rising')) return;
  const a = spawn('boss_rising', 10, 5, { sprite: 'kanenari', ghost: true });
  a.x = BOSS_FOOT[0];
  a.y = BOSS_FOOT[1];
  a.shadowH = 0;
  a.data.scripted = true;
  a.drawFn = (g, x, y) => drawRisingBoss(g, x, y);
}

registerScript('evt_boss_intro', function* (): Co {
  if (flag('flag_boss_beaten')) return;
  const f = F();
  const p = f.player;
  p.path = [];
  p.moving = false;
  p.dir = 'up';
  // a retry (「戦う前から やりなおす」) comes back to the same stand-off, shorter
  const again = !!flag('flag_boss_intro_seen');
  yield 250;
  if (!again) yield* msg(T.BOSS_A);
  // the camera pushes in on the heap (2×): it shudders and rises in the
  // middle of the screen, the tag eyes open right in front of us
  const z = yield* zoomIn(BOSS_FOOT[0] - 8, BOSS_FOOT[1] - 36, again ? 350 : 700);
  // the heap shudders, 2 px, twice
  for (let i = 0; i < (again ? 1 : 2); i++) {
    lvTime.pileShakeUntil = f.t + 260;
    sfx('se_rumble', { vol: 0.8 + i * 0.1 });
    game.shake(1, 160);
    yield 420;
  }
  // it rises: a big shadow child sitting with its knees up (1.2 s)
  lvTime.pileHidden = true;
  boss.rise = 0;
  boss.pupil = 0;
  boss.open = 0;
  spawnBoss();
  sfx('se_rumble', { vol: 1, pitch: 0.7 });
  const t0 = f.t;
  const riseMs = again ? 700 : 1050;
  yield () => {
    boss.rise = Math.min(1, (f.t - t0) / riseMs);
    return boss.rise >= 1;
  };
  game.shake(2, 200);
  yield again ? 150 : 300;
  // the name-tag eyes open and look for Minato
  yield* animate(260, (k) => (boss.open = k));
  boss.open = 1;
  for (const px of again ? [0] : [-1, 0.8, 0]) {
    const from = boss.pupil;
    const s0 = f.t;
    yield () => {
      const k = Math.min(1, (f.t - s0) / 260);
      boss.pupil = from + (px - from) * k;
      return k >= 1;
    };
    yield 140;
  }
  sfx('se_boss_voice');
  // its face stays up in the close-up; the window keeps to the bottom
  forceBoxPos('bottom');
  yield* msg(again ? T.BOSS_B_AGAIN : T.BOSS_B);
  forceBoxPos(null);
  setFlag('flag_boss_intro_seen', 1);
  // one chime note, E5
  sfx('se_chime_note', { note: 'E5', hold: 0.8 });
  yield 800;
  // the seal lands on the close-up
  zoomIntoBattle(z);
  const r = yield* eventBattle({ enemies: ['boss_omukaemachi'], boss: true, music: 'bgm_boss', background: 'bg_boss' });
  if (r === 'load') return;
  if (r === 'retry') {
    // back at the door, the heap as it was
    despawn('boss_rising');
    lvTime.pileHidden = false;
    boss.rise = 0;
    place('player', 6, 9, 'up');
    f.snapCamera();
    yield* game.fadeIn(500);
    return;
  }
  despawn('boss_rising');
  yield* evtEnding();
});

// entering 迷子センター again (after a load): the heap is a heap
registerWorldFx({
  map: 'map_mall_maigo',
  update() {
    if (lvTime.pileHidden && !flag('flag_boss_beaten') && !actor('boss_rising')) lvTime.pileHidden = false;
  },
});
