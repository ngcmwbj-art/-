// Chapter-2 round rules (51 7章, 9.2, 14.10–14.11): the statuses enemies
// start with (すねている, 徹夜中), 休憩中 turns that pass without a "!",
// the round end of テツヤ's 徹夜 (HP+10 and まもり+1, up to +2), the end of a
// rest (the tape peels off; テツヤ restarts its engine at the next round's
// start) and the hint to rest him.

import type { Co } from '../engine/co';
import { flag } from '../game/state';
import { fillAll, SYS2 } from '../data/battle';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import type { EnemyUnit } from './model';
import { arrows, showSticky } from './common';
import { showFlip } from './tsukkomi';
import { C, tapeCanvas } from './ui/note';

/** Statuses on at the start of a chapter-2 battle (51 8.1, 9.2). */
export function applyStartStatus(s: BattleScene): void {
  for (const e of s.enemies) {
    for (const st of e.def.startStatus ?? []) {
      if (st === 'status_sune') e.status.sune = true;
      if (st === 'status_tetsuya') e.status.tetsuya = true;
    }
  }
  if (s.enemies.some((e) => e.status.sune)) s.memo.suneTut = 1;
  // the battle's own music parameters start clean (a retry after a loss
  // while テツヤ rested must not keep his engine silent)
  if (s.enemies.some((e) => e.def.chapter === 2)) {
    s.setMusicParam('h_rest', 0);
    s.setMusicParam('h_light', 0);
    s.setMusicParam('tenko', 0);
  }
}

/** Is this enemy's turn one it spends resting? */
export function enemyRests(e: EnemyUnit): boolean {
  return (e.status.kyuukei ?? 0) > 0;
}

/** A turn spent resting: no "!", a short line (51 7.2, 9.3). */
export function* restTurn(s: BattleScene, e: EnemyUnit): Co {
  e.status.kyuukei = Math.max(0, (e.status.kyuukei ?? 0) - 1);
  e.status.kyuukeiSkipped = (e.status.kyuukeiSkipped ?? 0) + 1;
  if (e.pose !== 'rest') e.setPose('rest');
  s.noteActing(e.name + '（休憩中）', undefined, true);
  yield* s.say(fillAll(SYS2.restAct, { enemy: e.name }), false, { autoMs: 700 });
}

/** The start of a round: a rest that ended last round — テツヤ starts up again (14.11). */
export function* ch2RoundStart(s: BattleScene): Co {
  for (const e of s.aliveEnemies) {
    if (!e.mem.restEnded) continue;
    delete e.mem.restEnded;
    if (!e.def.restAlways) continue;
    // the engine turns over, the body hops 2px, the headlight opens, the
    // tape changes from 休憩中 to 徹夜中 (its まもり counted from 0 again)
    s.sfx('se_h_tiller', { level: 4 });
    e.setPose('restart');
    for (let i = 0; i < 2; i++) {
      e.offY = -2;
      yield 70;
      e.offY = 0;
      yield 90;
    }
    delete e.status.kyuukei;
    delete e.status.kyuukeiSkipped;
    e.status.tetsuya = true;
    e.stages.def.lv = 0;
    e.stages.def.turns = 0;
    e.params.tapeAt_tetsuya = s.t;
    s.setMusicParam('h_rest', 0);
    s.bg.flags.rest = 0;
    s.bg.flags.tetsuya = 1;
    e.setPose('idle');
    yield* s.say(e.def.texts.extra.restEnd ?? []);
  }
}

/**
 * The end of a round, after the usual countdowns: rests that have been
 * served come off; 徹夜 heals and hardens テツヤ; the hint to rest him.
 */
export function* ch2RoundEnd(s: BattleScene): Co {
  for (const e of s.aliveEnemies) {
    // a rest served in full comes off at the end of the round it was served in
    if ((e.status.kyuukeiSkipped ?? 0) > 0 && !enemyRests(e) && !e.mem.restEnded) {
      e.status.restImmuneRound = s.round + 1;
      if (e.def.restAlways) {
        // テツヤ keeps its 休憩中 tape until the engine turns over (next round's start)
        e.mem.restEnded = 1;
      } else {
        delete e.status.kyuukei;
        delete e.status.kyuukeiSkipped;
        peelTape(s, e);
        if (e.pose === 'rest') e.setPose('idle');
      }
    }
  }
  for (const e of s.aliveEnemies) {
    if (!e.status.tetsuya || enemyRests(e)) continue;
    yield* tetsuyaNight(s, e);
  }
  // 51 9.2 ヒント: two rounds in and おつかれさま never pressed on him
  const tetsu = s.aliveEnemies.find((e) => e.def.restAlways);
  if (tetsu && s.round === 2 && !s.memo.otsukareUsed && !s.memo.otsukareHint && s.minato?.m.skills.includes('skill_otsukaresama')) {
    s.memo.otsukareHint = 1;
    if (s.kanenari && s.kanenari.alive) {
      s.mood(s.kanenari, 'tsukkomi', 1800);
      showFlip(s, (tetsu.def.texts.extra.hintFlip ?? [''])[0], 1800);
    }
    yield* s.say(tetsu.def.texts.extra.hint ?? []);
    s.memo.otsukareTut = 1;
    showSticky(s, 'otsukare', 'flag_tut_otsukare');
  }
}

/** 14.10: the claws go round (200ms), +10 in green, the red ▲ of まもり (max +2). */
function* tetsuyaNight(s: BattleScene, e: EnemyUnit): Co {
  e.setPose('retill');
  s.sfx('se_h_soil', { vol: 0.6 });
  yield 200;
  const before = e.hp;
  e.hp = Math.min(e.maxHp, e.hp + 10);
  if (e.hp > before) s.number(e.coreX + 10, e.coreY - 6, e.hp - before, { kind: 'heal' }, 'enemy', e);
  const st = e.stages.def;
  if (st.lv < 2) {
    st.lv++;
    st.turns = 99;
    arrows(s, e, true);
    s.sfx('se_buff_up');
    e.params.tapeAt_tetsuya = s.t;
  }
  e.setPose('idle');
  s.memo.tetsuyaNights = (s.memo.tetsuyaNights ?? 0) + 1;
  // only the first two nights say it (テンポ)
  if (s.memo.tetsuyaNights <= 2) yield* s.say(e.def.texts.extra.roundEnd ?? [], false, { autoMs: 600 });
  else yield 400;
}

/** The 休憩中 tape of an ordinary enemy peels off and falls (no text; 14.11). */
function peelTape(s: BattleScene, e: EnemyUnit): void {
  const tapes = s.enemyTapes(e);
  const x = tapes[0]?.x ?? Math.round(e.x - 26);
  const y = tapes[0]?.y ?? e.headY - 26;
  const img = tapeCanvas(52, 16, '休憩中', '#9BCB6B', 11);
  s.addFx({
    layer: 'top',
    dur: 600,
    draw: (g, t) => {
      const p = t / 600;
      const fall = p * p * 40;
      const tilt = Math.round(p * 6);
      g.alpha(1 - p, () => {
        for (let r = 0; r < img.height; r++) g.ctx.drawImage(img, 0, r, img.width, 1, x + Math.round((r / img.height) * tilt), Math.round(y + fall + r), img.width, 1);
      });
    },
  });
  void C;
  void FRAME;
  void flag;
}

/**
 * The backgrounds follow what the enemy is doing (51 15章): 夜間通電中, 立ちっぱなし,
 * 値札はりかえ, the charge of チョトツ / テツヤ, テツヤ resting or awake all night.
 */
export function syncCh2Bg(s: BattleScene): void {
  const f = s.bg.flags;
  const live = s.aliveEnemies;
  const any = (fn: (e: EnemyUnit) => boolean) => (live.some(fn) ? 1 : 0);
  f.charged = any((e) => e.id === 'enemy_biribiri_ban' && e.stages.atk.lv >= 1);
  f.stiff = any((e) => e.id === 'enemy_henoheno_kacho' && e.stages.def.lv >= 1);
  f.nefuda = any((e) => e.id === 'enemy_mujin_hanbaiin' && e.stages.atk.lv >= 1);
  f.charge = any((e) => !!e.status.tame);
  f.rest = any((e) => !!e.def.restAlways && ((e.status.kyuukei ?? 0) > 0 || !!e.mem.restEnded));
  f.tetsuya = any((e) => !!e.status.tetsuya);
}
