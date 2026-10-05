// HD-2D: the rooms of chapter 1 (2026-10-05, 02 #85) — the houses and shops
// of 夕鳴町 and the mall seen as a diorama, like the houses of a handheld
// RPG: the floor lies flat, the back wall and the side walls stand, the front
// (south) wall is left out but for a low rim at the feet, and the furniture
// stands up with a body the way the town's props do (town.ts CutoutView,
// tune.ts SOLID). Nothing is drawn twice: every surface is the room's own
// 2D picture.
//
//  - The room's picture: the map's ground tiles (the houses' floors), every
//    flat prop — the room shell (art/props/ishell: the floor, the back wall's
//    face with all that hangs on it, and the town round the building,
//    iexterior) and the decals — with their over() light (the floor's light
//    pools, the door's spill, the walkers in the street) and their glow()
//    (lamps, light shafts, lit signs; an additive layer). Redrawn a few times a
//    second; one texture for all of it.
//  - The floor cells lie flat (lit), the back wall's rows (ishell cellKind
//    'wall') stand at their foot line, SV-stretched like every standing
//    picture, so the wall covers on screen what its rows covered in 2D. The
//    side walls are 4 px boxes in the wall's bands (trim, plaster, skirting),
//    their tops and the back wall's top in the cross-section colour. The town
//    round the building lies flat round the room, unlit (as painted).
//  - Light: no evening sun inside. The field's sun (view.ts) becomes the
//    ceiling light — from above, a little from the front, so the furniture
//    throws short soft shadows back onto the floor and the wall — the sky
//    light a soft fill, the glowing props small warm point lights (faint by
//    day), and where the back wall has windows the evening comes in as a
//    beam and a bright patch on the floor (buildBeams). The 2D's light map
//    (every prop's light(): the lamp pools, the TV, the kitchen's tube) is
//    added onto the floor and the walls (paintLight); at night the room is
//    the 2D's dark indoor base but for those pools, the characters too
//    (lightAt). The colour is the 2D's indoor grade (indoorGrade: the same
//    numbers as render.ts), so 17:00 and the stages tween as in 2D.
//  - Someone just behind a counter is brought along the line of sight to
//    just behind its front (boxAt: the counter's picture over them as in 2D);
//    a bed lies (room_tune.ts LIE); what stands in the back wall's rows
//    comes forward to just in front of it (nudgeOffWall).
//  - The camera keeps the town's angle and distance; it looks at the 2D
//    camera's centre (the rooms are centred, the mall's halls stop at their
//    edges as in 2D) — lookN 0 in a room; the halls wider than the 3D frame
//    follow Minato across (roomPan).

import * as THREE from 'three';
import { Gfx } from '../engine/gfx';
import { W } from '../engine/screen';
import { P } from '../art/tiles/palette';
import { cellKind, type CellKind } from '../art/props/ishell';
import type { FieldScene, PropInst } from '../world/field';
import { INDOOR_MUL, type Grade } from '../world/lighting';
import { registerDebug } from '../debug';
import { CasterSet, CutoutView, PropBatch, ShadowSet, SV, type Box, type CasterSpec, type LightSpot } from './town';
import { NUDGE, solidOf } from './tune';
import { box, canvas, litMaterial, pixelTexture, PX, Quads, solidFace, type Face, type V3 } from './solid';
import { recording, type Solid } from './overlap';
import { LIE, ROOM_TUNE } from './room_tune';

/** The rooms drawn in HD-2D: chapter 1's houses, shops and the mall (chapter 2's rooms stay 2D). */
export const ROOM_MAPS = new Set([
  'map_home_1f',
  'map_home_2f',
  'map_shingo',
  'map_shodo',
  'map_tofu',
  'map_clock',
  'map_cafe',
  'map_sake',
  'map_chizu',
  'map_madam',
  'map_photo',
  'map_sk_storage',
  'map_sk_rest',
  'map_sk_bait',
  'map_park_toilet',
  'map_maruyama',
  'map_hinoya',
  'map_laundry',
  'map_koban',
  'map_mall_hall',
  'map_mall_food',
  'map_mall_health',
  'map_mall_2f',
  'map_mall_maigo',
]);

/** QA: __game.cmd.hd2dRooms(false) leaves the rooms 2D (the town stays 3D). */
export const rooms3d = { on: true };

/** Is this map one of the HD-2D rooms? */
export function roomMap(id: string): boolean {
  return rooms3d.on && ROOM_MAPS.has(id);
}

/**
 * The halls of the mall wider than the 3D frame near its bottom edge (the
 * 2D centres a hall narrower than the screen; the 3D frame is narrower at
 * its foot): the camera follows Minato (or a scripted pan) across, as far
 * as the hall's corners need (world units, added to the 2D centre).
 */
export function roomPan(f: FieldScene): number {
  const mw = f.map.w * 16;
  const slack = Math.max(0, mw / 2 - PAN_HALF);
  if (!slack) return 0;
  const cx = f.camX + W / 2;
  const at = f.camOverride?.x ?? f.player.x + f.player.ox;
  return Math.max(-slack, Math.min(slack, at - cx)) / 16;
}

/** Half the width (px) the 3D frame shows near its foot, less a margin (roomPan). */
const PAN_HALF = 124;

/** Round the room, as in 2D (render.ts clears with the map's outside, else the night). */
export const ROOM_BG = P.night;

/** Thickness of the walls (px) and height of the front rim (px, before SV). */
const WALL_T = 4;
const RIM_H = 4;
/** How often the room's picture is redrawn (ms; light quality: half as often). */
const REDRAW_MS = 100;
/** How much of the 2D light map's value the floor and walls take (× their colour). */
const LIGHT_MAP = 1;
/** render.ts INDOOR_NIGHT_UNLIT: a room with no light() of its own at night. */
const INDOOR_NIGHT_UNLIT: [number, number, number] = [176, 154, 146];
/** How lit the room is at night outside the lamps' pools (render.ts INDOOR_MUL[3] against the evening's). */
const NIGHT_BASE = 0.4;
/** How far behind a piece of furniture's body someone still counts as standing at it (px; addBehind). */
const BEHIND = 18;
/** The picture's own margin round the town outside, faded into the dark (px). */
const FADE = 28;
/** Width of the spare columns at the picture's right (the side walls' bands, the cross-section's colours). */
const STRIP = 6;

/** A window of the back wall (world px of its glass) that the evening comes in through. */
export interface RoomWindow {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * The 2D's indoor grade (render.ts grade(): the light map's base is the
 * indoor colour of the stage, the warm bleed from the left is 0.12, the dark
 * from the top 0.1, the colour drained as outdoors). At night the base stays
 * the evening's here: the room's own light goes down to the 2D's night base
 * instead (RoomWorld.light) and the light map's pools are added on the floor.
 */
export function indoorGrade(f: FieldScene, stage: number): Grade {
  const g = f.grade;
  const st = Math.max(0, Math.min(2, Math.floor(stage)));
  const day = INDOOR_MUL[st] ?? INDOOR_MUL[0];
  return {
    ...g,
    mul: [day[0], day[1], day[2]],
    glare: [247, 194, 122],
    glareA: 0.12 * (1 - g.night),
    glareW: 0.45,
    topA: 0.1,
  };
}

/** The ceiling light's direction (towards the light): from above, a little from the front and the west. */
const KEY = { el: 62, az: -18 };

/** Per-room touches (room_tune.ts): windows the 2D glass map doesn't mark. */
export interface RoomTune {
  windows?: RoomWindow[];
  /** No beams through the windows found in the glass map (they are a door's glass, a picture...). */
  noGlass?: boolean;
}

/** The room as a diorama (see the top of this file). Same face to view.ts and actors.ts as TownWorld. */
export class RoomWorld {
  readonly group = new THREE.Group();
  readonly cutouts: CutoutView[] = [];
  readonly spots: LightSpot[] = [];
  readonly solids: Solid[] = [];
  readonly buildParts: Record<string, number> = {};
  readonly windows: RoomWindow[] = [];
  /** The pendant lights' spots (in `spots` only at night: by day they are off, as in 2D). */
  private readonly pendants: LightSpot[] = [];
  private pendantsOn = false;
  private readonly nightSky = new THREE.Color();
  private roomMat: THREE.MeshLambertMaterial | null = null;
  /** Furniture fronts with the floor just behind them (addBehind). */
  private readonly behind: (Box & { p: PropInst })[] = [];
  private readonly lying: LyingView[] = [];
  /** The picture: world px (X0, Y0) at its top-left, EW × EH of it, then the spare columns. */
  private readonly X0: number;
  private readonly Y0: number;
  private readonly EW: number;
  private readonly EH: number;
  private readonly pic: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly g: Gfx;
  private readonly tex: THREE.CanvasTexture;
  private readonly glowPic: HTMLCanvasElement;
  private readonly gctx: CanvasRenderingContext2D;
  private readonly gg: Gfx;
  private readonly glowTex: THREE.CanvasTexture;
  /** The 2D's light map's lights (every prop's light(): lamp pools, the TV, the tube), added onto the floor and the walls. */
  private readonly lightPic: HTMLCanvasElement;
  private readonly lctx: CanvasRenderingContext2D;
  private readonly lg: Gfx;
  private readonly lightTex: THREE.CanvasTexture;
  /** The room's cells (the indoor light stays inside them, as render.ts clips it). */
  private roomMask: HTMLCanvasElement | null = null;
  /** The light map read back at night (lightAt). */
  private lightData: Uint8ClampedArray | null = null;
  private readonly kinds: CellKind[][];
  /** Per column: the back wall's first row and its foot row (the first floor row), or −1. */
  private readonly wallTop: number[];
  private readonly wallFoot: number[];
  private strip: HTMLCanvasElement | null = null;
  private stripH = 32;
  private lastPaint = -1e9;
  private readonly every: number;
  private readonly casterSpecs: CasterSpec[] = [];
  private casters: CasterSet | null = null;
  private readonly batches = { real: new PropBatch(true), thin: new PropBatch(false) };
  private readonly shadows = new ShadowSet();
  private readonly beamMat: THREE.MeshBasicMaterial | null = null;
  private readonly patchMat: THREE.MeshBasicMaterial | null = null;
  private readonly fades: { side: 'l' | 'r' | 't' | 'b' }[] = [];
  private readonly glassCache = new Map<PropInst, { key: string; c: HTMLCanvasElement }>();
  private saved: { sun: THREE.Color; sky: THREE.Color; ground: THREE.Color } | null = null;
  private sunRef: THREE.DirectionalLight | null = null;
  private hemiRef: THREE.HemisphereLight | null = null;
  readonly mapLit: boolean;

  constructor(
    readonly f: FieldScene,
    light = false,
  ) {
    let t0 = performance.now();
    const lap = (k: string) => {
      const t1 = performance.now();
      this.buildParts[k] = Math.round(t1 - t0);
      t0 = t1;
    };
    const m = f.map;
    const rows = m.def.rows ?? [];
    this.every = light ? REDRAW_MS * 2 : REDRAW_MS;
    this.mapLit = f.props.some((p) => !!p.art.light);
    // ---- the cells: floor, wall, the dark round them
    this.kinds = [];
    for (let ty = 0; ty < m.h; ty++) {
      const row: CellKind[] = [];
      for (let tx = 0; tx < m.w; tx++) row.push(cellKind(rows, tx, ty));
      this.kinds.push(row);
    }
    this.wallTop = [];
    this.wallFoot = [];
    for (let tx = 0; tx < m.w; tx++) {
      let ty = 0;
      while (ty < m.h && this.kind(tx, ty) !== 'wall') ty++;
      let t1 = ty;
      while (t1 < m.h && this.kind(tx, t1) === 'wall') t1++;
      const ok = ty < m.h && t1 < m.h;
      this.wallTop.push(ok ? ty : -1);
      this.wallFoot.push(ok ? t1 : -1);
    }
    // ---- the picture's extent: the map and every flat picture (the town round a shop)
    let x0 = 0;
    let y0 = 0;
    let x1 = m.w * 16;
    let y1 = m.h * 16;
    for (const p of f.props) {
      const a = p.art;
      if (!a.flat) continue;
      x0 = Math.min(x0, p.x + a.ox);
      y0 = Math.min(y0, p.y + a.oy);
      x1 = Math.max(x1, p.x + a.ox + a.w);
      y1 = Math.max(y1, p.y + a.oy + a.h);
    }
    x0 = Math.floor(x0);
    y0 = Math.floor(y0);
    // (the town outside reaches past the map on these sides: its edge is faded into the dark)
    if (x0 < -FADE) this.fades.push({ side: 'l' });
    if (y0 < -FADE) this.fades.push({ side: 't' });
    if (x1 > m.w * 16 + FADE) this.fades.push({ side: 'r' });
    if (y1 > m.h * 16 + FADE) this.fades.push({ side: 'b' });
    this.X0 = x0;
    this.Y0 = y0;
    this.EW = Math.ceil(x1) - x0;
    this.EH = Math.ceil(y1) - y0;
    [this.pic, this.ctx] = canvas(this.EW + STRIP, Math.max(this.EH, 64));
    this.g = new Gfx(this.ctx, this.pic.width, this.pic.height);
    [this.glowPic, this.gctx] = canvas(this.pic.width, this.pic.height);
    this.gg = new Gfx(this.gctx, this.glowPic.width, this.glowPic.height);
    this.tex = pixelTexture(this.pic);
    this.glowTex = pixelTexture(this.glowPic);
    [this.lightPic, this.lctx] = canvas(this.pic.width, this.pic.height);
    this.lg = new Gfx(this.lctx, this.lightPic.width, this.lightPic.height);
    this.lightTex = pixelTexture(this.lightPic);
    // (the 2D adds its lights to the light map in its own colour space: the
    // values go in as they are, not decoded, so a faint pool stays as faint)
    this.lightTex.colorSpace = THREE.NoColorSpace;
    this.lightTex.magFilter = THREE.LinearFilter;
    this.lightTex.minFilter = THREE.LinearFilter;
    // the side walls' bands from the back wall's face (before the light goes on it)
    this.paint(0, false);
    this.strip = this.wallBands();
    this.paint(0, true);
    lap('picture');
    // ---- the surfaces
    this.buildSurfaces();
    lap('walls');
    // ---- the windows and their beams
    this.findWindows();
    const tune = ROOM_TUNE[m.id];
    if (tune?.windows) this.windows.push(...tune.windows);
    if (this.windows.length) {
      const [beam, patch] = this.buildBeams();
      this.beamMat = beam.material as THREE.MeshBasicMaterial;
      this.patchMat = patch.material as THREE.MeshBasicMaterial;
      this.group.add(beam, patch);
    }
    lap('windows');
    // ---- the furniture
    const solids = recording.on ? this.solids : null;
    for (const p of f.props) {
      const a = p.art;
      const env = f.propEnv(p);
      // flat pictures are in the room's picture; a flat one with parts that
      // hang in the air (the pendant lights: no picture of their own) stands those
      if (a.flat && !(a.fg?.length && !a.img(env))) continue;
      // a thing that lies (a bed): its top flat, its front standing (room_tune.ts LIE)
      const pid = p.obj.t === 'prop' ? p.obj.prop : (p.obj.prop ?? p.obj.id);
      if (LIE[pid] !== undefined && !a.flat) {
        const l = new LyingView(p, env, LIE[pid]);
        this.lying.push(l);
        this.group.add(l.mesh);
        continue;
      }
      this.nudgeOffWall(p);
      const c = new CutoutView(p, env, this.casterSpecs, this.batches, this.shadows, 0, solids);
      this.cutouts.push(c);
      this.group.add(c.group);
      if (c.spot) this.spots.push(c.spot);
      else if (a.light && a.flat && a.fg?.length) {
        // a pendant (lit at night only, as in 2D): its light just under its shade
        const low = Math.max(...a.fg.map((pt) => pt.oy));
        this.pendants.push({ x: (p.x + 8) * PX, y: Math.max(0.3, -low * PX * SV - 0.35), z: p.y * PX, p });
      }
      this.addBehind(p, env);
    }
    lap('props');
    for (const b of [this.batches.real, this.batches.thin, this.shadows]) {
      const mesh = b.finish();
      if (mesh) this.group.add(mesh);
    }
    if (this.casterSpecs.length) {
      this.casters = new CasterSet(this.casterSpecs);
      this.group.add(this.casters.mesh);
    }
    lap('batches');
    shown = this;
  }

  /** QA (hd2dRoom). */
  qa(pic?: 'room' | 'glow' | 'light'): unknown {
    // (dev server only: the published page carries none of it)
    if (!import.meta.env.DEV) return null;
    if (pic) return (pic === 'room' ? this.pic : pic === 'glow' ? this.glowPic : this.lightPic).toDataURL();
    return {
      map: this.f.map.id,
      picture: [this.X0, this.Y0, this.EW, this.EH],
      windows: this.windows,
      behind: this.behind.map((b) => [b.p.obj.t === 'prop' ? b.p.obj.prop : b.p.obj.id, +b.x0.toFixed(2), +b.x1.toFixed(2), +b.z0.toFixed(2), +b.z1.toFixed(2)]),
      spots: this.spots.length,
      pendants: this.pendants.length,
      night: this.f.grade.night,
      lightData: !!this.lightData,
      lightMap: [!!this.roomMat?.lightMap, this.roomMat?.lightMapIntensity, this.roomMat?.lightMap === this.lightTex],
    };
  }

  /**
   * Where someone standing just behind a piece of furniture (the shopkeeper
   * behind the counter, a customer at a table) is drawn under its picture in
   * 2D: its front, and the strip of floor behind it (its body and a step
   * more). boxAt() hands it to actors.ts, which brings the one standing
   * there along the line of sight to just behind the front — the same place
   * on screen, the counter's picture over them as the 2D draws it, its
   * pushed-back top not over their head (2026-10-05: おばあ was hidden
   * behind ひのや's counter).
   */
  private addBehind(p: PropInst, env: ReturnType<FieldScene['propEnv']>): void {
    const a = p.art;
    // (a pendant's parts hang over everyone, as the 2D's fg layer)
    if (a.flat) return;
    const img = a.img(env);
    const w = img?.width ?? a.w;
    const top = p.y + a.oy;
    const foot = p.y + a.foot;
    const standH = Math.max(0, Math.min(img?.height ?? a.h, foot - top));
    if (standH < 8) return;
    const id = p.obj.t === 'prop' ? p.obj.prop : (p.obj.prop ?? p.obj.id);
    const spec = solidOf(id, w, standH);
    if (spec.kind === 'flat') return;
    const nz = NUDGE[`${id}@${p.x / 16},${p.y / 16}`]?.z ?? 0;
    const z1 = (foot + nz) * PX;
    this.behind.push({ x0: (p.x + a.ox) * PX, x1: (p.x + a.ox + w) * PX, y1: standH * PX * SV, z0: z1 - (spec.depth + BEHIND) * PX, z1, p });
  }

  /** Cell kind (outside the map: the dark). */
  kind(tx: number, ty: number): CellKind {
    if (ty < 0 || ty >= this.kinds.length || tx < 0 || tx >= this.kinds[0].length) return 'void';
    return this.kinds[ty][tx];
  }

  private floorish(tx: number, ty: number): boolean {
    const k = this.kind(tx, ty);
    return k === 'floor' || k === 'doorS';
  }

  /**
   * Something standing in the back wall's rows (its foot line north of the
   * wall's foot: a balloon at the ceiling, a lamp hung over the counter)
   * would stand behind the wall in 3D: it comes forward to just in front of
   * it (tune.ts NUDGE z: the same heights, a few px lower on screen).
   */
  private nudgeOffWall(p: PropInst): void {
    const a = p.art;
    const tx = Math.max(0, Math.min(this.wallFoot.length - 1, Math.floor((p.x + a.ox + a.w / 2) / 16)));
    const wf = this.wallFoot[tx];
    if (wf < 0) return;
    const foot = p.y + a.foot;
    const front = wf * 16 + 1;
    if (foot >= front) return;
    const id = p.obj.t === 'prop' ? p.obj.prop : (p.obj.prop ?? p.obj.id);
    const name = `${id}@${p.x / 16},${p.y / 16}`;
    if (!NUDGE[name]) NUDGE[name] = { z: front - foot };
  }

  // ---------------------------------------------------------------- the picture

  /** World px → texture uv of the room's picture. */
  private u(x: number): number {
    return (x - this.X0) / this.pic.width;
  }

  private v(y: number): number {
    return 1 - (y - this.Y0) / this.pic.height;
  }

  /** Picture px (of the canvas) → uv (for the spare columns). */
  private readonly uvPx = (c: number, r: number): [number, number] => [c / this.pic.width, 1 - r / this.pic.height];

  /**
   * Draw the room's picture as the 2D draws its ground layer: the map's
   * ground tiles, then every flat prop that is there (its picture, its
   * glass, its over() light when `lit`) and their glow() on black.
   */
  private paint(t: number, lit: boolean): void {
    const f = this.f;
    const ctx = this.ctx;
    const X0 = this.X0;
    const Y0 = this.Y0;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = f.map.def.outside ?? ROOM_BG;
    ctx.fillRect(0, 0, this.pic.width, this.pic.height);
    f.ground.draw(this.g, X0, Y0, this.EW, this.EH);
    ctx.restore();
    const glow = this.gctx;
    if (lit) {
      glow.save();
      glow.setTransform(1, 0, 0, 1, 0, 0);
      glow.globalAlpha = 1;
      glow.globalCompositeOperation = 'source-over';
      glow.fillStyle = '#000';
      glow.fillRect(0, 0, this.glowPic.width, this.glowPic.height);
      glow.restore();
    }
    for (const p of f.props) {
      const a = p.art;
      if (!p.present || !a.flat) continue;
      const env = f.propEnv(p);
      const img = a.img(env);
      const x = p.x + a.ox - X0;
      const y = p.y + a.oy - Y0;
      if (img) ctx.drawImage(img, Math.round(x), Math.round(y));
      if (img && a.glass && lit) this.drawGlass(p, a.glass, x, y);
      if (lit && a.over) {
        ctx.save();
        a.over(this.g, p.x - X0, p.y - Y0, env);
        ctx.restore();
      }
      if (lit && a.glow && !a.glowFg) {
        glow.save();
        a.glow(this.gg, p.x - X0, p.y - Y0, env);
        glow.restore();
      }
    }
    if (!lit) return;
    this.paintLight();
    this.fadeEdges();
    if (this.strip) {
      // the spare columns: the side walls' bands, the cross-section's colours
      const sx = this.EW;
      ctx.clearRect(sx, 0, STRIP, this.pic.height);
      ctx.drawImage(this.strip, sx + 1, 0);
      ctx.drawImage(this.strip, sx + 2, 0);
      const sec = this.sectionColour();
      ctx.fillStyle = sec;
      ctx.fillRect(sx + 4, 0, 2, 2);
      ctx.fillStyle = darker(sec, 0.72);
      ctx.fillRect(sx + 4, 2, 2, 2);
    }
    this.tex.needsUpdate = true;
    this.glowTex.needsUpdate = true;
    this.lastPaint = t;
  }

  /**
   * The lights of the 2D's light map (render.ts grade(): every prop's
   * light(), added up, kept inside the room's cells): the lamps' pools on
   * the floor and the walls at night, the faint ones by day.
   */
  private paintLight(): void {
    const f = this.f;
    const ctx = this.lctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.lightPic.width, this.lightPic.height);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of f.props) {
      const a = p.art;
      if (!p.present || !a.light) continue;
      ctx.save();
      a.light(this.lg, p.x - this.X0, p.y - this.Y0, f.propEnv(p));
      ctx.restore();
    }
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.mask(), 0, 0);
    ctx.globalCompositeOperation = 'destination-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, this.lightPic.width, this.lightPic.height);
    ctx.restore();
    this.lightTex.needsUpdate = true;
    this.lightData = f.grade.night > 0.05 ? ctx.getImageData(0, 0, this.EW, this.EH).data : null;
  }

  /** The room's cells, opaque (floor, wall, the doorway). */
  private mask(): HTMLCanvasElement {
    if (this.roomMask) return this.roomMask;
    const [c, ctx] = canvas(this.pic.width, this.pic.height);
    ctx.fillStyle = '#fff';
    for (let ty = 0; ty < this.kinds.length; ty++)
      for (let tx = 0; tx < this.kinds[0].length; tx++) if (this.kind(tx, ty) !== 'void') ctx.fillRect(tx * 16 - this.X0, ty * 16 - this.Y0, 16, 16);
    this.roomMask = c;
    return c;
  }

  /**
   * How lit someone standing at (x, z) (units) is: by day as painted; at
   * night the room's dark base and the light map's pools where they stand
   * (the 2D multiplies the characters by its light map too).
   */
  lightAt(x: number, z: number): number {
    const n = this.f.grade.night;
    const d = this.lightData;
    if (n < 0.05 || !d) return 1;
    const px = Math.floor(x * 16 - this.X0);
    const py = Math.floor(z * 16 - 6 - this.Y0);
    let pool = 0;
    if (px >= 0 && py >= 0 && px < this.EW && py < this.EH) {
      const i = (py * this.EW + px) * 4;
      pool = (d[i] * 0.3 + d[i + 1] * 0.5 + d[i + 2] * 0.2) / 255;
    }
    // (the characters' colour is multiplied after decoding: the 2D's base, decoded, and the pool as the floor takes it)
    const base = toLinear(NIGHT_BASE * n + (1 - n));
    return Math.min(1, base + pool * LIGHT_MAP);
  }

  /** The 2D's glass (render.ts drawGlass): the evening sky in the window panes, at 0.7. */
  private drawGlass(p: PropInst, mask: HTMLCanvasElement, x: number, y: number): void {
    const gd = this.f.grade;
    const key = `${gd.skyTop.join()}|${gd.skyBot.join()}`;
    let hit = this.glassCache.get(p);
    if (!hit || hit.key !== key) {
      const [c, cx] = canvas(mask.width, mask.height);
      const gr = cx.createLinearGradient(0, 0, 0, mask.height);
      gr.addColorStop(0, `rgb(${gd.skyTop.join()})`);
      gr.addColorStop(1, `rgb(${gd.skyBot.join()})`);
      cx.fillStyle = gr;
      cx.fillRect(0, 0, mask.width, mask.height);
      cx.globalCompositeOperation = 'destination-in';
      cx.drawImage(mask, 0, 0);
      hit = { key, c };
      this.glassCache.set(p, hit);
    }
    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.drawImage(hit.c, Math.round(x), Math.round(y));
    ctx.restore();
    // the panes glow a little (bloom)
    const g = this.gctx;
    g.save();
    g.globalAlpha = 0.22;
    g.globalCompositeOperation = 'lighter';
    g.drawImage(hit.c, Math.round(x), Math.round(y));
    g.restore();
  }

  /** The town outside goes dark towards the picture's edge (past it the camera sees the dark round the room). */
  private fadeEdges(): void {
    const ctx = this.ctx;
    const col = this.f.map.def.outside ?? ROOM_BG;
    const c = new THREE.Color(col);
    const rgb = `${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)}`;
    const W = this.EW;
    const H = this.EH;
    for (const { side } of this.fades) {
      const [gx0, gy0, gx1, gy1, rx, ry, rw, rh] =
        side === 'l' ? [0, 0, FADE, 0, 0, 0, FADE, H] : side === 'r' ? [W, 0, W - FADE, 0, W - FADE, 0, FADE, H] : side === 't' ? [0, 0, 0, FADE, 0, 0, W, FADE] : [0, H, 0, H - FADE, 0, H - FADE, W, FADE];
      const gr = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
      gr.addColorStop(0, `rgba(${rgb},1)`);
      gr.addColorStop(1, `rgba(${rgb},0)`);
      ctx.fillStyle = gr;
      ctx.fillRect(rx, ry, rw, rh);
    }
  }

  /** The back wall's bands (a column of its most common colour per row): the side walls' face. */
  private wallBands(): HTMLCanvasElement | null {
    const cols: number[] = [];
    let fh = 0;
    for (let tx = 0; tx < this.wallTop.length; tx++) {
      if (this.wallTop[tx] < 0) continue;
      cols.push(tx);
      fh = Math.max(fh, (this.wallFoot[tx] - this.wallTop[tx]) * 16);
    }
    if (!cols.length || !fh) return null;
    this.stripH = fh;
    const d = this.ctx.getImageData(0, 0, this.EW, this.EH).data;
    const [c, cx] = canvas(1, fh);
    const out = cx.createImageData(1, fh);
    for (let j = 0; j < fh; j++) {
      const count = new Map<number, number>();
      let best = 0;
      let bestN = 0;
      for (const tx of cols) {
        const top = this.wallTop[tx] * 16;
        const h = (this.wallFoot[tx] - this.wallTop[tx]) * 16;
        // (rows counted from the foot up, so walls of other heights line up at the skirting)
        const y = top + h - fh + j;
        if (y < top) continue;
        for (let i = 0; i < 16; i++) {
          const px = tx * 16 + i - this.X0;
          const py = y - this.Y0;
          if (px < 0 || py < 0 || px >= this.EW || py >= this.EH) continue;
          const k = (py * this.EW + px) * 4;
          const key = (d[k] << 16) | (d[k + 1] << 8) | d[k + 2];
          const n = (count.get(key) ?? 0) + 1;
          count.set(key, n);
          if (n > bestN) {
            bestN = n;
            best = key;
          }
        }
      }
      out.data[j * 4] = (best >> 16) & 255;
      out.data[j * 4 + 1] = (best >> 8) & 255;
      out.data[j * 4 + 2] = best & 255;
      out.data[j * 4 + 3] = 255;
    }
    cx.putImageData(out, 0, 0);
    return c;
  }

  /** The cross-section's colour (the back wall face's first row: ishell's `section`). */
  private sectionColour(): string {
    if (!this.strip) return P.nightShade;
    const d = this.strip.getContext('2d')!.getImageData(0, 0, 1, 1).data;
    return `rgb(${d[0]},${d[1]},${d[2]})`;
  }

  // ---------------------------------------------------------------- the surfaces

  private buildSurfaces(): void {
    const m = this.f.map;
    const room = new Quads();
    const glow = new Quads();
    const u = (x: number) => this.u(x);
    const v = (y: number) => this.v(y);
    // the town round the building, lying flat a hair under the floor, unlit (as painted)
    const ex = new Quads();
    const X0 = this.X0 * PX;
    const X1 = (this.X0 + this.EW) * PX;
    const Z0 = this.Y0 * PX;
    const Z1 = (this.Y0 + this.EH) * PX;
    const outY = -0.02;
    for (const q of [ex, glow]) q.add([X0, outY, Z1], [X1, outY, Z1], [X1, outY, Z0], [X0, outY, Z0], [0, 1, 0], u(this.X0), v(this.Y0 + this.EH), u(this.X0 + this.EW), v(this.Y0));
    // the floor: runs of floor cells along each row
    for (let ty = 0; ty < m.h; ty++) {
      let tx = 0;
      while (tx < m.w) {
        if (!this.floorish(tx, ty)) {
          tx++;
          continue;
        }
        let t1 = tx;
        while (t1 < m.w && this.floorish(t1, ty)) t1++;
        const a: V3 = [tx, 0, ty + 1];
        const b: V3 = [t1, 0, ty + 1];
        const c: V3 = [t1, 0, ty];
        const d: V3 = [tx, 0, ty];
        for (const q of [room, glow]) q.add(a, b, c, d, [0, 1, 0], u(tx * 16), v((ty + 1) * 16), u(t1 * 16), v(ty * 16));
        tx = t1;
      }
    }
    // the back wall: each column's rows standing at their foot line (runs of equal columns merged)
    const sec = this.sectionFace();
    for (let tx = 0; tx < m.w; ) {
      const top = this.wallTop[tx];
      const ft = this.wallFoot[tx];
      if (top < 0) {
        tx++;
        continue;
      }
      let t1 = tx + 1;
      while (t1 < m.w && this.wallTop[t1] === top && this.wallFoot[t1] === ft) t1++;
      const h = (ft - top) * 16 * PX * SV;
      const z = ft;
      for (const q of [room, glow]) q.add([tx, 0, z], [t1, 0, z], [t1, h, z], [tx, h, z], [0, 0, 1], u(tx * 16), v(ft * 16), u(t1 * 16), v(top * 16));
      // its top: the cross-section, reaching over the side walls at the corners
      const xa = tx - (this.kind(tx - 1, ft) === 'void' ? WALL_T * PX : 0);
      const xb = t1 + (this.kind(t1, ft) === 'void' ? WALL_T * PX : 0);
      box(room, xa, xb, h, h, z - WALL_T * PX, z, { top: sec });
      tx = t1;
    }
    // the side walls: 4 px boxes beside the floor where the dark is (inside the map:
    // the mall's open ends, E, have none), in the back wall's bands
    const bands: Face = { uv: this.uvPx, c0: this.EW + 1.5, r0: 0, c1: this.EW + 1.5, r1: this.stripH };
    const end = this.sectionFace(true);
    for (const side of [-1, 1] as const) {
      for (let tx = 0; tx < m.w; tx++) {
        let ty = 0;
        while (ty < m.h) {
          const nx = tx + side;
          const wall = (y: number) => this.floorish(tx, y) && this.kind(tx, y) === 'floor' && nx >= 0 && nx < m.w && this.kind(nx, y) === 'void';
          if (!wall(ty)) {
            ty++;
            continue;
          }
          let t1 = ty;
          while (t1 < m.h && wall(t1)) t1++;
          // as tall as the back wall over that side
          const col = this.wallTop[tx] >= 0 ? tx : this.wallTop.findIndex((w) => w >= 0);
          const fh = col >= 0 ? (this.wallFoot[col] - this.wallTop[col]) * 16 : 32;
          const h = fh * PX * SV;
          // (it starts at the back wall's foot when the floor reaches it)
          const zN = col >= 0 && this.wallFoot[col] === ty ? ty : ty;
          const x = side < 0 ? tx : tx + 1;
          const xa = side < 0 ? x - WALL_T * PX : x;
          const xb = side < 0 ? x : x + WALL_T * PX;
          const face = { ...bands, r0: this.stripH - fh };
          box(room, xa, xb, 0, h, zN, t1, side < 0 ? { right: face, top: sec, front: end } : { left: face, top: sec, front: end });
          ty = t1;
        }
      }
    }
    // the front: no wall, a low rim at the feet (not across the doorway)
    const rim = RIM_H * PX * SV;
    for (let ty = 0; ty < m.h; ty++) {
      let tx = 0;
      while (tx < m.w) {
        const edge = (x: number) => this.kind(x, ty) === 'floor' && this.kind(x, ty + 1) === 'void' && ty + 1 < m.h;
        if (!edge(tx)) {
          tx++;
          continue;
        }
        let t1 = tx;
        while (t1 < m.w && edge(t1)) t1++;
        const xa = tx - (this.kind(tx - 1, ty) === 'void' ? WALL_T * PX : 0);
        const xb = t1 + (this.kind(t1, ty) === 'void' ? WALL_T * PX : 0);
        box(room, xa, xb, 0, rim, ty + 1, ty + 1 + WALL_T * PX, { top: sec, front: end });
        tx = t1;
      }
    }
    // (a step darker than painted: the bloom's haze lifts it, and the room is what is lit)
    const outside = new THREE.Mesh(ex.geometry(), new THREE.MeshBasicMaterial({ map: this.tex, color: new THREE.Color(0.86, 0.86, 0.88) }));
    outside.renderOrder = -1;
    // (the 2D's light map's pools added: lightMapIntensity π adds the map's value times the colour)
    const mat = litMaterial(this.tex, { alphaTest: 0, lightMap: this.lightTex, lightMapIntensity: Math.PI * LIGHT_MAP });
    this.roomMat = mat;
    const roomMesh = new THREE.Mesh(room.geometry(), mat);
    roomMesh.receiveShadow = true;
    roomMesh.castShadow = true;
    const glowMesh = new THREE.Mesh(
      glow.geometry(),
      new THREE.MeshBasicMaterial({ map: this.glowTex, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, toneMapped: false }),
    );
    glowMesh.renderOrder = 2;
    this.group.add(outside, roomMesh, glowMesh);
  }

  /** One colour of the spare columns: the cross-section (or its darker end face). */
  private sectionFace(dark = false): Face {
    return solidFace(this.uvPx, this.EW + 4, dark ? 2 : 0);
  }

  // ---------------------------------------------------------------- windows

  /** Glass in the back wall's rows (the shells' glass map marks the panes): its windows. */
  private findWindows(): void {
    if (ROOM_TUNE[this.f.map.id]?.noGlass) return;
    const found: RoomWindow[] = [];
    for (const p of this.f.props) {
      const g = p.art.glass;
      if (!g || !p.art.flat) continue;
      const W = g.width;
      const H = g.height;
      const d = g.getContext('2d')!.getImageData(0, 0, W, H).data;
      const seen = new Uint8Array(W * H);
      for (let y = 0; y < H; y++)
        for (let x = 0; x < W; x++) {
          const i = y * W + x;
          if (seen[i] || d[i * 4 + 3] < 128) continue;
          let bx0 = x;
          let bx1 = x;
          let by0 = y;
          let by1 = y;
          const st = [i];
          seen[i] = 1;
          while (st.length) {
            const k = st.pop()!;
            const kx = k % W;
            const ky = (k / W) | 0;
            bx0 = Math.min(bx0, kx);
            bx1 = Math.max(bx1, kx);
            by0 = Math.min(by0, ky);
            by1 = Math.max(by1, ky);
            for (const [dx, dy] of [
              [1, 0],
              [-1, 0],
              [0, 1],
              [0, -1],
              [2, 0],
              [-2, 0],
            ]) {
              const nx = kx + dx;
              const ny = ky + dy;
              if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
              const n = ny * W + nx;
              if (seen[n] || d[n * 4 + 3] < 128) continue;
              seen[n] = 1;
              st.push(n);
            }
          }
          const wx0 = p.x + p.art.ox + bx0;
          const wy0 = p.y + p.art.oy + by0;
          const w: RoomWindow = { x0: wx0, y0: wy0, x1: wx0 + bx1 - bx0 + 1, y1: wy0 + by1 - by0 + 1 };
          // on the back wall's face only (a door's glass in the front wall is not a window)
          const tx = Math.floor((w.x0 + w.x1) / 32);
          const ty = Math.floor((w.y0 + w.y1) / 32);
          if (w.x1 - w.x0 >= 4 && w.y1 - w.y0 >= 4 && this.kind(tx, ty) === 'wall') found.push(w);
        }
    }
    // panes of one window (split by a bar) are one window
    found.sort((a, b) => a.x0 - b.x0);
    for (const w of found) {
      const last = this.windows[this.windows.length - 1];
      if (last && w.x0 - last.x1 <= 6 && w.y0 < last.y1 && w.y1 > last.y0) {
        last.x1 = Math.max(last.x1, w.x1);
        last.y0 = Math.min(last.y0, w.y0);
        last.y1 = Math.max(last.y1, w.y1);
      } else this.windows.push({ ...w });
    }
  }

  /**
   * The evening through each window: a beam from the glass down into the
   * room (its four sides, brightest at the window) and the bright patch where
   * it lands on the floor, both added onto the picture. The light comes in
   * from the north-west, down at about 40° (the low sun is in the west).
   */
  private buildBeams(): [THREE.Mesh, THREE.Mesh] {
    const beam = new Quads();
    const patch = new Quads();
    const cols: number[] = [];
    const pcols: number[] = [];
    const slope = 0.78; // units down per unit south
    const east = this.f.map.def.light === 'left' ? 0.55 : 0.32; // units east per unit south
    for (const w of this.windows) {
      const tx = Math.max(0, Math.min(this.wallFoot.length - 1, Math.floor((w.x0 + w.x1) / 32)));
      const foot = this.wallFoot[tx];
      if (foot < 0) continue;
      const z = foot + 0.02;
      const hT = (foot * 16 - w.y0) * PX * SV;
      const hB = Math.max(0.05, (foot * 16 - w.y1) * PX * SV);
      const xa = w.x0 * PX;
      const xb = w.x1 * PX;
      const land = (x: number, h: number): V3 => [x + (east * h) / slope, 0.015, z + h / slope];
      const A: V3 = [xa, hT, z];
      const B: V3 = [xb, hT, z];
      const C: V3 = [xb, hB, z];
      const D: V3 = [xa, hB, z];
      const A2 = land(xa, hT);
      const B2 = land(xb, hT);
      const C2 = land(xb, hB);
      const D2 = land(xa, hB);
      // the beam's sides: u across, v along (1 at the window, 0 on the floor)
      const side = (p: V3, q: V3, q2: V3, p2: V3) => {
        beam.add4(p2, q2, q, p, [0, 0, 1], [0, 0, 1, 0, 1, 1, 0, 1]);
        cols.push(0.35, 0.35, 1, 1);
      };
      side(A, B, B2, A2);
      side(D, C, C2, D2);
      side(D, A, A2, D2);
      side(C, B, B2, C2);
      // the patch: from where the window's foot lands to where its head lands
      patch.add4(D2, C2, B2, A2, [0, 1, 0], [0, 0, 1, 0, 1, 1, 0, 1]);
      pcols.push(1, 1, 1, 1);
    }
    const mk = (q: Quads, c: number[], tex: THREE.Texture) => {
      const geo = q.geometry();
      const rgb = new Float32Array(c.length * 3);
      c.forEach((k, i) => rgb.set([k, k, k], i * 3));
      geo.setAttribute('color', new THREE.BufferAttribute(rgb, 3));
      const mat = new THREE.MeshBasicMaterial({ map: tex, vertexColors: true, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, toneMapped: false });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.renderOrder = 3;
      return mesh;
    };
    return [mk(beam, cols, softTexture(false)), mk(patch, pcols, softTexture(true))];
  }

  // ---------------------------------------------------------------- per frame

  /**
   * The room's light, in place of the town's sun (view.ts): the field's sun
   * becomes the ceiling light (from above, short shadows falling back onto
   * the floor and the wall; in stage 2 they turn to the north-east as the
   * town's do), the sky light a soft fill. Returns the yaw the characters'
   * shadow planes turn to.
   */
  light(sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight, t: THREE.Vector3, dir: THREE.Vector3): number {
    if (!this.saved) {
      this.saved = { sun: sun.color.clone(), sky: hemi.color.clone(), ground: hemi.groundColor.clone() };
      this.sunRef = sun;
      this.hemiRef = hemi;
    }
    const g = this.f.grade;
    const night = g.night;
    const el = (KEY.el * Math.PI) / 180;
    // (towards the light: from the south-south-west; stage 2 from the south-west)
    const az = ((KEY.az - 25 * g.toMall) * Math.PI) / 180;
    const d = dir.set(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el)).normalize();
    sun.target.position.set(t.x, 0, t.z - 1);
    sun.position.set(t.x + d.x * 30, d.y * 30, t.z - 1 + d.z * 30);
    sun.target.updateMatrixWorld();
    sun.color.set('#fff1dc');
    sun.intensity = 1.15 * (1 - night);
    // the sky light: the evening's; at night the 2D's indoor night base
    // against the evening's (the finish keeps the evening's colour), the
    // lamps' pools come from the light map (paintLight)
    const st = Math.max(0, Math.min(2, Math.floor(this.f.propEnv(null).stage)));
    const day = INDOOR_MUL[st] ?? INDOOR_MUL[0];
    const nb = this.mapLit ? INDOOR_MUL[3] : INDOOR_NIGHT_UNLIT;
    // (the 2D multiplies in its colour space: the light here is that, decoded)
    const rel = [0, 1, 2].map((i) => toLinear(nb[i] / Math.max(1, day[i])));
    const top = Math.max(...rel);
    this.nightSky.setRGB(rel[0] / top, rel[1] / top, rel[2] / top, THREE.LinearSRGBColorSpace);
    hemi.color.set('#fff6ec').lerp(this.nightSky, night);
    hemi.groundColor.set('#a898b8').lerp(this.nightSky, night * 0.6);
    hemi.intensity = 2.3 + (top * Math.PI - 2.3) * night;
    // the pendant lights come on at night (as their glow and light in 2D)
    const lamps = night > 0.05;
    if (lamps !== this.pendantsOn) {
      this.pendantsOn = lamps;
      for (const s of this.pendants) {
        const i = this.spots.indexOf(s);
        if (lamps && i < 0) this.spots.unshift(s);
        else if (!lamps && i >= 0) this.spots.splice(i, 1);
      }
    }
    // the windows: the evening's colour, gone at night, faint in the stopped stage
    if (this.beamMat && this.patchMat) {
      const k = (1 - night) * (this.f.grade.motion < 0.5 && g.toMall < 0.5 ? 0.65 : 1);
      const sky = new THREE.Color().setRGB(g.skyBot[0] / 255, g.skyBot[1] / 255, g.skyBot[2] / 255, THREE.SRGBColorSpace);
      const c = new THREE.Color(1, 0.93, 0.8).lerp(sky, 0.45);
      this.beamMat.color.copy(c).multiplyScalar(0.16 * k);
      this.patchMat.color.copy(c).multiplyScalar(0.34 * k);
    }
    return Math.atan2(d.x, d.z);
  }

  /** The lamps' strength (view.ts placeLamps): faint by day (the 2D's lamps light nothing then), full at night. */
  lampK(): number {
    return 0.22 + 0.6 * this.f.grade.night;
  }

  /** The 2D's indoor grade for the finish (post.ts). */
  grade(): Grade {
    return indoorGrade(this.f, this.f.propEnv(null).stage);
  }

  update(t: number, sunYaw: number, _sunDir: THREE.Vector3, lit: number, _tx: number, _tz: number, hides: (r: [number, number, number, number, number]) => boolean): void {
    const f = this.f;
    if (t - this.lastPaint >= this.every || t < this.lastPaint) this.paint(t, true);
    const seers = [f.player, ...(f.follower ? [f.follower] : [])].map((a) => ({ x: a.x + a.ox, y: a.y }));
    for (const c of this.cutouts) c.update(f, t, sunYaw, lit, seers, true, hides);
    for (const l of this.lying) l.update(f);
    this.casters?.turn(sunYaw);
  }

  /** No steps indoors. */
  heightAt(_x: number, _z: number): number {
    return 0;
  }

  /**
   * The furniture someone standing at (x, z) is just behind (addBehind):
   * the one whose front is nearest north of them (the 2D draws the ones
   * further south over that one too, and they stay in front in 3D).
   */
  boxAt(x: number, z: number): Box | null {
    let best: Box | null = null;
    for (const b of this.behind) {
      if (!b.p.present || x <= b.x0 || x >= b.x1 || z <= b.z0 || z >= b.z1 - 0.04) continue;
      if (!best || b.z1 < best.z1) best = b;
    }
    return best;
  }

  inShadow(_p: V3, _dir: THREE.Vector3): boolean {
    return false;
  }

  dispose(): void {
    if (shown === this) shown = null;
    // the town's sun and sky light as they were
    if (this.saved && this.sunRef && this.hemiRef) {
      this.sunRef.color.copy(this.saved.sun);
      this.hemiRef.color.copy(this.saved.sky);
      this.hemiRef.groundColor.copy(this.saved.ground);
    }
    for (const c of this.cutouts) c.dispose();
    for (const l of this.lying) l.dispose();
    this.casters?.dispose();
    this.batches.real.dispose();
    this.batches.thin.dispose();
    this.shadows.dispose();
    this.tex.dispose();
    this.glowTex.dispose();
    this.lightTex.dispose();
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh && !this.cutouts.some((c) => c.group === o.parent)) {
        o.geometry.dispose();
        const mat = o.material as THREE.MeshBasicMaterial;
        mat.map?.dispose();
        mat.dispose();
      }
    });
  }
}

/**
 * A thing that lies on the floor more than it stands (a bed): the ¾
 * picture's rows above its front lie flat on top of it, the front's `h` rows
 * stand at the foot line, the rows below lie on the floor — on screen the
 * same picture, in 3D a low box instead of a board standing up.
 */
class LyingView {
  readonly mesh: THREE.Mesh;
  private readonly tex: THREE.CanvasTexture;
  private last: HTMLCanvasElement | null;

  constructor(
    readonly p: PropInst,
    env: ReturnType<FieldScene['propEnv']>,
    front: number,
  ) {
    const a = p.art;
    const img = a.img(env);
    this.last = img;
    const [c] = img ? [img] : canvas(a.w, a.h);
    this.tex = pixelTexture(c);
    const iw = c.width;
    const ih = c.height;
    const left = p.x + a.ox;
    const top = p.y + a.oy;
    const foot = p.y + a.foot;
    const rf = Math.max(0, Math.min(ih, foot - top));
    const h = Math.max(0, Math.min(front, rf));
    const uv = (cc: number, r: number): [number, number] => [cc / iw, 1 - r / ih];
    const q = new Quads();
    const x0 = left * PX;
    const x1 = (left + iw) * PX;
    const Y = h * PX * SV;
    const zN = (top + h) * PX;
    const zF = foot * PX;
    // the top: the rows above the front, lying at the front's height (row r over z = r + h)
    if (rf - h > 0) {
      const A = uv(0, rf - h);
      const B = uv(iw, 0);
      q.add([x0, Y, zF], [x1, Y, zF], [x1, Y, zN], [x0, Y, zN], [0, 1, 0], A[0], A[1], B[0], B[1]);
    }
    if (h > 0) {
      // the front, standing at the foot line, and the two ends in its edge columns' colours
      const A = uv(0, rf);
      const B = uv(iw, rf - h);
      q.add([x0, 0, zF], [x1, 0, zF], [x1, Y, zF], [x0, Y, zF], [0, 0, 1], A[0], A[1], B[0], B[1]);
      const vm = uv(0, rf - h / 2)[1];
      const ul = 0.5 / iw;
      const ur = (iw - 0.5) / iw;
      q.add([x0, 0, zN], [x0, 0, zF], [x0, Y, zF], [x0, Y, zN], [-1, 0, 0], ul, vm, ul, vm);
      q.add([x1, 0, zF], [x1, 0, zN], [x1, Y, zN], [x1, Y, zF], [1, 0, 0], ur, vm, ur, vm);
    }
    if (rf < ih) {
      // the rows below the foot line lie on the floor in front
      const A = uv(0, ih);
      const B = uv(iw, rf);
      q.add([x0, 0.012, (top + ih) * PX], [x1, 0.012, (top + ih) * PX], [x1, 0.012, zF], [x0, 0.012, zF], [0, 1, 0], A[0], A[1], B[0], B[1]);
    }
    this.mesh = new THREE.Mesh(q.geometry(), litMaterial(this.tex));
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
  }

  update(f: FieldScene): void {
    this.mesh.visible = this.p.present;
    if (!this.p.present) return;
    const img = this.p.art.img(f.propEnv(this.p));
    if (img && img !== this.last && img.width === (this.tex.image as HTMLCanvasElement).width) {
      this.tex.image = img;
      this.tex.needsUpdate = true;
      this.last = img;
    }
  }

  dispose(): void {
    this.tex.dispose();
  }
}

/** An sRGB value (0..1) decoded to linear. */
function toLinear(v: number): number {
  return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
}

/** A colour a step darker (css). */
function darker(css: string, k: number): string {
  const c = new THREE.Color(css);
  return `rgb(${Math.round(c.r * 255 * k)},${Math.round(c.g * 255 * k)},${Math.round(c.b * 255 * k)})`;
}

const softTex: Partial<Record<'beam' | 'patch', THREE.CanvasTexture>> = {};

/** Grey ramps for the beams (soft at the sides) and the patches (soft all round). */
function softTexture(patch: boolean): THREE.CanvasTexture {
  const k = patch ? 'patch' : 'beam';
  const hit = softTex[k];
  if (hit) return hit;
  const N = 32;
  const [c, ctx] = canvas(N, N);
  const img = ctx.createImageData(N, N);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const e = (t: number) => Math.min(1, Math.min(t, 1 - t) * 5);
      const a = e((x + 0.5) / N) * (patch ? e((y + 0.5) / N) : 1);
      const v = Math.round(255 * a);
      const i = (y * N + x) * 4;
      img.data[i] = v;
      img.data[i + 1] = v;
      img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
  ctx.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.NoColorSpace;
  softTex[k] = t;
  return t;
}

/** The room standing now (QA). */
let shown: RoomWorld | null = null;

// (QA only: the published page leaves these out)
if (import.meta.env.DEV) {
  /** QA: the room's windows, the furniture fronts, and its pictures (`pic`: 'room' | 'glow' | 'light' as a data URL). */
  registerDebug('hd2dRoom', (pic?: 'room' | 'glow' | 'light') => (shown ? shown.qa(pic) : null));
  /** QA: false leaves the rooms 2D (compare), true stands them again (the next build: a door, a warp). */
  registerDebug('hd2dRooms', (v?: boolean) => {
    if (v !== undefined) rooms3d.on = !!v;
    return { on: rooms3d.on, rooms: [...ROOM_MAPS] };
  });
}
