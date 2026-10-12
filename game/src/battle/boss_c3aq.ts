// 旧水族館の 人が 相手の 戦闘（61 12・13・16.5〜16.7・17.13〜17.16）：
//
//  ツガオ 初戦（boss_tsugao_1）  負け戦。何も 効かない（攻撃は「……びくとも しない。」、ハンコは 黒い
//      「まだ」に はじかれる、みましたは「見られるのは、なれとる。」）。グソっ君は 1ラウンド目から 足が
//      動かない。ツガオは ラウンドの 最後に 煽るだけ（「！」なし）。4ラウンド目の あくびの あと
//      「……この程度じゃあ、寝てしまうわい。」→ 青い 黒へ 暗転 → 'lose'（HP・朱肉・状態は 戦闘の 前に
//      もどす。ゲームオーバーなし）
//  ヒロスケ・ポコシャ（boss_hirosuke・boss_pokosha） 3人 対 2人、2段：
//      1段目 ヒロスケ：黒い「まだ」の ゲージ 360（数字は 出さず「ま」「だ」の 字が 散る）。錠 108。
//        鉄板の 熱＝手の ゆるみ（焼き芋の 自分の 回復 −25%/段）。熱3 で 黒い『まだ』が 見える（以後 ずっと）。
//        見えていて ゲージ 108 以下 → ごちそうさま で 1段目 おわり。ポコシャは うしろで 見回り
//        （のぞいた 人の ヒロスケへの 次の 一手を 半分 受けとめる）。
//      2段目 ポコシャ：係長の 声（黒い 吹き出し）が ラウンドの はじめに 1つずつ 降る。声1・3は グソっ君、
//        声2は ヤキソバンの コマンドの いちばん 上に「ツッコむ」。3つ ほどけたら、しゅんの コマンドは
//        「はなまる」1つ、名札に 押して 決着（'win'）。
//  どちらも 攻撃しない。全滅しない。

import type { Co } from '../engine/co';
import type { Gfx } from '../engine/gfx';
import { ease } from '../engine/tween';
import { rng } from '../engine/rng';
import { game } from '../engine/game';
import { flag, setFlag, state } from '../game/state';
import { setSpace, stopBgm } from '../audio';
import { fillAll, getSkill, getItem, SYS3 } from '../data/battle';
import type { BattleResult } from './api';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import type { EnemyUnit, Judge, PartyCmd, PartyUnit } from './model';
import { healParty, showSticky } from './common';
import { knSay } from './gusokkun';
import { PANEL_POS, TAG } from './ui/panels';
import { C, tapeCanvas } from './ui/note';
import { madaMark } from './art/fxart_ch3';
import { heatOf, showYakiLine, yakiSay } from './party_ch3';
import { hanamaruFrame } from './art/stamps';
import { makeCanvas } from '../engine/pixel';
import { drawText, measure } from '../engine/font';

// ---- who is here --------------------------------------------------------------------------------

function find(s: BattleScene, id: string): EnemyUnit | undefined {
  return s.enemies.find((e) => e.id === id && !e.dead);
}
const tsugao = (s: BattleScene) => find(s, 'boss_tsugao_1');
const hiro = (s: BattleScene) => find(s, 'boss_hirosuke');
const poko = (s: BattleScene) => find(s, 'boss_pokosha');

export function isAqPeople(s: BattleScene): boolean {
  return !!(tsugao(s) || hiro(s) || poko(s));
}

function phase(s: BattleScene): number {
  return s.shared.hpPhase ?? 1;
}

const X = (e: EnemyUnit) => e.def.texts.extra;

// ---- start ----------------------------------------------------------------------------------------

interface Snap {
  hp: number;
  mp: number;
  status: Record<string, number>;
}
const snaps = new WeakMap<BattleScene, Map<string, Snap>>();

/** ch3Start: the statuses, the places, the stickies' hooks. */
export function aqStart(s: BattleScene): void {
  const t = tsugao(s);
  if (t) {
    // 負けで 何も 失わない: the party as it came in (61 12.4)
    snaps.set(s, new Map(s.party.map((u) => [u.id, { hp: u.m.hp, mp: u.m.mp, status: { ...u.m.status } }])));
    t.x = t.xTarget = 192;
    t.footY = 144;
    // グソっ君's feet will not move (the whole battle)
    if (s.kanenari) s.kanenari.m.status.status_c3_ashi = 99;
    s.boss = hooks(s);
    return;
  }
  const h = hiro(s);
  const p = poko(s);
  if (h && p) {
    s.shared.hpPhase = 1;
    setFlag('flag_ch3_hp_phase', 1);
    h.x = h.xTarget = 160;
    h.footY = 140;
    p.x = p.xTarget = 248;
    p.footY = 126;
    p.mem.noTarget = 1;
    p.mem.back = 1;
    s.setMusicParam('boss_phase', 1);
    s.setMusicParam('kakaricho', 0);
    s.boss = hooks(s);
  }
}

/** After the appearance pages: ヤキソバンの 付箋, the cursor on 鉄板 (61 5.1). */
export function* aqOpening(s: BattleScene): Co {
  if (hiro(s) && s.yakisoban) {
    showSticky(s, 'yakisoban', 'flag_tut_yakisoban');
    s.memo.yakiTut = 1;
  }
  yield null;
}

// ---- the round --------------------------------------------------------------------------------

export function* aqRoundStart(s: BattleScene): Co {
  const t = tsugao(s);
  if (t && s.round === 1 && s.kanenari) {
    // 「……あかん。足が、動かへん。」 before the first command (60 6.8)
    s.mood(s.kanenari, 'hurt', 1600);
    yield* knSay(s, X(t).knAshi ?? []);
  }
  const p = poko(s);
  if (p && phase(s) === 2 && !s.memo.ch3Won) {
    const n = s.memo.koeN ?? 0;
    if (n >= 3 && !s.memo.nafudaTurn) {
      // 名札に、はなまるを (24 #26)
      s.memo.nafudaTurn = 1;
      p.mem.noTarget = 0;
      yield* s.say(X(p).prompt ?? []);
    } else if (n < 3 && !s.memo.koeActive) yield* koeFall(s, p, n);
  }
}

/** 61 13.5: one black balloon falls over ポコシャ, who curls up small. */
function* koeFall(s: BattleScene, p: EnemyUnit, n: number): Co {
  s.memo.koeActive = 1;
  s.memo.koeFor = n === 1 ? 2 : 1; // 1 グソっ君, 2 ヤキソバン
  koeFx.set(s, { t0: s.t, n, untie: -1 });
  s.sfx('se_c3_koe');
  p.status.c3_chijimu = true;
  p.setPose('chijimu');
  s.setMusicParam('kakaricho', 3 - n);
  yield 400;
  // the voice: no name tag (60 0.4 npc_c3_kakaricho_voice)
  yield* s.say(X(p)['koe' + (n + 1)] ?? []);
  yield* s.say(X(p).koeResult ?? [], false, { autoMs: 700 });
  if (n === 0) showSticky(s, 'koe', 'flag_tut_koe');
}

/** The enemies' order this round (61 12.2: ツガオ last; 13.3: 段取り puts the two first). */
export function aqOrder(s: BattleScene, plans: { prio: number; e?: EnemyUnit }[]): void {
  for (const p of plans) {
    if (p.e?.id === 'boss_tsugao_1') p.prio = -10;
    if (s.memo.dandoriRound === s.round && (p.e?.id === 'boss_hirosuke' || p.e?.id === 'boss_pokosha')) p.prio = 5;
  }
}

/** The end of a round (61 12.4: after the fourth taunt the battle is over; 13.5: the name tag lights). */
export function* aqRoundEnd(s: BattleScene): Co {
  const t = tsugao(s);
  if (t && s.round >= 4 && !s.memo.aqLose) {
    yield* tsugaoEnd(s, t);
    return;
  }
  const p = poko(s);
  if (p && phase(s) === 2 && (s.memo.koeN ?? 0) >= 3 && !s.memo.nameLit) {
    s.memo.nameLit = 1;
    p.params.nameGlow = 1;
    s.sfx('se_glint');
    yield 400;
  }
  // ぴーちゃんの 目の 付箋 goes at the end of the round
  delete s.memo.peekId;
}

// ---- the party's actions on the people -------------------------------------------------------------

const acted = new WeakMap<BattleScene, { actor: string; move: string }>();

/** Before a party action: who does what (for 「$actorの $move！」), and the guarded ones. */
export function* aqBeforeParty(s: BattleScene, c: PartyCmd): Co<boolean> {
  if (!isAqPeople(s)) return false;
  const move = c.kind === 'attack' ? (c.u.id === 'yakisoban' ? 'ヘラ' : c.u.id === 'kanenari' ? 'こうらタックル' : 'たたく') : c.kind === 'nori' ? 'ノリツッコミ' : '';
  acted.set(s, { actor: c.kind === 'nori' ? 'しゅんたち' : c.u.name, move });
  // ぴーちゃん looked at this one: ポコシャ steps in and takes half (61 13.3)
  s.memo.halve = s.memo.peekId && s.memo.peekId === s.party.indexOf(c.u) + 1 && (c.kind === 'attack' || c.kind === 'hanko') ? 1 : 0;
  const p = poko(s);
  // 2段目: a hit at ポコシャ while it is curled up does not reach (the turn is used)
  if (p && c.kind === 'attack' && c.target === p && p.status.c3_chijimu) {
    yield* s.say(X(p).chijimu ?? []);
    return true;
  }
  return false;
}

/**
 * hurtEnemy's first word on the people: ツガオ・ポコシャ take nothing (two black
 * 「ま」「だ」 fly off); ヒロスケ's gauge goes down without a number, stops at the
 * lock (108) until his 『まだ』 is seen. Returns true when it was handled.
 */
export function aqHurt(s: BattleScene, e: EnemyUnit, dmg: number): boolean {
  if (e.def.untouchable) {
    madaLetters(s, e, 2);
    e.setPose('hurt');
    e.hurtT = 160;
    e.hurtReturn = e.id === 'boss_pokosha' && e.status.c3_chijimu ? 'chijimu' : 'idle';
    if (e.id === 'boss_tsugao_1') s.memo.bikutomo = 1;
    return true;
  }
  if (e.def.gauge) {
    // (sitting by the wall in the second part: nothing reaches him)
    if (e.mem.noTarget) return true;
    let d = Math.max(0, Math.round(dmg));
    if (s.memo.halve) {
      d = Math.round(d / 2);
      s.memo.halveSaid = (s.memo.halveSaid ?? 0) + 1;
      s.memo.halve = 0;
      s.memo.halveNow = 1;
      const p = poko(s);
      if (p) {
        p.offX = -10;
        s.run(
          (function* () {
            yield 300;
            p.offX = 0;
          })(),
        );
      }
    }
    const before = e.hp;
    const floor = e.mem.madaSeen ? 1 : e.def.gauge.lock;
    e.hp = Math.max(Math.min(before, floor), before - d);
    e.trailWait = 400;
    e.hpTrail = Math.max(e.hpTrail, before);
    madaLetters(s, e, Math.max(2, Math.min(8, Math.round((before - e.hp) / 8))));
    if (before - e.hp > 0) {
      e.setPose('hurt');
      e.hurtT = 200;
      e.hurtReturn = 'idle';
    }
    if (!e.mem.madaSeen && e.hp <= e.def.gauge.lock && !s.memo.lockSaid) s.memo.lockSay = 1;
    return true;
  }
  return false;
}

/** 61 17.13: little black 「ま」「だ」 fly out of the one hit and melt white. */
function madaLetters(s: BattleScene, e: EnemyUnit, n: number): void {
  for (let i = 0; i < n; i++) {
    const a = rng.range(-Math.PI, 0);
    const sp = rng.range(26, 50);
    const ch = i % 2 ? 'だ' : 'ま';
    const img = letterImg(ch);
    const x0 = e.coreX + rng.int(-8, 8);
    const y0 = e.coreY + rng.int(-10, 6);
    s.addFx({
      layer: 'top',
      dur: 420,
      draw: (g, t) => {
        const p = t / 420;
        const x = x0 + Math.cos(a) * sp * p;
        const y = y0 + Math.sin(a) * sp * p + 14 * p * p;
        g.alpha(1 - p, () => g.img(img, Math.round(x - 4), Math.round(y - 4)));
      },
    });
  }
}

const letters = new Map<string, HTMLCanvasElement>();
function letterImg(ch: string): HTMLCanvasElement {
  let c = letters.get(ch);
  if (!c) {
    const w = measure(ch) + 2;
    const [cv, ctx] = makeCanvas(w, 18);
    drawText(ctx, ch, 1, 1, { color: '#1B1733' });
    c = cv;
    letters.set(ch, c);
  }
  return c;
}

/** After each action: the lines the people's rules owe (びくとも しない, 半分, 手の ゆるみ, 『まだ』). */
export function* aqAfterAction(s: BattleScene): Co {
  const t = tsugao(s);
  if (t && s.memo.bikutomo) {
    s.memo.bikutomo = 0;
    const a = acted.get(s);
    if (a?.move) yield* s.say(fillAll(X(t).bikutomo ?? [], { actor: a.actor, move: a.move }));
  }
  const h = hiro(s);
  if (!h || phase(s) !== 1 || s.memo.ch3Won) return;
  const p = poko(s);
  if (s.memo.halveNow && p) {
    s.memo.halveNow = 0;
    if ((s.memo.halveSaid ?? 0) <= 2) yield* s.say(X(p).halfBlock ?? [], false, { autoMs: 700 });
  }
  if (s.memo.lockSay) {
    s.memo.lockSay = 0;
    s.memo.lockSaid = 1;
    yield* s.say(X(h).lockHold ?? []);
  }
  // 手の ゆるみ = the heat (61 13.3)
  const heat = heatOf(s);
  const was = h.mem.yurumu ?? 0;
  if (heat !== was) {
    h.mem.yurumu = heat;
    h.params.yurumu = heat;
    if (heat > was) {
      yield* s.say(X(h).teppanAfter ?? [], false, { autoMs: 700 });
      showSticky(s, 'teppan', 'flag_tut_teppan');
    }
    if (heat >= 3 && !h.mem.madaSeen) {
      h.mem.madaSeen = 1;
      h.params.madaSeen = 1;
      s.sfx('se_glint');
      s.hitstop(6);
      yield* s.say(X(h).madaSeen ?? []);
    }
  }
  if (h.mem.madaSeen && h.hp <= (h.def.gauge?.lock ?? 108) && !s.memo.gochiTut) {
    s.memo.gochiTut = 1;
    showSticky(s, 'gochisou', 'flag_tut_gochisou', true);
  }
}

/** Is ごちそうさま the finishing move on ヒロスケ now (the hanko list pulses it)? */
export function hiroReady(s: BattleScene): boolean {
  const h = hiro(s);
  return !!h && phase(s) === 1 && !!h.mem.madaSeen && h.hp <= (h.def.gauge?.lock ?? 108);
}

// ---- the people's moves (no "!") ----------------------------------------------------------------

/** doEnemyAction's first word: the moves that are not attacks. Returns true when handled. */
export function* aqMove(s: BattleScene, e: EnemyUnit, skillId: string): Co<boolean> {
  switch (skillId) {
    case 'skill_tsugao_aori':
      yield* aori(s, e);
      return true;
    case 'skill_hiro_yakiimo':
      if (phase(s) !== 1) return true;
      yield* yakiimo(s, e);
      return true;
    case 'skill_hiro_dandori':
    case 'skill_idle':
      // ヒロスケ sitting by the wall (the second part) does nothing at all
      if (e.id === 'boss_hirosuke' && phase(s) !== 1) return true;
      if (e.id === 'boss_hirosuke' && skillId === 'skill_idle') {
        s.noteActing(e.name, undefined, true);
        e.mem.acts = (e.mem.acts ?? 0) + 1;
        yield* s.say(e.def.texts.idle[0] ?? []);
        return true;
      }
      return false;
    case 'skill_pokosha_mimawari':
    case 'skill_pokosha_mamoru':
      yield* pokoAct(s, e);
      return true;
  }
  return false;
}

function* aori(s: BattleScene, e: EnemyUnit): Co {
  const n = Math.min(4, (e.mem.aori ?? 0) + 1);
  e.mem.aori = n;
  s.noteActing('煽る', undefined, true);
  e.setPose(n === 4 ? 'yawn' : 'aori');
  if (n === 4) s.sfx('se_c3_aq_akubi');
  yield 300;
  yield* s.say(X(e)['aori' + n] ?? [], false, n === 4 ? {} : { voice: 'tsugao' });
  e.setPose('idle');
}

function* tsugaoEnd(s: BattleScene, e: EnemyUnit): Co {
  // the song fades over 1.5 s (61 12.4) — the hall's song is the field's: E fades it back in
  stopBgm(1.5);
  yield 600;
  yield* s.say(X(e).end ?? [], false, { voice: 'tsugao' });
  e.setPose('lean');
  yield 300;
  s.memo.aqLose = 1;
}

/** 61 12.4: the dark is blue-black, nothing is lost, no game over. */
export function* aqLoseFinish(s: BattleScene): Co<BattleResult> {
  const t0 = s.t;
  s.cmd = null;
  s.list = null;
  s.msg.clearStatic();
  while (s.t - t0 < 1200) {
    s.tint = { color: '#0B1420', alpha: Math.min(1, (s.t - t0) / 1200) };
    yield null;
  }
  const sn = snaps.get(s);
  for (const u of s.party) {
    const v = sn?.get(u.id);
    if (v) {
      u.m.hp = v.hp;
      u.m.mp = v.mp;
      u.m.status = { ...v.status };
    } else u.m.status = {};
    delete u.m.status.status_c3_ashi;
    u.guard = false;
  }
  s.hideAll = true;
  s.transitionDraw = (g) => g.clear('#0B1420');
  game.fadeColor = '#0B1420';
  game.fadeAlpha = 1;
  if (s.prevSpace) setSpace(s.prevSpace);
  return 'lose';
}

function* yakiimo(s: BattleScene, e: EnemyUnit): Co {
  s.noteActing('焼き芋 食うか？', undefined, true);
  e.mem.acts = (e.mem.acts ?? 0) + 1;
  e.lastSkills.push('skill_hiro_yakiimo');
  e.setPose('imo');
  s.post(X(e).yakiimo ?? []);
  s.sfx('se_c3_yakiimo');
  yield 600;
  // newspaper and foil: a sweet potato to every panel
  for (const u of s.party) {
    const [px, py] = PANEL_POS[u.id] ?? [104, 150];
    s.stars(px + 16, py, 3, [20, 50]);
    if (u.alive) healParty(s, u, 20);
  }
  // the one who may be falling: he keeps his own back (60 6.9 「負けにくい」)
  const selfless = s.party.some((u) => u.hpRate <= 0.25 + 1e-6) || !!e.status.c3_gochisou;
  let healed = 0;
  if (!selfless) {
    const yur = e.mem.yurumu ?? 0;
    healed = Math.round(40 * Math.max(0, 1 - 0.25 * yur));
    if (healed > 0) {
      e.hp = Math.min(e.maxHp, e.hp + healed);
      e.hpTrail = Math.min(e.hpTrail, e.hp);
    }
  }
  yield 400;
  e.setPose('idle');
  if (healed > 0) {
    yield* s.say(X(e).yakiimoResult ?? []);
    // the "!" that is グソっ君's own line (no tsukkomi input, not in the book)
    if (s.kanenari?.alive) {
      s.mood(s.kanenari, 'tsukkomi', 1400);
      yield* knSay(s, X(e).yakiimoKn ?? []);
    }
  } else {
    yield* s.say(X(e).yakiimoOurs ?? []);
    if (!e.status.c3_gochisou) yield* s.say(X(e).yakiimoSelfless ?? []);
  }
}

function* pokoAct(s: BattleScene, e: EnemyUnit): Co {
  s.noteActing('見回り', undefined, true);
  e.mem.acts = (e.mem.acts ?? 0) + 1;
  if (phase(s) === 1) {
    // ぴーちゃん peeks at one panel; that one's next move at ヒロスケ is half taken
    const list = s.party.filter((u) => u.canAct);
    const u = list.length ? rng.pick(list) : undefined;
    if (!u) return;
    s.memo.peekId = s.party.indexOf(u) + 1;
    e.setPose('peek');
    s.sfx('se_c3_pii');
    yield 300;
    yield* s.say(X(e).mimawari1 ?? [], false, { autoMs: 700 });
    e.setPose('idle');
    return;
  }
  if (s.memo.nafudaTurn) return;
  if (e.status.c3_chijimu) {
    yield* s.say(X(e).koeResult ?? [], false, { autoMs: 600 });
    return;
  }
  e.setPose('peek');
  s.sfx('se_c3_pii');
  yield 250;
  yield* s.say(X(e).mimawari2 ?? [], false, { autoMs: 600 });
  e.setPose('idle');
}

// ---- ツッコむ (61 13.5・17.16) ------------------------------------------------------------------------

/** Is ツッコむ the top command for this member now? */
export function aqKoeIcon(s: BattleScene, u: PartyUnit): { id: string; name: string }[] {
  if (!s.memo.koeActive || s.memo.nafudaTurn) return [];
  const who = s.memo.koeFor === 2 ? 'yakisoban' : 'kanenari';
  // (if that one cannot act, the other answers)
  const wu = s.party.find((p) => p.id === who);
  const id = wu?.canAct ? who : who === 'kanenari' ? 'yakisoban' : 'kanenari';
  return u.id === id ? [{ id: 'tsukkomu', name: 'ツッコむ' }] : [];
}

export function* doKoe(s: BattleScene, u: PartyUnit): Co {
  const p = poko(s);
  if (!p || !s.memo.koeActive) return;
  const n = s.memo.koeN ?? 0;
  const line = (X(p)['tsuk' + (n + 1)] ?? [''])[0];
  s.mood(u, 'tsukkomi', 1600);
  s.sfx('se_bishi');
  // the white balloon of the set line, then the black one comes apart
  if (u.id === 'yakisoban') yield* yakiSay(s, [line]);
  else yield* knSay(s, [line]);
  const k = koeFx.get(s);
  if (k) k.untie = s.t;
  s.sfx('se_c3_koe_break');
  yield 520;
  koeFx.delete(s);
  s.memo.koeActive = 0;
  s.memo.koeN = n + 1;
  p.params.koeN = n + 1;
  s.setMusicParam('kakaricho', 2 - n);
  if (n + 1 >= 3) {
    p.status.c3_chijimu = false;
    p.setPose('idle');
  } else p.setPose('loosen');
  yield* s.say(X(p).koeBreak ?? [], false, { autoMs: 700 });
}

// ---- the hanko on the people -----------------------------------------------------------------------

/** doHanko after the press: returns true when the people's rules took the stamp. */
export function* aqHankoOn(s: BattleScene, _u: PartyUnit, skill: string, e: EnemyUnit, j: Judge): Co<boolean> {
  if (e.id === 'boss_tsugao_1') {
    if (skill === 'skill_mimashita') {
      yield* s.say(X(e).mimashita ?? []);
      return true;
    }
    yield* hajiku(s, e);
    yield* s.say(X(e).hajiku ?? []);
    return true;
  }
  if (e.id === 'boss_pokosha') {
    if (skill === 'skill_hanamaru' && s.memo.nafudaTurn) {
      yield* nafudaHanamaru(s, e, j);
      return true;
    }
    if (e.status.c3_chijimu) {
      yield* s.say(X(e).chijimu ?? []);
      return true;
    }
    if (skill === 'skill_mimashita') {
      e.mimaEver = true;
      yield* s.say(X(e).mimashita ?? []);
      return true;
    }
    madaLetters(s, e, 2);
    return false;
  }
  return false;
}

/** 61 17.15: the stamp stops on the black film round him; the ink spits off in dots. */
function* hajiku(s: BattleScene, e: EnemyUnit): Co {
  e.params.film = 1;
  s.sfx('se_c3_hajiku');
  s.hitstop(6);
  s.burst(e.coreX, e.coreY, { count: 12, speed: [60, 130], life: [300, 450], colors: ['#E23B2E', '#FF6A4D'], gravity: 120, shape: 'sq', size: [2, 2], sizeEnd: 1 });
  yield 500;
  e.params.film = 0;
}

/** ごちそうさま on ヒロスケ (61 13.3・13.4). Returns true when it took the stamp. */
export function* aqGochisou(s: BattleScene, e: EnemyUnit): Co<boolean> {
  if (e.id !== 'boss_hirosuke') return false;
  if (!hiroReady(s)) {
    yield* s.say(SYS3.gochisou);
    // ① his own sweet potato is put away (we still get ours)
    if (!e.status.c3_gochisou) {
      e.status.c3_gochisou = true;
      e.params.tapeAt_gochisou = s.t;
      yield* s.say(X(e).gochisouSeal ?? []);
    } else yield* s.say(fillAll(['$enemyは 小さく おじぎを した。'], { enemy: e.name }));
    return true;
  }
  yield* phase1End(s, e);
  return true;
}

function* phase1End(s: BattleScene, h: EnemyUnit): Co {
  yield* s.say(X(h).gochisouPressed ?? []);
  const y = s.yakisoban;
  if (y) {
    y.bounceT = 250;
    y.bounceAmp = 4;
  }
  s.memo.mafiLight = s.t;
  yield* yakiSay(s, X(h).yakiLine ?? []);
  // the sweet potato rolls from his hand to ヤキソバン's feet
  const st = { p: 0 };
  const fx = s.addFx({
    layer: 'world',
    dur: 0,
    draw: (g) => {
      const x = h.coreX + (300 - h.coreX) * st.p;
      const yy = h.footY - 18 + (142 - h.footY + 18) * st.p - Math.abs(Math.sin(st.p * Math.PI * 3)) * 6;
      g.rect(Math.round(x - 5), Math.round(yy - 3), 10, 6, '#8A3A5A');
      g.rect(Math.round(x - 4), Math.round(yy - 3), 8, 1, '#B85A7A');
    },
  });
  s.post(X(h).phase1End ?? []);
  for (let i = 1; i <= 36; i++) {
    st.p = i / 36;
    yield null;
  }
  yield () => !s.msg.busy;
  yield 400;
  // the gauge's black cracks and falls (17.14)
  h.params.gaugeBreak = s.t;
  s.sfx('se_part_break', { vol: 0.6 });
  h.hp = h.def.gauge?.lock ?? 108;
  yield 400;
  fx.done = true;
  // he steps back to the wall and sits (800 ms)
  h.mem.noTarget = 1;
  h.xTarget = 330;
  h.params.sit = 1;
  h.setPose('sit');
  for (let i = 0; i < 48; i++) {
    h.x += (330 - h.x) * 0.12;
    yield null;
  }
  h.x = 330;
  yield* s.say(X(h).hiroAfter ?? [], false, { tag: 'ヒロスケ', voice: 'hirosuke' });
  // ポコシャ comes forward (600 ms). The second part.
  const p = poko(s);
  s.shared.hpPhase = 2;
  setFlag('flag_ch3_hp_phase', 2);
  s.setMusicParam('boss_phase', 2);
  if (p) {
    p.mem.back = 0;
    p.mem.noTarget = 0;
    const x0 = p.x;
    const f0 = p.footY;
    for (let i = 1; i <= 36; i++) {
      const q = ease.quadOut(i / 36);
      p.x = p.xTarget = x0 + (192 - x0) * q;
      p.footY = f0 + (140 - f0) * q;
      yield null;
    }
    yield* s.say(X(p).appear2 ?? []);
    p.params.nameMada = 1;
    yield* s.say(X(p).nameMada ?? []);
  }
  // (the voices come at the start of the next round)
}

/** 61 13.6: the はなまる on the name tag — the black まだ breaks; the battle is won. */
function* nafudaHanamaru(s: BattleScene, p: EnemyUnit, j: Judge): Co {
  const x = p.coreX - 6;
  const y = p.top + 34;
  s.sfx('se_stamp');
  s.hitstop(j === 'kukkiri' ? 10 : 6);
  s.sfx('se_hanamaru', { grade: j === 'futsuu' ? 'futsu' : j });
  s.addFx({
    layer: 'world',
    dur: 0,
    draw: (g, t) => {
      const img = hanamaruFrame(16, Math.min(1, t / 300), j === 'kasure', 1);
      g.img(img, Math.round(x - 8), Math.round(y - 8));
    },
  });
  yield 300;
  p.params.nameMada = 0;
  p.params.nameGlow = 0;
  s.burst(x, y, { count: 8, speed: [30, 70], angle: [Math.PI * 0.2, Math.PI * 0.8], life: [300, 500], colors: ['#1B1733'], gravity: 260, shape: 'sq', size: [2, 2], sizeEnd: 1 });
  s.sfx('se_part_break', { vol: 0.5 });
  s.petals(x, y, 12, 16, false);
  yield 400;
  yield* s.say(X(p).hanamaru ?? []);
  s.memo.ch3Won = 1;
  p.mem.settled = 1;
  const h = hiro(s);
  if (h) h.mem.settled = 1;
  setFlag('flag_ch3_hp_phase', 0);
  s.setMusicParam('kakaricho', 0);
}

// ---- drawing: the gauge, the stickies, the black balloon, ぴーちゃんの 目 -------------------------------

const koeFx = new WeakMap<BattleScene, { t0: number; n: number; untie: number }>();

function hooks(s: BattleScene): NonNullable<BattleScene['boss']> {
  return {
    drawOver: (g) => {
      const t = tsugao(s);
      if (t && t.params.film) drawFilm(g, t);
      const h = hiro(s);
      if (h && phase(s) === 1 && !s.memo.ch3Won) drawGauge(s, g, h);
      const k = koeFx.get(s);
      const p = poko(s);
      if (k && p) drawKoe(s, g, p, k);
      // the マフィ屋 sign lit by the griddle's orange for a second (18.10)
      if (s.memo.mafiLight && s.t - s.memo.mafiLight < 1000) g.rect(8, 60, 40, 30, '#F2894B', 0.18 * (1 - (s.t - s.memo.mafiLight) / 1000));
    },
    drawUi: (g) => {
      const y = s.msg.bottom + 2;
      const h = hiro(s);
      if (!h || s.memo.ch3Won) return;
      g.rect(302, y + 2, 76, 20, C.shadow, 0.45);
      g.rect(300, y, 76, 20, C.stickyEdge);
      g.rect(301, y + 1, 74, 18, C.sticky);
      g.img(tapeCanvas(18, 6, '', C.tape, 8), 329, y - 3);
      if (phase(s) === 1) {
        // the black seal (grey outline until seen), the open fingers (手の ゆるみ)
        if (h.mem.madaSeen) g.img(madaMark(12, 10, 5), 306, y + 5);
        else g.frame(306, y + 5, 12, 10, C.gray);
        const yur = h.mem.yurumu ?? 0;
        for (let i = 0; i < 3; i++) g.rect(326 + i * 8, y + 6 + (i < yur ? 0 : 4), 3, i < yur ? 9 : 5, i < yur ? '#F2894B' : '#C8C2B4');
      } else {
        // three black balloons; the untied ones go white
        const n = s.memo.koeN ?? 0;
        for (let i = 0; i < 3; i++) {
          const bx = 306 + i * 22;
          g.rect(bx, y + 5, 14, 9, i < n ? '#F4F1E8' : '#1B1733');
          g.frame(bx, y + 5, 14, 9, '#4A4A55');
          g.px(bx + 3, y + 14, i < n ? '#F4F1E8' : '#1B1733');
        }
      }
      // ぴーちゃんの 目: on the name tag of the one being watched
      const pid = s.memo.peekId ? s.party[s.memo.peekId - 1]?.id : undefined;
      const tag = pid ? TAG[pid] : undefined;
      if (tag) {
        const ex = tag[0] + tag[2] - 9;
        const ey = tag[1] - 4;
        g.rect(ex, ey, 8, 8, '#F4F1E8');
        g.frame(ex, ey, 8, 8, C.ink);
        g.px(ex + 3, ey + 3, C.ink);
        g.px(ex + 5, ey + 3, C.ink);
      }
    },
  };
}

/** 61 16.6: the black gauge over his head (black turning white), the lock at 30%. */
function drawGauge(s: BattleScene, g: Gfx, e: EnemyUnit): void {
  const w = 64;
  const x = Math.round(e.x - w / 2);
  const y = Math.max(s.msg.bottom + 4, e.top - 10);
  const rate = e.hp / e.maxHp;
  const brk = e.params.gaugeBreak ? Math.min(1, (s.t - e.params.gaugeBreak) / 400) : 0;
  g.rect(x - 1, y - 1, w + 2, 6, '#2A2440');
  g.rect(x, y, w, 4, '#F4F1E8');
  const k = Math.round(w * rate);
  if (!brk) g.rect(x, y, k, 4, '#1B1733');
  else for (let i = 0; i < k; i += 4) g.rect(x + i, Math.round(y + brk * (10 + (i % 3) * 6)), 3, 3, '#1B1733', 1 - brk);
  // the lock
  const lx = x + Math.round(w * ((e.def.gauge?.lock ?? 108) / e.maxHp));
  if (!e.mem.madaSeen) {
    g.rect(lx - 2, y - 4, 5, 6, '#D9A441');
    g.rect(lx - 1, y - 6, 3, 2, '#D9A441');
  } else if (!brk) g.rect(lx - 2, y + 4 + Math.min(6, (s.t % 100000) / 100), 5, 3, '#D9A441', 0.6);
}

/** The black film round ツガオ, seen only as the stamp bounces off (α60%). */
function drawFilm(g: Gfx, e: EnemyUnit): void {
  g.ctx.save();
  g.ctx.globalAlpha = 0.6;
  g.ctx.fillStyle = '#1B1733';
  g.ctx.beginPath();
  g.ctx.ellipse(e.coreX, e.coreY - 4, 36, 54, 0, 0, Math.PI * 2);
  g.ctx.fill();
  g.ctx.restore();
}

const koeImgs = new Map<string, HTMLCanvasElement>();
function koeImg(text: string): HTMLCanvasElement {
  let c = koeImgs.get(text);
  if (c) return c;
  const [cv, ctx] = makeCanvas(112, 28);
  ctx.fillStyle = '#4A4A55';
  ctx.fillRect(0, 0, 112, 28);
  ctx.fillStyle = '#1B1733';
  ctx.fillRect(1, 1, 110, 26);
  const w = measure(text);
  drawText(ctx, text, Math.round(56 - w / 2), 5, { color: '#E8E4D8' });
  c = cv;
  koeImgs.set(text, c);
  return c;
}

/** 61 16.7・17.16: the black balloon over ポコシャ (its tail points off the top). */
function drawKoe(s: BattleScene, g: Gfx, p: EnemyUnit, k: { t0: number; n: number; untie: number }): void {
  const text = (X(p)['koe' + (k.n + 1)] ?? [''])[0].replace(/\n/g, '');
  const img = koeImg(text);
  const t = s.t - k.t0;
  const fall = Math.min(1, t / 300);
  const y = Math.round(-30 + (s.msg.bottom + 8 + 30) * ease.backOut(fall));
  const x = 192 - 56;
  // the tail: up, off the screen (whose voice it is is not shown)
  g.rect(x + 80, 0, 3, Math.max(0, y), '#1B1733');
  if (k.untie < 0) {
    g.img(img, x, y);
    return;
  }
  // it comes apart from the left in strips that fall
  const u = Math.min(1, (s.t - k.untie) / 500);
  const cut = Math.round(112 * u);
  g.ctx.drawImage(img, cut, 0, 112 - cut, 28, x + cut, y, 112 - cut, 28);
  for (let i = 0; i < cut; i += 6) g.rect(x + i, Math.round(y + 28 * u + ((i * 7) % 11)), 4, 2, '#1B1733', 1 - u);
  void FRAME;
}

void flag;
void state;
void getSkill;
void getItem;
