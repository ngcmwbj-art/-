// QA for chapter 3 (60_ch3_story 5.1): the story beats of the first part as
// CHAIN3 — each beat is the state after every beat before it — for
// __game.cmd.jump('ch3:<beat>') (src/events/debug.ts asks here) and
// tools/playthrough.mjs --chapter 3.
//
//   __game.cmd.jump('ch3:ch3')     S00 the chapter's door → S01 小林家 (evt_ch3_prologue)
//   __game.cmd.jump('ch3:truck')   銀座の東の角, the tomato with おばあ (S04 starts by the truck)
//   __game.cmd.jump('ch3:umizoi')  海ぞいの町 at noon, after the children (S06)
//   __game.cmd.beat3()             the furthest chapter-3 beat the flags have reached
//   __game.cmd.ch3sounds()         cue-sheet sounds the scripts asked for that aren't registered

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, resetState, setFlag, state, type Dir } from '../../game/state';
import { chapter3Adjust, newChapter3Party, syncProgressSkills } from '../../data/battle';
import { registerDebug } from '../../debug';
import { FieldScene, field } from '../../world/field';
import { hasMap } from '../../world/maps';
import { getScript } from '../../world/scripts';
import { setFieldCurtain, uiHud } from '../../ui/hud';
import { stopAllAmbient, stopBgm } from '../../audio';
import { resetStaging } from '../stage';
import { resetStamp } from '../stamp';
import { missingSounds } from '../ch2/compat';
import { deriveTalked } from './talked';

type Step = () => void;

const set =
  (...ids: string[]): Step =>
  () => {
    for (const id of ids) setFlag(id, 1);
  };
const val =
  (id: string, v: number): Step =>
  () =>
    setFlag(id, v);
const keys =
  (...ids: string[]): Step =>
  () => {
    for (const id of ids) if (!state.inventory.includes(id)) state.inventory.push(id);
  };
const drop =
  (...ids: string[]): Step =>
  () => {
    state.inventory = state.inventory.filter((i) => !ids.includes(i));
  };

export interface Beat3 {
  beat: string;
  steps: Step[];
  /** Where it stands; `alt` when that map isn't registered yet (W's maps of chapter 3). */
  at: [string, number, number, Dir];
  alt?: [string, number, number, Dir];
  run?: string;
  desc: string;
}

/** 60 5.1 序〜1幕: the chapter's story in order; each beat = everything before it has happened. */
export const CHAIN3: Beat3[] = [
  { beat: 'ch3', steps: [], at: ['map_home_1f', 2, 7, 'up'], run: 'evt_ch3_prologue', desc: '★章の扉 → 小林家 11:10（evt_ch3_prologue、S00・S01）' },
  { beat: 'hinoya', steps: [set('flag_ch3_prologue_done')], at: ['map_town', 32, 22, 'up'], desc: 'ひのやの前（入ると S02）' },
  {
    beat: 'ginza',
    steps: [set('flag_ch3_tomato_given'), drop('item_tomato_omiyage')],
    at: ['map_town', 22, 23, 'right'],
    desc: '銀座の西の口（焼きそばのたかしの前を通る S03 → 東の角のツガオ便）',
  },
  { beat: 'truck', steps: [], at: ['map_town', 45, 26, 'down'], desc: '★銀座の東の角（ツガオ便「乗ってくか？」S04）' },
  {
    beat: 'nidai',
    steps: [],
    at: ['map_c3_nidai', 4, 3, 'right'],
    alt: ['map_town', 45, 25, 'down'],
    run: 'evt_ch3_truck_go',
    desc: '荷台（焼き芋・潮の におい・12:00 で止まる → S05・S06）',
  },
  {
    beat: 'arrive',
    steps: [set('flag_ch3_truck_go')],
    at: ['map_umizoi', 21, 17, 'right'],
    alt: ['map_town', 45, 25, 'down'],
    run: 'evt_ch3_arrive',
    desc: '★港に着く（S05 → S06 子どもたち）',
  },
  {
    beat: 'umizoi',
    steps: [set('flag_ch3_arrived', 'flag_ch3_kids'), val('flag_ch3_stage', 1), keys('item_c3_map')],
    at: ['map_umizoi', 21, 17, 'right'],
    alt: ['map_town', 45, 25, 'down'],
    desc: '海ぞいの町 12:00（地図をもらったあと。町の人に話せる）',
  },
];

/** The chain up to `beat` on a fresh 「第3章から」 state. */
export function applyUpTo3(beat: string): Beat3 | null {
  const idx = CHAIN3.findIndex((c) => c.beat === beat);
  if (idx < 0) return null;
  resetState();
  newChapter3Party();
  chapter3Adjust();
  setFlag('flag_ch3_started', 1);
  setFlag('flag_ch3_stage', 0);
  setFlag('flag_ch3_clock', 0);
  // QA: the battle tutorials of chapters 1–2 are done
  for (const f of ['flag_tut_tsukkomi', 'flag_tut_ring', 'flag_tut_hanko', 'flag_tut_kire']) setFlag(f, 1);
  deriveTalked(true);
  for (let i = 0; i <= idx; i++) for (const s of CHAIN3[i].steps) s();
  syncProgressSkills();
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = m.maxMp;
  }
  return CHAIN3[idx];
}

/** jump('ch3:<beat>') (null: not a chapter-3 beat). */
export function jumpCh3(beat: string, noRun = false): string | null {
  const c = applyUpTo3(beat);
  if (!c) return null;
  game.scripts.clear();
  for (const w of game.ui.widgets) {
    const o = (w as { overlay?: unknown }).overlay;
    if (typeof o === 'function') {
      const i = game.overlays.indexOf(o as (typeof game.overlays)[number]);
      if (i >= 0) game.overlays.splice(i, 1);
    }
  }
  game.ui.widgets = [];
  resetStaging();
  resetStamp();
  setFieldCurtain(0);
  game.fadeAlpha = 0;
  stopBgm(0.2);
  stopAllAmbient(0.2);
  uiHud.reset();
  const [map, x, y, dir] = hasMap(c.at[0]) || !c.alt ? c.at : c.alt;
  state.map = map;
  state.x = x;
  state.y = y;
  state.dir = dir;
  const f = new FieldScene(map, x, y, dir);
  game.replaceAll(f);
  if (c.run && !noRun) {
    const fn = getScript(c.run);
    if (fn)
      f.startScript(
        (function* (): Co {
          yield 300;
          yield* fn({ source: 'jump', map, runDefault: function* () {} });
        })(),
      );
  }
  return `ch3:${beat}: ${c.desc}${map !== c.at[0] ? `（${c.at[0]} がまだないので ${map}）` : ''}`;
}

export function listCh3(): string[] {
  return CHAIN3.map((c) => `${c.beat}: ${c.desc}`);
}

/** The furthest chapter-3 beat the flags have reached. */
export function beatCh3(): { beat: string; stage: number; map?: string } {
  const order: [string, string][] = [
    ['flag_ch3_kids', 'umizoi'],
    ['flag_ch3_truck_go', 'arrive'],
    ['flag_ch3_tomato_given', 'ginza'],
    ['flag_ch3_prologue_done', 'hinoya'],
  ];
  for (const [f, b] of order) if (flag(f)) return { beat: b, stage: flag('flag_ch3_stage'), map: field()?.map.id };
  return { beat: 'ch3', stage: flag('flag_ch3_stage'), map: field()?.map.id };
}

registerDebug('beat3', () => beatCh3());
registerDebug('ch3sounds', () => [...missingSounds].sort());
