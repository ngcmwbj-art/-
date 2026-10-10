// Shared pieces for the chapter 2 people of 星見台 (52 10.0–10.3).
//
//  - stage(): the village's stage (flag_ch2_stage), for sprites whose look
//    follows the night (ぴーちゃん asleep at h0, マサルさん's flashlight).
//  - followFlag(): a sprite id that turns into one of its variants by itself
//    (the same in-place swap Minato's lantern uses), so the field keeps one
//    CharSprite object per id.
//  - lookHill(): the h2 wait every villager has (50 3.0): facing north the
//    head rises 1px and holds; turned to the player it is the plain idle.
//  - small shared materials (eyes, the night-safe whites) and a few prop
//    painters (the yellow crate of ツガオ便, a paper bag of vegetables).

import { flag } from '../../../game/state';
import type { Dir } from '../../../game/state';
import { flat, mat, type Fig, type Mats } from '../fig';
import { breathingIdle, type IdleKey, type PoseLoop } from '../rig';
import { charSprite, registerCharSync, type CharSprite } from '../registry';

export const DIRS4: Dir[] = ['down', 'up', 'left', 'right'];

/** 星見台's stage (flag_ch2_stage), 0 before chapter 2 starts. */
export function stage(): number {
  return flag('flag_ch2_stage') | 0;
}

/** Materials every chapter 2 person shares (eyes and mouths are #2A2440, 30 7.2). */
export const BASE2: Mats = {
  eye: flat('#2A2440'),
  mouth: flat('#2A2440'),
  shine: flat('#FFF6D8'),
};

/** Sun-browned skin of people who work outside all year. */
export const SKIN_FARM = mat('#D9A07A', { shade: '#B87A5A', light: '#F2B894', dark: '#8A5A3A' });
/** マサルさん / ツガオさん / ポコシャさん: a deeper tan (52 10.3 #C98A6A). */
export const SKIN_DEEP = mat('#C98A6A', { shade: '#A86A4E', light: '#E0A882', dark: '#8A5A3A' });
/** Older, paler skin (the school people). */
export const SKIN_OLD = mat('#F2B894', { shade: '#D9A07A', light: '#FFD9B8', dark: '#B87A5A' });

/** White-streaked grey hair (#C8C2B4, shade #6B7186). */
export const HAIR_GREY = mat('#C8C2B4', { shade: '#9AA0A8', light: '#E8E4D8', dark: '#6B7186' });
/** Thin white hair of the elders. */
export const HAIR_WHITE = mat('#E8E4D8', { shade: '#C8C2B4', light: '#F4F1E8', dark: '#9AA0A8' });

// ---- the h2 wait -------------------------------------------------------------

/**
 * look_hill as a held pose (actor.pose = 'look_hill'): facing north the
 * head is up 1px (act 'look_hill'), breathing; facing anyone else (a talk
 * turned him round) it is the plain idle of that facing. `sideAct` = the act
 * of the side views (a seated person keeps sitting and looks up the hill
 * over the shoulder: pass its own act).
 */
export function lookHill(o: { up?: string; side?: string; down?: IdleKey[] } = {}): PoseLoop {
  const up = o.up ?? 'look_hill';
  const breathe = (act: string): IdleKey[] => [
    { act, breath: 0 }, { act, breath: 0 }, { act, breath: 0 }, { act, breath: 1 }, { act, breath: 1 }, { act, breath: 1 },
    { act, breath: 0 }, { act, breath: 0 }, { act, breath: 0, blink: true }, { act, breath: 1 }, { act, breath: 1 }, { act, breath: 1 },
  ];
  const side = breathe(o.side ?? 'look_hill');
  return { up: breathe(up), left: side, right: side, down: o.down ?? breathingIdle(12, [8]) };
}

// ---- sprites that follow the story ------------------------------------------------

type Fields = Pick<CharSprite, 'walk' | 'idle' | 'run' | 'extra' | 'extraDir' | 'anims' | 'animsDir' | 'keep'>;
const FIELDS = ['walk', 'idle', 'run', 'extra', 'extraDir', 'anims', 'animsDir', 'keep'] as const;

/**
 * Keep `id` showing the variant `pick()` names (one of `variants`, all
 * registered ids of the same size). The base sprite object is repainted in
 * place, like 'minato' → 'minato_lantern', so actors holding it follow.
 */
export function followFlag(id: string, pick: () => string): void {
  let shown = '';
  let own: Fields | null = null;
  registerCharSync(() => {
    const want = pick();
    if (want === shown) return;
    const base = charSprite(id);
    if (!own) {
      own = {} as Fields;
      for (const k of FIELDS) (own as Record<string, unknown>)[k] = base[k];
      if (!shown && want === id) {
        shown = want;
        return;
      }
    }
    const src: Fields = want === id ? own : charSprite(want);
    for (const k of FIELDS) (base as unknown as Record<string, unknown>)[k] = src[k];
    shown = want;
  });
}

// ---- small props the people hold -------------------------------------------------

/** ツガオ便's yellow harvest crate (#FFD23F, shade #D9A441, handle hole 1px), w×h at (x, y). */
export function crate(f: Fig, x: number, y: number, w = 6, h = 4, shift = 0): void {
  f.part('crate', { shade: 'rb', light: 't', shift });
  f.rect(x, y, w, h);
  f.part('crate', { flat: true });
  f.t(-2).px(x + Math.floor(w / 2) - 1, y + 1).px(x + Math.floor(w / 2), y + 1).t(null);
  f.t(-1).hl(x, x + w - 1, y + h - 1).t(null);
}

export const CRATE = mat('#FFD23F', { shade: '#D9A441', light: '#FFE7A3', dark: '#A8742A' });

// ---- the see-off wave (ending cut 4: everyone raises a hand as the bus leaves) -----------

/**
 * A raised, waving arm. Front: the viewer-right arm (his left) goes up
 * beside the head; back: the viewer-right arm as well (his right); side: the
 * near arm up in front of the face. `ph` 0/1 rocks the hand 1px. The caller
 * leaves that arm out of its hanging arms.
 */
export function waveArm(f: Fig, view: 'down' | 'up' | 'left', sx: number, sy: number, o: { sleeve: string; hand: string; ph: number; cuff?: string }): void {
  const k = o.ph ? 1 : 0;
  if (view === 'left') {
    f.part(o.sleeve, { shade: 'rb', light: 't' });
    f.px(sx, sy).px(sx - 1, sy - 1).px(sx - 1, sy - 2);
    if (o.cuff) f.part(o.cuff, { shade: 'rb', light: 't' });
    f.px(sx - 2, sy - 3);
    f.part(o.hand, { shade: 'rb', light: 't' });
    f.rect(sx - 3 - k, sy - 6, 2, 2).px(sx - 2, sy - 4);
    return;
  }
  const dir = view === 'down' ? 1 : 1;
  f.part(o.sleeve, { shade: 'rb', light: 't', shift: view === 'up' ? -1 : 0 });
  f.px(sx, sy).px(sx + dir, sy - 1).px(sx + dir, sy - 2);
  if (o.cuff) f.part(o.cuff, { shade: 'rb', light: 't' });
  f.px(sx + dir, sy - 3);
  f.part(o.hand, { shade: 'rb', light: 't', shift: view === 'up' ? -1 : 0 });
  f.rect(sx + dir + k, sy - 6, 2, 2).px(sx + dir, sy - 4);
}

/** The waving anim (6 beats then held up). */
export const WAVE_ANIM = { frames: [{ ph: 0 }, { ph: 1 }, { ph: 0 }, { ph: 1 }, { ph: 0 }, { ph: 1 }, { ph: 0 }], ms: 180, loop: false, dirs: 'all' as const };
