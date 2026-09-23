// ハンコの浮かびあがり (18.5): the wooden hanko case opens, a vermilion light
// runs around its frame, and the new seal's imprint rises in an empty slot.
// Works inside a battle (overlay) and from field events (playHankoLearn).

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { makeCanvas, PixelCanvas } from '../engine/pixel';
import { hash2 } from '../engine/rng';
import { ease } from '../engine/tween';
import { sfx } from '../audio';
import { fillAll, getSkill, HANKO_CASE_ORDER, SYS } from '../data/battle';
import { state } from '../game/state';
import type { BattleScene } from './scene';
import { hanamaruFrame, ovalStamp, pekeMark } from './art/stamps';
import { MessageBand } from './ui/message';

const CX = 112;
const CY = 56;
const CW = 160;
const CH = 104;

let caseC: HTMLCanvasElement | null = null;
let lidC: HTMLCanvasElement | null = null;

/** Wooden case body with red velvet lining and 8 slots (4×2, 32×32). */
function caseBody(): HTMLCanvasElement {
  if (caseC) return caseC;
  const p = new PixelCanvas(CW, CH);
  const wood = ['#6A4A2A', '#8A5A2A', '#A8742A', '#C08A38', '#D9A441'];
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const grain = Math.sin(y * 0.9 + Math.sin(x * 0.07) * 3 + hash2(x >> 3, y >> 1, 4) * 1.2);
      let v = 0.55 + grain * 0.12 - (x / CW) * 0.18 - (y / CH) * 0.1;
      if (y < 2 || x < 2) v += 0.25;
      if (y > CH - 3 || x > CW - 3) v -= 0.25;
      const idx = Math.max(0, Math.min(4, Math.floor(v * 5)));
      p.set(x, y, wood[idx]);
    }
  // velvet lining
  const vel = ['#4A1620', '#6A1E28', '#8A2E3A', '#A8404C'];
  for (let y = 8; y < CH - 8; y++)
    for (let x = 8; x < CW - 8; x++) {
      const n = hash2(x, y, 9);
      const v = 0.55 - ((x - 8) / (CW - 16)) * 0.15 + (n - 0.5) * 0.2;
      p.set(x, y, vel[Math.max(0, Math.min(3, Math.floor(v * 4)))]);
    }
  // slots: 4 × 2, 32×32 recesses
  for (let j = 0; j < 2; j++)
    for (let i = 0; i < 4; i++) {
      const sx = 12 + i * 36;
      const sy = 14 + j * 42;
      p.rect(sx, sy, 32, 32, '#5A1822');
      p.hline(sx, sx + 31, sy, '#3A0E16');
      p.vline(sx, sy, sy + 31, '#3A0E16');
      p.hline(sx + 1, sx + 31, sy + 31, '#A8404C');
      p.vline(sx + 31, sy + 1, sy + 31, '#A8404C');
      for (let y = sy + 2; y < sy + 30; y++) for (let x = sx + 2; x < sx + 30; x++) if (hash2(x, y, 2) < 0.08) p.set(x, y, '#6A2230');
    }
  p.strokeRect(0, 0, CW, CH, '#2A2440');
  caseC = p.toCanvas();
  return caseC;
}

/** Closed lid with a brass clasp. */
function lid(): HTMLCanvasElement {
  if (lidC) return lidC;
  const p = new PixelCanvas(CW, CH);
  const wood = ['#6A4A2A', '#8A5A2A', '#A8742A', '#C08A38', '#D9A441'];
  for (let y = 0; y < CH; y++)
    for (let x = 0; x < CW; x++) {
      const grain = Math.sin(y * 0.8 + Math.sin(x * 0.05 + 1) * 4 + hash2(x >> 3, y >> 1, 7));
      let v = 0.6 + grain * 0.12 - (x / CW) * 0.2 - (y / CH) * 0.12;
      const inset = x > 10 && x < CW - 10 && y > 10 && y < CH - 10;
      if (inset && (x === 11 || y === 11)) v -= 0.25;
      if (inset && (x === CW - 11 || y === CH - 11)) v += 0.2;
      p.set(x, y, wood[Math.max(0, Math.min(4, Math.floor(v * 5)))]);
    }
  // brass clasp + a bell-crest inlay
  p.rect(CW / 2 - 8, CH - 12, 16, 10, '#A8742A');
  p.rect(CW / 2 - 7, CH - 11, 14, 8, '#D9A441');
  p.hline(CW / 2 - 6, CW / 2 + 5, CH - 10, '#F6D98A');
  p.rect(CW / 2 - 2, CH - 8, 4, 3, '#6A4A1A');
  p.ellipse(CW / 2, CH / 2 - 6, 12, 12, '#8A5A2A');
  p.ellipse(CW / 2, CH / 2 - 6, 10, 10, '#C08A38');
  p.poly([[CW / 2 - 6, CH / 2], [CW / 2 + 6, CH / 2], [CW / 2 + 4, CH / 2 - 12], [CW / 2 - 4, CH / 2 - 12]], '#D9A441');
  p.strokeRect(0, 0, CW, CH, '#2A2440');
  lidC = p.toCanvas();
  return lidC;
}

let arrowC: HTMLCanvasElement | null = null;
function undoImprint(): HTMLCanvasElement {
  if (arrowC) return arrowC;
  const [c, ctx] = makeCanvas(26, 26);
  ctx.fillStyle = '#E23B2E';
  for (let i = 0; i < 60; i++) {
    const a = -Math.PI / 2 - (i / 60) * Math.PI * 1.8;
    ctx.fillRect(Math.round(13 + Math.cos(a) * 9), Math.round(13 + Math.sin(a) * 9), 2, 2);
  }
  const ea = -Math.PI / 2 - Math.PI * 1.8;
  const ex = 13 + Math.cos(ea) * 9;
  const ey = 13 + Math.sin(ea) * 9;
  for (let k = 0; k < 4; k++) {
    ctx.fillRect(Math.round(ex - k), Math.round(ey - 3 + k), 2, 1);
    ctx.fillRect(Math.round(ex + k), Math.round(ey - 3 + k), 2, 1);
  }
  arrowC = c;
  return c;
}

/** Imprint of a hanko (for the case slots). */
export function imprint(skillId: string): HTMLCanvasElement | null {
  switch (skillId) {
    case 'skill_mimashita':
      return ovalStamp('みました', 28, 14, 0.05, 4);
    case 'skill_peke':
      return pekeMark(22, 1);
    case 'skill_hanamaru':
      return hanamaruFrame(26, 1, false, 2);
    case 'skill_yarinaoshi':
      return undoImprint();
    case 'skill_okaerinasai':
      return ovalStamp('おかえりなさい', 30, 20, 0, 6);
    default:
      return null;
  }
}

interface CaseState {
  t: number;
  rise: number;
  open: number;
  orbit: number;
  newAlpha: number;
  newScale: number;
  closing: number;
  owned: string[];
  skill: string;
}

function drawCase(g: Gfx, st: CaseState): void {
  g.rect(0, 0, 384, 216, '#0B0B14', 0.5 * Math.min(1, st.t / 150) * (1 - st.closing));
  const y = CY + Math.round((1 - st.rise) * 170) + Math.round(st.closing * 170);
  // drop shadow
  g.rect(CX + 3, y + 3, CW, CH, '#0B0B14', 0.5);
  g.img(caseBody(), CX, y);
  HANKO_CASE_ORDER.forEach((sk, i) => {
    if (i >= 8) return;
    const sx = CX + 12 + (i % 4) * 36;
    const sy = y + 14 + Math.floor(i / 4) * 42;
    const isNew = sk === st.skill;
    if (!st.owned.includes(sk) && !isNew) return;
    const img = imprint(sk);
    if (!img) return;
    const a = isNew ? st.newAlpha : 1;
    const sc = isNew ? st.newScale : 1;
    const w = img.width * sc;
    const h = img.height * sc;
    g.alpha(a, () => g.ctx.drawImage(img, Math.round(sx + 16 - w / 2), Math.round(sy + 16 - h / 2), Math.round(w), Math.round(h)));
    if (isNew && st.newAlpha > 0 && st.newAlpha < 1) g.alpha(0.5 * (1 - st.newAlpha), () => g.rect(sx + 2, sy + 2, 28, 28, '#FF6A4D'));
  });
  // orbiting vermilion light with a tail
  if (st.orbit > 0 && st.orbit < 1) {
    const per = 2 * (CW + CH);
    for (let k = 0; k < 14; k++) {
      let d = ((st.orbit * per - k * 3) % per + per) % per;
      let px: number;
      let py: number;
      if (d < CW) [px, py] = [CX + d, y];
      else if ((d -= CW) < CH) [px, py] = [CX + CW, y + d];
      else if ((d -= CH) < CW) [px, py] = [CX + CW - d, y + CH];
      else [px, py] = [CX, y + CH - (d - CW)];
      g.alpha(1 - k / 14, () => g.rect(Math.round(px) - 1, Math.round(py) - 1, 2, 2, k === 0 ? '#FFF6D8' : '#FF6A4D'));
    }
  }
  // lid: closed → half → open (flipped up behind)
  if (st.open < 1) {
    const l = lid();
    if (st.open <= 0) g.img(l, CX, y);
    else g.ctx.drawImage(l, 0, 0, CW, CH, CX, y, CW, Math.round(CH * (1 - st.open)));
  } else {
    // open lid seen edge-on above the case
    g.rect(CX, y - 6, CW, 6, '#8A5A2A');
    g.rect(CX, y - 6, CW, 1, '#D9A441');
    g.rect(CX, y - 1, CW, 1, '#2A2440');
  }
}

/** Timeline shared by both hosts. `say` shows the line; `confirm` waits for a press. */
function* caseTimeline(st: CaseState, say: (text: string) => Co, waitConfirm: () => Co): Co {
  const step = (ms: number, fn: (p: number) => void) =>
    (function* () {
      let t = 0;
      while (t < ms) {
        yield null;
        t += 1000 / 60;
        st.t += 1000 / 60;
        fn(Math.min(1, t / ms));
      }
    })();
  yield* step(200, (p) => (st.rise = ease.quadOut(p)));
  yield* step(100, () => {});
  sfx('se_paper_open', { pitch: 0.7 });
  yield* step(100, (p) => (st.open = p < 0.5 ? 0.5 : 1));
  yield* step(100, () => {});
  yield* step(600, (p) => (st.orbit = p));
  st.orbit = 0;
  sfx('se_hanko_learn');
  yield* step(200, (p) => {
    st.newAlpha = p;
    st.newScale = 1.3 - 0.3 * p;
  });
  const name = getSkill(st.skill)?.name ?? '';
  yield* say(fillAll(SYS.hankoLearn, { skill: name })[0]);
  yield* waitConfirm();
  yield* step(200, (p) => (st.closing = ease.quadIn(p)));
}

function newState(skillId: string): CaseState {
  const owned = state.party.find((m) => m.id === 'minato')?.skills ?? [];
  return { t: 0, rise: 0, open: 0, orbit: 0, newAlpha: 0, newScale: 1.3, closing: 0, owned: owned.filter((s) => s !== skillId), skill: skillId };
}

/** In-battle version (drawn as a top overlay of the battle scene). */
export function* playHankoLearnIn(s: BattleScene, skillId: string): Co {
  const st = newState(skillId);
  const fx = s.addFx({ layer: 'top', dur: 0, ui: true, draw: (g) => drawCase(g, st) });
  yield* caseTimeline(
    st,
    function* (text) {
      s.msgInteractive = true;
      s.msg.post(text, { manual: true });
      yield () => !s.msg.busy;
      s.msgInteractive = false;
    },
    function* () {},
  );
  fx.done = true;
}

/** Stand-alone overlay scene for field events. */
class HankoCaseScene implements Scene {
  transparent = true;
  done = false;
  private msg = new MessageBand();
  private runner = new (class {
    task: Generator | null = null;
  })();
  private st: CaseState;
  private co: Co;
  private wait = 0;
  private waitFn: (() => boolean) | null = null;

  constructor(skillId: string) {
    this.st = newState(skillId);
    const self = this;
    this.msg.y = 4;
    this.co = (function* () {
      yield* caseTimeline(
        self.st,
        function* (text) {
          self.msg.post(text, { manual: true });
          yield () => !self.msg.busy;
        },
        function* () {},
      );
      self.done = true;
    })();
    void this.runner;
  }

  update(dt: number): void {
    const confirm = game.input.pressed('confirm');
    this.msg.update(dt, confirm);
    if (this.waitFn) {
      if (!this.waitFn()) return;
      this.waitFn = null;
    }
    if (this.wait > 0) {
      this.wait -= dt;
      return;
    }
    const r = this.co.next();
    if (r.done) return;
    const y = r.value;
    if (typeof y === 'function') this.waitFn = y as () => boolean;
    else if (typeof y === 'number') this.wait = y;
  }

  draw(g: Gfx): void {
    drawCase(g, this.st);
    if (this.msg.busy) this.msg.draw(g);
  }
}

/** Public: `yield* playHankoLearn('skill_hanamaru')` from field events. */
export function* playHankoLearnField(skillId: string): Co {
  const sc = new HankoCaseScene(skillId);
  game.push(sc);
  yield () => sc.done;
  if (game.top === sc) game.pop();
}
