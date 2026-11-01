// bgm_hirugohan — 防波堤の昼ごはん (63_ch3_audio 5.4). G major, 92, a light
// sixteenth swing. 12:01 at last: mats laid out on the breakwater and lunch
// for everyone (S13). One loop is one lunch: everyone says 「いただきます」 in
// H5 (M9) and, done eating, 「ごちそうさま」 in H15 (M9′ — this song only
// plays after 12:01, so the seal is already lifted). The harbour harmonica,
// a marimba comp, a walking bass and brushes.
//
// variant → h_room: 'minna' (the breakwater, S13 / S29: the people who came
// to あぜ道市 add their marimba, shaker and humming like bgm_umi_noon, c3_ichi
// 1–3, 6.3; S29's teppan part — drm_jyu, drm_hera — comes with the third
// period, with ヤキソバン), 'shokudo' (食堂かもめ after the noren came down:
// through the little radio).
//
// Never in it (16.1): the town chime's answer, 星見台's morning chime, M7.

import { dbToGain } from '../engine';
import { INS, brushSwirl } from '../instruments';
import { songGainDb } from '../mix';
import { bass, bed, comp, drums, hits, melody, type BarCtx, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
import { registerSong, score } from './common';

export const HIRUGOHAN_MML = `
@song bgm_hirugohan part=lead ins=ins_harmonica meter=4/4
H1  G              | B4:4 D5:4 E5:4 D5:4 |
H2  Cmaj7          | E5:8 G5:8 |
H3  Am7            | A5:6 G5:2 E5:8 |
H4  D7sus4         | D5:12 -:4 |
H5  G              | G4:2 G4:2 A4:2 B4:2 D5:4 B4:4 |
H6  Em7            | D5:8 E5:8 |
H7  Am7・D7        | C5:4 B4:4 A4:4 F#4:4 |
H8  G              | G4:12 -:4 |
H9  Cmaj7          | E5:4 G5:4 A5:4 G5:4 |
H10 Bm7            | F#5:8 D5:8 |
H11 Em7            | B4:4 D5:4 E5:4 G5:4 |
H12 A7             | C#5:8 E5:8 |
H13 Cmaj7          | G5:6 E5:2 D5:8 |
H14 D7             | C5:4 A4:4 F#4:8 |
H15 Em7・D7        | D5:2 B4:2 A4:2 G4:2 A4:4 G4:4 |
H16 G              | G4:12 -:4 |
`;

export const HIRUGOHAN_CHORDS = `
G = G B D
Cmaj7 = C E G B
Am7 = A C E G
D7sus4 = D G A C
Em7 = E G B D
D7 = D F# A C
Bm7 = B D F# A
A7 = A C# E G
`;

export const hirugohan = score(HIRUGOHAN_MML, HIRUGOHAN_CHORDS);

export const HIRUGOHAN_LOOP = ['H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'H7', 'H8', 'H9', 'H10', 'H11', 'H12', 'H13', 'H14', 'H15', 'H16'];

/** variant → h_room. */
export const HIRUGOHAN_FORMS: Record<string, number> = { minna: 0, shokudo: 1 };

const minna = (b: BarCtx) => b.p.h_room !== 1;

/** A third under the tune inside the chord where it can be (c3_ichi 3: someone humming along). */
function thirdBelow(b: BarCtx, m: number): number {
  const tones = b.chordAt(0).tones;
  for (const d of [3, 4]) if (tones.includes((m - d + 120) % 12)) return m - d;
  return m - 3;
}

function applyForm(sp: SongPlayer, ramp: number, p = sp.params): void {
  const shokudo = p.h_room === 1;
  const t = sp.g.ctx.currentTime;
  const tc = Math.max(0.005, ramp) / 3;
  // 食堂かもめ: the little radio at the back of the closed shop (−6 dB, LP 2.4 kHz)
  sp.out.gain.setTargetAtTime(dbToGain(songGainDb(sp.def.id, sp.def.gainDb) + (shokudo ? -6 : 0)), t, tc);
  sp.filter.frequency.setTargetAtTime(shokudo ? 2400 : 20000, t, tc);
  for (const id of ['ichi_marimba', 'ichi_shaker', 'ichi_lead']) sp.partGain(id, shokudo ? 0 : 1, Math.max(0.005, ramp), t);
}

function hirugohanDef(): SongDef {
  const tune = hirugohan.part('lead');
  const parts: PartDef[] = [
    melody({ id: 'lead', ins: 'ins_harmonica', bars: tune, o: { vol: 0.08, rev: 0.22 }, gate: 0.95 }),
    // the marimba's swung comp: the top three of the chord
    comp({ id: 'marimba', ins: 'ins_fm_marimba', rhythm: 'x...x.x...x...x.', notes: 'top3', len: 2, o: { vol: 0.05 }, gate: 0.7 }),
    bass({ id: 'bass', ins: 'ins_tri_bass', pattern: 'R:4 3:4 5:4 3:4', o: { vol: 0.15 } }),
    drums({
      id: 'drums',
      kit: {
        drm_kick_soft: () => 'x.......x.......',
        drm_snare_brush: () => '....x.......x...',
      },
      vel: { drm_kick_soft: 0.6, drm_snare_brush: 0.6 },
    }),
    bed('swirl', (t, dest) => brushSwirl(t, dest, 0.008 * 0.5), 1),
    // ---- あぜ道市 came along (c3_ichi, the 'minna' form only)
    hits('ichi_marimba', [
      {
        when: (b, s) => minna(b) && b.p.c3_ichi >= 1 && (s === 12 || s === 14),
        fn: (b, t, rt, a) => {
          const c = b.chordAt(a);
          const root = 67 + ((c.root - 7 + 12) % 12);
          const fifth = root + 7 > 79 ? root - 5 : root + 7;
          INS.ins_fm_marimba({ t, midi: a === 12 ? fifth : root, dur: 0.2, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det, o: { vol: 0.03 } });
        },
      },
    ]),
    drums({ id: 'ichi_shaker', kit: { drm_shaker: (b) => (minna(b) && b.p.c3_ichi >= 2 ? 'x.x.x.x.x.x.x.x.' : null) }, vel: { drm_shaker: 0.3 } }),
    melody({ id: 'ichi_lead', ins: 'ins_lead_p25', bars: tune, o: { vol: 0.035 }, gate: 0.9, when: (b) => minna(b) && b.p.c3_ichi >= 3 && b.num >= 9, pitch: (b, m) => thirdBelow(b, m) }),
  ];
  return {
    id: 'bgm_hirugohan',
    title: '防波堤の昼ごはん',
    bpm: 92,
    swing: { kind: '16', amount: 0.56 },
    bars: hirugohan.bars,
    intro: [],
    loop: HIRUGOHAN_LOOP,
    parts,
    gainDb: -5,
    // the breakwater: open sea air (minato)
    reverb: { len: 1.2, decay: 3.4, level: 0.2 },
    variants: HIRUGOHAN_FORMS,
    setup(sp) {
      applyForm(sp, 0);
    },
    onParam(sp, name, value) {
      if (name === 'h_room') applyForm(sp, 0.6, { ...sp.params, h_room: value });
    },
  };
}

export const HIRUGOHAN_DEF = registerSong(hirugohanDef());
