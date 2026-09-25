// bgm_midboss — おじぎ自販機 (40_audio 5.8). The battle theme a whole tone up
// and faster; every fourth bar is a 7/8 "bow" where the whole band dips two
// semitones and lands back with a thud. C is the vending machine's hold music.

import { DRM, INS } from '../instruments';
import { bass, comp, drums, hits, melody, type BarCtx, type PartDef, type SongDef } from '../sequencer';
import { BATTLE_LOOP, SLAP_A, battle, hat8, hatOrCricket, kireAware, kireLayers, night } from './battle';
import { chimeQuote, registerSong, score, transposedBars } from './common';

export const MIDBOSS_MML = `
@song bgm_midboss part=lead ins=ins_lead_p25 meter=4/4
A4  [7/8] D6       | A5:3 F#5:3 D5:2 F#5:2 A5:2 B5:2 |
A8  [7/8] F#7(#9)  | A5:4 A#5:4 E5:4 C#5:2 |
B4  [7/8] Em7      | G5:6 F#5:2 E5:6 |
B8  [7/8] B7sus4・B7 | E5:4 F#5:4 D#5:4 F#5:2 |

@song bgm_midboss part=intro ins=ins_lead_p12 meter=4/4
MI1 Em             | E6:1 B5:1 G5:1 E5:1 E6:1 B5:1 G5:1 E5:1 E6:1 B5:1 G5:1 E5:1 E6:1 B5:1 G5:1 E5:1 |
MI2 [7/8] Em       | -:14 |

@song bgm_midboss part=vending ins=ins_lead_p12 meter=4/4
C1  Cmaj7          | E6:1 D6:1 B5:1 G5:1 E5:4 G5:2 B5:2 E6:4 |
C2  D              | F#6:1 E6:1 D6:1 A5:1 F#5:4 A5:2 D6:2 F#6:4 |
C3  Bm7            | D6:4 B5:4 A5:4 F#5:4 |
C4  Em             | G5:8 E5:8 |
C5  Am9            | C6:1 B5:1 A5:1 E5:1 C5:4 E5:2 A5:2 B5:4 |
C6  D9             | C6:1 A5:1 F#5:1 D5:1 E5:4 F#5:2 A5:2 C6:4 |
C7  Gmaj7          | B5:4 D6:4 F#6:8 |
C8  B7(b13)        | G6:4 F#6:4 D#6:4 A5:4 |
`;

export const MIDBOSS_CHORDS = `
D6 = D F# A B
F#7(#9) = F# A# C# E A
Em7 = E G B D
B7sus4 = B E F# A
B7 = B D# F# A
Cmaj7 = C E G B
D = D F# A
Bm7 = B D F# A
Em = E G B
Am9 = A C E G B
D9 = D F# A C E
Gmaj7 = G B D F#
B7(b13) = B D# A G
`;

const mid = score(MIDBOSS_MML, MIDBOSS_CHORDS);

// The hold music's LED chime: over C4's held E5 the machine asks the town
// question in E minor (D–E–G–B, the same +2 +3 +4 climb) and never answers.
const MID_CHIME = chimeQuote(`
@song bgm_midboss part=chime ins=ins_fm_vibes meter=4/4
C4  Em             | -:8 D6:2 E6:2 G6:2 B6:2 |
`);
const OVERRIDE = new Set(['A4', 'A8', 'B4', 'B8']);

const bars = new Map(mid.bars);
transposedBars(
  battle.bars,
  BATTLE_LOOP.filter((l) => l[0] !== 'C' && !OVERRIDE.has(l)),
  2,
  bars,
);

const is78 = (b: BarCtx) => b.def.steps === 14;
/** Tetsuya resting in the night version (53 6.4). */
const resting = (b: BarCtx) => night(b) && b.p.h_rest === 1;

function midbossDef(): SongDef {
  const kireUp = (b: BarCtx) => (b.p.kire >= 3 ? 12 : 0);
  const AB = (b: BarCtx) => b.section === 'A' || b.section === 'B';
  const parts: PartDef[] = [
    melody({
      id: 'lead',
      ins: 'ins_lead_p25',
      bars: battle.part('lead').filter((b) => b.label !== 'BI2'),
      transpose: 2,
      o: { vol: 0.09 },
      when: (b) => AB(b) && !OVERRIDE.has(b.label),
      fx: { delay: { steps: 3, fb: 0.22, send: 0.16 } },
    }),
    melody({ id: 'lead78', ins: 'ins_lead_p25', bars: mid.part('lead'), o: { vol: 0.09 } }),
    melody({ id: 'roulette', ins: 'ins_lead_p12', bars: mid.part('intro'), o: { vol: 0.06 }, gate: 0.6 }),
    melody({ id: 'vending', ins: 'ins_lead_p12', bars: mid.part('vending'), o: { vol: 0.07 }, gate: 0.85, fx: { delay: { steps: 3, fb: 0.3, send: 0.2 } } }),
    melody({ id: 'chime', ins: 'ins_fm_vibes', bars: MID_CHIME, o: { vol: 0.035, rev: 0.35 }, fx: { lp: 7000 } }),
    comp({ id: 'epiano', ins: 'ins_fm_epiano', rhythm: (b) => (b.section === 'C' ? 'x.....x...x.....' : null), notes: 'full', len: 'next', o: { vol: 0.045 } }),
    comp({
      id: 'stab',
      ins: 'ins_fm_brass',
      rhythm: (b) => (b.section === 'A' ? 'x..x..x...x.....' : b.section === 'B' ? '..x...x...x...x.' : null),
      notes: 'top3',
      len: 2,
      gate: 0.6,
      o: { vol: 0.05 },
    }),
    // MI1: slap E2 eighths under the roulette; MI2: E1 held under the thuds
    hits('intro_bass', [
      {
        when: (b, s) => b.label === 'MI1' && s % 2 === 0,
        fn: (b, t, rt) => INS.ins_fm_slap({ t, midi: 40, dur: b.stepDur * 1.7, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det }),
      },
      {
        when: (b, s) => b.label === 'MI2' && s === 0,
        fn: (b, t, rt) => INS.ins_fm_slap({ t, midi: 28, dur: b.stepDur * 7.5, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det }),
      },
    ]),
    kireAware(bass({ id: 'bass', ins: 'ins_fm_slap', pattern: SLAP_A, when: (b) => b.section !== 'MI', transpose: kireUp })),
    kireAware(drums({
      id: 'drums',
      kit: {
        // 53 5.5: while Tetsuya rests (h_rest) his engine is off — no kick either
        drm_kick: (b) => (b.section === 'MI' || resting(b) ? null : AB(b) ? 'x.....x...x..x..' : 'x.......x.......'),
        drm_snare_tight: (b) => (b.section === 'MI' ? null : AB(b) ? '....x..g....x..g' : '....x.......x...'),
        ...hatOrCricket((b) => (b.section === 'MI' ? null : hat8(b))),
      },
      vel: { drm_kick: 1.1 },
      aware: ['h_rest'],
    })),
    // 星見台の夜 (53 5.5): no cowbell in a cattle village — the walking tractor's
    // air-cooled "ドッ" on the same hits, sagging with the bow (an engine about
    // to stall, catching again)
    hits(
      'engine',
      [
        {
          when: (b, s) => night(b) && !resting(b) && (b.section === 'C' ? s % 4 === 0 : is78(b) ? [0, 3, 6, 10].includes(s) : b.section !== 'MI' && s === 0),
          fn: (_b, t, rt) => DRM.drm_putt({ t, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det }),
        },
      ],
      1,
      { aware: ['h_rest'] },
    ),
    hits('bow', [
      // the vending machine's "コン" (cowbell)
      {
        when: (b, s) => !night(b) && (b.section === 'C' ? s % 4 === 0 : is78(b) ? [0, 3, 6, 10].includes(s) : b.section !== 'MI' && s === 0),
        fn: (b, t, rt) => INS.ins_fm_cowbell({ t, midi: 60, dur: 0.1, vel: 1, dest: rt.input, rev: rt.rev }),
      },
      // MI2: the machine thuds on 0 and 8
      {
        when: (b, s) => b.label === 'MI2' && (s === 0 || s === 8),
        fn: (_b, t, rt) => {
          DRM.drm_kick({ t, vel: 1, dest: rt.input, rev: rt.rev });
          DRM.drm_tom_low({ t, vel: 1, dest: rt.input, rev: rt.rev });
          DRM.drm_crash({ t, vel: 0.7, dest: rt.input, rev: rt.rev });
        },
      },
      // the bow: the last two steps of every 7/8 bar sag two semitones…
      {
        when: (b, s) => is78(b) && s === 12,
        fn: (b, t, rt) => {
          const p = rt.song.det.offset;
          const base = rt.song.baseDetune;
          const len = b.time(14) - t;
          const curve = new Float32Array(16);
          for (let i = 0; i < 16; i++) curve[i] = base - 200 * Math.pow(i / 15, 1.7);
          p.cancelScheduledValues(t);
          p.setValueAtTime(base, t);
          p.setValueCurveAtTime(curve, t + 0.001, Math.max(0.02, len - 0.004));
          rt.song.state.bowEnd = b.time(14);
        },
      },
      // …and the next downbeat lands with a thud
      {
        when: (b, s) => s === 0 && typeof b.song.state.bowEnd === 'number',
        fn: (b, t, rt) => {
          const p = rt.song.det.offset;
          p.setValueAtTime(rt.song.baseDetune, t);
          rt.song.state.bowEnd = undefined;
          if (!resting(b)) DRM.drm_kick({ t, vel: 1.2, dest: rt.input, rev: rt.rev });
          DRM.drm_tom_low({ t, vel: 1.2, dest: rt.input, rev: rt.rev });
        },
      },
    ]),
    ...kireLayers(),
  ];
  return {
    id: 'bgm_midboss',
    title: '中ボス（おじぎ自販機）',
    bpm: 160,
    bars,
    intro: ['MI1', 'MI2'],
    loop: BATTLE_LOOP,
    parts,
    gainDb: 0,
    reverb: { len: 1.1, decay: 3.4, level: 0.22 },
    battle: true,
  };
}

export const MIDBOSS_DEF = registerSong(midbossDef());
