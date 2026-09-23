// Registers the character gallery scene (?scene=chars) and the debug command
// __game.cmd.chars(page, {zoom, bg, mode, scroll}).

import { game } from '../../engine/game';
import { registerScene } from '../../boot';
import { registerDebug } from '../../debug';
import { CharGallery } from './gallery';
import { autoRimLight, paletteReport, setRimLight } from './quant';

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
  // __game.cmd.charsRim('#E0567A' | null | 'auto'): force the sprites' rim light
  registerDebug('charsRim', (c?: string | null) => {
    if (c === 'auto' || c === undefined) autoRimLight();
    else setRimLight(c);
    return c ?? 'auto';
  });
  // __game.cmd.charsPalette(id): the sprite's own (non-master) colours
  registerDebug('charsPalette', (id: string) => paletteReport(id) ?? 'not built yet');
});

