// 1枚絵 cut_tsugao_room — ツガオの部屋 (52_ch2_level_art 12.5, 50_ch2_story
// 10.16 カット7, 53_ch2_audio 12.14). After chapter 2's 「つづく」: the back of
// an old office, one green-shaded lamp; ツガオ, the boss of まだまだ団, hears
// ダコク's report on 夕鳴町 and 星見台. One picture; only its layers move
// (the hands, the cards, the clocks, the lamp). The pictures are in
// cut_tsugao_art.ts. No id prefix `h`: chapter 3 uses the room too.
//
//   const room = yield* openTsugaoRoom();   // black; the room is pushed over the scenes
//   yield* room.fadeIn();                   // 1.5 s out of the black
//   room.armCard(1);                        // ダコク's next 「ガチャン」 spits out card 1
//   yield* say('…ガチャン。', { name: 'ダコク', voice: 'dakoku' })
//   room.clockRun('yunari');                // 夕鳴町's second hand starts (the caller plays the sound)
//   yield* room.tapCard(); yield* room.leanBack(); yield* room.reachCap(); room.stopAt('マダ');
//   yield* room.putCapBack(); room.clockRun('hoshimi'); yield* room.arrangeCards();
//   yield* room.turnPage(); yield* room.stamp(); yield* room.capOn(); yield* room.lampOff();
//   room.close();
//
// ダコク moves by itself with what it says: while its line types, the box
// bobs a pixel; at each 「ガチャン」 it sinks 2px (and spits the armed card,
// which slides across the desk into the lamplight). ツガオ's and ダコク's
// name tags are black paper tape (dialog.ts does it for their voices).
//
//   yield* playTsugaoRoom({ skippable })    // the whole カット7 with its lines and sounds;
//                                           // `skippable`: X leaves it (the second time on)

import type { Co } from '../engine/co';
import { game, type Scene, type Widget } from '../engine/game';
import type { Input } from '../engine/input';
import type { Gfx } from '../engine/gfx';
import { ease } from '../engine/tween';
import { ambientEvent, currentSpace, playAmbient, playBgm, setSpace, sfx, stopAllAmbient, stopAmbient, stopBgm } from '../audio';
import { dialogSpeech, dismissDialog, say } from './dialog';
import {
  BOARD,
  boardFlip,
  boardImg,
  buildLight,
  buildRoomBack,
  buildRoomFront,
  capImg,
  cardImg,
  CLOCKS,
  clockFace,
  DAKOKU,
  dakokuBox,
  handImg,
  HEAD_W,
  headImg,
  HOOK,
  madaPrint,
  P,
  plateImg,
  STAMP_REST,
  stampFace,
  stampImg,
  TORSO,
  torsoImg,
  type ClockId,
} from './cut_tsugao_art';

// ---- cached pictures --------------------------------------------------------------------------

interface Art {
  back: HTMLCanvasElement;
  front: HTMLCanvasElement;
  light: HTMLCanvasElement;
  faces: Record<ClockId, HTMLCanvasElement>;
  plates: Record<ClockId, HTMLCanvasElement>;
  torso: HTMLCanvasElement;
  head: HTMLCanvasElement;
  capHang: HTMLCanvasElement;
  capWorn: HTMLCanvasElement;
  hands: Record<string, HTMLCanvasElement>;
  box: HTMLCanvasElement;
  cards: HTMLCanvasElement[];
  boards: HTMLCanvasElement[];
  flips: HTMLCanvasElement[];
  stamp: HTMLCanvasElement;
  faces3: HTMLCanvasElement[];
  print: HTMLCanvasElement;
}
let art: Art | null = null;

function getArt(): Art {
  if (art) return art;
  const ids: ClockId[] = ['yunari', 'hoshimi', 'umi'];
  const hands: Record<string, HTMLCanvasElement> = {};
  for (const k of ['rest', 'point', 'open', 'grip'] as const) {
    hands[k] = handImg(k);
    hands[k + 'F'] = handImg(k, true);
  }
  art = {
    back: buildRoomBack(),
    front: buildRoomFront(),
    light: buildLight(),
    faces: Object.fromEntries(ids.map((id) => [id, clockFace(id)])) as Record<ClockId, HTMLCanvasElement>,
    plates: Object.fromEntries(ids.map((id) => [id, plateImg(id)])) as Record<ClockId, HTMLCanvasElement>,
    torso: torsoImg(),
    head: headImg(),
    capHang: capImg('hang'),
    capWorn: capImg('worn'),
    hands,
    box: dakokuBox(),
    cards: [cardImg(1), cardImg(2)],
    boards: [boardImg(0), boardImg(1)],
    flips: [boardFlip(0), boardFlip(1), boardFlip(2)],
    stamp: stampImg(),
    faces3: [stampFace(24, 10), stampFace(48, 20), stampFace(96, 40)],
    print: madaPrint(),
  };
  return art;
}

/** Build the room's pictures ahead (they take a few frames). */
export function prepareTsugaoRoom(): void {
  getArt();
}

// ---- the scene ----------------------------------------------------------------------------------

type Side = 'L' | 'R';
type HandKind = 'rest' | 'point' | 'open' | 'grip';

interface Arm {
  x: number;
  y: number;
  hand: HandKind;
  /** Tween: from → to over ms. */
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t: number;
  ms: number;
}

interface Card {
  n: 1 | 2;
  x: number;
  y: number;
  /** 'slot': sticking out of ダコク; 'slide': on its way to (tx,ty); 'desk': lying there. */
  state: 'slot' | 'slide' | 'desk';
  fx: number;
  fy: number;
  tx: number;
  ty: number;
  t: number;
  /** In ツガオ's hand (moves with the left wrist). */
  held: boolean;
}

/** Where each card comes to rest in the lamplight, and where 「並べる」 puts them. */
const CARD_LAND: Record<1 | 2, [number, number]> = { 1: [134, 126], 2: [117, 129] };
const CARD_NEAT: Record<1 | 2, [number, number]> = { 1: [136, 126], 2: [104, 126] };
const REST: Record<Side, [number, number]> = { L: [171, 121], R: [213, 121] };
/** The shoulders (where the sleeves start), before leaning. */
const SHOULDER: Record<Side, [number, number]> = { L: [165, 102], R: [219, 102] };
/** The head's top-left (before leaning). */
const HEAD_AT = { x: 181, y: 63 };

class TsugaoRoomScene implements Scene {
  transparent = false;
  done = false;
  t = 0;
  /** Black over everything (1: black). */
  fade = 1;
  lamp = true;
  lampOffT = -1;
  lean = 0;
  private leanFrom = 0;
  private leanTo = 0;
  private leanT = 1;
  private leanMs = 1;
  arms: Record<Side, Arm> = {
    L: { x: REST.L[0], y: REST.L[1], hand: 'rest', fx: 0, fy: 0, tx: REST.L[0], ty: REST.L[1], t: 1, ms: 1 },
    R: { x: REST.R[0], y: REST.R[1], hand: 'rest', fx: 0, fy: 0, tx: REST.R[0], ty: REST.R[1], t: 1, ms: 1 },
  };
  /** Where the nightcap is. 'on' frames: 0 lifted over the head, 1 half on, 2 on. */
  cap: 'hook' | 'hand' | 'on' = 'hook';
  capFrame = 2;
  cards: Card[] = [];
  page: 0 | 1 = 0;
  /** −1, or the page-turn frame 0..2 being shown over the board. */
  flip = -1;
  stampIn: 'rest' | 'hand' | 'face' = 'rest';
  /** The stamp's face coming at us: frame 0..2 (−1 none). */
  faceFrame = -1;
  /** ms since the print hit the screen (−1: none). */
  printT = -1;
  // clocks
  running: Record<'yunari' | 'hoshimi', number> = { yunari: -1, hoshimi: -1 };
  private hoshiMinute = 59;
  shimmerT = -1;
  // ダコク
  private sinkT = -1;
  private talking = false;
  private speechKey = '';
  private gaSeen = 0;
  private armed: 0 | 1 | 2 = 0;
  private words: { word: string; fn: () => void; voice?: string }[] = [];
  skippable = false;
  skipRequested = false;
  /** QA stills: the print stays. */
  freezePrint = false;

  update(dt: number): void {
    this.t += dt;
    if (this.lampOffT >= 0) this.lampOffT += dt;
    if (this.printT >= 0 && !this.freezePrint) this.printT += dt;
    if (this.shimmerT >= 0) this.shimmerT += dt;
    for (const k of ['yunari', 'hoshimi'] as const) if (this.running[k] >= 0) this.running[k] += dt;
    if (this.sinkT >= 0) this.sinkT += dt;
    // lean
    if (this.leanT < this.leanMs) {
      this.leanT = Math.min(this.leanMs, this.leanT + dt);
      this.lean = this.leanFrom + (this.leanTo - this.leanFrom) * ease.cubicInOut(this.leanT / this.leanMs);
    }
    // arms
    for (const s of ['L', 'R'] as Side[]) {
      const a = this.arms[s];
      if (a.t < a.ms) {
        a.t = Math.min(a.ms, a.t + dt);
        const k = ease.cubicInOut(a.t / a.ms);
        a.x = a.fx + (a.tx - a.fx) * k;
        a.y = a.fy + (a.ty - a.fy) * k;
      }
    }
    // cards
    for (const c of this.cards) {
      if (c.held) {
        c.x = this.arms.L.x - 14;
        c.y = this.arms.L.y + 5;
        continue;
      }
      if (c.state === 'slot') {
        c.t += dt;
        // out of the slot 4px (0.12 s), then a beat, then off across the desk
        c.y = c.fy + Math.min(4, (c.t / 120) * 4);
        if (c.t > 420) {
          c.state = 'slide';
          c.fx = c.x;
          c.fy = c.y;
          c.t = 0;
          sfx('se_dakoku', { vol: 0.6 });
        }
      } else if (c.state === 'slide') {
        c.t += dt;
        const k = Math.min(1, c.t / 700);
        // it drops onto the desk first, then glides, slowing into the light
        const drop = Math.min(1, c.t / 140);
        c.x = c.fx + (c.tx - c.fx) * ease.cubicOut(k);
        c.y = c.fy + (c.ty - c.fy) * (0.35 * drop + 0.65 * ease.cubicOut(k));
        if (k >= 1) c.state = 'desk';
      }
    }
    this.watchSpeech();
  }

  /** ダコク moves with its words; lines can trigger moves (「マダ」 stops ツガオ's hand). */
  private watchSpeech(): void {
    const sp = dialogSpeech();
    this.talking = !!sp && sp.voice === 'dakoku' && sp.typing;
    if (!sp) return;
    const key = `${sp.voice}|${sp.page}|${sp.text.slice(0, 4)}`;
    if (key !== this.speechKey || sp.text.length < this.gaSeenLen) {
      this.speechKey = key;
      this.gaSeen = 0;
    }
    this.gaSeenLen = sp.text.length;
    if (sp.voice === 'dakoku') {
      const n = sp.text.split('ガチャン').length - 1 + (sp.text.endsWith('ガ') || sp.text.endsWith('ガチ') || sp.text.endsWith('ガチャ') ? 1 : 0);
      if (n > this.gaSeen) {
        this.gaSeen = n;
        this.gachan();
      }
    }
    for (const w of this.words.slice()) {
      if ((w.voice && w.voice !== sp.voice) || !sp.text.includes(w.word)) continue;
      this.words.splice(this.words.indexOf(w), 1);
      w.fn();
    }
  }
  private gaSeenLen = 0;

  /** ガチャン: the box sinks 2px; the armed card comes out of the slot. */
  gachan(): void {
    this.sinkT = 0;
    if (this.armed) {
      const n = this.armed;
      this.armed = 0;
      const sx = DAKOKU.x + 6;
      const sy = DAKOKU.y + 19;
      const [tx, ty] = CARD_LAND[n];
      this.cards.push({ n, x: sx, y: sy, state: 'slot', fx: sx, fy: sy, tx, ty, t: 0, held: false });
    }
  }

  arm(n: 1 | 2): void {
    this.armed = n;
  }

  onWord(word: string, fn: () => void, voice?: string): void {
    this.words.push({ word, fn, voice });
  }

  moveArm(s: Side, x: number, y: number, ms: number, hand?: HandKind): void {
    const a = this.arms[s];
    a.fx = a.x;
    a.fy = a.y;
    a.tx = x;
    a.ty = y;
    a.t = 0;
    a.ms = Math.max(1, ms);
    if (hand) a.hand = hand;
  }

  stopArm(s: Side): void {
    const a = this.arms[s];
    a.tx = a.x;
    a.ty = a.y;
    a.t = a.ms;
  }

  armDone(s: Side): boolean {
    return this.arms[s].t >= this.arms[s].ms;
  }

  leanTo_(v: number, ms: number): void {
    this.leanFrom = this.lean;
    this.leanTo = v;
    this.leanT = 0;
    this.leanMs = Math.max(1, ms);
  }

  get leanDone(): boolean {
    return this.leanT >= this.leanMs;
  }

  setHoshiMinute(m: number): void {
    this.hoshiMinute = m;
  }

  // ---- drawing

  draw(g: Gfx): void {
    const a = getArt();
    if (!this.lamp) {
      g.clear(P.K);
      // the clocks' outlines stay in the eye for half a second, then nothing
      if (this.lampOffT < 520) {
        const k = this.lampOffT < 380 ? 1 : 1 - (this.lampOffT - 380) / 140;
        g.alpha(0.55 * k, () => {
          for (const id of Object.keys(CLOCKS) as ClockId[]) g.ring(CLOCKS[id].x, CLOCKS[id].y, 11, P.G);
        });
      }
      this.drawPrint(g);
      return;
    }
    g.img(a.back, 0, 0);
    this.drawClocks(g, a);
    if (this.cap === 'hook') g.img(a.capHang, HOOK.x - 6, HOOK.y - 2);
    this.drawTsugao(g, a);
    g.img(a.front, 0, 0);
    this.drawDeskThings(g, a);
    this.drawArms(g, a);
    g.img(a.light, 0, 0);
    this.drawDakoku(g, a);
    this.drawFace(g, a);
    this.drawPrint(g);
    if (this.fade > 0) g.rect(0, 0, 384, 216, P.K, this.fade);
  }

  private drawClocks(g: Gfx, a: Art): void {
    for (const id of Object.keys(CLOCKS) as ClockId[]) {
      const c = CLOCKS[id];
      g.img(a.faces[id], c.x - 10, c.y - 10);
      g.img(a.plates[id], c.x - 14, c.y + 14);
      // hands: 夕鳴町 5:00, 星見台 4:59 (→ 5:00), 海ぞいの町 12:00 (both on the 12)
      let hh: number;
      let mm: number;
      if (id === 'yunari') {
        hh = 5;
        mm = 0;
      } else if (id === 'hoshimi') {
        // the long hand steps onto the 12 with a little overshoot (80 ms)
        const run = this.running.hoshimi;
        mm = this.hoshiMinute + (run >= 0 && run < 80 ? 0.7 : 0);
        hh = 4 + mm / 60;
      } else {
        hh = 0;
        mm = 0;
      }
      const hand = (ang: number, len: number, col: string, thick = false) => {
        const ex = c.x + Math.sin(ang) * len;
        const ey = c.y - Math.cos(ang) * len;
        g.line(c.x, c.y, ex, ey, col);
        if (thick) {
          // a second stroke beside it: the hour hand is 2px wide
          const vert = Math.abs(Math.cos(ang)) > Math.abs(Math.sin(ang));
          g.line(c.x + (vert ? 1 : 0), c.y + (vert ? 0 : 1), ex + (vert ? 1 : 0), ey + (vert ? 0 : 1), col);
        }
      };
      hand(((hh % 12) / 12) * Math.PI * 2, 5, P.K, true);
      hand((mm / 60) * Math.PI * 2, 8, P.K);
      if (id !== 'umi') {
        const run = this.running[id];
        const sec = secondsHand(id, run);
        hand((sec / 60) * Math.PI * 2, 8, P.D);
      }
      g.rect(c.x, c.y, 1, 1, P.G);
      if (id === 'umi' && this.shimmerT >= 0 && this.shimmerT < 1100) {
        // the sea's colour runs once round the dial (chapter 3's town)
        const k = this.shimmerT / 1000;
        for (let i = 0; i < 9; i++) {
          const ang = (k - i * 0.02) * Math.PI * 2;
          if (k - i * 0.02 < 0 || k - i * 0.02 > 1) continue;
          g.px(Math.round(c.x + Math.sin(ang) * 11.4), Math.round(c.y - Math.cos(ang) * 11.4), P.A);
          if (i === 0) g.alpha(0.5, () => g.px(Math.round(c.x + Math.sin(ang) * 12.4), Math.round(c.y - Math.cos(ang) * 12.4), P.A));
        }
      }
    }
  }

  private drawTsugao(g: Gfx, a: Art): void {
    const ly = -Math.round(this.lean);
    g.img(a.torso, TORSO.x, TORSO.y + ly);
    g.img(a.head, HEAD_AT.x, HEAD_AT.y + ly);
    if (this.cap === 'on') {
      // lifted over the head → half on → on (the flat top's square becomes the cap's triangle)
      const dy = [-9, -4, 0][this.capFrame];
      g.img(a.capWorn, HEAD_AT.x - 1, HEAD_AT.y - 11 + dy + ly);
    }
  }

  private drawDeskThings(g: Gfx, a: Art): void {
    // the circular in front of him
    g.img(a.boards[this.page], BOARD.x, BOARD.y);
    if (this.flip >= 0) {
      const f = a.flips[this.flip];
      g.img(f, BOARD.x, BOARD.y - f.height + (this.flip === 2 ? 0 : 3));
    }
    // the stamp in its place
    if (this.stampIn === 'rest') g.img(a.stamp, STAMP_REST.x, STAMP_REST.y);
    // cards lying on the desk (and the ones on their way)
    for (const c of this.cards) {
      if (c.state === 'slot') continue;
      g.img(a.cards[c.n - 1], Math.round(c.x), Math.round(c.y));
    }
  }

  private drawArms(g: Gfx, a: Art): void {
    const ly = -Math.round(this.lean);
    for (const s of ['L', 'R'] as Side[]) {
      const arm = this.arms[s];
      const [sx, sy] = SHOULDER[s];
      const wx = Math.round(arm.x);
      const wy = Math.round(arm.y);
      sleeve(g, sx, sy + ly, wx, wy, s === 'L');
      const flip = s === 'R';
      if (s === 'L' && this.cap === 'hand') g.img(a.capHang, wx - 6, wy + 3);
      const img = a.hands[arm.hand + (flip ? 'F' : '')];
      const hx = arm.hand === 'open' ? wx - 5 : wx - 6;
      const hy = arm.hand === 'open' ? wy - 7 : wy;
      g.img(img, hx, hy);
      if (s === 'R' && this.stampIn === 'hand') g.img(a.stamp, wx - 5, wy - 6);
    }
    // a card held under the left hand goes over the hand's shadow side
    for (const c of this.cards) if (c.held) g.img(a.cards[c.n - 1], Math.round(c.x), Math.round(c.y));
    if (this.cards.some((c) => c.held)) {
      const arm = this.arms.L;
      g.img(a.hands[arm.hand], Math.round(arm.x) - 6, Math.round(arm.y));
    }
  }

  private drawDakoku(g: Gfx, a: Art): void {
    const x = DAKOKU.x;
    const y = DAKOKU.y;
    // the box bobs a pixel while it talks; at ガチャン it sinks 2px and comes back
    let dy = this.talking && Math.floor(this.t / 110) % 2 ? -1 : 0;
    if (this.sinkT >= 0 && this.sinkT < 260) dy = this.sinkT < 60 ? 1 : this.sinkT < 180 ? 2 : 1;
    const legTop = y + 22 + dy;
    const foot = y + 28;
    // thin legs (they bend when the box sinks)
    for (const lx of [x + 6, x + 17]) {
      for (let yy = legTop; yy < foot; yy++) g.px(lx + (dy > 0 && yy === legTop + 2 ? (lx < x + 12 ? -1 : 1) : 0), yy, P.N);
      g.rect(lx - 1, foot - 1, 3, 1, P.K);
    }
    // its shadow on the desk
    g.rect(x + 2, foot, 20, 1, P.K, 0.5);
    // a card sticking out of the slot (drawn under the box's lip)
    for (const c of this.cards) if (c.state === 'slot') g.img(a.cards[c.n - 1], Math.round(c.x), Math.round(c.y) + dy, { sh: Math.min(18, Math.max(1, Math.round(c.y - c.fy) + 2)) });
    g.img(a.box, x, y + dy);
  }

  private drawFace(g: Gfx, a: Art): void {
    if (this.faceFrame < 0) return;
    const f = a.faces3[this.faceFrame];
    g.img(f, 192 - Math.round(f.width / 2), 108 - Math.round(f.height / 2));
  }

  private drawPrint(g: Gfx): void {
    if (this.printT < 0 || this.printT > 700) return;
    const a = getArt();
    const k = this.printT < 100 ? 1 : Math.max(0, 1 - (this.printT - 100) / 600);
    g.img(a.print, 192 - Math.round(a.print.width / 2), 108 - Math.round(a.print.height / 2), { alpha: k });
  }
}

/** 夕鳴町 stopped at :40 and 星見台 at :20, they start with three uneven ticks (0 / 1.3 / 2.25 / 3.25 s), then once a second. */
function secondsHand(id: 'yunari' | 'hoshimi', run: number): number {
  const s0 = id === 'yunari' ? 40 : 20;
  if (run < 0) return s0;
  const ticks = [0, 1300, 2250, 3250];
  let n = 0;
  for (const t of ticks) if (run >= t) n++;
  if (run > 3250) n += Math.floor((run - 3250) / 1000);
  return (s0 + n) % 60;
}

/** A sleeve from the shoulder to the wrist: charcoal, lit on the lamp's side, a white cuff edge. */
function sleeve(g: Gfx, sx: number, sy: number, wx: number, wy: number, lampSide: boolean): void {
  const dx = wx - sx;
  const dy = wy - sy;
  const len = Math.max(1, Math.hypot(dx, dy));
  const nx = -dy / len;
  const ny = dx / len;
  const w0 = 5;
  const w1 = 4;
  const pts: [number, number][] = [
    [sx + nx * w0, sy + ny * w0],
    [wx + nx * w1, wy + ny * w1],
    [wx - nx * w1, wy - ny * w1],
    [sx - nx * w0, sy - ny * w0],
  ];
  fillPoly(g, pts, P.D);
  // the edges: the side toward the lamp catches it, the other falls away
  const litSign = lampSide ? (nx < 0 ? 1 : -1) : nx < 0 ? 1 : -1;
  g.line(sx + nx * w0 * litSign, sy + ny * w0 * litSign, wx + nx * w1 * litSign, wy + ny * w1 * litSign, P.G);
  g.line(sx - nx * w0 * litSign, sy - ny * w0 * litSign, wx - nx * w1 * litSign, wy - ny * w1 * litSign, P.N);
  // a crease across the elbow's bend
  const mx = sx + dx * 0.55;
  const my = sy + dy * 0.55;
  g.line(mx - nx * 2, my - ny * 2, mx + nx * 2, my + ny * 2, P.N);
}

/** Crisp scanline fill of a convex polygon. */
function fillPoly(g: Gfx, pts: [number, number][], color: string): void {
  let y0 = Infinity;
  let y1 = -Infinity;
  for (const [, y] of pts) {
    y0 = Math.min(y0, y);
    y1 = Math.max(y1, y);
  }
  for (let y = Math.floor(y0); y <= Math.ceil(y1); y++) {
    const yc = y + 0.5;
    let xa = Infinity;
    let xb = -Infinity;
    for (let i = 0; i < pts.length; i++) {
      const [ax, ay] = pts[i];
      const [bx, by] = pts[(i + 1) % pts.length];
      if ((ay <= yc && by > yc) || (by <= yc && ay > yc)) {
        const x = ax + ((yc - ay) / (by - ay)) * (bx - ax);
        xa = Math.min(xa, x);
        xb = Math.max(xb, x);
      }
    }
    if (xa < xb) g.rect(Math.round(xa), y, Math.max(1, Math.round(xb) - Math.round(xa)), 1, color);
  }
}

// ---- the controller -----------------------------------------------------------------------------

export interface TsugaoRoom {
  /** Out of the black (default 1.5 s). */
  fadeIn(ms?: number): Co;
  /** ダコク's next 「ガチャン」 spits out this report card (it slides into the lamplight). */
  armCard(n: 1 | 2): void;
  /** Wait until the last card that came out lies on the desk. */
  cardsLanded(): Co;
  /** A wall clock's second hand starts (星見台: first the minute hand steps 4:59 → 5:00). */
  clockRun(id: 'yunari' | 'hoshimi'): void;
  /** ① One finger taps the first card. */
  tapCard(): Co;
  /** ② He leans back in the chair (2px). */
  leanBack(): Co;
  /** ② Reaches for the nightcap on the stand and takes it (it starts toward his head). */
  reachCap(): Co;
  /** When `word` shows in the line being said (e.g. 'マダ'), his hand stops where it is. */
  stopAt(word: string): void;
  /** Puts the cap back on its hook and sits up again. */
  putCapBack(): Co;
  /** ③ Lays the two cards side by side. */
  arrangeCards(): Co;
  /** ④ Turns the circular's page to 「海ぞいの 町」 (the sea's shimmer runs round its clock). */
  turnPage(): Co;
  /** ⑤ Inks the black stamp and presses it on the screen: half a 「ま」, the ink run out. */
  stamp(): Co;
  /** ⑥ Puts the nightcap on (the flat top becomes the cap's triangle). */
  capOn(): Co;
  /** ⑦ The lamp goes out; the clocks' outlines stay half a second, then black. */
  lampOff(): Co;
  /** Take the room down (the caller has the screen black by then). */
  close(): void;
  /** X was pressed (only when opened skippable). */
  readonly skipRequested: boolean;
}

/**
 * 「X：とばす」 (the second time on): a widget that isn't modal, so it hears
 * X even while a line is up (the dialog, the modal one, takes the keys from
 * the scenes). The hint sits in the top-right corner, faint.
 */
class SkipWatch implements Widget {
  modal = false;
  done = false;
  private t = 0;
  constructor(private readonly sc: TsugaoRoomScene) {}
  update(dt: number, input: Input): void {
    this.t += dt;
    if (input.pressed('cancel')) this.sc.skipRequested = true;
  }
  draw(g: Gfx): void {
    const k = Math.min(1, Math.max(0, this.t - 1500) / 600);
    if (k > 0) g.text('X：とばす', 378, 2, { color: P.W, align: 'right', alpha: 0.45 * k });
  }
}

/** Push the room (black, until fadeIn). `skippable` shows 「X：とばす」 and listens for it. */
export function* openTsugaoRoom(o: { skippable?: boolean } = {}): Co<TsugaoRoom> {
  getArt();
  const sc = new TsugaoRoomScene();
  sc.skippable = !!o.skippable;
  game.push(sc);
  // the room starts black itself: a black global fade left by the caller is taken over
  game.fadeAlpha = 0;
  const watch = o.skippable ? new SkipWatch(sc) : null;
  if (watch) game.ui.push(watch);
  yield null;
  const R = sc;
  const room: TsugaoRoom = {
    *fadeIn(ms = 1500): Co {
      for (let t = 0; t < ms; t += 16.7) {
        R.fade = 1 - ease.sineInOut(t / ms);
        yield null;
      }
      R.fade = 0;
    },
    armCard(n) {
      R.arm(n);
    },
    *cardsLanded(): Co {
      yield () => R.cards.every((c) => c.state === 'desk');
    },
    clockRun(id) {
      if (id === 'hoshimi') {
        R.setHoshiMinute(60);
        R.running.hoshimi = 0;
        return;
      }
      R.running.yunari = 0;
    },
    *tapCard(): Co {
      const c = R.cards.find((k) => k.n === 1);
      const [cx, cy] = c ? [c.x + 14, c.y + 8] : CARD_LAND[1];
      R.moveArm('L', cx - 2, cy - 11, 420, 'point');
      yield () => R.armDone('L');
      R.moveArm('L', cx - 2, cy - 9, 90);
      yield () => R.armDone('L');
      yield 160;
      R.moveArm('L', cx - 2, cy - 11, 120);
      yield () => R.armDone('L');
      yield 120;
      R.moveArm('L', REST.L[0], REST.L[1], 380, 'rest');
      yield () => R.armDone('L');
    },
    *leanBack(): Co {
      R.leanTo_(2, 700);
      R.moveArm('L', REST.L[0] - 1, REST.L[1] - 1, 700);
      R.moveArm('R', REST.R[0] + 1, REST.R[1] - 1, 700);
      yield () => R.leanDone;
    },
    *reachCap(): Co {
      R.moveArm('L', HOOK.x, HOOK.y + 6, 700, 'open');
      yield () => R.armDone('L');
      yield 150;
      R.cap = 'hand';
      R.arms.L.hand = 'grip';
      R.moveArm('L', HOOK.x, HOOK.y - 5, 1);
      yield 100;
      // lifted off the hook, then on toward the head, slowly (a line can stop it: stopAt)
      R.moveArm('L', HOOK.x + 4, HOOK.y - 9, 250);
      yield 250;
      R.moveArm('L', 168, 44, 1500);
    },
    stopAt(word) {
      R.onWord(word, () => R.stopArm('L'));
    },
    *putCapBack(): Co {
      R.moveArm('L', HOOK.x, HOOK.y - 5, 600, 'grip');
      yield () => R.armDone('L');
      R.cap = 'hook';
      R.arms.L.hand = 'open';
      yield 120;
      R.moveArm('L', REST.L[0], REST.L[1], 600, 'rest');
      R.leanTo_(0, 600);
      R.moveArm('R', REST.R[0], REST.R[1], 600);
      yield () => R.armDone('L') && R.leanDone;
    },
    *arrangeCards(): Co {
      const c2 = R.cards.find((k) => k.n === 2);
      const c1 = R.cards.find((k) => k.n === 1);
      if (c2) {
        R.moveArm('L', c2.x + 14, c2.y - 5, 450, 'rest');
        yield () => R.armDone('L');
        c2.held = true;
        const [tx, ty] = CARD_NEAT[2];
        R.moveArm('L', tx + 14, ty - 5, 500);
        yield () => R.armDone('L');
        c2.held = false;
        c2.x = tx;
        c2.y = ty;
      }
      if (c1) {
        R.moveArm('L', c1.x + 12, c1.y - 5, 300);
        yield () => R.armDone('L');
        c1.held = true;
        const [tx, ty] = CARD_NEAT[1];
        R.moveArm('L', tx + 14, ty - 5, 260);
        yield () => R.armDone('L');
        c1.held = false;
        c1.x = tx;
        c1.y = ty;
      }
      R.moveArm('L', REST.L[0], REST.L[1], 420, 'rest');
      yield () => R.armDone('L');
    },
    *turnPage(): Co {
      R.moveArm('R', BOARD.x + BOARD.w - 3, BOARD.y + 14, 420, 'grip');
      yield () => R.armDone('R');
      sfx('se_page');
      R.flip = 0;
      R.moveArm('R', BOARD.x + BOARD.w - 5, BOARD.y + 2, 120);
      yield 120;
      R.flip = 1;
      R.page = 1;
      R.moveArm('R', BOARD.x + BOARD.w - 8, BOARD.y - 8, 120);
      yield 120;
      R.flip = 2;
      yield 160;
      R.moveArm('R', REST.R[0], REST.R[1], 420, 'rest');
      yield 300;
      R.shimmerT = 0;
      yield () => R.armDone('R');
    },
    *stamp(): Co {
      // the stamp from its place → the ink pad (pressed twice) → at us
      R.moveArm('R', STAMP_REST.x + 5, STAMP_REST.y + 6, 380, 'grip');
      yield () => R.armDone('R');
      R.stampIn = 'hand';
      R.moveArm('R', 236, 116, 320);
      yield () => R.armDone('R');
      for (let i = 0; i < 2; i++) {
        R.moveArm('R', 236, 119, 90);
        yield 130;
        R.moveArm('R', 236, 115, 110);
        yield 150;
      }
      R.moveArm('R', 214, 100, 260);
      yield 260;
      R.stampIn = 'face';
      R.arms.R.hand = 'rest';
      R.moveArm('R', REST.R[0], REST.R[1], 1);
      for (let f = 0; f < 3; f++) {
        R.faceFrame = f;
        yield 50;
      }
      sfx('se_mada_stamp');
      R.faceFrame = -1;
      R.printT = 0;
      game.hitstop(67);
      yield 110;
      R.stampIn = 'rest';
      yield () => R.printT > 700;
    },
    *capOn(): Co {
      R.moveArm('L', HOOK.x, HOOK.y + 6, 650, 'open');
      yield () => R.armDone('L');
      yield 120;
      R.cap = 'hand';
      R.arms.L.hand = 'grip';
      R.moveArm('L', HOOK.x, HOOK.y - 5, 1);
      yield 100;
      R.moveArm('L', HOOK.x + 4, HOOK.y - 9, 250);
      yield 250;
      // up over his head, then pulled down on (3 frames)
      R.moveArm('L', HEAD_AT.x + 10, HEAD_AT.y - 22, 800);
      yield () => R.armDone('L');
      R.cap = 'on';
      for (let f = 0; f < 3; f++) {
        R.capFrame = f;
        R.moveArm('L', HEAD_AT.x + 10, HEAD_AT.y - 17 + f * 4, 60);
        yield 80;
      }
      yield 300;
      R.moveArm('L', REST.L[0], REST.L[1], 650, 'rest');
      yield () => R.armDone('L');
    },
    *lampOff(): Co {
      sfx('se_lamp_click');
      R.lamp = false;
      R.lampOffT = 0;
      yield 560;
    },
    close() {
      if (watch) watch.done = true;
      const i = game.scenes.indexOf(R);
      if (i >= 0) game.scenes.splice(i, 1);
      R.done = true;
    },
    get skipRequested() {
      return R.skipRequested;
    },
  };
  return room;
}

// ---- カット7 with its lines (50_ch2_story 10.16) -------------------------------------------------

/** QA only: pages turn by themselves after this long. */
let autoMs: number | undefined;
/** QA: the lines of カット7 turn their pages by themselves (`ms` after each; 0: off). */
export function setTsugaoAuto(ms: number): void {
  autoMs = ms > 0 ? ms : undefined;
}
const DAKOKU_SPK = { name: 'ダコク', voice: 'dakoku', get auto() { return autoMs; } };
const ANON = { name: '？？？', voice: 'tsugao', get auto() { return autoMs; } };
const TSUGAO = { name: 'ツガオ', voice: 'tsugao', get auto() { return autoMs; } };

export const TSUGAO_LINES = {
  report: ['ツガオ ダンチョウ。{w=300}\nゴホウコク シマス。{w=300}ガチャン。'],
  yunari: ['ユウナリチョウ、17ジ。{w=300}\n『オカエリナサイ』ヲ\nオサレマシタ。ガチャン。'],
  sleep: ['……ふむ。{w=300}\nご苦労。', 'では、つがおちゃん 寝る〜♪'],
  more: ['ダンチョウ。{w=300}\nマダ ホウコクガ アリマス。\nガチャン。'],
  hoshimi: ['ホシミダイ、4ジ59フン。{w=300}\n『オヤスミナサイ』ヲ\nオサレマシタ。ガチャン。'],
  mada: [
    '夕鳴町と 星見台。{w=300}\nどちらも、赤い ハンコ。\n……偶然では ありませんな。',
    'あの 子らの 気持ちは、\nはじめから あった ものです。\n{w=300}わたしは『まだ』を 押しただけ。',
    'まだ 来ない。{w=300}まだ 朝じゃない。\n……『まだ』の うちは、\n今日は 終わらない。',
    '止まった 時間は、休みの 貯金。\n{w=300}ためて おけば、ずっと\n休んで いられるのでね。',
  ],
  next: ['次は、海ぞいの 町。{w=300}\nあそこは、まだ 正午です。', '……念のため、もう 1回。'],
  ink: ['……インクが、切れて おりますな。', 'まあ、よろしい。{w=300}\nつがおちゃん 寝る〜♪'],
  off: ['タイキン、ダコク シマス。{w=300}\nガチャン。'],
};

function* director(room: TsugaoRoom): Co {
  // 黒のまま 1.0秒。時計の「チッ……」が1つ
  yield 1000;
  sfx('se_clock_tick');
  yield 700;
  setSpace('room');
  playAmbient('amb_tsugao_room', { fade: 1.5 });
  playBgm('bgm_tsugao', { fade: 2.0 });
  yield* room.fadeIn(1500);
  yield 700;
  room.armCard(1);
  yield* say(TSUGAO_LINES.report, DAKOKU_SPK);
  yield* room.cardsLanded();
  yield* say(TSUGAO_LINES.yunari, DAKOKU_SPK);
  room.clockRun('yunari');
  sfx('se_clock_restart');
  ambientEvent('amb_tsugao_room', 'tick', 'yunari');
  yield 900;
  yield* room.tapCard();
  yield* room.leanBack();
  yield* say(TSUGAO_LINES.sleep, ANON);
  yield* room.reachCap();
  room.armCard(2);
  room.stopAt('マダ');
  yield* say(TSUGAO_LINES.more, DAKOKU_SPK);
  yield* room.putCapBack();
  yield* room.cardsLanded();
  yield* say(TSUGAO_LINES.hoshimi, DAKOKU_SPK);
  room.clockRun('hoshimi');
  sfx('se_clock_restart', { note: 'hoshimi' });
  ambientEvent('amb_tsugao_room', 'tick', 'hoshimi');
  yield 900;
  yield* room.arrangeCards();
  yield 2000;
  yield* say(TSUGAO_LINES.mada, ANON);
  // the name tag becomes 「ツガオ」
  sfx('se_pen_write', { vol: 0.5, pitch: 0.8 });
  yield 180;
  sfx('se_pen_write', { vol: 0.5, pitch: 0.8 });
  yield 300;
  yield* room.turnPage();
  stopBgm(0);
  ambientEvent('amb_tsugao_room', 'umi');
  yield 500;
  yield* say(TSUGAO_LINES.next, TSUGAO);
  yield* room.stamp();
  yield 300;
  yield* say(TSUGAO_LINES.ink, TSUGAO);
  yield* room.capOn();
  yield 400;
  yield* room.lampOff();
  stopAmbient('amb_tsugao_room', 0.5);
  yield 300;
  yield* say(TSUGAO_LINES.off, DAKOKU_SPK);
  // 暗転。無音 1.5秒
  yield 1500;
}

/**
 * カット7「ツガオの部屋」 in one go (about 55 s): the lines of 50 10.16, the
 * moves of 52 12.5, the sounds of 53 12.14. `skippable` (from the second
 * time: the chapter 2 clear record was there before this ending): X
 * leaves it at once. Ends on black, the room taken down.
 */
export function* playTsugaoRoom(o: { skippable?: boolean; auto?: number } = {}): Co {
  if (o.auto !== undefined) autoMs = o.auto || undefined;
  const space = currentSpace();
  const room = yield* openTsugaoRoom({ skippable: o.skippable });
  const task = game.scripts.run(director(room));
  yield () => task.done || room.skipRequested;
  if (!task.done) {
    task.cancel();
    dismissDialog();
    stopBgm(0.3);
    stopAllAmbient(0.3);
    yield 300;
  }
  room.close();
  // the office's small room reverb doesn't follow into the title
  setSpace(space);
}

/**
 * QA: a still of the room — 0 the start, 1 both cards on the desk and both
 * clocks going, 2 the nightcap on (the page turned), 3 the instant the lamp
 * goes out.
 */
export function tsugaoStill(phase: 0 | 1 | 2 | 3 | 4 | 5): Scene {
  getArt();
  const sc = new TsugaoRoomScene();
  sc.fade = 0;
  if (phase >= 1) {
    sc.cards.push({ n: 1, x: CARD_NEAT[1][0], y: CARD_NEAT[1][1], state: 'desk', fx: 0, fy: 0, tx: 0, ty: 0, t: 0, held: false });
    sc.cards.push({ n: 2, x: CARD_NEAT[2][0], y: CARD_NEAT[2][1], state: 'desk', fx: 0, fy: 0, tx: 0, ty: 0, t: 0, held: false });
    sc.running.yunari = 12000;
    sc.running.hoshimi = 5000;
    sc.setHoshiMinute(60);
  }
  if (phase >= 2) {
    sc.page = 1;
    sc.flip = 2;
    sc.cap = 'on';
    sc.capFrame = 2;
  }
  if (phase === 3) {
    sc.lamp = false;
    sc.lampOffT = 100;
  }
  if (phase === 4) sc.faceFrame = 2;
  if (phase === 5) {
    sc.printT = 0;
    sc.freezePrint = true;
  }
  return sc;
}
