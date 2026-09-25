// bgm_tsugao — ツガオの部屋 (53_ch2_audio 5.7). The scene after 「つづく」 at
// the end of chapter 2 (50 10.16 cut 7): in the back of an old office, the
// boss of まだまだ団 hears calmly how 夕鳴町 and 星見台 "went wrong". Weight,
// never menace, and a little comical — he ends up falling asleep. The first
// look at chapter 3's villain, so the id carries no chapter letter.
//
// The tune is in the bass: M7, D3 E♭3 D3 A2 (+1 −1 −5), a slow tilt of the
// head and settling back into the chair — only in T1 and T5. No pad, no high
// tune: the room sounds dark and small. The wall clocks' second hands are the
// beat, and only once they are running again (the `clock` param, set by
// amb_tsugao_room's 'tick'): 夕鳴町's "チッ、タッ" (the clock of オムカエマチ)
// on the quarters, then 星見台's "コツ" (ヨビモドシ's microphone) on the
// off-beats of 2 and 4. No chime ever (53 1.4: the towns' chimes are not
// collected — the clocks show the link with their second hands only).

import { DRM, INS } from '../instruments';
import { hits, melody, type BarCtx, type PartDef, type SongDef } from '../sequencer';
import { registerSong, score } from './common';

export const TSUGAO_MML = `
@song bgm_tsugao part=bass ins=ins_fm_fretless meter=4/4
T1  Dm7            | D3:4 Eb3:4 D3:4 A2:4 |
T2  Gm7            | G2:8 Bb2:4 D3:4 |
T3  Bbmaj7         | Bb2:4 C3:4 D3:4 F3:4 |
T4  A7(b9)         | A2:8 Bb2:4 A2:4 |
T5  Dm7            | D3:4 Eb3:4 D3:4 A2:4 |
T6  Gm7            | G2:8 F2:4 D2:4 |
T7  Em7(b5)        | E2:8 G2:4 Bb2:4 |
T8  A7(b9)         | A2:16 |

@song bgm_tsugao part=marimba ins=ins_fm_marimba meter=4/4
T2  Gm7            | -:12 D5:2 G4:2 |
T4  A7(b9)         | -:12 E5:2 A4:2 |
T6  Gm7            | -:12 Bb4:2 G4:2 |
T8  A7(b9)         | -:12 C#5:2 A4:2 |
`;

export const TSUGAO_CHORDS = `
Dm7 = D F A C
Gm7 = G Bb D F
Bbmaj7 = Bb D F A
A7(b9) = A C# E G Bb
Em7(b5) = E G Bb D
`;

const tsugao = score(TSUGAO_MML, TSUGAO_CHORDS);

/** The clocks: 1 = 夕鳴町's is running, 2 = 星見台's too. */
const clock = (b: BarCtx) => b.p.clock;

function tsugaoDef(): SongDef {
  const parts: PartDef[] = [
    // ---- M7 in the bass register: the song's tune (legato, the fretless glides)
    melody({ id: 'bass', ins: 'ins_fm_fretless', bars: tsugao.part('bass'), o: { vol: 0.1 }, gate: 1 }),
    // ---- the answering shrug: two marimba notes ("ぽこ、ぽこ")
    melody({ id: 'marimba', ins: 'ins_fm_marimba', bars: tsugao.part('marimba'), o: { vol: 0.05 } }),
    // ---- the D2 pedal under it all
    hits('sub', [
      {
        when: (_b, s) => s === 0,
        fn: (b, t, rt) => INS.ins_sub({ t, midi: 38, dur: b.time(b.steps) - t, vel: 1, dest: rt.input, det: rt.song.det, o: { vol: 0.06 } }),
      },
    ]),
    // ---- the wall clocks, once they run again
    hits(
      'clock',
      [
        {
          // 夕鳴町: "チッ" on 1 and 3, "タッ" on 2 and 4
          when: (b, s) => clock(b) >= 1 && s % 4 === 0,
          fn: (_b, t, rt, a) => (a % 8 === 0 ? DRM.drm_tick : DRM.drm_tock)({ t, vel: 0.9, dest: rt.input, rev: rt.rev }),
        },
        {
          // 星見台: a small "コツ" on the off-beats of 2 and 4
          when: (b, s) => clock(b) >= 2 && (s === 6 || s === 14),
          fn: (_b, t, rt) => DRM.drm_mic_tap({ t, vel: 0.45, dest: rt.input, rev: rt.rev }),
        },
      ],
      1,
      { aware: ['clock'], fx: { hp: 300, lp: 5200 } },
    ),
  ];
  return {
    id: 'bgm_tsugao',
    title: 'ツガオの部屋',
    bpm: 72,
    bars: tsugao.bars,
    intro: [],
    loop: ['T1', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'T8'],
    parts,
    gainDb: -8,
    // a small dark room
    reverb: { len: 0.9, decay: 3.6, level: 0.2 },
  };
}

export const TSUGAO_DEF = registerSong(tsugaoDef());
