// 終わりの 音は、下がる（げむきか 10-26 の 案3、03_ch3_index、events/ch3/housou.ts）の 音：旧水族館の 放送室。
//
//   se_hs_btn_0〜3   チャイムの 箱の ボタン 1つずつ（低い 順に C5・E5・G5・C6、館内の スピーカーから）
//   se_hs_pa_up      上り 4音（放送の 前）。済ませた あとの S18・S25 の ポコシャの 放送の 前
//   se_hs_pa_down    下り 4音（放送の あと）。同じく 放送の あと
//   se_hs_kachi      テープが 止まる「カチッ」
//   se_hs_off        電源を 切る（つまみ）：「カチ」と、ジー が すっと 落ちる
// 声：c3_uketsuke_tape（10年前の テープの ハキコ：館内の スピーカー、少し 高く 若く）、
//     gusokkun_pa（グソっ君の 迷子の お知らせ：館内の スピーカー）。
// 4つの 音は どこにでも ある 音の 並び（ド・ミ・ソ・ド）。閉館の 曲は 使わない。

import { INS } from './instruments';
import { cur, dbToGain } from './engine';
import { seTrim, trimOr1, VOICE_TRIM } from './mix';
import { duck, duckAmbience } from './music';
import { se, type SeCtx } from './recipe';
import { VOICES } from './voices';

const G_HS = '第3章：旧水族館の 放送室';

/** チャイムの 箱の 4つの 音（低い 順）。 */
export const HS_NOTES = [72, 76, 79, 84];

/** 館内の スピーカーへ（sfx_ch3.ts の viaKannai と 同じ）。 */
function kannai(c: SeCtx, id: string): SeCtx {
  const g = cur();
  if (g.offline && g.pa.mode !== 'kannai') g.pa.setMode('kannai', 0);
  g.pa.open(c.t);
  g.pa.wake(c.t + 4);
  return { ...c, dest: g.pa.input, vol: c.vol * trimOr1(seTrim(id)), rev: 0 };
}

function vibes(c: SeCtx, midis: number[], gap: number, last: number, vol: number): void {
  const f = INS.ins_fm_vibes;
  if (!f) return;
  const semis = 12 * Math.log2(c.pitch);
  midis.forEach((m, i) => {
    const len = (i === midis.length - 1 ? last : gap * 0.92) / 1000;
    f({ t: c.t + (i * gap) / 1000, midi: m + semis, dur: len, vel: 1, dest: c.dest, o: { vol: vol * c.vol } });
  });
}

HS_NOTES.forEach((m, i) =>
  se(`se_hs_btn_${i}`, {
    label: `チャイムの ボタン ${i + 1}（低い ほうから ${i + 1}つめ）`,
    group: G_HS,
    max: 2,
    fn(c) {
      vibes(kannai(c, `se_hs_btn_${i}`), [m], 400, 700, 0.06);
    },
  }),
);

/** 上り 4音・下り 4音（音楽と 床の 音が 一歩 下がる：se_c3_aq_pa_chime と 同じ）。 */
function chime(id: string, up: boolean) {
  se(id, {
    label: up ? '上り 4音チャイム（放送の 前。ピン・ポン・パン・ポーン↑）' : '下り 4音チャイム（放送の あと。ピン・ポン・パン・ポーン↓）',
    group: G_HS,
    max: 1,
    fn(c) {
      const p = kannai(c, id);
      vibes(p, up ? HS_NOTES : [...HS_NOTES].reverse(), 380, up ? 900 : 1400, 0.06);
      if (!cur().offline) {
        duck(dbToGain(-6), 0.3, 1.8, 0.8, c.t);
        duckAmbience(dbToGain(-3), 0.3, 1.8, 0.8);
      }
    },
  });
}
chime('se_hs_pa_up', true);
chime('se_hs_pa_down', false);

se('se_hs_kachi', {
  label: 'テープが 止まる（カチッ）',
  group: G_HS,
  layers: ['noise env=0/30/0/15 dur=20 v=.03 flt=BP3400q2', 'tri f=1400→900/20 env=0/25/0/10 dur=10 v=.012'],
});
se('se_hs_off', {
  label: '放送の 電源を 切る（カチ、ジー が 落ちる）',
  group: G_HS,
  layers: ['noise env=0/35/0/15 dur=25 v=.03 flt=BP2600q2', 'saw f=120→60/400 env=0/400/0/200 dur=300 v=.004 flt=LP900 at=40'],
});

// the voices on the ceiling speakers (as pokosha_pa: the parent's trim, a little under it for the PA's lift)
const uk = VOICES.c3_uketsuke;
if (uk) {
  VOICES.c3_uketsuke_tape = { ...uk, label: 'ハキコ（10年前の テープ。館内放送）', base: 'C5', pa: true };
  VOICE_TRIM.c3_uketsuke_tape = (VOICE_TRIM.c3_uketsuke ?? 16) - 1.5;
}
const kn = VOICES.gusokkun;
if (kn) {
  VOICES.gusokkun_pa = { ...kn, label: 'グソっ君（迷子の お知らせ。館内放送）', v: kn.v * 1.2, pa: true };
  VOICE_TRIM.gusokkun_pa = (VOICE_TRIM.gusokkun ?? 13.5) - 1.5;
}
