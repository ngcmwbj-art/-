// 全滅 — evt_gameover (10_narrative 5.21, 30_level_art 10.9, 20_systems_battle
// 18.4, 40_audio 12.5). Out of the dark, a page of the summer notebook; the
// pencil writes 「きょうは ここまで。」 (#4A3A6E) with bgm_jingle_gameover; a
// second later two strips of masking tape: 「戦う前から やりなおす」 and
// 「セーブから」 (greyed out without a save). After the second wipe in the
// boss battle, Kanenari-kun's flip suggests resting on the bench first.
//
// Installed as the battle's game-over hook; events with canLose battles can
// call runGameOver() themselves.

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import { hash2 } from '../engine/rng';
import { H, W } from '../engine/screen';
import { ease } from '../engine/tween';
import { charWidth } from '../engine/font';
import { flag, hasSave } from '../game/state';
import { playBgm, sfx, stopAllAmbient } from '../audio';
import { registerScene } from '../boot';
import { setGameOverHook } from '../battle';
import { GAMEOVER } from '../data/battle';
import { say } from './dialog';
import { toTitle } from './flow';
import { drawCursor, drawTape, pencilLine, textW, UI } from './window';

export type GameOverChoice = 'retry' | 'load';

const PAGE = { x: 56, y: 8, w: 272, h: 200 };
/** The 絵日記 picture box on the page (relative to the page). */
const PIC = { x: 26, y: 31, w: 234, h: 82 };

const pageCache = new Map<boolean, HTMLCanvasElement>();
/**
 * A single page of the notebook: grid, red margin, a torn left edge. `night`:
 * the picture of chapter 2's night village instead of the sunset town.
 */
function pageCanvas(night = false): HTMLCanvasElement {
  const cached = pageCache.get(night);
  if (cached) return cached;
  const { w, h } = PAGE;
  const [c, ctx] = makeCanvas(w + 3, h + 3);
  const r = (x: number, y: number, ww: number, hh: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
    ctx.globalAlpha = 1;
  };
  r(3, 3, w, h, '#000000', 0.45);
  r(0, 0, w, h, UI.bg);
  for (let x = 8; x < w; x += 8) r(x, 0, 1, h, UI.bg2);
  for (let y = 8; y < h; y += 8) r(0, y, w, 1, UI.bg2);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const n = hash2(x, y, 57);
      if (n < 0.01) r(x, y, 1, 1, '#F1E4C4');
    }
  r(18, 0, 1, h, UI.margin, 0.5);
  // torn left edge (it was pulled out of the notebook)
  for (let y = 0; y < h; y++) {
    const d = Math.floor(hash2(0, y >> 1, 5) * 3);
    ctx.clearRect(0, y, d, 1);
    r(d, y, 1, 1, '#E8D9B5');
  }
  // the page is a little warmer at the top, cooler at the bottom
  r(0, 0, w, 1, '#FFFBEE');
  r(0, h - 1, w, 1, '#E8D9B5');
  if (night) drawNightPicture(ctx, PIC.x, PIC.y, PIC.w, PIC.h);
  else drawPicture(ctx, PIC.x, PIC.y, PIC.w, PIC.h);
  pageCache.set(night, c);
  return c;
}

/**
 * The day's picture in the 絵日記, in crayon (Minato drew it): the sunset
 * sinking behind the town, two crows, and in front the bug net lying on
 * its side in the grass with the hanko that rolled a little way off — what
 * was left where they fell. Crayon: every colour is laid in short diagonal
 * strokes that let the paper show through, with a wobbly pencil frame.
 */
function drawPicture(ctx: CanvasRenderingContext2D, ox: number, oy: number, w: number, h: number): void {
  const put = (x: number, y: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(ox + x, oy + y, 1, 1);
    ctx.globalAlpha = 1;
  };
  const horizon = 54;
  const sun = { x: 64, y: 52, r: 17 };
  // the town's skyline on the right: gabled houses, the clock tower, the mall
  const sky = new Array<number>(w).fill(99);
  let hx = 96;
  let k = 0;
  while (hx < w) {
    const hw = 12 + Math.floor(hash2(k, 1, 21) * 9);
    const top = 40 + Math.floor(hash2(k, 2, 21) * 7);
    for (let x = hx; x < Math.min(w, hx + hw); x++) {
      const d = Math.abs(x - (hx + hw / 2));
      sky[x] = Math.min(sky[x], top + Math.max(0, Math.round(d) - 3));
    }
    hx += hw - 1;
    k++;
  }
  for (let x = 122; x < 129; x++) sky[x] = x === 125 ? 18 : 21; // clock tower
  for (let x = 196; x < 226; x++) sky[x] = 33; // the mall
  // what colour the crayon is at (x, y)
  const colorAt = (x: number, y: number): string => {
    const j = Math.floor(hash2(x >> 2, 7, 5) * 3) - 1; // crayon bands don't meet on a ruler line
    if (y < horizon && y >= sky[x]) return y > horizon - 3 ? '#4A3A6E' : '#6A5A8E';
    if (y < horizon) {
      const d = Math.hypot(x - sun.x, y - sun.y);
      if (d <= sun.r) return d > sun.r - 2 ? '#C8302A' : '#E23B2E';
      return y < 17 + j ? '#F2894B' : y < 34 + j ? '#F7B25E' : '#EE8A86';
    }
    if (y < horizon + 12 + j) return '#7FA85A';
    return '#C8A06A';
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const col = colorAt(x, y);
      // crayon: long diagonal strokes (u across them, v along them); the
      // paper shows through in broken streaks between strokes
      const u = x + y;
      const v = x - y;
      const lane = u % 5;
      const stroke = Math.floor(u / 5);
      if (lane === 0 && hash2(stroke, Math.floor(v / 9), 31) < 0.5) continue;
      // each stroke pressed a little harder or softer
      put(x, y, col, lane === 2 ? 0.85 : 0.9 + hash2(stroke, Math.floor(v / 13), 8) * 0.1);
    }
  // sun rays, pressed hard (a child's sun even as it sets)
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + (i + 0.5) * (Math.PI / 7);
    for (let k = sun.r + 3; k < sun.r + 8; k++) {
      const x = Math.round(sun.x + Math.cos(a) * k);
      const y = Math.round(sun.y + Math.sin(a) * k);
      if (y < horizon - 1) put(x, y, '#E23B2E');
    }
  }
  // two crows, pencil ticks
  for (const [cx, cy] of [
    [118, 12],
    [132, 17],
  ]) {
    put(cx - 2, cy - 1, '#2A2440');
    put(cx - 1, cy, '#2A2440');
    put(cx, cy, '#2A2440');
    put(cx + 1, cy - 1, '#2A2440');
    put(cx + 2, cy - 1, '#2A2440');
  }
  // tufts of grass along the horizon
  for (let x = 2; x < w - 2; x += 5 + Math.floor(hash2(x, 3, 4) * 4)) {
    put(x, horizon - 1, '#5F8A3A');
    put(x + 1, horizon - 2, '#5F8A3A');
  }
  // the net lying on its side: pole, hoop, mesh; and its long evening shadow
  const line = (x0: number, y0: number, x1: number, y1: number, col: string, a = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) put(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), col, a);
  };
  line(40, 76, 118, 64, '#4A3A6E', 0.35);
  line(38, 73, 116, 61, '#8A5A2A');
  line(38, 74, 116, 62, '#A8742A');
  for (let a = 0; a < Math.PI * 2; a += 0.08) put(Math.round(128 + Math.cos(a) * 12), Math.round(60 + Math.sin(a) * 7), '#6B7186');
  for (let k = -9; k <= 9; k += 3) line(128 + k, 55 + Math.round(Math.abs(k) / 3), 128 + k + 2, 65 - Math.round(Math.abs(k) / 3), '#F4F1E8', 0.8);
  // the hanko, rolled away: handle and vermilion base
  line(160, 70, 168, 70, '#8A5A2A');
  line(160, 71, 168, 71, '#C8A06A');
  line(160, 72, 168, 72, '#A8742A');
  for (let y = 68; y <= 74; y++) line(169, y, 172, y, '#E23B2E');
  line(169, 74, 172, 74, '#B8241E');
  // motion marks: it rolled
  line(152, 67, 155, 67, '#4A3A6E', 0.6);
  line(151, 71, 154, 71, '#4A3A6E', 0.6);
  line(152, 75, 155, 75, '#4A3A6E', 0.6);
  // the pencil frame round the picture, a little wobbly
  for (let x = -1; x <= w; x++) {
    put(x, -1 + (hash2(x >> 4, 1, 2) > 0.8 ? 1 : 0), '#4A3A6E');
    put(x, h + (hash2(x >> 4, 2, 2) > 0.8 ? -1 : 0), '#4A3A6E');
  }
  for (let y = -1; y <= h; y++) {
    put(-1, y, '#4A3A6E');
    put(w, y, '#4A3A6E');
  }
}

/**
 * Chapter 2's 絵日記 picture: the night village in crayon — a violet sky
 * pricked with yellow stars (the one that doesn't twinkle a little bigger),
 * the mountains, the roofs with one window lit, the greenhouse arches — and
 * in front the net lying on its side in the grass with the tomato still
 * glowing in it, the hanko rolled a little way off.
 */
function drawNightPicture(ctx: CanvasRenderingContext2D, ox: number, oy: number, w: number, h: number): void {
  const put = (x: number, y: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(ox + x, oy + y, 1, 1);
    ctx.globalAlpha = 1;
  };
  const horizon = 56;
  // the mountains, then the village's roofs in front of them
  const ridge = new Array<number>(w).fill(99);
  for (let x = 0; x < w; x++) ridge[x] = Math.round(30 + Math.sin(x / 23) * 6 + Math.sin(x / 9 + 1) * 2);
  const roofs = new Array<number>(w).fill(99);
  let hx = 8;
  let k = 0;
  while (hx < w) {
    const hw = 14 + Math.floor(hash2(k, 1, 23) * 10);
    const top = 44 + Math.floor(hash2(k, 2, 23) * 5);
    for (let x = hx; x < Math.min(w, hx + hw); x++) roofs[x] = Math.min(roofs[x], top + Math.max(0, Math.round(Math.abs(x - (hx + hw / 2))) - 4));
    hx += hw + 6 + Math.floor(hash2(k, 3, 23) * 14);
    k++;
  }
  // the greenhouses on the right: three low arches
  for (const gx of [176, 196, 216])
    for (let x = gx; x < gx + 16; x++) roofs[x] = Math.min(roofs[x], Math.round(47 - Math.sqrt(Math.max(0, 64 - (x - gx - 8) ** 2)) * 0.8));
  const colorAt = (x: number, y: number): string => {
    const j = Math.floor(hash2(x >> 2, 7, 5) * 3) - 1;
    if (y < horizon && y >= roofs[x]) return y > horizon - 3 ? '#1B1733' : x >= 176 && x < 232 ? '#E8A070' : '#2A2440';
    if (y < horizon && y >= ridge[x]) return '#1E1A36';
    if (y < horizon) return y < 12 + j ? '#2A2248' : y < 24 + j ? '#3A2B5C' : '#5A4480';
    if (y < horizon + 12 + j) return '#3A5A48';
    return '#5A4A3A';
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const u = x + y;
      const v = x - y;
      const lane = u % 5;
      const stroke = Math.floor(u / 5);
      // on the dark crayon the paper shows through less (it's pressed harder)
      if (lane === 0 && hash2(stroke, Math.floor(v / 9), 33) < 0.22) continue;
      put(x, y, colorAt(x, y), lane === 2 ? 0.92 : 0.95 + hash2(stroke, Math.floor(v / 13), 9) * 0.05);
    }
  // stars: yellow crayon crosses, one bigger that doesn't twinkle (the morning star)
  for (let i = 0; i < 16; i++) {
    const x = 6 + Math.floor(hash2(i, 1, 61) * (w - 12));
    const y = 3 + Math.floor(hash2(i, 2, 61) * 22);
    put(x, y, '#F6D98A');
    if (i % 3 === 0) {
      put(x - 1, y, '#F6D98A', 0.7);
      put(x + 1, y, '#F6D98A', 0.7);
    }
  }
  for (const [dx, dy] of [
    [0, 0],
    [-1, 0],
    [1, 0],
    [0, -1],
    [0, 1],
    [-2, 0],
    [2, 0],
  ])
    put(20 + dx, 20 + dy, '#FFF6D8');
  // one window still lit, the rest asleep
  for (let y = 49; y < 52; y++) for (let x = 70; x < 73; x++) put(x, y, '#F6D98A');
  // grass tufts along the horizon
  for (let x = 2; x < w - 2; x += 5 + Math.floor(hash2(x, 3, 4) * 4)) {
    put(x, horizon - 1, '#2E5A3A');
    put(x + 1, horizon - 2, '#2E5A3A');
  }
  const line = (x0: number, y0: number, x1: number, y1: number, col: string, a = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) put(Math.round(x0 + ((x1 - x0) * i) / n), Math.round(y0 + ((y1 - y0) * i) / n), col, a);
  };
  // the net on its side, the tomato glowing in it (a ring of light pressed round it)
  line(38, 73, 116, 61, '#8A5A2A');
  line(38, 74, 116, 62, '#A8742A');
  for (let a = 0; a < Math.PI * 2; a += 0.06) put(Math.round(128 + Math.cos(a) * 17), Math.round(62 + Math.sin(a) * 11), '#F7C27A', 0.55);
  for (let a = 0; a < Math.PI * 2; a += 0.08) put(Math.round(128 + Math.cos(a) * 12), Math.round(60 + Math.sin(a) * 7), '#6B7186');
  for (let yy = -3; yy <= 3; yy++)
    for (let xx = -4; xx <= 4; xx++) if (xx * xx + yy * yy * 1.6 <= 17) put(128 + xx, 61 + yy, xx + yy < -2 ? '#FF8A5A' : '#E84E3C');
  put(127, 57, '#3FA66B');
  put(128, 57, '#3FA66B');
  for (let kk = -9; kk <= 9; kk += 3) line(128 + kk, 55 + Math.round(Math.abs(kk) / 3), 128 + kk + 2, 65 - Math.round(Math.abs(kk) / 3), '#F4F1E8', 0.6);
  // the hanko, rolled away
  line(160, 70, 168, 70, '#8A5A2A');
  line(160, 71, 168, 71, '#C8A06A');
  line(160, 72, 168, 72, '#A8742A');
  for (let y = 68; y <= 74; y++) line(169, y, 172, y, '#E23B2E');
  line(152, 67, 155, 67, '#F4F1E8', 0.6);
  line(151, 71, 154, 71, '#F4F1E8', 0.6);
  line(152, 75, 155, 75, '#F4F1E8', 0.6);
  // the pencil frame round the picture, a little wobbly
  for (let x = -1; x <= w; x++) {
    put(x, -1 + (hash2(x >> 4, 1, 2) > 0.8 ? 1 : 0), '#4A3A6E');
    put(x, h + (hash2(x >> 4, 2, 2) > 0.8 ? -1 : 0), '#4A3A6E');
  }
  for (let y = -1; y <= h; y++) {
    put(-1, y, '#4A3A6E');
    put(w, y, '#4A3A6E');
  }
}

class GameOverScene implements Scene {
  transparent = false;
  done = false;
  choice: GameOverChoice = 'retry';
  private t = 0;
  private index = 0;
  private pickT = -1;
  private written = 0;
  private penAcc = 0;
  private readonly canLoad = hasSave();
  private readonly title = GAMEOVER.title;

  constructor(private readonly bossNote: boolean) {}

  enter(): void {
    stopAllAmbient(0.5);
    playBgm('bgm_jingle_gameover');
  }

  update(dt: number): void {
    this.t += dt;
    // the pencil writes one letter every 0.12 s once the page has settled
    if (this.t > 700 && this.written < [...this.title].length) {
      this.penAcc += dt;
      while (this.penAcc >= 120 && this.written < [...this.title].length) {
        this.penAcc -= 120;
        const ch = [...this.title][this.written];
        this.written++;
        if (ch.trim()) sfx('se_pen_write');
      }
    }
    if (this.pickT >= 0) {
      this.pickT += dt;
      if (this.pickT > 320) this.done = true;
      return;
    }
    if (this.t < this.menuAt) return;
    const inp = game.input;
    if (inp.repeat('up') || inp.repeat('down')) {
      this.index = 1 - this.index;
      sfx('se_cursor');
    }
    if (inp.pressed('confirm')) {
      if (this.index === 1 && !this.canLoad) {
        sfx('se_buzzer');
        return;
      }
      sfx('se_confirm');
      this.pickT = 0;
      this.choice = this.index === 0 ? 'retry' : 'load';
    }
  }

  private get menuAt(): number {
    return 700 + [...this.title].length * 120 + 1000;
  }

  draw(g: Gfx): void {
    g.clear(UI.darkest);
    // chapter 2's night: the picture is of the village and the weather is the starry sky
    const night = !!flag('flag_ch2_started') && !flag('flag_ch2_clear');
    // the page comes up out of the dark
    const k = Math.min(1, this.t / 600);
    const e = ease.cubicOut(k);
    const px = PAGE.x;
    const py = PAGE.y + Math.round((1 - e) * 10);
    const leave = this.pickT >= 0 ? Math.min(1, this.pickT / 320) : 0;
    g.alpha(e * (1 - leave * 0.6), () => {
      g.img(pageCanvas(night), px, py);
      // diary header: the date and the weather, in pencil
      g.text('8月31日', px + 26, py + 8, { color: UI.pencil });
      const weather = night ? 'てんき：ほしぞら' : 'てんき：ゆうやけ';
      g.text(weather, px + PAGE.w - 12 - textW(weather), py + 8, { color: UI.pencil });
      pencilLine(g, px + 24, py + 26, PAGE.w - 34, 1, UI.pencil, 8);
      // the line, written by hand: letters bob a pixel, fresh ones darker
      const chars = [...this.title];
      const tw = textW(this.title);
      let x = Math.round(px + PAGE.w / 2 - tw / 2);
      const y = py + PIC.y + PIC.h + 8;
      chars.slice(0, this.written).forEach((ch, i) => {
        const dy = [0, 1, 0, -1, 0, 1, 0, 0, 1][i % 9];
        g.text(ch, x, y + dy, { color: UI.pencil });
        x += charWidth(ch);
      });
      if (this.written >= chars.length) pencilLine(g, Math.round(px + PAGE.w / 2 - tw / 2) - 4, y + 19, tw + 8, Math.min(1, (this.t - (this.menuAt - 1000)) / 300), UI.pencil, 3);
    });
    // two strips of masking tape
    if (this.t >= this.menuAt) {
      const opts = [GAMEOVER.retry, GAMEOVER.load];
      opts.forEach((o, i) => {
        const kk = Math.min(1, (this.t - this.menuAt - i * 90) / 220);
        if (kk <= 0) return;
        const dim = i === 1 && !this.canLoad;
        const sel = this.index === i;
        const w = textW(o) + 26;
        const tx = Math.round(W / 2 - w / 2);
        const ty = py + PIC.y + PIC.h + 36 + i * 23 + Math.round((1 - ease.backOut(kk)) * 12) - (sel ? 1 : 0);
        const a = kk * (1 - leave) * (dim ? 0.5 : 1);
        drawTape(g, tx, ty, w, 18, '', { color: sel ? UI.tapeOn : UI.tapeOff, seed: 60 + i, alpha: a });
        g.text(o, tx + 13, ty + 1, { color: dim ? UI.textDim : UI.text, alpha: kk * (1 - leave) });
        if (sel && kk >= 1) drawCursor(g, tx - 13, ty, this.t, this.pickT);
      });
    }
    if (leave > 0) g.rect(0, 0, W, H, UI.darkest, leave * 0.7);
  }
}

/**
 * evt_gameover. Shows the page and returns the choice; the caller restores
 * the party / loads (the battle's hook does both).
 */
export function* runGameOver(o: { boss?: boolean } = {}): Co<GameOverChoice> {
  const sc = new GameOverScene(!!o.boss && flag('flag_lost_count') >= 2);
  game.fadeAlpha = 0;
  game.push(sc);
  yield () => sc.done;
  if (sc.choice === 'retry' && o.boss && flag('flag_lost_count') >= 2) {
    yield* say('（ベンチで 休んでから\n行きましょう）', { name: 'カネナリくん', voice: 'flip' });
  }
  const i = game.scenes.indexOf(sc);
  if (i === game.scenes.length - 1) game.pop();
  else if (i >= 0) game.scenes.splice(i, 1);
  return sc.choice;
}

// the battle hands its wipes to this screen
setGameOverHook((s) => runGameOver({ boss: s.isBoss }));

// QA: ?scene=gameover (standalone: the choice goes back to the title)
registerScene('gameover', () => {
  const sc = new GameOverScene(false);
  game.scripts.run(
    (function* (): Co {
      yield () => sc.done;
      yield* toTitle(600);
    })(),
  );
  return sc;
});
