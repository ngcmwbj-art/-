// HD-2D prototype (2026-10-05, 02 #85): 夕鳴町 (map_town) drawn in 3D — the
// shotengai stood up from its 2D pictures, a low evening sun with long
// shadows, bloom, a tilt-shift blur and the stage's grade — while every
// text, window, menu, the HUD and the touch controls stay the 2D canvas on
// top. Walking, collisions, talking and events are the 2D game's own; only
// the picture of the field changes. Since then: chapter 1's other outdoor
// places and its rooms (places.ts, room.ts), its battles' backgrounds
// (battle.ts) and its ending's cuts (cut.ts, cut_night.ts); chapter 2 stays 2D.
//
// In every build since 2026-10-06 (依頼主「第1章全部HD-2Dにして」): chapter 1
// is HD-2D from the start, chapter 2 stays 2D. main.ts loads this layer
// (three.js with it) once the title is up, when HD-2D is wanted — the
// first frames don't wait for it. Whether it draws:
//   せってい「表示」 HD-2D／2D   (ui/settings.ts settings.hd2d, saved; default HD-2D)
//   ?hd2d=1 / ?hd2d=0           in the URL: this visit only (QA; ?hd2dq=light|normal picks the quality)
//   __game.cmd.hd2d(true|false)  in the console: the same, this visit only (QA)
//   the demo build              (VITE_HD2D_DEMO=1: on, and 「はじめる」 opens in 夕鳴銀座)
// and never once chapter 2 has begun (flag_ch2_started: its prologue and
// ending come back to map_town and the home, in 2D) nor where WebGL fails
// (the 2D pictures, as before). hd2dOn() / hd2dField(f) answer it for the
// other parts (the battles, the ending's cuts).
// Debug: __game.cmd.hd2dQuality('light'|'normal'), hd2dStats(), hd2dCam({pitch, fov, dist}).

import { Vector3 } from 'three';
import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { Gfx } from '../engine/gfx';
import { H, W } from '../engine/screen';
import { isTouchDevice } from '../engine/touch';
import { registerDebug } from '../debug';
import { flag, setFlag, state } from '../game/state';
import { field, FieldScene, setFieldDrawer } from '../world/field';
import { fxDraw } from '../world/fx';
import { hud } from '../world/hud';
import { resetForNewGame, setNewGameStart } from '../ui/flow';
import { settings, view as viewSetting } from '../ui/settings';
import { isCh2Map } from '../world/maps';
import { closeUp } from '../events/stage';
import type { Quality } from './post';
import { CAM, Hd2dView } from './view';
import { overlaps } from './overlap';
import { nudging } from './tune';
import { roomMap } from './room';
import { installBattlePlaces } from './battle';

const DEMO = import.meta.env.VITE_HD2D_DEMO === '1';
/**
 * Maps drawn in HD-2D: the town with 夕鳴銀座, and (2026-10-05 依頼主「街全体に
 * 広げる」) chapter 1's other outdoor places — the school's back yard and its
 * ground, the diversion past the paddy path, the weir, the mall's roof.
 */
const MAPS = new Set(['map_town', 'map_school', 'map_school_kotei', 'map_aze', 'map_seki', 'map_mall_roof']);

const params = new URLSearchParams(location.search);
/** This visit's override of せってい「表示」 (the demo page, ?hd2d=0|1, __game.cmd.hd2d): null → the setting. */
let override: boolean | null = DEMO ? true : params.has('hd2d') ? params.get('hd2d') === '1' : null;
const qParam = params.get('hd2dq');
/** Phones start light; tablets and computers start normal and step down once if frames drop. */
const phone = isTouchDevice() && Math.min(screen.width, screen.height) < 600;
let quality: Quality = qParam === 'light' || qParam === 'normal' ? qParam : phone ? 'light' : 'normal';
/** A quality picked by hand (URL / console) is kept; otherwise a slow 'normal' steps down once. */
let qualityFixed = qParam === 'light' || qParam === 'normal';
let view: Hd2dView | null = null;
let failed = false;

function getView(): Hd2dView | null {
  if (view || failed) return view;
  try {
    view = new Hd2dView(quality);
  } catch (e) {
    console.warn('[hd2d] WebGL unavailable, staying 2D', e);
    fail();
  }
  return view;
}

/** WebGL can't draw here (or a frame failed): 2D from now on, and せってい says so. */
function fail(): void {
  failed = true;
  view = null;
  viewSetting.webgl = false;
}

/**
 * HD-2D is on: せってい「表示」 (or this visit's override), WebGL works, and
 * chapter 2 hasn't begun (02 #85: chapter 2 stays 2D, also where it comes
 * back to chapter 1's town). Read every frame, so a change shows at once.
 */
export function hd2dOn(): boolean {
  return (override ?? settings.hd2d) && !failed && !flag('flag_ch2_started');
}

/** Is field f drawn in HD-2D now: hd2dOn(), one of chapter 1's places (MAPS, room.ts rooms), not blown up. */
export function hd2dField(f: FieldScene): boolean {
  return hd2dOn() && f.viewScale === 1 && !isCh2Map(f.map.def) && (MAPS.has(f.map.id) || roomMap(f.map.id));
}

/** Fields drawn in 3D so far (QA: tools/playthrough.mjs --hd2d sees them go up). */
let frames = 0;
// frame pacing for the automatic step down (real time between drawn frames)
let lastDraw = 0;
let slowFrames = 0;
let sampled = 0;

function watchPace(): void {
  const now = performance.now();
  const dt = now - lastDraw;
  lastDraw = now;
  if (qualityFixed || quality === 'light' || game.paused || dt > 250) return;
  sampled++;
  if (dt > 26) slowFrames++;
  if (sampled >= 120) {
    // more than a third of two seconds' frames under ~38 fps: go light
    if (slowFrames > 40) {
      quality = 'light';
      view?.setQuality('light');
      console.info('[hd2d] slow frames: quality → light');
    }
    sampled = 0;
    slowFrames = 0;
  }
}

function drawField(g: Gfx, f: FieldScene): boolean {
  // (and chapter 1's rooms: room.ts)
  if (!hd2dField(f)) return false;
  const v = getView();
  if (!v) return false;
  const d = game.screen.display;
  // a story close-up (events/stage.ts): the camera narrows to its rect of the frame
  const cu = closeUp(f);
  try {
    v.render(f, d.width, d.height, cu?.rect ?? null, cu?.at ?? null);
  } catch (e) {
    console.error('[hd2d] render failed, back to 2D', e);
    fail();
    return false;
  }
  watchPace();
  frames++;
  game.screen.underlay = v.canvas;
  // the 2D layer: transparent where the town is, then what sits on top of it
  const ctx = g.ctx;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  ctx.restore();
  // the world effects (the stamp, the sound from the loudspeaker, the
  // frozen 「まいど！」, sparrows...) at the 3D points they belong to
  drawWorldFx(g, f, v);
  // emotes over the heads, where the heads are on screen now
  const actors = [...f.actors, f.player];
  if (f.follower) actors.push(f.follower);
  for (const a of actors) {
    if (!a.emote || !a.visible) continue;
    if (f.light.actorAlpha(a) < 0.05 && a.kind !== 'sym') continue;
    const s = v.headOnScreen(a);
    if (!s) continue;
    a.drawEmote(g, a.x + a.ox - s[0], a.y + a.oy - a.sprite.h + a.hopOffset() - s[1]);
  }
  // the top layer: the close-up (blowing up this layer as the camera crops
  // the picture), the letterbox, the mirror's inset, seals and captions
  fxDraw(f, g, Math.round(f.camX), Math.round(f.camY), 'top');
  hud.draw(g, f);
  return true;
}

let fxCanvas: HTMLCanvasElement | null = null;
let fxGfx: Gfx | null = null;

/**
 * The world fx below the top layer. The anchored ones place what they draw
 * themselves (world/fx.ts fxAt → project(): the 3D point, its height
 * included) and draw straight onto the layer at the 2D size; any other one
 * is a 2D drawing of the 2D view: drawn as it is, then laid where that view
 * sits in the 3D picture (scaled round the screen's centre).
 */
function drawWorldFx(g: Gfx, f: FieldScene, v: Hd2dView): void {
  const cx = Math.round(f.camX);
  const cy = Math.round(f.camY);
  drawPlainFx(g, f, v);
  for (const layer of ['ground', 'sorted', 'fg', 'glow'] as const) {
    g.ctx.save();
    fxDraw(f, g, cx, cy, layer, 'anchored');
    g.ctx.restore();
  }
}

function drawPlainFx(g: Gfx, f: FieldScene, v: Hd2dView): void {
  if (!fxCanvas) {
    fxCanvas = document.createElement('canvas');
    fxCanvas.width = W;
    fxCanvas.height = H;
    const ctx = fxCanvas.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    fxGfx = new Gfx(ctx, W, H);
  }
  const ctx = fxGfx!.ctx;
  ctx.clearRect(0, 0, W, H);
  const cx = Math.round(f.camX);
  const cy = Math.round(f.camY);
  for (const layer of ['ground', 'sorted', 'fg', 'glow'] as const) {
    ctx.save();
    fxDraw(f, fxGfx!, cx, cy, layer, 'plain');
    ctx.restore();
  }
  // the 2D view's centre is the 3D camera's target: map round it
  const tx = f.camX + W / 2;
  const ty = f.camY + H / 2;
  const c = v.project(new Vector3(tx / 16, 0, ty / 16));
  const ex = v.project(new Vector3((tx + 16) / 16, 0, ty / 16));
  const ny = v.project(new Vector3(tx / 16, 0, (ty - 16) / 16));
  if (!c || !ex || !ny) return;
  const kx = (ex[0] - c[0]) / 16;
  const ky = (c[1] - ny[1]) / 16;
  g.ctx.save();
  g.ctx.imageSmoothingEnabled = false;
  g.ctx.drawImage(fxCanvas, c[0] + (cx - tx) * kx, c[1] + (cy - ty) * ky, W * kx, H * ky);
  g.ctx.restore();
}

/**
 * World px → buffer px through the 3D camera (bubbles, HUD marks, the world
 * fx and the close-ups follow the 3D town): a point standing over the ground
 * line `foot` is lifted to its height there (view.ts projectPx).
 */
function project(f: FieldScene, x: number, y: number, foot?: number): [number, number, number] | null {
  if (!view || !hd2dField(f)) return null;
  const p = view.projectPx(x, y, foot ?? y);
  return p ? [Math.round(p[0]), Math.round(p[1]), 1] : null;
}

/** In the 3D town the camera follows Minato past the map's edges too: the town goes on there (town.ts MARGIN). */
function freeCam(f: FieldScene): boolean {
  return hd2dField(f) && MAPS.has(f.map.id);
}

setFieldDrawer(drawField, project, freeCam);
// chapter 1's battles: the place they started in, in 3D, behind them (battle.ts)
installBattlePlaces(() => (hd2dOn() ? getView() : null), hd2dField);
// the WebGL side is made while the title is up (main.ts loads this then), not on the first field's frame
if (hd2dOn()) setTimeout(() => hd2dOn() && getView(), 0);

/** QA: HD-2D on or off for this visit (null: back to せってい「表示」). */
registerDebug('hd2d', (v?: boolean | null) => {
  if (v !== undefined) override = v === null ? null : !!v;
  const f = field();
  return { on: hd2dOn(), field: !!f && hd2dField(f), frames, setting: settings.hd2d, override, quality, webgl: !failed, maps: [...MAPS] };
});
registerDebug('hd2dQuality', (q?: Quality) => {
  if (q === 'light' || q === 'normal') {
    quality = q;
    qualityFixed = true;
    view?.setQuality(q);
  }
  return quality;
});
/** The last frame's numbers: WebGL render time (ms, CPU side), draw calls, triangles, render size. */
registerDebug('hd2dStats', () => view?.stats ?? null);
/**
 * Where two solids of the 3D town go into each other: the pictures the 2D
 * draws on top that end up buried in another solid (overlap.ts), the worst
 * first. { min: px (4), all: also the ones the 2D hides anyway, area: '銀座通り' … }.
 */
// Only on the dev server: the published page leaves the checker out (2026-10-05, the artifact
// publish refused the page while it carried it).
if (import.meta.env.DEV) {
  registerDebug('hd2dOverlaps', (o: { min?: number; all?: boolean; area?: string } = {}) => {
    const f = field();
    const list = overlaps(view && f && MAPS.has(f.map.id) ? view.solids(f) : [], { ...o, map: f?.map.id });
    return o.area ? list.filter((r) => r.area === o.area) : list;
  });
}
/** QA: false stands every prop where its picture says (tune.ts NUDGE off), true as tuned; the town is stood up again. */
registerDebug('hd2dNudge', (v?: boolean) => {
  if (v !== undefined) {
    nudging.on = !!v;
    view?.rebuild();
  }
  return nudging.on;
});
/** The room the solids whose name holds `name` take (QA: their slabs, world px; heights in picture rows). */
registerDebug('hd2dSolids', (name = '') =>
  (view && field() && MAPS.has(field()!.map.id) ? view.solids(field()!) : [])
    .filter((s) => name.split(',').some((n) => s.name.includes(n)))
    .map((s) => ({ name: s.name, foot: s.foot, slabs: s.slabs.map((b) => [b.x0, b.x1, b.h0, b.h1, b.z0, b.z1, b.face ? 'face' : '', b.at ? 'mask' : ''].map((v) => (typeof v === 'number' ? Math.round(v * 10) / 10 : v))) })),
);
/** What the 3D scene holds (meshes in the camera's view, shadow casters, shadow-only planes). */
registerDebug('hd2dScene', () => view?.census() ?? null);
registerDebug('hd2dCam', (p?: Partial<typeof CAM>) => {
  if (p) Object.assign(CAM, p);
  return { ...CAM };
});

// ---------------------------------------------------------------- the demo page

/**
 * The HD-2D demo page (VITE_HD2D_DEMO=1): 「はじめる」 skips the room and the
 * errand talk and opens in 夕鳴銀座 in front of 焼きそばのたかし — the errand
 * under way (the 'maruyama' beat of events/debug.ts), 16:55, stage 0. From
 * there the story runs on as in the game (たかし → ひのや → 17:00).
 */
function* demoStart(): Co {
  resetForNewGame();
  setFlag('flag_opening_done', 1);
  setFlag('flag_errand', 1);
  for (const id of ['item_gamaguchi', 'item_otsukai_memo']) if (!state.inventory.includes(id)) state.inventory.push(id);
  state.money = 500;
  setFlag('flag_clock', 1);
  game.fadeColor = '#0B0B14';
  game.fadeAlpha = 1;
  const f = new FieldScene('map_town', 27, 23, 'down');
  game.replaceAll(f);
  yield 300;
  yield* game.fadeIn(900);
}

if (DEMO) setNewGameStart(demoStart);
