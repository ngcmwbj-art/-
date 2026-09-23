// Field (menu) use of items and hanko (20_systems_battle.md 7, 19.2; 10_narrative.md 10.1, 11).

import { addItem, removeItem, state, type Member } from '../../game/state';
import { rng } from '../../engine/rng';
import { CAPSULE_TABLE, getItem } from './items';
import { getSkill } from './skills';
import { FIELD_TEXT, ITEM_TEXT, fillAll } from './text';

function mem(id: string): Member | undefined {
  return state.party.find((m) => m.id === id);
}

/** Can this item be used on this member from the menu right now? */
export function canUseItemInField(itemId: string, memberId: string): boolean {
  const it = getItem(itemId);
  const m = mem(memberId);
  if (!it || !m || it.key) return false;
  if (!state.inventory.includes(itemId)) return false;
  return true;
}

/** Heal a member (revives from 0), returns the amount actually healed. */
export function healMember(m: Member, amount: number): number {
  const before = m.hp;
  m.hp = Math.min(m.maxHp, m.hp + Math.max(0, Math.round(amount)));
  if (m.hp > 0) delete m.status.status_hebatta;
  return m.hp - before;
}

function applyItemEffect(itemId: string, m: Member, out: string[]): void {
  const it = getItem(itemId)!;
  const who = m.name;
  if (it.heal) {
    const n = healMember(m, it.heal);
    out.push(...fillAll(FIELD_TEXT.healed, { target: who, n }));
  }
  if (it.healRate) {
    for (const p of state.party) {
      const n = healMember(p, p.maxHp * it.healRate);
      out.push(...fillAll(FIELD_TEXT.healed, { target: p.name, n }));
    }
  }
  if (it.mp) {
    if (m.maxMp > 0) {
      const before = m.mp;
      m.mp = Math.min(m.maxMp, m.mp + it.mp);
      out.push(...fillAll(FIELD_TEXT.mpHealed, { n: m.mp - before }));
    }
  }
  if (it.cure) {
    let any = false;
    for (const s of it.cure) if (m.status[s]) (delete m.status[s], (any = true));
    if (any) out.push(...fillAll(FIELD_TEXT.cured, { target: who }));
  }
}

/**
 * Use an item from the menu. Consumes it and returns the pages to show.
 * (Stamp pad on Kanenari-kun is refused without consuming the item.)
 */
export function useItemInField(itemId: string, memberId: string): string[] {
  const it = getItem(itemId);
  const m = mem(memberId);
  if (!it || !m) return [];
  if (it.key) return ['今は 使う ときじゃない。'];
  const t = ITEM_TEXT[itemId];
  const user = state.party[0]?.name ?? 'ミナト';
  const actor = memberId === 'kanenari' && itemId !== 'item_oden_can' ? user : m.name;
  const v = { actor, target: m.name, item: it.name };
  if (itemId === 'item_stamp_pad' && m.maxMp <= 0) return fillAll(t?.kanenari ?? FIELD_TEXT.noTarget, v);
  if (!removeItem(itemId)) return [];
  const out: string[] = [];
  const kan = memberId === 'kanenari' && t?.kanenari;
  out.push(...fillAll(kan ? t!.kanenari! : t?.self ?? [], v));
  if (it.special === 'capsule') {
    const content = rng.weighted(CAPSULE_TABLE);
    if (!content) {
      out.push(...fillAll(t!.extra!.empty, v));
      return out;
    }
    out.push(...fillAll(t!.extra!.content, { ...v, item: getItem(content)!.name }));
    applyItemEffect(content, m, out);
    return out;
  }
  if (itemId === 'item_hakka_ame' && !m.status.status_konran && !m.status.status_nemuri) {
    out.push(...fillAll(t!.extra!.none, v));
    return out;
  }
  applyItemEffect(itemId, m, out);
  if (it.special === 'kinakobou' && rng.chance(0.25)) {
    if (memberId === 'kanenari') out.push(...fillAll(t!.extra!.atariKanenari, v));
    else if (addItem('item_kinakobou')) out.push(...fillAll(t!.extra!.atari, v));
    else out.push(...fillAll(t!.extra!.atariFull, v));
  }
  return out;
}

/** Hanko usable from the field menu (はなまる; みました is handled by the ふしぎ system). */
export function canUseSkillInField(skillId: string, userId: string): boolean {
  const s = getSkill(skillId);
  const u = mem(userId);
  if (!s || !u || !u.skills.includes(skillId)) return false;
  if (skillId !== 'skill_hanamaru') return false;
  return u.mp >= (s.cost ?? 0);
}

/** Field hanamaru amount (判定 ふつう). */
export function hanamaruAmount(user: Member, rate = 1): number {
  return Math.round((30 + user.atk * 2) * rate);
}

/**
 * Use a hanko from the menu. Returns the pages to show. Only はなまる has a
 * field effect; others return the matching "nothing to stamp" text.
 */
export function useSkillInField(skillId: string, userId: string, targetId: string): string[] {
  const s = getSkill(skillId);
  const u = mem(userId);
  if (!s || !u) return [];
  if (skillId === 'skill_mimashita') return [...FIELD_TEXT.noFushigi];
  if (skillId !== 'skill_hanamaru') return [...FIELD_TEXT.noTarget];
  if (u.mp < (s.cost ?? 0)) return [...FIELD_TEXT.noInk];
  const t = mem(targetId);
  if (!t) return [];
  u.mp -= s.cost ?? 0;
  const n = healMember(t, hanamaruAmount(u));
  return fillAll(FIELD_TEXT.hanamaru, { target: t.name, n });
}
