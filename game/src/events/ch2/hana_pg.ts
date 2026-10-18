// ごはん 一粒、花 一つ（02_ch2_index #107、hana.ts）の クリア後の 夜：トマじいの 台本は クリア後の 会話
// （events/pg_talk.ts）が 上から 包むので、その あとに もう一度 包んで、この 寄り道の 用を 先に 出す。
// （穂 6か所は クリア後の 会話の 外なので、hana.ts の まま）events/index.ts で pg_talk の あとに import する。

import type { Co } from '../../engine/co';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { pgOn } from '../../world/postgame';
import { hnTome } from './hana';

{
  const prev = getScript('npc_hoshi_tome');
  registerScript('npc_hoshi_tome', function* (ctx: ScriptCtx): Co {
    if (pgOn() && (yield* hnTome())) return;
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
  });
}
