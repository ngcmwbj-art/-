// 屋上 ゆうやけひろば (map_mall_roof): the side quest 「屋上ゆうやけひろばの
// 『4人目』」 (10_narrative 7.18, ★2026-09-28 — docs/ideas/2026-09-28 #2).
//
//  - evt_roof_note: 『握手会 お名前ノート』 (three names; four after).
//  - カネナリくん on the roof (kanenari_map_mall_roof, from interact.ts): the
//    first time the place flip (the note must still be here); once the note
//    is read he goes up on the stage by himself — evt_roof_handshake:
//    「握手する」→ the warm hand, 「（4人目の 人）」「（記録 更新です）」,
//    しゅん writes his name on the 4th line, 握手券. 「やめておく」→
//    「（あと 1年は 待てます）」 (he asks again next time).
//  - evt_roof_panda: 100 yen, the panda goes 1 m and comes back.
//  - evt_roof_scope: 100 yen (once — the timer never runs, it is 17:00),
//    the east through the lenses: beyond the mountains it is night.
//  - debug: __game.cmd.roof() (stage 2 with カネナリくん, on the roof),
//    roofReset(), roofText() (every page: 3 lines × 336 px).

import type { Co } from '../engine/co';
import { measure } from '../engine/font';
import { flag, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { sfx } from '../audio';
import { msg, registerScript } from '../world/api';
import { registerWorldFx } from '../world/fx';
import type { Actor } from '../world/actor';
import { animate, ease } from '../engine/tween';
import { W, H } from '../engine/screen';
import { drawScopeView, RIDE, roofRt } from '../art/props/mall_roof';
import {
  HS_FLIP,
  HS_NO,
  HS_OPEN,
  HS_OPEN_AGAIN,
  HS_TICKET,
  HS_WARM,
  HS_WRITE,
  ROOF_FLIP_DONE,
  ROOF_FLIP_FIRST,
  ROOF_NO_COIN,
  ROOF_NOTE,
  ROOF_NOTE_AFTER,
  ROOF_PANDA,
  ROOF_PANDA_ASK,
  ROOF_PANDA_RIDE,
  ROOF_SCOPE,
  ROOF_SCOPE_AGAIN,
  ROOF_SCOPE_ASK,
  ROOF_SCOPE_SEEN,
  ROOF_SCOPE_SEEN2,
  ROOF_TEXTS,
} from '../data/text/mall_roof';
import { F, getKeyItem, panBack, panTo, tileFree, tileRoute } from './lib';
import { talkZoom, zoomOut } from './stage';

const ROOF = 'map_mall_roof';
/** Where カネナリくん stands on the stage (world px, feet) and how high the stage is. */
const STAGE_SPOT: [number, number] = [192, 64];
const STAGE_H = 7;
/** Where しゅん stands to shake hands (world px, feet): just below the stage's edge. */
const SHAKE_SPOT: [number, number] = [192, 80];

// ---------------------------------------------------------------- small staging helpers

/** カネナリくん holds up his board for one message (as events/mall.ts flip()). */
function* flipMsg(text: string): Co<number> {
  const k = F().follower;
  if (!k) return yield* msg(text);
  const had = !!k.data.scripted;
  k.data.scripted = true;
  k.tempPose = 'flip_hold';
  sfx('se_flip');
  const i = yield* msg(text);
  k.tempPose = null;
  if (!had) delete k.data.scripted;
  return i;
}

/** Walk an actor along tiles, then on to a pixel spot. */
function* walkRoute(a: Actor, tiles: [number, number][], px?: [number, number], speed = 3.2): Co {
  a.data.scripted = true;
  a.pathSpeed = speed * 16;
  for (const [tx, ty] of tiles) a.path.push([tx * 16 + 8, ty * 16 + 16]);
  if (px) a.path.push([px[0], px[1]]);
  yield () => a.path.length === 0;
  a.moving = false;
}

/** A route from the actor's tile to one of `goals` (the first reachable), never through `avoid`. */
function routeTo(a: Actor, goals: [number, number][], avoid: [number, number][]): [number, number][] | null {
  for (const g of goals) {
    if (avoid.some(([x, y]) => x === g[0] && y === g[1])) continue;
    if (a.tileX === g[0] && a.tileY === g[1]) return [];
    const r = tileRoute([a.tileX, a.tileY], g, avoid, 40);
    if (r) return r;
  }
  return null;
}

/** Hop an actor from its feet to (x, y) with its draw lifted to `oy` (up onto / down from the stage). */
function* hopTo(a: Actor, x: number, y: number, oy: number, ms = 280): Co {
  const x0 = a.x;
  const y0 = a.y;
  const o0 = a.oy;
  a.hop(7, ms);
  sfx('se_step_kanenari', { vol: 0.8 });
  yield* animate(ms, (k) => {
    a.x = x0 + (x - x0) * k;
    a.y = y0 + (y - y0) * k;
    a.oy = Math.round(o0 + (oy - o0) * k);
  });
  a.x = x;
  a.y = y;
  a.oy = oy;
  sfx('se_step_kanenari', { vol: 0.6, pitch: 0.9 });
}

// ---------------------------------------------------------------- the name book

registerScript('evt_roof_note', function* (): Co {
  sfx('se_examine');
  if (flag('flag_roof_handshake')) {
    yield* msg(ROOF_NOTE_AFTER);
    return;
  }
  sfx('se_page', { vol: 0.6 });
  yield* msg(ROOF_NOTE);
  const first = !flag('flag_roof_note');
  setFlag('flag_roof_note', 1);
  // the first time, カネナリくん looks over at the stage (the hint: talk to him)
  const k = F().follower;
  if (first && k && flag('flag_kanenari_joined')) {
    k.data.scripted = true;
    k.dir = 'up';
    yield 200;
    k.showEmote('dots', 900);
    yield 900;
    delete k.data.scripted;
  }
});

// ---------------------------------------------------------------- カネナリくん on the roof

registerScript('kanenari_' + ROOF, function* (ctx): Co {
  if (flag('flag_roof_handshake')) {
    yield* flipMsg(ROOF_FLIP_DONE);
    return;
  }
  if (!flag('flag_roof_note')) {
    if (!flag('flag_roof_flip')) {
      setFlag('flag_roof_flip', 1);
      yield* flipMsg(ROOF_FLIP_FIRST);
      return;
    }
    yield* ctx.runDefault();
    return;
  }
  yield* handshake();
});

function* handshake(): Co {
  const f = F();
  const p = f.player;
  const k = f.follower;
  if (!k) return;
  k.data.scripted = true;
  p.path = [];
  p.moving = false;
  // he goes up on the stage by himself (the camera shows the stage)
  k.hop(3, 150);
  sfx('se_emote_light');
  yield 260;
  yield* showStage();
  const up = routeTo(k, [[12, 4], [11, 4], [13, 4], [10, 4], [14, 4]], [[p.tileX, p.tileY]]);
  if (up) yield* walkRoute(k, up, undefined, 3.4);
  yield* hopTo(k, STAGE_SPOT[0], STAGE_SPOT[1], -STAGE_H);
  k.dir = 'down';
  yield 250;
  const again = !!flag('flag_roof_hs_declined');
  const choice = yield* flipMsg(again ? HS_OPEN_AGAIN : HS_OPEN);
  if (choice !== 0) {
    setFlag('flag_roof_hs_declined', 1);
    yield* flipMsg(HS_NO);
    yield* stepDown(k);
    yield* panBack(500);
    return;
  }
  // しゅん steps up to the edge of the stage
  const toShake = routeTo(p, [[12, 4], [11, 4]], [[k.tileX, k.tileY]]);
  if (toShake) yield* walkRoute(p, toShake, SHAKE_SPOT, 4);
  else {
    p.x = SHAKE_SPOT[0];
    p.y = SHAKE_SPOT[1];
  }
  p.dir = 'up';
  p.moving = false;
  yield 200;
  const z = yield* talkZoom(k, p, 450);
  // the handshake: his mitten round しゅん's hand, shaken three times
  roofRt.clasp = { x: STAGE_SPOT[0] + 1, y: STAGE_SPOT[1] - STAGE_H - 3, t0: f.t };
  sfx('se_step_kanenari', { vol: 0.35, pitch: 1.3 });
  yield 1000;
  yield* msg(HS_WARM);
  roofRt.clasp = null;
  yield 200;
  yield* flipMsg(HS_FLIP);
  yield* zoomOut(z, 420);
  // the 4th line of the book
  const toBook = routeTo(p, [[16, 4], [17, 3]], [[k.tileX, k.tileY]]);
  if (toBook) yield* walkRoute(p, toBook, undefined, 4);
  p.dir = p.tileX === 17 ? 'left' : 'up';
  p.moving = false;
  yield 250;
  sfx('se_pen_write');
  yield 380;
  sfx('se_pen_write', { pitch: 1.1 });
  setFlag('flag_roof_handshake', 1);
  yield 300;
  yield* msg(HS_WRITE);
  // he comes down with the ticket
  yield* stepDown(k, [[15, 4], [16, 5], [17, 4]]);
  k.dir = k.tileX < p.tileX ? 'right' : k.tileX > p.tileX ? 'left' : 'up';
  k.hop(3, 150);
  yield 200;
  yield* getKeyItem('item_akushuken', HS_TICKET);
  delete k.data.scripted;
  yield* panBack(500);
}

/** Hop down off the stage to the first free spot in front of it (or beside しゅん), and take up following again. */
function* stepDown(k: Actor, spots: [number, number][] = [[12, 4], [11, 4], [13, 4]]): Co {
  const p = F().player;
  const free = spots.find(([x, y]) => tileFree(x, y) && !(p.tileX === x && p.tileY === y)) ?? [12, 5];
  const land: [number, number] = [free[0] * 16 + 8, free[1] * 16 + 16];
  // off the front edge first, then along
  yield* hopTo(k, k.x, SHAKE_SPOT[1], 0, 260);
  k.oy = 0;
  if (Math.abs(land[0] - k.x) > 1 || Math.abs(land[1] - k.y) > 1) {
    k.pathSpeed = 3.4 * 16;
    k.path.push([land[0], SHAKE_SPOT[1]], land);
    yield () => k.path.length === 0;
    k.moving = false;
  }
  delete k.data.scripted;
}

/** Pan the camera up so the whole stage is in the frame (the roof is only 24 px taller than the screen). */
function* showStage(): Co {
  const f = F();
  if (f.camY <= 4) return;
  yield* panTo(12, 6, 450);
}

// ---------------------------------------------------------------- the clasped hands (drawn over the pair)

registerWorldFx({
  map: ROOF,
  draw(f, g, cx, cy, layer) {
    const c = roofRt.clasp;
    if (layer !== 'sorted' || !c) return;
    const u = f.t - c.t0;
    const bob = u < 1300 ? [0, -1, 0, 1][Math.floor(u / 110) % 4] : 0;
    const x = Math.round(c.x - cx);
    const y = Math.round(c.y - cy) + bob;
    // しゅん's arm reaching up past his head (the tee's sleeve, then the hand)
    g.rect(x + 2, y + 4, 2, 3, '#5FA85A');
    g.rect(x + 1, y + 2, 2, 2, '#FFD9B8');
    // カネナリくん's mitten over it, his fur arm from above
    g.rect(x - 2, y - 3, 2, 3, '#F2894B');
    g.rect(x - 2, y - 1, 5, 3, '#F2894B');
    g.rect(x - 1, y - 1, 3, 1, '#F7C27A');
    g.px(x - 3, y, '#2A2440');
    g.rect(x - 2, y + 2, 5, 1, '#2A2440');
    g.px(x + 3, y, '#2A2440');
    g.px(x + 3, y + 1, '#2A2440');
  },
});

// ---------------------------------------------------------------- the panda car

registerScript('evt_roof_panda', function* (): Co {
  sfx('se_examine');
  if (!flag('flag_seen_obj_roof_panda')) {
    setFlag('flag_seen_obj_roof_panda', 1);
    yield* msg(ROOF_PANDA);
  }
  const i = yield* msg(ROOF_PANDA_ASK);
  if (i !== 0) return;
  if (state.money < 100) {
    yield* msg(ROOF_NO_COIN);
    return;
  }
  state.money -= 100;
  sfx('se_coin');
  yield 350;
  const f = F();
  const p = f.player;
  p.hop(5, 180);
  yield 160;
  p.visible = false;
  roofRt.ride = { t0: f.t, sprite: p.spriteId };
  sfx('se_panda_ride');
  yield () => f.t - (roofRt.ride?.t0 ?? 0) >= RIDE.off;
  p.visible = true;
  p.hop(5, 180);
  roofRt.ride = null;
  yield 300;
  setFlag('flag_roof_panda_rides', flag('flag_roof_panda_rides') + 1);
  yield* msg(ROOF_PANDA_RIDE);
});

// ---------------------------------------------------------------- the coin binocular

const scope = { on: false, k: 0, pan: 0 };

registerScript('evt_roof_scope', function* (): Co {
  sfx('se_examine');
  const paid = !!flag('flag_roof_scope_paid');
  if (!paid) {
    yield* msg(ROOF_SCOPE);
    const i = yield* msg(ROOF_SCOPE_ASK);
    if (i !== 0) return;
    if (state.money < 100) {
      yield* msg(ROOF_NO_COIN);
      return;
    }
    state.money -= 100;
    setFlag('flag_roof_scope_paid', 1);
    sfx('se_coin');
    yield 300;
  } else yield* msg(ROOF_SCOPE_AGAIN);
  yield* lookThrough();
  yield* msg(paid ? ROOF_SCOPE_SEEN2 : ROOF_SCOPE_SEEN);
});

function* lookThrough(): Co {
  const hud = flag('flag_hud_hidden');
  setFlag('flag_hud_hidden', 1);
  scope.on = true;
  scope.k = 0;
  scope.pan = 0;
  sfx('se_shutter');
  yield* animate(320, (k) => (scope.k = k), ease.sineInOut);
  yield 500;
  // the head turns east: the town, the railway, the mountains — and the night beyond
  yield* animate(3400, (k) => (scope.pan = k), ease.sineInOut);
  yield 1300;
  sfx('se_shutter', { pitch: 0.9 });
  yield* animate(260, (k) => (scope.k = 1 - k), ease.sineInOut);
  scope.on = false;
  setFlag('flag_hud_hidden', hud);
  yield 250;
}

registerWorldFx({
  map: ROOF,
  draw(f, g, _cx, _cy, layer) {
    if (layer !== 'top' || !scope.on) return;
    drawScopeView(g, W, H, scope.k, scope.pan, f.t);
  },
});

// ---------------------------------------------------------------- entering

registerScript('lv_in_mall_roof', function* (): Co {
  // a ride or a close-up cut off by a load never outlives the map
  roofRt.ride = null;
  roofRt.clasp = null;
  scope.on = false;
  setFlag('flag_roof_visited', 1);
});

// ---------------------------------------------------------------- debug

/** QA: straight onto the roof in stage 2 with カネナリくん (via the 2F beat). */
registerDebug('roof', (x = 2, y = 4, dir = 'down') => {
  const cmd = (window as unknown as { __game: { cmd: Record<string, (...a: unknown[]) => unknown> } }).__game.cmd;
  cmd.jump?.('mall2f', true);
  return cmd.warp?.(ROOF, x, y, dir);
});

/** QA: forget the roof's quest (the book, the handshake, the coins). */
registerDebug('roofReset', () => {
  for (const id of ['flag_roof_note', 'flag_roof_flip', 'flag_roof_hs_declined', 'flag_roof_handshake', 'flag_roof_scope_paid', 'flag_roof_panda_rides', 'flag_seen_obj_roof_panda'])
    setFlag(id, 0);
  state.inventory = state.inventory.filter((i) => i !== 'item_akushuken');
  return 'roof reset';
});

/** QA: every roof page — at most 3 lines, each at most 336 px (10_narrative 1.1). */
registerDebug('roofText', () => {
  const bad: string[] = [];
  let pages = 0;
  for (const [name, src] of Object.entries(ROOF_TEXTS)) {
    let lines: string[] = [];
    const flush = () => {
      if (!lines.length) return;
      pages++;
      if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
      lines = [];
    };
    for (const raw of src.split('\n')) {
      const t = raw.trim();
      if (!t || t.startsWith('>')) continue;
      if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || /^\[.*\]$/.test(t)) {
        flush();
        continue;
      }
      const w = measure(t.replace(/\{[^}]*\}/g, ''));
      if (w > 336) bad.push(`${name}: ${w}px: ${t}`);
      lines.push(t);
    }
    flush();
  }
  return { pages, bad };
});
