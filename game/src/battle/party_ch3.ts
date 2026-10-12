// ヤキソバン（3人目の 仲間。61 5・17.1〜17.4）の わざと「鉄板の 熱」：
//  ヘラ      ふつうの 攻撃（タイミング打ち）。後ろ姿が 1歩 ふみこみ、両手の ヘラで 下から 上へ 返す。
//            麺の 線が 散る（いい音なら 青のりの 点も）
//  こそげる  CT2。味方：状態異常と 下がった 段階を 治す（足が 動かない は 治せない）。
//            敵：上がった 段階を 0に。何も なければ「こそげる 焦げが、なかった。」（ターンは 使う）
//  鉄板      CT1。鉄板の 熱 +1（0〜3）。熱は 戦闘の 終わりまで 残る
//  大盛り    CT2。味方1人 HP＋(40＋まもり＋12×熱)、へばった 人も 起こす。使うと 熱は 0
// 鉄板の 熱（s.shared.teppan）：ラウンドの 終わりに 動ける 味方 HP＋3×熱、敵の ちから ×(1−0.08×熱)
// （enemy.ts の damageTo）、ヒロスケの「手の ゆるみ」（boss_c3aq.ts）、曲の teppan。
// 画面の 下の ふち（y140〜148）に 鉄板の 帯、熱ごとに 背景を 1段 暖色へ（UI と 敵には 掛けない）。

import type { Co } from '../engine/co';
import { ease } from '../engine/tween';
import { rng } from '../engine/rng';
import { fillAll, getSkill, SYS, SYS3 } from '../data/battle';
import type { BattleScene } from './scene';
import { FRAME } from './scene';
import type { EnemyUnit, PartyUnit } from './model';
import { arrows, cureStatus, healParty, statusText } from './common';
import { killSequence, retarget, strikeOnce } from './party';
import { speechBalloon } from './gusokkun';
import { PANEL_POS } from './ui/panels';
import { yakisobanBack, type YakiFrame } from './art/yakisoban';

export const YAKI_TAG = 'ヤキソバン';
export const YAKI_VOICE = 'maruyama';

/** ヤキソバン says these pages in the band (his name on the tape, たかしの 声). */
export function* yakiSay(s: BattleScene, pages: string[] | string): Co {
  yield* s.say(pages, false, { tag: YAKI_TAG, voice: YAKI_VOICE });
}

/** A white balloon over ヤキソバン's panel (his tsukkomi when しゅん can't). */
export function showYakiLine(s: BattleScene, text: string, ms = 1300 + Math.max(0, [...text].length - 6) * 80): number {
  const [px, py] = PANEL_POS.yakisoban ?? [288, 150];
  const img = speechBalloon(text, 16);
  const x = Math.max(4, Math.min(380 - img.width, px + 2));
  const y = py - 8 - img.height;
  s.addFx({
    layer: 'top',
    dur: ms,
    ui: true,
    draw: (g, t) => {
      const pop = t < 110 ? ease.backOut(t / 110) : 1;
      const a = t > ms - 160 ? Math.max(0, (ms - t) / 160) : 1;
      const w = Math.max(1, Math.round(img.width * pop));
      const h = Math.max(1, Math.round(img.height * pop));
      g.alpha(a, () => g.ctx.drawImage(img, x + 16 - Math.round(16 * pop), y + img.height - h, w, h));
    },
  });
  return ms;
}

/** 「……焦げとるぞ。」 (60 7.3): his tsukkomi when しゅん can't. */
export function showYakiTsukkomi(s: BattleScene): number {
  s.sfx('se_bishi', { vol: 0.5, pitch: 1.1 });
  return showYakiLine(s, SYS3.yakiTsukkomi[0]);
}

// ---- 鉄板の 熱 ---------------------------------------------------------------------------------

export function heatOf(s: BattleScene): number {
  return s.shared.teppan ?? 0;
}

function setHeat(s: BattleScene, v: number): void {
  s.shared.teppan = Math.max(0, Math.min(3, v));
  s.setMusicParam('teppan', s.shared.teppan);
}

/** At the start of a battle with ヤキソバン: the griddle strip and the warm wash (61 5.5). */
export function partyCh3Start(s: BattleScene): void {
  if (!s.yakisoban) return;
  setHeat(s, 0);
  const shown = { heat: 0, glow: 0 };
  // the warm wash over the background only (under the enemies and the UI)
  s.addFx({
    layer: 'back',
    dur: 0,
    update(dt) {
      const h = heatOf(s);
      shown.heat += (h - shown.heat) * Math.min(1, dt / 300);
      if (shown.glow > 0) shown.glow = Math.max(0, shown.glow - dt);
    },
    draw: (g) => {
      if (shown.heat > 0.02) g.rect(0, 0, 384, 216, '#F2894B', 0.06 * shown.heat);
    },
  });
  s.addFx({
    layer: 'world',
    dur: 0,
    draw: (g, t) => {
      if (s.hideAll || !s.showUi) return;
      const h = shown.heat;
      const y = 140;
      g.rect(0, y, 384, 8, '#3A3F48');
      g.rect(0, y, 384, 1, '#9AA0A8');
      for (let x = 3; x < 384; x += 11) g.px(x, y + 3 + ((x >> 3) % 3), '#6B7186');
      if (h > 0.05) {
        // the orange glow spreads from the middle; at 3 the whole strip pulses
        const half = Math.min(192, 40 + 76 * h);
        const pulse = heatOf(s) >= 3 ? 0.1 * Math.sin(t / 160) : 0;
        g.rect(Math.round(192 - half), y + 1, Math.round(half * 2), 7, heatOf(s) >= 3 ? '#FF8A3D' : '#F2894B', Math.min(0.45, 0.15 * h + pulse));
        // steam threads
        const n = Math.round(4 * h);
        for (let i = 0; i < n; i++) {
          const sx = 192 + (i - n / 2) * 26 + Math.sin(t / 400 + i) * 3;
          const p = ((t / 900 + i * 0.37) % 1 + 1) % 1;
          g.alpha(0.4 * (1 - p), () => g.rect(Math.round(sx), Math.round(y - 2 - p * 14), 1, 3, '#F4F1E8'));
        }
      }
    },
  });
}

/** The end of a round: everyone who can act is warmed up a little (HP + 3 × heat). */
export function* teppanRoundEnd(s: BattleScene): Co {
  const h = heatOf(s);
  if (!h || !s.yakisoban) return;
  let any = false;
  for (const u of s.party) {
    if (!u.canAct || u.m.hp >= u.m.maxHp) continue;
    healParty(s, u, 3 * h);
    any = true;
  }
  if (!any) return;
  if (!s.memo.warmSaid) {
    s.memo.warmSaid = 1;
    yield* s.say(SYS3.warm, false, { autoMs: 700 });
  } else yield 350;
}

// ---- his back on the stage ---------------------------------------------------------------------

interface Back {
  x: number;
  y: number;
  sc: number;
  frame: YakiFrame;
  alpha: number;
  visible: boolean;
}

function backFx(s: BattleScene, b: Back): ReturnType<BattleScene['addFx']> {
  return s.addFx({
    layer: 'top',
    dur: 0,
    draw: (g) => {
      if (!b.visible) return;
      const img = yakisobanBack(b.frame);
      const w = img.width * b.sc;
      const h = img.height * b.sc;
      g.alpha(b.alpha, () => g.ctx.drawImage(img, Math.round(b.x - w / 2), Math.round(b.y - h), Math.round(w), Math.round(h)));
    },
  });
}

function* slide(b: Back, x: number, y: number, sc: number, frames: number, fn = ease.quadOut): Co {
  const x0 = b.x;
  const y0 = b.y;
  const s0 = b.sc;
  for (let i = 1; i <= frames; i++) {
    const p = fn(i / frames);
    b.x = x0 + (x - x0) * p;
    b.y = y0 + (y - y0) * p;
    b.sc = s0 + (sc - s0) * p;
    yield null;
  }
}

/** Yellow noodle threads (and the 青のり on a good hit) off the spatulas' arc. */
function noodles(s: BattleScene, x: number, y: number, good: boolean): void {
  s.burst(x, y, { count: 5, speed: [60, 120], angle: [-Math.PI * 0.85, -Math.PI * 0.15], life: [350, 500], colors: ['#E8C878', '#F4DC98'], gravity: 260, shape: 'sq', size: [1, 3], sizeEnd: 1 });
  if (good) s.burst(x, y, { count: 8, speed: [40, 100], life: [300, 450], colors: ['#3F7A3A'], gravity: 200, shape: 'sq', size: [1, 1] });
}

// ---- ヘラ (61 5.3・17.1) ------------------------------------------------------------------------

export function* doHera(s: BattleScene, u: PartyUnit, target0: EnemyUnit): Co {
  let target = retarget(s, target0);
  if (!target) return;
  if (u.has('status_konran')) {
    yield* s.say(statusText('status_konran', 'act', u.name));
    target = rng.pick(s.aliveEnemies.filter((e) => !e.mem.noTarget)) ?? target;
  }
  const t = target;
  s.post(SYS3.hera);
  const b: Back = { x: 300, y: 210, sc: 1, frame: 'idle', alpha: 1, visible: true };
  const fx = backFx(s, b);
  s.sfx('se_c3_spatula', { vol: 0.6 });
  const r = yield* strikeOnce(s, u, t, { power: getSkill('skill_yk_hera')?.power ?? 1, lead: 7, shrink: 29, stack: 0 }, (f, hitF, phase) => {
    if (phase === 'post') {
      b.frame = 'swing';
      return;
    }
    const p = Math.min(1, f / Math.max(1, hitF));
    // a heavy step in, then toward the enemy's feet
    b.x = 300 + (t.coreX + 16 - 300) * ease.quadIn(p);
    b.y = 210 + (Math.min(t.footY + 34, 196) - 210) * ease.quadIn(p);
    b.sc = 1 - 0.25 * p;
    b.frame = f < 8 ? 'step' : 'idle';
  });
  if (r.hit) {
    s.sfx('se_c3_spatula');
    noodles(s, t.coreX, t.coreY + 10, true);
  }
  if (r.boke) t.status.bokemake = false;
  if (r.killed) {
    s.run(slide(b, 330, 236, 1, 14));
    yield* killSequence(s, [t]);
    fx.done = true;
    return;
  }
  yield 200;
  b.frame = 'idle';
  yield* slide(b, 330, 236, 1, 12);
  fx.done = true;
  yield 100;
}

// ---- わざ ---------------------------------------------------------------------------------------

export function* doYaki(s: BattleScene, u: PartyUnit, skill: string, target: PartyUnit | EnemyUnit | null): Co {
  const def = getSkill(skill);
  if (def?.ct) u.ct[skill] = def.ct + 1;
  if (skill === 'skill_yk_teppan') yield* yakiTeppan(s, u);
  else if (skill === 'skill_yk_oomori') yield* yakiOomori(s, u, (target as PartyUnit | null) ?? u);
  else if (skill === 'skill_yk_kosogeru') yield* yakiKosogeru(s, u, target ?? u);
}

function* yakiTeppan(s: BattleScene, _u: PartyUnit): Co {
  const h = heatOf(s);
  if (h >= 3) {
    yield* s.say(SYS3.teppanMax);
    return;
  }
  s.post(SYS3.teppan);
  const b: Back = { x: 300, y: 236, sc: 1, frame: 'idle', alpha: 1, visible: true };
  const fx = backFx(s, b);
  yield* slide(b, 300, 206, 1, 8, ease.backOut);
  // カン、カン on the griddle (the pitch climbs with the heat)
  for (let i = 0; i < 2; i++) {
    b.frame = 'swing';
    s.sfx('se_c3_teppan', { pitch: [1, 1.12, 1.25][h] });
    s.shake(0, 1, 3);
    yield 120;
    b.frame = 'idle';
    yield 120;
  }
  setHeat(s, h + 1);
  // the sauce spits up off the strip
  for (let k = 0; k < 10; k++) s.burst(rng.int(120, 264), 141, { count: 1, speed: [40, 90], angle: [-Math.PI * 0.8, -Math.PI * 0.2], life: [250, 400], colors: ['#5A3A2A', '#F2894B'], gravity: 300, shape: 'sq', size: [1, 1] }, true);
  if (h + 1 >= 3) s.flash('#FFF6D8', 0.12, 2);
  yield 300;
  yield* slide(b, 300, 236, 1, 8);
  fx.done = true;
  yield* s.say(fillAll(SYS3.teppanUp, { n: String(h + 1) }), false, { autoMs: 600 });
}

function* yakiOomori(s: BattleScene, u: PartyUnit, t: PartyUnit): Co {
  const h = heatOf(s);
  s.post(fillAll(SYS3.oomori, { target: t.name }));
  s.sfx('se_c3_oomori');
  const [px, py] = PANEL_POS[t.id] ?? [104, 150];
  const [yx, yy] = PANEL_POS.yakisoban ?? [288, 150];
  const high = 16 + 4 * h;
  // the heap arcs from the griddle to the one's photo, lands with a ドサッ
  const st = { p: 0 };
  const fx = s.addFx({
    layer: 'top',
    dur: 0,
    ui: true,
    draw: (g) => {
      const x = yx + 30 + (px + 16 - yx - 30) * st.p;
      const y = yy - 6 + (py + 6 - yy + 6) * st.p - Math.sin(st.p * Math.PI) * 36;
      g.rect(Math.round(x - 12), Math.round(y), 24, 3, '#F4F1E8');
      for (let r = 0; r < Math.round(high / 2); r++) g.rect(Math.round(x - 10 + r * 0.6), Math.round(y - r - 1), Math.max(2, Math.round(20 - r * 1.2)), 1, r % 2 ? '#E8C878' : '#D8B060');
      g.px(Math.round(x), Math.round(y - high / 2 - 1), '#E0567A');
    },
  });
  for (let i = 1; i <= 20; i++) {
    st.p = i / 20;
    yield null;
  }
  fx.done = true;
  s.shake(0, 1, 3);
  t.squishT = 200;
  const wasDown = !t.alive;
  const n = Math.max(1, Math.round((40 + u.m.def + 12 * h) * rng.range(0.9, 1.1)));
  healParty(s, t, n);
  s.stars(px + 16, py, 4, [20, 50]);
  // the heat goes back to 0 (the strip's glow shrinks into the middle)
  setHeat(s, 0);
  s.mood(t, 'happy', 900);
  yield 400;
  if (wasDown && t.alive) yield* s.say(fillAll(SYS.revived, { target: t.name }));
  if (t.id === 'kanenari' && !s.memo.oomoriKn) {
    s.memo.oomoriKn = 1;
    yield* s.say(SYS3.oomoriKn, false, { tag: 'グソっ君', voice: 'gusokkun' });
  }
}

const CURABLE = ['status_konran', 'status_nemuri', 'status_c3_mada', 'status_c3_ippai', 'status_henji'];

function* yakiKosogeru(s: BattleScene, _u: PartyUnit, t: PartyUnit | EnemyUnit): Co {
  s.post(SYS3.kosogeru);
  const enemy = t.kind === 'enemy';
  const [tx, ty] = enemy ? [t.coreX, Math.min(t.footY + 30, 196)] : [(PANEL_POS[t.id] ?? [104, 150])[0] + 46, 150];
  const b: Back = { x: 300, y: 236, sc: 1, frame: 'idle', alpha: 1, visible: true };
  const fx = backFx(s, b);
  yield* slide(b, tx, ty, enemy ? 0.8 : 0.7, 18);
  // ガリッ、ガリッ: black flakes come away
  for (let i = 0; i < 2; i++) {
    b.frame = 'swing';
    s.sfx('se_c3_kosogeru');
    s.burst(tx, ty - 30, { count: 3, speed: [30, 70], angle: [Math.PI * 0.2, Math.PI * 0.8], life: [300, 500], colors: ['#1B1733'], gravity: 220, shape: 'sq', size: [2, 2], sizeEnd: 1 }, !enemy);
    yield 120;
    b.frame = 'idle';
    yield 60;
  }
  const pages: string[] = [];
  let did = false;
  if (!enemy) {
    const u = t as PartyUnit;
    for (const id of CURABLE) {
      if (!u.has(id)) continue;
      if (id === 'status_c3_mada') pages.push(...fillAll(SYS3.madaOff, { target: u.name }));
      cureStatus(s, u, id);
      did = true;
    }
    for (const k of ['atk', 'def', 'hit', 'spd'] as const)
      if (u.stages[k].lv < 0) {
        u.stages[k].lv = 0;
        u.stages[k].turns = 0;
        did = true;
      }
    if (did) {
      arrows(s, u, true);
      if (!pages.length) pages.push(...fillAll(SYS3.kosogeruCured, { target: u.name }));
    }
  } else {
    const e = t as EnemyUnit;
    for (const k of ['atk', 'def', 'hit', 'spd'] as const)
      if (e.stages[k].lv > 0 && !(k === 'def' && (e.status.c3_futa || e.status.c3_mayoi))) {
        e.stages[k].lv = 0;
        e.stages[k].turns = 0;
        did = true;
      }
    if (did) {
      arrows(s, e, false);
      pages.push(...fillAll(SYS3.kosogeruEnemy, { enemy: e.name }));
    }
  }
  yield 200;
  yield* slide(b, 300, 236, 1, 12);
  fx.done = true;
  if (!did) {
    yield* s.say(SYS3.kosogeruNone);
    return;
  }
  // 「焦げは、こそげりゃ 落ちる。」 once a battle, the first time it takes something off
  if (!s.memo.kosoLine) {
    s.memo.kosoLine = 1;
    yield* yakiSay(s, SYS3.kosogeruLine);
  }
  yield* s.say(pages.slice(0, 2));
  void FRAME;
}
