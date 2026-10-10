// HD-2D: the light of 星見台's rooms (chapter 2; 2026-10-06 依頼主「第２章も
// HD-2Dにしてみよう」, 02 #85). room.ts stands the rooms up as chapter 1's;
// this is their light.
//
// 星見台's rooms are lit by nothing but their own light (52 8.3): the 2D
// multiplies the room by its light map and grades nothing on top (render.ts
// plainRoom) — the room's base (the bulb colour of a lit room, the night
// through the windows of one left dark, the barn's tubes, the morning's as
// it comes in), a region of another base (the school's hallway), the dark (a
// step darker than the night) with the starlight round Minato's feet, the
// tomato's three rings, the night train's starlight running over the seats,
// and every lamp's pool. Here the same light map is painted for the whole
// room in the room picture's px — the 2D's px: a thing standing h px over
// its foot line is lit as the row h px up, where the 2D shows it — and every
// surface of the room (the floor, the walls, the furniture, what lies) is
// multiplied by it in its material (dress(): its world point → the
// picture's px). The characters take its colour where they stand (tintAt).
// The 3D lights only shade on top of it: a ceiling light from above and a
// soft fill that come to 1 on the floor, so the floor is the 2D's colour and
// the furniture's sides and short shadows give the room its body (light()).
// What the 2D lays over the graded frame: the はなまるトマト's halo (a
// sprite where the tomato is), the ring running out as the lantern lights
// (a ring on the floor), the morning's shafts in the barn at 5:00 (into the
// room's glow layer, glowFx).

import * as THREE from 'three';
import { Gfx } from '../engine/gfx';
import type { FieldScene } from '../world/field';
import { HOSHI_INDOOR_BASE, HOSHI_INDOOR_MORNING, type Grade } from '../world/lighting';
import { drawRoomDawnFx, paintRoomLight, roomMorningK } from '../world/hoshi';
import { haloImage, LANTERN_HZ, STARLIGHT_ROOM } from '../world/lantern';
import { SV } from './town';

/** The light map's px per world px (smooth light: half the picture's, painted every frame). */
const SCALE = 0.5;
/** How far past the room's cells its light reaches (px): the walls standing at the floor's edge (room.ts WALL_T). */
const REACH = 4;
/** Screen px per world unit of a camera-facing thing at the room camera's distance (fov 26°, 25 tiles: 216 / 11.5). */
const PX_PER_UNIT = 18.7;
/** The ceiling light's strength in a lit room / one left dark (the fill makes up the rest to 1 on the floor). */
const KEY_LIT = 1.0;
const KEY_DARK = 0.35;
/** The fill's ground colour (how much less a wall gets than the floor). */
const FILL_GROUND = 0.8;
/** The lamps' point lights (view.ts placeLamps): their pools are in the light map already, a touch of shading only. */
const LAMP_K = 0.25;

export class HoshiLight {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly g: Gfx;
  readonly tex: THREE.CanvasTexture;
  /** The room's cells and REACH px round them (the 2D keeps a room's light inside it: render.ts roomClip). */
  private readonly clip: Path2D;
  /** The light map read back (tintAt); null until someone asks. */
  private data: Uint8ClampedArray | null = null;
  private dataFresh = false;
  /** Shared by every dressed material (dress()). */
  private readonly uniforms = {
    uPicLight: { value: null as THREE.Texture | null },
    uPicRect: { value: new THREE.Vector4() },
    uPicK: { value: 1 / SV },
  };
  private readonly dressed = new WeakSet<THREE.Material>();
  /** Is the room lit by its lamps (a warm, bright base) rather than left to the night through its windows? */
  readonly lit: boolean;
  /** The halos (the はなまるトマト among the lamps): two sprites each. */
  private readonly halos: { core: THREE.Sprite; veil: THREE.Sprite }[] = [];
  private ring: THREE.Mesh | null = null;
  /** The room's up-stretch (view.ts ROOM_CAM): the halos keep their round shape under it. */
  private stretch = 1;
  readonly group = new THREE.Group();

  constructor(
    private readonly f: FieldScene,
    private readonly X0: number,
    private readonly Y0: number,
    EW: number,
    EH: number,
    cells: (tx: number, ty: number) => boolean,
  ) {
    const w = Math.max(1, Math.ceil(EW * SCALE));
    const h = Math.max(1, Math.ceil(EH * SCALE));
    this.canvas = document.createElement('canvas');
    this.canvas.width = w;
    this.canvas.height = h;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true })!;
    this.g = new Gfx(this.ctx, w, h);
    this.tex = new THREE.CanvasTexture(this.canvas);
    // (the 2D's light map is sRGB: decoded, a surface's colour times it is the 2D's multiply)
    this.tex.colorSpace = THREE.SRGBColorSpace;
    this.tex.magFilter = THREE.LinearFilter;
    this.tex.minFilter = THREE.LinearFilter;
    this.tex.generateMipmaps = false;
    this.uniforms.uPicLight.value = this.tex;
    this.uniforms.uPicRect.value.set(X0, Y0, 1 / (w / SCALE), 1 / (h / SCALE));
    const m = f.map;
    this.clip = new Path2D();
    for (let ty = 0; ty < m.h; ty++)
      for (let tx = 0; tx < m.w; tx++) if (cells(tx, ty)) this.clip.rect(tx * 16 - X0 - REACH, ty * 16 - Y0 - REACH, 16 + REACH * 2, 16 + REACH * 2);
    const base = new THREE.Color(this.base());
    this.lit = base.r * 0.3 + base.g * 0.5 + base.b * 0.2 > 0.75;
    this.paint();
  }

  /** The room's base (render.ts hoshiBase): the night's, going over to the morning's as the morning comes in. */
  private base(): string {
    const def = this.f.map.def;
    const night = def.lightBase ?? HOSHI_INDOOR_BASE[def.id] ?? '#9894C4';
    const k = roomMorningK(this.f);
    if (k <= 0) return night;
    const morning = HOSHI_INDOOR_MORNING[def.id] ?? HOSHI_INDOOR_MORNING.default;
    if (k >= 1) return morning;
    return `#${new THREE.Color(night).lerp(new THREE.Color(morning), k).getHexString()}`;
  }

  /**
   * The 2D's light map (render.ts grade(), 星見台), for the whole room in
   * the picture's px: the base everywhere, the regions of another base, the
   * dark, the starlight and the rings (mixed), the train's starlight, the
   * lamps' pools (added) — the lights kept to the room's cells.
   */
  paint(): void {
    const f = this.f;
    const ctx = this.ctx;
    const X0 = this.X0;
    const Y0 = this.Y0;
    const W = this.canvas.width / SCALE;
    const H = this.canvas.height / SCALE;
    ctx.save();
    ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const base = this.base();
    ctx.fillStyle = base;
    ctx.fillRect(0, 0, W, H);
    for (const r of f.map.def.lightRegions ?? []) {
      ctx.fillStyle = r.color;
      ctx.fillRect(r.x * 16 - X0, r.y * 16 - Y0, r.w * 16, r.h * 16);
    }
    // the dark, the starlight, the tomato light: inside the room
    ctx.save();
    ctx.clip(this.clip);
    const star = f.map.def.darkStar;
    f.light.paint(ctx, X0, Y0, star === false ? base : (star ?? STARLIGHT_ROOM), W, H);
    ctx.restore();
    // the starlight through the night train's windows
    paintRoomLight(f, ctx, X0, Y0);
    // every lamp's pool (added), inside the room
    ctx.save();
    ctx.clip(this.clip);
    ctx.globalCompositeOperation = 'lighter';
    for (const p of f.props) {
      const a = p.art;
      if (!p.present || !a.light) continue;
      ctx.save();
      a.light(this.g, p.x - X0, p.y - Y0, f.propEnv(p));
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
    this.tex.needsUpdate = true;
    this.dataFresh = false;
  }

  /**
   * Multiply a material of the room by the light map where its surface is
   * (once per material; the emissive part — a lamp's glow — is not, as the
   * 2D draws the glows over its grade).
   */
  dress(mat: THREE.Material): void {
    if (this.dressed.has(mat)) return;
    this.dressed.add(mat);
    const u = this.uniforms;
    const lambert = mat instanceof THREE.MeshLambertMaterial;
    mat.onBeforeCompile = (sh) => {
      sh.uniforms.uPicLight = u.uPicLight;
      sh.uniforms.uPicRect = u.uPicRect;
      sh.uniforms.uPicK = u.uPicK;
      sh.vertexShader = sh.vertexShader
        .replace('void main() {', 'varying vec3 vPicW;\nvoid main() {')
        .replace('#include <project_vertex>', '#include <project_vertex>\n\tvPicW = (modelMatrix * vec4(transformed, 1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader
        .replace(
          'void main() {',
          // world units → the picture's px: x·16, and the row a point h units up stands for (z − h / SV)·16
          'varying vec3 vPicW;\nuniform sampler2D uPicLight;\nuniform vec4 uPicRect;\nuniform float uPicK;\n' +
            'vec3 picLight() {\n\tvec2 px = vec2(vPicW.x, vPicW.z - vPicW.y * uPicK) * 16.0;\n' +
            '\treturn texture2D(uPicLight, vec2((px.x - uPicRect.x) * uPicRect.z, 1.0 - (px.y - uPicRect.y) * uPicRect.w)).rgb;\n}\nvoid main() {',
        )
        .replace(
          '#include <opaque_fragment>',
          (lambert ? 'outgoingLight = (outgoingLight - totalEmissiveRadiance) * picLight() + totalEmissiveRadiance;' : 'outgoingLight *= picLight();') +
            '\n\t#include <opaque_fragment>',
        );
    };
    mat.customProgramCacheKey = () => (lambert ? 'hoshiLightL' : 'hoshiLightB');
    mat.needsUpdate = true;
  }

  /** Dress every lit surface of the room (not the additive light — glows, beams — nor the shadow-only planes). */
  dressAll(root: THREE.Object3D): void {
    root.traverse((o) => {
      if (!(o instanceof THREE.Mesh)) return;
      for (const m of Array.isArray(o.material) ? o.material : [o.material]) {
        if (!(m instanceof THREE.MeshLambertMaterial || m instanceof THREE.MeshBasicMaterial)) continue;
        if (m.blending === THREE.AdditiveBlending || m.colorWrite === false) continue;
        this.dress(m);
      }
    });
  }

  /** The room's light for the 3D lights (in place of room.ts's chapter-1 ceiling light): see the top of this file. */
  light(sun: THREE.DirectionalLight, hemi: THREE.HemisphereLight): void {
    const key = this.lit ? KEY_LIT : KEY_DARK;
    sun.color.set('#ffffff');
    sun.intensity = key;
    hemi.color.set('#ffffff');
    hemi.groundColor.setScalar(FILL_GROUND);
    // (the floor: key·sin(62°) + fill = π, a surface's own colour)
    hemi.intensity = Math.PI - key * 0.883;
  }

  /** The lamps' point lights (view.ts placeLamps): faint, the pools are the light map's. */
  lampK(): number {
    return LAMP_K;
  }

  /** The finish (post.ts): no grade on top, the room is its own light only (render.ts plainRoom). */
  grade(g: Grade): Grade {
    return { ...g, mul: [255, 255, 255], desat: 0, glareA: 0, topA: 0 };
  }

  /**
   * Per frame: the light map again (the rings breathe and go with Minato,
   * the train's starlight runs), the stretch the room stands with, the
   * halos and the lantern's ring.
   */
  update(stretch: number): void {
    this.paint();
    this.stretch = Math.max(0.01, stretch);
    this.uniforms.uPicK.value = 1 / (this.stretch * SV);
    this.updateHalos();
    this.updateRing();
  }

  /**
   * The light map's colour (linear) at a character standing at (x, z)
   * (units), into `out` (multiplied): taken at its middle, a little over
   * its feet (the 2D multiplies its picture by the light map there).
   */
  tintAt(x: number, z: number, out: THREE.Color): void {
    if (!this.dataFresh) {
      this.data = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height).data;
      this.dataFresh = true;
    }
    const d = this.data;
    if (!d) return;
    const cx = Math.floor((x * 16 - this.X0) * SCALE);
    const cy = Math.floor((z * 16 - 10 - this.Y0) * SCALE);
    const w = this.canvas.width;
    if (cx < 0 || cy < 0 || cx >= w || cy >= this.canvas.height) return;
    const i = (cy * w + cx) * 4;
    TMP.setRGB(d[i] / 255, d[i + 1] / 255, d[i + 2] / 255, THREE.SRGBColorSpace);
    out.multiply(TMP);
  }

  /**
   * The halos screened over the 2D's frame (render.ts drawLightFx: the
   * はなまるトマト among the greenhouse's lamps, and in Minato's hands): a
   * pair of additive sprites where the tomato hangs, breathing with its light.
   */
  private updateHalos(): void {
    const f = this.f;
    const list = f.light.sources.filter((s) => !!s.halo);
    while (this.halos.length < list.length) {
      const mk = () => {
        const s = new THREE.Sprite(new THREE.SpriteMaterial({ transparent: true, blending: THREE.AdditiveBlending, depthTest: false, depthWrite: false, toneMapped: false }));
        s.renderOrder = 5;
        this.group.add(s);
        return s;
      };
      this.halos.push({ core: mk(), veil: mk() });
    }
    const beat = 0.72 + 0.28 * Math.sin(2 * Math.PI * LANTERN_HZ * (f.t / 1000));
    this.halos.forEach((h, i) => {
      const s = list[i];
      h.core.visible = h.veil.visible = !!s;
      if (!s?.halo) return;
      // its foot line: Minato's when it is in his hands, else the tile's it hangs on
      const held = Math.abs(s.x - f.player.x) <= 1 && Math.abs(s.y - (f.player.y - 12)) <= 1;
      const foot = held ? f.player.y : (Math.floor(s.y / 16) + 1) * 16;
      for (const [sp, layer] of [
        [h.veil, 'veil'],
        [h.core, 'core'],
      ] as const) {
        const img = haloImage(s.halo, layer);
        const mat = sp.material;
        if (!mat.map || mat.map.image !== img) {
          mat.map?.dispose();
          const t = new THREE.CanvasTexture(img);
          t.colorSpace = THREE.SRGBColorSpace;
          mat.map = t;
          mat.needsUpdate = true;
        }
        mat.opacity = Math.min(1, beat * Math.min(1, s.k)) * (layer === 'veil' ? 0.45 : 0.8);
        const size = img.width / PX_PER_UNIT;
        sp.scale.set(size, size / this.stretch, 1);
        sp.position.set(s.x / 16, ((foot - s.y) / 16) * SV, foot / 16);
      }
    });
  }

  /** fx_h_lantern_on: a 1px #FFE7A3 ring runs out with the opening circle (on the floor here). */
  private updateRing(): void {
    const L = this.f.light;
    const on = !!L.lantern && L.onT < 1;
    if (!on) {
      if (this.ring) this.ring.visible = false;
      return;
    }
    if (!this.ring) {
      // (a unit ring a world px wide at radius 64: scaled to the light's radius)
      this.ring = new THREE.Mesh(
        new THREE.RingGeometry(1 - 1 / 64, 1, 96).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({ color: new THREE.Color('#FFE7A3'), transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }),
      );
      this.ring.renderOrder = 3;
      this.group.add(this.ring);
    }
    const l = L.lantern!;
    const r = l.r / 16;
    this.ring.visible = true;
    this.ring.position.set(l.x / 16, 0.03, l.y / 16);
    this.ring.scale.set(r, 1, r);
    (this.ring.material as THREE.MeshBasicMaterial).opacity = 1 - L.onT * 0.6;
  }

  /**
   * What the 2D lays over its graded frame on the floor of a room (render.ts
   * drawLightFx): the morning's shafts across the barn at 5:00 (hoshi.ts
   * drawRoomDawnFx), into the room's glow layer (`ctx`: the picture's px).
   */
  glowFx(ctx: CanvasRenderingContext2D): void {
    if (roomMorningK(this.f) <= 0.01) return;
    ctx.save();
    drawRoomDawnFx(this.f, ctx, this.X0, this.Y0);
    ctx.restore();
  }

  dispose(): void {
    this.tex.dispose();
    for (const h of this.halos)
      for (const s of [h.core, h.veil]) {
        s.material.map?.dispose();
        s.material.dispose();
      }
    if (this.ring) {
      this.ring.geometry.dispose();
      (this.ring.material as THREE.Material).dispose();
    }
  }
}

const TMP = new THREE.Color();
