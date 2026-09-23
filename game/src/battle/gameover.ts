// evt_gameover (10_narrative 5.21, 20_systems_battle 18.4, 40_audio 12.5).
// The battle runs this when a symbol battle is lost and nobody installed a
// game-over hook: out of the dark, a street lamp's pool of light with Minato's
// bug net and hanko lying where they fell, dust drifting up; "きょうは ここまで。"
// in the middle (no window) with the game-over jingle; after 1.0s a small
// graph-paper window offers 「戦う前から やりなおす」「セーブから」 (greyed out
// and skipped by the cursor when there is no save). From the second wipe on,
// the boss battle adds Kanenari-kun's flip before the retry.

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { ease } from '../engine/tween';
import { flag, hasSave } from '../game/state';
import { playBgm, sfx } from '../audio';
import { GAMEOVER } from '../data/battle';
import { C, cursorStamp, drawNote, tapeCanvas } from './ui/note';
import { BAYER4, PixelCanvas } from '../engine/pixel';
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
    // the cursor never lands on a choice that cannot be taken (no save)
    if ((inp.repeat('up') || inp.repeat('down')) && this.canLoad) {
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
    // 10_narrative 5.21: dark; in the middle, no window, 「きょうは ここまで。」
    // under a street lamp where Minato's bug net and hanko lie where they fell;
    // after 1.0s the choices in a small graph-paper window
    g.clear(C.darkest);
    const a = Math.min(1, this.t / 700);
    g.alpha(a, () => g.ctx.drawImage(nightCanvas(), 0, 0));
    // dust motes drifting up through the lamplight
    for (let i = 0; i < 14; i++) {
      const life = 3200 + (i % 5) * 400;
      const p = ((this.t + i * 977) % life) / life;
      const x = 150 + ((i * 53) % 84) + Math.round(Math.sin(p * 6.3 + i) * 3);
      const y = Math.round(160 - p * 110);
      const tw = Math.sin(p * Math.PI);
      g.alpha(a * tw * 0.8, () => g.px(x, y, i % 3 ? '#E8D9B5' : '#FFE7A3'));
    }
    // the day's last line, handwritten (a little uneven), and its underline
    const ta = Math.min(1, Math.max(0, (this.t - 250) / 500));
    g.alpha(ta, () => {
      const title = [...GAMEOVER.title];
      let x = 192 - Math.round(g.measure(GAMEOVER.title) / 2);
      title.forEach((ch, i) => {
        const dy = [0, 1, 0, -1, 0, 1, 0, 0, 1][i % 9];
        g.text(ch, x + 1, 58 + dy + 1, { color: '#1B1733' });
        x += g.text(ch, x, 58 + dy, { color: '#E8D9B5' });
      });
      const k = Math.min(1, Math.max(0, (this.t - 650) / 300));
      for (let i = 0; i < Math.round(116 * k); i++) g.px(134 + i, 80 + (i % 23 === 11 ? 1 : 0), '#8A7A9E');
    });
    if (this.t < 1000) return;
    const k = Math.min(1, (this.t - 1000) / 180);
    const wy = 102 + Math.round((1 - ease.backOut(k)) * 8);
    g.alpha(k, () => {
      drawNote(g, 88, wy, 208, 48);
      g.img(tapeCanvas(22, 7, '', C.tape, 4), 181, wy - 3);
    });
    const opts = [GAMEOVER.retry, GAMEOVER.load];
    opts.forEach((o, i) => {
      const dim = i === 1 && !this.canLoad;
      const sel = this.index === i;
      const y = wy + 6 + i * 19;
      g.alpha(k, () => g.text(o, 112, y, { color: dim ? C.gray : C.ink }));
      if (sel && this.picked === i && Math.floor(this.pickT / 60) % 2 === 0) g.rect(110, y, 176, 17, C.shu, 0.16);
      if (sel) {
        const bob = this.picked === i ? 1 : Math.round(Math.sin(this.t / 130));
        g.alpha(k, () => g.img(cursorStamp(this.picked === i), 98, y + 3 + bob));
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

let nightC: HTMLCanvasElement | null = null;
/**
 * The dark street under one lamp (384×216, drawn once): a faint cone of light,
 * a pool of it on the asphalt, and in the pool the things Minato dropped — the
 * bug net lying on its side and the wooden hanko, rolled a little away.
 */
function nightCanvas(): HTMLCanvasElement {
  if (nightC) return nightC;
  const p = new PixelCanvas(384, 216);
  p.rect(0, 0, 384, 216, C.darkest);
  const dith = (x: number, y: number, v: number) => BAYER4[y & 3][x & 3] < Math.round(v * 16);
  // the cone of lamplight from above the frame
  for (let y = 0; y < 170; y++) {
    const half = 10 + (y / 170) * 96;
    for (let x = Math.floor(192 - half); x <= Math.ceil(192 + half); x++) {
      const edge = 1 - Math.abs(x - 192) / half;
      const v = Math.min(1, edge * 1.6) * (0.35 + 0.25 * (y / 170));
      if (dith(x, y, v)) p.set(x, y, '#141024');
    }
  }
  // the pool of light on the ground (three dithered rings)
  const pool = [
    [124, 30, '#1B1733', 1],
    [100, 23, '#231D3C', 1],
    [74, 16, '#2E2648', 1],
    [46, 10, '#3A3056', 0.85],
  ] as [number, number, string, number][];
  for (const [rx, ry, col, dens] of pool)
    for (let y = -ry - 2; y <= ry + 2; y++)
      for (let x = -rx - 2; x <= rx + 2; x++) {
        const d = (x * x) / (rx * rx) + (y * y) / (ry * ry);
        if (d > 1.12) continue;
        const v = d < 0.88 ? dens : dens * (1.12 - d) / 0.24;
        if (dith(192 + x, 166 + y, v)) p.set(192 + x, 166 + y, col);
      }
  // a crack in the asphalt and a few grains of grit
  for (let i = 0; i < 26; i++) p.set(120 + i * 2 + (i % 3), 176 + Math.round(Math.sin(i * 0.9) * 1.5), '#16122A');
  for (let i = 0; i < 40; i++) {
    const x = 110 + ((i * 37) % 164);
    const y = 152 + ((i * 23) % 26);
    p.set(x, y, i % 2 ? '#3E3460' : '#120E22');
  }
  // ---- the bug net, lying on its side (pole to the lower left) ----
  // shadow first
  for (let i = 0; i < 64; i++) p.set(130 + i, 173 - Math.round(i * 0.16) + 2, '#120E22');
  for (let y = -4; y <= 4; y++)
    for (let x = -13; x <= 13; x++) if ((x * x) / 169 + (y * y) / 16 <= 1) p.set(214 + x + 2, 162 + y + 3, '#120E22');
  // bag of netting behind the hoop (dithered, lit from the lamp above)
  for (let y = -6; y <= 6; y++)
    for (let x = 0; x <= 16; x++) {
      const d = ((x - 7) * (x - 7)) / 81 + (y * y) / 36;
      if (d > 1) continue;
      if ((x + y) & 1) p.set(218 + x, 158 + y, y < -1 ? '#C8C2B4' : '#8E88A0');
    }
  // pole (2px, wood) with a lit top edge
  for (let i = 0; i < 64; i++) {
    const x = 130 + i;
    const y = 172 - Math.round(i * 0.16);
    p.set(x, y - 1, '#E8C890');
    p.set(x, y, '#C8A06A');
    p.set(x, y + 1, '#7A5A3A');
  }
  p.rect(129, 170, 3, 4, '#5A3A2A'); // grip end
  // hoop, seen at a slant: an ellipse ring with a dark rim and a pale wire
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    const x = Math.round(208 + Math.cos(a) * 12);
    const y = Math.round(160 + Math.sin(a) * 5);
    p.set(x, y, Math.sin(a) < 0 ? '#F4F1E8' : '#B8B2C4');
  }
  for (let a = 0; a < Math.PI * 2; a += 0.02) {
    const x = Math.round(208 + Math.cos(a) * 13);
    const y = Math.round(160 + Math.sin(a) * 6);
    if (!p.get(x, y) || p.get(x, y) === toU32(C.darkest)) p.set(x, y, '#2A2440');
  }
  // netting stretched inside the hoop
  for (let y = -4; y <= 4; y++)
    for (let x = -11; x <= 11; x++) {
      if ((x * x) / 121 + (y * y) / 16 > 1) continue;
      if ((x + y * 2) % 3 === 0) p.set(208 + x, 160 + y, '#6E6886');
    }
  // ---- the hanko, rolled a little way off on its side, its red face out ----
  for (let x = -9; x <= 9; x++) p.set(252 + x + 2, 172, '#120E22');
  for (let x = -8; x <= 8; x++) p.set(252 + x + 3, 173, '#120E22');
  const hanko = [
    '....kkkkkkkkk...',
    '.kkkYYYYYYYYYkk.',
    'kYYkyYYyyyyyykrk',
    'kyykyyyyyyyyykrk',
    'kbbkbbbbbbbbbkRk',
    '.kkkbbbbbbbbbkRk',
    '....kkkkkkkkkkk.',
  ];
  const pal: Record<string, string> = { k: '#2A2440', Y: '#E8C890', y: '#C8A06A', b: '#8A6440', r: '#E23B2E', R: '#B8241E' };
  hanko.forEach((row, y) => [...row].forEach((ch, x) => pal[ch] && p.set(244 + x, 165 + y, pal[ch])));
  // a faint vermilion mark where it hit the ground
  for (const [x, y] of [[262, 173], [264, 174], [263, 172], [266, 173]]) p.set(x, y, '#6A2A2E');
  nightC = p.toCanvas();
  return nightC;
}

function toU32(hex: string): number {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return ((255 << 24) | (b << 16) | (g << 8) | r) >>> 0;
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
