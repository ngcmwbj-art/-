// World rendering (30_level_art.md 3.8 / 7.3 / 7.4 / 7.6):
//   ground chunks → water/sky reflections → flat decals → long shadows →
//   y-sorted structures, props and actors → foreground (canopies, wires) →
//   arcade light stripes → colour grading → emissive lights → emotes → HUD.

import { Gfx } from '../engine/gfx';
import { makeCanvas, rgba32 } from '../engine/pixel';
import { H, W } from '../engine/screen';
import { flag } from '../game/state';
import type { PropEnv } from '../art/props/types';
import { P } from '../art/tiles/palette';
import { drawWires, type WireOccluder, type WireSet } from '../art/props/wires';
import { drawWater, type Reflector, type WaterCtx } from '../art/tiles/water';
import { drawGroundLife } from '../art/tiles/groundlife';
import { CHUNK } from './ground_cache';
import type { FieldScene, PropInst } from './field';
import { css, INDOOR_MUL, shadowDir } from './lighting';
import { cellAt, groundAt } from './maps';
import type { Actor } from './actor';
import { hud } from './hud';
import { fxDraw, fxUpdate } from './fx';
import * as snd from './audio';

interface Drawable {
  foot: number;
  x: number;
  draw(): void;
  /** What draw() put on screen last (for glow cut-outs and silhouettes). */
  img?: HTMLCanvasElement | null;
  ix?: number;
  iy?: number;
  alpha?: number;
  /** Characters never cast silhouettes over each other. */
  actor?: Actor;
  /** Emissive layer of this drawable (painted right after it, cut by what comes later). */
  glow?: () => void;
  gbox?: [number, number, number, number];
}

/** Per-character state of the silhouette pass (hidden parts drawn as #2A2440 α50%). */
interface Seer {
  a: Actor;
  img: HTMLCanvasElement;
  x: number;
  y: number;
  /** Occluder pixels drawn after the character, clipped to its frame. */
  mask: HTMLCanvasElement;
  mctx: CanvasRenderingContext2D;
  used: boolean;
  drawn: boolean;
}

export class Renderer {
  private wc: HTMLCanvasElement;
  private wctx: CanvasRenderingContext2D;
  readonly wg: Gfx;
  private sc: HTMLCanvasElement;
  private sctx: CanvasRenderingContext2D;
  private tc: HTMLCanvasElement;
  private tctx: CanvasRenderingContext2D;
  private gc: HTMLCanvasElement;
  private gctx: CanvasRenderingContext2D;
  private glintPat: CanvasPattern | null = null;
  ambient: string[] = [];
  private ambT = 0;
  private waterMasks = new Map<number, HTMLCanvasElement | null>();
  private stripeLight: HTMLCanvasElement;
  private stripeShade: HTMLCanvasElement;
  private stripeLight2: HTMLCanvasElement;
  private stripeShade2: HTMLCanvasElement;
  wires: WireSet | null = null;
  /** Canopy fade per prop instance. */
  private fade = new WeakMap<object, number>();
  /** X-ray hole opening (0..1) per prop instance, and whether it is open (hysteresis). */
  private hole = new WeakMap<object, number>();
  private holeOn = new WeakMap<object, boolean>();
  private holeAt = new WeakMap<object, [number, number][]>();
  /** Emissive buffer: glows painted in depth order, cut by what stands in front. */
  private ec: HTMLCanvasElement;
  private ectx: CanvasRenderingContext2D;
  private eg: Gfx;
  private glowBox: [number, number, number, number] | null = null;
  /** Light map (grade multiply colour + additive lights). */
  private lc: HTMLCanvasElement;
  private lctx: CanvasRenderingContext2D;
  private lg: Gfx;
  /** Scratch canvas for props drawn with an x-ray hole. */
  private xc: HTMLCanvasElement;
  private xctx: CanvasRenderingContext2D;
  private xg: Gfx;
  private seerMasks: [HTMLCanvasElement, CanvasRenderingContext2D][] = [];

  constructor(private f: FieldScene) {
    [this.wc, this.wctx] = makeCanvas(W, H);
    this.wg = new Gfx(this.wctx, W, H);
    [this.sc, this.sctx] = makeCanvas(W, H);
    [this.tc, this.tctx] = makeCanvas(CHUNK, CHUNK);
    [this.gc, this.gctx] = makeCanvas(CHUNK, CHUNK);
    this.sctx.imageSmoothingEnabled = false;
    [this.stripeLight, this.stripeShade] = makeStripes(false);
    [this.stripeLight2, this.stripeShade2] = makeStripes(true);
    [this.ec, this.ectx] = makeCanvas(W, H);
    this.eg = new Gfx(this.ectx, W, H);
    [this.lc, this.lctx] = makeCanvas(W, H);
    this.lg = new Gfx(this.lctx, W, H);
    this.xc = document.createElement('canvas');
    this.xc.width = 64;
    this.xc.height = 96;
    // read back every frame while a character is behind an x-ray prop
    this.xctx = this.xc.getContext('2d', { willReadFrequently: true })!;
    this.xctx.imageSmoothingEnabled = false;
    this.xg = new Gfx(this.xctx, 64, 96);
    for (let i = 0; i < 2; i++) this.seerMasks.push(makeCanvas(48, 64));
  }

  /** Does this map have props that cast light (so an indoor night can be dark round them)? */
  private mapLit = false;

  private clipPath: Path2D | null = null;

  /** World-space path of every cell that is not void (indoor light clip). */
  private roomClip(): Path2D {
    if (this.clipPath) return this.clipPath;
    const m = this.f.map;
    const path = new Path2D();
    for (let ty = 0; ty < m.h; ty++)
      for (let tx = 0; tx < m.w; tx++) {
        const c = cellAt(m, tx, ty);
        if (c.tag === 'void' || (c.ground === 'void' && !c.tag)) continue;
        path.rect(tx * 16, ty * 16, 16, 16);
      }
    this.clipPath = path;
    return path;
  }

  onMapChange(): void {
    this.clipPath = null;
    this.mapLit = this.f.props.some((p) => !!p.art.light);
    this.waterMasks.clear();
    this.wires = this.f.map.def.wires ? { lines: this.f.map.def.wires, map: this.f.map.id } : null;
  }

  update(dt: number): void {
    fxUpdate(this.f, dt);
    // positional ambience volumes (40_audio 4.2 ※2), every 10 frames
    this.ambT -= dt;
    if (this.ambT > 0) return;
    this.ambT = 160;
    const m = this.f.map;
    if (m.id !== 'map_town') return;
    const tx = this.f.player.x / 16;
    const ty = this.f.player.y / 16;
    const s = flag('flag_stage');
    const kawabe = ty < 28 ? 0 : Math.max(0, Math.min(1, 1 - (36 - ty) / 8));
    snd.setAmbientVol('amb_kawabe', kawabe, 0.3);
    const inArc = tx >= 23 && tx <= 56 && ty >= 22 && ty <= 26;
    const dArc = inArc ? 0 : Math.min(Math.abs(ty - 24) - 1, tx < 23 ? 23 - tx : tx > 56 ? tx - 56 : 99);
    snd.setAmbientVol('amb_arcade', s >= 2 ? 0 : inArc ? 1 : Math.max(0, 1 - dArc / 4), 0.3);
    const park = ty < 16 && tx < 32;
    const taigan = ty >= 36;
    snd.setAmbientVol('amb_wind', park || taigan ? 1 : 0, 0.3);
    const nearTree = Math.hypot(tx - 22, ty - 20) < 8 || (park && ty < 14);
    if (s === 0) snd.setAmbientVol('amb_higurashi', nearTree ? 1 : 0.5, 0.4);
    const cross = tx >= 55 && ty >= 18 && ty <= 28;
    snd.setAmbientVol('amb_train_far', cross ? 1 : 0, 0.5);
  }

  env(pi: PropInst | null): PropEnv {
    return this.f.propEnv(pi);
  }

  // ---------------------------------------------------------------- main

  draw(g: Gfx): void {
    const f = this.f;
    const wg = this.wg;
    const ctx = this.wctx;
    const cx = Math.round(f.camX);
    const cy = Math.round(f.camY);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    wg.clear(f.map.def.outside ?? P.night);

    // 1. ground
    f.ground.draw(wg, cx, cy, W, H);
    // 1b. fx_heat_haze: stage 0, the asphalt of the river road shimmers (1px, 3s period)
    if (f.map.id === 'map_town' && flag('flag_stage') === 0 && f.grade.toMall < 0.5) {
      const y0 = Math.max(0, 32 * 16 - cy);
      const y1 = Math.min(H, 35 * 16 - cy);
      // only over the road (x < 56): the track and its rails stay straight
      const hw = Math.max(0, Math.min(W, 56 * 16 - cx));
      for (let yy = y0; yy < y1 && hw > 1; yy++) {
        const dx = Math.round(Math.sin(((yy + cy) / 5 + f.t / 3000 * Math.PI * 2)) * 0.7);
        if (dx) ctx.drawImage(this.wc, 0, yy, hw - 1, 1, dx, yy, hw - 1, 1);
      }
    }
    // 2. water with the sky's reflection
    this.drawWaterLayer(cx, cy);
    // 2b. living ground (swaying weeds, flowers, ants)
    drawGroundLife(wg, f.map, f.ground.src, cx, cy, f.mt, f.grade);
    // 3. flat decals (their glows start the emissive buffer)
    const envCache = new Map<PropInst, PropEnv>();
    const envOf = (p: PropInst) => {
      let e = envCache.get(p);
      if (!e) {
        e = this.env(p);
        envCache.set(p, e);
      }
      return e;
    };
    const visible = (x: number, y: number, w: number, h: number) => x + w >= cx - 16 && y + h >= cy - 16 && x <= cx + W + 16 && y <= cy + H + 16;
    const ectx = this.ectx;
    ectx.globalAlpha = 1;
    ectx.globalCompositeOperation = 'source-over';
    ectx.clearRect(0, 0, W, H);
    this.glowBox = null;
    const paintGlow = (p: PropInst) => {
      const a = p.art;
      ectx.save();
      a.glow!(this.eg, p.x - cx, p.y - cy, envOf(p));
      ectx.restore();
      this.addGlowBox(p.x + a.ox - cx - 40, p.y + a.oy - cy - 40, a.w + 80, a.h + 80);
    };
    for (const p of f.props) {
      if (!p.present || !p.art.flat) continue;
      const a = p.art;
      if (!visible(p.x + a.ox, p.y + a.oy, a.w, a.h)) continue;
      const img = a.img(envOf(p));
      if (img) {
        wg.img(img, p.x + a.ox - cx, p.y + a.oy - cy);
        if (a.glass) this.drawGlass(a.glass, p.x + a.ox - cx, p.y + a.oy - cy, 0.7);
      }
      a.over?.(wg, p.x - cx, p.y - cy, envOf(p));
      if (a.glow && !a.glowFg) paintGlow(p);
    }
    fxDraw(f, wg, cx, cy, 'ground');

    // 4. shadows
    this.drawShadows(cx, cy, visible, envOf);

    // 5. y-sorted
    const list: Drawable[] = [];
    const ne = flag('flag_stage') === 2;
    for (const s of f.structures) {
      const x = s.tx * 16 + s.art.ox;
      const y = s.ty * 16 + s.art.oy;
      const simg = ne && s.art.ne ? s.art.ne : s.art.img;
      if (!visible(x, y, simg.width, simg.height)) continue;
      const d: Drawable = { foot: s.foot, x, img: simg, ix: x - cx, iy: y - cy, draw: () => wg.img(simg, x - cx, y - cy) };
      list.push(d);
    }
    // characters that tall props open an x-ray hole for, and that get silhouettes
    const seers: Actor[] = f.follower ? [f.player, f.follower] : [f.player];
    for (const p of f.props) {
      if (!p.present || p.art.flat) continue;
      const a = p.art;
      if (!visible(p.x + a.ox, p.y + a.oy, a.w, a.h)) continue;
      const d: Drawable = {
        foot: p.y + a.foot,
        x: p.x,
        draw: () => {
          const e = envOf(p);
          const img = a.img(e);
          const px = p.x + a.ox - cx;
          const py = p.y + a.oy - cy;
          // x-ray props with a character close behind: the image and its over()
          // parts (flags, lanterns) are composed first so the hole cuts them all
          if (img && xrayOf(a) !== undefined && this.seerNear(px - XM, py - XM, img.width + XM * 2, img.height + XM * 2, seers, cx, cy)) {
            const comp = this.composeProp(p, img, e, px - XM, py - XM, cx, cy);
            this.xrayHole(p, comp, px - XM, py - XM, seers, cx, cy);
            wg.img(comp, px - XM, py - XM);
            d.img = comp;
            d.ix = px - XM;
            d.iy = py - XM;
            return;
          }
          if (img) {
            wg.img(img, px, py);
            if (a.glass) this.drawGlass(a.glass, px, py);
          }
          a.over?.(wg, p.x - cx, p.y - cy, e);
          d.img = img;
          d.ix = px;
          d.iy = py;
        },
      };
      if (a.glow && !a.glowFg) {
        d.glow = () => paintGlow(p);
      }
      list.push(d);
    }
    const actors: Actor[] = [...f.actors, f.player];
    if (f.follower) actors.push(f.follower);
    for (const a of actors) {
      if (!a.visible) continue;
      if (!visible(a.x - 24, a.y - 48, 48, 56)) continue;
      const d: Drawable = {
        foot: a.y + Math.max(0, a.oy) + (a.kind === 'restored' ? -2 : 0),
        x: a.x,
        actor: a,
        draw: () => {
          a.draw(wg, cx, cy, f.t);
          if (a.drawFn) return;
          const img = a.frame();
          const [ix, iy] = a.drawPos(img);
          d.img = img;
          d.ix = ix - cx;
          d.iy = iy - cy;
          d.alpha = a.alpha;
        },
      };
      list.push(d);
    }
    list.sort((a, b) => a.foot - b.foot || a.x - b.x);
    // silhouettes: each seer collects the pixels of what is drawn in front of it
    const sil: Seer[] = [];
    for (let i = 0; i < seers.length; i++) {
      const s = seers[i];
      if (!s.visible || s.drawFn || !visible(s.x - 24, s.y - 48, 48, 56)) continue;
      const img = s.frame();
      const [ix, iy] = s.drawPos(img);
      const [mask, mctx] = this.seerMasks[i];
      if (mask.width < img.width || mask.height < img.height) {
        mask.width = Math.max(mask.width, img.width);
        mask.height = Math.max(mask.height, img.height);
      }
      mctx.globalCompositeOperation = 'source-over';
      mctx.clearRect(0, 0, mask.width, mask.height);
      sil.push({ a: s, img, x: ix - cx, y: iy - cy, mask, mctx, used: false, drawn: false });
    }
    for (const d of list) {
      d.draw();
      if (d.img) {
        const w = d.img.width;
        const h = d.img.height;
        const x = d.ix!;
        const y = d.iy!;
        // cut the glows behind this drawable
        const gb = this.glowBox;
        if (gb && x < gb[2] && y < gb[3] && x + w > gb[0] && y + h > gb[1]) {
          ectx.globalCompositeOperation = 'destination-out';
          ectx.globalAlpha = d.alpha ?? 1;
          ectx.drawImage(d.img, x, y);
          ectx.globalAlpha = 1;
          ectx.globalCompositeOperation = 'source-over';
        }
        // occluders of the seers already drawn
        if (!d.actor)
          for (const s of sil) {
            if (!s.drawn) continue;
            if (x >= s.x + s.img.width || y >= s.y + s.img.height || x + w <= s.x || y + h <= s.y) continue;
            s.mctx.globalAlpha = d.alpha ?? 1;
            s.mctx.drawImage(d.img, x - s.x, y - s.y);
            s.mctx.globalAlpha = 1;
            s.used = true;
          }
        else for (const s of sil) if (s.a === d.actor) s.drawn = true;
      }
      if (d.glow) d.glow();
    }
    fxDraw(f, wg, cx, cy, 'sorted');
    for (const s of sil) if (s.used) this.drawSilhouette(s);

    // 6. foreground
    for (const p of f.props) {
      if (!p.present || !p.art.fg) continue;
      for (const part of p.art.fg) {
        const img = part.img(envOf(p));
        if (!img) continue;
        const x = p.x + part.ox;
        const y = p.y + part.oy;
        if (!visible(x, y, img.width, img.height)) continue;
        let alpha = 1;
        if (part.fade) {
          const fr = part.fade;
          const px = f.player.x;
          const py = f.player.y - 8;
          const under = px >= p.x + fr.x && px < p.x + fr.x + fr.w && py >= p.y + fr.y && py < p.y + fr.y + fr.h;
          const cur = this.fade.get(part) ?? 1;
          const tgt = under ? fr.alpha : 1;
          const next = cur + Math.sign(tgt - cur) * Math.min(Math.abs(tgt - cur), 16.7 / 200);
          this.fade.set(part, next);
          alpha = next;
        }
        wg.img(img, x - cx, y - cy, alpha < 1 ? { alpha } : {});
        // canopies and overhead parts hide the glows behind them
        const gb = this.glowBox;
        if (gb && x - cx < gb[2] && y - cy < gb[3] && x - cx + img.width > gb[0] && y - cy + img.height > gb[1]) {
          ectx.globalCompositeOperation = 'destination-out';
          ectx.globalAlpha = alpha;
          ectx.drawImage(img, Math.round(x - cx), Math.round(y - cy));
          ectx.globalAlpha = 1;
          ectx.globalCompositeOperation = 'source-over';
        }
      }
    }
    // glows of foreground parts (lanterns under an overhead sign)
    for (const p of f.props) {
      if (!p.present || !p.art.glow || !p.art.glowFg) continue;
      const a = p.art;
      if (!visible(p.x + a.ox - 40, p.y + a.oy - 80, a.w + 80, a.h + 120)) continue;
      paintGlow(p);
    }
    if (this.wires) {
      // characters under a wire get that part of the wire faded (never hidden by it)
      const occ: WireOccluder[] = [];
      for (const a of actors) {
        if (!a.visible || a.kind === 'restored' || a.drawFn) continue;
        const img = a.frame();
        const [ix, iy] = a.drawPos(img);
        occ.push({ x: ix - cx - 1, y: iy - cy - 1, w: img.width + 2, h: img.height + 2, key: a });
      }
      drawWires(wg, this.wires, cx, cy, f.mt, flag('flag_stage'), f.t, occ);
    }
    fxDraw(f, wg, cx, cy, 'fg');

    // 7. arcade stripes
    if (f.map.id === 'map_town') this.drawArcadeStripes(cx, cy);

    // 8. grading × light map (lamp pools, window light, the TV...)
    this.grade(cx, cy, visible, envOf);

    // 9. emissive (lamps, lit glass, neon), already cut by whatever stands in
    // front; screen-blended, so light never darkens what is under it
    if (this.glowBox) {
      ctx.globalCompositeOperation = 'screen';
      ctx.drawImage(this.ec, 0, 0);
      ctx.globalCompositeOperation = 'source-over';
    }
    fxDraw(f, wg, cx, cy, 'glow');

    // 10. emotes
    for (const a of actors) a.drawEmote(wg, cx, cy);
    fxDraw(f, wg, cx, cy, 'top');

    if (f.showCollision) this.drawCollision(cx, cy);

    // present with the chime wave (row offsets), then HUD
    const amp = f.wave.amp;
    if (amp > 0.01) {
      const t = f.wave.t / 1000;
      for (let y = 0; y < H; y++) {
        const dx = Math.round(amp * Math.sin(2 * Math.PI * (y / 48 + t / 0.25)));
        g.ctx.drawImage(this.wc, 0, y, W, 1, dx, y, W, 1);
        if (dx > 0) g.ctx.drawImage(this.wc, 0, y, 1, 1, 0, y, dx, 1);
        else if (dx < 0) g.ctx.drawImage(this.wc, W - 1, y, 1, 1, W + dx, y, -dx, 1);
      }
    } else g.ctx.drawImage(this.wc, 0, 0);
    hud.draw(g, f);
  }

  private addGlowBox(x: number, y: number, w: number, h: number): void {
    const b = this.glowBox;
    if (!b) this.glowBox = [x, y, x + w, y + h];
    else {
      b[0] = Math.min(b[0], x);
      b[1] = Math.min(b[1], y);
      b[2] = Math.max(b[2], x + w);
      b[3] = Math.max(b[3], y + h);
    }
  }

  /** Is any seer's sprite inside this screen rect? */
  private seerNear(x: number, y: number, w: number, h: number, seers: Actor[], cx: number, cy: number): boolean {
    for (const s of seers) {
      if (!s.visible || s.drawFn) continue;
      const si = s.frame();
      const [ix, iy] = s.drawPos(si);
      if (ix - cx < x + w && iy - cy < y + h && ix - cx + si.width > x && iy - cy + si.height > y) return true;
    }
    return false;
  }

  /** The prop's image plus its over() parts in the scratch canvas (origin = image top-left − XM). */
  private composeProp(p: PropInst, img: HTMLCanvasElement, e: PropEnv, ox: number, oy: number, cx: number, cy: number): HTMLCanvasElement {
    const a = p.art;
    const w = img.width + XM * 2;
    const h = img.height + XM * 2;
    if (this.xc.width !== w || this.xc.height !== h) {
      this.xc.width = w;
      this.xc.height = h;
      this.xctx.imageSmoothingEnabled = false;
      this.xg = new Gfx(this.xctx, w, h);
    }
    const x = this.xctx;
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
    x.clearRect(0, 0, w, h);
    x.drawImage(img, XM, XM);
    if (a.over) {
      // over() gets its usual screen coordinates (hooks such as the curve
      // mirror remember them); the scratch canvas is translated to match
      x.save();
      x.translate(-ox, -oy);
      a.over(this.xg, p.x - cx, p.y - cy, e);
      x.restore();
    }
    return this.xc;
  }

  /**
   * X-ray (review round 2): when at least 30% of a seer's pixels are hidden
   * by the composed prop (and the seer stands behind it), open a see-through
   * hole round the character in 0.15s instead of fading the whole prop.
   * Punches into `comp` (the scratch canvas) in place.
   */
  private xrayHole(p: PropInst, comp: HTMLCanvasElement, px: number, py: number, seers: Actor[], cx: number, cy: number): void {
    const a = p.art;
    const foot = p.y + a.foot;
    const pm = liveMask(this.xctx, comp.width, comp.height);
    const holes: [number, number][] = [];
    let best = 0;
    for (const s of seers) {
      if (!s.visible || s.drawFn || s.y + Math.max(0, s.oy) > foot) continue;
      const si = s.frame();
      const [ix, iy] = s.drawPos(si);
      const sx = ix - cx;
      const sy = iy - cy;
      const x0 = Math.max(px, sx);
      const y0 = Math.max(py, sy);
      const x1 = Math.min(px + comp.width, sx + si.width);
      const y1 = Math.min(py + comp.height, sy + si.height);
      if (x1 <= x0 || y1 <= y0) continue;
      const sm = alphaMask(si);
      let hid = 0;
      for (let y = y0; y < y1; y++) {
        const pr = (y - py) * comp.width - px;
        const sr = (y - sy) * si.width - sx;
        for (let x = x0; x < x1; x++) if (pm[pr + x] && sm.m[sr + x]) hid++;
      }
      const frac = hid / Math.max(1, sm.n);
      best = Math.max(best, frac);
      if (frac > 0.12) holes.push([sx + si.width / 2 - px, sy + si.height / 2 + 1 - py]);
    }
    // hysteresis: open at 30%, close under 12%
    const on = this.holeOn.get(p) ?? false;
    const want = on ? best >= 0.12 : best >= 0.3;
    this.holeOn.set(p, want);
    const cur = this.hole.get(p) ?? 0;
    const next = Math.max(0, Math.min(1, cur + (want ? 1 : -1) * (16.7 / 150)));
    this.hole.set(p, next);
    if (next <= 0) return;
    // while closing after the seer has left, keep the last hole positions
    if (holes.length) this.holeAt.set(p, holes);
    const at = this.holeAt.get(p) ?? [];
    const x = this.xctx;
    x.globalCompositeOperation = 'destination-out';
    x.globalAlpha = 1 - (xrayOf(a) ?? 0);
    const rx = Math.max(1, Math.round(9 * next));
    const ry = Math.max(1, Math.round(13 * next));
    const hm = holeMask(rx, ry);
    for (const [hx, hy] of at) x.drawImage(hm, Math.round(hx - rx), Math.round(hy - ry));
    x.globalCompositeOperation = 'source-over';
    x.globalAlpha = 1;
  }

  /** The parts of a seer hidden by what was drawn in front of it, as a #2A2440 α50% silhouette. */
  private drawSilhouette(s: Seer): void {
    const m = s.mctx;
    const w = s.img.width;
    const h = s.img.height;
    m.globalAlpha = 1;
    m.globalCompositeOperation = 'destination-in';
    m.drawImage(s.img, 0, 0);
    m.globalCompositeOperation = 'source-in';
    m.fillStyle = P.ink;
    m.fillRect(0, 0, w, h);
    m.globalCompositeOperation = 'source-over';
    this.wctx.globalAlpha = 0.5 * (s.a.alpha ?? 1);
    this.wctx.drawImage(s.mask, 0, 0, w, h, s.x, s.y, w, h);
    this.wctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- water

  private waterMask(cxI: number, cyI: number): HTMLCanvasElement | null {
    const key = cyI * 1000 + cxI;
    if (this.waterMasks.has(key)) return this.waterMasks.get(key)!;
    const chunk = this.f.ground.chunk(cxI, cyI);
    const cctx = chunk.getContext('2d')!;
    const img = cctx.getImageData(0, 0, chunk.width, chunk.height);
    const d = new Uint32Array(img.data.buffer);
    const navy = rgba32(P.navy);
    let any = false;
    const [mc, mctx] = makeCanvas(chunk.width, chunk.height);
    const mi = mctx.createImageData(chunk.width, chunk.height);
    const md = new Uint32Array(mi.data.buffer);
    for (let i = 0; i < d.length; i++)
      if (d[i] === navy) {
        md[i] = 0xffffffff;
        any = true;
      }
    mctx.putImageData(mi, 0, 0);
    const r = any ? mc : null;
    this.waterMasks.set(key, r);
    return r;
  }

  /** Tall things standing on a bank right above water (their reflections show in it). */
  private reflectors(cx: number, cy: number): Reflector[] {
    const f = this.f;
    const out: Reflector[] = [];
    for (const p of f.props) {
      if (!p.present || p.art.flat) continue;
      const a = p.art;
      if (!a.shadow && !a.shadowFn && a.h < 20) continue;
      const foot = p.y + a.foot;
      const ftx = Math.floor((p.x + (a.contactX ?? 8)) / 16);
      const fty = Math.floor(foot / 16);
      if (groundAt(f.map, ftx, fty + 1) !== 'water') continue;
      if (p.x + a.ox + a.w < cx - 48 || p.x + a.ox > cx + W + 48 || foot > cy + H + 64 || foot < cy - 48) continue;
      const e = this.env(p);
      const parts: Reflector['parts'] = [];
      const img = (a.shadowImg ?? a.img)(e);
      if (img) parts.push({ img, x: p.x + a.ox, top: p.y + a.oy });
      for (const part of a.fg ?? []) {
        const pi = part.img(e);
        if (pi && pi.width > 4) parts.push({ img: pi, x: p.x + part.ox, top: p.y + part.oy });
      }
      if (!parts.length) continue;
      const id = p.obj.t === 'prop' ? p.obj.prop : p.obj.prop ?? p.obj.id;
      const lamp = id === 'prop_utility_pole' && (p.obj.opts?.lamp ?? true) !== false ? { h: 46, a: 1 } : undefined;
      out.push({ parts, cx: p.x, foot, lamp });
    }
    return out;
  }

  private drawWaterLayer(cx: number, cy: number): void {
    const f = this.f;
    let refl: Reflector[] | null = null;
    const x0 = Math.max(0, Math.floor(cx / CHUNK));
    const y0 = Math.max(0, Math.floor(cy / CHUNK));
    const x1 = Math.min(Math.ceil((f.map.w * 16) / CHUNK) - 1, Math.floor((cx + W) / CHUNK));
    const y1 = Math.min(Math.ceil((f.map.h * 16) / CHUNK) - 1, Math.floor((cy + H) / CHUNK));
    for (let ky = y0; ky <= y1; ky++)
      for (let kx = x0; kx <= x1; kx++) {
        const mask = this.waterMask(kx, ky);
        if (!mask) continue;
        const ox = kx * CHUNK;
        const oy = ky * CHUNK;
        // visible part of this chunk (local px)
        const vx = Math.max(0, cx - ox);
        const vy = Math.max(0, cy - oy);
        const vw = Math.min(mask.width, cx + W - ox) - vx;
        const vh = Math.min(mask.height, cy + H - oy) - vy;
        if (vw <= 0 || vh <= 0) continue;
        const t = this.tctx;
        t.globalCompositeOperation = 'source-over';
        t.clearRect(vx, vy, vw, vh);
        t.save();
        t.beginPath();
        t.rect(vx, vy, vw, vh);
        t.clip();
        const wctx: WaterCtx = {
          ctx: t,
          worldX: ox,
          worldY: oy,
          camX: cx,
          camY: cy,
          w: mask.width,
          h: mask.height,
          grade: f.grade,
          t: f.t,
          mt: f.mt,
          stage: flag('flag_stage'),
          map: f.map,
          vis: [vx, vy, vw, vh],
          reflect: (refl ??= this.reflectors(cx, cy)),
        };
        drawWater(wctx);
        t.globalCompositeOperation = 'destination-in';
        t.drawImage(mask, vx, vy, vw, vh, vx, vy, vw, vh);
        t.restore();
        t.globalCompositeOperation = 'source-over';
        this.wctx.drawImage(this.tc, vx, vy, vw, vh, ox + vx - cx, oy + vy - cy, vw, vh);
      }
  }

  /** Sky reflection on glass (windows, vending machines, mirrors). */
  drawGlass(mask: HTMLCanvasElement, x: number, y: number, alpha = 0.55): void {
    // only the part of the mask's bounding box that is on screen
    const bb = maskBox(mask);
    if (!bb) return;
    const bx0 = Math.max(bb[0], Math.ceil(-x));
    const by0 = Math.max(bb[1], Math.ceil(-y));
    const bx1 = Math.min(bb[2], Math.floor(W - x));
    const by1 = Math.min(bb[3], Math.floor(H - y));
    if (bx1 <= bx0 || by1 <= by0) return;
    const w = bx1 - bx0;
    const h = by1 - by0;
    x += bx0;
    y += by0;
    if (w > this.gc.width || h > this.gc.height) {
      this.gc.width = Math.max(this.gc.width, w);
      this.gc.height = Math.max(this.gc.height, h);
      this.gctx.imageSmoothingEnabled = false;
    }
    const t = this.gctx;
    t.globalCompositeOperation = 'source-over';
    t.clearRect(0, 0, w, h);
    const gr = t.createLinearGradient(0, -y, 0, H - y);
    const gd = this.f.grade;
    gr.addColorStop(0, css(gd.skyTop));
    gr.addColorStop(1, css(gd.skyBot));
    t.fillStyle = gr;
    t.fillRect(0, 0, w, h);
    // diagonal glints (cached 23px pattern)
    if (!this.glintPat) {
      const [pc2, pctx] = makeCanvas(23, 23);
      pctx.fillStyle = 'rgba(255,246,216,0.55)';
      for (let j = 0; j < 23; j++) pctx.fillRect(j, j, 2, 1);
      pctx.fillRect(0, 22, 1, 1);
      this.glintPat = t.createPattern(pc2, 'repeat');
    }
    if (this.glintPat) {
      this.glintPat.setTransform(new DOMMatrix([1, 0, 0, 1, -bx0, -by0]));
      t.fillStyle = this.glintPat;
      t.fillRect(0, 0, w, h);
    }
    t.globalCompositeOperation = 'destination-in';
    t.drawImage(mask, bx0, by0, w, h, 0, 0, w, h);
    t.globalCompositeOperation = 'source-over';
    this.wctx.globalAlpha = alpha;
    this.wctx.drawImage(this.gc, 0, 0, w, h, Math.round(x), Math.round(y), w, h);
    this.wctx.globalAlpha = 1;
  }

  // ---------------------------------------------------------------- shadows

  private drawShadows(
    cx: number,
    cy: number,
    visible: (x: number, y: number, w: number, h: number) => boolean,
    envOf: (p: PropInst) => PropEnv,
  ): void {
    const f = this.f;
    const gd = f.grade;
    const s = this.sctx;
    const L = gd.shadowLen;
    s.setTransform(1, 0, 0, 1, 0, 0);
    s.globalCompositeOperation = 'source-over';
    s.clearRect(0, 0, W, H);
    s.fillStyle = '#000';
    const indoor = f.map.def.kind === 'indoor';
    const cast = (img: HTMLCanvasElement, footX: number, footY: number, imgX: number, imgY: number, hgt: number, tx: number, ty: number) => {
      if (L <= 0.01 || indoor) return;
      const [dx, dy] = shadowDir(gd, tx, ty);
      const bx = footX - cx;
      const by = footY - cy;
      const rows = Math.max(0, Math.min(img.height, footY - imgY));
      if (rows <= 0) return;
      const sil = silhouetteOf(img);
      s.setTransform(1, 0, -L * dx, -L * dy, bx, by);
      const top = Math.max(0, rows - hgt);
      s.drawImage(sil, 0, top, img.width, rows - top, imgX - footX, imgY + top - footY, img.width, rows - top);
      s.setTransform(1, 0, 0, 1, 0, 0);
    };
    // actors
    const acts: Actor[] = [...f.actors, f.player];
    if (f.follower) acts.push(f.follower);
    for (const a of acts) {
      if (!a.visible || a.shadowH === 0) continue;
      if (!visible(a.x - 64, a.y - 64, 128, 96)) continue;
      const img = (a.data.shadowFrame as HTMLCanvasElement | undefined) ?? a.frame();
      const [ix, iy] = a.drawPos(img);
      const footY = Math.round(a.y + a.oy);
      const footX = Math.round(a.x + a.ox);
      if (a.id === 'npc_shadow_man') continue;
      cast(img, footX, footY - (a.hopOffset() < 0 ? 0 : 0), ix, iy - a.hopOffset(), a.shadowH ?? img.height, a.x / 16, a.y / 16);
    }
    // props
    for (const p of f.props) {
      if (!p.present) continue;
      const a = p.art;
      if (!a.shadow && !a.shadowFn) continue;
      if (!visible(p.x + a.ox - 96, p.y + a.oy - 32, a.w + 192, a.h + 64)) continue;
      const e = envOf(p);
      if (indoor) continue;
      if (a.shadowFn) {
        const [dx, dy] = shadowDir(gd, p.x / 16, p.y / 16);
        a.shadowFn(s, p.x - cx, p.y - cy, [dx, dy], L, e);
        s.setTransform(1, 0, 0, 1, 0, 0);
        continue;
      }
      const img = (a.shadowImg ?? a.img)(e);
      if (!img) continue;
      const footX = p.x + (a.contactX ?? a.ox + a.w / 2);
      cast(img, footX, p.y + a.foot, p.x + a.ox, p.y + a.oy, a.shadow ?? img.height, p.x / 16, p.y / 16);
    }
    // structures
    for (const st of f.structures) {
      if (!st.art.shadow) continue;
      const x = st.tx * 16 + st.art.ox;
      const y = st.ty * 16 + st.art.oy;
      if (!visible(x - 64, y, 16 + 128, st.art.img.height + 32)) continue;
      cast(st.art.img, st.tx * 16 + 8, st.foot, x, y, st.art.shadow, st.tx, st.ty);
    }
    // shadows falling on water keep only 20% (7.4; the canal shows reflections, not blobs)
    this.eraseOnWater(s, cx, cy, 0.8);
    // colourise and composite
    s.globalCompositeOperation = 'source-in';
    s.fillStyle = css(gd.shadow);
    s.fillRect(0, 0, W, H);
    s.globalCompositeOperation = 'source-over';
    this.wctx.globalAlpha = gd.shadowA;
    this.wctx.drawImage(this.sc, 0, 0);
    this.wctx.globalAlpha = 1;
    // contact shadows (all stages)
    this.wctx.fillStyle = 'rgba(42,36,64,0.4)';
    for (const a of acts) {
      if (!a.visible || a.id === 'npc_shadow_man' || a.kind === 'restored') continue;
      if (!visible(a.x - 16, a.y - 8, 32, 16)) continue;
      const w = Math.max(6, Math.round((a.sprite.shadow ?? a.sprite.w * 0.7) * (a.hopDur > 0 ? 0.8 : 1)));
      ellipse(this.wctx, Math.round(a.x + a.ox - cx), Math.round(a.y + a.oy - cy) - 1, w, 4);
    }
    for (const p of f.props) {
      if (!p.present || !p.art.contact) continue;
      const x = p.x + (p.art.contactX ?? p.art.ox + p.art.w / 2);
      const y = p.y + p.art.foot;
      if (!visible(x - 20, y - 4, 40, 8)) continue;
      ellipse(this.wctx, x - cx, y - cy - 1, p.art.contact, 4);
    }
  }

  /** Remove `amount` of whatever is in ctx over the water pixels on screen. */
  private eraseOnWater(ctx: CanvasRenderingContext2D, cx: number, cy: number, amount: number): void {
    const f = this.f;
    const x0 = Math.max(0, Math.floor(cx / CHUNK));
    const y0 = Math.max(0, Math.floor(cy / CHUNK));
    const x1 = Math.min(Math.ceil((f.map.w * 16) / CHUNK) - 1, Math.floor((cx + W) / CHUNK));
    const y1 = Math.min(Math.ceil((f.map.h * 16) / CHUNK) - 1, Math.floor((cy + H) / CHUNK));
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'destination-out';
    ctx.globalAlpha = amount;
    for (let ky = y0; ky <= y1; ky++)
      for (let kx = x0; kx <= x1; kx++) {
        const mask = this.waterMask(kx, ky);
        if (mask) ctx.drawImage(mask, kx * CHUNK - cx, ky * CHUNK - cy);
      }
    ctx.restore();
  }

  // ---------------------------------------------------------------- arcade stripes (fx_arcade_stripes)

  private drawArcadeStripes(cx: number, cy: number): void {
    const gd = this.f.grade;
    const st = flag('flag_stage');
    if (st >= 3) return;
    const ctx = this.wctx;
    // floor y22–25 and facade lower half y20–21, x23–55
    const x = 23 * 16 - cx;
    const y = 20 * 16 + 8 - cy;
    const w = 33 * 16;
    const h = 6 * 16 - 8;
    if (x > W || y > H || x + w < 0 || y + h < 0) return;
    const flow = Math.floor(this.f.mt / 3000);
    const flip = gd.toMall > 0.5;
    const a = flip ? 0.5 : 1;
    const lightImg = flip ? this.stripeLight2 : this.stripeLight;
    const shadeImg = flip ? this.stripeShade2 : this.stripeShade;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    const offX = ((((flow - cx) % 24) + 24) % 24) - 24;
    const offY = (((-cy % 12) + 12) % 12) - 12;
    ctx.globalAlpha = 0.18 * a * (1 - gd.night);
    ctx.globalCompositeOperation = 'screen';
    for (let yy = offY; yy < H; yy += 12) for (let xx = offX; xx < W; xx += 24) ctx.drawImage(lightImg, xx, yy);
    ctx.globalAlpha = 0.14 * a * (1 - gd.night);
    ctx.globalCompositeOperation = 'multiply';
    for (let yy = offY; yy < H; yy += 12) for (let xx = offX; xx < W; xx += 24) ctx.drawImage(shadeImg, xx, yy);
    // fx_arcade_roof: faint corrugated-roof lines scrolling at 1.1× the camera, beams every 12 tiles
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = P.white;
    const par = Math.round(cx * 0.1);
    for (let xx = ((x - par) % 4 + 4) % 4; xx < W; xx += 4) ctx.fillRect(xx, y, 1, h);
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = P.asphalt;
    for (let k = 0; k <= 3; k++) {
      const bx = Math.round(23 * 16 + k * 12 * 16 - cx * 1.1);
      ctx.fillRect(bx, y, 1, h);
    }
    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  // ---------------------------------------------------------------- grading (7.3)

  private grade(
    cx: number,
    cy: number,
    visible: (x: number, y: number, w: number, h: number) => boolean,
    envOf: (p: PropInst) => PropEnv,
  ): void {
    const f = this.f;
    const gd = f.grade;
    const ctx = this.wctx;
    const indoor = f.map.def.kind === 'indoor';
    const st = flag('flag_stage');
    // the light map: the grade's multiply colour plus every light that is on
    // (additive), so lamp pools brighten the ground and whoever stands in them
    const lx = this.lctx;
    lx.globalAlpha = 1;
    lx.globalCompositeOperation = 'source-over';
    lx.fillStyle = indoor ? css(indoorMul(st, gd.night, this.mapLit)) : css(gd.mul);
    lx.fillRect(0, 0, W, H);
    lx.globalCompositeOperation = 'lighter';
    lx.save();
    if (indoor) {
      // indoor lights stay inside the house: clipped to the room's cells (the
      // void round and between the rooms stays dark)
      lx.translate(-cx, -cy);
      lx.clip(this.roomClip());
      lx.setTransform(1, 0, 0, 1, 0, 0);
    }
    for (const p of f.props) {
      const a = p.art;
      if (!p.present || !a.light) continue;
      if (!visible(p.x + a.ox - 72, p.y + a.oy - 72, a.w + 144, a.h + 144)) continue;
      lx.save();
      a.light(this.lg, p.x - cx, p.y - cy, envOf(p));
      lx.restore();
    }
    lx.restore();
    lx.globalCompositeOperation = 'source-over';
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.drawImage(this.lc, 0, 0);
    // left sunset bleed
    ctx.globalCompositeOperation = 'screen';
    const ga = indoor ? 0.12 * (1 - gd.night) : gd.glareA;
    if (ga > 0.001) {
      const lg = ctx.createLinearGradient(0, 0, W * 0.45, 0);
      const col = indoor ? [247, 194, 122] as [number, number, number] : gd.glare;
      lg.addColorStop(0, css(col, ga));
      lg.addColorStop(1, css(col, 0));
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, W * 0.45, H);
    }
    // stage-0 slanted sunbeams (fx_sun_glare)
    if (!indoor && gd.motion > 0.5 && gd.toMall < 0.5 && gd.night < 0.5 && st === 0) {
      ctx.fillStyle = css(gd.glare, 0.05);
      for (let i = 0; i < 3; i++) {
        const sway = Math.sin(f.t / 2600 + i * 1.7) * 6;
        const bx = 30 + i * 70 + sway;
        ctx.beginPath();
        ctx.moveTo(bx, 0);
        ctx.lineTo(bx + 26 + i * 6, 0);
        ctx.lineTo(bx + 26 + i * 6 + 150, H);
        ctx.lineTo(bx + 150, H);
        ctx.closePath();
        ctx.fill();
      }
    }
    // top darkness
    ctx.globalCompositeOperation = 'source-over';
    const ta = indoor ? 0.1 : gd.topA;
    if (ta > 0.001) {
      const tg = ctx.createLinearGradient(0, 0, 0, H * 0.35);
      tg.addColorStop(0, css(gd.topDark, ta));
      tg.addColorStop(1, css(gd.topDark, 0));
      ctx.fillStyle = tg;
      ctx.fillRect(0, 0, W, H * 0.35);
    }
    ctx.restore();
  }

  // ---------------------------------------------------------------- debug

  private drawCollision(cx: number, cy: number): void {
    const f = this.f;
    const ctx = this.wctx;
    ctx.fillStyle = 'rgba(226,59,46,0.35)';
    for (let ty = Math.floor(cy / 16); ty <= Math.floor((cy + H) / 16); ty++)
      for (let tx = Math.floor(cx / 16); tx <= Math.floor((cx + W) / 16); tx++)
        if (f.isSolidTile(tx, ty)) ctx.fillRect(tx * 16 - cx, ty * 16 - cy, 16, 16);
    ctx.fillStyle = 'rgba(92,225,255,0.5)';
    for (const a of [...f.actors, f.player]) ctx.fillRect(Math.round(a.x - a.bw / 2 - cx), Math.round(a.y - a.bh - cy), a.bw, a.bh);
    ctx.strokeStyle = 'rgba(255,210,63,0.9)';
    for (const o of f.map.objects) {
      if (o.t === 'trig') ctx.strokeRect(o.x * 16 - cx + 0.5, o.y * 16 - cy + 0.5, o.w * 16 - 1, o.h * 16 - 1);
      if (o.t === 'door') {
        ctx.strokeStyle = 'rgba(95,168,90,0.9)';
        ctx.strokeRect(o.x * 16 - cx + 0.5, o.y * 16 - cy + 0.5, 15, 15);
        ctx.strokeStyle = 'rgba(255,210,63,0.9)';
      }
    }
    void cellAt;
  }
}

function ellipse(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, h: number): void {
  const rx = w / 2;
  const ry = h / 2;
  for (let y = -Math.floor(ry); y < Math.ceil(ry); y++) {
    const yy = (y + 0.5) / ry;
    const half = Math.round(rx * Math.sqrt(Math.max(0, 1 - yy * yy)));
    ctx.fillRect(cx - half, cy + y, half * 2, 1);
  }
}

const boxCache = new WeakMap<HTMLCanvasElement, [number, number, number, number] | null>();
/** Bounding box [x0,y0,x1,y1) of the opaque pixels of a mask (cached). */
function maskBox(mask: HTMLCanvasElement): [number, number, number, number] | null {
  if (boxCache.has(mask)) return boxCache.get(mask)!;
  const ctx = mask.getContext('2d')!;
  const d = ctx.getImageData(0, 0, mask.width, mask.height).data;
  let x0 = mask.width;
  let y0 = mask.height;
  let x1 = 0;
  let y1 = 0;
  for (let y = 0; y < mask.height; y++)
    for (let x = 0; x < mask.width; x++)
      if (d[(y * mask.width + x) * 4 + 3]) {
        if (x < x0) x0 = x;
        if (y < y0) y0 = y;
        if (x + 1 > x1) x1 = x + 1;
        if (y + 1 > y1) y1 = y + 1;
      }
  const r: [number, number, number, number] | null = x1 > x0 ? [x0, y0, x1, y1] : null;
  boxCache.set(mask, r);
  return r;
}

const silCache = new WeakMap<HTMLCanvasElement, HTMLCanvasElement>();
function silhouetteOf(img: HTMLCanvasElement): HTMLCanvasElement {
  let s = silCache.get(img);
  if (!s) {
    const [c, ctx] = makeCanvas(img.width, img.height);
    ctx.drawImage(img, 0, 0);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, img.width, img.height);
    s = c;
    silCache.set(img, s);
  }
  return s;
}

/** Stripe pattern tiles (24×12, slope 2:1) for the arcade light. */
function makeStripes(flip: boolean): [HTMLCanvasElement, HTMLCanvasElement] {
  const [lc, lctx] = makeCanvas(24, 12);
  const [sc, sctx] = makeCanvas(24, 12);
  lctx.fillStyle = P.horizon;
  sctx.fillStyle = P.shade;
  for (let y = 0; y < 12; y++)
    for (let x = 0; x < 24; x++) {
      const u = (((flip ? x + y * 2 : x - y * 2) % 24) + 24) % 24;
      if (u < 10) {
        // light band with 2px dithered edges
        if ((u === 0 || u === 9) && (x + y) % 2) continue;
        lctx.fillRect(x, y, 1, 1);
      } else {
        if ((u === 10 || u === 23) && (x + y) % 2) continue;
        sctx.fillRect(x, y, 1, 1);
      }
    }
  return [lc, sc];
}

/**
 * Indoor multiply colour: the stage's tint, towards the night. Rooms with
 * lamps (PropArt.light) go dark and their lamps add the light back; rooms
 * without any keep the old dim, even night tint.
 */
function indoorMul(st: number, night: number, lit: boolean): [number, number, number] {
  const day = INDOOR_MUL[Math.max(0, Math.min(2, Math.floor(st)))] ?? INDOOR_MUL[0];
  return lerpRGB(day, lit ? INDOOR_MUL[3] : INDOOR_NIGHT_UNLIT, Math.max(0, Math.min(1, night)));
}
const INDOOR_NIGHT_UNLIT: [number, number, number] = [176, 154, 146];

/** X-ray setting of a prop: explicit, or automatic for narrow tall props (poles, posts, signs). */
function xrayOf(a: PropInst['art']): number | undefined {
  if (a.xray !== undefined) return a.xray;
  return a.h >= 36 && a.w <= 40 ? 0 : undefined;
}

/** Margin (px) of the scratch canvas round a composed x-ray prop (its over() parts reach out). */
const XM = 20;

/** Opaque-pixel mask of a canvas that changes every frame (the scratch canvas). */
function liveMask(ctx: CanvasRenderingContext2D, w: number, h: number): Uint8Array {
  const d = ctx.getImageData(0, 0, w, h).data;
  const m = new Uint8Array(w * h);
  for (let i = 0; i < m.length; i++) m[i] = d[i * 4 + 3] > 0 ? 1 : 0;
  return m;
}

const maskCache = new WeakMap<HTMLCanvasElement, { m: Uint8Array; n: number }>();
/** Opaque-pixel mask of a (static) canvas and its opaque count, cached. */
function alphaMask(c: HTMLCanvasElement): { m: Uint8Array; n: number } {
  let r = maskCache.get(c);
  if (r) return r;
  const d = c.getContext('2d')!.getImageData(0, 0, c.width, c.height).data;
  const m = new Uint8Array(c.width * c.height);
  let n = 0;
  for (let i = 0; i < m.length; i++)
    if (d[i * 4 + 3] > 0) {
      m[i] = 1;
      n++;
    }
  r = { m, n };
  maskCache.set(c, r);
  return r;
}

const holeCache = new Map<number, HTMLCanvasElement>();
/** Elliptical see-through hole (rx × ry) with a 2px checker-dithered rim. */
function holeMask(rx: number, ry: number): HTMLCanvasElement {
  const key = rx * 1000 + ry;
  let c = holeCache.get(key);
  if (c) return c;
  const [cv, ctx] = makeCanvas(rx * 2 + 1, ry * 2 + 1);
  ctx.fillStyle = '#000';
  for (let y = 0; y <= ry * 2; y++)
    for (let x = 0; x <= rx * 2; x++) {
      const dx = (x - rx) / rx;
      const dy = (y - ry) / ry;
      const d = Math.sqrt(dx * dx + dy * dy);
      const edge = 1.2 / Math.min(rx, ry);
      if (d > 1) continue;
      if (d > 1 - edge && (x + y) % 2) continue;
      ctx.fillRect(x, y, 1, 1);
    }
  c = cv;
  holeCache.set(key, c);
  return c;
}

function lerpRGB(a: [number, number, number], b: [number, number, number], t: number): [number, number, number] {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}
