// 夕鳴公園: evt_kanenari_meet (5.11), evt_kanenari_join (5.12) and the ★
// broadcast that turns the town to stage 2 (evt_maigo_broadcast 5.13).

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag, setFlag } from '../game/state';
import { joinKanenari, syncProgressSkills } from '../data/battle';
import { startBattle } from '../battle/api';
import { playHankoLearn } from '../battle';
import { duckMusic, playAmbient, playBgm, sfx, stopAmbient, stopBgm } from '../audio';
import { actor, despawn, face, mapAudio, msg, refreshFollower, registerScript, shadowSwing, stage } from '../world/api';
import * as T from '../data/text/events';
import { besideToward, F, holdBgm, panBack, panTo } from './lib';
import { ring, sparkle } from './fx';

const BELL_DY = -20;

// ---------------------------------------------------------------- 5.11 evt_kanenari_meet

registerScript('evt_kanenari_meet', function* (): Co {
  if (flag('flag_kanenari_joined')) return;
  const f = F();
  const k = actor('npc_kanenari');
  if (!k) return;
  // he stops going round and turns to Minato
  k.data.scripted = true;
  k.anim = null;
  k.moving = false;
  k.path = [];
  face('npc_kanenari', 'player');
  face('player', 'npc_kanenari');
  f.player.moving = false;
  yield 350;
  // the flip board goes up
  k.playAnim('flip');
  sfx('se_flip');
  yield 220;
  yield* msg(T.KANENARI_MEET_1);
  yield 400;
  k.playAnim('flip_turn');
  sfx('se_flip');
  yield 260;
  yield* msg(T.KANENARI_MEET_2);
  // the PR pose; the clapper of the bell sways
  k.playAnim('pose');
  yield 600;
  yield* msg(T.KANENARI_MEET_3);
  setFlag('flag_met_kanenari', 1);
  k.anim = null;
  const r = yield* startBattle({ enemies: ['enemy_kanenari'], music: 'bgm_battle', background: 'bg_kanenari', canLose: false });
  if (r !== 'win') {
    delete k.data.scripted;
    return;
  }
  yield* kanenariJoin();
});

// ---------------------------------------------------------------- 5.12 evt_kanenari_join

function* kanenariJoin(): Co {
  const f = F();
  const k = actor('npc_kanenari');
  if (k) {
    k.data.scripted = true;
    face('npc_kanenari', 'player');
    face('player', 'npc_kanenari');
    yield 300;
    // the bell glows, twice — it does not ring
    k.playAnim('glow');
    for (let i = 0; i < 2; i++) {
      ring(k.x, k.y + BELL_DY, '#FFE7A3', 520);
      sfx('se_glint', { vol: 0.45, pitch: 1 + i * 0.12 });
      yield 520;
    }
    sparkle(k.x + 3, k.y + BELL_DY - 5);
    yield 300;
    k.anim = null;
    k.playAnim('flip');
    sfx('se_flip');
    yield 220;
  }
  yield* msg(T.KANENARI_JOIN_FLIP);
  if (k) k.anim = null;
  playBgm('bgm_jingle_join');
  joinKanenari();
  setFlag('flag_kanenari_joined', 1);
  syncProgressSkills();
  yield* msg(T.KANENARI_JOIN_SYS);
  yield* playHankoLearn('skill_hanamaru');
  // he falls in behind Minato
  if (k) {
    const p = f.player;
    const [bx, by] = besideToward(p.tileX, p.tileY, k.tileX, k.tileY);
    k.pathSpeed = 2.5 * 16;
    k.path = [[bx * 16 + 8, by * 16 + 16]];
    yield () => k.path.length === 0;
    k.moving = false;
    despawn('npc_kanenari');
  }
  refreshFollower();
  yield 1000;
  yield* maigoBroadcast();
}

// ---------------------------------------------------------------- 5.13 evt_maigo_broadcast ★

function* maigoBroadcast(): Co {
  if (flag('flag_broadcast')) return;
  const f = F();
  holdBgm(true);
  // the camera goes to the loudspeaker pole; the song dips (−9 dB)
  duckMusic(0.35, 30);
  yield* panTo(26, 5, 800);
  setFlag('flag_broadcast_on', 1);
  sfx('se_pa_chime');
  yield 1900;
  yield* msg(T.BROADCAST);
  // the last line comes in a child's voice
  yield* msg(T.BROADCAST_LAST);
  // its echo, three times, fading
  yield 1300;
  sfx('se_pa_chime_end', { vol: 0.7 });
  yield 900;
  setFlag('flag_broadcast_on', 0);
  // t=0: back to Minato; the stage-1 song fades away
  stopBgm(1.0);
  game.scripts.run(panBack(600));
  yield 600;
  // t=0.6: every shadow turns north-east (1.2 s); stage 2 colours (1.5 s)
  stopAmbient('amb_still', 1.2);
  playAmbient('amb_s2_town', { fade: 1.5 });
  game.scripts.run(shadowSwing());
  mapAudio();
  yield 1600;
  yield* msg(T.BROADCAST_SHADOWS);
  sfx('se_chain', { vol: 0.55, pan: 0.7 });
  yield 700;
  setFlag('flag_parking_open', 1);
  yield* msg(T.BROADCAST_CHAIN);
  // カネナリくん points the way: north-east, where the shadows point
  const k = f.follower;
  if (k) {
    k.data.scripted = true;
    k.dir = 'right';
    k.tempPose = 'point';
    sfx('se_flip');
    yield 250;
  }
  yield* msg(T.BROADCAST_FLIP);
  if (k) {
    k.tempPose = null;
    delete k.data.scripted;
  }
  setFlag('flag_broadcast', 1);
  setFlag('flag_parking_open', 1);
  holdBgm(false);
  playBgm('bgm_town_s2', { fade: 2.0 });
}

registerScript('evt_kanenari_join', function* (): Co {
  if (!flag('flag_kanenari_joined')) yield* kanenariJoin();
});
registerScript('evt_maigo_broadcast', function* (): Co {
  if (stage() === 1 && flag('flag_kanenari_joined')) yield* maigoBroadcast();
});
