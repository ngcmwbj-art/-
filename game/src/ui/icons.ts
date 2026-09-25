// UI pixel art (30_level_art 10.10): 12×12 item icons (lit from the top
// left, shaded to the bottom right, 1px ink outline), the がま口 purse, the
// ink pot, index-tab pictograms and the small HUD hanko. Built once, cached.

import { PixelCanvas } from '../engine/pixel';

const OUT = '#2A2440';

/** Shared palette for the art rows below. */
const PAL: Record<string, string> = {
  k: '#2A2440',
  w: '#F4F1E8',
  W: '#FFFFFF',
  d: '#C8C2B4',
  g: '#9AA0A8',
  G: '#6B7186',
  r: '#E23B2E',
  R: '#B8241E',
  l: '#FF6A4D',
  y: '#C8A06A',
  Y: '#E8C890',
  b: '#9A7448',
  B: '#6A4A2A',
  u: '#4AA8E0',
  U: '#2F7AB0',
  c: '#7FD1E8',
  C: '#BDEFFA',
  n: '#2F4A8A',
  N: '#4A6AB0',
  o: '#D9A441',
  O: '#FFD23F',
  h: '#A8742A',
  H: '#FFF6D8',
  t: '#F7C27A',
  a: '#FBF3DC',
  e: '#E8D9B5',
  p: '#E0567A',
  P: '#A83A5A',
  q: '#F59AB0',
  m: '#5FA85A',
  M: '#2E6B4A',
  x: '#3A2B24',
  z: '#6A4B3A',
  Z: '#8A6444',
  s: '#F2894B',
  S: '#C8643A',
  v: '#8E95A6',
  V: '#5E6478',
  // chapter 2 (52_ch2_level_art 13.3)
  E: '#E84E3C',
  D: '#8A3A2A',
  T: '#7A1E1A',
  F: '#3FA66B',
  f: '#9BCB6B',
  K: '#1F4E36',
  j: '#F6D98A',
  i: '#E8D8B0',
  I: '#B89A6A',
  X: '#EE8E80',
  L: '#C8645A',
  Q: '#FFE7A3',
  A: '#8A2E3A',
  J: '#5E1E2A',
};

const cache = new Map<string, HTMLCanvasElement>();

/** Art rows (without the outline) stamped at (1,1) of a w×h canvas, then outlined. */
function art(key: string, w: number, h: number, rows: string[], ox = 1, oy = 1, outline = true): HTMLCanvasElement {
  let c = cache.get(key);
  if (c) return c;
  const p = new PixelCanvas(w, h);
  p.art(rows, PAL, ox, oy);
  if (outline) p.outline(OUT);
  c = p.toCanvas();
  cache.set(key, c);
  return c;
}

// ---- 12×12 item icons ----------------------------------------------------------------

const ITEM_ROWS: Record<string, string[]> = {
  // ラムネ: blue bottle, the marble caught in the neck
  item_ramune: [
    '...wwd....',
    '...ddg....',
    '...cWu....',
    '..cWWuU...',
    '..cuuuU...',
    '.cWuuuuU..',
    '.cWuuuuU..',
    '.cuuuuuU..',
    '.cuuuuUU..',
    '..UUUUU...',
  ],
  // きなこぼう: a dusted brown stick on a toothpick
  item_kinakobou: [
    '........Y.',
    '.......Y..',
    '.....tY...',
    '....tYoh..',
    '...tYooh..',
    '..tYooh...',
    '.tYooh....',
    '.Yooh.....',
    '.ohh......',
    '..........',
  ],
  // ふがし: a long dark bar with a bumpy sugar crust
  item_fugashi: [
    '..........',
    '.......zZ.',
    '......zZxz',
    '.....zZxx.',
    '....zZxx..',
    '...zZxx...',
    '..zZxx....',
    '.zZxx.....',
    'zxxx......',
    '.x........',
  ],
  // ハッカあめ: a white ball in a twisted light-blue wrapper
  item_hakka_ame: [
    '..........',
    '..........',
    'c..CWWd..c',
    'cc.CWWwd.c',
    'cCcWWwwdcc',
    'cc.Cwwwd.c',
    'c..Cddd..c',
    '..........',
    '..........',
    '..........',
  ],
  // ちびたスタンプ台: a battered silver tin with the vermilion pad
  item_stamp_pad: [
    '..........',
    '..........',
    '.Wddddddg.',
    '.dlrrrrRG.',
    '.drrrRrRG.',
    '.drRrrRRG.',
    '.dRRRRRRG.',
    '.gGGGGGGV.',
    '..VVVVVV..',
    '..........',
  ],
  // 八月のおでん缶: a red can, steam curling up
  item_oden_can: [
    '..w..w....',
    '...w..w...',
    '..w..w....',
    '.ddddddg..',
    '.lrrrrrR..',
    '.lrWWWrR..',
    '.lrOoOrR..',
    '.lrrrrrR..',
    '.lrrrrRR..',
    '.ggggggG..',
  ],
  // ガチャのカプセル: red top, clear bottom
  item_capsule: [
    '..........',
    '...lrrR...',
    '..lWrrrR..',
    '.lWrrrrRR.',
    '.rrrrrrRR.',
    '.kkkkkkkk.',
    '.CWCCCCcc.',
    '.CCCCCCcc.',
    '..CCCCcc..',
    '...ccccc..',
  ],
  // ひえひえシップ: a white patch, pale blue gel
  item_shippu: [
    '..........',
    '.WWWWWWwd.',
    '.WCCCCCwd.',
    '.WCccccwd.',
    '.WCccccwd.',
    '.WCccccwd.',
    '.WCCCCCwd.',
    '.wwwwwwwd.',
    '..dddddd..',
    '..........',
  ],
  // おつかいメモ: a folded note, pencil lines
  item_otsukai_memo: [
    '..........',
    '.aaaaaaee.',
    '.akkkkaee.',
    '.aaaaaaae.',
    '.akkkaaae.',
    '.aaaaaaae.',
    '.akkkkkae.',
    '.aaaaaaae.',
    '.aarRaaae.',
    '.eeeeeeee.',
  ],
  // がま口: pink purse with a gold clasp
  item_gamaguchi: [
    '...O..O...',
    '..oOooOo..',
    '.hooooooh.',
    '.qpppppP..',
    'qpppppppP.',
    'qpqppppPP.',
    'qppppppPP.',
    '.pppppPP..',
    '..PPPPP...',
    '..........',
  ],
  // ハンコケース: a small wooden case, brass clasp
  item_hanko_case: [
    '..........',
    '.YYYYYYYy.',
    '.YyyyyyyB.',
    '.yyyyyyyB.',
    '.hhhhhhhB.',
    '.YyyOOyyB.',
    '.yyyooyyB.',
    '.yyyyyyyB.',
    '.BBBBBBBB.',
    '..........',
  ],
  // みました帳: blue notebook, a white label
  item_mimashita_cho: [
    '..........',
    '.NNNNNNNk.',
    '.NnnnnnnU.',
    '.NnWWWWnU.',
    '.NnWkkWnU.',
    '.NnWWWWnU.',
    '.Nnnnnnnn.',
    '.Nnnnnnnn.',
    '.NnnnnnnU.',
    '.kUUUUUUU.',
  ],
  // 迷子センターの鍵: a small key and the grey hippo keyholder
  item_maigo_key: [
    '..........',
    '.vvv......',
    'vvVvv.....',
    'vVvvvO....',
    '.vvvOoo...',
    '....oOoo..',
    '.....ooo..',
    '......oo..',
    '.....o.o..',
    '..........',
  ],
  // ハトの名刺: a white card with a tiny blue bird mark
  item_hato_meishi: [
    '..........',
    '..........',
    '.WWWWWWWd.',
    '.WNNwwwwd.',
    '.WNwwwwwd.',
    '.WwwkkkWd.',
    '.WwwwwwWd.',
    '.Wwkkkkwd.',
    '.ddddddddd',
    '..........',
  ],
  // 揚げたてコロッケ: a paper bag, spots of oil, the top folded down
  item_korokke: [
    '..........',
    '.YYYYYYYh.',
    '.hhhhhhhh.',
    '.eeeeeeeb.',
    '.eaaeeYeb.',
    '.eaeeeeeb.',
    '.eeeYeeeb.',
    '.eeeeeeeb.',
    '.ebbbbbbb.',
    '..........',
  ],
};

// ---- chapter 2 (52_ch2_level_art 13.3) -------------------------------------------------------

Object.assign(ITEM_ROWS, {
  // 回覧板の地図: the blue binder, its clip, the paper map with a pencil road and a 朱 circle
  item_kairan_map: [
    '...gGGg...',
    'cuuGWWGuuU',
    'uwwwwwwwdU',
    'uwkwwwwwdU',
    'uwwkwwrwdU',
    'uwwkwrwrdU',
    'uwwwkwrwdU',
    'uwwwwkkwdU',
    'uddddddddU',
    '.UUUUUUUU.',
  ],
  // 整理券: a small white ticket with a black 「1」 and the torn perforation
  item_seiriken: [
    '..........',
    '.WWWWWWWd.',
    '.Wwwwwwwd.',
    '.Wwwwkwwd.',
    '.Wwwkkwwd.',
    '.Wwwwkwwd.',
    '.Wwwwkwwd.',
    '.Wwwkkkwd.',
    '.WdwdwdwG.',
    '..G.G.G...',
  ],
  // トマト（4つ）: a white plastic bag, four red tomatoes showing through
  item_tomato_omiyage: [
    '.dW...Wd..',
    '.W.d.W.d..',
    '.WwwwwwwdG',
    'WwXXwwXXwd',
    'WXELXXELwd',
    'WXLLXXLLXd',
    'wwXXwXXwXd',
    'wXELXELXwd',
    '.XLLXLLXd.',
    '..dddddd..',
  ],
  // きゅうりの一本漬け: a green cucumber on a split chopstick
  item_kyuri_zuke: [
    '........fm',
    '.......fmM',
    '......fmmM',
    '.....fmfM.',
    '....fmmM..',
    '...fmfM...',
    '..fmmM....',
    '..mMM.....',
    '.iI.......',
    'iI........',
  ],
  // ゆでとうもろこし: rows of yellow kernels, the green husk at the end
  item_toumorokoshi: [
    '.......fF.',
    '......fFK.',
    '.....jOFK.',
    '....jOjo..',
    '...jOjOo..',
    '..jOjOo...',
    '.jOjOo....',
    '.OjOo.....',
    '.Ooo......',
    '..........',
  ],
  // 梅干し: one wrinkled red umeboshi on a small white dish
  item_umeboshi: [
    '..........',
    '..........',
    '...RERR...',
    '..EERTRR..',
    '..ERRRTR..',
    '..RTRRRT..',
    '.WwRRRRwd.',
    'WwwwwwwwwG',
    '.dwwwwwdG.',
    '..dGGGG...',
  ],
  // 回覧板の朱肉: a round tin, its lid (a white 「区」) leaning behind, the 朱 inside
  item_kairan_shuniku: [
    '.VVVVVVVV.',
    '.VwwwwwvV.',
    '.VwVwVvvV.',
    '.VwvwvVvV.',
    '.VwwwwwvV.',
    'gdddddddgG',
    'dlrrrrrrRG',
    'drlrrrrRRG',
    'gdRRRRRRgG',
    '.gGGGGGGG.',
  ],
});

/** トマト（おまけ）: after chapter 2, one tomato left in the bag (13.3). */
const OMAKE_ROWS = ['.dW...Wd..', '.W.d.W.d..', '.WwwwwwwdG', 'Wwwwwwwwwd', 'WwwwwwwwWd', 'wwwwXXwwwd', 'wwwXELXwwd', 'wwwXLLXwwd', '.wwwXXwwd.', '..dddddd..'];

let omakeFn: () => boolean = () => false;
/** The flow tells the icons when the tomato bag holds only the one おまけ. */
export function setOmakeCheck(fn: () => boolean): void {
  omakeFn = fn;
}

/** はなまるトマト, full 12×12 with its own outline (13.3). */
const HANAMARU_TOMATO = [
  '....OgGO....',
  '..OOGGgGOO..',
  '.OGGOLRRGGO.',
  '.OLLLlRRRRO.',
  'OLLlLRRRRRRO',
  'OLLRRRRRRRRO',
  'OLRRRRRRRRrO',
  'OLRwRRRRRwrO',
  '.ORRwRRRwrO.',
  '..ORRwwwrO..',
  '...ORRwrO...',
  '....OOOO....',
];

export type TomatoState = 'ready' | 'lit' | 'charging';

/**
 * The hanamaru tomato. `state` changes the fruit for the boss battle's tag
 * (51 13.2): 'ready' red, 'lit' orange (the rays are drawn by the tag),
 * 'charging' dark red-brown with no shine.
 */
export function tomatoIcon(state: TomatoState = 'ready'): HTMLCanvasElement {
  const key = 'tomato:' + state;
  let c = cache.get(key);
  if (c) return c;
  const pal: Record<string, string> =
    state === 'lit'
      ? { O: '#2A2440', G: '#3FA66B', g: '#9BCB6B', R: '#F2894B', r: '#C8643A', L: '#FFB27A', l: '#FFF6D8', w: '#FFE7A3' }
      : state === 'charging'
        ? { O: '#2A2440', G: '#2E6B4A', g: '#3FA66B', R: '#8A3A2A', r: '#6A2A20', L: '#9A4A36', l: '#9A4A36', w: '#A86A54' }
        : { O: '#2A2440', G: '#3FA66B', g: '#9BCB6B', R: '#E84E3C', r: '#B8241E', L: '#FF6A4D', l: '#FFF6D8', w: '#F4F1E8' };
  const p = new PixelCanvas(12, 12);
  p.art(HANAMARU_TOMATO, pal);
  c = p.toCanvas();
  cache.set(key, c);
  return c;
}

/** The tomato at 8×8 (the title's clear card, the book's ② mark). */
export function tomatoIcon8(): HTMLCanvasElement {
  let c = cache.get('tomato8');
  if (c) return c;
  const p = new PixelCanvas(8, 8);
  p.art(
    ['..OgGO..', '.OGGgGO.', 'OLlRRRRO', 'OLRRRRRO', 'ORRRRRrO', 'ORwRRwrO', '.ORwwrO.', '..OOOO..'],
    { O: '#2A2440', G: '#3FA66B', g: '#9BCB6B', R: '#E84E3C', r: '#B8241E', L: '#FF6A4D', l: '#FFF6D8', w: '#F4F1E8' },
  );
  c = p.toCanvas();
  cache.set('tomato8', c);
  return c;
}

/** 12×12 icon for an item (unknown ids get the folded-note icon). */
/**
 * 焼き芋 (52 13.3): half out of its newspaper (#C8C2B4, a few 1px lines of
 * print), the skin #8A2E3A, the broken end yellow #FFD23F, two threads of
 * steam above it (no outline on the steam, so the outline is drawn by hand).
 */
const YAKIIMO_ROWS = [
  '.......H..H.',
  '......H..H..',
  '.......H..H.',
  '......kkkk..',
  '.....kjOOAk.',
  '....kOjOAAJk',
  '...kOOAAAAJk',
  '..kkAAAAAJk.',
  '.kwdkAAAJkk.',
  'kwGdGkJJkGdk',
  'kdddddkkdddk',
  '.kkkkkkkkkk.',
];

export function itemIcon12(id: string): HTMLCanvasElement {
  if (id === 'item_hanamaru_tomato') return tomatoIcon('ready');
  if (id === 'item_yakiimo') return art('item:yakiimo', 12, 12, YAKIIMO_ROWS, 0, 0, false);
  if (id === 'item_tomato_omiyage' && omakeFn()) return art('item:omake', 12, 12, OMAKE_ROWS);
  const rows = ITEM_ROWS[id] ?? ITEM_ROWS.item_otsukai_memo;
  return art('item:' + (ITEM_ROWS[id] ? id : 'item_otsukai_memo'), 12, 12, rows);
}

const bigCache = new Map<string, HTMLCanvasElement>();
/** The same icon at 2× (item-get sticky note, shop, description card). */
export function itemIcon24(id: string): HTMLCanvasElement {
  const key = id === 'item_tomato_omiyage' && omakeFn() ? 'item:omake' : id;
  let c = bigCache.get(key);
  if (!c) {
    const src = itemIcon12(id);
    const cv = document.createElement('canvas');
    cv.width = 24;
    cv.height = 24;
    const ctx = cv.getContext('2d')!;
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(src, 0, 0, 24, 24);
    c = cv;
    bigCache.set(key, c);
  }
  return c;
}

// ---- がま口 (the purse beside the money, 18×16) ------------------------------------------

export function purseIcon(open = false): HTMLCanvasElement {
  const rows = open
    ? [
        '...O.....O....',
        '..OoO...OoO...',
        '..hoh...hoh...',
        '.oooo...oooo..',
        '.qkkkkkkkkkP..',
        'qppkxxxxxkpPP.',
        'qpppkkkkkppPP.',
        'qpqpppppppPPP.',
        'qppppppppPPPP.',
        '.pppppppPPPP..',
        '..pppppPPPP...',
        '...PPPPPPP....',
      ]
    : [
        '....O..O......',
        '...OoOOoO.....',
        '...hooooh.....',
        '..oooooooo....',
        '.hoooooooooh..',
        '.qppppppppPP..',
        'qppqpppppppPP.',
        'qpqppppppppPP.',
        'qppppppppppPP.',
        '.pppppppppPP..',
        '..pppppppPPP..',
        '...PPPPPPPP...',
      ];
  return art(open ? 'purse:o' : 'purse', 16, 14, rows);
}

/**
 * The 無人販売所's money box (料金箱, 16×14): a small wooden box with a slot
 * in its lid and a paper label on its front. `drop` (0..1): a 100円 coin
 * going in through the slot.
 */
export function coinBoxIcon(drop = -1): HTMLCanvasElement {
  const f = drop < 0 ? -1 : Math.min(2, Math.floor(drop * 3));
  const coin = f === 0 ? ['.....gWd......', '.....gdG......'] : f === 1 ? ['..............', '.....gWd......'] : ['..............', '..............'];
  const rows = [
    ...coin,
    '.ZZZZZZZZZZZ..',
    'ZbbbkkkkkbbBZ.',
    'ZbbbbbbbbbbBZ.',
    'ZBBBBBBBBBBBZ.',
    'ZbbwwwwwwbbBZ.',
    'ZbbwGGGGwbbBZ.',
    'ZbbwwGwwwbbBZ.',
    'ZbbwwwwwwbbBZ.',
    'ZbbbbbbbbbbBZ.',
    '.ZZZZZZZZZZZ..',
  ];
  return art(`coinbox:${f}`, 16, 14, rows);
}

// ---- ink pot (朱肉, 10×12) ----------------------------------------------------------------

export function inkPotIcon(): HTMLCanvasElement {
  return art('inkpot', 10, 12, ['..ggg...', '.gWdgG..', '.dddgG..', 'lrrrrRR.', 'lrWrrrR.', 'lrrrrRR.', 'RRRRRRR.', '.GGGGG..', '........', '........'], 1, 1);
}

// ---- tab pictograms (12×12, drawn on the index tabs) -------------------------------------------

const TAB_ROWS: Record<string, string[]> = {
  // もちもの: the purse
  items: ['..O..O....', '.oOooOo...', '.hooooh...', 'qppppppP..', 'qpqpppppP.', 'qpppppppP.', '.pppppPP..', '..PPPPP...', '..........', '..........'],
  // ハンコ: a wooden hanko
  hanko: ['...YYy....', '..YYyyB...', '..YyyyB...', '...YyB....', '...YyB....', '..hhhhB...', '.lrrrrRR..', '.rrrrrRR..', '.RRRRRRR..', '..........'],
  // つよさ: the report card with a ◎
  stats: ['.aaaaaae..', '.akkaaae..', '.aaaaaae..', '.akkarRe..', '.aaarare..', '.akkarRe..', '.aaaaaae..', '.akkkkae..', '.eeeeeee..', '..........'],
  // みました帳: the notebook
  book: ['.NNNNNNk..', '.NnnnnnU..', '.NnWWWnU..', '.NnWkWnU..', '.NnWWWnU..', '.NnnnnnU..', '.NnnnnnU..', '.NnnnnnU..', '.kUUUUUU..', '..........'],
  // せってい: a ruler with a little hanko slider
  settings: ['..........', '..lr......', '..rR......', 'YYYYYYYYy.', 'YkYkYkYky.', 'YkYYkYYky.', 'yyyyyyyyB.', '..........', '..........', '..........'],
};

export function tabIcon(id: string): HTMLCanvasElement {
  return art('tab:' + id, 12, 12, TAB_ROWS[id] ?? TAB_ROWS.items);
}

// ---- the HUD hanko (20×22), plain and blinking -----------------------------------------------

export function hudHanko(bright: boolean): HTMLCanvasElement {
  const key = 'hudhanko:' + bright;
  let c = cache.get(key);
  if (c) return c;
  const face = bright ? '#FF6A4D' : '#E23B2E';
  const p = new PixelCanvas(20, 22);
  // knob
  p.ellipse(10, 4.5, 4.5, 3.6, '#C8A06A');
  p.set(8, 2, '#E8C890');
  p.set(9, 2, '#E8C890');
  p.set(7, 3, '#E8C890');
  p.set(13, 5, '#9A7448');
  p.set(12, 6, '#9A7448');
  // neck
  p.rect(8, 7, 5, 6, '#C8A06A');
  p.vline(8, 7, 12, '#E8C890');
  p.vline(12, 7, 12, '#9A7448');
  // wood grain
  p.set(10, 9, '#A8742A');
  p.set(10, 11, '#A8742A');
  // collar
  p.rect(6, 13, 9, 2, '#A8742A');
  p.hline(6, 13, 13, '#C8A06A');
  // vermilion base with a lit rim on the left (sunset rim light)
  p.rect(4, 15, 13, 5, face);
  p.hline(4, 16, 15, '#FF6A4D');
  p.vline(4, 15, 19, '#FF8A6A');
  p.hline(5, 16, 19, '#B8241E');
  p.vline(16, 16, 19, '#B8241E');
  p.outline(OUT);
  c = p.toCanvas();
  cache.set(key, c);
  return c;
}
