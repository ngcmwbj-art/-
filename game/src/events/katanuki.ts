// 型ぬき 番付（げむきか 10/13 の案3。2026-10-13 依頼主の採用、厳選の 直しあり。01_ch1_index の 変更の 記録）。
// 文は data/text/katanuki.ts、型ぬきの 画面と 番付の 寄りは ui/katanuki_game.ts、壁の 番付は
// art/props/katanuki.ts、ページは ui/menu/book_katanuki.ts。cape_coffee（クラス写真）・shops（おばあ）・
// npcs・hokokusho・tokei7・kotei（さや・ひより・ちず・なんばるわん・ピー・コック・コタロウ・テーブル）の
// スクリプトを 包むので、events/index.ts で それらの あと（ch3 の 前）に import する。
//
//   はじまり：ひのやの 奥の 壁（obj_class_photo の 場所、クラス写真の 下）。段階2・グソっ君が いれば 1回
//     〔intro〕（flag_katanuki_seen）→ ひのやの 品書きに『型ぬき』10円（ui/shop.ts）。それ 以外は
//     「写真を 見る｜番付を 見る」。番付は 寄りの カードと 地の文（段階0〜1 は レジの 横の 箱の 1行も）。
//   型ぬき：おばあの 店で『型ぬき』を 買うと、店を 出た その場で 1枚（大写し）。どの 型かは ぬけた 型と
//     つぎの 型から えらぶ。割れたら グソっ君が 食べる。ぬけると 赤ペンの しるし（はなまる・まる・ちょん、
//     型ごとに いちばん いい ものが 残る）。いかりが はじめて ぬけたら 番付の 書きかえ。
//   コツ（段階2・グソっ君・はじまりの あと、1人1回。ピー・コックは なんばるわんの あと。先に 行くと 1回
//     「妻に 聞くと いい」）。値は 聞いた 順 1〜5。
//   そのあと：なんばるわん（1回、その つぎに もう1回）、ピー・コック（1回「しーっ」）、コタロウ（ピー・コックの
//     わけの あと 1回）、なんばるわんの家の テーブル（缶の 中の ひょうたん）。4つとも はなまるで『名人』。
//
// QA（開発サーバーだけ）：
//   __game.cmd.katanuki(step)   'wall'  段階2・グソっ君と、ひのやの 写真の 前（はじまり）
//                               'shop'  はじまりの あと、おばあの 前（型ぬきを 買う）
//                               'sae' 'hiyori' 'chizu' 'madam' 'kazuo'  その 人の 前（はじまりの あと）
//                               'ikari' ちょうちょまで ぬけて コツ 5つ、おばあの 前（いかり → 書きかえ）
//                               'after' 書きかえ（大関）の あと、なんばるわんの家の テーブルの 前
//                               'go'    その場で 1枚（店を 出た あとと 同じ 流れ）
//                               'kakikae' いかりが ぬけた ところから（'ikari' の あと。'none' で 独学）
//                               'play'  その場で 型ぬきの 画面だけ（第2引数 型、第3引数 'all' で コツ 5つ）
//                               'reset' フラグを もどす　'flags' flag_katanuki_* の 値
//   __game.cmd.katanukiBot(on)  型ぬきの 画面を 自動で 押す（通しの 確かめ用）
//   __game.cmd.katanukiText()   台詞の 3行・336px と 禁句（「17」「まだ」「平和」「3人」）

import '../art/props/katanuki';
import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { measure } from '../engine/font';
import { touchControlsOn } from '../engine/touch';
import { flag, hasItem, removeItem, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { actor, msg, registerScript, stage } from '../world/api';
import { ask } from '../ui/dialog';
import { field } from '../world/field';
import { getScript, type ScriptCtx } from '../world/scripts';
import * as snd from '../world/audio';
import { BanzukeCard, KatanukiGame, type BanzukeState, type KataGrade } from '../ui/katanuki_game';
import {
  AFTER_KAZUO,
  AFTER_KOTARO,
  AFTER_MADAM,
  AFTER_TABLE,
  AFTER_TABLE_KN,
  IKARI_COUNT,
  KAKIKAE,
  KATA_ASK,
  KATA_CLEAR,
  KATA_FIRST,
  KATA_MARK,
  KATA_MEIJIN,
  KATA_NAME,
  KATA_ORDER,
  KATA_TOKE,
  KATA_UI,
  KATA_WARE,
  KATA_YAME,
  KATANUKI_BOOK,
  KATANUKI_INTRO,
  KATANUKI_TEXTS,
  KATANUKI_WALL,
  KATANUKI_WALL_AFTER,
  KATANUKI_WALL_ASK,
  KATANUKI_WALL_S01,
  BANZUKE_CARD,
  BANZUKE_ROWS,
  TIP_GOT,
  TIP_KAZUO_EARLY,
  TIP_NPC,
  TIP_ORDER,
  TIP_TALK,
  kataNuketa,
  type KataKey,
  type TipKey,
} from '../data/text/katanuki';
import { addMp, onMap } from './lib';
import { keyGuide } from './stage';

/** This idea's flags. */
export const KN = {
  /** 番付を グソっ君と 見た（はじまり。品書きに 型ぬき） */
  seen: 'flag_katanuki_seen',
  /** 書きかえ：1 横綱・2 大関 */
  rank: 'flag_katanuki_rank',
  /** 割った（とけた）数 */
  wari: 'flag_katanuki_wari',
  /** コツなしで いかりまで */
  dokugaku: 'flag_katanuki_dokugaku',
  /** 4つとも はなまる */
  meijin: 'flag_katanuki_meijin',
  madam1: 'flag_katanuki_madam1',
  madam2: 'flag_katanuki_madam2',
  kazuoAfter: 'flag_katanuki_kazuo_after',
  kazuoEarly: 'flag_katanuki_kazuo_early',
  kotaro: 'flag_katanuki_kotaro',
  tableKn: 'flag_katanuki_table_kn',
  wariKn: 'flag_katanuki_wari_kn',
} as const;

export const KATA_ITEM = 'item_katanuki';

/** The best red-pen mark of a shape (3 はなまる, 2 まる, 1 ちょん, 0 not yet). */
export const gradeFlag = (k: KataKey): string => `flag_katanuki_${k}`;
/** How many times a shape came out whole. */
export const countFlag = (k: KataKey): string => `flag_katanuki_n_${k}`;
const firstFlag = (k: KataKey): string => `flag_katanuki_first_${k}`;
/** A tip heard (its value: the order, 1–5). */
export const tipFlag = (k: TipKey): string => `flag_katanuki_tip_${k}`;
const tip = (k: TipKey): boolean => flag(tipFlag(k)) > 0;
const tipCount = (): number => TIP_ORDER.filter(tip).length;

const GRADE_N: Record<KataGrade, number> = { hanamaru: 3, maru: 2, chon: 1 };

/** Chapter 3 under way (ch3/common inCh3: its 夕鳴町 is not chapter 1's). */
const inCh3 = (): boolean => flag('flag_ch3_started') > 0 && !flag('flag_ch3_clear');
/** Chapter 1's stage 2 (not the 夕鳴町 of chapter 3). */
const onDuty = (): boolean => stage() === 2 && !inCh3();
const ch1 = (): boolean => !inCh3() && stage() <= 2;

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

function knEmote(kind: 'question' | 'exclaim' | 'light' | 'sweat', dir?: 'up' | 'down' | 'left' | 'right'): void {
  const k = field()?.follower;
  if (!k) return;
  if (dir) k.dir = dir;
  k.showEmote(kind, 800);
}

function banzukeState(): BanzukeState {
  const r = flag(KN.rank);
  return r === 1 ? 'yokozuna' : r === 2 ? 'ozeki' : 'before';
}

function cardOpts(): ConstructorParameters<typeof BanzukeCard>[0] {
  return { state: banzukeState(), dokugaku: flag(KN.dokugaku) > 0, meijin: flag(KN.meijin) > 0, wari: flag(KN.wari) };
}

function* withCard<T>(card: BanzukeCard, co: Co<T>): Co<T> {
  game.ui.push(card);
  try {
    return yield* co;
  } finally {
    card.close();
  }
}

// ================================================================ はじまり：奥の 壁（クラス写真の 下）

function* intro(): Co {
  setFlag(KN.seen, 1);
  yield* hold([], (function* (): Co {
    knEmote('question', 'up');
    snd.se('se_emote');
    yield 300;
    snd.se('se_examine', { pitch: 1.15, vol: 0.7 });
    yield* withCard(new BanzukeCard(cardOpts()), msg(KATANUKI_INTRO) as Co);
  })());
}

/** 番付を 見る（書きかえの 前／あと）。 */
function* viewWall(): Co {
  snd.se('se_examine', { pitch: 1.15, vol: 0.7 });
  setFlag('flag_seen_obj_katanuki_banzuke', 1);
  const r = flag(KN.rank);
  yield* withCard(
    new BanzukeCard(cardOpts()),
    (function* (): Co {
      if (!r) {
        yield* msg(KATANUKI_WALL);
        if (stage() < 2) yield* msg(KATANUKI_WALL_S01);
        return;
      }
      yield* msg(r === 1 ? KATANUKI_WALL_AFTER.yokozuna : KATANUKI_WALL_AFTER.ozeki);
      if (flag(KN.meijin)) yield* msg(KATANUKI_WALL_AFTER.meijin);
      if (flag(KN.dokugaku)) yield* msg(KATANUKI_WALL_AFTER.dokugaku);
      if (flag(KN.wari) > 0) {
        yield* msg(KATANUKI_WALL_AFTER.wari);
        if (kanenariHere() && !flag(KN.wariKn)) {
          setFlag(KN.wariKn, 1);
          knEmote('sweat');
          yield* msg(KATANUKI_WALL_AFTER.wariKn);
        }
      }
    })(),
  );
}

wrap('obj_class_photo', function* (ctx, orig): Co {
  if (!ch1() || !onMap('map_hinoya')) {
    yield* orig(ctx);
    return;
  }
  if (onDuty() && kanenariHere() && !flag(KN.seen)) {
    yield* intro();
    return;
  }
  const r = yield* msg(KATANUKI_WALL_ASK);
  if (r === 0) yield* orig(ctx);
  else if (r === 1) yield* viewWall();
});

// ================================================================ 型ぬき（おばあの 店で 買った あと）

/** The shapes that can be cut: ひょうたん, and each one after the one before has come out. */
function unlocked(): KataKey[] {
  const out: KataKey[] = [];
  for (const k of KATA_ORDER) {
    out.push(k);
    if (!flag(gradeFlag(k))) break;
  }
  return out;
}

function okKey(): string {
  return touchControlsOn() ? 'けってい' : 'Z';
}
function cancelKey(): string {
  return touchControlsOn() ? 'もどる' : 'X';
}

/** One board: which shape, the close-up, and what comes of it. */
function* playKata(): Co {
  const can = unlocked();
  let k: KataKey = can[can.length - 1];
  if (can.length > 1) {
    // the cursor on the newest one
    const r = yield* ask(KATA_ASK.replace(/^@narr\n/, ''), can.map((c) => KATA_NAME[c]), { index: can.length - 1 });
    k = can[Math.max(0, Math.min(can.length - 1, r))];
  }
  removeItem(KATA_ITEM);
  if (!flag(firstFlag(k))) {
    setFlag(firstFlag(k), 1);
    if (kanenariHere()) yield* msg(KATA_FIRST[k]);
  }
  const tips = new Set<TipKey>(TIP_ORDER.filter(tip));
  keyGuide([[[okKey()], KATA_UI.key], [[cancelKey()], KATA_UI.stop]], 5000, 8);
  const gm = game.ui.push(new KatanukiGame(k, { tips, ne: stage() === 2 }));
  yield () => gm.done;
  if (gm.result === 'clear') {
    yield* cleared(k, gm.grade, tips.size);
    return;
  }
  if (gm.result === 'yame') {
    yield* msg(KATA_YAME);
    return;
  }
  const n = flag(KN.wari);
  setFlag(KN.wari, n + 1);
  if (gm.result === 'toke') yield* msg(KATA_TOKE);
  else yield* msg(KATA_WARE[n % KATA_WARE.length]);
}

function* cleared(k: KataKey, grade: KataGrade, tips: number): Co {
  const first = !flag(gradeFlag(k));
  setFlag(gradeFlag(k), Math.max(flag(gradeFlag(k)), GRADE_N[grade]));
  setFlag(countFlag(k), flag(countFlag(k)) + 1);
  snd.se('se_item', { vol: 0.6 });
  if (k === 'ikari' && !flag(KN.rank)) {
    yield* kakikae(grade, tips === 0);
  } else {
    yield* msg(kataNuketa(KATA_NAME[k]));
    yield* msg(KATA_MARK[grade]);
    if (first && k !== 'ikari') yield* msg(KATA_CLEAR[k]);
  }
  // 4つとも はなまる：『名人』
  if (!flag(KN.meijin) && KATA_ORDER.every((x) => flag(gradeFlag(x)) >= 3)) {
    setFlag(KN.meijin, 1);
    snd.se('se_hanamaru', { vol: 0.6 });
    addMp(1);
    yield* msg(KATA_MEIJIN);
  }
}

/** いかりが はじめて ぬけた：番付の 書きかえ（おばあの 出番は ここだけ）。 */
function* kakikae(grade: KataGrade, dokugaku: boolean): Co {
  const ob = actor('npc_obaa');
  yield* hold(['npc_obaa'], (function* (): Co {
    yield* msg(KAKIKAE.nuketa);
    if (ob) {
      ob.pose = null;
      ob.lift = 90;
    }
    snd.se('se_hanamaru_draw', { vol: 0.7 });
    yield* msg(KATA_MARK[grade]);
    yield* msg(KAKIKAE.yoku);
    if (dokugaku) {
      setFlag(KN.dokugaku, 1);
      yield* msg(KAKIKAE.dokugaku);
    }
    const r = yield* msg(KAKIKAE.ask);
    const rank = r === 0 ? 1 : 2;
    // she writes the new slip in: the card, the pen
    const card = new BanzukeCard({ ...cardOpts(), state: rank === 1 ? 'yokozuna' : 'ozeki', write: 0 });
    yield* withCard(
      card,
      (function* (): Co {
        yield 380;
        for (let i = 0; i <= 12; i++) {
          card.o.write = i / 12;
          if (i % 3 === 0) snd.se('se_pen_write', { pitch: 0.75 + i * 0.02, vol: 0.8 });
          yield 70;
        }
        setFlag(KN.rank, rank);
        snd.se('se_glint', { vol: 0.4, pitch: 1.2 });
        yield* msg(KAKIKAE.kaku);
      })(),
    );
    const k = field()?.follower;
    if (k) {
      k.hop(4, 180);
      k.showEmote('exclaim', 700);
    }
  })());
  snd.se('se_page');
  yield 120;
  snd.se('se_pen_write', { vol: 0.7 });
  yield* msg(KAKIKAE.page);
  addMp(2);
  snd.se('se_item');
  yield* msg(KAKIKAE.reward);
}

wrap('npc_obaa', function* (ctx, orig): Co {
  yield* orig(ctx);
  if (onDuty() && onMap('map_hinoya') && flag(KN.seen) && hasItem(KATA_ITEM)) yield* playKata();
});

// ================================================================ 番付の コツ

function* tell(k: TipKey): Co {
  yield* hold([TIP_NPC[k]], msg(TIP_TALK[k]) as Co);
  setFlag(tipFlag(k), tipCount() + 1);
  snd.se('se_pen_write', { vol: 0.8 });
  yield* msg(TIP_GOT[k]);
}

const TIP_WHERE: Record<TipKey, () => boolean> = {
  sae: () => onMap('map_town'),
  hiyori: () => onMap('map_town'),
  chizu: () => onMap('map_town'),
  madam: () => onMap('map_town'),
  // at home in the armchair, after his wife's
  kazuo: () => onMap('map_madam') && tip('madam'),
};

for (const k of TIP_ORDER) {
  wrap(TIP_NPC[k], function* (ctx, orig): Co {
    if (onDuty() && flag(KN.seen) && kanenariHere()) {
      if (!tip(k) && TIP_WHERE[k]()) {
        yield* tell(k);
        return;
      }
      // ピー・コック before his wife: once, 「妻に 聞くと いい」
      if (k === 'kazuo' && onMap('map_madam') && !tip('madam') && !flag(KN.kazuoEarly)) {
        setFlag(KN.kazuoEarly, 1);
        yield* hold([TIP_NPC.kazuo], msg(TIP_KAZUO_EARLY) as Co);
        return;
      }
      // after the rewrite
      const r = flag(KN.rank);
      if (r && k === 'madam' && onMap('map_town')) {
        if (!flag(KN.madam1)) {
          setFlag(KN.madam1, 1);
          yield* hold([TIP_NPC.madam], msg(r === 1 ? AFTER_MADAM.yokozuna : AFTER_MADAM.ozeki) as Co);
          return;
        }
        if (!flag(KN.madam2)) {
          setFlag(KN.madam2, 1);
          yield* orig(ctx);
          yield* msg(AFTER_MADAM.again);
          return;
        }
      }
      if (r && k === 'kazuo' && onMap('map_madam') && !flag(KN.kazuoAfter)) {
        setFlag(KN.kazuoAfter, 1);
        yield* hold([TIP_NPC.kazuo], (function* (): Co {
          yield* msg(r === 1 ? AFTER_KAZUO.yokozuna : AFTER_KAZUO.ozeki);
          knEmote('light');
          yield* msg(AFTER_KAZUO.tail);
        })());
        return;
      }
    }
    yield* orig(ctx);
  });
}

// コタロウ：ピー・コックの わけを 聞いた あと（1回）
wrap('npc_kotaro', function* (ctx, orig): Co {
  if (onDuty() && tip('kazuo') && kanenariHere() && !flag(KN.kotaro) && onMap('map_town')) {
    setFlag(KN.kotaro, 1);
    yield* hold(['npc_kotaro'], msg(AFTER_KOTARO) as Co);
    return;
  }
  yield* orig(ctx);
});

// なんばるわんの家の テーブル：書きかえの あと、クッキーの 缶の 中
wrap('obj_md_table', function* (ctx, orig): Co {
  if (!ch1() || !flag(KN.rank)) {
    yield* orig(ctx);
    return;
  }
  snd.se('se_examine');
  yield* msg(AFTER_TABLE);
  if (kanenariHere() && !flag(KN.tableKn)) {
    setFlag(KN.tableKn, 1);
    knEmote('sweat');
    yield* msg(AFTER_TABLE_KN);
  }
});

// ================================================================ QA

/** Every page: at most 3 lines of at most 336 px; without 「17」「まだ」「平和」「3人」, and no 「さん」 after a name in the narration. */
export function katanukiTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const walk = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) {
        // one-liners shown in the close-up's strip: their width
        const w = measure(v);
        if (w > 180) bad.push(`${name}: ${w}px: ${v}`);
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
        for (const word of ['17', '3人', '平和']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
        if ((speaker === '@narr' || speaker === '@sys') && /(ん|や|ず|り|わん|ク)さん/.test(plain)) bad.push(`${name}: 「さん」: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walk(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(`${name}.${k}`, x);
  };
  walk('katanuki', KATANUKI_TEXTS);
  walk('katanuki.ikari', IKARI_COUNT);
  // the card's and the page's words fit their places (16px glyphs)
  for (const b of BANZUKE_ROWS) if (measure(b.name) > 112) bad.push(`banzuke: ${b.name}`);
  if (measure(BANZUKE_CARD.title) > 190) bad.push(`banzuke title: ${measure(BANZUKE_CARD.title)}px`);
  for (const [k, v] of Object.entries(KATANUKI_BOOK)) if (measure(v) > 150) bad.push(`book.${k}: ${measure(v)}px`);
  for (const k of KATA_ORDER) if (measure(KATA_NAME[k]) > 82) bad.push(`kata name ${k}`);
  return { pages, bad };
}

if (import.meta.env.DEV) {
  registerDebug('katanukiText', () => katanukiTextCheck());
  registerDebug('katanukiState', () => KatanukiGame.last?.qa() ?? null);
  registerDebug('katanukiBot', (on: unknown = true) => {
    KatanukiGame.bot = !!on;
    return `katanuki bot: ${KatanukiGame.bot}`;
  });

  type Cmd = Record<string, (...a: unknown[]) => unknown>;
  const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

  const AT: Record<TipKey, [string, number, number, string]> = {
    sae: ['map_town', 13, 11, 'right'],
    hiyori: ['map_town', 21, 9, 'right'],
    chizu: ['map_town', 11, 33, 'up'],
    madam: ['map_town', 17, 25, 'up'],
    kazuo: ['map_madam', 6, 4, 'up'],
  };

  const reset = () => {
    for (const f of Object.values(KN)) setFlag(f, 0);
    for (const k of KATA_ORDER) {
      setFlag(gradeFlag(k), 0);
      setFlag(countFlag(k), 0);
      setFlag(firstFlag(k), 0);
    }
    for (const k of TIP_ORDER) setFlag(tipFlag(k), 0);
    state.inventory = state.inventory.filter((id) => id !== KATA_ITEM);
  };

  registerDebug('katanuki', (step = 'wall', a2?: unknown, a3?: unknown) => {
    if (step === 'reset') {
      reset();
      return 'katanuki: reset';
    }
    if (step === 'flags') {
      const out: Record<string, number> = {};
      for (const [k, v] of Object.entries(state.flags)) if (k.startsWith('flag_katanuki')) out[k] = v as number;
      return out;
    }
    // the board bought, right where しゅん stands (おばあの 店を 出た ところと 同じ)
    if (step === 'go') {
      if (!hasItem(KATA_ITEM)) state.inventory.push(KATA_ITEM);
      game.scripts.run(playKata());
      return 'katanuki: go';
    }
    // いかりが ぬけた ところから（書きかえの 場面だけ。第2引数 'none' で コツなし＝独学）
    if (step === 'kakikae') {
      game.scripts.run(cleared('ikari', 'hanamaru', a2 === 'none' ? 0 : tipCount()));
      return 'katanuki: kakikae';
    }
    if (step === 'play') {
      const k = (KATA_ORDER.includes(a2 as KataKey) ? a2 : 'hyoutan') as KataKey;
      const tips = new Set<TipKey>(a3 === 'all' ? TIP_ORDER : []);
      game.ui.push(new KatanukiGame(k, { tips, ne: true }));
      return `katanuki: ${k}`;
    }
    cmd().jump?.('stage2', true);
    reset();
    if (step === 'wall') return cmd().warp?.('map_hinoya', 2, 4, 'up');
    setFlag(KN.seen, 1);
    // (a board already bought: talk to her, leave the shop, and it starts)
    const board = () => {
      if (!hasItem(KATA_ITEM)) state.inventory.push(KATA_ITEM);
    };
    if (step === 'shop') {
      if (a2 === 'board') board();
      return cmd().warp?.('map_hinoya', 4, 4, 'up');
    }
    const one = TIP_ORDER.find((k) => k === step);
    if (one) {
      if (one === 'kazuo') setFlag(tipFlag('madam'), 1);
      const [map, x, y, dir] = AT[one];
      return cmd().warp?.(map, x, y, dir);
    }
    for (const k of ['hyoutan', 'kasa', 'chou'] as KataKey[]) {
      setFlag(gradeFlag(k), 2);
      setFlag(firstFlag(k), 1);
    }
    if (a2 !== 'none' && a3 !== 'none') TIP_ORDER.forEach((k, i) => setFlag(tipFlag(k), i + 1));
    if (step === 'ikari') {
      board();
      return cmd().warp?.('map_hinoya', 4, 4, 'up');
    }
    setFlag(gradeFlag('ikari'), 3);
    setFlag(KN.rank, 2);
    setFlag(KN.wari, 3);
    if (step === 'book') return 'katanuki: done — open the menu (みました帳 ①, the bottom row of ふしぎ)';
    return cmd().warp?.('map_madam', 3, 5, 'up');
  });
}
