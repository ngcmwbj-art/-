// Level logic of the interiors and the mall: things that belong to the maps
// themselves rather than to the story.
//
//  - 清掃中 sign (M4 x15,y4): solid until the required ソウジロウ is beaten
//    (the tile spec's `solid` is flipped; flag_soujirou_gate is set here too).
//  - the backyard shortcut: arriving in M3 through the STAFF door opens it for
//    good (flag_mall_staffdoor).
//  - ambience that depends on map state: the far kaitenyaki in M1 (−18 dB,
//    LP 1.5 kHz), turn / flicker events synced with the art, dryer No.3 and the
//    kaitenyaki machine falling silent once their fushigi are stamped.
//  - fushigi_11's 「アリガトウゴザイマシタ」 balloons on the stopped escalator.
//  - idle routines of the shopkeepers (丸山 peeks at the fryer every 4 s, おばあ
//    breathes on her stamp then reads the ledger, 巡査 flips his notebook).
//  - onEnter wrappers that start the first-visit events only once.
//  - the robot vacuums keep to their beat (2F x2–14, never into the exits).
//  - trig_maigo_door_rest fires once when standing at the opened door (5.17).
//  - debug: __game.cmd.lv(name[, x, y]) jumps into any interior; lvDoors()
//    checks every door; lvGate(on) / lvWon(symId) / lvPile('shake'|'hide'|'show').

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { flag, setFlag, state, type Dir } from '../../game/state';
import { registerDebug } from '../../debug';
import { lvTime } from '../../art/props/istate';
import { tube } from '../../art/props/ishell';
import { kanaSmall, kanaWidth } from '../../art/props/ifurn';
import { P } from '../../art/tiles/palette';
import { field, FieldScene } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { fushigiDone, onFushigiPressed } from '../../world/fushigi';
import { getScript, registerScript } from '../../world/scripts';
import { runMsg } from '../../world/msg';
import type { DoorObj, TileSpec } from '../../world/types';
import { cellAt, loadMap } from '../../world/maps';
import * as snd from '../../world/audio';
import { maigoPileHide, maigoPileShake } from './lv_api';
import './lv_fallback';

/** The 'C' cell of M4 (shared by reference with the loaded map's cells). */
export const CLEANING_SPEC: TileSpec = { ground: 'mall', solid: true, tag: 'cleaning' };

/** Seeds of the one flickering tube per mall area (art uses the same ones). */
export const TUBE_SEED: Record<string, number> = {
  map_mall_hall: 101,
  map_mall_food: 202,
  map_mall_health: 303,
  map_mall_2f: 404,
};

/**
 * Where the robot vacuums may roam (tile columns, inclusive): 2F keeps to
 * x2–14 (1.5), the food court never rolls into the exits of x19.
 */
const SOUJI_X: Record<string, [number, number]> = {
  map_mall_2f: [2, 14],
  map_mall_food: [1, 18],
};

function keepSoujirou(f: FieldScene): void {
  const b = SOUJI_X[f.map.id];
  if (!b) return;
  const lo = b[0] * 16 + 8;
  const hi = b[1] * 16 + 8;
  for (const a of f.actors) {
    if (a.kind !== 'sym' || (a.data.sym as { kind?: string } | undefined)?.kind !== 'soujirou') continue;
    if (a.x >= lo && a.x <= hi) continue;
    const west = a.x < lo;
    a.x = west ? lo : hi;
    // bump like at a wall: turn aside (or back) with the little knock
    if (a.dir === (west ? 'left' : 'right')) {
      const r = Math.random();
      a.dir = r < 0.3 ? (west ? 'right' : 'left') : r < 0.65 ? 'up' : 'down';
      snd.se('se_robot_bump', { vol: 0.5 });
    }
  }
}

function gateOpen(): boolean {
  return !!state.taken['sym_mall_2f_01'] || flag('flag_soujirou_gate') > 0;
}

// ---------------------------------------------------------------- per-frame logic

let lastMap = '';
let lastField: FieldScene | null = null;
let tubeWas = 1;
let turnK = -1;
let ambT = 0;
let escY = -1;
let escShowT = 0;
let escX = 0;
let escYpx = 0;
const idle = new Map<string, number>();

function onEnterMap(f: FieldScene): void {
  lvTime.map = f.map.id;
  lvTime.enterT = f.t;
  lvTime.pileShakeUntil = 0;
  lvTime.pileHidden = f.map.id === 'map_mall_maigo' && flag('flag_boss_beaten') > 0;
  tubeWas = 1;
  turnK = -1;
  escY = -1;
  escShowT = 0;
  idle.clear();
  ambT = 0;
}

function ambience(f: FieldScene): void {
  const id = f.map.id;
  if (id === 'map_mall_hall' || id === 'map_mall_food') {
    if (fushigiDone('fushigi_12') || flag('flag_got_maigo_key')) snd.stopAmbient('amb_kaitenyaki', 0.3);
    else if (id === 'map_mall_hall') snd.playAmbient('amb_kaitenyaki', { vol: 0.126, lp: 1500 });
  }
  if (id === 'map_laundry' && fushigiDone('fushigi_05')) snd.stopAmbient('amb_dryer', 0.3);
}

registerWorldFx({
  map: '',
  update(f, dt) {
    // the 清掃中 sign blocks the corridor until the 2F ソウジロウ is beaten
    const open = gateOpen();
    CLEANING_SPEC.solid = !open;
    if (open && !flag('flag_soujirou_gate') && state.taken['sym_mall_2f_01']) setFlag('flag_soujirou_gate', 1);

    if (f !== lastField || f.map.id !== lastMap) {
      lastField = f;
      lastMap = f.map.id;
      onEnterMap(f);
    }
    const id = f.map.id;
    // re-assert map-state ambience now and then (entry, return from battle)
    ambT -= dt;
    if (ambT <= 0) {
      ambT = 900;
      ambience(f);
    }
    // the flickering tube → the hum's "ジジッ"
    const seed = TUBE_SEED[id];
    if (seed !== undefined) {
      const on = tube(f.t, seed);
      if (tubeWas === 1 && on === 0) snd.ambientEvent('amb_fluorescent', 'flicker');
      tubeWas = on;
    }
    // the kaitenyaki's "ゴトン" once per turn (2.0 s), in step with the art
    if ((id === 'map_mall_food' || id === 'map_mall_hall') && !fushigiDone('fushigi_12') && !flag('flag_got_maigo_key')) {
      const k = Math.floor(f.t / 2000);
      if (turnK >= 0 && k !== turnK) snd.ambientEvent('amb_kaitenyaki', 'turn');
      turnK = k;
    }
    if (id === 'map_mall_health') escalatorThanks(f, dt);
    if (id === 'map_mall_2f') restHint(f);
    keepSoujirou(f);
    shopkeepers(f, dt);
  },
  draw(f, g, cx, cy, layer) {
    if (layer !== 'top' || f.map.id !== 'map_mall_health' || escShowT <= 0) return;
    const img = thanksBalloon();
    const pop = escShowT > 620 ? 1 : 0;
    const a = Math.min(1, escShowT / 120);
    g.alpha(a, () => g.img(img, Math.round(escX - img.width / 2 - cx), Math.round(escYpx - cy - pop)));
  },
});

// ---------------------------------------------------------------- trig_maigo_door_rest

/**
 * 5.17: 「扉の前に立ったとき（flag_maigo_door_open=1 で、一度だけ）」. The door is
 * opened while standing in front of it, so an enter-trigger would never fire:
 * once the door is open and nothing else is running, standing in x18–20,
 * y2–3 plays the rest hint once (same state.taken key as the trig object).
 */
function restHint(f: FieldScene): void {
  const key = 'trig:map_mall_2f:trig_maigo_door_rest';
  if (state.taken[key] || !flag('flag_maigo_door_open')) return;
  if (game.scripts.busy || f.talking !== null || !f.controllable) return;
  const tx = f.player.tileX;
  const ty = f.player.tileY;
  if (tx < 18 || tx > 20 || ty < 2 || ty > 3) return;
  state.taken[key] = true;
  f.runScriptId('trig_maigo_door_rest', 'trig_maigo_door_rest');
}

// ---------------------------------------------------------------- fushigi_11 balloons

let THANKS: HTMLCanvasElement | null = null;
function thanksBalloon(): HTMLCanvasElement {
  if (THANKS) return THANKS;
  const s = 'アリガトウゴザイマシタ';
  const tw = kanaWidth(s);
  const w = tw + 7;
  const p = new PixelCanvas(w, 16);
  p.rect(1, 1, w - 2, 11, P.white);
  p.hline(2, w - 3, 1, P.glint);
  p.strokeRect(0, 0, w, 13, P.ink);
  for (const [x, y] of [[0, 0], [w - 1, 0], [0, 12], [w - 1, 12]]) p.set(x, y, 'transparent');
  p.hline(2, w - 3, 11, P.concreteLt);
  // a mechanical-looking tail pointing down-left (to the step)
  p.set(5, 13, P.ink);
  p.set(6, 13, P.white);
  p.set(7, 13, P.ink);
  p.set(5, 14, P.ink);
  p.set(6, 14, P.ink);
  p.hline(5, 6, 12, P.white);
  kanaSmall(p, s, 3, 3, P.navy);
  THANKS = p.toCanvas();
  return THANKS;
}

function escalatorThanks(f: FieldScene, dt: number): void {
  if (escShowT > 0) escShowT -= dt;
  const p = f.player;
  const tx = p.tileX;
  const ty = p.tileY;
  const onStep = tx === 7 && ty >= 3 && ty <= 6;
  if (!onStep) {
    escY = -1;
    return;
  }
  if (fushigiDone('fushigi_11')) {
    escY = ty;
    return;
  }
  // one balloon per step climbed (going north)
  if (escY !== -1 && ty < escY && p.moving) {
    escShowT = 760;
    escX = tx * 16 + 8 + 22;
    escYpx = ty * 16 - 20;
    snd.se('se_vending_voice', { vol: 0.35, pitch: 1 + (6 - ty) * 0.05 });
  }
  escY = ty;
}

// ---------------------------------------------------------------- shopkeepers' idle routines

function shopkeepers(f: FieldScene, dt: number): void {
  const busy = game.scripts.busy || f.talking !== null;
  const step = (id: string, period: number, hold: number, on: string | null, off: string | null) => {
    const a = f.actors.find((x) => x.id === id);
    if (!a || a.data.scripted || a.path.length) return;
    if (busy) return;
    let t = (idle.get(id) ?? Math.random() * period) + dt;
    if (t > period + hold) t -= period + hold;
    idle.set(id, t);
    a.pose = t > period ? on : off;
  };
  switch (f.map.id) {
    case 'map_maruyama':
      // arms folded → every 4 s a look at the fryer
      step('npc_maruyama', 4000, 1300, 'peek', null);
      break;
    case 'map_hinoya':
      // breathes on the marking stamp (2 frames) → glasses on, reads the ledger
      step('npc_obaa', 3200, 2600, 'read', 'breathe');
      break;
    case 'map_koban':
      step('npc_tsurumi', 4000, 1500, 'note', null);
      break;
  }
}

// ---------------------------------------------------------------- press listeners

onFushigiPressed((id) => {
  if (id === 'fushigi_05') snd.stopAmbient('amb_dryer', 1.2);
  if (id === 'fushigi_12') snd.stopAmbient('amb_kaitenyaki', 1.2);
});

// ---------------------------------------------------------------- onEnter wrappers

function* runIf(id: string, ctx: Parameters<NonNullable<ReturnType<typeof getScript>>>[0]): Co {
  const s = getScript(id);
  if (s) yield* s(ctx);
}

registerScript('lv_in_maruyama', function* (ctx) {
  if (!flag('flag_met_maruyama') && flag('flag_stage') === 0) yield* runIf('evt_maruyama_first', ctx);
});
registerScript('lv_in_hinoya', function* (ctx) {
  if (!flag('flag_met_obaa') && flag('flag_stage') === 0) yield* runIf('evt_obaa_first', ctx);
});
registerScript('lv_in_mall_hall', function* (ctx) {
  if (!flag('flag_mall_entered')) yield* runIf('evt_mall_enter', ctx);
});
/** Coming out of the backyard (STAFF door) into M3 unlocks it from this side for good. */
registerScript('lv_in_mall_health', function* () {
  const f = field();
  if (!f || flag('flag_mall_staffdoor')) return;
  if (f.player.tileX !== 2 || f.player.tileY !== 3) return;
  setFlag('flag_mall_staffdoor', 1);
  yield 250;
  yield* runMsg(`@narr
段ボールの 積まれた 通路を 抜けると、
健康器具コーナーの 裏に 出た。
/
扉の カギを、内側から 開けておいた。`);
});

// ---------------------------------------------------------------- debug

const SPOTS: Record<string, [string, number, number, Dir, number]> = {
  maruyama: ['map_maruyama', 4, 5, 'up', -1],
  hinoya: ['map_hinoya', 4, 6, 'up', -1],
  laundry: ['map_laundry', 3, 5, 'up', -1],
  koban: ['map_koban', 4, 5, 'up', -1],
  m1: ['map_mall_hall', 10, 13, 'up', 2],
  m2: ['map_mall_food', 18, 6, 'left', 2],
  m3: ['map_mall_health', 1, 7, 'right', 2],
  m4: ['map_mall_2f', 2, 4, 'right', 2],
  m5: ['map_mall_maigo', 6, 9, 'up', 2],
};

/**
 * __game.cmd.lv('m1') — jump into an interior / mall area (sets stage 2 for
 * the mall when the current stage is lower). lv() lists the names.
 */
registerDebug('lv', (name?: string, x?: number, y?: number) => {
  const s = name ? SPOTS[name] ?? SPOTS[name.replace(/^map_/, '')] : undefined;
  if (!s) return Object.keys(SPOTS);
  const cmd = (window as unknown as { __game: { cmd: Record<string, (...a: unknown[]) => unknown> } }).__game.cmd;
  if (s[4] >= 0 && flag('flag_stage') < s[4]) cmd.stage?.(s[4]);
  return cmd.warp?.(s[0], x ?? s[1], y ?? s[2], s[3]);
});
/** QA: mark a mall symbol as beaten (its restored object appears): lvWon('sym_mall_food_01'). */
registerDebug('lvWon', (id = 'sym_mall_food_01', on = true) => {
  if (on) state.taken[id] = true;
  else delete state.taken[id];
  field()?.refreshPresence();
  return `${id} ${on ? 'beaten' : 'restored'}`;
});
/** QA: the M5 heap — lvPile('shake') / lvPile('hide') / lvPile('show'). */
registerDebug('lvPile', (what = 'shake') => {
  if (what === 'hide') maigoPileHide(true);
  else if (what === 'show') maigoPileHide(false);
  else maigoPileShake(900);
  return what;
});
/** Toggle the 2F corridor gate (QA): lvGate(true) = ソウジロウ beaten. */
registerDebug('lvGate', (on?: boolean) => {
  state.taken['sym_mall_2f_01'] = on ?? !state.taken['sym_mall_2f_01'];
  if (!state.taken['sym_mall_2f_01']) setFlag('flag_soujirou_gate', 0);
  field()?.refreshPresence();
  return `gate ${gateOpen() ? 'open' : 'closed'}`;
});

/**
 * QA: check every door of the interiors, the mall and the town doors that
 * lead into them — target map registered, arrival tile walkable and not a
 * step-door (no bounce), and a way back. __game.cmd.lvDoors()
 */
registerDebug('lvDoors', () => {
  const MAPS = ['map_town', 'map_maruyama', 'map_hinoya', 'map_laundry', 'map_koban', 'map_mall_hall', 'map_mall_food', 'map_mall_health', 'map_mall_2f', 'map_mall_maigo'];
  const out: string[] = [];
  let ok = 0;
  for (const id of MAPS) {
    const m = loadMap(id);
    if (!m) {
      out.push(`${id}: not registered`);
      continue;
    }
    for (const o of m.objects) {
      if (o.t !== 'door') continue;
      const d = o as DoorObj;
      if (id === 'map_town' && !MAPS.includes(d.to)) continue;
      const t = loadMap(d.to);
      if (!t) {
        out.push(`${id} ${d.id}: target ${d.to} missing`);
        continue;
      }
      const c = cellAt(t, d.tx, d.ty);
      if (c.solid) out.push(`${id} ${d.id}: arrival ${d.to} (${d.tx},${d.ty}) is solid`);
      const bounce = t.objects.some((q) => q.t === 'door' && (q as DoorObj).step && d.tx >= q.x && d.ty >= q.y && d.tx < q.x + ((q as DoorObj).w ?? 1) && d.ty < q.y + ((q as DoorObj).h ?? 1));
      if (bounce) out.push(`${id} ${d.id}: arrival (${d.tx},${d.ty}) sits on a step door`);
      const back = t.objects.some((q) => q.t === 'door' && (q as DoorObj).to === id);
      if (!back) out.push(`${id} ${d.id}: no door back from ${d.to}`);
      if (!c.solid && !bounce && back) ok++;
    }
  }
  return { ok, problems: out };
});

export type { Gfx };
