// Text selection helpers for the battle band (様子 rotation etc.).

import type { BattleScene } from './scene';

/** 〔様子〕 for the command phase (15.3): per enemy, per round, with specials. */
export function yousuText(s: BattleScene): string {
  const e = s.aliveEnemies.find((x) => x.def.boss) ?? s.aliveEnemies[0];
  if (!e) return '';
  const t = e.def.texts;
  const r = Math.max(1, s.round);
  const sp = t.yousuSpecial ?? {};
  if (e.def.boss) {
    if (s.memo.bossFinal) return '';
    if (s.bossChime.lit >= 3) return sp.chime3;
    if (s.memo.bossPhase >= 2) {
      const list = [sp.p2a, sp.p2b, sp.p2c];
      return list[(r - 1) % list.length];
    }
    return t.yousu[(r - 1) % t.yousu.length];
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
