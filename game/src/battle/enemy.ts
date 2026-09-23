// Enemy actions (9.4, 10.3, 11, 16.6–16.7): telegraph text → wind-up →
// "！" → frame-exact tsukkomi windows → hit(s) → results.

import type { Co } from '../engine/co';
import { flag, setFlag } from '../game/state';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { fillAll, getEnemy, getSkill, SYS, type SkillDef } from '../data/battle';
import type { AiCtx } from '../data/battle/types';
import type { BattleScene } from './scene';
import { FRAME, SLOTS } from './scene';
import { calcDamage, EnemyUnit, statusChance, type PartyUnit } from './model';
import {
  addKire, changeStage, giveStatus, hideSticky, healParty, hurtEnemy, hurtParty, showSticky, statusText, tsukkomiFeel, type Guarded,
} from './common';
import {
  bokemakeLabel, markLineSeen, pickLine, popBang, showBang, showFlip, showKakimoji, tsukkomiUnit, tsukkomiWindows,
} from './tsukkomi';
import { coin, glove, meishiCard, note, uwabaki, waterDrop, feather, spring, drawArc } from './art/fxart';
import { PANEL_POS } from './ui/panels';
import { C } from './ui/note';

// ---- AI --------------------------------------------------------------------------------

export function aiContext(s: BattleScene, e: EnemyUnit, round: number): AiCtx {
  return {
    round,
    hpRate: e.hpRate,
    mem: e.mem,
    shared: s.shared,
    sameCount: s.aliveEnemies.filter((o) => o.id === e.id).length,
    enemyCount: s.aliveEnemies.length,
    mimasareta: e.mimaEver,
    atkStage: e.stages.atk.lv,
    targets: s.party.filter((u) => u.targetable).map((u) => ({ id: u.id, hpRate: u.hpRate, grabbed: u.has('status_tsukamare'), canAct: u.canAct })),
    has: (st: string) => !!(e.status as Record<string, unknown>)[st.replace('status_', '')] || (st === 'status_hiraki' && !!e.status.hiraki) || (st === 'status_tame' && !!e.status.tame),
    pick: (table) => pickWeighted(e, table),
  };
}

function pickWeighted(e: EnemyUnit, table: [string, number][]): string {
  const last2 = e.lastSkills.slice(-2);
  const tripled = (id: string) => last2.length === 2 && last2[0] === id && last2[1] === id;
  let t = table.filter(([id, w]) => w > 0 && !tripled(id));
  if (!t.length) t = table.filter(([, w]) => w > 0);
  if (!t.length) return 'skill_idle';
  return rng.weighted(t);
}

export function decideEnemy(s: BattleScene, e: EnemyUnit, round: number): string {
  const id = e.def.ai(aiContext(s, e, round));
  return id;
}

// ---- targets ---------------------------------------------------------------------------

function targetable(s: BattleScene): PartyUnit[] {
  return s.party.filter((u) => u.targetable);
}

function pickTarget(s: BattleScene, e: EnemyUnit, sk: SkillDef): PartyUnit | undefined {
  const list = targetable(s);
  if (!list.length) return undefined;
  if (sk.id === 'skill_momi_momi') return [...list].sort((a, b) => b.hpRate - a.hpRate)[0];
  if (sk.id === 'skill_kasa_dakitsuki') {
    const free = list.filter((u) => !u.has('status_tsukamare'));
    if (free.length) return rng.pick(free);
  }
  if (sk.id.startsWith('skill_kn_')) return s.minato;
  if (sk.target === 'kanenari') return s.kanenari && s.kanenari.targetable ? s.kanenari : undefined;
  return rng.pick(list);
}

// ---- generic hit loop -------------------------------------------------------------------

export interface HitRes {
  res: Guarded | 'miss';
  /** Resolved frame (relative to the windup start). */
  f: number;
}

export interface LoopOpts {
  /** Frames from windup start to the first hit. */
  windupF: number;
  /** Intervals (frames) before each subsequent hit; [0] for a single hit. */
  hits: number[];
  /** Panels that get the "!" for hit i. */
  bang: (i: number) => PartyUnit[];
  /** Tsukkomi allowed at all. */
  tsukkomi: boolean;
  onFrame?: (f: number, hitIndex: number, framesToHit: number) => void;
  onHit: (i: number, r: Guarded | null) => Co | void;
  /** Tutorial freeze at hit −8f (the very first tsukkomi). */
  tutorial?: boolean;
}

/**
 * Frame-accurate wind-up + hits with the tsukkomi windows of 10.3. Returns the
 * per-hit results.
 */
export function* hitLoop(s: BattleScene, o: LoopOpts): Co<(Guarded | null)[]> {
  const W = tsukkomiWindows();
  const hitFrames: number[] = [];
  let acc = o.windupF;
  o.hits.forEach((iv, i) => {
    acc += i === 0 ? 0 : Math.max(14, iv);
    hitFrames.push(acc);
  });
  const results: (Guarded | null)[] = [];
  let hi = 0;
  let pending: Guarded = null;
  let kabuse = false;
  let bangShown = false;
  let bangDone = false;
  let frozenTut = false;
  s.takeConfirm();
  for (let f = 0; hi < hitFrames.length; f++) {
    const hf = hitFrames[hi];
    const rel = f - hf;
    if (o.tsukkomi && !bangShown && rel >= W.show) {
      bangShown = true;
      bangDone = false;
      const who = o.bang(hi);
      s.sfx('se_warn');
      showBang(s, who, () => bangDone, !!o.tutorial);
    }
    if (o.tutorial && rel === -8 && !frozenTut) {
      // time stops; the "!" pulses until the player presses (counts as just)
      frozenTut = true;
      showSticky(s, 'tsukkomi', 'flag_tut_tsukkomi', true);
      s.takeConfirm();
      while (!s.takeConfirm() && !s.auto.tsuk) {
        yield null;
      }
      hideSticky(s);
      pending = 'just';
      popBang(s, o.bang(hi), true);
      bangDone = true;
    }
    let pressed = s.takeConfirm();
    const at = s.auto.tsuk;
    if (at === 'just' && rel === -1) pressed = true;
    if (at === 'ok' && rel === -8) pressed = true;
    if (at === 'kabuse' && rel === W.from - 5) pressed = true;
    if (o.tsukkomi && pressed && !pending && !kabuse) {
      if (rel < W.from) {
        kabuse = true;
        s.sfx('se_kabuse');
        const [px, py] = PANEL_POS[o.bang(hi)[0]?.id ?? 'minato'];
        s.label('かぶせた……', px + 68, py - 14, 'gray', 700, true);
      } else if (rel <= W.to) {
        pending = rel >= W.justFrom && rel <= W.justTo ? 'just' : 'ok';
        popBang(s, o.bang(hi), pending === 'just');
        bangDone = true;
      }
    }
    o.onFrame?.(f, hi, hf - f);
    let resolve = false;
    let r: Guarded | null = null;
    if (rel >= 0 && pending) {
      resolve = true;
      r = pending;
    } else if (rel >= W.to + 1 || (!o.tsukkomi && rel >= 0)) {
      resolve = true;
      r = null;
    }
    if (resolve) {
      bangDone = true;
      results.push(r);
      const co = o.onHit(hi, r);
      if (co) yield* co;
      hi++;
      pending = null;
      kabuse = false;
      bangShown = false;
    }
    yield null;
  }
  return results;
}

// ---- small visual helpers ------------------------------------------------------------------

/** A sprite flies from (x0,y0) toward a panel while growing, arriving at the hit. */
function projectile(s: BattleScene, img: () => HTMLCanvasElement, x0: number, y0: number, to: PartyUnit | null, frames: number, s0: number, s1: number, arc = 0): void {
  const [px, py] = to ? PANEL_POS[to.id] : [192, 170];
  const tx = to ? px + 68 : 192;
  const ty = to ? py - 6 : 150;
  s.addFx({
    layer: 'top',
    dur: frames * FRAME,
    draw: (g, t) => {
      const p = Math.min(1, t / (frames * FRAME));
      const k = ease.quadIn(p);
      const x = x0 + (tx - x0) * k;
      const y = y0 + (ty - y0) * k - Math.sin(p * Math.PI) * arc;
      const sc = s0 + (s1 - s0) * k;
      const im = img();
      const w = im.width * sc;
      const h = im.height * sc;
      g.ctx.drawImage(im, Math.round(x - w / 2), Math.round(y - h / 2), Math.round(w), Math.round(h));
    },
  });
}

/** Lunge toward the camera: scale 1 → k → 1. */
function lunge(s: BattleScene, e: EnemyUnit, k: number, frames: number): void {
  s.addFx({
    layer: 'back',
    dur: frames * FRAME * 2,
    draw: () => {},
    update() {
      const p = this.t / (frames * FRAME);
      const v = p < 1 ? ease.quadOut(p) : 1 - ease.quadIn(Math.min(1, p - 1));
      e.sx = e.sy = 1 + (k - 1) * v;
      if (this.t >= frames * FRAME * 2 - 1) e.sx = e.sy = 1;
    },
  });
}

/** Expanding elliptical sound rings from a point. */
function soundRings(s: BattleScene, x: number, y: number, color: string, n: number, alpha = 0.6, ms = 600): void {
  for (let i = 0; i < n; i++) {
    const d = i * 140;
    s.addFx({
      layer: 'world',
      dur: ms + d,
      draw: (g, t) => {
        if (t < d) return;
        const p = (t - d) / ms;
        g.alpha(alpha * (1 - p), () => {
          const r = 6 + p * 60;
          for (let a = 0; a < 64; a++) {
            const an = (a / 64) * Math.PI * 2;
            g.px(Math.round(x + Math.cos(an) * r), Math.round(y + Math.sin(an) * r * 0.6), color);
            g.px(Math.round(x + Math.cos(an) * (r + 1)), Math.round(y + Math.sin(an) * (r + 1) * 0.6), color);
          }
        });
      },
    });
  }
}

/** Screen chromatic aberration (miin): short red/cyan split of the whole frame. */
function screenAberration(s: BattleScene, ms: number): void {
  s.addFx({
    layer: 'top',
    dur: ms,
    ui: true,
    draw: (g) => {
      g.alpha(0.12, () => {
        g.rect(0, 0, 384, 216, '#FF3030');
      });
    },
  });
}

// ---- common hit resolution ----------------------------------------------------------------

function damageTo(s: BattleScene, e: EnemyUnit, t: PartyUnit, power: number, r: Guarded | null, stack = 0, scatter = false): number {
  const dmg = calcDamage({
    atk: e.def.atk,
    atkStage: e.stages.atk.lv,
    def: t.m.def,
    defStage: t.stages.def.lv,
    power,
    guard: t.guard,
    tsukkomi: !!r,
  });
  hurtParty(s, t, dmg, { tsukkomi: r, stack, scatter });
  return dmg;
}

interface ActState {
  anySuccess: boolean;
  lastJust: boolean;
  lastLine: number;
  results: (Guarded | null)[];
}

/** Tsukkomi aftermath (bokemake, kire, lettering) once the move's hits are done. */
function* tsukkomiAftermath(s: BattleScene, e: EnemyUnit, sk: SkillDef, st: ActState): Co {
  if (!st.anySuccess) {
    if (e.id === 'enemy_hato_kakaricho' && s.memo.tsukCount >= 1 && !s.memo.rhythmTip) {
      s.memo.rhythmTip = 1;
      showSticky(s, 'rhythm', undefined, false, 2800);
    }
    return;
  }
  if (e.alive) {
    const first = !s.memo.bokeTut && e.id === 'enemy_hato_kakaricho';
    e.status.bokemake = true;
    bokemakeLabel(s, e, first);
    s.memo.bokeTut = 1;
  }
  addKire(s, 1 + (st.lastJust ? 1 : 0));
  s.memo.tsukCount = (s.memo.tsukCount ?? 0) + 1;
  if (s.memo.kireJustFull && !flag('flag_tut_kire')) {
    s.memo.kireJustFull = 0;
    setFlag('flag_tut_kire', 1);
    showSticky(s, 'kire', undefined, false, 3200);
  }
  void sk;
}

function lineFor(s: BattleScene, e: EnemyUnit, sk: SkillDef, st: ActState): { n: number; text: string } {
  let linked = sk.tsukkomi;
  if (sk.id === 'skill_souji_dansa' && e.mem.dansaFail) linked = undefined;
  if (sk.id === 'skill_ojigi_otsuri' && !st.lastJust && st.results[st.results.length - 1] === null) linked = sk.tsukkomi;
  const n = pickLine(s, e, sk.id, linked);
  return { n, text: e.def.tsukkomi[n - 1] ?? '' };
}

/** Show the lettering for the move (Minato's inner voice, or Kanenari's flip). */
function letter(s: BattleScene, e: EnemyUnit, sk: SkillDef, st: ActState): void {
  const tu = tsukkomiUnit(s);
  const { n, text } = lineFor(s, e, sk, st);
  st.lastLine = n;
  if (!text) return;
  markLineSeen(s, e, n);
  s.memo['used_' + sk.id] = 1;
  if (tu?.id === 'kanenari') showFlip(s, text);
  else showKakimoji(s, text, st.lastJust);
}

// ---- the move runner ----------------------------------------------------------------------

export function* doEnemyAction(s: BattleScene, e: EnemyUnit, skillId: string, extra = false): Co {
  if (!e.alive) return;
  const sk = getSkill(skillId);
  if (!sk) return;
  e.lastSkills.push(skillId);
  if (e.lastSkills.length > 4) e.lastSkills.shift();
  const eventKn = e.id === 'enemy_kanenari';
  const tu = tsukkomiUnit(s);
  const canTsuk = !eventKn && !!tu;
  const target = sk.target === 'enemy' || sk.target === 'kanenari' ? pickTarget(s, e, sk) : undefined;
  if ((sk.target === 'enemy' || sk.target === 'kanenari') && !target) {
    if (sk.target === 'kanenari') {
      // よいこは with nobody to send home: falls back to a plain move
      yield* doEnemyAction(s, e, 'skill_omu_tebukuro');
    }
    return;
  }
  const all = targetable(s);
  const st: ActState = { anySuccess: false, lastJust: false, lastLine: 0, results: [] };
  const bangSelf = () => (tu ? [tu] : []);
  const bang = (i: number): PartyUnit[] => {
    if (sk.target === 'allies') return all;
    if (sk.target === 'self' || sk.target === 'none') return bangSelf();
    if (sk.id === 'skill_ojigi_otsuri') return [otsuriTargets[i] ?? all[0]];
    return target ? [target] : bangSelf();
  };
  const otsuriTargets: PartyUnit[] = [];
  if (sk.id === 'skill_ojigi_otsuri') for (let i = 0; i < 5; i++) otsuriTargets.push(rng.pick(all));

  // 1. telegraph (the boke) — text keeps typing while the wind-up plays
  let tele = e.def.texts.tele[skillId] ?? [];
  if (skillId === 'skill_idle') {
    e.mem.idleN = ((e.mem.idleN ?? -1) + 1) % Math.max(1, e.def.texts.idle.length);
    tele = e.def.texts.idle[e.mem.idleN] ?? [];
  }
  if (skillId === 'skill_semi_shindafuri' && e.mem.shindafuriShown) tele = [];
  if (skillId === 'skill_semi_shindafuri') e.mem.shindafuriShown = 1;
  s.msg.replace(tele.slice(0, 1));
  const telePages = tele.slice(1);
  if (sk.big) for (const u of s.party) u.moodHold = 'surprised';
  if (sk.id === 'skill_kn_pose') e.params.pose = rng.int(0, 2);
  yield 250;

  // 2. wind-up → hits
  const windupF = Math.max(6, Math.round((sk.windupMs ?? 400) / FRAME));
  e.setPose('windup', skillId);
  const tutorial = e.id === 'enemy_hato_kakaricho' && skillId === 'skill_hato_meishi' && !flag('flag_tut_tsukkomi') && canTsuk;
  const hits = sk.hits ?? [0];
  const resolveGuard = (r: Guarded | null, i: number) => {
    st.results.push(r);
    if (r) {
      st.anySuccess = true;
      tsukkomiFeel(s, tu, r === 'just');
    }
    st.lastJust = i === hits.length - 1 ? r === 'just' : st.lastJust;
  };

  const common = {
    windupF,
    hits,
    bang,
    tsukkomi: canTsuk,
    tutorial,
  };

  switch (skillId) {
    // ---- ハト係長 --------------------------------------------------------------
    case 'skill_hato_meishi': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (toHit === 12) {
            e.setPose('attack', skillId);
            projectile(s, meishiCard, e.coreX - 14, e.coreY - 8, target!, 12, 1, 3);
            s.sfx('se_meishi');
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, target!, 0.6, r);
        },
      });
      break;
    }
    case 'skill_hato_kaigi': {
      s.sfx('se_coo');
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 20) s.sfx('se_coo', { pitch: 1.1 });
          if (toHit === 4) e.setPose('attack', skillId);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx(r ? 'se_bishi' : 'se_status');
          if (!r) target!.shakeT = 120;
        },
      });
      if (st.anySuccess) telePages.push(...e.def.texts.extra.kaigiGuard);
      else telePages.push(...changeStage(s, target!, 'hit', -1, 3, true), ...fillAll(e.def.texts.extra.kaigiResult, { target: target!.name }));
      break;
    }
    case 'skill_hato_teiji': {
      yield* selfMove(s, common, resolveGuard, () => e.setPose('attack', skillId));
      telePages.push(...e.def.texts.extra.teijiResult);
      break;
    }
    // ---- セミファイナル --------------------------------------------------------
    case 'skill_semi_shindafuri': {
      e.status.shindafuri = true;
      e.setPose('dead');
      yield* selfMove(s, { ...common }, resolveGuard, () => {
        e.setPose('twitch');
      });
      e.setPose('dead');
      break;
    }
    case 'skill_semi_final': {
      e.status.shindafuri = false;
      s.sfx('se_semi_buzz');
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 6) {
            e.setPose('attack', skillId);
            lunge(s, e, 1.15, 6);
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, target!, 0.45, r, i);
          s.sfx('se_semi_buzz', { pitch: 1 + i * 0.1 });
        },
      });
      telePages.push(...e.def.texts.extra.finalResult);
      break;
    }
    case 'skill_semi_miin': {
      e.status.shindafuri = false;
      s.sfx('se_semi_miin');
      yield* hitLoop(s, {
        ...common,
        onFrame: (f) => {
          if (f % 12 === 0) soundRings(s, e.coreX + 10, e.coreY, '#F7C27A', 1, 0.6, 500);
          if (f === 0) screenAberration(s, 500);
        },
        onHit: (i, r) => resolveGuard(r, i),
      });
      telePages.push(...e.def.texts.extra.miinResult);
      telePages.push(...applyStatusAll(s, all, sk, st));
      break;
    }
    // ---- コーン・ボーカル -------------------------------------------------------
    case 'skill_cone_nessho': {
      s.sfx('se_cone_sing');
      yield* hitLoop(s, {
        ...common,
        onFrame: (f) => {
          if (f % 10 === 0) {
            soundRings(s, e.x, e.headY + 6, '#F7C27A', 1, 0.55, 500);
            projectile(s, () => note(f % 20 ? 0 : 1), e.x + rng.int(-8, 8), e.headY + 4, rng.pick(all), 18, 1, 2, 12);
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t, k) => damageTo(s, e, t, 0.5, r, k * 0));
        },
      });
      telePages.push(...e.def.texts.extra.nesshoResult);
      telePages.push(...applyStatusAll(s, all, sk, st));
      break;
    }
    case 'skill_cone_tsukodome': {
      s.sfx('se_siren');
      yield* hitLoop(s, {
        ...common,
        onHit: (i, r) => {
          resolveGuard(r, i);
          if (!r) target!.shakeT = 120;
        },
      });
      if (st.anySuccess) telePages.push(...fillAll(e.def.texts.extra.tsukodomeGuard, { target: target!.name }));
      else telePages.push(...applyStatusOne(s, target!, sk, st));
      break;
    }
    case 'skill_cone_konkon': {
      yield* selfMove(s, common, resolveGuard, () => {
        s.sfx('se_cone_tap');
        e.setPose('attack', skillId);
      }, (f) => {
        if (f === 6) s.sfx('se_cone_tap', { pitch: 0.9 });
      });
      const called = yield* callCone(s);
      telePages.push(...(called ? e.def.texts.extra.konkonOk : e.def.texts.extra.konkonFail));
      break;
    }
    // ---- ワスレガサ ---------------------------------------------------------------
    case 'skill_kasa_dakitsuki': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 8) {
            e.setPose('attack', skillId);
            lunge(s, e, 1.2, 8);
            s.sfx('se_hug');
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          if (!r) target!.shakeT = 160;
        },
      });
      if (st.anySuccess) telePages.push(...fillAll(e.def.texts.extra.dakitsukiGuard, { target: target!.name }));
      else telePages.push(...applyStatusOne(s, target!, sk, st));
      break;
    }
    case 'skill_kasa_hiraku': {
      yield* selfMove(s, common, resolveGuard, () => {
        s.sfx('se_umbrella_open');
        e.status.hiraki = 3;
        e.setPose('open');
      });
      break;
    }
    case 'skill_kasa_shizuku': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 14) projectile(s, waterDrop, e.x - 8 + rng.int(0, 16), e.top + e.sizeH * 0.55, target!, 14, 1, 2.2, 6);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx('se_drip');
          damageTo(s, e, target!, 0.35, r, i);
        },
      });
      break;
    }
    // ---- おじぎ自販機 -------------------------------------------------------------
    case 'skill_ojigi_otsuri': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, i, toHit) => {
          if (toHit === 14 && otsuriTargets[i]) {
            e.setPose('attack', skillId);
            const img = () => coin(Math.floor(s.t / 60));
            projectile(s, img, e.coreX, e.top + 70, otsuriTargets[i], 14, 1, 2.5, 24);
            s.sfx('se_coin', { pitch: 1 + i * 0.06 });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          const t = otsuriTargets[i];
          if (t && t.alive) damageTo(s, e, t, 0.22, r, 0, true);
        },
      });
      telePages.push(...e.def.texts.extra.otsuriResult);
      break;
    }
    case 'skill_ojigi_charge': {
      yield* selfMove(s, common, resolveGuard, () => e.setPose('charge'));
      e.status.tame = 'skill_ojigi_press';
      e.setPose('charge');
      const bg = s.bg as { charging?: boolean };
      if (bg.charging !== undefined) bg.charging = true;
      break;
    }
    case 'skill_ojigi_press': {
      e.status.tame = undefined;
      const bg = s.bg as { charging?: boolean };
      if (bg.charging !== undefined) bg.charging = false;
      const shadow = { a: 0 };
      const shFx = s.addFx({ layer: 'top', dur: 0, draw: (g) => g.rect(0, 0, 384, Math.round(216 * Math.min(1, shadow.a * 1.4)), '#1B1733', 0.5 * Math.min(1, shadow.a * 2)) });
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 13) e.setPose('rise');
          if (toHit === 7) {
            e.setPose('attack', skillId);
            lunge(s, e, 1.35, 7);
          }
          if (toHit <= 7) shadow.a = Math.min(1, (7 - toHit) / 7);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx('se_ojigi_press');
          s.shake(6, 6, 14);
          all.forEach((t) => damageTo(s, e, t, 1.4, r));
        },
      });
      for (let k = 0; k < 10; k++) {
        shadow.a = 1 - k / 10;
        yield null;
      }
      shFx.done = true;
      break;
    }
    case 'skill_ojigi_roulette': {
      s.sfx('se_roulette');
      e.setPose('roulette');
      let atari = false;
      yield* selfMove(s, common, resolveGuard, () => {
        atari = rng.next() < 1 / 3;
        e.params.roulette = atari ? 2 : 1;
        s.sfx(atari ? 'se_atari' : 'se_hazure');
      });
      yield* flushAfter(s, e, sk, st, [], tu);
      yield* s.say(atari ? e.def.texts.extra.atari : e.def.texts.extra.hazure);
      e.params.roulette = 0;
      e.setPose('idle');
      if (atari && !extra && e.alive && s.party.some((u) => u.targetable)) {
        const next = e.stages.atk.lv >= 2 ? 'skill_ojigi_otsuri' : rng.weighted<string>([['skill_ojigi_otsuri', 60], ['skill_ojigi_arigatou', 40]]);
        yield* doEnemyAction(s, e, next, true);
      }
      return;
    }
    case 'skill_ojigi_arigatou': {
      s.sfx('se_vending_voice');
      yield* selfMove(s, common, resolveGuard, () => {
        e.setPose('talk');
        soundRings(s, e.coreX, e.coreY, '#E84E3C', 2, 0.3, 500);
      });
      telePages.push(...changeStage(s, e, 'atk', 1, 3));
      break;
    }
    // ---- ソウジロウ ---------------------------------------------------------------
    case 'skill_souji_teinei': {
      s.sfx('se_vacuum');
      yield* hitLoop(s, {
        ...common,
        onFrame: (f) => {
          if (f % 3 === 0) {
            const [px, py] = PANEL_POS[target!.id];
            const sx = px + 20 + rng.int(-10, 10);
            const sy = py + rng.int(0, 10);
            s.addFx({
              layer: 'top',
              dur: 400,
              draw: (g, t) => {
                const p = ease.quadIn(t / 400);
                g.px(Math.round(sx + (e.coreX - sx) * p), Math.round(sy + (e.coreY - sy) * p), '#5CE1FF');
              },
            });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          const d = damageTo(s, e, target!, 0.8, r);
          e.hp = Math.min(e.maxHp, e.hp + d);
          s.number(e.coreX, e.headY + 4, d, { kind: 'heal' });
        },
      });
      telePages.push(...fillAll(e.def.texts.extra.teineiResult, { target: target!.name }));
      break;
    }
    case 'skill_souji_dansa': {
      const ok = rng.next() < 0.5;
      e.mem.dansaFail = ok ? 0 : 1;
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 16) e.setPose('lift');
          if (toHit === 6) {
            if (ok) {
              e.setPose('attack', skillId);
              lunge(s, e, 1.3, 6);
            } else e.setPose('fall');
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          if (ok) damageTo(s, e, target!, 1.2, r);
          else {
            s.sfx('se_bump');
            hurtEnemy(s, e, 8);
            s.shake(2, 2, 6);
          }
        },
      });
      if (!ok) telePages.push(...e.def.texts.extra.dansaFail);
      break;
    }
    case 'skill_souji_juden': {
      yield* selfMove(s, common, resolveGuard, () => e.setPose('charge'));
      telePages.push(...e.def.texts.extra.judenResult);
      break;
    }
    // ---- モミスギ ---------------------------------------------------------------------
    case 'skill_momi_momi': {
      s.sfx('se_momi');
      let over = false;
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 8) {
            e.setPose('attack', skillId);
            lunge(s, e, 1.1, 8);
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          const t = target!;
          const H = e.def.atk * 2 * (1 + 0.25 * e.stages.atk.lv);
          const overflow = t.m.hp + H - t.m.maxHp;
          if (overflow > 0) {
            over = true;
            let d = Math.round(overflow * 0.8);
            if (r) d = Math.round(d / 2);
            const newHp = Math.max(0, t.m.maxHp - d);
            const loss = t.m.hp - newHp;
            if (loss > 0) hurtParty(s, t, loss, { tsukkomi: r });
            else if (loss < 0) healParty(s, t, -loss);
          } else healParty(s, t, H);
        },
      });
      if (over) telePages.push(...e.def.texts.extra.momiOver);
      else telePages.push(...fillAll(e.def.texts.extra.momiHeal, { target: target!.name }));
      if (!st.anySuccess && target!.alive && rng.next() < statusChance(0.3, target!.m.luck)) {
        giveStatus(s, target!, 'status_nemuri', rng.int(1, 2));
        telePages.push(...fillAll(e.def.texts.extra.momiSleep, { target: target!.name }));
      }
      break;
    }
    case 'skill_momi_kyou': {
      s.sfx('se_remote');
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 8) e.setPose('attack', skillId);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, target!, 1.2, r);
        },
      });
      break;
    }
    case 'skill_momi_otameshi': {
      yield* selfMove(s, common, resolveGuard, () => e.setPose('attack', skillId));
      const before = e.hp;
      e.hp = Math.min(e.maxHp, e.hp + 20);
      s.number(e.coreX, e.headY + 4, e.hp - before, { kind: 'heal' });
      s.sfx('se_heal');
      telePages.push(...e.def.texts.extra.otameshiResult);
      break;
    }
    // ---- カネナリくん（加入戦） ------------------------------------------------------
    case 'skill_kn_fuusen':
    case 'skill_kn_goaisatsu':
    case 'skill_kn_pose': {
      yield windupF * FRAME;
      e.setPose('attack', skillId);
      if (skillId === 'skill_kn_fuusen') {
        s.sfx('se_balloon');
        healParty(s, target!, 12);
        telePages.push(...e.def.texts.extra.fuusenResult);
      } else if (skillId === 'skill_kn_goaisatsu') {
        s.sfx('se_bow');
        changeStage(s, target!, 'atk', -1, 2, true);
        telePages.push(...e.def.texts.extra.goaisatsuResult);
      } else telePages.push(...e.def.texts.extra.poseResult);
      yield 300;
      break;
    }
    // ---- なにもしない --------------------------------------------------------------
    case 'skill_idle': {
      yield* selfMove(s, common, resolveGuard, () => e.setPose('idleact'));
      break;
    }
    default: {
      yield* bossMove(s, e, sk, common, resolveGuard, target, all, telePages, st);
      break;
    }
  }
  yield* flushAfter(s, e, sk, st, telePages, tu);
}

/** Lettering, kire, bokemake, then the result pages. */
function* flushAfter(s: BattleScene, e: EnemyUnit, sk: SkillDef, st: ActState, pages: string[], _tu: PartyUnit | null): Co {
  if (st.anySuccess) letter(s, e, sk, st);
  yield* tsukkomiAftermath(s, e, sk, st);
  for (const u of s.party) u.moodHold = null;
  yield 260;
  if (e.pose !== 'dead' && e.pose !== 'charge' && e.pose !== 'open') e.setPose('idle');
  if (pages.length) yield* s.say(pages.slice(0, 3));
  else yield 200;
  st.anySuccess = false;
}

/** Self-targeted move (buff, idle, call): the "!" still appears at the tsukkomi-er. */
function* selfMove(
  s: BattleScene,
  common: Omit<LoopOpts, 'onHit'>,
  resolveGuard: (r: Guarded | null, i: number) => void,
  atHit: () => void,
  onFrame?: (f: number) => void,
): Co {
  yield* hitLoop(s, {
    ...common,
    hits: [0],
    onFrame: (f) => onFrame?.(f),
    onHit: (i, r) => {
      resolveGuard(r, i);
      atHit();
    },
  });
}

function applyStatusOne(s: BattleScene, t: PartyUnit, sk: SkillDef, st: ActState): string[] {
  const a = sk.status;
  if (!a || !t.alive) return [];
  if (st.anySuccess) return fillAll(SYS.guarded, { target: t.name });
  if (a.id.startsWith('buff_')) return [];
  if (rng.next() >= statusChance(a.chance, t.m.luck)) return [];
  const turns = a.id === 'status_nemuri' ? rng.int(1, 2) : a.turns ?? 1;
  giveStatus(s, t, a.id, turns);
  return statusText(a.id, 'on', t.name);
}

function applyStatusAll(s: BattleScene, list: PartyUnit[], sk: SkillDef, st: ActState): string[] {
  const out: string[] = [];
  if (st.anySuccess) {
    if (list.length) out.push(...fillAll(SYS.guarded, { target: list.length > 1 ? 'ミナトたち' : list[0].name }));
    return out.slice(0, 1);
  }
  for (const t of list) {
    const r = applyStatusOne(s, t, sk, st);
    if (r.length) out.push(...r);
  }
  return out.slice(0, 2);
}

/** コーン・コン: a new cone drops into the rightmost free slot (max 3, twice per battle). */
function* callCone(s: BattleScene): Co<boolean> {
  const alive = s.aliveEnemies;
  if (alive.length >= 3 || (s.shared.coneCalls ?? 0) >= 2) return false;
  s.shared.coneCalls = (s.shared.coneCalls ?? 0) + 1;
  const def = getEnemy('enemy_cone_vocal')!;
  const n = alive.length + 1;
  const xs = SLOTS[n];
  const sorted = [...alive].sort((a, b) => a.x - b.x);
  sorted.forEach((e, i) => (e.xTarget = xs[i]));
  const ne = new EnemyUnit(def, xs[n - 1]);
  ne.appearT = 0;
  ne.offY = -80;
  s.enemies.push(ne);
  s.nameEnemies();
  s.sfx('se_enemy_appear');
  for (let i = 0; i <= 12; i++) {
    ne.offY = -80 + 80 * ease.bounceOut(i / 12);
    yield null;
  }
  ne.offY = 0;
  s.shake(0, 2, 6);
  s.sfx('se_cone_tap');
  return true;
}

// ---- boss moves (delegated) ------------------------------------------------------------------

import { bossMoveImpl } from './boss';

function* bossMove(
  s: BattleScene,
  e: EnemyUnit,
  sk: SkillDef,
  common: Omit<LoopOpts, 'onHit'>,
  resolveGuard: (r: Guarded | null, i: number) => void,
  target: PartyUnit | undefined,
  all: PartyUnit[],
  pages: string[],
  st: ActState,
): Co {
  yield* bossMoveImpl({ s, e, sk, common, resolveGuard, target, all, pages, damageTo, projectile, soundRings, lunge, st });
}

export type BossMoveCtx = {
  s: BattleScene;
  e: EnemyUnit;
  sk: SkillDef;
  common: Omit<LoopOpts, 'onHit'>;
  resolveGuard: (r: Guarded | null, i: number) => void;
  target: PartyUnit | undefined;
  all: PartyUnit[];
  pages: string[];
  damageTo: typeof damageTo;
  projectile: typeof projectile;
  soundRings: typeof soundRings;
  lunge: typeof lunge;
  st: ActState;
};

export { glove, uwabaki, feather, spring, drawArc, C };
