// げむきか 2026-09-30 の案のうち 1・2（第1章の部分）・5（02_ch2_index #71、依頼主の変更つき）.
// The pages are data/text/cape_coffee.ts; this file wraps the scripts of the
// people it touches (registered after events/shops, npcs and rooms_north, so
// getScript() here returns theirs):
//
// 1 ふろしきの マント (10 6.2・6.3・7.4): at stage 2 the class photo in ひのや
//   (obj_class_photo) gets a second page — the boy at the end of the front
//   row with a green furoshiki for a cape, 『ももせ たかし』. The first time,
//   おばあ speaks up from behind the counter as soon as the photo's pages end
//   (she looks over at the photo; しゅん turns to her): 〔cape〕, and グソっ君's
//   word (flag_cape_obaa). Then, once at stage 2 after his 〔s2_1〕〔s2_2〕,
//   たかし's 〔cape〕 and the towel patted flat on his chest (pose 'towel' →
//   'pat', flag_cape_takashi). The statue is never named.
// 2 (chapter 1): ヤキソバン's statue, from the second look on, any stage: the
//   page of the unpainted spatula (flag_hera_look counts the looks).
// 5 減らない コーヒー (10 6.11・6.16・6.22・7.19): at stage 2 ぶーさん's body
//   (npc_bu_body) sits at 喫茶 夕顔's window seat reading the paper, no shadow
//   at his feet. 1st talk 〔s2_1〕; 2nd 〔s2_2〕 (「……お腹が 限界です……」), and
//   with グソっ君 there the scene: なんばるわん comes in for her usual, グソっ君
//   offers to drink half and takes a sip (「……にっが！！」), the coffee goes
//   down at last, and she takes him off to the park, 「負けない！」
//   (flag_bu_gk_sip, flag_bu_left). In the park he sits beside his shadow on
//   the wisteria bench; the first talk to either is their meeting (flag_bu_met).
//   かずゆき (npc_master; ★2026-09-30 マスター→かずゆき) has a word before and
//   after (the beans: 星見台's タケじい roasts them), なんばるわん a word on
//   the slope after, and her 〔s2_2〕 there drops its 「負けない！」 (once a stage).
//   Chapter 2: タケじい's roaster and the sack for 『喫茶 夕顔 かずゆき 様』
//   (obj_hr_mk3_baisen; グソっ君 remembers the smell once if he had the sip).
//
//   __game.cmd.cape(step)   QA: 'reset' | 'photo' | 'takashi' | 'statue' | 'cafe' | 'park' | 'baisen'
//   __game.cmd.capeText()   every page against 3 lines × 336 px (textcheck2 walks them too)

import type { Co } from '../engine/co';
import { animate, ease } from '../engine/tween';
import { measure } from '../engine/font';
import { flag, setFlag } from '../game/state';
import { registerDebug } from '../debug';
import type { Actor } from '../world/actor';
import { actor, despawn, face, msg, registerScript, spawn, stage } from '../world/api';
import { field } from '../world/field';
import { pickTalk } from '../world/interact';
import { pickStage } from '../world/maps';
import { SPEAKERS } from '../world/msg';
import { getScript, type ScriptCtx, type ScriptFn } from '../world/scripts';
import type { Dir } from '../game/state';
import { sfx } from '../audio';
import { NPC } from '../data/text/npcs';
import { IOBJ } from '../data/maps/interior_text';
import { R2_OBJ } from '../data/text/hoshi_rooms2';
import * as C from '../data/text/cape_coffee';
import { F, onMap, once, stageKeys, tileFree, tileRoute } from './lib';

Object.assign(SPEAKERS, {
  // the shadow's own voice without the muffle (audio/voices.ts `bu`)
  npc_bu_body: { name: 'ぶーさん', voice: 'bu' },
  // the shadow (npc_shadow_man) once the body sits beside it: the two told apart
  npc_bu_shadow: { name: 'ぶーさんの影', voice: 'shadow' },
});

/** The script another module registered for `id` (it must be there already: events/index.ts imports this file after them). */
function base(id: string): ScriptFn {
  const fn = getScript(id);
  if (!fn) throw new Error(`[cape_coffee] no script to wrap: ${id}`);
  return fn;
}

/** Is グソっ君 walking with しゅん and in sight? */
function gkWith(): boolean {
  const f = field();
  return !!flag('flag_kanenari_joined') && !flag('flag_follower_hidden') && !!f?.follower?.visible;
}

function dirFrom(a: Actor, tx: number, ty: number): Dir {
  const dx = tx - a.tileX;
  const dy = ty - a.tileY;
  return Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : dy > 0 ? 'down' : 'up';
}

/** Start an actor along tiles without waiting (a scene moves two at once). */
function go(a: Actor, tiles: [number, number][], speed: number): void {
  a.data.scripted = true;
  a.pathSpeed = speed * 16;
  for (const [x, y] of tiles) a.path.push([x * 16 + 8, y * 16 + 16]);
}

function* arrive(...who: Actor[]): Co {
  yield () => who.every((a) => a.path.length === 0);
  for (const a of who) a.moving = false;
}

/** A route to the first reachable of `goals`, never through `avoid` (null: none). */
function routeTo(from: [number, number], goals: [number, number][], avoid: [number, number][]): { to: [number, number]; path: [number, number][] } | null {
  for (const g of goals) {
    if (avoid.some(([x, y]) => x === g[0] && y === g[1])) continue;
    if (from[0] === g[0] && from[1] === g[1]) return { to: g, path: [] };
    const r = tileRoute(from, g, avoid, 12);
    if (r) return { to: g, path: r };
  }
  return null;
}

// ================================================================ 1 ふろしきの マント

registerScript('obj_class_photo', function* (ctx: ScriptCtx): Co {
  if (stage() !== 2) {
    yield* ctx.runDefault();
    return;
  }
  sfx('se_examine');
  setFlag('flag_seen_obj_class_photo', 1);
  yield* msg(`${pickStage(IOBJ.obj_class_photo) ?? ''}\n/\n${C.CAPE.photo}`);
  if (!flag('flag_cape_obaa')) yield* obaaCape();
});

/** おばあ, from behind the counter, right after the photo's pages (once). */
function* obaaCape(): Co {
  const o = actor('npc_obaa');
  if (!o || !onMap('map_hinoya')) return;
  const f = F();
  const p = f.player;
  setFlag('flag_cape_obaa', 1);
  o.data.scripted = true;
  o.pose = null;
  // she looks up from her stamp and over at the photo on the wall to her left …
  o.dir = 'left';
  o.lift = 90;
  yield 420;
  // … and しゅん turns round to her
  p.dir = p.tileX < o.tileX ? 'right' : p.tileX > o.tileX ? 'left' : 'up';
  yield 260;
  yield* msg(C.CAPE.obaa);
  const k = f.follower;
  if (gkWith() && k) {
    k.data.scripted = true;
    k.dir = dirFrom(k, o.tileX, o.tileY);
    k.hop(2, 140);
    yield* msg(C.CAPE.obaa_gk);
    delete k.data.scripted;
  }
  face('npc_obaa', 'player');
  o.lift = 60;
  delete o.data.scripted;
}

/** How far たかし draws himself up for the towel (px): his chest over the griddle counter. */
const CHEST_UP = 6;

const maruyamaBase = base('npc_maruyama');
registerScript('npc_maruyama', function* (ctx: ScriptCtx): Co {
  if (stage() === 2 && flag('flag_cape_obaa') && !flag('flag_cape_takashi') && flag('flag_seen_npc_maruyama_s2_2')) {
    setFlag('flag_cape_takashi', 1);
    const m = actor('npc_maruyama');
    if (m) {
      m.data.scripted = true;
      m.pose = null;
      face('npc_maruyama', 'player');
      m.dir = 'down';
    }
    yield* msg(C.CAPE.takashi);
    const oy0 = m?.oy ?? 0;
    if (m) {
      // he draws himself up behind the griddle, chest out (the counter hides him from
      // the chin down: so the towel shows over it) — his hand up to the towel round his
      // neck, then slapped flat on its end: ぱん
      yield* animate(160, (k) => (m.oy = Math.round(oy0 - CHEST_UP * k)), ease.quadOut);
      m.tempPose = 'towel';
      yield 320;
      m.tempPose = 'pat';
      m.hop(1, 120);
      sfx('se_hit_pashi', { vol: 0.45, pitch: 0.8 });
      yield 380;
    }
    yield* msg(C.CAPE.takashi_narr);
    if (m) {
      m.tempPose = null;
      yield* animate(220, (k) => (m.oy = Math.round(oy0 - CHEST_UP * (1 - k))), ease.sineInOut);
      m.oy = oy0;
      delete m.data.scripted;
    }
    return;
  }
  yield* maruyamaBase(ctx);
});

// ================================================================ 2 (chapter 1) the statue's spatula

registerScript('npc_cow_statue', function* (): Co {
  if (stage() >= 3) return;
  const t = stageKeys(NPC.npc_cow_statue);
  const key = pickTalk('npc_cow_statue', t);
  if (!key) return;
  const n = flag('flag_hera_look');
  setFlag('flag_hera_look', n + 1);
  yield* msg(n >= 1 ? `${t[key]}\n/\n${C.HERA}` : t[key]);
});

// ================================================================ 5 減らない コーヒー — 喫茶 夕顔

registerScript('npc_bu_body', function* (): Co {
  if (onMap('map_cafe')) yield* buCafe();
  else yield* buPark(true);
});

function* buCafe(): Co {
  const n = flag('flag_bu_talk');
  if (n === 0) {
    setFlag('flag_bu_talk', 1);
    yield* msg(C.BU.s2_1);
    return;
  }
  if (n === 1) {
    setFlag('flag_bu_talk', 2);
    yield* msg(C.BU.s2_2);
  } else yield* msg(C.BU.again);
  // (グソっ君 is always there at stage 2; without him the coffee just keeps coming)
  if (gkWith()) yield* coffeeScene();
}

/** The window seat: him at it, or the empty cup after he left. */
registerScript('obj_cf_booth', function* (ctx: ScriptCtx): Co {
  if (stage() !== 2) {
    yield* ctx.runDefault();
    return;
  }
  sfx('se_examine');
  yield* msg(flag('flag_bu_left') ? C.BU.booth_after : C.BU.booth);
});

/** なんばるわん comes in, グソっ君 drinks half, and she takes ぶーさん to the park. */
function* coffeeScene(): Co {
  const f = F();
  const p = f.player;
  const k = f.follower;
  const bu = actor('npc_bu_body');
  if (!k || !bu) return;
  const master = actor('npc_master');
  bu.data.scripted = true;
  k.data.scripted = true;
  p.path = [];
  p.moving = false;
  const P: [number, number] = [p.tileX, p.tileY];
  // ---- the shop bell: なんばるわん, in for her usual
  yield 250;
  sfx('se_door');
  sfx('se_shop_bell');
  const m = spawn('npc_madam', 6, 6, { dir: 'up', ghost: true });
  m.data.scripted = true;
  yield 200;
  bu.dir = 'left';
  if (master) master.dir = 'down';
  k.dir = dirFrom(k, 6, 6);
  const K0: [number, number] = [k.tileX, k.tileY];
  const mSpot = routeTo([6, 6], [[7, 4], [7, 5], [6, 4], [6, 5]], [P, K0]);
  if (mSpot) {
    go(m, mSpot.path, 2.4);
    yield* arrive(m);
  }
  m.dir = 'right';
  p.dir = dirFrom(p, m.tileX, m.tileY);
  yield 150;
  yield* msg(C.BU.madam_in);
  // ---- グソっ君: 「ほな、わいが 半分 飲んだろか。」
  k.dir = dirFrom(k, bu.tileX, bu.tileY);
  k.hop(2, 140);
  yield* msg(C.BU.gk_offer);
  // up to the cup (in the middle of the table, clear of the paper he holds up)
  const M: [number, number] = [m.tileX, m.tileY];
  const cup: { at: [number, number]; dir: Dir }[] = [
    { at: [8, 5], dir: 'up' },
    { at: [8, 3], dir: 'down' },
    { at: [9, 5], dir: 'up' },
    { at: [9, 3], dir: 'down' },
    { at: [10, 4], dir: 'left' },
  ];
  const kSpot = routeTo(
    [k.tileX, k.tileY],
    cup.map((c) => c.at),
    [P, M],
  );
  if (kSpot) {
    go(k, kSpot.path, 2.6);
    yield* arrive(k);
    k.dir = cup.find((c) => c.at[0] === kSpot.to[0] && c.at[1] === kSpot.to[1])?.dir ?? 'up';
  }
  bu.dir = dirFrom(bu, k.tileX, k.tileY);
  yield 200;
  // the cup in both hands, one sip
  k.tempPose = 'flip_hold';
  sfx('se_h_yunomi', { vol: 0.5, pitch: 1.2 });
  yield* msg(C.BU.gk_sip);
  k.tempPose = 'shock';
  k.hop(4, 200);
  sfx('se_emote', { pitch: 1.2 });
  k.showEmote('exclaim', 1000);
  yield 450;
  yield* msg(C.BU.gk_bitter);
  k.tempPose = null;
  setFlag('flag_bu_gk_sip', 1);
  // the coffee went down at last
  yield 200;
  yield* msg(C.BU.bu_laugh);
  // the paper down, the cup up (he faces the room, seated)
  bu.dir = 'down';
  yield 250;
  sfx('se_h_yunomi', { vol: 0.45 });
  yield 300;
  yield* msg(C.BU.bu_drink);
  bu.dir = dirFrom(bu, p.tileX, p.tileY);
  yield* msg(C.BU.bu_thanks);
  bu.dir = 'left';
  m.dir = 'right';
  yield* msg(C.BU.madam_go);
  if (master) master.dir = dirFrom(master, bu.tileX, bu.tileY);
  yield* msg(C.BU.master_bye);
  // ---- up from the chair (his case in his hand), and out after her
  bu.pose = null;
  bu.tempPose = null;
  bu.ox = 0;
  bu.oy = 0;
  sfx('se_step_wood', { vol: 0.5 });
  yield 300;
  const Kn: [number, number] = [k.tileX, k.tileY];
  const busy: [number, number][] = [P, Kn];
  const mOut = routeTo([m.tileX, m.tileY], [[6, 6]], busy);
  const bOut = routeTo([bu.tileX, bu.tileY], [[6, 6]], busy);
  if (mOut) go(m, mOut.path, 2.2);
  yield 700;
  if (bOut) go(bu, bOut.path, 2.2);
  if (bOut) yield* arrive(m, bu);
  else yield* arrive(m);
  // through the door (its cell) and gone
  go(m, [[6, 7]], 2.2);
  yield* arrive(m);
  sfx('se_door');
  sfx('se_shop_bell', { vol: 0.8 });
  despawn('npc_madam');
  go(bu, [[6, 7]], 2.2);
  yield* arrive(bu);
  despawn('npc_bu_body');
  setFlag('flag_bu_left', 1);
  yield 300;
  if (master) master.dir = 'down';
  delete k.data.scripted;
}

// かずゆき: a word at stage 2 before the scene and one after (the tankan hand-over still goes first)
const masterBase = base('npc_master');
registerScript('npc_master', function* (ctx: ScriptCtx): Co {
  const tankanDue =
    (flag('flag_tankan_heard') && !flag('flag_got_tankan')) || (!flag('flag_tankan_heard') && flag('flag_seen_tankan_label') && !flag('flag_master_not_yet'));
  if (stage() === 2 && !tankanDue) {
    if (!flag('flag_bu_left') && once('flag_master_bu_before')) {
      yield* msg(C.MASTER_BU.before);
      return;
    }
    if (flag('flag_bu_left') && once('flag_master_bu_after')) {
      yield* msg(C.MASTER_BU.after);
      return;
    }
  }
  yield* masterBase(ctx);
});

// ================================================================ 5 — the park, and なんばるわん on the slope

/** The first talk to either of them after the café: the body and his shadow meet. */
function* parkMeet(): Co {
  setFlag('flag_bu_met', 1);
  const bu = actor('npc_bu_body');
  const sh = actor('npc_shadow_man');
  if (bu) bu.data.scripted = true;
  if (sh) sh.data.scripted = true;
  yield* msg(C.BU_PARK.meet);
  const k = F().follower;
  if (gkWith() && k) {
    k.data.scripted = true;
    k.tempPose = 'flip_hold';
    yield* msg(C.BU_PARK.meet_gk);
    k.tempPose = null;
    delete k.data.scripted;
  }
  yield* msg(C.BU_PARK.meet_end);
  if (bu) delete bu.data.scripted;
  if (sh) delete sh.data.scripted;
}

function* buPark(body: boolean): Co {
  if (!flag('flag_bu_met')) {
    yield* parkMeet();
    return;
  }
  if (body) {
    yield* msg(once('flag_bu_park_1') ? C.BU_PARK.park_1 : C.BU_PARK.park_2);
    return;
  }
  // the shadow: what it hadn't told yet (the mall, the lost-and-found), then its new line
  const t = NPC.npc_shadow_man;
  for (const key of ['s2_2', 's2_3'] as const) {
    if (!flag(`flag_seen_npc_shadow_man_${key}`)) {
      setFlag(`flag_seen_npc_shadow_man_${key}`, 1);
      yield* msg(t[key].replace('@npc_shadow_man', '@npc_bu_shadow'));
      return;
    }
  }
  yield* msg(C.BU_PARK.shadow_after);
}

const shadowBase = base('npc_shadow_man');
registerScript('npc_shadow_man', function* (ctx: ScriptCtx): Co {
  if (stage() === 2 && flag('flag_bu_left') && onMap('map_town')) {
    yield* buPark(false);
    return;
  }
  yield* shadowBase(ctx);
});

const madamBase = base('npc_madam');
registerScript('npc_madam', function* (ctx: ScriptCtx): Co {
  if (!(stage() === 2 && flag('flag_bu_left') && onMap('map_town'))) {
    yield* madamBase(ctx);
    return;
  }
  // (both stop while either is spoken to, as events/npcs.ts pairTalk)
  const kt = actor('npc_kotaro');
  if (kt) kt.data.scripted = true;
  try {
    if (once('flag_madam_bu')) {
      yield* msg(C.MADAM_BU);
      return;
    }
    const t: Record<string, string> = { ...stageKeys(NPC.npc_madam), s2_2: C.MADAM_S2_2_AFTER };
    const key = pickTalk('npc_madam', t);
    if (key) yield* msg(t[key]);
  } finally {
    if (kt) delete kt.data.scripted;
  }
});

// ================================================================ 5 — chapter 2: タケじい's roaster

registerScript('obj_hr_mk3_baisen', function* (): Co {
  sfx('se_examine');
  yield* msg(R2_OBJ.obj_hr_mk3_baisen as string);
  if (flag('flag_bu_gk_sip') && gkWith() && once('flag_baisen_gk')) {
    const k = F().follower;
    if (k) {
      k.data.scripted = true;
      k.hop(3, 160);
      k.showEmote('light', 900);
      sfx('se_emote_light', { vol: 0.7 });
      yield 500;
    }
    yield* msg(C.BAISEN_GK);
    if (k) delete k.data.scripted;
  }
});

// ================================================================ QA

const FLAGS = [
  'flag_cape_obaa',
  'flag_cape_takashi',
  'flag_hera_look',
  'flag_bu_talk',
  'flag_bu_gk_sip',
  'flag_bu_left',
  'flag_bu_met',
  'flag_bu_park_1',
  'flag_master_bu_before',
  'flag_master_bu_after',
  'flag_madam_bu',
  'flag_baisen_gk',
];

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

registerDebug('cape', (step?: string) => {
  const c = cmd();
  const reset = () => {
    for (const id of FLAGS) setFlag(id, 0);
  };
  switch (step) {
    case 'reset':
      reset();
      return 'reset';
    case 'photo':
      c.jump('stage2');
      reset();
      return c.warp('map_hinoya', 2, 4, 'up');
    case 'takashi':
      c.jump('stage2');
      reset();
      setFlag('flag_cape_obaa', 1);
      setFlag('flag_seen_npc_maruyama_s2_1', 1);
      setFlag('flag_seen_npc_maruyama_s2_2', 1);
      setFlag('flag_seen_npc_maruyama_s2', 2);
      return c.warp('map_maruyama', 4, 5, 'up');
    case 'statue':
      c.jump('stage2');
      reset();
      return c.warp('map_town', 26, 23, 'up');
    case 'cafe':
      c.jump('stage2');
      reset();
      return c.warp('map_cafe', 9, 5, 'up');
    case 'park':
      c.jump('stage2');
      reset();
      setFlag('flag_bu_gk_sip', 1);
      setFlag('flag_bu_left', 1);
      return c.warp('map_town', 7, 7, 'up');
    case 'baisen': {
      // (the chapter-2 jump starts without chapter 1's flags: グソっ君 joins for the look)
      const r = c.r2('minka3', 1);
      setFlag('flag_bu_gk_sip', 1);
      setFlag('flag_baisen_gk', 0);
      c.join();
      return r;
    }
    default:
      return ['reset', 'photo', 'takashi', 'statue', 'cafe', 'park', 'baisen', ...FLAGS.map((id) => `${id}=${flag(id)}`)];
  }
});

/** Every page of the new texts: ≤ 3 lines, ≤ 336 px a line (10 1.1). */
export function capeTextCheck(): { total: number; bad: string[] } {
  const bad: string[] = [];
  let total = 0;
  const walk = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      for (const page of v.split(/\n\/\n|\n@[^\n]*\n/)) {
        const lines = page.split('\n').filter((l) => l.trim() && !/^[@!>?]/.test(l.trim()));
        if (!lines.length) continue;
        total++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines: ${lines.join('／')}`);
        for (const l of lines) {
          const w = measure(l.replace(/\{[^}]*\}/g, ''));
          if (w > 336) bad.push(`${name}: ${w}px: ${l}`);
        }
      }
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walk(`${name}.${k}`, x);
  };
  walk('cape_coffee', C.CAPE_COFFEE_TEXTS);
  walk('baisen', R2_OBJ.obj_hr_mk3_baisen);
  return { total, bad };
}
registerDebug('capeText', () => capeTextCheck());
