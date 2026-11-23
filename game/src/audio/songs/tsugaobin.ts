// bgm_tsugaobin — 軽トラの荷台 (63_ch3_audio 5.2). D major, 112. ツガオ便's truck
// bed on the way to the sea: the three-cylinder engine (amb_c3_keitora) is
// the beat under it, the marimba's 「ぽこ、ぽこ」 (the delivery's instrument
// of chapter 2, 53 5.1) carries the tune, the harbour harmonica joins an
// octave down in K5–K8 (the sea getting near), and once the sea is in sight
// (c3_shio 1, set by the world) a pad opens over it. ツガオ's public face: M7
// is never in it (53's rule; the trap's single M7 at the arrival is an event
// sound, not this score).
//
// variant → h_room: 'iki' (S04), 'wana' (S14: c3_wana 1 — from the next bar
// the marimba and the harmonica rest and the bass is left alone; 2 — the
// event stops the song), 'kaeri' (S32: the spatula's 「カン」 on beat 4 of K4
// and K8; the last time round ends on the tonic, held by the event).

import { dbToGain } from '../engine';
import { DRM } from '../instruments';
import { songGainDb } from '../mix';
import { bass, drums, hits, melody, pads, type BarCtx, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
import { registerSong, score } from './common';

export const TSUGAOBIN_MML = `
@song bgm_tsugaobin part=marimba ins=ins_fm_marimba meter=4/4
K1  D              | A4:4 B4:4 D5:4 -:4 |
K2  Bm7            | F#5:6 E5:2 D5:8 |
K3  G              | B4:4 A4:4 D5:4 E5:4 |
K4  A7sus4         | E5:12 -:4 |
K5  D              | A4:4 B4:4 D5:4 F#5:4 |
K6  Bm7            | A5:6 F#5:2 E5:8 |
K7  Em7            | D5:4 E5:4 B4:4 A4:4 |
K8  A7             | D5:12 -:4 |
`;

export const TSUGAOBIN_CHORDS = `
D = D F# A
Bm7 = B D F# A
G = G B D
A7sus4 = A D E G
Em7 = E G B D
A7 = A C# E G
`;

export const tsugaobin = score(TSUGAOBIN_MML, TSUGAOBIN_CHORDS);

/** variant → h_room (63 5.2, 6.4). */
export const TSUGAOBIN_FORMS: Record<string, number> = { iki: 0, wana: 1, kaeri: 2 };

const tuneOff = (b: BarCtx) => b.p.h_room === 1 && b.p.c3_wana >= 1;

function applyForm(sp: SongPlayer, ramp: number, p = sp.params): void {
  const t = sp.g.ctx.currentTime;
  const tc = Math.max(0.005, ramp) / 3;
  sp.out.gain.setTargetAtTime(dbToGain(songGainDb(sp.def.id, sp.def.gainDb)), t, tc);
  sp.partGain('pad', p.c3_shio === 1 && !(p.h_room === 1 && p.c3_wana >= 1) ? 1 : 0, Math.max(0.005, ramp > 0 ? 2 : 0), t);
}

function tsugaobinDef(): SongDef {
  const parts: PartDef[] = [
    // ---- the marimba's 「ぽこ、ぽこ」: the tune
    melody({ id: 'marimba', ins: 'ins_fm_marimba', bars: tsugaobin.part('marimba'), o: { vol: 0.06 }, when: (b) => !tuneOff(b) }),
    // ---- the harbour harmonica, an octave down in K5–K8 (the sea is near)
    melody({ id: 'harmonica', ins: 'ins_harmonica', bars: tsugaobin.part('marimba'), transpose: -12, o: { vol: 0.04, rev: 0.2 }, gate: 0.95, when: (b) => b.num >= 5 && !tuneOff(b) }),
    // ---- the bass and the engine's shake
    bass({ id: 'bass', ins: 'ins_tri_bass', pattern: 'R:4 5:4 R:4 5:4', o: { vol: 0.14 } }),
    drums({ id: 'drums', kit: { drm_shaker: (b) => (tuneOff(b) ? null : 'x.x.x.x.x.x.x.x.') }, vel: { drm_shaker: 0.5 } }),
    // ---- the sea in sight (c3_shio): a pad comes in
    pads({ id: 'pad', o: { vol: 0.022, attack: 1.2, release: 1.6 }, fx: { lp: 1800, q: 0.6 }, when: (b) => b.p.c3_shio === 1 && !tuneOff(b) }),
    // ---- the way home (kaeri): たかし's spatula on beat 4 of K4 and K8
    hits('hera', [
      {
        when: (b, s) => b.p.h_room === 2 && (b.label === 'K4' || b.label === 'K8') && s === 12,
        fn: (_b, t, rt) => DRM.drm_hera({ t, vel: 0.5, dest: rt.input, rev: rt.rev }),
      },
    ]),
  ];
  return {
    id: 'bgm_tsugaobin',
    title: '軽トラの荷台',
    bpm: 112,
    bars: tsugaobin.bars,
    intro: [],
    loop: ['K1', 'K2', 'K3', 'K4', 'K5', 'K6', 'K7', 'K8'],
    parts,
    gainDb: -6,
    // out on the road: hardly any room
    reverb: { len: 0.8, decay: 4, level: 0.12 },
    variants: TSUGAOBIN_FORMS,
    setup(sp) {
      applyForm(sp, 0);
    },
    onParam(sp, name, value) {
      if (name === 'h_room' || name === 'c3_shio' || name === 'c3_wana') applyForm(sp, 0.6, { ...sp.params, [name]: value });
    },
  };
}

export const TSUGAOBIN_DEF = registerSong(tsugaobinDef());
