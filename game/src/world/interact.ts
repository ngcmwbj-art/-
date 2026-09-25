// Talking to actors, examining objects, running trigger scripts.
// A registered script with the object's id (or its `script` field) always
// wins; otherwise the placement data's text is used.

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { addItem, flag, setFlag, state, type Dir } from '../game/state';
import { KANENARI_FLIPS, KANENARI_USUAL, OBJ, TALK, MAMEKICHI_DONE } from '../data/maps/town_text';
import type { Actor } from './actor';
import { DIR_VEC } from './actor';
import type { FieldScene } from './field';
import { fushigiActive, fushigiDone, runFushigi } from './fushigi';
import { currentStage, pickStage, stageKeyPrefix } from './maps';
import { runMsg } from './msg';
import { getScript, type ScriptCtx } from './scripts';
import type { ExamineObj, NpcObj, SymbolObj, TalkTable } from './types';
import * as snd from './audio';

const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' };

function ctxFor(f: FieldScene, source: string, runDefault: () => Co, defaultText?: string): ScriptCtx {
  return { source, map: f.map.id, runDefault, defaultText };
}

/**
 * Pick the talk key for the current stage, counting visits per stage (6.0).
 * Chapter 1 reads flag_stage and the keys s0_1, s1, 's1-2'…; on 星見台 maps
 * (stageFlag 'flag_ch2_stage', 02_ch2 6.2) the stage is flag_ch2_stage and
 * the keys start with `h` (h0_1, h1, 'h1-2'…; the seen flags are
 * flag_seen_<npc>_h0_1 and the visit count flag_seen_<npc>_h0). A table
 * with no `h` keys at all is read with its `s` keys there.
 */
export function pickTalk(npcId: string, table: TalkTable): string | null {
  const stage = currentStage();
  const keys = Object.keys(table);
  const pre = stageKeyPrefix() === 'h' && keys.some((k) => /^h\d/.test(k)) ? 'h' : 's';
  for (let s = stage; s >= 0; s--) {
    // numbered keys sN_1, sN_2, ... (hN_1 on 星見台)
    const numbered: string[] = [];
    for (let n = 1; n <= 9; n++) if (table[`${pre}${s}_${n}`] !== undefined) numbered.push(`${pre}${s}_${n}`);
    if (numbered.length) {
      const cf = `flag_seen_${npcId}_${pre}${s}`;
      const count = flag(cf);
      const key = numbered[Math.min(count, numbered.length - 1)];
      setFlag(cf, count + 1);
      setFlag(`flag_seen_${npcId}_${key}`, 1);
      return key;
    }
    const direct = keys.find((k) => k === `${pre}${s}` || (k.startsWith(pre) && matchRange(k.slice(1), s)));
    if (direct) return direct;
  }
  return table.default !== undefined ? 'default' : null;
}

function matchRange(spec: string, s: number): boolean {
  if (spec.endsWith('+')) return s >= parseInt(spec, 10);
  if (spec.includes(',')) return spec.split(',').some((v) => /^\d$/.test(v) && +v === s);
  const m = /^(\d)-(\d)$/.exec(spec);
  if (m) return s >= +m[1] && s <= +m[2];
  return false;
}

/** Turn an NPC towards the player with the little "は!" lift (7.8). */
export function faceToward(a: Actor, target: Actor): void {
  const dx = target.x - a.x;
  const dy = target.y - a.y;
  a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
  a.lift = 70;
}

export function* interactActor(f: FieldScene, a: Actor): Co {
  const p = f.player;
  if (a.kind === 'follower') {
    yield* kanenariFlip(f, a);
    return;
  }
  if (a.kind === 'restored') {
    const key = 'restored_' + (a.data.enemy as string);
    const t = OBJ[key];
    const scr = getScript(key);
    if (scr) yield* scr(ctxFor(f, key, function* () {}));
    else if (t) yield* runMsg(pickStage(t) ?? '');
    return;
  }
  if (a.kind === 'sym') {
    f.symbols.touch(a, 'talk');
    return;
  }
  const def = a.data.def as NpcObj | undefined;
  if (!def) return;
  f.talking = a;
  const turns = !def.noTurn;
  const prevDir = a.dir;
  if (turns) faceToward(a, p);
  p.dir = OPPOSITE[a.dir] === p.dir ? p.dir : p.dir;
  const runDefault = function* (): Co {
    yield* npcDefault(f, a, def);
  };
  const scr = getScript(def.script ?? def.id);
  if (scr) yield* scr(ctxFor(f, def.id, runDefault));
  else yield* runDefault();
  f.talking = null;
  if (turns && (!def.move || def.move.kind === 'stand')) a.data.turnBack = 900;
  void prevDir;
}

function* npcDefault(f: FieldScene, a: Actor, def: NpcObj): Co {
  let table: TalkTable | undefined = def.talk;
  // まめ吉: after the stamp he says "まいど" once
  if (def.id === 'npc_mamekichi' && flag('flag_stage') === 1 && fushigiDone('fushigi_04')) table = MAMEKICHI_DONE;
  // fushigi on this NPC (stage-active, not yet stamped): talk first, then offer the stamp
  if (def.fushigi) {
    const fid = def.fushigi;
    if (flag('flag_stage') >= 1 && !fushigiDone(fid) && (def.id !== 'npc_mamekichi' || flag('flag_stage') === 1)) {
      const key = table ? pickTalk(def.id, table) : null;
      const seen = key && table ? table[key] : undefined;
      if (def.id === 'npc_mamekichi' && flag('flag_stage') === 2) {
        // stage 2 and still not stamped: one extra page before s2 talk
        yield* runMsg(`@npc_mamekichi
まいど！ まいど！{w=300}
……まだ 止まらねえんだ、これ。`);
      }
      yield* runFushigi(fid, seen);
      return;
    }
    if (fushigiDone(fid) && def.id === 'npc_sand_girl' && !flag('flag_seen_sand_girl_f07')) {
      setFlag('flag_seen_sand_girl_f07', 1);
      yield* runMsg(`@npc_sand_girl
見てた？{w=300}
ていぼう、すごいでしょ。`);
      return;
    }
    if (fushigiDone(fid) && def.id === 'npc_cat_sauce') {
      yield* runMsg(
        flag('flag_stage') >= 2
          ? `@narr
猫は 影と いっしょに、
丸く なっている。`
          : `@narr
猫と 影が、
同時に あくびを した。`,
      );
      return;
    }
  }
  // the lost-cat poster changes Sauce's line once
  if (def.id === 'npc_cat_sauce' && flag('flag_read_poster_sauce') && !flag('flag_seen_sauce_poster')) {
    setFlag('flag_seen_sauce_poster', 1);
    yield* runMsg(`@narr
猫の 首輪に 『ソース』。{w=300}
貼り紙の 迷い猫だ。
/
……ずっと ここに いたらしい。`);
    return;
  }
  // madam and kotaro both stop when either is spoken to
  if (def.id === 'npc_madam' || def.id === 'npc_kotaro') {
    const other = f.actorById(def.id === 'npc_madam' ? 'npc_kotaro' : 'npc_madam');
    if (other) other.data.scripted = true;
    try {
      yield* talkTable(def.id, table);
    } finally {
      if (other) delete other.data.scripted;
    }
    return;
  }
  yield* talkTable(def.id, table ?? TALK[def.id]);
}

function* talkTable(id: string, table: TalkTable | undefined): Co {
  if (!table) return;
  const key = pickTalk(id, table);
  if (!key) return;
  yield* runMsg(table[key], id);
}

/** Kanenari's flip board by place (6.17). */
function* kanenariFlip(f: FieldScene, a: Actor): Co {
  faceToward(a, f.player);
  const key = placeKey(f);
  snd.se('se_flip');
  const seenFlag = `flag_kanenari_flip_${key}`;
  if (key && KANENARI_FLIPS[key] && !flag(seenFlag)) {
    setFlag(seenFlag, 1);
    yield* runMsg(KANENARI_FLIPS[key]);
    if (key === 'koban' && f.map.id === 'map_koban')
      yield* runMsg(`@npc_tsurumi
その節は 失礼 いたしました！`);
    return;
  }
  const n = flag('flag_kanenari_usual');
  setFlag('flag_kanenari_usual', n + 1);
  yield* runMsg(KANENARI_USUAL[n % KANENARI_USUAL.length]);
}

/** Place key for Kanenari's flips (30_level_art 1.6). */
export function placeKey(f: FieldScene): string {
  const m = f.map.id;
  const x = f.player.tileX;
  const y = f.player.tileY;
  const inR = (x0: number, x1: number, y0: number, y1: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  if ((m === 'map_town' && inR(0, 8, 30, 34)) || m === 'map_home_1f') return 'home';
  if ((m === 'map_town' && inR(24, 29, 22, 24)) || m === 'map_maruyama') return 'meat';
  if ((m === 'map_town' && inR(30, 34, 22, 24)) || m === 'map_hinoya') return 'hinoya';
  if (m === 'map_town' && inR(29, 33, 32, 34)) return 'photo';
  if ((m === 'map_town' && inR(49, 55, 32, 34)) || m === 'map_koban') return 'koban';
  if (m === 'map_laundry') return 'laundry';
  if (m === 'map_town' && inR(15, 19, 28, 31)) return 'jizo';
  if (m === 'map_town' && inR(12, 19, 3, 10)) return 'park';
  if (m === 'map_town' && inR(55, 57, 21, 25)) return 'crossing';
  if (m === 'map_mall_hall' || m === 'map_mall_food' || m === 'map_mall_health') return 'mall';
  if (m === 'map_mall_2f') return 'mall_2f';
  if (m === 'map_town' && flag('flag_stage') >= 2) return 'town';
  return '';
}

// ---- objects -----------------------------------------------------------------------

export function* interactObject(f: FieldScene, o: ExamineObj): Co {
  const runDefault = function* (): Co {
    yield* objectDefault(f, o);
  };
  const scr = getScript(o.script ?? o.id);
  if (scr) {
    yield* scr(ctxFor(f, o.id, runDefault));
    return;
  }
  yield* runDefault();
}

function* objectDefault(f: FieldScene, o: ExamineObj): Co {
  snd.se('se_examine');
  if (o.fushigi) {
    const fid = o.fushigi;
    if (fushigiDone(fid)) {
      // alternate between the object's own text and the after-text
      const n = flag('flag_seen_' + o.id);
      setFlag('flag_seen_' + o.id, n + 1);
      const own = pickStage(o.text);
      if (own && n % 2 === 1) yield* runMsg(own);
      else yield* runFushigi(fid);
      return;
    }
    if (fushigiActive(fid)) {
      yield* runFushigi(fid);
      return;
    }
  }
  if (o.reward) {
    const r = o.reward;
    const got = flag(r.flag) > 0;
    if (!got) {
      if (r.second && !flag('flag_seen_' + o.id)) {
        setFlag('flag_seen_' + o.id, 1);
        yield* runMsg(pickStage(o.text) ?? '');
        return;
      }
      if (r.second) {
        yield* runMsg(REWARD_TEXT_SECOND[o.id] ?? '');
      } else yield* runMsg(pickStage(o.text) ?? '');
      if (r.item) {
        if (addItem(r.item)) {
          setFlag(r.flag, 1);
          snd.se('se_item');
          const name = itemName(r.item);
          yield* runMsg(`@sys
${name}を 手に入れた！`);
        } else {
          yield* runMsg(`@narr
もちものが いっぱいだ。`);
        }
      } else if (r.money) {
        state.money += r.money;
        setFlag(r.flag, 1);
        snd.se('se_coin');
        yield* runMsg(`@sys
${r.money}円 ひろった。`);
      }
      return;
    }
    if (r.after) {
      yield* runMsg(pickStage(r.after) ?? '');
      return;
    }
  }
  if (o.text2 && flag('flag_seen_' + o.id)) {
    yield* runMsg(pickStage(o.text2) ?? '');
    return;
  }
  const t = pickStage(o.text);
  if (t) {
    setFlag('flag_seen_' + o.id, 1);
    yield* runMsg(t);
  }
}

const REWARD_TEXT_SECOND: Record<string, string> = {
  obj_vending_ginza: `@narr
おつり口に、10円玉。{w=300}
……ボタンは 押して いない。`,
};

let itemNameFn: (id: string) => string = (id) => id;
export function setItemNameResolver(fn: (id: string) => string): void {
  itemNameFn = fn;
}
function itemName(id: string): string {
  return itemNameFn(id);
}

// ---- triggers / scripts by id ---------------------------------------------------------

/** Run a registered script by id. Returns false if none is registered. */
export function runTrigger(f: FieldScene, id: string, source: string): boolean {
  const scr = getScript(id);
  if (!scr) {
    if (import.meta.env.DEV && id.startsWith('evt_')) console.info(`[world] script not registered: ${id} (from ${source})`);
    return false;
  }
  f.startScript(scr(ctxFor(f, source, function* () {})));
  return true;
}

/** Walk-in check helper for symbol contact direction. */
export function facingVec(d: Dir): [number, number] {
  return DIR_VEC[d];
}

export { game };
export type { SymbolObj };
