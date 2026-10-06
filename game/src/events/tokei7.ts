// チクタク堂の ばらばら時計（げむきか 10/6 の案4。2026-10-06 依頼主の採用・変更あり。02_ch2_index #88、
// 10_narrative 6.22・7.8・7.19、30_level_art 4.10・8.2・10.7、50_ch2_story 8.1）。テキストは
// data/text/tokei7.ts、絵は art/props/tokei7.ts（札・額の 写真）と art/props/ginza.ts（ウィンドウ）、
// ページは ui/menu/book_tokei7.ts。kensui・cape_coffee・rooms_north・kotei・aze・npcs の スクリプトを
// 包むので、events/index.ts で それらの あとに import する。
//
//   はじまり：obj_clock_shop（段階1〜2）の いつもの 文の あと、ウィンドウの 寄り（札の 絵）と 札の 文
//     （flag_tokei7_fuda）。グソっ君が いれば 1回（段階で 文が ちがう）。段階0 に ウィンドウを 見て
//     いれば（flag_tokei7_s0）かくしの 1行。グソっ君が いなくても 始まる（段階1 は ふつう しゅん 1人）。
//   ゆう npc_tokio（段階1〜2、グソっ君が いっしょ）：札を 見たあとの 1回〔hito〕→ flag_tokei7_start
//     （みました帳①の すみの ページ）。6つ そろうと〔nanatsume〕→ 札に『鳩』（flag_tokei7_done）、
//     大事なもの item_tokei7_utsushi、朱肉 +2。
//   札の 持ち主（start の あと、グソっ君が いっしょ、1回ずつ。値は 聞いた 順 1〜6）：
//     きぬ npc_kinu・ゆず npc_yuzu・ピー・コック npc_kazuo（家に いる とき）・ちず npc_mizumaki・
//     ワイスタ巡査 npc_tsurumi（懸垂の はなまるが 先）・かずゆき npc_master（たんかんが 先）。
//     さいごの ひとことは 段階1／段階2。かくし：flag_kotei_done → ピー・コックの 同着、
//     flag_kensui_try → ワイスタ巡査の 0回。6つ目の あと 町の 朝の 地図。
//   寄り道の 1回（案に ない）：くま吉 → きぬ、しんご → ゆず、なんばるわん → ピー・コック。
//   そのあと：ウィンドウの 文の あとに『鳩』、カウンターの 東の はしの 額の 写真 obj_tokei7_photo
//     （(7,3) から 西。寄りの カード、グソっ君が いれば 1回）。
//   第2章：駅ノートの 1月1日の ページ（ch2/ekinote.ts の ekinoteHooks.jan）に グソっ君の 1行。第1章で
//     7つ目まで 終えた データ（flag_tokei7_done が 第1章クリアデータから 持ちこされる、ui/flow.ts）だけ。
//     「第2章から」の 標準の はじまり（resetState）には ない。
//
// QA（開発サーバーだけ）：
//   __game.cmd.tokei7(step)    'window1' 段階1・しゅん 1人で ウィンドウの 前　'window' 段階2・グソっ君と
//                              'yuu' 札を 見たあと、時計店の ゆうの 前（〔hito〕）
//                              'kinu' 'yuzu' 'kazuo' 'chizu' 'tsurumi' 'master' その 人の 前（頼まれた あと）
//                              'nana' 6つ 聞いたあと、ゆうの 前（〔nanatsume〕）　'after' 7つ目の あと、額の 写真の 前
//                              'ekinote' 第2章、7つ目まで 終えた データで 駅ノートの 前　'reset' フラグを もどす
//                              第2引数 1 で 段階1（グソっ君は いっしょの まま）、'0' で 段階0 に 見た ことに
//   __game.cmd.tokei7Text()    ページの 字の 幅（3行・336px）と 禁句（第1章「17」「まだ」「平和」「3人」、第2章は 時刻の 数字など）
//   __game.cmd.tokei7BookText() みました帳の ページ

import '../art/props/tokei7';
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
import { fushigiDone } from '../world/fushigi';
import * as snd from '../world/audio';
import { P } from '../art/tiles/palette';
import { clockShopWindow } from '../art/props/ginza';
import { fudaIcon, tokeiPhotoBig, type FudaKind } from '../art/props/tokei7';
import {
  TOKEI_ASA,
  TOKEI_DOCHAKU,
  TOKEI_EKINOTE,
  TOKEI_FUDA,
  TOKEI_FUDA_KN,
  TOKEI_FUDA_S0,
  TOKEI_FUDA_TEXT,
  TOKEI_HINT,
  TOKEI_HITO,
  TOKEI_KENSUI,
  TOKEI_NANATSUME,
  TOKEI_PAGE_NEW,
  TOKEI_PHOTO,
  TOKEI_PHOTO_KN,
  TOKEI_TALK,
  TOKEI_TEXTS,
  TOKEI_WINDOW_AFTER,
  tokeiCountText,
  type TokeiFuda,
  type TokeiKey,
} from '../data/text/tokei7';
import { addMp, getKeyItem, onMap } from './lib';
import { ekinoteHooks } from './ch2/ekinote';

/** This idea's flags. */
export const TK = {
  /** 段階0 に ウィンドウを 見た（かくしの 1行） */
  s0: 'flag_tokei7_s0',
  /** ウィンドウの 札を 見た（はじまり） */
  fuda: 'flag_tokei7_fuda',
  /** グソっ君の ウィンドウの ひとこと（1回） */
  knFuda: 'flag_tokei7_kn_fuda',
  /** ゆうに 頼まれた（みました帳の すみの ページ） */
  start: 'flag_tokei7_start',
  /** 7つ目（札に『鳩』、写し、朱肉） */
  done: 'flag_tokei7_done',
  /** 額の 写真の グソっ君（1回） */
  photoKn: 'flag_tokei7_photo_kn',
  /** 寄り道の 1回 */
  hintKuma: 'flag_tokei7_hint_kuma',
  hintShingo: 'flag_tokei7_hint_shingo',
  hintMadam: 'flag_tokei7_hint_madam',
  /** 第2章：駅ノートの 1月1日の グソっ君（1回） */
  ekinote: 'flag_tokei7_ekinote',
} as const;

/** The flag of one owner's tag (its value: the order it was heard in, 1–6). */
const heardFlag = (k: TokeiKey): string => `flag_tokei7_${k}`;
const heard = (k: TokeiKey): boolean => flag(heardFlag(k)) > 0;
const heardCount = (): number => TOKEI_FUDA.filter((f) => heard(f.key)).length;

const ITEM = 'item_tokei7_utsushi';

const onDuty = (): boolean => stage() >= 1 && stage() <= 2;

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

/** グソっ君 turns to what is spoken of and shows it. */
function knEmote(kind: 'question' | 'exclaim' | 'light' | 'sweat', dir?: 'up' | 'down' | 'left' | 'right'): void {
  const k = field()?.follower;
  if (!k) return;
  if (dir) k.dir = dir;
  k.showEmote(kind, 800);
}

// ================================================================ the close-up cards (a widget over the field: 2D and HD-2D alike)

/**
 * A small framed card high on the screen while the words run: the window of
 * 7 clocks with their brass tags (3×, the tags as they are), or the framed
 * photo (2×). It rises in and fades out on its own.
 */
class TokeiCard implements Widget {
  modal = false;
  done = false;
  t = 0;
  out = -1;
  /** the 7th tag engraved (the scene of 『鳩』 turns it on) */
  hato: boolean;
  constructor(
    private kind: 'window' | 'photo',
    hato = false,
  ) {
    this.hato = hato;
  }

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
    const k = Math.min(1, this.t / 220);
    const a = this.out >= 0 ? Math.max(0, 1 - this.out / 220) : ease.quadOut(k);
    if (a <= 0) return;
    const dy = Math.round((1 - ease.backOut(k)) * 10);
    g.alpha(a, () => (this.kind === 'window' ? this.drawWindow(g, dy) : this.drawPhoto(g, dy)));
  }

  /** A dark wood frame with a brass line, and its soft shadow. */
  private frame(g: Gfx, x: number, y: number, w: number, h: number): void {
    g.rect(x + 3, y + 4, w, h, '#0B0B14', 0.45);
    g.rect(x, y, w, h, P.woodDark);
    g.rect(x + 1, y + 1, w - 2, 1, P.wood);
    // a thin brass line inside the wood, the dark inside
    g.rect(x + 2, y + 2, w - 4, h - 4, P.brassOld);
    g.rect(x + 2, y + 2, w - 4, 1, P.brass);
    g.rect(x + 3, y + 3, w - 6, h - 6, '#3A2418');
  }

  private drawWindow(g: Gfx, dy: number): void {
    const s = Math.max(0, Math.min(3, stage()));
    const img = clockShopWindow(s, this.hato);
    const sc = 3;
    const iw = img.width * sc;
    const ih = img.height * sc;
    // under the window, its brass tags close up (2×) in a row on the sill, in the order the words read them
    const kinds: FudaKind[] = ['tofu', 'mikan', 'inu', 'jouro', 'tetsubo', 'cup', 'nana'];
    const ts = 2;
    const tw = 12 * ts;
    const gap = 4;
    const rowW = kinds.length * tw + (kinds.length - 1) * gap;
    const inner = Math.max(iw, rowW);
    const w = inner + 14;
    const h = ih + 9 * ts + 22;
    const x = Math.round(W / 2 - w / 2);
    const y = 8 + dy;
    this.frame(g, x, y, w, h);
    // the window
    const ix = Math.round(W / 2 - iw / 2);
    const iy = y + 6;
    g.rect(ix - 1, iy - 1, iw + 2, ih + 2, P.ink);
    g.img(img, ix, iy, { scale: sc });
    // the sill: dark wood, the tags on it, each with its small shadow
    const sy = iy + ih + 3;
    g.rect(x + 4, sy, w - 8, 9 * ts + 7, P.woodDark);
    g.rect(x + 4, sy, w - 8, 1, P.wood);
    const tx0 = Math.round(W / 2 - rowW / 2);
    kinds.forEach((kd, i) => {
      const icon = fudaIcon(kd, this.hato);
      const tx = tx0 + i * (tw + gap);
      g.rect(tx + 2, sy + 5, tw, 9 * ts, '#0B0B14', 0.4);
      g.img(icon, tx, sy + 3, { scale: ts });
    });
  }

  private drawPhoto(g: Gfx, dy: number): void {
    const img = tokeiPhotoBig();
    const sc = 2;
    const iw = img.width * sc;
    const ih = img.height * sc;
    // the mount round the print, the frame round the mount
    const w = iw + 18;
    const h = ih + 18;
    const x = Math.round(W / 2 - w / 2);
    const y = Math.max(6, Math.round((H - 78) / 2 - h / 2)) + dy;
    this.frame(g, x, y, w, h);
    g.rect(x + 4, y + 4, w - 8, h - 8, P.paper);
    g.img(img, x + 9, y + 9, { scale: sc });
  }
}

function* withCard<T>(card: TokeiCard, co: Co<T>): Co<T> {
  game.ui.push(card);
  try {
    return yield* co;
  } finally {
    card.close();
  }
}

// ================================================================ はじまり：ウィンドウ

wrap('obj_clock_shop', function* (ctx, orig): Co {
  const s = stage();
  // stage 0: noted (the hidden line at the start), the usual text
  if (s === 0) setFlag(TK.s0, 1);
  if (s < 1 || s > 2) {
    yield* orig(ctx);
    return;
  }
  // after the 7th: the stage's text, then 『鳩』
  if (flag(TK.done)) {
    yield* orig(ctx);
    yield* msg(TOKEI_WINDOW_AFTER);
    return;
  }
  yield* orig(ctx);
  if (flag(TK.fuda)) return;
  setFlag(TK.fuda, 1);
  if (kanenariHere() && !flag(TK.knFuda)) {
    setFlag(TK.knFuda, 1);
    yield* hold([], (function* () {
      knEmote('question', 'up');
      snd.se('se_emote');
      yield 300;
      yield* msg(s >= 2 ? TOKEI_FUDA_KN.s2 : TOKEI_FUDA_KN.s1);
    })());
  }
  // the window close up, its brass tags, and (seen before 5) the hidden line
  snd.se('se_examine', { pitch: 1.2, vol: 0.7 });
  const text = flag(TK.s0) ? `${TOKEI_FUDA_TEXT}\n/\n${TOKEI_FUDA_S0.replace(/^@narr\n/, '')}` : TOKEI_FUDA_TEXT;
  yield* withCard(new TokeiCard('window'), msg(text));
});

// ================================================================ ゆう〔hito〕〔nanatsume〕

function* hito(): Co {
  setFlag(TK.start, 1);
  yield* hold(['npc_tokio'], (function* () {
    yield* msg(TOKEI_HITO);
  })());
  snd.se('se_page');
  yield 120;
  snd.se('se_pen_write', { vol: 0.7 });
  yield* msg(TOKEI_PAGE_NEW);
}

function* nanatsume(): Co {
  const N = TOKEI_NANATSUME;
  const yu = actor('npc_tokio');
  yield* hold(['npc_tokio'], (function* () {
    yield* msg(N.ask);
    yield* msg(N.goji);
    knEmote('light');
    snd.se('se_emote_light', { vol: 0.7 });
    yield 250;
    yield* msg(N.kn);
    yield* msg(N.kime);
    // she cuts 『鳩』 into the 7th tag: the window close up, the scratch, the tag changes
    const card = new TokeiCard('window');
    yield* withCard(
      card,
      (function* (): Co {
        yield 420;
        for (let i = 0; i < 3; i++) {
          snd.se('se_pen_write', { pitch: 0.62 + i * 0.05, vol: 0.8 });
          yield 260;
        }
        card.hato = true;
        setFlag(TK.done, 1);
        snd.se('se_glint', { vol: 0.4, pitch: 1.2 });
        yield* msg(N.horu);
      })(),
    );
    const k = field()?.follower;
    if (k) {
      k.hop(4, 180);
      k.showEmote('exclaim', 700);
    }
    snd.se('se_emote');
    yield* msg(N.tsukkomi);
    if (yu) yu.lift = 70;
    yield* msg(N.utsushi);
  })());
  snd.se('se_paper_open', { pitch: 1.2, vol: 0.6 });
  yield* getKeyItem(ITEM, N.get);
  addMp(2);
  snd.se('se_item');
  yield* msg(N.reward);
}

wrap('npc_tokio', function* (ctx, orig): Co {
  if (onDuty() && kanenariHere()) {
    if (flag(TK.fuda) && !flag(TK.start)) {
      yield* hito();
      return;
    }
    if (flag(TK.start) && !flag(TK.done) && heardCount() >= 6) {
      yield* nanatsume();
      return;
    }
  }
  yield* orig(ctx);
});

// ================================================================ 札の 持ち主

/** The tag's talk: its words, the hidden lines, the stage's last word, then it goes in the notebook. */
function* askFuda(f: TokeiFuda): Co {
  const t = TOKEI_TALK[f.key];
  yield* hold([f.npc], (function* () {
    yield* msg(t.talk);
    if (f.key === 'kazuo' && flag('flag_kotei_done')) yield* msg(TOKEI_DOCHAKU);
    if (f.key === 'tsurumi' && flag('flag_kensui_try')) yield* msg(TOKEI_KENSUI);
    yield* msg(stage() >= 2 ? t.s2 : t.s1);
    if (t.tail) yield* msg(t.tail);
  })());
  const n = heardCount() + 1;
  setFlag(heardFlag(f.key), n);
  snd.se('se_pen_write', { vol: 0.8 });
  yield* msg(tokeiCountText(n));
  if (n >= 6) {
    snd.se('se_page', { pitch: 1.1 });
    yield 150;
    snd.se('se_pen_write', { pitch: 0.9, vol: 0.7 });
    yield* msg(TOKEI_ASA);
  }
}

/** Where each one can be asked (besides stage 1–2, グソっ君 here, the request made, not yet told). */
const CAN: Record<TokeiKey, () => boolean> = {
  kinu: () => onMap('map_tofu'),
  yuzu: () => onMap('map_shingo'),
  // at home in the armchair (not at the school ground for the race)
  kazuo: () => onMap('map_madam'),
  chizu: () => onMap('map_town'),
  // the はなまる for a try at the bar comes first (kensui.ts)
  tsurumi: () => onMap('map_koban') && !(flag('flag_kensui_try') && !flag('flag_got_hanamaru_kensui')),
  // しんご's たんかん comes first (rooms_north.ts)
  master: () =>
    onMap('map_cafe') &&
    !((flag('flag_tankan_heard') && !flag('flag_got_tankan')) || (!flag('flag_tankan_heard') && flag('flag_seen_tankan_label') && !flag('flag_master_not_yet'))),
};

for (const f of TOKEI_FUDA) {
  wrap(f.npc, function* (ctx, orig): Co {
    if (onDuty() && flag(TK.start) && !heard(f.key) && kanenariHere() && CAN[f.key]()) {
      yield* askFuda(f);
      return;
    }
    yield* orig(ctx);
  });
}

// ---------------------------------------------------------------- 寄り道の 1回（ちがう 人に 聞いたとき）

/** One word, once, from the one people would ask first: the tag's owner is someone else. */
function hint(npc: string, key: TokeiKey, once: string, text: string, ok: () => boolean = () => true): void {
  wrap(npc, function* (ctx, orig): Co {
    if (onDuty() && flag(TK.start) && !heard(key) && !flag(once) && onMap('map_town') && ok()) {
      setFlag(once, 1);
      yield* hold([npc], msg(text) as Co);
      return;
    }
    yield* orig(ctx);
  });
}

// くま吉（店先）→ 奥の きぬ（ふしぎ④の あと）
hint('npc_mamekichi', 'kinu', TK.hintKuma, TOKEI_HINT.kuma, () => fushigiDone('fushigi_04'));
// しんご（縁台）→ 家の ゆず（凍った たんかんを わたす ときは そちらが 先）
hint('npc_ojii', 'yuzu', TK.hintShingo, TOKEI_HINT.shingo, () => !state.inventory.includes('item_tankan'));
// なんばるわん（坂）→ 夫の ピー・コック（二人十五脚の 〔ramune〕が 先）
hint('npc_madam', 'kazuo', TK.hintMadam, TOKEI_HINT.madam, () => !(flag('flag_kotei_kazuo') && !flag('flag_kotei_promise')));

// ================================================================ そのあと：額の 写真

registerScript('obj_tokei7_photo', function* (): Co {
  snd.se('se_examine');
  setFlag('flag_seen_obj_tokei7_photo', 1);
  yield* withCard(
    new TokeiCard('photo'),
    (function* (): Co {
      yield 200;
      yield* msg(TOKEI_PHOTO);
      if (kanenariHere() && !flag(TK.photoKn)) {
        setFlag(TK.photoKn, 1);
        knEmote('exclaim');
        snd.se('se_emote');
        yield* msg(TOKEI_PHOTO_KN);
      }
    })(),
  );
});

// ================================================================ 第2章：駅ノートの 1月1日の ページ

ekinoteHooks.jan = () => {
  // 第1章で 7つ目まで 終えた データだけ（第1章クリアデータから 持ちこされた フラグ）
  if (!flag(TK.done) || flag(TK.ekinote) || !kanenariHere()) return null;
  setFlag(TK.ekinote, 1);
  return TOKEI_EKINOTE;
};

// ================================================================ QA

/** Every page: at most 3 lines of at most 336 px; chapter 1 without 「17」「まだ」「平和」「3人」, chapter 2's line without clock times. */
export function tokeiTextCheck(): { pages: number; bad: string[] } {
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
        if (ch === 1) {
          for (const word of ['17', '3人']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
        } else {
          for (const word of ['12人', '1日2本', '具足様', 'おまけの1つ']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
          if (/\d+:\d\d/.test(plain) || /\d+時/.test(plain)) bad.push(`${name}: time: ${plain}`);
        }
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x, ch));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x, ch);
  };
  walkT('tokei7', TOKEI_TEXTS.ch1, 1);
  walkT('tokei7.ch2', TOKEI_TEXTS.ch2, 2);
  return { pages, bad };
}

if (import.meta.env.DEV) {
  registerDebug('tokei7Text', () => tokeiTextCheck());

  type Cmd = Record<string, (...a: unknown[]) => unknown>;
  const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

  /** The people's places (in front of them, facing them). */
  const AT: Record<TokeiKey, [string, number, number, string]> = {
    kinu: ['map_tofu', 7, 4, 'up'],
    yuzu: ['map_shingo', 6, 5, 'up'],
    kazuo: ['map_madam', 6, 4, 'up'],
    chizu: ['map_town', 11, 33, 'up'],
    tsurumi: ['map_koban', 4, 5, 'up'],
    // across the counter
    master: ['map_cafe', 3, 4, 'up'],
  };

  registerDebug('tokei7', (step = 'window', st?: unknown) => {
    const reset = () => {
      for (const f of Object.values(TK)) setFlag(f, 0);
      for (const f of TOKEI_FUDA) setFlag(heardFlag(f.key), 0);
      state.inventory = state.inventory.filter((id) => id !== ITEM);
    };
    if (step === 'reset') {
      reset();
      return 'tokei7: reset';
    }
    if (step === 'ekinote') {
      cmd().jump?.('ch2:ekinote', true);
      reset();
      setFlag(TK.done, 1);
      setFlag('flag_kanenari_flip_ekinote_jan', 0);
      return 'tokei7: examine the station notebook, turn to 1月1日';
    }
    // chapter 1: stage 1 alone, or stage 2 with グソっ君 (the stage 1 of 'broadcast' keeps him: a QA state)
    if (step === 'window1') {
      cmd().jump?.('alley', true);
      reset();
      if (st === '0') setFlag(TK.s0, 1);
      return cmd().warp?.('map_town', 40, 22, 'up');
    }
    cmd().jump?.(st === 1 || st === '1' ? 'broadcast' : 'stage2', true);
    reset();
    if (st === '0') setFlag(TK.s0, 1);
    if (step === 'window') return cmd().warp?.('map_town', 40, 22, 'up');
    setFlag(TK.fuda, 1);
    setFlag(TK.knFuda, 1);
    if (step === 'yuu') return cmd().warp?.('map_clock', 4, 4, 'up');
    setFlag(TK.start, 1);
    const one = TOKEI_FUDA.find((f) => f.key === step);
    if (one) {
      const [map, x, y, dir] = AT[one.key];
      return cmd().warp?.(map, x, y, dir);
    }
    TOKEI_FUDA.forEach((f, i) => setFlag(heardFlag(f.key), i + 1));
    if (step === 'nana') return cmd().warp?.('map_clock', 4, 4, 'up');
    setFlag(TK.done, 1);
    if (!state.inventory.includes(ITEM)) state.inventory.push(ITEM);
    if (step === 'book') return 'tokei7: all done — open the menu (みました帳 ①, the bottom row of ふしぎ)';
    return cmd().warp?.('map_clock', 7, 3, 'left');
  });
}
