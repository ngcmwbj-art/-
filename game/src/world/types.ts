// Map data format (human-editable TypeScript in src/data/maps/).
//
// A map is an ASCII grid (one char per 16×16 tile) plus a legend that says
// what each char means (ground material, solidity, footstep), and a list of
// placed objects (props, examinable things, NPCs, doors, triggers, enemy
// symbols). Coordinates are tile units, origin top-left.
//
//   registerMap({
//     id: 'map_town', name: '夕鳴町', rows: [...], legend: TOWN_LEGEND,
//     objects: [
//       { t: 'prop', prop: 'prop_utility_pole', x: 3, y: 23, opts: { ad: 'hinoya' } },
//       { t: 'obj', id: 'obj_hose', x: 8, y: 30, text: '@narr\nホースが とぐろを 巻いている。' },
//       { t: 'npc', id: 'npc_sae', x: 21, y: 24, dir: 'left', cond: { stage: 0 }, talk: SAE },
//       { t: 'door', id: 'door_town_home', x: 4, y: 30, to: 'map_home_1f', tx: 2, ty: 7, dir: 'up', se: 'se_door' },
//     ],
//   });

import type { Dir } from '../game/state';

export type { Dir };

/** Ground materials. Decides the art and the footstep sound. */
export type Ground =
  | 'asphalt' | 'gutter' | 'sidewalk' | 'arcade' | 'crosswalk' | 'grass' | 'weeds' | 'dirt' | 'sand'
  | 'gravel' | 'lot' | 'bridge' | 'plaza' | 'water' | 'paddy' | 'ballast' | 'rail' | 'crossing'
  | 'hedge' | 'reeds' | 'none' | 'auto'
  // indoor
  | 'wood' | 'wood_bare' | 'engawa' | 'tatami' | 'kitchen' | 'genkan' | 'shopwood' | 'tile_floor' | 'mall' | 'void';

export interface TileSpec {
  /** Ground drawn under this cell (also under solid things). */
  ground: Ground;
  /** Blocks movement. */
  solid?: boolean;
  /** Footstep id override (se_step_*). */
  step?: string;
  /** Door / stairs cell (warp is defined by a `door` object on the cell). */
  door?: boolean;
  /** Counter cell: talk/examine reaches up to 3 tiles past it. */
  counter?: boolean;
  /** Tag for special handling (e.g. 'chain', 'barricade', 'roof', 'facade', 'wall'). */
  tag?: string;
}

/** Conditions for an object to exist. All given fields must hold. */
export interface Cond {
  /** Stage(s) where it exists: 1, [0,1], '1-2', '2+' ... (3 = night). */
  stage?: number | number[] | string;
  /** Flag(s) that must be non-zero. */
  flag?: string | string[];
  /** Flag(s) that must be zero. */
  notFlag?: string | string[];
  /** state.taken key that must be set / unset. */
  taken?: string;
  notTaken?: string;
  /** Arbitrary predicate. */
  when?: () => boolean;
}

/**
 * Text in the "msg" block format of 10_narrative.md (see world/msg.ts):
 *   @speaker   /   ? a | b   [a]   [-]   !command args   > comment
 */
export type Msg = string;

/** Stage-keyed text: { s0: msg, s1: msg, 's1-2': msg, default: msg }. */
export type StageText = Msg | Record<string, Msg>;

/**
 * NPC talk table. Keys follow 10_narrative 6.0: 's0_1', 's0_2', 's1_1', ...
 * (`_n` = n-th time at that stage, last one repeats) or plain 's0', 's1-2'.
 */
export type TalkTable = Record<string, Msg>;

export type NpcMove =
  | { kind: 'stand' }
  | { kind: 'look'; dirs?: Dir[]; every?: [number, number] }
  | { kind: 'wander'; radius: number; every?: [number, number]; speed?: number }
  | { kind: 'patrol'; points: [number, number][]; speed: number; wait: number }
  | { kind: 'orbit'; cx: number; cy: number; r: number; period: number; cw?: boolean; waveEvery?: number }
  | { kind: 'follow'; target: string; dx: number; dy: number }
  /**
   * Passers-by and traffic: walk the points in order (tile coords), then back
   * (or round, with `loop`), pausing `wait` ms at each end. `hide` lists the
   * point indices where the walker is out of sight (off the map edge) while it
   * waits there; `endPose` is held while waiting (a cat sits down).
   */
  | { kind: 'route'; points: [number, number][]; speed: number; wait?: number; loop?: boolean; hide?: number[]; endPose?: string; phase?: number };

interface Base {
  /** Unique within the map (auto-generated for anonymous props). */
  id?: string;
  x: number;
  y: number;
  cond?: Cond;
}

export interface PropObj extends Base {
  t: 'prop';
  prop: string;
  /** Options passed to the prop builder (variant, colors, text...). */
  opts?: Record<string, unknown>;
  /** Collision rectangle in tiles relative to (x,y): [dx, dy, w, h]. Omit = ASCII decides. */
  solid?: [number, number, number, number];
}

export interface ExamineObj extends Base {
  t: 'obj';
  id: string;
  /** Footprint size in tiles (examine hit area). */
  w?: number;
  h?: number;
  /** Visual prop drawn for this object (optional; ids like 'obj_jizo' can also be a prop id). */
  prop?: string;
  opts?: Record<string, unknown>;
  solid?: [number, number, number, number];
  /** Default text (used when no script with `script` id is registered). */
  text?: StageText;
  /** Second-time text (after the first examine). */
  text2?: StageText;
  /** Script id (registerScript). Defaults to the object id. */
  script?: string;
  /** Only examinable when facing this way (e.g. 'up' for wall signs). */
  face?: Dir;
  /** Fushigi id attached to this object (fushigi_NN). */
  fushigi?: string;
  /** Hidden item / money given once on examine (flag records it). */
  reward?: { item?: string; money?: number; flag: string; after?: StageText; second?: boolean };
  /** Lies flat on a walkable tile: also examinable while standing on it. */
  flat?: boolean;
}

export interface NpcObj extends Base {
  t: 'npc';
  id: string;
  /** charSprite id (defaults to id). */
  sprite?: string;
  dir?: Dir;
  move?: NpcMove;
  /** Named pose/anim to hold while idle (e.g. 'sit', 'sleep', 'crouch'). */
  pose?: string;
  /** Pixel offset of the sprite from the tile's bottom-center. */
  off?: [number, number];
  talk?: TalkTable;
  script?: string;
  /** Doesn't turn to face the player (statues, sleeping animals). */
  noTurn?: boolean;
  /** No collision (birds on wires, shadows). */
  ghost?: boolean;
  /** A statue / figure that only looks like a character: collides with its feet box, keeps no personal space. */
  statue?: boolean;
  /** A small animal (a dog on its lead): feet box only, no person-sized personal space. */
  animal?: boolean;
  /**
   * A passer-by (QA round 1): can't be talked to, doesn't block the player
   * (but waits for him), stands frozen mid-stride in stage 1, and in stage 2
   * walks on as a shadow only ('shadow') or is gone ('hide', via cond).
   * Spawned only once its sprite is registered (char art).
   */
  passerby?: boolean;
  /** Stage 2 look of a passer-by. */
  s2?: 'shadow';
  /** Drawn as this vehicle (art/props/vehicles.ts) instead of a character sprite. */
  vehicle?: string;
  fushigi?: string;
  /** Shadow height override (0 = no long shadow). */
  shadow?: number;
}

export interface DoorObj extends Base {
  t: 'door';
  id: string;
  to: string;
  tx: number;
  ty: number;
  dir: Dir;
  se?: string | string[];
  /** Trigger when stepping onto the cell (stairs) instead of pushing into it. */
  step?: boolean;
  w?: number;
  h?: number;
  /** Text shown when cond fails (optional). */
  closed?: Msg;
}

export interface TriggerObj extends Base {
  t: 'trig';
  id: string;
  w: number;
  h: number;
  script?: string;
  /** Fire only once (recorded in state.taken[`trig:<map>:<id>`]). */
  once?: boolean;
  /** Default text when no script is registered. */
  text?: Msg;
  /** 'enter' (default) or 'bump' (pushing against the map edge inside the rect). */
  on?: 'enter' | 'bump' | 'stay';
}

export interface SymbolObj extends Base {
  t: 'sym';
  /** sym_* id (state.taken key). */
  id: string;
  enemies: string[];
  /** Behaviour preset (defaults from the enemy id). */
  move?: 'hato' | 'semi' | 'cone' | 'umbrella' | 'ojigi' | 'soujirou' | 'momisugi';
  dir?: Dir;
  /** Patrol end point for cones. */
  to?: [number, number];
  radius?: number;
  /** Where the restored object is left after winning (tile). */
  restoreAt?: [number, number];
  /** Pixel offset for the restored sprite. */
  restoreOff?: [number, number];
  /** Script run on contact instead of the default battle (e.g. evt_ojigi). */
  script?: string;
  /** Symbols sharing a link id are one encounter (e.g. the cone pair). */
  link?: string;
  /** Initial pause phase (s) for paired patrols. */
  phase?: number;
  music?: string;
}

export type MapObj = PropObj | ExamineObj | NpcObj | DoorObj | TriggerObj | SymbolObj;

export interface MapDef {
  id: string;
  name: string;
  kind: 'outdoor' | 'indoor';
  rows: string[];
  legend: Record<string, TileSpec>;
  objects: MapObj[];
  /** 'follow' (default for maps larger than the screen) or 'fixed' (centered). */
  camera?: 'follow' | 'fixed';
  /**
   * View scale (default 1: every map, rooms included, is shown at 1×; the
   * small rooms are set into drawn surroundings). 2 = a 2× close-up view.
   */
  zoom?: 1 | 2;
  /** Script ids run on entering the map (in order; each only if registered). */
  onEnter?: string[];
  /** Music/ambience per stage: { 0: 'bgm_town_s0', ... }. */
  bgm?: Partial<Record<number, string | null>>;
  amb?: Partial<Record<number, string[]>>;
  /** Acoustic space for the audio module. */
  space?: string;
  /** Ground style variant (per-area art choices) – see art/tiles. */
  theme?: string;
  /** Building/area regions for footstep and art zoning (optional). */
  zones?: { id: string; x: number; y: number; w: number; h: number }[];
  /** Material zones for walls/hedges/fences: { x, y, w, h, mat, ch? }. */
  structMats?: { x: number; y: number; w: number; h: number; mat: string; ch?: string }[];
  /** Hand-placed ground decals baked into the ground (manholes, lines, road text...). */
  groundDecals?: import('../art/tiles/decals').GroundDecal[];
  /** Overhead wires between poles (tile coords of pole footprints). */
  wires?: import('../art/props/wires').WireLine[];
  /** Background color outside the map. */
  outside?: string;
  /** Indoor: which side the window light comes from (for grading). */
  light?: 'left' | 'top';
}
