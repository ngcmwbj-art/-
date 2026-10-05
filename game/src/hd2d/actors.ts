// HD-2D prototype: the people (and cats, symbols...) as standing pictures.
// Each character is its current 2D frame on an upright plane facing the
// camera — walking, turning and every pose stay the 2D animation — with a
// soft round shadow at its feet and a long evening shadow: a second plane
// with the same picture, turned to face the sun, that only casts shadow.
// Characters are not lit by the 3D lights (their pixel colours stay as
// drawn); one standing in a building's shadow is tinted darker.

import * as THREE from 'three';
import type { Actor } from '../world/actor';
import type { FieldScene } from '../world/field';
import { casterMaterial, pixelTexture, SHADE, SV, type TownWorld } from './town';

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

  constructor() {
    this.mat = new THREE.MeshBasicMaterial({ alphaTest: 0.5 });
    this.body = new THREE.Mesh(STAND, this.mat);
    this.cmat = casterMaterial(null);
    this.caster = new THREE.Mesh(STAND, this.cmat);
    this.caster.castShadow = true;
    this.shadow = new THREE.Mesh(FLAT, new THREE.MeshBasicMaterial({ map: blob(), transparent: true, depthWrite: false, opacity: 0.6, polygonOffset: true, polygonOffsetFactor: -2 }));
    this.shadow.renderOrder = 1;
    this.group.add(this.body, this.caster, this.shadow);
  }

  update(a: Actor, f: FieldScene, sunYaw: number, tint: THREE.Color, world: TownWorld, sunDir: THREE.Vector3): void {
    const blink = a.blinkUntil > f.t && Math.floor(f.t / 80) % 2 === 0;
    const la = f.light.actorAlpha(a);
    const show = a.visible && !a.drawFn && !blink && (la > 0.01 || !!a.data.selfLit);
    this.group.visible = show;
    if (!show) return;
    const img = a.frame();
    const tex = texOf(img);
    if (this.mat.map !== tex) {
      // (a new program only when the material first gets a map; swapping maps needs none)
      const first = !this.mat.map;
      this.mat.map = tex;
      this.cmat.map = tex;
      if (first) {
        this.mat.needsUpdate = true;
        this.cmat.needsUpdate = true;
      }
    }
    const w = img.width * PX;
    const h = img.height * PX * SV;
    // feet: the actor's (x, y); a pose drawn higher (perched, hopping) lifts it,
    // one drawn lower (oy > 0) stands that much further south
    const up = -(Math.min(0, a.oy) + a.hopOffset() - (a.lift > 0 ? 1 : 0)) * PX * SV;
    const x = (a.x + a.ox) * PX;
    const z = (a.y + Math.max(0, a.oy)) * PX;
    this.body.position.set(x, up, z);
    this.body.scale.set(w, h, 1);
    this.caster.position.set(x, up, z);
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
    this.mat.color.copy(tint).multiplyScalar(shaded ? SHADE : 1);
    const sw = Math.max(0.55, Math.min(1.4, w * 0.8));
    this.shadow.position.set(x, 0.02, z - 0.06);
    this.shadow.scale.set(sw, 1, sw * 0.42);
    this.shadow.visible = up < 1.5;
    (this.shadow.material as THREE.MeshBasicMaterial).opacity = 0.6 * alpha * (1 - Math.min(1, up / 1.5) * 0.6);
  }
}

export class ActorViews {
  readonly group = new THREE.Group();
  private readonly views = new Map<Actor, ActorView>();
  private tick = 0;

  update(f: FieldScene, sunYaw: number, tint: THREE.Color, world: TownWorld, sunDir: THREE.Vector3): void {
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
      v.mat.dispose();
      v.cmat.dispose();
      (v.shadow.material as THREE.Material).dispose();
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
    for (const v of this.views.values()) {
      v.mat.dispose();
      v.cmat.dispose();
      (v.shadow.material as THREE.Material).dispose();
    }
    this.views.clear();
    this.group.clear();
  }
}
