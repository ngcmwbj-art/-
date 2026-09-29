// The north row's rooms (02_ch2_index #58, 10_narrative 6.14 / 6.22 / 7.19):
// しんご and his たんかん, the 喫茶 夕顔 master and his freezer, the うちわ at
// the sake shop, グソっ君's word once in each room, and the QA commands
//   __game.cmd.lvN('cafe')   jump into one of the rooms (lvN() lists them)
//   __game.cmd.lvDoorsN()    every door of the rooms and their town doors
//   __game.cmd.northText()   every new page: ≤ 3 lines, ≤ 336 px a line
//   __game.cmd.tankan(step)  0: reset, 1: heard, 2: holding it, 3: given
//
// たんかん (flags): flag_tankan_heard (しんご talked of it) → the master gives
// item_tankan 冷凍たんかん (flag_got_tankan; by talking to him or at the
// freezer) → しんご takes it (flag_tankan_given) and gives two 冷凍みかん
// (item_reitou_mikan; what the bag can't hold is owed: flag_tankan_owed).
// No money anywhere in it — the errand's 320円 / ツケ branch stays as it is.

import type { Co } from '../engine/co';
import { measure } from '../engine/font';
import { addItem, flag, removeItem, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { cellAt, loadMap, pickStage } from '../world/maps';
import { pickTalk } from '../world/interact';
import { msg, registerScript, stage } from '../world/api';
import type { DoorObj } from '../world/types';
import { sfx } from '../audio';
import { uiHud } from '../ui/hud';
import { NORTH_MAPS, NORTH_SPOTS } from '../data/maps/interior_north';
import * as N from '../data/maps/interior_north_text';
import { getKeyItem, itemName } from './lib';

const SHINGO = N.SHINGO_TALK;

// ---------------------------------------------------------------- しんご (6.14)

registerScript('npc_ojii', function* (): Co {
  // the frozen たんかん in hand: the hand-over (any stage)
  if (state.inventory.includes('item_tankan') && !flag('flag_tankan_given')) {
    removeItem('item_tankan');
    setFlag('flag_tankan_given', 1);
    yield* msg(N.SHINGO_TANKAN);
    const own = pickStage(N.SHINGO_TANKAN_STAGE);
    if (own) yield* msg(own);
    yield* msg(N.SHINGO_THANKS);
    setFlag('flag_tankan_owed', 2);
    yield* payOwed();
    return;
  }
  // what the bag couldn't hold last time
  if (flag('flag_tankan_owed') > 0) {
    yield* msg(`@npc_ojii
ほれ、この前の 冷凍みかんだ。`);
    yield* payOwed();
    return;
  }
  if (flag('flag_tankan_given') && !flag('flag_tankan_after')) {
    setFlag('flag_tankan_after', 1);
    yield* msg(N.SHINGO_AFTER);
    return;
  }
  const t: Record<string, string> = {};
  for (const [k, v] of Object.entries(SHINGO)) if (/^s\d(_\d)?$/.test(k)) t[k] = v as string;
  const key = pickTalk('npc_ojii', t);
  if (!key) return;
  yield* msg(t[key]);
  // every stage's first line (and s0_2) is about the たんかん
  if (key !== 's1_2' && key !== 's2_2' && key !== 's3') setFlag('flag_tankan_heard', 1);
});

/** Give the owed 冷凍みかん, as many as the bag holds. */
function* payOwed(): Co {
  let owed = flag('flag_tankan_owed');
  let got = 0;
  while (owed > 0 && addItem('item_reitou_mikan')) {
    owed--;
    got++;
  }
  setFlag('flag_tankan_owed', owed);
  if (got) {
    yield 34;
    uiHud.clearNotes();
    sfx('se_item');
    yield* msg(`@sys
${itemName('item_reitou_mikan')}を ${got === 1 ? '1つ' : `${got}つ`} 手に入れた！`);
  }
  if (owed > 0)
    yield* msg(`@npc_ojii
……もちものが いっぱいか。{w=300}
また 取りに 来い。とっておく。`);
}

// ---------------------------------------------------------------- 喫茶 夕顔: the master and the freezer

function* handTankan(): Co {
  yield* msg(N.MASTER_TANKAN);
  setFlag('flag_got_tankan', 1);
  yield* getKeyItem('item_tankan', `@sys
${itemName('item_tankan')}を 手に入れた！`);
}

registerScript('npc_master', function* (ctx): Co {
  if (flag('flag_tankan_heard') && !flag('flag_got_tankan') && stage() < 3) {
    yield* handTankan();
    return;
  }
  if (!flag('flag_tankan_heard') && flag('flag_seen_tankan_label') && !flag('flag_master_not_yet')) {
    setFlag('flag_master_not_yet', 1);
    yield* msg(N.MASTER_NOT_YET);
    return;
  }
  yield* ctx.runDefault();
});

registerScript('obj_cf_freezer', function* (): Co {
  sfx('se_examine');
  if (flag('flag_got_tankan')) {
    yield* msg(N.FREEZER_AFTER);
    return;
  }
  if (flag('flag_tankan_heard')) {
    yield* msg(N.FREEZER_LABEL);
    yield* handTankan();
    return;
  }
  setFlag('flag_seen_tankan_label', 1);
  yield* msg(N.FREEZER_LABEL);
});

// ---------------------------------------------------------------- 山吹酒店: the うちわ

registerScript('obj_yb_uchiwa', function* (): Co {
  sfx('se_examine');
  yield* msg(N.NOBJ.obj_yb_uchiwa as string);
  if (flag('flag_kanenari_joined') && !flag('flag_follower_hidden') && !flag('flag_uchiwa_flip')) {
    setFlag('flag_uchiwa_flip', 1);
    yield* msg(N.UCHIWA_FLIP);
  }
});

// ---------------------------------------------------------------- グソっ君, once in each room (ids keep the old names)

for (const id of NORTH_MAPS)
  registerScript('kanenari_' + id, function* (ctx): Co {
    const seen = 'flag_kanenari_flip_' + id;
    if (N.NFLIPS[id] && !flag(seen)) {
      setFlag(seen, 1);
      yield* msg(N.NFLIPS[id]);
      return;
    }
    yield* ctx.runDefault();
  });

// ---------------------------------------------------------------- QA

registerDebug('lvN', (name?: string, x?: number, y?: number) => {
  const s = name ? NORTH_SPOTS[name] ?? NORTH_SPOTS[name.replace(/^map_/, '')] : undefined;
  if (!s) return Object.keys(NORTH_SPOTS);
  const cmd = (window as unknown as { __game: { cmd: Record<string, (...a: unknown[]) => unknown> } }).__game.cmd;
  return cmd.warp?.(s[0], x ?? s[1], y ?? s[2], s[3]);
});

/** Every door of the rooms and the town's doors into them: target, arrival walkable, a way back. */
registerDebug('lvDoorsN', () => {
  const out: string[] = [];
  let ok = 0;
  const check = (from: string, d: DoorObj) => {
    const t = loadMap(d.to);
    if (!t) {
      out.push(`${from} ${d.id}: target ${d.to} missing`);
      return;
    }
    const c = cellAt(t, d.tx, d.ty);
    const solidObj = t.objects.some((q) => q.t === 'obj' && (q as { solid?: unknown }).solid && q.x === d.tx && q.y === d.ty);
    if (c.solid || solidObj) out.push(`${from} ${d.id}: arrival ${d.to} (${d.tx},${d.ty}) is solid`);
    const back = t.objects.some((q) => q.t === 'door' && (q as DoorObj).to === from);
    if (!back) out.push(`${from} ${d.id}: no door back from ${d.to}`);
    // the door cell itself must be a door cell of its own map
    const own = loadMap(from);
    if (own && !cellAt(own, d.x, d.y).door) out.push(`${from} ${d.id}: (${d.x},${d.y}) is not a door cell`);
    if (!c.solid && !solidObj && back) ok++;
  };
  const town = loadMap('map_town');
  for (const o of town?.objects ?? []) if (o.t === 'door' && NORTH_MAPS.includes((o as DoorObj).to)) check('map_town', o as DoorObj);
  for (const id of NORTH_MAPS) for (const o of loadMap(id)?.objects ?? []) if (o.t === 'door') check(id, o as DoorObj);
  return { ok, problems: out };
});

/** Width of a line as the dialog lays it out (full-width 16, half-width 8, half space 4; markup dropped). */
function lineWidth(line: string): number {
  return measure(line.replace(/\{[^}]*\}/g, ''));
}

/** Every page of the new texts: ≤ 3 lines, ≤ 336 px (10 13.4). */
export function northTextCheck(): { total: number; bad: string[] } {
  const bad: string[] = [];
  let total = 0;
  const pages = (src: string) => {
    const out: string[][] = [];
    let cur: string[] = [];
    const flush = () => {
      if (cur.length) out.push(cur);
      cur = [];
    };
    for (const raw of src.split('\n')) {
      const t = raw.trim();
      if (!t || t.startsWith('>')) continue;
      if (t.startsWith('@') || t === '/' || t.startsWith('!') || t.startsWith('?') || /^\[.*\]$/.test(t)) {
        flush();
        continue;
      }
      cur.push(raw.replace(/\s+$/, ''));
    }
    flush();
    return out;
  };
  const walk = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      for (const pg of pages(v)) {
        total++;
        if (pg.length > 3) bad.push(`${name}: ${pg.length} lines: ${pg.join('／')}`);
        for (const l of pg) if (lineWidth(l) > 336) bad.push(`${name}: ${lineWidth(l)}px: ${l}`);
      }
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(`${name}.${k}`, x);
  };
  walk('north', NORTH_TEXTS);
  return { total, bad };
}
registerDebug('northText', () => northTextCheck());

/** Every page of the north row's rooms (also walked by textcheck2). */
export const NORTH_TEXTS = {
  obj: N.NOBJ,
  reward: N.NREWARD,
  after: N.NREWARD_AFTER,
  talk: N.NTALK,
  shingo: N.SHINGO_TALK,
  tankan: {
    give: N.SHINGO_TANKAN,
    stage: N.SHINGO_TANKAN_STAGE,
    thanks: N.SHINGO_THANKS,
    after: N.SHINGO_AFTER,
    label: N.FREEZER_LABEL,
    notYet: N.MASTER_NOT_YET,
    master: N.MASTER_TANKAN,
    freezerAfter: N.FREEZER_AFTER,
  },
  flips: { ...N.NFLIPS, uchiwa: N.UCHIWA_FLIP },
};

/** QA: the たんかん steps. 0 reset · 1 heard · 2 holding it · 3 given. */
registerDebug('tankan', (step = 2) => {
  for (const f of ['flag_tankan_heard', 'flag_got_tankan', 'flag_tankan_given', 'flag_tankan_after', 'flag_tankan_owed', 'flag_seen_tankan_label', 'flag_master_not_yet'])
    setFlag(f, 0);
  removeItem('item_tankan');
  if (step >= 1) setFlag('flag_tankan_heard', 1);
  if (step >= 2) {
    setFlag('flag_got_tankan', 1);
    addItem('item_tankan');
  }
  if (step >= 3) {
    removeItem('item_tankan');
    setFlag('flag_tankan_given', 1);
  }
  return { heard: flag('flag_tankan_heard'), got: flag('flag_got_tankan'), given: flag('flag_tankan_given'), holding: state.inventory.includes('item_tankan') };
});

/** QA: money, the bag and the finds of the north row. */
registerDebug('northState', () => ({
  money: state.money,
  bag: [...state.inventory],
  finds: Object.fromEntries(
    ['sg_zabuton', 'sg_freebox', 'sd_suzuri', 'tf_ramune', 'tf_sack', 'ck_candy', 'cf_game', 'yb_bottles'].map((k) => [k, flag('flag_find_' + k)]),
  ),
  tankan: { heard: flag('flag_tankan_heard'), got: flag('flag_got_tankan'), given: flag('flag_tankan_given'), owed: flag('flag_tankan_owed') },
}));
