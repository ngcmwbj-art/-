// Text selection helpers for the battle band (様子 rotation etc.).

import type { BattleScene } from './scene';
import { measure } from '../engine/font';

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
    if (r >= 4) return sp.round4;
    if (r >= 3) return sp.round3;
    return t.yousu[(r - 1) % t.yousu.length];
  }
  if (e.id === 'enemy_hato_kakaricho' && e.hpRate <= 0.3 && sp.lowHp) return sp.lowHp;
  if (e.id === 'enemy_semi_final' && e.status.shindafuri && sp.shindafuri) return sp.shindafuri;
  if (e.id === 'enemy_ojigi_jihanki' && e.status.tame && sp.tame) return sp.tame;
  return t.yousu[(r - 1) % t.yousu.length];
}
