// Standalone QA page for the character art (dev only):
//   http://127.0.0.1:5173/src/art/chars/qa.html?page=cast&zoom=2
// Boots only the engine + the character art so the gallery can be checked
// even while other subsystems are mid-edit. Exposes window.__game like the
// main build (pause / resume / advance / cmd.chars) so tools/shot.mjs works:
//   node tools/shot.mjs --base http://127.0.0.1:5173/src/art/chars/qa.html --inline '[...]'

import { loadFont } from '../../engine/font';
import { game } from '../../engine/game';
import { CharGallery } from './gallery';
import * as registry from './registry';
import * as quant from './quant';
import * as flip from './flip';
import * as emotes from './emotes';
import * as glow from './glow';
import './content';

async function boot(): Promise<void> {
  const canvas = document.getElementById('screen') as HTMLCanvasElement;
  const fontUrl = (await import('../../../tools/font/DotGothic16-Regular.ttf?url')).default;
  await loadFont(fontUrl);
  game.init(canvas);
  canvas.focus();
  const params = new URLSearchParams(location.search);
  const open = (page?: number | string, o: { zoom?: number; bg?: number; mode?: number; scroll?: number } = {}) => {
    const g = new CharGallery({ page, ...o });
    game.replaceAll(g);
    return g.pages.map((p) => p.title);
  };
  (window as unknown as { __game: unknown }).__game = {
    game,
    pause: () => (game.paused = true),
    resume: () => (game.paused = false),
    advance: (ms: number) => game.advance(ms),
    scenes: () => game.scenes.map((s) => s.constructor.name),
    cmd: { chars: open },
  };
  // the character API itself, for sheet / palette scripts
  (window as unknown as { __chars: unknown }).__chars = { ...registry, ...quant, ...flip, ...emotes, ...glow };
  open(params.get('page') ?? undefined, {
    zoom: Number(params.get('zoom') ?? 1),
    bg: Number(params.get('bg') ?? 0),
    mode: Number(params.get('mode') ?? 0),
    scroll: Number(params.get('scroll') ?? 0),
  });
  game.start();
}

boot().catch((e) => console.error(e));
