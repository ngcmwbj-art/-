// 脇芽は 朝に かく（53 8.16、02_ch2_index #73）：1号ハウスの 株の 小さな 音。
// 夜の ハウスの 中なので、どれも 小さく 短く（v .01〜.08）。タイミングの 輪の 音は
// 戦闘の se_ring を そのまま 使う（ちぢむ あいだ 上がっていく 音が、はなす 目安）。
// 「ぽきっ」は 若い 茎が 横に 折れる 乾いた 音（高い 割れと、短い 茎の 鳴り）。

import { se } from './recipe';

const G = '第2章：脇芽かき（1号ハウス）';

// 大写しが 開く／次の 株へ：葉が こすれる さらさら
se('se_wakime_open', {
  label: '株の大写し・次の株（葉ずれ）',
  group: G,
  rand: [0.05, 0.1],
  layers: ['noise env=60/260/0/120 dur=300 v=.03 flt=BP2400→3800q0.9 am=9/.5', 'noise env=20/120/0/60 dur=120 v=.012 flt=HP5200 at=140'],
});

// 指で つまむ（長押しの はじめ）：茎が きゅっと しなる
se('se_wakime_bend', {
  label: '脇芽をつまむ（茎がしなる）',
  group: G,
  rand: [0.06, 0.06],
  layers: ['tri f=240→300/220 env=8/220/0/60 dur=200 v=.02', 'noise env=4/90/0/40 dur=70 v=.01 flt=BP1500q1.5'],
});

// ぽきっ：いい ところで はなした（きれいに 折れる）
se('se_wakime_poki', {
  label: 'ぽきっ（脇芽がきれいに折れる）',
  group: G,
  rand: [0.06, 0.08],
  max: 4,
  rev: 0.08,
  layers: [
    'noise env=0/22/0/10 dur=8 v=.09 flt=BP2800q2',
    'tri f=1700→900/25 env=0/30/0/10 dur=12 v=.05',
    'sine f=560→320/45 env=0/45/0/20 dur=24 v=.045',
    'noise env=0/10/0/6 dur=4 v=.03 flt=HP6000 at=18',
  ],
});

// 早い：しなった だけで、もどる（ゆれる 茎の びよん）
se('se_wakime_shinari', {
  label: 'しなっただけ（芽がもどる）',
  group: G,
  layers: ['tri f=420→360/140 env=2/150/0/60 dur=110 v=.028 vib=16/18', 'noise env=10/140/0/80 dur=120 v=.01 flt=BP3000q1 am=11/.5'],
});

// 遅い：押しつづけて、皮ごと ちぎれる（ぎざぎざ。すじの 切れる 小さな ぶちぶち）
se('se_wakime_giza', {
  label: '切り口がぎざぎざ（皮ごとちぎれる）',
  group: G,
  rand: [0.05, 0.06],
  layers: [
    'noise env=1/35/0/20 dur=20 v=.05 flt=BP1600q1.2 rep=4x55',
    'noise env=30/220/0/100 dur=220 v=.018 flt=BP1100q0.8',
    'tri f=300→180/200 env=5/200/0/60 dur=160 v=.018',
  ],
});

// 花房を かいて しまった：小さな「ぷちっ」と、花びらの 落ちる かすかな 音
se('se_wakime_hana', {
  label: '花房をかいてしまった（ぷちっ・花が落ちる）',
  group: G,
  layers: [
    'sine f=1400→980/30 env=0/30/0/12 dur=12 v=.035',
    'noise env=0/14/0/6 dur=6 v=.03 flt=BP3600q2',
    'noise env=30/320/0/160 dur=260 v=.01 flt=BP4600q1 am=12/.6 at=60',
  ],
});

// グソっ君の 小さい 足が いっせいに 動く（わしゃわしゃ。軽い 殻の こすれ）
se('se_wakime_legs', {
  label: 'グソっ君の足（わしゃわしゃ）',
  group: G,
  layers: ['noise env=0/14/0/6 dur=6 v=.03 flt=BP3400q3 rep=16x45 rnd=30', 'noise env=0/10/0/5 dur=4 v=.02 flt=BP5200q3 rep=14x52 rnd=30 at=20'],
});
