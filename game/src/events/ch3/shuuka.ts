// S25 最後の 集荷（60_ch3_story 10.25）を フィールドの 上で（2026-10-20 依頼主「みんなを連れてきたシーンが
// クオリティ雑過ぎる。もっと HD-2D フル活用して」。前は 1枚絵 cut_c3_shuuka＝ui/cut_c3.ts shuukaArt）。
// 文・順番・フラグは 前の まま（S25_SHUUKA → 荷台の あおり → S25_ONIGIRI → 軽トラが 出る）。見せ方だけ：
//
//   ① 海ぞいの町の 岸壁 (map_umizoi)：防波堤の ござの 前で 待つ 人たち。ツガオ便（ヒロスケの 運転、
//      荷台は 空けてある：vehicles.ts tsugao_truck_hiro）が 東から 来て 停まり、ヒロスケが 降りて
//      「最後の 集荷です！」→ あおりを 下ろす → ナミエ「おにぎり、持ってく よ！」→ 1人ずつ 荷台へ → 出る。
//   ② 荷台 (map_c3_nidai、景色 2 = 港町 → 海ぞいの 道 → 岬の 坂)：乗った 人たちの 上を 海が 流れる（短く）。
//   ③ 岬 (map_c3_misaki)：海ぞいの 道を 西から 軽トラが 走って きて (17,13) に 停まる（カメラが 追う）。
//      ヒロスケが あおりを 下ろし、荷台から 1人ずつ 降りて、旧水族館の 前の 広場へ 集まる。
//      荷台に 乗れるのは 1便 8人ほど：人が 多いときは 何便かに 分けて（2便目からは 短く。広場に 人が たまっていく）。
//
// しゅんと グソっ君は 館の 中で 待っている（このあと 入口で エゴが 打刻する）ので、この 場面には 出ない。
// 2D でも 同じ 台本（同じ 地図の 上）、HD-2D は カメラの レンズ（hd2d/cut_c3.ts の c3s_*）が 低く 近く なる。

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, setFlag, type Dir } from '../../game/state';
import { playAmbient, playBgm, stopAmbient, stopBgm } from '../../audio';
import { despawn, setFollowerVisible, spawn, walk } from '../../world/api';
import type { Actor } from '../../world/actor';
import { hasMap } from '../../world/maps';
import { hasChar } from '../../art/chars/registry';
import { showBubble } from '../../ui/bubble';
import { uiHud } from '../../ui/hud';
import * as T from '../../data/text/c3_story4';
import { F } from '../lib';
import { endingView } from '../ending';
import { se } from '../ch2/compat';
import { say3 } from './common';
import { jumpMap, spawnTruck } from './prologue';
import { KITA } from './azemichi';
import { camAt, camRelease, panPx } from './stagecam';

const TRUCK = 'c3_sk_truck';
const HIRO = 'c3_sk_hiro';
const VEH = 'tsugao_truck_hiro';

function spriteOf(id: string): string {
  const k = KITA.find((x) => x.id === id);
  const s = k?.sprite ? k.sprite() : id;
  return hasChar(s) ? s : hasChar(id) ? id : 'npc_obaa';
}

/** Someone of the scene: scripted, a ghost, nothing see-through for them (HD-2D). */
function who(aid: string, x: number, y: number, dir: Dir, spr: string): Actor {
  despawn(aid);
  const a = spawn(aid, x, y, { sprite: spr, dir, ghost: true });
  a.data.scripted = true;
  a.data.noSee = true;
  a.solid = false;
  return a;
}

/** A map for the scene under the black: its own people out of the way, the player hidden at (x, y). */
function stageMap(map: string, x: number, y: number, shot: string): void {
  const f = F();
  jumpMap(map, x, y, 'down');
  endingView.shot(f, shot);
  setFollowerVisible(false);
  f.player.visible = false;
  f.syncFollower(true);
  for (const a of f.actors)
    if (a !== f.player && (a.kind === 'npc' || a.kind === 'sym')) {
      a.visible = false;
      a.solid = false;
      a.data.scripted = true;
    }
  f.snapCamera();
  uiHud.clearNotes();
}

function clearScene(): void {
  for (const a of [...F().actors]) if (a.id.startsWith('c3_sk_')) despawn(a.id);
}

/** A wait the player can hurry by holding Z (×3), as the ending's. */
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

// ---------------------------------------------------------------- the people riding in the bed

/**
 * Up to six heads and shoulders over the bed's gate, riding with the truck
 * (side view facing right: the bed is the picture's x 3–36 of 62, the gate
 * 9 px tall; they stand 6 px behind its face, lifted onto the bed's floor).
 */
const SEATS: [number, number][] = [
  [-23, -5], [-16, -9], [-9, -5], [-2, -9], [-19, -12], [-6, -12],
];

function ride(truck: Actor, ids: string[]): Actor[] {
  const out: Actor[] = [];
  ids.slice(0, SEATS.length).forEach((id, i) => {
    const a = who(`c3_sk_rider_${i}`, 0, 0, 'right', spriteOf(id));
    a.lift = 9;
    out.push(a);
  });
  const place = () => {
    out.forEach((a, i) => {
      const [dx, dy] = SEATS[i];
      a.x = truck.x + dx;
      a.y = truck.y + dy;
      a.dir = 'right';
      a.moving = false;
    });
  };
  place();
  game.scripts.run(
    (function* (): Co {
      while (F().actorById(truck.id) && out.some((a) => F().actorById(a.id))) {
        place();
        yield null;
      }
    })(),
  );
  return out;
}

// ---------------------------------------------------------------- ① the quay

/** The people waiting by the breakwater's mats (the quay's sea side, y26, and the root of the breakwater). */
const WAIT: [number, number][] = [
  [36, 26], [38, 24], [40, 26], [34, 24], [42, 26], [32, 26], [39, 25], [35, 25], [43, 24], [41, 25], [33, 25], [37, 25],
];

function* quay(people: string[]): Co {
  stageMap('map_umizoi', 30, 25, 'c3s_quay');
  camAt(35 * 16 + 8, 26 * 16 - 4);
  const shown = people.slice(0, WAIT.length);
  const wait = shown.map((id, i) => who(`c3_sk_w_${i}`, WAIT[i][0], WAIT[i][1], i % 3 === 0 ? 'down' : 'right', spriteOf(id)));
  playAmbient('amb_c3_umi', { fade: 1.0 });
  playAmbient('amb_c3_minato', { vol: 0.6, fade: 1.0 });
  yield* game.fadeIn(600);
  yield* beat(500);
  // ツガオ便 comes along the quay from the east, ヒロスケ at the wheel
  const truck = spawnTruck(TRUCK, 49, 25, 'left', VEH);
  truck.solid = false;
  se('se_keitora_go', { vol: 0.5 });
  for (const a of wait) a.dir = 'right';
  yield* walk(TRUCK, [[38, 25]], { speed: 5.5 });
  yield* walk(TRUCK, [[35, 25]], { speed: 2.4 });
  truck.moving = false;
  se('se_keitora_stop', { vol: 0.6 });
  yield* beat(400);
  // ヒロスケ out of the cab (the west end), round to the gate
  const hiro = who(HIRO, 33, 26, 'right', 'npc_hirosuke');
  hiro.alpha = 1;
  se('se_door', { vol: 0.4 });
  yield* beat(300);
  yield* say3(T.S25_SHUUKA);
  // the gate let down (あおり)
  hiro.tempPose = null;
  se('se_truck_aori', { vol: 0.6 });
  yield 300;
  yield* say3(T.S25_ONIGIRI);
  const shokudo = wait.find((a) => a.spriteId === 'npc_c3_shokudo');
  if (shokudo) showBubble(shokudo.id, '♪', 700);
  // one by one up onto the bed at its back (the east end)
  for (const [i, a] of wait.entries()) {
    game.scripts.run(
      (function* (): Co {
        yield i * 240;
        yield* walk(a.id, [[a.tileX, 25 + (a.tileY < 25 ? -1 : 1)], [37, 25 + (a.tileY < 25 ? -1 : 1)], [37, 25]], { speed: 3.4 });
        se('se_step_metal', { vol: 0.3 });
        despawn(a.id);
      })(),
    );
  }
  yield* beat(Math.min(3600, 600 + wait.length * 240 + 900));
  yield () => !wait.some((a) => F().actorById(a.id));
  se('se_truck_aori', { vol: 0.5 });
  yield* walk(HIRO, [[32, 26], [32, 25]], { speed: 3 });
  despawn(HIRO);
  se('se_door', { vol: 0.4 });
  const riders = ride(truck, people);
  yield* beat(300);
  se('se_keitora_go', { vol: 0.4 });
  // off east, toward the cape (the camera stays: the truck goes out of the frame)
  yield* walk(TRUCK, [[30, 25]], { speed: 2.5 });
  yield* game.fadeOut(500, '#0B0B14');
  for (const a of riders) despawn(a.id);
  despawn(TRUCK);
  clearScene();
  stopAmbient('amb_c3_minato', 0.5);
}

// ---------------------------------------------------------------- ② the bed on the coast road

/** Where the riders sit on map_c3_nidai (the crates take the rest; 62 4.1). */
const BED: [number, number, Dir][] = [
  [3, 2, 'right'], [5, 2, 'right'], [7, 1, 'down'], [2, 3, 'right'], [4, 3, 'up'], [6, 3, 'right'], [8, 3, 'left'], [3, 4, 'right'],
];

function* bed(people: string[]): Co {
  if (!hasMap('map_c3_nidai')) return;
  setFlag('flag_c3_nidai_hiro', 1);
  setFlag('flag_c3_nidai_view', 2);
  stageMap('map_c3_nidai', 4, 3, 'c3s_out');
  people.slice(0, BED.length).forEach((id, i) => who(`c3_sk_bed_${i}`, BED[i][0], BED[i][1], BED[i][2], spriteOf(id)));
  playAmbient('amb_c3_keitora', { vol: 0.6, fade: 0.5 });
  playBgm('bgm_tsugaobin', { fade: 0.6, variant: 'iki' });
  yield* game.fadeIn(500);
  const nami = F().actors.find((a) => a.id.startsWith('c3_sk_bed_') && a.spriteId === 'npc_c3_shokudo');
  yield* beat(900);
  if (nami) showBubble(nami.id, '♪', 900);
  yield* beat(1700);
  yield* game.fadeOut(500, '#0B0B14');
  clearScene();
  setFlag('flag_c3_nidai_hiro', 0);
}

// ---------------------------------------------------------------- ③ the cape

/** The plaza before the old aquarium (x20–31, y12–16): a checkerboard so nobody stands behind anybody, the door's front first. */
function plazaSpots(): [number, number][] {
  const out: [number, number][] = [];
  const skip = new Set(['30,12', '22,16', '29,16', '31,12']);
  for (let y = 12; y <= 16; y++) for (let x = 20; x <= 31; x++) if ((x + y) % 2 === 0 && !skip.has(`${x},${y}`)) out.push([x, y]);
  out.sort((a, b) => Math.hypot(a[0] - 26.5, (a[1] - 12) * 1.6) - Math.hypot(b[0] - 26.5, (b[1] - 12) * 1.6));
  return out;
}

const STOP: [number, number] = [17, 13];

function* cape(people: string[]): Co {
  stageMap('map_c3_misaki', 25, 13, 'c3s_misaki');
  // (a trip of a kei truck's bed: some 8; more people, more trips — 4 at most)
  const cap = Math.max(8, Math.ceil(people.length / 4));
  const trips: string[][] = [];
  for (let i = 0; i < people.length; i += cap) trips.push(people.slice(i, i + cap));
  if (!trips.length) trips.push([]);
  const spots = plazaSpots();
  let placed = 0;
  camAt(10 * 16, 13 * 16);
  playAmbient('amb_c3_umi', { fade: 1.0 });
  for (const [k, trip] of trips.entries()) {
    const first = k === 0;
    const last = k === trips.length - 1;
    const x0 = first ? 1 : 9;
    const truck = spawnTruck(TRUCK, x0, STOP[1], 'right', VEH);
    truck.solid = false;
    const riders = ride(truck, trip);
    if (first) {
      yield* game.fadeIn(600);
      se('se_keitora_go', { vol: 0.5 });
      // the camera goes along with it (field.camFollow), then holds on the plaza
      camRelease();
      F().camFollow = truck;
      yield* walk(TRUCK, [[12, STOP[1]]], { speed: 4.2 });
      F().camFollow = null;
      game.scripts.run(panPx(22 * 16, 14 * 16 - 4, 1800));
      yield* walk(TRUCK, [STOP], { speed: 2.2 });
    } else {
      // the next run: a moment later (out of the black), the truck coming in to the same place
      camAt(22 * 16, 14 * 16 - 4);
      yield* game.fadeIn(350);
      se('se_keitora_go', { vol: 0.4 });
      yield* walk(TRUCK, [[14, STOP[1]]], { speed: 4.5 });
      yield* walk(TRUCK, [STOP], { speed: 2.2 });
    }
    truck.moving = false;
    se('se_keitora_stop', { vol: 0.6 });
    yield* beat(first ? 450 : 250);
    // ヒロスケ down from the cab, round to the back: the gate
    const hiro = who(HIRO, 19, 14, 'left', 'npc_hirosuke');
    se('se_door', { vol: 0.4 });
    yield* walk(HIRO, [[15, 14], [15, 12]], { speed: 3.2, face: 'right' });
    hiro.dir = 'down';
    se('se_truck_aori', { vol: 0.6 });
    yield* beat(first ? 350 : 200);
    // off the bed one by one, each to a place before the old aquarium
    const gap = first ? 420 : 260;
    let walking = 0;
    for (const [i, id] of trip.entries()) {
      const r = riders[Math.min(i, riders.length - 1)];
      if (i < riders.length && r) {
        r.visible = false;
        despawn(r.id);
      }
      const [tx, ty] = spots[placed % spots.length] ?? [24, 14];
      placed++;
      const a = who(`c3_sk_p_${placed}`, 14, 13, 'right', spriteOf(id));
      se('se_step_asphalt', { vol: 0.35 });
      walking++;
      const face: Dir = (tx + ty) % 4 === 0 ? 'down' : 'left';
      game.scripts.run(
        (function* (): Co {
          yield* walk(a.id, [[14, 14], [Math.min(tx, 19), 14], [tx, 14], [tx, ty]], { speed: 3.0, face });
          a.dir = face;
          walking--;
        })(),
      );
      // the first few say who they are with a small bubble (their own sprite is the face)
      if (first && i === 0) showBubble(a.id, '……着いた！', 900);
      yield* beat(gap);
    }
    yield () => walking <= 0;
    yield* beat(first ? 500 : 250);
    if (!last) {
      // ヒロスケ back to the cab, the truck off west for the next ones
      se('se_truck_aori', { vol: 0.4 });
      yield* walk(HIRO, [[15, 14], [19, 14]], { speed: 3.6 });
      despawn(HIRO);
      se('se_keitora_go', { vol: 0.4 });
      yield* game.fadeOut(350, '#0B0B14');
      for (const r of riders) despawn(r.id);
      despawn(TRUCK);
      continue;
    }
    // the last run: everyone before the old aquarium; the camera closes in on them
    se('se_truck_aori', { vol: 0.5 });
    endingView.shot(F(), 'c3s_misaki_close', 1600);
    yield* panPx(25 * 16, 14 * 16, 1600);
    for (const a of F().actors) if (a.id.startsWith('c3_sk_p_')) a.dir = 'up';
    yield* beat(1400);
  }
  stopBgm(1.5);
  yield* game.fadeOut(600, '#0B0B14');
  clearScene();
  camRelease();
  F().camFollow = null;
}

/**
 * The whole of S25's last pick-up on the field (its lines in their order); ends on black, the scenario
 * goes on in the entrance (minna.ts). `people`: everyone who comes (来た人 first, then the town).
 */
export function* lastPickup(people: string[]): Co {
  const keep = flag('flag_hud_hidden');
  setFlag('flag_hud_hidden', 1);
  yield* quay(people);
  yield* bed(people);
  yield* cape(people);
  stopAmbient('amb_c3_keitora', 0.5);
  endingView.shot(F(), null);
  setFlag('flag_c3_nidai_view', 0);
  setFlag('flag_hud_hidden', keep);
  F().player.visible = true;
  setFollowerVisible(true);
}
