// 東の台地と石黒牛舎 (50_ch2_story 10.8, 10.9, 10.19; 52 4.3; 53 12.6, 12.7, 12.16):
//   evt_ch2_gen_stop  — マサルさん on the slope: the light, 「誰が らっきょやねん！」
//   evt_ch2_barn      — the round of the last pen by the lantern's light
//   evt_ch2_otsukare  — the one who watched the cows all night: おつかれさま
//   evt_ch2_gate      — the electric fence's gate, opened by its handle
//   evt_ch2_barn_work — (optional) エサ寄せ and the water cups with マサルさん
//
// The cows are never staged: no moo, no snort added, no faces (53 12.7).

import type { Co } from '../../engine/co';
import { all } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, setFlag, state } from '../../game/state';
import { syncProgressSkills } from '../../data/battle';
import { despawn, face, registerScript, spawn, walk } from '../../world/api';
import { field, type FieldScene } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { runMsg } from '../../world/msg';
import { completeChoreCard, hideChoreCard, setChoreCount, showChoreCard } from '../../ui/hud';
import { HOSHI_NPC } from '../../data/text/hoshi_npcs';
import * as T from '../../data/text/hoshi_events';
import { F, sendAway } from '../lib';
import { sparkle } from '../fx';
import { hankoLearn, se, seAt } from './compat';
import { firstThisLoad, npc, poseAny, poseIf, routeTiles, runCue, unpose } from './common';

const G = HOSHI_NPC.npc_hoshi_gen;

// ---------------------------------------------------------------- 10.8 evt_ch2_gen_stop

export function* evtGenStop(): Co {
  if (flag('flag_ch2_met_gen') || !flag('flag_ch2_got_tomato')) return;
  const f = F();
  const p = f.player;
  const g = npc('npc_hoshi_gen');
  // he stops shaking the dead flashlight (and its click stops with it)
  setFlag('flag_ch2_met_gen', 1);
  if (g) {
    g.data.scripted = true;
    face('npc_hoshi_gen', 'player');
    g.lift = 70;
  }
  p.dir = g ? (Math.abs(g.x - p.x) > Math.abs(g.y - p.y) ? (g.x > p.x ? 'right' : 'left') : g.y < p.y ? 'up' : 'down') : 'right';
  yield 500;
  yield* runCue(T.GEN_STOP, {
    *near() {
      // he walks up and looks at the lantern; it shines on his head
      if (g) {
        const route = routeTiles(g.tileX, g.tileY, p.tileX, p.tileY);
        if (route && route.length) {
          // stop one tile short of Minato
          const last = route[route.length - 1];
          const beforeLast = route.length > 1 ? route[route.length - 2] : [g.tileX, g.tileY];
          const dx = Math.sign(last[0] - beforeLast[0]);
          const dy = Math.sign(last[1] - beforeLast[1]);
          route[route.length - 1] = [last[0] - dx, last[1] - dy];
          if (route[route.length - 1][0] !== g.tileX || route[route.length - 1][1] !== g.tileY) yield* walk('npc_hoshi_gen', route, { speed: 2.2 });
        }
        face('npc_hoshi_gen', 'player');
        poseIf(g, 'look_up');
      }
      yield 700;
      if (g) unpose(g);
      if (g) face('npc_hoshi_gen', 'player');
    },
  });
  // ふくじんづけ wakes up and wags the fluffy tail (no sound)
  const dog = npc('npc_hoshi_gon');
  if (dog) {
    dog.data.scripted = true;
    poseIf(dog, 'sit');
    if (dog.sprite.anims?.wag) dog.playAnim('wag', false);
    else dog.hop(1, 160);
  }
  yield 400;
  // he walks back to the barn and goes in
  if (g) {
    const route = routeTiles(g.tileX, g.tileY, 51, 32);
    if (route && route.length) yield* walk('npc_hoshi_gen', route, { speed: 2.4 });
    g.dir = 'up';
    yield 150;
    seAt('se_door_heavy', 51 * 16 + 8, 31 * 16 + 8);
    g.visible = false;
    g.solid = false;
  }
  if (dog) delete dog.data.scripted;
}
registerScript('evt_ch2_gen_stop', evtGenStop);
registerScript('trig_ch2_gen_stop', function* (): Co {
  // on the delivery's east edge (46,38–39) the question 「配達を やめますか？」 comes
  // first; after 「やめる」 the delivery runs this scene itself (tsugao.ts)
  if (flag('flag_ch2_delivery_on')) return;
  yield* evtGenStop();
});

/** Once he has gone into the barn (met, the gate not yet open), he isn't on the terrace. */
registerWorldFx({
  map: 'map_hoshimidai',
  update(f) {
    if (!flag('flag_ch2_met_gen') || flag('flag_ch2_gate_open')) return;
    const g = f.actorById('npc_hoshi_gen');
    if (g && !g.data.scripted && g.visible) {
      g.visible = false;
      g.solid = false;
    }
  },
});

// ---------------------------------------------------------------- 10.9 evt_ch2_barn → otsukare → gate

/** マサルさん for the round: waiting in the anteroom (2,7). */
function genForRound(): ReturnType<typeof spawn> {
  despawn('npc_hoshi_gen');
  const g = spawn('npc_hoshi_gen', 2, 7, { sprite: 'npc_hoshi_gen', dir: 'down' });
  g.data.scripted = true;
  return g;
}

export function* evtBarn(): Co {
  if (!flag('flag_ch2_met_gen') || flag('flag_ch2_got_otsukare')) return;
  const f = F();
  const p = f.player;
  const k = f.follower;
  p.dir = 'up';
  const g = genForRound();
  yield 500;
  yield* runCue(T.BARN_A, {
    *shodoku() {
      // one step north into the footbath: ちゃぷ (and カネナリくん, lower)
      yield* walk('player', [2, 9], { speed: 2 });
      se('se_h_shodoku');
      yield 300;
      if (k) {
        yield* walk('kanenari', [2, 10], { speed: 2 });
        delete k.data.scripted;
        se('se_h_shodoku', { pitch: 0.85 });
      }
      yield 300;
    },
    *walk() {
      // down the feed aisle, east, quietly: he leads, they follow two tiles behind (about 6 s)
      const walks = all(
        walk('npc_hoshi_gen', [[2, 6], [18, 6]], { speed: 2.6 }),
        (function* (): Co {
          yield 700;
          yield* walk('player', [[2, 7], [2, 6], [16, 6]], { speed: 2.6 });
        })(),
      );
      // the light passes over the pens
      yield* all(walks, (function* (): Co {
        yield () => g.tileX >= 9;
        yield* runMsg(T.BARN_COWS);
      })());
      yield* walk('player', [17, 6], { speed: 2 });
      g.dir = 'down';
      p.dir = 'down';
      yield 300;
    },
  });
  yield* runCue(T.BARN_B, {
    *holdup() {
      // the net held high: the light fills 南5 (the four look round, slowly)
      poseIf(p, 'hold_up');
      yield 900;
    },
    *look() {
      // his elbow on the rail, one by one (left, right: 2.0 s)
      poseIf(g, 'lean');
      g.dir = 'down';
      yield 500;
      g.dir = 'left';
      yield 600;
      g.dir = 'right';
      yield 600;
      g.dir = 'down';
      yield 300;
    },
    *write() {
      unpose(p);
      poseIf(g, 'write');
      for (let i = 0; i < 3; i++) {
        se('se_pen_write');
        yield 220;
      }
      yield 200;
      unpose(g);
    },
    *sit() {
      // on the spare feed bag at the east end (20,7), the towel over his face, a long breath
      yield* walk('npc_hoshi_gen', [[19, 6], [20, 6]], { speed: 2 });
      g.dir = 'left';
      poseIf(g, 'sit_bag');
      se('se_h_feedbag');
      yield 700;
      p.dir = 'right';
    },
  });
  yield* evtOtsukare();
  yield* evtGate();
}

registerScript('evt_ch2_barn', function* (): Co {
  // a load in the middle of the chores (the page hidden → saved): they start over
  if (flag('flag_ch2_barn_work_on')) resetChores();
  if (!flag('flag_ch2_met_gen') || flag('flag_ch2_got_otsukare')) return;
  if (!firstThisLoad('evt_ch2_barn')) return;
  yield* evtBarn();
});

export function* evtOtsukare(): Co {
  if (flag('flag_ch2_got_otsukare')) return;
  yield* runMsg(T.OTSUKARE_A);
  setFlag('flag_ch2_got_otsukare', 1);
  syncProgressSkills();
  const shown = yield* hankoLearn('skill_otsukaresama');
  if (!shown) yield* runMsg(T.OTSUKARE_LEARN);
  // he looks at the case glowing in Minato's hands
  const g = field()?.actorById('npc_hoshi_gen');
  if (g) {
    unpose(g);
    g.lift = 70;
  }
  yield 300;
  yield* runMsg(T.OTSUKARE_B);
}
registerScript('evt_ch2_otsukare', evtOtsukare);

/** Out in front of the barn: along the farm lane to the gate, and the handle. */
export function* evtGate(): Co {
  if (flag('flag_ch2_gate_open')) return;
  yield* game.fadeOut(400, '#0B0B14');
  se('se_door_heavy');
  const f = F();
  f.loadMap('map_hoshimidai', 51, 32, 'down');
  f.syncFollower(true);
  const g = spawn('ch2_gate_gen', 50, 32, { sprite: 'npc_hoshi_gen', dir: 'down' });
  g.data.scripted = true;
  // the village's own マサルさん stays inside for this scene
  const own = f.actorById('npc_hoshi_gen');
  if (own) {
    own.visible = false;
    own.solid = false;
  }
  f.snapCamera();
  yield* game.fadeIn(400);
  yield 300;
  // he leads north up the lane (x48–49), over the canal bridge, to the gate (about 4 s)
  yield* all(
    walk('ch2_gate_gen', [[49, 32], [49, 19]], { speed: 3.6, face: 'up' }),
    (function* (): Co {
      yield 450;
      yield* walk('player', [[51, 33], [48, 33], [48, 20]], { speed: 3.8, face: 'up' });
    })(),
  );
  g.dir = 'left';
  F().player.dir = 'up';
  yield 300;
  yield* runCue(T.GATE_A, {
    *hook() {
      // the yellow grip off, onto the post: the gate `G` lets them through
      g.dir = 'up';
      poseIf(g, 'point');
      yield 350;
      se('se_h_gate_hook');
      setFlag('flag_ch2_gate_open', 1);
      yield 500;
      unpose(g);
      g.dir = 'left';
    },
  });
  setFlag('flag_ch2_gate_open', 1);
  // he goes back to the barn (from now on at the east end of its feed aisle)
  sendAway(g, [[49, 33], [51, 33], [51, 32]], 2.5, 200, true);
}
registerScript('evt_ch2_gate', evtGate);

// ---------------------------------------------------------------- マサルさん's talk (50 3.9)

/** The chores are on (the spots are out, the door asks first). */
export function choresOn(): boolean {
  return flag('flag_ch2_barn_work_on') > 0;
}

/** 〔誘い〕: offered after 〔h1_1〕 / 〔h1_3〕 while the chores are not done (stage 1, in the barn). */
function* invite(): Co {
  const f = field();
  if (!f || f.map.id !== 'map_hoshi_barn' || flag('flag_ch2_barn_work') || flag('flag_ch2_stage') !== 1 || flag('flag_ch2_tetsuya_beaten')) return;
  const i = yield* runMsg(T.WORK_ASK);
  if (i !== 0) {
    yield* runMsg(T.WORK_LATER);
    return;
  }
  yield* workStart();
}

/** マサルさん in stage 1 after the gate (in the barn at (20,6)). */
export function* genTalkH1(): Co {
  if (choresOn()) {
    yield* runMsg(T.WORK_TALK);
    return;
  }
  const n = flag('flag_seen_npc_hoshi_gen_h1');
  setFlag('flag_seen_npc_hoshi_gen_h1', n + 1);
  // the shipping talk is his second line of stage 1, said once; nothing in the music or the sounds changes for it
  const key = n === 0 ? 'h1_1' : n === 1 ? 'h1_2' : flag('flag_ch2_barn_work') ? 'h1_4' : 'h1_3';
  setFlag(`flag_seen_npc_hoshi_gen_${key}`, 1);
  yield* runMsg(G[key]);
  if (key === 'h1_1' || key === 'h1_3') yield* invite();
}

/** マサルさん in stage 2 (beside the gate). */
export function* genTalkH2(): Co {
  const n = flag('flag_seen_npc_hoshi_gen_h2');
  setFlag('flag_seen_npc_hoshi_gen_h2', n + 1);
  if (n === 0) {
    setFlag('flag_seen_npc_hoshi_gen_h2_1', 1);
    yield* runMsg(G.h2_1);
    return;
  }
  setFlag('flag_seen_npc_hoshi_gen_h2_2', 1);
  yield* runMsg(G.h2_2);
  yield* runMsg(flag('flag_ch2_barn_work') ? G.h2_2_worked : G.h2_2_unworked);
}

// ---------------------------------------------------------------- 10.19 evt_ch2_barn_work

const ESA = ['spot_h_esa_01', 'spot_h_esa_02', 'spot_h_esa_03', 'spot_h_esa_04', 'spot_h_esa_05', 'spot_h_esa_06'];
const CUPS = ['spot_h_cup_01', 'spot_h_cup_02', 'spot_h_cup_03'];
/** Where each spot is (the trough tile) — for the sounds' place. */
const SPOT_AT: Record<string, [number, number]> = {
  spot_h_esa_01: [6, 5],
  spot_h_esa_02: [10, 5],
  spot_h_esa_03: [16, 5],
  spot_h_esa_04: [7, 7],
  spot_h_esa_05: [15, 7],
  spot_h_esa_06: [19, 7],
  spot_h_cup_01: [8, 5],
  spot_h_cup_02: [11, 7],
  spot_h_cup_03: [17, 5],
};
/** 75 s from the start to the ninth (menus and talks don't count). */
const QUICK_MS = 75000;

const work = { ms: 0, esaSaid: false, cupSaid: false };
/** The state the chores were started in (a load replaces state.flags: they start over, 10.19). */
let workFlags: object | null = null;

function doneCount(ids: string[]): number {
  return ids.filter((id) => flag('flag_' + id) > 0).length;
}

/** Everything back as it was before the chores (not saved: a load starts over). */
export function resetChores(): void {
  setFlag('flag_ch2_barn_work_on', 0);
  for (const id of [...ESA, ...CUPS]) setFlag('flag_' + id, 0);
  hideChoreCard(0);
  work.ms = 0;
  workFlags = null;
  const p = field()?.player;
  if (p) delete p.data.tool;
}

registerWorldFx({
  map: 'map_hoshi_barn',
  update(f: FieldScene, dt: number) {
    if (!choresOn()) return;
    if (state.flags !== workFlags) {
      resetChores();
      return;
    }
    // the clock runs only while Minato can move (not in menus or talks)
    if (f.controllable && game.top === f && !game.ui.modal) work.ms += dt;
  },
});

function* workStart(): Co {
  const f = F();
  const g = f.actorById('npc_hoshi_gen');
  yield* runCue(T.WORK_HOW, {
    *give() {
      // the scoop that leaned on the straw at (20,5)
      if (g) poseIf(g, 'give');
      se('se_item', { vol: 0.4 });
      for (const id of [...ESA, ...CUPS]) setFlag('flag_' + id, 0);
      workFlags = state.flags;
      setFlag('flag_ch2_barn_work_on', 1);
      yield 500;
      if (g) unpose(g);
      f.player.data.tool = 'scoop';
    },
  });
  for (const id of [...ESA, ...CUPS]) setFlag('flag_' + id, 0);
  setFlag('flag_ch2_barn_work_on', 1);
  workFlags = state.flags;
  work.ms = 0;
  work.esaSaid = false;
  work.cupSaid = false;
  showChoreCard(T.WORK_CARD);
}

function* doSpot(id: string): Co {
  if (!choresOn() || flag('flag_' + id)) return;
  const f = F();
  const p = f.player;
  const esa = id.startsWith('spot_h_esa');
  const [sx, sy] = SPOT_AT[id];
  p.dir = sy < p.tileY ? 'up' : 'down';
  const wx = sx * 16 + 8;
  const wy = sy * 16 + 8;
  if (esa) {
    // the feed swept back to the rail (0.6 s); the reaching cow lowers her head and eats
    poseAny(p, 'scoop', 'give');
    seAt('se_h_esayose', wx, wy, { vol: 0.5 });
    yield 600;
  } else {
    // the fallen feed scooped out, then the press plate: clear water (0.8 s)
    poseAny(p, 'cup_clean', 'give');
    se('se_h_shodoku', { pitch: 1.2, vol: 0.4 });
    yield 400;
    seAt('se_h_watercup', wx, wy);
    yield 400;
    sparkle(wx, wy - 2, 300);
  }
  unpose(p);
  setFlag('flag_' + id, 1);
  setChoreCount(0, doneCount(ESA));
  setChoreCount(1, doneCount(CUPS));
  // words only the first time of each job; after that the sound and the count
  if (esa && !work.esaSaid) {
    work.esaSaid = true;
    yield* runMsg(T.WORK_ESA_FIRST);
  } else if (!esa && !work.cupSaid) {
    work.cupSaid = true;
    yield* runMsg(T.WORK_CUP_FIRST);
  }
  if (doneCount(ESA) + doneCount(CUPS) >= ESA.length + CUPS.length) yield* workDone();
}

for (const id of [...ESA, ...CUPS])
  registerScript(id, function* (): Co {
    yield* doSpot(id);
  });

function* workDone(): Co {
  const f = F();
  const p = f.player;
  const quick = work.ms <= QUICK_MS;
  yield* completeChoreCard();
  // he comes west along the aisle and stops on Minato's east side (in the anteroom: (4,6))
  const g = f.actorById('npc_hoshi_gen');
  if (g) {
    g.data.scripted = true;
    unpose(g);
    let tx = p.tileX <= 3 ? 4 : Math.min(20, p.tileX + 1);
    // カネナリくん on that tile of the one-tile aisle: he stops just behind him
    const k = f.follower;
    if (k && k.visible && k.tileY === 6 && k.tileX === tx && tx < 20) tx++;
    if (g.tileX !== tx || g.tileY !== 6) {
      const route = routeTiles(g.tileX, g.tileY, tx, 6);
      if (route && route.length) yield* walk('npc_hoshi_gen', route, { speed: 2.2 });
    }
    face('npc_hoshi_gen', 'player');
    p.dir = g.x > p.x ? 'right' : 'left';
  }
  yield* runMsg(T.WORK_DONE);
  yield* runMsg(quick ? T.WORK_DONE_FAST : T.WORK_DONE_SLOW);
  yield* runCue(T.WORK_END, {
    *holdup() {
      // the net held high over the barn; his head glows sunset
      poseIf(p, 'hold_up');
      yield 1000;
      unpose(p);
    },
    *pay() {
      state.money += 300;
      se('se_coin');
    },
  });
  setFlag('flag_ch2_barn_work', 1);
  setFlag('flag_ch2_barn_work_on', 0);
  delete p.data.tool;
  // back to the east end of the aisle
  if (g) {
    const route = routeTiles(g.tileX, g.tileY, 20, 6);
    if (route && route.length) yield* walk('npc_hoshi_gen', route, { speed: 2.2 });
    g.dir = 'left';
    delete g.data.scripted;
  }
}

/** 〔とちゅうで 牛舎を 出ようとした〕: the step before the door asks first. */
registerScript('trig_ch2_barn_work_quit', function* (): Co {
  if (!choresOn()) return;
  const f = F();
  const i = yield* runMsg(T.WORK_QUIT_ASK);
  if (i !== 0) {
    // つづける: one step back in
    f.player.y -= 16;
    f.player.dir = 'up';
    f.syncFollower(true);
    return;
  }
  yield* runMsg(T.WORK_QUIT);
  // the scoop goes back to him; out of the barn
  resetChores();
  delete f.player.data.tool;
  yield* f.warpCo('map_hoshimidai', 51, 32, 'down', 'se_door_heavy', 'map_hoshi_barn');
});

// ---------------------------------------------------------------- QA

/** QA: every spot done but 南5's feed (spot_h_esa_06, examined from (19,6) facing south). */
export function debugChoresDone(): void {
  workFlags = state.flags;
  for (const id of [...ESA, ...CUPS]) if (id !== 'spot_h_esa_06') setFlag('flag_' + id, 1);
  work.esaSaid = true;
  work.cupSaid = true;
  setChoreCount(0, 5);
  setChoreCount(1, 3);
}
