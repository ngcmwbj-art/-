// 公園の練習の戦闘 (evt_kn_lesson; 20_systems_battle 10.6, 10_narrative
// 5.12b). 2026-09-28, the client: 「最初の公園で初戦は強制的に戦い方をカネナリに
// 説明を受けながらやる方がいいかも」. Right after Kanenari-kun joins he sets
// up a cardboard 練習台 and teaches, one at a time, the inputs of chapter 1:
// たたく (the ring) → ハンコ (hold, let go in the red) → ツッコミ (the "!") →
// みました. Each lesson is tried for real and waits until it works; a miss
// only gets a cheering flip. Nobody can be knocked down, the 練習台 never
// falls, and HP / ink are given back afterwards: it is a lesson, not a fight
// (no experience, no results).

import type { Co } from '../engine/co';
import { ease } from '../engine/tween';
import { currentSpace, musicEncounter, musicReturnToField, playBgm, setSpace, sfx } from '../audio';
import { getSkill, syncProgressSkills } from '../data/battle';
import { FLIP, LESSON_BAND, LESSON_HINT } from '../data/battle/text_lesson';
import { touchControlsOn } from '../engine/touch';
import type { BattleResult } from './api';
import type { BattleScene } from './scene';
import type { PartyCmd } from './model';
import { transitionIn, transitionOut } from './transition';
import { inputCommands } from './menu';
import { doAttack, doHanko } from './party';
import { doEnemyAction } from './enemy';
import { hideSticky, resetKire } from './common';
import { flipBoardText } from './art/fxart';
import { C } from './ui/note';
import { markText } from '../engine/textzones';

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
  yield* flip(s, FLIP.intro);

  // ① たたく: the ring, at the first-time (half) speed until it sounds good
  if (me && dummy) {
    yield* flip(s, FLIP.tataku);
    while (!qaDone(s)) {
      s.lesson = { icon: 'tataku', hint: LESSON_HINT.tataku, slow: true };
      const c = yield* choose(s);
      if (c?.kind === 'attack') {
        yield* act(s, c, () => doAttack(s, me, dummy));
        const q = s.lesson?.ring;
        if (q === 'good') {
          yield* flip(s, FLIP.tatakuOk);
          break;
        }
        yield* flip(s, q === 'early' ? FLIP.tatakuEarly : FLIP.tatakuLate);
      }
    }
  }

  // ② ハンコ: ペケ, hold and let go in the red (くっきり)
  if (me && dummy && !qaDone(s)) {
    yield* flip(s, touchControlsOn() ? FLIP.hankoTouch : FLIP.hanko);
    while (!qaDone(s)) {
      topUpInk(s, 'skill_peke');
      s.lesson = { icon: 'hanko', skill: 'skill_peke', hint: LESSON_HINT.hanko, slow: true };
      const c = yield* choose(s);
      if (c?.kind === 'hanko') {
        yield* act(s, c, () => doHanko(s, c));
        if (s.lesson?.judge === 'kukkiri') {
          yield* flip(s, FLIP.hankoOk);
          break;
        }
        yield* flip(s, FLIP.hankoNg);
      }
    }
  }

  // ③ ツッコミ: the 練習台 leans on しゅん; from the third try it stops at the "!"
  if (dummy && !qaDone(s)) {
    yield* flip(s, FLIP.tsukkomi);
    for (let tries = 1; !qaDone(s); tries++) {
      s.lesson = { freeze: tries >= 3 };
      s.noteActing('');
      yield* doEnemyAction(s, dummy, 'skill_renshu_motare');
      const r = s.lesson?.tsuk;
      if (r === 'just' || r === 'ok') {
        yield* flip(s, FLIP.tsukkomiOk);
        break;
      }
      yield* flip(s, r === 'kabuse' ? FLIP.tsukkomiEarly : FLIP.tsukkomiLate);
      if (tries === 2) yield* flip(s, FLIP.tsukkomiWait);
    }
  }

  // ④ みました: any judgement will do — the card and the HP bar come up
  if (me && dummy && !qaDone(s)) {
    yield* flip(s, FLIP.mimashita);
    while (!qaDone(s)) {
      topUpInk(s, 'skill_mimashita');
      s.lesson = { icon: 'hanko', skill: 'skill_mimashita', hint: LESSON_HINT.mimashita, slow: true };
      const c = yield* choose(s);
      if (c?.kind === 'hanko') {
        yield* act(s, c, () => doHanko(s, c));
        break;
      }
    }
    // let the みました card close before the board goes up over it
    yield () => !s.card;
    if (!qaDone(s)) yield* flip(s, FLIP.mimashitaOk);
  }

  // ごうかく: the 練習台 is pleased (it wobbles), and the lesson is over
  if (dummy) {
    dummy.flags.happy = 1;
    // (__game.cmd.win() hid it: it stands there again for the last flip)
    dummy.dead = false;
    dummy.visible = true;
    dummy.hp = Math.max(1, dummy.hp);
  }
  yield* flip(s, FLIP.end);
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
 * Kanenari-kun's flip board on the stage: it comes up from below, each page
 * waits for 決定 (a small ▼ blinks in its corner), the board turns over
 * between pages, and it goes back down after the last one.
 */
export function* flip(s: BattleScene, pages: string[]): Co {
  if (!pages.length) return;
  // the band steps aside: the board goes up at the top of the stage, over
  // the 練習台's head, where the band was
  s.msg.clear();
  s.msg.clearStatic();
  s.msg.hidden = true;
  const k = s.kanenari;
  const st = { i: 0, t: 0, turn: -1, down: -1, ready: false };
  const imgs = pages.map((p) => flipBoardText(p));
  s.sfx('se_flip');
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    update(dt) {
      st.t += dt;
      if (st.turn >= 0) st.turn += dt;
      if (st.down >= 0) st.down += dt;
    },
    draw: (g) => {
      const img = imgs[Math.min(st.i, imgs.length - 1)];
      const up = st.t < 140 ? ease.backOut(st.t / 140) : 1;
      const down = st.down >= 0 ? ease.quadIn(Math.min(1, st.down / 140)) : 0;
      const y0 = 8;
      const y = Math.round(216 - (216 - y0) * up + (216 - y0) * down);
      // turning over: the board squashes to a line and opens again
      const sy = st.turn >= 0 && st.turn < 140 ? Math.abs(Math.cos((st.turn / 140) * Math.PI)) : 1;
      const h = Math.max(1, Math.round(img.height * sy));
      const x = Math.round(192 - img.width / 2);
      // the board where it stands (in place of the band): the touch controls keep off it
      markText(x, y0, img.width, img.height);
      g.ctx.drawImage(img, x, y + Math.round((img.height - h) / 2), img.width, h);
      if (st.ready && st.down < 0 && Math.floor(s.rt / 400) % 2 === 0) {
        // ▼ inside the lower right corner, above the mitten
        const tx = x + img.width - 22;
        const ty = y + img.height - 17;
        g.rect(tx, ty, 7, 1, C.ink);
        g.rect(tx + 1, ty + 1, 5, 1, C.ink);
        g.rect(tx + 2, ty + 2, 3, 1, C.ink);
        g.rect(tx + 3, ty + 3, 1, 1, C.ink);
      }
    },
  });
  for (let i = 0; i < pages.length; i++) {
    if (i > 0) {
      st.turn = 0;
      s.sfx('se_flip');
      yield 70;
      st.i = i;
      yield 70;
      st.turn = -1;
    }
    if (k) s.mood(k, 'tsukkomi', 60000);
    s.flipText = pages[i];
    st.ready = false;
    // a short look before 決定 counts (a held press from the action does not skip it)
    const shown = s.t;
    s.takeConfirm();
    yield () => s.t - shown >= 350;
    s.takeConfirm();
    st.ready = true;
    yield () => s.takeConfirm() || ((!!s.auto.flips || qaDone(s)) && s.t - shown >= 600);
    s.sfx('se_page');
  }
  st.down = 0;
  s.flipText = '';
  yield 150;
  fx.done = true;
  s.msg.hidden = false;
  if (k) k.moodOverride = null;
}
