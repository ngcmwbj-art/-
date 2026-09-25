// Victory & results (16.12, 18.1–18.3), the 通知表 level-up card (18.2) and
// the party wipe (18.4).

import type { Co } from '../engine/co';
import { game, type Scene } from '../engine/game';
import type { Gfx } from '../engine/gfx';
import { drawText, measure } from '../engine/font';
import { makeCanvas } from '../engine/pixel';
import { hash2, rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { addItem, setFlag, flag, state } from '../game/state';
import { duckMusic, playBgm, sfx, stopBgm } from '../audio';
import { EXCELLENT, fillAll, gainExp, getItem, REPORT, REPORT_CH2, SYS, SYS2, type LevelUpResult, type StatKey } from '../data/battle';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import { gradeMark, hanamaruFrame, miniText, victorySeal } from './art/stamps';
import { itemIcon } from './art/icons';
import { C, tapeCanvas } from './ui/note';
import { MessageBand } from './ui/message';
import { PANEL_POS } from './ui/panels';
import { drawNumerals, numeralsWidth } from '../ui/digits';

// ---- victory --------------------------------------------------------------------------

function* countUp(s: BattleScene, template: string[], n: number): Co {
  const st = { v: 0 };
  s.msgInteractive = true;
  const page = () => fillAll(template, { n: Math.round(st.v) })[0];
  // the line stands complete from the first frame; only the number rolls
  s.msg.replace(page(), { manual: true, instant: true });
  let lastTick = 0;
  for (let t = 0; t <= 300; t += FRAME) {
    st.v = n * Math.min(1, t / 300);
    if (Math.floor(st.v / 2) !== lastTick) {
      lastTick = Math.floor(st.v / 2);
      sfx('se_count');
    }
    s.msg.replace(page(), { manual: true, instant: true });
    yield null;
  }
  st.v = n;
  s.msg.replace(page(), { manual: true, instant: true });
  yield () => !s.msg.busy;
  s.msgInteractive = false;
}

function* say(s: BattleScene, pages: string[]): Co {
  s.msgInteractive = true;
  yield* s.msg.show(pages, { manual: true });
  s.msgInteractive = false;
}

/** Centre y of the big victory seal: above the restored objects on the floor. */
const VSEAL_Y = 74;

const CONFETTI_COLS: [string, string][] = [
  ['#E23B2E', '#B8241E'],
  ['#FFD23F', '#D9A441'],
  ['#7FD1E8', '#4AA8E0'],
  ['#9BCB6B', '#5FA85A'],
  ['#F4F1E8', '#C9B68E'],
  ['#E0567A', '#A83A5A'],
];
let confettiC: HTMLCanvasElement[] | null = null;
/** Confetti bits (4×3, 3×4 and a 4×4 turned) in six colours with a shaded edge. */
function confettiBits(): HTMLCanvasElement[] {
  if (confettiC) return confettiC;
  confettiC = [];
  for (const [a, b] of CONFETTI_COLS)
    for (const [w, h] of [[4, 3], [3, 4], [4, 4]] as [number, number][]) {
      const [c, ctx] = makeCanvas(w, h);
      ctx.fillStyle = a;
      ctx.fillRect(0, 0, w, h);
      // the underside of the paper catches less light
      ctx.fillStyle = b;
      ctx.fillRect(0, h - 1, w, 1);
      ctx.fillRect(w - 1, 0, 1, h);
      if (w === 4 && h === 4) {
        // a turned square: corners knocked out
        ctx.clearRect(0, 0, 1, 1);
        ctx.clearRect(3, 3, 1, 1);
        ctx.clearRect(3, 0, 1, 1);
        ctx.clearRect(0, 3, 1, 1);
      }
      confettiC.push(c);
    }
  return confettiC;
}

/**
 * Confetti over the whole screen: half bursts out of the seal in every
 * direction, half flutters down from under the band across the full width
 * (the band's text stays clear).
 */
function confetti(s: BattleScene, n: number, cx: number, cy: number): void {
  const bits = confettiBits();
  for (let i = 0; i < n; i++) {
    const out = i % 2 === 0;
    s.burst(out ? cx + rng.range(-40, 40) : rng.range(-8, 392), out ? cy + rng.range(-8, 8) : s.msg.bottom + rng.range(-2, 12), {
      count: 1,
      speed: out ? [90, 210] : [20, 60],
      angle: out ? [-Math.PI, Math.PI] : [Math.PI * 0.3, Math.PI * 0.7],
      life: [1100, 1800],
      colors: ['#FFD23F'],
      gravity: out ? 160 : 50,
      drag: out ? 1.6 : 0.8,
      shape: 'img',
      img: bits[i % bits.length],
      delay: out ? [0, 40] : [0, 400],
    }, true);
  }
}

/** Victory sequence and all rewards. */
export function* victory(s: BattleScene): Co {
  // ヨビモドシ: its own quiet results on black (51 16.2); オムカエマチ: silent
  const yobi = s.bossKind === 'yobimodoshi';
  const quiet = s.isBoss && !yobi;
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
  } else if (!quiet && !yobi) {
    yield 200;
    // 16.12, made the moment it should be (QA round 1): a big seal in 32px
    // lettering slams down (1.7 → 0.92 → 1.06 → 1.0), vermilion spatters off
    // its rim, confetti rains over the whole screen, both panels hop twice
    const seal = victorySeal();
    s.addFx({
      layer: 'top',
      dur: 1700,
      ui: true,
      draw: (g, t) => {
        let sc = 1;
        if (t < 70) sc = 1.7 - 0.78 * ease.quadIn(t / 70);
        else if (t < 130) sc = 0.92 + 0.14 * ease.quadOut((t - 70) / 60);
        else if (t < 190) sc = 1.06 - 0.06 * ((t - 130) / 60);
        const w = seal.width * sc;
        const h = seal.height * (t >= 70 && t < 130 ? 2 - sc : sc);
        g.alpha(t > 1400 ? (1700 - t) / 300 : 1, () => g.ctx.drawImage(seal, Math.round(192 - w / 2), Math.round(VSEAL_Y - h / 2), Math.round(w), Math.round(h)));
      },
    });
    // the jingle carries the stamp itself on its first step (40_audio 6.2:
    // no separate se_stamp_heavy — QA round 3 heard a flam of two). Its
    // song starts ~60ms after playBgm, so it is started 60ms before the
    // seal lands and the thump falls on the landing frame
    yield 10;
    playBgm('bgm_jingle_victory');
    yield 60;
    s.hitstop(6);
    s.flash('#FFF6D8', 0.3, 2);
    s.shake(3, 3, 10);
    // spatter off the rim, left and right, and a spray straight out
    s.shuSplash(192 - seal.width / 2 + 10, VSEAL_Y, 12);
    s.shuSplash(192 + seal.width / 2 - 10, VSEAL_Y, 12);
    s.shuSplash(192, VSEAL_Y + seal.height / 2 - 6, 10);
    confetti(s, 80, 192, VSEAL_Y);
    for (const u of s.party) {
      u.moodHold = 'happy';
      u.bounceT = 250;
      u.bounceAmp = 4;
    }
    s.addFx({ layer: 'back', dur: 260, ui: true, draw: () => {}, update() {
      if (this.t >= 250) for (const u of s.party) u.bounceT = 250;
    } });
    // the results follow the landing within 0.4s (no empty band in between)
    yield 220;
  }
  if (quiet) {
    // the last battle (QA round 2): right after 「……ただいま。」 and the cap
    // flying off to the photo studio, no counting, no report card, no
    // learned-move lines — the rewards apply silently and the white fade
    // into the ending follows (the ending's own notebook carries the rest)
    if (money > 0) state.money += money;
    for (const u of s.party) {
      if (u.m.hp <= 0) {
        u.m.hp = 1;
        delete u.m.status.status_hebatta;
        u.drop = 0;
      }
    }
    const ups: LevelUpResult[] = [];
    for (const u of s.party) ups.push(...gainExp(u.m, exp));
    for (const lv of [...new Set(ups.map((r) => r.to))]) learnedAt(lv, ups.filter((r) => r.to === lv));
    for (const u of s.party) u.moodHold = null;
    return;
  }
  if (yobi) {
    // the night is asleep: on black, the band alone — the experience counts
    // up (se_count), a level-up's report card on black without its jingle,
    // no money; the last confirm leaves only black (51 16.2)
    for (const u of s.party) {
      if (u.m.hp <= 0) {
        u.m.hp = 1;
        delete u.m.status.status_hebatta;
        u.drop = 0;
      }
    }
    yield 300;
    yield* countUp(s, SYS.exp, exp);
    const ups: LevelUpResult[] = [];
    for (const u of s.party) ups.push(...gainExp(u.m, exp));
    if (ups.length) yield* levelUpSequence(s, ups);
    s.msg.hidden = true;
    yield 400;
    return;
  }
  // 1. experience (both members, even if down); the level-up itself is
  // judged and shown last (18.3), so the panels keep the old stats until then
  yield* countUp(s, SYS.exp, exp);
  // 2. money
  if (money > 0) {
    state.money += money;
    yield* countUp(s, SYS.money, money);
    const oj = s.enemies.find((e) => e.id === 'enemy_ojigi_jihanki');
    if (oj?.def.texts.extra.otsuri) yield* say(s, oj.def.texts.extra.otsuri);
    // ヘノヘノ課長: 「背広の ポケットに 入っていた。」 (51 16.1)
    const kacho = s.enemies.find((e) => e.dead && e.id === 'enemy_henoheno_kacho');
    if (kacho?.def.texts.extra.money) yield* say(s, kacho.def.texts.extra.money);
  } else {
    // ムジン販売員: no money — and that is the point (51 8.5)
    const mujin = s.enemies.find((e) => e.dead && e.id === 'enemy_mujin_hanbaiin');
    if (mujin?.def.texts.extra.money) yield* say(s, mujin.def.texts.extra.money);
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
        yield* stickItemCard(s, d.item, () => say(s, fillAll(SYS.drop, { item: it.name })));
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
  const levelUps: LevelUpResult[] = [];
  for (const u of s.party) levelUps.push(...gainExp(u.m, exp));
  if (levelUps.length) yield* levelUpSequence(s, levelUps);
  for (const u of s.party) u.moodHold = null;
}

// ---- item card (30_level_art 10.9) ------------------------------------------------

const CARD_W = 48;
const CARD_H = 46;
const cardCache = new Map<string, HTMLCanvasElement>();

/** A #F7C27A sticky card with the item's icon at 2x, lit from the left. */
function itemCard(id: string): HTMLCanvasElement {
  let c = cardCache.get(id);
  if (c) return c;
  const [cv, ctx] = makeCanvas(CARD_W, CARD_H);
  const r = (x: number, y: number, w: number, h: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
  };
  r(0, 0, CARD_W, CARD_H, C.tape);
  // the glued strip along the top is a shade darker and a little glossy
  r(0, 0, CARD_W, 8, '#EDB066');
  r(0, 8, CARD_W, 1, '#E3A45C');
  for (let x = 2; x < CARD_W - 2; x += 5) r(x, 2, 2, 1, '#F9CF92');
  // paper edges: light on the left, shade on the right and the bottom
  r(0, 0, 1, CARD_H, '#FBD7A0');
  r(CARD_W - 1, 0, 1, CARD_H, '#D99A55');
  r(0, CARD_H - 1, CARD_W, 1, '#D99A55');
  // faint fibre flecks
  for (let i = 0; i < 26; i++) {
    const x = 1 + Math.floor(((i * 37) % 97) / 97 * (CARD_W - 2));
    const y = 10 + Math.floor(((i * 53) % 89) / 89 * (CARD_H - 12));
    r(x, y, 1, 1, i % 3 ? '#F2B970' : '#FACB8C');
  }
  // the bottom-right corner curls up a little
  ctx.clearRect(CARD_W - 5, CARD_H - 5, 5, 5);
  r(CARD_W - 6, CARD_H - 6, 5, 1, '#D99A55');
  r(CARD_W - 6, CARD_H - 5, 4, 1, '#FBE0B4');
  r(CARD_W - 6, CARD_H - 4, 3, 1, '#F4CE98');
  r(CARD_W - 6, CARD_H - 3, 2, 1, '#E8B77A');
  r(CARD_W - 6, CARD_H - 2, 1, 1, '#D99A55');
  // the icon at 2x, with a soft 1px contact shadow so it reads on the tape colour
  const icon = itemIcon(id);
  const ix = Math.round((CARD_W - icon.width * 2) / 2);
  const iy = 11;
  ctx.globalAlpha = 0.28;
  const [sh, shx] = makeCanvas(icon.width, icon.height);
  shx.drawImage(icon, 0, 0);
  shx.globalCompositeOperation = 'source-in';
  shx.fillStyle = '#8A5A2A';
  shx.fillRect(0, 0, icon.width, icon.height);
  ctx.drawImage(sh, ix + 2, iy + 2, icon.width * 2, icon.height * 2);
  ctx.globalAlpha = 1;
  ctx.drawImage(icon, ix, iy, icon.width * 2, icon.height * 2);
  cardCache.set(id, cv);
  return cv;
}

/**
 * Show the item card while `body` runs: it drops onto the page and sticks in
 * 0.1s (a little pat of dust), then lifts off when the message is read.
 */
function* stickItemCard(s: BattleScene, id: string, body: () => Co): Co {
  const card = itemCard(id);
  const x0 = 192 - CARD_W / 2;
  const y0 = 70;
  let leave = -1;
  let patted = false;
  sfx('se_item');
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    draw: (g, t) => {
      const k = Math.min(1, t / 100);
      const e = ease.quadIn(k);
      const sc = 1.3 - 0.3 * e;
      let a = 1;
      let lift = 0;
      if (leave >= 0) {
        const q = Math.min(1, (t - leave) / 140);
        a = 1 - q;
        lift = -6 * ease.quadOut(q);
      }
      if (k >= 1 && !patted) {
        patted = true;
        s.shake(0, 1, 3);
      }
      const w = Math.round(CARD_W * sc);
      const h = Math.round(CARD_H * sc);
      const cx = x0 + CARD_W / 2;
      const cy = y0 + CARD_H / 2 + lift + Math.round((1 - e) * -8);
      const off = Math.round(2 + (1 - e) * 5 - lift * 0.5);
      g.alpha(a * (0.3 + 0.15 * e), () => g.rect(Math.round(cx - w / 2) + off, Math.round(cy - h / 2) + off, w, h, C.shadow));
      g.alpha(a, () => g.ctx.drawImage(card, Math.round(cx - w / 2), Math.round(cy - h / 2), w, h));
      // the strip of tape that holds it
      if (k >= 1) g.alpha(a, () => g.img(tapeCanvas(20, 6, '', C.white, 7), Math.round(cx - 10), Math.round(cy - h / 2) - 3));
      // a pat of dust at the corners at the moment it sticks
      if (t >= 100 && t < 220 && leave < 0) {
        const p = (t - 100) / 120;
        const d = Math.round(2 + p * 5);
        g.alpha(1 - p, () => {
          for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) {
            g.px(Math.round(cx + sx * (w / 2 + d)), Math.round(cy + sy * (h / 2 + d * 0.6)), C.white);
          }
        });
      }
    },
  });
  yield* body();
  leave = fx.t;
  yield 140;
  fx.done = true;
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
    const learned = learnedAt(lv, rs);
    if (learned.length) yield* say(s, learned);
  }
}

/** Apply what reaching `lv` teaches (ごあいさつ at 3) and return its band pages. */
function learnedAt(lv: number, rs: LevelUpResult[]): string[] {
  const learned: string[] = [];
  if (lv === 3 && rs.some((r) => r.memberId === 'kanenari')) {
    learned.push(...SYS.lv3);
    const k = state.party.find((m) => m.id === 'kanenari');
    if (k && !k.skills.includes('skill_goaisatsu')) k.skills.push('skill_goaisatsu');
  }
  if (lv === 4 && rs.some((r) => r.memberId === 'minato')) learned.push(...SYS.lv4);
  if (lv === 5 && rs.some((r) => r.memberId === 'minato')) learned.push(...SYS.lv5);
  learned.push(...ch2Rewards(lv, rs));
  return learned;
}

/** 第2章の報酬 (51 3.5, 16.4): Lv6 the bell's 「コン」, Lv7 はみだしペケ — one page per level-up. */
function ch2Rewards(lv: number, rs: LevelUpResult[]): string[] {
  if (lv === 6 && rs.some((r) => r.memberId === 'kanenari')) return [...SYS2.lv6];
  if (lv === 7 && rs.some((r) => r.memberId === 'minato')) return [...SYS2.lv7];
  return [];
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

/**
 * "a→b" in the game's own 7×11 numerals (ui/digits): the header's "1" has
 * its flag and foot, so it no longer reads as "]" (QA round 2).
 */
function numeralArrowWidth(a: number, b: number): number {
  return numeralsWidth(String(a)) + 11 + numeralsWidth(String(b));
}

function drawArrowNumerals(g: Gfx, a: number, b: number, x: number, y: number, color: string): number {
  let cx = x + drawNumerals(g, String(a), x, y, { color }) + 1;
  const ay = y + 6;
  g.rect(cx + 1, ay + 2, 5, 1, color);
  g.rect(cx + 4, ay, 1, 5, color);
  g.rect(cx + 5, ay + 1, 1, 3, color);
  cx += 10;
  cx += drawNumerals(g, String(b), cx, y, { color });
  return cx - x;
}

const STAT_KEYS: StatKey[] = ['hp', 'mp', 'atk', 'def', 'spd', 'luck'];
/** se_stamp_light pitches for rows 0–11 (40_audio 9.5: the C major scale). */
const C_MAJOR = [1.0, 1.122, 1.26, 1.335, 1.498, 1.682, 1.888, 2.0, 2.245, 2.52, 2.67, 2.997];

const crestCache = new Map<number, HTMLCanvasElement>();
/** Bell school crest (size×size, drawn at that resolution): a ring of dots round a bell. */
function crest(size = 24): HTMLCanvasElement {
  let c = crestCache.get(size);
  if (c) return c;
  const [cv, ctx] = makeCanvas(size, size);
  const k = size / 24;
  const px = (x: number, y: number, col: string) => {
    ctx.fillStyle = col;
    ctx.fillRect(x, y, 1, 1);
  };
  // ring of dots
  const n = Math.round(40 * k);
  for (let a = 0; a < n; a++) {
    const an = (a / n) * Math.PI * 2;
    px(Math.round(size / 2 - 0.5 + Math.cos(an) * 10.5 * k), Math.round(size / 2 - 0.5 + Math.sin(an) * 10.5 * k), '#A8742A');
  }
  // bell profile (half width by row, in 24-unit space): crown, shoulders, straight waist, flared lip
  const prof: [number, number][] = [[5, 1.2], [6, 2.8], [7, 3.5], [9, 3.9], [11, 4.2], [13, 4.8], [14, 5.6], [15, 6.8], [16.2, 7]];
  const hwAt = (u: number): number => {
    if (u < prof[0][0] || u > prof[prof.length - 1][0]) return -1;
    for (let i = 1; i < prof.length; i++) {
      if (u <= prof[i][0]) {
        const [u0, w0] = prof[i - 1];
        const [u1, w1] = prof[i];
        return w0 + ((w1 - w0) * (u - u0)) / (u1 - u0);
      }
    }
    return -1;
  };
  const cx = size / 2;
  for (let py = 0; py < size; py++) {
    const u = (py + 0.5) / k;
    const hw = hwAt(u) * k;
    if (hw <= 0) continue;
    const x0 = Math.round(cx - hw);
    const x1 = Math.round(cx + hw);
    for (let x = x0; x < x1; x++) {
      const f = (x - x0) / Math.max(1, x1 - x0);
      let col = u > 14.6 ? '#A8742A' : f < 0.28 ? '#F6D98A' : f > 0.78 ? '#A8742A' : '#D9A441';
      if (u > 14.6 && f < 0.3) col = '#D9A441';
      px(x, py, col);
    }
  }
  // highlight streak, crown loop and clapper
  for (let py = Math.round(7 * k); py < Math.round(13 * k); py++) px(Math.round(cx - 2.2 * k), py, '#FFF6D8');
  for (let py = Math.round(3 * k); py < Math.round(5 * k); py++) for (let x = Math.round(cx - 1 * k); x < Math.round(cx + 1 * k); x++) px(x, py, '#A8742A');
  for (let py = Math.round(16.2 * k); py < Math.round(18.4 * k); py++) for (let x = Math.round(cx - 1 * k); x < Math.round(cx + 1 * k); x++) px(x, py, '#6A4A1A');
  crestCache.set(size, cv);
  return cv;
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
    /** The cover's heading (the prologue's 「なつやすみの つうちひょう」). */
    private title: string = REPORT.title,
  ) {
    this.cover = withCover ? 1 : 0;
    this.opened = !withCover;
    if (!withCover) this.rise = 1;
  }

  /** The band is redrawn over the dimming so せんせいより stays at full contrast. */
  private msg: MessageBand | null = null;

  *run(msg: MessageBand, confirm: () => boolean, hitstop: (ms: number) => void, petals: (x: number, y: number, n: number) => void): Co {
    this.msg = msg;
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
    // stamps row by row, left page first, on the jingle's 16th grid:
    // row i at 0.96s + 0.12s × i from the jingle start (40_audio 6.3 / 9.5),
    // the se_stamp_light pitch climbing the C major scale
    const tickStamps = () => this.stamps.forEach((st) => (st.t += FRAME));
    let k = 0;
    const pages = this.pages();
    for (let pi = 0; pi < pages.length; pi++) {
      const r = pages[pi];
      if (!r) continue;
      for (let row = 0; row < 6; row++) {
        const key = STAT_KEYS[row];
        if (r.memberId === 'kanenari' && key === 'mp') continue;
        const due = (this.withCover ? 960 : 360) + 120 * k;
        while (this.t < due - FRAME / 2) yield* tick(this, FRAME, tickStamps);
        const gain = r.after[key] - r.before[key];
        const ex = gain >= (EXCELLENT[r.memberId] ?? EXCELLENT.minato)[key];
        this.stamps.push({ page: pi, row, excellent: ex, t: 0 });
        sfx('se_stamp_light', { pitch: C_MAJOR[Math.min(C_MAJOR.length - 1, k)] });
        k++;
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
    // せんせいより: the band sits above the dimming (full contrast), under the card
    if (this.msg && this.msg.tag) this.msg.draw(g);
    const drop = Math.round(this.closing * 200);
    if (!this.opened) {
      // closed card rising from below to (120,44); then the cover turns over
      // on its left edge while the card slides right, so that it lands as
      // the left page of the spread (fold at x192)
      const y = 44 + Math.round((1 - this.rise) * 180);
      const p = 1 - this.cover;
      const hx = Math.round(120 + 72 * ease.quadInOut(p));
      if (p > 0) this.drawPaper(g, hx, y, 144, 168, false, true);
      const turn = Math.sin(p * Math.PI);
      if (p < 0.5) {
        const w = Math.max(1, Math.round(144 * (1 - 2 * p)));
        this.drawPaper(g, hx, y, w, 168, true);
        if (p > 0) g.rect(hx, y, w, 168, C.shadow, 0.25 * turn);
      } else {
        const w = Math.max(1, Math.round(144 * (2 * p - 1)));
        this.drawPaper(g, hx - w, y, w, 168, false, true);
        g.rect(hx - w, y, w, 168, C.shadow, 0.2 * turn);
      }
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
    // each page keeps an 8px margin (x56–184 and x200–328); the stat names
    // take a 64px column, the before→after values follow at +66
    const PW = 128;
    pages.forEach((r, pi) => {
      const px = pi === 0 ? 56 : 200;
      if (!r) {
        if (pi === 1) {
          const big = crest(48);
          g.img(big, px + PW / 2 - 24, y + 50);
          g.text(this.title, px + PW / 2, y + 110, { color: C.brass, align: 'center' });
        }
        return;
      }
      const id = r.memberId;
      g.text(REPORT.nameLine1[id] ?? '', px, y + 5, { color: C.ink });
      g.text(REPORT.nameLine2[id] ?? '', px, y + 22, { color: C.ink });
      // "Lv2→3" (tiny Lv, compact arrow) sits at the right end of the rule
      // under the names, so a long name never runs into it
      // (2px higher than before, so the header breathes above the HP row)
      const lw = numeralArrowWidth(r.from, r.to);
      const lx = px + PW - lw;
      g.rect(px, y + 44, PW - lw - 16, 1, C.grid);
      g.img(miniText('Lv', 0.62, C.shuDark), lx - 12, y + 39);
      drawArrowNumerals(g, r.from, r.to, lx, y + 35, C.shuDark);
      REPORT.stats.forEach((name, row) => {
        const yy = y + 52 + row * 18;
        g.text(name, px, yy, { color: C.ink });
        const key = STAT_KEYS[row];
        if (id === 'kanenari' && key === 'mp') {
          g.text(REPORT.kanenariMp, px + 30, yy, { color: C.gray });
        } else {
          // right-aligned against the grade column
          const vw = arrowTextWidth(g, r.before[key], r.after[key]);
          drawArrowText(g, r.before[key], r.after[key], px + PW - 20 - vw, yy, C.ink);
        }
        g.rect(px, yy + 17, PW, 1, '#EFE2C2');
        const st = this.stamps.find((s) => s.page === pi && s.row === row);
        if (st) {
          // the grade column sits inside the page (clear of the fold at
          // x192 even while the mark pops 1.4 → 1.0)
          const seal = gradeMark(st.excellent, 3 + row);
          const sc = st.t < 60 ? 1.4 - 0.4 * (st.t / 60) : 1;
          const w = seal.width * sc;
          g.ctx.drawImage(seal, Math.round(px + PW - 10 - w / 2), Math.round(yy + 8 - w / 2), Math.round(w), Math.round(w));
        }
      });
    });
    if (this.bigHana >= 0) {
      // the teacher's big hanamaru, swept over the bottom-right corner of the
      // right page — right of the grade column (QA round 3: it sat on
      // 「うん 4→5○」), half on the paper, half off
      const img = hanamaruFrame(42, Math.min(1, this.bigHana / 200), false, 2.4);
      g.alpha(0.92, () => g.img(img, x + 280, y + 128));
    }
  }

  private drawPaper(g: Gfx, x: number, y: number, w: number, h: number, cover: boolean, inside = false): void {
    g.rect(x + 3, y + 3, w, h, '#0B0B14', 0.4);
    g.rect(x + 1, y, w - 2, h, C.grid);
    g.rect(x, y + 1, w, h - 2, C.grid);
    g.rect(x + 2, y + 2, w - 4, h - 4, C.paper);
    if (inside) return;
    if (cover) {
      // the cover turns like a page: squash the pre-drawn cover horizontally
      const img = coverCanvas(this.title, !!flag('flag_ch2_started'));
      g.ctx.drawImage(img, x, y, w, h);
      if (w < 144) g.rect(x + w - 2, y + 1, 2, h - 2, C.grid);
    }
  }
}

const coverCache = new Map<string, HTMLCanvasElement>();
/**
 * The report card's cover (144×168): thick card #FBF3DC, a creased spine, a
 * brass double rule with corner diamonds, the bell crest, the title, the
 * school, and the class and name written in pencil at the bottom.
 */
function coverCanvas(heading: string, ch2: boolean): HTMLCanvasElement {
  const key = heading + (ch2 ? ':2' : '');
  const hit = coverCache.get(key);
  if (hit) return hit;
  const W = 144;
  const H = 168;
  const [c, ctx] = makeCanvas(W, H);
  const r = (x: number, y: number, w: number, h: number, col: string, a = 1) => {
    ctx.globalAlpha = a;
    ctx.fillStyle = col;
    ctx.fillRect(x, y, w, h);
    ctx.globalAlpha = 1;
  };
  r(0, 0, W, H, C.paper);
  // cardboard fibres
  for (let i = 0; i < 180; i++) {
    const x = Math.floor(hash2(i, 1, 41) * W);
    const y = Math.floor(hash2(i, 2, 41) * H);
    r(x, y, hash2(i, 3, 41) < 0.5 ? 2 : 1, 1, hash2(i, 4, 41) < 0.6 ? '#F2E6C6' : '#FFF9E8');
  }
  // spine and crease on the hinge side, a lit edge on the other
  r(0, 0, 5, H, '#EFE2C2');
  r(5, 0, 1, H, '#DCCBA2');
  r(6, 0, 1, H, '#FFF9E8');
  r(W - 1, 0, 1, H, '#E3D3AE');
  r(0, H - 1, W, 1, '#D9C8A0');
  // brass double rule with little diamonds in the corners
  const brass = '#D9A441';
  const box = (i: number, a: number) => {
    r(10 + i, 8 + i, W - 18 - i * 2, 1, brass, a);
    r(10 + i, H - 9 - i, W - 18 - i * 2, 1, brass, a);
    r(10 + i, 8 + i, 1, H - 16 - i * 2, brass, a);
    r(W - 9 - i, 8 + i, 1, H - 16 - i * 2, brass, a);
  };
  box(0, 1);
  box(3, 0.55);
  for (const [cx, cy] of [[11, 9], [W - 10, 9], [11, H - 10], [W - 10, H - 10]]) {
    r(cx - 1, cy, 3, 1, '#A8742A');
    r(cx, cy - 1, 1, 3, '#A8742A');
    r(cx, cy, 1, 1, '#FFE7A3');
  }
  // crest and title
  const cr = crest(32);
  ctx.drawImage(cr, Math.round(W / 2 - 16) + 2, 18);
  // 第2章: a small circled ② right of the crest (52 13.7)
  if (ch2) {
    const ox = Math.round(W / 2) + 2 + 20;
    const oy = 26;
    const ring = ['..###..', '.#...#.', '#.....#', '#.....#', '#.....#', '#.....#', '#.....#', '.#...#.', '..###..'];
    const two = ['.##.', '#..#', '...#', '..#.', '.#..', '####'];
    ring.forEach((row, yy) => [...row].forEach((v, xx) => v === '#' && r(ox + xx, oy + yy, 1, 1, C.ink)));
    two.forEach((row, yy) => [...row].forEach((v, xx) => v === "#" && r(ox + 2 + xx, oy + 2 + yy, 1, 1, C.ink)));
  }
  // the heading: one line, or two when it is long (「なつやすみの／つうちひょう」)
  const lines = measure(heading) + ([...heading].length - 1) * 2 > W - 30 ? heading.split(/\s+/) : [heading];
  lines.forEach((line, li) => {
    const title = [...line];
    const tw = title.reduce((a, ch) => a + measure(ch), 0) + (title.length - 1) * 2;
    let tx = Math.round(W / 2 + 2 - tw / 2);
    const ty = lines.length > 1 ? 50 + li * 16 - 8 : 56;
    for (const ch of title) {
      drawText(ctx, ch, tx, ty, { color: C.ink });
      tx += measure(ch) + 2;
    }
  });
  r(W / 2 + 2 - 30, 76, 60, 1, brass);
  r(W / 2 + 2 - 2, 75, 5, 3, brass);
  r(W / 2 + 2 - 1, 76, 3, 1, '#FFE7A3');
  drawText(ctx, REPORT.school, Math.round(W / 2 + 2), 82, { color: C.grayDark, align: 'center' });
  // class and name, written in pencil on a ruled line
  const pencil = '#4A3A6E';
  drawText(ctx, REPORT.coverClass, 22, 110, { color: C.grayDark });
  drawText(ctx, REPORT.coverName, 30, 130, { color: pencil });
  for (let x = 20; x < W - 18; x++) if (x % 3 !== 2) r(x, 147, 1, 1, '#C9B690');
  // a little wear: the bottom right corner has been thumbed
  r(W - 5, H - 5, 5, 5, '#EFE2C2');
  r(W - 5, H - 5, 1, 1, C.paper);
  r(W - 1, H - 1, 1, 1, '#D9C8A0');
  coverCache.set(key, c);
  return c;
}

/**
 * Public: run the report card outside a battle (e.g. exp from an event).
 * `o.title` heads the cover (the chapter-2 prologue: 「なつやすみの
 * つうちひょう」); the chapter-2 rewards of Lv6 / Lv7 follow the card.
 */
export function* playLevelUpField(results: LevelUpResult[], o: { title?: string; heading?: string } = {}): Co {
  if (!results.length) return;
  const scene = new ReportScene(results, o.title ?? o.heading);
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

  constructor(results: LevelUpResult[], title?: string) {
    const levels = [...new Set(results.map((r) => r.to))].sort((a, b) => a - b);
    const self = this;
    const hasK = state.party.some((m) => m.id === 'kanenari');
    this.co = (function* () {
      let first = true;
      for (const lv of levels) {
        const rs = results.filter((r) => r.to === lv);
        const card = new ReportCard(rs, first, hasK, false, title ?? REPORT.title);
        first = false;
        self.cards = [card];
        yield* card.run(self.msg, () => game.input.pressed('confirm'), () => {}, () => {});
        self.cards = [];
        const extra = ch2Rewards(lv, rs);
        if (extra.length) {
          self.msg.post(extra, { manual: true });
          yield () => !self.msg.busy;
        }
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
  // 0–500ms: the last member has fallen; the world runs at half speed
  s.timeScale = 0.5;
  yield 250;
  s.timeScale = 1;
  // 500ms: vermilion → dark (0.8s), the battle song fades out
  setFlag('flag_lost_count', flag('flag_lost_count') + 1);
  stopBgm(0.8);
  const st = { a: 0, band: 1 };
  s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    draw: (g) => {
      const p = st.a;
      g.rect(0, 0, 384, 216, '#E23B2E', Math.min(0.6, p * 1.4) * (1 - Math.max(0, p - 0.5) * 2));
      g.rect(0, 0, 384, 216, '#0B0B14', Math.max(0, (p - 0.3) / 0.7));
      // the band stays readable above the dark (10_narrative 5.21)
      if (st.band > 0 && s.msg.busy) {
        const prev = s.msg.alpha;
        s.msg.alpha = st.band;
        s.msg.draw(g);
        s.msg.alpha = prev;
      }
    },
  });
  for (let t = 0; t < 800; t += FRAME) {
    st.a = t / 800;
    yield null;
  }
  st.a = 1;
  yield* s.say(SYS.wipe);
  s.showUi = false;
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
