// 第3章 序〜1幕（60_ch3_story 10.0〜10.6、63 12.1〜12.4、62 1.4・3.9・4.1・5.1）:
//
//   S00 evt_ch3_title       black, one wave that comes in and doesn't go back, the
//                           chapter's door (「第3章」『海ぞいの町の いただきます』),
//                           the report card if chapter3Adjust() raised a level
//   S01 evt_ch3_prologue    小林家 1F, 9月1日 11:10: 母, the tomato (おまけ), the TV
//   S02 evt_ch3_hinoya      ひのや: the tomato to おばあ, the はなまる on the hand
//   S03 (no evt)            焼きそばのたかし is shut: グソっ君's bubble on the way past
//   S04 evt_ch3_truck_go    銀座の東の角: ツガオ便 「乗ってくか？」 → the truck's bed
//                           (map_c3_nidai): the yakiimo, the smell of the sea, the
//                           clock riffling 11:58 → 12:00 and stopping
//   S05 evt_ch3_arrive      map_umizoi, the harbour at noon (flag_ch3_stage 1)
//   S06 evt_ch3_kids        the children of the breakwater, the map
//
// ui/flow.startChapter3 runs evt_ch3_prologue on map_home_1f at the front door
// with the screen black. The truck in 夕鳴町 and at the harbour is staged here
// (spawned actors), not placed in the maps. Where a chapter-3 map isn't
// registered yet, the scene goes on over a dark curtain with the same lines.

import type { Co } from '../../engine/co';
import { game, type Scene } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { flag, setFlag, removeItem } from '../../game/state';
import { playBgm, stopBgm, playAmbient, stopAmbient } from '../../audio';
import { despawn, registerScript, setFollowerVisible, spawn, walk } from '../../world/api';
import { registerWorldFx } from '../../world/fx';
import type { FieldScene } from '../../world/field';
import { hasMap } from '../../world/maps';
import type { NpcObj } from '../../world/types';
import type { Actor } from '../../world/actor';
import { vehicleFrame, type VehicleView } from '../../art/props/vehicles';
import { P } from '../../art/tiles/palette';
import { playChapterDoor } from '../../ui/chapter_door';
import { chapter3LevelUps } from '../../ui/flow';
import { setClockText, showClock } from '../../ui/hud';
import { showBubble } from '../../ui/bubble';
import * as T from '../../data/text/c3_events';
import { F, getKeyItem, giveKey } from '../lib';
import { getScript } from '../../world/scripts';
import type { Dir } from '../../game/state';
import { ambEvent, musicParam, reportCard, se } from '../ch2/compat';
import { c3Town, inCh3, npc, say3 } from './common';

// ---------------------------------------------------------------- places (62 1.4・3.9・5.1)

/**
 * 銀座の東の通り (x44–46): ツガオ便 stands facing south, its front at y30 and its
 * bed reaching back north (in HD-2D the body is ~3 tiles deep), ヒロスケ at its side.
 */
const TRUCK_TOWN = { x: 45, y: 30 };
/** Where the S04 talk starts: on the 東の通り, north or south of the truck. */
const TRUCK_ZONE = { x0: 43, x1: 47, y0: 24, y1: 31 };
/** 焼きそばのたかし's front (S03's bubble). */
const TAKASHI_ZONE = { x0: 24, x1: 29, y0: 22, y1: 24 };
/** The bed of the truck (map_c3_nidai, 62 4.1). */
const NIDAI = { shun: [4, 3], kn: [5, 3], hiro: [7, 2] } as const;
/** map_umizoi: off the bed at (21,17) E, the truck stopped at (22–24,17–18) facing east (62 1.4). */
const ARRIVE = { x: 21, y: 17, truckX: 23, truckY: 18 };

// ---------------------------------------------------------------- the truck (a staged vehicle actor)

/**
 * ツガオ便 as a scripted actor drawn like the town's traffic (world/field.ts
 * makeVehicle): side / front / rear view by its direction. `kind`
 * 'tsugao_truck' (ツガオ at the wheel in his cap) or 'tsugao_truck_nap'.
 */
function spawnTruck(id: string, x: number, y: number, dir: VehicleView, kind = 'tsugao_truck'): Actor {
  const a = spawn(id, x, y, { sprite: 'npc_tsugao', dir });
  (a.data.def as NpcObj).noTurn = true;
  a.data.scripted = true;
  a.data.vehicle = kind;
  a.data.noSpace = true;
  a.solid = true;
  a.bh = 10;
  const img = () => vehicleFrame(a.data.vehicle as string, a.dir, game.time, a.moving);
  a.bw = 52;
  a.data.shadowFrame = img();
  a.drawFn = (g, px, py) => {
    const im = img();
    a.bw = a.dir === 'left' || a.dir === 'right' ? 52 : 24;
    // seen from the front or the back the body runs ~3 tiles along the road: keep people off it
    a.bh = a.dir === 'left' || a.dir === 'right' ? 10 : 44;
    a.data.shadowFrame = im;
    g.rect(px - Math.floor(im.width / 2) + 2, py - 3, im.width - 4, 3, P.ink, 0.35);
    g.img(im, px - Math.floor(im.width / 2), py - im.height + 1);
  };
  return a;
}

/** Change the field's map under a black screen (the scene's own fades; no enter scripts). */
function jumpMap(id: string, x: number, y: number, dir: Dir): void {
  const f = F();
  const from = f.map.id;
  const prevKind = f.map.def.kind;
  f.loadMap(id, x, y, dir, from);
  if (prevKind !== f.map.def.kind) f.renderer.onMapChange();
}

/** A dark page under everything (a map that isn't there yet). */
class DarkPage implements Scene {
  transparent = false;
  update(): void {}
  draw(g: Gfx): void {
    g.clear('#0B0B14');
  }
}

// ================================================================ S00 + S01 evt_ch3_prologue

function* chapterDoor(): Co {
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  setFlag('flag_hud_hidden', 1);
  stopBgm(0.2);
  // 63 12.1: one wave comes in — and doesn't go back
  yield 700;
  se('se_c3_title_wave');
  yield 900;
  yield* playChapterDoor({ chapter: T.CH3_TITLE_STAMP, title: T.CH3_TITLE_NAME, icon: false });
  // chapter3Adjust() raised a level: the summer's report card (61 3.1)
  const ups = chapter3LevelUps();
  if (ups.length) {
    yield 300;
    const page = new DarkPage();
    game.push(page);
    const fade = game.fadeAlpha;
    game.fadeAlpha = 0;
    yield* reportCard(ups, T.CH3_REPORT_TITLE);
    game.fadeAlpha = fade;
    if (game.top === page) game.pop();
  }
}

export function* evtCh3Prologue(): Co {
  yield* chapterDoor();
  const f = F();
  // ---- S01: 小林家, 11:10 — in at the front door
  setFollowerVisible(true);
  const p = f.player;
  p.x = 2 * 16 + 8;
  p.y = 7 * 16 + 16;
  p.dir = 'up';
  const mom = npc('npc_mother');
  if (mom) {
    mom.data.scripted = true;
    mom.dir = 'up';
  }
  playBgm('bgm_home', { fade: 1.5, variant: 'hirumae' });
  playAmbient('amb_c3_hirumae', { fade: 1.5 });
  playAmbient('amb_tv', { vol: 0.6, fade: 1.5 });
  se('se_door');
  yield 300;
  yield* game.fadeIn(900);
  setFlag('flag_hud_hidden', 0);
  showClock(5000);
  yield 300;
  yield* walk('player', [[2, 5]], { speed: 3.5, face: 'up' });
  if (mom) mom.dir = 'down';
  yield 200;
  yield* say3(T.S01_A);
  // the tomato (おまけ) from the chabudai: one is left of the four
  if (!flag('flag_ch3_tomato_given')) {
    removeItem('item_tomato_omiyage');
    giveKey('item_tomato_omiyage');
    se('se_item', { vol: 0.7 });
    yield* say3(T.S01_GOT);
  }
  // the camera looks at the TV for a moment (a fixed room: the TV is on screen)
  p.dir = 'right';
  yield 400;
  // the stopped siren, far off in the TV's little speaker (63 12.1)
  ambEvent('amb_tv', 'c3_siren');
  yield* say3(T.S01_TV);
  p.dir = 'up';
  yield 200;
  yield* say3(T.S01_B);
  ambEvent('amb_tv', 'c3_siren_off');
  if (mom) {
    mom.dir = 'up';
    delete mom.data.scripted;
  }
  setFlag('flag_ch3_started', 1);
  setFlag('flag_ch3_prologue_done', 1);
}

registerScript('evt_ch3_title', function* (): Co {
  yield* chapterDoor();
  yield* game.fadeIn(600);
});
registerScript('evt_ch3_prologue', evtCh3Prologue);

// ---- 母・テレビ・ランドセル in stage 0 (wraps: chapter 1/2 keep theirs)
registerWrap('npc_mother', function* (): Co {
  yield* say3(flag('flag_ch3_tomato_given') ? T.MOTHER_C0.after : T.MOTHER_C0.tomato);
});
registerWrap('obj_tv', function* (): Co {
  se('se_examine');
  yield* say3(T.C3_OBJ.obj_c3_tv.text);
});
registerWrap('obj_randoseru', function* (): Co {
  se('se_examine');
  yield* say3(T.C3_OBJ.obj_c3_randoseru.text);
});
registerWrap('npc_obaa', function* (): Co {
  yield* say3(T.OBAA_C0);
});
// 店の前の ヤキソバンの 置物（60 9.1 obj_c3_yakisoban_statue：npc_cow_statue の段階0の差分）
registerWrap('npc_cow_statue', function* (): Co {
  const o = T.C3_OBJ.obj_c3_yakisoban_statue;
  yield* say3(flag('flag_seen_obj_c3_yakisoban_statue') && o.again ? o.again : o.text);
  setFlag('flag_seen_obj_c3_yakisoban_statue', 1);
});

/**
 * Wrap an existing script id: in chapter 3's 夕鳴町 (stage 0) `fn` runs,
 * anywhere else the original (or the placement's default).
 */
function registerWrap(id: string, fn: () => Co): void {
  // src/events/index.ts imports chapter 3 last: the chapter-1/2 scripts are already registered
  const before = getScript(id);
  registerScript(id, function* (ctx): Co {
    if (c3Town()) {
      yield* fn();
      return;
    }
    const o = before ?? null;
    if (o) yield* o(ctx);
    else yield* ctx.runDefault();
  });
}

// ================================================================ S02 evt_ch3_hinoya

export function* evtCh3Hinoya(): Co {
  const obaa = npc('npc_obaa');
  if (obaa) {
    obaa.data.scripted = true;
    obaa.dir = 'down';
  }
  yield 300;
  yield* walk('player', ['up', 'up'], { speed: 3.5, face: 'up' });
  yield* say3(T.S02_A);
  // しゅん holds out the tomato
  removeItem('item_tomato_omiyage');
  se('se_item', { vol: 0.7 });
  yield* say3(T.S02_GIVE);
  yield* say3(T.S02_B);
  // a little はなまる on the back of his hand, in red pen
  se('se_pen_write', { vol: 0.6 });
  yield 500;
  se('se_hanamaru', { vol: 0.4 });
  setFlag('flag_ch3_tomato_given', 1);
  yield 300;
  yield* say3(T.S02_C);
  if (obaa) delete obaa.data.scripted;
}
registerScript('evt_ch3_hinoya', evtCh3Hinoya);

registerWorldFx({
  map: 'map_hinoya',
  update(f: FieldScene) {
    if (!c3Town() || !flag('flag_ch3_prologue_done') || flag('flag_ch3_tomato_given') || !f.controllable) return;
    if (f.player.tileY > 6) return;
    f.startScript(evtCh3Hinoya());
  },
});

// ================================================================ S03・S04 夕鳴町（銀座）

const inZone = (z: { x0: number; x1: number; y0: number; y1: number }, x: number, y: number) => x >= z.x0 && x <= z.x1 && y >= z.y0 && y <= z.y1;

registerWorldFx({
  map: 'map_town',
  update(f: FieldScene) {
    if (!c3Town()) return;
    const p = f.player;
    // S03: 焼きそばのたかし is shut — グソっ君's bubble once on the way past
    if (!flag('flag_ch3_takashi_bubble') && inZone(TAKASHI_ZONE, p.tileX, p.tileY) && f.actorById('kanenari')?.visible) {
      setFlag('flag_ch3_takashi_bubble', 1);
      showBubble('kanenari', T.S03_BUBBLE, 1800);
    }
    // S04: ツガオ便 at the east corner, once the tomato is with おばあ
    if (!flag('flag_ch3_tomato_given') || flag('flag_ch3_truck_go')) return;
    if (!f.actorById('c3_truck')) {
      spawnTruck('c3_truck', TRUCK_TOWN.x, TRUCK_TOWN.y, 'down', flag('flag_ch3_truck_wait') ? 'tsugao_truck_nap' : 'tsugao_truck');
      // ヒロスケ by the bed (the truck is seen from the front: he stands at its side to be seen)
      const h = spawn('c3_hirosuke', TRUCK_TOWN.x + 1, TRUCK_TOWN.y - 2, { sprite: 'npc_hirosuke', dir: 'left' });
      h.data.scripted = true;
    }
    if (flag('flag_ch3_truck_wait') || !f.controllable) return;
    if (!inZone(TRUCK_ZONE, p.tileX, p.tileY)) return;
    const t = f.actorById('c3_truck');
    if (!t || Math.abs(t.x - p.x) > 40 || Math.abs(t.y - p.y) > 80) return;
    f.startScript(evtCh3TruckGo());
  },
});

/** S04 in town: 「乗ってくか？」. */
export function* evtCh3TruckGo(): Co {
  const t = npc('c3_truck');
  if (t) {
    // up to the driver's window: the west side of the truck, by the cab (the bed reaches
    // back north — in HD-2D he'd stand behind its body)
    const p = F().player;
    const x = TRUCK_TOWN.x - 1;
    const y = TRUCK_TOWN.y - 1;
    if (p.tileX !== x || p.tileY !== y) yield* walk('player', [[x, p.tileY], [x, y]], { speed: 4 });
    p.dir = 'right';
  }
  playAmbient('amb_c3_keitora', { vol: 0.5, lp: 400, fade: 0.6 });
  if (!flag('flag_ch3_truck_wait')) {
    const i = yield* say3(`${T.S04_A}\n? ${T.S04_OPTIONS.join(' | ')}`);
    if (i !== 0) {
      yield* say3(T.S04_WAIT);
      // the nightcap on: he naps at the wheel till しゅん comes back
      setFlag('flag_ch3_truck_wait', 1);
      if (t) t.data.vehicle = 'tsugao_truck_nap';
      stopAmbient('amb_c3_keitora', 1.0);
      return;
    }
  }
  if (t) t.data.vehicle = 'tsugao_truck';
  yield* ride();
}

/** 〔乗る〕: ヒロスケ, ポコシャ, ぴーちゃん, onto the bed (map_c3_nidai). */
function* ride(): Co {
  yield* say3(T.S04_RIDE);
  se('se_truck_aori');
  yield 200;
  se('se_step_metal');
  yield 180;
  se('se_step_metal');
  stopBgm(1.0);
  yield* game.fadeOut(500, '#0B0B14');
  despawn('c3_hirosuke');
  setFlag('flag_ch3_truck_wait', 0);
  if (hasMap('map_c3_nidai')) {
    jumpMap('map_c3_nidai', NIDAI.shun[0], NIDAI.shun[1], 'right');
    yield 60;
    yield* nidai(true);
  } else yield* nidai(false);
}

registerScript('c3_truck', function* (): Co {
  if (!c3Town() || flag('flag_ch3_truck_go')) return;
  if (flag('flag_ch3_truck_wait')) {
    // もう一度話すと〔乗る〕へ
    setFlag('flag_ch3_truck_wait', 0);
    const t = npc('c3_truck');
    if (t) t.data.vehicle = 'tsugao_truck';
    se('se_emote_exclaim');
    yield 300;
    yield* ride();
    return;
  }
  yield* evtCh3TruckGo();
});
registerScript('c3_hirosuke', function* (): Co {
  if (!c3Town() || flag('flag_ch3_truck_go')) return;
  yield* evtCh3TruckGo();
});

// ================================================================ S04 the bed of the truck → S05

/**
 * The ride (map_c3_nidai, or a dark page while it isn't there): the yakiimo,
 * the pass and the sea, the smell, the clock riffling to 12:00 and stopping.
 */
function* nidai(onMap: boolean): Co {
  let page: DarkPage | null = null;
  if (onMap) {
    setFollowerVisible(false);
    const k = spawn('c3_nidai_kn', NIDAI.kn[0], NIDAI.kn[1], { sprite: 'kanenari', dir: 'right', ghost: true });
    k.data.scripted = true;
    const h = spawn('c3_nidai_hiro', NIDAI.hiro[0], NIDAI.hiro[1], { sprite: 'npc_hirosuke', dir: 'left', ghost: true });
    h.data.scripted = true;
  } else {
    page = new DarkPage();
    game.push(page);
  }
  // the scenery of the bed (W's map_c3_nidai): 0 夕鳴町 → 田んぼ → 切り通し, 1 the sea
  setFlag('flag_c3_nidai_view', 0);
  se('se_keitora_go');
  playBgm('bgm_tsugaobin', { fade: 0.4, variant: 'iki' });
  playAmbient('amb_c3_keitora', { fade: 0.6 });
  yield 300;
  yield* game.fadeIn(600);
  yield 900;
  yield* say3(T.S04_NIDAI_A);
  se('se_yakiimo');
  yield 1500;
  // over the pass: the sea, far off (the pad comes in)
  musicParam('c3_shio', 1);
  setFlag('flag_c3_nidai_view', 1);
  yield 1500;
  se('se_c3_shio');
  yield 300;
  yield* say3(T.S04_NIDAI_B);
  // ヒロスケ looks at グソっ君 through his sunglasses (0.5 s); says nothing
  yield 700;
  // the clock riffles 11:58 → 11:59 → 12:00 and stops
  showClock(8000);
  for (const [i, tt] of ['11:58', '11:59', '12:00'].entries()) {
    setClockText(tt);
    se('se_clock_flip', { pitch: 1 + i * 0.03 });
    yield 650;
  }
  // 12:00: the engine goes on, the gulls and the waves drop away in 0.5 s (63 12.3)
  ambEvent('amb_c3_keitora', 'noon');
  playAmbient('amb_c3_siren_hold', { vol: 0.4, fade: 0.5 });
  yield 500;
  yield* say3(T.S04_NIDAI_C);
  setFlag('flag_ch3_truck_go', 1);
  yield 400;
  yield* game.fadeOut(700, '#0B0B14');
  if (page && game.top === page) game.pop();
  despawn('c3_nidai_kn');
  despawn('c3_nidai_hiro');
  yield* arrive();
}

// ================================================================ S05 evt_ch3_arrive

/** Into map_umizoi at noon: the truck stops, off the bed, the shadow under the feet. */
function* arrive(): Co {
  // the town at noon: stage 1 from the first frame (62 6.1)
  setFlag('flag_ch3_stage', 1);
  setFlag('flag_ch3_clock', 0);
  setClockText(null);
  let page: DarkPage | null = null;
  if (hasMap('map_umizoi')) {
    jumpMap('map_umizoi', ARRIVE.x, ARRIVE.y, 'right');
    setFollowerVisible(true);
    spawnTruck('c3_truck_umi', ARRIVE.truckX, ARRIVE.truckY, 'right');
  } else {
    page = new DarkPage();
    game.push(page);
  }
  se('se_keitora_stop');
  stopAmbient('amb_c3_keitora', 1.0);
  stopBgm(1.5);
  yield 200;
  yield* game.fadeIn(700);
  se('se_truck_aori');
  // 0.8 s of the stopped town: the siren's first note stuck far off, the still sea
  yield 800;
  yield* say3(T.S05_A);
  // the truck goes off toward the warehouses
  const t = npc('c3_truck_umi');
  if (t) {
    se('se_keitora_go');
    yield* walk('c3_truck_umi', ['right12'], { speed: 5 });
    despawn('c3_truck_umi');
  } else yield 600;
  playBgm('bgm_umi_noon', { fade: 0.4, variant: 'outdoor' });
  musicParam('c3_noon', 0);
  yield 400;
  yield* say3(T.S05_B);
  setFlag('flag_ch3_arrived', 1);
  if (page && game.top === page) game.pop();
  yield* evtCh3Kids();
}
registerScript('evt_ch3_arrive', function* (): Co {
  if (flag('flag_ch3_arrived')) return;
  yield* game.fadeOut(1, '#0B0B14');
  yield* arrive();
});
registerScript('evt_ch3_truck_go', function* (): Co {
  if (flag('flag_ch3_truck_go')) return;
  if (hasMap('map_c3_nidai') && F().map.id !== 'map_c3_nidai') {
    yield* game.fadeOut(1, '#0B0B14');
    jumpMap('map_c3_nidai', NIDAI.shun[0], NIDAI.shun[1], 'right');
  }
  yield* nidai(hasMap('map_c3_nidai'));
});

// ================================================================ S06 evt_ch3_kids

/** Where the three run in from (the breakwater side, east along 港通り) and stop round しゅん. */
const KIDS = [
  { id: 'npc_c3_kid_a', from: [30, 17], to: [23, 17] },
  { id: 'npc_c3_kid_b', from: [31, 18], to: [24, 18] },
  { id: 'npc_c3_kid_c', from: [32, 17], to: [24, 17] },
] as const;

export function* evtCh3Kids(): Co {
  if (flag('flag_ch3_kids')) return;
  const f = F();
  const onUmi = f.map.id === 'map_umizoi';
  const staged: string[] = [];
  if (onUmi) {
    for (const k of KIDS) {
      let a = f.actorById(k.id);
      if (!a) {
        a = spawn(`c3_s06_${k.id}`, k.from[0], k.from[1], { sprite: k.id, dir: 'left', ghost: true });
        staged.push(a.id);
      }
      a.data.scripted = true;
      a.x = k.from[0] * 16 + 8;
      a.y = k.from[1] * 16 + 16;
      a.visible = true;
    }
    yield 200;
    for (const [i, k] of KIDS.entries()) {
      const a = f.actorById(k.id) ?? f.actorById(`c3_s06_${k.id}`);
      if (a) game.scripts.run(walk(a.id, [[k.to[0], k.to[1]]], { speed: 4.2, face: 'left' }));
      yield 160 + i * 40;
    }
    yield 1500;
    f.player.dir = 'right';
  }
  yield* say3(T.S06_A);
  // (63 12.4) the siren's first note, far off, after 「また 最初から 鳴るんよ」
  se('se_c3_siren_head', { vol: 0.3 });
  yield 600;
  yield* say3(T.S06_B);
  yield* getKeyItem('item_c3_map', T.S06_GOT, false);
  yield* say3(T.S06_C);
  setFlag('flag_ch3_kids', 1);
  // the three go back to their play (the map puts them in the open ground: cond flag_ch3_kids)
  for (const id of staged) despawn(id);
  for (const k of KIDS) {
    const a = f.actorById(k.id);
    if (a) delete a.data.scripted;
  }
}
// a load (or a jump) between S05 and S06: the children come as soon as しゅん can walk
registerWorldFx({
  map: 'map_umizoi',
  update(f: FieldScene) {
    if (!inCh3() || !flag('flag_ch3_arrived') || flag('flag_ch3_kids') || !f.controllable) return;
    f.startScript(evtCh3Kids());
  },
});
registerScript('evt_ch3_kids', function* (): Co {
  if (!flag('flag_ch3_arrived') || flag('flag_ch3_kids')) return;
  yield* evtCh3Kids();
});
