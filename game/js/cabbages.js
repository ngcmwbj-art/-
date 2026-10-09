// キャベツ畑：インスタンス描画・体力・吹き飛び
import * as THREE from 'three';
import { mergeGeometries, mergeVertices } from 'three/addons/utils/BufferGeometryUtils.js';
import { FIELDS, fieldWorld } from './world.js';
import { vnoise, mulberry32, clamp } from './util.js';

function buildCabbageGeometry() {
  // 結球部
  let head = new THREE.IcosahedronGeometry(0.4, 4);
  head.deleteAttribute('normal'); head.deleteAttribute('uv');
  head = mergeVertices(head);
  const p = head.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const v = new THREE.Vector3().fromBufferAttribute(p, i);
    const n = v.clone().normalize();
    const vein = Math.abs(Math.sin(Math.atan2(n.z, n.x) * 4 + n.y * 5)) * 0.025;
    const bump = vnoise(v.x * 9, v.z * 9 + v.y * 7) * 0.018;
    v.addScaledVector(n, vein + bump);
    v.y *= 0.86;
    p.setXYZ(i, v.x, v.y + 0.36, v.z);
  }
  head.computeVertexNormals();
  const headCol = new Float32Array(p.count * 3);
  const cTop = new THREE.Color('#bfdc86'), cSide = new THREE.Color('#86b552'), c = new THREE.Color();
  for (let i = 0; i < p.count; i++) {
    c.copy(cSide).lerp(cTop, clamp((p.getY(i) - 0.2) / 0.5, 0, 1));
    headCol.set([c.r, c.g, c.b], i * 3);
  }
  head.setAttribute('color', new THREE.BufferAttribute(headCol, 3));

  // 外葉：根元から立ち上がり、先端が外へ反り返る葉をパラメトリックに生成
  const leaves = [];
  const rng = mulberry32(3);
  const S = 10, T = 8;
  const LEAVES = [];
  for (let k = 0; k < 5; k++) LEAVES.push({ a: k * 1.2566 + 0.3, len: 0.36, rise: 0.5, out: 0.06, wid: 0.4 });
  for (let k = 0; k < 7; k++) LEAVES.push({ a: k * 0.8976, len: 0.55, rise: 0.36, out: 0.16, wid: 0.46 });
  for (let k = 0; k < LEAVES.length; k++) {
    const L = LEAVES[k];
    const a = L.a + rng() * 0.35;
    const len = L.len * (0.9 + rng() * 0.2);
    const ca = Math.cos(a), sa = Math.sin(a);
    const pos = [], col = [], idx = [];
    const cIn = new THREE.Color('#3d7430'), cOut = new THREE.Color('#79a95a'), cVein = new THREE.Color('#b5d49a');
    for (let i = 0; i <= S; i++) {
      const s = i / S;
      for (let j = 0; j <= T; j++) {
        const t = j / T * 2 - 1;
        const w = Math.sin(Math.min(1, 0.25 + s * 0.9) * Math.PI) * L.wid + 0.06;
        const r = 0.1 + s * len;
        let y = 0.02 + Math.sin(s * Math.PI * 0.8) * L.rise - s * s * L.out + t * t * 0.1 * s;
        y += Math.sin(t * 7 + s * 11 + k) * 0.022 * s;
        const lx = r, lz = t * w;
        pos.push(lx * ca - lz * sa, y, lx * sa + lz * ca);
        c.copy(cIn).lerp(cOut, s);
        if (Math.abs(t) < 0.12) c.lerp(cVein, 0.5);
        col.push(c.r, c.g, c.b);
      }
    }
    for (let i = 0; i < S; i++) for (let j = 0; j < T; j++) {
      const p0 = i * (T + 1) + j, p1 = p0 + 1, p2 = p0 + T + 1, p3 = p2 + 1;
      idx.push(p0, p2, p1, p1, p2, p3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    leaves.push(g);
  }
  return mergeGeometries([head, ...leaves]);
}

export class Cabbages {
  constructor(scene) {
    this.scene = scene;
    const list = [];
    const rng = mulberry32(11);
    FIELDS.forEach((f, fi) => {
      for (let r = 0; r < f.rows; r++) for (let c = 0; c < f.cols; c++) {
        const u = -f.w / 2 + f.w * (c + 0.5) / f.cols + (rng() - 0.5) * 0.5;
        const v = -f.d / 2 + f.d * (r + 0.5) / f.rows + (rng() - 0.5) * 0.3;
        const w = fieldWorld(f, u, v);
        list.push({ x: w.x, z: w.z, y: f.h + 0.02, field: fi, rot: rng() * 6.28, scale: 0.9 + rng() * 0.3 });
      }
    });
    this.total = list.length;
    this.alive = this.total;
    this.list = list;
    this.hp = new Float32Array(this.total).fill(100);
    this.state = new Uint8Array(this.total); // 0:健在 1:飛散中 2:消失
    this.fly = list.map(() => ({ p: new THREE.Vector3(), v: new THREE.Vector3(), spin: new THREE.Vector3(), t: 0 }));
    this.fieldAlive = FIELDS.map(() => 0);
    list.forEach((c) => this.fieldAlive[c.field]++);
    this.fieldTotal = this.fieldAlive.slice();

    const geo = buildCabbageGeometry();
    const mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.55, side: THREE.DoubleSide });
    this.mesh = new THREE.InstancedMesh(geo, mat, this.total);
    this.mesh.castShadow = true;
    this.mesh.receiveShadow = true;
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    const white = new THREE.Color(1, 1, 1);
    for (let i = 0; i < this.total; i++) this.mesh.setColorAt(i, white);
    scene.add(this.mesh);
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler();
    this._s = new THREE.Vector3(); this._v = new THREE.Vector3(); this._c = new THREE.Color();
    this.colorDirty = true;
  }

  nearestAlive(x, z, maxD = Infinity) {
    let best = -1, bd = maxD * maxD;
    for (let i = 0; i < this.total; i++) {
      if (this.state[i]) continue;
      const c = this.list[i];
      const d = (c.x - x) ** 2 + (c.z - z) ** 2;
      if (d < bd) { bd = d; best = i; }
    }
    return best;
  }

  randomAlive() {
    if (!this.alive) return -1;
    for (let k = 0; k < 40; k++) {
      const i = Math.floor(Math.random() * this.total);
      if (!this.state[i]) return i;
    }
    return this.nearestAlive(0, 0);
  }

  // 半径内のキャベツにダメージ。戻り値は倒した数
  damageRadius(x, z, r, dmg, fling) {
    let killed = 0;
    const r2 = r * r;
    for (let i = 0; i < this.total; i++) {
      if (this.state[i]) continue;
      const c = this.list[i];
      const d2 = (c.x - x) ** 2 + (c.z - z) ** 2;
      if (d2 > r2) continue;
      if (this.damage(i, dmg * (1 - Math.sqrt(d2) / r * 0.4), fling, x, z)) killed++;
    }
    return killed;
  }

  damage(i, dmg, fling = 'up', fx = 0, fz = 0) {
    if (this.state[i]) return false;
    this.hp[i] -= dmg;
    this.colorDirty = true;
    if (this.hp[i] > 0) return false;
    this.kill(i, fling, fx, fz);
    return true;
  }

  kill(i, fling, fx, fz) {
    const c = this.list[i], f = this.fly[i];
    this.state[i] = 1;
    this.alive--;
    this.fieldAlive[c.field]--;
    f.p.set(c.x, c.y, c.z);
    f.t = 0;
    if (fling === 'tornado') {
      // 竜巻に巻き上げられる
      const dx = c.x - fx, dz = c.z - fz;
      f.v.set(-dz * 2.2 + dx * 0.3, 14 + Math.random() * 8, dx * 2.2 + dz * 0.3);
      f.center = new THREE.Vector2(fx, fz);
    } else {
      f.v.set((Math.random() - 0.5) * 8, 8 + Math.random() * 6, (Math.random() - 0.5) * 8);
      f.center = null;
    }
    f.spin.set(Math.random() * 10, Math.random() * 10, Math.random() * 10);
    if (this.onLost) this.onLost(i);
  }

  update(dt, t, wind) {
    const m = this._m, q = this._q, e = this._e, s = this._s, v = this._v;
    for (let i = 0; i < this.total; i++) {
      const c = this.list[i];
      const st = this.state[i];
      if (st === 2) continue;
      if (st === 0) {
        const sway = wind * 0.12 * Math.sin(t * 3.1 + c.x * 0.3 + c.z * 0.2);
        e.set(sway, c.rot, sway * 0.6);
        q.setFromEuler(e);
        const sc = c.scale * (0.92 + 0.08 * (this.hp[i] / 100));
        m.compose(v.set(c.x, c.y, c.z), q, s.set(sc, sc, sc));
      } else {
        const f = this.fly[i];
        f.t += dt;
        if (f.center) {
          // 竜巻の周りを螺旋状に回る
          const dx = f.p.x - f.center.x, dz = f.p.z - f.center.y;
          f.v.x += -dz * dt * 3 - dx * dt * 0.5;
          f.v.z += dx * dt * 3 - dz * dt * 0.5;
          f.v.y += 4 * dt;
        } else {
          f.v.y -= 12 * dt;
        }
        f.p.addScaledVector(f.v, dt);
        e.set(f.spin.x * f.t, f.spin.y * f.t, f.spin.z * f.t);
        q.setFromEuler(e);
        const sc = c.scale * Math.max(0, 1 - f.t / 3.2);
        m.compose(f.p, q, s.set(sc, sc, sc));
        if (f.t > 3.2) {
          this.state[i] = 2;
          m.makeScale(0, 0, 0);
        }
      }
      this.mesh.setMatrixAt(i, m);
    }
    this.mesh.instanceMatrix.needsUpdate = true;
    if (this.colorDirty) {
      const col = this._c;
      for (let i = 0; i < this.total; i++) {
        const h = clamp(this.hp[i] / 100, 0, 1);
        col.setRGB(1, 1, 1).lerp(new THREE.Color(0.75, 0.55, 0.3), 1 - h);
        this.mesh.setColorAt(i, col);
      }
      this.mesh.instanceColor.needsUpdate = true;
      this.colorDirty = false;
    }
  }

  heal(x, z, r, amount) {
    for (let i = 0; i < this.total; i++) {
      if (this.state[i]) continue;
      const c = this.list[i];
      if ((c.x - x) ** 2 + (c.z - z) ** 2 < r * r) this.hp[i] = Math.min(100, this.hp[i] + amount);
    }
    this.colorDirty = true;
  }
}
