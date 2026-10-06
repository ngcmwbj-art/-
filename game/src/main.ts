// Boot: load the pixel font, set up the canvas, unlock audio on the first
// gesture, then hand control to the first scene.

import { loadFont, warmGlyphs } from './engine/font';
import { game } from './engine/game';
import { unlockAudio } from './audio';
import { installDebug, registerDebug } from './debug';
import { installTouch, setBackShown, touchLayoutInfo } from './engine/touch';
import { commitTextZones, uiBands } from './engine/textzones';
import { buttonZones } from './engine/safezones';
import { field } from './world/field';
import { firstScene } from './boot';
import { settings, view as viewSetting } from './ui/settings';
import './modules';

/** The HD-2D layer (src/hd2d, three.js with it), once loading has begun. */
let hd2d: Promise<unknown> | null = null;

function loadHd2d(): void {
  hd2d ??= import('./hd2d').catch((e) => {
    console.warn('[hd2d] not loaded, staying 2D', e);
    viewSetting.webgl = false;
  });
}

/**
 * Chapter 1 in HD-2D (02 #85, 2026-10-06): every build carries the layer,
 * but its code (three.js) only runs once the title is on screen — the first
 * frames don't wait for it — and only when せってい「表示」 (or ?hd2d=1)
 * wants it; otherwise the first time HD-2D is chosen. ?hd2d=0 (a QA run in
 * 2D) leaves it out. The dev server loads it up front as before (the QA
 * commands), the HD-2D demo page too (its 「はじめる」).
 */
function startHd2d(): void {
  const q = new URLSearchParams(location.search).get('hd2d');
  if (q === '0') return;
  viewSetting.listeners.push((on) => {
    if (on) loadHd2d();
  });
  if (q === '1' || settings.hd2d) requestAnimationFrame(() => setTimeout(loadHd2d, 30));
}

async function boot(): Promise<void> {
  const canvas = document.getElementById('screen') as HTMLCanvasElement;
  const fontUrl = import.meta.env.DEV
    ? (await import('../tools/font/DotGothic16-Regular.ttf?url')).default
    : `${import.meta.env.BASE_URL}fonts/game.woff2`;
  await loadFont(fontUrl);
  warmGlyphs('あいうえおアイウエオ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  game.init(canvas);
  game.input.onFirstGesture = () => unlockAudio();
  // the text boxes each frame drew (the touch controls keep off them)
  game.overlays.push(commitTextZones);
  installTouch(game.input, game.screen);
  setBackShown(() => {
    const f = field();
    return !(f && game.top === f && f.controllable);
  });
  canvas.focus();
  installDebug();
  registerDebug('textZones', () => ({ ...uiBands(), touch: touchLayoutInfo(), buttons: buttonZones() }));
  if (import.meta.env.DEV || import.meta.env.VITE_HD2D_DEMO === '1') loadHd2d();
  if (hd2d) await hd2d;
  document.getElementById('boot')?.remove();
  game.push(await firstScene());
  game.start();
  startHd2d();
}

boot().catch((e) => {
  console.error(e);
  const el = document.getElementById('boot');
  if (el) el.textContent = 'ERROR: ' + (e as Error).message;
});
