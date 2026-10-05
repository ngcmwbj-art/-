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
import { SV, TownWorld } from './town';

export interface CamParams {
  /** Degrees down from the horizon. */
  pitch: number;
  /** Vertical field of view (degrees). */
  fov: number;
  /** Distance from the target (tiles). */
  dist: number;
}

export const CAM: CamParams = { pitch: 50, fov: 26, dist: 25 };

/** The evening's light (stage 0); the stage grade (post.ts) tints the rest. */
const SUN_COLOUR = new THREE.Color('#ffc890');
const SKY = new THREE.Color('#b8b0e8');
const GROUND = new THREE.Color('#d89060');
const MAX_LAMPS = 4;

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
}

export class Hd2dView {
  readonly canvas: HTMLCanvasElement;
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  private readonly sun: THREE.DirectionalLight;
  private readonly hemi: THREE.HemisphereLight;
  private readonly lamps: THREE.PointLight[] = [];
  private post: Post | null = null;
  private world: TownWorld | null = null;
  private worldMap = '';
  private worldF: FieldScene | null = null;
  private worldProps: unknown = null;
  private readonly actors = new ActorViews();
  private quality: Quality;
  private size = [0, 0];
  private readonly sunDir = new THREE.Vector3();
  private readonly tint = new THREE.Color();
  stats: FrameStats | null = null;
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
    this.renderer.info.autoReset = false;
    this.camera = new THREE.PerspectiveCamera(CAM.fov, W / H, 1, 160);
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

  private ensureWorld(f: FieldScene): TownWorld {
    // (a map loaded again — a warp, a door back — gives the field new props: build again)
    if (this.world && this.worldF === f && this.worldMap === f.map.id && this.worldProps === f.props) return this.world;
    if (this.world) {
      this.scene.remove(this.world.group);
      this.world.dispose();
    }
    this.actors.clear();
    const t0 = performance.now();
    this.world = new TownWorld(f);
    this.buildMs = performance.now() - t0;
    this.worldF = f;
    this.worldMap = f.map.id;
    this.worldProps = f.props;
    this.scene.add(this.world.group);
    const bg = new THREE.Color(f.map.def.outside ?? '#1b1733');
    this.scene.background = bg;
    this.scene.fog = new THREE.Fog(new THREE.Color('#e0a080'), 38, 130);
    return this.world;
  }

  /** Where the camera looks (world units on the ground). */
  target(f: FieldScene): THREE.Vector3 {
    return new THREE.Vector3((f.camX + W / 2) / 16, 0, (f.camY + H / 2) / 16);
  }

  private placeCamera(f: FieldScene): THREE.Vector3 {
    const t = this.target(f);
    const p = (CAM.pitch * Math.PI) / 180;
    this.camera.fov = CAM.fov;
    this.camera.aspect = W / H;
    this.camera.updateProjectionMatrix();
    this.camera.position.set(t.x, t.y + Math.sin(p) * CAM.dist, t.z + Math.cos(p) * CAM.dist);
    this.camera.lookAt(t);
    this.camera.updateMatrixWorld();
    return t;
  }

  /** The sun from the field's grade: shadows fall east and a little north, longer as shadowLen grows. */
  private placeSun(f: FieldScene, t: THREE.Vector3): number {
    const g = f.grade;
    const len = Math.max(0.4, g.shadowLen || 1.3);
    const el = Math.atan(1 / (len * 1.55));
    // towards the sun: west (2D shadows point +x) and a little south, so the
    // shop fronts (facing the camera) catch the low light
    const az = Math.atan2(0.42, -(g.sunX || 1));
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
    this.hemi.intensity = 1.7 * (1 - night * 0.6);
    return Math.atan2(d.x, d.z);
  }

  /** The few lamps nearest the target get a small warm point light. */
  private placeLamps(world: TownWorld, t: THREE.Vector3, lit: number): void {
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
      l.position.set(s.x, s.y, s.z);
      l.intensity = 2.2 * lit;
    }
  }

  render(f: FieldScene, dw: number, dh: number): void {
    const t0 = performance.now();
    const [w, h] = this.renderSize(dw, dh);
    if (!this.post || this.size[0] !== w || this.size[1] !== h) {
      this.renderer.setSize(w, h, false);
      if (!this.post) this.post = new Post(this.renderer, this.scene, this.camera, this.quality, w, h);
      else this.post.setSize(w, h);
      this.size = [w, h];
    }
    const world = this.ensureWorld(f);
    const tgt = this.placeCamera(f);
    const sunYaw = this.placeSun(f, tgt);
    const lit = f.map.def.kind === 'indoor' ? 1 : Math.max(0, Math.min(1, f.grade.lit));
    world.update(f.t, sunYaw, this.sunDir, lit, tgt.x, tgt.z, this.hidesParty(f));
    this.placeLamps(world, tgt, lit);
    // characters: drawn as painted, under the grade like everything else
    this.tint.setRGB(1.04, 1.0, 0.97);
    this.actors.update(f, sunYaw, this.tint, world, this.sunDir);
    // the tilt-shift's sharp row: where Minato stands on screen
    const foot = this.project(new THREE.Vector3((f.player.x + f.player.ox) / 16, 0.6, f.player.y / 16));
    const focus = foot ? Math.max(0.25, Math.min(0.75, 1 - foot[1] / H)) : 0.5;
    this.post!.setGrade(f.grade, f.wave.amp, f.wave.t / 1000, focus);
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
    };
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

  /** A world point (units) → buffer px of the 384×216 frame, or null behind the camera. */
  project(v: THREE.Vector3): [number, number] | null {
    const p = v.clone().project(this.camera);
    if (p.z > 1) return null;
    return [((p.x + 1) / 2) * W, ((1 - p.y) / 2) * H];
  }

  /** The head of an actor on screen (buffer px), for the emotes. */
  headOnScreen(a: Actor): [number, number] | null {
    const h = this.actors.head(a);
    return h ? this.project(h) : null;
  }

  dispose(): void {
    this.world?.dispose();
    this.actors.clear();
    this.post?.dispose();
    this.renderer.dispose();
  }
}
