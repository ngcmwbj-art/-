// 耕うん機テツヤ (72×64, 51 9.6): Take-jii's walk-behind tiller, still
// ploughing the abandoned field all night with nobody at its handles.
// Faded blue-green body freckled with rust, an air-cooled engine with its
// fins, a round fuel tank whose gauge needle sits on E, one round headlight
// for an eye (blazing while it works all night, half-shut while resting),
// the rotary tines at the back caked with earth and grass, two long handles
// reaching back with black grips and a peeling 「タケ」 name sticker, two
// small tyres, and the exhaust puffing to the engine's beat. Faces left, into
// the lantern's light.

import type { Gfx } from '../../engine/gfx';
import { PixelCanvas } from '../../engine/pixel';
import { hash2 } from '../../engine/rng';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { Mask } from './lib';
import { INK, nightFinish, nshade } from './night';

const W = 88;
const H = 80;
const OX = 8;
const OY = 10;

const BODY = ['#122E38', '#1E4450', '#2A5A6A', '#3A7A8A', '#4A8A98', '#5A9AA8'];
const METAL = ['#3A3F48', '#4A4F58', '#6B7186', '#8E95A6', '#9AA0A8', '#C8CDD4'];
const TYRE = ['#0B0B14', '#1B1733', '#2A2440', '#3A3F48'];

interface Pose {
  /** Vibration offset (px). */
  vib?: number;
  hop?: number;
  /** Tine rotation frame 0..3. */
  tine: number;
  /** Headlight: 'on' | 'bright' | 'dim' | 'half' | 'off' | 'flicker'. */
  light: 'on' | 'bright' | 'dim' | 'half' | 'off';
  /** Lurch toward the camera (the full-throttle charge): lean px. */
  lean?: number;
  /** A bolt missing (hurt). */
  jolt?: number;
  /** Handles shaking (−1..1). */
  shake?: number;
}

function build(o: Pose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const vib = o.vib ?? 0;
  const hop = o.hop ?? 0;
  const X = (v: number) => Math.round(v + OX + (o.jolt ?? 0));
  const Y = (v: number) => Math.round(v + OY + vib - hop);
  const Yg = (v: number) => Math.round(v + OY - hop);
  // ---- handles, reaching back to the right (behind the body) ----
  const sh = o.shake ?? 0;
  for (const [dx, dy] of [[0, 0], [4, 3]] as [number, number][]) {
    const m = new Mask(W, H).line(X(46 + dx), Y(24 + dy), X(66 + dx), Y(8 + dy + sh), 1.2).line(X(66 + dx), Y(8 + dy + sh), X(70 + dx), Y(4 + dy + sh), 1.2);
    nshade(p, m, METAL, { base: dx ? 0.35 : 0.55, k: 0.5 });
    // black grips
    const g = new Mask(W, H).line(X(67 + dx), Y(7 + dy + sh), X(71 + dx), Y(3 + dy + sh), 1.6);
    nshade(p, g, ['#0B0B14', '#1B1733', '#2A2440', '#3A3456'], { base: 0.5 });
  }
  // the 「タケ」 sticker on the near handle, peeling at a corner
  const stx = X(56);
  const sty = Y(15 + Math.round(sh / 2));
  p.rect(stx, sty, 6, 4, '#F4F1E8');
  p.set(stx + 1, sty + 1, INK);
  p.set(stx + 2, sty + 1, INK);
  p.set(stx + 2, sty + 2, INK);
  p.set(stx + 4, sty + 1, INK);
  p.set(stx + 4, sty + 2, INK);
  p.set(stx + 5, sty + 2, INK);
  p.set(stx + 5, sty, '#C8C2B4');
  // ---- the rotary tines at the back, turning, clogged with earth ----
  const tcx = X(56);
  const tcy = Yg(52);
  const cover = new Mask(W, H);
  for (let a = 0; a <= 20; a++) {
    const an = Math.PI + (a / 20) * Math.PI;
    cover.ellipse(tcx + Math.cos(an) * 11, tcy + Math.sin(an) * 9, 1.6, 1.6);
  }
  nshade(p, cover, BODY, { base: 0.45 });
  const blades = new Mask(W, H);
  for (let k = 0; k < 4; k++) {
    const an = ((k + o.tine * 0.25) / 4) * Math.PI * 2;
    const x1 = tcx + Math.cos(an) * 8;
    const y1 = tcy + Math.sin(an) * 7;
    const x2 = tcx + Math.cos(an + 0.5) * 9;
    const y2 = tcy + Math.sin(an + 0.5) * 8;
    blades.line(tcx, tcy, x1, y1, 0.5).line(x1, y1, x2, y2, 0.5);
  }
  blades.each((x, y) => p.set(x, y, (x + y) % 3 === 0 ? '#C8CDD4' : '#9AA0A8'));
  p.rect(tcx - 1, tcy - 1, 3, 3, '#4A4F58');
  // earth and grass caught in the tines
  for (let i = 0; i < 7; i++) {
    const an = (i / 7) * Math.PI * 2 + o.tine * 0.6;
    const x = Math.round(tcx + Math.cos(an) * 7);
    const y = Math.round(tcy + Math.sin(an) * 6);
    p.rect(x, y, 2, 2, i % 3 === 0 ? '#3F7A3A' : '#4A3A2A');
    if (i % 3 !== 0) p.set(x, y, '#6B5A4A');
  }
  // ---- tyres (two small ones at the front) ----
  for (const [wx, far] of [[20, true], [26, false]] as [number, boolean][]) {
    const t = new Mask(W, H).ellipse(X(wx), Yg(56), 7, 7);
    nshade(p, t, TYRE, { mode: 'sphere', base: far ? 0.25 : 0.45, k: 0.6 });
    // tread blocks
    for (let a = 0; a < 12; a++) {
      const an = (a / 12) * Math.PI * 2 + o.tine * 0.3;
      p.set(Math.round(X(wx) + Math.cos(an) * 6), Math.round(Yg(56) + Math.sin(an) * 6), '#3A3F48');
    }
    if (!far) {
      p.rect(X(wx) - 1, Yg(56) - 1, 3, 3, '#8E95A6');
      p.set(X(wx) - 1, Yg(56) - 1, '#C8CDD4');
    }
  }
  // ---- the body: chassis, engine block, the tank ----
  const lean = o.lean ?? 0;
  const body = new Mask(W, H);
  body.poly([
    [X(10 - lean), Y(24)],
    [X(48), Y(22)],
    [X(52), Y(30)],
    [X(52), Y(46)],
    [X(14 - lean), Y(48)],
    [X(8 - lean), Y(38)],
  ]);
  nshade(p, body, BODY, { mode: 'bevel', bevel: 4, base: 0.55, k: 0.7, dither: 0.45 });
  // rust freckles
  body.each((x, y) => {
    // rust: a few freckles and streaks running down from the seams
    const n = hash2(x >> 1, y, 41);
    if (n < 0.02) p.set(x, y, '#8A5A2A');
    else if (n < 0.026 && hash2(x, y, 42) < 0.5) p.set(x, y, '#A8742A');
    if (y > Y(40) && hash2(x, 7, 43) < 0.18 && hash2(x, y, 44) < 0.6) p.set(x, y, '#6A4A2A');
  });
  // the engine: cooling fins in alternating light and dark
  const fins = new Mask(W, H).rect(X(28), Y(26), 16, 14);
  nshade(p, fins, METAL, { base: 0.5, k: 0.5 });
  for (let y = Y(27); y < Y(40); y += 2) p.hline(X(29), X(42), y, '#4A4F58');
  for (let y = Y(28); y < Y(40); y += 2) p.hline(X(29), X(42), y, '#9AA0A8');
  // the fuel tank: round, with its gauge (needle on E)
  const tank = new Mask(W, H).ellipse(X(36), Y(20), 9, 5);
  nshade(p, tank, BODY, { mode: 'sphere', base: 0.6, k: 0.7 });
  const gx = X(36);
  const gy = Y(19);
  for (let a = 0; a <= 8; a++) {
    const an = Math.PI + (a / 8) * Math.PI;
    p.set(Math.round(gx + Math.cos(an) * 3), Math.round(gy + Math.sin(an) * 3), '#F4F1E8');
  }
  p.hline(gx - 3, gx + 3, gy, '#F4F1E8');
  p.line(gx, gy, gx - 2, gy - 2, '#E84E3C');
  p.set(gx - 3, gy - 1, '#E84E3C');
  // the filler cap
  p.rect(X(40), Y(14), 3, 2, '#3A3F48');
  // the exhaust pipe up the back of the engine
  p.vline(X(45), Y(12), Y(26), '#3A3F48');
  p.vline(X(46), Y(12), Y(26), '#6B7186');
  p.rect(X(44), Y(11), 4, 2, '#2A2440');
  // ---- the headlight: one round eye at the front ----
  const lx = X(18 - lean);
  const ly = Y(22);
  const lamp = new Mask(W, H).ellipse(lx, ly, 6, 6);
  nshade(p, lamp, METAL, { mode: 'sphere', base: 0.75, k: 0.5 });
  const lens: Record<Pose['light'], [string, string]> = {
    on: ['#FFE7A3', '#FFF6D8'],
    bright: ['#FFF6D8', '#FFFFFF'],
    dim: ['#A89868', '#C8B888'],
    half: ['#FFE7A3', '#FFF6D8'],
    off: ['#4A4F58', '#6B7186'],
  };
  const [lc, core] = lens[o.light];
  const lm = new Mask(W, H).ellipse(lx, ly, 4.4, 4.4);
  lm.each((x, y) => p.set(x, y, lc));
  p.rect(lx - 2, ly - 2, 3, 3, core);
  p.set(lx - 3, ly - 3, '#FFFFFF');
  if (o.light === 'half') {
    // the upper half shut like a sleepy eyelid (#2A5A6A)
    lm.each((x, y) => {
      if (y <= ly) p.set(x, y, y === ly ? '#1E4450' : '#2A5A6A');
    });
  }
  nightFinish(p, 0.55, 0.45, (x, y) => (x - lx) ** 2 + (y - ly) ** 2 <= 22 || (x > tcx - 12 && y > tcy - 9));
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
/** At rest by the mountain path (32×24): the light out, the sticker half off. */
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  const p = new PixelCanvas(34, 24);
  p.line(20, 10, 31, 1, '#6B7186');
  p.rect(30, 0, 3, 2, INK);
  p.rect(4, 8, 20, 10, '#3A7A8A');
  p.hline(4, 23, 8, '#5A9AA8');
  p.rect(12, 10, 8, 6, '#9AA0A8');
  p.rect(3, 9, 5, 5, '#9AA0A8');
  p.rect(4, 10, 3, 3, '#6B7186');
  p.rect(22, 16, 8, 6, '#4A4F58');
  p.rect(5, 18, 6, 6, '#2A2440');
  p.rect(25, 5, 3, 2, '#F4F1E8');
  p.outline(INK);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_tetsuya', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (o: Pose): HTMLCanvasElement => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
      if (cache.size > 300) cache.delete(cache.keys().next().value!);
    }
    return c;
  };
  const resting = (v: EnemyView) => !!v.flags.kyuukei || v.pose === 'rest';
  return {
    id: 'enemy_tetsuya',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      // the engine beat: 5Hz, 1px
      const beat = loop(v.gt, 100, 2);
      if (resting(v)) return get({ tine: 0, light: 'half' });
      if (v.pose === 'hurt') {
        const k = Math.min(2, Math.floor(v.t / 60));
        return get({ tine: 1, light: 'dim', jolt: [2, -1, 0][k], shake: [1, -1, 0][k] });
      }
      if (v.pose === 'stall' || (f.tame && v.pose !== 'rev' && v.pose !== 'attack')) {
        // エンスト: still, the light flickering down then dark
        const fl = v.pose === 'stall' && v.t < 500 ? (Math.floor(v.t / 90) % 2 ? 'off' : 'dim') : 'dim';
        return get({ tine: 0, light: fl as Pose['light'] });
      }
      if (v.pose === 'rev' || (v.pose === 'windup' && v.skill === 'skill_tetsuya_fullthrottle')) {
        // two revs: the body jumps 2px
        const k = loop(v.t, 120, 2);
        return get({ tine: loop(v.t, 40, 4), light: 'bright', hop: k * 2, vib: beat });
      }
      if (v.pose === 'attack' && v.skill === 'skill_tetsuya_fullthrottle') return get({ tine: loop(v.t, 30, 4), light: 'bright', lean: 3, vib: beat, shake: 1 });
      if (v.pose === 'glare' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_tetsuya_light')) return get({ tine: loop(v.gt, 160, 4), light: 'bright', vib: beat });
      if (v.pose === 'spin' || ((v.pose === 'windup' || v.pose === 'attack') && v.skill === 'skill_tetsuya_rotary')) return get({ tine: loop(v.t, 35, 4), light: 'on', vib: beat, shake: beat ? 1 : 0 });
      if (v.pose === 'retill') return get({ tine: loop(v.t, 50, 4), light: 'on', vib: beat });
      if (v.pose === 'restart') return get({ tine: loop(v.t, 80, 4), light: v.t < 150 ? 'dim' : 'on', hop: v.t < 150 ? 2 : 0 });
      if (v.pose === 'refuse') return get({ tine: 0, light: 'on', shake: loop(v.t, 100, 2) ? 1 : -1 });
      // idle / 徹夜: the body shakes to the engine, the tines turn slowly
      return get({ tine: loop(v.gt, 160, 4), light: 'on', vib: beat });
    },
    over(g: Gfx, x: number, y: number, v: EnemyView): void {
      const f = v.flags;
      const ctx = g.ctx;
      const rest = !!f.kyuukei || v.pose === 'rest';
      const stalled = !!f.tame || v.pose === 'stall';
      const lx = x + OX + 18;
      const ly = y + OY + 22;
      // 徹夜中: the headlight's halo blinks (0.5s)
      if (f.tetsuya && !rest && !stalled && v.gt % 500 < 330) {
        g.alpha(0.3, () => g.circle(lx, ly, 12, '#FFE7A3'));
      }
      // the exhaust: a puff to the engine's beat (5Hz), a thin wisp of steam while it rests
      const ex = x + OX + 45;
      const ey = y + OY + 10;
      if (rest) {
        for (let i = 0; i < 3; i++) {
          const ph = ((v.gt / 1400 + i / 3) % 1);
          g.alpha(0.4 * (1 - ph), () => g.rect(Math.round(ex + Math.sin(ph * 9 + i) * 2), Math.round(ey - ph * 22), 1, 3, '#F4F1E8'));
        }
        return;
      }
      if (stalled) return;
      for (let i = 0; i < 4; i++) {
        const ph = ((v.gt / 200 + i / 4) % 1);
        const r = 1 + Math.round(ph * 3);
        g.alpha(0.5 * (1 - ph), () => {
          ctx.fillStyle = '#9AA0A8';
          ctx.fillRect(Math.round(ex + ph * 6 - r / 2), Math.round(ey - ph * 14 - r / 2), r + 1, r);
        });
      }
    },
    restored,
    gallery: [
      { pose: 'idle', flags: { tetsuya: 1 } },
      { pose: 'glare', t: 0 },
      { pose: 'spin', t: 0 },
      { pose: 'stall', t: 100 },
      { pose: 'rev', t: 0 },
      { pose: 'hurt', t: 0 },
      { pose: 'rest', flags: { kyuukei: 1 } },
    ],
  };
});
