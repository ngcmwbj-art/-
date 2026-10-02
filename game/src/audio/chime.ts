// 夕鳴町の五時チャイム (40_audio 1.3, 9.6): the town PA chime, the
// "question" half (G4 A4 C5 E5) and — only at the ending — the "answer".

import { atTime } from './clock';
import { cur, dbToGain, hasGraph, noteMidi } from './engine';
import { chimeNote } from './instruments';
import { seTrim, trimOr1 } from './mix';
import { duck, duckAmbience } from './music';

export const CHIME_QUESTION = ['G4', 'A4', 'C5', 'E5'];
/** Sealed until the ending (1.3). Only playChimeMotif({notes: 8}) may use it. */
const CHIME_ANSWER = ['D5', 'C5', 'A4', 'C5'];

/** One PA chime note. */
export function chimeNoteAt(t: number, note: string | number, hold = 0.45, vol = 0.12, pitch = 1, detune = 0): void {
  if (!hasGraph()) return;
  const g = cur();
  g.pa.open(t);
  const midi = (typeof note === 'number' ? note : noteMidi(note)) + 12 * Math.log2(pitch);
  chimeNote(t, midi, g.pa.input, g.pa.detune, hold, vol, detune);
}

/** se_chime_cut: pitch sags a semitone while the PA (echoes + reverb) is gated off. */
export function chimeCut(at?: number): void {
  if (!hasGraph()) return;
  const g = cur();
  g.pa.cutNow(at ?? g.ctx.currentTime);
}

export interface ChimeMotifOpts {
  notes?: 4 | 8;
  gap?: number;
  cut?: boolean;
  cutAt?: number;
  lastHold?: number;
  onNote?: (i: number) => void;
}

/** 40_audio 9.6 playChimeMotif. Resolves when the last note has died away. */
export function playChimeMotif(opts: ChimeMotifOpts = {}): Promise<void> {
  if (!hasGraph()) return Promise.resolve();
  const g = cur();
  const n = opts.notes ?? 4;
  const gap = opts.gap ?? 0.45;
  const t0 = g.ctx.currentTime + 0.05;
  const seq = n === 8 ? [...CHIME_QUESTION, ...CHIME_ANSWER] : CHIME_QUESTION;
  let endT = t0;
  // the chime sits on top of everything (11.3: BGM −12 dB, ambience −6 dB)
  const total = gap * (seq.length - 1) + (n === 8 ? opts.lastHold ?? 2.0 : opts.cut ? opts.cutAt ?? 1.9 : 1.2);
  duck(0.25, 0.08, total, 0.8);
  duckAmbience(0.5, 0.3, total, 0.8);
  seq.forEach((note, i) => {
    const t = t0 + i * gap;
    const last = i === seq.length - 1;
    let hold = gap * 0.95;
    if (last) hold = n === 8 ? opts.lastHold ?? 2.0 : opts.cut ? 6 : 0.9;
    chimeNoteAt(t, note, hold);
    endT = Math.max(endT, t + hold + 0.8);
    if (opts.onNote) atTime(t, () => opts.onNote!(i));
  });
  if (opts.cut && n === 4) {
    const tc = t0 + (opts.cutAt ?? 1.9);
    chimeCut(tc);
    endT = tc + 0.1;
  }
  return new Promise((res) => atTime(endT, res));
}

// ---------------------------------------------------------------------------
// 星見台の朝のチャイム (53_ch2_audio 1.4, M6): the town's question walked
// backwards from its last note (A F D C) and home on the first three (C D F).
// Sealed until the ending: only this function and bgm_hoshi_morning sound it.

export const MORNING_CHIME = ['A5', 'F5', 'D5', 'C5', 'D5', 'F5'];

export interface MorningChimeOpts {
  /** Seconds between notes (default 0.55: a little slower than the town's 0.45 — morning air). */
  gap?: number;
  /** Hold of the last F5 (default 2.5 s; it releases over 0.9 s and the valley answers three times). */
  lastHold?: number;
  /** Called on each note (i = 0..5), in time with it (the ending brightens on note 0). */
  onNote?: (i: number) => void;
  /** Start time (ctx time; default now). */
  at?: number;
}

/**
 * The 5:00 chime of 星見台 (53 1.4): ins_chime through the PA's mountain
 * voicing, in tune (the morning is not out of tune), each note held 0.30 s.
 * The ambience leans back −6 dB while it rings (10.3). Resolves when the
 * last echo has died away.
 */
export function playMorningChime(opts: MorningChimeOpts = {}): Promise<void> {
  if (!hasGraph()) return Promise.resolve();
  const g = cur();
  // 星見台's old speaker, always (the chime only ever rings on the hill)
  if (g.pa.mode !== 'yama') g.pa.setMode('yama', 0.02);
  const gap = opts.gap ?? 0.55;
  const lastHold = opts.lastHold ?? 2.5;
  const t0 = Math.max(opts.at ?? g.ctx.currentTime, g.ctx.currentTime) + 0.05;
  const n = MORNING_CHIME.length;
  const ring = gap * (n - 1) + lastHold;
  // the same speaker, the same level as the broadcast chime (the SE's fader: mix.ts)
  const vol = 0.12 * trimOr1(seTrim('se_h_morning_chime'));
  duckAmbience(dbToGain(-6), 0.3, ring, 1.2);
  MORNING_CHIME.forEach((note, i) => {
    const t = t0 + i * gap;
    const last = i === n - 1;
    g.pa.open(t);
    chimeNote(t, noteMidi(note), g.pa.input, g.pa.detune, last ? lastHold : 0.3, vol, 0, last ? 0.9 : undefined);
    if (opts.onNote && !g.offline) atTime(t, () => opts.onNote!(i));
  });
  // the valley's three answers (1.5 s apart at most) and the speaker's reverb
  const endT = t0 + ring + 0.9 + 2.2;
  g.pa.wake(endT);
  if (g.offline) return Promise.resolve();
  return new Promise((res) => atTime(endT, res));
}
