// HD-2D prototype: the WebGL side. One offscreen canvas, one scene per field
// map (TownWorld), the characters (ActorViews), the evening light and the
// finish (post.ts). The picture is handed to engine/screen.ts as the
// underlay of the 2D buffer, so text, windows, the HUD and the touch
// controls stay exactly as they are.
//
// The camera follows the 2D camera's centre (FieldScene camX/camY), so its
// look-ahead, the dialog slide (people kept clear of the window), the
// scripted pans and the plaza locks all carry over; it looks down from the
// south like a handheld RPG's town view (HD-2D: a narrow lens, tilted).

import * as THREE from 'three';
import { H, W } from '../engine/screen';
import type { Actor } from '../world/actor';
import type { FieldScene } from '../world/field';
import { ActorViews } from './actors';
import { Post, type Quality } from './post';
import { recording, type Solid } from './overlap';
import { markShadowPass } from './solid';
import { placeOf } from './places';
import { PITCH, SKY_AT, SV, TownWorld } from './town';
import { ROOM_BG, RoomWorld, roomMap, roomPan } from './room';
import { bindView, shotLens } from './cut';

export interface CamParams {
  /** Degrees down from the horizon. */
  pitch: number;
  /** Vertical field of view (degrees). */
  fov: number;
  /** Distance from the target (tiles). */
  dist: number;
  /** How far north of the field's centre the camera looks (tiles): more of the street ahead, less of the roofs in front. */
  lookN: number;
}

export const CAM: CamParams = { pitch: PITCH, fov: 26, dist: 25, lookN: 1.5 };

/** The evening's light (stage 0); the stage grade (post.ts) tints the rest. */
const SUN_COLOUR = new THREE.Color('#ffc890');
const SKY = new THREE.Color('#b8b0e8');
const GROUND = new THREE.Color('#d89060');
const MAX_LAMPS = 4;
/**
 * Inside (the rooms, room.ts) the camera looks down a little more than in
 * the street (2026-10-06 依頼主「建物の中のカメラワークは少し上から目線で良い」):
 * ROOM_CAM.pitch instead of PITCH. Everything standing was made SV = tan(PITCH)
 * tall to keep its 2D proportions from PITCH; seen from ROOM_PITCH it is
 * stretched up by roomStretch() (the room's group and the people's, their
 * lamps and the points projected for the 2D's bubbles and fx with them), so
 * a room keeps its 2D proportions too. A battle's backdrop (still()) and the
 * ending's shots (cut.ts) have their own lenses and no stretch.
 */
export const ROOM_CAM = { pitch: 54 };
const roomStretch = (): number => Math.tan((ROOM_CAM.pitch * Math.PI) / 180) / Math.tan((PITCH * Math.PI) / 180);
/**
 * The sky light at night (the ending's town; 1.7 by day): white at π, so a
 * surface gives back its own colour, as the 2D's world is before its
 * grading — the grade's multiply then darkens it as in 2D.
 */
const NIGHT_SKY = Math.PI;
const WHITE = new THREE.Color('#ffffff');

/** A rect of the 384×216 frame: x, y, w, h (px). */
export type Crop = [number, number, number, number];

/** A battle's backdrop camera (Hd2dView.still, src/hd2d/battle.ts). */
export interface StillPose {
  /** The ground point the enemies stand on (units; at the ground's height there). */
  x: number;
  z: number;
  /** The frame row (px of 216) that point sits at. */
  row: number;
  /** Degrees down from the horizon, the lens (degrees), the distance to the point (units). */
  pitch: number;
  fov: number;
  dist: number;
  /** The frame row (px) where the ground is cut away (the diorama's front edge): all nearer is left out. */
  cutRow: number;
  /** The tilt-shift's sharp row (px). */
  focusRow: number;
  /** Added to the grade's colour drain (−0.2: kire 2's 20% more colour). */
  desat: number;
}

export interface FrameStats {
  /** CPU time of the whole 3D frame / of the scene update before rendering (ms). */
  ms: number;
  updateMs: number;
  calls: number;
  triangles: number;
  textures: number;
  programs: number;
  w: number;
  h: number;
  quality: Quality;
  buildMs: number;
  /** The last build's parts (ms). */
  build: Record<string, number>;
}

export class Hd2dView {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  /**
   * The same camera without a close-up's crop: what the 2D layer's frame
   * px mean (the world fx, the emotes and the close-up itself are laid out
   * in it; a close-up then blows up a rect of both pictures alike).
   */
  private readonly eye: THREE.PerspectiveCamera;
  private readonly sun: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly lamps: THREE.PointLight[] = [];
  private post: Post | null = null;
  private world: TownWorld | RoomWorld | null = null;
  private worldMap = '';
  private worldF: FieldScene | null = null;
  private worldProps: unknown = null;
  private readonly actors = new ActorViews();
  private quality: Quality;
  private size = [0, 0];
  private readonly sunDir = new THREE.Vector3();
  /** The town's sky light colours before the night (placeSun turns them white as it comes). */
  private readonly dayHemi = [SKY.clone(), GROUND.clone()];
  private readonly tint = new THREE.Color();
  stats: FrameStats | null = null;
  /** The up-stretch of this frame's world and people (roomStretch() inside, else 1). */
  private stretch = 1;
  /** How long the last map took to stand up in 3D (ms). */
  buildMs = 0;

  constructor(quality: Quality) {
    this.quality = quality;
    this.canvas = document.createElement('canvas');
    this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: false, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: false });
    this.renderer.setPixelRatio(1);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.NoToneMapping;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFShadowMap;
    // (shadow planes are drawn into the shadow map only: solid.ts shadowOnly)
    markShadowPass(this.renderer.shadowMap);
    this.renderer.info.autoReset = false;
    this.camera = new THREE.PerspectiveCamera(CAM.fov, W / H, 1, 160);
    this.eye = this.camera.clone();
    this.sun = new THREE.DirectionalLight(SUN_COLOUR, 2.6);
    this.sun.castShadow = true;
    this.hemi = new THREE.HemisphereLight(SKY, GROUND, 1.7);
    this.scene.add(this.sun, this.sun.target, this.hemi, this.actors.group);
    for (let i = 0; i < MAX_LAMPS; i++) {
      const l = new THREE.PointLight('#ffb468', 0, 4.5, 1.6);
      this.lamps.push(l);
      this.scene.add(l);
    }
    this.applyQuality();
    // (the ending's shots and its night town: cut.ts)
    bindView(this, CAM);
  }

  private applyQuality(): void {
    const s = this.sun.shadow;
    const n = this.quality === 'normal' ? 2048 : 1024;
    if (s.mapSize.x !== n) {
      s.mapSize.set(n, n);
      s.map?.dispose();
      s.map = null;
    }
    s.bias = -0.0004;
    s.normalBias = 0.03;
    s.radius = this.quality === 'normal' ? 2 : 1;
    const c = s.camera;
    c.left = -18;
    c.right = 18;
    c.top = 16;
    c.bottom = -16;
    c.near = 1;
    c.far = 90;
    c.updateProjectionMatrix();
    this.post?.dispose();
    this.post = null;
    this.size = [0, 0];
  }

  setQuality(q: Quality): void {
    if (q === this.quality) return;
    this.quality = q;
    this.applyQuality();
  }

  getQuality(): Quality {
    return this.quality;
  }

  /** The render size for a display canvas of dw × dh (light: half, both capped). */
  private renderSize(dw: number, dh: number): [number, number] {
    const cap = this.quality === 'normal' ? 1920 : 960;
    let k = Math.min(1, cap / dw);
    if (this.quality === 'light') k = Math.min(k, 0.5);
    const w = Math.max(W, Math.round(dw * k));
    return [w, Math.round((w * H) / W)];
  }

  private ensureWorld(f: FieldScene): TownWorld | RoomWorld {
    // (a map loaded again — a warp, a door back — gives the field new props: build again)
    if (this.world && this.worldF === f && this.worldMap === f.map.id && this.worldProps === f.props) return this.world;
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.dispose();
    }
    this.actors.clear();
    const t0 = performance.now();
    // (a room of chapter 1: room.ts)
    const room = roomMap(f.map.id);
    this.world = room ? new RoomWorld(f, this.quality === 'light') : new TownWorld(f, this.quality === 'light');
    this.buildMs = performance.now() - t0;
    this.worldF = f;
    this.worldMap = f.map.id;
    this.worldProps = f.props;
    this.scene.add(this.world.group);
    const bg = new THREE.Color(f.map.def.outside ?? (room ? ROOM_BG : '#1b1733'));
    this.scene.background = bg;
    this.scene.fog = room ? null : new THREE.Fog(new THREE.Color('#e0a080'), 38, 130);
    return this.world;
  }

  /** Where the camera looks (world units on the ground). */
  target(f: FieldScene, lookN = CAM.lookN): THREE.Vector3 {
    // (a room: where the 2D camera centres it or stops, no look ahead; a
    // hall wider than the 3D frame follows Minato across, room.ts roomPan)
    const room = roomMap(f.map.id);
    return new THREE.Vector3((f.camX + W / 2) / 16 + (room ? roomPan(f) : 0), 0, (f.camY + H / 2) / 16 - (room ? 0 : lookN));
  }

  /**
   * `crop`: a story close-up (events/stage.ts ZoomView) — the rect of the
   * frame (W × H px, fractional while it pushes in) that fills the picture:
   * the camera stays where it is and narrows to it, as the 2D blow-up does.
   */
  private placeCamera(f: FieldScene, crop: Crop | null): THREE.Vector3 {
    // (a shot of the ending: its own lens, aimed `lift` over the ground — cut.ts)
    const shot = shotLens(f);
    const cam = shot ?? CAM;
    const lift = shot?.lift ?? 0;
    const t = this.target(f, cam.lookN);
    // (inside: from a little higher, the room stretched up to match — ROOM_CAM)
    const inside = !shot && !!roomMap(f.map.id);
    this.setStretch(inside ? roomStretch() : 1);
    const p = ((inside ? ROOM_CAM.pitch : cam.pitch) * Math.PI) / 180;
    for (const c of [this.eye, this.camera]) {
      c.fov = cam.fov;
      c.aspect = W / H;
      c.position.set(t.x, t.y + lift + Math.sin(p) * cam.dist, t.z + Math.cos(p) * cam.dist);
      c.lookAt(t.x, t.y + lift, t.z);
      c.updateMatrixWorld();
    }
    this.eye.clearViewOffset();
    if (crop) this.camera.setViewOffset(W, H, crop[0], crop[1], crop[2], crop[3]);
    else this.camera.clearViewOffset();
    return t;
  }

  /** The sun from the field's grade: shadows fall east and a little north, longer as shadowLen grows. */
  private placeSun(f: FieldScene, t: THREE.Vector3): number {
    const g = f.grade;
    const len = Math.max(0.4, g.shadowLen || 1.3);
    let el = Math.atan(1 / (len * 1.55));
    // towards the sun: west (2D shadows point +x) and a little south, so the
    // shop fronts (facing the camera) catch the low light
    let az = Math.atan2(0.42, -(g.sunX || 1));
    // a place that fixes where its shadows point (MapDef.shadowVec): the sun
    // opposite them, as high as their 2D length says — the roof straight
    // down the screen; the school in stage 2 swung from the evening's
    // direction as far as the 2D swings it (east → north-east), so the turn
    // shows in 3D too (places.ts shadowSwing)
    const fixed = f.map.def.shadowVec;
    if (fixed) {
      const l = Math.hypot(fixed[0], fixed[1]) || 1;
      let th = Math.atan2(fixed[1], fixed[0]);
      if (placeOf(f.map.id).shadowSwing) th = Math.atan2(-0.42, g.sunX || 1) + (th - Math.atan2(0.25, g.sunX || 1));
      az = th + Math.PI;
      el = Math.atan(SV / (len * l * 1.27));
    }
    const d = this.sunDir.set(Math.cos(az) * Math.cos(el), Math.sin(el), Math.sin(az) * Math.cos(el)).normalize();
    // keep the shadow map steady while walking: snap the box to its texels
    const step = 36 / this.sun.shadow.mapSize.x;
    const sx = Math.round(t.x / step) * step;
    const sz = Math.round(t.z / step) * step;
    this.sun.target.position.set(sx, 0, sz - 2);
    this.sun.position.set(sx + d.x * 40, d.y * 40, sz - 2 + d.z * 40);
    this.sun.target.updateMatrixWorld();
    const night = g.night;
    this.sun.intensity = 2.6 * (1 - night);
    // (at night — chapter 1's is the ending's — the grade darkens the picture as
    // in 2D, and the 2D's lamp pools light the ground: cut_night.ts; the sky's
    // light no longer drops on top of that: it turns white, NIGHT_SKY. Its
    // colours by day are kept as they were, whatever set them)
    if (night <= 0) {
      this.dayHemi[0].copy(this.hemi.color);
      this.dayHemi[1].copy(this.hemi.groundColor);
    } else {
      this.hemi.color.copy(this.dayHemi[0]).lerp(WHITE, night);
      this.hemi.groundColor.copy(this.dayHemi[1]).lerp(WHITE, night);
    }
    this.hemi.intensity = 1.7 * (1 - night) + NIGHT_SKY * night;
    return Math.atan2(d.x, d.z);
  }

  /** Stretch the world and the people up by k (ROOM_CAM). */
  private setStretch(k: number): void {
    this.stretch = k;
    if (this.world) this.world.group.scale.y = k;
    this.actors.group.scale.y = k;
  }

  /** The few lamps nearest the target get a small warm point light. */
  private placeLamps(world: TownWorld | RoomWorld, t: THREE.Vector3, lit: number): void {
    const spots = world.spots
      .filter((s) => s.p.present && Math.abs(s.x - t.x) < 14 && Math.abs(s.z - t.z) < 10)
      .sort((a, b) => Math.hypot(a.x - t.x, a.z - t.z) - Math.hypot(b.x - t.x, b.z - t.z));
    // (the lights stay in the scene, dark when unused: a change in their number
    // would rebuild every shader; light quality has none at all)
    const on = this.quality === 'normal';
    for (let i = 0; i < MAX_LAMPS; i++) {
      const l = this.lamps[i];
      l.visible = on;
      const s = spots[i];
      if (!on || !s) {
        l.intensity = 0;
        continue;
      }
      l.position.set(s.x, s.y * this.stretch, s.z);
      // (a room: faint by day, as the 2D's lamps throw no light then; strong at night)
      l.intensity = 2.2 * lit * (world instanceof RoomWorld ? world.lampK() : 1);
    }
  }

  /** `crop`: a close-up's rect of the frame and the frame px it looks at (placeCamera). */
  render(f: FieldScene, dw: number, dh: number, crop: Crop | null = null, subject: [number, number] | null = null): void {
    const t0 = performance.now();
    const [w, h] = this.renderSize(dw, dh);
    if (!this.post || this.size[0] !== w || this.size[1] !== h) {
      this.renderer.setSize(w, h, false);
      if (!this.post) this.post = new Post(this.renderer, this.scene, this.camera, this.quality, w, h);
      else this.post.setSize(w, h);
      this.size = [w, h];
    }
    const world = this.ensureWorld(f);
    const tgt = this.placeCamera(f, crop);
    // (a room: its ceiling light instead of the evening sun, room.ts)
    const sunYaw = world instanceof RoomWorld ? world.light(this.sun, this.hemi, tgt, this.sunDir) : this.placeSun(f, tgt);
    const lit = f.map.def.kind === 'indoor' ? 1 : Math.max(0, Math.min(1, f.grade.lit));
    world.update(f.t, sunYaw, this.sunDir, lit, tgt.x, tgt.z, this.hidesParty(f));
    this.placeLamps(world, tgt, lit);
    // characters: drawn as painted, under the grade like everything else
    this.tint.setRGB(1.04, 1.0, 0.97);
    this.actors.update(f, sunYaw, this.tint, world, this.sunDir);
    // the tilt-shift's sharp row: where Minato stands on screen (in a
    // close-up, what it looks at)
    const foot = subject ?? this.project(new THREE.Vector3((f.player.x + f.player.ox) / 16, 0.6, f.player.y / 16));
    const fy = foot && crop ? ((foot[1] - crop[1]) / crop[3]) * H : foot?.[1];
    const focus = fy !== undefined ? Math.max(0.25, Math.min(0.75, 1 - fy / H)) : 0.5;
    this.post!.setGrade(world instanceof RoomWorld ? world.grade() : f.grade, f.wave.amp, f.wave.t / 1000, focus);
    // (inside, no tilt-shift blur: the whole room sharp)
    this.post!.setTilt(!(world instanceof RoomWorld));
    const t1 = performance.now();
    this.renderer.info.reset();
    this.post!.render();
    const info = this.renderer.info;
    this.stats = {
      ms: performance.now() - t0,
      updateMs: t1 - t0,
      calls: info.render.calls,
      triangles: info.render.triangles,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      w,
      h,
      quality: this.quality,
      buildMs: Math.round(this.buildMs),
      build: world.buildParts,
    };
  }

  /**
   * A battle's backdrop (src/hd2d/battle.ts): field f's place from a lower
   * camera (pose), without its people, nothing see-through, the part nearer
   * than the cut row left out — rendered once; the caller copies `canvas`
   * at once. The field's next frame puts its own camera and people back.
   */
  still(f: FieldScene, dw: number, dh: number, pose: StillPose): HTMLCanvasElement {
    const t0 = performance.now();
    const [w, h] = this.renderSize(dw, dh);
    if (!this.post || this.size[0] !== w || this.size[1] !== h) {
      this.renderer.setSize(w, h, false);
      if (!this.post) this.post = new Post(this.renderer, this.scene, this.camera, this.quality, w, h);
      else this.post.setSize(w, h);
      this.size = [w, h];
    }
    const world = this.ensureWorld(f);
    this.setStretch(1);
    const at = new THREE.Vector3(pose.x, world.heightAt(pose.x, pose.z), pose.z);
    // `dist` from the point at `pitch`, the view turned up so the point sits at `row`
    const c = this.camera;
    const tanHalf = Math.tan((pose.fov * Math.PI) / 360);
    const below = (row: number) => Math.atan(((row - H / 2) / (H / 2)) * tanHalf);
    const p = (pose.pitch * Math.PI) / 180;
    const axis = p - below(pose.row);
    c.fov = pose.fov;
    c.aspect = W / H;
    c.position.set(at.x, at.y + Math.sin(p) * pose.dist, at.z + Math.cos(p) * pose.dist);
    c.lookAt(c.position.x, c.position.y - Math.sin(axis), c.position.z - Math.cos(axis));
    // the diorama's front edge: the ground seen at cutRow and all that stands nearer are left out
    const a = axis + below(pose.cutRow);
    c.near = a > 0.02 ? Math.max(1, ((c.position.y - at.y) / Math.sin(a)) * Math.cos(a - axis)) : 1;
    c.clearViewOffset();
    c.updateMatrixWorld();
    const sunYaw = world instanceof RoomWorld ? world.light(this.sun, this.hemi, at, this.sunDir) : this.placeSun(f, at);
    const lit = f.map.def.kind === 'indoor' ? 1 : Math.max(0, Math.min(1, f.grade.lit));
    // (the roof's far sky: hung where this lower camera looks past the fence, its middle at row 64)
    if (world instanceof TownWorld) world.skyY = c.position.y - Math.tan(axis + below(64)) * (c.position.z - (at.z - SKY_AT.d));
    world.update(f.t, sunYaw, this.sunDir, lit, at.x, at.z, () => false);
    if (world instanceof TownWorld) world.skyY = null;
    for (const cu of world.cutouts) cu.opaque();
    this.placeLamps(world, at, lit);
    this.actors.group.visible = false;
    const g = world instanceof RoomWorld ? world.grade() : f.grade;
    this.post!.setGrade({ ...g, desat: g.desat + pose.desat }, 0, 0, 1 - pose.focusRow / H);
    // (a battle's backdrop keeps its blur, inside too)
    this.post!.setTilt(true);
    const t1 = performance.now();
    this.renderer.info.reset();
    try {
      this.post!.render();
    } finally {
      this.actors.group.visible = true;
      c.near = 1;
      c.updateProjectionMatrix();
    }
    const info = this.renderer.info;
    this.stats = {
      ms: performance.now() - t0,
      updateMs: t1 - t0,
      calls: info.render.calls,
      triangles: info.render.triangles,
      textures: info.memory.textures,
      programs: info.programs?.length ?? 0,
      w,
      h,
      quality: this.quality,
      buildMs: Math.round(this.buildMs),
      build: world.buildParts,
    };
    return this.canvas;
  }

  /**
   * Right after still(): the same view as a silhouette — no people, no fog,
   * no finish, `key` where it sees no town (the ending's night town cuts its
   * sky away with it, cut.ts). The caller copies `canvas` at once.
   */
  silhouette(key: THREE.Color): HTMLCanvasElement {
    const bg = this.scene.background;
    const fog = this.scene.fog;
    this.scene.background = key;
    this.scene.fog = null;
    this.actors.group.visible = false;
    try {
      this.renderer.setRenderTarget(null);
      this.renderer.render(this.scene, this.camera);
    } finally {
      this.scene.background = bg;
      this.scene.fog = fog;
      this.actors.group.visible = true;
    }
    return this.canvas;
  }

  /**
   * A test for standing rects (x0, x1, bottom, top, z in units): does it
   * stand in front of Minato or the follower and cover a fair part of them
   * on screen?
   */
  private hidesParty(f: FieldScene): (r: [number, number, number, number, number]) => boolean {
    const boxes: { z: number; b: [number, number, number, number] }[] = [];
    const v = new THREE.Vector3();
    const proj = (x: number, y: number, z: number): [number, number] => {
      v.set(x, y, z).project(this.camera);
      return [v.x, v.y];
    };
    for (const a of [f.player, f.follower]) {
      if (!a || !a.visible) continue;
      const x = (a.x + a.ox) / 16;
      const z = a.y / 16;
      const img = a.frame();
      const hw = (img.width / 16) * 0.32;
      const ht = (img.height / 16) * SV * 0.9;
      const p0 = proj(x - hw, 0.1, z);
      const p1 = proj(x + hw, ht, z);
      boxes.push({ z, b: [p0[0], p0[1], p1[0], p1[1]] });
    }
    return (r) => {
      for (const s of boxes) {
        if (r[4] <= s.z + 0.05 || r[4] > s.z + 6) continue;
        const p0 = proj(r[0], r[2], r[4]);
        const p1 = proj(r[1], r[3], r[4]);
        const ox = Math.min(p1[0], s.b[2]) - Math.max(p0[0], s.b[0]);
        const oy = Math.min(p1[1], s.b[3]) - Math.max(p0[1], s.b[1]);
        if (ox <= 0 || oy <= 0) continue;
        const area = (s.b[2] - s.b[0]) * (s.b[3] - s.b[1]);
        if ((ox * oy) / Math.max(1e-6, area) > 0.12) return true;
      }
      return false;
    };
  }

  /** QA: stand the town up again (a tuning changed). */
  rebuild(): void {
    this.worldF = null;
  }

  /** QA: the room every solid of field f's town takes (overlap.ts): the town is stood up again, noting it, the first time. */
  solids(f: FieldScene): Solid[] {
    if (!recording.on) {
      recording.on = true;
      this.worldF = null;
    }
    return this.ensureWorld(f).solids;
  }

  /** QA: meshes in the scene / in the camera's frustum / casting shadows / shadow-only planes. */
  census(): Record<string, number> {
    const fr = new THREE.Frustum().setFromProjectionMatrix(new THREE.Matrix4().multiplyMatrices(this.camera.projectionMatrix, this.camera.matrixWorldInverse));
    const c = { meshes: 0, inView: 0, casters: 0, shadowOnly: 0, shadowOnlyInView: 0 };
    this.scene.traverseVisible((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      c.meshes++;
      const inView = fr.intersectsObject(o);
      if (inView) c.inView++;
      if (o.castShadow) c.casters++;
      if ((o.material as THREE.Material).colorWrite === false) {
        c.shadowOnly++;
        if (inView) c.shadowOnlyInView++;
      }
    });
    return c;
  }

  /** A world point (units) → buffer px of the 384×216 frame (no close-up's crop), or null behind the camera. */
  project(v: THREE.Vector3): [number, number] | null {
    const p = v.clone().project(this.eye);
    if (p.z > 1) return null;
    return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
  }

  /**
   * World px (x, y) of a 2D picture, a point standing over the ground line
   * `foot` (world y) → frame px: the 3D point it stands for is at the foot
   * line, (foot − y) px up (stretched by SV as everything that stands), on
   * the ground's step there.
   */
  projectPx(x: number, y: number, foot = y): [number, number] | null {
    // (a point south of the foot line lies on the ground in front of it)
    const z = Math.max(y, foot);
    const ground = this.world ? this.world.heightAt(x / 16, (z - 1) / 16) : 0;
    return this.project(new THREE.Vector3(x / 16, (ground + (z - y) * (SV / 16)) * this.stretch, z / 16));
  }

  /** The head of an actor on screen (buffer px), for the emotes. */
  headOnScreen(a: Actor): [number, number] | null {
    const h = this.actors.head(a);
    if (h) h.y *= this.stretch;
    return h ? this.project(h) : null;
  }

  dispose(): void {
    this.world?.dispose();
    this.actors.clear();
    this.post?.dispose();
    this.renderer.dispose();
  }
}
