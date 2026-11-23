// 二百十日の 前の 晩（げむきか10/1の5。依頼主の 変更：グソっ君が 4人の 名前を 言う。
// 02_ch2_index #78、50 9.9・10.24）。
//
//   段階1〜2：農具小屋 map_hoshi_koya の 表 obj_hr_koya_hyou (3,1) の いつもの 文の あとに
//     『二百十日』の 1ページ（flag_nihyaku_hyou）→ グソっ君が 1回、聞きに 行く 4人の 名前
//     （トマじい・ペロ・マサル・ハモ区長。flag_kanenari_flip_nihyaku）。
//   4人に 1回ずつ〔210〕（グソっ君が 聞き、村の 人が 自分の 仕事の 目で 答える。
//     flag_nihyaku_<tome|mitsu|gen|kucho>）。ハモ区長の ところは グソっ君の ツッコミ つき。
//   4人目の あと：グソっ君（深い 海の 話）→ みました帳②の すみの 1ページ → 朱肉 +2
//     （flag_nihyaku_done）。ふしぎの 数には 入れない（みました帳② の ふしぎの 一覧の
//     すみに、番号なしで 1行。src/ui/menu/book.ts）。
//
// 4人の 台本（npcs.ts、school.ts の〔bucket〕）は 包むだけ：〔210〕が 言えるときだけ 先に 言い、
// ほかは いつもの 台本へ。話の 筋の 場面（寄り合い・ペロの 頼み・マサルの 見回りの 前、
// 名前の 石・マルの 伝言・課長の 話・脇芽の 報告・おてつだいの 最中）は じゃましない。
//
// QA：__game.cmd.nihyaku('hyou' | 'tome' | 'mitsu' | 'gen' | 'kucho' | 'last' | 'book' | 'h2' | 'reset')、
//     jump('ch2:nihyaku')、__game.cmd.nihyakuState()、nihyakuBookText()（wrapCheck にも 入る）。

import type { Co } from '../../engine/co';
import { flag, hasItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { getScript } from '../../world/scripts';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { sfx } from '../../audio';
import { R2_OBJ } from '../../data/text/hoshi_rooms2';
import {
  NIHYAKU_210,
  NIHYAKU_ASK,
  NIHYAKU_FLIP,
  NIHYAKU_HYOU,
  NIHYAKU_KUCHO_TSUKKOMI,
  NIHYAKU_NOTE,
  NIHYAKU_REWARD,
  NIHYAKU_UMI,
  NIHYAKU_WHO,
  type NihyakuWho,
} from '../../data/text/hoshi_nihyaku';
import { hStage, pickHText } from './common';

export const NF = {
  /** 表の『二百十日』の ページを 見た。 */
  hyou: 'flag_nihyaku_hyou',
  /** グソっ君が 4人の 名前を 言った（1回）。 */
  flip: 'flag_kanenari_flip_nihyaku',
  /** 4人の〔210〕（1回ずつ）。 */
  tome: 'flag_nihyaku_tome',
  mitsu: 'flag_nihyaku_mitsu',
  gen: 'flag_nihyaku_gen',
  kucho: 'flag_nihyaku_kucho',
  /** 4人目の あと：みました帳②の すみの ページと 朱肉 +2。 */
  done: 'flag_nihyaku_done',
};

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

/** 段階1〜2（灯りの 夜）。 */
function inStage(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2;
}

/** How many of the four have answered. */
export function nihyakuCount(): number {
  return NIHYAKU_WHO.filter((w) => flag(NF[w.who]) > 0).length;
}

// ---------------------------------------------------------------- 農具小屋の 表

registerScript('obj_hr_koya_hyou', function* (ctx): Co {
  const own = pickHText(R2_OBJ.obj_hr_koya_hyou as string | Record<string, string> | undefined);
  if (!inStage() || !own) {
    yield* ctx.runDefault();
    return;
  }
  sfx('se_examine');
  setFlag('flag_seen_obj_hr_koya_hyou', 1);
  yield* runMsg(own + '\n/\n' + NIHYAKU_HYOU.replace(/^@narr\n/, ''));
  setFlag(NF.hyou, 1);
  if (!flag(NF.flip) && kanenariHere()) {
    setFlag(NF.flip, 1);
    yield* runMsg(NIHYAKU_FLIP);
  }
});

// ---------------------------------------------------------------- 4人の〔210〕

/** Is a story line of this person due first (then 〔210〕 waits for the next talk)? */
function storyFirst(who: NihyakuWho): boolean {
  switch (who) {
    case 'tome': {
      // 課長の 話（両方の ヘノヘノ課長の あと）、名前の 石、マルの 伝言（sawa.ts の 順の 前の ほう）
      if (state.taken['sym_hoshi_03'] && state.taken['sym_hoshi_06'] && !flag('flag_seen_npc_hoshi_tome_kacho_done')) return true;
      if (hasItem('item_namae_ishi') && !flag('flag_ch2_sawa_ishi')) return true;
      if (!flag('flag_ch2_maru_told') && (flag('flag_maru_dengon') || flag('flag_met_maru'))) return true;
      return false;
    }
    case 'mitsu':
      // ハウスを 出る 前の 台詞、脇芽の 報告（〔wakime_done〕と 朱肉 +2）
      return !flag('flag_ch2_house_exit') || (flag('flag_ch2_wakime_done') > 0 && !flag('flag_ch2_wakime_report'));
    case 'gen':
      // 見回り（ゲートを 開ける）の 前、牛舎の おてつだいの 最中（ゲートの 前で「まだ 村を 回る」の あとは 聞ける、02 #80）
      return (!flag('flag_ch2_gate_open') && !flag('flag_ch2_gate_wait')) || flag('flag_ch2_barn_work_on') > 0;
    case 'kucho':
      return !flag('flag_ch2_yoriai');
  }
}

/** 〔210〕 of one of the four, when it is due; then, after the fourth, the page of the notebook. True when it was said. */
function* nihyakuAt(who: NihyakuWho): Co<boolean> {
  if (!flag(NF.hyou) || flag(NF[who]) || flag(NF.done) || !inStage() || storyFirst(who)) return false;
  setFlag(NF[who], 1);
  const here = kanenariHere();
  if (here) yield* runMsg(NIHYAKU_ASK[who]);
  yield* runMsg(NIHYAKU_210[who]);
  if (who === 'kucho' && here) yield* runMsg(NIHYAKU_KUCHO_TSUKKOMI);
  if (nihyakuCount() >= NIHYAKU_WHO.length) yield* nihyakuNote();
  return true;
}

/** After the fourth: グソっ君's deep sea, the corner page of みました帳②, 朱肉 +2. */
function* nihyakuNote(): Co {
  if (flag(NF.done)) return;
  if (kanenariHere()) yield* runMsg(NIHYAKU_UMI);
  yield 200;
  sfx('se_page');
  // しゅんが 鉛筆で 書きとめる
  for (let i = 0; i < 4; i++) {
    yield 140;
    sfx('se_pen_write', { pitch: 1 + (i % 2) * 0.08 });
  }
  yield 120;
  yield* runMsg(NIHYAKU_NOTE);
  setFlag(NF.done, 1);
  const m = state.party.find((x) => x.id === 'minato');
  if (m) m.mp = Math.min(m.maxMp, m.mp + 2);
  sfx('se_item');
  yield* runMsg(NIHYAKU_REWARD);
}

// the four's scripts (npcs.ts; トマじい is wrapped again by school.ts's 〔bucket〕, which comes first)
for (const { who, npc } of NIHYAKU_WHO) {
  const orig = getScript(npc);
  registerScript(npc, function* (ctx): Co {
    if (yield* nihyakuAt(who)) return;
    if (orig) yield* orig(ctx);
    else yield* ctx.runDefault();
  });
}

// ---------------------------------------------------------------- QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/** Where to stand to talk to each of the four (stage 1; マサル in the barn, stage 2 at the gate). */
const AT: Record<NihyakuWho, [string, number, number, string]> = {
  tome: ['map_hoshimidai', 20, 11, 'right'],
  mitsu: ['map_hoshimidai', 4, 32, 'left'],
  gen: ['map_hoshi_barn', 19, 6, 'right'],
  kucho: ['map_hoshi_school', 6, 4, 'up'],
};
const AT_H2_GEN: [string, number, number, string] = ['map_hoshimidai', 49, 19, 'right'];

/**
 * QA: __game.cmd.nihyaku(step = 'hyou')
 *   'hyou'    段階1（ゲートの 先まで）、農具小屋の 表の 前 (3,2) 北向き
 *   'tome' 'mitsu' 'gen' 'kucho'   表を 見た あと、その 人の となり（次に 話すと〔210〕）
 *   'last'    3人に 聞いた あと、ハモ区長の 前（話すと 4人目 → みました帳 → 朱肉 +2）
 *   'book'    4人 聞きおえた：みました帳②の すみの ページが 見られる（メニュー → みました帳 → ②ふしぎ の いちばん下）
 *   'h2'      段階2：表を 見た あと、ゲートの 横の マサルの となり
 *   'reset'   この 案の フラグを もどす
 */
registerDebug('nihyaku', (step = 'hyou') => {
  if (step === 'reset') {
    for (const f of Object.values(NF)) setFlag(f, 0);
    return 'nihyaku: reset';
  }
  if (step === 'h2') {
    cmd().jump?.('ch2:hill', true);
    setFlag(NF.hyou, 1);
    setFlag(NF.flip, 1);
    const [m, x, y, d] = AT_H2_GEN;
    cmd().warp?.(m, x, y, d);
    return 'nihyaku: stage 2, talk to マサル at the gate (Z)';
  }
  cmd().jump?.('ch2:nihyaku', true);
  if (step === 'hyou') return 'nihyaku: examine the chart (Z)';
  setFlag(NF.hyou, 1);
  setFlag(NF.flip, 1);
  if (step === 'last' || step === 'book') {
    for (const w of ['tome', 'mitsu', 'gen'] as const) setFlag(NF[w], 1);
    if (step === 'book') {
      setFlag(NF.kucho, 1);
      setFlag(NF.done, 1);
      return 'nihyaku: done (open the menu: みました帳 ② ふしぎ, the last row)';
    }
    const [m, x, y, d] = AT.kucho;
    cmd().warp?.(m, x, y, d);
    return 'nihyaku: talk to ハモ区長 (Z) — the fourth';
  }
  const at = AT[step as NihyakuWho];
  if (!at) return Object.keys(AT);
  cmd().warp?.(at[0], at[1], at[2], at[3]);
  return `nihyaku: talk (Z) — 〔210〕 of ${step}`;
});

registerDebug('nihyakuState', () => ({
  stage: hStage(),
  ...Object.fromEntries(Object.entries(NF).map(([k, f]) => [k, flag(f)])),
  count: nihyakuCount(),
}));
