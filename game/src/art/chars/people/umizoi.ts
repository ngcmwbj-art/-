// 海ぞいの町の人 (62_ch3_level_art 10.6; ids and roles 60 0.4). The names are
// provisional (60 3.2): the sprites are registered under the people's ids,
// which name their roles (npc_c3_shokudo, npc_c3_sirenban…), never a name.
//
// One body for the whole town, dressed per person: the sea-town tan (#C98A6A
// and its shade #8A5A3A, 10.0), white hair for the old, black for the young,
// and one thing each that tells the job at a glance (the silhouette's key):
//   npc_c3_shokudo      the white triangle scarf and the big ladle, a red apron
//   npc_c3_jouren       the twisted headband and yellow boots (sits at the counter)
//   npc_c3_seri         the cap with its number plate, a hand up (the auction's signs)
//   npc_c3_seri_deshi   the cap with a hand-written plate, a rubber apron, a short ponytail
//   npc_c3_sirenban     the stopwatch on his neck, an old grey work suit, a little bent
//   npc_c3_toudai       the polishing cloth and the white sun hat, indigo もんぺ
//   npc_c3_mago         the goggles up on the forehead, sunburnt, a T-shirt and shorts
//   npc_c3_kanshiin     the red cap and the whistle (sits up on the lifeguard chair)
//   npc_c3_himono_otto  the same 割烹着 as his wife, shaved head, yellow gloves
//   npc_c3_himono_tsuma the same 割烹着, a bun, yellow gloves (side by side, a mirror)
//   npc_c3_tsuri        the straw hat and a vest of pockets, white beard (sits)
//   npc_c3_uketsuke     the broom and the old navy uniform of the aquarium's desk
//   npc_c3_kid_a/b/c    a straw hat / a shaved, sunburnt head / pigtails
// The real-time noon rim (a 1px white on the crown, 62 10.0) is the renderer's.

import { flat, mat, type Fig, type Mats, type Mat } from '../fig';
import { legs, sitLegs, type LegSpec, type Seg } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose, type SpriteSpec } from '../rig';
import { registerChar } from '../registry';
import { HAIRMAP, hangArms, hatLift, head, sideArm, sideSwing, upper, type HeadT } from '../kit';

// ---------------------------------------------------------------- materials

const SKIN_SEA = mat('#C98A6A', { shade: '#A86A4E', light: '#E0A882', dark: '#8A5A3A' });
const SKIN_DEEP = mat('#A8693A', { shade: '#8A5A3A', light: '#C98A6A', dark: '#5A3A2A' });
const SKIN_KID = mat('#B87A52', { shade: '#9A6040', light: '#D9A07A', dark: '#7A4A30' });
const SKIN_PALE = mat('#D9A07A', { shade: '#B87A5A', light: '#F2B894', dark: '#8A5A3A' });
const SKIN_YOUNG = mat('#E0A882', { shade: '#C98A6A', light: '#F2B894', dark: '#8A5A3A' });
const HAIR_WHITE = mat('#E8E4D8', { shade: '#C8C2B4', light: '#F4F1E8', dark: '#9AA0A8' });
const HAIR_GREYMIX = mat('#9A968C', { shade: '#6B6A66', light: '#C8C2B4', dark: '#4A4946' });
const HAIR_BLACK = mat('#3A3530', { shade: '#2A2440', light: '#5A4E46', dark: '#1B1733' });

const cloth = (base: string, shade: string, light: string, dark: string): Mat => mat(base, { shade, light, dark });

const BASE: Mats = {
  eye: flat('#2A2440'),
  mouth: flat('#2A2440'),
  shine: flat('#FFF6D8'),
  brow: flat('#4E4A46'),
  blush: flat('#E0907A'),
};

// ---------------------------------------------------------------- heads

/** An adult's head: the face, and hair by style. */
function adultHead(style: 'short' | 'bozu' | 'bun' | 'pony' | 'white_short' | 'hikkume', closed = false): HeadT {
  const hairD: Record<typeof style, string[]> = {
    short: ['..HHhhh...', '.HHhhhhhd.', 'HHhhhhhhdd', 'Hd......dd'],
    white_short: ['..HHhhh...', '.HHhhhhhd.', 'Hhh.....dd', 'h........d'],
    bozu: ['...hhhh...', '.hhhhhhhd.', 'hd......dd'],
    bun: ['..HHhhh...', '.HHhhhhhd.', 'HHhhhhhhdd', 'Hhd....hdd', 'h........d'],
    pony: ['..HHhhh...', '.HHhhhhhd.', 'HHhhhhhhdd', 'Hh-....hdd', 'hd......dd'],
    hikkume: ['...HHhh...', '.HHhhhhhd.', 'Hhh....hdd', 'h........d'],
  };
  const hairU: Record<typeof style, string[]> = {
    short: ['..HHhhh...', '.HHhhhhhd.', 'HHhhhhhhdd', 'hhhhhhhhdd', '.hhhhhhdd.'],
    white_short: ['..HHhhh...', '.HHhhhhhd.', 'HHhhhhhhdd', 'hhhhhhhhdd', '.hhhhhhdd.'],
    bozu: ['...hhhh...', '.hhhhhhhd.', 'hhhhhhhhdd', '.hhhhhhdd.'],
    bun: ['...HHh....', '..HHhhh...', '.HHhhhhhd.', 'HHhhhhhhdd', 'hhhhhhhhdd', '.hhhhhhdd.'],
    pony: ['..HHhhh...', '.HHhhhhhd.', 'HHhhhhhhdd', 'hhhhhhhhdd', '.hhhhhhdd.', '...hhd....', '...hd.....'],
    hikkume: ['...HHh....', '.HHhhhhhd.', 'HHhhhhhhdd', 'hhhhhhhhdd', '.hhhhhhdd.'],
  };
  const hairL: Record<typeof style, string[]> = {
    short: ['..######..', '.########d', '##########', '#d...#####', '.....####.'],
    white_short: ['..######..', '.########d', '###..#####', '.....####.'],
    bozu: ['...####...', '.#######d.', '#....####.'],
    bun: ['..######..', '.########d', '##########', '#d...######', '.....####.'],
    pony: ['..######..', '.########d', '##########', '#d...######', '.....#####', '.......##d'],
    hikkume: ['..######..', '.#######d#', '##....####', '.....####.'],
  };
  const eyes = { x: 6, d: 3, y: 5, h: closed ? 1 : 2, closed, brow: { dy: -1, mat: 'brow', w: 1 } };
  return {
    faceD: [4, 3, ['.######.', '########', '########', '########', '.######.', '..####..']],
    hairD: [3, 0, hairD[style], HAIRMAP],
    eyesD: eyes,
    mouthD: [7, 7, 2],
    neckD: [7, 9, 2],
    hairU: [3, 0, hairU[style], HAIRMAP],
    napeU: [5, 7, ['######', '.####.']],
    faceL: [3, 3, ['.####...', '#####...', '######..', '#####...', '.####...', '..##....']],
    hairL: [3, 0, hairL[style]],
    eyeL: { x: 4, y: 5, h: closed ? 1 : 2, closed, brow: { dy: -1, mat: 'brow', w: 1 } },
    earL: [8, 5],
    mouthL: [3, 7],
    neckL: [5, 9, 2],
    upD: style === 'bozu' ? { fringe: 'none' } : undefined,
  };
}

/** A child's head (bigger, rounder; walkers.ts KID_HEAD's proportions). */
function kidHead(style: 'short' | 'bozu' | 'pig'): HeadT {
  const hairD = style === 'bozu' ? ['...hhhh...', '.hhhhhhhd.', 'hd......dd'] : style === 'pig' ? ['..HHhhhh..', '.HHhhhhhhd', 'HHhhhhhhdd', 'Hd......dd', 'd........d'] : ['..HHhhhh..', '.HHhhhhhhd', 'HHhhhhhhdd', 'hd......dd'];
  return {
    faceD: [3, 3, ['.########.', '##########', '##########', '##########', '.########.', '..######..']],
    hairD: [3, 1, hairD, HAIRMAP],
    upD: { fringe: 'none' },
    eyesD: { x: 5, d: 5, y: 5, h: 2, shine: true },
    mouthD: [7, 7, 2],
    blushD: [4, 11, 7],
    neckD: [7, 9, 2],
    hairU: [3, 1, ['..hhhhhh..', '.hhhhhhhhd', 'hhhhhhhhdd', 'hhhhhhhhdd', '.dhhhhhdd.'], HAIRMAP],
    napeU: [4, 6, ['########', '.######.']],
    faceL: [2, 2, ['.#####....', '######....', '######....', '#######...', '#######...', '.#####....', '..###.....']],
    hairL: [3, 1, style === 'bozu' ? ['...####...', '..######d.', '.....####.'] : ['..######..', '.#########', '......####', '.......##d']],
    eyeL: { x: 4, y: 5, h: 2, shine: true },
    earL: [8, 5],
    mouthL: [3, 7],
    blushL: [5, 7],
    neckL: [5, 9, 2],
  };
}

// ---------------------------------------------------------------- the look of a person

type Hat = 'cap' | 'cap_red' | 'sankaku' | 'hachimaki' | 'mugiwara' | 'hiyoke' | 'workcap' | 'goggles' | 'kid_mugi' | null;
type Thing = 'otama' | 'stopwatch' | 'whistle' | 'houki' | 'nuno' | 'gloves' | 'nafuda' | 'hand_up' | 'beard' | 'pigtails' | 'kago' | 'fukuro' | 'hako' | null;

interface Look {
  id: string;
  mats: Mats;
  head: HeadT;
  /** px shorter than 24 (the whole figure sits lower; the legs shorten). */
  short: number;
  kid?: boolean;
  /** top: the shirt / jacket material; sleeves 'long' | 'short' | 'none'. */
  sleeve: 'long' | 'short';
  /** 'pants' | 'shorts' | 'mompe' (wide trousers) */
  bottom: 'pants' | 'shorts' | 'mompe';
  /** An apron (割烹着 covers the body; maekake from the waist). */
  apron?: 'kappogi' | 'maekake' | 'gom';
  hat: Hat;
  things: Thing[];
  /** A little bent (the old siren keeper). */
  bent?: boolean;
  /** Has a seated pose. */
  sit?: boolean;
  /**
   * Eats (62 3.4・7.3 eat_loop): seated with a bowl, the chopsticks to the
   * mouth, the hands almost together — stopped 0.2 s — and back to the bowl.
   */
  eat?: boolean;
  /**
   * A customer of the market (港の 市場, fix1015 G2): has the held 'reach'
   * pose — a hand out over the fish boxes, an アジ in it — one frame, still
   * (12:00: the town stopped where it was, 60 4.4).
   */
  reach?: boolean;
  shoe: string;
  keep?: string[];
}

const LIMB: Record<Look['sleeve'], (m: string) => Seg[]> = {
  long: (m) => [{ mat: m, n: 3 }, { mat: 'skin' }],
  short: (m) => [{ mat: m, n: 1 }, { mat: 'skin' }],
};

function legSpec(L: Look): LegSpec {
  const hip = 17 + (L.kid ? 2 : 0) + (L.kid ? 0 : Math.min(2, L.short));
  const pants = L.bottom === 'shorts' ? 'pants' : 'pants';
  return {
    cx: 8,
    hip,
    foot: 22,
    w: L.bottom === 'mompe' ? 3 : 2,
    gap: L.bottom === 'mompe' ? 1 : 2,
    mat: pants,
    low: L.bottom === 'shorts' ? { mat: 'skin', h: L.kid ? 2 : 3 } : undefined,
    shoe: 'shoe',
    shoeLen: 3,
    shoeH: L.shoe === 'boot' ? 3 : 1,
  };
}

/** Headwear per view (y = the head template's top). */
function hat(f: Fig, p: Pose, L: Look, hy: number): void {
  const y = hy + hatLift(p);
  const v = p.view;
  switch (L.hat) {
    case 'cap':
    case 'cap_red':
    case 'workcap': {
      f.part('hat', { shade: 'rb', light: 't' });
      if (v === 'down') {
        f.rows(3, y - 1, ['..######..', '.########.', '##########']);
        f.part('hat', { shade: 'b', light: '' });
        f.hl(3, 12, y + 2);
        if (L.hat === 'cap' || L.id === 'npc_c3_seri_deshi') {
          // the number plate on the front (a white board, a dark stroke; hand-written for the apprentice)
          f.part('plate', { flat: true, rim: false });
          f.rect(7, y, 3, 2);
          f.part('eye', { flat: true, rim: false });
          if (L.id === 'npc_c3_seri_deshi') f.px(7, y).px(9, y + 1);
          else f.px(8, y).px(8, y + 1);
        }
      } else if (v === 'up') {
        f.rows(3, y - 1, ['..######..', '.########.', '##########', '##########']);
        f.part('hat', { flat: true });
        f.t(-1).hl(6, 9, y + 2).t(null);
      } else {
        f.rows(3, y - 1, ['..#######.', '.#########', '##########']);
        f.part('hat', { shade: 'b', light: '' });
        f.hl(0, 4, y + 2);
      }
      return;
    }
    case 'sankaku': {
      f.part('hat', { shade: 'rb', light: 't' });
      if (v === 'down') f.rows(3, y - 1, ['..######..', '.########.', '##########', 'h........h']);
      else if (v === 'up') {
        f.rows(3, y - 1, ['..######..', '.########.', '##########', '.########.', '...####...', '....##....']);
      } else f.rows(3, y - 1, ['..######..', '.#########', '##########', '.......###', '........##']);
      return;
    }
    case 'hachimaki': {
      f.part('hat', { flat: true, rim: false });
      if (v === 'down') {
        f.hl(3, 12, y + 2);
        f.part('band2', { flat: true, rim: false });
        for (let x = 3; x <= 12; x += 2) f.px(x, y + 2);
      } else if (v === 'up') {
        f.hl(3, 12, y + 2);
        f.part('band2', { flat: true, rim: false });
        f.px(7, y + 3).px(8, y + 3).px(6, y + 4).px(9, y + 4);
      } else {
        f.hl(3, 12, y + 2);
        f.part('band2', { flat: true, rim: false });
        f.px(12, y + 3).px(13, y + 4);
      }
      return;
    }
    case 'mugiwara':
    case 'kid_mugi':
    case 'hiyoke': {
      f.part('hat', { shade: 'rb', light: 't' });
      const crown = L.hat === 'hiyoke' ? ['...####...', '..######..'] : ['..######..', '.########.'];
      if (v === 'left') {
        f.rows(3, y - 2, crown);
        f.rows(0, y, ['#############.']);
      } else {
        f.rows(3, y - 2, crown);
        f.rows(1, y, ['..############..', '.##############.']);
        if (L.hat !== 'hiyoke') {
          f.part('band2', { flat: true, rim: false });
          f.hl(4, 11, y - 1);
        }
      }
      return;
    }
    case 'goggles': {
      if (v === 'up') {
        f.part('band2', { flat: true, rim: false });
        f.hl(3, 12, y + 2);
        return;
      }
      f.part('band2', { flat: true, rim: false });
      f.hl(3, 12, y + 2);
      f.part('glass', { shade: '', light: '' });
      if (v === 'down') f.rect(5, y + 1, 2, 2).rect(9, y + 1, 2, 2);
      else f.rect(2, y + 1, 2, 2);
      return;
    }
    default:
  }
}

/** The things that tell the job (front / back / side). */
function things(f: Fig, p: Pose, L: Look, u: number, hy: number): void {
  const v = p.view;
  for (const t of L.things) {
    switch (t) {
      case 'otama':
        // the big ladle held up at the chest, its bowl over the right hand
        if (v === 'down') {
          f.part('steel', { flat: true, rim: false });
          f.line(11, 12 + u, 12, 17 + u);
          f.part('steel', { shade: 'rb', light: 't' });
          f.rect(10, 11 + u - (p.ph & 1), 3, 2);
        } else if (v === 'left') {
          f.part('steel', { flat: true, rim: false });
          f.line(5, 14 + u, 3, 11 + u);
          f.part('steel', { shade: 'rb', light: 't' });
          f.rect(2, 10 + u, 3, 2);
        }
        break;
      case 'stopwatch':
        if (v !== 'up') {
          f.part('cord', { flat: true, rim: false });
          if (v === 'down') f.px(6, 11 + u).px(9, 11 + u).px(7, 12 + u).px(8, 12 + u);
          f.part('steel', { shade: 'rb', light: 't' });
          f.rect(v === 'down' ? 7 : 4, 13 + u, 2, 2);
        }
        break;
      case 'whistle':
        if (v !== 'up') {
          f.part('cord', { flat: true, rim: false });
          if (v === 'down') f.px(6, 11 + u).px(9, 11 + u).px(7, 12 + u);
          f.part('whistle', { flat: true, rim: false });
          f.rect(v === 'down' ? 7 : 4, 13 + u, 2, 1);
        }
        break;
      case 'houki':
        // the broom held on her right, its head on the ground
        if (v !== 'up') {
          const bx = v === 'down' ? 13 : 2;
          f.part('stick', { flat: true, rim: false });
          f.vl(bx, 10 + u, 19);
          f.part('broom', { shade: 'rb', light: 't' });
          f.rows(bx - 1, 19, ['###', '####', '#####'].map((r) => r.slice(0, 3 + (v === 'down' ? 0 : 0))));
        }
        break;
      case 'nuno':
        if (v === 'down') {
          f.part('nuno', { shade: 'rb', light: 't' });
          f.rect(2, 15 + u + (p.ph & 1), 3, 3);
        } else if (v === 'left') {
          f.part('nuno', { shade: 'rb', light: 't' });
          f.rect(2, 14 + u + (p.ph & 1), 3, 3);
        }
        break;
      case 'gloves':
        f.part('gloves', { shade: 'rb', light: 't' });
        if (v === 'down' || v === 'up') {
          f.rect(2, 16 + u, 2, 2);
          f.rect(12, 16 + u, 2, 2);
        } else f.rect(7, 16 + u, 2, 2);
        break;
      case 'nafuda':
        if (v === 'down') {
          f.part('plate', { flat: true, rim: false });
          f.rect(5, 13 + u, 2, 1);
        }
        break;
      case 'hand_up':
        // the auctioneer's hand raised in his signs (the fingers change in fucho; idle holds one)
        if (v === 'down') {
          f.part('sleeve', { shade: 'rb', light: 't' });
          f.vl(12, 9 + u, 13 + u);
          f.vl(13, 9 + u, 12 + u);
          f.part('skin', { shade: 'rb', light: 't' });
          f.rect(12, 7 + u, 2, 2);
          f.px(12 + (p.ph % 2), 6 + u);
        }
        break;
      case 'beard':
        if (v === 'down') {
          f.part('beard', { flat: true, rim: false });
          f.hl(6, 9, hy + 8).hl(7, 8, hy + 9);
        } else if (v === 'left') {
          f.part('beard', { flat: true, rim: false });
          f.hl(3, 5, hy + 8).px(4, hy + 9);
        }
        break;
      case 'kago': {
        // the shopping basket on the left arm (woven, a handle over the forearm)
        f.part('kago', { shade: 'rb', light: 't' });
        if (v === 'down') {
          f.rect(0, 16 + u, 4, 3);
          f.part('kagoD', { flat: true, rim: false });
          f.hl(0, 3, 17 + u);
          f.px(1, 15 + u).px(2, 15 + u);
        } else if (v === 'up') {
          f.rect(12, 16 + u, 4, 3);
          f.part('kagoD', { flat: true, rim: false });
          f.hl(12, 15, 17 + u);
        } else {
          f.rect(8, 17 + u, 4, 3);
          f.part('kagoD', { flat: true, rim: false });
          f.hl(8, 11, 18 + u);
          f.px(9, 16 + u).px(10, 16 + u);
        }
        break;
      }
      case 'fukuro':
        // a white plastic bag in the right hand, its tail of green (the leek of the evening)
        f.part('fukuro', { shade: 'rb', light: 't' });
        if (v === 'down') {
          f.rect(12, 17 + u, 3, 4);
          f.part('negi', { flat: true, rim: false });
          f.px(13, 16 + u).px(14, 15 + u);
        } else if (v === 'up') f.rect(1, 17 + u, 3, 4);
        else {
          f.rect(6, 17 + u, 3, 4);
          f.part('negi', { flat: true, rim: false });
          f.px(7, 16 + u).px(6, 15 + u);
        }
        break;
      case 'hako':
        // a foam fish box carried at the chest (bought by the box), the ice white over its rim
        f.part('hako', { shade: 'rb', light: 't' });
        if (v === 'down') {
          f.rect(3, 14 + u, 10, 4);
          f.part('ice', { flat: true, rim: false });
          f.hl(4, 11, 14 + u);
        } else if (v === 'up') {
          f.rect(2, 14 + u, 2, 3).rect(12, 14 + u, 2, 3);
        } else {
          f.rect(1, 14 + u, 7, 4);
          f.part('ice', { flat: true, rim: false });
          f.hl(2, 7, 14 + u);
        }
        break;
      case 'pigtails':
        f.part('hair', { shade: 'rb', light: 't' });
        if (v === 'down') f.rect(2, hy + 5, 2, 4).rect(12, hy + 5, 2, 4);
        else if (v === 'up') f.rect(2, hy + 5, 2, 4).rect(12, hy + 5, 2, 4);
        else f.rect(11, hy + 5, 2, 4);
        f.part('band2', { flat: true, rim: false });
        if (v !== 'left') f.px(2, hy + 5).px(13, hy + 5);
        break;
      default:
    }
  }
}

function makeDraw(L: Look): (f: Fig, p: Pose) => void {
  const LEGS = legSpec(L);
  const sleeve = LIMB[L.sleeve]('sleeve');
  return (f, p) => {
    const seated = !!L.sit && (p.act === 'sit' || p.act === 'eat');
    const drop = seated ? 3 : 0;
    const d = L.kid ? 4 + Math.max(0, L.short - 5) : Math.min(2, L.short);
    const bentX = L.bent && p.view === 'left' ? -1 : 0;
    const u = upper(p) + d + drop;
    const b = p.bob + d + drop;
    const hy = 2 + u;
    const top = 11 + u;
    const waist = LEGS.hip + b - d - drop;
    if (p.view === 'down' || p.view === 'up') {
      if (seated) sitLegs(f, p, LEGS, 18);
      else legs(f, p, LEGS);
      // the body
      f.part('top', { shade: 'rb', light: 't' });
      f.hl(4, 11, top);
      f.rect(3, top + 1, 10, 2);
      f.rect(4, top + 3, 8, Math.max(1, waist - (top + 3) + 1));
      if (L.apron === 'kappogi') {
        // 割烹着: white over the whole body, its hem over the trousers
        f.part('apron', { shade: 'rb', light: 't' });
        f.hl(5, 10, top);
        f.rect(4, top + 1, 8, waist - top + 2);
        if (p.view === 'down') {
          f.part('apron', { flat: true });
          f.t(-1).hl(5, 10, waist).t(null);
        }
      } else if (L.apron === 'maekake' || L.apron === 'gom') {
        f.part('apron', { shade: 'rb', light: 't' });
        if (p.view === 'down') {
          f.rect(5, top + 2, 6, waist - top - 1);
          f.rect(4, waist, 8, 4);
        } else {
          f.part('apron', { flat: true });
          f.hl(4, 11, waist - 1);
        }
      }
      hangArms(f, p, { lx: 3, rx: 12, sy: top + 2 - u + u, hy: 16 + (L.kid ? 1 : 0), segs: sleeve }, u - (L.kid ? 0 : 0));
      head(f, p, L.head, hy);
    } else {
      const sw = sideSwing(p);
      sideArm(f, 8, top + 2, 3, -sw, sleeve, -1);
      if (seated) sitLegs(f, p, LEGS, 18);
      else legs(f, p, LEGS);
      f.part('top', { shade: 'rb', light: 't' });
      f.hl(6 + bentX, 10 + bentX, top);
      f.rect(5 + bentX, top + 1, 6, Math.max(1, waist - (top + 1) + 1));
      if (L.apron) {
        f.part('apron', { shade: 'r', light: '' });
        f.vl(4 + bentX, top + 2, waist + (L.apron === 'kappogi' ? 1 : 3));
        f.vl(5 + bentX, top + 2, waist + (L.apron === 'kappogi' ? 1 : 3));
      }
      f.part('top', { shade: 'rb', light: 'tl' });
      sideArm(f, 8 + bentX, top + 2, 3, sw, sleeve);
      head(f, p, L.head, hy + (L.bent ? 1 : 0), bentX);
    }
    hat(f, p, L, hy + (L.bent && p.view === 'left' ? 1 : 0));
    things(f, p, L, u, hy);
    if (p.act === 'eat') eating(f, p, u, hy);
    if (p.act === 'reach') reaching(f, p, u);
  };
}

/**
 * The market customer's held hand (Look.reach): out over the fish box, an
 * アジ held up by the tail to look at its eye — and stopped there.
 */
function reaching(f: Fig, p: Pose, u: number): void {
  const v = p.view;
  if (v === 'up') return;
  const top = 11 + u;
  if (v === 'down') {
    f.part('sleeve', { shade: 'rb', light: 't' });
    f.vl(12, top + 2, top + 4);
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(12, top + 5, 2, 2);
    f.part('aji', { flat: true, rim: false });
    f.vl(13, top + 7, top + 10);
    f.px(12, top + 10).px(14, top + 10);
    f.part('eye', { flat: true, rim: false });
    f.px(13, top + 10);
    return;
  }
  // the side: the arm straight out in front, the fish hanging from the fingers
  f.part('sleeve', { shade: 'rb', light: 't' });
  f.hl(2, 6, top + 3);
  f.part('skin', { shade: 'rb', light: 't' });
  f.rect(0, top + 3, 2, 2);
  f.part('aji', { flat: true, rim: false });
  f.vl(1, top + 5, top + 8);
  f.px(0, top + 8).px(2, top + 8);
  f.part('eye', { flat: true, rim: false });
  f.px(1, top + 8);
}

/**
 * eat_loop's hands (62 7.3): ph 0 the bowl at the chest and the chopsticks
 * in it, ph 1 the chopsticks up at the mouth, ph 2 the hands almost
 * together in front of the chest (the いただきます that never comes).
 */
function eating(f: Fig, p: Pose, u: number, hy: number): void {
  const v = p.view;
  if (v === 'up') return;
  const top = 11 + u;
  if (p.ph === 2) {
    // both hands meeting at the chest, a gap of a pixel between them
    f.part('skin', { flat: true, rim: false });
    if (v === 'down') f.rect(6, top + 3, 1, 3).rect(9, top + 3, 1, 3);
    else f.rect(2, top + 3, 2, 3);
    return;
  }
  // the bowl (white, a red rim) held at the chest
  f.part('bowl', { shade: 'rb', light: 't' });
  if (v === 'down') f.rect(4, top + 5, 4, 2);
  else f.rect(1, top + 5, 3, 2);
  f.part('bowlrim', { flat: true, rim: false });
  if (v === 'down') f.hl(4, 7, top + 5);
  else f.hl(1, 3, top + 5);
  // the chopsticks: in the bowl, or up at the mouth
  f.part('hashi', { flat: true, rim: false });
  if (v === 'down') {
    if (p.ph === 1) f.line(9, hy + 9, 11, top + 5);
    else f.line(6, top + 4, 9, top + 1);
  } else if (p.ph === 1) f.line(2, hy + 8, 4, top + 4);
  else f.line(2, top + 4, 4, top + 1);
}

// ---------------------------------------------------------------- the people

const P = (o: Record<string, Mat>): Mats => ({ ...BASE, ...o });

const LOOKS: Look[] = [
  {
    id: 'npc_c3_shokudo',
    mats: P({
      skin: SKIN_PALE, hair: HAIR_GREYMIX,
      top: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'), sleeve: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'),
      apron: cloth('#C8452E', '#8A2E22', '#E06A4E', '#5A1E18'), pants: cloth('#3A3F48', '#2A2440', '#6B7186', '#1B1733'),
      hat: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'), shoe: flat('#5A3A2A'), steel: cloth('#C8CDD4', '#9AA0A8', '#F4F1E8', '#6B7186'),
    }),
    head: adultHead('bun', true), short: 2, sleeve: 'long', bottom: 'pants', apron: 'maekake', hat: 'sankaku', things: ['otama'], shoe: 'shoe',
  },
  {
    id: 'npc_c3_jouren',
    mats: P({
      skin: SKIN_DEEP, hair: HAIR_BLACK,
      top: cloth('#2F3A5A', '#1B2440', '#4A5A7A', '#14182A'), sleeve: cloth('#2F3A5A', '#1B2440', '#4A5A7A', '#14182A'),
      pants: cloth('#2F3A5A', '#1B2440', '#4A5A7A', '#14182A'), hat: flat('#F4F1E8'), band2: flat('#2F4A8A'),
      shoe: cloth('#E8C83A', '#B8981A', '#FFE07A', '#7A6410'),
    }),
    head: adultHead('bozu'), short: 1, sleeve: 'long', bottom: 'pants', hat: 'hachimaki', things: [], shoe: 'boot', sit: true,
  },
  {
    id: 'npc_c3_seri',
    mats: P({
      skin: SKIN_SEA, hair: HAIR_WHITE,
      top: cloth('#2F3A5A', '#1B2440', '#4A5A7A', '#14182A'), sleeve: cloth('#2F3A5A', '#1B2440', '#4A5A7A', '#14182A'),
      pants: cloth('#3A3F48', '#2A2440', '#6B7186', '#1B1733'), hat: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'),
      plate: flat('#FFF6D8'), shoe: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'),
    }),
    head: adultHead('white_short'), short: 2, sleeve: 'long', bottom: 'pants', hat: 'cap', things: ['hand_up'], shoe: 'boot',
  },
  {
    id: 'npc_c3_seri_deshi',
    mats: P({
      skin: SKIN_YOUNG, hair: HAIR_BLACK,
      top: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'), sleeve: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'),
      apron: cloth('#2E6A72', '#1E4A52', '#4A8A90', '#14343A'), pants: cloth('#3A3F48', '#2A2440', '#6B7186', '#1B1733'),
      hat: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'), plate: flat('#FFF6D8'), shoe: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'),
    }),
    head: adultHead('pony'), short: 2, sleeve: 'short', bottom: 'pants', apron: 'gom', hat: 'cap', things: [], shoe: 'boot',
  },
  {
    id: 'npc_c3_sirenban',
    mats: P({
      skin: SKIN_SEA, hair: HAIR_WHITE,
      top: cloth('#8E95A6', '#6B7186', '#B0B6C4', '#4A4E58'), sleeve: cloth('#8E95A6', '#6B7186', '#B0B6C4', '#4A4E58'),
      pants: cloth('#8E95A6', '#6B7186', '#B0B6C4', '#4A4E58'), hat: cloth('#6B7186', '#4A4E58', '#8E95A6', '#2A2440'),
      cord: flat('#E84E3C'), steel: cloth('#C8CDD4', '#9AA0A8', '#F4F1E8', '#6B7186'), shoe: flat('#3A3F48'),
    }),
    head: adultHead('white_short', true), short: 3, sleeve: 'long', bottom: 'pants', hat: 'workcap', things: ['stopwatch'], bent: true, shoe: 'shoe',
    // (灯台の 名のり：夜の 防波堤の 石の ベンチに すわる。events/ch3/nanori.ts)
    sit: true,
  },
  {
    id: 'npc_c3_toudai',
    mats: P({
      skin: SKIN_SEA, hair: HAIR_WHITE,
      top: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'), sleeve: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'),
      pants: cloth('#2F4A8A', '#243A72', '#4A6AAE', '#1B1733'), hat: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'),
      nuno: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'), shoe: flat('#3A3F48'),
    }),
    head: adultHead('bun', true), short: 4, sleeve: 'long', bottom: 'mompe', hat: 'hiyoke', things: ['nuno'], shoe: 'shoe',
  },
  {
    id: 'npc_c3_mago',
    mats: P({
      skin: SKIN_KID, hair: HAIR_BLACK,
      top: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'), sleeve: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'),
      pants: cloth('#3A7EA8', '#2A5A82', '#5AA0C8', '#1A3A5A'), band2: flat('#E84E3C'), glass: cloth('#7FD1E8', '#4AA8E0', '#B8E8F4', '#2F7AB0'),
      shoe: flat('#E84E3C'),
    }),
    head: adultHead('short'), short: 5, sleeve: 'short', bottom: 'shorts', hat: 'goggles', things: [], shoe: 'shoe',
  },
  {
    id: 'npc_c3_kanshiin',
    mats: P({
      skin: SKIN_KID, hair: HAIR_BLACK,
      top: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'), sleeve: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'),
      pants: cloth('#E84E3C', '#B8302A', '#FF6A4D', '#8A2E22'), hat: cloth('#E84E3C', '#B8302A', '#FF6A4D', '#8A2E22'),
      cord: flat('#FFD23F'), whistle: flat('#FFD23F'), shoe: flat('#3A3F48'),
    }),
    head: adultHead('short'), short: 0, sleeve: 'short', bottom: 'shorts', hat: 'cap_red', things: ['whistle'], shoe: 'shoe', sit: true,
  },
  {
    id: 'npc_c3_himono_otto',
    mats: P({
      skin: SKIN_SEA, hair: HAIR_BLACK,
      top: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'), sleeve: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'),
      apron: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'), pants: cloth('#3A3F48', '#2A2440', '#6B7186', '#1B1733'),
      gloves: cloth('#E8C83A', '#B8981A', '#FFE07A', '#7A6410'), shoe: flat('#3A3F48'),
    }),
    head: adultHead('bozu'), short: 2, sleeve: 'long', bottom: 'pants', apron: 'kappogi', hat: null, things: ['gloves'], shoe: 'boot',
  },
  {
    id: 'npc_c3_himono_tsuma',
    mats: P({
      skin: SKIN_SEA, hair: HAIR_BLACK,
      top: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'), sleeve: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'),
      apron: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'), pants: cloth('#3A3F48', '#2A2440', '#6B7186', '#1B1733'),
      gloves: cloth('#E8C83A', '#B8981A', '#FFE07A', '#7A6410'), shoe: flat('#3A3F48'),
    }),
    head: adultHead('bun'), short: 3, sleeve: 'long', bottom: 'pants', apron: 'kappogi', hat: null, things: ['gloves'], shoe: 'boot',
  },
  {
    id: 'npc_c3_tsuri',
    mats: P({
      skin: SKIN_SEA, hair: HAIR_WHITE,
      top: cloth('#8A7A4A', '#6A5A3A', '#A89A6A', '#4A3E2A'), sleeve: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'),
      pants: cloth('#5A6B7A', '#3A4A5A', '#7A8B9A', '#2A3440'), hat: cloth('#E8D9A0', '#C8B070', '#F6E8C0', '#9A8040'),
      band2: flat('#5A3A2A'), beard: flat('#E8E4D8'), shoe: flat('#3A3F48'),
    }),
    head: adultHead('white_short', true), short: 1, sleeve: 'long', bottom: 'pants', hat: 'mugiwara', things: ['beard'], shoe: 'shoe', sit: true,
  },
  {
    id: 'npc_c3_uketsuke',
    mats: P({
      skin: SKIN_PALE, hair: HAIR_GREYMIX,
      top: cloth('#2F3A5A', '#1B2440', '#4A5A7A', '#14182A'), sleeve: cloth('#2F3A5A', '#1B2440', '#4A5A7A', '#14182A'),
      pants: cloth('#2F3A5A', '#1B2440', '#4A5A7A', '#14182A'), plate: flat('#FFF6D8'),
      stick: flat('#8A5A3A'), broom: cloth('#C8A06A', '#A87A4A', '#E8C890', '#7A5A3A'), shoe: flat('#3A3F48'),
    }),
    head: adultHead('hikkume', true), short: 3, sleeve: 'long', bottom: 'pants', hat: null, things: ['houki', 'nafuda'], shoe: 'shoe',
    // (本日は、開館です：開館の あとは 入口の 中の ベンチに すわる。events/ch3/iso.ts)
    sit: true,
  },
  {
    id: 'npc_c3_kid_a',
    mats: P({
      skin: SKIN_KID, hair: HAIR_BLACK,
      top: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'), sleeve: cloth('#F4F1E8', '#C8C2B4', '#FFF6D8', '#9AA0A8'),
      pants: cloth('#3A7EA8', '#2A5A82', '#5AA0C8', '#1A3A5A'), hat: cloth('#E8D9A0', '#C8B070', '#F6E8C0', '#9A8040'), band2: flat('#E84E3C'),
      shoe: flat('#E84E3C'),
    }),
    head: kidHead('short'), short: 7, kid: true, sleeve: 'short', bottom: 'shorts', hat: 'kid_mugi', things: [], shoe: 'shoe',
  },
  {
    id: 'npc_c3_kid_b',
    mats: P({
      skin: SKIN_DEEP, hair: HAIR_BLACK,
      top: cloth('#4AA8E0', '#2F7AB0', '#7FD1E8', '#1A4A7A'), sleeve: cloth('#4AA8E0', '#2F7AB0', '#7FD1E8', '#1A4A7A'),
      pants: cloth('#3A3F48', '#2A2440', '#6B7186', '#1B1733'), shoe: flat('#F4F1E8'),
    }),
    head: kidHead('bozu'), short: 6, kid: true, sleeve: 'short', bottom: 'shorts', hat: null, things: [], shoe: 'shoe',
  },
  {
    id: 'npc_c3_kid_c',
    mats: P({
      skin: SKIN_KID, hair: HAIR_BLACK,
      top: cloth('#FFD23F', '#D9A441', '#FFE07A', '#A8742A'), sleeve: cloth('#FFD23F', '#D9A441', '#FFE07A', '#A8742A'),
      pants: cloth('#E84E3C', '#B8302A', '#FF6A4D', '#8A2E22'), band2: flat('#E84E3C'), shoe: flat('#F4F1E8'),
    }),
    head: kidHead('pig'), short: 6, kid: true, sleeve: 'short', bottom: 'shorts', hat: null, things: ['pigtails'], shoe: 'shoe',
  },
  // 食堂かもめ's two customers on the tatami (62 4.3: 町の人2人, eat_loop): not to be spoken to
  {
    id: 'c3_kyaku_a',
    mats: P({
      skin: SKIN_DEEP, hair: HAIR_GREYMIX,
      top: cloth('#5A7A8A', '#3A5A6A', '#7A9AAA', '#2A3A4A'), sleeve: cloth('#5A7A8A', '#3A5A6A', '#7A9AAA', '#2A3A4A'),
      pants: cloth('#3A3F48', '#2A2440', '#6B7186', '#1B1733'), hat: flat('#F4F1E8'), band2: flat('#3A7EA8'),
      bowl: cloth('#F4F1E8', '#C8C2B4', '#FFFFFF', '#9AA0A8'), bowlrim: flat('#C8452E'), hashi: flat('#C8A06A'), shoe: flat('#3A3F48'),
    }),
    head: adultHead('bozu'), short: 1, sleeve: 'short', bottom: 'pants', hat: 'hachimaki', things: [], shoe: 'shoe', sit: true, eat: true,
  },
  {
    id: 'c3_kyaku_b',
    mats: P({
      skin: SKIN_PALE, hair: HAIR_BLACK,
      top: cloth('#E8A0A0', '#C87A7A', '#F4C0C0', '#8A4A4A'), sleeve: cloth('#E8A0A0', '#C87A7A', '#F4C0C0', '#8A4A4A'),
      pants: cloth('#5A5E66', '#3A3F48', '#7A8088', '#2A2440'),
      bowl: cloth('#F4F1E8', '#C8C2B4', '#FFFFFF', '#9AA0A8'), bowlrim: flat('#2F4A8A'), hashi: flat('#5A3A2A'), shoe: flat('#3A3F48'),
    }),
    head: adultHead('short'), short: 3, sleeve: 'short', bottom: 'pants', hat: null, things: [], shoe: 'shoe', sit: true, eat: true,
  },
  // 港の 市場's customers (fix1015 G2, 依頼主「お客がいる雰囲気が欲しい」): out for the day's fish with a basket, a bag,
  // a box bought whole; rubber boots (ゴム長) on the floor of the wet market. One of them can be spoken to
  // (c3_ichiba_kyaku: events/ch3/umizoi.ts); the others walk by (passerby)
  {
    id: 'c3_ichiba_kyaku',
    mats: P({
      skin: SKIN_SEA, hair: HAIR_GREYMIX,
      top: cloth('#8E7AA8', '#6A5A88', '#B0A0C8', '#3A2E5A'), sleeve: cloth('#8E7AA8', '#6A5A88', '#B0A0C8', '#3A2E5A'),
      apron: cloth('#E8A0A0', '#C87A7A', '#F4C0C0', '#8A4A4A'), pants: cloth('#3A3F48', '#2A2440', '#6B7186', '#1B1733'),
      kago: cloth('#C8A06A', '#A87A4A', '#E8C890', '#7A5A3A'), kagoD: flat('#7A5A3A'), aji: flat('#C8CDD4'),
      shoe: cloth('#E8C83A', '#B8981A', '#FFE07A', '#7A6410'),
    }),
    head: adultHead('bun'), short: 4, sleeve: 'long', bottom: 'pants', apron: 'maekake', hat: null, things: ['kago'], shoe: 'boot', reach: true,
  },
  {
    id: 'c3_ichiba_okyaku_a',
    mats: P({
      skin: SKIN_DEEP, hair: HAIR_WHITE,
      top: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'), sleeve: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'),
      pants: cloth('#5A6B7A', '#3A4A5A', '#7A8B9A', '#2A3440'), hat: flat('#F4F1E8'), band2: flat('#2F4A8A'),
      hako: cloth('#F4F1E8', '#C8C2B4', '#FFFFFF', '#9AA0A8'), ice: flat('#C8E8F4'), aji: flat('#C8CDD4'),
      shoe: cloth('#3A3F48', '#2A2440', '#6B7186', '#1B1733'),
    }),
    head: adultHead('white_short'), short: 2, sleeve: 'long', bottom: 'pants', hat: 'hachimaki', things: ['hako'], shoe: 'boot', reach: true,
  },
  {
    id: 'c3_ichiba_okyaku_b',
    mats: P({
      skin: SKIN_YOUNG, hair: HAIR_BLACK,
      top: cloth('#7FB8C8', '#5A98A8', '#A8D8E4', '#2F6A7A'), sleeve: cloth('#7FB8C8', '#5A98A8', '#A8D8E4', '#2F6A7A'),
      pants: cloth('#C8B890', '#A89870', '#E8D8B0', '#6A5A3A'),
      fukuro: cloth('#F4F1E8', '#C8C2B4', '#FFFFFF', '#9AA0A8'), negi: flat('#3FA66B'), aji: flat('#C8CDD4'),
      shoe: flat('#E84E3C'),
    }),
    head: adultHead('short'), short: 3, sleeve: 'short', bottom: 'pants', hat: null, things: ['fukuro'], shoe: 'shoe', reach: true,
  },
  {
    id: 'c3_ichiba_okyaku_c',
    mats: P({
      skin: SKIN_PALE, hair: HAIR_WHITE,
      top: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'), sleeve: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'),
      apron: cloth('#E8E4D8', '#C8C2B4', '#F4F1E8', '#9AA0A8'), pants: cloth('#5A5E66', '#3A3F48', '#7A8088', '#2A2440'),
      kago: cloth('#C8A06A', '#A87A4A', '#E8C890', '#7A5A3A'), kagoD: flat('#7A5A3A'), aji: flat('#C8CDD4'),
      shoe: cloth('#3A3F48', '#2A2440', '#6B7186', '#1B1733'),
    }),
    head: adultHead('hikkume'), short: 4, sleeve: 'long', bottom: 'mompe', apron: 'kappogi', hat: null, things: ['kago'], shoe: 'boot', bent: true, reach: true,
  },
];

// idle loops: a working gesture for some (the ladle bobs, the cloth polishes, the broom sweeps)
const WORK: IdleKey[] = [...rep([{ ph: 0 }, { ph: 0 }, { ph: 1 }, { ph: 1 }], 3), { ph: 0, blink: true }, { ph: 0 }, { ph: 1 }, { ph: 1 }];
/** eat_loop: to the mouth (2 frames), the hands almost together (stopped 0.2 s), back to the bowl. */
const EAT: IdleKey[] = [
  { act: 'eat', ph: 0 }, { act: 'eat', ph: 0, breath: 1 }, { act: 'eat', ph: 1 }, { act: 'eat', ph: 1 },
  { act: 'eat', ph: 0 }, { act: 'eat', ph: 0, blink: true }, { act: 'eat', ph: 2 }, { act: 'eat', ph: 0 },
];
const SIT: IdleKey[] = [
  { act: 'sit', breath: 0 }, { act: 'sit', breath: 0 }, { act: 'sit', breath: 0 }, { act: 'sit', breath: 1 },
  { act: 'sit', breath: 1 }, { act: 'sit', breath: 1 }, { act: 'sit', breath: 0, blink: true }, { act: 'sit', breath: 0 },
];

for (const L of LOOKS) {
  const working = L.things.some((t) => t === 'otama' || t === 'nuno' || t === 'hand_up');
  registerChar(L.id, () =>
    buildSprite({
      id: L.id,
      mats: L.mats,
      draw: makeDraw(L),
      idle: working ? WORK : breathingIdle(16, [11]),
      extras: L.sit
        ? { sit: { p: { act: 'sit' }, dirs: 'all' }, ...(L.eat ? { eat: { p: { act: 'eat' }, dirs: 'all' } } : {}) }
        : L.reach
          ? { reach: { p: { act: 'reach' }, dirs: 'all' } }
          : undefined,
      // (the reach is one frame: held still, no breath — 12:00)
      poses: L.sit ? { sit: SIT, ...(L.eat ? { eat: EAT } : {}) } : L.reach ? { reach: [{ act: 'reach' }] } : undefined,
    } satisfies SpriteSpec),
  );
}
