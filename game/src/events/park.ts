// 夕鳴公園: evt_kanenari_meet (5.11 — グソっ君, fallen and hungry, and the
// leftover yakisoba), evt_kanenari_join (5.12), the lesson (5.12b) and the ★
// broadcast that turns the town to stage 2 (evt_maigo_broadcast 5.13).

import type { Co } from '../engine/co';
import type { Actor } from '../world/actor';
import { game } from '../engine/game';
import { flag, removeItem, setFlag, state } from '../game/state';
import { joinKanenari, syncProgressSkills } from '../data/battle';
import { startBattle } from '../battle/api';
import { LESSON_BATTLE, playHankoLearn } from '../battle';
import { LESSON_FIELD } from '../data/battle/text_lesson';
import { chapter1Cleared } from '../ui/flow';
import { duckMusic, playAmbient, playBgm, sfx, stopAmbient, stopBgm } from '../audio';
import { actor, despawn, face, mapAudio, msg, refreshFollower, registerScript, setFollowerVisible, shadowSwing, stage, walk } from '../world/api';
import * as T from '../data/text/events';
import { besideToward, F, followerSpot, holdBgm, panBack, panTo, settle, tileRoute } from './lib';
import { sparkle, voiceLine } from './fx';
import { zoomIn, zoomOut } from './stage';
import { registerWorldFx } from '../world/fx';

// ---------------------------------------------------------------- 5.11 evt_kanenari_meet

/**
 * ★2026-09-29 (04_gusokkun_plan 2章 3, 10_narrative 5.11): グソっ君 lies on his
 * back under the clock tower, his little legs paddling slowly — too hungry
 * to move. しゅん gives him the leftover yakisoba from 焼きそばのたかし (the
 * key item goes); he eats, freezes, and the first land food hits him. He
 * gives his name, asks to come along, and joins — and はなまる rises in the
 * case (しゅん saw him well again). No join battle any more.
 */
registerScript('evt_kanenari_meet', function* (): Co {
  if (flag('flag_kanenari_joined')) return;
  const f = F();
  const k = actor('npc_kanenari');
  if (!k) return;
  k.data.scripted = true;
  face('player', 'npc_kanenari');
  f.player.moving = false;
  // right next to him, しゅん would hide him (he is small, lying down): a step back
  yield* stepBack(k);
  yield 250;
  const first = !flag('flag_met_kanenari');
  setFlag('flag_met_kanenari', 1);
  yield* msg(first ? T.KANENARI_MEET : T.KANENARI_MEET_AGAIN);
  if (!state.inventory.includes('item_urenokori')) {
    yield* msg(T.KANENARI_NOFOOD);
    delete k.data.scripted;
    return;
  }
  if ((yield* msg(T.KANENARI_GIVE_Q)) !== 0) {
    yield* msg(T.KANENARI_GIVE_NO);
    delete k.data.scripted;
    return;
  }
  yield* kanenariEats();
  yield* kanenariJoin();
});

/** しゅん steps back a tile from him (facing him still), when there is room. */
function* stepBack(k: Actor): Co {
  const f = F();
  const p = f.player;
  const dx = p.tileX - k.tileX;
  const dy = p.tileY - k.tileY;
  if (Math.abs(dx) + Math.abs(dy) !== 1) return;
  const tx = p.tileX + dx;
  const ty = p.tileY + dy;
  if (!f.free(p, tx * 16 + 8, ty * 16 + 16, true)) return;
  yield* walk('player', [[tx, ty]], { speed: 2, lockFace: true });
  face('player', 'npc_kanenari');
}

/** The leftover handed over, eaten — the freeze, and the shock. */
function* kanenariEats(): Co {
  const f = F();
  const k = actor('npc_kanenari');
  const p = f.player;
  if (!k) return;
  // しゅん crouches and holds the pack out; it is gone from the bag
  removeItem('item_urenokori');
  setFlag('flag_gave_urenokori', 1);
  p.tempPose = 'give';
  sfx('se_paper_bag');
  yield 450;
  p.tempPose = null;
  // the smell: he rolls over and is up on his hind legs in one go
  k.pose = null;
  k.dir = 'down';
  face('npc_kanenari', 'player');
  k.hop(5, 240);
  sfx('se_step_kanenari');
  yield 320;
  // he eats — munch, munch (the pack at his mouth)
  k.playAnim('eat', true);
  for (let i = 0; i < 4; i++) {
    sfx('se_paper_bag', { vol: 0.25, pitch: 1.5 + i * 0.05 });
    yield 420;
  }
  // …and freezes
  k.anim = null;
  k.tempPose = 'eat';
  yield 700;
  // the shock: his eyes flash (shock_pack), a jolt, the first land food
  k.tempPose = 'shock_pack';
  k.hop(3, 160);
  sfx('se_emote');
  k.showEmote('exclaim', 1100);
  yield 450;
  yield* msg(T.KANENARI_SHOCK);
  k.tempPose = 'eat';
  yield* msg(T.KANENARI_SEA);
  k.tempPose = null;
  face('npc_kanenari', 'player');
}

// ---------------------------------------------------------------- 5.12 evt_kanenari_join

function* kanenariJoin(): Co {
  const f = F();
  const k = actor('npc_kanenari');
  if (k) {
    k.data.scripted = true;
    k.pose = null;
    face('npc_kanenari', 'player');
    face('player', 'npc_kanenari');
    yield 200;
    // talking with a hand up
    if (k.sprite.anims?.flip) k.playAnim('flip');
  }
  yield* msg(T.KANENARI_NAME);
  if (k) {
    k.anim = null;
    // he is glad: his eyes flash twice
    k.playAnim('glow');
    sparkle(k.x + 3, k.y - 30);
    sfx('se_glint', { vol: 0.45, pitch: 1.1 });
  }
  playBgm('bgm_jingle_join');
  // he is still standing here as himself: the party's follower waits,
  // hidden, until he has walked round into its place (no second one)
  if (k) setFollowerVisible(false);
  joinKanenari();
  setFlag('flag_kanenari_joined', 1);
  syncProgressSkills();
  yield* msg(T.KANENARI_JOIN_SYS);
  if (k) k.anim = null;
  // はなまる: しゅん saw him well again (the hanko case warms, the new hanko rises)
  yield* msg(T.KANENARI_HANAMARU);
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
  yield* knLesson();
  yield* maigoBroadcast();
}

// ---------------------------------------------------------------- 5.12b evt_kn_lesson（練習の戦闘）

/**
 * 2026-09-28, the client: the first fight after he joins is a lesson — グソっ君
 * teaches たたく → ハンコ → ツッコミ on his cardboard 練習台, and しゅん shows him
 * みました (battle/lesson.ts, 20 10.6). Once per game; on a device where chapter 1
 * was cleared he asks first (「知ってる」 skips it).
 */
function* knLesson(): Co {
  if (flag('flag_kn_lesson')) return;
  const f = F();
  const k = f.follower;
  if (k) {
    const p = f.player;
    const dx = k.x - p.x;
    const dy = k.y - p.y;
    p.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
    k.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'left' : 'right') : dy > 0 ? 'up' : 'down';
    yield 200;
    if (k.sprite.anims?.flip) k.playAnim('flip');
  }
  let skip = false;
  if (chapter1Cleared()) {
    skip = (yield* msg(LESSON_FIELD.openAgain)) === 1;
    yield* msg(skip ? LESSON_FIELD.skip : LESSON_FIELD.ready);
  } else yield* msg(LESSON_FIELD.open);
  if (k) k.anim = null;
  setFlag('flag_kn_lesson', 1);
  if (skip) {
    yield 250;
    return;
  }
  yield* startBattle(LESSON_BATTLE);
  yield 450;
}

registerScript('evt_kn_lesson', function* (): Co {
  yield* knLesson();
});

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
  // グソっ君 points the way: north-east, where the shadows point
  const k = f.follower;
  if (k) {
    k.data.scripted = true;
    k.dir = 'right';
    k.tempPose = 'point';
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
