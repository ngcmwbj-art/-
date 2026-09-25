// QA commands for chapter 2's sound (53_ch2_audio 16). Development only:
// registered from audio/content.ts (and the audio-only QA page) under
// import.meta.env.DEV, so `vite build` drops them.
//
//   __game.cmd.ch2Sealed()                → the sealed shapes in every song (16.1) and in every SE of chapter 2
//   __game.cmd.ch2Notes(id, o)            → the notes a song plays (per part, with note names), e.g. to check a
//                                           stage change: { params: { h_stage: 0 }, paramAt: [[6, 'h_stage', 1]] }
//   __game.cmd.ch2Roll(id, o)             → piano roll + spectrogram PNGs (data URLs) of a song, SE or ambience
//   __game.cmd.ch2Ids()                   → every chapter-2 id the design lists (19章) and whether it is registered
//   __game.cmd.ch2Hoshi(stage, variant)   → play 星見台 as the field would (song, beds, space, PA) in the live game

import { registerDebug } from '../debug';
import { activeAmbients, AMBIENCE_IDS } from './ambience';
import { CH2_AMBIENCE_IDS } from './ambience_ch2';
import { CH2_SE_GROUPS } from './sfx_ch2';
import * as A from './index';
import { sfxInfo, sfxTable, songTable, type SfxOpts } from './registry';
import { measure, pianoRoll, renderAmbient, renderSfx, renderSong, renderVoice, sealedCheck, spectrogram } from './report';
import type { PaMode } from './engine';
import type { Params } from './sequencer';
import { CLOSING_FOURTH_SHAPES, findSealedAnswer, findShape, MORNING_CHIME_SHAPE } from './theory';
import { VOICES } from './voices';

const NAMES = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
const midiOf = (f: number) => Math.round(69 + 12 * Math.log2(f / 440));
const nameOf = (m: number) => `${NAMES[((m % 12) + 12) % 12]}${Math.floor(m / 12) - 1}`;
const r2 = (x: number) => Math.round(x * 100) / 100;

/** The pitched line of a render: one note per onset (the top of a chord), in time order. */
function lineOf(notes: { t: number; freq: number; wave: string }[]): number[] {
  const byT = new Map<number, number>();
  for (const n of notes) {
    if (n.wave === 'noise' || n.freq < 60) continue;
    const k = Math.round(n.t * 100);
    byT.set(k, Math.max(byT.get(k) ?? -Infinity, midiOf(n.freq)));
  }
  return [...byT.entries()].sort((a, b) => a[0] - b[0]).map(([, m]) => m);
}

/** Every SE of chapter 2 (the 第2章 groups of sfxInfo). */
export function ch2SeIds(): string[] {
  return [...sfxInfo.entries()].filter(([, i]) => CH2_SE_GROUPS.includes(i.group)).map(([id]) => id);
}

/** The ids of 53 19章 (the design's index) — every one must be registered. */
export const CH2_INDEX = {
  bgm: ['bgm_hoshi_night', 'bgm_boss_yobimodoshi', 'bgm_hoshi_morning', 'bgm_tsugao', 'bgm_battle', 'bgm_midboss', 'bgm_night', 'bgm_jingle_victory', 'bgm_jingle_levelup', 'bgm_jingle_item', 'bgm_jingle_gameover', 'bgm_title_clear'],
  amb: [...CH2_AMBIENCE_IDS, 'amb_night_insects', 'amb_kawabe'],
  se: [
    'se_h_crossing_bell', 'se_h_crossing_down', 'se_h_train_brake', 'se_h_train_idle', 'se_h_train_door', 'se_h_train_chime', 'se_h_seiriken', 'se_h_coin_box',
    'se_h_vinyl_door', 'se_h_yunomi', 'se_h_tomato_catch', 'se_h_lantern_set', 'se_h_light_spread', 'se_h_boukatou_on', 'se_h_kaichu', 'se_h_kakashi_turn', 'se_h_keitora', 'se_h_keitora_go', 'se_h_chalk', 'se_h_chalk_erase', 'se_h_kairan', 'se_h_ibiki', 'se_h_acha',
    'se_h_shodoku', 'se_h_hansuu', 'se_h_cow_snort', 'se_h_moo', 'se_h_barn_light', 'se_h_feed_cart', 'se_h_feedbag', 'se_h_gate_hook', 'se_h_side_roll', 'se_h_ripen', 'se_h_esayose', 'se_h_watercup',
    'se_h_pa_open', 'se_h_pa_close', 'se_h_pa_last', 'se_h_morning_chime', 'se_pa_chime', 'se_pa_chime_end', 'se_clock_flip',
    'se_h_sune', 'se_h_roll', 'se_h_aokusai', 'se_h_biri', 'se_h_boar', 'se_h_soil', 'se_h_charin', 'se_h_tiller', 'se_h_stall',
    'se_h_tenko', 'se_h_howl', 'se_h_yofukashi', 'se_h_ressha', 'se_h_sukima', 'se_h_amado', 'se_h_yamabiko', 'se_h_onamae', 'se_h_tomato_glow', 'se_h_dim',
    'se_h_otsukare', 'se_h_bell_kon', 'se_h_hamidashi',
    'se_step_sheet', 'se_h_kakashi_hop', 'se_h_tomato_rise', 'se_h_sunrise', 'se_h_bus_idle', 'se_h_bus_door', 'se_h_bus_depart', 'se_h_bus_arrive',
    'se_dakoku', 'se_mada_stamp', 'se_lamp_click', 'se_clock_restart', 'se_clock_tick',
  ],
  voices: ['h_driver', 'h_train', 'h_kucho', 'h_yoshie', 'h_fumi', 'h_mitsu', 'h_gen', 'h_tome', 'h_sawako', 'h_tetsuya', 'yobimodoshi', 'h_mujin', 'h_gon', 'tsugao', 'dakoku', 'broadcast', 'flip', 'kanenari_voice', 'mother', 'tv', 'narr', 'sys'],
};

/** SE options that make a different sound (each is checked). */
const SE_VARIANTS: Record<string, SfxOpts[]> = {
  se_h_boar: [0, 1, 2].map((level) => ({ level })),
  se_h_tiller: [0, 1, 2, 3, 4, 5].map((level) => ({ level })),
  se_h_ressha: [0, 1].map((level) => ({ level })),
  se_h_tenko: ['D6', 'A5', 'F5'].map((note) => ({ note })),
  se_h_tomato_glow: [{}, { grade: 'kukkiri' }],
  se_h_otsukare: (['kasure', 'futsu', 'kukkiri'] as const).map((grade) => ({ grade })),
};

/**
 * 16.1: the sealed shapes. Songs by their written melodies (report.ts
 * sealedCheck); chapter 2's SEs by the notes they actually play. The morning
 * chime may sound only in se_h_morning_chime; the closing chime's fourth note
 * only in se_pa_chime_end.
 */
export async function ch2Sealed(): Promise<{ songs: string[]; sfx: string[]; checkedSfx: number }> {
  const out: string[] = [];
  let n = 0;
  for (const id of ch2SeIds()) {
    for (const opts of SE_VARIANTS[id] ?? [{}]) {
      const r = await renderSfx(id, opts, id === 'se_h_morning_chime' ? 8 : 4);
      n++;
      const seq = lineOf(r.notes);
      const tag = `${id}${Object.keys(opts).length ? JSON.stringify(opts) : ''}`;
      if (findSealedAnswer(seq) >= 0) out.push(`${tag}: the town's answer`);
      if (id !== 'se_h_morning_chime' && findShape(seq, MORNING_CHIME_SHAPE) >= 0) out.push(`${tag}: 星見台の朝のチャイム`);
      if (CLOSING_FOURTH_SHAPES.some((sh) => findShape(seq, sh) >= 0)) out.push(`${tag}: the closing chime's fourth note`);
    }
  }
  return { songs: sealedCheck(), sfx: out, checkedSfx: n };
}

export interface NotesOpts {
  seconds?: number;
  params?: Partial<Params>;
  paramAt?: [number, keyof Params, number][];
  /** Only these parts (default: every part, one render each). */
  parts?: string[];
  /** Only notes from this time on (s). */
  from?: number;
  /** At most this many notes per part. */
  max?: number;
}

/** The notes each part of a song plays: [t, note, dur, v]. */
export async function ch2Notes(id: string, o: NotesOpts = {}): Promise<Record<string, [number, string, number, number][]>> {
  const def = songTable.get(id);
  if (!def) return {};
  const out: Record<string, [number, string, number, number][]> = {};
  for (const p of def.parts) {
    if (o.parts && !o.parts.includes(p.id)) continue;
    const r = await renderSong(id, o.seconds ?? 12, { params: o.params, paramAt: o.paramAt, solo: [p.id] });
    const notes = r.notes
      .filter((x) => x.t >= (o.from ?? 0))
      .sort((a, b) => a.t - b.t)
      .map((x) => [r2(x.t), x.wave === 'noise' ? 'noise' : nameOf(midiOf(x.freq)), r2(x.dur), Math.round(x.vol * 10000) / 10000] as [number, string, number, number]);
    if (notes.length) out[p.id] = notes.slice(0, o.max ?? 80);
  }
  return out;
}

/** Piano roll and spectrogram of a song / SE / ambience render (data URLs), with its levels. */
export async function ch2Roll(
  id: string,
  o: { seconds?: number; params?: Partial<Params>; paramAt?: [number, keyof Params, number][]; kind?: 'song' | 'sfx' | 'amb'; sfxOpts?: SfxOpts; stage?: number; hStage?: number; solo?: string[] } = {},
) {
  const kind = o.kind ?? (id.startsWith('bgm_') ? 'song' : id.startsWith('amb_') ? 'amb' : 'sfx');
  const secs = o.seconds ?? (kind === 'sfx' ? 4 : 16);
  const r =
    kind === 'sfx'
      ? await renderSfx(id, o.sfxOpts ?? {}, secs)
      : kind === 'amb'
        ? await renderAmbient(id, secs, o.stage ?? 0, {}, {}, o.hStage ?? 0)
        : await renderSong(id, secs, { params: o.params, paramAt: o.paramAt, solo: o.solo });
  return { stats: measure(r.buffer, kind === 'song' ? 0.5 : 0), notes: r.notes.length, pianoRoll: pianoRoll(r.notes, r.buffer.duration), spectrogram: spectrogram(r.buffer) };
}

/** The blips a voice plays for a line: [t, note, dur] (pitched layers only), and its level. */
export async function ch2VoiceNotes(id: string, text?: string, pa?: PaMode) {
  const r = await renderVoice(id, text, {}, pa);
  const notes = r.notes
    .filter((x) => x.wave !== 'noise' && x.freq > 60)
    .sort((a, b) => a.t - b.t)
    .map((x) => [r2(x.t), nameOf(midiOf(x.freq)), r2(x.dur)] as [number, string, number]);
  return { stats: measure(r.buffer), notes };
}

/** Which of the design's ids (19章) are registered. */
export function ch2Ids() {
  const missing = {
    bgm: CH2_INDEX.bgm.filter((id) => !songTable.has(id)),
    amb: CH2_INDEX.amb.filter((id) => !AMBIENCE_IDS.includes(id)),
    se: CH2_INDEX.se.filter((id) => !sfxTable.has(id)),
    voices: CH2_INDEX.voices.filter((id) => !(id in VOICES)),
  };
  return { missing, counts: { bgm: CH2_INDEX.bgm.length, amb: CH2_INDEX.amb.length, se: CH2_INDEX.se.length, voices: CH2_INDEX.voices.length } };
}

/** The 4.2 table, as the field plays it (for listening in the live game). */
const ROOM_BEDS: Record<string, string[]> = {
  outdoor: ['amb_h_insects', 'amb_h_wind', 'amb_h_mizu'],
  house: ['amb_h_house', 'amb_h_tomato', 'amb_h_hachi'],
  barn: ['amb_h_barn'],
  school: ['amb_h_school', 'amb_h_insects'],
  hill: ['amb_h_insects', 'amb_h_wind'],
};
const ROOM_SPACE: Record<string, A.SpaceId> = { outdoor: 'yama', house: 'room', barn: 'barn', school: 'room', hill: 'yama' };

export function registerCh2QaCommands(): void {
  registerDebug('ch2Sealed', (() => ch2Sealed()) as never);
  registerDebug('ch2Notes', ((id: string, o?: NotesOpts) => ch2Notes(id, o)) as never);
  registerDebug('ch2Roll', ((id: string, o?: Parameters<typeof ch2Roll>[1]) => ch2Roll(id, o)) as never);
  registerDebug('ch2Ids', (() => ch2Ids()) as never);
  registerDebug('ch2VoiceNotes', ((id: string, text?: string, pa?: PaMode) => ch2VoiceNotes(id, text, pa)) as never);
  registerDebug('ch2Hoshi', ((stage = 0, variant = 'outdoor') => {
    A.unlockAudio();
    A.setMusicParam('h_stage', stage);
    A.setPaMode('yama');
    A.setSpace(ROOM_SPACE[variant] ?? 'yama');
    const beds = [...(ROOM_BEDS[variant] ?? ROOM_BEDS.outdoor)];
    if (variant === 'outdoor' && stage >= 1) beds.push('amb_h_yama');
    if (stage >= 2 && (variant === 'outdoor' || variant === 'hill')) beds.push('amb_h_pa_hum');
    for (const id of activeAmbients()) if (!beds.includes(id)) A.stopAmbient(id, 0.5);
    for (const id of beds) A.playAmbient(id, { fade: 1, vol: variant === 'school' && id === 'amb_h_insects' ? 0.35 : undefined, lp: variant === 'school' && id === 'amb_h_insects' ? 2000 : undefined });
    A.playBgm('bgm_hoshi_night', { fade: 1, variant });
    return { stage, variant, beds };
  }) as never);
}
