// 天候：空・雲・雨・霧・光源・雷
import * as THREE from 'three';
import { Sky } from 'three/addons/objects/Sky.js';
import { lerp, damp, rand, GLSL_NOISE } from './util.js';

class PolyCurve extends THREE.Curve {
  constructor(pts) { super(); this.pts = pts; }
  getPoint(t, target = new THREE.Vector3()) {
    const n = this.pts.length - 1, f = Math.min(t * n, n - 1e-6), i = Math.floor(f);
    return target.copy(this.pts[i]).lerp(this.pts[i + 1], f - i);
  }
}

function jagged(a, b, depth, spread) {
  let pts = [a.clone(), b.clone()];
  for (let d = 0; d < depth; d++) {
    const next = [pts[0]];
    for (let i = 0; i < pts.length - 1; i++) {
      const m = pts[i].clone().lerp(pts[i + 1], 0.5);
      const len = pts[i].distanceTo(pts[i + 1]);
      m.x += (Math.random() - 0.5) * len * spread;
      m.z += (Math.random() - 0.5) * len * spread;
      m.y += (Math.random() - 0.5) * len * spread * 0.3;
      next.push(m, pts[i + 1]);
    }
    pts = next;
  }
  return pts;
}

const CALM = {
  turbidity: 5.5, rayleigh: 1.5, mie: 0.006, mieG: 0.86,
  fog: new THREE.Color('#c7b8a0'), fogDensity: 0.0021,
  sunInt: 3.4, hemiInt: 1.0, exposure: 0.62,
};
const STORM = {
  turbidity: 18, rayleigh: 0.25, mie: 0.03, mieG: 0.7,
  fog: new THREE.Color('#3b4247'), fogDensity: 0.0078,
  sunInt: 0.3, hemiInt: 0.32, exposure: 0.78,
};

export class Weather {
  constructor(scene, renderer, Q) {
    this.scene = scene; this.renderer = renderer; this.Q = Q;
    this.storm = 0; this.target = 0;
    this.windDir = new THREE.Vector2(-0.8, -0.6).normalize();
    this.windSpeed = 4;
    this.flash = 0;
    this.typhoonCenter = new THREE.Vector2(1600, 900);
    this.sunDir = new THREE.Vector3().setFromSphericalCoords(1, THREE.MathUtils.degToRad(72), THREE.MathUtils.degToRad(115));
    this.skyColor = new THREE.Color('#b8c6d4');
    this.fogColor = CALM.fog.clone();
    this.fogDensity = CALM.fogDensity;

    // 空
    this.sky = new Sky();
    this.sky.scale.setScalar(10000);
    scene.add(this.sky);
    this.sky.material.uniforms.sunPosition.value.copy(this.sunDir);

    // 環境マップ用シーン（空＋嵐の暗幕）
    this.envScene = new THREE.Scene();
    this.envSky = new Sky();
    this.envSky.scale.setScalar(1000);
    this.envScene.add(this.envSky);
    this.envShade = new THREE.Mesh(new THREE.SphereGeometry(40, 16, 8),
      new THREE.MeshBasicMaterial({ color: '#232a30', side: THREE.BackSide, transparent: true, opacity: 0 }));
    this.envScene.add(this.envShade);
    this.pmrem = new THREE.PMREMGenerator(renderer);
    this.envRT = null; this.lastEnvStorm = -1; this.envTimer = 0;

    // 光源
    this.sun = new THREE.DirectionalLight('#ffd6a0', CALM.sunInt);
    this.sun.castShadow = Q.shadow > 0;
    if (Q.shadow) {
      this.sun.shadow.mapSize.set(Q.shadow, Q.shadow);
      const c = this.sun.shadow.camera;
      c.left = -70; c.right = 70; c.top = 70; c.bottom = -70; c.near = 1; c.far = 400;
      this.sun.shadow.bias = -0.0008;
      this.sun.shadow.normalBias = 0.3;
    }
    scene.add(this.sun, this.sun.target);
    this.hemi = new THREE.HemisphereLight('#bcd0ff', '#4b4130', CALM.hemiInt);
    scene.add(this.hemi);
    this.flashLight = new THREE.PointLight('#cfe0ff', 0, 260, 1.4);
    scene.add(this.flashLight);

    scene.fog = new THREE.FogExp2(this.fogColor.clone(), this.fogDensity);

    // 嵐の空を暗くするドーム（空シェーダーの上に重ねる）
    this.domeMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.BackSide, fog: false,
      uniforms: { uColor: { value: new THREE.Color() }, uStorm: { value: 0 }, uFlash: { value: 0 } },
      vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); vec4 w = modelMatrix*vec4(position,1.); gl_Position = projectionMatrix*viewMatrix*w; }',
      fragmentShader: /* glsl */`
        uniform vec3 uColor; uniform float uStorm, uFlash; varying vec3 vD;
        void main(){
          float h = clamp(vD.y, 0., 1.);
          float a = uStorm * mix(.97, .85, smoothstep(0., .5, h));
          gl_FragColor = vec4(uColor * (1. + uFlash*1.5), a);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.dome = new THREE.Mesh(new THREE.SphereGeometry(4000, 32, 16), this.domeMat);
    this.dome.renderOrder = -2;
    this.dome.frustumCulled = false;
    scene.add(this.dome);

    this.buildClouds();
    this.buildRain();
    this.bolts = [];
    this.boltMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(4, 4.4, 6), fog: false, transparent: true });
  }

  buildClouds() {
    const geo = new THREE.PlaneGeometry(7000, 7000, 1, 1);
    geo.rotateX(Math.PI / 2);
    this.cloudMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, side: THREE.DoubleSide,
      uniforms: {
        uTime: { value: 0 }, uCover: { value: 0.35 }, uStorm: { value: 0 },
        uSunDir: { value: this.sunDir }, uSunCol: { value: new THREE.Color('#ffcf94') },
        uFogCol: { value: this.fogColor }, uWind: { value: this.windDir }, uTy: { value: this.typhoonCenter },
        uFlash: { value: 0 },
      },
      vertexShader: 'varying vec3 vW; void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: /* glsl */`
        uniform float uTime, uCover, uStorm, uFlash; uniform vec3 uSunDir, uSunCol, uFogCol; uniform vec2 uWind, uTy;
        varying vec3 vW;
        ${GLSL_NOISE}
        void main(){
          vec2 p = vW.xz;
          vec2 d = p - uTy; float r = length(d);
          float ang = uStorm * 2600. / (r + 500.);
          float s = sin(ang), c = cos(ang);
          p = uTy + mat2(c,-s,s,c)*d;
          vec2 q = p*.0011 + uWind*uTime*.006;
          float warp = fbm(q*1.7 + uTime*.01);
          float n = fbm(q + warp*.7);
          float th = 1. - uCover;
          float cov = smoothstep(th - .12, th + .2, n);
          float dens = smoothstep(th, th + .45, n);
          float lightSide = fbm(q + uSunDir.xz*.03 + warp*.7);
          float shade = clamp((n - lightSide)*6. + .5, 0., 1.);
          vec3 lit = vec3(1., .96, .9);
          vec3 dark = mix(vec3(.5,.53,.6), vec3(.1,.11,.13), uStorm);
          vec3 col = mix(lit, dark, clamp(dens*.8 + shade*.35 + uStorm*.55, 0., 1.));
          col += uSunCol * (1.-dens) * cov * .55 * (1.-uStorm);
          col += vec3(.7,.75,1.) * uFlash * 2.5 * dens;
          float dist = length(vW.xz - cameraPosition.xz);
          col = mix(col, uFogCol, smoothstep(500., 3200., dist)*.75);
          float fade = 1. - smoothstep(2200., 3400., dist);
          gl_FragColor = vec4(col, cov*fade*.98);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`,
    });
    this.clouds = new THREE.Mesh(geo, this.cloudMat);
    this.clouds.position.y = 240;
    this.clouds.renderOrder = -1;
    this.clouds.frustumCulled = false;
    this.scene.add(this.clouds);
  }

  buildRain() {
    const N = this.Q.rain;
    const pos = new Float32Array(N * 2 * 3), end = new Float32Array(N * 2), seed = new Float32Array(N * 2);
    for (let i = 0; i < N; i++) {
      const x = Math.random(), y = Math.random(), z = Math.random(), s = Math.random();
      for (let k = 0; k < 2; k++) {
        const j = i * 2 + k;
        pos[j * 3] = x; pos[j * 3 + 1] = y; pos[j * 3 + 2] = z;
        end[j] = k; seed[j] = s;
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    geo.setAttribute('aEnd', new THREE.BufferAttribute(end, 1));
    geo.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.rainMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: {
        uTime: { value: 0 }, uCam: { value: new THREE.Vector3() }, uWind: { value: new THREE.Vector3() },
        uOpacity: { value: 0 }, uFlash: { value: 0 },
      },
      vertexShader: /* glsl */`
        attribute float aEnd; attribute float aSeed;
        uniform float uTime; uniform vec3 uCam; uniform vec3 uWind;
        varying float vA;
        void main(){
          vec3 box = vec3(90., 60., 90.);
          float speed = 26. + aSeed*10.;
          vec3 vel = vec3(uWind.x, -speed, uWind.z);
          vec3 p = position*box + vel*uTime*(0.9+aSeed*.2);
          p = mod(p - uCam + box*.5, box) - box*.5 + uCam;
          p += normalize(vel) * aEnd * (0.9 + aSeed*0.8);
          vA = 1. - smoothstep(20., 45., length(p - uCam));
          gl_Position = projectionMatrix*viewMatrix*vec4(p,1.);
        }`,
      fragmentShader: 'uniform float uOpacity, uFlash; varying float vA; void main(){ gl_FragColor=vec4(vec3(.72,.78,.86)+uFlash, uOpacity*vA*.55); }',
    });
    this.rain = new THREE.LineSegments(geo, this.rainMat);
    this.rain.frustumCulled = false;
    this.scene.add(this.rain);
    this.rainCount = N;
  }

  setStorm(v) { this.target = v; }

  strike(to, from) {
    const start = from || new THREE.Vector3(to.x + rand(-40, 40), 180, to.z + rand(-40, 40));
    const main = jagged(start, to, 6, 0.55);
    const group = new THREE.Group();
    group.add(new THREE.Mesh(new THREE.TubeGeometry(new PolyCurve(main), main.length * 2, 0.32, 5, false), this.boltMat));
    for (let b = 0; b < 4; b++) {
      const i = Math.floor(rand(4, main.length * 0.7));
      const s = main[i];
      const e = s.clone().add(new THREE.Vector3(rand(-30, 30), -rand(15, 45), rand(-30, 30)));
      const pts = jagged(s, e, 4, 0.6);
      group.add(new THREE.Mesh(new THREE.TubeGeometry(new PolyCurve(pts), pts.length * 2, 0.14, 4, false), this.boltMat));
    }
    this.scene.add(group);
    this.bolts.push({ group, life: 0.32 });
    this.flash = 1;
    this.flashLight.position.copy(to).add(new THREE.Vector3(0, 25, 0));
  }

  // 雷鳴なしの遠雷（演出用）
  distantFlash() { this.flash = Math.max(this.flash, 0.45); }

  update(dt, t, camera, focus) {
    this.storm = damp(this.storm, this.target, 0.35, dt);
    const s = this.storm;
    this.windSpeed = lerp(4, 38 + this.target * 34, s);

    const su = this.sky.material.uniforms;
    su.turbidity.value = lerp(CALM.turbidity, STORM.turbidity, s);
    su.rayleigh.value = lerp(CALM.rayleigh, STORM.rayleigh, s);
    su.mieCoefficient.value = lerp(CALM.mie, STORM.mie, s);
    su.mieDirectionalG.value = lerp(CALM.mieG, STORM.mieG, s);

    this.fogColor.copy(CALM.fog).lerp(STORM.fog, s);
    this.fogDensity = lerp(CALM.fogDensity, STORM.fogDensity, s);
    this.scene.fog.color.copy(this.fogColor).lerp(new THREE.Color('#9aa8c0'), this.flash * 0.5);
    this.scene.fog.density = this.fogDensity;
    this.skyColor.set('#b8c6d4').lerp(new THREE.Color('#4a5258'), s);

    this.sun.intensity = lerp(CALM.sunInt, STORM.sunInt, s);
    this.sun.color.set('#ffd2a0').lerp(new THREE.Color('#a0a8b4'), s);
    this.hemi.intensity = lerp(CALM.hemiInt, STORM.hemiInt, s) + this.flash * 2.5;
    this.hemi.color.set('#bcd0ff').lerp(new THREE.Color('#6d7884'), s);
    this.renderer.toneMappingExposure = lerp(CALM.exposure, STORM.exposure, s);

    // 影カメラをプレイヤーに追従
    this.sun.position.copy(focus).addScaledVector(this.sunDir, 200);
    this.sun.target.position.copy(focus);

    this.dome.position.copy(camera.position);
    this.domeMat.uniforms.uColor.value.copy(this.fogColor).multiplyScalar(0.9);
    this.domeMat.uniforms.uStorm.value = Math.min(1, s * 1.15);
    this.domeMat.uniforms.uFlash.value = this.flash;

    // 雲
    const cu = this.cloudMat.uniforms;
    cu.uTime.value = t;
    cu.uCover.value = lerp(0.42, 0.97, s);
    cu.uStorm.value = s;
    cu.uFlash.value = this.flash;
    this.clouds.position.x = camera.position.x;
    this.clouds.position.z = camera.position.z;

    // 雨
    const ru = this.rainMat.uniforms;
    ru.uTime.value = t;
    ru.uCam.value.copy(camera.position);
    ru.uWind.value.set(this.windDir.x * this.windSpeed * 0.45, 0, this.windDir.y * this.windSpeed * 0.45);
    ru.uOpacity.value = Math.max(0, (s - 0.12) / 0.88);
    ru.uFlash.value = this.flash * 0.6;
    this.rain.geometry.setDrawRange(0, Math.floor(this.rainCount * 2 * Math.min(1, s * 1.3)));
    this.rain.visible = s > 0.12;

    // 雷光
    this.flash = Math.max(0, this.flash - dt * 4.5);
    this.flashLight.intensity = this.flash * 8000;
    for (let i = this.bolts.length - 1; i >= 0; i--) {
      const b = this.bolts[i];
      b.life -= dt;
      b.group.visible = b.life > 0 && (Math.random() > 0.25);
      if (b.life <= 0) {
        this.scene.remove(b.group);
        b.group.traverse((o) => o.geometry && o.geometry.dispose());
        this.bolts.splice(i, 1);
      }
    }

    // 環境マップを嵐の進み具合に応じて更新
    this.envTimer -= dt;
    if (Math.abs(s - this.lastEnvStorm) > 0.06 && this.envTimer <= 0) {
      const eu = this.envSky.material.uniforms;
      for (const k of ['turbidity', 'rayleigh', 'mieCoefficient', 'mieDirectionalG']) eu[k].value = su[k].value;
      eu.sunPosition.value.copy(this.sunDir);
      this.envShade.material.opacity = Math.min(0.97, s * 1.15);
      const rt = this.pmrem.fromScene(this.envScene, 0, 0.1, 100);
      if (this.envRT) this.envRT.dispose();
      this.envRT = rt;
      this.scene.environment = rt.texture;
      this.lastEnvStorm = s; this.envTimer = 1.2;
    }
  }
}
