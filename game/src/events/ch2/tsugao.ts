// ツガオ便 at the turning circle (50_ch2_story 3.14〜3.16) and 野菜を一緒に家に
// 運ぼう (evt_ch2_delivery, 10.20; 52 3.4〜3.6・13.1; 53 12.17):
//   npc_tsugao    — ツガオさん asleep in the olive truck's driver's seat (an
//                   examinable at (42,42): his picture is the truck's)
//   npc_hirosuke  — 「焼き芋 食うか？」
//   npc_pokosha   — shy and strong; ぴーちゃん on his shoulder
//   evt_ch2_delivery — (optional, stage 1) five parcels of last night's
//                   おすそわけ to the houses, ポコシャさん third in the line
// The words are the design book's (data/text/hoshi_tsugao); the `!cue` lines
// in them are the book's stage directions, staged here.
//
// The count of parcels is never saved (10.20): the delivery belongs to the
// state it was started in — a load (a new state.flags object) starts it over.
// flag_ch2_tsugao_awake is 1 while ツガオさん has his work cap on (cap_swap)
// for the truck's picture.

import type { Co } from '../../engine/co';
import { W, H } from '../../engine/screen';
import { flag, setFlag, state } from '../../game/state';
import { face, registerScript, spawn } from '../../world/api';
import type { Actor } from '../../world/actor';
import { field, type FieldScene } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { runMsg, SPEAKERS } from '../../world/msg';
import { completeChoreCard, hideChoreCard, setChoreCount, showChoreCard } from '../../ui/hud';
import { DELI_TEXT, TSUGAO_NPC, TSUGAO_OBJ } from '../../data/text/hoshi_tsugao';
import { F, sendAway, stepBack } from '../lib';
import { quietItem } from '../stage';
import { sparkle } from '../fx';
import { hasUi, musicParam, se, seAt, ui, uiCo } from './compat';
import { hStage, npc, pickHText, poseIf, routeTiles, runCue, unpose, type Cues } from './common';

// ---------------------------------------------------------------- name tags

const TSUGAO_SPEAKERS: Record<string, { name: string; voice: string }> = {
  npc_tsugao: { name: 'ツガオさん', voice: 'tsugao' },
  npc_hirosuke: { name: 'ヒロスケさん', voice: 'hirosuke' },
  npc_pokosha: { name: 'ポコシャさん', voice: 'pokosha' },
  npc_piichan: { name: 'ぴーちゃん', voice: 'piichan' },
};
for (const [id, s] of Object.entries(TSUGAO_SPEAKERS)) SPEAKERS[id] = { ...s };

const N = TSUGAO_NPC;
const D = DELI_TEXT;

/** The five parcels in the slips' order (10.20): the stand (52 3.5) and the HUD's 「つぎ」. */
const STOPS: { spot: string; next: string; at: [number, number] | null }[] = [
  { spot: 'spot_h_deli_01', next: 'タケじい', at: [43, 36] },
  { spot: 'spot_h_deli_02', next: 'エー区長', at: [37, 36] },
  { spot: 'spot_h_deli_03', next: 'スギばあ', at: [42, 26] },
  { spot: 'spot_h_deli_04', next: '集会所', at: null },
  { spot: 'spot_h_deli_05', next: 'トマじい', at: [17, 31] },
];
/** Where ポコシャさん stands at the truck (52 3.4). */
const POKO_HOME: [number, number] = [45, 42];

export function deliveryOn(): boolean {
  return flag('flag_ch2_delivery_on') > 0;
}

/** The delivery can be offered: stage 1 (the tomato, テツヤ still out), not done yet. */
function deliveryOpen(): boolean {
  return hStage() === 1 && flag('flag_ch2_got_tomato') > 0 && !flag('flag_ch2_tetsuya_beaten') && !flag('flag_ch2_delivery') && !deliveryOn();
}

function doneStops(): number {
  return STOPS.filter((s) => flag('flag_' + s.spot) > 0).length;
}

/** The first block of `speaker`'s pages in a msg text (a line said again elsewhere). */
function blockOf(src: string, speaker: string): string | null {
  const m = new RegExp(`@${speaker}\\n(?:(?![@!]).*\\n?)+`).exec(src);
  return m ? m[0].trimEnd() : null;
}

// ---------------------------------------------------------------- the HUD's おとどけの札 (52 13.1)

/**
 * The UI's strip 「おとどけ n/5」「つぎ：…」 (ui/chore_card.ts); should it be
 * missing, the chores' one-line strip with one job stands in.
 */
function cardShow(): void {
  if (hasUi('showDeliveryCard')) ui('showDeliveryCard', { total: STOPS.length, next: STOPS[0].next });
  else showChoreCard([{ label: 'おとどけ', total: STOPS.length }]);
}
function cardSet(n: number): void {
  if (hasUi('setDeliveryCount')) ui('setDeliveryCount', n, STOPS[n]?.next ?? '');
  else setChoreCount(0, n);
}
function* cardDone(): Co {
  if (yield* uiCo('completeDeliveryCard')) return;
  yield* completeChoreCard();
}
function cardHide(ms = 300): void {
  if (hasUi('hideDeliveryCard')) ui('hideDeliveryCard', ms);
  else hideChoreCard(ms);
}

// ---------------------------------------------------------------- ポコシャさん in the line (third, behind カネナリくん)

const POKO = 'deli_pokosha';
/** The leader's footsteps, newest last (world px). */
let steps: [number, number, string][] = [];
/** The state the delivery was started in (a load or a new game replaces state.flags). */
let runFlags: object | null = null;
/** Out of the line for a scene (〔しめ〕: the crate back on the truck). */
let parked = false;

function pokoActor(f: FieldScene): Actor | null {
  return f.actorById(POKO) ?? null;
}

function spawnPoko(f: FieldScene, x: number, y: number): Actor {
  const a = spawn(POKO, Math.floor(x / 16), Math.floor((y - 1) / 16), { sprite: 'npc_pokosha', dir: f.player.dir, ghost: true });
  a.x = x;
  a.y = y;
  a.data.scripted = true;
  a.solid = false;
  poseIf(a, 'carry');
  steps = [];
  return a;
}

registerWorldFx({
  map: '',
  update(f: FieldScene, dt: number) {
    if (!deliveryOn()) {
      const a = pokoActor(f);
      if (a) f.removeActor(a);
      return;
    }
    // a load in the middle of it (the page was hidden and saved, or a save was loaded): it starts over
    if (state.flags !== runFlags) {
      resetDelivery(false);
      return;
    }
    if (!f.map.id.startsWith('map_hoshi') || parked) return;
    const k = f.follower;
    let a = pokoActor(f);
    if (!a) a = spawnPoko(f, k?.x ?? f.player.x, (k?.y ?? f.player.y) + 2);
    if (a.path.length) return;
    const lead = k && k.visible ? k : f.player;
    const last = steps[steps.length - 1];
    if (!last || Math.hypot(lead.x - last[0], lead.y - last[1]) >= 1) steps.push([lead.x, lead.y, lead.dir]);
    if (steps.length > 120) steps.splice(0, steps.length - 120);
    // stand one tile (16px of the path) behind the leader
    let acc = 0;
    let target: [number, number, string] | null = null;
    for (let i = steps.length - 1; i > 0; i--) {
      acc += Math.hypot(steps[i][0] - steps[i - 1][0], steps[i][1] - steps[i - 1][1]);
      if (acc >= 16) {
        target = steps[i - 1];
        break;
      }
    }
    if (!target) {
      a.moving = false;
      return;
    }
    const d = Math.hypot(target[0] - a.x, target[1] - a.y);
    if (d > 40) {
      // far off (a door, a teleport): straight to his place
      a.x = target[0];
      a.y = target[1];
    } else if (d > 0.3) {
      const s = Math.min(d, (110 * dt) / 1000);
      a.dir = Math.abs(target[0] - a.x) > Math.abs(target[1] - a.y) ? (target[0] < a.x ? 'left' : 'right') : target[1] < a.y ? 'up' : 'down';
      a.x += ((target[0] - a.x) / d) * s;
      a.y += ((target[1] - a.y) / d) * s;
      a.moving = true;
      return;
    }
    a.moving = false;
  },
});

/**
 * Everything back as before the delivery (the count is not saved). `walkHome`:
 * ポコシャさん leaves the line and walks back to the truck (at once when the
 * truck is off the screen, 10.20 〔やめる〕).
 */
export function resetDelivery(walkHome = true): void {
  setFlag('flag_ch2_delivery_on', 0);
  for (const s of STOPS) setFlag('flag_' + s.spot, 0);
  musicParam('h_deli', 0);
  cardHide();
  runFlags = null;
  steps = [];
  parked = false;
  const f = field();
  if (!f) return;
  const a = pokoActor(f);
  const [hx, hy] = POKO_HOME;
  const homeOnScreen =
    f.map.id === 'map_hoshimidai' && Math.abs(hx * 16 + 8 - (f.camX + W / 2)) < W / 2 + 16 && Math.abs(hy * 16 + 8 - (f.camY + H / 2)) < H / 2 + 24;
  const route = a && walkHome && homeOnScreen ? routeTiles(a.tileX, a.tileY, hx, hy) : null;
  const from = a ? [a.x, a.y, a.dir] as const : null;
  if (a) f.removeActor(a);
  if (f.map.id !== 'map_hoshimidai') return;
  // the map's own ポコシャさん comes back at the truck; in sight, he walks there from the line
  f.refreshPresence();
  const own = npc('npc_pokosha');
  if (own && from && route && route.length) {
    own.x = from[0];
    own.y = from[1];
    own.dir = from[2];
    poseIf(own, 'carry');
    sendAway(own, route, 2.2, 0, false);
  }
}

// ---------------------------------------------------------------- the staging of the book's directions

/** ヒロスケさん waves, ポコシャさん hides, ツガオさん swaps caps …: the `!cue` lines of the words. */
function* stage(name: string): Co {
  const hiro = npc('npc_hirosuke');
  const f = field();
  const poko = npc('npc_pokosha') ?? (f ? pokoActor(f) : null);
  const k = f?.follower ?? null;
  switch (name) {
    case 'hide':
      if (poko) poseIf(poko, 'hide');
      yield 300;
      return;
    case 'blush':
      if (poko) poseIf(poko, 'blush');
      yield 400;
      return;
    case 'shh':
      // he looks at the three asleep on the cushions, a finger on his lips
      if (poko) {
        poko.dir = 'up';
        poseIf(poko, 'shh');
      }
      yield 600;
      if (poko) poseIf(poko, 'carry');
      return;
    case 'laugh':
      if (hiro) {
        poseIf(hiro, 'laugh');
        hiro.hop(1, 140);
      }
      yield 400;
      return;
    case 'wave':
      if (hiro) poseIf(hiro, 'wave');
      yield 300;
      return;
    case 'knock':
      // ヒロスケさん knocks on the driver's window (no sound: his voice wakes him)
      if (hiro) {
        hiro.dir = 'left';
        poseIf(hiro, 'knock');
      }
      yield 500;
      if (hiro) unpose(hiro);
      return;
    case 'flap':
      se('se_piichan_flap');
      if (poko) sparkle(poko.x - 5, poko.y - 22, 300);
      yield 400;
      return;
    case 'give':
      // the slips through the window; カネナリくん puts them behind a flip
      se('se_page', { vol: 0.4 });
      if (k) poseIf(k, 'hold');
      yield 600;
      if (k) unpose(k);
      return;
    case 'aori':
      se('se_truck_aori');
      yield 300;
      return;
    case 'cap_swap':
    case 'cap_back':
      // the nightcap for the work cap (and back again)
      setFlag('flag_ch2_tsugao_awake', name === 'cap_swap' ? 1 : 0);
      yield 300;
      return;
    case 'yakiimo':
      if (hiro) poseIf(hiro, 'yakiimo');
      se('se_yakiimo');
      yield 400;
      se('se_item');
      return;
    case 'put_down':
      yield* putDown();
      return;
  }
}

/** Every direction staged by stage(); `own` ones of a scene first. */
function cuesWith(own: Cues = {}): Cues {
  return new Proxy({} as Cues, { get: (_t, name: string) => own[name] ?? (() => stage(name)) });
}
const cues = cuesWith();

function seen(id: string, key: string): boolean {
  return flag(`flag_seen_${id}_${key}`) > 0;
}

// ---------------------------------------------------------------- the invitation (〔誘い〕)

/** 〔誘い〕 (and 〔誘い・2回目〕 after 「またこんど」): true when he said 「手伝う」. */
function* invite(): Co<boolean> {
  if (flag('flag_ch2_deli_declined')) {
    const i = yield* runCue(D['誘い・2回目'], cues);
    // 「またこんど」: no page; ツガオさん goes back to sleep
    if (i !== 0) return false;
  } else {
    yield* runCue(D['誘い'], cues);
    if (!seen('npc_hirosuke', 'h0_1')) {
      setFlag('flag_seen_npc_hirosuke_h0_1', 1);
      yield* runCue(D['ヒロスケさんに まだ 会っていない'], cues);
    }
    if (!seen('npc_pokosha', 'h0_1')) {
      setFlag('flag_seen_npc_pokosha_h0_1', 1);
      yield* stage('hide');
      yield* runCue(D['ポコシャさんに まだ 会っていない'], cues);
      const pk = npc('npc_pokosha');
      if (pk) unpose(pk);
    }
    yield* runCue(D['共通1'], cues);
    if (!seen('npc_tsugao', 'h0_1')) {
      setFlag('flag_seen_npc_tsugao_h0_1', 1);
      yield* runCue(D['ツガオさんに まだ 会っていない'], cues);
    }
    const i = yield* runCue(D['共通2'], cues);
    if (i !== 0) {
      setFlag('flag_ch2_deli_declined', 1);
      yield* runCue(D['共通2/またこんど'], cues);
      return false;
    }
  }
  yield* runCue(D['共通2/手伝う'], cues);
  // the yellow crate on ポコシャさん's right shoulder: he falls in third; ヒロスケさん waves them off
  const f = F();
  const own = npc('npc_pokosha');
  const k = f.follower;
  runFlags = state.flags;
  parked = false;
  setFlag('flag_ch2_delivery_on', 1);
  for (const s of STOPS) setFlag('flag_' + s.spot, 0);
  spawnPoko(f, own?.x ?? k?.x ?? f.player.x, own?.y ?? k?.y ?? f.player.y);
  // (the map's own ポコシャさん is not at the truck while he walks with them)
  f.refreshPresence();
  const hiro = npc('npc_hirosuke');
  if (hiro) poseIf(hiro, 'wave');
  cardShow();
  musicParam('h_deli', 1);
  return true;
}

// ---------------------------------------------------------------- the stops

/** ポコシャさん hands him the bag; he sets it on the stand (put_down 0.6 s). */
function* putDown(): Co {
  const f = F();
  const p = f.player;
  const a = pokoActor(f);
  if (a) {
    a.dir = a.x < p.x ? 'right' : a.x > p.x ? 'left' : a.y < p.y ? 'down' : 'up';
    poseIf(a, 'give');
  }
  yield 300;
  if (a) poseIf(a, 'carry');
  poseIf(p, 'put_down');
  const at = STOPS[doneStops()]?.at;
  if (at) seAt('se_h_deli_put', at[0] * 16 + 8, at[1] * 16 + 8);
  else se('se_h_deli_put');
  yield 600;
  unpose(p);
}

/** The parcel is down: its flag and the strip's number (with the fifth, 「済」). */
function* counted(n: number): Co {
  if (flag('flag_' + STOPS[n].spot)) return;
  setFlag('flag_' + STOPS[n].spot, 1);
  cardSet(doneStops());
  if (doneStops() >= STOPS.length) yield* cardDone();
}

function* deliver(n: number): Co {
  const text = D[`おとどけ ${n + 1}`];
  if (!text) return;
  // (the first stand has a page before the bag goes down; エー夫人 takes hers herself)
  if (!text.includes('!cue put_down') && n !== 3) yield* putDown();
  let countedYet = false;
  yield* runCue(
    text,
    cuesWith({
      *hide() {
        // エー夫人 has taken the cucumbers: the strip counts them as he bows
        if (n === 3 && !countedYet) {
          countedYet = true;
          yield* counted(n);
        }
        yield* stage('hide');
      },
      *done() {
        countedYet = true;
        yield* counted(n);
      },
    }),
  );
  if (!countedYet) yield* counted(n);
}

for (const [i, s] of STOPS.entries()) {
  if (i === 3) continue;
  registerScript(s.spot, function* (): Co {
    if (!deliveryOn()) return;
    if (doneStops() !== i) {
      yield* runCue(D['順番のちがう置き台'], cues);
      return;
    }
    yield* deliver(i);
  });
}

/** エー夫人 while the delivery waits at the gathering room (4つ目): she takes the cucumbers herself (no tea). */
export function* deliveryAtYoshie(): Co<boolean> {
  if (!deliveryOn() || doneStops() !== 3) return false;
  yield* deliver(3);
  return true;
}

/** The step before the delivery's range ends (沢の橋, 東の坂道, 用水路の石段の橋): stop? */
registerScript('trig_ch2_deli_edge', function* (): Co {
  if (!deliveryOn()) return;
  const i = yield* runMsg(D['やめますか']);
  if (i !== 0) {
    stepBack();
    F().syncFollower(true);
    return;
  }
  yield* runCue(D['やめますか/やめる'], cues);
  resetDelivery(true);
  // the east edge is the foot of the slope to the barn: マサルさん stops him there (10.8)
  const f = F();
  const x = f.player.tileX;
  const y = f.player.tileY;
  if (f.map.id === 'map_hoshimidai' && x >= 46 && x <= 49 && y >= 36 && y <= 39 && flag('flag_ch2_got_tomato') && !flag('flag_ch2_met_gen')) {
    const { evtGenStop } = (yield import('./barn')) as typeof import('./barn');
    yield* evtGenStop();
  }
});

/** 〔しめ〕 back at the truck with all five delivered. */
registerScript('trig_ch2_deli_return', function* (): Co {
  if (!deliveryOn() || doneStops() < STOPS.length) return;
  const f = F();
  const p = f.player;
  const hiro = npc('npc_hirosuke');
  if (hiro) {
    p.dir = Math.abs(hiro.x - p.x) > Math.abs(hiro.y - p.y) ? (hiro.x > p.x ? 'right' : 'left') : hiro.y > p.y ? 'down' : 'up';
    face('npc_hirosuke', 'player');
  }
  const a = pokoActor(f);
  if (a) {
    // out of the line, the empty crate back on the truck
    parked = true;
    const route = routeTiles(a.tileX, a.tileY, POKO_HOME[0], POKO_HOME[1]);
    if (route && route.length) {
      a.pathSpeed = 2.4 * 16;
      a.path = route.map(([x, y]) => [x * 16 + 8, y * 16 + 16] as [number, number]);
      const t0 = f.t;
      yield () => !a.path.length || f.t - t0 > 4000;
      a.moving = false;
    }
    a.dir = 'left';
    se('se_truck_aori');
    yield 300;
  }
  let got = 0;
  yield* runCue(
    D['しめ'].replace(/(@sys\n焼き芋を 2つ もらった！)/, '!cue yakiimo_get\n$1'),
    cuesWith({
      *yakiimo_get() {
        for (let i = 0; i < 2; i++) if (yield* quietItem('item_yakiimo')) got++;
      },
    }),
  );
  if (got < 2) {
    // a full bag: the rest when he next talks to ヒロスケさん (10 4.4)
    setFlag('flag_ch2_yakiimo_owed', 2 - got);
    yield* runMsg(`@narr\nもちものが いっぱいだ。`);
  }
  setFlag('flag_ch2_delivery', 1);
  setFlag('flag_ch2_piichan_feather', 1);
  setFlag('flag_ch2_delivery_on', 0);
  musicParam('h_deli', 0);
  cardHide(300);
  runFlags = null;
  parked = false;
  // the three back in their places (52 3.4)
  if (a) f.removeActor(a);
  f.refreshPresence();
  const h2 = npc('npc_hirosuke');
  if (h2) unpose(h2);
});

/** 焼き芋 he couldn't carry after the delivery: given the next time he talks to ヒロスケさん. */
function* owedYakiimo(): Co<boolean> {
  const owed = flag('flag_ch2_yakiimo_owed');
  if (owed <= 0) return false;
  let got = 0;
  for (let i = 0; i < owed; i++) if (yield* quietItem('item_yakiimo')) got++;
  if (!got) {
    yield* runMsg(`@narr\nもちものが いっぱいだ。`);
    return true;
  }
  setFlag('flag_ch2_yakiimo_owed', owed - got);
  yield* stage('yakiimo');
  yield* runMsg(`@sys\n焼き芋を ${got === 2 ? '2つ ' : ''}もらった！`);
  return true;
}

// ---------------------------------------------------------------- the three of ツガオ便

/** ツガオさん through the window (the examinable at (42,42)). */
registerScript('npc_tsugao', function* (): Co {
  const s = hStage();
  if (s >= 3) return;
  if (deliveryOpen()) {
    yield* invite();
    return;
  }
  if (s === 1 && flag('flag_ch2_delivery') && !seen('npc_tsugao', 'h1_2')) {
    setFlag('flag_seen_npc_tsugao_h1_2', 1);
    yield* runCue(N.npc_tsugao.h1_2, cues);
    return;
  }
  if (s === 2 && !seen('npc_tsugao', 'h2_1')) {
    setFlag('flag_seen_npc_tsugao_h2_1', 1);
    // one eye open only
    yield* runCue(N.npc_tsugao.h2_1, cues);
    return;
  }
  if (!seen('npc_tsugao', 'h0_1')) {
    setFlag('flag_seen_npc_tsugao_h0_1', 1);
    // one eye open; the nightcap swapped for the work cap — and back to sleep
    yield* stage('cap_swap');
    yield* runCue(N.npc_tsugao.h0_1, cues);
    setFlag('flag_ch2_tsugao_awake', 0);
    return;
  }
  yield* runCue(N.npc_tsugao.h0_2, cues);
});

registerScript('npc_hirosuke', function* (): Co {
  const t = N.npc_hirosuke;
  const s = hStage();
  if (yield* owedYakiimo()) return;
  if (deliveryOn()) {
    // on the way: he sees them off again (his line when the crate went on ポコシャさん's shoulder)
    yield* stage('wave');
    yield* runCue(blockOf(D['共通2/手伝う'], 'npc_hirosuke') ?? t.h0_2, cues);
    return;
  }
  if (deliveryOpen()) {
    yield* invite();
    return;
  }
  if (s >= 2) {
    yield* runCue(t.h2_1, cues);
    if (!flag('flag_ch2_delivery') && t.h2_1_after) yield* runCue(t.h2_1_after, cues);
    return;
  }
  if (s === 1 && flag('flag_ch2_delivery')) {
    yield* runCue(t.h1_2, cues);
    return;
  }
  if (!seen('npc_hirosuke', 'h0_1')) {
    setFlag('flag_seen_npc_hirosuke_h0_1', 1);
    yield* stage('wave');
    yield* runCue(t.h0_1, cues);
    return;
  }
  yield* runCue(t.h0_2, cues);
  const pk = npc('npc_pokosha');
  if (pk) unpose(pk);
});

registerScript('npc_pokosha', function* (): Co {
  const t = N.npc_pokosha;
  const s = hStage();
  if (deliveryOn()) return;
  if (deliveryOpen()) {
    yield* invite();
    return;
  }
  if (s >= 2) {
    yield* runCue(t.h2_1, cues);
    return;
  }
  if (s === 1 && flag('flag_ch2_delivery')) {
    yield* runCue(t.h1_2, cues);
    return;
  }
  if (!seen('npc_pokosha', 'h0_1')) {
    setFlag('flag_seen_npc_pokosha_h0_1', 1);
    yield* stage('hide');
    yield* runCue(t.h0_1, cues);
    const a = npc('npc_pokosha');
    if (a) unpose(a);
    return;
  }
  yield* runCue(t.h0_2, cues);
});

// ---------------------------------------------------------------- the truck and the bike (9.2)

function objText(id: string): string | undefined {
  const v = TSUGAO_OBJ[id];
  return typeof v === 'string' ? v : pickHText(v);
}

registerScript('obj_hoshi_tsugao_truck', function* (): Co {
  se('se_examine');
  const t = objText('obj_hoshi_tsugao_truck');
  if (t) yield* runMsg(t);
  if (deliveryOpen()) yield* invite();
});
registerScript('obj_hoshi_pokosha_bike', function* (): Co {
  se('se_examine');
  const t = objText('obj_hoshi_pokosha_bike');
  if (t) yield* runMsg(t);
});

// ---------------------------------------------------------------- QA

/** QA: four of the five delivered (the fifth, トマじい's, is next). */
export function debugDeliveryAlmost(): void {
  runFlags = state.flags;
  parked = false;
  setFlag('flag_ch2_delivery_on', 1);
  for (const s of STOPS.slice(0, 4)) setFlag('flag_' + s.spot, 1);
  cardShow();
  cardSet(4);
  musicParam('h_deli', 1);
  field()?.refreshPresence();
}
