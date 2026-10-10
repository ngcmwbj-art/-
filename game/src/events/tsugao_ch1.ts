// 第1章のツガオ便 (2026-09-28 依頼主の指示; 10_narrative 6.21, 30_level_art 3.4,
// 40_audio 9.x). The town's kei truck is ツガオ便, the olive truck of chapter 2:
//   evt_tsugao_hello  — the first step out of the house (stage 0, once, from
//                       map_town_enter): the truck comes along the river road,
//                       slows to a stop beside Shun, ツガオ calls from the
//                       window and drives on east (about 3 s of driving plus
//                       two pages; control is back as it pulls away). Never on
//                       a save that has already been out (a load or a jump
//                       into the town marks it seen).
//   npc_tsugao_ch1    — ツガオ at the wheel: parked by the police box in stage
//                       0 (the route truck, talkable while it stands there);
//                       from 17:00 (stages 1–2) the truck stands in the same
//                       place with him asleep in his nightcap — Z's from the
//                       cab window, a snore every few seconds, the sleep-talk.
//   obj_hoshimi_yasai — 星見台の やさい, his crate at the sake shop's front.

import type { Co } from '../engine/co';
import { animate, ease } from '../engine/tween';
import { flag, setFlag } from '../game/state';
import { actor, msg, registerScript, stage } from '../world/api';
import type { Actor } from '../world/actor';
import { seAt } from '../world/audio';
import { fxAt, registerWorldFx } from '../world/fx';
import { pickTalk } from '../world/interact';
import { pickStage } from '../world/maps';
import { SPEAKERS } from '../world/msg';
import { sfx } from '../audio';
import { HOSHIMI_YASAI, TSUGAO_HELLO, TSUGAO_TALK } from '../data/text/tsugao_ch1';
import { sleepZ } from './art';
import { F } from './lib';
import { talkZoom, zoomOut } from './stage';

// the name tag and the voice are chapter 2's (events/ch2/tsugao.ts registers them too)
SPEAKERS.npc_tsugao ??= { name: 'ツガオ', voice: 'tsugao' };

export const FLAG_TSUGAO_HELLO = 'flag_tsugao_hello';
/** The route truck of stage 0 and the parked one of stages 1–2 (data/maps/town.ts). */
const TRUCK = 'veh_kei_truck';
const NAP = 'veh_tsugao_nap';
/** The eastbound lane of the river road (the route's y 33.5, kept 8px left): the truck's feet. */
const LANE_Y = 33.5 * 16 + 16 - 8;
/** The cab window sits 14px ahead of the truck's middle (art/props/vehicles.ts). */
const WINDOW_DX = 14;
/** Cruising speed of the route (3.2 tiles/s). */
const SPEED = 3.2 * 16;

// ---------------------------------------------------------------- evt_tsugao_hello

/**
 * Called by map_town_enter: true when this entry is the first step out of the
 * house on the errand. Any other way into the town (a load, a jump, a shop's
 * door) marks the scene as seen, so a save that has been out never gets it.
 */
export function tsugaoHelloDue(): boolean {
  if (flag(FLAG_TSUGAO_HELLO)) return false;
  const f = F();
  if (f.cameFrom !== 'map_home_1f') {
    setFlag(FLAG_TSUGAO_HELLO, 1);
    return false;
  }
  // out before the errand (no おつかい yet): keep it for the next time
  if (!flag('flag_errand')) return false;
  if (stage() !== 0 || flag('flag_met_maruyama') || flag('flag_met_obaa')) {
    setFlag(FLAG_TSUGAO_HELLO, 1);
    return false;
  }
  return true;
}

/** The truck takes up its run again from where it stands: east to the police box. */
function driveOn(a: Actor): void {
  a.data.pi = 1;
  a.data.dirn = 1;
  a.data.wait = 0;
  // on the track (the lane is 8px left of it), easing up from a stop
  a.data.offX = 0;
  a.data.offY = LANE_Y - (33.5 * 16 + 16);
  a.data.rx = a.x;
  a.data.ry = a.y - (a.data.offY as number);
  a.data.spdF = 0;
  a.data.parked = false;
  a.moving = false;
  delete a.data.scripted;
}

export function* tsugaoHello(): Co {
  setFlag(FLAG_TSUGAO_HELLO, 1);
  const f = F();
  const a = f.actorById(TRUCK);
  if (!a) return;
  const p = f.player;
  p.moving = false;
  p.path = [];
  p.dir = 'down';
  // off the west edge, in the lane nearest the house
  a.data.scripted = true;
  a.visible = true;
  a.alpha = 1;
  a.dir = 'right';
  a.x = -40;
  a.y = LANE_Y;
  // it stops with its cab window just below him
  const stopX = p.x - WINDOW_DX;
  const brake = 36;
  const x1 = stopX - brake;
  sfx('se_keitora_stop');
  a.moving = true;
  a.data.vspd = SPEED;
  yield* animate(Math.max(200, Math.round(((x1 - a.x) / SPEED) * 1000)), (k) => (a.x = -40 + (x1 + 40) * k));
  // slowing to a stop: the same speed at first, then gently down (quadOut over 2 × brake / speed)
  yield* animate(Math.round(((2 * brake) / SPEED) * 1000), (k) => (a.x = x1 + brake * k), ease.quadOut);
  a.x = stopX;
  a.moving = false;
  a.data.vspd = 0;
  yield 150;
  // close on the two (the first talks' framing, 2×): the window over the dialog
  const z = yield* talkZoom(p, a);
  yield* msg(TSUGAO_HELLO);
  yield* zoomOut(z, 300);
  // on its way: the route has it from here (Shun can move as it pulls away)
  driveOn(a);
  sfx('se_keitora_go');
}

// ---------------------------------------------------------------- ツガオ at the wheel

registerScript('npc_tsugao_ch1', function* (): Co {
  const s = stage();
  if (s >= 3) return;
  if (s >= 1) {
    const a = actor(NAP);
    if (a) seAt('se_h_ibiki', a.x + WINDOW_DX, a.y - 20);
    yield 300;
  }
  const key = pickTalk('npc_tsugao', TSUGAO_TALK);
  if (key) yield* msg(TSUGAO_TALK[key]);
});

registerScript('obj_hoshimi_yasai', function* (): Co {
  sfx('se_examine');
  const t = pickStage(HOSHIMI_YASAI);
  if (t) yield* msg(t);
});

// ---------------------------------------------------------------- asleep at the wheel (stages 1–2)

/** Z's drifting up from the cab window, and a snore every 4.5 s where he sleeps. */
const nap = { t: 0, snore: 2500 };
registerWorldFx({
  map: 'map_town',
  anchored: true,
  update(f, dt) {
    const a = f.actorById(NAP);
    if (!a || !a.visible) return;
    nap.t += dt;
    nap.snore -= dt;
    if (nap.snore <= 0) {
      nap.snore = 4500;
      // (the world fades it with the distance; not while he talks in his sleep)
      if (!f.talking) seAt('se_h_ibiki', a.x + WINDOW_DX, a.y - 20);
    }
  },
  draw(f, g, cx, cy, layer) {
    if (layer !== 'top') return;
    const a = f.actorById(NAP);
    if (!a || !a.visible) return;
    const zs = sleepZ();
    // the window of a truck facing east: its top right, the Z's rising off it
    const wx = a.x + WINDOW_DX - 2;
    const wy = a.y - 24;
    // (the window's height over the truck's wheels)
    const [sx, sy] = fxAt(f, wx, wy, cx, cy, a.y);
    for (let i = 0; i < 2; i++) {
      const ph = (nap.t / 2600 + i / 2) % 1;
      const img = zs[Math.min(1, Math.floor(ph * 2))];
      const x = sx + 2 + ph * 8 + Math.sin(ph * 6.3) * 1.5;
      const y = sy - ph * 14;
      g.alpha(Math.sin(Math.PI * ph) * 0.9, () => g.img(img, Math.round(x - img.width / 2), Math.round(y - img.height)));
    }
  },
});
