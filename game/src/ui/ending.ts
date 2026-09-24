// UI pieces of evt_ending (10_narrative 5.20, 00_concept 13, 30_level_art 8.6):
//
//   yield* playNightSkyCut();      // cut 6: the title's panorama at night,
//                                  // one star over 星見台 stops twinkling
//   yield* playEndingNotebook();   // cut 7: the 自由研究 notebook — the title
//                                  // is written in by hand, the hanko case
//                                  // opens (5 of 10, おやすみなさい faintly),
//                                  // 「つづく」 is stamped → flag_clear → title

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { BAYER4, makeCanvas } from '../engine/pixel';
import { Particles } from '../engine/particles';
import { hash2 } from '../engine/rng';
import { H, W } from '../engine/screen';
import { ease } from '../engine/tween';
import { charWidth } from '../engine/font';
import { state } from '../game/state';
import { sfx } from '../audio';
import { petalSprites } from '../battle/art/stamps';
import { caseBody, caseLid, CASE_H, CASE_W, drawCase } from './hankocase';
import { markClear, toTitle } from './flow';
import {
  cloudCanvas,
  CLOUDS,
  drawGrass,
  drawMallSign,
  drawWater,
  drawWires,
  farCanvas,
  midCanvas,
  nearCanvas,
  skyCanvas,
} from './title_art';
import { ctxText, rectA, textW, UI } from './window';
import { ditherIn, ditherOut } from './transition';

// ---- cut_night_sky -------------------------------------------------------------------------

class NightSkyScene implements Scene {
  transparent = true;
  done = false;
  t = 0;
  alpha = 0;
  frozenAt = -1;

  update(dt: number): void {
    this.t += dt;
  }

  draw(g: Gfx): void {
    const t = this.t;
    g.alpha(this.alpha, () => {
      g.img(skyCanvas('night'), 0, 0);
      // twinkling stars
      for (let i = 0; i < 26; i++) {
        const x = Math.floor(hash2(i, 5, 31) * 384);
        const y = Math.floor(hash2(i, 6, 31) * 110);
        const ph = (t / (600 + (i % 5) * 170) + hash2(i, 7, 31) * 6) % 3;
        const col = ph < 1 ? '#FFF6D8' : ph < 2 ? '#C8B8E0' : '#6A5A8E';
        g.px(x, y, col);
        if (ph < 0.4 && i % 4 === 0) {
          g.px(x - 1, y, '#8A7AB0');
          g.px(x + 1, y, '#8A7AB0');
        }
      }
      CLOUDS.forEach((c, i) => g.img(cloudCanvas(i, 'night'), c.x + Math.round(t / 900), c.y));
      g.img(farCanvas('night'), 0, 104);
      // the one star over 星見台: twinkles like the others, then stops, lit
      const sx = 361;
      const sy = 90;
      if (this.frozenAt < 0) g.px(sx, sy, Math.floor(t / 420) % 3 === 0 ? '#6A5A8E' : '#FFF6D8');
      else {
        g.px(sx, sy, '#FFF6D8');
        g.px(sx - 1, sy, '#FFE7A3');
        g.px(sx + 1, sy, '#FFE7A3');
        g.px(sx, sy - 1, '#FFE7A3');
        g.px(sx, sy + 1, '#FFE7A3');
        if (t - this.frozenAt < 500) {
          const k = 1 - (t - this.frozenAt) / 500;
          g.alpha(k, () => g.ring(sx, sy, 2 + Math.round((1 - k) * 5), '#FFF6D8'));
        }
      }
      g.img(midCanvas('night'), 0, 110);
      // windows lit here and there (1–2 px, #F6D98A), and the street lamps
      for (let i = 0; i < 40; i++) {
        const x = Math.floor(hash2(i, 1, 44) * 384);
        const y = 150 + Math.floor(hash2(i, 2, 44) * 22);
        if (hash2(i, 3, 44) < 0.25) continue;
        g.rect(x, y, hash2(i, 4, 44) < 0.4 ? 2 : 1, 1, '#F6D98A');
      }
      // street lamps: a warm dithered pool round each lamp head
      for (const lx of [22, 118, 214, 298]) {
        for (let y = -9; y <= 9; y++)
          for (let x = -9; x <= 9; x++) {
            const d = Math.hypot(x, y * 1.2) / 9;
            if (d > 1) continue;
            const v = (1 - d) * 0.9;
            if (BAYER4[(y + 16) & 3][(x + 16) & 3] >= v * 16) continue;
            g.px(lx + x, 166 + y, d < 0.35 ? '#F6D98A' : d < 0.7 ? '#8A6A7A' : '#4A3A5E');
          }
        g.rect(lx, 167, 1, 12, '#221C3A');
        g.rect(lx - 1, 165, 3, 2, '#FFF6D8');
      }
      drawMallSign(g, false, 'night');
      drawWires(g, 0, 'night');
      drawWater(g, t, 'night', null);
      g.img(nearCanvas('night'), 0, 0);
      drawGrass(g, t, 0.6);
    });
  }
}

let night: NightSkyScene | null = null;

/**
 * Cut to the night panorama (0.8 s crossfade), let the stars twinkle, then
 * the one over 星見台 stops (se_star) and stays lit. Stays on screen until
 * the next cut (playEndingNotebook) or hideNightSky().
 */
export function* playNightSkyCut(o: { hold?: number } = {}): Co {
  night = new NightSkyScene();
  game.push(night);
  const n = night;
  for (let t = 0; t < 800; t += 16.7) {
    n.alpha = t / 800;
    yield null;
  }
  n.alpha = 1;
  yield 900;
  n.frozenAt = n.t;
  sfx('se_star');
  yield o.hold ?? 1500;
}

export function hideNightSky(): void {
  if (!night) return;
  const i = game.scenes.indexOf(night);
  if (i >= 0) game.scenes.splice(i, 1);
  night = null;
}

// ---- the 自由研究 notebook ----------------------------------------------------------------------

const COVER = { x: 20, y: 6, w: 344, h: 204 };
/** The title box on the cover (relative to the cover). */
const TBOX = { x: 70, y: 10, w: 236, h: 48 };
/** The hanko case, set down inside the cover (bottom at y198, 12px above the cover's edge). */
const CASE_AT = { x: 84, y: 94 };
/** 「つづく」: a big round seal to the right of the case. */
const SEAL = { x: 322, y: 146, size: 68 };
/** The seal comes down for this long before it lands (its shadow closes in). */
const PRESS_MS = 170;
const TITLE = '夕鳴町 みました帳 ①';

let coverC: HTMLCanvasElement | null = null;
function coverCanvas(): HTMLCanvasElement {
  if (coverC) return coverC;
  const { w, h } = COVER;
  const [c, ctx] = makeCanvas(w + 4, h + 4);
  const r = (x: number, y: number, ww: number, hh: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, ww, hh);
    ctx.globalAlpha = 1;
  };
  r(4, 4, w, h, '#000000', 0.45);
  // pale green-blue card cover with a navy binding tape on the left
  r(1, 0, w - 2, h, '#2A2440');
  r(0, 1, w, h - 2, '#2A2440');
  r(1, 1, w - 2, h - 2, '#DCEBE6');
  for (let y = 1; y < h - 1; y++)
    for (let x = 1; x < w - 1; x++) {
      const n = hash2(x, y, 13);
      if (n < 0.03) r(x, y, 1, 1, '#CFE0DA');
      else if (n > 0.99) r(x, y, 1, 1, '#EEF6F2');
    }
  r(1, 1, 22, h - 2, '#2F4A8A');
  r(22, 1, 1, h - 2, '#22386C');
  r(1, 1, 22, 1, '#4A6AB0');
  // the title box
  const { x: bx, y: by, w: bw, h: bh } = TBOX;
  r(bx - 1, by - 1, bw + 2, bh + 2, '#2F4A8A');
  r(bx, by, bw, bh, '#FBF7EC');
  r(bx + 2, by + 2, bw - 4, 1, '#2F4A8A');
  r(bx + 2, by + bh - 3, bw - 4, 1, '#2F4A8A');
  // name line under the title box
  r(bx + 60, by + bh + 22, bw - 60, 1, '#2F4A8A');
  coverC = c;
  return c;
}

let sealC: HTMLCanvasElement | null = null;
/**
 * The 「つづく」 seal: a solid vermilion disc with a ragged edge, a paper
 * ring inside, and the word cut out of the ink in bold (each letter doubled
 * 1px to the right) so it reads at a glance. A few specks where the ink
 * didn't take.
 */
function tsuzukuSeal(size: number): HTMLCanvasElement {
  if (sealC) return sealC;
  const [c, ctx] = makeCanvas(size, size, { willReadFrequently: true });
  const r = size / 2;
  const put = (x: number, y: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  for (let y = 0; y < size; y++)
    for (let x = 0; x < size; x++) {
      const dx = x + 0.5 - r;
      const dy = y + 0.5 - r;
      const a = Math.atan2(dy, dx);
      const edge = r - 0.6 - 1.1 * hash2(Math.round(a * 10), 0, 3);
      const d = Math.hypot(dx, dy);
      if (d > edge) continue;
      // lower right presses darker, upper left a touch lighter
      const shade = dx + dy > r * 0.9 ? UI.accentDark : dx + dy < -r * 1.1 ? UI.accentLight : UI.accent;
      put(x, y, d > edge - 1.2 ? UI.accentDark : shade);
      if (d <= edge - 4 && d > edge - 5.4) put(x, y, UI.bg);
    }
  // the word, cut out of the ink
  const word = 'つづく';
  const tw = textW(word);
  const tx = Math.round(size / 2 - tw / 2) - 1;
  const ty = Math.round(size / 2 - 9);
  // bold: each letter doubled a pixel down (keeps the dakuten apart)
  for (const oy of [0, 1]) ctxText(ctx, word, tx, ty + oy, UI.bg);
  // かすれ: a few specks of paper in the ink
  const img = ctx.getImageData(0, 0, size, size);
  for (let i = 0; i < size * 0.7; i++) {
    const x = Math.floor(hash2(i, 1, 77) * size);
    const y = Math.floor(hash2(i, 2, 77) * size);
    const o = (y * size + x) * 4;
    if (img.data[o + 3] && img.data[o] > 150 && img.data[o + 1] < 120) put(x, y, '#F2B4A8');
  }
  sealC = c;
  return c;
}

class NotebookScene implements Scene {
  transparent = false;
  done = false;
  t = 0;
  written = 0;
  caseT = -1;
  lidT = -1;
  stampT = -1;
  fade = 0;
  private penAcc = 0;
  private parts = new Particles();
  private petals = petalSprites();
  private seal = tsuzukuSeal(SEAL.size);
  private landed = false;

  update(dt: number): void {
    this.t += dt;
    this.parts.update(dt);
    if (this.t > 600 && this.written < [...TITLE].length) {
      this.penAcc += dt;
      while (this.penAcc >= 120 && this.written < [...TITLE].length) {
        this.penAcc -= 120;
        const ch = [...TITLE][this.written++];
        if (ch.trim()) sfx('se_pen_write');
      }
    }
    if (this.caseT >= 0) this.caseT += dt;
    if (this.lidT >= 0) this.lidT += dt;
    if (this.stampT >= 0) {
      this.stampT += dt;
      if (!this.landed && this.stampT >= PRESS_MS) this.land();
    }
  }

  /** The big 「つづく」 seal starts coming down; it lands PRESS_MS later. */
  stamp(): void {
    this.stampT = 0;
  }

  private land(): void {
    this.landed = true;
    sfx('se_stamp_heavy');
    game.hitstop(133);
    game.shake(3, 160);
    game.flash('#E23B2E', 90, 0.12);
    for (let i = 0; i < 14; i++)
      this.parts.burst(SEAL.x, SEAL.y, {
        count: 1,
        speed: [40, 120],
        life: [700, 1200],
        colors: ['#E23B2E'],
        gravity: 60,
        drag: 1.5,
        shape: 'img',
        img: this.petals[i % this.petals.length],
      });
  }

  draw(g: Gfx): void {
    // the desk at night, under the lamp
    g.clear('#1B1420');
    for (let y = 0; y < H; y += 3) g.rect(0, y, W, 1, y % 6 ? '#221A28' : '#1E1724');
    g.alpha(0.18, () => g.circle(192, 100, 150, '#FFE7A3'));
    const k = Math.min(1, this.t / 500);
    g.alpha(k, () => {
      g.img(coverCanvas(), COVER.x, COVER.y + Math.round((1 - ease.cubicOut(k)) * 8));
      const bx = COVER.x + TBOX.x;
      const by = COVER.y + TBOX.y;
      // 「じゆうけんきゅう」 printed small, the name in pencil
      g.text('じゆうけんきゅう', bx + 8, by + 5, { color: '#2F4A8A' });
      g.text('5年 2組', bx, by + TBOX.h + 6, { color: '#2F4A8A' });
      g.text('潮見 ミナト', bx + 70, by + TBOX.h + 5, { color: UI.pencil });
      // the title, written in by hand (0.12 s a letter)
      const chars = [...TITLE];
      const tw = textW(TITLE);
      let x = Math.round(bx + TBOX.w / 2 - tw / 2);
      const y = by + 25;
      chars.slice(0, this.written).forEach((ch, i) => {
        const dy = [0, 1, 0, 0, -1, 0, 1, 0, 0, 1, 0][i % 11];
        g.text(ch, x, y + dy, { color: UI.pencil });
        g.text(ch, x + 1, y + dy, { color: UI.pencil });
        x += charWidth(ch) + 1;
      });
    });
    // the hanko case is set down on the notebook and opens
    if (this.caseT >= 0) {
      const ck = Math.min(1, this.caseT / 200);
      const cx = CASE_AT.x;
      const cy = CASE_AT.y + Math.round((1 - ease.backOut(ck)) * 60);
      if (this.lidT < 0 || this.lidT < 34) {
        rectA(g, cx + 4, cy + 4, CASE_W, CASE_H, '#0B0B14', 0.5);
        g.img(caseLid(), cx, cy);
      } else {
        const owned = (id: string) => (state.party[0]?.skills.includes(id) ?? false) || ['skill_mimashita', 'skill_peke', 'skill_hanamaru', 'skill_yarinaoshi', 'skill_okaerinasai'].includes(id);
        drawCase(g, cx, cy, { owned, clear: true, t: this.t, appear: () => Math.min(1, (this.lidT - 34) / 200) });
        // the lid, lifted away behind
        const lk = Math.min(1, (this.lidT - 34) / 160);
        if (lk < 1) g.alpha(1 - lk, () => g.img(caseLid(), cx, cy - Math.round(lk * 30)));
      }
      void caseBody;
    }
    // 「つづく」: the hanko's shadow closes in, then the seal lands (1.25 → 1.0
    // in 5 frames), the ink spreads a moment, petals fly
    if (this.stampT >= 0) {
      const t = this.stampT;
      if (t < PRESS_MS) {
        const k = ease.quadIn(t / PRESS_MS);
        const r = Math.round(SEAL.size * (0.95 - 0.4 * k) / 2);
        g.alpha(0.12 + 0.3 * k, () => g.circle(SEAL.x + 3 - Math.round(3 * k), SEAL.y + 4 - Math.round(4 * k), r, '#1B1420'));
      } else {
        const lt = t - PRESS_MS;
        const s = lt < 85 ? 1.25 - 0.25 * ease.quadOut(lt / 85) : 1;
        const w = Math.round(this.seal.width * s);
        // a soft ring of ink soaking into the cover right after it lands
        if (lt < 500) g.alpha(0.3 * (1 - lt / 500), () => g.circle(SEAL.x, SEAL.y, Math.round(SEAL.size / 2 + 2 + lt / 60), '#E8A49C'));
        g.ctx.drawImage(this.seal, Math.round(SEAL.x - w / 2), Math.round(SEAL.y - w / 2), w, w);
      }
    }
    this.parts.draw(g);
    if (this.fade > 0) g.rect(0, 0, W, H, UI.darkest, this.fade);
  }
}

/**
 * Cut 7 of evt_ending, through to the title: the notebook cover, the title
 * written in, the hanko case, 「つづく」, flag_clear and the title screen
 * (with the みました帳 counts).
 */
export function* playEndingNotebook(o: { toTitle?: boolean } = {}): Co {
  const sc = new NotebookScene();
  // crossfade from whatever is on screen
  game.fadeColor = '#0B0B14';
  if (game.fadeAlpha < 1) yield* game.fadeOut(400, '#0B0B14');
  hideNightSky();
  game.push(sc);
  yield* game.fadeIn(500);
  yield () => sc.written >= [...TITLE].length;
  yield 500;
  sc.caseT = 0;
  sfx('se_paper_bag', { vol: 0.6 });
  yield 400;
  sc.lidT = 0;
  sfx('se_paper_open', { pitch: 0.7 });
  yield 1300;
  sc.stamp();
  yield 2000;
  for (let t = 0; t < 1500; t += 16.7) {
    sc.fade = t / 1500;
    yield null;
  }
  sc.fade = 1;
  markClear();
  if (o.toTitle !== false) {
    yield* ditherOut(1, '#0B0B14');
    const { TitleScene } = (yield import('./title')) as typeof import('./title');
    game.replaceAll(new TitleScene(true));
    yield* ditherIn(900);
  }
  void toTitle;
}
