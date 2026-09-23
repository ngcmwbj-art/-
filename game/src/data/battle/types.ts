// Battle content data shapes (20_systems_battle.md 19.1).

/** 打・判・笑 */
export type Attr = 'da' | 'han' | 'wara';

export type SkillTarget = 'enemy' | 'enemies' | 'ally' | 'allies' | 'self' | 'part' | 'kanenari' | 'none';

export type SkillKind = 'attack' | 'hanko' | 'pr' | 'combo' | 'enemy';

export interface StatusApply {
  /** status_* or buff_* id. */
  id: string;
  /** Base chance 0..1 (4.4: × (1 − luck/100)). */
  chance: number;
  /** Turns (buffs: stage change is in `stage`). */
  turns?: number;
  /** Stage delta for buff_* ids. */
  stage?: number;
}

export interface SkillDef {
  id: string;
  name: string;
  user: 'minato' | 'kanenari' | 'both' | 'enemy';
  kind: SkillKind;
  /** 朱肉 cost. */
  cost?: number;
  /** PR活動 cooldown (turns). */
  ct?: number;
  target: SkillTarget;
  /** 技倍率. */
  power?: number;
  /** Multi-hit: interval (frames) before each hit. Single hit = [0]. */
  hits?: number[];
  attr?: Attr;
  input: 'ring' | 'hold' | 'none';
  /** Enemy wind-up length (ms). */
  windupMs?: number;
  /** Linked tsukkomi line numbers (enemy skills). */
  tsukkomi?: number[];
  /** Status / buff applied to the target on hit (enemy skills). */
  status?: StatusApply;
  fieldUse?: boolean;
  /** Two-line description (menus, command list). */
  desc: [string, string];
  /** True for moves that deal no damage (buffs, status-only). */
  noDamage?: boolean;
  /** Treat as "big move" (face 'surprised' during the telegraph). */
  big?: boolean;
}

export interface EnemyTexts {
  /** 〔登場〕 pages. */
  appear: string[];
  /** 〔様子1..n〕 cycled during command input. */
  yousu: string[];
  /** 〔なにもしない1/2〕 (each entry = pages). */
  idle: string[][];
  /** 〔撃破〕 pages. */
  defeat: string[];
  /** Telegraph pages per skill id. */
  tele: Record<string, string[]>;
  /** Extra per-enemy strings (results etc.), free keys. */
  extra: Record<string, string[]>;
  /** Special 様子 overriding the cycle (key → pages). */
  yousuSpecial?: Record<string, string>;
  /** 〔にげる〕 when fleeing is impossible. */
  noFlee?: string[];
}

export interface EnemyBook {
  /** 情報カードの短い名前. */
  short: string;
  shotai: string;
  weak: string;
  hitokoto: string;
}

export interface AiCtx {
  /** 1-based round number (0 = ambush round). */
  round: number;
  hpRate: number;
  /** Per-enemy persistent memory. */
  mem: Record<string, number>;
  /** Shared per-battle memory. */
  shared: Record<string, number>;
  /** Number of alive enemies with the same id (including self). */
  sameCount: number;
  /** Total alive enemies. */
  enemyCount: number;
  /** Has this enemy been stamped with みました in this battle. */
  mimasareta: boolean;
  /** Stage of this enemy's atk buff. */
  atkStage: number;
  /** Party members that can be targeted. */
  targets: { id: string; hpRate: number; grabbed: boolean; canAct: boolean }[];
  /** Is status X active on self. */
  has(status: string): boolean;
  /** Weighted pick with the 3-in-a-row rule; entries with weight 0 are skipped. */
  pick(table: [string, number][]): string;
}

export interface EnemyDef {
  id: string;
  name: string;
  lvl: number;
  size: [number, number];
  core: [number, number];
  face: [number, number];
  /** Foot line (default: core at y104, at most y136 — see stageFootY). */
  footY?: number;
  hp: number;
  atk: number;
  def: number;
  spd: number;
  luck: number;
  exp: number;
  money: number;
  attr: Record<Attr, number>;
  drops: { item: string; rate: number }[];
  noFlee?: boolean;
  noCrit?: boolean;
  /** Event battle: never takes damage, HP hidden. */
  invulnerable?: boolean;
  bg: string;
  bgm: string;
  /** Number of tsukkomi lines (図鑑). */
  tsukkomiCount: number;
  /** Tsukkomi lines (index 0 = line 1). */
  tsukkomi: string[];
  /** Skills this enemy can use (for QA listing). */
  skills: string[];
  ai: (ctx: AiCtx) => string;
  texts: EnemyTexts;
  book: EnemyBook;
  /** Main palette (confetti on defeat). */
  colors: string[];
  /** Target the member with the highest HP ratio (モミスギ). */
  boss?: boolean;
}

export interface ItemDef {
  id: string;
  name: string;
  price?: number;
  key?: boolean;
  target: 'ally' | 'allies' | 'minato' | 'none';
  heal?: number;
  /** Fraction of max HP healed (おでん缶). */
  healRate?: number;
  mp?: number;
  cure?: string[];
  special?: 'kinakobou' | 'shippu' | 'capsule';
  /** Two-line description (flavor, effect). */
  desc: [string, string];
  /** Key items: text shown when used in battle (pages). */
  battleText?: string[];
}

export interface GrowthRow {
  hp: number;
  mp: number;
  atk: number;
  def: number;
  spd: number;
  luck: number;
}

export type StatKey = 'hp' | 'mp' | 'atk' | 'def' | 'spd' | 'luck';

export interface LevelUpResult {
  memberId: string;
  from: number;
  to: number;
  before: GrowthRow;
  after: GrowthRow;
}
