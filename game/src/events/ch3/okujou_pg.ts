// 掃除は 上から（03_ch3_index、okujou.ts）の クリア後：屋上の ボールを「持っておく」に した 人だけ、旧水族館の 前の
// ハキコに わたす（1回）。ハキコの 台本は クリア後の 会話（events/pg_talk.ts）と 本日は、開館です（ch3/iso.ts）が
// 上から 包むので、その あとに もう一度 包んで、この 用を 先に 出す。events/index.ts で ch3/iso の あとに import する。

import type { Co } from '../../engine/co';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { ojPgBall } from './okujou';

{
  const prev = getScript('npc_c3_uketsuke');
  registerScript('npc_c3_uketsuke', function* (ctx: ScriptCtx): Co {
    if (yield* ojPgBall()) return;
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
  });
}
