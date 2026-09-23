// Command input (9.3, 15.5, 15.9): per-member command window, the hanko /
// PR / item lists, and enemy / ally / boss-part target selection.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { flag, state } from '../game/state';
import { fill, fillAll, getItem, getSkill, isKeyItem, PR_ORDER, SYS } from '../data/battle';
import type { BattleScene } from './scene';
import type { BossPart, EnemyUnit, PartyCmd, PartyUnit } from './model';
import type { ListRow } from './ui/panels';
import { C, drawBar } from './ui/note';
import { showSticky, hideSticky } from './common';
import { yousuText } from './texts';

type Icon = { id: string; name: string; sub?: string; dim?: boolean };

function hankoSkills(u: PartyUnit): string[] {
  return u.m.skills.filter((sk) => getSkill(sk)?.kind === 'hanko' && sk !== 'skill_okaerinasai' && sk !== 'skill_oyasuminasai');
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
  if (part) return part.glow && !part.broken;
  if (e.status.tame) return true;
  if (e.def.boss) return s.bossChime.lit > 0 || s.bossParts.some((p) => p.glow && !p.broken);
  return false;
}

function commandIcons(s: BattleScene, u: PartyUnit): Icon[] {
  if (s.memo.bossFinal && u.id === 'minato') return [{ id: 'okaeri', name: 'おかえりなさい' }];
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
  if (flag('flag_got_hanko') && hankoSkills(u).length) icons.push({ id: 'hanko', name: 'ハンコ', sub: `ink:${u.m.mp}` });
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
        out.push({ kind: 'item', u, item: c.item ?? 'item_ramune', target: getItem(c.item ?? '')?.target === 'allies' ? null : ally() });
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
    const reason = !u.alive ? 'status_hebatta' : u.has('status_rusu') ? 'status_rusu' : u.has('status_nemuri') ? 'status_nemuri' : u.has('status_tsukamare') ? 'status_tsukamare' : u.has('status_toosenbo') ? 'status_toosenbo' : '';
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
    s.cmd = { icons, index, pressed: false, noriTab: nori, onTab, tutorialPulse: firstTut && !s.memo.cmdTutDone ? 'tataku' : undefined };
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
    case 'pr':
      return yield* prMenu(s, u);
    case 'item':
      return yield* itemMenu(s, u);
    case 'guard':
      return { kind: 'guard', u };
    case 'flee': {
      const e = s.enemies[0];
      if (s.isBoss || s.enemies.some((x) => x.def.noFlee)) {
        const txt = s.isBoss ? SYS.nigeruBoss : e?.id === 'enemy_kanenari' ? SYS.nigeruKanenari : e?.def.texts.noFlee ?? SYS.nigeruEvent;
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
  const items: ListItem[] = hankoSkills(u).map((sk) => {
    const def = getSkill(sk)!;
    const cost = def.cost ?? 0;
    let dim = u.m.mp < cost && !(kanenariEvent && sk === 'skill_mimashita');
    const undoNone = sk === 'skill_yarinaoshi' && !s.aliveEnemies.some((e) => canUndo(s, e));
    if (undoNone) dim = true;
    return {
      row: { name: def.name, right: String(cost), rightIcon: 'ink', dim },
      desc: skillDesc(sk),
      pick: function* (): Co<PartyCmd | null | 'stay'> {
        if (undoNone) {
          s.sfx('se_cancel');
          yield* s.say(SYS.yarinaoshiNone);
          return 'stay';
        }
        if (u.m.mp < cost && !(kanenariEvent && sk === 'skill_mimashita')) {
          s.sfx('se_cancel');
          yield* s.say(SYS.noInk);
          return 'stay';
        }
        s.sfx('se_confirm');
        if (def.target === 'ally') {
          const t = yield* pickAlly(s, true);
          return t ? { kind: 'hanko', u, skill: sk, target: t } : null;
        }
        const t = yield* pickEnemy(s, { parts: def.target === 'part', skill: sk });
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
  const items: ListItem[] = usableItems().map(({ id, count }) => {
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
  });
  keyItems().forEach((id, i) => {
    const it = getItem(id)!;
    items.push({
      row: { name: it.name, dim: true, divider: i === 0 },
      desc: it.desc[1] ? `${it.desc[0]}\n${it.desc[1]}` : it.desc[0],
      pick: function* (): Co<'stay'> {
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

export function* pickEnemy(s: BattleScene, o: { parts: boolean; skill?: string }): Co<EnemyTarget | null> {
  const inp = game.input;
  const list: EnemyTarget[] = [];
  for (const e of [...s.aliveEnemies].sort((a, b) => a.x - b.x)) {
    if (e.def.boss && o.parts) {
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
  if (glowing >= 0 && (o.skill === 'skill_mimashita' || o.skill === 'skill_yarinaoshi')) index = glowing;
  else {
    const body = list.findIndex((t) => !t.part);
    if (body >= 0) index = body;
  }
  if (s.memo.oshiraseTut && glowing >= 0) {
    showSticky(s, 'oshirase');
    s.memo.oshiraseTut = 0;
  }
  const dimmed = (t: EnemyTarget) => o.skill === 'skill_yarinaoshi' && !canUndo(s, t.e, t.part);
  const prevCmd = s.cmd;
  s.cmd = null;
  for (;;) {
    const t = list[index];
    s.target = { kind: 'enemy', e: t.e, part: t.part ? partCenter(t.e, t.part) : undefined };
    const name = t.part ? t.part.name : t.e.name;
    const showHp = !t.part && !!flag('flag_mimashita_' + t.e.id) && !t.e.def.invulnerable;
    const e = t.e;
    s.msg.setStatic(
      name,
      showHp
        ? (g, x, y) => {
            drawBar(g, x + 200, y + 8, 120, 5, e.hp / e.maxHp, C.shu, C.grid, e.hpTrail / e.maxHp, C.white);
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
      s.msg.setStatic('');
      hideSticky(s);
      return null;
    }
    if (s.takeConfirm()) {
      if (dimmed(list[index])) {
        s.sfx('se_cancel');
        continue;
      }
      s.cursorPressed = 110;
      s.sfx('se_confirm');
      s.target = null;
      s.msg.setStatic('');
      return list[index];
    }
  }
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
