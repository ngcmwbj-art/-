// 第1章のマル（2026-09-29 依頼主の採用、02 #65。10_narrative 6.24）：段階2、
// モール駐車場のバス停「ユウナリ前」のとなり (34,12)。手押し車に腰かけて、
// 星見台ゆきの「5時の バス」を待っている。話すたびに1つずつ（t1〜t4）：
//   t1 5時の バス（はじめは2倍に寄る。のらカートの見まちがい）
//   t2 じいさんは とまたろう、米の人、水口 → flag_met_maru
//   t3 手押し車の中身（娘の漬物、孫の絵、じいさんの好物＝モモセの焼きそばは
//      5時から焼くので、まだ買えない）
//   t4 9月に帰る約束、ひとりだとごはんを食べない人、しゅんの名前、伝言
//      → flag_maru_dengon（第2章のトマじい〔maru〕と、エンディングのフリップ）
// そのあとは again をくり返す。フラグは第1章のクリアデータで第2章へ持ちこまれる。

import type { Co } from '../engine/co';
import { flag, setFlag } from '../game/state';
import { actor, msg, registerScript } from '../world/api';
import { SPEAKERS } from '../world/msg';
import { MARU_CH1 } from '../data/text/maru';
import { F } from './lib';
import { talkZoom, zoomOut } from './stage';

// the name tag and the voice (the ending of chapter 2 speaks with them too)
SPEAKERS.npc_maru ??= { name: 'マル', voice: 'maru' };

export const FLAG_MARU_TALK = 'flag_maru_talk';
const STEPS = ['t1', 't2', 't3', 't4'] as const;

registerScript('npc_maru', function* (): Co {
  const n = flag(FLAG_MARU_TALK);
  if (n >= STEPS.length) {
    yield* msg(MARU_CH1.again);
    return;
  }
  // the first talk: close on the two of them (2×), as with the town's first meetings
  const z = n === 0 ? yield* talkZoom(F().player, actor('npc_maru')) : null;
  yield* msg(MARU_CH1[STEPS[n]]);
  if (z) yield* zoomOut(z, 300);
  setFlag(FLAG_MARU_TALK, n + 1);
  if (n + 1 >= 2) setFlag('flag_met_maru', 1);
  if (n + 1 >= 4) setFlag('flag_maru_dengon', 1);
});
