// 第3章の ハンコ（61 6.1・6.2・10.4・17.7・17.8）：
//  いただきます  味方ぜんいん 回復 (20＋ちから)×判定、ちから+1段階（3ターン）、ふつうの 敵は ごはんで
//                次の 行動を 1回 休む（中ボスと 休憩あけには 効かない）。ナリオサメ戦の 1回目は
//                巻きもどしを 止めて、町じゅうが 手を 合わせる（ch3rules.nariItadaki）
//  ごちそうさま  敵1体の くり返す 行動（回復の わざ）を この戦闘の あいだ 終わらせ、上がった
//                段階を 1段ずつ 下げる。くっきりなら ボケ負け
//  鍋への はなまる  オカワリナベの 中身が 140 以下で ふたが 閉まっていれば、どの 判定でも 決着

import type { Co } from '../engine/co';
import { ease } from '../engine/tween';
import { rng } from '../engine/rng';
import { fillAll, LABEL, SYS3 } from '../data/battle';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import { JUDGE_MUL, sfxGrade, type EnemyUnit, type Judge, type PartyUnit } from './model';
import { arrows, changeStage, healParty } from './common';
import { bokemakeLabel } from './tsukkomi';
import { PANEL_POS } from './ui/panels';
import { emptyBowl, gochisouSeal, itadakiSeal } from './art/fxart_ch3';
import { hanamaruFrame } from './art/stamps';
import { CH3_MIDBOSS } from '../data/battle';
import { nariItadaki } from './ch3rules';
import { tapeCanvas } from './ui/note';

/** The moves that repeat — and heal — which ごちそうさま ends (61 6.2). */
const REPEATING = new Set(['enemy_okawarinabe', 'enemy_nariosame']);

function* dropSeal(s: BattleScene, img: HTMLCanvasElement, x: number, y: number): Co {
  const st = { p: 0 };
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g) => {
      const cy = -img.height + (y + img.height) * ease.cubicIn(st.p);
      g.img(img, Math.round(x - img.width / 2), Math.round(cy - img.height / 2));
    },
  });
  for (let i = 1; i <= 5; i++) {
    st.p = i / 5;
    yield null;
  }
  fx.done = true;
  // it stays a moment where it landed, then fades
  s.addFx({ layer: 'top', dur: 700, draw: (g, t) => g.alpha(t > 400 ? (700 - t) / 300 : 1, () => g.img(img, Math.round(x - img.width / 2), Math.round(y - img.height / 2))) });
}

function landFeel(s: BattleScene, x: number, y: number, j: Judge): void {
  if (j === 'kukkiri') {
    s.hitstop(12);
    s.shake(2, 2, 8);
    s.sfx('se_stamp_heavy');
    s.labelUpRight(LABEL.kukkiri, x + 30, y, 'shu', 700);
    s.shuDrops(x, y, 10);
  } else if (j === 'futsuu') {
    s.hitstop(6);
    s.shake(1, 1, 6);
    s.sfx('se_stamp');
    s.shuDrops(x, y, 6);
  } else {
    s.hitstop(3);
    s.sfx('se_stamp_light');
    s.labelUpRight(LABEL.kasure, x + 30, y, 'gray', 700, true);
    s.shuSplash(x, y, 4, true);
  }
}

/** いただきます (61 6.1・17.7). */
export function* hankoItadakimasu(s: BattleScene, u: PartyUnit, j: Judge): Co {
  // everyone puts their hands together first (eyes closed, 200 ms)
  for (const p of s.party) if (p.alive) s.mood(p, 'happy', 900);
  const hands = s.party.filter((p) => p.alive).length;
  for (let i = 0; i < hands; i++) s.sfxLater('se_c3_gassho', { vol: 0.8 }, i * 90);
  s.post(SYS3.itadakiGassho);
  yield 300;
  const x = 192;
  const y = 92;
  yield* dropSeal(s, itadakiSeal(j === 'kasure' ? 0.4 : 0), x, y);
  s.sfx('se_c3_itadakimasu', { grade: sfxGrade(j), count: Math.max(2, s.party.length) });
  landFeel(s, x, y, j);
  // vermilion steam off each panel (3 threads); くっきり: rice-white dots drift down
  for (const p of s.party) {
    const [px, py] = PANEL_POS[p.id];
    for (let k = 0; k < 3; k++)
      s.addFx({
        layer: 'top',
        dur: 800,
        ui: true,
        draw: (g, t) => {
          if (t < k * 80) return;
          const q = (t - k * 80) / 700;
          if (q >= 1) return;
          g.alpha(0.8 * (1 - q), () => g.rect(Math.round(px + 14 + k * 6 + Math.sin(q * 6 + k) * 1.5), Math.round(py - 2 - q * 18), 1, 3, '#E23B2E'));
        },
      });
  }
  if (j === 'kukkiri')
    for (let k = 0; k < 40; k++) {
      const sx = rng.int(4, 380);
      const d = rng.int(0, 900);
      const sp = rng.range(30, 55);
      s.addFx({
        layer: 'top',
        dur: 1700 + d,
        draw: (g, t) => {
          if (t < d) return;
          const yy = ((t - d) / 1000) * sp;
          g.alpha(t > 1300 + d ? (1700 + d - t) / 400 : 1, () => g.rect(Math.round(sx + Math.sin((t - d) / 300 + k) * 2), Math.round(52 + yy), 2, 1, '#FFF6D8'));
        },
      });
    }
  yield 300;
  s.post(SYS3.itadaki);
  // ① everyone healed
  const n = Math.round((20 + u.m.atk) * JUDGE_MUL[j]);
  for (const p of s.party) if (p.alive) healParty(s, p, n);
  // (11.4: and their strength up a step)
  for (const p of s.party) if (p.alive) changeStage(s, p, 'atk', 1, 3, true);
  yield 500;
  const pages: string[] = [];
  // ② みんなで ごはん: the ordinary enemies skip their next move
  for (const e of s.aliveEnemies) {
    if (CH3_MIDBOSS.has(e.id) || e.def.boss || e.def.restActions === 0) continue;
    if ((e.status.kyuukei ?? 0) > 0 || e.mem.restEnded || e.status.restImmuneRound === s.round) continue;
    e.status.kyuukei = 1;
    e.status.kyuukeiSkipped = 0;
    e.setPose('rest');
    e.params.tapeAt_kyuukei = s.t;
    if (pages.length < 2) pages.push(...fillAll(SYS3.itadakiRest, { enemy: e.name }));
  }
  yield () => !s.msg.busy;
  if (pages.length) yield* s.say(pages);
  // ③ ナリオサメ: the noon goes on
  if (s.enemies.some((e) => e.id === 'enemy_nariosame' && e.alive) && !s.memo.itadakiUsed) yield* nariItadaki(s);
  s.memo.itadakiUsed = 1;
  s.memo.itadakiTut = 0;
}

/** ごちそうさま (61 6.2・17.8). */
export function* hankoGochisousama(s: BattleScene, _u: PartyUnit, e: EnemyUnit, j: Judge): Co {
  // the empty bowl set down before it, then the seal on it
  const bx = e.coreX;
  const by = Math.min(e.footY - 6, 136);
  s.sfx('se_c3_donburi');
  s.sfx('se_bump', { pitch: 1.6, vol: 0.5 });
  const bowl = emptyBowl();
  s.addFx({ layer: 'world', dur: 2200, draw: (g, t) => g.alpha(t > 1800 ? (2200 - t) / 400 : 1, () => g.img(bowl, Math.round(bx - bowl.width / 2), Math.round(by - bowl.height))) });
  yield 200;
  yield* dropSeal(s, gochisouSeal(j === 'kasure' ? 0.4 : 0), bx, by - 18);
  s.sfx('se_c3_gochisousama', { grade: sfxGrade(j) });
  landFeel(s, bx, by - 18, j);
  // a small bow (the top shears 2px for 300 ms)
  e.shear = 2;
  yield 300;
  e.shear = 0;
  const pages: string[] = [...SYS3.gochisou];
  // ① its repeating, healing move is over (every judgement)
  if (REPEATING.has(e.id) && !e.status.c3_gochisou) {
    e.status.c3_gochisou = true;
    e.params.tapeAt_gochisou = s.t;
    pages.push(...fillAll(SYS3.gochisouSeal, { enemy: e.name }));
  } else pages.push(...fillAll(SYS3.gochisouNone, { enemy: e.name }));
  // ② raised steps down one (not on かすれ)
  if (j !== 'kasure')
    for (const k of ['atk', 'def', 'spd'] as const)
      if (e.stages[k].lv > 0) {
        e.stages[k].lv--;
        arrows(s, e, false);
      }
  // ③ くっきり: ボケ負け
  if (j === 'kukkiri') {
    e.status.bokemake = true;
    bokemakeLabel(s, e);
  }
  yield 200;
  yield* s.say(pages);
}

/** The はなまる on the pot (61 10.4): any judgement settles it. */
export function* potHanamaru(s: BattleScene, _u: PartyUnit, e: EnemyUnit, j: Judge): Co {
  s.memo.ch3Won = 1;
  const x = e.coreX;
  const y = e.coreY;
  s.sfx('se_stamp');
  s.hitstop(j === 'kukkiri' ? 10 : 6);
  s.sfx('se_hanamaru', { grade: sfxGrade(j) });
  s.addFx({
    layer: 'world',
    dur: 0,
    draw: (g, t) => {
      const img = hanamaruFrame(40, Math.min(1, t / 300), j === 'kasure', 2);
      g.img(img, Math.round(x - 20), Math.round(y - 20));
    },
  });
  yield 300;
  s.petals(x, y, j === 'kukkiri' ? 24 : 12, 20, false);
  yield 300;
  yield* s.say(e.def.texts.extra.hanamaru ?? []);
  // the lid shut properly, the steam thin to one thread and gone, the handles go down
  e.setPose('settle');
  s.sfx('se_c3_futa', { pitch: 0.6, vol: 0.7 });
  yield 900;
  yield* s.say(e.def.texts.extra.settle ?? []);
  e.mem.settled = 1;
  void FRAME;
  void tapeCanvas;
}
