// HD-2D prototype: the people (and cats, symbols...) as standing pictures.
// Each character is its current 2D frame on an upright plane facing the
// camera — walking, turning and every pose stay the 2D animation — with a
// soft round shadow at its feet and a long evening shadow: a second plane
// with the same picture, turned to face the sun, that only casts shadow.
// Characters are not lit by the 3D lights (their pixel colours stay as
// drawn); one standing in a building's shadow is tinted darker. An actor
// that draws itself (drawFn: the traffic, the stray carts) is drawn into a
// picture of its own each frame; a shadow that lags (the cat, fushigi_02:
// data.shadowFrame) is cast from that frame.

import * as THREE from 'three';
import { Gfx } from '../engine/gfx';
import type { Actor } from '../world/actor';
import type { FieldScene } from '../world/field';
import { shadowOnly } from './solid';
import { casterMaterial, pixelTexture, SHADE, SV, type TownWorld } from './town';

/** What the characters ask of the 3D map they stand in (the town, or a room: room.ts RoomWorld). */
type Ground3D = Pick<TownWorld, 'heightAt' | 'boxAt' | 'inShadow'> & {
  /** How lit someone standing at (x, z) is (a room at night: dark but for the lamps' pools, as the 2D's light map). */
  lightAt?(x: number, z: number): number;
};

const PX = 1 / 16;
const texCache = new WeakMap<HTMLCanvasElement, THREE.CanvasTexture>();

function texOf(c: HTMLCanvasElement): THREE.CanvasTexture {
  let t = texCache.get(c);
  if (!t) {
    t = pixelTexture(c);
    texCache.set(c, t);
  }
  return t;
}

let blobTex: THREE.CanvasTexture | null = null;
/** A soft dark ellipse (the contact shadow). */
function blob(): THREE.CanvasTexture {
  if (blobTex) return blobTex;
  const c = document.createElement('canvas');
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext('2d')!;
  const g = ctx.createRadialGradient(32, 32, 4, 32, 32, 31);
  g.addColorStop(0, 'rgba(40,26,52,0.9)');
  g.addColorStop(0.55, 'rgba(40,26,52,0.55)');
  g.addColorStop(1, 'rgba(40,26,52,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  blobTex = new THREE.CanvasTexture(c);
  blobTex.colorSpace = THREE.SRGBColorSpace;
  return blobTex;
}

/** The picture of an actor that draws itself: DRAWN_W × DRAWN_H, its feet at (DRAWN_W / 2, DRAWN_FOOT). */
const DRAWN_W = 128;
const DRAWN_H = 96;
const DRAWN_FOOT = 88;

/** A unit quad standing on its bottom edge (x −0.5..0.5, y 0..1), facing +Z. */
const STAND = new THREE.PlaneGeometry(1, 1).translate(0, 0.5, 0);
/** A unit quad lying on the ground. */
const FLAT = new THREE.PlaneGeometry(1, 1).rotateX(-Math.PI / 2);

class ActorView {
  readonly group = new THREE.Group();
  readonly body: THREE.Mesh;
  readonly mat: THREE.MeshBasicMaterial;
  readonly caster: THREE.Mesh;
  readonly cmat: THREE.MeshBasicMaterial;
  readonly shadow: THREE.Mesh;
  seen = 0;
  /** The picture of an actor with a drawFn (made when first needed). */
  private drawn: { c: HTMLCanvasElement; g: Gfx; tex: THREE.CanvasTexture } | null = null;

  constructor() {
    this.mat = new THREE.MeshBasicMaterial({ alphaTest: 0.5 });
    this.body = new THREE.Mesh(STAND, this.mat);
    this.cmat = casterMaterial(null);
    this.caster = shadowOnly(new THREE.Mesh(STAND, this.cmat));
    this.caster.castShadow = true;
    this.shadow = new THREE.Mesh(FLAT, new THREE.MeshBasicMaterial({ map: blob(), transparent: true, depthWrite: false, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.shadow.renderOrder = 1;
    this.group.add(this.body, this.caster, this.shadow);
  }

  /** An actor that draws itself (drawFn): this frame's picture of it, its feet at (DRAWN_W / 2, DRAWN_FOOT). */
  private drawSelf(a: Actor): THREE.CanvasTexture {
    if (!this.drawn) {
      const c = document.createElement('canvas');
      c.width = DRAWN_W;
      c.height = DRAWN_H;
      const ctx = c.getContext('2d')!;
      ctx.imageSmoothingEnabled = false;
      this.drawn = { c, g: new Gfx(ctx, DRAWN_W, DRAWN_H), tex: pixelTexture(c) };
    }
    const d = this.drawn;
    const ctx = d.g.ctx;
    ctx.save();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, DRAWN_W, DRAWN_H);
    a.drawFn!(d.g, DRAWN_W / 2, DRAWN_FOOT);
    ctx.restore();
    d.tex.needsUpdate = true;
    return d.tex;
  }

  update(a: Actor, f: FieldScene, sunYaw: number, tint: THREE.Color, world: Ground3D, sunDir: THREE.Vector3): void {
    const blink = a.blinkUntil > f.t && Math.floor(f.t / 80) % 2 === 0;
    const la = f.light.actorAlpha(a);
    const show = a.visible && !blink && (la > 0.01 || !!a.data.selfLit);
    this.group.visible = show;
    if (!show) return;
    const tex = a.drawFn ? this.drawSelf(a) : texOf(a.frame());
    const pic = tex.image as HTMLCanvasElement;
    // the long shadow: the frame it is cast from (a lagging one, fushigi_02)
    const lag = !a.drawFn ? (a.data.shadowFrame as HTMLCanvasElement | undefined) : undefined;
    const ctex = lag && lag.width === pic.width && lag.height === pic.height ? texOf(lag) : tex;
    if (this.mat.map !== tex || this.cmat.map !== ctex) {
      // (a new program only when the material first gets a map; swapping maps needs none)
      const first = !this.mat.map;
      this.mat.map = tex;
      this.cmat.map = ctex;
      if (first) {
        this.mat.needsUpdate = true;
        this.cmat.needsUpdate = true;
      }
    }
    const w = pic.width * PX;
    const h = pic.height * PX * SV;
    // (a drawn picture reaches below the feet: it stands that much lower)
    const below = a.drawFn ? (DRAWN_H - DRAWN_FOOT) * PX * SV : 0;
    // feet: the actor's (x, y); a pose drawn higher (perched, hopping) lifts it,
    // one drawn lower (oy > 0) stands that much further south
    const x = (a.x + a.ox) * PX;
    let z = (a.y + Math.max(0, a.oy)) * PX;
    // (on the ground's step where it stands: paving, the bridge)
    let up = -(Math.min(0, a.oy) + a.hopOffset() - (a.lift > 0 ? 1 : 0)) * PX * SV + world.heightAt(x, z - 0.05);
    // one standing inside a building's box (くま吉 behind his open shop
    // front): brought along the line of sight to just behind the facade —
    // the same place on screen, and the counter and the noren in front of
    // him cover him as the 2D draws them, not more
    const inside = world.boxAt(x, z);
    if (inside) {
      const d = inside.z1 - 0.03 - z;
      z += d;
      // (on the building's own floor: its walls stand on the ground, not on the paving's step)
      up += d * SV - world.heightAt(x, (a.y + Math.max(0, a.oy)) * PX - 0.05);
    }
    this.body.position.set(x, up - below, z);
    this.body.scale.set(w, h, 1);
    this.caster.position.set(x, up - below, z);
    this.caster.scale.set(w, h, 1);
    this.caster.rotation.y = sunYaw;
    const alpha = a.alpha * Math.min(1, la);
    const tr = alpha < 0.999;
    if (this.mat.transparent !== tr) {
      this.mat.transparent = tr;
      this.mat.alphaTest = tr ? 0.02 : 0.5;
      this.mat.needsUpdate = true;
    }
    this.mat.opacity = alpha;
    // in a building's shadow: darker
    const shaded = world.inShadow([x, 0.5, z - 0.05], sunDir);
    // (a room at night: by the light where the feet are, room.ts)
    const lit = world.lightAt ? world.lightAt(x, (a.y + Math.max(0, a.oy)) * PX) : 1;
    this.mat.color.copy(tint).multiplyScalar((shaded ? SHADE : 1) * lit);
    const sw = Math.max(0.55, Math.min(1.4, (a.drawFn ? (a.data.vehicle ? 3 : 1) : w) * 0.8));
    const ground = world.heightAt(x, z - 0.05);
    this.shadow.position.set(x, ground + 0.02, z - 0.06);
    this.shadow.scale.set(sw, 1, sw * 0.42);
    const air = up - ground;
    this.shadow.visible = air < 1.5;
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.6 * alpha * (1 - Math.min(1, air / 1.5) * 0.6);
  }

  dispose(): void {
    this.mat.dispose();
    this.cmat.dispose();
    (this.shadow.material as THREE.Material).dispose();
    this.drawn?.tex.dispose();
  }
}

export class ActorViews {
  readonly group = new THREE.Group();
  private readonly views = new Map<Actor, ActorView>();
  private tick = 0;

  update(f: FieldScene, sunYaw: number, tint: THREE.Color, world: Ground3D, sunDir: THREE.Vector3): void {
    this.tick++;
    const list: Actor[] = [...f.actors, f.player];
    if (f.follower) list.push(f.follower);
    for (const a of list) {
      let v = this.views.get(a);
      if (!v) {
        v = new ActorView();
        this.views.set(a, v);
        this.group.add(v.group);
      }
      v.seen = this.tick;
      v.update(a, f, sunYaw, tint, world, sunDir);
    }
    for (const [a, v] of this.views) {
      if (v.seen === this.tick) continue;
      this.group.remove(v.group);
      v.dispose();
      this.views.delete(a);
    }
  }

  /** The top centre of an actor's picture (world units), for the emotes. */
  head(a: Actor): THREE.Vector3 | null {
    const v = this.views.get(a);
    if (!v || !v.group.visible) return null;
    return new THREE.Vector3(v.body.position.x, v.body.position.y + v.body.scale.y, v.body.position.z);
  }

  clear(): void {
    for (const v of this.views.values()) v.dispose();
    this.views.clear();
    this.group.clear();
  }
}
