// bgm_boss_nariosame — 中ボス2：ナリオサメ (63_ch3_audio 5.3). 126.
// The retiring noon siren that does not want to finish sounding, and ミナト
// who cannot lift his finger off the button. Not frightening: lonely and a
// little comic — the siren clinging to its own voice. Over the band its
// voice (ins_siren) climbs in long glissandi and is cut each time it gets to
// the top (the tail is sealed, 1.4: it never falls).
//
// Phase 1 (E minor, N1–N8): the tower's stopped clock tries to move every
// bar (drm_tower「コトン」, and a smaller one that falls back). Its 「正午の 音」
// (nari_rewind 1, sent by the battle) sends the song back two bars at the
// next bar with a tape swoop (−1200 cents → 0 in 150 ms).
// Phase 2 (after the first 「いただきます」, boss_phase 2: G major, N9–N16): the
// whole town claps on 2 and 4 instead of the snare (a second, looser hand
// under it), N13 is M9「いただきます」, the rewind no longer works (a bigger
// clap instead), and N16's siren is the first not to be cut — it runs on into
// N9 (the end foretold).
// Final phase (boss_phase 3): everything stops in 1.0 s; the battle then
// plays the full siren (playSirenFull) — not this song.
//
// Never in it (16.1): the town chime's answer, 星見台's morning chime, M7, M9′.

import { DRM, sirenNote } from '../instruments';
import { liveGraph, midiHz } from '../engine';
import { holdAmbience, setMusicParam } from '../music';
import { bass, drums, hits, melody, pads, type BarCtx, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
import { kireLayers } from './battle';
import { registerSong, score } from './common';

export const NARIOSAME_MML = `
@song bgm_boss_nariosame part=intro ins=ins_pad meter=4/4
NI1 Em             | -:16 |
NI2 B7sus4         | -:16 |

@song bgm_boss_nariosame part=lead ins=ins_lead_boss meter=4/4
N1  Em             | E5:4 F#5:4 G5:4 B5:4 |
N2  Cmaj7          | B5:8 A5:4 G5:4 |
N3  Am7            | A5:6 G5:2 E5:8 |
N4  B7             | D#5:8 F#5:8 |
N5  Em             | E5:4 G5:4 B5:4 E6:4 |
N6  Cmaj7          | D6:6 B5:2 G5:8 |
N7  Am7            | C6:4 B5:4 A5:4 F#5:4 |
N8  B7sus4         | E5:12 -:4 |
N9  G              | D5:4 E5:4 G5:4 A5:4 |
N10 Em7            | B5:8 A5:4 G5:4 |
N11 Cmaj7          | E5:6 D5:2 B4:8 |
N12 D7sus4         | A4:8 D5:8 |
N13 G              | G4:2 G4:2 A4:2 B4:2 D5:4 B4:4 |
N14 Em7            | E5:8 D5:8 |
N15 Cmaj7          | G5:4 E5:4 D5:4 E5:4 |
N16 D7             | F#5:12 -:4 |
`;

export const NARIOSAME_CHORDS = `
Em = E G B
B7sus4 = B E F# A
Cmaj7 = C E G B
Am7 = A C E G
B7 = B D# F# A
G = G B D
Em7 = E G B D
D7sus4 = D G A C
D7 = D F# A C
`;

export const nariosame = score(NARIOSAME_MML, NARIOSAME_CHORDS);

const LOOP1 = ['N1', 'N2', 'N3', 'N4', 'N5', 'N6', 'N7', 'N8'];
const LOOP2 = ['N9', 'N10', 'N11', 'N12', 'N13', 'N14', 'N15', 'N16'];
const BPM = 126;
const BEAT = 60 / BPM;

const p2 = (b: BarCtx) => b.p.boss_phase >= 2;
const live = (b: BarCtx) => !b.inIntro;

/**
 * The siren layer (5.3 table): a glissando on the song's part, cut in 80 ms
 * at the top (the tail is sealed). `semis` up from `base` in `riseBeats`,
 * held `holdBeats`, then cut — or, unsealed only in N16, faded instead.
 */
function siren(t: number, dest: AudioNode, base: number, semis: number, riseBeats: number, holdBeats: number, vol: number): void {
  sirenNote({ t, dest, f0: midiHz(base), semis, rise: riseBeats * BEAT, hold: holdBeats * BEAT, vol });
}

function nariosameDef(): SongDef {
  const parts: PartDef[] = [
    melody({ id: 'lead', ins: 'ins_lead_boss', bars: nariosame.part('lead'), o: (b) => ({ vol: 0.08, wave: p2(b) ? 'pulse25' : 'square' }), fx: { delay: { steps: 3, fb: 0.2, send: 0.14 } } }),
    // ---- the siren's voice over the band (never a tune: glissandi only)
    hits('siren', [
      // phase 1 (and the intro): N1 / N5 rise from E3 by 19 semitones over 6 beats, held to the end of the next bar, cut
      {
        when: (b, s) => s === 0 && !p2(b) && (b.label === 'N1' || b.label === 'N5' || b.label === 'NI1'),
        fn: (_b, t, rt) => siren(t, rt.input, 52, 19, 6, 2, 0.04),
      },
      // N4 / N8: from B2 up an octave in 2 beats, cut on beat 4
      {
        when: (b, s) => s === 0 && !p2(b) && (b.label === 'N4' || b.label === 'N8'),
        fn: (_b, t, rt) => siren(t, rt.input, 47, 12, 2, 1, 0.04),
      },
      // phase 2: only N16 — from G3 up an octave in 4 beats, and on into N9 (not cut: faded)
      {
        when: (b, s) => s === 0 && p2(b) && b.label === 'N16',
        fn: (_b, t, rt) => {
          const h = sirenNote({ t, dest: rt.input, f0: midiHz(55), semis: 12, rise: 4 * BEAT, hold: Infinity, vol: 0.03 });
          h.stop(t + 4 * BEAT + 0.9, 0.9);
        },
      },
    ]),
    pads({ id: 'pad', o: (b) => ({ vol: p2(b) ? 0.035 : 0.03 }), fx: { lp: 1400, q: 0.7 }, when: live }),
    bass({ id: 'bass', ins: 'ins_fm_bass', pattern: "R:4 R:4 5:4 R':4", o: { vol: 0.15 }, when: (b) => live(b) && !p2(b) }),
    bass({ id: 'slap', ins: 'ins_fm_slap', pattern: "R:4 R:4 5:4 R':4", when: (b) => live(b) && p2(b) }),
    drums({
      id: 'drums',
      kit: {
        drm_kick: (b) => (live(b) ? 'x.....x...x.....' : null),
        drm_snare_tight: (b) => (live(b) && !p2(b) ? '....x.......x...' : null),
        drm_hat_c: (b) => (live(b) ? 'x.x.x.x.x.x.x.x.' : null),
      },
      vel: { drm_hat_c: 0.6 },
    }),
    // ---- phase 2: the town's hands on 2 and 4 (a second, looser hand under them)
    hits('te', [
      {
        when: (b, s) => p2(b) && live(b) && (s === 4 || s === 12),
        fn: (b, t, rt) => {
          const big = (b.song.state.bigClap as number | undefined) ?? 0;
          const k = big > 0 ? 1.4 : 1;
          if (big > 0) b.song.state.bigClap = big - 1;
          DRM.drm_clap({ t, vel: 0.7 * k, dest: rt.input, rev: rt.rev, pan: -0.25 });
          const off = rt.song.g.offline ? 0.008 : (Math.random() * 2 - 1) * 0.015;
          DRM.drm_clap({ t: t + 0.015 + off, vel: 0.4 * k, dest: rt.input, rev: rt.rev, pan: 0.3 });
        },
      },
    ]),
    // ---- phase 1: the stopped tower clock tries to move each bar — 「コトン」, and a smaller one falling back
    hits('tokei', [
      {
        when: (b, s) => !p2(b) && live(b) && s === 0,
        fn: (_b, t, rt) => DRM.drm_tower({ t, vel: 0.6, dest: rt.input, rev: rt.rev, pan: 0.2 }),
      },
      {
        when: (b, s) => !p2(b) && live(b) && s === 2,
        fn: (_b, t, rt) => DRM.drm_tower({ t, vel: 0.3, dest: rt.input, rev: rt.rev, pan: 0.2 }),
      },
    ]),
    ...kireLayers(),
  ];
  return {
    id: 'bgm_boss_nariosame',
    title: '中ボス（ナリオサメ）',
    bpm: BPM,
    bars: nariosame.bars,
    intro: ['NI1', 'NI2'],
    loop: [...LOOP1, ...LOOP2],
    parts,
    gainDb: -1,
    // the tower's top: open air over the sea
    reverb: { len: 1.4, decay: 3.2, level: 0.24 },
    battle: true,
    setup(sp) {
      sp.state.bigClap = 0;
      padLp(sp, 0);
    },
    route(sp, next) {
      // stay inside the current phase's 8 bars
      if (next.intro) return;
      const phase2 = sp.params.boss_phase >= 2;
      if (!phase2 && next.i >= 8) return { intro: false, i: next.i - 8 };
      if (phase2 && next.i < 8) return { intro: false, i: next.i + 8 };
      return undefined;
    },
    onParam(sp, name, value, old) {
      if (name === 'boss_phase' && value === 2 && old < 2) {
        sp.state.phase2 = true;
        sp.jumpNext('N9');
        padLp(sp, 1.0, 2);
      }
      if (name === 'boss_phase' && value >= 3) stopAll(sp);
      if (name === 'nari_rewind' && value === 1 && old !== 1) {
        rewind(sp);
        // the song sets it back (61 1.9)
        if (!sp.g.offline) setTimeout(() => setMusicParam('nari_rewind', 0), 30);
      }
    },
  };
}

/** The pad opens with phase 2 (LP 1400 → 2200 Hz). */
function padLp(sp: SongPlayer, ramp: number, phase = sp.params.boss_phase): void {
  const f = sp.partRt('pad')?.state.filter as BiquadFilterNode | undefined;
  f?.frequency.setTargetAtTime(phase >= 2 ? 2200 : 1400, sp.g.ctx.currentTime, Math.max(0.01, ramp / 3));
}

/**
 * 「正午の 音」: phase 1 goes back two bars from the next one, with a tape
 * swoop (−1200 cents → 0 in 150 ms). Phase 2 does not go back: the next
 * clap is bigger instead.
 */
function rewind(sp: SongPlayer): void {
  if (sp.params.boss_phase >= 3 || sp.state.stopped) return;
  if (sp.params.boss_phase >= 2 || sp.state.phase2) {
    sp.state.bigClap = 2;
    return;
  }
  const pos = sp.position;
  if (pos.intro) return;
  // the bar being scheduled is pos.loopIndex; two bars back from the one after it
  const i = Math.max(0, Math.min(7, pos.loopIndex) - 1);
  sp.jumpNext(LOOP1[i]);
  const t = sp.g.ctx.currentTime;
  const d = sp.det.offset;
  const base = sp.baseDetune;
  d.cancelScheduledValues(t);
  d.setValueAtTime(base - 1200, t + 0.01);
  d.linearRampToValueAtTime(base, t + 0.16);
}

/** The final phase: every part fades in 1.0 s; the town's beds come back up as the music goes. */
function stopAll(sp: SongPlayer): void {
  if (sp.state.stopped) return;
  sp.state.stopped = true;
  const t = sp.g.ctx.currentTime;
  for (const rt of sp.parts) sp.partGain(rt.id, 0, 1.0, t);
  sp.haltAt = t + 1.1;
  const g = liveGraph();
  if (g && g === sp.g) holdAmbience(1, 1.0);
}

export const NARIOSAME_DEF = registerSong(nariosameDef());
