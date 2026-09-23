// Every SE of 40_audio 9 (and the 00_concept 6.8 feel table). The recipe
// strings are the design document's notation, pasted verbatim where possible.

import { atTime } from './clock';
import { chimeCut, chimeNoteAt } from './chime';
import { cur, dbToGain, midiHz, noteMidi, voice, type VoiceHandle } from './engine';
import { chimeNote, INS } from './instruments';
import { higurashiCall } from './ambience';
import { currentId, currentPlayer, duck, duckAmbience, musicParams } from './music';
import { layer, playSe, se, stopSe, sub, type SeCtx } from './recipe';
import { loopTable, type LoopHandle, type SfxOpts } from './registry';
import { Rng } from '../engine/rng';

const STEP = [0.04, 0.12] as [number, number];
const HIT = [0.04, 0.1] as [number, number];

// ============================================================================
// 9.1 UI・メニュー
const UI = 'UI・メニュー';

se('se_cursor', { label: 'カーソル（鉛筆でチョン）', group: UI, rand: [0.03, 0.1], max: 3, layers: ['p25 f=1568 env=1/22/0/12 dur=18 v=.09 flt=LP5200', 'noise env=0/10/0/4 dur=6 v=.035 flt=BP5200q2'] });
se('se_confirm', { label: '決定（朱のハンコ「ぽん」）', group: UI, rand: [0.02, 0.06], layers: ['sine f=740→520/40 env=1/60/0/20 dur=40 v=.16', 'p25 f=1480 env=1/30/0/15 dur=20 v=.06', 'noise env=0/14/0/6 dur=10 v=.05 flt=BP2400q1.5'] });
se('se_cancel', { label: 'キャンセル（消しゴム）', group: UI, layers: ['noise env=4/50/0/30 dur=50 v=.07 flt=BP2200→1400q1.2 am=38/.5', 'tri f=520→390/60 env=2/40/0/20 dur=40 v=.05'] });
se('se_buzzer', { label: '選べない（赤ペン「ブッ」×2）', group: UI, layers: ['sq f=196 env=1/50/.6/15 dur=60 v=.07 flt=LP1200', 'sq f=196 env=1/50/.6/15 dur=60 v=.07 flt=LP1200 at=85'] });
se('se_menu_open', { label: 'メニューを開く（ノート）', group: UI, layers: ['noise env=6/120/0/40 dur=120 v=.07 flt=BP1600→3200q0.9', 'sine f=330→440/80 env=2/60/0/40 dur=60 v=.06 at=40', 'tri f=1320 env=1/40/0/30 dur=20 v=.04 at=110'] });
se('se_menu_close', { label: 'メニューを閉じる（ぱふ）', group: UI, layers: ['noise env=2/70/0/30 dur=60 v=.07 flt=BP2800→1200q0.9', 'sine f=220→110/60 env=1/50/0/30 dur=40 v=.10 at=50'] });
se('se_page', { label: 'ページをめくる', group: UI, layers: ['noise env=10/100/0/40 dur=110 v=.06 flt=BP2500→5000q0.7', 'noise env=0/20/0/10 dur=10 v=.03 flt=HP6000 at=100'] });
se('se_slider', { label: '目盛り（鉛筆「ツ」）', group: UI, max: 2, layers: ['tri f=1760 env=1/15/0/8 dur=10 v=.06'] });
se('se_save', {
  label: 'セーブ（判＋承認の鈴）',
  group: UI,
  fn(c) {
    sub(c, 'se_stamp', { vol: 0.7 });
    layer(c, 'fm f=C6 fm=r3.5:i2→0/400 env=2/700/0/200 dur=100 v=.06 rev=.4 at=120');
    layer(c, 'sine f=E6 env=2/600/0/200 dur=100 v=.04 rev=.4 at=200');
  },
});
const CHARIN = ['sine f=2400 env=0/250/0/60 dur=20 v=.05', 'sine f=3620 env=0/160/0/40 dur=20 v=.03', 'sine f=5870 env=0/90/0/30 dur=20 v=.015', 'noise env=0/8/0/4 dur=4 v=.04 flt=HP4000'];
se('se_shop_buy', {
  label: '買った（缶に「ちゃりん」）',
  group: UI,
  fn(c) {
    for (const l of CHARIN) layer(c, l);
    for (const l of CHARIN) layer(c, l, { at: 70, vol: 0.7, pitch: 1.04 });
  },
});
se('se_coin', { label: '10円玉「チン」', group: UI, rand: [0.05, 0.1], max: 6, layers: ['sine f=2960 env=0/200/0/40 dur=10 v=.05', 'sine f=4430 env=0/140/0/30 dur=10 v=.03', 'sine f=6570 env=0/90/0/20 dur=10 v=.015', 'noise env=0/6/0/3 dur=3 v=.03 flt=HP5000'] });
se('se_count', { label: 'カウント（鉛筆「カッ」）', group: UI, merge: 45, max: 1, rand: [0.03, 0.08], layers: ['noise env=0/18/0/6 dur=10 v=.05 flt=BP3600q2', 'tri f=1200 env=0/12/0/6 dur=6 v=.03'] });
se('se_hp_tick', { label: 'HPバーが減り始める', group: UI, layers: ['sine f=2200 env=0/20/0/10 dur=10 v=.03'] });
se('se_item', {
  label: 'アイテム入手（オルゴール3音）',
  group: UI,
  fn(c) {
    ['C6', 'E6', 'G6'].forEach((n, i) => {
      layer(c, `tri f=${n} env=1/400/0/100 dur=20 v=.07 rev=.3`, { at: i * 60 });
      layer(c, `sine f=${midiHz(noteMidi(n)) * 4} env=1/250/0/80 dur=20 v=.015 rev=.3`, { at: i * 60 });
    });
  },
});
se('se_heal', {
  label: '回復（ふわっと上がる光）',
  group: UI,
  rev: 0.35,
  fn(c) {
    layer(c, 'sine f=C5→C6/400 env=20/300/.3/200 dur=400 v=.07 vib=6/15');
    ['G5', 'C6', 'E6', 'G6'].forEach((n, i) => layer(c, `tri f=${n} env=1/250/0/100 dur=20 v=.05`, { at: i * 80 }));
    layer(c, 'noise env=100/300/0/200 dur=300 v=.012 flt=HP6000');
  },
});

// ============================================================================
// 9.2 会話・エモート・フィールドの知らせ
const TALK = '会話・エモート・知らせ';

se('se_emote', { label: 'エモート「！」', group: TALK, layers: ['p25 f=988→1976/40 env=1/60/.4/30 dur=60 v=.08', 'tri f=1976 env=1/50/0/30 dur=20 v=.05 at=40'] });
se('se_emote_question', { label: 'エモート「？」', group: TALK, layers: ['tri f=523→784/180 env=5/150/.3/50 dur=160 v=.08 vib=8/20'] });
se('se_emote_sweat', { label: 'エモート「汗」', group: TALK, layers: ['sine f=1400→700/120 env=1/110/0/30 dur=100 v=.06', 'noise env=0/15/0/8 dur=8 v=.02 flt=BP3000q2 at=100'] });
se('se_emote_light', { label: 'エモート「きらめき」', group: TALK, layers: ['sine f=2093 env=1/300/0/100 dur=20 v=.04', 'sine f=3136 env=1/300/0/100 dur=20 v=.04 at=60', 'noise env=0/200/0/60 dur=100 v=.008 flt=HP8000'] });
se('se_examine', { label: '調べる（書いてあった）', group: TALK, layers: ['tri f=880 env=1/30/0/15 dur=20 v=.05', 'noise env=0/10/0/5 dur=6 v=.02 flt=BP3000q2'] });
se('se_fushigi', { label: 'ふしぎの知らせ', group: TALK, layers: ['sine f=1175 env=2/100/0/60 dur=60 v=.045 rev=.2', 'sine f=1568 env=2/150/0/80 dur=60 v=.04 rev=.2 at=110'] });
se('se_symbol_notice', { label: '敵シンボルが気づく', group: TALK, layers: ['p12 f=1319→1760/50 env=1/80/0/40 dur=50 v=.05', 'p12 f=2637 env=1/60/0/30 dur=30 v=.03 at=60'] });
const FLIP_L1 = 'saw f=1900→2300/60 env=5/60/.5/40 dur=90 v=.035 flt=BP2400q4 vib=28/60';
se('se_flip', { label: 'フリップ（マーカー「キュキュッ」）', group: TALK, rand: [0.03, 0.08], layers: [FLIP_L1, 'noise env=5/80/0/30 dur=80 v=.03 flt=BP3500q2', 'saw f=2100→1700/40 env=3/40/.4/30 dur=50 v=.03 flt=BP2400q4 vib=28/60 at=110'] });
se('se_pen_write', { label: 'ノートに手書き（1文字）', group: TALK, max: 3, rand: [0.15, 0.15], layers: ['noise env=3/60/.3/30 dur=70 v=.03 flt=BP2800q1.5 am=45/.4'] });
se('se_clock_flip', { label: 'HUD時計がめくれる', group: TALK, layers: ['noise env=1/40/0/20 dur=20 v=.05 flt=BP2000q1', 'tri f=1047 env=1/60/0/30 dur=20 v=.05 at=30', 'sine f=180→120/40 env=1/40/0/20 dur=20 v=.06 at=30'] });

// ============================================================================
// 9.3 足音・扉
const STEPS = '足音・扉';
// the red beach sandals: a little heel slap 35 ms after every step outdoors
const BSAN = (k = 1, f = 1400) => `noise env=0/12/0/5 dur=6 v=${(0.02 * k).toFixed(4)} flt=BP${f}q1.5 at=35`;
let stepSide = 1;
const stepDef = (label: string, layers: string[]) => ({
  label,
  group: STEPS,
  rand: STEP,
  max: 2,
  fn(c: SeCtx) {
    // left / right feet ±0.05
    stepSide = -stepSide;
    const c2 = c.pan === undefined ? { ...c, pan: undefined } : c;
    for (const l of layers) layer(c2, l.includes('pan=') ? l : `${l} pan=${(stepSide * 0.05).toFixed(2)}`);
  },
});
se('se_step_asphalt', stepDef('足音：道路・アーケード（ざっ）', ['noise env=1/30/0/15 dur=20 v=.035 flt=BP1800q0.8', 'sine f=140→90/30 env=1/25/0/10 dur=10 v=.02', BSAN()]));
se('se_step_grass', stepDef('足音：草（さっ）', ['noise env=4/45/0/25 dur=40 v=.03 flt=HP3000 am=60/.4', BSAN(0.6)]));
se('se_step_sand', stepDef('足音：砂場（ざくっ）', ['noise env=6/50/0/30 dur=50 v=.035 flt=LP1400', 'noise env=6/50/0/30 dur=50 v=.01 flt=HP5000 am=90/.6']));
se('se_step_gravel', stepDef('足音：砂利（じゃり）', ['noise env=1/60/0/25 dur=40 v=.04 flt=BP2600q0.7 am=110/.8', 'sine f=120→80/30 env=1/25/0/10 dur=10 v=.015', BSAN(0.6)]));
se('se_step_wood', stepDef('足音：店の板の間（とん）', ['tri f=190→150/30 env=1/40/0/20 dur=20 v=.05', 'noise env=0/20/0/10 dur=10 v=.02 flt=BP900q1', BSAN(1, 1600)]));
se('se_step_wood_bare', stepDef('足音：家の床・はだし（とっ）', ['tri f=170→140/30 env=2/35/0/20 dur=20 v=.04', 'noise env=1/15/0/10 dur=8 v=.012 flt=BP700q1']));
se('se_step_tatami', stepDef('足音：畳（すっ）', ['noise env=5/40/0/25 dur=30 v=.025 flt=BP700q0.8']));
se('se_step_tile', stepDef('足音：タイル（ぺたっ）', ['noise env=1/25/0/15 dur=15 v=.035 flt=BP2400q1.2', BSAN(1.5, 2000)]));
se('se_step_stone', stepDef('足音：歩道・石畳（こつ）', ['noise env=0/20/0/10 dur=10 v=.03 flt=BP2600q1', 'tri f=210→170/25 env=0/30/0/15 dur=10 v=.03', BSAN(1, 1800)]));
se('se_step_dirt', stepDef('足音：土（ざ）', ['noise env=3/40/0/20 dur=30 v=.03 flt=LP1100', 'sine f=110→80/30 env=1/30/0/10 dur=10 v=.015', BSAN(0.5)]));
se('se_step_metal', stepDef('足音：側溝のふた（かん）', ['sine f=420 env=0/60/0/20 dur=10 v=.03', 'sine f=1130 env=0/40/0/15 dur=10 v=.015', 'noise env=0/15/0/8 dur=8 v=.02 flt=BP3000q1', BSAN()]));
se('se_step_kanenari', { label: '足音：カネナリくん（ぽふ＋コ）', group: STEPS, rand: STEP, max: 2, layers: ['sine f=110→80/50 env=3/60/0/30 dur=30 v=.04', 'noise env=2/30/0/15 dur=20 v=.02 flt=LP600', 'tri f=740 env=1/20/0/10 dur=8 v=.008 at=40'] });

se('se_door', { label: '引き戸（ガラガラ）', group: STEPS, rev: 0.12, layers: ['noise env=10/300/.5/80 dur=320 v=.05 flt=BP900q0.8 am=22/.6', 'noise env=10/250/0/80 dur=250 v=.015 flt=BP3500q3 am=31/.8', 'sine f=120 env=1/60/0/40 dur=20 v=.05 at=340'] });
se('se_door_glass', { label: '店のガラス戸', group: STEPS, rev: 0.12, layers: ['noise env=5/180/.4/60 dur=180 v=.04 flt=BP1400q0.9 am=26/.5', 'tri f=1800 env=0/20/0/10 dur=8 v=.02 at=220'] });
se('se_auto_door', {
  label: '半開きの自動ドア（つっかえる）',
  group: STEPS,
  rev: 0.2,
  fn(c) {
    // the motor whines up (180→260 Hz over 300 ms) and the gate stutters at 250 and 320 ms
    const f = (ms: number) => 180 * Math.pow(260 / 180, Math.min(ms, 300) / 300);
    const segs: [number, number, number][] = [
      [0, 250, 20],
      [280, 320, 4],
      [350, 560, 4],
    ];
    for (const [a, b, atk] of segs)
      layer(c, `saw f=${f(a).toFixed(1)}→${f(b).toFixed(1)}/${b - a} env=${atk}/0/1/${b === 560 ? 60 : 8} dur=${b - a} v=.03 flt=LP900`, { at: a });
    layer(c, 'sine f=90 env=1/80/0/40 dur=20 v=.05 at=620');
  },
});
se('se_door_heavy', { label: '迷子センターの重い引き戸', group: STEPS, rev: 0.2, layers: ['noise env=40/600/.6/150 dur=700 v=.05 flt=LP400 am=12/.5', 'sine f=1350→1180/600 env=30/0/1/100 dur=600 v=.015 vib=9/40', 'sine f=70 env=1/200/0/60 dur=40 v=.10 at=760', 'noise env=0/80/0/40 dur=20 v=.04 flt=LP1200 at=760'] });
se('se_door_small', { label: '乾燥機の扉（カチャ）', group: STEPS, layers: ['noise env=0/20/0/10 dur=8 v=.04 flt=BP2500q2', 'tri f=900→700/60 env=1/80/0/30 dur=40 v=.02 at=40'] });
se('se_stairs', {
  label: '階段（家）',
  group: STEPS,
  fn(c) {
    [1, 0.95, 0.9].forEach((p, i) => sub(c, 'se_step_wood_bare', { at: i * 90, pitch: p }));
  },
});
const BELL4 = ['sine f=2350 env=0/700/0/100 dur=10 v=.04', 'sine f=3420 env=0/500/0/80 dur=10 v=.025', 'sine f=5680 env=0/300/0/60 dur=10 v=.012', 'sine f=7900 env=0/200/0/40 dur=10 v=.006'];
se('se_shop_bell', {
  label: '店の呼び鈴（チリン）',
  group: STEPS,
  rev: 0.2,
  fn(c) {
    for (const l of BELL4) layer(c, l);
    for (const l of BELL4) layer(c, l, { at: 90, vol: 0.6 });
  },
});
se('se_shop_shutter', { label: '店のシャッター', group: STEPS, rev: 0.15, layers: ['noise env=20/1200/0/150 dur=1200 v=.05 flt=BP1200q1 am=30/.9', 'noise env=20/1200/0/150 dur=1200 v=.01 flt=HP4000 am=30/.9', 'sine f=180 env=1/150/0/60 dur=20 v=.05 at=1250'] });

// ============================================================================
// 9.4 町の音・イベント
const TOWN = '町の音・イベント';

se('se_shutter', { label: 'カメラのシャッター（カシャ）', group: TOWN, layers: ['noise env=0/15/0/8 dur=8 v=.06 flt=BP3200q1.5', 'tri f=1400→900/20 env=0/25/0/10 dur=10 v=.03', 'noise env=0/30/0/15 dur=15 v=.05 flt=BP1800q1.2 at=70', 'tri f=1100→700/25 env=0/30/0/10 dur=10 v=.025 at=70'] });
se('se_chain', {
  label: 'チェーンが外れる（遠く）',
  group: TOWN,
  rev: 0.5,
  lp: 3500,
  fn(c) {
    for (const at of [0, 120, 220, 300, 370, 430, 480, 520, 555]) {
      layer(c, 'sine f=2100 env=0/35/0/10 dur=5 v=.012 rnd=15%', { at });
      layer(c, 'sine f=3300 env=0/35/0/10 dur=5 v=.008 rnd=15%', { at });
      layer(c, 'sine f=5200 env=0/35/0/10 dur=5 v=.004 rnd=15%', { at });
    }
    layer(c, 'noise env=0/300/0/100 dur=60 v=.06 flt=BP2000q1 at=900');
    layer(c, 'sine f=310 env=0/250/0/80 dur=20 v=.03 at=900');
    layer(c, 'sine f=780 env=0/180/0/60 dur=20 v=.015 at=900');
    layer(c, 'sine f=90→60/80 env=0/120/0/40 dur=20 v=.06 at=900');
  },
});
se('se_shadow_swing', { label: '町じゅうの影が北東へ回る', group: TOWN, rev: 0.3, layers: ['noise env=800/0/1/400 dur=800 v=.04 flt=BP300→1200q2 pan=-.5→.5', 'sine f=A2→E3/1000 env=400/0/1/400 dur=800 v=.03 am=6/.3 pan=-.5→.5'] });
se('se_crow', { label: 'カラス「カア」', group: TOWN, rev: 0.35, layers: ['saw f=620→540/250 env=15/200/.4/120 dur=250 v=.05 flt=BP1100q3 vib=18/40 pan=.6→-.6', 'noise env=10/220/0/100 dur=220 v=.03 flt=BP1500q2 am=70/.5 pan=.6→-.6'] });
se('se_coo', { label: 'ハト「ポッポ」', group: TOWN, rev: 0.15, layers: ['sine f=330→300/120 env=20/100/.4/80 dur=120 v=.05 flt=LP800 am=16/.5', 'sine f=294→270/120 env=20/100/.4/80 dur=120 v=.05 flt=LP800 am=16/.5 at=220'] });
se('se_cat', { label: 'ネコ「にゃ」', group: TOWN, rev: 0.15, layers: ['saw f=720→980/90 env=15/60/.6/10 dur=90 v=.03 flt=BP1300q4 vib=12/30', 'saw f=980→600/180 env=0/150/.4/40 dur=180 v=.03 flt=BP1100q4 vib=12/30 at=90'] });
se('se_dog_bark', {
  label: '犬「わん」（段階1以降は半音低い）',
  group: TOWN,
  rev: 0.15,
  fn(c) {
    // 段階1以降は pitch 0.944 (台本どおり) unless the caller chose a pitch
    const st = musicParams().stage;
    const k = c.opts.pitch === undefined && st >= 1 && st <= 2 ? 0.944 : 1;
    const c2 = { ...c, pitch: c.pitch * k };
    for (const l of ['saw f=330→260/80 env=3/70/.3/40 dur=80 v=.06 flt=BP900q2.5', 'noise env=2/50/0/20 dur=40 v=.03 flt=BP1500q1.5', 'sine f=165 env=3/60/0/30 dur=40 v=.03']) layer(c2, l);
  },
});

/** Sparrow whistle notes (0.2 s each); follows the town song's pitch bus. */
function whistle(c: SeCtx, notes: [string, number][]): void {
  const det = followMusic();
  let at = 0;
  notes.forEach(([n, len], i) => {
    const last = i === notes.length - 1;
    if (n !== '-') {
      const f = midiHz(noteMidi(n));
      voice({
        at: c.t + at / 1000,
        dest: c.dest,
        wave: 'sine',
        freq: f * 0.85 * c.pitch,
        freqEnd: f * c.pitch,
        glide: 0.025,
        dur: Math.max(0.15, len / 1000 - 0.03),
        attack: 0.005,
        decay: 0.12,
        sustain: 0.4,
        release: last ? 0.02 : 0.06,
        vol: 0.03 * c.vol,
        vibrato: { rate: 12, depth: 40, delay: 0.05 },
        detuneSrc: det,
        reverb: 0.25,
        pan: c.pan ?? 0.3,
      });
    }
    at += len;
  });
}
function followMusic(): AudioNode | null {
  const p = currentPlayer();
  return p && (p.def.fixedStage !== undefined || p.def.stageAware) ? p.det : null;
}
se('se_sparrow_a', {
  label: 'スズメ（ふしぎ#3：前半4音のくり返し）',
  group: TOWN,
  fn(c) {
    whistle(c, [['G6', 200], ['A6', 200], ['C7', 200], ['E7', 200], ['E7', 400], ['G6', 200], ['A6', 200], ['C7', 200], ['E7', 200], ['E7', 380]]);
  },
});
se('se_sparrow_b', {
  label: 'スズメ（みましたのあと）',
  group: TOWN,
  fn(c) {
    whistle(c, [['C7', 200], ['A6', 200], ['G6', 200], ['E6', 200], ['G6', 200], ['-', 100], ['A6', 150], ['C7', 200], ['D7', 200], ['C7', 200], ['A6', 200], ['G6', 200], ['A6', 450]]);
  },
});
se('se_higurashi_call', {
  label: 'ヒグラシの1声',
  group: TOWN,
  fn(c) {
    higurashiCall(c.t, c.dest, c.pan ?? -0.3, c.pitch, 5000, 0.025 * c.vol, new Rng((Math.random() * 1e9) | 0));
  },
});
se('se_furin', {
  label: '風鈴',
  group: TOWN,
  rev: 0.3,
  fn(c) {
    const k = Math.pow(2, ((Math.random() * 2 - 1) * 30) / 1200);
    const c2 = { ...c, pitch: c.pitch * k };
    const L = ['sine f=2210 env=0/1400/0/200 dur=10 v=.04', 'sine f=5230 env=0/700/0/100 dur=10 v=.02', 'sine f=8640 env=0/350/0/60 dur=10 v=.01'];
    for (const l of L) layer(c2, l);
    for (const l of L) layer(c2, l, { at: 140, vol: 0.5 });
  },
});
se('se_fry', {
  label: '揚げる（じゅわー）',
  group: TOWN,
  fn(c) {
    layer(c, 'noise env=30/0/1/800 dur=2200 v=.06 flt=HP2500');
    layer(c, 'noise env=50/0/1/800 dur=2200 v=.015 flt=LP500 am=9/.4');
    // 40 spatters, thinning out over 2.5 s
    for (let i = 0; i < 40; i++) {
      const at = 2500 * Math.pow(Math.random(), 1.8);
      const f = 3000 + Math.random() * 3000;
      layer(c, `noise env=0/${(3 + Math.random() * 3).toFixed(0)}/0/2 dur=3 v=${(0.02 + Math.random() * 0.03).toFixed(3)} flt=BP${f.toFixed(0)}q1.5`, { at, set: { pan: Math.random() * 0.8 - 0.4 } });
    }
  },
});
se('se_crossing_up', { label: '遮断機が上がる（ギギ……）', group: TOWN, rev: 0.2, layers: ['saw f=90→140/1100 env=50/0/1/150 dur=1050 v=.035 flt=LP600', 'sine f=900→1300/1000 env=50/0/1/150 dur=1000 v=.012 vib=7/60 am=14/.7', 'sine f=110 env=1/120/0/40 dur=20 v=.05 at=1100', 'noise env=0/40/0/20 dur=10 v=.03 flt=LP1500 at=1100'] });
function train(c: SeCtx, k: number, pan0: number, pan1: number): void {
  const len = 1300 * k;
  layer(c, `noise env=${500 * k}/0/1/${700 * k} dur=${len} v=.08 flt=LP1200→400 pan=${pan0}→${pan1}`);
  for (const at of [350, 500, 950, 1100, 1550, 1700]) {
    const p = pan0 + (pan1 - pan0) * Math.min(1, (at * k) / len);
    layer(c, `sine f=70 env=0/60/0/20 dur=10 v=.06 pan=${p.toFixed(2)}`, { at: at * k });
    layer(c, `noise env=0/20/0/10 dur=20 v=.04 flt=BP1000q1 pan=${p.toFixed(2)}`, { at: at * k });
  }
  layer(c, `sine f=880→820/${2000 * k} env=${300 * k}/0/1/${600 * k} dur=${1400 * k} v=.01 pan=${pan0}→${pan1}`);
}
se('se_train_pass', { label: '明かりのない電車が通る', group: TOWN, rev: 0.3, fn: (c) => train(c, 1, 0.8, -0.8) });
se('se_train_far', { label: '遠くの電車（夜のほうから）', group: TOWN, rev: 0.7, lp: 300, fn: (c) => train({ ...c, vol: c.vol * 0.3 }, 2.5, 0.9, 0.5) });
se('se_gacha', {
  label: 'ガチャを回す',
  group: TOWN,
  fn(c) {
    for (let i = 0; i < 6; i++) {
      layer(c, 'noise env=0/8/0/4 dur=4 v=.04 flt=BP2500q2', { at: i * 90 });
      layer(c, 'tri f=900 env=0/10/0/5 dur=5 v=.02', { at: i * 90 });
    }
    layer(c, 'tri f=1400→1100/60 env=0/80/0/30 dur=20 v=.04 at=600');
    layer(c, 'sine f=700 env=0/60/0/20 dur=20 v=.02 at=600');
    layer(c, 'noise env=10/180/0/40 dur=180 v=.015 flt=BP3000q2 am=25/.8 at=700');
  },
});
se('se_glint', { label: 'ふしぎのきらり', group: TOWN, layers: ['sine f=3136→4186/80 env=1/180/0/60 dur=20 v=.025', 'sine f=6272 env=1/120/0/40 dur=10 v=.012 at=40'] });
se('se_semi_hop', { label: 'セミのシンボルが跳ねる', group: TOWN, layers: ['noise env=5/120/0/40 dur=100 v=.03 flt=BP4000q3 am=110/.9', 'sine f=300→500/50 env=1/50/0/20 dur=20 v=.02'] });
se('se_cart_rattle', {
  label: 'のらカートがうろうろ',
  group: TOWN,
  fn(c) {
    layer(c, 'noise env=40/400/0/100 dur=400 v=.025 flt=BP2200q2 am=18/.8');
    for (let i = 0; i < 4; i++) layer(c, `sine f=${Math.random() < 0.5 ? 1800 : 2900} env=0/20/0/8 dur=5 v=.01`, { at: Math.random() * 500 });
  },
});
se('se_umbrella_hop', { label: 'ワスレガサが跳ねる', group: TOWN, layers: ['noise env=2/60/0/30 dur=30 v=.03 flt=BP1200q1', 'tri f=400→700/60 env=1/50/0/20 dur=20 v=.02'] });
se('se_robot_bump', { label: 'ソウジロウが壁に当たる', group: TOWN, layers: ['tri f=300→240/40 env=1/60/0/30 dur=20 v=.04', 'noise env=0/20/0/10 dur=8 v=.02 flt=BP1500q1', 'p12 f=1760 env=1/40/0/20 dur=40 v=.015 at=70'] });
se('se_kaitenyaki_stop', { label: '回転焼き機が止まる', group: TOWN, rev: 0.2, layers: ['saw f=140→40/1200 env=0/0/1/200 dur=1200 v=.03 flt=LP500', 'sine f=2000→1500/1100 env=0/0/1/100 dur=1100 v=.008 am=5→1/1100/.8', 'sine f=90 env=1/150/0/50 dur=20 v=.06 at=1300', 'noise env=0/40/0/20 dur=10 v=.03 flt=LP1200 at=1300'] });
se('se_escalator_step', { label: '止まったエスカレーター1段', group: TOWN, rand: STEP, max: 2, rev: 0.2, layers: ['sine f=180 env=0/100/0/20 dur=10 v=.04', 'sine f=470 env=0/70/0/20 dur=10 v=.02', 'sine f=1210 env=0/40/0/10 dur=10 v=.01', 'noise env=0/15/0/8 dur=8 v=.02 flt=BP2000q1'] });
se('se_rumble', { label: '忘れ物の山がふるえる', group: TOWN, rev: 0.2, layers: ['sine f=45 env=200/600/.5/300 dur=900 v=.10 am=8/.5', 'noise env=200/600/.5/300 dur=900 v=.03 flt=LP200', 'saw f=55 env=200/600/.5/300 dur=900 v=.01 flt=LP150', 'tri f=90 env=200/600/.5/300 dur=900 v=.015 am=8/.5'] });
se('se_zipper', { label: '背中のファスナー（ジーッ）', group: TOWN, layers: ['noise env=30/0/1/60 dur=600 v=.035 flt=BP3200q2 am=95→60/600/.8'] });
se('se_paper_bag', { label: 'コロッケの包み（かさっ）', group: TOWN, layers: ['noise env=5/150/0/60 dur=150 v=.04 flt=BP3000q0.8 am=35/.6'] });
se('se_star', { label: '星がひとつ止まる（チン）', group: TOWN, rev: 0.3, layers: ['sine f=4186 env=1/100/.5/5 dur=500 v=.015'] });

// ============================================================================
// 9.5 ハンコ
const HANKO = 'ハンコ';

se('se_stamp', { label: 'ふつうの判（ぺたん）', group: HANKO, rand: HIT, max: 3, layers: ['sine f=120→55/70 env=0/90/0/30 dur=20 v=.30', 'noise env=0/25/0/10 dur=10 v=.12 flt=BP1800q1.2', 'tri f=520→480/20 env=0/20/0/10 dur=8 v=.05', 'noise env=2/40/0/20 dur=20 v=.03 flt=LP900 at=15', 'tri f=240→110/60 env=0/60/0/20 dur=10 v=.04'] });
const HEAVY = ['sine f=90→38/160 env=0/200/0/60 dur=40 v=.50 drive=1.2', 'noise env=0/60/0/30 dur=20 v=.20 flt=LP2000'];
se('se_stamp_heavy', {
  label: 'くっきり判（重いペタン）',
  group: HANKO,
  rev: 0.2,
  rand: [0.03, 0.06],
  max: 3,
  duck: 'heavy',
  fn(c) {
    for (const l of HEAVY) layer(c, l);
    layer(c, 'noise env=0/30/0/10 dur=10 v=.12 flt=BP3000q1');
    layer(c, 'tri f=480→420/20 env=0/25/0/10 dur=8 v=.06');
    for (const at of [20, 45, 75]) layer(c, 'noise env=0/25/0/10 dur=10 v=.03 flt=BP3500q2', { at });
    layer(c, 'sine f=50 env=5/200/0/60 dur=40 v=.12');
    // body for small speakers (2nd harmonic of the thump)
    layer(c, 'tri f=180→80/120 env=0/120/0/40 dur=20 v=.06');
  },
});
se('se_stamp_light', { label: 'かすれ判（薄いペタ・音程あり）', group: HANKO, rand: [0, 0.08], max: 4, layers: ['noise env=0/20/0/10 dur=8 v=.06 flt=HP1500', 'sine f=160→90/40 env=0/50/0/20 dur=10 v=.10', 'tri f=C5 env=0/60/0/30 dur=10 v=.05'] });
se('se_hanko_ready', { label: 'ハンコのアップ（カチッ）', group: HANKO, layers: ['tri f=1320 env=0/25/0/10 dur=8 v=.07', 'noise env=0/12/0/6 dur=6 v=.05 flt=BP3200q3', 'sine f=440 env=0/30/0/10 dur=8 v=.04'] });
se('se_hanko_zone', { label: 'くっきりゾーンに入った「チッ」', group: HANKO, layers: ['sine f=3520 env=0/20/0/10 dur=8 v=.03', 'tri f=1760 env=0/25/0/10 dur=8 v=.02'] });
se('se_thud_low', { label: 'くっきりの低い「ドン」', group: HANKO, duck: 'heavy', layers: ['sine f=70→32/220 env=1/200/0/60 dur=40 v=.35 drive=1.0', 'noise env=1/80/0/30 dur=20 v=.08 flt=LP250', 'tri f=140→64/200 env=1/120/0/40 dur=20 v=.05'] });
se('se_peke_fall', { label: '巨大な×が振り下ろされる（ヒュウ）', group: HANKO, layers: ['noise env=180/0/1/20 dur=200 v=.06 flt=BP600→2400q3', 'sine f=400→900/200 env=180/0/1/20 dur=200 v=.02'] });
se('se_mimashita', {
  label: 'みました（照れの「ポッ」）',
  group: HANKO,
  fn(c) {
    const L1 = 'sine f=880→1320/60 env=2/80/0/40 dur=40 v=.05 at=120';
    layer(c, L1);
    layer(c, 'noise env=0/30/0/15 dur=10 v=.015 flt=BP2000q2 at=120');
    layer(c, 'sine f=2093 env=2/150/0/60 dur=20 v=.015 at=160');
    if (c.opts.grade === 'kukkiri') layer(c, L1, { at: 140, pitch: 1.12 });
  },
});
se('se_hanko_learn', {
  label: '新しいハンコが浮かぶ',
  group: HANKO,
  rev: 0.5,
  fn(c) {
    for (const n of ['C7', 'E7', 'G7', 'B7']) layer(c, `sine f=${n} env=200/800/0/200 dur=200 v=.02`);
    layer(c, 'fm f=C6 fm=r3.5:i2→0/800 env=5/900/0/200 dur=100 v=.05 at=150');
    layer(c, 'noise env=100/900/0/200 dur=200 v=.01 flt=HP9000 am=12/.5');
  },
});
se('se_paper_open', { label: '厚紙を開く（通知表）', group: HANKO, layers: ['noise env=10/180/0/60 dur=150 v=.07 flt=BP900→2400q0.8', 'sine f=150→110/80 env=1/80/0/30 dur=20 v=.06 at=180'] });

// se_hanko_charge — the hold-and-release charge (sfxLoop; 'amount' 0..1, 'zone' 0/1)
loopTable.set('se_hanko_charge', (opts?: SfxOpts): LoopHandle => {
  const g = cur();
  const c = g.ctx;
  const t = c.currentTime;
  const out = c.createGain();
  out.gain.value = opts?.vol ?? 1;
  out.connect(g.sfxBus);
  const saw = c.createOscillator();
  saw.type = 'sawtooth';
  saw.frequency.value = 110;
  const lp = c.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.value = 400;
  lp.Q.value = 2;
  const sg = c.createGain();
  sg.gain.value = 0.04;
  saw.connect(lp);
  lp.connect(sg);
  sg.connect(out);
  const sine = c.createOscillator();
  sine.frequency.value = 880;
  const ng = c.createGain();
  ng.gain.value = 0;
  sine.connect(ng);
  ng.connect(out);
  // the sweet "now!" beating pair (1760 / 1767 Hz) with 14 Hz tremolo
  const z1 = c.createOscillator();
  z1.frequency.value = 1760;
  const z2 = c.createOscillator();
  z2.frequency.value = 1767;
  const zg = c.createGain();
  zg.gain.value = 0;
  const zam = c.createGain();
  zam.gain.value = 0.85;
  const zl = c.createOscillator();
  zl.frequency.value = 14;
  const zlg = c.createGain();
  zlg.gain.value = 0.15;
  zl.connect(zlg);
  zlg.connect(zam.gain);
  z1.connect(zam);
  z2.connect(zam);
  zam.connect(zg);
  zg.connect(out);
  const oscs = [saw, sine, z1, z2, zl];
  for (const o of oscs) o.start(t);
  out.gain.setValueAtTime(0, t);
  out.gain.linearRampToValueAtTime(opts?.vol ?? 1, t + 0.02);
  let stopped = false;
  return {
    set(param, value) {
      if (stopped) return;
      const now = c.currentTime;
      const tc = 0.02 / 3;
      if (param === 'amount') {
        const a = Math.max(0, Math.min(1, value));
        const k = (opts?.pitch ?? 1) * (1 + 0.6 * a);
        saw.frequency.setTargetAtTime(110 * k, now, tc);
        sine.frequency.setTargetAtTime(880 * k, now, tc);
        lp.frequency.setTargetAtTime(400 + 2600 * a, now, tc);
        sg.gain.setTargetAtTime(0.04 + 0.06 * a, now, tc);
        ng.gain.setTargetAtTime(0.03 * a, now, tc);
      } else if (param === 'zone') {
        zg.gain.setTargetAtTime(value ? 0.035 * 0.5 : 0, now, tc);
      }
    },
    stop(fade = 0.02) {
      if (stopped) return;
      stopped = true;
      const now = c.currentTime;
      out.gain.cancelScheduledValues(now);
      out.gain.setValueAtTime(out.gain.value, now);
      out.gain.linearRampToValueAtTime(0, now + fade);
      for (const o of oscs) o.stop(now + fade + 0.02);
      setTimeout(() => out.disconnect(), (fade + 0.2) * 1000);
    },
  };
});

// ============================================================================
// 9.6 チャイム・鐘・放送
const CHIME = 'チャイム・鐘・放送';

se('se_chime_note', {
  label: '防災スピーカーのチャイム1音（note, hold）',
  group: CHIME,
  fn(c) {
    const note = c.opts.note ?? 'G4';
    chimeNoteAt(c.t, note, c.opts.hold ?? 0.45, 0.12 * c.vol, c.pitch);
    // 13.4: the boss's "きーん……" — a high child choir E6 under a held E5
    if (currentId() === 'bgm_boss' && note === 'E5' && (c.opts.hold ?? 0) >= 1.0) {
      const p = currentPlayer();
      if (p) INS.ins_choir({ t: c.t, midi: 88, dur: (c.opts.hold ?? 1.2) + 0.6, vel: 1, dest: p.mix, rev: p.wet, o: { child: true, vol: 0.05 } });
    }
  },
});
se('se_chime_cut', { label: 'チャイムが途切れる（残響ごと）', group: CHIME, fn: (c) => chimeCut(c.t) });
se('se_chime_chord', {
  label: 'ノリツッコミのチャイムの和音',
  group: CHIME,
  rev: 0.4,
  fn(c) {
    for (const n of ['G4', 'C5', 'E5']) layer(c, `fm f=${n} fm=r4:i1.2→0/150 env=2/1100/0/200 dur=100 v=.07 am=5.5/.25`);
    for (const n of ['C6', 'E6']) layer(c, `tri f=${n} env=1/800/0/200 dur=20 v=.03`);
  },
});
function paChime(c: SeCtx, notes: number[], lastDetune: number): void {
  const g = cur();
  g.pa.open(c.t);
  notes.forEach((m, i) => chimeNote(c.t + i * 0.28, m + 12 * Math.log2(c.pitch), g.pa.input, g.pa.detune, i === 3 ? 0.5 : 0.25, 0.12 * c.vol, i === 3 ? lastDetune : 0));
  // 11.3: BGM −9 dB, ambience −6 dB while the PA speaks
  duck(dbToGain(-9), 0.3, 1.4, 0.8, c.t);
  duckAmbience(dbToGain(-6), 0.3, 1.4, 0.8);
}
const paOff = () => (musicParams().stage >= 2 && musicParams().stage < 3) || currentId() === 'bgm_boss' ? -35 : 0;
se('se_pa_chime', { label: '放送の前「ピンポンパンポーン」', group: CHIME, fn: (c) => paChime(c, [74, 78, 81, 86], paOff()) });
se('se_pa_chime_end', { label: '放送のあと「パンポンピンポーン」', group: CHIME, fn: (c) => paChime(c, [86, 81, 78, 74], paOff()) });

/** The Kanenari bell: a warm brass bell with a major-third partial (9.6). */
function kanenariBell(c: SeCtx, decayK: number, volK: number): void {
  const g = cur();
  const ctx = g.ctx;
  const t = c.t;
  const out = ctx.createGain();
  out.gain.value = 0.35 * volK * c.vol;
  // slow 0.25 Hz ±8 % pulse
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.25;
  const lg = ctx.createGain();
  lg.gain.value = 0.35 * volK * c.vol * 0.08;
  lfo.connect(lg);
  lg.connect(out.gain);
  out.connect(c.dest);
  const send = ctx.createGain();
  send.gain.value = 0.5;
  out.connect(send);
  send.connect(g.fxSend);
  const partials: [number, number, number][] = [
    [0.5, 0.5, 5.5], [1, 0.8, 4.5], [1.26, 0.5, 3.5], [1.5, 0.35, 3.0], [2, 0.7, 3.0],
    [2.52, 0.25, 2.0], [3, 0.3, 1.8], [4, 0.25, 1.2], [5.33, 0.12, 0.8], [6, 0.1, 0.6],
  ];
  const f0 = 130.8 * c.pitch;
  let end = t;
  const oscs: OscillatorNode[] = [lfo];
  for (const [ratio, amp, dec] of partials) {
    const d = dec * decayK;
    for (const beat of [0, 0.7]) {
      const o = ctx.createOscillator();
      o.frequency.value = f0 * ratio + beat;
      const e = ctx.createGain();
      e.gain.setValueAtTime(0, t);
      e.gain.linearRampToValueAtTime(amp * 0.5, t + 0.004);
      // "減衰（音量が1/1000になるまで）": −60 dB at d seconds
      e.gain.setTargetAtTime(0, t + 0.004, d / 6.9);
      o.connect(e);
      e.connect(out);
      o.start(t);
      o.stop(t + d + 0.1);
      oscs.push(o);
    }
    end = Math.max(end, t + d + 0.1);
  }
  lfo.start(t);
  lfo.stop(end);
  // the strike
  voice({ at: t, dest: out, wave: 'noise', dur: 0.025, attack: 0.001, decay: 0.025, sustain: 0, release: 0.01, vol: 0.08 / 0.35, filter: { type: 'highpass', freq: 1500 } });
  voice({ at: t, dest: out, wave: 'sine', freq: 2600, dur: 0.01, attack: 0.001, decay: 0.01, sustain: 0, release: 0.005, vol: 0.04 / 0.35 });
  if (!g.offline) setTimeout(() => out.disconnect(), (end - ctx.currentTime) * 1000 + 500);
}
se('se_bell_kanenari', {
  label: 'カネナリくんの鐘（ゴーン）',
  group: CHIME,
  bus: 'bell',
  fn(c) {
    kanenariBell(c, 1, 1);
    // other SFX −6 dB while the bell rings (11.3)
    const g = cur();
    const p = g.sfxDuck.gain;
    p.cancelScheduledValues(c.t);
    p.setValueAtTime(p.value, c.t);
    p.linearRampToValueAtTime(0.5, c.t + 0.05);
    p.setValueAtTime(0.5, c.t + 4);
    p.linearRampToValueAtTime(1, c.t + 4.4);
  },
});
se('se_bell_kanenari_short', { label: '鐘がひとりでに1度だけ', group: CHIME, bus: 'bell', fn: (c) => kanenariBell(c, 0.45, 0.8) });
se('se_bell_dud', { label: '鳴らない鐘の「コッ」', group: CHIME, layers: ['sine f=392→360/30 env=1/45/0/20 dur=20 v=.14', 'noise env=0/15/0/8 dur=8 v=.08 flt=BP1200q1.2', 'sine f=494 env=1/60/0/40 dur=20 v=.015'] });

// ============================================================================
// 9.7 戦闘：共通
const BATTLE = '戦闘：共通';

se('se_encounter', {
  label: '戦闘への切り替え（判＋インクのにじみ）',
  group: BATTLE,
  rev: 0.2,
  duck: 'heavy',
  fn(c) {
    for (const l of HEAVY) layer(c, l);
    layer(c, 'noise env=10/0/1/250 dur=380 v=.09 flt=BP2200→180q6 at=40');
    layer(c, 'sine f=80→40/400 env=30/0/1/200 dur=350 v=.12 at=40');
    layer(c, 'saw f=110→55/400 env=30/0/1/200 dur=350 v=.03 flt=LP400 at=60');
  },
});
se('se_enemy_appear', { label: '敵があらわれる（紙がめくれる）', group: BATTLE, layers: ['noise env=8/100/0/40 dur=100 v=.06 flt=BP1800→4200q0.9', 'tri f=660→990/60 env=1/40/0/20 dur=30 v=.02 at=60'] });
se('se_initiative', {
  label: '先制',
  group: BATTLE,
  fn(c) {
    sub(c, 'se_stamp', { vol: 0.7 });
    layer(c, 'p25 f=C6 env=1/50/.5/20 dur=60 v=.06 at=90');
    layer(c, 'p25 f=G6 env=1/100/.5/60 dur=120 v=.06 at=170');
  },
});
se('se_ambush', {
  label: '不意打ち（三全音）',
  group: BATTLE,
  fn(c) {
    sub(c, 'se_stamp', { pitch: 0.75 });
    layer(c, 'sq f=G4 env=1/50/.5/20 dur=70 v=.06 flt=LP2000 at=90');
    layer(c, 'sq f=C#4 env=1/120/.4/80 dur=160 v=.06 flt=LP2000 at=180');
  },
});
se('se_swing', { label: 'たたくの振りかぶり（ヒュッ）', group: BATTLE, rand: [0.04, 0.08], layers: ['noise env=15/0/1/40 dur=70 v=.05 flt=BP800→3000q2.5 pan=-.2→.2'] });
se('se_ring', {
  label: 'タイミングの輪（dur）',
  group: BATTLE,
  fn(c) {
    // never randomised: this is the timing reference (11.5)
    const d = Math.max(60, c.opts.dur ?? 480);
    layer(c, `noise env=${d - 20}/0/1/20 dur=${d} v=.02 flt=BP800→3200q4`);
    layer(c, `sine f=660→1320/${d} env=${d - 20}/0/1/20 dur=${d} v=.008`);
  },
});
const PASHI = ['noise env=0/60/0/40 dur=15 v=.18 flt=HP1800', 'sq f=1100→700/20 env=0/18/0/10 dur=10 v=.06', 'sine f=150→70/60 env=1/60/0/30 dur=30 v=.16'];
se('se_hit_pofu', { label: 'たたく（ポフ）', group: BATTLE, rand: HIT, max: 3, layers: ['noise env=1/45/0/25 dur=20 v=.12 flt=LP1300', 'tri f=180→90/60 env=1/60/0/30 dur=30 v=.14', 'noise env=0/4/0/2 dur=2 v=.04 flt=HP4000'] });
se('se_hit_pashi', { label: 'いい音（パシッ）', group: BATTLE, rand: HIT, max: 3, rev: 0.12, layers: PASHI });
se('se_hit_bell', { label: 'いい音の鈴（C7）', group: BATTLE, max: 3, pan: 0.1, layers: ['sine f=C7 env=0/350/0/100 dur=10 v=.05', 'sine f=5777 env=0/150/0/50 dur=10 v=.02', 'sine f=11300 env=0/80/0/30 dur=10 v=.008'] });
se('se_crit', {
  label: '会心「100てん」',
  group: BATTLE,
  max: 3,
  duck: 'heavy',
  rev: 0.12,
  fn(c) {
    for (const l of PASHI) layer(c, l, { vol: 1.1 });
    layer(c, 'p25 f=C6 env=1/50/.5/20 dur=70 v=.07 at=60', { set: { rev: 0.2 } });
    layer(c, 'p25 f=G6 env=1/200/.5/100 dur=220 v=.07 vib=8/20 at=130', { set: { rev: 0.2 } });
    layer(c, 'sine f=60→35/200 env=1/200/0/60 dur=40 v=.14');
  },
});
se('se_whiff', { label: 'ミス（ヒュン）', group: BATTLE, layers: ['noise env=10/0/1/60 dur=110 v=.05 flt=BP2600→900q3', 'sine f=660→330/120 env=5/0/1/40 dur=110 v=.015'] });
se('se_zero', { label: 'ダメージ0（ぽこ…）', group: BATTLE, layers: ['tri f=440→330/80 env=1/100/0/40 dur=40 v=.06', 'tri f=330→262/80 env=1/80/0/40 dur=40 v=.04 at=90'] });
se('se_warn', { label: 'ツッコミの「！」（ピッ）', group: BATTLE, layers: ['p25 f=1976 env=0/45/0/20 dur=40 v=.09', 'sine f=3951 env=0/30/0/10 dur=20 v=.02'] });
se('se_bishi', { label: 'ツッコミ成功（ビシッ）', group: BATTLE, rev: 0.1, rand: [0.02, 0.06], max: 3, duck: 'hit', layers: ['noise env=0/70/0/40 dur=20 v=.20 flt=HP2200', 'sq f=880→440/60 env=0/60/0/30 dur=30 v=.08 flt=LP4000', 'sine f=200→90/70 env=0/70/0/30 dur=30 v=.16', 'noise env=0/30/0/15 dur=10 v=.08 flt=BP1100q2'] });
se('se_kiran', {
  label: 'ジャスト（キラン）',
  group: BATTLE,
  pan: 0.15,
  duck: 'hit',
  rev: 0.15,
  fn(c) {
    ['E6', 'B6', 'E7'].forEach((n, i) => layer(c, `sine f=${n} env=1/200/0/80 dur=20 v=.05`, { at: i * 45 }));
    layer(c, 'noise env=1/250/0/60 dur=100 v=.012 flt=HP7000');
  },
});
se('se_kabuse', { label: 'かぶせ（早押し「コツ」）', group: BATTLE, layers: ['tri f=220→180/30 env=1/50/0/20 dur=20 v=.06 flt=LP900', 'noise env=0/15/0/8 dur=8 v=.03 flt=LP800'] });
se('se_damage', { label: '味方の被弾（ドッ）', group: BATTLE, rand: HIT, max: 3, layers: ['noise env=0/90/0/50 dur=30 v=.16 flt=LP900', 'sine f=110→45/120 env=0/130/0/40 dur=40 v=.22', 'sq f=82 env=0/60/0/20 dur=20 v=.04 flt=LP300'] });
se('se_ko', { label: '味方がへばった', group: BATTLE, layers: ['sq f=660→110/600 env=5/0/1/100 dur=600 v=.06 flt=LP2000→500 vib=10/40', 'noise env=0/80/0/30 dur=20 v=.05 flt=LP600 at=550'] });
se('se_shrink', { label: '撃破：シルエットが縮む', group: BATTLE, layers: ['sine f=1200→300/330 env=5/0/1/40 dur=320 v=.04', 'noise env=5/0/1/40 dur=320 v=.02 flt=BP2000→600q2'] });
se('se_poton', {
  label: '撃破：日用品がポトン',
  group: BATTLE,
  fn(c) {
    const L1 = 'fm f=G5 fm=r4:i3→0/40 env=1/200/0/50 dur=20 v=.10';
    layer(c, L1);
    layer(c, 'sine f=G4 env=1/120/0/40 dur=20 v=.04');
    layer(c, L1, { at: 180, vol: 0.4, pitch: 1.02 });
  },
});
se('se_defeat_chord', {
  label: '撃破判の主和音',
  group: BATTLE,
  rev: 0.3,
  fn(c) {
    ['C5', 'E5', 'G5'].forEach((n, i) => layer(c, `fm f=${n} fm=r4:i1.2→0/150 env=2/600/0/200 dur=20 v=.05`, { at: i * 15 }));
    layer(c, 'tri f=C6 env=1/400/0/100 dur=20 v=.03');
  },
});
se('se_kire_up', {
  label: 'キレ+1（level 1〜3）',
  group: BATTLE,
  fn(c) {
    const k = [1, 1, 1.26, 1.5][Math.max(1, Math.min(3, c.opts.level ?? 1))];
    const c2 = { ...c, pitch: c.pitch * k };
    layer(c2, 'p25 f=C5→G5/100 env=1/140/0/50 dur=100 v=.07');
    layer(c2, 'sine f=C6 env=1/80/0/40 dur=20 v=.03 at=100');
  },
});
se('se_kire_full', {
  label: 'キレ満タン（ジャン）',
  group: BATTLE,
  rev: 0.2,
  fn(c) {
    for (const n of ['C5', 'E5', 'G5', 'C6']) layer(c, `fm f=${n} fm=r1:i3.5→2.2/200 env=2/400/0/150 dur=60 v=.06`);
    layer(c, 'p25 f=G6 env=1/300/0/100 dur=60 v=.05');
    layer(c, 'noise env=0/500/0/100 dur=20 v=.04 flt=HP5000');
    layer(c, 'sine f=65 env=1/300/0/80 dur=40 v=.10');
  },
});
se('se_don', { label: 'ノリツッコミの着弾（太いドン）', group: BATTLE, rev: 0.25, duck: 'heavy', layers: ['sine f=65→28/350 env=0/400/0/80 dur=40 v=.45 drive=1.5', 'noise env=0/150/0/60 dur=20 v=.15 flt=LP400', 'noise env=0/60/0/20 dur=10 v=.05 flt=HP3000', 'tri f=130→56/300 env=0/200/0/60 dur=20 v=.05'] });
se('se_status', { label: '状態異常（ねじれたトーン）', group: BATTLE, layers: ['sine f=660→520/400 env=20/300/.3/100 dur=400 v=.05 vib=7/120 flt=LP2000', 'sine f=990→700/400 env=20/300/.3/100 dur=400 v=.03 flt=LP2000 det=25'] });
se('se_buff_up', {
  label: '能力が上がる',
  group: BATTLE,
  fn(c) {
    ['G5', 'C6', 'E6'].forEach((n, i) => layer(c, `p25 f=${n} env=1/50/.5/30 dur=60 v=.05`, { at: i * 70 }));
  },
});
se('se_buff_down', {
  label: '能力が下がる',
  group: BATTLE,
  fn(c) {
    ['E5', 'C5', 'G#4'].forEach((n, i) => layer(c, `tri f=${n} env=1/50/.5/30 dur=60 v=.06`, { at: i * 70 }));
  },
});
se('se_flee', {
  label: 'にげる成功',
  group: BATTLE,
  fn(c) {
    [1.1, 1.15, 1.2].forEach((p, i) => sub(c, 'se_step_asphalt', { at: i * 90, pitch: p }));
    layer(c, 'noise env=20/0/1/60 dur=200 v=.03 flt=BP1500→3000q1.5 at=150');
  },
});
se('se_part_glow', { label: 'ボスの部位が光る', group: BATTLE, layers: ['sine f=880 env=150/200/0/150 dur=150 v=.03 am=6/.4', 'sine f=1320 env=150/200/0/150 dur=150 v=.015'] });
se('se_part_break', {
  label: '部位破壊（パキン＋キラリ）',
  group: BATTLE,
  rev: 0.2,
  layers: [
    'noise env=0/40/0/20 dur=10 v=.15 flt=HP3000',
    'sine f=1860 env=0/200/0/60 dur=10 v=.05',
    'sine f=4210 env=0/200/0/60 dur=10 v=.03',
    'sine f=6900 env=0/200/0/60 dur=10 v=.015',
    'sine f=E7 env=1/150/0/60 dur=20 v=.03 at=150',
    'sine f=B7 env=1/150/0/60 dur=20 v=.03 at=195',
    'sine f=90→45/100 env=0/120/0/40 dur=20 v=.10',
  ],
});
let lightN = 0;
se('se_light_fly', {
  label: '忘れ物が光になって飛ぶ（12回）',
  group: BATTLE,
  rev: 0.4,
  max: 6,
  fn(c) {
    const long = (c.opts.hold ?? 0) > 0;
    const notes = [84, 86, 88, 91, 93, 96];
    const m = long ? 84 : notes[lightN++ % notes.length];
    if (long) lightN = 0;
    const d = long ? 1200 : 450;
    layer(c, `sine f=1047→2093/${d + 50} env=10/0/1/100 dur=${d} v=.02 pan=${long ? '-.3→-.8' : '0→-.6'}`);
    INS.ins_musicbox({ t: c.t, midi: m + 12 * Math.log2(c.pitch), dur: 0.1, vel: 1, dest: c.dest, o: { vol: 0.03 * c.vol / 0.08 * 0.08, rev: 0.5 } });
  },
});
se('se_boss_voice', { label: 'オムカエマチの声の頭', group: BATTLE, rev: 0.5, layers: ['saw f=110 env=80/300/.3/200 dur=300 v=.04 flt=LP600', 'tri f=A5 env=5/150/.3/120 dur=150 v=.03 at=15'] });

// ============================================================================
// 9.8 戦闘：能力
const SKILL = '戦闘：能力';

se('se_hanamaru', {
  label: 'はなまる（grade）',
  group: SKILL,
  rev: 0.35,
  fn(c) {
    const gr = c.opts.grade ?? 'futsu';
    const notes = gr === 'kasure' ? ['C5', 'E5'] : ['C5', 'E5', 'G5', 'C6'];
    notes.forEach((n, i) => {
      layer(c, `tri f=${n} env=1/450/0/120 dur=20 v=.06`, { at: i * 60 });
      layer(c, `sine f=${(midiHz(noteMidi(n)) * 4).toFixed(1)} env=1/250/0/80 dur=20 v=.015`, { at: i * 60 });
    });
    if (gr === 'kukkiri') layer(c, 'tri f=C7 env=1/450/0/120 dur=20 v=.05 at=240');
    layer(c, 'sine f=C6 env=100/300/0/300 dur=100 v=.02');
    layer(c, 'sine f=E6 env=100/300/0/300 dur=100 v=.02');
    const k = gr === 'kukkiri' ? 2 : 1;
    layer(c, `noise env=50/500/0/200 dur=${300 * (gr === 'kukkiri' ? 1.5 : 1)} v=${0.008 * k} flt=HP8000 am=17/.6`);
  },
});
se('se_rewind', {
  label: 'やりなおし（吸い込み→キュッ）',
  group: SKILL,
  fn(c) {
    const gr = c.opts.grade ?? 'futsu';
    if (gr === 'kasure') layer(c, 'noise env=300/0/1/20 dur=300 v=.06 flt=BP600→2000q3');
    else layer(c, 'noise env=450/0/1/20 dur=450 v=.06 flt=BP600→3000q3');
    layer(c, 'saw f=880→220/450 env=400/0/1/20 dur=450 v=.03 flt=LP2500');
    if (gr === 'kukkiri') layer(c, 'saw f=440→110/450 env=400/0/1/20 dur=450 v=.03 flt=LP2500');
    layer(c, FLIP_L1, { at: 460, vol: 0.6 });
  },
});
se('se_balloon', { label: 'ふうせん（キュッ）', group: SKILL, layers: ['sine f=900→1400/100 env=5/60/.6/60 dur=150 v=.05 vib=30/80 flt=BP1200q2', 'sine f=1000→1600/100 env=5/60/.6/60 dur=100 v=.03 vib=30/80 flt=BP1200q2 at=130'] });
se('se_balloon_pop', { label: 'ふうせんが割れる（パン）', group: SKILL, rev: 0.15, layers: ['noise env=0/40/0/30 dur=10 v=.20 flt=HP800', 'sine f=240→90/40 env=0/50/0/20 dur=20 v=.10'] });
se('se_bow', { label: 'ごあいさつ（布ずれ→ポン）', group: SKILL, layers: ['noise env=60/200/0/80 dur=200 v=.035 flt=BP1500q0.8 am=8/.3', 'sine f=220→180/50 env=1/120/0/40 dur=40 v=.08 at=300', 'tri f=110 env=1/100/0/40 dur=40 v=.04 at=300'] });
se('se_nori_sing', {
  label: 'ノリツッコミのボケ①（カズー）',
  group: SKILL,
  fn(c) {
    ['G4', 'A4', 'C5', 'E5'].forEach((n, i) => layer(c, `saw f=${n} env=10/60/.8/40 dur=${i === 3 ? 500 : 180} v=.05 flt=BP1100q4 vib=6/40`, { at: i * 200 }));
  },
});
se('se_nori_flag', { label: 'ノリツッコミのボケ②（のぼり旗）', group: SKILL, layers: ['noise env=5/60/0/20 dur=60 v=.05 flt=BP900q0.8 rep=3x220', 'noise env=100/0/1/100 dur=500 v=.02 flt=BP1500→3000q1'] });

// ============================================================================
// 9.9 戦闘：敵の技
const ENEMY = '戦闘：敵の技';

se('se_meishi', { label: '名刺交換（シュッ）', group: ENEMY, layers: ['noise env=5/100/0/40 dur=100 v=.06 flt=BP2500→5000q1.2', 'p12 f=1760 env=0/20/0/10 dur=10 v=.02 at=120'] });
se('se_semi_buzz', { label: 'セミファイナルの暴れ（ジジジ）', group: ENEMY, layers: ['noise env=10/0/1/100 dur=600 v=.06 flt=BP4200q3 am=90/.95', 'sq f=180 env=10/0/1/100 dur=600 v=.015 flt=LP1500 am=90/.95'] });
se('se_semi_miin', { label: 'ミーン（人生最後の一声）', group: ENEMY, rev: 0.2, layers: ['sq f=1150→1080/900 env=40/0/1/250 dur=950 v=.045 vib=9/90 flt=BP1800q1.2 am=36/.5'] });
se('se_cone_sing', {
  label: 'コーン・ボーカルの熱唱（メガホン）',
  group: ENEMY,
  fn(c) {
    // megaphone: BP 900–2200 (q3) → drive 2 → a 90 ms slap echo at −8 dB
    const g = cur();
    const ctx = g.ctx;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 900;
    hp.Q.value = 3;
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2200;
    lp.Q.value = 3;
    const sh = ctx.createWaveShaper();
    sh.curve = (function () {
      const n = 512;
      const cv = new Float32Array(new ArrayBuffer(n * 4));
      for (let i = 0; i < n; i++) {
        const x = (i / (n - 1)) * 2 - 1;
        cv[i] = Math.tanh(3 * x) / Math.tanh(3);
      }
      return cv;
    })();
    const post = ctx.createGain();
    post.gain.value = 0.35;
    const dl = ctx.createDelay(0.5);
    dl.delayTime.value = 0.09;
    const dg = ctx.createGain();
    dg.gain.value = dbToGain(-8);
    hp.connect(lp);
    lp.connect(sh);
    sh.connect(post);
    post.connect(c.dest);
    post.connect(dl);
    dl.connect(dg);
    dg.connect(c.dest);
    const c2 = { ...c, dest: hp };
    const mel: [string, number][] = [['C5', 2], ['E5', 2], ['G5', 2], ['A5', 2], ['G5', 2], ['E5', 4]];
    let at = 0;
    for (const [n, l] of mel) {
      layer(c2, `sq f=${n} env=5/40/.8/30 dur=${l * 70 - 10} v=.05 vib=6/30`, { at, vol: 4 });
      at += l * 70;
    }
    if (!g.offline) setTimeout(() => post.disconnect(), 3000);
  },
});
se('se_cone_tap', { label: 'コーン・コン', group: ENEMY, rev: 0.15, layers: ['fm f=C5 fm=r2.4:i2→0/60 env=0/200/0/40 dur=20 v=.08', 'sine f=C4 env=0/150/0/40 dur=20 v=.03', 'noise env=0/15/0/8 dur=8 v=.03 flt=BP1200q1'] });
se('se_siren', {
  label: '通行止め（回転灯）',
  group: ENEMY,
  fn(c) {
    for (const at of [0, 400]) {
      layer(c, 'sq f=740→988/200 env=5/0/1/10 dur=200 v=.04 flt=BP1500q1', { at });
      layer(c, 'sq f=988→740/200 env=0/0/1/10 dur=200 v=.04 flt=BP1500q1', { at: at + 200 });
    }
  },
});
se('se_umbrella_open', { label: '晴れてるのにひらく（バサッ）', group: ENEMY, layers: ['noise env=0/120/0/60 dur=60 v=.12 flt=BP1200→600q1', 'noise env=0/40/0/20 dur=10 v=.05 flt=HP3000', 'sine f=180→90/60 env=0/60/0/20 dur=20 v=.06'] });
se('se_drip', { label: 'しずく（ぽた）', group: ENEMY, rev: 0.2, layers: ['sine f=1500→650/60 env=0/80/0/40 dur=20 v=.06', 'sine f=1100→500/40 env=0/50/0/20 dur=10 v=.02 at=90'] });
se('se_hug', { label: '持ち主さがし（ビニールがきしむ）', group: ENEMY, layers: ['saw f=300→420/300 env=20/0/1/80 dur=300 v=.035 flt=BP1600q5 vib=22/60', 'noise env=20/0/1/80 dur=300 v=.02 flt=BP2000q2 am=40/.6'] });
se('se_ojigi_press', {
  label: '90度おじぎ（ドスン大）',
  group: ENEMY,
  rev: 0.3,
  duck: 'heavy',
  fn(c) {
    layer(c, 'sine f=55→25/600 env=0/700/0/150 dur=60 v=.55 drive=1.5');
    layer(c, 'noise env=0/400/0/100 dur=40 v=.20 flt=LP300');
    layer(c, 'tri f=110→50/500 env=0/300/0/100 dur=40 v=.06');
    layer(c, 'sine f=310 env=0/400/0/60 dur=10 v=.04');
    layer(c, 'sine f=780 env=0/250/0/60 dur=10 v=.04');
    layer(c, 'sine f=1470 env=0/150/0/60 dur=10 v=.04');
    for (let i = 0; i < 6; i++) sub(c, 'se_coin', { at: 80 + Math.random() * 300, vol: 0.4, pitch: 0.9 + Math.random() * 0.3 });
  },
});
se('se_atari', {
  label: 'アタリ！',
  group: ENEMY,
  rev: 0.2,
  fn(c) {
    layer(c, 'p25 f=C6 env=1/50/.6/20 dur=60 v=.05');
    layer(c, 'p25 f=C6 env=1/50/.6/20 dur=60 v=.05 at=80');
    layer(c, 'p25 f=G6 env=1/300/.6/100 dur=400 v=.05 vib=8/20 at=160');
    for (const n of ['C5', 'E5', 'G5']) layer(c, `sq f=${n} env=1/300/.5/100 dur=400 v=.03 at=160`);
  },
});
se('se_hazure', { label: 'ハズレ（ブッ）', group: ENEMY, layers: ['sq f=110 env=0/0/1/30 dur=200 v=.06 flt=LP800', 'sq f=116 env=0/0/1/30 dur=200 v=.04 flt=LP800'] });
const VOWEL: Record<string, [number, number]> = { a: [800, 1250], i: [300, 2300], u: [330, 1400], e: [480, 1900], o: [500, 850] };
se('se_vending_voice', {
  label: 'アリガトウゴザイマシタ（合成音声風）',
  group: ENEMY,
  fn(c) {
    const notes = ['A4', 'A4', 'G4', 'A4', 'C5', 'A4', 'G4', 'G4', 'E4', 'E4', 'D4'];
    const vowels = 'aiaouoaiaia';
    notes.forEach((n, i) => {
      const [f1, f2] = VOWEL[vowels[i]];
      voice({
        at: c.t + i * 0.09,
        dest: c.dest,
        wave: 'pulse12',
        freq: midiHz(noteMidi(n)) * c.pitch,
        dur: 0.08,
        attack: 0.004,
        decay: 0.02,
        sustain: 0.85,
        release: 0.012,
        vol: 0.045 * c.vol * 1.4,
        filter: { type: 'lowpass', freq: 3000 },
        formant: { f1, f2, q1: 6, q2: 8, mix: 0.7 },
      });
    });
  },
});
se('se_vacuum', { label: 'ていねいに掃除（ウイーン、ズズ）', group: ENEMY, layers: ['noise env=150/0/1/300 dur=900 v=.05 flt=BP500→2200q1.5', 'saw f=120→220/500 env=150/0/1/300 dur=900 v=.02 flt=LP800', 'noise env=150/0/1/300 dur=900 v=.015 flt=LP600 am=30/.4'] });
se('se_bump', { label: '段差チャレンジ（ゴトッ）', group: ENEMY, layers: ['sine f=130→70/80 env=0/120/0/40 dur=20 v=.14', 'noise env=0/60/0/20 dur=10 v=.06 flt=LP1000', 'tri f=600 env=0/20/0/10 dur=8 v=.02 at=60', 'tri f=640 env=0/20/0/10 dur=8 v=.02 at=110'] });
se('se_momi', { label: 'もみもみ（ゴロゴロ）', group: ENEMY, layers: ['sine f=90 env=80/0/1/200 dur=1000 v=.08 am=11/.8', 'noise env=80/0/1/200 dur=1000 v=.03 flt=LP300 am=11/.8', 'saw f=60 env=80/0/1/200 dur=1000 v=.02 flt=LP200', 'tri f=180 env=80/0/1/200 dur=1000 v=.012 am=11/.8'] });
se('se_remote', { label: '強モード（リモコンのピッ）', group: ENEMY, layers: ['sine f=2800 env=0/40/0/15 dur=20 v=.05', 'noise env=0/5/0/3 dur=3 v=.02 flt=HP4000'] });
se('se_glove', { label: '片手袋のて（ぱふっ）', group: ENEMY, rand: HIT, layers: ['noise env=0/70/0/40 dur=20 v=.10 flt=LP1400', 'sine f=160→100/60 env=0/60/0/20 dur=20 v=.08'] });
se('se_bottle', { label: '水筒（ちゃぽん）', group: ENEMY, layers: ['sine f=520→980/90 env=2/150/0/60 dur=40 v=.06', 'noise env=10/250/0/60 dur=150 v=.03 flt=LP1500 am=14/.5', 'sine f=900→1500/50 env=1/60/0/20 dur=20 v=.02 at=120'] });
se('se_uwabaki', { label: '上履きキック（キュッ）', group: ENEMY, layers: ['saw f=1900→2600/60 env=2/60/.4/30 dur=80 v=.04 flt=BP2600q6 vib=40/80', 'noise env=0/30/0/15 dur=20 v=.02 flt=BP3000q2'] });

// se_roulette — "ピピピピ" until stopped (sfxLoop)
loopTable.set('se_roulette', (opts?: SfxOpts): LoopHandle => {
  const g = cur();
  const out = g.ctx.createGain();
  out.gain.value = opts?.vol ?? 1;
  out.connect(g.sfxBus);
  const seq = [2093, 2349, 2637, 2349];
  let n = 0;
  let next = g.ctx.currentTime + 0.01;
  let stopped = false;
  const voices: VoiceHandle[] = [];
  const pump = () => {
    if (stopped) return;
    const until = g.ctx.currentTime + 0.12;
    while (next < until) {
      voices.push(voice({ at: next, dest: out, wave: 'square', freq: seq[n++ % 4] * (opts?.pitch ?? 1), dur: 0.01, attack: 0.0005, decay: 0.025, sustain: 0, release: 0.01, vol: 0.04 }));
      if (voices.length > 8) voices.shift();
      next += 0.06;
    }
    atTime(g.ctx.currentTime + 0.03, pump);
  };
  pump();
  return {
    set() {},
    stop(fade = 0.01) {
      stopped = true;
      const t = g.ctx.currentTime;
      out.gain.setValueAtTime(out.gain.value, t);
      out.gain.linearRampToValueAtTime(0, t + fade);
      for (const v of voices) v.stop(fade, t);
      setTimeout(() => out.disconnect(), 400);
    },
  };
});

// se_nori_sing can also be driven as a loop so the tsukkomi can cut it (9.8)
loopTable.set('se_nori_sing', (opts?: SfxOpts): LoopHandle => {
  playSe('se_nori_sing', { label: '', group: SKILL, fn: (c) => ['G4', 'A4', 'C5', 'E5'].forEach((n, i) => layer(c, `saw f=${n} env=10/60/.8/40 dur=${i === 3 ? 500 : 180} v=.05 flt=BP1100q4 vib=6/40`, { at: i * 200 })) }, opts);
  return { set() {}, stop: (fade = 0.02) => stopSe('se_nori_sing', fade) };
});

export { stopSe };

// Fire-and-forget versions of the loops (sound test / safety): a 1.2 s demo.
se('se_hanko_charge', {
  label: '長押しの溜め（sfxLoop：amount / zone）',
  group: HANKO,
  fn(c) {
    const h = loopTable.get('se_hanko_charge')!({ vol: c.vol, pitch: c.pitch });
    const steps = 24;
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const a = u < 0.5 ? u * 2 : 2 - u * 2;
      atTime(c.t + u * 1.2, () => {
        h.set('amount', a);
        h.set('zone', a > 0.82 ? 1 : 0);
      });
    }
    atTime(c.t + 1.25, () => h.stop(0.02));
  },
});
se('se_roulette', {
  label: '当たりルーレット（sfxLoop）',
  group: ENEMY,
  fn(c) {
    const h = loopTable.get('se_roulette')!({ vol: c.vol, pitch: c.pitch });
    atTime(c.t + 1.2, () => h.stop(0.01));
  },
});
