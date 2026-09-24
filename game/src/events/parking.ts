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
import { puff, smallVoice } from './fx';
import { forceBoxPos, zoomIn, zoomIntoBattle, zoomPan } from './stage';

/** The close-up's centre sits this far above the machine's feet (world px). */
const FRAME_DY = 6;

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
    yield 250;
    // the camera closes in on it (2×), the machine in the upper middle of
    // the frame, clear of the window below (as for ハト係長)
    const z = yield* zoomIn(vm.x, vm.y - FRAME_DY, 420);
    yield 180;
    // the deep bow, in the close-up: down to 90°, and held — a beat before it speaks
    vm.anim = null;
    vm.tempPose = 'bow_60';
    yield 90;
    vm.tempPose = 'bow_90';
    sfx('se_bow', { vol: 0.5, pitch: 0.7 });
    game.shake(1, 120);
    yield 260;
    // bowing, it thanks nobody, twice (a small balloon: no window)
    smallVoice('sym_town_07', 'アリガトウ ゴザイマシタ', 900);
    yield 1000;
    smallVoice('sym_town_07', 'アリガトウ ゴザイマシタ', 900);
    yield 950;
    forceBoxPos('bottom');
    yield* msg(T.OJIGI_A);
    // it straightens to its lean, and says it once more
    vm.tempPose = 'bow_60';
    yield 90;
    vm.tempPose = null;
    forceBoxPos(null);
    yield 200;
    smallVoice('sym_town_07', T.OJIGI_B, 1000);
    yield 650;
    // a 90° bow, and it jumps a tile forward: DOSUN — the close-up goes with it
    vm.playAnim('bow');
    yield 250;
    vm.hop(8, 300);
    vm.pathSpeed = 3.4 * 16;
    vm.path = [[vm.x, vm.y + 16]];
    game.scripts.run(zoomPan(z, vm.x, vm.y + 16 - FRAME_DY, 300));
    yield () => vm.path.length === 0;
    vm.moving = false;
    sfx('se_ojigi_press', { vol: 0.6 });
    shake(3, 280);
    puff(vm.x, vm.y, '#C8C2B4');
    face('player', 'sym_town_07');
    yield 420;
    // the 「！」 seal lands on this close-up; the field is back at 1× after the battle
    zoomIntoBattle(z);
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
