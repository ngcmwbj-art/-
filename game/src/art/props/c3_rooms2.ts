// The rooms of 海ぞいの町 the second part needs (62_ch3_level_art 4.4〜4.7):
//
//  - サイレン塔の上 (map_c3_siren, 14×11): the open lookout in the noon sun
//    with the motor siren (ナリオサメ) facing south against the sky, its red
//    primed rail, and below it the little room at the top of the spiral
//    stairs — the old push button worn silver by 40 years of one finger, the
//    motor box, the duty roster;
//  - 灯台 (map_c3_toudai, 9×7): the lamp room — glass on every side, the
//    stepped rings of the Fresnel lens on its brass stand;
//  - 海の家 (map_c3_uminoie, 12×7): reed blinds and the light striping
//    through them, the shaved-ice machine and the ramen pot (no griddle:
//    yakisoba is たかし's), the long bench, the shelf of rings;
//  - 海の 中 (map_c3_umi, 48×14): the light's net on the floor (stopped at
//    12:00, swaying at 12:01), the sunk things, the townspeople's lost ones.
//
// At 12:00 nothing moves: what moves at 12:01 reads flag_ch3_stage (env.motion
// is the grade's: 0 at 12:00, 1 at 12:01).

import { mix, PixelCanvas } from '../../engine/pixel';
import { h01, ihash, valueNoise } from '../tiles/noise';
import { CP } from '../tiles/c3_ground';
import { getMapDef } from '../../world/maps';
import { blend, paintShell } from './ishell';
import { boards } from '../tiles/ifloor';
import { outline } from './kit';
import { standProp } from './hoshi_kit';
import { fontTextSmall } from './text';
import { registerProp } from './registry';
import type { PropArt, PropEnv } from './types';

const c3stage = (env: PropEnv): number => env.flag('flag_ch3_stage');

/** Frames cached by key. */
function cached<K>(make: (k: K) => HTMLCanvasElement): (k: K) => HTMLCanvasElement {
  const m = new Map<K, HTMLCanvasElement>();
  return (k) => {
    let c = m.get(k);
    if (!c) m.set(k, (c = make(k)));
    return c;
  };
}

/** The noon sky over the sea's horizon (stage 1 white-blue; the sea far below). */
function skyAndSea(p: PixelCanvas, x0: number, y0: number, w: number, h: number, horizon: number): void {
  for (let y = y0; y < y0 + h; y++)
    for (let x = x0; x < x0 + w; x++) {
      const t = (y - y0) / Math.max(1, horizon - y0);
      let c: string;
      if (y < horizon) c = mix(CP.skyTop, CP.skyBot, Math.min(1, t * 1.1));
      else {
        const u = (y - horizon) / Math.max(1, y0 + h - horizon);
        c = mix('#8CC4EC', CP.umi, Math.min(1, u * 1.6));
        if (((x * 7 + y * 13) % 29 === 0) && u > 0.2) c = mix(c, '#E8F4FA', 0.5);
      }
      p.set(x, y, c);
    }
  // a cloud that does not move
  const cx = x0 + Math.round(w * 0.68);
  const cy = y0 + Math.round((horizon - y0) * 0.35);
  for (const [dx, dy, rx, ry] of [[0, 0, 9, 3], [6, -2, 6, 3], [-7, 1, 5, 2]] as const) p.ellipse(cx + dx, cy + dy, rx, ry, '#FFFFFF');
  // the horizon's line
  p.hline(x0, x0 + w - 1, horizon, '#E8F4FA');
}

// ================================================================ サイレン塔の上

registerProp('prop_c3_siren_shell', () => {
  const rows = getMapDef('map_c3_siren')?.rows ?? [];
  const wood = boards({ bh: 5, lit: '#C8B898', base: '#A89878', shade: '#7A6A58', gap: '#4A3E34', nail: '#6A5A48', seed: 3701 });
  const sh = paintShell({
    rows,
    floor: (x, y, tx, ty, ch) => {
      if (ty <= 5 || ch === '=') {
        // the lookout: concrete in the full sun, the rain's stains, a drain line
        const n = valueNoise(x / 10, y / 8, 3703);
        let c = n > 0.62 ? '#D8D4C8' : n < 0.3 ? '#B8B4A8' : '#C8C4B8';
        if (h01(x, y, 3705) > 0.985) c = '#9A968C';
        if (ty === 4 && y % 16 === 15) c = '#A8A498';
        if (ch === '=') c = (x + y) % 4 === 0 ? '#5A5E66' : '#6B7186';
        return c;
      }
      // the little room: old boards, a step darker (the room is dim, #DCD6C8)
      return mix(wood(x, y), '#8A8070', 0.12);
    },
    wall: (x, y, fh) => {
      // grey-painted concrete inside, a dark green dado
      if (y >= fh - 10) return y === fh - 10 ? '#7A9A8A' : '#4E6A5E';
      return valueNoise(x / 7, y / 6, 3707) > 0.78 ? '#C8C4B8' : '#B8B4A8';
    },
    trim: '#9A968C',
    base: '#3A4A44',
    baseH: 3,
  });
  const p = sh.p;
  const W = sh.w * 16;
  // the open air round the lookout: the sky to the horizon behind the siren, the town's sea far below at the sides
  skyAndSea(p, 0, 0, W, 16, 11);
  for (const x0 of [0, (sh.w - 1) * 16])
    for (let y = 16; y < 6 * 16; y++)
      for (let x = x0; x < x0 + 16; x++) {
        const u = (y - 16) / (5 * 16);
        let c = mix(CP.umi, CP.umiDk, u);
        if (ihash(x, y, 3709) % 37 === 0) c = '#8CC4EC';
        p.set(x, y, c);
      }
  // the lookout's slab edge against the air (a lit lip, a dark under-edge)
  for (let y = 16; y < 6 * 16; y++) {
    p.set(16, y, '#E8E4D8');
    p.set(17, y, '#9A968C');
    p.set(W - 17, y, '#E8E4D8');
    p.set(W - 18, y, '#9A968C');
  }
  // the wall over the little room (6–7): the clock, the 40 years' duty roster, the stopwatch's nail, the iron doorway
  const wy = 6 * 16;
  // the clock (its hands below: 12:00, and 12:01 once the siren has sounded out)
  const ckx = 3 * 16 + 4;
  const cky = wy + 12;
  p.ellipse(ckx, cky, 6, 6, '#3A3F48');
  p.ellipse(ckx, cky, 5, 5, '#F4F1E8');
  for (let k = 0; k < 12; k += 3) p.set(Math.round(ckx + Math.sin((k / 12) * Math.PI * 2) * 4), Math.round(cky - Math.cos((k / 12) * Math.PI * 2) * 4), '#3A3F48');
  // the duty roster: a big sheet of ruled squares, every one ticked (strokes)
  const rx = 8 * 16 + 4;
  p.rect(rx, wy + 4, 40, 20, '#FBF3DC');
  p.strokeRect(rx, wy + 4, 40, 20, '#C8B898');
  for (let j = 0; j < 4; j++) for (let i = 0; i < 9; i++) p.set(rx + 3 + i * 4, wy + 8 + j * 4, ihash(i, j, 3711) % 5 ? '#2A2440' : '#E23B2E');
  p.hline(rx + 2, rx + 37, wy + 6, '#2A2440');
  // the stopwatch's nail (empty: it hangs on ミナト's neck)
  p.set(1 * 16 + 10, wy + 10, '#3A3F48');
  p.line(1 * 16 + 8, wy + 11, 1 * 16 + 12, wy + 11, '#9AA0A8');
  // the doorway out to the lookout (6–7,6–7): the iron frame, the bright air beyond
  const dx = 6 * 16;
  p.rect(dx - 2, wy, 36, 32, '#3A3F48');
  for (let y = wy + 2; y < wy + 32; y++) for (let x = dx + 1; x < dx + 31; x++) p.set(x, y, y < wy + 18 ? mix(CP.skyBot, '#FFFFFF', 0.3) : (x + y) % 4 === 0 ? '#B8B4A8' : '#C8C4B8');
  p.vline(dx - 2, wy, wy + 31, '#6B7186');
  p.vline(dx + 33, wy, wy + 31, '#2A2440');
  // a small window in the dim room's east wall (the light falls in a patch)
  for (let y = 8 * 16; y < 10 * 16; y++) for (let x = 7 * 16; x < 10 * 16; x++) if ((x + y) % 2 === 0 && x - 7 * 16 + (y - 8 * 16) * 0.6 < 30) blend(p, x, y, '#FFF6D8', 0.18);
  const p2 = p.clone();
  // 12:00: both hands up; 12:01: the long hand one mark on
  p.vline(ckx, cky - 4, cky, '#2A2440');
  p.vline(ckx + 1, cky - 3, cky, '#2A2440');
  p2.vline(ckx, cky - 3, cky, '#2A2440');
  p2.line(ckx, cky, ckx + 1, cky - 4, '#2A2440');
  const img1 = p.toCanvas();
  const img2 = p2.toCanvas();
  return { ox: 0, oy: 0, w: sh.w * 16, h: sh.h * 16, foot: 0, flat: true, img: (env) => (c3stage(env) >= 2 ? img2 : img1) } satisfies PropArt;
});

/** The lookout's rail (1–12,5) with the gap for the doorway: red primer, a lip of concrete under it. */
registerProp('prop_c3_siren_saku', () =>
  standProp(192, 18, (p) => {
    for (const [x0, x1] of [[0, 80], [112, 192]] as const) {
      p.rect(x0, 12, x1 - x0, 6, '#9A968C');
      p.hline(x0, x1 - 1, 12, '#D8D4C8');
      for (let x = x0 + 2; x < x1; x += 6) p.vline(x, 2, 11, CP.siren);
      p.hline(x0, x1 - 1, 1, mix(CP.siren, '#FF6A4D', 0.35));
      p.hline(x0, x1 - 1, 2, CP.siren);
      p.hline(x0, x1 - 1, 7, CP.siren);
      // where hands hold it the primer is worn to the metal
      for (let x = x0 + 10; x < x1 - 10; x += 37) p.hline(x, x + 3, 2, '#C8CDD4');
    }
  }, { cx: 96, base: 16, shadow: 10, outline: true }),
);

/**
 * ナリオサメ: the old motor siren on the lookout (4–9,1), facing south —
 * the round drum with its slotted mouth (the rotor's teeth behind the
 * slots), the rusty cone hat, the red primed stand, the motor's housing at
 * its back. On its brass plate the black stamp 「まだ」 at 12:00; at 12:01
 * ミナト's chalk はなまる (62 6.2・7.3). 96 × 48.
 */
function nariosame(stage: number): HTMLCanvasElement {
  const p = new PixelCanvas(96, 56);
  const prime = CP.siren;
  const drum = '#5A7A6A';
  const drumLt = '#7A9A8A';
  const drumDk = '#3A5A4A';
  // the stand: a red primed frame on the slab, bolts
  p.rect(30, 44, 36, 10, prime);
  p.hline(30, 65, 44, mix(prime, '#FF6A4D', 0.4));
  p.rect(26, 52, 44, 4, '#7A3A26');
  for (const x of [32, 63]) p.set(x, 48, '#3A2A22');
  // the motor's housing behind (the north side), its cable down the stand
  p.rect(36, 16, 24, 22, drumDk);
  p.hline(36, 59, 16, drum);
  p.vline(64, 30, 52, '#2A2440');
  // the drum: an ellipse seen from the south, lit from above
  p.ellipse(48, 30, 26, 15, drum);
  p.ellipse(46, 25, 18, 7, drumLt);
  p.ellipse(48, 30, 26, 15, drum);
  for (let y = 16; y < 46; y++)
    for (let x = 22; x < 75; x++) {
      const dx = (x - 48) / 26;
      const dy = (y - 30) / 15;
      if (dx * dx + dy * dy > 1) continue;
      if (dy < -0.45 && dx < 0.4) p.set(x, y, drumLt);
      else if (dy > 0.55 || dx > 0.75) p.set(x, y, drumDk);
    }
  // the mouth: the slots, the dark rotor behind them
  for (let k = -5; k <= 5; k++) {
    const x = 48 + k * 4;
    const hh = Math.round(Math.sqrt(Math.max(0, 1 - ((k * 4) / 24) ** 2)) * 9);
    p.vline(x, 30 - hh, 30 + hh, '#1A2A24');
    p.vline(x + 1, 30 - hh + 1, 30 + hh - 1, '#2A3A30');
  }
  p.hline(24, 72, 30, drumDk);
  // the rim, a band of rivets
  for (let k = 0; k < 24; k++) {
    const a = (k / 24) * Math.PI * 2;
    p.set(Math.round(48 + Math.cos(a) * 24), Math.round(30 + Math.sin(a) * 13), drumLt);
  }
  // rust down from the rivets
  for (const x of [30, 41, 57, 66]) for (let k = 0; k < 5; k++) p.set(x, 40 + k, mix('#8A5A3A', drum, k / 6));
  // the cone hat: rusty iron on three short legs
  p.poly([[16, 14], [80, 14], [58, 1], [38, 1]], '#8A6A4A');
  p.line(16, 14, 80, 14, '#5A3A2A');
  p.line(38, 1, 18, 13, '#B89070');
  for (let x = 24; x < 74; x += 7) p.line(x, 13, Math.round(48 + (x - 48) * 0.4), 2, '#7A5A3A');
  for (const x of [26, 48, 70]) p.vline(x, 15, 18, '#3A2A22');
  p.vline(48, 0, 1, '#5A3A2A');
  // the brass plate; the black stamp at 12:00 / the chalk はなまる at 12:01
  p.rect(43, 38, 10, 5, '#D9A441');
  p.hline(43, 52, 38, '#F6D98A');
  p.hline(45, 50, 40, '#8A6A2A');
  if (stage < 2) {
    p.ellipse(54, 41, 5, 3, '#0B0B14');
    p.set(52, 41, '#2A2440');
    p.set(55, 40, '#2A2440');
  } else {
    p.ring(56, 37, 6, 4, '#F4F1E8');
    p.ring(56, 37, 4, 2, '#F4F1E8');
    for (let k = 0; k < 8; k++) p.set(56 + Math.round(Math.cos(k * 0.8) * 8), 37 + Math.round(Math.sin(k * 0.8) * 5), '#F4F1E8');
  }
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

registerProp('prop_c3_nariosame', () => {
  const at = cached((s: number) => nariosame(s));
  return {
    ox: 0,
    oy: 16 - 56,
    w: 96,
    h: 56,
    foot: 15,
    img: (env) => at(c3stage(env) >= 2 ? 2 : 1),
    shadow: 40,
    contact: 60,
    contactX: 48,
  } satisfies PropArt;
});

/** The lightning rod's legs and a coil of old cable (1–3,1). */
registerProp('prop_c3_siren_hiraishin', () =>
  standProp(40, 44, (p) => {
    p.vline(20, 0, 40, '#9AA0A8');
    p.vline(21, 2, 40, '#6B7186');
    p.set(20, 0, '#E8E4D8');
    p.line(8, 42, 20, 20, '#9AA0A8');
    p.line(32, 42, 21, 20, '#6B7186');
    p.rect(6, 40, 28, 4, '#7A3A26');
    p.ring(30, 36, 5, 3, '#3A3F48');
    p.ring(30, 36, 3, 2, '#3A3F48');
  }, { cx: 24, base: 16, shadow: 40 }),
);

/** The inspection box on the rail's east end (10–12,1): a grey steel box, its door's label, a padlock. */
registerProp('prop_c3_siren_tenken', () =>
  standProp(36, 30, (p) => {
    p.rect(6, 6, 24, 22, '#9AA0A8');
    p.hline(6, 29, 6, '#C8CDD4');
    p.vline(29, 7, 27, '#6B7186');
    p.rect(9, 10, 18, 14, '#8E95A6');
    p.rect(12, 12, 10, 4, '#FBF3DC');
    p.hline(13, 20, 14, '#2A2440');
    p.rect(24, 17, 2, 3, '#D9A441');
    p.rect(4, 28, 28, 2, '#7A3A26');
  }, { cx: 24, base: 16, shadow: 26 }),
);

/**
 * The button panel (3–4,8): a grey steel board, the red push button under
 * its little hood — the paint round it worn to the metal in the shape of a
 * finger (40 years) — the stopwatch's hook, the lamp. 32 × 28.
 */
registerProp('prop_c3_siren_ban', () =>
  standProp(32, 30, (p) => {
    p.rect(2, 4, 28, 26, '#8E95A6');
    p.hline(2, 29, 4, '#B8BCC4');
    p.vline(29, 5, 29, '#5A5E66');
    p.rect(4, 20, 24, 10, '#6B7186');
    // the worn patch, the button, its hood
    p.ellipse(16, 13, 6, 5, '#C8CDD4');
    p.ellipse(15, 12, 4, 3, '#E0E4E8');
    p.ellipse(16, 13, 3, 3, '#C8452E');
    p.ellipse(15, 12, 1, 1, '#FF8A6A');
    p.hline(10, 22, 7, '#3A3F48');
    p.set(9, 8, '#3A3F48');
    p.set(23, 8, '#3A3F48');
    // a lamp (off), a switch, the old label (strokes)
    p.ellipse(7, 23, 2, 2, '#5A7A6A');
    p.rect(20, 22, 4, 5, '#2A2440');
    p.rect(6, 26, 12, 2, '#FBF3DC');
  }, { cx: 16, base: 16, shadow: 20 }),
);

/** The siren's motor box (10–11,8): a big grey box with a cooling grille, a cable up through the ceiling. */
registerProp('prop_c3_siren_kikai', () =>
  standProp(32, 32, (p) => {
    p.rect(1, 6, 30, 24, '#7A8278');
    p.hline(1, 30, 6, '#9AA29A');
    p.vline(30, 7, 29, '#4E564E');
    for (let y = 10; y < 22; y += 3) p.hline(5, 26, y, '#3A403A');
    p.rect(8, 23, 16, 4, '#FBF3DC');
    p.hline(9, 22, 25, '#2A2440');
    p.vline(26, 0, 6, '#2A2440');
    p.vline(27, 0, 6, '#3A3F48');
  }, { cx: 16, base: 16, shadow: 24 }),
);

// ================================================================ 灯台（レンズの部屋）

registerProp('prop_c3_toudai_shell', () => {
  const rows = getMapDef('map_c3_toudai')?.rows ?? [];
  const sh = paintShell({
    rows,
    floor: (x, y) => {
      // the checker plate of the lamp room, painted white long ago
      const lx = x % 8;
      const ly = y % 8;
      let c = '#C8CCD2';
      if ((lx === 1 && ly < 4) || (ly === 5 && lx > 3)) c = '#E0E4E8';
      if (lx === 7 || ly === 7) c = '#A8AEB6';
      if (h01(x, y, 3721) > 0.99) c = '#8E95A6';
      return c;
    },
    wall: (x, y, fh) => {
      // the glass all round: the sky and the sea outside, the iron mullions
      if (x % 24 < 2) return '#3A3F48';
      if (y < 3 || y >= fh - 4) return '#3A3F48';
      const hz = Math.round(fh * 0.55);
      if (y < hz) return mix(CP.skyTop, CP.skyBot, y / hz);
      return mix('#8CC4EC', CP.umi, Math.min(1, (y - hz) / 8));
    },
    trim: '#5A5E66',
    base: '#3A3F48',
    baseH: 2,
  });
  const p = sh.p;
  // the glass's glints, its mask for the sky's reflection
  for (let x = 16; x < (sh.w - 1) * 16; x++) {
    if (x % 24 === 6 || x % 24 === 7) for (let y = 18; y < 24; y++) p.set(x, y, '#FFFFFF');
    for (let y = 19; y < 28; y++) if (x % 24 >= 2) sh.glass.set(x, y, '#ffffff');
  }
  // the sides: the glass curves round (the void's sections become window)
  for (const x0 of [0, (sh.w - 1) * 16])
    for (let y = 16; y < (sh.h - 1) * 16; y++)
      for (let x = x0 + (x0 ? 0 : 4); x < x0 + (x0 ? 12 : 16); x++) {
        const c = y % 24 < 2 ? '#3A3F48' : mix(CP.umi, CP.umiDk, (y - 16) / 80);
        p.set(x, y, c);
      }
  // the stairs' mouth (4,5): the iron spiral going down into the dark
  const sx = 4 * 16;
  const sy = 5 * 16;
  p.rect(sx, sy, 16, 16, '#2A2440');
  for (let k = 0; k < 4; k++) p.rect(sx + 2 + k * 3, sy + 3 + k * 3, 12 - k * 3, 2, mix('#9AA0A8', '#2A2440', k / 4));
  const img = p.toCanvas();
  const glass = sh.glass.toCanvas();
  return { ox: 0, oy: 0, w: sh.w * 16, h: sh.h * 16, foot: 0, flat: true, img: () => img, glass } satisfies PropArt;
});

/** The lamp room's rail by the stairs (1–7,5): white iron, the gap at the stairs' mouth (4,5). */
registerProp('prop_c3_toudai_saku', () =>
  standProp(112, 14, (p) => {
    for (const [x0, x1] of [[0, 48], [64, 112]] as const) {
      for (let x = x0 + 2; x < x1; x += 6) p.vline(x, 2, 13, '#E8E4D8');
      p.hline(x0, x1 - 1, 2, '#E8E4D8');
      p.hline(x0, x1 - 1, 3, '#B8B2A4');
      p.hline(x0, x1 - 1, 9, '#E8E4D8');
    }
  }, { cx: 56, base: 16, shadow: 8 }),
);

/**
 * The Fresnel lens (3–5,2–3) on its brass stand: the stepped rings of glass
 * seen from the south, catching the noon (62 7.3 fushigi_ch3_05). `lit`:
 * how many of the three spots on the sea it has found (flag_ch3_lens_n):
 * its heart glows warmer as they come. 48 × 44.
 */
function lens(lit: number): HTMLCanvasElement {
  const p = new PixelCanvas(48, 46);
  // the brass stand and its turntable
  p.rect(10, 36, 28, 8, '#B88A3A');
  p.hline(10, 37, 36, '#F6D98A');
  p.hline(10, 37, 43, '#6A4A1A');
  p.rect(16, 30, 16, 6, '#D9A441');
  p.hline(16, 31, 30, '#F6D98A');
  // the lens: a tall barrel of glass rings (prisms) round a bullseye
  const cx = 24;
  const cy = 17;
  for (let y = 1; y < 32; y++)
    for (let x = 6; x < 42; x++) {
      const dx = (x - cx) / 18;
      const dy = (y - cy) / 16;
      const r = Math.sqrt(dx * dx + dy * dy);
      if (r > 1) continue;
      const ring = Math.floor(r * 6);
      const inRing = (r * 6) % 1;
      let c = ring % 2 ? '#9ED8EA' : '#C8ECF4';
      if (inRing < 0.18) c = '#FFFFFF';
      if (inRing > 0.85) c = '#6AA8C0';
      if (dx > 0.5 && dy > 0) c = mix(c, '#4A88A0', 0.35);
      p.set(x, y, c);
    }
  // the bullseye's heart: the noon caught in it
  const heart = ['#E8F4FA', '#FFF6D8', '#FFE7A3', '#FFD27A'][Math.max(0, Math.min(3, lit))];
  p.ellipse(cx, cy, 4, 4, heart);
  p.ellipse(cx - 1, cy - 1, 1, 1, '#FFFFFF');
  // the brass frame's bands across the rings
  for (const y of [5, 17, 29]) p.hline(9, 39, y, '#B88A3A');
  p.vline(cx, 1, 32, '#B88A3A');
  outline(p, { bottom: true, soft: true });
  return p.toCanvas();
}

registerProp('prop_c3_lens', () => {
  const at = cached((n: number) => lens(n));
  return {
    ox: 0,
    oy: 32 - 46,
    w: 48,
    h: 46,
    foot: 31,
    img: (env) => at(Math.min(3, env.flag('flag_ch3_lens_n'))),
    glow: (g, x, y, env) => {
      // the glints of the rings (stopped at 12:00: always the same ones)
      const n = env.flag('flag_ch3_lens_n');
      g.rect(x + 23, y + 3, 1, 1, '#FFFFFF', 0.9);
      if (n > 0) g.rect(x + 22, y + 1, 4, 4, '#FFE7A3', 0.25 + n * 0.12);
    },
    shadow: 30,
    contact: 32,
    contactX: 24,
  } satisfies PropArt;
});

// ================================================================ 海の家

registerProp('prop_c3_uminoie_shell', () => {
  const rows = getMapDef('map_c3_uminoie')?.rows ?? [];
  const wood = boards({ bh: 6, lit: '#D8C098', base: '#B89A6A', shade: '#8A6A48', gap: '#6A4A34', nail: '#7A5A3A', seed: 3731 });
  const sh = paintShell({
    rows,
    floor: (x, y, tx, ty, ch) => {
      if (ch === 'k' || ch === 'K') {
        const lx = x % 8;
        const ly = y % 8;
        return lx === 7 || ly === 7 ? '#A8A498' : '#D8D4C8';
      }
      // boards with sand carried in on bare feet
      let c = wood(x, y);
      if (h01(x, y, 3733) < 0.06 + (ty >= 5 ? 0.06 : 0)) c = h01(x, y, 3735) < 0.5 ? CP.sand : CP.sandLt;
      return c;
    },
    wall: (x, y, fh) => {
      // plywood boards painted sky blue long ago, sun-faded; the reed blinds high up
      if (y < 12) return (x + (y >> 1)) % 3 === 0 ? '#A88A5A' : '#C8A86A';
      if (y >= fh - 8) return '#6A8AA0';
      return x % 20 === 19 ? '#7AA0B8' : valueNoise(x / 9, y / 7, 3737) > 0.7 ? '#B8D4E0' : '#A8C8D8';
    },
    trim: '#8A6A3A',
    base: '#4A6A80',
    baseH: 3,
  });
  const p = sh.p;
  // the menu boards on the wall (5–8,1): かき氷 (the 「氷」 a readable red), ラーメン, ジュース (strokes)
  const mx = 5 * 16;
  for (let k = 0; k < 4; k++) {
    const x = mx + k * 15;
    p.rect(x, 14, 13, 14, '#FBF3DC');
    p.strokeRect(x, 14, 13, 14, '#C8A06A');
    if (k === 0) fontTextSmall(p, '氷', x + 2, 16, '#E84E3C');
    else for (let j = 0; j < 3; j++) p.hline(x + 3, x + 9, 17 + j * 3, k === 1 ? '#2F4A8A' : '#3A3F48');
  }
  // the window to the sea (9–10,0–1)
  p.rect(9 * 16 + 2, 12, 26, 14, '#8A6A3A');
  for (let y = 14; y < 24; y++) for (let x = 9 * 16 + 4; x < 9 * 16 + 26; x++) p.set(x, y, y < 19 ? mix(CP.skyTop, CP.skyBot, (y - 14) / 5) : CP.umi);
  for (let x = 9 * 16 + 4; x < 9 * 16 + 26; x++) sh.glass.set(x, 15, '#ffffff');
  // the reed blind's striped light on the floor (8.4): thin bands, sharp at noon
  for (let ty = 2; ty < 6; ty++)
    for (let y = ty * 16; y < ty * 16 + 16; y++)
      for (let x = 16; x < 11 * 16; x++) if ((x + y) % 7 < 2) blend(p, x, y, '#FFF6D8', 0.16);
  const img = p.toCanvas();
  const glass = sh.glass.toCanvas();
  return { ox: 0, oy: 0, w: sh.w * 16, h: sh.h * 16, foot: 0, flat: true, img: () => img, glass } satisfies PropArt;
});

/** The kitchen (1–3,2): the shaved-ice machine with its block of ice, the ramen pot on the gas, the syrups. */
registerProp('prop_c3_uminoie_kitchen', () =>
  standProp(48, 30, (p) => {
    p.rect(0, 12, 48, 18, '#C8CCD2');
    p.hline(0, 47, 12, '#E8ECF0');
    p.rect(0, 22, 48, 8, '#9AA0A8');
    // the shaved-ice machine: red, its wheel, the block melting (stopped)
    p.rect(4, 0, 12, 12, '#E84E3C');
    p.hline(4, 15, 0, '#FF8A6A');
    p.ellipse(18, 5, 3, 3, '#3A3F48');
    p.rect(7, 5, 6, 4, '#E8F4FA');
    p.set(8, 6, '#FFFFFF');
    // syrups: red, green, yellow, blue
    for (const [k, c] of (['#E23B2E', '#3FA66B', '#FFD23F', '#3A7EA8'] as const).entries()) {
      p.rect(22 + k * 3, 6, 2, 6, c);
      p.set(22 + k * 3, 5, '#F4F1E8');
    }
    // the ramen pot on its burner, steam stopped as a white column
    p.rect(34, 8, 12, 5, '#9AA0A8');
    p.ellipse(40, 8, 6, 2, '#C8CDD4');
    for (const [x, y] of [[39, 4], [41, 1], [40, -1]] as const) p.ellipse(x, y + 2, 2, 1, '#FFFFFF');
  }, { cx: 24, base: 16, shadow: 0, foot: 15 }),
);

/** The counter (4,2–3): a narrow board on posts, a bell, a jar of straws. */
registerProp('prop_c3_uminoie_counter', () =>
  standProp(16, 38, (p) => {
    p.rect(1, 6, 14, 30, '#A87A4A');
    p.hline(1, 14, 6, '#D8B080');
    for (let y = 10; y < 36; y += 6) p.hline(1, 14, y, '#8A5A3A');
    p.rect(4, 2, 4, 4, '#D9A441');
    p.rect(10, 1, 3, 5, '#E8F4FA');
    p.vline(11, 0, 2, '#E84E3C');
  }, { cx: 8, base: 32, shadow: 0, foot: 31 }),
);

/** The long bench and its low table (7–8,2–3), the lunch at the whistle (S09): bowls, a jug of barley tea. */
registerProp('prop_c3_uminoie_bench', () =>
  standProp(32, 36, (p) => {
    p.rect(1, 6, 30, 8, '#C8A06A');
    p.hline(1, 30, 6, '#E8C890');
    p.rect(1, 14, 30, 3, '#8A5A3A');
    for (const x of [3, 27]) p.rect(x, 17, 2, 6, '#6A4A2A');
    p.ellipse(9, 9, 3, 2, '#F4F1E8');
    p.ellipse(9, 8, 2, 1, '#E8C890');
    p.ellipse(22, 9, 3, 2, '#F4F1E8');
    p.rect(15, 3, 4, 7, '#E8C890');
    p.hline(15, 18, 3, '#F4F1E8');
    // the bench itself in front
    p.rect(0, 26, 32, 4, '#A87A4A');
    p.hline(0, 31, 26, '#D8B080');
    for (const x of [2, 28]) p.rect(x, 30, 2, 5, '#6A4A2A');
  }, { cx: 16, base: 32, shadow: 0, foot: 31 }),
);

/** The shelf of rings to rent (10,4): rings in a stack, a rubber boat folded, a price card (strokes). */
registerProp('prop_c3_uminoie_tana', () =>
  standProp(16, 32, (p) => {
    p.rect(1, 2, 14, 30, '#8A6A48');
    for (const y of [10, 20]) p.hline(1, 14, y, '#5A3A2A');
    for (const [y, c] of [[6, '#E84E3C'], [16, '#FFD23F'], [26, '#3A7EA8']] as const) {
      p.ring(8, y, 5, 3, c);
      p.ring(8, y, 4, 2, c);
      p.set(5, y - 2, '#F4F1E8');
    }
    p.rect(2, 0, 12, 3, '#FBF3DC');
  }, { cx: 8, base: 16, shadow: 24 }),
);

// ================================================================ 海の 中

/**
 * The water's light over the floor (flat, the whole map): the light's net
 * (caustics) on the floor and on the rocks' tops — stopped at 12:00, swaying
 * slowly at 12:01 (62 8.7) — and the water a step darker towards the south
 * (deeper). The shafts of light, the surface's band and the bubbles are a
 * world effect over everything (world/c3sea.ts).
 */
registerProp('prop_c3_umi_shell', () => {
  const W = 48 * 16;
  const H = 14 * 16;
  // the net's cells: a cached pattern 64×64, drawn twice at two drifts
  const net = new PixelCanvas(64, 64);
  for (let y = 0; y < 64; y++)
    for (let x = 0; x < 64; x++) {
      const v = Math.abs(valueNoise(x / 9, y / 9, 3741) - 0.5) + Math.abs(valueNoise((x + 20) / 7, (y + 9) / 7, 3742) - 0.5) * 0.6;
      if (v < 0.07) net.set(x, y, '#E8FAFF');
    }
  const netC = net.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: W,
    h: H,
    foot: 0,
    flat: true,
    img: () => null,
    over: (g, x, y, env) => {
      const sway = c3stage(env) >= 2 ? env.t / 1000 : 0;
      const dx = Math.round(Math.sin(sway * 0.7) * 6 + sway * 3) % 64;
      const dy = Math.round(Math.cos(sway * 0.5) * 4) % 64;
      g.alpha(0.28, () => {
        for (let ty = 0; ty < H; ty += 64) for (let tx = 0; tx < W; tx += 64) g.img(netC, x + tx - dx, y + ty - dy);
      });
      // deeper to the south: the floor darkens
      for (let k = 0; k < 6; k++) g.rect(x, y + 8 * 16 + k * 16, W, 16, '#1A3A5A', 0.04 + k * 0.03);
    },
  } satisfies PropArt;
});

/** A way up (the foot of the harbour steps / the beach's slope): light pouring down, the surface's silver. */
registerProp('prop_c3_umi_agari', (opts) => {
  const hama = opts.v === 'hama';
  return standProp(16, 16, (p) => {
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 16; x++) {
        const t = y / 15;
        p.set(x, y, mix('#E8FAFF', hama ? '#A8CED0' : '#6E9294', t * 0.8));
      }
    for (let k = 0; k < 4; k++) p.hline(2, 13, 3 + k * 3, hama ? '#FFFFFF' : '#C8DCDC');
  }, { cx: 8, base: 16, outline: false, extra: { flat: true } });
});

/** The old anchor and its chain (10–11,3–4), half sunk in the mud. */
registerProp('prop_c3_umi_ikari', () =>
  standProp(32, 32, (p) => {
    p.vline(16, 4, 26, '#4A3A30');
    p.vline(17, 4, 26, '#6A5040');
    p.hline(10, 23, 8, '#4A3A30');
    for (let x = 6; x < 27; x++) {
      const y = 26 - Math.round(Math.sqrt(Math.max(0, 100 - (x - 16) ** 2)) * 0.5);
      p.set(x, y, '#5A4636');
      p.set(x, y + 1, '#3A2A22');
    }
    p.ring(16, 3, 2, 2, '#5A4636');
    for (let k = 0; k < 6; k++) p.ring(19 + k * 2, 3 - (k % 2), 1, 1, '#4A3A30');
    p.rect(4, 27, 24, 4, '#3A585C');
  }, { cx: 16, base: 32, shadow: 0, foot: 31 }),
);

/** The big rock of the beach's floor (34–35,3–4), weed on its shoulders. */
registerProp('prop_c3_umi_bigrock', () =>
  standProp(32, 34, (p) => {
    p.ellipse(16, 20, 15, 13, '#3E5A66');
    p.ellipse(13, 15, 10, 7, '#56747E');
    p.ellipse(11, 12, 4, 2, '#7A98A0');
    p.ellipse(20, 26, 10, 5, '#2A4250');
    for (const x of [6, 9, 24, 27]) p.vline(x, 8 + (x % 3), 14, '#3E6A4E');
  }, { cx: 16, base: 32, shadow: 0, foot: 31 }),
);

/** The old rowing boat lying on the sand (27–28,8–9), its planks parting. */
registerProp('prop_c3_umi_boat', () =>
  standProp(32, 30, (p) => {
    for (let x = 2; x < 30; x++) {
      const t = (x - 2) / 27;
      const top = 10 + Math.round((1 - Math.sin(t * Math.PI)) * 6);
      for (let y = top; y < 26; y++) p.set(x, y, (y - top) % 5 === 4 ? '#3A2A22' : y < top + 2 ? '#8A7458' : '#6A5640');
    }
    p.hline(6, 25, 18, '#2A1A14');
    p.rect(14, 12, 4, 10, '#5A4636');
    p.rect(2, 26, 28, 3, '#76A0AA');
  }, { cx: 16, base: 32, shadow: 0, foot: 31 }),
);

/** The pile of old rings on the floor (43–45,10). */
registerProp('prop_c3_umi_ukiwa', () =>
  standProp(48, 18, (p) => {
    for (const [x, y, c] of [[10, 10, '#A85A50'], [22, 12, '#B8A040'], [34, 9, '#4A7AA0'], [16, 6, '#C8C8C0'], [29, 4, '#A85A50']] as const) {
      p.ring(x, y, 7, 4, c);
      p.ring(x, y, 6, 3, mix(c, '#3A585C', 0.3));
    }
  }, { cx: 24, base: 16, shadow: 0, foot: 15 }),
);

/** Seaweed (no collision): 3 kinds; stopped at 12:00, swaying at 12:01. */
registerProp('prop_c3_umi_mo', (opts) => {
  const v = Number(opts.v ?? 0) % 3;
  const frames = [0, 1, 2, 1].map((k) => {
    const p = new PixelCanvas(16, 22);
    const col = ['#3E6A4E', '#5A8A3A', '#6A5A3A'][v];
    const lt = mix(col, '#C8E8C0', 0.3);
    for (let s = 0; s < 3; s++) {
      const bx = 4 + s * 4;
      for (let y = 21; y > 4 + s * 3; y--) {
        const sway = Math.round(Math.sin((21 - y) / 4 + s) * 1.2 + ((21 - y) / 17) * (k - 1));
        p.set(bx + sway, y, y % 4 === 0 ? lt : col);
      }
    }
    return p.toCanvas();
  });
  return {
    ox: 0,
    oy: -6,
    w: 16,
    h: 22,
    foot: 15,
    img: (env) => (c3stage(env) >= 2 ? frames[Math.floor(env.t / 260 + Number(opts.v ?? 0)) % frames.length] : frames[1]),
  } satisfies PropArt;
});

/** The lost things on the floor (flat; 60 9.4): 『か』の板, the tackle, the shell bracelet, the glasses — each with a glint. */
registerProp('prop_c3_umi_otoshimono', (opts) => {
  const v = String(opts.v ?? 'ka');
  const p = new PixelCanvas(16, 16);
  if (v === 'ka') {
    p.rect(1, 3, 14, 11, '#F4F1E8');
    p.strokeRect(1, 3, 14, 11, '#8AB0C0');
    fontTextSmall(p, 'か', 4, 4, '#2F4A8A');
  } else if (v === 'shikake') {
    p.line(2, 2, 12, 10, '#E8F4FA');
    p.line(12, 10, 13, 14, '#E8F4FA');
    p.ellipse(13, 13, 1, 1, '#5A5E66');
    p.ellipse(6, 5, 1, 1, '#E84E3C');
  } else if (v === 'bracelet') {
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      p.ellipse(8 + Math.round(Math.cos(a) * 5), 8 + Math.round(Math.sin(a) * 4), 1, 1, k % 2 ? '#F4F1E8' : '#F2C8C8');
    }
  } else {
    p.ring(4, 8, 3, 3, '#2A2440');
    p.ring(12, 8, 3, 3, '#2A2440');
    p.hline(7, 9, 7, '#2A2440');
    p.set(2, 6, '#F4F1E8');
  }
  outline(p, { soft: true });
  const img = p.toCanvas();
  return {
    ox: 0,
    oy: 0,
    w: 16,
    h: 16,
    foot: 15,
    flat: true,
    img: () => img,
    glow: (g, x, y, env) => {
      // a glint that catches the light now and then (still at 12:00: the same one, faint)
      const k = c3stage(env) >= 2 ? (Math.sin(env.t / 300 + x) + 1) / 2 : 0.4;
      g.rect(x + 11, y + 3, 1, 1, '#FFFFFF', 0.4 + k * 0.6);
      if (k > 0.8) {
        g.rect(x + 10, y + 3, 3, 1, '#FFFFFF', 0.4);
        g.rect(x + 11, y + 2, 1, 3, '#FFFFFF', 0.4);
      }
    },
  } satisfies PropArt;
});

/** 〔深い所のはし〕 (45,12): the white sand drops away into deep blue at the floor's south-east corner. */
registerProp('prop_c3_umi_fuchi', () => {
  const p = new PixelCanvas(32, 16);
  for (let y = 0; y < 16; y++)
    for (let x = 0; x < 32; x++) {
      const d = (x + y * 1.4) / 40;
      if (d < 0.3) continue;
      p.set(x, y, mix('#76A0AA', '#0E2236', Math.min(1, (d - 0.3) * 1.8)));
    }
  const img = p.toCanvas();
  return { ox: -8, oy: 0, w: 32, h: 16, foot: 15, flat: true, img: () => img } satisfies PropArt;
});

/** The sunk letterbox (10,12): a small red box on its side in the mud, its flap open (62 16.2). */
registerProp('prop_c3_umi_post', () => {
  const p = new PixelCanvas(16, 16);
  p.rect(2, 6, 12, 8, '#8A3A30');
  p.hline(2, 13, 6, '#B85A48');
  p.rect(4, 8, 8, 2, '#2A1A14');
  p.rect(1, 13, 14, 2, '#3A585C');
  outline(p, { soft: true });
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 16, h: 16, foot: 15, flat: true, img: () => img } satisfies PropArt;
});
