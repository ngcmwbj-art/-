// HD-2D battles (2026-10-06, 依頼主「第1章全部HD-2Dにして」): a chapter-1
// battle shows the place it started in — the town or the room in 3D, seen
// lower from the south like a diorama (an Octopath Traveler–like battle
// backdrop), the enemies standing in front of it — instead of the patterned
// backdrop. The enemies, the party's backs, the windows, the tsukkomi and
// the hanko stay the 2D battle on top (battle/bg/place.ts; what each
// backdrop still lays over the place: battle/bg/common.ts drawOnPlace).
//
// The camera doesn't move in a battle, so the place is rendered once as the
// battle starts (Hd2dView.still: no people, the near side of the town cut
// away under the windows' row) and that picture is laid under the 2D buffer
// every frame; only the stage's shake or kire's waver lays it again,
// shifted. Kire 2's colour is a second still (20% more saturated, rendered
// with the first); the 0.3 s standstill's grey is made from the still on
// the 2D side the first time it's needed.

import { game } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import { H, W } from '../engine/screen';
import { registerDebug } from '../debug';
import { field, type FieldScene } from '../world/field';
import { setPlaceMaker, type PlaceView } from '../battle/bg/place';
import { BG_H, type Background } from '../battle/bg/common';
import type { Hd2dView, StillPose } from './view';
import { roomMap } from './room';

/** The backdrops that become the place (chapter 1's); chapter 2's keep their pictures. */
const PLACE_BGS = new Set(['bg_residential', 'bg_reverse_rain', 'bg_kanenari', 'bg_ojigi', 'bg_mall_floor', 'bg_boss']);

/**
 * The battle camera, outdoors and in a room: degrees down, lens, distance
 * (units) to the enemies' ground, which sits at frame row `row` (their feet:
 * 20 15.4, y104–136); the ground is cut at `cutRow` (the windows from y150);
 * the tilt-shift is sharp at `focusRow`; `north`: how far (tiles) north of
 * Minato the enemies stand.
 */
export const BATTLE_CAM = {
  town: { pitch: 16, fov: 26, dist: 21, row: 132, cutRow: 160, focusRow: 118, north: 1 },
  room: { pitch: 15, fov: 26, dist: 18, row: 132, cutRow: 160, focusRow: 118, north: 0.5 },
};

/** How far (2D px) kire 1's waver moves the place's rows, against the backdrop's own wave (×1.3 as in 2D). */
const WAVER_K = 0.4;

function poseFor(v: Hd2dView, f: FieldScene, desat = 0): StillPose {
  const room = roomMap(f.map.id);
  const c = room ? BATTLE_CAM.room : BATTLE_CAM.town;
  // a room keeps the 2D's framing across (centred, the halls panned); outdoors the battle is where
  // Minato is, kept off the map's sides (the place itself fills the frame, not what lies past it)
  let x = room ? v.target(f).x : (f.player.x + f.player.ox) / 16;
  if (!room) {
    const half = c.dist * Math.tan((c.fov * Math.PI) / 360) * (W / H);
    const mw = f.map.w;
    x = mw > half * 2 ? Math.max(half, Math.min(mw - half, x)) : mw / 2;
  }
  return { x, z: f.player.y / 16 - c.north, row: c.row, pitch: c.pitch, fov: c.fov, dist: c.dist, cutRow: c.cutRow, focusRow: c.focusRow, desat };
}

/** A copy of the canvas just drawn (into `into` when it's the same size). */
function copyOf(src: HTMLCanvasElement, into: HTMLCanvasElement | null): HTMLCanvasElement {
  let c = into;
  if (!c || c.width !== src.width || c.height !== src.height) [c] = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d')!;
  ctx.globalCompositeOperation = 'copy';
  ctx.drawImage(src, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  return c;
}

function release(c: HTMLCanvasElement | null): void {
  if (!c) return;
  c.width = 0;
  c.height = 0;
}

class Place implements PlaceView {
  private still: HTMLCanvasElement | null = null;
  private vivid: HTMLCanvasElement | null = null;
  private greyed: HTMLCanvasElement | null = null;
  /** The still laid again, shifted (shake, waver); its edges keep the last frame's. */
  private out: HTMLCanvasElement | null = null;
  private scratch: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
  private size = [0, 0];
  /** QA: how long the stills took (ms). */
  renderMs = 0;

  constructor(
    private readonly v: Hd2dView,
    private readonly f: FieldScene,
    private readonly alive: () => boolean,
  ) {
    this.render();
  }

  private render(): void {
    const d = game.screen.display;
    const t0 = performance.now();
    this.still = copyOf(this.v.still(this.f, d.width, d.height, poseFor(this.v, this.f)), this.still);
    this.vivid = copyOf(this.v.still(this.f, d.width, d.height, poseFor(this.v, this.f, -0.2)), this.vivid);
    this.renderMs = Math.round(performance.now() - t0);
    release(this.greyed);
    this.greyed = null;
    this.size = [d.width, d.height];
  }

  lay(g: Gfx, bg: Background): boolean {
    if (!this.alive() || !this.still) return false;
    const d = game.screen.display;
    if (d.width !== this.size[0] || d.height !== this.size[1]) {
      // (turned round, resized: the place again at the new size)
      try {
        this.render();
      } catch (e) {
        console.warn('[hd2d] battle place lost, 2D backdrop', e);
        return false;
      }
    }
    const ctx = g.ctx;
    // the stage's shake (scene.ts translates the buffer): the place goes with it
    const m = ctx.getTransform();
    const ox = Math.round(m.e);
    const oy = Math.round(m.f);
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.restore();
    const src = bg.kire >= 2 ? this.vivid! : this.still;
    const waver = bg.kire >= 1 ? waverOf(bg) : null;
    game.screen.underlay = ox || oy || waver ? this.shifted(src, ox, oy, waver) : src;
    return true;
  }

  /** The still laid again, `ox`, `oy` (2D px) off, its rows shifted by `waver`. */
  private shifted(src: HTMLCanvasElement, ox: number, oy: number, waver: ((y: number) => number) | null): HTMLCanvasElement {
    if (!this.out || this.out.width !== src.width || this.out.height !== src.height) this.out = copyOf(src, null);
    const c = this.out.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    const k = src.width / W;
    const w = src.width;
    if (!waver) {
      c.drawImage(src, Math.round(ox * k), Math.round(oy * k));
      return this.out;
    }
    // (the rows under the windows are the floor's: only the stage's are laid)
    const step = 2;
    for (let y = 0; y < BG_H + 4; y += step) {
      const sy = Math.round(y * k);
      const sh = Math.round((y + step) * k) - sy;
      c.drawImage(src, 0, sy, w, sh, Math.round((ox + waver(y)) * k), sy + Math.round(oy * k), w, sh);
    }
    return this.out;
  }

  grey(g: Gfx): void {
    if (!this.still) return;
    if (!this.greyed) {
      // as the 2D drains its frame (scene.ts drawFreeze)
      this.greyed = copyOf(this.still, null);
      const c = this.greyed.getContext('2d')!;
      c.globalCompositeOperation = 'saturation';
      c.globalAlpha = 0.85;
      c.fillStyle = '#808080';
      c.fillRect(0, 0, this.greyed.width, this.greyed.height);
      c.globalCompositeOperation = 'source-over';
      c.globalAlpha = 1;
    }
    game.screen.underlay = this.greyed;
    // the buffer's pictures (the enemies, the windows) drained the same; its clear part stays clear
    this.scratch ??= makeCanvas(W, H);
    const [sc, s] = this.scratch;
    const buf = g.ctx.canvas;
    s.globalAlpha = 1;
    s.globalCompositeOperation = 'copy';
    s.drawImage(buf, 0, 0);
    s.globalCompositeOperation = 'saturation';
    s.globalAlpha = 0.85;
    s.fillStyle = '#808080';
    s.fillRect(0, 0, W, H);
    s.globalAlpha = 1;
    s.globalCompositeOperation = 'destination-in';
    s.drawImage(buf, 0, 0);
    s.globalCompositeOperation = 'source-over';
    const ctx = g.ctx;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'copy';
    ctx.drawImage(sc, 0, 0);
    ctx.restore();
  }

  dispose(): void {
    if (active === this) active = null;
    for (const c of [this.still, this.vivid, this.greyed, this.out, this.scratch?.[0] ?? null]) release(c);
    this.still = this.vivid = this.greyed = this.out = null;
    this.scratch = null;
  }
}

/** Kire 1's waver of the place's rows (2D px), after the backdrop's own wave. */
function waverOf(bg: Background): (y: number) => number {
  const w = bg.wave;
  const T = bg.frozen ? bg.mt : bg.t;
  const a = WAVER_K * 1.3;
  return (y) => {
    let d = w.A * a * Math.sin(2 * Math.PI * (y / w.lambda + w.f * T));
    if (w.A2) d += w.A2 * a * Math.sin(2 * Math.PI * (y / w.lambda2 - w.f2 * T));
    return Math.round(d);
  };
}

let active: Place | null = null;

/**
 * index.ts: battles get their place while `drawn(f)` says the field below is
 * in HD-2D (hd2dField) and `view()` gives the WebGL view.
 */
export function installBattlePlaces(view: () => Hd2dView | null, drawn: (f: FieldScene) => boolean): void {
  setPlaceMaker((bgId) => {
    if (!PLACE_BGS.has(bgId)) return null;
    const f = field();
    if (!f || !game.scenes.includes(f) || !drawn(f)) return null;
    const v = view();
    if (!v) return null;
    active?.dispose();
    const p = new Place(v, f, () => drawn(f) && view() === v);
    active = p;
    return p;
  });
}

if (import.meta.env.DEV) {
  /** QA: the battle camera (outdoors / room); a battle started after this uses it. */
  registerDebug('hd2dBattleCam', (o?: { town?: Partial<typeof BATTLE_CAM.town>; room?: Partial<typeof BATTLE_CAM.room> }) => {
    if (o?.town) Object.assign(BATTLE_CAM.town, o.town);
    if (o?.room) Object.assign(BATTLE_CAM.room, o.room);
    return { ...BATTLE_CAM, renderMs: active?.renderMs ?? null };
  });
}
