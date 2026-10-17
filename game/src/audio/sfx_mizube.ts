// 水辺の 図鑑（02_ch2_index #81）：第2章の 夜振りの 小さな 音。テナガエビ釣りは ザリガニ釣りの
// 音（sfx_tsuri.ts）を 高めに して 使う。夜の 用水路なので ごく 小さく（v .01〜.04）。

import { se } from './recipe';

const G = '第2章：夜振り（用水路のドジョウ）';

// ぱくっ：ドジョウが 水面で 空気を 吸う（小さな 口の 音）
se('se_yoburi_paku', {
  label: 'ぱくっ（ドジョウが水面で空気を吸う）',
  group: G,
  rand: [0.06, 0.12],
  layers: ['sine f=980→1400/40 env=0/45/0/20 dur=25 v=.03', 'noise env=0/30/0/15 dur=15 v=.008 flt=BP3200q1.5'],
});

// ぷく：おしりから 出る 泡（小さい 3つ）
se('se_yoburi_awa', {
  label: 'ぷく（おしりの泡）',
  group: G,
  rand: [0.08, 0.15],
  layers: ['sine f=1600→2200/30 env=0/30/0/10 dur=12 v=.016', 'sine f=1800→2500/30 env=0/30/0/10 dur=12 v=.012 at=90', 'sine f=1500→2100/30 env=0/30/0/10 dur=12 v=.01 at=170'],
});

// もぐった：泥に 頭から（もふっ、にごり）
se('se_yoburi_dive', {
  label: 'もぐった（泥に頭から）',
  group: G,
  layers: ['noise env=2/120/0/60 dur=90 v=.022 flt=LP700', 'sine f=300→160/80 env=0/90/0/30 dur=40 v=.014'],
});

// たも網を 下から そっと（すっ）
se('se_yoburi_net', {
  label: 'たも網を下から入れる（すっ）',
  group: G,
  layers: ['noise env=20/140/0/60 dur=120 v=.014 flt=BP1300→2000q0.9'],
});
