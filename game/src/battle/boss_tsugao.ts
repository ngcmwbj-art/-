// ツガオ決戦（boss_tsugao。61 14・16.6・16.8・17.9〜17.18・60 6.10・7.4・10.27）：
//
//  1段目「まだ 打刻せん」 黒い「まだ」の ゲージ 640、錠 320。ハンコ（ペケ・はなまる）は 半分しか しみこまない
//      （ヤキソバンが こそげた 直後の 1回と、ツガオが 眠っている あいだは まるごと）。技は「止める」技だけ：
//      『まだ』（ツッコミに 失敗すると 1回 動けない）、40年の 伝票（全体）、休みの 貯金（ゲージ +50。
//      ごちそうさまで 封じる）、つがおちゃん 寝る〜♪（次の 番を 眠って すごす）。全滅は ここだけ。
//  2段目「よぶ」 ゲージが 320 に 着いたら、残りの 行動を 取り消して 黒い 回覧板（10マス）が 体の 前へ。
//      ツガオは もう 攻撃しない。しゅんの コマンドの 5つ目に「よぶ」（グソっ君と ヤキソバンは 待つ）。
//      よぶ① 夕鳴町 ② 星見台 ③ 海ぞいの 町（来た人が 0人の 町は とばす）④ 3人。来た人は 1人ずつ 歩いて
//      きて、回覧板に はなまるを 描き、画面の 下に 並ぶ（影は 大水槽の ガラスに 残る）。人の ますは
//      min(7, 来た人) を 町の 人数の 割合で、④ は 残り（3マス 以上）。
//  最終局面 10マス うまったら ハンコケースの 10番目「みんなの はなまる」。しゅんの コマンドは それ 1つ、
//      どの 判定でも 決着 → ゲージの 黒が 割れて 落ち、回覧板の はなまるが それぞれの 色に → ホールの 青に
//      溶けて 'win'。黒い 判が 落ちる 所（evt_ch3_boss_final）からは E の フィールド（E と 合わせた 分け目）。

import type { Co } from '../engine/co';
import { Gfx } from '../engine/gfx';
import { ease } from '../engine/tween';
import { rng } from '../engine/rng';
import { game } from '../engine/game';
import { flag, setFlag, state } from '../game/state';
import { addVoiceLayer, duckMusic, setSpace, stopBgm } from '../audio';
import { SPEAKERS } from '../world/msg';
import { fillAll, learnSkill, SYS, yobuPeople, type YobuCome, type YobuMark } from '../data/battle';
import type { BattleResult } from './api';
import type { BattleScene } from './scene';
import type { EnemyUnit, Judge, PartyCmd, PartyUnit } from './model';
import type { BossMoveCtx } from './enemy';
import { hitLoop, projectile } from './enemy';
import { giveStatus, healParty, hurtEnemy, showSticky } from './common';
import { knSay } from './gusokkun';
import { PANEL_POS } from './ui/panels';
import { madaMark } from './art/fxart_ch3';
import { hanamaruFrame } from './art/stamps';
import { playHankoLearnIn } from './learn';
import { makeCanvas, PixelCanvas } from '../engine/pixel';
import { charSprite, hasChar, walkFrame } from '../art/chars/registry';
import { CMD_ICONS } from './art/icons';

// ---- who, which part --------------------------------------------------------------------------------

export function tgFind(s: BattleScene): EnemyUnit | undefined {
  return s.enemies.find((e) => e.id === 'boss_tsugao' && !e.dead);
}
export function tgPhase(s: BattleScene): number {
  return s.shared.tgPhase ?? 1;
}
const X = (e: EnemyUnit) => e.def.texts.extra;

// ---- the board and the people (one per battle) ------------------------------------------------------

interface Cell {
  /** 1..3 a town's people, 4 the three. */
  owner: number;
  marks: { mark: YobuMark; color: string; rich: boolean; t: number }[];
  /** s.t when its black started to go (−1 still black). */
  fill: number;
}
interface Walker {
  p: YobuCome | null;
  sprite: string;
  t0: number;
  cell: number;
  /** where it ends up standing (16.8). */
  rx: number;
  ry: number;
  back: boolean;
}
interface Board {
  people: YobuCome[];
  calls: number[];
  cells: Cell[];
  /** 0 on his back … 1 in front, centred (2段目). */
  front: number;
  walkers: Walker[];
  shadows: { id: string; x: number; y: number; t: number }[];
  drawn: number;
  callsDone: number;
  /** s.t of the final colouring (60 10.27: each mark to its own colour). */
  colour: number;
}
const boards = new WeakMap<BattleScene, Board>();
function board(s: BattleScene): Board {
  let b = boards.get(s);
  if (!b) {
    const pr = Object.keys(state.flags ?? {});
    const people = yobuPeople(pr);
    b = { people, calls: [], cells: [], front: 0, walkers: [], shadows: [], drawn: 0, callsDone: 0, colour: -1 };
    // 61 14.5: the people's cells = min(7, all who came), shared by the towns' numbers; ④ the rest
    const n = [0, 0, 0, 0];
    for (const p of people) n[p.call]++;
    const human = Math.min(7, people.length);
    const cells = [0, 0, 0, 0];
    if (human > 0) {
      let sum = 0;
      for (const c of [1, 2, 3]) {
        cells[c] = n[c] ? Math.max(1, Math.round((human * n[c]) / people.length)) : 0;
        sum += cells[c];
      }
      // make the shares add up to `human` (take from / give to the biggest town)
      while (sum !== human) {
        const big = [1, 2, 3].sort((a, c) => cells[c] - cells[a])[0];
        const d = sum > human ? -1 : 1;
        if (d < 0 && cells[big] <= 1) break;
        cells[big] += d;
        sum += d;
      }
    }
    cells[4] = 10 - cells[1] - cells[2] - cells[3];
    for (const c of [1, 2, 3, 4]) for (let i = 0; i < cells[c]; i++) b.cells.push({ owner: c, marks: [], fill: -1 });
    b.calls = [1, 2, 3].filter((c) => n[c] > 0);
    b.calls.push(4);
    boards.set(s, b);
  }
  return b;
}

// ---- start ----------------------------------------------------------------------------------------

/** aqStart for the last battle: the places, the phase, the board. */
export function tgStart(s: BattleScene): void {
  const e = tgFind(s);
  if (!e) return;
  e.x = e.xTarget = 192;
  e.footY = 160;
  s.shared.tgPhase = 1;
  setFlag('flag_ch3_boss_phase', 1);
  s.setMusicParam('boss_phase', 1);
  s.setMusicParam('yobu', 0);
  board(s);
}

// ---- the party's turn -----------------------------------------------------------------------------

/** runParty's first word in the last battle. Returns true when the action was taken over. */
export function* tgBeforeParty(s: BattleScene, c: PartyCmd): Co<boolean> {
  const e = tgFind(s);
  if (!e) return false;
  s.memo.tgHanko = c.kind === 'hanko' ? 1 : 0;
  if (tgPhase(s) >= 2 && c.kind !== 'yobu' && !(c.kind === 'hanko' && c.skill === 'skill_minna_hanamaru')) {
    // 2段目: nothing but よぶ reaches him (24 #28) — items and まもる still work on our side
    if (c.kind === 'attack' || c.kind === 'nori' || (c.kind === 'hanko' && c.target === e) || (c.kind === 'yaki' && c.target === e)) {
      yield* s.say(X(e).notYet ?? []);
      return true;
    }
  }
  return false;
}

/** aqHurt's word on him: the half of a hanko, the lock, nothing at all in the second part. */
export function tgHurt(s: BattleScene, e: EnemyUnit, d: number): number {
  if (tgPhase(s) >= 2) return 0;
  if (!s.memo.tgHanko) return d;
  const free = !!s.memo.tgFree || !!e.mem.sleep;
  if (free) {
    s.memo.tgSay = e.mem.sleep ? 3 : 2;
    s.memo.tgFree = 0;
    return d;
  }
  s.memo.tgSay = 1;
  return Math.round(d / 2);
}

/** After each action: the half / whole line, and the second part once the gauge is at the lock. */
export function* tgAfterAction(s: BattleScene): Co {
  const e = tgFind(s);
  if (!e) return;
  const say = s.memo.tgSay ?? 0;
  s.memo.tgSay = 0;
  s.memo.tgHanko = 0;
  if (say === 1 && (s.memo.tgHalfN ?? 0) < 3) {
    s.memo.tgHalfN = (s.memo.tgHalfN ?? 0) + 1;
    yield* s.say(X(e).half ?? [], false, { autoMs: 800 });
  } else if (say === 2) yield* s.say(X(e).full ?? [], false, { autoMs: 800 });
  else if (say === 3) yield* s.say(X(e).sleepFull ?? [], false, { autoMs: 800 });
  if (tgPhase(s) === 1 && e.hp <= (e.def.gauge?.lock ?? 320)) yield* phase2(s, e);
}

/** 61 14.3: the gauge stops at the lock, the board comes round to the front, よぶ appears. */
function* phase2(s: BattleScene, e: EnemyUnit): Co {
  s.shared.tgPhase = 2;
  // the rest of this round is called off
  s.memo.roundCut = s.round;
  setFlag('flag_ch3_boss_phase', 2);
  s.setMusicParam('boss_phase', 2);
  e.mem.sleep = 0;
  e.hp = e.def.gauge?.lock ?? 320;
  for (const u of s.party) delete u.m.status.status_c3_mada;
  // only しゅん can call: if the slips knocked him down, he gets up (no one is left unable to finish)
  const mi = s.minato;
  const upAgain = !!mi && !mi.alive;
  if (mi && upAgain) healParty(s, mi, Math.ceil(mi.m.maxHp / 4));
  s.sfx('se_c3_mada_stamp', { pitch: 0.7, vol: 0.6 });
  yield* s.say(X(e).lockHold ?? []);
  // the board from his back to the front, blown up in the middle (600 ms)
  const b = board(s);
  e.setPose('board');
  for (let i = 1; i <= 36; i++) {
    b.front = ease.quadInOut(i / 36);
    yield null;
  }
  s.sfx('se_flip');
  yield 200;
  if (mi && upAgain) yield* s.say(fillAll(SYS.revived, { target: mi.name }));
  yield* s.say(X(e).yobuAppear ?? []);
  showSticky(s, 'yobu', 'flag_tut_yobu', true);
}

// ---- よぶ (61 14.4・17.17) ---------------------------------------------------------------------------

/** QA / the menu: what よぶ does next (1..4), 0 when it is spent. */
export function yobuNext(s: BattleScene): number {
  if (tgPhase(s) !== 2) return 0;
  const b = board(s);
  return b.calls[b.callsDone] ?? 0;
}

/** 16.8, moved aside: the board fills the middle, so they stand in rows to its right and left (10 a row, 4 rows). */
const ROW_XS = [266, 118, 280, 104, 294, 308, 322, 336, 350, 364];
function rowSpot(i: number): [number, number, boolean] {
  const row = Math.min(3, Math.floor(i / ROW_XS.length));
  const k = i % ROW_XS.length;
  return [ROW_XS[k] + (row % 2 ? 7 : 0), 140 - row * 10, row > 0];
}

function cellCentre(i: number): [number, number] {
  const col = i % 5;
  const row = Math.floor(i / 5);
  return [BX + 5 + col * 24 + 11, BY + 14 + row * 32 + 15];
}

export function* doYobu(s: BattleScene, u: PartyUnit): Co {
  const e = tgFind(s);
  if (!e) return;
  const b = board(s);
  const call = b.calls[b.callsDone];
  if (!call) return;
  b.callsDone++;
  // しゅん turns to the hall's door with his hands round his mouth
  s.mood(u, 'surprised', 300);
  s.sfx('se_c3_yobu', { level: call });
  yield 300;
  s.mood(u, 'happy', 1600);
  if (call === 4) {
    yield* trio(s, e, b);
    return;
  }
  s.post(X(e)['yobu' + call] ?? []);
  yield 600;
  const who = b.people.filter((p) => p.call === call);
  const mine = b.cells.map((c, i) => (c.owner === call ? i : -1)).filter((i) => i >= 0);
  const t0 = s.t;
  for (let k = 0; k < who.length; k++) {
    const p = who[k];
    const cell = mine.length ? mine[k % mine.length] : 0;
    const spot = rowSpot(b.walkers.length);
    const w: Walker = { p, sprite: spriteOf(p.id), t0: s.t, cell, rx: spot[0], ry: spot[1], back: spot[2] };
    b.walkers.push(w);
    // the shadow on the tank's glass first (62 11.8)
    b.shadows.push({ id: w.sprite, x: 24 + ((b.shadows.length * 53) % 336), y: 70 + ((b.shadows.length * 17) % 3) * 6, t: s.t });
    // the hand reaches the board at +450 ms: the はなまる, the sound, one more voice in the song
    const at = s.t + 450;
    s.run(
      (function* () {
        yield () => s.t >= at;
        b.cells[cell].marks.push({ mark: p.mark, color: p.color, rich: p.rich, t: s.t });
        if (b.cells[cell].fill < 0) b.cells[cell].fill = s.t;
        b.drawn++;
        drawSound(s, p.id, b.drawn);
      })(),
    );
    yield 600;
  }
  // the last one's mark lands, the cells settle
  yield () => s.t - t0 >= who.length * 600 + 500;
  yield 300;
  e.params.eye = Math.min(4, (e.params.eye ?? 0) + 1);
  e.setPose('watch');
  duckMusic(0.63, 2.5);
  yield* s.say(X(e)['yobu' + call + 'Tg'] ?? [], false, { voice: 'tsugao' });
}

/** ④: the three step out of their panels and fill the cells that are left; then the 10th slot. */
function* trio(s: BattleScene, e: EnemyUnit, b: Board): Co {
  const three = s.party.filter((u) => u.id === 'minato' || u.id === 'kanenari' || u.id === 'yakisoban');
  s.post(three.some((u) => u.id === 'yakisoban') ? X(e).yobu4 ?? [] : X(e).yobu4Two ?? []);
  yield 300;
  const left = b.cells.map((c, i) => (c.marks.length === 0 || c.owner === 4 ? i : -1)).filter((i) => i >= 0 && b.cells[i].owner === 4);
  // (no one came at all: ④ draws all ten — 61 14.5)
  const todo = left.length ? left : b.cells.map((_c, i) => i).filter((i) => !b.cells[i].marks.length);
  const MARKS: Record<string, { mark: YobuMark; color: string }> = {
    minato: { mark: 'akapen', color: '#E23B2E' },
    kanenari: { mark: 'umi', color: '#4AA8E0' },
    yakisoban: { mark: 'tofu', color: '#8A5A2A' },
  };
  const sprites: Record<string, string> = { minato: 'minato', kanenari: 'kanenari', yakisoban: hasChar('npc_yakisoban') ? 'npc_yakisoban' : 'npc_maruyama' };
  // they come out of their panels and stand before the board
  three.forEach((u, i) => {
    const [px, py] = PANEL_POS[u.id] ?? [104, 150];
    b.walkers.push({ p: null, sprite: sprites[u.id], t0: s.t, cell: -1 - i, rx: [114, 262, 280][i] ?? 300, ry: 152, back: false });
    void px;
    void py;
  });
  yield 400;
  for (let k = 0; k < todo.length; k++) {
    const u = three[k % three.length];
    const c = b.cells[todo[k]];
    const m = MARKS[u.id];
    c.marks.push({ mark: m.mark, color: m.color, rich: false, t: s.t });
    if (c.fill < 0) c.fill = s.t;
    b.drawn++;
    drawSound(s, u.id === 'minato' ? 'shun' : u.id === 'kanenari' ? 'gusokkun' : 'yakisoban', b.drawn);
    u.bounceT = 250;
    u.bounceAmp = 3;
    yield 300;
  }
  yield 400;
  e.params.eye = 4;
  yield () => !s.msg.busy;
  duckMusic(0.63, 2.5);
  yield* s.say(X(e).yobu4Tg ?? [], false, { voice: 'tsugao' });
  // 回覧板が うまった → the 10th slot (61 14.6・17.18). A: the voices swell to one chord here
  s.shared.tgPhase = 3;
  setFlag('flag_ch3_boss_phase', 3);
  s.setMusicParam('boss_phase', 3);
  s.sfx('se_glint');
  yield* s.say((X(e).full10 ?? []).slice(0, 1));
  learnSkill('minato', 'skill_minna_hanamaru');
  yield* playHankoLearnIn(s, 'skill_minna_hanamaru', (X(e).full10 ?? []).slice(1));
  yield* s.say(X(e).prompt ?? []);
}

/** A field sprite for someone who came (the children are one group: the first child). */
function spriteOf(id: string): string {
  if (id === 'npc_c3_kid_a') return 'npc_c3_kid_a';
  return id;
}

// ---- his moves ------------------------------------------------------------------------------------

/** aqMove for him: 寝る, the sleep itself, and the watching of the second part. */
export function* tgMove(s: BattleScene, e: EnemyUnit, skillId: string): Co<boolean> {
  if (e.id !== 'boss_tsugao') return false;
  if (tgPhase(s) >= 2) return true;
  if (e.mem.sleep) {
    // the turn he sleeps through (61 14.2): the bubble at his nose, then he wakes
    e.mem.sleep = 0;
    s.noteActing(e.name, undefined, 'rest');
    e.setPose('neru');
    yield* s.say(['ツガオは すやすや 眠っている。'], false, { autoMs: 700 });
    s.sfx('se_c3_aq_akubi', { vol: 0.6 });
    e.setPose('idle');
    yield* s.say(X(e).neruWake ?? [], false, { autoMs: 700 });
    return true;
  }
  if (skillId !== 'skill_tsugao_neru') return false;
  s.noteActing('寝る〜♪', undefined, true);
  e.mem.acts = (e.mem.acts ?? 0) + 1;
  e.mem.neruN = (e.mem.neruN ?? 0) + 1;
  e.lastSkills.push(skillId);
  e.setPose('cap');
  yield 400;
  yield* s.say(X(e).neru ?? [], false, { voice: 'tsugao' });
  e.setPose('neru');
  e.mem.sleep = 1;
  yield* s.say(X(e).neruResult ?? []);
  // the "!" is グソっ君's own line (no input)
  if (s.kanenari?.alive) {
    s.mood(s.kanenari, 'tsukkomi', 1400);
    yield* knSay(s, X(e).neruKn ?? []);
  }
  return true;
}

/** The black seal 『まだ』 thrown at a panel. */
let sealImg: HTMLCanvasElement | null = null;
function blackSeal(): HTMLCanvasElement {
  sealImg ??= madaMark(16, 14, 5);
  return sealImg;
}

/** ch3Move for his three moves with a "!" (61 14.2・17.9・17.10). */
export function* tgMoves(c: BossMoveCtx): Co {
  const { s, e, sk, common, resolveGuard, target, all, pages, damageTo, st } = c;
  switch (sk.id) {
    case 'skill_tsugao_mada': {
      const t = target!;
      s.sfx('se_swing', { pitch: 0.7, vol: 0.4 });
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('stamp_up');
          if (toHit === 12) {
            e.setPose('stamp_throw');
            projectile(s, blackSeal, e.coreX - 20, e.top + 10, t, 12, 1, 1.4, 18);
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          if (r) {
            s.sfx('se_c3_hajiku');
            const [px, py] = PANEL_POS[t.id] ?? [104, 150];
            s.burst(px + 20, py + 10, { count: 6, speed: [50, 110], life: [200, 360], colors: ['#1B1733'], gravity: 200, shape: 'sq', size: [2, 2], sizeEnd: 1 }, true);
          } else {
            s.sfx('se_c3_mada_stamp');
            giveStatus(s, t, 'status_c3_mada', 1);
            t.shakeT = 160;
          }
        },
      });
      if (st.anySuccess) pages.push(...(X(e).madaHajiku ?? []));
      else pages.push(...fillAll(X(e).madaResult ?? [], { target: t.name }));
      break;
    }
    case 'skill_tsugao_denpyo': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('denpyo');
          if (toHit === 10) {
            s.sfx('se_c3_fubuki');
            fubuki(s, e);
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.6, r, i, true));
        },
      });
      break;
    }
    case 'skill_tsugao_chokin': {
      yield* c.selfMove(s, common, resolveGuard, () => e.setPose('chokin'), (f) => {
        if (f === 0) e.setPose('chokin');
      });
      if (!st.anySuccess) {
        s.sfx('se_c3_chokin');
        const before = e.hp;
        e.hp = Math.min(e.maxHp, e.hp + 50);
        e.hpTrail = Math.min(e.hpTrail, before);
      } else pages.push(...(X(e).chokinGuard ?? []));
      break;
    }
  }
}

/** 61 17.10: forty white slips with a blue date line blow over the whole screen. */
function fubuki(s: BattleScene, e: EnemyUnit): void {
  for (let i = 0; i < 40; i++) {
    const x0 = e.coreX + rng.int(-30, 30);
    const y0 = e.top + 20 + rng.int(-10, 10);
    const vx = rng.range(-220, 220);
    const vy = rng.range(40, 160);
    const d = i * 12;
    const rot = rng.int(0, 1);
    s.addFx({
      layer: 'top',
      dur: 800 + d,
      draw: (g, t) => {
        if (t < d) return;
        const p = (t - d) / 800;
        const x = x0 + vx * p + Math.sin(p * 9 + i) * 6;
        const y = y0 + vy * p + 60 * p * p;
        const w = rot ? 6 : 8;
        const h = rot ? 8 : 6;
        g.alpha(1 - p * 0.6, () => {
          g.rect(Math.round(x), Math.round(y), w, h, '#F4F1E8');
          g.rect(Math.round(x + 1), Math.round(y + 2), w - 2, 1, '#4A6AB0');
        });
      },
    });
  }
}

// ---- the hanko on him ---------------------------------------------------------------------------------

/** aqHankoOn for him. Returns true when it took the stamp. */
export function* tgHankoOn(s: BattleScene, u: PartyUnit, skill: string, e: EnemyUnit, j: Judge): Co<boolean> {
  if (e.id !== 'boss_tsugao') return false;
  if (skill === 'skill_minna_hanamaru') {
    yield* minna(s, u, e, j);
    return true;
  }
  if (skill === 'skill_mimashita') {
    // (his 40 years are no secret: the watch is still at noon)
    yield* s.say(X(e).mimashita ?? []);
    return false;
  }
  if (skill === 'skill_hanamaru') {
    // the はなまる on him: a little of the black goes white (half in the first part)
    const img = hanamaruFrame(24, 1, j === 'kasure', 1);
    s.sfx('se_stamp');
    s.hitstop(j === 'kukkiri' ? 8 : 4);
    s.addFx({ layer: 'world', dur: 700, draw: (g, t) => g.alpha(t > 500 ? (700 - t) / 200 : 1, () => g.img(img, Math.round(e.coreX - 12), Math.round(e.coreY - 22))) });
    s.petals(e.coreX, e.coreY - 10, 8, 14, false);
    const k = j === 'kukkiri' ? 1.5 : j === 'futsuu' ? 1 : 0.7;
    hurtEnemy(s, e, Math.round((20 + u.m.atk) * k), { noNumber: true });
    yield 400;
    return true;
  }
  return false;
}

/** 61 14.6・60 10.27: みんなの はなまる — the black falls apart; ツガオ's last words; おつかれさま でした！ */
function* minna(s: BattleScene, _u: PartyUnit, e: EnemyUnit, j: Judge): Co {
  const b = board(s);
  const seal = minnaSeal(b);
  // the big round seal drops onto his chest
  const x = e.coreX;
  const y = e.coreY - 6;
  const st = { p: 0, on: true };
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g) => {
      if (!st.on) return;
      const sc = 1.6 - 0.6 * ease.cubicIn(st.p);
      const w = seal.width * sc;
      g.alpha(Math.min(1, st.p * 3), () => g.ctx.drawImage(seal, Math.round(x - w / 2), Math.round(y - w / 2), Math.round(w), Math.round(w)));
    },
  });
  for (let i = 1; i <= 8; i++) {
    st.p = i / 8;
    yield null;
  }
  s.hitstop(20);
  s.flash('#FFF6D8', 0.6, 3);
  s.sfx('se_stamp_heavy', { pitch: 0.9 });
  s.sfx('se_c3_minna_hanamaru');
  for (let i = 0; i < Math.min(12, b.drawn); i++) {
    const at = i * 60;
    s.run(
      (function* () {
        yield at;
        s.sfx('se_c3_draw', { who: b.people[i]?.id, count: i + 1, vol: 0.6 });
      })(),
    );
  }
  if (j === 'kukkiri') {
    // the petals of everyone's はなまる (one each, up to 24 + the three)
    const cols = [...b.people.map((p) => p.color), '#E23B2E', '#4AA8E0', '#8A5A2A'].slice(0, 27);
    cols.forEach((c, i) =>
      s.burst(rng.range(20, 364), -6, { count: 1, speed: [20, 60], angle: [Math.PI * 0.3, Math.PI * 0.7], life: [1200, 1600], colors: [c], gravity: 40, drag: 0.6, shape: 'sq', size: [2, 3], sizeEnd: 2, delay: [i * 20, i * 20 + 200] }, true),
    );
  }
  yield 500;
  fx.done = true;
  st.on = false;
  // the seal stays on him, small
  const small = hanamaruFrame(24, 1, false, 1);
  s.addFx({ layer: 'world', dur: 0, draw: (g) => g.img(small, Math.round(x - 12), Math.round(y - 12)) });
  yield* s.say(X(e).minna ?? []);
  // the gauge's black cracks and falls; the board's marks light up, each in its own colour.
  // (60 10.27 from the black seal falling — ツガオの 2行、「おつかれさま でした！」、すわる — is E's, on the field)
  e.params.gaugeBreak = s.t;
  s.sfx('se_part_break', { vol: 0.6 });
  b.colour = s.t;
  yield 1400;
  stopBgm(3.0);
  s.memo.ch3Won = 1;
  s.memo.tgFinal = 1;
  e.mem.settled = 1;
}

/** One はなまる drawn: its owner's little sound, their voice into the song, the count (A, 63). */
function drawSound(s: BattleScene, who: string, n: number): void {
  s.sfx('se_c3_draw', { who, count: n });
  const v = who === 'shun' || who === 'gusokkun' ? who : who === 'yakisoban' ? 'maruyama' : SPEAKERS[who]?.voice;
  if (v) addVoiceLayer(v);
  s.setMusicParam('yobu', n);
}

/** The ending of the last battle: no results, no black — the hall's blue (61 14.6). */
export function* tgWinFinish(s: BattleScene): Co<BattleResult> {
  const b = board(s);
  setFlag('flag_ch3_yobu_n', b.people.length);
  setFlag('flag_ch3_boss_phase', 0);
  s.setMusicParam('yobu', 0);
  s.cmd = null;
  s.list = null;
  s.msg.clearStatic();
  const t0 = s.t;
  while (s.t - t0 < 600) {
    s.tint = { color: '#1E3A5A', alpha: Math.min(1, (s.t - t0) / 600) };
    yield null;
  }
  for (const u of s.party) {
    u.m.status = {};
    u.guard = false;
  }
  s.hideAll = true;
  s.transitionDraw = (g) => g.clear('#1E3A5A');
  game.fadeColor = '#1E3A5A';
  game.fadeAlpha = 1;
  if (s.prevSpace) setSpace(s.prevSpace);
  return 'win';
}

// ---- the commands -----------------------------------------------------------------------------------

/** commandIcons' word: しゅん's icons in the second part / the finale; null = as usual. */
export function tgIcons(s: BattleScene, u: PartyUnit): { id: string; name: string; sub?: string; dim?: boolean }[] | null {
  if (!tgFind(s) || u.id !== 'minato') return null;
  const ph = tgPhase(s);
  if (ph === 3) return [{ id: 'minna', name: 'みんなの はなまる' }];
  if (ph === 2) return [{ id: 'tataku', name: 'たたく' }, { id: 'hanko', name: 'ハンコ' }, { id: 'item', name: 'もちもの' }, { id: 'guard', name: 'まもる' }, { id: 'yobu', name: 'よぶ' }];
  return null;
}

/** inputCommands: in the second part グソっ君 and ヤキソバン wait by the board. */
export function tgWaits(s: BattleScene, u: PartyUnit): boolean {
  return !!tgFind(s) && tgPhase(s) >= 2 && u.id !== 'minato';
}

// ---- the round --------------------------------------------------------------------------------------

export function* tgRoundStart(s: BattleScene): Co {
  const e = tgFind(s);
  if (!e) return;
  void flag;
}

// ---- drawing ----------------------------------------------------------------------------------------

/** The board's place blown up (2段目): 128×80 at (128,70) — 62 11.8 says y44; it sits lower so his face shows over it. */
const BX = 128;
const BY = 70;
const BW = 128;
const BH = 80;

/** Behind the people: the shadows on the tank's glass, the light from the hall's door. */
export function tgDrawBack(s: BattleScene, g: Gfx): void {
  const b = boards.get(s);
  if (!b || !tgFind(s)) return;
  // the door's light (screen left) reaches a little further with each call
  if (b.callsDone > 0) {
    const reach = Math.min(1, b.callsDone / 4);
    for (let i = 0; i < 6; i++) g.rect(0, 120 + i * 6, Math.round(40 + 260 * reach * (1 - i * 0.1)), 6, '#FFE7A3', 0.05 + 0.03 * reach);
  }
  for (const sh of b.shadows) {
    const img = shadowOf(sh.id);
    const a = Math.min(1, (s.t - sh.t) / 300);
    g.alpha(0.55 * a, () => g.ctx.drawImage(img, sh.x, sh.y - img.height * 2, img.width * 2, img.height * 2));
  }
  // the board on his back (behind him) in the first part
  const e = tgFind(s);
  if (e && b.front < 0.5) drawBoard(s, g, e, b);
}

/** Over the enemies: the gauge (1段目), the board, the people who came. */
export function tgDrawOver(s: BattleScene, g: Gfx, gauge: (g: Gfx, e: EnemyUnit) => void): void {
  const e = tgFind(s);
  const b = boards.get(s);
  if (!e || !b) return;
  if (tgPhase(s) === 1) gauge(g, e);
  // the people in their rows stand behind the board (it stays readable); the ones on their way, before it
  const settled = (w: Walker) => w.cell >= 0 && s.t - w.t0 >= 750;
  const list = [...b.walkers].sort((a, c) => a.ry - c.ry);
  for (const w of list) if (settled(w)) drawWalker(s, g, w);
  if (b.front >= 0.5) drawBoard(s, g, e, b);
  for (const w of list) if (!settled(w)) drawWalker(s, g, w);
}

function drawBoard(s: BattleScene, g: Gfx, e: EnemyUnit, b: Board): void {
  const f = b.front;
  // on his back: 64×48 at 0.7, up and left of his shoulders; in front: 128×80 in the middle
  const sx = e.x - 34 - 14;
  const sy = e.top + 18;
  const w = Math.round(45 + (BW - 45) * f);
  const h = Math.round(34 + (BH - 34) * f);
  const x = Math.round(sx + (BX - sx) * f);
  const y = Math.round(sy + (BY - sy) * f);
  const img = boardImg(s, b);
  g.ctx.drawImage(img, x, y, w, h);
  // the peeled 『まだ』 (こそげる): a black flake spins down
  if (e.params.kairanPeel && s.t - e.params.kairanPeel < 600) {
    const p = (s.t - e.params.kairanPeel) / 600;
    g.rect(Math.round(x + w / 2 + Math.sin(p * 12) * 6), Math.round(y + h / 2 + p * 40), 4, 3, '#1B1733', 1 - p);
  }
  // the black seal falling out of his hand at the end
  if (e.params.sealDrop) {
    const p = Math.min(1, (s.t - e.params.sealDrop) / 400);
    g.img(blackSeal(), Math.round(e.x + 24), Math.round(e.coreY + 10 + p * (e.footY - e.coreY - 22)));
  }
}

/** The board, drawn at 128×80 (the cells 22×30, 2 × 5). */
function boardImg(s: BattleScene, b: Board): HTMLCanvasElement {
  const [c, ctx] = boardCanvas();
  ctx.clearRect(0, 0, BW, BH);
  const g = new Gfx(ctx, BW, BH);
  // the board, the clip at the top
  g.rect(0, 4, BW, BH - 4, '#2A2440');
  g.rect(1, 5, BW - 2, BH - 6, '#3A3350');
  g.rect(BW / 2 - 14, 0, 28, 8, '#8E95A6');
  g.rect(BW / 2 - 12, 1, 24, 2, '#C8CDD4');
  for (let i = 0; i < 10; i++) {
    const cx = 5 + (i % 5) * 24;
    const cy = 14 + Math.floor(i / 5) * 32;
    const cell = b.cells[i];
    g.rect(cx, cy, 22, 30, '#1B1733');
    const mada = madaMark(14, 12, 3 + i);
    g.alpha(0.35, () => g.img(mada, cx + 4, cy + 9));
    if (!cell) continue;
    if (cell.fill >= 0) {
      // the black goes from the bottom through a vermilion dither to white paper (300 ms)
      const p = Math.min(1, (s.t - cell.fill) / 300);
      const hh = Math.round(30 * p);
      g.rect(cx, cy + 30 - hh, 22, hh, '#F4F1E8');
      if (p < 1) for (let xx = 0; xx < 22; xx += 2) g.rect(cx + xx + ((Math.floor(s.t / 50) + xx) % 2), cy + 29 - hh, 1, 1, '#E23B2E');
    }
    const n = cell.marks.length;
    if (!n) continue;
    const cols = n <= 6 ? 2 : 3;
    const sz = n <= 6 ? 8 : n <= 12 ? 6 : 4;
    const rows = Math.ceil(n / cols);
    const gap = Math.max(0, Math.min(2, Math.floor((28 - rows * sz) / Math.max(1, rows))));
    const x0 = cx + Math.round((22 - cols * sz - (cols - 1) * 1) / 2);
    const y0 = cy + Math.round((30 - rows * sz - (rows - 1) * gap) / 2);
    cell.marks.forEach((m, k) => {
      const mx = x0 + (k % cols) * (sz + 1);
      const my = y0 + Math.floor(k / cols) * (sz + gap);
      const own = b.colour >= 0 && s.t - b.colour > 100 + k * 30;
      const img = markImg(m.mark, own ? m.color : '#E23B2E', m.rich && own, sz);
      const pop = Math.min(1, (s.t - m.t) / 150);
      const sc = 1.4 - 0.4 * pop;
      const w = sz * sc;
      g.ctx.drawImage(img, Math.round(mx + sz / 2 - w / 2), Math.round(my + sz / 2 - w / 2), Math.round(w), Math.round(w));
    });
  }
  // the board's title 「まだまだ団」 hides under the marks when they fill (the letters stay)
  return c;
}

let boardC: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
function boardCanvas(): [HTMLCanvasElement, CanvasRenderingContext2D] {
  boardC ??= makeCanvas(BW, BH);
  return boardC;
}

function drawWalker(s: BattleScene, g: Gfx, w: Walker): void {
  const t = s.t - w.t0;
  let x: number;
  let y: number;
  let dir: 'up' | 'down' = 'up';
  let moving = true;
  if (w.cell >= 0) {
    const [cx, cy] = cellCentre(w.cell);
    const fy = cy + 22;
    // up from under the screen to the board (250 ms), the hand (200 ms), then down to the row (300 ms)
    if (t < 250) {
      const p = ease.quadOut(t / 250);
      x = cx;
      y = 236 + (fy - 236) * p;
    } else if (t < 450) {
      x = cx;
      y = fy;
      moving = false;
    } else if (t < 750) {
      const p = ease.quadInOut((t - 450) / 300);
      x = cx + (w.rx - cx) * p;
      y = fy + (w.ry - fy) * p;
      dir = 'down';
    } else {
      x = w.rx;
      y = w.ry;
      dir = 'up';
      moving = false;
    }
  } else {
    // ④: out of their panels, up beside the board
    const [px, py] = PANEL_POS[w.sprite === 'minato' ? 'minato' : w.sprite === 'kanenari' ? 'kanenari' : 'yakisoban'] ?? [192, 150];
    const p = Math.min(1, t / 400);
    x = px + 40 + (w.rx - px - 40) * p;
    y = py + 40 + (w.ry - py - 40) * ease.quadOut(p);
    moving = p < 1;
  }
  const sp = charSprite(w.sprite);
  const img = walkFrame(sp, dir, moving ? t : 0);
  const draw = () => g.img(img, Math.round(x - img.width / 2), Math.round(y - img.height));
  if (w.back) g.alpha(0.85, draw);
  else draw();
  // the hand at the board: a little vermilion line
  if (w.cell >= 0 && t >= 250 && t < 450) g.rect(Math.round(x - 1), Math.round(y - img.height - 4), 2, 4, w.p?.color ?? '#E23B2E');
}

const shadowCache = new Map<string, HTMLCanvasElement>();
function shadowOf(id: string): HTMLCanvasElement {
  let c = shadowCache.get(id);
  if (c) return c;
  const src = walkFrame(charSprite(id), 'down', 0);
  const [cv, ctx] = makeCanvas(src.width, src.height);
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-in';
  ctx.fillStyle = '#0E2236';
  ctx.fillRect(0, 0, src.width, src.height);
  c = cv;
  shadowCache.set(id, c);
  return c;
}

// ---- the little はなまる of each person (60 3.4「よぶ：はなまるの絵」) -----------------------------------

const markCache = new Map<string, HTMLCanvasElement>();
/** A hand-drawn はなまる (size 4/6/8) in the person's colour, with a hint of their tool inside. */
export function markImg(mark: YobuMark, color: string, rich: boolean, size: number): HTMLCanvasElement {
  const key = `${mark}:${color}:${rich}:${size}`;
  let c = markCache.get(key);
  if (c) return c;
  const p = new PixelCanvas(size, size);
  const r = size / 2 - 0.5;
  const cx = (size - 1) / 2;
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const d = Math.hypot(x - cx, y - cx);
      if (d <= r + 0.3 && d > r - 1.1) p.set(x, y, color);
    }
  if (size >= 6) {
    // the swirl in the middle, and the tool's mark
    const m = Math.floor(cx);
    p.set(m, m, color);
    p.set(m + 1, m, color);
    p.set(m + 1, m + 1, color);
    const acc = rich ? '#F2C84B' : color;
    switch (mark) {
      case 'hoshi':
        p.set(m, m - 1, acc);
        p.set(m - 1, m, acc);
        break;
      case 'tomato':
      case 'tomato_dan':
        p.set(m, 0, '#5A8A3A');
        p.set(m + 1, 0, '#5A8A3A');
        break;
      case 'tofu':
        p.set(m - 1, m - 1, acc);
        p.set(m, m - 1, acc);
        break;
      case 'tokei':
        p.set(m, m - 1, acc);
        p.set(m, m - 2, acc);
        break;
      case 'mikan':
        p.set(m - 1, m + 1, acc);
        p.set(m + 1, m - 1, acc);
        break;
      case 'umi':
        p.set(m - 1, m + 1, acc);
        p.set(m + 2, m + 1, acc);
        break;
      default:
        p.set(m - 1, m - 1, acc);
    }
  }
  if (rich && size >= 8) {
    // the detour done: a second line in another colour (61 14.4)
    p.set(0, Math.floor(cx), '#F2C84B');
    p.set(size - 1, Math.floor(cx), '#F2C84B');
    p.set(Math.floor(cx), size - 1, '#F2C84B');
  }
  c = p.toCanvas();
  markCache.set(key, c);
  return c;
}

/** 6.3: the big round seal 「みんなの はなまる」 (96×96): everyone's marks round it, しゅん's in the middle. */
function minnaSeal(b: Board): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(96, 96);
  ctx.strokeStyle = '#E23B2E';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(48, 48, 45, 0, Math.PI * 2);
  ctx.stroke();
  const list = b.people.length ? b.people : [];
  const n = Math.max(1, list.length);
  list.forEach((pp, i) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    ctx.drawImage(markImg(pp.mark, pp.color, pp.rich, 8), Math.round(48 + Math.cos(a) * 32 - 4), Math.round(48 + Math.sin(a) * 32 - 4));
  });
  ctx.drawImage(hanamaruFrame(24, 1, false, 1), 36, 36);
  return c;
}

// ---- the command icons (16×16): よぶ (a voice going out), みんなの はなまる -------------------------------

CMD_ICONS.yobu = [
  '................',
  '...........r....',
  '..kkkk......r...',
  '.kiiiik..r...r..',
  'kiiiiiik..r..r..',
  'kiJiiiikk..r..r.',
  'kiiiiiIIk..r..r.',
  'kiiiiiIIIk.r..r.',
  'kiiiiiIIk..r..r.',
  'kiiiiiik..r..r..',
  '.kiiiik..r...r..',
  '..kkkk......r...',
  '...........r....',
  '................',
  '................',
  '................',
];
CMD_ICONS.minna = [
  '.....u....m.....',
  '....kkkkkkkk....',
  '..kkrrrrrrrrkk..',
  '.krrkkkkkkkkrrkp',
  'krrkwwwwwwwwkrrk',
  'krkwwrrrrrrwwkrk',
  'okkwrwwwwwwrwkrk',
  'krkwrwwrrwwrwkrk',
  'krkwrwwwrwwrwkko',
  'krkwwrrrrwwrwkrk',
  'krrkwwwwwwrwkrrk',
  '.krrkkkkkkkkrrk.',
  's.kkrrrrrrrrkk..',
  '....kkkkkkkk...v',
  '......j.........',
  '................',
];
