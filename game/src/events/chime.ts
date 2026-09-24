// ★ 17:00 (evt_chime_stop 5.6) and what follows in the ginza:
// evt_hato_block (5.7), evt_hanko_given (5.8), evt_obaa_park_hint (5.9),
// evt_alley_open (5.10).

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag, setFlag, state, type Dir } from '../game/state';
import { syncProgressSkills } from '../data/battle';
import { bgmTapeStop, playAmbient, playBgm, playChimeMotif, sfx, stopAmbient } from '../audio';
import {
  actor,
  chimeWave,
  defeatSymbol,
  despawn,
  emote,
  face,
  lookUpAll,
  mapAudio,
  msg,
  registerScript,
  setClockText,
  setStage,
  show,
  spawn,
  stage,
  walk,
} from '../world/api';
import { DIR_VEC } from '../world/actor';
import type { Actor } from '../world/actor';
import { showBubble, showGuide } from '../ui/api';
import * as T from '../data/text/events';
import { besideToward, dirTo, eventBattle, F, floatLine, getKeyItem, holdBgm, sendAway, tileFree, walkTo } from './lib';
import { playCaseGift, puff, sparkle } from './fx';

const HINOYA_DOOR: [number, number] = [32, 21];
const HINOYA_FRONT: [number, number] = [32, 22];

function onScreen(a: Actor): boolean {
  const f = F();
  return a.x > f.camX - 8 && a.x < f.camX + 384 + 8 && a.y > f.camY && a.y < f.camY + 216 + 24;
}

/** A free tile about `d` tiles from (px, py), preferring the side of (sx, sy). */
function tileNear(px: number, py: number, sx: number, sy: number, d: number): [number, number] {
  const hx = Math.sign(sx - px) || 1;
  const cands: [number, number][] = [
    [px + hx * d, py],
    [px - hx * d, py],
    [px, py + d],
    [px, py - d],
    [px + hx * d, py + 1],
    [px + hx * d, py - 1],
  ];
  for (const [x, y] of cands) if (tileFree(x, y)) return [x, y];
  return [px + hx, py];
}

// ---------------------------------------------------------------- 5.6 evt_chime_stop ★

registerScript('evt_chime_stop', function* (): Co {
  if (flag('flag_chime_stopped') || stage() !== 0) return;
  const f = F();
  const p = f.player;
  holdBgm(true);
  // t=0: the first step out of the shop; Minato stops, facing down
  p.path = [];
  p.moving = false;
  p.dir = 'down';
  const hato = actor('npc_hato');
  if (hato) hato.data.scripted = true;
  const sae = actor('npc_sae');
  const saeHere = !!sae && onScreen(sae);
  if (sae && saeHere) sae.data.scripted = true;
  // t=0.3 / 1.0: the clock plate turns 16:59, 17:00 (and sinks a pixel)
  yield 300;
  setClockText('16:59');
  yield 700;
  setClockText('17:00');
  // t=1.3: the PA chime, G4 A4 C5 E5 — the E5 is cut at t=3.2
  yield 300;
  void playChimeMotif({ notes: 4, gap: 0.45, cut: true, cutAt: 1.9 });
  // t=2.8: everyone on screen looks up at the sky (0–4 frames apart)
  yield 1500;
  game.scripts.run(lookUpAll(true, true));
  // t=3.2: the E5 breaks off. The wave, the tape stop, the stage-1 colours
  yield 400;
  bgmTapeStop(0.4, -1);
  stopAmbient('amb_higurashi', 0.05);
  stopAmbient('amb_wind', 0.4);
  game.scripts.run(chimeWave(3, 800));
  setStage(1, { ms: 600 });
  setFlag('flag_clock', 3);
  setClockText(null, false);
  // the stage-1 symbol of the hato stays hidden: this hato becomes it
  show('sym_town_01', false);
  playAmbient('amb_still', { fade: 0.6 });
  mapAudio();
  // t=4.0–6.0: silence, heads up
  yield 2800;
  // t=6.0: heads down, the stage-1 idle loops start
  game.scripts.run(lookUpAll(false, false));
  if (hato) hato.data.scripted = true;
  if (sae && saeHere) sae.data.scripted = true;
  const cow = actor('npc_cow_statue');
  if (cow) cow.pose = 'look_up';
  // サエ goes off to the park to keep observing
  if (sae && saeHere) sendAway(sae, [[sae.tileX, 21], [20, 21], [20, 15]], 3, 900);
  yield 400;
  yield* msg(T.CHIME_STOP);
  yield* emote('player', 'question');
  // far off, only a speech bubble: まめ吉
  if (actor('npc_mamekichi')) {
    showBubble('npc_mamekichi', 'まいど！', 800);
    yield 700;
    showBubble('npc_mamekichi', 'まいど！', 800);
    yield 600;
  }
  setFlag('flag_chime_stopped', 1);
  yield* hatoBlock();
});

// ---------------------------------------------------------------- 5.7 evt_hato_block

function* hatoBlock(): Co {
  const f = F();
  const p = f.player;
  let hato = actor('npc_hato');
  const [px, py] = [p.tileX, p.tileY];
  if (!hato) {
    // 17:00 came while the hato was out of sight: it comes to Minato
    const [sx, sy] = tileNear(px, py, 33, 23, 4);
    hato = spawn('npc_hato', sx, sy, { dir: 'left' });
  } else if (Math.abs(hato.tileX - px) + Math.abs(hato.tileY - py) > 6) {
    const [sx, sy] = tileNear(px, py, hato.tileX, hato.tileY, 4);
    hato.x = sx * 16 + 8;
    hato.y = sy * 16 + 16;
  }
  hato.data.scripted = true;
  hato.pose = null;
  hato.tempPose = null;
  // it walks up to Minato (2 tiles), bobbing its head
  const [tx, ty] = besideToward(px, py, hato.tileX, hato.tileY);
  if (hato.tileX !== tx || hato.tileY !== ty) yield* walkTo('npc_hato', tx, ty, { speed: 1.6 });
  face('npc_hato', 'player');
  face('player', 'npc_hato');
  const home: [number, number] = [hato.x, hato.y];
  for (;;) {
    sfx('se_coo');
    yield* msg(T.HATO_A);
    // the tie and the staff pass pop out: ハト係長
    hato.setSprite('enemy_hato_kakaricho');
    hato.hop(5, 220);
    puff(hato.x, hato.y - 2);
    sparkle(hato.x + 4, hato.y - 14);
    sfx('se_emote');
    yield 380;
    yield* msg(T.HATO_B);
    yield* emote('player', 'sweat');
    yield 150;
    const r = yield* eventBattle({ enemies: ['enemy_hato_kakaricho'], music: 'bgm_battle' });
    if (r === 'load') return;
    if (r === 'win') break;
    // 「戦う前から やりなおす」: from the top of this page
    hato.setSprite('npc_hato');
    hato.x = home[0];
    hato.y = home[1];
    face('npc_hato', 'player');
    face('player', 'npc_hato');
    yield* game.fadeIn(500);
  }
  // the pigeon remembered it was a pigeon; a card lies at its feet
  const hx = hato.x;
  const hy = hato.y;
  despawn('npc_hato');
  defeatSymbol('sym_town_01');
  const rest = actor('restored:sym_town_01');
  if (rest) {
    rest.x = hx;
    rest.y = hy;
  }
  yield 450;
  yield* getKeyItem('item_hato_meishi', T.HATO_GET);
  setFlag('flag_hato_beaten', 1);
  yield* hankoGiven();
}
registerScript('evt_hato_block', function* (): Co {
  if (flag('flag_hato_beaten')) return;
  yield* hatoBlock();
});

// ---------------------------------------------------------------- 5.8 evt_hanko_given

/** Where おばあ stops: two tiles from Minato on the shop's side. */
function obaaSpot(px: number, py: number): [number, number] {
  const cands: [number, number][] = [];
  if (py > HINOYA_FRONT[1]) cands.push([px, py - 2], [px, py - 1]);
  const sx = Math.sign(HINOYA_FRONT[0] - px) || 1;
  cands.push([px + sx * 2, py], [px + sx, py], [px - sx * 2, py], [px, py + 2]);
  for (const [x, y] of cands) if (tileFree(x, y) && !(x === px && y === py)) return [x, y];
  return besideToward(px, py, HINOYA_FRONT[0], HINOYA_FRONT[1]);
}

function* obaaComesOut(near: boolean): Co<Actor> {
  const p = F().player;
  let ob: Actor;
  if (near) {
    sfx('se_door');
    ob = spawn('npc_obaa', HINOYA_DOOR[0], HINOYA_DOOR[1], { dir: 'down' });
    ob.alpha = 0;
    ob.data.scripted = true;
    for (let i = 1; i <= 6; i++) {
      ob.alpha = i / 6;
      yield null;
    }
    ob.alpha = 1;
    yield* walk('npc_obaa', [HINOYA_FRONT], { speed: 2 });
  } else {
    // far from the shop (17:00 by the 150 s fallback): she hurries over
    const [sx, sy] = tileNear(p.tileX, p.tileY, HINOYA_FRONT[0], HINOYA_FRONT[1], 7);
    ob = spawn('npc_obaa', sx, sy, { dir: dirTo(sx, sy, p.tileX, p.tileY) });
    ob.data.scripted = true;
  }
  const [tx, ty] = obaaSpot(p.tileX, p.tileY);
  if (ob.tileX !== tx || ob.tileY !== ty) yield* walkTo('npc_obaa', tx, ty, { speed: 2.2, vertFirst: true });
  face('npc_obaa', 'player');
  face('player', 'npc_obaa');
  return ob;
}

function* hankoGiven(): Co {
  if (flag('flag_got_hanko')) return;
  const p = F().player;
  const near = Math.abs(p.tileX - HINOYA_FRONT[0]) <= 6 && Math.abs(p.tileY - HINOYA_FRONT[1]) <= 4;
  // the town song comes back half a tone down, wavering
  holdBgm(false);
  playBgm('bgm_town_s1', { fade: 1.5 });
  const ob = yield* obaaComesOut(near);
  yield 200;
  yield* msg(flag('flag_met_obaa') ? T.HANKO_A : T.HANKO_A_NOVISIT);
  yield* msg(T.HANKO_B);
  // the case, opened in the middle of the screen
  playBgm('bgm_jingle_item');
  yield* playCaseGift(T.HANKO_GET);
  if (!state.inventory.includes('item_hanko_case')) state.inventory.push('item_hanko_case');
  if (!state.inventory.includes('item_mimashita_cho')) state.inventory.push('item_mimashita_cho');
  setFlag('flag_got_hanko', 1);
  syncProgressSkills();
  yield* msg(T.HANKO_C);
  yield* msg(T.HANKO_D);
  showGuide(T.GUIDE_FUSHIGI, 4000);
  // she waits at the storefront
  if (ob.tileX !== HINOYA_FRONT[0] || ob.tileY !== HINOYA_FRONT[1]) {
    yield* walkTo('npc_obaa', HINOYA_FRONT[0], HINOYA_FRONT[1], { speed: 2 });
  }
  ob.dir = 'down';
  delete ob.data.scripted;
  ob.data.home = [ob.x, ob.y];
}

/** map_town_enter: while the tutorial is pending, おばあ stands in front of ひのや. */
export function placeWaitingObaa(): void {
  if (!flag('flag_got_hanko') || flag('flag_park_hint') || stage() !== 1) return;
  if (actor('npc_obaa')) return;
  spawn('npc_obaa', HINOYA_FRONT[0], HINOYA_FRONT[1], { dir: 'down' });
}

// ---------------------------------------------------------------- 5.9 evt_obaa_park_hint

function* obaaGoesIn(ob: Actor): Co {
  const far = Math.abs(ob.tileX - HINOYA_FRONT[0]) + Math.abs(ob.tileY - HINOYA_FRONT[1]) > 5;
  if (!onScreen(ob)) {
    despawn('npc_obaa');
    return;
  }
  if (far) {
    // back to the shop off-screen; the player can walk on meanwhile
    const pts: [number, number][] = [[HINOYA_FRONT[0], ob.tileY], HINOYA_FRONT];
    sendAway(ob, pts, 2.6, 0, true);
    return;
  }
  yield* walkTo('npc_obaa', HINOYA_FRONT[0], HINOYA_FRONT[1], { speed: 2 });
  yield* walk('npc_obaa', [HINOYA_DOOR], { speed: 2 });
  sfx('se_door');
  for (let i = 5; i >= 0; i--) {
    ob.alpha = i / 6;
    yield null;
  }
  despawn('npc_obaa');
}

registerScript('evt_obaa_park_hint', function* (ctx): Co {
  if (flag('flag_park_hint')) return;
  const f = F();
  const p = f.player;
  p.path = [];
  p.moving = false;
  let ob = actor('npc_obaa');
  if (ctx.source === 'fushigi_04') {
    // A: after the stamp on まめ吉. She turns to Minato.
    if (!ob) ob = spawn('npc_obaa', HINOYA_FRONT[0], HINOYA_FRONT[1], { dir: 'down' });
    ob.data.scripted = true;
    face('npc_obaa', 'player');
    yield 250;
    yield* msg(T.PARK_HINT_A1);
    sfx('se_stamp', { vol: 0.5 });
    yield* emote('npc_obaa', 'light', { se: false });
    ob.pose = 'happy';
    yield 300;
    ob.pose = null;
    face('player', 'npc_obaa');
    yield* msg(T.PARK_HINT_A2);
    setFlag('flag_fushigi_tutorial', 1);
  } else {
    // B: leaving the ginza without stamping. She calls him back.
    const back: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };
    yield* emote('player', 'exclaim');
    const [ex, ey] = DIR_VEC[p.dir];
    const [sx, sy] = tileNear(p.tileX - ex, p.tileY - ey, HINOYA_FRONT[0], HINOYA_FRONT[1], 5);
    if (!ob) ob = spawn('npc_obaa', sx, sy, { dir: 'down' });
    else {
      ob.x = sx * 16 + 8;
      ob.y = sy * 16 + 16;
    }
    ob.data.scripted = true;
    p.dir = back[p.dir];
    const [tx, ty] = besideToward(p.tileX, p.tileY, sx, sy);
    const [gx, gy] = [tx + Math.sign(tx - p.tileX), ty + Math.sign(ty - p.tileY)];
    const stop: [number, number] = tileFree(gx, gy) ? [gx, gy] : [tx, ty];
    yield* walkTo('npc_obaa', stop[0], stop[1], { speed: 3 });
    face('npc_obaa', 'player');
    face('player', 'npc_obaa');
    yield* msg(T.PARK_HINT_B);
  }
  setFlag('flag_park_hint', 1);
  yield 200;
  if (ob) yield* obaaGoesIn(ob);
});

// ---------------------------------------------------------------- 5.10 evt_alley_open

registerScript('evt_alley_open', function* (): Co {
  // walking on: the line shows without taking the controls
  floatLine(T.ALLEY_OPEN, 1500);
});

