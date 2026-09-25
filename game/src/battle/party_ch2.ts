// Chapter-2 party actions (51 3.5, 5.1, 6章, 8.3, 14.1, 14.7, 14.14):
// the おつかれさま hanko, the Lv7 はみだしペケ, the Lv6 「コン」 of the bell,
// the shock a 打 hit on ビリビリ番 gives back, and the new items (the boiled
// corn for everyone, 梅干し, 回覧板の朱肉, ハトの名刺 on ヘノヘノ課長).

import type { Co } from '../engine/co';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { fillAll, getItem, LABEL, SYS2 } from '../data/battle';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import { fixedDamage, sfxGrade, type EnemyUnit, type Judge, type PartyUnit } from './model';
import { arrows, hurtEnemy, knock } from './common';
import { bokemakeLabel } from './tsukkomi';
import { ovalStamp } from './art/stamps';
import { thickLine } from './art/fxart';
import { bolt, steamLine } from './art/fxart_ch2';
import { PANEL_POS } from './ui/panels';
import { C } from './ui/note';

// ---- おつかれさま (5.1, 14.1) ------------------------------------------------------------------

/** Can おつかれさま be pressed on this enemy now? ('' = yes, else why not). */
export function otsukareBlock(s: BattleScene, e: EnemyUnit): '' | 'resting' | 'after' {
  if ((e.status.kyuukei ?? 0) > 0 || e.mem.restEnded) return 'resting';
  if (e.status.restImmuneRound === s.round) return 'after';
  return '';
}

/**
 * The oval 「おつかれさま」 (64×24) drops onto the core (90ms), lands soft
 * (smaller shake than an attack: it rests, not hits), shrinks to a 28×12
 * decal; three threads of steam rise off it; the enemy sinks into its rest
 * pose and the 休憩中 tape pats on — or it shakes its head.
 */
export function* hankoOtsukaresama(s: BattleScene, u: PartyUnit, e: EnemyUnit, j: Judge): Co {
  s.memo.otsukareUsed = 1;
  s.memo.otsukareTut = 0;
  const img = ovalStamp('おつかれさま', 64, 24, j === 'kasure' ? 0.4 : 0.04, 6);
  const x = e.coreX;
  const y = e.coreY;
  const st = { p: 0 };
  const drop = s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g) => {
      const cy = -img.height + (y + img.height) * ease.cubicIn(st.p);
      g.img(img, Math.round(x - img.width / 2), Math.round(cy - img.height / 2));
    },
  });
  for (let i = 1; i <= 5; i++) {
    st.p = i / 5;
    yield null;
  }
  drop.done = true;
  // the landing: gentler than an attacking stamp (14.1)
  if (j === 'kukkiri') {
    s.hitstop(8);
    s.shake(2, 2, 8);
    e.whiteFrames = 1;
    s.shuDrops(x, y, 8);
    s.burst(x, y, { count: 6, speed: [40, 110], life: [500, 800], colors: ['#9BCB6B', '#5FA85A'], gravity: 90, drag: 1.4, shape: 'sq', size: [2, 2], sizeEnd: 1 });
    s.sfx('se_stamp_heavy');
    s.labelUpRight(LABEL.kukkiri, x, y, 'shu', 700);
  } else if (j === 'futsuu') {
    s.hitstop(5);
    s.shake(1, 1, 6);
    s.shuDrops(x, y, 6);
    s.sfx('se_stamp');
  } else {
    s.hitstop(3);
    s.shuSplash(x, y, 4, true);
    s.sfx('se_stamp_light');
    s.labelUpRight(LABEL.kasure, x, y, 'gray', 700, true);
  }
  s.sfx('se_h_otsukare', { grade: sfxGrade(j), vol: j === 'kasure' ? 0.7 : 1 });
  // 64 → 28 in 150ms, then a decal
  s.addFx({
    layer: 'top',
    dur: 150,
    draw: (g, t) => {
      const k = 1 - (1 - 28 / 64) * ease.quadOut(t / 150);
      const w = Math.round(img.width * k);
      const h = Math.round(img.height * k);
      g.ctx.drawImage(img, Math.round(x - w / 2), Math.round(y - h / 2), w, h);
    },
  });
  yield 150;
  e.decals.push({ kind: 'otsukare', x: e.def.core[0] + rng.int(-4, 4), y: e.def.core[1] + rng.int(-4, 4), variant: rng.int(0, 2), kasure: j === 'kasure' });
  if (e.decals.length > 5) e.decals.shift();
  // +100ms: three wavy threads of steam rise off the seal and fade (600ms)
  for (let i = 0; i < 3; i++) {
    const sx = x - 8 + i * 8;
    s.addFx({
      layer: 'top',
      dur: 700,
      draw: (g, t) => {
        if (t < 100 + i * 60) return;
        const p = (t - 100 - i * 60) / 600;
        if (p >= 1) return;
        const im = steamLine(i);
        g.alpha(0.7 * (1 - p), () => g.img(im, Math.round(sx + Math.sin(p * 6 + i) * 1.5), Math.round(y - 10 - p * 16 - im.height)));
      },
    });
  }
  yield 150;
  // success? (4.3): テツヤ always; the boss never; else 100 / 75 / 50 %
  const boss = e.def.restActions === 0;
  const ok = !boss && (!!e.def.restAlways || rng.next() < (j === 'kukkiri' ? 1 : j === 'futsuu' ? 0.75 : 0.5));
  if (boss) {
    // 「……まだ、休めません。」 (the last hanko's foreshadowing)
    e.setPose('refuse');
    yield 200;
    yield* s.say(e.def.texts.extra.otsukare ?? SYS2.otsukareBoss, false, e.def.id === 'boss_yobimodoshi' ? { voice: 'yobimodoshi' } : {});
    e.setPose('idle');
    return;
  }
  if (!ok) {
    e.setPose('refuse');
    yield 400;
    e.setPose('idle');
    yield* s.say(fillAll(SYS2.otsukareFail, { enemy: e.name }));
    return;
  }
  const n = e.def.restActions ?? 1;
  e.status.kyuukei = n;
  e.status.kyuukeiSkipped = 0;
  // the charge goes out of it (溜めも消える)
  if (e.status.tame) {
    e.status.tame = undefined;
    e.status.stareAt = undefined;
    e.mem.chargeEnd = e.mem.acts ?? 0;
    s.bg.flags.charge = 0;
  }
  if (e.status.tetsuya) {
    // 徹夜 is broken: its まもり steps go back to 0 (a blue arrow, no text)
    e.status.tetsuya = false;
    if (e.stages.def.lv > 0) {
      e.stages.def.lv = 0;
      e.stages.def.turns = 0;
      arrows(s, e, false);
      s.sfx('se_buff_down');
    }
    s.setMusicParam('h_rest', 1);
    s.bg.flags.rest = 1;
    s.bg.flags.tetsuya = 0;
    s.sfx('se_h_tiller', { level: 5 });
  }
  e.setPose('rest');
  e.params.tapeAt_kyuukei = s.t;
  if (j === 'kukkiri') {
    e.status.bokemake = true;
    bokemakeLabel(s, e);
  }
  yield 200;
  const pages = e.def.texts.extra.otsukareOk ?? fillAll(SYS2.otsukare, { enemy: e.name });
  yield* s.say(fillAll(pages, { enemy: e.name }));
}

// ---- はみだしペケ (Lv7, 3.5, 14.14) -------------------------------------------------------------

/**
 * After a くっきり ペケ at Lv7: the ink spills — onto the neighbours (×0.5 of
 * the hit), or with nobody beside, back onto the same enemy (×0.25).
 * Returns the band pages (or none).
 */
export function* pekeHamidashi(s: BattleScene, u: PartyUnit, e: EnemyUnit, dealt: number): Co<EnemyUnit[]> {
  if (u.id !== 'minato' || u.m.level < 7 || dealt <= 0) return [];
  const row = [...s.enemies].filter((x) => x.alive || x === e).sort((a, b) => a.x - b.x);
  const i = row.indexOf(e);
  const side = [row[i - 1], row[i + 1]].filter((x): x is EnemyUnit => !!x && x.alive && !x.def.invulnerable);
  const killed: EnemyUnit[] = [];
  s.sfx('se_h_hamidashi');
  if (side.length) {
    for (const n of side) {
      const dir = Math.sign(n.x - e.x) || 1;
      // 8 drops of vermilion arc from the X's end to the neighbour (150ms)
      const x0 = e.coreX + dir * 10;
      const y0 = e.coreY;
      for (let k = 0; k < 8; k++) {
        const d = k * 8;
        const sz = 1 + (k % 3);
        s.addFx({
          layer: 'top',
          dur: 150 + d,
          draw: (g, t) => {
            if (t < d) return;
            const p = Math.min(1, (t - d) / 150);
            const px = x0 + (n.coreX - x0) * p + ((k % 3) - 1) * 3;
            const py = y0 + (n.coreY - y0) * p - Math.sin(p * Math.PI) * (16 + (k % 4) * 3);
            g.rect(Math.round(px), Math.round(py), sz, sz, C.shu);
          },
        });
      }
      yield 150;
      const dmg = Math.max(1, Math.round(dealt * 0.5));
      n.decals.push({ kind: 'peke', x: n.def.core[0] + rng.int(-5, 5), y: n.def.core[1] + rng.int(-5, 5), variant: 2, kasure: true });
      if (n.decals.length > 5) n.decals.shift();
      s.shuDrops(n.coreX, n.coreY, 5);
      if (hurtEnemy(s, n, dmg, { pop: 0.8, stack: 1 })) killed.push(n);
      knock(s, n, 2);
    }
    yield* s.say(SYS2.pekeHamidashi);
  } else if (e.alive) {
    // one brush stroke overshoots the X (2px, 12px) and the second, small number follows 120ms later
    const x0 = e.coreX + 9;
    const y0 = e.coreY + 7;
    s.addFx({
      layer: 'top',
      dur: 500,
      draw: (g, t) => g.alpha(t > 350 ? (500 - t) / 150 : 1, () => thickLine(g, x0, y0, x0 + 10, y0 + 6, 2, C.shu)),
    });
    yield 120;
    const dmg = Math.max(1, Math.round(dealt * 0.25));
    if (hurtEnemy(s, e, dmg, { pop: 0.8, stack: 1 })) killed.push(e);
    yield* s.say(SYS2.pekeHamidashi1);
  }
  return killed;
}

// ---- かねを鳴らす Lv6 (3.5) ----------------------------------------------------------------------

/** Lv6 and up: one action in four, the bell gives a small 「コン」 (キレ+2). */
export function kaneKon(s: BattleScene, u: PartyUnit): boolean {
  if (u.id !== 'kanenari' || u.m.level < 6) return false;
  if (s.memo.forceKon) return s.memo.forceKon > 0;
  return rng.next() < 0.25;
}

/** The small gold ring off the bell's rim (#FFE7A3, r 4 → 12, 200ms). */
export function konRing(s: BattleScene, x: number, y: number): void {
  s.sfx('se_h_bell_kon');
  s.addFx({
    layer: 'top',
    dur: 200,
    ui: true,
    draw: (g, t) => {
      const r = 4 + 8 * ease.quadOut(t / 200);
      g.alpha(1 - (t / 200) * 0.6, () => g.ring(x, y, r, '#FFE7A3'));
    },
  });
}

// ---- 感電 (ビリビリ番, 8.3, 14.7) -----------------------------------------------------------------

/**
 * A 打 hit (each strike of たたく, a タックル) on an enemy with `shock`: the one
 * who hit it takes 3 (5 while it is charged), never going below 1 HP.
 */
export function* shockBack(s: BattleScene, u: PartyUnit, e: EnemyUnit): Co {
  const sh = e.def.shock;
  if (!sh || !u.alive) return;
  const n = e.stages.atk.lv >= 1 ? sh.charged : sh.base;
  yield 80;
  const dmg = Math.min(n, Math.max(0, u.m.hp - 1));
  const [px, py] = PANEL_POS[u.id] ?? [104, 150];
  const img = bolt();
  s.addFx({ layer: 'top', dur: 4 * FRAME, ui: true, draw: (g, t) => (t < 2 * FRAME ? g.img(img, px + 16, py + 8) : g.img(img, px + 17, py + 9, { flipX: true })) });
  u.shakeT = 4 * FRAME;
  u.shakeAmp = 1;
  s.sfx('se_h_biri', { vol: 0.55, pitch: 1.2 });
  if (dmg > 0) {
    u.m.hp -= dmg;
    s.number(px + 36, py + 4, dmg, { pop: 0.8, rise: 12 }, 'party', u);
  }
  // the first time only, 「……じーん と した。」 follows the attack (51 8.3)
  if (!s.memo.shockSaid) {
    s.memo.shockSaid = 1;
    s.memo.shockPending = 1;
  }
}

/** After an attack on the fence: the one-time line about the sting. */
export function* shockLine(s: BattleScene, e: EnemyUnit): Co {
  if (!s.memo.shockPending) return;
  s.memo.shockPending = 0;
  yield* s.say(e.def.texts.extra.shockFirst ?? SYS2.shockFirst);
}

// ---- items (6.1, 6.2) --------------------------------------------------------------------------

/** ハトの名刺 handed to ヘノヘノ課長: he redraws a troubled face — ボケ負け (51 6.2). */
export function* hatoMeishiKacho(s: BattleScene, e: EnemyUnit): Co {
  s.post(e.def.texts.extra.hatoMeishi?.slice(0, 1) ?? SYS2.hatoMeishiKacho.slice(0, 1));
  s.sfx('se_meishi');
  yield 400;
  e.setPose('trouble');
  s.sfx('se_pen_write', { vol: 0.7 });
  yield 500;
  e.status.bokemake = true;
  bokemakeLabel(s, e, true);
  yield () => !s.msg.busy;
  yield* s.say((e.def.texts.extra.hatoMeishi ?? SYS2.hatoMeishiKacho).slice(1));
  e.setPose('idle');
}

/** Is this key item one that does something in this battle? */
export function keyItemUsable(s: BattleScene, id: string): boolean {
  const it = getItem(id);
  if (!it) return false;
  if (it.usableInBattleWith) return s.enemies.some((e) => e.alive && it.usableInBattleWith!.includes(e.id));
  if (id === 'item_hato_meishi') return s.aliveEnemies.some((e) => e.id === 'enemy_henoheno_kacho');
  return false;
}

export { fixedDamage };
