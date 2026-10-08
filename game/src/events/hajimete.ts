// グソっ君の はじめて帳（げむきか 10/7 の案5。2026-10-08 依頼主の採用。02_ch2_index #89、10_narrative 6.27、
// 50_ch2_story 10.29、30_level_art 10.7、52_ch2_level_art 13.2）。文は data/text/hajimete.ts、ページは
// ui/menu/book_hajimete.ts。町と 村の 14人の 台本を 包むので、events/index.ts で tokei7 の あとに import する
// （第2章の 台本は ./ch2 で 先に 登録されて いる）。
//
//   はじまり（第1章）：グソっ君が 仲間に なってから、はじめて ふしぎに『みました』を 押したとき（朱肉の 1行の
//     あと。world/fushigi.ts の onFushigiAfter）。または、その 前に 8人の だれかに 話したとき。
//     → flag_hajimete_book。焼きそばの 1ページは いつも、ほかの 3つは 今ある ひとことを 見ていれば 先に 入る。
//   町の 8人（段階1〜2、グソっ君が いっしょ、その 人の いる 部屋・通りで、1回ずつ。どの 順でも）：
//     その 人の いつもの 話の あとに 続けて はじめての 1ページ（flag_hajimete_<id>）。8つで 朱肉 +2。
//     ちずは 段階2 なら 続けて らん外の『北東へ 流れる 打ち水』（flag_hajimete_uchimizu_ne）。
//   出来たての 焼きそば：第1章の エンディングの あと（flag_clear）、自動で ① に 入る（第2章で 開いても）。
//   第2章（h0〜h2、グソっ君が いっしょ）：村の 6人の だれかに はじめて 話したとき、①の 欄が ある 人は
//     「こっちでも 書けるで！」、ない 人（第2章から）は ①の はじまりと 同じ ことを 言って ② に 欄
//     （flag_hajimete_book2）。①の 欄が ある 人は、第2章の ふしぎに はじめて 押したときにも 開く。
//     村の 6人：いつもの 話の あとに 1ページ。6つで 朱肉 +2。
//   かくし：裏表紙（① 13 と ② 6。らん外は いらない）→ 地の文と グソっ君（flag_hajimete_ura）、裏表紙の カード。
//     さいごの 1ページの あと（または、ぜんぶ うまって いて 村の 6人の だれかに 話したとき・ふしぎの あと）。
//
// QA（開発サーバーだけ）：
//   __game.cmd.hajimete(step)  'start'  段階2・グソっ君と、くま吉の 前（欄が ない。話すと はじまり→豆腐）
//                              'stamp'  段階2・欄が ない まま、ふしぎ（カーブミラー）の 前
//                              'uchimizu' 'tofu' 'higasa' 'shinbun' 'fude' 'kansouki' 'keirei' 'atari'  その 人の 前（欄 あり）
//                              'tsukemono' 'tomatoha' 'inaho' 'iro' 'shikiji' 'tegami'  第2章、その 人の 前（② の 欄 あり）
//                              'open2'  第2章、① の 欄 あり・② なし、ペロの 前　'ch2new' 第2章から（① なし）、ペロの 前
//                              'ura'    第2章、のこり 1つ（さんかど）で さんかどの 前　'book' ① ② ぜんぶ うめて 裏表紙まで
//                              'reset'  フラグを もどす
//   __game.cmd.hajimeteText()      台詞の 3行・336px と 禁句（第1章「17」「まだ」「平和」「3人」、第2章は 時刻の 数字など）
//   __game.cmd.hajimeteBookText()  みました帳の ページ（wrapCheck も 呼ぶ）

import type { Co } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { H, W } from '../engine/screen';
import { ease } from '../engine/tween';
import { measure } from '../engine/font';
import { flag, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { actor, msg, registerScript, stage } from '../world/api';
import { field } from '../world/field';
import { getScript, type ScriptCtx } from '../world/scripts';
import { isCh2Fushigi, onFushigiAfter } from '../world/fushigi';
import * as snd from '../world/audio';
import {
  HAJIMETE,
  HAJIMETE_TEXTS,
  HAJIMETE_TOWN,
  HAJIMETE2,
  HF,
  HJ_BONUS_PAGE,
  HJ_OPEN2,
  HJ_REWARD,
  HJ_START,
  HJ_START2,
  HJ_TALK,
  HJ_TALK2,
  HJ_UCHIMIZU_NE,
  HJ_URA,
  hajimeteAll,
  hajimeteBook,
  hajimeteCount,
  hajimeteDone,
  hjCountText,
  hjStartFilled,
  pageFlag,
  type HajimeteEntry,
} from '../data/text/hajimete';
import { drawUraCard, uraFace } from '../ui/menu/book_hajimete';
import { addMp, onMap } from './lib';

const NE = 'uchimizu_ne';

/** Chapter 1 (not yet in 星見台). */
const ch1 = (): boolean => !flag('flag_ch2_started');
const ch1OnDuty = (): boolean => ch1() && stage() >= 1 && stage() <= 2;
const ch2OnDuty = (): boolean => !!flag('flag_ch2_started') && flag('flag_ch2_stage') <= 2;

/** Is グソっ君 walking with しゅん and in sight? (chapter 1: joined; chapter 2: in the party) */
function kanenariHere(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return flag('flag_kanenari_joined') > 0 || state.party.some((m) => m.id === 'kanenari');
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

/** グソっ君 and the one spoken to stand still while it lasts. */
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

/** グソっ君 shows what he feels (and hops a little for the big ones). */
function knEmote(kind: 'question' | 'exclaim' | 'light', hop = false): void {
  const k = field()?.follower;
  if (!k) return;
  k.showEmote(kind, 800);
  if (hop) k.hop(4, 180);
}

/** The one spoken to still stands by しゅん (the talk did not walk them off or change the map). */
function stillThere(npc: string, map: string): boolean {
  const f = field();
  const a = actor(npc);
  if (!f || !a || f.map.id !== map || !a.visible) return false;
  return Math.abs(a.x - f.player.x) + Math.abs(a.y - f.player.y) <= 48;
}

/** Where each of the eight can teach (chapter 1). */
const TOWN_MAP: Record<string, string> = {
  uchimizu: 'map_town',
  tofu: 'map_town',
  higasa: 'map_town',
  // at home in the armchair (not at the school ground for the race)
  shinbun: 'map_madam',
  fude: 'map_shodo',
  kansouki: 'map_laundry',
  keirei: 'map_koban',
  atari: 'map_hinoya',
};

// ================================================================ ① ② の 欄

/** はじまり（第1章）：the request, the section, the pages already in it. */
function* startBook1(): Co {
  yield* hold([], (function* () {
    knEmote('light');
    snd.se('se_emote_light', { vol: 0.7 });
    yield 250;
    yield* msg(HJ_START);
  })());
  setFlag(HF.book, 1);
  snd.se('se_page');
  yield 120;
  snd.se('se_pen_write', { vol: 0.7 });
  yield* msg(hjStartFilled(hajimeteCount(1)[0]));
}

/** 第2章：② の 欄（① が ある 人は「こっちでも」、第2章から の 人は はじまりと 同じ）。 */
function* openBook2(): Co {
  const had = hajimeteBook(1);
  yield* hold([], (function* () {
    knEmote(had ? 'exclaim' : 'light', had);
    snd.se(had ? 'se_emote' : 'se_emote_light', { vol: 0.7 });
    yield 250;
    yield* msg(had ? HJ_OPEN2 : HJ_START2);
  })());
  setFlag(HF.book2, 1);
  snd.se('se_page');
  yield 120;
  snd.se('se_pen_write', { vol: 0.7 });
}

// ================================================================ 1ページ

/** The teacher's lesson, the page written in, then the rewards and the back cover when due. */
function* teach(e: HajimeteEntry): Co {
  const text = e.vol === 1 ? HJ_TALK[e.id] : HJ_TALK2[e.id];
  yield* hold([e.npc!], (function* () {
    knEmote('exclaim', true);
    snd.se('se_emote');
    yield 250;
    yield* msg(text);
  })());
  setFlag(pageFlag(e.id), 1);
  snd.se('se_page', { pitch: 1.05 });
  yield 120;
  snd.se('se_pen_write', { vol: 0.8 });
  const [have, total] = hajimeteCount(e.vol);
  yield* msg(hjCountText(e.vol, have, total));
  // ちず、段階2：打ち水が ぜんぶ 北東へ（らん外）
  if (e.id === 'uchimizu' && ch1() && stage() === 2) yield* uchimizuNe();
  yield* rewards();
  yield* ura();
}

/** らん外：the water all running one way (chapter 1, stage 2, after ちず's page). */
function* uchimizuNe(): Co {
  yield* hold(['npc_mizumaki'], (function* () {
    knEmote('question');
    snd.se('se_emote');
    yield 250;
    yield* msg(HJ_UCHIMIZU_NE);
  })());
  setFlag(pageFlag(NE), 1);
  snd.se('se_pen_write', { pitch: 0.9, vol: 0.7 });
  yield* msg(HJ_BONUS_PAGE);
}

/** ① の 8人 ／ ② の 6人：朱肉 +2（1回ずつ）。 */
function* rewards(): Co {
  if (!flag(HF.reward1) && HAJIMETE_TOWN.every((e) => hajimeteDone(e.id))) {
    setFlag(HF.reward1, 1);
    addMp(2);
    snd.se('se_item');
    yield* msg(HJ_REWARD[1]);
  }
  if (!flag(HF.reward2) && hajimeteBook(2) && HAJIMETE2.every((e) => hajimeteDone(e.id))) {
    setFlag(HF.reward2, 1);
    addMp(2);
    snd.se('se_item');
    yield* msg(HJ_REWARD[2]);
  }
}

// ================================================================ かくし：裏表紙

/**
 * The back cover held up high while the words run (a widget over the field:
 * 2D and HD-2D alike): the navy board, グソっ君's pencil drawing of しゅん,
 * 『はじめての ともだち』 and the empty ★ box.
 */
class UraCard implements Widget {
  modal = false;
  done = false;
  t = 0;
  out = -1;

  update(dt: number): void {
    this.t += dt;
    if (this.out >= 0) {
      this.out += dt;
      if (this.out >= 220) this.done = true;
    }
  }

  close(): void {
    if (this.out < 0) this.out = 0;
  }

  draw(g: Gfx): void {
    const k = Math.min(1, this.t / 260);
    const a = this.out >= 0 ? Math.max(0, 1 - this.out / 220) : ease.quadOut(k);
    if (a <= 0) return;
    const dy = Math.round((1 - ease.backOut(k)) * 10);
    const f = uraFace();
    const w = Math.max(f.width * 2, g.measure('『はじめての ともだち』')) + 28;
    const h = f.height * 2 + 60;
    const x = Math.round(W / 2 - w / 2);
    const y = Math.max(6, Math.round((H - 78) / 2 - h / 2)) + dy;
    g.alpha(a, () => drawUraCard(g, x, y, w, h));
  }
}

/** ① ② ぜんぶ：the back cover, once (chapter 2, グソっ君 here). */
function* ura(): Co {
  if (flag(HF.ura) || !ch2OnDuty() || !kanenariHere() || !hajimeteAll()) return;
  setFlag(HF.ura, 1);
  snd.se('se_page', { pitch: 0.85 });
  yield 200;
  const card = new UraCard();
  game.ui.push(card);
  try {
    yield 300;
    yield* hold([], msg(HJ_URA) as Co);
  } finally {
    card.close();
  }
}

// ================================================================ はじまり：ふしぎの あと

onFushigiAfter((id) => {
  if (!kanenariHere()) return null;
  // 第1章：グソっ君が 仲間に なってから、はじめての ふしぎ
  if (!isCh2Fushigi(id)) return ch1OnDuty() && !hajimeteBook(1) ? startBook1() : null;
  // 第2章：① の 欄が ある 人は ここでも ② が 開く。ぜんぶ うまって いれば 裏表紙
  if (!ch2OnDuty()) return null;
  if (hajimeteBook(1) && !hajimeteBook(2)) return openBook2();
  if (!flag(HF.ura) && hajimeteAll()) return ura();
  return null;
});

// ================================================================ 町の 8人・村の 6人

/** Scripts the placement runs instead of the npc id (ぴょん夫人's tea: evt_ch2_rest_yoriai). */
const ALSO: Record<string, string[]> = { npc_hoshi_yoshie: ['evt_ch2_rest_yoriai'] };

for (const e of HAJIMETE) {
  if (!e.npc) continue;
  for (const id of [e.npc, ...(ALSO[e.npc] ?? [])]) wrap(id, function* (ctx, orig): Co {
    const map = field()?.map.id ?? '';
    yield* orig(ctx);
    if (!kanenariHere() || !stillThere(e.npc!, map)) return;
    if (e.vol === 1) {
      if (!ch1OnDuty() || !onMap(TOWN_MAP[e.id])) return;
      if (hajimeteDone(e.id)) {
        // (ちずの 打ち水を 段階1 に 書いた 人：段階2 で らん外を 1回)
        if (e.id === 'uchimizu' && stage() === 2 && !hajimeteDone(NE)) yield* uchimizuNe();
        return;
      }
      if (!hajimeteBook(1)) yield* startBook1();
      yield* teach(e);
      return;
    }
    if (!ch2OnDuty()) return;
    if (hajimeteDone(e.id)) {
      yield* ura();
      return;
    }
    // ぴょん夫人は いつもの お茶と 漬物の あと（寄り合いの 前は 呼ばない）
    if (e.id === 'tsukemono' && !flag('flag_ch2_yoriai')) return;
    if (!hajimeteBook(2)) yield* openBook2();
    yield* teach(e);
  });
}

// ================================================================ QA

/** Every page: at most 3 lines of at most 336 px; chapter 1 without 「17」「まだ」「平和」「3人」, chapter 2 without clock times etc. */
export function hajimeteTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const walkT = (name: string, v: unknown, ch: 1 | 2) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) return;
      let lines: string[] = [];
      const flush = () => {
        if (!lines.length) return;
        pages++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
        lines = [];
      };
      for (const raw of v.split('\n')) {
        const t = raw.trim();
        if (!t || t.startsWith('>')) continue;
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || /^\[.*\]$/.test(t)) {
          flush();
          continue;
        }
        const plain = raw.replace(/\s+$/, '').replace(/\{[^}]*\}/g, '');
        const w = measure(plain);
        if (w > 336) bad.push(`${name}: ${w}px: ${plain}`);
        if (/(?<!ま)まだ(?!ま)/.test(plain)) bad.push(`${name}: 「まだ」: ${plain}`);
        if (plain.includes('平和')) bad.push(`${name}: 「平和」: ${plain}`);
        if (/さん(?!かど)/.test(plain) && (name.includes('narr') || /^@narr/.test(v))) bad.push(`${name}: 「さん」: ${plain}`);
        if (ch === 1) {
          for (const word of ['17', '3人']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
        } else {
          for (const word of ['12人', '1日2本', '具足様', 'おまけの1つ', 'いただきます']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
          if (/\d+:\d\d/.test(plain) || /\d+時/.test(plain)) bad.push(`${name}: time: ${plain}`);
        }
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x, ch));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x, ch);
  };
  walkT('hajimete', HAJIMETE_TEXTS.ch1, 1);
  walkT('hajimete.ch2', HAJIMETE_TEXTS.ch2, 2);
  // the pages' words too (chapter 1's in ①, chapter 2's in ②)
  for (const e of HAJIMETE) walkT(`page.${e.id}`, `@x\n${e.note}`, e.vol);
  return { pages, bad };
}

if (import.meta.env.DEV) {
  registerDebug('hajimeteText', () => hajimeteTextCheck());

  type Cmd = Record<string, (...a: unknown[]) => unknown>;
  const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

  /** In front of each one (facing them). */
  const AT: Record<string, [string, number, number, string]> = {
    uchimizu: ['map_town', 11, 33, 'up'],
    tofu: ['map_town', 36, 21, 'up'],
    higasa: ['map_town', 17, 25, 'up'],
    shinbun: ['map_madam', 6, 4, 'up'],
    fude: ['map_shodo', 5, 3, 'up'],
    kansouki: ['map_laundry', 4, 5, 'up'],
    keirei: ['map_koban', 4, 5, 'up'],
    atari: ['map_hinoya', 4, 3, 'up'],
  };

  const AT2: Record<string, [string, number, number, string]> = {
    tsukemono: ['map_hoshi_school', 3, 5, 'left'],
    tomatoha: ['map_hoshimidai', 4, 32, 'left'],
    inaho: ['map_hoshimidai', 21, 12, 'up'],
    iro: ['map_hoshimidai', 23, 38, 'up'],
    shikiji: ['map_hoshi_school', 6, 4, 'up'],
    tegami: ['map_hoshimidai', 36, 41, 'up'],
  };

  const reset = () => {
    for (const f of Object.values(HF)) setFlag(f, 0);
    for (const e of HAJIMETE) setFlag(pageFlag(e.id), 0);
  };
  const fill = (vol: 1 | 2, but?: string) => {
    for (const e of HAJIMETE) if (e.vol === vol && e.npc && e.id !== but) setFlag(pageFlag(e.id), 1);
    setFlag(vol === 1 ? HF.reward1 : HF.reward2, but ? 0 : 1);
    if (vol === 1) {
      setFlag('flag_kn_says_item_ramune', 1);
      setFlag('flag_kanenari_flip_map_shingo', 1);
      setFlag(pageFlag(NE), 1);
    }
  };

  registerDebug('hajimete', (step = 'start') => {
    const s = String(step);
    if (s === 'reset') {
      reset();
      return 'hajimete: reset';
    }
    if (s === 'book') {
      reset();
      setFlag(HF.book, 1);
      setFlag(HF.book2, 1);
      fill(1);
      fill(2);
      setFlag('flag_clear', 1);
      setFlag('flag_ojigi_beaten', 1);
      setFlag('flag_kanenari_joined', 1);
      return 'hajimete: ① ② filled — open the menu (みました帳, the last section 『はじめて』)';
    }
    if (HAJIMETE2.some((e) => e.id === s) || s === 'open2' || s === 'ch2new' || s === 'ura') {
      // chapter 2, stage 1 (after the gathering), グソっ君 in the party
      cmd().jump?.('ch2:gen', true);
      reset();
      if (s !== 'ch2new') {
        setFlag(HF.book, 1);
        setFlag('flag_clear', 1);
      }
      if (s !== 'open2' && s !== 'ch2new') setFlag(HF.book2, 1);
      if (s === 'ura') {
        fill(1);
        fill(2, 'tegami');
        setFlag('flag_ojigi_beaten', 1);
      }
      const id = s === 'ura' ? 'tegami' : s === 'open2' || s === 'ch2new' ? 'tomatoha' : s;
      return cmd().warp?.(...AT2[id]);
    }
    // chapter 1: stage 2 with グソっ君
    cmd().jump?.('stage2', true);
    reset();
    if (s === 'stamp') return cmd().warp?.('map_town', 17, 28, 'up');
    if (s === 'start') return cmd().warp?.(...AT.tofu);
    setFlag(HF.book, 1);
    const at = AT[s];
    if (at) return cmd().warp?.(...at);
    return `hajimete: unknown step ${s}`;
  });
}
