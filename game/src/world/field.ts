// The field scene: walking around a map, talking, examining, doors, triggers,
// enemy symbols, the stage system and all world rendering.

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import { Gfx } from '../engine/gfx';
import { makeCanvas } from '../engine/pixel';
import { H, W } from '../engine/screen';
import { approach, clamp } from '../engine/tween';
import { flag, setFlag, state, type Dir } from '../game/state';
import { hasChar } from '../art/chars';
import { getProp, hasProp } from '../art/props/registry';
import type { PropArt, PropEnv } from '../art/props/types';
import { Actor, DIR_VEC, dirFromVec } from './actor';
import * as snd from './audio';
import { GroundCache } from './ground_cache';
import { cloneGrade, GRADES, lerpGrade, type Grade } from './lighting';
import { cellAt, condOk, hasMap, loadMap, type LoadedMap } from './maps';
import { runMsg } from './msg';
import { initNpc, updateNpc, type NpcWorld } from './npc';
import { Renderer } from './render';
import type { DoorObj, ExamineObj, MapObj, NpcObj, PropObj, SymbolObj, TriggerObj } from './types';
import { interactActor, interactObject, runTrigger } from './interact';
import { SymbolAI } from './symbols';
import { buildStructures, type Structure } from './structures';
import { footstepFor } from './footsteps';
import { hud } from './hud';
import { strSeed } from '../art/tiles/noise';

export const WALK_SPEED = 4.5 * 16; // px/s
export const DASH_SPEED = 7 * 16;
export const FOLLOW_DELAY = 14; // frames
/** Minimum personal space between characters (px): 12 wide, one tile deep. */
const CHAR_SPACE = 12;
const CHAR_DEPTH = 16;

export interface PropInst {
  obj: PropObj | ExamineObj;
  art: PropArt;
  x: number; // world px of anchor tile top-left
  y: number;
  seed: number;
  present: boolean;
}

let current: FieldScene | null = null;
const extraSpots: ((f: FieldScene) => { id: string; x: number; y: number }[])[] = [];
/** Add fushigi hotspots that aren't map objects (sparrows on wires, carts...). */
export function addFushigiSpots(fn: (f: FieldScene) => { id: string; x: number; y: number }[]): void {
  extraSpots.push(fn);
}
export function field(): FieldScene | null {
  return current;
}

export class FieldScene implements Scene {
  map!: LoadedMap;
  ground!: GroundCache;
  player: Actor;
  follower: Actor | null = null;
  actors: Actor[] = [];
  /** Actors spawned from map objects, keyed by object id index. */
  private objActors = new Map<MapObj, Actor>();
  props: PropInst[] = [];
  structures: Structure[] = [];
  camX = 0;
  camY = 0;
  private lookX = 0;
  private lookY = 0;
  camOverride: { x: number; y: number } | null = null;
  camFollow: Actor | null = null;
  grade: Grade = cloneGrade(GRADES[0]);
  private gradeFrom: Grade = cloneGrade(GRADES[0]);
  private gradeTo: Grade = cloneGrade(GRADES[0]);
  private gradeT = 1;
  private gradeDur = 1;
  t = 0;
  /** Motion clock: advances with grade.motion (freezes in stage 1). */
  mt = 0;
  locks = 0;
  /** Actor currently talking (don't move it). */
  talking: Actor | null = null;
  trail: [number, number, Dir, boolean][] = [];
  private triggerInside = new Set<string>();
  private bumpT = 0;
  private stepT = 0;
  private presenceT = 0;
  renderer: Renderer;
  symbols: SymbolAI;
  invincibleUntil = 0;
  noclip = false;
  showCollision = false;
  /** Effects hook: chime wave amplitude etc. */
  wave = { amp: 0, t: 0 };
  /** Flags that were set at the last presence refresh. */
  private busyScript = false;
  /** Warp in progress. */
  warping = false;
  private enteredFrom: string | null = null;

  constructor(mapId: string, tx: number, ty: number, dir: Dir = 'down') {
    current = this;
    this.player = new Actor('player', 'player', 'minato', tx * 16 + 8, ty * 16 + 16);
    this.player.bw = 10;
    this.player.bh = 8;
    this.player.dir = dir;
    this.renderer = new Renderer(this);
    this.symbols = new SymbolAI(this);
    const s = flag('flag_stage');
    this.grade = cloneGrade(GRADES[s] ?? GRADES[0]);
    this.gradeTo = cloneGrade(this.grade);
    this.loadMap(mapId, tx, ty, dir);
  }

  // ------------------------------------------------------------------ map setup

  loadMap(mapId: string, tx: number, ty: number, dir: Dir, from?: string): boolean {
    const m = loadMap(mapId);
    if (!m) {
      if (import.meta.env.DEV) console.warn(`[world] map not registered: ${mapId}`);
      return false;
    }
    this.enteredFrom = from ?? null;
    this.map = m;
    this.ground = new GroundCache(m);
    this.actors = [];
    this.objActors.clear();
    this.props = [];
    this.triggerInside.clear();
    this.player.x = tx * 16 + 8;
    this.player.y = ty * 16 + 16;
    this.player.dir = dir;
    this.player.moving = false;
    state.map = mapId;
    state.x = tx;
    state.y = ty;
    state.dir = dir;
    this.trail = [];
    this.camOverride = null;
    this.camFollow = null;
    this.structures = buildStructures(m);
    this.buildProps();
    this.refreshPresence(true);
    this.syncFollower(true);
    // triggers the player spawned inside don't fire until left
    for (const o of m.objects) if (o.t === 'trig' && this.inRect(o, tx, ty)) this.triggerInside.add(o.id);
    this.snapCamera();
    this.applyAudio(true);
    this.renderer.onMapChange();
    return true;
  }

  private buildProps(): void {
    for (const o of this.map.objects) {
      if (o.t !== 'prop' && o.t !== 'obj') continue;
      const id = o.t === 'prop' ? o.prop : (o.prop ?? o.id);
      if (!hasProp(id)) continue;
      const art = getProp(id, o.opts ?? {});
      if (!art) continue;
      this.props.push({ obj: o, art, x: o.x * 16, y: o.y * 16, seed: (strSeed((o.id ?? id) + ':' + o.x + ',' + o.y) % 1000) / 1000, present: condOk(o.cond) });
    }
  }

  /** Spawn / despawn objects whose conditions changed. */
  refreshPresence(initial = false): void {
    for (const p of this.props) p.present = condOk(p.obj.cond);
    for (const o of this.map.objects) {
      if (o.t !== 'npc' && o.t !== 'sym') continue;
      let ok = condOk(o.cond);
      if (o.t === 'sym') ok = ok && !state.taken[(o as SymbolObj).link ?? o.id];
      const have = this.objActors.get(o);
      if (ok && !have) this.spawnFromObj(o, initial);
      else if (!ok && have && !have.data.scripted) this.removeActor(have);
    }
    // restored objects for defeated symbols
    for (const o of this.map.objects) {
      if (o.t !== 'sym') continue;
      const key = (o as SymbolObj).link ?? o.id;
      const rid = 'restored:' + o.id;
      if (state.taken[key] && !this.actors.some((a) => a.id === rid)) this.spawnRestored(o as SymbolObj);
    }
  }

  private spawnFromObj(o: NpcObj | SymbolObj, _initial: boolean): Actor {
    let a: Actor;
    if (o.t === 'npc') {
      const sprite = o.sprite ?? o.id;
      a = new Actor(o.id, 'npc', sprite, o.x * 16 + 8, o.y * 16 + 16);
      a.dir = o.dir ?? 'down';
      if (o.off) {
        a.ox = o.off[0];
        a.oy = o.off[1];
      }
      a.solid = !o.ghost;
      if (o.shadow !== undefined) a.shadowH = o.shadow;
      initNpc(a, o);
    } else {
      const enemy = o.enemies[0] ?? 'enemy_cone_vocal';
      a = new Actor(o.id, 'sym', enemy, o.x * 16 + 8, o.y * 16 + 16);
      a.dir = o.dir ?? 'down';
      this.symbols.init(a, o);
    }
    this.objActors.set(o, a);
    this.actors.push(a);
    return a;
  }

  private spawnRestored(o: SymbolObj): void {
    const at = o.restoreAt ?? [o.x, o.y];
    const enemy = o.enemies[0] ?? (o.link ? 'enemy_cone_vocal' : 'enemy_cone_vocal');
    const a = new Actor('restored:' + o.id, 'restored', 'restored_' + enemy, at[0] * 16 + 8, at[1] * 16 + 16);
    if (o.restoreOff) {
      a.ox = o.restoreOff[0];
      a.oy = o.restoreOff[1];
    }
    a.data.enemy = enemy;
    a.solid = false;
    a.shadowH = 0;
    if (!hasChar('restored_' + enemy)) a.visible = true;
    this.actors.push(a);
  }

  removeActor(a: Actor): void {
    this.actors = this.actors.filter((b) => b !== a);
    for (const [k, v] of this.objActors) if (v === a) this.objActors.delete(k);
  }

  addActor(a: Actor): void {
    this.actors.push(a);
  }

  actorById(id: string): Actor | undefined {
    if (id === 'player' || id === 'minato') return this.player;
    if ((id === 'kanenari' || id === 'follower') && this.follower) return this.follower;
    return this.actors.find((a) => a.id === id);
  }

  /** Create/remove the follower according to flag_kanenari_joined. */
  syncFollower(snap = false): void {
    const want = flag('flag_kanenari_joined') > 0 && this.map.def.id !== '' && !flag('flag_follower_hidden');
    if (want && !this.follower) {
      const f = new Actor('kanenari', 'follower', 'kanenari', this.player.x, this.player.y);
      const [dx, dy] = DIR_VEC[this.player.dir];
      f.x -= dx * 14;
      f.y -= dy * 14;
      f.dir = this.player.dir;
      f.solid = false;
      this.follower = f;
    } else if (!want && this.follower) this.follower = null;
    if (snap && this.follower) {
      // one tile behind the player (opposite the facing), else beside, else in front
      const p = this.player;
      const f = this.follower;
      const [dx, dy] = DIR_VEC[p.dir];
      const tries: [number, number][] = [[-dx, -dy], [dy, dx], [-dy, -dx], [dx, dy]];
      f.x = p.x;
      f.y = p.y;
      for (const [ex, ey] of tries) {
        const nx = p.x + ex * 16;
        const ny = p.y + ey * 16;
        if (this.free(f, nx, ny, true)) {
          f.x = nx;
          f.y = ny;
          break;
        }
      }
      f.dir = p.dir;
      f.moving = false;
      this.trail = [];
      // seed the trail so the follower walks from where it stands
      for (let i = 0; i <= FOLLOW_DELAY; i++) {
        const k = i / FOLLOW_DELAY;
        this.trail.push([f.x + (p.x - f.x) * k, f.y + (p.y - f.y) * k, p.dir, false]);
      }
    }
  }

  // ------------------------------------------------------------------ audio

  applyAudio(entering: boolean): void {
    const s = flag('flag_stage');
    const def = this.map.def;
    snd.setSpace(def.space ?? (def.kind === 'indoor' ? 'room' : 'outdoor'));
    snd.setMusicParam('stage', s);
    const b = def.bgm?.[s];
    if (b !== undefined && !flag('flag_bgm_hold')) snd.bgm(b, entering ? 0.6 : 1.0, true);
    const amb = def.amb?.[s] ?? [];
    this.renderer.ambient = amb;
    if (entering) {
      snd.stopAllAmbient(0.3);
    }
    for (const id of amb) {
      const opts: { vol?: number; fade?: number; lp?: number } = { fade: 0.6 };
      if (def.id === 'map_home_2f' && id === 'amb_higurashi') {
        opts.vol = 0.4;
        opts.lp = 2500;
      }
      if (def.id === 'map_town' && ['amb_kawabe', 'amb_arcade', 'amb_wind', 'amb_train_far'].includes(id)) opts.vol = 0;
      snd.playAmbient(id, opts);
    }
  }

  // ------------------------------------------------------------------ stage

  /** Change stage with a colour tween (0.6s / 1.5s / 3s by default). */
  setStage(n: number, ms?: number): void {
    const prev = flag('flag_stage');
    setFlag('flag_stage', n);
    this.gradeFrom = cloneGrade(this.grade);
    this.gradeTo = cloneGrade(GRADES[n] ?? GRADES[0]);
    this.gradeDur = ms ?? (n === 1 ? 600 : n === 2 ? 1500 : n === 3 ? 3000 : 600);
    this.gradeT = 0;
    if (this.gradeDur <= 0) {
      this.grade = cloneGrade(this.gradeTo);
      this.gradeT = 1;
    }
    snd.setMusicParam('stage', n);
    if (prev !== n) this.refreshPresence();
  }

  // ------------------------------------------------------------------ collision

  isSolidTile(tx: number, ty: number): boolean {
    const c = cellAt(this.map, tx, ty);
    if (!c.solid) return false;
    if (c.tag === 'chain') return !(flag('flag_parking_open') > 0 || flag('flag_stage') >= 2);
    if (c.tag === 'barricade') return flag('flag_stage') === 0;
    return true;
  }

  /** Is the collision box of `a` free at feet position (x,y)? */
  free(a: Actor, x: number, y: number, ignoreActors = false): boolean {
    if (a === this.player && this.noclip) return true;
    const l = x - a.bw / 2;
    const r = x + a.bw / 2 - 0.01;
    const t = y - a.bh;
    const b = y - 0.01;
    if (l < 0 || t < 0 || r >= this.map.w * 16 || b >= this.map.h * 16) return false;
    for (const px of [l, (l + r) / 2, r])
      for (const py of [t, b]) if (this.isSolidTile(Math.floor(px / 16), Math.floor(py / 16))) return false;
    if (ignoreActors) return true;
    const others = a === this.player ? this.actors : [...this.actors, this.player];
    // characters keep a personal space of at least 12×12 px from each other
    // (walls still use the small feet box), so nobody sinks half into an NPC
    const person = (k: string) => k === 'player' || k === 'npc';
    for (const o of others) {
      if (o === a || !o.solid || !o.visible) continue;
      if (a.kind === 'follower' || o.kind === 'follower') continue;
      const sp = person(a.kind) && person(o.kind) && !o.data.cart;
      const pw = Math.max(a.bw, sp ? CHAR_SPACE : 0) / 2;
      const ph = Math.max(a.bh, sp ? CHAR_DEPTH : 0);
      const ow = Math.max(o.bw, sp ? CHAR_SPACE : 0) / 2;
      const oh = Math.max(o.bh, sp ? CHAR_DEPTH : 0) / 2;
      // centre distance test on the feet-anchored boxes
      const need = [pw + ow, (ph + oh * 2) / 2];
      const ddx = Math.abs(x - o.x);
      const ddy = Math.abs(y - ph / 2 - (o.y - oh));
      if (ddx < need[0] && ddy < need[1]) {
        // already overlapping (spawned inside / pushed) → only moves that separate
        const cdx = Math.abs(a.x - o.x);
        const cdy = Math.abs(a.y - ph / 2 - (o.y - oh));
        if (cdx < need[0] && cdy < need[1] && Math.hypot(ddx, ddy) > Math.hypot(cdx, cdy) + 1e-6) continue;
        return false;
      }
    }
    return true;
  }

  // ------------------------------------------------------------------ update

  get controllable(): boolean {
    return this.locks === 0 && !game.ui.modal && !this.warping && !game.scripts.busy;
  }

  lock(): void {
    this.locks++;
  }
  unlock(): void {
    this.locks = Math.max(0, this.locks - 1);
  }

  update(dt: number): void {
    this.t += dt;
    // grade tween
    if (this.gradeT < 1) {
      this.gradeT = Math.min(1, this.gradeT + dt / this.gradeDur);
      this.grade = lerpGrade(this.gradeFrom, this.gradeTo, this.gradeT);
    }
    // stage 0: shadows grow slowly (+0.02 per 10s, max 1.5)
    if (flag('flag_stage') === 0 && this.gradeT >= 1) this.grade.shadowLen = Math.min(1.5, this.grade.shadowLen + (0.02 * dt) / 10000);
    this.mt += dt * this.grade.motion;
    if (this.wave.amp > 0 || this.wave.t > 0) this.wave.t += dt;

    this.presenceT -= dt;
    if (this.presenceT <= 0) {
      this.presenceT = 150;
      this.refreshPresence();
      this.syncFollower();
    }

    const p = this.player;
    const ctrl = this.controllable;
    let vx = 0;
    let vy = 0;
    if (ctrl) {
      const ax = game.input.axis();
      vx = ax.x;
      vy = ax.y;
    }
    const pathMoving = p.path.length > 0;
    if (pathMoving) {
      this.followPath(p, dt);
    } else if (vx || vy) {
      const len = Math.hypot(vx, vy);
      const running = game.input.down('dash');
      const sp = ((running ? DASH_SPEED : WALK_SPEED) * dt) / 1000;
      const mx = (vx / len) * sp;
      const my = (vy / len) * sp;
      p.dir = dirFromVec(vx, vy, p.dir);
      const moved = this.movePlayer(mx, my, vx, vy);
      p.moving = moved;
      p.running = running && moved;
      if (!moved) this.bumpT += dt;
      else this.bumpT = 0;
    } else {
      p.moving = false;
      p.running = false;
      this.bumpT = 0;
    }
    p.update(dt);

    // footsteps on contact frames
    if (p.moving) {
      const ms = p.running ? p.sprite.runFrameMs ?? 85 : p.sprite.walkFrameMs ?? 130;
      this.stepT += dt;
      if (this.stepT >= ms * 2) {
        this.stepT -= ms * 2;
        footstepFor(this, p, p.running);
      }
    } else this.stepT = ms0(p);

    // follower trail
    if (p.moving) {
      this.trail.push([p.x, p.y, p.dir, p.running]);
      if (this.trail.length > 240) this.trail.shift();
    }
    this.updateFollower(dt);

    // interaction
    if (ctrl && game.input.pressed('confirm')) this.tryInteract();

    // NPCs & symbols
    const nw: NpcWorld = {
      t: this.t,
      free: (a, x, y) => this.free(a, x, y),
      actorById: (id) => this.actorById(id),
      motion: this.grade.motion,
    };
    for (const a of this.actors) {
      if (a.kind === 'npc') {
        if (a.path.length) {
          this.followPath(a, dt);
          a.update(dt);
        } else updateNpc(a, dt, nw, this.talking === a);
      } else if (a.kind === 'sym') {
        if (a.path.length) {
          this.followPath(a, dt);
          a.update(dt);
        } else this.symbols.update(a, dt, ctrl);
      } else a.update(dt);
    }
    if (ctrl) this.symbols.checkContacts();

    // triggers & doors
    if (ctrl && !pathMoving) {
      this.checkDoors(vx, vy);
      this.checkTriggers(dt);
    }
    if (ctrl) this.ginzaTimer(dt);

    this.updateCamera(dt, vx, vy);
    state.x = p.tileX;
    state.y = p.tileY;
    state.dir = p.dir;
    state.playTimeMs += dt;
    this.renderer.update(dt);
    hud.update(dt, this);
  }

  /** Move the player with wall sliding and corner assist. Returns true if moved. */
  private movePlayer(mx: number, my: number, ix: number, iy: number): boolean {
    const p = this.player;
    const x0 = p.x;
    const y0 = p.y;
    // x axis
    if (mx !== 0) {
      if (this.free(p, p.x + mx, p.y)) p.x += mx;
      else if (iy === 0) {
        // corner assist: slide around a corner up to 6px away
        for (let k = 1; k <= 6; k++) {
          const step = Math.min(k, Math.abs(mx) + 0.3);
          if (this.free(p, p.x + mx, p.y - k) && this.free(p, p.x, p.y - step)) {
            p.y -= step;
            break;
          }
          if (this.free(p, p.x + mx, p.y + k) && this.free(p, p.x, p.y + step)) {
            p.y += step;
            break;
          }
        }
      } else {
        // snap flush against the wall
        const s = Math.sign(mx);
        for (let k = 0; k < 4 && this.free(p, p.x + s * 0.25, p.y); k++) p.x += s * 0.25;
      }
    }
    if (my !== 0) {
      if (this.free(p, p.x, p.y + my)) p.y += my;
      else if (ix === 0) {
        for (let k = 1; k <= 6; k++) {
          const step = Math.min(k, Math.abs(my) + 0.3);
          if (this.free(p, p.x - k, p.y + my) && this.free(p, p.x - step, p.y)) {
            p.x -= step;
            break;
          }
          if (this.free(p, p.x + k, p.y + my) && this.free(p, p.x + step, p.y)) {
            p.x += step;
            break;
          }
        }
      } else {
        const s = Math.sign(my);
        for (let k = 0; k < 4 && this.free(p, p.x, p.y + s * 0.25); k++) p.y += s * 0.25;
      }
    }
    return Math.abs(p.x - x0) > 0.001 || Math.abs(p.y - y0) > 0.001;
  }

  /** Scripted path following (walk()). */
  followPath(a: Actor, dt: number): void {
    const tgt = a.path[0];
    if (!tgt) return;
    const dx = tgt[0] - a.x;
    const dy = tgt[1] - a.y;
    const d = Math.hypot(dx, dy);
    const s = (a.pathSpeed * dt) / 1000;
    if (!a.faceLock) a.dir = dirFromVec(dx, dy, a.dir);
    if (d <= s) {
      a.x = tgt[0];
      a.y = tgt[1];
      a.path.shift();
    } else {
      a.x += (dx / d) * s;
      a.y += (dy / d) * s;
    }
    a.moving = a.path.length > 0 || d > s;
    if (a === this.player) {
      this.trail.push([a.x, a.y, a.dir, false]);
      if (this.trail.length > 240) this.trail.shift();
      this.stepT += dt;
      if (this.stepT >= 260) {
        this.stepT -= 260;
        footstepFor(this, a, false);
      }
    }
    if (!a.path.length) a.moving = false;
  }

  private updateFollower(dt: number): void {
    const f = this.follower;
    if (!f) return;
    f.update(dt);
    if (f.path.length) {
      this.followPath(f, dt);
      return;
    }
    if (f.data.scripted) return;
    const p = this.player;
    // keep the history point FOLLOW_DELAY moving-frames back
    const idx = this.trail.length - 1 - FOLLOW_DELAY;
    if (idx >= 0) {
      const [tx, ty, tdir, run] = this.trail[idx];
      const dist = Math.hypot(p.x - tx, p.y - ty);
      if (p.moving && dist >= 10) {
        const md = Math.hypot(tx - f.x, ty - f.y);
        f.moving = md > 0.05;
        if (f.moving) f.dir = dirFromVec(tx - f.x, ty - f.y, f.dir);
        else f.dir = tdir;
        f.x = tx;
        f.y = ty;
        f.running = run;
        this.trail.splice(0, idx);
        return;
      }
    }
    // player stopped: stop about one tile behind
    const d = Math.hypot(p.x - f.x, p.y - f.y);
    if (d > 18 && this.trail.length) {
      // catch up along the trail
      const [tx, ty] = this.trail[Math.max(0, this.trail.length - 1 - 8)];
      const md = Math.hypot(tx - f.x, ty - f.y);
      if (md > 0.5) {
        const s = Math.min(md, (WALK_SPEED * dt) / 1000);
        f.dir = dirFromVec(tx - f.x, ty - f.y, f.dir);
        f.x += ((tx - f.x) / md) * s;
        f.y += ((ty - f.y) / md) * s;
        f.moving = true;
        return;
      }
    }
    f.moving = false;
  }

  // ------------------------------------------------------------------ interaction

  /** Point just in front of the player's feet. */
  probe(dist = 12): [number, number] {
    const [dx, dy] = DIR_VEC[this.player.dir];
    // y is measured from 1px above the feet so a player standing exactly on a
    // tile's bottom edge probes into the next tile, not its own.
    return [this.player.x + dx * dist, this.player.y - 1 - 4 + dy * dist];
  }

  actorAt(px: number, py: number, pad = 3): Actor | null {
    const cands = [...this.actors, ...(this.follower ? [this.follower] : [])];
    for (const a of cands) {
      if (!a.visible) continue;
      const w = Math.max(a.bw, 12) + pad * 2;
      const h = Math.max(a.bh, 10) + pad * 2 + (a.kind === 'npc' && a.oy < -6 ? -a.oy : 0);
      const l = a.x + a.ox - w / 2;
      const t = a.y + Math.min(0, a.oy) - h + pad;
      if (px >= l && px <= l + w && py >= t && py <= a.y + pad + Math.max(0, a.oy)) return a;
    }
    return null;
  }

  objectAt(tx: number, ty: number, dir: Dir | null): ExamineObj | null {
    for (const o of this.map.objects) {
      if (o.t !== 'obj') continue;
      if (!condOk(o.cond)) continue;
      const w = o.w ?? 1;
      const h = o.h ?? 1;
      if (tx < o.x || ty < o.y || tx >= o.x + w || ty >= o.y + h) continue;
      if (o.face && dir && o.face !== dir) continue;
      return o;
    }
    return null;
  }

  /**
   * The tile the player is facing: always the neighbour of the tile the feet
   * are on (never the player's own tile, whatever the sub-tile position —
   * right after a spawn the feet sit exactly on the tile's bottom edge).
   */
  facingTile(): [number, number] {
    const p = this.player;
    const [dx, dy] = DIR_VEC[p.dir];
    return [p.tileX + dx, p.tileY + dy];
  }

  private tryInteract(): void {
    const p = this.player;
    const [dx, dy] = DIR_VEC[p.dir];
    const [px, py] = this.probe();
    let [tx, ty] = this.facingTile();
    // 1) actors in front (probe point, then the centre of the facing tile)
    let a = this.actorAt(px, py) ?? this.actorAt(tx * 16 + 8, ty * 16 + 12, 2);
    if (a && a.kind !== 'player') {
      this.startScript(interactActor(this, a));
      return;
    }
    // 2) objects on the tile in front (and through counters)
    for (let k = 0; k < 4; k++) {
      const o = this.objectAt(tx, ty, p.dir);
      if (o) {
        this.startScript(interactObject(this, o));
        return;
      }
      const c = cellAt(this.map, tx, ty);
      if (!c.counter && k > 0) break;
      if (!c.counter && k === 0) break;
      tx += dx;
      ty += dy;
      a = this.actorAt(tx * 16 + 8, ty * 16 + 12, 6);
      if (a && a.kind !== 'player') {
        this.startScript(interactActor(this, a));
        return;
      }
    }
    // 3) flat things under the player's feet
    const o = this.objectAt(p.tileX, p.tileY, null);
    if (o && o.flat) this.startScript(interactObject(this, o));
  }

  /** Run a coroutine as a field script: locks the player until it ends. */
  startScript(co: Co): void {
    const self = this;
    this.lock();
    game.scripts.run(
      (function* () {
        try {
          yield* co;
        } finally {
          self.unlock();
          self.talking = null;
        }
      })(),
    );
  }

  // ------------------------------------------------------------------ doors & triggers

  private checkDoors(vx: number, vy: number): void {
    const p = this.player;
    for (const o of this.map.objects) {
      if (o.t !== 'door') continue;
      const d = o as DoorObj;
      const w = d.w ?? 1;
      const h = d.h ?? 1;
      if (d.step) {
        const tx = p.tileX;
        const ty = p.tileY;
        if (tx >= d.x && ty >= d.y && tx < d.x + w && ty < d.y + h) {
          if (!this.triggerInside.has(d.id)) {
            this.triggerInside.add(d.id);
            if (condOk(d.cond)) this.useDoor(d);
          }
        } else this.triggerInside.delete(d.id);
        continue;
      }
      if (!vx && !vy) continue;
      // pushing into the door cell
      const [px, py] = [p.x + Math.sign(vx) * (p.bw / 2 + 2), p.y - 4 + Math.sign(vy) * 6];
      const tx = Math.floor(px / 16);
      const ty = Math.floor(py / 16);
      if (tx >= d.x && ty >= d.y && tx < d.x + w && ty < d.y + h) {
        // must be roughly centred on the door
        const cx = (d.x + w / 2) * 16;
        if (Math.abs(p.x - cx) > w * 8 + 2 && vy !== 0) continue;
        if (!condOk(d.cond)) continue;
        this.useDoor(d);
        return;
      }
    }
  }

  useDoor(d: DoorObj): void {
    if (this.warping) return;
    this.startScript(this.warpCo(d.to, d.tx, d.ty, d.dir, d.se, this.map.id));
  }

  *warpCo(mapId: string, tx: number, ty: number, dir: Dir, se?: string | string[], from?: string): Co {
    if (!hasMap(mapId)) {
      console.info(`[world] warp to unregistered map ${mapId} (${tx},${ty}) — ignored`);
      return;
    }
    this.warping = true;
    for (const s of Array.isArray(se) ? se : se ? [se] : []) snd.se(s);
    yield* game.fadeOut(180, '#1B1733');
    const prevKind = this.map.def.kind;
    this.loadMap(mapId, tx, ty, dir, from);
    if (prevKind !== this.map.def.kind) this.renderer.onMapChange();
    yield 40;
    this.warping = false;
    yield* game.fadeIn(220);
    this.runEnterScripts();
  }

  runEnterScripts(): void {
    for (const id of this.map.def.onEnter ?? []) this.runScriptId(id, this.map.id);
    // 17:00 fires on the first step out of a shop once both shops were visited
    if (
      this.map.id === 'map_town' &&
      flag('flag_stage') === 0 &&
      (this.enteredFrom === 'map_maruyama' || this.enteredFrom === 'map_hinoya') &&
      flag('flag_met_maruyama') &&
      flag('flag_met_obaa')
    ) {
      this.pendingChime = true;
    }
  }
  pendingChime = false;

  runScriptId(id: string, source: string): boolean {
    const r = runTrigger(this, id, source);
    return r;
  }

  private inRect(o: { x: number; y: number; w?: number; h?: number }, tx: number, ty: number): boolean {
    return tx >= o.x && ty >= o.y && tx < o.x + (o.w ?? 1) && ty < o.y + (o.h ?? 1);
  }

  private checkTriggers(dt: number): void {
    const p = this.player;
    const tx = p.tileX;
    const ty = p.tileY;
    for (const o of this.map.objects) {
      if (o.t !== 'trig') continue;
      const tr = o as TriggerObj;
      const inside = this.inRect(tr, tx, ty);
      const was = this.triggerInside.has(tr.id);
      if (!inside) {
        if (was) this.triggerInside.delete(tr.id);
        continue;
      }
      if (tr.on === 'bump') {
        if (this.bumpT > 180 && !was) {
          this.triggerInside.add(tr.id);
          if (condOk(tr.cond)) this.fireTrigger(tr);
        }
        continue;
      }
      if (was) continue;
      this.triggerInside.add(tr.id);
      if (!condOk(tr.cond)) continue;
      if (tr.once && state.taken[`trig:${this.map.id}:${tr.id}`]) continue;
      this.fireTrigger(tr);
    }
    if (this.pendingChime && p.moving) {
      this.pendingChime = false;
      this.runScriptId('evt_chime_stop', 'trig_ginza_outdoor');
    }
    void dt;
  }

  private fireTrigger(tr: TriggerObj): void {
    if (tr.once) state.taken[`trig:${this.map.id}:${tr.id}`] = true;
    const id = tr.script ?? tr.id;
    if (!runTrigger(this, id, tr.id) && tr.text) {
      const text = tr.text;
      this.startScript(
        (function* () {
          yield* runMsg(text);
        })(),
      );
    }
  }

  /** trig_ginza_outdoor: time spent outdoors in the ginza during stage 0. */
  private ginzaTimer(dt: number): void {
    if (this.map.id !== 'map_town' || flag('flag_stage') !== 0) return;
    const p = this.player;
    const tx = p.tileX;
    const ty = p.tileY;
    if (tx < 21 || tx > 57 || ty < 21 || ty > 34) return;
    const v = flag('flag_ginza_timer') + dt;
    setFlag('flag_ginza_timer', v);
    if (v >= 150000 && !flag('flag_chime_stopped') && !this.busyScript) {
      this.busyScript = true;
      if (!this.runScriptId('evt_chime_stop', 'trig_ginza_outdoor')) this.busyScript = false;
    }
  }

  // ------------------------------------------------------------------ camera

  snapCamera(): void {
    this.lookX = 0;
    this.lookY = 0;
    const [x, y] = this.cameraTarget();
    this.camX = x;
    this.camY = y;
  }

  private cameraTarget(): [number, number] {
    const mw = this.map.w * 16;
    const mh = this.map.h * 16;
    let fx: number;
    let fy: number;
    if (this.camOverride) {
      fx = this.camOverride.x;
      fy = this.camOverride.y;
    } else {
      const t = this.camFollow ?? this.player;
      fx = t.x + this.lookX;
      fy = t.y - 12 + this.lookY;
    }
    let x = fx - W / 2;
    let y = fy - H / 2;
    const fixed = this.map.def.camera === 'fixed';
    if (mw <= W || fixed) x = (mw - W) / 2;
    else x = clamp(x, 0, mw - W);
    if (mh <= H || fixed) y = (mh - H) / 2;
    else y = clamp(y, 0, mh - H);
    return [x, y];
  }

  private updateCamera(dt: number, vx: number, vy: number): void {
    const p = this.player;
    const lx = p.moving ? vx * 28 : this.lookX * 0.98;
    const ly = p.moving ? vy * 14 : this.lookY * 0.98;
    this.lookX = approach(this.lookX, lx, 2.2, dt);
    this.lookY = approach(this.lookY, ly, 2.2, dt);
    const [x, y] = this.cameraTarget();
    if (this.camOverride) return; // pans are tweened by the script API
    this.camX = approach(this.camX, x, 9, dt);
    this.camY = approach(this.camY, y, 9, dt);
    if (Math.abs(this.camX - x) < 0.3) this.camX = x;
    if (Math.abs(this.camY - y) < 0.3) this.camY = y;
  }

  /** Camera target position for the current follow target (used by pans). */
  followTarget(): [number, number] {
    const o = this.camOverride;
    this.camOverride = null;
    const r = this.cameraTarget();
    this.camOverride = o;
    return r;
  }

  /** World-pixel centres of the fushigi on this map (for the HUD hint and the stamp). */
  fushigiSpots(): { id: string; x: number; y: number }[] {
    const out: { id: string; x: number; y: number }[] = [];
    for (const o of this.map.objects) {
      if (o.t === 'obj' && o.fushigi && condOk(o.cond)) out.push({ id: o.fushigi, x: (o.x + (o.w ?? 1) / 2) * 16, y: (o.y + (o.h ?? 1) / 2) * 16 });
    }
    for (const a of this.actors) {
      const d = a.data.def as NpcObj | undefined;
      if (d?.fushigi) out.push({ id: d.fushigi, x: a.x + a.ox, y: a.y + a.oy - 12 });
    }
    for (const fn of extraSpots) out.push(...fn(this));
    return out;
  }

  // ------------------------------------------------------------------ drawing

  propEnv(pi: PropInst | null): PropEnv {
    const p = this.player;
    const cx = pi ? pi.x + 8 : 0;
    const cy = pi ? pi.y + 8 : 0;
    return {
      t: this.t,
      stage: flag('flag_stage'),
      grade: this.grade,
      motion: this.grade.motion,
      mt: this.mt,
      flag,
      seed: pi?.seed ?? 0,
      near: Math.hypot(p.x - cx, p.y - cy),
      px: p.x,
      py: p.y,
    };
  }

  draw(g: Gfx): void {
    this.renderer.draw(g);
  }

  enter(): void {
    current = this;
    this.runEnterScripts();
  }

  resume(): void {
    current = this;
    this.applyAudio(false);
  }

  exit(): void {
    if (current === this) current = null;
  }
}

function ms0(p: Actor): number {
  return (p.sprite.walkFrameMs ?? 130) * 1.5;
}

export { makeCanvas, Gfx };
