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
import { TSUGAO_LINES } from '../../ui/cut_tsugao';
import { HOSHIMI_YASAI, TSUGAO_HELLO, TSUGAO_TALK } from '../../data/text/tsugao_ch1';
import { FieldScene, field } from '../../world/field';
import { getScript } from '../../world/scripts';
import { uiHud } from '../../ui/hud';
import { setFieldCurtain } from '../../ui/hud';
import { stopAllAmbient, stopBgm } from '../../audio';
import { HOSHI_NPC, KANENARI_FLIPS_HOSHI, KANENARI_USUAL_HOSHI, MUJIN_SHOP, KANENARI_FLIP_MUJIN_H1, KANENARI_FLIP_SHIRITORI } from '../../data/text/hoshi_npcs';
import { NPC } from '../../data/text/npcs';
import { NORTH_TEXTS } from '../rooms_north';
import { HOSHI_FUSHIGI, HOSHI_OBJ, HOSHI_RESTORED } from '../../data/text/hoshi_objects';
import * as EV from '../../data/text/hoshi_events';
import { DELI_TEXT, TSUGAO_NPC, TSUGAO_OBJ, TS_LINES } from '../../data/text/hoshi_tsugao';
import { resetStaging } from '../stage';
import { resetStamp } from '../stamp';
import { missingSounds } from './compat';
import { CH2_ENDING_CUTS } from './ending';
import { debugChoresDone } from './barn';
import { debugDeliveryAlmost } from './tsugao';
import { ROOMS2_TEXTS } from './rooms2';
import { MUSHI_PAGES } from '../../data/text/hoshi_mushi';
import { MARU_CH1, MARU_END, MARU_TOME, SAWA_EVT, SAWA_FLIP, SAWA_FUMI, SAWA_OBJ, SAWA_WAKIMIZU } from '../../data/text/maru';
import { AZE_TEXTS } from '../../data/text/aze';
import { SCHOOL_TEXTS } from '../../data/text/school';
import { CAPE_COFFEE_TEXTS } from '../../data/text/cape_coffee';
import { WAKIME_PAGES } from '../../data/text/hoshi_wakime';
import { SAWAKO_YK_PAGES } from '../../data/text/hoshi_sawako_yk';
import { EKINOTE_TEXTS } from '../../data/text/hoshi_ekinote';
import { NIHYAKU_TEXTS } from '../../data/text/hoshi_nihyaku';
import { MIZUBE_CH2_TEXTS } from '../../data/text/mizube_ch2';
import { DOME_PAGES } from '../../data/text/hoshi_dome';
import { SHIKISHI_TEXTS } from '../../data/text/hoshi_shikishi';
import { ASHIATO_TEXTS } from '../../data/text/hoshi_ashiato';
import { HUNTING_TEXTS } from '../../data/text/hunting';
import { KOTEI_TEXTS } from '../../data/text/kotei';
import { TOKEI_TEXTS } from '../../data/text/tokei7';
import { HAJIMETE_TEXTS } from '../../data/text/hajimete';

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
    // (flag_ch2_mushi: グソっ君's invitation at the house door, 02 #64)
    steps: [set('flag_fushigi_ch2_06', 'flag_ch2_got_tomato', 'flag_ch2_house_exit', 'flag_ch2_mushi'), keys('item_hanamaru_tomato'), val('flag_ch2_stage', 1)],
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
  // QA (02 #80): the barn's door before the round — at the gate マサル says what is still undone, 「まだ 村を 回る」
  {
    beat: 'gate',
    steps: [],
    at: ['map_hoshimidai', 51, 33, 'up'],
    desc: '（QA）牛舎の前（見回り → ゲートの前で 匂わせ → 「まだ 村を 回る」→ 牛舎の マサルに 話す → 開けてもらう）',
    side: 'barn',
  },
  // optional (not on the main line): the chores in the barn
  {
    beat: 'barnwork',
    steps: [],
    at: ['map_hoshi_barn', 19, 6, 'right'],
    desc: '（任意）牛舎のおてつだい（マサルに話す）',
    side: 'houki',
  },
  {
    beat: 'delivery',
    steps: [],
    at: ['map_hoshimidai', 42, 43, 'right'],
    desc: '（任意）野菜の配達（ヒロスケ (43,43) に話す）',
    side: 'gen',
  },
  // optional (02 #65): 沢の上「水の 元」 — トマじい's request, the stream, セキトメ, the name stone.
  // With マル's word from chapter 1 (flag_maru_dengon), so his 〔maru〕 comes first.
  {
    beat: 'sawa',
    steps: [set('flag_met_maru', 'flag_maru_dengon')],
    at: ['map_hoshimidai', 20, 11, 'right'],
    desc: '（任意）沢の上（トマじい (21,11) に話す → 頼み → 戸 (14,1) → セキトメ）',
    side: 'houki',
  },
  // QA (tools/playthrough.mjs --side talk): the village after the gathering, to talk to everyone
  {
    beat: 'talk',
    steps: [],
    at: ['map_hoshimidai', 26, 34, 'up'],
    desc: '（QA）寄り合いのあとの村（全員に話す）',
    side: 'mitsu',
  },
  // optional (02 #73, wakime.ts): ペロ's request (his 〔h1_1〕 heard) → 1号ハウス (10,30) → the minigame → back to him → the diary
  {
    beat: 'wakime',
    steps: [set('flag_seen_npc_hoshi_mitsu_h1_1', 'flag_seen_npc_hoshi_mitsu_h1')],
    at: ['map_hoshimidai', 4, 32, 'left'],
    desc: '（任意）脇芽は 朝に かく（ペロ (3,32) に話す → 1号ハウスの株）',
    side: 'gen',
  },
  // optional (02 #73, sawako_yk.ts): the sketch in ソワカの家 looked at once — the next look is the second
  {
    beat: 'sawako',
    steps: [set('flag_seen_obj_hr_sawako_kabe')],
    at: ['map_hoshi_sawako', 5, 2, 'up'],
    desc: '（任意）ソワカの 色見本（壁のスケッチの2回目 → ソワカ (23,37) に話す）',
    side: 'gen',
  },
  // optional (02 #78, ekinote.ts): ふしぎ① stamped — the notebook's old pages (前の ページを めくる)
  {
    beat: 'ekinote',
    steps: [set('flag_fushigi_ch2_01')],
    at: ['map_hoshimidai', 18, 42, 'up'],
    desc: '（任意）駅ノートの 前の ページ（駅ノート (18,41) を調べる → めくる ×5）',
    side: 'gen',
  },
  // optional (02 #78, nihyaku.ts): stage 1 past the gate — the chart in とまたろうの小屋, then the four
  {
    beat: 'nihyaku',
    steps: [],
    at: ['map_hoshi_koya', 3, 2, 'up'],
    desc: '（任意）二百十日の 前の 晩（農具小屋の表 → トマじい・ペロ・マサル・ハモ区長）',
    side: 'houki',
  },
  // optional (02 #77, dome.ts; ★2026-10-01 02 #80: the observatory behind the school, from the lantern on):
  // stage 1 outside the school — going in, まつ先生 calls しゅん over and gives the key (〔dome〕)
  {
    beat: 'dome',
    steps: [],
    at: ['map_hoshimidai', 26, 28, 'up'],
    desc: '（任意）朝の ほうだけ 光る 星（分校に入る → まつ先生が呼び止めて鍵 → 放送室の裏口 (24,2) → 裏の丘の天文台 (11,5) → 望遠鏡で 3つ → まつ先生）',
    side: 'gen',
  },
  // optional (02 #84, shikishi.ts): stage 1 past the gate — the calendar in シゲじいとスギばあの家, ぴょん夫人, the seven, the festival
  {
    beat: 'shikishi',
    steps: [],
    at: ['map_hoshi_minka2', 9, 2, 'up'],
    desc: '（任意）70年の 色紙と 小さな 夏祭り（カレンダー → ぴょん夫人 → 7人 → ぴょん夫人 → 区の倉庫の提灯 → ハモ区長 → 校庭の桜）',
    side: 'houki',
  },
  // optional (02 #87, ashiato.ts): stage 1 past the gate, the barn chores done and his shipping talk heard — マサル in the barn
  {
    beat: 'ashiato',
    steps: [set('flag_ch2_barn_work', 'flag_seen_npc_hoshi_gen_h1_1', 'flag_seen_npc_hoshi_gen_h1_2'), val('flag_seen_npc_hoshi_gen_h1', 2)],
    at: ['map_hoshi_barn', 19, 6, 'right'],
    desc: '（任意）夜の 足あと帳（マサル〔ashiato〕→ 足あと 6つ → 知らせる → マサル → ゲートの 内側で うり坊を 数える）',
    side: 'houki',
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
  walk('flip', KANENARI_FLIP_SHIRITORI);
  walk('obj', HOSHI_OBJ);
  walk('fushigi', HOSHI_FUSHIGI);
  walk('restored', HOSHI_RESTORED);
  walk('tsugao', TSUGAO_NPC);
  walk('ts', TS_LINES);
  walk('deli', DELI_TEXT);
  walk('tsugao_obj', TSUGAO_OBJ);
  // カット7 ツガオの部屋 (its pages live with the UI's scene)
  walk('cut7', TSUGAO_LINES);
  // 第1章のツガオ便 (the same man's pages in 夕鳴町, 10_narrative 6.21)
  walk('ch1_tsugao', { hello: TSUGAO_HELLO, ...TSUGAO_TALK, ...HOSHIMI_YASAI });
  // 第1章の郵便屋さんの『あした』宛ての手紙 (10_narrative 6.10, 02_ch2_index #56)
  walk('ch1_postman', { tegami: NPC.npc_postman.tegami, tegami_get: NPC.npc_postman.tegami_get });
  // 星見台の家々の中 (02_ch2_index #61)
  walk('rooms2', ROOMS2_TEXTS);
  // 第1章の北の列の部屋・しんごのたんかん (10_narrative 6.14 / 6.22 / 7.19, 02_ch2_index #58)
  walk('ch1_north', NORTH_TEXTS);
  // 捕まえない自由研究 (50 10.21, 02_ch2_index #64)
  walk('mushi', MUSHI_PAGES);
  // マルととまたろう・沢の上 (10_narrative 6.24, 50 3.10・10.22・10.16, 02_ch2_index #65; 第1章のマルも)
  walk('maru', { ch1: MARU_CH1, tome: MARU_TOME, end: MARU_END, fumi: SAWA_FUMI, flip: SAWA_FLIP });
  walk('sawa', { obj: SAWA_OBJ, evt: SAWA_EVT, wakimizu: SAWA_WAKIMIZU });
  // 第1章の 畦道の先の 分水・きつねの 常連 (10_narrative 6.26・7.22, 02_ch2_index #67)
  walk('aze', AZE_TEXTS);
  // げむきか9/30の3：8月31日の 水やり当番（夕鳴小学校の 裏庭、第2章の トマじいの〔bucket〕も。10 6.7・7.23, 50 3.10, 02_ch2_index #72）
  walk('school', SCHOOL_TEXTS);
  // げむきか9/30の1・2・5（ふろしきの マント、置物の ヘラ、減らない コーヒー。10 6.2・6.3・6.16・6.19・6.22, 02_ch2_index #71）
  walk('cape_coffee', CAPE_COFFEE_TEXTS);
  // げむきか9/30の2・4（ソワカの 色見本・脇芽は 朝に かく。50 3.8・3.11・9.9・10.23, 02_ch2_index #73）
  walk('sawako_yk', SAWAKO_YK_PAGES);
  walk('wakime', WAKIME_PAGES);
  // げむきか10/1の4・5（駅ノートの 前の ページ・二百十日の 前の 晩。50 8.1・9.9・10.24, 02_ch2_index #78）
  walk('ekinote', EKINOTE_TEXTS);
  walk('nihyaku', NIHYAKU_TEXTS);
  // げむきか10/1の3（朝の ほうだけ 光る 星。50 3.7・9.8・10.24, 02_ch2_index #77）
  walk('dome', DOME_PAGES);
  // げむきか10/5の改5（70年の 色紙と 小さな 夏祭り。50 9.9・10.26, 02_ch2_index #84）
  walk('shikishi', SHIKISHI_TEXTS);
  // げむきか10/6の案3（夜の 足あと帳。50 9.9・10.28, 02_ch2_index #87）
  walk('ashiato', ASHIATO_TEXTS);
  // げむきか10/5の新5（ハンチングの 値札。第1章の くりこ〔chichi〕も。10 6.8, 50 3.8・9.9, 02_ch2_index #83）
  walk('hunting', HUNTING_TEXTS);
  // げむきか10/5の新1（二人十五脚。第1章の ピー・コック・なんばるわん・校庭。10 6.12・6.23・7.24, 02_ch2_index #82）
  walk('kotei', KOTEI_TEXTS);
  // げむきか10/6の案4（チクタク堂の ばらばら時計。第1章の 時計店・6人、第2章の 駅ノートの 1行。10 6.22・7.19, 50 8.1, 02_ch2_index #88）
  walk('tokei7', TOKEI_TEXTS);
  // げむきか10/7の案5（グソっ君の はじめて帳。第1章の 町の 8人、第2章の 村の 6人と 裏表紙。10 6.27, 50 10.29, 02_ch2_index #89）
  walk('hajimete', HAJIMETE_TEXTS);
  // げむきか10/5の改1（水辺の 図鑑：夜振り・たも網・沢ガニ・駅ノート。50 3.10・10.25, 02_ch2_index #81）
  walk('mizube_ch2', MIZUBE_CH2_TEXTS);
  // msg blocks, blocks that open with a cue (WORK_END …), and the multi-line
  // lines shown without a speaker (HOUKI_LINE's float note: the same 336 px)
  for (const [k, v] of Object.entries(EV)) if (typeof v === 'string' && (v.startsWith('@') || v.startsWith('!cue') || v.includes('\n'))) out.push([`ev.${k}`, v]);
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
