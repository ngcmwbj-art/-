// Victory & results (16.12, 18.1–18.3), the 通知表 level-up card (18.2) and
// the party wipe (18.4).

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { drawText } from '../engine/font';
import { makeCanvas } from '../engine/pixel';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { addItem, setFlag, flag, state } from '../game/state';
import { duckMusic, playBgm, sfx, stopBgm } from '../audio';
import { EXCELLENT, fillAll, gainExp, getItem, REPORT, SYS, type LevelUpResult, type StatKey } from '../data/battle';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import { gradeMark, hanamaruFrame, miniText, ovalStamp, roundSeal } from './art/stamps';
import { itemIcon } from './art/icons';
import { C, tapeCanvas } from './ui/note';
import { MessageBand } from './ui/message';
import { PANEL_POS } from './ui/panels';

// ---- victory --------------------------------------------------------------------------

function* countUp(s: BattleScene, template: string[], n: number): Co {
  const st = { v: 0 };
  s.msgInteractive = true;
  const page = () => fillAll(template, { n: Math.round(st.v) })[0];
  s.msg.replace(page(), { manual: true, cps: 400 });
  let lastTick = 0;
  for (let t = 0; t <= 300; t += FRAME) {
    st.v = n * Math.min(1, t / 300);
    if (Math.floor(st.v / 2) !== lastTick) {
      lastTick = Math.floor(st.v / 2);
      sfx('se_count');
    }
    s.msg.replace(page(), { manual: true, cps: 400 });
    yield null;
  }
  st.v = n;
  s.msg.replace(page(), { manual: true, cps: 400 });
  yield () => !s.msg.busy;
  s.msgInteractive = false;
}

function* say(s: BattleScene, pages: string[]): Co {
  s.msgInteractive = true;
  yield* s.msg.show(pages, { manual: true });
  s.msgInteractive = false;
}

/** Victory sequence and all rewards. */
export function* victory(s: BattleScene): Co {
  const quiet = s.isBoss;
  const event = s.enemies.some((e) => e.id === 'enemy_kanenari');
  const exp = s.enemies.reduce((a, e) => a + (e.dead || e.hp <= 0 || e.id === 'enemy_kanenari' ? e.def.exp : 0), 0);
  const money = s.enemies.reduce((a, e) => a + (e.dead ? e.def.money : 0), 0);
  s.cmd = null;
  if (event) {
    // the bell glows softly three times; no jingle
    duckMusic(0.25, 3);
    const e = s.enemies[0];
    for (let i = 0; i < 3; i++) {
      s.addFx({
        layer: 'world',
        dur: 300,
        draw: (g, t) => {
          const r = 10 + (t / 300) * 16;
          g.alpha(1 - t / 300, () => {
            g.ring(e.x, e.top + 18, r, '#FFE7A3');
            g.ring(e.x, e.top + 18, r + 1, '#FFF6D8');
          });
        },
      });
      sfx('se_hanko_learn', { vol: 0.35, pitch: 1.2 + i * 0.1 });
      yield 300;
    }
  } else if (!quiet) {
    yield 200;
    const seal = ovalStamp('みました', 64, 32, 0, 11, true);
    s.addFx({
      layer: 'top',
      dur: 1600,
      ui: true,
      draw: (g, t) => {
        const sc = t < 67 ? 1.6 - 0.6 * (t / 67) : 1;
        const w = seal.width * sc;
        const h = seal.height * sc;
        g.alpha(t > 1300 ? (1600 - t) / 300 : 1, () => g.ctx.drawImage(seal, Math.round(192 - w / 2), Math.round(92 - h / 2), Math.round(w), Math.round(h)));
      },
    });
    s.hitstop(6);
    s.shuSplash(192, 92, 12);
    sfx('se_stamp_heavy');
    playBgm('bgm_jingle_victory');
    for (const u of s.party) {
      u.moodHold = 'happy';
      u.bounceT = 250;
    }
    yield 260;
    for (const u of s.party) u.bounceT = 250;
    yield 300;
  }
  // 1. experience (both members, even if down)
  const levelUps: LevelUpResult[] = [];
  yield* countUp(s, SYS.exp, exp);
  for (const u of s.party) levelUps.push(...gainExp(u.m, exp));
  // 2. money
  if (money > 0) {
    state.money += money;
    yield* countUp(s, SYS.money, money);
    const oj = s.enemies.find((e) => e.id === 'enemy_ojigi_jihanki');
    if (oj?.def.texts.extra.otsuri) yield* say(s, oj.def.texts.extra.otsuri);
  }
  // 3. drops
  for (const e of s.enemies) {
    if (!e.dead) continue;
    for (const d of e.def.drops) {
      if (rng.next() >= d.rate && !s.memo.forceDrop) continue;
      const it = getItem(d.item);
      if (!it) continue;
      const ok = addItem(d.item);
      if (ok) {
        sfx('se_item');
        const icon = itemIcon(d.item);
        const fx = s.addFx({ layer: 'top', dur: 0, ui: true, draw: (g, t) => {
          const sc = t < 80 ? 1.5 - 0.5 * (t / 80) : 1;
          const w = 16 * sc;
          g.ctx.drawImage(icon, Math.round(360 - w / 2), Math.round(26 - w / 2), Math.round(w), Math.round(w));
        } });
        yield* say(s, fillAll(SYS.drop, { item: it.name }));
        fx.done = true;
      } else yield* say(s, fillAll(SYS.dropFull, { item: it.name }));
    }
  }
  // 4. flag_book is set at each defeat. 5. fallen members get up with 1 HP
  for (const u of s.party) {
    if (u.m.hp <= 0) {
      u.m.hp = 1;
      delete u.m.status.status_hebatta;
      u.drop = 0;
      yield* say(s, fillAll(SYS.afterKo, { target: u.name }));
    }
  }
  // 6. level ups
  if (levelUps.length) yield* levelUpSequence(s, levelUps);
  for (const u of s.party) u.moodHold = null;
}

/** Group results by target level and run the report card + learned pages. */
function* levelUpSequence(s: BattleScene, list: LevelUpResult[]): Co {
  const levels = [...new Set(list.map((r) => r.to))].sort((a, b) => a - b);
  let first = true;
  for (const lv of levels) {
    const rs = list.filter((r) => r.to === lv);
    for (const r of rs) yield* say(s, fillAll(SYS.levelUp, { actor: r.memberId === 'minato' ? 'ミナト' : 'カネナリくん', n: r.to }));
    const card = new ReportCard(rs, first, s.party.some((u) => u.id === 'kanenari'), s.isBoss);
    first = false;
    const fx = s.addFx({ layer: 'top', dur: 0, ui: true, draw: (g) => card.draw(g) });
    yield* card.run(s.msg, () => s.takeConfirm(), (ms) => s.hitstop(ms / FRAME), (x, y, n) => s.petals(x, y, n, 10));
    fx.done = true;
    const learned: string[] = [];
    if (lv === 3 && rs.some((r) => r.memberId === 'kanenari')) {
      learned.push(...SYS.lv3);
      const k = state.party.find((m) => m.id === 'kanenari');
      if (k && !k.skills.includes('skill_goaisatsu')) k.skills.push('skill_goaisatsu');
    }
    if (lv === 4 && rs.some((r) => r.memberId === 'minato')) learned.push(...SYS.lv4);
    if (lv === 5 && rs.some((r) => r.memberId === 'minato')) learned.push(...SYS.lv5);
    if (learned.length) yield* say(s, learned);
  }
}

// ---- report card -----------------------------------------------------------------------

/** Compact "a→b" with a 7px pixel arrow (so values fit the 136px page). */
function arrowTextWidth(g: Gfx, a: number, b: number): number {
  return g.measure(String(a)) + 9 + g.measure(String(b));
}

function drawArrowText(g: Gfx, a: number, b: number, x: number, y: number, color: string): number {
  let cx = x + g.text(String(a), x, y, { color });
  // arrow 7×5
  const ay = y + 6;
  g.rect(cx + 1, ay + 2, 5, 1, color);
  g.rect(cx + 4, ay, 1, 5, color);
  g.rect(cx + 5, ay + 1, 1, 3, color);
  cx += 9;
  cx += g.text(String(b), cx, y, { color });
  return cx - x;
}

const STAT_KEYS: StatKey[] = ['hp', 'mp', 'atk', 'def', 'spd', 'luck'];

let crestC: HTMLCanvasElement | null = null;
/** Bell school crest (24×24). */
function crest(size = 24): HTMLCanvasElement {
  if (crestC && size === 24) return crestC;
  const [c, ctx] = makeCanvas(size, size);
  const k = size / 24;
  const px = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(Math.round(x * k), Math.round(y * k), Math.max(1, Math.round(w * k)), Math.max(1, Math.round(h * k)));
  };
  // laurel ring
  for (let a = 0; a < 40; a++) {
    const an = (a / 40) * Math.PI * 2;
    px(12 + Math.cos(an) * 10.5 - 0.5, 12 + Math.sin(an) * 10.5 - 0.5, 1, 1, '#A8742A');
  }
  // bell
  for (let y = 5; y < 17; y++) {
    const hw = 2 + (y - 5) * 0.45;
    px(12 - hw, y, hw * 2, 1, y < 9 ? '#F6D98A' : '#D9A441');
  }
  px(7, 16, 10, 2, '#A8742A');
  px(11, 18, 2, 2, '#6A4A1A');
  px(11, 3, 2, 2, '#A8742A');
  px(9, 8, 1, 5, '#FFF6D8');
  if (size === 24) crestC = c;
  return c;
}

class ReportCard {
  t = 0;
  rise = 0;
  cover = 1;
  opened = false;
  stamps: { page: number; row: number; excellent: boolean; t: number }[] = [];
  bigHana = -1;
  closing = 0;
  dim = 0;

  constructor(
    private rs: LevelUpResult[],
    private withCover: boolean,
    private kanenariJoined: boolean,
    private quiet: boolean,
  ) {
    this.cover = withCover ? 1 : 0;
    this.opened = !withCover;
    if (!withCover) this.rise = 1;
  }

  *run(msg: MessageBand, confirm: () => boolean, hitstop: (ms: number) => void, petals: (x: number, y: number, n: number) => void): Co {
    if (!this.quiet) playBgm('bgm_jingle_levelup');
    const tick = function* (self: ReportCard, ms: number, fn: (p: number) => void) {
      let t = 0;
      while (t < ms) {
        yield null;
        t += FRAME;
        self.t += FRAME;
        fn(Math.min(1, t / ms));
      }
    };
    yield* tick(this, 200, (p) => (this.dim = p));
    if (this.withCover) {
      yield* tick(this, 300, (p) => (this.rise = ease.backOut(p)));
      sfx('se_paper_open');
      yield* tick(this, 300, (p) => (this.cover = 1 - p));
      this.opened = true;
    }
    // stamps row by row, left page first (0.12s apart), pitch rising a semitone each
    let k = 0;
    const pages = this.pages();
    for (let pi = 0; pi < pages.length; pi++) {
      const r = pages[pi];
      if (!r) continue;
      for (let row = 0; row < 6; row++) {
        const key = STAT_KEYS[row];
        if (r.memberId === 'kanenari' && key === 'mp') continue;
        const gain = r.after[key] - r.before[key];
        const ex = gain >= (EXCELLENT[r.memberId] ?? EXCELLENT.minato)[key];
        this.stamps.push({ page: pi, row, excellent: ex, t: 0 });
        sfx('se_stamp_light', { pitch: Math.pow(2, k / 12) });
        k++;
        yield* tick(this, 120, () => this.stamps.forEach((s) => (s.t += FRAME)));
      }
    }
    yield* tick(this, 200, () => this.stamps.forEach((s) => (s.t += FRAME)));
    this.bigHana = 0;
    hitstop(8 * FRAME);
    sfx('se_hanamaru');
    petals(320, 196, 16);
    yield* tick(this, 300, () => (this.bigHana += FRAME));
    // せんせいより: one line per member in the band
    const lines = pages.map((r, i) => (r ? REPORT.teacher[r.memberId]?.[r.to] ?? '' : i === 1 ? '' : ''));
    msg.tag = REPORT.fromTeacher;
    msg.post(lines.filter((l) => l).join('\n'), { manual: true });
    yield () => !msg.busy;
    msg.tag = '';
    void confirm;
    yield* tick(this, 200, (p) => (this.closing = p));
  }

  private pages(): (LevelUpResult | undefined)[] {
    return [this.rs.find((r) => r.memberId === 'minato'), this.rs.find((r) => r.memberId === 'kanenari')];
  }

  draw(g: Gfx): void {
    g.rect(0, 0, 384, 216, '#1B1733', 0.55 * this.dim * (1 - this.closing));
    const drop = Math.round(this.closing * 200);
    if (!this.opened) {
      // closed card rising from below to (120,44)
      const y = 44 + Math.round((1 - this.rise) * 180);
      const coverW = Math.max(1, Math.round(144 * this.cover));
      this.drawPaper(g, 120 + (144 - coverW) * 0, y, coverW, 168, true);
      if (this.cover < 1) this.drawPaper(g, 120, y, 144, 168, false, true);
      return;
    }
    const x = 48;
    const y = 44 + drop;
    this.drawPaper(g, x, y, 288, 168, false);
    // fold
    g.rect(x + 144, y + 2, 1, 164, C.grid);
    g.rect(x + 143, y + 2, 1, 164, C.grid, 0.3);
    g.rect(x + 145, y + 2, 1, 164, C.grid, 0.3);
    const pages = this.pages();
    pages.forEach((r, pi) => {
      const px = pi === 0 ? 52 : 196;
      if (!r) {
        if (pi === 1) {
          const big = crest(48);
          g.img(big, px + 44, y + 50);
          g.text(REPORT.title, px + 68, y + 110, { color: C.brass, align: 'center' });
        }
        return;
      }
      const id = r.memberId;
      g.text(REPORT.nameLine1[id] ?? '', px, y + 4, { color: C.ink });
      g.text(REPORT.nameLine2[id] ?? '', px, y + 22, { color: C.ink });
      // "Lv2→3": tiny Lv, compact arrow
      const lx = px + 136 - arrowTextWidth(g, r.from, r.to);
      g.img(miniText('Lv', 0.62, C.shuDark), lx - 11, y + 29);
      drawArrowText(g, r.from, r.to, lx, y + 22, C.shuDark);
      g.rect(px, y + 40, 136, 1, C.grid);
      REPORT.stats.forEach((name, row) => {
        const yy = y + 42 + row * 18;
        g.text(name, px, yy, { color: C.ink });
        const key = STAT_KEYS[row];
        if (id === 'kanenari' && key === 'mp') {
          g.text(REPORT.kanenariMp, px + 34, yy, { color: C.gray });
        } else {
          drawArrowText(g, r.before[key], r.after[key], px + 70, yy, C.ink);
        }
        g.rect(px, yy + 17, 136, 1, '#EFE2C2');
        const st = this.stamps.find((s) => s.page === pi && s.row === row);
        if (st) {
          const seal = gradeMark(st.excellent, 3 + row);
          const sc = st.t < 60 ? 1.6 - 0.6 * (st.t / 60) : 1;
          const w = seal.width * sc;
          g.ctx.drawImage(seal, Math.round(px + 129 - w / 2), Math.round(yy + 8 - w / 2), Math.round(w), Math.round(w));
        }
      });
    });
    if (this.bigHana >= 0) {
      // the teacher's big hanamaru, swept over the corner of the right page
      const img = hanamaruFrame(48, Math.min(1, this.bigHana / 200), false, 2.6);
      g.alpha(0.92, () => g.img(img, 292, 162 + drop));
    }
  }

  private drawPaper(g: Gfx, x: number, y: number, w: number, h: number, cover: boolean, inside = false): void {
    g.rect(x + 3, y + 3, w, h, '#0B0B14', 0.4);
    g.rect(x + 1, y, w - 2, h, C.grid);
    g.rect(x, y + 1, w, h - 2, C.grid);
    g.rect(x + 2, y + 2, w - 4, h - 4, C.paper);
    if (inside) return;
    if (cover && w > 60) {
      g.rect(x + 6, y + 6, w - 12, h - 12, '#F4E6C8');
      g.frame(x + 8, y + 8, w - 16, h - 16, '#D9C8A0');
      g.img(crest(), Math.round(x + w / 2 - 12), y + 48);
      g.text(REPORT.title, x + w / 2, y + 84, { color: C.ink, align: 'center' });
      g.text('夕鳴小学校', x + w / 2, y + 120, { color: C.grayDark, align: 'center' });
    }
  }
}

/** Public: run the report card outside a battle (e.g. exp from an event). */
export function* playLevelUpField(results: LevelUpResult[]): Co {
  if (!results.length) return;
  const scene = new ReportScene(results);
  game.push(scene);
  yield () => scene.done;
  if (game.top === scene) game.pop();
}

class ReportScene implements Scene {
  transparent = true;
  done = false;
  private msg = new MessageBand();
  private cards: ReportCard[] = [];
  private co: Co;
  private wait = 0;
  private waitFn: (() => boolean) | null = null;

  constructor(results: LevelUpResult[]) {
    const levels = [...new Set(results.map((r) => r.to))].sort((a, b) => a - b);
    const self = this;
    const hasK = state.party.some((m) => m.id === 'kanenari');
    this.co = (function* () {
      let first = true;
      for (const lv of levels) {
        const card = new ReportCard(results.filter((r) => r.to === lv), first, hasK, false);
        first = false;
        self.cards = [card];
        yield* card.run(self.msg, () => game.input.pressed('confirm'), () => {}, () => {});
      }
      self.done = true;
    })();
  }

  update(dt: number): void {
    this.msg.update(dt, game.input.pressed('confirm'));
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
    for (const c of this.cards) c.draw(g);
    if (this.msg.busy) this.msg.draw(g);
  }
}

// ---- party wipe (18.4) ---------------------------------------------------------------------

export function* wipeOut(s: BattleScene): Co {
  // 500ms at half speed, then vermilion → dark (0.8s), music fades
  s.timeScale = 0.5;
  yield 250;
  s.timeScale = 1;
  setFlag('flag_lost_count', flag('flag_lost_count') + 1);
  stopBgm(0.8);
  yield* s.say(SYS.wipe);
  const st = { a: 0 };
  s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    draw: (g) => {
      const p = st.a;
      g.rect(0, 0, 384, 216, '#E23B2E', Math.min(0.6, p * 1.4) * (1 - Math.max(0, p - 0.5) * 2));
      g.rect(0, 0, 384, 216, '#0B0B14', Math.max(0, (p - 0.3) / 0.7));
    },
  });
  for (let t = 0; t < 800; t += FRAME) {
    st.a = t / 800;
    yield null;
  }
  st.a = 1;
}

/** "戦う前から やりなおす": HP full, 朱肉 back to the battle-start value. */
export function restoreForRetry(s: BattleScene): void {
  for (const u of s.party) {
    u.m.hp = u.m.maxHp;
    u.m.mp = Math.min(u.m.maxMp, u.mpAtStart);
    u.m.status = {};
  }
}

void PANEL_POS;
void tapeCanvas;
void drawText;
