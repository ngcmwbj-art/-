// evt_ch2_ending (50_ch2_story 10.16, 52 6.2〜6.4・12.2, 53 12.14): about 1 min
// 10 s, then ツガオの部屋 (about 55 s) and the title.
//   カット1 the hill: 4:59 on black → 5:00, the morning chime, the tomato
//          rises (cut_h_sunrise), 「……おはよう。」, the bell
//   カット2 the village's morning: the barn, the house, the terraces, the
//          gathering room, the path's mouth (4 s each)
//   カット3 the turning circle: the tomatoes, the send-off, the first bus
//   カット4 夕鳴町's bus stop: 6:12 → 19:31
//   カット5 home: 「……1つ、おまけ？」, the weather
//   カット6 the notebook ② and 「つづく」 (the UI; the clear data is written)
//   カット7 ツガオの部屋 (the UI's cut_tsugao_room; X skips it from the second time)
//   カット8 the title, a morning over 星見台
// Starts on black right after the boss's quiet results.

import type { Co } from '../../engine/co';
import { all } from '../../engine/co';
import { game } from '../../engine/game';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, type Dir } from '../../game/state';
import { ambientEvent, playAmbient, playBgm, setAmbientVol, stopAllAmbient, stopAmbient, stopBgm } from '../../audio';
import { despawn, face, registerScript, roomLights, setFollowerVisible, setGradeH, spawn, takeItem, walk } from '../../world/api';
import type { Actor } from '../../world/actor';
import { field } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { runMsg } from '../../world/msg';
import { clearRecordCh2 } from '../../ui/flow';
import { setClockText, setFieldCurtain, showClock } from '../../ui/hud';
import { openSunriseCut } from '../../ui/cut_sunrise';
import { playEndingNotebookCh2 } from '../../ui/ending';
import { playTsugaoRoom } from '../../ui/cut_tsugao';
import { ditherIn, ditherOut } from '../../ui/transition';
import { uiHud } from '../../ui/hud';
import { getProp } from '../../art/props/registry';
import { hoshiBusImage } from '../../art/props/hoshi_vehicles';
import * as T from '../../data/text/hoshi_events';
import { F, giveKey, holdBgm, panTo } from '../lib';
import { bellGlow, puff, ring, sparkle } from '../fx';
import { morningChime, musicParam, paDistance, paMode, se, seLoop, space } from './compat';
import { poseIf, runCue, unpose } from './common';

// ---------------------------------------------------------------- staging helpers

/** Load a map for a cut: Minato and カネナリくん out of the frame (or placed), the camera on (cx, cy). */
function cutTo(map: string, cx: number, cy: number, o: { show?: boolean; dir?: Dir } = {}): void {
  const f = F();
  f.loadMap(map, cx, cy, o.dir ?? 'down');
  setFollowerVisible(!!o.show);
  f.player.visible = !!o.show;
  f.player.alpha = 1;
  f.syncFollower(true);
  // the night's walkers of the stage-keyed placements stay out of the morning's cuts
  for (const a of f.actors) if (a.kind === 'sym') {
    a.visible = false;
    a.data.scripted = true;
  }
  f.snapCamera();
  uiHud.clearNotes();
}

/** A villager of the map hidden for a cut (our own copy stands where the book says). */
function hideOwn(id: string): void {
  const a = field()?.actorById(id);
  if (a && a.kind === 'npc') {
    a.visible = false;
    a.solid = false;
    a.data.scripted = true;
  }
}

/** Someone for a cut: the villager's own sprite, scripted, ghost. */
function put(id: string, x: number, y: number, dir: Dir, pose?: string): Actor {
  hideOwn(id);
  const a = spawn(`end_${id}`, x, y, { sprite: id, dir, ghost: true });
  a.data.scripted = true;
  if (pose) poseIf(a, pose);
  return a;
}

function* fadeCut(ms = 300): Co {
  yield* game.fadeOut(ms, '#0B0B14');
}

/**
 * A pause between shots that the player can hurry by holding Z (three times
 * as fast), as in chapter 1's ending — the chime, the lines and the voice
 * keep their own time.
 */
function* beat(ms: number): Co {
  let left = ms;
  let last = game.time;
  while (left > 0) {
    yield null;
    const dt = game.time - last;
    last = game.time;
    left -= game.input.down('confirm') ? dt * 3 : dt;
  }
}

// ---------------------------------------------------------------- vehicles drawn by the scenes

/** A drawn vehicle for a cut (the bus leaving, the bus at 夕鳴町's stop). */
function vehicle(id: string, x: number, y: number, img: () => HTMLCanvasElement | null): Actor {
  const a = spawn(id, Math.floor(x / 16), Math.floor(y / 16), { sprite: 'kanenari', ghost: true });
  a.data.scripted = true;
  a.solid = false;
  a.x = x;
  a.y = y;
  a.drawFn = (g, dx, dy) => {
    const im = img();
    if (im) g.img(im, Math.round(dx - im.width / 2), Math.round(dy - im.height));
  };
  return a;
}

/** The turning circle's bus prop (obj_hoshi_bus) is off the map while ours drives. */
const busHidden = { on: false };
registerWorldFx({
  map: 'map_hoshimidai',
  update(f) {
    if (!busHidden.on) return;
    for (const p of f.props) if (p.obj.t === 'obj' && p.obj.id === 'obj_hoshi_bus') p.present = false;
  },
});

// ---------------------------------------------------------------- カット1 丘

function* cut1Hill(): Co {
  const f = F();
  // the field under the black: the plaza, the two at the east fence
  holdBgm(true);
  setFieldCurtain(1);
  game.fadeAlpha = 0;
  if (f.map.id !== 'map_hoshi_hill') f.loadMap('map_hoshi_hill', 21, 4, 'right');
  const p = f.player;
  p.x = 21 * 16 + 8;
  p.y = 4 * 16 + 16;
  p.dir = 'right';
  p.visible = true;
  setFollowerVisible(true);
  f.syncFollower(true);
  const k = f.follower;
  if (k) {
    k.x = 22 * 16 + 8;
    k.y = 5 * 16 + 16;
    k.dir = 'right';
    k.data.scripted = true;
    poseIf(k, 'hold_net');
  }
  f.snapCamera();
  // the dawn palette waits under the curtain
  setGradeH('h3a', 0);
  setFlag('flag_hud_hidden', 0);
  setClockText(null, { cut: true });
  showClock(600000);
  // 4:59 on the dark; 1.0 s; the colon blinks once and it is 5:00
  yield 1000;
  setFlag('flag_ch2_clock', 1);
  se('se_clock_flip');
  setClockText(null);
  yield 400;
  // the morning chime from the loudspeaker; on its first note the dark goes
  // to the blue before dawn (cut_h_sunrise: the sky can't be seen from above)
  paMode('yama');
  paDistance(0);
  const cutBox: { cut: import('../../ui/cut_sunrise').SunriseCut | null } = { cut: null };
  yield* all(
    morningChime((i) => {
      if (i === 0) {
        playAmbient('amb_h_insects', { vol: 0.3, fade: 2 });
        playAmbient('amb_h_wind', { vol: 0.6, fade: 2 });
        game.scripts.run(
          (function* (): Co {
            cutBox.cut = yield* openSunriseCut({ fadeMs: 2000 });
          })(),
        );
      }
      if (i === 4) playAmbient('amb_h_dawn', { fade: 4 });
    }),
  );
  yield () => !!cutBox.cut;
  const cut = cutBox.cut!;
  // the tomato floats out of the net and climbs east; the dawn chord swells
  takeItem('item_hanamaru_tomato');
  playBgm('bgm_hoshi_morning', { fade: 3.0 });
  yield* all(
    cut.rise(),
    (function* (): Co {
      // the sun comes up where it touches the ridge: the insects thin out, the wind drops
      yield 3800;
      stopAmbient('amb_h_insects', 3);
      ambientEvent('amb_h_wind', 'none');
      setAmbientVol('amb_h_wind', 0.4, 3);
      // under the picture the plaza turns morning
      setFieldCurtain(0);
      setGradeH('h3c', 3000);
    })(),
  );
  yield* runMsg(T.END_SUNRISE);
  yield* cut.close(300);
  // back on the plaza in the morning's colours: they look east (1.5 s)
  poseIf(p, 'look_up');
  if (k) poseIf(k, 'look_up');
  yield* beat(1500);
  // カネナリくん bows a little to the sun
  if (k) {
    unpose(k);
    k.dir = 'right';
    k.hop(1, 200);
  }
  yield 500;
  // the second voice (after 「……おいしい。」): no flip, no board
  yield* runMsg(T.END_OHAYOU);
  yield* beat(1000);
  // the bell rings once, by itself
  se('se_bell_kanenari_short');
  if (k) {
    if (k.sprite.anims?.glow) k.playAnim('glow');
    bellGlow(k.x, k.y - 20, 900);
    ring(k.x, k.y - 20, '#FFE7A3', 700);
    sparkle(k.x + 3, k.y - 26, 600);
  }
  // stage 3: the morning's theme at the next bar
  setFlag('flag_ch2_stage', 3);
  setFlag('flag_ch2_clock', 1);
  musicParam('h_stage', 3);
  F().refreshPresence();
  yield* beat(1400);
  unpose(p, k);
  if (k) {
    k.anim = null;
    delete k.data.scripted;
  }
}

// ---------------------------------------------------------------- カット2 村の朝

function* cut2Morning(): Co {
  // 2a the barn: the lights on the timer; マサルさん pushes the feed cart east; the cows get up
  yield* fadeCut(300);
  cutTo('map_hoshi_barn', 11, 6);
  setGradeH('h3c', 0);
  roomLights(false);
  put('npc_hoshi_gen', 4, 6, 'right', 'feed');
  playAmbient('amb_h_barn', { vol: 0.6, fade: 0.3 });
  yield* game.fadeIn(300);
  yield 200;
  roomLights(true);
  se('se_h_barn_light');
  yield 500;
  se('se_h_feed_cart');
  game.scripts.run(walk('end_npc_hoshi_gen', [9, 6], { speed: 1.6 }));
  yield 900;
  se('se_h_moo');
  yield 700;
  yield* runMsg(flag('flag_ch2_barn_work') ? T.END_2A_WORKED : T.END_2A);
  yield* beat(500);

  // 2b the house: he rolls up the east side; the green rows redden from the door to the back
  yield* fadeCut(300);
  stopAmbient('amb_h_barn', 0.3);
  cutTo('map_hoshi_house', 4, 12);
  setGradeH('h3c', 0);
  put('npc_hoshi_mitsu', 7, 15, 'right', 'crank');
  yield* game.fadeIn(300);
  yield 200;
  se('se_h_side_roll');
  yield 900;
  se('se_h_ripen');
  yield 900;
  const m = field()?.actorById('end_npc_hoshi_mitsu');
  if (m) {
    unpose(m);
    m.dir = 'up';
  }
  yield* runMsg(T.END_2B);
  yield* beat(400);

  // 2c the terraces: morning dew; トマじい looks into the water gate; the scarecrows face the fields again
  yield* fadeCut(300);
  cutTo('map_hoshimidai', 24, 10);
  setGradeH('h3c', 0);
  put('npc_hoshi_tome', 21, 11, 'down');
  playAmbient('amb_h_tanada', { vol: 0.8, fade: 0.3 });
  yield* game.fadeIn(300);
  se('se_glint', { vol: 0.3 });
  for (const [x, y] of [[19, 9], [23, 13], [27, 11], [17, 14]] as [number, number][]) sparkle(x * 16 + 8, y * 16 + 4, 380);
  yield* beat(2400);
  stopAmbient('amb_h_tanada', 0.4);

  // 2d the gathering room: the last snore; エー区長 opens the window; the three wake up
  yield* fadeCut(300);
  cutTo('map_hoshi_school', 6, 7);
  setGradeH('h3c', 0);
  const kucho = put('npc_hoshi_kucho', 10, 3, 'up', 'open_window');
  yield* game.fadeIn(300);
  se('se_h_ibiki');
  yield 700;
  se('se_door', { pitch: 1.25, vol: 0.7 });
  yield 500;
  unpose(kucho);
  se('se_h_acha', { pitch: 1.15, vol: 0.8 });
  yield* runMsg(T.END_2D);
  yield* beat(300);

  // 2e the path's mouth: まつ先生 looks up at the morning sun; the truck has gone
  yield* fadeCut(300);
  cutTo('map_hoshimidai', 48, 4);
  setGradeH('h3c', 0);
  put('npc_hoshi_fumi', 47, 2, 'right', 'look_up');
  yield* game.fadeIn(300);
  yield* beat(700);
  yield* runMsg(T.END_2E);
  yield* beat(400);
}

// ---------------------------------------------------------------- カット3 転回場

/** The send-off (52 6.4): each at their own distance, not in a row. */
const SEE_OFF: [string, number, number, Dir][] = [
  ['npc_hoshi_fumi', 29, 42, 'right'],
  ['npc_hoshi_yoshie', 30, 43, 'right'],
  ['npc_hoshi_kucho', 31, 42, 'right'],
  ['npc_hoshi_sawako', 32, 44, 'up'],
  ['npc_hoshi_mitsu', 33, 44, 'up'],
  ['npc_hoshi_tome', 38, 44, 'left'],
  ['npc_hoshi_gen', 40, 43, 'left'],
  ['npc_hoshi_gon', 41, 43, 'left'],
];

function* cut3Bus(): Co {
  yield* fadeCut(300);
  cutTo('map_hoshimidai', 33, 43, { show: true, dir: 'right' });
  setGradeH('h3c', 0);
  const f = F();
  const p = f.player;
  p.visible = true;
  setFollowerVisible(true);
  f.syncFollower(true);
  const k = f.follower;
  if (k) {
    k.x = 32 * 16 + 8;
    k.y = 43 * 16 + 16;
    k.dir = 'right';
    k.data.scripted = true;
  }
  // the camera on (35,42)
  f.camOverride = { x: 35 * 16 + 8, y: 42 * 16 + 8 };
  f.snapCamera();
  const people = SEE_OFF.map(([id, x, y, d]) => put(id, x, y, d));
  const sankado = put('npc_hoshi_busdriver', 37, 43, 'left', 'bag');
  // east of the circle, ツガオ便 in the morning: ヒロスケさん loads ペロリ's boxes
  // (two trips), ポコシャさん with a yellow crate on each shoulder; ツガオさん in
  // the driver's seat, awake in his work cap. No words, no sounds (50 10.16).
  const hiro = put('npc_hirosuke', 43, 43, 'up', 'carry_box');
  put('npc_pokosha', 45, 42, 'left', 'carry2');
  let loading = true;
  game.scripts.run(
    (function* (): Co {
      for (let i = 0; i < 2 && loading; i++) {
        yield 900;
        hiro.dir = 'down';
        yield* walk('end_npc_hirosuke', [43, 44], { speed: 1.6 });
        yield 400;
        yield* walk('end_npc_hirosuke', [43, 43], { speed: 1.6, face: 'up' });
      }
    })(),
  );
  // the clock straight to 6:10 (a cut: no turning over)
  setClockText('6:10', { cut: true });
  const idle = seLoop('se_h_bus_idle', { vol: 0.5 });
  // the exhaust's white grains at the back of the bus (east end)
  let smoke = true;
  game.scripts.run(
    (function* (): Co {
      while (smoke) {
        puff(38 * 16 + 14, 42 * 16 + 12, '#E8E4D8');
        yield 420;
      }
    })(),
  );
  yield* game.fadeIn(300);
  // in the driver's seat ツガオさん, awake in his work cap, gives Minato a small
  // nod just before the tomatoes (50 10.16, 02 8 #12): flag_ch2_tsugao_bow for
  // the truck's picture (about 0.6 s, no sound)
  setFlag('flag_ch2_tsugao_bow', 1);
  yield 300;
  // ペロリ holds out the plastic bag
  const mitsu = people[4];
  mitsu.dir = 'up';
  face(`end_npc_hoshi_mitsu`, 'player');
  poseIf(mitsu, 'give');
  p.dir = 'down';
  yield 300;
  setFlag('flag_ch2_tsugao_bow', 0);
  yield* runMsg(T.END_3_MITSU);
  unpose(mitsu);
  giveKey('item_tomato_omiyage');
  yield 34;
  uiHud.clearNotes();
  playBgm('bgm_jingle_item');
  poseIf(p, 'hold');
  yield* runMsg(T.END_3_GET);
  unpose(p);
  p.dir = 'down';
  yield* runMsg(T.END_3_B);
  // on board: カネナリくん, Minato, then さんかど with the mailbag
  if (k) {
    se('se_step_kanenari');
    yield* walk('kanenari', [[34, 43], [35, 43]], { speed: 2.2, face: 'up' });
    yield* animate(220, (q) => (k.alpha = 1 - q));
    k.visible = false;
  }
  yield* walk('player', [35, 43], { speed: 2.2, face: 'up' });
  yield* animate(220, (q) => (p.alpha = 1 - q));
  p.visible = false;
  yield* walk(`end_npc_hoshi_busdriver`, [35, 43], { speed: 2.2, face: 'up' });
  yield* animate(220, (q) => (sankado.alpha = 1 - q));
  sankado.visible = false;
  se('se_h_bus_door');
  yield 700;
  // the bus leaves west down the road; everyone raises a hand; ふくじんづけ barks once
  loading = false;
  idle.stop(0.2);
  smoke = false;
  busHidden.on = true;
  const busImg = hoshiBusImage('side', true);
  const bus = vehicle('end_bus', 35 * 16 + 32, 43 * 16, () => busImg);
  se('se_h_bus_depart');
  for (const a of people) poseIf(a, 'wave');
  yield 400;
  se('se_dog_bark', { pitch: 1.33 });
  people[7].hop(3, 200);
  const x0 = bus.x;
  yield* animate(2600, (q) => (bus.x = x0 - 260 * ease.quadIn(q)), ease.linear);
  yield* beat(500);
  busHidden.on = false;
  despawn('end_bus');
  if (k) {
    k.alpha = 1;
    delete k.data.scripted;
  }
  p.alpha = 1;
}

// ---------------------------------------------------------------- カット4 夕鳴町のバス停

function* cut4BusStop(): Co {
  yield* fadeCut(300);
  stopBgm(1.0);
  stopAllAmbient(0.8);
  // 夕鳴町 at night again: no music, only the night's insects
  setFlag('flag_bgm_hold', 1);
  cutTo('map_town', 34, 12, { dir: 'down' });
  musicParam('h_stage', -1);
  paMode('town');
  space('night');
  playAmbient('amb_night_insects', { fade: 1.0 });
  const f = F();
  f.camOverride = { x: 38 * 16 + 8, y: 10 * 16 + 8 };
  f.snapCamera();
  // the bus stands in the lane east of the stop (35–36, 9–13), facing north; its door opens on the stop's side
  const back = hoshiBusImage('back', true);
  const bus = vehicle('end_bus_town', 35 * 16 + 16, 13 * 16 + 14, () => back);
  const pool = spawn('end_bus_pool', 34, 11, { sprite: 'kanenari', ghost: true });
  pool.data.scripted = true;
  pool.solid = false;
  pool.alpha = 0;
  pool.drawFn = (g, x, y) => {
    // the bus's warm light on the pavement (#F6D98A α25%, a trapezoid)
    for (let r = 0; r < 18; r++) g.rect(Math.round(x - 6 - r / 3), Math.round(y - 30 + r * 2), Math.round(12 + (r * 2) / 3), 2, '#F6D98A', 0.25 * pool.alpha);
  };
  setClockText('6:12', { cut: true });
  yield* game.fadeIn(300);
  se('se_h_bus_arrive');
  yield 500;
  se('se_h_bus_door');
  yield* animate(300, (q) => (pool.alpha = q));
  // Minato, カネナリくん, さんかど step down
  const p = f.player;
  p.x = 34 * 16 + 8;
  p.y = 12 * 16 + 16;
  p.dir = 'left';
  p.visible = true;
  p.alpha = 1;
  const k = put('kanenari', 34, 11, 'left');
  hideOwn('kanenari');
  const sankado = put('npc_hoshi_busdriver', 34, 13, 'left', 'bag');
  for (const a of [p, k, sankado]) a.alpha = 0;
  yield* animate(300, (q) => {
    for (const a of [p, k, sankado]) a.alpha = q;
  });
  yield 400;
  // 6:12 → ぱらぱら → 19:31 (the clock goes on again)
  showClock(600000);
  for (const [i, pitch] of [1.0, 1.06, 1.12].entries()) {
    se('se_clock_flip', { pitch });
    if (i === 2) setClockText('19:31');
    yield 120;
  }
  yield 500;
  face('end_npc_hoshi_busdriver', 'player');
  yield* runMsg(T.END_4_DRIVER);
  // he nods, shoulders the bag again and walks west off the frame
  sankado.hop(1, 160);
  yield 300;
  game.scripts.run(
    (function* (): Co {
      for (let i = 0; i < 3; i++) {
        se('se_step_asphalt', { vol: 0.6 - i * 0.18 });
        yield 380;
      }
    })(),
  );
  yield* walk('end_npc_hoshi_busdriver', [[33, 13], [26, 13]], { speed: 2.4 });
  despawn('end_npc_hoshi_busdriver');
  // the bus, empty, goes north a little and turns right: back to 星見台
  se('se_h_bus_depart', { vol: 0.6, pan: 0.3 });
  yield* animate(300, (q) => (pool.alpha = 1 - q));
  const y0 = bus.y;
  yield* animate(1000, (q) => (bus.y = y0 - 48 * ease.quadIn(q)), ease.linear);
  const side = hoshiBusImage('side', true);
  const flipped = document.createElement('canvas');
  flipped.width = side.width;
  flipped.height = side.height;
  const fctx = flipped.getContext('2d')!;
  fctx.translate(side.width, 0);
  fctx.scale(-1, 1);
  fctx.drawImage(side, 0, 0);
  bus.drawFn = (g, x, y) => g.img(flipped, Math.round(x - flipped.width / 2), Math.round(y - flipped.height));
  const x0 = bus.x;
  yield* animate(1600, (q) => (bus.x = x0 + 240 * ease.quadIn(q)), ease.linear);
  despawn('end_bus_town');
  despawn('end_bus_pool');
  yield* runMsg(T.END_4_NARR);
  // カネナリくん waves and toddles off towards the crossing
  k.dir = 'right';
  poseIf(k, 'wave');
  yield 500;
  unpose(k);
  game.scripts.run(
    (function* (): Co {
      for (let i = 0; i < 4; i++) {
        se('se_step_kanenari', { vol: 0.7 - i * 0.15 });
        yield 360;
      }
    })(),
  );
  yield* walk('end_kanenari', [[34, 12], [40, 12]], { speed: 1.8 });
  yield* animate(300, (q) => (k.alpha = 1 - q));
  despawn('end_kanenari');
  yield* beat(400);
}

// ---------------------------------------------------------------- カット5 家

function* cut5Home(): Co {
  yield* fadeCut(300);
  stopAllAmbient(0.3);
  cutTo('map_home_1f', 2, 7, { show: true, dir: 'up' });
  setFollowerVisible(false);
  const f = F();
  const p = f.player;
  p.visible = true;
  p.alpha = 1;
  space('room');
  se('se_door');
  playBgm('bgm_night', { fade: 1.5 });
  setClockText(null, { cut: true });
  // the bag of tomatoes in his hand
  const bagArt = getProp('prop_h_tomato_bag', {});
  const bagImg = bagArt?.img({} as never) ?? null;
  const bag = spawn('end_tomato_bag', 2, 7, { sprite: 'kanenari', ghost: true });
  bag.data.scripted = true;
  bag.solid = false;
  bag.drawFn = (g, x, y) => {
    if (bagImg) g.img(bagImg, Math.round(x - 6), Math.round(y - 12));
  };
  const follow = { on: true };
  game.scripts.run(
    (function* (): Co {
      while (follow.on) {
        bag.x = p.x + 7;
        bag.y = p.y - 2;
        yield null;
      }
    })(),
  );
  // mother at the sink, washing up; she turns round
  const mom = f.actorById('npc_mother');
  if (mom) {
    mom.data.scripted = true;
    mom.dir = 'up';
  }
  yield* game.fadeIn(400);
  yield 500;
  if (mom) {
    face('npc_mother', 'player');
    mom.lift = 70;
  }
  yield 300;
  yield* runCue(T.END_5_A, {
    *yawn() {
      poseIf(p, 'yawn');
      yield 900;
      unpose(p);
    },
  });
  setFlag('flag_ch2_omake', 1);
  // the bag onto the low table (9,4)
  follow.on = false;
  bag.x = 9 * 16 + 8;
  bag.y = 4 * 16 + 12;
  se('se_paper_bag', { vol: 0.5 });
  // the camera to the TV beyond the table (0.4 s)
  yield* panTo(8, 3, 400);
  yield 300;
  yield* runMsg(T.END_5_TV);
  yield* beat(500);
}

// ---------------------------------------------------------------- evt_ch2_ending

export function* evtEnding(): Co {
  setFlag('flag_ch2_boss_beaten', 1);
  setFlag('flag_ch2_boss_phase', 0);
  setFlag('flag_ch2_boss_light', 0);
  setFlag('flag_ch2_calls_off', 1);
  // the second time on (a chapter-2 clear record from before), ツガオの部屋 can be skipped
  const seenBefore = !!clearRecordCh2();
  game.fadeColor = '#0B0B14';
  if (game.fadeAlpha < 1) game.fadeAlpha = 1;
  stopBgm(0);
  yield* cut1Hill();
  yield* cut2Morning();
  yield* cut3Bus();
  yield* cut4BusStop();
  yield* cut5Home();
  // カット6: the notebook ②, the case (7 of 10, いただきます's outline), 「つづく」; the clear data is written
  yield* playEndingNotebookCh2({ toTitle: false });
  holdBgm(false);
  setFlag('flag_bgm_hold', 0);
  setFlag('flag_hud_hidden', 0);
  // カット7: ツガオの部屋
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  yield* playTsugaoRoom({ skippable: seenBefore });
  stopBgm(0.3);
  stopAllAmbient(0.3);
  // カット8: the title — the sky over 星見台 is a morning now
  yield* ditherOut(1, '#0B0B14');
  game.fadeAlpha = 0;
  yield 300;
  const { TitleScene } = (yield import('../../ui/title')) as typeof import('../../ui/title');
  game.replaceAll(new TitleScene(true));
  yield* ditherIn(900);
}

registerScript('evt_ch2_ending', function* (): Co {
  if (flag('flag_ch2_clear') && flag('flag_ch2_stage') >= 3 && !flag('flag_ch2_boss_beaten')) return;
  yield* evtEnding();
});

/** QA: one cut of the ending from a prepared state (1–5). */
export const CH2_ENDING_CUTS: Record<number, () => Co> = {
  1: cut1Hill,
  2: cut2Morning,
  3: cut3Bus,
  4: cut4BusStop,
  5: cut5Home,
};
