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

// ツガオ（初戦・決戦）は c3_tsugao.ts（第4期に 描き直し）。

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

function glove(p: PixelCanvas, x: number, y: number, yur: number, imo: boolean, right: boolean): void {
  // cotton work gloves (軍手: off-white, a grey cuff band). 0: closed on a sweet potato; 3: the palm open
  p.rect(x, y, 8, 7, '#F4F1E8');
  p.hline(x, x + 7, y, '#8E95A6');
  p.vline(right ? x + 7 : x, y + 1, y + 6, '#C8C2B4');
  p.hline(x, x + 7, y + 6, '#C8C2B4');
  for (let i = 0; i < 3; i++) if (i < yur) p.vline(x + 1 + i * 2, y - 3, y - 1, '#E8E4D8');
  if (imo || yur >= 3) {
    const yy = y - 2 - (yur >= 3 ? 1 : 0);
    p.rect(x + 1, yy, 7, 3, '#7A2E4A');
    p.hline(x + 2, x + 6, yy, '#B85A7A');
    p.set(x + 6, yy + 1, '#E8C060');
  }
}

function buildHiro(o: HiroPose): PixelCanvas {
  const p = new PixelCanvas(HW, HH);
  const X = (v: number) => Math.round(v + HOX + (o.hurt ? 1 : 0));
  const Y = (v: number) => Math.round(v + HOY + (o.sit ? 22 : 0));
  const b = o.breath;
  const TR = ['#3E3E32', '#55553F', '#6B6B52'];
  if (o.sit) {
    // sitting by the wall, knees up, the potato in both hands, looking down
    p.rect(X(9), Y(46), 30, 10, TR[1]);
    p.hline(X(9), X(38), Y(46), TR[2]);
    p.rect(X(9), Y(54), 11, 6, '#2A2440');
    p.rect(X(28), Y(54), 11, 6, '#2A2440');
  } else {
    // legs: work trousers (a knee patch), boots with a pale toe
    p.rect(X(12), Y(56), 10, 19, TR[1]);
    p.rect(X(26), Y(56), 10, 19, TR[0]);
    p.vline(X(12), Y(56), Y(74), TR[2]);
    p.rect(X(14), Y(64), 6, 4, TR[2]);
    p.rect(X(10), Y(74), 13, 5, '#2A2440');
    p.rect(X(25), Y(74), 13, 5, '#2A2440');
    p.hline(X(10), X(14), Y(74), '#5A5468');
    p.hline(X(25), X(29), Y(74), '#5A5468');
  }
  // the work shirt: broad shoulders, sleeves rolled to the elbow
  for (let y = 0; y < 34 + b; y++) {
    const hw = y < 3 ? 13 + y * 2 : 17;
    for (let x = -hw; x < hw; x++) p.set(X(24 + x), Y(24 - b + y), x < -hw + 3 ? SHIRT[2] : x > hw - 4 ? SHIRT[0] : SHIRT[1]);
  }
  p.hline(X(10), X(37), Y(24 - b), SHIRT[2]);
  // the olive apron with its bib and pocket (newspaper and foil), the strings
  p.rect(X(13), Y(31), 22, 28, APRON[1]);
  p.rect(X(13), Y(31), 2, 28, APRON[2]);
  p.rect(X(33), Y(31), 2, 28, APRON[0]);
  p.hline(X(13), X(34), Y(31), APRON[2]);
  p.hline(X(13), X(34), Y(44), APRON[0]);
  p.rect(X(17), Y(46), 14, 9, APRON[0]);
  p.hline(X(17), X(30), Y(46), APRON[2]);
  p.rect(X(18), Y(43), 6, 4, '#C8C8C0');
  p.hline(X(18), X(23), Y(44), '#8A8A92');
  p.rect(X(24), Y(43), 5, 4, '#D8DCE4');
  p.set(X(26), Y(43), '#FFFFFF');
  // a curl of steam off the pocket
  p.set(X(22), Y(41), '#F4F1E8');
  p.set(X(23), Y(39), '#F4F1E8');
  p.set(X(22), Y(37), '#E8E4D8');
  if (o.seen) madaStamp(p, X(25), Y(36), 10, 8, 11);
  // arms: rolled sleeves, then the forearms, then the gloves
  const imoY = o.imo ? -8 : 0;
  p.rect(X(2), Y(26 - b), 8, 12, SHIRT[2]);
  p.rect(X(38), Y(26 - b), 8, 12, SHIRT[0]);
  p.hline(X(2), X(9), Y(37 - b), SHIRT[0]);
  p.hline(X(38), X(45), Y(37 - b), '#A8A088');
  p.rect(X(3), Y(38 - b), 6, 12 + imoY + b, HSKIN[1]);
  p.vline(X(8), Y(38 - b), Y(49 + imoY), HSKIN[0]);
  p.rect(X(39), Y(38 - b), 6, 12 + b, HSKIN[0]);
  glove(p, X(1), Y(50 + imoY), o.yur, o.imo, false);
  glove(p, X(39), Y(50), o.yur, false, true);
  if (o.dandori) {
    // a finger up, setting the order right
    p.vline(X(44), Y(42), Y(50), '#F4F1E8');
    p.set(X(44), Y(42), '#C8C2B4');
  }
  // head: shaved and shining, ears, the thick neck, square black glasses, the beard to the chest
  const hx = 24;
  const hy = 12 - b;
  p.rect(X(hx - 6), Y(hy + 6), 12, 6, HSKIN[0]);
  p.ellipse(X(hx), Y(hy), 10, 11, HSKIN[1]);
  p.rect(X(hx - 11), Y(hy - 1), 2, 5, HSKIN[0]);
  p.rect(X(hx + 10), Y(hy - 1), 2, 5, HSKIN[0]);
  p.ellipse(X(hx + 4), Y(hy + 2), 5, 7, HSKIN[0]);
  p.ellipse(X(hx), Y(hy), 8, 9, HSKIN[1]);
  p.ellipse(X(hx - 3), Y(hy - 5), 4, 3, HSKIN[2]);
  p.set(X(hx - 4), Y(hy - 6), '#FFFFFF');
  // brows (a little frown kept inside), the glasses
  p.hline(X(hx - 7), X(hx - 2), Y(hy - 3), '#6A5040');
  p.hline(X(hx + 2), X(hx + 7), Y(hy - 3), '#6A5040');
  p.rect(X(hx - 8), Y(hy - 1), 7, 5, '#1B1733');
  p.rect(X(hx + 1), Y(hy - 1), 7, 5, '#1B1733');
  p.hline(X(hx - 1), X(hx), Y(hy), '#1B1733');
  p.set(X(hx - 6), Y(hy), AQ_RIM);
  p.set(X(hx + 3), Y(hy), AQ_RIM);
  if (o.sit) p.set(X(hx + 4), Y(hy + 3), AQ_RIM);
  p.vline(X(hx), Y(hy + 4), Y(hy + 5), HSKIN[0]);
  // the moustache and the beard (strands, to the chest), its tip in a red rubber band
  p.hline(X(hx - 5), X(hx + 4), Y(hy + 6), '#4A3A2E');
  for (let y = 0; y < 20; y++) {
    const w = y < 4 ? 8 : Math.max(1, Math.round(8 - (y - 4) * 0.42));
    for (let x = -w; x < w; x++) {
      const strand = (x + 40 + (y >> 1)) % 3;
      p.set(X(hx + x), Y(hy + 7 + y), strand === 0 ? '#4A3A2E' : strand === 1 ? '#5E4A3A' : '#73604C');
    }
  }
  p.set(X(hx - 1), Y(hy + 8), '#7A4A3A');
  p.set(X(hx), Y(hy + 8), '#7A4A3A');
  p.hline(X(hx - 2), X(hx + 1), Y(hy + 22), '#E23B2E');
  p.set(X(hx - 1), Y(hy + 26), '#5E4A3A');
  p.set(X(hx), Y(hy + 26), '#4A3A2E');
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
  // ぴーちゃん (12×11): a white hen (grey under the wing), red comb and wattle, a yellow beak, an olive scarf
  p.ellipse(x + 5, y + 7, 6, 4, '#F4F1E8');
  p.ellipse(x + 4, y + 8, 3, 2, '#D8D4C8');
  p.rect(x - 1, y + 4, 2, 3, '#F4F1E8');
  p.set(x - 2, y + 4, '#E8E4D8');
  if (wings) {
    p.rect(x - 3, y + 5, 3, 3, '#F4F1E8');
    p.rect(x + 10, y + 5, 3, 3, '#F4F1E8');
  }
  const hx = x + (peek ? 10 : 8);
  p.ellipse(hx, y + 2, 2, 2, '#F4F1E8');
  p.rect(hx - 1, y - 2, 3, 2, '#E23B2E');
  p.set(hx, y - 3, '#E23B2E');
  p.rect(hx + 2, y + 2, 2, 1, '#E8C060');
  p.set(hx + 1, y + 4, '#E23B2E');
  p.set(hx, y + 1, INK);
  p.hline(x + 3, x + 8, y + 5, '#6B7A4A');
  p.hline(x + 7, x + 7, y + 6, '#5A6A3A');
  p.set(x + 4, y + 11, '#E8C060');
  p.set(x + 6, y + 11, '#E8C060');
}

const VEST = ['#4E5A30', '#6B7A4A', '#86965E'];
const KHAKI = ['#6E6E46', '#8A8A5A', '#A2A270'];
const PSKIN = ['#B8846A', '#D8A888', '#ECC4A0'];

function buildPoko(o: PokoPose): PixelCanvas {
  const p = new PixelCanvas(PW, PH);
  const X = (v: number) => Math.round(v + POX);
  const Y = (v: number) => Math.round(v + POY - (o.tall ? 4 : 0));
  const b = o.breath;
  if (o.curl >= 2) {
    // sitting small, hugging his knees (not hiding his head): the hen up on his head, wings a little out
    const top = 38;
    p.rect(X(12), Y(top + 18), 32, 22, KHAKI[1]);
    p.rect(X(12), Y(top + 18), 32, 2, KHAKI[2]);
    p.rect(X(10), Y(top + 6), 36, 16, VEST[1]);
    p.rect(X(10), Y(top + 6), 3, 16, VEST[2]);
    p.rect(X(12), Y(top + 20), 32, 7, PSKIN[1]);
    p.hline(X(12), X(43), Y(top + 26), PSKIN[0]);
    p.rect(X(10), Y(top + 38), 14, 4, '#4A4A55');
    p.rect(X(32), Y(top + 38), 14, 4, '#4A4A55');
    p.ellipse(X(28), Y(top), 8, 8, PSKIN[1]);
    p.rect(X(20), Y(top - 8), 16, 4, '#1B1733');
    p.rect(X(21), Y(top - 1), 6, 3, '#2A2440');
    p.rect(X(29), Y(top - 1), 6, 3, '#2A2440');
    p.set(X(21), Y(top - 2), '#C8CDD4');
    p.set(X(34), Y(top - 2), '#C8CDD4');
    hen(p, X(22), Y(top - 21), false, true);
    // the name tag peeks out over his arms
    p.rect(X(30), Y(top + 12), 9, 5, '#F4F1E8');
    p.hline(X(30), X(38), Y(top + 12), '#4AA8E0');
    aqFinish(p, 0.45);
    return p;
  }
  // legs: khaki work trousers (a side pocket), safety boots
  p.rect(X(15), Y(56), 13, 21, KHAKI[1]);
  p.rect(X(32), Y(56), 13, 21, KHAKI[0]);
  p.vline(X(15), Y(56), Y(76), KHAKI[2]);
  p.rect(X(16), Y(62), 4, 6, KHAKI[2]);
  p.rect(X(13), Y(75), 16, 5, '#4A4A55');
  p.rect(X(31), Y(75), 16, 5, '#3A3A48');
  p.hline(X(13), X(18), Y(75), '#8E95A6');
  // the belt
  p.rect(X(13), Y(54), 34, 3, '#3A2B24');
  p.rect(X(28), Y(54), 4, 3, '#C8CDD4');
  // body: very broad shoulders, the white running shirt under an olive vest of pockets
  for (let y = 0; y < 31 + b; y++) {
    const hw = y < 3 ? 15 + y * 2 : 20 - Math.floor(Math.max(0, y - 16) / 6);
    for (let x = -hw; x < hw; x++) {
      const open = Math.abs(x + 0.5) < 9 - (y < 6 ? 6 - y : 0) * 0.6;
      p.set(X(30 + x), Y(24 - b + y), open ? (x > 4 ? '#E0DCD0' : '#F4F1E8') : x < 0 ? (x < -hw + 2 ? VEST[2] : VEST[1]) : x >= hw - 3 ? VEST[0] : VEST[1]);
    }
  }
  // the vest's front edges, the shirt's neck
  p.vline(X(21), Y(28 - b), Y(54), VEST[2]);
  p.vline(X(39), Y(28 - b), Y(54), VEST[0]);
  p.hline(X(26), X(33), Y(24 - b), '#D8D4C8');
  for (const [x, y] of [[11, 33], [42, 33], [11, 44], [42, 44]]) {
    p.rect(X(x), Y(y), 7, 6, VEST[0]);
    p.hline(X(x), X(x + 6), Y(y), VEST[2]);
  }
  // the old name tag on his chest (16×6): white, blue edge, a line for the letters
  p.rect(X(22), Y(32), 16, 7, '#F4F1E8');
  p.hline(X(22), X(37), Y(32), '#4AA8E0');
  p.hline(X(22), X(37), Y(38), '#4AA8E0');
  p.hline(X(24), X(31), Y(35), '#6B7186');
  p.set(X(34), Y(35), '#E23B2E');
  if (o.mada) madaStamp(p, X(36), Y(36), 6, 5, 13);
  if (o.glow) p.rect(X(21), Y(31), 18, 1, '#FFF6D8');
  // thick arms (bare from the shoulder; one stroking the hen's back)
  for (let y = 0; y < 30; y++) {
    // the shoulder round, the upper arm thick, the forearm a little thinner, the fist
    const w = y < 3 ? 7 + y : y < 14 ? 10 : y < 26 ? 9 : 8;
    const lx = 11 - w + (y > 14 ? 1 : 0);
    p.hline(X(lx), X(lx + w - 1), Y(26 - b + y), PSKIN[1]);
    p.set(X(lx), Y(26 - b + y), PSKIN[2]);
    p.set(X(lx + w - 1), Y(26 - b + y), PSKIN[0]);
    const rx = 49 - (y > 14 ? 1 : 0);
    p.hline(X(rx), X(rx + w - 1), Y(26 - b + y), PSKIN[0]);
    p.set(X(rx), Y(26 - b + y), PSKIN[1]);
  }
  p.hline(X(3), X(9), Y(39 - b), PSKIN[0]);
  p.hline(X(50), X(56), Y(39 - b), '#A87458');
  if (o.curl === 1) {
    // flinching: shoulders up, arms in
    p.rect(X(8), Y(30), 7, 18, PSKIN[1]);
    p.rect(X(45), Y(30), 7, 18, PSKIN[0]);
  }
  // head: a thick neck, 刈り上げ (black on top, the sides shaved grey), the sunglasses with tipped-up corners
  const hy = 12 - b + (o.curl === 1 ? 3 : 0);
  p.rect(X(25), Y(hy + 7), 10, 6, PSKIN[0]);
  p.ellipse(X(30), Y(hy), 9, 10, PSKIN[1]);
  p.ellipse(X(33), Y(hy + 2), 5, 7, PSKIN[0]);
  p.ellipse(X(30), Y(hy), 7, 9, PSKIN[1]);
  p.rect(X(21), Y(hy - 6), 2, 6, '#6B6B78');
  p.rect(X(38), Y(hy - 6), 2, 6, '#5A5A66');
  p.rect(X(22), Y(hy - 10), 16, 5, '#1B1733');
  p.hline(X(23), X(36), Y(hy - 10), '#3A3A48');
  p.rect(X(23), Y(hy - 1), 6, 3, '#2A2440');
  p.rect(X(31), Y(hy - 1), 6, 3, '#2A2440');
  p.hline(X(29), X(30), Y(hy - 1), '#2A2440');
  p.set(X(22), Y(hy - 2), '#C8CDD4');
  p.set(X(37), Y(hy - 2), '#C8CDD4');
  p.set(X(24), Y(hy - 1), AQ_RIM);
  p.vline(X(30), Y(hy + 2), Y(hy + 3), PSKIN[0]);
  p.hline(X(29), X(31), Y(hy + 5), '#A8605A');
  // ぴーちゃん on his left shoulder
  hen(p, X(42), Y(13 - b), o.peek, o.tall);
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
