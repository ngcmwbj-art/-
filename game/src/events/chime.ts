// ★ 17:00 (evt_chime_stop 5.6) and what follows in the ginza:
// evt_hato_block (5.7), evt_hanko_given (5.8), evt_obaa_park_hint (5.9),
// evt_alley_open (5.10).

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag, setFlag, type Dir } from '../game/state';
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
import { uiHud } from '../ui/hud';
import * as T from '../data/text/events';
import { besideToward, dirTo, eventBattle, F, floatLine, giveKey, holdBgm, holdCamera, panBack, sendAway, settle, tileFree, walkTo } from './lib';
import { burst, playCaseGift, puff, smallVoice, sparkle } from './fx';
import { meishi } from './art';
import { cinema, clearBelow, guideNearHanko, keyGuide, zoomIn, zoomIntoBattle } from './stage';
import { registerWorldFx } from '../world/fx';
import { animate, ease } from '../engine/tween';

const HINOYA_DOOR: [number, number] = [32, 21];
const HINOYA_FRONT: [number, number] = [32, 22];

/** Where おばあ stands in front of ひのや (beside Minato if he is standing there). */
function storefront(): [number, number] {
  const p = F().player;
  if (p.tileX === HINOYA_FRONT[0] && p.tileY === HINOYA_FRONT[1]) return tileFree(33, 22) ? [33, 22] : [32, 23];
  return HINOYA_FRONT;
}

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

/** まめ吉 held in the middle of his 「まいど」 bow while time stops. */
const freeze = { mame: false };
registerWorldFx({
  map: 'map_town',
  update() {
    // only while the scene runs (a jump out of it lets まめ吉 go)
    if (!game.scripts.busy) {
      freeze.mame = false;
      card.on = false;
    }
    if (!freeze.mame) return;
    const m = actor('npc_mamekichi');
    if (m) {
      m.anim = 'bow';
      m.animLoop = false;
      m.animT = 200;
    }
  },
});

/** Everyone on screen looks up; each one's head snaps up with a silent 「…」. */
function* everyoneLooksUp(): Co {
  const f = F();
  const others = f.actors.filter((a) => (a.kind === 'npc' || a.kind === 'restored') && onScreen(a) && a.visible);
  game.scripts.run(lookUpAll(true, true));
  // the balloons come a beat after the heads, 0–4 frames apart
  const order = others.slice().sort(() => Math.random() - 0.5);
  for (const a of order) {
    if (a.id === 'npc_mamekichi') continue;
    a.hop(2, 140);
    a.showEmote('dots', 3000);
    yield Math.floor(Math.random() * 5) * 16;
  }
}

registerScript('evt_chime_stop', function* (): Co {
  if (flag('flag_chime_stopped') || stage() !== 0) return;
  const f = F();
  const p = f.player;
  holdBgm(true);
  // t=0: the first step out of the shop; Minato stops, facing down — on a
  // whole tile (the step that set this off may have left him a pixel or
  // half a tile over a line, and everyone who walks up to him goes by tiles)
  p.path = [];
  p.moving = false;
  p.dir = 'down';
  yield* settle(p);
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
  // t=2.8: everyone on screen looks up at the sky (0–4 frames apart);
  // まめ吉 stops in the middle of his bow. The frame narrows, the camera
  // tilts a little towards the sky.
  yield 1500;
  setFlag('flag_maido_hold', 1);
  freeze.mame = !!actor('npc_mamekichi');
  game.scripts.run(everyoneLooksUp());
  game.scripts.run(cinema(true, 500));
  holdCamera();
  const camY0 = f.camY;
  const tilt = Math.min(10, Math.max(0, camY0));
  game.scripts.run(animate(700, (k) => (f.camY = Math.round(camY0 - tilt * k)), ease.sineInOut));
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
  freeze.mame = false;
  const mame = actor('npc_mamekichi');
  if (mame) mame.anim = null;
  for (const a of f.actors) if (a.emote?.kind === 'dots') a.emote = null;
  game.scripts.run(lookUpAll(false, false));
  game.scripts.run(cinema(false, 500));
  yield* panBack(500);
  if (hato) hato.data.scripted = true;
  if (sae && saeHere) sae.data.scripted = true;
  const cow = actor('npc_cow_statue');
  if (cow) cow.pose = 'look_up';
  // サエ goes off to the park to keep observing
  if (sae && saeHere) sendAway(sae, [[sae.tileX, 21], [20, 21], [20, 15]], 3, 900);
  yield 100;
  yield* msg(T.CHIME_STOP);
  yield* emote('player', 'question');
  // far off, only a small balloon: まめ吉, twice
  if (actor('npc_mamekichi')) {
    smallVoice('npc_mamekichi', 'まいど！', 700);
    yield 950;
    smallVoice('npc_mamekichi', 'まいど！', 700);
    yield 900;
  }
  setFlag('flag_maido_hold', 0);
  setFlag('flag_chime_stopped', 1);
  yield* hatoBlock();
});

// ---------------------------------------------------------------- 5.7 evt_hato_block

/** The business card in the hato's wing (world px), or lying at its feet. */
const card = { on: false, x: 0, y: 0, lift: 0, flat: false };
registerWorldFx({
  map: 'map_town',
  draw(_f, g, cx, cy, layer) {
    if (layer !== 'fg' || !card.on) return;
    const img = meishi()[card.flat ? 1 : 0];
    g.img(img, Math.round(card.x - img.width / 2 - cx), Math.round(card.y - img.height - card.lift - cy));
  },
});

/** The hato holds out its card towards Minato: a wing up, the card rising into view. */
function* offerCard(hato: Actor): Co {
  const p = F().player;
  const sx = Math.sign(p.x - hato.x);
  const sy = Math.sign(p.y - hato.y);
  card.flat = false;
  card.x = hato.x + sx * 7;
  card.y = hato.y - 3 + (sy < 0 ? -2 : 0);
  card.lift = 0;
  card.on = true;
  hato.hop(3, 200);
  sfx('se_meishi');
  yield* animate(220, (k) => (card.lift = Math.round(k * 4)), ease.backOut);
  sparkle(card.x + 2, card.y - card.lift - 5, 380);
}

/** ハト → ハト係長: a jump, a white flash of the silhouette, a pop of rays and dust. */
function* transform(hato: Actor): Co {
  hato.hop(7, 320);
  yield 150;
  hato.drawFn = (g) => {
    const f = F();
    const img = hato.frame();
    const [ix, iy] = hato.drawPos(img);
    g.img(img, ix - Math.round(f.camX), iy - Math.round(f.camY), { tint: '#FFF6D8', tintAmount: 1 });
  };
  sfx('se_kiran', { vol: 0.7 });
  yield 70;
  hato.setSprite('enemy_hato_kakaricho');
  yield 50;
  hato.drawFn = null;
  burst(hato.x, hato.y - 10, '#FFE7A3', 460);
  puff(hato.x, hato.y - 1);
  sfx('se_emote');
  yield 130;
  // the tie: pon
  sparkle(hato.x + 1, hato.y - 8, 420);
  sfx('se_balloon_pop', { vol: 0.5, pitch: 1.3 });
  yield 250;
}

function* hatoBlock(): Co {
  const f = F();
  const p = f.player;
  // the stage-1 hato symbol stands on the same spot: this hato becomes it
  show('sym_town_01', false);
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
  for (let tries = 0; ; tries++) {
    // close in (2×) on the two of them: the gag is a card of a few pixels
    // and a tie; the pair sits in the upper middle, clear of the window
    // (まめ吉's 「まいど」 over the shop would be cut by the frame's top edge)
    setFlag('flag_maido_hold', 1);
    const z = yield* zoomIn(Math.round((p.x + hato.x) / 2), Math.round(Math.max(p.y, hato.y)) - 14, 380);
    // nobody else's head over the window's edge in this shot
    const unclear = clearBelow(z, Math.max(p.y, hato.y), [hato]);
    if (tries === 0) {
      // a pigeon's coo, only a small balloon (no window: the chain is kept short)
      sfx('se_coo');
      smallVoice('npc_hato', 'クルッ', 750);
      yield 800;
      // the card, held out in both wings
      yield* offerCard(hato);
      yield* msg(T.HATO_CARD);
      // the tie and the staff pass pop out: ハト係長
      yield* transform(hato);
      yield* emote('player', 'exclaim', { dur: 700 });
      yield* msg(T.HATO_B);
      card.on = false;
      yield* emote('player', 'sweat');
    } else {
      // a retry: the same stand-off, without the whole speech again
      sfx('se_coo');
      yield 300;
      yield* emote('player', 'exclaim', { dur: 600 });
    }
    setFlag('flag_maido_hold', 0);
    // the 「！」 seal lands on this close-up; the field is back at 1× after the battle
    zoomIntoBattle(z);
    const r = yield* eventBattle({ enemies: ['enemy_hato_kakaricho'], music: 'bgm_battle' });
    unclear();
    if (r === 'load') return;
    if (r === 'win') break;
    // 「戦う前から やりなおす」: from the stand-off, ハト係長 already in his tie
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
  card.flat = true;
  card.lift = 0;
  card.x = hx + (p.x < hx ? -9 : 9);
  card.y = hy + 1;
  card.on = true;
  yield 500;
  sparkle(card.x, card.y - 4, 420);
  sfx('se_glint', { vol: 0.4 });
  yield 500;
  // Minato picks it up
  face('player', 'restored:sym_town_01');
  p.tempPose = 'stamp';
  sfx('se_paper_open', { vol: 0.5, pitch: 1.2 });
  yield 180;
  card.on = false;
  p.tempPose = null;
  yield 120;
  // the pick-up card in the corner says it (no window: the chain is kept short)
  giveKey('item_hato_meishi');
  sfx('se_item');
  yield 500;
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
    yield* walk('npc_obaa', [storefront()], { speed: 2 });
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
  // her question (ひのや not visited: she introduces herself first); her
  // answer and what the town does with what nobody looks at, on one page
  const i = yield* msg(flag('flag_met_obaa') ? T.HANKO_Q : T.HANKO_Q_NOVISIT);
  yield* msg(`@npc_obaa\n${T.HANKO_ANSWER[i === 1 ? 1 : 0]}{w=500}\n${T.HANKO_TOWN}`);
  yield* msg(T.HANKO_GIVE);
  // the case, opened in the middle of the screen
  playBgm('bgm_jingle_item');
  yield* playCaseGift(T.HANKO_GET);
  giveKey('item_hanko_case');
  giveKey('item_mimashita_cho');
  setFlag('flag_got_hanko', 1);
  yield 34;
  uiHud.clearNotes();
  syncProgressSkills();
  yield* msg(T.HANKO_C);
  // the how-to, once: the note beside the HUD hanko it is about
  guideNearHanko(T.GUIDE_FUSHIGI, 6000);
  // she waits at the storefront
  const [fx, fy] = storefront();
  if (ob.tileX !== fx || ob.tileY !== fy) yield* walkTo('npc_obaa', fx, fy, { speed: 2 });
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
  const [fx, fy] = storefront();
  if (ob.tileX !== fx || ob.tileY !== fy) yield* walkTo('npc_obaa', fx, fy, { speed: 2 });
  const pl = F().player;
  const blocked = pl.tileX === HINOYA_FRONT[0] && pl.tileY === HINOYA_FRONT[1];
  const atFront = ob.tileX === HINOYA_FRONT[0] && ob.tileY === HINOYA_FRONT[1];
  yield* walk('npc_obaa', blocked || atFront ? [HINOYA_DOOR] : [HINOYA_FRONT, HINOYA_DOOR], { speed: 2 });
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
  yield* settle(p);
  let ob = actor('npc_obaa');
  if (ctx.source === 'fushigi_04') {
    // A: after the stamp on まめ吉. She turns to Minato.
    if (!ob) ob = spawn('npc_obaa', HINOYA_FRONT[0], HINOYA_FRONT[1], { dir: 'down' });
    ob.data.scripted = true;
    face('npc_obaa', 'player');
    face('player', 'npc_obaa');
    // 「はい、よくできました。」 — her own marking stamp, a nod of light
    sfx('se_stamp', { vol: 0.5 });
    game.scripts.run(emote('npc_obaa', 'light', { se: false }));
    ob.pose = 'happy';
    yield 250;
    ob.pose = null;
    yield* msg(T.PARK_HINT_A);
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
  // the walk to the park begins: the dash and the menu, once (right of the HUD hanko)
  keyGuide(T.GUIDE_MENU, 5000, 38);
});

// ---------------------------------------------------------------- 5.10 evt_alley_open

registerScript('evt_alley_open', function* (): Co {
  // walking on: the line shows without taking the controls
  floatLine(T.ALLEY_OPEN, 1500);
});


registerScript('evt_hanko_given', function* (): Co {
  if (!flag('flag_got_hanko')) yield* hankoGiven();
});
