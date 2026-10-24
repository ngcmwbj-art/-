// 上へ 降る 雪（02_ch2_index #102、mushigomu.ts）の クリア後の 夜：まつ先生と ポコシャの 台本は クリア後の 会話
// （events/pg_talk.ts）が 上から 包むので、その あとに もう一度 包んで、この 寄り道の 用を 先に 出す。
// events/index.ts で pg_talk の あとに import する。

import type { Co } from '../../engine/co';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { pgOn } from '../../world/postgame';
import { mgFumi, mgPokosha } from './mushigomu';

for (const [id, fn] of [
  ['npc_hoshi_fumi', mgFumi],
  ['npc_pokosha', mgPokosha],
] as const) {
  const prev = getScript(id);
  registerScript(id, function* (ctx: ScriptCtx): Co {
    if (pgOn() && (yield* fn())) return;
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
  });
}
