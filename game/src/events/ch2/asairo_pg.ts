// 朝の 前の 色（02_ch2_index #104、asairo.ts）の クリア後の 夜：ソワカの 台本は クリア後の 会話
// （events/pg_talk.ts）が 上から 包むので、その あとに もう一度 包んで、この 寄り道の 用を 先に 出す。
// （露の 場所・絵・札の 下書き・トマトの 株は クリア後の 会話の 外なので、asairo.ts の まま）
// events/index.ts で pg_talk の あとに import する。

import type { Co } from '../../engine/co';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { pgOn } from '../../world/postgame';
import { asSawako } from './asairo';

for (const [id, fn] of [['npc_hoshi_sawako', asSawako]] as const) {
  const prev = getScript(id);
  registerScript(id, function* (ctx: ScriptCtx): Co {
    if (pgOn() && (yield* fn())) return;
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
  });
}
