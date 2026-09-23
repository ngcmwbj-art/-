// Battle-time units and the damage formulas (20_systems_battle.md 3, 4, 8).

import type { Member } from '../game/state';
import { rng } from '../engine/rng';
import type { Attr, EnemyDef } from '../data/battle/types';
import { enemyArt, type EnemyArt, type EnemyView } from '../art/enemies';

export type Judge = 'kukkiri' | 'futsuu' | 'kasure';
export const JUDGE_MUL: Record<Judge, number> = { kukkiri: 1.5, futsuu: 1.0, kasure: 0.7 };
export const MIMA_COEF: Record<Judge, number> = { kukkiri: 0.55, futsuu: 0.7, kasure: 0.8 };

export interface Stage {
  lv: number;
  turns: number;
}

export interface Stages {
  atk: Stage;
  def: Stage;
  hit: Stage;
}

export const STAT_NAME: Record<keyof Stages, string> = { atk: 'ちから', def: 'まもり', hit: '命中' };

export function blankStages(): Stages {
  return { atk: { lv: 0, turns: 0 }, def: { lv: 0, turns: 0 }, hit: { lv: 0, turns: 0 } };
}

/** Party member wrapper with battle-only presentation state. */
export class PartyUnit {
  readonly kind = 'party' as const;
  stages = blankStages();
  guard = false;
  ct: Record<string, number> = {};
  hanamaruMark = false;
  // panel presentation
  lift = 0;
  liftTarget = 0;
  shakeT = 0;
  shakeAmp = 0;
  drop = 0;
  flashT = 0;
  bounceT = 0;
  squishT = 0;
  wobbleT = 0;
  moodOverride: { mood: string; until: number } | null = null;
  moodHold: string | null = null;
  hpShown: number;
  hpTrail: number;
  trailWait = 0;
  hpGrowT = 0;
  hpGrowFrom = 0;
  mpShown: number;
  statusPop: { id: string; t: number }[] = [];
  statusFade: { id: string; t: number }[] = [];
  /** ms since this unit became the acting unit (for the lift anim). */
  acting = false;
  /** 'rusu' walk-off animation state. */
  away = false;
  mpAtStart: number;

  constructor(public m: Member) {
    this.hpShown = m.hp;
    this.hpTrail = m.hp;
    this.mpShown = m.mp;
    this.mpAtStart = m.mp;
  }

  get id(): string {
    return this.m.id;
  }
  get name(): string {
    return this.m.name;
  }
  get alive(): boolean {
    return this.m.hp > 0;
  }
  has(s: string): boolean {
    return (this.m.status[s] ?? 0) > 0;
  }
  /** Can input a command / act this round. */
  get canAct(): boolean {
    return this.alive && !this.has('status_nemuri') && !this.has('status_tsukamare') && !this.has('status_toosenbo') && !this.has('status_rusu');
  }
  /** Can be targeted by enemies. */
  get targetable(): boolean {
    return this.alive && !this.has('status_rusu');
  }
  get hpRate(): number {
    return this.m.maxHp ? this.m.hp / this.m.maxHp : 0;
  }
}

export interface Decal {
  kind: 'peke' | 'mimashita';
  x: number;
  y: number;
  variant: number;
  kasure: boolean;
}

export interface EnemyStatus {
  bokemake?: boolean;
  mimasareta?: { coef: number; turns: number };
  shindafuri?: boolean;
  tame?: string;
  hiraki?: number;
}

/** Enemy battler. */
export class EnemyUnit {
  readonly kind = 'enemy' as const;
  hp: number;
  maxHp: number;
  stages = blankStages();
  status: EnemyStatus = {};
  mem: Record<string, number> = {};
  lastSkills: string[] = [];
  decals: Decal[] = [];
  art: EnemyArt | null;
  name: string;
  x: number;
  xTarget: number;
  footY: number;
  // presentation
  pose = 'idle';
  poseT = 0;
  skill: string | undefined;
  offX = 0;
  offY = 0;
  sx = 1;
  sy = 1;
  shear = 0;
  whiteFrames = 0;
  alpha = 1;
  visible = true;
  appearT = -1;
  blushT = 0;
  shyT = 0;
  shyLong = false;
  sweatT = 0;
  jitterX = 0;
  jitterY = 0;
  dead = false;
  dying = false;
  hpShown: number;
  hpTrail: number;
  trailWait = 0;
  mimaEver = false;
  flags: Record<string, number> = {};
  params: Record<string, number> = {};
  /** Letter suffix for same-name enemies ('A', 'B', …) */
  letter = '';
  uid: number;
  private static nextUid = 1;

  constructor(
    public def: EnemyDef,
    x: number,
  ) {
    this.hp = def.hp;
    this.maxHp = def.hp;
    this.art = enemyArt(def.id);
    this.name = def.name;
    this.x = x;
    this.xTarget = x;
    this.footY = def.footY ?? 148;
    this.hpShown = def.hp;
    this.hpTrail = def.hp;
    this.uid = EnemyUnit.nextUid++;
  }

  get id(): string {
    return this.def.id;
  }
  get alive(): boolean {
    return !this.dead && this.hp > 0;
  }
  get hpRate(): number {
    return this.maxHp ? this.hp / this.maxHp : 0;
  }
  setPose(pose: string, skill?: string): void {
    this.pose = pose;
    this.poseT = 0;
    this.skill = skill;
  }
  view(gt: number): EnemyView {
    const f = this.flags;
    f.bokemake = this.status.bokemake ? 1 : 0;
    f.shindafuri = this.status.shindafuri ? 1 : 0;
    f.tame = this.status.tame ? 1 : 0;
    f.hiraki = this.status.hiraki ? 1 : 0;
    f.mimasareta = this.status.mimasareta ? 1 : 0;
    return { pose: this.pose, t: this.poseT, gt, skill: this.skill, hpRate: this.hpRate, flags: f, params: this.params };
  }
  /** Canvas size & the logical sprite rect. */
  get sizeW(): number {
    return this.def.size[0];
  }
  get sizeH(): number {
    return this.def.size[1];
  }
  /** Screen position of the logical sprite's top-left. */
  get left(): number {
    return Math.round(this.x - this.def.size[0] / 2);
  }
  get top(): number {
    return Math.round(this.footY - this.def.size[1]);
  }
  /** Screen position of the core (ring / stamp target). */
  get coreX(): number {
    return this.left + this.def.core[0] + this.offX;
  }
  get coreY(): number {
    return this.top + this.def.core[1] + this.offY;
  }
  get faceX(): number {
    return this.left + this.def.face[0] + this.offX;
  }
  get faceY(): number {
    return this.top + this.def.face[1] + this.offY;
  }
  /** Visible top edge of the sprite (for labels, HP bar). */
  get headY(): number {
    return this.top + (this.def.boss ? 4 : 0);
  }
}

// ---- formulas -------------------------------------------------------------

export function stageMul(lv: number): number {
  return 1 + 0.25 * lv;
}

export interface DamageIn {
  atk: number;
  atkStage: number;
  def: number;
  defStage: number;
  mimaCoef?: number;
  hiraki?: boolean;
  power: number;
  judge?: number;
  attrMul?: number;
  bokemake?: boolean;
  guard?: boolean;
  tsukkomi?: boolean;
  crit?: boolean;
}

/** 4.1 damage formula (rounded once at the end, min 1). */
export function calcDamage(d: DamageIn): number {
  const atkE = d.atk * stageMul(d.atkStage);
  const defE = d.def * stageMul(d.defStage) * (d.mimaCoef ?? 1) * (d.hiraki ? 1.5 : 1);
  const base = d.crit ? atkE * 2 * 1.5 : Math.max(1, atkE * 2 - defE);
  const v =
    base *
    d.power *
    (d.judge ?? 1) *
    (d.attrMul ?? 1) *
    (d.bokemake ? 1.5 : 1) *
    (d.guard ? 0.5 : 1) *
    (d.tsukkomi ? 0.5 : 1) *
    rng.range(0.9, 1.1);
  return Math.max(1, Math.round(v));
}

/** Fixed damage (ignores stats), × random 0.9–1.1. */
export function fixedDamage(v: number, mul = 1): number {
  return Math.max(1, Math.round(v * mul * rng.range(0.9, 1.1)));
}

/** 4.2 crit rate. */
export function critRate(luck: number): number {
  return 0.03 + luck * 0.004;
}

/** 4.4 status chance. */
export function statusChance(base: number, luck: number): number {
  return base * (1 - luck / 100);
}

export function attrMul(e: EnemyUnit, a: Attr | undefined): number {
  if (!a) return 1;
  return e.def.attr[a] ?? 1;
}

/** Enemy's effective defence inputs. */
export function enemyDefIn(e: EnemyUnit): Pick<DamageIn, 'def' | 'defStage' | 'mimaCoef' | 'hiraki'> {
  return {
    def: e.def.def,
    defStage: e.stages.def.lv,
    mimaCoef: e.status.mimasareta?.coef,
    hiraki: !!e.status.hiraki,
  };
}
