// ツガオ便 at the turning circle (50_ch2_story 3.14〜3.16) and 野菜を一緒に家に
// 運ぼう (evt_ch2_delivery, 10.20; 52 3.4〜3.6・13.1; 53 12.17):
//   npc_tsugao    — ツガオさん asleep in the olive truck's driver's seat (an
//                   examinable at (42,42): his picture is the truck's)
//   npc_hirosuke  — 「焼き芋 食うか？」
//   npc_pokosha   — shy and strong; ぴーちゃん on his shoulder
//   evt_ch2_delivery — (optional, stage 1) five parcels of last night's
//                   おすそわけ to the houses, ポコシャさん third in the line
// The words are generated from the design book (data/text/hoshi_tsugao).

import type { Co } from '../../engine/co';
import { game } from '../../engine/game';
import { flag, setFlag, state } from '../../game/state';
import { addItem } from '../../game/state';
import { despawn, registerScript, spawn } from '../../world/api';
import type { Actor } from '../../world/actor';
import { field, type FieldScene } from '../../world/field';
import { registerWorldFx } from '../../world/fx';
import { runMsg } from '../../world/msg';
import { SPEAKERS } from '../../world/msg';
import { completeChoreCard, hideChoreCard, setChoreCount, showChoreCard } from '../../ui/hud';
import { DELI_TEXT, TSUGAO_NPC, TSUGAO_OBJ } from '../../data/text/hoshi_tsugao';
import { F, stepBack } from '../lib';
import { quietItem } from '../stage';
import { sparkle } from '../fx';
import { hasUi, musicParam, se, ui, uiCo } from './compat';
import { hStage, npc, pickHText, poseIf, runCue, unpose, type Cues } from './common';

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

/** The five parcels, in the slips' order (10.20): the stand's spot and the HUD's 「つぎ」. */
const STOPS: { spot: string; next: string }[] = [
  { spot: 'spot_h_deli_01', next: 'タケじい' },
  { spot: 'spot_h_deli_02', next: 'エー区長' },
  { spot: 'spot_h_deli_03', next: 'スギばあ' },
  { spot: 'spot_h_deli_04', next: '集会所' },
  { spot: 'spot_h_deli_05', next: 'トマじい' },
];

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

// ---------------------------------------------------------------- the HUD's おとどけ strip (52 13.1)

/** The UI's own strip when it has one (「おとどけ n/5」「つぎ：…」), else the chores' strip with one job. */
function cardShow(): void {
  if (hasUi('showDeliveryCard')) ui('showDeliveryCard', { total: STOPS.length, next: STOPS[0].next });
  else showChoreCard([{ label: 'おとどけ', total: STOPS.length }]);
}
function cardSet(n: number): void {
  const next = STOPS[n]?.next ?? '';
  if (hasUi('setDeliveryCount')) ui('setDeliveryCount', n, next);
  else setChoreCount(0, n);
}
function* cardDone(): Co {
  if (hasUi('completeDeliveryCard')) {
    yield* uiCo('completeDeliveryCard');
    return;
  }
  yield* completeChoreCard();
}
function cardHide(): void {
  if (hasUi('hideDeliveryCard')) ui('hideDeliveryCard');
  else hideChoreCard(300);
}

// ---------------------------------------------------------------- ポコシャさん in the line (third, behind カネナリくん)

const POKO = 'deli_pokosha';
/** The follower's footsteps, newest last (world px). */
let steps: [number, number, string][] = [];
/** The delivery runs in this session (a load in the middle of it starts over). */
let running = false;

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
    // loaded in the middle of it (the page was hidden and saved): it starts over
    if (!running) {
      resetDelivery();
      return;
    }
    if (!f.map.id.startsWith('map_hoshi')) return;
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

/** Everything back as before the delivery (not saved: a load starts over). */
export function resetDelivery(): void {
  setFlag('flag_ch2_delivery_on', 0);
  for (const s of STOPS) setFlag('flag_' + s.spot, 0);
  musicParam('h_deli', 0);
  cardHide();
  running = false;
  steps = [];
  const f = field();
  if (f) despawn(POKO);
}

// ---------------------------------------------------------------- the invitation (〔誘い〕)

/** ヒロスケさん waves, ポコシャさん hides, ツガオさん swaps caps: the staging of the delivery's words. */
function* stage(name: string): Co {
  const hiro = npc('npc_hirosuke');
  const poko = npc('npc_pokosha') ?? field()?.actorById(POKO) ?? null;
  const k = field()?.follower ?? null;
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
      if (poko) poseIf(poko, 'shh');
      yield 500;
      return;
    case 'wave':
      if (hiro) poseIf(hiro, 'wave');
      yield 300;
      return;
    case 'flap':
      se('se_piichan_flap');
      if (poko) sparkle(poko.x - 5, poko.y - 22, 300);
      yield 400;
      return;
    case 'give':
      // the slips through the window; カネナリくん puts them behind a flip
      se('se_paper_bag', { vol: 0.4 });
      if (k) poseIf(k, 'hold');
      yield 600;
      if (k) unpose(k);
      return;
    case 'aori':
      se('se_truck_aori');
      yield 300;
      return;
    case 'cap_swap':
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

const cues: Cues = new Proxy({} as Cues, { get: (_t, name: string) => () => stage(name) });

function seen(id: string, key: string): boolean {
  return flag(`flag_seen_${id}_${key}`) > 0;
}

/** 〔誘い〕 (and 〔誘い・2回目〕 after 「またこんど」): true when he said 「手伝う」. */
function* invite(): Co<boolean> {
  if (flag('flag_ch2_deli_declined')) {
    const i = yield* runCue(D['誘い・2回目'], cues);
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
  // ポコシャさん shoulders the yellow crate and falls in third; ヒロスケさん waves them off
  const f = F();
  const own = npc('npc_pokosha');
  const k = f.follower;
  running = true;
  setFlag('flag_ch2_delivery_on', 1);
  for (const s of STOPS) setFlag('flag_' + s.spot, 0);
  spawnPoko(f, own?.x ?? (k?.x ?? f.player.x), own?.y ?? (k?.y ?? f.player.y));
  if (own) {
    own.visible = false;
    own.solid = false;
  }
  const hiro = npc('npc_hirosuke');
  if (hiro) poseIf(hiro, 'wave');
  cardShow();
  musicParam('h_deli', 1);
  return true;
}

// ---------------------------------------------------------------- the stops

/** ポコシャさn hands him the bag; he sets it on the stand (put_down 0.6 s). */
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
  se('se_h_deli_put');
  yield 600;
  unpose(p);
}

function* deliver(n: number): Co {
  const key = `おとどけ ${n + 1}`;
  const text = D[key];
  if (!text) return;
  if (!text.includes('!cue put_down') && n !== 3) yield* putDown();
  yield* runCue(text, cues);
  setFlag('flag_' + STOPS[n].spot, 1);
  cardSet(doneStops());
  if (doneStops() >= STOPS.length) yield* cardDone();
}

for (const [i, s] of STOPS.entries()) {
  if (i === 3) continue;
  registerScript(s.spot, function* (): Co {
    if (!deliveryOn()) return;
    const n = doneStops();
    if (n !== i) {
      yield* runCue(D['順番のちがう置き台'], cues);
      return;
    }
    yield* deliver(i);
  });
}

/** エー夫人 while the delivery waits at the gathering room (4つ目): she takes the cucumbers herself. */
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
  resetDelivery();
});

/** 〔しめ〕 back at the truck with all five delivered. */
registerScript('trig_ch2_deli_return', function* (): Co {
  if (!deliveryOn() || doneStops() < STOPS.length) return;
  const f = F();
  f.player.dir = 'right';
  const a = pokoActor(f);
  if (a) {
    // out of the line, the empty crate back on the truck
    a.path = [[45 * 16 + 8, 42 * 16 + 16]];
    a.pathSpeed = 48;
    yield () => !a.path.length;
    se('se_truck_aori');
  }
  yield* runCue(D['しめ'].replace(/(@sys\n焼き芋を 2つ もらった！)/, '!cue yakiimo_get\n$1'), {
    ...Object.fromEntries(['hide', 'blush', 'shh', 'wave', 'flap', 'give', 'aori', 'cap_swap', 'yakiimo', 'put_down'].map((k) => [k, () => stage(k)])),
    *yakiimo_get() {
      for (let i = 0; i < 2; i++) yield* quietItem('item_yakiimo');
    },
  });
  setFlag('flag_ch2_delivery', 1);
  setFlag('flag_ch2_piichan_feather', 1);
  setFlag('flag_ch2_delivery_on', 0);
  musicParam('h_deli', 0);
  running = false;
  despawn(POKO);
  f.refreshPresence();
});

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
    yield* runCue(N.npc_tsugao.h2_1, cues);
    return;
  }
  if (!seen('npc_tsugao', 'h0_1')) {
    setFlag('flag_seen_npc_tsugao_h0_1', 1);
    // one eye open; the nightcap swapped for the work cap
    yield* stage('cap_swap');
    yield* runCue(N.npc_tsugao.h0_1, cues);
    return;
  }
  yield* runCue(N.npc_tsugao.h0_2, cues);
});

registerScript('npc_hirosuke', function* (): Co {
  const t = N.npc_hirosuke;
  const s = hStage();
  if (deliveryOn()) return;
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
  running = true;
  setFlag('flag_ch2_delivery_on', 1);
  for (const s of STOPS.slice(0, 4)) setFlag('flag_' + s.spot, 1);
  cardShow();
  cardSet(4);
  musicParam('h_deli', 1);
}

void game;
void state;
void addItem;
