// 第1章〔懸垂〕（10_narrative 6.6・7.9、30_level_art 9.1、02_ch2_index #64）
//
// ワイスタ巡査 loves his pull-ups — 「あそこの 公園の 鉄棒は いいぞー！」. At
// stages 1–2 the park's bar (obj_tetsubo) asks 懸垂に 挑戦する / やめておく:
// しゅん walks under the high bar, jumps up to it (minato_hang), trembles
// (the anim 'pullup', about 1.9 s) and drops — not one. The first time, while
// he still hangs, 「……うっ。あごが、鉄棒まで とどかない。」, and on the ground
// 「懸垂、0回。」 (with カネナリくん watching at stage 2: 「（ぼくは 鐘が 重いので
// 見学です）」). flag_kensui_try counts the tries.
//
// At the police box, the next talk after a try (once): 「挑戦してきたね！ 顔で
// 分かるよ！」 — his salute let go for once (pose 'grin'), then he tears a page
// from his notebook and draws a はなまる in red: item_hanamaru_kensui
// (flag_got_hanamaru_kensui). From then on, the line of his stage that repeats
// is his own count (「本官は 本日も、懸垂 12回で あります！」); the stage's
// other lines — and his 口癖, once a stage — are still said first.
//
//   __game.cmd.kensuiText()   every page against 3 lines × 336 px (wrapCheck asks it too)

import type { Co } from '../engine/co';
import { animate, ease } from '../engine/tween';
import { measure } from '../engine/font';
import { flag, setFlag } from '../game/state';
import { registerDebug } from '../debug';
import { actor, emote, msg, registerScript, se, stage, stopAnim, walkPx } from '../world/api';
import { field } from '../world/field';
import { pickTalk } from '../world/interact';
import { NPC } from '../data/text/npcs';
import {
  KENSUI_AGAIN,
  KENSUI_ASK,
  KENSUI_BRAG,
  KENSUI_FLIP,
  KENSUI_GET,
  KENSUI_KOBAN_1,
  KENSUI_KOBAN_2,
  KENSUI_KOBAN_3,
  KENSUI_KOBAN_4,
  KENSUI_KOBAN_5,
  KENSUI_TEXTS,
  KENSUI_TRY1_DOWN,
  KENSUI_TRY1_HANG,
} from '../data/text/kensui';
import { HANG_GRIP_ROW, HANG_H } from '../art/chars/people/minato';
import { getKeyItem, stageKeys, walkTo } from './lib';
import { puff } from './fx';

/** The high bar of obj_tetsubo (21–23, 3): its middle and its top line, in world px (30 3.5). */
const BAR_X = 375;
const BAR_Y = 37;

/** Is カネナリくん with him and in sight (stage 2)? */
function kanenariWatching(): boolean {
  const f = field();
  return !!flag('flag_kanenari_joined') && !!f?.follower?.visible;
}

/** Under the high bar, up to it, the trembling, and down again. `talk` runs while he still hangs. */
function* pullUp(talk: string | null): Co {
  const f = field();
  if (!f) return;
  const p = f.player;
  const y0 = p.y;
  if (Math.abs(p.x - BAR_X) > 1) yield* walkPx('player', BAR_X, y0, 2.5);
  // round to face the camera, and a little jump up to the bar
  p.dir = 'down';
  yield 160;
  const hy = BAR_Y + HANG_H - HANG_GRIP_ROW;
  p.setSprite('minato_hang');
  p.pose = 'hang';
  yield* animate(170, (k) => (p.y = y0 + (hy - y0) * k), ease.quadOut);
  p.y = hy;
  se('se_step_metal', { pitch: 1.35, vol: 0.8 });
  yield 200;
  p.playAnim('pullup');
  while (!p.animDone()) yield 16;
  stopAnim('player');
  yield 120;
  if (talk) yield* msg(talk);
  // let go: down on his feet
  p.setSprite('minato');
  p.pose = null;
  yield* animate(130, (k) => (p.y = hy + (y0 - hy) * k), ease.quadIn);
  p.y = y0;
  se('se_step_dirt', { vol: 0.9 });
  puff(p.x, y0 - 1);
  yield 260;
}

registerScript('obj_tetsubo', function* (ctx): Co {
  const s = stage();
  if (s < 1 || s > 2) {
    yield* ctx.runDefault();
    return;
  }
  se('se_examine');
  const i = yield* msg(KENSUI_ASK);
  if (i !== 0) return;
  const n = flag('flag_kensui_try');
  yield* pullUp(n ? null : KENSUI_TRY1_HANG);
  setFlag('flag_kensui_try', n + 1);
  if (n) yield* msg(KENSUI_AGAIN);
  else {
    yield* msg(KENSUI_TRY1_DOWN);
    if (kanenariWatching()) {
      const k = field()?.follower;
      const p = field()?.player;
      if (k && p) k.dir = Math.abs(k.x - p.x) > Math.abs(k.y - p.y) ? (k.x < p.x ? 'right' : 'left') : k.y < p.y ? 'down' : 'up';
      yield* msg(KENSUI_FLIP);
    }
  }
  // facing the bar again: Z tries once more
  const f = field();
  if (f) f.player.dir = 'up';
});

// ---------------------------------------------------------------- 6.6 ワイスタ巡査

/** 〔懸垂〕 at the police box: once, the talk after a try. */
function* kobanHanamaru(): Co {
  const f = field();
  const a = actor('npc_tsurumi');
  // in front of his desk, face to face (he stands at (4,4))
  if (f && a && (f.player.tileX !== a.tileX || f.player.tileY !== a.tileY + 1)) {
    yield* walkTo('player', a.tileX, a.tileY + 1, { face: 'up', vertFirst: true });
  }
  if (f) f.player.dir = 'up';
  if (a) {
    a.data.scripted = true;
    a.dir = 'down';
    yield* emote('npc_tsurumi', 'exclaim', { wait: false });
    yield 300;
    a.pose = 'grin';
  }
  yield* msg(KENSUI_KOBAN_1);
  yield* msg(KENSUI_KOBAN_2);
  if (a) {
    a.pose = null;
    a.hop(2, 160);
  }
  se('se_emote_sweat', { vol: 0.7 });
  yield 200;
  yield* msg(KENSUI_KOBAN_3);
  // a page torn out of his notebook, the red pen
  if (a) a.pose = 'note';
  se('se_paper_open', { pitch: 1.2, vol: 0.7 });
  yield 350;
  se('se_pen_write');
  yield* msg(KENSUI_KOBAN_4);
  setFlag('flag_got_hanamaru_kensui', 1);
  yield* getKeyItem('item_hanamaru_kensui', KENSUI_GET);
  yield* msg(KENSUI_KOBAN_5);
  if (a) {
    a.pose = null;
    delete a.data.scripted;
  }
}

registerScript('npc_tsurumi', function* (): Co {
  const s = stage();
  if (s >= 3) return;
  if (flag('flag_kensui_try') && !flag('flag_got_hanamaru_kensui')) {
    yield* kobanHanamaru();
    return;
  }
  const t = stageKeys(NPC.npc_tsurumi);
  // the lines of his stage, and how many he has said (the last one repeats)
  const lines = Object.keys(t).filter((k) => k.startsWith(`s${s}_`)).length;
  const said = flag(`flag_seen_npc_tsurumi_s${s}`);
  const key = pickTalk('npc_tsurumi', t);
  if (!key) return;
  if (flag('flag_got_hanamaru_kensui') && lines && said >= lines) {
    yield* msg(KENSUI_BRAG);
    return;
  }
  yield* msg(t[key]);
});

// ---------------------------------------------------------------- QA

/** Every page of 〔懸垂〕: at most 3 lines, each at most 336 px (10 1.1). */
export function kensuiTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  for (const [name, src] of Object.entries(KENSUI_TEXTS)) {
    let lines: string[] = [];
    const flush = () => {
      if (!lines.length) return;
      pages++;
      if (lines.length > 3) bad.push(`${name}: ${lines.length} lines: ${lines.join('／')}`);
      lines = [];
    };
    for (const raw of src.split('\n')) {
      const t = raw.trim();
      if (!t || t.startsWith('>')) continue;
      if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || /^\[.*\]$/.test(t)) {
        flush();
        continue;
      }
      const w = measure(t.replace(/\{[^}]*\}/g, ''));
      if (w > 336) bad.push(`${name}: ${w}px: ${t}`);
      lines.push(t);
    }
    flush();
  }
  return { pages, bad };
}
registerDebug('kensuiText', () => kensuiTextCheck());
