// 公園の練習の戦闘 (evt_kn_lesson; 20_systems_battle 10.6, 10_narrative
// 5.12b). 2026-09-28, the client: 「最初の公園で初戦は強制的に戦い方をカネナリに
// 説明を受けながらやる方がいいかも」. Right after グソっ君 joins (★2026-09-29:
// 「海の 中では 敵なしやったんや。戦い方、教えたるわ」) he sets up a cardboard
// 練習台 and teaches, one at a time, the inputs of chapter 1: たたく (the
// ring) → ハンコ (hold, let go in the red) → ツッコミ (the "!"); the last,
// みました, しゅん teaches him (「……倒さんで ええんか？」). Each lesson is tried
// for real and waits until it works; a miss only gets a cheering line. Nobody can be knocked down, the 練習台 never
// falls, and HP / ink are given back afterwards: it is a lesson, not a fight
// (no experience, no results).

import type { Co } from '../engine/co';
import { ease } from '../engine/tween';
import { currentSpace, musicEncounter, musicReturnToField, playBgm, setSpace, sfx } from '../audio';
import { getSkill, syncProgressSkills } from '../data/battle';
import { LESSON_BAND, LESSON_HINT, LESSON_NARR, TALK } from '../data/battle/text_lesson';
import { touchControlsOn } from '../engine/touch';
import type { BattleResult } from './api';
import type { BattleScene } from './scene';
import type { PartyCmd } from './model';
import { transitionIn, transitionOut } from './transition';
import { inputCommands } from './menu';
import { doAttack, doHanko } from './party';
import { doEnemyAction } from './enemy';
import { hideSticky, resetKire } from './common';
import { knOpts } from './gusokkun';

/** The lesson battle's whole flow (battleImpl runs it instead of battleFlow). */
export function* lessonFlow(s: BattleScene): Co<BattleResult> {
  syncProgressSkills();
  const dummy = s.enemies[0];
  const me = s.minato;
  // HP and ink are given back at the end; the ink is full for the lesson
  const snap = s.party.map((u) => ({ u, hp: u.m.hp, mp: u.m.mp }));
  if (me) {
    me.m.mp = me.m.maxMp;
    me.mpShown = me.m.mp;
  }
  s.lesson = {};
  for (const e of s.enemies) e.appearT = -2;
  s.prevSpace = currentSpace();
  musicEncounter();
  yield* transitionIn(s, false);
  setSpace('battle');
  playBgm(s.opts.music ?? 'bgm_battle');
  s.showUi = true;
  for (const e of s.enemies) e.appearT = 0;
  sfx('se_enemy_appear');
  yield 400;
  yield* s.say(dummy?.def.texts.appear ?? []);
  yield* talk(s, TALK.intro);

  // ① たたく: the ring, at the first-time (half) speed until it sounds good
  if (me && dummy) {
    yield* talk(s, TALK.tataku);
    while (!qaDone(s)) {
      s.lesson = { icon: 'tataku', hint: LESSON_HINT.tataku, slow: true };
      const c = yield* choose(s);
      if (c?.kind === 'attack') {
        yield* act(s, c, () => doAttack(s, me, dummy));
        const q = s.lesson?.ring;
        if (q === 'good') {
          yield* talk(s, TALK.tatakuOk);
          break;
        }
        yield* talk(s, q === 'early' ? TALK.tatakuEarly : TALK.tatakuLate);
      }
    }
  }

  // ② ハンコ: ペケ, hold and let go in the red (くっきり)
  if (me && dummy && !qaDone(s)) {
    yield* talk(s, touchControlsOn() ? TALK.hankoTouch : TALK.hanko);
    while (!qaDone(s)) {
      topUpInk(s, 'skill_peke');
      s.lesson = { icon: 'hanko', skill: 'skill_peke', hint: LESSON_HINT.hanko, slow: true };
      const c = yield* choose(s);
      if (c?.kind === 'hanko') {
        yield* act(s, c, () => doHanko(s, c));
        if (s.lesson?.judge === 'kukkiri') {
          yield* talk(s, TALK.hankoOk);
          break;
        }
        yield* talk(s, TALK.hankoNg);
      }
    }
  }

  // ③ ツッコミ: the 練習台 leans on しゅん; from the third try it stops at the "!"
  if (dummy && !qaDone(s)) {
    yield* talk(s, TALK.tsukkomi);
    for (let tries = 1; !qaDone(s); tries++) {
      s.lesson = { freeze: tries >= 3 };
      s.noteActing('');
      yield* doEnemyAction(s, dummy, 'skill_renshu_motare');
      const r = s.lesson?.tsuk;
      if (r === 'just' || r === 'ok') {
        yield* talk(s, TALK.tsukkomiOk);
        break;
      }
      yield* talk(s, r === 'kabuse' ? TALK.tsukkomiEarly : TALK.tsukkomiLate);
      if (tries === 2) yield* talk(s, TALK.tsukkomiWait);
    }
  }

  // ④ みました: 「とどめや！」 — and しゅん shows him the みました hanko instead
  // (any judgement will do — the card and the HP bar come up)
  if (me && dummy && !qaDone(s)) {
    yield* talk(s, TALK.mimashita);
    yield* talk(s, LESSON_NARR.mimashita, true);
    while (!qaDone(s)) {
      topUpInk(s, 'skill_mimashita');
      s.lesson = { icon: 'hanko', skill: 'skill_mimashita', hint: LESSON_HINT.mimashita, slow: true };
      const c = yield* choose(s);
      if (c?.kind === 'hanko') {
        yield* act(s, c, () => doHanko(s, c));
        break;
      }
    }
    // let the みました card close before he speaks: 「……倒さんで ええんか？」
    yield () => !s.card;
    if (!qaDone(s)) yield* talk(s, TALK.mimashitaOk);
  }

  // ごうかく: the 練習台 is pleased (it wobbles), and the lesson is over
  if (dummy) {
    dummy.flags.happy = 1;
    // (__game.cmd.win() hid it: it stands there again for his last line)
    dummy.dead = false;
    dummy.visible = true;
    dummy.hp = Math.max(1, dummy.hp);
  }
  yield* talk(s, TALK.end);
  s.lesson = null;
  yield* s.say(LESSON_BAND.end);
  // everything back as it was before the lesson
  for (const { u, hp, mp } of snap) {
    u.m.hp = hp;
    u.m.mp = mp;
    u.m.status = {};
    u.guard = false;
  }
  s.cmd = null;
  s.list = null;
  s.cues.clear();
  hideSticky(s);
  s.msg.clearStatic();
  resetKire(s);
  musicReturnToField();
  yield* transitionOut(s);
  if (s.prevSpace) setSpace(s.prevSpace);
  return 'win';
}

/** QA (__game.cmd.win(), the playthrough's short battles): the lesson ends at its next step. */
function qaDone(s: BattleScene): boolean {
  return !!s.memo.qaWin;
}

/** One command from しゅん (the lesson gate greys out everything else). */
function* choose(s: BattleScene): Co<PartyCmd | null> {
  s.round++;
  for (const u of s.party) u.acting = false;
  const cmds = yield* inputCommands(s);
  hideSticky(s);
  s.msg.clearStatic();
  return cmds.find((c) => c.u.id === 'minato') ?? null;
}

/** Play a chosen command the way the battle does (panel lifts, the note shows it). */
function* act(s: BattleScene, c: PartyCmd, run: () => Co): Co {
  const u = c.u;
  u.acting = true;
  s.noteActing(c.kind === 'attack' ? 'たたく' : c.kind === 'hanko' && c.skill === 'skill_mimashita' ? 'みました' : c.kind === 'hanko' ? 'ペケ' : '', c.kind === 'attack' ? 'tataku' : 'hanko');
  yield* run();
  u.acting = false;
  yield 250;
}

/** The ink never runs out in the lesson: refilled only when the stamp would not fit (it is all given back afterwards). */
function topUpInk(s: BattleScene, skill: string): void {
  const m = s.minato;
  const cost = getSkill(skill)?.cost ?? 0;
  if (m && m.m.mp < cost) m.m.mp = m.m.maxMp;
}

/**
 * グソっ君 says `pages` in the band with his name tag (battle/gusokkun.ts);
 * each page waits for 決定 (the band's ▼), or turns by itself for QA
 * (bauto({ flips: true }) / __game.cmd.win()). `narr` = the band's own
 * narration (no tag).
 */
export function* talk(s: BattleScene, pages: string[], narr = false): Co {
  if (!pages.length) return;
  const k = s.kanenari;
  for (const p of pages) {
    if (k && !narr) s.mood(k, 'happy', 60000);
    s.flipText = p;
    const auto = !!s.auto.flips || qaDone(s);
    yield* s.say([p], !auto, narr ? {} : knOpts());
    s.sfx('se_page');
  }
  s.flipText = '';
  if (k) k.moodOverride = null;
}
