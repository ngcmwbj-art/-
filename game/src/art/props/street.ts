// ひぐらし坂の小物 (30_level_art 6.5 住宅地): utility poles, the curve
// mirror, mailboxes, pots (different per house), bikes, the jizo shrine,
// garbage station, drying poles, vacant-lot junk, the barricade...

import { PixelCanvas } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { ihash } from '../tiles/noise';
import { castRight, cylinder, dk, finish, lt, maskOf } from './kit';
import { flat, flatAnim, floatOffset, mkFrames, pick, propHook, stand, standAnim } from './pkit';
import { registerProp } from './registry';
import { fontTextSmall, handGlyph, printLines, scribble, tiny } from './text';
import type { PropArt, PropEnv } from './types';
import { POLE } from './wires';

const pc = (w: number, h: number) => new PixelCanvas(w, h);

// ---------------------------------------------------------------- 電柱 prop_utility_pole

const AD: Record<string, { bg: string; fg: string; txt: string; kind?: 'poster' }> = {
  dagashi: { bg: P.red, fg: P.white, txt: 'ひのや' },
  bank: { bg: P.blue, fg: P.white, txt: '信金' },
  lostcat: { bg: P.white, fg: P.ink, txt: '猫', kind: 'poster' },
  dog: { bg: P.gold, fg: P.ink, txt: 'ふん' },
  lashes: { bg: P.peach, fg: P.white, txt: 'まつげ' },
  fishing: { bg: P.white, fg: P.verm, txt: 'つり' },
};

function poleArt(opts: Record<string, unknown>): PropArt {
  const W = 26;
  const H = 70;
  const p = pc(W, H);
  const cx = 12; // pole centre column in the image
  const foot = H - 1; // image row of the foot
  const ad = AD[String(opts.ad ?? 'bank')] ?? AD.bank;
  const trans = !!opts.trans;
  const lamp = opts.lamp !== false;
  // pole body: tapering concrete cylinder
  for (let y = foot - 64; y <= foot; y++) {
    const t = (y - (foot - 64)) / 64;
    const half = t < 0.3 ? 2 : 3;
    for (let x = cx - half; x < cx + half; x++) {
      const u = (x - (cx - half)) / (half * 2 - 1);
      p.set(x, y, u < 0.2 ? P.white : u > 0.75 ? P.steel : P.concrete);
    }
  }
  p.hline(cx - 2, cx + 1, foot - 64, P.concreteLt);
  // grime at the foot
  for (let y = foot - 5; y <= foot; y++) for (let x = cx - 3; x < cx + 3; x++) if (p.alpha(x, y) && (x + y) % 3 === 0) p.set(x, y, P.steel);
  // crossarm + insulators (wire attach points at foot-56, x = cx + {-7,0,7})
  const ay = foot - POLE.arm + 2;
  p.rect(cx - 10, ay, 20, 2, P.steel);
  p.hline(cx - 10, cx + 9, ay, P.concrete);
  p.hline(cx - 10, cx + 9, ay + 1, P.asphalt);
  for (const o of POLE.armSpan) {
    const ix = cx + o - (o === 0 ? 1 : 0);
    p.rect(ix, ay - 3, 2, 3, P.white);
    p.set(ix + 1, ay - 2, P.concrete);
    p.set(ix, ay - 3, P.glint);
  }
  // brace
  p.line(cx - 8, ay + 2, cx - 2, ay + 7, P.asphalt);
  // transformer
  if (trans) {
    const ty = foot - 50;
    p.rect(cx + 3, ty, 7, 11, P.concrete);
    p.vline(cx + 3, ty, ty + 10, P.white);
    p.vline(cx + 9, ty, ty + 10, P.steel);
    p.hline(cx + 3, cx + 9, ty, P.concreteLt);
    p.hline(cx + 3, cx + 9, ty + 10, P.asphalt);
    p.rect(cx + 5, ty - 2, 3, 2, P.steel);
    p.hline(cx + 3, cx + 9, ty + 4, P.steel);
  }
  // low cable bracket (foot-44)
  p.rect(cx - 4, foot - POLE.low - 1, 8, 2, P.asphalt);
  p.set(cx + 3, foot - POLE.low + 4, P.charcoal);
  // wrap ad band (height 18..32)
  const by = foot - 32;
  if (ad.kind === 'poster') {
    p.rect(cx - 4, by, 8, 11, P.white);
    p.rect(cx - 3, by + 1, 6, 4, P.brass);
    p.set(cx - 2, by + 2, P.brassOld);
    p.set(cx + 1, by + 3, P.wood);
    printLines(p, cx - 3, by + 6, 6, 2, P.asphalt, 7);
    p.set(cx + 3, by + 10, P.concreteLt); // curling corner
  } else {
    p.rect(cx - 3, by, 7, 14, ad.bg);
    p.vline(cx - 3, by, by + 13, lt(ad.bg));
    p.vline(cx + 3, by, by + 13, dk(ad.bg));
    scribble(p, cx - 2, by + 2, 2, ad.fg, ad.txt.length * 7 + 3, 4, true);
    p.hline(cx - 3, cx + 3, by, dk(ad.bg));
  }
  // address plate (blue band, white text)
  const ay2 = foot - 40;
  p.rect(cx - 3, ay2, 7, 5, P.navy);
  p.hline(cx - 2, cx + 2, ay2 + 2, P.white);
  p.set(cx - 2, ay2 + 1, P.white);
  // step bolts
  for (let k = 0; k < 5; k++) {
    const sy = foot - 22 - k * 6;
    if (sy > by - 1 && sy < by + 15) continue;
    const sx = k % 2 ? cx + 3 : cx - 5;
    p.hline(sx, sx + 1, sy, P.asphalt);
  }
  // security lamp (防犯灯) on an arm towards the street
  if (lamp) {
    const ly = foot - 48;
    p.hline(cx - 9, cx - 3, ly, P.steel);
    p.set(cx - 4, ly + 1, P.asphalt);
    p.rect(cx - 12, ly - 1, 5, 3, P.concreteLt);
    p.hline(cx - 12, cx - 8, ly - 1, P.white);
    p.hline(cx - 12, cx - 8, ly + 2, P.goldPale);
  }
  finish(p, { soft: true });
  const img = p.toCanvas();
  const lampX = cx - 10;
  const lampY = foot - 46;
  const ox = 8 - cx;
  const oy = 14 - H;
  return {
    ox,
    oy,
    w: W,
    h: H,
    foot: 14,
    img: () => img,
    shadow: 64,
    contact: 8,
    contactX: 8,
    glow: lamp
      ? (g, x, y, env) => {
          const on = lampState(env);
          if (on <= 0) return;
          const ctx = g.ctx;
          ctx.save();
          ctx.globalAlpha = on;
          ctx.fillStyle = P.glint;
          ctx.fillRect(Math.round(x + ox + lampX - 1), Math.round(y + oy + lampY), 4, 1);
          // pool of light on the ground (r 40, screen, α35%)
          ctx.globalCompositeOperation = 'screen';
          const gx = x + ox + lampX;
          const gy = y + 14 + 6;
          const grd = ctx.createRadialGradient(gx, gy, 2, gx, gy, 40);
          grd.addColorStop(0, 'rgba(255,231,163,0.35)');
          grd.addColorStop(1, 'rgba(255,231,163,0)');
          ctx.globalAlpha = on;
          ctx.fillStyle = grd;
          ctx.fillRect(gx - 40, gy - 30, 80, 60);
          // a thin cone from the lamp
          ctx.fillStyle = 'rgba(255,231,163,0.12)';
          ctx.beginPath();
          ctx.moveTo(x + ox + lampX - 1, y + oy + lampY + 1);
          ctx.lineTo(x + ox + lampX + 3, y + oy + lampY + 1);
          ctx.lineTo(gx + 16, gy);
          ctx.lineTo(gx - 16, gy);
          ctx.closePath();
          ctx.fill();
          ctx.restore();
        }
      : undefined,
  };
}

/** Street lamp state: off in daylight, random flicker in stage 2, on at night (0..1). */
let nightStart = -1;
export function lampState(env: PropEnv): number {
  if (env.grade.night > 0.05) {
    // 8.6: lamps come on nearest-first, 0.15s apart, with a 2-frame over-bright blink
    if (nightStart < 0 || env.t < nightStart) nightStart = env.t;
    const delay = Math.floor(env.near / 16) * 150;
    const since = env.t - nightStart - delay;
    if (since < 0) return 0;
    return since < 34 ? 1.6 : env.grade.night;
  }
  nightStart = -1;
  if (env.stage === 2) {
    // on 80–300 ms, off 2–6 s (fx_lamp_flicker), per-lamp phase
    const period = 2000 + (env.seed * 4000 + 1000) % 4000;
    const ph = (env.t + env.seed * 7919) % period;
    const len = 80 + ((env.seed * 1000) % 220);
    return ph < len ? 0.9 : 0;
  }
  return 0;
}

registerProp('prop_utility_pole', poleArt);

// ---------------------------------------------------------------- カーブミラー prop_curve_mirror

registerProp('prop_curve_mirror', () => {
  const p = pc(20, 44);
  const cx = 10;
  // post
  p.vline(cx - 1, 14, 43, P.sun);
  p.vline(cx, 14, 43, P.sunDeep);
  p.set(cx - 1, 43, P.sunShade);
  // speed plate
  p.rect(cx - 4, 26, 8, 6, P.white);
  p.strokeRect(cx - 4, 26, 8, 6, P.verm);
  p.hline(cx - 2, cx + 1, 28, P.verm);
  p.hline(cx - 2, cx + 1, 30, P.verm);
  castRight(p, cx - 4, 26, 8, 6, 2);
  // mirror: orange rim, glass
  p.ellipse(cx, 8, 7.5, 7.5, P.sunDeep);
  p.ellipse(cx, 8, 6.5, 6.5, P.sun);
  p.ellipse(cx - 0.5, 7.5, 5.5, 5.5, P.shadeDeep);
  p.set(cx - 5, 5, P.vermLt);
  p.set(cx - 4, 4, P.vermLt);
  p.hline(cx - 2, cx + 1, 15, P.sunShade);
  finish(p, { soft: true });
  const img = p.toCanvas();
  const glass = maskOf(20, 44, (x, y) => Math.hypot(x + 0.5 - (cx - 0.5), y + 0.5 - 7.5) <= 5.4);
  const a = stand(img, { shadow: 40, contact: 5 });
  a.over = (g, x, y, env) => {
    // mirror contents (fushigi_01) are drawn by the world module
    const hook = propHook('mirror');
    const mx = x + a.ox + cx - 0.5;
    const my = y + a.oy + 7.5;
    if (hook) hook(g, Math.round(mx), Math.round(my), env);
    // glass highlight 2px
    g.rect(Math.round(mx) - 3, Math.round(my) - 4, 2, 1, P.glint);
    g.rect(Math.round(mx) - 4, Math.round(my) - 3, 1, 1, P.aqua);
  };
  void glass;
  return a;
});

// ---------------------------------------------------------------- 室外機 obj_outdoor_unit (7,29)

const FAN3 = mkFrames(3, 16, 13, (p, k) => {
  p.rect(1, 1, 14, 11, P.concreteLt);
  p.hline(1, 14, 1, P.white);
  p.vline(1, 1, 11, P.white);
  p.hline(1, 14, 11, P.steel);
  p.vline(14, 2, 11, P.steel);
  p.ellipse(6, 6.5, 4.2, 4.2, P.charcoal);
  const blades = [
    [[4, 5], [5, 4], [7, 8], [8, 7]],
    [[6, 3], [6, 4], [6, 8], [6, 9]],
    [[4, 7], [5, 8], [7, 4], [8, 5]],
  ][k];
  for (const [x, y] of blades) p.set(x, y, P.steel);
  p.set(6, 6, P.concrete);
  for (let x = 2; x <= 10; x += 2) if (!p.alpha(x, 3)) p.vline(x, 2, 11, P.charcoal);
  p.ring(6, 6.5, 4.2, 4.2, P.steel);
  for (let j = 3; j < 10; j += 2) p.hline(11, 13, j, P.steel);
  p.vline(3, 12, 12, P.asphalt);
  p.vline(12, 12, 12, P.asphalt);
}, (p) => finish(p, { soft: true, rim: false }));

const outdoorUnit = () =>
  standAnim(FAN3, (env) => (env.stage === 1 || env.stage === 2 ? 0 : Math.floor(env.mt / 60) % 3), {
    base: 14,
    foot: 33,
    shadow: 0,
    contact: 0,
  });
registerProp('obj_outdoor_unit', outdoorUnit);
registerProp('prop_outdoor_unit', outdoorUnit);

// ---------------------------------------------------------------- 物干し prop_laundry_pole (1–4,24)

const LAUNDRY = mkFrames(4, 64, 30, (p, k) => {
  // posts at x=4 and x=58, pole at y=4
  for (const x of [4, 58]) {
    p.vline(x, 3, 29, P.steel);
    p.vline(x + 1, 3, 29, P.asphalt);
    p.set(x, 3, P.white);
  }
  p.hline(2, 61, 4, P.concreteLt);
  p.hline(2, 61, 5, P.steel);
  const sw = k === 0 ? 0 : k === 1 ? 1 : k === 2 ? 0 : 2; // frame 3 = NE flutter
  const lift = k === 3 ? -2 : 0;
  // Minato's green T-shirt
  const tx = 10;
  p.rect(tx, 6, 14, 5, P.leafDeep);
  p.rect(tx + 3 + sw, 11 + lift, 8, 9, P.leafDeep);
  p.hline(tx, tx + 13, 6, P.leaf);
  p.vline(tx + 3 + sw, 11 + lift, 19 + lift, P.leaf);
  p.vline(tx + 10 + sw, 11 + lift, 19 + lift, P.leafShade);
  p.rect(tx + 6 + sw, 12 + lift, 2, 2, P.white);
  // mother's apron (#F7C27A)
  const ax = 28;
  p.rect(ax, 6, 10, 3, P.sky);
  p.rect(ax + sw, 9 + lift, 10, 11, P.sky);
  p.vline(ax + sw, 9 + lift, 19 + lift, P.goldPale);
  p.vline(ax + 9 + sw, 9 + lift, 19 + lift, P.sun);
  p.rect(ax + 3 + sw, 13 + lift, 4, 3, P.sun);
  // towel
  const wx = 44;
  p.rect(wx, 6, 9, 3, P.white);
  p.rect(wx + (sw > 0 ? 1 : 0), 9 + lift, 9, 8, P.white);
  p.hline(wx, wx + 8, 12 + lift, P.aqua);
  p.vline(wx + 8 + (sw > 0 ? 1 : 0), 9 + lift, 16 + lift, P.concrete);
  // pegs
  for (const x of [11, 22, 29, 36, 45, 52]) p.set(x, 5, P.red);
}, (p) => finish(p, { soft: true }));

registerProp('prop_laundry_pole', () =>
  standAnim(LAUNDRY, pick.staged(3, 330, 1, 3), { cx: 32, base: 16, shadow: 28, contact: 0 }),
);

// ---------------------------------------------------------------- 植木鉢 (house by house)

function potBase(p: PixelCanvas, x: number, y: number, w: number, col: string): void {
  p.rect(x, y, w, 5, col);
  p.hline(x - 1, x + w, y, lt(col));
  p.vline(x, y + 1, y + 4, lt(col));
  p.vline(x + w - 1, y + 1, y + 4, dk(col));
  p.hline(x + 1, x + w - 2, y + 4, dk(col));
}

registerProp('obj_pots_1', () => {
  // three cacti and an aloe (おじいさんの家)
  const p = pc(32, 18);
  const pots = [3, 10, 17];
  for (const [i, x] of pots.entries()) {
    potBase(p, x, 12, 6, i === 1 ? P.concrete : P.skin4);
    p.rect(x + 1, 5 - i, 4, 7 + i, P.leafDeep);
    p.vline(x + 1, 5 - i, 11, P.leaf);
    p.vline(x + 4, 5 - i, 11, P.leafShade);
    for (let yy = 6 - i; yy < 11; yy += 2) p.set(x + 2 + (yy % 2), yy, P.white);
    if (i === 2) {
      p.rect(x - 1, 7, 2, 3, P.leafDeep);
      p.set(x + 3, 3, P.crimson);
    }
  }
  // aloe
  potBase(p, 25, 12, 6, P.wood);
  for (const [dx, dy] of [[-2, -6], [0, -8], [2, -7], [3, -4], [-3, -3]]) p.line(28, 11, 28 + dx, 11 + dy, P.leaf);
  p.set(28, 3, P.leafYoung);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 16, shadow: 12 });
});

registerProp('obj_pots_2', () => {
  // mini tomatoes, one red (水まきの家)
  const p = pc(16, 22);
  potBase(p, 4, 16, 8, P.skin4);
  p.vline(8, 2, 16, P.woodLt);
  for (const [x, y] of [[6, 5], [9, 7], [5, 10], [10, 11], [7, 13]]) {
    p.rect(x, y, 3, 2, P.leaf);
    p.set(x, y, P.leafYoung);
  }
  for (const [x, y, c] of [[7, 8, P.leafYoung], [9, 12, P.red], [6, 11, P.leafYoung]] as [number, number, string][]) {
    p.set(x, y, c);
    p.set(x, y + 1, dk(c));
  }
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 18 });
});

registerProp('obj_pots_3', () => {
  // seedling with a chopstick name tag (坂の上の家)
  const p = pc(12, 18);
  potBase(p, 2, 12, 8, P.concrete);
  p.vline(4, 2, 12, P.woodLt);
  p.rect(3, 3, 3, 5, P.white);
  p.set(4, 4, P.ink);
  p.set(4, 6, P.ink);
  p.line(7, 11, 8, 6, P.leaf);
  p.rect(8, 5, 2, 2, P.leafYoung);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 14 });
});

registerProp('prop_pots_row', () => {
  // geraniums along the madam's gravel
  const p = pc(28, 14);
  for (let k = 0; k < 3; k++) {
    const x = 2 + k * 9;
    potBase(p, x, 8, 7, k === 1 ? P.white : P.skin4);
    p.rect(x + 1, 3, 5, 5, P.leafDeep);
    p.set(x + 1, 3, P.leaf);
    p.rect(x + 2, 1 + (k % 2), 3, 2, k === 2 ? P.peach : P.red);
    p.set(x + 2, 1 + (k % 2), P.vermLt);
  }
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 14, shadow: 0 });
});

registerProp('prop_bonsai', () => {
  // bonsai on a plank shelf against the old house
  const p = pc(16, 20);
  p.rect(1, 14, 14, 2, P.woodLt);
  p.hline(1, 14, 15, P.wood);
  p.vline(2, 16, 19, P.wood);
  p.vline(13, 16, 19, P.wood);
  potBase(p, 4, 10, 8, P.navy);
  p.line(8, 10, 6, 6, P.woodDark);
  p.line(6, 6, 9, 4, P.woodDark);
  p.ellipse(5, 5, 3, 2, P.leafShade);
  p.ellipse(10, 3, 3, 2, P.leafDeep);
  p.set(9, 2, P.leaf);
  p.set(4, 4, P.leafDeep);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { base: 16, foot: 17, shadow: 0 });
});

// ---------------------------------------------------------------- 自転車

function bike(p: PixelCanvas, x: number, y: number, frame: string, opts: { basket?: boolean; child?: boolean; trainer?: boolean; rust?: boolean; bottle?: boolean } = {}): void {
  const wheel = (cx: number, r: number) => {
    p.ring(cx, y + 9, r, r, P.charcoal);
    p.set(cx, y + 9, P.steel);
    p.line(cx - r + 1, y + 9, cx + r - 1, y + 9, P.steel);
    if (opts.rust) p.set(cx + 1, y + 9 - r + 1, P.brassOld);
  };
  wheel(x + 4, 4);
  wheel(x + 17, 4);
  // frame
  p.line(x + 4, y + 9, x + 9, y + 4, frame);
  p.line(x + 9, y + 4, x + 16, y + 4, frame);
  p.line(x + 9, y + 4, x + 11, y + 9, frame);
  p.line(x + 11, y + 9, x + 16, y + 4, frame);
  p.line(x + 16, y + 4, x + 17, y + 9, frame);
  p.line(x + 11, y + 9, x + 4, y + 9, dk(frame));
  // saddle, handlebar
  p.hline(x + 7, x + 10, y + 2, P.charcoal);
  p.vline(x + 16, y + 1, y + 4, frame);
  p.hline(x + 15, x + 18, y + 1, P.charcoal);
  if (opts.basket) {
    p.rect(x + 17, y + 1, 5, 4, P.steel);
    for (let i = x + 17; i < x + 22; i += 2) p.vline(i, y + 1, y + 4, P.concreteLt);
    if (opts.bottle) {
      p.rect(x + 19, y - 1, 2, 3, P.blue);
      p.set(x + 19, y - 1, P.aqua);
    }
  }
  if (opts.child) {
    p.rect(x + 3, y - 1, 6, 4, P.gold);
    p.hline(x + 3, x + 8, y - 1, P.goldPale);
    p.vline(x + 3, y - 1, y + 2, P.brassOld);
  }
  if (opts.trainer) {
    p.ring(x + 2, y + 11, 1.5, 1.5, P.charcoal);
    p.line(x + 2, y + 11, x + 4, y + 9, P.steel);
  }
}

registerProp('prop_mama_bike', () => {
  const p = pc(28, 18);
  bike(p, 2, 3, P.concrete, { basket: true, child: true });
  finish(p, { soft: true });
  return stand(p.toCanvas(), { base: 16, foot: 17, shadow: 14, contact: 18 });
});

registerProp('obj_rusty_bike', () => {
  const p = pc(26, 16);
  bike(p, 2, 1, P.brassOld, { trainer: true, rust: true });
  p.set(9, 6, P.wood);
  p.set(13, 5, P.wood);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 12, contact: 16 });
});

// ---------------------------------------------------------------- プロパン / ホース / 朝顔 / 塀の穴

registerProp('prop_propane', () => {
  const p = pc(16, 22);
  for (const x of [1, 7]) {
    cylinder(p, x, 5, 6, 15, P.steel);
    p.rect(x + 1, 2, 4, 3, P.asphalt);
    p.hline(x + 1, x + 4, 2, P.steel);
    p.hline(x, x + 5, 5, P.concreteLt);
  }
  // chain
  for (let x = 1; x < 13; x += 2) p.set(x, 10, P.charcoal);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 3, shadow: 20, contact: 12 });
});

registerProp('obj_hose', () => {
  const p = pc(18, 10);
  p.ring(8, 5, 7, 4, P.leaf);
  p.ring(8, 5, 5, 2.6, P.leafDeep);
  p.ring(8, 5, 3, 1.4, P.leaf);
  p.line(14, 6, 17, 8, P.leaf);
  p.set(17, 8, P.gold);
  for (let x = 2; x < 15; x += 3) p.set(x, 2, P.leafYoung);
  return flat(p.toCanvas(), -1, 4, { contact: 0 });
});

registerProp('obj_asagao', () => {
  // green net on the wall with withered morning glories and a name tag
  const p = pc(16, 34);
  for (let y = 0; y < 30; y++)
    for (let x = 1; x < 15; x++) if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) p.set(x, y, P.leaf);
  // vines
  for (let y = 0; y < 32; y++) {
    const vx = 4 + Math.round(Math.sin(y / 3) * 2);
    p.set(vx, y, P.leafDeep);
    if (y % 5 === 0) {
      p.rect(vx - 2, y, 3, 2, P.leafDeep);
      p.set(vx - 2, y, P.leafYoung);
    }
    const vx2 = 11 + Math.round(Math.cos(y / 4) * 2);
    if (y > 6) p.set(vx2, y, P.leafDeep);
  }
  // withered flowers
  for (const [x, y, c] of [[6, 6, P.lilac], [10, 12, P.peach], [3, 19, P.lilac], [12, 22, P.peach]] as [number, number, string][]) {
    p.rect(x, y, 2, 2, c);
    p.set(x + 1, y + 2, dk(c));
  }
  // 1年生の名札
  p.rect(9, 26, 5, 7, P.white);
  p.set(11, 28, P.ink);
  p.set(11, 30, P.ink);
  return stand(p.toCanvas(), { base: 18, foot: 17, shadow: 0, contact: 0 });
});

registerProp('obj_block_hole', () => {
  const p = pc(12, 8);
  p.ellipse(6, 7, 5, 5, P.night);
  p.ellipse(6, 7, 4, 4, P.ink);
  p.set(3, 4, P.brass);
  p.set(4, 3, P.brass); // orange tabby fur
  p.hline(1, 10, 7, P.charcoal);
  return stand(p.toCanvas(), { base: 16, foot: 17, shadow: 0, contact: 0 });
});

registerProp('prop_cat_hole_moss', () => {
  const p = pc(16, 6);
  for (let x = 0; x < 16; x++) {
    const h = 1 + (ihash(x, 1, 2101) % 4);
    for (let y = 6 - h; y < 6; y++) p.set(x, y, y === 6 - h ? P.leaf : P.leafDeep);
  }
  return stand(p.toCanvas(), { base: 16, foot: 17, shadow: 0, contact: 0 });
});

// ---------------------------------------------------------------- 郵便受け・表札

registerProp('obj_minato_mailbox', () => {
  // wooden box on the gate pillar; three pizza flyers sticking out
  const p = pc(12, 11);
  p.rect(1, 2, 10, 8, P.wood);
  p.hline(1, 10, 2, P.woodLt);
  p.vline(1, 2, 9, P.woodLt);
  p.hline(1, 10, 9, P.woodDark);
  p.hline(3, 8, 4, P.woodDark);
  p.rect(2, 0, 3, 3, P.red);
  p.rect(5, 1, 2, 2, P.gold);
  p.rect(7, 0, 3, 2, P.red);
  p.set(2, 0, P.vermLt);
  finish(p, { soft: true, rim: false });
  return stand(p.toCanvas(), { base: -5, foot: 17, shadow: 0, contact: 0 });
});

registerProp('obj_minato_nameplate', () => {
  // white porcelain plate, black brush text 潮見
  const p = pc(10, 7);
  p.rect(1, 1, 8, 5, P.white);
  p.hline(1, 8, 1, P.glint);
  p.hline(1, 8, 5, P.concrete);
  p.vline(3, 2, 4, P.ink);
  p.set(4, 3, P.ink);
  p.vline(6, 2, 4, P.ink);
  p.set(7, 2, P.ink);
  p.outline(P.steel);
  return stand(p.toCanvas(), { base: 10, foot: 17, shadow: 0, contact: 0 });
});

registerProp('obj_neighbor_mailbox', () => {
  const p = pc(12, 24);
  p.vline(5, 10, 23, P.steel);
  p.vline(6, 10, 23, P.asphalt);
  p.rect(1, 2, 10, 9, P.concreteLt);
  p.hline(1, 10, 2, P.white);
  p.vline(10, 3, 10, P.steel);
  p.hline(3, 8, 5, P.charcoal);
  // 回覧板 clipped in
  p.rect(2, 0, 6, 5, P.blue);
  p.rect(3, 1, 4, 3, P.white);
  p.hline(3, 6, 2, P.steel);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 24, contact: 6 });
});

// ---------------------------------------------------------------- 犬小屋 obj_doghouse

registerProp('obj_doghouse', () => {
  const p = pc(18, 18);
  p.rect(3, 8, 12, 9, P.woodLt);
  for (let x = 3; x < 15; x += 3) p.vline(x, 8, 16, P.wood);
  p.poly([[1, 9], [9, 1], [17, 9]], P.red);
  p.line(1, 9, 9, 1, P.vermLt);
  p.line(9, 1, 17, 9, P.vermShade);
  p.hline(1, 17, 9, P.maroon);
  p.rect(7, 11, 5, 6, P.night);
  p.rect(6, 10, 7, 1, P.wood);
  // 木札 コタロウ
  p.rect(12, 11, 3, 5, P.paper);
  p.set(13, 12, P.ink);
  p.set(13, 14, P.ink);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 16 });
});

// ---------------------------------------------------------------- お地蔵さん obj_jizo (2×2)

const JIZO = mkFrames(3, 34, 38, (p, k) => {
  // wooden hut
  p.rect(4, 12, 26, 24, P.woodDark);
  p.rect(6, 14, 22, 21, P.nightShade);
  p.vline(4, 12, 35, P.wood);
  p.vline(29, 12, 35, P.ink);
  // roof
  p.poly([[0, 13], [17, 2], [34, 13]], P.charcoal);
  p.line(0, 13, 17, 2, P.asphalt);
  p.line(17, 2, 33, 13, P.ink);
  p.hline(0, 33, 13, P.ink);
  p.hline(1, 32, 12, P.steel);
  // statue
  p.ellipse(17, 22, 4, 4, P.concrete);
  p.set(15, 20, P.concreteLt);
  p.rect(13, 25, 9, 9, P.concrete);
  p.vline(13, 25, 33, P.concreteLt);
  p.vline(21, 25, 33, P.steel);
  // red bib with a hanamaru
  p.poly([[12, 25], [23, 25], [20, 31], [15, 31]], P.red);
  p.hline(12, 22, 25, P.vermLt);
  p.set(17, 28, P.white);
  p.set(16, 27, P.white);
  p.set(18, 27, P.white);
  p.set(16, 29, P.white);
  p.set(18, 29, P.white);
  // closed eyes
  p.hline(15, 16, 22, P.steel);
  p.hline(18, 19, 22, P.steel);
  // flower vases
  for (const x of [7, 26]) {
    p.rect(x, 29, 2, 5, P.leafDeep);
    p.set(x, 27, P.gold);
    p.set(x + 1, 26, P.peach);
    p.set(x - 1, 28, P.white);
  }
  // candle
  p.rect(24, 32, 2, 3, P.white);
  const lean = k === 2 ? 1 : 0;
  const flick = k === 1 ? 1 : 0;
  p.set(24 + lean, 30 + flick, P.gold);
  p.set(24 + lean, 31, P.sun);
  p.set(25 + lean, 30, k === 0 ? P.horizon : P.gold);
  // offering step
  p.rect(3, 35, 28, 3, P.concrete);
  p.hline(3, 30, 35, P.concreteLt);
}, (p) => finish(p, { soft: true }));

registerProp('obj_jizo', () => {
  const a = standAnim(JIZO, (env) => (env.stage === 1 ? 0 : env.stage === 2 ? 2 : Math.floor(env.mt / 260) % 2), {
    cx: 16,
    base: 32,
    shadow: 34,
    contact: 26,
  });
  a.glow = (g, x, y, env) => {
    const n = env.grade.night;
    if (n < 0.05) return;
    const ctx = g.ctx;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const gx = x + a.ox + 24;
    const gy = y + a.oy + 31;
    const grd = ctx.createRadialGradient(gx, gy, 1, gx, gy, 14);
    grd.addColorStop(0, `rgba(255,210,63,${0.4 * n})`);
    grd.addColorStop(1, 'rgba(255,210,63,0)');
    ctx.fillStyle = grd;
    ctx.fillRect(gx - 14, gy - 14, 28, 28);
    ctx.restore();
  };
  return a;
});

// ---------------------------------------------------------------- ゴミ集積所

registerProp('prop_garbage_station', () => {
  const p = pc(34, 26);
  // sign board on a post
  p.vline(2, 4, 25, P.steel);
  p.rect(0, 1, 14, 9, P.white);
  p.strokeRect(0, 1, 14, 9, P.leafDeep);
  printLines(p, 2, 3, 10, 2, P.leafDeep, 3);
  scribble(p, 2, 7, 2, P.verm, 17, 2); // 手書きの追記
  // garbage bags under a green net and a yellow crow net
  for (const [x, y, c] of [[8, 14, P.white], [15, 12, P.white], [22, 15, P.concreteLt], [27, 13, P.white]] as [number, number, string][]) {
    p.ellipse(x, y + 4, 5, 5, c);
    p.set(x - 2, y + 1, P.glint);
    p.set(x, y - 1, P.steel);
  }
  for (let y = 8; y < 25; y++)
    for (let x = 3; x < 33; x++) {
      if (!p.alpha(x, y)) continue;
      if ((x + y) % 3 === 0) p.set(x, y, y < 16 ? P.gold : P.leaf);
    }
  p.hline(3, 32, 24, P.leafShade);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 16, shadow: 14, contact: 28 });
});

// ---------------------------------------------------------------- 縁台と将棋盤

registerProp('prop_engawa_bench', () => {
  const p = pc(34, 16);
  // bamboo slats
  p.rect(1, 4, 32, 6, P.woodLt);
  for (let x = 1; x < 33; x += 3) p.vline(x, 4, 9, P.goldPale);
  p.hline(1, 32, 4, P.goldPale);
  p.hline(1, 32, 9, P.brassOld);
  for (const x of [2, 30]) p.rect(x, 10, 2, 5, P.wood);
  // shogi board with pieces (west half)
  p.rect(3, 1, 11, 5, P.brass);
  p.hline(3, 13, 1, P.goldPale);
  p.hline(3, 13, 5, P.brassOld);
  for (const [x, y] of [[5, 2], [8, 3], [11, 2], [6, 4]]) p.set(x, y, P.paper);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 16, shadow: 10, contact: 28 });
});

// ---------------------------------------------------------------- 家庭菜園

registerProp('prop_veg_patch', () => {
  const p = pc(48, 26);
  // soil bed
  p.rect(1, 19, 46, 6, P.wood);
  p.hline(1, 46, 19, P.woodLt);
  for (let x = 2; x < 46; x += 4) p.set(x, 21, P.woodDark);
  // cucumber net
  p.vline(3, 2, 20, P.woodLt);
  p.vline(21, 2, 20, P.woodLt);
  for (let y = 2; y < 19; y++) for (let x = 4; x < 21; x++) if ((x + y) % 4 === 0 || (x - y + 40) % 4 === 0) p.set(x, y, P.white);
  for (const [x, y] of [[6, 6], [10, 9], [14, 5], [17, 12], [8, 14]]) {
    p.rect(x, y, 3, 3, P.leaf);
    p.set(x, y, P.leafYoung);
    p.vline(x + 1, y + 3, y + 5, P.leafDeep); // cucumber
  }
  // tomato stakes
  for (const x of [28, 35, 42]) {
    p.vline(x, 3, 20, P.woodLt);
    p.rect(x - 2, 6, 5, 4, P.leafDeep);
    p.rect(x - 1, 11, 4, 4, P.leaf);
    p.set(x + 1, 8, P.red);
    p.set(x - 1, 13, P.leafYoung);
  }
  finish(p, { soft: true });
  return stand(p.toCanvas(), { cx: 24, shadow: 20, contact: 40 });
});

// ---------------------------------------------------------------- 空き地

const HAT = mkFrames(3, 16, 26, (p, k) => {
  // rusty drying stand + straw hat, ribbon sways
  p.vline(2, 3, 25, P.brassOld);
  p.vline(13, 3, 25, P.brassOld);
  p.hline(1, 14, 3, P.wood);
  p.hline(1, 14, 4, P.brassOld);
  const fy = k === 2 ? -1 : 0;
  p.ellipse(8, 9 + fy, 6, 2.5, P.goldPale);
  p.ellipse(8, 7 + fy, 3, 2.5, P.gold);
  p.hline(5, 11, 8 + fy, P.red);
  p.set(4, 7 + fy, P.glint);
  const r = k === 1 ? 1 : 0;
  p.vline(11 + r, 9 + fy, 12 + fy, P.red);
  p.set(12 + r, 12 + fy, P.vermShade);
}, (p) => finish(p, { soft: true }));

registerProp('obj_akichi_hoshimono', () => {
  const a = standAnim(HAT, (env) => (env.stage === 1 ? 0 : env.stage === 2 ? 2 : Math.floor(env.mt / 700) % 2), { shadow: 24 });
  return a;
});

registerProp('obj_akichi_sign', () => {
  const p = pc(18, 24);
  p.vline(4, 10, 23, P.wood);
  p.vline(13, 10, 23, P.wood);
  p.rect(1, 1, 16, 11, P.white);
  p.strokeRect(1, 1, 16, 11, P.blue);
  fontTextSmall(p, '売地', 2, 2, P.verm, 2);
  p.hline(3, 14, 10, P.blue);
  // the child's writing below, in crayon
  scribble(p, 3, 14, 2, P.peach, 5, 4);
  castRight(p, 1, 1, 16, 11, 1);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 22 });
});

registerProp('obj_tires', () => {
  const p = pc(18, 16);
  for (let k = 0; k < 3; k++) {
    const y = 12 - k * 4;
    p.ellipse(9, y, 7, 3.2, P.charcoal);
    p.ellipse(9, y - 0.5, 3.5, 1.3, P.night);
    p.hline(4, 13, y - 3, P.asphalt);
    p.set(3, y - 1, P.asphalt);
  }
  p.set(12, 3, P.leaf);
  p.set(13, 2, P.leafYoung);
  finish(p, { soft: true, rim: false });
  return stand(p.toCanvas(), { shadow: 14 });
});

registerProp('obj_backyard_cooler', () => {
  const p = pc(14, 12);
  p.rect(1, 3, 12, 8, P.blue);
  p.rect(1, 1, 12, 3, P.white);
  p.hline(1, 12, 1, P.glint);
  p.vline(12, 3, 10, P.navy);
  p.hline(1, 12, 10, P.navy);
  p.rect(5, 0, 4, 1, P.steel);
  p.set(2, 5, P.aqua);
  finish(p, { soft: true });
  return stand(p.toCanvas(), { shadow: 10 });
});

// ---------------------------------------------------------------- 道しるべ obj_signpost

const SIGNPOST = mkFrames(2, 22, 30, (p, k) => {
  p.vline(10, 4, 29, P.wood);
  p.vline(11, 4, 29, P.woodDark);
  const arrow = (y: number, right: boolean, ne: boolean, col: string) => {
    if (ne) {
      // tilted board pointing north-east
      for (let i = 0; i < 12; i++) {
        p.set(8 + i, y + 3 - Math.floor(i / 3), col);
        p.set(8 + i, y + 4 - Math.floor(i / 3), dk(col));
      }
      p.set(20, y - 1, col);
      p.set(19, y - 1, col);
      return;
    }
    const x0 = right ? 6 : 2;
    p.rect(x0, y, 13, 4, col);
    p.hline(x0, x0 + 12, y, lt(col));
    p.hline(x0, x0 + 12, y + 3, dk(col));
    if (right) {
      p.set(x0 + 13, y + 1, col);
      p.set(x0 + 13, y + 2, col);
      p.set(x0 + 14, y + 1, col);
    } else {
      p.set(x0 - 1, y + 1, col);
      p.set(x0 - 1, y + 2, col);
    }
    for (let i = x0 + 2; i < x0 + 11; i += 3) p.set(i, y + 1 + (i % 2), P.ink);
  };
  arrow(4, true, k === 1, P.white);
  arrow(11, false, k === 1, P.paper);
}, (p) => finish(p, { soft: true }));

registerProp('obj_signpost', () => standAnim(SIGNPOST, (env) => (env.stage === 2 ? 1 : 0), { shadow: 28 }));

// ---------------------------------------------------------------- 工事のバリケード obj_barricade (stage 0)

let BARRICADE_F: HTMLCanvasElement[] | null = null;
const barricadeFrames = () => (BARRICADE_F ??= mkFrames(2, 50, 30, (p, k) => {
  // striped bar on two stands
  for (const x of [4, 44]) {
    p.vline(x, 8, 24, P.steel);
    p.hline(x - 3, x + 3, 25, P.asphalt);
  }
  for (let x = 2; x < 48; x++) {
    const stripe = Math.floor((x + 2) / 4) % 2 === 0;
    p.set(x, 9, stripe ? P.gold : P.ink);
    p.set(x, 10, stripe ? P.gold : P.ink);
    p.set(x, 11, stripe ? P.brass : P.night);
  }
  // sign: この先 工事中（17時まで）
  p.rect(16, 0, 18, 9, P.white);
  p.strokeRect(16, 0, 18, 9, P.verm);
  fontTextSmall(p, '工事中', 17, 1, P.verm, 2);
  // four cones
  for (const x of [8, 18, 29, 39]) {
    p.poly([[x - 3, 27], [x, 15], [x + 3, 27]], P.sunDeep);
    p.hline(x - 1, x + 1, 19, P.white);
    p.hline(x - 2, x + 2, 23, P.white);
    p.vline(x - 1, 17, 26, P.vermLt);
    p.rect(x - 4, 27, 9, 2, P.sunShade);
  }
  // blinking arrow light
  p.rect(44, 2, 6, 5, P.ink);
  const on = k === 0;
  handGlyphArrow(p, 45, 3, on ? P.gold : P.brassOld);
}, (p) => finish(p, { soft: true })));

function handGlyphArrow(p: PixelCanvas, x: number, y: number, c: string): void {
  p.hline(x, x + 3, y + 1, c);
  p.set(x + 2, y, c);
  p.set(x + 2, y + 2, c);
  p.set(x + 3, y + 1, c);
}

registerProp('obj_barricade', () => {
  const a = standAnim(barricadeFrames(), pick.loopT(2, 500), { cx: 24, base: 16, shadow: 26, contact: 44 });
  a.glow = (g, x, y, env) => {
    if (Math.floor(env.t / 500) % 2) return;
    g.rect(x + a.ox + 45, y + a.oy + 3, 4, 3, P.gold, 0.6);
  };
  return a;
});

// ---------------------------------------------------------------- 地面の小物（段階で変わる）

registerProp('decal_cone_mark', () => {
  const p = pc(48, 16);
  for (const x of [8, 18, 29, 39]) {
    p.ring(x, 9, 4, 2.5, P.asphalt);
    p.set(x - 2, 8, P.steel);
    p.set(x + 3, 10, P.charcoal);
  }
  return flat(p.toCanvas(), 0, 0);
});

const PUDDLE = (() => {
  const p = pc(24, 10);
  p.ellipse(12, 5, 11, 4.2, P.charcoal);
  p.ellipse(12, 5.3, 10, 3.6, P.navy);
  p.ellipse(7, 4.3, 4.5, 2.2, P.navy);
  return p;
})();

registerProp('decal_puddle', () => {
  // water puddle reflecting the sky (7.3); stage 2 it trickles north-east
  const img = PUDDLE.toCanvas();
  const glass = maskOf(24, 10, (x, y) => PUDDLE.get(x, y) === PUDDLE.get(12, 5));
  const a = flat(img, 0, 3, { glass });
  a.over = (g, x, y, env) => {
    // ripples from the watering hose (expanding rings) and glints
    const r = ((env.t / 90) % 10) | 0;
    g.rect(x + 12 - r, y + 8, r * 2, 1, P.glint, 0.35 * (1 - r / 10));
    g.rect(x + 5, y + 6, 3, 1, P.glint, 0.6);
    g.rect(x + 15, y + 9, 2, 1, P.glint, 0.4);
    if (env.stage !== 2) return;
    // thin stream towards the mall
    for (let k = 0; k < 14; k++) g.rect(x + 18 + k, y + 4 - Math.floor(k / 2), 1, 1, P.aqua, 0.5);
  };
  return a;
});

const SOKKO = mkFrames(2, 16, 16, (p, k) => {
  p.rect(3, 4, 10, 8, P.charcoal);
  for (let x = 3; x < 13; x += 2) p.vline(x, 4, 11, P.steel);
  p.hline(3, 12, 4, P.concreteLt);
  // the marble in the gap
  p.set(8, 8, P.aqua);
  if (k === 1) p.set(8, 7, P.glint);
});

registerProp('obj_sokko', () => flatAnim(SOKKO, (env) => (Math.floor(env.t / 2000) % 4 === 0 ? 1 : 0)));

export { bike, potBase, lampState as poleLampState };
