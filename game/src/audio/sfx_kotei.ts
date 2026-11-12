// 担当B（げむきか 10/5 の 新1・新5、02_ch2_index #82・#83）の 小さな 音。
//
//   新1 二人十五脚（夕鳴小学校の 校庭 map_school_kotei）：スタートの 手を 1回 たたく 音（ピストルは
//     使わない）、「いち」「に」の 拍、はちまきを しばる 布の 音、足が からまる、グソっ君が あおむけに
//     ひっくり返る、運動会の 綱 ヒキヅナが 這う・まるまる。外の 校庭なので 少し 響く（rev）。
//   新5 ハンチングの 値札：剪定ばさみで 値札の 糸を ぷつりと 切る（小さく）。

import { se } from './recipe';

const G1 = '第1章：二人十五脚（校庭）';
const G5 = '第2章：ハンチングの 値札';

// 手を 1回 たたく（審判の ピー・コック。乾いた 破裂と、校舎に 返る 短い 響き）
se('se_kotei_clap', {
  label: 'スタートの手をたたく音',
  group: G1,
  rev: 0.28,
  layers: [
    'noise env=0/34/0/26 dur=16 v=.16 flt=BP1300q0.9',
    'noise env=0/14/0/8 dur=6 v=.08 flt=HP3200',
    'noise env=4/140/0/90 dur=70 v=.025 flt=BP850q0.7 at=12',
  ],
});

// 「いち」：拍の 頭（木の 音、高め）
se('se_kotei_ichi', {
  label: '二人三脚の拍「いち」',
  group: G1,
  layers: ['sine f=1046→1000/12 env=0/60/0/30 dur=30 v=.05', 'noise env=0/8/0/4 dur=3 v=.02 flt=BP2600q2'],
});

// 「に」：拍の うら（同じ 木の 音、低め）
se('se_kotei_ni', {
  label: '二人三脚の拍「に」',
  group: G1,
  layers: ['sine f=784→750/12 env=0/60/0/30 dur=30 v=.045', 'noise env=0/8/0/4 dur=3 v=.018 flt=BP2000q2'],
});

// 足が そろった 1歩（土を ふむ ふたりぶん：しゅんの 足と、グソっ君の いちばん下の 足）
se('se_kotei_step', {
  label: '二人三脚の1歩（ふたりぶん）',
  group: G1,
  rand: [0.06, 0.1],
  max: 4,
  layers: ['noise env=0/30/0/20 dur=14 v=.05 flt=BP900q1', 'noise env=0/12/0/6 dur=5 v=.025 flt=BP3400q3 at=28'],
});

// 足が からまる（「あかん、足が 渋滞や！」。殻の 足が いっせいに もつれる）
se('se_kotei_tangle', {
  label: '足がからまる（渋滞）',
  group: G1,
  layers: [
    'noise env=0/14/0/6 dur=6 v=.035 flt=BP3400q3 rep=10x38 rnd=25',
    'tri f=330→220/160 env=4/170/0/60 dur=140 v=.02',
    'noise env=0/40/0/30 dur=20 v=.04 flt=BP700q1 at=60',
  ],
});

// はちまきで 足を しばる（布の こすれ 2回、きゅっ）
se('se_kotei_hachimaki', {
  label: 'はちまきで足をしばる',
  group: G1,
  layers: [
    'noise env=8/90/0/50 dur=70 v=.04 flt=BP2400q0.8 am=18/.6',
    'noise env=6/70/0/40 dur=50 v=.045 flt=BP2800q0.9 am=22/.6 at=170',
    'tri f=520→640/60 env=2/60/0/30 dur=40 v=.015 at=230',
  ],
});

// グソっ君が あおむけに ひっくり返る（どさっ、殻が 地面に 当たる からん）
se('se_kotei_trip', {
  label: 'グソっ君がひっくり返る',
  group: G1,
  rev: 0.12,
  layers: [
    'noise env=0/70/0/40 dur=30 v=.12 flt=LP700',
    'sine f=170→90/90 env=0/100/0/40 dur=60 v=.08',
    'noise env=0/12/0/6 dur=5 v=.045 flt=BP3600q3 rep=5x46 at=40',
  ],
});

// 日傘の 柄で くるりと 起こす（ひっかけて、起きる）
se('se_kotei_okosu', {
  label: '日傘の柄で起こす',
  group: G1,
  layers: ['tri f=900→1300/90 env=2/90/0/40 dur=60 v=.02', 'noise env=0/12/0/6 dur=5 v=.04 flt=BP3400q3 rep=6x34 at=80'],
});

// ヒキヅナが 這う（綱が 土を こする ずるずる）
se('se_kotei_zuru', {
  label: 'ヒキヅナが這う（ずるずる）',
  group: G1,
  rand: [0.05, 0.12],
  layers: ['noise env=40/280/0/180 dur=260 v=.035 flt=BP650q0.8 am=7/.55', 'noise env=20/200/0/120 dur=200 v=.012 flt=BP1800q1 am=9/.5 at=60'],
});

// ヒキヅナが 倉庫の 前で まるまる（ぐるっと とぐろを 巻く）
se('se_kotei_maru', {
  label: 'ヒキヅナがまるまる',
  group: G1,
  layers: ['noise env=20/360/0/200 dur=340 v=.04 flt=BP900→500q0.9 am=11→4/340/.5', 'sine f=220→160/300 env=10/300/0/80 dur=240 v=.02'],
});

// 剪定ばさみで 値札の 糸を ぷつり（刃の かみ合う 小さな 音と、糸の 切れる ぷつ）
se('se_kotei_snip', {
  label: 'ぷつり（値札の糸を切る）',
  group: G5,
  layers: [
    'noise env=0/12/0/6 dur=5 v=.07 flt=BP4200q3',
    'tri f=2600→1800/15 env=0/18/0/8 dur=8 v=.028',
    'noise env=0/8/0/4 dur=3 v=.05 flt=BP5200q3 at=70',
    'sine f=900→600/20 env=0/20/0/10 dur=10 v=.022 at=72',
  ],
});
