// Battle flow (9.1): transition → appearance → (ambush round) → rounds of
// command input and execution → victory / wipe / flee → return transition.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { flag, setFlag, state } from '../game/state';
import { currentSpace, musicEncounter, musicReturnToField, playBgm, setSpace, sfx, stopBgm } from '../audio';
import { BOSS_RETRY_FLIP, fillAll, syncProgressSkills, SYS, SYS2, getEnemy, getItem, getSkill } from '../data/battle';
import type { BattleResult } from './api';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import { spdOf, type EnemyUnit, type PartyCmd, type PartyUnit } from './model';
import { transitionIn, transitionOut } from './transition';
import { inputCommands } from './menu';
import { doAttack, doFlee, doGuard, doHanko, doItem, doNori, doPR, killSequence } from './party';
import { decideEnemy, doEnemyAction } from './enemy';
import { bossDecide, bossEntrance, bossRoundEnd, bossRoundStart, bossTriesOf, checkBossPhase, initBoss } from './boss';
import { applyStartStatus, ch2RoundEnd, ch2RoundStart, enemyRests, restTurn } from './ch2rules';
import { showFlip } from './tsukkomi';
import { victory, wipeOut } from './results';
import { hideSticky, precacheRestored, resetKire, sayFallen, statusText } from './common';
import { yobiBlack, yobiMemory } from './boss_yobimodoshi';
import { roundSeal } from './art/stamps';

interface Act {
  side: 'party' | 'enemy';
  prio: number;
  spd: number;
  order: number;
  cmd?: PartyCmd;
  e?: EnemyUnit;
  skill?: string;
}

function partyWiped(s: BattleScene): boolean {
  return !s.party.some((u) => u.alive);
}

function enemiesWiped(s: BattleScene): boolean {
  return !s.enemies.some((e) => e.alive);
}

export function* battleFlow(s: BattleScene): Co<BattleResult> {
  syncProgressSkills();
  const first = s.enemies[0];
  if (s.isBoss) initBoss(s);
  // 第2章: enemies that start sulking / working all night (51 8.1, 9.2)
  applyStartStatus(s);
  for (const e of s.enemies) e.appearT = -2;
  // セミファイナル is already lying there playing dead (11.2)
  semiRound(s, 1);
  const music = s.opts.music ?? first?.def.bgm ?? 'bgm_battle';
  // 40_audio 12.1: tape brake on the field song at contact (the boss room has no BGM)
  s.prevSpace = currentSpace();
  if (!s.isBoss) musicEncounter();
  // weaker enemies (party level ≥ enemy level + 2): faster messages
  const lv = Math.max(...s.party.map((u) => u.m.level), 1);
  if (first && lv >= first.def.lvl + 2 && !s.isEvent) s.msg.minShow = 900;
  yield* transitionIn(s, s.isBoss);
  // 500ms: battle space, the battle song from its intro bar
  setSpace('battle');
  playBgm(music);
  s.showUi = true;
  // enemies pop in (0 → 1.15 → 1.0, 80ms apart); the boss rises out of darkness
  const retry = s.isBoss && bossTriesOf(s).lost > 0;
  if (s.isBoss) {
    if (!(yield* bossEntrance(s, retry))) yield* bossAppear(s, retry);
  }
  else {
    for (const e of s.enemies) {
      e.appearT = 0;
      yield 80;
    }
    sfx('se_enemy_appear');
    yield 320;
  }
  // appearance text (+ initiative on page 2)
  const pages: string[] = [];
  // a group of the same enemy (the cones, the bunch of スネトマト) has its own line
  const same = s.enemies.filter((e) => e.id === first?.id);
  if (same.length > 1 && first.def.texts.extra.appearMulti) pages.push(...first.def.texts.extra.appearMulti);
  else if (first) pages.push(...first.def.texts.appear);
  const init = s.isEvent ? 'normal' : s.opts.initiative ?? 'normal';
  const ename = first?.def.name ?? '';
  if (init !== 'normal') yield* initiativeStamp(s, init === 'party');
  if (init === 'party') pages.push(...fillAll(SYS.initiative, { enemy: ename }));
  if (init === 'enemy') pages.push(...fillAll(SYS.ambush, { enemy: ename }));
  // while the opening line types (nothing else moves but the background)
  s.run(precacheRestored(s));
  yield* s.say(pages);
  if (s.isBoss && first.def.texts.extra.opening) {
    // ヨビモドシ: a retry keeps only the first page of 〔第1段階・開幕〕 (51 10.10)
    if (s.bossKind === 'yobimodoshi') yield* s.say(retry ? first.def.texts.extra.opening.slice(0, 1) : first.def.texts.extra.opening, false, { voice: 'yobimodoshi' });
    else if (!retry) {
      sfx('se_boss_voice');
      yield* s.say(first.def.texts.extra.opening);
    }
  }
  // a retry: Kanenari-kun holds up what beat them last time
  if (retry && s.kanenari) {
    s.mood(s.kanenari, 'tsukkomi', 2000);
    if (s.bossKind === 'yobimodoshi') {
      // the tomato's lesson once more, if it was never held up (51 10.10)
      if (!yobiMemory.tomatoUsed) s.memo.tomatoTut = 1;
      yield showFlip(s, SYS2.retryFlip, 2000);
    } else yield showFlip(s, BOSS_RETRY_FLIP, 2000);
  }
  // round 0 (ambush): every enemy acts once before the first command
  if (init === 'enemy') {
    for (const e of [...s.aliveEnemies]) {
      const sk = decideEnemy(s, e, 0);
      yield* doEnemyAction(s, e, sk === 'skill_semi_shindafuri' ? 'skill_idle' : sk);
      if (partyWiped(s)) break;
    }
  }
  let result: BattleResult | null = null;
  if (partyWiped(s)) result = 'lose';
  while (!result) {
    s.round++;
    semiRound(s, s.round);
    for (const u of s.party) {
      u.acting = false;
      delete s.memo['disabled_' + u.id];
      delete s.memo['blocked_' + u.id];
    }
    if (s.isBoss) yield* bossRoundStart(s);
    yield* ch2RoundStart(s);
    // commands
    s.noteActing('');
    const cmds = yield* inputCommands(s);
    hideSticky(s);
    // enemy decisions
    const plans: Act[] = [];
    let order = 0;
    const skipEnemies = init === 'party' && s.round === 1;
    if (!skipEnemies && !s.memo.bossFinal) {
      for (const e of s.aliveEnemies) {
        let skill = e.def.boss ? bossDecide(s, e) : decideEnemy(s, e, s.round);
        if (s.forceEnemy.length) skill = s.forceEnemy.shift()!;
        if (skill) plans.push({ side: 'enemy', prio: 0, spd: spdOf(e.def.spd, e.stages.spd.lv) * rng.range(0.9, 1.1), order: order++, e, skill });
      }
    }
    const acts: Act[] = [];
    for (const c of cmds) {
      let spd = spdOf(c.u.m.spd, c.u.stages.spd.lv);
      if (c.kind === 'nori') spd = Math.max(s.minato?.m.spd ?? 0, s.kanenari?.m.spd ?? 0);
      // まもる / にげる, and holding up the tomato (51 10.3: priority +2)
      const itemPrio = c.kind === 'item' ? getItem(c.item)?.priority ?? 0 : 0;
      const prio = (c.kind === 'guard' || c.kind === 'flee' ? 2 : itemPrio) + (s.qaPartyFirst ? 10 : 0);
      acts.push({ side: 'party', prio, spd: spd * rng.range(0.9, 1.1), order: c.u.id === 'minato' ? -2 : -1, cmd: c });
    }
    acts.push(...plans);
    acts.sort((a, b) => b.prio - a.prio || b.spd - a.spd || (a.side === b.side ? a.order - b.order : a.side === 'party' ? -1 : 1));
    // guard takes effect for the whole round as soon as it is chosen
    for (const a of acts) if (a.cmd?.kind === 'guard') a.cmd.u.guard = true;
    const finalAtStart = !!s.memo.bossFinal;
    for (const a of acts) {
      if (result) break;
      // entering the final phase cancels everything left in the round
      if (s.memo.bossFinal && !finalAtStart) break;
      if (s.memo.bossFinal && !(a.cmd?.kind === 'hanko' && (a.cmd.skill === 'skill_okaerinasai' || a.cmd.skill === 'skill_oyasuminasai'))) continue;
      if (a.side === 'party' && a.cmd) {
        const r = yield* runParty(s, a.cmd);
        if (r) result = r;
      } else if (a.e && a.skill) {
        if (!a.e.alive) continue;
        // 休憩中: the turn passes without a "!" (51 7.2)
        if (enemyRests(a.e)) yield* restTurn(s, a.e);
        else yield* doEnemyAction(s, a.e, a.skill);
      }
      // anything knocked to 0 outside a strike (self-damage etc.) still gets its 思いだす
      const fallen = s.enemies.filter((e) => e.hp <= 0 && !e.dead && !e.dying && !e.def.boss);
      if (fallen.length) yield* killSequence(s, fallen);
      // a member knocked down by their own side (こんらん) — enemy moves say it themselves
      yield* sayFallen(s);
      if (!result) result = yield* checkEnd(s);
    }
    if (result) break;
    // end of round
    if (s.isBoss) {
      yield* bossRoundEnd(s);
      yield* sayFallen(s);
      result = yield* checkEnd(s);
      if (result) break;
    }
    yield* roundEnd(s);
    result = yield* checkEnd(s);
    if (result) break;
    // 徹夜 (HP+10, まもり+), the end of a rest, the hint to rest (51 9.2)
    yield* ch2RoundEnd(s);
    result = yield* checkEnd(s);
  }
  return yield* finish(s, result);
}

/**
 * セミファイナル alternates by round: odd rounds it plays dead (damage 0) from
 * the start of the round, even rounds it is active. みました ends the act.
 */
function semiRound(s: BattleScene, round: number): void {
  for (const e of s.enemies) {
    if (e.id !== 'enemy_semi_final' || !e.alive) continue;
    const dead = !e.mem.seen && round % 2 === 1;
    e.status.shindafuri = dead;
    if (e.pose === 'idle' || e.pose === 'dead') e.setPose(dead ? 'dead' : 'idle');
  }
}

function* runParty(s: BattleScene, c: PartyCmd): Co<BattleResult | null> {
  const u = c.u;
  if (c.kind === 'skip') {
    s.noteActing('');
    const t = u.has('status_nemuri') ? 'status_nemuri' : u.has('status_tsukamare') ? 'status_tsukamare' : u.has('status_toosenbo') ? 'status_toosenbo' : u.has('status_henji') ? 'status_henji' : '';
    if (t && u.alive) {
      s.memo['blocked_' + u.id] = 1;
      yield* s.say(statusText(t, 'act', u.name));
    }
    return null;
  }
  if (c.kind !== 'nori') {
    if (!u.alive || u.has('status_rusu')) return null;
    if (!u.canAct) {
      const t = u.has('status_nemuri') ? 'status_nemuri' : u.has('status_tsukamare') ? 'status_tsukamare' : u.has('status_henji') ? 'status_henji' : 'status_toosenbo';
      s.memo['blocked_' + u.id] = 1;
      yield* s.say(statusText(t, 'act', u.name));
      return null;
    }
  } else if (!(s.minato?.canAct && s.kanenari?.canAct)) {
    return null;
  }
  // the acting member's panel lifts 3px and turns vermilion (reaction ≤ 10f)
  u.acting = true;
  noteMove(s, c);
  if (c.kind === 'nori' && s.kanenari) s.kanenari.acting = true;
  if (c.kind === 'nori' && s.minato) s.minato.acting = true;
  let result: BattleResult | null = null;
  switch (c.kind) {
    case 'attack':
      yield* doAttack(s, u, c.target);
      break;
    case 'hanko':
      yield* doHanko(s, c);
      break;
    case 'pr':
      yield* doPR(s, u, c.skill);
      break;
    case 'item':
      yield* doItem(s, u, c.item, c.target);
      break;
    case 'guard':
      yield* doGuard(s, u);
      break;
    case 'flee':
      if (yield* doFlee(s, u)) result = 'flee';
      break;
    case 'nori':
      yield* doNori(s);
      break;
  }
  for (const p of s.party) p.acting = false;
  const boss = s.enemies.find((e) => e.def.boss && e.alive);
  if (boss && !result) yield* checkBossPhase(s, boss);
  return result;
}

/** The command notebook shows the move being played out (QA round 2). */
function noteMove(s: BattleScene, c: PartyCmd): void {
  switch (c.kind) {
    case 'attack':
      s.noteActing(c.u.id === 'kanenari' ? 'タックル' : 'たたく', c.u.id === 'kanenari' ? 'tackle' : 'tataku');
      break;
    case 'hanko':
      s.noteActing(getSkill(c.skill)?.name ?? 'ハンコ', c.skill === 'skill_okaerinasai' ? 'okaeri' : 'hanko');
      break;
    case 'pr':
      s.noteActing(getSkill(c.skill)?.name ?? 'PR活動', 'pr');
      break;
    case 'item':
      s.noteActing(getItem(c.item)?.name ?? 'もちもの', 'item');
      break;
    case 'guard':
      s.noteActing('まもる', 'guard');
      break;
    case 'flee':
      s.noteActing('にげる', 'flee');
      break;
    case 'nori':
      s.noteActing('ノリ\nツッコミ', 'pr');
      break;
    default:
      s.noteActing('');
  }
}

function* checkEnd(s: BattleScene): Co<BattleResult | null> {
  if (s.memo.kanenariWin || s.memo.bossWon) return 'win';
  if (enemiesWiped(s)) return 'win';
  if (partyWiped(s)) return 'lose';
  return null;
}

/** Status / CT / stage countdowns at the end of a round. */
function* roundEnd(s: BattleScene): Co {
  const pages: string[] = [];
  for (const u of s.party) {
    u.guard = false;
    for (const k of Object.keys(u.ct)) if (u.ct[k] > 0) u.ct[k]--;
    for (const k of ['atk', 'def', 'hit', 'spd'] as const) {
      const st = u.stages[k];
      if (st.lv !== 0 && --st.turns <= 0) {
        st.lv = 0;
        st.turns = 0;
      }
    }
    if (!u.alive) continue;
    const st = u.m.status;
    for (const id of ['status_konran', 'status_nemuri']) {
      if (!st[id]) continue;
      st[id]--;
      if (st[id] <= 0) {
        delete st[id];
        pages.push(...statusText(id, 'off', u.name));
      }
    }
    // つかまった／とおせんぼ cost exactly one turn: they come off at the end of
    // the round in which the member's own turn was actually skipped — never
    // in the round they were put on (the victim may already have acted)
    for (const id of ['status_tsukamare', 'status_toosenbo', 'status_henji']) {
      if (!st[id]) continue;
      if (s.memo['blocked_' + u.id]) {
        delete st[id];
        pages.push(...statusText(id, 'off', u.name));
        if (id === 'status_tsukamare') {
          const kasa = s.aliveEnemies.find((e) => e.id === 'enemy_wasuregasa');
          if (kasa) pages.push(...kasa.def.texts.extra.release);
        }
      }
    }
    if (st.status_rusu) {
      st.status_rusu--;
      if (st.status_rusu <= 0) delete st.status_rusu;
    }
    if (s.memo['woke_' + u.id]) {
      delete s.memo['woke_' + u.id];
      pages.push(...statusText('status_nemuri', 'off', u.name));
    }
  }
  for (const e of s.aliveEnemies) {
    if (e.status.mimasareta && --e.status.mimasareta.turns <= 0) e.status.mimasareta = undefined;
    if (e.status.hiraki && --e.status.hiraki <= 0) {
      e.status.hiraki = undefined;
      if (e.pose === 'open') e.setPose('idle');
    }
    for (const k of ['atk', 'def', 'hit', 'spd'] as const) {
      const st = e.stages[k];
      // 徹夜のまもり does not wear off with time (51 7.2)
      if (k === 'def' && e.status.tetsuya) continue;
      if (st.lv !== 0 && --st.turns <= 0) {
        st.lv = 0;
        st.turns = 0;
      }
    }
  }
  if (pages.length) yield* s.say(pages.slice(0, 2));
}

function* finish(s: BattleScene, result: BattleResult): Co<BattleResult> {
  s.cmd = null;
  s.list = null;
  s.msg.clearStatic();
  for (const u of s.party) u.acting = false;
  if (result === 'win') {
    yield* victory(s);
    resetKire(s);
    cleanupStatuses(s);
    if (s.bossKind === 'yobimodoshi') {
      // 51 10.8 / 16.2: the night is asleep — the band goes, only black stays,
      // and evt_ch2_ending's first cut (the HUD's 「4:59」 on black) takes over
      setFlag('flag_ch2_boss_phase', 0);
      setFlag('flag_ch2_boss_light', 0);
      stopBgm(0);
      s.hideAll = true;
      s.transitionDraw = (g) => g.clear('#0B0B14');
      game.fadeColor = '#0B0B14';
      game.fadeAlpha = 1;
      return 'win';
    }
    if (s.isBoss) {
      // 13.7: no jingle; white fade straight into the ending (the event takes over)
      setFlag('flag_boss_phase', 0);
      stopBgm(1.0);
      yield* game.fadeOut(1000, '#FFF6D8');
      s.hideAll = true;
      return 'win';
    }
    // 40_audio 12.3: stop the battle song as the return starts, the field song resumes
    musicReturnToField();
    yield* transitionOut(s);
    if (s.prevSpace) setSpace(s.prevSpace);
    return 'win';
  }
  if (result === 'flee') {
    cleanupStatuses(s);
    musicReturnToField();
    yield* transitionOut(s, true);
    if (s.prevSpace) setSpace(s.prevSpace);
    return 'flee';
  }
  // wipe (18.4): the battle side plays up to the dark screen; evt_gameover follows
  if (s.isBoss) bossTriesOf(s).lost++;
  yield* wipeOut(s);
  cleanupStatuses(s);
  if (s.isBoss) setFlag(s.bossKind === 'yobimodoshi' ? 'flag_ch2_boss_phase' : 'flag_boss_phase', 0);
  if (s.bossKind === 'yobimodoshi') setFlag('flag_ch2_boss_light', 0);
  s.hideAll = true;
  s.transitionDraw = (g) => g.clear('#0B0B14');
  if (s.prevSpace) setSpace(s.prevSpace);
  // canLose battles hand 'lose' back to the event; others need evt_gameover,
  // which battleImpl runs on the caller's runner once this scene stops.
  if (!s.opts.canLose) s.needGameOver = true;
  return 'lose';
}

function cleanupStatuses(s: BattleScene): void {
  for (const u of s.party) {
    u.m.status = {};
    u.guard = false;
  }
  void state;
}

/**
 * Game-over handler installed by the scenario/UI team (evt_gameover). Runs on
 * the caller's runner after the battle scene has gone dark; returns 'retry'
 * or 'load'. Without a hook the battle's own evt_gameover (gameover.ts) runs.
 */
export type GameOverHook = (s: BattleScene) => Co<'retry' | 'load'>;
let gameOverHook: GameOverHook | null = null;
export function setGameOverHook(h: GameOverHook | null): void {
  gameOverHook = h;
}
export function getGameOverHook(): GameOverHook | null {
  return gameOverHook;
}

// ---- presentation helpers -------------------------------------------------------------

function* initiativeStamp(s: BattleScene, party: boolean): Co {
  const seal = party ? roundSeal('先制', 40) : roundSeal('不意\n打ち', 40, '#4A3A6E', 5);
  sfx(party ? 'se_initiative' : 'se_ambush');
  if (!party) s.shake(2, 2, 8);
  for (const u of s.party) if (!party) u.moodOverride = { mood: 'surprised', until: s.t + 1200 };
  s.addFx({
    layer: 'top',
    dur: 1400,
    ui: true,
    draw: (g, t) => {
      const sc = t < 100 ? 1.6 - 0.6 * ease.quadIn(t / 100) : 1;
      const w = seal.width * sc;
      g.alpha(t > 1100 ? (1400 - t) / 300 : 1, () => g.ctx.drawImage(seal, Math.round(192 - w / 2), Math.round(96 - w / 2), Math.round(w), Math.round(w)));
    },
  });
  yield 300;
}

function* bossAppear(s: BattleScene, fast = false): Co {
  const e = s.enemies[0];
  e.appearT = -1;
  e.alpha = 0;
  e.flags.eyesClosed = 1;
  e.whiteFrames = 0;
  // silhouette out of the dark, colour arrives over 800ms (a retry: 450ms in all)
  const k = fast ? 0.4 : 1;
  e.params.silhouette = 1;
  for (let t = 0; t < 400 * k; t += FRAME) {
    e.alpha = t / (400 * k);
    yield null;
  }
  for (let t = 0; t < 800 * k; t += FRAME) {
    e.params.silhouette = 1 - t / (800 * k);
    yield null;
  }
  e.params.silhouette = 0;
  e.alpha = 1;
  yield 150 * k;
  e.flags.eyesClosed = 0;
  sfx('se_enemy_appear');
  yield 300 * k;
  void getEnemy;
  void flag;
  void yobiBlack;
}

export type { PartyUnit };
