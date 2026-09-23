// Tsukkomi (the defensive input, 10.3 / 16.6): frame windows, line choice,
// the inner-voice lettering sweeping across the screen, the flip board.

import { flag, setFlag } from '../game/state';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import type { BattleScene } from './scene';
import type { EnemyUnit, PartyUnit } from './model';
import { kakimoji, roundSeal } from './art/stamps';
import { bangBubble, flipBoardText } from './art/fxart';
import { PANEL_POS } from './ui/panels';
import { LABEL } from '../data/battle';

export interface Windows {
  show: number;
  from: number;
  to: number;
  justFrom: number;
  justTo: number;
}

export function tsukkomiWindows(): Windows {
  const wide = !!flag('flag_opt_tsukkomi_wide');
  return wide ? { show: -22, from: -20, to: 4, justFrom: -6, justTo: 0 } : { show: -12, from: -10, to: 2, justFrom: -3, justTo: 0 };
}

/** Who performs the tsukkomi right now (Minato; Kanenari-kun's flip when Minato can't). */
export function tsukkomiUnit(s: BattleScene): PartyUnit | null {
  const m = s.minato;
  const ok = (u: PartyUnit | undefined) => !!u && u.alive && !u.has('status_nemuri') && !u.has('status_rusu');
  if (ok(m)) return m!;
  const k = s.kanenari;
  if (ok(k)) return k!;
  return null;
}

/** Choose the tsukkomi line number (1-based) per 10.3. */
export function pickLine(s: BattleScene, e: EnemyUnit, skillId: string, linked: number[] | undefined): number {
  const total = e.def.tsukkomi.length;
  if (!total) return 0;
  const seen = (n: number) => !!flag(`flag_tsukkomi_${e.id}_${n}`);
  // first tsukkomi in the first battle against this enemy is always line 1
  const firstEver = ![...Array(total)].some((_, i) => seen(i + 1)) && !s.memo['tsuk_' + e.id];
  if (firstEver) return 1;
  let n = 0;
  if (linked && linked.length) {
    // semi 3-hit: line 1 the first time, line 3 afterwards; ojigi press: 1 then 2
    if (linked.length > 1) n = s.memo['used_' + skillId] ? linked[1] : linked[0];
    else n = linked[0];
  }
  if (!n) {
    const unseen = [...Array(total)].map((_, i) => i + 1).filter((k) => !seen(k));
    n = unseen.length ? rng.pick(unseen) : rng.int(1, total);
  }
  return n;
}

export function markLineSeen(s: BattleScene, e: EnemyUnit, n: number): void {
  if (!n) return;
  setFlag(`flag_tsukkomi_${e.id}_${n}`, 1);
  s.memo['tsuk_' + e.id] = 1;
}

/** "!" bubble above a panel (16×20 at panel x+24, y−24). */
export function bangPos(u: PartyUnit): [number, number] {
  const [px, py] = PANEL_POS[u.id] ?? [104, 150];
  return [px + 24, py - 24];
}

export function showBang(s: BattleScene, targets: PartyUnit[], until: () => boolean, pulse = false): void {
  for (const u of targets) {
    const [x, y] = bangPos(u);
    s.addFx({
      layer: 'top',
      dur: 0,
      ui: true,
      update() {
        if (until()) this.done = true;
      },
      draw: (g, t) => {
        const pop = t < 60 ? 1.6 - 0.6 * (t / 60) : 1;
        const pl = pulse && Math.floor(t / 120) % 2 === 0;
        const img = bangBubble(pl);
        const w = img.width * pop;
        const h = img.height * pop;
        g.ctx.drawImage(img, Math.round(x + 8 - w / 2), Math.round(y + 20 - h), Math.round(w), Math.round(h));
      },
    });
  }
}

/** The "!" pops into sweat drops (and stars on a just). */
export function popBang(s: BattleScene, targets: PartyUnit[], just: boolean): void {
  for (const u of targets) {
    const [x, y] = bangPos(u);
    s.sweat(x + 8, y + 8, 6);
    if (just) s.burst(x + 8, y + 8, { count: 6, speed: [60, 140], life: [250, 400], colors: ['#FFD23F', '#FFF6D8'], shape: 'star', size: [2, 2], sizeEnd: 1, drag: 2 }, true);
  }
}

/**
 * Inner-voice lettering: slides in from the right edge (150ms, easeOutBack),
 * drifts left 12px (250ms), then accelerates out while fading (100ms).
 * Longer than 8 chars → +30ms per char. Baseline y62.
 */
export function showKakimoji(s: BattleScene, text: string, just: boolean): void {
  const img = kakimoji(text, just, s.seed);
  const n = [...text].length;
  const extra = Math.max(0, n - 8) * 30;
  const T1 = 150;
  const T2 = 400 + extra;
  const T3 = 500 + extra;
  const cx = 192 - img.width / 2;
  const y = 62 - 32 - 3;
  const seal = just ? roundSeal('キマ\nった', 36) : null;
  s.addFx({
    layer: 'top',
    dur: T3,
    ui: true,
    draw: (g, t) => {
      let x: number;
      let a = 1;
      if (t < T1) x = 384 + (cx - 384) * ease.backOut(t / T1);
      else if (t < T2) x = cx - 12 * ((t - T1) / (T2 - T1));
      else {
        const p = (t - T2) / (T3 - T2);
        x = cx - 12 - 220 * ease.quadIn(p);
        a = 1 - p;
      }
      g.alpha(a, () => g.img(img, Math.round(x), y));
      if (seal && t > 60) {
        const st = t - 60;
        const pop = st < 67 ? 1.6 - 0.6 * (st / 67) : 1;
        const w = seal.width * pop;
        g.alpha(a, () => g.ctx.drawImage(seal, Math.round(x + img.width - 8 - w / 2 + 18), Math.round(y + 16 - w / 2), Math.round(w), Math.round(w)));
      }
    },
  });
  if (just) {
    // focus lines from the lettering centre (12, #F4F1E8 α70%, 6f)
    s.addFx({
      layer: 'top',
      dur: 100,
      ui: true,
      draw: (g) => {
        const ctx = g.ctx;
        ctx.save();
        ctx.globalAlpha = 0.7;
        ctx.fillStyle = '#F4F1E8';
        for (let i = 0; i < 12; i++) {
          const a0 = (i / 12) * Math.PI * 2 + 0.2;
          ctx.beginPath();
          ctx.moveTo(192 + Math.cos(a0) * 60, 46 + Math.sin(a0) * 40);
          ctx.lineTo(192 + Math.cos(a0 - 0.05) * 300, 46 + Math.sin(a0 - 0.05) * 300);
          ctx.lineTo(192 + Math.cos(a0 + 0.05) * 300, 46 + Math.sin(a0 + 0.05) * 300);
          ctx.fill();
        }
        ctx.restore();
      },
    });
  }
}

/** Kanenari-kun's flip tsukkomi: the board jumps up from the bottom centre (500ms). */
export function showFlip(s: BattleScene, text: string): void {
  const wrapped = wrapFlip(`（${text}）`);
  const img = flipBoardText(wrapped);
  s.sfx('se_flip');
  s.addFx({
    layer: 'top',
    dur: 700,
    ui: true,
    draw: (g, t) => {
      const up = t < 120 ? ease.backOut(t / 120) : 1;
      const a = t > 560 ? Math.max(0, (700 - t) / 140) : 1;
      const x = Math.round(192 - img.width / 2);
      const y = Math.round(216 - (216 - 60) * up);
      g.alpha(a, () => g.img(img, x, y));
    },
  });
}

function wrapFlip(t: string): string {
  const chars = [...t];
  if (chars.length <= 9) return t;
  // break at a space near the middle
  const mid = Math.floor(chars.length / 2);
  let best = -1;
  for (let i = 0; i < chars.length; i++) if (chars[i] === ' ' && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  if (best < 0) best = mid;
  return chars.slice(0, best).join('') + '\n' + chars.slice(best).join('').trim();
}

/** Label "ボケ負け" over an enemy. */
export function bokemakeLabel(s: BattleScene, e: EnemyUnit, long = false): void {
  s.label(LABEL.bokemake, e.x, e.headY - 8, 'shu', long ? 1200 : 600);
}
