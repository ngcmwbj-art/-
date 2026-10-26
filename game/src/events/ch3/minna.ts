// みんなが来る〜決戦〜決着のあと（60_ch3_story 10.25〜10.28、61 14、62 4.8〜4.15、
// 63 12.19・12.20）:
//
//   S25 evt_ch3_minna：S24 のすぐあと（廊下）。館内放送 → 最後の集荷（2026-10-20 から shuuka.ts の場面。W の cut_c3_shuuka
//       があればそれ。なければ黒い画面に文）→ 入口の券売所でエゴが入館の打刻（来た人の
//       数だけ se_dakoku）→ flag_ch3_minna・オートセーブ → 回廊・事務所を自動で（来た人が
//       1人ずつ横を通って、ひとことの吹き出し）→ ホール。
//   S26 evt_ch3_taikin：ホール。ツガオが目を閉じたまま → エゴ「タイキン ノ ジカン デス。」
//       → 「まだ 打刻せん。」→ ナイトキャップをぬいで立つ。
//   S27 evt_ch3_boss：決戦（B。よぶ・みんなの はなまる）。戦闘が無いあいだは文で代わり。
//       〔evt_ch3_boss_final〕は E：黒い判が落ちる → ツガオ → 「おつかれさま でした！」
//       → 長いすに座る（flag_ch3_boss_beaten）。
//   S28 evt_ch3_after：退勤の打刻（館の時計が動く、flag_ch3_stage=4）→ 寝る〜♪ → 暗転 →
//       エンディング（ending.ts）。
//
// 来た人：60 3.4 の表（azemichi.ts の KITA）のうち flag_ch3_kita_<id>。海ぞいの町の人：
// 本筋で必ず話す5人（60 7.4 ③）と、話しかけた人（flag_talked_npc_c3_*）。0人でも進む。
// ツガオは S26〜S28 のあいだ、地図の人を隠して E の actor（c3_ts）で動かす（cond で消えないように）。

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, setFlag, state, type Dir } from '../../game/state';
import { playBgm, stopBgm } from '../../audio';
import * as audio from '../../audio';
import { despawn, pose, registerScript, setFollowerVisible, setSprite, spawn, walk, setStage } from '../../world/api';
import type { Actor } from '../../world/actor';
import { hasMap } from '../../world/maps';
import { hasChar } from '../../art/chars/registry';
import { getEnemy, learnSkill, syncProgressSkills } from '../../data/battle';
import { autosaveSoon } from '../../ui/autosave';
import { showBubble } from '../../ui/bubble';
import { setClockText } from '../../ui/hud';
import * as T from '../../data/text/c3_story4';
import { C3_NAMES } from '../../data/text/c3_names';
import { F, grace } from '../lib';
import { fnOf, se } from '../ch2/compat';
import { addToMap, c3Battle, inCh3, kita, say3 } from './common';
import { jumpMap } from './prologue';
import { KITA } from './azemichi';
import { hasC3Cut, playC3Cut } from './cuts';
import { offerFushigiCh3 } from './fushigi';
import { lastPickup } from './shuuka';
import { hsPaAfter, hsPaBefore } from './housou';
import { registerDebug } from '../../debug';

// ---------------------------------------------------------------- who came

/** 60 7.4 ③：本筋で必ず話す海ぞいの町の5人。 */
export const TOWN_MUST = ['npc_c3_shokudo', 'npc_c3_jouren', 'npc_c3_seri_deshi', 'npc_c3_mago', 'npc_c3_sirenban'];

/** 来た人（60 3.4 の順）。 */
export function kitaIds(): string[] {
  return KITA.filter((k) => kita(k.id)).map((k) => k.id);
}

/** 海ぞいの町の人のうち、S25 からいっしょに来る人（必ず話す5人＋話しかけた人）。 */
export function townIds(): string[] {
  return Object.keys(C3_NAMES).filter((id) => TOWN_MUST.includes(id) || flag(`flag_talked_${id}`));
}

/** Everyone of S25〜S28 (来た人 first, then the town). */
export function crowdIds(): string[] {
  return [...kitaIds(), ...townIds()];
}

/** flag_ch3_yobu_n when the battle didn't write it (61: 来た人＋話した町の人). */
export function yobuCount(): number {
  return kitaIds().length + townIds().length;
}

function sprite(id: string, fallback = 'npc_obaa'): string {
  return hasChar(id) ? id : fallback;
}

const TS = 'c3_ts';
const EGO = 'c3_ego';
const HIRO = 'c3_hiro';
const POKO = 'c3_poko';
const YK = 'c3_yk_follow';

function put(id: string, x: number, y: number, dir: Dir, spr: string, p?: string): Actor {
  despawn(id);
  const a = spawn(id, x, y, { sprite: spr, dir, ghost: true });
  a.data.scripted = true;
  a.solid = false;
  if (p) pose(id, p);
  return a;
}

/** A map's own actor out of the way for the scene (ours stands where the book says). */
function hideOwn(id: string): void {
  const a = F().actorById(id);
  if (a && a !== F().player) {
    a.visible = false;
    a.solid = false;
    a.data.scripted = true;
  }
}

/** グソっ君 (the follower) held by the scene / let go. */
function holdKn(on: boolean): Actor | null {
  const kn = F().actorById('kanenari') ?? null;
  if (kn) {
    if (on) kn.data.scripted = true;
    else delete kn.data.scripted;
  }
  return kn;
}

function* fadeTo(ms = 400): Co {
  yield* game.fadeOut(ms, '#0B0B14');
}

// ---------------------------------------------------------------- S25 the line in the corridors

/**
 * People pass the waiting party one after another along `path` and go out
 * at its end (a door), each saying their line (S25_HITOKOTO) on the way.
 */
function* passBy(ids: string[], path: [number, number][], gap: number): Co {
  const tasks: { done: boolean }[] = [];
  for (const [i, id] of ids.entries()) {
    const aid = `c3_line_${i}_${id}`;
    const [sx, sy] = path[0];
    const a = put(aid, sx, sy, 'up', sprite(id));
    const line = T.S25_HITOKOTO[id]?.split('／');
    const t = { done: false };
    tasks.push(t);
    game.scripts.run(
      (function* (): Co {
        yield* walk(aid, path.slice(1), { speed: 1.9 });
        a.visible = false;
        despawn(aid);
        t.done = true;
      })(),
    );
    if (line)
      game.scripts.run(
        (function* (): Co {
          yield 500;
          // a long line in two bubbles, one after the other
          for (const part of line) {
            if (!F().actorById(aid)) return;
            showBubble(aid, part, line.length > 1 ? 1100 : 1500);
            yield line.length > 1 ? 1150 : 0;
          }
        })(),
      );
    se('se_step_tile', { vol: 0.25 });
    // (one who speaks keeps the next one far enough behind that the bubbles don't meet)
    yield line ? Math.max(gap, line.length > 1 ? 1700 : 1400) : gap;
  }
  yield () => tasks.every((t) => t.done);
}

/** Hall rows for the crowd (62 4.15: (2–23,12–16), the front rows first, from the middle out). */
function hallSpots(n: number): [number, number][] {
  const out: [number, number][] = [];
  for (let y = 12; y <= 16 && out.length < n; y++) {
    const xs = [...Array(22).keys()].map((i) => i + 2).sort((a, b) => Math.abs(a - 12.5) - Math.abs(b - 12.5));
    for (const x of xs) {
      if (out.length >= n) break;
      out.push([x, y]);
    }
  }
  return out;
}

/** The crowd in the hall, facing the bench (S25〜S28; again when the hall is loaded). */
function placeHallCrowd(): void {
  const ids = crowdIds();
  hallSpots(ids.length).forEach(([x, y], i) => {
    const a = put(`c3_crowd_${ids[i]}`, x, y, 'up', sprite(ids[i]));
    a.data.crowd = true;
  });
}

/** ツガオ・エゴ・ヒロスケ・ポコシャ in the hall (ours). */
function placeHallCast(): void {
  hideOwn('npc_tsugao');
  const after = !!flag('flag_ch3_boss_beaten');
  if (!after) put(TS, 12, 7, 'down', 'npc_tsugao_suit', 'nightcap');
  else put(TS, 12, 7, 'down', sprite('npc_tsugao_nightcap', 'npc_tsugao_suit'));
  put(EGO, after ? 15 : 17, after ? 7 : 9, after ? 'left' : 'up', sprite('npc_dakoku_daisha', 'npc_dakoku'));
  put(HIRO, 7, 9, 'up', 'npc_hirosuke');
  put(POKO, 19, 9, 'up', 'npc_pokosha');
}

function clearHall(): void {
  for (const a of [...F().actors]) if (a.id.startsWith('c3_crowd_') || a.id.startsWith('c3_line_')) despawn(a.id);
  for (const id of [TS, EGO, HIRO, POKO]) despawn(id);
}

// ---------------------------------------------------------------- S25 evt_ch3_minna

function* dakokuRun(n: number): Co {
  // 63 8.9: 0.45 s apart (over 10: 0.3 s, over 20: 0.22 s)
  const run = fnOf(audio, 'dakokuRun');
  if (run) {
    const r = run(n) as unknown;
    if (r && typeof (r as Promise<unknown>).then === 'function') {
      // (never longer than the stamping itself: a sound that cannot play must not hold the scene)
      let done = false;
      void (r as Promise<unknown>).then(() => (done = true));
      const until = game.time + n * 450 + 1500;
      yield () => done || game.time > until;
      return;
    }
  }
  const gap = n > 20 ? 220 : n > 10 ? 300 : 450;
  for (let i = 0; i < n; i++) {
    se('se_dakoku', { vol: 0.7 });
    yield gap;
  }
}

/**
 * The last pickup: on the field (2026-10-20, shuuka.ts — the quay, the bed, the cape; its lines in their
 * order), else W's still (cut_c3_shuuka), else on black.
 */
function* shuuka(): Co {
  yield* fadeTo(500);
  stopBgm(1.0);
  if (hasMap('map_umizoi') && hasMap('map_c3_misaki')) {
    yield* lastPickup(crowdIds());
    return;
  }
  if (hasC3Cut('cut_c3_shuuka')) {
    yield* playC3Cut('cut_c3_shuuka', { kita: kitaIds(), town: townIds(), ms: 10000 });
    if (game.fadeAlpha < 1) yield* fadeTo(300);
  } else {
    // (on black) the truck comes, everyone climbs on, it goes up the cape's slope
    yield 400;
    se('se_keitora_go', { vol: 0.5 });
    yield* say3(T.S25_SHUUKA_NARR);
  }
  yield* say3(T.S25_SHUUKA);
  se('se_truck_aori', { vol: 0.6 });
  yield 300;
  yield* say3(T.S25_ONIGIRI);
  se('se_keitora_go', { vol: 0.4 });
  yield 900;
}

export function* evtMinna(): Co {
  if (flag('flag_ch3_minna')) return;
  const f = F();
  setFlag('flag_bgm_hold', 1);
  // the PA (ポコシャ, through the ceiling speakers)
  // (終わりの 音は、下がる を 済ませて いれば 前に 上り 4音・あとに 下り 4音：events/ch3/housou.ts)
  yield* hsPaBefore();
  se('se_c3_aq_pa_open', { vol: 0.5 });
  yield* say3(T.S25_PA);
  se('se_h_pa_close', { vol: 0.5 });
  yield* hsPaAfter();
  yield 400;
  yield* shuuka();
  // the entrance: エゴ stamps everyone in at the ticket window
  const people = crowdIds();
  if (hasMap('map_c3_aq_iriguchi')) jumpMap('map_c3_aq_iriguchi', 12, 4, 'down');
  f.syncFollower(true);
  const kn = holdKn(true);
  if (kn) {
    kn.x = 11 * 16 + 8;
    kn.y = 4 * 16 + 16;
    kn.dir = 'down';
  }
  put(EGO, 6, 8, 'right', sprite('npc_dakoku_daisha', 'npc_dakoku'));
  put(HIRO, 9, 9, 'up', 'npc_hirosuke');
  game.fadeColor = '#0B0B14';
  yield* game.fadeIn(600);
  // they come in through the glass door, two by two, and stand by the hall
  const shown = people.slice(0, 12);
  const spots: [number, number][] = [];
  for (let y = 4; y <= 5; y++) for (let x = 2; x <= 17; x++) if (Math.abs(x - 11.5) > 1.5 || y === 5) spots.push([x, y]);
  spots.sort((a, b) => Math.abs(a[0] - 9.5) - Math.abs(b[0] - 9.5));
  let stamped = false;
  game.scripts.run(
    (function* (): Co {
      yield* dakokuRun(people.length);
      stamped = true;
    })(),
  );
  let left = shown.length;
  for (const [i, id] of shown.entries()) {
    const aid = `c3_line_in_${i}`;
    const [tx, ty] = spots[i % spots.length];
    put(aid, 7, 10, 'up', sprite(id));
    game.scripts.run(
      (function* (): Co {
        yield* walk(aid, [[7, 5], [tx, 5], [tx, ty]], { speed: 2.2, face: 'down' });
        left--;
      })(),
    );
    yield 380;
  }
  // everyone in their place and stamped before anyone is taken off the map
  yield () => left <= 0 && stamped;
  yield 600;
  yield* say3(T.S25_DAKOKU);
  if (people.length >= 10) yield* say3(T.S25_DAKOKU_END);
  const n = kitaIds().length;
  if (n > 0) yield* say3(T.s25Arrive(n));
  else yield* say3(T.S25_ARRIVE_TOWN);
  if (kn) kn.dir = 'right';
  yield* say3(T.S25_KN);
  setFlag('flag_ch3_minna', 1);
  setFlag('flag_c3_minna_walk', 1);
  autosaveSoon();
  yield 300;
  yield* minnaWalk();
}

/** 入口 → 回廊 → 事務所 → ホール（自動。来た人が横を通って、ひとこと）. */
function* minnaWalk(): Co {
  const people = crowdIds();
  const half = Math.ceil(people.length / 2);
  const gap = people.length > 16 ? 450 : 600;
  yield* fadeTo(400);
  for (const a of [...F().actors]) if (a.id.startsWith('c3_line_')) despawn(a.id);
  despawn(EGO);
  despawn(HIRO);
  // 回廊
  if (hasMap('map_c3_aq_kairo')) {
    jumpMap('map_c3_aq_kairo', 18, 3, 'left');
    const f = F();
    f.syncFollower(true);
    const kn = holdKn(true);
    if (kn) {
      kn.x = 19 * 16 + 8;
      kn.y = 3 * 16 + 16;
      kn.dir = 'left';
    }
    playBgm('bgm_umi_noon', { variant: 'outdoor', fade: 1.0 });
    yield* game.fadeIn(500);
    yield* passBy(people.slice(0, half), [[1, 5], [1, 4], [20, 4], [20, 5]], gap);
    yield 300;
    yield* walk('player', [[20, 3], [20, 5]], { speed: 2.2, face: 'down' });
    se('se_door', { vol: 0.5 });
    yield* fadeTo(300);
  }
  // 事務所（第2章のカット7と同じ部屋）
  if (hasMap('map_c3_aq_jimusho')) {
    jumpMap('map_c3_aq_jimusho', 5, 6, 'up');
    const f = F();
    f.syncFollower(true);
    playBgm('bgm_tsugao', { fade: 0.8 });
    yield* game.fadeIn(400);
    yield* walk('player', [[5, 5], [9, 5], [9, 6], [11, 6]], { speed: 2.0, face: 'up' });
    yield* say3(T.S25_JIMUSHO);
    yield* passBy(people.slice(half), [[5, 6], [5, 5], [13, 5]], gap);
    yield 300;
    yield* walk('player', [[12, 6], [12, 5], [13, 5]], { speed: 2.2, face: 'right' });
    se('se_door', { vol: 0.5 });
    yield* fadeTo(300);
  }
  holdKn(false);
  setFlag('flag_c3_minna_walk', 0);
  // the hall
  if (hasMap('map_c3_aq_hall')) jumpMap('map_c3_aq_hall', 1, 11, 'right');
  F().syncFollower(true);
  yield* evtTaikin(true);
}

// ---------------------------------------------------------------- S26 evt_ch3_taikin

function* evtTaikin(fromWalk = false): Co {
  if (flag('flag_ch3_boss_beaten')) return;
  const f = F();
  setFlag('flag_bgm_hold', 1);
  stopBgm(0.8);
  placeHallCrowd();
  placeHallCast();
  if (fromWalk || game.fadeAlpha > 0) yield* game.fadeIn(500);
  playBgm('bgm_tsugao_hall');
  const p = f.player;
  if (p.tileX !== 12 || p.tileY !== 10) yield* walk('player', [[p.tileX, 11], [12, 11], [12, 10]], { speed: 2.2, face: 'up' });
  p.dir = 'up';
  const kn = holdKn(true);
  if (kn) yield* walk('kanenari', [[11, 11], [11, 10]], { speed: 2.4, face: 'up' });
  const yk = f.actorById(YK);
  if (yk) {
    yk.data.scripted = true;
    yield* walk(YK, [[13, 11], [13, 10]], { speed: 2.4, face: 'up' });
  }
  yield 600;
  yield* say3(T.S26_A);
  // エゴ comes by the bench on his cart
  se('se_c3_aq_cart', { vol: 0.5 });
  yield* walk(EGO, [[17, 8], [15, 8], [15, 7]], { speed: 1.6, face: 'left' });
  yield* say3(T.S26_EGO);
  yield 900;
  yield* say3(T.S26_MADA);
  stopBgm(0.8);
  yield 800;
  // the nightcap off; he stands up, slowly (the first time in chapter 3)
  pose(TS, null);
  se('se_c3_aq_bench', { vol: 0.6 });
  yield 500;
  yield* walk(TS, [[12, 8]], { speed: 0.8, face: 'down' });
  yield 400;
  yield* say3(T.S26_B);
  yield* evtBoss();
}

// ---------------------------------------------------------------- S27 evt_ch3_boss

function* evtBoss(): Co {
  const has = !!getEnemy('boss_tsugao') && !(import.meta.env.DEV && flag('flag_qa_c3_nobattle'));
  if (has) {
    const r = yield* c3Battle({ enemies: ['boss_tsugao'], boss: true, music: 'bgm_boss_tsugao', background: 'bg_c3_aq_hall', canLose: true });
    if (r === 'load') return;
    if (game.fadeAlpha > 0) yield* game.fadeIn(600);
  } else {
    playBgm('bgm_boss_tsugao', { fade: 0.5 });
    yield* say3(T.S27_STANDIN);
    yield* say3(T.s27StandinYobu(yobuCount()));
    yield* say3(T.S27_STANDIN_END);
    stopBgm(1.5);
  }
  if (!flag('flag_ch3_yobu_n')) setFlag('flag_ch3_yobu_n', yobuCount());
  yield* bossFinal(has);
}

/** 〔evt_ch3_boss_final〕 the black stamp falls; 「おつかれさま でした！」; he sits down. */
function* bossFinal(inBattle: boolean): Co {
  const f = F();
  for (const a of f.actors) if (a.data.crowd) a.dir = 'up';
  yield 600;
  // (the battle shows it on its own screen, B: 「……ハンコは、…」「おつかれさま でした！」)
  if (!inBattle) {
    // the black stamp drops from his hand
    se('se_bump', { pitch: 0.7, vol: 0.6 });
    yield 700;
    yield* say3(T.BOSS_FINAL);
    // everyone's voice together (63 9.2)
    const chorus = fnOf(audio, 'chorusBlips');
    if (chorus) chorus(crowdIds().map((id) => id.replace(/^npc_/, '')).slice(0, 12), 'otsukaresama');
    yield* say3(T.BOSS_OTSUKARE);
  }
  // he sits down on the bench, all at once
  yield* walk(TS, [[12, 7]], { speed: 3.0, face: 'down' });
  pose(TS, 'sit');
  se('se_c3_aq_bench', { vol: 0.7 });
  setFlag('flag_ch3_boss_beaten', 1);
  syncProgressSkills();
  // the 10th: みんなの はなまる (61 21.2; the battle gives it, else here)
  learnSkill('minato', 'skill_minna_hanamaru');
  yield 800;
  yield* evtAfter();
}

// ---------------------------------------------------------------- S28 evt_ch3_after

function* evtAfter(): Co {
  const f = F();
  yield* say3(T.S28_A);
  // たかし takes the cold pack off his knees
  const yk = f.actorById(YK);
  if (yk) {
    yield* walk(YK, [[13, 9], [13, 8]], { speed: 2.0, face: 'up' });
    se('se_paper_bag', { vol: 0.4 });
    yield 400;
  }
  setFlag('flag_c3_hall_pack_taken', 1);
  yield* say3(T.S28_PACK);
  if (yk) yield* walk(YK, [[13, 9], [13, 10]], { speed: 2.0, face: 'up' });
  // エゴ in front of him; the slot opens
  se('se_c3_aq_cart', { vol: 0.5 });
  yield* walk(EGO, [[14, 8]], { speed: 1.6, face: 'left' });
  // ツガオ's 表の声 from 「……おう。頼むわ。」 on (63 9.2)
  setFlag('flag_c3_tsugao_omote', 1);
  yield* say3(T.S28_EGO);
  yield* say3(T.S28_TAIKIN);
  pose(EGO, 'taikin');
  se('se_dakoku', { vol: 1.0 });
  yield 600;
  // M7′ — the seal comes off (63 12.20)
  playBgm('bgm_c3_taikin');
  yield 1200;
  // the house's clocks start from 12:00 (stage 4)
  se('se_clock_restart');
  setStage(4);
  setClockText('12:01');
  yield* say3(T.S28_CLOCK);
  // fushigi_ch3_10：エゴのカードに『退勤』（ここから押せる。押し忘れたらクリア後の入口で）
  yield* say3(T.FUSHIGI10_SEEN);
  yield* offerFushigiCh3('fushigi_ch3_10');
  // 表の顔 from here (W's shirt + nightcap when there is one)
  yield* say3(T.S28_NERU);
  if (hasChar('npc_tsugao_nightcap')) {
    pose(TS, null);
    setSprite(TS, 'npc_tsugao_nightcap');
  } else pose(TS, 'nightcap');
  stopBgm(1.5);
  setFlag('flag_c3_tsugao_neru', 1);
  yield 1500;
  yield* say3(T.S28_B);
  yield 600;
  yield* fadeTo(1200);
  // the end of the old aquarium: everyone goes to the beach (S29, ending.ts)
  clearHall();
  holdKn(false);
  if (yk) delete yk.data.scripted;
  setFlag('flag_bgm_hold', 0);
  setFollowerVisible(true);
  const end = (yield import('./ending')) as typeof import('./ending');
  yield* end.evtEnding();
}

// ---------------------------------------------------------------- triggers

/** Right after S24 (souko.ts calls it), or the rouka loaded with S24 done. */
registerScript('evt_ch3_minna', function* (): Co {
  if (inCh3() && flag('flag_ch3_hp_beaten') && !flag('flag_ch3_minna')) yield* evtMinna();
});
addToMap('map_c3_aq_rouka', [], ['evt_ch3_minna']);

/** The hall after the autosave of S25 (loaded before S26): S26 again. */
registerScript('evt_ch3_hall_minna', function* (): Co {
  if (!inCh3() || !flag('flag_ch3_minna') || flag('flag_ch3_boss_beaten') || flag('flag_c3_minna_walk')) return;
  yield 200;
  yield* evtTaikin();
});
addToMap('map_c3_aq_hall', [], ['evt_ch3_hall_minna']);

// a save made during the walk (S25's autosave): straight on to the hall
registerScript('evt_ch3_minna_walk', function* (): Co {
  if (!inCh3() || !flag('flag_ch3_minna') || flag('flag_ch3_boss_beaten') || !flag('flag_c3_minna_walk')) return;
  yield 200;
  yield* minnaWalk();
});
addToMap('map_c3_aq_iriguchi', [], ['evt_ch3_minna_walk']);

/** QA (playthrough): S26 from the hall. */
export function* qaTaikin(): Co {
  yield* evtTaikin();
}

void state;
void grace;

// QA (dev server): S25's last pick-up alone, now (after jump('ch3:ending', true) and flag('flag_ch3_stage', 3))
if (import.meta.env.DEV)
  registerDebug('c3shuuka', () => {
    F().startScript(
      (function* (): Co {
        game.fadeColor = '#0B0B14';
        yield* game.fadeOut(200, '#0B0B14');
        yield* lastPickup(crowdIds());
        if (hasMap('map_c3_aq_iriguchi')) jumpMap('map_c3_aq_iriguchi', 12, 4, 'down');
        yield* game.fadeIn(300);
      })(),
    );
    return crowdIds().length;
  });
