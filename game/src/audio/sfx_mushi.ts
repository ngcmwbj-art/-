// 捕まえない自由研究 (53_ch2_audio 8.14, 50_ch2_story 10.21, 02_ch2_index #64): the
// call of each insect, once, close by, when it is looked at in the tomato's
// light. The same voices as amb_h_insects / amb_h_kusa (53 7.1), a phrase of
// each, nearer: a single insect's song — never set to a tune, never played
// back or lined up with the others (00 16章, 53 1.4 / 1.7). カブトムシ doesn't sing.

import { se } from './recipe';

const G = '第2章：村・ハウス・集会所';

// カンタン「ルルルル……」: the 48 Hz trill on 2.85 kHz, sagging a hair as it runs out of breath
se('se_h_mushi_kantan', {
  label: '虫：カンタン（ルルルル……。見たときに1回）',
  group: G,
  rev: 0.3,
  layers: ['sine f=2850→2810/2400 env=260/0/1/500 dur=2400 v=.011 am=48/.8'],
});

// エンマコオロギ「コロコロリー」: four quick pulses, then the note held with a 30 Hz trill
se('se_h_mushi_enma', {
  label: '虫：エンマコオロギ（コロコロリー）',
  group: G,
  rev: 0.25,
  layers: [
    'sine f=4400 env=2/12/.3/6 dur=18 v=.011',
    'sine f=4400 env=2/12/.3/6 dur=18 v=.011 at=30',
    'sine f=4400 env=2/12/.3/6 dur=18 v=.011 at=60',
    'sine f=4400 env=2/12/.3/6 dur=18 v=.011 at=90',
    'sine f=4356 env=20/100/.8/80 dur=420 v=.012 am=30/1 at=150',
  ],
});

// クツワムシ「ジー……ガチャガチャ」: the buzzing run-up, then the clatter (noise chopped at 50 Hz), a little comical
se('se_h_mushi_kutsuwa', {
  label: '虫：クツワムシ（ジー……ガチャガチャ）',
  group: G,
  rev: 0.2,
  layers: [
    'noise env=200/0/1/60 dur=420 v=.006 flt=BP4600q2 am=70/.6',
    ...Array.from({ length: 12 }, (_, i) => {
      const env = (Math.sin((Math.PI * (i + 0.5)) / 12) * 0.6 + 0.4).toFixed(2);
      return `noise env=8/30/.7/20 dur=100 v=${(0.02 * Number(env)).toFixed(4)} flt=BP5000q1 am=50/1 at=${480 + i * 180}`;
    }),
  ],
});

// ウマオイ「スイーッ……チョン」: the rising grain, a breath, the click
se('se_h_mushi_umaoi', {
  label: '虫：ウマオイ（スイーッ……チョン）',
  group: G,
  rev: 0.25,
  layers: ['sine f=3800→4200/400 env=50/50/.9/30 dur=400 v=.011 am=80/.8', 'sine f=3200 env=3/30/.6/20 dur=60 v=.011 at=520'],
});

// スズムシ「リーン……リーン」: in the case, indoors (a touch drier)
se('se_h_mushi_suzu', {
  label: '虫：スズムシ（リーン、飼育ケースの中）',
  group: G,
  rev: 0.12,
  layers: ['sine f=4100 env=20/100/.8/80 dur=520 v=.011 am=40/.9', 'sine f=4080 env=20/100/.8/80 dur=520 v=.010 am=40/.9 at=760'],
});
