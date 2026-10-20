// QA for chapter 3 (60_ch3_story 5.1): the story beats of the first and second parts as
// CHAIN3 — each beat is the state after every beat before it — for
// __game.cmd.jump('ch3:<beat>') (src/events/debug.ts asks here) and
// tools/playthrough.mjs --chapter 3.
//
//   __game.cmd.jump('ch3:ch3')     S00 the chapter's door → S01 小林家 (evt_ch3_prologue)
//   __game.cmd.jump('ch3:truck')   銀座の東の角, the tomato with おばあ (S04 starts by the truck)
//   __game.cmd.jump('ch3:umizoi')  海ぞいの町 at noon, after the children (S06)
//   第2期: 'bin' (S10 the first run), 'ichiba' 'seri' (S07), 'shokudo' 'teishoku' (S08),
//   'kaisui' 'moguri' 'lens' 'umi_last' (S09), 'itadaki' (S11), 'siren' 'nari_end' (S12・S13),
//   'trap' (S14), 'aqmae' (S14 → S15). 第3期: 'kairo' 'kairo_end' (S16), 'diorama' (S17),
//   'shinkai' (S18), 'esa' (S19), 'hall' (S20), 'souko' (S21・S22), 'yakisoban' (S23), 'hp' (S24),
//   'aq_end' (S24 done → S25). 第4期: 'taikin' (S26〜S28 → the ending), 'ending' (S29〜S33 → おわり →
//   the title), 'clear' (S34, after the clear). __game.cmd.kita(n) / kitaNext()
//   for the people who came; flag('flag_qa_c3_nobattle', 1) skips the story battles (DEV)
//   __game.cmd.beat3()             the furthest chapter-3 beat the flags have reached
//   __game.cmd.ch3sounds()         cue-sheet sounds the scripts asked for that aren't registered

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, resetState, setFlag, state, type Dir } from '../../game/state';
import { chapter3Adjust, newChapter3Party, syncProgressSkills } from '../../data/battle';
import { registerDebug } from '../../debug';
import { FieldScene, field } from '../../world/field';
import { hasMap } from '../../world/maps';
import { getScript, registerScript } from '../../world/scripts';
import { setFieldCurtain, uiHud } from '../../ui/hud';
import { dismissDialog } from '../../ui/dialog';
import { stopAllAmbient, stopBgm } from '../../audio';
import { resetStaging } from '../stage';
import { resetStamp } from '../stamp';
import { fnOf, missingSounds } from '../ch2/compat';
import * as battleData from '../../data/battle';
import { MUST_TALK, deriveTalked } from './talked';
import { runBin, waiting } from './azemichi';
import { yobuCount } from './minna';

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
  // ---- 第2期（S07〜S14）。1便（★6人）は着いたことにする（便の場面は beat 'bin'）
  {
    beat: 'bin',
    steps: [],
    at: ['map_umizoi', 40, 24, 'right'],
    run: 'c3_qa_bin',
    desc: 'ツガオ便の1便（S10。★6人が着く）',
  },
  { beat: 'ichiba', steps: [bins], at: ['map_c3_ichiba', 11, 6, 'up'], alt: ['map_umizoi', 10, 24, 'up'], desc: '★市場のセリ場（ゲンかツグミに1回話すと S07）' },
  {
    beat: 'seri',
    steps: [set('flag_ch3_ichiba_start', 'flag_seen_npc_c3_seri_deshi_c1_1', 'flag_ch3_fucho_01', 'flag_ch3_fucho_02', 'flag_ch3_fucho_04'), val('flag_ch3_fucho_n', 3), keys('item_c3_fucho')],
    at: ['map_c3_ichiba', 11, 5, 'up'],
    alt: ['map_umizoi', 10, 24, 'up'],
    desc: '切れはし3枚（ゲンかツグミに話すとセリ → ネフダマヨイ）',
  },
  {
    beat: 'shokudo',
    steps: [set('flag_ch3_seri_n', 'flag_ch3_nefuda_beaten', 'flag_ch3_ichiba_done', 'flag_ch3_part_hashi'), val('flag_ch3_seri_n', 3), keys('item_c3_hashi'), bins],
    at: ['map_c3_shokudo', 4, 5, 'up'],
    alt: ['map_umizoi', 30, 16, 'up'],
    desc: '★食堂かもめ（S07 のあと。ナミエ・ゴロウ → 定食 → オカワリナベ S08）',
  },
  {
    beat: 'teishoku',
    steps: [set('flag_ch3_goro_honne', 'flag_seen_npc_c3_shokudo_c1_1', 'flag_seen_npc_c3_jouren_c1_1', 'flag_ch3_shokudo_start', 'flag_ch3_teishoku_sakana', 'flag_ch3_teishoku_himono', 'flag_ch3_himono_hodo'), val('flag_ch3_teishoku_n', 2)],
    at: ['map_c3_shokudo', 4, 5, 'up'],
    alt: ['map_umizoi', 30, 16, 'up'],
    desc: '定食2品（ナミエに話すと盛りつけ → オカワリナベ）',
  },
  {
    beat: 'kaisui',
    steps: [set('flag_ch3_mori_done', 'flag_ch3_okawari_beaten', 'flag_ch3_shokudo_done', 'flag_ch3_part_gassho'), bins],
    at: ['map_umizoi', 60, 29, 'down'],
    desc: '★海水浴場（S08 のあと。ウミ・カイト → 潜り → レンズ S09）',
  },
  {
    beat: 'moguri',
    steps: [set('flag_seen_npc_c3_mago_c1_1', 'flag_seen_npc_c3_kanshiin_c1_1', 'flag_ch3_kaisui_start', 'flag_ch3_moguri_first')],
    at: ['map_umizoi', 60, 31, 'down'],
    desc: '波打ちぎわ（下へ押すと潜る）',
  },
  {
    beat: 'lens',
    steps: [set('flag_ch3_moguri_bracelet', 'flag_ch3_bracelet_given', 'flag_ch3_lens_ok'), val('flag_ch3_moguri_n', 1), val('flag_ch3_toudai_open', 1)],
    at: ['map_c3_toudai', 4, 4, 'up'],
    alt: ['map_umizoi', 9, 31, 'left'],
    desc: '灯台のレンズ（ブイ3つに光を当てる）',
  },
  {
    beat: 'umi_last',
    steps: [set('flag_ch3_lens_teru', 'flag_ch3_lens_0', 'flag_ch3_lens_1', 'flag_ch3_lens_2'), val('flag_ch3_lens_n', 3)],
    at: ['map_umizoi', 60, 31, 'up'],
    desc: '波がもどった浜（ウミに話すと 最後の海）',
  },
  {
    beat: 'itadaki',
    steps: [set('flag_ch3_umi_done', 'flag_ch3_part_koe'), bins],
    at: ['map_umizoi', 30, 16, 'up'],
    desc: '★部品3つ（食堂に入ると S11 いただきます）',
  },
  {
    beat: 'siren',
    steps: [set('flag_ch3_got_itadakimasu')],
    at: ['map_c3_siren', 6, 9, 'up'],
    alt: ['map_umizoi', 34, 7, 'up'],
    run: 'evt_ch3_siren',
    desc: '★サイレン塔（S12：ミナト → 見晴らし台でナリオサメ）',
  },
  {
    beat: 'nari_end',
    steps: [set('flag_ch3_siren_talk', 'flag_ch3_siren_told', 'flag_ch3_nariosame_beaten', 'flag_ch3_clock'), val('flag_ch3_stage', 2)],
    at: ['map_c3_siren', 6, 3, 'up'],
    alt: ['map_umizoi', 34, 7, 'up'],
    run: 'evt_ch3_nariosame_end',
    desc: 'ナリオサメのあと 12:01（S12 の終わり → S13 ごちそうさま・防波堤）',
  },
  {
    beat: 'trap',
    steps: [set('flag_ch3_got_gochisou')],
    at: ['map_umizoi', 44, 22, 'down'],
    desc: '★港の軽トラの前（S14：やり残し ないか？ → 案A）',
  },
  {
    beat: 'aqmae',
    steps: [set('flag_ch3_truck_trap'), val('flag_c3_nidai_view', 2)],
    at: ['map_umizoi', 73, 30, 'up'],
    run: 'evt_ch3_aq_enter',
    desc: '★旧水族館の前（S14 のあと → S15 ポコシャがガラス戸を開ける・入館券）',
  },
  // ---- 第3期（S15〜S24。旧水族館）
  {
    beat: 'kairo',
    // (the five of 海ぞいの町 the main line always talks to: 60 7.4 ③)
    steps: [val('flag_ch3_stage', 3), set('flag_ch3_aq_enter', 'flag_talked_npc_c3_shokudo', 'flag_talked_npc_c3_jouren', 'flag_talked_npc_c3_seri_deshi', 'flag_talked_npc_c3_mago', 'flag_talked_npc_c3_sirenban'), keys('item_c3_nyukanken')],
    at: ['map_c3_aq_kairo', 1, 5, 'up'],
    alt: ['map_umizoi', 73, 30, 'up'],
    desc: '★回廊（S16：伝票を4枚 → 東のはしのヒロスケ）',
  },
  {
    beat: 'kairo_end',
    steps: [set('flag_ch3_denpyo_01', 'flag_ch3_denpyo_04', 'flag_ch3_denpyo_07', 'flag_ch3_denpyo_12'), val('flag_ch3_denpyo_n', 4), keys('item_c3_denpyo')],
    at: ['map_c3_aq_kairo', 32, 4, 'right'],
    alt: ['map_umizoi', 73, 30, 'up'],
    desc: '伝票4枚（★）を読んだ回廊（東へ歩くとヒロスケ・白紙の日）',
  },
  {
    beat: 'diorama',
    steps: [set('flag_ch3_kairo_done')],
    at: ['map_c3_aq_diorama', 1, 14, 'right'],
    alt: ['map_umizoi', 73, 30, 'up'],
    run: 'evt_ch3_diorama',
    desc: '★ジオラマの部屋（S17：人形 → マフィ屋）',
  },
  {
    beat: 'shinkai',
    steps: [set('flag_c3_diorama_in', 'flag_ch3_mafiya', 'flag_ch3_diorama_done')],
    at: ['map_c3_aq_shinkai', 21, 16, 'up'],
    alt: ['map_umizoi', 73, 30, 'up'],
    run: 'evt_ch3_shinkai',
    desc: '★深海の展示室（S18：グソっ君が先を歩く → 空の水槽）',
  },
  {
    beat: 'esa',
    steps: [set('flag_c3_shinkai_in', 'flag_ch3_shinkai_done')],
    at: ['map_c3_aq_esa', 11, 5, 'left'],
    alt: ['map_umizoi', 73, 30, 'up'],
    run: 'evt_ch3_esa',
    desc: '★えさの部屋（S19：ポコシャの話 → 話すと鍵。えさの札は任意）',
  },
  {
    beat: 'hall',
    steps: [set('flag_c3_esa_talk', 'flag_ch3_esa_done'), keys('item_c3_hall_key')],
    at: ['map_c3_aq_hall', 12, 12, 'up'],
    alt: ['map_umizoi', 73, 30, 'up'],
    desc: '★大水槽のホール（S20：長いすの前へ → 初戦 → 捕らわれる）',
  },
  {
    beat: 'souko',
    steps: [set('flag_ch3_tsugao1')],
    at: ['map_c3_aq_souko', 4, 6, 'up'],
    alt: ['map_umizoi', 73, 30, 'up'],
    run: 'evt_ch3_souko',
    desc: '★えさの倉庫（S21 焼き芋・S22 エゴの夜）',
  },
  {
    beat: 'yakisoban',
    steps: [set('flag_ch3_souko', 'flag_ch3_ego_night')],
    at: ['map_c3_aq_souko', 5, 7, 'down'],
    alt: ['map_umizoi', 73, 30, 'up'],
    desc: '★倉庫の扉の前（S23：扉を調べると ヤキソバン）',
  },
  {
    beat: 'hp',
    steps: [set('flag_ch3_souko_open', 'flag_ch3_yakisoban_scene', 'flag_ch3_yakisoban'), addYaki],
    at: ['map_c3_aq_rouka', 4, 4, 'right'],
    alt: ['map_umizoi', 73, 30, 'up'],
    desc: '★廊下（S24：東へ歩くと ヒロスケ・ポコシャ戦。3人）',
  },
  {
    beat: 'aq_end',
    steps: [set('flag_ch3_hp_beaten')],
    at: ['map_c3_aq_rouka', 3, 3, 'left'],
    alt: ['map_umizoi', 73, 30, 'up'],
    desc: '★廊下（S24 のあと → S25 みんなが来る：館内放送・最後の集荷・入館の打刻・回廊と事務所）',
  },
  // ---- 第4期（S25〜S34）
  {
    beat: 'taikin',
    steps: [set('flag_ch3_minna')],
    at: ['map_c3_aq_hall', 1, 11, 'right'],
    alt: ['map_umizoi', 73, 30, 'up'],
    desc: '★大水槽のホール（S26 タイキンの時間 → S27 決戦 → S28 決着のあと → エンディング）',
  },
  {
    beat: 'ending',
    steps: [set('flag_ch3_boss_beaten', 'flag_c3_tsugao_neru'), val('flag_ch3_stage', 4), yobuN],
    at: ['map_c3_aq_hall', 12, 10, 'up'],
    alt: ['map_umizoi', 29, 32, 'down'],
    run: 'evt_ch3_ending',
    desc: '★エンディング（S29 昼ごはん → S30 真相 → S31 集合写真 → S32 帰り道 → S33 → おわり → タイトル）',
  },
  {
    beat: 'clear',
    steps: [set('flag_ch3_truth', 'flag_ch3_yk_left', 'flag_ch3_clear', 'flag_follower_hidden'), val('flag_c3_end_light', 2), dropYaki],
    at: ['map_town', 27, 24, 'up'],
    desc: 'クリア後（S34：銀座の朝。焼きそばのたかしのグソっ君、ツガオ便）',
  },
];

/** ヤキソバン out of the line (S29; B's removeYakisoban when it is there). */
function dropYaki(): void {
  fnOf(battleData, 'removeYakisoban')?.();
}

/** よぶで来た人の数（B が書かないとき：来た人＋話した町の人）。 */
function yobuN(): void {
  if (!flag('flag_ch3_yobu_n')) setFlag('flag_ch3_yobu_n', yobuCount());
}

/** ヤキソバン joins (61 5.1; B's addYakisoban when it is there). */
function addYaki(): void {
  fnOf(battleData, 'addYakisoban')?.();
}

/** The runs of ツガオ便 that are due (1 + ①〜③ done) have come, with the six of the main line (QA). */
function bins(): void {
  const done = ['flag_ch3_ichiba_done', 'flag_ch3_shokudo_done', 'flag_ch3_umi_done'].filter((f) => flag(f)).length;
  setFlag('flag_ch3_bin_n', Math.max(flag('flag_ch3_bin_n'), Math.min(4, 1 + done)));
  for (const id of MUST_TALK) {
    if (!flag(`flag_ch3_kita_${id}`)) setFlag('flag_ch3_kita_n', flag('flag_ch3_kita_n') + 1);
    setFlag(`flag_ch3_kita_${id}`, 1);
  }
}

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
  // a dialog window of the scene the jump cuts off (its box would stay the singleton, off the
  // widget list, and swallow the next say())
  dismissDialog();
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
    ['flag_ch3_clear', 'clear'],
    ['flag_ch3_boss_beaten', 'ending'],
    ['flag_ch3_minna', 'taikin'],
    ['flag_ch3_hp_beaten', 'aq_end'],
    ['flag_ch3_yakisoban', 'hp'],
    ['flag_ch3_ego_night', 'yakisoban'],
    ['flag_ch3_tsugao1', 'souko'],
    ['flag_ch3_esa_done', 'hall'],
    ['flag_ch3_shinkai_done', 'esa'],
    ['flag_ch3_diorama_done', 'shinkai'],
    ['flag_ch3_kairo_done', 'diorama'],
    ['flag_ch3_aq_enter', 'kairo'],
    ['flag_ch3_truck_trap', 'aqmae'],
    ['flag_ch3_got_gochisou', 'trap'],
    ['flag_ch3_nariosame_beaten', 'nari_end'],
    ['flag_ch3_got_itadakimasu', 'siren'],
    ['flag_ch3_umi_done', 'itadaki'],
    ['flag_ch3_kids', 'umizoi'],
    ['flag_ch3_truck_go', 'arrive'],
    ['flag_ch3_tomato_given', 'ginza'],
    ['flag_ch3_prologue_done', 'hinoya'],
  ];
  for (const [f, b] of order) if (flag(f)) return { beat: b, stage: flag('flag_ch3_stage'), map: field()?.map.id };
  return { beat: 'ch3', stage: flag('flag_ch3_stage'), map: field()?.map.id };
}

registerDebug('beat3', () => beatCh3());
// beat 'bin': the first run of ツガオ便 now
registerScript('c3_qa_bin', function* (): Co {
  const who = waiting().slice(0, 6);
  if (who.length) yield* runBin(who);
});
registerDebug('ch3sounds', () => [...missingSounds].sort());
