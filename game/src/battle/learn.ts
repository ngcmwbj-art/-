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
import { flag, state } from '../game/state';
import type { BattleScene } from './scene';
import { MessageBand } from './ui/message';
import { drawCase as drawCaseUi, imprintFor } from '../ui/hankocase';

// 18.5: case 192×104 at (96,56); 10 slots (5×2), each 32×32, 4px apart.
const CX = 96;
const CY = 56;
const CW = 192;
const CH = 104;
const SLOT_X0 = 8;
const SLOT_Y0 = 12;
const SLOT_STEP = 36;
const SLOT_ROW = 40;
const SLOTS = 10;

function slotXY(i: number): [number, number] {
  return [SLOT_X0 + (i % 5) * SLOT_STEP, SLOT_Y0 + Math.floor(i / 5) * SLOT_ROW];
}

let lidC: HTMLCanvasElement | null = null;

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

let cardC: HTMLCanvasElement | null = null;
/** The paper sample card a seal lies on in its slot (as ui/hankocase draws it). */
function sampleCard(): HTMLCanvasElement {
  if (cardC) return cardC;
  const [c, ctx] = makeCanvas(28, 28);
  ctx.fillStyle = '#3A0E16';
  ctx.globalAlpha = 0.6;
  ctx.fillRect(2, 2, 26, 26);
  ctx.globalAlpha = 1;
  ctx.fillStyle = '#E8D9B5';
  ctx.fillRect(0, 0, 26, 26);
  ctx.fillStyle = '#FBF3DC';
  ctx.fillRect(0, 0, 25, 25);
  ctx.fillStyle = '#FFFBEE';
  ctx.fillRect(0, 0, 25, 1);
  cardC = c;
  return c;
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
  // the same case as the menu's ハンコ page, the gift and the ending
  // notebook (ui/hankocase): owned seals lie on cream sample cards with
  // their imprint in 朱 (QA round 3: here they were red on the red velvet)
  // (the おやすみなさい outline is there from chapter 1's ending: 51 5.2 fills it)
  drawCaseUi(g, CX, y, { owned: (id) => st.owned.includes(id) && id !== st.skill, clear: !!flag('flag_clear'), t: st.t });
  const i = HANKO_CASE_ORDER.indexOf(st.skill);
  if (i >= 0 && i < SLOTS) {
    const [ox, oy] = slotXY(i);
    const sx = CX + ox;
    const sy = y + oy;
    // the new one: an empty slot (dotted outline) whose sample card fades
    // in as the light runs round; the imprint then rises on it (α0→1, 1.3→1.0)
    const cardA = st.newAlpha > 0 ? 1 : Math.min(1, st.orbit * 1.4);
    g.alpha(cardA, () => g.img(sampleCard(), sx + 3, sy + 3));
    const img = imprintFor(st.skill);
    if (img && st.newAlpha > 0) {
      const w = img.width * st.newScale;
      const h = img.height * st.newScale;
      g.alpha(st.newAlpha, () => g.ctx.drawImage(img, Math.round(sx + 3 + 12.5 - w / 2), Math.round(sy + 3 + 12.5 - h / 2), Math.round(w), Math.round(h)));
    }
    if (st.newAlpha > 0 && st.newAlpha < 1) g.alpha(0.45 * (1 - st.newAlpha), () => g.rect(sx + 3, sy + 3, 25, 25, '#FF6A4D'));
  }
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

/**
 * Timeline shared by both hosts. `pages` are shown once the imprint has risen
 * (field: 10_narrative 5.12 / 8.12; battle: the caller's own 9.7 pages).
 */
function* caseTimeline(st: CaseState, pages: string[], say: (pages: string[]) => Co): Co {
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
  // 0–200: the case rises from below; 300: the lid opens in two frames
  yield* step(200, (p) => (st.rise = ease.quadOut(p)));
  yield* step(100, () => {});
  sfx('se_paper_open', { pitch: 0.7 });
  yield* step(100, (p) => (st.open = p < 0.5 ? 0.5 : 1));
  yield* step(100, () => {});
  // 500–1100: a vermilion light runs once around the frame
  yield* step(600, (p) => (st.orbit = p));
  st.orbit = 0;
  // 1100: the imprint rises in the empty slot (α0→1, 1.3→1.0)
  sfx('se_hanko_learn');
  yield* step(200, (p) => {
    st.newAlpha = p;
    st.newScale = 1.3 - 0.3 * ease.quadOut(p);
  });
  yield* step(100, () => {});
  if (pages.length) yield* say(pages);
  // confirm: the lid closes and the case drops away
  yield* step(100, (p) => (st.open = p < 0.5 ? 0.5 : 0));
  yield* step(200, (p) => (st.closing = ease.quadIn(p)));
}

/** 10_narrative 5.12 / 8.12: the field pages for a newly learned hanko. */
export function learnPages(skillId: string): string[] {
  const name = getSkill(skillId)?.name ?? '';
  return [SYS.hankoLearn1[0], fillAll(SYS.hankoLearn2, { skill: name })[0]];
}

function newState(skillId: string): CaseState {
  const owned = state.party.find((m) => m.id === 'minato')?.skills ?? [];
  return { t: 0, rise: 0, open: 0, orbit: 0, newAlpha: 0, newScale: 1.3, closing: 0, owned: owned.filter((s) => s !== skillId), skill: skillId };
}

/** In-battle version (drawn as a top overlay of the battle scene). */
export function* playHankoLearnIn(s: BattleScene, skillId: string, pages: string[] = learnPages(skillId)): Co {
  const st = newState(skillId);
  const fx = s.addFx({ layer: 'top', dur: 0, ui: true, draw: (g) => drawCase(g, st) });
  yield* caseTimeline(st, pages, function* (list) {
    s.msgInteractive = true;
    s.msg.post(list, { manual: true });
    yield () => !s.msg.busy;
    s.msgInteractive = false;
  });
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
      yield* caseTimeline(self.st, learnPages(skillId), function* (list) {
        self.msg.post(list, { manual: true });
        yield () => !self.msg.busy;
      });
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
