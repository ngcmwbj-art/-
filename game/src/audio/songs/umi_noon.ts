// bgm_umi_noon — 海ぞいの町の正午 (63_ch3_audio 5.1). G major, 108. The harbour
// town where the lunch break never ends: a harbour harmonica (ins_harmonica)
// over a far shop radio's offbeat guitar-like comp, a bass on roots and
// fifths and a soft kick. Bright, never dark — only it does not end: at 12:00
// (c3_noon 0) bar A8 is cut to 2/4 on D7sus4 and the tape rewinds (−700 cents
// in 120 ms) back to A1, with the head of the siren far off (v ×0.3: somebody
// in the town just started to say 「ごちそうさま」). The second A slips past A8
// straight into B. From 12:01 (c3_noon 1) A8 resolves (A8n, 4/4) and a C
// section follows B: C7 is M9′「ごちそうさま」(D B A G A G), C8 lands on G.
//
// The song goes back to whole instead of falling apart (1.5「もどっていく」): each
// 「まだ」 undone brings its place's part back over two bars (6.2) — the
// market's clapped hand-signals (c3_ichiba), the kitchen's knife and the
// slap bass (c3_shokudo), the sea's pad and swirl and the children's
// 「いただきます」 voices (c3_umi); the people who come to あぜ道市 add a marimba,
// a shaker and someone humming a third under the tune (c3_ichi 1–3, 6.3).
// Indoors and under the sea the same song changes its form without stopping
// (`variant` → h_room, the same mechanism as 星見台の夜, 53 5.2).
//
// Never in it (16.1): the town chime's answer, 星見台's morning chime, M7.
// The siren is no tune: here it is only the far SE on A8 (1.4).

import { dbToGain } from '../engine';
import { INS, brushSwirl } from '../instruments';
import { songGainDb } from '../mix';
import { sfxTable } from '../registry';
import { bass, bed, comp, drums, hits, melody, pads, type BarCtx, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
import { registerSong, score } from './common';

export const UMI_NOON_MML = `
@song bgm_umi_noon part=harmonica ins=ins_harmonica meter=4/4
UI1 G              | -:8 D5:4 E5:4 |
UI2 Cmaj7/G        | G5:16 |
A1  G              | D5:4 E5:4 G5:6 E5:2 |
A2  Em7            | D5:8 B4:8 |
A3  Cmaj7          | E5:4 D5:2 B4:2 A4:8 |
A4  D              | A4:4 B4:4 D5:8 |
A5  G              | D5:4 E5:4 G5:4 A5:4 |
A6  Bm7            | B5:6 A5:2 F#5:8 |
A7  Cmaj7          | E5:4 G5:4 A5:2 G5:2 E5:4 |
A8  [2/4] D7sus4   | D5:8 |
B1  Cmaj7          | E5:6 G5:2 E5:4 D5:4 |
B2  Bm7            | D5:6 B4:2 A4:8 |
B3  Am7            | C5:4 E5:4 A5:4 G5:4 |
B4  D7             | F#5:12 -:4 |
B5  Ebmaj7         | G5:6 F5:2 D5:4 Bb4:4 |
B6  D7sus4         | A4:8 D5:8 |
B7  Cmaj7          | E5:4 D5:4 B4:4 G4:4 |
B8  D7             | A4:12 -:4 |

@song bgm_umi_noon part=harmonica_noon ins=ins_harmonica meter=4/4
A8n D7sus4・D7     | D5:8 C5:4 A4:4 |
C1  G              | B4:4 D5:4 E5:8 |
C2  Em7            | G5:6 E5:2 D5:8 |
C3  Am7            | C5:4 E5:4 D5:4 B4:4 |
C4  D7             | A4:12 -:4 |
C5  Cmaj7          | E5:6 D5:2 B4:8 |
C6  Bm7            | A4:4 B4:4 D5:8 |
C7  Am7・D7        | D5:2 B4:2 A4:2 G4:2 A4:4 G4:4 |
C8  G              | B4:8 G4:8 |

@song bgm_umi_noon part=koe ins=ins_choir meter=4/4
A5  G              | G4:2 G4:2 A4:2 B4:2 D5:4 B4:4 |
B6  D7sus4         | -:8 A4:4 D5:4 |
`;

export const UMI_NOON_CHORDS = `
G = G B D
Cmaj7/G = C E G B /G
Em7 = E G B D
Cmaj7 = C E G B
D = D F# A
Bm7 = B D F# A
D7sus4 = D G A C
D7 = D F# A C
Ebmaj7 = Eb G Bb D
Am7 = A C E G
`;

export const umiNoon = score(UMI_NOON_MML, UMI_NOON_CHORDS);

/**
 * One loop list holds both forms (route picks the way through it):
 * 12:00 — A1–A8 (A8 in 2/4), A1–A7, B1–B8 (22.5 bars);
 * 12:01 — A1–A7, A8n, B1–B8, C1–C8 (24 bars).
 */
export const UMI_NOON_LOOP = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8', 'A8n',
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8',
];
const I_A8 = 7;
const I_A8N = 8;
const I_A2ND = 9;
const I_B1 = 16;
const I_C1 = 24;

/** variant → h_room (63 5.1). */
export const UMI_ROOMS: Record<string, number> = { outdoor: 0, ichiba: 1, shokudo: 2, toudai: 3, uminoie: 4, suichu: 5 };

/** The forms of 5.1: the song's level and low-pass, and each part's level in that room. */
const ROOM: { db: number; lp: number; parts: Record<string, number> }[] = [
  { db: 0, lp: 20000, parts: {} },
  // 市場: under the big roof — the clapped hand-signals lead (+3 dB)
  { db: -4, lp: 3000, parts: { ichiba: dbToGain(3) } },
  // 食堂かもめ: the small radio at the back of the shop (the comp through its band)
  { db: -5, lp: 2400, parts: { comp: 0.8 } },
  // 灯台の中: through thick walls, no drums
  { db: -6, lp: 2000, parts: { drums: 0, ichiba: 0, daidokoro: 0, ichi_shaker: 0 } },
  // 海の家: through the reed screens
  { db: -3, lp: 3600, parts: {} },
  // 海の中: the land's song shines far off — no harmonica, a music box an octave up
  { db: -3, lp: 700, parts: { harmonica: 0, ichi_lead: 0 } },
];

/** The parts each 「まだ」 brings back (6.2) and the param that does it. */
const RETURNS: Record<string, 'c3_ichiba' | 'c3_shokudo' | 'c3_umi'> = {
  ichiba: 'c3_ichiba',
  daidokoro: 'c3_shokudo',
  umi_pad: 'c3_umi',
  umi_swirl: 'c3_umi',
  koe: 'c3_umi',
};

const noon = (b: BarCtx) => b.p.c3_noon === 1;
const room = (b: BarCtx) => b.p.h_room;
const uw = (b: BarCtx) => b.p.h_room === 5;

/** A part's level now: its room's factor × whether its 「まだ」 is undone. */
function partLevel(sp: SongPlayer, id: string, p = sp.params): number {
  const r = ROOM[p.h_room] ?? ROOM[0];
  const k = r.parts[id] ?? 1;
  const ret = RETURNS[id];
  return ret && p[ret] !== 1 ? 0 : k;
}

function applyRoom(sp: SongPlayer, ramp: number, p = sp.params): void {
  const r = ROOM[p.h_room] ?? ROOM[0];
  const t = sp.g.ctx.currentTime;
  const tc = Math.max(0.005, ramp) / 3;
  sp.out.gain.setTargetAtTime(dbToGain(songGainDb(sp.def.id, sp.def.gainDb) + r.db), t, tc);
  sp.filter.frequency.setTargetAtTime(r.lp, t, tc);
  for (const rt of sp.parts) sp.partGain(rt.id, partLevel(sp, rt.id, p), Math.max(0.005, ramp), t);
}

/** A third under the tune, inside the chord where it can be (c3_ichi 3: someone humming along). */
const G_MAJOR = new Set([7, 9, 11, 0, 2, 4, 6]);
function thirdBelow(b: BarCtx, src: number, m: number): number {
  const tones = b.chordAt(src).tones;
  for (const d of [3, 4]) if (tones.includes((m - d + 120) % 12)) return m - d;
  for (const d of [3, 4]) if (G_MAJOR.has((m - d + 120) % 12)) return m - d;
  return m - 3;
}

/** The siren's head under A8 is sent once per bar even if the bar is rewound for a param. */
const sirenSent = new WeakMap<SongPlayer, number>();

function umiNoonDef(): SongDef {
  const tune = [...umiNoon.part('harmonica'), ...umiNoon.part('harmonica_noon')];
  const inLoop = (b: BarCtx) => !b.inIntro;
  const parts: PartDef[] = [
    // ---- the harbour harmonica (always; not under the sea)
    melody({ id: 'harmonica', ins: 'ins_harmonica', bars: tune, o: { vol: 0.08, rev: 0.25 }, gate: 0.95, when: (b) => !uw(b), aware: ['h_room'] }),
    // ---- under the sea: the same tune an octave up on a music box
    melody({ id: 'mbox_uw', ins: 'ins_musicbox', bars: tune, transpose: 12, o: { vol: 0.04, rev: 0.5 }, when: uw, aware: ['h_room'] }),
    // ---- 「いただきます」: the children's voices are back (c3_umi). M9 in A5.
    melody({ id: 'koe', ins: 'ins_choir', bars: umiNoon.part('koe'), o: { vol: 0.03, child: true }, gate: 0.9, when: (b) => b.p.c3_umi === 1 && inLoop(b) }),
    // ---- a far shop radio's guitar: the top three of the chord on the offbeats of 2 and 4
    comp({ id: 'comp', ins: 'ins_fm_epiano', rhythm: '......x.......x.', notes: 'top3', len: 2, o: { vol: 0.035 }, gate: 0.6 }),
    // ---- the bass: roots and fifths; the kitchen's fire back (c3_shokudo) warms it to a slap
    bass({ id: 'bass', ins: 'ins_tri_bass', pattern: 'R:8 5:8', o: { vol: 0.16 }, when: (b) => b.p.c3_shokudo !== 1 }),
    bass({ id: 'slap', ins: 'ins_fm_slap', pattern: "R:4 5:4 R':4 5:4", o: { vol: 0.12 }, when: (b) => b.p.c3_shokudo === 1 }),
    // ---- a soft kick and a hat; from 12:01 the hat runs in eighths (the town moves again)
    drums({
      id: 'drums',
      kit: {
        drm_kick_soft: () => 'x.......x.......',
        drm_hat_c: (b) => (noon(b) ? 'x.x.x.x.x.x.x.x.' : '..x...x...x...x.'),
      },
      vel: { drm_kick_soft: 0.6, drm_hat_c: 0.4 },
    }),
    // ---- ① the market: the auction's hand-signal rhythm, clapped (c3_ichiba)
    drums({
      id: 'ichiba',
      kit: {
        drm_clap: (b) => (inLoop(b) ? '....x.......x...' : null),
        drm_woodblock: (b) => (inLoop(b) ? '..x...x...x...x.' : null),
      },
      vel: { drm_clap: 0.5, drm_woodblock: 0.4 },
      when: (b) => b.p.c3_ichiba === 1,
    }),
    // ---- ② the kitchen: a knife on the board in quarters, a shaker (c3_shokudo)
    drums({
      id: 'daidokoro',
      kit: {
        drm_rim: (b) => (inLoop(b) ? 'x...x...x...x...' : null),
        drm_shaker: (b) => (inLoop(b) ? 'x.g.x.g.x.g.x.g.' : null),
      },
      vel: { drm_rim: 0.45, drm_shaker: 0.3 },
      when: (b) => b.p.c3_shokudo === 1,
    }),
    // ---- ③ the sea: a pad and the waves' swirl (c3_umi; 12:00's sea is a mirror without it)
    pads({ id: 'umi_pad', o: { vol: 0.025, attack: 0.8, release: 1.4 }, fx: { lp: 1600, q: 0.6 }, when: (b) => b.p.c3_umi === 1 }),
    bed('umi_swirl', (t, dest) => brushSwirl(t, dest, 0.008 * 0.6), 1),
    // ---- あぜ道市 (c3_ichi): 1 a marimba's two notes after beat 4, 2 + a shaker, 3 + someone humming
    hits('ichi_marimba', [
      {
        when: (b, s) => b.p.c3_ichi >= 1 && inLoop(b) && (s === 12 || s === 14) && s < b.steps,
        fn: (b, t, rt, a) => {
          const c = b.chordAt(a);
          const root = 67 + ((c.root - 7 + 12) % 12);
          const fifth = root + 7 > 79 ? root - 5 : root + 7;
          INS.ins_fm_marimba({ t, midi: a === 12 ? fifth : root, dur: 0.2, vel: 1, dest: rt.input, rev: rt.rev, det: rt.song.det, o: { vol: 0.03 } });
        },
      },
    ]),
    drums({ id: 'ichi_shaker', kit: { drm_shaker: (b) => (b.p.c3_ichi >= 2 && inLoop(b) ? 'x.x.x.x.x.x.x.x.' : null) }, vel: { drm_shaker: 0.3 } }),
    // (B bars hold one chord each: the third is looked for in it)
    melody({ id: 'ichi_lead', ins: 'ins_lead_p25', bars: tune, o: { vol: 0.035 }, gate: 0.9, when: (b) => b.p.c3_ichi >= 3 && b.section === 'B', pitch: (b, m) => thirdBelow(b, 0, m) }),
  ];
  return {
    id: 'bgm_umi_noon',
    title: '海ぞいの町の正午',
    bpm: 108,
    bars: umiNoon.bars,
    intro: ['UI1', 'UI2'],
    loop: UMI_NOON_LOOP,
    parts,
    gainDb: -6,
    // the open seaside (minato): short, bright
    reverb: { len: 1.2, decay: 3.4, level: 0.22 },
    variants: UMI_ROOMS,
    setup(sp) {
      applyRoom(sp, 0);
    },
    route(sp, next) {
      const at1201 = sp.params.c3_noon === 1;
      let i = next.intro ? -1 : next.i;
      if (i < 0) return;
      if (at1201) {
        // A7 → A8n → B; no second A
        if (i === I_A8) i = I_A8N;
        else if (i === I_A2ND) i = I_B1;
      } else {
        // A8 (2/4) → the second A; after B, back to A1 (no C)
        if (i === I_A8N) i = I_A2ND;
        else if (i >= I_C1) i = 0;
      }
      return i === next.i ? undefined : { intro: false, i };
    },
    onBar(sp, b) {
      if (b.label !== 'A8' || b.p.c3_noon !== 0) return;
      // 12:00: the tape rewinds at the end of A8's two beats, back to A1's head
      const end = b.time(b.steps);
      const d = sp.det.offset;
      const base = sp.baseDetune;
      d.setValueAtTime(base, end - 0.12);
      d.linearRampToValueAtTime(base - 700, end - 0.005);
      d.setValueAtTime(base, end);
      // far off, somebody started to say 「ごちそうさま」: the siren's head, cut (1.4)
      if (sirenSent.get(sp) !== b.t0) {
        sirenSent.set(sp, b.t0);
        sfxTable.get('se_c3_siren_head')?.({ at: b.t0 + 0.05, vol: 0.3, level: 1 });
      }
    },
    onParam(sp, name, value, old) {
      if (name === 'h_room') {
        applyRoom(sp, 0.6, { ...sp.params, h_room: value });
        return;
      }
      // a 「まだ」 undone: from the next bar its part comes back over two bars (6.2)
      if ((name === 'c3_ichiba' || name === 'c3_shokudo' || name === 'c3_umi') && value !== old) {
        const t = sp.g.ctx.currentTime;
        const bar = (60 / 108) * 4;
        const p = { ...sp.params, [name]: value };
        for (const [id, param] of Object.entries(RETURNS)) {
          if (param !== name) continue;
          if (value === 1) {
            sp.partGain(id, 0, 0.01, t);
            sp.partGain(id, partLevel(sp, id, p), bar * 2, t + bar * 0.5);
          } else sp.partGain(id, 0, 0.3, t);
        }
      }
    },
  };
}

export const UMI_NOON_DEF = registerSong(umiNoonDef());
