// 70年の 色紙と 小さな 夏祭り（02_ch2_index #84、53 8.18）：校庭の 桜の 提灯 ひとつの 祭りの 音。
// 夜の 校庭なので、どれも 少し 小さめ（太鼓だけ 胴が 鳴る）。
//   se_matsuri_don    太鼓の 皮（ドン）：低い 胴鳴りと 皮の 打音
//   se_matsuri_ka     太鼓の ふち（カッ）：乾いた 木の 音
//   se_matsuri_clap   拍手 1つ（パン）。グソっ君の 拍手は これを 速く 重ねる
//   se_matsuri_geta   下駄（カラン）：ぴょん夫人が 集会所から 出てくる
//   se_matsuri_tomoru 提灯が ともる（紙が すける、やわらかい ほわっ）

import { se } from './recipe';

const G = '第2章：夏祭り（70年の 色紙）';

// ドン：胴の 低い 鳴り（120→62Hz）と、皮を 打つ 短い 音。夜の 校庭に 少し 響く
se('se_matsuri_don', {
  label: '太鼓（ドン）',
  group: G,
  rev: 0.3,
  rand: [0.03, 0.06],
  max: 3,
  layers: [
    'sine f=128→62/180 env=1/420/0/220 dur=380 v=.16',
    'sine f=196→110/60 env=0/90/0/40 dur=60 v=.05',
    'noise env=0/30/0/20 dur=20 v=.05 flt=LP900q0.9',
    'noise env=0/12/0/6 dur=6 v=.025 flt=BP2200q1.5',
  ],
});

// カッ：ばちで ふちを 打つ（高い 木の 音、すぐ 消える）
se('se_matsuri_ka', {
  label: '太鼓のふち（カッ）',
  group: G,
  rev: 0.22,
  rand: [0.04, 0.06],
  layers: ['tri f=1480→1150/18 env=0/36/0/14 dur=16 v=.06', 'noise env=0/16/0/8 dur=8 v=.05 flt=BP2600q2.4', 'sine f=820→700/30 env=0/50/0/20 dur=28 v=.03'],
});

// パン：手を 1つ たたく
se('se_matsuri_clap', {
  label: '拍手（パン）',
  group: G,
  rev: 0.18,
  rand: [0.08, 0.12],
  max: 8,
  layers: ['noise env=0/26/0/16 dur=14 v=.07 flt=BP1250q1.1', 'noise env=0/12/0/8 dur=6 v=.03 flt=HP3200'],
});

// カラン：下駄の 歯が 校庭の 土を 打つ（2つの 木の 音）
se('se_matsuri_geta', {
  label: '下駄（カラン）',
  group: G,
  rev: 0.12,
  rand: [0.06, 0.1],
  max: 4,
  layers: ['tri f=900→760/30 env=0/50/0/24 dur=30 v=.035', 'noise env=0/14/0/8 dur=8 v=.025 flt=BP1800q2', 'tri f=640→560/30 env=0/44/0/20 dur=26 v=.025 at=46'],
});

// ほわっ：提灯の 紙が 橙に すける
se('se_matsuri_tomoru', {
  label: '提灯がともる（ほわっ）',
  group: G,
  rev: 0.35,
  layers: ['sine f=660→880/260 env=60/320/0/260 dur=360 v=.03', 'sine f=990→1320/260 env=80/300/0/240 dur=320 v=.014', 'noise env=40/220/0/160 dur=200 v=.006 flt=BP3200q1'],
});
