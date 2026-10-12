// 旧水族館の 戦闘の 絵（61 9.5・12.5・13.7・13.8）。光は 館の 決まり（61 9.0）：奥（上）から 水槽の
// 青い 光、上と 左右の 縁に 1px の #6FC3E0、体の 正面は 暗く 沈む。輪郭 #2A2440。
//
//  ジュンロ (40×48)    床の「順路」の 矢印の 札が 立ちあがった。白い 樹脂の 札、頭に 青い 矢印（くるくる回る）、
//                      札の 下半分に「順路」、点の 目、足は 札の 角が 2つに 分かれた 形。黒い 判は 札の 裏
//  ツガオ 初戦 (56×96) 長いすに すわった まま。ダブルの スーツ（炭色、細い ストライプ）、白い シャツ、黒い
//                      ネクタイ、角刈り、太い 眉、細い 目（眠たげ）、まっすぐ 結んだ 口。こわい 顔に しない。
//                      右手に 黒い 判、左の 手首に 止まった 金の 腕時計、ひざに 冷めた 焼きそばの パック
//  ヒロスケ (48×80)    スキンヘッド、四角い 黒の サングラス、胸までの あごひげ（先を 赤い 輪ゴムで）、
//                      生成りの 作業シャツ、オリーブの 前掛け、軍手（手の ゆるみで 指が 開く）。2段目は 壁ぎわに 座る
//  ポコシャ (56×80)    肩幅が 広く 腕が 太い。白い ランニング、オリーブの ベスト、カーキの ズボン、刈り上げ、
//                      目じりの とがった サングラス、胸に 古い 名札『飼育係 ポコシャ』、左肩に めんどりの
//                      ぴーちゃん。ちぢこまり＝ひざを 抱えて 小さく 座る（責められている 絵に しない）

import { PixelCanvas } from '../../engine/pixel';
import { registerEnemyArt, loop, type EnemyArt, type EnemyView } from './index';
import { madaStamp } from './noon';

const INK = '#2A2440';
const AQ_RIM = '#6FC3E0';

function cached<T>(build: (o: T) => PixelCanvas, max = 120): (o: T) => HTMLCanvasElement {
  const cache = new Map<string, HTMLCanvasElement>();
  return (o: T) => {
    const key = JSON.stringify(o);
    let c = cache.get(key);
    if (!c) {
      c = build(o).toCanvas();
      cache.set(key, c);
      if (cache.size > max) cache.delete(cache.keys().next().value!);
    }
    return c;
  };
}

/** The tank's blue rim on the top and side edges, then the ink outline. */
function aqFinish(p: PixelCanvas, amt = 0.55): void {
  const W = p.w;
  const H = p.h;
  const src = p.data.slice();
  const on = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && src[y * W + x] >>> 24 !== 0;
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!on(x, y)) continue;
      if (!on(x, y - 1) || (y < H * 0.6 && (!on(x - 1, y) || !on(x + 1, y)))) {
        const v = src[y * W + x];
        const r = v & 255;
        const g = (v >>> 8) & 255;
        const b = (v >>> 16) & 255;
        const mx = (a: number, c: number) => Math.round(a + (c - a) * amt);
        p.set(x, y, `#${[mx(r, 0x6f), mx(g, 0xc3), mx(b, 0xe0)].map((n) => n.toString(16).padStart(2, '0')).join('')}`);
      }
    }
  p.outline(INK);
  void AQ_RIM;
}

// ---- ジュンロ -----------------------------------------------------------------------------------

interface JunroPose {
  /** Arrow angle step 0..5 (0 = facing us). */
  spin: number;
  lean: number;
  back: boolean;
  shake: number;
  flat: boolean;
}
const JW = 48;
const JH = 56;
const JOX = 4;
const JOY = 4;

function buildJunro(o: JunroPose): PixelCanvas {
  const p = new PixelCanvas(JW, JH);
  const X = (v: number) => Math.round(v + JOX + o.shake + o.lean);
  const Y = (v: number) => Math.round(v + JOY);
  if (o.flat) {
    // lying on the floor as it was (rest)
    p.rect(X(4), Y(38), 32, 8, '#E8ECF0');
    p.hline(X(4), X(35), Y(38), '#F4F6F8');
    p.rect(X(10), Y(40), 14, 4, '#4AA8E0');
    aqFinish(p);
    return p;
  }
  // the sign (32×24, standing): white resin, worn, footprints' dirt
  p.rect(X(4), Y(18), 32, 24, '#E8ECF0');
  for (let y = 0; y < 24; y++) for (let x = 0; x < 32; x++) if ((x * 7 + y * 13) % 17 === 0) p.set(X(4 + x), Y(18 + y), '#C8D0D8');
  p.dither(X(6), Y(34), 10, 6, '#A8B0B8', 0.25);
  if (!o.back) {
    // 「順路」 in thin lines, the dot eyes and a small mouth
    p.hline(X(10), X(15), Y(33), '#4A5A6A');
    p.vline(X(12), Y(33), Y(38), '#4A5A6A');
    p.hline(X(19), X(24), Y(34), '#4A5A6A');
    p.vline(X(21), Y(33), Y(38), '#4A5A6A');
    p.hline(X(19), X(24), Y(37), '#4A5A6A');
    p.set(X(14), Y(25), INK);
    p.set(X(25), Y(25), INK);
    p.hline(X(18), X(21), Y(28), INK);
  } else madaStamp(p, X(20), Y(30), 10, 8, 7);
  // the feet: the sign's bottom corners split in two, the tape lines under them
  p.rect(X(8), Y(42), 6, 6, '#C8D0D8');
  p.rect(X(26), Y(42), 6, 6, '#C8D0D8');
  p.hline(X(8), X(13), Y(47), '#F4F1E8');
  p.hline(X(26), X(31), Y(47), '#F4F1E8');
  // the axle and the arrow on top (16×10), turning
  p.vline(X(20), Y(12), Y(17), '#8E95A6');
  const w = [16, 12, 4, 12, 16, 4][o.spin % 6];
  const flip = o.spin % 6 >= 3;
  const ax = X(20 - w / 2);
  for (let y = 0; y < 10; y++) {
    const head = Math.abs(y - 4.5);
    const body = y >= 3 && y <= 6;
    for (let x = 0; x < w; x++) {
      const tip = flip ? x : w - 1 - x;
      if (body || tip < 5 - head + 1) p.set(ax + x, Y(2 + y), y < 4 ? '#4AA8E0' : '#2E7AB0');
    }
  }
  aqFinish(p);
  return p;
}

registerEnemyArt('enemy_junro', (): EnemyArt => {
  const get = cached(buildJunro);
  let restored: HTMLCanvasElement | null = null;
  return {
    id: 'enemy_junro',
    w: JW,
    h: JH,
    ox: JOX,
    oy: JOY,
    frame(v: EnemyView): HTMLCanvasElement {
      const f = v.flags;
      const spinIdle = loop(v.gt, 160, 6);
      const base: JunroPose = { spin: spinIdle, lean: 0, back: spinIdle === 3, shake: 0, flat: false };
      if (f.kyuukei || v.pose === 'rest') return get({ ...base, flat: true });
      if (v.pose === 'hurt') return get({ ...base, lean: 1 });
      if (v.pose === 'spin' || v.pose === 'attack') return get({ ...base, spin: loop(v.t, 50, 6), back: loop(v.t, 50, 6) === 3 });
      if (v.pose === 'windup') return get({ ...base, spin: 0, back: false, shake: loop(v.t, 60, 2) });
      return get(base);
    },
    restored(): HTMLCanvasElement {
      if (restored) return restored;
      const p = new PixelCanvas(24, 10);
      p.rect(0, 2, 24, 6, '#E8ECF0');
      p.rect(4, 4, 10, 2, '#4AA8E0');
      p.poly([[14, 2], [19, 5], [14, 8]], '#4AA8E0');
      p.outline(INK);
      restored = p.toCanvas();
      return restored;
    },
    gallery: [{ pose: 'idle' }, { pose: 'spin' }, { pose: 'windup' }, { pose: 'hurt' }, { pose: 'rest', flags: { kyuukei: 1 } }],
  };
});

// ---- ツガオ（初戦。長いすに すわった まま） --------------------------------------------------------

interface TsugaoPose {
  breath: number;
  watch: boolean;
  hand: number;
  yawn: number;
  lean: boolean;
}
const GW = 64;
const GH = 104;
const GOX = 4;
const GOY = 4;
const SUIT = ['#1E1A30', '#2A2440', '#3A3F48'];
const SKIN = ['#B8846A', '#D8A888', '#E8C0A0'];

function buildTsugao(o: TsugaoPose): PixelCanvas {
  const p = new PixelCanvas(GW, GH);
  const X = (v: number) => Math.round(v + GOX);
  const Y = (v: number) => Math.round(v + GOY + (o.lean ? 2 : 0));
  const b = o.breath;
  // the bench under him (front edge, legs)
  p.rect(X(0), Y(70), 56, 6, '#6B5A4A');
  p.hline(X(0), X(55), Y(70), '#8A7A6A');
  p.rect(X(4), Y(76), 4, 20, '#4A3A2E');
  p.rect(X(48), Y(76), 4, 20, '#4A3A2E');
  // legs: seated, knees forward, shoes
  p.rect(X(14), Y(66), 12, 10, SUIT[1]);
  p.rect(X(30), Y(66), 12, 10, SUIT[1]);
  p.rect(X(14), Y(76), 10, 16, SUIT[0]);
  p.rect(X(32), Y(76), 10, 16, SUIT[0]);
  p.rect(X(12), Y(90), 13, 4, '#0B0B14');
  p.rect(X(31), Y(90), 13, 4, '#0B0B14');
  // the cold yakisoba pack on his knees
  p.rect(X(20), Y(62), 16, 5, '#F4F1E8');
  p.rect(X(21), Y(63), 14, 2, '#C8A060');
  p.set(X(30), Y(63), '#E0567A');
  // torso: broad, straight back; the double-breasted suit, thin stripes
  p.rect(X(8), Y(30 - b), 40, 36 + b, SUIT[1]);
  for (let x = 10; x < 48; x += 4) p.vline(X(x), Y(31 - b), Y(64), SUIT[2]);
  p.rect(X(8), Y(30 - b), 4, 36 + b, SUIT[0]);
  // shirt and the black tie, the lapels
  p.poly([[X(22), Y(30 - b)], [X(34), Y(30 - b)], [X(28), Y(46)]], '#E8E4D8');
  p.rect(X(27), Y(32 - b), 3, 14, '#0B0B14');
  p.line(X(22), Y(30 - b), X(27), Y(48), SUIT[0]);
  p.line(X(34), Y(30 - b), X(29), Y(48), SUIT[0]);
  p.set(X(24), Y(52), '#C8CDD4');
  p.set(X(32), Y(52), '#C8CDD4');
  // arms: right hand up with the black seal when he taunts, left on the knee with the watch
  const hy = [0, -6, -10][o.hand];
  p.rect(X(2), Y(34 - b), 7, 24 + hy * 0, SUIT[1]);
  p.rect(X(2), Y(56 + hy), 8, 6, SKIN[1]);
  p.rect(X(1), Y(50 + hy), 8, 6, '#8A5A3A');
  p.rect(X(1), Y(48 + hy), 8, 3, '#1B1733');
  p.rect(X(47), Y(34 - b), 7, 26, SUIT[1]);
  p.rect(X(46), Y(58), 8, 6, SKIN[1]);
  p.rect(X(46), Y(56), 8, 2, o.watch ? '#FFD23F' : '#D9A441');
  // the head: square-cut hair, thick brows, narrow sleepy eyes, the mouth a straight line
  const hx = 28;
  const hyy = 16 - b;
  p.rect(X(hx - 9), Y(hyy - 8), 18, 20, SKIN[1]);
  p.vline(X(hx + 8), Y(hyy - 6), Y(hyy + 10), SKIN[0]);
  p.rect(X(hx - 9), Y(hyy - 12), 18, 6, '#2A2440');
  p.hline(X(hx - 9), X(hx + 8), Y(hyy - 12), '#4A4A55');
  p.rect(X(hx - 9), Y(hyy - 6), 2, 4, '#2A2440');
  p.rect(X(hx + 7), Y(hyy - 6), 2, 4, '#2A2440');
  // brows a little down at the ends (tired, not scary)
  p.hline(X(hx - 7), X(hx - 3), Y(hyy - 3), '#1B1733');
  p.hline(X(hx + 2), X(hx + 6), Y(hyy - 3), '#1B1733');
  p.set(X(hx - 7), Y(hyy - 2), '#1B1733');
  p.set(X(hx + 6), Y(hyy - 2), '#1B1733');
  if (o.yawn > 0) {
    p.hline(X(hx - 7), X(hx - 3), Y(hyy), '#1B1733');
    p.hline(X(hx + 2), X(hx + 6), Y(hyy), '#1B1733');
    p.rect(X(hx - 2), Y(hyy + 4), 5, 2 + o.yawn * 2, '#5A2A2A');
  } else {
    p.hline(X(hx - 6), X(hx - 4), Y(hyy), '#1B1733');
    p.hline(X(hx + 3), X(hx + 5), Y(hyy), '#1B1733');
    p.hline(X(hx - 3), X(hx + 3), Y(hyy + 6), '#7A4A3A');
  }
  p.set(X(hx), Y(hyy + 3), SKIN[0]);
  aqFinish(p, 0.5);
  return p;
}

registerEnemyArt('boss_tsugao_1', (): EnemyArt => {
  const get = cached(buildTsugao);
  let restored: HTMLCanvasElement | null = null;
  return {
    id: 'boss_tsugao_1',
    w: GW,
    h: GH,
    ox: GOX,
    oy: GOY,
    frame(v: EnemyView): HTMLCanvasElement {
      const breath = loop(v.gt, 600, 2);
      const watch = Math.floor(v.gt / 4000) !== Math.floor((v.gt - 400) / 4000);
      const base: TsugaoPose = { breath, watch, hand: 0, yawn: 0, lean: false };
      if (v.pose === 'aori') return get({ ...base, hand: v.t < 200 ? 1 : v.t < 600 ? 2 : 1 });
      if (v.pose === 'yawn') return get({ ...base, yawn: Math.min(3, 1 + Math.floor(v.t / 200)) });
      if (v.pose === 'lean') return get({ ...base, lean: true });
      if (v.pose === 'hurt') return get(base);
      return get(base);
    },
    restored(): HTMLCanvasElement {
      if (restored) return restored;
      restored = new PixelCanvas(4, 4).toCanvas();
      return restored;
    },
    gallery: [{ pose: 'idle' }, { pose: 'aori', t: 300 }, { pose: 'yawn', t: 600 }],
  };
});

// ---- ヒロスケ -----------------------------------------------------------------------------------

interface HiroPose {
  breath: number;
  /** 手の ゆるみ 0..3. */
  yur: number;
  seen: boolean;
  imo: boolean;
  sit: boolean;
  hurt: boolean;
  dandori: number;
}
const HW = 56;
const HH = 88;
const HOX = 4;
const HOY = 4;
const SHIRT = ['#B8B098', '#D8D0B8', '#E8E0C8'];
const APRON = ['#4A5634', '#6B7A4A', '#8A9A62'];
const HSKIN = ['#C89878', '#E8C8A8', '#F4DCC4'];

function glove(p: PixelCanvas, x: number, y: number, yur: number, imo: boolean): void {
  // 0: a hand holding a sweet potato; 3: the palm open, the potato just lying on it
  p.rect(x, y, 8, 7, '#F4F1E8');
  p.hline(x, x + 7, y + 6, '#C8C2B4');
  for (let i = 0; i < 3; i++) if (i < yur) p.vline(x + 1 + i * 2, y - 3, y, '#F4F1E8');
  if (imo || yur >= 3) {
    p.rect(x + 1, y - 2 - (yur >= 3 ? 1 : 0), 7, 3, '#8A3A5A');
    p.hline(x + 2, x + 6, y - 2 - (yur >= 3 ? 1 : 0), '#B85A7A');
  }
}

function buildHiro(o: HiroPose): PixelCanvas {
  const p = new PixelCanvas(HW, HH);
  const X = (v: number) => Math.round(v + HOX + (o.hurt ? 1 : 0));
  const Y = (v: number) => Math.round(v + HOY + (o.sit ? 22 : 0));
  const b = o.breath;
  if (o.sit) {
    // sitting by the wall, knees up, the potato in both hands, looking down
    p.rect(X(10), Y(48), 28, 10, '#5A5A48');
    p.rect(X(10), Y(56), 10, 6, '#3A3A30');
    p.rect(X(28), Y(56), 10, 6, '#3A3A30');
  } else {
    // legs: work trousers, boots
    p.rect(X(12), Y(56), 10, 20, '#5A5A48');
    p.rect(X(26), Y(56), 10, 20, '#5A5A48');
    p.rect(X(11), Y(74), 12, 4, '#2A2440');
    p.rect(X(25), Y(74), 12, 4, '#2A2440');
  }
  // body: the work shirt, the olive apron with its pocket (newspaper and foil)
  p.rect(X(8), Y(24 - b), 32, 34 + b, SHIRT[1]);
  p.rect(X(8), Y(24 - b), 3, 34 + b, SHIRT[0]);
  p.rect(X(13), Y(32), 22, 26, APRON[1]);
  p.rect(X(13), Y(32), 22, 1, APRON[2]);
  p.rect(X(13), Y(32), 2, 26, APRON[0]);
  p.rect(X(18), Y(44), 12, 8, APRON[0]);
  p.rect(X(19), Y(42), 5, 3, '#C8C8C0');
  p.rect(X(24), Y(42), 4, 3, '#C8CDD4');
  // a curl of steam off the pocket
  p.set(X(22), Y(39), '#F4F1E8');
  p.set(X(23), Y(37), '#F4F1E8');
  if (o.seen) madaStamp(p, X(24), Y(36), 10, 8, 11);
  // arms and gloves
  const imoY = o.imo ? -8 : 0;
  p.rect(X(2), Y(28 - b), 7, 22, SHIRT[1]);
  p.rect(X(39), Y(28 - b), 7, 22, SHIRT[0]);
  glove(p, X(1), Y(50 + imoY), o.yur, o.imo);
  glove(p, X(39), Y(50), o.yur, false);
  if (o.dandori) {
    // a finger up, setting the order right
    p.vline(X(44), Y(42), Y(50), '#F4F1E8');
  }
  // head: shaved and shining, square black glasses, the beard to the chest (a red band)
  const hx = 24;
  const hy = 12 - b;
  p.ellipse(X(hx), Y(hy), 9, 10, HSKIN[1]);
  p.ellipse(X(hx - 2), Y(hy - 4), 4, 3, HSKIN[2]);
  p.vline(X(hx + 8), Y(hy - 4), Y(hy + 6), HSKIN[0]);
  p.rect(X(hx - 8), Y(hy - 1), 16, 4, '#2A2440');
  p.set(X(hx - 5), Y(hy), AQ_RIM);
  p.set(X(hx + 4), Y(hy), AQ_RIM);
  if (o.sit) p.set(X(hx + 4), Y(hy + 2), AQ_RIM);
  for (let y = 0; y < 18; y++) {
    const w = Math.max(1, 7 - Math.floor(y / 3));
    p.hline(X(hx - w), X(hx + w - 1), Y(hy + 5 + y), y % 3 ? '#5A4A3A' : '#6A5A4A');
  }
  p.hline(X(hx - 2), X(hx + 1), Y(hy + 19), '#E23B2E');
  aqFinish(p, 0.5);
  return p;
}

registerEnemyArt('boss_hirosuke', (): EnemyArt => {
  const get = cached(buildHiro);
  let restored: HTMLCanvasElement | null = null;
  return {
    id: 'boss_hirosuke',
    w: HW,
    h: HH,
    ox: HOX,
    oy: HOY,
    frame(v: EnemyView): HTMLCanvasElement {
      const pr = v.params ?? {};
      const base: HiroPose = { breath: loop(v.gt, 450, 2), yur: pr.yurumu ?? 0, seen: !!pr.madaSeen, imo: false, sit: false, hurt: false, dandori: 0 };
      if (v.pose === 'sit' || pr.sit) return get({ ...base, sit: true, imo: true, breath: 0, seen: false });
      if (v.pose === 'imo') return get({ ...base, imo: true });
      if (v.pose === 'hurt') return get({ ...base, hurt: true });
      if (v.pose === 'dandori') return get({ ...base, dandori: 1 });
      return get(base);
    },
    restored(): HTMLCanvasElement {
      if (restored) return restored;
      restored = new PixelCanvas(4, 4).toCanvas();
      return restored;
    },
    gallery: [{ pose: 'idle' }, { pose: 'imo' }, { pose: 'idle', flags: {} }, { pose: 'sit' }],
  };
});

// ---- ポコシャ と ぴーちゃん ------------------------------------------------------------------------

interface PokoPose {
  breath: number;
  /** 0 standing … 3 curled up on the floor, knees hugged (61 13.8). */
  curl: number;
  peek: boolean;
  mada: boolean;
  glow: boolean;
  tall: boolean;
}
const PW = 64;
const PH = 88;
const POX = 4;
const POY = 4;

function hen(p: PixelCanvas, x: number, y: number, peek: boolean, wings: boolean): void {
  // ぴーちゃん (10×10): white hen, red comb, yellow beak, an olive scarf
  p.ellipse(x + 5, y + 6, 5, 4, '#F4F1E8');
  if (wings) {
    p.rect(x - 2, y + 4, 3, 3, '#F4F1E8');
    p.rect(x + 9, y + 4, 3, 3, '#F4F1E8');
  }
  const hx = x + (peek ? 9 : 7);
  p.ellipse(hx, y + 2, 2, 2, '#F4F1E8');
  p.rect(hx - 1, y - 1, 2, 2, '#E23B2E');
  p.rect(hx + 2, y + 2, 2, 1, '#E8C878');
  p.set(hx, y + 2, INK);
  p.hline(x + 3, x + 7, y + 5, '#6B7A4A');
}

function buildPoko(o: PokoPose): PixelCanvas {
  const p = new PixelCanvas(PW, PH);
  const X = (v: number) => Math.round(v + POX);
  const Y = (v: number) => Math.round(v + POY - (o.tall ? 4 : 0));
  const b = o.breath;
  if (o.curl >= 2) {
    // sitting small, hugging his knees (not hiding his head): the hen up on his head, wings a little out
    const top = 38;
    p.rect(X(12), Y(top + 18), 32, 22, '#8A8A5A');
    p.rect(X(10), Y(top + 6), 36, 18, '#6B7A4A');
    p.rect(X(14), Y(top + 22), 28, 6, '#E8C8A8');
    p.ellipse(X(28), Y(top), 8, 8, '#E8C8A8');
    p.rect(X(20), Y(top - 8), 16, 4, '#2A2440');
    p.rect(X(21), Y(top - 1), 14, 3, '#2A2440');
    p.set(X(22), Y(top), '#C8CDD4');
    p.set(X(33), Y(top), '#C8CDD4');
    hen(p, X(23), Y(top - 20), false, true);
    // the name tag peeks out over his arms
    p.rect(X(30), Y(top + 12), 8, 4, '#F4F1E8');
    p.hline(X(30), X(37), Y(top + 12), '#4AA8E0');
    aqFinish(p, 0.45);
    return p;
  }
  // legs: khaki trousers, safety boots
  p.rect(X(16), Y(56), 12, 22, '#8A8A5A');
  p.rect(X(32), Y(56), 12, 22, '#8A8A5A');
  p.rect(X(15), Y(76), 14, 4, '#4A4A55');
  p.rect(X(31), Y(76), 14, 4, '#4A4A55');
  // body: broad shoulders, the white running shirt, the olive vest of pockets
  p.rect(X(10), Y(24 - b), 40, 34 + b, '#F4F1E8');
  p.rect(X(10), Y(24 - b), 8, 34 + b, '#6B7A4A');
  p.rect(X(42), Y(24 - b), 8, 34 + b, '#6B7A4A');
  for (const [x, y] of [[11, 34], [43, 34], [11, 46], [43, 46]]) p.rect(X(x), Y(y), 6, 5, '#5A6A3A');
  // the old name tag on his chest (16×6): white, blue edge, a line for the letters
  p.rect(X(22), Y(32), 16, 6, '#F4F1E8');
  p.hline(X(22), X(37), Y(32), '#4AA8E0');
  p.hline(X(22), X(37), Y(37), '#4AA8E0');
  p.hline(X(24), X(35), Y(35), '#6B7186');
  if (o.mada) madaStamp(p, X(36), Y(36), 6, 5, 13);
  if (o.glow) p.rect(X(21), Y(31), 18, 1, '#FFF6D8');
  // thick arms (one stroking the hen's back)
  p.rect(X(2), Y(26 - b), 9, 26, '#E8C8A8');
  p.rect(X(49), Y(26 - b), 9, 26, '#E8C8A8');
  if (o.curl === 1) {
    // flinching: shoulders up, arms in
    p.rect(X(8), Y(30), 6, 18, '#E8C8A8');
    p.rect(X(46), Y(30), 6, 18, '#E8C8A8');
  }
  // head: short-cropped black hair, the sunglasses with tipped-up corners, a shy small mouth
  const hy = 12 - b + (o.curl === 1 ? 3 : 0);
  p.ellipse(X(30), Y(hy), 9, 10, '#E8C8A8');
  p.rect(X(21), Y(hy - 10), 18, 5, '#1B1733');
  p.rect(X(22), Y(hy - 1), 6, 3, '#2A2440');
  p.rect(X(32), Y(hy - 1), 6, 3, '#2A2440');
  p.set(X(21), Y(hy - 2), '#C8CDD4');
  p.set(X(38), Y(hy - 2), '#C8CDD4');
  p.hline(X(28), X(31), Y(hy + 1), '#C8CDD4');
  p.hline(X(29), X(31), Y(hy + 5), '#A8605A');
  // ぴーちゃん on his left shoulder
  hen(p, X(42), Y(14 - b), o.peek, o.tall);
  aqFinish(p, 0.45);
  return p;
}

registerEnemyArt('boss_pokosha', (): EnemyArt => {
  const get = cached(buildPoko);
  let restored: HTMLCanvasElement | null = null;
  return {
    id: 'boss_pokosha',
    w: PW,
    h: PH,
    ox: POX,
    oy: POY,
    frame(v: EnemyView): HTMLCanvasElement {
      const pr = v.params ?? {};
      const curlBase = v.flags.chijimu ? 3 - Math.min(1, pr.koeN ?? 0) : 0;
      const base: PokoPose = { breath: loop(v.gt, 400, 2), curl: curlBase, peek: false, mada: !!pr.nameMada, glow: !!pr.nameGlow && loop(v.gt, 300, 2) === 0, tall: false };
      if (v.pose === 'chijimu' && v.t < 150) return get({ ...base, curl: 1 });
      if (v.pose === 'loosen' && v.t < 300) return get({ ...base, curl: Math.max(0, base.curl - 1) });
      if (v.pose === 'peek') return get({ ...base, peek: true });
      if (v.pose === 'tall') return get({ ...base, tall: true, curl: 0 });
      return get(base);
    },
    restored(): HTMLCanvasElement {
      if (restored) return restored;
      restored = new PixelCanvas(4, 4).toCanvas();
      return restored;
    },
    gallery: [{ pose: 'idle' }, { pose: 'peek' }, { pose: 'idle', flags: { chijimu: 1 } }],
  };
});
