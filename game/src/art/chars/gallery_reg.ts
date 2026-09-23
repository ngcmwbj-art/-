// Registers the character gallery scene (?scene=chars) and the debug command
// __game.cmd.chars(page, {zoom, bg, mode, scroll}).

import { game } from '../../engine/game';
import { registerScene } from '../../boot';
import { registerDebug } from '../../debug';
import { CharGallery } from './gallery';

let cur: CharGallery | null = null;
queueMicrotask(() => {
  registerScene('chars', (params) => {
    cur = new CharGallery({
      page: params.get('page') ?? undefined,
      zoom: Number(params.get('zoom') ?? 1),
      bg: Number(params.get('bg') ?? 0),
    });
    return cur;
  });
  registerDebug('chars', (page?: number | string, o: { zoom?: number; bg?: number; mode?: number; scroll?: number } = {}) => {
    cur = new CharGallery({ page, ...o });
    game.replaceAll(cur);
    return cur.pages.map((p) => p.title);
  });
});

