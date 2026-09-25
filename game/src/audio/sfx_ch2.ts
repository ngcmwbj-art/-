// Chapter 2 sound effects (53_ch2_audio 8). The recipe strings are the design
// document's notation, pasted verbatim where the notation reaches; the few
// that need more (levels, grades, notes, the PA, loops) are small functions.
// Registered with the same se() as chapter 1; the groups read "第2章：…" in
// the sound test.

import { atTime } from './clock';
import { playMorningChime } from './chime';
import { cur, midiHz, noteMidi, voice, type VoiceHandle } from './engine';
import { chimeNote } from './instruments';
import { seTrim, trimOr1 } from './mix';
import { layer, playSe, se, sub, type SeCtx } from './recipe';
import { loopTable, sfxTable, type LoopHandle, type SfxOpts } from './registry';
import { BSAN, stepDef } from './sfx';

const G_TRAIN = '第2章：プロローグ・電車・駅';
const G_VILLAGE = '第2章：村・ハウス・集会所';
const G_BARN = '第2章：牛舎・農';
const G_PA = '第2章：放送・チャイム';
const G_ENEMY = '第2章：戦闘・敵の技';
const G_BOSS = '第2章：戦闘・ボス';
const G_HANKO = '第2章：戦闘・ハンコ・能力';
const G_END = '第2章：足音・シンボル・エンディング';

/** Every chapter-2 group (the sound test's 第2章 page lists them in this order). */
export const CH2_SE_GROUPS = [G_TRAIN, G_VILLAGE, G_BARN, G_PA, G_ENEMY, G_BOSS, G_HANKO, G_END];

// ---------------------------------------------------------------------------
// the PA (bus_pa): these SEs sing through the speaker on the hill

/**
 * A context whose layers go into bus_pa (53 3.3): the speaker's voicing, its
 * echoes and its distance. The mix trim is applied here (the instance's own
 * gain is bypassed). Offline QA renders hear the mountain voicing, where these
 * sounds are heard in the game.
 */
function viaPa(c: SeCtx, id: string): SeCtx {
  const g = cur();
  if (g.offline && g.pa.mode !== 'yama') g.pa.setMode('yama', 0);
  g.pa.open(c.t);
  g.pa.wake(c.t + 6);
  return { ...c, dest: g.pa.input, vol: c.vol * trimOr1(seTrim(id)), rev: 0 };
}

// ============================================================================
// 8.1 プロローグ・電車・駅

export const CROSS_STRIKE = [
  'fm f=760 fm=r2.76:i2.4→0.4/60 env=0/240/0/60 dur=20 v=.05',
  'sine f=1910 env=0/110/0/40 dur=10 v=.018',
  'noise env=0/6/0/3 dur=4 v=.02 flt=BP3200q2',
];
/** One strike of the crossing bell ("カン"), panned to its lamp. */
function crossStrike(c: SeCtx, at: number, pan: number): VoiceHandle[] {
  const c2 = c.pan === undefined ? { ...c, pan: undefined } : c;
  const out: VoiceHandle[] = [];
  for (const l of CROSS_STRIKE) out.push(...layer(c2, `${l} pan=${pan}`, { at }));
  return out;
}
se('se_h_crossing_bell', {
  label: '踏切の警報音（カン、カン）',
  group: G_TRAIN,
  rev: 0.25,
  max: 2,
  // one-shot (sound test / QA): three strikes; the game plays it as sfxLoop
  fn(c) {
    for (let i = 0; i < 3; i++) crossStrike(c, i * 460, i % 2 ? 0.15 : -0.15);
  },
});
/**
 * sfxLoop('se_h_crossing_bell'): a strike every 460 ms, the two lamps
 * alternating ±0.15. stop(0) strikes no more and cuts the strike that is
 * sounding at 90 ms — "カ……": this is not an ordinary train (12.1).
 */
loopTable.set('se_h_crossing_bell', (opts?: SfxOpts): LoopHandle => {
  const g = cur();
  const out = g.ctx.createGain();
  out.gain.value = (opts?.vol ?? 1) * trimOr1(seTrim('se_h_crossing_bell'));
  out.connect(g.sfxBus);
  const send = g.ctx.createGain();
  send.gain.value = 0.25;
  out.connect(send);
  send.connect(g.fxSend);
  const c: SeCtx = { t: 0, pitch: opts?.pitch ?? 1, vol: 1, dest: out, rev: 0, opts: opts ?? {} };
  let next = g.ctx.currentTime + 0.02;
  let n = 0;
  let stopped = false;
  let last: { t: number; hs: VoiceHandle[] } | null = null;
  const pump = () => {
    if (stopped) return;
    const until = g.ctx.currentTime + 0.15;
    while (next < until) {
      last = { t: next, hs: crossStrike({ ...c, t: next }, 0, n++ % 2 ? 0.15 : -0.15) };
      next += 0.46;
    }
    atTime(g.ctx.currentTime + 0.05, pump);
  };
  pump();
  return {
    set() {},
    stop(fade = 0) {
      if (stopped) return;
      stopped = true;
      const t = g.ctx.currentTime;
      // strikes already scheduled ahead of now never sound
      if (last && last.t > t) for (const h of last.hs) h.stop(0.004, last.t);
      if (fade <= 0.001) {
        // the strike that is ringing is cut 90 ms after it began (or now)
        const cutAt = last && last.t <= t ? Math.max(t, last.t + 0.09) : t;
        out.gain.setValueAtTime(out.gain.value, cutAt);
        out.gain.linearRampToValueAtTime(0, cutAt + 0.012);
      } else {
        out.gain.setValueAtTime(out.gain.value, t);
        out.gain.linearRampToValueAtTime(0, t + fade);
      }
      setTimeout(() => out.disconnect(), (fade + 1.2) * 1000);
    },
  };
});

se('se_h_crossing_down', {
  label: '遮断機が下りる（ギギ……コトン）',
  group: G_TRAIN,
  rev: 0.2,
  layers: [
    'saw f=140→90/1100 env=50/0/1/150 dur=1050 v=.035 flt=LP600',
    'sine f=1300→900/1000 env=50/0/1/150 dur=1000 v=.012 vib=7/60 am=14/.7',
    'sine f=100 env=1/120/0/40 dur=20 v=.05 at=1100',
    'noise env=0/40/0/20 dur=10 v=.03 flt=LP1500 at=1100',
  ],
});
se('se_h_train_brake', {
  label: '明かりのない電車が止まる（キー……プシュ）',
  group: G_TRAIN,
  rev: 0.3,
  layers: [
    'sine f=2300→2180/1100 env=200/0/1/250 dur=1100 v=.010 vib=5/25 am=11/.3',
    'noise env=300/0/1/300 dur=1000 v=.03 flt=LP600→250',
    'sine f=110→60/900 env=100/0/1/200 dur=900 v=.03',
    'noise env=5/400/0/150 dur=200 v=.04 flt=BP2600q0.8 at=1250',
  ],
});
const TRAIN_IDLE = ['sine f=92 env=300/0/1/400 dur=2800 v=.006 am=0.5/.2', 'noise env=300/0/1/400 dur=2800 v=.004 flt=LP300'];
se('se_h_train_idle', { label: '止まっている電車のうなり（ループ）', group: G_TRAIN, layers: TRAIN_IDLE });
se('se_h_train_door', {
  label: '電車の扉（プシュー、トン）',
  group: G_TRAIN,
  rev: 0.2,
  layers: [
    'noise env=10/350/0/100 dur=300 v=.05 flt=BP3000→1800q0.9',
    'noise env=20/300/.4/80 dur=350 v=.03 flt=BP900q1 am=20/.4 at=150',
    'sine f=140 env=1/80/0/40 dur=20 v=.06 at=560',
    'noise env=0/30/0/15 dur=10 v=.02 flt=LP1500 at=560',
  ],
});
se('se_h_train_chime', {
  label: '車内チャイム（ポーン、ポーン）',
  group: G_TRAIN,
  rev: 0.25,
  layers: [
    'fm f=C6 fm=r3.5:i1.4→0/300 env=2/800/0/200 dur=50 v=.05 flt=BP1400q1.2',
    'fm f=F5 fm=r3.5:i1.4→0/300 env=2/900/0/250 dur=50 v=.05 flt=BP1400q1.2 at=420',
  ],
});
se('se_h_seiriken', {
  label: '整理券の機械（ジッ、ペラ）',
  group: G_TRAIN,
  layers: ['saw f=180 env=5/0/1/20 dur=180 v=.012 flt=LP900 am=60/.5', 'noise env=10/80/0/40 dur=60 v=.02 flt=BP3500q1 at=190', 'tri f=2100 env=0/20/0/10 dur=8 v=.01 at=260'],
});
se('se_h_coin_box', {
  label: '無人販売所の料金箱（チャリ、コトン）',
  group: G_TRAIN,
  rand: [0.03, 0.06],
  layers: [
    'sine f=3300 env=0/90/0/30 dur=10 v=.025',
    'sine f=5100 env=0/60/0/20 dur=10 v=.012',
    'tri f=330→260/40 env=0/120/0/40 dur=20 v=.05 at=140',
    'noise env=0/40/0/20 dur=10 v=.02 flt=BP1200q1.5 at=140',
    'sine f=2700 env=0/120/0/40 dur=10 v=.012 at=150',
  ],
});

/** A continuous idle (sfxLoop): each layer held until stop(fade). */
function idleLoop(id: string, layers: { wave: 'sine' | 'sawtooth' | 'noise'; f?: number; v: number; lp?: number; hp?: number; bp?: [number, number]; am?: [number, number] }[]) {
  return (opts?: SfxOpts): LoopHandle => {
    const g = cur();
    const out = g.ctx.createGain();
    const vol = (opts?.vol ?? 1) * trimOr1(seTrim(id));
    out.gain.value = 0;
    const t = g.ctx.currentTime;
    out.gain.setValueAtTime(0, t);
    out.gain.linearRampToValueAtTime(vol, t + 0.3);
    let node: AudioNode = out;
    if (opts?.pan) {
      const p = g.ctx.createStereoPanner();
      p.pan.value = opts.pan;
      out.connect(p);
      node = p;
    }
    node.connect(g.sfxBus);
    const hs = layers.map((L) =>
      voice({
        at: t,
        dest: out,
        wave: L.wave,
        freq: L.wave === 'noise' ? undefined : (L.f ?? 100) * (opts?.pitch ?? 1),
        dur: 3600,
        attack: 0.05,
        decay: 0,
        sustain: 1,
        release: 0.05,
        vol: L.v,
        filter: L.lp ? { type: 'lowpass', freq: L.lp } : L.hp ? { type: 'highpass', freq: L.hp } : L.bp ? { type: 'bandpass', freq: L.bp[0], q: L.bp[1] } : undefined,
        am: L.am ? { rate: L.am[0], depth: L.am[1] } : undefined,
      }),
    );
    let stopped = false;
    return {
      set() {},
      stop(fade = 0.3) {
        if (stopped) return;
        stopped = true;
        const now = g.ctx.currentTime;
        const f = Math.max(0.01, fade);
        out.gain.cancelScheduledValues(now);
        out.gain.setValueAtTime(out.gain.value, now);
        out.gain.linearRampToValueAtTime(0, now + f);
        for (const h of hs) h.stop(0.01, now + f);
        setTimeout(() => node.disconnect(), (f + 0.5) * 1000);
      },
    };
  };
}
loopTable.set('se_h_train_idle', idleLoop('se_h_train_idle', [
  { wave: 'sine', f: 92, v: 0.006, am: [0.5, 0.2] },
  { wave: 'noise', v: 0.004, lp: 300 },
]));

// ============================================================================
// 8.2 村・ハウス・集会所

se('se_h_vinyl_door', {
  label: 'ハウスの入口（ビニールの引き戸）',
  group: G_VILLAGE,
  rev: 0.12,
  layers: [
    'noise env=10/350/.3/100 dur=350 v=.04 flt=BP2400q0.7 am=34/.6',
    'noise env=5/200/0/80 dur=200 v=.015 flt=HP5000 am=60/.8',
    'sine f=520→480/40 env=1/60/0/30 dur=20 v=.03 at=430',
    'sine f=1260 env=0/50/0/20 dur=10 v=.012 at=430',
  ],
});
const YUNOMI_CLINK = ['sine f=1850 env=0/40/0/15 dur=10 v=.03', 'tri f=480→420/30 env=0/60/0/20 dur=10 v=.04'];
const YUNOMI_POUR = [
  'noise env=40/0/1/200 dur=650 v=.03 flt=BP900→1500q2 am=9/.7 at=450',
  // the cup filling up: the higher, the fuller
  'sine f=620→980/650 env=40/0/1/200 dur=650 v=.008 am=9/.8 at=450',
];
se('se_h_yunomi', {
  label: '湯のみを置いて、お茶を注ぐ（トポトポ）',
  group: G_VILLAGE,
  rev: 0.1,
  fn(c) {
    // (vol .7 from the tea break — 53 11: only the pouring)
    for (const l of YUNOMI_CLINK) layer(c, l);
    for (const l of YUNOMI_CLINK) layer(c, l, { at: 180, pitch: 1.05 });
    for (const l of YUNOMI_POUR) layer(c, l);
  },
});
se('se_h_yunomi_pour', { label: 'お茶を注ぐだけ（ヨシエさんのお茶）', group: G_VILLAGE, rev: 0.1, fn: (c) => YUNOMI_POUR.forEach((l) => layer(c, l, { at: -450 })) });
se('se_h_tomato_catch', {
  label: 'トマトが手の中に落ちる（ぽすっ）',
  group: G_VILLAGE,
  layers: [
    'sine f=260→150/60 env=1/90/0/40 dur=20 v=.08',
    'noise env=0/40/0/20 dur=20 v=.03 flt=LP1200',
    'noise env=20/200/0/80 dur=150 v=.012 flt=HP4000 am=25/.5 at=40',
    'tri f=C6 env=1/300/0/100 dur=20 v=.02 rev=.4 at=90',
  ],
});
se('se_h_lantern_set', {
  label: 'アミにトマトを入れて竿をかつぐ（ふさっ、コ）',
  group: G_VILLAGE,
  layers: ['noise env=20/200/0/80 dur=150 v=.03 flt=BP1800q0.7 am=18/.4', 'fm f=420 fm=r2.1:i1.2→0/40 env=0/100/0/30 dur=10 v=.02 at=320'],
});
const PAD4 = (notes: string[], env: string, dur: number, v: number, flt: string) => notes.map((n) => `saw f=${n} env=${env} dur=${dur} v=${v} flt=${flt}`);
se('se_h_light_spread', {
  label: '灯りが広がる（問いかけの頭の2音）',
  group: G_VILLAGE,
  rev: 0.4,
  layers: [
    ...PAD4(['F4', 'A4', 'C5', 'E5'], '500/400/0/600', 500, 0.012, 'LP600→2400q0.8'),
    'tri f=C5 env=5/500/0/300 dur=100 v=.04 vib=4.2/7 at=300',
    'tri f=D5 env=5/600/0/400 dur=100 v=.04 vib=4.2/7 at=560',
    'noise env=400/400/0/400 dur=400 v=.006 flt=HP7000 am=0.8/.3',
  ],
});
se('se_h_boukatou_on', {
  label: '防犯灯が点く（ジジ……パッ）',
  group: G_VILLAGE,
  layers: ['sq f=120 env=0/0/1/10 dur=60 v=.01 flt=LP800 rep=3x90', 'sine f=2600 env=0/20/0/10 dur=8 v=.006 at=300', 'noise env=0/40/0/20 dur=10 v=.01 flt=BP1800q1 at=420'],
});
se('se_h_kaichu', {
  label: 'ゲンさんの懐中電灯（カチ、カラカラ）',
  group: G_VILLAGE,
  layers: ['tri f=1900 env=0/20/0/10 dur=8 v=.025', 'noise env=0/25/0/10 dur=10 v=.012 flt=BP3000q3 rep=3x45 at=60'],
});
se('se_h_kakashi_turn', {
  label: 'かかしが山を向く（ギ、ギ）',
  group: G_VILLAGE,
  rand: [0.06, 0.06],
  max: 8,
  layers: [
    'saw f=190→150/140 env=5/100/.5/40 dur=140 v=.03 flt=BP1100q4 am=38/.7',
    'saw f=170→130/140 env=5/100/.5/40 dur=140 v=.03 flt=BP1000q4 am=34/.7 at=230',
    'noise env=5/60/0/30 dur=40 v=.01 flt=BP3000q2 at=230',
  ],
});
const KEITORA_DOOR = ['noise env=0/60/0/40 dur=20 v=.05 flt=LP1800', 'sine f=210 env=0/100/0/40 dur=20 v=.04'];
se('se_h_keitora', {
  label: '軽トラが上がってきて止まる',
  group: G_VILLAGE,
  rev: 0.2,
  fn(c) {
    // the 3-cylinder engine (≈21 Hz firing) and the gravel under the tyres
    layer(c, 'saw f=48→62/1500 env=300/0/1/400 dur=2000 v=.02 flt=LP500 am=21/.5');
    layer(c, 'noise env=300/0/1/300 dur=1600 v=.015 flt=BP700q0.8 am=21/.4');
    layer(c, 'noise env=5/150/0/60 dur=100 v=.02 flt=BP1800q1 at=1600');
    layer(c, 'saw f=62→30/300 env=0/0/1/100 dur=300 v=.02 flt=LP400 am=21→6/300/.5 at=2000');
    // the driver's door, then the passenger's
    for (const l of KEITORA_DOOR) layer(c, l, { at: 2300 });
    for (const l of KEITORA_DOOR) layer(c, l, { at: 2800, pitch: 1.08 });
  },
});
se('se_h_keitora_go', {
  label: '軽トラがゲートへ戻る（予備）',
  group: G_VILLAGE,
  rev: 0.2,
  fn(c) {
    for (const l of KEITORA_DOOR) layer(c, l);
    layer(c, 'saw f=30→58/400 env=50/0/1/100 dur=400 v=.02 flt=LP500 am=6→21/400/.5 at=400');
    layer(c, 'saw f=58→66/2000 env=0/0/1/1600 dur=2200 v=.02 flt=LP500→250 am=21/.5 at=800 pan=0→.4');
  },
});
se('se_h_chalk', {
  label: '黒板にチョーク（カツカツ）',
  group: G_VILLAGE,
  rand: [0.15, 0.15],
  max: 6,
  layers: ['noise env=0/25/0/10 dur=15 v=.025 flt=BP2800q2.5 rep=2x70', 'noise env=5/50/.3/20 dur=40 v=.008 flt=HP5000 at=10'],
});
se('se_h_chalk_erase', { label: '黒板消し（すっ）', group: G_VILLAGE, layers: ['noise env=30/200/0/60 dur=200 v=.015 flt=BP1600q0.7 am=20/.3'] });
se('se_h_kairan', { label: '回覧板が出たり入ったり（カサ、コト）', group: G_VILLAGE, layers: ['noise env=10/120/0/40 dur=100 v=.02 flt=BP2000q0.8', 'tri f=600 env=0/30/0/10 dur=8 v=.015 at=150'] });

// ============================================================================
// 8.3 牛舎・農

se('se_h_shodoku', {
  label: '踏み込み消毒槽（ちゃぷ）',
  group: G_BARN,
  rand: [0.03, 0.06],
  layers: ['noise env=2/120/0/60 dur=60 v=.05 flt=BP1300q1.5', 'sine f=700→1500/60 env=1/80/0/30 dur=30 v=.025', 'noise env=10/150/0/60 dur=100 v=.015 flt=HP3500 am=40/.6 at=40'],
});
export const HANSUU = [
  'noise env=30/150/0/80 dur=120 v=.02 flt=BP450q1.5 am=16/.6',
  'noise env=20/100/0/60 dur=80 v=.008 flt=BP1800q2 am=30/.5',
  'sine f=95→80/120 env=20/100/0/50 dur=80 v=.012',
];
se('se_h_hansuu', { label: '反すう1回（もぐ）', group: G_BARN, rand: [0.08, 0.08], max: 8, layers: HANSUU });
export const COW_SNORT = ['noise env=5/180/0/100 dur=100 v=.03 flt=BP700q1.2 am=45/.5', 'noise env=5/120/0/80 dur=60 v=.01 flt=HP3000'];
se('se_h_cow_snort', { label: '牛の鼻息（ブフッ）', group: G_BARN, rand: [0.05, 0.1], layers: COW_SNORT });
se('se_h_moo', {
  label: '牛の声（モー。朝の牛舎で1回）',
  group: G_BARN,
  rev: 0.35,
  layers: [
    'saw f=132→146/350 env=120/400/.7/500 dur=1100 v=.035 flt=BP520q2.5 vib=4/12',
    'saw f=146→120/700 env=0/400/.6/500 dur=700 v=.03 flt=BP480q2.5 vib=4/12 at=450',
    'noise env=150/400/.5/400 dur=1000 v=.008 flt=BP900q1.5 am=35/.3',
  ],
});
se('se_h_barn_light', {
  label: '牛舎の照明がタイマーで点く（カチン、ジ……）',
  group: G_BARN,
  layers: ['tri f=1600 env=0/30/0/10 dur=8 v=.03', 'sq f=100 env=0/0/1/20 dur=40 v=.006 flt=LP700 rep=3x120 at=100', 'sine f=100 env=200/0/1/300 dur=400 v=.003 at=460'],
});
se('se_h_feed_cart', {
  label: '給餌車を押す（ゴムの車輪、さらさら）',
  group: G_BARN,
  layers: [
    'noise env=100/0/1/300 dur=1600 v=.015 flt=LP400 am=7/.3',
    'noise env=100/0/1/300 dur=1600 v=.006 flt=BP2400q1 am=13/.6',
    'tri f=300 env=0/60/0/20 dur=10 v=.015 at=600',
    'tri f=300 env=0/60/0/20 dur=10 v=.015 at=1300',
  ],
});
se('se_h_feedbag', { label: '配合飼料の袋に腰をおろす（ざふっ）', group: G_BARN, layers: ['noise env=5/200/0/80 dur=120 v=.04 flt=BP1100q0.7', 'sine f=120→80/80 env=1/100/0/40 dur=30 v=.04'] });
se('se_h_gate_hook', {
  label: 'ゲートの取っ手を支柱にかける（カチャ、ビン）',
  group: G_BARN,
  layers: [
    'tri f=1400→1200/20 env=0/40/0/15 dur=10 v=.04',
    'noise env=0/30/0/10 dur=10 v=.03 flt=BP2600q2',
    'sine f=380→340/300 env=1/300/0/80 dur=40 v=.02 vib=14/30 at=60',
    'tri f=1100 env=0/40/0/15 dur=10 v=.035 at=560',
  ],
});
se('se_h_side_roll', {
  label: 'ハウスのサイドを巻き上げる（ラチェット）',
  group: G_BARN,
  layers: ['tri f=1500 env=0/15/0/8 dur=6 v=.025 rep=10x180', 'noise env=0/10/0/5 dur=6 v=.02 flt=BP3000q2 rep=10x180', 'noise env=200/0/1/300 dur=2000 v=.02 flt=BP1600q0.8 am=5.5/.5'],
});
se('se_h_ripen', {
  label: '青いトマトが手前から奥へ色づく',
  group: G_BARN,
  rev: 0.4,
  fn(c) {
    ['F5', 'G5', 'A5', 'C6', 'D6', 'F6', 'G6', 'A6'].forEach((n, i) => {
      layer(c, `tri f=${n} env=1/250/0/80 dur=10 v=.03`, { at: i * 100 });
      layer(c, `sine f=${(midiHz(noteMidi(n)) * 4).toFixed(1)} env=1/250/0/80 dur=10 v=.008`, { at: i * 100 });
    });
  },
});

// ============================================================================
// 8.4 放送・チャイム (bus_pa)

se('se_h_pa_open', {
  label: '防災無線のマイクが入る（ブツッ、さー）',
  group: G_PA,
  fn(c) {
    const p = viaPa(c, 'se_h_pa_open');
    for (const l of ['noise env=0/12/0/5 dur=4 v=.08 flt=LP2500', 'sine f=60 env=5/0/1/150 dur=300 v=.012', 'sine f=120 env=5/0/1/150 dur=300 v=.006', 'noise env=80/0/1/150 dur=300 v=.004 flt=BP1200q1'])
      layer(p, l);
  },
});
se('se_h_pa_close', {
  label: 'マイクが切れる（ブツッ）',
  group: G_PA,
  fn(c) {
    const p = viaPa(c, 'se_h_pa_close');
    for (const l of ['noise env=0/10/0/5 dur=4 v=.07 flt=LP2000', 'sine f=60 env=0/60/0/20 dur=10 v=.01']) layer(p, l);
  },
});
se('se_h_pa_last', {
  label: 'ピンポンパンポーンの最後の1音（D6）',
  group: G_PA,
  fn(c) {
    const p = viaPa(c, 'se_h_pa_last');
    const g = cur();
    chimeNote(c.t, noteMidi('D6') + 12 * Math.log2(c.pitch), g.pa.input, g.pa.detune, 0.8, 0.12 * p.vol, -35);
  },
});
se('se_h_morning_chime', {
  label: '星見台の朝のチャイム（5:00）',
  group: G_PA,
  fn(c) {
    void playMorningChime({ at: c.t });
  },
});

// ============================================================================
// 8.5 戦闘：敵の技

se('se_h_sune', {
  label: 'スネトマトが背中を向ける（ぷいっ）',
  group: G_ENEMY,
  rand: [0.03, 0.06],
  layers: ['p25 f=660→990/80 env=1/100/0/40 dur=80 v=.045 flt=LP3000', 'noise env=0/30/0/15 dur=20 v=.02 flt=BP2000q1.5 at=60', 'sine f=180→130/60 env=1/60/0/20 dur=20 v=.04 at=80'],
});
se('se_h_roll', { label: 'トマトが転がる（ごろごろ）', group: G_ENEMY, layers: ['noise env=40/350/0/100 dur=400 v=.04 flt=LP700 am=14/.8', 'sine f=150→110/400 env=40/350/0/100 dur=400 v=.03 am=14/.8'] });
se('se_h_aokusai', {
  label: '青くさい におい（もわ〜ん）',
  group: G_ENEMY,
  layers: ['saw f=220→196/600 env=150/300/.4/200 dur=500 v=.02 flt=LP800 vib=3/40', 'sine f=330→294/600 env=150/300/.4/200 dur=500 v=.015 vib=3.3/40'],
});
se('se_h_biri', {
  label: '電気柵のパルス（パチッ）',
  group: G_ENEMY,
  // the fence's pulse: exactly the same every time (51: 正確すぎる)
  layers: ['noise env=0/12/0/6 dur=4 v=.10 flt=HP2500', 'sq f=1200→600/20 env=0/15/0/8 dur=8 v=.03 flt=BP1800q2', 'tri f=90 env=0/40/0/15 dur=10 v=.03'],
});
export const BOAR: string[][] = [
  // 0: the charge / a boar far off (pawing the ground, "ブフッ")
  ['noise env=5/150/0/80 dur=100 v=.05 flt=BP650q1.2 am=40/.5', 'noise env=0/40/0/20 dur=20 v=.03 flt=LP900 rep=3x120 at=150'],
  // 1: the rush (hooves "ドドド", a low "ブォ")
  ['noise env=0/40/0/20 dur=15 v=.05 flt=LP700 rep=6x70', 'sine f=85 env=0/40/0/20 dur=15 v=.05 rep=6x70', 'saw f=140→110/300 env=20/250/.3/100 dur=300 v=.02 flt=BP500q2'],
  // 2: back to the mountain (snorts and hooves going away right)
  ['noise env=5/200/0/100 dur=120 v=.04 flt=BP650q1.2 am=40/.5 pan=.2→.8', 'noise env=0/40/0/20 dur=15 v=.02 flt=LP700 rep=5x110 pan=.2→.8 at=150'],
];
se('se_h_boar', {
  label: 'チョトツ（イノシシ。level 0〜2）',
  group: G_ENEMY,
  rand: [0.03, 0.06],
  fn(c) {
    const lv = Math.max(0, Math.min(2, Math.round(c.opts.level ?? 0)));
    for (const l of BOAR[lv]) layer(c, l);
  },
});
export const SOIL = ['noise env=2/90/0/40 dur=40 v=.06 flt=BP1100q0.8', 'noise env=10/120/0/40 dur=80 v=.02 flt=HP4000 am=90/.7', 'sine f=110→70/50 env=0/60/0/20 dur=20 v=.03'];
se('se_h_soil', { label: '土がはねる（ザッ）', group: G_ENEMY, rand: [0.05, 0.1], max: 6, layers: SOIL });
se('se_h_charin', {
  label: '料金箱の中の100円玉（チャリン）',
  group: G_ENEMY,
  rand: [0.06, 0.06],
  layers: ['sine f=2800 env=0/200/0/40 dur=10 v=.035', 'sine f=4550 env=0/120/0/30 dur=10 v=.018', 'sine f=6900 env=0/70/0/20 dur=10 v=.008', 'tri f=420→380/30 env=0/80/0/30 dur=10 v=.03'],
});
const TILLER: string[][] = [
  // 0: idling puff (firing grain 13 Hz)
  ['saw f=65 env=20/0/1/150 dur=450 v=.025 flt=LP600 am=13/.8', 'noise env=20/0/1/150 dur=450 v=.012 flt=BP900q0.8 am=13/.6'],
  // 1: the headlight (20 Hz)
  ['saw f=80 env=20/0/1/150 dur=550 v=.03 flt=LP800 am=20/.8', 'noise env=20/0/1/150 dur=550 v=.014 flt=BP1000q0.8 am=20/.6'],
  // 2: the rotary (20 → 25 Hz)
  ['saw f=80→100/300 env=20/0/1/200 dur=700 v=.035 flt=LP900 am=20→25/300/.8', 'noise env=20/0/1/200 dur=700 v=.016 flt=BP1100q0.8 am=20→25/300/.6'],
  // 3: full throttle (two revs, then in at 30 Hz)
  [
    'saw f=60→110/250 env=10/0/1/80 dur=250 v=.035 flt=LP1000 am=12→30/250/.8',
    'saw f=60→110/250 env=10/0/1/80 dur=250 v=.035 flt=LP1000 am=12→30/250/.8 at=400',
    'saw f=110 env=10/0/1/200 dur=500 v=.04 flt=LP1200 am=30/.8 at=800',
    'noise env=10/0/1/200 dur=1200 v=.015 flt=BP1200q0.8 am=30/.6 at=100',
  ],
  // 4: starting (the recoil rope, it catches)
  ['noise env=5/0/1/30 dur=250 v=.03 flt=BP2000→900q1', 'saw f=30→65/400 env=10/0/1/150 dur=500 v=.03 flt=LP600 am=4→13/400/.8 at=300'],
  // 5: stopping (the pitch sinks and it stops)
  ['saw f=65→30/500 env=0/0/1/150 dur=500 v=.025 flt=LP500 am=13→3/500/.8', 'noise env=0/0/1/150 dur=500 v=.01 flt=BP900q0.8 am=13→3/500/.6'],
];
se('se_h_tiller', {
  label: '耕うん機のエンジン（level 0〜5）',
  group: G_ENEMY,
  fn(c) {
    const lv = Math.max(0, Math.min(5, Math.round(c.opts.level ?? 0)));
    for (const l of TILLER[lv]) layer(c, l);
  },
});
se('se_h_stall', {
  label: 'エンスト（プスン……）',
  group: G_ENEMY,
  layers: [
    'saw f=55→30/350 env=0/0/1/100 dur=350 v=.03 flt=LP500 am=11→4/350/.8',
    'noise env=0/80/0/40 dur=30 v=.04 flt=BP600q1 at=380',
    'noise env=20/300/0/200 dur=200 v=.01 flt=LP1200 at=420',
  ],
});

// ============================================================================
// 8.6 戦闘：ボス（ヨビモドシ）

const TENKO_NOTE: Record<string, string> = { D6: 'D6', A5: 'A5', F5: 'F5', '1': 'D6', '2': 'A5', '3': 'F5' };
se('se_h_tenko', {
  label: '名札が1つ点く（パタ＋ポン。D6／A5／F5）',
  group: G_BOSS,
  max: 6,
  fn(c) {
    // the tag flips ("パタ") where it hangs, the "ポン" comes out of the speaker
    layer(c, 'noise env=0/30/0/15 dur=10 v=.03 flt=BP2400q1.5');
    const p = viaPa(c, 'se_h_tenko');
    const g = cur();
    const note = TENKO_NOTE[c.opts.note ?? 'D6'] ?? 'D6';
    chimeNote(c.t, noteMidi(note) + 12 * Math.log2(c.pitch), g.pa.input, g.pa.detune, 0.15, 0.05 * p.vol);
  },
});
se('se_h_howl', {
  label: 'ラッパのハウリング（キーン……）',
  group: G_BOSS,
  max: 4,
  layers: ['sine f=2350→2280/600 env=150/0/1/450 dur=600 v=.012 flt=LP3000 am=7/.2 vib=5/8', 'sine f=1175 env=150/0/1/450 dur=600 v=.006'],
});
se('se_h_yofukashi', {
  label: '夜ふかしの一撃（夜がのびる）',
  group: G_BOSS,
  duck: 'heavy',
  layers: [
    'sine f=65→40/800 env=0/900/0/300 dur=60 v=.35 drive=1.2',
    'noise env=0/600/0/300 dur=60 v=.10 flt=LP600',
    'saw f=220→110/1000 env=10/0/1/300 dur=1000 v=.02 flt=LP1200→300',
    // its weight where a laptop can play it
    'tri f=160→90/700 env=0/700/0/200 dur=24 v=.07 drive=1.4',
  ],
});
se('se_h_ressha', {
  label: '最終列車（ガタン／ゴトン。level 0／1）',
  group: G_BOSS,
  max: 6,
  fn(c) {
    const p = viaPa(c, 'se_h_ressha');
    const f = (c.opts.level ?? 0) >= 1 ? 75 : 90;
    layer(p, `sine f=${f} env=0/80/0/30 dur=20 v=.06`);
    layer(p, 'noise env=0/50/0/20 dur=20 v=.05 flt=BP1000q1');
    layer(p, 'noise env=0/30/0/15 dur=10 v=.02 flt=BP2600q2 at=30');
  },
});
se('se_h_sukima', {
  label: 'すきま風（ヒュー……）',
  group: G_BOSS,
  fn(c) {
    const p = viaPa(c, 'se_h_sukima');
    for (const l of ['noise env=300/0/1/100 dur=400 v=.04 flt=BP1600→2400q8', 'noise env=0/0/1/500 dur=600 v=.04 flt=BP2400→1400q8 at=400', 'sine f=1900→2100/600 env=300/0/1/400 dur=600 v=.006 vib=4/40'])
      layer(p, l);
  },
});
se('se_h_amado', {
  label: '雨戸（ガラガラ……バタン）',
  group: G_BOSS,
  fn(c) {
    const p = viaPa(c, 'se_h_amado');
    for (const l of [
      'noise env=20/400/.5/60 dur=430 v=.05 flt=BP800q0.8 am=24/.7',
      'tri f=240→200/400 env=20/400/.4/60 dur=400 v=.015 am=24/.6',
      'noise env=0/120/0/60 dur=30 v=.09 flt=LP1400 at=620',
      'sine f=120→80/80 env=0/140/0/50 dur=30 v=.08 at=620',
    ])
      layer(p, l);
  },
});
se('se_h_yamabiko', {
  label: '山びこ（いまの音を吸いこむ）',
  group: G_BOSS,
  rev: 0.3,
  layers: ['noise env=400/0/1/60 dur=400 v=.02 flt=BP500→1500q3', 'sine f=A4→A5/400 env=400/0/1/40 dur=400 v=.006'],
});
se('se_h_onamae', {
  label: 'おなまえ よびだし（下がる短3度）',
  group: G_BOSS,
  fn(c) {
    const p = viaPa(c, 'se_h_onamae');
    // "〇〇くーん": a hummed falling minor third, vowels o → u (never words)
    voiceNote(p, 'C6', 0, 250, 20, 200, 0.7, 100, 0.04, [500, 850]);
    voiceNote(p, 'A5', 280, 400, 20, 300, 0.7, 200, 0.04, [330, 1400]);
  },
});
/** A triangle with a vowel colour (formant pair mixed 0.3), vibrato 5 Hz ±15 cents. */
function voiceNote(c: SeCtx, n: string, at: number, dur: number, a: number, d: number, s: number, r: number, v: number, f: [number, number]): void {
  voice({
    at: c.t + at / 1000,
    dest: c.dest,
    wave: 'triangle',
    freq: midiHz(noteMidi(n)) * c.pitch,
    dur: dur / 1000,
    attack: a / 1000,
    decay: d / 1000,
    sustain: s,
    release: r / 1000,
    vol: v * c.vol,
    vibrato: { rate: 5, depth: 15 },
    formant: { f1: f[0], f2: f[1], q1: 5, q2: 7, mix: 0.3 },
  });
}
se('se_h_tomato_glow', {
  label: 'トマトをかかげる（あたたかいふくらみ）',
  group: G_BOSS,
  rev: 0.35,
  fn(c) {
    const long = c.opts.grade === 'kukkiri';
    // grade=kukkiri: the final phase's 2.0 s light — a longer swell, F6 and A6 on top, ×1.2
    const c2 = long ? { ...c, vol: c.vol * 1.2 } : c;
    for (const n of ['F4', 'A4', 'C5', 'E5'])
      layer(c2, long ? `saw f=${n} env=1200/200/.6/400 dur=2000 v=.012 flt=LP500→2800q0.8` : `saw f=${n} env=250/200/.6/400 dur=400 v=.012 flt=LP500→2800q0.8`);
    layer(c2, 'tri f=C6 env=2/500/0/200 dur=60 v=.035 vib=4.2/7');
    layer(c2, 'tri f=D6 env=2/500/0/200 dur=60 v=.035 vib=4.2/7 at=120');
    layer(c2, 'sine f=87 env=200/300/0/300 dur=200 v=.05');
    layer(c2, 'noise env=300/300/0/300 dur=300 v=.008 flt=HP6000');
    if (long) {
      layer(c2, 'tri f=F6 env=2/600/0/300 dur=60 v=.03 vib=4.2/7 at=900');
      layer(c2, 'tri f=A6 env=2/800/0/400 dur=60 v=.028 vib=4.2/7 at=1100');
    }
  },
});
se('se_h_dim', {
  label: '明るい2ラウンド目の終わり（光が落ちつく）',
  group: G_BOSS,
  layers: [...['F4', 'C5', 'E5'].map((n) => `saw f=${n} env=0/400/0/100 dur=20 v=.008 flt=LP2000→400`), 'tri f=D5→C5/300 env=5/350/0/100 dur=300 v=.02'],
});

// ============================================================================
// 8.7 戦闘：ハンコ・能力

se('se_h_otsukare', {
  label: 'おつかれさま（ふーっ、湯気）',
  group: G_HANKO,
  rev: 0.35,
  fn(c) {
    const gr = c.opts.grade ?? 'futsu';
    // a long breath out, a small hum under it
    layer(c, gr === 'kasure' ? 'noise env=80/350/0/300 dur=300 v=.04 flt=BP1300→650q1.2' : 'noise env=80/700/0/300 dur=300 v=.04 flt=BP1300→650q1.2');
    layer(c, 'sine f=392→330/800 env=80/600/0/300 dur=300 v=.015 flt=LP900');
    // steam rising (1 wisp when faint, 3 otherwise)
    const steam = gr === 'kasure' ? [[100, 1]] : [[100, 1], [220, 1.12], [340, 1.26]];
    for (const [at, p] of steam) layer(c, 'sine f=880→1760/600 env=100/0/1/200 dur=500 v=.006 vib=6/20', { at, pitch: p });
    if (gr === 'kukkiri') layer(c, 'tri f=F6 env=1/500/0/150 dur=10 v=.02 at=700');
  },
});
se('se_h_bell_kon', {
  label: 'Lv6：鐘が小さく「コン」',
  group: G_HANKO,
  rev: 0.2,
  bus: 'bell',
  layers: ['sine f=261.6 env=0/350/0/60 dur=10 v=.06', 'sine f=329.6 env=0/250/0/50 dur=10 v=.03', 'sine f=523.3 env=0/150/0/40 dur=10 v=.02', 'noise env=0/20/0/10 dur=8 v=.03 flt=HP1500'],
});
se('se_h_hamidashi', {
  label: 'はみだしペケ（ぴしゃっ）',
  group: G_HANKO,
  fn(c) {
    layer(c, 'noise env=0/40/0/20 dur=20 v=.04 flt=BP3500q1.5 rep=3x35');
    layer(c, 'noise env=20/0/1/40 dur=150 v=.02 flt=BP1500→3500q2 pan=0→.3');
    sub(c, 'se_stamp_light', { at: 170, vol: 0.6, pitch: 1.2 });
  },
});

// ============================================================================
// 8.8 足音・8.10 シンボル・8.11 エンディング

se('se_step_sheet', stepDef('足音：ハウスの防草シート（ぱさっ）', ['noise env=2/35/0/20 dur=25 v=.03 flt=BP3200q0.9 am=70/.5', 'noise env=2/30/0/15 dur=20 v=.015 flt=LP900', BSAN(0.8)], G_END));
se('se_h_kakashi_hop', {
  label: 'ヘノヘノ課長のシンボルが跳ねる（コン、ぱさ）',
  group: G_END,
  rand: [0.04, 0.08],
  layers: ['fm f=520 fm=r2.1:i1.5→0/40 env=0/120/0/30 dur=10 v=.035', 'noise env=5/80/0/30 dur=60 v=.015 flt=BP1500q0.9 at=30'],
});
se('se_h_tomato_rise', {
  label: 'トマトが東の空へ昇る（問いかけをゆっくり）',
  group: G_END,
  rev: 0.6,
  fn(c) {
    const c2 = c.pan === undefined ? { ...c, pan: undefined } : c;
    // the lantern's voice: C D F A, the last one held until the ridge — drifting east
    const notes: [string, number, number][] = [['C5', 0, 500], ['D5', 600, 500], ['F5', 1200, 500], ['A5', 1800, 1400]];
    for (const [n, at, dur] of notes) {
      const p = (0.35 * at) / 3400;
      layer(c2, `tri f=${n} env=10/400/.6/300 dur=${dur} v=.035 vib=4.2/7 pan=${p.toFixed(2)}→${(0.35 * (at + dur) / 3400).toFixed(2)}`, { at });
    }
    layer(c2, 'noise env=800/0/1/400 dur=2600 v=.005 flt=HP7000 am=0.8/.3 pan=0→.35');
  },
});
se('se_h_sunrise', {
  label: '日が出る（朝焼けが空全体へ）',
  group: G_END,
  rev: 0.4,
  fn(c) {
    layer(c, 'noise env=1500/0/1/1500 dur=2000 v=.01 flt=BP600→3000q0.7');
    ['C6', 'F6', 'A6'].forEach((n, i) => layer(c, `sine f=${n} env=400/1500/0/800 dur=400 v=.008`, { at: i * 400 }));
    layer(c, 'sine f=87 env=1000/0/1/1500 dur=1500 v=.03');
    // the low warmth where small speakers still play it
    layer(c, 'tri f=174 env=1000/0/1/1500 dur=1500 v=.008');
  },
});
const BUS_IDLE = ['saw f=46 env=300/0/1/400 dur=2800 v=.02 flt=LP350 am=23/.45', 'noise env=300/0/1/400 dur=2800 v=.01 flt=BP500q0.8 am=23/.5', 'noise env=300/0/1/400 dur=2800 v=.003 flt=HP3000 am=23/.3'];
se('se_h_bus_idle', { label: '村営バスのアイドリング（ループ）', group: G_END, layers: BUS_IDLE });
loopTable.set('se_h_bus_idle', idleLoop('se_h_bus_idle', [
  { wave: 'sawtooth', f: 46, v: 0.02, lp: 350, am: [23, 0.45] },
  { wave: 'noise', v: 0.01, bp: [500, 0.8], am: [23, 0.5] },
  { wave: 'noise', v: 0.003, hp: 3000, am: [23, 0.3] },
]));
se('se_h_bus_door', {
  label: 'バスのエアの折り戸（プシュッ、パタン）',
  group: G_END,
  layers: [
    'noise env=5/250/0/80 dur=150 v=.05 flt=BP2800→1600q0.9',
    'noise env=10/200/.3/60 dur=220 v=.02 flt=BP800q1 at=120',
    'sine f=160 env=1/70/0/30 dur=20 v=.05 at=470',
    'tri f=820 env=0/30/0/10 dur=8 v=.015 at=470',
  ],
});
se('se_h_bus_depart', {
  label: 'バスが走り去る（ギアが1回、遠ざかる）',
  group: G_END,
  rev: 0.3,
  layers: [
    'saw f=46→78/1200 env=50/0/1/200 dur=1200 v=.025 flt=LP500 am=23→39/1200/.45 pan=0→-.15',
    'saw f=62→90/2200 env=0/0/1/1800 dur=3000 v=.025 flt=LP500→300 am=31→45/2200/.45 at=1400 pan=-.15→-.4',
    'noise env=100/0/1/1500 dur=3500 v=.012 flt=BP600q0.8 am=23/.4 pan=0→-.4',
  ],
});
se('se_h_bus_arrive', {
  label: 'バスが止まる（エアブレーキ）',
  group: G_END,
  layers: ['saw f=70→46/1000 env=0/0/1/300 dur=1000 v=.025 flt=LP500 am=35→23/1000/.45', 'noise env=5/400/0/150 dur=200 v=.04 flt=BP2600q0.8 at=1100'],
});

/** One-shot fallbacks for the loops when called with sfx() (a short idle). */
for (const id of ['se_h_crossing_bell', 'se_h_train_idle', 'se_h_bus_idle']) if (!sfxTable.has(id)) sfxTable.set(id, (o) => void playSe(id, { label: id, group: G_END }, o));
