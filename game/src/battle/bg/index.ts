// Background factory: bg id (or enemy default) → Background instance.
import type { Background } from './common';
import { ResidentialBg } from './residential';
import { RainBg } from './rain';
import { KanenariBg } from './kanenari';
import { OjigiBg } from './ojigi';
import { MallBg } from './mall';
import { BossBg } from './boss';

export type { Background } from './common';

const ALIASES: Record<string, string> = {
  bg_pr_board: 'bg_kanenari',
  bg_boss_clocks: 'bg_boss',
};

export const BG_IDS = ['bg_residential', 'bg_reverse_rain', 'bg_kanenari', 'bg_ojigi', 'bg_mall_floor', 'bg_boss'];

export function makeBackground(id: string, enemyId: string): Background {
  const bid = ALIASES[id] ?? id;
  switch (bid) {
    case 'bg_reverse_rain':
      return new RainBg(enemyId);
    case 'bg_kanenari':
      return new KanenariBg();
    case 'bg_ojigi':
      return new OjigiBg();
    case 'bg_mall_floor':
      return new MallBg(enemyId);
    case 'bg_boss':
      return new BossBg();
    default:
      return new ResidentialBg(enemyId);
  }
}
