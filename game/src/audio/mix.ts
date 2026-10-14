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
  se_train_pass: -8, se_train_far: -18.5, se_gacha: -14, se_panda_ride: -16, se_glint: -18, se_semi_hop: -18, se_cart_rattle: -18,
  se_umbrella_hop: UI, se_robot_bump: -14, se_kaitenyaki_stop: -14, se_keitora_stop: -14, se_keitora_go: -14, se_escalator_step: UI, se_rumble: SKILL,
  se_zipper: UI, se_paper_bag: UI, se_star: -18,
  // the PA and the bells
  se_chime_note: -12, se_pa_chime: -8, se_pa_chime_end: -8, se_bell_dud: -8,
  // ---- chapter 2 (53_ch2_audio 8)
  // the prologue, the train, the station
  se_h_crossing_bell: -12, se_h_crossing_down: -14, se_h_train_brake: -12, se_h_train_idle: -22, se_h_train_door: -14,
  se_h_train_chime: -12, se_h_seiriken: -16, se_h_coin_box: -14,
  // the village, the greenhouse, the meeting room
  se_h_vinyl_door: -14, se_h_yunomi: -16, se_h_yunomi_pour: -16, se_h_tomato_catch: -12, se_h_lantern_set: -14,
  se_h_light_spread: SKILL, se_h_boukatou_on: -16, se_h_kaichu: -18, se_h_kakashi_turn: -16, se_h_keitora: -12,
  se_h_keitora_go: -12, se_h_chalk: -18, se_h_chalk_erase: -18, se_h_kairan: -16, se_h_ibiki: -20, se_h_acha: -20,
  // the barn and the farm (the cattle are never louder than a person nearby)
  se_h_shodoku: -16, se_h_hansuu: -20, se_h_cow_snort: -18, se_h_moo: -14, se_h_barn_light: -16, se_h_feed_cart: -16,
  se_h_feedbag: -16, se_h_gate_hook: -14, se_h_side_roll: -16, se_h_ripen: -12, se_h_esayose: -18, se_h_watercup: -18,
  // the PA (bus_pa: the trim rides into the speaker)
  se_h_pa_open: -12, se_h_pa_close: -14, se_h_pa_last: -8, se_h_morning_chime: -8,
  // the fights: the enemies' moves, the boss, the new stamps (softer than an attack: 51 14.1)
  se_h_yofukashi: HIT, se_h_ressha: -8, se_h_howl: -14, se_h_dim: -14, se_h_amado: -8, se_h_yamabiko: -12, se_h_sukima: -12,
  se_h_otsukare: -12, se_h_bell_kon: -12, se_h_charin: -12, se_h_aokusai: -12, se_h_roll: -12,
  // feet, the scarecrow's hop, the ending
  se_step_sheet: -24, se_h_kakashi_hop: -18, se_h_tomato_rise: -12, se_h_sunrise: -14, se_h_bus_idle: -18,
  se_h_bus_door: -14, se_h_bus_depart: -14, se_h_bus_arrive: -14,
  // a はなまる drawn by hand: a moment, but a pen on paper (under the hanko's はなまる)
  se_hanamaru_draw: -16,
  // ツガオの部屋
  se_dakoku: -14, se_mada_stamp: HIT, se_lamp_click: -18, se_clock_restart: -16, se_clock_tick: -18,
  // ツガオ便 and the delivery (the hen as small as the town's pigeons and cats)
  se_h_deli_put: -16, se_truck_aori: -14, se_truck_key: -18, se_yakiimo: -16, se_piichan_flap: -14,
  se_piichan_koko: -18, se_piichan_koke: -17, se_piichan_kuu: -20,
  // ---- chapter 3 (63_ch3_audio 8, 10): the noon siren's head is a far speaker (under
  // the 17:00 chime: seLoudMusic), the town's small sounds sit with the sparrows and the cats
  se_c3_siren_head: -14, se_c3_title_wave: -14, se_c3_harigami: -18, se_c3_nidai_gata: -16, se_c3_shio: -18, se_c3_fender: -18,
  se_c3_kamome: -18, se_c3_tonbi: -18, se_c3_noren: -18, se_c3_torobako: -18, se_c3_donburi: -16, se_c3_fue: -12,
  se_c3_himono: -16, se_step_wet: -22,
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
  '第2章：プロローグ・電車・駅': -14,
  '第2章：村・ハウス・集会所': UI,
  '第2章：牛舎・農': UI,
  '第2章：放送・チャイム': -8,
  '第2章：戦闘・敵の技': SKILL,
  '第2章：戦闘・ボス': SKILL,
  '第2章：戦闘・ハンコ・能力': SKILL,
  '第2章：足音・シンボル・エンディング': -14,
  '第2章：ツガオ便と野菜の配達': UI,
  '第3章：序・夕鳴町の昼前・荷台': UI,
  '第3章：港と町': UI,
  '第3章：足音': STEP,
  '第3章：①市場': UI,
  '第3章：②食堂かもめ': UI,
  '第3章：③海水浴場・潜り・灯台': UI,
  '第3章：戦闘（敵・ナリオサメ）': SKILL,
  '第3章：ハンコ': SKILL,
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
// SE loudness ceilings (53 8.6 「小さく、高域は丸めて、耳に痛くしない」).
// A peak target alone lets a long pitched tone — a howl, a note out of the
// speaker — sound far louder than a blow with the same peak: a steady tone's
// loudness sits a few dB under its peak, a hit's 15 dB under. So every SE's
// loudest 400 ms (momentary LUFS at the master, before the dynamics, SE
// volume 8 — the render its peak is measured on) also has a ceiling, and
// audioMixSuggest never trims an SE past it:
//   · over the music it plays with: that song's loudest 400 ms + 6 LU
//   · the moments over a stopped or quiet song (the PA's notes, the chimes):
//     no louder than chapter 1's 17:00 chime (se_pa_chime)
//   · the bells that end a chapter: a little over that (se_bell_kanenari is
//     the loudest moment of the game by design)

/** How far an SE's loudest 400 ms may stand over the loudest 400 ms of its music (LU). */
export const SE_LOUD_OVER_MUSIC = 6;
/** Chapter 1's se_pa_chime (−12.8 momentary) rounded up: the ceiling of every chime and PA note. */
export const SE_LOUD_CHIME = -12.5;
/** The finale bells. */
export const SE_LOUD_BELL = -10.5;
const SE_LOUD_BELLS = new Set(['se_bell_kanenari', 'se_bell_kanenari_short']);
/** Groups whose sounds are moments over a stopped or quiet song. */
const SE_LOUD_MOMENT_GROUPS = new Set(['チャイム・鐘・放送', '第2章：放送・チャイム']);
/**
 * SEs levelled by loudness instead of their peak (momentary max, LUFS): the
 * long pitched ones, whose peak says little about how loud they are heard.
 * ヨビモドシ's howl sits 4 LU under chapter 1's heaviest stamp (four of them
 * stacked in the 夜ふかし warning stay near it); the PA's single notes and
 * the name call sit under the 17:00 chime, as a speaker on a hill should.
 */
export const SE_LOUD_TARGET: Record<string, number> = {
  se_h_howl: -21,
  se_h_pa_last: -14,
  se_h_tenko: -14.5,
  se_h_onamae: -14.5,
  se_h_morning_chime: -13.5,
  // the last train's 「ガタン・ゴトン」 through the speaker: an attack you feel over the boss song (its loudest −19.5)
  se_h_ressha: -21,
  // 63 10.2: the one full siren over a silent song — under chapter 1's 17:00 chime at the tower's top (d 0)
  se_c3_siren_full: -15,
  // ゴロウ's 「ごちそうさま。」 and the children's 「いただきます」: a voice-sized tune over the town's song
  se_c3_gochisou: -20,
  se_c3_part_koe: -20,
  se_c3_hanko_float: -19,
};
/** Chapter 2's SEs of the ending, heard over the dawn of bgm_hoshi_morning (53 12). */
const SE_LOUD_MORNING = /^se_h_(tomato_rise|sunrise|ripen|side_roll|moo|feed_cart|barn_light|bus_)/;
/**
 * SEs the design levels against another SE (53 8.12 se_mada_stamp: "the
 * weight of the red se_stamp, without its ring"): their ceiling is that
 * SE's loudness + 1 LU.
 */
export const SE_LOUD_LIKE: Record<string, string> = { se_mada_stamp: 'se_stamp' };
/**
 * The song an SE is heard over, for its loudness ceiling; null: a moment over
 * a stopped or quiet song, or no song at all (the night train and the
 * station of the prologue), with the fixed ceiling of seLoudFixed.
 */
export function seLoudMusic(id: string, group: string | undefined): string | null {
  const g = group ?? '';
  if (SE_LOUD_BELLS.has(id) || SE_LOUD_MOMENT_GROUPS.has(g) || /^se_(pa_chime|chime_note|h_pa_|h_morning_chime|c3_siren_)/.test(id)) return null;
  // chapter 3: the truck bed's sounds over its song, the town's over 海ぞいの町の正午
  if (g === '第3章：序・夕鳴町の昼前・荷台') return 'bgm_tsugaobin';
  // the town's fights and the two hanko are heard over the battle song (ナリオサメ's over its own)
  if (/^se_c3_nari_/.test(id)) return 'bgm_boss_nariosame';
  if (g === '第3章：戦闘（敵・ナリオサメ）' || g === '第3章：ハンコ') return 'bgm_battle';
  if (/^第3章：/.test(g)) return 'bgm_umi_noon';
  if (g === '第2章：プロローグ・電車・駅') return null;
  if (g === '第2章：戦闘・ボス') return 'bgm_boss_yobimodoshi';
  if (/^第2章：戦闘/.test(g)) return 'bgm_battle';
  if (/^第2章：ツガオの部屋/.test(g)) return 'bgm_tsugao';
  if (SE_LOUD_MORNING.test(id)) return 'bgm_hoshi_morning';
  if (/^戦闘|ハンコ/.test(g) || /^se_(chime_chord|stamp|thud|mimashita)/.test(id)) return 'bgm_battle';
  if (/^第2章：/.test(g)) return 'bgm_hoshi_night';
  return 'bgm_town_s0';
}
/**
 * Chapter 1 is out (00_common: its sounds do not change). Its SEs are
 * measured against the same ceilings, but reported apart (audioReport
 * seTooLoudCh1) — a note for the lead, not a failure of this chapter.
 */
export function seLoudFrozen(group: string | undefined): boolean {
  return !/^第[23]章：/.test(group ?? '');
}
/** The fixed ceiling of an SE that is a moment (seLoudMusic gave null). */
export function seLoudFixed(id: string): number {
  return SE_LOUD_BELLS.has(id) ? SE_LOUD_BELL : SE_LOUD_CHIME;
}

// ---------------------------------------------------------------------------
// Voices (11.2: dialog −20 dBFS)

const VOICE_TARGET: Record<string, number> = {
  narr: -32, sys: -99, flip: -26, cat: -24, hato: -22, crow: -22, dog: -21,
  broadcast: -16, broadcast_child: -18, kanenari_voice: -18, omukaemachi: -19,
  // chapter 2: the boss speaks through the speaker right over you; the train's small speaker, the sign, the dog
  yobimodoshi: -16, h_train: -22, h_mujin: -26, h_gon: -22, h_tetsuya: -20, broadcast_room: -22, dakoku: -22,
  // ツガオ便: ポコシャさん's small voice is small on purpose (his 「さすが 師匠！」 ×1.8 rides above it)
  pokosha: -24, hirosuke: -20,
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
  // chapter 2 (53_ch2_audio 10.1): 星見台の夜 is measured at 段階1 (the lantern
  // singing); 段階0 has fewer parts and reads ~3 dB quieter, as it should
  bgm_boss_yobimodoshi: 0, bgm_hoshi_morning: -4, bgm_hoshi_night: -6,
  // ツガオの部屋 after 「つづく」: a small dark room, at bgm_night's level
  bgm_tsugao: -8,
  // chapter 3 (63_ch3_audio 10.1): measured at 12:00 with nothing undone (it reads ~3 dB
  // quieter than with every part back, as it should); the truck bed's engine lies under its song
  bgm_umi_noon: -5, bgm_tsugaobin: -6,
  // the second period: ナリオサメ just under the fights (its siren included), the lunch on the breakwater at the town's level
  bgm_boss_nariosame: -1, bgm_hirugohan: -5,
  // the third period: 旧水族館 low under the footsteps and the paper (measured in the entrance's
  // form), the great tank's hall under ツガオ's voice, ヒロスケ・ポコシャ戦 at the fights' level,
  // and ヤキソバン's name the chapter's loudest moment (+1)
  bgm_suizokukan: -8, bgm_tsugao_hall: -6, bgm_boss_madamada: 0, bgm_jingle_yakisoban: 1,
  // the fourth period: ツガオ決戦 at the fights' level (measured in stage 1; the voices of 「よぶ」
  // stay under −11 dBFS together), the last song a little under the towns, M7′ alone in the hall
  bgm_boss_tsugao: 0, bgm_c3_ending: -3, bgm_c3_taikin: -6,
};

/**
 * The params a song is measured at by the QA renders (report.ts) unless a
 * check asks for others: 星見台の夜 at 段階1, 星見台の朝 past the dawn.
 */
export const QA_PARAMS: Record<string, Record<string, number>> = {
  bgm_hoshi_night: { h_stage: 1 },
  bgm_hoshi_morning: { h_stage: 3 },
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
  bgm_hoshi_night: 'lantern', bgm_hoshi_morning: 'lead', bgm_boss_yobimodoshi: 'lead', bgm_tsugao: 'bass',
  bgm_umi_noon: 'harmonica', bgm_tsugaobin: 'marimba', bgm_boss_nariosame: 'lead', bgm_hirugohan: 'lead',
  bgm_suizokukan: 'vibes', bgm_tsugao_hall: 'bass', bgm_boss_madamada: 'lead', bgm_jingle_yakisoban: 'brass',
  bgm_boss_tsugao: 'lead', bgm_c3_ending: 'lead', bgm_c3_taikin: 'taikin',
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
  // chapter 2
  'bgm_hoshi_night/lantern': 'melody', 'bgm_hoshi_night/stars': 'counter', 'bgm_hoshi_night/yobigoe': 'counter',
  'bgm_hoshi_night/organ': 'pads', 'bgm_hoshi_night/deli': 'counter',
  'bgm_boss_yobimodoshi/organ': 'melody', 'bgm_boss_yobimodoshi/organ_chords': 'pads', 'bgm_boss_yobimodoshi/lantern': 'melody',
  'bgm_boss_yobimodoshi/tenko': 'counter', 'bgm_boss_yobimodoshi/mic': 'drums', 'bgm_boss_yobimodoshi/pad_intro': 'pads',
  'bgm_boss_yobimodoshi/intro': 'fx', 'bgm_boss_yobimodoshi/intro_chime': 'fx',
  'bgm_hoshi_morning/mbox': 'counter', 'bgm_hoshi_morning/mbox_hi': 'counter', 'bgm_hoshi_morning/marimba': 'melody',
  'bgm_hoshi_morning/chime': 'melody', 'bgm_hoshi_morning/pedal': 'bass', 'bgm_hoshi_morning/pad_dawn': 'pads',
  'bgm_tsugao/bass': 'melody', 'bgm_tsugao/marimba': 'counter', 'bgm_tsugao/sub': 'bass', 'bgm_tsugao/clock': 'drums',
  // chapter 3
  'bgm_umi_noon/harmonica': 'melody', 'bgm_umi_noon/mbox_uw': 'melody', 'bgm_umi_noon/koe': 'counter', 'bgm_umi_noon/slap': 'bass',
  'bgm_umi_noon/ichiba': 'drums', 'bgm_umi_noon/daidokoro': 'drums', 'bgm_umi_noon/ichi_shaker': 'drums',
  'bgm_umi_noon/ichi_marimba': 'counter', 'bgm_umi_noon/ichi_lead': 'counter',
  'bgm_tsugaobin/marimba': 'melody', 'bgm_tsugaobin/harmonica': 'counter', 'bgm_tsugaobin/hera': 'drums',
  'bgm_boss_nariosame/siren': 'counter', 'bgm_boss_nariosame/te': 'drums', 'bgm_boss_nariosame/tokei': 'drums',
  'bgm_hirugohan/marimba': 'chords', 'bgm_hirugohan/ichi_marimba': 'counter', 'bgm_hirugohan/ichi_lead': 'counter', 'bgm_hirugohan/ichi_shaker': 'drums',
  'bgm_midboss/nabe': 'fx',
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
  // chapter 2 (audioBalance at 段階1 / phase 1 / past the dawn, then by ear:
  // the microphone taps are a hat's level, not a kit's). 星見台の夜's drums by
  // audioParts: 段階1's shaker and rim 10–12 LU under the song (Ami's lantern
  // swaying as she walks, heard), 段階2's soft kick 8–10 LU under it
  'bgm_hoshi_night/stars': 3.5, 'bgm_hoshi_night/pad': -1.5, 'bgm_hoshi_night/sub': -9, 'bgm_hoshi_night/bass': -5.5,
  'bgm_hoshi_night/drums': 19.5, 'bgm_hoshi_night/yobigoe': 4,
  // the delivery's "ぽこ、ぽこ": as present as the stars, still well under the lantern
  'bgm_hoshi_night/deli': 4,
  'bgm_boss_yobimodoshi/organ': -3.5, 'bgm_boss_yobimodoshi/organ_chords': -6, 'bgm_boss_yobimodoshi/pad': -3,
  'bgm_boss_yobimodoshi/pad_intro': -4, 'bgm_boss_yobimodoshi/bass': -6, 'bgm_boss_yobimodoshi/drums': -2,
  'bgm_boss_yobimodoshi/mic': 8, 'bgm_boss_yobimodoshi/intro': -4,
  // the kire layers sit where they sit in the other fights (40 7.2)
  'bgm_boss_yobimodoshi/kire_hat': 16.5, 'bgm_boss_yobimodoshi/kire_clap': 18, 'bgm_boss_yobimodoshi/kire_arp': 16,
  'bgm_hoshi_morning/mbox_hi': 2.5, 'bgm_hoshi_morning/chime': 4, 'bgm_hoshi_morning/marimba': 2.5,
  'bgm_hoshi_morning/epiano': -4, 'bgm_hoshi_morning/pad': -3, 'bgm_hoshi_morning/bass': -6, 'bgm_hoshi_morning/drums': 1.5,
  'bgm_hoshi_morning/pedal': -10, 'bgm_hoshi_morning/mbox': 4,
  // chapter 3 (audioParts with every 「まだ」 undone and あぜ道市 full, 12:01; then by role):
  // the returning parts are clearly there but under the harmonica — the market's
  // claps and the kitchen's knife at a hat's level, the sea's swirl a breath
  'bgm_umi_noon/koe': 0, 'bgm_umi_noon/comp': -3.5, 'bgm_umi_noon/bass': -7, 'bgm_umi_noon/slap': -1.5,
  'bgm_umi_noon/drums': 4, 'bgm_umi_noon/ichiba': 16, 'bgm_umi_noon/daidokoro': 16, 'bgm_umi_noon/umi_pad': -2,
  'bgm_umi_noon/umi_swirl': 18, 'bgm_umi_noon/ichi_marimba': 8.5, 'bgm_umi_noon/ichi_shaker': 15, 'bgm_umi_noon/ichi_lead': 8,
  'bgm_umi_noon/mbox_uw': 2,
  'bgm_tsugaobin/bass': -11, 'bgm_tsugaobin/drums': 17, 'bgm_tsugaobin/pad': -6.5,
  // the fourth period (audioBalance): M7 stays the floor of ツガオ決戦 but under the lead;
  // the ending's bass and M10 step back under the harmonica, its brushes come up
  'bgm_boss_tsugao/bass': -5.5, 'bgm_boss_tsugao/bass_grit': -1.5, 'bgm_boss_tsugao/sub': 4.5, 'bgm_boss_tsugao/pad': -2,
  'bgm_boss_tsugao/drums': -3,
  'bgm_c3_ending/marimba': 5.5, 'bgm_c3_ending/pad': -3.5, 'bgm_c3_ending/bass': -5.5, 'bgm_c3_ending/bass_m10': -6,
  'bgm_c3_ending/drums': 6,
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
  // chapter 2: the stars over the lantern's right shoulder; the calls come
  // from the hill (the middle — the echoes fan out on their own); the name
  // tags ring from the speaker's pole a little right of the roll call
  'bgm_hoshi_night/stars': 0.3, 'bgm_hoshi_night/yobigoe': 0,
  // the delivery's "ぽこ、ぽこ" answers from the other side of the lantern (the crates at しゅん's back)
  'bgm_hoshi_night/deli': -0.3,
  'bgm_boss_yobimodoshi/tenko': 0.28, 'bgm_boss_yobimodoshi/lead_mbox': -0.3, 'bgm_boss_yobimodoshi/intro_chime': 0.2,
  'bgm_hoshi_morning/chime': 0.12, 'bgm_hoshi_morning/mbox': 0.3, 'bgm_hoshi_morning/mbox_hi': 0.34,
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
  // chapter 2
  bgm_hoshi_night: 12, bgm_tsugao: 10, bgm_boss_yobimodoshi: 10.5, bgm_hoshi_morning: 12,
  // chapter 3
  bgm_umi_noon: 13, bgm_tsugaobin: 19, bgm_boss_nariosame: 8.5, bgm_hirugohan: 9,
  bgm_suizokukan: 16.5, bgm_tsugao_hall: 10, bgm_boss_madamada: 8.5, bgm_jingle_yakisoban: 11,
  bgm_boss_tsugao: 7.5, bgm_c3_ending: 9, bgm_c3_taikin: 8,
};

export const SE_TRIM: Record<string, number> = {
  se_cursor: 11, se_confirm: 5.5, se_cancel: 18, se_buzzer: 13.5, se_menu_open: 16.5, se_menu_close: 12.5,
  se_page: 20, se_slider: 15.5, se_save: 5, se_shop_buy: 13, se_coin: 12, se_count: 20.5, se_hp_tick: 19.5,
  se_item: 12.5, se_heal: 16.5, se_emote: 15, se_emote_question: 16, se_emote_sweat: 18.5, se_emote_light: 18,
  se_examine: 18.5, se_fushigi: 21, se_symbol_notice: 19.5, se_flip: 24.5, se_pen_write: 25.5, se_clock_flip: 12.5,
  se_step_asphalt: 17, se_step_grass: 18, se_step_sand: 21.5, se_step_gravel: 21, se_step_wood: 13,
  se_step_wood_bare: 16.5, se_step_tatami: 26.5, se_step_tile: 23.5, se_step_stone: 18, se_step_dirt: 18,
  se_step_metal: 14, se_step_kanenari: 14.5, se_door: 20.5, se_door_glass: 26.5, se_auto_door: 20.5,
  se_door_heavy: 15.5, se_door_small: 24, se_stairs: 16.5, se_shop_bell: 15.5, se_shop_shutter: 20, se_shutter: 21.5,
  se_chain: 10, se_shadow_swing: 22, se_crow: 25.5, se_coo: 15.5, se_cat: 27.5, se_dog_bark: 19.5,
  se_sparrow_a: 21.5, se_sparrow_b: 21, se_higurashi_call: 22.5, se_furin: 13, se_fry: 9.5, se_crossing_up: 20.5,
  se_train_pass: 23.5, se_train_far: 23.5, se_gacha: 19, se_panda_ride: 16, se_glint: 22, se_semi_hop: 23.5, se_cart_rattle: 26.5,
  se_umbrella_hop: 24.5, se_robot_bump: 22.5, se_kaitenyaki_stop: 17.5, se_keitora_stop: 21, se_keitora_go: 20.5, se_escalator_step: 16, se_rumble: 16.5,
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
  // chapter 2 (audioMixSuggest over the 第2章 groups)
  se_h_crossing_bell: 21.5, se_h_crossing_down: 18.5, se_h_train_brake: 24, se_h_train_idle: 28.5, se_h_train_door: 18, se_h_train_chime: 21.5,
  se_h_seiriken: 30, se_h_coin_box: 19.5, se_h_vinyl_door: 23, se_h_yunomi: 16, se_h_yunomi_pour: 26.5, se_h_tomato_catch: 17.5,
  se_h_lantern_set: 28, se_h_light_spread: 18, se_h_boukatou_on: 28, se_h_kaichu: 23, se_h_kakashi_turn: 33.5, se_h_keitora: 21,
  se_h_keitora_go: 20.5, se_h_chalk: 29, se_h_chalk_erase: 31.5, se_h_kairan: 29, se_h_shodoku: 19, se_h_hansuu: 27,
  se_h_cow_snort: 25.5, se_h_moo: 27, se_h_barn_light: 26, se_h_feed_cart: 28, se_h_feedbag: 21, se_h_gate_hook: 22.5,
  se_h_side_roll: 22, se_h_ripen: 21, se_h_pa_open: 17.5, se_h_pa_close: 18, se_h_pa_last: 1, se_h_morning_chime: -1.5,
  se_h_sune: 23, se_h_roll: 28.5, se_h_aokusai: 26, se_h_biri: 16.5, se_h_boar: 36, se_h_soil: 23.5,
  se_h_charin: 18, se_h_tiller: 28, se_h_stall: 27.5, se_h_tenko: 9, se_h_howl: 17.5, se_h_yofukashi: 12.5,
  se_h_ressha: 17.5, se_h_sukima: 21, se_h_amado: 22.5, se_h_yamabiko: 34.5, se_h_onamae: 16, se_h_tomato_glow: 19,
  se_h_dim: 25, se_h_otsukare: 27, se_h_bell_kon: 14, se_h_hamidashi: 17.5, se_step_sheet: 25, se_h_kakashi_hop: 19.5,
  se_h_tomato_rise: 22.5, se_h_sunrise: 20.5, se_h_bus_idle: 22, se_h_bus_door: 19, se_h_bus_depart: 26.5, se_h_bus_arrive: 25.5,
  se_hanamaru_draw: 27,
  se_h_ibiki: 31.5, se_h_acha: 36, se_h_esayose: 32, se_h_watercup: 24.5,
  se_dakoku: 21.5, se_mada_stamp: 24, se_lamp_click: 20, se_clock_restart: 11.5, se_clock_tick: 23.5,
  se_h_deli_put: 19.5, se_truck_aori: 21, se_truck_key: 28.5, se_yakiimo: 27, se_piichan_flap: 28.5,
  se_piichan_koko: 18, se_piichan_koke: 23, se_piichan_kuu: 25,
  // chapter 3 (audioMixSuggest over the 第3章 groups; the kite and the whistle stopped by their loudness ceiling)
  se_c3_title_wave: 29.5, se_c3_harigami: 32, se_c3_nidai_gata: 18, se_c3_shio: 36, se_c3_fender: 33, se_c3_kamome: 25.5, se_c3_tonbi: 25.5,
  se_c3_noren: 36, se_c3_siren_head: 10, se_c3_torobako: 36, se_c3_donburi: 24, se_c3_fue: 31.5, se_c3_himono: 36,
  se_step_wet: 18,
  // chapter 3, second period (audioMixSuggest: the town's over bgm_umi_noon, the fights and the hanko over bgm_battle)
  se_c3_noren_down: 28.5, se_c3_siren_full: 7, se_c3_siren_btn: 19.5, se_c3_clock_1201: 12.5, se_c3_goza: 36,
  se_c3_stairs_up: 16, se_c3_seri_bell: 23.5, se_c3_kori: 31, se_c3_fucho: 32, se_c3_seri_fuda: 29.5, se_c3_utta: 22,
  se_c3_kouika: 36, se_c3_hashi: 28, se_c3_otama: 36, se_c3_teishoku: 28.5, se_c3_nabe: 36, se_c3_futa: 30.5,
  se_c3_gochisou: 13, se_c3_flag: 33, se_c3_dive_in: 21.5, se_c3_dive_out: 33, se_c3_moguri_get: 24.5,
  se_c3_gusoku_eye: 31.5, se_c3_step_uw: 16, se_c3_lens_polish: 36, se_c3_lens_beam: 28.5, se_c3_part_koe: 6,
  se_c3_nefuda: 34, se_c3_wing: 36, se_c3_pump: 36, se_c3_signboard: 36, se_c3_gassho: 34, se_c3_nari_kaze: 16,
  se_c3_nari_yobu: 7, se_c3_part: 20, se_c3_hanko_float: 11.5, se_c3_itadakimasu: 27, se_c3_gochisousama: 24.5,
  se_c3_wana_m7: 8.5,
  // chapter 3, third period (audioMixSuggest: 旧水族館 over bgm_suizokukan, the fights over bgm_battle)
  se_c3_hajiku: 31, se_c3_chokin: 36, se_c3_fubuki: 36, se_c3_koe: 32.5, se_c3_koe_break: 36, se_c3_spatula: 12.5,
  se_c3_teppan: 11.5, se_c3_kosogeru: 33, se_c3_oomori: 15.5, se_piichan_big: 20, se_c3_aq_door: 36, se_c3_aq_ticket: 36,
  se_c3_aq_pa_chime: -1, se_c3_aq_denpyo: 32.5, se_c3_aq_hakushi: 36, se_c3_aq_ningyo: 34.5, se_c3_aq_glass: 36,
  se_c3_aq_nisshi: 36, se_c3_aq_esa_fuda: 29.5, se_c3_aq_esa_bell: 26.5, se_c3_aq_key: 30.5, se_c3_aq_akubi: 19,
  se_c3_aq_reizo: 26, se_c3_aq_hasso: 36, se_c3_aq_imo_waru: 36, se_c3_aq_card: 27.5, se_c3_aq_kachi: 28.5, se_c3_curtain: 36,
  // the fourth period (audioMixSuggest): 「よぶ」, みんなの はなまる, the ending; each person's
  // little sound after the pen (se_c3_e_*) sits 6 dB under the suggestion — an accent under the pen
  se_c3_yobu: 25, se_c3_minna_hanamaru: -8, se_c3_photo: 29, se_c3_mantle: 36, se_c3_nyukan: 20.5,
  se_c3_aq_bench: 30.5, se_c3_aq_cart: 33.5,
  se_c3_e_obaa: 30, se_c3_e_mamekichi: 15, se_c3_e_hoshi_mitsu: 13.5, se_c3_e_hoshi_gen: 30, se_c3_e_hoshi_fumi: 30,
  se_c3_e_hoshi_kucho: 9, se_c3_e_tsurumi: 30, se_c3_e_sae: 30, se_c3_e_ojii: 30, se_c3_e_tamotsu: 19.5,
  se_c3_e_tokio: 15, se_c3_e_master: 30, se_c3_e_madam: 13, se_c3_e_bu_body: 26, se_c3_e_maru: 28,
  se_c3_e_hoshi_tome: 29.5, se_c3_e_hoshi_sawako: 30, se_c3_e_hoshi_yoshie: 18, se_c3_e_jk: 28.5,
  se_c3_e_hoshi_busdriver: 10, se_c3_e_hoshi_traindriver: 30, se_c3_e_fudeno: 30, se_c3_e_photo_master: 28,
  se_c3_e_mizumaki: 18, se_c3_e_shun: 5.5, se_c3_e_gusokkun: 28.5, se_c3_e_yakisoban: 7.5,
};
export const VOICE_TRIM: Record<string, number> = {
  narr: 24, mother: 15, maruyama: 8, obaa: 15, mamekichi: 15.5, inui: 17, tsurumi: 16, sae: 17, jk: 15.5,
  chugaku: 15.5, postman: 11, madam: 17, girl: 16, kid: 17, ojii: 15, mizumaki: 14.5, shadow: 14, hato: 17.5,
  dog: 11.5, cat: 18, crow: 23, tv: 23.5, broadcast: 9.5, broadcast_child: 12.5, vending: 20.5, omukaemachi: 15.5,
  flip: 16.5, kanenari_voice: 15, default: 19,
  // ゆう（時計店。02 #69、audioMixSuggest）
  tokio: 13.5,
  // グソっ君（★2026-09-29 カネナリくん→グソっ君。audioMixSuggest、samples.ts の見本の台詞で）
  gusokkun: 13.5,
  // かずゆき（喫茶 初日の出。★2026-09-30 マスター→かずゆき）・ぶーさんの本体（02 #71。audioMixSuggest、
  // samples.ts の見本の台詞で。ものさし：tokio 13.5・h_mitsu 16・mother 15 は 表の値と 同じ）
  kazuyuki: 12.5, bu: 16.5,
  // マル（02 #65）・おぴぃ（02 #66）・よね・とよぞう（02 #67）：足したときに trim が
  // 入っておらず、ほかの声より 15〜19 dB 小さかった（audioMixSuggest、samples.ts の見本の台詞で）
  maru: 19, tamotsu: 15.5, yone: 17, toyozou: 11.5,
  // chapter 2
  h_train: 21, h_tetsuya: 19, yobimodoshi: 10, h_mujin: 27.5, h_gon: 11.5, broadcast_room: 15,
  tsugao: 19.5, dakoku: 14,
  // ツガオ便: set on their everyday lines (ポコシャさん's outburst ×1.8 and ヒロスケさん's laugh ride above)
  hirosuke: 16.5, pokosha: 13.5,
  h_driver: 17, h_kucho: 14, h_yoshie: 17, h_fumi: 14, h_mitsu: 16, h_gen: 12.5, h_tome: 16, h_sawako: 18,
  // chapter 3 (audioMixSuggest on samples.ts' everyday lines)
  c3_shokudo: 11, c3_jouren: 14.5, c3_seri: 14.5, c3_seri_deshi: 18, c3_sirenban: 19, c3_toudai: 16, c3_mago: 15,
  c3_kanshiin: 18, c3_himono_otto: 15, c3_himono_tsuma: 14, c3_tsuri: 14.5, c3_uketsuke: 16, c3_kid: 18.5,
  c3_kid_a: 18.5, c3_kid_b: 18, c3_kid_c: 17.5,
  nariosame: 6.5, okawarinabe: 17.5,
  // the third period: the variants keep their parent's trim so their own ×0.7 / ×1.4 is heard
  // (ポコシャ on the ceiling speakers: the PA's level +3 dB); 係長 2 dB under its suggestion (never frightening)
  pokosha_pa: 12, tsugao_omote: 19.5, gusokkun_yowai: 13.5, gusokkun_nurui: 13.5, kakaricho: 11.5,
};
export const AMB_TRIM: Record<string, number> = {
  amb_higurashi: 17, amb_still: 25, amb_s2_town: -1, amb_train_far: 0, amb_night_insects: 22.5, amb_fan: 16.5,
  amb_fridge: 20.5, amb_tv: 36.5, amb_clock_tick: 20, amb_oil: 22, amb_dryer: 18, amb_koban: 22.5,
  amb_fluorescent: 11.5, amb_fluorescent_flicker: 13.5, amb_kaitenyaki: 15.5, amb_mall_wind: 34.5, amb_kawabe: 32,
  amb_arcade: 38.5, amb_wind: 24,
  // chapter 2 (audioMixSuggest: heard over 星見台の夜 where each one plays; the
  // insects held at the town's night level, the barn's fans over its −18 dB
  // song and the train with no music at all set by ear, 53 10.2)
  amb_h_insects: 22, amb_h_kusa: 22, amb_h_tanada: 29.5, amb_h_mizu: 30, amb_h_wind: 33, amb_h_yama: 41,
  amb_h_hachi: 26.5, amb_h_fence: 29.5, amb_h_barn_out: 32, amb_h_barn: 16, amb_h_house: 27, amb_h_tomato: 21.5,
  amb_h_school: 28.5, amb_h_boukatou: 19, amb_h_tetsuya: 22, amb_h_train: 17, amb_h_pa_hum: 21, amb_h_dawn: 16, amb_tsugao_room: 19.5,
  amb_h_tsugaobin: 28,
  // chapter 3 (audioMixSuggest over bgm_umi_noon / bgm_tsugaobin / bgm_town_s0; the
  // beds that only sound from 12:01 — the birds, the boats, the breakwater, the
  // beach — calibrated at 12:01. The sea between its 12:01 value (17.5: the
  // waves) and its 12:00 one (38: the far swell alone would need it) — 12:00 is
  // meant to be nearly silent (10.2). The street outside the 食堂 at its cap)
  amb_c3_umi: 22, amb_c3_semi: 13, amb_c3_tori: 24, amb_c3_minato: 35.5, amb_c3_ichiba: 16.5, amb_c3_ichiba_out: 26,
  amb_c3_shokudo: 21.5, amb_c3_shokudo_out: 37, amb_c3_himono: 33.5, amb_c3_bouhatei: 22, amb_c3_kaisui: 22,
  amb_c3_mikan: 23.5, amb_c3_siren_hum: 20, amb_c3_siren_hold: 13, amb_c3_keitora: 9.5, amb_c3_hirumae: 17,
  // the second period's rooms (the lighthouse and the beach hut at their caps: quiet rooms by design)
  amb_c3_siren_room: 14.5, amb_c3_toudai: 28, amb_c3_uminoie: 33.5, amb_c3_suichu: 20,
  // 旧水族館 (63 10.2: very small beds; the ones already heard over their song stay at 0)
  amb_c3_aq_kan: 0, amb_c3_aq_diorama: 0, amb_c3_aq_shinkai: 0, amb_c3_aq_esa: 22.5, amb_c3_aq_souko: 0, amb_c3_aq_hall: 7.5,
  // クリア後の時間帯の床（05_postgame 4.3。audioMixSuggest、2026-10-14）。遠くの車は案の 44 から
  // −6（遠い物なので控えめに）
  amb_pg_suzume: 19, amb_pg_kuruma: 38, amb_pg_semi: 24, amb_pg_mushi: 8.5,
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
