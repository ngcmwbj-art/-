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
//
// Chapter 2 (2026-10-06, 依頼主「第２章もHD-2Dにしてみよう」): its battles
// (bg_h_*) stand on the 3D village or room at night too. Outdoors, where
// the low camera sees past the land, the backdrop's own painted night sky
// (its bands, Milky Way, far ridges and lights: Background.paintPlaceSky)
// shows where the place has no land: the still is drawn once more as a
// silhouette against a key colour (Hd2dView.silhouette, its front edge cut as
// the still's), read back at half size into an alpha mask, and the sky, cut
// to it, is laid over the still again every SKY_STEP ms (the far lights, the
// dawn's edge; the stars twinkle on the 2D side, in that sky only: isSky).
// The far land fades into the sky's haze.

import * as THREE from 'three';
import { game } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import { H, W } from '../engine/screen';
import { registerDebug } from '../debug';
import { field, type FieldScene } from '../world/field';
import { setPlaceMaker, type PlaceView } from '../battle/bg/place';
import { BG_H, type Background } from '../battle/bg/common';
import { BG_IDS } from '../battle/bg';
import type { Hd2dView, StillPose } from './view';
import { roomMap } from './room';

/** The backdrops that become the place: chapter 1's, and since 2026-10-06 chapter 2's (bg_h_*): all of them. */
const PLACE_BGS = new Set(BG_IDS);
/** How often (ms of the backdrop's time) the painted sky is laid under the place again. */
const SKY_STEP = 125;
/** Where the silhouette pass sees no land: a key no picture has. */
export const KEY = new THREE.Color(0, 1, 0);

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
  /** Chapter 2 outdoors: the painted sky (2D px), laid over the still where it shows sky every SKY_STEP. */
  private sky: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
  /** Where the still shows sky (alpha, at half the still's size) and the painted sky cut to it. */
  private skyAlpha: HTMLCanvasElement | null = null;
  private skyCut: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
  private flat: HTMLCanvasElement | null = null;
  private flatKey = '';
  /** The last picture laid unshifted (the standstill drains it). */
  private laid: HTMLCanvasElement | null = null;
  /** Where the place shows sky, per 2D px (1). */
  private skyMask: Uint8Array | null = null;
  /** The still's camera (what the backdrop pins to the place is projected with it). */
  private cam: THREE.PerspectiveCamera | null = null;
  /** QA: how long the stills took (ms). */
  renderMs = 0;

  constructor(
    private readonly v: Hd2dView,
    private readonly f: FieldScene,
    private readonly alive: () => boolean,
    /** The backdrop paints a night sky behind the place (chapter 2 outdoors). */
    private readonly bg: Background,
    private readonly painted: boolean,
  ) {
    this.render();
  }

  private render(): void {
    const d = game.screen.display;
    const t0 = performance.now();
    const v = this.v;
    const haze = this.painted ? this.bg.placeHaze() : null;
    const fog = v.scene.fog;
    if (haze) v.scene.fog = new THREE.Fog(new THREE.Color(haze), 24, 110);
    let key: ImageData | null = null;
    const draw = () => {
      this.still = copyOf(v.still(this.f, d.width, d.height, poseFor(v, this.f)), this.still);
      this.cam = v.camera.clone();
      if (this.painted) {
        // (read back at half the size: light on the GPU's sync and the loop; the sky's edge is the still's far, blurred line)
        const k = v.silhouette(KEY, true);
        const [kc, kx] = makeCanvas(Math.ceil(k.width / 2), Math.ceil(k.height / 2), { willReadFrequently: true });
        kx.imageSmoothingEnabled = false;
        kx.drawImage(k, 0, 0, kc.width, kc.height);
        key = kx.getImageData(0, 0, kc.width, kc.height);
        release(kc);
      }
      this.vivid = copyOf(v.still(this.f, d.width, d.height, poseFor(v, this.f, -0.2)), this.vivid);
    };
    // (a prop that is the enemy itself is left out: the loudspeaker on the hill)
    const leave = this.bg.placeLeaves();
    const left = leave.length ? this.f.props.filter((p) => p.present && p.obj.t === 'prop' && leave.includes((p.obj as { prop?: string }).prop ?? '')) : [];
    for (const p of left) p.present = false;
    try {
      // (the backdrop's own sky goes where the 3D's sky planes would hang)
      if (this.painted) withoutSkyBackdrops(v.scene, draw);
      else draw();
    } finally {
      v.scene.fog = fog;
      for (const p of left) p.present = true;
    }
    release(this.skyAlpha);
    this.skyAlpha = null;
    if (key) {
      this.skyAlpha = alphaOfKey(key);
      this.skyMask = maskOf(key);
    } else this.skyMask = null;
    this.renderMs = Math.round(performance.now() - t0);
    release(this.greyed);
    this.greyed = null;
    this.flatKey = '';
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
    const src = this.flatFor(bg);
    this.laid = src;
    const waver = bg.kire >= 1 ? waverOf(bg) : null;
    game.screen.underlay = ox || oy || waver ? this.shifted(src, ox, oy, waver) : src;
    return true;
  }

  /** The still (kire 2's colour: the vivid one), with the backdrop's painted sky where it shows sky. */
  private flatFor(bg: Background): HTMLCanvasElement {
    const vivid = bg.kire >= 2;
    const src = vivid ? this.vivid! : this.still!;
    const alpha = this.skyAlpha;
    if (!this.skyMask || !alpha) return src;
    const step = Math.floor((bg.mt * 1000) / SKY_STEP);
    const key = `${step}|${vivid ? 1 : 0}`;
    if (this.flat && this.flatKey === key && this.flat.width === src.width && this.flat.height === src.height) return this.flat;
    this.flatKey = key;
    this.sky ??= makeCanvas(W, H);
    const [sc, s] = this.sky;
    s.fillStyle = bg.bottom;
    s.fillRect(0, 0, W, H);
    if (!bg.paintPlaceSky(s, step * (SKY_STEP / 1000))) return src;
    if (vivid) {
      // (kire 2: the sky 20% more coloured too, as the 2D's)
      s.filter = 'saturate(1.2)';
      s.drawImage(sc, 0, 0);
      s.filter = 'none';
    }
    // the sky cut to where the still sees no land (at the mask's size), then laid over the still
    if (!this.skyCut || this.skyCut[0].width !== alpha.width || this.skyCut[0].height !== alpha.height) this.skyCut = makeCanvas(alpha.width, alpha.height);
    const [kc, k] = this.skyCut;
    k.imageSmoothingEnabled = false;
    k.globalCompositeOperation = 'copy';
    k.drawImage(sc, 0, 0, kc.width, kc.height);
    k.globalCompositeOperation = 'destination-in';
    k.drawImage(alpha, 0, 0);
    k.globalCompositeOperation = 'source-over';
    if (!this.flat || this.flat.width !== src.width || this.flat.height !== src.height) [this.flat] = makeCanvas(src.width, src.height);
    const c = this.flat.getContext('2d')!;
    c.imageSmoothingEnabled = false;
    c.globalCompositeOperation = 'copy';
    c.drawImage(src, 0, 0);
    c.globalCompositeOperation = 'source-over';
    c.drawImage(kc, 0, 0, src.width, src.height);
    return this.flat;
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
      this.greyed = copyOf(this.laid ?? this.still, null);
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

  isSky(x: number, y: number): boolean {
    const m = this.skyMask;
    if (!m) return false;
    const xi = Math.round(x);
    const yi = Math.round(y);
    return xi >= 0 && yi >= 0 && xi < W && yi < H && m[yi * W + xi] === 1;
  }

  project(x: number, y: number, foot = y): [number, number] | null {
    return this.cam ? this.v.projectWith(this.cam, x, y, foot) : null;
  }

  dispose(): void {
    if (active === this) active = null;
    for (const c of [this.still, this.vivid, this.greyed, this.out, this.flat, this.scratch?.[0] ?? null, this.sky?.[0] ?? null, this.skyAlpha, this.skyCut?.[0] ?? null]) release(c);
    this.still = this.vivid = this.greyed = this.out = this.flat = this.laid = this.skyAlpha = null;
    this.scratch = this.sky = this.skyCut = null;
    this.skyMask = null;
  }
}

/**
 * Run `fn` with the 3D sky's backdrops hidden — the far sky planes hung
 * behind a place (the roof's evening sky, 星見台's night sky over the
 * hilltops: outskirts.ts, drawn first and without fog) — so a painted sky
 * goes there instead (a chapter-2 battle's own sky, the sunrise's dawn).
 */
export function withoutSkyBackdrops<T>(scene: THREE.Scene, fn: () => T): T {
  const hidden: THREE.Object3D[] = [];
  scene.traverse((o) => {
    if (!(o instanceof THREE.Mesh) || !o.visible || o.renderOrder !== -1) return;
    const m = o.material as THREE.Material & { fog?: boolean };
    if (m.fog !== false) return;
    o.visible = false;
    hidden.push(o);
  });
  try {
    return fn();
  } finally {
    for (const o of hidden) o.visible = true;
  }
}

/** The key's px (the silhouette pass: where the place sees no land). */
const isKey = (d: Uint8ClampedArray, i: number) => d[i] < 24 && d[i + 1] > 230 && d[i + 2] < 24;

/** The still's sky made clear (the painted sky goes under it; chapter 2's sunrise too, cut_ch2.ts). */
export function clearSky(c: HTMLCanvasElement | null, key: ImageData): void {
  if (!c || c.width !== key.width || c.height !== key.height) return;
  const ctx = c.getContext('2d', { willReadFrequently: true })!;
  const img = ctx.getImageData(0, 0, c.width, c.height);
  const px = img.data;
  const k = key.data;
  for (let i = 0; i < px.length; i += 4) if (isKey(k, i)) px[i + 3] = 0;
  ctx.putImageData(img, 0, 0);
}

/** The key's sky as an alpha mask the size of the key (opaque where the place sees no land). */
function alphaOfKey(key: ImageData): HTMLCanvasElement {
  const [c, ctx] = makeCanvas(key.width, key.height);
  const img = ctx.createImageData(key.width, key.height);
  const k = key.data;
  const o = img.data;
  for (let i = 0; i < k.length; i += 4) if (isKey(k, i)) o[i + 3] = 255;
  ctx.putImageData(img, 0, 0);
  return c;
}

/** Where the place shows sky, sampled at each 2D px's centre (1: sky). */
export function maskOf(key: ImageData): Uint8Array {
  const m = new Uint8Array(W * H);
  const kx = key.width / W;
  const ky = key.height / H;
  for (let y = 0; y < H; y++) {
    const sy = Math.min(key.height - 1, Math.floor((y + 0.5) * ky));
    for (let x = 0; x < W; x++) {
      const sx = Math.min(key.width - 1, Math.floor((x + 0.5) * kx));
      if (isKey(key.data, (sy * key.width + sx) * 4)) m[y * W + x] = 1;
    }
  }
  return m;
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

let skyProbe: CanvasRenderingContext2D | null = null;
/** A 2D canvas to ask a backdrop whether it paints a sky (paintPlaceSky's answer). */
function scratchSky(): CanvasRenderingContext2D {
  skyProbe ??= makeCanvas(W, H)[1];
  return skyProbe;
}

/**
 * index.ts: battles get their place while `drawn(f)` says the field below is
 * in HD-2D (hd2dField) and `view()` gives the WebGL view.
 */
export function installBattlePlaces(view: () => Hd2dView | null, drawn: (f: FieldScene) => boolean): void {
  setPlaceMaker((bgId, _enemyId, bg) => {
    if (!PLACE_BGS.has(bgId)) return null;
    const f = field();
    if (!f || !game.scenes.includes(f) || !drawn(f)) return null;
    const v = view();
    if (!v) return null;
    active?.dispose();
    // (a painted sky outdoors only: a room's walls stand all round)
    const sky = !roomMap(f.map.id) && bg.paintPlaceSky(scratchSky(), 0);
    const p = new Place(v, f, () => drawn(f) && view() === v, bg, sky);
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
