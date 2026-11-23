// 赤子 泣いても（02_ch2_index #105、hagama.ts）の クリア後の 夜：ペロの 台本は クリア後の 会話
// （events/pg_talk.ts）が 上から 包み、ペロの 家の かまどは クリア後の 調べる 物の 文（pg_objs.ts）が 包むので、
// その あとに もう一度 包んで、この 寄り道の 用を 先に 出す。events/index.ts で pg_talk の あとに import する。

import type { Co } from '../../engine/co';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { pgOn } from '../../world/postgame';
import { hgKamadoAfter, hgPero } from './hagama';

{
  const prev = getScript('npc_hoshi_mitsu');
  registerScript('npc_hoshi_mitsu', function* (ctx: ScriptCtx): Co {
    if (pgOn() && (yield* hgPero())) return;
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
  });
}
{
  const prev = getScript('obj_hr_kominka_kamado');
  registerScript('obj_hr_kominka_kamado', function* (ctx: ScriptCtx): Co {
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
    if (pgOn()) yield* hgKamadoAfter();
  });
}
