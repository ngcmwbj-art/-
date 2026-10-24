// 堆肥の 中の 親戚（02_ch2_index #97、52 7.13）の 絵：
//   larva(frame)   カブトムシの 幼虫（16×12）：白い 体を C の 字に まるめ、茶色の 頭と 小さな 足 6本、
//                  おしりの 先は 少し 青みがかった 灰色（中の 土が すける）。frame 0/1 で 足が 動く。
//                  8月の おわりの 小さな 幼虫（1〜2令）なので、大写しでも 2倍まで。
//   larvaTiny()    みました帳の 1ぴき（8×6）。
//   frass(n, seed) 表面の つぶつぶ（幼虫の ふん。小さな 俵形の 粒）を n の 多さで（0..3）、18×13 の 中に。

import { PixelCanvas } from '../../engine/pixel';

const BODY = '#F4EEDC';
const BODY_D = '#D9CFB4';
const BODY_L = '#FFFDF6';
const REAR = '#9A9C9A';
const HEAD = '#B8742E';
const HEAD_D = '#7A4A1E';
const LEG = '#A86A2C';
const PELLET = '#160C08';
const PELLET_L = '#3A2618';

const cache = new Map<string, HTMLCanvasElement>();

function cached(key: string, make: () => PixelCanvas): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = make().toCanvas();
    cache.set(key, c);
  }
  return c;
}

/** カブトムシの 幼虫（16×12）。C の 字に まるまって、頭は 右下。 */
export function larva(frame = 0): HTMLCanvasElement {
  return cached(`l${frame & 1}`, () => {
    const p = new PixelCanvas(16, 12);
    // the C: a fat oval curled round (body in a ring with only a slit in the middle)
    for (let y = 0; y < 12; y++)
      for (let x = 0; x < 16; x++) {
        const dx = (x - 7.5) / 7;
        const dy = (y - 5.5) / 5.2;
        if (dx * dx + dy * dy > 1) continue;
        p.set(x, y, BODY);
      }
    // the slit where the head meets the tail (the inside of the C)
    p.line(7, 6, 10, 8, BODY_D);
    p.line(6, 5, 7, 6, BODY_D);
    // the tail end (lower left round, the soil inside shows grey-blue)
    p.ellipse(4, 8, 2.5, 2, REAR);
    p.set(3, 7, '#B8BAB6');
    // segments: short darker lines across the back
    for (const [x, y] of [[3, 3], [5, 1], [8, 1], [11, 2], [13, 4]] as [number, number][]) {
      p.set(x, y, BODY_D);
      p.set(x + (x < 8 ? 1 : -1), y + 1, BODY_D);
    }
    // a light along the top of the back
    for (const [x, y] of [[6, 1], [7, 1], [9, 1], [4, 2]] as [number, number][]) p.set(x, y, BODY_L);
    // the head: brown, lower right, with a darker jaw
    p.ellipse(12, 8, 2.6, 2.2, HEAD);
    p.set(13, 9, HEAD_D);
    p.set(14, 8, HEAD_D);
    p.set(11, 7, '#D49A5C');
    // six small legs under the chest (they wave in frame 1)
    const f = frame & 1;
    for (let i = 0; i < 3; i++) {
      const lx = 9 + i * 1;
      const ly = 9 + (i === 1 ? f : 0);
      p.set(lx - 1, ly + 1, LEG);
      p.set(lx - 1 - f, ly + 2, LEG);
    }
    p.outline('#6E5A3E');
    return p;
  });
}

/** みました帳の 1ぴき（10×8）。 */
export function larvaTiny(): HTMLCanvasElement {
  return cached('tiny', () => {
    const p = new PixelCanvas(10, 8);
    p.ellipse(4.5, 3.5, 3.6, 2.8, BODY);
    p.set(5, 4, BODY_D);
    p.set(6, 5, BODY_D);
    p.set(2, 5, REAR);
    p.set(3, 5, REAR);
    p.rect(6, 4, 2, 2, HEAD);
    p.outline('#6E5A3E');
    return p;
  });
}

/** 表面の つぶつぶ（18×13）。n：0 なし・1 少し・2 多い・3 びっしり。 */
export function frass(n: number, seed: number): HTMLCanvasElement {
  const k = Math.max(0, Math.min(3, n));
  return cached(`f${k}:${seed % 7}`, () => {
    const p = new PixelCanvas(18, 13);
    const count = [0, 4, 8, 13][k];
    let s = ((seed % 7) * 9301 + 49297) % 233280;
    const rnd = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < count; i++) {
      const x = 1 + Math.floor(rnd() * 15);
      const y = 1 + Math.floor(rnd() * 10);
      // a little barrel-shaped pellet, 2×1 or 1×2
      if (rnd() < 0.6) {
        p.rect(x, y, 2, 1, PELLET);
        p.set(x + 1, y + 1, PELLET_L);
      } else {
        p.rect(x, y, 1, 2, PELLET);
        p.set(x + 1, y + 1, PELLET_L);
      }
    }
    return p;
  });
}
