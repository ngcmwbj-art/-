// map_town's onEnter hook and the examine texts that branch on the story
// (10_narrative 7.6 / 7.8 / 7.10 / 8.9 / 12.2 / 13.3).

import type { Co } from '../engine/co';
import { flag } from '../game/state';
import { actor, msg, registerScript, stage } from '../world/api';
import { pickStage } from '../world/maps';
import { fushigiDone, getFushigi, registerFushigi } from '../world/fushigi';
import { sfx } from '../audio';
import { CART_CORRAL_DONE, FUSHIGI_TEXT, GACHA_GINZA, GACHA_GINZA_S1, OBJ_TEXT, POSTER_WITH_KANENARI } from '../data/text/objects';
import { placeWaitingObaa } from './chime';
import { F, holdBgm, itemName } from './lib';
import { quietItem } from './stage';

// ---------------------------------------------------------------- map_town_enter

registerScript('map_town_enter', function* (): Co {
  const f = F();
  const s = stage();
  // a held song only belongs to the 17:00 → hanko-case stretch
  if (flag('flag_bgm_hold') && (flag('flag_got_hanko') || s !== 1) && s < 3) {
    holdBgm(false);
    f.applyAudio(false);
  }
  // the cow statue keeps looking at the sky from 17:00 until night
  const cow = actor('npc_cow_statue');
  if (cow) cow.pose = s === 1 || s === 2 ? 'look_up' : null;
  // おばあ waits at ひのや's storefront for the tutorial stamp
  placeWaitingObaa();
  // the restored vending machine stands one tile east of the door (5.14)
  const vm = actor('restored:sym_town_07');
  if (vm) {
    vm.x = 51 * 16 + 8;
    vm.y = 6 * 16 + 16;
  }
});

// ---------------------------------------------------------------- examine overrides

function* plain(id: string): Co {
  sfx('se_examine');
  const t = pickStage(OBJ_TEXT[id]);
  if (t) yield* msg(t);
}

registerScript('obj_koban_bicycle', () => plain('obj_koban_bicycle'));
registerScript('obj_vending_trace', () => plain('obj_vending_trace'));
registerScript('obj_floor_guide', () => plain('obj_floor_guide'));

registerScript('obj_poster_board', function* (): Co {
  sfx('se_examine');
  yield* msg(flag('flag_kanenari_joined') ? POSTER_WITH_KANENARI : String(OBJ_TEXT.obj_poster_board));
});

registerScript('obj_cart_corral', function* (): Co {
  sfx('se_examine');
  yield* msg(fushigiDone('fushigi_09') ? CART_CORRAL_DONE : String(OBJ_TEXT.obj_cart_corral));
});

// 12.2 the gacha at ひのや's storefront (stuck at 17:00 in stage 1)
registerScript('evt_gacha_ginza', function* (): Co {
  sfx('se_examine');
  if (stage() === 1) {
    yield* msg(GACHA_GINZA_S1);
    return;
  }
  yield* msg(`${GACHA_GINZA}\n!gacha`);
});


// ---------------------------------------------------------------- ふしぎ: one window where the book had two

for (const [id, t] of Object.entries(FUSHIGI_TEXT)) {
  const d = getFushigi(id);
  if (d) registerFushigi({ ...d, ...t });
}

// ---------------------------------------------------------------- fushigi_05: the reward is said once

/**
 * The dryer's reward (ハッカあめ) is announced by its @sys line; the plain
 * reward path added the item afterwards and the HUD's pick-up card popped up
 * over the next message. Here the item is given right under its own line,
 * without the card.
 */
{
  const d = getFushigi('fushigi_05');
  if (d?.item) {
    const item = d.item;
    const i = d.pressed.indexOf('@sys');
    const before = i >= 0 ? d.pressed.slice(0, i).trimEnd() : d.pressed;
    const line = i >= 0 ? d.pressed.slice(i) : `@sys\n${itemName(item)}を 手に入れた！`;
    registerFushigi({
      ...d,
      pressed: before,
      item: undefined,
      onPress: function* (): Co {
        const r = d.onPress?.();
        if (r) yield* r;
        const ok = yield* quietItem(item);
        if (ok) {
          sfx('se_item');
          yield* msg(line);
        } else yield* msg(`@sys\n${itemName(item)}を 見つけた。\nでも、もちものが いっぱいだ。`);
      },
    });
  }
}
