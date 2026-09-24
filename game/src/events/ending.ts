// ★ evt_ending (10_narrative 5.20, 00_concept 13, 40_audio 13.5): about a
// minute. The chime rings all eight notes → 肉のマルヤマ → the family photo →
// home → the weather on TV → the crossing at night, 「……おいしい。」 → the
// night sky → the notebook → the title.

import type { Co } from '../engine/co';
import { all } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { PixelCanvas } from '../engine/pixel';
import { W, H } from '../engine/screen';
import { animate, ease } from '../engine/tween';
import { hash2 } from '../engine/rng';
import { drawText } from '../engine/font';
import { flag, setFlag, state } from '../game/state';
import { playBgm, playChimeMotif, setSpace, sfx, stopAllAmbient, stopAmbient, stopBgm, playAmbient } from '../audio';
import { actor, face, msg, place, registerScript, setClockText, setFollowerVisible, spawn, trainPass } from '../world/api';
import type { Actor } from '../world/actor';
import { playEndingNotebook, playNightSkyCut } from '../ui/api';
import { uiHud } from '../ui/hud';
import * as T from '../data/text/events';
import { F, getKeyItem, holdBgm, holdCamera, releaseCamera, walkTo } from './lib';
import { bellGlow, ring, sparkle } from './fx';
import { dinnerSet, photoClose } from './art';
import { zoomIn, type ZoomView } from './stage';

// ---------------------------------------------------------------- helpers

/** Load a map for a cut (no door, no enter scripts), the player at (x, y). */
function cutTo(map: string, x: number, y: number, dir: 'up' | 'down' | 'left' | 'right'): void {
  const f = F();
  f.loadMap(map, x, y, dir);
  f.syncFollower(true);
  // no item cards carried over from the previous cut
  uiHud.clearNotes();
}

function* fadeTo(ms: number, color = '#0B0B14'): Co {
  yield* game.fadeOut(ms, color);
}

// ---------------------------------------------------------------- cut 3: the photograph, close up (96×72 at 1×)

class PhotoCloseup implements Widget {
  modal = false;
  done = false;
  t = 0;
  k = 0;
  private frame: HTMLCanvasElement;
  constructor() {
    // a wooden frame with a brass edge around the 96×72 print, and the little tag
    const p = new PixelCanvas(110, 96);
    p.rect(0, 0, 110, 86, '#8A5A3A');
    p.strokeRect(0, 0, 110, 86, '#5A3A22');
    p.hline(1, 108, 1, '#C08A38');
    p.vline(1, 1, 84, '#C08A38');
    p.strokeRect(5, 5, 100, 76, '#D9A441');
    p.hline(6, 104, 5, '#F6D98A');
    for (let x = 2; x < 108; x += 3) if (hash2(x, 0, 7) < 0.5) p.set(x, 3, '#6A4A2A');
    p.rect(7, 7, 96, 72, 'transparent');
    // the tag under the frame
    p.rect(27, 86, 56, 9, '#F4F1E8');
    p.strokeRect(27, 86, 56, 9, '#C8C2B4');
    for (let x = 31; x < 79; x += 2) p.set(x, 90, hash2(x, 1, 3) < 0.7 ? '#9AA0A8' : '#F4F1E8');
    this.frame = p.toCanvas();
  }
  update(dt: number): void {
    this.t += dt;
  }
  draw(g: Gfx): void {
    if (this.k <= 0) return;
    const k = this.k;
    g.rect(0, 0, W, H, '#0B0B14', 0.45 * k);
    const x = Math.round(W / 2 - 55);
    const y = 14 + Math.round((1 - ease.cubicOut(k)) * 6);
    g.alpha(k, () => {
      g.rect(x + 3, y + 3, 110, 86, '#0B0B14', 0.5);
      g.img(photoClose(), x + 7, y + 7);
      g.img(this.frame, x, y);
      // a glint running across the glass
      const gl = ((this.t / 1800) % 1) * 140 - 20;
      g.clip(x + 7, y + 7, 96, 72, () => {
        for (let i = 0; i < 3; i++) g.alpha(0.25, () => g.line(Math.round(x + gl + i), y + 7, Math.round(x + gl + i - 30), y + 79, '#FFF6D8'));
      });
    });
  }
}

// ---------------------------------------------------------------- cut 5: the weather forecast

class TvCloseup implements Widget {
  modal = false;
  done = false;
  t = 0;
  k = 0;
  private screen: HTMLCanvasElement;
  constructor() {
    this.screen = buildWeather();
  }
  update(dt: number): void {
    this.t += dt;
  }
  draw(g: Gfx): void {
    if (this.k <= 0) return;
    const k = this.k;
    const x = Math.round(W / 2 - 96);
    const y = 8 + Math.round((1 - ease.cubicOut(k)) * 6);
    g.alpha(k, () => {
      // the set: a dark bezel, the speaker grille, the station's little logo
      g.rect(x + 3, y + 3, 192, 124, '#0B0B14', 0.5);
      g.rect(x, y, 192, 124, '#2A2440');
      g.rect(x + 1, y + 1, 190, 1, '#4A3A6E');
      g.rect(x + 6, y + 6, 180, 104, '#1B1733');
      g.img(this.screen, x + 8, y + 8);
      // scanline shimmer
      const sy = Math.floor((this.t / 14) % 100);
      g.rect(x + 8, y + 8 + sy, 176, 1, '#FFFFFF', 0.07);
      for (let i = 0; i < 12; i++) g.rect(x + 150 + i * 3, y + 115, 2, 4, '#3A2B5C');
      g.rect(x + 12, y + 115, 3, 3, (Math.floor(this.t / 700) % 2 ? '#E23B2E' : '#8E1F2A'));
      // the forecast's icons move a little: the sun breathes, the star twinkles
      const pulse = Math.floor(this.t / 400) % 2;
      g.rect(x + 8 + 47, y + 8 + 36 - pulse, 1, 1, '#FFF6D8');
      if (Math.floor(this.t / 300) % 3 === 0) g.rect(x + 8 + 146, y + 8 + 30, 1, 1, '#FFFFFF');
    });
  }
}

/** 176×100: 「あすの てんき」 — 夕鳴町 晴れ（ところにより 夕方）, 星見台 夜. */
function buildWeather(): HTMLCanvasElement {
  const p = new PixelCanvas(176, 100);
  // sea
  for (let y = 0; y < 100; y++)
    for (let x = 0; x < 176; x++) p.set(x, y, (x + y) % 2 === 0 && hash2(x >> 2, y >> 2, 3) < 0.4 ? '#5CE1FF' : '#4AA8E0');
  // land: a long coast running west–east
  for (let x = 0; x < 176; x++) {
    const top = 34 + Math.round(Math.sin(x / 19) * 5 + Math.sin(x / 7) * 2);
    const bot = 82 + Math.round(Math.sin(x / 23 + 1) * 6);
    for (let y = top; y < bot; y++) p.set(x, y, y === top ? '#9BCB6B' : hash2(x, y, 5) < 0.08 ? '#3FA66B' : '#5FA85A');
    p.set(x, bot, '#2E6B4A');
  }
  // 星見台 (east): still night — a dark patch with stars
  for (let y = 30; y < 90; y++)
    for (let x = 126; x < 176; x++) {
      const d = Math.hypot((x - 154) / 30, (y - 58) / 30);
      if (d < 1 && p.get(x, y) >>> 24) {
        const land = hash2(x, y, 9) < 0.5;
        if (d < 0.8 || hash2(x, y, 11) < 1 - (d - 0.8) * 5) p.set(x, y, land ? '#2A2440' : '#3A2B5C');
      }
    }
  for (const [sx, sy] of [[138, 44], [160, 50], [150, 70], [168, 40], [132, 62]]) p.set(sx, sy, '#FFF6D8');
  // the title band
  p.rect(0, 0, 176, 17, '#2F4A8A');
  p.hline(0, 175, 17, '#FFD23F');
  // 夕鳴町: the sun, and next to it a little sunset (ところにより 夕方)
  const sun = (cx: number, cy: number) => {
    for (let a = 0; a < 8; a++) {
      const ang = (a / 8) * Math.PI * 2;
      p.set(Math.round(cx + Math.cos(ang) * 8), Math.round(cy + Math.sin(ang) * 8), '#FFD23F');
      p.set(Math.round(cx + Math.cos(ang) * 9), Math.round(cy + Math.sin(ang) * 9), '#FFD23F');
    }
    p.ellipse(cx, cy, 5.5, 5.5, '#F2894B');
    p.ellipse(cx - 1, cy - 1, 3.5, 3.5, '#FFD23F');
    p.set(cx - 2, cy - 3, '#FFF6D8');
  };
  sun(46, 44);
  // the sunset: half a red sun on a line, orange sky above
  p.rect(62, 44, 20, 1, '#B04A7A');
  for (let y = 0; y < 6; y++) for (let x = -7; x <= 7; x++) if (x * x + y * y * 3 < 49) p.set(72 + x, 43 - y, y < 2 ? '#E8603C' : '#F2894B');
  p.hline(62, 81, 45, '#F7C27A');
  // a dot for the town
  p.rect(45, 58, 3, 3, '#E23B2E');
  p.set(45, 58, '#FF6A4D');
  // 星見台: a crescent moon
  p.ellipse(152, 40, 6, 6, '#FFF6D8');
  p.ellipse(155, 38, 5, 5, '#2A2440');
  p.rect(153, 58, 3, 3, '#FFD23F');
  p.outline('#1B1733');
  const c = p.toCanvas();
  const ctx = c.getContext('2d')!;
  // labels in the game font (white with a dark edge)
  const lbl = (s: string, x: number, y: number, col = '#FFFFFF') => {
    for (let oy = -1; oy <= 1; oy++) for (let ox = -1; ox <= 1; ox++) if (ox || oy) drawTxt(ctx, s, x + ox, y + oy, '#1B1733');
    drawTxt(ctx, s, x, y, col);
  };
  lbl('あすの てんき', 5, 1, '#FFFFFF');
  lbl('夕鳴町', 22, 64);
  lbl('星見台', 128, 64, '#FFE7A3');
  lbl('晴れ', 30, 80, '#FFD23F');
  return c;
}

function drawTxt(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, color: string): void {
  drawText(ctx, s, x, y, { color });
}

// ---------------------------------------------------------------- cut 5: dinner on the chabudai

/**
 * The dinner goes on the chabudai's top. It is an actor sorted one pixel in
 * front of the table (its foot is read from the table prop, so the table can
 * never be drawn over it), drawn up on the table's top.
 */
function spawnDinner(): void {
  const f = F();
  const tbl = f.props.find((p) => (p.obj as { id?: string }).id === 'obj_chabudai' || (p.obj as { prop?: string }).prop === 'obj_chabudai');
  // the chabudai art: 34×22, the round top centred at (17, 10)
  const topX = tbl ? tbl.x + tbl.art.ox + 17 : 160;
  const topY = tbl ? tbl.y + tbl.art.oy + 10 : 72;
  const foot = tbl ? tbl.y + tbl.art.foot : 83;
  const a = spawn('ending_dinner', 9, 4, { sprite: 'kanenari', ghost: true });
  a.x = topX;
  a.y = foot + 1;
  a.shadowH = 0;
  a.data.scripted = true;
  const img = dinnerSet();
  a.drawFn = (g, x, y) => {
    const cy = y - (a.y - topY);
    const left = x - 13;
    const top = cy - 9;
    g.img(img, left, top);
    // steam off the croquettes
    const t = F().t;
    for (let i = 0; i < 3; i++) {
      const k = (t / 900 + i / 3) % 1;
      const sx = left + 6 + i * 3 + Math.round(Math.sin(t / 300 + i) * 1);
      g.alpha(0.55 * (1 - k), () => g.rect(sx, Math.round(top + 4 - k * 10), 1, 2, '#FFF6D8'));
    }
  };
}

// ---------------------------------------------------------------- the ending

function* cut1Chime(): Co {
  const f = F();
  // out of the white: the two come out of the half-open automatic door
  // no place-name banner over the first shot: the HUD stays down until they are out
  setFlag('flag_hud_hidden', 1);
  cutTo('map_town', 50, 5, 'down');
  stopAmbient('amb_night_insects', 0);
  stopAmbient('amb_kawabe', 0);
  const rest = actor('restored:sym_town_07');
  if (rest) {
    rest.x = 51 * 16 + 8;
    rest.y = 6 * 16 + 16;
  }
  setClockText('17:00', false);
  setSpace('outdoor');
  holdCamera();
  f.camX = Math.max(0, Math.min(f.map.w * 16 - W, 50 * 16 + 8 - W / 2));
  f.camY = Math.max(0, Math.min(f.map.h * 16 - H, 8 * 16 - H / 2));
  f.camOverride = { x: f.camX + W / 2, y: f.camY + H / 2 };
  sfx('se_auto_door');
  game.scripts.run(game.fadeIn(800));
  yield* walkTo('player', 50, 7, { speed: 2.4, face: 'down' });
  // the HUD's pending place name is dropped while it is hidden (it waits for the fade)
  yield () => game.fadeAlpha < 0.05;
  yield 450;
  // the clock plate slides in, still 17:00
  setFlag('flag_hud_hidden', 0);
  yield 450;
  // the chime: G4 A4 C5 E5 — and, for the first time, D5 C5 A4 C5
  let fifth = false;
  let last = false;
  void playChimeMotif({
    notes: 8,
    gap: 0.45,
    lastHold: 2.0,
    onNote: (i) => {
      if (i === 4) fifth = true;
      if (i === 7) last = true;
    },
  });
  yield () => fifth;
  // from the fifth note the sky turns to night in 3 s; the insects come in
  f.setStage(3, 3000);
  playAmbient('amb_night_insects', { fade: 3, vol: 0.8 });
  playAmbient('amb_kawabe', { fade: 3 });
  yield () => last;
  yield 1200;
  setFlag('flag_clock', 4);
  setClockText(null, true);
  yield 900;
  // one higurashi, then the ending song
  sfx('se_higurashi_call');
  yield 800;
  playBgm('bgm_ending', { fade: 1.0 });
  // they look up at the sky
  const p = f.player;
  p.tempPose = 'look_up';
  const k = f.follower;
  if (k) {
    k.data.scripted = true;
    k.tempPose = 'look_up';
  }
  yield 1700;
  p.tempPose = null;
  if (k) {
    k.tempPose = null;
    delete k.data.scripted;
  }
}

function* cut2Meat(): Co {
  const f = F();
  // the frying is heard before the picture changes
  sfx('se_fry');
  yield* fadeTo(300);
  // no place-name banners and no clock in the cuts that follow
  setFlag('flag_hud_hidden', 1);
  cutTo('map_maruyama', 4, 5, 'up');
  setSpace('room');
  const m = actor('npc_maruyama');
  if (m) {
    m.data.scripted = true;
    m.pose = 'fry';
  }
  yield* game.fadeIn(300);
  yield 600;
  if (m) {
    m.pose = null;
    face('npc_maruyama', 'player');
  }
  yield* msg(T.END_MEAT_A);
  if (state.money >= 320) {
    state.money -= 320;
    sfx('se_coin');
    yield* msg(T.END_MEAT_PAY);
  } else {
    yield* msg(T.END_MEAT_TSUKE);
    setFlag('flag_tsuke', 1);
  }
  sfx('se_paper_bag');
  yield 200;
  yield* getKeyItem('item_korokke', T.END_MEAT_GET);
  const k = f.follower;
  if (k) {
    k.data.scripted = true;
    k.tempPose = 'flip_hold';
    sfx('se_flip');
  }
  yield* msg(T.END_MEAT_FLIP);
  if (k) {
    k.tempPose = null;
    delete k.data.scripted;
  }
  yield 300;
}

function* cut3Photo(): Co {
  const f = F();
  yield* fadeTo(300);
  cutTo('map_town', 31, 33, 'up');
  setSpace('outdoor');
  // the camera on the show window
  holdCamera();
  f.camX = Math.max(0, Math.min(f.map.w * 16 - W, 30 * 16 + 16 - W / 2));
  f.camY = Math.max(0, Math.min(f.map.h * 16 - H, 29 * 16 + 8 - H / 2));
  f.camOverride = { x: f.camX + W / 2, y: f.camY + H / 2 };
  // the three-coloured cat, asleep under the window
  const cat = spawn('ending_cat', 30, 32, { sprite: 'npc_cat_mike', dir: 'up', ghost: true });
  cat.data.scripted = true;
  cat.pose = 'sleep';
  yield* game.fadeIn(300);
  const w = new PhotoCloseup();
  game.ui.push(w);
  yield* animate(400, (p) => (w.k = p), ease.quadOut);
  yield 500;
  // it wakes, looks up at the photograph, and flicks its tail once — no sound but the insects
  cat.pose = null;
  cat.tempPose = 'look_up';
  yield 700;
  cat.tempPose = null;
  cat.playAnim('tail');
  yield 900;
  cat.anim = null;
  cat.tempPose = 'look_up';
  yield 700;
  yield* animate(350, (p) => (w.k = 1 - p));
  w.done = true;
}

function* cut4Home(): Co {
  const f = F();
  yield* fadeTo(300);
  // カネナリくん waits at the gate; he doesn't come in
  setFollowerVisible(false);
  cutTo('map_home_1f', 2, 7, 'up');
  setSpace('room');
  sfx('se_door');
  const mom = actor('npc_mother');
  if (mom) {
    mom.data.scripted = true;
    mom.pose = 'chop';
  }
  yield* game.fadeIn(300);
  yield* walkTo('player', 2, 5, { speed: 3, face: 'up' });
  if (mom) {
    mom.pose = null;
    mom.tempPose = 'turn';
    yield 160;
    mom.tempPose = null;
    face('npc_mother', 'player');
  }
  yield 250;
  const i = yield* msg(T.END_HOME_A);
  setFlag('flag_sauce_choice', i === 1 ? 2 : 1);
  yield* msg(T.END_HOME_B);
  void f;
}

function* cut5Tv(): Co {
  yield* fadeTo(300);
  // dinner: the two at either side of the chabudai, the TV on behind it
  place('player', 8, 4, 'right');
  const mom = actor('npc_mother');
  if (mom) {
    place('npc_mother', 11, 4, 'left');
    mom.pose = null;
    mom.data.scripted = true;
  }
  spawnDinner();
  // a 2× shot of the table, the TV at the top of the frame
  const z = yield* zoomIn(10 * 16, 4 * 16 + 4, 0);
  yield* game.fadeIn(300);
  yield 700;
  const w = new TvCloseup();
  game.ui.push(w);
  yield* animate(300, (p) => (w.k = p), ease.quadOut);
  yield 300;
  yield* msg(T.END_TV);
  yield* animate(250, (p) => (w.k = 1 - p));
  w.done = true;
  if (mom) face('npc_mother', 'player');
  yield 250;
  yield* msg(T.END_TV_MOTHER);
  yield 500;
  yield* fadeTo(400);
  z.done = true;
}

/** The close-up of the crossing (cut 6), kept until the night sky covers it. */
let crossingZoom: ZoomView | null = null;

function* cut6Crossing(): Co {
  const f = F();
  // a 0.4 s blackout: the night song, the night space
  stopBgm(0.4);
  yield* fadeTo(400);
  playBgm('bgm_night', { fade: 1.5 });
  setSpace('night');
  setFollowerVisible(false);
  cutTo('map_town', 51, 22, 'right');
  stopAmbient('amb_kawabe', 0.5);
  holdCamera();
  f.camX = Math.max(0, Math.min(f.map.w * 16 - W, 56 * 16 - W / 2));
  f.camY = Math.max(0, Math.min(f.map.h * 16 - H, 22 * 16 + 8 - H / 2));
  f.camOverride = { x: f.camX + W / 2, y: f.camY + H / 2 };
  // 「踏切を正面に」: a 2× close-up with the crossing in the middle — the
  // two on its left, the rails right of centre, the window below them
  crossingZoom = yield* zoomIn(58 * 16, 22 * 16 - 6, 0);
  const p = f.player;
  p.visible = false;
  // カネナリくん, waiting in front of the crossing — seen once the train has gone
  const k: Actor = spawn('ending_kanenari', 57, 22, { sprite: 'kanenari', dir: 'left', ghost: true });
  k.data.scripted = true;
  k.alpha = 0;
  yield* game.fadeIn(400);
  yield 800;
  // the barrier that stayed down all day goes up
  setFlag('flag_crossing_open', 1);
  sfx('se_crossing_up');
  yield 1400;
  // an unlit train, north to south; its sign says 星見台
  yield* all(
    trainPass(),
    (function* (): Co {
      yield 1400;
      yield* animate(700, (q) => (k.alpha = q));
    })(),
  );
  k.alpha = 1;
  yield 500;
  // Minato comes in from the left with the paper bag
  p.visible = true;
  p.x = 52 * 16 + 8;
  p.y = 22 * 16 + 16;
  yield* walkTo('player', 56, 22, { speed: 2.2, face: 'right' });
  face('ending_kanenari', 'player');
  yield 300;
  p.tempPose = 'give';
  yield 300;
  yield* msg(T.END_GIVE);
  sfx('se_paper_bag');
  p.tempPose = null;
  k.tempPose = 'hold';
  yield 1000;
  // he turns his back, opens the zip — dark inside — and puts it in
  k.dir = 'up';
  k.tempPose = 'zipper';
  sfx('se_zipper');
  yield 900;
  k.tempPose = null;
  k.dir = 'left';
  // 1.5 s: only the insects
  yield 1500;
  yield* msg(T.END_VOICE);
  yield 1000;
  // the bell rings once, by itself
  sfx('se_bell_kanenari_short');
  k.playAnim('glow');
  bellGlow(k.x, k.y - 20, 900);
  ring(k.x, k.y - 20, '#FFE7A3', 700);
  sparkle(k.x + 3, k.y - 26, 600);
  yield 1200;
  k.anim = null;
}

/** QA / the night sky: drop the crossing close-up. */
function endCrossingZoom(): void {
  if (crossingZoom) crossingZoom.done = true;
  crossingZoom = null;
}

export function* evtEnding(): Co {
  const f = F();
  setFlag('flag_boss_beaten', 1);
  setFlag('flag_boss_phase', 0);
  holdBgm(true);
  setFlag('flag_hud_hidden', 0);
  setFollowerVisible(true);
  // stage 3 for the world's contents; the colours stay stage 2 until the fifth note
  setFlag('flag_stage', 3);
  if (game.fadeAlpha < 1) {
    game.fadeColor = '#FFF6D8';
    game.fadeAlpha = 1;
  }
  stopAllAmbient(0.5);
  yield 300;
  yield* cut1Chime();
  yield* cut2Meat();
  yield* cut3Photo();
  yield* cut4Home();
  yield* cut5Tv();
  yield* cut6Crossing();
  // the night sky (cut_night_sky): the star over 星見台 stops twinkling
  yield* playNightSkyCut({ hold: 1500 });
  endCrossingZoom();
  // the notebook: 「夕鳴町 みました帳 ①」, the case, 「つづく」 → the title
  releaseCamera();
  yield* all(
    playEndingNotebook(),
    (function* (): Co {
      yield 6600;
      stopBgm(1.5);
      yield 1800;
      stopAllAmbient(1.0);
    })(),
  );
  holdBgm(false);
  setFlag('flag_hud_hidden', 0);
}

/** QA: play one cut of the ending from a prepared state (1–6). */
export const ENDING_CUTS: Record<number, () => Co> = {
  1: cut1Chime,
  2: cut2Meat,
  3: cut3Photo,
  4: cut4Home,
  5: cut5Tv,
  6: function* (): Co {
    yield* cut6Crossing();
    yield 1500;
    endCrossingZoom();
  },
};

registerScript('evt_ending', function* (): Co {
  if (flag('flag_clear') && !flag('flag_boss_beaten')) return;
  yield* evtEnding();
});
