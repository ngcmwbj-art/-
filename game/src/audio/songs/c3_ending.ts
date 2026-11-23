// bgm_c3_ending — the series' last song (63_ch3_audio 5.10). 84, G major, no
// swing. After the group photo (S31), home on the truck bed through 夕鳴町 at
// five (S32), the ordinary tomorrow (S33: ツガオ便 at 5 a.m., グソっ君 at
// たかし's plate) and 「おわり」. A warm forty seconds, never a tearjerker (the
// tears were S30's). The harbour harmonica sings; E9 is M9 (いただきます),
// E15 is M9′ (ごちそうさま); under E7 the bass says ヤキソバン's M10 once (A2
// A2 D3 E3). ツガオ便's marimba 「ぽこ、ぽこ」 on the fourth beat of E4, E8, E12.
//
// Sixteen bars twice, the second time ending on E16 (no loop):
//   1st: harmonica; pad from E9; drums from E5.
//   2nd: + the music box an octave up from E9 (chapter 1's title and ending
//        instrument); pad and drums all through; E16 a single triangle.
// variant → h_room: 'photo' / 'shashin' / 'kaeri' (0: S31 from the photo, both times) or 'asa' / 'ashita'
// (1: S33's ordinary tomorrow — straight to the second time, and たかし's
// plate under it: drm_jyu on the off-beat of 4 from E9). waitBar('E15') lands
// グソっ君's 「いってらっしゃい！」 on M9′.
//
// Never in it (16.1): the town chime's answer, 星見台's morning chime, M7.

import { DRM, INS } from '../instruments';
import { bass, comp, drums, hits, melody, pads, type BarCtx, type PartDef, type SongDef } from '../sequencer';
import { registerSong, score } from './common';

export const C3_ENDING_MML = `
@song bgm_c3_ending part=lead ins=ins_harmonica meter=4/4
E1  G              | D5:4 E5:4 G5:8 |
E2  Bm7            | F#5:8 D5:8 |
E3  Cmaj7          | E5:4 G5:4 B5:4 A5:4 |
E4  D7sus4         | A5:12 -:4 |
E5  Em7            | G5:6 E5:2 D5:8 |
E6  Cmaj7          | E5:4 D5:4 B4:8 |
E7  Am7            | C5:4 D5:4 E5:4 G5:4 |
E8  D7             | F#5:12 -:4 |
E9  G              | G5:2 G5:2 A5:2 B5:2 D6:4 B5:4 |
E10 Em7            | A5:8 G5:8 |
E11 Cmaj7          | D5:4 E5:4 G5:4 B5:4 |
E12 D              | A5:12 -:4 |
E13 Cmaj7          | G5:4 E5:4 D5:4 E5:4 |
E14 Bm7            | D5:8 G4:8 |
E15 Am7・D7        | D5:2 B4:2 A4:2 G4:2 A4:4 G4:4 |
E16 G              | G4:16 |

@song bgm_c3_ending part=m10 ins=ins_tri_bass meter=4/4
E7  Am7            | A2:4 A2:4 D3:4 E3:4 |
`;

export const C3_ENDING_CHORDS = `
G = G B D
Bm7 = B D F# A
Cmaj7 = C E G B
D7sus4 = D G A C
Em7 = E G B D
Am7 = A C E G
D7 = D F# A C
D = D F# A
`;

const en = score(C3_ENDING_MML, C3_ENDING_CHORDS);
const BARS = Array.from({ length: 16 }, (_, i) => `E${i + 1}`);

/** Which time through: 1 or 2 (set by the route from the bar's place). */
const pass = (b: BarCtx) => (b.data.pass as number | undefined) ?? 1;
const second = (b: BarCtx) => pass(b) === 2;
const ashita = (b: BarCtx) => b.p.h_room === 1;
const lastBar = (b: BarCtx) => second(b) && b.label === 'E16';

function c3EndingDef(): SongDef {
  const lead = en.part('lead');
  const parts: PartDef[] = [
    melody({ id: 'lead', ins: 'ins_harmonica', bars: lead, o: { vol: 0.08, rev: 0.22 }, gate: 0.95 }),
    // the second time: the music box an octave up from E9
    melody({ id: 'mbox', ins: 'ins_musicbox', bars: lead, transpose: 12, o: { vol: 0.04 }, when: (b) => second(b) && b.num >= 9 }),
    // ツガオ便's 「ぽこ、ぽこ」 on the fourth beat of E4, E8, E12
    hits('marimba', [
      {
        when: (b, s) => (b.label === 'E4' || b.label === 'E8' || b.label === 'E12') && (s === 12 || s === 14),
        fn: (b, t, rt, a) => {
          const c = b.chordAt(a);
          const root = 67 + ((c.root - 7 + 12) % 12);
          const fifth = root + 7 > 79 ? root - 5 : root + 7;
          INS.ins_fm_marimba({ t, midi: a === 12 ? fifth : root, dur: 0.22, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det, o: { vol: 0.045 } });
        },
      },
    ]),
    comp({ id: 'comp', ins: 'ins_fm_epiano', rhythm: 'x.......x.......', notes: 'top3', len: 8, o: { vol: 0.03 }, gate: 0.8, when: (b) => !lastBar(b) }),
    pads({ id: 'pad', o: { vol: 0.03 }, fx: { lp: 1800, q: 0.7 }, when: (b) => second(b) || b.num >= 9 }),
    bass({ id: 'bass', ins: 'ins_tri_bass', pattern: 'R:4 5:4 R:4 5:4', o: { vol: 0.14 }, when: (b) => b.label !== 'E7' && !lastBar(b) }),
    // E7: ヤキソバン's M10 in the bass, once a time through
    melody({ id: 'bass_m10', ins: 'ins_tri_bass', bars: en.part('m10'), o: { vol: 0.14 }, gate: 0.85 }),
    hits('bass_end', [{ when: (b, s) => lastBar(b) && s === 0, fn: (b, t, rt) => INS.ins_tri_bass({ t, midi: 43, dur: b.time(16) - t, vel: 1, dest: rt.input, det: rt.song.det, o: { vol: 0.13 } }) }]),
    drums({
      id: 'drums',
      kit: {
        drm_kick_soft: (b) => ((second(b) || b.num >= 5) && !lastBar(b) ? 'x.......x.......' : null),
        drm_snare_brush: (b) => ((second(b) || b.num >= 5) && !lastBar(b) ? '....x.......x...' : null),
        drm_shaker: (b) => ((second(b) || b.num >= 5) && !lastBar(b) ? 'x.x.x.x.x.x.x.x.' : null),
      },
      vel: { drm_kick_soft: 0.6, drm_snare_brush: 0.6, drm_shaker: 0.35 },
    }),
    // the very end: one triangle, left ringing (2 s)
    hits('triangle', [{ when: (b, s) => lastBar(b) && s === 0, fn: (_b, t, rt) => DRM.drm_triangle({ t, vel: 0.5, dest: rt.input, rev: rt.rev }) }]),
    // S33: たかし's plate, warm — on the off-beat of 4 from E9
    hits('jyu', [{ when: (b, s) => ashita(b) && b.num >= 9 && !lastBar(b) && s === 14, fn: (_b, t, rt) => DRM.drm_jyu({ t, vel: 0.4, dest: rt.input, rev: rt.rev, pan: 0.3 }) }]),
  ];
  return {
    id: 'bgm_c3_ending',
    title: '第3章 エンディング（シリーズの最後の曲）',
    bpm: 84,
    bars: en.bars,
    // twice through, no loop (the second time ends on E16)
    intro: [...BARS, ...BARS],
    loop: [],
    parts,
    gainDb: -3,
    reverb: { len: 1.4, decay: 3.2, level: 0.22 },
    variants: { shashin: 0, photo: 0, kaeri: 0, ashita: 1, asa: 1 },
    route(sp, next) {
      if (!next.intro) return;
      // 'ashita' starts on the second time through
      if (sp.params.h_room === 1 && next.i < 16) {
        sp.state.pass = 2;
        return { intro: true, i: next.i + 16 };
      }
      sp.state.pass = next.i >= 16 ? 2 : 1;
      return undefined;
    },
    onBar(sp, b) {
      b.data.pass = sp.state.pass ?? 1;
    },
  };
}

export const C3_ENDING_DEF = registerSong(c3EndingDef());
