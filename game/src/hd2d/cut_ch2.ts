// HD-2D: chapter 2's cuts (2026-10-06, 依頼主「第２章もHD-2Dにしてみよう」).
// The ending's and the prologue's scenes run on the field — the hill, the
// barn, the house, the terraces, the gathering room, the turning circle,
// 夕鳴町's bus stop and the crossing, the home — so in HD-2D they are the 3D
// village, town and rooms already; each shot gets a lens of its own here
// (CH2_SHOTS, through cut.ts's endingView.shot), and the painted pictures
// that show a place — the sunrise over the hill's east fence
// (cut_h_sunrise), the village lit by the tomato (cut_h_village_lit) — get
// the 3D place drawn into them under their painted sky.

import * as THREE from 'three';
import { game } from '../engine/game';
import { makeCanvas } from '../engine/pixel';
import { H, W } from '../engine/screen';
import { registerDebug } from '../debug';
import { flag } from '../game/state';
import { field, type FieldScene } from '../world/field';
import { fxElsewhere, registerWorldFx } from '../world/fx';
import { villageLitView, type VillageLit3D } from '../ui/cut_village_lit';
import { cloneGrade, GRADES_H, type Grade } from '../world/lighting';
import { sunriseView, type SunriseLand } from '../ui/cut_sunrise';
import { boundView, type ShotDef } from './cut';
import { clearSky, KEY, maskOf, withoutSkyBackdrops } from './battle';
import type { Hd2dView, StillPose } from './view';

// ---------------------------------------------------------------- the shots

/**
 * Chapter 2's ending (events/ch2/ending.ts, through endingView.shot): each
 * cut a little lower and nearer than the field's camera, easing in, drifting
 * slowly — as chapter 1's (cut.ts SHOTS). Inside, as there, the shot's own
 * lens and no room stretch. lookN only outdoors.
 */
export const CH2_SHOTS: Record<string, ShotDef> = {
  // cut 1, back on the plaza in the morning's colours after the sunrise: the two at the east fence
  // (the plaza's camera stands at its middle and the two are at its east fence: a wider lens keeps them in, as the 2D does)
  h1_plaza: { lens: { pitch: 36, fov: 30, dist: 25, lookN: 0.4, lift: 0.5 }, to: { pitch: 35, dist: 24.5 }, drift: 7000 },
  // 2a the barn: the morning through the east windows, the cows at the troughs, マサル with the cart
  h2_barn: { lens: { pitch: 38, fov: 26, dist: 24, lift: 0.5 }, to: { pitch: 36, dist: 22.5 }, drift: 6000 },
  // 2b the house: down the rows from the door's end, the green going red
  h2_house: { lens: { pitch: 34, fov: 26, dist: 24, lift: 0.6 }, to: { pitch: 32, dist: 22 }, drift: 5000 },
  // 2c the terraces: the morning dew, トマじい at the water gate
  h2_tanada: { lens: { pitch: 30, fov: 26, dist: 25, lookN: 0.6, lift: 0.3 }, to: { pitch: 28, dist: 24 }, drift: 4000 },
  // 2d the gathering room: the window opened, the three waking
  h2_school: { lens: { pitch: 38, fov: 26, dist: 23, lift: 0.5 }, to: { dist: 22 }, drift: 4000 },
  // 2e the path's mouth: まつ先生 looking up at the morning sun
  h2_path: { lens: { pitch: 28, fov: 26, dist: 23, lookN: 0.6, lift: 0.6 }, to: { pitch: 26, dist: 22 }, drift: 4000 },
  // cut 3 the turning circle: the send-off, the bus (not much lower than the field's: the hedge along
  // the rails south of the circle would stand up blurred across the bottom)
  h3_bus: { lens: { pitch: 37, fov: 26, dist: 25, lookN: 0.6, lift: 0.5 }, to: { pitch: 36, dist: 24 }, drift: 12000 },
  // cut 4 夕鳴町's stop at night
  h4_stop: { lens: { pitch: 32, fov: 26, dist: 25, lookN: 0, lift: 0.5 }, to: { pitch: 31, dist: 24 }, drift: 12000 },
  // cut 4b the turning circle again: マル and とまたろう
  h4b_bus: { lens: { pitch: 36, fov: 24, dist: 24, lookN: 0.6, lift: 0.5 }, to: { dist: 23 }, drift: 8000 },
  // cut 5 home: the mother at the sink, the bag of tomatoes, the TV (chapter 1's cut 4 lens)
  h5_home: { lens: { pitch: 32, fov: 24, dist: 21, lift: 0.6 }, to: { dist: 20 }, drift: 6000 },
};

// ---------------------------------------------------------------- the sunrise (cut_h_sunrise)

/**
 * The hill under the dawn: from behind the two at the east fence, at eye
 * height, the camera swung round to look east-north-east over the fence
 * (the pictures face south: not much more than half a right angle) — the
 * plaza's edge, the log fence, the cedars of the hill's north side at the
 * left; past the fence the land falls away, and there the painted valley,
 * the far mountains, the sun and the sky (ui/cut_sunrise.ts), the two from
 * behind in front.
 */
const SUNRISE_POSE: StillPose = { x: 22.6, z: 4.6, row: 206, pitch: 4, fov: 30, dist: 11, cutRow: 216, focusRow: 192, desat: 0, yaw: 58 };
/** The far land's haze before the dawn and in the morning (the painted sky's low bands). */
const PRE_HAZE = '#2A2248';
const MORNING_HAZE = '#B88AA0';
/** The painted valley's line (ui/cut_sunrise.ts: the cedar tops from y146): the land's top should sit no higher. */
const VALLEY_LINE = 146;
/** QA: how long the last sunrise land took (ms). */
let sunriseMs = 0;

function copyOf(c: HTMLCanvasElement): HTMLCanvasElement {
  const [o, ctx] = makeCanvas(c.width, c.height, { willReadFrequently: true });
  ctx.drawImage(c, 0, 0);
  return o;
}

/** The field's place from `pose` with the grade `grade` (null: its own) and its far haze, people left out. */
function landStill(v: Hd2dView, f: FieldScene, pose: StillPose, haze: string, grade: Grade | null): HTMLCanvasElement {
  const d = game.screen.display;
  const fog = v.scene.fog;
  const g0 = f.grade;
  v.scene.fog = new THREE.Fog(new THREE.Color(haze), 18, 70);
  if (grade) f.grade = grade;
  try {
    return copyOf(v.still(f, d.width, d.height, pose));
  } finally {
    v.scene.fog = fog;
    f.grade = g0;
  }
}

sunriseView.land = (): SunriseLand | null => {
  const v = boundView();
  const f = field();
  // (the hill drawn in 3D now: the ending's cut 1, or QA's dawn there)
  if (!v || !f || f.map.id !== 'map_hoshi_hill' || !fxElsewhere(f)) return null;
  const t0 = performance.now();
  // (the painted dawn goes where the 3D's night sky hangs over the hilltop)
  const [pre, key, morning] = withoutSkyBackdrops(v.scene, () => {
    const p = landStill(v, f, SUNRISE_POSE, PRE_HAZE, null);
    const k = v.silhouette(KEY, true);
    const [kc, kx] = makeCanvas(k.width, k.height, { willReadFrequently: true });
    kx.drawImage(k, 0, 0);
    const kd = kx.getImageData(0, 0, k.width, k.height);
    kc.width = 0;
    return [p, kd, landStill(v, f, SUNRISE_POSE, MORNING_HAZE, cloneGrade(GRADES_H.h3c))] as const;
  });
  clearSky(pre, key);
  clearSky(morning, key);
  // the land's top round where the sun comes up: the painted sky goes up so the ridge shows over it
  const mask = maskOf(key);
  const tops: number[] = [];
  for (let x = 196; x < 280; x += 2) {
    let y = 0;
    while (y < H && mask[y * W + x] === 1) y++;
    tops.push(y);
  }
  tops.sort((a, b) => a - b);
  const top = tops[Math.floor(tops.length * 0.2)] ?? VALLEY_LINE;
  sunriseMs = performance.now() - t0;
  return { pre, morning, lift: Math.max(0, VALLEY_LINE - top) };
};

// ---------------------------------------------------------------- the village lit (cut_h_village_lit)

/**
 * The whole village from the south, high, looking north to the hill: the
 * station in front, the houses and the old school, the canal, the terraces
 * and the abandoned field at the back, the hill beyond them (where the light
 * comes from) — the greenhouses at the left, the barn at the right.
 */
const VILLAGE_POSE: StillPose = { x: 30.5, z: 24, row: 140, pitch: 24, fov: 34, dist: 60, cutRow: 216, focusRow: 110, desat: 0 };
/** The far land's haze for this one picture (the whole village in sight: far off, not near). */
const VILLAGE_HAZE = '#1B1733';
/**
 * The village lit by the tomato: the night's grade with the light of the
 * lantern on everything — warm, no night's dark (the 2D cut's lit colours:
 * plaster #F29C70, wood #94543A …).
 */
function litGrade(g: Grade): Grade {
  return { ...cloneGrade(g), night: 0, mul: [244, 168, 120], glare: [242, 137, 75], glareA: 0.12, topA: 0, desat: 0, shadowLen: 0.8, sunX: 1 };
}
/**
 * The named buildings in village tiles (x0, y0, x1, y1 — the roof's rows to
 * the facade's foot) and how tall they stand (tiles): the barn on the east
 * terrace, the three greenhouses on the west slope, the old school, the
 * terraced paddies (data/maps/hoshi_village.ts).
 */
const ZONES = {
  barn: [50, 24, 60, 32, 2],
  house: [1, 21, 12, 31, 2],
  school: [21, 22, 39, 28, 2],
  tanada: [14, 2, 37, 18, 0.3],
} as const;
/** The hill's top seen from the village (星見の丘 (15,4) is the village's (52,−14)), lifted over its cedars (tiles). */
const HILL = { x: 52, y: -14, up: 7 };
/** How far north the village's picture goes (units): the woods past its north edge (outskirts' margin), no further. */
const VILLAGE_FAR_Z = -12;

interface VillageShot {
  pic: VillageLit3D;
  stage: number;
  quality: string;
}
let village: VillageShot | null = null;
/** QA: how long the last village took (ms). */
let villageMs = 0;

function shootVillage(v: Hd2dView, f: FieldScene): VillageLit3D {
  const t0 = performance.now();
  const pose = VILLAGE_POSE;
  const fogNear = pose.dist - 10;
  const shoot = (grade: Grade | null) => {
    const fog = v.scene.fog;
    const g0 = f.grade;
    v.scene.fog = new THREE.Fog(new THREE.Color(VILLAGE_HAZE), fogNear, fogNear + 110);
    if (grade) f.grade = grade;
    try {
      return copyOf(v.still(f, game.screen.display.width, game.screen.display.height, pose));
    } finally {
      v.scene.fog = fog;
      f.grade = g0;
    }
  };
  // (what lies past the woods north of the village is left out: the painted mountains stand there)
  const cz = pose.z + Math.cos((pose.pitch * Math.PI) / 180) * pose.dist;
  const cy = Math.sin((pose.pitch * Math.PI) / 180) * pose.dist;
  const far0 = v.camera.far;
  v.camera.far = Math.hypot(cz - VILLAGE_FAR_Z, cy);
  const [night, kd, lit, zones, src] = withoutSkyBackdrops(v.scene, () => {
    const n = shoot(null);
    const cam = v.camera.clone();
    const k = v.silhouette(KEY, true);
    const [kc, kx] = makeCanvas(k.width, k.height, { willReadFrequently: true });
    kx.drawImage(k, 0, 0);
    const key = kx.getImageData(0, 0, k.width, k.height);
    kc.width = 0;
    const l = shoot(litGrade(f.grade));
    // where the named buildings stand, through the still's camera
    const z = {} as Record<keyof typeof ZONES, { x: number; y: number; w: number; h: number }>;
    for (const [id, [x0, y0, x1, y1, up]] of Object.entries(ZONES) as [keyof typeof ZONES, readonly number[]][]) {
      const pts = [
        v.projectWith(cam, x0 * 16, y0 * 16, y1 * 16),
        v.projectWith(cam, x1 * 16, y0 * 16, y1 * 16),
        v.projectWith(cam, x0 * 16, y1 * 16 - up * 16, y1 * 16),
        v.projectWith(cam, x1 * 16, y1 * 16 - up * 16, y1 * 16),
        v.projectWith(cam, x0 * 16, y1 * 16, y1 * 16),
        v.projectWith(cam, x1 * 16, y1 * 16, y1 * 16),
      ].filter((p): p is [number, number] => !!p);
      const xs = pts.map((p) => p[0]);
      const ys = pts.map((p) => p[1]);
      z[id] = { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
    }
    const s = v.projectWith(cam, HILL.x * 16, HILL.y * 16 - HILL.up * 16, HILL.y * 16) ?? [W * 0.6, H * 0.2];
    return [n, key, l, z, { x: s[0], y: s[1] }] as const;
  });
  v.camera.far = far0;
  v.camera.updateProjectionMatrix();
  clearSky(night, kd);
  clearSky(lit, kd);
  // the far edge: the land's top row, column by column, the middle of them
  const mask = maskOf(kd);
  const tops: number[] = [];
  for (let x = 4; x < W; x += 4) {
    let y = 0;
    while (y < H && mask[y * W + x] === 1) y++;
    tops.push(y);
  }
  tops.sort((a, b) => a - b);
  const horizon = tops[Math.floor(tops.length / 2)] ?? 60;
  villageMs = performance.now() - t0;
  return { night, lit, zones, src, horizon };
}

/**
 * Stepping up to the hill path (星見台, the mouth of the path (48–49,0)), the
 * night before the boss: the village is drawn for the cut while it is the
 * place stood up in 3D (the hill is another map). Again when the stage or
 * the quality has changed. The fight on the hill then shows it.
 */
registerWorldFx({
  map: 'map_hoshimidai',
  update(f: FieldScene) {
    if (!flag('flag_ch2_tetsuya_beaten') || flag('flag_ch2_boss_beaten')) return;
    // (on the last row before the path's mouth (48–49,0): the step up into it fades out next, the
    // drawing's moment goes under that)
    const p = f.player;
    if (p.y > 2 * 16 + 2 || p.x < 46 * 16 || p.x > 52 * 16 || !fxElsewhere(f)) return;
    const v = boundView();
    if (!v) return;
    const stage = flag('flag_ch2_stage');
    if (village && village.stage === stage && village.quality === v.getQuality()) return;
    try {
      village = { pic: shootVillage(v, f), stage, quality: v.getQuality() };
    } catch (e) {
      console.warn('[hd2d] the village for the lit cut was not drawn (the painted one)', e);
      village = null;
    }
  },
});

villageLitView.picture = (): VillageLit3D | null => {
  // (only while the 3D layer draws: 2D chosen since → the painted picture)
  const f = field();
  if (!village || !f || !fxElsewhere(f)) return null;
  return village.pic;
};

if (import.meta.env.DEV) {
  /**
   * QA: the field's place drawn once from `pose` (Hd2dView.still: no people;
   * yaw swings the camera round) as a PNG — for setting up a cut's shot.
   * The field's next frame puts its own camera back.
   */
  registerDebug('hd2dStill', (pose: Partial<StillPose> = {}) => {
    const v = boundView();
    const f = field();
    if (!v || !f) return null;
    const d = game.screen.display;
    const p: StillPose = { x: (f.player.x + f.player.ox) / 16, z: f.player.y / 16, row: 140, pitch: 10, fov: 30, dist: 16, cutRow: 216, focusRow: 120, desat: 0, yaw: 0, ...pose };
    return v.still(f, d.width, d.height, p).toDataURL('image/png');
  });
  /**
   * QA: the village for the lit cut drawn now (on 星見台's village map in
   * HD-2D; `p` changes its pose first), or with draw false only the pose and
   * how long the last one took. cmd.cut('village', cue) then shows it.
   */
  registerDebug('hd2dVillageLit', (p: Partial<StillPose> = {}, draw = true) => {
    Object.assign(VILLAGE_POSE, p);
    const v = boundView();
    const f = field();
    if (draw && v && f && f.map.id === 'map_hoshimidai') village = { pic: shootVillage(v, f), stage: flag('flag_ch2_stage'), quality: v.getQuality() };
    return { pose: { ...VILLAGE_POSE }, lastMs: Math.round(villageMs), zones: village?.pic.zones ?? null, src: village?.pic.src ?? null };
  });
  /** QA: the sunrise's pose (changed by `p`), and how long its 3D land took last time (ms). */
  registerDebug('hd2dSunrise', (p: Partial<StillPose> = {}) => {
    Object.assign(SUNRISE_POSE, p);
    return { pose: { ...SUNRISE_POSE }, lastMs: Math.round(sunriseMs) };
  });
}
