// クリア後（05_postgame 4.3）：時間帯の環境音。world/pgaudio.ts が町 × 帯で選ぶ。
// 9月の初め（第3章の 9月1日の続き）の、どの町にもある音だけ：
//   amb_pg_suzume  朝：スズメ（「チュン」「チュチュン」。2〜3か所から）
//   amb_pg_kuruma  朝・昼：遠くの車（夕鳴町。左から右へ、ゆっくり）
//   amb_pg_semi    昼：アブラゼミ「ジリジリ」×2、ミンミンゼミ「ミーン ミンミンミン ミー」
//   （夕方のヒグラシは第1章の amb_higurashi をそのまま使う）
//   amb_pg_mushi   夜：エンマコオロギ「コロコロ リー」×2、カネタタキ「チッ チッ チッ」
// 虫の種類と鳴く時期は一般的な知識による（エンマコオロギ・カネタタキとも 8〜11月、
// カネタタキは昼も鳴く）。依頼主に確かめたい（報告に書いた）。
// どれもごく小さく（v .002〜.006）。部屋の中では pgaudio が vol .35・LP 2 kHz にする。

import { Every, noiseBed, registerAmbience, type AmbCtx } from './ambience';
import { voice, type VoiceOpts } from './engine';

const v = (c: AmbCtx, o: VoiceOpts): void => {
  voice({ dest: c.dest, ...o });
};

/** スズメの1声「チュン」（下がる 2つの山。高さはひとりずつ少しちがう）。 */
function chun(c: AmbCtx, t: number, pan: number, k: number, vol: number): void {
  const f0 = 5400 * k;
  v(c, { at: t, wave: 'sine', freq: f0, freqEnd: f0 * 0.68, dur: 0.055, attack: 0.004, decay: 0.03, sustain: 0.5, release: 0.02, vol, pan, reverb: 0.15 });
  v(c, { at: t + 0.012, wave: 'sine', freq: f0 * 1.9, freqEnd: f0 * 1.35, dur: 0.035, attack: 0.003, decay: 0.02, sustain: 0.3, release: 0.015, vol: vol * 0.25, pan });
  v(c, { at: t, wave: 'noise', dur: 0.02, attack: 0.002, decay: 0.015, sustain: 0, release: 0.01, vol: vol * 0.2, filter: { type: 'bandpass', freq: 6000, q: 2 }, pan });
}

registerAmbience('amb_pg_suzume', (c) => {
  const birds = [c.rng.range(-0.7, -0.3), c.rng.range(0.25, 0.7), c.rng.range(-0.2, 0.3)].map((pan, i) => {
    const k = c.rng.range(0.92, 1.08);
    const vol = i === 2 ? 0.0025 : 0.004;
    return new Every(c, 2.5, 7, (t) => {
      // 「チュン」1〜2つ、ときどき「チュチュン チュン」（3〜5）
      const n = c.rng.chance(0.3) ? 3 + Math.floor(c.rng.range(0, 3)) : 1 + Math.floor(c.rng.range(0, 2));
      let x = t;
      for (let j = 0; j < n; j++) {
        chun(c, x, pan, k * c.rng.range(0.97, 1.03), vol * c.rng.range(0.7, 1));
        x += c.rng.range(0.09, 0.22);
      }
    }, 0.3, 4);
  });
  return {
    pump(u) {
      for (const b of birds) b.pump(u);
    },
    stop() {},
  };
});

registerAmbience('amb_pg_kuruma', (c) => {
  const car = new Every(c, 12, 28, (t) => {
    const from = c.rng.chance(0.5) ? -0.7 : 0.7;
    const len = c.rng.range(3, 4.5);
    v(c, { at: t, wave: 'noise', dur: len, attack: len * 0.45, decay: 0, sustain: 1, release: len * 0.5, vol: 0.003, filter: { type: 'lowpass', freq: 650 }, pan: from, panEnd: -from });
    v(c, { at: t, wave: 'noise', dur: len, attack: len * 0.45, decay: 0, sustain: 1, release: len * 0.5, vol: 0.0008, filter: { type: 'bandpass', freq: 1400, q: 1 }, pan: from, panEnd: -from });
  }, 2, 12);
  return { pump: (u) => car.pump(u), stop() {} };
});

registerAmbience('amb_pg_semi', (c) => {
  // アブラゼミ：「ジリジリ」15〜30秒鳴いて 5〜15秒やすむ（2匹）
  const abura = [-0.5, 0.45].map((pan) => {
    let next = c.t0 + c.rng.range(0.5, 8);
    return {
      pump(u: number) {
        let guard = 0;
        while (next < u && guard++ < 8) {
          const t = Math.max(next, c.g.ctx.currentTime);
          const len = c.rng.range(15, 30);
          v(c, { at: t, wave: 'noise', dur: len, attack: 1.2, decay: 0, sustain: 1, release: 1.5, vol: 0.004, filter: { type: 'bandpass', freq: 4800, q: 1.2 }, am: { rate: c.rng.range(60, 90), depth: 0.7 }, pan });
          next = t + len + c.rng.range(5, 15);
        }
      },
    };
  });
  // ミンミンゼミ：「ミーン」のあと「ミン」を 4〜7回、最後に「ミー」（30〜60秒に1回）
  const minmin = new Every(c, 30, 60, (t) => {
    const pan = c.rng.range(-0.5, 0.5);
    const base = 3300 * c.rng.range(0.97, 1.03);
    let x = t;
    v(c, { at: x, wave: 'sine', freq: base * 0.92, freqEnd: base, dur: 1.2, attack: 0.25, decay: 0, sustain: 1, release: 0.15, vol: 0.003, am: { rate: 140, depth: 0.35 }, pan });
    x += 1.4;
    const n = 4 + Math.floor(c.rng.range(0, 4));
    for (let i = 0; i < n; i++) {
      v(c, { at: x, wave: 'sine', freq: base * 0.9, freqEnd: base * 1.04, dur: 0.24, attack: 0.04, decay: 0, sustain: 1, release: 0.08, vol: 0.003, am: { rate: 140, depth: 0.35 }, pan });
      x += 0.36;
    }
    v(c, { at: x, wave: 'sine', freq: base, freqEnd: base * 0.85, dur: 1.0, attack: 0.05, decay: 0, sustain: 1, release: 0.5, vol: 0.0025, am: { rate: 140, depth: 0.35 }, pan });
  }, 3, 18);
  return {
    pump(u) {
      for (const a of abura) a.pump(u);
      minmin.pump(u);
    },
    stop() {},
  };
});

registerAmbience('amb_pg_mushi', (c) => {
  // エンマコオロギ：「コロコロ」（25 Hz ほどの粒が 0.4秒）に「リー」（0.6秒）。2匹、1.5〜3.5秒おき
  const korogi = [c.rng.range(-0.7, -0.25), c.rng.range(0.2, 0.65)].map((pan, i) => {
    const f = 4300 * (i ? 1.04 : 1);
    return new Every(c, 1.5, 3.5, (t) => {
      v(c, { at: t, wave: 'sine', freq: f, dur: 0.38, attack: 0.01, decay: 0, sustain: 1, release: 0.04, vol: 0.004, am: { rate: 25, depth: 1, shape: 'square' }, pan, reverb: 0.3 });
      if (c.rng.chance(0.7)) v(c, { at: t + 0.45, wave: 'sine', freq: f * 1.02, dur: 0.6, attack: 0.02, decay: 0, sustain: 1, release: 0.12, vol: 0.0035, am: { rate: 48, depth: 0.8 }, pan, reverb: 0.3 });
    }, 0.3, 3);
  });
  // カネタタキ：「チッ」を 1秒に 2〜3回、4〜12回つづけて、8〜18秒やすむ
  const kane = new Every(c, 8, 18, (t) => {
    const pan = c.rng.range(-0.4, 0.5);
    const n = 4 + Math.floor(c.rng.range(0, 9));
    const gap = c.rng.range(0.34, 0.45);
    for (let i = 0; i < n; i++)
      v(c, { at: t + i * gap, wave: 'sine', freq: 6800 * c.rng.range(0.995, 1.005), dur: 0.018, attack: 0.002, decay: 0.03, sustain: 0.2, release: 0.03, vol: 0.003, pan, reverb: 0.35 });
  }, 2, 10);
  return {
    pump(u) {
      for (const k of korogi) k.pump(u);
      kane.pump(u);
    },
    stop() {},
  };
});
