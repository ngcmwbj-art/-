// 日じゃ なくて、風（第3章の クリア前、段階2。げむきか 10-31 の 案3、2026-10-31 依頼主の 採用。03_ch3_index）。
// 文は data/text/c3_kaze.ts、絵は art/props/kaze_art.ts、みました帳の ページは ui/menu/book_kaze.ts。
//
//   段階2（12:01）、S13 の あと（flag_ch3_got_gochisou）から S14 の トラックの 前まで（flag_ch3_truck_trap）。
//   ・段階1 の 前ぶれ：干し台 obj_c3_himono_dai を 調べた あと 1回（地の文「風が、ない」・グソっ君。flag_kz_mae）。
//   ・干物屋の ホシオ (17,14)・ホシミ (19,14)：いつもの〔c2〕の あと、もう 1回 話すと〔kaze〕（flag_kz_start）。
//     ホシミの 頭の 上に「！」。大事な もの『干し網』。
//   ・干物屋の 路地に かぎ 3つ（段階2 だけ。段階1 は ホシスギの シンボルが 歩く 所）：
//     ① 路地の 日なた (21,12)、② 路地の 奥の 日かげ (23,11)、③ 路地の 出口の 角 (23,16)。
//     調べると 干し網を つるす（網は 1つ：つるした 所へ 移る。flag_kz_at = 1..3、flag_kz_s_0..2）。
//     ①② では ゆれない。両方 すませて ③が まだなら、グソっ君「あっちの 洗濯物、ゆれとるで」（1回）。
//     ③ では 港からの 風で ゆれる → 3 風で 干す（flag_kz_kaze）→ ホシミ「ちょっと、店に 来て」（ホシミに「！」）。
//   ・角の 物干し (25,16)：段階1 は 止まったまま、段階2 は 手ぬぐい・洗濯ばさみが ゆれる。港通りに 風の すじ（段階2）。
//   ・店先で 2人に 話す → さわって みて（600ms の 間）→ みやげ『アジの開き』、朱肉 +2、帳面③の すみ（flag_kz_done）。
//   ・かくし：段階1 の 前ぶれを 見ている → 1 の あと グソっ君と ホシミ（flag_kz_mita）。ホシスギを 2組とも ハンコ →
//     3 の あと ホシオ（flag_kz_hoshisugi）。来た マサル → 3 の あと 港通りで 1行（flag_kz_masaru）。
//
// QA：__game.cmd.kaze(step)、kzState()、kzText()

import type { Co } from '../../engine/co';
import { measure } from '../../engine/font';
import { addItem, flag, removeItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { fxAt, registerWorldFx } from '../../world/fx';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field } from '../../world/field';
import { SPEAKERS } from '../../world/msg';
import { pgOn } from '../../world/postgame';
import { actorAnchor, addMarkSource } from '../../world/marks';
import type { MapObj } from '../../world/types';
import * as T from '../../data/text/c3_kaze';
import { fillNames } from '../../data/text/c3_names';
import { addMp } from '../lib';
import { se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, kitaComeIn, kitaGoOut, say3 } from './common';
import '../../art/props/kaze_art';

export const KZF = {
  mae: 'flag_kz_mae',
  pre: 'flag_kz_pre',
  start: 'flag_kz_start',
  at: 'flag_kz_at',
  s0: 'flag_kz_s_0',
  s1: 'flag_kz_s_1',
  s2: 'flag_kz_s_2',
  acchi: 'flag_kz_acchi',
  kaze: 'flag_kz_kaze',
  done: 'flag_kz_done',
  mita: 'flag_kz_mita',
  hoshisugi: 'flag_kz_hoshisugi',
  masaru: 'flag_kz_masaru',
} as const;

export const KZ_AMI = 'item_kz_ami';
export const KZ_HIRAKI = 'item_kz_hiraki';
const UMIZOI = 'map_umizoi';
const OTTO = 'npc_c3_himono_otto';
const TSUMA = 'npc_c3_himono_tsuma';
const MASARU = 'npc_hoshi_gen';
const S_F = [KZF.s0, KZF.s1, KZF.s2];
/** かぎ：① 路地の 日なた、② 路地の 奥の 日かげ、③ 路地の 出口の 角（港通りに 面する）。 */
export const KZ_KAGI: [number, number][] = [
  [21, 12],
  [23, 11],
  [23, 16],
];
/** 角の 物干し（電柱 (24,16) の 東）。 */
const SENTAKU: [number, number] = [25, 16];

function knWith(): boolean {
  const f = field();
  if (!f?.follower?.visible || flag('flag_follower_hidden')) return false;
  return state.party.some((m) => m.id === 'kanenari');
}

/** 話す 人の いない 行を 抜く（グソっ君）。 */
function trim(text: string): string {
  return text
    .split(/\n(?=@)/)
    .filter((p) => !(p.split('\n')[0].slice(1).trim() === 'npc_kanenari' && !knWith()))
    .join('\n');
}

function* say(text: string): Co<number> {
  const t = trim(text);
  if (!t.trim()) return -1;
  return yield* say3(t);
}

function wrap(id: string, fn: (ctx: ScriptCtx, orig: () => Co) => Co): void {
  const prev = getScript(id);
  registerScript(id, function* (ctx): Co {
    const orig = function* (): Co {
      if (prev) yield* prev(ctx);
      else yield* ctx.runDefault();
    };
    yield* fn(ctx, orig);
  });
}

/** 段階2（S13 の あと〜S14 の 前）。 */
function stage2Open(): boolean {
  return inCh3() && !pgOn() && c3Stage() === 2 && flag('flag_ch3_got_gochisou') > 0 && !flag('flag_ch3_truck_trap');
}

/** 寄り道が 開いている（町に いる とき）。 */
export function kzOpen(): boolean {
  return stage2Open() && field()?.map.id === UMIZOI;
}

/** 路地の かぎ（段階2）・物干し（段階1〜2）。 */
const kagiOn = (): boolean => inCh3() && !pgOn() && c3Stage() === 2 && !flag('flag_ch3_truck_trap');
const sentakuOn = (): boolean => inCh3() && !pgOn() && (c3Stage() === 1 || c3Stage() === 2);

// ================================================================ 地図の 物

addToMap(UMIZOI, [
  ...KZ_KAGI.map(([x, y], k) => ({ t: 'obj', id: `obj_kz_kagi_${k}`, x, y, prop: 'prop_kz_kagi', opts: { k }, script: 'obj_kz_kagi', face: 'up', cond: { when: kagiOn } }) as unknown as MapObj),
  { t: 'obj', id: 'obj_kz_sentaku', x: SENTAKU[0], y: SENTAKU[1], prop: 'prop_kz_sentaku', script: 'obj_kz_sentaku', face: 'up', cond: { when: sentakuOn } } as unknown as MapObj,
]);

// 港通りの 風の すじ（段階2：角から 西へ、白い 線が 流れる。スマホ縦でも 風の 通り道が 見えるように）
registerWorldFx({
  map: UMIZOI,
  anchored: true,
  draw(f, g, cx, cy, layer) {
    if (layer !== 'glow' || !kagiOn()) return;
    const t = performance.now();
    for (let i = 0; i < 4; i++) {
      const ph = ((t / 1700 + i * 0.27) % 1 + 1) % 1;
      const wx = (28.5 - ph * 8) * 16;
      const foot = (16 + (i % 3)) * 16 + 10;
      const [sx, sy] = fxAt(f, wx, foot - 12 - (i % 2) * 6, cx, cy, foot);
      const a = Math.sin(ph * Math.PI) * 0.75;
      if (a <= 0.05) continue;
      const len = 9 + (i % 2) * 4;
      g.rect(Math.round(sx), Math.round(sy), len, 1, '#FFFFFF', a);
      g.rect(Math.round(sx) + len, Math.round(sy) - 1, 3, 1, '#FFFFFF', a * 0.6);
    }
  },
});

// ホシミの「！」：始まる 前と、③の あと 店へ よばれて いる 間
addMarkSource((f) => {
  if (f.map.id !== UMIZOI || !stage2Open()) return null;
  const want = !flag(KZF.start) || (flag(KZF.kaze) > 0 && !flag(KZF.done));
  if (!want) return null;
  const a = f.actorById(TSUMA);
  return a && a.visible ? actorAnchor(a) : null;
});

// ================================================================ 台本

/** 段階1 の 前ぶれ：干し台の 今の 文の あと（1回）。 */
wrap('obj_c3_himono_dai', function* (_ctx, orig): Co {
  yield* orig();
  if (!inCh3() || pgOn() || c3Stage() !== 1 || flag(KZF.mae)) return;
  setFlag(KZF.mae, 1);
  yield* say(T.KZ_MAE);
});

/** 1 また 言い合い、4 さわって みて、すんだ あと。 */
for (const id of [OTTO, TSUMA])
  wrap(id, function* (_ctx, orig): Co {
    if (!kzOpen()) {
      yield* orig();
      return;
    }
    if (!flag(KZF.start)) {
      // いつもの〔c2〕が 先、つぎに〔kaze〕
      if (!flag(KZF.pre)) {
        setFlag(KZF.pre, 1);
        yield* orig();
        return;
      }
      setFlag(KZF.start, 1);
      yield* say(T.KZ_A);
      addItem(KZ_AMI);
      if (flag(KZF.mae) && knWith() && !flag(KZF.mita)) {
        setFlag(KZF.mita, 1);
        yield* say(T.KZ_MITA);
      }
      return;
    }
    if (!flag(KZF.kaze)) {
      yield* say(T.KZ_MADA);
      return;
    }
    if (!flag(KZF.done)) {
      yield* sawaru();
      return;
    }
    yield* say(T.KZ_AFTER);
  });

/** 4 べたつかなく なったら・ごほうび。 */
function* sawaru(): Co {
  yield* say(T.KZ_SAWARU);
  yield 600;
  yield* say(T.KZ_SARATTO);
  setFlag(KZF.done, 1);
  addMp(2);
  addItem(KZ_HIRAKI);
  se('se_item');
  yield* say3(T.KZ_REWARD);
}

/** 2 かぎ（3つ）。 */
registerScript('obj_kz_kagi', function* (ctx: ScriptCtx): Co {
  const k = Number(String(ctx.source).replace('obj_kz_kagi_', ''));
  se('se_examine');
  if (flag(KZF.kaze)) {
    yield* say3(k === 2 ? T.KZ_YURERU : T.KZ_KAGI_DONE);
    return;
  }
  if (!flag(KZF.start) || !kzOpen()) {
    yield* say3(T.KZ_KAGI);
    return;
  }
  if (flag(KZF.at) === k + 1) {
    yield* say3(T.KZ_KOKO);
    return;
  }
  se('se_item', { vol: 0.4 });
  setFlag(KZF.at, k + 1);
  setFlag(S_F[k], 1);
  if (k < 2) {
    yield 300;
    yield* say(k === 0 ? T.KZ_HINATA : T.KZ_HIKAGE);
    if (flag(KZF.s0) && flag(KZF.s1) && !flag(KZF.acchi) && knWith()) {
      setFlag(KZF.acchi, 1);
      const f = field();
      // (③ は どちらからも 南：グソっ君が そっちを 向く)
      if (f?.follower) f.follower.dir = 'down';
      yield* say(T.KZ_ACCHI);
    }
    return;
  }
  yield* kado();
});

/** ③ 路地の 出口の 角 → 3 風で 干す。 */
function* kado(): Co {
  yield 500;
  yield* say(T.KZ_KADO);
  yield* say(T.KZ_KAZE);
  setFlag(KZF.kaze, 1);
  removeItem(KZ_AMI);
  if (!flag(KZF.hoshisugi) && state.taken.sym_c3_01 && state.taken.sym_c3_02) {
    setFlag(KZF.hoshisugi, 1);
    yield* say(T.KZ_HOSHISUGI);
  }
  yield* say(T.KZ_YOBU);
  if (!flag(KZF.masaru) && (yield* kitaComeIn(MASARU, UMIZOI, [[18, 18], [19, 18], [20, 18], [21, 18], [22, 18]], 'right'))) {
    setFlag(KZF.masaru, 1);
    yield* say3(T.KZ_MASARU);
    kitaGoOut(MASARU);
  }
}

registerScript('obj_kz_sentaku', function* (): Co {
  se('se_examine');
  yield* say3(c3Stage() >= 2 ? T.KZ_SENTAKU_C2 : T.KZ_SENTAKU_C1);
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.kaze(step = 'start', kakushi = false)（kakushi：前ぶれ・ホシスギ 2組・来た マサルの 3つを そろえる）
 *   'mae'    段階1、干し台の 前 (22,13) 上向き（前ぶれ）
 *   'start'  段階2、S13 の あと、〔c2〕の あと、ホシミの 前 (19,16) 上向き（話すと〔kaze〕）
 *   'k0' 'k1' 'k2'  始まった あと、かぎ ①②③ の 前（上向き）
 *   'acchi'  ①② の あと、③ の 前 (23,17) 上向き
 *   'gift'   ③ の あと、ホシミの 前 (19,16) 上向き（さわって みて）
 *   'done'   すんだ あと、③ の 前 (23,17) 上向き
 */
if (import.meta.env.DEV) {
  registerDebug('kaze', (step = 'start', kakushi = false) => {
    const s1 = step === 'mae';
    cmd().jump?.(s1 ? 'ch3:umizoi' : 'ch3:trap', true);
    for (const id of Object.values(KZF)) setFlag(id, 0);
    if (kakushi) {
      // かくし 3つ：前ぶれを 見た・ホシスギ 2組・来た マサル
      setFlag(KZF.mae, 1);
      state.taken.sym_c3_01 = true;
      state.taken.sym_c3_02 = true;
      setFlag('flag_ch3_kita_npc_hoshi_gen', 1);
    }
    removeItem(KZ_AMI);
    removeItem(KZ_HIRAKI);
    setFlag('flag_ch3_stage', s1 ? 1 : 2);
    const go = (x: number, y: number) => {
      setTimeout(() => cmd().warp?.(UMIZOI, x, y, 'up'), 700);
      return cmd().warp?.(UMIZOI, x, y, 'up');
    };
    if (s1) return go(22, 13);
    setFlag('flag_ch3_got_gochisou', 1);
    setFlag('flag_ch3_truck_trap', 0);
    setFlag(KZF.pre, 1);
    if (step === 'start') return go(19, 16);
    setFlag(KZF.start, 1);
    addItem(KZ_AMI);
    const k = ['k0', 'k1', 'k2'].indexOf(String(step));
    if (k >= 0) return go(KZ_KAGI[k][0], KZ_KAGI[k][1] + 1);
    setFlag(KZF.s0, 1);
    setFlag(KZF.s1, 1);
    setFlag(KZF.at, 2);
    if (step === 'acchi') return go(23, 17);
    setFlag(KZF.at, 3);
    setFlag(KZF.s2, 1);
    setFlag(KZF.kaze, 1);
    removeItem(KZ_AMI);
    if (step === 'gift') return go(19, 16);
    setFlag(KZF.done, 1);
    addItem(KZ_HIRAKI);
    return go(23, 17);
  });

  registerDebug('kzState', () => {
    const flags: Record<string, number> = {};
    for (const [k, id] of Object.entries(KZF)) flags[k] = flag(id);
    const f = field();
    return {
      flags,
      open: kzOpen(),
      ami: state.inventory.includes(KZ_AMI),
      hiraki: state.inventory.includes(KZ_HIRAKI),
      map: f?.map.id,
      at: f ? [f.player.tileX, f.player.tileY] : null,
    };
  });
}

/** Every page: at most 3 lines, each at most 336 px (names filled in); no 天丼; no clock time; no さん in the narration. */
export function kzTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['平和', '干しすぎ', '干したりない', 'ピッ！', 'あ、つい', 'おかわり、あるよ', 'もう 1杯', 'ほどよいなぁ', '暗くて しめった', '本日も、休館', '板に なったんよ'];
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) return;
      let lines: string[] = [];
      let who = '';
      const flush = () => {
        if (!lines.length) return;
        pages++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
        lines = [];
      };
      for (const raw of fillNames(v).split('\n')) {
        const t = raw.trim();
        if (t.startsWith('@') || t === '/' || !t) {
          flush();
          if (t.startsWith('@')) {
            who = t.slice(1);
            if (!SPEAKERS[who] && who !== 'narr' && who !== 'sys') bad.push(`${name}: speaker ${who}`);
          }
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b)) bad.push(`${name}: 「${b}」: ${plain}`);
        if (/\d+:\d\d/.test(plain)) bad.push(`${name}: time: ${plain}`);
        if ((who === 'narr' || who === 'sys') && plain.includes('さん')) bad.push(`${name}: 地の文の さん: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('kz', T.KZ_TEXTS);
  for (const l of [...T.KZ_ITEM_AMI_DESC, ...T.KZ_ITEM_HIRAKI_DESC]) if (measure(l) > 336) bad.push(`desc: ${l}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('kzText', () => kzTextCheck());
