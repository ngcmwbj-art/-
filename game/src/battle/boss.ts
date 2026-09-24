// オムカエマチ (13): parts & 迷子のお知らせ, the chime counter, phase 2,
// よいこは (るす), and the final phase where the bell finally rings.

import type { Co } from '../engine/co';
import { setFlag } from '../game/state';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { muteMusic, sfx, stopBgm } from '../audio';
import { BOSS_PARTS, fillAll, SYS } from '../data/battle';
import type { BattleScene, LabelSide } from './scene';
import { STAGE_TOP } from './scene';
import { FRAME } from './scene';
import { fixedDamage, JUDGE_MUL, type BossPart, type EnemyUnit, type Judge, type PartyUnit } from './model';
import { changeStage, hurtEnemy, hurtParty, knock } from './common';
import type { BossMoveCtx } from './enemy';
import { doEnemyAction, hitLoop } from './enemy';
import { glove, uwabaki } from './art/fxart';
import { finalSeal, flutterPetals, ovalStamp } from './art/stamps';
import { kanenariBack } from '../art/enemies/kanenari';
import { bokemakeLabel } from './tsukkomi';
import { LABEL } from '../data/battle';
import { holdStamp } from './party';
import { playHankoLearnIn } from './learn';

const CHIME_NOTES = ['G4', 'A4', 'C5', 'E5']; // 13.3: one note per round end

/**
 * QA round 1 balance: ignoring まもる and ツッコミ has to hurt. The 4th chime
 * hits 25% harder than 13.3's formula (Lv3 Minato: ≈50 bare, ≈25 with a
 * tsukkomi, ≈12 with both), and every attack in phase 2 25% harder.
 */
const CHIME_MUL = 1.25;
const SUITOU_HEAL = 40;
const PHASE2_MUL = 1.25;
function phaseMul(s: BattleScene): number {
  return (s.memo.bossPhase ?? 1) >= 2 ? PHASE2_MUL : 1;
}

/**
 * Boss wipes this session (QA round 3: a retry after a wipe is short — the
 * rise and the opening line are cut, Kanenari-kun's flip says what beat
 * them, and at the 3rd chime the cursor waits on まもる).
 */
export const bossTries = { lost: 0 };

export function initBoss(s: BattleScene): void {
  s.bossParts = BOSS_PARTS.map((p) => ({ id: p.id, name: p.name, box: p.box, action: p.action, broken: false, glow: false }));
  s.memo.bossPhase = 1;
  setFlag('flag_boss_phase', 1);
  const boss = s.enemies.find((e) => e.def.boss);
  if (boss) syncBossFlags(s, boss);
  let sparkleT = 0;
  s.boss = {
    update: (dt) => {
      // a glowing part sheds a star or two every 0.3s
      if (!boss || !boss.alive) return;
      sparkleT += dt;
      if (sparkleT < 300) return;
      sparkleT -= 300;
      for (const p of s.bossParts) {
        if (!p.glow || p.broken) continue;
        const n = rng.int(1, 2);
        for (let i = 0; i < n; i++)
          s.sparkle(boss.left + p.box[0] + rng.int(0, p.box[2]), boss.top + p.box[1] + rng.int(0, Math.max(1, Math.round(p.box[3] * 0.6))));
      }
    },
    drawUnder: () => {},
    drawOver: (g) => {
      // broken parts lie on the floor with a small みました seal
      for (const p of s.bossParts) {
        if (!p.broken || !boss) continue;
        const img = boss.art ? (boss.art as unknown as { partImage?: (id: string) => HTMLCanvasElement }).partImage?.(p.id) : null;
        if (!img) continue;
        const x = boss.left + p.box[0] + p.box[2] / 2 - img.width / 2;
        const y = (p.fallY ?? 150) - img.height;
        g.img(img, Math.round(x), Math.round(y));
        const seal = ovalStamp('みました', 28, 14, 0.1, 2);
        g.img(seal, Math.round(x + img.width / 2 - seal.width / 2), Math.round(y + img.height / 2 - seal.height / 2));
      }
    },
  };
}

export function syncBossFlags(s: BattleScene, e: EnemyUnit): void {
  for (const p of s.bossParts) {
    const k = p.id.replace('boss_omukaemachi_', '');
    e.flags['broken_' + k] = p.broken ? 1 : 0;
    e.flags['glow_' + k] = p.glow ? 1 : 0;
  }
  e.flags.phase = s.memo.bossPhase ?? 1;
}

/** Boss AI for this round. Returns a skill id, or '' when a part acts instead. */
export function bossDecide(s: BattleScene, e: EnemyUnit): string {
  const r = s.round;
  const glowing = s.bossParts.find((p) => p.glow && !p.broken);
  if (glowing && (glowing as BossPart & { glowRound?: number }).glowRound! < r) return '';
  const canCall = callable(s).length > 0 && !glowing;
  const umbrella = !s.bossParts.find((p) => p.id === 'boss_omukaemachi_umbrella')?.broken;
  if ((s.memo.bossPhase ?? 1) < 2) {
    if (r === 1) return 'skill_omu_tebukuro';
    if (r === 2 && canCall) return 'skill_omu_oshirase';
    return weighted(e, [['skill_omu_tebukuro', 45], ['skill_omu_oshirase', canCall ? 35 : 0], ['skill_omu_madakonai', umbrella ? 20 : 0]]);
  }
  const k = s.kanenari;
  const yoikoOk = !!k && k.alive && !k.has('status_rusu') && r - (s.memo.yoikoRound ?? -99) > 3;
  if (s.memo.phase2Fresh) {
    s.memo.phase2Fresh = 0;
    if (yoikoOk) {
      s.memo.yoikoRound = r;
      return 'skill_omu_yoiko';
    }
  }
  const pick = weighted(e, [
    ['skill_omu_tebukuro', 35],
    ['skill_omu_oshirase', canCall ? 30 : 0],
    ['skill_omu_yoiko', yoikoOk ? 20 : 0],
    ['skill_omu_madakonai', umbrella ? 15 : 0],
  ]);
  if (pick === 'skill_omu_yoiko') s.memo.yoikoRound = r;
  return pick;
}

/**
 * Parts 迷子のお知らせ can still call: not broken, and the bottle only until
 * it has poured once (QA round 3, tempo: its heal came back again and again).
 */
function callable(s: BattleScene): BossPart[] {
  return s.bossParts.filter((p) => !p.broken && !(p.id === 'boss_omukaemachi_bottle' && s.memo.suitouUsed));
}

function weighted(e: EnemyUnit, t: [string, number][]): string {
  const last2 = e.lastSkills.slice(-2);
  let list = t.filter(([id, w]) => w > 0 && !(last2.length === 2 && last2[0] === id && last2[1] === id));
  if (!list.length) list = t.filter(([, w]) => w > 0);
  return list.length ? rng.weighted(list) : 'skill_omu_tebukuro';
}

// ---- boss moves -------------------------------------------------------------------------

export function* bossMoveImpl(c: BossMoveCtx): Co {
  const { s, e, sk, common, resolveGuard, target, all, pages, damageTo, projectile, soundRings } = c;
  switch (sk.id) {
    case 'skill_omu_tebukuro': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, i, toHit) => {
          if (toHit === 12) {
            e.setPose(i === 0 ? 'armL' : 'armR', sk.id);
            const red = i === 0;
            projectile(s, () => glove(red), e.left + (red ? 58 : 102), e.top + 86, target!, 12, 1, 1.6);
            s.sfx('se_glove', { pitch: red ? 1 : 1.1 });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, target!, 0.55 * phaseMul(s), r, i);
        },
      });
      break;
    }
    case 'skill_omu_madakonai':
    case 'skill_omu_kasa': {
      yield* hitLoop(s, {
        ...common,
        hits: [0],
        onFrame: (_f, _i, toHit) => {
          if (toHit === 6) {
            e.setPose('umbrella');
            s.sfx('se_umbrella_open');
          }
        },
        onHit: (i, r) => resolveGuard(r, i),
      });
      if (sk.id === 'skill_omu_madakonai') {
        changeStage(s, e, 'def', 2, 2, true);
        pages.push(...e.def.texts.extra.madakonaiResult);
      } else {
        changeStage(s, e, 'def', 1, 2, true);
        pages.push(...e.def.texts.tele.skill_omu_kasa.slice(1), ...e.def.texts.extra.kasaResult);
      }
      break;
    }
    case 'skill_omu_oshirase': {
      s.sfx('se_pa_chime');
      const order = ['boss_omukaemachi_bottle', 'boss_omukaemachi_cap', 'boss_omukaemachi_shoe', 'boss_omukaemachi_umbrella'];
      const idx = s.memo.oshiraseIdx ?? 0;
      const rest = callable(s);
      let part = rest.find((p) => p.id === order[idx]);
      if (!part) part = rest.length ? rng.pick(rest) : undefined;
      s.memo.oshiraseIdx = idx + 1;
      yield* hitLoop(s, {
        ...common,
        hits: [0],
        onFrame: (f) => {
          if (f === 0) e.setPose('lookup');
          if (f % 14 === 0) soundRings(s, e.left + 80, e.top + 84, '#F4F1E8', 1, 0.4, 600);
        },
        onHit: (i, r) => resolveGuard(r, i),
      });
      if (part) {
        part.glow = true;
        // the part pops (1.0 → 1.15 → 1.0, 300ms) as its light comes on
        e.params['glowAt_' + part.id.replace('boss_omukaemachi_', '')] = s.t;
        sfx('se_part_glow', { pan: Math.max(-1, Math.min(1, (e.left + part.box[0] + part.box[2] / 2 - 192) / 192)) });
        (part as BossPart & { glowRound?: number }).glowRound = s.round;
        syncBossFlags(s, e);
        pages.push(...(e.def.texts.extra['oshirase_' + part.id] ?? []));
        pages.push(...fillAll(e.def.texts.extra.oshiraseCommon, { part: part.name }));
        if (!s.memo.oshiraseTutShown) {
          s.memo.oshiraseTutShown = 1;
          s.memo.oshiraseTut = 1;
        }
      }
      break;
    }
    case 'skill_omu_chime': {
      s.bg.speed = 1;
      yield* hitLoop(s, {
        ...common,
        hits: [0],
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('chime');
          if (f === 0) sfx('se_chime_note', { note: 'E5', hold: 1.2 });
          if (toHit === 20) {
            const bb = s.bg as { shiver?: number; bellFlash?: number };
            bb.shiver = 600;
            bb.bellFlash = 500;
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          for (const t of all) {
            const base = e.def.atk * 3 * (1 + 0.25 * e.stages.atk.lv) - t.m.def * (1 + 0.25 * t.stages.def.lv) * 0.5;
            const d = fixedDamage(Math.max(1, base * CHIME_MUL), (r ? 0.5 : 1) * (t.guard ? 0.5 : 1));
            hurtParty(s, t, d, { tsukkomi: r });
          }
        },
      });
      break;
    }
    case 'skill_omu_kaerinokai': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (f) => {
          if (f === 0) e.setPose('cap');
          if (f % 16 === 0) soundRings(s, e.left + 80, e.top + 16, '#F5D33B', 1, 0.5, 500);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t) => damageTo(s, e, t, 0.9 * phaseMul(s), r));
        },
      });
      pages.push(...e.def.texts.extra.kaerinokaiResult);
      break;
    }
    case 'skill_omu_uwabaki': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 12) {
            e.setPose('kick');
            projectile(s, uwabaki, e.left + 78, e.top + 110, target!, 12, 1, 2.2, 10);
            s.sfx('se_uwabaki');
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, target!, 1.6 * phaseMul(s), r);
        },
      });
      break;
    }
    case 'skill_omu_suitou': {
      yield* hitLoop(s, {
        ...common,
        hits: [0],
        onFrame: (f) => {
          if (f === 0) e.setPose('drink');
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          sfx('se_bottle');
          const before = e.hp;
          // 40 (was 60 at HP 380), and only once a battle (callable())
          s.memo.suitouUsed = 1;
          e.hp = Math.min(e.maxHp, e.hp + SUITOU_HEAL);
          s.number(e.left + 126, e.top + 60, e.hp - before, { kind: 'heal' }, 'enemy', e);
        },
      });
      pages.push(...e.def.texts.tele.skill_omu_suitou.slice(1), ...e.def.texts.extra.suitouResult);
      break;
    }
    case 'skill_omu_yoiko': {
      yield* hitLoop(s, {
        ...common,
        hits: [0],
        onFrame: (f) => {
          if (f === 0) e.setPose('lookup');
          if (f % 14 === 0) soundRings(s, e.left + 80, e.top + 84, '#F4F1E8', 1, 0.4, 600);
        },
        onHit: (i, r) => resolveGuard(r, i),
      });
      const k = target!;
      if (c.st.anySuccess) pages.push(...e.def.texts.extra.yoikoGuard);
      else {
        pages.push(...e.def.texts.extra.yoikoFail);
        yield* sendHome(s, k);
      }
      break;
    }
    default:
      yield 300;
  }
}

/** Kanenari-kun trudges off to the lower right (800ms); panel greys out with a るす seal. */
function* sendHome(s: BattleScene, k: PartyUnit): Co {
  const st = { x: 290, y: 200, a: 1, f: 0 };
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g) => {
      const img = kanenariBack(st.f ? 'walk1' : 'walk2');
      g.alpha(st.a, () => g.img(img, Math.round(st.x - img.width / 2), Math.round(st.y - img.height)));
    },
  });
  for (let t = 0; t < 800; t += FRAME) {
    const p = t / 800;
    st.x = 290 + 80 * p;
    st.y = 200 + 20 * p;
    st.f = Math.floor(t / 150) % 2;
    st.a = 1 - Math.max(0, p - 0.7) / 0.3;
    yield null;
  }
  fx.done = true;
  k.m.status.status_rusu = 2;
  k.away = true;
  s.memo.disabled_kanenari = 1;
}

/** Round start: Kanenari-kun comes back when るす has ended. */
export function* bossRoundStart(s: BattleScene): Co {
  const k = s.kanenari;
  if (k && k.away && !k.has('status_rusu')) {
    k.away = false;
    const e = s.enemies.find((x) => x.def.boss);
    yield* s.say(e?.def.texts.extra.yoikoBack ?? []);
  }
}

/** Round end: glowing part acts, then one chime note (and the 4th-note attack). */
export function* bossRoundEnd(s: BattleScene): Co {
  const e = s.enemies.find((x) => x.def.boss && x.alive);
  if (!e || s.memo.bossFinal) return;
  const glowing = s.bossParts.find((p) => p.glow && !p.broken && (p as BossPart & { glowRound?: number }).glowRound! < s.round);
  if (glowing) {
    glowing.glow = false;
    syncBossFlags(s, e);
    yield* doEnemyAction(s, e, glowing.action);
    if (s.memo.bossFinal || !s.party.some((u) => u.alive)) return;
  }
  // chime
  s.bossChime.lit = Math.min(4, s.bossChime.lit + 1);
  const n = s.bossChime.lit;
  s.bossChime.pops[n - 1] = 150;
  sfx('se_chime_note', { note: CHIME_NOTES[n - 1] });
  e.setPose('chimeglow');
  if (n < 4) {
    yield* s.say(e.def.texts.extra.chime);
    e.setPose('idle');
    return;
  }
  yield* s.say(e.def.texts.extra.chime4);
  yield* doEnemyAction(s, e, 'skill_omu_chime');
  s.bossChime.lit = 0;
  if (s.party.some((u) => u.alive)) yield* s.say(e.def.texts.extra.chimeAfter);
}

// ---- stamping parts ----------------------------------------------------------------------

export function* onBossPartBreak(s: BattleScene, e: EnemyUnit, part: BossPart, j: Judge): Co {
  part.glow = false;
  part.broken = true;
  syncBossFlags(s, e);
  sfx('se_part_break');
  s.hitstop(10);
  s.flash('#FFF6D8', 0.4, 2);
  const x = e.left + part.box[0] + part.box[2] / 2;
  const y = e.top + part.box[1] + part.box[3] / 2;
  s.stars(x, y, 6);
  // one label, on the part's outer side (never over the face): the umbrella
  // on the left, the bottle on the right, the cap and the shoe beside them
  const box = { x0: e.left + part.box[0], y0: e.top + part.box[1], x1: e.left + part.box[0] + part.box[2], y1: e.top + part.box[1] + part.box[3] };
  const outward: LabelSide[] = x < e.x ? ['left', 'aboveLeft', 'above', 'below', 'right'] : ['right', 'aboveRight', 'above', 'below', 'left'];
  s.labelNear(LABEL.buhin, () => box, outward, 'shu', 900, false, 2 * FRAME);
  // the part hops once and drops to the floor
  part.fallY = e.top + part.box[1] + part.box[3];
  const y0 = part.fallY;
  s.addFx({
    layer: 'back',
    dur: 520,
    draw: () => {},
    update() {
      const p = Math.min(1, this.t / 500);
      part.fallY = y0 + (152 - y0) * ease.bounceOut(p) - Math.sin(Math.min(1, p * 2) * Math.PI) * 8;
    },
  });
  const dmg = fixedDamage(40 * JUDGE_MUL[j]);
  // the number pops from the part that was seen, not from the boss's middle
  hurtEnemy(s, e, dmg, { big: j === 'kukkiri', at: [Math.round(x), Math.round(y)] });
  knock(s, e, 2);
  yield 400;
  yield* s.say([
    ...fillAll(e.def.texts.extra.breakFirst, { part: part.name }),
    ...(e.def.texts.extra['break_' + part.id] ?? []),
    ...fillAll(e.def.texts.extra.breakLast, { part: part.name }),
  ]);
  yield* checkBossPhase(s, e);
}

export function* onBossBodyMimashita(s: BattleScene, e: EnemyUnit): Co {
  yield* s.say(e.def.texts.extra.bodyMimashita);
}

/** やりなおし on the boss: chime −1 (priority) or a glowing part's light. */
export function* bossUndo(s: BattleScene, e: EnemyUnit, j: Judge, partId?: string): Co {
  const part = partId ? s.bossParts.find((p) => p.id === partId) : undefined;
  if (part && part.glow) {
    part.glow = false;
    syncBossFlags(s, e);
    yield* s.say(fillAll(['$partの 光が 消えた！'], { part: part.name }));
  } else if (s.bossChime.lit > 0) {
    const i = s.bossChime.lit - 1;
    // the lit bell is circled in red pen and goes out
    s.addFx({
      layer: 'top',
      dur: 500,
      ui: true,
      draw: (g, t) => {
        const x = [305, 322, 339, 356][i] + 7;
        const y = s.msg.bottom + 2 + 10;
        const k = Math.min(1, t / 250);
        for (let a = 0; a < 40 * k; a++) {
          const an = -Math.PI / 2 - (a / 40) * Math.PI * 2;
          g.px(Math.round(x + Math.cos(an) * 10), Math.round(y + Math.sin(an) * 10), '#E23B2E');
        }
      },
    });
    // the lit bell's note played backwards
    sfx('se_chime_note', { note: CHIME_NOTES[i], pitch: 0.5, vol: 0.5 });
    yield 300;
    s.bossChime.lit--;
    yield* s.say(SYS.yarinaoshiChime);
  } else {
    const glowing = s.bossParts.find((p) => p.glow && !p.broken);
    if (glowing) {
      glowing.glow = false;
      syncBossFlags(s, e);
      yield* s.say(fillAll(['$partの 光が 消えた！'], { part: glowing.name }));
    } else yield* s.say(SYS.yarinaoshiNone);
  }
  if (j === 'kukkiri') {
    e.status.bokemake = true;
    bokemakeLabel(s, e);
  }
}

// ---- phases -----------------------------------------------------------------------------

/** After every action: phase 2 at ≤50%, the final phase at ≤20% (HP floor 1 until then). */
export function* checkBossPhase(s: BattleScene, e: EnemyUnit): Co<boolean> {
  if (!e.def.boss || s.memo.bossFinal) return false;
  if (e.hp <= e.maxHp * 0.2) {
    yield* bossFinal(s, e);
    return true;
  }
  if ((s.memo.bossPhase ?? 1) < 2 && e.hp <= e.maxHp * 0.5) {
    yield* bossPhase2(s, e);
  }
  return false;
}

function* bossPhase2(s: BattleScene, e: EnemyUnit): Co {
  s.memo.bossPhase = 2;
  s.memo.phase2Fresh = 1;
  s.hitstop(8);
  s.shake(3, 3, 10);
  e.whiteFrames = 1;
  yield 200;
  const bg = s.bg as unknown as { phase2?: boolean; speed: number; waveTarget: unknown; night: number };
  bg.phase2 = true;
  s.addFx({ layer: 'back', dur: 800, draw: () => {}, update() {
    bg.speed = 1 + 1.5 * Math.min(1, this.t / 800);
  } });
  bg.waveTarget = { A: 4, f: 0.6 };
  yield 200;
  // 400ms: 0.3s of night; the music drops out for one beat
  bg.night = 0.3;
  muteMusic(0.43);
  yield 300;
  sfx('se_boss_voice');
  yield* s.say(e.def.texts.extra.phase2);
  s.setMusicParam('boss_phase', 2);
  setFlag('flag_boss_phase', 2);
  syncBossFlags(s, e);
}

function* bossFinal(s: BattleScene, e: EnemyUnit): Co {
  s.memo.bossFinal = 1;
  s.memo.bossPhase = 3;
  setFlag('flag_boss_phase', 3);
  e.flags.final = 1;
  // 0: the boss and the clocks slow to a stop over 500ms; the music thins to its pad
  const bg = s.bg as unknown as { speed: number; frozen: boolean };
  const sp0 = bg.speed;
  s.addFx({ layer: 'back', dur: 500, draw: () => {}, update() {
    bg.speed = Math.max(0.02, 1 - this.t / 500) * sp0;
    if (this.t >= 490) bg.frozen = true;
  } });
  s.setMusicParam('boss_phase', 3);
  e.setPose('still');
  yield 600;
  yield* s.say(e.def.texts.extra.final1);
  yield* s.say(e.def.texts.extra.final2.map((p) => `{spd=0.5}${p}`));
  // Kanenari-kun steps forward (back view, centre bottom) and raises a hand to the bell
  const k = s.kanenari;
  const st = { y: 240, f: 'walk1', a: 1 };
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g) => {
      const img = kanenariBack(st.f);
      // he comes up from behind the status panels and goes back down behind
      // them (QA round 2: on the way back he covered Minato's HP and ink)
      const ctx = g.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, 384, 144);
      ctx.clip();
      g.alpha(st.a, () => g.img(img, 192 - Math.round(img.width / 2), Math.round(st.y - img.height)));
      ctx.restore();
    },
  });
  if (k) {
    k.bounceT = 250;
    k.away = false;
    delete k.m.status.status_rusu;
  }
  s.msg.post(e.def.texts.extra.final3.slice(0, 1));
  // he stops a little above the name tags, so the whole of him is seen
  for (let t = 0, n = 0; t < 500; t += FRAME) {
    st.y = 240 - 102 * ease.quadOut(t / 500);
    st.f = Math.floor(t / 150) % 2 ? 'walk1' : 'walk2';
    if (t >= n * 170) {
      sfx('se_step_kanenari');
      n++;
    }
    yield null;
  }
  st.f = 'raise';
  yield () => !s.msg.busy;
  yield* s.say(e.def.texts.extra.final3.slice(1));
  // the 0.6s before the bell is complete silence
  muteMusic(0.6);
  st.f = 'hit';
  yield 600;
  // +500ms: the bell rings for the first time — three rings of sound roll
  // out from his bell to the edges of the screen, the great bell behind
  // the clocks lights once, and both faces look up
  sfx('se_bell_kanenari');
  bg.frozen = true;
  s.bossChime.gold = true;
  s.shake(1, 1, 60);
  (s.bg as unknown as { bellFlash: number }).bellFlash = 1100;
  const ringX = 192;
  const ringY = Math.round(st.y) - 40;
  for (let i = 0; i < 3; i++) {
    const d = i * 180;
    s.addFx({
      layer: 'top',
      dur: 600 + d,
      ui: true,
      draw: (g, t) => {
        if (t < d) return;
        const p = (t - d) / 600;
        const r = 10 + ease.quadOut(p) * 250;
        // a 4px band: pale gold with a bright leading edge, thinning as it goes
        const th = Math.max(1, Math.round(4 * (1 - p * 0.6)));
        g.alpha(0.95 * (1 - p * p), () => {
          const steps = Math.round(r * 3.2);
          for (let k = 0; k < steps; k++) {
            const an = (k / steps) * Math.PI * 2;
            const ca = Math.cos(an);
            const sa = Math.sin(an) * 0.8;
            for (let j = 0; j < th; j++) g.px(Math.round(ringX + ca * (r - j)), Math.round(ringY + sa * (r - j)), j === 0 ? '#FFF6D8' : '#FFE7A3');
          }
        });
      },
    });
  }
  for (const u of s.party) s.mood(u, 'surprised', 2600);
  const glow = { a: 0 };
  s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    draw: (g) => {
      // vermilion → gold gradient overlay (α0 → 0.25 over 2s)
      const ctx = g.ctx;
      const grad = ctx.createLinearGradient(0, 0, 0, 216);
      grad.addColorStop(0, '#E23B2E');
      grad.addColorStop(1, '#FFD23F');
      ctx.save();
      ctx.globalAlpha = glow.a;
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, 384, 216);
      ctx.restore();
    },
    update() {
      glow.a = Math.min(0.25, (this.t / 2000) * 0.25);
      if (this.t % 90 < FRAME) s.burst(rng.range(0, 384), 216, { count: 2, speed: [20, 50], angle: [-Math.PI * 0.6, -Math.PI * 0.4], life: [1200, 2200], colors: ['#FFE7A3', '#FFF6D8'], shape: 'sq', size: [1, 2] }, true);
    },
  });
  st.f = 'ring';
  yield 1400;
  yield* s.say(e.def.texts.extra.final4);
  st.f = 'idle';
  // +4000ms: the hanko case — おかえりなさい rises while the band reads 9.7
  yield* playHankoLearnIn(s, 'skill_okaerinasai', e.def.texts.extra.final5);
  const mi = s.minato;
  if (mi && !mi.m.skills.includes('skill_okaerinasai')) mi.m.skills.push('skill_okaerinasai');
  for (let t = 0; t < 300; t += FRAME) {
    st.y = 138 + 108 * ease.quadIn(t / 300);
    yield null;
  }
  fx.done = true;
  s.msg.setStatic(e.def.texts.extra.finalPrompt[0]);
  // Minato may be down: she stands up for the last stamp
  if (mi && !mi.alive) {
    mi.m.hp = 1;
    delete mi.m.status.status_hebatta;
    mi.drop = 0;
  }
  if (mi) for (const st2 of ['status_nemuri', 'status_tsukamare', 'status_toosenbo', 'status_konran']) delete mi.m.status[st2];
}

interface Petal {
  x: number;
  y: number;
  vy: number;
  sway: number;
  swayF: number;
  ph: number;
  spin: number;
  col: number;
  life: number;
}

/**
 * The petal rain of the final stamp (13.7): each petal is its own little
 * tumbling thing — it sways side to side as it falls and flips through its
 * four flutter frames — drawn over the whole picture. `n` petals come in
 * over `ms` from above the top edge, spread across the full width, so a
 * くっきり (200) fills the screen.
 */
function petalRain(s: BattleScene, n: number, ms: number): void {
  const frames = flutterPetals();
  const list: Petal[] = [];
  let spawned = 0;
  s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    update(dt) {
      const want = Math.min(n, Math.round((n * this.t) / ms));
      for (; spawned < want; spawned++)
        list.push({
          x: rng.range(-8, 392),
          y: rng.range(-24, -6),
          vy: rng.range(44, 78),
          sway: rng.range(6, 16),
          swayF: rng.range(1.2, 2.4),
          ph: rng.range(0, Math.PI * 2),
          spin: rng.range(5, 11),
          col: rng.int(0, 3),
          life: 0,
        });
      const k = dt / 1000;
      for (const p of list) {
        p.life += dt;
        p.y += p.vy * k;
        p.ph += p.swayF * Math.PI * 2 * k;
      }
      for (let i = list.length - 1; i >= 0; i--) if (list[i].y > 230) list.splice(i, 1);
      if (spawned >= n && !list.length) this.done = true;
    },
    draw: (g) => {
      // they fall from behind the band: the line in it (「……ただいま。」)
      // is never cut by a petal (QA round 2)
      const ctx = g.ctx;
      ctx.save();
      ctx.beginPath();
      ctx.rect(-8, s.msg.bottom, 400, 240);
      ctx.clip();
      for (const p of list) {
        const x = Math.round(p.x + Math.sin(p.ph) * p.sway);
        const f = Math.floor((p.life / 1000) * p.spin) % 4;
        const img = frames[p.col][f];
        g.img(img, x - (img.width >> 1), Math.round(p.y) - (img.height >> 1));
      }
      ctx.restore();
    },
  });
}

/** The final stamp (13.7). */
export function* doOkaerinasai(s: BattleScene, u: PartyUnit): Co {
  const e = s.enemies.find((x) => x.def.boss);
  if (!e) return;
  // the prompt stays in the band while the stamp is held; any judgement works
  s.msg.setStatic(e.def.texts.extra.finalPrompt[0]);
  const j = yield* holdStamp(s, u);
  s.msg.clearStatic();
  const big = finalSeal('おかえりなさい', j === 'kasure' ? 0.3 : 0);
  const cx = e.left + 80;
  const cy = e.top + 64;
  const drop = { p: 0, stuck: false };
  const markFx = s.addFx({
    layer: 'world',
    dur: 0,
    draw: (g) => {
      const y = -40 + (cy + 40) * ease.cubicIn(drop.p);
      g.alpha(e.alpha, () => g.img(big, Math.round(cx - big.width / 2), Math.round(y - big.height / 2)));
    },
  });
  for (let i = 1; i <= 5; i++) {
    drop.p = i / 5;
    yield null;
  }
  // impact: hitstop 20f, white 3f — no screen shake (gentle)
  s.hitstop(20);
  s.flash('#FFF6D8', 1, 3);
  sfx('se_stamp_heavy', { pitch: 0.9 });
  sfx('se_hanamaru', { grade: 'kukkiri' });
  // petals rain down from the top edge — くっきり fills the screen with 200
  // over 1.5s (16.5 / 13.7), otherwise a lighter shower of 60
  petalRain(s, j === 'kukkiri' ? 200 : 60, 1500);
  s.petals(cx, cy, 24, 30);
  for (const p of s.party) s.mood(p, 'happy', 12000);
  s.msg.post(e.def.texts.extra.finalStamp);
  yield 1000;
  // +1000ms: 「…………」「……ただいま。」
  yield () => !s.msg.busy;
  sfx('se_boss_voice');
  yield* s.say(e.def.texts.extra.finalTadaima.map((p) => `{spd=0.5}${p}`));
  // +2500ms: the forgotten things turn into light one by one and fly toward
  // the town (screen left); the cap goes last, to the lower left (photo studio)
  stopBgm(2.0);
  const items = ['bottle', 'shoe', 'umbrella', 'umbrella2', 'glove', 'glove2', 'bag', 'recorder', 'tag', 'tag2', 'keyring', 'cap'];
  const origin: Record<string, [number, number]> = {
    bottle: [126, 78], shoe: [78, 108], umbrella: [22, 60], umbrella2: [30, 80], glove: [60, 92], glove2: [102, 92], bag: [80, 72],
    recorder: [112, 20], tag: [66, 44], tag2: [94, 44], keyring: [58, 70], cap: [80, 14],
  };
  e.flags.fading = 1;
  for (let i = 0; i < items.length; i++) {
    const id = items[i];
    const last = id === 'cap';
    e.flags['gone_' + id.replace(/2$/, '')] = 1;
    const [ox, oy] = origin[id];
    const sx = e.left + ox;
    const sy = e.top + oy;
    const tx = last ? -24 : -24;
    const ty = last ? 236 : rng.int(30, 130);
    const trail: [number, number][] = [];
    const dur = last ? 1500 : 1100;
    s.addFx({
      layer: 'top',
      dur,
      ui: true,
      draw: (g, t) => {
        const p = ease.quadIn(Math.min(1, t / dur));
        const x = sx + (tx - sx) * p;
        const y = sy + (ty - sy) * p - Math.sin(p * Math.PI) * (last ? 12 : 22);
        trail.push([x, y]);
        if (trail.length > (last ? 22 : 10)) trail.shift();
        trail.forEach(([px, py], k2) => g.alpha((k2 / trail.length) * 0.7, () => g.rect(Math.round(px), Math.round(py), 2, 2, '#FFE7A3')));
        const tw = Math.floor(t / 80) % 2;
        g.rect(Math.round(x) - 2 - tw, Math.round(y), 5 + tw * 2, 1, '#FFF6D8');
        g.rect(Math.round(x), Math.round(y) - 2 - tw, 1, 5 + tw * 2, '#FFF6D8');
        g.rect(Math.round(x) - 1, Math.round(y) - 1, 3, 3, '#FFE7A3');
        g.px(Math.round(x), Math.round(y), '#FFFFFF');
      },
    });
    sfx('se_light_fly', { pitch: last ? 0.8 : 1 + i * 0.03, pan: -0.6 });
    yield 250;
  }
  // the shadow body fades out over 1.5s
  s.addFx({ layer: 'back', dur: 1500, draw: () => {}, update() {
    e.alpha = Math.max(0, 1 - this.t / 1500);
  } });
  yield* s.say(e.def.texts.extra.finalLeave);
  yield () => e.alpha <= 0.02;
  yield 400;
  markFx.done = true;
  e.dead = true;
  e.visible = false;
  e.hp = 0;
  s.memo.bossWon = 1;
}
