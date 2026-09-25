// Registers the character gallery scene (?scene=chars) and the debug command
// __game.cmd.chars(page, {zoom, bg, mode, scroll}).

import { game } from '../../engine/game';
import { registerScene } from '../../boot';
import { registerDebug } from '../../debug';
import { CharGallery } from './gallery';
import { autoRimLight, paletteReport, setRimLight } from './quant';
import { charSprite } from './registry';

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


// __game.cmd.charsSheet(ids, {zoom, bg, anims}): a contact sheet (data URL) of
// every frame of the given sprites: one row per sprite and part — the four
// standing facings, the walk cycles, each extra (all its facings) and each
// anim's frames — labelled, for visual QA of new art.
queueMicrotask(() => {
  registerDebug('charsSheet', (ids: string | string[], o: { zoom?: number; bg?: string; cols?: number; only?: string[] } = {}) => {
    const list = Array.isArray(ids) ? ids : [ids];
    const z = o.zoom ?? 4;
    const cols = o.cols ?? 12;
    type Cell = { c: HTMLCanvasElement; label: string };
    const rows: Cell[][] = [];
    const dirs = ['down', 'left', 'up', 'right'] as const;
    for (const id of list) {
      const s = charSprite(id);
      const want = (k: string) => !o.only || o.only.includes(k);
      const push = (cells: Cell[]) => {
        for (let i = 0; i < cells.length; i += cols) rows.push(cells.slice(i, i + cols));
      };
      if (want('walk')) push(dirs.flatMap((d) => s.walk[d].map((c, i) => ({ c, label: `${id.replace(/^(npc_hoshi_|npc_|enemy_|restored_enemy_|prop_h_)/, '')} ${d[0]}${i}` }))));
      if (want('idle'))
        push(
          dirs.flatMap((d) => {
            const seen = new Set<HTMLCanvasElement>();
            return (s.idle?.[d] ?? []).filter((c) => (seen.has(c) ? false : (seen.add(c), true))).map((c, i) => ({ c, label: `idle ${d[0]}${i}` }));
          }),
        );
      if (want('extra')) {
        const ex: Cell[] = [];
        for (const name of Object.keys(s.extra ?? {})) {
          if (s.anims?.[name]) continue;
          const byDir = s.extraDir?.[name];
          if (byDir) for (const d of dirs) { const c = byDir[d]; if (c) ex.push({ c, label: `${name} ${d[0]}` }); }
          else ex.push({ c: s.extra![name], label: name });
        }
        push(ex);
      }
      if (want('anims'))
        for (const name of Object.keys(s.anims ?? {})) {
          const byDir = s.animsDir?.[name] ?? { down: s.anims![name] };
          const cells: Cell[] = [];
          for (const d of dirs) {
            const a = byDir[d];
            if (!a) continue;
            const seen = new Set<HTMLCanvasElement>();
            a.frames.forEach((c) => {
              if (seen.has(c)) return;
              seen.add(c);
              cells.push({ c, label: `~${name} ${d[0]}${seen.size - 1}` });
            });
          }
          push(cells);
        }
    }
    let cw = 16;
    let ch = 24;
    for (const r of rows) for (const cell of r) { cw = Math.max(cw, cell.c.width); ch = Math.max(ch, cell.c.height); }
    const W = cw * z + 8;
    const H = ch * z + 14;
    const maxCols = Math.max(1, ...rows.map((r) => r.length));
    const out = document.createElement('canvas');
    out.width = maxCols * W + 8;
    out.height = rows.length * H + 8;
    const ctx = out.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = o.bg ?? '#7A6A5A';
    ctx.fillRect(0, 0, out.width, out.height);
    ctx.font = '10px monospace';
    rows.forEach((r, j) =>
      r.forEach((cell, i) => {
        const x = 4 + i * W;
        const y = 4 + j * H;
        ctx.fillStyle = 'rgba(0,0,0,0.12)';
        ctx.fillRect(x, y + 12, W - 4, H - 14);
        ctx.drawImage(cell.c, x + Math.round((W - 4 - cell.c.width * z) / 2), y + 12 + (ch - cell.c.height) * z, cell.c.width * z, cell.c.height * z);
        ctx.fillStyle = '#FFF6D8';
        ctx.fillText(cell.label.slice(0, Math.floor(W / 6)), x, y + 10);
      }),
    );
    return out.toDataURL('image/png');
  });
});
