// 二人十五脚（げむきか 10/5 の新しい案1。2026-10-05 依頼主の採用・変更あり：かずお→ピー・コック。
// 02_ch2_index #82、10_narrative 6.11〔ramune〕・6.23〔ramune〕・7.20・7.25、30_level_art 3.17）。
// テキストは data/text/kotei.ts、マップは data/maps/kotei.ts、絵は art/props/kotei.ts。npcs・cape_coffee の
// なんばるわんと コタロウの スクリプトを 包むので、events/index.ts で それらの あとに import する。
//
//   なんばるわんの家 map_madam：トロフィー棚の 参加賞の ラムネ（flag_hidden_madam）を 見つけたあと、段階1〜2・
//     グソっ君が いっしょの とき、ひじかけいすの ピー・コック（npc_kazuo）〔ramune〕（flag_kotei_kazuo）。
//   坂の なんばるわん〔ramune〕（flag_kotei_promise）→ 学校の ほうへ 歩いていく。flag_kotei_away の あいだ、
//     坂の なんばるわんと コタロウ、家の いすの ピー・コックは いない（校庭に いる）。
//   校庭 map_school_kotei：スタートの 線の なんばるわん・コタロウ、朝礼台の 階段の ピー・コック。だれかに 話すと
//     〔kotei〕：審判の ひとこと → はちまき → しばる → 二人十五脚 → 位置に ついて、よーい → 手を 1回 たたく →
//     走る（下の 拍の 札：「いち」で ←、「に」で →。ずれると 足が からまって 止まる。段階2 は とちゅうで
//     コタロウが 北東へ 引っぱる）→ 最後の カーブで グソっ君が あおむけ → なんばるわんが ゴールの 3歩 前で
//     止まって もどり、日傘の 柄で 起こす → 2組 ならんで 同着 → 朝礼台の 前で 30年 前の わけ → 朱肉 +2
//     （flag_kotei_done）→ 3人は 家へ 帰る。
//   そのあと：トロフィー棚の 文（紅白の はちまき『同着』）、家に もどった ピー・コックの 1回（flag_kotei_kazuo_after）。
//
// QA:
//   __game.cmd.kotei(step)    'kazuo'   段階1・グソっ君つき、ラムネを 見つけて なんばるわんの家の ピー・コックの 前
//                             'madam'   ピー・コックの 話の あと、坂の なんばるわんの 前
//                             'school'  約束の あと、裏庭の 西の 生け垣の 口の 前（左へ 押すと 校庭）
//                             'start'   校庭の スタートの 線の なんばるわんの 前（話すと はじまる）
//                             'race'    いきなり 走る ところから（はちまきの あと）
//                             'end'     走りおえて、家の ピー・コックの 前（〔after〕）
//                             'tsuna'   段階2：ヒキヅナを 直したあと、倉庫の 前（まるまった 綱）
//                             'reset'   この 案の フラグを もどす
//                             2つめの 引数 2 で 段階2（ヒキヅナと コタロウの 引っぱり）
//   __game.cmd.koteiAuto(on)  走る ところを 自動で（拍に あわせて ←→。通しテスト用）
//   __game.cmd.koteiState()   走って いる あいだの 数（しゅん組と なんばるわん組の 進み、拍、からまり）
//   __game.cmd.koteiText()    ページの 字の 幅（3行・336px）と 第1章の 禁句

import type { Co } from '../engine/co';
import { all, FRAME_MS } from '../engine/co';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { measure } from '../engine/font';
import { W } from '../engine/screen';
import { flag, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import type { Actor } from '../world/actor';
import { dirFromVec } from '../world/actor';
import { actor, fadeIn, fadeOut, msg, registerScript, registerWorldFx, stage } from '../world/api';
import { fxAt } from '../world/fx';
import { field } from '../world/field';
import { pickStage } from '../world/maps';
import { getScript, type ScriptCtx } from '../world/scripts';
import * as snd from '../world/audio';
import { sfx } from '../audio';
import { showBubble } from '../ui/bubble';
import { drawWindow, UI } from '../ui/window';
import { KOTEI_TRACK, lapLen, laneAt, lastCurveEnd } from '../art/props/kotei';
import {
  KOTEI_BUBBLE,
  KOTEI_FLIP,
  KOTEI_GUIDE,
  KOTEI_KAZUO_AFTER,
  KOTEI_KAZUO_RAMUNE,
  KOTEI_KOROBU,
  KOTEI_MADAM_RAMUNE,
  KOTEI_MEIBAMEN,
  KOTEI_RESTORED,
  KOTEI_START,
  KOTEI_TEXTS,
  KOTEI_TROPHY_AFTER,
  KOTEI_WAKE,
} from '../data/text/kotei';
import { addMp, F, grace, onMap, sendAway } from './lib';
import { keyGuide } from './stage';

const MAP = 'map_school_kotei';

/** This idea's flags. */
export const KF = {
  kazuo: 'flag_kotei_kazuo',
  promise: 'flag_kotei_promise',
  away: 'flag_kotei_away',
  done: 'flag_kotei_done',
  kazuoAfter: 'flag_kotei_kazuo_after',
  flip: 'flag_kotei_flip',
} as const;

/** Is グソっ君 walking with しゅん and in sight? */
function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower && f.follower.visible && flag('flag_kanenari_joined') > 0 && !flag('flag_follower_hidden');
}

const onDuty = (): boolean => stage() >= 1 && stage() <= 2;

/** Wrap the script registered before this file for `id` (or its placement data). */
function wrap(id: string, fn: (ctx: ScriptCtx, orig: (ctx: ScriptCtx) => Co) => Co): void {
  const prev = getScript(id);
  const orig = function* (ctx: ScriptCtx): Co {
    if (prev) yield* prev(ctx);
    else yield* ctx.runDefault();
  };
  registerScript(id, (ctx) => fn(ctx, orig));
}

function scripted(on: boolean, ...who: (Actor | null | undefined)[]): void {
  for (const a of who) {
    if (!a) continue;
    if (on) a.data.scripted = true;
    else delete a.data.scripted;
  }
}

// ================================================================ なんばるわんの家：ピー・コック

wrap('npc_kazuo', function* (ctx, orig): Co {
  if (onMap(MAP)) {
    yield* koteiTalk();
    return;
  }
  // after the race, home again: once, the rest of 〔s0_2〕
  if (flag(KF.done) && !flag(KF.kazuoAfter)) {
    setFlag(KF.kazuoAfter, 1);
    yield* msg(KOTEI_KAZUO_AFTER);
    return;
  }
  // the ramune found (even drunk since: the mark is flag_hidden_madam), グソっ君 here: 〔ramune〕
  if (flag('flag_hidden_madam') && onDuty() && kanenariHere() && !flag(KF.kazuo)) {
    setFlag(KF.kazuo, 1);
    yield* msg(KOTEI_KAZUO_RAMUNE);
    return;
  }
  yield* orig(ctx);
});

/** トロフィー棚：レースの あとは、ほこりの 丸の 上に はちまき（取ったあとの 文の かわり）。 */
wrap('obj_md_trophy', function* (ctx, orig): Co {
  if (flag('flag_hidden_madam') && flag(KF.done)) {
    snd.se('se_examine');
    yield* msg(pickStage(KOTEI_TROPHY_AFTER) ?? '');
    return;
  }
  yield* orig(ctx);
});

// ================================================================ 坂の なんばるわん〔ramune〕

function* madamRamune(): Co {
  const m = actor('npc_madam');
  const kt = actor('npc_kotaro');
  scripted(true, m, kt);
  try {
    yield* msg(KOTEI_MADAM_RAMUNE.a);
    yield* msg(KOTEI_MADAM_RAMUNE.b);
    yield* msg(KOTEI_MADAM_RAMUNE.michi);
  } finally {
    scripted(false, m, kt);
  }
  setFlag(KF.promise, 1);
  // off up the slope to the park and the school beyond it (they are at the school ground from now on)
  if (m) sendAway(m, [[17, 21], [19, 21], [19, 15], [19, 4]], 2.4);
  if (kt) sendAway(kt, [[16, 21], [18, 21], [18, 15], [18, 4]], 2.4, 120);
  setFlag(KF.away, 1);
}

wrap('npc_madam', function* (ctx, orig): Co {
  if (onMap(MAP)) {
    yield* koteiTalk();
    return;
  }
  if (onMap('map_town') && flag(KF.kazuo) && !flag(KF.promise) && onDuty() && kanenariHere()) {
    yield* madamRamune();
    return;
  }
  yield* orig(ctx);
});

wrap('npc_kotaro', function* (ctx, orig): Co {
  if (onMap(MAP)) {
    yield* koteiTalk();
    return;
  }
  yield* orig(ctx);
});

// グソっ君 on the school ground: his line of the place once, then his usual
registerScript('kanenari_' + MAP, function* (ctx): Co {
  if (!flag(KF.flip)) {
    setFlag(KF.flip, 1);
    yield* msg(KOTEI_FLIP);
    return;
  }
  yield* ctx.runDefault();
});

registerScript('lv_in_kotei', function* (): Co {
  race.on = false;
  race.tied = false;
});

// ================================================================ the race's state (read by the fx and the panel)

const T = KOTEI_TRACK;
const L1 = lapLen(T.r1);
const L2 = lapLen(T.r2);
/** ms per beat (いち / に), the window either side of it, the outer lane's px per good step. */
const BEAT = 480;
const WIN = 175;
const STEP = 10;
const V_NOM = (STEP / BEAT) * 1000;
const TANGLE_MS = 950;
/** The pairs' members either side of their lane's middle (px). */
const OFF = 6;
/** Where the judge stands: just outside the outer line, a step east of the goal line. */
const JUDGE: [number, number] = [T.goalX + 12, T.cy - T.lines[2] - 12];

export const race = {
  on: false,
  /** しゅん's right foot and グソっ君's lowest right leg are tied (the hachimaki is drawn). */
  tied: false,
  /** lap fractions: しゅん's pair, なんばるわん's pair */
  uP: 0,
  uM: 0,
  credit: 0,
  tangle: 0,
  tangles: 0,
  /** race time (ms) since the clap; the first beat comes at LEAD */
  t: 0,
  usedBeat: -1,
  /** the beat being shown, and the last judgement (1 good, -1 tangle) with its time */
  beat: -1,
  judge: 0,
  judgeT: -9999,
  /** stage 2: コタロウ's pull to the north-east (ms since it began, -1 = not yet, -2 = over) */
  pull: -1,
  auto: false,
};
const LEAD = 900;

// ================================================================ placing the runners

/** Hold an actor at (x, y) facing along (tx, ty), walking when `moving`. */
function put(a: Actor, x: number, y: number, tx: number, ty: number, moving: boolean): void {
  a.faceLock = true;
  a.dir = dirFromVec(tx, ty, a.dir);
  if (moving) {
    a.pathSpeed = 100000;
    a.path = [
      [x, y],
      [x + tx * 6, y + ty * 6],
    ];
  } else {
    a.path = [];
    a.x = x;
    a.y = y;
    a.moving = false;
  }
}

/** A pair on its lane at lap fraction u: `inner` on the infield side, `outer` outside; (ox, oy) an extra offset. */
function putPair(inner: Actor, outer: Actor, r: number, u: number, moving: boolean, extra: [number, number, number, number] = [0, 0, 0, 0]): void {
  const q = laneAt(r, u * lapLen(r));
  put(inner, q.x - q.nx * OFF + extra[0], q.y - q.ny * OFF + extra[1], q.tx, q.ty, moving);
  put(outer, q.x + q.nx * OFF + extra[2], q.y + q.ny * OFF + extra[3], q.tx, q.ty, moving);
}

function releaseRunner(a: Actor | null | undefined): void {
  if (!a) return;
  a.faceLock = false;
  a.path = [];
  a.moving = false;
}

// ================================================================ 校庭：はじめる 前

function* koteiTalk(): Co {
  if (!flag(KF.away) || flag(KF.done) || !onDuty()) return;
  if (!kanenariHere()) return;
  const f = F();
  const p = f.player;
  const k = f.follower!;
  const m = actor('npc_madam');
  const kt = actor('npc_kotaro');
  const kz = actor('npc_kazuo');
  if (!m || !kt || !kz) return;
  scripted(true, m, kt, kz, k);
  try {
    // the judge gets up from the platform's step
    kz.pose = null;
    kz.ox = 0;
    kz.oy = 0;
    kz.dir = 'right';
    kz.lift = 90;
    yield 250;
    yield* msg(KOTEI_START.kazuo);
    yield* msg(KOTEI_START.hachimaki);
    // everyone to the start: the judge outside the line, the pairs on their lanes
    yield* fadeOut(300);
    putPair(kt, m, T.r1, 0, false);
    putPair(p, k, T.r2, 0, false);
    put(kz, JUDGE[0], JUDGE[1], -1, 0, false);
    kz.dir = 'down';
    f.snapCamera();
    yield* fadeIn(300);
    race.tied = true;
    sfx('se_kotei_hachimaki');
    yield 300;
    yield* msg(KOTEI_START.shibaru);
    sfx('se_wakime_legs');
    k.hop(2, 160);
    yield 300;
    yield* msg(KOTEI_START.washa);
    yield* runRace();
  } finally {
    race.on = false;
    race.tied = false;
    for (const a of [p, k, m, kt, kz]) releaseRunner(a);
    scripted(false, k);
    // (the three stay scripted until they have walked home: sendAway lets them go)
    if (!flag(KF.done)) scripted(false, m, kt, kz);
    // グソっ君 walks on from where he stands (not back along the old trail)
    f.trail = [];
  }
}

// ================================================================ the race

function* runRace(): Co {
  const f = F();
  const p = f.player;
  const k = f.follower!;
  const m = actor('npc_madam')!;
  const kt = actor('npc_kotaro')!;
  const kz = actor('npc_kazuo')!;
  const s2 = stage() === 2;
  Object.assign(race, { on: true, tied: true, uP: 0, uM: 0.012, credit: 0, tangle: 0, tangles: 0, t: 0, usedBeat: -1, beat: -1, judge: 0, judgeT: -9999, pull: s2 ? -1 : -2 });
  putPair(kt, m, T.r1, race.uM, false);
  putPair(p, k, T.r2, 0, false);
  yield* msg(KOTEI_START.yoi);
  // the one clap (no pistol)
  kz.playAnim('clap');
  yield 200;
  sfx('se_kotei_clap');
  yield 160;
  const panel = new KoteiPanel();
  game.ui.push(panel);
  keyGuide(
    [
      [['left'], KOTEI_GUIDE.ichi],
      [['right'], KOTEI_GUIDE.ni],
    ],
    6500,
  );
  const uTrip = lastCurveEnd(T.r2);
  let jutaiAt = -99999;
  let pullSaid = false;
  try {
    while (race.uP < uTrip) {
      const dt = FRAME_MS;
      race.t += dt;
      // ---- the metronome: 「いち」 on even beats, 「に」 on odd ones
      const nb = Math.floor((race.t - LEAD) / BEAT);
      if (race.t >= LEAD && nb > race.beat) {
        race.beat = nb;
        sfx(nb % 2 ? 'se_kotei_ni' : 'se_kotei_ichi');
      }
      // ---- the keys
      if (race.tangle > 0) {
        race.tangle -= dt;
        if (race.tangle <= 0) k.oy = 0;
      } else {
        let key = -1;
        const L = game.input.pressed('left');
        const R = game.input.pressed('right');
        if (L !== R) key = L ? 0 : 1;
        else if (L && R) key = 2;
        // (QA) the auto runner presses on the beat
        if (race.auto && key < 0 && race.t >= LEAD) {
          const near = Math.round((race.t - LEAD) / BEAT);
          if (near > race.usedBeat && Math.abs(race.t - (LEAD + near * BEAT)) < FRAME_MS) key = near % 2;
        }
        if (key >= 0) {
          const near = Math.round((race.t - LEAD) / BEAT);
          const off = race.t - (LEAD + near * BEAT);
          const ok = near >= 0 && near > race.usedBeat && key === near % 2 && Math.abs(off) <= WIN;
          if (ok) {
            race.usedBeat = near;
            race.credit += STEP;
            race.judge = 1;
            race.judgeT = race.t;
            sfx('se_kotei_step');
          } else {
            // out of step: グソっ君's legs knot up and they stop for a moment
            race.tangle = TANGLE_MS;
            race.tangles++;
            race.credit = 0;
            race.judge = -1;
            race.judgeT = race.t;
            sfx('se_kotei_tangle');
            k.showEmote('sweat', 900);
            k.oy = -1;
            if (race.t - jutaiAt > 3500) {
              jutaiAt = race.t;
              showBubble('kanenari', KOTEI_BUBBLE.jutai, 1500);
            }
          }
        }
      }
      // ---- しゅん's pair
      const v = race.credit > 0 ? Math.max(V_NOM, race.credit / 0.35) : 0;
      const ds = Math.min(race.credit, (v * dt) / 1000);
      race.credit -= ds;
      race.uP = Math.min(uTrip, race.uP + ds / L2);
      const movingP = ds > 0.01;
      putPair(p, k, T.r2, race.uP, movingP);
      if (race.tangle > 0) k.dir = Math.floor(race.t / 120) % 2 ? 'left' : 'right';
      // ---- なんばるわん's pair: a little ahead of them (more so toward the end), never far
      const nomU = V_NOM / L2;
      const want = race.uP + 0.02 + 0.035 * race.uP;
      const lead = race.uM - race.uP;
      let vm = Math.max(0, Math.min(1.5 * nomU, (want - race.uM) / 0.6));
      if (vm < 0.35 * nomU && lead < 0.1 && race.t > LEAD) vm = 0.35 * nomU;
      race.uM = Math.min(0.995, race.uM + (vm * dt) / 1000);
      // stage 2: コタロウ pulls to the north-east halfway (she brings him back: just a laugh)
      let ex: [number, number, number, number] = [0, 0, 0, 0];
      if (race.pull === -1 && race.uM >= 0.45) race.pull = 0;
      if (race.pull >= 0) {
        race.pull += dt;
        const tt = race.pull;
        const amt = tt < 600 ? tt / 600 : tt < 1100 ? 1 : Math.max(0, 1 - (tt - 1100) / 700);
        ex = [amt * 13, -amt * 13, amt * 8, -amt * 8];
        if (!pullSaid && tt >= 550) {
          pullSaid = true;
          showBubble('npc_madam', KOTEI_BUBBLE.socchi, 1500);
          sfx('se_dog_bark', { pitch: 1.05, vol: 0.6 });
        }
        if (tt >= 1800) race.pull = -2;
      }
      putPair(kt, m, T.r1, race.uM, vm > 0, ex);
      if (race.pull >= 0 && race.pull < 1200) kt.dir = 'up';
      yield null;
    }
  } finally {
    panel.done = true;
  }
  // ---- the last curve: however fast, グソっ君 trips and lands on his back (tied to him, しゅん stops)
  putPair(p, k, T.r2, race.uP, false);
  k.faceLock = false;
  k.oy = 0;
  k.playAnim('fallen', true);
  sfx('se_kotei_trip');
  game.shake(2, 220);
  // she runs on to three steps short of the line …
  const uStop = 1 - 30 / L1;
  const madamOn = function* (): Co {
    while (race.uM < uStop) {
      race.uM = Math.min(uStop, race.uM + (V_NOM / L1) * 1.1 * (FRAME_MS / 1000));
      putPair(kt, m, T.r1, race.uM, true);
      yield null;
    }
    putPair(kt, m, T.r1, race.uM, false);
  };
  yield* all(
    madamOn(),
    (function* (): Co {
      yield 650;
      yield* msg(KOTEI_KOROBU);
    })(),
  );
  yield* meibamen();
}

// ================================================================ 名場面：ゴールの 手前

function* meibamen(): Co {
  const f = F();
  const p = f.player;
  const k = f.follower!;
  const m = actor('npc_madam')!;
  const kt = actor('npc_kotaro')!;
  const kz = actor('npc_kazuo')!;
  // … stops three steps before it
  putPair(kt, m, T.r1, race.uM, false);
  yield 300;
  yield* msg(KOTEI_MEIBAMEN.tomaru);
  // turns round, and comes back with コタロウ to グソっ君 (lying on the outer side of the lane)
  const kx = k.x;
  const ky = k.y;
  m.faceLock = false;
  kt.faceLock = false;
  m.dir = 'right';
  kt.dir = 'right';
  yield 350;
  const back = function* (a: Actor, x: number, y: number, speed: number): Co {
    a.faceLock = false;
    a.pathSpeed = speed * 16;
    a.path = [[x, y]];
    yield () => a.path.length === 0;
    a.moving = false;
  };
  yield* all(
    back(m, kx - 18, ky - 2, 3.0),
    back(kt, kx - 22, ky + 8, 3.0),
    (function* (): Co {
      yield* msg(KOTEI_MEIBAMEN.modoru);
    })(),
  );
  m.dir = 'right';
  kt.dir = 'right';
  yield 250;
  // the parasol's crook under him, and up he comes
  sfx('se_kotei_okosu');
  m.hop(2, 160);
  yield 200;
  k.anim = null;
  k.dir = 'left';
  k.hop(6, 280);
  yield 300;
  yield* msg(KOTEI_MEIBAMEN.okosu);
  yield* msg(KOTEI_MEIBAMEN.hottoku);
  // the two pairs side by side to the line, over it together
  const x0 = Math.min(p.x, k.x);
  const steps = 60;
  const xEnd = T.goalX - 10;
  yield 200;
  for (let i = 1; i <= steps; i++) {
    const x = x0 + ((xEnd - x0) * i) / steps;
    const moving = i < steps;
    put(p, x, T.cy - T.r2 + OFF, -1, 0, moving);
    put(k, x, T.cy - T.r2 - OFF, -1, 0, moving);
    put(m, x - 2, T.cy - T.r1 - OFF, -1, 0, moving);
    put(kt, x - 2, T.cy - T.r1 + OFF, -1, 0, moving);
    yield 50;
  }
  for (const a of [p, k, m, kt]) releaseRunner(a);
  race.tied = false;
  kz.dir = 'down';
  kz.playAnim('clap');
  yield 300;
  yield* msg(KOTEI_MEIBAMEN.dochaku);
  yield* wake();
}

// ================================================================ 朝礼台の 前で：30年 前の わけ

function* wake(): Co {
  const f = F();
  const p = f.player;
  const k = f.follower!;
  const m = actor('npc_madam')!;
  const kt = actor('npc_kotaro')!;
  const kz = actor('npc_kazuo')!;
  yield* fadeOut(400);
  const at = (a: Actor, tx: number, ty: number, dir: 'up' | 'down' | 'left' | 'right') => {
    a.path = [];
    a.x = tx * 16 + 8;
    a.y = ty * 16 + 16;
    a.dir = dir;
    a.moving = false;
  };
  // the judge back on his step, the two pairs in front of the platform
  at(kz, 5, 12, 'right');
  kz.pose = 'sit';
  kz.ox = -3;
  kz.oy = -3;
  at(m, 7, 10, 'left');
  at(kt, 6, 10, 'left');
  at(p, 7, 13, 'left');
  at(k, 8, 13, 'left');
  f.snapCamera();
  yield* fadeIn(400);
  yield 300;
  yield* msg(KOTEI_WAKE.kazuo);
  // she turns where nobody can see her face, and says it to コタロウ
  m.dir = 'up';
  yield 400;
  kt.dir = 'up';
  yield* msg(KOTEI_WAKE.madam);
  // コタロウ: 「ワン。」 — not a semitone low, whatever the stage (this once)
  kt.hop(2, 140);
  sfx('se_dog_bark', { pitch: 1 });
  yield 120;
  yield* msg(KOTEI_WAKE.wan);
  addMp(2);
  sfx('se_item');
  yield* msg(KOTEI_WAKE.reward);
  setFlag(KF.done, 1);
  // the three go home (round the building and back through the back yard); the race is over
  kz.pose = null;
  kz.ox = 0;
  kz.oy = 0;
  const home: [number, number][] = [[6, 16], [20, 19], [34, 20]];
  sendAway(m, [[7, 16], ...home], 2.2, 400);
  sendAway(kt, [[6, 16], ...home], 2.2, 500);
  sendAway(kz, [[6, 13], [6, 16], ...home], 2.0, 900);
  setFlag(KF.away, 0);
  grace();
}

// ================================================================ the beat panel (top centre)

const ARROW: Record<'left' | 'right', string[]> = {
  left: ['...#....', '..##....', '.#######', '########', '.#######', '..##....', '...#....'],
  right: ['....#...', '....##..', '#######.', '########', '#######.', '....##..', '....#...'],
};

class KoteiPanel implements Widget {
  modal = false;
  done = false;
  private t = 0;
  update(dt: number): void {
    this.t += dt;
  }
  draw(g: Gfx): void {
    if (this.done) return;
    const w = 156;
    const h = 44;
    const x = Math.round((W - w) / 2);
    const y = 4;
    const a = Math.min(1, this.t / 200);
    drawWindow(g, x, y, w, h, UI, a, { curl: false });
    // the two beats: [←] いち   [→] に — the one due now lights up on its beat
    const sinceBeat = race.t - (LEAD + race.beat * BEAT);
    const cur = race.beat >= 0 ? race.beat % 2 : -1;
    const cells: ['left' | 'right', string][] = [
      ['left', KOTEI_GUIDE.ichi],
      ['right', KOTEI_GUIDE.ni],
    ];
    cells.forEach(([dir, word], i) => {
      const cx = x + 8 + i * 72;
      const cy = y + 6;
      const lit = cur === i && sinceBeat >= 0 && sinceBeat < 260;
      const next = race.beat < 0 ? i === 0 : (race.beat + 1) % 2 === i;
      if (lit) g.rect(cx - 2, cy - 1, 66, 19, race.judge === -1 && race.t - race.judgeT < 400 ? UI.accentLight : UI.marker, a);
      else if (next) g.rect(cx - 2, cy + 16, 66, 1, UI.gold, a * 0.8);
      // the arrow key
      g.rect(cx, cy, 15, 15, UI.cream, a);
      g.rect(cx, cy + 13, 15, 2, UI.paperDark, a);
      g.rect(cx, cy, 15, 1, UI.border, a);
      g.rect(cx, cy + 14, 15, 1, UI.border, a);
      g.rect(cx, cy, 1, 15, UI.border, a);
      g.rect(cx + 14, cy, 1, 15, UI.border, a);
      ARROW[dir].forEach((row, j) => [...row].forEach((c, ii) => c === '#' && g.rect(cx + 4 + ii, cy + 3 + j, 1, 1, UI.pencil, a)));
      g.text(word, cx + 20, cy, { color: lit ? UI.accent : UI.pencil, alpha: a });
    });
    // the lap: しゅん's pair (green) and なんばるわん's (violet) along a line to the goal
    const bx = x + 10;
    const bw = w - 34;
    const by = y + 33;
    g.rect(bx, by, bw, 1, UI.paperDark, a);
    g.rect(bx + bw, by - 5, 1, 7, UI.accent, a);
    g.rect(bx + bw + 1, by - 5, 4, 3, UI.accent, a);
    const dot = (u: number, c: string, dy: number) => {
      const px = Math.round(bx + Math.max(0, Math.min(1, u)) * bw);
      g.rect(px - 1, by - 2 + dy, 3, 3, c, a);
    };
    dot(race.uM, '#8A5FB0', -2);
    dot(race.uP, '#3FA66B', 2);
    // a good step: a small tick; out of step: a red mark
    if (race.t - race.judgeT < 300) {
      const c = race.judge === 1 ? UI.gold : UI.accent;
      g.rect(x + w - 16, y + 8, 6, 6, c, a * (1 - (race.t - race.judgeT) / 300));
    }
  }
}

// ================================================================ world fx: the hachimaki, chalk dust, 赤とんぼ

registerWorldFx({
  map: MAP,
  // (placed with fxAt: in the HD-2D view at the two feet, 02 #85)
  anchored: true,
  draw(f, g, cx, cy, layer) {
    if (layer !== 'sorted' || !race.tied) return;
    const p = f.player;
    const k = f.follower;
    if (!k || !k.visible) return;
    // the red-and-white hachimaki between しゅん's right foot and グソっ君's lowest right leg
    const [a0, b0] = fxAt(f, p.x, p.y - 2, cx, cy, p.y);
    const [a1, b1] = fxAt(f, k.x, k.y - 2, cx, cy, k.y);
    const x0 = Math.round(a0);
    const y0 = Math.round(b0);
    const x1 = Math.round(a1);
    const y1 = Math.round(b1);
    const n = Math.max(1, Math.round(Math.hypot(x1 - x0, y1 - y0)));
    for (let i = 0; i <= n; i++) {
      const X = Math.round(x0 + ((x1 - x0) * i) / n);
      const Y = Math.round(y0 + ((y1 - y0) * i) / n);
      g.px(X, Y, Math.floor(i / 2) % 2 ? '#F4F1E8' : '#E23B2E');
    }
    // the knot
    g.px(Math.round((x0 + x1) / 2), Math.round((y0 + y1) / 2) + 1, '#B8241E');
  },
});

/** Chalk dust lifting off the old lines: a few grains drifting (stage 0 with the wind, 1 held still, 2 to the north-east). */
const DUST: { x: number; y: number; ph: number }[] = Array.from({ length: 14 }, (_, i) => {
  const r = T.lines[i % 3];
  const q = laneAt(r, ((i * 97) % 100) / 100 * lapLen(r));
  return { x: q.x, y: q.y, ph: i * 0.73 };
});

registerWorldFx({
  map: MAP,
  anchored: true,
  draw(f, g, cx, cy, layer) {
    if (layer !== 'ground') return;
    const s = stage();
    for (const d of DUST) {
      const k = s === 1 ? 0.4 : ((f.mt / 2600 + d.ph) % 1);
      const dx = s === 2 ? k * 7 : k * 9;
      const dy = s === 2 ? -k * 6 : -k * 3 + Math.sin(k * 6 + d.ph) * 0.8;
      // (lifting off the line: over the ground at the line's own y)
      const [sx, sy] = fxAt(f, d.x + dx, d.y + dy, cx, cy, d.y);
      const X = Math.round(sx);
      const Y = Math.round(sy);
      if (X < 0 || X >= W || Y < 0 || Y > 224) continue;
      g.px(X, Y, k < 0.7 ? '#F4F1E8' : '#E8E4D8');
    }
  },
});

const TONBO: { cx: number; cy: number; rx: number; ry: number; w: number; ph: number }[] = [
  { cx: 120, cy: 120, rx: 50, ry: 14, w: 0.00042, ph: 0.4 },
  { cx: 300, cy: 150, rx: 44, ry: 24, w: 0.00055, ph: 2.1 },
  { cx: 470, cy: 230, rx: 40, ry: 16, w: 0.00048, ph: 3.6 },
  { cx: 200, cy: 290, rx: 46, ry: 12, w: 0.0005, ph: 5.0 },
];

/** How high the dragonflies fly (px over the ground below them; HD-2D: where they are in 3D). */
const TONBO_UP = 24;

registerWorldFx({
  map: MAP,
  anchored: true,
  draw(f, g, cx, cy, layer) {
    if (layer !== 'fg') return;
    const s = stage();
    const mt = f.mt;
    for (const t of TONBO) {
      const a = mt * t.w + t.ph;
      let x = t.cx + Math.cos(a) * t.rx + Math.sin(a * 2.3) * 6;
      let y = t.cy + Math.sin(a * 1.6) * t.ry;
      let dx = -Math.sin(a) * t.rx;
      let dy = Math.cos(a * 1.6) * t.ry * 1.6;
      if (s === 2) {
        // they hang in the air, all their heads to the north-east
        x = t.cx + Math.cos(t.ph) * t.rx * 0.6 + Math.sin(f.t / 900 + t.ph) * 1.5;
        y = t.cy + Math.sin(t.ph) * t.ry * 0.6;
        dx = 1;
        dy = -1;
      }
      // (in the air, over the ground TONBO_UP px below: fxAt)
      const [sx, sy] = fxAt(f, Math.round(x), Math.round(y), cx, cy, Math.round(y) + TONBO_UP);
      const X = Math.round(sx);
      const Y = Math.round(sy);
      if (X < -8 || X > 392 || Y < -8 || Y > 224) continue;
      const right = dx >= 0;
      const up = Math.abs(dy) > Math.abs(dx) * 1.2;
      const wing = Math.floor(mt / 70 + t.ph * 10) % 2;
      const wc = wing ? '#FFF6D8' : '#E8E4D8';
      if (up) {
        const d = dy < 0 ? -1 : 1;
        for (let i = -1; i <= 2; i++) g.px(X, Y - i * d, i === 2 ? '#B8241E' : '#E84E3C');
        g.px(X - 1, Y + d, wc);
        g.px(X + 1, Y + d, wc);
        g.px(X - 2, Y + d * (wing ? 1 : 0), wc);
        g.px(X + 2, Y + d * (wing ? 1 : 0), wc);
      } else {
        const d = right ? 1 : -1;
        for (let i = -2; i <= 1; i++) g.px(X + i * d, Y, i === 1 ? '#B8241E' : '#E84E3C');
        g.px(X, Y - 1, wc);
        g.px(X, Y + 1, wc);
        g.px(X - d, Y - 1 - (wing ? 1 : 0), wc);
        g.px(X - d, Y + 1 + (wing ? 0 : 1), wc);
      }
    }
  },
});

// ================================================================ ヒキヅナ put right (by the shed)

registerScript('restored_enemy_hikizuna', function* (): Co {
  snd.se('se_examine');
  yield* msg(KOTEI_RESTORED);
});

// ================================================================ QA

/** Every page: at most 3 lines, each at most 336 px; no 「平和」「まだ」「17」「3人」 (chapter 1). */
export function koteiTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) {
        // a one-line bubble / label: its width alone
        const w = measure(v);
        if (w > 336) bad.push(`${name}: ${w}px: ${v}`);
        return;
      }
      let lines: string[] = [];
      const flush = () => {
        if (!lines.length) return;
        pages++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
        lines = [];
      };
      for (const raw of v.split('\n')) {
        const t = raw.trim();
        if (!t || t.startsWith('>')) continue;
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || /^\[.*\]$/.test(t)) {
          flush();
          continue;
        }
        const plain = raw.replace(/\s+$/, '').replace(/\{[^}]*\}/g, '');
        const w = measure(plain);
        if (w > 336) bad.push(`${name}: ${w}px: ${plain}`);
        for (const word of ['平和', '17', '3人']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
        if (/(?<!ま)まだ/.test(plain)) bad.push(`${name}: 「まだ」: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('kotei', KOTEI_TEXTS);
  walkT('kotei.bubble', KOTEI_BUBBLE);
  walkT('kotei.guide', KOTEI_GUIDE);
  return { pages, bad };
}
registerDebug('koteiText', () => koteiTextCheck());

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

registerDebug('kotei', (step = 'start', st = 1) => {
  if (step === 'reset') {
    for (const id of Object.values(KF)) setFlag(id, 0);
    race.on = false;
    race.tied = false;
    return 'kotei: reset';
  }
  // stage 1 with グソっ君 (the broadcast beat), or stage 2
  cmd().jump?.(st >= 2 ? 'stage2' : 'broadcast', true);
  setFlag('flag_hidden_madam', 1);
  if (step === 'kazuo') {
    for (const id of Object.values(KF)) setFlag(id, 0);
    return cmd().warp?.('map_madam', 6, 4, 'up');
  }
  setFlag(KF.kazuo, 1);
  if (step === 'madam') {
    setFlag(KF.promise, 0);
    setFlag(KF.away, 0);
    setFlag(KF.done, 0);
    const r = cmd().warp?.('map_town', 18, 23, 'left');
    // (QA) she holds still on the slope at (17,23), facing him, till she is spoken to
    field()?.startScript(
      (function* (): Co {
        yield 400;
        const m = actor('npc_madam');
        if (!m) return;
        m.data.scripted = true;
        m.path = [];
        m.x = 17 * 16 + 8;
        m.y = 23 * 16 + 16;
        m.dir = 'right';
      })(),
    );
    return r;
  }
  setFlag(KF.promise, 1);
  if (step === 'end') {
    setFlag(KF.away, 0);
    setFlag(KF.done, 1);
    setFlag(KF.kazuoAfter, 0);
    return cmd().warp?.('map_madam', 6, 4, 'up');
  }
  if (step === 'tsuna') {
    // stage 2: ヒキヅナ put right, coiled by the shed
    setFlag(KF.away, 0);
    setFlag(KF.done, 1);
    state.taken['sym_kotei_01'] = true;
    return cmd().warp?.(MAP, 3, 8, 'up');
  }
  setFlag(KF.away, 1);
  setFlag(KF.done, 0);
  if (step === 'school') {
    setFlag('flag_sch_visited', 1);
    return cmd().warp?.('map_school', 1, 12, 'left');
  }
  setFlag(KF.flip, 1);
  const r = cmd().warp?.(MAP, 15, 8, 'right');
  if (step === 'race') {
    const f = field();
    f?.startScript(
      (function* (): Co {
        yield 500;
        const g = F();
        const m = actor('npc_madam');
        const kt = actor('npc_kotaro');
        const kz = actor('npc_kazuo');
        if (!m || !kt || !kz || !g.follower) return;
        scripted(true, m, kt, kz, g.follower);
        kz.pose = null;
        kz.ox = 0;
        kz.oy = 0;
        put(kz, JUDGE[0], JUDGE[1], -1, 0, false);
        kz.dir = 'down';
        try {
          yield* runRace();
        } finally {
          race.on = false;
          race.tied = false;
          for (const a of [g.player, g.follower, m, kt, kz]) releaseRunner(a);
          scripted(false, g.follower);
          if (!flag(KF.done)) scripted(false, m, kt, kz);
        }
      })(),
    );
  }
  return r;
});

registerDebug('koteiAuto', (on = true) => {
  race.auto = !!on;
  return `kotei auto ${race.auto}`;
});

registerDebug('koteiState', () => ({
  on: race.on,
  uP: +race.uP.toFixed(3),
  uM: +race.uM.toFixed(3),
  beat: race.beat,
  used: race.usedBeat,
  tangles: race.tangles,
  t: Math.round(race.t),
  done: flag(KF.done),
}));
