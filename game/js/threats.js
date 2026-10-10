// 天災：重ね合わせ竜巻・飛来物（トタン板）・落雷
import * as THREE from 'three';
import { heightAt, groundAt, coastX } from './world.js';
import { toToon } from './toon.js';
import { Minion } from './minions.js';
import { rand, GLSL_NOISE } from './util.js';

const tornadoVS = /* glsl */`
  uniform float uTime, uSeed, uLean;
  varying vec2 vUv; varying vec3 vW;
  void main(){
    vUv = uv;
    vec3 p = position;
    float h = uv.y;
    p.x += sin(h*5. + uTime*1.3 + uSeed)*h*h*3. + uLean*h*h*6.;
    p.z += cos(h*4. + uTime*1.1 + uSeed)*h*h*3.;
    vec4 w = modelMatrix*vec4(p,1.);
    vW = w.xyz;
    gl_Position = projectionMatrix*viewMatrix*w;
  }`;
const tornadoFS = /* glsl */`
  uniform float uTime, uSpin, uAlpha, uGhost, uSeed, uFogDensity, uHit;
  uniform vec3 uColA, uColB, uFogColor;
  varying vec2 vUv; varying vec3 vW;
  ${GLSL_NOISE}
  void main(){
    vec2 q = vec2(vUv.x*7. - uTime*uSpin + vUv.y*4., vUv.y*5. - uTime*.7 + uSeed);
    float n = fbm(q);
    float n2 = fbm(q*2.3 + 3.);
    float streak = smoothstep(.25, .7, n*.7 + n2*.45);
    float a = streak * smoothstep(0., .1, vUv.y) * (1. - smoothstep(.7, 1., vUv.y)) * uAlpha;
    vec3 col = mix(uColA, uColB, n2);
    // 重ね合わせ状態：紫〜シアンに揺らぎ、明滅する
    vec3 qc = mix(vec3(.55,.35,1.), vec3(.3,.95,1.), .5+.5*sin(vUv.y*14. - uTime*5. + uSeed));
    col = mix(col, qc*1.6, uGhost*.75);
    a *= mix(1., .55 + .45*sin(uTime*23. + vUv.y*40. + uSeed*3.), uGhost);
    col += vec3(1.,.5,.3)*uHit;
    float d = length(vW - cameraPosition);
    col = mix(col, uFogColor, (1. - exp(-uFogDensity*uFogDensity*d*d))*.85);
    gl_FragColor = vec4(col, a);
  }`;

const tornadoGeoOuter = new THREE.CylinderGeometry(11, 1.6, 52, 40, 24, true).translate(0, 26, 0);
const tornadoGeoInner = new THREE.CylinderGeometry(6, 0.9, 50, 32, 24, true).translate(0, 25, 0);
const skirtGeo = new THREE.CylinderGeometry(9, 5, 5, 32, 4, true).translate(0, 2.5, 0);

class Tornado {
  constructor(sys, pos, real, group) {
    this.sys = sys; this.real = real; this.group = group;
    this.pos = pos.clone();
    this.alive = true;
    this.hp = this.maxHp = group.hp;
    this.seed = Math.random() * 100;
    this.target = -1;
    this.retarget = 0;
    this.fade = 0;
    this.dying = 0;
    this.hit = 0;
    this.tunnelCd = 0;
    this.obj = new THREE.Group();
    this.mats = [];
    const mk = (geo, spin, a, colA, colB) => {
      const mat = new THREE.ShaderMaterial({
        transparent: true, depthWrite: false, side: THREE.DoubleSide,
        uniforms: {
          uTime: { value: 0 }, uSeed: { value: this.seed }, uSpin: { value: spin }, uAlpha: { value: a }, uGhost: { value: 1 },
          uLean: { value: 0 }, uHit: { value: 0 },
          uColA: { value: new THREE.Color(colA) }, uColB: { value: new THREE.Color(colB) },
          uFogColor: { value: sys.weather.fogColor }, uFogDensity: { value: 0.003 },
        },
        vertexShader: tornadoVS, fragmentShader: tornadoFS,
      });
      this.mats.push(mat);
      const m = new THREE.Mesh(geo, mat);
      m.frustumCulled = false;
      this.obj.add(m);
      return m;
    };
    mk(tornadoGeoOuter, 1.6, 0.95, '#2e2a26', '#7d705f');
    mk(tornadoGeoInner, 2.6, 0.9, '#1c1a18', '#4f463d');
    mk(skirtGeo, 1.0, 0.8, '#5d5142', '#9b8a70');
    // 巻き上げられた破片
    const n = 120, p = new Float32Array(n * 3);
    this.debris = Array.from({ length: n }, () => ({ a: Math.random() * 6.28, h: Math.random() * 40, r: 2 + Math.random() * 9, s: 1.5 + Math.random() * 2 }));
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(p, 3));
    this.debrisPts = new THREE.Points(g, new THREE.PointsMaterial({ color: '#3a3128', size: 0.35, transparent: true, opacity: 0.9 }));
    this.debrisPts.frustumCulled = false;
    this.obj.add(this.debrisPts);
    this.obj.position.copy(this.pos);
    this.baseScale = group.scale || 1;
    this.obj.scale.setScalar(this.baseScale);
    sys.scene.add(this.obj);
  }

  setGhost(v) { for (const m of this.mats) m.uniforms.uGhost.value = v; }

  update(dt, t) {
    const sys = this.sys;
    this.fade = Math.min(1, this.fade + dt * 0.8);
    this.tunnelCd -= dt;
    let alphaMul = this.fade;
    if (this.dying > 0) {
      this.dying += dt;
      alphaMul *= Math.max(0, 1 - this.dying / 1.2);
      this.obj.scale.setScalar(this.baseScale * (1 + this.dying * 0.5));
      if (this.dying > 1.2) { this.dispose(); return; }
    } else {
      // 目標キャベツへ移動
      this.retarget -= dt;
      const cab = sys.cabbages;
      if (this.target < 0 || cab.state[this.target] || this.retarget <= 0) {
        this.target = cab.nearestAlive(this.pos.x + rand(-30, 30), this.pos.z + rand(-30, 30));
        this.retarget = 6;
      }
      const spd = this.group.speed * (sys.slow ? 0.35 : 1);
      if (this.target >= 0) {
        const c = cab.list[this.target];
        const dx = c.x - this.pos.x, dz = c.z - this.pos.z, d = Math.hypot(dx, dz);
        const wob = Math.sin(t * 0.7 + this.seed) * 0.6;
        if (d > 0.5) {
          this.pos.x += (dx / d + wob * -dz / d * 0.5) * spd * dt;
          this.pos.z += (dz / d + wob * dx / d * 0.5) * spd * dt;
        }
      }
      const gh = Math.max(groundAt(this.pos.x, this.pos.z), 0);
      this.pos.y = gh;
      this.obj.position.copy(this.pos);

      // 実体のみがキャベツを破壊。未観測なら接触でデコヒーレンス（自動収束）
      if (this.real && !this.group.practice) {
        const near = cab.nearestAlive(this.pos.x, this.pos.z, 6 * Math.max(0.5, this.baseScale));
        if (near >= 0 && !this.group.collapsed) sys.collapse(this.group, 'decoherence');
        if (this.group.collapsed) {
          const k = cab.damageRadius(this.pos.x, this.pos.z, 6.5 * Math.max(0.45, this.baseScale), 48 * dt * sys.dmgMul * (this.group.mini ? 0.5 : 1), 'tornado');
          if (k) sys.stats.lost += k;
        }
      }
      // プレイヤーとの接触＝位置の測定
      const pd = Math.hypot(sys.player.pos.x - this.pos.x, sys.player.pos.z - this.pos.z);
      if (pd < 6.5 * Math.max(0.4, this.baseScale)) {
        if (this.real) {
          if (!this.group.collapsed) sys.collapse(this.group, 'touch');
          sys.player.knock(this.pos, this.group.mini ? 7 : 16);
          sys.audio.whoosh();
        } else if (!this.group.collapsed) {
          sys.eliminateGhost(this, 'touch');
          return;
        }
      }
    }
    this.hit = Math.max(0, this.hit - dt * 4);
    for (const m of this.mats) {
      const u = m.uniforms;
      u.uTime.value = t;
      u.uFogDensity.value = sys.weather.fogDensity;
      u.uHit.value = this.hit;
      u.uLean.value = Math.sin(t * 0.4 + this.seed) * 0.6;
    }
    this.mats[0].uniforms.uAlpha.value = 0.95 * alphaMul;
    this.mats[1].uniforms.uAlpha.value = 0.9 * alphaMul;
    this.mats[2].uniforms.uAlpha.value = 0.8 * alphaMul;
    this.debrisPts.material.opacity = 0.9 * alphaMul * (this.group.collapsed ? 1 : 0.4);
    const p = this.debrisPts.geometry.attributes.position.array;
    this.debris.forEach((d, i) => {
      d.a += dt * d.s * (3 - d.h / 25);
      d.h = (d.h + dt * 4) % 42;
      const rr = d.r * (0.3 + d.h / 42);
      p[i * 3] = Math.cos(d.a) * rr; p[i * 3 + 1] = d.h; p[i * 3 + 2] = Math.sin(d.a) * rr;
    });
    this.debrisPts.geometry.attributes.position.needsUpdate = true;
  }

  damage(n) {
    this.hp -= n;
    this.hit = 1;
    if (this.hp <= 0 && !this.dying) {
      this.dying = 0.001;
      this.alive = false;
      return true;
    }
    return false;
  }

  vanish() { if (!this.dying) { this.dying = 0.001; this.alive = false; } }

  dispose() {
    this.sys.scene.remove(this.obj);
    for (const m of this.mats) m.dispose();
    this.debrisPts.geometry.dispose();
    this.debrisPts.material.dispose();
    this.removed = true;
  }
}

// 風で飛んでくるトタン板
class Debris {
  constructor(sys, from, targetIdx) {
    this.sys = sys;
    const c = sys.cabbages.list[targetIdx];
    this.target = new THREE.Vector3(c.x, c.y + 0.4, c.z);
    this.from = from.clone();
    this.T = rand(4.5, 6.5);
    this.t = 0;
    this.alive = true;
    this.mesh = new THREE.Mesh(sys.debrisGeo, sys.debrisMat);
    this.mesh.castShadow = true;
    this.spin = new THREE.Vector3(rand(3, 8), rand(2, 6), rand(3, 8));
    this.pos = from.clone();
    sys.scene.add(this.mesh);
  }
  update(dt) {
    this.t += dt * (this.sys.slow ? 0.35 : 1);
    const k = Math.min(1, this.t / this.T);
    this.pos.lerpVectors(this.from, this.target, k);
    this.pos.y += Math.sin(k * Math.PI) * 18;
    this.mesh.position.copy(this.pos);
    this.mesh.rotation.set(this.spin.x * this.t, this.spin.y * this.t, this.spin.z * this.t);
    if (k >= 1) {
      const n = this.sys.cabbages.damageRadius(this.target.x, this.target.z, 2.2, 75 * this.sys.dmgMul, 'up');
      this.sys.stats.lost += n;
      this.sys.fx.burst(this.target, '#8a7a6a', 25, 6, 0.8, 0.3);
      this.sys.audio.clank(0.7);
      this.remove();
    }
  }
  remove() { this.alive = false; this.sys.scene.remove(this.mesh); }
}

// 落雷予告→着弾
class Strike {
  constructor(sys, idx) {
    this.sys = sys;
    const c = sys.cabbages.list[idx];
    this.pos = new THREE.Vector3(c.x, c.y, c.z);
    this.t = 0; this.T = 2.6; this.alive = true; this.reflected = false;
    const mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      uniforms: { uT: { value: 0 }, uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: /* glsl */`
        uniform float uT, uTime; varying vec2 vUv;
        void main(){
          float r = length(vUv-.5)*2.;
          float ring = smoothstep(.9,.96,r)*(1.-smoothstep(.96,1.,r));
          float fill = step(r, uT)*(1.-step(1.,r))*.25;
          float pulse = .6+.4*sin(uTime*20.);
          float a = (ring*pulse + fill)*(r<1.?1.:0.);
          gl_FragColor = vec4(vec3(1.,.85,.3)*a*2.5, a);
        }`,
    });
    this.mesh = new THREE.Mesh(new THREE.PlaneGeometry(11, 11).rotateX(-Math.PI / 2), mat);
    this.mesh.position.copy(this.pos).add(new THREE.Vector3(0, 0.25, 0));
    sys.scene.add(this.mesh);
  }
  update(dt, t) {
    this.t += dt * (this.sys.slow ? 0.35 : 1);
    const u = this.mesh.material.uniforms;
    u.uT.value = this.t / this.T; u.uTime.value = t;
    if (this.t >= this.T) this.fire();
  }
  fire() {
    const sys = this.sys;
    this.alive = false;
    sys.scene.remove(this.mesh);
    this.mesh.geometry.dispose(); this.mesh.material.dispose();
    // 避雷塔が近くにあれば吸収
    const rod = sys.towers.findRod(this.pos);
    if (rod) {
      sys.weather.strike(rod.top.clone());
      sys.audio.thunder(0);
      sys.fx.ring(rod.pos, '#7fdfff', 14, 0.7);
      sys.game.addQ(6, rod.top);
      sys.hud.toast('トンネル避雷塔が落雷を吸収 +6Q', 'q');
      sys.stats.absorbed++;
      return;
    }
    if (this.reflected) return;
    sys.weather.strike(this.pos.clone());
    sys.audio.thunder(0);
    const n = sys.cabbages.damageRadius(this.pos.x, this.pos.z, 5, 200 * sys.dmgMul, 'up');
    sys.stats.lost += n;
    sys.fx.burst(this.pos, '#ffd27a', 50, 12, 0.9, 0.4);
    sys.fx.ring(this.pos, '#ffcf6a', 10, 0.5);
    const pd = sys.player.pos.distanceTo(this.pos);
    if (pd < 5.5) { sys.player.knock(this.pos, 12); sys.hud.toast('感電！', 'bad'); }
    sys.player.shake = Math.max(sys.player.shake, 0.5 * Math.max(0, 1 - pd / 80));
  }
  // ギターの反射（ジャスト判定で予告円内）
  reflect() {
    this.reflected = true;
    this.alive = false;
    const sys = this.sys;
    sys.scene.remove(this.mesh);
    sys.weather.strike(this.pos.clone().add(new THREE.Vector3(0, 160, 0)), this.pos.clone().add(new THREE.Vector3(0, 2.5, 0)));
    sys.audio.thunder(0.2);
    sys.fx.sphere(this.pos.clone().add(new THREE.Vector3(0, 2, 0)), '#ffe08a', 8, 0.6);
  }
}

export class Threats {
  constructor(game) {
    this.game = game;
    this.scene = game.scene; this.weather = game.weather; this.cabbages = game.cabbages;
    this.player = game.player; this.fx = game.fx; this.audio = game.audio; this.hud = game.hud;
    this.towers = null;
    this.groups = []; this.tornados = []; this.debris = []; this.strikes = []; this.minions = [];
    this.minionKills = 0; this.boss = null;
    this.slow = false;
    this.dmgMul = 1;
    this.stats = { lost: 0, tornados: 0, debris: 0, reflected: 0, absorbed: 0, collapsed: 0 };
    this.debrisGeo = new THREE.BoxGeometry(2.2, 0.06, 1.1, 8, 1, 1);
    const p = this.debrisGeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setY(i, p.getY(i) + Math.sin(p.getX(i) * 14) * 0.04);
    this.debrisGeo.computeVertexNormals();
    this.debrisMat = toToon(new THREE.MeshStandardMaterial({ color: '#9a968e', metalness: 0.7, roughness: 0.55, side: THREE.DoubleSide }));
  }

  get activeReal() { return this.tornados.filter((t) => t.real && t.alive && !t.group.mini && !t.group.practice).length; }

  // 重ね合わせ状態の竜巻グループを生成
  spawnGroup(wave, baseAngle) {
    const members = 2 + Math.floor(wave / 2);
    const realIdx = Math.floor(Math.random() * members);
    const group = { members: [], collapsed: false, hp: 110 + wave * 45, speed: 3.6 + wave * 0.45 };
    // 竜巻は東の海から上陸してくる
    const z0 = this.landZ ?? Math.max(-120, Math.min(120, Math.sin(baseAngle) * 160 + rand(-50, 50)));
    for (let i = 0; i < members; i++) {
      const z = Math.max(-140, Math.min(140, z0 + (i - (members - 1) / 2) * rand(35, 55)));
      const pos = new THREE.Vector3(coastX(z) + rand(25, 45), 0, z);
      const tor = new Tornado(this, pos, i === realIdx, group);
      group.members.push(tor);
      this.tornados.push(tor);
    }
    this.groups.push(group);
    return group;
  }

  // 前ぶれの雑魚：青虫・カラス・つむじ風（小さな竜巻。重ね合わせなし）
  spawnMinion(type, wave) {
    if (type === 'tsumuji') {
      const z = Math.max(-130, Math.min(130, (this.landZ ?? 0) + rand(-45, 45)));
      const group = { members: [], collapsed: true, hp: 40 + wave * 12, speed: 4.5 + wave * 0.3, scale: 0.3, mini: true };
      const tor = new Tornado(this, new THREE.Vector3(coastX(z) + rand(10, 25), 0, z), true, group);
      tor.setGhost(0);
      group.members.push(tor);
      this.tornados.push(tor);
      this.groups.push(group);
      return;
    }
    this.minions.push(new Minion(this, type, wave));
  }

  // 大ボス：台風の目（巨大な重ね合わせ竜巻）
  spawnBoss(wave, baseAngle) {
    const g = this.spawnGroup(wave, baseAngle);
    g.boss = true;
    g.scale = 1.7;
    for (const m of g.members) {
      m.hp = m.maxHp = 380 + wave * 190;
      m.baseScale = 1.7;
      m.obj.scale.setScalar(1.7);
    }
    g.speed = 2.8 + wave * 0.3;
    this.boss = g;
    return g;
  }

  get bossAlive() { return !!(this.boss && this.boss.members.some((m) => m.alive)); }
  get minionsAlive() { return this.minions.filter((m) => m.alive).length + this.tornados.filter((t) => t.alive && t.group.mini).length; }

  // タワーが狙う、いちばん近い攻撃できる敵
  nearestTarget(pos, r) {
    let best = null, bd = r * r;
    for (const m of this.minions) {
      if (!m.alive) continue;
      const d = (m.pos.x - pos.x) ** 2 + (m.pos.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = m; }
    }
    for (const t of this.tornados) {
      if (!t.alive || !t.group.collapsed || t.group.practice) continue;
      const d = (t.pos.x - pos.x) ** 2 + (t.pos.z - pos.z) ** 2;
      if (d < bd) { bd = d; best = t; }
    }
    return best;
  }

  // 敵にダメージを与え、倒したら報酬
  hitEnemy(e, dmg) {
    const p = e.pos.clone().add(new THREE.Vector3(0, e.type ? 1.5 : 8 * (e.baseScale || 1), 0));
    this.hud.floater(`-${Math.round(dmg)}`, p, this.game.camera, '#ffb84a');
    if (!e.damage(dmg)) return false;
    if (e.type || e.group.mini) {
      this.minionKills++;
      this.fx.burst(e.pos.clone().add(new THREE.Vector3(0, 1, 0)), e.type === 'mushi' ? '#9fe05a' : '#9aa0b0', 30, 8, 0.8, 0.35, 4);
      this.game.addQ(4, p);
      this.audio.clank(0.4);
    } else {
      this.stats.tornados++;
      const big = e.group.boss;
      this.game.addQ(big ? 80 : 25, p);
      this.fx.burst(e.pos.clone().add(new THREE.Vector3(0, 6, 0)), '#cfe8ff', big ? 200 : 90, big ? 26 : 18, 1.6, 0.6, 3);
      this.audio.dissipate();
      this.hud.toast(big ? '大ボスを倒した！ 台風の目が消えていく… +80Q' : '竜巻を消滅させた！ +25Q', 'good');
    }
    return true;
  }

  // チュートリアル用の練習竜巻（キャベツを荒らさず、その場で揺れるだけ）
  spawnPractice(playerPos, forward, superposed) {
    const away = new THREE.Vector3(playerPos.x, 0, playerPos.z).normalize();
    const base = playerPos.clone().addScaledVector(away, 24);
    const n = superposed ? 3 : 1;
    const realIdx = Math.floor(Math.random() * n);
    const group = { members: [], collapsed: !superposed, hp: 80, speed: 0, practice: true };
    const side = new THREE.Vector3(-away.z, 0, away.x);
    for (let i = 0; i < n; i++) {
      const pos = base.clone().addScaledVector(side, (i - (n - 1) / 2) * 16);
      const tor = new Tornado(this, pos, i === realIdx, group);
      if (!superposed) tor.setGhost(0);
      group.members.push(tor);
      this.tornados.push(tor);
    }
    this.groups.push(group);
    return group;
  }

  collapse(group, reason) {
    if (group.collapsed) return;
    group.collapsed = true;
    this.stats.collapsed++;
    for (const m of group.members) {
      if (m.real) {
        m.setGhost(0);
        this.fx.beam(m.pos, '#b48cff', 70, 3.5, 0.9);
        this.fx.sphere(m.pos.clone().add(new THREE.Vector3(0, 10, 0)), '#9f7bff', 14, 0.8);
      } else if (m.alive) {
        this.fx.burst(m.pos.clone().add(new THREE.Vector3(0, 12, 0)), '#a98bff', 60, 14, 1.2, 0.6, 0);
        m.vanish();
      }
    }
    this.audio.collapse();
    const msg = {
      observe: '観測！波動関数が収束した ― 実体はこいつだ！',
      tower: '観測塔が竜巻を観測。波動関数が収束！',
      decoherence: 'デコヒーレンス！キャベツとの相互作用で実体化した！',
      touch: '体当たりで位置を測定！実体化した！',
      solo: '量子ギターソロが全てを観測した！',
      last: '残る可能性はひとつ ― 実体確定！',
    }[reason];
    this.hud.toast(msg, reason === 'decoherence' ? 'bad' : 'q');
  }

  // 「そこにはいなかった」という測定結果で分岐を消す
  eliminateGhost(t, reason) {
    t.vanish();
    this.fx.burst(t.pos.clone().add(new THREE.Vector3(0, 10, 0)), '#a98bff', 40, 10, 1, 0.5, 0);
    const rest = t.group.members.filter((m) => m.alive);
    if (rest.length === 1) this.collapse(t.group, 'last');
    else if (reason === 'touch') this.hud.toast('ここには「いなかった」― 分岐がひとつ消えた', 'q');
  }

  // 半径内を観測：実体が含まれれば収束、含まれなければその分岐だけ消える
  measure(center, radius, reason) {
    let found = 0;
    for (const g of this.groups) {
      if (g.collapsed) continue;
      const inR = g.members.filter((m) => m.alive && Math.hypot(m.pos.x - center.x, m.pos.z - center.z) < radius);
      if (!inR.length) continue;
      found++;
      if (inR.some((m) => m.real)) this.collapse(g, reason);
      else for (const m of inR) this.eliminateGhost(m, reason);
    }
    return found;
  }

  // 衝撃波ダメージ（収束済みの竜巻・飛来物のみ）
  blast(center, radius, dmg, opts = {}) {
    let hits = 0, unobserved = 0;
    for (const t of this.tornados) {
      if (!t.alive) continue;
      const d = Math.hypot(t.pos.x - center.x, t.pos.z - center.z);
      if (d > radius + 4) continue;
      if (opts.cone && d > opts.inner) {
        const dir = new THREE.Vector2(t.pos.x - center.x, t.pos.z - center.z).normalize();
        if (dir.dot(opts.cone) < 0.6) continue;
      }
      if (!t.group.collapsed) { unobserved++; continue; }
      hits++;
      // 衝撃波で竜巻を押し返す
      if (opts.push && opts.from) {
        const dx = t.pos.x - opts.from.x, dz = t.pos.z - opts.from.z, l = Math.hypot(dx, dz) || 1;
        t.pos.x += dx / l * opts.push; t.pos.z += dz / l * opts.push;
      }
      this.fx.burst(t.pos.clone().add(new THREE.Vector3(0, 4, 0)), '#ffd36a', 20, 10, 0.6, 0.4, 2);
      this.hitEnemy(t, dmg);
    }
    for (const m of this.minions) {
      if (!m.alive) continue;
      const d = Math.hypot(m.pos.x - center.x, m.pos.z - center.z);
      if (d > radius + 1) continue;
      if (opts.cone && d > opts.inner) {
        const dir = new THREE.Vector2(m.pos.x - center.x, m.pos.z - center.z).normalize();
        if (dir.dot(opts.cone) < 0.6) continue;
      }
      hits++;
      if (opts.push && opts.from && m.type === 'mushi') {
        const dx = m.pos.x - opts.from.x, dz = m.pos.z - opts.from.z, l = Math.hypot(dx, dz) || 1;
        m.pos.x += dx / l * opts.push * 0.6; m.pos.z += dz / l * opts.push * 0.6;
      }
      this.hitEnemy(m, dmg);
    }
    for (const d of this.debris) {
      if (!d.alive) continue;
      if (d.pos.distanceTo(center) < radius + 6) {
        d.remove();
        hits++;
        this.stats.debris++;
        this.fx.burst(d.pos, '#d0d0d0', 18, 8, 0.6, 0.25);
        this.audio.clank(0.5);
        this.game.addQ(3, d.pos);
      }
    }
    return { hits, unobserved };
  }

  // 落雷予告円にいてジャストで弾く
  tryReflect(pos) {
    for (const s of this.strikes) {
      if (s.alive && Math.hypot(s.pos.x - pos.x, s.pos.z - pos.z) < 5.8) {
        s.reflect();
        this.stats.reflected++;
        this.game.addQ(10, pos.clone().add(new THREE.Vector3(0, 3, 0)));
        this.game.addSolo(18);
        this.hud.toast('雷をギターで弾き返した！ +10Q', 'good');
        return true;
      }
    }
    return false;
  }

  spawnDebris() {
    const idx = this.cabbages.randomAlive();
    if (idx < 0) return;
    const c = this.cabbages.list[idx];
    const w = this.weather.windDir;
    const from = new THREE.Vector3(c.x - w.x * 110 + rand(-30, 30), 0, c.z - w.y * 110 + rand(-30, 30));
    from.y = Math.max(heightAt(from.x, from.z), 0) + 6;
    this.debris.push(new Debris(this, from, idx));
  }

  spawnStrike() {
    const idx = this.cabbages.randomAlive();
    if (idx < 0) return;
    this.strikes.push(new Strike(this, idx));
    this.audio.warn();
  }

  // 嵐の終わりに残った天災を消す
  clearAll() {
    for (const t of this.tornados) t.vanish();
    for (const m of this.minions) if (m.alive) m.remove();
    this.minions = [];
    for (const d of this.debris) if (d.alive) d.remove();
    for (const s of this.strikes) if (s.alive) { s.alive = false; this.scene.remove(s.mesh); }
  }

  update(dt, t) {
    for (const tor of this.tornados) if (!tor.removed) tor.update(dt, t);
    this.tornados = this.tornados.filter((x) => !x.removed);
    this.groups = this.groups.filter((g) => g.members.some((m) => m.alive));
    for (const d of this.debris) if (d.alive) d.update(dt);
    this.debris = this.debris.filter((d) => d.alive);
    for (const m of this.minions) if (m.alive) m.update(dt);
    this.minions = this.minions.filter((m) => m.alive);
    if (this.boss && !this.bossAlive) this.boss = null;
    for (const s of this.strikes) if (s.alive) s.update(dt, t);
    this.strikes = this.strikes.filter((s) => s.alive);
  }
}
