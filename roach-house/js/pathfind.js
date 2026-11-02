// 農場主の道さがし（1マス=1の格子で A*）
import { ROWS, TABLES, CRATE_SPOTS } from './world.js';

const OX = -22, OZ = -14, W = 44, H = 28;

export class Grid {
  constructor() {
    this.blocked = new Uint8Array(W * H);
    for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) {
      const x = OX + i + 0.5, z = OZ + j + 0.5;
      let b = x < -21 || x > 21 || z < -13 || z > 13;
      const pad = 0.75;
      for (const r of ROWS) if (x > r.minX - pad && x < r.maxX + pad && z > r.minZ - pad && z < r.maxZ + pad) b = true;
      for (const t of TABLES) if (x > t.minX - pad && x < t.maxX + pad && z > t.minZ - pad && z < t.maxZ + pad) b = true;
      for (const c of CRATE_SPOTS) if (c.table < 0 && Math.abs(x - c.x) < 1.1 && Math.abs(z - c.z) < 0.85) b = true;
      this.blocked[j * W + i] = b ? 1 : 0;
    }
    this.g = new Float32Array(W * H);
    this.f = new Float32Array(W * H);
    this.from = new Int32Array(W * H);
    this.state = new Uint8Array(W * H);
  }
  cell(x, z) {
    const i = Math.min(W - 1, Math.max(0, Math.floor(x - OX)));
    const j = Math.min(H - 1, Math.max(0, Math.floor(z - OZ)));
    return j * W + i;
  }
  center(c) { return { x: OX + (c % W) + 0.5, z: OZ + Math.floor(c / W) + 0.5 }; }
  isBlocked(x, z) { return this.blocked[this.cell(x, z)] === 1; }

  // 近くの通れるマス（中心座標）
  nearestFree(x, z) {
    const c0 = this.cell(x, z);
    if (!this.blocked[c0]) return { x, z, c: c0 };
    const ci = c0 % W, cj = Math.floor(c0 / W);
    let best = null, bd = Infinity;
    for (let r = 1; r < 14 && !best; r++) {
      for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) {
        if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue;
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= W || j >= H) continue;
        const c = j * W + i;
        if (this.blocked[c]) continue;
        const p = this.center(c);
        const d = (p.x - x) ** 2 + (p.z - z) ** 2;
        if (d < bd) { bd = d; best = { x: p.x, z: p.z, c }; }
      }
    }
    return best || { x: 19, z: 9.5, c: this.cell(19, 9.5) };
  }

  los(ax, az, bx, bz) {
    const dx = bx - ax, dz = bz - az;
    const n = Math.ceil(Math.hypot(dx, dz) / 0.25);
    for (let k = 1; k < n; k++) {
      const t = k / n;
      const x = ax + dx * t, z = az + dz * t;
      // 体の幅ぶん左右も確かめる
      if (this.isBlocked(x, z) || this.isBlocked(x + 0.3, z) || this.isBlocked(x - 0.3, z) ||
          this.isBlocked(x, z + 0.3) || this.isBlocked(x, z - 0.3)) return false;
    }
    return true;
  }

  // 戻り値：通る点の配列（最初の点は含めない）
  find(sx, sz, gx, gz) {
    const s = this.nearestFree(sx, sz), goal = this.nearestFree(gx, gz);
    if (s.c === goal.c) return [{ x: goal.x, z: goal.z }];
    const { g, f, from, state } = this;
    state.fill(0);
    const open = [s.c];
    g[s.c] = 0;
    const gp = this.center(goal.c);
    const hfn = (c) => { const p = this.center(c); return Math.hypot(p.x - gp.x, p.z - gp.z); };
    f[s.c] = hfn(s.c);
    from[s.c] = -1;
    state[s.c] = 1;
    let found = false, guard = 0;
    while (open.length && guard++ < 4000) {
      let bi = 0;
      for (let k = 1; k < open.length; k++) if (f[open[k]] < f[open[bi]]) bi = k;
      const c = open[bi];
      open[bi] = open[open.length - 1];
      open.pop();
      if (c === goal.c) { found = true; break; }
      state[c] = 2;
      const ci = c % W, cj = Math.floor(c / W);
      for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) {
        if (!di && !dj) continue;
        const i = ci + di, j = cj + dj;
        if (i < 0 || j < 0 || i >= W || j >= H) continue;
        const n = j * W + i;
        if (this.blocked[n] || state[n] === 2) continue;
        if (di && dj && (this.blocked[cj * W + i] || this.blocked[j * W + ci])) continue;
        const ng = g[c] + (di && dj ? 1.4142 : 1);
        if (state[n] === 1 && ng >= g[n]) continue;
        g[n] = ng; f[n] = ng + hfn(n); from[n] = c;
        if (state[n] !== 1) { state[n] = 1; open.push(n); }
      }
    }
    if (!found) return [{ x: goal.x, z: goal.z }];
    const cells = [];
    for (let c = goal.c; c !== -1; c = from[c]) cells.push(c);
    cells.reverse();
    const pts = cells.map((c) => this.center(c));
    pts[pts.length - 1] = { x: goal.x, z: goal.z };
    // まっすぐ行ける所は間を省く
    const out = [];
    let ax = sx, az = sz, k = 0;
    while (k < pts.length) {
      let far = k;
      for (let m = pts.length - 1; m > k; m--) if (this.los(ax, az, pts[m].x, pts[m].z)) { far = m; break; }
      out.push(pts[far]);
      ax = pts[far].x; az = pts[far].z;
      k = far + 1;
    }
    return out;
  }
}
