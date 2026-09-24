// NPC idle behaviours: stand / look around / wander / patrol / orbit / follow.
import type { Dir } from '../game/state';
import { Actor, DIR_VEC, dirFromVec } from './actor';
import type { NpcMove, NpcObj } from './types';

export interface NpcWorld {
  t: number;
  /** Is the box at (x,y) free for this actor? */
  free(a: Actor, x: number, y: number): boolean;
  actorById(id: string): Actor | undefined;
  /** 1 = normal, 0 = frozen time (stage 1 loops still run for people). */
  motion: number;
  /** Current stage (passers-by change with it). */
  stage?: number;
  /** Would the actor's box at (x,y) overlap the player (traffic waits for him)? */
  hitsPlayer?(a: Actor, x: number, y: number): boolean;
  /** Map size in px (routes may start / end just off the map edge). */
  size?: [number, number];
}

function rnd(a: number, b: number): number {
  return a + Math.random() * (b - a);
}

export function initNpc(a: Actor, def: NpcObj): void {
  a.data.def = def;
  a.data.home = [a.x, a.y];
  a.data.timer = rnd(1500, 4000);
  a.data.idlePhase = Math.floor(Math.random() * 4000);
  a.data.baseDir = def.dir ?? 'down';
  if (def.pose) a.pose = def.pose;
}

/** Move towards (tx,ty) at speed px/s; returns true when arrived. */
export function stepToward(a: Actor, tx: number, ty: number, speed: number, dt: number, w: NpcWorld, faceIt = true): boolean {
  const dx = tx - a.x;
  const dy = ty - a.y;
  const d = Math.hypot(dx, dy);
  if (d < 0.5) {
    a.x = tx;
    a.y = ty;
    a.moving = false;
    return true;
  }
  const s = Math.min(d, (speed * dt) / 1000);
  const nx = a.x + (dx / d) * s;
  const ny = a.y + (dy / d) * s;
  if (faceIt && !a.faceLock) a.dir = dirFromVec(dx, dy, a.dir);
  if (!w.free(a, nx, ny)) {
    a.moving = false;
    return false;
  }
  a.x = nx;
  a.y = ny;
  a.moving = true;
  return false;
}

export function updateNpc(a: Actor, dt: number, w: NpcWorld, talking: boolean): void {
  const def = a.data.def as NpcObj | undefined;
  a.update(dt);
  if (!def || talking || a.data.scripted) {
    if (a.path.length === 0) a.moving = false;
    return;
  }
  const mv = def.move ?? { kind: 'stand' };
  const home = a.data.home as [number, number];
  switch (mv.kind) {
    case 'stand':
      a.moving = false;
      // drift back to base facing after a conversation
      if (a.data.turnBack !== undefined) {
        a.data.turnBack = (a.data.turnBack as number) - dt;
        if ((a.data.turnBack as number) <= 0) {
          a.dir = a.data.baseDir as Dir;
          delete a.data.turnBack;
        }
      }
      break;
    case 'look': {
      a.moving = false;
      a.data.timer = (a.data.timer as number) - dt;
      if ((a.data.timer as number) <= 0) {
        const dirs = mv.dirs ?? (['down', 'left', 'right'] as Dir[]);
        a.dir = dirs[Math.floor(Math.random() * dirs.length)];
        const [lo, hi] = mv.every ?? [2000, 5000];
        a.data.timer = rnd(lo, hi);
      }
      break;
    }
    case 'wander': {
      const tgt = a.data.target as [number, number] | undefined;
      if (tgt) {
        if (stepToward(a, tgt[0], tgt[1], (mv.speed ?? 1.2) * 16, dt, w) || a.data.stuck) {
          delete a.data.target;
          a.moving = false;
        }
        a.data.stuck = !a.moving && !!a.data.target;
      } else {
        a.data.timer = (a.data.timer as number) - dt;
        if ((a.data.timer as number) <= 0) {
          const [lo, hi] = mv.every ?? [2000, 4500];
          a.data.timer = rnd(lo, hi);
          const r = mv.radius * 16;
          const tx = home[0] + Math.round(rnd(-r, r) / 16) * 16;
          const ty = home[1] + Math.round(rnd(-r, r) / 16) * 16;
          a.data.target = [tx, ty];
        }
      }
      break;
    }
    case 'patrol': {
      const pts = mv.points.map(([x, y]) => [x * 16 + 8, y * 16 + 16] as [number, number]);
      let i = (a.data.pi as number | undefined) ?? 1;
      const wait = (a.data.wait as number | undefined) ?? 0;
      if (wait > 0) {
        a.data.wait = wait - dt;
        a.moving = false;
        break;
      }
      if (stepToward(a, pts[i][0], pts[i][1], mv.speed * 16, dt, w)) {
        a.data.wait = mv.wait;
        i = (i + 1) % pts.length;
        a.data.pi = i;
      }
      break;
    }
    case 'orbit': {
      const period = mv.period;
      let ph = (a.data.phase as number | undefined) ?? 0;
      const waveEvery = mv.waveEvery ?? 0;
      const waving = (a.data.waving as number | undefined) ?? 0;
      if (waving > 0) {
        a.data.waving = waving - dt;
        a.moving = false;
        if ((a.data.waving as number) <= 0) a.anim = null;
        break;
      }
      ph += (dt / period) * Math.PI * 2 * (mv.cw === false ? -1 : 1);
      a.data.phase = ph;
      const nx = mv.cx + Math.cos(ph) * mv.r;
      const ny = mv.cy + 8 + Math.sin(ph) * mv.r * 0.8;
      const dx = nx - a.x;
      const dy = ny - a.y;
      a.dir = dirFromVec(dx, dy, a.dir);
      a.x = nx;
      a.y = ny;
      a.moving = true;
      if (waveEvery > 0) {
        a.data.nextWave = ((a.data.nextWave as number | undefined) ?? waveEvery) - dt;
        if ((a.data.nextWave as number) <= 0) {
          a.data.nextWave = waveEvery * (0.7 + Math.random() * 0.6);
          a.data.waving = 1400;
          const outs: Dir[] = ['down', 'left', 'right'];
          a.dir = outs[Math.floor(Math.random() * outs.length)];
          a.playAnim('wave', true);
        }
      }
      break;
    }
    case 'route':
      route(a, mv, def, dt, w);
      break;
    case 'follow': {
      const t = w.actorById(mv.target);
      if (!t) break;
      const [vx] = DIR_VEC[t.dir];
      const side = vx !== 0 ? -vx : mv.dx;
      const tx = t.x + side * 14;
      const ty = t.y + (vx !== 0 ? 0 : mv.dy * 16) + 1;
      const d = Math.hypot(tx - a.x, ty - a.y);
      if (d > 2) stepToward(a, tx, ty, Math.min(90, d * 4), dt, { ...w, free: () => true });
      else {
        a.moving = false;
        a.dir = t.dir;
      }
      break;
    }
  }
}

/**
 * Passers-by and traffic (QA round 1): walk a route, pause at the ends
 * (hidden off the map edge where the route says so), wait politely for the
 * player, turn back when someone else blocks the way for good. Stage 1: they
 * stop dead mid-stride; stage 2 ('shadow'): only their shadows walk on.
 */
function route(a: Actor, mv: Extract<NpcMove, { kind: 'route' }>, def: NpcObj, dt: number, w: NpcWorld): void {
  const n = mv.points.length;
  if (n < 2) return;
  const pt = (i: number): [number, number] => [mv.points[i][0] * 16 + 8, mv.points[i][1] * 16 + 16];
  if (a.data.pi === undefined) {
    a.data.pi = 1;
    a.data.dirn = 1;
    a.data.at = 0;
    a.data.wait = (mv.phase ?? 0) * 1000;
  }
  // stage 1: time stopped — hold the stride they were in
  if (w.motion < 0.05) {
    if (a.data.frozeT === undefined) a.data.frozeT = a.moving ? Math.max(1, a.walkT) : -1;
    const ft = a.data.frozeT as number;
    if (ft >= 0) {
      a.moving = true;
      a.walkT = ft;
    }
    return;
  }
  delete a.data.frozeT;
  a.alpha = def.s2 === 'shadow' && w.stage === 2 ? 0 : 1;
  let i = a.data.pi as number;
  const hideAt = (k: number) => !!mv.hide?.includes(k);
  const wait = (a.data.wait as number) ?? 0;
  if (wait > 0) {
    a.data.wait = wait - dt;
    a.moving = false;
    const at = a.data.at as number | undefined;
    a.visible = !(at !== undefined && hideAt(at));
    if (mv.endPose) a.pose = mv.endPose;
    return;
  }
  a.visible = true;
  a.pose = def.pose ?? null;
  const [tx, ty] = pt(i);
  const speed = mv.speed * 16;
  let arrived: boolean;
  // walking in from / out to a point just off the map edge: no tiles to test there
  const [mw, mh] = w.size ?? [1e9, 1e9];
  const off = (x: number, y: number) => x < 16 || y < 16 || x > mw - 16 || y > mh;
  if (a.data.vehicle || off(tx, ty) || off(a.x, a.y)) {
    // traffic keeps to the road it was given: only the player stops it
    const dx = tx - a.x;
    const dy = ty - a.y;
    const d = Math.hypot(dx, dy);
    const s = Math.min(d, (speed * dt) / 1000);
    const nx = a.x + (dx / (d || 1)) * s;
    const ny = a.y + (dy / (d || 1)) * s;
    a.dir = dirFromVec(dx, dy, a.dir);
    if (d > 0.5 && w.hitsPlayer?.(a, a.x + (dx / (d || 1)) * 10, a.y + (dy / (d || 1)) * 10)) {
      a.moving = false;
      return;
    }
    a.x = nx;
    a.y = ny;
    a.moving = d > 0.5;
    arrived = d <= 0.5;
  } else {
    arrived = stepToward(a, tx, ty, speed, dt, w);
    // blocked by someone who isn't moving off: turn back after a while
    if (!arrived && !a.moving) {
      a.data.stuckT = ((a.data.stuckT as number | undefined) ?? 0) + dt;
      if ((a.data.stuckT as number) > 2500) {
        a.data.stuckT = 0;
        a.data.dirn = -((a.data.dirn as number) ?? 1);
        a.data.pi = Math.max(0, Math.min(n - 1, i + (a.data.dirn as number)));
      }
      return;
    }
    a.data.stuckT = 0;
  }
  if (!arrived) return;
  // next point
  const at = i;
  if (mv.loop) i = (i + 1) % n;
  else {
    let dn = (a.data.dirn as number) ?? 1;
    if (i + dn < 0 || i + dn >= n) dn = -dn;
    a.data.dirn = dn;
    i += dn;
  }
  a.data.pi = i;
  const end = mv.loop ? at === 0 || at === n - 1 : at === 0 || at === n - 1;
  if (end) {
    a.data.wait = mv.wait ?? 0;
    a.data.at = at;
    a.moving = false;
  }
}
