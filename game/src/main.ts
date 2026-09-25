// Boot: load the pixel font, set up the canvas, unlock audio on the first
// gesture, then hand control to the first scene.

import { loadFont, warmGlyphs } from './engine/font';
import { game } from './engine/game';
import { unlockAudio } from './audio';
import { installDebug } from './debug';
import { installTouch, setBackShown } from './engine/touch';
import { field } from './world/field';
import { firstScene } from './boot';
import './modules';

async function boot(): Promise<void> {
  const canvas = document.getElementById('screen') as HTMLCanvasElement;
  const fontUrl = import.meta.env.DEV
    ? (await import('../tools/font/DotGothic16-Regular.ttf?url')).default
    : `${import.meta.env.BASE_URL}fonts/game.woff2`;
  await loadFont(fontUrl);
  warmGlyphs('あいうえおアイウエオ0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  game.init(canvas);
  game.input.onFirstGesture = () => unlockAudio();
  installTouch(game.input, game.screen);
  setBackShown(() => {
    const f = field();
    return !(f && game.top === f && f.controllable);
  });
  canvas.focus();
  installDebug();
  document.getElementById('boot')?.remove();
  game.push(await firstScene());
  game.start();
}

boot().catch((e) => {
  console.error(e);
  const el = document.getElementById('boot');
  if (el) el.textContent = 'ERROR: ' + (e as Error).message;
});
