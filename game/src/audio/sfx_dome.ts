// 朝の ほうだけ 光る 星（53 8.17、02_ch2_index #77）：村営天文台の 中の 音。
// 10年 閉めきりの 金物と 布と 紙の 小さな 音。夜の 部屋なので、どれも 小さく（v .01〜.09）。
// ドームが 回る 音だけ 低く 長い（ゴロゴロ）。放送は 壁ごしに こもって 聞こえる（環境音、
// world の 屋内の 決まり）。

import { se } from './recipe';

const G = '第2章：天文台（朝の ほうだけ 光る 星）';

// 鉄の 扉（ギィ…と 重く 開く）
se('se_dome_door', {
  label: '天文台の扉（鉄、重い）',
  group: G,
  layers: [
    'saw f=180→120/420 env=30/380/0/120 dur=420 v=.012 flt=BP900q4 vib=7/9',
    'noise env=0/40/0/20 dur=30 v=.03 flt=BP700q1.2 at=380',
    'sine f=90→70/120 env=2/140/0/60 dur=120 v=.05 at=390',
  ],
});

// 鍵を 回す（さびた 錠の かちゃ、こっ）
se('se_dome_unlock', {
  label: '天文台の鍵を回す',
  group: G,
  layers: ['noise env=0/18/0/8 dur=10 v=.05 flt=BP3200q3', 'noise env=0/14/0/8 dur=8 v=.05 flt=BP2400q3 at=120', 'tri f=820→600/30 env=0/40/0/20 dur=20 v=.03 at=126'],
});

// 布の カバーを とる（ばさっ、ほこり）
se('se_dome_cover', {
  label: '望遠鏡のカバーをとる（ばさっ）',
  group: G,
  rand: [0.05, 0.08],
  layers: ['noise env=10/220/0/140 dur=200 v=.06 flt=BP1400→600q0.8', 'noise env=60/420/0/300 dur=400 v=.012 flt=HP5000 am=13/.5 at=80'],
});

// カードが 落ちる／見せる（紙の ひらり）
se('se_dome_card', {
  label: 'カード（紙がひらり）',
  group: G,
  layers: ['noise env=20/160/0/80 dur=140 v=.025 flt=BP3600q1.2 am=17/.6', 'noise env=0/20/0/10 dur=10 v=.02 flt=BP2200q2 at=170'],
});

// ハンドルを 1回 回す（歯車の かりかり）
se('se_dome_crank', {
  label: 'ハンドルを回す（歯車）',
  group: G,
  rand: [0.06, 0.06],
  max: 3,
  layers: ['noise env=0/10/0/6 dur=5 v=.04 flt=BP2600q3 rep=4x38', 'tri f=320→260/80 env=2/90/0/40 dur=60 v=.015'],
});

// スリットの 鉄板が ずれる（ゴロゴロ。押すたびに 少し）
se('se_dome_shutter', {
  label: 'スリットが開く（ゴロゴロ）',
  group: G,
  rand: [0.05, 0.08],
  max: 3,
  layers: ['noise env=30/300/0/160 dur=320 v=.05 flt=LP420q0.8 am=22/.7', 'sine f=62→58/300 env=20/300/0/120 dur=300 v=.04 am=11/.5'],
});

// 10年ぶんの さび（ギ……）
se('se_dome_rust', {
  label: 'さびたハンドル（ギ……）',
  group: G,
  rand: [0.06, 0.06],
  layers: ['saw f=520→460/260 env=20/260/0/80 dur=260 v=.01 flt=BP1400q6 vib=24/30', 'noise env=10/200/0/60 dur=200 v=.008 flt=BP2600q3'],
});

// ドームが 回る（低い ゴロゴロ。回している あいだ くり返す）
se('se_dome_rotate', {
  label: 'ドームが回る（ゴロゴロ）',
  group: G,
  max: 2,
  layers: ['noise env=60/280/0/120 dur=300 v=.06 flt=LP260q0.7 am=9/.6', 'sine f=48→52/300 env=40/300/0/100 dur=300 v=.05', 'noise env=0/12/0/6 dur=6 v=.012 flt=BP3000q3 rep=3x90 at=40'],
});

// 星の 前で 止まる（カチッ）
se('se_dome_stop', {
  label: 'ドームが止まる（カチッ）',
  group: G,
  layers: ['noise env=0/16/0/8 dur=8 v=.06 flt=BP2000q2', 'sine f=140→90/60 env=0/80/0/30 dur=50 v=.06', 'tri f=1400 env=0/30/0/10 dur=8 v=.02 at=8'],
});

// 望遠鏡の ふたを とる（かぽっ）
se('se_dome_cap', {
  label: '望遠鏡のふたをとる（かぽっ）',
  group: G,
  layers: ['sine f=420→760/40 env=0/50/0/20 dur=40 v=.06', 'noise env=0/14/0/6 dur=8 v=.03 flt=BP1800q2', 'sine f=300 env=0/60/0/30 dur=30 v=.025 at=30'],
});

// 微動ハンドル（ちいさな こつ。動かしている あいだ）
se('se_dome_handle', {
  label: '微動ハンドル（こつこつ）',
  group: G,
  rand: [0.08, 0.06],
  max: 2,
  layers: ['noise env=0/8/0/4 dur=4 v=.02 flt=BP4200q3', 'tri f=1100 env=0/16/0/6 dur=6 v=.008'],
});

// ピントの つまみ（かちかち）
se('se_dome_focus', {
  label: 'ピントのつまみ（かちかち）',
  group: G,
  rand: [0.06, 0.05],
  max: 2,
  layers: ['noise env=0/6/0/3 dur=3 v=.025 flt=BP5200q4', 'tri f=1800 env=0/10/0/4 dur=4 v=.008'],
});

// ピントが 合った（星が しまる、ひそやかな きらり）
se('se_dome_sharp', {
  label: 'ピントが合う（きらり）',
  group: G,
  rev: 0.25,
  layers: ['sine f=E6 env=2/260/0/200 dur=200 v=.02', 'sine f=B6 env=2/320/0/240 dur=240 v=.015 at=60', 'sine f=E7 env=2/200/0/160 dur=140 v=.008 at=120'],
});

// グソっ君の 目：星が いっぱい（ぽわわん）
se('se_dome_eye', {
  label: 'グソっ君の目（星がいっぱい）',
  group: G,
  rev: 0.3,
  layers: ['sine f=C6→C7/400 env=10/420/0/200 dur=400 v=.02 vib=14/20', 'sine f=G6 env=4/90/0/40 dur=60 v=.012 rep=6x60 rnd=20'],
});
