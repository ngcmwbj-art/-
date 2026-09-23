// bgm_town_s0 / s1 / s2 — 夕鳴町 (40_audio 5.3, 5.4).
// One score, three stage transforms: the town has to sound like the *same*
// town slowly going wrong (半音下がる、揺れる、音が抜ける、1拍戻る).

import { INS } from '../instruments';
import { bass, comp, drums, hits, melody, pads, type BarCtx, type PartDef, type SongDef } from '../sequencer';
import { DRM } from '../instruments';
import { registerSong, score } from './common';
import type { Chord } from '../theory';

export const TOWN_MML = `
@song bgm_town_s0 part=intro ins=ins_musicbox meter=4/4
I1  Cadd9          | E6:4 D6:4 G5:8 |
I2  Fmaj7          | A5:4 G5:4 E5:8 |

@song bgm_town_s0 part=lead ins=ins_lead_sq50 meter=4/4
A1  Cadd9          | G4:4 A4:4 C5:4 E5:4 |
A2  Fmaj7          | G5:6 E5:2 D5:8 |
A3  Em7            | E5:2 G5:2 E5:2 D5:2 C5:4 A4:4 |
A4  Am7・D7/F#     | G4:6 E4:2 A4:4 C5:4 |
A5  Dm9            | A4:4 C5:4 D5:4 E5:4 |
A6  E7(b13)        | D5:6 C5:2 B4:8 |
A7  Am7・Abmaj7    | E5:4 D5:2 C5:2 Eb5:4 C5:4 |
A8  G7sus4         | D5:12 -:4 |
B1  Fmaj7          | -:2 A4:2 C5:2 A4:2 G4:2 A4:2 C5:4 |
B2  G6             | D5:2 E5:2 D5:2 C5:2 A4:4 G4:4 |
B3  Em7            | -:2 G4:2 A4:2 G4:2 E4:2 D4:2 E4:4 |
B4  A7             | E5:4 C#5:2 A4:2 G4:4 E4:4 |
B5  Dm9            | F4:2 A4:2 C5:2 E5:2 D5:4 C5:4 |
B6  G7             | D5:3 E5:3 D5:2 B4:4 G4:4 |
B7  C6/E           | E5:2 G5:2 A5:4 G5:2 E5:2 C5:4 |
B8  Bb9            | D5:6 C5:2 Bb4:6 -:2 |

@song bgm_town_s0 part=bridge ins=ins_musicbox meter=4/4
C1  Abmaj7         | C6:8 G5:8 |
C2  Gm7・C7        | F5:4 D5:4 E5:8 |
C3  Fmaj7          | A5:6 G5:2 E5:8 |
C4  Fm6            | Ab5:8 F5:4 D5:4 |
C5  Em7            | G5:6 E5:2 D5:4 B4:4 |
C6  A7(b9)         | C#5:4 E5:4 G5:4 Bb5:4 |
C7  Dm7            | A5:8 F5:4 D5:4 |
C8  G7sus4・G7     | C5:8 B4:8 |
`;

export const TOWN_CHORDS = `
Cadd9 = C E G D
Fmaj7 = F A C E
Em7 = E G B D
Am7 = A C E G
D7/F# = D A C /F#
Dm9 = D F A C E
E7(b13) = E G# D C
Abmaj7 = Ab C Eb G
G7sus4 = G C D F
G6 = G B D E
A7 = A C# E G
G7 = G B D F
C6/E = C G A /E
Bb9 = Bb D F Ab C
Gm7 = G Bb D F
C7 = C E G Bb
Fm6 = F Ab C D
A7(b9) = A C# E G Bb
Dm7 = D F A C
`;

export const town = score(TOWN_MML, TOWN_CHORDS);

const A_B = (b: BarCtx) => b.section === 'A' || b.section === 'B';

function townDef(stage: 0 | 1 | 2): SongDef {
  const s2 = stage === 2;
  const s1 = stage === 1;
  const vibMul = stage >= 1 ? 2 : 1;
  const parts: PartDef[] = [
    // ---- lead (A, B)
    melody({
      id: 'lead',
      ins: 'ins_lead_sq50',
      bars: town.part('lead'),
      vol: 1,
      o: { vibMul, vol: 0.1 },
      when: A_B,
      fx: s2 ? { delay: { steps: 3, fb: 0.45, send: 0.42, bp: [800, 2400] } } : undefined,
      // 段階1: the record needle skips — A8 / B8 replay the head of A7 / B7
      remap: s1
        ? (b) => (b.label === 'A8' ? { label: 'A7', map: (s) => s % 4 } : b.label === 'B8' ? { label: 'B7', map: (s) => s % 4 } : null)
        : undefined,
      // 段階2: holes in memory — notes starting on beat 3 are gone
      keep: s2 ? (_b, e) => !(e.step >= 8 && e.step <= 11) : undefined,
    }),
    // ---- music box: intro and bridge melody
    melody({ id: 'mbox', ins: 'ins_musicbox', bars: [...town.part('intro'), ...town.part('bridge')], o: { vol: 0.085 } }),
    // ---- e-piano comping (A): each hit rings until the next
    comp({
      id: 'epiano',
      ins: 'ins_fm_epiano',
      rhythm: (b) => (b.section === 'A' ? 'x.....x...x.....' : null),
      notes: 'full',
      len: 'next',
      o: { vol: 0.045 },
      fx: { tremolo: { rate: 4.5, depth: 0.12 }, autopan: { rate: 0.21, depth: 0.25 } },
    }),
    // ---- marimba off-beats (B) — removed in 段階2
    ...(s2
      ? []
      : [
          comp({
            id: 'marimba',
            ins: 'ins_fm_marimba',
            rhythm: (b) => (b.section === 'B' ? '..x...x...x...x.' : null),
            notes: 'top3',
            len: 2,
            o: { vol: 0.05 },
            fx: { pan: 0.25 },
          }),
        ]),
    // ---- pads: intro, B (quiet), C
    pads({
      id: 'pad',
      when: (b) => b.section === 'I' || b.section === 'B' || b.section === 'C',
      o: (b) => ({ vol: b.section === 'B' ? 0.025 : 0.035 }),
      fx: { lp: 1400, q: 0.8, lfo: { rate: 0.15, depth: 300 } },
    }),
    // ---- 段階2: reverse pads swelling into every chord change
    ...(s2 ? [reversePads()] : []),
    // ---- bass
    bass({
      id: 'bass',
      ins: 'ins_fm_bass',
      pattern: (b) => (s2 ? 'R:8 5:8' : b.section === 'C' ? 'R:16' : "R:6 5:2 R':4 5:4"),
      when: (b) => b.section !== 'I',
      fx: { hp: 38 },
    }),
    bass({ id: 'sub', ins: 'ins_sub', pattern: 'R:16', when: (b) => b.section === 'I' }),
    // ---- drums
    drums({
      id: 'drums',
      kit: s2
        ? { drm_kick_soft: (b) => (b.section === 'I' ? null : 'x...............'), drm_rim: (b) => (b.section === 'I' ? null : '............x...') }
        : {
            drm_kick_soft: (b) => (A_B(b) ? 'x.........x.....' : b.section === 'C' ? 'x...............' : null),
            drm_snare_brush: (b) => (A_B(b) ? '..g.x...g...x..g' : null),
            drm_shaker: (b) => (A_B(b) ? 'XgxgXgxgXgxgXgxg' : b.section === 'C' ? 'x.x.x.x.x.x.x.x.' : null),
          },
      vel: { drm_shaker: s1 ? 0.5 : 1, drm_kick_soft: 1.35 },
    }),
    hits('fx', [
      // the triangle at A1: a hint of the chime to come
      { when: (b, s) => b.label === 'A1' && s === 0, fn: (b, t, rt) => DRM.drm_triangle({ t, vel: 1, vol: 0.015, dest: rt.input, rev: rt.rev }) },
      // C8 beat 4: reverse cymbal back into A
      {
        when: (b, s) => b.label === 'C8' && s === 12,
        fn: (b, t, rt) => DRM.drm_revcym({ t, vel: 1, dest: rt.input, rev: rt.rev, len: b.time(16) - t }),
      },
    ]),
  ];
  return {
    id: `bgm_town_s${stage}`,
    title: ['町・段階0「ふつう」', '町・段階1「停止」', '町・段階2「忘却」'][stage],
    bpm: 92,
    swing: { kind: '16', amount: 0.56 },
    bars: town.bars,
    intro: stage === 0 ? ['I1', 'I2'] : [],
    loop: ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8', 'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8'],
    parts,
    gainDb: -3,
    reverb: { len: 1.4, decay: 3.4, level: 0.28 },
    fixedStage: stage,
    tempo: () => (s2 ? 83 : 92),
    setup(sp) {
      // 段階2: the second hand slips back — B4 and C4 repeat their last beat (5/4)
      if (s2) sp.state.repeatTail = new Set(['B4', 'C4']);
    },
  };
}

/** ins_pad_reverse: each chord change is approached by the next chord swelling in backwards. */
export function reversePads(vol = 0.04): PartDef {
  return {
    id: 'revpad',
    fx: { lp: 2600 },
    step(b, src, actual, rt) {
      const [cs, ce] = b.chordSpan(src);
      if (src !== cs) return;
      let next: Chord | undefined = b.def.chords[b.chordIndex(src) + 1]?.chord;
      if (!next && b.nextLabel) next = b.song.def.bars.get(b.nextLabel)?.chords[0]?.chord;
      if (!next) return;
      // swell over the second half of the current chord
      const startStep = cs + Math.floor((ce - cs) / 2);
      const t = b.time(actual + (startStep - src));
      const tEnd = b.time(actual + (ce - src));
      const pcs = [...new Set(next.tones)].slice(0, 4);
      const voicing = pcs.map((pc) => 55 + ((pc - 55) % 12 + 12) % 12).sort((a, c) => a - c);
      for (const m of voicing) INS.ins_pad_reverse({ t, midi: m, dur: tEnd - t, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det, o: { vol } });
    },
  };
}

export const TOWN_DEFS = ([0, 1, 2] as const).map((s) => registerSong(townDef(s)));
