// エフェクト：衝撃波リング・観測球・パーティクル・光柱
import * as THREE from 'three';

const ringVS = 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }';

export class FX {
  constructor(scene) {
    this.scene = scene;
    this.items = [];
    this.ringGeo = new THREE.PlaneGeometry(2, 2);
    this.ringGeo.rotateX(-Math.PI / 2);
    this.sphereGeo = new THREE.IcosahedronGeometry(1, 4);
    this.beamGeo = new THREE.CylinderGeometry(1, 1, 1, 24, 1, true);
    this.beamGeo.translate(0, 0.5, 0);
  }

  _add(mesh, life, update) {
    this.scene.add(mesh);
    this.items.push({ mesh, life, max: life, update });
  }

  // 地面を走る衝撃波リング（太さはメートル指定で、半径に関係なく一定）
  ring(pos, color, maxR, life = 0.6, width = 0.8) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: 1 }, uEdge: { value: 0.1 } },
      vertexShader: ringVS,
      fragmentShader: /* glsl */`
        uniform vec3 uColor; uniform float uA, uEdge; varying vec2 vUv;
        void main(){
          float r = length(vUv - .5) * 2.;
          if (r > 1.) discard;
          float band = smoothstep(1. - uEdge, 1. - uEdge*.35, r) * (1. - smoothstep(.96, 1., r));
          float a = (band + r*r*.06) * uA;
          gl_FragColor = vec4(uColor * a * 2., a);
        }`,
    });
    const m = new THREE.Mesh(this.ringGeo, mat);
    m.position.copy(pos).add(new THREE.Vector3(0, 0.3, 0));
    this._add(m, life, (k) => {
      const e = 1 - Math.pow(1 - k, 3);
      const r = 0.5 + e * maxR;
      m.scale.setScalar(r);
      mat.uniforms.uEdge.value = Math.min(0.9, (width * 2) / r);
      mat.uniforms.uA.value = (1 - k);
    });
  }

  sphere(pos, color, maxR, life = 0.9) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: 1 }, uT: { value: 0 } },
      vertexShader: 'varying vec3 vN; varying vec3 vV; varying vec3 vP; void main(){ vec4 w=modelMatrix*vec4(position,1.); vN=normalize(mat3(modelMatrix)*normal); vV=normalize(cameraPosition-w.xyz); vP=position; gl_Position=projectionMatrix*viewMatrix*w; }',
      fragmentShader: /* glsl */`
        uniform vec3 uColor; uniform float uA, uT; varying vec3 vN; varying vec3 vV; varying vec3 vP;
        void main(){
          float f = pow(1.-abs(dot(vN,vV)), 2.5);
          float grid = smoothstep(.92,1.,abs(sin(vP.y*18.+uT*6.))) + smoothstep(.95,1.,abs(sin(atan(vP.z,vP.x)*12.)));
          float a = (f*.9 + grid*.25) * uA;
          gl_FragColor = vec4(uColor*a*1.6, a);
        }`,
    });
    const m = new THREE.Mesh(this.sphereGeo, mat);
    m.position.copy(pos);
    this._add(m, life, (k) => {
      m.scale.setScalar(1 + (1 - Math.pow(1 - k, 2.5)) * maxR);
      mat.uniforms.uA.value = 1 - k;
      mat.uniforms.uT.value = k * 3;
    });
  }

  beam(pos, color, height, radius, life = 0.8, intensity = 1) {
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide,
      uniforms: { uColor: { value: new THREE.Color(color) }, uA: { value: 1 } },
      vertexShader: ringVS,
      fragmentShader: 'uniform vec3 uColor; uniform float uA; varying vec2 vUv; void main(){ float a=(1.-vUv.y)*uA; gl_FragColor=vec4(uColor*a*2.,a); }',
    });
    const m = new THREE.Mesh(this.beamGeo, mat);
    m.position.copy(pos);
    m.scale.set(radius, height, radius);
    this._add(m, life, (k) => {
      mat.uniforms.uA.value = intensity * (1 - k) * (k < 0.1 ? k * 10 : 1);
      m.scale.x = m.scale.z = radius * (1 - k * 0.7);
    });
  }

  burst(pos, color, count = 40, speed = 8, life = 1.2, size = 0.35, gravity = 6) {
    const p = new Float32Array(count * 3), v = [];
    for (let i = 0; i < count; i++) {
      p.set([pos.x, pos.y, pos.z], i * 3);
      const d = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.2, Math.random() - 0.5).normalize();
      v.push(d.multiplyScalar(speed * (0.4 + Math.random() * 0.6)));
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const mat = new THREE.PointsMaterial({
      color: new THREE.Color(color).multiplyScalar(2.5), size, transparent: true, depthWrite: false,
      blending: THREE.AdditiveBlending, sizeAttenuation: true,
    });
    const pts = new THREE.Points(geo, mat);
    let last = 0;
    this._add(pts, life, (k) => {
      const dt = (k - last) * life; last = k;
      for (let i = 0; i < count; i++) {
        v[i].y -= gravity * dt;
        p[i * 3] += v[i].x * dt; p[i * 3 + 1] += v[i].y * dt; p[i * 3 + 2] += v[i].z * dt;
      }
      geo.attributes.position.needsUpdate = true;
      mat.opacity = 1 - k;
    });
  }

  // 音符（♪♫）が飛び散る
  noteTexture(ch) {
    this._notes = this._notes || {};
    if (this._notes[ch]) return this._notes[ch];
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    g.font = 'bold 52px sans-serif'; g.textAlign = 'center'; g.textBaseline = 'middle';
    g.lineWidth = 6; g.strokeStyle = 'rgba(30,20,10,.9)'; g.strokeText(ch, 32, 34);
    g.fillStyle = '#fff'; g.fillText(ch, 32, 34);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    return (this._notes[ch] = t);
  }
  notes(pos, count = 8, colors = ['#ffd36a', '#ff7ac8', '#7fe8ff', '#b4ff7a'], power = 1) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({ map: this.noteTexture(['♪', '♫', '♬'][i % 3]), color: colors[i % colors.length], transparent: true, depthWrite: false });
      const s = new THREE.Sprite(mat);
      const a = Math.random() * Math.PI * 2;
      const v = new THREE.Vector3(Math.cos(a) * (2 + Math.random() * 3) * power, (4 + Math.random() * 4) * power, Math.sin(a) * (2 + Math.random() * 3) * power);
      s.position.copy(pos);
      const size = (0.3 + Math.random() * 0.3) * (0.8 + power * 0.3);
      s.scale.setScalar(size);
      let last = 0;
      const life = 0.9 + Math.random() * 0.5;
      this._add(s, life, (k) => {
        const dt = (k - last) * life; last = k;
        v.y -= 5 * dt;
        s.position.addScaledVector(v, dt);
        mat.rotation += dt * 3;
        mat.opacity = 1 - k * k;
        s.scale.setScalar(size * (1 + Math.sin(k * Math.PI) * 0.4));
      });
    }
  }

  // 前方へ放たれる音の波（縦向きの弧が広がりながら進む）
  soundWave(pos, dir, color = '#ffd36a', reach = 16, count = 3) {
    for (let i = 0; i < count; i++) {
      const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide, fog: false });
      const m = new THREE.Mesh(new THREE.TorusGeometry(1, 0.06, 6, 32, Math.PI * 0.8), mat);
      const start = pos.clone().add(new THREE.Vector3(0, 1.3, 0));
      const yaw = Math.atan2(dir.x, dir.z);
      m.rotation.set(0, yaw, Math.PI * 0.6);
      m.position.copy(start);
      m.visible = false;
      const delay = i * 0.08, life = 0.55 + delay;
      this._add(m, life, (k) => {
        const tt = k * life - delay;
        if (tt < 0) return;
        m.visible = true;
        const kk = tt / (life - delay);
        m.position.copy(start).addScaledVector(dir, kk * reach);
        m.scale.setScalar(0.6 + kk * reach * 0.35);
        mat.opacity = 0.9 * (1 - kk);
      });
    }
  }

  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const it = this.items[i];
      it.life -= dt;
      const k = Math.min(1, 1 - it.life / it.max);
      it.update(k);
      if (it.life <= 0) {
        this.scene.remove(it.mesh);
        it.mesh.material.dispose();
        if (it.mesh.isPoints || (it.mesh.isMesh && it.mesh.geometry.type === 'TorusGeometry')) it.mesh.geometry.dispose();
        this.items.splice(i, 1);
      }
    }
  }
}
