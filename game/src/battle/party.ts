// Party actions (6, 16.2–16.5, 16.9–16.11): たたく / タックル with the
// shrinking timing ring, hanko with the hold-and-release ink ring, PR
// activities, items, guard, flee, and ノリツッコミ.

import type { Co } from '../engine/co';
import { flag, setFlag, state, addItem, removeItem } from '../game/state';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { Gfx } from '../engine/gfx';
import { BAYER4, makeCanvas } from '../engine/pixel';
import { CAPSULE_TABLE, fillAll, getItem, getSkill, ITEM_TEXT, LABEL, NORI, NORI_COMMON, NORI_HOSHI, SYS, SYS2 } from '../data/battle';
import type { BattleScene } from './scene';
import { FRAME, STAGE_TOP } from './scene';
import {
  attrMul, calcDamage, critRate, enemyDefIn, fixedDamage, JUDGE_MUL, MIMA_COEF, sfxGrade, type EnemyUnit, type Judge, type PartyCmd, type PartyUnit,
} from './model';
import {
  addKire, arrows, cureStatus, defeatEnemy, dodge, fadeDrops, fadeDropsLater, healParty, hideSticky, hurtEnemy, hurtParty, kireFullPages, knock,
  markDefeated, resetKire, showSticky, statusText,
} from './common';
import { drawNet, balloon, bigHeart, crowLit, mangaLettering, musicNote, noriBoard, poppedBalloon, sweatDrop, thickLine } from './art/fxart';
import { straw } from './art/fxart_ch2';
import { all } from '../engine/co';
import { duckMusic, muteMusic, musicFlee, sfx, sfxLoop } from '../audio';
import { beachSandal, hankoCloseup } from './art/fxart';
import { hanamaruFrame, kakimoji, kakimojiSmall, ovalStamp, pekeMark, roundSeal, scoreSeal } from './art/stamps';
import { itemIcon, kireIcon } from './art/icons';
import { infoCardWidth, kireIconXY, PANEL_POS, panelOffset, type CardData } from './ui/panels';
import { C, tapeCanvas } from './ui/note';
import { FLAG_PAD, kanenariBack, kanenariFront, MIC_AT } from '../art/enemies/kanenari';
import { portrait } from '../art/chars';
import { bokemakeLabel, timingSlow, tsukkomiWindows } from './tsukkomi';
import { onBossPartBreak, onBossBodyMimashita, bossUndo, doOkaerinasai, doOyasuminasai } from './boss';
import { raiseTomato, yobiLit } from './boss_yobimodoshi';
import { hankoOtsukaresama, hatoMeishiKacho, kaneKon, konRing, otsukareBlock, pekeHamidashi, shockBack, shockLine } from './party_ch2';

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
  // runs slower than real time like the enemy wind-up (timingSlow)
  const slow = timingSlow();
  let sub = 0;
  let lastF = -1;
  for (let f = 0; ; ) {
    const fresh = f !== lastF;
    lastF = f;
    // the ring's own rising tone is the timing reference (40_audio se_ring)
    if (fresh && f === lead) s.sfx('se_ring', { dur: Math.round(shrink * FRAME * slow) });
    if (f >= lead) {
      const ff = f + sub;
      st.visible = true;
      st.alpha = Math.min(1, (ff - lead + 1) / 4);
      st.r = f >= hitF ? 10 : 44 - 34 * Math.min(1, (ff - lead) / shrink);
    }
    if (fresh && tut && f === hitF - 4) {
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
    if (fresh) onFrame(f, hitF);
    if (f >= hitF && (q !== 'none' || f >= hitF + win)) {
      resolvedAt = f;
      st.done = true;
      break;
    }
    yield null;
    sub += 1 / slow;
    if (sub >= 1) {
      sub -= 1;
      f++;
    }
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
  const boss = !!e.def.boss;
  if (kind === 'crit') {
    s.hitstop(good ? 10 : 7);
    s.shake(3, 3, 10);
    s.flash('#FFFFFF', 0.12, 1);
    e.whiteFrames = 3;
    s.impact(x, y, 44, 3, true, boss);
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
    const seal = scoreSeal(40);
    // QA round 3: number, 100てん and いい音！ make one cluster. The number
    // keeps its spot over the hit (it pops in this same tick, right after
    // this); the seal goes right beside it (else on its left, else above),
    // clear of the band, a 溜め中 tape and the screen edges; いい音！ then
    // takes the number's top or the side the seal left free
    let pos: [number, number] | null = null;
    const place = (): [number, number] => {
      if (pos) return pos;
      const n = s.recentNumberPath(e, 200);
      const rest = s.recentNumberRect(e, 200);
      const R = 20;
      const cands: [number, number][] = [];
      if (n && rest) {
        // level with where the number comes to rest (not its whole path,
        // which reaches down to the hit), so the space under it stays free
        const cy = Math.round((rest.y0 + rest.y1) / 2);
        const right: [number, number][] = [[n.x1 + 3 + R, cy], [n.x1 + R - 6, n.y0 - 2 - R], [n.x1 + 3 + R, cy + 12]];
        const left: [number, number][] = [[n.x0 - 3 - R, cy], [n.x0 - R + 6, n.y0 - 2 - R], [n.x0 - 3 - R, cy + 12]];
        // a number standing beside the body (a tall enemy) gets the seal on
        // its outer side, away from the body
        const outLeft = (n.x0 + n.x1) / 2 < e.left + e.offX;
        cands.push(...(outLeft ? [left[0], right[0], left[1], right[1], left[2], right[2]] : [right[0], left[0], right[1], left[1], right[2], left[2]]));
      }
      cands.push([Math.min(382 - R, Math.max(e.coreX + 34, e.x + e.sizeW / 2 - 4)), Math.max(STAGE_TOP + R + 1, Math.min(e.coreY - 20, e.headY + 10))]);
      const rect = (c: [number, number]) => ({ x0: c[0] - R - 1, y0: c[1] - R - 1, x1: c[0] + R + 1, y1: c[1] + R + 1 });
      pos = cands.find((c) => s.fits(rect(c), true)) ?? cands[cands.length - 1];
      return pos;
    };
    s.addFx({
      layer: 'top',
      dur: 600,
      ui: true,
      // once placed, the 「100てん」 seal owns its spot: いい音！ goes elsewhere
      block: () => {
        if (!pos) return null;
        return { x0: pos[0] - 21, y0: pos[1] - 21, x1: pos[0] + 21, y1: pos[1] + 21 };
      },
      update: () => void place(),
      draw: (g, t) => {
        const [sx, sy] = place();
        const sc = t < 67 ? 1.6 - 0.6 * (t / 67) : 1;
        const w = seal.width * sc;
        g.alpha(t > 450 ? (600 - t) / 150 : 1, () => g.ctx.drawImage(seal, Math.round(sx - w / 2), Math.round(sy - w / 2), Math.round(w), Math.round(w)));
      },
    });
  } else if (kind === 'good') {
    s.hitstop(6);
    s.shake(2, 2, 8);
    e.whiteFrames = 2;
    s.impact(x, y, 38, 3, true, boss);
    s.paper(x, y, 8, [80, 160]);
    s.stars(x, y, 2);
    s.sfx('se_hit_pashi');
    s.sfx('se_hit_bell');
  } else {
    s.hitstop(3);
    // QA round 1: 1px was not felt at all
    s.shake(2, 2, 6);
    e.whiteFrames = 1;
    s.impact(x, y, 30, 2, false, boss);
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
  o: { power: number; lead: number; shrink: number; second?: boolean; two?: boolean; tut?: boolean; tackle?: boolean; stack: number },
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
    s.labelNear(LABEL.miss, () => ({ x0: e.coreX - 8, y0: e.coreY - 22, x1: e.coreX + 8, y1: e.coreY - 6 }), ['center', 'above', 'right', 'left'], 'gray', 700);
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
  const crit = !e.def.noCrit && (!!s.auto.crit || rng.next() < critRate(u.m.luck));
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
  // 10.1: 「いい音！」 pairs with the number (over the head since QA round 2)
  // — beside it, never over it, the face or the body. The first hit of a 2段
  // strike keeps it short (300ms: the second ring and the sight come next)
  if (good) s.labelForHit(LABEL.iioto, e, false, 'shu', o.two && !o.second ? 300 : 560);
  if (boke && s.enemies[0]?.id === 'enemy_hato_kakaricho') showSticky(s, 'bokemake', undefined, false, 2600);
  const killed = hurtEnemy(s, e, dmg, { crit, stack: o.stack });
  return { killed, hit: true, boke };
}

function fanService(s: BattleScene, e: EnemyUnit): void {
  s.sfx('se_zero');
  const img = bigHeart();
  // four hearts (11.x: 「ピンクのハートが4つ舞い」) pop off his bell and flutter
  // outward and up, two to each side, clear of his face and of the net
  const hx = e.faceX;
  const hy = e.faceY - 6;
  for (let i = 0; i < 4; i++) {
    const side = i % 2 === 0 ? -1 : 1;
    const spread = 18 + (i >> 1) * 12;
    const delay = i * 80;
    s.addFx({
      layer: 'top',
      dur: 900 + delay,
      ui: true,
      draw: (g, t) => {
        if (t < delay) return;
        const p = (t - delay) / 900;
        const k = ease.quadOut(Math.min(1, p * 1.6));
        const x = hx + side * (8 + spread * k) + Math.sin(p * 9 + i) * 2;
        const y = hy - 4 - 30 * p - (i >> 1) * 6 * k;
        const sc = p < 0.12 ? 0.5 + (p / 0.12) * 0.7 : p < 0.2 ? 1.2 - ((p - 0.12) / 0.08) * 0.2 : 1;
        const w = Math.round(img.width * sc);
        const h = Math.round(img.height * sc);
        g.alpha(p > 0.7 ? (1 - p) / 0.3 : 1, () => g.ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), w, h));
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
  const net = { x: 0, y: 0, a: 0, alpha: 0, ghost: -1, visible: true, mesh: 1, swing: 0 };
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
        drawNet(g, net.x, net.y, net.a, { alpha: net.alpha, len: 71, mesh: net.mesh });
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
    // on a small enemy the hoop swats just below-outside the core (its rim
    // grazes it) instead of swallowing the whole sprite, so the white flash,
    // the squash and the knockback stay in view
    const small = t.sizeW <= 48 && t.sizeH <= 48;
    const aimX = () => t.coreX + (small ? (h === 1 ? 12 : -12) : 0);
    const aimY = () => t.coreY + (small ? 8 : 0);
    const pivot = () => ({ x: aimX() - 63 + (h === 1 ? 126 : 0), y: aimY() + 33 });
    const hitAngle = () => {
      const p = pivot();
      return Math.atan2(aimY() - p.y, aimX() - p.x);
    };
    // 2段 (10.1): the second ring starts 150ms after the first hit's
    // hitstop and shrinks in 360ms — no extra lead-in
    const lead = h === 0 ? 7 : 1;
    const shrink = h === 0 ? shrink1 : 22;
    const r = yield* strikeOnce(
      s,
      u,
      t,
      { power: two ? 0.6 : 1, lead, shrink, second: h === 1, two, tut: tut && h === 0, tackle, stack: h },
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
            // the second step lands before the ring's lead frame (7): its
            // thump must not blur the ring's rising tone, the timing cue
            // (QA round 3)
            if (f === 0 || f === 4) s.sfx('se_step_kanenari', f ? { vol: 0.85 } : undefined);
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
        if (phase === 'pre' && f === 0) {
          net.mesh = 1;
          net.swing = h + 1;
        }
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
          if (phase === 'pre' || net.alpha > 0) net.alpha = 1;
          if (phase === 'post') {
            // QA round 2: the hoop no longer lingers over the body for 250ms.
            // 2 frames after the hit the mesh thins out, then the net is
            // snatched back (5 frames, through the hitstop) so the enemy's
            // hurt face shows while the hit still hangs in the air
            const swing = net.swing;
            const bx = p0.x;
            const by = p0.y;
            s.addFx({ layer: 'top', dur: 7 * FRAME, ui: true, draw: () => {}, update() {
              if (net.swing !== swing) {
                this.done = true;
                return;
              }
              if (this.t >= 2 * FRAME - 1) net.mesh = 0.3;
              const k = Math.max(0, Math.min(1, (this.t - 2 * FRAME) / (5 * FRAME)));
              if (k <= 0) return;
              const e2 = ease.quadIn(k);
              net.a = ha - dir * 0.7 * e2;
              net.x = bx - dir * 12 * e2;
              net.y = by + 10 * e2;
              net.alpha = 1 - k;
            } });
          }
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
    // 感電 (51 8.3): each 打 that lands on the fence stings the one who hit it
    if (r.hit && !r.killed && t.def.shock) s.run(shockBack(s, u, t));
    if (r.killed) {
      killed = true;
      break;
    }
    if (two && h === 0) yield 150;
  }
  if (target && bokeUsed) consumeBokemake(target, true);
  if (killed && target) {
    // 16.8: the finishing hit goes straight into 思いだす (its 14f hitstop
    // overrides the hit's); the net / Kanenari-kun leave in parallel
    const b0 = { x: back.x, y: back.y };
    s.addFx({
      layer: 'top',
      dur: 260,
      ui: true,
      draw: () => {},
      update() {
        const p = Math.min(1, this.t / 250);
        if (tackle) {
          back.x = b0.x + (330 - b0.x) * ease.quadOut(p);
          back.y = b0.y + (230 - b0.y) * ease.quadOut(p);
          back.sc = 0.7 + 0.3 * p;
          back.alpha = 1 - p * 0.6;
        } else net.alpha = Math.min(net.alpha, 1 - p);
        if (p >= 1 && netFx) netFx.done = true;
      },
    });
    yield* killSequence(s, [target]);
    return;
  }
  // net fades after 250ms (100ms), next action at +350ms
  yield 250;
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
      net.alpha = Math.min(net.alpha, 1 - i / 6);
      yield null;
    }
  }
  if (netFx) netFx.done = true;
  yield 100;
  if (target && target.def.shock) yield* shockLine(s, target);
}

/** Defeat one or more enemies (multi-kills drop 100ms apart). */
export function* killSequence(s: BattleScene, list: EnemyUnit[]): Co {
  const remaining = s.enemies.filter((e) => e.alive && !list.includes(e));
  const last = remaining.length === 0;
  // 40_audio 12.3: the battle song dips −12dB under the last 思いだす
  if (last && !s.isBoss) duckMusic(0.25, 1.4);
  const cos = list.map((e, i) => defeatEnemy(s, e, i * 100, last));
  yield* all(...cos);
  for (const e of list) markDefeated(e);
  if (last) {
    const lastE = list[list.length - 1];
    if (lastE.def.texts.defeat.length) yield* s.say(lastE.def.texts.defeat);
    // 16.12: the victory seal comes 200ms after the line — the objects fade meanwhile
    fadeDropsLater(s);
    return;
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
  const speed = (tut ? 0.7 : 1) / timingSlow();
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
  // the charge hum follows the amount (sfxLoop, 40_audio 9.5); a "チッ" on entering the zone
  const hum = sfxLoop('se_hanko_charge');
  let wasZone = false;
  for (;;) {
    held += FRAME * speed;
    const ph = held / 800;
    const k = ph % 2;
    st.amount = ph >= 4 ? 0 : k <= 1 ? k : 2 - k;
    st.inZone = st.amount >= kLo;
    hum.set('amount', st.amount);
    hum.set('zone', st.inZone ? 1 : 0);
    if (st.inZone && !wasZone) s.sfx('se_hanko_zone');
    wasZone = st.inZone;
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
  hum.stop(0.02);
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
  // the close-up rises over the (idle) command window, on Minato's side, so
  // neither the target nor the status panels are covered (15.9 moved)
  const baseY = 122 + Math.round((1 - st.rise) * 80) + Math.round(st.drop * 110);
  const cx = HANKO_CX;
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
  g.img(img, HANKO_CX - 24 + sh, baseY - Math.round(st.lift));
}

/** Centre x of the hanko close-up and its ink ring. */
const HANKO_CX = 52;

// ---- hanko actions ---------------------------------------------------------------------

function addDecal(e: EnemyUnit, kind: 'peke' | 'mimashita', kasure: boolean): void {
  const x = e.def.core[0] + rng.int(-6, 6);
  const y = e.def.core[1] + rng.int(-6, 6);
  e.decals.push({ kind, x, y, variant: rng.int(0, 2), kasure });
  if (e.decals.length > 5) e.decals.shift();
}

/** `numbered`: a damage number pops from `e` too, so the label pairs with it. */
function stampFeel(s: BattleScene, e: EnemyUnit | null, x: number, y: number, j: Judge, heavyRing = true, numbered = false): void {
  const label = (text: string, tone: 'shu' | 'gray', worn: boolean) => {
    if (e && numbered) s.labelForHit(text, e, j === 'kukkiri', tone, 700, worn);
    else s.labelUpRight(text, x, y, tone, 700, worn);
  };
  if (j === 'kukkiri') {
    s.hitstop(10);
    s.shake(4, 4, 12);
    s.flash('#E23B2E', 0.1, 1);
    if (e) e.whiteFrames = 2;
    s.shuDrops(x, y, 16);
    // the seal's ring spreads from the moment of impact, through the hitstop
    // (QA round 2: in the world layer it only started once the stop was over)
    if (heavyRing) stampRing(s, x, y);
    s.sfx('se_stamp_heavy');
    s.sfx('se_thud_low');
    label(LABEL.kukkiri, 'shu', false);
  } else if (j === 'futsuu') {
    s.hitstop(6);
    s.shake(2, 2, 8);
    if (e) e.whiteFrames = 1;
    s.shuDrops(x, y, 8);
    s.sfx('se_stamp');
  } else {
    s.hitstop(4);
    s.shake(1, 1, 4);
    s.shuSplash(x, y, 4, true);
    s.sfx('se_stamp_light');
    label(LABEL.kasure, 'gray', true);
  }
}

/**
 * The ring a firm seal throws off: vermilion with a cream inner line and an
 * ink outer line, 8 → 48px in 250ms, running in real time from the impact.
 */
function stampRing(s: BattleScene, x: number, y: number): void {
  s.addFx({
    layer: 'top',
    dur: 250,
    ui: true,
    draw: (g, t) => {
      const p = t / 250;
      const r = 8 + 40 * ease.quadOut(p);
      g.alpha(1 - p * p, () => {
        g.ring(x, y, r + 2, C.ink);
        g.ring(x, y, r + 1, C.shu);
        g.ring(x, y, r, C.shu);
        g.ring(x, y, r - 1, C.flash);
      });
    },
  });
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
  if (cmd.skill === 'skill_oyasuminasai') {
    yield* doOyasuminasai(s, u);
    return;
  }
  // a dark ラッパ (51 10.2): still dark when the turn comes — nothing to see;
  // the turn is spent, the ink is not
  if (cmd.part && s.bossKind === 'yobimodoshi' && !yobiLit(s)) {
    s.post(fillAll(SYS.hankoReady, { skill: sk.name }));
    yield 300;
    yield* s.say(SYS2.rappaDarkStamp);
    return;
  }
  // おつかれさま on an enemy that is resting (or just back from a rest) by the
  // time the turn comes: it cannot be pressed — no ink, no turn (51 4.3)
  if (cmd.skill === 'skill_otsukaresama' && cmd.target.kind === 'enemy') {
    const why = otsukareBlock(s, cmd.target as EnemyUnit);
    if (why) {
      yield* s.say(fillAll(why === 'after' ? SYS2.otsukareFail : SYS2.otsukareResting, { enemy: (cmd.target as EnemyUnit).name }));
      return;
    }
  }
  // テツヤ: おつかれさま can be pressed with too little ink (it is 0 then,
  // and かすれ) — he is rested whatever the judgement (51 5.1)
  const tetsuya = cmd.skill === 'skill_otsukaresama' && cmd.target.kind === 'enemy' && !!(cmd.target as EnemyUnit).def.restAlways;
  let lowInk = false;
  if (u.m.mp < (sk.cost ?? 0)) {
    if (kanenariEvent && cmd.skill === 'skill_mimashita') lowInk = true;
    else if (tetsuya) lowInk = true;
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
    case 'skill_otsukaresama':
      yield* hankoOtsukaresama(s, u, target as EnemyUnit, judge);
      break;
  }
}

function* hankoPeke(s: BattleScene, u: PartyUnit, e: EnemyUnit, j: Judge): Co {
  s.post(SYS.peke);
  s.sfx('se_peke_fall');
  const big = pekeMark(96, 0, j === 'kasure');
  const fx = yield* dropMark(s, big, () => e.coreX, () => e.coreY);
  fx.done = true;
  const x = e.coreX;
  const y = e.coreY;
  // the big X shrinks 96 → 20 and sticks as a decal (added first: the ring
  // and the drops of the impact go over it)
  s.addFx({
    layer: 'top',
    dur: 150,
    draw: (g, t) => {
      const sz = 96 - 76 * ease.quadOut(t / 150);
      g.ctx.drawImage(big, Math.round(x - sz / 2), Math.round(y - sz / 2), Math.round(sz), Math.round(sz));
    },
  });
  stampFeel(s, e, x, y, j, true, !e.def.invulnerable && !e.status.shindafuri);
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
  // Lv7 (51 3.5): a くっきり ペケ spills over — onto the neighbours, or the same edge again
  const spill = j === 'kukkiri' ? yield* pekeHamidashi(s, u, e, dmg) : [];
  const down = [...(killed ? [e] : []), ...spill.filter((x) => x !== e)];
  if (!killed && spill.includes(e)) down.unshift(e);
  // a finishing stamp goes straight into 思いだす (its hitstop overrides the hit's)
  if (down.length) yield* killSequence(s, down);
  else yield 400;
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
  s.sfx('se_mimashita', { grade: sfxGrade(j) });
  s.hitstop(j === 'kukkiri' ? 10 : j === 'kasure' ? 4 : 6);
  s.shake(j === 'kukkiri' ? 3 : 1, j === 'kukkiri' ? 3 : 1, 8);
  // a glowing boss part breaks: its 「部位破壊」 says it all — no second
  // judgement label piling up on the same spot
  const breaking = !!part && part.glow;
  if (j === 'kukkiri') {
    s.sfx('se_stamp_heavy');
    if (!breaking) s.labelUpRight(LABEL.kukkiri, px, py, 'shu', 700);
    stampRing(s, px, py);
  } else if (j === 'kasure') {
    s.sfx('se_stamp_light');
    if (!breaking) s.labelUpRight(LABEL.kasure, px, py, 'gray', 700, true);
  } else s.sfx('se_stamp');
  if (j === 'kasure') s.shuSplash(px, py, 6, true);
  else s.shuDrops(px, py, j === 'kukkiri' ? 12 : 6);
  // the stamp lingers briefly where it landed, then becomes the decal
  s.addFx({ layer: 'world', dur: 300, draw: (g, t) => g.alpha(1 - t / 300, () => g.img(stampImg, Math.round(px - stampImg.width / 2), Math.round(py - stampImg.height / 2))) });
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
  // slides in on the side away from the enemy and closes by itself at 1.4s;
  // it comes to rest clear of the enemy's body (QA round 3: it covered the
  // massage chair's arm) — else on whichever side overlaps it least
  const data: CardData = { short: e.def.book.short, weak, resist, seen, total: e.def.tsukkomiCount, hpRate: e.hpRate };
  const cw = infoCardWidth(data);
  const ex0 = e.left + 2;
  const ex1 = e.left + e.sizeW - 2;
  const rightX = Math.max(216 + 160 - cw, Math.min(382 - cw, ex1 + 4));
  const leftX = Math.min(8, Math.max(2, ex0 - 4 - cw));
  const overR = Math.max(0, ex1 - rightX);
  const overL = Math.max(0, leftX + cw - ex0);
  const pref = e.x > 192 ? 'left' : 'right';
  const side: 'left' | 'right' = overR === overL ? pref : overR < overL ? 'right' : 'left';
  data.side = side;
  data.w = cw;
  data.x = side === 'left' ? leftX : rightX;
  s.card = { data, t: 0, closing: false };
  yield 500;
  if (e.def.boss) yield* onBossBodyMimashita(s, e);
  else if (again) yield* s.say(fillAll(SYS.mimashitaAgain, { enemy: e.name }));
  else yield* s.say(fillAll(SYS.mimashita, { enemy: e.name }));
  void first;
  // スネトマト (51 8.1): seen, it stops sulking and turns round to face us
  if (e.status.sune) {
    e.status.sune = false;
    e.setPose('turnFront');
    s.sfx('se_h_sune', { pitch: 1.25, vol: 0.7 });
    s.memo.suneTut = 0;
    yield 250;
    yield* s.say(fillAll(e.def.texts.extra.mimashitaAfter ?? [], { enemy: e.name }));
    if (e.pose === 'turnFront') e.setPose('idle');
  }
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
  // the hanko presses down onto the member's photo (QA round 2: it used to
  // land in the air beside the enemy): the rubber face (image rows 44–54,
  // x10–38) comes to rest on the photo (py+6…py+38) and the panel sinks 2px
  const st = { y: -80, alpha: 1 };
  const sfx = s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    draw: (g) => {
      const { dx, dy } = panelOffset(t);
      g.alpha(st.alpha, () => g.img(stamp, px + 20 - 24 + dx, Math.round(py + 30 - 54 + st.y + dy)));
    },
  });
  for (let i = 1; i <= 6; i++) {
    st.y = -80 + 80 * ease.cubicIn(i / 6);
    yield null;
  }
  t.squishT = 200;
  s.shake(0, 1, 3);
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
  s.sfx('se_hanamaru', { grade: sfxGrade(j) });
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
  // the judgement goes on the stage side of the green number, never on the tags
  const near = () => s.recentNumberRect(t) ?? { x0: fx - 10, y0: 125, x1: fx + 10, y1: 141 };
  if (j === 'kukkiri') s.labelNear(LABEL.kukkiri, near, ['left', 'aboveLeft', 'right', 'above'], 'shu', 700, false, 3 * FRAME);
  if (j === 'kasure') s.labelNear(LABEL.kasure, near, ['left', 'aboveLeft', 'right', 'above'], 'gray', 700, true, 3 * FRAME);
  yield 300;
  yield* s.say(fillAll(SYS.hanamaru, { target: t.name }));
  if (wasDown && t.alive) yield* s.say(fillAll(SYS.revived, { target: t.name }));
}

function* hankoYarinaoshi(s: BattleScene, e: EnemyUnit, j: Judge, partId?: string): Co {
  s.sfx('se_rewind', { grade: sfxGrade(j) });
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
    // the struck-through sticky sits where drawEnemyExtras drew it
    let hx = e.x;
    let hy = e.headY - 26;
    if (hy < STAGE_TOP) {
      hy = Math.max(STAGE_TOP + 4, e.top + Math.round(e.sizeH * 0.3));
      hx = e.x + e.sizeW / 2 + 20;
      if (hx + 26 > 381) hx = e.x - e.sizeW / 2 - 20;
    }
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
      bokemakeLabel(s, e);
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
      g.img(img, 304 - img.width / 2, Math.round(back.y - img.height));
    },
  });
  for (let i = 0; i <= 8; i++) {
    back.y = 230 - 88 * ease.backOut(i / 8);
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
    back.y = 142 + 88 * ease.quadIn(i / 8);
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
      g.img(img, 304 - img.width / 2, Math.round(back.y - img.height));
    },
  });
  for (let i = 0; i <= 8; i++) {
    back.y = 230 - 88 * ease.backOut(i / 8);
    yield null;
  }
  s.msgInteractive = true;
  s.msg.post(SYS.kane[0]);
  back.frame = 'hit';
  yield 120;
  s.sfx('se_bell_dud');
  back.frame = 'idle';
  yield () => !s.msg.busy;
  // Lv6 (51 3.5): one time in four, a small 「コン」 — no crow, キレ+2
  if (kaneKon(s, u)) {
    muteMusic(0.3);
    s.freezeLook = { t: 0, x: 304 + 26, y: 96 };
    s.freezeMs = 300;
    yield null;
    s.freezeLook = null;
    konRing(s, 304, Math.round(back.y) - 30);
    const bangK = kireIcon(true, true);
    for (let i = 0; i < 2; i++) {
      s.addFx({
        layer: 'top',
        dur: 900 + i * 80,
        ui: true,
        draw: (g, t) => {
          const tt = t - i * 80;
          if (tt < 0) return;
          const sc = tt < 90 ? 1.8 - 0.8 * (tt / 90) : 1;
          const w = bangK.width * sc;
          const h = bangK.height * sc;
          const bx = 304 + 8 + i * 12;
          const by = Math.round(back.y) - 62 - (tt < 90 ? 0 : Math.min(3, (tt - 90) / 60));
          g.alpha(tt > 700 ? (900 - tt) / 200 : 1, () => g.ctx.drawImage(bangK, Math.round(bx - w / 2), Math.round(by - h / 2), Math.round(w), Math.round(h)));
        },
      });
    }
    yield* s.say(SYS2.kaneKon.slice(0, 1));
    addKire(s, 2);
    yield* s.say(SYS2.kaneKon.slice(1));
    s.msgInteractive = false;
    for (let i = 0; i <= 8; i++) {
      back.y = 142 + 88 * ease.quadIn(i / 8);
      yield null;
    }
    fx.done = true;
    const fullK = kireFullPages(s);
    if (fullK.length) yield* s.say(fullK);
    else yield 200;
    return;
  }
  // the whole screen stops for 0.3s (background, enemies, music): the frame
  // freezes grey, and the silence gets its manga lettering beside the bell
  muteMusic(0.3);
  s.freezeLook = { t: 0, x: 304 + 26, y: 96 };
  s.freezeMs = 300;
  yield null;
  s.freezeLook = null;
  // a crow crosses right → left just under the band, beak first, and caws
  // ("カア") once it is well on screen — back-lit in pale gold so it reads on
  // any background (the mall ceiling is its own colour)
  const crowSt = { x: 400, cawT: -1, cawX: 0 };
  const crowY = s.msg.bottom + 6;
  const kaa = mangaLettering('カア');
  s.addFx({
    layer: 'top',
    dur: 1500,
    ui: true,
    draw: (g, t) => {
      const img = crowLit(Math.floor(t / 90));
      const y = crowY + Math.round(Math.sin(t / 160) * 2);
      g.img(img, Math.round(crowSt.x), y);
      if (crowSt.cawT >= 0) {
        const ct = t - crowSt.cawT;
        if (ct < 700) {
          // the caw pops out right behind the crow and trails after it at
          // half its speed, floating up a little as it fades
          const sc = ct < 60 ? 1.4 - 0.4 * (ct / 60) : 1;
          const w = kaa.width * sc;
          const h = kaa.height * sc;
          const kx = crowSt.x + 22 + (crowSt.cawX - crowSt.x) * 0.55;
          const ky = crowY + 4 - h / 2 - Math.min(5, ct / 70);
          g.alpha(ct > 500 ? (700 - ct) / 200 : 1, () => g.ctx.drawImage(kaa, Math.round(kx), Math.round(ky), Math.round(w), Math.round(h)));
        }
      }
    },
    update(dt) {
      crowSt.x -= dt * 0.33;
      if (crowSt.cawT < 0 && crowSt.x < 262) {
        crowSt.cawT = this.t;
        crowSt.cawX = crowSt.x;
        s.sfx('se_crow');
      }
    },
  });
  yield* s.say([SYS.kane[1]]);
  // the flop lands: the kire "!" lights (with its pop and se_kire_up) as the
  // line saying so appears — and a little "!" pops over Kanenari-kun's bell
  const [px, py] = PANEL_POS[u.id];
  s.addFx({ layer: 'top', dur: 700, ui: true, draw: (g, t) => g.alpha(1 - t / 700, () => g.img(sweatDrop(), px + 34, py + 6 + Math.round(t / 70))) });
  const bang = kireIcon(true, true);
  s.addFx({
    layer: 'top',
    dur: 900,
    ui: true,
    draw: (g, t) => {
      const sc = t < 90 ? 1.8 - 0.8 * (t / 90) : 1;
      const w = bang.width * sc;
      const h = bang.height * sc;
      const bx = 304 + 14;
      const by = Math.round(back.y) - 62 - (t < 90 ? 0 : Math.min(3, (t - 90) / 60));
      g.alpha(t > 700 ? (900 - t) / 200 : 1, () => g.ctx.drawImage(bang, Math.round(bx - w / 2), Math.round(by - h / 2), Math.round(w), Math.round(h)));
    },
  });
  addKire(s, 1);
  yield* s.say([SYS.kane[2]]);
  s.msgInteractive = false;
  for (let i = 0; i <= 8; i++) {
    back.y = 142 + 88 * ease.quadIn(i / 8);
    yield null;
  }
  fx.done = true;
  const full = kireFullPages(s);
  if (full.length) yield* s.say(full);
  else yield 200;
}

// ---- items ---------------------------------------------------------------------------------

export function* doItem(s: BattleScene, u: PartyUnit, itemId: string, target0: PartyUnit | null): Co {
  const it = getItem(itemId);
  if (!it) return;
  if (!state.inventory.includes(itemId)) return;
  // the はなまるトマト held up (51 10.3): a key item, never used up
  if (it.special === 'tomato') {
    yield* raiseTomato(s, u);
    return;
  }
  // ハトの名刺 to ヘノヘノ課長 (51 6.2): he draws a troubled face — ボケ負け
  if (itemId === 'item_hato_meishi') {
    const kacho = s.aliveEnemies.find((e) => e.id === 'enemy_henoheno_kacho');
    if (kacho) yield* hatoMeishiKacho(s, kacho);
    return;
  }
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
  // handing it over names the giver and the receiver; Kanenari-kun's own
  // reaction (the zipper…) follows when he is the one who gets it
  // (ゆでとうもろこし: the second eater's line follows once both are healed)
  const selfPages = it.special === 'corn' ? (text?.self ?? []).slice(0, 1) : text?.self;
  const first = giving
    ? [...fillAll(SYS.itemGive, v), ...(toKanenari && text?.kanenari ? text.kanenari : [])]
    : toKanenari && text?.kanenari
      ? text.kanenari
      : fillAll(selfPages ?? SYS.itemSelf, v);
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
      // 朱肉 only goes into Minato (梅干し given to Kanenari-kun: just sour)
      if (def.mp && d.m.maxMp > 0) healParty(s, d, def.mp, { mp: true });
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
  } else if (it.special === 'umeboshi' && target && !(it.cure ?? []).some((c) => target.has(c))) {
    // nothing to wake from: sour all the same (the 朱肉 still goes in for Minato)
    apply(itemId, dests);
    yield 300;
    yield () => !s.msg.busy;
    if (!toKanenari) yield* s.say(text!.extra!.none);
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
  if (it.special === 'corn' && text!.self.length > 1) out.unshift(...text!.self.slice(1));
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
  // QA round 3: the command has a body — the panels scurry 7px to the right
  // (120ms) with two quick steps, then either run off or come back
  const runners = s.party.filter((p) => p.alive);
  const slide = (to: number, ms: number, fn: (k: number) => number) => {
    const from = runners.map((p) => p.slideX);
    s.addFx({ layer: 'top', dur: ms, ui: true, draw: () => {}, update() {
      const k = fn(Math.min(1, this.t / ms));
      runners.forEach((p, i) => (p.slideX = from[i] + (to - from[i]) * k));
      if (this.t >= ms - 1) runners.forEach((p) => (p.slideX = to));
    } });
  };
  slide(7, 120, ease.quadOut);
  s.sfx('se_step_asphalt', { pitch: 1.3 });
  s.sfxLater('se_step_asphalt', { pitch: 1.45, vol: 0.8 }, 90);
  yield 350;
  if (rng.next() < rate) {
    s.sfx('se_flee');
    musicFlee();
    // off the right edge
    slide(420, 300, ease.quadIn);
    for (let i = 0; i <= 10; i++) {
      for (const p of s.party) p.drop = 8 * (i / 10);
      yield null;
    }
    yield* s.say(SYS.nigeruOk);
    return true;
  }
  s.memo.fleeFails = fails + 1;
  const who = u.alive ? u : runners[0] ?? u;
  if (fails % 2 === 0) {
    // 〔ビーサンが 脱げた〕: the sandal flies off the panel, lands on its
    // top edge with a ぽてっ and a hop, the panels skid back
    const img = beachSandal();
    const [px, py] = s.panelXY(who);
    const st = { x: px + 30 + who.slideX, y: py - 2, vx: -46, vy: -150, rot: 0, bounced: 0, rest: 0 };
    s.sfx('se_whiff');
    s.addFx({
      layer: 'top',
      dur: 1500,
      ui: true,
      update(dt) {
        const k = dt / 1000;
        if (st.rest) return;
        st.vy += 620 * k;
        st.x += st.vx * k;
        st.y += st.vy * k;
        st.rot += st.vx * k * 0.2;
        const floor = py - 1;
        if (st.y >= floor && st.vy > 0) {
          st.y = floor;
          if (st.bounced >= 1) {
            st.rest = 1;
            st.rot = 0;
            return;
          }
          st.bounced++;
          st.vy = -70;
          st.vx *= 0.5;
          sfx('se_poton', { pitch: 1.15, pan: who.id === 'kanenari' ? 0.35 : -0.25 });
        }
      },
      draw: (g, t) => {
        const a = t > 1250 ? Math.max(0, (1500 - t) / 250) : 1;
        // flipped over while it tumbles, sole-up on its first bounce
        const flip = !st.rest && Math.floor(st.rot) % 2 !== 0;
        g.alpha(a, () => g.img(img, Math.round(st.x - img.width / 2), Math.round(st.y - img.height), { flipX: flip }));
      },
    });
    yield 140;
    slide(-2, 110, ease.quadIn);
    yield 110;
    slide(0, 120, ease.quadOut);
    for (const p of runners) p.squishT = 200;
  } else {
    // 〔逃げ道を まちがえた〕: they run into something and bounce back
    slide(11, 90, ease.quadIn);
    yield 90;
    s.sfx('se_bump');
    for (const p of runners) {
      p.shakeT = 167;
      p.shakeAmp = 2;
    }
    slide(0, 180, ease.backOut);
  }
  yield* s.say(fails % 2 === 0 ? SYS.nigeruFail1 : SYS.nigeruFail2);
  return false;
}

// ---- ノリツッコミ (16.10) -------------------------------------------------------------------

/**
 * Where Kanenari-kun performs: the x in 244–350 farthest from every standing
 * enemy (the dimmed audience). When even that is crowded (three enemies) he
 * stands 8px in front at 85% so he reads as the one on stage.
 */
export function noriSpot(s: BattleScene): { x: number; foot: number; sc: number } {
  // clearance beyond ~90px doesn't matter: then the nearer to x296 the better
  // (the notes and the banner need room on both sides)
  const xs = s.aliveEnemies.map((e) => e.x);
  let best = 296;
  let bestD = -1;
  // (≤ x334 keeps the flip board and the notes on screen)
  for (let x = 244; x <= 334; x += 2) {
    const d = Math.min(90, xs.length ? Math.min(...xs.map((ex) => Math.abs(ex - x))) : 999);
    if (d > bestD + 0.5 || (Math.abs(d - bestD) <= 0.5 && Math.abs(x - 296) < Math.abs(best - 296))) {
      bestD = d;
      best = x;
    }
  }
  const crowded = bestD < 56;
  return { x: best, foot: crowded ? 138 : 132, sc: crowded ? 0.85 : 1 };
}

export function* doNori(s: BattleScene): Co {
  const first = !s.memo.noriCount;
  s.memo.noriCount = (s.memo.noriCount ?? 0) + 1;
  // 星見台 adds ボケD: straw on his head, the scarecrow (50 6.9, 51 14.13)
  const bokes = s.hoshi ? [...NORI, NORI_HOSHI] : NORI;
  let pick = rng.int(0, bokes.length - 1);
  if (pick === s.memo.noriLast) pick = (pick + 1) % bokes.length;
  // QA: __game.cmd.bnori(n) picks the boke (1 sing, 2 flag, 3 flip, 4 scarecrow)
  if (s.memo.noriForce) pick = (s.memo.noriForce - 1) % bokes.length;
  s.memo.noriLast = pick;
  const nori = bokes[pick];
  // 0: the three "!" fly to the centre, screen darkens
  s.sfx('se_kire_full');
  const bang = kireIcon(true, true);
  s.addFx({
    layer: 'top',
    dur: 230,
    ui: true,
    draw: (g, t) => {
      // the three "!" leave the tab and pile up in the middle, then flash away
      const p = ease.quadIn(Math.min(1, t / 150));
      const sc = t < 150 ? 1 + p : 2 + (t - 150) / 40;
      const a = t < 150 ? 1 : Math.max(0, 1 - (t - 150) / 80);
      for (let i = 0; i < 3; i++) {
        const [ix, iy] = kireIconXY(i);
        const x = ix + (187 - ix) * p;
        const y = iy + (96 - iy) * p;
        const w = bang.width * sc;
        const h = bang.height * sc;
        g.alpha(a, () => g.ctx.drawImage(bang, Math.round(x + 5 - w / 2), Math.round(y + 7 - h / 2), Math.round(w), Math.round(h)));
      }
    },
  });
  resetKire(s);
  // darken (0–150ms), then ease off as the performers take the stage
  const dark = { a: 0, off: false };
  const darkFx = s.addFx({
    layer: 'world',
    dur: 0,
    draw: (g) => g.rect(0, 0, 384, 216, '#0B0B14', dark.a),
    update() {
      // the enemies stay dimmed while Kanenari-kun performs (he is the stage)
      if (dark.off) dark.a = Math.max(0, dark.a - 0.1);
      else dark.a = this.t < 150 ? 0.5 * (this.t / 150) : 0.5;
    },
  });
  yield 150;
  // the manga panel (focus lines, performer, lettering, photo) dissolves
  // away through a 4×4 dither at the end instead of cutting in one frame
  const dis = { k: 0 };
  // 150–350: background switches to vermilion focus lines + sunset band
  const bgFx = s.addFx({
    layer: 'back',
    dur: 0,
    draw: (g0, t) => ditherDraw(g0, dis.k, (g) => {
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
    }),
  });
  duckMusic(0.25, first ? 2.6 : 1.5);
  yield 200;
  // 350–1350 (or a 400ms cut): the boke. Kanenari-kun slides in from the
  // right into a warm spotlight (placed in the widest gap between the dimmed
  // enemies; in front and a little smaller when the stage is full), hops once,
  // hits his landing pose for 2 frames, then performs.
  const spot = noriSpot(s);
  const kf = { x: 440, hop: 0, sq: 0, pose: 'kime', t0: 0, board: 0, boardT: -1, leave: 0 };
  const notes: { x: number; y: number; vx: number; t: number; i: number }[] = [];
  const board = noriBoard(['（中の人', 'より）']);
  const bodyCx = (pose: string) => (pose === 'flag' ? FLAG_PAD.x : 0) + 28;
  const bokeFx = s.addFx({
    layer: 'top',
    dur: 0,
    update(dt) {
      for (const n of notes) {
        n.t += dt;
        n.x += (n.vx * dt) / 1000;
        n.y -= (26 * dt) / 1000;
      }
      for (let i = notes.length - 1; i >= 0; i--) if (notes[i].t > 900) notes.splice(i, 1);
    },
    draw: (g0, t) => ditherDraw(g0, dis.k, (g) => {
      const ctx = g.ctx;
      const sc = spot.sc;
      const lx = Math.round(kf.x);
      const top = s.msg.bottom;
      // the spotlight: a soft cone from under the band to a pool on the floor
      ctx.save();
      ctx.globalAlpha = 0.26;
      ctx.fillStyle = '#FFE7A3';
      ctx.beginPath();
      ctx.moveTo(lx - 12, top);
      ctx.lineTo(lx + 12, top);
      ctx.lineTo(lx + 40 * sc, spot.foot + 2);
      ctx.lineTo(lx - 40 * sc, spot.foot + 2);
      ctx.fill();
      ctx.globalAlpha = 0.18;
      ctx.beginPath();
      ctx.moveTo(lx - 6, top);
      ctx.lineTo(lx + 6, top);
      ctx.lineTo(lx + 24 * sc, spot.foot + 2);
      ctx.lineTo(lx - 24 * sc, spot.foot + 2);
      ctx.fill();
      ctx.globalAlpha = 0.4;
      for (let yy = -3; yy <= 3; yy++) {
        const hw = Math.round(40 * sc * Math.sqrt(1 - (yy * yy) / 10));
        ctx.fillRect(lx - hw, spot.foot + yy, hw * 2, 1);
      }
      ctx.restore();
      // everything he does passes behind the band (the banner's tip, the notes)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, top + 2, 384, 216 - top - 2);
      ctx.clip();
      // the performer (squash on landings, anchored on his feet)
      const img = kanenariFront(kf.pose, t - kf.t0);
      const sx = sc * (1 + 0.14 * kf.sq);
      const sy = sc * (1 - 0.12 * kf.sq);
      const w = img.width * sx;
      const h = img.height * sy;
      const x = lx - bodyCx(kf.pose) * sx;
      // with the flip board up, he rises onto his toes if the board would
      // otherwise reach down into the tape row (the 85% stand in front)
      const raise = kf.boardT >= 0 ? Math.max(0, Math.round(spot.foot - 42 * sc + board.height - 142)) : 0;
      const y = spot.foot - kf.hop - raise - h;
      g.alpha(1 - kf.leave, () => ctx.drawImage(img, Math.round(x), Math.round(y), Math.round(w), Math.round(h)));
      // the flip board, flipped round into view in front of his tummy
      if (kf.boardT >= 0) {
        const bt = t - kf.boardT;
        const k = Math.min(1, bt / 110);
        // (the board keeps its size even when he stands smaller: it has to be read)
        const bw = board.width * Math.max(0.06, Math.abs(Math.cos((1 - k) * Math.PI * 0.5)));
        const bh = board.height;
        // held up in front of him, his eyes and cheeks peeking over the top;
        // on every other beat he thrusts it up 3px at the audience ("ジャン")
        const beat = k >= 1 ? Math.floor((bt - 110) / 300) % 2 : 0;
        // the clip sits on his chin: the board's top edge just under his cheeks
        const by = Math.round(spot.foot - 42 * sc - raise - kf.hop - beat * 3);
        g.alpha(1 - kf.leave, () => ctx.drawImage(board, Math.round(lx - bw / 2), by, Math.round(bw), Math.round(bh)));
        const bt2 = (bt - 110) % 600;
        if (k >= 1 && beat && bt2 >= 300 && bt2 < 420 && kf.leave === 0) {
          // emphasis strokes off the two top corners of the board
          const x0 = Math.round(lx - bw / 2) + 6;
          const x1 = Math.round(lx + bw / 2) - 7;
          const y0 = by + 3;
          for (const [ax, dir] of [[x0, -1], [x1, 1]] as [number, number][])
            for (const [dx, dy] of [[6, -1], [5, -5], [1, -7]] as [number, number][])
              g.line(ax + dir * Math.round(dx * 0.45), y0 + Math.round(dy * 0.45) - 2, ax + dir * dx, y0 + dy - 2, '#FFF6D8');
        }
      }
      // notes rising from the hand-bell microphone
      for (const n of notes) {
        const a = n.t < 700 ? 1 : 1 - (n.t - 700) / 200;
        const im = musicNote(n.i);
        const wob = Math.round(Math.sin(n.t / 90 + n.i) * 2);
        g.alpha(Math.max(0, a), () => g.img(im, Math.round(n.x + wob - im.width / 2), Math.round(n.y - im.height / 2)));
      }
      ctx.restore();
    }),
  });
  const bokeMs = first ? 1000 : 400;
  s.msgInteractive = false;
  s.msg.replace(first ? nori.boke : nori.boke.slice(-1));
  const slideMs = first ? 150 : 100;
  const hopMs = first ? 120 : 0;
  let singLoop: ReturnType<typeof sfxLoop> | null = null;
  let noteN = 0;
  let lastNote = -999;
  let lastFlag = -1;
  for (let t = 0; t < bokeMs; t += FRAME) {
    if (t < slideMs) {
      const p = ease.quadOut(t / slideMs);
      kf.x = 440 + (spot.x - 440) * p;
      kf.hop = Math.round(Math.sin(p * Math.PI) * 6);
    } else if (t < slideMs + hopMs) {
      // one little bounce on arrival
      const p = (t - slideMs) / hopMs;
      kf.x = spot.x;
      kf.hop = Math.round(Math.sin(p * Math.PI) * 4);
      kf.sq = p < 0.2 ? 1 - p / 0.2 : 0;
    } else if (kf.pose === 'kime') {
      kf.x = spot.x;
      kf.hop = 0;
      kf.sq = 1;
      // the landing pose holds for two frames, then the bit starts
      yield null;
      kf.sq = 0;
      yield null;
      t += 2 * FRAME;
      kf.pose = nori.pose;
      kf.t0 = bokeFx.t;
      // 40_audio 13.3: each boke has its own sound (cut by the tsukkomi)
      if (nori.pose === 'sing') singLoop = sfxLoop('se_nori_sing');
      else if (nori.pose === 'flag') s.sfx('se_nori_flag');
      else if (nori.pose === 'kakashi') {
        // the straw drops on him with a whump; arms out like the crossbar, on one leg
        s.sfx('se_umbrella_open', { pitch: 0.7 });
        for (let i = 0; i < 6; i++) s.burst(kf.x + rng.int(-10, 10), spot.foot - 56 * spot.sc, { count: 1, speed: [20, 60], angle: [Math.PI * 0.2, Math.PI * 0.8], life: [300, 520], colors: ['#E8C878'], gravity: 260, shape: 'img', img: straw(i) }, true);
      } else {
        s.sfx('se_flip');
        kf.boardT = bokeFx.t;
      }
    } else {
      const pt = bokeFx.t - kf.t0;
      if (nori.pose === 'sing' && pt - lastNote >= 150) {
        // a note leaves the microphone and floats up and out — two to the
        // left, one over the top of his bell to the right (never over his face)
        lastNote = pt;
        const right = noteN % 3 === 2;
        const mx = kf.x - bodyCx('sing') * spot.sc + MIC_AT[0] * spot.sc;
        const my = spot.foot - 68 * spot.sc + MIC_AT[1] * spot.sc;
        if (right) notes.push({ x: kf.x + 6, y: spot.foot - 70 * spot.sc, vx: 26, t: 0, i: noteN });
        else notes.push({ x: mx - 7, y: my - 4, vx: -(22 + (noteN % 3) * 10), t: 0, i: noteN });
        noteN++;
      }
      if (nori.pose === 'flag') {
        // a puff of dust at his feet on every swing
        const f = Math.floor(pt / 110) % 4;
        if (f !== lastFlag && (f === 0 || f === 2)) s.burst(kf.x + (f ? 10 : -10), spot.foot, { count: 2, speed: [15, 35], angle: [-Math.PI * 0.9, -Math.PI * 0.1], life: [200, 300], colors: ['#F7C27A', '#FFE7A3'], shape: 'sq', size: [1, 2] });
        lastFlag = f;
      }
    }
    yield null;
  }
  if (!first) {
    // the short cut: he pops off as fast as he came
    for (let i = 0; i < 6; i++) {
      kf.x += 30;
      kf.leave = i / 6;
      yield null;
    }
  }
  // the "間": complete silence (the boke's own sound is cut)
  singLoop?.stop(0.02);
  muteMusic(first ? 0.15 : 0.1);
  yield first ? 150 : 100;
  bokeFx.done = !first ? true : bokeFx.done;
  // 1500: tsukkomi — Minato's face ×2 slides in from the lower left, under
  // the lettering (never behind it); the two tiers slam down to the right
  const face = portrait('minato', 'tsukkomi', { size: 64 });
  const upper = kakimojiSmall('……って、');
  const lower = kakimoji(nori.line, true, s.seed + pick);
  const LOW_Y = 66;
  const lowCx = Math.max(Math.round(lower.width / 2) + 2, Math.min(382 - Math.round(lower.width / 2), 208));
  // the ノリツッコミ line in the band as the cut-in lands (QA round 2: the
  // enemy's last flavour line was still up there)
  s.msg.replace(NORI_COMMON[0]);
  const letterRect = { x0: Math.round(lowCx - lower.width / 2), y0: LOW_Y - 18, x1: Math.round(lowCx + lower.width / 2) + 2, y1: LOW_Y + lower.height };
  const tsFx = s.addFx({
    layer: 'top',
    dur: 0,
    // the numbers pop over the panel, but never on the lettering
    block: () => (dis.k >= 1 ? null : letterRect),
    draw: (g0, t) => ditherDraw(g0, dis.k, (g) => {
      // the photo: 64×64 in a paper frame at (8,110), taped on two corners;
      // it jolts 2px when the lettering lands
      const jolt = t >= 60 && t < 180 ? Math.round(Math.sin((t - 60) / 12) * 2) : 0;
      const fx = Math.round(-80 + Math.min(1, t / 80) * 88) + jolt;
      const fy = 112;
      g.rect(fx + 3, fy + 4, 70, 70, C.shadow, 0.5);
      g.rect(fx - 3, fy, 70, 70, C.paper);
      g.frame(fx - 3, fy, 70, 70, C.grid);
      if (face) g.ctx.drawImage(face, fx, fy + 3, 64, 64);
      else g.text('ミ', fx + 32, fy + 26, { color: C.ink, align: 'center' });
      g.img(tapeCanvas(18, 7, '', C.tape, 3), fx - 8, fy - 2);
      g.img(tapeCanvas(18, 7, '', C.tape, 5), fx + 54, fy + 64);
      // two tiers under the band: "……って、" small on top, the line
      // slammed down underneath, clear of the photo
      const sc = t < 60 ? 1.5 - 0.5 * (t / 60) : 1;
      const sh = t >= 60 && t < 300 ? Math.round(Math.sin(t / 9) * 1) : 0;
      const w = lower.width * sc;
      const h = lower.height * sc;
      const lx = lowCx - lower.width / 2;
      g.img(upper, Math.round(lx + 6), LOW_Y - 18);
      g.ctx.drawImage(lower, Math.round(lowCx - w / 2 + sh), Math.round(LOW_Y + (lower.height - h) / 2), Math.round(w), Math.round(h));
    }),
  });
  s.sfx('se_bishi', { vol: 1.3 });
  yield first ? 200 : 100;
  // 1700 / 900: impact on every enemy
  const targets = s.aliveEnemies;
  s.hitstop(16);
  // white 2f (the second one lighter, so the struck silhouettes already show)
  s.flash('#FFF6D8', 0.55, 1);
  s.flash('#FFF6D8', 0.55, 2);
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
  // the enemies come out of the dimming at once: this is their hit
  dark.off = true;
  dark.a = 0;
  targets.forEach((e, i) => {
    e.whiteFrames = 5;
    noriStruck(s, e);
    if (e.def.invulnerable) return;
    const dmg = fixedDamage((atkM + atkK) * 2.5, attrMul(e, 'wara'));
    if (hurtEnemy(s, e, dmg, { big: true, stack: 0, noNumber: true })) killed.push(e);
    else e.status.bokemake = true;
    // QA round 2: the numbers pop right after the flash, over the manga
    // panel — under the lettering, over the struck bodies — not after the
    // background has come back
    const nx = Math.round(e.def.boss ? e.coreX + 36 : e.coreX);
    const ny = Math.max(letterRect.y1 + NUM_BIG_H + 16 + 2, Math.min(e.footY - 4, 144));
    s.number(nx, ny, dmg, { big: true, delay: 3 * FRAME + i * 60, backing: true }, 'enemy', e);
  });
  yield first ? 260 : 160;
  // the panel dissolves (6 frames) back to the battle
  for (let i = 1; i <= 6; i++) {
    dis.k = i / 6;
    yield null;
  }
  tsFx.done = true;
  bokeFx.done = true;
  bgFx.done = true;
  darkFx.done = true;
  yield () => !s.msg.busy;
  if (killed.length) {
    // everyone who fell shrinks together, dropping 100ms apart
    yield* killSequence(s, killed);
    if (s.aliveEnemies.length) yield* s.say(NORI_COMMON.slice(1));
  } else yield* s.say(NORI_COMMON.slice(1));
}

/** Height of a big damage number (for placing them under the lettering). */
const NUM_BIG_H = 19;

/**
 * An enemy struck by the ノリツッコミ: through the 16f hitstop (in real
 * time) it squashes flat, springs up 7px stretched, lands with a small
 * squash and is shoved back 5px — so the hit has a body, under the lettering.
 */
function noriStruck(s: BattleScene, e: EnemyUnit): void {
  s.addFx({
    layer: 'back',
    dur: 420,
    ui: true,
    draw: () => {},
    update() {
      if (e.dying) {
        this.done = true;
        return;
      }
      const t = this.t;
      if (t < 60) {
        e.sy = 0.76;
        e.sx = 1.2;
        e.offY = 0;
        e.offX = 5;
      } else if (t < 230) {
        const p = (t - 60) / 170;
        e.offY = -Math.round(Math.sin(p * Math.PI) * 7);
        e.sy = 1.1 - 0.1 * p;
        e.sx = 0.94 + 0.06 * p;
        e.offX = 5;
      } else if (t < 290) {
        const p = (t - 230) / 60;
        e.offY = 0;
        e.sy = 0.9 + 0.1 * p;
        e.sx = 1.08 - 0.08 * p;
      } else {
        const p = Math.min(1, (t - 290) / 130);
        e.sx = e.sy = 1;
        e.offX = Math.round(5 * (1 - ease.quadOut(p)));
      }
      if (t >= 415) {
        e.offX = e.offY = 0;
        e.sx = e.sy = 1;
      }
    },
  });
}

let ditherBuf: [HTMLCanvasElement, CanvasRenderingContext2D] | null = null;
const ditherPats: (CanvasPattern | null)[] = [];

/**
 * Draw `fn` dissolved by `k` (0 = whole, 1 = gone) through a 4×4 Bayer
 * pattern: rendered to a scratch canvas, the pattern's cells punched out.
 */
function ditherDraw(g: Gfx, k: number, fn: (g: Gfx) => void): void {
  if (k <= 0) {
    fn(g);
    return;
  }
  if (k >= 1) return;
  ditherBuf ??= makeCanvas(384, 216);
  const [c, ctx] = ditherBuf;
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, 384, 216);
  ctx.save();
  fn(new Gfx(ctx, 384, 216));
  ctx.restore();
  const lv = Math.max(1, Math.min(15, Math.round(k * 16)));
  let pat = ditherPats[lv];
  if (!pat) {
    const [pc, pctx] = makeCanvas(4, 4);
    pctx.fillStyle = '#000';
    for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) if (BAYER4[y][x] < lv) pctx.fillRect(x, y, 1, 1);
    pat = ctx.createPattern(pc, 'repeat');
    ditherPats[lv] = pat;
  }
  ctx.globalCompositeOperation = 'destination-out';
  ctx.fillStyle = pat!;
  ctx.fillRect(0, 0, 384, 216);
  ctx.globalCompositeOperation = 'source-over';
  g.ctx.drawImage(c, 0, 0);
}

export { hitFeel as enemyHitFeel };
export { waitFrames };
export { tsukkomiWindows };
