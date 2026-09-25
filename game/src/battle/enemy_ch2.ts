// Chapter-2 enemy moves (51 8〜9章, 14章): each move's telegraph, wind-up,
// the "！" windows (hitLoop), hits and result pages — スネトマト, ヘノヘノ課長,
// ビリビリ番, チョトツ (the dash that bends), ムジン販売員 and 耕うん機テツヤ.

import type { Co } from '../engine/co';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { fillAll, SYS } from '../data/battle';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import type { EnemyUnit, PartyUnit } from './model';
import { statusChance } from './model';
import { changeStage, giveStatus, panelImpact } from './common';
import type { BossMoveCtx } from './enemy';
import { hitLoop, panelHitPoint } from './enemy';
import { PANEL_POS } from './ui/panels';
import { clodGrass, clodL, clodS, crossGlint, cucumber, mudDrop, silverCoin } from './art/fxart_ch2';
import { thickLine } from './art/fxart';

const MOVES = new Set([
  'skill_sune_suneru',
  'skill_sune_korogaru',
  'skill_sune_aokusai',
  'skill_heno_kaonaoshi',
  'skill_heno_tachippanashi',
  'skill_heno_toriodoshi',
  'skill_biri_kinshi',
  'skill_biri_pulse',
  'skill_biri_tsuden',
  'skill_cho_tame',
  'skill_cho_totsu',
  'skill_cho_horu',
  'skill_cho_nuta',
  'skill_mujin_irasshai',
  'skill_mujin_osusume',
  'skill_mujin_charin',
  'skill_mujin_nefuda',
  'skill_tetsuya_light',
  'skill_tetsuya_rotary',
  'skill_tetsuya_ensuto',
  'skill_tetsuya_fullthrottle',
]);

export function isCh2Move(id: string): boolean {
  return MOVES.has(id);
}

/** 命中−1 on members (51 4.4): base chance × (1 − うん/100); a tsukkomi blocks it. */
export function hitDown(s: BattleScene, list: PartyUnit[], chance: number, blocked: boolean): PartyUnit[] {
  const out: PartyUnit[] = [];
  if (blocked) return out;
  for (const t of list) {
    if (!t.alive) continue;
    if (rng.next() >= statusChance(chance, t.m.luck)) continue;
    changeStage(s, t, 'hit', -1, 3, true);
    out.push(t);
  }
  return out;
}

/** Dust / soil puff at a point. */
function dust(s: BattleScene, x: number, y: number, n: number, col = ['#6B5A4A', '#8A6A4A', '#4A3A2A']): void {
  s.burst(x, y, { count: n, speed: [20, 60], angle: [-Math.PI * 0.95, -Math.PI * 0.05], life: [260, 460], colors: col, gravity: 200, drag: 1.2, shape: 'sq', size: [1, 2] });
}

/** A clod / coin that tumbles from (x0, y0) onto a member's photo, landing on the hit frame. */
function lob(c: BossMoveCtx, img: () => HTMLCanvasElement, x0: number, y0: number, to: PartyUnit, frames: number, arc = 26, s1 = 1.8): void {
  c.projectile(c.s, img, x0, y0, to, frames, 1, s1, arc, { lob: true, dx: rng.int(-8, 8), dy: rng.int(-6, 4) });
}

export function* ch2Move(c: BossMoveCtx): Co {
  const { s, e, sk, common, resolveGuard, target, all, pages, damageTo, st } = c;
  switch (sk.id) {
    // ---- スネトマト (51 8.1) ------------------------------------------------------
    case 'skill_sune_suneru': {
      yield* c.selfMove(s, common, resolveGuard, () => {
        // turns its back: a 3px hop, side → back in two frames (the hit)
        e.setPose('turn', sk.id);
        s.sfx('se_h_sune');
        e.status.sune = true;
      });
      yield 200;
      pages.push(...e.def.texts.extra.suneruResult);
      break;
    }
    case 'skill_sune_korogaru': {
      s.sfx('se_h_roll');
      yield* rollHits(c);
      break;
    }
    case 'skill_sune_aokusai': {
      e.setPose('tremble', sk.id);
      s.sfx('se_h_aokusai');
      yield* c.selfMove(
        s,
        common,
        resolveGuard,
        () => {
          // the green waves wash over the panels (the hit)
          e.setPose('tremble', sk.id);
        },
        (f) => {
          if (f % 8 === 0) smellWaves(s, e, all);
        },
      );
      const hit = hitDown(s, all, sk.status?.chance ?? 0.8, st.anySuccess);
      if (st.anySuccess) pages.push(...fillAll(SYS.guarded, { target: all.length > 1 ? 'シュンたち' : all[0]?.name ?? '' }));
      else if (hit.length) pages.push(...e.def.texts.extra.aokusaiResult);
      break;
    }

    // ---- ヘノヘノ課長 (51 8.2) ------------------------------------------------------
    case 'skill_heno_kaonaoshi': {
      // a small brush comes out of the breast pocket and redraws the face
      // (6 frames), then one turn on the leg and the crossbar hits
      e.setPose('redraw', sk.id);
      s.sfx('se_pen_write', { vol: 0.7 });
      yield* spinHit(c);
      if (!st.anySuccess && target && target.alive && rng.next() < statusChance(sk.status?.chance ?? 0.35, target.m.luck)) {
        giveStatus(s, target, 'status_konran', 2);
        pages.push(...e.def.texts.extra.kaonaoshiResult);
      } else if (st.anySuccess && target) pages.push(...fillAll(SYS.guarded, { target: target.name }));
      break;
    }
    case 'skill_heno_tachippanashi': {
      yield* c.selfMove(s, common, resolveGuard, () => {
        e.setPose('stiff', sk.id);
        s.sfx('se_h_kakashi_turn', { vol: 0.6 });
      });
      changeStage(s, e, 'def', 2, 2, true);
      pages.push(...e.def.texts.extra.tachippanashiResult);
      break;
    }
    case 'skill_heno_toriodoshi': {
      e.setPose('glint', sk.id);
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 4) e.setPose('attack', sk.id);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx('se_glint');
          s.flash('#FFF6D8', 0.18, 2);
          cdBeams(s, e, all);
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.5, r));
        },
      });
      const hit = hitDown(s, all, sk.status?.chance ?? 0.7, st.anySuccess);
      if (hit.length) pages.push(...e.def.texts.extra.toriodoshiResult);
      break;
    }

    // ---- ビリビリ番 (51 8.3) --------------------------------------------------------
    case 'skill_biri_kinshi': {
      const t = target!;
      yield* c.selfMove(
        s,
        common,
        resolveGuard,
        () => {
          e.setPose('sign', sk.id);
          s.sfx('se_h_biri', { vol: 0.7 });
          s.sfx('se_meishi', { pitch: 0.6 });
          panelImpact(s, t, !!st.anySuccess);
          if (!st.anySuccess) t.shakeT = 120;
        },
        (f) => {
          if (f === 4) e.setPose('sign', sk.id);
        },
      );
      if (st.anySuccess) pages.push(...fillAll(SYS.guarded, { target: t.name }));
      else pages.push(...c.applyStatusOne(s, t, sk, st));
      break;
    }
    case 'skill_biri_pulse': {
      const t = target!;
      const fails: boolean[] = [];
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, i, toHit) => {
          if (f === 0) e.setPose('pulse', sk.id);
          if (toHit === 8) lightningTo(s, e, t, i);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          fails.push(!r);
          s.sfx('se_h_biri');
          damageTo(s, e, t, sk.power ?? 0.4, r, i);
        },
      });
      // the dry pulse line only when all three got through (letters say the rest)
      if (fails.length === 3 && fails.every((x) => x)) pages.push(...e.def.texts.extra.pulseResult);
      break;
    }
    case 'skill_biri_tsuden': {
      yield* c.selfMove(s, common, resolveGuard, () => {
        e.setPose('charge', sk.id);
        s.sfx('se_h_biri', { vol: 0.5 });
      });
      changeStage(s, e, 'atk', 1, 3, true);
      pages.push(...e.def.texts.extra.tsudenResult);
      break;
    }

    // ---- チョトツ (51 8.4, 14.8) ----------------------------------------------------
    case 'skill_cho_tame': {
      s.sfx('se_h_boar', { level: 0 });
      yield* c.selfMove(
        s,
        common,
        resolveGuard,
        () => {
          e.setPose('charge', sk.id);
          // the glare (X): one of the members that can be hit, evenly
          const list = s.party.filter((u) => u.targetable);
          e.status.stareAt = list.length ? rng.pick(list).id : undefined;
          e.status.tame = 'skill_cho_totsu';
          s.bg.flags.charge = 1;
        },
        (f) => {
          if (f % 7 === 0) dust(s, e.left + 14, e.footY - 2, 3);
        },
      );
      break;
    }
    case 'skill_cho_totsu': {
      yield* chototsuDash(c);
      break;
    }
    case 'skill_cho_horu': {
      s.sfx('se_h_soil');
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 16) {
            e.setPose('dig', sk.id);
            for (const t of all) {
              lob(c, clodL, e.left + 12, e.footY - 8, t, 16, 30);
              lob(c, clodS, e.left + 18, e.footY - 6, t, 15, 22);
            }
            dust(s, e.left + 12, e.footY - 2, 8);
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx('se_h_soil', { pitch: 1.1 });
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.6, r));
        },
      });
      break;
    }
    case 'skill_cho_nuta': {
      yield* c.selfMove(
        s,
        common,
        resolveGuard,
        () => {
          e.setPose('wallow', sk.id);
          s.sfx('se_drip', { pitch: 0.7 });
          mudSplash(s, e);
        },
        (f) => {
          if (f === 6) e.setPose('wallow', sk.id);
          if (f % 9 === 0) mudSplash(s, e, 3);
        },
      );
      changeStage(s, e, 'def', 1, 3, true);
      pages.push(...e.def.texts.extra.nutaResult);
      break;
    }

    // ---- ムジン販売員 (51 8.5) -------------------------------------------------------
    case 'skill_mujin_irasshai': {
      yield* c.selfMove(
        s,
        common,
        resolveGuard,
        () => e.setPose('bow', sk.id),
        (f) => {
          if (f === 0) {
            e.setPose('sign', sk.id);
            s.sfx('se_flip', { pitch: 1.2 });
          }
        },
      );
      changeStage(s, e, 'spd', 1, 3, true);
      pages.push(...e.def.texts.extra.irasshaiResult);
      break;
    }
    case 'skill_mujin_osusume': {
      const t = target!;
      yield* hitLoop(s, {
        ...common,
        onFrame: (_f, _i, toHit) => {
          if (toHit === 14) {
            e.setPose('push', sk.id);
            s.sfx('se_meishi', { pitch: 0.8 });
            c.projectile(s, cucumber, e.coreX - 4, e.coreY - 2, t, 14, 1, 1.8, 4, { trail: true });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, t, sk.power ?? 1, r);
        },
      });
      break;
    }
    case 'skill_mujin_charin': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, i, toHit) => {
          if (f === 0) e.setPose('shake', sk.id);
          if (toHit === 16) {
            s.sfx('se_h_charin', { pitch: 1 + i * 0.06 });
            for (const t of all) {
              const n = rng.int(1, 2);
              for (let k = 0; k < n; k++) {
                const ph = rng.int(0, 3);
                c.projectile(s, () => silverCoin(Math.floor(s.t / 60) + ph), e.coreX + rng.int(-4, 4), e.top + 8, t, 16 - k, 1, 1.9, 30 + rng.int(0, 10), {
                  lob: true,
                  trail: true,
                  glint: true,
                  dx: rng.int(-9, 9),
                  dy: rng.int(-6, 4),
                });
              }
            }
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t) => {
            damageTo(s, e, t, sk.power ?? 0.4, r, i, true);
            const [hx, hy] = panelHitPoint(t);
            s.burst(hx, hy - 4, { count: 3, speed: [50, 110], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [250, 380], colors: ['#C8C2B4', '#F4F1E8', '#8E95A6'], gravity: 420, shape: 'sq', size: [2, 2], sizeEnd: 1 }, true);
          });
        },
      });
      break;
    }
    case 'skill_mujin_nefuda': {
      yield* c.selfMove(
        s,
        common,
        resolveGuard,
        () => e.setPose('flip', sk.id),
        (f) => {
          if (f === 2) {
            e.setPose('flip', sk.id);
            s.sfx('se_pen_write', { vol: 0.7, pitch: 1.2 });
          }
        },
      );
      changeStage(s, e, 'atk', 1, 3, true);
      s.bg.flags.nefuda = 1;
      pages.push(...e.def.texts.extra.nefudaResult);
      break;
    }

    // ---- 耕うん機テツヤ (51 9.4) ------------------------------------------------------
    case 'skill_tetsuya_light': {
      const t = target!;
      s.sfx('se_h_tiller', { level: 1 });
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('glare', sk.id);
          if (toHit === 10) headlightFan(s, e, t);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.flash('#FFFFFF', 0.2, 2);
          damageTo(s, e, t, sk.power ?? 0.8, r);
        },
      });
      const hit = hitDown(s, [t], sk.status?.chance ?? 1, st.anySuccess);
      if (hit.length) pages.push(...fillAll(e.def.texts.extra.lightResult, { target: t.name }));
      break;
    }
    case 'skill_tetsuya_rotary': {
      s.sfx('se_h_tiller', { level: 2 });
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, i, toHit) => {
          if (f === 0) e.setPose('spin', sk.id);
          if (toHit === 14) {
            for (const t of all) {
              lob(c, i === 2 ? clodGrass : clodL, e.left + 58, e.footY - 12, t, 14, 26);
              if (i !== 1) lob(c, clodS, e.left + 62, e.footY - 10, t, 13, 18);
            }
            dust(s, e.left + 60, e.footY - 4, 6);
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx('se_h_soil', { pitch: 1 + i * 0.08 });
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.35, r, i));
        },
      });
      break;
    }
    case 'skill_tetsuya_ensuto': {
      e.mem.ensutoUsed = 1;
      yield* c.selfMove(
        s,
        common,
        resolveGuard,
        () => {
          // "プスン": the vibration stops, one black puff, the lamp flickers down
          e.setPose('stall', sk.id);
          s.sfx('se_h_stall');
          s.burst(e.left + 30, e.top + 6, { count: 8, speed: [10, 30], angle: [-Math.PI * 0.8, -Math.PI * 0.4], life: [600, 900], colors: ['#3A3F48', '#2A2E36', '#4A4F58'], gravity: -30, drag: 1.5, shape: 'sq', size: [2, 4], sizeEnd: 5 });
          e.status.tame = 'skill_tetsuya_fullthrottle';
          s.bg.flags.charge = 1;
        },
      );
      break;
    }
    case 'skill_tetsuya_fullthrottle': {
      e.status.tame = undefined;
      s.bg.flags.charge = 0;
      s.bg.flags.burst = 1;
      e.mem.chargeEnd = e.mem.acts ?? 0;
      s.sfx('se_h_tiller', { level: 3 });
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          // two revs (2px hops), then the smoke and the charge at the camera
          if (f === 0) e.setPose('rev', sk.id);
          if (f === 4 || f === 14) {
            e.offY = -2;
            s.burst(e.left + 30, e.top + 6, { count: 5, speed: [15, 40], angle: [-Math.PI * 0.8, -Math.PI * 0.4], life: [400, 700], colors: ['#9AA0A8', '#C8CDD4'], gravity: -30, drag: 1.4, shape: 'sq', size: [2, 3], sizeEnd: 4 });
          }
          if (f === 7 || f === 17) e.offY = 0;
          if (toHit === 10) {
            e.setPose('attack', sk.id);
            c.rush(s, e, { scale: 1.5, dy: 10, inF: 10, holdF: 4, outF: 14 });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx('se_ojigi_press', { pitch: 1.2 });
          s.shake(5, 5, 14);
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 1.4, r));
        },
      });
      s.bg.flags.burst = 0;
      break;
    }
    default:
      yield 300;
  }
}

// ---- move pieces ---------------------------------------------------------------------

/** ころがる: 4-frame roll toward the camera (1.0 → 1.4, 12f) onto the target. */
function* rollHits(c: BossMoveCtx): Co {
  const { s, e, sk, common, resolveGuard, target, damageTo } = c;
  const t = target!;
  yield* hitLoop(s, {
    ...common,
    onFrame: (_f, _i, toHit) => {
      if (toHit === 12) {
        e.setPose('roll', sk.id);
        c.rush(s, e, { scale: 1.4, dy: 16, dx: c.towardX(e, t, 0.3, 30), inF: 12, holdF: 3, outF: 14 });
      }
    },
    onHit: (i, r) => {
      resolveGuard(r, i);
      damageTo(s, e, t, sk.power ?? 1, r);
    },
  });
}

/** へのへのもへじ: after the redraw, one turn (front / side / back / side) and the crossbar hits. */
function* spinHit(c: BossMoveCtx): Co {
  const { s, e, sk, common, resolveGuard, target, damageTo } = c;
  const t = target!;
  yield* hitLoop(s, {
    ...common,
    onFrame: (f, _i, toHit) => {
      if (f === 18) e.setPose('spin', sk.id);
      if (toHit === 6) c.rush(s, e, { scale: 1.12, dy: 5, dx: c.towardX(e, t, 0.12, 12), inF: 6, holdF: 3, outF: 10 });
    },
    onHit: (i, r) => {
      resolveGuard(r, i);
      damageTo(s, e, t, sk.power ?? 1, r);
    },
  });
}

/**
 * 突進 (14.8): page 1, the dash straight at the one it glared at (1.0 → 1.3),
 * 650ms page 2 「……曲がった！」 with the sprite flipped and swept 40px to the
 * other side (150ms, three speed lines), the "!" at that member's panel and
 * the hit at 950ms — 300ms from the bend, every time. Only X to hit: no bend.
 */
function* chototsuDash(c: BossMoveCtx): Co {
  const { s, e, sk, resolveGuard, target, damageTo } = c;
  const t = target!;
  const stare = e.status.stareAt;
  const bends = !!stare && t.id !== stare;
  e.status.tame = undefined;
  e.status.stareAt = undefined;
  e.mem.chargeEnd = e.mem.acts ?? 0;
  s.bg.flags.charge = 0;
  s.sfx('se_h_boar', { level: 1 });
  const x0 = e.x;
  const st = { k: 0, side: 0, lines: 0 };
  // the body runs at the X panel, then (bend) sweeps to the other
  const xPanel = stare ? PANEL_POS[stare]?.[0] ?? 104 : 104;
  const dirX = Math.sign(xPanel + 68 - x0) || -1;
  const fx = s.addFx({
    layer: 'back',
    dur: 0,
    draw: () => {},
    update() {
      if (e.dying) {
        this.done = true;
        return;
      }
      e.sx = e.sy = 1 + 0.3 * st.k;
      e.offY = Math.round(14 * st.k);
      e.offX = Math.round(dirX * 18 * st.k + st.side);
    },
  });
  const lines = s.addFx({
    layer: 'world',
    dur: 0,
    draw: (g) => {
      if (st.lines <= 0) return;
      // three speed lines behind the swerve
      const cx = e.coreX;
      const cy = e.coreY;
      const d = -Math.sign(st.side || 1);
      g.alpha(st.lines, () => {
        for (let i = 0; i < 3; i++) thickLine(g, cx + d * 30, cy - 10 + i * 9, cx + d * 60, cy - 10 + i * 9 - 2, 2, '#F4F1E8');
      });
    },
  });
  yield* hitLoop(s, {
    ...c.common,
    // 950ms from page 1 (250ms of it already passed before the wind-up)
    windupF: 42,
    onFrame: (f, _i, toHit) => {
      if (f === 0) e.setPose('dash', sk.id);
      // 250–650ms: straight at X
      if (toHit > 18) st.k = ease.quadIn(Math.min(1, f / 24));
      if (toHit === 18) {
        if (bends) {
          s.msg.post(e.def.texts.extra.totsuBend, { autoMs: 300, minMs: 300 });
          e.setPose('bend', sk.id);
          s.sfx('se_h_boar', { level: 1, pitch: 1.15, vol: 0.7 });
        }
      }
      if (bends && toHit <= 18 && toHit >= 9) {
        const p = ease.quadOut((18 - toHit) / 9);
        const dir = Math.sign((PANEL_POS[t.id]?.[0] ?? 244) - xPanel) || 1;
        st.side = Math.round(dir * 40 * p);
        st.lines = 1 - p * 0.3;
      }
      if (toHit < 9) st.lines = Math.max(0, st.lines - 0.12);
    },
    onHit: (i, r) => {
      resolveGuard(r, i);
      s.sfx('se_bump');
      s.shake(4, 4, 10);
      damageTo(s, e, t, sk.power ?? 1.8, r);
    },
  });
  // run back to its spot
  for (let i = 0; i <= 10; i++) {
    const p = i / 10;
    st.k = 1 - ease.quadInOut(p);
    st.side = Math.round(st.side * (1 - p));
    st.lines = 0;
    yield null;
  }
  fx.done = true;
  lines.done = true;
  e.sx = e.sy = 1;
  e.offX = e.offY = 0;
  e.setPose('idle');
}

/** Green smell waves (#9BCB6B α60%) rising from the tomato and drifting to the panels. */
function smellWaves(s: BattleScene, e: EnemyUnit, to: PartyUnit[]): void {
  for (const t of to) {
    const [hx, hy] = panelHitPoint(t);
    const x0 = e.coreX + rng.int(-6, 6);
    const y0 = e.top + 6;
    const ph = rng.range(0, Math.PI * 2);
    s.addFx({
      layer: 'top',
      dur: 700,
      draw: (g, tt) => {
        const p = tt / 700;
        g.alpha(0.6 * (1 - p * 0.6), () => {
          for (let k = 0; k < 3; k++) {
            const q = Math.max(0, p - k * 0.08);
            const x = x0 + (hx - x0) * ease.quadIn(q);
            const y = y0 - 10 * Math.sin(q * Math.PI) + (hy - 8 - y0) * ease.quadIn(q);
            for (let j = 0; j < 7; j++) g.px(Math.round(x + j - 3), Math.round(y + Math.sin(j * 1.2 + ph + tt / 90) * 1.5), '#9BCB6B');
          }
        });
      },
    });
  }
}

/** The CDs flash white crosses; pale triangles of light reach the two panels. */
function cdBeams(s: BattleScene, e: EnemyUnit, to: PartyUnit[]): void {
  const cds: [number, number][] = [
    [e.left + 4, e.top + 30],
    [e.left + 44, e.top + 30],
  ];
  for (const [x, y] of cds) {
    const img = crossGlint();
    s.addFx({ layer: 'top', dur: 260, ui: true, draw: (g, t) => g.alpha(1 - t / 260, () => g.img(img, x - 3, y - 3)) });
  }
  for (const t of to) {
    const [hx, hy] = panelHitPoint(t);
    const [cx, cy] = cds[t.id === 'kanenari' ? 1 : 0];
    s.addFx({
      layer: 'world',
      dur: 220,
      draw: (g, tt) => {
        const ctx = g.ctx;
        ctx.save();
        ctx.globalAlpha = 0.4 * (1 - tt / 220);
        ctx.fillStyle = '#FFF6D8';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(hx - 22, hy + 10);
        ctx.lineTo(hx + 22, hy + 10);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      },
    });
  }
}

/** A 2px zigzag bolt (#FFF6D8, rim #FFD23F) from the fence line to a panel. */
function lightningTo(s: BattleScene, e: EnemyUnit, t: PartyUnit, i: number): void {
  const [hx, hy] = panelHitPoint(t);
  const x0 = e.left + 12 + i * 16;
  const y0 = e.top + 22 + (i % 2) * 12;
  const pts: [number, number][] = [[x0, y0]];
  const n = 7;
  for (let k = 1; k < n; k++) {
    const p = k / n;
    pts.push([x0 + (hx - x0) * p + rng.int(-7, 7), y0 + (hy - 6 - y0) * p + rng.int(-3, 3)]);
  }
  pts.push([hx, hy - 6]);
  s.addFx({
    layer: 'top',
    dur: 8 * FRAME,
    ui: true,
    draw: (g, tt) => {
      const a = tt < 3 * FRAME ? 1 : 1 - (tt - 3 * FRAME) / (5 * FRAME);
      g.alpha(Math.max(0, a), () => {
        for (let k = 0; k + 1 < pts.length; k++) {
          thickLine(g, pts[k][0], pts[k][1] + 1, pts[k + 1][0], pts[k + 1][1] + 1, 2, '#FFD23F');
          thickLine(g, pts[k][0], pts[k][1], pts[k + 1][0], pts[k + 1][1], 2, '#FFF6D8');
        }
      });
    },
  });
  s.burst(hx, hy - 6, { count: 4, speed: [40, 90], life: [150, 260], colors: ['#FFD23F', '#FFF6D8'], shape: 'star', size: [2, 2], sizeEnd: 1 }, true);
}

/** Mud splashes off the wallowing boar (#6B5A4A). */
function mudSplash(s: BattleScene, e: EnemyUnit, n = 6): void {
  for (let i = 0; i < n; i++) {
    const img = mudDrop(i);
    s.burst(e.coreX + rng.int(-14, 14), e.footY - 6, { count: 1, speed: [40, 110], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [350, 600], colors: ['#6B5A4A'], gravity: 320, shape: 'img', img });
  }
}

/** The headlight's fan of light (#FFE7A3 α35%) reaching the target panel. */
function headlightFan(s: BattleScene, e: EnemyUnit, t: PartyUnit): void {
  const [hx, hy] = panelHitPoint(t);
  const lx = e.left + 18;
  const ly = e.top + 22;
  s.addFx({
    layer: 'world',
    dur: 500,
    draw: (g, tt) => {
      const p = Math.min(1, tt / 120);
      const a = tt < 300 ? 0.35 : 0.35 * (1 - (tt - 300) / 200);
      const ctx = g.ctx;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.fillStyle = '#FFE7A3';
      ctx.beginPath();
      ctx.moveTo(lx, ly - 3);
      ctx.lineTo(lx + (hx - 34 - lx) * p, ly + (hy - 10 - ly) * p);
      ctx.lineTo(lx + (hx + 34 - lx) * p, ly + (hy + 14 - ly) * p);
      ctx.lineTo(lx, ly + 3);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    },
  });
}
