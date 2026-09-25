// 夕鳴公園: evt_kanenari_meet (5.11), evt_kanenari_join (5.12) and the ★
// broadcast that turns the town to stage 2 (evt_maigo_broadcast 5.13).

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag, setFlag } from '../game/state';
import { joinKanenari, syncProgressSkills } from '../data/battle';
import { startBattle } from '../battle/api';
import { playHankoLearn } from '../battle';
import { duckMusic, playAmbient, playBgm, sfx, stopAmbient, stopBgm } from '../audio';
import { actor, despawn, face, mapAudio, msg, refreshFollower, registerScript, setFollowerVisible, shadowSwing, stage, walk } from '../world/api';
import * as T from '../data/text/events';
import { besideToward, F, followerSpot, holdBgm, panBack, panTo, settle, tileRoute } from './lib';
import { bellGlow, ring, sparkle, voiceLine } from './fx';
import { zoomIn, zoomOut } from './stage';
import { registerWorldFx } from '../world/fx';

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
  // the flip board goes up — and on the pause it is turned over: 「（引退しました）」
  k.playAnim('flip');
  sfx('se_flip');
  yield 220;
  let turned = false;
  const turn = () => {
    if (turned) return;
    turned = true;
    k.playAnim('flip_turn');
    sfx('se_flip');
  };
  game.scripts.run(
    (function* (): Co {
      yield 820;
      turn();
    })(),
  );
  yield* msg(T.KANENARI_MEET);
  turn();
  // the PR pose; the clapper of the bell sways — and the PR starts (the
  // battle's own first line says it: 「カネナリくんが PRを はじめた！」)
  k.playAnim('pose');
  sfx('se_flip', { vol: 0.5, pitch: 1.3 });
  yield 650;
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
    yield 200;
    // the bell glows, twice — it does not ring
    k.playAnim('glow');
    for (let i = 0; i < 2; i++) {
      bellGlow(k.x, k.y + BELL_DY, 560);
      ring(k.x, k.y + BELL_DY, '#FFE7A3', 480);
      sfx('se_glint', { vol: 0.45, pitch: 1 + i * 0.12 });
      yield 520;
    }
    sparkle(k.x + 3, k.y + BELL_DY - 5);
    yield 220;
    k.anim = null;
    k.playAnim('flip');
    sfx('se_flip');
    yield 220;
  }
  yield* msg(T.KANENARI_JOIN_FLIP);
  if (k) k.anim = null;
  playBgm('bgm_jingle_join');
  // he is still standing here as himself: the party's follower waits,
  // hidden, until he has walked round into its place (no second Kanenari)
  if (k) setFollowerVisible(false);
  joinKanenari();
  setFlag('flag_kanenari_joined', 1);
  syncProgressSkills();
  yield* msg(T.KANENARI_JOIN_SYS);
  yield* playHankoLearn('skill_hanamaru');
  // he falls in behind Minato: walks round to the follower's place, and
  // the follower takes over right there
  if (k) {
    const p = f.player;
    yield* settle(p);
    const spot = followerSpot();
    const route = spot && tileRoute([k.tileX, k.tileY], spot, [[p.tileX, p.tileY]]);
    if (route && route.length) yield* walk('npc_kanenari', route, { speed: 3 });
    else {
      const [bx, by] = besideToward(p.tileX, p.tileY, k.tileX, k.tileY);
      if (k.tileX !== bx || k.tileY !== by) yield* walk('npc_kanenari', [[bx, by]], { speed: 3 });
    }
    const dir = k.dir;
    despawn('npc_kanenari');
    setFollowerVisible(true);
    if (f.follower) f.follower.dir = dir;
  } else refreshFollower();
  yield 350;
  yield* maigoBroadcast();
}

// ---------------------------------------------------------------- 5.13 evt_maigo_broadcast ★

/** The loudspeaker pole's horns (world px), read from the prop so the framing follows the map. */
function speakerHorns(): [number, number] {
  const f = F();
  const pole = f.props.find((p) => (p.obj as { id?: string }).id === 'obj_speaker_pole' || (p.obj as { prop?: string }).prop === 'obj_speaker_pole');
  // obj_speaker_pole: 30×60, the pole at x 15, the horns at y 16–28
  if (!pole) return [27 * 16 + 8, 3 * 16 - 20];
  return [pole.x + pole.art.ox + 15, pole.y + pole.art.oy + 22];
}

/** Sound going out of the horns while the broadcast is on: arcs travelling outwards. */
const waves = { on: false, t: 0 };
registerWorldFx({
  map: 'map_town',
  update(_f, dt) {
    if (waves.on && !game.scripts.busy) waves.on = false;
    if (waves.on) waves.t += dt;
  },
  draw(_f, g, cx, cy, layer) {
    if (layer !== 'glow' || !waves.on) return;
    const [hx, hy] = speakerHorns();
    for (let i = 0; i < 3; i++) {
      const k = (waves.t / 900 + i / 3) % 1;
      const r = 3 + Math.round(k * 18);
      const a = Math.sin(Math.PI * Math.min(1, k * 1.2)) * 0.9;
      const hh = 2 + Math.round(k * 4);
      for (const side of [-1, 1]) {
        const x0 = Math.round(hx - cx + side * 12);
        const y0 = Math.round(hy - cy);
        g.alpha(a, () => {
          for (let dy = -hh; dy <= hh; dy++) {
            const dx = Math.round(r - (dy * dy) / Math.max(2, r * 0.45));
            // a 2 px arc with a soft shadow under it, so it reads on grass and sky
            g.px(x0 + side * dx, y0 + dy + 1, '#2A2440');
            g.px(x0 + side * dx, y0 + dy, '#FFFFFF');
            g.px(x0 + side * (dx + 1), y0 + dy, '#FFF6D8');
          }
        });
      }
    }
  },
});

function* maigoBroadcast(): Co {
  if (flag('flag_broadcast')) return;
  const f = F();
  holdBgm(true);
  // the camera goes to the loudspeaker pole; the song dips (−9 dB)
  duckMusic(0.35, 30);
  const [hx, hy] = speakerHorns();
  yield* panTo(Math.floor(hx / 16), Math.floor(hy / 16) + 3, 800);
  // then close in on the horns (2×): this is where the voice comes from
  const z = yield* zoomIn(hx, hy + 18, 380);
  setFlag('flag_broadcast_on', 1);
  waves.on = true;
  waves.t = 0;
  // 「ピンポンパンポーン。」 is typed along with the four notes
  sfx('se_pa_chime');
  yield 200;
  yield* msg(T.BROADCAST);
  // the last line comes in a child's voice: no window, no name — the words alone
  yield* voiceLine(T.BROADCAST_LAST, { y: 150, cps: 6, hold: 900, voice: 'broadcast_child', lead: 250 });
  // its echo, three times, fading
  yield 600;
  sfx('se_pa_chime_end', { vol: 0.7 });
  yield 550;
  waves.on = false;
  yield* zoomOut(z, 380);
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
  yield 1300;
  // one window: the shadows, a pause — the chain comes off in it — and the chain
  setFlag('flag_parking_open', 1);
  let chained = false;
  const chain = () => {
    if (!chained) sfx('se_chain', { vol: 0.55, pan: 0.7 });
    chained = true;
  };
  game.scripts.run(
    (function* (): Co {
      yield 1250;
      chain();
    })(),
  );
  yield* msg(T.BROADCAST_SHADOWS);
  chain();
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
