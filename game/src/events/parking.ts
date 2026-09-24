// モール前: evt_ojigi (5.14) — the vending machine that vanished from the
// ginza bows at the half-open automatic door. 中ボス.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag, setFlag } from '../game/state';
import { sfx } from '../audio';
import { actor, defeatSymbol, face, msg, registerScript, shake } from '../world/api';
import type { Actor } from '../world/actor';
import * as T from '../data/text/events';
import { eventBattle, F, grace, panBack, panTo } from './lib';
import { puff } from './fx';

function freeze(a: Actor): void {
  const st = a.data.sym as { mode: string; timer: number } | undefined;
  if (st) {
    st.mode = 'stun';
    st.timer = 1e9;
  }
  a.blinkUntil = 0;
}

registerScript('evt_ojigi', function* (): Co {
  if (flag('flag_ojigi_beaten')) return;
  const f = F();
  const p = f.player;
  p.path = [];
  p.moving = false;
  const vm = actor('sym_town_07');
  if (!vm) return;
  freeze(vm);
  const home: [number, number] = [vm.x, vm.y];
  for (;;) {
    // the camera goes to the entrance; the LED says 17:00
    p.dir = 'up';
    yield* panTo(50, 7, 800);
    yield 350;
    vm.playAnim('bow');
    yield 500;
    yield* msg(T.OJIGI_A);
    yield 200;
    yield* msg(T.OJIGI_B);
    // a 90° bow, and it jumps a tile forward: DOSUN
    vm.playAnim('bow');
    yield 250;
    vm.hop(8, 300);
    vm.pathSpeed = 3.4 * 16;
    vm.path = [[vm.x, vm.y + 16]];
    yield () => vm.path.length === 0;
    vm.moving = false;
    sfx('se_ojigi_press', { vol: 0.6 });
    shake(3, 280);
    puff(vm.x, vm.y, '#C8C2B4');
    face('player', 'sym_town_07');
    yield 420;
    const r = yield* eventBattle({ enemies: ['enemy_ojigi_jihanki'], music: 'bgm_midboss', background: 'bg_ojigi' });
    if (r === 'load') return;
    if (r === 'win') break;
    // 「戦う前から やりなおす」: back to where it bowed
    vm.x = home[0];
    vm.y = home[1];
    vm.anim = null;
    f.camOverride = null;
    f.snapCamera();
    yield* game.fadeIn(500);
  }
  // it stands up straight, one tile east of the door; the way in is open
  setFlag('flag_ojigi_beaten', 1);
  defeatSymbol('sym_town_07');
  const rest = actor('restored:sym_town_07');
  if (rest) {
    rest.x = 51 * 16 + 8;
    rest.y = 6 * 16 + 16;
  }
  yield 500;
  yield* panBack(600);
  if (flag('flag_kanenari_joined')) {
    const k = f.follower;
    if (k) {
      k.data.scripted = true;
      k.playAnim('bow');
      sfx('se_bow', { vol: 0.5 });
      yield 500;
      k.anim = null;
      k.tempPose = 'flip_hold';
      sfx('se_flip');
      yield 200;
    }
    yield* msg(T.OJIGI_AFTER);
    if (k) {
      k.tempPose = null;
      delete k.data.scripted;
    }
  }
  grace();
});
