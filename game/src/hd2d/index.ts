// HD-2D prototype (2026-10-05, 02 #85): 夕鳴町 (map_town) drawn in 3D — the
// shotengai stood up from its 2D pictures, a low evening sun with long
// shadows, bloom, a tilt-shift blur and the stage's grade — while every
// text, window, menu, the HUD and the touch controls stay the 2D canvas on
// top. Walking, collisions, talking and events are the 2D game's own; only
// the picture of the field changes. Other maps, rooms and battles stay 2D.
//
// Loaded only by the dev server and the HD-2D demo build (main.ts imports
// it when import.meta.env.DEV or VITE_HD2D_DEMO=1), so three.js never ends up
// in the other builds. Off by default; turned on by
//   ?hd2d=1                     in the URL (?hd2dq=light|normal picks the quality)
//   __game.cmd.hd2d(true|false)  in the console (QA)
//   the demo build              (VITE_HD2D_DEMO=1: on, and 「はじめる」 opens in 夕鳴銀座)
// Debug: __game.cmd.hd2dQuality('light'|'normal'), hd2dStats(), hd2dCam({pitch, fov, dist}).

import { Vector3 } from 'three';
import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { Gfx } from '../engine/gfx';
import { H, W } from '../engine/screen';
import { isTouchDevice } from '../engine/touch';
import { registerDebug } from '../debug';
import { setFlag, state } from '../game/state';
import { FieldScene, setFieldDrawer } from '../world/field';
import { fxDraw } from '../world/fx';
import { hud } from '../world/hud';
import { resetForNewGame, setNewGameStart } from '../ui/flow';
import type { Quality } from './post';
import { CAM, Hd2dView } from './view';

const DEMO = import.meta.env.VITE_HD2D_DEMO === '1';
/** Maps drawn in HD-2D (the prototype: the town with 夕鳴銀座). */
const MAPS = new Set(['map_town']);

const params = new URLSearchParams(location.search);
let on = DEMO || params.get('hd2d') === '1';
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
    failed = true;
  }
  return view;
}

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
  if (!on || !MAPS.has(f.map.id) || f.viewScale !== 1) return false;
  const v = getView();
  if (!v) return false;
  const d = game.screen.display;
  try {
    v.render(f, d.width, d.height);
  } catch (e) {
    console.error('[hd2d] render failed, back to 2D', e);
    failed = true;
    view = null;
    return false;
  }
  watchPace();
  game.screen.underlay = v.canvas;
  // the 2D layer: transparent where the town is, then what sits on top of it
  const ctx = g.ctx;
  ctx.save();
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = 'source-over';
  ctx.clearRect(0, 0, W, H);
  ctx.restore();
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
  // the world effects (the stamp, the frozen 「まいど！」, sparrows...) are 2D
  // drawings of the 2D view: drawn as they are, then laid where that view
  // sits in the 3D picture (scaled round the screen's centre)
  drawWorldFx(g, f, v);
  // story overlays drawn in screen space (close-ups, captions)
  fxDraw(f, g, Math.round(f.camX), Math.round(f.camY), 'top');
  hud.draw(g, f);
  return true;
}

let fxCanvas: HTMLCanvasElement | null = null;
let fxGfx: Gfx | null = null;

function drawWorldFx(g: Gfx, f: FieldScene, v: Hd2dView): void {
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
    fxDraw(f, fxGfx!, cx, cy, layer);
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

/** World px → buffer px through the 3D camera (bubbles and HUD marks follow the 3D town). */
function project(f: FieldScene, x: number, y: number): [number, number, number] | null {
  if (!on || !view || !MAPS.has(f.map.id) || f.viewScale !== 1) return null;
  const p = view.project(new Vector3(x / 16, 0, y / 16));
  return p ? [Math.round(p[0]), Math.round(p[1]), 1] : null;
}

/** In the 3D town the camera follows Minato past the map's edges too: the town goes on there (town.ts MARGIN). */
function freeCam(f: FieldScene): boolean {
  return on && !failed && MAPS.has(f.map.id) && f.viewScale === 1;
}

setFieldDrawer(drawField, project, freeCam);

export function hd2dOn(): boolean {
  return on;
}

export function setHd2d(v: boolean): void {
  on = v;
}

registerDebug('hd2d', (v?: boolean) => {
  if (v !== undefined) on = !!v;
  return { on, quality, webgl: !failed, maps: [...MAPS] };
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
