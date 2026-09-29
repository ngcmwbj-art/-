// セキトメの技 (51 8.7、02 #65): 笛（単体）、しぶき（全体、2発）、満水（まもり+1）。
// 監視中（status_tetsuya）のラウンドの終わり・おつかれさまの閉場・再開は ch2rules /
// party_ch2 の仕組みのまま（音とテープの字は EnemyDef.duty）。

import type { Co } from '../engine/co';
import { rng } from '../engine/rng';
import { PixelCanvas } from '../engine/pixel';
import type { BossMoveCtx } from './enemy';
import { hitLoop, panelHitPoint } from './enemy';
import { changeStage } from './common';

let dropC: HTMLCanvasElement | null = null;
/** A drop of the stream (5×6): pale at the top, the lantern's orange in it. */
function drop(): HTMLCanvasElement {
  if (dropC) return dropC;
  const p = new PixelCanvas(5, 6);
  p.art(['..a..', '.aba.', 'abbba', 'bbbcb', 'bbcbb', '.bbb.'], { a: '#E8E4D8', b: '#7FD1E8', c: '#F2894B' });
  dropC = p.toCanvas();
  return dropC;
}

let pipiC: HTMLCanvasElement | null = null;
/** The whistle's 「ピッ」: three short strokes fanning out (9×9). */
function pipi(): HTMLCanvasElement {
  if (pipiC) return pipiC;
  const p = new PixelCanvas(9, 9);
  p.line(1, 4, 7, 4, '#FFF6D8');
  p.line(1, 1, 6, 0, '#FFF6D8');
  p.line(1, 7, 6, 8, '#FFF6D8');
  p.set(8, 4, '#FFE7A3');
  pipiC = p.toCanvas();
  return pipiC;
}

export const SEKI_MOVES = ['skill_seki_fue', 'skill_seki_shibuki', 'skill_seki_mansui'];

export function* sekiMove(c: BossMoveCtx): Co {
  const { s, e, sk, common, resolveGuard, target, all, pages, damageTo } = c;
  switch (sk.id) {
    case 'skill_seki_fue': {
      // 「ピーッ！」: the whistle blown at one of them (a 3-stroke burst flies at the panel)
      const t = target!;
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('whistle', sk.id);
          if (toHit === 12) {
            s.sfx('se_h_whistle');
            c.soundRings(s, e.coreX + 6, e.top + 22, '#FFF6D8', 2, 0.5, 500);
            c.projectile(s, pipi, e.coreX + 4, e.top + 22, t, 12, 1, 2.2, 0, { trail: true });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, t, sk.power ?? 1, r);
        },
      });
      break;
    }
    case 'skill_seki_shibuki': {
      // 「シャワーを あびてから！」: the pool slops over the stones at both of them, twice
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, i, toHit) => {
          if (f === 0) e.setPose('splash', sk.id);
          if (toHit === 14) {
            s.sfx('se_h_splash', { pitch: 1 + i * 0.08 });
            for (const t of all)
              for (let k = 0; k < 3; k++)
                c.projectile(s, drop, e.coreX + rng.int(-18, 18), e.top + 14, t, 14 - k, 1, 1.8, 30 + rng.int(0, 10), { lob: true, dx: rng.int(-9, 9), dy: rng.int(-6, 4) });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t) => {
            damageTo(s, e, t, sk.power ?? 0.45, r, i, true);
            const [hx, hy] = panelHitPoint(t);
            s.burst(hx, hy - 4, { count: 4, speed: [40, 100], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [250, 380], colors: ['#7FD1E8', '#E8E4D8', '#4AA8E0'], gravity: 420, shape: 'sq', size: [2, 2], sizeEnd: 1 }, true);
          });
        },
      });
      break;
    }
    case 'skill_seki_mansui': {
      // 「満水です」: one more stone lifted onto the top and set down (clack)
      yield* c.selfMove(
        s,
        common,
        resolveGuard,
        () => {
          e.setPose('stack', sk.id);
          s.sfx('se_step_stone', { pitch: 0.8 });
          s.shake(1, 1, 6);
        },
        (f) => {
          if (f === 0) e.setPose('lift', sk.id);
        },
      );
      changeStage(s, e, 'def', 1, 3, true);
      pages.push(...(e.def.texts.extra.mansuiResult ?? []));
      break;
    }
    default:
      yield 300;
  }
}
