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
import { cloneGrade, GRADES, GRADES_H, gradeHKey, lerpGrade, type Grade, type GradeHKey } from './lighting';
import { cellAt, condOk, currentStage, hasMap, isCh2Map, loadMap, setStageSource, stageFlagOf, type LoadedMap } from './maps';
import { LightState } from './lantern';
import {
  applyHoshiParams,
  callAge,
  hoshiAmb,
  hoshiBgm,
  hoshiPositional,
  hoshiPositionalBeds,
  hoshiSpace,
  hoshiUpdate,
  isKakashi,
  kakashiFrame,
  lampOn,
  playHoshiBgm,
  propFlagOf,
  resetHoshiPositional,
  villagePulse,
} from './hoshi';
import { colonDip, updateCallBubble } from './hud';
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
import { checkOcclusion } from './occlusion';
import { vehicleFrame, type VehicleView } from '../art/props/vehicles';
import { P } from '../art/tiles/palette';
import { BOX, dialogVisible } from '../ui/dialog';
import { lastMsgPos, lastSpeaker } from './msg';
import { ROOM_SLIDE } from './roomview';

export const WALK_SPEED = 4.5 * 16; // px/s
export const DASH_SPEED = 7 * 16;
export const FOLLOW_DELAY = 14; // frames
/** A symbol's field sprite (SymbolObj.sprite, else the pair art of two of the same enemy, else the enemy's). */
function symbolSprite(o: SymbolObj): string {
  if (o.sprite) return o.sprite;
  const e = o.enemies[0] ?? 'enemy_cone_vocal';
  if (o.enemies.length === 2 && o.enemies[1] === e && hasChar(e + '_pair')) return e + '_pair';
  return e;
}

/** Grace after a map change / an event / a battle before enemy symbols notice or charge (ms). */
export const CALM_MS = 1500;
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
// field sounds are placed by where they happen on screen (world/audio seAt)
snd.setListener(() => {
  const f = current;
  if (!f) return null;
  const z = f.viewScale > 1;
  return {
    camX: z ? f.viewX : f.camX,
    camY: z ? f.viewY : f.camY,
    viewW: W / f.viewScale,
    viewH: H / f.viewScale,
    x: f.player.x,
    y: f.player.y,
  };
});
const ambKeepers: ((mapId: string) => string[])[] = [];
/**
 * Beds a map keeps playing although they're not in its `amb` list (state
 * ambience a level script starts itself): on entering, applyAudio doesn't
 * stop them, so the script's own play() carries them on instead of restarting.
 */
export function registerAmbKeep(fn: (mapId: string) => string[]): void {
  ambKeepers.push(fn);
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
  /**
   * Room close-up (QA round 1): small rooms are shown at an integer 2× —
   * the frame is rendered at 1× as always and the renderer presents the
   * (W/2 × H/2) world rect at (viewX, viewY) blown up. 1 = normal view.
   */
  viewScale = 1;
  viewX = 0;
  viewY = 0;
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
  /** The dark and the tomato light (chapter 2, lantern.ts). */
  light: LightState;
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
  /**
   * Enemy symbols leave the party alone until this time (field clock, ms):
   * set on every map change and whenever control comes back (an event, a
   * battle, a menu, a talk) — QA round 2: symbols hit Minato before any input.
   */
  calmUntil = 0;
  /** The tile Minato arrived on (door / warp); symbols don't go for him while he still stands on it. */
  private arrival: [number, number] | null = null;
  /** How long the player has stood still inside a script (ms): the follower steps aside after a moment. */
  private stillT = 0;
  /** Time spent inside each 'stay' trigger (ms). */
  private stayT = new Map<string, number>();
  /** The grade family the current grade belongs to (chapter-1 stages or the pal_h* presets). */
  private gradeFamily: 1 | 2 = 1;

  constructor(mapId: string, tx: number, ty: number, dir: Dir = 'down') {
    current = this;
    this.player = new Actor('player', 'player', 'minato', tx * 16 + 8, ty * 16 + 16);
    this.player.bw = 10;
    this.player.bh = 8;
    this.player.dir = dir;
    this.renderer = new Renderer(this);
    this.symbols = new SymbolAI(this);
    this.light = new LightState(this);
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
    // the stage flag this map reads (02_ch2 6.2): flag_stage, or flag_ch2_stage on 星見台
    setStageSource(stageFlagOf(m.def));
    this.snapGradeFamily();
    this.stayT.clear();
    resetHoshiPositional();
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
    this.calmUntil = this.t + CALM_MS;
    this.arrival = [tx, ty];
    this.doorTileKey = -1;
    this.viewScale = roomScale(m);
    this.snapCamera();
    this.updateView(0, true);
    this.applyAudio(true);
    this.renderer.onMapChange();
    this.light.refresh();
    this.reportOcclusion();
    return true;
  }

  /** Is the current map a chapter-2 (星見台) map? */
  get ch2(): boolean {
    return isCh2Map(this.map?.def);
  }

  /** Crossing between chapter 1 and 星見台 maps: jump straight to the right grade family. */
  private snapGradeFamily(): void {
    const fam: 1 | 2 = this.ch2 ? 2 : 1;
    // between 星見台 maps at night the grade is the stage's preset (a scene
    // may have written flag_ch2_stage before the warp); the dawn of the
    // ending (h3) is the scenes' to set
    if (fam === 2 && this.gradeFamily === 2 && this.gradeT >= 1 && flag('flag_ch2_stage') <= 2) {
      const g = GRADES_H[gradeHKey(flag('flag_ch2_stage'))];
      this.grade = cloneGrade(g);
      this.gradeTo = cloneGrade(g);
      this.gradeFrom = cloneGrade(g);
      return;
    }
    if (fam === this.gradeFamily) return;
    this.gradeFamily = fam;
    const g = fam === 2 ? GRADES_H[gradeHKey(flag('flag_ch2_stage'))] : GRADES[flag('flag_stage')] ?? GRADES[0];
    this.grade = cloneGrade(g);
    this.gradeTo = cloneGrade(g);
    this.gradeFrom = cloneGrade(g);
    this.gradeT = 1;
  }

  /** DEV: warn about NPCs / symbols standing where props or canopies hide them (occlusion.ts). */
  reportOcclusion(): void {
    if (!import.meta.env.DEV) return;
    for (const r of checkOcclusion(this)) console.warn(`[world] ${r.id} at (${r.at}) on ${this.map.id} is ${Math.round(r.frac * 100)}% hidden by ${r.by.join(', ')}`);
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
      // passers-by wait for their sprite (char art) — never a stand-in
      if (o.t === 'npc' && o.passerby && !o.vehicle && !hasChar(o.sprite ?? o.id)) ok = false;
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
      a.solid = !o.ghost && !o.passerby;
      if (o.statue || o.animal) a.data.noSpace = true;
      if (o.passerby) a.data.passerby = true;
      if (o.vehicle) this.makeVehicle(a, o.vehicle);
      if (o.shadow !== undefined) a.shadowH = o.shadow;
      initNpc(a, o);
    } else {
      a = new Actor(o.id, 'sym', symbolSprite(o), o.x * 16 + 8, o.y * 16 + 16);
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
    const own = 'restored_' + symbolSprite(o);
    const a = new Actor('restored:' + o.id, 'restored', hasChar(own) ? own : 'restored_' + enemy, at[0] * 16 + 8, at[1] * 16 + 16);
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

  /** Traffic: an actor drawn as a vehicle (side / front / rear view by its direction). */
  private makeVehicle(a: Actor, id: string): void {
    a.data.vehicle = id;
    a.data.noSpace = true;
    a.solid = true;
    a.bh = 10;
    const view = (): VehicleView => a.dir;
    const img = () => vehicleFrame(id, view(), this.t, a.moving);
    a.bw = 52;
    a.data.shadowFrame = img();
    a.drawFn = (g, x, y) => {
      const im = img();
      a.bw = a.dir === 'left' || a.dir === 'right' ? 52 : 24;
      a.data.shadowFrame = im;
      // contact shadow under the body
      g.rect(x - Math.floor(im.width / 2) + 2, y - 3, im.width - 4, 3, P.ink, 0.35);
      g.img(im, x - Math.floor(im.width / 2), y - im.height + 1);
    };
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
    if (this.ch2) {
      this.applyHoshiAudio(entering);
      return;
    }
    applyHoshiParams(this.map.def);
    const s = flag('flag_stage');
    const def = this.map.def;
    snd.setSpace(def.space ?? (def.kind === 'indoor' ? 'room' : 'outdoor'));
    snd.setMusicParam('stage', s);
    const b = def.bgm?.[s];
    if (b !== undefined && !flag('flag_bgm_hold')) snd.bgm(b, entering ? 0.6 : 1.0, true);
    const amb = def.amb?.[s] ?? [];
    this.renderer.ambient = amb;
    const playing = snd.activeAmbients();
    if (entering) {
      // only the beds the new map doesn't share stop; shared ones carry on
      // (40_audio 8 / 12.2 — QA round 2: amb_fluorescent restarted between the mall's halls)
      const keep = new Set<string>(amb);
      for (const fn of ambKeepers) for (const id of fn(def.id)) keep.add(id);
      if (playing) {
        for (const id of playing) if (!keep.has(id)) snd.stopAmbient(id, 0.3);
      } else snd.stopAllAmbient(0.3);
    }
    const positional = this.renderer.positionalBeds();
    for (const id of amb) {
      const on = playing?.includes(id) ?? false;
      const opts: { vol?: number; fade?: number; lp?: number } = { fade: 0.6 };
      if (def.id === 'map_home_2f' && id === 'amb_higurashi') {
        opts.vol = 0.4;
        opts.lp = 2500;
      } else if (entering && on) {
        // carried over from the last map: this map's level
        opts.vol = 1;
        opts.lp = 20000;
      }
      if (positional.includes(id)) {
        // the renderer sets these by where Minato stands; a bed already
        // playing is left alone (QA round 2: re-sending vol 0 on every
        // resume dipped the river and the arcade for a moment), a new one
        // starts silent and gets its level right below
        if (on) delete opts.vol;
        else opts.vol = 0;
      }
      snd.playAmbient(id, opts);
    }
    this.renderer.positionalAmbience();
  }

  /**
   * 星見台 maps (53 4.2): bgm_hoshi_night in the map's variant (the song
   * never stops between them), the beds of the stage, the space, the PA
   * shape and h_stage.
   */
  private applyHoshiAudio(entering: boolean, music = true): void {
    const def = this.map.def;
    const s = flag('flag_ch2_stage');
    snd.setSpace(hoshiSpace(def));
    snd.setMusicParam('stage', flag('flag_stage'));
    applyHoshiParams(def);
    const b = hoshiBgm(def, s);
    if (music && b !== undefined && !flag('flag_bgm_hold')) {
      if (b) playHoshiBgm(b, def, entering ? 0.6 : 1.0);
      else snd.bgm(null, entering ? 0.6 : 1.0);
    }
    if (s >= 3) {
      // the ending's cuts run their own beds
      this.renderer.ambient = [];
      return;
    }
    const amb = hoshiAmb(def, s);
    this.renderer.ambient = amb;
    const playing = snd.activeAmbients();
    if (entering) {
      const keep = new Set<string>(amb);
      for (const fn of ambKeepers) for (const id of fn(def.id)) keep.add(id);
      if (playing) {
        for (const id of playing) if (!keep.has(id)) snd.stopAmbient(id, 0.3);
      } else snd.stopAllAmbient(0.3);
    } else if (playing) {
      // a stage change: beds of the old stage that the new one hasn't
      for (const id of playing) if (id.startsWith('amb_h_') && !amb.includes(id)) snd.stopAmbient(id, 0.8);
    }
    const positional = hoshiPositionalBeds(def);
    for (const id of amb) {
      const on = playing?.includes(id) ?? false;
      const opts: { vol?: number; fade?: number; lp?: number } = { fade: 0.6 };
      // the school hears the night insects through its windows (53 4.2)
      if (def.id === 'map_hoshi_school' && id === 'amb_h_insects') {
        opts.vol = 0.35;
        opts.lp = 2000;
      } else if (positional.includes(id)) {
        if (on) delete opts.vol;
        else opts.vol = 0;
      } else if (entering && on) {
        opts.vol = 1;
        opts.lp = 20000;
      }
      snd.playAmbient(id, opts);
    }
    this.renderer.positionalAmbience();
  }

  // ------------------------------------------------------------------ stage

  /** The current map's stage (flag_stage, or flag_ch2_stage on 星見台). */
  get stage(): number {
    return currentStage();
  }

  /**
   * Change the stage of the current map's world with a colour tween. In
   * chapter 1: flag_stage (0.6s / 1.5s / 3s by default). On 星見台 maps:
   * flag_ch2_stage and the pal_h* presets (h0→h1 0.8s, h1→h2 1.5s,
   * h2→h3a 2.0s; 52 8.3). Stage 3 on 星見台 starts at pal_h3a — the dawn
   * goes on with setGradeH('h3b' | 'h3c').
   */
  setStage(n: number, ms?: number): void {
    if (this.ch2) {
      this.setStageH(n, ms);
      return;
    }
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
    if (prev !== n) {
      this.refreshPresence();
      this.reportOcclusion();
    }
  }

  private setStageH(n: number, ms?: number): void {
    const prev = flag('flag_ch2_stage');
    setFlag('flag_ch2_stage', n);
    const key: GradeHKey = n >= 3 ? 'h3a' : gradeHKey(n);
    this.setGradeH(key, ms ?? (n === 1 ? 800 : n === 2 ? 1500 : n >= 3 ? 2000 : 600));
    snd.setMusicParam('h_stage', n);
    // (a scene may have written the flag itself before calling this: the
    // presence is refreshed either way)
    this.refreshPresence();
    if (prev !== n) this.reportOcclusion();
    // the beds of the new stage (53 4.2: amb_h_yama from h1, the open line's
    // hum in h2); the song goes on by itself (h_stage), a scene may hold it
    if (this.ch2 && n <= 2) this.applyHoshiAudio(false, false);
  }

  /** Tween to one of the pal_h* presets (the dawn of the ending: h3a → h3b 3.0 s → h3c). */
  setGradeH(key: GradeHKey, ms = 800): void {
    this.gradeFamily = 2;
    this.gradeFrom = cloneGrade(this.grade);
    this.gradeTo = cloneGrade(GRADES_H[key]);
    this.gradeDur = ms;
    this.gradeT = 0;
    if (ms <= 0) {
      this.grade = cloneGrade(this.gradeTo);
      this.gradeT = 1;
    }
  }

  // ------------------------------------------------------------------ collision

  isSolidTile(tx: number, ty: number): boolean {
    const c = cellAt(this.map, tx, ty);
    if (!c.solid) return false;
    if (c.tag === 'chain') return !(flag('flag_parking_open') > 0 || flag('flag_stage') >= 2);
    if (c.tag === 'barricade') return flag('flag_stage') === 0;
    // 星見台's electric-fence gate (52 7.1 `G`): shut until マサルさん opens it
    if (c.tag === 'egate') return !flag('flag_ch2_gate_open');
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
    return !this.actorBlocking(a, x, y);
  }

  /**
   * The character (or cart, statue...) `a` would bump into with its feet at
   * (x, y), or null. Characters keep a personal space of at least 12×12 px
   * from each other (walls still use the small feet box), so nobody sinks
   * half into an NPC; carts and statues are things, not people: feet box only.
   */
  actorBlocking(a: Actor, x: number, y: number): Actor | null {
    const others = a === this.player ? this.actors : [...this.actors, this.player];
    const person = (b: Actor) => (b.kind === 'player' || b.kind === 'npc') && !b.data.cart && !b.data.noSpace;
    for (const o of others) {
      if (o === a || !o.solid || !o.visible) continue;
      if (a.kind === 'follower' || o.kind === 'follower') continue;
      const sp = person(a) && person(o);
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
        return o;
      }
    }
    return null;
  }

  // ------------------------------------------------------------------ update

  /**
   * Enemy symbols neither notice nor charge (and don't walk into Minato):
   * during the grace after a map change, an event, a battle or a menu, and
   * while he still stands on the tile he arrived on or on a door.
   */
  symbolsCalm(): boolean {
    if (this.t < this.calmUntil) return true;
    const p = this.player;
    if (this.arrival) return true;
    // on a door (worked out once per tile)
    const key = p.tileY * 4096 + p.tileX;
    if (this.doorTileKey !== key) {
      this.doorTileKey = key;
      this.onDoorTile = !!cellAt(this.map, p.tileX, p.tileY).door || this.map.objects.some((o) => o.t === 'door' && this.inRect(o, p.tileX, p.tileY));
    }
    return this.onDoorTile;
  }
  private doorTileKey = -1;
  private onDoorTile = false;

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
    if (!this.ch2 && flag('flag_stage') === 0 && this.gradeT >= 1) this.grade.shadowLen = Math.min(1.5, this.grade.shadowLen + (0.02 * dt) / 10000);
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
    // symbols keep calm while control is away and for a moment after it comes back
    if (!ctrl) this.calmUntil = Math.max(this.calmUntil, this.t + CALM_MS);
    if (this.arrival && (p.tileX !== this.arrival[0] || p.tileY !== this.arrival[1])) this.arrival = null;
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
      stage: currentStage(),
      size: [this.map.w * 16, this.map.h * 16],
      actors: this.actors,
      party: this.follower ? [this.player, this.follower] : [this.player],
      hitsPlayer: (a, x, y) => {
        for (const p of this.follower ? [this.player, this.follower] : [this.player])
          if (Math.abs(p.x - x) < a.bw / 2 + 7 && Math.abs(p.y - 4 - (y - a.bh / 2)) < a.bh / 2 + 6) return true;
        return false;
      },
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
    // the dark and the tomato light: who is seen (before contacts and talks read it)
    this.light.update(dt);
    // 星見台: the village clock, the calls, positional beds
    hoshiUpdate(this, dt, ctrl);
    updateCallBubble(dt);

    // triggers & doors
    if (ctrl && !pathMoving) {
      this.checkDoors(vx, vy);
      this.checkTriggers(dt);
    }
    if (ctrl) this.ginzaTimer(dt);

    this.updateCamera(dt, vx, vy);
    this.updateView(dt);
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
    // Walking head-on into something to examine (the tile Z would examine is
    // it): stop in front of it rather than slip round its corner (QA round 3:
    // pushing right at the jizo from the side slid Minato up past it, facing
    // the poster on the pole instead). Walls still round their corners.
    const assist = (dx: number, dy: number): number => {
      const tx = p.tileX + dx;
      const ty = p.tileY + dy;
      return this.isSolidTile(tx, ty) && this.objectAt(tx, ty, null) ? 2 : 6;
    };
    // x axis
    if (mx !== 0) {
      if (this.free(p, p.x + mx, p.y)) p.x += mx;
      else if (iy === 0) {
        // corner assist: slide around a corner up to 6px away
        let slid = false;
        const lim = assist(Math.sign(mx), 0);
        for (let k = 1; k <= lim && !slid; k++) {
          const step = Math.min(k, Math.abs(mx) + 0.3);
          if (this.free(p, p.x + mx, p.y - k) && this.free(p, p.x, p.y - step)) {
            p.y -= step;
            slid = true;
          } else if (this.free(p, p.x + mx, p.y + k) && this.free(p, p.x, p.y + step)) {
            p.y += step;
            slid = true;
          }
        }
        if (!slid) this.slideRound(mx, 0);
      } else {
        // snap flush against the wall
        const s = Math.sign(mx);
        for (let k = 0; k < 4 && this.free(p, p.x + s * 0.25, p.y); k++) p.x += s * 0.25;
      }
    }
    if (my !== 0) {
      if (this.free(p, p.x, p.y + my)) p.y += my;
      else if (ix === 0) {
        let slid = false;
        const lim = assist(0, Math.sign(my));
        for (let k = 1; k <= lim && !slid; k++) {
          const step = Math.min(k, Math.abs(my) + 0.3);
          if (this.free(p, p.x - k, p.y + my) && this.free(p, p.x - step, p.y)) {
            p.x -= step;
            slid = true;
          } else if (this.free(p, p.x + k, p.y + my) && this.free(p, p.x + step, p.y)) {
            p.x += step;
            slid = true;
          }
        }
        if (!slid) this.slideRound(0, my);
      } else {
        const s = Math.sign(my);
        for (let k = 0; k < 4 && this.free(p, p.x, p.y + s * 0.25); k++) p.y += s * 0.25;
      }
    }
    return Math.abs(p.x - x0) > 0.001 || Math.abs(p.y - y0) > 0.001;
  }

  /**
   * Walking straight into someone's personal space (an NPC standing on the
   * border of the next row, QA round 2: さえ on the main road): slip round
   * them — step sideways, away from their feet, at walking speed, until the
   * way on is clear. Only across the one row / column the player is in:
   * he is never pushed into the next tile for it.
   */
  private slideRound(mx: number, my: number): void {
    const p = this.player;
    const o = this.actorBlocking(p, p.x + mx, p.y + my);
    if (!o) return;
    const sp = Math.abs(mx || my) + 0.3;
    if (mx) {
      // pass below or above: to the far edge of his own row
      const down = p.y >= o.y;
      const row = Math.floor((p.y - 0.01) / 16) * 16;
      const lim = down ? row + 16 : row + 0.01;
      const ny = down ? Math.min(lim, p.y + sp) : Math.max(lim, p.y - sp);
      if (Math.abs(ny - p.y) > 0.01 && this.free(p, p.x, ny)) p.y = ny;
    } else {
      const right = p.x >= o.x;
      const tx = Math.floor(p.x / 16) * 16;
      const lim = right ? tx + 16 - p.bw / 2 : tx + p.bw / 2;
      const nx = right ? Math.min(lim, p.x + sp) : Math.max(lim, p.x - sp);
      if (Math.abs(nx - p.x) > 0.01 && this.free(p, nx, p.y)) p.x = nx;
    }
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
    // in a scene (a talk, a cutscene), once Minato has stood still for a
    // moment, カネナリくん steps to his side instead of standing in his back
    // (QA round 2: the bell hid Minato from the shoulders down)
    const inScene = (this.locks > 0 || game.scripts.busy) && !p.moving && !p.path.length;
    this.stillT = inScene ? this.stillT + dt : 0;
    if (!inScene) f.data.aside = undefined;
    else if (f.data.aside) {
      if (!f.moving) f.dir = p.dir;
      return;
    } else if (this.stillT > 220 && this.stepAside()) return;
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

  /**
   * Move the follower beside the player (the tile left / right of him when
   * he faces up or down; else the tile behind him), walking. Returns true
   * when he set off (or already stands clear of Minato).
   */
  private stepAside(): boolean {
    const p = this.player;
    const f = this.follower!;
    const dx = f.x - p.x;
    const dy = f.y - p.y;
    const [fx, fy] = DIR_VEC[p.dir];
    const beside = fy !== 0 ? Math.abs(dx) >= 14 && Math.abs(dy) < 6 : Math.abs(dx) >= 14;
    if (beside || Math.hypot(dx, dy) > 30) {
      f.data.aside = true;
      return true;
    }
    const pref = dx < -1 ? -1 : 1;
    const tries: [number, number][] =
      fy !== 0
        ? [[pref * 16, 0], [-pref * 16, 0], [-fx * 16, -fy * 16]]
        : [[-fx * 16, 0], [-fx * 16, dy < 0 ? -16 : 16], [0, dy < 0 ? -16 : 16]];
    for (const [ox, oy] of tries) {
      const nx = p.x + ox;
      const ny = p.y + oy;
      if (!this.free(f, nx, ny, true)) continue;
      // nobody standing there (NPCs, symbols)
      if (this.actors.some((a) => a.visible && a.kind !== 'restored' && Math.abs(a.x - nx) < 12 && Math.abs(a.y - ny) < 12)) continue;
      // the way there is clear (not through a wall)
      if (!this.free(f, (f.x + nx) / 2, (f.y + ny) / 2, true)) continue;
      f.path = [[nx, ny]];
      f.pathSpeed = 3.2 * 16;
      f.data.aside = true;
      // walk on from there when Minato moves again
      this.trail = [];
      for (let i = 0; i <= FOLLOW_DELAY; i++) {
        const k = i / FOLLOW_DELAY;
        this.trail.push([nx + (p.x - nx) * k, ny + (p.y - ny) * k, p.dir, false]);
      }
      return true;
    }
    f.data.aside = true;
    return false;
  }

  // ------------------------------------------------------------------ interaction

  /** Point just in front of the player's feet. */
  probe(dist = 12): [number, number] {
    const [dx, dy] = DIR_VEC[this.player.dir];
    // y is measured from 1px above the feet so a player standing exactly on a
    // tile's bottom edge probes into the next tile, not its own.
    return [this.player.x + dx * dist, this.player.y - 1 - 4 + dy * dist];
  }

  /**
   * Talk box of an actor (world px, [l, t, r, b]): the feet box, grown by
   * `pad`. An NPC drawn above its feet (sitting on a wall, a cat on a sign,
   * the crow on the pole top) also covers the column from its drawn body
   * down to its feet — once, not the offset twice — so it can be talked to
   * from beside the body or from the foot of its perch, and never from tiles
   * above the body.
   */
  talkBox(a: Actor, pad: number): [number, number, number, number] {
    const w = Math.max(a.bw, 12) + pad * 2;
    const l = a.x + a.ox - w / 2;
    let t = a.y - Math.max(a.bh, 10) - pad;
    if (a.kind === 'npc' && a.oy < -6) t = a.y + a.oy - Math.max(a.bh, 10) - pad;
    const b = a.y + pad + Math.max(0, a.oy);
    return [l, t, l + w, b];
  }

  /**
   * The actor at probe point (px, py). When several boxes hold the point, the
   * one whose feet stand on `prefer` (the facing tile) wins, then the one whose
   * feet are nearest the probe.
   */
  actorAt(px: number, py: number, pad = 3, prefer?: [number, number]): Actor | null {
    const cands = [...this.actors, ...(this.follower ? [this.follower] : [])];
    let best: Actor | null = null;
    let bestScore = Infinity;
    for (const a of cands) {
      if (!a.visible || a.data.passerby || this.light.actorAlpha(a) < 0.5) continue;
      const [l, t, r, b] = this.talkBox(a, pad);
      if (px < l || px > r || py < t || py > b) continue;
      let score = Math.hypot(px - (a.x + a.ox), py - (a.y - 6));
      if (prefer && a.tileX === prefer[0] && a.tileY === prefer[1]) score -= 1000;
      if (score < bestScore) {
        bestScore = score;
        best = a;
      }
    }
    return best;
  }

  /** An actor whose feet stand on tile (tx, ty) (the natural talk target). */
  actorOnTile(tx: number, ty: number): Actor | null {
    const cands = [...this.actors, ...(this.follower ? [this.follower] : [])];
    for (const a of cands) if (a.visible && !a.data.passerby && a.kind !== 'restored' && a.tileX === tx && a.tileY === ty && this.light.actorAlpha(a) >= 0.5) return a;
    return null;
  }

  objectAt(tx: number, ty: number, dir: Dir | null): ExamineObj | null {
    let best: ExamineObj | null = null;
    for (const o of this.map.objects) {
      if (o.t !== 'obj') continue;
      if (!condOk(o.cond)) continue;
      const w = o.w ?? 1;
      const h = o.h ?? 1;
      if (tx < o.x || ty < o.y || tx >= o.x + w || ty >= o.y + h) continue;
      if (o.face && dir && o.face !== dir) continue;
      // in the dark only what the light shows can be examined (52 8.5)
      if (!this.light.canExamine(o)) continue;
      // several on one tile: the higher priority, else the first listed
      // (the barn chores' spots over the trough's own text, 50 10.19)
      if (!best || (o.priority ?? 0) > (best.priority ?? 0)) best = o;
    }
    return best;
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
    // 1) actors in front: whoever stands on the facing tile first, then the
    // probe point, then the centre of the facing tile
    const onTile = this.actorOnTile(tx, ty);
    let a = (onTile && onTile.kind !== 'player' ? onTile : null) ?? this.actorAt(px, py, 3, [tx, ty]) ?? this.actorAt(tx * 16 + 8, ty * 16 + 12, 2, [tx, ty]);
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
    // 2b) the feet box straddles two rows (columns): what is in front of the other one
    {
      const [fx, fy] = this.facingTile();
      const alt: [number, number][] =
        dx !== 0
          ? [[fx, Math.floor((p.y - p.bh) / 16)]]
          : [[Math.floor((p.x - p.bw / 2) / 16), fy], [Math.floor((p.x + p.bw / 2 - 0.01) / 16), fy]];
      for (const [ax, ay] of alt) {
        if (ax === fx && ay === fy) continue;
        const o = this.objectAt(ax, ay, p.dir);
        if (o && !o.flat) {
          this.startScript(interactObject(this, o));
          return;
        }
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
        this.stayT.delete(tr.id);
        continue;
      }
      if (tr.on === 'bump') {
        if (this.bumpT > 180 && !was) {
          this.triggerInside.add(tr.id);
          if (condOk(tr.cond)) this.fireTrigger(tr);
        }
        continue;
      }
      if (tr.on === 'stay') {
        // standing inside long enough (talks and events pause the count:
        // this only runs while the player has control)
        if (was) continue;
        if (!condOk(tr.cond) || (tr.once && state.taken[`trig:${this.map.id}:${tr.id}`])) {
          this.stayT.delete(tr.id);
          continue;
        }
        const t = (this.stayT.get(tr.id) ?? 0) + dt;
        if (t < (tr.stayMs ?? 1500)) {
          this.stayT.set(tr.id, t);
          continue;
        }
        this.stayT.delete(tr.id);
        this.triggerInside.add(tr.id);
        this.fireTrigger(tr);
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
      // a place the camera holds still over (the hill's plaza)
      if (!this.camFollow)
        for (const l of this.map.def.camLocks ?? []) {
          const tx = this.player.tileX;
          const ty = this.player.tileY;
          if (tx < l.x || ty < l.y || tx >= l.x + l.w || ty >= l.y + l.h) continue;
          fx = l.at[0] * 16 + 8;
          fy = l.at[1] * 16 + 8;
          break;
        }
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
    let [x, y] = this.cameraTarget();
    if (this.camOverride) return; // pans are tweened by the script API
    // rooms: while a dialog window is up the room slides so the people in
    // the scene stay clear of it (the speaker first), within the drawn outside
    if (this.map.def.camera === 'fixed' && this.viewScale === 1) y = clamp(this.dialogY(y, 1), y - ROOM_SLIDE, y + ROOM_SLIDE);
    this.camX = approach(this.camX, x, 9, dt);
    this.camY = approach(this.camY, y, 9, dt);
    if (Math.abs(this.camX - x) < 0.3) this.camX = x;
    if (Math.abs(this.camY - y) < 0.3) this.camY = y;
  }

  /** The actor behind the speaker tag of the dialog on screen (null: narration, a sign, unknown). */
  private speakerActor(): Actor | null {
    const tag = lastSpeaker();
    if (!tag) return null;
    const a = this.actorById(tag.split(':')[0]);
    return a && a.visible ? a : null;
  }

  /**
   * Top of a view `H/s` world px tall, moved from `y` so that the people in
   * a dialog scene stay clear of the window: everyone's feet above a bottom
   * window (heads below a top one) — but when they don't all fit, the one
   * speaking wins: the speaker's head stays 8px inside the top edge (feet
   * inside the bottom edge for a top window), and the listener (Minato) may
   * go under the window. QA round 2: in ひのや the first meeting pushed the
   * view down for Minato's feet and おばあ never showed while she talked.
   */
  private dialogY(y: number, s: number): number {
    if (!dialogVisible()) return y;
    const who: Actor[] = [];
    const add = (a: Actor | null | undefined) => {
      if (a && a.visible && !a.drawFn && a.alpha > 0.5 && !who.includes(a)) who.push(a);
    };
    const speaker = this.speakerActor();
    add(this.player);
    add(this.follower);
    add(this.talking);
    add(speaker);
    for (const a of this.actors) if (a.kind === 'npc' && a.data.scripted) add(a);
    if (!who.length) return y;
    const head = (a: Actor) => a.y + a.oy - Math.max(20, a.sprite.h ?? 24);
    const foot = (a: Actor) => a.y + Math.max(0, a.oy);
    let feet = -1e9;
    let heads = 1e9;
    for (const a of who) {
      feet = Math.max(feet, foot(a));
      heads = Math.min(heads, head(a));
    }
    // the one the scene is about: who speaks, else who was talked to
    const key = speaker ?? this.talking ?? null;
    if (lastMsgPos() === 'top') {
      y = Math.min(y, heads - (8 + BOX.h + 14) / s);
      if (key) y = Math.max(y, foot(key) + 4 - H / s);
    } else {
      y = Math.max(y, feet - (BOX.y - 4) / s);
      if (key) y = Math.min(y, head(key) - 8 / s);
    }
    return y;
  }

  /**
   * The 2× room view (maps with zoom: 2): the whole room when it fits,
   * else following the player (or a scripted camera target) inside the
   * room. While a dialog window is up, the view slides so the people in
   * the scene stay clear of it (dialogY) — the room may leave the screen's
   * edge for that, the dark outside shows.
   */
  updateView(dt: number, snap = false): void {
    if (this.viewScale === 1) return;
    const s = this.viewScale;
    const vw = W / s;
    const vh = H / s;
    const mw = this.map.w * 16;
    const mh = this.map.h * 16;
    let fx: number;
    let fy: number;
    if (this.camOverride) {
      fx = this.camOverride.x;
      fy = this.camOverride.y;
    } else {
      const t = this.camFollow ?? this.player;
      fx = t.x;
      fy = t.y - 12;
    }
    let x = mw <= vw ? (mw - vw) / 2 : clamp(fx - vw / 2, 0, mw - vw);
    let y = mh <= vh ? (mh - vh) / 2 : clamp(fy - vh / 2, 0, mh - vh);
    if (!snap) y = this.dialogY(y, s);
    x = Math.round(x);
    y = Math.round(y);
    if (snap || dt <= 0) {
      this.viewX = x;
      this.viewY = y;
      return;
    }
    this.viewX = approach(this.viewX, x, 10, dt);
    this.viewY = approach(this.viewY, y, 10, dt);
    if (Math.abs(this.viewX - x) < 0.4) this.viewX = x;
    if (Math.abs(this.viewY - y) < 0.4) this.viewY = y;
  }

  /** World px → screen px and the scale there (the room view included). */
  worldToScreen(x: number, y: number): [number, number, number] {
    if (this.viewScale > 1) return [Math.round((x - Math.round(this.viewX)) * this.viewScale), Math.round((y - Math.round(this.viewY)) * this.viewScale), this.viewScale];
    return [Math.round(x - Math.round(this.camX)), Math.round(y - Math.round(this.camY)), 1];
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
      // a fushigi in the dark only tells of itself inside the light (50 8.0)
      if (o.t === 'obj' && o.fushigi && condOk(o.cond) && this.light.canExamine(o)) out.push({ id: o.fushigi, x: (o.x + (o.w ?? 1) / 2) * 16, y: (o.y + (o.h ?? 1) / 2) * 16 });
    }
    for (const a of this.actors) {
      const d = a.data.def as NpcObj | undefined;
      if (d?.fushigi && this.light.actorAlpha(a) >= 0.5) out.push({ id: d.fushigi, x: a.x + a.ox, y: a.y + a.oy - 12 });
    }
    for (const fn of extraSpots) out.push(...fn(this));
    return out;
  }

  // ------------------------------------------------------------------ drawing

  propEnv(pi: PropInst | null): PropEnv {
    const p = this.player;
    const cx = pi ? pi.x + 8 : 0;
    const cy = pi ? pi.y + 8 : 0;
    const ch2 = this.ch2;
    const l = this.light.lantern;
    return {
      t: this.t,
      stage: flag('flag_stage'),
      grade: this.grade,
      motion: this.grade.motion,
      mt: this.mt,
      flag: ch2 ? propFlagOf(this.map.id) : flag,
      seed: pi?.seed ?? 0,
      near: Math.hypot(p.x - cx, p.y - cy),
      px: p.x,
      py: p.y,
      // chapter 2 (hoshi.ts declares these on PropEnv)
      hstage: ch2 ? flag('flag_ch2_stage') : -1,
      lantern: l ? { x: l.x, y: l.y, r: l.r } : null,
      pulse: villagePulse(),
      kakashi: ch2 && pi && isKakashi(pi) ? kakashiFrame(pi.seed, this.t) : 0,
      lampOn: ch2 ? lampOn(this.t, pi?.seed ?? 0) : true,
      lit: pi ? this.light.alphaOf(pi) : 1,
      callAge: ch2 ? callAge() : 1e9,
      colonDip: ch2 && colonDip(this.t),
    };
  }

  draw(g: Gfx): void {
    this.renderer.draw(g);
  }

  enter(): void {
    current = this;
    setStageSource(stageFlagOf(this.map.def));
    this.runEnterScripts();
  }

  resume(): void {
    current = this;
    // a scene above may have set another map's stage source (a battle's
    // background, the title): this map's comes back with the field
    setStageSource(stageFlagOf(this.map.def));
    // back from a battle, a menu or an event window: a moment before symbols go for him
    this.calmUntil = Math.max(this.calmUntil, this.t + CALM_MS);
    this.applyAudio(false);
  }

  exit(): void {
    if (current === this) current = null;
  }
}

/**
 * View scale of a map. Everything is shown at 1× (QA round 2: the rooms'
 * automatic 2× mixed two pixel sizes on one screen — 1× text and town, 2×
 * rooms); a map may still ask for a close-up with MapDef.zoom. The rooms
 * are set into their drawn surroundings instead (iexterior / ihome).
 */
export function roomScale(m: LoadedMap): number {
  return m.def.zoom ?? 1;
}

function ms0(p: Actor): number {
  return (p.sprite.walkFrameMs ?? 130) * 1.5;
}

export { makeCanvas, Gfx };
