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

import { playSirenFull } from './chime';
import { DRM, INS, sirenNote } from './instruments';
import { cur, dbToGain } from './engine';
import { c3Noon1201, registerSfx } from './index';
import { seTrim, trimOr1 } from './mix';
import { duck } from './music';
import { layer, se, sub, type SeCtx } from './recipe';
import { sfxInfo, sfxTable } from './registry';

const G_OPEN = '第3章：序・夕鳴町の昼前・荷台';
const G_MINATO = '第3章：港と町';
const G_STEPS = '第3章：足音';

/** Every chapter-3 group (the sound test lists them in this order). */
export const CH3_SE_GROUPS: string[] = [G_OPEN, G_MINATO, G_STEPS];

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

// ============================================================================
// 第2期（S07〜S14）: the market, the diner, the beach and the lighthouse, the
// tower and the end of noon, the battles of the town and the two hanko.

const G_ICHIBA = '第3章：①市場';
const G_SHOKUDO = '第3章：②食堂かもめ';
const G_UMI = '第3章：③海水浴場・潜り・灯台';
const G_BATTLE = '第3章：戦闘（敵・ナリオサメ）';
const G_HANKO = '第3章：ハンコ';
CH3_SE_GROUPS.push(G_ICHIBA, G_SHOKUDO, G_UMI, G_BATTLE, G_HANKO);

/** M9「いただきます」(G4 G4 A4 B4 D5 B4) and M9′「ごちそうさま」(D5 B4 A4 G4 A4 G4), 63 1.3. */
export const M9 = [67, 67, 69, 71, 74, 71];
export const M9_GOCHI = [74, 71, 69, 67, 69, 67];

/** A row of notes on an instrument from inside an SE (the gap in ms; the last one held `last` ms). */
function notes(c: SeCtx, ins: string, midis: number[], o: { gap: number; last?: number; len?: number; vol: number; rev?: number; at?: number; child?: boolean }): void {
  const f = INS[ins];
  if (!f) return;
  const semis = 12 * Math.log2(c.pitch);
  midis.forEach((m, i) => {
    const lastOne = i === midis.length - 1;
    const len = (lastOne && o.last ? o.last : o.len ?? o.gap * 0.9) / 1000;
    f({ t: c.t + ((o.at ?? 0) + i * o.gap) / 1000, midi: m + semis, dur: len, vel: 1, dest: c.dest, o: { vol: o.vol * c.vol, rev: o.rev, child: o.child } });
  });
}

// ---- 8.2 港と町（残り）

se('se_c3_noren_down', {
  label: 'のれんを下ろす（竿・布）',
  group: G_MINATO,
  layers: [
    // the pole
    'tri f=520→480/30 env=0/60/0/20 dur=15 v=.012',
    // the cloth folded
    'noise env=40/400/0/200 dur=300 v=.008 flt=BP2400q0.6 at=120',
    // laid on the counter
    'sine f=200→160/80 env=2/120/0/50 dur=30 v=.015 at=650',
  ],
});

/** se_c3_siren_full: the one full siren (S12). Prefer playSirenFull() to wait for its end. */
se('se_c3_siren_full', {
  label: '正午のサイレン（頭・のび・尾。S12 の1回だけ）',
  group: G_MINATO,
  max: 1,
  fn(c) {
    void playSirenFull({ at: c.t });
  },
});
se('se_c3_siren_btn', {
  label: 'サイレン塔のボタン（ガコン・カチッ）',
  group: G_MINATO,
  layers: [
    'sine f=180→120/50 env=0/80/0/30 dur=30 v=.04',
    'noise env=0/40/0/15 dur=15 v=.012 flt=BP1500q1.2',
    // the relay
    'tri f=2200 env=0/20/0/8 dur=6 v=.010 at=140',
  ],
});
/**
 * The tower's clock moves to 12:01 (S12). It is also the moment itself: the
 * town's music and beds go to 12:01 here (c3Noon1201 — the waves, the birds,
 * the cicadas and the market come back 4 s apart). level 1: the sound alone.
 */
se('se_c3_clock_1201', {
  label: '塔の大時計が 12:01 へ（コトン）',
  group: G_MINATO,
  fn(c) {
    DRM.drm_tower({ t: c.t, vel: 1, vol: 0.07 * c.vol, dest: c.dest });
    // the tower's inside rings with it
    layer(c, 'sine f=420 env=0/900/0/200 dur=200 v=.006 rev=.5 at=10');
    if (c.opts.level !== 1 && !cur().offline) c3Noon1201();
  },
});
se('se_c3_goza', {
  label: '防波堤にござを広げる（ばさっ、さらさら）',
  group: G_MINATO,
  rand: [0.05, 0.1],
  layers: ['noise env=10/150/0/100 dur=100 v=.012 flt=BP1400q0.7', 'noise env=100/300/0/200 dur=250 v=.004 flt=HP3500 at=100'],
});
/**
 * Up the iron stairs of the lighthouse or the tower in the blackout (8.12):
 * four steps, each a little higher (+3 %).
 */
se('se_c3_stairs_up', {
  label: '鉄の階段を上る（暗転の4歩）',
  group: G_STEPS,
  fn(c) {
    for (let i = 0; i < 4; i++) sub(c, 'se_step_metal', { at: i * 180, pitch: Math.pow(1.03, i), vol: 0.8 });
  },
});

// ---- 8.3 ①市場（S07）

/**
 * The auction's hand bell (a brass bell shaken by hand). level 1: ネフダマヨイ's
 * 「ひゃく……」 — the small one (pitch 1.15, v .6) that begins and stops (61).
 */
se('se_c3_seri_bell', {
  label: 'セリの鐘（振鈴）',
  group: G_ICHIBA,
  rev: 0.2,
  max: 2,
  fn(c) {
    const small = c.opts.level === 1;
    const k = small ? 0.6 : 1;
    const p = small ? 1.15 : 1;
    const cut = small ? 260 : 0;
    const spec = [
      'sine f=1320 env=1/900/0/200 dur=60 v=.020 am=9/.5',
      'sine f=2950 env=1/500/0/100 dur=40 v=.010 am=9/.5',
      'sine f=4400 env=1/250/0/80 dur=30 v=.006',
    ];
    for (const l of spec) layer(c, l, { vol: k, pitch: p, ...(cut ? { set: { D: cut, R: 40 } } : {}) });
    // the clapper hitting (4 times; the small one only twice before it stops)
    layer(c, 'noise env=0/30/0/10 dur=15 v=.008 flt=BP3500q2', { vol: k, pitch: p, set: { rep: [small ? 2 : 4, 110] } });
  },
});
se('se_c3_kori', {
  label: '砕いた氷をすくう（しゃりっ）',
  group: G_ICHIBA,
  rand: [0.05, 0.1],
  layers: ['noise env=5/200/0/80 dur=150 v=.010 flt=HP3500 am=60/.7'],
});
/** The scraps of the hand-signal notebook (5 of them): level i (0–4) climbs M9's notes G A B D E. */
se('se_c3_fucho', {
  label: '符丁ノートの切れはし（紙と「ぽん」）',
  group: G_ICHIBA,
  fn(c) {
    const i = Math.max(0, Math.min(4, Math.round(c.opts.level ?? 0)));
    const up = ['G5', 'A5', 'B5', 'D6', 'E6'];
    layer(c, 'noise env=2/80/0/30 dur=40 v=.010 flt=BP2600q0.9');
    layer(c, `sine f=${up[i]} env=2/200/0/80 dur=40 v=.010 at=120`);
    layer(c, `sine f=${up[Math.min(4, i + 1)]} env=2/200/0/80 dur=40 v=.008 at=200`);
  },
});
se('se_c3_seri_fuda', {
  label: 'セリの札を上げる（ぱしっ）',
  group: G_ICHIBA,
  rand: [0.04, 0.08],
  layers: ['noise env=0/40/0/15 dur=20 v=.014 flt=BP1800q1', 'tri f=640 env=0/50/0/20 dur=10 v=.010'],
});
se('se_c3_utta', {
  label: '「はい、売った！」（木づちと鐘）',
  group: G_ICHIBA,
  fn(c) {
    // the gavel
    layer(c, 'sine f=880 env=0/120/0/40 dur=20 v=.030');
    layer(c, 'noise env=0/30/0/10 dur=10 v=.015 flt=BP2000q1.5');
    sub(c, 'se_c3_seri_bell', { at: 180, vol: 0.7 });
  },
});
se('se_c3_kouika', {
  label: 'コウイカの墨（ぷしゅっ）',
  group: G_ICHIBA,
  layers: ['noise env=5/120/0/40 dur=60 v=.008 flt=LP900', 'sine f=300→180/100 env=2/100/0/30 dur=40 v=.006'],
});
se('se_c3_hashi', {
  label: '部品①お箸（割り箸を割る「パキッ」）',
  group: G_ICHIBA,
  layers: ['noise env=0/25/0/10 dur=10 v=.020 flt=BP2400q1.5', 'tri f=1900→1500/20 env=0/40/0/15 dur=10 v=.010'],
});

// ---- 8.4 ②食堂かもめ（S08）

se('se_c3_otama', {
  label: 'お玉ですくう（とぷっ）',
  group: G_SHOKUDO,
  rand: [0.05, 0.1],
  layers: ['noise env=10/120/0/60 dur=60 v=.008 flt=LP1100 am=20/.5', 'sine f=400→650/80 env=5/80/0/40 dur=40 v=.006 at=150'],
});
/**
 * One dish of the last set meal put down (S08). level i (0–4): M9's notes one
 * by one (G G A B D); pitch by the dish (fish 1.0, dried fish .9, tofu 1.1,
 * tomato 1.15, others 1.05) — the caller passes it.
 */
se('se_c3_teishoku', {
  label: '定食の品を盛る・置く',
  group: G_SHOKUDO,
  fn(c) {
    const i = Math.max(0, Math.min(4, Math.round(c.opts.level ?? 0)));
    sub(c, 'se_c3_donburi', { vol: 0.6 });
    // the note stays M9's whatever the dish (the dish only moves the bowl)
    layer(c, 'sine env=2/150/0/60 dur=30 v=.008 at=100', { pitch: 1 / c.pitch, set: { f: 440 * Math.pow(2, (M9[i] + 12 - 69) / 12) } });
  },
});
se('se_c3_nabe', {
  label: 'オカワリナベのぐつぐつ',
  group: G_SHOKUDO,
  layers: ['noise env=20/400/.3/200 dur=500 v=.010 flt=LP700 am=8/.7', 'sine f=300→520/40 env=0/50/0/20 dur=20 v=.006 rep=5x120 rnd=20%'],
});
se('se_c3_futa', {
  label: 'オカワリナベのふた（カタカタ……閉まらない）',
  group: G_SHOKUDO,
  layers: ['tri f=1100 env=0/40/0/15 dur=8 v=.012 rep=6x90 rnd=15%', 'sine f=700→600/40 env=0/60/0/20 dur=15 v=.008 at=560'],
});
/**
 * ゴロウ's 「……ごちそうさま。」(S08): M9′ heard for the first time, the
 * harmonica alone (1.3: the seal is lifted here). No siren head.
 */
se('se_c3_gochisou', {
  label: 'ゴロウの「ごちそうさま。」（M9′ のハーモニカ）',
  group: G_SHOKUDO,
  max: 1,
  fn(c) {
    notes(c, 'ins_harmonica', M9_GOCHI, { gap: 280, len: 260, last: 1200, vol: 0.07, rev: 0.3 });
  },
});

// ---- 8.5 ③海水浴場・潜り・灯台（S09）

se('se_c3_flag', {
  label: '遊泳旗を下ろす（滑車と旗）',
  group: G_UMI,
  layers: [
    // the pulley
    'tri f=2100 env=0/20/0/10 dur=6 v=.008 rep=10x100 rnd=10%',
    // the flag folded
    'noise env=200/600/0/300 dur=600 v=.006 flt=BP1400q0.8 am=12/.5 at=300',
  ],
});
se('se_c3_dive_in', {
  label: '海に入る（とぷん）',
  group: G_UMI,
  rand: [0.04, 0.08],
  layers: [
    'sine f=420→180/200 env=0/250/0/100 dur=150 v=.030',
    'noise env=0/100/0/80 dur=60 v=.010 flt=LP1500',
    // the low 「ごう」 of being under
    'noise env=50/300/0/200 dur=250 v=.004 flt=LP400 at=100',
  ],
});
se('se_c3_dive_out', {
  label: '海から上がる（ざばっ）',
  group: G_UMI,
  layers: [
    'noise env=10/250/0/200 dur=200 v=.014 flt=BP1200q0.6',
    // water dripping off the armour
    'noise env=0/200/0/150 dur=150 v=.006 flt=HP3000 at=150 rnd=20%',
  ],
});
se('se_c3_moguri_get', {
  label: '海の底の落とし物を拾う（こつん、光る）',
  group: G_UMI,
  layers: ['sine f=300 env=0/80/0/40 dur=20 v=.020 flt=LP600', 'sine f=E6 env=5/600/0/200 dur=100 v=.008 at=150', 'sine f=B6 env=5/500/0/200 dur=80 v=.005 at=260'],
});
se('se_c3_gusoku_eye', {
  label: 'グソっ君の目が光る（ぽう）',
  group: G_UMI,
  layers: ['sine f=G4 env=60/300/0/150 dur=150 v=.008 am=6/.3', 'sine f=D5 env=60/250/0/150 dur=120 v=.004'],
});
/** グソっ君 on the sea floor: his own fourteen feet, low-passed (an alias, no new sound). */
se('se_c3_step_uw', {
  label: '足音：海の底（14本の足）',
  group: G_STEPS,
  lp: 700,
  max: 3,
  fn(c) {
    sub(c, 'se_step_kanenari', { pitch: 0.8, vol: 0.7 });
  },
});
se('se_c3_lens_polish', {
  label: '灯台のレンズをみがく（きゅっ、きゅっ）',
  group: G_UMI,
  rand: [0.04, 0.1],
  layers: ['saw f=1800→2100/150 env=20/150/0/50 dur=120 v=.003 flt=BP2200q4 rep=2x260'],
});
se('se_c3_lens_beam', {
  label: 'レンズの光が海に届く（波がひとつ動きだす）',
  group: G_UMI,
  rev: 0.3,
  fn(c) {
    layer(c, 'sine f=D6 env=20/600/0/300 dur=200 v=.010');
    layer(c, 'sine f=A6 env=20/500/0/300 dur=150 v=.006 at=80');
    // level 1: the 「みました」 of fushigi_ch3_05 — only the light, no wave
    if (c.opts.level !== 1) layer(c, 'noise env=300/800/0/400 dur=500 v=.006 flt=LP900 at=500');
  },
});
/** Part ③「いただきます の 声」(S09): カイト's whistle, then the children's M9. */
se('se_c3_part_koe', {
  label: '部品③「いただきます」の声（笛と子どもの声）',
  group: G_UMI,
  max: 1,
  fn(c) {
    sub(c, 'se_c3_fue', { vol: 0.6 });
    notes(c, 'ins_choir', M9, { gap: 180, len: 170, last: 900, vol: 0.04, at: 400, child: true });
  },
});

// ---- 8.6 戦闘：敵の技とナリオサメ

se('se_c3_nefuda', {
  label: 'ネフダマヨイの値札（カタッ、書きかえ）',
  group: G_BATTLE,
  layers: ['tri f=700→900/20 env=0/50/0/20 dur=10 v=.016', 'noise env=0/30/0/10 dur=10 v=.008 flt=BP2000q1.5'],
  fn(c) {
    sub(c, 'se_pen_write', { at: 150, vol: 0.5 });
  },
});
se('se_c3_wing', {
  label: 'ヨコドリの急降下（羽の風切り）',
  group: G_BATTLE,
  layers: ['noise env=80/250/0/100 dur=200 v=.048 flt=BP900q1 am=22/.5 pan=-.6→.6'],
});
se('se_c3_pump', {
  label: 'アソビタリンの空気入れ（シュッ）',
  group: G_BATTLE,
  layers: ['noise env=10/150/0/60 dur=100 v=.012 flt=BP2400q1.2', 'sine f=200→260/120 env=0/120/0/40 dur=60 v=.006'],
});
se('se_c3_signboard', {
  label: 'ジュンロの「こちらへ」（矢印がくるっ）',
  group: G_BATTLE,
  layers: ['tri f=500→1000/250 env=0/250/0/60 dur=200 v=.013 flt=LP2000', 'noise env=0/30/0/10 dur=10 v=.013 flt=BP1800q1 at=260'],
});
/**
 * The 「いただきます」 clap of hands: count (1–12) hands, each ±15 ms and
 * ±2 % apart; the cupped 「ぽ」 is everyone's same G (the tonic).
 */
se('se_c3_gassho', {
  label: '合掌（手が合わさる「パン」。count 人ぶん）',
  group: G_BATTLE,
  max: 3,
  fn(c) {
    const n = Math.max(1, Math.min(12, Math.round(c.opts.count ?? 1)));
    const off = cur().offline;
    const per = n === 1 ? 1 : 1.6 / Math.sqrt(n);
    for (let i = 0; i < n; i++) {
      const at = i === 0 || off ? i * 4 : (Math.random() * 2 - 1) * 15 + 15;
      const p = i === 0 || off ? 1 : 1 + (Math.random() * 2 - 1) * 0.02;
      layer(c, 'noise env=0/40/0/20 dur=15 v=.016 flt=BP1500q1.2', { at, pitch: p, vol: per });
      layer(c, 'sine f=180→140/30 env=0/60/0/20 dur=15 v=.010', { at, pitch: p, vol: per });
      if (i < 4) layer(c, 'sine f=G5 env=10/250/0/100 dur=40 v=.004 at=30', { at, vol: per });
    }
  },
});
/** ナリオサメの「羽根の 風」. level 1: 「まだ 鳴り終わりたくない」 — the impeller running down instead (v .5). */
se('se_c3_nari_kaze', {
  label: 'ナリオサメの羽根の風（level 1：羽根が止まる）',
  group: G_BATTLE,
  fn(c) {
    const down = c.opts.level === 1;
    const k = down ? 0.5 : 1;
    layer(c, down ? 'noise env=50/700/0/300 dur=700 v=.020 flt=BP700q0.8 am=18→5/800/.5' : 'noise env=200/600/0/300 dur=700 v=.020 flt=BP700q0.8 am=6→18/800/.5', { vol: k });
    // the siren begins to turn and stops at once (never up, never down)
    if (!down) {
      const p = viaUmi(c, 'se_c3_nari_kaze');
      sirenNote({ t: p.t, dest: p.dest, f0: 165 * p.pitch, semis: 3, rise: 0.6, hold: 0, vol: 0.02 * p.vol });
    }
  },
});
/** ナリオサメの「町を 呼ぶ」: the siren's head — and 0.6 s in which nobody comes. */
se('se_c3_nari_yobu', {
  label: 'ナリオサメの「町を 呼ぶ」（だれも 来ない）',
  group: G_BATTLE,
  fn(c) {
    sfxTable.get('se_c3_siren_head')?.({ at: c.t, vol: c.vol });
  },
});
// The aliases of 61 1.9 (63 0.2): the same sounds under the chapter's names.
for (const [id, to, label] of [
  ['se_c3_rewind', 'se_rewind', '（別名）巻きもどし ＝ se_rewind'],
  ['se_c3_yakiimo', 'se_yakiimo', '（別名）焼き芋 ＝ se_yakiimo'],
  ['se_c3_mada_stamp', 'se_mada_stamp', '（別名）まだ ＝ se_mada_stamp'],
  ['se_c3_draw', 'se_hanamaru_draw', '（別名）はなまるを描く ＝ se_hanamaru_draw'],
] as const) {
  registerSfx(id, (o) => sfxTable.get(to)?.(o));
  sfxInfo.set(id, { label, group: G_BATTLE });
}

// ---- 8.8 ハンコ（第3章）
// The grade stamp itself (se_stamp / se_stamp_heavy / se_stamp_light) is
// played by the battle as for every hanko; these are what lies on top of it.

/** A part of 「いただきます」 found (level 0–2: お箸・合掌・声 → G4, B4, D5 on the music box). */
se('se_c3_part', {
  label: 'ハンコの部品がそろった（オルゴール1音）',
  group: G_HANKO,
  fn(c) {
    const i = Math.max(0, Math.min(2, Math.round(c.opts.level ?? 0)));
    notes(c, 'ins_musicbox', [[67, 71, 74][i]], { gap: 0, last: 600, vol: 0.07, rev: 0.4 });
    sub(c, 'se_stamp_light', { at: 200, vol: 0.4 });
  },
});
/**
 * S11: the three parts in place, 「いただきます」 rises in the 8th frame — M9 on
 * the music box once (the outline seen in chapter 2's cut 7 becomes sound).
 * level 9: S13's 「ごちそうさま」 in the 9th frame — M9′ instead.
 */
se('se_c3_hanko_float', {
  label: 'ハンコが浮かぶ（M9 のオルゴール。level 9：M9′）',
  group: G_HANKO,
  max: 1,
  fn(c) {
    notes(c, 'ins_musicbox', c.opts.level === 9 ? M9_GOCHI : M9, { gap: 220, len: 200, last: 1000, vol: 0.08, rev: 0.4 });
    sub(c, 'se_hanko_learn', { at: 1500, vol: 0.8 });
  },
});
/** ハンコ「いただきます」 pressed: the hands (2–3 in battle) and M9's first two notes, small. */
se('se_c3_itadakimasu', {
  label: 'ハンコ「いただきます」（合掌とオルゴール）',
  group: G_HANKO,
  fn(c) {
    // three hands unless the battle says how many (61: 2–3)
    sub({ ...c, opts: { ...c.opts, count: c.opts.count ?? 3 } }, 'se_c3_gassho', { at: 120 });
    notes(c, 'ins_musicbox', [79, 79], { gap: 150, vol: 0.03, at: 200, rev: 0.3 });
  },
});
/** ハンコ「ごちそうさま」 pressed: an empty bowl put down (high, small) and M9′'s last two notes. */
se('se_c3_gochisousama', {
  label: 'ハンコ「ごちそうさま」（どんぶりとオルゴール）',
  group: G_HANKO,
  fn(c) {
    sub(c, 'se_c3_donburi', { at: 100, pitch: 1.6, vol: 0.5 });
    notes(c, 'ins_musicbox', [81, 79], { gap: 180, vol: 0.03, at: 250, rev: 0.3 });
  },
});

// ---- S14: ツガオ便の罠、着いた所で M7 の4音が1回だけ（5.2、12.12）

/**
 * The truck stops at the old aquarium and, 0.5 s later, ツガオ's motif M7
 * (D2 E♭2 D2 A1, half notes) once on the sub bass — the first time it is
 * heard with the truck. It stops on A1 (M7′'s fifth note is sealed).
 */
se('se_c3_wana_m7', {
  label: '罠の荷台が着いた（M7 の4音、1回だけ）',
  group: G_OPEN,
  max: 1,
  fn(c) {
    const half = (60 / 112) * 2;
    [38, 39, 38, 33].forEach((m, i) => INS.ins_sub({ t: c.t + i * half, midi: m, dur: half * 0.95, vel: 1, dest: c.dest, o: { vol: 0.08 * c.vol } }));
  },
});
