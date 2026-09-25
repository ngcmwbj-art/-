// QA for chapter 2 (02_ch2_index 4.5): the story beats of 星見台 as CHAIN2 —
// each beat is the state after every beat before it — for
// __game.cmd.jump('<beat>') (src/events/debug.ts asks here for the beats it
// doesn't know) and tools/playthrough.mjs --chapter 2.
//
//   __game.cmd.jump('gen')        the slope before マサルさん, stage 1, the lantern lit
//   __game.cmd.jump('barnwork')   (optional) the chores in the barn
//   __game.cmd.beat2()            the furthest chapter-2 beat the flags have reached
//   __game.cmd.lvCh2(6)           both at Lv6 (51 18.5; the battle team's command)
//   __game.cmd.endcut2(3)         one cut of the ending
//   __game.cmd.ch2sounds()        cue-sheet sounds the scripts asked for that aren't registered
//   __game.cmd.textcheck2()       every chapter-2 page against 3 lines × 336 px

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { measure } from '../../engine/font';
import { flag, resetState, setFlag, state, type Dir } from '../../game/state';
import { chapter2Adjust, newChapter2Party, setMemberLevel, syncProgressSkills } from '../../data/battle';
import { registerDebug } from '../../debug';
import { FieldScene, field } from '../../world/field';
import { getScript } from '../../world/scripts';
import { uiHud } from '../../ui/hud';
import { setFieldCurtain } from '../../ui/hud';
import { stopAllAmbient, stopBgm } from '../../audio';
import { HOSHI_NPC, KANENARI_FLIPS_HOSHI, KANENARI_USUAL_HOSHI, MUJIN_SHOP, KANENARI_FLIP_MUJIN_H1 } from '../../data/text/hoshi_npcs';
import { HOSHI_FUSHIGI, HOSHI_OBJ, HOSHI_RESTORED } from '../../data/text/hoshi_objects';
import * as EV from '../../data/text/hoshi_events';
import { DELI_TEXT, TSUGAO_NPC, TSUGAO_OBJ, TS_LINES } from '../../data/text/hoshi_tsugao';
import { resetStaging } from '../stage';
import { resetStamp } from '../stamp';
import { missingSounds } from './compat';
import { CH2_ENDING_CUTS } from './ending';
import { debugChoresDone } from './barn';
import { debugDeliveryAlmost } from './tsugao';

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
const taken =
  (...ids: string[]): Step =>
  () => {
    for (const id of ids) state.taken[id] = true;
  };
/** Both at this level with this much experience (51 3.4: Lv6 236, Lv7 336 on the must-only route). */
const exp =
  (lv: number, total: number): Step =>
  () => {
    for (const m of state.party) {
      setMemberLevel(m, lv);
      m.exp = total;
    }
  };

export interface Beat2 {
  beat: string;
  steps: Step[];
  at: [string, number, number, Dir];
  run?: string;
  desc: string;
  /** Not on the main line (jump only): the main-line beat it stands on. */
  side?: string;
}

/** 02 4.5: the chapter's story in order; each beat = everything before it has happened. */
export const CHAIN2: Beat2[] = [
  { beat: 'ch2', steps: [], at: ['map_town', 56, 22, 'right'], run: 'evt_ch2_prologue', desc: '★踏切 19:30（evt_ch2_prologue）' },
  { beat: 'train', steps: [set('flag_ch2_prologue_done')], at: ['map_hoshi_train', 2, 3, 'right'], desc: '夜の電車（前の方で1.5秒 → 到着）' },
  {
    beat: 'arrive',
    steps: [set('flag_ch2_arrived'), val('flag_ch2_stage', 0), val('flag_ch2_clock', 0)],
    at: ['map_hoshimidai', 25, 44, 'up'],
    desc: 'ホーム 4:59（呼び声45秒）',
  },
  { beat: 'yoriai', steps: [], at: ['map_hoshimidai', 26, 28, 'up'], desc: '分校の昇降口の前（evt_ch2_yoriai）' },
  {
    beat: 'mitsu',
    steps: [set('flag_ch2_yoriai'), keys('item_kairan_map', 'item_kairan_shuniku')],
    at: ['map_hoshimidai', 4, 34, 'up'],
    desc: '3号ハウスの前（evt_ch2_mitsu）',
  },
  { beat: 'house', steps: [set('flag_ch2_met_mitsu')], at: ['map_hoshi_house', 4, 16, 'up'], run: 'evt_ch2_house', desc: '3号ハウス（スネトマト戦）' },
  { beat: 'tomato', steps: [set('flag_ch2_sune_beaten'), taken('sym_hoshi_house_00', 'evt:evt_ch2_house')], at: ['map_hoshi_house', 4, 2, 'right'], desc: '★はなまるトマト（ふしぎ06 → 段階1）' },
  {
    beat: 'gen',
    steps: [set('flag_fushigi_ch2_06', 'flag_ch2_got_tomato', 'flag_ch2_house_exit'), keys('item_hanamaru_tomato'), val('flag_ch2_stage', 1)],
    at: ['map_hoshimidai', 45, 38, 'right'],
    desc: '東の台地への坂道（evt_ch2_gen_stop）',
  },
  { beat: 'barn', steps: [set('flag_ch2_met_gen')], at: ['map_hoshimidai', 51, 32, 'up'], desc: '牛舎の入口（見回り → おつかれさま → ゲート）' },
  {
    beat: 'houki',
    steps: [set('flag_ch2_got_otsukare', 'flag_ch2_gate_open')],
    at: ['map_hoshimidai', 48, 19, 'up'],
    desc: 'ゲートの先・耕作放棄地',
  },
  { beat: 'tetsuya', steps: [exp(6, 236)], at: ['map_hoshimidai', 48, 9, 'up'], desc: '畝の手前（耕うん機テツヤ）' },
  {
    beat: 'yobigoe',
    steps: [set('flag_ch2_tetsuya_beaten', 'flag_ch2_houki_enter'), taken('sym_hoshi_07')],
    at: ['map_hoshimidai', 48, 7, 'up'],
    run: 'evt_ch2_yobigoe',
    desc: '★よびごえ（段階2へ）',
  },
  { beat: 'hill', steps: [val('flag_ch2_stage', 2), set('flag_ch2_keitora_here')], at: ['map_hoshi_hill', 11, 18, 'up'], run: 'evt_ch2_hill', desc: '星見の丘（山道）' },
  { beat: 'boss', steps: [set('flag_ch2_hill_top', 'flag_ch2_hill_enter')], at: ['map_hoshi_hill', 15, 6, 'up'], desc: '柱の前（ヨビモドシ）' },
  {
    beat: 'ch2ending',
    steps: [set('flag_ch2_hill', 'flag_ch2_boss_beaten'), exp(7, 336)],
    at: ['map_hoshi_hill', 21, 4, 'right'],
    run: 'evt_ch2_ending',
    desc: '★エンディング（日の出 → 19:31 → ツガオの部屋）',
  },
  // optional (not on the main line): the chores in the barn
  {
    beat: 'barnwork',
    steps: [],
    at: ['map_hoshi_barn', 19, 6, 'right'],
    desc: '（任意）牛舎のおてつだい（マサルさんに話す）',
    side: 'houki',
  },
  {
    beat: 'delivery',
    steps: [],
    at: ['map_hoshimidai', 42, 43, 'right'],
    desc: '（任意）野菜の配達（ヒロスケさん (43,43) に話す）',
    side: 'gen',
  },
  // QA (tools/playthrough.mjs --side talk): the village after the gathering, to talk to everyone
  {
    beat: 'talk',
    steps: [],
    at: ['map_hoshimidai', 26, 34, 'up'],
    desc: '（QA）寄り合いのあとの村（全員に話す）',
    side: 'mitsu',
  },
];

/** The main line up to `beat` (the side beat 'barnwork' stands on 'houki'). */
export function applyUpTo2(beat: string): Beat2 | null {
  const target = CHAIN2.find((c) => c.beat === beat);
  if (!target) return null;
  const upto = target.side ?? beat;
  const idx = CHAIN2.findIndex((c) => c.beat === upto);
  resetState();
  newChapter2Party();
  setFlag('flag_ch2_started', 1);
  chapter2Adjust();
  setFlag('flag_ch2_stage', 0);
  setFlag('flag_ch2_clock', 0);
  // QA: the battle tutorials of chapter 1 are done
  for (const f of ['flag_tut_tsukkomi', 'flag_tut_ring', 'flag_tut_hanko', 'flag_tut_kire']) setFlag(f, 1);
  for (let i = 0; i <= idx; i++) for (const s of CHAIN2[i].steps) s();
  if (target.side) for (const s of target.steps) s();
  syncProgressSkills();
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = m.maxMp;
  }
  return target;
}

/** jump('<beat>') for chapter 2 (null: not a chapter-2 beat). */
export function jumpCh2(beat: string, noRun = false): string | null {
  const c = applyUpTo2(beat);
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
  const [map, x, y, dir] = c.at;
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
  return `${beat}: ${c.desc}`;
}

export function listCh2(): string[] {
  return CHAIN2.map((c) => `${c.beat}: ${c.desc}`);
}

/** The furthest chapter-2 beat the flags have reached (02 4.5). */
export function beatCh2(): { beat: string; stage: number; map?: string } {
  const order: [string, string][] = [
    ['flag_ch2_boss_beaten', 'ch2ending'],
    ['flag_ch2_tetsuya_beaten', 'hill'],
    ['flag_ch2_gate_open', 'tetsuya'],
    ['flag_ch2_got_otsukare', 'houki'],
    ['flag_ch2_met_gen', 'barn'],
    ['flag_ch2_got_tomato', 'gen'],
    ['flag_ch2_sune_beaten', 'tomato'],
    ['flag_ch2_met_mitsu', 'house'],
    ['flag_ch2_yoriai', 'mitsu'],
    ['flag_ch2_arrived', 'yoriai'],
    ['flag_ch2_prologue_done', 'train'],
  ];
  for (const [f, b] of order) if (flag(f)) return { beat: b, stage: flag('flag_ch2_stage'), map: field()?.map.id };
  return { beat: 'ch2', stage: flag('flag_ch2_stage'), map: field()?.map.id };
}

registerDebug('beat2', () => beatCh2());

/** QA: jump to the ending's state and play one cut (1–5). */
registerDebug('endcut2', (n = 1) => {
  jumpCh2('ch2ending', true);
  const f = field();
  const cut = CH2_ENDING_CUTS[Number(n)];
  if (!f || !cut) return 'no cut';
  if (Number(n) > 1) {
    setFlag('flag_ch2_stage', 3);
    setFlag('flag_ch2_clock', 1);
    f.refreshPresence();
  } else game.fadeAlpha = 1;
  f.startScript(cut());
  return `cut ${n}`;
});

/** QA: the delivery with four parcels delivered (the fifth, トマじい's, is next). */
registerDebug('deliveryAlmost', () => {
  debugDeliveryAlmost();
  return 'four delivered';
});

/** QA: the chores all done but the last (then examine the last spot). */
registerDebug('choresDone', () => {
  debugChoresDone();
  return 'spots set';
});

/** The chapter-2 cue-sheet sounds asked for that aren't registered (for the sound team). */
registerDebug('ch2sounds', () => [...missingSounds].sort());

// ---------------------------------------------------------------- the text check (10 13.4)

/** Width of a line as the dialog lays it out: full-width 16, half-width 8, half space 4 (markup dropped). */
function lineWidth(line: string): number {
  const plain = line.replace(/\{[^}]*\}/g, '').replace(/\$\w+/g, 'シュンスケくん');
  return measure(plain);
}

/** Every page of a msg block: [speaker, lines]. */
function pagesOf(src: string): { speaker: string; lines: string[] }[] {
  const out: { speaker: string; lines: string[] }[] = [];
  let speaker = '';
  let cur: string[] = [];
  const flush = () => {
    if (cur.length) out.push({ speaker, lines: cur });
    cur = [];
  };
  for (const raw of src.split('\n')) {
    const t = raw.trim();
    if (!t || t.startsWith('>') || t.startsWith('!') || t.startsWith('?') || /^\[.*\]$/.test(t)) {
      // a choice, a branch and a command (!se …) all close the page before them
      if (t.startsWith('?') || t.startsWith('!') || /^\[.*\]$/.test(t)) flush();
      continue;
    }
    if (t.startsWith('@')) {
      flush();
      speaker = t.slice(1);
      continue;
    }
    if (t === '/') {
      flush();
      continue;
    }
    cur.push(raw.replace(/\s+$/, ''));
  }
  flush();
  return out;
}

function collectTexts(): [string, string][] {
  const out: [string, string][] = [];
  const walk = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (v.includes('\n') || v.startsWith('@')) out.push([name, v]);
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(`${name}.${k}`, x);
  };
  walk('npc', HOSHI_NPC);
  walk('flip', KANENARI_FLIPS_HOSHI);
  walk('flip', KANENARI_USUAL_HOSHI);
  walk('flip', KANENARI_FLIP_MUJIN_H1);
  walk('obj', HOSHI_OBJ);
  walk('fushigi', HOSHI_FUSHIGI);
  walk('restored', HOSHI_RESTORED);
  walk('tsugao', TSUGAO_NPC);
  walk('ts', TS_LINES);
  walk('deli', DELI_TEXT);
  walk('tsugao_obj', TSUGAO_OBJ);
  for (const [k, v] of Object.entries(EV)) if (typeof v === 'string' && v.startsWith('@')) out.push([`ev.${k}`, v]);
  for (const [k, v] of Object.entries(MUJIN_SHOP)) if (Array.isArray(v)) v.forEach((x, i) => (Array.isArray(x) ? x : [x]).forEach((p) => typeof p === 'string' && out.push([`shop.${k}[${i}]`, '@sys\n' + p])));
  return out;
}

/** Every chapter-2 page: at most 3 lines, each at most 336 px. Returns the offenders. */
export function textCheck2(): { total: number; bad: string[] } {
  const bad: string[] = [];
  let total = 0;
  for (const [name, src] of collectTexts()) {
    for (const pg of pagesOf(src)) {
      total++;
      if (pg.lines.length > 3) bad.push(`${name}: ${pg.lines.length} lines: ${pg.lines.join('／')}`);
      for (const l of pg.lines) {
        const w = lineWidth(l);
        if (w > 336) bad.push(`${name}: ${w}px: ${l}`);
      }
    }
  }
  return { total, bad };
}
registerDebug('textcheck2', () => textCheck2());
