// 第3章 段階0（S01〜S04、9月1日 11:10 の昼前）の夕鳴町の人と話す（fix1014 F3：
// 「小林家を出ると みんなと 話せないのが 寂しい」）。
//
// - 表（map_town）：W が段階0に置いた背景の人 `c3_hm_*`（data/maps/town.ts、62 5.1：
//   お店の人とお年寄りだけ）に話しかけられる。台詞は data/text/c3_hirumae.ts。
// - 店と家の中：第1章の人（えすけ・ワイスタ巡査・ゆず・ふでの先生・きぬ・ゆう・かずゆき・
//   おかみ・ちずの母・ピー・コック・写真館の主人）は、段階0のあいだだけ第3章の昼前の台詞に
//   する（第1章のままだと flag_stage 3 の「止まった町」の台詞が出る）。ほかの章ではもとのまま。
// - 畦道の先の 分水（map_aze）のベンチの いつき・あさひも 同じ形（fix1016 依頼主「水のところにいる
//   おじいさん2人に話しかけられない」：第1章の台本は段階3では黙っていた）。
// - 会話キーは第3章の形（c0_1, c0_2：pickC3）。記録は flag_seen_<npc>_c0（`c` なので
//   talked.ts の seenNpc は拾わない）。
// - 来る人の決まり（60 3.4）：段階0で話しても flag_talked_ は立てない（world/interact.ts）。
//   来る人は第1章・第2章で話した人だけのまま。

import type { Co } from '../../engine/co';
import { registerScript } from '../../world/api';
import { getScript } from '../../world/scripts';
import { C3_HIRUMAE } from '../../data/text/c3_hirumae';
import { c3Town, pickC3, say3 } from './common';

/** One person's stage-0 talk (numbered keys in turn, the last one repeats). */
function* talkC0(npcId: string): Co {
  const table = C3_HIRUMAE[npcId];
  if (!table) return;
  const key = pickC3(npcId, table, 0);
  if (key) yield* say3(table[key]);
}

// ---------------------------------------------------------------- 表（W の c3_hm_*、段階0だけいる）

const OUTSIDE: Record<string, string> = {
  c3_hm_mamekichi: 'npc_mamekichi',
  c3_hm_ojii: 'npc_ojii',
  c3_hm_mizumaki: 'npc_mizumaki',
  c3_hm_madam: 'npc_madam',
  c3_hm_kotaro: 'npc_kotaro',
  c3_hm_cat: 'npc_cat_mike',
  c3_hm_hato: 'npc_hato',
};
for (const [id, npcId] of Object.entries(OUTSIDE))
  registerScript(id, function* (): Co {
    if (!c3Town()) return;
    yield* talkC0(npcId);
  });

// ---------------------------------------------------------------- 店と家の中（第1章の人の段階0の差分）

const INSIDE = [
  'npc_inui',
  'npc_tsurumi',
  'npc_yuzu',
  'npc_fudeno',
  'npc_kinu',
  'npc_tokio',
  'npc_master',
  'npc_okami',
  'npc_sake_cat',
  'npc_chizu_haha',
  'npc_kazuo',
  'npc_photo_master',
  // 畦道の先の 分水のベンチの2人（fix1016：events/aze.ts の台本は 段階3〈止まった町〉で 何も 言わない）
  'npc_yone',
  'npc_toyozou',
];
for (const id of INSIDE) {
  // src/events/index.ts imports chapter 3 last: the chapter-1/2 scripts are already registered
  const before = getScript(id);
  registerScript(id, function* (ctx): Co {
    if (c3Town()) {
      yield* talkC0(id);
      return;
    }
    if (before) yield* before(ctx);
    else yield* ctx.runDefault();
  });
}
