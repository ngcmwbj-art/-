// ハンチングの 値札（げむきか 10/5 の新しい案5。2026-10-05 依頼主の採用・変更あり。02_ch2_index #83、
// 10_narrative 6.8〔chichi〕、50_ch2_story 3.8〔boushi〕・9.9、52_ch2_level_art 4.5）。テキストは
// data/text/hunting.ts。npcs.ts の くりこ、ch2 の ペロ（npcs・wakime・nihyaku が 包んだ あと）の
// スクリプトを 包むので、events/index.ts で ch2 の あとに import する。
//
//   第1章：踏切の くりこ npc_jk（段階1〜2、グソっ君が いっしょ）— その 段階の ふだんの 台詞を
//     2つとも 聞いた あとの 1回〔chichi〕→ flag_hunting_chichi。
//   第2章：ペロの家の 壁の 帽子 obj_hr_kominka_boushi（h0〜h2）— いつもの 文の あと〔fuda〕→
//     flag_hunting_boushi。グソっ君（1回、flag_hunting_kn_tag）「帽子に、値札 ついとるで。」、
//     flag_hunting_chichi が あれば「……踏切の 姉ちゃんの、ハンチングや！」。
//   ペロ（3,32。h1〜h2、グソっ君が いっしょ）：帽子を 見たあとの 1回〔boushi〕（flag_hunting_ask）→
//     壁で ハンチングを はずす（大事なもの item_hunting、flag_hunting_got。値札つきの 壁の 絵は 消え、
//     くぎだけ）→ ペロに 話すと〔kaburu〕：剪定ばさみで 値札の 糸を 切る → 麦わらの 中折れを
//     コンテナの わきに 置いて ハンチングを かぶる（絵が npc_hoshi_mitsu_hunting に、flag_hunting_on）→
//     依頼主の 変更の 3つ → 朱肉 +2。そのあと 壁の 帽子と 手紙の 束の 文が かわる。
//
// QA:
//   __game.cmd.hunting(step)   'chichi' 第1章 段階1・グソっ君つき・踏切の くりこの 前（次の 話が〔chichi〕）
//                              'wall'   第2章 h1・ペロの家の 壁の 前（〔fuda〕）　'ask' ペロの 前（〔boushi〕）
//                              'take'   〔boushi〕の あと、壁の 前　'kaburu' ハンチングを 持って ペロの 前
//                              'after'  かぶった あと、ペロの 前　'reset' フラグを もどす
//   __game.cmd.huntingText()   ページの 字の 幅（3行・336px）と 禁句（第1章は「平和」「まだ」「17」）

import '../art/props/hunting';
import type { Co } from '../engine/co';
import { measure } from '../engine/font';
import { flag, removeItem, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { actor, msg, registerScript, stage } from '../world/api';
import { field } from '../world/field';
import { getScript, type ScriptCtx } from '../world/scripts';
import { pickStage } from '../world/maps';
import * as snd from '../world/audio';
import { R2_OBJ } from '../data/text/hoshi_rooms2';
import {
  HUNTING_BOUSHI,
  HUNTING_BOUSHI_AFTER,
  HUNTING_CHICHI,
  HUNTING_FUDA,
  HUNTING_FUDA_KN,
  HUNTING_GET,
  HUNTING_HINT,
  HUNTING_KABURU,
  HUNTING_TAKE,
  HUNTING_TEGAMI,
  HUNTING_TEXTS,
} from '../data/text/hunting';
import { addMp, getKeyItem } from './lib';

/** This idea's flags. */
export const HF = {
  chichi: 'flag_hunting_chichi',
  boushi: 'flag_hunting_boushi',
  knTag: 'flag_hunting_kn_tag',
  ask: 'flag_hunting_ask',
  hint: 'flag_hunting_hint',
  got: 'flag_hunting_got',
  /** the straw fedora put down by the crates (the prop; set in 〔kaburu〕 as he puts it down) */
  straw: 'flag_hunting_straw',
  /** he wears the cap (the map's sprite entries; set when 〔kaburu〕 is over) */
  on: 'flag_hunting_on',
} as const;

const ITEM = 'item_hunting';

/** Is グソっ君 walking with しゅん and in sight? */
function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower && f.follower.visible && flag('flag_kanenari_joined') > 0 && !flag('flag_follower_hidden');
}

/** The script registered before this file for `id` (or its placement data). */
function wrap(id: string, fn: (ctx: ScriptCtx, orig: (ctx: ScriptCtx) => Co) => Co): void {
  const prev = getScript(id);
  const orig = function* (ctx: ScriptCtx): Co {
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
  };
  registerScript(id, (ctx) => fn(ctx, orig));
}

// ================================================================ 第1章：踏切の くりこ〔chichi〕

wrap('npc_jk', function* (ctx, orig): Co {
  const s = stage();
  // her two lines of this stage heard (the visit count of the stage), グソっ君 beside しゅん
  const heard = flag(`flag_seen_npc_jk_s${s}`) >= 2;
  if (s >= 1 && s <= 2 && heard && kanenariHere() && !flag(HF.chichi)) {
    setFlag(HF.chichi, 1);
    const k = field()?.follower;
    if (k) {
      k.data.scripted = true;
      k.showEmote('question', 800);
    }
    try {
      yield* msg(HUNTING_CHICHI);
    } finally {
      if (k) delete k.data.scripted;
    }
    return;
  }
  yield* orig(ctx);
});

// ================================================================ 第2章：ペロの家の 壁の 帽子

const hStage = (): number => flag('flag_ch2_stage');

registerScript('obj_hr_kominka_boushi', function* (ctx): Co {
  // taken: the wall without it
  if (flag(HF.got) || flag(HF.on)) {
    snd.se('se_examine');
    yield* msg(HUNTING_BOUSHI_AFTER);
    return;
  }
  if (hStage() > 2) {
    yield* ctx.runDefault();
    return;
  }
  // asked to fetch it: off its nail
  if (flag(HF.ask)) {
    snd.se('se_examine');
    yield* msg(HUNTING_TAKE);
    snd.se('se_paper_bag', { pitch: 1.3, vol: 0.6 });
    setFlag(HF.got, 1);
    yield* getKeyItem(ITEM, HUNTING_GET);
    return;
  }
  snd.se('se_examine');
  setFlag('flag_seen_obj_hr_kominka_boushi', 1);
  const own = R2_OBJ.obj_hr_kominka_boushi as string;
  yield* msg(`${own}\n/\n${HUNTING_FUDA.replace(/^@narr\n/, '')}`);
  setFlag(HF.boushi, 1);
  if (kanenariHere() && !flag(HF.knTag)) {
    setFlag(HF.knTag, 1);
    const k = field()?.follower;
    if (k) {
      k.data.scripted = true;
      k.dir = 'up';
      k.showEmote('exclaim', 800);
      snd.se('se_emote');
    }
    try {
      yield 300;
      yield* msg(flag(HF.chichi) ? `${HUNTING_FUDA_KN.tag}\n/\n${HUNTING_FUDA_KN.kuriko.replace(/^@npc_kanenari\n/, '')}` : HUNTING_FUDA_KN.tag);
    } finally {
      if (k) delete k.data.scripted;
    }
  }
});

/** ちゃぶ台の 手紙の 束：かぶった あとは、いつもの 文に 1ページ。 */
registerScript('obj_hr_kominka_tegami', function* (ctx): Co {
  if (!flag(HF.on)) {
    yield* ctx.runDefault();
    return;
  }
  snd.se('se_examine');
  setFlag('flag_seen_obj_hr_kominka_tegami', 1);
  const own = pickStage(R2_OBJ.obj_hr_kominka_tegami as string) ?? '';
  yield* msg(`${own}\n/\n${HUNTING_TEGAMI.replace(/^@narr\n/, '')}`);
});

// ================================================================ 第2章：3号ハウスの 前の ペロ

/** 〔kaburu〕: the thread cut, the straw put down, the flat cap on — then 朱肉 +2. */
function* kaburu(): Co {
  const m = actor('npc_hoshi_mitsu');
  const k = field()?.follower;
  if (m) m.data.scripted = true;
  if (k) k.data.scripted = true;
  try {
    yield* msg(HUNTING_KABURU.give);
    removeItem(ITEM);
    snd.se('se_paper_bag', { pitch: 1.2, vol: 0.6 });
    yield 300;
    yield* msg(HUNTING_KABURU.cut);
    // 「ぷつり」: the pruning shears at his hip, one small snip
    snd.se('se_kotei_snip');
    yield 450;
    yield* msg(HUNTING_KABURU.put);
    // the straw fedora by the crates, the flat cap on (the map's own entries take over when it is over)
    setFlag(HF.straw, 1);
    if (m) {
      m.setSprite('npc_hoshi_mitsu_hunting');
      m.lift = 90;
    }
    snd.se('se_hug', { pitch: 1.3, vol: 0.5 });
    yield 500;
    if (k) {
      k.hop(3, 180);
      k.showEmote('light', 900);
    }
    snd.se('se_emote_light', { vol: 0.7 });
    yield* msg(HUNTING_KABURU.talk);
    yield* msg(HUNTING_KABURU.client);
    addMp(2);
    snd.se('se_item');
    yield* msg(HUNTING_KABURU.reward);
  } finally {
    setFlag(HF.straw, 1);
    setFlag(HF.on, 1);
    if (m) delete m.data.scripted;
    if (k) delete k.data.scripted;
  }
}

wrap('npc_hoshi_mitsu', function* (ctx, orig): Co {
  const s = hStage();
  const here = kanenariHere();
  if (s >= 1 && s <= 2 && here) {
    // the cap from the wall in hand
    if (flag(HF.got) && !flag(HF.on) && state.inventory.includes(ITEM)) {
      yield* kaburu();
      return;
    }
    if (flag(HF.boushi) && !flag(HF.ask)) {
      setFlag(HF.ask, 1);
      yield* msg(HUNTING_BOUSHI);
      return;
    }
    if (flag(HF.ask) && !flag(HF.got) && !flag(HF.hint)) {
      setFlag(HF.hint, 1);
      yield* msg(HUNTING_HINT);
      return;
    }
  }
  yield* orig(ctx);
});

// ================================================================ QA

/** Every page: at most 3 lines, each at most 336 px; chapter 1's 〔chichi〕 without 「平和」「まだ」「17」. */
export function huntingTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const walkT = (name: string, v: unknown) => {
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
        if (name === 'hunting.chichi') {
          for (const word of ['平和', '17', '3人']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
          if (/(?<!ま)まだ/.test(plain)) bad.push(`${name}: 「まだ」: ${plain}`);
        } else {
          // chapter 2: no clock times, no 「まだ」「12人」「1日2本」「具足様」
          for (const word of ['12人', '1日2本', '具足様', 'おまけの1つ']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
          if (/\d+:\d\d/.test(plain) || /\d+時/.test(plain)) bad.push(`${name}: time: ${plain}`);
          if (/(?<!ま)まだ/.test(plain)) bad.push(`${name}: 「まだ」: ${plain}`);
        }
        // no 「さん」 after a name in the narration
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('hunting', HUNTING_TEXTS);
  return { pages, bad };
}
registerDebug('huntingText', () => huntingTextCheck());

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

registerDebug('hunting', (step = 'ask') => {
  if (step === 'reset') {
    for (const f of Object.values(HF)) setFlag(f, 0);
    removeItem(ITEM);
    return 'hunting: reset';
  }
  if (step === 'chichi') {
    // chapter 1, stage 1 with グソっ君; her two lines of the stage heard
    cmd().jump?.('broadcast', true);
    setFlag('flag_seen_npc_jk_s1', 2);
    setFlag('flag_seen_npc_jk_s1_1', 1);
    setFlag('flag_seen_npc_jk_s1_2', 1);
    setFlag(HF.chichi, 0);
    return cmd().warp?.('map_town', 56, 23, 'right');
  }
  // chapter 2, stage 1 (the lantern lit, グソっ君 with しゅん)
  cmd().jump?.('ch2:gen', true);
  if (step === 'wall') {
    setFlag(HF.boushi, 0);
    setFlag(HF.knTag, 0);
    return cmd().warp?.('map_hoshi_kominka', 10, 2, 'up');
  }
  setFlag(HF.boushi, 1);
  setFlag(HF.knTag, 1);
  if (step === 'ask') return cmd().warp?.('map_hoshimidai', 4, 32, 'left');
  setFlag(HF.ask, 1);
  setFlag(HF.hint, 1);
  if (step === 'take') return cmd().warp?.('map_hoshi_kominka', 10, 2, 'up');
  setFlag(HF.got, 1);
  if (!state.inventory.includes(ITEM)) state.inventory.push(ITEM);
  if (step === 'kaburu') return cmd().warp?.('map_hoshimidai', 4, 32, 'left');
  setFlag(HF.straw, 1);
  setFlag(HF.on, 1);
  removeItem(ITEM);
  return cmd().warp?.('map_hoshimidai', 4, 32, 'left');
});
