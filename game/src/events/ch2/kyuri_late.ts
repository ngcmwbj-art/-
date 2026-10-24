// 絵の きゅうりは、とり遅れない（kyuri.ts）の 3〜5 と かくし：無人販売所の 札と くらべる、販売所の 台の 1行、
// 集会所の ぴょん夫人。店番（tenban.ts）・朝の 前の 色（asairo.ts）が 台の 文の あとに 足す 行より 外から 包むので、
// ch2/index.ts の いちばん あとの ほうで import する（3本 持っている 間は 札の 場面が 先、すんだ あとの 1行は いちばん 後ろ）。

import type { Co } from '../../engine/co';
import { addItem, flag, removeItem, setFlag, state } from '../../game/state';
import * as T from '../../data/text/hoshi_kyuri';
import { addMp } from '../lib';
import { se } from './compat';
import { kanenariHere, KF, KY_SANBON, KY_TORE, kyOpen, onMap, say, wrap } from './kyuri';

const SCHOOL = 'map_hoshi_school';

/** 3 札と くらべる → 4 いちばん おいしい とき → 5 ごほうび。 */
function* fudaScene(kn: boolean): Co {
  yield* say(kn ? T.KY_FUDA : T.KY_FUDA_SOLO);
  yield* say(kn ? T.KY_OISHII : T.KY_OISHII_SOLO);
  if (flag('flag_tenban_done') && !flag(KF.tenban)) {
    setFlag(KF.tenban, 1);
    yield* say(T.KY_TENBAN);
  }
  se('se_examine', { vol: 0.4 });
  yield* say(T.KY_DAI);
  removeItem(KY_SANBON);
  for (let i = 0; i < 2; i++) addItem(KY_TORE);
  setFlag(KF.done, 1);
  addMp(2);
  se('se_item');
  yield* say(T.KY_REWARD);
}

for (const id of ['obj_hoshi_mujin', 'restored_enemy_mujin_hanbaiin'])
  wrap(id, function* (_ctx, orig): Co {
    if (kyOpen() && onMap('map_hoshimidai') && state.inventory.includes(KY_SANBON) && !flag(KF.done)) {
      se('se_examine');
      yield* fudaScene(kanenariHere());
      return;
    }
    yield* orig();
    if (flag(KF.done) && onMap('map_hoshimidai')) yield* say(T.KY_DAI_AFTER);
  });


/** かくし：3本 持って、集会所の ぴょん夫人（お茶の あとに 1回）。 */
for (const id of ['npc_hoshi_yoshie', 'evt_ch2_rest_yoriai'])
  wrap(id, function* (_ctx, orig): Co {
    const before = flag('flag_ch2_rest_count');
    yield* orig();
    if (!onMap(SCHOOL) || flag(KF.yoshie) || !state.inventory.includes(KY_SANBON)) return;
    if (flag('flag_ch2_rest_count') <= before) return;
    setFlag(KF.yoshie, 1);
    yield* say(T.KY_YOSHIE);
  });
