// bgm_hoshi_night — 星見台の夜 (53_ch2_audio 5.1, 5.2).
// The village stopped a minute before the morning chime. F Lydian (B♮). The
// song gains parts with the stage instead of losing them: stage 0 is the
// music box and a low pad (a quiet that is not lonely), stage 1 adds the
// tomato lantern singing the town's question, stage 2 the calls from the hill
// echoing across the valley. Indoors and on the hill the same song changes
// its form (`variant` → h_room) without stopping.

import { DRM } from '../instruments';
import { dbToGain } from '../engine';
import { songGainDb } from '../mix';
import { bass, drums, hits, melody, pads, type BarCtx, type PartDef, type SongDef, type SongPlayer } from '../sequencer';
import { registerSong, score } from './common';

export const HOSHI_NIGHT_MML = `
@song bgm_hoshi_night part=stars ins=ins_musicbox meter=4/4
HI1 Fmaj7(#11)     | -:8 A5:4 B5:4 |
HI2 Cmaj7/E        | C6:16 |
A1  Fmaj7(#11)     | E6:8 C6:8 |
A2  G/F            | D6:16 |
A3  Em7            | -:8 B5:8 |
A4  Dm9            | A5:8 E6:8 |
A5  Am7            | C6:16 |
A6  G/B            | D6:8 B5:8 |
A7  Dm9            | F6:8 E6:8 |
A8  Cadd9          | D6:16 |
B1  Bbmaj7(#11)    | E6:16 |
B2  Am7            | C6:8 G5:8 |
B3  Dm9            | A5:8 C6:8 |
B4  G/B            | D6:16 |
B5  Gm9            | Bb5:8 A5:8 |
B6  Fmaj7/C        | C6:16 |
B7  Dm7            | F6:8 D6:8 |
B8  G/F            | B5:8 D6:8 |
C1  Dm9            | E6:16 |
C2  Am7            | -:8 C6:8 |
C3  Fmaj7/C        | A5:16 |
C4  G/B            | B5:8 G5:8 |
C5  Dbmaj7(#11)    | C6:8 Ab5:8 |
C6  Cadd9          | G5:16 |
C7  Dm9            | A5:8 D6:8 |
C8  Csus4(add9)    | F6:8 D6:8 |

@song bgm_hoshi_night part=lantern ins=ins_lantern meter=4/4
A1  Fmaj7(#11)     | C5:4 D5:4 F5:4 A5:4 |
A2  G/F            | B5:6 A5:2 G5:4 A5:4 |
A3  Em7            | E5:12 -:4 |
A4  Dm9            | D5:2 E5:2 G5:4 A5:4 C6:4 |
A5  Am7            | A5:6 G5:2 E5:8 |
A6  G/B            | D6:6 C6:2 B5:8 |
A7  Dm9            | A5:4 C6:4 E6:4 D6:4 |
A8  Cadd9          | C6:12 -:4 |
B1  Bbmaj7(#11)    | D6:6 C6:2 A5:4 F5:4 |
B2  Am7            | E5:8 G5:4 A5:4 |
B3  Dm9            | F5:6 E5:2 D5:4 A5:4 |
B4  G/B            | B5:12 -:4 |
B5  Gm9            | Bb5:6 A5:2 G5:4 D5:4 |
B6  Fmaj7/C        | E5:6 F5:2 A5:8 |
B7  Dm7            | D6:4 C6:4 A5:4 F5:4 |
B8  G/F            | G5:4 B5:4 D6:8 |
C1  Dm9            | A5:12 G5:4 |
C2  Am7            | E5:12 -:4 |
C3  Fmaj7/C        | F5:8 E5:4 C5:4 |
C4  G/B            | D5:12 -:4 |
C5  Dbmaj7(#11)    | Ab5:8 G5:4 F5:4 |
C6  Cadd9          | E5:12 -:4 |
C7  Dm9            | D5:4 F5:4 A5:4 C6:4 |
C8  Csus4(add9)    | G5:8 F5:4 D5:4 |

@song bgm_hoshi_night part=yobigoe ins=ins_lead_p25 meter=4/4
A3  Em7            | -:8 G5:2 G5:2 E5:4 |
A8  Cadd9          | -:8 G5:2 G5:2 E5:4 |
B4  G/B            | -:8 D6:2 D6:2 B5:4 |
C2  Am7            | -:8 C6:2 C6:2 A5:4 |
C4  G/B            | -:8 D6:2 D6:2 B5:4 |
C6  Cadd9          | -:8 G5:2 G5:2 E5:4 |
`;

export const HOSHI_NIGHT_CHORDS = `
Fmaj7(#11) = F A C E B
G/F = G B D /F
Em7 = E G B D
Dm9 = D F A C E
Am7 = A C E G
G/B = G D /B
Cadd9 = C E G D
Bbmaj7(#11) = Bb D F A E
Gm9 = G Bb D F A
Fmaj7/C = F A E /C
Dm7 = D F A C
Dbmaj7(#11) = Db F Ab C G
Csus4(add9) = C F G D
Cmaj7/E = C G B /E
`;

export const hoshiNight = score(HOSHI_NIGHT_MML, HOSHI_NIGHT_CHORDS);

export const HOSHI_NIGHT_LOOP = [
  'A1', 'A2', 'A3', 'A4', 'A5', 'A6', 'A7', 'A8',
  'B1', 'B2', 'B3', 'B4', 'B5', 'B6', 'B7', 'B8',
  'C1', 'C2', 'C3', 'C4', 'C5', 'C6', 'C7', 'C8',
];

/** variant → h_room (53 5.2). */
export const HOSHI_ROOMS: Record<string, number> = { outdoor: 0, house: 1, barn: 2, school: 3, hill: 4 };

/**
 * The forms of 5.2: the song's level and low-pass, and each part's level
 * relative to its resting level (0 = resting in that room).
 */
const ROOM: { db: number; lp: number; parts: Record<string, number> }[] = [
  { db: 0, lp: 20000, parts: {} },
  // 3号ハウス: through the plastic film
  { db: -4, lp: 2400, parts: { drums: dbToGain(-6) } },
  // 石黒牛舎: not to wake the cattle — the fans and the chewing lead
  { db: -12, lp: 1200, parts: { stars: 0, yobigoe: 0, drums: 0, deco: 0 } },
  // 旧分校: a lit classroom — the pump organ holds the chords
  { db: -2, lp: 3200, parts: { pad: 0, drums: 0 } },
  // 星見の丘: the speaker is close
  { db: -6, lp: 20000, parts: { yobigoe: dbToGain(4) } },
];

const st = (b: BarCtx) => b.p.h_stage;
const inLoop = (b: BarCtx) => b.section === 'A' || b.section === 'B' || b.section === 'C';
/** The pad's low-pass per stage: the east horizon brightening towards the morning. */
const PAD_LP = [1000, 1300, 1800];

function applyRoom(sp: SongPlayer, room: number, ramp: number): void {
  const r = ROOM[room] ?? ROOM[0];
  const t = sp.g.ctx.currentTime;
  const tc = Math.max(0.005, ramp) / 3;
  sp.out.gain.setTargetAtTime(dbToGain(songGainDb(sp.def.id, sp.def.gainDb) + r.db), t, tc);
  sp.filter.frequency.setTargetAtTime(r.lp, t, tc);
  for (const rt of sp.parts) {
    if (rt.id === 'organ') continue;
    sp.partGain(rt.id, r.parts[rt.id] ?? 1, Math.max(0.005, ramp), t);
  }
  sp.partGain('organ', room === 3 ? 1 : 0, Math.max(0.005, ramp), t);
}

function hoshiNightDef(): SongDef {
  const parts: PartDef[] = [
    // ---- the stars (every stage): at stage 1 they climb an octave to make room
    // for the lantern — all but E6 and F6, which would sit too high
    melody({
      id: 'stars',
      ins: 'ins_musicbox',
      bars: hoshiNight.part('stars'),
      o: (b) => ({ vol: st(b) >= 1 ? 0.05 : 0.08, rev: 0.6 }),
      pitch: (b, m) => (st(b) >= 1 && m < 88 ? m + 12 : m),
      when: (b) => b.p.h_room !== 2,
      aware: ['h_room'],
    }),
    // ---- the lantern (stage 1–): the town's question, then 星見台's Lydian
    melody({
      id: 'lantern',
      ins: 'ins_lantern',
      bars: hoshiNight.part('lantern'),
      o: { vol: 0.08 },
      gate: 0.94,
      when: (b) => st(b) >= 1 && inLoop(b),
      // the light's flicker: 0.8 Hz ±10 % (50 4.5; two beats at 96 BPM)
      fx: { tremolo: { rate: 0.8, depth: 0.1 } },
    }),
    // ---- the calls (stage 2): a small megaphone's band, a dotted-quarter echo
    melody({
      id: 'yobigoe',
      ins: 'ins_lead_p25',
      bars: hoshiNight.part('yobigoe'),
      o: { vol: 0.04, rev: 0.25 },
      gate: 0.85,
      when: (b) => st(b) === 2 && b.p.h_room !== 2,
      aware: ['h_room'],
      fx: { hp: 500, lp: 2400, delay: { steps: 6, fb: 0.45, send: 0.5, bp: [900, 2600] } },
    }),
    // ---- the pad (the school's pump organ holds the chords instead)
    pads({
      id: 'pad',
      o: (b) => ({ vol: st(b) >= 1 ? 0.03 : 0.025, attack: b.inIntro && b.num === 1 ? 1.6 : 0.8, release: 1.6 }),
      when: (b) => b.p.h_room !== 3,
      aware: ['h_room'],
      fx: { lp: 1000, q: 0.7 },
    }),
    pads({
      id: 'organ',
      ins: 'ins_reed_organ',
      o: { vol: 0.03 },
      count: 4,
      lo: 53,
      hi: 72,
      when: (b) => b.p.h_room === 3,
      aware: ['h_room'],
    }),
    // ---- the bass: a sub at stage 0; from stage 1 a fretless gliding between roots and fifths
    bass({ id: 'sub', ins: 'ins_sub', pattern: 'R:16', o: { vol: 0.1 }, when: (b) => st(b) < 1 || b.inIntro }),
    bass({ id: 'bass', ins: 'ins_fm_fretless', pattern: 'R:8 5:8', o: { vol: 0.12 }, gate: 1, when: (b) => st(b) >= 1 && inLoop(b) }),
    // ---- Ami's lantern swaying as she walks (stage 1–); stage 2 adds a soft kick
    drums({
      id: 'drums',
      kit: {
        drm_shaker: (b) => (st(b) >= 1 && inLoop(b) ? 'x.g.x.g.x.g.x.g.' : null),
        drm_rim: (b) => (st(b) >= 1 && inLoop(b) ? '........x.......' : null),
        drm_kick_soft: (b) => (st(b) === 2 && inLoop(b) ? 'x.......x.......' : null),
      },
      vel: { drm_shaker: 0.35, drm_rim: 0.45, drm_kick_soft: 0.5 },
      when: (b) => b.p.h_room !== 2 && b.p.h_room !== 3,
      aware: ['h_room'],
    }),
    // ---- stage 2: a triangle at the head of A1 (the east is getting light)
    hits('deco', [
      {
        when: (b, s) => st(b) === 2 && b.label === 'A1' && s === 0 && b.p.h_room !== 2,
        fn: (_b, t, rt) => DRM.drm_triangle({ t, vel: 1, vol: 0.015, dest: rt.input, rev: rt.rev }),
      },
    ]),
  ];
  return {
    id: 'bgm_hoshi_night',
    title: '星見台の夜',
    bpm: 96,
    bars: hoshiNight.bars,
    intro: ['HI1', 'HI2'],
    loop: HOSHI_NIGHT_LOOP,
    parts,
    gainDb: -6,
    reverb: { len: 2.8, decay: 2.6, level: 0.34 },
    variants: HOSHI_ROOMS,
    setup(sp) {
      applyRoom(sp, sp.params.h_room, 0);
    },
    route(sp) {
      // 段階2: C8 waits one more beat (5/4) — the colon of 4:59 about to blink, and not
      sp.state.repeatTail = sp.params.h_stage === 2 ? C8_TAIL : undefined;
    },
    onBar(sp, b) {
      const pad = sp.partRt('pad')?.state.filter as BiquadFilterNode | undefined;
      const lp = PAD_LP[Math.max(0, Math.min(2, st(b)))];
      pad?.frequency.setTargetAtTime(lp, b.t0, 0.4);
    },
    onParam(sp, name, value, old) {
      // 0 → 1 (evt_ch2_light): the next bar is A1, the lantern starts with the question
      if (name === 'h_stage' && value === 1 && old < 1) sp.jumpNext('A1');
      if (name === 'h_room') applyRoom(sp, value, 0.6);
    },
  };
}

const C8_TAIL = new Set(['C8']);

export const HOSHI_NIGHT_DEF = registerSong(hoshiNightDef());
