// Battle flow (9.1): transition → appearance → (ambush round) → rounds of
// command input and execution → victory / wipe / flee → return transition.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { flag, setFlag, state } from '../game/state';
import { currentBgmId, playBgm, sfx, stopBgm } from '../audio';
import * as boot from '../boot';
import { fillAll, syncProgressSkills, SYS, getEnemy } from '../data/battle';
import type { BattleResult } from './api';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import type { EnemyUnit, PartyCmd, PartyUnit } from './model';
import { transitionIn, transitionOut } from './transition';
import { inputCommands } from './menu';
import { doAttack, doFlee, doGuard, doHanko, doItem, doNori, doPR } from './party';
import { decideEnemy, doEnemyAction } from './enemy';
import { bossDecide, bossRoundEnd, bossRoundStart, checkBossPhase, initBoss } from './boss';
import { restoreForRetry, victory, wipeOut } from './results';
import { hideSticky, resetKire, statusText } from './common';
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
  const prevBgm = currentBgmId();
  const first = s.enemies[0];
  if (s.isBoss) initBoss(s);
  for (const e of s.enemies) e.appearT = -2;
  const music = s.opts.music ?? first?.def.bgm ?? 'bgm_battle';
  playBgm(music);
  // weaker enemies (party level ≥ enemy level + 2): faster messages
  const lv = Math.max(...s.party.map((u) => u.m.level), 1);
  if (first && lv >= first.def.lvl + 2 && !s.isEvent) s.msg.minShow = 400;
  yield* transitionIn(s, s.isBoss);
  s.showUi = true;
  // enemies pop in (0 → 1.15 → 1.0, 80ms apart); the boss rises out of darkness
  if (s.isBoss) yield* bossAppear(s);
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
  const cones = s.enemies.filter((e) => e.id === 'enemy_cone_vocal');
  if (cones.length > 1 && first.def.texts.extra.appearMulti) pages.push(...first.def.texts.extra.appearMulti);
  else if (first) pages.push(...first.def.texts.appear);
  const init = s.isEvent ? 'normal' : s.opts.initiative ?? 'normal';
  const ename = first?.def.name ?? '';
  if (init !== 'normal') yield* initiativeStamp(s, init === 'party');
  if (init === 'party') pages.push(...fillAll(SYS.initiative, { enemy: ename }));
  if (init === 'enemy') pages.push(...fillAll(SYS.ambush, { enemy: ename }));
  yield* s.say(pages);
  if (s.isBoss && first.def.texts.extra.opening) {
    sfx('se_boss_voice');
    yield* s.say(first.def.texts.extra.opening);
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
    for (const u of s.party) {
      u.acting = false;
      delete s.memo['disabled_' + u.id];
      delete s.memo['blocked_' + u.id];
    }
    if (s.isBoss) yield* bossRoundStart(s);
    // commands
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
        if (skill) plans.push({ side: 'enemy', prio: 0, spd: e.def.spd * rng.range(0.9, 1.1), order: order++, e, skill });
      }
    }
    const acts: Act[] = [];
    for (const c of cmds) {
      let spd = c.u.m.spd;
      if (c.kind === 'nori') spd = Math.max(s.minato?.m.spd ?? 0, s.kanenari?.m.spd ?? 0);
      const prio = c.kind === 'guard' || c.kind === 'flee' ? 2 : 0;
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
      if (s.memo.bossFinal && !(a.cmd?.kind === 'hanko' && a.cmd.skill === 'skill_okaerinasai')) continue;
      if (a.side === 'party' && a.cmd) {
        const r = yield* runParty(s, a.cmd);
        if (r) result = r;
      } else if (a.e && a.skill) {
        if (!a.e.alive) continue;
        yield* doEnemyAction(s, a.e, a.skill);
      }
      if (!result) result = yield* checkEnd(s);
    }
    if (result) break;
    // end of round
    if (s.isBoss) {
      yield* bossRoundEnd(s);
      result = yield* checkEnd(s);
      if (result) break;
    }
    yield* roundEnd(s);
    result = yield* checkEnd(s);
  }
  return yield* finish(s, result, prevBgm);
}

function* runParty(s: BattleScene, c: PartyCmd): Co<BattleResult | null> {
  const u = c.u;
  if (c.kind === 'skip') {
    const t = u.has('status_nemuri') ? 'status_nemuri' : u.has('status_tsukamare') ? 'status_tsukamare' : u.has('status_toosenbo') ? 'status_toosenbo' : '';
    if (t && u.alive) {
      s.memo['blocked_' + u.id] = 1;
      yield* s.say(statusText(t, 'act', u.name));
    }
    return null;
  }
  if (c.kind !== 'nori') {
    if (!u.alive || u.has('status_rusu')) return null;
    if (!u.canAct) {
      const t = u.has('status_nemuri') ? 'status_nemuri' : u.has('status_tsukamare') ? 'status_tsukamare' : 'status_toosenbo';
      s.memo['blocked_' + u.id] = 1;
      yield* s.say(statusText(t, 'act', u.name));
      return null;
    }
  } else if (!(s.minato?.canAct && s.kanenari?.canAct)) {
    return null;
  }
  // the acting member's panel lifts 3px and turns vermilion (reaction ≤ 10f)
  u.acting = true;
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
    for (const k of ['atk', 'def', 'hit'] as const) {
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
    for (const id of ['status_tsukamare', 'status_toosenbo']) {
      if (!st[id]) continue;
      if (s.memo['blocked_' + u.id] || !u.canAct) {
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
    for (const k of ['atk', 'def', 'hit'] as const) {
      const st = e.stages[k];
      if (st.lv !== 0 && --st.turns <= 0) {
        st.lv = 0;
        st.turns = 0;
      }
    }
  }
  if (pages.length) yield* s.say(pages.slice(0, 2));
}

function* finish(s: BattleScene, result: BattleResult, prevBgm: string | null): Co<BattleResult> {
  s.cmd = null;
  s.list = null;
  s.msg.clearStatic();
  for (const u of s.party) u.acting = false;
  if (result === 'win') {
    yield* victory(s);
    resetKire(s);
    cleanupStatuses(s);
    if (s.isBoss) {
      setFlag('flag_boss_phase', 0);
      yield* game.fadeOut(1000, '#FFF6D8');
      stopBgm(0.5);
      s.hideAll = true;
      return 'win';
    }
    yield* transitionOut(s);
    if (prevBgm && !prevBgm.startsWith('bgm_jingle')) playBgm(prevBgm);
    else stopBgm(0.4);
    return 'win';
  }
  if (result === 'flee') {
    cleanupStatuses(s);
    yield* transitionOut(s, true);
    if (prevBgm) playBgm(prevBgm);
    return 'flee';
  }
  // wipe
  yield* wipeOut(s);
  cleanupStatuses(s);
  if (s.isBoss) setFlag('flag_boss_phase', 0);
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  s.hideAll = true;
  if (s.opts.canLose) return 'lose';
  // Symbol battles: the battle side runs the game-over step (18.4).
  const hook = gameOverHook;
  if (hook) {
    const choice = yield* hook(s);
    if (choice === 'retry') restoreForRetry(s);
    return 'lose';
  }
  const make = (boot as unknown as { createScene?: (n: string) => unknown }).createScene;
  if (boot.sceneNames().includes('gameover') && typeof make === 'function') {
    const sc = make('gameover');
    if (sc) {
      game.push(sc as never);
      return 'lose';
    }
  }
  // dev fallback: "戦う前から やりなおす"
  restoreForRetry(s);
  return 'lose';
}

function cleanupStatuses(s: BattleScene): void {
  for (const u of s.party) {
    u.m.status = {};
    u.guard = false;
  }
  void state;
}

/** Game-over handler installed by the scenario/UI team: returns 'retry' or 'load'. */
export type GameOverHook = (s: BattleScene) => Co<'retry' | 'load'>;
let gameOverHook: GameOverHook | null = null;
export function setGameOverHook(h: GameOverHook | null): void {
  gameOverHook = h;
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

function* bossAppear(s: BattleScene): Co {
  const e = s.enemies[0];
  e.appearT = -1;
  e.alpha = 0;
  e.flags.eyesClosed = 1;
  e.whiteFrames = 0;
  // silhouette out of the dark, colour arrives over 800ms
  e.params.silhouette = 1;
  for (let t = 0; t < 400; t += FRAME) {
    e.alpha = t / 400;
    yield null;
  }
  for (let t = 0; t < 800; t += FRAME) {
    e.params.silhouette = 1 - t / 800;
    yield null;
  }
  e.params.silhouette = 0;
  yield 150;
  e.flags.eyesClosed = 0;
  sfx('se_enemy_appear');
  yield 300;
  void getEnemy;
  void flag;
}

export type { PartyUnit };
