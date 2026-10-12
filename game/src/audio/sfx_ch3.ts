// Chapter 3 sound effects (63_ch3_audio 8): the first period (序〜海ぞいの町に
// 着くまで, S00–S06) — the poster on たかし's shutter, the truck bed, the sea
// air, the harbour (the fenders, the gulls, the kite), the noren, the head of
// the noon siren, the lifeguard's whistle, the market's wet floor, and the
// few small sounds the town's beds borrow (the fish crates, the bowl put
// down, the dried fish). The recipe strings are the design document's
// notation, pasted as written. The groups read "第3章：…" in the sound test.
//
// The noon siren (M8, 1.4) is no tune and its tail is sealed: se_c3_siren_head
// only rises (0 → +5 semitones in 0.6 s) and is cut in 80 ms with its echoes.
// The full siren (head, hold and the falling tail, S12) is the second period's.

import { sirenNote } from './instruments';
import { cur, dbToGain } from './engine';
import { seTrim, trimOr1 } from './mix';
import { duck } from './music';
import { layer, se, sub, type SeCtx } from './recipe';

const G_OPEN = '第3章：序・夕鳴町の昼前・荷台';
const G_MINATO = '第3章：港と町';
const G_STEPS = '第3章：足音';

/** Every chapter-3 group (the sound test lists them in this order). */
export const CH3_SE_GROUPS = [G_OPEN, G_MINATO, G_STEPS];

// ============================================================================
// 8.1 序・夕鳴町の昼前・荷台

/**
 * The chapter's door (S00, 63 12.1): out of black, one wave pushes in on a
 * beach 「ざっ」 and does not draw back — its 「さー」 is cut 80 ms in (the
 * stopped town, ahead). amb_c3_umi's wave at 12:01, said once.
 */
se('se_c3_title_wave', {
  label: '章の扉の波（寄せて、引かない）',
  group: G_OPEN,
  layers: [
    'noise env=400/300/.4/30 dur=420 v=.03 flt=LP300→1600',
    // the draw-back begins… and is cut
    'noise env=60/0/1/10 dur=80 v=.02 flt=LP1600 at=440',
  ],
});

se('se_c3_harigami', {
  label: 'たかしの店の貼り紙（ぱたっ）',
  group: G_OPEN,
  layers: [
    'noise env=2/80/0/40 dur=40 v=.015 flt=BP2600q0.9 am=35/.5',
    // the paper touching the shutter's metal
    'tri f=900→700/30 env=0/40/0/15 dur=8 v=.008 at=60',
  ],
});
se('se_c3_nidai_gata', {
  label: '荷台がはねる（ガタン）',
  group: G_OPEN,
  rand: [0.08, 0.08],
  max: 2,
  layers: [
    'sine f=95→60/80 env=0/120/0/50 dur=40 v=.05',
    'noise env=0/60/0/30 dur=30 v=.015 flt=LP900',
    // the tailgate's iron
    'tri f=420 env=0/50/0/20 dur=10 v=.008 at=20',
  ],
});
se('se_c3_shio', {
  label: '潮のにおい（風と遠いカモメ）',
  group: G_OPEN,
  layers: [
    'noise env=300/400/0/400 dur=600 v=.006 flt=LP700',
    // a gull, far off
    'sine f=700→1100/250 env=40/300/0/150 dur=200 v=.003 flt=BP1000q2 at=500',
  ],
  fn(c) {
    layer(c, 'sine f=1100→800/250 env=0/150/0/150 dur=150 v=.003 flt=BP1000q2 at=750');
  },
});

// ============================================================================
// 8.2 港と町

se('se_c3_fender', {
  label: '防舷材のきしみ（ギュッ）',
  group: G_MINATO,
  rand: [0.06, 0.1],
  layers: ['saw f=140→110/300 env=40/250/0/100 dur=200 v=.012 flt=BP600q1.5 am=30/.6', 'noise env=30/200/0/80 dur=150 v=.004 flt=BP1800q1'],
});

/** A gull's 「ミャーオ」: up 700 → 1100 and down to 800 Hz over 0.5 s (the town's bed uses it too). */
export function kamome(c: SeCtx, at = 0, k = 1): void {
  for (const [w, v] of [
    ['sine', 0.01],
    ['tri', 0.004],
  ] as [string, number][]) {
    layer(c, `${w} f=700→1100/220 env=30/220/.6/60 dur=220 v=${v * k} flt=BP1000q2`, { at });
    layer(c, `${w} f=1100→800/280 env=5/200/.3/150 dur=280 v=${v * k} flt=BP1000q2`, { at: at + 220 });
  }
  // the hoarse edge
  layer(c, `noise env=30/300/0/100 dur=250 v=${0.002 * k} flt=BP1500q1.5`, { at });
}
se('se_c3_kamome', {
  label: 'カモメの一声（ミャーオ）',
  group: G_MINATO,
  rand: [0.05, 0.1],
  max: 3,
  fn: (c) => kamome(c),
});
se('se_c3_tonbi', {
  label: 'トビの声（ピーヒョロロ）',
  group: G_MINATO,
  rev: 0.35,
  layers: [
    // ピー
    'sine f=2400 env=20/550/.6/80 dur=600 v=.008',
    // ヒョロロ
    'sine f=2600→2000/90 env=5/80/0/10 dur=80 v=.007 at=650 rep=3x110',
  ],
});
se('se_c3_noren', {
  label: 'のれんをくぐる（さらっ）',
  group: G_MINATO,
  layers: ['noise env=10/150/0/80 dur=120 v=.010 flt=BP3200q0.7 am=18/.4'],
});

/**
 * The siren tower's speaker voicing (bus_pa 'umi', 63 3.3): the context's
 * layers go into the PA, with this SE's own fader. Offline renders (QA) hear
 * the seaside voicing, where these sounds are heard in the game.
 */
function viaUmi(c: SeCtx, id: string): SeCtx {
  const g = cur();
  if (g.offline && g.pa.mode !== 'umi') g.pa.setMode('umi', 0);
  g.pa.open(c.t);
  g.pa.wake(c.t + 4);
  return { ...c, dest: g.pa.input, vol: c.vol * trimOr1(seTrim(id)), rev: 0 };
}

/**
 * se_c3_siren_head — the head of the noon siren, 0.6 s (0 → +5 semitones),
 * cut in 80 ms through the tower's speaker (1.4, 7.4). Somebody in the town
 * began to say 「ごちそう……」. The music ducks −6 dB for 0.3 s (10.3) — not
 * when the town's own song plays it under its bar A8 (level 1).
 */
se('se_c3_siren_head', {
  label: '正午のサイレンの頭（切れる）',
  group: G_MINATO,
  max: 2,
  fn(c) {
    const p = viaUmi(c, 'se_c3_siren_head');
    sirenNote({ t: p.t, dest: p.dest, f0: 185 * p.pitch, semis: 5, rise: 0.6, hold: 0, vol: 0.05 * p.vol });
    if (c.opts.level !== 1 && !cur().offline) duck(dbToGain(-6), 0.02, 0.3, 0.4, c.t);
  },
});

// ============================================================================
// 8.3–8.5: the few the first period needs (the market's crates, the bowl, the
// whistle) and 8.6's dried fish (the alley's bed)

se('se_c3_torobako', {
  label: 'トロ箱を置く（ことっ、きゅっ）',
  group: G_MINATO,
  rand: [0.1, 0.1],
  layers: ['noise env=0/50/0/20 dur=30 v=.012 flt=BP1200q1.2', 'saw f=900→700/60 env=0/80/0/20 dur=40 v=.003 flt=BP1800q3 at=30'],
});
se('se_c3_donburi', {
  label: 'どんぶりを置く（ことん）',
  group: G_MINATO,
  layers: ['sine f=520→480/30 env=0/120/0/40 dur=30 v=.020', 'sine f=1460 env=0/80/0/30 dur=20 v=.006', 'noise env=0/20/0/10 dur=10 v=.006 flt=BP3000q1'],
});
se('se_c3_fue', {
  label: '監視員カイトの笛（ピッ！）',
  group: G_MINATO,
  layers: ['sine f=3150 env=3/150/0/30 dur=120 v=.016 am=38/.4', 'noise env=3/120/0/20 dur=100 v=.004 flt=BP3200q3'],
});
se('se_c3_himono', {
  label: '干物（パタン／カラカラ）',
  group: G_MINATO,
  fn(c) {
    if (c.opts.level === 1) layer(c, 'tri f=1600 env=0/25/0/10 dur=6 v=.008 rep=5x70 rnd=20%');
    else layer(c, 'noise env=0/60/0/30 dur=30 v=.014 flt=BP1300q1');
  },
});

// ============================================================================
// 8.12 足音（第3章）

/**
 * The market's wet floor (and the fish landing on the quay): the stone step
 * with a small 「ぴちゃ」 on it. The town's people in boots walk at pitch .85.
 */
se('se_step_wet', {
  label: '足音：濡れた床（ぴちゃ）',
  group: G_STEPS,
  rand: [0.04, 0.12],
  max: 3,
  fn(c) {
    sub(c, 'se_step_stone');
    layer(c, 'noise env=1/25/0/10 dur=15 v=.004 flt=BP2800q1.2', { at: 6 });
  },
});
