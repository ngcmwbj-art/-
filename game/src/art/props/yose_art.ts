// 海の 水で 寄せる（03_ch3_index 28、events/ch3/yose.ts）の 絵：沖の ブイの 下（map_c3_umi_oki）と、
// 海水浴場の 底の 南の はしの 岩の すき間、S13 の 防波堤の 寄せ豆腐の 鉢。
//
//   prop_yd_kusari  遊泳区域の ブイの 鎖 (12,5)：砂の 上の おもりから 上へ のびる 鎖、上の はしに 黄色い ブイの 影
//                   （段階1 は 止まった まま、段階2 は 少し ゆれる）。
//   prop_yd_mure    小さな 魚の 群れ（段階1 は 形の まま 止まっている。段階2 は いない：散った あと）。
//   prop_yd_dan     南の はし (y11) の 岩の 段：白い 砂が 切れて、その 先は 濃い 青（平ら）。
//   prop_yd_sukima  海水浴場の 底 (40,12) の 南の 岩の すき間：沖へ のびる ロープ（平ら）。
//   prop_yd_hachi   S13 の ござの 上の 寄せ豆腐の 鉢（平ら。くま吉の 前）。

import { mix, PixelCanvas } from '../../engine/pixel';
import { registerProp } from './registry';
import { outline } from './kit';
import type { PropArt, PropEnv } from './types';

const c3stage = (env: PropEnv): number => env.flag('flag_ch3_stage');

registerProp('prop_yd_kusari', () => {
  const W = 16;
  const H = 64;
  const frames = [0, 1, 2, 1].map((k) => {
    const p = new PixelCanvas(W, H);
    // the sinker on the sand (a concrete block, half in the sand)
    p.rect(3, H - 7, 10, 5, '#7A8A90');
    p.hline(3, 12, H - 7, '#9AAAB0');
    p.hline(3, 12, H - 3, '#4E6068');
    // the chain going up (links alternately seen face-on and edge-on), a little slack
    for (let y = H - 8, i = 0; y > 6; y -= 3, i++) {
      const sway = Math.round(Math.sin((H - y) / 18) * 1.5 + ((H - y) / H) * (k - 1));
      const x = 8 + sway;
      if (i % 2) p.vline(x, y - 2, y, '#5A6A70');
      else {
        p.set(x - 1, y - 1, '#6A7A80');
        p.set(x + 1, y - 1, '#6A7A80');
        p.set(x, y - 2, '#8A9AA0');
        p.set(x, y, '#4A5A60');
      }
    }
    // the buoy's shadow far up (a soft yellow blot seen through the water)
    p.ellipse(8 + (k - 1), 3, 6, 3, mix('#E8C850', '#6AA8C8', 0.45));
    p.ellipse(7 + (k - 1), 2, 3, 1, mix('#F8E890', '#6AA8C8', 0.35));
    return p.toCanvas();
  });
  return {
    ox: 0,
    oy: 16 - H,
    w: W,
    h: H,
    foot: 15,
    img: (env) => (c3stage(env) >= 2 ? frames[Math.floor(env.t / 300) % frames.length] : frames[1]),
    contact: 10,
  } satisfies PropArt;
});

registerProp('prop_yd_mure', () => {
  const W = 48;
  const H = 28;
  const p = new PixelCanvas(W, H);
  // a school in one swirl, every fish heading the same way round (stopped mid-turn)
  for (let i = 0; i < 18; i++) {
    const th = (i / 18) * Math.PI * 1.7 + 0.4;
    const r = 7 + (i % 3) * 4;
    const x = Math.round(24 + Math.cos(th) * r * 1.6);
    const y = Math.round(13 + Math.sin(th) * r * 0.7);
    const dx = Math.sin(th) > 0 ? -1 : 1;
    p.hline(x - 1, x + 1, y, '#5A8098');
    p.set(x + dx * 2, y, '#4A6A80');
    p.set(x - dx * 2, y - 1, '#3E5A70');
    p.set(x - dx * 2, y + 1, '#3E5A70');
    p.set(x, y + 1, '#A8C8D4');
  }
  const img = p.toCanvas();
  return { ox: -16, oy: -12, w: W, h: H, foot: 27, img: (env) => (c3stage(env) >= 2 ? null : img), contact: 0 } satisfies PropArt;
});

registerProp('prop_yd_dan', (opts) => {
  const w = Number(opts.w ?? 22) * 16;
  const p = new PixelCanvas(w, 24);
  for (let y = 0; y < 24; y++)
    for (let x = 0; x < w; x++) {
      const edge = 3 + Math.round(Math.sin(x / 9) * 1.5 + Math.sin(x / 23) * 1.5);
      if (y < edge) continue;
      // the rock's lip, then the blue going dark
      const c = y < edge + 2 ? '#56747E' : y < edge + 4 ? '#3E5A66' : mix('#2A5A7A', '#0A1A2E', Math.min(1, (y - edge - 4) / 14));
      p.set(x, y, c);
    }
  const img = p.toCanvas();
  return { ox: 0, oy: -4, w, h: 24, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

registerProp('prop_yd_sukima', () => {
  const p = new PixelCanvas(16, 24);
  // the gap's dark between the rocks and the rope going in (a floating rope's shadow on the sand, then into the gap)
  for (let y = 8; y < 24; y++) for (let x = 3; x < 13; x++) p.set(x, y, mix('#1E4A66', '#0A1A2E', (y - 8) / 16));
  for (let y = 0; y < 24; y++) {
    const x = 8 + Math.round(Math.sin(y / 5) * 1);
    p.set(x, y, y < 8 ? '#C8B878' : mix('#C8B878', '#1E4A66', (y - 8) / 16));
    if (y % 6 === 2 && y < 10) p.set(x + 1, y, '#E84E3C');
  }
  const img = p.toCanvas();
  return { ox: 0, oy: 0, w: 16, h: 24, foot: 0, flat: true, img: () => img } satisfies PropArt;
});

registerProp('prop_yd_hachi', () => {
  const p = new PixelCanvas(16, 10);
  // a blue-rimmed bowl and the soft white curds heaped in it (a slice of tomato on top if ペロ gave one)
  p.ellipse(8, 6, 6, 3, '#6A7A9A');
  p.ellipse(8, 5, 6, 3, '#F4F1E8');
  p.ellipse(8, 4, 4, 2, '#FFFFFF');
  p.set(6, 4, '#E8E4D8');
  p.set(10, 5, '#E8E4D8');
  outline(p, { soft: true });
  const plain = p.toCanvas();
  const t = new PixelCanvas(16, 10);
  t.ellipse(8, 6, 6, 3, '#6A7A9A');
  t.ellipse(8, 5, 6, 3, '#F4F1E8');
  t.ellipse(8, 4, 4, 2, '#FFFFFF');
  t.ellipse(9, 3, 2, 1, '#E23B2E');
  outline(t, { soft: true });
  const tomato = t.toCanvas();
  return { ox: 0, oy: 2, w: 16, h: 10, foot: 0, flat: true, img: (env) => (env.flag('flag_yd_tomato') ? tomato : plain) } satisfies PropArt;
});

