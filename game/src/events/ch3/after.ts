// S34 クリア後（60_ch3_story 10.30）：第3章のクリアデータの「つづきから」は、銀座の朝。
//
//   - 焼きそばのたかしの前に、白い調理帽のグソっ君（c3_kn_shop）。〔c4〕「出来たて、食べてくか？」
//     → HP・朱肉の全回復（お金はとらない「まかないや」）。グソっ君は隊列にいない
//     （flag_follower_hidden。clear_ch3.ts が立てる）。
//   - ツガオ便は交番のそば（東の通り）で止まっていて、ツガオが起きている。〔c4〕「おう！ しゅん！
//     今日は 寝とらんぞ！ ……昼寝は するがな！」→「乗ってくか？」で海ぞいの町（港）へ。
//     港の軽トラに話すと、夕鳴町へもどる。
//   - 海ぞいの町は 12:01 以降の午後（段階4）。旧水族館は開館の準備中：入口にポコシャ（受付）と
//     エゴ（入館の打刻）、ヒロスケは港の軽トラのそば。

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, setFlag, type Dir } from '../../game/state';
import { despawn, healParty, registerScript } from '../../world/api';
import { registerWorldFx } from '../../world/fx';
import type { FieldScene } from '../../world/field';
import type { MapObj } from '../../world/types';
import { hasChar } from '../../art/chars/registry';
import * as T from '../../data/text/c3_story4';
import { F } from '../lib';
import { se } from '../ch2/compat';
import { addToMap, say3 } from './common';
import { jumpMap, spawnTruck } from './prologue';
import { offerFushigiCh3 } from './fushigi';

const after = (): boolean => flag('flag_ch3_clear') > 0;
const NPC = (o: Record<string, unknown>): MapObj => ({ t: 'npc', ...o }) as unknown as MapObj;
const CLEAR = { flag: 'flag_ch3_clear' };

// ---------------------------------------------------------------- 夕鳴町 (銀座の朝)

addToMap('map_town', [
  NPC({ id: 'c3_kn_shop', sprite: hasChar('npc_kanenari_cook') ? 'npc_kanenari_cook' : 'kanenari', x: 28, y: 22, dir: 'down', script: 'c3_kn_shop', cond: CLEAR }),
]);

registerScript('c3_kn_shop', function* (): Co {
  if (!after()) return;
  const i = yield* say3(T.C4_KN_ASK);
  if (i === 0) {
    se('se_fry', { vol: 0.5 });
    healParty(true);
    yield* say3(T.C4_KN_EAT);
  } else yield* say3(T.C4_KN_LATER);
});

/** The truck where it stands after the clear: 夕鳴町 by the koban, 海ぞいの町 at the harbour. */
const TRUCKS: Record<string, { x: number; y: number; dir: Dir }> = {
  map_town: { x: 45, y: 30, dir: 'down' },
  map_umizoi: { x: 23, y: 18, dir: 'right' },
};

registerWorldFx({
  map: '',
  update(f: FieldScene) {
    const at = TRUCKS[f.map.id];
    const want = !!at && after();
    const a = f.actorById('c3_truck_c4');
    if (!want) {
      if (a) despawn('c3_truck_c4');
      return;
    }
    if (!a) spawnTruck('c3_truck_c4', at.x, at.y, at.dir);
  },
});

registerScript('c3_truck_c4', function* (): Co {
  if (!after()) return;
  const town = F().map.id === 'map_town';
  if (town && !flag('flag_c3_c4_tsugao')) {
    setFlag('flag_c3_c4_tsugao', 1);
    yield* say3(T.C4_TSUGAO);
  }
  const i = yield* say3(T.C4_TSUGAO_ASK);
  if (i !== 0) return;
  se('se_truck_aori');
  yield* game.fadeOut(500, '#0B0B14');
  se('se_keitora_go', { vol: 0.5 });
  yield 700;
  if (town) jumpMap('map_umizoi', 21, 17, 'left');
  else jumpMap('map_town', 44, 28, 'up');
  F().syncFollower(true);
  yield 300;
  yield* game.fadeIn(600);
});

// ---------------------------------------------------------------- 旧水族館（開館の準備中）

addToMap('map_c3_aq_iriguchi', [
  NPC({ id: 'c3_poko_c4', sprite: 'npc_pokosha', x: 6, y: 9, dir: 'right', script: 'c3_poko_c4', cond: CLEAR }),
  NPC({ id: 'c3_ego_c4', sprite: hasChar('npc_dakoku_daisha') ? 'npc_dakoku_daisha' : 'npc_dakoku', x: 9, y: 5, dir: 'down', script: 'c3_ego_c4', cond: CLEAR }),
]);
addToMap('map_umizoi', [NPC({ id: 'c3_hiro_c4', sprite: 'npc_hirosuke', x: 22, y: 16, dir: 'down', script: 'c3_hiro_c4', cond: CLEAR })]);

registerScript('c3_poko_c4', function* (): Co {
  yield* say3(T.C4_POKOSHA);
});
registerScript('c3_hiro_c4', function* (): Co {
  yield* say3(T.C4_HIROSUKE);
});
registerScript('c3_ego_c4', function* (): Co {
  yield* say3(T.C4_EGO);
  se('se_dakoku', { vol: 0.6 });
  // fushigi_ch3_10, if it was not pressed in S28
  if (!flag('flag_fushigi_ch3_10')) {
    yield* say3(T.FUSHIGI10_SEEN);
    yield* offerFushigiCh3('fushigi_ch3_10');
  }
});

// the glass door opens from inside again after the clear (in: W's door_c3_aq, stage 3+)
addToMap('map_c3_aq_iriguchi', [{ t: 'door', id: 'door_c3_aq_glass_out_c4', x: 7, y: 11, w: 2, to: 'map_umizoi', tx: 74, ty: 29, dir: 'down', se: 'se_door_glass', cond: CLEAR } as unknown as MapObj]);

// ---------------------------------------------------------------- 事務所の物（60 9.5。S25 は通るだけ、調べるのはクリア後）

for (const [id, text] of Object.entries(T.JIMU))
  registerScript(id, function* (): Co {
    se('se_examine');
    yield* say3(text);
  });
registerScript('obj_c3_jimu_kairan', function* (): Co {
  se('se_examine');
  // the last page says 『解散』 after S28
  yield* say3(flag('flag_ch3_boss_beaten') ? T.JIMU_KAIRAN : T.JIMU_KAIRAN_BEFORE);
});
