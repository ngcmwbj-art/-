// 夜の 足あと帳（第2章。2026-10-06 依頼主の採用：げむきかの 案3。02_ch2_index #87、50 10.28・9.9、
// 52 7.10）。文は data/text/hoshi_ashiato.ts、うり坊を 数える 小窓は uribo.ts、絵は art/props/ashiato_art.ts、
// みました帳の ページは ui/menu/book_ashiato.ts。
//
//   段階1〜2（トマトの 灯りを 持っている あいだ。nightOn）、牛舎の おてつだい（flag_ch2_barn_work）の あと：
//   ・マサル〔ashiato〕（牛舎 (20,6)／段階2は ゲートの 横）→ flag_ashiato_start、みました帳②の すみに『よるの 足あと』。
//     見回り帳 obj_hoshi_mimawari には、おてつだいの あと『きょうの 客』の 1ページ（ほのめかし）。
//   ・足あと 6つ（map_hoshimidai の litOnly の 地面の 模様 decal_ashiato と obj_ashiato_<k>。はじまってから
//     出る）：見つけると flag_ashiato_f_<k>、知らせると flag_ashiato_t_<k>（犯人が わかる）。
//       ino・haku → ペロ、tanu → ハモ区長（グソっ君の ツッコミで「皆勤」flag_ashiato_kaikin）、shika → トマじい、
//       usagi → ソワカ、inu → マサル。6つ そろうと 朱肉 +2（flag_ashiato_six）。
//     マサルの 1行ずつ：イノシシの あと「ネットを もう 1段だ」、子どもの 足あと obj_hoshi_footprints を 見た
//     あと「それは、数えん。」（だれのかは 言わない）。
//     ふくじんづけの 寝床 obj_hr_gen_hiroimono「ぜんぶ 左手」、堆肥舎の 軍手の 箱 obj_hr_taihi_gunte「ぜんぶ 右手」。
//   ・かくし：6つの あと、グソっ君の 足あと（細かい 点が 2列に 7つずつ）が 灯りの 中で しゅんの 歩いた あとに
//     出て、10タイルほど 歩くと 気づく（flag_ashiato_gu）→ マサル『グ 1』（flag_ashiato_gu_told）。
//   ・6つの あと、マサルに 話すと うり坊を 数える（段階1は 牛舎から ゲートの 内側 (49,19) へ、段階2は その場で）。
//     flag_ashiato_tries（通った 回数）、flag_ashiato_meijin（1回目で ぴったり）、flag_ashiato_uribo（朱肉 +2・
//     表紙の うり坊の シール）。
//   ・そのあと：電柱の 張り紙 obj_hoshi_denchu『絵 ソワカ』（⑤を 聞いた 人は グソっ君）、見回り帳の『よし』『グ 1』。
//   ・エンディング カット3（ぜんぶ した 人）：バスが 出る あいだ、転回場の 南の 林の きわを、親子の イノシシの
//     影が 小さく 横切る（絵だけ。秒数・台詞・ページは かえない）。
//   ・QA だけの コマンドは import.meta.env.DEV の 中。
//
// 人の 台本は ほかの 寄り道（色紙・二百十日・脇芽・色見本・沢の上）の 用が すんでから（othersFirst）。
// この ファイルは ch2/index.ts で shikishi の あとに import する（school・hunting・yoburi は その あとに 包むので、
// その人たちの 用が 先に 出る）。
//
// QA：__game.cmd.ashiato(step, stage, auto)、ashiatoState()、ashiatoText()、ashiatoEnd()、jump('ch2:ashiato')

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { measure } from '../../engine/font';
import type { Gfx } from '../../engine/gfx';
import { flag, hasItem, setFlag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { registerScript, registerWorldFx, spawn } from '../../world/api';
import { getScript, type ScriptCtx } from '../../world/scripts';
import { field, type FieldScene } from '../../world/field';
import { fxAt } from '../../world/fx';
import { runMsg } from '../../world/msg';
import type { Actor } from '../../world/actor';
import * as T from '../../data/text/hoshi_ashiato';
import { ASHIATO_KINDS, type AshiatoKind } from '../../data/text/hoshi_ashiato';
import { farBoars } from '../../art/props/ashiato_art';
import { addMp, F, panBack, panTo, sendAway, walkTo } from '../lib';
import { forceBoxPos, keyGuide } from '../stage';
import { se } from './compat';
import { hStage, lanternOn, poseAny, unpose } from './common';
import { card, closeUribo, emerge, goBack, openUribo, run, snortHome, uriboGuideRows, waitHome } from './uribo';

export const AF = {
  /** マサル〔ashiato〕を 聞いた（ページが できた。足あとが 出る）。 */
  start: 'flag_ashiato_start',
  /** 6つ そろった（朱肉 +2）。 */
  six: 'flag_ashiato_six',
  /** 段階2で はじめて 足あとを 見た ときの グソっ君（1回）。 */
  h2: 'flag_ashiato_h2',
  /** マサル「ネットを もう 1段だ」（1回）。 */
  genNet: 'flag_ashiato_gen_net',
  /** はじまった あとに、子どもの 足あとを 見た／マサルに 話した。 */
  kodomo: 'flag_ashiato_kodomo',
  kodomoTold: 'flag_ashiato_kodomo_told',
  /** 寝床の 軍手（左手）・軍手の 箱（右手）。 */
  nedoko: 'flag_ashiato_nedoko',
  gunte: 'flag_ashiato_gunte',
  /** 区長の「皆勤で ございます」（グソっ君が いた とき）。 */
  kaikin: 'flag_ashiato_kaikin',
  /** 14本の 足に 気づいた／マサルが『グ 1』と 書いた。 */
  gu: 'flag_ashiato_gu',
  guTold: 'flag_ashiato_gu_told',
  /** うり坊を 数えおえた（朱肉 +2、表紙の シール）。 */
  uribo: 'flag_ashiato_uribo',
  /** 親子が 通った 回数（数えた 回数）。 */
  tries: 'flag_ashiato_tries',
  /** 1回目で ぴったり 5ひき（はしの 外で 押さずに）。 */
  meijin: 'flag_ashiato_meijin',
  /** 電柱の 張り紙の『絵 ソワカ』を 見た。 */
  harigami: 'flag_ashiato_harigami',
} as const;

export const foundFlag = (k: AshiatoKind): string => `flag_ashiato_f_${k}`;
export const toldFlag = (k: AshiatoKind): string => `flag_ashiato_t_${k}`;

export function found(k: AshiatoKind): boolean {
  return flag(foundFlag(k)) > 0;
}
export function told(k: AshiatoKind): boolean {
  return flag(toldFlag(k)) > 0;
}
export function foundCount(): number {
  return ASHIATO_KINDS.filter(found).length;
}

/** すべて した：うり坊、6つの 犯人、『グ 1』（エンディングの 差分）。 */
export function ashiatoComplete(): boolean {
  return flag(AF.uribo) > 0 && ASHIATO_KINDS.every(told) && flag(AF.guTold) > 0;
}

function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower?.visible && state.party.some((m) => m.id === 'kanenari');
}

/** 段階1〜2、トマトの 灯りを 持っている あいだ。 */
function nightOn(): boolean {
  const s = hStage();
  return s >= 1 && s <= 2 && lanternOn();
}

/** Wrap another module's script (or the object's default text) with ours. */
function wrap(id: string, fn: (ctx: ScriptCtx, orig: () => Co) => Co): void {
  const prev = getScript(id);
  registerScript(id, function* (ctx): Co {
    const orig = function* (): Co {
      if (prev) yield* prev(ctx);
      else yield* ctx.runDefault();
    };
    yield* fn(ctx, orig);
  });
}

function* say(text: string): Co<number> {
  return yield* runMsg(text);
}

// ---------------------------------------------------------------- who has something else to say first

/** The other errands' and the story's lines of each person come first (the footprints wait for the next talk). */
function othersFirst(who: 'gen' | 'mitsu' | 'kucho' | 'tome' | 'sawako'): boolean {
  const shikishi = (w: string) => hasItem('item_shikishi') && !flag(`flag_shikishi_${w}`);
  const nihyaku = (w: string) => flag('flag_nihyaku_hyou') > 0 && !flag(`flag_nihyaku_${w}`) && !flag('flag_nihyaku_done');
  switch (who) {
    case 'gen':
      // 見回り（ゲート）の 前、おてつだいの 最中、出荷の 話（段階1の 2回目）、せがれの 話（段階2の 1回目）
      if (!flag('flag_ch2_gate_open') || flag('flag_ch2_barn_work_on')) return true;
      if (hStage() === 1 && !flag('flag_seen_npc_hoshi_gen_h1_2')) return true;
      if (hStage() === 2 && !flag('flag_seen_npc_hoshi_gen_h2_1')) return true;
      return shikishi('gen') || nihyaku('gen');
    case 'mitsu': {
      if (!flag('flag_ch2_house_exit')) return true;
      // 脇芽の 頼みと 報告（npcs.ts の ペロの 中）
      if (flag('flag_ch2_wakime_done') && !flag('flag_ch2_wakime_report')) return true;
      const heard = flag('flag_seen_npc_hoshi_mitsu_h1_1') || flag('flag_seen_npc_hoshi_mitsu_h2_1');
      if (!flag('flag_ch2_wakime_ask') && heard) return true;
      return shikishi('mitsu') || nihyaku('mitsu');
    }
    case 'kucho':
      if (!flag('flag_ch2_yoriai')) return true;
      if (flag('flag_matsuri_ask') && !flag('flag_matsuri_kucho')) return true;
      return shikishi('kucho') || nihyaku('kucho');
    case 'tome':
      // （yoburi.ts の tomeStoryFirst と 同じ 順。夜振りと 水やり当番は 外がわで 先に 出る）
      if (state.taken['sym_hoshi_03'] && state.taken['sym_hoshi_06'] && !flag('flag_seen_npc_hoshi_tome_kacho_done')) return true;
      if (flag('flag_ch2_sawa_wait')) return true;
      if (hasItem('item_namae_ishi') && !flag('flag_ch2_sawa_ishi')) return true;
      if (!flag('flag_ch2_maru_told') && (flag('flag_maru_dengon') || flag('flag_met_maru')) && (flag('flag_seen_npc_hoshi_tome_h0_2') || hStage() >= 1)) return true;
      if (flag('flag_ch2_got_otsukare') && !flag('flag_ch2_sawa_open')) return true;
      return shikishi('tome') || nihyaku('tome');
    case 'sawako':
      if (state.taken['sym_hoshi_02'] && !flag('flag_seen_npc_hoshi_sawako_mujin_done')) return true;
      if (flag('flag_ch2_sawako_kabe_yk') && !flag('flag_ch2_sawako_yk')) return true;
      return shikishi('sawako');
  }
}

// ---------------------------------------------------------------- 足あと

/** みました帳②の『よるの 足あと』に 書きこむ 合図（鉛筆の 音と、1行）。 */
function* note(text: string): Co {
  se('se_pen_write', { pitch: 1.1 });
  yield 120;
  yield* say(text);
}

function* examine(k: AshiatoKind): Co {
  se('se_examine');
  const kane = kanenariHere();
  const h2 = hStage() >= 2 && !flag(AF.h2) && kane;
  if (found(k)) {
    const t = T.ASHIATO_AGAIN[k];
    yield* say(told(k) ? t.who : t.dunno);
    if (h2) {
      setFlag(AF.h2, 1);
      yield* say(T.ASHIATO_H2_KANE);
    }
    return;
  }
  setFlag(foundFlag(k), 1);
  yield* say(T.ASHIATO_FIND[k]);
  if (h2) {
    setFlag(AF.h2, 1);
    yield* say(T.ASHIATO_H2_KANE);
  }
  if (kane) yield* say(T.ASHIATO_FIND_KANE[k]);
  const n = foundCount();
  yield* note(T.ASHIATO_NOTE(T.ASHIATO_BOOK.rows[k].place, n));
  if (n >= ASHIATO_KINDS.length && !flag(AF.six)) {
    setFlag(AF.six, 1);
    addMp(2);
    se('se_item');
    yield* say(T.ASHIATO_SIX);
    if (kane) yield* say(T.ASHIATO_SIX_KANE);
    trail.walked = 0;
  }
}

for (const k of ASHIATO_KINDS)
  registerScript(`obj_ashiato_${k}`, function* (): Co {
    yield* examine(k);
  });

/** 知らせる：しゅんが 話す → その人の 答え（→ グソっ君）→ 犯人を 書く。 */
function* tell(k: AshiatoKind): Co {
  setFlag(toldFlag(k), 1);
  const kane = kanenariHere();
  yield* say(T.ASHIATO_TELL[k]);
  yield* say(T.ASHIATO_ANSWER[k]);
  const extra = T.ASHIATO_ANSWER_KANE[k];
  if (extra && kane) {
    yield* say(extra);
    if (k === 'tanu') setFlag(AF.kaikin, 1);
  }
  yield* note(T.ASHIATO_NOTE_WHO(T.ASHIATO_BOOK.rows[k].who));
}

/** The first footprint of `ks` found and not told yet. */
function untold(ks: AshiatoKind[]): AshiatoKind | null {
  return ks.find((k) => found(k) && !told(k)) ?? null;
}

// ---------------------------------------------------------------- the people

function* genAshiato(): Co<boolean> {
  if (!nightOn() || othersFirst('gen')) return false;
  if (!flag(AF.start)) {
    if (!flag('flag_ch2_barn_work')) return false;
    setFlag(AF.start, 1);
    yield* say(kanenariHere() ? T.ASHIATO_START : T.ASHIATO_START_SOLO);
    se('se_page');
    yield 200;
    yield* note(T.ASHIATO_PAGE);
    field()?.refreshPresence();
    return true;
  }
  if (untold(['inu'])) {
    yield* tell('inu');
    return true;
  }
  if (found('ino') && !flag(AF.genNet)) {
    setFlag(AF.genNet, 1);
    yield* say(T.ASHIATO_GEN_NET);
    return true;
  }
  if (flag(AF.kodomo) && !flag(AF.kodomoTold)) {
    setFlag(AF.kodomoTold, 1);
    yield* say(T.ASHIATO_GEN_KODOMO);
    return true;
  }
  if (flag(AF.gu) && !flag(AF.guTold) && kanenariHere()) {
    setFlag(AF.guTold, 1);
    yield* say(T.ASHIATO_GU_TELL);
    return true;
  }
  if (foundCount() >= ASHIATO_KINDS.length && !flag(AF.uribo)) {
    yield* uriboScene();
    return true;
  }
  return false;
}

wrap('npc_hoshi_gen', function* (_ctx, orig): Co {
  if (yield* genAshiato()) return;
  yield* orig();
});

function tellerFor(who: 'mitsu' | 'kucho' | 'tome' | 'sawako', ks: AshiatoKind[]): void {
  wrap(`npc_hoshi_${who}`, function* (_ctx, orig): Co {
    const k = nightOn() && flag(AF.start) && !othersFirst(who) ? untold(ks) : null;
    if (k) {
      yield* tell(k);
      return;
    }
    yield* orig();
  });
}
tellerFor('mitsu', ['ino', 'haku']);
tellerFor('kucho', ['tanu']);
tellerFor('tome', ['shika']);
tellerFor('sawako', ['usagi']);

// ---------------------------------------------------------------- the things

/** 子どもの 足あと（山道の 入口）：はじまった あとに 見ると、マサルの 1行が 出る。 */
wrap('obj_hoshi_footprints', function* (_ctx, orig): Co {
  yield* orig();
  if (flag(AF.start) && nightOn()) setFlag(AF.kodomo, 1);
});

/** ふくじんづけの 寝床（マサルの 家）：⑥の あと、いつもの 文の あとに「ぜんぶ 左手」。 */
wrap('obj_hr_gen_hiroimono', function* (_ctx, orig): Co {
  yield* orig();
  if (!found('inu')) return;
  setFlag(AF.nedoko, 1);
  yield* say(T.ASHIATO_NEDOKO);
});

/** 堆肥舎の 軍手の 箱：⑥の あと「ぜんぶ 右手」（寝床を 見た あとは「こっちは」）。 */
wrap('obj_hr_taihi_gunte', function* (_ctx, orig): Co {
  yield* orig();
  if (!found('inu')) return;
  setFlag(AF.gunte, 1);
  yield* say(flag(AF.nedoko) ? T.ASHIATO_GUNTE.after : T.ASHIATO_GUNTE.first);
});

/** 見回り帳（牛舎）：おてつだいの あと『きょうの 客』、うり坊の あと『よし』、『グ 1』。 */
wrap('obj_hoshi_mimawari', function* (_ctx, orig): Co {
  yield* orig();
  if (!flag('flag_ch2_barn_work')) return;
  const yoshi = flag(AF.uribo) > 0;
  const gu = flag(AF.guTold) > 0;
  if (yoshi && gu) yield* say(T.ASHIATO_CHO_AFTER.both);
  else if (yoshi) yield* say(T.ASHIATO_CHO_AFTER.yoshi);
  else if (gu) yield* say(T.ASHIATO_CHO_AFTER.gu);
  else if (hStage() <= 2) yield* say(T.ASHIATO_CHO_HINT);
});

/** 電柱の 張り紙：うり坊の あと『絵 ソワカ』、⑤を ソワカに 聞いた 人は グソっ君。 */
wrap('obj_hoshi_denchu', function* (_ctx, orig): Co {
  yield* orig();
  if (!flag(AF.uribo)) return;
  setFlag(AF.harigami, 1);
  yield* say(T.ASHIATO_HARIGAMI);
  if (told('usagi') && kanenariHere()) yield* say(T.ASHIATO_HARIGAMI_KANE);
});

// ---------------------------------------------------------------- かくし：14本の 足（グソっ君の 足あと）

const trail = {
  /** Where グソっ君's feet came down (world px), the newest last; the direction he went. */
  marks: [] as { x: number; y: number; dx: number; dy: number; t: number }[],
  lastX: 0,
  lastY: 0,
  /** px walked since the six (the discovery comes after about 10 tiles). */
  walked: 0,
  busy: false,
};

function trailOn(): boolean {
  return flag(AF.six) > 0 && nightOn() && kanenariHere();
}

function* guDiscover(): Co {
  const f = F();
  const p = f.player;
  const k = f.follower;
  trail.busy = true;
  try {
    setFlag(AF.gu, 1);
    // しゅんが ふりかえる。グソっ君は となりへ（うしろの 足あとが 灯りに 入る）
    const last = trail.marks[trail.marks.length - 1];
    const back = last ? { x: last.dx, y: last.dy } : { x: 0, y: -1 };
    p.dir = Math.abs(back.x) > Math.abs(back.y) ? (back.x > 0 ? 'left' : 'right') : back.y > 0 ? 'up' : 'down';
    if (k) {
      const side = Math.abs(back.x) > Math.abs(back.y) ? { x: 0, y: 14 } : { x: f.free(k, p.x + 14, p.y) ? 14 : -14, y: 0 };
      k.data.scripted = true;
      k.x = p.x + side.x;
      k.y = p.y + side.y;
      k.dir = p.dir;
      k.hop(2, 160);
    }
    yield 500;
    // the window on the other side from the trail
    forceBoxPos(back.y < 0 ? 'top' : 'bottom');
    yield* say(T.ASHIATO_GU_FIND);
  } finally {
    forceBoxPos(null);
    trail.busy = false;
    if (k) delete k.data.scripted;
  }
}

registerWorldFx({
  map: 'map_hoshimidai',
  anchored: true,
  update(f: FieldScene, dt: number) {
    void dt;
    if (!trailOn()) {
      trail.marks.length = 0;
      return;
    }
    const k = f.follower;
    if (!k || !k.visible) return;
    const dx = k.x - trail.lastX;
    const dy = k.y - trail.lastY;
    const d = Math.hypot(dx, dy);
    if (d > 40) {
      // a warp or a map change: start again from here
      trail.lastX = k.x;
      trail.lastY = k.y;
      return;
    }
    if (d >= 12) {
      trail.marks.push({ x: trail.lastX, y: trail.lastY, dx: dx / d, dy: dy / d, t: f.t });
      if (trail.marks.length > 28) trail.marks.shift();
      trail.lastX = k.x;
      trail.lastY = k.y;
      if (!flag(AF.gu)) trail.walked += d;
    }
    // about 10 tiles on, while he can walk: he notices them
    if (!flag(AF.gu) && !trail.busy && trail.walked > 160 && trail.marks.length >= 4 && f.controllable && game.top === f && !game.ui.modal) {
      trail.walked = 0;
      f.startScript(guDiscover());
    }
  },
  draw(f: FieldScene, g: Gfx, cx: number, cy: number, layer) {
    if (layer !== 'ground' || !trail.marks.length) return;
    const l = f.light.lantern;
    if (!l) return;
    // (the whole of the light: the dots are fine and few)
    const r = l.r;
    const k = f.follower;
    for (const m of trail.marks) {
      // (not under his own feet)
      if (k && Math.hypot(m.x - k.x, m.y - k.y) < 10) continue;
      // 7 legs a side: two rows of 7 fine dots across the way he went
      const px = -m.dy;
      const py = m.dx;
      for (let i = 0; i < 7; i++) {
        const along = (i - 3) * 1.6;
        for (const side of [-3, 3]) {
          const wx = m.x + m.dx * along + px * side;
          const wy = m.y - 2 + m.dy * along + py * side;
          if (Math.hypot(wx - l.x, wy - l.y) > r) continue;
          const [sx, sy] = fxAt(f, wx, wy, cx, cy);
          // a tiny pressed dot: light on top, its shadow under it (seen on the dark earth and the pale concrete)
          g.px(Math.round(sx), Math.round(sy) + 1, '#3A2418');
          g.px(Math.round(sx), Math.round(sy), i % 3 ? '#FFE2A0' : '#FFF6D8');
        }
      }
    }
  },
});

// ---------------------------------------------------------------- うり坊を 数える

let qaAuto = false;

function* uriboScene(): Co {
  const s = hStage();
  let f = F();
  let gen: Actor | null = null;
  let temp = false;
  if (f.map.id !== 'map_hoshimidai') {
    // 段階1：牛舎から ゲートの 内側へ
    yield* say(T.URIBO_GO);
    yield* game.fadeOut(400, '#0B0B14');
    se('se_door_heavy');
    f.loadMap('map_hoshimidai', 49, 19, 'up');
    f = F();
    f.syncFollower(true);
    gen = spawn('ashiato_gen', 50, 19, { sprite: 'npc_hoshi_gen', dir: 'up', ghost: true });
    gen.data.scripted = true;
    temp = true;
  } else {
    // 段階2：ゲートの 横の マサルの となり（こちら側の）へ
    gen = f.actorById('npc_hoshi_gen') ?? null;
    const p = f.player;
    const tx = p.tileX > 50 ? 51 : 49;
    if (p.tileX !== tx || p.tileY !== 19) yield* walkTo('player', tx, 19, { face: 'up' });
  }
  const p = f.player;
  p.dir = 'up';
  const kf = f.follower;
  if (kf && kf.visible) {
    kf.x = (p.tileX > 50 ? 52 : 48) * 16 + 8;
    kf.y = 19 * 16 + 16;
    kf.dir = 'up';
  }
  if (gen) gen.dir = 'up';
  if (temp) {
    f.snapCamera();
    yield* game.fadeIn(400);
  }
  yield* say(T.URIBO_COME);
  // the light held low
  poseAny(p, 'crouch', 'look_down');
  forceBoxPos('bottom');
  yield* panTo((p.x - 8) / 16, (p.y - 62 - 8) / 16, 500);
  const panel = yield* openUribo(s, qaAuto);
  try {
    yield 400;
    yield* emerge(panel, 'mother');
    yield* say(T.URIBO_SEE);
    yield* emerge(panel, 'kids');
    yield* say(T.URIBO_SEE2);
    if (kanenariHere()) yield* say(T.URIBO_KANE);
    yield* say(T.URIBO_NATSU);
    yield* say(T.URIBO_COUNT);
    // the guide first, then they set off (on an iPad held sideways the guide hides the けってい button while it is up)
    if (!qaAuto) {
      keyGuide(uriboGuideRows(), 2400, 8);
      yield 2600;
    }
    let first = true;
    for (;;) {
      setFlag(AF.tries, flag(AF.tries) + 1);
      const r = yield* run(panel, !first);
      if (r.n >= 5) {
        if (first && r.clean) setFlag(AF.meijin, 1);
        break;
      }
      first = false;
      yield* say(T.URIBO_AGAIN);
      yield* goBack(panel);
    }
    yield* say(T.URIBO_OK);
    yield* snortHome(panel);
    yield* say(T.URIBO_TURN);
    yield* waitHome(panel);
    yield* say(T.URIBO_KAETTA);
    yield* say(T.URIBO_HONNE);
    yield* card(panel, flag(AF.guTold) > 0, 'list');
    yield* say(T.URIBO_CHO);
    yield* card(panel, flag(AF.guTold) > 0, 'yoshi');
    yield* say(T.URIBO_YOSHI);
  } finally {
    yield* closeUribo(panel);
    unpose(p);
  }
  setFlag(AF.uribo, 1);
  addMp(2);
  se('se_item');
  yield* say(T.URIBO_REWARD);
  yield* panBack(500);
  forceBoxPos(null);
  // 段階1：マサルは 牛舎へ もどる
  if (temp && gen) sendAway(gen, [[50, 19], [48, 19], [48, 32], [51, 32]], 2.5, 300, true);
}

// ================================================================ エンディング カット3（ぜんぶ した 人）

/**
 * The turning circle's send-off (events/ch2/ending.ts cut3Bus): those who did all of it see, as the bus
 * pulls away west, the mother and her five cross small from right to left along the edge of the woods
 * below the circle (the treetops at the bottom of the shot — the 2D's window is up at the top then and
 * the HD-2D's is gone, so both show it), and go in under the trees. Only the picture: the cut's pages
 * and its length do not change. The crossing runs while the departing bus (end_bus) is there.
 */
const far = { t0: -1 };
/** How long the crossing takes (the bus leaves in ~3.5 s). */
const FAR_MS = 3300;
registerWorldFx({
  map: 'map_hoshimidai',
  anchored: true,
  draw(f: FieldScene, g: Gfx, cx: number, cy: number, layer) {
    if (layer !== 'fg' || flag('flag_ch2_stage') < 3 || !ashiatoComplete()) return;
    if (!f.actorById('end_bus')) {
      far.t0 = -1;
      return;
    }
    if (far.t0 < 0) far.t0 = f.t;
    const k = (f.t - far.t0) / FAR_MS;
    if (k > 1) return;
    const img = farBoars(Math.floor(f.t / 220) % 2);
    // from the treetops south-east of the bus stop towards the rails (world px), in under the trees at the end
    const wx = 700 - k * 100;
    const wy = 742;
    const [sx, sy] = fxAt(f, wx, wy, cx, cy, wy);
    const a = Math.min(1, k / 0.15, (1 - k) / 0.2);
    g.img(img, Math.round(sx - 6), Math.round(sy - img.height), { alpha: Math.max(0, a) });
  },
});

// ================================================================ QA

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/** Where to stand to look at each footprint (tile, facing). */
const LOOK_AT: Record<AshiatoKind, [number, number, 'up' | 'down' | 'left' | 'right']> = {
  ino: [8, 27, 'up'],
  haku: [2, 32, 'up'],
  tanu: [39, 24, 'up'],
  shika: [14, 11, 'right'],
  usagi: [22, 39, 'up'],
  inu: [48, 44, 'right'],
};

/**
 * QA: __game.cmd.ashiato(step = 'gen', stage = 1, auto = false)
 *   'gen'    おてつだいの あと、マサルの となり（段階1 牛舎 (19,6)／段階2 ゲート (49,19)）→ 話すと〔ashiato〕
 *   'ino' 'haku' 'tanu' 'shika' 'usagi' 'inu'   はじまった あと、その 足あとの 前（灯りつき）
 *   'tell'   6つ 見つけた（知らせて いない）、村の まん中
 *   'six'    6つ 見つけて 知らせた（かくしの 足あとが 出る：10タイル 歩く）、村の まん中
 *   'gu'     グソっ君の 足あとに 気づいた あと、マサルの となり
 *   'uribo'  6つの あと、すぐ うり坊を 数える（auto：自動で 数える）
 *   'done'   ぜんぶ した（みました帳・表紙・張り紙・見回り帳・エンディングの 差分を 見る）
 */
if (import.meta.env.DEV) {
  registerDebug('ashiato', (step = 'gen', st = 1, auto = false) => {
    const s2 = Number(st) >= 2;
    // (stage 2 from the gate's beat, not the hill's: its entry words would come too)
    cmd().jump?.('ch2:houki', true);
    if (s2) {
      for (const id of ['flag_ch2_tetsuya_beaten', 'flag_ch2_houki_enter', 'flag_ch2_keitora_here']) setFlag(id, 1);
      state.taken['sym_hoshi_07'] = true;
      setFlag('flag_ch2_stage', 2);
    }
    // the chores done, his first lines heard
    for (const id of ['flag_ch2_barn_work', 'flag_seen_npc_hoshi_gen_h1_1', 'flag_seen_npc_hoshi_gen_h1_2', 'flag_seen_npc_hoshi_gen_h2_1']) setFlag(id, 1);
    setFlag('flag_seen_npc_hoshi_gen_h1', 2);
    const genAt = (): unknown => (s2 ? cmd().warp?.('map_hoshimidai', 49, 19, 'right') : cmd().warp?.('map_hoshi_barn', 19, 6, 'right'));
    if (step === 'gen') return genAt();
    setFlag(AF.start, 1);
    if ((ASHIATO_KINDS as string[]).includes(String(step))) {
      const [x, y, d] = LOOK_AT[step as AshiatoKind];
      return cmd().warp?.('map_hoshimidai', x, y, d);
    }
    for (const k of ASHIATO_KINDS) setFlag(foundFlag(k), 1);
    if (step === 'tell') return cmd().warp?.('map_hoshimidai', 26, 34, 'up');
    setFlag(AF.six, 1);
    for (const k of ASHIATO_KINDS) setFlag(toldFlag(k), 1);
    trail.walked = 0;
    if (step === 'six') return cmd().warp?.('map_hoshimidai', 48, 30, 'up');
    if (step === 'gu') {
      setFlag(AF.gu, 1);
      return genAt();
    }
    if (step === 'uribo') {
      qaAuto = !!auto;
      const r = s2 ? cmd().warp?.('map_hoshimidai', 49, 19, 'up') : cmd().warp?.('map_hoshi_barn', 19, 6, 'right');
      // (after the warp has landed and he can walk)
      const want = s2 ? 'map_hoshimidai' : 'map_hoshi_barn';
      const t0 = Date.now();
      const go = setInterval(() => {
        const f = field();
        if (Date.now() - t0 > 8000) clearInterval(go);
        if (!f || f.map.id !== want || !f.controllable || game.top !== f) return;
        clearInterval(go);
        f.startScript(
          (function* (): Co {
            try {
              yield* uriboScene();
            } finally {
              qaAuto = false;
            }
          })(),
        );
      }, 200);
      return r;
    }
    if (step === 'done') {
      for (const id of [AF.gu, AF.guTold, AF.uribo, AF.kaikin, AF.nedoko, AF.gunte, AF.genNet]) setFlag(id, 1);
      setFlag(AF.tries, 1);
      setFlag(AF.meijin, 1);
      return cmd().warp?.('map_hoshimidai', 39, 38, 'up');
    }
    return null;
  });

  /** QA: the ending's boars (カット3): on, when they started, how far across. */
  registerDebug('ashiatoEnd', () => {
    const f = field();
    return { on: ashiatoComplete(), t0: far.t0, t: f?.t, k: f && far.t0 >= 0 ? (f.t - far.t0) / FAR_MS : null, bus: !!f?.actorById('end_bus') };
  });

  registerDebug('ashiatoState', () => ({
    start: flag(AF.start),
    found: ASHIATO_KINDS.filter(found),
    told: ASHIATO_KINDS.filter(told),
    six: flag(AF.six),
    gu: [flag(AF.gu), flag(AF.guTold)],
    uribo: flag(AF.uribo),
    tries: flag(AF.tries),
    meijin: flag(AF.meijin),
    trail: { marks: trail.marks.length, walked: Math.round(trail.walked), last: trail.marks.slice(-3).map((m) => [Math.round(m.x), Math.round(m.y)]), lantern: ((l) => (l ? [Math.round(l.x), Math.round(l.y), Math.round(l.r)] : null))(field()?.light.lantern) },
    complete: ashiatoComplete(),
  }));
}

/** Every page: at most 3 lines, each at most 336 px; the chapter's banned words not in the lines. */
export function ashiatoTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const BANNED = ['まだ', '12人', '1日2本', 'おまけの 1つ', '具足様', '平和', '17', '3人', 'らっきょ', 'ほどよい', 'バス', '稲'];
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@')) return;
      let lines: string[] = [];
      const flush = () => {
        if (!lines.length) return;
        pages++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
        lines = [];
      };
      for (const raw of v.split('\n')) {
        const t = raw.trim();
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || !t) {
          flush();
          continue;
        }
        const plain = raw.replace(/\{[^}]*\}/g, '');
        if (measure(plain) > 336) bad.push(`${name}: ${measure(plain)}px: ${plain}`);
        for (const b of BANNED) if (plain.includes(b) && !(b === '17' && /\d17|17\d/.test(plain))) bad.push(`${name}: 「${b}」: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('ashiato', T.ASHIATO_TEXTS);
  // (the single-line ones are pages too)
  for (const k of ASHIATO_KINDS) walkT(`book.${k}`, `@x\n${T.ASHIATO_BOOK.rows[k].place}\n${T.ASHIATO_BOOK.rows[k].who}`);
  return { pages, bad };
}
if (import.meta.env.DEV) registerDebug('ashiatoText', () => ashiatoTextCheck());
