// 星見の丘 (52_ch2_level_art 5章, 11.3): the village observatory's white dome
// (its slit closed, a paper on the door), the disaster loudspeaker's pole
// (ヨビモドシ in the field: grey concrete, the control box, the red lamp
// breathing every 2 s, four horn speakers, the antenna's point of light),
// the empty telescope pier, the bench of the star parties, the fallen sign
// of the viewing party, the cedars along the path (one with three height
// marks) and the slope beyond the east fence.

import type { Gfx } from '../../engine/gfx';
import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { registerBuilding, type Bld } from './bkit';
import { castRight, outline } from './kit';
import { glowDot, HLIGHT, hs, nightK, standProp } from './hoshi_kit';
import { drawLight, poolEllipse } from './light';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

// ---------------------------------------------------------------- 村営天文台 (1,1) 7×(3+2)

registerBuilding({
  id: 'prop_h_dome',
  W: 7,
  R: 3,
  F: 2,
  top: 10,
  band: 0,
  paint(b: Bld) {
    const p = b.p;
    const W = 112;
    const fY = b.faceY;
    const cx = 56;
    const rimY = fY - 1; // the centre of the drum's top rim (an ellipse seen from above)
    const RX = 54;
    const RY = 11;
    const drumTop = (x: number) => rimY + RY * Math.sqrt(Math.max(0, 1 - ((x - cx) / RX) ** 2));
    // the flat ring of the drum's top, round the dome
    for (let y = rimY - RY; y <= rimY + RY; y++)
      for (let x = cx - RX; x <= cx + RX; x++) {
        const d = ((x - cx) / RX) ** 2 + ((y - rimY) / RY) ** 2;
        if (d > 1) continue;
        p.set(x, y, d > 0.86 ? P.concreteLt : (x + y) % 9 === 0 ? P.steel : P.concrete);
      }
    // the dome: a white half sphere on the drum, lit from the upper left
    const DX = 47;
    const DH = 52;
    for (let y = rimY - DH; y <= rimY + 4; y++)
      for (let x = cx - DX; x <= cx + DX; x++) {
        const u = (x - cx) / DX;
        const top = rimY - DH * Math.sqrt(Math.max(0, 1 - u * u));
        const bot = rimY + 4 * Math.sqrt(Math.max(0, 1 - u * u));
        if (y < top || y > bot) continue;
        const v = (y - top) / Math.max(1, bot - top);
        const lit = -u * 0.7 - (1 - v) * 0.5 + 0.2;
        let c: string = lit > 0.35 ? P.white : lit > -0.05 ? P.concreteLt : lit > -0.45 ? P.concrete : P.steel;
        if (Math.abs(y - top) < 1) c = P.lilac; // the starlit rim (#7A5AA0)
        p.set(x, y, c);
      }
    // the ribs of the dome's panels
    for (const k of [-0.66, -0.33, 0.33, 0.66])
      for (let y = rimY - DH; y <= rimY + 3; y++) {
        const t = (y - (rimY - DH)) / (DH + 3);
        const x = Math.round(cx + k * DX * Math.sqrt(Math.max(0, 1 - (1 - t) ** 2)));
        if (p.get(x, y) >>> 24 && p.get(x, y) !== 0) p.set(x, y, k < 0 ? P.concrete : P.steel);
      }
    // the slit (#3A3F48), its shutters closed, running over the top to the south
    for (let y = rimY - DH + 1; y <= rimY + 3; y++) {
      p.set(cx - 4, y, P.steel);
      for (let x = cx - 3; x <= cx + 3; x++) p.set(x, y, y % 4 === 0 ? P.asphalt : P.charcoal);
      p.set(cx + 4, y, P.asphalt);
    }
    // ---- the drum's front: a cylinder (lit left, dark right), the door (4,5) with its paper
    for (let x = 2; x < W - 2; x++) {
      const t0 = Math.round(drumTop(x));
      const u = (x - 2) / (W - 5);
      for (let y = t0; y < b.botY; y++) {
        let c: string = u < 0.15 ? P.white : u < 0.55 ? P.concreteLt : u < 0.85 ? P.concrete : P.steel;
        if (y === t0) c = P.white;
        if ((y - t0) % 9 === 8) c = mix(c, P.steel, 0.5);
        if (y === b.botY - 1) c = P.asphalt;
        p.set(x, y, c);
      }
    }
    const dx = 50;
    const dTop = Math.round(drumTop(dx)) + 4;
    p.rect(dx, dTop, 13, b.botY - dTop, P.steel);
    p.rect(dx + 1, dTop + 1, 11, b.botY - dTop - 1, P.concrete);
    p.vline(dx + 6, dTop + 1, b.botY - 1, P.steel);
    p.rect(dx + 2, dTop + 5, 6, 6, P.white); // 『観望会 休止中』
    for (let k = 0; k < 3; k++) p.hline(dx + 3, dx + 6, dTop + 6 + k * 2, k === 0 ? P.verm : P.ink);
    p.set(dx + 10, dTop + 12, P.charcoal);
    // a small dark window and a vent
    p.rect(20, fY + 12, 8, 6, P.nightShade);
    p.strokeRect(20, fY + 12, 8, 6, P.steel);
    p.rect(84, fY + 14, 10, 4, P.steel);
    for (let x = 85; x < 94; x += 2) p.set(x, fY + 15, P.charcoal);
    castRight(p, dx, dTop, 13, b.botY - dTop, 2);
  },
});

// ---------------------------------------------------------------- 防災無線の柱 (15–16,2–3)

function speakerPole(lampOn: boolean): HTMLCanvasElement {
  const W = 36;
  const H = POLE_H;
  const p = new PixelCanvas(W, H);
  const cx = 17;
  const foot = H - 1;
  // the concrete pole (tapering), moss specks
  for (let y = 16; y <= foot; y++) {
    const half = y < 34 ? 2 : 3;
    for (let x = cx - half; x < cx + half; x++) {
      const u = (x - (cx - half)) / (half * 2 - 1);
      let c: string = u < 0.25 ? P.concreteLt : u > 0.7 ? P.asphalt : P.steel;
      if (h01(x, y, 4301) < 0.05) c = P.leaf;
      p.set(x, y, c);
    }
  }
  // the foot's plate (the nameplate) and base
  p.rect(cx - 6, foot - 3, 12, 4, P.concrete);
  p.hline(cx - 6, cx + 5, foot - 3, P.concreteLt);
  p.rect(cx - 2, foot - 10, 5, 4, P.white);
  p.hline(cx - 1, cx + 2, foot - 8, P.steel);
  // the control box (#8E95A6) with a white line on its door
  const by = 34;
  p.rect(cx - 7, by, 14, 14, '#8E95A6');
  p.hline(cx - 7, cx + 6, by, P.concrete);
  p.vline(cx - 7, by, by + 13, P.concrete);
  p.vline(cx + 6, by + 1, by + 13, P.asphalt);
  p.hline(cx - 5, cx + 4, by + 6, P.white);
  p.set(cx + 3, by + 11, P.charcoal);
  // the red lamp on top of the box (3×3)
  p.rect(cx - 1, by - 4, 3, 3, lampOn ? P.red : P.asphalt);
  p.set(cx - 1, by - 4, lampOn ? P.vermLt : P.steel);
  p.rect(cx - 2, by - 1, 5, 1, P.charcoal);
  // the horns at the top: south (its mouth to us), east and west in profile, north behind the pole
  const hy = 18;
  p.hline(cx - 12, cx + 11, hy + 4, P.asphalt); // the mount
  // west horn (profile, opening left)
  p.poly([[cx - 4, hy + 2], [cx - 14, hy - 2], [cx - 14, hy + 9], [cx - 4, hy + 6]], '#C8CDD4');
  p.vline(cx - 14, hy - 2, hy + 9, P.steel);
  p.vline(cx - 15, hy - 1, hy + 8, P.ink);
  // east horn (profile, opening right)
  p.poly([[cx + 3, hy + 2], [cx + 13, hy - 2], [cx + 13, hy + 9], [cx + 3, hy + 6]], '#C8CDD4');
  p.vline(cx + 13, hy - 2, hy + 9, P.asphalt);
  p.vline(cx + 14, hy - 1, hy + 8, P.ink);
  // north horn: only its rim above the others
  p.hline(cx - 4, cx + 3, hy - 4, P.steel);
  p.hline(cx - 3, cx + 2, hy - 5, '#C8CDD4');
  // south horn: the round mouth facing us
  p.ellipse(cx - 0.5, hy + 5, 6, 6, '#C8CDD4');
  p.ellipse(cx - 0.5, hy + 5, 4.5, 4.5, P.ink);
  p.ellipse(cx - 0.5, hy + 5, 2, 2, P.night);
  p.set(cx - 4, hy + 1, P.white);
  // the antenna and its point of light
  p.vline(cx, 0, hy - 4, P.steel);
  p.set(cx, 0, P.glint);
  p.hline(cx - 2, cx + 2, 6, P.steel);
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

/** The pole is 62px: its foot is (15–16,3), and the map's top edge is 64px above that (52 11.3 said 120). */
const POLE_H = 62;

registerProp('prop_h_speaker_pole', () => {
  const on = speakerPole(true);
  const off = speakerPole(false);
  const lampOn = (env: PropEnv) => !env.flag('flag_ch2_boss_beaten');
  // the lamp breathes over 2 s
  const k = (env: PropEnv) => 0.55 + 0.45 * Math.sin((env.t / 2000) * Math.PI * 2);
  const a: PropArt = {
    ox: 16 - 17,
    oy: 32 - POLE_H,
    w: 36,
    h: POLE_H,
    foot: 31,
    img: (env) => (lampOn(env) ? on : off),
    shadow: 56,
    contact: 12,
    contactX: 16,
    xray: 0.3,
    glow(g: Gfx, x: number, y: number, env: PropEnv) {
      if (!lampOn(env)) return;
      const lx = x + 16;
      const ly = y + 32 - POLE_H + 34 - 3;
      const kk = k(env);
      glowDot(g, lx, ly, '#FF6A4D', HLIGHT.red, 8, 0.9 * kk);
      g.rect(lx - 1, ly - 1, 3, 3, '#E84E3C', 0.8 * kk);
      g.rect(lx, ly - 1, 1, 1, '#FFF6D8', 0.6 * kk);
      g.rect(x + 16, y + 32 - POLE_H, 1, 1, '#FFF6D8', 0.8); // the antenna's point
    },
    light(g: Gfx, x: number, y: number, env: PropEnv) {
      if (!lampOn(env)) return;
      // a red circle on the ground at its foot (#E84E3C α12%, 40px)
      drawLight(g, poolEllipse(40, 26, HLIGHT.red), x + 16, y + 30, 0.28 * k(env) * Math.max(0.4, nightK(env)));
    },
  };
  return a;
});

// ---------------------------------------------------------------- the pier, the bench, the sign

registerProp('prop_h_pier', () =>
  standProp(
    16,
    18,
    (p) => {
      p.rect(1, 3, 14, 15, P.concrete);
      p.rect(1, 3, 14, 11, P.concreteLt);
      p.hline(1, 14, 3, P.white);
      p.vline(14, 4, 17, P.steel);
      p.hline(1, 14, 17, P.asphalt);
      for (const [x, y] of [[4, 6], [11, 6], [4, 11], [11, 11]]) {
        p.set(x, y, P.charcoal);
        p.set(x, y - 1, P.steel);
      }
      p.set(3, 15, P.leafShade);
    },
    { cx: 8, base: 16, shadow: 14 },
  ),
);

registerProp('prop_h_hill_bench', () =>
  standProp(
    32,
    20,
    (p) => {
      // a wooden bench; 「星を 見る 人の 席」 burnt into its backrest (a line of marks)
      p.rect(1, 2, 30, 5, P.woodLt);
      p.hline(1, 30, 2, P.goldPale);
      p.hline(1, 30, 6, P.wood);
      for (let x = 5; x < 27; x += 3) p.set(x, 4, P.woodDark);
      p.rect(1, 10, 30, 4, P.woodLt);
      p.hline(1, 30, 10, P.goldPale);
      p.hline(1, 30, 13, P.wood);
      for (const lx of [3, 28]) {
        p.vline(lx, 7, 19, P.woodDark);
        p.vline(lx + 1, 14, 19, P.wood);
      }
    },
    { cx: 16, base: 16, shadow: 0 },
  ),
);

registerProp('prop_h_kanbou_board', () => {
  const fallen = new PixelCanvas(24, 14);
  // 『観望会 会場まで あと 300m』 on its back in the weeds
  fallen.poly([[1, 6], [20, 3], [22, 10], [3, 13]], P.woodLt);
  fallen.line(1, 6, 20, 3, P.goldPale);
  for (let k = 0; k < 3; k++) fallen.line(5, 8 + k, 15, 6 + k, k === 1 ? P.navy : P.wood);
  fallen.line(20, 9, 23, 13, P.woodDark);
  outline(fallen, { bottom: true, soft: true });
  const up = new PixelCanvas(20, 26);
  up.vline(9, 10, 25, P.woodDark);
  up.vline(10, 10, 25, P.wood);
  up.rect(1, 1, 18, 10, P.woodLt);
  up.hline(1, 18, 1, P.goldPale);
  up.hline(3, 15, 4, P.navy);
  up.hline(3, 11, 7, P.wood);
  up.set(16, 7, P.verm);
  outline(up, { bottom: true, soft: true });
  const F = fallen.toCanvas();
  const U = up.toCanvas();
  return {
    ox: -4,
    oy: 16 - 26,
    w: 24,
    h: 26,
    foot: 15,
    img: (env: PropEnv) => (env.flag('flag_seen_obj_hoshi_kanbou_board') ? U : F),
    over: undefined,
  } as PropArt;
});

/** A cedar trunk standing in the path's bend (the `T` tiles); `marks` = three height scratches. */
registerProp('prop_h_hill_trunk', (opts) => {
  const v = Number(opts.v ?? 0);
  const marks = !!opts.marks;
  return standProp(
    16,
    48,
    (p) => {
      for (let y = 0; y < 48; y++)
        for (let x = 3; x < 13; x++) {
          const u = (x - 3) / 9;
          let c: string = u < 0.2 ? P.wood : u > 0.7 ? P.ink : P.woodDark;
          if ((y * 3 + x + v) % 9 === 0 && u > 0.15 && u < 0.7) c = P.wood;
          p.set(x, y, c);
        }
      p.poly([[0, 47], [3, 38], [3, 47]], P.woodDark);
      p.poly([[15, 47], [12, 39], [12, 47]], P.ink);
      if (marks)
        for (const [y, len] of [[20, 4], [26, 5], [31, 4]] as const) {
          p.hline(5, 5 + len, y, P.woodLt);
          if (y === 20) p.set(5, y, P.goldPale);
        }
    },
    { cx: 8, base: 16, shadow: 44 },
  );
});

/** Beyond the east fence (x23): the slope's cedar tops; in h2 the sky over them lightens (#3A2B5C). */
registerProp('prop_h_hill_view', () => {
  const p = new PixelCanvas(16, 7 * 16);
  for (let y = 0; y < p.h; y++)
    for (let x = 8; x < 16; x++) {
      const tip = (y + (x % 4) * 3) % 12;
      p.set(x, y, tip < 3 ? P.leafShade : tip < 8 ? P.night : P.void);
    }
  const base = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: 16,
    h: 112,
    foot: 0,
    flat: true,
    img: () => base,
    over(g: Gfx, x: number, y: number, env: PropEnv) {
      const s = hs(env);
      if (s < 2) return;
      g.rect(x + 8, y, 8, 112, s >= 3 ? '#F7C27A' : '#3A2B5C', s >= 3 ? 0.35 : 0.55);
    },
  } as PropArt;
});

void ihash;
