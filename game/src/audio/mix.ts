// The mix pass (40_audio 11): one gain trim per SE, voice and ambience so each
// lands on its category's peak target, on top of the recipes' own v values
// (the recipes stay exactly as designed; the trim is the fader on the desk).
//
// Targets are peaks in dBFS measured at the master, *before* the compressor
// and limiter, at the default volume settings (BGM 7, SE 8) — the way 11.2
// defines them. The trims below were calibrated with
//   __game.cmd.audioMixSuggest()
// (offline renders of every sound, see report.ts) and pasted here. Re-run it
// after changing a recipe; `audioReport()` checks the result.

import { dbToGain, MASTER_LIFT_DB } from './engine';

// ---------------------------------------------------------------------------
// SE categories (11.2) → target peak (dBFS)

// the heavy blows sit 1.5 dB under 11.2's −3: with the master lifted, the
// distance from the quiet songs to the loudest stamp was the widest in the mix
const HEAVY = -4.5;
const HIT = -6;
const SKILL = -10;
const UI = -16;
const STEP = -24;

/** Per-SE peak targets; anything not listed falls back to its group's target. */
const SE_TARGET: Record<string, number> = {
  // heavy blows (the stamp and the thud play together: keep their sum near −2)
  se_stamp_heavy: HEAVY, se_don: HEAVY, se_ojigi_press: HEAVY, se_encounter: HEAVY, se_bell_kanenari: HEAVY,
  se_thud_low: -8.5, se_crit: -5, se_bell_kanenari_short: -5,
  // attacks and hits
  se_hit_pofu: HIT, se_hit_pashi: HIT, se_hit_bell: -7, se_bishi: HIT, se_damage: HIT, se_stamp: HIT, se_ko: -8,
  se_part_break: HIT, se_balloon_pop: HIT, se_bump: -7, se_momi: -8, se_kabuse: -8, se_atari: -8,
  se_initiative: -8, se_ambush: -8, se_kire_full: -8, se_chime_chord: -8,
  // ability / feedback cues
  se_hanamaru: SKILL, se_kiran: SKILL, se_heal: SKILL, se_rewind: SKILL, se_balloon: SKILL, se_bow: SKILL,
  se_kire_up: SKILL, se_status: SKILL, se_buff_up: SKILL, se_buff_down: SKILL,
  se_defeat_chord: SKILL, se_poton: SKILL, se_shrink: SKILL, se_light_fly: -12, se_part_glow: -12, se_warn: SKILL,
  // whooshes and sweeps read louder than their peaks
  se_ring: -14, se_whiff: -14, se_zero: SKILL, se_swing: -14, se_enemy_appear: -12, se_flee: -12,
  se_nori_sing: -12, se_nori_flag: -12, se_hug: -12, se_uwabaki: -12, se_meishi: -12, se_peke_fall: -12,
  se_boss_voice: SKILL, se_mimashita: -12, se_hanko_learn: SKILL, se_stamp_light: SKILL,
  se_hanko_ready: -13, se_hanko_zone: -14, se_hanko_charge: -14, se_roulette: -14, se_paper_open: -12,
  // UI and talk
  se_item: -12, se_save: -12, se_shop_buy: -14, se_count: -18, se_hp_tick: -20, se_slider: -18,
  se_pen_write: -22, se_flip: -18, se_emote: -14, se_emote_question: -14, se_emote_sweat: -14, se_emote_light: -14,
  se_fushigi: -14, se_symbol_notice: -14, se_clock_flip: UI, se_examine: UI, se_coin: -16,
  // feet and doors
  se_step_kanenari: -22, se_stairs: -22, se_step_tatami: -26, se_step_wood_bare: -22, se_step_stone: -22,
  se_door: -14, se_door_glass: -16, se_auto_door: -14, se_door_heavy: -12, se_door_small: -18, se_shop_bell: -14,
  se_shop_shutter: -14,
  // the town
  se_shutter: UI, se_chain: -18, se_shadow_swing: -14, se_crow: UI, se_coo: -18, se_cat: -18, se_dog_bark: UI,
  se_sparrow_a: -18, se_sparrow_b: -18, se_higurashi_call: -18, se_furin: -18, se_fry: -18, se_crossing_up: -12,
  se_train_pass: -8, se_train_far: -18.5, se_gacha: -14, se_glint: -18, se_semi_hop: -18, se_cart_rattle: -18,
  se_umbrella_hop: UI, se_robot_bump: -14, se_kaitenyaki_stop: -14, se_escalator_step: UI, se_rumble: SKILL,
  se_zipper: UI, se_paper_bag: UI, se_star: -18,
  // the PA and the bells
  se_chime_note: -12, se_pa_chime: -8, se_pa_chime_end: -8, se_bell_dud: -8,
};

const GROUP_TARGET: Record<string, number> = {
  'UI・メニュー': UI,
  '会話・エモート・知らせ': UI,
  '足音・扉': STEP,
  '町の音・イベント': UI,
  'ハンコ': SKILL,
  'チャイム・鐘・放送': -8,
  '戦闘：共通': SKILL,
  '戦闘：能力': SKILL,
  '戦闘：敵の技': SKILL,
};

/** SEs that are silent by design (a cut): never trimmed. */
export const SE_NO_TRIM = new Set(['se_chime_cut']);
/** Aliases share their source's fader. */
const SE_ALIAS: Record<string, string> = { se_step: 'se_step_stone' };

/** An SE's peak target (dBFS at the master, before dynamics, SE volume 8): 11.2 + the master lift. */
export function seTargetDb(id: string, group: string | undefined): number {
  return (SE_TARGET[id] ?? (group ? GROUP_TARGET[group] : undefined) ?? UI) + MASTER_LIFT_DB;
}

// ---------------------------------------------------------------------------
// Voices (11.2: dialog −20 dBFS)

const VOICE_TARGET: Record<string, number> = {
  narr: -32, sys: -99, flip: -26, cat: -24, hato: -22, crow: -22, dog: -21,
  broadcast: -16, broadcast_child: -18, kanenari_voice: -18, omukaemachi: -19,
};
export function voiceTargetDb(id: string): number {
  return (VOICE_TARGET[id] ?? -20) + MASTER_LIFT_DB;
}

// Ambience faders are not set by isolated peaks (11.2's −30〜−36 dBFS reads
// "on target" while the music buries the room): audioMixSuggest sets them so
// each ambience is heard over the music it plays under (report.ts
// ambContext, the 4.2 pairs).

// ---------------------------------------------------------------------------
// BGM (11.2): loudness relative to bgm_battle, whose raw peak sits at −12 dBFS.

export const BATTLE_PEAK_DB = -12 + MASTER_LIFT_DB;
export const BGM_TARGET: Record<string, number> = {
  bgm_battle: 0, bgm_midboss: 0, bgm_boss: 0,
  bgm_town_s0: -3, bgm_town_s1: -3, bgm_town_s2: -3,
  bgm_home: -4, bgm_shop: -4, bgm_mall: -4,
  bgm_title: -6, bgm_title_clear: -6, bgm_ending: -5, bgm_night: -8,
  bgm_jingle_victory: -1, bgm_jingle_levelup: -1, bgm_jingle_item: -2, bgm_jingle_join: -1, bgm_jingle_gameover: -6,
};

// ---------------------------------------------------------------------------
// Balance inside a song: each part's loudness (solo, BS.1770) relative to the
// melody. The design's v values are the starting point; the chip leads are
// thin next to FM basses, so the arrangement is levelled by role.

export type PartRole = 'melody' | 'counter' | 'bass' | 'drums' | 'chords' | 'pads' | 'fx';
export const ROLE_TARGET: Record<PartRole, number | null> = {
  melody: 0, counter: -5, bass: -2, drums: -4, chords: -6, pads: -7, fx: null,
};
/** The part every other part of a song is levelled against (its main tune). */
export const REF_PART: Record<string, string> = {
  bgm_title: 'mbox', bgm_title_clear: 'mbox', bgm_home: 'melody', bgm_shop: 'melody', bgm_ending: 'melody', bgm_night: 'stars',
};
/** Parts whose colour is the point of the song: a closer target than their role. */
export const TARGET_OVERRIDE: Record<string, number> = {
  'bgm_title/pad': -4, 'bgm_title_clear/pad': -4, 'bgm_night/pad': -4, 'bgm_boss/choir': -4, 'bgm_ending/pad': -6,
  'bgm_boss/pad_intro': -4, 'bgm_battle/break': -1, 'bgm_mall/epiano': -4, 'bgm_home/chords': -4,
};
const ROLE_OVERRIDE: Record<string, PartRole> = {
  'bgm_title/mbox': 'melody', 'bgm_title/flute': 'counter', 'bgm_title/chime': 'fx', 'bgm_title_clear/mbox': 'melody',
  'bgm_town_s0/mbox': 'melody', 'bgm_town_s1/mbox': 'melody', 'bgm_town_s2/mbox': 'melody',
  'bgm_boss/lead_mbox': 'counter', 'bgm_boss/recorder': 'melody', 'bgm_boss/choir': 'pads', 'bgm_boss/clock': 'drums',
  'bgm_boss/intro': 'fx', 'bgm_boss/pad_intro': 'pads', 'bgm_boss/arp': 'chords',
  'bgm_midboss/lead78': 'melody', 'bgm_midboss/roulette': 'melody', 'bgm_midboss/vending': 'melody', 'bgm_midboss/bow': 'fx',
  'bgm_midboss/intro_bass': 'bass',
  'bgm_ending/melody': 'melody', 'bgm_ending/flute': 'counter', 'bgm_ending/counter': 'counter', 'bgm_ending/epiano': 'chords',
  'bgm_night/stars': 'melody',
  'bgm_battle/break': 'melody', 'bgm_battle/bass_intro': 'bass',
};
export function partRole(song: string, part: string): PartRole {
  const o = ROLE_OVERRIDE[`${song}/${part}`];
  if (o) return o;
  if (/^(lead|melody|stars|recorder|break|vending)$/.test(part)) return 'melody';
  if (/^(flute|double|hum|lead2|lead_mbox)$/.test(part)) return 'counter';
  if (/bass|^sub$/.test(part)) return 'bass';
  if (/drums|^kire_(hat|clap)|clock/.test(part)) return 'drums';
  if (/epiano|marimba|stab|chords|vibes|arp|comp/.test(part)) return 'chords';
  if (/pad|choir|swirl/.test(part)) return 'pads';
  return 'fx';
}

/** Per-part level trims (dB) inside each song, keyed 'song/part'. */
export const PART_TRIM: Record<string, number> = {
  'bgm_battle/bass': -6, 'bgm_battle/bass_intro': -5, 'bgm_battle/break': -3, 'bgm_battle/drums': -4.5,
  'bgm_battle/kire_arp': 15, 'bgm_battle/kire_clap': 16, 'bgm_battle/kire_hat': 16.5, 'bgm_battle/lead': 3,
  'bgm_battle/pad': -2, 'bgm_battle/stab': -2, 'bgm_boss/arp': -1, 'bgm_boss/bass': -8, 'bgm_boss/choir': -5,
  'bgm_boss/clock': 8, 'bgm_boss/drums': -3.5, 'bgm_boss/intro': -5, 'bgm_boss/kire_arp': 16,
  'bgm_boss/kire_clap': 18, 'bgm_boss/kire_hat': 16.5, 'bgm_boss/recorder': -3, 'bgm_ending/bass': -6,
  'bgm_ending/drums': 16, 'bgm_ending/epiano': -2.5, 'bgm_ending/flute': -2.5, 'bgm_ending/pad': -4,
  'bgm_home/bass': -5, 'bgm_home/double': 8, 'bgm_home/drums': 8, 'bgm_mall/bass': -8, 'bgm_mall/drums': -1,
  'bgm_mall/epiano': -5, 'bgm_midboss/bass': -8, 'bgm_midboss/bow': -3, 'bgm_midboss/drums': -5,
  'bgm_midboss/epiano': -9, 'bgm_midboss/intro_bass': -6, 'bgm_midboss/kire_arp': 15, 'bgm_midboss/kire_clap': 16,
  'bgm_midboss/kire_hat': 16.5, 'bgm_midboss/lead': 2, 'bgm_midboss/lead78': 2, 'bgm_midboss/roulette': 6,
  'bgm_midboss/stab': -5.5, 'bgm_midboss/vending': 5, 'bgm_night/pad': -1.5, 'bgm_night/sub': -6,
  'bgm_shop/bass': -8, 'bgm_shop/drums': 5.5, 'bgm_shop/hum': 3, 'bgm_shop/swirl': 6, 'bgm_title/flute': -3,
  'bgm_title/pad': -4, 'bgm_title/sub': -6, 'bgm_title_clear/flute': -3, 'bgm_title_clear/pad': -4,
  'bgm_title_clear/sub': -6, 'bgm_town_s0/bass': -5.5, 'bgm_town_s0/drums': 3.5, 'bgm_town_s0/epiano': -3,
  'bgm_town_s0/marimba': 2.5, 'bgm_town_s0/mbox': 4.5, 'bgm_town_s0/pad': -1.5, 'bgm_town_s0/sub': -6,
  'bgm_town_s1/bass': -5.5, 'bgm_town_s1/drums': 3.5, 'bgm_town_s1/epiano': -3, 'bgm_town_s1/marimba': 2.5,
  'bgm_town_s1/mbox': 4.5, 'bgm_town_s1/pad': -1.5, 'bgm_town_s1/sub': -6, 'bgm_town_s2/bass': -5.5,
  'bgm_town_s2/drums': 0, 'bgm_town_s2/epiano': -3, 'bgm_town_s2/marimba': 2.5, 'bgm_town_s2/mbox': 4.5,
  'bgm_town_s2/pad': -1.5, 'bgm_town_s2/sub': -6,
};
/** (Not bypassed by mixState: the part balance is part of the arrangement.) */
export function partTrim(song: string, part: string): number {
  return dbToGain(PART_TRIM[`${song}/${part}`] ?? 0);
}

// ---------------------------------------------------------------------------
// The stereo stage (40_audio 1.2: "ステレオの広がり・リバーブ・空間").
// The tune, the bass, the kick and the snare hold the middle; everything that
// accompanies them gets a seat left or right, so the mix is wide without the
// melody leaving the centre. A song's own fx.pan wins over these defaults.
// audioReport's width check (side vs mid above 500 Hz) keeps this honest.

// 'fx' parts are a mixed bag (intros with a sub bass, hits, tails): they stay
// centred unless placed; the chime quotes get their own seat below.
const ROLE_PAN: Record<PartRole, number> = { melody: 0, counter: 0.38, bass: 0, drums: 0, chords: -0.42, pads: 0, fx: 0 };
/** Seats that differ from the role default ('song/part'). */
export const PART_PAN: Record<string, number> = {
  // two accompaniments in one song sit on opposite sides
  'bgm_town_s0/marimba': 0.46, 'bgm_town_s1/marimba': 0.46,
  'bgm_town_s0/mbox': 0.12, 'bgm_town_s1/mbox': 0.12, 'bgm_town_s2/mbox': 0.12,
  'bgm_battle/stab': -0.42, 'bgm_battle/chime': 0.5, 'bgm_battle/break': 0,
  'bgm_midboss/stab': -0.42, 'bgm_midboss/epiano': 0.4, 'bgm_midboss/roulette': 0.35, 'bgm_midboss/chime': -0.45,
  'bgm_midboss/bow': 0.18,
  'bgm_boss/arp': 0.34, 'bgm_boss/lead_mbox': -0.3, 'bgm_boss/clock': 0, 'bgm_boss/recorder': 0,
  'bgm_shop/vibes': -0.45, 'bgm_shop/chime': 0.5, 'bgm_shop/hum': 0,
  'bgm_home/double': 0,
  'bgm_mall/chime': -0.5,
  'bgm_ending/flute': 0.3, 'bgm_night/chime': 0.35,
  'bgm_title/flute': -0.28, 'bgm_title_clear/flute': -0.28,
  // the title's PA chime is the town's speaker far across the panorama
  'bgm_title/chime': 0.15, 'bgm_title_clear/chime': 0.15,
  // jingles: the chord / brass answer left, the sparkle right
  'bgm_jingle_victory/brass': -0.3, 'bgm_jingle_levelup/brass': -0.3, 'bgm_jingle_item/chord': -0.3,
  'bgm_jingle_join/chord': -0.3, 'bgm_jingle_item/sparkle': 0.4,
};
export function partPan(song: string, part: string): number {
  return PART_PAN[`${song}/${part}`] ?? (part === 'chime' ? 0.45 : ROLE_PAN[partRole(song, part)]);
}
/** Chord parts fan their voicing across ±spread around their seat (low notes left, high right). */
export function partSpread(song: string, part: string): number {
  return partRole(song, part) === 'chords' ? 0.34 : 0;
}
/**
 * Early reflections around the tune (PartFx.air, dB per tap): the melody
 * owns most of the energy above 500 Hz, so without a room of its own the
 * mix reads mono however wide the accompaniment sits. null = dry.
 */
const AIR: Record<string, number | null> = {
  // the indoor tunes and the mall's worn lead carry most of their songs alone
  'bgm_home/melody': -12, 'bgm_shop/melody': -12, 'bgm_mall/lead': -12,
};
export function partAir(song: string, part: string): number | null {
  const k = `${song}/${part}`;
  if (k in AIR) return AIR[k];
  return partRole(song, part) === 'melody' ? -14 : null;
}
/**
 * The drum kit seen from the drum stool: hats left, ride and shaker right,
 * kick and snare in the middle (a part's fx.pan moves the whole kit).
 */
export const KIT_PAN: Record<string, number> = {
  drm_hat_c: -0.36, drm_hat_o: -0.36, drm_ride: 0.38, drm_shaker: 0.4, drm_rim: -0.2, drm_triangle: 0.45,
  drm_woodblock: -0.38, drm_tom_low: -0.25, drm_tick: 0.3, drm_tock: -0.3,
  // chapter 2: the crickets sit where the hats were; the microphone left of centre
  drm_cricket: -0.36, drm_mic_tap: -0.2,
};

// ---------------------------------------------------------------------------
// Calibrated trims (dB). Generated by audioMixSuggest(); see the header.

export const BGM_TRIM: Record<string, number> = {
  bgm_title: 14, bgm_title_clear: 14, bgm_town_s0: 11, bgm_town_s1: 10.5, bgm_town_s2: 11.5, bgm_home: 10.5,
  bgm_shop: 11.5, bgm_mall: 12.5, bgm_battle: 10.5, bgm_midboss: 11, bgm_boss: 9.5, bgm_ending: 13.5, bgm_night: 15,
  bgm_jingle_victory: 8, bgm_jingle_levelup: 6.5, bgm_jingle_item: 7.5, bgm_jingle_join: 8,
  bgm_jingle_gameover: 10.5,
};

export const SE_TRIM: Record<string, number> = {
  se_cursor: 11, se_confirm: 5.5, se_cancel: 18, se_buzzer: 13.5, se_menu_open: 16.5, se_menu_close: 12.5,
  se_page: 20, se_slider: 15.5, se_save: 5, se_shop_buy: 13, se_coin: 12, se_count: 20.5, se_hp_tick: 19.5,
  se_item: 12.5, se_heal: 16.5, se_emote: 15, se_emote_question: 16, se_emote_sweat: 18.5, se_emote_light: 18,
  se_examine: 18.5, se_fushigi: 21, se_symbol_notice: 19.5, se_flip: 24.5, se_pen_write: 25.5, se_clock_flip: 12.5,
  se_step_asphalt: 17, se_step_grass: 18, se_step_sand: 21.5, se_step_gravel: 21, se_step_wood: 13,
  se_step_wood_bare: 16.5, se_step_tatami: 26.5, se_step_tile: 23.5, se_step_stone: 18, se_step_dirt: 18,
  se_step_metal: 14, se_step_kanenari: 13.5, se_door: 20.5, se_door_glass: 26.5, se_auto_door: 20.5,
  se_door_heavy: 15.5, se_door_small: 24, se_stairs: 16.5, se_shop_bell: 15.5, se_shop_shutter: 20, se_shutter: 21.5,
  se_chain: 10, se_shadow_swing: 22, se_crow: 25.5, se_coo: 15.5, se_cat: 27.5, se_dog_bark: 19.5,
  se_sparrow_a: 21.5, se_sparrow_b: 21, se_higurashi_call: 22.5, se_furin: 13, se_fry: 9, se_crossing_up: 20.5,
  se_train_pass: 23.5, se_train_far: 23.5, se_gacha: 19, se_glint: 22, se_semi_hop: 23.5, se_cart_rattle: 26.5,
  se_umbrella_hop: 24.5, se_robot_bump: 22.5, se_kaitenyaki_stop: 17.5, se_escalator_step: 16, se_rumble: 16.5,
  se_zipper: 25.5, se_paper_bag: 26, se_star: 26.5, se_stamp: 7.5, se_stamp_heavy: 3.5, se_stamp_light: 13,
  se_hanko_ready: 16, se_hanko_zone: 22, se_thud_low: 3.5, se_peke_fall: 23, se_mimashita: 22, se_hanko_learn: 16.5,
  se_paper_open: 20.5, se_chime_note: 1.5, se_chime_chord: 14.5, se_pa_chime: 3, se_pa_chime_end: 1,
  se_bell_kanenari: 4.5, se_bell_kanenari_short: 6.5, se_bell_dud: 15.5, se_encounter: 4.5, se_enemy_appear: 27.5,
  se_initiative: 9, se_ambush: 5.5, se_swing: 30, se_ring: 30.5, se_hit_pofu: 17, se_hit_pashi: 11,
  se_hit_bell: 25.5, se_crit: 9, se_whiff: 24.5, se_zero: 22.5, se_warn: 17, se_bishi: 9, se_kiran: 22.5,
  se_kabuse: 25, se_damage: 9, se_ko: 22.5, se_shrink: 24.5, se_poton: 15, se_defeat_chord: 14.5, se_kire_up: 21,
  se_kire_full: 9.5, se_don: 4, se_status: 19, se_buff_up: 23, se_buff_down: 22, se_flee: 28, se_part_glow: 24,
  se_part_break: 11.5, se_light_fly: 23, se_boss_voice: 23.5, se_hanamaru: 16.5, se_rewind: 24, se_balloon: 24,
  se_balloon_pop: 12.5, se_bow: 17.5, se_nori_sing: 30, se_nori_flag: 28, se_meishi: 27.5, se_semi_buzz: 25,
  se_semi_miin: 25, se_cone_sing: 7, se_cone_tap: 17, se_siren: 23.5, se_umbrella_open: 14.5, se_drip: 22.5,
  se_hug: 31, se_ojigi_press: 2, se_atari: 17.5, se_hazure: 16.5, se_vending_voice: 23.5, se_vacuum: 25,
  se_bump: 17.5, se_momi: 19, se_remote: 22.5, se_glove: 16.5, se_bottle: 22, se_uwabaki: 34.5, se_hanko_charge: 21,
  se_roulette: 22,
};
export const VOICE_TRIM: Record<string, number> = {
  narr: 24, mother: 15, maruyama: 8, obaa: 15, mamekichi: 15.5, inui: 17, tsurumi: 16, sae: 17, jk: 15.5,
  chugaku: 15.5, postman: 11, madam: 17, girl: 16, kid: 17, ojii: 15, mizumaki: 14.5, shadow: 14, hato: 17.5,
  dog: 11.5, cat: 18, crow: 23, tv: 23.5, broadcast: 9.5, broadcast_child: 12.5, vending: 20.5, omukaemachi: 15.5,
  flip: 16.5, kanenari_voice: 15, default: 19,
};
export const AMB_TRIM: Record<string, number> = {
  amb_higurashi: 17, amb_still: 25, amb_s2_town: -1, amb_train_far: 0, amb_night_insects: 22.5, amb_fan: 16.5,
  amb_fridge: 20.5, amb_tv: 36.5, amb_clock_tick: 20, amb_oil: 25.5, amb_dryer: 18, amb_koban: 22.5,
  amb_fluorescent: 11.5, amb_fluorescent_flicker: 13.5, amb_kaitenyaki: 15.5, amb_mall_wind: 34.5, amb_kawabe: 32,
  amb_arcade: 38.5, amb_wind: 24,
};

/** A song's output level in dB: its own master gain plus the mix trim. */
export function songGainDb(id: string, gainDb: number): number {
  return gainDb + (mixState.bypass ? 0 : BGM_TRIM[id] ?? 0);
}

/** Linear gain for an SE instance. */
export function seTrim(id: string): number {
  return SE_NO_TRIM.has(id) ? 1 : dbToGain(SE_TRIM[SE_ALIAS[id] ?? id] ?? 0);
}
export function voiceTrim(id: string): number {
  return dbToGain(VOICE_TRIM[id] ?? 0);
}
export function ambTrim(id: string): number {
  return dbToGain(AMB_TRIM[id] ?? 0);
}

/** QA: temporarily bypass every trim (to measure the raw recipes). */
export const mixState = { bypass: false };
export function trimOr1(g: number): number {
  return mixState.bypass ? 1 : g;
}
