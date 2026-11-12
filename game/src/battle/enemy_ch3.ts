// 第3章の敵の技（61 9.1・10.6・11.6）：ネフダマヨイ（ひゃく……・値札はりかえ・まかり……）、
// オカワリナベ（おかわり・湯気・ふたが 閉まらない）、ナリオサメ（羽根の 風・町を 呼ぶ・
// まだ 鳴り終わりたくない）。正午の 音（巻きもどし）と 錠・最終局面は ch3rules.ts。

import type { Co } from '../engine/co';
import { rng } from '../engine/rng';
import { ease } from '../engine/tween';
import { fillAll, SYS } from '../data/battle';
import type { BossMoveCtx } from './enemy';
import { panelHitPoint, hitLoop } from './enemy';
import type { PartyUnit } from './model';
import { statusChance } from './model';
import { addKire, changeStage, healParty, showSticky } from './common';
import { bokemakeLabel } from './tsukkomi';
import { knSay } from './gusokkun';
import { priceTag, okawariDish } from './art/fxart_ch3';
import { decideNefuda, lidClose, lidOpen } from './ch3rules';
import { hitDown } from './enemy_ch2';
import { state } from '../game/state';
import { getItem } from '../data/battle';
import { tgMoves } from './boss_tsugao';

export const CH3_MOVES = new Set([
  'skill_nefuda_hyaku',
  'skill_nefuda_harikae',
  'skill_nefuda_makari',
  'skill_okawari_okawari',
  'skill_okawari_yuge',
  'skill_okawari_futa',
  'skill_nari_kaze',
  'skill_nari_yobu',
  'skill_nari_mada',
  // 任意の 敵（61 9.2〜9.4）
  'skill_hoshi_hinata',
  'skill_hoshi_shio',
  'skill_hoshi_sori',
  'skill_asobi_kuuki',
  'skill_asobi_wa',
  'skill_asobi_mada',
  'skill_yoko_nerai',
  'skill_yoko_dori',
  'skill_yoko_pihyoro',
  // 旧水族館（61 9.5・13.3）
  'skill_junro_kochira',
  'skill_junro_modoru',
  'skill_hiro_dandori',
  // ツガオ決戦（61 14.2。第4期）
  'skill_tsugao_mada',
  'skill_tsugao_denpyo',
  'skill_tsugao_chokin',
]);

export function isCh3Move(id: string): boolean {
  return CH3_MOVES.has(id);
}

/** すばやさ −1 (3 turns) on whoever the move reached, unless a tsukkomi held (61 8.1). */
function spdDown(c: BossMoveCtx, list: PartyUnit[], chance: number, ippai = false): PartyUnit[] {
  const out: PartyUnit[] = [];
  if (c.st.anySuccess) return out;
  for (const t of list) {
    if (!t.alive) continue;
    if (rng.next() >= statusChance(chance, t.m.luck)) continue;
    changeStage(c.s, t, 'spd', -1, 3, true);
    // おなか いっぱい: the same −1, with its own icon (a bowl)
    if (ippai) t.m.status.status_c3_ippai = 3;
    out.push(t);
  }
  return out;
}

/** Steam rising off the pot, washing down over the panels. */
function steam(c: BossMoveCtx, n: number): void {
  const { s, e } = c;
  for (let i = 0; i < n; i++) {
    const x0 = e.coreX + rng.int(-22, 22);
    const y0 = e.top + 10;
    const d = i * 40;
    s.addFx({
      layer: 'world',
      dur: 520 + d,
      draw: (g, t) => {
        if (t < d) return;
        const p = (t - d) / 520;
        const r = 4 + p * 16;
        const x = x0 + Math.sin(p * 5 + i) * 6;
        const y = y0 + p * 90;
        g.alpha(0.4 * (1 - p), () => {
          g.ctx.fillStyle = '#F4F1E8';
          g.ctx.beginPath();
          g.ctx.ellipse(Math.round(x), Math.round(y), r, r * 0.7, 0, 0, Math.PI * 2);
          g.ctx.fill();
        });
      },
    });
  }
}

/** White wind lines (#E8ECF0 α50%) blowing down from the siren over the panels. */
function windLines(c: BossMoveCtx, n: number): void {
  const { s, e } = c;
  for (let i = 0; i < n; i++) {
    const x0 = e.coreX + rng.int(-40, 40);
    const d = i * 50;
    const len = rng.int(18, 30);
    s.addFx({
      layer: 'top',
      dur: 420 + d,
      draw: (g, t) => {
        if (t < d) return;
        const p = (t - d) / 420;
        const y = e.coreY + p * 120;
        const x = x0 + (x0 - 192) * p * 0.4;
        g.alpha(0.5 * (1 - p * 0.6), () => g.rect(Math.round(x), Math.round(y), 1, len, '#E8ECF0'));
      },
    });
  }
}

export function* ch3Move(c: BossMoveCtx): Co {
  const { s, e, sk, common, resolveGuard, target, all, pages, damageTo, st } = c;
  if (sk.id.startsWith('skill_tsugao_')) {
    yield* tgMoves(c);
    return;
  }
  switch (sk.id) {
    // ---- ネフダマヨイ (61 9.1) -------------------------------------------------
    case 'skill_nefuda_hyaku': {
      // 言いよどんだら、ツッコミで 決めて あげよう (the first time)
      showSticky(s, 'nefuda', 'flag_tut_nefuda');
      s.sfx('se_c3_seri_bell', { level: 1 });
      yield* c.selfMove(
        s,
        common,
        resolveGuard,
        () => e.setPose('hyaku', sk.id),
        (f) => {
          if (f === 0) e.setPose('hyaku', sk.id);
        },
      );
      if (st.anySuccess) {
        // the tsukkomi says the price: 『100円』 (the band after the lettering)
        decideNefuda(s, e);
        pages.push(...e.def.texts.extra.decided);
      } else {
        changeStage(s, e, 'def', 1, 99, true);
        pages.push(...e.def.texts.extra.hyakuResult);
      }
      break;
    }
    case 'skill_nefuda_harikae': {
      // the bottom tag flips over and flies at one of them (and comes back)
      const t = target!;
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('windup', sk.id);
          if (toHit === 12) {
            e.setPose('attack', sk.id);
            s.sfx('se_c3_nefuda');
            c.projectile(s, priceTag, e.coreX - 4, e.top + 36, t, 12, 1, 2.4, 10, { trail: true });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, t, sk.power ?? 1, r);
        },
      });
      break;
    }
    case 'skill_nefuda_makari': {
      // the three tags fan open and shut: 「まかり……」 (a white line sweeps across)
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('windup', sk.id);
          if (toHit === 10) {
            e.setPose('fan', sk.id);
            s.sfx('se_c3_seri_fuda', { pitch: 0.9 });
            s.addFx({
              layer: 'top',
              dur: 260,
              draw: (g, tt) => {
                const p = tt / 260;
                g.alpha(0.4 * (1 - p), () => g.rect(Math.round(e.coreX - 160 * p), Math.round(e.coreY + 10 + p * 40), Math.round(320 * p), 1, '#F4F1E8'));
              },
            });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.5, r, i, true));
        },
      });
      const hit = spdDown(c, all, sk.status?.chance ?? 0.6);
      if (st.anySuccess) pages.push(...fillAll(SYS.guarded, { target: all.length > 1 ? 'しゅんたち' : all[0]?.name ?? '' }));
      else if (hit.length) pages.push(...e.def.texts.extra.makariResult);
      break;
    }

    // ---- オカワリナベ (61 10.6) -------------------------------------------------
    case 'skill_okawari_okawari': {
      // the ladle scoops and lands a plate with a 「とぽん」 on their photo: HP +15 …
      const t = target!;
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('scoop', sk.id);
          if (toHit === 14) {
            e.setPose('attack', sk.id);
            s.sfx('se_c3_otama');
            c.projectile(s, okawariDish, e.coreX + 18, e.top + 14, t, 14, 1, 2, 30, { lob: true });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          healParty(s, t, 15);
          const [hx, hy] = panelHitPoint(t);
          s.burst(hx, hy - 6, { count: 3, speed: [10, 30], angle: [-Math.PI * 0.7, -Math.PI * 0.3], life: [400, 600], colors: ['#F4F1E8'], gravity: -30, shape: 'sq', size: [1, 2] }, true);
        },
      });
      // … and おなか いっぱい: すばやさ −1 (a tsukkomi eats it up and keeps the speed)
      const hit = spdDown(c, [t], 1, true);
      if (st.anySuccess) pages.push(...fillAll(e.def.texts.extra.okawariGuard, { target: t.name }));
      else if (hit.length) pages.push(...fillAll(e.def.texts.extra.okawariResult, { target: t.name }));
      break;
    }
    case 'skill_okawari_yuge': {
      s.sfx('se_c3_nabe');
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('windup', sk.id);
          if (f % 6 === 0) steam(c, 2);
          if (toHit === 8) e.setPose('attack', sk.id);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.5, r, i, true));
        },
      });
      break;
    }
    case 'skill_okawari_futa': {
      // ふたが ガタガタ: the "!" is the chance to close it (61 10.3)
      showSticky(s, 'okawari', 'flag_tut_okawari');
      const wasOpen = !!e.status.c3_futa;
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('rattle', sk.id);
          // three rattles, the third on the hit
          if (toHit === 28 || toHit === 14) s.sfx('se_c3_futa', { pitch: 1.1 });
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx('se_c3_futa', { pitch: r ? 0.8 : 1.2 });
        },
      });
      // its own aftermath (no lettering: the line is グソっ君's, never in the book)
      c.skipFlush = true;
      for (const u of s.party) u.moodHold = null;
      if (st.anySuccess) {
        e.status.bokemake = true;
        bokemakeLabel(s, e);
        addKire(s, 1 + (st.lastJust ? 1 : 0));
        s.memo.tsukCount = (s.memo.tsukCount ?? 0) + 1;
        const first = !s.memo.futaClosedOnce;
        s.memo.futaClosedOnce = 1;
        if (first && s.kanenari?.alive) {
          s.mood(s.kanenari, 'tsukkomi', 1800);
          yield* knSay(s, e.def.texts.extra.futaLine);
        }
        lidClose(s, e);
        yield 200;
        yield* s.say(first ? e.def.texts.extra.futaClosed : e.def.texts.extra.futaShort);
      } else {
        lidOpen(s, e);
        e.setPose('idle');
        yield* s.say(wasOpen ? e.def.texts.extra.futaStill : e.def.texts.extra.futaOpen);
      }
      if (e.pose !== 'idle') e.setPose('idle');
      break;
    }

    // ---- ナリオサメ (61 11.6) -----------------------------------------------------
    case 'skill_nari_kaze': {
      s.sfx('se_c3_nari_kaze');
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('spin', sk.id);
          if (toHit <= 12 && f % 4 === 0) windLines(c, 2);
          if (toHit === 6) e.setPose('attack', sk.id);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          windLines(c, 5);
          s.shake(2, 1, 8);
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.6, r, i, true));
        },
      });
      break;
    }
    case 'skill_nari_yobu': {
      s.sfx('se_c3_nari_yobu');
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('call', sk.id);
          if (f % 14 === 0) c.soundRings(s, e.faceX, e.faceY, '#F4F1E8', 1, 0.3, 700);
          if (toHit === 6) e.setPose('attack', sk.id);
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          c.soundRings(s, e.faceX, e.faceY, '#F4F1E8', 3, 0.3, 700);
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.4, r, i, true));
        },
      });
      // nobody comes: the sound is stuck at its first note
      pages.push(...e.def.texts.extra.yobuResult);
      pages.push(...c.applyStatusAll(s, all, sk, st));
      break;
    }
    case 'skill_nari_mada': {
      yield* c.selfMove(s, common, resolveGuard, () => {
        // the blades stop dead and the body shrinks a pixel (holding the sound in)
        e.setPose('hold', sk.id);
        s.sfx('se_c3_nari_kaze', { level: 1 });
      });
      changeStage(s, e, 'def', 1, 3, true);
      pages.push(...e.def.texts.extra.madaResult);
      break;
    }
    // ---- ホシスギ (61 9.2) -----------------------------------------------------------
    case 'skill_hoshi_hinata': {
      // basking: three white lines of sun come down on it, it spreads its fins
      yield* c.selfMove(
        s,
        common,
        resolveGuard,
        () => e.setPose('bask', sk.id),
        (f) => {
          if (f === 0) e.setPose('bask', sk.id);
          if (f % 10 === 0)
            for (let k = 0; k < 3; k++) {
              const x = e.coreX - 12 + k * 12;
              s.addFx({ layer: 'world', dur: 300, draw: (g, tt) => g.alpha(0.5 * (1 - tt / 300), () => g.rect(x, Math.round(e.top - 30 + (tt / 300) * 24), 1, 10, '#FFF6D8')) });
            }
        },
      );
      if (!st.anySuccess) {
        // dried side by side: a pair goes up together
        const all2 = s.aliveEnemies.filter((o) => o.id === e.id);
        for (const o of all2) if (o.stages.def.lv < 2) changeStage(s, o, 'def', 1, 99, true);
        pages.push(...e.def.texts.extra.hinataResult);
      }
      break;
    }
    case 'skill_hoshi_shio': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('shake', sk.id);
          if (toHit === 10) {
            s.sfx('se_c3_shio');
            for (const t of all) {
              const [hx, hy] = panelHitPoint(t);
              for (let k = 0; k < 5; k++) {
                const x0 = e.coreX + rng.int(-10, 10);
                const y0 = e.coreY;
                s.addFx({
                  layer: 'top',
                  dur: 10 * 16.7,
                  draw: (g, tt) => {
                    const p = tt / (10 * 16.7);
                    g.rect(Math.round(x0 + (hx + rng.int(-8, 8) - x0) * p), Math.round(y0 + (hy - y0) * p - Math.sin(p * Math.PI) * 16), 1, 1, '#F4F1E8');
                  },
                });
              }
            }
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.5, r, i, true));
        },
      });
      const hit = hitDown(s, all, sk.status?.chance ?? 0.5, st.anySuccess);
      if (st.anySuccess) pages.push(...fillAll(SYS.guarded, { target: all.length > 1 ? 'しゅんたち' : all[0]?.name ?? '' }));
      else if (hit.length) pages.push(...e.def.texts.extra.shioResult);
      break;
    }
    case 'skill_hoshi_sori': {
      const t = target!;
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('bend', sk.id);
          if (toHit === 8) {
            e.setPose('attack', sk.id);
            s.sfx('se_c3_himono');
            c.rush(s, e, { scale: 1.12, dy: 8, dx: c.towardX(e, t, 0.14, 14), inF: 8, holdF: 3, outF: 10 });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, t, sk.power ?? 1.05, r);
        },
      });
      break;
    }

    // ---- アソビタリン (61 9.3) ---------------------------------------------------------
    case 'skill_asobi_kuuki': {
      yield* c.selfMove(s, common, resolveGuard, () => {
        e.setPose('pump', sk.id);
        s.sfx('se_c3_pump');
      });
      // +35 (+18 once it has been seen: the wish to be folded away calms it)
      e.mem.air = (e.mem.air ?? 0) + 1;
      const before = e.hp;
      e.hp = Math.min(e.maxHp, e.hp + (e.mimaEver ? 18 : 35));
      if (e.hp > before) {
        const [nx, ny] = s.enemyNumberXY(e);
        s.number(nx, ny, e.hp - before, { kind: 'heal' }, 'enemy', e);
        s.sfx('se_heal');
      }
      yield 300;
      e.setPose('idle');
      break;
    }
    case 'skill_asobi_wa': {
      // it arcs up over their panel and drops right over the photo (すぽっ)
      const t = target!;
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('windup', sk.id);
          if (toHit === 16) {
            e.setPose('attack', sk.id);
            c.rush(s, e, { scale: 1.2, dy: 30, dx: c.towardX(e, t, 0.6, 70), inF: 16, holdF: 6, outF: 12 });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          s.sfx('se_hit_pofu', { pitch: 1.2 });
          damageTo(s, e, t, sk.power ?? 1, r);
        },
      });
      pages.push(...c.applyStatusOne(s, t, sk, st));
      break;
    }
    case 'skill_asobi_mada': {
      // three hops on the spot, the third high (the hit)
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('hop', sk.id);
          const k = toHit > 0 ? Math.floor((24 - Math.min(24, toHit)) / 8) : 2;
          e.offY = -Math.round(Math.abs(Math.sin((f / 8) * Math.PI)) * (k >= 2 ? 10 : 4));
          if (toHit === 16 || toHit === 8) s.sfx('se_hit_pofu', { pitch: 1.4, vol: 0.5 });
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          e.offY = 0;
          s.shake(0, 2, 6);
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.6, r, i, true));
        },
      });
      e.offY = 0;
      break;
    }

    // ---- ヨコドリ (61 9.4) ------------------------------------------------------------
    case 'skill_yoko_nerai': {
      // it tilts its head and stares at what they are holding (a charge)
      const t = target!;
      yield* c.selfMove(s, common, resolveGuard, () => e.setPose('stare', sk.id));
      e.status.tame = 'skill_yoko_dori';
      e.status.stareAt = t.id;
      e.setPose('stare');
      s.sfx('se_c3_wing', { vol: 0.6 });
      break;
    }
    case 'skill_yoko_dori': {
      // up off the top of the screen, its shadow sweeping onto their panel, a
      // grab at the air over it — and up again with nothing
      const t = target!;
      e.status.tame = undefined;
      const shadow = { k: 0 };
      const [hx, hy] = panelHitPoint(t);
      const sh = s.addFx({
        layer: 'top',
        dur: 0,
        draw: (g) => {
          if (shadow.k <= 0) return;
          const w = Math.round(10 + shadow.k * 26);
          g.alpha(0.45 * shadow.k, () => {
            g.ctx.fillStyle = '#1E3A4A';
            g.ctx.beginPath();
            g.ctx.ellipse(hx, hy, w / 2, Math.max(2, w / 6), 0, 0, Math.PI * 2);
            g.ctx.fill();
          });
        },
      });
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) {
            e.setPose('dive', sk.id);
            s.sfx('se_c3_wing');
            c.rush(s, e, { scale: 0.6, dy: -90, dx: 0, inF: 8, holdF: 30, outF: 12 });
          }
          shadow.k = toHit > 20 ? 0 : 1 - toHit / 20;
          if (toHit === 3) s.sfx('se_c3_tonbi', { vol: 0.5 });
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, t, sk.power ?? 1.2, r);
        },
      });
      sh.done = true;
      e.status.stareAt = undefined;
      // what it missed: a heal from their bag (else an おにぎり — 60 が正)
      const heals = state.inventory.filter((id) => { const it = getItem(id); return !!it && !it.key && (it.heal || it.healRate); });
      const name = heals.length ? getItem(rng.pick(heals))!.name : 'おにぎり';
      pages.push(...fillAll(e.def.texts.extra.miss, { item: name }));
      break;
    }
    case 'skill_yoko_pihyoro': {
      yield* hitLoop(s, {
        ...common,
        onFrame: (f) => {
          if (f === 0) {
            e.setPose('cry', sk.id);
            s.sfx('se_c3_tonbi');
          }
          if (f % 18 === 0) c.soundRings(s, e.faceX, e.faceY, '#F4F1E8', 1, 0.3, 600);
        },
        onHit: (i, r) => resolveGuard(r, i),
      });
      const hit = spdDown(c, all, sk.status?.chance ?? 0.6);
      if (st.anySuccess) pages.push(...fillAll(SYS.guarded, { target: all.length > 1 ? 'しゅんたち' : all[0]?.name ?? '' }));
      else if (hit.length) pages.push(...e.def.texts.extra.pihyoroResult);
      break;
    }
    // ---- ジュンロ (61 9.5) ------------------------------------------------------
    case 'skill_junro_kochira': {
      // the arrow spins three times and a blue line runs round the screen's edge
      s.sfx('se_c3_signboard');
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('spin', sk.id);
          if (toHit === 10) {
            e.setPose('attack', sk.id);
            s.addFx({
              layer: 'top',
              dur: 500,
              ui: true,
              draw: (g, tt) => {
                const p = tt / 500;
                const L = 2 * (384 + 216);
                const n = Math.round(L * p);
                g.alpha(0.8 * (1 - p * 0.5), () => {
                  const top = Math.min(n, 384);
                  g.rect(0, 0, top, 2, '#4AA8E0');
                  if (n > 384) g.rect(382, 0, 2, Math.min(216, n - 384), '#4AA8E0');
                  if (n > 600) g.rect(384 - Math.min(384, n - 600), 214, Math.min(384, n - 600), 2, '#4AA8E0');
                  if (n > 984) g.rect(0, 216 - Math.min(216, n - 984), 2, Math.min(216, n - 984), '#4AA8E0');
                });
              },
            });
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          all.forEach((t) => damageTo(s, e, t, sk.power ?? 0.4, r, i, true));
        },
      });
      // next round the party goes slowest first (a tsukkomi keeps the order)
      if (!st.anySuccess) {
        s.memo.reverseRound = s.round + 1;
        pages.push(...(e.def.texts.extra.kochiraResult ?? []));
      } else pages.push(...fillAll(SYS.guarded, { target: all.length > 1 ? 'しゅんたち' : all[0]?.name ?? '' }));
      break;
    }
    case 'skill_junro_modoru': {
      const t = target!;
      yield* hitLoop(s, {
        ...common,
        onFrame: (f, _i, toHit) => {
          if (f === 0) e.setPose('windup', sk.id);
          if (toHit === 8) {
            e.setPose('attack', sk.id);
            e.offX = -8;
          }
        },
        onHit: (i, r) => {
          resolveGuard(r, i);
          damageTo(s, e, t, sk.power ?? 1.1, r);
        },
      });
      e.offX = 0;
      // back to the entrance: its raised steps go
      if (!st.anySuccess) {
        let any = false;
        for (const k of ['atk', 'def', 'hit', 'spd'] as const)
          if (t.stages[k].lv > 0) {
            t.stages[k].lv = 0;
            t.stages[k].turns = 0;
            any = true;
          }
        if (any) pages.push(...fillAll(e.def.texts.extra.modoruResult ?? [], { target: t.name }));
      }
      break;
    }
    // ---- ヒロスケの 段取り (61 13.3) --------------------------------------------------
    case 'skill_hiro_dandori': {
      yield* c.selfMove(s, common, resolveGuard, () => e.setPose('dandori', sk.id), (f) => {
        if (f === 0) e.setPose('dandori', sk.id);
      });
      if (!st.anySuccess) {
        // next round: the two first, the party slowest first
        s.memo.dandoriRound = s.round + 1;
        s.memo.reverseRound = s.round + 1;
        pages.push(...(e.def.texts.extra.dandoriResult ?? []));
      }
      break;
    }
    default:
      yield 300;
  }
  void ease;
}
