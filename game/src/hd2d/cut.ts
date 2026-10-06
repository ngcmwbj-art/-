// HD-2D: chapter 1's ending in the 3D town and rooms (2026-10-06 依頼主
// 「第1章全部HD-2Dにして」, 10_narrative 5.20). Its cuts already run on the
// field — the mall's door, 焼きそばのたかし's counter, the photo studio's
// window, the home, the crossing — so in HD-2D they are the 3D town and
// rooms already; here each shot gets a camera of its own (lower and nearer
// than the field's, easing in, drifting slowly: SHOTS). Its close-ups
// (events/stage.ts zoomIn) still crop that camera as in 2D, and the light is
// the field's own (17:00 turning to night with the chime, the night's lamps
// and windows).
//
// The one painted picture of the town, the night sky (cut_night_sky, 30
// 8.6), becomes the 3D town at night under the painted sky: drawn once, low
// in the street looking up, while the town is still loaded (cut 3, in the
// black before cut 4 — the night sky comes over the home, and loading the
// town there would change the sound), its sky cut away (ui/ending.ts
// nightTown). The stars, the clouds, the far hills and the one star over
// 星見台 that stops twinkling are the 2D's own, unchanged.
//
// The close pictures of things — the photograph, the weather on TV — and
// 「つづく」 and the end card stay the 2D pictures, laid over the 3D.
// events/ending.ts tells this file which shot is up (endingView); nothing
// here waits or plays a sound, so every cut keeps its time and its cues.

import * as THREE from 'three';
import { game } from '../engine/game';
import { makeCanvas } from '../engine/pixel';
import { ease } from '../engine/tween';
import { registerDebug } from '../debug';
import { field, type FieldScene } from '../world/field';
import { fxElsewhere } from '../world/fx';
import { endingView } from '../events/ending';
import { nightTown } from '../ui/ending';
import type { CamParams, Hd2dView, StillPose } from './view';

/** A shot's camera: the field's (view.ts CAM), and `lift` — how high over the ground it aims (units). */
export interface Lens extends CamParams {
  lift: number;
}

interface ShotDef {
  /** The lens the shot opens on (what it leaves out: the field's). */
  lens: Partial<Lens>;
  /** Where it drifts to once it is in, over `drift` ms: a slow push in, a crane down. */
  to?: Partial<Lens>;
  drift?: number;
}

/**
 * The ending's shots (events/ending.ts endingView.shot). A lower camera
 * sees the shop fronts and the people more from the front; pitch, fov and
 * dist as view.ts CAM (40°, 26°, 25 tiles), lookN only outdoors.
 */
const SHOTS: Record<string, ShotDef> = {
  // cut 1: the two out of the mall's door at 17:00, the chime — low, close, pushing in a little
  c1_door: { lens: { pitch: 27, fov: 24, dist: 22, lookN: 0.3, lift: 0.7 }, to: { pitch: 24, dist: 20.5 }, drift: 6000 },
  // …and as they look up, back to the field's camera over the lit lot
  c1_lot: { lens: {} },
  // cut 2: a little lower than the room's camera, たかし over his griddle (the counter's top is
  // the 2D's picture from above, stood up: lower still, it would turn into a wall in front of him)
  c2_counter: { lens: { pitch: 35, fov: 24, dist: 21, lift: 0.6 }, to: { pitch: 34, dist: 20 }, drift: 5000 },
  // the sauce: pushing in on the iron
  c2_push: { lens: { pitch: 32, fov: 24, dist: 18.5, lift: 0.8 } },
  c2_out: { lens: {} },
  // cut 3: the show window face on, the cat under it
  c3_window: { lens: { pitch: 29, fov: 24, dist: 22, lookN: 0, lift: 1.0 }, to: { pitch: 27, dist: 20.5 }, drift: 4000 },
  // cut 4: the mother turning round in the kitchen
  c4_home: { lens: { pitch: 30, fov: 24, dist: 21, lift: 0.6 }, to: { dist: 20 }, drift: 6000 },
  // cut 5: dinner, at the table's height
  c5_table: { lens: { pitch: 25, fov: 24, dist: 20, lift: 0.5 }, to: { pitch: 23, dist: 19 }, drift: 6000 },
  // cut 6: the crossing at night, a little lower than the field (the unlit train is the 2D's
  // picture from above laid on the rails, world/places.ts: a low camera would stand it up)…
  c6_crossing: { lens: { pitch: 34, fov: 28, dist: 25, lookN: 0, lift: 0.4 }, to: { pitch: 32, dist: 24 }, drift: 9000 },
  // …and once it has gone, closing in on the two, a little lower (with the 2× → 3× crop and the letterbox)
  c6_close: { lens: { pitch: 31, fov: 24, dist: 21, lookN: 0, lift: 0.8 } },
};

/**
 * cut_night_sky's town (Hd2dView.still): from the paddies' path south of the
 * river, low, looking up to the north — the river, the street's shop fronts,
 * the roofs behind, and above them the sky the 2D paints (星見台 and its
 * star at the right: the title's composition, 30 8.6 / 11).
 */
const NIGHT_POSE: StillPose = { x: 30, z: 38, row: 216, pitch: 5, fov: 30, dist: 16, cutRow: 0, focusRow: 150, desat: 0 };
/** The night town's far haze: the night sky's low band (ui/title_art skyCanvas('night')). */
const NIGHT_HAZE = new THREE.Color('#2a2248');
/** Where the still sees no town (its silhouette pass): a key no picture has. */
const KEY = new THREE.Color(0, 1, 0);

interface Live {
  f: FieldScene;
  map: string;
  from: Lens;
  def: ShotDef;
  t0: number;
  ms: number;
}

let live: Live | null = null;
let view: Hd2dView | null = null;
/** QA: how long the last night town took to draw (ms: the still, its silhouette, the sky cut away). */
let nightMs = 0;
let fieldCam: CamParams | null = null;

/** view.ts: the view, and the field's camera (CAM) the shots ease from and back to. */
export function bindView(v: Hd2dView, cam: CamParams): void {
  view = v;
  fieldCam = cam;
}

function fieldLens(): Lens {
  const c = fieldCam ?? { pitch: 40, fov: 26, dist: 25, lookN: 1.5 };
  return { pitch: c.pitch, fov: c.fov, dist: c.dist, lookN: c.lookN, lift: 0 };
}

function mix(a: Lens, b: Lens, k: number): Lens {
  const m = (x: number, y: number) => x + (y - x) * k;
  return { pitch: m(a.pitch, b.pitch), fov: m(a.fov, b.fov), dist: m(a.dist, b.dist), lookN: m(a.lookN, b.lookN), lift: m(a.lift, b.lift) };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function lensAt(l: Live, t: number): Lens {
  const to: Lens = { ...fieldLens(), ...l.def.lens };
  let cur = mix(l.from, to, l.ms > 0 ? ease.sineInOut(clamp01((t - l.t0) / l.ms)) : 1);
  if (l.def.to && l.def.drift) cur = mix(cur, { ...to, ...l.def.to }, ease.sineInOut(clamp01((t - l.t0 - l.ms) / l.def.drift)));
  return cur;
}

/**
 * The camera of the ending's shot up on field f now, or null (the field's
 * own). A shot ends with its map (the next cut loads another) or when no
 * script runs any more (the ending is over, a QA cut has played).
 */
export function shotLens(f: FieldScene): Lens | null {
  const l = live;
  if (!l) return null;
  if (l.f !== f || l.map !== f.map.id || !game.scripts.busy) {
    live = null;
    return null;
  }
  return lensAt(l, f.t);
}

endingView.shot = (f: FieldScene, name: string | null, ms = 0): void => {
  const def = name ? SHOTS[name] : null;
  if (!def) {
    live = null;
    return;
  }
  const from = live && live.f === f && live.map === f.map.id ? lensAt(live, f.t) : fieldLens();
  live = { f, map: f.map.id, from, def, t0: f.t, ms };
};

endingView.keepNight = (f: FieldScene): void => {
  if (!view || f.map.id !== 'map_town' || !fxElsewhere(f)) return;
  const t0 = performance.now();
  try {
    nightTown.img = nightStill(view, f, NIGHT_POSE);
    nightMs = performance.now() - t0;
  } catch (e) {
    console.warn('[hd2d] the night town for the star cut was not drawn (2D panorama)', e);
    nightTown.img = null;
  }
};

function copyOf(c: HTMLCanvasElement): HTMLCanvasElement {
  const [o, ctx] = makeCanvas(c.width, c.height, { willReadFrequently: true });
  ctx.drawImage(c, 0, 0);
  return o;
}

/**
 * The town at night from `pose` (Hd2dView.still: no people, nothing
 * see-through; the far town fading into the night's haze), and where it
 * shows the sky — the silhouette pass against KEY — made clear.
 */
function nightStill(v: Hd2dView, f: FieldScene, pose: StillPose): HTMLCanvasElement {
  const d = game.screen.display;
  const fog = v.scene.fog;
  v.scene.fog = new THREE.Fog(NIGHT_HAZE, 30, 120);
  let colour: HTMLCanvasElement;
  let key: HTMLCanvasElement;
  try {
    colour = copyOf(v.still(f, d.width, d.height, pose));
    key = copyOf(v.silhouette(KEY));
  } finally {
    v.scene.fog = fog;
  }
  const w = colour.width;
  const h = colour.height;
  const cctx = colour.getContext('2d', { willReadFrequently: true })!;
  const img = cctx.getImageData(0, 0, w, h);
  const k = key.getContext('2d', { willReadFrequently: true })!.getImageData(0, 0, w, h).data;
  const px = img.data;
  for (let i = 0; i < px.length; i += 4) if (k[i] < 24 && k[i + 1] > 230 && k[i + 2] < 24) px[i + 3] = 0;
  cctx.putImageData(img, 0, 0);
  return colour;
}

// QA (dev server only)
if (import.meta.env.DEV) {
  /** The shot up now: its name's lens and where it is. */
  registerDebug('hd2dShot', () => {
    const f = live?.f;
    return live && f ? { map: live.map, lens: shotLens(f), t: f.t - live.t0 } : null;
  });
  /**
   * The night town for the star cut (NIGHT_POSE, changed by `p`), drawn now
   * from the town in HD-2D (endcut(7) then shows it under the sky; in the
   * ending it is drawn before cut 4). `draw` false: only the pose and how
   * long the last one took.
   */
  registerDebug('hd2dNight', (p: Partial<StillPose> = {}, draw = true) => {
    Object.assign(NIGHT_POSE, p);
    const f = field();
    if (!draw || !f) return { pose: { ...NIGHT_POSE }, lastMs: Math.round(nightMs) };
    endingView.keepNight(f);
    const img = nightTown.img;
    return { pose: { ...NIGHT_POSE }, w: img?.width ?? 0, h: img?.height ?? 0, ms: Math.round(nightMs) };
  });
}
