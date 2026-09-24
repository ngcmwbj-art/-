// Global, serializable game state: party, inventory, money, flags, position.
// Content definitions (members, items, skills, enemies) live in src/data/.

export type Dir = 'down' | 'up' | 'left' | 'right';

export interface Member {
  id: string;
  name: string;
  level: number;
  exp: number;
  hp: number;
  maxHp: number;
  /** Resource for special abilities (displayed with the game's own name). */
  mp: number;
  maxMp: number;
  atk: number;
  def: number;
  spd: number;
  luck: number;
  skills: string[];
  /** Status effect id → remaining turns (battle only, cleared after). */
  status: Record<string, number>;
  /** Equipped item ids by slot (optional feature). */
  equip: Record<string, string | null>;
}

export interface GameState {
  party: Member[];
  /** Item ids; duplicates allowed. */
  inventory: string[];
  money: number;
  flags: Record<string, number>;
  map: string;
  x: number;
  y: number;
  dir: Dir;
  playTimeMs: number;
  /** Ids of one-shot things already consumed (treasure, defeated field enemies…). */
  taken: Record<string, boolean>;
  steps: number;
}

export const INVENTORY_MAX = 14;

export const state: GameState = blankState();

export function blankState(): GameState {
  return {
    party: [],
    inventory: [],
    money: 0,
    flags: {},
    map: '',
    x: 0,
    y: 0,
    dir: 'down',
    playTimeMs: 0,
    taken: {},
    steps: 0,
  };
}

export function resetState(): void {
  Object.assign(state, blankState());
}

// ---- flags ------------------------------------------------------------
export function flag(id: string): number {
  return state.flags[id] ?? 0;
}
export function setFlag(id: string, v: number | boolean = 1): void {
  state.flags[id] = typeof v === 'boolean' ? (v ? 1 : 0) : v;
}

// ---- inventory --------------------------------------------------------
export function hasItem(id: string): boolean {
  return state.inventory.includes(id);
}
export function countItem(id: string): number {
  return state.inventory.filter((i) => i === id).length;
}
let keyItemPred: (id: string) => boolean = () => false;
/** Key items (だいじなもの) don't take a bag slot; the data module registers the predicate. */
export function setKeyItemPredicate(fn: (id: string) => boolean): void {
  keyItemPred = fn;
}
/** Number of bag slots in use (key items excluded). */
export function bagCount(): number {
  return state.inventory.filter((i) => !keyItemPred(i)).length;
}
/** Returns false if the bag is full. */
export function addItem(id: string): boolean {
  if (!keyItemPred(id) && bagCount() >= INVENTORY_MAX) return false;
  state.inventory.push(id);
  return true;
}
export function removeItem(id: string): boolean {
  const i = state.inventory.indexOf(id);
  if (i < 0) return false;
  state.inventory.splice(i, 1);
  return true;
}

// ---- party helpers ----------------------------------------------------
export function member(id: string): Member | undefined {
  return state.party.find((m) => m.id === id);
}
export function aliveParty(): Member[] {
  return state.party.filter((m) => m.hp > 0);
}

// ---- save / load (localStorage, best effort) ------------------------------
const SAVE_KEY = 'yugure-rpg-save-v1';

export function saveGame(): boolean {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

export function hasSave(): boolean {
  try {
    return !!localStorage.getItem(SAVE_KEY);
  } catch {
    return false;
  }
}

export function loadGame(): boolean {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return false;
    const s = JSON.parse(raw) as GameState;
    Object.assign(state, blankState(), s);
    return true;
  } catch {
    return false;
  }
}
