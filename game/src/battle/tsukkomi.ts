// Tsukkomi (the defensive input, 10.3 / 16.6): frame windows, line choice,
// the inner-voice lettering sweeping across the screen, the flip board.

import { flag, setFlag } from '../game/state';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import type { BattleScene } from './scene';
import { STAGE_TOP } from './scene';
import type { EnemyUnit, PartyUnit } from './model';
import { kakimoji, roundSeal } from './art/stamps';
import { bangBubble, flipBoardText } from './art/fxart';
import { PANEL_POS } from './ui/panels';
import { LABEL, TUT } from '../data/battle';
import { C } from './ui/note';

/** Top of the inner-voice lettering canvas (text ≈ y59–91). */
export const KAKI_TOP = 54;

export interface Windows {
  show: number;
  from: number;
  to: number;
  justFrom: number;
  justTo: number;
}

/**
 * 10.3 frame windows (hit = 0f). The window opens on the frame the "!" pops,
 * not two frames later: the tutorial says 「敵の！に合わせて決定」, so a press
 * answering the "!" is never a かぶせ — only a press before it is. The just
 * window is unchanged.
 */
export function tsukkomiWindows(): Windows {
  const wide = !!flag('flag_opt_tsukkomi_wide');
  return wide ? { show: -22, from: -22, to: 4, justFrom: -6, justTo: 0 } : { show: -12, from: -12, to: 2, justFrom: -3, justTo: 0 };
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
      block: () => (until() ? null : { x0: x - 5, y0: y - 4, x1: x + 21, y1: y + 20 }),
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

/** Frames before the hit at which the closing ring appears around the "!" spot. */
export const RING_LEAD = 30;

export interface TsukRing {
  /** Frames relative to the hit (negative before it). */
  rel: number;
  /** live: closing; gray: jumped the gun (かぶせ); ok: answered (pops); done: gone. */
  state: 'live' | 'gray' | 'ok' | 'done';
  /** ms since it answered (the pop). */
  okT: number;
}

/**
 * The closing ring (QA round 2): the "!" comes 12 frames before the hit
 * (★ 6.3) — too short for a player who only reacts to it (≈ 220–280ms), and
 * the tutorial could not say why they failed. So from 30 frames out a thin
 * ring closes on the "!" spot at a constant speed and meets the bubble's rim
 * exactly on the hit frame, turning gold in the just window: the wind-up now
 * has a visible rhythm to press along with. The frame windows are unchanged.
 */
export function showTsukRing(s: BattleScene, targets: PartyUnit[], st: TsukRing): void {
  const justFrom = tsukkomiWindows().justFrom;
  for (const u of targets) {
    const [bx, by] = bangPos(u);
    const cx = bx + 8;
    const cy = by + 10;
    s.addFx({
      layer: 'top',
      dur: 0,
      ui: true,
      update(dt) {
        if (st.state === 'ok') st.okT += dt / targets.length;
        if (st.state === 'done' || (st.state === 'ok' && st.okT > 120)) this.done = true;
      },
      draw: (g) => {
        if (st.state === 'done') return;
        const k = Math.max(0, Math.min(1, -st.rel / RING_LEAD));
        let r = 12 + 20 * k;
        let a = 0.35 + 0.65 * (1 - k);
        let col = '#F4F1E8';
        if (st.state === 'gray') col = '#9AA0A8';
        else if (st.state === 'ok') {
          const p = Math.min(1, st.okT / 120);
          r = 12 + 8 * p;
          a = 1 - p;
          col = '#FFD23F';
        } else if (st.rel >= justFrom) col = '#FFD23F';
        const rr = Math.round(r);
        g.alpha(a, () => {
          g.ring(cx, cy, rr + 1, C.ink);
          g.ring(cx, cy, rr, col);
          if (st.rel >= justFrom && st.state === 'live') g.ring(cx, cy, rr - 1, '#FFF6D8');
        });
      },
    });
  }
}

/**
 * A press that came just after the window closed: the player is reacting to
 * the "!" too late. Once per battle (and three times in all) the sticky
 * points at the ring and at ツッコミ判定：ひろい.
 */
export function lateTip(s: BattleScene): void {
  s.memo.lateTsuk = (s.memo.lateTsuk ?? 0) + 1;
  if (s.memo.stk_rhythm || flag('flag_tut_tsuk_late') >= 3 || flag('flag_opt_tsukkomi_wide')) return;
  setFlag('flag_tut_tsuk_late', flag('flag_tut_tsuk_late') + 1);
  s.memo.stk_rhythm = 1;
  s.sticky = { text: TUT.rhythm, t: -300, ttl: 3400 };
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
export function showKakimoji(s: BattleScene, text: string, just: boolean): number {
  const img = kakimoji(text, just, s.seed);
  const n = [...text].length;
  const extra = Math.max(0, n - 8) * 30;
  const T1 = 150;
  const T2 = 400 + extra;
  const T3 = 500 + extra;
  const cx = 192 - img.width / 2;
  // over the enemies' upper half (baseline ≈ y90), clear of the band (y4–48)
  const y = KAKI_TOP;
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
          const fy = KAKI_TOP + 22;
          ctx.moveTo(192 + Math.cos(a0) * 60, fy + Math.sin(a0) * 40);
          ctx.lineTo(192 + Math.cos(a0 - 0.05) * 300, fy + Math.sin(a0 - 0.05) * 300);
          ctx.lineTo(192 + Math.cos(a0 + 0.05) * 300, fy + Math.sin(a0 + 0.05) * 300);
          ctx.fill();
        }
        ctx.restore();
      },
    });
  }
  return T3;
}

/** Kanenari-kun's flip tsukkomi: the board jumps up from the bottom centre (500ms). */
export function showFlip(s: BattleScene, text: string): number {
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
  return 700;
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

/**
 * Label "ボケ負け" over an enemy — after the lettering has crossed (`delay`),
 * so the two never sit on top of each other; kept under the band.
 */
export function bokemakeLabel(s: BattleScene, e: EnemyUnit, long = false, delay = 0): void {
  if (e.def.boss) {
    // the boss: beside its school cap (else under its brim), never over the
    // name-tag eyes — those are what the label is about
    const cap = { x0: e.left + 50, y0: e.top + 8, x1: e.left + 110, y1: e.top + 28 };
    s.labelNear(LABEL.bokemake, () => cap, ['right', 'left', 'below'], 'shu', long ? 1200 : 600, false, delay);
    return;
  }
  // on the head (tall enemies: just under the band), sliding off a sticky,
  // the card or a number that is still up
  const hy = Math.max(STAGE_TOP + 10, e.headY - 8);
  s.labelNear(LABEL.bokemake, () => ({ x0: e.x - 10, y0: hy - 8, x1: e.x + 10, y1: hy + 8 }), ['center', 'below', 'right', 'left'], 'shu', long ? 1200 : 600, false, delay);
}
