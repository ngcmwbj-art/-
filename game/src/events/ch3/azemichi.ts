// S10 あぜ道市（60_ch3_story 3.4・10.10、62 3.11、63 12.8）— the people しゅん talked
// to in chapters 1 and 2 (flag_talked_<npc_id>) come to 海ぞいの町 on ツガオ便,
// ヒロスケ at the wheel (表の顔):
//
//   - 1便 30 s of walking after S06; 2〜4便 each time ①〜③ is done, as soon as
//     しゅん is back out in the town (map_umizoi). Each brings, in 3.4's order,
//     up to 6 of those who were talked to and haven't come yet.
//   - Who came: flag_ch3_kita_<npc_id>, flag_ch3_kita_n; flag_ch3_bin_n counts
//     the runs. With nobody to bring, the run is counted and nothing is shown.
//   - The people stand where 62 3.11 puts them (added to W's maps here, cond
//     flag_ch3_kita_<id>) and say their 寄り道 line if they did it, else the
//     line they came with. おばあ keeps the 『ひのや 出張所』 shop, ぴょん夫人
//     pours tea (a full rest), くま吉・ペロ・かずゆき give a dish for S08.
//
// Also here: グソっ君's word of the place (62 1.8) on the chapter-3 maps and
// his guiding bubbles (60 5.3).

import type { Co } from '../../engine/co';
import { flag, setFlag, state } from '../../game/state';
import { despawn, registerScript, spawn } from '../../world/api';
import { registerWorldFx } from '../../world/fx';
import type { FieldScene } from '../../world/field';
import type { MapObj } from '../../world/types';
import { getItem } from '../../data/battle';
import { getShop, openShop, registerShop } from '../../ui/shop';
import { showBubble } from '../../ui/bubble';
import { registerDebug } from '../../debug';
import * as T from '../../data/text/c3_story2';
import { fillNames } from '../../data/text/c3_names';
import { F, panBack, panTo, sendAway } from '../lib';
import { musicParam, se } from '../ch2/compat';
import { addToMap, c3Stage, inCh3, kita, partsDone, say3 } from './common';
import { anyFlag } from './talked';

// ---------------------------------------------------------------- 3.4 the table

interface Kita {
  id: string;
  /** Where they stand (62 3.11). */
  map: 'map_umizoi' | 'map_c3_ichiba';
  x: number;
  y: number;
  dir: 'up' | 'down' | 'left' | 'right';
  /** The 寄り道 that gives the next line (3.4); `true`: always (he came because he was met). */
  yori?: string[] | true;
  sprite?: () => string;
}

/**
 * 60 3.4, in the order of the runs. On the breakwater (two tiles wide) they stand on its sea side y32 and
 * leave y31 for walking, and never beside the stone bench (42,31) or in the lighthouse's corner; on the quay never right under the post
 * box (38,24) or the bench (41,24), where the quay's last row is all that is left (fix1015).
 */
export const KITA: Kita[] = [
  { id: 'npc_obaa', map: 'map_c3_ichiba', x: 22, y: 3, dir: 'down' },
  { id: 'npc_mamekichi', map: 'map_c3_ichiba', x: 27, y: 3, dir: 'down', yori: ['flag_kitsune_*'] },
  {
    id: 'npc_hoshi_mitsu', map: 'map_c3_ichiba', x: 22, y: 7, dir: 'down', yori: ['flag_ch2_wakime_done'],
    sprite: () => (flag('flag_hunting_got') ? 'npc_hoshi_mitsu_hunting' : 'npc_hoshi_mitsu'),
  },
  { id: 'npc_hoshi_gen', map: 'map_umizoi', x: 15, y: 25, dir: 'down', yori: ['flag_ch2_barn_work', 'flag_ashiato_*'] },
  { id: 'npc_hoshi_fumi', map: 'map_umizoi', x: 7, y: 31, dir: 'up', yori: ['flag_kanbo_report'] },
  { id: 'npc_hoshi_kucho', map: 'map_umizoi', x: 24, y: 24, dir: 'down' },
  { id: 'npc_tsurumi', map: 'map_umizoi', x: 64, y: 24, dir: 'up', yori: ['flag_got_hanamaru_kensui'] },
  { id: 'npc_sae', map: 'map_umizoi', x: 16, y: 32, dir: 'down', yori: ['flag_toban_done'] },
  { id: 'npc_ojii', map: 'map_umizoi', x: 65, y: 5, dir: 'down' },
  { id: 'npc_tamotsu', map: 'map_umizoi', x: 19, y: 32, dir: 'down', yori: ['flag_zari_*'] },
  { id: 'npc_tokio', map: 'map_c3_ichiba', x: 32, y: 7, dir: 'down', yori: ['flag_tokei7_done'] },
  { id: 'npc_master', map: 'map_c3_ichiba', x: 32, y: 3, dir: 'down', yori: ['flag_bu_left'] },
  { id: 'npc_madam', map: 'map_umizoi', x: 40, y: 32, dir: 'down', yori: ['flag_kotei_done'] },
  { id: 'npc_bu_body', map: 'map_umizoi', x: 39, y: 32, dir: 'up', yori: true },
  { id: 'npc_maru', map: 'map_umizoi', x: 36, y: 32, dir: 'down', yori: ['flag_ch2_maru_told'] },
  { id: 'npc_hoshi_tome', map: 'map_umizoi', x: 37, y: 32, dir: 'down', yori: ['flag_yoburi_report'] },
  { id: 'npc_hoshi_sawako', map: 'map_c3_ichiba', x: 27, y: 5, dir: 'up', yori: ['flag_tenban_done'] },
  { id: 'npc_hoshi_yoshie', map: 'map_c3_ichiba', x: 27, y: 7, dir: 'down' },
  { id: 'npc_jk', map: 'map_c3_ichiba', x: 23, y: 7, dir: 'down', yori: ['flag_hunting_got'] },
  { id: 'npc_hoshi_busdriver', map: 'map_umizoi', x: 39, y: 25, dir: 'up', yori: ['flag_ch2_tegami'] },
  { id: 'npc_hoshi_traindriver', map: 'map_umizoi', x: 41, y: 25, dir: 'up' },
  { id: 'npc_fudeno', map: 'map_c3_ichiba', x: 31, y: 5, dir: 'up' },
  { id: 'npc_photo_master', map: 'map_umizoi', x: 12, y: 32, dir: 'up' },
  { id: 'npc_mizumaki', map: 'map_umizoi', x: 18, y: 16, dir: 'up' },
];

/** At most this many come in one run (3.4). */
const PER_BIN = 6;
/** 4 runs at most (1 + one for each of ①〜③). */
const BINS = 4;

/** Talked to in chapters 1–2 (or in chapter 3) and not come yet, in the table's order. */
export function waiting(): Kita[] {
  return KITA.filter((k) => flag(`flag_talked_${k.id}`) && !kita(k.id));
}

function yoriDone(k: Kita): boolean {
  if (k.yori === true) return true;
  if (!k.yori) return false;
  if (k.id === 'npc_maru') return flag('flag_ch2_maru_told') >= 2;
  return k.yori.some(anyFlag);
}

/** Mark someone as come (no scene: QA and the runs). */
export function arrive(id: string): void {
  if (kita(id)) return;
  setFlag(`flag_ch3_kita_${id}`, 1);
  setFlag('flag_ch3_kita_n', flag('flag_ch3_kita_n') + 1);
}

// ---------------------------------------------------------------- placing them (62 3.11)

/** The town at noon and at 12:01, until the trap (S14) takes しゅん away. */
const PRESENT = (id: string) => ({ flag: `flag_ch3_kita_${id}`, notFlag: 'flag_ch3_truck_trap' });

for (const mapId of ['map_umizoi', 'map_c3_ichiba'] as const) {
  const objs: MapObj[] = KITA.filter((k) => k.map === mapId).map((k) => {
    const o = { t: 'npc', id: k.id, x: k.x, y: k.y, dir: k.dir, script: `c3_kita_${k.id}`, cond: PRESENT(k.id) };
    // ペロ in his hunting cap if it went back to him (read when he is spawned)
    if (k.sprite) Object.defineProperty(o, 'sprite', { get: k.sprite, enumerable: true });
    return o as unknown as MapObj;
  });
  addToMap(mapId, objs);
}

// ---------------------------------------------------------------- talking to them

function* talkKita(k: Kita): Co {
  const line = (yoriDone(k) && T.KITA_YORIMICHI[k.id]) || T.KITA_LINE[k.id];
  if (line) yield* say3(`@${k.id}\n${line}`);
  // a dish for 食堂かもめ's last set meal (S08, 3.4 「手を貸す」)
  const dish = DISH[k.id];
  if (dish && flag('flag_ch3_shokudo_start') && !flag('flag_ch3_shokudo_done') && !flag(`flag_ch3_teishoku_${dish.item}`)) {
    yield* say3(dish.text);
    yield* addDish(dish.item);
  }
  if (k.id === 'npc_obaa') yield* obaaShop();
  if (k.id === 'npc_hoshi_yoshie') {
    yield* say3(T.YOSHIE_TEA.split('\n@sys')[0]);
    se('se_heal');
    for (const m of state.party) {
      m.hp = m.maxHp;
      m.mp = m.maxMp;
    }
    yield* say3('@sys' + T.YOSHIE_TEA.split('\n@sys')[1]);
  }
}

for (const k of KITA)
  registerScript(`c3_kita_${k.id}`, function* (): Co {
    yield* talkKita(k);
  });

// ---------------------------------------------------------------- dishes for S08 (shokudo.ts reads them)

const DISH: Record<string, { item: 'tofu' | 'tomato' | 'coffee'; text: string }> = {
  npc_mamekichi: { item: 'tofu', text: T.KITA_TOFU },
  npc_hoshi_mitsu: { item: 'tomato', text: T.KITA_TOMATO },
  npc_master: { item: 'coffee', text: T.KITA_COFFEE },
};

const DISH_PITCH: Record<T.TeishokuId, number> = { sakana: 1.0, himono: 0.9, tofu: 1.1, tomato: 1.15, coffee: 1.05 };

/** One dish more for the set meal (flag_ch3_teishoku_<id>, flag_ch3_teishoku_n). */
export function* addDish(id: T.TeishokuId): Co {
  if (flag(`flag_ch3_teishoku_${id}`)) return;
  setFlag(`flag_ch3_teishoku_${id}`, 1);
  const n = flag('flag_ch3_teishoku_n') + 1;
  setFlag('flag_ch3_teishoku_n', n);
  se('se_c3_teishoku', { level: n - 1, pitch: DISH_PITCH[id] });
  yield* say3(T.teishokuGot(T.TEISHOKU[id].name, n));
}

// ---------------------------------------------------------------- 『ひのや 出張所』 (61 7.3)

if (!getShop('shop_c3_hinoya')) {
  registerShop({
    id: 'shop_c3_hinoya',
    title: T.OBAA_SHOP.title,
    keeper: { name: 'おばあ', voice: 'obaa' },
    goods: () => ['item_ramune', 'item_fugashi', 'item_stamp_pad', 'item_c3_onigiri', 'item_c3_mikan_kanzume', 'item_c3_aonori_senbei'].filter((id) => !!getItem(id)),
    onBuy: (_id, n) => (n <= 1 && !flag('flag_ch3_hinoya_first') ? (setFlag('flag_ch3_hinoya_first', 1), T.OBAA_SHOP.first) : [T.OBAA_SHOP.again[n % 2]]),
    noMoney: T.OBAA_SHOP.noMoney,
    soldOut: T.OBAA_SHOP.soldOut,
    bagFull: T.OBAA_SHOP.bagFull,
    bye: () => T.OBAA_SHOP.bye,
  });
}

function* obaaShop(): Co {
  yield* openShop(getShop('shop_c3_hinoya') ? 'shop_c3_hinoya' : 'shop_hinoya');
}

// ---------------------------------------------------------------- the runs (10.10)

/** ツガオ便 parked on the quay (62 3.1): the people step down beside it. */
const QUAY = { x: 47, y: 25 };
/** Where they line up for their one line (the quay south of the truck). */
const LINE_UP = (i: number): [number, number] => [43 + i, 26];

let walkedMs = 0;

/** How many runs should have come by now. */
function binsDue(): number {
  if (!flag('flag_ch3_kids')) return 0;
  return Math.min(BINS, (walkedMs >= 30000 || flag('flag_ch3_bin_n') > 0 ? 1 : 0) + partsDone());
}

registerWorldFx({
  map: 'map_umizoi',
  update(f: FieldScene, dt: number) {
    if (!inCh3() || !flag('flag_ch3_kids') || flag('flag_ch3_got_gochisou')) return;
    if (!f.controllable) return;
    walkedMs += dt;
    const n = flag('flag_ch3_bin_n');
    if (n >= binsDue()) return;
    const who = waiting().slice(0, PER_BIN);
    if (!who.length) {
      setFlag('flag_ch3_bin_n', n + 1);
      return;
    }
    f.startScript(runBin(who));
  },
});

/** One run of ツガオ便: the truck pulls in, ヒロスケ, then each one's word. */
export function* runBin(who: Kita[]): Co {
  const f = F();
  const n = flag('flag_ch3_bin_n');
  setFlag('flag_ch3_bin_n', n + 1);
  se('se_keitora_go', { vol: 0.5 });
  yield 500;
  yield* panTo(QUAY.x - 2, QUAY.y, 900);
  se('se_keitora_stop');
  yield 400;
  se('se_truck_aori');
  // ヒロスケ by the truck (the one on the quay west steps aside for the scene)
  const mapHiro = f.actorById('npc_hirosuke');
  if (mapHiro) mapHiro.visible = false;
  const hiro = spawn('c3_bin_hiro', QUAY.x - 1, QUAY.y + 1, { sprite: 'npc_hirosuke', dir: 'down', ghost: true });
  hiro.data.scripted = true;
  yield 300;
  yield* say3(n === 0 ? T.BIN_FIRST : T.BIN_AGAIN);
  const staged: string[] = [];
  for (const [i, k] of who.entries()) {
    const [x, y] = LINE_UP(i);
    const a = spawn(`c3_bin_${k.id}`, QUAY.x, QUAY.y + 1, { sprite: k.sprite ? k.sprite() : k.id, dir: 'down', ghost: true });
    a.data.scripted = true;
    a.path = [[x * 16 + 8, y * 16 + 16]];
    a.pathSpeed = 3.5 * 16;
    staged.push(a.id);
    se('se_step_stone', { vol: 0.5 });
    yield 260;
  }
  yield 500;
  for (const [i, k] of who.entries()) {
    const a = f.actorById(`c3_bin_${k.id}`);
    if (a) a.dir = 'down';
    yield* say3(`@${k.id}\n${T.KITA_LINE[k.id] ?? ''}`);
    arrive(k.id);
    // off to their place (the map shows them there from now on)
    if (a) sendAway(a, [[10 + i * 6, 26]], 3.2, i * 120, true);
  }
  const k = flag('flag_ch3_kita_n');
  musicParam('c3_ichi', k <= 0 ? 0 : k <= 6 ? 1 : k <= 12 ? 2 : 3);
  yield 700;
  for (const id of staged) despawn(id);
  despawn('c3_bin_hiro');
  if (mapHiro) mapHiro.visible = true;
  yield* panBack(700);
}

// ---------------------------------------------------------------- グソっ君's word of the place (62 1.8)

function placeKeyC3(f: FieldScene): string {
  const m = f.map.id;
  const x = f.player.tileX;
  const y = f.player.tileY;
  const inR = (x0: number, x1: number, y0: number, y1: number) => x >= x0 && x <= x1 && y >= y0 && y <= y1;
  if (m === 'map_c3_nidai') return 'c3_nidai';
  if (m === 'map_c3_ichiba') return 'c3_ichiba';
  if (m === 'map_c3_shokudo') return 'c3_shokudo';
  if (m === 'map_c3_siren') return 'c3_siren';
  if (m === 'map_c3_toudai') return 'c3_bouhatei';
  if (m === 'map_c3_uminoie') return 'c3_kaisui';
  if (m !== 'map_umizoi') return '';
  if (inR(5, 46, 27, 33)) return 'c3_bouhatei';
  if (inR(52, 67, 19, 31)) return 'c3_kaisui';
  if (inR(4, 32, 24, 25)) return 'c3_ichiba';
  if (inR(24, 40, 16, 18)) return 'c3_shokudo';
  if (inR(14, 25, 11, 18)) return 'c3_himono';
  if (inR(25, 44, 2, 10)) return 'c3_siren';
  if (inR(46, 65, 2, 10)) return 'c3_dandan';
  if (inR(68, 79, 16, 34)) return 'c3_suizokukan';
  if (inR(2, 51, 19, 26)) return 'c3_minato';
  return 'c3_machi';
}

function* knTalkC3(f: FieldScene): Co {
  const key = placeKeyC3(f);
  const seen = `flag_kanenari_flip_${key}`;
  if (key && T.KN_PLACE[key] && !flag(seen)) {
    setFlag(seen, 1);
    yield* say3(`@npc_kanenari\n${T.KN_PLACE[key]}`);
    return;
  }
  const n = flag('flag_kanenari_usual_c3');
  setFlag('flag_kanenari_usual_c3', n + 1);
  yield* say3(`@npc_kanenari\n${T.KN_USUAL3[n % T.KN_USUAL3.length]}`);
}

for (const id of ['map_umizoi', 'map_c3_ichiba', 'map_c3_shokudo', 'map_c3_siren', 'map_c3_toudai', 'map_c3_uminoie'])
  registerScript('kanenari_' + id, function* (ctx): Co {
    const f = F();
    if (!inCh3()) {
      yield* ctx.runDefault();
      return;
    }
    yield* knTalkC3(f);
  });

// ---------------------------------------------------------------- guiding bubbles (60 5.3)

let idleMs = 0;
let lastXY = '';

registerWorldFx({
  map: '',
  update(f: FieldScene, dt: number) {
    if (!inCh3() || c3Stage() < 1 || f.map.id !== 'map_umizoi') return;
    if (!f.controllable || !f.actorById('kanenari')?.visible) {
      idleMs = 0;
      return;
    }
    const xy = `${f.player.tileX},${f.player.tileY}`;
    if (xy !== lastXY) {
      lastXY = xy;
      idleMs = 0;
      return;
    }
    idleMs += dt;
    if (idleMs < 30000) return;
    idleMs = 0;
    let text = '';
    const started = flag('flag_ch3_ichiba_start') || flag('flag_ch3_shokudo_start') || flag('flag_ch3_kaisui_start');
    if (!started && flag('flag_ch3_kids')) text = T.GUIDE_START;
    else if (partsDone() >= 3 && !flag('flag_ch3_got_itadakimasu')) text = T.GUIDE_PARTS;
    else if (flag('flag_ch3_got_itadakimasu') && !flag('flag_ch3_nariosame_beaten')) text = T.GUIDE_SIREN;
    else if (flag('flag_ch3_got_gochisou') && !flag('flag_ch3_truck_trap')) text = T.S13_BUBBLE;
    if (text) showBubble('kanenari', fillNames(text), 2600);
  },
});

// ---------------------------------------------------------------- QA

/** `__game.cmd.kita(n)`: n people (3.4's order, talked or not) have come; 0 clears. */
registerDebug('kita', (n = 6) => {
  for (const k of KITA) {
    setFlag(`flag_ch3_kita_${k.id}`, 0);
  }
  setFlag('flag_ch3_kita_n', 0);
  for (const k of KITA.slice(0, Math.max(0, Math.min(24, Number(n))))) {
    setFlag(`flag_talked_${k.id}`, 1);
    arrive(k.id);
  }
  return KITA.filter((k) => kita(k.id)).map((k) => k.id);
});
/** Who would come on the next run. */
registerDebug('kitaNext', () => waiting().slice(0, PER_BIN).map((k) => k.id));
