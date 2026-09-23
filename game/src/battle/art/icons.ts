// Small pixel icons for the battle UI (command icons 16×16, status 10×10,
// buffs 12×10, ink pot, kire "!", chime bell, attribute and item icons).

import { PixelCanvas } from '../../engine/pixel';

const P: Record<string, string> = {
  k: '#2A2440',
  w: '#F4F1E8',
  W: '#FFFFFF',
  d: '#C8C2B4',
  r: '#E23B2E',
  R: '#B8241E',
  l: '#FF6A4D',
  y: '#C8A06A',
  Y: '#E8C890',
  b: '#9A7448',
  g: '#9AA0A8',
  G: '#6B7186',
  n: '#2F4A8A',
  N: '#4A6AB0',
  p: '#E0567A',
  P: '#A83A5A',
  q: '#F59AB0',
  o: '#D9A441',
  O: '#FFD23F',
  h: '#A8742A',
  H: '#FFF6D8',
  e: '#E84E3C',
  E: '#A8302A',
  u: '#4AA8E0',
  U: '#2F7AB0',
  c: '#7FD1E8',
  s: '#F2894B',
  S: '#C8643A',
  t: '#F7C27A',
  v: '#8A5FB0',
  V: '#5A3A7A',
  x: '#3A2B24',
  z: '#6A4B3A',
  m: '#5FA85A',
  M: '#2E6B4A',
  j: '#9BCB6B',
  f: '#F07A2A',
  F: '#B85A1A',
  a: '#FBF3DC',
};

const cache = new Map<string, HTMLCanvasElement>();
function icon(key: string, rows: string[]): HTMLCanvasElement {
  let c = cache.get(key);
  if (!c) {
    c = PixelCanvas.fromArt(rows, P).toCanvas();
    cache.set(key, c);
  }
  return c;
}

// ---- command icons (16×16) ---------------------------------------------------

export const CMD_ICONS: Record<string, string[]> = {
  tataku: [
    '........kkkkk...',
    '......kkwwwwwk..',
    '.....kwwkwkwwwk.',
    '....kwkwwkwkwwk.',
    '....kwwkwwkwkwk.',
    '....kwkwkwwkwwk.',
    '.....kwwkwkwwk..',
    '.....kkwwkwwk...',
    '....kykkkwkk....',
    '...kyYk..kk.....',
    '..kyYk..........',
    '.kyYk...........',
    'kyYk............',
    'kyk.............',
    'kk..............',
    '................',
  ],
  hanko: [
    '......kkkk......',
    '.....kYYyyk.....',
    '.....kYyyyk.....',
    '.....kYyyyk.....',
    '......kyyk......',
    '......kYyk......',
    '......kYyk......',
    '....kkkkkkkk....',
    '...kYyyyyyybk...',
    '...kYyyyyyybk...',
    '...kkkkkkkkkk...',
    '...klrrrrrrRk...',
    '...krrrrrrrRk...',
    '...kRRRRRRRRk...',
    '....kkkkkkkk....',
    '................',
  ],
  item: [
    '.....kk..kk.....',
    '....kOok.kOok...',
    '....kokk.kkok...',
    '...kkOoooooOkk..',
    '..kqqkkkkkkkqqk.',
    '.kqqpppppppppPk.',
    '.kqpppppppppppPk',
    '.kqpppqppppppPk.',
    '.kpppppppppppPk.',
    '.kppppppppppPPk.',
    '.kpppppppppPPPk.',
    '.kPppppppppPPPk.',
    '..kPPPPPPPPPPk..',
    '...kkkkkkkkkk...',
    '................',
    '................',
  ],
  guard: [
    '...kkkkkkkkkk...',
    '..kNNNNNNNNNnk..',
    '..kNnnnnnnnnnk..',
    '..kNnwwwwwwnnk..',
    '..kNnwkkkkwnnk..',
    '..kNnwwwwwwnnk..',
    '..kNnnnnnnnnnk..',
    '..kNnnnnnnnnnk..',
    '..kNnnnnnnnnnk..',
    '..kNnnnnnnnnnk..',
    '..kNnnnnnnnnnk..',
    '..kNnnnnnnnnnk..',
    '..kwdwdwdwdwdk..',
    '..kwwwwwwwwwwk..',
    '...kkkkkkkkkk...',
    '................',
  ],
  flee: [
    '................',
    '......kk........',
    '.....kuuk.......',
    '....kuk.uk......',
    '...kuk...uk.....',
    '..kkekkkkkkk....',
    '.klleeeeeeeEk...',
    'kleeeeeeeeeeEk..',
    'keeeeeeeeeeeeEk.',
    'kEeeeeeeeeeeEEk.',
    '.kEEEEEEEEEEEk..',
    '..kkkkkkkkkkk...',
    '................',
    '..k.k.k.........',
    '................',
    '................',
  ],
  tackle: [
    '.......kk.......',
    '......khhk......',
    '.....kkkkkk.....',
    '....kOOooooh....',
    '...kOOOooooohk..',
    '...kOHOoooooohk.',
    '..kOOOooooooohk.',
    '..kOOokooookohk.',
    '..kOOooooooooohk',
    '..kOoqqoooooqqhk',
    '..kooooooooooohk',
    '.khhhhhhhhhhhhhk',
    '.kkhhkkkkkkhhkk.',
    '....kxxk........',
    '.....kk.........',
    '................',
  ],
  pr: [
    '................',
    '.kkkkkkkkkkkkkk.',
    '.kWwwwwwwwwwwdk.',
    '.kwkkkwkkwkkwdk.',
    '.kwwwwwwwwwwwdk.',
    '.kwkkwkkkkwwwdk.',
    '.kwwwwwwwwwwwdk.',
    '.kwwkkkwkkkwwdk.',
    '.kwwwwwwwwwwwdk.',
    '.kddddddddddddk.',
    '.kkkkkkyykkkkkk.',
    '.......yb.......',
    '......ksSk......',
    '.....ksssSk.....',
    '.....kSSSSk.....',
    '......kkkk......',
  ],
  okaeri: [
    '................',
    '....kkkkkkkk....',
    '..kkrrrrrrrrkk..',
    '.krrkkkkkkkkrrk.',
    'krrkrrrrrrrrkrrk',
    'krkrrwrrwwrrrkrk',
    'krkrwwrwrrwrrkrk',
    'krkrrwrrwwrwrkrk',
    'krkrrrrrrrrrrkrk',
    'krrkrrrrrrrrkrrk',
    '.krrkkkkkkkkrrk.',
    '..kkrrrrrrrrkk..',
    '....kkkkkkkk....',
    '................',
    '................',
    '................',
  ],
};

export function cmdIcon(id: string): HTMLCanvasElement {
  return icon('cmd:' + id, CMD_ICONS[id] ?? CMD_ICONS.item);
}

// ---- small UI glyphs -----------------------------------------------------------

/** Ink pot 10×12 (朱肉). */
export function inkPot(): HTMLCanvasElement {
  return icon('inkpot', [
    '...kkkk...',
    '..kddddk..',
    '..kwwwdk..',
    '.kkkkkkkk.',
    'kwwwwwwwdk',
    'kwlrrrrRdk',
    'kwrrrrrRdk',
    'kwrrrrRRdk',
    'kwRRRRRRdk',
    'kddddddddk',
    '.kkkkkkkk.',
    '..........',
  ]);
}

/** Balloon 8×12 (ふうせん CT). */
export function balloonIcon(): HTMLCanvasElement {
  return icon('balloon', [
    '..kkkk..',
    '.ktsssk.',
    'ktHsssSk',
    'ktssssSk',
    'ksssssSk',
    'kssssSSk',
    '.kSSSSk.',
    '..kSSk..',
    '...kk...',
    '...w....',
    '....w...',
    '...w....',
  ]);
}

/** Bowing figure 10×12 (ごあいさつ CT). */
export function bowIcon(): HTMLCanvasElement {
  return icon('bow', [
    '..........',
    '......kkk.',
    '.....kOook',
    '....kOooohk',
    '...kkOoohk.',
    '..ksskkkk..',
    '.kssssk....',
    'kssssssk...',
    'kSsssssk...',
    '.kSSSSSk...',
    '..kS.kSk...',
    '..kk..kk...',
  ].map((r) => r.slice(0, 10)));
}

/** Tiny vermilion check stamp 8×8 (ready). */
export function checkStamp(): HTMLCanvasElement {
  return icon('check', [
    '..rrrr..',
    '.rRRRRr.',
    'rRRRRWRr',
    'rRRRWRRr',
    'rWRWRRRr',
    'rRWRRRRr',
    '.rRRRRr.',
    '..rrrr..',
  ]);
}

/** ◀ ▶ arrows 5×7. */
export function arrowIcon(right: boolean): HTMLCanvasElement {
  const rows = ['k....', 'kk...', 'krk..', 'krrk.', 'krk..', 'kk...', 'k....'];
  return icon(right ? 'arrR' : 'arrL', right ? rows : rows.map((r) => [...r].reverse().join('')));
}

/** ▲ ▼ 7×5 */
export function scrollArrow(up: boolean): HTMLCanvasElement {
  const rows = ['...k...', '..krk..', '.krrrk.', 'krrrrrk', 'kkkkkkk'];
  return icon(up ? 'scrU' : 'scrD', up ? rows : [...rows].reverse());
}

/** Kire "!" icon 10×14: empty (outline) or lit. */
export function kireIcon(lit: boolean, pulse = false): HTMLCanvasElement {
  if (!lit)
    return icon('kire0', [
      '..gggggg..',
      '.g......g.',
      'g..gggg..g',
      'g..g..g..g',
      'g..g..g..g',
      'g..g..g..g',
      'g...gg...g',
      'g...gg...g',
      'g........g',
      'g...gg...g',
      'g...gg...g',
      '.g......g.',
      '..gggggg..',
      '..........',
    ]);
  return icon(pulse ? 'kire2' : 'kire1', [
    '..kkkkkk..',
    '.k' + (pulse ? 'llllll' : 'rrrrrr') + 'k.',
    'k' + (pulse ? 'l' : 'r') + 'rWWWWr' + (pulse ? 'l' : 'r') + 'k',
    'krrWWWWrRk',
    'krrWWWWrRk',
    'krrrWWrrRk',
    'krrrWWrrRk',
    'krrrrrrrRk',
    'krrrWWrrRk',
    'krrrWWrrRk',
    'kRrrrrrRRk',
    '.kRRRRRRk.',
    '..kkkkkk..',
    '..........',
  ]);
}

/** Chime bell 14×16: off (line art) / on (gold). */
export function bellIcon(on: boolean): HTMLCanvasElement {
  if (!on)
    return icon('bell0', [
      '......gg......',
      '.....g..g.....',
      '.....gggg.....',
      '....g....g....',
      '...g......g...',
      '...g......g...',
      '...g......g...',
      '..g........g..',
      '..g........g..',
      '..g........g..',
      '.g..........g.',
      '.g..........g.',
      'gggggggggggggg',
      '......gg......',
      '......gg......',
      '..............',
    ]);
  return icon('bell1', [
    '......kk......',
    '.....kHOk.....',
    '.....kkkk.....',
    '....kHOOOk....',
    '...kHHOOOOk...',
    '...kHOOOOOhk..',
    '...kHOOOOOhk..',
    '..kHHOOOOOOhk.',
    '..kHOOOOOOOhk.',
    '..kHOOOOOOOhk.',
    '.kHOOOOOOOOOhk',
    '.kOOOOOOOOOhhk',
    'kkkkkkkkkkkkkk',
    '......khk.....',
    '.......k......',
    '..............',
  ].map((r) => r.slice(0, 14)));
}

// ---- status icons 10×10 -----------------------------------------------------------

export const STATUS_ICON_ROWS: Record<string, string[]> = {
  status_konran: [
    '..kkkkkk..',
    '.kvvvvvvk.',
    'kvvkkkkvvk',
    'kvkvvvvkvk',
    'kvkvkkvkvk',
    'kvkvkvvkvk',
    'kvkvvkkvvk',
    'kvvkvvvvk.',
    '.kvvkkkk..',
    '..kkk.....',
  ],
  status_nemuri: [
    'kkkkkk....',
    'kuuuuk....',
    'kkkuuk....',
    '..kuk.kkkk',
    '.kuk..kuuk',
    'kuukkkkkuk',
    'kuuuuk.kuk',
    'kkkkkkkuuk',
    '......kkkk',
    '..........',
  ],
  status_tsukamare: [
    '...kkkk...',
    '..kzxxzk..',
    '.kzk..kxk.',
    '.kxk..kxk.',
    '..k...kxk.',
    '......kxk.',
    '......kxk.',
    '......kxk.',
    '......kxk.',
    '.......k..',
  ],
  status_toosenbo: [
    '....kk....',
    '...kffk...',
    '...kwwk...',
    '..kffffk..',
    '..kfffFk..',
    '.kwwwwwwk.',
    '.kfffffFk.',
    'kffffffFFk',
    'kkkkkkkkkk',
    '..........',
  ],
  status_mamoru: [
    'kkkkkkkkk.',
    'kNnnnnnnk.',
    'kNnwwwwnk.',
    'kNnnnnnnk.',
    'kNnnnnnnk.',
    'kNnnnnnnk.',
    'kNnnnnnnk.',
    'kwwwwwwwk.',
    'kkkkkkkkk.',
    '..........',
  ],
  status_hebatta: [
    '..........',
    '.kkk..kkk.',
    '.kwk..kwk.',
    '..........',
    '...kkkk...',
    '..k....k..',
    '..........',
    '..........',
    '..........',
    '..........',
  ],
};

export function statusIcon(id: string): HTMLCanvasElement | null {
  const rows = STATUS_ICON_ROWS[id];
  return rows ? icon('st:' + id, rows) : null;
}

/** Buff icons 12×10: fist / shield / eye + arrow. */
export function buffIcon(stat: 'atk' | 'def' | 'hit', up: boolean): HTMLCanvasElement {
  const pics: Record<string, string[]> = {
    atk: ['......', '.kkkk.', 'ksssk.', 'kssssk', 'kSsssk', 'kSsssk', 'kSSssk', '.kSSk.', '..kk..', '......'],
    def: ['kkkkk.', 'kNnnk.', 'kNnnk.', 'kNnnk.', 'kNnnk.', '.kNk..', '..k...', '......', '......', '......'],
    hit: ['......', '.kkkk.', 'kwwwwk', 'kwkkwk', 'kwkkwk', 'kwwwwk', '.kkkk.', '......', '......', '......'],
  };
  const upA = ['..k..', '.kek.', 'keeek', '.kek.', '.kek.', '.kek.', '.kkk.', '.....', '.....', '.....'];
  const dnA = ['.kkk.', '.kuk.', '.kuk.', '.kuk.', 'kuuuk', '.kuk.', '..k..', '.....', '.....', '.....'];
  const a = up ? upA : dnA;
  const rows = pics[stat].map((r, i) => r + '.' + a[i]);
  return icon(`buff:${stat}:${up}`, rows);
}

/** Attribute icons 8×8 (打 net, 判 hanko, 笑 "!"). */
export function attrIcon(a: 'da' | 'han' | 'wara'): HTMLCanvasElement {
  const rows: Record<string, string[]> = {
    da: ['...kkkk.', '..kwkwwk', '..kwwkwk', '..kkwwk.', '.kykkk..', '.kyk....', 'kyk.....', 'kk......'],
    han: ['..kkkk..', '..kyYk..', '...kyk..', '.kkkkkk.', '.kYyyyk.', '.krrrrk.', '.kRRRRk.', '..kkkk..'],
    wara: ['..kkkk..', '.krWWrk.', '.krWWrk.', '.krWWrk.', '.krrrrk.', '.krWWrk.', '.kRrrRk.', '..kkkk..'],
  };
  return icon('attr:' + a, rows[a]);
}

// ---- item icons 16×16 (hand-drawn look) -------------------------------------------------

export const ITEM_ICON_ROWS: Record<string, string[]> = {
  item_ramune: [
    '......kkkk......',
    '.....kcWWck.....',
    '.....kkkkkk.....',
    '......kuuk......',
    '.....kcWuuk.....',
    '....kcWWuuUk....',
    '....kcWkkuUk....',
    '....kcWkkuUk....',
    '....kcWuuuUk....',
    '....kkkkkkkk....',
    '....kcWuuuUk....',
    '....kcWuuuUk....',
    '....kcWuuuUk....',
    '....kcuuuuUk....',
    '.....kkkkkk.....',
    '................',
  ],
  item_kinakobou: [
    '................',
    '..........kkk...',
    '.........kYtyk..',
    '........kYttyk..',
    '.......kYttyk...',
    '......kYttyk....',
    '.....kYttyk.....',
    '....kYttyk......',
    '...kYttyk.......',
    '...kttyk........',
    '..kwkkk.........',
    '..kwk...........',
    '.kwk............',
    '.krk............',
    '.kk.............',
    '................',
  ],
  item_fugashi: [
    '................',
    '................',
    '....kkkkkkkk....',
    '..kkYyyyyyyykk..',
    '.kYyyhyyyhyyybk.',
    'kYyyyyyyyyyyyybk',
    'kYyhyyyyhyyyhybk',
    'kyyyyyyyyyyyyybk',
    'kyyyyhyyyyyhyybk',
    'kbyyyyyyyyyyybbk',
    '.kbbyyyhyyybbbk.',
    '..kkbbbbbbbbkk..',
    '....kkkkkkkk....',
    '................',
    '................',
    '................',
  ],
  item_hakka_ame: [
    '................',
    '..kk........kk..',
    '.kwwk......kwwk.',
    '.kwdwk.kk.kwdwk.',
    '..kwdkkjjkkdwk..',
    '...kkjWjjjjkk...',
    '....kjWjjjjjk...',
    '....kjjjjjjMk...',
    '....kjjjjjMMk...',
    '...kkkjjMMMkkk..',
    '..kwdkkkkkkdwk..',
    '.kwdwk....kwdwk.',
    '.kwwk......kwwk.',
    '..kk........kk..',
    '................',
    '................',
  ],
  item_stamp_pad: [
    '................',
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.kggggggggggggk.',
    '.kgkkkkkkkkkkGk.',
    '.kgklrrrrrrrkGk.',
    '.kgkrrRRRrrrkGk.',
    '.kgkrRRRRRrrkGk.',
    '.kgkrrrrrrrrkGk.',
    '.kgkkkkkkkkkkGk.',
    '.kGGGGGGGGGGGGk.',
    '..kkkkkkkkkkkk..',
    '................',
    '................',
    '................',
  ],
  item_oden_can: [
    '................',
    '.....kkkkkk.....',
    '....kggWggGk....',
    '....kkkkkkkk....',
    '....kleeeeEk....',
    '....kleeeeEk....',
    '....kwwwwwdk....',
    '....kwekeedk....',
    '....kwwwwwdk....',
    '....kleeeeEk....',
    '....kleeeeEk....',
    '....kleeeeEk....',
    '....kggggGGk....',
    '.....kkkkkk.....',
    '...s..s..s......',
    '................',
  ],
  item_shippu: [
    '................',
    '................',
    '..kkkkkkkkkkkk..',
    '.kWcccccccccwwk.',
    '.kcwwwwwwwwwcdk.',
    '.kcwcwcwcwcwcdk.',
    '.kcwwwwwwwwwcdk.',
    '.kcwcwcwcwcwcdk.',
    '.kcwwwwwwwwwcdk.',
    '.kcwcwcwcwcwcdk.',
    '.kccccccccccccdk',
    '..kkkkkkkkkkkkk.',
    '................',
    '................',
    '................',
    '................',
  ],
  item_capsule: [
    '................',
    '................',
    '.....kkkkkk.....',
    '...kkWrrrrrkk...',
    '..kWrrrrrrrrRk..',
    '..krrrrrrrrrRk..',
    '.krrrrrrrrrrrRk.',
    '.kkkkkkkkkkkkkk.',
    '.kwWwwwwwwwwwdk.',
    '.kwwwwwwwwwwwdk.',
    '..kwwwwwwwwwdk..',
    '..kdwwwwwwwddk..',
    '...kkdddddkk....',
    '.....kkkkkk.....',
    '................',
    '................',
  ],
};

export function itemIcon(id: string): HTMLCanvasElement {
  const rows = ITEM_ICON_ROWS[id];
  if (rows) return icon('item:' + id, rows);
  // key items: a folded note with a vermilion seal
  return icon('item:key', [
    '................',
    '...kkkkkkkkk....',
    '...kwwwwwwwdk...',
    '...kwkkkkwwddk..',
    '...kwwwwwwwwdk..',
    '...kwkkkkkwwdk..',
    '...kwwwwwwwwdk..',
    '...kwkkkwwwwdk..',
    '...kwwwwwrrwdk..',
    '...kwwwwrrrrdk..',
    '...kwwwwwrrwdk..',
    '...kddddddddk...',
    '...kkkkkkkkkk...',
    '................',
    '................',
    '................',
  ]);
}
