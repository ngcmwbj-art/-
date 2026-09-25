// Command input (9.3, 15.5, 15.9): per-member command window, the hanko /
// PR / item lists, and enemy / ally / boss-part target selection.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag, state } from '../game/state';
import { fill, fillAll, getItem, getSkill, isKeyItem, PR_ORDER, SYS, SYS2 } from '../data/battle';
import type { BattleScene } from './scene';
import type { BossPart, EnemyUnit, PartyCmd, PartyUnit } from './model';
import type { ListRow } from './ui/panels';
import { C, drawBar, tapeCanvas } from './ui/note';
import { measure } from '../engine/font';
import { showSticky, hideSticky } from './common';
import { yousuText } from './texts';
import { bossTriesOf } from './boss';
import { rappaTargetName, yobiCharge, yobiLit } from './boss_yobimodoshi';
import { keyItemUsable, otsukareBlock } from './party_ch2';

type Icon = { id: string; name: string; sub?: string; dim?: boolean };

/** Hanko that only lie in the list, grey (第2章: the chapter-1 finale's, and 「おやすみなさい」 after its night). */
const KEEPSAKE = new Set(['skill_okaerinasai', 'skill_oyasuminasai']);

/**
 * The hanko list (51 5.5). 第1章: the usable ones. 第2章: みました／ペケ／
 * はなまる／やりなおし／おつかれさま, then おかえりなさい (grey) and, after the
 * boss, おやすみなさい (grey) — the case is full of what was already pressed.
 */
function hankoSkills(u: PartyUnit): string[] {
  const own = u.m.skills.filter((sk) => getSkill(sk)?.kind === 'hanko' && sk !== 'skill_itadakimasu');
  if (!flag('flag_ch2_started')) return own.filter((sk) => !KEEPSAKE.has(sk));
  const order = ['skill_mimashita', 'skill_peke', 'skill_hanamaru', 'skill_yarinaoshi', 'skill_otsukaresama', 'skill_okaerinasai', 'skill_oyasuminasai'];
  return order.filter((sk) => own.includes(sk) && (sk !== 'skill_oyasuminasai' || !!flag('flag_ch2_boss_beaten')));
}

/** Is `sk` a usable hanko of this list (not a grey keepsake)? */
function usableHanko(sk: string): boolean {
  return !KEEPSAKE.has(sk);
}

function usableItems(): { id: string; count: number }[] {
  const out: { id: string; count: number }[] = [];
  for (const id of state.inventory) {
    if (isKeyItem(id)) continue;
    const e = out.find((o) => o.id === id);
    if (e) e.count++;
    else out.push({ id, count: 1 });
  }
  return out;
}

function keyItems(): string[] {
  return [...new Set(state.inventory.filter((id) => isKeyItem(id)))];
}

/** Anything for やりなおし to undo on this enemy (or part)? */
export function canUndo(s: BattleScene, e: EnemyUnit, part?: BossPart): boolean {
  // ヨビモドシ: only a lit name tag can be undone (the ラッパ are for みました)
  if (s.bossKind === 'yobimodoshi' && e.def.boss) return !part && s.bossChime.lit > 0;
  if (part) return part.glow && !part.broken;
  if (e.status.tame) return true;
  if (e.def.boss) return s.bossChime.lit > 0 || s.bossParts.some((p) => p.glow && !p.broken);
  return false;
}

function commandIcons(s: BattleScene, u: PartyUnit): Icon[] {
  if (s.memo.bossFinal && u.id === 'minato') return s.bossKind === 'yobimodoshi' ? [{ id: 'oyasumi', name: 'おやすみなさい' }] : [{ id: 'okaeri', name: 'おかえりなさい' }];
  if (u.id === 'kanenari') {
    const ready = PR_ORDER.filter((sk) => u.m.skills.includes(sk) && !(u.ct[sk] > 0)).length;
    return [
      { id: 'tackle', name: 'タックル' },
      { id: 'pr', name: 'PR活動', sub: `つかえる ${ready}` },
      { id: 'item', name: 'もちもの', sub: `${usableItems().reduce((a, b) => a + b.count, 0)}こ` },
      { id: 'guard', name: 'まもる' },
    ];
  }
  const icons: Icon[] = [{ id: 'tataku', name: 'たたく' }];
  if (flag('flag_got_hanko') && hankoSkills(u).some(usableHanko)) icons.push({ id: 'hanko', name: 'ハンコ', sub: `ink:${u.m.mp}` });
  icons.push({ id: 'item', name: 'もちもの', sub: `${usableItems().reduce((a, b) => a + b.count, 0)}こ` });
  icons.push({ id: 'guard', name: 'まもる' });
  icons.push({ id: 'flee', name: 'にげる' });
  return icons;
}

function noriAvailable(s: BattleScene): boolean {
  if (!s.kanenariJoined || s.kire < 3 || s.memo.bossFinal) return false;
  const k = s.kanenari;
  const m = s.minato;
  const ok = (u?: PartyUnit) => !!u && u.canAct && !u.has('status_konran');
  return ok(k) && ok(m);
}

/** Collect this round's commands. */
export function* inputCommands(s: BattleScene): Co<PartyCmd[]> {
  if (s.cmdQueue.length) return queuedCommands(s);
  const actors = s.party.filter((u) => u.canAct && !(s.memo.bossFinal && u.id === 'kanenari'));
  const cmds: PartyCmd[] = [];
  const chosen: (PartyCmd | null)[] = actors.map(() => null);
  let i = 0;
  const lastIndex: Record<string, number> = {};
  while (i < actors.length) {
    const u = actors[i];
    u.acting = true;
    const r = yield* chooseFor(s, u, i > 0, lastIndex);
    u.acting = false;
    if (r === 'queued') {
      s.cmd = null;
      s.list = null;
      s.target = null;
      s.msg.clearStatic();
      return queuedCommands(s);
    }
    if (r === 'back') {
      if (i > 0) {
        i--;
        chosen[i] = null;
        s.sfx('se_cancel');
      }
      continue;
    }
    chosen[i] = r;
    if (r.kind === 'nori' || r.kind === 'flee') break;
    i++;
  }
  s.cmd = null;
  const last = chosen.filter((c): c is PartyCmd => !!c);
  if (last.some((c) => c.kind === 'nori')) return [last.find((c) => c.kind === 'nori')!];
  cmds.push(...last);
  // members that cannot act still get a slot (their turn shows why)
  for (const u of s.party) {
    if (cmds.some((c) => c.u === u)) continue;
    if (last.some((c) => c.kind === 'flee')) continue;
    if (s.memo.bossFinal && u.id === 'kanenari') continue;
    const reason = !u.alive
      ? 'status_hebatta'
      : u.has('status_rusu')
        ? 'status_rusu'
        : u.has('status_nemuri')
          ? 'status_nemuri'
          : u.has('status_tsukamare')
            ? 'status_tsukamare'
            : u.has('status_toosenbo')
              ? 'status_toosenbo'
              : u.has('status_henji')
                ? 'status_henji'
                : '';
    if (reason) cmds.push({ kind: 'skip', u, reason });
  }
  return cmds;
}

/** QA: build commands from __game.cmd.bcmd([...]) without the UI. */
function queuedCommands(s: BattleScene): PartyCmd[] {
  const out: PartyCmd[] = [];
  const q = s.cmdQueue;
  s.cmdQueue = [];
  if (s.memo.bossFinal) {
    // the finale: Minato's one command is the last hanko, Kanenari-kun waits
    const u = s.minato;
    const e = s.aliveEnemies.find((x) => x.def.boss);
    if (!u || !e) return [];
    return [{ kind: 'hanko', u, skill: s.bossKind === 'yobimodoshi' ? 'skill_oyasuminasai' : 'skill_okaerinasai', target: e }];
  }
  for (const c of q) {
    const u = s.party.find((p) => p.id === c.who);
    if (!u) continue;
    const enemy = (): EnemyUnit => {
      const list = s.aliveEnemies;
      return (typeof c.target === 'number' ? list[c.target] : undefined) ?? list[0];
    };
    const ally = (): PartyUnit => s.party.find((p) => p.id === c.target) ?? u;
    switch (c.cmd) {
      case 'attack':
        out.push({ kind: 'attack', u, target: enemy() });
        break;
      case 'hanko': {
        const def = getSkill(c.skill ?? '');
        if (!def) break;
        out.push({ kind: 'hanko', u, skill: def.id, target: def.target === 'ally' ? ally() : enemy(), part: c.part });
        break;
      }
      case 'pr':
        out.push({ kind: 'pr', u, skill: c.skill ?? 'skill_kane' });
        break;
      case 'item':
        out.push({ kind: 'item', u, item: c.item ?? 'item_ramune', target: ['allies', 'none'].includes(getItem(c.item ?? '')?.target ?? '') ? null : ally() });
        break;
      case 'guard':
        out.push({ kind: 'guard', u });
        break;
      case 'flee':
        out.push({ kind: 'flee', u });
        break;
      case 'nori':
        return [{ kind: 'nori', u }];
    }
  }
  for (const u of s.party) {
    if (out.some((c) => c.u === u)) continue;
    const reason = !u.alive ? 'status_hebatta' : u.has('status_rusu') ? 'status_rusu' : u.has('status_nemuri') ? 'status_nemuri' : u.has('status_tsukamare') ? 'status_tsukamare' : u.has('status_toosenbo') ? 'status_toosenbo' : u.has('status_henji') ? 'status_henji' : '';
    if (reason) out.push({ kind: 'skip', u, reason });
  }
  return out;
}

function* chooseFor(s: BattleScene, u: PartyUnit, canBack: boolean, lastIndex: Record<string, number>): Co<PartyCmd | 'back' | 'queued'> {
  const inp = game.input;
  let index = lastIndex[u.id] ?? 0;
  let onTab = false;
  const firstTut = !s.memo.cmdTut && s.enemies[0]?.id === 'enemy_hato_kakaricho' && !flag('flag_tut_ring');
  if (firstTut) {
    showSticky(s, 'firstCommand');
    s.memo.cmdTut = 1;
  }
  // [events hook, QA round 2] the join fight: from round 6 the cursor waits
  // on ハンコ (pulsing), and the list on みました — a player who never thinks
  // of it is walked to it (the 様子 line says 「見て ほしい のかな」)
  const knHint = u.id === 'minato' && s.round >= 6 && s.enemies.some((e) => e.id === 'enemy_kanenari');
  if (knHint && lastIndex[u.id] === undefined) {
    const hi = commandIcons(s, u).findIndex((ic) => ic.id === 'hanko');
    if (hi >= 0) index = hi;
    s.memo.list_hanko = Math.max(0, hankoSkills(u).indexOf('skill_mimashita'));
  }
  // the 4th chime (a party-wide hit) rings at the end of this round: a
  // sticky says so and まもる pulses; after a wipe in this fight the cursor
  // also starts on まもる (QA round 3)
  // ヨビモドシ: the 4th name tag — only on a dark round (a lit one calls
  // nobody), and from 2 tags when they come in twos (51 10.4)
  const yobi = s.bossKind === 'yobimodoshi';
  const twos = yobi && (s.memo.bossPhase ?? 1) >= 2 && s.bossParts.filter((p) => p.broken).length < 2;
  const chimeHint = s.isBoss && !s.memo.bossFinal && (yobi ? !yobiLit(s) && s.bossChime.lit >= (twos ? 2 : 3) : s.bossChime.lit === 3);
  if (chimeHint) {
    showSticky(s, yobi ? 'tenko4' : 'chime4', undefined, false, 0, 0, 'right');
    if (bossTriesOf(s).lost > 0 && lastIndex[u.id] === undefined) {
      const gi = commandIcons(s, u).findIndex((ic) => ic.id === 'guard');
      if (gi >= 0) index = gi;
    }
  }
  // 第2章の付箋 (50 6.9): the cursor waits where the lesson is and the icon pulses
  let ch2Pulse: string | undefined;
  if (u.id === 'minato' && s.memo.suneTut && s.round <= 1 && s.aliveEnemies.some((e) => e.status.sune)) {
    // すねたら『みました』 — at the first command of the battle (51 22 #2)
    if (!s.memo.suneTutShown) {
      s.memo.suneTutShown = 1;
      showSticky(s, 'sune', 'flag_tut_sune');
    }
    ch2Pulse = 'hanko';
    s.memo.list_hanko = Math.max(0, hankoSkills(u).indexOf('skill_mimashita'));
  } else if (u.id === 'minato' && s.memo.otsukareTut && hankoSkills(u).includes('skill_otsukaresama')) {
    ch2Pulse = 'hanko';
    s.memo.list_hanko = Math.max(0, hankoSkills(u).indexOf('skill_otsukaresama'));
  } else if (yobi && s.memo.rappaTut && u.id === 'minato' && yobiLit(s)) {
    ch2Pulse = 'hanko';
    s.memo.list_hanko = Math.max(0, hankoSkills(u).indexOf('skill_mimashita'));
  } else if (yobi && s.memo.tomatoTut && yobiCharge(s) === 0 && !yobiLit(s)) {
    // トマトで 照らそう: the first time three tags are lit (and again on a retry)
    if (!s.memo.tomatoTutShown) {
      s.memo.tomatoTutShown = 1;
      showSticky(s, 'tomato', bossTriesOf(s).lost > 0 ? undefined : 'flag_tut_tomato');
    }
    ch2Pulse = 'item';
    s.memo.list_item = 0;
  }
  if (ch2Pulse && lastIndex[u.id] === undefined) {
    const pi = commandIcons(s, u).findIndex((ic) => ic.id === ch2Pulse);
    if (pi >= 0) index = pi;
  }
  let tabShown = false;
  for (;;) {
    const icons = commandIcons(s, u);
    if (index >= icons.length) index = 0;
    const nori = noriAvailable(s);
    if (nori && !tabShown) {
      tabShown = true;
      // right after the tab appears the cursor sits on it (15.5)
      if (!s.memo.noriTabShown) {
        onTab = true;
        s.memo.noriTabShown = 1;
      }
    }
    if (!nori) onTab = false;
    s.cmd = { icons, index, pressed: false, noriTab: nori, onTab, tutorialPulse: firstTut && !s.memo.cmdTutDone ? 'tataku' : knHint ? 'hanko' : chimeHint ? 'guard' : ch2Pulse };
    s.msg.setStatic(yousuText(s));
    yield null;
    // QA: __game.cmd.bcmd() while the command window is open
    if (s.cmdQueue.length) return 'queued';
    if (inp.repeat('left') && icons.length > 1) {
      index = (index + icons.length - 1) % icons.length;
      onTab = false;
      s.sfx('se_cursor');
    } else if (inp.repeat('right') && icons.length > 1) {
      index = (index + 1) % icons.length;
      onTab = false;
      s.sfx('se_cursor');
    } else if (inp.repeat('up') && nori && !onTab) {
      onTab = true;
      s.sfx('se_cursor');
    } else if (inp.repeat('down') && onTab) {
      onTab = false;
      s.sfx('se_cursor');
    }
    if (s.takeCancel()) {
      if (canBack) return 'back';
      continue;
    }
    if (!s.takeConfirm()) continue;
    s.cursorPressed = 110;
    s.sfx('se_confirm');
    lastIndex[u.id] = index;
    if (onTab) {
      hideSticky(s);
      // the 様子 line must not stay up through the whole ノリツッコミ
      // (QA round 2: the flavour line hung over the cut-in)
      s.msg.clearStatic();
      return { kind: 'nori', u };
    }
    const ic = icons[index];
    const r = yield* runIcon(s, u, ic.id);
    if (r) {
      if (firstTut) {
        s.memo.cmdTutDone = 1;
        hideSticky(s);
      }
      s.msg.clearStatic();
      return r;
    }
  }
}

function* runIcon(s: BattleScene, u: PartyUnit, id: string): Co<PartyCmd | null> {
  switch (id) {
    case 'tataku':
    case 'tackle': {
      const t = yield* pickEnemy(s, { parts: false });
      return t ? { kind: 'attack', u, target: t.e } : null;
    }
    case 'hanko':
      return yield* hankoMenu(s, u);
    case 'okaeri': {
      const boss = s.aliveEnemies[0];
      return boss ? { kind: 'hanko', u, skill: 'skill_okaerinasai', target: boss } : null;
    }
    case 'oyasumi': {
      const boss = s.enemies.find((e) => e.def.boss && !e.dead);
      return boss ? { kind: 'hanko', u, skill: 'skill_oyasuminasai', target: boss } : null;
    }
    case 'pr':
      return yield* prMenu(s, u);
    case 'item':
      return yield* itemMenu(s, u);
    case 'guard':
      return { kind: 'guard', u };
    case 'flee': {
      const e = s.enemies[0];
      if (s.isBoss || s.enemies.some((x) => x.def.noFlee)) {
        const txt = s.isBoss ? e?.def.texts.noFlee ?? SYS.nigeruBoss : e?.id === 'enemy_kanenari' ? SYS.nigeruKanenari : e?.def.texts.noFlee ?? SYS.nigeruEvent;
        s.cmd = null;
        yield* s.say(txt);
        return null;
      }
      return { kind: 'flee', u };
    }
  }
  return null;
}

// ---- lists ---------------------------------------------------------------------------

interface ListItem {
  row: ListRow;
  desc: string;
  pick: () => Co<PartyCmd | null | 'stay'>;
}

function* runList(s: BattleScene, items: ListItem[], remember: string): Co<PartyCmd | null> {
  const inp = game.input;
  let index = Math.min(items.length - 1, s.memo['list_' + remember] ?? 0);
  let scroll = 0;
  for (;;) {
    if (index < scroll) scroll = index;
    if (index >= scroll + 4) scroll = index - 3;
    s.list = { rows: items.map((i) => i.row), index, scroll };
    s.msg.setStatic(items[index]?.desc ?? '');
    yield null;
    if (inp.repeat('up') && items.length) {
      index = (index + items.length - 1) % items.length;
      s.sfx('se_cursor');
    } else if (inp.repeat('down') && items.length) {
      index = (index + 1) % items.length;
      s.sfx('se_cursor');
    }
    if (s.takeCancel()) {
      s.sfx('se_cancel');
      s.list = null;
      return null;
    }
    if (!s.takeConfirm() || !items.length) continue;
    s.memo['list_' + remember] = index;
    s.cursorPressed = 110;
    const listSave = s.list;
    const r = yield* items[index].pick();
    if (r === 'stay') {
      s.list = listSave;
      continue;
    }
    if (r) {
      s.list = null;
      return r;
    }
    s.list = listSave;
  }
}

function skillDesc(id: string): string {
  const d = getSkill(id)?.desc;
  return d ? `${d[0]}\n${d[1]}` : '';
}

function* hankoMenu(s: BattleScene, u: PartyUnit): Co<PartyCmd | null> {
  const kanenariEvent = s.enemies.some((e) => e.id === 'enemy_kanenari');
  // テツヤ can be rested even without the ink for it (51 5.1)
  const tetsuya = s.aliveEnemies.some((e) => e.def.restAlways);
  const items: ListItem[] = hankoSkills(u).map((sk) => {
    const def = getSkill(sk)!;
    const cost = def.cost ?? 0;
    // the keepsakes of the case: listed grey, a line, no turn used (51 5.5)
    if (!usableHanko(sk)) {
      return {
        row: { name: def.name, right: '', dim: true },
        desc: skillDesc(sk),
        pick: function* (): Co<'stay'> {
          s.sfx('se_page');
          yield* s.say(sk === 'skill_okaerinasai' ? SYS2.okaeriCh2 : SYS2.oyasumiAfter);
          return 'stay';
        },
      };
    }
    const inkOk = u.m.mp >= cost || (kanenariEvent && sk === 'skill_mimashita') || (sk === 'skill_otsukaresama' && tetsuya);
    let dim = !inkOk;
    const undoNone = sk === 'skill_yarinaoshi' && !s.aliveEnemies.some((e) => canUndo(s, e));
    if (undoNone) dim = true;
    // おつかれさま: grey when every enemy is resting or just back from a rest
    const restNone = sk === 'skill_otsukaresama' && !s.aliveEnemies.some((e) => !otsukareBlock(s, e));
    if (restNone) dim = true;
    return {
      row: { name: def.name, right: String(cost), rightIcon: 'ink', dim },
      desc: skillDesc(sk),
      pick: function* (): Co<PartyCmd | null | 'stay'> {
        if (undoNone) {
          s.sfx('se_cancel');
          yield* s.say(SYS.yarinaoshiNone);
          return 'stay';
        }
        if (!inkOk) {
          s.sfx('se_cancel');
          yield* s.say(SYS.noInk);
          return 'stay';
        }
        if (restNone) {
          s.sfx('se_cancel');
          const e = s.aliveEnemies[0];
          const why = e ? otsukareBlock(s, e) : 'resting';
          yield* s.say(fillAll(why === 'after' ? SYS2.otsukareFail : SYS2.otsukareResting, { enemy: e?.name ?? '' }));
          return 'stay';
        }
        s.sfx('se_confirm');
        if (def.target === 'ally') {
          const t = yield* pickAlly(s, true);
          return t ? { kind: 'hanko', u, skill: sk, target: t } : null;
        }
        // ヨビモドシ's ラッパ are only for みました (やりなおし takes the name tags)
        const parts = def.target === 'part' && !(s.bossKind === 'yobimodoshi' && sk === 'skill_yarinaoshi');
        const t = yield* pickEnemy(s, { parts, skill: sk });
        return t ? { kind: 'hanko', u, skill: sk, target: t.e, part: t.part?.id } : null;
      },
    };
  });
  return yield* runList(s, items, 'hanko');
}

function* prMenu(s: BattleScene, u: PartyUnit): Co<PartyCmd | null> {
  const items: ListItem[] = PR_ORDER.filter((sk) => u.m.skills.includes(sk)).map((sk) => {
    const def = getSkill(sk)!;
    const ct = u.ct[sk] ?? 0;
    return {
      row: { name: def.name, right: ct > 0 ? `あと${ct}` : '', dim: ct > 0 },
      desc: skillDesc(sk),
      pick: function* (): Co<PartyCmd | null | 'stay'> {
        if (ct > 0) {
          s.sfx('se_cancel');
          return 'stay';
        }
        s.sfx('se_confirm');
        return { kind: 'pr', u, skill: sk };
      },
    };
  });
  return yield* runList(s, items, 'pr');
}

function* itemMenu(s: BattleScene, u: PartyUnit): Co<PartyCmd | null> {
  const items: ListItem[] = [];
  // ヨビモドシ: the はなまるトマト heads the list, as usable as any (51 13.3)
  const tomatoHere = s.bossKind === 'yobimodoshi' && state.inventory.includes('item_hanamaru_tomato') && !s.memo.bossFinal;
  if (tomatoHere) {
    const it = getItem('item_hanamaru_tomato')!;
    const lit = yobiLit(s);
    const charge = yobiCharge(s);
    items.push({
      row: { name: it.name, right: lit ? '光っている' : charge > 0 ? `あと${charge}` : 'かかげる', dim: lit || charge > 0 },
      desc: `${it.desc[0]}\n${SYS2.tomatoDesc2}`,
      pick: function* (): Co<PartyCmd | null | 'stay'> {
        if (lit || charge > 0) {
          s.sfx('se_buzzer');
          yield* s.say(lit ? SYS2.tomatoLit : SYS2.tomatoCharging);
          return 'stay';
        }
        s.sfx('se_confirm');
        return { kind: 'item', u, item: it.id, target: null };
      },
    });
  }
  items.push(...usableItems().map(({ id, count }) => {
    const it = getItem(id)!;
    return {
      row: { name: it.name, right: `${count}こ` },
      desc: `${it.desc[0]}\n${it.desc[1]}`,
      pick: function* (): Co<PartyCmd | null | 'stay'> {
        s.sfx('se_confirm');
        if (it.target === 'allies') return { kind: 'item', u, item: id, target: null };
        const t = yield* pickAlly(s, true, it.target === 'minato' ? 'minato' : undefined);
        return t ? { kind: 'item', u, item: id, target: t } : null;
      },
    };
  }));
  keyItems()
    .filter((id) => !(tomatoHere && id === 'item_hanamaru_tomato'))
    .forEach((id, i) => {
      const it = getItem(id)!;
      // ハトの名刺 before ヘノヘノ課長 does something (and takes the turn: 51 6.2)
      const live = id === 'item_hato_meishi' && keyItemUsable(s, id);
      items.push({
        row: { name: it.name, dim: !live, divider: i === 0 },
        desc: it.desc[1] ? `${it.desc[0]}\n${it.desc[1]}` : it.desc[0],
        pick: function* (): Co<PartyCmd | 'stay'> {
          if (live) {
            s.sfx('se_confirm');
            return { kind: 'item', u, item: id, target: null };
          }
          const e = s.aliveEnemies[0];
          const pages = fillAll(it.battleText ?? SYS.keyItemFallback, { enemy: e?.name ?? '' });
          yield* s.say(pages);
          return 'stay';
        },
      });
    });
  return yield* runList(s, items, 'item');
}

// ---- targets -------------------------------------------------------------------------

interface EnemyTarget {
  e: EnemyUnit;
  part?: BossPart;
}

function partCenter(e: EnemyUnit, p: BossPart): { x: number; y: number; w: number } {
  return { x: e.left + p.box[0] + p.box[2] / 2, y: e.top + p.box[1], w: p.box[2] };
}

/** Selection highlight code the boss art understands (params.hl). */
const PART_HL: Record<string, number> = {
  boss_omukaemachi_cap: 1,
  boss_omukaemachi_umbrella: 2,
  boss_omukaemachi_bottle: 3,
  boss_omukaemachi_shoe: 4,
  boss_yobimodoshi_east: 1,
  boss_yobimodoshi_west: 2,
  boss_yobimodoshi_south: 3,
  boss_yobimodoshi_north: 4,
};

/**
 * Where the cursor stamp points for each boss target (sprite coords), so no
 * two targets share a spot: the body between the lost-child tags (its eyes),
 * the cap on its crown, the bottle on its lid, the umbrellas on the bundle,
 * and the shoe from the side (the stamp lies down, face to the right).
 */
const BOSS_AIM: Record<string, { x: number; y: number; dir: 'down' | 'right' }> = {
  body: { x: 80, y: 45, dir: 'down' },
  // ヨビモドシ: the lamp (its eye) for the body, each ラッパ on its mouth
  yobi_body: { x: 64, y: 62, dir: 'down' },
  boss_yobimodoshi_north: { x: 64, y: 9, dir: 'down' },
  boss_yobimodoshi_west: { x: 16, y: 22, dir: 'down' },
  boss_yobimodoshi_south: { x: 64, y: 31, dir: 'down' },
  boss_yobimodoshi_east: { x: 112, y: 22, dir: 'down' },
  boss_omukaemachi_cap: { x: 80, y: 13, dir: 'down' },
  boss_omukaemachi_bottle: { x: 125, y: 57, dir: 'down' },
  boss_omukaemachi_umbrella: { x: 20, y: 52, dir: 'down' },
  boss_omukaemachi_shoe: { x: 58, y: 111, dir: 'right' },
};

export function bossAim(e: EnemyUnit, part?: BossPart): { x: number; y: number; dir: 'down' | 'right' } {
  const a = BOSS_AIM[part ? part.id : e.id === 'boss_yobimodoshi' ? 'yobi_body' : 'body'] ?? BOSS_AIM.body;
  return { x: e.left + a.x, y: e.top + a.y, dir: a.dir };
}

export function* pickEnemy(s: BattleScene, o: { parts: boolean; skill?: string }): Co<EnemyTarget | null> {
  const inp = game.input;
  const list: EnemyTarget[] = [];
  for (const e of [...s.aliveEnemies].sort((a, b) => a.x - b.x)) {
    if (e.id === 'boss_yobimodoshi' && o.parts) {
      // west, north, the body, south, east: left to right, top first
      const at = (k: string) => s.bossParts.find((p) => p.id === 'boss_yobimodoshi_' + k && !p.broken);
      for (const k of ['west', 'north']) {
        const p = at(k);
        if (p) list.push({ e, part: p });
      }
      list.push({ e });
      for (const k of ['south', 'east']) {
        const p = at(k);
        if (p) list.push({ e, part: p });
      }
    } else if (e.def.boss && o.parts) {
      const parts = s.bossParts.filter((p) => !p.broken);
      // left-to-right: umbrella, cap/shoe, body, bottle
      const withPos = parts.map((p) => ({ p, x: p.box[0] + p.box[2] / 2 }));
      const left = withPos.filter((w) => w.x < 80).sort((a, b) => a.x - b.x);
      const right = withPos.filter((w) => w.x >= 80).sort((a, b) => a.x - b.x);
      for (const w of left) list.push({ e, part: w.p });
      list.push({ e });
      for (const w of right) list.push({ e, part: w.p });
    } else list.push({ e });
  }
  if (!list.length) return null;
  let index = 0;
  const glowing = list.findIndex((t) => t.part?.glow);
  // ヨビモドシ lit, 『光った ラッパに みました』: the first whole ラッパ, E → W → S → N (51 10.3)
  const yobiFirst = s.bossKind === 'yobimodoshi' && o.skill === 'skill_mimashita' && yobiLit(s)
    ? ['east', 'west', 'south', 'north'].map((k) => list.findIndex((t) => t.part?.id === 'boss_yobimodoshi_' + k)).find((i) => i >= 0) ?? -1
    : -1;
  if (yobiFirst >= 0) {
    index = yobiFirst;
    s.memo.rappaTut = 0;
  } else if (glowing >= 0 && s.bossKind !== 'yobimodoshi' && (o.skill === 'skill_mimashita' || o.skill === 'skill_yarinaoshi')) index = glowing;
  else {
    const body = list.findIndex((t) => !t.part);
    if (body >= 0) index = body;
  }
  // the skill list closes while a target is chosen: nothing may cover the
  // enemies (or a glowing boss part) — cancel brings it back (runList)
  s.list = null;
  if (s.memo.oshiraseTut && glowing >= 0) {
    // to the right of the boss, under the chime sticky, clear of every part
    showSticky(s, 'oshirase', undefined, false, 0, 0, 'right');
    s.memo.oshiraseTut = 0;
  }
  const dimmed = (t: EnemyTarget) =>
    (o.skill === 'skill_yarinaoshi' && !canUndo(s, t.e, t.part)) || (o.skill === 'skill_otsukaresama' && !t.part && !!otsukareBlock(s, t.e));
  const prevCmd = s.cmd;
  s.cmd = null;
  const clearHl = () => {
    for (const x of s.enemies) if (x.def.boss) x.params.hl = 0;
  };
  for (;;) {
    const t = list[index];
    const boss = t.e.def.boss && o.parts;
    s.target = { kind: 'enemy', e: t.e, part: t.part ? partCenter(t.e, t.part) : undefined, aim: boss ? bossAim(t.e, t.part) : undefined };
    // the chosen part (or the whole shadow) blinks with a light outline
    if (t.e.def.boss) t.e.params.hl = boss ? (t.part ? PART_HL[t.part.id] ?? 0 : 5) : 0;
    const darkPart = !!t.part && s.bossKind === 'yobimodoshi' && !yobiLit(s);
    const name = t.part ? (s.bossKind === 'yobimodoshi' ? rappaTargetName(s, t.part) : t.part.name) : t.e.name;
    const showHp = !t.part && !!flag('flag_mimashita_' + t.e.id) && !t.e.def.invulnerable;
    const e = t.e;
    const part = t.part;
    const nameW = measure(name);
    s.msg.setStatic(
      // a dark ラッパ: only its mouth's glint is there to see (51 10.2)
      darkPart ? `${name}　${SYS2.rappaDark}` : name,
      !darkPart && (showHp || part)
        ? (g, x, y) => {
            if (showHp) drawBar(g, x + 200, y + 8, 120, 5, e.hp / e.maxHp, C.shu, C.grid, e.hpTrail / e.maxHp, C.white);
            // parts get a small tape tag after the name (「部位」), gold with a
            // sparkle while the part is glowing
            if (part) g.img(partTag(part.glow), x + 14 + nameW + 6, y + 4);
          }
        : null,
    );
    s.cmd = prevCmd;
    yield null;
    s.cmd = prevCmd;
    if (inp.repeat('left') || inp.repeat('up')) {
      index = (index + list.length - 1) % list.length;
      s.sfx('se_cursor');
    } else if (inp.repeat('right') || inp.repeat('down')) {
      index = (index + 1) % list.length;
      s.sfx('se_cursor');
    }
    if (s.takeCancel()) {
      s.sfx('se_cancel');
      s.target = null;
      clearHl();
      s.msg.setStatic('');
      hideSticky(s);
      return null;
    }
    if (s.takeConfirm()) {
      if (dimmed(list[index])) {
        s.sfx('se_cancel');
        if (o.skill === 'skill_otsukaresama') {
          // 〔おつかれさま・休憩中の敵を選んだ〕 / 休憩あけ (no turn, no ink: 51 22 #9)
          const why = otsukareBlock(s, list[index].e);
          const hold = s.target;
          yield* s.say(fillAll(why === 'after' ? SYS2.otsukareFail : SYS2.otsukareResting, { enemy: list[index].e.name }));
          s.target = hold;
        }
        continue;
      }
      s.cursorPressed = 110;
      s.sfx('se_confirm');
      s.target = null;
      clearHl();
      s.msg.setStatic('');
      return list[index];
    }
  }
}

const partTags: HTMLCanvasElement[] = [];
/** 「部位」 tape tag for the band (gold with a sparkle while the part glows). */
function partTag(glow: boolean): HTMLCanvasElement {
  const k = glow ? 1 : 0;
  if (partTags[k]) return partTags[k];
  const img = tapeCanvas(40, 16, '部位', glow ? '#FFD23F' : '#AFD6E6', 7);
  if (glow) {
    const ctx = img.getContext('2d')!;
    ctx.fillStyle = '#FFF6D8';
    for (const [x, y] of [[36, 1], [35, 2], [37, 2], [36, 3], [3, 12], [2, 13], [4, 13], [3, 14]]) ctx.fillRect(x, y, 1, 1);
  }
  partTags[k] = img;
  return img;
}

export function* pickAlly(s: BattleScene, includeDown: boolean, only?: string): Co<PartyUnit | null> {
  const inp = game.input;
  const list = s.party.filter((u) => (includeDown || u.alive) && !u.has('status_rusu') && (!only || u.id === only));
  if (!list.length) return null;
  let index = 0;
  for (;;) {
    const u = list[index];
    s.target = { kind: 'party', u };
    s.msg.setStatic(u.name);
    yield null;
    if (inp.repeat('left') || inp.repeat('up')) {
      index = (index + list.length - 1) % list.length;
      s.sfx('se_cursor');
    } else if (inp.repeat('right') || inp.repeat('down')) {
      index = (index + 1) % list.length;
      s.sfx('se_cursor');
    }
    if (s.takeCancel()) {
      s.sfx('se_cancel');
      s.target = null;
      s.msg.setStatic('');
      return null;
    }
    if (s.takeConfirm()) {
      s.sfx('se_confirm');
      s.target = null;
      s.msg.setStatic('');
      return list[index];
    }
  }
}

export { fill };
