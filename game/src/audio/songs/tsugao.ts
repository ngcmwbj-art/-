// bgm_tsugao — ツガオの部屋 (53_ch2_audio 5.7). The scene after 「つづく」 at
// the end of chapter 2 (50 10.16 cut 7): in the back of an old office, the
// boss of まだまだ団 hears calmly how 夕鳴町 and 星見台 "went wrong". Weight,
// never menace, and a little comical — he ends up falling asleep. The first
// look at chapter 3's villain, so the id carries no chapter letter.
//
// The tune is in the bass: M7, D3 E♭3 D3 A2 (+1 −1 −5), a slow tilt of the
// head and settling back into the chair — only in T1 and T5. No pad, no high
// tune: the room sounds dark and small. Dark is not the same as unheard,
// though: a phone plays nothing under ~500 Hz, and a song of bass and sub
// alone would be four marimba notes and the clocks there. So the fretless has
// a grit layer — the same line through a waveshaper, only what lies between
// 250 Hz and 2.2 kHz, 5 LU under it — the growl of an old amp in a small
// office, which carries the tune on any speaker without adding a note. The
// D2 pedal is low and short-lived: it leaves the bars whose harmony moves
// off D (T6–T8), where it would beat against F2, E2 and A2. The wall clocks' second hands are the
// beat, and only once they are running again (the `clock` param, set by
// amb_tsugao_room's 'tick'): 夕鳴町's "チッ、タッ" (the clock of オムカエマチ)
// on the quarters, then 星見台's "コツ" (ヨビモドシ's microphone) on the
// off-beats of 2 and 4. No chime ever (53 1.4: the towns' chimes are not
// collected — the clocks show the link with their second hands only).

import { DRM, INS } from '../instruments';
import { dbToGain } from '../engine';
import { songGainDb } from '../mix';
import { hits, melody, pads, type BarCtx, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
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
    melody({ id: 'bass', ins: 'ins_fm_fretless', bars: tsugao.part('bass'), o: { vol: 0.1, index: 1.8, lp: 2200 }, gate: 1 }),
    // ---- its grit: the same line, driven, 250 Hz – 2.2 kHz (what a laptop or a phone plays of it)
    melody({ id: 'bass_grit', ins: 'ins_fm_fretless', bars: tsugao.part('bass'), o: { vol: 0.04, index: 3.2, lp: 2600, drive: 3 }, gate: 1, fx: { hp: 250, lp: 2200, air: -6 } }),
    // ---- the answering shrug: two marimba notes ("ぽこ、ぽこ")
    melody({ id: 'marimba', ins: 'ins_fm_marimba', bars: tsugao.part('marimba'), o: { vol: 0.05 } }),
    // ---- the D2 pedal under T1–T5 (T6–T8 move off D: F2, E2, A2 would beat against it)
    hits('sub', [
      {
        when: (b, s) => s === 0 && !/^T[678]$/.test(b.label),
        fn: (b, t, rt) => INS.ins_sub({ t, midi: 38, dur: b.time(b.steps) - t, vel: 1, dest: rt.input, det: rt.song.det, o: { vol: 0.03 } }),
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
    // 05_postgame 10.2（シークレットエンディングの1枚絵。仮）：pg_shizuka 1 は静かな形 —
    // 夕方の公園で寝ぼけたツガオ：フレットレスは引いて、マリンバの「ぽこ、ぽこ」と、
    // 動きだした2つの町の時計（clock 2）が前に。M7 は A2 で止まったまま（M7′ の封印はそのまま）
    setup(sp) {
      if (sp.params.pg_shizuka === 1) tsugaoShizuka(sp, true, 0);
    },
    onParam(sp, name, value, old) {
      if (name === 'pg_shizuka' && value !== old) tsugaoShizuka(sp, value === 1, (60 / 72) * 4);
    },
  };
}

const TSUGAO_SHIZUKA: Record<string, number> = { bass: 0.55, bass_grit: 0.8, sub: 0.4 };

function tsugaoShizuka(sp: SongPlayer, on: boolean, ramp: number): void {
  const t = sp.g.ctx.currentTime;
  sp.out.gain.setTargetAtTime(dbToGain(songGainDb(sp.def.id, sp.def.gainDb) + (on ? -2 : 0)), t, Math.max(0.005, ramp) / 3);
  for (const [id, k] of Object.entries(TSUGAO_SHIZUKA)) sp.partGain(id, on ? k : 1, Math.max(0.005, ramp), t);
}

export const TSUGAO_DEF = registerSong(tsugaoDef());

// ---------------------------------------------------------------------------
// bgm_tsugao_hall — 大水槽のホール (63_ch3_audio 5.6). The same song as
// bgm_tsugao, grown long (T9–T16) for the big empty tank: ツガオ on the bench
// in a suit, talking like the boss of a 任侠 family. M7 three times (T1, T5,
// T13), never landing on D2 after it (M7′ is sealed). Not frightening: the
// weight is the low bass and the slow gaps. The marimba's 「ぽこ、ぽこ」 stays
// (he is the same man who handed out vegetables in the village). No clocks
// here; a pad in T9–T16 only (the room is big). The first fight against him
// does not change this song at all (5.6: he is not taking us seriously) —
// the battle keeps it playing, and stops it at a bar's end
// (stopBgmAtBarEnd) on 「……この程度じゃあ、寝てしまうわい。」.

export const TSUGAO_HALL_MML = `
@song bgm_tsugao_hall part=bass ins=ins_fm_fretless meter=4/4
T1  Dm7            | D3:4 Eb3:4 D3:4 A2:4 |
T2  Gm7            | G2:8 Bb2:4 D3:4 |
T3  Bbmaj7         | Bb2:4 C3:4 D3:4 F3:4 |
T4  A7(b9)         | A2:8 Bb2:4 A2:4 |
T5  Dm7            | D3:4 Eb3:4 D3:4 A2:4 |
T6  Gm7            | G2:8 F2:4 D2:4 |
T7  Em7(b5)        | E2:8 G2:4 Bb2:4 |
T8  A7(b9)         | A2:16 |
T9  Bbmaj7         | Bb2:8 A2:4 F2:4 |
T10 Gm7            | G2:8 D3:8 |
T11 Em7(b5)        | E2:4 G2:4 Bb2:4 D3:4 |
T12 A7(b9)         | C#3:8 A2:8 |
T13 Dm7            | D3:4 Eb3:4 D3:4 A2:4 |
T14 Bbmaj7         | Bb2:8 F2:8 |
T15 Gm7            | G2:4 A2:4 Bb2:4 C3:4 |
T16 A7(b9)         | A2:16 |

@song bgm_tsugao_hall part=marimba ins=ins_fm_marimba meter=4/4
T2  Gm7            | -:12 D5:2 G4:2 |
T4  A7(b9)         | -:12 E5:2 A4:2 |
T6  Gm7            | -:12 Bb4:2 G4:2 |
T8  A7(b9)         | -:12 C#5:2 A4:2 |
T10 Gm7            | -:12 D5:2 G4:2 |
T12 A7(b9)         | -:12 E5:2 A4:2 |
T14 Bbmaj7         | -:12 Bb4:2 G4:2 |
T16 A7(b9)         | -:12 C#5:2 A4:2 |
`;

const hall = score(TSUGAO_HALL_MML, TSUGAO_CHORDS);
export const TSUGAO_HALL_LOOP = Array.from({ length: 16 }, (_, i) => `T${i + 1}`);

function tsugaoHallDef(): SongDef {
  const parts: PartDef[] = [
    melody({ id: 'bass', ins: 'ins_fm_fretless', bars: hall.part('bass'), o: { vol: 0.1, index: 1.8, lp: 2200 }, gate: 1 }),
    melody({ id: 'bass_grit', ins: 'ins_fm_fretless', bars: hall.part('bass'), o: { vol: 0.04, index: 3.2, lp: 2600, drive: 3 }, gate: 1, fx: { hp: 250, lp: 2200, air: -6 } }),
    melody({ id: 'marimba', ins: 'ins_fm_marimba', bars: hall.part('marimba'), o: { vol: 0.05, rev: 0.3 } }),
    // the D2 pedal only where the harmony sits on D (T1–T5, T13)
    hits('sub', [
      {
        when: (b, s) => s === 0 && /^T([1-5]|13)$/.test(b.label),
        fn: (b, t, rt) => INS.ins_sub({ t, midi: 38, dur: b.time(b.steps) - t, vel: 1, dest: rt.input, det: rt.song.det, o: { vol: 0.03 } }),
      },
    ]),
    // the big room: a dark pad in the second half only
    pads({ id: 'pad', o: { vol: 0.02 }, fx: { lp: 900, q: 0.6 }, when: (b: BarCtx) => b.num >= 9, lo: 50, hi: 66 }),
  ];
  return {
    id: 'bgm_tsugao_hall',
    title: '大水槽のホール',
    bpm: 72,
    bars: hall.bars,
    intro: [],
    loop: TSUGAO_HALL_LOOP,
    parts,
    gainDb: -6,
    // the empty great tank (suizoku, sent a little more: 0.4)
    reverb: { len: 2.8, decay: 2.6, level: 0.36, hp: 220 },
  };
}

export const TSUGAO_HALL_DEF = registerSong(tsugaoHallDef());
