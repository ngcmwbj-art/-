// evt_ch2_train and evt_ch2_arrive (50_ch2_story 10.3, 52 4.1, 53 12.2): the
// dark car (starlight slanting over the seats, ガタン、ゴトン, no music), and
// after 1.5 s at the front of the car (trig_ch2_train_front, on: 'stay') or
// the driver's second line: the chime, 「つぎは、星見台。」, the brakes, and
// the platform of 星見台 — the train backing away west, the clock turning
// from 19:30 to 4:59, and the first call from the mountain.

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag } from '../../game/state';
import { playAmbient, playBgm, stopAmbient } from '../../audio';
import { despawn, registerScript, setFollowerVisible, spawn, walk } from '../../world/api';
import { runMsg } from '../../world/msg';
import { setClockText, showClock } from '../../ui/hud';
import { hoshiTrainSideImage } from '../../art/props/hoshi_vehicles';
import { HOSHI_NPC } from '../../data/text/hoshi_npcs';
import * as T from '../../data/text/hoshi_events';
import { F } from '../lib';
import { musicParam, paMode, se, space } from './compat';
import { poseAny, unpose } from './common';
import { sceneCall } from './calls';

/** From the prologue (on black): into the car at (2,3) facing east. */
export function* toTrain(): Co {
  const f = F();
  f.loadMap('map_hoshi_train', 2, 3, 'right');
  setFollowerVisible(true);
  f.syncFollower(true);
  f.snapCamera();
  yield* evtTrain();
  yield* game.fadeIn(600);
}

/** The car itself: the room's sound; カネナリくん back in the line. */
export function* evtTrain(): Co {
  space('room');
  musicParam('h_stage', -1);
  playAmbient('amb_h_train', { fade: 0.6 });
  setFollowerVisible(true);
  if (!flag('flag_ch2_arrived')) setClockText('19:30', { cut: true });
}
registerScript('evt_ch2_train', evtTrain);

// ---------------------------------------------------------------- the driver (50 3.4)

registerScript('npc_hoshi_traindriver', function* (): Co {
  const t = HOSHI_NPC.npc_hoshi_traindriver;
  if (!flag('flag_seen_npc_hoshi_traindriver_first')) {
    setFlag('flag_seen_npc_hoshi_traindriver_first', 1);
    yield* runMsg(t.first);
    return;
  }
  // the second time on: 「つぎは、星見台。」 and at once evt_ch2_arrive
  yield* runMsg(t.second);
  if (!flag('flag_ch2_arrived')) yield* evtArrive(true);
});

// ---------------------------------------------------------------- evt_ch2_arrive

/** The train standing at the siding, side-on (52 4.1 / 6.1): its west end tile and y46. */
function spawnSideTrain(): { a: ReturnType<typeof spawn>; door: number } {
  const a = spawn('ch2_arrive_train', 22, 46, { sprite: 'kanenari', ghost: true });
  a.data.scripted = true;
  a.solid = false;
  // the door (px 72–82 of the picture) in front of (25,45), the wheels on y46
  a.x = 25 * 16 + 8 - 77;
  a.y = 46 * 16 + 16;
  const tr = { a, door: 1 };
  a.drawFn = (g, x, y) => {
    const img = hoshiTrainSideImage(tr.door);
    g.img(img, Math.round(x), Math.round(y - img.height));
  };
  return tr;
}

/** `announced`: the driver has just said 「つぎは、星見台。」 himself. */
export function* evtArrive(announced = false): Co {
  if (flag('flag_ch2_arrived')) return;
  const f0 = F();
  f0.player.dir = 'right';
  se('se_h_train_chime');
  yield 700;
  yield* runMsg(announced ? `@npc_hoshi_traindriver\nお忘れもの、\nございませんよう。` : T.ARRIVE_ANNOUNCE);
  // the brakes, the car sways
  se('se_h_train_brake', { vol: 0.6 });
  game.shake(1, 500);
  yield 500;
  stopAmbient('amb_h_train', 0.4);
  yield* game.fadeOut(400, '#0B0B14');
  // the platform: the train already standing on y46, the door open
  const f = F();
  f.loadMap('map_hoshimidai', 25, 45, 'up');
  setFlag('flag_ch2_arrived', 1);
  setFlag('flag_ch2_clock', 0);
  if (flag('flag_ch2_stage') !== 0) setFlag('flag_ch2_stage', 0);
  f.syncFollower(true);
  const k = f.follower;
  if (k) {
    k.x = 25 * 16 + 8;
    k.y = 45 * 16 + 16;
    k.dir = 'up';
    k.visible = false;
  }
  space('yama');
  paMode('yama');
  musicParam('h_stage', 0);
  playAmbient('amb_h_insects', { fade: 2 });
  playAmbient('amb_h_wind', { fade: 2 });
  const train = spawnSideTrain();
  f.snapCamera();
  yield 200;
  yield* game.fadeIn(1000);
  // off the train: one tile north, カネナリくん after him
  yield* walk('player', [25, 44], { speed: 2.5, face: 'up' });
  if (k) {
    k.visible = true;
    k.alpha = 1;
    yield* walk('kanenari', [25, 45], { speed: 2.5, face: 'up' });
    delete k.data.scripted;
  }
  f.syncFollower(false);
  yield 300;
  // the doors shut; unlit, it backs away west, slowly, and out at the edge
  se('se_h_train_door');
  train.door = 0;
  yield 500;
  se('se_train_far', { vol: 0.6 });
  const x0 = train.a.x;
  yield* animate(3600, (q) => (train.a.x = x0 - 460 * ease.quadIn(q)), ease.linear);
  despawn('ch2_arrive_train');
  // カネナリくん comes up beside him (both look north later)
  if (k) {
    yield* walk('kanenari', [[26, 45], [26, 44]], { speed: 2.5, face: 'up' });
    delete k.data.scripted;
  }
  yield 700;
  // 19:30 → ぱらぱら → 4:59 (the last flip lower: stopped); the colon doesn't blink
  showClock(600000);
  for (const [i, pitch] of [1.0, 1.06, 0.9].entries()) {
    se('se_clock_flip', { pitch });
    if (i === 2) setClockText(null);
    yield 120;
  }
  playBgm('bgm_hoshi_night', { fade: 2.0 });
  yield 600;
  yield* runMsg(T.ARRIVE_STATION);
  // 3.0 s later, from the mountain: the chapter's first call
  yield 3000;
  yield* sceneCall(0);
  // they look north (look_hill, 1.0 s)
  const p = F().player;
  const kk = F().follower;
  p.dir = 'up';
  if (kk) kk.dir = 'up';
  poseAny(p, 'look_hill', 'look_up');
  poseAny(kk, 'look_hill', 'look_up');
  yield 1000;
  unpose(p, kk);
  se('se_flip');
  yield* runMsg(T.ARRIVE_FLIP);
}

registerScript('evt_ch2_arrive', function* (): Co {
  if (!flag('flag_ch2_arrived')) yield* evtArrive(false);
});
