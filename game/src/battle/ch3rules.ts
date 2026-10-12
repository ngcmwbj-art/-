// 第3章の戦闘のしくみ（61 9.1・10・11・16.5・17.6・17.7・11.8）：
//  ネフダマヨイ  値段が 決まらない（まもり×1.5。ツッコミか みましたで 決まる）
//  オカワリナベ  ふた（開いているあいだ まもり+1・ラウンドの 終わりに 中身+20・中身は 140 で 止まる）、
//                閉まって 3ラウンド目の 終わりに また 開く、中身 140 以下で ふたが 閉まっていれば
//                鍋に『はなまる』（hanko_ch3.ts）で 決着
//  ナリオサメ    正午の 音（2ラウンド目の 終わり、そのあと 3ラウンドごとに そのラウンドを まるごと
//                巻きもどす）、錠（HP 260 より 下がらない。いただきますで 外れる）、第2段階（260 以下）、
//                最終局面（104 以下：ミナトが ボタンを 押しなおし、サイレンが 鳴りきって 12:01）
// 中ボスでも 第1章・第2章の ラスボスの しくみ（チャイム・部位・白い フェード）は 通さない。
// 画面の 左はしの 話者（ミナト・テル・ウミ）、ボスの 付箋（ふた・時計）は BattleScene.boss の フック。

import type { Co } from '../engine/co';
import type { Gfx } from '../engine/gfx';
import { ease } from '../engine/tween';
import { setFlag, state } from '../game/state';
import { chorusBlips, stopBgm, textBlip } from '../audio';
import { charSprite, hasChar, poseFrame, walkFrame } from '../art/chars';
import { c3Name, c3Voice } from '../data/text/c3_names';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import type { EnemyUnit, PartyUnit, Stages } from './model';
import { arrows, showSticky } from './common';
import { holdStamp } from './party';
import { speechBalloon } from './gusokkun';
import { C, tapeCanvas } from './ui/note';
import { itadakiSeal, madaMark } from './art/fxart_ch3';
import { aqAfterAction, aqOpening, aqRoundEnd, aqRoundStart, aqStart } from './boss_c3aq';
import { partyCh3Start, teppanRoundEnd } from './party_ch3';

// ---- who is here ------------------------------------------------------------------------

export function isCh3Battle(s: BattleScene): boolean {
  return s.enemies.some((e) => e.def.chapter === 3);
}

function nari(s: BattleScene): EnemyUnit | undefined {
  return s.enemies.find((e) => e.id === 'enemy_nariosame' && !e.dead);
}

function nabe(s: BattleScene): EnemyUnit | undefined {
  return s.enemies.find((e) => e.id === 'enemy_okawarinabe' && !e.dead);
}

/** The battle was settled by its own finish (the pot's はなまる, the siren rung out). */
export function ch3Won(s: BattleScene): boolean {
  return !!s.memo.ch3Won;
}

// ---- start ---------------------------------------------------------------------------------

/** 61 9.1・10.2・11.2: the statuses the chapter-3 enemies start with, the stickies and the speakers. */
export function ch3Start(s: BattleScene): void {
  // ヤキソバン's griddle strip (61 5.5), whoever the enemy is
  partyCh3Start(s);
  if (!isCh3Battle(s)) return;
  // 旧水族館の 人が 相手 (61 12・13)
  aqStart(s);
  for (const e of s.enemies) {
    for (const st of e.def.startStatus ?? []) {
      if (st === 'status_c3_mayoi') e.status.c3_mayoi = true;
      if (st === 'status_c3_futa') {
        e.status.c3_futa = true;
        e.stages.def.lv = 1;
        e.stages.def.turns = 99;
      }
      if (st === 'status_c3_makimodoshi') {
        e.status.c3_maki = true;
        e.mem.lock = 1;
      }
    }
  }
  const n = nari(s);
  if (n) {
    s.shared.nariPhase = 1;
    setFlag('flag_ch3_nari_phase', 1);
    s.setMusicParam('boss_phase', 1);
    s.setMusicParam('nari_rewind', 0);
  }
  if (n || nabe(s)) s.boss = hooks(s);
}

/** The enemy's own HP floor (61 10.4・11.1): 0 = none. */
export function ch3HpFloor(s: BattleScene, e: EnemyUnit): number {
  if (s.memo.ch3Won) return 0;
  if (e.id === 'enemy_okawarinabe') return e.status.c3_futa ? 140 : 1;
  if (e.id === 'enemy_nariosame') return e.mem.lock ? 260 : 1;
  return 0;
}

// ---- ネフダマヨイ ----------------------------------------------------------------------------

/** 値段が 決まった (a tsukkomi on 「ひゃく……」, or みました): ×1.5 and the steps go. */
export function decideNefuda(s: BattleScene, e: EnemyUnit): void {
  if (!e.status.c3_mayoi) return;
  e.status.c3_mayoi = false;
  if (e.stages.def.lv > 0) {
    e.stages.def.lv = 0;
    e.stages.def.turns = 0;
    arrows(s, e, false);
  }
  e.setPose('decided');
  s.sfx('se_c3_seri_bell');
}

/** After a みました on a chapter-3 enemy (61 9.1: seen, the price is read off the tag). */
export function* ch3AfterMimashita(s: BattleScene, e: EnemyUnit): Co {
  if (e.id === 'boss_hirosuke') yield* s.say(e.def.texts.extra.mimashita ?? []);
  // ヨコドリ (61 9.4): seen, it is too shy to go on aiming (the charge goes too)
  if (e.id === 'enemy_yokodori' && !e.mem.shy) {
    e.mem.shy = 1;
    e.status.tame = undefined;
    e.status.stareAt = undefined;
    e.setPose('idle');
    yield* s.say(e.def.texts.extra.mimashitaAfter ?? []);
  }
  if (e.id === 'enemy_nefuda' && e.status.c3_mayoi) {
    decideNefuda(s, e);
    yield 250;
    yield* s.say(e.def.texts.extra.decidedMima ?? []);
    if (e.pose === 'decided') e.setPose('idle');
  }
}

// ---- オカワリナベ の ふた -----------------------------------------------------------------------

export function lidClose(s: BattleScene, e: EnemyUnit): void {
  e.status.c3_futa = false;
  e.mem.closedAt = s.round;
  e.stages.def.lv = 0;
  e.stages.def.turns = 0;
  e.setPose('closed');
  s.sfx('se_c3_futa', { pitch: 0.7 });
  s.shake(0, 1, 4);
}

export function lidOpen(s: BattleScene, e: EnemyUnit): void {
  if (e.status.c3_futa) return;
  e.status.c3_futa = true;
  e.stages.def.lv = 1;
  e.stages.def.turns = 99;
  arrows(s, e, true);
  s.sfx('se_buff_up');
}

/** Can the pot take the はなまる now (61 10.4: 140 or less, its lid shut)? */
export function potReady(s: BattleScene): EnemyUnit | null {
  const e = nabe(s);
  return e && e.alive && !e.status.c3_futa && e.hp <= 140 && !s.memo.ch3Won ? e : null;
}

// ---- ナリオサメ：正午の 音（巻きもどし） ---------------------------------------------------------

interface Snap {
  party: { u: PartyUnit; hp: number; mp: number; status: Record<string, number>; stages: Stages; ct: Record<string, number> }[];
  enemies: { e: EnemyUnit; hp: number; stages: Stages; status: string; mem: Record<string, number>; last: string[] }[];
  kire: number;
  inv: string[];
  money: number;
}

const snaps = new WeakMap<BattleScene, Snap>();
const clone = <T>(v: T): T => JSON.parse(JSON.stringify(v)) as T;

function takeSnap(s: BattleScene): Snap {
  return {
    party: s.party.map((u) => ({ u, hp: u.m.hp, mp: u.m.mp, status: { ...u.m.status }, stages: clone(u.stages), ct: { ...u.ct } })),
    enemies: s.enemies.map((e) => ({ e, hp: e.hp, stages: clone(e.stages), status: JSON.stringify(e.status), mem: { ...e.mem }, last: [...e.lastSkills] })),
    kire: s.kire,
    inv: [...state.inventory],
    money: state.money,
  };
}

function restoreSnap(s: BattleScene, sn: Snap): void {
  for (const p of sn.party) {
    const u = p.u;
    u.trailWait = 0;
    u.m.hp = p.hp;
    u.m.mp = p.mp;
    u.m.status = { ...p.status };
    u.stages = clone(p.stages);
    u.ct = { ...p.ct };
    if (u.m.hp > 0) u.drop = 0;
  }
  for (const q of sn.enemies) {
    const e = q.e;
    // (the rewind itself stays: the noon sound is what rings it)
    e.hp = q.hp;
    e.stages = clone(q.stages);
    e.status = JSON.parse(q.status);
    // what it has done (acts) and the phase it said are kept: only the round is undone
    const acts = e.mem.acts;
    const shown = e.mem.madaShown;
    e.mem = { ...q.mem, acts: acts ?? 0, madaShown: shown ?? 0, rewinds: e.mem.rewinds ?? 0 };
    e.lastSkills = [...q.last];
  }
  s.kire = sn.kire;
  s.bg.kire = s.kire;
  s.setMusicParam('kire', s.kire);
  state.inventory = [...sn.inv];
  state.money = sn.money;
  s.fallen = [];
}

/** 61 11.2: the noon sound rings at the end of round 2, then every 3 rounds (5, 8, 11 …). */
function shougoRound(r: number): boolean {
  return r === 2 || (r > 2 && (r - 2) % 3 === 0);
}

/** Does the noon sound ring at the end of this round (the 様子 and the clock's trembling hand)? */
export function shougoNext(s: BattleScene): boolean {
  const e = nari(s);
  return !!e && !!e.status.c3_maki && shougoRound(Math.max(1, s.round));
}

function* rewind(s: BattleScene, e: EnemyUnit): Co {
  const sn = snaps.get(s);
  if (!sn) return;
  s.noteActing('正午の 音', undefined, true);
  // 17.6: the first note only, its mouth lights white once
  s.sfx('se_c3_siren_head');
  e.setPose('shougo', 'skill_nari_shougo');
  s.flash('#FFF6D8', 0.25, 2);
  yield 200;
  s.post(e.def.texts.tele.skill_nari_shougo ?? []);
  yield 800;
  // the reverse (0.4 s): rows waver, the bars run back
  s.sfx('se_c3_rewind');
  s.setMusicParam('nari_rewind', 1);
  restoreSnap(s, sn);
  s.addFx({
    layer: 'over',
    dur: 420,
    ui: true,
    draw: (g, t) => {
      const p = t / 420;
      g.alpha(0.22 * Math.sin(p * Math.PI), () => {
        for (let y = 0; y < 216; y += 3) g.rect(Math.round(Math.sin(y * 0.3 + t * 0.05) * 3), y, 384, 1, y % 2 ? '#DFF4FA' : '#FFF6D8');
      });
      // a clock hand turning backwards over the siren
      const a = -Math.PI / 2 - p * Math.PI * 2;
      g.alpha(0.6 * (1 - p), () => {
        for (let r = 0; r < 26; r++) g.px(Math.round(e.coreX + Math.cos(a) * r), Math.round(e.coreY + Math.sin(a) * r), '#E8ECF0');
      });
    },
  });
  yield 420;
  e.setPose('idle');
  e.mem.rewinds = (e.mem.rewinds ?? 0) + 1;
  yield* s.say(e.def.texts.extra.shougoResult ?? []);
  if (e.mem.rewinds === 1) {
    // the first one: ナリオサメ remembers what the noon was for, ミナト says it
    yield* sirenSay(s, e, e.def.texts.extra.voiceRewind?.[0] ?? '');
    yield* speakerSay(s, 'npc_c3_sirenban', e.def.texts.extra.hint ?? []);
    showSticky(s, 'itadaki', 'flag_tut_itadaki');
    s.memo.itadakiTut = 1;
  } else if (!s.memo.itadakiUsed) {
    // again (and on a retry): the sticky, pulsing, and the cursor on いただきます
    delete s.memo.stk_itadaki;
    showSticky(s, 'itadaki', undefined, true);
    s.memo.itadakiTut = 1;
  }
}

// ---- the round -----------------------------------------------------------------------------

export function* ch3RoundStart(s: BattleScene): Co {
  const e = nari(s);
  if (e && e.status.c3_maki) snaps.set(s, takeSnap(s));
  // オカワリナベ: the moment the はなまる can go on the pot (the sticky once)
  if (potReady(s) && !s.memo.potTut) {
    s.memo.potTut = 1;
    showSticky(s, 'potHanamaru');
  }
  yield* aqRoundStart(s);
  yield null;
}

/** The end of a round, before the usual countdowns (61 11.3: the noon sound first). */
export function* ch3RoundEnd(s: BattleScene): Co {
  yield* aqRoundEnd(s);
  if (s.memo.aqLose) return;
  yield* teppanRoundEnd(s);
  const n = nari(s);
  if (n && n.status.c3_maki && shougoRound(s.round)) yield* rewind(s, n);
  const e = nabe(s);
  if (e && !s.memo.ch3Won) {
    if (e.status.c3_futa) {
      // the lid is up: a second helping wells up from the bottom (+20, at most full)
      const before = e.hp;
      e.hp = Math.min(e.maxHp, e.hp + 20);
      if (e.hp > before) {
        s.sfx('se_c3_nabe', { vol: 0.6 });
        e.setPose('bubble');
        s.number(e.coreX + 12, e.coreY - 10, e.hp - before, { kind: 'heal' }, 'enemy', e);
        s.memo.wakes = (s.memo.wakes ?? 0) + 1;
        if (s.memo.wakes <= 2) yield* s.say(e.def.texts.extra.wake ?? [], false, { autoMs: 600 });
        else yield 400;
        e.setPose('idle');
      }
    } else if (s.round - (e.mem.closedAt ?? s.round) >= 2) {
      // shut since two rounds ago: at the end of its third round it lifts again (24 #19)
      s.sfx('se_c3_futa', { pitch: 1.3 });
      lidOpen(s, e);
      e.setPose('rattle');
      yield 300;
      e.setPose('idle');
      yield* s.say(e.def.texts.extra.futaReopen ?? []);
    }
  }
}

/**
 * After every action (flow.ts): ナリオサメ's lock, its second phase and the
 * finale; the pot's moment for the はなまる.
 */
export function* ch3AfterAction(s: BattleScene): Co {
  yield* aqAfterAction(s);
  const e = nari(s);
  if (!e || s.memo.ch3Won) return;
  if (e.mem.lock && e.hp <= 260 && !s.memo.lockSaid) {
    // the bar stops at half: the first note holds it
    s.memo.lockSaid = 1;
    yield* s.say(e.def.texts.extra.lockHold ?? []);
  }
  if (!e.mem.lock && (s.shared.nariPhase ?? 1) < 2 && e.hp <= 260) yield* nariPhase2(s, e);
  if ((s.shared.nariPhase ?? 1) >= 2 && e.hp <= 104) yield* nariFinal(s, e);
}

function* nariPhase2(s: BattleScene, e: EnemyUnit): Co {
  s.shared.nariPhase = 2;
  setFlag('flag_ch3_nari_phase', 2);
  s.hitstop(8);
  e.whiteFrames = 1;
  e.params.band2 = 1;
  yield 400;
  yield* sirenSay(s, e, e.def.texts.extra.voicePhase2?.[0] ?? '');
  s.setMusicParam('boss_phase', 2);
  yield* speakerSay(s, 'npc_c3_toudai', e.def.texts.extra.teru ?? []);
}

// ---- いただきます on ナリオサメ (61 11.4・17.7) -----------------------------------------------------

/** The first いただきます against ナリオサメ: the whole town puts its hands together. */
export function* nariItadaki(s: BattleScene): Co {
  const e = nari(s);
  s.memo.itadakiUsed = 1;
  s.memo.itadakiTut = 0;
  if (!e || !e.status.c3_maki) return;
  e.status.c3_maki = false;
  e.mem.lock = 0;
  snaps.delete(s);
  yield 400;
  yield* gasshoCut(s);
  s.bg.flags.after = 1;
  e.params.flow = 1;
  yield* s.say(e.def.texts.extra.itadakiAfter ?? []);
  // already at half: the second phase at once
  if (e.hp <= 260) yield* nariPhase2(s, e);
}

/** What stands behind the people in each panel of the 2D gassho cut. */
function gasshoScenery(g: Gfx, i: number, x: number): void {
  if (i === 0) {
    // the market: the roof truss, fish crates on ice, a number card
    g.rect(x + 2, 8, 92, 4, '#4A5A6A');
    for (let k = 0; k < 4; k++) {
      g.rect(x + 6 + k * 22, 108, 18, 10, '#F4F6F8');
      g.rect(x + 6 + k * 22, 108, 18, 1, '#FFFFFF');
      g.rect(x + 8 + k * 22, 112, 12, 2, '#A8B4C0');
    }
    g.rect(x + 70, 98, 9, 8, '#D8B878');
  } else if (i === 1) {
    // the diner: white tiles, the counter, the noren
    for (let yy = 16; yy < 127; yy += 8) g.rect(x + 2, yy, 92, 1, '#D8D2C4');
    g.rect(x + 10, 40, 30, 28, '#2F4A8A');
    g.rect(x + 2, 112, 92, 15, '#A8742A');
    g.rect(x + 2, 112, 92, 1, '#C8A068');
  } else if (i === 2) {
    // the beach: the still sea, the lifeguard's chair
    g.rect(x + 2, 88, 92, 39, '#6FB8D8');
    g.rect(x + 2, 88, 92, 1, '#F4F6F8');
    g.rect(x + 74, 70, 2, 57, '#F4F1E8');
    g.rect(x + 68, 70, 14, 3, '#E23B2E');
  } else {
    // the breakwater: the sea, the red lighthouse far off
    g.rect(x + 2, 84, 92, 43, '#5AA4C8');
    g.rect(x + 2, 84, 92, 1, '#F4F6F8');
    g.rect(x + 70, 64, 6, 20, '#E23B2E');
    g.rect(x + 69, 62, 8, 2, '#F4F1E8');
  }
}

/** People who came to the あぜ道市 (flag_ch3_kita_<npc_id>) that have a field sprite. */
function cameIds(): string[] {
  return Object.keys(state.flags)
    .filter((k) => k.startsWith('flag_ch3_kita_') && state.flags[k])
    .map((k) => k.slice('flag_ch3_kita_'.length))
    .filter((id) => hasChar(id));
}

/**
 * 62 12.4 cut_c3_gassho (2D): four panels side by side — the market, the
 * diner, the beach, the breakwater — the town's people with their hands
 * together, those who came small in the back row; 0.3 s apart, 2.0 s in all.
 */
function* gasshoCut(s: BattleScene): Co {
  const panels: { sky: string; ground: string; line: string; who: string[] }[] = [
    { sky: '#C8B890', ground: '#8A7A5A', line: '#DFF4FA', who: ['npc_c3_seri', 'npc_c3_seri_deshi'] },
    { sky: '#F4F1E8', ground: '#A8742A', line: '#C8C2B4', who: ['npc_c3_shokudo', 'npc_c3_jouren'] },
    { sky: '#8FD3E8', ground: '#E8D8B0', line: '#F4F6F8', who: ['npc_c3_mago', 'npc_c3_kanshiin'] },
    { sky: '#8FD3E8', ground: '#B8B8B0', line: '#6FB8D8', who: ['npc_c3_kid_a', 'npc_c3_tsuri', 'npc_c3_uketsuke'] },
  ];
  const came = cameIds();
  const st = { a: 0 };
  const t0 = s.t;
  const fx = s.addFx({
    layer: 'over',
    dur: 0,
    ui: true,
    draw: (g) => {
      const t = s.t - t0;
      g.alpha(st.a, () => {
        g.rect(0, 0, 384, 216, '#1B1733');
        panels.forEach((p, i) => {
          const k = Math.max(0, Math.min(1, (t - i * 300) / 200));
          if (k <= 0) return;
          const x = i * 96;
          g.alpha(k, () => {
            g.rect(x + 2, 8, 92, 120, p.sky);
            g.rect(x + 2, 128, 92, 80, p.ground);
            g.rect(x + 2, 127, 92, 1, p.line);
            gasshoScenery(g, i, x);
            // those who came: a small back row
            came.slice(i * 6, i * 6 + 6).forEach((id, j) => {
              const f = poseFrame(charSprite(id), 'gassho', 'down');
              g.ctx.drawImage(f, Math.round(x + 10 + j * 14 - f.width / 2 + 6), Math.round(130 - f.height));
            });
            // the town's people, twice the size, hands together
            p.who.forEach((id, j) => {
              if (!hasChar(id)) return;
              const f = poseFrame(charSprite(id), 'gassho', 'down');
              const w = f.width * 2;
              const h = f.height * 2;
              const cx = x + 48 + (j - (p.who.length - 1) / 2) * 30;
              g.ctx.drawImage(f, Math.round(cx - w / 2), Math.round(178 - h), w, h);
              // (no gassho frame yet: the joined hands drawn over the chest)
              if (!charSprite(id).extra?.gassho) {
                g.rect(Math.round(cx - 1), Math.round(178 - h * 0.55), 2, 6, '#F4D2B0');
                g.rect(Math.round(cx - 1), Math.round(178 - h * 0.55) + 6, 2, 1, '#D8A888');
              }
            });
            g.frame(x + 2, 8, 92, 200, '#F4F1E8');
          });
        });
      });
    },
  });
  for (let i = 0; i < 18; i++) {
    st.a = i / 18;
    yield null;
  }
  st.a = 1;
  // hands coming together all over town (as many as there are people, staggered)
  // (63 / A: the whistle, then the hands together town-wide and the town's voices)
  s.sfx('se_c3_fue');
  s.sfxLater('se_c3_gassho', { count: 12 }, 200);
  void chorusBlips(['c3_shokudo', 'c3_jouren', 'c3_seri', 'c3_seri_deshi', 'c3_sirenban', 'c3_toudai', 'c3_mago', 'c3_kanshiin', 'c3_himono_otto', 'c3_himono_tsuma', 'c3_tsuri', 'c3_uketsuke', ...came], 'itadakimasu');
  yield 1700;
  for (let i = 0; i < 18; i++) {
    st.a = 1 - i / 18;
    yield null;
  }
  fx.done = true;
}

// ---- 最終局面 (61 11.8) ------------------------------------------------------------------------

function* nariFinal(s: BattleScene, e: EnemyUnit): Co {
  s.memo.ch3Won = 1;
  s.shared.nariPhase = 3;
  setFlag('flag_ch3_nari_phase', 3);
  s.setMusicParam('boss_phase', 3);
  stopBgm(1.0);
  e.status.bokemake = false;
  yield 600;
  // ミナト walks to the button (600 ms)
  sp.walk = 1;
  yield 600;
  sp.walk = 2;
  yield* speakerSay(s, 'npc_c3_sirenban', e.def.texts.extra.finalMinato ?? []);
  s.post(e.def.texts.extra.finalPrompt ?? []);
  yield 500;
  // the one command: いただきます (any judgement — and no ink)
  const u = s.minato!;
  u.acting = true;
  s.noteActing('いただきます', 'hanko');
  yield* holdStamp(s, u);
  u.acting = false;
  s.msg.clearStatic();
  s.msg.clear();
  // the big seal on the siren's body
  const seal = itadakiSeal(0);
  const st = { p: 0 };
  const drop = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g) => {
      const y = -seal.height + (e.coreY + seal.height) * ease.cubicIn(st.p);
      g.img(seal, Math.round(e.coreX - seal.width / 2), Math.round(y - seal.height / 2));
    },
  });
  for (let i = 1; i <= 5; i++) {
    st.p = i / 5;
    yield null;
  }
  drop.done = true;
  s.sfx('se_c3_itadakimasu');
  s.hitstop(20);
  s.flash('#FFFFFF', 0.7, 3);
  s.addFx({ layer: 'world', dur: 0, draw: (g) => g.img(seal, Math.round(e.coreX - seal.width / 2), Math.round(e.coreY - seal.height / 2)) });
  yield 400;
  // the button: the finger lifts and presses again (cut_c3_siren, 2 frames)
  yield* buttonCut(s);
  // the siren rings all the way (about 14 s: head 3 + swell 5 + tail 6)
  s.sfx('se_c3_siren_full');
  e.setPose('ring');
  e.params.unravel = 0;
  const t0 = s.t;
  const ringMs = 14000;
  while (s.t - t0 < ringMs) {
    const p = (s.t - t0) / ringMs;
    // the stopped sound unravels into the sky during the swell; the black seal cracks
    e.params.unravel = Math.min(1, Math.max(0, (p - 0.2) / 0.45));
    e.params.crack = Math.min(3, Math.floor(p * 4));
    if (Math.floor((s.t - t0) / 900) !== Math.floor((s.t - t0 - FRAME) / 900)) s.shake(1, 0, 4);
    yield null;
  }
  // two seconds of nothing at all
  e.setPose('done');
  yield 2000;
  // the town clock: 12:00 → 12:01
  s.sfx('se_c3_clock_1201');
  s.bg.flags.clock = 1;
  clockCard(s);
  yield 600;
  // the stopped wave comes in once
  s.bg.flags.wave = 1;
  yield* s.say(e.def.texts.extra.clock ?? []);
  // the black seal on the plate breaks and falls
  e.params.sealFall = 1;
  s.sfx('se_part_break', { vol: 0.6 });
  yield 700;
  e.mem.settled = 1;
}

/** cut_c3_siren's close-up: ミナトの 手 on the red button — up 2px, down again. */
function* buttonCut(s: BattleScene): Co {
  const st = { a: 0, up: 0 };
  const fx = s.addFx({
    layer: 'over',
    dur: 0,
    ui: true,
    draw: (g) => {
      g.alpha(st.a, () => {
        const x = 132;
        const y = 60;
        g.rect(x - 2, y - 2, 124, 84, '#2A2440');
        g.rect(x, y, 120, 80, '#6B7186');
        // the box and the worn paint round the button
        g.rect(x + 34, y + 30, 52, 40, '#4A4A55');
        g.ctx.fillStyle = '#C8CDD4';
        g.ctx.beginPath();
        g.ctx.ellipse(x + 60, y + 50, 18, 12, 0, 0, Math.PI * 2);
        g.ctx.fill();
        g.ctx.fillStyle = '#E23B2E';
        g.ctx.beginPath();
        g.ctx.ellipse(x + 60, y + 48 + (st.up ? 0 : 2), 12, 8, 0, 0, Math.PI * 2);
        g.ctx.fill();
        g.rect(x + 54, y + 43 + (st.up ? 0 : 2), 8, 2, '#FF6A4D');
        // the finger (wrinkles), the stopwatch's string
        const fy = y + 20 - (st.up ? 4 : 0);
        g.rect(x + 54, fy, 12, 26, '#E8B890');
        g.rect(x + 54, fy, 1, 26, '#B8806A');
        g.rect(x + 56, fy + 8, 8, 1, '#C8987A');
        g.rect(x + 56, fy + 14, 8, 1, '#C8987A');
        g.rect(x + 90, y, 1, 50, '#F4F1E8');
      });
    },
  });
  for (let i = 0; i < 10; i++) {
    st.a = i / 10;
    yield null;
  }
  st.a = 1;
  yield 300;
  st.up = 1;
  yield 260;
  st.up = 0;
  s.sfx('se_c3_siren_btn');
  s.shake(1, 1, 4);
  yield 500;
  for (let i = 0; i < 10; i++) {
    st.a = 1 - i / 10;
    yield null;
  }
  fx.done = true;
}

/** 12:00 → 12:01 on a small clock card under the band (2D; the HD-2D town clock moves too). */
function clockCard(s: BattleScene): void {
  s.addFx({
    layer: 'top',
    dur: 3600,
    ui: true,
    draw: (g, t) => {
      const a = t < 200 ? t / 200 : t > 3200 ? (3600 - t) / 400 : 1;
      const x = 296;
      const y = s.msg.bottom + 4;
      g.alpha(a, () => {
        g.rect(x + 2, y + 2, 80, 30, C.shadow, 0.45);
        g.rect(x, y, 80, 30, '#2A2440');
        g.rect(x + 1, y + 1, 78, 28, '#F4F1E8');
        const txt = t < 500 ? '12:00' : '12:01';
        g.text(txt, x + 40, y + 6, { color: t < 500 ? C.grayDark : C.ink, align: 'center' });
      });
    },
  });
}

// ---- speakers (61 11.6): ミナト・テル・ウミ at the left edge -----------------------------------

const sp = { walk: 0, t0: 0 };

/** One of the speakers says pages in the band, with their name tag and voice. */
function* speakerSay(s: BattleScene, id: string, pages: string[]): Co {
  if (!pages.length) return;
  yield* s.say(pages, false, { tag: c3Name(id), voice: c3Voice(id) });
}

/**
 * ナリオサメ speaks in a white balloon at the upper right of its mouth (not
 * the band, 61 11.6), in katakana with its own voice.
 */
export function* sirenSay(s: BattleScene, e: EnemyUnit, text: string): Co {
  if (!text) return;
  const img = speechBalloon(text, 10);
  const x = Math.min(380 - img.width, e.faceX + 18);
  const y = Math.max(s.msg.bottom + 2, e.top + 6);
  const ms = 1600 + [...text].length * 70;
  // its own voice (63: the tower's loudspeaker), one blip a character as it comes up
  const chars = [...text];
  let said = 0;
  const fx = s.addFx({
    update() {
      const n = Math.min(chars.length, Math.floor(this.t / 70));
      while (said < n) textBlip('nariosame', chars[said++]);
    },
    layer: 'top',
    dur: ms,
    ui: true,
    draw: (g, t) => {
      const pop = t < 110 ? ease.backOut(t / 110) : 1;
      const a = t > ms - 160 ? Math.max(0, (ms - t) / 160) : 1;
      g.alpha(a, () => {
        const w = Math.round(img.width * pop);
        const h = Math.round(img.height * pop);
        g.ctx.drawImage(img, x, Math.round(y + img.height - h), w, h);
      });
    },
  });
  const t0 = s.t;
  s.takeConfirm();
  while (s.t - t0 < ms && !(s.t - t0 > 500 && s.takeConfirm())) yield null;
  fx.done = true;
}

function speakerX(i: number): number {
  return 14 + i * 18;
}

function drawSpeakers(s: BattleScene, g: Gfx): void {
  const ids = ['npc_c3_sirenban', 'npc_c3_toudai', 'npc_c3_mago'];
  ids.forEach((id, i) => {
    if (!hasChar(id)) return;
    const c = charSprite(id);
    let x = speakerX(i);
    let f = (c.idle?.right ?? c.walk.right)[Math.floor(s.t / 300) % (c.idle?.right ?? c.walk.right).length];
    if (i === 0 && sp.walk) {
      // ミナト walks to the button's stand (the final, 600 ms)
      if (!sp.t0) sp.t0 = s.t;
      const p = Math.min(1, (s.t - sp.t0) / 600);
      x += Math.round(48 * p);
      if (sp.walk === 1) f = walkFrame(c, 'right', s.t);
    }
    // ウミ: at each noon sound, the hands go up to the ears and down again
    g.img(f, Math.round(x - f.width / 2), 138 - f.height);
  });
}

// ---- the boss's stickies (61 16.5) ------------------------------------------------------------

function hooks(s: BattleScene): NonNullable<BattleScene['boss']> {
  sp.walk = 0;
  sp.t0 = 0;
  return {
    drawUnder: (g) => {
      if (nari(s) || s.memo.ch3Won) {
        if (s.enemies.some((e) => e.id === 'enemy_nariosame')) drawSpeakers(s, g);
      }
    },
    drawUi: (g) => {
      const y = s.msg.bottom + 2;
      const e = nari(s) ?? nabe(s);
      if (!e || s.memo.ch3Won) return;
      g.rect(302, y + 2, 76, 20, C.shadow, 0.45);
      g.rect(300, y, 76, 20, C.stickyEdge);
      g.rect(301, y + 1, 74, 18, C.sticky);
      g.img(tapeCanvas(18, 6, '', C.tape, 8), 329, y - 3);
      if (e.id === 'enemy_okawarinabe') drawLidSticky(s, g, e, y);
      else drawClockSticky(s, g, e, y);
    },
  };
}

function drawLidSticky(s: BattleScene, g: Gfx, e: EnemyUnit, y: number): void {
  const x = 306;
  const open = !!e.status.c3_futa;
  // the lid (14×10): slanted while open, level when shut
  for (let i = 0; i < 14; i++) {
    const yy = y + 9 + (open ? Math.round((i - 7) * -0.35) : 0);
    g.px(x + i, yy, '#8E95A6');
    g.px(x + i, yy + 1, '#C8CDD4');
  }
  g.rect(x + 6, y + (open ? 5 : 7), 3, 2, '#2A2440');
  g.rect(x + 1, y + 13, 12, 5, '#C8CDD4');
  g.rect(x + 1, y + 17, 12, 1, '#8E95A6');
  if (!open) {
    const left = Math.max(1, (e.mem.closedAt ?? s.round) + 2 - Math.max(1, s.round) + 1);
    g.text(`あと ${left}`, x + 20, y + 1, { color: C.ink });
  } else {
    // rattling: two little motion marks over the lid, in turn
    const k = Math.floor(s.t / 200) % 2;
    g.rect(x + 18, y + 4 + k, 4, 1, C.shuDark);
    g.rect(x + 20, y + 8 - k, 4, 1, C.shuDark);
    g.rect(x + 26, y + 5, 1, 1, C.shuDark);
  }
}

function drawClockSticky(s: BattleScene, g: Gfx, e: EnemyUnit, y: number): void {
  const cx = 313;
  const cy = y + 10;
  g.ctx.fillStyle = '#F4F1E8';
  g.ctx.beginPath();
  g.ctx.arc(cx, cy, 7, 0, Math.PI * 2);
  g.ctx.fill();
  g.ring(cx, cy, 7, '#2A2440');
  // the hand: at 12 (trembling before the noon sound); after いただきます it moves on with the HP
  const after = !e.status.c3_maki;
  const tremble = !after && shougoNext(s) ? Math.sin(s.t / 30) * 0.15 : 0;
  const ang = -Math.PI / 2 + tremble + (after ? (1 - e.hpRate) * 0.5 : 0);
  for (let r = 0; r < 6; r++) g.px(Math.round(cx + Math.cos(ang) * r), Math.round(cy + Math.sin(ang) * r), '#2A2440');
  g.px(cx, cy - 4, '#E23B2E');
  if (!after) {
    // dots: rounds left until the next noon sound (at most 3)
    let left = 0;
    for (let r = Math.max(1, s.round); r < Math.max(1, s.round) + 4; r++) {
      if (shougoRound(r)) break;
      left++;
    }
    for (let i = 0; i < Math.min(3, left + 1); i++) g.rect(326 + i * 5, y + 12, 3, 3, i === 0 && left === 0 ? '#E23B2E' : '#2A2440');
    g.img(madaMark(10, 8, 5), 352, y + 6);
  } else {
    // a small pair of hands in 朱 under the clock: the noon moves on
    g.rect(330, y + 5, 2, 8, '#E23B2E');
    g.rect(333, y + 5, 2, 8, '#E23B2E');
    g.rect(329, y + 12, 7, 1, '#B8241E');
    // the hand of the clock moves on: three small ticks after 12
    for (let i = 0; i < 3; i++) g.rect(342 + i * 8, y + 9, 4, 2, i < Math.ceil((1 - e.hpRate) * 4) ? '#E23B2E' : '#C8C2B4');
  }
}

// ---- 様子 -------------------------------------------------------------------------------------

/** 〔様子〕 of the chapter-3 enemies (60 6.1・6.6・6.7, specials of 61). */
export function ch3Yousu(s: BattleScene, e: EnemyUnit, r: number): string {
  const t = e.def.texts;
  const sp2 = t.yousuSpecial ?? {};
  const rot = (list: string[]) => list[(r - 1) % list.length];
  switch (e.id) {
    case 'enemy_nefuda':
      return !e.status.c3_mayoi && sp2.decided ? sp2.decided : rot(t.yousu);
    case 'enemy_okawarinabe':
      if (potReady(s) && sp2.ready) return sp2.ready;
      if (!e.status.c3_futa && sp2.closed && r % 2 === 0) return sp2.closed;
      return rot(t.yousu);
    case 'enemy_asobitarin':
      return (e.mem.air ?? 0) >= 3 && sp2.full ? sp2.full : rot(t.yousu);
    case 'enemy_yokodori':
      if (e.status.tame && e.status.stareAt && sp2.tame) return sp2.tame.replace('$target', s.party.find((u) => u.id === e.status.stareAt)?.name ?? 'こっち');
      return rot(t.yousu);
    case 'boss_hirosuke':
      if (e.mem.madaSeen && sp2.seen && r % 2 === 0) return sp2.seen;
      return rot(t.yousu);
    case 'enemy_nariosame':
      if (shougoNext(s) && sp2.shougo) return sp2.shougo;
      if (!e.status.c3_maki && sp2.after && r % 2 === 0) return sp2.after;
      return rot(t.yousu);
  }
  return rot(t.yousu);
}

/** The opening (after the appearance pages): ナリオサメ's first words in its balloon. */
export function* ch3Opening(s: BattleScene): Co {
  yield* aqOpening(s);
  const e = nari(s);
  if (e) yield* sirenSay(s, e, e.def.texts.extra.voiceOpen?.[0] ?? '');
}
