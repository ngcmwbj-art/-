// ええ 色の わけ（02_ch2_index #103、iro.ts）の クリア後の 夜：ぴょん夫人と ハモ区長の 台本は クリア後の 会話
// （events/pg_talk.ts）が 上から 包むので、その あとに もう一度 包んで、この 寄り道の 用を 先に 出す。
// （集会所の ぴょん夫人は 置き場所の 台本 evt_ch2_rest_yoriai〈お茶〉で 話すので、クリア後の 夜も iro.ts の
// お茶の あとの 形の まま。ここで 包むのは クリア後の 会話が 包む npc_hoshi_yoshie と npc_hoshi_kucho）
// events/index.ts で pg_talk の あとに import する。

import type { Co } from '../../engine/co';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { pgOn } from '../../world/postgame';
import { irKucho, irYoshieFirst } from './iro';

for (const [id, fn] of [
  ['npc_hoshi_yoshie', () => irYoshieFirst(true)],
  ['npc_hoshi_kucho', irKucho],
] as const) {
  const prev = getScript(id);
  registerScript(id, function* (ctx: ScriptCtx): Co {
    if (pgOn() && (yield* fn())) return;
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
  });
}
