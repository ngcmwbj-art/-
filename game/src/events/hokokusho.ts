// 「ダンゴムシ ちゃうで」の 報告書（げむきか 10/9 の案2。2026-10-09 依頼主の採用と「案2 の改良」。
// 02_ch2_index #93、10_narrative 6.28、30_level_art 10.8）。文は data/text/hokokusho.ts、カードは
// ui/hokokusho_card.ts、ミニ遊びは ui/hokokusho_games.ts、似顔絵は art/props/hokokusho.ts。
// 町の 11人（巡査・聞き込みの 8人・さや・母）と コタロウの 台本を 包むので、events/index.ts で
// hajimete の あとに import する。
//
//   はじまり：第1章の 段階2、グソっ君が いっしょ、交番の ワイスタ巡査の いつもの 台詞の あとに 1回
//     （flag_hk_start）。カードを 見せて 欄 5つの 説明 → 大事なもの『報告書の 写し』→ そのまま 交番の
//     しらべる 画面（あとでも いい）。
//   交番（はじまりの あと）：カードを 上に 出して、コタロウの 足あと（1回）・8人 満点（1回、朱肉 +1）、
//     そのあと しらべる 欄を えらぶ（大きさ・足の 数・好物。何回でも、いちばん いい 評価が 残る）。
//     正体と 3つが うまったら 報告書を 出す（似顔絵と 本物を ならべて「だれやねん！」→『帰る 所』）。
//     『帰る 所』の あとは 閉じる（評価の ハンコ、ぜんぶ「優」なら 似顔絵を 描き直して 飾る、右手が
//     下りる、朱肉 +2）。閉じた あとも 飾るまでは しらべ直せる。
//     ほかの 話（懸垂の はなまる・7つの 時計・はじめて帳の 敬礼）が 待って いる ときは、巡査の いつもの
//     台本を 先に 回す。何も ない ときは いつもの 台詞を 飛ばして 報告書へ。
//   聞き込み（8人）：その 人の いつもの 話の あとに 続けて（ほかの 話の 筋が 進んだ ときは 次の 回）。
//     証言カードに 線、似顔絵が 1段 変に なる。4人目の あと グソっ君の ひとこと。
//   さや：4人 から、いつもの 話の あとに 推理（本当の 特徴を 3つ）→「オオグソクムシ」。
//   母：報告書を 出した あと、いつもの 話の あとに『帰る 所』。
//   かくし：コタロウ（報告書の あいだ、グソっ君と）。
//   閉じた あと：交番の 巡査が ときどき 右手を 下ろしかけて、また 敬礼する（pose 'grin' を 0.5秒）。
//
// QA（開発サーバーだけ）：
//   __game.cmd.hokokusho(step)  'start'   段階2・グソっ君と、巡査の 前（はじまり）
//                               'koban'   はじまりの あと、巡査の 前（しらべる 画面）
//                               'shingo' 'tomoki' 'hiyori' 'yubin' 'chugaku' 'kuma' 'yuu' 'kazuyuki'  その 人の 前
//                               'sae'     4人 聞いた あと、さやの 前　'submit' 正体と 3つ（優）で 巡査の 前
//                               'kaeru'   出した あと、家の 母の 前　'close' 母の あと、巡査の 前（ぜんぶ 優）
//                               'close2'  同じ、評価が 良・可 まじり　'kotaro' コタロウの 前
//                               'after'   飾った あと、交番　'card' カードを 開く（8人・ぜんぶ）　'reset'
//                               'size' 'legs' 'food' 'suiri'  その 画面だけ　'flags' flag_hk_* の 値
//   __game.cmd.hokokushoText()  台詞の 3行・336px と 禁句（「17」「まだ」「平和」「3人」、地の文の「さん」）

import '../art/props/hokokusho';
import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { measure } from '../engine/font';
import { touchControlsOn } from '../engine/touch';
import { animate } from '../engine/tween';
import { flag, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { actor, msg, registerScript, stage } from '../world/api';
import { ask } from '../ui/dialog';
import { field } from '../world/field';
import { registerWorldFx } from '../world/fx';
import { getScript, type ScriptCtx } from '../world/scripts';
import * as snd from '../world/audio';
import {
  GRADE_CH,
  HK,
  HK_CLOSE,
  HK_CLOSE_ALL,
  HK_CLOSE_GET,
  HK_CLOSE_GRADE,
  HK_CLOSE_NOT_ALL,
  HK_DAREYANEN,
  HK_FIELDS,
  HK_FOOD_INTRO,
  HK_FOOD_REACT,
  HK_FOOD_RULE,
  HK_FOOD_WORD,
  HK_FOODS,
  HK_FULL8,
  HK_GET,
  HK_GET_HINT,
  HK_KAERU,
  HK_KAZARI,
  HK_KAZARI_LATE,
  HK_KOTARO,
  HK_KOTARO_KOBAN,
  HK_LATER,
  HK_LEGS_INTRO,
  HK_LEGS_RIGHT,
  HK_LEGS_RULE,
  HK_LEGS_WORD,
  HK_MENU,
  HK_MENU_Q,
  HK_NOT_YET,
  HK_NOTE4,
  HK_SAE_ASK,
  HK_SAE_RIGHT,
  HK_SIZE_INTRO,
  HK_SIZE_RULE,
  HK_SIZE_WORD,
  HK_START,
  HK_START_CARD,
  HK_SUBMIT,
  HK_SUBMIT_2,
  HK_SUIRI_KOBAN,
  HK_SUIRI_KOBAN_OK,
  HK_TALK,
  HK_WAIT,
  HK_WITNESSES,
  HOKOKUSHO_TEXTS,
  KOBAN_FIELDS,
  LEGS_TRUE,
  SIZE_TRUE,
  allYuu,
  features,
  filled,
  gFlag,
  grade,
  heard,
  heardCount,
  hkFoodResult,
  hkKazuyukiTail,
  hkLegsWrong,
  hkSaeWrong,
  hkSizeResult,
  hkSuiriKobanWrong,
  hkTehaiText,
  hkWrite,
  wFlag,
  type FieldKey,
  type Witness,
} from '../data/text/hokokusho';
import { NigaoeCard, ReportCard, showCard } from '../ui/hokokusho_card';
import { FoodGame, LegsGame, SizeGame, SuiriGame } from '../ui/hokokusho_games';
import { addMp, getKeyItem, onMap, once } from './lib';
import { keyGuide } from './stage';

const ch1 = (): boolean => !flag('flag_ch2_started');
/** 第1章の 段階2（グソっ君が 仲間の あいだ）。 */
const onDuty = (): boolean => ch1() && stage() === 2;

/** Is グソっ君 walking with しゅん and in sight? */
function kanenariHere(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return flag('flag_kanenari_joined') > 0;
}

/** The script registered before this file for `id` (or its placement data), wrapped. */
function wrap(id: string, fn: (ctx: ScriptCtx, orig: (ctx: ScriptCtx) => Co) => Co): void {
  const prev = getScript(id);
  const orig = function* (ctx: ScriptCtx): Co {
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
  };
  registerScript(id, (ctx) => fn(ctx, orig));
}

/** グソっ君 and the ones spoken to stand still while it lasts. */
function* hold(ids: string[], co: Co): Co {
  const who = ids.map((id) => actor(id)).filter((a) => !!a);
  const k = field()?.follower;
  for (const a of who) a!.data.scripted = true;
  if (k) k.data.scripted = true;
  try {
    yield* co;
  } finally {
    for (const a of who) delete a!.data.scripted;
    if (k) delete k.data.scripted;
  }
}

function knEmote(kind: 'question' | 'exclaim' | 'light', hop = false): void {
  const k = field()?.follower;
  if (!k) return;
  k.showEmote(kind, 800);
  if (hop) k.hop(4, 180);
}

/** The one spoken to still stands by しゅん. */
function stillThere(npc: string, map: string): boolean {
  const f = field();
  const a = actor(npc);
  if (!f || !a || f.map.id !== map || !a.visible) return false;
  return Math.abs(a.x - f.player.x) + Math.abs(a.y - f.player.y) <= 48;
}

/**
 * The flags of the other stories that are set (the counters of what was
 * said left out). When the usual talk set a new one (another story moved
 * on), this one waits for the next talk; a counter going up (母's
 * flag_mom_rest …) does not count.
 */
function storySnap(): string {
  const out: string[] = [];
  for (const [k, v] of Object.entries(state.flags)) if (v && !k.startsWith('flag_seen_') && !k.startsWith('flag_hk_')) out.push(k);
  return out.sort().join(',');
}

/** Keep the best grade (and the size measured with it). */
function setGrade(k: FieldKey, g: number): boolean {
  const old = grade(k);
  if (g > old) setFlag(gFlag(k), g);
  return g > old;
}

function* popCard(o: Parameters<typeof showCard>[0], ms: number, text?: string): Co {
  const c = showCard(o);
  try {
    yield 200;
    if (text) yield* msg(text);
    else yield ms;
  } finally {
    c.close();
  }
}

// ================================================================ ミニ遊び

function okKey(): string {
  return touchControlsOn() ? 'けってい' : 'Z';
}

function* playSize(): Co<number> {
  if (once(HK.sizeSeen)) {
    yield* msg(HK_SIZE_INTRO);
    yield* msg(HK_SIZE_RULE);
  }
  keyGuide([[[okKey()], HK_SIZE_WORD.key]], 4500, 8);
  const gm = game.ui.push(new SizeGame());
  yield () => gm.done;
  const cm = gm.result || SIZE_TRUE + 30;
  const err = Math.abs(cm - SIZE_TRUE);
  const g = err <= 1 ? 3 : err <= 6 ? 2 : 1;
  if (g >= grade('size')) setFlag(HK.sizeCm, cm);
  setGrade('size', g);
  yield* msg(hkSizeResult(cm, g));
  return g;
}

function* playLegs(): Co<number> {
  if (once(HK.legsSeen)) {
    yield* msg(HK_LEGS_INTRO);
    yield* msg(HK_LEGS_RULE);
  }
  let tries = 0;
  let last = 10;
  let g = 1;
  for (;;) {
    tries++;
    keyGuide([[['up', 'down'], HK_LEGS_WORD.key], [[okKey()], HK_LEGS_WORD.ok]], 9000, 8);
    snd.se('se_wakime_legs', { vol: 0.6 });
    const gm = game.ui.push(new LegsGame(last));
    yield () => gm.done;
    last = gm.result;
    if (gm.result === LEGS_TRUE) {
      g = tries === 1 ? 3 : tries === 2 ? 2 : 1;
      yield* msg(HK_LEGS_RIGHT);
      break;
    }
    yield* msg(hkLegsWrong(gm.result, tries));
    if (tries >= 3) {
      g = 1;
      break;
    }
  }
  setGrade('legs', g);
  return g;
}

function* playFood(): Co<number> {
  if (once(HK.foodSeen)) {
    yield* msg(HK_FOOD_INTRO);
    yield* msg(HK_FOOD_RULE);
  }
  const tried: number[] = [];
  let g = 1;
  for (;;) {
    keyGuide([[['left', 'right'], 'えらぶ'], [[okKey()], HK_FOOD_WORD.key]], 4500, 8);
    const gm = game.ui.push(new FoodGame(tried));
    yield () => gm.done;
    const food = HK_FOODS[gm.result];
    const k = field()?.follower;
    if (food === '焼きそば') {
      if (k) {
        k.tempPose = 'happy';
        k.hop(5, 200);
        k.showEmote('light', 900);
      }
      snd.se('se_kiran');
      yield* msg(HK_FOOD_REACT[food]);
      if (k) k.tempPose = null;
      g = tried.length === 0 ? 3 : tried.length === 1 ? 2 : 1;
      yield* msg(hkFoodResult(g));
      break;
    }
    if (k) k.showEmote(food === 'コーヒー' ? 'question' : 'question', 700);
    yield* msg(HK_FOOD_REACT[food]);
    tried.push(gm.result);
  }
  setGrade('food', g);
  return g;
}

/** 本当の 特徴を 3つ。`who` が ちがった ときに ひとこと。 */
function* playSuiri(who: 'sae' | 'koban'): Co<number> {
  let tries = 0;
  for (;;) {
    tries++;
    keyGuide([[['up', 'down', 'left', 'right'], 'えらぶ'], [[okKey()], 'まる']], 4500, 8);
    const fs = features();
    const gm = game.ui.push(new SuiriGame(fs));
    yield () => gm.done;
    const right = gm.result.filter((id) => fs.find((f) => f.id === id)?.ok).length;
    if (right === 3) return tries === 1 ? 3 : tries === 2 ? 2 : 1;
    yield* msg(who === 'sae' ? hkSaeWrong(right) : hkSuiriKobanWrong(right));
  }
}

// ================================================================ 交番

const MENU_KEYS: FieldKey[] = ['size', 'legs', 'food'];

/** しらべる 欄を えらぶ（何回でも）。true：出す ところまで うまった。 */
function* menuLoop(): Co<boolean> {
  for (;;) {
    const keys: (FieldKey | 'later')[] = [];
    const opts: string[] = [];
    for (const k of MENU_KEYS) {
      if (grade(k) >= 3) continue;
      keys.push(k);
      opts.push(grade(k) ? `${HK_MENU[k as 'size']}（${GRADE_CH[grade(k)]}）` : HK_MENU[k as 'size']);
    }
    if (filled('shotai') && grade('shotai') < 3) {
      keys.push('shotai');
      opts.push(`${HK_MENU.shotai}（${GRADE_CH[grade('shotai')]}）`);
    }
    if (!keys.length) return true;
    keys.push('later');
    opts.push(HK_MENU.later);
    // (the options carry the grades; the card would sit under the list)
    const i = yield* ask(HK_MENU_Q, opts, { name: 'ワイスタ巡査', voice: 'tsurumi', cancel: opts.length - 1 });
    const k = keys[i];
    if (k === 'later') {
      yield* msg(HK_LATER);
      return false;
    }
    const before = grade(k);
    yield* hold(['npc_tsurumi'], (function* () {
      if (k === 'size') yield* playSize();
      else if (k === 'legs') yield* playLegs();
      else if (k === 'food') yield* playFood();
      else {
        yield* msg(HK_SUIRI_KOBAN);
        setGrade('shotai', yield* playSuiri('koban'));
        yield* msg(HK_SUIRI_KOBAN_OK);
      }
    })());
    // the field on the card: its seal and grade
    snd.se(grade(k) > before ? 'se_stamp' : 'se_page');
    yield* popCard({ anim: { field: k } }, 1100);
    if (filled('shotai') && KOBAN_FIELDS.every(filled) && !flag(HK.submit)) return true;
    if (flag(HK.closed) && allYuu()) return true;
  }
}

/** はじまり（1回）。 */
function* startScene(): Co {
  yield* hold(['npc_tsurumi'], msg(HK_START) as Co);
  setFlag(HK.start, 1);
  snd.se('se_paper_open');
  const card = showCard();
  try {
    yield 300;
    yield* msg(HK_START_CARD);
  } finally {
    card.close();
  }
  yield* getKeyItem('item_hokokusho', HK_GET);
  yield* msg(HK_GET_HINT);
  yield* menuLoop();
}

/** 報告書を 出す（正体と 3つ）。 */
function* submitScene(): Co {
  const card = showCard();
  try {
    yield 200;
    yield* hold(['npc_tsurumi'], msg(HK_SUBMIT) as Co);
  } finally {
    card.close();
  }
  // 似顔絵と 本物
  const nc = game.ui.push(new NigaoeCard(false));
  try {
    snd.se('se_paper_open');
    yield 700;
    nc.side = true;
    snd.se('se_emote');
    yield 600;
    const k = field()?.follower;
    if (k) {
      k.tempPose = 'shock';
      k.hop(5, 200);
    }
    yield* msg(HK_DAREYANEN);
    if (k) k.tempPose = null;
  } finally {
    nc.close();
  }
  yield* hold(['npc_tsurumi'], msg(HK_SUBMIT_2) as Co);
  setFlag(HK.submit, 1);
  yield* popCard({}, 1000);
}

/** 描き直して 飾る（ぜんぶ「優」）。 */
function* kazariScene(card: ReportCard): Co {
  card.showPage(0);
  yield 200;
  let pen = 0;
  yield* animate(1800, (k) => {
    card.setReal(k);
    if (k >= pen) {
      snd.se('se_pen_write', { vol: 0.6 });
      pen += 0.23;
    }
  });
  card.setReal(1);
  setFlag(HK.kazari, 1);
  snd.se('se_hanamaru');
  yield 300;
  yield* msg(HK_KAZARI);
}

/** 閉じる（母の あと）。 */
function* closeScene(): Co {
  const a = actor('npc_tsurumi');
  const card = showCard();
  try {
    card.stamps = 0;
    yield 200;
    yield* msg(HK_CLOSE_GRADE);
    for (let i = 0; i < HK_FIELDS.length; i++) {
      card.stampNext();
      snd.se('se_stamp', { pitch: 0.95 + i * 0.03 });
      yield 380;
    }
    yield 300;
    if (allYuu()) {
      yield* msg(HK_CLOSE_ALL);
      yield* kazariScene(card);
    }
  } finally {
    card.close();
  }
  // 敬礼を、やめる 時
  if (a) a.data.scripted = true;
  try {
    yield* msg(HK_CLOSE[0]);
    if (a) {
      a.dir = 'down';
      a.pose = 'grin';
    }
    snd.se('se_bow', { vol: 0.6 });
    yield 400;
    yield* msg(HK_CLOSE[1]);
    if (a) {
      a.pose = null;
      a.hop(2, 160);
    }
    snd.se('se_emote');
    yield* msg(HK_CLOSE[2]);
  } finally {
    if (a) {
      a.pose = null;
      delete a.data.scripted;
    }
  }
  setFlag(HK.closed, 1);
  addMp(2);
  snd.se('se_item');
  yield* msg(HK_CLOSE_GET);
  if (!allYuu()) yield* msg(HK_CLOSE_NOT_ALL);
}

/** Another story waits at the police box: his usual script runs first. */
function otherKobanStory(): boolean {
  if (flag('flag_kensui_try') && !flag('flag_got_hanamaru_kensui')) return true;
  // はじめて帳の 敬礼（欄が なくても 8人の だれかで はじまる）
  if (!flag('flag_hajimete_keirei')) return true;
  // 7つの 時計（頼まれて いて、巡査の 札が まだ）
  if (flag('flag_tokei7_start') && !flag('flag_tokei7_tsurumi')) return true;
  return false;
}

/** 交番の 報告書（巡査の 台詞の あと、または かわりに）。 */
function* kobanReport(): Co {
  if (!flag(HK.start)) {
    yield* startScene();
    return;
  }
  if (flag(HK.kazari)) return;
  if (flag(HK.kotaro) && !flag(HK.kotaroTold)) {
    setFlag(HK.kotaroTold, 1);
    yield* popCard({}, 0, HK_KOTARO_KOBAN);
  }
  if (heardCount() >= 8 && !flag(HK.full8)) {
    setFlag(HK.full8, 1);
    addMp(1);
    snd.se('se_item');
    yield* popCard({ page: 1 }, 0, HK_FULL8);
  }
  if (flag(HK.closed)) {
    if (!allYuu()) yield* menuLoop();
    if (allYuu()) {
      const card = showCard();
      try {
        yield 200;
        yield* msg(HK_KAZARI_LATE);
        yield* kazariScene(card);
      } finally {
        card.close();
      }
    }
    return;
  }
  if (filled('kaeru')) {
    yield* closeScene();
    return;
  }
  if (flag(HK.submit)) {
    yield* popCard({}, 0, HK_WAIT);
    return;
  }
  if (filled('shotai') && KOBAN_FIELDS.every(filled)) {
    yield* submitScene();
    return;
  }
  if (filled('shotai') && once('flag_hk_shotai_told')) yield* popCard({}, 0, HK_NOT_YET);
  const ready = yield* menuLoop();
  if (ready && filled('shotai') && KOBAN_FIELDS.every(filled) && !flag(HK.submit)) yield* submitScene();
}

wrap('npc_tsurumi', function* (ctx, orig): Co {
  const due = onDuty() && kanenariHere() && onMap('map_koban');
  // after the report was started his usual line is skipped unless another story waits
  if (due && flag(HK.start) && !flag(HK.kazari) && !otherKobanStory()) {
    yield* kobanReport();
    return;
  }
  const snap = storySnap();
  yield* orig(ctx);
  if (!due || !stillThere('npc_tsurumi', 'map_koban')) return;
  if (!flag(HK.start) && storySnap() !== snap) return;
  yield* kobanReport();
});

// 閉じた あと：ときどき 右手を 下ろしかけて、また 敬礼（0.5秒）
registerWorldFx({
  map: 'map_koban',
  update(f) {
    if (!flag(HK.closed)) return;
    const a = f.actors.find((x) => x.id === 'npc_tsurumi');
    if (!a || a.data.scripted) return;
    const ph = f.t % 7200;
    if (ph < 520 && a.dir === 'down') a.pose = 'grin';
    else if (a.pose === 'grin') a.pose = null;
  },
});

// 壁の 似顔絵（町の 地図に 貼って ある）
wrap('obj_koban_map', function* (ctx, orig): Co {
  if (!flag(HK.start) || !ch1()) {
    yield* orig(ctx);
    return;
  }
  const real = flag(HK.kazari) > 0;
  const nc = game.ui.push(new NigaoeCard(real));
  try {
    snd.se('se_examine');
    yield 250;
    yield* msg(hkTehaiText(real ? 'kazari' : heardCount() ? 'mid' : 'blank'));
  } finally {
    nc.close();
  }
});

// ================================================================ 聞き込み

function* testify(w: Witness): Co {
  yield* hold([w.npc], (function* () {
    knEmote('exclaim', true);
    snd.se('se_emote');
    yield 250;
    yield* msg(HK_TALK[w.key]);
    if (w.key === 'kazuyuki') yield* msg(hkKazuyukiTail(flag('flag_bu_gk_sip') > 0));
  })());
  setFlag(wFlag(w.key), heardCount() + 1);
  snd.se('se_pen_write', { vol: 0.8 });
  const card = showCard({ page: 1, anim: { witness: w.key } });
  try {
    yield 200;
    yield* msg(hkWrite(w));
    // 似顔絵も 1段
    card.showPage(0, { witness: w.key });
    snd.se('se_pen_write', { pitch: 0.9, vol: 0.6 });
    yield 1300;
  } finally {
    card.close();
  }
  if (heardCount() >= 4 && once(HK.note4)) yield* hold([], msg(HK_NOTE4) as Co);
}

for (const w of HK_WITNESSES) {
  wrap(w.npc, function* (ctx, orig): Co {
    const map = field()?.map.id ?? '';
    const snap = storySnap();
    yield* orig(ctx);
    if (!onDuty() || !flag(HK.start) || flag(HK.closed) || heard(w.key) || map !== w.map) return;
    if (!kanenariHere() || !stillThere(w.npc, map)) return;
    // another story moved on in this talk: next time
    if (storySnap() !== snap) return;
    yield* testify(w);
  });
}

// ================================================================ さや（推理）

wrap('npc_sae', function* (ctx, orig): Co {
  const snap = storySnap();
  yield* orig(ctx);
  if (!onDuty() || !flag(HK.start) || filled('shotai') || heardCount() < 4) return;
  if (!kanenariHere() || !stillThere('npc_sae', 'map_town') || storySnap() !== snap) return;
  yield* hold(['npc_sae'], (function* () {
    yield* msg(HK_SAE_ASK);
    const g = yield* playSuiri('sae');
    setGrade('shotai', g);
    snd.se('se_kiran');
    yield* msg(HK_SAE_RIGHT);
  })());
  snd.se('se_stamp');
  yield* popCard({ anim: { field: 'shotai' } }, 1300);
});

// ================================================================ 母（帰る 所）

wrap('npc_mother', function* (ctx, orig): Co {
  const snap = storySnap();
  yield* orig(ctx);
  if (!onDuty() || !flag(HK.submit) || filled('kaeru')) return;
  if (!kanenariHere() || !stillThere('npc_mother', 'map_home_1f') || storySnap() !== snap) return;
  yield* hold(['npc_mother'], msg(HK_KAERU) as Co);
  setFlag(gFlag('kaeru'), 3);
  snd.se('se_pen_write');
  yield* popCard({ anim: { field: 'kaeru' } }, 1300);
});

// ================================================================ かくし：コタロウ

wrap('npc_kotaro', function* (ctx, orig): Co {
  const snap = storySnap();
  yield* orig(ctx);
  if (!onDuty() || !flag(HK.start) || flag(HK.closed) || flag(HK.kotaro)) return;
  if (!kanenariHere() || !onMap('map_town') || storySnap() !== snap) return;
  yield* hold(['npc_kotaro'], msg(HK_KOTARO) as Co);
  setFlag(HK.kotaro, 1);
  snd.se('se_stamp_light');
  yield* popCard({}, 1300);
});

// ================================================================ QA

/** Every page: at most 3 lines of at most 336 px; no 「17」「まだ」「平和」「3人」; no 「さん」 in the narration. */
export function hokokushoTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.startsWith('@')) {
        // a word on a screen: one line
        const w = measure(v);
        if (w > 336) bad.push(`${name}: ${w}px: ${v}`);
        return;
      }
      let lines: string[] = [];
      let speaker = '';
      const flush = () => {
        if (!lines.length) return;
        pages++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
        lines = [];
      };
      for (const raw of v.split('\n')) {
        const t = raw.trim();
        if (!t || t.startsWith('>')) continue;
        if (t.startsWith('@')) speaker = t;
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || /^\[.*\]$/.test(t)) {
          flush();
          continue;
        }
        const plain = raw.replace(/\s+$/, '').replace(/\{[^}]*\}/g, '');
        const w = measure(plain);
        if (w > 336) bad.push(`${name}: ${w}px: ${plain}`);
        if (/(?<!ま)まだ(?!ま)/.test(plain)) bad.push(`${name}: 「まだ」: ${plain}`);
        if (plain.includes('平和')) bad.push(`${name}: 「平和」: ${plain}`);
        for (const word of ['17', '3人']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
        if (speaker === '@narr' && /(?<!郵便屋)さん/.test(plain)) bad.push(`${name}: 「さん」: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('hokokusho', HOKOKUSHO_TEXTS);
  // the card's one-line words
  for (const w of HK_WITNESSES) {
    if (measure(w.ans) > 140) bad.push(`card.ans ${w.key}: ${measure(w.ans)}px`);
    if (measure(`${w.where}？`) > 140) bad.push(`card.where ${w.key}: ${measure(w.where)}px`);
  }
  for (const f of features()) if (measure(f.label) > 124) bad.push(`suiri ${f.id}: ${measure(f.label)}px`);
  return { pages, bad };
}

if (import.meta.env.DEV) {
  registerDebug('hokokushoText', () => hokokushoTextCheck());

  type Cmd = Record<string, (...a: unknown[]) => unknown>;
  const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

  /** In front of each one (facing them). */
  const AT: Record<string, [string, number, number, string]> = {
    koban: ['map_koban', 4, 5, 'up'],
    shingo: ['map_town', 10, 22, 'up'],
    tomoki: ['map_town', 31, 24, 'up'],
    hiyori: ['map_town', 23, 9, 'left'],
    yubin: ['map_town', 46, 25, 'up'],
    chugaku: ['map_town', 3, 19, 'up'],
    kuma: ['map_town', 36, 21, 'up'],
    yuu: ['map_clock', 4, 3, 'up'],
    kazuyuki: ['map_cafe', 3, 3, 'up'],
    sae: ['map_town', 15, 11, 'left'],
    kaeru: ['map_home_1f', 2, 4, 'up'],
    kotaro: ['map_town', 16, 23, 'down'],
  };

  const reset = () => {
    for (const k of Object.keys(state.flags)) if (k.startsWith('flag_hk_')) setFlag(k, 0);
  };
  const hearAll = (n = 8) => HK_WITNESSES.slice(0, n).forEach((w, i) => setFlag(wFlag(w.key), i + 1));
  const done = (g: number[] = [3, 3, 3, 3]) => {
    setFlag(gFlag('shotai'), g[0]);
    setFlag(gFlag('size'), g[1]);
    setFlag(gFlag('legs'), g[2]);
    setFlag(gFlag('food'), g[3]);
    setFlag(HK.sizeCm, g[1] >= 3 ? SIZE_TRUE : 109);
    setFlag(HK.note4, 1);
  };

  registerDebug('hokokusho', (step = 'start') => {
    const s = String(step);
    if (s === 'reset') {
      reset();
      return 'hokokusho: reset';
    }
    if (s === 'snap') return storySnap();
    if (s === 'flags') return Object.fromEntries(Object.entries(state.flags).filter(([k, v]) => k.startsWith('flag_hk_') && v));
    if (s === 'size' || s === 'legs' || s === 'food' || s === 'suiri') {
      const w = s === 'size' ? new SizeGame() : s === 'legs' ? new LegsGame() : s === 'food' ? new FoodGame() : new SuiriGame(features());
      game.ui.push(w);
      return `hokokusho: ${s} panel`;
    }
    if (s === 'card') {
      hearAll();
      setFlag(HK.start, 1);
      done([3, 2, 3, 1]);
      setFlag(HK.kotaro, 1);
      game.ui.push(new ReportCard({ modal: true }));
      return 'hokokusho: card';
    }
    // chapter 1, stage 2 with グソっ君
    cmd().jump?.('stage2', true);
    reset();
    // the other stories at the police box out of the way
    setFlag('flag_hajimete_keirei', 1);
    if (s === 'start') return cmd().warp?.(...AT.koban);
    setFlag(HK.start, 1);
    if (!state.inventory.includes('item_hokokusho')) state.inventory.push('item_hokokusho');
    if (s === 'koban') return cmd().warp?.(...AT.koban);
    if (HK_WITNESSES.some((w) => w.key === s)) {
      if (s === 'kazuyuki') setFlag('flag_bu_gk_sip', 1);
      return cmd().warp?.(...AT[s]);
    }
    if (s === 'sae') {
      hearAll(4);
      setFlag(HK.note4, 1);
      return cmd().warp?.(...AT.sae);
    }
    hearAll();
    setFlag(HK.full8, 1);
    if (s === 'kotaro') return cmd().warp?.(...AT.kotaro);
    if (s === 'submit') {
      done();
      return cmd().warp?.(...AT.koban);
    }
    done(s === 'close2' ? [3, 2, 3, 1] : undefined);
    setFlag(HK.submit, 1);
    if (s === 'kaeru') return cmd().warp?.(...AT.kaeru);
    setFlag(gFlag('kaeru'), 3);
    if (s === 'close' || s === 'close2') return cmd().warp?.(...AT.koban);
    if (s === 'after') {
      setFlag(HK.closed, 1);
      setFlag(HK.kazari, 1);
      return cmd().warp?.(...AT.koban);
    }
    return `hokokusho: unknown step ${s}`;
  });
}
