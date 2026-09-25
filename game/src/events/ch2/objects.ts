// The examinables of 星見台 whose words change with what has happened
// (50_ch2_story 9章): the ticket machine, the hidden ink pads and the pickled
// plum (隠しアイテム), the gate, the round's book, the cows of the same pen,
// the fallen signboard, まつ先生's bar, the circular that came back. Every
// other object is read by the field itself from its text (data/text/
// hoshi_objects via the maps' htext(): plain, or stage keys h0 / 'h1+'),
// and the ふしぎ go through fushigi.ts. The 「思いだした姿」 too.

import type { Co } from '../../engine/co';
import { flag, setFlag } from '../../game/state';
import { registerScript, type ScriptCtx } from '../../world/api';
import { field } from '../../world/field';
import { runMsg } from '../../world/msg';
import { HOSHI_OBJ, HOSHI_RESTORED } from '../../data/text/hoshi_objects';
import { quietItem } from '../stage';
import { se } from './compat';
import { hStage, pickHText } from './common';

/** A named part of an object's text record ('text', 'get', 'again' …). */
function part(id: string, key: string): string {
  const v = HOSHI_OBJ[id];
  if (typeof v === 'string') return key === 'text' ? v : '';
  return v?.[key] ?? '';
}

/**
 * A hidden item (9章 ★, 51 6.2): the text, then — once — the item with its
 * @sys line (a full bag says so and leaves it there); later the `again` text.
 */
function hidden(id: string, item: string, flagId: string): void {
  registerScript(id, function* (): Co {
    se('se_examine');
    if (flag(flagId)) {
      yield* runMsg(part(id, 'again'));
      return;
    }
    yield* runMsg(part(id, 'text'));
    const ok = yield* quietItem(item);
    if (!ok) {
      yield* runMsg(`@narr\nもちものが いっぱいだ。`);
      return;
    }
    setFlag(flagId, 1);
    se('se_item');
    yield* runMsg(part(id, 'get'));
  });
}

hidden('obj_hoshi_soko_box', 'item_kairan_shuniku', 'flag_ch2_hidden_soko');
hidden('obj_hoshi_shokuin_desk', 'item_kairan_shuniku', 'flag_ch2_hidden_shokuin');
hidden('obj_hoshi_engawa', 'item_umeboshi', 'flag_ch2_hidden_engawa');

/** 9.1 整理券の機械: one ticket (se_item only, no jingle), 1人 1枚. */
registerScript('obj_hoshi_seiriken', function* (): Co {
  se('se_examine');
  if (flag('flag_ch2_seiriken')) {
    yield* runMsg(part('obj_hoshi_seiriken', 'again'));
    return;
  }
  se('se_h_seiriken');
  yield* runMsg(part('obj_hoshi_seiriken', 'text'));
  const ok = yield* quietItem('item_seiriken');
  setFlag('flag_ch2_seiriken', 1);
  se('se_item');
  if (ok) yield* runMsg(part('obj_hoshi_seiriken', 'get'));
});

/** 9.3 鉄棒: the second look, while まつ先生 is in the gathering room (h0–h1). */
registerScript('obj_hoshi_tetsubou', function* (): Co {
  se('se_examine');
  const seen = flag('flag_seen_obj_hoshi_tetsubou') > 0;
  setFlag('flag_seen_obj_hoshi_tetsubou', 1);
  yield* runMsg(seen && hStage() <= 1 ? part('obj_hoshi_tetsubou', 'second') : part('obj_hoshi_tetsubou', 'text'));
});

/** 9.3 区長の家の玄関の台: the circular came back after fushigi_ch2_04. */
registerScript('obj_hoshi_kucho_house', function* (): Co {
  se('se_examine');
  yield* runMsg(flag('flag_fushigi_ch2_04') ? part('obj_hoshi_kucho_house', 'after_f04') : part('obj_hoshi_kucho_house', 'text'));
});

/** 9.5 電気柵のゲート: before / after マサルさん opened it. */
registerScript('obj_hoshi_gate', function* (): Co {
  se('se_examine');
  yield* runMsg(flag('flag_ch2_gate_open') ? part('obj_hoshi_gate', 'open') : part('obj_hoshi_gate', 'text'));
});

/** 9.5 牛: the same pen the second time on (each placement counts for itself). */
registerScript('obj_hoshi_cow', function* (ctx: ScriptCtx): Co {
  se('se_examine');
  const k = `flag_seen_${ctx.source}`;
  const seen = flag(k) > 0;
  setFlag(k, 1);
  yield* runMsg(seen ? part('obj_hoshi_cow', 'second') : part('obj_hoshi_cow', 'text'));
});

/** 9.5 見回り帳: the empty row of 南5 → 『良し』 after the round → the chores' line. */
registerScript('obj_hoshi_mimawari', function* (): Co {
  se('se_examine');
  const key = flag('flag_ch2_barn_work') ? 'worked' : flag('flag_ch2_got_otsukare') ? 'done' : 'text';
  yield* runMsg(part('obj_hoshi_mimawari', key));
});

/** 9.8 倒れた案内板: he stands it up the first time (the prop reads the seen flag). */
registerScript('obj_hoshi_kanbou_board', function* (): Co {
  se('se_examine');
  if (flag('flag_seen_obj_hoshi_kanbou_board')) {
    yield* runMsg(part('obj_hoshi_kanbou_board', 'again'));
    return;
  }
  yield* runMsg(part('obj_hoshi_kanbou_board', 'text'));
  se('se_step_wood', { pitch: 0.8 });
  setFlag('flag_seen_obj_hoshi_kanbou_board', 1);
});

// ---------------------------------------------------------------- 思いだした姿（restored_*, 6章）

for (const id of Object.keys(HOSHI_RESTORED))
  registerScript(id, function* (): Co {
    const f = field();
    if (!f || !f.map.id.startsWith('map_hoshi')) return;
    se('se_examine');
    const t = pickHText(HOSHI_RESTORED[id] as string | Record<string, string>);
    if (t) yield* runMsg(t);
  });
