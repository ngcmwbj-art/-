// Text selection helpers for the battle band (様子 rotation etc.).

import type { BattleScene } from './scene';
import type { EnemyUnit } from './model';
import { measure } from '../engine/font';
import { fill } from '../data/battle';
import { yobiLit } from './boss_yobimodoshi';

/** Width of one line of the band (x22–374). */
const BAND_LINE_W = 352;

/**
 * Boss battles keep the band at one line during command input (15.3), or the
 * cap — a target part — disappears under it. Two-line 〔様子〕 are joined
 * (the break stood for a space); if that is still too long, the subject
 * ("オムカエマチは／の") is dropped — it is the only one on stage.
 */
export function oneLine(text: string, subject: string): string {
  if (!text || !text.includes('\n')) return text;
  const joined = text.replace(/([、。！？」』])\n/g, '$1').replace(/\n/g, ' ');
  if (measure(joined) <= BAND_LINE_W) return joined;
  const short = joined.replace(new RegExp(`^${subject}[のは] ?`), '');
  return measure(short) <= BAND_LINE_W ? short : joined.split(' ').slice(-4).join(' ');
}

/** 〔様子〕 for the command phase (15.3): per enemy, per round, with specials. */
export function yousuText(s: BattleScene): string {
  const e = s.aliveEnemies.find((x) => x.def.boss) ?? s.aliveEnemies[0];
  if (!e) return '';
  const t = e.def.texts;
  const r = Math.max(1, s.round);
  const sp = t.yousuSpecial ?? {};
  if (e.id === 'boss_yobimodoshi') return yobiYousu(s, e, r);
  if (e.def.chapter === 2) return ch2Yousu(s, e, r);
  if (e.def.boss) {
    // the climax: the band keeps the one thing left to do (13.7)
    if (s.memo.bossFinal) return t.extra.finalPrompt?.[0] ?? '';
    if (s.bossChime.lit >= 3) return oneLine(sp.chime3, e.def.name);
    if (s.memo.bossPhase >= 2) {
      const list = [sp.p2a, sp.p2b, sp.p2c];
      return oneLine(list[(r - 1) % list.length], e.def.name);
    }
    return oneLine(t.yousu[(r - 1) % t.yousu.length], e.def.name);
  }
  if (e.id === 'enemy_kanenari') {
    // [events hook, QA round 2] from round 6, every other round, Minato's own thought
    if (r >= 6 && r % 2 === 0 && sp.round6) return sp.round6;
    if (r >= 4) return sp.round4;
    if (r >= 3) return sp.round3;
    return t.yousu[(r - 1) % t.yousu.length];
  }
  if (e.id === 'enemy_hato_kakaricho' && e.hpRate <= 0.3 && sp.lowHp) return sp.lowHp;
  if (e.id === 'enemy_semi_final' && e.status.shindafuri && sp.shindafuri) return sp.shindafuri;
  if (e.id === 'enemy_ojigi_jihanki' && e.status.tame && sp.tame) return sp.tame;
  return t.yousu[(r - 1) % t.yousu.length];
}

/** ヨビモドシ (50 6.7): the 4th name is next ＞ lit ＞ phase 2 ＞ dark, one line each. */
function yobiYousu(s: BattleScene, e: EnemyUnit, r: number): string {
  const t = e.def.texts;
  const sp = t.yousuSpecial ?? {};
  if (s.memo.bossFinal) return t.extra.finalPrompt?.[0] ?? '';
  const phase = s.memo.bossPhase ?? 1;
  const twos = phase >= 2 && s.bossParts.filter((p) => p.broken).length < 2;
  const lit = yobiLit(s);
  if (!lit && s.bossChime.lit >= (twos ? 2 : 3)) return oneLine(sp.tenko3, e.def.name);
  if (lit) return oneLine([sp.light1, sp.light2][(r - 1) % 2], e.def.name);
  if (phase >= 2) return oneLine([sp.p2a, sp.p2b][(r - 1) % 2], e.def.name);
  return oneLine(t.yousu[(r - 1) % t.yousu.length], e.def.name);
}

/** The chapter-2 enemies' 〔様子〕 with their specials (50 6.1–6.6). */
function ch2Yousu(s: BattleScene, e: EnemyUnit, r: number): string {
  const t = e.def.texts;
  const sp = t.yousuSpecial ?? {};
  const rot = (list: string[]) => list[(r - 1) % list.length];
  switch (e.id) {
    case 'enemy_sune_tomato':
      return e.status.sune && sp.sune && r > 1 ? sp.sune : rot(t.yousu);
    case 'enemy_henoheno_kacho':
      return e.hpRate <= 0.3 && sp.lowHp ? sp.lowHp : rot(t.yousu);
    case 'enemy_chototsu': {
      // it glares at X while it charges (51 8.4)
      if (e.status.tame && sp.tame) {
        const x = s.party.find((u) => u.id === e.status.stareAt);
        return fill(sp.tame, { target: x?.name ?? 'こっち' });
      }
      return rot(t.yousu);
    }
    case 'enemy_mujin_hanbaiin':
      // the first round: Kanenari-kun's flip; then 2 and 3 in turn
      return r === 1 && sp.first ? sp.first : t.yousu[r % t.yousu.length];
    case 'enemy_tetsuya':
      if ((e.status.kyuukei ?? 0) > 0 || e.mem.restEnded) return sp.kyuukei ?? rot(t.yousu);
      if (e.status.tame && sp.tame) return sp.tame;
      if (e.status.tetsuya && sp.tetsuya && r % 2 === 1) return sp.tetsuya;
      return t.yousu[Math.floor((r - 1) / 2) % t.yousu.length];
  }
  return rot(t.yousu);
}
