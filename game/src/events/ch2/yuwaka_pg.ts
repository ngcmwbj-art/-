// 湯を わかしてから（02_ch2_index #106、yuwaka.ts）の クリア後の 夜：ぴょん夫人の 台本は クリア後の 会話
// （events/pg_talk.ts）が 上から 包むので、その あとに もう一度 包んで、この 寄り道の 用を 先に 出す。
// （集会所の ぴょん夫人は 置き場所の 台本 evt_ch2_rest_yoriai〈お茶〉で 話すので、yuwaka.ts の 包みの まま。
// 貼り紙・勝手口・裏の 畑・眠っている 2人も クリア後の 会話の 外）events/index.ts で pg_talk の あとに import する。

import type { Co } from '../../engine/co';
import { registerScript } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { pgOn } from '../../world/postgame';
import { ywYoshie } from './yuwaka';

{
  const prev = getScript('npc_hoshi_yoshie');
  registerScript('npc_hoshi_yoshie', function* (ctx: ScriptCtx): Co {
    if (pgOn() && (yield* ywYoshie(null))) return;
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
  });
}
