// Default scripts for the interiors and the mall, written from 10_narrative
// (5.4, 5.5, 5.15, 5.17, 5.22, 6.5 f05, 7.17, 8.12, 12.2, 13.3) so every map
// works on its own. The scenario module (src/events) is imported after the
// world and re-registers the same ids with its full staging; registerScript
// replaces, so those always win and these stay as the fallback.

import type { Co } from '../../engine/co';
import { addItem, flag, setFlag, state } from '../../game/state';
import { getItem } from '../battle';
import { field } from '../../world/field';
import { cameraBack, cameraPan } from '../../world/api';
import { fushigiDone, fushigiCount, registerFushigi } from '../../world/fushigi';
import { runMsg } from '../../world/msg';
import { registerScript, type ScriptCtx } from '../../world/scripts';
import { choose } from '../../ui/dialog';
import * as snd from '../../world/audio';
import { hud } from '../../world/hud';
import {
  EVT_MAIGO_DOOR_FLIP,
  EVT_MAIGO_DOOR_LOCKED,
  EVT_MAIGO_DOOR_OPEN,
  EVT_MAIGO_REST,
  EVT_MALL_ENTER,
  EVT_MARUYAMA_FIRST_A,
  EVT_MARUYAMA_FIRST_B,
  EVT_OBAA_FIRST,
  EVT_OBAA_FIRST_MEAT,
  EVT_OBAA_FIRST_NOMEAT,
  EVT_SAVE_BENCH,
  GACHA_M1_MORE,
  GACHA_M1_TURN,
  INUI_F05,
  IOBJ,
  IREWARD2,
  IREWARD3,
  IRESTORED,
  KAITENYAKI_PRESSED,
  KAITENYAKI_SEEN,
  YAKINAMES,
  YAKINAMES_KANA,
} from './interior_text';

const itemName = (id: string) => getItem(id)?.name ?? id;

/** HUD clock step for the first shop visited (4.1: the first shop → 16:58). */
function firstShopClock(): void {
  if (!flag('flag_met_maruyama') && !flag('flag_met_obaa') && flag('flag_clock') < 2) {
    setFlag('flag_clock', 2);
    hud.setTime(null);
    hud.show();
    snd.se('se_clock_flip');
  }
}

// ---------------------------------------------------------------- 5.4 / 5.5 first visits

registerScript('evt_maruyama_first', function* () {
  if (flag('flag_met_maruyama')) return;
  yield 300;
  yield* runMsg(EVT_MARUYAMA_FIRST_A);
  yield* runMsg(EVT_MARUYAMA_FIRST_B);
  firstShopClock();
  setFlag('flag_met_maruyama', 1);
});

registerScript('evt_obaa_first', function* () {
  if (flag('flag_met_obaa')) return;
  yield 300;
  yield* runMsg(EVT_OBAA_FIRST);
  yield* runMsg(flag('flag_met_maruyama') ? EVT_OBAA_FIRST_MEAT : EVT_OBAA_FIRST_NOMEAT);
  firstShopClock();
  setFlag('flag_met_obaa', 1);
});

// ---------------------------------------------------------------- 6.5 乾: the f05 line once after fushigi_05

registerScript('npc_inui', function* (ctx: ScriptCtx) {
  if (fushigiDone('fushigi_05') && !flag('flag_seen_npc_inui_f05')) {
    setFlag('flag_seen_npc_inui_f05', 1);
    yield* runMsg(INUI_F05);
    return;
  }
  yield* ctx.runDefault();
});

// ---------------------------------------------------------------- 7.17 hidden items (2nd examine)

function* hidden(id: string, item: string, flagId: string): Co {
  snd.se('se_examine');
  if (flag(flagId)) {
    yield* runMsg(IREWARD3[id]);
    return;
  }
  if (!flag('flag_seen_' + id)) {
    setFlag('flag_seen_' + id, 1);
    yield* runMsg(String(IOBJ[id]));
    return;
  }
  yield* runMsg(IREWARD2[id]);
  if (addItem(item)) {
    setFlag(flagId, 1);
    snd.se('se_item');
    yield* runMsg(`@sys
${itemName(item)}を 手に入れた！`);
  } else
    yield* runMsg(`@narr
もちものが いっぱいだ。`);
}
registerScript('obj_tray_return', () => hidden('obj_tray_return', 'item_fugashi', 'flag_hidden_tray'));
registerScript('obj_body_scale', () => hidden('obj_body_scale', 'item_hakka_ame', 'flag_hidden_scale'));

// ---------------------------------------------------------------- 13.3 restored objects

for (const [id, text] of Object.entries(IRESTORED))
  registerScript(id, function* () {
    snd.se('se_examine');
    yield* runMsg(text);
  });

// ---------------------------------------------------------------- 5.15 evt_mall_enter

registerScript('evt_mall_enter', function* () {
  if (flag('flag_mall_entered')) return;
  setFlag('flag_mall_entered', 1);
  if (field()) {
    // entrance → fountain, 3 tiles, and back (1.6 s)
    yield 200;
    yield* cameraPan(10, 10, 800);
    yield 200;
    yield* runMsg(EVT_MALL_ENTER);
    yield* cameraBack(600);
  } else yield* runMsg(EVT_MALL_ENTER);
});

// ---------------------------------------------------------------- 12.2 the M1 gacha corner

registerScript('obj_gacha_corner', function* () {
  snd.se('se_examine');
  yield* runMsg(String(IOBJ.obj_gacha_corner));
  yield* runMsg(GACHA_M1_MORE);
  const i = yield* runMsg(`@sys
回す？（100円）
? 回す | やめておく`);
  if (i !== 0) return;
  const bag = state.inventory.filter((id) => !(getItem(id) as { key?: boolean } | undefined)?.key).length;
  if (bag >= 14) {
    yield* runMsg(`@narr
もちものが いっぱいだ。{w=300}
回すのは、やめておこう。`);
    return;
  }
  if (state.money < 100) {
    yield* runMsg(`@narr
100円玉が ない。`);
    return;
  }
  state.money -= 100;
  snd.se('se_gacha');
  yield 700;
  yield* runMsg(GACHA_M1_TURN);
  state.inventory.push('item_capsule');
  snd.se('se_item');
  yield* runMsg(`@sys
ガチャの カプセルを 手に入れた！`);
  setFlag('flag_gacha_count', flag('flag_gacha_count') + 1);
  if (flag('flag_gacha_count') === 3)
    yield* runMsg(`@narr
カプセルが、夕日に すけて
きれいだ。`);
});

// ---------------------------------------------------------------- 8.12 fushigi_12 / evt_kaitenyaki

registerFushigi({
  id: 'fushigi_12',
  stage: '0+',
  seen: KAITENYAKI_SEEN,
  pressed: KAITENYAKI_PRESSED,
  after: `@narr
回転焼き機は 止まっている。`,
});

registerScript('evt_kaitenyaki', function* () {
  snd.se('se_examine');
  if (fushigiDone('fushigi_12')) {
    const n = Math.max(1, Math.min(3, flag('flag_yakiname') || 3));
    yield* runMsg(`@narr
回転焼き機は 止まっている。{w=300}
焼き型に 小さく、
『${YAKINAMES[n - 1]}』と 刻まれている。`);
    return;
  }
  yield* runMsg(KAITENYAKI_SEEN);
  if (!flag('flag_got_hanko')) return;
  const i = yield* runMsg(`@sys
『みました』を 押しますか？
? 押す | やめておく`);
  if (i !== 0) return;
  snd.se('se_stamp');
  setFlag('flag_fushigi_12', 1);
  snd.se('se_kaitenyaki_stop');
  snd.stopAmbient('amb_kaitenyaki', 1.2);
  yield 1200;
  yield* runMsg(KAITENYAKI_PRESSED);
  const k = yield* choose(YAKINAMES);
  setFlag('flag_yakiname', k + 1);
  yield* runMsg(`@回転焼き機:vending
${YAKINAMES_KANA[k]}`);
  yield* runMsg(`@回転焼き機:vending
……ソウ 呼ンデ モラエルナラ、
ナンデモ ヨカッタ。`);
  snd.se('se_coin');
  yield 300;
  addItem('item_maigo_key');
  setFlag('flag_got_maigo_key', 1);
  snd.bgm('bgm_jingle_item', 0);
  yield* runMsg(`@sys
迷子センターの カギを
手に入れた！`);
  if (flag('flag_kanenari_joined')) {
    yield* runMsg(`@flip
ぼくは 大判焼き派です。`);
    yield* runMsg(k === 1 ? `@flip
（気が 合いますね）` : `@flip
（でも、いい 名前です）`);
  }
  yield* runMsg(`@sys
ハンコケースに 新しい ハンコが
浮かびあがった。
/
{c=#E23B2E}やりなおし{/c}が 使えるように なった！`);
  const mi = state.party.find((m) => m.id === 'minato');
  if (mi) mi.mp = Math.min(mi.maxMp, mi.mp + 2);
  yield* runMsg(`@sys
朱肉が 2 たまった。
/
みました帳に 書きこんだ。
（ふしぎ ${fushigiCount()}/12）`);
  field()?.applyAudio(false);
  snd.stopAmbient('amb_kaitenyaki', 0.3);
});

// ---------------------------------------------------------------- 5.17 evt_maigo_door

registerScript('evt_maigo_door', function* () {
  snd.se('se_examine');
  if (flag('flag_maigo_door_open')) {
    yield* runMsg(`@narr
迷子センターの 扉。{w=300}
カギは 開いている。`);
    return;
  }
  if (!flag('flag_got_maigo_key')) {
    yield* runMsg(EVT_MAIGO_DOOR_LOCKED);
    return;
  }
  yield* runMsg(EVT_MAIGO_DOOR_OPEN);
  snd.se('se_door_heavy');
  setFlag('flag_maigo_door_open', 1);
  yield 500;
  if (flag('flag_kanenari_joined')) yield* runMsg(EVT_MAIGO_DOOR_FLIP);
});

registerScript('trig_maigo_door_rest', function* () {
  if (!flag('flag_kanenari_joined')) return;
  yield* runMsg(EVT_MAIGO_REST);
});

// ---------------------------------------------------------------- M5: the faded mascot poster

registerScript('obj_maigo_poster', function* () {
  snd.se('se_examine');
  yield* runMsg(String(IOBJ.obj_maigo_poster));
  if (flag('flag_kanenari_joined'))
    yield* runMsg(`@flip
（……ぼくです）`);
});

// ---------------------------------------------------------------- 5.22 evt_save_bench

registerScript('evt_save_bench', function* () {
  snd.se('se_examine');
  yield* runMsg(EVT_SAVE_BENCH);
  for (const m of state.party) {
    m.hp = m.maxHp;
    m.mp = m.maxMp;
  }
  snd.se('se_heal');
  const i = yield* runMsg(`@sys
HPと 朱肉が 回復した。
/
……セーブしますか？
? する | しない`);
  if (i === 0) {
    yield* runMsg(`!save
@sys
セーブした。`);
  }
});
