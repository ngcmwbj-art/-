// evt_gameover (10_narrative 5.21, 20_systems_battle 18.4, 40_audio 12.5).
// The battle runs this when a symbol battle is lost and nobody installed a
// game-over hook: the screen is already dark, "きょうは ここまで。" appears in
// the middle (no window), the game-over jingle plays, and after 1.0s a small
// graph-paper window offers 「戦う前から やりなおす」「セーブから」. 「セーブから」
// is greyed out when there is no save. From the second wipe on, the boss
// battle adds Kanenari-kun's flip before the retry.

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { ease } from '../engine/tween';
import { flag, hasSave } from '../game/state';
import { playBgm, sfx } from '../audio';
import { GAMEOVER } from '../data/battle';
import { C, cursorStamp, tapeCanvas } from './ui/note';
import { BAYER4, makeCanvas } from '../engine/pixel';
import { flipBoardText } from './art/fxart';

export type GameOverChoice = 'retry' | 'load';

class GameOverScene implements Scene {
  transparent = false;
  done = false;
  choice: GameOverChoice = 'retry';
  private t = 0;
  private index = 0;
  private picked = -1;
  private pickT = 0;
  private flipT = -1;
  private readonly canLoad = hasSave();

  constructor(private readonly bossNote: boolean) {}

  update(dt: number): void {
    this.t += dt;
    const inp = game.input;
    if (this.flipT >= 0) {
      this.flipT += dt;
      if (this.flipT > 400 && inp.pressed('confirm')) this.done = true;
      return;
    }
    if (this.picked >= 0) {
      this.pickT += dt;
      if (this.pickT > 260) {
        if (this.choice === 'retry' && this.bossNote) {
          this.flipT = 0;
          sfx('se_flip');
        } else this.done = true;
      }
      return;
    }
    if (this.t < 1000 + 180) return;
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
      this.picked = this.index;
      this.choice = this.index === 0 ? 'retry' : 'load';
    }
  }

  draw(g: Gfx): void {
    // 30_level_art 10.9: out of the dark, a notebook page; the day's last line
    // in pencil, the two choices on strips of masking tape
    g.clear(C.darkest);
    const a = Math.min(1, this.t / 600);
    g.alpha(a, () => {
      g.ctx.drawImage(pageCanvas(), 0, 0);
      // pencil lettering, a little uneven like handwriting
      const title = [...GAMEOVER.title];
      let x = 192 - Math.round(g.measure(GAMEOVER.title) / 2);
      title.forEach((ch, i) => {
        const dy = [0, 1, 0, -1, 0, 1, 0, 0, 1][i % 9];
        x += g.text(ch, x, 66 + dy, { color: PENCIL });
      });
      // a short pencil underline, drawn in as the page settles
      const k = Math.min(1, Math.max(0, (this.t - 500) / 300));
      for (let i = 0; i < Math.round(116 * k); i++) g.px(134 + i, 88 + (i % 23 === 11 ? 1 : 0), PENCIL_L);
    });
    if (this.t < 1000) return;
    const k = Math.min(1, (this.t - 1000) / 180);
    const opts = [GAMEOVER.retry, GAMEOVER.load];
    opts.forEach((o, i) => {
      const dim = i === 1 && !this.canLoad;
      const sel = this.index === i;
      const y = 112 + i * 26 + Math.round((1 - ease.backOut(k)) * 8);
      const tape = tapeCanvas(176, 18, '', sel ? C.tape : '#E8C898', 21 + i);
      g.alpha(k * (sel ? 1 : 0.85), () => {
        g.img(tape, 104 + (i ? 3 : -2), y);
        g.text(o, 192 + (i ? 3 : -2), y + 1, { color: dim ? C.gray : C.ink, align: 'center' });
      });
      if (sel && this.picked === i && Math.floor(this.pickT / 60) % 2 === 0) g.rect(104 + (i ? 3 : -2), y, 176, 18, C.shu, 0.18);
      if (sel) {
        const bob = this.picked === i ? 1 : Math.round(Math.sin(this.t / 130));
        g.alpha(k, () => g.img(cursorStamp(this.picked === i), 90, y + 4 + bob));
      }
    });
    if (this.flipT >= 0) {
      const img = flipBoardText(GAMEOVER.bossFlip);
      const up = ease.backOut(Math.min(1, this.flipT / 160));
      g.rect(0, 0, 384, 216, C.darkest, 0.55 * Math.min(1, this.flipT / 160));
      g.img(img, Math.round(192 - img.width / 2), Math.round(216 - (216 - 70) * up));
      if (this.flipT > 400) {
        // bouncing "next" marker
        const by = 200 + (Math.floor(this.flipT / 250) % 2);
        for (let i = 0; i < 4; i++) g.rect(189 + i, by + i, 7 - i * 2, 1, C.paper);
      }
    }
  }
}

const PENCIL = '#4A3A6E';
const PENCIL_L = '#7A6A96';

let pageC: HTMLCanvasElement | null = null;
/** A notebook page at dusk: graph paper, red margin, darker toward the corners. */
function pageCanvas(): HTMLCanvasElement {
  if (pageC) return pageC;
  const [c, ctx] = makeCanvas(384, 216);
  const img = ctx.createImageData(384, 216);
  const paper = [0xe9, 0xdf, 0xc4];
  const grid = [0xd6, 0xc6, 0x9f];
  const dark = [0x1b, 0x17, 0x33];
  for (let y = 0; y < 216; y++)
    for (let x = 0; x < 384; x++) {
      const onGrid = (x - 4) % 8 === 0 || (y - 4) % 8 === 0;
      let col = onGrid ? grid : paper;
      if (x === 40) col = [0xd8, 0x8a, 0x98];
      // vignette (the lamp is in the middle), quantised with ordered dither
      const dx = (x - 192) / 250;
      const dy = (y - 100) / 170;
      const v = Math.min(1, dx * dx + dy * dy);
      // soft steps of 8% with dither only between neighbouring steps
      const q = v * v * 0.5 * 12.5;
      const k0 = Math.floor(q);
      const shade = (k0 + (BAYER4[y & 3][x & 3] < Math.round((q - k0) * 16) ? 1 : 0)) * 0.08;
      const i = (y * 384 + x) * 4;
      img.data[i] = col[0] + (dark[0] - col[0]) * shade;
      img.data[i + 1] = col[1] + (dark[1] - col[1]) * shade;
      img.data[i + 2] = col[2] + (dark[2] - col[2]) * shade;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  // a tiny pencil doodle in the margin: tomorrow's hanamaru, not yet drawn
  ctx.fillStyle = '#9A8EA8';
  for (let a = 0; a < 6.2; a += 0.35) ctx.fillRect(Math.round(24 + Math.cos(a) * 7), Math.round(180 + Math.sin(a) * 7), 1, 1);
  pageC = c;
  return c;
}

/**
 * Run the game-over screen. Must run on a runner that keeps ticking while the
 * scene is on top (game.scripts — battleImpl's caller), not the battle's own.
 */
export function* runGameOver(boss: boolean): Co<GameOverChoice> {
  playBgm('bgm_jingle_gameover');
  const sc = new GameOverScene(boss && flag('flag_lost_count') >= 2);
  game.push(sc);
  yield () => sc.done;
  const i = game.scenes.indexOf(sc);
  if (i === game.scenes.length - 1) game.pop();
  else if (i >= 0) game.scenes.splice(i, 1);
  return sc.choice;
}
