// Party members: growth tables, experience, party setup (20_systems_battle.md 5, 19.2).

import { flag, removeItem, setFlag, state, type Member } from '../../game/state';
import type { GrowthRow, LevelUpResult, StatKey } from './types';
import { HANKO_CASE_ORDER } from './skills';

/**
 * The chapter-1 level cap (kept for reference). Never compare against it:
 * the cap is `levelCap()` — 5 in chapter 1, 7 once chapter 2 has started.
 */
export const LEVEL_CAP = 5;

/** 51 3.3: level cap — 7 while `flag_ch2_started`, else 5 (Lv8 is left for chapter 3). */
export function levelCap(): number {
  return flag('flag_ch2_started') ? 7 : 5;
}

/** Cumulative experience needed to reach level n (index = level). */
export const EXP_TABLE: readonly number[] = [0, 0, 10, 40, 90, 150, 230, 330, 450];

const MINATO: GrowthRow[] = [
  { hp: 36, mp: 10, atk: 9, def: 6, spd: 8, luck: 5 },
  { hp: 45, mp: 13, atk: 12, def: 7, spd: 9, luck: 6 },
  { hp: 53, mp: 16, atk: 13, def: 10, spd: 10, luck: 7 },
  { hp: 63, mp: 19, atk: 16, def: 11, spd: 11, luck: 8 },
  { hp: 72, mp: 22, atk: 17, def: 14, spd: 12, luck: 9 },
  { hp: 81, mp: 25, atk: 19, def: 16, spd: 14, luck: 10 },
  { hp: 91, mp: 29, atk: 22, def: 17, spd: 15, luck: 11 },
  { hp: 100, mp: 32, atk: 24, def: 20, spd: 16, luck: 13 },
];

const KANENARI: GrowthRow[] = [
  { hp: 48, mp: 0, atk: 7, def: 10, spd: 4, luck: 3 },
  { hp: 59, mp: 0, atk: 10, def: 12, spd: 5, luck: 4 },
  { hp: 69, mp: 0, atk: 12, def: 15, spd: 6, luck: 5 },
  { hp: 81, mp: 0, atk: 13, def: 17, spd: 7, luck: 6 },
  { hp: 92, mp: 0, atk: 15, def: 18, spd: 8, luck: 8 },
  { hp: 103, mp: 0, atk: 18, def: 20, spd: 9, luck: 9 },
  { hp: 115, mp: 0, atk: 20, def: 23, spd: 10, luck: 10 },
  { hp: 126, mp: 0, atk: 22, def: 25, spd: 12, luck: 11 },
];

/** 通知表「よくできる◎」thresholds (5.4). */
export const EXCELLENT: Record<string, Record<StatKey, number>> = {
  minato: { hp: 10, mp: 4, atk: 3, def: 3, spd: 2, luck: 2 },
  kanenari: { hp: 12, mp: 4, atk: 3, def: 3, spd: 2, luck: 2 },
};

export const MEMBER_NAMES: Record<string, string> = { minato: 'シュン', kanenari: 'カネナリくん' };

/** Growth-table values for a member at a level (1..8). */
export function statsFor(memberId: string, level: number): GrowthRow {
  const t = memberId === 'kanenari' ? KANENARI : MINATO;
  const i = Math.max(1, Math.min(t.length, Math.floor(level))) - 1;
  return { ...t[i] };
}

/** Level reached with `exp` cumulative experience (capped at levelCap()). */
export function levelForExp(exp: number): number {
  let lv = 1;
  const cap = levelCap();
  for (let l = 2; l <= cap; l++) if (exp >= EXP_TABLE[l]) lv = l;
  return lv;
}

/** Experience still needed for the next level, or null at the cap. */
export function expToNext(m: Member): number | null {
  if (m.level >= levelCap()) return null;
  return Math.max(0, EXP_TABLE[m.level + 1] - m.exp);
}

function makeMember(id: string, level: number, exp: number, skills: string[]): Member {
  const s = statsFor(id, level);
  return {
    id,
    name: MEMBER_NAMES[id] ?? id,
    level,
    exp,
    hp: s.hp,
    maxHp: s.hp,
    mp: s.mp,
    maxMp: s.mp,
    atk: s.atk,
    def: s.def,
    spd: s.spd,
    luck: s.luck,
    skills,
    status: {},
    equip: {},
  };
}

function applyGrowth(m: Member, level: number): void {
  const s = statsFor(m.id, level);
  m.level = level;
  m.maxHp = s.hp;
  m.maxMp = s.mp;
  m.atk = s.atk;
  m.def = s.def;
  m.spd = s.spd;
  m.luck = s.luck;
}

/** `state.party` = Minato Lv1 only. */
export function newGameParty(): void {
  state.party = [makeMember('minato', 1, 0, ['skill_tataku'])];
}

/** Add Kanenari-kun (same level/exp as Minato, full HP). Idempotent. */
export function joinKanenari(): Member {
  const existing = state.party.find((m) => m.id === 'kanenari');
  if (existing) return existing;
  const mi = state.party.find((m) => m.id === 'minato');
  const level = mi?.level ?? 1;
  const exp = mi?.exp ?? 0;
  const skills = ['skill_tackle', 'skill_fuusen', 'skill_kane'];
  if (level >= 3) skills.push('skill_goaisatsu');
  const k = makeMember('kanenari', level, exp, skills);
  state.party.push(k);
  return k;
}

/** Learn a skill (the presentation is playHankoLearn()). Returns false if already known. */
export function learnSkill(memberId: string, skillId: string): boolean {
  const m = state.party.find((p) => p.id === memberId);
  if (!m) return false;
  if (m.skills.includes(skillId)) return false;
  m.skills.push(skillId);
  return true;
}

/**
 * Make learned skills consistent with story flags (events may set the flag
 * without calling learnSkill). Safe to call any time. The hanko keep the
 * case order (HANKO_CASE_ORDER; 51 5.4). 「いただきます」 is an outline only
 * and never becomes a learned skill.
 */
export function syncProgressSkills(): void {
  const mi = state.party.find((m) => m.id === 'minato');
  if (mi) {
    if (!mi.skills.includes('skill_tataku')) mi.skills.unshift('skill_tataku');
    if (flag('flag_got_hanko')) {
      learnSkill('minato', 'skill_mimashita');
      learnSkill('minato', 'skill_peke');
    }
    if (flag('flag_kanenari_joined')) learnSkill('minato', 'skill_hanamaru');
    if (flag('flag_got_maigo_key')) learnSkill('minato', 'skill_yarinaoshi');
    if (flag('flag_boss_beaten') || flag('flag_clear')) learnSkill('minato', 'skill_okaerinasai');
    if (flag('flag_ch2_got_otsukare')) learnSkill('minato', 'skill_otsukaresama');
    if (flag('flag_ch2_boss_beaten')) learnSkill('minato', 'skill_oyasuminasai');
    // keep hanko in case order
    const order = HANKO_CASE_ORDER.filter((id) => id !== 'skill_itadakimasu');
    mi.skills = mi.skills.filter((s) => s !== 'skill_itadakimasu');
    const rest = mi.skills.filter((s) => !order.includes(s));
    mi.skills = [...rest, ...order.filter((s) => mi.skills.includes(s))];
  }
  const k = state.party.find((m) => m.id === 'kanenari');
  if (k) {
    for (const s of ['skill_tackle', 'skill_fuusen', 'skill_kane']) learnSkill('kanenari', s);
    if (k.level >= 3) learnSkill('kanenari', 'skill_goaisatsu');
  }
}

/**
 * Add experience to a member and apply level ups (HP/朱肉 fully restored on
 * level up, 5.1). Returns one result per level gained.
 */
export function gainExp(m: Member, amount: number): LevelUpResult[] {
  m.exp += amount;
  const out: LevelUpResult[] = [];
  const target = levelForExp(m.exp);
  while (m.level < target) {
    const from = m.level;
    const before = statsFor(m.id, from);
    applyGrowth(m, from + 1);
    const after = statsFor(m.id, from + 1);
    m.hp = m.maxHp;
    m.mp = m.maxMp;
    out.push({ memberId: m.id, from, to: from + 1, before, after });
  }
  return out;
}

// ---- chapter 2 (51 3) ---------------------------------------------------------------

/** 第1章の本筋フラグ (10 3.6), all set for a chapter-2 start without chapter-1 data. */
export const CH1_MAIN_FLAGS = [
  'flag_opening_done',
  'flag_errand',
  'flag_met_maruyama',
  'flag_met_obaa',
  'flag_chime_stopped',
  'flag_hato_beaten',
  'flag_got_hanko',
  'flag_fushigi_tutorial',
  'flag_park_hint',
  'flag_met_kanenari',
  'flag_kanenari_joined',
  'flag_broadcast',
  'flag_parking_open',
  'flag_ojigi_beaten',
  'flag_mall_entered',
  'flag_got_maigo_key',
  'flag_soujirou_gate',
  'flag_maigo_door_open',
  'flag_boss_beaten',
  'flag_clear',
];

/** The minimum cumulative experience a chapter-2 party starts with (51 3.1). */
export const CH2_START_EXP = 150;

/**
 * 51 3.1: entering chapter 2 (evt_ch2_prologue calls this first). Sets
 * `flag_ch2_started` (the cap becomes 7), lifts each member's experience to
 * at least 150 and recomputes the level from it — the level only ever goes
 * up, and by one step at most with chapter-1 data (133–275) — restores HP
 * and 朱肉, clears battle statuses, syncs the learned skills and takes the
 * コロッケ out of the bag. Returns the level-ups (for the 通知表).
 */
export function chapter2Adjust(): LevelUpResult[] {
  setFlag('flag_ch2_started', 1);
  const out: LevelUpResult[] = [];
  for (const m of state.party) {
    m.exp = Math.max(m.exp, CH2_START_EXP);
    const target = levelForExp(m.exp);
    while (m.level < target) {
      const from = m.level;
      const before = statsFor(m.id, from);
      applyGrowth(m, from + 1);
      out.push({ memberId: m.id, from, to: from + 1, before, after: statsFor(m.id, from + 1) });
    }
    m.hp = m.maxHp;
    m.mp = m.maxMp;
    m.status = {};
  }
  syncProgressSkills();
  while (removeItem('item_korokke')) {
    /* every one of them */
  }
  return out;
}

/**
 * 51 3.2 D: 「第2章から」 without chapter-1 data — both members Lv5 with 150
 * experience, the five chapter-1 hanko (and the おやすみなさい outline), the
 * standard bag and 300円, and the chapter-1 story flags as a finished run
 * (flag_stage 3, flag_clock 4). Call chapter2Adjust() afterwards as usual.
 */
export function newChapter2Party(): void {
  for (const id of CH1_MAIN_FLAGS) setFlag(id, 1);
  setFlag('flag_stage', 3);
  setFlag('flag_clock', 4);
  const mi = makeMember('minato', 5, CH2_START_EXP, ['skill_tataku', 'skill_mimashita', 'skill_peke', 'skill_hanamaru', 'skill_yarinaoshi', 'skill_okaerinasai']);
  const k = makeMember('kanenari', 5, CH2_START_EXP, ['skill_tackle', 'skill_fuusen', 'skill_kane', 'skill_goaisatsu']);
  state.party = [mi, k];
  state.inventory = [
    'item_ramune',
    'item_ramune',
    'item_fugashi',
    'item_fugashi',
    'item_hakka_ame',
    'item_stamp_pad',
    'item_oden_can',
    'item_gamaguchi',
    'item_hanko_case',
    'item_mimashita_cho',
    'item_hato_meishi',
  ];
  state.money = 300;
  syncProgressSkills();
}

/** Debug / QA: set a member to a level (exp = table minimum). */
export function setMemberLevel(m: Member, level: number): void {
  applyGrowth(m, level);
  m.exp = EXP_TABLE[Math.min(EXP_TABLE.length - 1, level)] ?? 0;
  m.hp = m.maxHp;
  m.mp = m.maxMp;
}
