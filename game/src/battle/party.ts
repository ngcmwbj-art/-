// Party actions (6, 16.2–16.5, 16.9–16.11): たたく / タックル with the
// shrinking timing ring, hanko with the hold-and-release ink ring, PR
// activities, items, guard, flee, and ノリツッコミ.

import type { Co } from '../engine/co';
import { flag, setFlag, state, addItem, removeItem } from '../game/state';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import type { Gfx } from '../engine/gfx';
import { CAPSULE_TABLE, fillAll, getItem, getSkill, ITEM_TEXT, LABEL, NORI, NORI_COMMON, SYS } from '../data/battle';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import {
  attrMul, calcDamage, critRate, enemyDefIn, fixedDamage, JUDGE_MUL, MIMA_COEF, type EnemyUnit, type Judge, type PartyCmd, type PartyUnit,
} from './model';
import {
  addKire, arrows, changeStage, cureStatus, defeatEnemy, dodge, fadeDrops, healParty, hideSticky, hurtEnemy, hurtParty, knock, markDefeated,
  resetKire, showSticky, statusText,
} from './common';
import { drawNet, balloon, crow, heart, poppedBalloon, sweatDrop, thickLine } from './art/fxart';
import { all } from '../engine/co';
import { duckMusic } from '../audio';
import { hankoCloseup } from './art/fxart';
import { hanamaruFrame, kakimoji, kakimojiSmall, ovalStamp, pekeMark, roundSeal } from './art/stamps';
void kakimojiSmall;
import { itemIcon } from './art/icons';
import { PANEL_POS } from './ui/panels';
import { C } from './ui/note';
import { kanenariBack, kanenariFront } from '../art/enemies/kanenari';
import { portrait } from '../art/chars';
import { tsukkomiWindows } from './tsukkomi';
import { onBossPartBreak, onBossBodyMimashita, bossUndo, doOkaerinasai } from './boss';

// ---- helpers -----------------------------------------------------------------------

function* waitFrames(n: number): Co {
  for (let i = 0; i < n; i++) yield null;
}

function randomAlive<T extends { alive: boolean }>(list: T[]): T | undefined {
  const a = list.filter((x) => x.alive);
  return a.length ? rng.pick(a) : undefined;
}

function retarget(s: BattleScene, e: EnemyUnit): EnemyUnit | undefined {
  if (e.alive) return e;
  return randomAlive(s.enemies);
}

/** Is the whole enemy side down? */
export function enemiesDown(s: BattleScene): boolean {
  return !s.enemies.some((e) => e.alive);
}

// ---- timing ring (10.1) ----------------------------------------------------------------

export type RingQ = 'good' | 'early' | 'none';

/**
 * Shrinking ring around (cx, cy): appears after `lead` frames, reaches the
 * sight after `shrink` frames. Hit happens exactly at lead+shrink; a press in
 * ±3f (wide ±5f) is "いい音". Resolves at the press or 3f after the hit.
 * `onFrame(f)` lets the caller animate the net / body.
 */
export function* ringStrike(s: BattleScene, cx: () => number, cy: () => number, lead: number, shrink: number, onFrame: (f: number, hitF: number) => void, tut = false): Co<{ q: RingQ; frame: number }> {
  const hitF = lead + shrink;
  const win = flag('flag_opt_tsukkomi_wide') ? 5 : 3;
  const st = { r: 44, alpha: 0, gray: false, good: false, visible: false, done: false, glowT: 0 };
  let q: RingQ = 'none';
  let resolvedAt = -1;
  s.takeConfirm();
  const ring = s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    draw: (g) => {
      if (!st.visible) return;
      const x = Math.round(cx());
      const y = Math.round(cy());
      g.alpha(st.alpha, () => {
        // sight: 1px vermilion circle r10 + 2px ticks
        const sc = st.good ? C.gold : C.shu;
        g.ring(x, y, 10, sc);
        g.rect(x - 1, y - 14, 2, 3, sc);
        g.rect(x - 1, y + 12, 2, 3, sc);
        g.rect(x - 14, y - 1, 3, 2, sc);
        g.rect(x + 12, y - 1, 3, 2, sc);
        if (st.good) {
          g.ring(x, y, 9, '#FFF6D8');
          g.ring(x, y, 11, C.gold);
        }
        if (!st.done) {
          const r = Math.round(st.r);
          const col = st.gray ? '#9AA0A8' : '#F4F1E8';
          g.ring(x, y, r + 2, C.ink);
          g.ring(x, y, r + 1, col);
          g.ring(x, y, r, col);
        }
      });
    },
  });
  for (let f = 0; ; f++) {
    if (f >= lead) {
      st.visible = true;
      st.alpha = Math.min(1, (f - lead + 1) / 4);
      st.r = f >= hitF ? 10 : 44 - 34 * ((f - lead) / shrink);
    }
    if (tut && f === hitF - 4) {
      s.sticky = { text: '', t: 0 };
      showStickyRing(s);
    }
    let pressed = s.takeConfirm();
    if (s.auto.ring === 'good' && f === hitF) pressed = true;
    if (s.auto.ring === 'early' && f === lead + 2) pressed = true;
    if (pressed && q === 'none' && f >= lead && resolvedAt < 0) {
      if (f < hitF - win) {
        q = 'early';
        st.gray = true;
      } else if (f <= hitF + win) {
        q = 'good';
        st.good = true;
      }
    }
    onFrame(f, hitF);
    if (f >= hitF && (q !== 'none' || f >= hitF + win)) {
      resolvedAt = f;
      st.done = true;
      break;
    }
    yield null;
  }
  // keep the sight a moment (gold glow on a good hit)
  s.addFx({ layer: 'top', dur: 220, ui: true, draw: () => {}, update() {
    st.alpha = Math.max(0, 1 - this.t / 220);
    if (this.t >= 219) ring.done = true;
  } });
  if (tut) hideSticky(s);
  return { q, frame: resolvedAt };
}

function showStickyRing(s: BattleScene): void {
  s.sticky = { text: 'いま！', t: 0, pulse: true };
}

// ---- hit feel on enemies ------------------------------------------------------------

export function hitFeel(s: BattleScene, e: EnemyUnit, kind: 'normal' | 'good' | 'crit', good: boolean): void {
  const x = e.coreX;
  const y = e.coreY;
  if (kind === 'crit') {
    s.hitstop(good ? 10 : 7);
    s.shake(3, 3, 10);
    s.flash('#FFFFFF', 0.12, 1);
    e.whiteFrames = 3;
    s.paper(x, y, 10, [80, 170]);
    s.stars(x, y, 4);
    s.addFx({
      layer: 'world',
      dur: 200,
      draw: (g, t) => {
        const r = 6 + 22 * (t / 200);
        g.alpha(1 - t / 200, () => {
          g.ring(x, y, r, C.shu);
          g.ring(x, y, r + 1, C.shu);
        });
      },
    });
    s.sfx('se_crit');
    const seal = roundSeal(LABEL.crit, 36);
    const sx = e.x + e.sizeW / 2 - 4;
    const sy = e.headY + 4;
    s.addFx({
      layer: 'top',
      dur: 600,
      ui: true,
      draw: (g, t) => {
        const sc = t < 67 ? 1.6 - 0.6 * (t / 67) : 1;
        const w = seal.width * sc;
        g.alpha(t > 450 ? (600 - t) / 150 : 1, () => g.ctx.drawImage(seal, Math.round(sx - w / 2), Math.round(sy - w / 2), Math.round(w), Math.round(w)));
      },
    });
  } else if (kind === 'good') {
    s.hitstop(6);
    s.shake(2, 2, 8);
    e.whiteFrames = 2;
    s.paper(x, y, 8, [80, 160]);
    s.stars(x, y, 2);
    s.sfx('se_hit_pashi');
    s.sfx('se_hit_bell');
  } else {
    s.hitstop(3);
    s.shake(1, 1, 6);
    e.whiteFrames = 1;
    s.paper(x, y, 4);
    s.sfx('se_hit_pofu');
  }
  knock(s, e);
}

/** ボケ負け is consumed after the damaging action. */
function consumeBokemake(e: EnemyUnit, used: boolean): void {
  if (used) e.status.bokemake = false;
}

// ---- たたく ----------------------------------------------------------------------------

function* strikeOnce(
  s: BattleScene,
  u: PartyUnit,
  target: EnemyUnit,
  o: { power: number; lead: number; shrink: number; second?: boolean; tut?: boolean; tackle?: boolean; stack: number },
  anim: (f: number, hitF: number, phase: 'pre' | 'post') => void,
): Co<{ killed: boolean; hit: boolean; boke: boolean }> {
  const res = yield* ringStrike(s, () => target.coreX, () => target.coreY, o.lead, o.shrink, (f, hitF) => anim(f, hitF, 'pre'), o.tut);
  const hitRate = u.stages.hit.lv <= -1 ? 0.8 : 1;
  const e = target;
  anim(res.frame, res.frame, 'post');
  // special: カネナリくん (event) — fan service
  if (e.def.invulnerable) {
    fanService(s, e);
    return { killed: false, hit: true, boke: false };
  }
  if (rng.next() >= hitRate) {
    s.sfx('se_whiff');
    s.label(LABEL.miss, e.x, e.headY + 6, 'gray', 700);
    dodge(s, e);
    s.post(rng.chance(0.5) ? fillAll(SYS.miss, { target: e.name }) : SYS.miss2);
    return { killed: false, hit: false, boke: false };
  }
  if (e.status.shindafuri) {
    s.sfx('se_zero');
    hurtEnemy(s, e, 0, { zero: true });
    s.post(e.def.texts.extra.shindafuriHit ?? SYS.zero);
    return { killed: false, hit: true, boke: false };
  }
  const good = res.q === 'good';
  const crit = !e.def.noCrit && rng.next() < critRate(u.m.luck);
  const boke = !!e.status.bokemake;
  const dmg = calcDamage({
    atk: u.m.atk,
    atkStage: u.stages.atk.lv,
    ...enemyDefIn(e),
    power: o.power,
    judge: good ? 1.3 : 1,
    attrMul: attrMul(e, 'da'),
    bokemake: boke,
    crit,
  });
  hitFeel(s, e, crit ? 'crit' : good ? 'good' : 'normal', good);
  if (good) s.label(LABEL.iioto, e.coreX + 12 + 38, e.coreY - 12 - 12, 'shu', 520);
  if (boke && s.enemies[0]?.id === 'enemy_hato_kakaricho') showSticky(s, 'bokemake');
  const killed = hurtEnemy(s, e, dmg, { crit, stack: o.stack });
  return { killed, hit: true, boke };
}

function fanService(s: BattleScene, e: EnemyUnit): void {
  s.sfx('se_zero');
  const img = heart();
  for (let i = 0; i < 4; i++) {
    const ox = rng.int(-14, 14);
    const delay = i * 90;
    s.addFx({
      layer: 'world',
      dur: 900 + delay,
      draw: (g, t) => {
        if (t < delay) return;
        const p = (t - delay) / 900;
        g.alpha(1 - p, () => g.img(img, Math.round(e.coreX + ox + Math.sin(p * 8 + i) * 3), Math.round(e.coreY - 10 - p * 28)));
      },
    });
  }
  // happy bounce (2px × 3)
  s.addFx({ layer: 'back', dur: 600, draw: () => {}, update() {
    e.offY = -Math.round(Math.abs(Math.sin((this.t / 200) * Math.PI)) * 2);
    if (this.t >= 590) e.offY = 0;
  } });
  e.setPose('fan');
  s.post(e.def.texts.extra.fanService);
}

export function* doAttack(s: BattleScene, u: PartyUnit, target0: EnemyUnit): Co {
  let target = retarget(s, target0);
  if (!target) return;
  const tackle = u.id === 'kanenari';
  // こんらん: 50% random enemy, 50% random ally (incl. self)
  let allyHit: PartyUnit | null = null;
  if (u.has('status_konran')) {
    yield* s.say(statusText('status_konran', 'act', u.name));
    if (rng.chance(0.5)) allyHit = rng.pick(s.party.filter((p) => p.alive));
    else target = randomAlive(s.enemies) ?? target;
  }
  if (allyHit) {
    s.post(tackle ? SYS.tackle : SYS.tataku);
    yield 300;
    s.sfx('se_hit_pofu');
    const dmg = Math.max(1, Math.round(calcDamage({ atk: u.m.atk, atkStage: u.stages.atk.lv, def: allyHit.m.def, defStage: allyHit.stages.def.lv, power: 1 }) * 0.5));
    hurtParty(s, allyHit, dmg);
    yield 500;
    return;
  }
  const two = !tackle && u.m.level >= 4;
  s.post(tackle ? SYS.tackle : two ? SYS.tataku2 : SYS.tataku);
  const tut = !tackle && !flag('flag_tut_ring');
  if (tut) setFlag('flag_tut_ring', 1);
  const shrink1 = tut ? 58 : 29;
  const net = { x: 0, y: 0, a: 0, alpha: 0, ghost: -1, visible: true };
  const back = { x: 300, y: 200, sc: 1, frame: 'idle' as string, visible: tackle, alpha: 1 };
  let netFx: ReturnType<typeof s.addFx> | null = null;
  if (!tackle) {
    s.sfx('se_swing');
    netFx = s.addFx({
      layer: 'top',
      dur: 0,
      draw: (g) => {
        if (!net.visible) return;
        if (net.ghost >= 0) drawNet(g, net.x, net.y, net.ghost, { alpha: 0.5 * net.alpha, ghost: true, len: 71 });
        drawNet(g, net.x, net.y, net.a, { alpha: net.alpha, len: 71 });
      },
    });
  } else {
    netFx = s.addFx({
      layer: 'top',
      dur: 0,
      draw: (g) => {
        if (!back.visible) return;
        const img = kanenariBack(back.frame);
        const w = img.width * back.sc;
        const h = img.height * back.sc;
        g.alpha(back.alpha, () => g.ctx.drawImage(img, Math.round(back.x - w / 2), Math.round(back.y - h), Math.round(w), Math.round(h)));
      },
    });
  }
  let killed = false;
  let bokeUsed = false;
  const hits = two ? 2 : 1;
  for (let h = 0; h < hits; h++) {
    target = retarget(s, target!);
    if (!target) break;
    const t = target;
    const pivot = () => ({ x: t.coreX - 56 + (h === 1 ? 112 : 0), y: t.coreY + 44 });
    const hitAngle = () => {
      const p = pivot();
      return Math.atan2(t.coreY - p.y, t.coreX - p.x);
    };
    const lead = h === 0 ? 7 : 9;
    const shrink = h === 0 ? shrink1 : 22;
    const r = yield* strikeOnce(
      s,
      u,
      t,
      { power: two ? 0.6 : 1, lead, shrink, second: h === 1, tut: tut && h === 0, tackle, stack: h },
      (f, hitF, phase) => {
        if (tackle) {
          // two bouncing steps (0–240ms), then the body-slam toward the enemy
          const tt = f * FRAME;
          if (phase === 'post') {
            back.frame = 'slam';
            return;
          }
          if (tt < 240) {
            back.x = 300 - (tt / 240) * 16;
            back.y = 200 - Math.round(Math.abs(Math.sin((tt / 120) * Math.PI)) * 6);
            back.frame = Math.floor(tt / 120) % 2 ? 'step' : 'idle';
            if (f === 0 || f === 7) s.sfx('se_step', { vol: 0.5 });
          } else {
            const p = Math.min(1, (f - 14) / Math.max(1, hitF - 14));
            const e2 = ease.quadIn(p);
            back.x = 284 + (t.coreX - 284) * e2;
            back.y = 200 + (t.coreY + 24 - 200) * e2;
            back.sc = 1 - 0.3 * e2;
            back.frame = 'run';
          }
          return;
        }
        const p0 = pivot();
        const ha = hitAngle();
        const dir = h === 1 ? -1 : 1;
        const windA = ha - dir * 1.2;
        if (f < 7 && h === 0) {
          // slides in from off-screen lower-left, tilted back 20°
          const k = ease.quadOut(Math.min(1, f / 7));
          net.x = p0.x - 30 * (1 - k);
          net.y = p0.y + 30 * (1 - k);
          net.a = windA - (20 * Math.PI) / 180;
          net.alpha = k;
        } else if (phase === 'post' || f >= hitF) {
          net.x = p0.x;
          net.y = p0.y;
          net.a = ha;
          net.ghost = -1;
          net.alpha = 1;
        } else if (f >= hitF - 2) {
          // swing smear (2 frames)
          net.x = p0.x;
          net.y = p0.y;
          net.ghost = windA + (ha - windA) * 0.5;
          net.a = ha - dir * 0.15;
          net.alpha = 1;
        } else {
          net.x = p0.x;
          net.y = p0.y;
          net.a = windA - dir * ((20 * Math.PI) / 180) * (1 - Math.min(1, f / 7));
          net.alpha = Math.min(1, net.alpha + 0.25);
        }
      },
    );
    if (r.boke) bokeUsed = true;
    if (tackle) {
      s.sfx('se_bell_dud', { pitch: 0.8 });
      back.frame = 'ring';
    }
    if (r.killed) {
      killed = true;
      break;
    }
    if (two && h === 0) yield 150;
  }
  if (target && bokeUsed) consumeBokemake(target, true);
  // net fades after 250ms (100ms), next action at +350ms
  yield killed ? 60 : 250;
  if (tackle) {
    // bounce back and slide out to the lower right (200ms)
    const sx = back.x;
    const sy = back.y;
    for (let i = 0; i <= 12; i++) {
      const p = i / 12;
      back.x = sx + (330 - sx) * ease.quadOut(p);
      back.y = sy + (230 - sy) * ease.quadOut(p);
      back.sc = 0.7 + 0.3 * p;
      back.alpha = 1 - p * 0.6;
      yield null;
    }
  } else {
    for (let i = 0; i <= 6; i++) {
      net.alpha = 1 - i / 6;
      yield null;
    }
  }
  if (netFx) netFx.done = true;
  if (killed && target) yield* killSequence(s, [target]);
  else yield 100;
}

/** Defeat one or more enemies (multi-kills drop 100ms apart). */
export function* killSequence(s: BattleScene, list: EnemyUnit[]): Co {
  const remaining = s.enemies.filter((e) => e.alive && !list.includes(e));
  const last = remaining.length === 0;
  const cos = list.map((e, i) => defeatEnemy(s, e, i * 100, last));
  yield* all(...cos);
  for (const e of list) markDefeated(e);
  if (last) {
    const lastE = list[list.length - 1];
    if (lastE.def.texts.defeat.length) yield* s.say(lastE.def.texts.defeat);
  }
  yield* fadeDrops(s);
}

// ---- hanko hold (10.2) ------------------------------------------------------------------

/** The close-up stamp + ink ring; returns the judgement on release. */
export function* holdStamp(s: BattleScene, u: PartyUnit, forceKasure = false): Co<Judge> {
  const tut = !flag('flag_tut_hanko');
  if (tut) {
    setFlag('flag_tut_hanko', 1);
    showSticky(s, 'hanko');
  }
  const speed = tut ? 0.7 : 1;
  const kLo = u.m.level >= 5 ? 0.84 : 0.88;
  const st = { rise: 0, amount: 0, charging: false, lift: 0, drop: 0, inZone: false, shake: 0, visible: true };
  s.sfx('se_hanko_ready');
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    draw: (g) => drawHankoCloseup(g, st, kLo, s.rt),
  });
  // rise 150ms easeOutBack; other windows sink to α0.6
  for (let i = 0; i <= 9; i++) {
    st.rise = ease.backOut(i / 9);
    s.uiAlpha = 1 - 0.4 * (i / 9);
    yield null;
  }
  // wait for a fresh press
  s.takeConfirm();
  const autoHold = s.auto.hold;
  if (!autoHold) while (!s.takeConfirm()) yield null;
  else yield 200;
  if (tut) hideSticky(s);
  st.charging = true;
  let held = 0;
  let judge: Judge = 'kasure';
  for (;;) {
    held += FRAME * speed;
    const ph = held / 800;
    const k = ph % 2;
    st.amount = ph >= 4 ? 0 : k <= 1 ? k : 2 - k;
    st.inZone = st.amount >= kLo;
    if (s.frame % 5 === 0) s.sfx('se_hanko_charge', { pitch: 1 + 0.6 * st.amount, vol: 0.5 });
    let released = !s.confirmDown();
    if (autoHold) {
      const goal = autoHold === 'kukkiri' ? 0.95 : autoHold === 'futsuu' ? 0.62 : 0.2;
      released = held / 800 < 1 && st.amount >= goal;
    }
    if (released || ph >= 4) {
      const a = Math.floor(st.amount * 100);
      judge = a >= kLo * 100 ? 'kukkiri' : a >= 40 ? 'futsuu' : 'kasure';
      break;
    }
    yield null;
  }
  if (forceKasure) judge = 'kasure';
  st.charging = false;
  // handle lifts 6px (40ms), then the close-up drops away (100ms)
  for (let i = 0; i <= 2; i++) {
    st.lift = (i / 2) * 6;
    yield null;
  }
  s.memo.hankoRelease = s.frame;
  (function* () {})();
  s.addFx({
    layer: 'top',
    dur: 100,
    ui: true,
    draw: () => {},
    update() {
      st.drop = ease.quadIn(Math.min(1, this.t / 100));
      s.uiAlpha = 0.6 + 0.4 * st.drop;
      if (this.t >= 99) {
        fx.done = true;
        s.uiAlpha = 1;
      }
    },
  });
  return judge;
}

function drawHankoCloseup(g: Gfx, st: { rise: number; amount: number; charging: boolean; lift: number; drop: number; inZone: boolean }, kLo: number, rt: number): void {
  const baseY = 122 + Math.round((1 - st.rise) * 80) + Math.round(st.drop * 110);
  const cx = 192;
  const cy = 146 + (baseY - 122);
  // ring track + zone
  const R = 34;
  const ctx = g.ctx;
  const steps = 220;
  for (let i = 0; i < steps; i++) {
    const p = i / steps;
    const a = -Math.PI / 2 + p * Math.PI * 2;
    const inK = p >= kLo;
    for (let w = 0; w < 4; w++) {
      const r = R - 2 + w;
      const x = Math.round(cx + Math.cos(a) * r);
      const y = Math.round(cy + Math.sin(a) * r);
      let col = '#E8D9B5';
      if (inK && Math.floor(i / 3) % 2 === 0) col = '#B8241E';
      if (p <= st.amount && st.charging) col = inK ? C.shuLight : C.shu;
      ctx.fillStyle = col;
      ctx.fillRect(x, y, 1, 1);
    }
  }
  // outer / inner ink outline of the track
  g.ring(cx, cy, R + 2, C.ink);
  g.ring(cx, cy, R - 3, C.ink);
  if (st.inZone && st.charging && Math.floor(rt / FRAME) % 2 === 0) g.ring(cx, cy, R + 2, '#FFFFFF');
  // triangle marker at the start of the くっきり zone
  const am = -Math.PI / 2 + kLo * Math.PI * 2;
  const mx = Math.round(cx + Math.cos(am) * (R + 5));
  const my = Math.round(cy + Math.sin(am) * (R + 5));
  g.rect(mx - 2, my - 1, 5, 1, C.shuDark);
  g.rect(mx - 1, my, 3, 1, C.shuDark);
  g.px(mx, my + 1, C.shuDark);
  // stamp
  const squash = st.charging ? Math.min(3, Math.floor(st.amount / 0.25)) : 0;
  const img = hankoCloseup(squash);
  const sh = st.inZone && st.charging ? (Math.floor(rt / 33) % 2 ? 1 : -1) : 0;
  g.img(img, 168 + sh, baseY - Math.round(st.lift));
}

// ---- hanko actions ---------------------------------------------------------------------

function addDecal(e: EnemyUnit, kind: 'peke' | 'mimashita', kasure: boolean): void {
  const x = e.def.core[0] + rng.int(-6, 6);
  const y = e.def.core[1] + rng.int(-6, 6);
  e.decals.push({ kind, x, y, variant: rng.int(0, 2), kasure });
  if (e.decals.length > 5) e.decals.shift();
}

function stampFeel(s: BattleScene, e: EnemyUnit | null, x: number, y: number, j: Judge, heavyRing = true): void {
  if (j === 'kukkiri') {
    s.hitstop(10);
    s.shake(4, 4, 12);
    s.flash('#E23B2E', 0.1, 1);
    if (e) e.whiteFrames = 2;
    s.shuSplash(x, y, 16);
    if (heavyRing)
      s.addFx({
        layer: 'world',
        dur: 250,
        draw: (g, t) => {
          const r = 8 + 40 * (t / 250);
          g.alpha(1 - t / 250, () => {
            g.ring(x, y, r, C.shu);
            g.ring(x, y, r + 1, C.shu);
          });
        },
      });
    s.sfx('se_stamp_heavy');
    s.sfx('se_thud_low');
    s.label(LABEL.kukkiri, x + 26, y - 26, 'shu', 700);
  } else if (j === 'futsuu') {
    s.hitstop(6);
    s.shake(2, 2, 8);
    if (e) e.whiteFrames = 1;
    s.shuSplash(x, y, 8);
    s.sfx('se_stamp');
  } else {
    s.hitstop(4);
    s.shake(1, 1, 4);
    s.shuSplash(x, y, 4, true);
    s.sfx('se_stamp_light');
    s.label(LABEL.kasure, x + 26, y - 26, 'gray', 700, true);
  }
}

/** Big mark falling from the top onto (x, y) in 90ms (easeInCubic). */
function* dropMark(s: BattleScene, img: HTMLCanvasElement, x: () => number, y: () => number): Co<ReturnType<BattleScene['addFx']>> {
  const st = { p: 0 };
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g) => {
      const cy = -img.height / 2 + (y() + img.height / 2) * ease.cubicIn(st.p);
      g.img(img, Math.round(x() - img.width / 2), Math.round(cy - img.height / 2));
    },
  });
  for (let i = 1; i <= 5; i++) {
    st.p = i / 5;
    yield null;
  }
  return fx;
}

export function* doHanko(s: BattleScene, cmd: Extract<PartyCmd, { kind: 'hanko' }>): Co {
  const u = cmd.u;
  const sk = getSkill(cmd.skill)!;
  const kanenariEvent = s.enemies.some((e) => e.id === 'enemy_kanenari');
  let lowInk = false;
  if (u.m.mp < (sk.cost ?? 0)) {
    if (kanenariEvent && cmd.skill === 'skill_mimashita') lowInk = true;
    else {
      yield* s.say(SYS.noInk);
      return;
    }
  }
  if (cmd.skill === 'skill_okaerinasai') {
    yield* doOkaerinasai(s, u);
    return;
  }
  let target = cmd.target;
  if (target.kind === 'enemy' && !target.alive) {
    const t2 = randomAlive(s.enemies);
    if (!t2) return;
    target = t2;
  }
  if (lowInk) yield* s.say(s.enemies[0].def.texts.extra.lowInk);
  s.post(fillAll(SYS.hankoReady, { skill: sk.name }));
  u.m.mp = Math.max(0, u.m.mp - (sk.cost ?? 0));
  const judge = yield* holdStamp(s, u, lowInk);
  switch (cmd.skill) {
    case 'skill_peke':
      yield* hankoPeke(s, u, target as EnemyUnit, judge);
      break;
    case 'skill_mimashita':
      yield* hankoMimashita(s, u, target as EnemyUnit, judge, cmd.part);
      break;
    case 'skill_hanamaru':
      yield* hankoHanamaru(s, u, target as PartyUnit, judge);
      break;
    case 'skill_yarinaoshi':
      yield* hankoYarinaoshi(s, target as EnemyUnit, judge, cmd.part);
      break;
  }
}

function* hankoPeke(s: BattleScene, u: PartyUnit, e: EnemyUnit, j: Judge): Co {
  s.post(SYS.peke);
  const big = pekeMark(96, 0, j === 'kasure');
  const fx = yield* dropMark(s, big, () => e.coreX, () => e.coreY);
  fx.done = true;
  const x = e.coreX;
  const y = e.coreY;
  stampFeel(s, e, x, y, j);
  // the big X shrinks 96 → 20 and sticks as a decal
  s.addFx({
    layer: 'top',
    dur: 150,
    draw: (g, t) => {
      const sz = 96 - 76 * ease.quadOut(t / 150);
      g.ctx.drawImage(big, Math.round(x - sz / 2), Math.round(y - sz / 2), Math.round(sz), Math.round(sz));
    },
  });
  if (e.def.invulnerable) {
    fanService(s, e);
    yield 400;
    return;
  }
  addDecal(e, 'peke', j === 'kasure');
  if (e.status.shindafuri) {
    hurtEnemy(s, e, 0, { zero: true });
    s.sfx('se_zero');
    s.post(e.def.texts.extra.shindafuriHit ?? SYS.zero);
    yield 400;
    return;
  }
  const boke = !!e.status.bokemake;
  const dmg = calcDamage({ atk: u.m.atk, atkStage: u.stages.atk.lv, ...enemyDefIn(e), power: sk('skill_peke').power ?? 1.8, judge: JUDGE_MUL[j], attrMul: attrMul(e, 'han'), bokemake: boke });
  const killed = hurtEnemy(s, e, dmg, { big: j === 'kukkiri' });
  knock(s, e, 3);
  consumeBokemake(e, boke);
  yield 400;
  if (killed) yield* killSequence(s, [e]);
}

function sk(id: string) {
  return getSkill(id)!;
}

function* hankoMimashita(s: BattleScene, u: PartyUnit, e: EnemyUnit, j: Judge, partId?: string): Co {
  const part = partId ? s.bossParts.find((p) => p.id === partId && !p.broken) : undefined;
  const stampImg = ovalStamp('みました', 48, 24, j === 'kasure' ? 0.4 : 0, 1);
  const px = part ? e.left + part.box[0] + part.box[2] / 2 : e.coreX;
  const py = part ? e.top + part.box[1] + part.box[3] / 2 : e.coreY;
  const fx = yield* dropMark(s, stampImg, () => px, () => py);
  fx.done = true;
  s.sfx('se_mimashita');
  s.hitstop(j === 'kukkiri' ? 10 : j === 'kasure' ? 4 : 6);
  s.shake(j === 'kukkiri' ? 3 : 1, j === 'kukkiri' ? 3 : 1, 8);
  if (j === 'kukkiri') {
    s.sfx('se_stamp_heavy');
    s.label(LABEL.kukkiri, px + 26, py - 26, 'shu', 700);
    s.addFx({ layer: 'world', dur: 250, draw: (g, t) => g.alpha(1 - t / 250, () => g.ring(px, py, 8 + 40 * (t / 250), C.shu)) });
  } else if (j === 'kasure') {
    s.sfx('se_stamp_light');
    s.label(LABEL.kasure, px + 26, py - 26, 'gray', 700, true);
  } else s.sfx('se_stamp');
  s.shuSplash(px, py, j === 'kukkiri' ? 12 : 6);
  // the stamp lingers briefly where it landed, then becomes the decal
  s.addFx({ layer: 'world', dur: 300, draw: (g, t) => g.alpha(1 - t / 300, () => g.img(stampImg, Math.round(px - 24), Math.round(py - 12))) });
  if (part && part.glow) {
    yield* onBossPartBreak(s, e, part, j);
    return;
  }
  // blush 2f, then shy lines on the cheek
  e.blushT = 2 * FRAME;
  e.shyT = j === 'kukkiri' ? 1200 : 800;
  addDecal(e, 'mimashita', j === 'kasure');
  if (e.id === 'enemy_kanenari') {
    e.setPose('seen');
    yield* s.say(e.def.texts.extra.mimashita);
    s.memo.kanenariWin = 1;
    return;
  }
  const first = !flag('flag_mimashita_' + e.id) || !e.mimaEver;
  const again = e.mimaEver;
  e.mimaEver = true;
  setFlag('flag_mimashita_' + e.id, 1);
  e.status.mimasareta = { coef: MIMA_COEF[j], turns: j === 'kasure' ? 2 : 3 };
  if (e.status.shindafuri || e.id === 'enemy_semi_final') {
    e.status.shindafuri = false;
    e.mem.seen = 1;
  }
  // info card slides in from the right
  const w = e.def.attr;
  const weak = (['da', 'han', 'wara'] as const).filter((a) => w[a] > 1);
  const resist = (['da', 'han', 'wara'] as const).filter((a) => w[a] < 1);
  let seen = 0;
  for (let n = 1; n <= e.def.tsukkomi.length; n++) if (flag(`flag_tsukkomi_${e.id}_${n}`)) seen++;
  s.card = { data: { short: e.def.book.short, weak, resist, seen, total: e.def.tsukkomiCount, hpRate: e.hpRate }, t: 0, closing: false };
  yield 500;
  if (e.def.boss) yield* onBossBodyMimashita(s, e);
  else if (again) yield* s.say(fillAll(SYS.mimashitaAgain, { enemy: e.name }));
  else yield* s.say(fillAll(SYS.mimashita, { enemy: e.name }));
  void first;
  if (e.id === 'enemy_semi_final' && e.mem.seen === 1) {
    e.mem.seen = 2;
    yield* s.say(e.def.texts.extra.mimashitaAfter);
  }
  // card closes after 1.4s total or on confirm
  const t0 = s.t;
  while (s.card && s.t - t0 < 600 && !s.takeConfirm()) yield null;
  if (s.card) {
    s.card.closing = true;
    s.card.t = 0;
  }
}

function* hankoHanamaru(s: BattleScene, u: PartyUnit, t: PartyUnit, j: Judge): Co {
  const [px, py] = PANEL_POS[t.id];
  const stamp = hankoCloseup(0);
  // the hanko presses down onto the panel (panel sinks 2px)
  const st = { y: -60, alpha: 1 };
  const sfx = s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    draw: (g) => g.alpha(st.alpha, () => g.img(stamp, px + 44, Math.round(py - 58 + st.y))),
  });
  for (let i = 1; i <= 6; i++) {
    st.y = -60 + 60 * ease.cubicIn(i / 6);
    yield null;
  }
  t.squishT = 160;
  s.sfx('se_stamp');
  s.hitstop(j === 'kukkiri' ? 8 : 4);
  for (let i = 0; i < 8; i++) {
    st.y -= 6;
    st.alpha = 1 - i / 8;
    yield null;
  }
  sfx.done = true;
  // swirl drawn in one stroke over the face (12 frames × 25ms)
  const broken = j === 'kasure';
  s.sfx('se_hanamaru');
  const fx = px + 4 + 16;
  const fy = py + 6 + 16;
  s.addFx({
    layer: 'top',
    dur: 900,
    ui: true,
    draw: (g, tt) => {
      const k = Math.min(1, tt / 300);
      const img = hanamaruFrame(48, k, broken, 2);
      g.alpha(tt > 700 ? (900 - tt) / 200 : 1, () => g.img(img, fx - 24, fy - 24));
    },
  });
  yield 300;
  const n = s.party.length ? Math.round((30 + u.m.atk * 2) * JUDGE_MUL[j]) : 0;
  const wasDown = !t.alive;
  healParty(s, t, n);
  s.petals(fx, fy, j === 'kukkiri' ? 28 : j === 'kasure' ? 6 : 12, 16);
  t.hanamaruMark = true;
  s.mood(t, 'happy', 1000);
  if (j === 'kukkiri') s.label(LABEL.kukkiri, fx + 30, fy - 30, 'shu', 700);
  if (j === 'kasure') s.label(LABEL.kasure, fx + 30, fy - 30, 'gray', 700, true);
  yield 300;
  yield* s.say(fillAll(SYS.hanamaru, { target: t.name }));
  if (wasDown && t.alive) yield* s.say(fillAll(SYS.revived, { target: t.name }));
}

function* hankoYarinaoshi(s: BattleScene, e: EnemyUnit, j: Judge, partId?: string): Co {
  s.sfx('se_rewind');
  const thick = j === 'kukkiri' ? 3 : 2;
  const cx = e.coreX;
  const cy = e.coreY;
  const rx = Math.min(70, e.sizeW / 2 + 10);
  const ry = Math.min(60, e.sizeH / 2 + 8);
  const st = { k: 0 };
  s.addFx({
    layer: 'top',
    dur: 900,
    draw: (g, t) => {
      const k = Math.min(1, t / 400);
      const a0 = -Math.PI / 2;
      const span = (330 * Math.PI) / 180;
      const n = Math.floor(60 * k);
      let lx = 0;
      let ly = 0;
      g.alpha(t > 700 ? (900 - t) / 200 : 1, () => {
        for (let i = 0; i < n; i++) {
          if (j === 'kasure' && Math.floor(i / 4) % 3 === 2) continue;
          const a1 = a0 - (span * i) / 60;
          const a2 = a0 - (span * (i + 1)) / 60;
          const x1 = cx + Math.cos(a1) * rx;
          const y1 = cy + Math.sin(a1) * ry;
          const x2 = cx + Math.cos(a2) * rx;
          const y2 = cy + Math.sin(a2) * ry;
          thickLine(g, x1, y1, x2, y2, thick, C.shu);
          lx = x2;
          ly = y2;
        }
        if (k >= 1) {
          // arrowhead
          const a = a0 - span;
          const tx = -Math.sin(a) * -1;
          const ty = Math.cos(a) * -1;
          thickLine(g, lx, ly, lx + tx * 6 + Math.cos(a) * 5, ly + ty * 6 + Math.sin(a) * 5, thick, C.shu);
          thickLine(g, lx, ly, lx + tx * 6 - Math.cos(a) * 5, ly + ty * 6 - Math.sin(a) * 5, thick, C.shu);
        }
      });
      st.k = k;
    },
  });
  yield 420;
  stampFeel(s, e, cx, cy, j, false);
  if (e.def.boss) {
    yield* bossUndo(s, e, j, partId);
    return;
  }
  if (e.status.tame) {
    const move = getSkill(e.status.tame === 'skill_ojigi_press' ? 'skill_ojigi_press' : e.status.tame)?.name ?? '';
    // sticky gets struck through and peels off
    const hx = e.x;
    const hy = e.headY - 26;
    s.addFx({
      layer: 'top',
      dur: 700,
      draw: (g, t) => {
        const fall = t > 250 ? ((t - 250) / 450) ** 2 * 60 : 0;
        g.alpha(t > 500 ? (700 - t) / 200 : 1, () => {
          g.rect(Math.round(hx - 26), Math.round(hy + fall), 52, 16, C.tape);
          g.text('溜め中', Math.round(hx), Math.round(hy + fall), { color: C.ink, align: 'center' });
          g.rect(Math.round(hx - 24), Math.round(hy + 8 + fall), Math.round(48 * Math.min(1, t / 200)), 2, C.shu);
        });
      },
    });
    e.status.tame = undefined;
    e.mem.cancelled = 1;
    if (e.id === 'enemy_ojigi_jihanki') e.setPose('idle');
    if (j === 'kukkiri') {
      e.status.bokemake = true;
      s.label(LABEL.bokemake, e.x, e.headY - 8);
    }
    yield 300;
    yield* s.say(fillAll(SYS.yarinaoshi, { enemy: e.name, move }));
    if (e.def.texts.extra.cancel) yield* s.say(e.def.texts.extra.cancel);
    if ((s.bg as { charging?: boolean }).charging !== undefined) (s.bg as { charging?: boolean }).charging = false;
  } else yield* s.say(SYS.yarinaoshiNone);
}

// ---- PR活動 -------------------------------------------------------------------------------

export function* doPR(s: BattleScene, u: PartyUnit, skill: string): Co {
  const def = getSkill(skill)!;
  u.ct[skill] = (def.ct ?? 0) > 0 ? (def.ct ?? 0) + 1 : 0;
  if (skill === 'skill_fuusen') yield* prFuusen(s, u);
  else if (skill === 'skill_goaisatsu') yield* prGoaisatsu(s, u);
  else if (skill === 'skill_kane') yield* prKane(s, u);
}

function* prFuusen(s: BattleScene, u: PartyUnit): Co {
  s.post(SYS.fuusen);
  s.sfx('se_balloon');
  const [kx, ky] = PANEL_POS[u.id];
  const pop = rng.next() < 1 / 8;
  const targets = s.party.filter((p) => !p.has('status_rusu'));
  const amount = 12 + u.m.def;
  targets.forEach((t, i) => {
    const [tx, ty] = PANEL_POS[t.id];
    const img = balloon(i % 2 === 1);
    const popsThis = pop && i === 0;
    s.addFx({
      layer: 'top',
      dur: 700,
      ui: true,
      draw: (g, tt) => {
        const p = Math.min(1, tt / 600);
        const x = kx + 60 + (tx + 20 - kx - 60) * p + Math.sin(tt / 90 + i) * 3;
        const y = ky - 4 + (ty - 16 - ky + 4) * p - Math.sin(p * Math.PI) * 30;
        if (tt < 600) g.img(img, Math.round(x - 5), Math.round(y - 12));
        else if (popsThis) g.img(poppedBalloon(), Math.round(x - 2), Math.round(y - 6 + (tt - 600) / 8));
      },
    });
  });
  yield 600;
  if (pop) s.sfx('se_balloon_pop');
  targets.forEach((t, i) => {
    const [tx, ty] = PANEL_POS[t.id];
    s.stars(tx + 20, ty - 16, 3, [30, 70]);
    healParty(s, t, pop && i === 0 ? amount / 2 : pop ? amount / 2 : amount);
  });
  yield 400;
  if (pop) yield* s.say(SYS.fuusenPop);
}

function* prGoaisatsu(s: BattleScene, u: PartyUnit): Co {
  const back = { frame: 'idle', y: 230 };
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g) => {
      const img = kanenariBack(back.frame);
      g.img(img, 290 - img.width / 2, Math.round(back.y - img.height));
    },
  });
  for (let i = 0; i <= 8; i++) {
    back.y = 230 - 30 * ease.quadOut(i / 8);
    yield null;
  }
  s.sfx('se_bow');
  back.frame = 'bow1';
  yield 80;
  back.frame = 'bow2';
  yield 80;
  back.frame = 'bow3';
  // enemies lean forward (shear up to 3px over 400ms)
  const es = s.aliveEnemies;
  for (let i = 0; i <= 24; i++) {
    const p = i / 24;
    for (const e of es) e.shear = -Math.round(Math.sin(p * Math.PI) * 3);
    yield null;
  }
  for (const e of es) e.shear = 0;
  for (const e of es) {
    const st = e.stages.atk;
    st.lv = Math.max(-2, st.lv - 1);
    st.turns = 2;
    arrows(s, e, false);
  }
  s.sfx('se_buff_down');
  back.frame = 'idle';
  for (let i = 0; i <= 8; i++) {
    back.y = 200 + 30 * ease.quadIn(i / 8);
    yield null;
  }
  fx.done = true;
  yield* s.say(SYS.goaisatsu);
}

function* prKane(s: BattleScene, u: PartyUnit): Co {
  const back = { frame: 'idle', y: 230 };
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g) => {
      const img = kanenariBack(back.frame);
      g.img(img, 290 - img.width / 2, Math.round(back.y - img.height));
    },
  });
  for (let i = 0; i <= 8; i++) {
    back.y = 230 - 30 * ease.quadOut(i / 8);
    yield null;
  }
  s.msgInteractive = true;
  s.msg.post(SYS.kane[0]);
  back.frame = 'hit';
  yield 120;
  s.sfx('se_bell_dud');
  back.frame = 'idle';
  yield () => !s.msg.busy;
  // the whole screen stops for 0.3s (background, enemies, music)
  s.freezeMs = 300;
  yield null;
  // a crow crosses the top edge right → left, "カア"
  s.sfx('se_crow');
  const crowSt = { x: 400 };
  s.addFx({
    layer: 'top',
    dur: 1400,
    ui: true,
    draw: (g, t) => {
      const img = crow(Math.floor(t / 110));
      g.img(img, Math.round(crowSt.x), 50 + Math.round(Math.sin(t / 160) * 2));
    },
    update(dt) {
      crowSt.x -= dt * 0.33;
    },
  });
  yield* s.say([SYS.kane[1], SYS.kane[2]]);
  s.msgInteractive = false;
  // sweat drop beside Kanenari-kun's face
  const [px, py] = PANEL_POS[u.id];
  s.addFx({ layer: 'top', dur: 700, ui: true, draw: (g, t) => g.alpha(1 - t / 700, () => g.img(sweatDrop(), px + 34, py + 6 + Math.round(t / 70))) });
  addKire(s, 1);
  for (let i = 0; i <= 8; i++) {
    back.y = 200 + 30 * ease.quadIn(i / 8);
    yield null;
  }
  fx.done = true;
  yield 200;
}

// ---- items ---------------------------------------------------------------------------------

export function* doItem(s: BattleScene, u: PartyUnit, itemId: string, target0: PartyUnit | null): Co {
  const it = getItem(itemId);
  if (!it) return;
  if (!state.inventory.includes(itemId)) return;
  const text = ITEM_TEXT[itemId];
  const target = target0 && !target0.has('status_rusu') ? target0 : null;
  const toKanenari = target?.id === 'kanenari';
  if (itemId === 'item_stamp_pad' && target && target.m.maxMp <= 0) {
    yield* s.say(text?.kanenari ?? SYS.kanenariNoMp);
    return;
  }
  removeItem(itemId);
  const v = { actor: u.name, target: target?.name ?? '', item: it.name };
  const giving = target && target !== u;
  const first = toKanenari && text?.kanenari ? text.kanenari : giving ? fillAll(SYS.itemGive, v) : fillAll(text?.self ?? SYS.itemSelf, v);
  s.post(first);
  // item icon arcs up from the bottom of the screen into the panel (250ms)
  const icon = itemIcon(itemId);
  const dests = target ? [target] : s.party.filter((p) => !p.has('status_rusu'));
  s.sfx('se_item');
  for (const d of dests) {
    const [tx, ty] = PANEL_POS[d.id];
    s.addFx({
      layer: 'top',
      dur: 250,
      ui: true,
      draw: (g, t) => {
        const p = t / 250;
        const x = 192 + (tx + 20 - 192) * p;
        const y = 216 + (ty - 216) * p - Math.sin(p * Math.PI) * 50;
        g.img(icon, Math.round(x - 8), Math.round(y - 8));
      },
    });
  }
  yield 250;
  for (const d of dests) {
    const [tx, ty] = PANEL_POS[d.id];
    s.burst(tx + 20, ty, { count: 2, speed: [20, 50], life: [300, 400], colors: ['#FFE7A3'], shape: 'star', size: [2, 2] }, true);
  }
  const out: string[] = [];
  const apply = (id: string, who: PartyUnit[]) => {
    const def = getItem(id)!;
    for (const d of who) {
      const wasDown = !d.alive;
      if (def.heal) healParty(s, d, def.heal);
      if (def.healRate) healParty(s, d, d.m.maxHp * def.healRate);
      if (def.mp) healParty(s, d, def.mp, { mp: true });
      if (def.cure) for (const c of def.cure) if (d.has(c)) cureStatus(s, d, c);
      if (def.special === 'shippu')
        for (const k of ['atk', 'def', 'hit'] as const)
          if (d.stages[k].lv < 0) {
            d.stages[k].lv = 0;
            d.stages[k].turns = 0;
          }
      if (wasDown && d.alive) out.push(...fillAll(SYS.revived, { target: d.name }));
    }
  };
  if (itemId === 'item_capsule') {
    yield () => !s.msg.busy;
    const content = rng.weighted(CAPSULE_TABLE);
    if (!content) {
      yield* s.say(text!.extra!.empty);
      return;
    }
    yield* s.say(fillAll(text!.extra!.content, { item: getItem(content)!.name }));
    apply(content, dests);
  } else if (itemId === 'item_hakka_ame' && target && !target.has('status_konran') && !target.has('status_nemuri')) {
    yield () => !s.msg.busy;
    yield* s.say(text!.extra!.none);
    return;
  } else {
    apply(itemId, dests);
  }
  yield 400;
  yield () => !s.msg.busy;
  if (it.special === 'kinakobou' && rng.next() < 0.25) {
    if (toKanenari) out.push(...text!.extra!.atariKanenari);
    else if (addItem('item_kinakobou')) out.push(...text!.extra!.atari);
    else out.push(...text!.extra!.atariFull);
  }
  if (itemId === 'item_oden_can' && text!.self.length > 1) out.unshift(text!.self[1]);
  if (out.length) yield* s.say(out);
}

// ---- guard / flee --------------------------------------------------------------------------

export function* doGuard(s: BattleScene, u: PartyUnit): Co {
  u.guard = true;
  s.sfx('se_confirm', { pitch: 0.7 });
  yield* s.say(u.id === 'kanenari' ? SYS.mamoruKanenari : SYS.mamoruMinato);
}

export function* doFlee(s: BattleScene, u: PartyUnit): Co<boolean> {
  const partySpd = Math.max(...s.party.filter((p) => p.alive).map((p) => p.m.spd));
  const enemySpd = Math.max(1, ...s.aliveEnemies.map((e) => e.def.spd));
  const fails = s.memo.fleeFails ?? 0;
  let rate = Math.max(0.25, Math.min(0.95, 0.6 * (partySpd / enemySpd) + 0.15 * fails));
  if (s.opts.initiative === 'party' && s.round === 1) rate = 1;
  if (s.memo.forceFlee) rate = s.memo.forceFlee > 0 ? 1 : 0;
  s.post(SYS.nigeru);
  yield 350;
  if (rng.next() < rate) {
    s.sfx('se_flee');
    for (let i = 0; i <= 10; i++) {
      for (const p of s.party) p.drop = 8 * (i / 10);
      yield null;
    }
    yield* s.say(SYS.nigeruOk);
    return true;
  }
  s.sfx('se_whiff');
  s.memo.fleeFails = fails + 1;
  for (const p of s.party) {
    p.shakeT = 0;
    s.addFx({ layer: 'top', dur: 200, ui: true, draw: () => {}, update() {
      p.drop = Math.round(Math.sin((this.t / 200) * Math.PI) * 3);
      if (this.t >= 195) p.drop = 0;
    } });
  }
  yield* s.say(fails % 2 === 0 ? SYS.nigeruFail1 : SYS.nigeruFail2);
  void u;
  return false;
}

// ---- ノリツッコミ (16.10) -------------------------------------------------------------------

export function* doNori(s: BattleScene): Co {
  const first = !s.memo.noriCount;
  s.memo.noriCount = (s.memo.noriCount ?? 0) + 1;
  let pick = rng.int(0, NORI.length - 1);
  if (pick === s.memo.noriLast) pick = (pick + 1) % NORI.length;
  s.memo.noriLast = pick;
  const nori = NORI[pick];
  // 0: the three "!" fly to the centre, screen darkens
  s.sfx('se_kire_full');
  s.addFx({
    layer: 'top',
    dur: 150,
    ui: true,
    draw: (g, t) => {
      const p = ease.quadIn(t / 150);
      for (let i = 0; i < 3; i++) {
        const x = 224 + i * 13 + (187 - 224 - i * 13) * p;
        const y = 140 + (100 - 140) * p;
        g.rect(Math.round(x), Math.round(y), 10, 14, C.shu);
      }
    },
  });
  resetKire(s);
  const darkFx = s.addFx({ layer: 'world', dur: 0, draw: (g) => g.rect(0, 0, 384, 216, '#0B0B14', 0.45) });
  yield 150;
  // 150–350: background switches to vermilion focus lines + sunset band
  const bgFx = s.addFx({
    layer: 'back',
    dur: 0,
    draw: (g, t) => {
      g.rect(0, 0, 384, 150, '#F2894B');
      g.rect(0, 60, 384, 40, '#F7C27A');
      g.rect(0, 100, 384, 50, '#E8603C');
      const ctx = g.ctx;
      ctx.save();
      ctx.fillStyle = '#E23B2E';
      ctx.globalAlpha = 0.7;
      const seed = Math.floor(t / 66);
      for (let i = 0; i < 28; i++) {
        const a = (i / 28) * Math.PI * 2 + ((seed * 7 + i * 13) % 10) * 0.01;
        ctx.beginPath();
        ctx.moveTo(192 + Math.cos(a) * 50, 96 + Math.sin(a) * 40);
        ctx.lineTo(192 + Math.cos(a - 0.04) * 320, 96 + Math.sin(a - 0.04) * 320);
        ctx.lineTo(192 + Math.cos(a + 0.04) * 320, 96 + Math.sin(a + 0.04) * 320);
        ctx.fill();
      }
      ctx.restore();
    },
  });
  duckMusic(0.25, first ? 2.6 : 1.5);
  yield 200;
  // 350–1350 (or a 400ms cut): the boke
  const kf = { x: 420, pose: nori.pose };
  const bokeFx = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g, t) => {
      const img = kanenariFront(kf.pose, t);
      g.img(img, Math.round(kf.x - img.width / 2), 150 - img.height);
      if (kf.pose === 'sing' && Math.floor(t / 200) % 2 === 0) {
        g.text('♪', Math.round(kf.x + 20), 90 - Math.round((t % 400) / 40), { color: '#2A2440', outline: '#FFD23F' });
      }
    },
  });
  const bokeMs = first ? 1000 : 400;
  s.msgInteractive = false;
  s.msg.replace(first ? nori.boke : nori.boke.slice(-1));
  for (let t = 0; t < bokeMs; t += FRAME) {
    kf.x = Math.max(250, 420 - (t / 150) * 170);
    yield null;
  }
  if (!first) {
    for (let i = 0; i < 6; i++) {
      kf.x += 30;
      yield null;
    }
  }
  // the "間": silence
  s.setMusicParam('nori_silence', 1);
  yield first ? 150 : 100;
  bokeFx.done = !first ? true : bokeFx.done;
  // 1500: tsukkomi — Minato's face ×2 slides in from the left, two-tier lettering slams down
  const face = portrait('minato', 'tsukkomi');
  const upper = kakimojiSmall('……って、');
  const lower = kakimoji(nori.line, true, s.seed + pick);
  const tsFx = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g, t) => {
      const fx = -64 + Math.min(1, t / 80) * 80;
      if (face) g.ctx.drawImage(face, Math.round(fx), 66, 64, 64);
      else {
        g.rect(Math.round(fx), 66, 64, 64, C.paper);
        g.text('ミ', Math.round(fx + 32), 90, { color: C.ink, align: 'center' });
      }
      g.img(upper, 96, 40);
      const sc = t < 60 ? 1.5 - 0.5 * (t / 60) : 1;
      const sh = t < 300 ? Math.round(Math.sin(t) * 1) : 0;
      const w = lower.width * sc;
      const h = lower.height * sc;
      g.ctx.drawImage(lower, Math.round(192 - w / 2 + sh), Math.round(58 - h / 2 + 12), Math.round(w), Math.round(h));
    },
  });
  s.sfx('se_bishi');
  yield first ? 200 : 100;
  // 1700 / 900: impact on every enemy
  const targets = s.aliveEnemies;
  s.hitstop(16);
  s.flash('#FFF6D8', 1, 2);
  s.addFx({ layer: 'top', dur: 0, ui: true, draw: () => {}, update() {
    if (this.t > 2 * FRAME && this.t < 6 * FRAME) s.tint2 = { color: '#E23B2E', alpha: 0.3 };
    else if (this.t >= 6 * FRAME) {
      s.tint2 = null;
      this.done = true;
    }
  } });
  s.shake(6, 6, 16);
  s.sfx('se_don');
  s.sfx('se_chime_chord');
  s.burst(192, 100, { count: 40, speed: [80, 240], life: [600, 1100], colors: ['#E23B2E', '#FFD23F', '#5CE1FF', '#F4F1E8', '#E0567A', '#9BCB6B', '#F2894B'], gravity: 220, drag: 1, shape: 'sq', size: [2, 3], sizeEnd: 2 }, true);
  const atkM = s.minato?.m.atk ?? 0;
  const atkK = s.kanenari?.m.atk ?? 0;
  const killed: EnemyUnit[] = [];
  targets.forEach((e, i) => {
    e.whiteFrames = 2;
    if (e.def.invulnerable) return;
    const dmg = fixedDamage((atkM + atkK) * 2.5, attrMul(e, 'wara'));
    if (hurtEnemy(s, e, dmg, { big: true, stack: 0 })) killed.push(e);
    else e.status.bokemake = true;
    knock(s, e, 5);
    void i;
  });
  yield 300;
  tsFx.done = true;
  bokeFx.done = true;
  bgFx.done = true;
  darkFx.done = true;
  s.setMusicParam('nori_silence', 0);
  yield* s.say(NORI_COMMON);
  if (killed.length) yield* killSequence(s, killed);
}

export { hitFeel as enemyHitFeel };
export { waitFrames };
export { tsukkomiWindows };
