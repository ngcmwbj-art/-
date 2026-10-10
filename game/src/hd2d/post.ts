// HD-2D prototype: the finish over the 3D town (bloom, the tilt-shift blur
// at the top and bottom of the picture, the stage's colour grade and a
// vignette). Two levels: 'normal' (bloom + a two-pass tilt-shift) and
// 'light' for phones (no bloom, a one-pass vertical blur, rendered smaller).
//
// The grade reuses the field's Grade (world/lighting.ts) — the same numbers
// the 2D renderer lays over its frame — so stage changes (17:00, time
// stopping) tween here exactly as they do in 2D: mul, the warm bleed from
// the left (glare), the dark from the top (topDark), the colour draining out
// (desat). The chime's wave (FieldScene.wave) bends the rows here too.

import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import type { Grade } from '../world/lighting';

export type Quality = 'light' | 'normal';

/** Sharp band round the focus row, then the blur grows (uv units from the focus). */
const BAND = 'smoothstep(0.14, 0.52, abs(focus - vUv.y))';

/** The tilt-shift's vertical half (normal quality): 9 taps, stronger away from the focus row. */
const VTiltShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    vstep: { value: 0 },
    focus: { value: 0.5 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float vstep, focus;
    varying vec2 vUv;
    void main() {
      float s = vstep * ${BAND};
      if (s <= 0.0) { gl_FragColor = texture2D(tDiffuse, vUv); return; }
      vec4 c = texture2D(tDiffuse, vUv + vec2(0.0, -4.0 * s)) * 0.051;
      c += texture2D(tDiffuse, vUv + vec2(0.0, -3.0 * s)) * 0.0918;
      c += texture2D(tDiffuse, vUv + vec2(0.0, -2.0 * s)) * 0.12245;
      c += texture2D(tDiffuse, vUv + vec2(0.0, -1.0 * s)) * 0.1531;
      c += texture2D(tDiffuse, vUv) * 0.1633;
      c += texture2D(tDiffuse, vUv + vec2(0.0, 1.0 * s)) * 0.1531;
      c += texture2D(tDiffuse, vUv + vec2(0.0, 2.0 * s)) * 0.12245;
      c += texture2D(tDiffuse, vUv + vec2(0.0, 3.0 * s)) * 0.0918;
      c += texture2D(tDiffuse, vUv + vec2(0.0, 4.0 * s)) * 0.051;
      gl_FragColor = c;
    }`,
};

/** Tilt-shift + grade + vignette + linear → sRGB, the last pass (to the canvas). */
const FinishShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    // horizontal tilt-shift blur step (1/width × strength; 0 = none) and the focus row
    hstep: { value: 0 },
    vstep: { value: 0 },
    focus: { value: 0.5 },
    mul: { value: new THREE.Color(1, 1, 1) },
    desat: { value: 0 },
    glare: { value: new THREE.Color(1, 0.6, 0.3) },
    glareA: { value: 0 },
    glareW: { value: 0.45 },
    // 1: the bleed comes from the right (星見台's dawn in the east, 52 8.3)
    glareRight: { value: 0 },
    topDark: { value: new THREE.Color(0.2, 0.15, 0.35) },
    topA: { value: 0 },
    vignette: { value: 0.32 },
    // the chime's wave: amplitude in uv, phase
    waveAmp: { value: 0 },
    waveT: { value: 0 },
    lift: { value: new THREE.Color(0.012, 0.008, 0.02) },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }`,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float hstep, vstep, focus, desat, glareA, glareW, glareRight, topA, vignette, waveAmp, waveT;
    uniform vec3 mul, glare, topDark, lift;
    varying vec2 vUv;

    vec3 toSRGB(vec3 c) {
      c = max(c, vec3(0.0));
      return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
    }
    vec3 toLinear(vec3 c) {
      return mix(c / 12.92, pow((c + 0.055) / 1.055, vec3(2.4)), step(vec3(0.04045), c));
    }

    void main() {
      vec2 uv = vUv;
      // the chime's wave: rows slide sideways (2D: 48 rows a period, 0.25 s)
      if (waveAmp > 0.0) uv.x += waveAmp * sin(6.2831853 * ((1.0 - uv.y) * 4.5 + waveT / 0.25));
      vec3 c;
      float k = ${BAND};
      if (hstep > 0.0 && k > 0.0) {
        float s = hstep * k;
        c  = texture2D(tDiffuse, uv + vec2(-4.0 * s, 0.0)).rgb * 0.051;
        c += texture2D(tDiffuse, uv + vec2(-3.0 * s, 0.0)).rgb * 0.0918;
        c += texture2D(tDiffuse, uv + vec2(-2.0 * s, 0.0)).rgb * 0.12245;
        c += texture2D(tDiffuse, uv + vec2(-1.0 * s, 0.0)).rgb * 0.1531;
        c += texture2D(tDiffuse, uv).rgb * 0.1633;
        c += texture2D(tDiffuse, uv + vec2(1.0 * s, 0.0)).rgb * 0.1531;
        c += texture2D(tDiffuse, uv + vec2(2.0 * s, 0.0)).rgb * 0.12245;
        c += texture2D(tDiffuse, uv + vec2(3.0 * s, 0.0)).rgb * 0.0918;
        c += texture2D(tDiffuse, uv + vec2(4.0 * s, 0.0)).rgb * 0.051;
      } else if (vstep > 0.0 && k > 0.0) {
        // light quality: one cheap vertical pass stands in for both
        float s = vstep * k;
        c  = texture2D(tDiffuse, uv + vec2(0.0, -2.0 * s)).rgb * 0.12;
        c += texture2D(tDiffuse, uv + vec2(0.0, -1.0 * s)).rgb * 0.23;
        c += texture2D(tDiffuse, uv).rgb * 0.30;
        c += texture2D(tDiffuse, uv + vec2(0.0, 1.0 * s)).rgb * 0.23;
        c += texture2D(tDiffuse, uv + vec2(0.0, 2.0 * s)).rgb * 0.12;
      } else {
        c = texture2D(tDiffuse, uv).rgb;
      }
      // the stage's grade, in sRGB like the 2D renderer's
      vec3 s = toSRGB(c);
      s *= mul;
      float l = dot(s, vec3(0.299, 0.587, 0.114));
      s = mix(s, vec3(l), desat);
      // warm bleed from the left (screen blend; 星見台: from the right), dark from the top
      float gx = clamp(1.0 - mix(uv.x, 1.0 - uv.x, glareRight) / max(0.01, glareW), 0.0, 1.0);
      float ga = glareA * gx * gx;
      s = 1.0 - (1.0 - s) * (1.0 - glare * ga);
      float ty = clamp((uv.y - 0.55) / 0.45, 0.0, 1.0);
      s = mix(s, s * topDark * 1.6, topA * ty);
      // a soft lift in the shadows (the HD-2D haze) and the vignette
      s = s + lift * (1.0 - s);
      vec2 v = (vUv - 0.5) * vec2(1.25, 1.0);
      s *= 1.0 - vignette * smoothstep(0.25, 0.85, dot(v, v) * 1.6);
      gl_FragColor = vec4(clamp(s, 0.0, 1.0), 1.0);
    }`,
};

export class Post {
  readonly composer: EffectComposer;
  private readonly renderPass: RenderPass;
  private readonly bloom: UnrealBloomPass | null;
  private readonly vtilt: ShaderPass | null;
  private readonly finish: ShaderPass;
  readonly quality: Quality;
  private w = 1;
  private h = 1;
  /** The tilt-shift blur on (the street) or off (inside: 2026-10-06 依頼主「建物の中でぼかしをしなくても良いと思う」). */
  private tilt = true;

  constructor(renderer: THREE.WebGLRenderer, scene: THREE.Scene, camera: THREE.Camera, quality: Quality, w: number, h: number) {
    this.quality = quality;
    this.composer = new EffectComposer(renderer);
    this.composer.setPixelRatio(1);
    this.composer.setSize(w, h);
    this.renderPass = new RenderPass(scene, camera);
    this.composer.addPass(this.renderPass);
    if (quality === 'normal') {
      this.bloom = new UnrealBloomPass(new THREE.Vector2(w, h), 0.42, 0.55, 0.92);
      this.composer.addPass(this.bloom);
      this.vtilt = new ShaderPass(VTiltShader);
      this.composer.addPass(this.vtilt);
    } else {
      this.bloom = null;
      this.vtilt = null;
    }
    this.finish = new ShaderPass(FinishShader);
    this.composer.addPass(this.finish);
    this.setSize(w, h);
  }

  setSize(w: number, h: number): void {
    this.w = w;
    this.h = h;
    this.composer.setSize(w, h);
    this.bloom?.setSize(w, h);
    this.applyTilt();
  }

  /** The tilt-shift blur on or off (inside the rooms it is off; the street and a battle's backdrop keep it). */
  setTilt(on: boolean): void {
    if (on === this.tilt) return;
    this.tilt = on;
    this.applyTilt();
  }

  private applyTilt(): void {
    const blur = this.tilt ? 2.2 : 0; // px of blur step at the very top / bottom (normal)
    if (this.vtilt) {
      this.vtilt.uniforms.vstep.value = blur / this.h;
      this.vtilt.enabled = this.tilt;
    }
    const u = this.finish.uniforms;
    u.hstep.value = this.quality === 'normal' ? blur / this.w : 0;
    u.vstep.value = this.quality === 'light' ? (blur * 1.2) / this.h : 0;
  }

  /** The field's grade (and the chime's wave, in buffer px of the 384-wide frame). */
  setGrade(g: Grade, waveAmpPx: number, waveT: number, focus: number): void {
    const u = this.finish.uniforms;
    (u.mul.value as THREE.Color).setRGB(g.mul[0] / 255, g.mul[1] / 255, g.mul[2] / 255);
    u.desat.value = g.desat;
    (u.glare.value as THREE.Color).setRGB(g.glare[0] / 255, g.glare[1] / 255, g.glare[2] / 255);
    u.glareA.value = g.glareA;
    u.glareW.value = g.glareW;
    u.glareRight.value = g.glareRight > 0.5 ? 1 : 0;
    (u.topDark.value as THREE.Color).setRGB(g.topDark[0] / 255, g.topDark[1] / 255, g.topDark[2] / 255);
    u.topA.value = g.topA;
    u.waveAmp.value = waveAmpPx / 384;
    u.waveT.value = waveT;
    u.focus.value = focus;
    if (this.vtilt) this.vtilt.uniforms.focus.value = focus;
  }

  render(): void {
    this.composer.render();
  }

  dispose(): void {
    this.composer.dispose();
    this.bloom?.dispose();
  }
}
