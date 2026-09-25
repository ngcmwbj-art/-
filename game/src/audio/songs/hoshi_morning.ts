// bgm_hoshi_morning — 星見台の朝 (53_ch2_audio 5.4).
// The morning has come to the village. The dawn (two bars on a C pedal)
// repeats under the tomato rising, the sunrise and "……おはよう。" — nothing
// there can clash with the Kanenari bell (C with a major third) — until
// h_stage becomes 3; then the village's instruments play the morning chime
// once more, and the lantern sings the town's question with 星見台's answer
// in one breath: C D F A | F D C D | F.

import { DRM, INS } from '../instruments';
import { bass, comp, drums, hits, melody, pads, type BarCtx, type PartDef, type SongDef } from '../sequencer';
import { registerSong, score } from './common';

export const HOSHI_MORNING_MML = `
@song bgm_hoshi_morning part=dawn ins=ins_musicbox meter=4/4
MD1 Bbmaj9/C       | -:8 D6:8 |
MD2 C9sus4         | C6:8 -:8 |

@song bgm_hoshi_morning part=chime ins=ins_fm_vibes meter=4/4
MI1 Dm7/C          | A5:4 F5:4 D5:4 C5:4 |
MI2 F6/9           | D5:4 F5:12 |

@song bgm_hoshi_morning part=lead ins=ins_lantern meter=4/4
A1  Fmaj7          | C5:4 D5:4 F5:4 A5:4 |
A2  Dm7            | F5:4 D5:4 C5:4 D5:4 |
A3  Bbmaj7         | F5:12 -:4 |
A4  Gm7            | G5:6 A5:2 Bb5:4 A5:4 |
A5  Fmaj7/A        | C6:8 A5:4 F5:4 |
A6  Bbmaj7         | D6:6 C6:2 Bb5:4 A5:4 |
A7  Gm9            | G5:4 A5:4 Bb5:4 D6:4 |
A8  C9sus4・C7     | C6:8 Bb5:4 G5:4 |

@song bgm_hoshi_morning part=marimba ins=ins_fm_marimba meter=4/4
B1  Fmaj9          | A5:2 C6:2 A5:2 G5:2 F5:4 A5:4 |
B2  Am7            | E5:2 G5:2 E5:2 D5:2 C5:4 E5:4 |
B3  Bbmaj7         | D5:2 F5:2 A5:2 C6:2 Bb5:4 A5:4 |
B4  C7             | G5:2 E5:2 C5:2 E5:2 G5:4 Bb5:4 |
B5  Dm7            | A5:2 F5:2 D5:2 F5:2 A5:4 C6:4 |
B6  Gm7            | Bb5:2 A5:2 G5:2 D5:2 F5:4 G5:4 |
B7  Gm9/C          | F5:4 G5:4 A5:4 Bb5:4 |
B8  C9sus4・C7     | C6:8 -:4 E5:4 |
`;

export const HOSHI_MORNING_CHORDS = `
Bbmaj9/C = Bb D F A /C
C9sus4 = C F G Bb D
Dm7/C = D F A /C
F6/9 = F A C D G
Fmaj7 = F A C E
Dm7 = D F A C
Bbmaj7 = Bb D F A
Gm7 = G Bb D F
Fmaj7/A = F C E /A
Gm9 = G Bb D F A
C7 = C E G Bb
Fmaj9 = F A C E G
Am7 = A C E G
Gm9/C = G Bb D F A /C
`;

export const hoshiMorning = score(HOSHI_MORNING_MML, HOSHI_MORNING_CHORDS);

const LOOP = ['A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8'];

const dawn = (b: BarCtx) => b.section === 'MD';
const mi = (b: BarCtx) => b.section === 'MI';
const A = (b: BarCtx) => b.section === 'A';
const B = (b: BarCtx) => b.section === 'B';

function hoshiMorningDef(): SongDef {
  const parts: PartDef[] = [
    // ---- the lantern, calm now: the light no longer flickers much (±4 %)
    melody({ id: 'lead', ins: 'ins_lantern', bars: hoshiMorning.part('lead'), o: { vol: 0.08 }, gate: 0.94, fx: { tremolo: { rate: 0.8, depth: 0.04 } } }),
    // ---- the music box: the dawn, then an octave over A5–A8
    melody({ id: 'mbox', ins: 'ins_musicbox', bars: hoshiMorning.part('dawn'), o: { vol: 0.05, rev: 0.6 } }),
    melody({
      id: 'mbox_hi',
      ins: 'ins_musicbox',
      bars: hoshiMorning.part('lead'),
      transpose: 12,
      o: { vol: 0.05 },
      when: (b) => A(b) && b.num >= 5,
    }),
    // ---- the morning chime once more, on the village's vibraphone
    melody({ id: 'chime', ins: 'ins_fm_vibes', bars: hoshiMorning.part('chime'), o: { vol: 0.07, rev: 0.5 } }),
    // ---- B: the morning's chores — feeding, the greenhouse sides, the water gates
    melody({ id: 'marimba', ins: 'ins_fm_marimba', bars: hoshiMorning.part('marimba'), o: { vol: 0.08 } }),
    // ---- chords
    comp({
      id: 'epiano',
      ins: 'ins_fm_epiano',
      rhythm: (b) => (dawn(b) ? null : mi(b) ? 'x...............' : 'x.....x...x.....'),
      notes: 'full',
      len: 'next',
      o: { vol: 0.035 },
    }),
    // the dawn pad opens from 900 Hz to 1.8 kHz over the two bars
    pads({ id: 'pad_dawn', when: dawn, per: 'bar', o: { vol: 0.03, attack: 2.0, release: 2.0 }, fx: { lp: 900, q: 0.7 } }),
    pads({ id: 'pad', when: (b) => mi(b) || A(b), o: (b) => ({ vol: mi(b) ? 0.03 : 0.025, attack: 0.8, release: 1.2 }), fx: { lp: 1800, q: 0.7 } }),
    // ---- bass: the C pedal under the dawn, then the town's walking shape
    hits('pedal', [
      {
        when: (b, s) => dawn(b) && s === 0,
        fn: (b, t, rt) => INS.ins_sub({ t, midi: 36, dur: b.time(b.steps) - t, vel: 1, dest: rt.input, det: rt.song.det, o: { vol: 0.1 } }),
      },
    ]),
    bass({ id: 'bass', ins: 'ins_fm_bass', pattern: (b) => (mi(b) ? 'R:16' : "R:6 5:2 R':4 5:4"), when: (b) => !dawn(b), o: { index: 1.6, indexEnd: 0.5 } }),
    drums({
      id: 'drums',
      kit: {
        drm_shaker: (b) => (A(b) ? 'x.g.x.g.x.g.x.g.' : B(b) ? 'xgxgxgxgxgxgxgxg' : null),
        drm_kick_soft: (b) => (A(b) ? 'x.......x.......' : B(b) ? 'x.....x.x.......' : null),
        drm_rim: (b) => (B(b) ? '....x.......x...' : null),
      },
      vel: { drm_shaker: 0.5 },
    }),
    hits('deco', [{ when: (b, s) => b.label === 'MI2' && s === 0, fn: (_b, t, rt) => DRM.drm_triangle({ t, vel: 1, vol: 0.03, dest: rt.input, rev: rt.rev }) }]),
  ];
  return {
    id: 'bgm_hoshi_morning',
    title: '星見台の朝',
    bpm: 88,
    swing: { kind: '16', amount: 0.54 },
    bars: hoshiMorning.bars,
    intro: ['MD1', 'MD2', 'MI1', 'MI2'],
    loop: LOOP,
    parts,
    gainDb: -4,
    reverb: { len: 2.0, decay: 3.0, level: 0.3 },
    route(sp, next) {
      // the dawn repeats until h_stage is 3; then the next bar is MI1 (5.4).
      // Started when it is already morning: straight to MI1.
      if (!next.intro || next.i > 2) return;
      const morning = sp.params.h_stage >= 3;
      if (morning && next.i < 2) return { intro: true, i: 2 };
      if (!morning && next.i === 2) return { intro: true, i: 0 };
      return undefined;
    },
    onBar(sp, b) {
      if (!dawn(b)) return;
      const f = sp.partRt('pad_dawn')?.state.filter as BiquadFilterNode | undefined;
      if (!f) return;
      // 900 → 1800 Hz across MD1–MD2 (and again on each repeat)
      const end = b.t0 + b.steps * b.stepDur;
      f.frequency.cancelScheduledValues(b.t0);
      f.frequency.setValueAtTime(b.label === 'MD1' ? 900 : 1270, b.t0);
      f.frequency.exponentialRampToValueAtTime(b.label === 'MD1' ? 1270 : 1800, end);
    },
  };
}

export const HOSHI_MORNING_DEF = registerSong(hoshiMorningDef());
