// ヒキヅナの技（二人十五脚 02 #82、data/battle/enemy_hikizuna.ts）：綱引き（単体。からみついて 引く）、
// オーエス（全体、2発。ひとりで かけ声）、ずるずる（単体。北東へ 引きずる）、とぐろ（まもり +1）。
// 音は 校庭の 綱の 音（audio/sfx_kotei.ts：se_kotei_zuru・se_kotei_maru）。

import type { Co } from '../engine/co';
import type { BossMoveCtx } from './enemy';
import { hitLoop, panelHitPoint } from './enemy';
import { changeStage } from './common';

export const HIKI_MOVES = ['skill_hiki_tsuna', 'skill_hiki_oesu', 'skill_hiki_zuru', 'skill_hiki_toguro'];

export function* hikiMove(c: BossMoveCtx): Co {
  const { s, e, sk, common, resolveGuard, target, all, pages, damageTo } = c;
  switch (sk.id) {
    case 'skill_hiki_tsuna':
    case 'skill_hiki_zuru': {
      // the rope's end lashes out at one of them and pulls (ずるずる: and drags to the north-east)
      const t = target!;
      const zuru = sk.id === 'skill_hiki_zuru';
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('windup', sk.id);
          if (toHit === 10) {
            e.setPose('attack', sk.id);
            c.rush(s, e, { scale: 1.08, dy: 6, dx: c.towardX(e, t, 0.16, 14), inF: 8, holdF: zuru ? 10 : 4, outF: 12 });
            s.sfx('se_kotei_zuru', { pitch: zuru ? 0.9 : 1.15 });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, t, sk.power ?? 1, r);
          if (zuru && !r) {
            const [hx, hy] = panelHitPoint(t);
            s.burst(hx + 6, hy - 2, { count: 5, speed: [40, 90], angle: [-Math.PI * 0.45, -Math.PI * 0.05], life: [250, 380], colors: ['#C8A06A', '#8A5A3A', '#E8C890'], gravity: 160, shape: 'sq', size: [1, 2] }, true);
          }
        },
      });
      break;
    }
    case 'skill_hiki_oesu': {
      // 「オーエス！ オーエス！」: it heaves twice at nobody — the slack whips both of them
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, i, toHit) => {
          if (f === 0) e.setPose('windup', sk.id);
          if (toHit === 12) {
            e.setPose('attack', sk.id);
            c.lunge(s, e, 1.06, 10);
            s.sfx('se_kotei_zuru', { pitch: 1 + i * 0.12, vol: 0.9 });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.45, r, i, true));
        },
      });
      break;
    }
    case 'skill_hiki_toguro': {
      // とぐろ: it coils itself up tight (まもり +1)
      yield* c.selfMove(
        s,
        common,
        resolveGuard,
        () => {
          e.setPose('coil', sk.id);
          s.sfx('se_kotei_maru');
        },
        (f) => {
          if (f === 0) e.setPose('windup', sk.id);
        },
      );
      changeStage(s, e, 'def', 1, 3, true);
      pages.push(...(e.def.texts.extra.toguroResult ?? []));
      break;
    }
    default:
      yield 300;
  }
}
