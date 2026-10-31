// クリア後（05_postgame）：1日がめぐる町の 小さな 音。
// 早回り（3.4・8.2：ツガオ便に 乗る・待つ・寝る）の 間、HUD の 時計の 数字が
// 10分ずつ 回る ところに 置く 小さな 刻み。めくる音（se_clock_flip）より ずっと 小さく、
// 歯車の 「チ」だけ。続けて 鳴らすので 1つは ごく 短い（30ms）。

import { midiHz } from './engine';
import { layer, se, seDefs, sub, type SeCtx } from './recipe';
import { sfxTable } from './registry';
import { D69, nearestPc, voiceBaseMidi as voiceNote } from './voices';

const G = 'クリア後：1日がめぐる町';

// チ：時計の 早回りの 刻み（10分ごと。pitch で 少しずつ 上げてよい）
se('se_pg_kizami', {
  label: '時計の早回りの刻み（チ。10分ごと）',
  group: G,
  max: 3,
  rand: [0.03, 0.08],
  layers: ['tri f=2900 env=0/14/0/8 dur=5 v=.036', 'noise env=0/10/0/6 dur=4 v=.018 flt=BP4200q2', 'sine f=1450 env=0/22/0/10 dur=6 v=.018'],
});

// ---- シークレットエンディング「40年ぶりの 休み」（05 10.2 #6）

/** 別のレシピをこの音のフェーダーの中で（sfx_ch3.ts の play と同じ）。 */
function play(c: SeCtx, id: string, o: { at?: number; vol?: number; pitch?: number } = {}): void {
  if (seDefs.has(id)) {
    sub(c, id, o);
    return;
  }
  sfxTable.get(id)?.({ at: c.t + (o.at ?? 0) / 1000, vol: c.vol * (o.vol ?? 1), pitch: c.pitch * (o.pitch ?? 1), pan: c.pan });
}

/**
 * ツガオのタイムカードの『休』の欄に、しゅんがはなまるを押す：第3章の「みんなの はなまる」
 * （se_c3_minna_hanamaru）の小さい版。重い「どん」ではなく軽い判、花びらは3人ぶん
 * （しゅん・グソっ君・ツガオの声の音）だけ、最後に星。
 */
se('se_pg_yasumi_hanamaru', {
  label: '『休』の欄にはなまる（小さい版）',
  group: G,
  max: 1,
  fn(c) {
    play(c, 'se_stamp_light', { vol: 0.9 });
    const notes = ['shun', 'gusokkun', 'tsugao'].map((v) => voiceNote(v)).map((m, i) => (m ?? [62, 66, 69][i]) + 12);
    notes.forEach((m, i) => layer(c, `sine f=${midiHz(nearestPc(m, D69)).toFixed(1)} env=2/320/0/140 dur=40 v=.007 at=${180 + 110 * i}`));
    play(c, 'se_star', { at: 180 + 110 * 3 + 120, vol: 0.8 });
  },
});
