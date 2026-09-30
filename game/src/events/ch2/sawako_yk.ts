// ソワカの 色見本（第2章の部分。02_ch2_index #73、docs/ideas/2026-09-30.md の2、50 3.11・9.9）。
//
//   ソワカの家 map_hoshi_sawako の 壁の スケッチ obj_hr_sawako_kabe (5–6,1)：2回目から、
//     いつもの 文の あとに すみの 色つきの 下絵の 2ページ（『夕鳴町 焼きそば屋さんの 置物
//     色の 見本』）。はじめて それを 見たとき、グソっ君が 1回（隊列に いれば）。
//   そのあと ソワカ (23,37) に 話すと、1回だけ〔yk〕（ふもとの 焼きそば屋の 置物の 話。
//     5ページ目は 選べる①「ふもとまでは、ツガオさんの 軽トラ。…」）。無人販売所は いつもどおり 開く。
//
// ヤキソバン（第3章）の 伏線は「バレない程度」：置物が だれかは 言わない（03_ch3_memo.md は
// 第2章で ばらさない）。
//
// QA：__game.cmd.sawakoYk('kabe' | 'talk' | 'reset')、jump('ch2:sawako')。

import type { Co } from '../../engine/co';
import { flag, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript } from '../../world/api';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { sfx } from '../../audio';
import { R2_OBJ } from '../../data/text/hoshi_rooms2';
import { SAWAKO_YK, SAWAKO_YK_FLIP, SAWAKO_YK_KABE } from '../../data/text/hoshi_sawako_yk';
import { pickHText } from './common';

export const YK = {
  /** 下絵（色見本）を 見た（壁の スケッチの 2回目）。 */
  kabe: 'flag_ch2_sawako_kabe_yk',
  /** グソっ君の ひとこと（1回）。 */
  flip: 'flag_kanenari_flip_sawako_yk',
  /** ソワカの〔yk〕を 聞いた（1回）。 */
  yk: 'flag_ch2_sawako_yk',
};

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

/** The wall of sketches: its own pages; from the second look on, the coloured sketch in the corner too (one block). */
registerScript('obj_hr_sawako_kabe', function* (ctx): Co {
  const own = pickHText(R2_OBJ.obj_hr_sawako_kabe as string | Record<string, string> | undefined);
  if (!flag('flag_seen_obj_hr_sawako_kabe') || !own) {
    yield* ctx.runDefault();
    return;
  }
  sfx('se_examine');
  yield* runMsg(own + '\n/\n' + SAWAKO_YK_KABE.replace(/^@narr\n/, ''));
  setFlag(YK.kabe, 1);
  if (!flag(YK.flip) && kanenariHere()) {
    setFlag(YK.flip, 1);
    yield* runMsg(SAWAKO_YK_FLIP);
  }
});

/** ソワカ (npcs.ts asks here before her stage lines): 〔yk〕 once, after the sketch was seen. True when it was said. */
export function* sawakoYk(): Co<boolean> {
  if (!flag(YK.kabe) || flag(YK.yk)) return false;
  setFlag(YK.yk, 1);
  yield* runMsg(SAWAKO_YK);
  return true;
}

// ---------------------------------------------------------------- QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/**
 * QA: __game.cmd.sawakoYk(step = 'kabe')
 *   'kabe'   in ソワカの家 in front of the sketches (5,2) facing up, looked at once: the next look is the second
 *   'talk'   the sketch seen: in front of ソワカ (23,38) facing up (the next talk is 〔yk〕)
 *   'reset'  the flags back to nothing
 */
registerDebug('sawakoYk', (step = 'kabe') => {
  if (step === 'reset') {
    for (const f of [...Object.values(YK), 'flag_seen_obj_hr_sawako_kabe']) setFlag(f, 0);
    return 'sawakoYk: reset';
  }
  cmd().jump?.('ch2:gen', true);
  setFlag('flag_seen_obj_hr_sawako_kabe', 1);
  if (step === 'talk') {
    setFlag(YK.kabe, 1);
    cmd().warp?.('map_hoshimidai', 23, 38, 'up');
    return 'sawakoYk: talk to ソワカ (Z)';
  }
  cmd().warp?.('map_hoshi_sawako', 5, 2, 'up');
  return 'sawakoYk: examine the sketches (Z)';
});
