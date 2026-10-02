// ハト係長 (40×40): a stout street pigeon in a necktie with an ID badge (11.1).

import { PixelCanvas } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { K, Mask, ditherMask, rimLeft, shade } from './lib';

const W = 48;
const H = 46;
const OX = 4;
const OY = 4;

const BODY = ['#3F4458', '#4A4F63', '#6B7186', '#7F8699', '#8E95A6', '#A3AABA', '#B8BECC'];
const HEAD = ['#3F4458', '#4F556A', '#646A7E', '#7A8194', '#8A91A3', '#A3AABA'];
const WING = ['#3A3F48', '#4F556A', '#646A7E', '#7A8194', '#8E95A6'];
const GREEN = ['#2E6B4A', '#3F8A62', '#4FA37A', '#7CC79A'];
const PURPLE = ['#4A3070', '#6A4A94', '#8A5FB0', '#B08AD0'];

interface HatoPose {
  /** Head offset x (-1 forward … +1 back). */
  neck?: number;
  headDy?: number;
  /** Chest puff (px). */
  chest?: number;
  iri?: number;
  eyes?: 'open' | 'x' | 'half';
  /** Hold the business card forward. */
  card?: boolean;
  /** Look at the wristwatch. */
  watch?: boolean;
  /** Turned around (running away). */
  back?: number;
  squash?: boolean;
  /** Wings spread forward after throwing. */
  throwArms?: boolean;
}

function build(o: HatoPose): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (x: number) => x + OX;
  const Y = (y: number) => y + OY;
  const neck = o.neck ?? 0;
  const hdy = (o.headDy ?? 0) + (o.squash ? 2 : 0);
  const chest = o.chest ?? 0;
  const sq = o.squash ? 2 : 0;
  const hx = 15 + neck;
  const hy = 9 + hdy;

  if (o.back) return buildBack(o.back);

  // ---- tail (behind) ----
  const tail = new Mask(W, H).poly([[X(29), Y(29)], [X(39), Y(34)], [X(38), Y(37)], [X(28), Y(35)]]);
  shade(p, tail, ['#3A3F48', '#4A4F63', '#5E6477'], { base: 0.45 });
  p.line(X(31), Y(33), X(37), Y(35), '#3A3F48');

  // ---- legs ----
  const legC = ['#B85A4A', '#E07A6A', '#F29A88'];
  for (const lx of [18, 24]) {
    p.rect(X(lx), Y(35 - sq), 2, 4 + sq, legC[1]);
    p.set(X(lx + 1), Y(36 - sq), legC[0]);
    p.set(X(lx + 1), Y(37 - sq), legC[0]);
    // toes: three toes fanning out
    p.hline(X(lx - 2), X(lx + 3), Y(39), legC[1]);
    p.set(X(lx - 2), Y(39), legC[0]);
    p.set(X(lx + 3), Y(39), legC[0]);
    p.set(X(lx), Y(38), legC[2]);
  }

  // ---- body ----
  const body = new Mask(W, H)
    .ellipse(X(22), Y(26 + sq / 2), 11 + (o.squash ? 1 : 0), 11.5 - sq / 2)
    .ellipse(X(17 - chest / 2), Y(24 + sq / 2), 7 + chest, 8 + chest / 2);
  shade(p, body, BODY, { mode: 'sphere', cx: X(20), cy: Y(24), rx: 14, ry: 14, base: 0.62, k: 0.62, grad: 0.1 });
  // chest scallops (feather texture)
  for (let y = 19; y < 34; y += 3)
    for (let x = 11 - chest; x < 26; x += 4) {
      const xx = X(x + ((y / 3) & 1) * 2);
      const yy = Y(y + sq / 2);
      if (body.in(xx, yy) && body.in(xx + 2, yy + 1) && body.in(xx - 1, yy + 2)) {
        p.set(xx, yy + 1, '#A3AABA');
        p.set(xx + 1, yy + 1, '#B8BECC');
        p.set(xx + 2, yy, '#A3AABA');
      }
    }
  // belly shadow
  ditherMask(p, new Mask(W, H).ellipse(X(24), Y(34), 8, 3).and(body), '#6B7186', 0.5);

  // ---- neck (iridescent) ----
  const neckM = new Mask(W, H).ellipse(X(16.5 + neck / 2), Y(15 + hdy / 2 + sq / 2), 5.5, 5);
  shade(p, neckM, HEAD, { mode: 'sphere', base: 0.55 });
  const iriL = o.iri ? PURPLE : GREEN;
  const iriR = o.iri ? GREEN : PURPLE;
  neckM.each((x, y) => {
    const lx = x - X(16.5 + neck / 2);
    const ly = y - Y(15 + hdy / 2);
    if (ly < -2) return;
    const ramp = lx < 0.5 ? iriL : iriR;
    const v = 0.55 - lx * 0.06 - ly * 0.05;
    const idx = Math.max(0, Math.min(3, Math.floor(v * 4 + ((x + y) & 1) * 0.4)));
    p.set(x, y, ramp[idx]);
  });

  // ---- wing (folded, far side) ----
  const wing = new Mask(W, H).poly([
    [X(21), Y(19 + sq)], [X(29), Y(20 + sq)], [X(34), Y(25 + sq)], [X(34), Y(31 + sq / 2)], [X(30), Y(35)], [X(23), Y(33)], [X(20), Y(26)],
  ]);
  if (!o.throwArms) {
    shade(p, wing, WING, { base: 0.55, bevel: 3 });
    // two dark bars
    p.line(X(24), Y(26 + sq), X(33), Y(28 + sq), '#3A3F48');
    p.line(X(24), Y(29 + sq), X(33), Y(31 + sq / 2), '#3A3F48');
    p.line(X(25), Y(27 + sq), X(32), Y(29 + sq), '#4F556A');
    // feather edges
    for (let i = 0; i < 4; i++) p.line(X(25 + i * 2), Y(33 - i), X(29 + i * 1), Y(34 - i), '#8E95A6');
    p.line(X(22), Y(21 + sq), X(28), Y(21 + sq), '#8E95A6');
    if (o.watch) {
      // raised wing tip with a tiny gold watch
      p.rect(X(19), Y(19), 3, 2, '#D9A441');
      p.set(X(20), Y(19), '#FFE7A3');
    } else {
      // watch band peeking at the wing edge
      p.set(X(21), Y(27), '#D9A441');
    }
  }

  // ---- necktie ----
  const tieX = 15.5 + neck * 0.5 - chest * 0.3;
  const tie = new Mask(W, H).poly([
    [X(tieX - 1.5), Y(19 + sq)], [X(tieX + 1.5), Y(19 + sq)], [X(tieX + 2.5), Y(26 + sq)], [X(tieX), Y(29 + sq)], [X(tieX - 2.5), Y(26 + sq)],
  ]);
  tie.each((x, y) => {
    const stripe = (x + y) % 3 === 0;
    p.set(x, y, stripe ? '#E84E3C' : x < X(tieX) ? '#3A5A9A' : '#2F4A8A');
  });
  p.rect(X(Math.round(tieX) - 1), Y(17 + sq), 3, 2, '#24386A');
  p.set(X(Math.round(tieX) - 1), Y(17 + sq), '#3A5A9A');

  // ---- lanyard + ID badge ----
  const cx = 9 + neck * 0.3 - chest;
  p.line(X(13 + neck), Y(17 + sq), X(cx + 3), Y(23 + sq), '#4AA8E0');
  p.line(X(19 + neck), Y(18 + sq), X(20), Y(20 + sq), '#4AA8E0');
  const bx = Math.round(X(cx));
  const by = Y(23 + sq);
  p.rect(bx, by, 6, 8, K.white);
  p.rect(bx + 5, by + 1, 1, 7, '#C8C2B4');
  p.hline(bx, bx + 5, by + 7, '#C8C2B4');
  p.rect(bx + 1, by + 2, 2, 2, '#9AA0A8');
  p.hline(bx + 1, bx + 4, by + 5, '#9AA0A8');
  p.rect(bx + 2, by - 1, 2, 1, '#4AA8E0');

  // ---- card held forward ----
  if (o.card) {
    const cxx = X(4);
    const cyy = Y(15 + hdy);
    p.rect(cxx, cyy, 8, 5, K.white);
    p.hline(cxx + 1, cxx + 6, cyy + 1, '#2F4A8A');
    p.hline(cxx + 1, cxx + 4, cyy + 3, '#9AA0A8');
    p.rect(cxx + 7, cyy, 1, 5, '#C8C2B4');
    // wing tips pinching the card
    p.rect(cxx + 7, cyy + 3, 3, 3, '#7A8194');
    p.rect(cxx - 1, cyy + 3, 2, 3, '#7A8194');
  }
  if (o.throwArms) {
    const wa = new Mask(W, H).poly([[X(20), Y(20)], [X(7), Y(17)], [X(4), Y(21)], [X(18), Y(27)]]);
    shade(p, wa, WING, { base: 0.6, bevel: 2 });
    p.line(X(7), Y(19), X(17), Y(23), '#3A3F48');
  }

  // ---- head ----
  const head = new Mask(W, H).ellipse(X(hx), Y(hy), 5.5, 5.2);
  shade(p, head, HEAD, { mode: 'sphere', cx: X(hx - 1), cy: Y(hy - 1), rx: 6.5, ry: 6.5, base: 0.6, k: 0.6 });
  // beak + cere
  p.poly([[X(hx - 5), Y(hy)], [X(hx - 9), Y(hy + 2)], [X(hx - 5), Y(hy + 3)]], '#E9C9A0');
  p.set(X(hx - 8), Y(hy + 2), '#C8A07A');
  p.set(X(hx - 6), Y(hy + 2), '#C8A07A');
  p.hline(X(hx - 6), X(hx - 5), Y(hy), K.white);
  // eye
  const ex = X(hx - 2);
  const ey = Y(hy - 1);
  if (o.eyes === 'x') {
    p.set(ex - 1, ey - 1, '#2A2440');
    p.set(ex, ey, '#2A2440');
    p.set(ex - 1, ey + 1, '#2A2440');
    p.set(ex + 1, ey - 1, '#2A2440');
    p.set(ex + 1, ey + 1, '#2A2440');
  } else if (o.eyes === 'half') {
    p.hline(ex - 1, ex + 1, ey, '#2A2440');
    p.hline(ex - 1, ex + 1, ey + 1, '#F2E24B');
  } else {
    p.rect(ex - 1, ey - 1, 3, 3, '#F2E24B');
    p.set(ex - 1, ey - 1, '#C8B83A');
    p.rect(ex, ey, 1, 2, '#2A2440');
    p.set(ex - 1, ey, '#2A2440');
    p.set(ex + 1, ey - 1, K.white);
  }

  p.outline(K.outline);
  rimLeft(p, K.rim, 0.5);
  return p;
}

/** Turned-around running pose for 定時退社. */
function buildBack(step: number): PixelCanvas {
  const p = new PixelCanvas(W, H);
  const X = (x: number) => x + OX;
  const Y = (y: number) => y + OY;
  const body = new Mask(W, H).ellipse(X(20), Y(25), 11, 11.5);
  shade(p, body, BODY, { mode: 'sphere', base: 0.5 });
  const wingL = new Mask(W, H).poly([[X(10), Y(20)], [X(19), Y(18)], [X(19), Y(34)], [X(12), Y(32)]]);
  const wingR = new Mask(W, H).poly([[X(21), Y(18)], [X(30), Y(20)], [X(28), Y(32)], [X(21), Y(34)]]);
  shade(p, wingL, WING, { base: 0.6 });
  shade(p, wingR, WING, { base: 0.45 });
  p.line(X(12), Y(26), X(18), Y(27), '#3A3F48');
  p.line(X(22), Y(27), X(28), Y(26), '#3A3F48');
  const tail = new Mask(W, H).poly([[X(16), Y(32)], [X(24), Y(32)], [X(22), Y(39)], [X(18), Y(39)]]);
  shade(p, tail, ['#3A3F48', '#4A4F63', '#5E6477'], {});
  const head = new Mask(W, H).ellipse(X(20), Y(10), 5.5, 5.2);
  shade(p, head, HEAD, { mode: 'sphere', base: 0.5 });
  // iridescent nape
  p.hline(X(17), X(23), Y(15), '#4FA37A');
  p.hline(X(18), X(22), Y(16), '#8A5FB0');
  // legs mid-run
  const a = step === 1 ? 2 : -2;
  p.rect(X(16 + a), Y(36), 2, 3, '#E07A6A');
  p.rect(X(23 - a), Y(35), 2, 3, '#E07A6A');
  p.hline(X(15 + a), X(18 + a), Y(39), '#B85A4A');
  p.hline(X(22 - a), X(25 - a), Y(38), '#B85A4A');
  p.outline(K.outline);
  rimLeft(p, K.rim, 0.5);
  return p;
}

let restoredC: HTMLCanvasElement | null = null;
function restored(): HTMLCanvasElement {
  if (restoredC) return restoredC;
  // small pecking pigeon (16×12)
  const p = new PixelCanvas(18, 14);
  const b = new Mask(18, 14).ellipse(10, 8, 5.5, 3.8);
  shade(p, b, BODY, { mode: 'sphere', base: 0.6 });
  const h = new Mask(18, 14).ellipse(5, 8, 2.6, 2.6);
  shade(p, h, HEAD, { mode: 'sphere', base: 0.6 });
  p.set(2, 10, '#E9C9A0');
  p.set(2, 9, '#E9C9A0');
  p.set(4, 7, '#F2E24B');
  p.set(6, 9, '#4FA37A');
  p.set(7, 8, '#8A5FB0');
  p.hline(15, 16, 7, '#4A4F63');
  p.line(11, 7, 14, 8, '#3A3F48');
  p.set(9, 12, '#E07A6A');
  p.set(12, 12, '#E07A6A');
  p.outline(K.outline);
  restoredC = p.toCanvas();
  return restoredC;
}

registerEnemyArt('enemy_hato_kakaricho', (): EnemyArt => {
  const cache = new Map<string, HTMLCanvasElement>();
  const get = (key: string, o: HatoPose) => {
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
    }
    return c;
  };
  const idleNeck = [-1, 0, 1];
  return {
    id: 'enemy_hato_kakaricho',
    w: W,
    h: H,
    ox: OX,
    oy: OY,
    frame(v: EnemyView): HTMLCanvasElement {
      const iri = loop(v.gt, 250, 2);
      const low = v.hpRate <= 0.3;
      switch (v.pose) {
        case 'hurt':
          return get(`hurt${iri}`, { squash: true, eyes: 'x', iri });
        case 'windup': {
          if (v.skill === 'skill_hato_meishi') {
            // bow (head down 3px) then offer the card
            const bow = v.t < 220;
            return get(`meishi${bow ? 0 : 1}${iri}`, { headDy: 3, neck: -1, card: !bow, iri });
          }
          if (v.skill === 'skill_hato_kaigi') {
            const f = loop(v.t, 100, 6);
            return get(`kaigi${f}${iri}`, { chest: 2, neck: [-1, 0, 1, 1, 0, -1][f], iri });
          }
          if (v.skill === 'skill_hato_teiji') {
            if (v.t < 300) return get(`watch${iri}`, { watch: true, headDy: 1, neck: 1, iri });
            return get(`back${loop(v.t, 90, 2)}`, { back: 1 + loop(v.t, 90, 2) });
          }
          return get(`idle1${iri}`, { neck: 0, iri, eyes: 'half' });
        }
        case 'attack':
          if (v.skill === 'skill_hato_meishi') return get(`throw${iri}`, { throwArms: true, neck: -1, iri });
          if (v.skill === 'skill_hato_kaigi') return get(`kaigiA${iri}`, { chest: 2, neck: -1, iri });
          if (v.skill === 'skill_hato_teiji') return get(`back${loop(v.t, 70, 2)}`, { back: 1 + loop(v.t, 70, 2) });
          return get(`idle1${iri}`, { neck: 0, iri });
        default: {
          const f = loop(v.gt, 180, 4);
          const n = idleNeck[f === 3 ? 1 : f];
          const blink = loop(v.gt + 700, 3100, 12) === 0 && f === 1;
          return get(`idle${n}${iri}${blink ? 'b' : ''}${low ? 'l' : ''}`, { neck: n, iri, eyes: blink ? 'half' : 'open', headDy: low ? 1 : 0 });
        }
      }
    },
    restored,
    gallery: [
      { pose: 'idle' },
      { pose: 'windup', skill: 'skill_hato_meishi', t: 0 },
      { pose: 'windup', skill: 'skill_hato_meishi', t: 300 },
      { pose: 'attack', skill: 'skill_hato_meishi' },
      { pose: 'windup', skill: 'skill_hato_kaigi', t: 150 },
      { pose: 'windup', skill: 'skill_hato_teiji', t: 100 },
      { pose: 'windup', skill: 'skill_hato_teiji', t: 400 },
      { pose: 'hurt' },
    ],
  };
});
