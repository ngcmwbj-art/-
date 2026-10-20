// The things of 海ぞいの町 (62_ch3_level_art 3.5・3.6・7.3): the siren tower
// on the hill (the town's backbone), the red lighthouse at the end of the
// breakwater, the fishing boats, and the small things of the quay, the
// market's yard, the beach and the hill. Everything stands still at 12:00
// (stage 1): what moves at 12:01 (stage 2) reads flag_ch3_stage.
//
// Colours: 62 8.1 (CP in tiles/c3_ground.ts) over the master palette.

import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash } from '../tiles/noise';
import { P } from '../tiles/palette';
import { CP } from '../tiles/c3_ground';
import { outline } from './kit';
import { standProp } from './hoshi_kit';
import { fontTextSmall } from './text';
import { registerProp } from './registry';
import { drawLight, halo, LIGHT, poolEllipse } from './light';
import type { PropArt, PropEnv } from './types';

const c3stage = (env: PropEnv): number => env.flag('flag_ch3_stage');

// ---------------------------------------------------------------- サイレン塔 (33,2): 4×5 tiles, 112 px of tower

/**
 * The siren tower: a square concrete shaft rising from a plinth, the clock
 * high on its south face (12:00, both hands on the 12), the iron door at its
 * foot, a lookout with a red-primed rail on top and the motor siren facing
 * south under its rusty cone hat. The black stamp 「まだ」 on the siren's
 * plate while the town is stopped (stage 1).
 */
function sirenTower(stage: number): HTMLCanvasElement {
  const W = 64;
  const H = 112;
  const p = new PixelCanvas(W, H);
  const foot = H - 1;
  const conc = '#C8C4B8';
  const concLt = '#E0DCD0';
  const concDk = '#9A968C';
  const prime = CP.siren;
  // the plinth (the base on the plaza)
  p.rect(6, foot - 14, 52, 14, concDk);
  p.rect(6, foot - 14, 52, 3, concLt);
  p.hline(6, 57, foot - 11, conc);
  p.vline(57, foot - 13, foot, '#7A766C');
  // the shaft: 34 px wide, lit face (the sun is in the south), the east side a step darker
  const sx = 15;
  const sw = 34;
  const top = 40;
  for (let y = top; y < foot - 12; y++)
    for (let x = sx; x < sx + sw; x++) {
      let c = x < sx + 2 ? concLt : x > sx + sw - 4 ? concDk : conc;
      if ((y - top) % 18 === 17) c = concDk; // the pour lines
      if (h01(x, y, 3501) < 0.04) c = concDk;
      p.set(x, y, c);
    }
  // rain streaks down from the lookout
  for (let x = sx + 4; x < sx + sw - 4; x += 7) for (let k = 0; k < 10 + (x % 6); k++) p.set(x, top + 6 + k, mix(concDk, conc, k / 14));
  // the clock (14 px): white face, 12 marks, both hands up on the 12 (12:01 at stage 2)
  const cx = sx + 17;
  const cy = top + 24;
  p.ellipse(cx, cy, 8, 8, '#3A3F48');
  p.ellipse(cx, cy, 7, 7, '#F4F1E8');
  for (let k = 0; k < 12; k++) {
    const a = (k / 12) * Math.PI * 2;
    p.set(Math.round(cx + Math.sin(a) * 6), Math.round(cy - Math.cos(a) * 6), '#3A3F48');
  }
  if (stage >= 2) {
    p.line(cx, cy, cx, cy - 5, '#2A2440');
    p.line(cx, cy, cx + 1, cy - 4, '#2A2440');
  } else {
    p.vline(cx, cy - 5, cy, '#2A2440');
    p.vline(cx, cy - 3, cy, '#2A2440');
  }
  p.set(cx, cy, '#E23B2E');
  // the iron door at the foot (34,6), the 『在室』 card hung on it (strokes)
  const dx = sx + 8;
  const dy = foot - 12 - 22;
  p.rect(dx, dy, 14, 22, '#6B7186');
  p.strokeRect(dx, dy, 14, 22, '#3A3F48');
  p.hline(dx + 1, dx + 12, dy + 1, '#9AA0A8');
  p.set(dx + 11, dy + 12, '#E8E4D8');
  if (stage < 2) {
    p.rect(dx + 3, dy + 4, 8, 5, '#FBF3DC');
    p.hline(dx + 4, dx + 9, dy + 6, P.ink);
  }
  // the lookout: a slab, the rail primed red (the place to go: 62 3.10)
  p.rect(sx - 6, top - 4, sw + 12, 5, concDk);
  p.hline(sx - 6, sx + sw + 5, top - 4, concLt);
  for (let x = sx - 6; x < sx + sw + 6; x += 4) p.vline(x, top - 12, top - 5, prime);
  p.hline(sx - 6, sx + sw + 5, top - 12, mix(prime, '#FF6A4D', 0.3));
  p.hline(sx - 6, sx + sw + 5, top - 8, prime);
  // the motor siren facing south: a round drum, the slots of its mouth, the cone hat
  const mx = cx;
  const my = top - 22;
  p.rect(mx - 2, my + 6, 5, 6, prime);
  p.ellipse(mx, my, 10, 7, '#5A7A6A');
  p.ellipse(mx - 2, my - 2, 6, 3, '#7A9A8A');
  for (let k = -7; k <= 7; k += 3) p.vline(mx + k, my - 3, my + 3, '#2A3A30');
  p.hline(mx - 9, mx + 9, my + 5, '#3A4A40');
  p.poly([[mx - 13, my - 7], [mx + 13, my - 7], [mx + 4, my - 17], [mx - 4, my - 17]], '#8A6A4A');
  p.line(mx - 13, my - 7, mx + 13, my - 7, '#5A3A2A');
  p.line(mx - 4, my - 17, mx - 12, my - 8, '#B89070');
  p.vline(mx, my - 20, my - 17, '#5A3A2A');
  // the brass plate on the drum; at 12:00 the black stamp 「まだ」 on its corner
  p.rect(mx - 3, my + 1, 6, 3, '#D9A441');
  if (stage < 2) {
    p.ellipse(mx + 4, my + 3, 3, 2, '#0B0B14');
    p.set(mx + 3, my + 3, '#2A2440');
  } else {
    // ミナト's chalk はなまる on the siren (12:01)
    p.ring(mx + 4, my + 2, 3, 2, '#E23B2E');
  }
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

registerProp('prop_c3_siren_tower', () => {
  const imgs = new Map<number, HTMLCanvasElement>();
  const at = (s: number) => {
    let c = imgs.get(s);
    if (!c) imgs.set(s, (c = sirenTower(s)));
    return c;
  };
  return {
    ox: 0,
    oy: 80 - 112,
    w: 64,
    h: 112,
    foot: 79,
    img: (env) => at(c3stage(env) >= 2 ? 2 : 1),
    shadow: 112,
    contact: 56,
    contactX: 32,
    xray: 0.35,
  } satisfies PropArt;
});

// ---------------------------------------------------------------- 赤い灯台 (7,28): 3×2 tiles, 96 px

function toudai(): HTMLCanvasElement {
  const W = 48;
  const H = 112;
  const p = new PixelCanvas(W, H);
  const foot = H - 1;
  const red = '#C8452E';
  const redLt = '#E06A4E';
  const redDk = '#8A2E22';
  // the base ring standing in the water
  p.rect(6, foot - 8, 36, 8, '#B8B4AA');
  p.hline(6, 41, foot - 8, '#D2CEC4');
  p.hline(6, 41, foot - 1, '#6B6A66');
  p.vline(41, foot - 7, foot, '#8E8A80');
  // the round red tower, narrowing a little to the top; white seams
  const top = 28;
  for (let y = top; y < foot - 8; y++) {
    const t = (y - top) / (foot - 8 - top);
    const half = Math.round(10 + t * 3);
    for (let x = 24 - half; x < 24 + half; x++) {
      const u = (x - (24 - half)) / (half * 2);
      let c = u < 0.18 ? redLt : u > 0.75 ? redDk : red;
      if ((y - top) % 16 === 15) c = '#F4F1E8';
      p.set(x, y, c);
    }
  }
  // the door (8,29): a red iron door with a round window
  p.rect(18, foot - 26, 12, 18, redDk);
  p.strokeRect(18, foot - 26, 12, 18, '#5A1E18');
  p.ellipse(24, foot - 20, 2, 2, '#7FD1E8');
  // the gallery and its rail, the lamp room's glass, the white cap
  p.rect(10, top - 3, 28, 4, '#E8E4D8');
  p.hline(10, 37, top - 3, '#FFFFFF');
  for (let x = 10; x < 38; x += 3) p.vline(x, top - 9, top - 4, '#3A3F48');
  p.hline(10, 37, top - 9, '#3A3F48');
  p.rect(16, top - 20, 16, 12, '#3A3F48');
  for (let x = 17; x < 31; x++) for (let y = top - 19; y < top - 9; y++) p.set(x, y, (x - 17) % 5 === 4 ? '#3A3F48' : y < top - 15 ? '#B8E8F4' : '#7FD1E8');
  p.set(19, top - 17, '#FFFFFF');
  p.poly([[14, top - 20], [34, top - 20], [26, top - 27], [22, top - 27]], '#F4F1E8');
  p.hline(14, 33, top - 20, '#C8C2B4');
  p.vline(24, top - 31, top - 27, '#3A3F48');
  p.set(24, top - 32, '#E23B2E');
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

/** The lighthouse's beam goes round once in this long (ms): after the clear, at night (05_postgame 4.1). */
const TOUDAI_TURN = 8000;
/** The lamp room's glass, from the art's top-left (px). */
const TOUDAI_LAMP: [number, number] = [24, 14];

registerProp('prop_c3_toudai', () => {
  const img = toudai();
  const a: PropArt = { ox: 0, oy: 32 - 112, w: 48, h: 112, foot: 31, img: () => img, shadow: 96, contact: 30, contactX: 24, xray: 0.35 };
  // the night (only after the clear: 海ぞいの町 is never night in chapter 3, Grade.night 0): the lamp room
  // lit, and its beam going round — over the sea in the glow layer, a sweep on the ground in the light map
  a.glow = (g, x, y, env) => {
    const n = env.grade.night;
    if (n <= 0.05) return;
    const lx = x + a.ox + TOUDAI_LAMP[0];
    const ly = y + a.oy + TOUDAI_LAMP[1];
    halo(g, lx, ly, 12, LIGHT.street, 0.7 * n);
    g.rect(lx - 7, ly - 4, 14, 9, '#FFF6D8', 0.8 * n);
    const ang = ((env.t % TOUDAI_TURN) / TOUDAI_TURN) * Math.PI * 2;
    const ctx = g.ctx;
    ctx.save();
    ctx.translate(lx, ly);
    ctx.scale(1, 0.45);
    ctx.rotate(ang);
    const len = 150;
    const grad = ctx.createLinearGradient(0, 0, len, 0);
    grad.addColorStop(0, `rgba(255,246,216,${(0.45 * n).toFixed(3)})`);
    grad.addColorStop(1, 'rgba(255,246,216,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.moveTo(0, -3);
    ctx.lineTo(len, -16);
    ctx.lineTo(len, 16);
    ctx.lineTo(0, 3);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };
  a.light = (g, x, y, env) => {
    const n = env.grade.night;
    if (n <= 0.05) return;
    // the tower's own light round its foot, and the beam's sweep where it passes over the breakwater
    drawLight(g, poolEllipse(30, 16, LIGHT.street), x + 24, y + 26, 0.35 * n);
    const ang = ((env.t % TOUDAI_TURN) / TOUDAI_TURN) * Math.PI * 2;
    const pool = poolEllipse(26, 12, LIGHT.street);
    for (const d of [48, 84]) drawLight(g, pool, x + 24 + Math.cos(ang) * d, y + 26 + Math.sin(ang) * d * 0.45, (d === 48 ? 0.4 : 0.25) * n);
  };
  return a;
});

// ---------------------------------------------------------------- 漁船 (4×2 tiles)

/**
 * A small fishing boat side-on, bow to the west: the white hull and its blue
 * stripe, the wheelhouse, the mast; `name`: ゴロウ's boat carries 『第三 かもめ丸』
 * (readable, 60 9.3). `v` 'fuse': the old wooden boat upturned on the
 * children's lot, a はなまる on its belly.
 */
function fune(o: { name?: boolean; v?: string; hull?: string }): HTMLCanvasElement {
  const p = new PixelCanvas(64, 40);
  if (o.v === 'fuse') {
    // the old wooden boat lying upside down in the grass
    for (let x = 4; x < 60; x++) {
      const t = (x - 4) / 55;
      const top = 22 - Math.round(Math.sin(t * Math.PI) * 9);
      for (let y = top; y < 34; y++) p.set(x, y, y === top ? '#C8A06A' : (y - top) % 5 === 4 ? '#5A3A2A' : y < top + 3 ? '#A87A4A' : '#8A5A3A');
    }
    // the はなまる in the children's chalk on the belly
    p.ring(30, 21, 5, 3, '#F4F1E8');
    p.ring(30, 21, 3, 2, '#F4F1E8');
    for (let k = 0; k < 6; k++) p.set(30 + Math.round(Math.cos(k) * 7), 21 + Math.round(Math.sin(k) * 4), '#F4F1E8');
    p.hline(4, 59, 34, '#3A2A22');
    outline(p, { bottom: true, soft: true });
    return p.toCanvas();
  }
  const hull = o.hull ?? '#E8E4D8';
  // hull
  for (let x = 2; x < 62; x++) {
    const bow = x < 14 ? Math.round((14 - x) * 0.6) : 0;
    for (let y = 24 + bow; y < 36; y++) {
      let c = y < 26 + bow ? '#FFFFFF' : hull;
      if (y === 29 || y === 30) c = CP.umi;
      if (y >= 34) c = '#8A2E22';
      if (x > 58) c = y < 30 ? '#C8C2B4' : c;
      p.set(x, y, c);
    }
  }
  p.hline(2, 61, 24, '#9AA0A8');
  // the wheelhouse
  p.rect(36, 12, 16, 13, '#F4F1E8');
  p.rect(36, 10, 17, 3, '#3A7EA8');
  p.rect(38, 15, 5, 4, '#2A3A4A');
  p.rect(45, 15, 5, 4, '#2A3A4A');
  p.set(39, 16, '#B8E8F4');
  p.vline(52, 13, 24, '#C8C2B4');
  // the mast, the flag pole, a lamp
  p.vline(22, 2, 24, '#9AA0A8');
  p.hline(18, 26, 8, '#9AA0A8');
  p.vline(58, 6, 24, '#8A5A3A');
  p.rect(58, 6, 5, 3, '#E84E3C');
  p.set(22, 1, '#FFD23F');
  // the deck's gear: a net heap, buoys
  p.rect(8, 21, 10, 3, '#3FA66B');
  p.set(10, 20, '#F2894B');
  p.set(15, 20, '#F2894B');
  if (o.name) fontTextSmall(p, '第三かもめ丸', 6, 26, '#2F4A8A');
  else for (let x = 10; x < 30; x += 4) p.rect(x, 27, 2, 2, '#2F4A8A');
  outline(p, { bottom: false, soft: true });
  return p.toCanvas();
}

registerProp('prop_c3_fune', (opts) => {
  const img = fune({ name: !!opts.name, v: opts.v as string | undefined, hull: opts.hull as string | undefined });
  const fuse = opts.v === 'fuse';
  return {
    ox: 0,
    oy: fuse ? -8 : 32 - 40,
    w: 64,
    h: 40,
    foot: fuse ? 25 : 31,
    img: () => img,
    shadow: fuse ? 10 : 0,
    contact: fuse ? 50 : 0,
    contactX: 32,
  } satisfies PropArt;
});

// ---------------------------------------------------------------- the quay

/** 係船柱 (bitt): black iron, a swelling top, a rope round it. */
registerProp('prop_c3_bitt', () =>
  standProp(12, 14, (p) => {
    p.rect(3, 6, 6, 8, '#2A2A30');
    p.ellipse(6, 5, 4, 2, '#3A3A42');
    p.hline(3, 8, 4, '#6B7186');
    p.set(4, 7, '#6B7186');
    p.hline(2, 9, 10, '#C8A06A');
    p.hline(2, 9, 11, '#A87A4A');
    p.line(9, 11, 11, 13, '#C8A06A');
  }, { cx: 8, base: 15, shadow: 10 }),
);

/** トロ箱の山: white foam fish boxes stacked; the ice in them melting and stopped. The cat sleeps on top (stage 1). */
registerProp('prop_c3_toro', () => {
  const mk = (cat: 'sleep' | 'stretch' | 'none') =>
    standProp(24, 30, (p) => {
      for (const [x, y, w] of [[1, 18, 22], [3, 10, 18]] as const) {
        p.rect(x, y, w, 8, '#F4F1E8');
        p.hline(x, x + w - 1, y, '#FFFFFF');
        p.vline(x + w - 1, y + 1, y + 7, '#C8C2B4');
        p.hline(x, x + w - 1, y + 7, '#C8C2B4');
        for (let i = x + 2; i < x + w - 2; i += 5) p.set(i, y + 3, '#7FD1E8');
      }
      p.set(6, 26, '#7FD1E8');
      p.set(7, 27, '#4AA8E0');
      if (cat === 'sleep') {
        p.ellipse(11, 7, 5, 3, '#E8A050');
        p.ellipse(15, 6, 3, 2.5, '#E8A050');
        p.set(16, 4, '#C8803A');
        p.set(14, 4, '#C8803A');
        p.hline(7, 12, 9, '#C8803A');
        p.line(6, 8, 4, 9, '#E8A050');
        p.hline(14, 16, 6, '#8A5A3A');
      } else if (cat === 'stretch') {
        p.rect(6, 4, 10, 4, '#E8A050');
        p.ellipse(17, 4, 3, 2.5, '#E8A050');
        p.vline(6, 7, 9, '#C8803A');
        p.vline(15, 7, 9, '#C8803A');
        p.line(5, 4, 3, 1, '#E8A050');
      }
    }, { cx: 8, base: 16, shadow: 20 });
  const sleep = mk('sleep');
  const up = mk('stretch');
  return { ...sleep, img: (env: PropEnv) => (c3stage(env) >= 2 ? up.img(env) : sleep.img(env)) } satisfies PropArt;
});

/** 漁網の山 (lying): green net, orange floats. */
registerProp('prop_c3_ami', (opts) => {
  const w = Number(opts.w ?? 28);
  const p = new PixelCanvas(w, 14);
  for (let y = 0; y < 14; y++)
    for (let x = 0; x < w; x++) {
      const d = ((x - w / 2) / (w / 2)) ** 2 + ((y - 7) / 6.5) ** 2;
      if (d > 1) continue;
      p.set(x, y, (x + y) % 3 === 0 ? '#2E6B4A' : d > 0.7 ? '#2E6B4A' : '#3FA66B');
    }
  for (let k = 0; k < 5; k++) p.rect(3 + ((k * 7) % (w - 6)), 3 + ((k * 5) % 8), 3, 2, '#F2894B');
  const img = p.toCanvas();
  return { ox: 0, oy: 1, w, h: 14, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

/** 製氷機 (2 tiles): a steel box on legs, the chute; at 12:00 a chunk of ice stopped in mid-fall. */
registerProp('prop_c3_seihyo', () => {
  const mk = (falling: boolean) =>
    standProp(32, 34, (p) => {
      p.rect(2, 4, 28, 20, '#C8CCD2');
      p.hline(2, 29, 4, '#E8ECF0');
      p.vline(29, 5, 23, '#8E95A6');
      p.rect(4, 7, 10, 5, '#9AA0A8');
      p.set(5, 8, '#5CE1FF');
      for (const x of [3, 27]) p.rect(x, 24, 2, 9, '#6B7186');
      p.rect(18, 22, 8, 4, '#9AA0A8');
      p.rect(16, 30, 12, 3, '#3A7EA8');
      if (falling) {
        p.rect(20, 26, 3, 3, '#E8F8FF');
        p.set(20, 26, '#FFFFFF');
      }
    }, { cx: 16, base: 16, shadow: 30 });
  const still = mk(true);
  const moving = mk(false);
  return { ...still, img: (env: PropEnv) => (c3stage(env) >= 2 ? moving.img(env) : still.img(env)) } satisfies PropArt;
});

/** ターレ: the market's little truck — a round-handled drum of a driving post, a flat bed. */
registerProp('prop_c3_tare', () =>
  standProp(18, 22, (p) => {
    p.rect(1, 12, 16, 6, '#3FA66B');
    p.hline(1, 16, 12, '#5FC88A');
    p.rect(11, 3, 6, 10, '#9AA0A8');
    p.ellipse(14, 3, 3, 1.5, '#3A3F48');
    p.hline(12, 16, 7, '#E8E4D8');
    for (const x of [4, 14]) p.ellipse(x, 19, 2, 2, '#2A2A30');
    p.rect(2, 9, 8, 3, '#F4F1E8');
  }, { cx: 8, base: 16, shadow: 18 }),
);

/** 『星見台の やさい』 の木箱: a wooden crate with ツガオ's strokes on its side, cabbages in it. */
registerProp('prop_c3_yasai_box', () =>
  standProp(16, 16, (p) => {
    p.rect(1, 6, 14, 9, '#C8A06A');
    p.hline(1, 14, 6, '#E8C890');
    p.hline(1, 14, 10, '#8A5A3A');
    p.vline(14, 7, 14, '#8A5A3A');
    for (let x = 3; x < 12; x += 3) p.rect(x, 8, 2, 2, P.ink);
    p.ellipse(5, 5, 3, 2.5, '#9BCB6B');
    p.ellipse(10, 5, 3, 2.5, '#C9E08A');
  }, { cx: 8, base: 16, shadow: 12 }),
);

/** A stone bench (the plaza, the breakwater). */
registerProp('prop_c3_ishi_bench', (opts) =>
  standProp(28, 12, (p) => {
    const c = String(opts.c ?? '#B8B4AA');
    p.rect(1, 2, 26, 5, c);
    p.hline(1, 26, 2, mix(c, '#FFFFFF', 0.35));
    p.hline(1, 26, 6, mix(c, '#3A3F48', 0.3));
    for (const x of [3, 21]) p.rect(x, 7, 4, 4, mix(c, '#3A3F48', 0.2));
  }, { cx: 14, base: 16, shadow: 8 }),
);

/** 掲示板 「サイレンの 引退の お知らせ」: a wooden board under a little roof, two papers, pins. */
registerProp('prop_c3_keijiban', () =>
  standProp(30, 30, (p) => {
    p.rect(1, 2, 28, 3, '#5A3A2A');
    p.hline(1, 28, 2, '#8A5A3A');
    p.rect(3, 5, 24, 16, '#8A5A3A');
    p.rect(4, 6, 22, 14, '#C8A06A');
    for (const [x, y] of [[6, 7], [16, 8]] as const) {
      p.rect(x, y, 8, 10, '#FBF3DC');
      for (let j = y + 2; j < y + 9; j += 2) p.hline(x + 1, x + 6, j, '#6B7186');
      p.set(x + 4, y, '#E23B2E');
    }
    for (const x of [6, 23]) p.rect(x, 21, 2, 8, '#5A3A2A');
  }, { cx: 15, base: 16, shadow: 26 }),
);

// ---------------------------------------------------------------- the hill

/**
 * みかんの木 (2×2 tiles a tree): dark glossy leaves, green fruit (8月31日).
 * `tankan`: しんごのたんかん — the leaves a little bigger and rounder, the fruit a little taller.
 */
registerProp('prop_c3_mikan', (opts) => {
  const tankan = !!opts.tankan;
  const w = tankan ? 22 : 30;
  // (still at 12:00; at 12:01 the leaves stir: the lit tips shift a pixel, 3 frames — 62 6.2 screen_c3_dandan)
  const frame = (stir: number) => standProp(
    w,
    28,
    (p) => {
      const cx = w / 2;
      p.rect(cx - 1, 18, 3, 9, '#5A3A2A');
      p.set(cx - 1, 19, '#8A5A3A');
      for (let k = 0; k < (tankan ? 4 : 6); k++) {
        const bx = cx + ((k * 7) % 13) - 6;
        const by = 10 + ((k * 5) % 7) - 3;
        const r = tankan ? 6 : 7;
        for (let y = -r; y <= r; y++)
          for (let x = -r; x <= r; x++) {
            const d = (x * x + y * y) / (r * r);
            if (d > 1 || bx + x < 0 || bx + x >= w) continue;
            const lit = x + y;
            let c = lit < -r * 0.5 ? CP.mikanLeafLt : lit < r * 0.4 ? CP.mikanLeaf : '#1E4A2A';
            if (ihash(bx + x, by + y, tankan ? 3531 : 3533) % (tankan ? 3 : 5) === 0) c = c === CP.mikanLeafLt ? '#6AA06A' : '#3A6A3A';
            p.set(bx + x, by + y, c);
          }
      }
      // the green fruit
      for (let k = 0; k < 7; k++) {
        const fx = 3 + ((k * 11) % (w - 6));
        const fy = 6 + ((k * 7) % 12);
        p.rect(fx, fy, 2, tankan ? 3 : 2, CP.mikanGreen);
        p.set(fx, fy, '#9BCB6B');
      }
      // the breeze turning a few leaves over (their pale undersides)
      if (stir)
        for (let k = 0; k < 9; k++) {
          const lx = 2 + ((k * 13 + stir * 5) % (w - 4));
          const ly = 3 + ((k * 9 + stir * 3) % 14);
          p.set(lx, ly, '#9BC88A');
          p.set(lx + (stir === 1 ? 1 : -1), ly, CP.mikanLeafLt);
        }
    },
    { cx: tankan ? 8 : 16, base: 16, shadow: 24 },
  );
  const still = frame(0);
  const stir = [frame(1), frame(2)];
  return {
    ...still,
    img: (env) => (env.flag('flag_ch3_stage') >= 2 && env.motion > 0.5 ? stir[Math.floor(env.t / 600 + env.seed * 3) % 2].img(env) : still.img(env)),
  } satisfies PropArt;
});

/** トベラ: a round, glossy coastal shrub. */
registerProp('prop_c3_tobera', () =>
  standProp(20, 16, (p) => {
    p.ellipse(10, 9, 9, 6, '#2E6A3A');
    p.ellipse(8, 7, 6, 4, '#4A8A4A');
    for (let k = 0; k < 8; k++) p.set(3 + ((k * 5) % 14), 4 + ((k * 3) % 8), k % 2 ? '#6AA06A' : '#1E4A2A');
    p.set(12, 6, '#F4F1E8');
  }, { cx: 8, base: 16, shadow: 10 }),
);

/** 干し台: a wooden frame with a net, アジの開き in 2×3 (one dried too long, a ring of sun on it: fushigi_ch3_06). */
registerProp('prop_c3_himono_dai', (opts) =>
  standProp(16, 16, (p) => {
    for (const x of [1, 14]) p.rect(x, 6, 1, 9, '#5A3A2A');
    p.rect(0, 4, 16, 6, '#8A7A5A');
    for (let x = 0; x < 16; x += 2) p.vline(x, 4, 9, '#6A5A3A');
    for (let k = 0; k < 6; k++) {
      const x = 1 + (k % 3) * 5;
      const y = 4 + Math.floor(k / 3) * 3;
      p.rect(x, y, 4, 2, '#C89A6A');
      p.set(x + 1, y, '#E8C8A0');
      p.set(x + 3, y + 1, '#C8CDD4');
      if (opts.ring && k === 4) p.set(x + 2, y, '#8A5A3A');
    }
  }, { cx: 8, base: 16, shadow: 12 }),
);

// ---------------------------------------------------------------- the beach

/** シャワー: the foot-wash tap on a post. */
registerProp('prop_c3_shower', () =>
  standProp(10, 26, (p) => {
    p.rect(4, 4, 2, 21, '#9AA0A8');
    p.hline(4, 8, 4, '#C8CCD2');
    p.set(8, 5, '#3A3F48');
    p.rect(1, 22, 8, 3, '#C8C2B4');
    p.set(8, 7, '#7FD1E8');
  }, { cx: 8, base: 16, shadow: 20 }),
);

/** 浮き輪の山: four rings piled, the top one red and white (アソビタリンの思いだした姿). */
registerProp('prop_c3_ukiwa_yama', () =>
  standProp(18, 16, (p) => {
    const cols: [string, string][] = [['#4AA8E0', '#2F7AB0'], ['#FFD23F', '#D9A441'], ['#5FC88A', '#3FA66B']];
    cols.forEach(([a, b], k) => {
      p.ellipse(9, 13 - k * 3, 8, 3, a);
      p.ellipse(9, 13 - k * 3, 4, 1.5, b);
    });
    p.ellipse(9, 4, 8, 3, '#F4F1E8');
    for (let x = 1; x < 17; x += 4) for (let y = 1; y < 7; y++) if (p.alpha(x, y)) p.set(x, y, '#E84E3C');
    p.ellipse(9, 4, 4, 1.5, '#C8C2B4');
  }, { cx: 8, base: 16, shadow: 10 }),
);

/** 鉄棒: two posts and the bar, a little rust from the sea air. */
registerProp('prop_c3_tetsubou', () =>
  standProp(24, 24, (p) => {
    for (const x of [2, 20]) {
      p.rect(x, 4, 2, 19, '#9AA0A8');
      p.vline(x, 4, 22, '#C8CCD2');
    }
    p.hline(2, 21, 5, '#C8CCD2');
    p.hline(2, 21, 6, '#8E95A6');
    for (const [x, y] of [[3, 12], [21, 16], [9, 5]] as const) p.set(x, y, '#8A6A4A');
  }, { cx: 12, base: 16, shadow: 20 }),
);

/**
 * 監視台 (16×40): the white wooden tower, its ladder, the sunshade; the flag
 * on its pole spread by a wind that has stopped (stage 1) — white with blue
 * waves (62 7.3 仮の決め). At 12:01 the flag is taken in (カイトがたたむ).
 */
registerProp('prop_c3_kanshidai', () => {
  const mk = (flag: boolean) =>
    standProp(22, 50, (p) => {
      for (const x of [3, 14]) p.rect(x, 18, 2, 31, '#E8E4D8');
      for (let y = 22; y < 48; y += 5) p.hline(3, 15, y, '#C8C2B4');
      p.line(3, 48, 15, 24, '#C8C2B4');
      p.rect(1, 16, 18, 4, '#F4F1E8');
      p.hline(1, 18, 16, '#FFFFFF');
      p.rect(2, 9, 16, 3, '#F4F1E8');
      p.hline(2, 17, 12, '#C8C2B4');
      p.vline(3, 12, 15, '#C8C2B4');
      p.vline(16, 12, 15, '#C8C2B4');
      p.vline(19, 0, 18, '#9AA0A8');
      if (flag) {
        p.rect(20, 1, 2, 1, '#F4F1E8');
        for (let y = 1; y < 8; y++) p.hline(19, 21 + (y < 4 ? 0 : 0), y, '#F4F1E8');
      }
    }, { cx: 10, base: 16, shadow: 44 });
  // the flag drawn wider than the canvas lets: a separate over() for it
  const a = mk(false);
  const flagImg = (() => {
    const p = new PixelCanvas(14, 9);
    p.rect(0, 0, 14, 9, '#F4F1E8');
    for (let x = 0; x < 14; x++) {
      const y = 4 + Math.round(Math.sin(x / 2) * 1.2);
      p.set(x, y, '#3A7EA8');
      p.set(x, y + 1, '#5AA0C8');
    }
    p.strokeRect(0, 0, 14, 9, '#C8C2B4');
    return p.toCanvas();
  })();
  return {
    ...a,
    over: (g, x, y, env) => {
      if (c3stage(env) >= 2) return;
      g.ctx.drawImage(flagImg, Math.round(x + a.ox + 20), Math.round(y + a.oy + 0));
    },
  } satisfies PropArt;
});

/** パラソル: a striped beach umbrella in the sand. */
registerProp('prop_c3_parasol', () =>
  standProp(30, 30, (p) => {
    p.vline(15, 6, 29, '#C8C2B4');
    for (let y = 0; y < 9; y++) {
      const half = 2 + y * 1.6;
      for (let x = Math.round(15 - half); x <= Math.round(15 + half); x++) p.set(x, y + 1, Math.floor((x + 30) / 4) % 2 ? '#E84E3C' : '#F4F1E8');
    }
    p.hline(1, 29, 10, '#B8302A');
  }, { cx: 15, base: 16, shadow: 24 }),
);

/** 遊泳区域のロープの杭: a stake, the white rope going out to a yellow buoy (lying on the water to the south). */
registerProp('prop_c3_rope_kui', () =>
  standProp(10, 18, (p) => {
    p.rect(3, 3, 3, 14, '#8A5A3A');
    p.hline(3, 5, 3, '#C8A06A');
    p.hline(5, 9, 8, '#F4F1E8');
  }, { cx: 8, base: 16, shadow: 14 }),
);

/** The rope out to sea and the yellow buoy (flat on the water). */
registerProp('prop_c3_buoy', () => {
  const p = new PixelCanvas(40, 40);
  p.line(0, 0, 30, 32, '#F4F1E8');
  for (let k = 4; k < 30; k += 6) p.set(Math.round((k * 30) / 32), k, '#E84E3C');
  p.ellipse(31, 33, 4, 3, '#FFD23F');
  p.set(30, 32, '#FFF6D8');
  const img = p.toCanvas();
  return { ox: 8, oy: 8, w: 40, h: 40, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

// ---------------------------------------------------------------- the old aquarium's front

/** 古い看板『ふしぎな 深海生物展』: faded deep blue, shapes of glowing creatures (no グソクムシ). */
registerProp('prop_c3_aq_kanban', () =>
  standProp(32, 30, (p) => {
    for (const x of [4, 26]) p.rect(x, 20, 2, 9, '#6B7186');
    p.rect(0, 0, 32, 21, '#C8C4B8');
    p.rect(1, 1, 30, 19, mix('#1A2A5A', '#C8C4B8', 0.35));
    for (const [x, y, r] of [[8, 8, 3], [20, 12, 2], [25, 6, 2]] as const) {
      p.ellipse(x, y, r, r - 1, mix('#5CE1FF', '#C8C4B8', 0.4));
      p.set(x, y, mix('#FFFFFF', '#C8C4B8', 0.3));
    }
    for (let x = 4; x < 28; x += 4) p.rect(x, 16, 3, 2, mix('#F4F1E8', '#C8C4B8', 0.3));
  }, { cx: 16, base: 16, shadow: 26 }),
);

/**
 * The road sign on the coast road between the town and the cape (2026-10-20: the old aquarium moved
 * out to the cape): a blue board on a steel post, white letters. opts.to 'misaki' (the town's east
 * end): 「岬」 and an arrow east; 'machi' (on the cape): an arrow west and 「町」.
 */
registerProp('prop_c3_misaki_fuda', (opts) => {
  const west = opts.to === 'machi';
  return standProp(24, 28, (p) => {
    p.rect(11, 12, 2, 16, '#8E95A6');
    p.vline(11, 12, 27, '#C8CCD2');
    p.rect(0, 0, 24, 13, '#E8E4D8');
    p.rect(1, 1, 22, 11, '#2F5A9A');
    p.hline(1, 22, 1, '#4A7AB8');
    const arrow = (x0: number, right: boolean) => {
      p.hline(x0, x0 + 6, 6, '#F4F1E8');
      const tip = right ? x0 + 6 : x0;
      const d = right ? -1 : 1;
      for (let k = 1; k <= 2; k++) {
        p.set(tip + d * k, 6 - k, '#F4F1E8');
        p.set(tip + d * k, 6 + k, '#F4F1E8');
      }
    };
    if (west) {
      arrow(3, false);
      fontTextSmall(p, '町', 13, 2, '#F4F1E8');
    } else {
      fontTextSmall(p, '岬', 3, 2, '#F4F1E8');
      arrow(13, true);
    }
  }, { cx: 8, base: 16, shadow: 10 });
});

// ---------------------------------------------------------------- the frozen spray on the tetrapods (stage 1)

registerProp('prop_c3_shibuki', () => {
  const p = new PixelCanvas(20, 20);
  for (let k = 0; k < 18; k++) {
    const x = 3 + ((k * 7) % 14);
    const y = 2 + ((k * 11) % 14);
    p.set(x, y, k % 3 ? '#F4F1E8' : '#FFFFFF');
    if (k % 4 === 0) p.set(x + 1, y, '#E8F4FA');
  }
  const img = p.toCanvas();
  // 12:01: the spray falls and comes up again with the next wave (8 frames, 2 s)
  const loop: (HTMLCanvasElement | null)[] = [];
  for (let f = 0; f < 8; f++) {
    if (f >= 6) {
      loop.push(null);
      continue;
    }
    const q = new PixelCanvas(20, 20);
    const up = f < 2 ? (f + 1) / 2 : 1;
    const fall = f >= 2 ? (f - 2) / 4 : 0;
    for (let k = 0; k < 18; k++) {
      const x = 3 + ((k * 7) % 14) + Math.round((((k * 7) % 14) - 7) * fall * 0.3);
      const y0 = 2 + ((k * 11) % 14);
      const y = Math.round(19 - (19 - y0) * up + fall * fall * 16);
      if (y < 0 || y > 19 || (fall > 0.5 && k % 2)) continue;
      q.set(x, y, k % 3 ? '#F4F1E8' : '#FFFFFF');
    }
    loop.push(q.toCanvas());
  }
  return {
    ox: -2,
    oy: -14,
    w: 20,
    h: 20,
    foot: 15,
    img: (env) => (c3stage(env) >= 2 && env.motion > 0.5 ? loop[Math.floor(env.t / 250 + env.seed * 8) % 8] : img),
    contact: 0,
  } satisfies PropArt;
});

void h01;

// ---------------------------------------------------------------- 防波堤の ござ (S13・S29: 62 3.3・12.6)

/**
 * The mats laid along the breakwater for the real lunch (22–40,31–32): rush
 * mats in a row, and on them the town's food — rice balls, the dried fish,
 * tofu, tomatoes, tea, a big plate — the people stand and sit on top (they
 * are the scenario's). Flat; from S13 (flag_ch3_got_gochisou).
 */
registerProp('prop_c3_goza', (o) => {
  // (opts.one: one mat of the four, 4 tiles — the ending's lunch on the beach, S29)
  const one = !!o?.one;
  const W = one ? 4 * 16 : 19 * 16;
  const H = 32;
  const p = new PixelCanvas(W, H);
  // four mats, each 4–5 tiles, a little apart and askew
  const mats: [number, number, number][] = one ? [[1, 2, 62]] : [[0, 2, 72], [76, 0, 76], [156, 3, 70], [230, 1, 74]];
  for (const [mx, my, mw] of mats) {
    for (let y = my; y < my + 28; y++)
      for (let x = mx; x < mx + mw; x++) {
        let c = (x + y * 3) % 4 === 0 ? '#C8B070' : (y - my) % 6 === 0 ? '#A89050' : '#D8C080';
        if (x === mx || x === mx + mw - 1 || y === my || y === my + 27) c = '#2F6A4A';
        p.set(x, y, c);
      }
  }
  // the food: plates, rice balls, the dried fish, tofu, tomatoes, tea
  const plate = (x: number, y: number, rx: number, ry: number) => {
    p.ellipse(x, y + 1, rx, ry, '#9AA0A8');
    p.ellipse(x, y, rx, ry, '#F4F1E8');
  };
  const inside = (x: number) => x < W - 6;
  for (const [x, y] of ([[20, 12], [110, 10], [190, 14], [262, 12]] as const).filter(([x]) => inside(x))) {
    plate(x, y, 9, 4);
    for (let k = 0; k < 3; k++) {
      p.poly([[x - 6 + k * 5, y + 1], [x - 4 + k * 5, y - 3], [x - 2 + k * 5, y + 1]], '#FFFFFF');
      p.hline(x - 6 + k * 5, x - 2 + k * 5, y + 1, '#2A3A2A');
    }
  }
  for (const [x, y] of ([[48, 18], [140, 16], [214, 20]] as const).filter(([x]) => inside(x))) {
    plate(x, y, 8, 3);
    p.ellipse(x, y, 5, 2, '#C89A6A');
    p.hline(x - 3, x + 3, y, '#E8C8A0');
  }
  if (!one) {
    plate(84, 20, 6, 3);
    p.rect(81, 18, 6, 3, '#F4F1E8');
    plate(240, 22, 6, 3);
    for (const dx of [-2, 1, 4]) p.ellipse(240 + dx - 1, 21, 1, 1, '#E23B2E');
  } else {
    // the yakisoba packs off the griddle, a rubber band round each
    for (const x of [44, 52]) {
      p.rect(x - 4, 14, 8, 5, '#F4F1E8');
      p.rect(x - 3, 15, 6, 3, '#C8A06A');
      p.vline(x, 14, 18, '#E84E3C');
    }
  }
  for (const x of [32, 66, 124, 172, 228, 286].filter(inside)) {
    p.rect(x, 20, 3, 4, '#E8E4D8');
    p.set(x + 1, 20, '#8A6A2A');
  }
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: W, h: H, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

// ---------------------------------------------------------------- 夕鳴町 at 11:10 (62 5.1)

/**
 * 焼きそばのたかし with its shutters down (bld_maruyama's storefront, 24–29 × 21):
 * the teppan window and the glass door shuttered, and on the door's shutter
 * たかし's paper 『青のり 切れ。仕入れに 出ます。たかし』 — three thick, round
 * lines of his hand and a small signature (unreadable strokes: the text is read in the window).
 */
registerProp('prop_c3_takashi_shutter', () => {
  const p = new PixelCanvas(96, 26);
  const shutter = (x: number, y: number, w: number, h: number) => {
    p.rect(x, y, w, h, '#B8BCC4');
    for (let j = y + 1; j < y + h; j += 2) p.hline(x, x + w - 1, j, '#9AA0A8');
    p.hline(x, x + w - 1, y, '#D2D6DC');
    p.rect(x - 1, y - 2, w + 2, 3, '#8E95A6');
    p.hline(x - 1, x + w, y - 2, '#C8CCD2');
    p.hline(x, x + w - 1, y + h - 1, '#6B7186');
    p.rect(x + Math.floor(w / 2) - 2, y + h - 4, 4, 2, '#3A3F48');
  };
  shutter(1, 9, 30, 16);
  shutter(49, 1, 14, 24);
  // the paper (10×12) on the door's shutter
  const hx = 51;
  const hy = 5;
  p.rect(hx, hy, 10, 12, '#FBF8F0');
  p.hline(hx, hx + 9, hy + 11, '#C8C2B4');
  p.set(hx + 4, hy, '#9AA0A8');
  for (const [y, w] of [[hy + 2, 8], [hy + 5, 7], [hy + 8, 5]] as const) {
    p.hline(hx + 1, hx + w, y, '#2A2440');
    p.hline(hx + 1, hx + w - 1, y + 1, '#2A2440');
  }
  p.hline(hx + 6, hx + 8, hy + 10, '#2A2440');
  const img = p.toCanvas();
  return { ox: 0, oy: -9, w: 96, h: 26, foot: 17, img: () => img, contact: 0 } satisfies PropArt;
});

// ---------------------------------------------------------------- 軽トラの荷台 (map_c3_nidai, 62 4.1・12.2)

const OLIVE = CP.olive;
const OLIVE_LT = CP.oliveLt;
const OLIVE_DK = CP.oliveDk;

/**
 * The bed's gates and the cab's back (the map is the bed, 10×6; the cab
 * stands east of it): the far gate (row 0), the tail gate (col 0, west), the
 * cab's back with its window (col 9 and past it), ツガオ's cap behind the
 * glass, ぴーちゃん's comb at the passenger side. The near gate (row 5) is
 * prop_c3_nidai_front, drawn in front of the people. The chalk はなまる on the
 * far gate (obj_c3_nidai_aori: ヒロスケ copied しゅん's stamp, chapter 2).
 */
registerProp('prop_c3_nidai_back', () => {
  const p = new PixelCanvas(212, 116);
  const ox = 0;
  const oy = 16;
  // ---- the cab (east of the bed, x 158–206), seen from above and the south (2026-10-14
  // 依頼主「軽トラもツガオが運転してる姿を見せて」): the roof, the windscreen's edge, the
  // driver's door with its window rolled down — ツガオ at the wheel in his work cap, ポコシャ's
  // sunglasses and ぴーちゃん's comb beyond him — the mirror, the front wheel
  const RX0 = ox + 160;
  const RX1 = ox + 204;
  // the roof
  p.rect(RX0, oy - 14, RX1 - RX0 - 4, 64, OLIVE);
  p.rect(RX0 + 2, oy - 12, RX1 - RX0 - 8, 60, OLIVE_LT);
  p.hline(RX0, RX1 - 5, oy - 14, '#9AAA5A');
  p.vline(RX0, oy - 14, oy + 49, '#9AAA5A');
  for (let y = oy - 6; y < oy + 46; y += 10) p.hline(RX0 + 4, RX1 - 10, y, OLIVE);
  // the windscreen's slope (east) catching the sky
  p.rect(RX1 - 4, oy - 12, 4, 62, '#5A8AA8');
  p.vline(RX1 - 3, oy - 10, oy + 46, '#9CC8E0');
  p.vline(RX1 - 5, oy - 14, oy + 49, OLIVE_DK);
  // the side (south face): the open window over the door
  const SY = oy + 50;
  p.rect(RX0, SY, RX1 - RX0, 46, OLIVE);
  p.hline(RX0, RX1 - 1, SY, OLIVE_DK);
  // the window: the cab's dark inside
  const wx = RX0 + 4;
  const wy = SY + 2;
  p.rect(wx, wy, 34, 15, '#2A2A3A');
  p.rect(RX1 - 6, wy, 5, 15, '#5A8AA8');
  p.vline(RX1 - 5, wy + 1, wy + 13, '#9CC8E0');
  // the seat back behind them
  p.rect(wx, wy + 3, 4, 12, '#4A5068');
  // ポコシャ beyond him (the passenger side): the head, the sunglasses; ぴーちゃん's red comb
  p.rect(wx + 10, wy + 4, 8, 7, '#8E6A4E');
  p.rect(wx + 12, wy + 6, 5, 2, '#1B1733');
  p.rect(wx + 8, wy + 2, 3, 2, '#E84E3C');
  p.rect(wx + 7, wy + 4, 5, 4, '#F4F1E8');
  // ツガオ in profile (facing east), the work cap, the square jaw, his hands on the wheel
  const tx = wx + 18;
  const ty = wy + 1;
  p.rect(tx, ty + 9, 10, 6, '#8A7A4A'); // the jumper's shoulders
  p.hline(tx, tx + 9, ty + 9, '#A8986A');
  p.rect(tx + 2, ty + 3, 7, 7, '#C98A6A'); // the face
  p.rect(tx + 2, ty + 7, 1, 3, '#A86A4E');
  p.set(tx + 7, ty + 5, '#1B1733'); // the eye, a line
  p.set(tx + 8, ty + 5, '#1B1733');
  p.hline(tx + 6, tx + 8, ty + 4, '#1B1733'); // the brow
  p.set(tx + 8, ty + 8, '#A86A4E'); // the mouth
  p.rect(tx + 2, ty + 5, 2, 3, '#1B1733'); // the sideburn
  p.rect(tx + 1, ty, 9, 4, '#5A6B2A'); // the cap
  p.hline(tx + 1, tx + 9, ty, '#7A8B3A');
  p.hline(tx + 8, tx + 12, ty + 3, '#3A4A1A'); // the peak
  // the arm forward, the hand on the wheel's rim
  p.rect(tx + 8, ty + 10, 6, 2, '#8A7A4A');
  p.rect(tx + 14, ty + 9, 2, 3, '#C98A6A');
  p.line(tx + 13, ty + 6, tx + 15, ty + 14, '#1B1733');
  // the window frame and the door
  p.strokeRect(wx - 1, wy - 1, 36, 17, OLIVE_DK);
  const dy = SY + 19;
  p.rect(RX0 + 2, dy, RX1 - RX0 - 6, 24, OLIVE);
  p.vline(RX0 + 6, dy, dy + 20, OLIVE_DK);
  p.vline(RX1 - 8, dy, dy + 20, OLIVE_DK);
  p.hline(RX0 + 6, RX1 - 8, dy + 20, OLIVE_DK);
  p.hline(RX0 + 2, RX1 - 5, dy + 9, '#6B7A3A');
  p.rect(RX0 + 10, dy + 3, 5, 1, '#C8CCD2');
  // ツガオ便's mark on the door: the tomato in a white ring
  p.ellipse(RX0 + 24, dy + 6, 5, 4, '#F4F1E8');
  p.ellipse(RX0 + 24, dy + 6, 3, 3, '#E84E3C');
  p.set(RX0 + 23, dy + 5, '#FF8A6A');
  p.hline(RX0 + 23, RX0 + 25, dy + 3, '#3A7A3A');
  p.hline(RX0 + 16, RX0 + 32, dy + 13, '#F4F1E8');
  p.hline(RX0 + 19, RX0 + 29, dy + 15, '#C8C2B4');
  // the mirror on its stalk, the bumper, the front wheel
  p.rect(RX1 - 3, SY + 4, 3, 6, '#2A2A30');
  p.set(RX1 - 4, SY + 9, '#2A2A30');
  p.rect(RX1 - 2, dy + 18, 4, 4, '#C8CCD2');
  p.rect(RX0 + 26, SY + 40, 16, 6, '#2A2A30');
  p.rect(RX0 + 30, SY + 41, 8, 3, '#9AA0A8');
  // ---- the headboard guard (鳥居) over the cab's back: steel pipes
  for (let y = oy; y < oy + 96; y += 6) p.hline(ox + 154, ox + 160, y, P.steel);
  p.vline(ox + 154, oy - 4, oy + 94, '#C8CCD2');
  p.vline(ox + 159, oy - 4, oy + 94, P.steel);
  // the far gate (row 0) and the side posts
  const gate = (x: number, y: number, w: number, h: number) => {
    p.rect(x, y, w, h, OLIVE);
    p.hline(x, x + w - 1, y, '#9AAA5A');
    p.hline(x, x + w - 1, y + 1, OLIVE_LT);
    p.hline(x, x + w - 1, y + 8, OLIVE_LT);
    p.hline(x, x + w - 1, y + 9, OLIVE_DK);
    p.hline(x, x + w - 1, y + 15, OLIVE_LT);
    p.hline(x, x + w - 1, y + 16, OLIVE_DK);
    p.hline(x, x + w - 1, y + h - 1, OLIVE_DK);
    for (let i = x + 15; i < x + w; i += 16) p.vline(i, y + 2, y + h - 2, OLIVE_DK);
    // the rope hooks along the top
    for (let i = x + 8; i < x + w - 4; i += 32) p.rect(i, y + 2, 2, 2, '#C8CCD2');
  };
  gate(ox, oy - 8, 160, 24);
  // the chalk はなまる on the far gate (12×10 at x 70)
  const hx = ox + 72;
  const hy = oy;
  p.ring(hx, hy + 2, 5, 4, '#F4F1E8');
  p.ring(hx, hy + 2, 2, 2, '#F4F1E8');
  for (let k = 0; k < 8; k++) p.set(Math.round(hx + Math.cos((k / 8) * Math.PI * 2) * 7), Math.round(hy + 2 + Math.sin((k / 8) * Math.PI * 2) * 5), '#E8E4D8');
  // the tail gate (col 0) seen from above: a thick olive edge, its latches, the tail lamps
  p.rect(ox, oy, 10, 80, OLIVE);
  p.vline(ox, oy, oy + 79, '#9AAA5A');
  p.vline(ox + 9, oy, oy + 79, OLIVE_DK);
  p.vline(ox + 4, oy, oy + 79, OLIVE_LT);
  p.rect(ox + 2, oy + 12, 6, 3, '#E84E3C');
  p.rect(ox + 2, oy + 62, 6, 3, '#E84E3C');
  p.rect(ox + 3, oy + 34, 4, 12, '#F2D23A'); // the yellow kei plate
  p.hline(ox + 4, ox + 5, oy + 38, '#2F4A8A');
  p.hline(ox + 4, ox + 5, oy + 42, '#2F4A8A');
  p.rect(ox + 150, oy, 10, 80, OLIVE);
  p.vline(ox + 150, oy, oy + 79, OLIVE_LT);
  // the spare rope's coil by the tail gate, the folded blue tarp by the cab
  p.ring(ox + 18, oy + 72, 4, 3, '#E8D8A0');
  p.rect(ox + 118, oy + 4, 22, 9, '#3A6AC8');
  p.hline(ox + 118, ox + 139, oy + 4, '#5A8AE0');
  p.hline(ox + 118, ox + 139, oy + 8, '#2F4A8A');
  const img = p.toCanvas();
  return { ox: 0, oy: -16, w: 212, h: 116, foot: 0, img: () => img, contact: 0 } satisfies PropArt;
});

/**
 * S14 (60 9.2 obj_c3_nidai_kairan, 62 4.1): under the vegetable basket
 * (5–6,4) the corner of a black circular board shows, 2 px — nobody would
 * see it who wasn't looking.
 */
registerProp('prop_c3_nidai_kairan', () => {
  const p = new PixelCanvas(32, 16);
  // (just the corner, past the basket's west side)
  p.rect(13, 13, 4, 2, '#2A2440');
  p.set(13, 13, '#3A3458');
  p.set(15, 14, '#F4F1E8');
  const img = p.toCanvas();
  // (sorted just after the basket, so its corner shows at the basket's foot)
  return { ox: 0, oy: 0, w: 32, h: 16, foot: 16, img: () => img, contact: 0 } satisfies PropArt;
});

/** The near gate (row 5), in front of the people: its ribs, the hooks, ツガオ便's mark, the wheels under it. */
registerProp('prop_c3_nidai_front', () => {
  const p = new PixelCanvas(160, 22);
  p.rect(0, 0, 160, 16, OLIVE);
  p.hline(0, 159, 0, '#9AAA5A');
  p.hline(0, 159, 1, OLIVE_LT);
  p.hline(0, 159, 6, OLIVE_LT);
  p.hline(0, 159, 7, OLIVE_DK);
  p.hline(0, 159, 11, OLIVE_LT);
  p.hline(0, 159, 12, OLIVE_DK);
  p.hline(0, 159, 15, OLIVE_DK);
  for (let i = 15; i < 160; i += 16) p.vline(i, 2, 14, OLIVE_DK);
  for (let i = 8; i < 156; i += 32) p.rect(i, 13, 2, 2, '#C8CCD2');
  // ツガオ便's mark, hand-painted: a white board, the tomato, two strokes of a name (not to be read)
  p.rect(66, 3, 28, 8, '#F4F1E8');
  p.ellipse(71, 7, 3, 3, '#E84E3C');
  p.set(70, 6, '#FF8A6A');
  p.hline(70, 72, 3, '#3A7A3A');
  p.hline(76, 91, 5, OLIVE_DK);
  p.hline(76, 88, 8, OLIVE_DK);
  // under the bed: its shade, the wheels, the mud flap
  p.rect(4, 16, 150, 2, '#26242C');
  p.rect(26, 16, 24, 6, '#2A2A30');
  p.rect(32, 17, 12, 3, '#9AA0A8');
  p.rect(52, 16, 3, 5, '#2A2A30');
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 160, h: 22, foot: 15, img: () => img, contact: 0 } satisfies PropArt;
});

/** The yellow crates (two tiers) and the basket of 星見台's cabbages. */
registerProp('prop_c3_nidai_container', (opts) => {
  const n = Number(opts.n ?? 3);
  return standProp(n * 16, 26, (p) => {
    for (let k = 0; k < n * 2; k++) {
      const x = (k % n) * 16 + 1;
      const y = k < n ? 12 : 3;
      if (k >= n && k % n === n - 1 && n > 2) continue;
      p.rect(x, y, 14, 10, '#FFD23F');
      p.hline(x, x + 13, y, '#F6D98A');
      p.vline(x + 13, y + 1, y + 9, '#D9A441');
      for (let i = x + 2; i < x + 13; i += 3) p.vline(i, y + 5, y + 8, '#E8B840');
      p.rect(x + 4, y + 3, 6, 2, '#A8742A');
      // the top tier: the vegetables heaped over the rim (tomatoes, cucumbers, eggplants, peppers)
      if (k >= n) {
        const veg = [['#E84E3C', '#FF8A6A'], ['#3A7A3A', '#6AA05A'], ['#4A2A5A', '#7A5A8A'], ['#4A9A3A', '#8ACB6B']][(k + (n === 2 ? 1 : 0)) % 4];
        for (let j = 0; j < 4; j++) {
          p.rect(x + 1 + j * 3, y - 2 + (j % 2), 3, 2, veg[0]);
          p.set(x + 1 + j * 3, y - 2 + (j % 2), veg[1]);
        }
      }
    }
    // the ropes over the stack, tied down to the gate's hooks
    for (let i = 0; i < n; i += 2) p.vline(i * 16 + 8, 1, 21, '#E8D8A0');
    p.hline(1, n * 16 - 2, 7, '#E8D8A0');
  }, { cx: n * 8, base: 16, shadow: 18 });
});

registerProp('prop_c3_nidai_cabbage', () =>
  standProp(32, 18, (p) => {
    p.rect(2, 8, 28, 9, '#8A5A3A');
    for (let x = 2; x < 30; x += 3) p.vline(x, 8, 16, '#C8A06A');
    p.hline(2, 29, 8, '#E8C890');
    for (const [x, y] of [[7, 6], [14, 5], [21, 6], [26, 7]] as const) {
      p.ellipse(x, y, 4, 3, '#9BCB6B');
      p.set(x - 1, y - 1, '#C9E08A');
      p.set(x + 1, y + 1, '#5FA85A');
    }
  }, { cx: 16, base: 16, shadow: 10 }),
);

/**
 * The view from the bed (flat, round the map): the road under the truck,
 * the verge and its guard rail rushing west, the far band going by slowly.
 * `flag_c3_nidai_view` (the scenario sets it): 0 夕鳴町 → paddies → the
 * mountain cutting (looping), 1 over the pass: the sea all along the far
 * band (12.2), 2 the harbour town and the slope to the cape (S14), 3 the
 * way home: the sea, then 夕鳴町's houses (S32).
 */
registerProp('prop_c3_nidai_view', () => {
  const [c, ctx] = (() => {
    const cv = document.createElement('canvas');
    cv.width = 384;
    cv.height = 216;
    return [cv, cv.getContext('2d')!] as const;
  })();
  let lastT = -1;
  const MX = 112;
  const MY = 60;
  const paint = (t: number, view: number, grade: PropEnv['grade']) => {
    const s = t / 1000;
    const rgb = (v: number[]) => `rgb(${v[0] | 0},${v[1] | 0},${v[2] | 0})`;
    // the sky over the far band
    const sky = ctx.createLinearGradient(0, 0, 0, 44);
    sky.addColorStop(0, rgb(grade.skyTop));
    sky.addColorStop(1, rgb(grade.skyBot));
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, 384, 44);
    // a still cloud
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fillRect(260, 10, 34, 5);
    ctx.fillRect(266, 6, 18, 4);
    // the far band (y 22–44): slow
    const far = (s * 14) % 384;
    const sea = view === 1 || view === 3 || view === 2;
    for (let k = -1; k < 3; k++) {
      const bx = Math.round(k * 192 - far);
      if (sea) {
        ctx.fillStyle = '#3A7EA8';
        ctx.fillRect(bx, 30, 192, 14);
        ctx.fillStyle = '#8CC4EC';
        ctx.fillRect(bx, 30, 192, 2);
        ctx.fillStyle = '#5AA0C8';
        for (let i = 0; i < 192; i += 23) ctx.fillRect(bx + i, 35 + (i % 3), 9, 1);
        ctx.fillStyle = '#6B8A6A';
        ctx.fillRect(bx + 120, 26, 18, 4);
        ctx.fillRect(bx + 124, 24, 8, 2);
        if (view === 2 && k % 2 === 0) {
          // S14: up on the cape ahead, the old white building with its blue band (the old aquarium)
          ctx.fillStyle = '#6B6A66';
          ctx.fillRect(bx + 40, 24, 40, 8);
          ctx.fillStyle = '#E8E4D8';
          ctx.fillRect(bx + 48, 14, 24, 12);
          ctx.fillStyle = '#3A7EA8';
          ctx.fillRect(bx + 48, 19, 24, 2);
          ctx.fillStyle = '#9AA0A8';
          ctx.fillRect(bx + 66, 10, 4, 4);
        }
      } else {
        // mountains, then the town's roofs or the cutting by phase
        ctx.fillStyle = '#5A7A6A';
        for (let i = 0; i < 192; i++) {
          const h = 10 + Math.round(Math.sin((i + k * 192) / 23) * 5 + Math.sin((i + k * 192) / 9) * 2);
          ctx.fillRect(bx + i, 44 - h, 1, h);
        }
        ctx.fillStyle = '#7A9A7A';
        for (let i = 0; i < 192; i += 3) ctx.fillRect(bx + i, 44 - 9 - Math.round(Math.sin((i + k * 192) / 23) * 5), 2, 1);
      }
    }
    // the near band north of the road (y 44–60): fast
    const near = (s * 90) % 768;
    ctx.fillStyle = view === 1 || view === 3 ? '#C8B488' : '#7AA85A';
    ctx.fillRect(0, 44, 384, 16);
    const phase = Math.floor(s / 6) % 3;
    for (let k = -1; k < 6; k++) {
      const bx = Math.round(k * 128 - (near % 128));
      if (view === 0 && phase === 0) {
        // 夕鳴町's houses and poles
        ctx.fillStyle = '#5A5E66';
        ctx.fillRect(bx + 10, 38, 44, 10);
        ctx.fillStyle = '#6B7186';
        ctx.fillRect(bx + 10, 38, 44, 2);
        ctx.fillStyle = '#E8E4D8';
        ctx.fillRect(bx + 12, 48, 40, 10);
        ctx.fillStyle = '#2A3A4A';
        ctx.fillRect(bx + 20, 50, 8, 5);
        ctx.fillRect(bx + 38, 50, 6, 5);
        ctx.fillStyle = '#9CC8E0';
        ctx.fillRect(bx + 21, 51, 2, 1);
        ctx.fillStyle = '#8A5A3A';
        ctx.fillRect(bx + 30, 51, 5, 7);
        // the block wall, a garden tree
        ctx.fillStyle = '#B8B4AC';
        ctx.fillRect(bx + 56, 54, 20, 5);
        ctx.fillStyle = '#3A7A3A';
        ctx.fillRect(bx + 60, 42, 10, 8);
        ctx.fillStyle = '#7A4A3A';
        ctx.fillRect(bx + 64, 50, 2, 5);
        // the utility pole
        ctx.fillStyle = '#A8A49C';
        ctx.fillRect(bx + 80, 26, 3, 34);
        ctx.fillStyle = '#8A867E';
        ctx.fillRect(bx + 76, 29, 11, 2);
      } else if (view === 0 && phase === 1) {
        // the paddies: rows of rice in ear (1 September: green going gold), a ridge between the fields
        ctx.fillStyle = '#8AA040';
        ctx.fillRect(bx, 45, 128, 15);
        ctx.fillStyle = '#A8B848';
        for (let i = 0; i < 128; i += 4) ctx.fillRect(bx + i, 46, 2, 13);
        ctx.fillStyle = '#D8C860';
        for (let i = 1; i < 128; i += 4) ctx.fillRect(bx + i, 46 + ((i * 7) % 5), 1, 1);
        ctx.fillStyle = '#9A8A5A';
        ctx.fillRect(bx + 100, 45, 3, 15);
      } else if (view === 0) {
        // the cutting: rock and trees close by
        ctx.fillStyle = '#6B6A66';
        ctx.fillRect(bx, 40, 128, 20);
        ctx.fillStyle = '#3A6A4A';
        ctx.fillRect(bx + 20, 36, 30, 10);
        ctx.fillRect(bx + 80, 34, 24, 12);
      } else if (view === 2) {
        // the harbour town's houses going by (焼き杉 and いぶし瓦), then pines on the slope to the cape
        if (k % 3 === 2) {
          ctx.fillStyle = '#2E5A3A';
          ctx.fillRect(bx + 20, 36, 14, 12);
          ctx.fillRect(bx + 70, 34, 16, 14);
          ctx.fillStyle = '#7A4A3A';
          ctx.fillRect(bx + 26, 48, 2, 10);
          ctx.fillRect(bx + 77, 48, 2, 10);
        } else {
          ctx.fillStyle = '#3A3530';
          ctx.fillRect(bx + 8, 40, 50, 18);
          ctx.fillStyle = '#5A5E66';
          ctx.fillRect(bx + 4, 36, 58, 6);
          ctx.fillStyle = '#C8C4B8';
          ctx.fillRect(bx + 20, 46, 8, 5);
        }
      } else {
        // sand, a pine now and then
        ctx.fillStyle = '#2E5A3A';
        ctx.fillRect(bx + 60, 36, 12, 10);
        ctx.fillStyle = '#7A4A3A';
        ctx.fillRect(bx + 65, 46, 2, 10);
      }
    }
    // the overhead wires along the poles (still: the poles come by evenly)
    if (view === 0 && phase === 0) {
      ctx.fillStyle = 'rgba(42,36,64,0.7)';
      ctx.fillRect(0, 30, 384, 1);
      ctx.fillRect(0, 34, 384, 1);
    }
    // the road (y 60–184): asphalt, the centre line's dashes rushing west
    ctx.fillStyle = '#6B7186';
    ctx.fillRect(0, 60, 384, 124);
    ctx.fillStyle = '#7A8092';
    for (let i = 0; i < 40; i++) ctx.fillRect((i * 97) % 384, 64 + ((i * 37) % 116), 2, 1);
    const road = (s * 160) % 64;
    ctx.fillStyle = '#E8E4D8';
    for (let x = -64; x < 384 + 64; x += 64) ctx.fillRect(Math.round(x - road), 178, 30, 2);
    ctx.fillRect(0, 62, 384, 1);
    // the verge and the guard rail (y 184–216): fastest
    ctx.fillStyle = view === 1 || view === 3 ? '#C8B488' : '#5FA85A';
    ctx.fillRect(0, 184, 384, 32);
    const g = (s * 200) % 48;
    ctx.fillStyle = '#9AA0A8';
    for (let x = -48; x < 384 + 48; x += 48) ctx.fillRect(Math.round(x - g), 188, 2, 12);
    ctx.fillStyle = '#E4E8EC';
    ctx.fillRect(0, 187, 384, 4);
    ctx.fillStyle = '#B8BCC4';
    ctx.fillRect(0, 189, 384, 1);
    ctx.fillStyle = '#F2A23A';
    for (let x = -96; x < 384 + 96; x += 96) ctx.fillRect(Math.round(x - ((s * 200) % 96)), 186, 2, 2);
    // the truck's own shadow on the road under the bed
    ctx.fillStyle = 'rgba(26,26,40,0.35)';
    ctx.fillRect(MX + 4, MY + 96, 200, 6);
  };
  return {
    ox: -MX,
    oy: -MY,
    w: 384,
    h: 216,
    foot: 0,
    flat: true,
    img: (env) => {
      const t = Math.floor(env.t / 33);
      if (t !== lastT) {
        lastT = t;
        paint(env.t, env.flag('flag_c3_nidai_view'), env.grade);
        // the bed itself stays the map's (the ground under the props)
        ctx.clearRect(MX, MY, 160, 96);
      }
      return c;
    },
  } satisfies PropArt;
});

// ---------------------------------------------------------------- 荷さばき場の上屋 (38–43,19–23, 62 3.3)

/**
 * The unloading shed: posts and a roof only. Anchored on its south row
 * (38,23); the roof (rows 19–21, raised) is a foreground part that goes
 * nearly clear while someone is under it (like 星見台's waiting hut, 52 3.3).
 */
registerProp('prop_c3_uwaya', () => {
  const W = 96;
  // the posts (front two full height, back two short behind the roof)
  const posts = new PixelCanvas(W, 84);
  for (const x of [2, W - 6]) {
    posts.rect(x, 0, 4, 84, '#9AA0A8');
    posts.vline(x, 0, 83, '#C8CCD2');
    posts.vline(x + 3, 0, 83, '#6B7186');
    posts.rect(x - 1, 80, 6, 4, '#6B7186');
  }
  const img = posts.toCanvas();
  // the roof: a corrugated sheet roof, a translucent ridge strip, its south eave
  const R = new PixelCanvas(W + 8, 70);
  for (let j = 0; j < 70; j++)
    for (let i = 0; i < W + 8; i++) {
      const lx = i % 4;
      let c = lx === 0 ? '#C8CCD2' : lx === 3 ? '#7A8088' : '#9AA0A8';
      if (j >= 20 && j < 28) c = lx === 0 ? '#F4F8FA' : '#D8E4EA';
      if (j >= 64) c = j === 64 ? '#E8ECF0' : j === 69 ? '#3A3F48' : '#6B7186';
      R.set(i, j, c);
    }
  for (let i = 0; i < W + 8; i += 13) for (let j = 30; j < 60; j++) if (h01(i, j, 3701) < 0.3) R.set(i + 1, j, '#8A6A4A');
  const roof = R.toCanvas();
  return {
    ox: 0,
    oy: -68,
    w: W,
    h: 84,
    foot: 15,
    img: () => img,
    fg: [{ ox: -4, oy: -84, img: () => roof, fade: { x: 0, y: -84, w: W, h: 100, alpha: 0.2, alpha3d: 0.12 } }],
    xray: 0.25,
    contact: 0,
  } satisfies PropArt;
});

// ---------------------------------------------------------------- the ending on the breakwater (S29・S31)

/**
 * S29 (60 10.29 カット1, 62 5.4): ナミエの 店から 運んだ 鉄板 on a low gas stand at the goza
 * (30–31,32): the yakisoba on it, the 青のり kept apart in a little dish (「……青のりは、別。」),
 * the steam rising. Shown while flag_c3_end_teppan (the scenario's).
 */
registerProp('prop_c3_end_teppan', () =>
  standProp(34, 20, (p) => {
    // the stand's legs and the gas bottle behind
    p.rect(3, 12, 2, 8, '#3A3F48');
    p.rect(29, 12, 2, 8, '#3A3F48');
    p.rect(14, 12, 6, 7, '#C8452E');
    p.hline(14, 19, 12, '#E8705A');
    // the iron plate, seen a little from above
    p.rect(0, 5, 34, 7, '#2A2440');
    p.rect(1, 6, 32, 5, '#3A3F48');
    p.hline(1, 32, 6, '#6B7186');
    // the noodles in a heap, sauce-brown, the cabbage's green
    for (let x = 6; x < 26; x++) {
      const h = 3 - Math.round(Math.abs(x - 15) / 5);
      for (let y = 0; y < h; y++) p.set(x, 8 - y, (x + y) % 3 === 0 ? '#F6D98A' : '#C8A06A');
    }
    for (const x of [9, 14, 19, 22]) p.set(x, 7, '#7AB84A');
    p.set(17, 6, '#E0567A');
    // the 青のり's little dish at the corner, apart
    p.ellipse(29, 4, 3, 1, '#F4F1E8');
    p.hline(28, 30, 4, '#3F7A3A');
  }, {
    cx: 16,
    base: 16,
    shadow: 24,
    extra: {
      over: (g, x, y, env) => {
        // the steam: soft wisps rising and leaning with the sea breeze
        for (let k = 0; k < 6; k++) {
          const t = ((env.t / 1400 + k / 6) % 1 + 1) % 1;
          const sx = x + 16 + (k % 3) * 5 - 5 + Math.round(Math.sin(env.t / 500 + k) * 1.5 + t * 4);
          const sy = y - 4 - Math.round(t * 18);
          g.rect(sx, sy, 2, 1, '#FFFFFF', 0.55 * (1 - t));
        }
      },
    },
  }),
);

/**
 * S29 on the beach (2026-10-20 依頼主「焼きそば焼いてる2人が後ろの方で何かやってるなって感じで全く良さが
 * 出てない。砂浜で広々と」): ナミエの 店の 長机に のせた 大きな 鉄板、5マス (80 px)。手前の 布は 食堂かもめの
 * 波の 柄、鉄板の 上に 焼きそばの 山（ソース色、キャベツ、紅しょうが）、左の はしに ソースと 油の びん、右の はしに
 * 白い パックの 山と 青のりの 小皿（「……青のりは、別。」）。鉄板の 下の ガスの 火が ちらちら。湯気と
 * ソースの においは events/ch3/ending.ts の 場面の 層（大きく、HD-2D でも 立つ）、ここは 鉄板の 上の 細い 湯気だけ。
 */
registerProp('prop_c3_end_yatai', () => {
  const W = 80;
  const H = 34;
  return standProp(W, H, (p) => {
    // the legs and the gas bottle behind
    for (const x of [4, 74]) p.rect(x, 20, 2, 14, '#3A3F48');
    p.rect(36, 22, 8, 11, '#C8452E');
    p.hline(36, 43, 22, '#E8705A');
    p.rect(38, 20, 4, 2, '#9AA0A8');
    // the table top, its front cloth: white with 食堂かもめ's blue waves
    p.rect(0, 16, W, 3, '#C8C2B4');
    p.hline(0, W - 1, 16, '#E8E4D8');
    p.rect(2, 19, W - 4, 11, '#F4F1E8');
    for (let x = 2; x < W - 2; x++) {
      const y = 24 + Math.round(Math.sin(x / 3) * 1.2);
      p.set(x, y, '#3A7EA8');
      p.set(x, y + 1, '#7AB8E8');
    }
    p.hline(2, W - 3, 29, '#C8C2B4');
    // the iron plate on the table, seen a little from above, its rim
    p.rect(12, 8, 56, 9, '#2A2440');
    p.rect(13, 9, 54, 7, '#3A3F48');
    p.hline(13, 66, 9, '#6B7186');
    p.hline(12, 67, 16, '#1B1733');
    // the noodles in a long heap, sauce-brown, the cabbage's green, the red ginger
    for (let x = 18; x < 62; x++) {
      const h = 3 - Math.round(Math.abs(x - 40) / 9);
      for (let y = 0; y < h; y++) p.set(x, 12 - y, (x + y) % 3 === 0 ? '#E8C07A' : (x * 7 + y) % 5 === 0 ? '#8A5A2A' : '#B8864A');
    }
    for (const x of [21, 27, 33, 44, 50, 57]) p.set(x, 11, '#7AB84A');
    for (const x of [30, 47]) p.set(x, 10, '#E0567A');
    // two spatulas lying at the front edge
    p.hline(24, 31, 15, '#C8C2B4');
    p.hline(50, 57, 15, '#C8C2B4');
    // left: the sauce and the oil bottles
    p.rect(3, 6, 3, 10, '#5A2A1A');
    p.rect(4, 4, 1, 2, '#E84E3C');
    p.rect(7, 9, 3, 7, '#F6D98A');
    p.set(8, 8, '#E8E4D8');
    // right: the stack of white packs, the 青のり's little dish apart
    for (let k = 0; k < 4; k++) p.rect(69, 13 - k * 2, 9, 2, k % 2 ? '#E8E4D8' : '#F4F1E8');
    p.ellipse(74, 5, 3, 1, '#F4F1E8');
    p.hline(73, 75, 5, '#3F7A3A');
  }, {
    cx: W / 2,
    base: 16,
    shadow: 64,
    extra: {
      over: (g, x, y, env) => {
        // the gas flame under the plate, flickering
        const f = Math.floor(env.t / 90) % 3;
        g.rect(x + 34, y + 17, 12, 1, f === 0 ? '#F6D98A' : '#E8705A', 0.85);
        g.rect(x + 36 + f, y + 16, 6, 1, '#7AB8E8', 0.7);
        // thin wisps over the plate (the big steam is the scene's)
        for (let k = 0; k < 8; k++) {
          const t = ((env.t / 1300 + k / 8) % 1 + 1) % 1;
          const sx = x + 20 + k * 5 + Math.round(Math.sin(env.t / 480 + k) * 1.5 + t * 3);
          const sy = y + 6 - Math.round(t * 14);
          g.rect(sx, sy, 2, 1, '#FFFFFF', 0.5 * (1 - t));
        }
      },
    },
  });
});

/**
 * S31 (60 10.29 カット3, 62 12.8): 写真館の 主人's old wooden tripod and box camera, standing on
 * the breakwater's sea edge looking north at everyone (the lens toward them). Shown while
 * flag_c3_end_tripod (the scenario's).
 */
registerProp('prop_c3_end_tripod', () =>
  standProp(16, 30, (p) => {
    // three wooden legs
    p.line(8, 12, 2, 29, '#8A5A3A');
    p.line(8, 12, 14, 29, '#8A5A3A');
    p.line(8, 12, 8, 29, '#6A4A2A');
    // the box camera, its brass lens facing us (north = the people; we see its back and side)
    p.rect(3, 4, 10, 8, '#2A2440');
    p.rect(4, 5, 8, 6, '#3A3F48');
    p.hline(4, 11, 5, '#6B7186');
    p.rect(6, 2, 4, 2, '#D9A441');
    // the shutter release's cable
    p.line(12, 9, 15, 16, '#1B1733');
  }, { cx: 8, base: 16, shadow: 12 }),
);
