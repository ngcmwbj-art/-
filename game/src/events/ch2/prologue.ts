// evt_ch2_prologue (50_ch2_story 10.1〜10.2, 52 6.1, 53 12.1): 8月31日, 19:30,
// the crossing of 夕鳴町. The two lines on black, the chapter's door (the
// 「第2章」 seal), the report card if chapter2Adjust() raised a level, then the
// crossing from the same frame as chapter 1's last cut: グソっ君's words (the
// yakisoba, 「むこう、ずっと 夜やな」; ★2026-09-29 no flips), the
// case glowing in his pocket, the bell that never rang in chapter 1, the
// unlit one-car train that stops ON the crossing, its door, the little step,
// 「見に 行かへん？ 星見台」, 乗る / やめておく, and in (his feelers catch
// on the door's frame).
//
// ui/flow.startChapter2 starts it as a field script on map_town (56,22) E with
// the screen black (game.fadeAlpha = 1).
//
// HD-2D (2026-10-06, 依頼主「第２章もHD-2Dにしてみよう」): the crossing is the
// 3D town at night through chapter 1's last cut's lens (endingView.shot
// 'c6_crossing', src/hd2d/cut.ts), and the car — a picture seen from above —
// lies on the rails as chapter 1's night train does (trainOnRails); the
// times, the lines and the sounds are the 2D's.

import type { Co } from '../../engine/co';
import { game, type Scene } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { animate, ease } from '../../engine/tween';
import { flag, setFlag } from '../../game/state';
import { playAmbient, playBgm, stopAllAmbient, stopBgm } from '../../audio';
import { despawn, registerScript, setFollowerVisible, spawn, walk } from '../../world/api';
import type { Actor } from '../../world/actor';
import { runMsg } from '../../world/msg';
import { caption } from '../../ui/dialog';
import { playChapterDoor } from '../../ui/chapter_door';
import { chapter2LevelUps } from '../../ui/flow';
import { setClockText, showClock } from '../../ui/hud';
import { getProp } from '../../art/props/registry';
import { hoshiTrainImage } from '../../art/props/hoshi_vehicles';
import * as T from '../../data/text/hoshi_events';
import { F } from '../lib';
import { ring } from '../fx';
import { crossingCloseUp, crossingCloseUpOff, endingView } from '../ending';
import { makeCanvas } from '../../engine/pixel';
import { H } from '../../engine/screen';
import { fxElsewhere, registerWorldFx } from '../../world/fx';
import type { FieldScene } from '../../world/field';
import { musicParam, paMode, reportCard, se, seLoop, space } from './compat';
import { runCue } from './common';

// ---------------------------------------------------------------- the train on the crossing (52 6.1)

/** The west door's centre in the car picture (px from its top) and the car's size. */
const DOOR_Y = 89;
const CAR_H = 124;
const CAR_W = 30;
/** The track the train runs on (x60) and where it stops: the west door level with the children (y22). */
const TRACK_X = 60 * 16 + 8;
const STOP_FRONT = 22 * 16 + 8 - DOOR_Y + CAR_H;

interface Train {
  a: Actor;
  door: number;
}

/** The train on the crossing now (trainOnRails draws it in the HD-2D view). */
let liveTrain: Train | null = null;

/** The unlit one-car train as a scripted actor: its feet are the front of the car. */
function spawnTrain(front: number): Train {
  const a = spawn('ch2_prologue_train', 60, 22, { sprite: 'kanenari', ghost: true });
  a.data.scripted = true;
  a.x = TRACK_X;
  a.y = front;
  a.solid = false;
  const tr: Train = { a, door: 0 };
  a.drawFn = (g, x, y) => {
    const img = hoshiTrainImage(tr.door, Math.floor(game.time / 90) % 2);
    g.img(img, Math.round(x - CAR_W / 2), Math.round(y - CAR_H));
  };
  liveTrain = tr;
  return tr;
}

/** Rows of the car's picture laid at once in the HD-2D view (as world/places.ts TRAIN_SLICE). */
const SLICE = 8;
/** The car's pictures under the grade's multiply colour (the HD-2D layer lies over the graded 3D). */
const graded = new Map<string, HTMLCanvasElement>();

function gradedCar(door: number, sign: number, mul: readonly [number, number, number]): HTMLCanvasElement {
  const key = `${door}|${sign}|${mul.join(',')}`;
  let c = graded.get(key);
  if (c) return c;
  if (graded.size > 12) graded.clear();
  const img = hoshiTrainImage(door, sign);
  const [o, ctx] = makeCanvas(img.width, img.height);
  ctx.drawImage(img, 0, 0);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = `rgb(${mul[0]},${mul[1]},${mul[2]})`;
  ctx.fillRect(0, 0, img.width, img.height);
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(img, 0, 0);
  graded.set(key, o);
  c = o;
  return c;
}

/**
 * HD-2D: the car is a picture seen from above. Standing it up as a person
 * would make a wall of it, so in the 3D view the actor is left out and the
 * picture lies on the rails instead, in slices of SLICE rows, each where its
 * own stretch of the track is on screen (a slice the camera can't see is
 * left out) — chapter 1's night train (world/places.ts drawTrain). 2D: the
 * actor as it is.
 */
registerWorldFx({
  map: 'map_town',
  anchored: true,
  update(f: FieldScene) {
    const tr = liveTrain;
    if (!tr) return;
    if (!f.actors.includes(tr.a)) {
      liveTrain = null;
      return;
    }
    tr.a.visible = !fxElsewhere(f);
  },
  draw(f: FieldScene, g, _cx, _cy, layer) {
    const tr = liveTrain;
    if (!tr || layer !== 'ground' || !fxElsewhere(f)) return;
    const pic = gradedCar(tr.door, Math.floor(game.time / 90) % 2, f.grade.mul);
    const left = tr.a.x - CAR_W / 2;
    const top = tr.a.y - CAR_H;
    for (let r = 0; r < pic.height; r += SLICE) {
      const h = Math.min(SLICE, pic.height - r);
      const a = f.projected(left, top + r, top + r);
      const b = f.projected(left + pic.width, top + r + h, top + r + h);
      if (!a || !b || b[1] <= a[1] || b[1] < -16 || a[1] > H + 16 || b[1] - a[1] > SLICE * 6) continue;
      g.ctx.drawImage(pic, 0, r, pic.width, h, Math.round(a[0]), Math.round(a[1]), Math.round(b[0] - a[0]), Math.ceil(b[1] - a[1]));
    }
  },
});

/** The little wooden step rising out of the crossing's boards (3 frames). */
function spawnStep(): { a: Actor; k: number } {
  const a = spawn('ch2_prologue_step', 59, 22, { sprite: 'kanenari', ghost: true });
  a.data.scripted = true;
  a.solid = false;
  a.x = TRACK_X - CAR_W / 2 - 7;
  a.y = 22 * 16 + 15;
  const st = { a, k: -1 };
  const frames = [0, 1, 2].map((k) => getProp('prop_h_fumidai', { k }));
  a.drawFn = (g, x, y) => {
    if (st.k < 0) return;
    const art = frames[st.k];
    const img = art?.img({} as never);
    if (img) g.img(img, Math.round(x - 6), Math.round(y - 6));
  };
  return st;
}

// ---------------------------------------------------------------- evt_ch2_prologue

export function* evtPrologue(): Co {
  const f = F();
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  setFlag('flag_hud_hidden', 1);
  // the night of 夕鳴町: the insects and the river, from black (53 12.1)
  space('night');
  paMode('town');
  musicParam('h_stage', -1);
  stopBgm(0.2);
  playAmbient('amb_night_insects', { fade: 2 });
  playAmbient('amb_kawabe', { vol: 0.5, fade: 2 });
  yield 900;
  yield* caption(T.PROLOGUE_CAPTION, { gap: 600, hold: 800 });
  yield 300;
  yield* playChapterDoor();
  // a level up from chapter2Adjust(): the summer's report card (with the Lv6 page)
  const ups = chapter2LevelUps();
  if (ups.length) {
    yield 300;
    // the card is a scene, drawn under the screen fade: on the prologue's
    // black it stands on a black page of its own, the fade lifted meanwhile
    // (★2026-09-30: it waited for けってい under the fade — a black screen
    // with only the touch buttons, found on the way 第1章の おわり → 第2章へ)
    const page = new BlackPage();
    game.push(page);
    const fade = game.fadeAlpha;
    game.fadeAlpha = 0;
    yield* reportCard(ups, T.PROLOGUE_REPORT_TITLE);
    game.fadeAlpha = fade;
    if (game.top === page) game.pop();
  }

  // ---- the crossing, the frame of chapter 1's last cut
  setFlag('flag_crossing_open', 1);
  setFollowerVisible(false);
  const p = f.player;
  p.x = 56 * 16 + 8;
  p.y = 22 * 16 + 16;
  p.dir = 'right';
  p.visible = true;
  const k = spawn('ch2_prologue_kanenari', 57, 22, { sprite: 'kanenari', dir: 'left', ghost: true });
  k.data.scripted = true;
  const zoom = yield* crossingCloseUp();
  // (HD-2D: the lens of chapter 1's last cut at the crossing, src/hd2d/cut.ts; 2D: nothing)
  endingView.shot(f, 'c6_crossing');
  yield 400;
  playBgm('bgm_night', { fade: 2.0 });
  yield* game.fadeIn(1000);
  // the clock slides in: 19:30
  setFlag('flag_hud_hidden', 0);
  setClockText('19:30', { cut: true });
  showClock(600000);
  se('se_clock_flip', { vol: 0.5 });
  yield 700;

  // what the cues set up (held in one place: the cues run as closures)
  const set: { bell: ReturnType<typeof seLoop> | null; idle: ReturnType<typeof seLoop> | null; train: Train | null; step: ReturnType<typeof spawnStep> | null } = {
    bell: null,
    idle: null,
    train: null,
    step: null,
  };
  yield* runCue(T.PROLOGUE_A, {
    *turn() {
      // he looks east — at the sky over 星見台
      yield 600;
      k.dir = 'right';
      yield 300;
    },
    *glow() {
      // the case's rim glows red twice in his pocket
      for (let i = 0; i < 2; i++) {
        se('se_hanko_ready', { vol: 0.35 });
        if (i === 1) se('se_emote_light', { vol: 0.4 });
        ring(p.x + 3, p.y - 9, '#F2894B', 500);
        yield 1000;
      }
    },
    *train() {
      yield 800;
      // the bell rings — never once in chapter 1 — and the barrier comes down
      set.bell = seLoop('se_h_crossing_bell');
      se('se_h_crossing_down');
      setFlag('flag_crossing_open', 0);
      stopBgm(1.5);
      yield 1600;
      // an unlit car down the x60 track from the top, slowing, and it stops on the crossing
      set.train = spawnTrain(STOP_FRONT - 300);
      const t0 = set.train;
      const y0 = t0.a.y;
      se('se_h_train_brake');
      yield* animate(2600, (q) => (t0.a.y = y0 + (STOP_FRONT - y0) * ease.quadOut(q)), ease.linear);
      t0.a.y = STOP_FRONT;
      // the bell breaks off in the middle of a stroke: カ……
      set.bell?.stop(0);
      set.bell = null;
      yield 900;
      // the west door: two frames, プシュー; the step rises by itself
      se('se_h_train_door');
      t0.door = 1;
      yield 90;
      t0.door = 2;
      set.idle = seLoop('se_h_train_idle');
      yield 500;
      set.step = spawnStep();
      const s0 = set.step;
      se('se_step_wood', { pitch: 1.3, vol: 0.6 });
      for (const kk of [0, 1, 2]) {
        s0.k = kk;
        yield 50;
      }
      yield 600;
    },
    *face() {
      k.dir = 'left';
      yield 250;
    },
  });
  // 乗る / やめておく — the train waits as long as he likes
  for (;;) {
    const i = yield* runMsg(T.PROLOGUE_ASK);
    if (i === 0) break;
    yield* runMsg(T.PROLOGUE_WAIT);
  }
  // グソっ君 goes up first (his long feelers catch on the door's frame: a
  // little bump, he ducks and goes in), Minato after him
  k.dir = 'right';
  se('se_step_kanenari');
  yield* walk('ch2_prologue_kanenari', [58, 22], { speed: 1.6 });
  se('se_bump', { vol: 0.35, pitch: 1.6 });
  k.hop(1, 120);
  yield 200;
  yield* animate(260, (q) => {
    k.x = 58 * 16 + 8 + q * 10;
    k.alpha = 1 - q;
  });
  k.visible = false;
  yield 150;
  yield* walk('player', [57, 22], { speed: 1.6 });
  yield* walk('player', [58, 22], { speed: 1.6 });
  se('se_step_wood');
  yield* animate(260, (q) => {
    p.x = 58 * 16 + 8 + q * 10;
    p.alpha = 1 - q;
  });
  p.visible = false;
  yield 300;
  // the door closes; the train goes south, off the bottom of the frame
  se('se_h_train_door');
  const tr = set.train;
  if (tr) {
    tr.door = 1;
    yield 90;
    tr.door = 0;
  }
  if (set.step) set.step.k = -1;
  yield 400;
  set.idle?.stop(0.3);
  se('se_train_pass', { pitch: 0.8, vol: 0.7 });
  if (tr) {
    const y0 = tr.a.y;
    yield* animate(1600, (q) => (tr.a.y = y0 + 260 * ease.quadIn(q)), ease.linear);
  }
  stopAllAmbient(1.0);
  yield* game.fadeOut(1000, '#0B0B14');
  // backstage: the town as it was, and on to the train
  zoom.done = true;
  crossingCloseUpOff();
  despawn('ch2_prologue_kanenari');
  despawn('ch2_prologue_train');
  liveTrain = null;
  despawn('ch2_prologue_step');
  p.alpha = 1;
  p.visible = true;
  setFlag('flag_crossing_open', 1);
  setFlag('flag_ch2_prologue_done', 1);
  const { toTrain } = (yield import('./train')) as typeof import('./train');
  yield* toTrain();
}

registerScript('evt_ch2_prologue', function* (): Co {
  if (flag('flag_ch2_prologue_done')) return;
  yield* evtPrologue();
});

/** A black page under the prologue's report card (see above). */
class BlackPage implements Scene {
  transparent = false;
  update(): void {}
  draw(g: Gfx): void {
    g.clear('#0B0B14');
  }
}
