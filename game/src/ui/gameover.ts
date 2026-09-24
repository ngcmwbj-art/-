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

const PAGE = { x: 76, y: 22, w: 232, h: 172 };

let pageC: HTMLCanvasElement | null = null;
/** A single page of the notebook: grid, red margin, a torn left edge. */
function pageCanvas(): HTMLCanvasElement {
  if (pageC) return pageC;
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
  drawDoodle(ctx, 96, 34);
  pageC = c;
  return c;
}

/**
 * A quick pencil sketch in the diary: the bug net lying on its side and the
 * hanko that rolled a little way off (what was left where they fell).
 */
function drawDoodle(ctx: CanvasRenderingContext2D, ox: number, oy: number): void {
  const px = (x: number, y: number, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = UI.pencil;
    ctx.fillRect(Math.round(ox + x), Math.round(oy + y), 1, 1);
    ctx.globalAlpha = 1;
  };
  const line = (x0: number, y0: number, x1: number, y1: number, a = 1) => {
    const n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0));
    for (let i = 0; i <= n; i++) px(x0 + ((x1 - x0) * i) / n, y0 + ((y1 - y0) * i) / n, a);
  };
  // the ground line, sketchy
  for (let x = -6; x < 60; x += 1) if (hash2(x, 0, 3) > 0.25) px(x, 24 + (hash2(x >> 3, 1, 3) > 0.7 ? 1 : 0), 0.55);
  // net: pole lying diagonally, the hoop (an ellipse), cross-hatched mesh
  line(-4, 22, 26, 14);
  line(-4, 23, 26, 15, 0.5);
  for (let a = 0; a < Math.PI * 2; a += 0.12) px(34 + Math.cos(a) * 8, 12 + Math.sin(a) * 4);
  for (let k = -6; k <= 6; k += 3) line(34 + k, 9, 34 + k + 2, 15, 0.45);
  for (let a = 0.3; a < Math.PI - 0.3; a += 0.3) px(42 + Math.sin(a) * 6, 12 + Math.cos(a) * 5, 0.6);
  // the hanko, on its side: handle and base
  const hx = 54;
  const hy = 16;
  line(hx, hy, hx + 10, hy);
  line(hx, hy + 5, hx + 10, hy + 5);
  line(hx, hy, hx, hy + 5);
  line(hx + 10, hy - 1, hx + 10, hy + 6);
  line(hx + 13, hy - 1, hx + 13, hy + 6);
  line(hx + 10, hy - 1, hx + 13, hy - 1);
  line(hx + 10, hy + 6, hx + 13, hy + 6);
  // three little motion marks: it rolled
  line(hx - 4, hy - 3, hx - 2, hy - 3, 0.6);
  line(hx - 5, hy + 1, hx - 3, hy + 1, 0.6);
  line(hx - 4, hy + 5, hx - 2, hy + 5, 0.6);
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
    // the page comes up out of the dark
    const k = Math.min(1, this.t / 600);
    const e = ease.cubicOut(k);
    const px = PAGE.x;
    const py = PAGE.y + Math.round((1 - e) * 10);
    const leave = this.pickT >= 0 ? Math.min(1, this.pickT / 320) : 0;
    g.alpha(e * (1 - leave * 0.6), () => {
      g.img(pageCanvas(), px, py);
      // diary header: the date and the weather, in pencil
      g.text('8月31日', px + 26, py + 8, { color: UI.pencil });
      g.text('てんき：ゆうやけ', px + PAGE.w - 12 - textW('てんき：ゆうやけ'), py + 8, { color: UI.pencil });
      pencilLine(g, px + 24, py + 26, PAGE.w - 34, 1, UI.pencil, 8);
      // the line, written by hand: letters bob a pixel, fresh ones darker
      const chars = [...this.title];
      const tw = textW(this.title);
      let x = Math.round(px + PAGE.w / 2 - tw / 2);
      const y = py + 70;
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
        const ty = py + 108 + i * 24 + Math.round((1 - ease.backOut(kk)) * 12) - (sel ? 1 : 0);
        const a = kk * (1 - leave) * (dim ? 0.5 : 1);
        drawTape(g, tx, ty, w, 18, '', { color: sel ? '#FFE0A8' : UI.tape, seed: 60 + i, alpha: a });
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
