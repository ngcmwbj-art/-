// 章の扉 (50_ch2_story 10.1, 52_ch2_level_art 12.3): the chapter is stamped.
// On the dark screen a small oval vermilion seal 「第2章」 comes down
// (1.25 → 1.0 in 6 frames, a 1px shake for 4 frames, six drops of ink),
// then 「星見台の トマト」 is written under it by hand, a letter every 0.1 s
// with the pen's scratch, and the hanamaru tomato is set down after the
// last letter with one ring of light. It holds 1.5 s and fades (0.8 s).
//
//   yield* playChapterDoor();                       // chapter 2
//   yield* playChapterDoor({ chapter: '第2章', title: '星見台の トマト' });
//
// Drawn after the screen fade (it reads on a black screen), and the screen
// is left black (game.fadeAlpha = 1) for whatever fades in next.

import type { Co } from '../engine/co';
import { charWidth } from '../engine/font';
import { game, type Widget } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import { Particles } from '../engine/particles';
import { hash2 } from '../engine/rng';
import { W } from '../engine/screen';
import { ease } from '../engine/tween';
import { sfx } from '../audio';
import { tomatoIcon } from './icons';
import { ctxText, rgb, textW, UI } from './window';

const BG = '#0B0B14';
const INK = '#FBF3DC';
const SEAL = { x: 192, y: 84 };
const TITLE_Y = 122;
/** Timeline (ms). */
const STAMP_AT = 350;
const PRESS_MS = 100;
const WRITE_AT = 1050;
const LETTER_MS = 100;
const HOLD_MS = 1500;
const FADE_MS = 800;

const sealCache = new Map<string, HTMLCanvasElement>();

/**
 * The oval seal (about 48×28): a 2px vermilion ring round the word, lit
 * from the top left (#FF6A4D) and pressed a shade darker at the bottom
 * right, the letters in the same ink, 4% かすれ where the ink didn't take.
 */
export function chapterSeal(text: string): HTMLCanvasElement {
  let c = sealCache.get(text);
  if (c) return c;
  const tw = textW(text) - [...text].length + 1; // set a pixel tighter, like a carved seal
  const w = Math.max(48, tw + 14);
  const h = 28;
  const [cv, ctx] = makeCanvas(w, h, { willReadFrequently: true });
  // the ring
  const cx = w / 2;
  const cy = h / 2;
  const put = (x: number, y: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const dx = (x + 0.5 - cx) / (w / 2);
      const dy = (y + 0.5 - cy) / (h / 2);
      const d = Math.sqrt(dx * dx + dy * dy);
      const dx2 = (x + 0.5 - cx) / (w / 2 - 2);
      const dy2 = (y + 0.5 - cy) / (h / 2 - 2);
      const d2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
      if (d <= 1 && d2 > 1) put(x, y, UI.accent);
    }
  // the word, each letter a pixel closer than the font's pitch
  let x = Math.round(cx - tw / 2);
  for (const ch of text) {
    ctxText(ctx, ch, x, Math.round(cy - 8) - 1, UI.accent);
    x += charWidth(ch) - 1;
  }
  // light, pressure and かすれ
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const [lr, lg, lb] = rgb(UI.accentLight);
  const [dr, dg, db] = rgb(UI.accentDark);
  for (let y = 0; y < h; y++)
    for (let xx = 0; xx < w; xx++) {
      const i = (y * w + xx) * 4;
      if (!d[i + 3]) continue;
      const n = hash2(xx, y, 17);
      if (n < 0.04) {
        d[i + 3] = 0;
        continue;
      }
      const u = (xx - cx) / w + (y - cy) / h;
      const above = y > 0 && d[i - w * 4 + 3];
      const left = xx > 0 && d[i - 4 + 3];
      if ((!above || !left) && u < -0.1) {
        d[i] = lr;
        d[i + 1] = lg;
        d[i + 2] = lb;
      } else if (u > 0.28 && n > 0.45) {
        d[i] = dr;
        d[i + 1] = dg;
        d[i + 2] = db;
      }
    }
  ctx.putImageData(img, 0, 0);
  c = cv;
  sealCache.set(text, c);
  return c;
}

class ChapterDoor implements Widget {
  modal = true;
  done = false;
  t = 0;
  private landed = false;
  private written = 0;
  private penAcc = 0;
  private iconT = -1;
  private ink = new Particles();
  private readonly overlay = (g: Gfx) => this.paint(g);
  private readonly letters: string[];
  private readonly seal: HTMLCanvasElement;

  constructor(
    private readonly chapter: string,
    private readonly title: string,
  ) {
    this.letters = [...title];
    this.seal = chapterSeal(chapter);
    game.overlays.push(this.overlay);
  }

  /** When the whole thing ends (ms from the start). */
  private get endAt(): number {
    return WRITE_AT + this.letters.length * LETTER_MS + 250 + HOLD_MS + FADE_MS;
  }

  update(dt: number): void {
    this.t += dt;
    this.ink.update(dt);
    if (!this.landed && this.t >= STAMP_AT + PRESS_MS) {
      this.landed = true;
      sfx('se_stamp');
      game.shake(1, 67);
      this.ink.burst(SEAL.x, SEAL.y + 2, {
        count: 6,
        speed: [30, 90],
        life: [240, 480],
        colors: [UI.accent, UI.accentDark, UI.accentLight],
        gravity: 220,
        drag: 2.6,
        shape: 'sq',
        size: [1, 2],
      });
    }
    if (this.t >= WRITE_AT) {
      if (this.iconT < 0) {
        this.penAcc += dt;
        while (this.penAcc >= LETTER_MS && this.written < this.letters.length) {
          this.penAcc -= LETTER_MS;
          const ch = this.letters[this.written++];
          if (ch.trim()) sfx('se_pen_write', { vol: 0.8, pitch: 0.94 + hash2(this.written, 3, 5) * 0.12 });
        }
        // the last stroke finished and the pen lifted: the tomato is set down
        if (this.written >= this.letters.length && this.penAcc >= LETTER_MS + 150) this.iconT = 0;
      } else this.iconT += dt;
    }
    if (this.t >= this.endAt) this.finish();
  }

  private finish(): void {
    if (this.done) return;
    this.done = true;
    const i = game.overlays.indexOf(this.overlay);
    if (i >= 0) game.overlays.splice(i, 1);
    // the screen stays dark for what comes next
    game.fadeColor = BG;
    game.fadeAlpha = 1;
  }

  draw(): void {
    /* painted as an overlay (see constructor) */
  }

  private paint(g: Gfx): void {
    if (this.done) return;
    g.rect(0, 0, W, 216, BG);
    const fadeStart = this.endAt - FADE_MS;
    const a = this.t > fadeStart ? Math.max(0, 1 - (this.t - fadeStart) / FADE_MS) : 1;
    if (a <= 0) return;
    g.alpha(a, () => {
      this.drawSeal(g);
      this.ink.draw(g);
      this.drawTitle(g);
    });
  }

  private drawSeal(g: Gfx): void {
    const st = this.t - STAMP_AT;
    if (st < 0) return;
    const img = this.seal;
    if (st < PRESS_MS) {
      // the seal coming down: its shadow closes in, the seal shrinks to size
      const k = ease.quadIn(st / PRESS_MS);
      const s = 1.25 - 0.25 * k;
      const w = Math.round(img.width * s);
      const h = Math.round(img.height * s);
      g.alpha(0.5 + 0.5 * k, () => g.ctx.drawImage(img, Math.round(SEAL.x - w / 2), Math.round(SEAL.y - h / 2), w, h));
      return;
    }
    // just after it lands the ink soaks a little wider for a moment
    const lt = st - PRESS_MS;
    if (lt < 360) g.alpha(0.22 * (1 - lt / 360), () => g.img(img, SEAL.x - img.width / 2 - 1, SEAL.y - img.height / 2, { tint: UI.accentLight }));
    g.img(img, Math.round(SEAL.x - img.width / 2), Math.round(SEAL.y - img.height / 2));
  }

  /**
   * The title by hand: each letter is drawn in with a left-to-right stroke
   * over its 0.1 s (a bright pen tip at the edge), letters sit a pixel up or
   * down, and every stroke is doubled a pixel right like the notebook's
   * handwriting.
   */
  private drawTitle(g: Gfx): void {
    if (this.t < WRITE_AT) return;
    const tw = textW(this.title);
    let x = Math.round(W / 2 - tw / 2);
    const bob = [0, 1, 0, -1, 0, 1, -1, 0, 1, 0];
    const cur = this.written;
    const k = Math.min(1, this.penAcc / LETTER_MS);
    this.letters.forEach((ch, i) => {
      const cw = charWidth(ch);
      if (i >= cur) {
        x += cw;
        return;
      }
      const y = TITLE_Y + bob[i % bob.length];
      const fresh = i === cur - 1 && k < 1;
      const reveal = fresh ? Math.max(1, Math.round(cw * ease.quadOut(k))) : cw + 1;
      g.clip(x, y - 2, reveal, 20, () => {
        g.text(ch, x, y, { color: INK });
        g.text(ch, x + 1, y, { color: INK, alpha: 0.55 });
      });
      if (fresh && k < 1 && ch.trim()) {
        const px = x + reveal;
        g.px(px, y + 8 + Math.round(Math.sin(this.t / 30) * 3), '#FFFFFF');
      }
      x += cw;
    });
    // the tomato, set down after the last letter, with one ring of light
    if (this.iconT >= 0) {
      const icon = tomatoIcon('ready');
      const ix = Math.round(W / 2 + tw / 2 + 6);
      const iy = TITLE_Y + 3;
      const pk = Math.min(1, this.iconT / 70);
      const s = 1.3 - 0.3 * ease.backOut(pk);
      const w = Math.round(12 * s);
      g.ctx.drawImage(icon, ix + 6 - Math.round(w / 2), iy + 6 - Math.round(w / 2), w, w);
      const rk = this.iconT / 300;
      if (rk < 1) g.alpha(1 - rk, () => g.ring(ix + 6, iy + 6, 7 + Math.round(ease.cubicOut(rk) * 9), '#FFE7A3'));
    }
  }
}

/**
 * Stamp the chapter's door and wait until it has faded (about 4.5 s).
 * Default: 「第2章」『星見台の トマト』.
 */
export function* playChapterDoor(o: { chapter?: string; title?: string } = {}): Co {
  const d = new ChapterDoor(o.chapter ?? '第2章', o.title ?? '星見台の トマト');
  game.ui.push(d);
  yield () => d.done;
}
