// 映像の仕上げ（陰影・光のにじみ・ピントのぼけ・色づくり）と、画質の自動調整
import * as THREE from 'three';
// 第20回：仕上げの部品（にじみ・陰影など）は、使うときになってから読みこむ（開いてから遊べるまでを短く。省エネ中は読まない）
let PP = null, ppLoading = null;
function loadPost() {
  if (PP) return Promise.resolve(PP);
  if (!ppLoading) {
    ppLoading = Promise.all([
      import('three/addons/postprocessing/EffectComposer.js'),
      import('three/addons/postprocessing/RenderPass.js'),
      import('three/addons/postprocessing/ShaderPass.js'),
      import('three/addons/postprocessing/GTAOPass.js'),
      import('three/addons/postprocessing/UnrealBloomPass.js'),
      import('three/addons/postprocessing/BokehPass.js'),
      import('three/addons/postprocessing/OutputPass.js'),
    ]).then(([a, b, c, d, e, f, g]) => {
      PP = { EffectComposer: a.EffectComposer, RenderPass: b.RenderPass, ShaderPass: c.ShaderPass, GTAOPass: d.GTAOPass, UnrealBloomPass: e.UnrealBloomPass, BokehPass: f.BokehPass, OutputPass: g.OutputPass };
      return PP;
    });
  }
  return ppLoading;
}

// 画質ごとの設定
export const LEVELS = {
  high: { label: '高', dpr: 1.75, shadow: 4096, ao: true, dof: true, bloom: true, grade: true, samples: 4, tex: 512, dust: 700, shafts: true, leaves: 26 },
  medium: { label: '中', dpr: 1.35, shadow: 2048, ao: false, dof: false, bloom: true, grade: true, samples: 2, tex: 512, dust: 350, shafts: true, leaves: 18 },
  low: { label: '低', dpr: 1.0, shadow: 1024, ao: false, dof: false, bloom: false, grade: false, samples: 0, tex: 256, dust: 120, shafts: false, leaves: 10 },
};
export const ORDER = ['low', 'medium', 'high'];

// 仕上げの色づくり：ふち暗め・フィルムの粒・レンズのにじみ・朝焼けの色味
const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0 },
    uRes: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.32 },
    uGrain: { value: 0.02 },
    uCA: { value: 0.0004 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uTime, uVignette, uGrain, uCA;
    uniform vec2 uRes;
    varying vec2 vUv;
    float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }
    void main() {
      vec2 c = vUv - 0.5;
      float r2 = dot(c, c);
      vec2 off = c * r2 * uCA * 40.0;
      vec3 col;
      col.r = texture2D(tDiffuse, vUv - off).r;
      col.g = texture2D(tDiffuse, vUv).g;
      col.b = texture2D(tDiffuse, vUv + off).b;
      // 朝焼け：明るい所は暖かく、暗い所は少し青く
      float l = dot(col, vec3(0.299, 0.587, 0.114));
      col = mix(col * vec3(0.94, 0.98, 1.06), col * vec3(1.05, 1.0, 0.92), smoothstep(0.15, 0.8, l));
      col = mix(vec3(l), col, 1.06);
      col *= 1.0 - uVignette * smoothstep(0.08, 0.55, r2 * 1.6);
      float g = hash(vUv * uRes + fract(uTime * 7.13)) - 0.5;
      col += g * uGrain;
      gl_FragColor = vec4(col, 1.0);
    }`,
};

export class FX {
  constructor(renderer, scene, camera) {
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.level = null;
    this.composer = null;
    this.focus = 4;
    this.w = 1; this.h = 1;
    this.dprScale = 1; // 重いときに画面の細かさだけを下げる割合
    this.maxDpr = 9; // 省エネのときの画面の細かさの上限
    this.eco = false;
  }

  setLevel(name) {
    const L = LEVELS[name] || LEVELS.medium;
    if (this.level === name) return;
    this.level = name;
    this.L = L;
    const r = this.renderer;
    r.setPixelRatio(Math.min(window.devicePixelRatio || 1, L.dpr, this.maxDpr) * this.dprScale);
    if (this.composer) { this.composer.dispose(); this.composer = null; }
    this.passes = {};
    // 省エネ中は、にじみ・色の仕上げ・ピントぼけ・陰影をすべて切って、そのまま描く
    if (!this.eco && (L.ao || L.dof || L.bloom || L.grade) && !PP) {
      // まだ部品が読めていない：いったんそのまま描き、読めたら仕上げをつける
      loadPost().then(() => { if (this.level === name && !this.composer && !this.eco) { this.level = null; this.setLevel(name); } }).catch(() => { /* 読めなければ仕上げなしのまま */ });
    } else if (!this.eco && (L.ao || L.dof || L.bloom || L.grade)) {
      const { EffectComposer, RenderPass, ShaderPass, GTAOPass, UnrealBloomPass, BokehPass, OutputPass } = PP;
      const rt = new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, samples: L.samples });
      const comp = new EffectComposer(r, rt);
      comp.addPass(new RenderPass(this.scene, this.camera));
      if (L.ao) {
        const ao = new GTAOPass(this.scene, this.camera, 1, 1);
        ao.output = GTAOPass.OUTPUT.Default;
        ao.blendIntensity = 0.85;
        ao.updateGtaoMaterial({ radius: 0.6, distanceExponent: 1.4, thickness: 1.5, scale: 1.1, samples: 12 });
        ao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3, radius: 5, rings: 2, samples: 12 });
        comp.addPass(ao);
        this.passes.ao = ao;
      }
      if (L.dof) {
        const dof = new BokehPass(this.scene, this.camera, { focus: 4, aperture: 0.0016, maxblur: 0.0065 });
        comp.addPass(dof);
        this.passes.dof = dof;
      }
      if (L.bloom) {
        const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 0.22, 0.5, 0.92);
        comp.addPass(bloom);
        this.passes.bloom = bloom;
      }
      comp.addPass(new OutputPass());
      if (L.grade) {
        const grade = new ShaderPass(GradeShader);
        comp.addPass(grade);
        this.passes.grade = grade;
      }
      this.composer = comp;
    }
    this.setSize(this.w, this.h);
  }

  setDprScale(k) {
    this.dprScale = Math.max(0.55, Math.min(1, k));
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, this.L.dpr, this.maxDpr) * this.dprScale);
    this.setSize(this.w, this.h);
  }

  setSize(w, h) {
    this.w = w; this.h = h;
    this.renderer.setSize(w, h, false);
    if (this.composer) {
      this.composer.setPixelRatio(this.renderer.getPixelRatio());
      this.composer.setSize(w, h);
      if (this.passes.grade) this.passes.grade.uniforms.uRes.value.set(w, h);
    }
  }

  render(dt, focusDist, t) {
    if (!this.composer) { this.renderer.render(this.scene, this.camera); return; }
    if (this.passes.dof) {
      this.passes.dof.enabled = focusDist < 15;
      this.focus += (focusDist - this.focus) * Math.min(1, dt * 8);
      this.passes.dof.uniforms.focus.value = this.focus;
    }
    if (this.passes.grade) this.passes.grade.uniforms.uTime.value = t;
    this.composer.render(dt);
  }
}

// 画質の自動調整：重いときだけ1段ずつ下げる（上げるのは手動のみ）
export class AutoQuality {
  constructor(fx, onChange) {
    this.fx = fx;
    this.onChange = onChange;
    this.auto = true;
    this.acc = 0; this.n = 0; this.cool = 4;
  }
  // target：目標のコマ数（省エネで30に上限があるときは、30を基準に判断する）
  sample(dt, active, target = 60) {
    if (!this.auto || !active) { this.acc = 0; this.n = 0; return; }
    this.cool -= dt;
    this.acc += dt; this.n++;
    if (this.acc < 3) return;
    const fps = this.n / this.acc;
    this.acc = 0; this.n = 0;
    if (this.cool > 0) return;
    const i = ORDER.indexOf(this.fx.level);
    if (fps < target * 0.6) {
      // まず画面の細かさだけを少しずつ下げ、それでも重ければ画質を1段下げる
      if (this.fx.dprScale > 0.6) { this.fx.setDprScale(this.fx.dprScale - 0.15); this.cool = 4; }
      else if (i > 0) {
        this.fx.setDprScale(1);
        this.fx.setLevel(ORDER[i - 1]);
        this.cool = 6;
        this.onChange(ORDER[i - 1], fps);
      }
    } else if (fps > target * 0.92 && this.fx.dprScale < 1) {
      // 余裕があれば細かさを少しもどす
      this.fx.setDprScale(this.fx.dprScale + 0.1);
      this.cool = 8;
    }
  }
}
