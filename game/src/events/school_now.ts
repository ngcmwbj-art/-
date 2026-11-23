// 夕鳴小学校の 裏庭・校庭の 調べる物を、第3章の 昼前（9月1日）と クリア後は その日の 文に（2026-10-15、
// 依頼主「校舎裏や校庭に行けない」：裏門を その2つの 時期も 開けた。art/props/school.ts uramonOpen）。
//
// 前の 台本は 消さずに 包む（第3章の 昼前は events/ch3/hirumae.ts、クリア後は events/pg_talk.ts と 同じ 形）：
// 文は data/text/school_now.ts。キーの 無い 時期・物は 前の 台本（第1章の 文、クリア後は E の pg_objs.ts）。
// 寄り道（水やり当番・二人十五脚）は 段階1〜2 だけ 始まる（school.ts・kotei.ts の onDuty）ので、ここでは 触らない。
// pg_talk の あとに import する（events/index.ts）。

import type { Co } from '../engine/co';
import { registerScript } from '../world/api';
import { getScript, type ScriptCtx } from '../world/scripts';
import { pgBandDef, pgOn } from '../world/postgame';
import { sfx } from '../audio';
import { SCHOOL_NOW, type NowText } from '../data/text/school_now';
import { c3Town, say3 } from './ch3/common';

/** 今の 時期の 文（無ければ null：前の 台本）。 */
export function schoolNowText(t: NowText): string | null {
  if (c3Town()) return t.c0 ?? null;
  if (pgOn()) return t[pgBandDef().key] ?? t.p ?? null;
  return null;
}

for (const [id, t] of Object.entries(SCHOOL_NOW)) {
  const before = getScript(id);
  registerScript(id, function* (ctx: ScriptCtx): Co {
    const text = schoolNowText(t);
    if (!text) {
      if (before) yield* before(ctx);
      else yield* ctx.runDefault();
      return;
    }
    sfx('se_examine');
    yield* say3(text);
  });
}
