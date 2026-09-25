// 1枚絵 cut_h_village_lit (52_ch2_level_art 12.1, 50_ch2_story 10.15, 51 10.8):
// the finale of the ヨビモドシ battle. From the plaza on 星見の丘 the whole
// village below, lit by the はなまるトマト that Kanenari-kun holds up at the
// bottom of the frame. **No villagers are drawn** — buildings, fields,
// water and lights only.
//
// Looking south from the hill: east (石黒牛舎 on its stone wall) is on the
// left, west (the three greenhouses) on the right; the nearest things — the
// terraced paddies, their scarecrows turned round to face the hill, and the
// abandoned field behind the electric fence — are at the bottom; the
// station, the rails and the parked village bus far off under the mountains.
//
// Built once. Every surface is painted twice — in the night's colours and
// in the colours it takes under the tomato — together with how strongly it
// answers the light (a wall turned to us, a roof's near eave, water:
// strongly; a roof, the ground: less; the mountains: not at all). The two
// are mixed per pixel by the light that reaches it (a fan from the net,
// weaker far off), in flat steps with a dither only at the seams. Per frame
// only the breathing of the light (0.8 Hz ±4%), the stars, the cue
// highlights (牛舎 → ハウス → 集会所 → 棚田, 0.3 s each, in step with the
// lines) and the net move. During the first 0.8 s the light reaches the
// village from the front to the back.
//
// The battle draws it through registerBattleCut('cut_h_village_lit').

import type { Gfx } from '../engine/gfx';
import { BAYER4, makeCanvas, PixelCanvas, toRgb } from '../engine/pixel';
import { hash2 } from '../engine/rng';
import { ease } from '../engine/tween';
import { registerBattleCut } from '../battle/api';

const W = 384;
const H = 216;
/** The net (the light's source): the hoop's centre in the picture. */
const SRC = { x: 192, y: 203 };

// ---- materials -----------------------------------------------------------------------------

interface Mat {
  /** Night colour (pal_h2: blue-violet). */
  n: string;
  /** Colour under the tomato's light. */
  l: string;
  /** How strongly it answers the light (0..1.2). */
  r: number;
}

const m = (n: string, l: string, r: number): Mat => ({ n, l, r });

const MAT = {
  groundFar: m('#1F1B33', '#4A3040', 0.25),
  ground: m('#221E38', '#5A3840', 0.26),
  groundHi: m('#27233F', '#7A4A44', 0.36),
  grass: m('#1D2034', '#4A4034', 0.35),
  grassHi: m('#232840', '#7A6038', 0.5),
  field: m('#231F36', '#5E3A34', 0.4),
  fieldRow: m('#1E2A34', '#5A5A2E', 0.5),
  yard: m('#2C2843', '#A06A50', 0.55),
  road: m('#2E2A45', '#A06A52', 0.55),
  roadEdge: m('#3A3654', '#D09468', 0.7),
  // 瓦 (dark tiles) and their near eave
  tile: m('#211F38', '#5A3E4C', 0.45),
  tileRow: m('#2A2844', '#744C56', 0.5),
  tileRidge: m('#34324E', '#9A6468', 0.6),
  tileEave: m('#3C385A', '#F59C62', 1),
  eaveShadow: m('#15131F', '#3A2428', 0.4),
  // galvanized sheet (the barn)
  sheet: m('#2B2E47', '#8A6060', 0.5),
  sheetRib: m('#353954', '#AA7668', 0.58),
  sheetEave: m('#464B6A', '#FFB27A', 1),
  vent: m('#131120', '#3A2430', 0.3),
  // walls turned to us
  wood: m('#2A2236', '#94543A', 0.95),
  woodDark: m('#1F1A2C', '#6A3828', 0.85),
  woodHi: m('#352A44', '#C0724A', 1),
  plaster: m('#34304E', '#F29C70', 1),
  plasterShade: m('#2A2740', '#B86A50', 0.9),
  block: m('#2C2A44', '#A86650', 0.85),
  windowDark: m('#15131F', '#3A2630', 0.5),
  sill: m('#3A3656', '#FFC090', 1),
  fan: m('#1A1828', '#4A2E30', 0.6),
  fanBlade: m('#2E2C44', '#A86452', 0.8),
  // greenhouse film: the light shines through it
  film: m('#2A2F4E', '#E8844A', 1),
  filmHi: m('#3A4468', '#FFD29A', 1.1),
  filmRib: m('#3A4060', '#F6A872', 1),
  filmFar: m('#262A46', '#B8663E', 0.9),
  plant: m('#172030', '#7A3E28', 0.75),
  plantHi: m('#1D2A34', '#B8642E', 0.85),
  fruit: m('#22203A', '#5A3A40', 0.6),
  // trees
  tree: m('#16202A', '#34302A', 0.35),
  treeMid: m('#1A2630', '#524230', 0.45),
  treeHi: m('#213038', '#8A6A3A', 0.65),
  cedar: m('#141C26', '#2E2C26', 0.3),
  cedarHi: m('#1B2630', '#5A4A30', 0.5),
  trunk: m('#1A1622', '#4A2E26', 0.5),
  // the abandoned field's tall grass
  susuki: m('#1B1D2E', '#4E3C2E', 0.45),
  susukiMid: m('#22243A', '#7A5A38', 0.6),
  susukiTip: m('#2E2E44', '#E0B070', 0.9),
  // terraces
  levee: m('#29243A', '#8A5438', 0.75),
  leveeHi: m('#37314D', '#E0985E', 1),
  rice: m('#1A2630', '#3E4228', 0.45),
  riceHi: m('#22323A', '#8A7A36', 0.7),
  water: m('#1A1C36', '#C2603A', 1.1),
  waterGlint: m('#2C3056', '#FFE0A0', 1.2),
  waterSky: m('#232548', '#E07A48', 1.1),
  // stone, concrete, rails
  stone: m('#2A293F', '#8E6856', 0.8),
  stoneDark: m('#1D1C2E', '#56403A', 0.7),
  stoneHi: m('#363450', '#C8906A', 0.95),
  concrete: m('#34324C', '#C08C6A', 0.75),
  rail: m('#3C3C58', '#F2B482', 0.9),
  // the scarecrows (facing us)
  cloth: m('#3A3854', '#F6D6AC', 1),
  clothShade: m('#2C2A44', '#C89878', 0.9),
  straw: m('#34302E', '#DCA45A', 0.95),
  strawDark: m('#28242A', '#9A6A3A', 0.85),
  shirt: m('#262A48', '#A05E54', 0.9),
  shirtDark: m('#1F2240', '#6E3C3C', 0.85),
  stick: m('#231E2C', '#7A4A30', 0.7),
  face: m('#1A1826', '#4A2A30', 0.4),
  // the bus
  busBody: m('#30364E', '#DC9E74', 0.95),
  busRoof: m('#3A4060', '#F2C090', 1),
  busStripe: m('#2A2A44', '#BC5448', 0.9),
  busGlass: m('#161A2C', '#56383C', 0.55),
  tire: m('#12101A', '#2A1C20', 0.3),
  pole: m('#1C1A2A', '#5A3A30', 0.5),
  wire: m('#26243A', '#8A5A40', 0.6),
} as const;

type MatKey = keyof typeof MAT;

// ---- the painter ---------------------------------------------------------------------------

class Painter {
  readonly night = new PixelCanvas(W, H);
  readonly lit = new PixelCanvas(W, H);
  readonly resp = new Float32Array(W * H);
  /** Things that give their own light (windows, lamps): drawn over both. */
  readonly glow = new PixelCanvas(W, H);

  put(x: number, y: number, k: MatKey): void {
    x = Math.round(x);
    y = Math.round(y);
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const mm = MAT[k];
    this.night.set(x, y, mm.n);
    this.lit.set(x, y, mm.l);
    this.resp[y * W + x] = mm.r;
  }

  /** Paint a colour that doesn't take the light (sky, mountains). */
  flat(x: number, y: number, c: string): void {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    this.night.set(x, y, c);
    this.lit.set(x, y, c);
    this.resp[y * W + x] = 0;
  }

  rect(x: number, y: number, w: number, h: number, k: MatKey): void {
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.put(x + i, y + j, k);
  }

  hline(x0: number, x1: number, y: number, k: MatKey): void {
    for (let x = x0; x <= x1; x++) this.put(x, y, k);
  }

  /** A shape from rows of characters, each character a material (`.` = nothing). */
  art(rows: string[], key: Record<string, MatKey>, ox: number, oy: number): void {
    rows.forEach((r, y) => [...r].forEach((ch, x) => ch !== '.' && key[ch] && this.put(ox + x, oy + y, key[ch])));
  }

  emit(x: number, y: number, c: string): void {
    this.glow.set(Math.round(x), Math.round(y), c);
  }
}

const dith = (x: number, y: number, v: number) => BAYER4[y & 3][x & 3] < v * 16;

// ---- sky and mountains (not lit) -------------------------------------------------------------

interface Star {
  x: number;
  y: number;
  c: string;
  tw: boolean;
}

/** Sky 0–96: #0B0B14 → #1B1733 in flat bands, the Milky Way from the top left down to the right, 60 stars. */
function paintSky(p: Painter): Star[] {
  const bands = ['#0B0B14', '#0F0E1C', '#131124', '#17142C', '#1B1733'];
  for (let y = 0; y < 100; y++) {
    const v = Math.min(1, y / 70) * (bands.length - 1);
    const i = Math.min(bands.length - 2, Math.floor(v));
    const f = v - i;
    for (let x = 0; x < W; x++) p.flat(x, y, f > 0.55 && dith(x, y, (f - 0.55) / 0.45) ? bands[i + 1] : bands[i]);
  }
  // the Milky Way: a band of #3A2B5C, grains of #7A5AA0 thickest along its middle
  for (let x = 0; x < W; x++) {
    const cy = 6 + x * 0.13 + Math.sin(x / 41) * 3;
    const half = 8 + Math.sin(x / 23 + 1) * 3;
    for (let y = Math.floor(cy - half - 4); y <= cy + half + 4; y++) {
      if (y < 0 || y >= 60) continue;
      const d = Math.abs(y - cy) / half;
      if (d > 1.35) continue;
      if (d > 1 && !dith(x, y, ((1.35 - d) / 0.35) * 0.5)) continue;
      const n = hash2(x, y, 91);
      let col = '#221C3E';
      if (d < 0.8) col = dith(x, y, (0.8 - d) * 1.4) ? '#3A2B5C' : '#2C2350';
      if (d < 0.5 && n > 0.82) col = '#7A5AA0';
      else if (d < 0.85 && n > 0.94) col = '#5A4480';
      p.flat(x, y, col);
    }
  }
  const stars: Star[] = [];
  for (let i = 0; i < 60; i++) {
    const x = Math.floor(hash2(i, 1, 55) * W);
    const y = Math.floor(hash2(i, 2, 55) * 54);
    const c = i < 10 ? '#C8C2B4' : '#FFF6D8';
    const tw = hash2(i, 3, 55) < 0.4;
    stars.push({ x, y, c, tw });
    if (!tw) p.flat(x, y, c);
  }
  return stars;
}

/** Three ridges (55–100) and 夕鳴町's glow and lights behind the western (right) one. */
function paintMountains(p: Painter): void {
  const ridge = (x: number, base: number, amp: number, f: number, seed: number) =>
    Math.round(base - amp * (0.55 + 0.45 * Math.sin(x / f + seed)) - 4 * (hash2(x >> 3, seed, 7) - 0.5) - 1.5 * Math.sin(x / 7 + seed));
  for (let y = 58; y < 94; y++)
    for (let x = 250; x < W; x++) {
      const d = Math.hypot((x - 340) / 72, (y - 81) / 15);
      if (d > 1 || !dith(x, y, (1 - d) * 0.95)) continue;
      p.flat(x, y, d < 0.45 ? '#4A3868' : '#3A2B5C');
    }
  const layers: [number, number, number, number, string, string][] = [
    [84, 24, 37, 1.3, '#2A2440', '#3A3258'],
    [92, 16, 29, 4.1, '#221D3A', '#2E2850'],
    [100, 9, 19, 2.2, '#1B1733', '#26203F'],
  ];
  for (const [base, amp, f, seed, col, rim] of layers)
    for (let x = 0; x < W; x++) {
      const top = ridge(x, base, amp, f, seed);
      for (let y = top; y < 112; y++) p.flat(x, y, col);
      p.flat(x, top, rim);
    }
  // 夕鳴町's lights in a notch of the far ridge
  for (const [x, y] of [
    [318, 78],
    [326, 79],
    [331, 77],
    [340, 80],
    [352, 78],
    [361, 79],
  ])
    p.flat(x, y, '#F6D98A');
}

// ---- the valley ------------------------------------------------------------------------------

/** The valley floor: ground, grassy banks, the forest at the mountains' feet. */
function paintGround(p: Painter): void {
  for (let y = 100; y < 192; y++)
    for (let x = 0; x < W; x++) {
      const n = hash2(x >> 1, y, 3);
      p.put(x, y, y < 118 ? 'groundFar' : n < 0.12 ? 'grass' : n > 0.93 ? 'groundHi' : 'ground');
    }
  // forest at the foot of the mountains (y ≈ 98–108): cedar tips and round crowns
  for (let x = 0; x < W; x++) {
    const cedar = hash2(x >> 2, 3, 5) < 0.5;
    const top = 99 + Math.round((cedar ? 1 : 3) * Math.abs(Math.sin(x / (cedar ? 2.2 : 5.5) + hash2(x >> 2, 0, 5) * 2)) + 2 * hash2(x >> 3, 1, 5));
    for (let y = top; y < 108; y++) p.put(x, y, y === top ? (cedar ? 'cedarHi' : 'treeMid') : cedar ? 'cedar' : 'tree');
  }
}

/** The rails, the platform and its shelter, the parked village bus, the prefectural road and its poles. */
function paintFar(p: Painter): void {
  // rails on their ballast
  for (let x = 30; x < 360; x++) {
    p.put(x, 108, 'stoneDark');
    p.put(x, 109, x % 11 === 0 ? 'rail' : 'concrete');
    p.put(x, 110, x % 2 ? 'stoneDark' : 'stone');
    p.put(x, 111, x % 9 === 4 ? 'rail' : 'concrete');
    p.put(x, 112, 'stoneDark');
  }
  // the platform and its white edge line
  p.rect(206, 113, 96, 2, 'concrete');
  p.hline(206, 301, 112, 'rail');
  p.hline(206, 301, 115, 'stoneDark');
  // the little shelter: a lean-to roof over a board wall, the one lamp of the station
  p.rect(238, 105, 23, 2, 'sheetEave');
  p.rect(239, 107, 21, 5, 'woodDark');
  p.rect(241, 108, 4, 3, 'windowDark');
  p.rect(252, 108, 5, 3, 'windowDark');
  p.emit(249, 107, '#E8ECF0');
  p.emit(248, 107, '#9AB0C8');
  p.emit(250, 107, '#9AB0C8');
  // the turning place and the bus parked in it (dark, facing west), its driver asleep at the terminus
  p.rect(118, 114, 90, 4, 'road');
  p.hline(118, 207, 114, 'roadEdge');
  p.art(
    ['..RRRRRRRRRRRRRRRRRR..', '.BgBgBgBgBgBgBgBgBgBgB.', 'BBgBgBgBgBgBgBgBgBgBgBB', 'BSSSSSSSSSSSSSSSSSSSSB', 'BBBBBBBBBBBBBBBBBBBBBB', '..tt..............tt..'],
    { R: 'busRoof', B: 'busBody', g: 'busGlass', S: 'busStripe', t: 'tire' },
    140,
    109,
  );
  p.rect(140, 110, 2, 2, 'windowDark');
  // the prefectural road winding across, its white edge dashed
  for (let x = 0; x < W; x++) {
    const y = 119 + Math.round(Math.sin(x / 60) * 1.5);
    p.put(x, y, 'road');
    p.put(x, y + 1, 'road');
    if (x % 5 < 3) p.put(x, y + 2, 'roadEdge');
  }
  // utility poles along it and the sagging wire between them
  const poles = [30, 96, 172, 262, 344];
  for (const [i, x] of poles.entries()) {
    const y = 119 + Math.round(Math.sin(x / 60) * 1.5);
    for (let k = 0; k < 11; k++) p.put(x, y - k, 'pole');
    p.hline(x - 2, x + 2, y - 9, 'pole');
    const nx = poles[i + 1];
    if (nx === undefined) continue;
    const ny = 119 + Math.round(Math.sin(nx / 60) * 1.5);
    for (let xx = x + 1; xx < nx; xx++) {
      const u = (xx - x) / (nx - x);
      p.put(xx, Math.round(y - 9 + (ny - y) * u + Math.sin(u * Math.PI) * 3), 'wire');
    }
  }
}

interface Zone {
  x: number;
  y: number;
  w: number;
  h: number;
}

/**
 * 石黒牛舎 (east → left): the long barn on its plateau. The north slope of
 * the galvanized roof with its ribs, the 越屋根 (a raised ridge vent) along
 * its length, the wall turned to us with three big ventilation fans, small
 * windows and the sliding door; the office shed at the end; the stone wall
 * under the plateau.
 */
function paintBarn(p: Painter): Zone {
  const x0 = 12;
  const x1 = 118;
  // the 越屋根: a narrow raised roof over the ridge, the dark vent gap under it
  for (let x = x0 + 8; x <= x1 - 8; x++) {
    p.put(x, 121, 'sheetEave');
    p.put(x, 122, (x - x0) % 4 === 0 ? 'sheetRib' : 'sheet');
    p.put(x, 123, 'vent');
    p.put(x, 124, x % 6 === 0 ? 'sheetRib' : 'vent');
  }
  for (const ex of [x0 + 7, x1 - 7]) for (let y = 121; y <= 124; y++) p.put(ex, y, 'woodDark');
  // main roof, north slope (y 125–137): ribs every 4 px, the near eave bright
  for (let y = 125; y <= 137; y++) {
    const inset = Math.round((137 - y) * 0.35);
    for (let x = x0 + inset; x <= x1 - inset; x++) {
      const rib = (x - x0) % 4 === 0;
      p.put(x, y, y === 137 ? 'sheetEave' : y === 125 ? 'sheetRib' : rib ? 'sheetRib' : 'sheet');
    }
    p.put(x0 + inset - 1, y, 'woodDark');
    p.put(x1 - inset + 1, y, 'woodDark');
  }
  // the wall (y 138–149): boards, the eave's shadow along the top, a block skirt at the bottom
  for (let y = 138; y <= 149; y++)
    for (let x = x0; x <= x1; x++) p.put(x, y, y === 138 ? 'eaveShadow' : y >= 147 ? 'block' : (x - x0) % 5 === 0 ? 'woodDark' : 'wood');
  // three ventilation fans (round) with their blades and a bright rim
  for (const fx of [30, 58, 86]) {
    for (let j = -3; j <= 3; j++)
      for (let i = -3; i <= 3; i++) {
        const d = Math.hypot(i, j);
        if (d > 3.4) continue;
        p.put(fx + i, 142 + j, d > 2.6 ? (j < 0 ? 'woodHi' : 'woodDark') : 'fan');
      }
    for (const [i, j] of [
      [0, 0],
      [-1, -1],
      [1, 1],
      [1, -1],
      [-1, 1],
    ])
      p.put(fx + i, 142 + j, 'fanBlade');
  }
  // small windows between the fans, each with a lit sill; the big sliding door on the right
  for (const wx of [40, 46, 68, 74]) {
    p.rect(wx, 140, 3, 2, 'windowDark');
    p.hline(wx, wx + 2, 142, 'sill');
  }
  p.rect(98, 139, 14, 10, 'woodDark');
  p.rect(99, 140, 6, 8, 'wood');
  p.rect(105, 140, 6, 8, 'woodHi');
  p.hline(98, 111, 139, 'sheetEave');
  // the office shed at the east end: a lean-to with a window
  p.rect(1, 135, 12, 2, 'sheetEave');
  p.rect(2, 137, 10, 11, 'plaster');
  p.hline(2, 11, 137, 'eaveShadow');
  p.rect(4, 139, 3, 3, 'windowDark');
  p.hline(4, 6, 142, 'sill');
  p.rect(2, 146, 10, 2, 'plasterShade');
  // feed bags stacked under the eave and the water tank by the shed
  p.art(['bbb', 'BbB'], { b: 'plaster', B: 'plasterShade' }, 114, 146);
  // the stone wall under the plateau (y 150–156): stones in courses, the top edge lit
  for (let y = 150; y <= 156; y++)
    for (let x = 0; x <= 126 - (y - 150); x++) {
      const course = y % 3 === 0;
      const joint = (x + (Math.floor(y / 3) % 2) * 3) % 6 === 0;
      p.put(x, y, y === 150 ? 'stoneHi' : course || joint ? 'stoneDark' : 'stone');
    }
  return { x: 0, y: 118, w: 130, h: 40 };
}

/**
 * The three greenhouses on the west slope (right). They run north–south,
 * so their near ends — arched, film over a steel frame — face us; their
 * long roofs go away behind. The film glows orange where the light comes
 * through; the tomato rows stand dark inside.
 */
function paintGreenhouses(p: Painter): Zone {
  const houses = [
    { x: 292, w: 25 },
    { x: 322, w: 25 },
    { x: 352, w: 25 },
  ];
  for (const [i, h] of houses.entries()) {
    const top = 125 + i;
    const base = 150;
    const cx = h.x + h.w / 2 - 0.5;
    // the long roof going away: an arch that narrows and rises toward the back
    for (let k = 7; k >= 1; k--) {
      const hw = (h.w / 2) * (1 - k * 0.035);
      const ty = top - k * 1.2;
      for (let x = Math.round(cx - hw); x <= Math.round(cx + hw); x++) {
        const u = (x - cx) / hw;
        const yy = Math.round(ty + (1 - Math.sqrt(Math.max(0, 1 - u * u))) * 8);
        p.put(x, yy, k === 7 ? 'filmRib' : (x - h.x) % 6 === 2 ? 'filmRib' : 'filmFar');
      }
    }
    // the arched end
    for (let y = top; y <= base; y++)
      for (let x = h.x; x < h.x + h.w; x++) {
        const u = (x - cx) / (h.w / 2);
        const archTop = top + Math.round((1 - Math.sqrt(Math.max(0, 1 - u * u))) * 8);
        if (y < archTop) continue;
        let k: MatKey = 'film';
        if (y === archTop) k = 'filmHi';
        else if (x === h.x || x === h.x + h.w - 1 || y === top + 10 || x === Math.round(cx)) k = 'filmRib';
        else if (y > top + 11 && (x - h.x) % 4 === 1) k = hash2(x, y, i) < 0.3 ? 'plantHi' : 'plant';
        else if (y > top + 11 && (x - h.x) % 4 === 2 && hash2(x, y, 5 + i) < 0.18) k = 'fruit';
        else if (y > archTop + 1 && y < top + 9 && hash2(x, y, 9 + i) < 0.06) k = 'filmHi';
        p.put(x, y, k);
      }
    // the door, the rolled-up side film, the footing
    p.rect(Math.round(cx) - 2, base - 7, 5, 7, 'plant');
    p.hline(h.x, h.x + h.w - 1, base - 1, 'filmRib');
    p.hline(h.x - 1, h.x + h.w, base, 'stoneDark');
  }
  // the work shed, the harvest crates, the water tank
  p.rect(275, 139, 14, 2, 'sheetEave');
  p.rect(276, 141, 12, 9, 'woodDark');
  p.hline(276, 287, 141, 'eaveShadow');
  p.rect(278, 143, 3, 3, 'windowDark');
  p.hline(278, 280, 146, 'sill');
  p.art(['CCCC', 'cCcC', 'CCCC', 'cCcC'], { C: 'woodHi', c: 'woodDark' }, 283, 146);
  p.art(['.TT.', 'TTTT', 'tTTt', 'tttt'], { T: 'concrete', t: 'stoneDark' }, 286, 131);
  return { x: 272, y: 112, w: 112, h: 42 };
}

/**
 * 旧 星見台分校 (the meeting hall): a long single-storey wooden school with
 * dark tiles; its row of windows turned to us, warm from inside, where the
 * three are asleep. The yard behind, the flagpole, the memorial stone.
 */
function paintSchool(p: Painter): Zone {
  const x0 = 146;
  const x1 = 242;
  p.rect(150, 118, 90, 4, 'yard');
  for (let k = 0; k < 13; k++) p.put(236, 108 + k, 'pole');
  p.put(236, 107, 'rail');
  // hip roof (y 122–133): tile rows, the ridge, the near eave lit
  for (let y = 122; y <= 133; y++) {
    const inset = Math.round((133 - y) * 0.9);
    for (let x = x0 + inset; x <= x1 - inset; x++) p.put(x, y, y === 133 ? 'tileEave' : y === 122 ? 'tileRidge' : (y - 122) % 3 === 0 ? 'tileRow' : 'tile');
  }
  p.put(x0 + 10, 121, 'tileEave');
  p.put(x1 - 10, 121, 'tileEave');
  // the wall (y 134–146): the eave's shadow, a plaster band, boards
  for (let y = 134; y <= 146; y++)
    for (let x = x0 + 1; x <= x1 - 1; x++) p.put(x, y, y === 134 ? 'eaveShadow' : y === 135 ? 'plaster' : y >= 145 ? 'block' : (x - x0) % 7 === 0 ? 'woodDark' : 'wood');
  // windows: warm from inside, frames in the wood
  for (let wx = x0 + 6; wx < x1 - 8; wx += 9) {
    if (wx > 184 && wx < 200) continue;
    for (let j = 0; j < 6; j++)
      for (let i = 0; i < 6; i++) {
        const frame = i === 3 || j === 3;
        p.put(wx + i, 137 + j, frame ? 'woodDark' : 'windowDark');
        if (!frame) p.emit(wx + i, 137 + j, j < 2 ? '#FFE7A3' : '#F6D98A');
      }
    p.hline(wx, wx + 5, 143, 'sill');
  }
  // the entrance porch in the middle: a small gable and the glass door
  p.rect(186, 130, 14, 2, 'tileEave');
  p.rect(187, 132, 12, 2, 'tile');
  p.rect(189, 136, 8, 10, 'woodDark');
  p.rect(190, 137, 6, 8, 'windowDark');
  for (let j = 0; j < 8; j++) for (let i = 0; i < 6; i++) if (i !== 3 && (i + j) % 2 === 0) p.emit(190 + i, 137 + j, '#E8C878');
  // the memorial stone and a small pine
  p.art(['.SS.', 'SsSS', 'SsSS', 'SSSS', 'dddd'], { S: 'stoneHi', s: 'stone', d: 'stoneDark' }, 206, 146);
  p.art(['..t..', '.tTt.', 'tTttT', '..w..'], { t: 'tree', T: 'treeHi', w: 'trunk' }, 213, 145);
  return { x: 140, y: 114, w: 110, h: 40 };
}

/** A farmhouse: hip roof, the eave's shadow, walls, windows (asleep: dark), a 蔵 or a garden beside some. */
function house(p: Painter, x: number, y: number, w: number, lived: boolean, seed: number): void {
  const rh = Math.max(4, Math.round(w * 0.38));
  for (let j = 0; j < rh; j++) {
    const inset = Math.round((rh - 1 - j) * 0.9);
    for (let i = inset; i < w - inset; i++) p.put(x + i, y - rh + 1 + j, j === rh - 1 ? 'tileEave' : j === 0 ? 'tileRidge' : j % 2 ? 'tileRow' : 'tile');
  }
  const wh = Math.max(4, Math.round(w * 0.34));
  for (let j = 1; j <= wh; j++)
    for (let i = 1; i < w - 1; i++) p.put(x + i, y + j, j === 1 ? 'eaveShadow' : j === wh ? 'block' : !lived ? (i % 3 === 0 ? 'woodDark' : 'wood') : i % 6 === 0 ? 'woodDark' : 'plaster');
  const wn = Math.max(1, Math.floor((w - 4) / 6));
  for (let k = 0; k < wn; k++) {
    const wx = x + 3 + k * 6;
    if (lived) {
      p.rect(wx, y + 2, 3, 2, 'windowDark');
      p.hline(wx, wx + 2, y + 4, 'sill');
    } else {
      // an empty house: the storm shutters are closed
      p.rect(wx, y + 2, 3, 3, 'woodDark');
      p.put(wx + 1, y + 2, 'woodHi');
    }
  }
  // a garden plot in front of the lived-in ones (rows of vegetables)
  if (lived && hash2(seed, 1, 77) < 0.6) {
    const gy = y + wh + 2;
    for (let j = 0; j < 3; j++) for (let i = 0; i < w - 2; i++) p.put(x + 1 + i, gy + j, j % 2 === 0 && i % 4 !== 3 ? 'fieldRow' : 'field');
  }
}

/** Farmhouses (8 lived in, 3 empty), lanes, fields and trees in the village's middle band. */
function paintVillage(p: Painter): void {
  // the lane up from the prefectural road, and the village street along the stone wall
  for (let y = 121; y <= 156; y++) {
    const x = 204 + Math.round(Math.sin(y / 9) * 1.5);
    p.put(x, y, 'road');
    p.put(x + 1, y, 'road');
    p.put(x + 2, y, y % 3 ? 'roadEdge' : 'road');
  }
  for (let x = 127; x < 292; x++) {
    p.put(x, 151, 'road');
    p.put(x, 152, 'road');
    if (x % 4 === 0) p.put(x, 153, 'roadEdge');
  }
  // fields between the houses: rows of vegetables, a darker furrowed plot
  const fields: [number, number, number, number][] = [
    [96, 124, 16, 8],
    [246, 136, 22, 10],
    [128, 140, 14, 8],
    [262, 118, 16, 5],
  ];
  for (const [fx, fy, fw, fh] of fields)
    for (let j = 0; j < fh; j++) for (let i = 0; i < fw; i++) p.put(fx + i, fy + j, j % 2 === 0 && i % 5 !== 4 ? 'fieldRow' : 'field');
  const homes: [number, number, number, boolean][] = [
    [128, 131, 17, true],
    [112, 122, 13, false],
    [250, 128, 19, true],
    [256, 116, 13, true],
    [132, 116, 13, true],
    [224, 114, 11, false],
    [166, 110, 10, true],
    [200, 109, 11, true],
    [272, 124, 12, true],
    [96, 116, 11, false],
    [110, 108, 9, true],
  ];
  homes.forEach(([x, y, w, lived], i) => house(p, x, y, w, lived, i));
  // persimmon (round crowns) and cedars (pointed) between the houses
  const trees: [number, number, number, boolean][] = [
    [123, 128, 5, false],
    [147, 115, 4, false],
    [244, 124, 5, false],
    [270, 113, 4, true],
    [186, 112, 4, false],
    [103, 131, 6, true],
    [214, 107, 3, false],
    [152, 108, 3, true],
    [285, 112, 3, true],
  ];
  for (const [tx, ty, r, cedar] of trees) {
    if (cedar) {
      for (let j = 0; j <= r * 2 + 1; j++) {
        const hw = Math.round((j / (r * 2 + 1)) * r);
        for (let i = -hw; i <= hw; i++) p.put(tx + i, ty - r + j, i > 0 && hash2(tx + i, j, 3) < 0.6 ? 'cedarHi' : 'cedar');
      }
      p.put(tx, ty + r + 2, 'trunk');
      continue;
    }
    for (let j = -r; j <= r; j++)
      for (let i = -r - 1; i <= r + 1; i++) {
        const d = Math.hypot(i / (r + 1), j / r);
        if (d > 1) continue;
        const lit = j > r * 0.1 && hash2(tx + i, ty + j, 4) < 0.6;
        p.put(tx + i, ty + j, lit ? 'treeHi' : d > 0.7 ? 'treeMid' : 'tree');
      }
    p.put(tx, ty + r + 1, 'trunk');
  }
}

/** 用水路: the channel across the village, concrete edges, the water full of the light. */
function paintCanal(p: Painter): void {
  for (let x = 0; x < W; x++) {
    const y = 157 + Math.round(Math.sin(x / 45 + 0.6) * 1.2);
    p.put(x, y, 'concrete');
    p.put(x, y + 1, 'water');
    p.put(x, y + 2, hash2(x >> 1, 0, 21) < 0.3 ? 'waterGlint' : 'waterSky');
    p.put(x, y + 3, 'stoneDark');
  }
  // the little bridge where the lane crosses
  p.rect(202, 156, 6, 5, 'concrete');
  p.hline(202, 207, 156, 'rail');
}

/**
 * 棚田 (the nearest, centre-right): terraces stepping down toward the hill,
 * each a strip of flooded paddy — the water full of the light, the rice
 * standing dark in rows against it — under a levee whose lip is lit. The
 * scarecrows stand in them, turned round to face the hill, toward us.
 */
function paintTanada(p: Painter): Zone {
  const steps = [
    { y: 163, h: 5 },
    { y: 169, h: 6 },
    { y: 176, h: 7 },
    { y: 184, h: 8 },
  ];
  const x0 = 150;
  const x1 = 344;
  for (const [i, s] of steps.entries()) {
    for (let x = x0; x < x1; x++) {
      const curve = Math.round(Math.sin(x / (30 + i * 6) + i) * 1.5);
      const top = s.y + curve;
      p.put(x, top - 1, 'leveeHi');
      p.put(x, top, 'levee');
      for (let y = top + 1; y < Math.min(192, top + s.h); y++) {
        // rice in rows (every other line, a stalk every 2–3 px); water between them
        const row = (y - top) % 2 === 0;
        const stalk = row && (x + i + (y >> 1)) % 3 !== 0;
        const n = hash2(x, y, 31 + i);
        if (stalk) p.put(x, y, n < 0.35 ? 'riceHi' : 'rice');
        else p.put(x, y, n < 0.12 ? 'waterGlint' : n < 0.5 ? 'water' : 'waterSky');
      }
    }
    for (let y = s.y - 2; y < s.y + s.h; y++) {
      p.put(x0 - 1, y, 'grass');
      p.put(x1, y, 'grass');
    }
  }
  // the path between the terraces (trodden earth, diagonal)
  for (let k = 0; k < 29; k++) {
    p.put(252 + Math.round(k * 0.4), 162 + k, 'groundHi');
    p.put(253 + Math.round(k * 0.4), 162 + k, 'ground');
  }
  // the scarecrows: straw hat, cloth face (へのへの), arms out on a crosspiece, a shirt
  const crow = ['..hhh..', '.hHhhH.', '..fff..', '.kfefk.', 'ssssss.', '.sSss..', '..sks..', '...k...', '...k...'];
  const key: Record<string, MatKey> = { h: 'straw', H: 'strawDark', f: 'cloth', e: 'face', s: 'shirt', S: 'shirtDark', k: 'stick' };
  for (const [cx, cy] of [
    [176, 157],
    [226, 163],
    [296, 158],
    [320, 171],
  ] as [number, number][]) {
    p.art(crow, key, cx, cy);
    p.put(cx - 1, cy + 4, 'stick');
    p.put(cx + 6, cy + 4, 'stick');
    p.put(cx + 2, cy + 3, 'clothShade');
  }
  return { x: 146, y: 152, w: 204, h: 44 };
}

/** 耕作放棄地 (left, near): tall grass gone to seed in mounded clumps, and the electric fence along it. */
function paintHouki(p: Painter): void {
  // rows of clumps, the far ones first; each a mound of leaves with plumes bending off its top
  for (let row = 0; row < 5; row++) {
    const baseY = 170 + row * 5;
    const n = 12 + row * 2;
    for (let c = 0; c < n; c++) {
      const cx = Math.round((c + hash2(c, row, 41)) * (148 / n));
      const hw = 4 + Math.round(hash2(c, row + 9, 41) * 3) + row;
      const hh = 5 + Math.round(hash2(c, row + 19, 41) * 3) + row;
      for (let i = -hw; i <= hw; i++) {
        const u = i / hw;
        const top = Math.round(baseY - hh * Math.sqrt(Math.max(0, 1 - u * u)) - (hash2(cx + i, row, 43) < 0.3 ? 1 : 0));
        for (let y = top; y <= baseY + 2; y++) p.put(cx + i, y, y === top ? 'susukiMid' : 'susuki');
      }
      // plumes: a few seed heads arching out of the clump, each 3–4 px, lit on their tops
      const plumes = 2 + Math.floor(hash2(c, row, 47) * 3);
      for (let k = 0; k < plumes; k++) {
        const px = cx + Math.round((hash2(c * 7 + k, row, 49) - 0.5) * hw * 1.4);
        const dir = hash2(c, k, 51) < 0.5 ? -1 : 1;
        const py = baseY - hh - 1 - Math.round(hash2(c, k, 53) * 2);
        p.put(px, py + 2, 'susukiMid');
        p.put(px, py + 1, 'susukiMid');
        p.put(px, py, 'susukiTip');
        p.put(px + dir, py, 'susukiTip');
        p.put(px + dir * 2, py + 1, 'susukiTip');
        if (hash2(c, k, 57) < 0.5) p.put(px + dir * 3, py + 2, 'susukiMid');
      }
    }
  }
  // the electric fence: along the field's far edge and down its side, posts with insulators
  for (let x = 0; x <= 148; x++) {
    p.put(x, 161 + Math.round(x * 0.02), x % 3 ? 'wire' : 'rail');
    p.put(x, 164 + Math.round(x * 0.02), 'wire');
  }
  for (let y = 162; y < 190; y++) {
    p.put(147, y, 'wire');
    if (y % 2) p.put(149, y + 1, 'wire');
  }
  for (let x = 4; x < 148; x += 16) {
    for (let y = 159; y < 167; y++) p.put(x, y + Math.round(x * 0.02), 'pole');
    p.put(x + 1, 161 + Math.round(x * 0.02), 'plaster');
  }
  // the gate (closed) with its warning plate
  p.rect(70, 159, 8, 1, 'rail');
  p.rect(72, 161, 4, 3, 'plaster');
}

/** The slope right of the terraces: trees and the 沢 coming down. */
function paintSlope(p: Painter): void {
  for (let y = 160; y < 192; y++) {
    const x = 362 + Math.round(Math.sin(y / 7) * 3);
    p.put(x, y, 'water');
    p.put(x + 1, y, y % 3 ? 'waterSky' : 'waterGlint');
    p.put(x - 1, y, 'stoneDark');
    p.put(x + 2, y, 'stone');
  }
  for (let c = 0; c < 7; c++) {
    const tx = 346 + Math.round(hash2(c, 1, 71) * 36);
    const ty = 164 + Math.round(hash2(c, 2, 71) * 22);
    const r = 3 + Math.round(hash2(c, 3, 71) * 3);
    for (let j = -r; j <= r; j++)
      for (let i = -r - 1; i <= r + 1; i++) {
        const d = Math.hypot(i / (r + 1), j / r);
        if (d > 1) continue;
        p.put(tx + i, ty + j, j > 0 && hash2(tx + i, ty + j, 8) < 0.5 ? 'treeHi' : d > 0.7 ? 'treeMid' : 'tree');
      }
  }
}

/** The near edge of the hill's plaza (y 188–216): short grass, tufts here and there. */
function paintPlaza(p: Painter): void {
  for (let y = 188; y < H; y++) for (let x = 0; x < W; x++) p.put(x, y, 'grass');
  for (let k = 0; k < 90; k++) {
    const x = Math.round(hash2(k, 1, 83) * W);
    const y = 190 + Math.round(hash2(k, 2, 83) * 20);
    p.put(x, y, 'grassHi');
    p.put(x - 1, y + 1, 'grassHi');
    p.put(x + 1, y + 1, 'grassHi');
  }
}

// ---- the build -------------------------------------------------------------------------------------

type ZoneId = 'barn' | 'house' | 'school' | 'tanada';

interface Built {
  night: HTMLCanvasElement;
  base: HTMLCanvasElement;
  lit: HTMLCanvasElement;
  glowC: HTMLCanvasElement;
  fan: HTMLCanvasElement;
  fg: HTMLCanvasElement;
  zones: Record<ZoneId, Zone>;
  stars: Star[];
}

let built: Built | null = null;

/** How much of the tomato's light reaches a point (0..1): a fan from the net, weaker far off. */
function reach(x: number, y: number): number {
  const up = Math.max(0, (SRC.y - y) / 112);
  const side = Math.abs(x - SRC.x) / 230;
  return Math.max(0, Math.min(1, 1.08 - 0.5 * Math.pow(up, 1.15) - 0.48 * Math.pow(side, 1.7)));
}

function build(): Built {
  const p = new Painter();
  const stars = paintSky(p);
  paintMountains(p);
  paintGround(p);
  paintFar(p);
  paintVillage(p);
  const barn = paintBarn(p);
  const school = paintSchool(p);
  const house = paintGreenhouses(p);
  paintCanal(p);
  paintHouki(p);
  paintSlope(p);
  const tanada = paintTanada(p);
  paintPlaza(p);
  const zones: Record<ZoneId, Zone> = { barn, school, house, tanada };
  const night = p.night.toCanvas();
  const litFull = p.lit.toCanvas();
  // the picture as it stands in the light: night and lit mixed in flat steps (quarters), a dither only at the seams
  const nightRgb = p.night.toCanvas().getContext('2d')!.getImageData(0, 0, W, H).data;
  const litRgb = litFull.getContext('2d')!.getImageData(0, 0, W, H).data;
  const [base, bctx] = makeCanvas(W, H, { willReadFrequently: true });
  const out = bctx.createImageData(W, H);
  const [lit, lctx] = makeCanvas(W, H, { willReadFrequently: true });
  const litOut = lctx.createImageData(W, H);
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const o = i * 4;
      const a = p.resp[i] ? Math.min(1, reach(x, y) * p.resp[i]) : 0;
      const v = a * 4;
      const lo = Math.floor(v);
      const f = v - lo;
      const lvl = Math.min(4, f < 0.3 ? lo : f > 0.7 ? lo + 1 : BAYER4[y & 3][x & 3] < ((f - 0.3) / 0.4) * 16 ? lo + 1 : lo) / 4;
      for (let c = 0; c < 3; c++) out.data[o + c] = Math.round(nightRgb[o + c] + (litRgb[o + c] - nightRgb[o + c]) * lvl);
      out.data[o + 3] = nightRgb[o + 3];
      // the flash layer: the lit colours where there is anything to light
      if (p.resp[i]) {
        for (let c = 0; c < 3; c++) litOut.data[o + c] = litRgb[o + c];
        litOut.data[o + 3] = Math.round(255 * Math.min(1, 0.4 + a));
      }
    }
  bctx.putImageData(out, 0, 0);
  lctx.putImageData(litOut, 0, 0);
  // the warm fan of light itself over everything (#F2894B → #FFE7A3, at most 45% at the net): dithered rings
  const [fan, fctx] = makeCanvas(W, H);
  const warm = toRgb('#F2894B');
  const hot = toRgb('#FFE7A3');
  for (let y = 120; y < H; y++)
    for (let x = 0; x < W; x++) {
      const d = Math.hypot(x - SRC.x, (y - SRC.y) * 1.7) / 240;
      if (d > 1) continue;
      const v = Math.pow(1 - d, 2.2) * 5;
      const lo = Math.floor(v);
      const f = v - lo;
      const lv = f < 0.25 ? lo : f > 0.75 ? lo + 1 : BAYER4[y & 3][x & 3] < ((f - 0.25) / 0.5) * 16 ? lo + 1 : lo;
      if (lv <= 0) continue;
      const c = lv >= 4 ? hot : warm;
      const a = [0, 0.08, 0.14, 0.24, 0.45][Math.min(4, lv)];
      fctx.fillStyle = `rgba(${c[0]},${c[1]},${c[2]},${a})`;
      fctx.fillRect(x, y, 1, 1);
    }
  // the foreground: the plaza's log fence and grass tufts in silhouette, their tops rimmed with the light
  const fgP = new PixelCanvas(W, H);
  const sil = '#0B0B14';
  for (let x = 0; x < W; x++) {
    const hh = 5 + Math.round(4 * hash2(x >> 1, 0, 61) + 2 * Math.sin(x / 5));
    for (let y = H - hh; y < H; y++) fgP.set(x, y, sil);
    if (hash2(x, 2, 61) < 0.3) fgP.set(x, H - hh - 1, sil);
    const r = reach(x, H - hh);
    if (r > 0.75 && hash2(x, 5, 61) < 0.5) fgP.set(x, H - hh - (hash2(x, 2, 61) < 0.3 ? 2 : 1), '#6A3A2E');
  }
  for (let x = 0; x < W; x++) {
    if (x > 172 && x < 212) continue;
    const y = 196 + Math.round(Math.sin(x / 70) * 1);
    fgP.set(x, y, sil);
    fgP.set(x, y + 1, sil);
    fgP.set(x, y + 2, sil);
    const r = reach(x, y);
    if (r > 0.6) fgP.set(x, y, dith(x, y, (r - 0.6) * 2.5) ? '#7A4230' : '#2A1E26');
  }
  for (const px of [14, 66, 120, 162, 222, 264, 318, 368]) {
    for (let y = 192; y < H; y++) {
      fgP.set(px, y, sil);
      fgP.set(px + 1, y, sil);
      fgP.set(px + 2, y, sil);
    }
    fgP.set(px + (px < SRC.x ? 2 : 0), 192, '#8A4A32');
    fgP.set(px + 1, 192, '#3A2226');
  }
  const fg = fgP.toCanvas();
  const glowC = p.glow.toCanvas();
  return { night, base, lit, glowC, fan, fg, zones, stars };
}

// ---- drawing ---------------------------------------------------------------------------------

/** Cue (line index) → which buildings brighten, and after how long. */
const CUE_FLASH: Record<number, [ZoneId, number][]> = {
  1: [['barn', 0]],
  2: [
    ['house', 0],
    ['school', 450],
    ['tanada', 900],
  ],
};

let lastCue = -1;
let cueAt = 0;
let lastT = 0;

/** Build the picture now (it takes a moment): call before the cross-fade. */
export function prepareVillageLit(): void {
  built ??= build();
}

/**
 * Draw the picture at `t` ms after it appeared; `cue` counts the lines read
 * so far (0: the light spreads, 1: 「……牛舎に、明かり。」, 2: 「ハウス。
 * 集会所。棚田。」, …).
 */
export function drawVillageLit(g: Gfx, t: number, cue = 0): void {
  built ??= build();
  const b = built;
  if (t < lastT) lastCue = -1;
  lastT = t;
  if (cue !== lastCue) {
    lastCue = cue;
    cueAt = t;
  }
  const ctx = g.ctx;
  // at first the light reaches the village from the front to the back
  const reveal = Math.min(1, t / 800);
  if (reveal >= 1) g.img(b.base, 0, 0);
  else {
    g.img(b.night, 0, 0);
    const edge = Math.round(H - ease.cubicOut(reveal) * (H - 96));
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, edge, W, H - edge);
    ctx.clip();
    g.img(b.base, 0, 0);
    ctx.restore();
    for (let x = 0; x < W; x += 2) g.px(x + ((edge >> 1) & 1), edge - 1, '#8A4E3A');
  }
  // stars that twinkle; the morning star, low on the left (east), does not
  for (const [i, s] of b.stars.entries()) {
    if (!s.tw) continue;
    const ph = (t / (700 + (i % 5) * 190) + hash2(i, 7, 55) * 7) % 3;
    g.px(s.x, s.y, ph < 1.6 ? s.c : ph < 2.3 ? '#8A7AB0' : '#3A3060');
  }
  g.rect(28, 64, 2, 2, '#FFF6D8');
  g.px(27, 65, '#6A5A8E');
  g.px(30, 64, '#6A5A8E');
  // the light breathes (0.8 Hz, ±4%)
  const s = Math.sin((t / 1000) * Math.PI * 2 * 0.8);
  const breath = 1 + 0.04 * s;
  if (reveal >= 1) {
    if (s > 0) g.alpha(0.1 * s, () => g.img(b.lit, 0, 0));
    else g.alpha(0.06 * -s, () => g.img(b.night, 0, 0));
  }
  // the buildings named in the lines brighten a step for 0.3 s, one after another
  for (const [zone, delay] of CUE_FLASH[cue] ?? []) {
    const ft = t - cueAt - delay;
    if (ft < 0 || ft > 300) continue;
    const k = ft < 60 ? ft / 60 : 1 - (ft - 60) / 240;
    const z = b.zones[zone];
    ctx.save();
    ctx.beginPath();
    ctx.rect(z.x, z.y, z.w, z.h);
    ctx.clip();
    g.alpha(0.6 * k, () => g.img(b.lit, 0, 0));
    ctx.restore();
  }
  // windows and lamps give their own light
  g.img(b.glowC, 0, 0);
  // the warm fan over everything
  g.alpha(Math.min(1, reveal * 1.4) * breath, () => g.img(b.fan, 0, 0));
  g.img(b.fg, 0, 0);
  drawNet(g, t, breath);
}

/** The top of the pole and the net at the bottom middle, the tomato glowing in it. */
function drawNet(g: Gfx, t: number, breath: number): void {
  const { x, y } = SRC;
  const sway = Math.round(Math.sin((t / 1000) * Math.PI * 2 * 0.4) * 1);
  const nx = x + sway;
  g.alpha(0.16 * breath, () => g.circle(nx, y, 15, '#F2894B'));
  g.alpha(0.26 * breath, () => g.circle(nx, y, 10, '#FFB27A'));
  // the pole, from below the frame up into the hoop (it leans with the sway)
  for (let yy = y + 8; yy < H; yy++) {
    const xx = Math.round(x + sway * ((H - yy) / (H - y)));
    g.rect(xx - 1, yy, 2, 1, '#1B1420');
    g.px(xx - 1, yy, '#6A3A2E');
  }
  // the hoop and the netting (every other pixel, lit from inside); the tomato
  g.ring(nx, y, 7, '#3A2A2E');
  g.px(nx - 5, y - 5, '#F2894B');
  g.px(nx - 6, y - 3, '#F2894B');
  g.px(nx - 4, y - 6, '#FFB27A');
  for (let j = -5; j <= 7; j++)
    for (let i = -6; i <= 6; i++) {
      if ((i + j) % 2 !== 0 || i * i + (j - 1) * (j - 1) > 36) continue;
      g.px(nx + i, y + j, j < 0 ? '#FFD29A' : '#F2A070');
    }
  const bob = Math.round(Math.sin(t / 400));
  g.circle(nx, y + 2 + bob, 3, '#E84E3C');
  g.rect(nx - 2, y + 1 + bob, 2, 1, '#FF8A6A');
  g.px(nx - 1, y + bob, '#FFE7A3');
  g.px(nx - 1, y - 1 + bob, '#3FA66B');
  g.px(nx, y - 2 + bob, '#3FA66B');
  g.px(nx + 1, y - 1 + bob, '#3FA66B');
}

registerBattleCut('cut_h_village_lit', drawVillageLit);
