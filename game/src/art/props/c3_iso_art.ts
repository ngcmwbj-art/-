// 本日は、開館です（03_ch3_index、events/ch3/iso.ts）の 絵：岬の 磯 map_c3_iso と 旧水族館の 前の 石段。
//
//   prop_iso_ishi       めくれる 石（岩の 上の 平たい 丸い 石。4つの 形）
//   prop_iso_kui        名札の 杭（白い 名札、すみに 小さな 字の 点）
//   prop_iso_kan        旧水族館の 古い 取水管（さびた 鉄の 管、1マスずつ。end：海に 入る 口）
//   prop_iso_fuda       札『取水口 さわらない』（赤い 字の 点）
//   prop_iso_funamushi  乾いた 岩の 上の フナムシ（近づくと 散って 消える：env.near）
//   prop_iso_kamenote   岩の 割れ目の カメノテ（指の ような 束）
//   prop_iso_rope       石段の 上の ロープと 札（第3章の 正午／満ち潮の 間）
//   prop_iso_harigami   旧水族館の ガラス戸の 貼り紙『本日 開館』（開館の あと）

import { mix } from '../../engine/pixel';
import { P } from '../tiles/palette';
import { registerProp } from './registry';
import { standProp } from './hoshi_kit';
import type { PropArt, PropEnv } from './types';

const ROCK = { lt: '#B8B4A8', base: '#8E8A80', dk: '#62605A', wet: '#4A4A48' };
const RUST = { lt: '#C8784A', base: '#9A5A38', dk: '#6A3A28' };

registerProp('prop_iso_ishi', (opts) => {
  const v = Number(opts.v ?? 0);
  const w = [12, 10, 13, 11][v];
  const h = [7, 6, 8, 6][v];
  return standProp(
    w + 2,
    h + 1,
    (p) => {
      const cx = (w + 2) / 2 - 0.5;
      p.ellipse(cx, h / 2 + 0.5, w / 2, h / 2, ROCK.dk);
      p.ellipse(cx - 0.5, h / 2, w / 2 - 1, h / 2 - 1, ROCK.base);
      p.ellipse(cx - 1.5, h / 2 - 1, w / 4, h / 4, ROCK.lt);
      // a wet line round its foot, a speck of weed
      p.hline(1, w, h, ROCK.wet);
      if (v % 2 === 0) p.set(w - 2, h - 2, '#6A8A48');
    },
    { cx: 8, base: 13, shadow: 2, soft: true },
  );
});

registerProp('prop_iso_kui', () =>
  standProp(
    10,
    18,
    (p) => {
      // the stake, the white card nailed to it, a few dots of writing and the tiny 『解説』 corner
      p.vline(4, 6, 17, P.woodDark);
      p.vline(5, 6, 17, P.wood);
      p.rect(0, 0, 10, 7, P.paper);
      p.hline(0, 9, 6, P.paperGrid);
      p.hline(2, 7, 2, P.ink);
      p.hline(2, 5, 4, mix(P.ink, P.paper, 0.4));
      p.set(8, 5, P.verm);
    },
    { cx: 8, base: 16, shadow: 8 },
  ),
);

registerProp('prop_iso_kan', (opts) => {
  const end = !!opts.end;
  return standProp(
    10,
    end ? 10 : 16,
    (p) => {
      const H = end ? 10 : 16;
      p.rect(2, 0, 6, H, RUST.base);
      p.vline(2, 0, H - 1, RUST.lt);
      p.vline(7, 0, H - 1, RUST.dk);
      // the flange of each length, a rust stain
      p.hline(1, 8, 2, RUST.dk);
      p.set(4, 8, '#C89A6A');
      if (end) {
        p.ellipse(5, H - 2, 3, 1.5, '#2A2A30');
      }
    },
    { cx: 8, base: end ? 12 : 16, shadow: 6, soft: true },
  );
});

registerProp('prop_iso_fuda', () =>
  standProp(
    12,
    16,
    (p) => {
      p.vline(5, 7, 15, P.woodDark);
      p.rect(0, 0, 12, 8, P.white);
      p.strokeRect(0, 0, 12, 8, P.verm);
      p.hline(2, 9, 3, P.verm);
      p.hline(2, 7, 5, P.ink);
    },
    { cx: 8, base: 16, shadow: 8 },
  ),
);

/** フナムシ：乾いた 岩の 上に 5〜6匹。しゅんが 近づくと 散って 見えなく なる。 */
registerProp('prop_iso_funamushi', () => {
  const frames: HTMLCanvasElement[] = [];
  for (let f = 0; f < 2; f++) {
    const a = standProp(
      16,
      10,
      (p) => {
        for (const [x, y] of [[2, 3], [7, 2], [11, 4], [4, 7], [9, 6], [13, 8]] as const) {
          const dx = f && (x + y) % 2 ? 1 : 0;
          p.rect(x + dx, y, 3, 1, '#3A3430');
          p.set(x + dx + 3, y, '#5A5048');
          p.set(x + dx - 1, y, '#5A5048');
        }
      },
      { cx: 8, base: 10, outline: false },
    );
    frames.push(a.img({} as PropEnv)!);
  }
  const art: PropArt = {
    ox: 0,
    oy: -2,
    w: 16,
    h: 10,
    foot: 2,
    // (gone while Minato stands within 40 px: they ran)
    img: (env: PropEnv) => (env.near < 40 ? null : frames[Math.floor(env.t / 260) % 2]),
  };
  return art;
});

registerProp('prop_iso_kamenote', () =>
  standProp(
    14,
    9,
    (p) => {
      // a bunch of 'fingers' in the crack: grey-green stalks, pale nails
      for (let i = 0; i < 5; i++) {
        const x = 2 + i * 2;
        const h = 4 + ((i * 3) % 3);
        p.vline(x, 9 - h, 8, '#5A5E50');
        p.set(x, 9 - h - 1, '#D8D0B8');
        p.set(x + 1, 9 - h, '#B8B0A0');
      }
    },
    { cx: 8, base: 14, outline: false },
  ),
);

registerProp('prop_iso_rope', () =>
  standProp(
    18,
    14,
    (p) => {
      // two short posts, the rope sagging between, the sign hung on it
      p.vline(1, 4, 13, P.woodDark);
      p.vline(16, 4, 13, P.woodDark);
      for (let x = 2; x <= 15; x++) p.set(x, 6 + Math.round(Math.sin(((x - 2) / 13) * Math.PI) * 2), '#C8A06A');
      p.rect(5, 0, 8, 6, P.white);
      p.strokeRect(5, 0, 8, 6, P.verm);
      p.hline(7, 10, 2, P.ink);
    },
    { cx: 8, base: 14, shadow: 6 },
  ),
);

/** 旧水族館の 前の 広場の 南の はしから 磯へ 下りる 石段（平らに：4段）。 */
registerProp('prop_iso_dan', () => {
  const a = standProp(
    14,
    16,
    (p) => {
      for (let i = 0; i < 4; i++) {
        const y = i * 4;
        p.rect(1, y, 12, 3, i % 2 ? ROCK.base : ROCK.lt);
        p.hline(1, 12, y + 3, ROCK.dk);
      }
    },
    { cx: 8, base: 16, outline: false },
  );
  return { ...a, flat: true };
});

registerProp('prop_iso_harigami', () => {
  const a = standProp(
    10,
    12,
    (p) => {
      p.rect(0, 0, 10, 12, P.paper);
      p.hline(0, 9, 11, P.paperGrid);
      // 『本日 開館』 in ポコシャ's hand: two short lines, a 朱 circle
      p.hline(2, 7, 3, P.ink);
      p.hline(2, 7, 6, P.ink);
      p.set(8, 9, P.verm);
    },
    { cx: 8, base: 16, outline: false },
  );
  return { ...a, foot: 16, flat: false };
});
