// ?scene=chars — character art gallery for QA. Every registered sprite with
// its walk / idle / run cycles and extras, on a sunset ground (switchable to
// the other stage palettes), plus portraits, emotes and the flip board.
//
// Keys: ←/→ page, ↑/↓ scroll, C/Tab zoom, Z mode (walk/idle/look_up/run),
// X background. Debug: __game.cmd.chars(page, {zoom, bg, mode, scroll}).

import type { Scene } from '../../engine/game';
import { game } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { PixelCanvas, makeCanvas } from '../../engine/pixel';
import { valueNoise } from '../../engine/rng';
import type { Dir } from '../../game/state';
import { registerScene } from '../../boot';
import { registerDebug } from '../../debug';
import { animIndex, charIds, charSprite, portrait, portraitIds, type CharSprite } from './registry';
import { EMOTE_KINDS, emoteFrames, EMOTE_FRAME_MS } from './emotes';
import { flipBoard, flipBoardPanel, flipIcon } from './flip';
import { tinyText, tinyWidth } from './tinyfont';
import { MOODS } from './portraits';

const DIRS: Dir[] = ['down', 'left', 'up', 'right'];

interface BgDef {
  name: string;
  base: string;
  dark: string;
  light: string;
  line: string;
  text: string;
}

const BGS: BgDef[] = [
  { name: 'stage0', base: '#D6A57C', dark: '#C48E6C', light: '#E6BC8E', line: '#B87E62', text: '#2A2440' },
  { name: 'stage1', base: '#D39585', dark: '#BE7E74', light: '#E4AE96', line: '#AC6E6A', text: '#2A2440' },
  { name: 'stage2', base: '#9B7FA6', dark: '#866C94', light: '#B294B4', line: '#76608A', text: '#FBF3DC' },
  { name: 'night', base: '#3E3860', dark: '#332E52', light: '#4A4470', line: '#2C2748', text: '#FBF3DC' },
  { name: 'mall', base: '#CFC6AC', dark: '#BDB399', light: '#E0D8BE', line: '#A89E86', text: '#2A2440' },
  { name: 'paper', base: '#FBF3DC', dark: '#F2E6C6', light: '#FFF9EA', line: '#E8D9B5', text: '#2A2440' },
];

const groundCache = new Map<string, HTMLCanvasElement>();
function ground(bg: BgDef): HTMLCanvasElement {
  let c = groundCache.get(bg.name);
  if (c) return c;
  const p = new PixelCanvas(384, 216);
  for (let y = 0; y < 216; y++)
    for (let x = 0; x < 384; x++) {
      const n = valueNoise(x / 7, y / 5, 3) * 0.7 + valueNoise(x / 2.3, y / 2.1, 9) * 0.3;
      let col = bg.base;
      if (n < 0.3) col = bg.dark;
      else if (n > 0.74) col = bg.light;
      if (bg.name === 'mall' || bg.name === 'paper') {
        if (x % 24 === 0 || y % 24 === 0) col = bg.line;
      } else if ((y % 32 === 0 && (x + ((y / 32) | 0) * 13) % 48 < 30) || (x % 48 === 0 && y % 32 < 20)) col = bg.line;
      p.set(x, y, col);
    }
  c = p.toCanvas();
  groundCache.set(bg.name, c);
  return c;
}

const shadowCache = new Map<number, HTMLCanvasElement>();
function shadow(w: number): HTMLCanvasElement {
  let c = shadowCache.get(w);
  if (!c) {
    const p = new PixelCanvas(w + 2, 5);
    p.ellipse((w + 2) / 2, 2.5, w / 2, 2, '#4A3A6E66');
    c = p.toCanvas();
    shadowCache.set(w, c);
  }
  return c;
}

interface Tile {
  w: number;
  h: number;
  label: string;
  draw: (g: Gfx, x: number, y: number, t: number) => void;
}

type Page = { title: string; tiles: () => Tile[]; plain?: boolean };

function isFoe(id: string): boolean {
  return id.startsWith('enemy_') || id.startsWith('restored_') || id.startsWith('boss_');
}

function shortName(id: string): string {
  return id.replace(/^npc_/, '').replace(/^enemy_/, '').replace(/^restored_enemy_/, 'r:');
}

function spriteTile(s: CharSprite, label: string, z: number, frame: (t: number) => HTMLCanvasElement, shadowOn = true): Tile {
  return {
    w: s.w * z,
    h: s.h * z + 8,
    label,
    draw: (g, x, y, t) => {
      const img = frame(t);
      if (shadowOn && (s.shadow ?? 0) > 0) {
        const sh = shadow(s.shadow!);
        g.img(sh, x + (s.w * z) / 2 - (sh.width * z) / 2, y + s.h * z - 3 * z, { scale: z });
      }
      g.img(img, x + ((s.w - img.width) * z) / 2, y + (s.h - img.height) * z, { scale: z });
    },
  };
}

function cycle(frames: HTMLCanvasElement[], ms: number) {
  return (t: number) => frames[Math.floor(t / ms) % frames.length];
}

export class CharGallery implements Scene {
  page = 0;
  zoom = 1;
  bg = 0;
  mode = 0; // overview mode: 0 idle, 1 walk, 2 look_up, 3 run
  scroll = 0;
  t = 0;
  pages: Page[] = [];

  constructor(o: { page?: number | string; zoom?: number; bg?: number; mode?: number; scroll?: number } = {}) {
    this.buildPages();
    if (typeof o.page === 'string') {
      const i = this.pages.findIndex((p) => p.title === o.page);
      this.page = i >= 0 ? i : 0;
    } else this.page = o.page ?? 0;
    this.zoom = o.zoom ?? 1;
    this.bg = o.bg ?? 0;
    this.mode = o.mode ?? 0;
    this.scroll = o.scroll ?? 0;
  }

  buildPages(): void {
    const ids = charIds();
    const people = ids.filter((i) => !isFoe(i));
    const foes = ids.filter(isFoe);
    const modes = ['idle', 'walk', 'look_up', 'run'];
    const overview = (list: string[]) => (): Tile[] =>
      list.map((id) => {
        const s = charSprite(id);
        const m = modes[this.mode];
        const frame = (t: number) => {
          if (m === 'walk') return cycle(s.walk.down, s.walkFrameMs ?? 140)(t);
          if (m === 'run') return cycle(s.run?.down ?? s.walk.down, s.runFrameMs ?? 90)(t);
          if (m === 'look_up') return s.extra?.look_up ?? s.walk.down[0];
          return cycle(s.idle?.down ?? [s.walk.down[0]], s.idleFrameMs ?? 250)(t);
        };
        return spriteTile(s, shortName(id), this.zoom, frame);
      });
    this.pages.push({ title: 'cast', tiles: overview(people) });
    this.pages.push({ title: 'foes', tiles: overview(foes) });
    this.pages.push({ title: 'portraits', tiles: () => this.portraitTiles(), plain: true });
    this.pages.push({ title: 'emotes', tiles: () => this.emoteTiles() });
    this.pages.push({ title: 'flip', tiles: () => this.flipTiles(), plain: true });
    for (const id of ids) this.pages.push({ title: id, tiles: () => this.detailTiles(id) });
  }

  detailTiles(id: string): Tile[] {
    const s = charSprite(id);
    const z = this.zoom;
    const out: Tile[] = [];
    for (const d of DIRS) out.push(spriteTile(s, `walk ${d}`, z, cycle(s.walk[d], s.walkFrameMs ?? 140)));
    if (s.idle) for (const d of DIRS) out.push(spriteTile(s, `idle ${d}`, z, cycle(s.idle[d], s.idleFrameMs ?? 250)));
    if (s.run) for (const d of DIRS) out.push(spriteTile(s, `run ${d}`, z, cycle(s.run[d], s.runFrameMs ?? 90)));
    for (const d of DIRS) s.walk[d].forEach((c, i) => out.push(spriteTile(s, `${d[0]}${i}`, z, () => c)));
    if (s.run) for (const d of DIRS) s.run[d].forEach((c, i) => out.push(spriteTile(s, `r${d[0]}${i}`, z, () => c)));
    for (const name of Object.keys(s.extra ?? {})) {
      if (s.anims?.[name]) continue;
      const byDir = s.extraDir?.[name];
      if (byDir) for (const d of DIRS) { const c = byDir[d]; if (c) out.push(spriteTile(s, `${name}:${d[0]}`, z, () => c)); }
      else out.push(spriteTile(s, name, z, () => s.extra![name]));
    }
    for (const name of Object.keys(s.anims ?? {})) {
      const a = s.anims![name];
      out.push(spriteTile(s, `~${name}`, z, (t) => a.frames[animIndex(a, t)]));
    }
    return out;
  }

  portraitTiles(): Tile[] {
    const out: Tile[] = [];
    const z = this.zoom;
    for (const id of portraitIds())
      for (const m of MOODS) {
        const c = portrait(id, m);
        if (!c) continue;
        out.push({ w: c.width * z, h: c.height * z + 8, label: `${id.slice(0, 4)}:${m.slice(0, 5)}`, draw: (g, x, y) => g.img(c, x, y, { scale: z }) });
      }
    return out;
  }

  emoteTiles(): Tile[] {
    const z = this.zoom;
    const out: Tile[] = [];
    const s = charSprite('minato');
    for (const k of EMOTE_KINDS) {
      const fr = emoteFrames(k);
      const len = fr.length * EMOTE_FRAME_MS + 900;
      out.push({
        w: 28 * z,
        h: 44 * z + 8,
        label: k,
        draw: (g, x, y, t) => {
          const base = s.idle?.down ?? s.walk.down;
          const img = base[Math.floor(t / 250) % base.length];
          const sx = x + ((28 - 16) * z) / 2;
          const sy = y + 20 * z;
          g.img(shadow(10), sx + 2 * z, sy + 21 * z, { scale: z });
          g.img(img, sx, sy, { scale: z });
          const tt = t % len;
          const i = Math.min(fr.length - 1, Math.floor(tt / EMOTE_FRAME_MS));
          const e = fr[i];
          g.img(e, x + ((28 - e.width) * z) / 2, sy - (e.height - 1) * z, { scale: z });
        },
      });
    }
    return out;
  }

  flipTiles(): Tile[] {
    const z = this.zoom;
    const b = flipBoard();
    const panel = flipBoardPanel(160, 40);
    const icon = flipIcon();
    const k = charSprite('kanenari');
    return [
      { w: b.width * z * 2, h: b.height * z * 2 + 8, label: 'flipboard', draw: (g, x, y) => g.img(b, x, y, { scale: z * 2 }) },
      { w: icon.width * z * 3, h: icon.height * z * 3 + 8, label: 'icon', draw: (g, x, y) => g.img(icon, x, y, { scale: z * 3 }) },
      { w: panel.width * z, h: panel.height * z + 8, label: 'panel 160x40', draw: (g, x, y) => g.img(panel, x, y, { scale: z }) },
      spriteTile(k, 'kanenari flip', z * 2, () => k.extra?.flip ?? k.walk.down[0]),
    ];
  }

  update(dt: number): void {
    this.t += dt;
    const inp = game.input;
    if (inp.pressed('right')) { this.page = (this.page + 1) % this.pages.length; this.scroll = 0; }
    if (inp.pressed('left')) { this.page = (this.page + this.pages.length - 1) % this.pages.length; this.scroll = 0; }
    if (inp.repeat('down')) this.scroll += 24;
    if (inp.repeat('up')) this.scroll = Math.max(0, this.scroll - 24);
    if (inp.pressed('menu')) this.zoom = (this.zoom % 3) + 1;
    if (inp.pressed('confirm')) this.mode = (this.mode + 1) % 4;
    if (inp.pressed('cancel')) this.bg = (this.bg + 1) % BGS.length;
  }

  draw(g: Gfx): void {
    const page = this.pages[this.page];
    const bg = page.plain ? BGS[5] : BGS[this.bg];
    g.img(ground(bg), 0, 0);
    const tiles = page.tiles();
    // flow layout
    let x = 6;
    let y = 16 - this.scroll;
    let rowH = 0;
    const t = this.t;
    for (const tile of tiles) {
      const cw = Math.max(tile.w, tinyWidth(tile.label)) + 6;
      if (x + cw > 384 - 2) {
        x = 6;
        y += rowH + 4;
        rowH = 0;
      }
      if (y + tile.h > 0 && y < 216) {
        tile.draw(g, x + (cw - 6 - tile.w) / 2, y, t);
        tinyText(g, tile.label, x + (cw - 6 - tinyWidth(tile.label)) / 2, y + tile.h - 6, bg.text);
      }
      x += cw;
      rowH = Math.max(rowH, tile.h);
    }
    // header
    g.rect(0, 0, 384, 11, '#2A2440', 0.85);
    const modes = ['idle', 'walk', 'look_up', 'run'];
    tinyText(g, `${this.page + 1}/${this.pages.length} ${page.title}  z${this.zoom} ${bg.name} ${modes[this.mode]}`, 4, 3, '#FBF3DC');
  }
}

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

void makeCanvas;
