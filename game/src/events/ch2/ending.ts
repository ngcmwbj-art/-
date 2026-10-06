// evt_ch2_ending (50_ch2_story 10.16, 52 6.2〜6.4・12.2, 53 12.14): about 1 min
// 15 s, then ツガオの部屋 (about 85 s) and the title.
//   カット1 the hill: 4:59 on black → 5:00, the morning chime, the tomato
//          rises (cut_h_sunrise), グソっ君's first sunrise on land
//          (★2026-09-29 カネナリくん→グソっ君: no 「……おはよう。」, no bell)
//   カット2 the village's morning: the barn, the house, the terraces, the
//          gathering room, the path's mouth (4 s each)
//   カット3 the turning circle: the tomatoes (「トマトも 美味いやんけ！」),
//          the send-off, the first bus
//   カット4 夕鳴町's bus stop: 6:12 → 19:31; マル boards (02 #65); しゅんと
//          グソっ君 go home together
//   カット4b the turning circle again: マル steps down, とまたろう meets her
//   カット5 home: 「……1つ、おまけ？」, the weather
//   カット6 the notebook ② and 「つづく」 (the UI; the clear data is written)
//   カット7 ツガオの部屋 (the UI's cut_tsugao_room; X skips it from the second time)
//   カット8 the title, a morning over 星見台
// Starts on black right after the boss's quiet results.
//
// HD-2D (2026-10-06, 依頼主「第２章もHD-2Dにしてみよう」): the cuts run on the
// field, so in HD-2D they are the 3D hill, barn, house, terraces, gathering
// room, turning circle, bus stop and home; each shot gets its lens through
// events/ending.ts's endingView.shot (src/hd2d/cut_ch2.ts CH2_SHOTS) — 2D:
// nothing. What lies on the ground (the bus's light on the pavement) is
// laid there (busPool), the rounds book's close-up opens over マサル's head
// where it is in the 3D barn, the sunrise is drawn over the 3D hill
// (ui/cut_sunrise.ts). The times, the lines and the sounds are the 2D's.

import type { Co } from '../../engine/co';
import { all } from '../../engine/co';
import { game } from '../../engine/game';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag, type Dir } from '../../game/state';
import { ambientEvent, playAmbient, playBgm, setAmbientVol, stopAllAmbient, stopAmbient, stopBgm } from '../../audio';
import { despawn, face, registerScript, roomMorning, setFollowerVisible, setGradeH, spawn, takeItem, walk } from '../../world/api';
import type { Actor } from '../../world/actor';
import { field } from '../../world/field';
import { fxElsewhere, registerWorldFx } from '../../world/fx';
import { makeCanvas } from '../../engine/pixel';
import type { FieldScene } from '../../world/field';
import { endingView } from '../ending';
import { runMsg } from '../../world/msg';
import { clearRecordCh2 } from '../../ui/flow';
import { setClockText, setFieldCurtain, showClock } from '../../ui/hud';
import { openSunriseCut } from '../../ui/cut_sunrise';
import { playEndingNotebookCh2 } from '../../ui/ending';
import { playTsugaoRoom } from '../../ui/cut_tsugao';
import { ditherIn, ditherOut } from '../../ui/transition';
import { uiHud } from '../../ui/hud';
import { getProp } from '../../art/props/registry';
import { feedCartImg, sketchbookImg } from '../../art/props/hoshi_ending_art';
import { playMimawariHanamaru } from '../../ui/cut_mimawari';
import { hoshiBusImage } from '../../art/props/hoshi_vehicles';
import * as T from '../../data/text/hoshi_events';
import { MARU_END } from '../../data/text/maru';
import { F, giveKey, holdBgm, panTo } from '../lib';
import { puff, sparkle } from '../fx';
import { morningChime, musicParam, paDistance, paMode, se, seLoop, space } from './compat';
import { poseIf, runCue, unpose } from './common';
import { forceBoxPos } from '../stage';
import { kanboAtBus, kanboEndSetup } from './dome';

// ---------------------------------------------------------------- staging helpers

/** Load a map for a cut: Minato and グソっ君 out of the frame (or placed), the camera on (cx, cy). */
function cutTo(map: string, cx: number, cy: number, o: { show?: boolean; dir?: Dir; shot?: string } = {}): void {
  const f = F();
  f.loadMap(map, cx, cy, o.dir ?? 'down');
  // (HD-2D: the shot's lens, src/hd2d/cut_ch2.ts; 2D: nothing)
  endingView.shot(f, o.shot ?? null);
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

/**
 * The barn's parked feed cart (prop_h_barn_cart at (1,6)) is off the map
 * while マサルさん pushes it in cut 2a — and after he lets go of it in the
 * aisle: one cart, not two (52 4.3).
 */
const cartHidden = { on: false };
registerWorldFx({
  map: 'map_hoshi_barn',
  update(f) {
    if (!cartHidden.on) return;
    for (const p of f.props) if (p.obj.t === 'prop' && (p.obj as { prop?: string }).prop === 'prop_h_barn_cart') p.present = false;
  },
});

/** The turning circle's bus prop (obj_hoshi_bus) is off the map while ours drives. */
const busHidden = { on: false };
registerWorldFx({
  map: 'map_hoshimidai',
  update(f) {
    if (!busHidden.on) return;
    for (const p of f.props) if (p.obj.t === 'obj' && p.obj.id === 'obj_hoshi_bus') p.present = false;
  },
});

/**
 * HD-2D: the bus's light on the pavement at 夕鳴町's stop is a picture lying
 * on the ground — the 3D view would stand it up like a person — so there the
 * actor is left out and the same trapezoid is laid on the ground, row by row
 * where each lies on screen, under the grade's colour as the 2D world layer
 * takes it. 2D: the actor as it is.
 */
const busPool: { a: Actor | null } = { a: null };
registerWorldFx({
  map: 'map_town',
  anchored: true,
  update(f: FieldScene) {
    const a = busPool.a;
    if (!a) return;
    if (!f.actors.includes(a)) {
      busPool.a = null;
      return;
    }
    a.visible = !fxElsewhere(f);
  },
  draw(f: FieldScene, g, _cx, _cy, layer) {
    const a = busPool.a;
    if (!a || layer !== 'ground' || !fxElsewhere(f) || a.alpha <= 0) return;
    const m = f.grade.mul;
    const col = `rgb(${Math.round((0xf6 * m[0]) / 255)},${Math.round((0xd9 * m[1]) / 255)},${Math.round((0x8a * m[2]) / 255)})`;
    for (let r = 0; r < 18; r++) {
      const wy = a.y - 30 + r * 2;
      const p0 = f.projected(a.x - 6 - r / 3, wy, wy);
      const p1 = f.projected(a.x + 6 + r / 3, wy + 2, wy + 2);
      if (!p0 || !p1) continue;
      g.rect(Math.round(p0[0]), Math.round(p0[1]), Math.max(1, Math.round(p1[0] - p0[0])), Math.max(1, Math.round(p1[1] - p0[1])), col, 0.25 * a.alpha);
    }
  },
});

/**
 * HD-2D: the bus at 夕鳴町's stop seen from behind (art/props/hoshi_vehicles.ts
 * busBack: the long roof seen from above, rows 0–44, over its back face,
 * rows 45–71). Stood up whole like a person it would be a tower, so there the
 * actor is left out and the picture is laid as the town lays a building: the
 * back face standing on the bus's feet line, the roof lying on top of it,
 * reaching north — row by row where each lies on screen, under the grade's
 * colour as the 2D world layer takes it. Side on (as it drives off) it is
 * the actor's picture again. 2D: the actor as it is.
 */
const busBack3d: { a: Actor | null; img: HTMLCanvasElement | null } = { a: null, img: null };
/** busBack's rows: the roof's (0 … FACE_ROW − 1, seen from above) and the back face's (FACE_ROW …). */
const BUS_FACE_ROW = 45;
const busGraded = new Map<string, HTMLCanvasElement>();

function busUnderGrade(img: HTMLCanvasElement, mul: readonly [number, number, number]): HTMLCanvasElement {
  const key = mul.join(',');
  let c = busGraded.get(key);
  if (c) return c;
  if (busGraded.size > 8) busGraded.clear();
  const [o, ctx] = makeCanvas(img.width, img.height);
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${mul[0]},${mul[1]},${mul[2]})`;
  ctx.fillRect(0, 0, img.width, img.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0);
  busGraded.set(key, o);
  c = o;
  return c;
}

registerWorldFx({
  map: 'map_town',
  anchored: true,
  update(f: FieldScene) {
    const a = busBack3d.a;
    if (!a) return;
    if (!f.actors.includes(a)) {
      busBack3d.a = null;
      return;
    }
    if (busBack3d.img) a.visible = !fxElsewhere(f);
  },
  draw(f: FieldScene, g, _cx, _cy, layer) {
    const a = busBack3d.a;
    const src = busBack3d.img;
    if (!a || !src || layer !== 'sorted' || !fxElsewhere(f)) return;
    const img = busUnderGrade(src, f.grade.mul);
    const x0 = a.x - img.width / 2;
    const x1 = x0 + img.width;
    const foot = a.y;
    const faceH = img.height - BUS_FACE_ROW;
    const ctx = g.ctx;
    const slice = (r: number, h: number, p0: [number, number] | null, p1: [number, number] | null) => {
      if (!p0 || !p1) return;
      const w = p1[0] - p0[0];
      const hh = p1[1] - p0[1];
      if (w <= 0 || hh <= 0 || hh > h * 8) return;
      ctx.drawImage(img, 0, r, img.width, h, Math.round(p0[0]), Math.round(p0[1]), Math.round(w), Math.ceil(hh));
    };
    // the roof lying on top, from its far (north) end to the back edge
    for (let r = 0; r < BUS_FACE_ROW; r += 3) {
      const h = Math.min(3, BUS_FACE_ROW - r);
      const gy0 = foot - (BUS_FACE_ROW - r);
      const gy1 = foot - (BUS_FACE_ROW - r - h);
      slice(r, h, f.projected(x0, gy0 - faceH, gy0), f.projected(x1, gy1 - faceH, gy1));
    }
    // the back face standing on the feet line
    for (let r = BUS_FACE_ROW; r < img.height; r += 3) {
      const h = Math.min(3, img.height - r);
      slice(r, h, f.projected(x0, foot - (img.height - r), foot), f.projected(x1, foot - (img.height - r - h), foot));
    }
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
  // (HD-2D: the plaza from a little lower)
  endingView.shot(f, 'h1_plaza');
  // back on the plaza in the morning's colours: they look east (1.5 s)
  poseIf(p, 'look_up');
  if (k) poseIf(k, 'look_up');
  yield* beat(1500);
  // グソっ君 takes a little hop at the sun: his first sunrise on land (the
  // light catches his eyes), then his words
  if (k) {
    unpose(k);
    k.dir = 'right';
    k.hop(1, 200);
    poseIf(k, 'shock');
    sparkle(k.x + 3, k.y - 18, 500);
  }
  yield 500;
  if (k) unpose(k);
  yield* runMsg(T.END_OHAYOU);
  yield* beat(1000);
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
  // 2a the barn (its tubes on all night, 2026-09-26): the morning comes in
  // through the east windows (1.2 s: the white of the tubes warms to the
  // morning, the dim pen fills) and the cows get up and put their heads in
  // the troughs; マサルさん pushes the feed cart east
  yield* fadeCut(300);
  cutTo('map_hoshi_barn', 11, 6, { shot: 'h2_barn' });
  setGradeH('h3c', 0);
  roomMorning(false);
  const gen = put('npc_hoshi_gen', 4, 6, 'right', 'feed');
  cartHidden.on = true;
  playAmbient('amb_h_barn', { vol: 0.6, fade: 0.3 });
  yield* game.fadeIn(300);
  yield 200;
  roomMorning(true, 1200);
  yield 500;
  se('se_h_feed_cart');
  const push = game.scripts.run(walk('end_npc_hoshi_gen', [9, 6], { speed: 1.6 }));
  yield 900;
  se('se_h_moo');
  yield 700;
  yield* runMsg(flag('flag_ch2_barn_work') ? T.END_2A_WORKED : T.END_2A);
  // he lets go of the cart (it stays in the aisle) and, in the day's column
  // of the rounds book, draws a small hanamaru with the red pen from his
  // breast pocket — picture only, no line (50 10.16, 00 1.1)
  yield () => push.done;
  const cartImg = feedCartImg();
  const cart = spawn('end_feed_cart', 9, 6, { sprite: 'kanenari', ghost: true });
  cart.data.scripted = true;
  cart.solid = false;
  cart.x = gen.x;
  cart.y = gen.y - 0.5;
  cart.drawFn = (g, dx, dy) => g.img(cartImg, dx + 2, dy - 12);
  unpose(gen);
  gen.dir = 'down';
  poseIf(gen, 'write');
  yield 250;
  const fc = F();
  // (HD-2D: over his head where it is in the 3D barn)
  const head = fc.projected(gen.x, gen.y - 30, gen.y);
  yield* playMimawariHanamaru(...(head ? [Math.round(head[0]), Math.round(head[1])] : [Math.round(gen.x - fc.camX), Math.round(gen.y - fc.camY - 30)]) as [number, number]);
  unpose(gen);
  yield* beat(400);

  // 2b the house: he rolls up the east side; the green rows redden from the door to the back
  yield* fadeCut(300);
  cartHidden.on = false;
  despawn('end_feed_cart');
  stopAmbient('amb_h_barn', 0.3);
  cutTo('map_hoshi_house', 4, 12, { shot: 'h2_house' });
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
  cutTo('map_hoshimidai', 24, 10, { shot: 'h2_tanada' });
  setGradeH('h3c', 0);
  put('npc_hoshi_tome', 21, 11, 'down');
  playAmbient('amb_h_tanada', { vol: 0.8, fade: 0.3 });
  yield* game.fadeIn(300);
  se('se_glint', { vol: 0.3 });
  for (const [x, y] of [[19, 9], [23, 13], [27, 11], [17, 14]] as [number, number][]) sparkle(x * 16 + 8, y * 16 + 4, 380);
  yield* beat(2400);
  stopAmbient('amb_h_tanada', 0.4);

  // 2d the gathering room: the last snore; ハモ区長 opens the window; the three wake up
  yield* fadeCut(300);
  cutTo('map_hoshi_school', 6, 7, { shot: 'h2_school' });
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
  cutTo('map_hoshimidai', 48, 4, { shot: 'h2_path' });
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
  cutTo('map_hoshimidai', 33, 43, { show: true, dir: 'right', shot: 'h3_bus' });
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
  // 朝の ほうだけ 光る 星 (02 #77): the observatory's key goes back; with the card shown, まつ先生 by the bus door
  kanboEndSetup(people[0]);
  const sankado = put('npc_hoshi_busdriver', 37, 43, 'left', 'bag');
  // east of the circle, ツガオ便 in the morning: ヒロスケさん loads ペロ's boxes
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
  // ペロ holds out the plastic bag
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
  // ペロ hands グソっ君 a split one: 「トマトも 美味いやんけ！」 (the yakisoba's line once more)
  yield* runCue(T.END_3_B, {
    // 朝の ほうだけ 光る 星 (02 #77): the envelope for タクミ to さんかど (only with the card shown)
    *kanbo() {
      yield* kanboAtBus();
    },
    *eat() {
      poseIf(mitsu, 'give');
      yield 300;
      unpose(mitsu);
      if (k) {
        k.dir = 'down';
        poseIf(k, 'eat');
      }
      yield 700;
      if (k) {
        unpose(k);
        poseIf(k, 'shock');
        k.hop(2, 160);
        sparkle(k.x, k.y - 20, 400);
      }
      yield 300;
    },
  });
  if (k) unpose(k);
  // on board: グソっ君, Minato, then さんかど with the mailbag
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
  // everyone raises a hand — ソワカさん, both hands: her sketchbook held up
  // high to the bus, a big red hanamaru copied from Shun's stamp (50 10.16).
  // No line.
  const sowaka = people[3];
  for (const a of people) if (a !== sowaka) poseIf(a, 'wave');
  poseIf(sowaka, 'hold_up');
  const book = sketchbookImg();
  const held = spawn('end_sketchbook', 32, 44, { sprite: 'kanenari', ghost: true });
  held.data.scripted = true;
  held.solid = false;
  held.x = sowaka.x;
  held.y = sowaka.y + 0.5;
  const raisedAt = game.time;
  held.drawFn = (g, dx, dy) => {
    const top = dy - sowaka.frame().height;
    // up in 0.25 s, then a slow 1px sway as she holds it
    const k = Math.min(1, (game.time - raisedAt) / 250);
    const bob = k >= 1 && Math.floor((game.time - raisedAt) / 700) % 2 ? 1 : 0;
    g.img(book, dx - 9, Math.round(top - 11 + (1 - k) * 6 + bob));
  };
  yield 400;
  se('se_dog_bark', { pitch: 1.33 });
  people[7].hop(3, 200);
  const x0 = bus.x;
  yield* animate(2600, (q) => (bus.x = x0 - 260 * ease.quadIn(q)), ease.linear);
  yield* beat(500);
  busHidden.on = false;
  despawn('end_bus');
  despawn('end_sketchbook');
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
  cutTo('map_town', 34, 12, { dir: 'down', shot: 'h4_stop' });
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
  busBack3d.a = bus;
  busBack3d.img = back;
  const pool = spawn('end_bus_pool', 34, 11, { sprite: 'kanenari', ghost: true });
  pool.data.scripted = true;
  pool.solid = false;
  pool.alpha = 0;
  pool.drawFn = (g, x, y) => {
    // the bus's warm light on the pavement (#F6D98A α25%, a trapezoid)
    for (let r = 0; r < 18; r++) g.rect(Math.round(x - 6 - r / 3), Math.round(y - 30 + r * 2), Math.round(12 + (r * 2) / 3), 2, '#F6D98A', 0.25 * pool.alpha);
  };
  busPool.a = pool;
  setClockText('6:12', { cut: true });
  // マル (02 #65) on her walker by the stop, where she has waited since five: in
  // every run, 「第2章から」 too — the picture and her one page
  const maru = put('npc_maru', 32, 10, 'right');
  maru.pose = 'sit';
  yield* game.fadeIn(300);
  se('se_h_bus_arrive');
  yield 500;
  se('se_h_bus_door');
  yield* animate(300, (q) => (pool.alpha = q));
  // Minato, グソっ君, さんかど step down
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
  // 『あした』宛ての手紙, left with him on 星見台 (02_ch2_index #56): its postmark — about 5 s more
  if (flag('flag_ch2_tegami')) {
    yield* runMsg(T.END_4_TEGAMI);
    yield 200;
    sankado.hop(1, 120);
    se('se_stamp_light');
    yield 450;
    yield* runMsg(T.END_4_TEGAMI_STAMP);
  }
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
  // マル gets up off her walker: the five o'clock bus, two and a half hours late.
  // Those who took her word to とまたろう (flag_ch2_maru_told 2) get グソっ君's
  // line and her small bow. Then she pushes the walker to the door (34,10) and boards.
  maru.pose = null;
  maru.hop(1, 160);
  yield 300;
  yield* runMsg(MARU_END.bus);
  if (flag('flag_ch2_maru_told') === 2) {
    p.dir = 'left';
    yield* runMsg(MARU_END.told);
    maru.dir = 'right';
    poseIf(maru, 'bow');
    yield 500;
    unpose(maru);
  }
  yield* walk('end_npc_maru', [[33, 10], [34, 10]], { speed: 1.6, face: 'right' });
  yield* animate(260, (q) => (maru.alpha = 1 - q));
  maru.visible = false;
  se('se_h_bus_door');
  yield 300;
  // the bus, マル aboard, goes north a little and turns right: back to 星見台
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
  // (HD-2D: side on, it stands as the 2D's picture again)
  busBack3d.img = null;
  bus.visible = true;
  const x0 = bus.x;
  yield* animate(1600, (q) => (bus.x = x0 + 240 * ease.quadIn(q)), ease.linear);
  despawn('end_bus_town');
  despawn('end_bus_pool');
  busPool.a = null;
  busBack3d.a = null;
  despawn('end_npc_maru');
  // 「ほな、帰ろか。しゅんの 家。」: the two go home together, west along the
  // road (グソっ君 has been at Shun's side since chapter 1; ★2026-09-29)
  k.dir = 'down';
  p.dir = 'up';
  yield* runMsg(T.END_4_NARR);
  poseIf(k, 'wave');
  yield 400;
  unpose(k);
  game.scripts.run(
    (function* (): Co {
      for (let i = 0; i < 4; i++) {
        se('se_step_kanenari', { vol: 0.6 - i * 0.12 });
        yield 360;
      }
    })(),
  );
  yield* all(walk('end_kanenari', [[33, 11], [27, 11]], { speed: 1.8 }), walk('player', [[33, 12], [27, 12]], { speed: 1.8 }));
  yield* animate(300, (q) => {
    k.alpha = 1 - q;
    p.alpha = 1 - q;
  });
  despawn('end_kanenari');
  p.visible = false;
  p.alpha = 1;
  yield* beat(400);
}

// ---------------------------------------------------------------- カット4b 転回場（マルが帰る）

/**
 * The same bus back on 星見台 in the morning (02 #65, 50 10.16): it stands at
 * the turning circle, idling; とまたろう waits by the stop's sign (no clock plate).
 * マル steps down with her walker (the door (35,43), as in カット3), three pages,
 * the yakisoba handed over, and the two go off up toward the village, one
 * behind the other. About 6 s besides the pages; no music, the morning's birds.
 */
function* cut4bReunion(): Co {
  yield* fadeCut(300);
  stopAllAmbient(0.3);
  cutTo('map_hoshimidai', 35, 42, { shot: 'h4b_bus' });
  setGradeH('h3c', 0);
  // no clock plate here (whose time would it tell?): the HUD is off for this cut
  setClockText(null, { cut: true });
  setFlag('flag_hud_hidden', 1);
  musicParam('h_stage', 3);
  paMode('yama');
  space('yama');
  playAmbient('amb_h_dawn', { vol: 0.8, fade: 0.4 });
  const f = F();
  f.camOverride = { x: 35 * 16 + 8, y: 42 * 16 + 8 };
  f.snapCamera();
  // the map's own bus is off while ours stands there
  busHidden.on = true;
  const busImg = hoshiBusImage('side', true);
  vehicle('end_bus_home', 35 * 16 + 32, 43 * 16, () => busImg);
  const tome = put('npc_hoshi_tome', 33, 44, 'right');
  const idle = seLoop('se_h_bus_idle', { vol: 0.4 });
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
  yield 300;
  se('se_h_bus_door');
  yield 300;
  // マル steps down from the door with the walker, one careful step toward him
  const maru = put('npc_maru', 35, 43, 'down');
  maru.alpha = 0;
  yield* animate(260, (q) => (maru.alpha = q));
  yield* walk('end_npc_maru', [35, 44], { speed: 1.6, face: 'left' });
  yield 300;
  // the two stand low in the frame: the window goes to the top
  forceBoxPos('top');
  yield* runCue(MARU_END.reunion, {
    *give() {
      maru.dir = 'left';
      poseIf(maru, 'give');
      yield 500;
      tome.hop(1, 140);
      yield 200;
      unpose(maru);
    },
  });
  forceBoxPos(null);
  // the bus sits idling; he turns for home up the lane, she follows with the walker
  smoke = false;
  idle.stop(0.6);
  game.scripts.run(walk('end_npc_hoshi_tome', [33, 39], { speed: 1.2 }));
  yield 350;
  game.scripts.run(walk('end_npc_maru', [[34, 44], [33, 44], [33, 40]], { speed: 1.2 }));
  yield* beat(1300);
  yield* fadeCut(400);
  busHidden.on = false;
  despawn('end_bus_home');
  despawn('end_npc_maru');
  despawn('end_npc_hoshi_tome');
  stopAmbient('amb_h_dawn', 0.3);
  setFlag('flag_hud_hidden', 0);
}

// ---------------------------------------------------------------- カット5 家

function* cut5Home(): Co {
  yield* fadeCut(300);
  stopAllAmbient(0.3);
  cutTo('map_home_1f', 2, 7, { show: true, dir: 'up', shot: 'h5_home' });
  // グソっ君 comes home with him (his corner by the door)
  setFollowerVisible(true);
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
  yield* cut4bReunion();
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
  4.5: cut4bReunion,
  5: cut5Home,
};
