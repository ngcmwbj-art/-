// ザリガニ釣り（40_audio 9.x・18章 se_tsuri_*、02_ch2_index #66）：水口の 小さな音。
// 大きな音は 使わない（夕方の 田んぼ、となりに おぴぃ）。音量は ほかの SE の はんい
// （v .01〜.06）。糸の はりの「キリ……」は ハンコの 溜めと 同じ つくり（1回 約0.1秒の
// 粒を、長押しの間 0.08秒ごとに 鳴らす。pitch＝1＋0.6×はり）で、はなす！の赤い所
// では 少し 強く なる。

import { se } from './recipe';

const G = '第1章：ザリガニ釣り（対岸の水口）';

// 小窓が 開く：紙を 1枚 めくる かわいた音と、水の 気配
se('se_tsuri_open', {
  label: '釣りの小窓が開く（紙、水の気配）',
  group: G,
  layers: ['noise env=8/90/0/40 dur=80 v=.035 flt=BP2600→4200q0.8', 'sine f=520→680/90 env=4/90/0/40 dur=60 v=.012 at=40'],
});

// 割りばしを ふって、するめを 下ろす（ひゅっ）
se('se_tsuri_cast', {
  label: 'するめを下ろす（ひゅっ）',
  group: G,
  layers: ['noise env=20/60/0/30 dur=90 v=.02 flt=BP1800→3600q1.2'],
});

// ポチャン：小さな 水の 音（高い「ぽ」と、しぶき）
se('se_tsuri_pochan', {
  label: 'ポチャン（するめが水に入る）',
  group: G,
  rand: [0.05, 0.1],
  layers: [
    'sine f=1250→420/70 env=0/90/0/30 dur=40 v=.05',
    'noise env=1/80/0/40 dur=60 v=.022 flt=BP2400q1.2',
    'sine f=900→600/40 env=0/40/0/20 dur=15 v=.012 at=110',
  ],
});

// 糸が はる：細い 糸の「ピン」（たこ糸なので 低め、短い）
se('se_tsuri_line', {
  label: '糸がはる（ピン）',
  group: G,
  layers: ['tri f=1180→1520/60 env=1/70/0/30 dur=40 v=.028', 'noise env=0/25/0/10 dur=15 v=.008 flt=HP5000'],
});

// ツン：はさみで つつく（ごく 小さい 2つの 振れ）
se('se_tsuri_tsun', {
  label: 'ツン（味見。糸が小さくふるえる）',
  group: G,
  rand: [0.06, 0.1],
  layers: ['tri f=1480 env=0/20/0/8 dur=8 v=.03', 'tri f=1320 env=0/20/0/8 dur=8 v=.022 at=70', 'noise env=0/15/0/6 dur=6 v=.008 flt=BP4000q2'],
});

// ぐいっ：はさんで 横へ 引く。糸が のびる「グッ」と、はる音
se('se_tsuri_gui', {
  label: 'ぐいっ（はさんで横へ引く）',
  group: G,
  layers: [
    'sine f=210→150/80 env=1/110/0/40 dur=60 v=.055',
    'tri f=980→1400/90 env=2/100/0/40 dur=70 v=.026 at=20',
    'noise env=2/80/0/30 dur=50 v=.012 flt=BP900q1',
  ],
});

// ぐぐっ：草の 根に 引っかかった（重い、にぶい）
se('se_tsuri_snag', {
  label: 'ぐぐっ（長靴が引っかかる）',
  group: G,
  layers: ['sine f=160→120/140 env=4/160/0/60 dur=120 v=.05', 'tri f=700→820/160 env=6/160/0/60 dur=120 v=.016'],
});

// 引き上げる間の 糸の きしみ（粒。pitch で はりが 上がる）
se('se_tsuri_reel', {
  label: '糸のきしみ（長押しの間、はりで高くなる）',
  group: G,
  max: 3,
  layers: ['tri f=620 env=6/60/.3/30 dur=70 v=.014 am=38/.5', 'noise env=4/50/0/20 dur=40 v=.005 flt=BP2600q2'],
});

// キュッ：速すぎて、はさみが すべる（はなす！）
se('se_tsuri_slip', {
  label: 'キュッ（はさみがすべる・速すぎ）',
  group: G,
  layers: ['sq f=2100→2600/60 env=0/50/0/20 dur=40 v=.014 flt=LP5000', 'sq f=2300→2800/50 env=0/40/0/20 dur=30 v=.01 at=70 flt=LP5000'],
});

// 暴れる：しっぽで 水を たたく（ばちゃっ）
se('se_tsuri_thrash', {
  label: '暴れる（しっぽで水をたたく）',
  group: G,
  rand: [0.06, 0.1],
  layers: ['noise env=1/90/0/40 dur=70 v=.026 flt=BP1400q0.9', 'sine f=520→300/60 env=0/60/0/20 dur=30 v=.015'],
});

// ぽとん：はなして 落ちる
se('se_tsuri_poton', {
  label: 'ぽとん（はなして水に落ちる）',
  group: G,
  layers: ['sine f=760→260/110 env=0/130/0/40 dur=70 v=.05', 'noise env=1/70/0/30 dur=40 v=.014 flt=BP1800q1 at=10'],
});

// 早い！：しっぽを はねて 逃げる（シュッ、泡）
se('se_tsuri_hayai', {
  label: '早い！（しっぽをはねて逃げる）',
  group: G,
  layers: ['noise env=0/70/0/30 dur=50 v=.024 flt=BP3000→1400q1', 'sine f=1400→700/60 env=0/50/0/20 dur=20 v=.01 at=40', 'sine f=1600→900/50 env=0/40/0/20 dur=15 v=.008 at=90'],
});

// たも網が 水に 入る（すっ）
se('se_tsuri_net', {
  label: 'たも網が入る（すっ）',
  group: G,
  layers: ['noise env=30/120/0/60 dur=120 v=.016 flt=BP1600→900q0.9'],
});

// ざばっ：網で すくい上げる。しずくが 3つ
se('se_tsuri_agari', {
  label: 'ざばっ（網ですくう、しずく）',
  group: G,
  layers: [
    'noise env=2/200/0/80 dur=150 v=.034 flt=BP1300q0.8',
    'noise env=10/220/0/100 dur=180 v=.014 flt=BP3400q1 am=22/.5 at=40',
    'sine f=1500→650/60 env=0/70/0/30 dur=18 v=.014 at=280',
    'sine f=1300→600/50 env=0/60/0/30 dur=15 v=.011 at=420',
    'sine f=1700→700/50 env=0/60/0/30 dur=15 v=.009 at=560',
  ],
});

// おぴぃの 手帳の ページ（計る）
se('se_tsuri_card', {
  label: '手帳を開く（計る）',
  group: G,
  layers: ['noise env=10/100/0/40 dur=100 v=.04 flt=BP2400→4400q0.7', 'noise env=0/15/0/8 dur=8 v=.018 flt=HP6000 at=90'],
});

// 放す：そっと 水へ（ちゃぷ）
se('se_tsuri_release', {
  label: '放す（ちゃぷ）',
  group: G,
  layers: ['sine f=880→520/60 env=0/80/0/30 dur=30 v=.03', 'noise env=4/60/0/30 dur=40 v=.01 flt=BP2000q1.2 at=30'],
});

// ぬし：土管の 奥から、大きな 泡が 1つ（ゴボッ）
se('se_tsuri_nushi', {
  label: 'ぬしの気配（土管の奥から大きな泡、ゴボッ）',
  group: G,
  rev: 0.25,
  layers: ['sine f=140→90/220 env=10/260/0/120 dur=200 v=.05', 'sine f=420→900/160 env=5/180/0/60 dur=120 v=.018 at=160', 'noise env=20/200/0/80 dur=160 v=.01 flt=LP500'],
});
