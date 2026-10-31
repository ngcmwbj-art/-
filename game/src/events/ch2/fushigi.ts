// みました帳 ② — the ten ふしぎ of 星見台 (50_ch2_story 8章). Registered with
// the world's ふしぎ table (the HUD's notice, the stamp spots) and examined
// through our own flow, so the reward pages count the chapter-2 book:
//
//   seen → 『みました』を 押しますか？ → the stamp → pressed → reward
//   (朱肉 +2, some an item) → 「朱肉が 2 たまった。」「（ふしぎ② n/10）」.
//
// fushigi_ch2_06 (the はなまるトマト) goes on into evt_ch2_tomato instead.
// Examined again afterwards: the `after` text. The dark ones (07〜10) are
// stampable from stage 1 (the world only lets them be examined in the light).

import type { Co } from '../../engine/co';
import { flag, setFlag, state } from '../../game/state';
import { sfx } from '../../audio';
import { registerScript } from '../../world/api';
import { registerFushigi } from '../../world/fushigi';
import { registerWorldFx } from '../../world/fx';
import { getMapDef } from '../../world/maps';
import { runMsg } from '../../world/msg';
import { FUSHIGI04_DROP, FUSHIGI04_GET, HOSHI_FUSHIGI, HOSHI_FUSHIGI_STAGE, fushigiRewardCh2 } from '../../data/text/hoshi_objects';
import { stampFushigi } from '../stamp';
import { quietItem } from '../stage';
import { HOSHI_MAPS, hStage } from './common';

export const FUSHIGI_CH2 = Object.keys(HOSHI_FUSHIGI);

export function fushigiCh2Done(id: string): boolean {
  return flag('flag_' + id) > 0;
}

/** How many of the ten are in みました帳 ②. */
export function fushigiCh2Count(): number {
  return FUSHIGI_CH2.filter((id) => fushigiCh2Done(id)).length;
}

/** Stampable now: not yet stamped, its stage reached (06 only before the lantern). */
export function fushigiCh2Active(id: string): boolean {
  if (fushigiCh2Done(id)) return false;
  const s = hStage();
  if (s > 2) return false;
  if (id === 'fushigi_ch2_06') return !flag('flag_ch2_got_tomato');
  return s >= (HOSHI_FUSHIGI_STAGE[id] ?? 0);
}

function giveMp(n: number): void {
  const m = state.party.find((p) => p.id === 'minato');
  if (m) m.mp = Math.min(m.maxMp, m.mp + n);
}

/** The reward pages (朱肉 +2 and the count of ②). */
export function* fushigiReward(): Co {
  giveMp(2);
  yield* runMsg(fushigiRewardCh2(fushigiCh2Count()));
}

/**
 * The whole examine flow of a chapter-2 ふしぎ. `seenOverride` replaces the
 * first text (a scene that has already said it).
 */
export function* runFushigiCh2(id: string, seenOverride?: string): Co {
  const d = HOSHI_FUSHIGI[id];
  if (!d) return;
  sfx('se_examine');
  if (fushigiCh2Done(id)) {
    yield* runMsg(d.after);
    return;
  }
  yield* runMsg(seenOverride ?? d.seen);
  if (!flag('flag_got_hanko') || !fushigiCh2Active(id)) return;
  const i = yield* runMsg(`@sys
『みました』を 押しますか？
? 押す | やめておく`);
  if (i !== 0) return;
  if (id === 'fushigi_ch2_06') {
    const { evtTomato } = (yield import('./house')) as typeof import('./house');
    yield* evtTomato();
    return;
  }
  yield* stampFushigi(id);
  setFlag('flag_' + id, 1);
  yield* runMsg(d.pressed);
  if (id === 'fushigi_ch2_04') {
    // the circular goes round to the next house; its ink pad drops off
    sfx('se_h_kairan', { pitch: 0.9 });
    yield 300;
    sfx('se_poton', { vol: 0.5 });
    yield* runMsg(FUSHIGI04_DROP);
    const ok = yield* quietItem('item_kairan_shuniku');
    if (ok) {
      sfx('se_item');
      yield* runMsg(FUSHIGI04_GET);
    } else yield* runMsg(`@sys\n回覧板の朱肉を 見つけた。\nでも、もちものが いっぱいだ。`);
  }
  yield* fushigiReward();
}

// ---------------------------------------------------------------- the world's table and the scripts

for (const [id, d] of Object.entries(HOSHI_FUSHIGI)) {
  registerFushigi({ id, stage: `${HOSHI_FUSHIGI_STAGE[id] ?? 0}+`, seen: d.seen, pressed: d.pressed || d.after, after: d.after });
  registerScript(id, function* (): Co {
    yield* runFushigiCh2(id);
  });
}

/**
 * The level team places the ふしぎ as examine objects (`fushigi: 'fushigi_ch2_NN'`)
 * under their own ids; each one without a script of its own is pointed at
 * ours, so the chapter-2 flow (and its ② count) runs whatever the id.
 */
function hookFushigiObjects(mapId: string): void {
  const def = getMapDef(mapId);
  if (!def) return;
  for (const o of def.objects) {
    if (o.t !== 'obj') continue;
    const fid = (o as { fushigi?: string }).fushigi;
    if (fid && fid.startsWith('fushigi_ch2_') && !(o as { script?: string }).script) (o as { script?: string }).script = fid;
  }
}
for (const m of HOSHI_MAPS) hookFushigiObjects(m);
let hookedMap = '';
registerWorldFx({
  map: '',
  update(f) {
    if (f.map.id === hookedMap) return;
    hookedMap = f.map.id;
    if (f.map.id.startsWith('map_hoshi')) hookFushigiObjects(f.map.id);
  },
});
