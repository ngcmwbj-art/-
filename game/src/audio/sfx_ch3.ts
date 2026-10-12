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
import { cur, dbToGain, midiHz, noteMidi } from './engine';
import { c3Noon1201, registerSfx, registerSfxLoop } from './index';
import { seTrim, trimOr1 } from './mix';
import { currentPlayer, duck, duckAmbience } from './music';
import { layer, parseLayer, se, seDefs, sub, type SeCtx } from './recipe';
import { sfxInfo, sfxTable, type LoopHandle, type SfxOpts } from './registry';
import { atTime } from './clock';
import { D69, nearestPc, voiceBaseMidi as voiceNote, VOICES } from './voices';

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

// ============================================================================
// 第3期 (S15〜S24): 旧水族館, ツガオの初戦, ヤキソバン, ヒロスケ・ポコシャ戦

const G_AQ = '第3章：旧水族館';
const G_YK = '第3章：ヤキソバンとまだまだ団';
CH3_SE_GROUPS.push(G_AQ, G_YK);

/**
 * The old aquarium's ceiling speakers (bus_pa 'kannai', 63 3.3): like viaUmi,
 * the layers go into the PA. Offline renders (QA) hear the 館内 voicing.
 */
function viaKannai(c: SeCtx, id: string): SeCtx {
  const g = cur();
  if (g.offline && g.pa.mode !== 'kannai') g.pa.setMode('kannai', 0);
  g.pa.open(c.t);
  g.pa.wake(c.t + 4);
  return { ...c, dest: g.pa.input, vol: c.vol * trimOr1(seTrim(id)), rev: 0 };
}

/** A voice's base note as midi (63 8.9: a doll lights up in its person's voice). */
function voiceBaseMidi(voiceId: string | undefined): number | null {
  if (!voiceId) return null;
  const n = noteMidi(voiceId);
  if (!Number.isNaN(n)) return n;
  const v = VOICES[voiceId.startsWith('npc_') ? voiceId.slice(4) : voiceId];
  if (!v) return null;
  return typeof v.base === 'number' ? 69 + 12 * Math.log2(Math.max(1, v.base) / 440) : noteMidi(v.base);
}
// ---- 8.6 戦闘：ツガオ（初戦の「はじく」、決戦の技）・係長の声

se('se_c3_hajiku', {
  label: '朱のインクが黒い「まだ」にはじかれる（ツガオ初戦）',
  group: G_BATTLE,
  fn(c) {
    // the head of the stamp only (no grade)
    layer(c, 'sine f=150→90/40 env=0/40/0/15 dur=12 v=.02');
    layer(c, 'noise env=0/25/0/10 dur=8 v=.012 flt=LP1200');
    // 「ぱちっ」: oil throwing off a drop of water
    layer(c, 'noise env=0/40/0/15 dur=15 v=.012 flt=BP3200q2 at=60');
    layer(c, 'sine f=900→1400/40 env=0/50/0/20 dur=20 v=.006 at=60');
  },
});
se('se_c3_chokin', {
  label: 'ツガオの「休みの 貯金」（缶の貯金箱）',
  group: G_BATTLE,
  layers: ['tri f=2200 env=0/40/0/15 dur=8 v=.010 rep=3x90 rnd=15', 'sine f=300→220/80 env=0/100/0/30 dur=30 v=.012 at=380'],
});
se('se_c3_fubuki', {
  label: 'ツガオの「伝票」（40年ぶんの伝票がふぶく）',
  group: G_BATTLE,
  fn(c) {
    layer(c, 'noise env=100/800/.3/400 dur=900 v=.016 flt=BP2600q0.7 am=30/.6');
    // paper hitting, one sheet at a time (40–90 ms apart, 1.2 s)
    let at = 0;
    let k = 0;
    while (at < 1200) {
      layer(c, 'noise env=0/10/0/5 dur=4 v=.006 flt=HP4000', { at });
      k++;
      at += cur().offline ? 65 : 40 + Math.random() * 50;
      if (k > 40) break;
    }
  },
});
/** 係長の声の黒い吹き出しが降ってくる（61 16.7: 300 ms, a 2 px bounce）: soft, never a blow. */
se('se_c3_koe', {
  label: '係長の声の黒い吹き出しが降る（ぼすっ）',
  group: G_BATTLE,
  max: 3,
  layers: [
    // falling air
    'noise env=200/80/0/40 dur=220 v=.004 flt=BP700q1.2',
    // lands: a dull, cushioned thump, and the little bounce
    'sine f=180→110/60 env=0/90/0/30 dur=30 v=.018 at=300',
    'noise env=0/40/0/20 dur=15 v=.006 flt=LP600 at=300',
    'sine f=150→120/30 env=0/40/0/15 dur=10 v=.006 at=380',
  ],
});
/** A tsukkomi breaks a balloon: it comes apart like a paper bag, and the air clears. */
se('se_c3_koe_break', {
  label: '吹き出しがツッコミでほどける（ぱりっ、すっ）',
  group: G_BATTLE,
  max: 3,
  layers: [
    'noise env=0/60/0/25 dur=30 v=.016 flt=BP2400q0.9 am=60/.7',
    'tri f=1500→2400/60 env=0/80/0/30 dur=30 v=.006 at=20',
    // the air clears (a light sparkle, not a win)
    'sine f=A5 env=5/250/0/120 dur=50 v=.004 at=120',
    'sine f=E6 env=5/220/0/120 dur=40 v=.003 at=180',
  ],
});

// ---- 8.7 戦闘：ヤキソバンのわざ（61 5章）

se('se_c3_spatula', {
  label: 'ヘラ返し（シャッ、カン）',
  group: G_YK,
  fn(c) {
    layer(c, 'noise env=5/120/0/40 dur=80 v=.014 flt=BP4200q1.5');
    DRM.drm_hera({ t: c.t + 0.12 / c.pitch, vel: 0.8 * c.vol, dest: c.dest });
  },
});
/** 鉄板. pitch 1.0 / 1.12 / 1.25 with the heat (61 5.5). */
se('se_c3_teppan', {
  label: '鉄板（カン、カン、ジュワッ。pitch で熱の段）',
  group: G_YK,
  fn(c) {
    DRM.drm_hera({ t: c.t, vel: 0.9 * c.vol, dest: c.dest });
    DRM.drm_hera({ t: c.t + 0.18, vel: 0.9 * c.vol, dest: c.dest });
    layer(c, 'noise env=10/700/.2/300 dur=600 v=.020 flt=BP4200q0.9 am=25/.5 at=300');
    layer(c, 'noise env=0/500/0/200 dur=300 v=.006 flt=LP500 at=300');
  },
});
se('se_c3_kosogeru', {
  label: 'こそげる（ガリッ、ガリッ、ちん）',
  group: G_YK,
  layers: [
    'noise env=0/90/0/30 dur=60 v=.016 flt=BP2600q1 am=70/.8 rep=2x260',
    'saw f=320→260/60 env=0/80/0/30 dur=40 v=.004 flt=BP900q2 rep=2x260',
    'sine f=D6 env=5/300/0/150 dur=60 v=.006 at=560',
  ],
});
se('se_c3_oomori', {
  label: '大盛り（ドサッと湯気。回復）',
  group: G_YK,
  fn(c) {
    layer(c, 'noise env=5/150/0/80 dur=100 v=.014 flt=LP1200');
    layer(c, 'sine f=150→110/100 env=0/150/0/60 dur=60 v=.020');
    layer(c, 'noise env=200/400/0/300 dur=300 v=.004 flt=BP1800q0.5 at=250');
    sub(c, 'se_heal', { at: 400, vol: 0.6 });
  },
});

// ---- 8.10 まだまだ団：ぴーちゃんの大きな声（S24 の決着。めんどりの「コケッ、コケッ、コケーーッ」）

/** A hen's big call (never a rooster's コケコッコー: ぴーちゃん is a hen, 53 1.6). */
se('se_piichan_big', {
  label: 'ぴーちゃんの大きな声（コケッ、コケッ、コケーーッ）',
  group: G_YK,
  max: 1,
  fn(c) {
    for (const at of [0, 380]) {
      layer(c, 'sq f=900→1500/50 env=2/60/0/20 dur=50 v=.022 flt=BP2000q3', { at });
      layer(c, 'sq f=1200→800/60 env=2/60/0/20 dur=60 v=.018 flt=BP2000q3', { at: at + 60 });
    }
    // 「コケーーッ」: up, and settling as it stretches
    layer(c, 'sq f=1000→1700/300 env=10/0/1/40 dur=300 v=.024 flt=BP2200q2.5 vib=7/15 at=760');
    layer(c, 'sq f=1700→1300/600 env=0/0/1/200 dur=600 v=.024 flt=BP2200q2.5 vib=7/15 at=1060');
    sub(c, 'se_piichan_flap', { at: 700 });
  },
});
// the aliases (63 0.2): ぴーちゃんの見回り = her 「ココッ」; the hall's key
for (const [id, to, label] of [
  ['se_c3_pii', 'se_piichan_koko', '（別名）ぴーちゃんの見回り ＝ se_piichan_koko'],
  ['se_c3_key', 'se_c3_aq_key', '（別名）ホールの鍵 ＝ se_c3_aq_key'],
  ['se_c3_aq_pa_open', 'se_h_pa_open', '（別名）館内放送のマイク ＝ se_h_pa_open（kannai）'],
] as const) {
  registerSfx(id, (o) => sfxTable.get(to)?.(o));
  sfxInfo.set(id, { label, group: id === 'se_c3_pii' ? G_YK : G_AQ });
}

// ---- 8.9 旧水族館（S15〜S24）

se('se_c3_aq_door', {
  label: '旧水族館のガラス戸（手で押す、ゴゴ…）',
  group: G_AQ,
  layers: ['noise env=50/600/0/200 dur=600 v=.010 flt=LP700 am=15/.3', 'sine f=1200→1100/500 env=50/400/0/100 dur=400 v=.002 flt=BP1200q4'],
});
se('se_c3_aq_ticket', {
  label: '入館券を切る（ビリッ）',
  group: G_AQ,
  layers: ['noise env=0/250/0/40 dur=200 v=.012 flt=BP3200q1.2 am=90/.8'],
});
/** The aquarium's PA chime: E5 C5 G5 on the vibes, through the ceiling speakers (not like a real one). */
se('se_c3_aq_pa_chime', {
  label: '館内放送のチャイム（ポーン・ポーン・ポーン）',
  group: G_AQ,
  max: 1,
  fn(c) {
    const p = viaKannai(c, 'se_c3_aq_pa_chime');
    notes(p, 'ins_fm_vibes', [76, 72, 79], { gap: 450, len: 420, last: 900, vol: 0.06 });
    // the music and the beds step back (10.3: −6 / −3 dB)
    if (!cur().offline) {
      duck(dbToGain(-6), 0.3, 1.6, 0.8, c.t);
      duckAmbience(dbToGain(-3), 0.3, 1.6, 0.8);
    }
  },
});
se('se_c3_aq_denpyo', {
  label: '伝票をめくる（ぱらっ、日付印）',
  group: G_AQ,
  rand: [0.04, 0.1],
  layers: ['noise env=2/90/0/40 dur=50 v=.010 flt=BP2600q0.8', 'sine f=240→200/40 env=0/60/0/20 dur=15 v=.010 at=150'],
});
/** The blank slip (8月30日): the turn, then only the small 「しん」 of white paper; the music dips one beat. */
se('se_c3_aq_hakushi', {
  label: '白紙の伝票（めくって、しん）',
  group: G_AQ,
  fn(c) {
    layer(c, 'noise env=2/90/0/40 dur=50 v=.008 flt=BP2600q0.8');
    layer(c, 'noise env=200/400/0/200 dur=300 v=.002 flt=HP5000 at=200');
    if (!cur().offline) duck(dbToGain(-6), 0.05, 0.75, 0.3, c.t + 0.1);
  },
});
/**
 * A doll of the diorama lights up: a tiny 「ちん」 two octaves over its
 * person's voice (opts.note: a voice id such as 'mamekichi', or a note).
 */
se('se_c3_aq_ningyo', {
  label: 'ジオラマの人形が光る（その人の声の高さで「ちん」）',
  group: G_AQ,
  max: 3,
  fn(c) {
    const m = (voiceBaseMidi(c.opts.note) ?? 69) + 24;
    const f = midiHz(Math.min(100, m));
    layer(c, { ...parseLayer('sine env=2/350/0/120 dur=40 v=.006'), f });
    layer(c, { ...parseLayer('sine env=2/250/0/100 dur=30 v=.003 at=40'), f: f * 1.5 });
  },
});
se('se_c3_aq_glass', {
  label: 'グソっ君が空の水槽のガラスに、はさみを当てる（こつ）',
  group: G_AQ,
  max: 1,
  layers: ['sine f=1900 env=0/40/0/20 dur=10 v=.006', 'sine f=2600 env=0/900/0/400 dur=300 v=.0015 at=10 rev=.6'],
});
se('se_c3_aq_nisshi', {
  label: '飼育日誌の切れはしを拾う',
  group: G_AQ,
  layers: ['noise env=5/120/0/60 dur=70 v=.008 flt=BP1800q0.7'],
});
se('se_c3_aq_esa_fuda', {
  label: 'えさの時間の札を並べる（ぱちっ）',
  group: G_AQ,
  rand: [0.03, 0.08],
  layers: ['tri f=1500 env=0/30/0/10 dur=6 v=.012', 'noise env=0/15/0/5 dur=5 v=.006 flt=HP3000'],
});
/** M11 えさの鐘: a hand bell, three strokes 0.4 s apart. Only S19 and S30 (1.3). */
se('se_c3_aq_esa_bell', {
  label: 'えさの鐘（M11。手鈴を3打）',
  group: G_AQ,
  max: 1,
  layers: ['sine f=E6 env=1/500/0/150 dur=40 v=.012 rep=3x400', 'sine f=4120 env=1/300/0/100 dur=30 v=.006 rep=3x400', 'noise env=0/15/0/5 dur=5 v=.004 flt=BP4000q2 rep=3x400'],
});
se('se_c3_aq_key', {
  label: 'ホールの鍵（チャリ、カチャン）',
  group: G_AQ,
  fn(c) {
    sub(c, 'se_truck_key', { vol: 0.8 });
    layer(c, 'tri f=1200→900/30 env=0/50/0/20 dur=15 v=.012 at=250');
  },
});
/** ツガオ's yawn: one long low 「あ」 of his voice, D3 sinking to C3 — never a word. */
se('se_c3_aq_akubi', {
  label: 'ツガオのあくび（低い「あ」が下がる）',
  group: G_AQ,
  max: 1,
  fn(c) {
    layer(c, 'saw f=D3→C3/900 env=80/0/1/200 dur=900 v=.030 flt=LP900');
    // the 「あ」: two formants
    layer(c, 'saw f=D3→C3/900 env=80/0/1/200 dur=900 v=.012 flt=BP800q5');
    layer(c, 'saw f=D3→C3/900 env=80/0/1/200 dur=900 v=.006 flt=BP1250q7');
  },
});
se('se_c3_aq_reizo', {
  label: '古い冷凍庫の扉（ボフッ、ガチャン）',
  group: G_AQ,
  max: 1,
  layers: ['noise env=0/120/0/80 dur=80 v=.014 flt=LP500', 'sine f=110→80/80 env=0/150/0/60 dur=60 v=.020 at=200', 'tri f=900 env=0/40/0/15 dur=10 v=.012 at=600'],
});
se('se_c3_aq_hasso', {
  label: '発泡スチロールの空き箱（きゅっ）',
  group: G_AQ,
  rand: [0.08, 0.15],
  layers: ['saw f=900→700/80 env=0/100/0/30 dur=60 v=.003 flt=BP1600q3'],
});
se('se_c3_aq_imo_waru', {
  label: '冷めた焼き芋を半分に割る（新聞紙、ほくっ）',
  group: G_AQ,
  max: 1,
  layers: ['noise env=5/100/0/40 dur=60 v=.008 flt=BP1800q0.7', 'noise env=0/80/0/40 dur=40 v=.008 flt=LP600 at=250'],
});
/** エゴ's card comes half out of the slot and stops (se_dakoku's 「シュッ」, cut). */
se('se_c3_aq_card', {
  label: '白紙のカードが半分だけ出る（シュッ…）',
  group: G_AQ,
  max: 1,
  layers: ['noise env=20/80/1/0 dur=80 v=.010 flt=HP3000'],
});
se('se_c3_aq_kachi', {
  label: '倉庫の錠が外れる（カチ）',
  group: G_AQ,
  max: 1,
  layers: ['tri f=2400 env=0/25/0/8 dur=6 v=.014', 'noise env=0/10/0/5 dur=4 v=.006 flt=HP4000'],
});
/** The deep-sea room's black curtain: a thick cloth 「ばさ」, and for 0.4 s everything sounds farther (LP 1200 Hz). */
se('se_c3_curtain', {
  label: '深海の展示室の黒いカーテンをくぐる（ばさ）',
  group: G_AQ,
  max: 1,
  fn(c) {
    layer(c, 'noise env=10/300/0/100 dur=150 v=.010 flt=BP900q0.6');
    const g = cur();
    if (g.offline) return;
    const f = g.musicFilter.frequency;
    const t = c.t;
    f.cancelScheduledValues(t);
    f.setValueAtTime(f.value, t);
    f.setTargetAtTime(1200, t, 0.04);
    f.setTargetAtTime(20000, t + 0.4, 0.12);
    duckAmbience(dbToGain(-6), 0.05, 0.3, 0.3);
  },
});

/**
 * エゴの台車 (8.9): a loop — small casters rolling, a 「ことん」 at every seam
 * of the floor. sfxLoop('se_c3_aq_cart'); move it with setPan / setVol (near
 * and far), stop it with stop(fade).
 */
registerSfxLoop('se_c3_aq_cart', (o) => cartLoop(o));
sfxInfo.set('se_c3_aq_cart', { label: 'エゴの台車（ゴロゴロ、ことん。ループ）', group: G_AQ });

function cartLoop(opts?: SfxOpts): LoopHandle {
  const g = cur();
  const out = g.ctx.createGain();
  const base = (opts?.vol ?? 1) * trimOr1(seTrim('se_c3_aq_cart'));
  out.gain.value = base;
  const lp = g.ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 3000;
  const pan = g.ctx.createStereoPanner();
  pan.pan.value = opts?.pan ?? 0;
  out.connect(lp);
  lp.connect(pan);
  pan.connect(g.sfxBus);
  const send = g.ctx.createGain();
  send.gain.value = 0.3;
  pan.connect(send);
  send.connect(g.fxSend);
  const c: SeCtx = { t: g.ctx.currentTime + 0.02, pitch: opts?.pitch ?? 1, vol: 1, dest: out, rev: 0, opts: opts ?? {} };
  // the casters rolling (held until stop)
  const rolling = layer(c, 'noise env=100/0/1/200 dur=600000 v=.006 flt=LP800 am=14/.4');
  let next = c.t + 0.3;
  let stopped = false;
  const pump = () => {
    if (stopped) return;
    const until = g.ctx.currentTime + 0.2;
    while (next < until) {
      layer({ ...c, t: next }, 'tri f=300 env=0/40/0/20 dur=10 v=.006');
      next += 0.6 + (g.offline ? 0.15 : Math.random() * 0.3);
    }
    atTime(g.ctx.currentTime + 0.08, pump);
  };
  pump();
  return {
    set(param, value) {
      const t = g.ctx.currentTime;
      // 'vol' 0..1 (near / far), 'pan' −1..1, 'lp' Hz (behind the door)
      if (param === 'vol') out.gain.setTargetAtTime(base * Math.max(0, value), t, 0.15);
      if (param === 'pan') pan.pan.setTargetAtTime(Math.max(-1, Math.min(1, value)), t, 0.15);
      if (param === 'lp') lp.frequency.setTargetAtTime(Math.max(200, value), t, 0.15);
    },
    stop(fade = 0.4) {
      if (stopped) return;
      stopped = true;
      const t = g.ctx.currentTime;
      out.gain.cancelScheduledValues(t);
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + Math.max(0.02, fade));
      for (const h of rolling) h.stop(0.02, t + Math.max(0.02, fade));
      setTimeout(() => out.disconnect(), (fade + 1.5) * 1000);
    },
  };
}


// ============================================================================
// 8.11 よぶ・みんなのはなまる・エンディング（第4期）

const G_END = '第3章：よぶ・みんなのはなまる・エンディング';
CH3_SE_GROUPS.push(G_END);

/** Another recipe inside this one, through this one's fader (sub); a plain registerSfx as it is. */
function play(c: SeCtx, id: string, o: { at?: number; vol?: number; pitch?: number } = {}): void {
  if (seDefs.has(id)) {
    sub(c, id, o);
    return;
  }
  sfxTable.get(id)?.({ at: c.t + (o.at ?? 0) / 1000, vol: c.vol * (o.vol ?? 1), pitch: c.pitch * (o.pitch ?? 1), pan: c.pan });
}

/**
 * よぶ (cmd_yobu, 61 14.4 t=0): someone far off answers — footsteps coming
 * closer on their own ground (level 1 夕鳴町 asphalt, 2 星見台 dirt, 3 海ぞいの町
 * stone; 4 しゅんたち the hall's tile) and a breath 「はっ」. No voice (61).
 */
se('se_c3_yobu', {
  label: 'よぶ（遠くから足音と、返事の息）',
  group: G_END,
  fn(c) {
    const lv = Math.max(1, Math.min(4, Math.round(c.opts.level ?? 1)));
    const step = ['se_step_asphalt', 'se_step_dirt', 'se_step_stone', 'se_step_tile'][lv - 1];
    for (let i = 0; i < 4; i++) play(c, step, { at: i * 220, vol: 0.4 + (0.6 * i) / 3 });
    layer(c, 'noise env=60/200/0/150 dur=150 v=.004 flt=BP900q1 at=900');
  },
});

/**
 * 61 14.4 / 63 8.11: what each person adds after the pen (se_c3_draw) — the
 * thing they drew with. se_c3_e_<npc id without npc_> (se_c3_e_obaa,
 * se_c3_e_hoshi_mitsu …; se_c3_e_shun / _gusokkun / _yakisoban for ④).
 */
const DRAW_EXTRA: [string, string, (c: SeCtx) => void][] = [
  ['obaa', '赤ペンの採点', (c) => play(c, 'se_pen_write', { vol: 0.5 })],
  ['mamekichi', '豆腐の水を切る「ちゃぷ」', (c) => play(c, 'se_drip', { pitch: 0.8, vol: 0.6 })],
  ['hoshi_mitsu', 'トマトのへた「ぷちっ」', (c) => play(c, 'se_wakime_poki', { pitch: 1.3, vol: 0.5 })],
  ['hoshi_gen', '牛の鼻輪「ちん」', (c) => void layer(c, 'sine f=1700 env=0/300/0/80 dur=10 v=.006')],
  ['hoshi_fumi', '星（灯りの1音）', (c) => void layer(c, 'tri f=1568 env=2/260/0/120 dur=20 v=.006')],
  ['hoshi_kucho', '回覧板のはんこ風', (c) => play(c, 'se_stamp_light', { vol: 0.4 })],
  ['tsurumi', '靴をそろえる「ざっ」', (c) => void layer(c, 'noise env=0/40/0/20 dur=30 v=.026 flt=LP600')],
  ['sae', '筆を水入れでゆすぐ「ちゃぽ」', (c) => void layer(c, 'sine f=700→1100/60 env=0/90/0/40 dur=30 v=.006')],
  ['ojii', 'みかんの皮「ぴりっ」', (c) => void layer(c, 'noise env=0/60/0/20 dur=40 v=.016 flt=BP3000q1.5')],
  ['tamotsu', 'ザリガニのはさみ', (c) => play(c, 'se_tsuri_pochan', { vol: 0.4 })],
  ['tokio', '時計の針（チッ）', (c) => DRM.drm_tick({ t: c.t, vel: 0.8 * c.vol, dest: c.dest })],
  ['master', 'カップを置く「かちゃ」', (c) => void layer(c, 'tri f=2600 env=0/50/0/20 dur=8 v=.006')],
  ['madam', '日傘を開く', (c) => play(c, 'se_umbrella_open', { vol: 0.3 })],
  ['bu_body', '影と本体で2つ', (c) => play(c, 'se_hanamaru_draw', { at: 250, pitch: 0.9, vol: 0.6 })],
  ['maru', 'おにぎりののり「ぱり」', (c) => void layer(c, 'noise env=0/30/0/15 dur=20 v=.006 flt=HP3000 rep=2x40')],
  ['hoshi_tome', '稲穂のさらっ', (c) => void layer(c, 'noise env=10/80/0/40 dur=60 v=.005 flt=HP4000')],
  ['hoshi_sawako', '筆をはらう「すっ」', (c) => void layer(c, 'noise env=20/120/0/40 dur=80 v=.013 flt=BP2500q1')],
  ['hoshi_yoshie', '湯のみ', (c) => play(c, 'se_h_yunomi', { vol: 0.4 })],
  ['jk', '包丁の「とん」', (c) => void layer(c, 'tri f=420→300/20 env=0/50/0/20 dur=10 v=.008')],
  ['hoshi_busdriver', '消印', (c) => play(c, 'se_stamp_light', { pitch: 1.3, vol: 0.4 })],
  ['hoshi_traindriver', '切符の穴「ぱちん」', (c) => play(c, 'se_h_seiriken', { pitch: 1.2, vol: 0.5 })],
  ['fudeno', '墨をする「しゅっ」', (c) => void layer(c, 'noise env=30/150/0/50 dur=120 v=.022 flt=BP1800q0.8 am=8/.5')],
  ['photo_master', 'レンズのふた「ぽこ」', (c) => void layer(c, 'sine f=500→600/30 env=0/80/0/30 dur=20 v=.008')],
  ['mizumaki', 'じょうろの水（3つ）', (c) => [0, 110, 230].forEach((at, i) => play(c, 'se_drip', { at, pitch: 1 + i * 0.12, vol: 0.4 }))],
  ['shun', 'しゅんの朱', (c) => play(c, 'se_stamp_light', { vol: 0.6 })],
  ['gusokkun', 'グソっ君のはさみ「ちょき」', (c) => void layer(c, 'tri f=2200 env=0/25/0/10 dur=6 v=.008 rep=2x70')],
  ['yakisoban', 'ヤキソバンのヘラ', (c) => DRM.drm_hera({ t: c.t, vel: 0.7 * c.vol, dest: c.dest })],
];
for (const [key, label, fn] of DRAW_EXTRA) se(`se_c3_e_${key}`, { label: `よぶ：${label}`, group: G_END, fn });

/**
 * 「みんなの はなまる」 lands (skill_minna_hanamaru, 8.8): the heavy 「どん」, then a
 * petal for everyone who came — a sine on each one's own voice note (60 ms
 * apart, 24 at most) — and しゅん's 「ぽん」 and the star last. The voices are
 * the ones bgm_boss_tsugao was given (addVoiceLayer); count overrides how many.
 */
se('se_c3_minna_hanamaru', {
  label: '「みんなの はなまる」の着弾（来た人の数の花びら）',
  group: G_END,
  max: 1,
  fn(c) {
    play(c, 'se_stamp_heavy', { pitch: 0.85 });
    const asked = ((currentPlayer()?.state.layers as string[] | undefined) ?? []).filter((v) => v !== 'shun');
    const notes = asked.map((v) => voiceNote(v)).filter((m): m is number => m !== null);
    const n = Math.max(0, Math.min(24, Math.round(c.opts.count ?? notes.length)));
    for (let i = 0; i < n; i++) {
      const m = notes.length ? notes[i % notes.length] : [62, 66, 69, 71, 76][i % 5] + 12 * (i % 2);
      layer(c, `sine f=${midiHz(nearestPc(m, D69)).toFixed(1)} env=2/300/0/120 dur=40 v=.006 at=${200 + 60 * i}`);
    }
    const end = 200 + 60 * Math.max(0, n - 1);
    play(c, 'se_stamp_light', { at: end + 200, vol: 0.8 });
    play(c, 'se_star', { at: end + 250 });
  },
});

/** 写真館の主人のカメラ (S31): the big old shutter 「カシャッ」 and the lens cap 「ぽこ」. No flash sound. */
se('se_c3_photo', {
  label: '集合写真のシャッター（カシャッ、ぽこ）',
  group: G_END,
  layers: [
    'tri f=1400 env=0/20/0/8 dur=6 v=.016',
    'noise env=0/50/0/20 dur=30 v=.012 flt=BP2200q1.2 at=8',
    'tri f=900 env=0/30/0/10 dur=8 v=.010 at=60',
    'sine f=500→600/30 env=0/80/0/30 dur=20 v=.008 at=600',
  ],
});

/** ヤキソバンがマントをたたむ (S29: たかしにもどる): the flap and the fold. */
se('se_c3_mantle', {
  label: 'マントをたたむ（ばさっ、たたむ）',
  group: G_END,
  layers: ['noise env=5/120/0/60 dur=80 v=.010 flt=BP1200q0.9 am=20/.6', 'noise env=50/300/0/150 dur=200 v=.006 flt=BP2000q0.6 at=350'],
});

/**
 * S25 の入館の打刻 (8.9, 10.3): エゴ clocks everyone in — se_dakoku once a
 * person, 0.45 s apart (0.3 s past 10, 0.22 s past 20; about 6 s at most),
 * the music −8 dB under it. count = how many came. dakokuRun(n) in index.ts
 * waits for it (0.6 s after the last).
 */
export function dakokuGap(n: number): number {
  return n > 20 ? 0.22 : n > 10 ? 0.3 : 0.45;
}
se('se_c3_nyukan', {
  label: 'S25 入館の打刻（来た人の数だけ。count）',
  group: G_END,
  max: 1,
  fn(c) {
    const n = Math.max(0, Math.min(24, Math.round(c.opts.count ?? 1)));
    if (!n) return;
    const gap = dakokuGap(n);
    duck(dbToGain(-8), 0.3, gap * n, 1.0, c.t);
    for (let i = 0; i < n; i++) play(c, 'se_dakoku', { at: i * gap * 1000, vol: 0.85 });
  },
});

/**
 * 回覧板にはなまるを描く (61 14.4, 63 8.11): se_hanamaru_draw with the size of
 * the hand (pitch: a child 1.15, an adult 1.0, the old 0.92 — from `who`
 * unless pitch is given), then that person's own small sound (se_c3_e_<who>).
 * sfx('se_c3_draw', { who: 'npc_obaa' }).
 */
const CHILD = new Set(['sae', 'hoshi_sawako', 'c3_mago', 'c3_kid', 'shun']);
const ELDER = new Set(['obaa', 'ojii', 'maru', 'hoshi_tome', 'hoshi_yoshie', 'fudeno', 'photo_master', 'c3_toudai', 'c3_jouren', 'c3_tsuri']);
registerSfx('se_c3_draw', (o) => {
  const who = (o?.who ?? '').replace(/^npc_/, '');
  const hand = CHILD.has(who) ? 1.15 : ELDER.has(who) ? 0.92 : 1;
  sfxTable.get('se_hanamaru_draw')?.({ ...o, pitch: o?.pitch ?? hand });
  if (!who) return;
  const at = (o?.at ?? cur().ctx.currentTime) + 0.25;
  sfxTable.get(`se_c3_e_${who}`)?.({ at, vol: o?.vol });
});
sfxInfo.set('se_c3_draw', { label: 'よぶ：回覧板にはなまるを描く（＝ se_hanamaru_draw ＋その人の小さな音。who）', group: G_END });

/** 長いすの木のきしみ (amb_c3_aq_hall ③ once, loud: S26 ツガオが立つ・S27 座る). */
se('se_c3_aq_bench', {
  label: 'ホールの長いすがきしむ',
  group: G_AQ,
  layers: ['sine f=400→380/200 env=10/200/0/120 dur=200 v=.012', 'noise env=20/150/0/80 dur=120 v=.003 flt=BP700q2'],
});

/** エゴの台車が近づいて止まる (the one-shot of se_c3_aq_cart's loop: about 2 s). */
se('se_c3_aq_cart', {
  label: 'エゴの台車（近づいて止まる。1回）',
  group: G_AQ,
  layers: [
    'noise env=600/0/1/300 dur=1500 v=.006 flt=LP800 am=14/.4',
    'tri f=300 env=0/40/0/20 dur=10 v=.004 at=200',
    'tri f=300 env=0/40/0/20 dur=10 v=.006 at=850',
    'tri f=300 env=0/40/0/20 dur=10 v=.008 at=1500',
  ],
});

// The names the ending's script asks for (E): the same sounds as before.
for (const [id, to, label, o] of [
  ['se_shock', 'se_emote', '（別名）衝撃の「！」＝ se_emote（焼きそばの3回目。第1章・第2章と同じ音）', {}],
  ['se_emote_exclaim', 'se_emote', '（別名）「！」＝ se_emote', {}],
  ['se_plate', 'se_c3_donburi', '（別名）焼きそばの皿を置く ＝ se_c3_donburi（高く、軽く）', { pitch: 1.4, vol: 0.6 }],
] as const) {
  registerSfx(id, (x) => sfxTable.get(to)?.({ ...x, pitch: (x?.pitch ?? 1) * ((o as SfxOpts).pitch ?? 1), vol: (x?.vol ?? 1) * ((o as SfxOpts).vol ?? 1) }));
  sfxInfo.set(id, { label, group: G_END });
}
