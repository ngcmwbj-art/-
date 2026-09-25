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
  /** Everyone else on the map: route traffic keeps clear of each other. */
  actors?: Actor[];
  /** The party (traffic steps round them or waits). */
  party?: Actor[];
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
 * Passers-by and traffic (QA rounds 1 & 3): walk a route, pause at the ends
 * (hidden off the map edge where the route says so), and share the road.
 * Each one runs along a "track" (the route's points) with a sideways offset:
 * `keepLeft` gives each direction its own lane, and the offset swings out to
 * pass. Looking ahead along its heading, a walker or a bicycle steps aside
 * for someone coming the other way (the lower in rank gives way: animal <
 * walker < bicycle < vehicle < the party / people standing about) and
 * swings out round someone slower or stopped in its lane; a vehicle never
 * swerves: it slows behind and waits. Blocked for good: turn back.
 * Stage 1 (30_level_art 7.8): people and animals go on with their loops,
 * machines (the kei truck) stop dead; stage 2 ('shadow'): only the shadows
 * of the people walk on.
 */

/** Rank on the road: who gives way to whom. */
function rank(b: Actor): number {
  if (b.kind === 'player' || b.kind === 'follower') return 9;
  if (b.data.vehicle) return 3;
  if (!b.data.passerby) return 9;
  const def = b.data.def as NpcObj | undefined;
  const sp = def?.sprite ?? b.spriteId;
  if (def?.animal || /cat_|pigeon|crow|dog/.test(sp)) return 0;
  if (/bike/.test(sp)) return 2;
  return 1;
}

/**
 * Half extents of `b` along / across the axis (hx, hy), from its footprint
 * seen from above: a truck is long, a bicycle less so, people are round-ish;
 * people keep their personal space from the party and from other people
 * standing about (field.actorBlocking: 12 wide, 16 deep).
 */
function extent(b: Actor, hx: number, hy: number, forVehicle = false): [number, number] {
  const side = b.dir === 'left' || b.dir === 'right';
  let ex: number;
  let ey: number;
  const r = rank(b);
  if (r === 3) [ex, ey] = side ? [29, 6] : [11, 13];
  else if (r === 2) [ex, ey] = side ? [11, 4] : [5, 6];
  else if (r === 0) [ex, ey] = side ? [6, 3] : [3, 4];
  else if (r === 9) [ex, ey] = forVehicle ? [6, 5] : [6, 12];
  else [ex, ey] = [5, 4];
  return Math.abs(hx) >= Math.abs(hy) ? [ex, ey] : [ey, ex];
}

function approach2(x: number, y: number, tx: number, ty: number, step: number): [number, number] {
  const dx = tx - x;
  const dy = ty - y;
  const d = Math.hypot(dx, dy);
  if (d <= step || d < 1e-6) return [tx, ty];
  return [x + (dx / d) * step, y + (dy / d) * step];
}

function route(a: Actor, mv: Extract<NpcMove, { kind: 'route' }>, def: NpcObj, dt: number, w: NpcWorld): void {
  const n = mv.points.length;
  if (n < 2) return;
  const pt = (i: number): [number, number] => [mv.points[i][0] * 16 + 8, mv.points[i][1] * 16 + 16];
  const veh = !!a.data.vehicle;
  const base = -(mv.keepLeft ?? 0);
  if (a.data.pi === undefined) {
    a.data.pi = 1;
    a.data.dirn = 1;
    a.data.at = 0;
    a.data.wait = (mv.phase ?? 0) * 1000;
    // on the track at the first point, already in its lane
    const [x0, y0] = pt(0);
    const [x1, y1] = pt(1);
    const l = Math.hypot(x1 - x0, y1 - y0) || 1;
    a.data.rx = x0;
    a.data.ry = y0;
    a.data.offX = (-(y1 - y0) / l) * base;
    a.data.offY = ((x1 - x0) / l) * base;
    a.data.spdF = 1;
    a.x = x0 + (a.data.offX as number);
    a.y = y0 + (a.data.offY as number);
  }
  // moved by a scene (a scripted path): pick the track up from there
  let offX = a.data.offX as number;
  let offY = a.data.offY as number;
  if (Math.abs(a.x - ((a.data.rx as number) + offX)) > 2 || Math.abs(a.y - ((a.data.ry as number) + offY)) > 2) {
    a.data.rx = a.x - offX;
    a.data.ry = a.y - offY;
  }
  // stage 1: time stopped — machines stop dead where they are
  if (w.motion < 0.05 && veh) {
    a.moving = false;
    a.data.vspd = 0;
    return;
  }
  a.alpha = def.s2 === 'shadow' && w.stage === 2 ? 0 : 1;
  let i = a.data.pi as number;
  const hideAt = (k: number) => !!mv.hide?.includes(k);
  const wait = (a.data.wait as number) ?? 0;
  if (wait > 0) {
    a.data.wait = wait - dt;
    a.moving = false;
    a.data.vspd = 0;
    a.data.spdF = 0;
    const at = a.data.at as number | undefined;
    a.visible = !(at !== undefined && hideAt(at));
    if (mv.endPose) a.pose = mv.endPose;
    return;
  }
  a.visible = true;
  a.pose = def.pose ?? null;
  const [tx, ty] = pt(i);
  const speed = mv.speed * 16;
  let rx = a.data.rx as number;
  let ry = a.data.ry as number;
  const dx = tx - rx;
  const dy = ty - ry;
  const d = Math.hypot(dx, dy);
  const hx = d > 1e-6 ? dx / d : DIR_VEC[a.dir][0];
  const hy = d > 1e-6 ? dy / d : DIR_VEC[a.dir][1];
  // the right-hand side of the heading (screen y points down)
  const px = -hy;
  const py = hx;
  const [mw, mh] = w.size ?? [1e9, 1e9];
  const off = (x: number, y: number) => x < 16 || y < 16 || x > mw - 16 || y > mh;
  // walking in from / out to a point just off the map edge: no tiles to test there
  const offMap = off(a.x, a.y);
  const lat = offX * px + offY * py;

  // ---- who is ahead in my lane, who is alongside, who is coming up behind?
  const [myLen, myWid] = extent(a, hx, hy);
  let latTgt = base;
  let spdTgt = 1;
  // alongside someone (passing a parked truck): keep to the side I'm on
  let minLat = -Infinity;
  let maxLat = Infinity;
  type Hit = { b: Actor; along: number; side: number; clear: number; gap: number };
  let block: Hit | null = null;
  let chaser: Hit | null = null;
  const avoiding = a.data.avoid as Actor | undefined;
  const speedOf = (b: Actor) => (b.moving ? ((b.data.vspd as number | undefined) ?? (b.kind === 'npc' ? speed : 60)) : 0);
  const headOf = (b: Actor): [number, number] => [
    (b.data.hx as number | undefined) ?? DIR_VEC[b.dir][0],
    (b.data.hy as number | undefined) ?? DIR_VEC[b.dir][1],
  ];
  const others = [...(w.actors ?? []), ...(w.party ?? [])];
  for (const b of others) {
    if (b === a || !b.visible || (b.kind !== 'npc' && b.kind !== 'player' && b.kind !== 'follower')) continue;
    // standing NPCs that don't block anyone (birds on wires, shadows) aren't in the road
    if (b.kind === 'npc' && !b.data.passerby && !b.solid) continue;
    const rX = b.x - a.x;
    const rY = b.y - a.y;
    const along = rX * hx + rY * hy;
    const side = rX * px + rY * py;
    const [bLen, bWid] = extent(b, hx, hy, veh);
    const gap = veh ? 10 : 3;
    const reach = myLen + bLen + gap + speed * 0.7;
    // a vehicle's clearance is its body; people keep their personal space
    const clear = myWid + bWid + 2;
    // once stepped aside for someone, stay aside until they are past (3px of slack)
    // (a vehicle going round the party keeps that berth too)
    const party = b.kind === 'player' || b.kind === 'follower';
    const thr = (!veh || party) && (b === avoiding || along <= 0) ? clear + 3 : clear;
    if (Math.abs(side) >= thr) continue;
    if (along > 0 && along <= reach) {
      if (!block || along < block.along) block = { b, along, side, clear, gap };
    } else if ((!veh || party) && along <= 0 && along > -(myLen + bLen + 2)) {
      if (side < 0) minLat = Math.max(minLat, lat + side + clear + 2);
      else maxLat = Math.min(maxLat, lat + side - clear - 2);
    } else if (!veh && along < 0 && along > -(myLen + bLen + 48) && rank(b) > rank(a)) {
      // something bigger and faster coming up behind in my lane: let it by
      const [bhx, bhy] = headOf(b);
      if (bhx * hx + bhy * hy > 0.5 && speedOf(b) > speed * 1.2 && (!chaser || along > chaser.along)) chaser = { b, along, side, clear, gap };
    }
  }
  // step aside to `cand` if the road is there (a few steps ahead too)
  const canShift = (cand: number, limit = 20): boolean => {
    if (Math.abs(cand - base) > (veh ? limit + 4 : limit) || cand < minLat - 0.5 || cand > maxLat + 0.5) return false;
    if (offMap) return true;
    if (veh) {
      // into the other lane only when nobody is coming along it
      for (const o of others) {
        if (o === a || !o.visible || !o.data.passerby) continue;
        const ra = (o.x - a.x) * hx + (o.y - a.y) * hy;
        const rs = (o.x - a.x) * px + (o.y - a.y) * py - cand;
        if (ra > -myLen && ra < myLen + 96 && Math.abs(rs) < myWid + extent(o, hx, hy, true)[1] + 2) return false;
      }
      return true;
    }
    for (const k of [0, 8, 16]) {
      const x = rx + px * cand + hx * k;
      const y = ry + py * cand + hy * k;
      if (!off(x, y) && !w.free(a, x, y)) return false;
    }
    return true;
  };
  /** Step aside from `h` (so it passes on my right, or my left): the new lane, or null. */
  const aside = (h: Hit, preferRight: boolean): number | null => {
    const right = lat + h.side + h.clear + 2;
    const left = lat + h.side - h.clear - 2;
    // already stepping aside for them: stay on that side
    if (h.b === avoiding) preferRight = Math.abs(right - lat) < Math.abs(left - lat);
    else if (rank(a) <= 1 && !veh && !offMap) {
      // people step to the edge of the road (onto the pavement) rather than into the other lane
      const roomR = canShift(right + 10, 40);
      const roomL = canShift(left - 10, 40);
      if (roomR !== roomL) preferRight = roomR;
    }
    for (const c of preferRight ? [right, left] : [left, right]) if (canShift(c)) return c;
    return null;
  };
  delete a.data.avoid;
  if (!block) a.data.waitT = 0;
  if (block) {
    const { b, along } = block;
    const [bLen] = extent(b, hx, hy, veh);
    const room = along - myLen - bLen - block.gap; // free road before touching
    const bSpd = speedOf(b);
    const [bhx, bhy] = headOf(b);
    const dot = bSpd > 1 ? bhx * hx + bhy * hy : 0;
    const ra = rank(a);
    const rb = rank(b);
    const iYield = ra < rb || (ra === rb && a.id < b.id);
    const brake = (toSpeed: number) => {
      spdTgt = Math.min(spdTgt, room <= 0 ? 0 : Math.min(1, Math.max(toSpeed, room / 28)));
    };
    const shift = (preferRight: boolean): boolean => {
      const c = aside(block!, preferRight);
      if (c === null) return false;
      latTgt = c;
      a.data.avoid = b;
      // don't walk into them before the step aside is done
      if (Math.abs(c - lat) > 3 && room < 6) spdTgt = Math.min(spdTgt, 0.35);
      return true;
    };
    if (dot > 0.5 && bSpd >= speed * 0.85) {
      // same way and no slower: just don't run into the back of them
      if (room < 10) spdTgt = Math.min(spdTgt, bSpd / speed);
    } else if (dot < -0.5) {
      // coming the other way: the lower in rank steps aside (keep left),
      // the other slows and, a vehicle, waits for the lane to clear
      if (!(iYield && !veh && shift(false))) brake(iYield ? 0 : 0.3);
    } else {
      // stopped, slower or crossing: anyone else goes round; a vehicle waits
      // behind — and after a couple of seconds goes round a boy standing in
      // the road, if the other lane is clear
      const waited = ((a.data.waitT as number | undefined) ?? 0) + (a.moving ? 0 : dt);
      a.data.waitT = waited;
      const goRound = !veh || ((b.kind === 'player' || b.kind === 'follower') && (waited > 2000 || b === avoiding));
      if (!goRound || !shift(true)) brake(bSpd / speed);
      else if (veh) spdTgt = Math.min(spdTgt, 0.5);
    }
  }
  if (chaser && latTgt === base) {
    const c = aside(chaser, false);
    if (c !== null) latTgt = c;
  }
  latTgt = Math.max(minLat, Math.min(maxLat, latTgt));

  // ---- move along the track, the sideways offset easing to its target
  const latRate = veh ? 18 : rank(a) === 2 ? 30 : 22;
  let [toX, toY] = approach2(offX, offY, px * latTgt, py * latTgt, (latRate * dt) / 1000);
  const spdF0 = a.data.spdF as number;
  const acc = veh ? 1.4 : 5;
  const spdF = spdTgt > spdF0 ? Math.min(spdTgt, spdF0 + (acc * dt) / 1000) : Math.max(spdTgt, spdF0 - (6 * dt) / 1000);
  let step = Math.min(d, (speed * spdF * dt) / 1000);
  let blocked = false;
  if (veh) {
    // traffic keeps to the road it was given: the party stops it (it may
    // still ease sideways, going round him)
    if (d > 0.5 && w.hitsPlayer?.(a, a.x + hx * 12 + toX - offX, a.y + hy * 12 + toY - offY)) {
      if (Math.hypot(toX - offX, toY - offY) > 0.01) step = 0;
      else blocked = true;
    }
  } else {
    const ok = (s: number, ox: number, oy: number) => {
      const x = rx + hx * s + ox;
      const y = ry + hy * s + oy;
      return off(x, y) || w.free(a, x, y);
    };
    // the whole move, else straight on in the lane, else just the step aside
    if (!ok(step, toX, toY)) {
      if (step > 0.01 && ok(step, offX, offY)) [toX, toY] = [offX, offY];
      else if (ok(0, toX, toY)) step = 0;
      else blocked = true;
    }
  }
  const nx = rx + hx * step + toX;
  const ny = ry + hy * step + toY;
  a.data.spdF = blocked ? 0 : spdF;
  if (blocked || (step < 0.01 && Math.hypot(toX - offX, toY - offY) < 0.01 && d > 0.5)) {
    a.moving = false;
    a.data.vspd = 0;
    if (!veh) a.dir = dirFromVec(hx, hy, a.dir);
    // blocked by someone who isn't moving off: turn back after a while
    if (!veh && !offMap) {
      a.data.stuckT = ((a.data.stuckT as number | undefined) ?? 0) + dt;
      if ((a.data.stuckT as number) > 2500) {
        a.data.stuckT = 0;
        a.data.dirn = -((a.data.dirn as number) ?? 1);
        a.data.pi = Math.max(0, Math.min(n - 1, i + (a.data.dirn as number)));
      }
    }
    return;
  }
  const nrx = rx + hx * step;
  const nry = ry + hy * step;
  a.data.stuckT = 0;
  const sdx = toX - offX;
  const sdy = toY - offY;
  const side = Math.hypot(sdx, sdy);
  rx = nrx;
  ry = nry;
  offX = toX;
  offY = toY;
  a.data.rx = rx;
  a.data.ry = ry;
  a.data.offX = offX;
  a.data.offY = offY;
  a.data.hx = hx;
  a.data.hy = hy;
  a.data.vspd = (step / Math.max(1, dt)) * 1000;
  // a vehicle swinging across the road (a U-turn) shows its front or back
  // (only on the turn at the end of its run, not while it eases round someone)
  if (veh && a.data.uturn && Math.abs(offX * px + offY * py - base) < 0.5) delete a.data.uturn;
  if (veh && a.data.uturn && side > 0.05 && side > step * 1.3) a.dir = dirFromVec(sdx + hx * step, sdy + hy * step, a.dir);
  else if (step > 0.01) a.dir = dirFromVec(hx, hy, a.dir);
  a.x = nx;
  a.y = ny;
  a.moving = step > 0.01 || side > 0.01;
  if (d - step > 0.5) return;
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
  const end = at === 0 || at === n - 1;
  if (veh && end) a.data.uturn = true;
  if (end) {
    a.data.wait = mv.wait ?? 0;
    a.data.at = at;
    a.moving = false;
  }
}
