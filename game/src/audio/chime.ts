// 夕鳴町の五時チャイム (40_audio 1.3, 9.6): the town PA chime, the
// "question" half (G4 A4 C5 E5) and — only at the ending — the "answer".

import { atTime } from './clock';
import { cur, hasGraph, noteMidi } from './engine';
import { chimeNote } from './instruments';
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
