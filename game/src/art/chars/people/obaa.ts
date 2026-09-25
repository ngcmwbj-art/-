import { flat, mat, type Fig, type Mats } from '../fig';
import { SKIN_MID } from '../mats';
import { legs, type LegSpec } from '../body';
import { buildSprite, breathingIdle, rep, type IdleKey, type Pose } from '../rig';
import { registerChar } from '../registry';
import { paintRows, upper, type Legend } from '../kit';

// おばあ (npc_obaa, 30_level_art 9.3): 20px tall (rows 4–23 of the 16×24
// canvas), the smallest adult in town. Silhouette key: the white bun and the
// stooped back. Front: her head sits low between rounded shoulders (no neck
// shows). Back: the upper back humps up and the head sinks into it. Side:
// the head is pushed forward past the chest, the hump rises behind the nape
// and both hands are clasped on the small of her back.
// White kappougi over a deep-red collar that matches the monpe (it parts the
// white hair from the white smock), reading glasses on a gold chain, the red
// pen (1×3) in the chest pocket, the grading stamp in her hand.
// The figure is hand-placed row art (paintRows): at this size every pixel
// of the face and the stoop is chosen, the renderer adds outline and rim.
// Idle: breathes on the stamp (ha—) → glasses on, reads the ledger.
// Extras: look_up, stamp, read, breathe, happy.

const OBAA: Mats = {
  skin: SKIN_MID,
  // white hair: its deepest step is a warm grey (#9E978C) so the hair
  // separates from the pale face and from the white smock
  hair: mat('#E8E4D8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9E978C' }),
  smock: mat('#F4F1E8', { shade: '#C8C2B4', light: '#FFF6D8', dark: '#9E978C' }),
  monpe: mat('#8A2E3A', { shade: '#64202E', light: '#B04A5A', dark: '#44141E' }),
  zori: mat('#8A5A3A', { shade: '#5A3A2A', light: '#C8A06A' }),
  eye: flat('#5A3A2A'),
  mouth: flat('#2A2440'),
  chain: flat('#D9A441'),
  glass: flat('#9AA0A8'),
  lens: flat('#E8E4D8'),
  glint: flat('#FFF6D8'),
  pen: flat('#E23B2E'),
  blush: flat('#F4A08C'),
  stamp: mat('#D9A441', { shade: '#A8742A', light: '#F6D98A' }),
  ink: flat('#E23B2E'),
  book: mat('#E8D9B5', { shade: '#C8A06A', light: '#FBF3DC' }),
  breathM: flat('#F4F1E8'),
};

const LEGEND: Legend = {
  H: ['hair', 1], h: ['hair', 0], d: ['hair', -1], D: ['hair', -2],
  S: ['skin', 1], s: ['skin', 0], k: ['skin', -1], K: ['skin', -2],
  // hands clasped behind the back (dropped while she holds something)
  q: ['skin', 0], Q: ['skin', -2],
  W: ['smock', 1], w: ['smock', 0], v: ['smock', -1], V: ['smock', -2],
  M: ['monpe', 1], m: ['monpe', 0], n: ['monpe', -1], N: ['monpe', -2],
  z: ['zori', 0], Z: ['zori', -1],
  e: ['eye', 0], E: ['mouth', 0], b: ['blush', 0],
  r: ['pen', 0], c: ['chain', 0], g: ['glass', 0],
};
const ORDER = ['monpe', 'smock', 'skin', 'hair', 'eye', 'mouth', 'blush', 'pen', 'chain', 'glass', 'zori'];
const BUSY: Legend = { ...LEGEND, q: null, Q: null };

// Upper body, rows 4–18 (moves with the walk bob / breathing).
const FRONT = [
  '................',
  '......HHhd......',
  '.....HhhhhdD....',
  '....hdDDDDDd....',
  '...HHhhhhhhhd...',
  '...Hhhhhhhhhdd..',
  '...hhSSsssshdd..',
  '...hSeesseeskd..',
  '...hsbssssbskd..',
  '..wwDssKKsskDw..',
  '.Wwwwmksskmwwvv.',
  '.Wwwwwmssmwwwrv.',
  '.Wwcwwwmmwwcwrv.',
  '.Wwwcwwwwwcwvvv.',
  '..wwwwggwwwwvv..',
];
// 17:00: the face tips up to the sky — eyes open under the fringe, mouth
// open, the jaw's underside in shade and a stretched neck in the collar.
const FRONT_UP = [
  '......HHhd......',
  '.....HhhhhdD....',
  '....hdDDDDDd....',
  '...HHhhhhhhhd...',
  '...HhSSsssshdd..',
  '...hSEsssEsskd..',
  '...hsbssssbskd..',
  '...hsssEEsskkd..',
  '...Dkkkkkkkkd...',
  '..wwDmkkkkmDw...',
  '.Wwwwmksskmwwvv.',
  '.Wwwwwmssmwwwrv.',
  '.Wwcwwwmmwwcwrv.',
  '.Wwwcwwwwwcwvvv.',
  '..wwwwggwwwwvv..',
];
// happy: the eyes squeeze up into arcs and the mouth opens in a laugh
const FRONT_HAPPY_FACE: [number, number, string][] = [
  [5, 11, 's'], [10, 11, 's'], [5, 10, 'e'], [10, 10, 'e'],
  [7, 13, 'E'], [8, 13, 'E'],
];
const BACK = [
  '................',
  '......HHhd......',
  '.....HhhhhdD....',
  '....hdDDDDDd....',
  '...HHhhhhhhhd...',
  '...Hhhhhhhhhdd..',
  '...hhhhhhhhhdd..',
  '...Dmmmmmmmmnd..',
  '..WWWwwwwwwwwv..',
  '.WWwwwwwwwwwwvv.',
  '.Wwwwvwwwwvwwvv.',
  '.WwwvwVVVVwvwvv.',
  '.Wvwwvwwwwvwvvv.',
  '.WwvwwqqQQwvvvv.',
  '..wwwwQQQQwwvv..',
];
// looking up from behind: the head tips back and presses down into the
// hump (the collar disappears), the jaw's corners peek out either side
const BACK_UP = [
  '................',
  '................',
  '......HHhd......',
  '.....HhhhhdD....',
  '....hdDDDDDd....',
  '...HHhhhhhhhd...',
  '...Hhhhhhhhhdd..',
  '..khhhhhhhhhddk.',
  '..WDDDDDDDDDDv..',
  '.WWwwwwwwwwwwvv.',
  '.Wwwwvwwwwvwwvv.',
  '.WwwvwVVVVwvwvv.',
  '.Wvwwvwwwwvwvvv.',
  '.WwvwwqqQQwvvvv.',
  '..wwwwQQQQwwvv..',
];
const SIDE = [
  '................',
  '........HHd.....',
  '.......HhhhD....',
  '.....hdDDDdh....',
  '....HHhhhhhhd...',
  '...HHhhhhhhhd...',
  '..SSDhhhhhhhdWw.',
  '..SesDhhhhhdWwwv',
  '.ssbkkDhhhdmwwwv',
  '..Kskkmmmmmwwwwv',
  '...kmwwwwwwwwwvv',
  '...Wwrwwwwwwwvvq',
  '...wwrcwwwwwvvqQ',
  '...wwwwgvwwwvvv.',
  '....wwwwwwwwvv..',
];
const SIDE_UP = [
  '........HHd.....',
  '.......HhhhD....',
  '.....hdDDDdh....',
  '....HHhhhhhhd...',
  '...SSDhhhhhhd...',
  '..SEsDhhhhhhdWw.',
  '.SsssbDhhhhdWwwv',
  '.sEEskkDhhdmwwwv',
  '..kkkkkmmmmwwwwv',
  '...kkmmmmmwwwwwv',
  '...kmwwwwwwwwwvv',
  '...Wwrwwwwwwwvvq',
  '...wwrcwwwwwvvqQ',
  '...wwwwgvwwwvvv.',
  '....wwwwwwwwvv..',
];
// Monpe over the hips (rows 19–20); legs() draws the gathered ankles + zori.
const MONPE_FB = ['...mmmmmmmmmn...', '...Mmmmn.mmmn...'];
const MONPE_S = ['....Mmmmmmmmn...', '.....mmmmmmn....'];

const OBAA_LEGS: LegSpec = { cx: 8, hip: 20, foot: 22, w: 2, gap: 2, mat: 'monpe', shoe: 'zori', shoeLen: 3 };

const TOP = 4;

function lower(f: Fig, p: Pose, side: boolean) {
  legs(f, p, OBAA_LEGS);
  paintRows(f, 0, 19 + p.bob, side ? MONPE_S : MONPE_FB, LEGEND, ['monpe']);
}

function obaaFront(f: Fig, p: Pose) {
  const u = upper(p);
  const act = p.act;
  lower(f, p, false);
  paintRows(f, 0, TOP + u, p.lookUp ? FRONT_UP : FRONT, LEGEND, ORDER);
  if (act === 'happy')
    for (const [x, y, ch] of FRONT_HAPPY_FACE) {
      const [m, t] = LEGEND[ch]!;
      f.part(m, { flat: true, rim: false }).t(t).px(x, y + u).t(null);
    }
  if (p.blink && !p.lookUp && act !== 'happy') {
    // blink: the narrow eyes shut to their outer corners
    f.part('skin', { flat: true, rim: false }).t(0).px(6, 11 + u).px(9, 11 + u).t(null);
  }
  const sy = 13 + u;
  if (act === 'breathe') {
    // the stamp held up to her mouth: ha—
    f.part('skin', { shade: 'rb', light: 't' });
    f.rect(5, sy + 1, 2, 1).rect(9, sy + 1, 2, 1);
    f.part('stamp', { shade: 'r', light: 't' });
    f.rect(7, sy - 1, 2, 3);
    f.part('ink', { flat: true, rim: false });
    f.hl(7, 8, sy - 2);
    if (p.ph === 1) {
      f.part('breathM', { flat: true, rim: false, ol: false });
      f.px(6, sy - 3).px(9, sy - 4);
    }
  } else if (act === 'read') {
    // glasses on, the ledger open in both hands
    f.part('book', { shade: 'rb', light: 't' });
    f.rect(4, sy + 2, 8, 3);
    f.part('book', { flat: true });
    f.t(-2).vl(8, sy + 2, sy + 4).t(null);
    f.part('skin', { shade: '', light: '' });
    f.px(3, sy + 4).px(12, sy + 4);
    const hy = TOP + u;
    f.part('glass', { flat: true, rim: false });
    f.hl(4, 7, hy + 7).hl(8, 11, hy + 7);
    f.part('lens', { flat: true, rim: false });
    f.hl(5, 6, hy + 7).hl(9, 10, hy + 7);
    // a 1px glint on the lit (west) lens
    f.part('glint', { flat: true, rim: false });
    f.px(5, hy + 7);
  } else if (act === 'stamp') {
    f.part('skin', { shade: 'rb', light: '' });
    f.rect(6, sy + 3, 4, 1);
    f.part('stamp', { shade: 'r', light: 't' });
    f.rect(7, sy + 3 + p.ph, 2, 2);
    f.part('ink', { flat: true, rim: false });
    f.hl(7, 8, sy + 5 + p.ph);
  }
}

function obaaBack(f: Fig, p: Pose) {
  const u = upper(p);
  lower(f, p, false);
  paintRows(f, 0, TOP + u, p.lookUp ? BACK_UP : BACK, LEGEND, ORDER);
}

function obaaSide(f: Fig, p: Pose) {
  const u = upper(p);
  const act = p.act;
  const busy = act === 'stamp' || act === 'breathe' || act === 'read';
  lower(f, p, true);
  paintRows(f, 0, TOP + u, p.lookUp ? SIDE_UP : SIDE, busy ? BUSY : LEGEND, ORDER);
  const sy = 13 + u;
  if (p.blink && !p.lookUp) f.part('skin', { flat: true, rim: false }).t(-1).px(3, 11 + u).t(null);
  if (act === 'happy') f.part('mouth', { flat: true, rim: false }).px(2, 13 + u);
  if (busy) {
    // the near arm forward with the stamp / the ledger
    f.part('smock', { shade: 'rb', light: 't', sep: true });
    f.px(7, sy + 2).px(6, sy + 3).px(5, sy + 3);
    f.part('skin', { shade: 'rb', light: 't' });
    f.px(3, sy + 3).px(4, sy + 3);
    if (act === 'read') {
      f.part('book', { shade: 'rb', light: 't' });
      f.rect(1, sy + 1, 3, 3);
    } else {
      f.part('stamp', { shade: 'r', light: 't' });
      f.rect(1, sy + 1 + (act === 'stamp' ? p.ph : 0), 2, 2);
      if (act === 'breathe' && p.ph === 1) {
        f.part('breathM', { flat: true, rim: false, ol: false });
        f.px(1, sy - 1);
      }
    }
  }
}

const OBAA_IDLE: IdleKey[] = [
  { act: 'breathe', ph: 0 }, { act: 'breathe', ph: 1 }, { act: 'breathe', ph: 1 }, { act: 'breathe', ph: 0 }, { act: 'breathe', ph: 1 }, { act: 'breathe', ph: 1 },
  { breath: 0 }, { breath: 0, blink: true },
  ...rep([{ act: 'read', breath: 0 }, { act: 'read', breath: 0 }, { act: 'read', breath: 1 }, { act: 'read', breath: 1 }], 3),
];

registerChar('npc_obaa', () =>
  buildSprite({
    id: 'npc_obaa',
    mats: OBAA,
    draw: (f, p) => (p.view === 'down' ? obaaFront(f, p) : p.view === 'up' ? obaaBack(f, p) : obaaSide(f, p)),
    walkFrameMs: 170,
    idle: { down: OBAA_IDLE, left: breathingIdle(), right: breathingIdle(), up: breathingIdle() },
    extras: {
      stamp: { dirs: ['down', 'left', 'right'] },
      read: { dirs: ['down'] },
      breathe: { dirs: ['down'] },
      happy: { dirs: ['down', 'left', 'right'] },
    },
    anims: {
      stamp: { frames: [{ ph: 0 }, { ph: 1 }, { ph: 1 }, { ph: 0 }], ms: [150, 90, 300, 150], loop: false },
      breathe: { frames: [{ ph: 0 }, { ph: 1 }], ms: 400 },
    },
    shadow: 10,
  }),
);
