// 8月31日の 水やり当番（夕鳴小学校の 裏庭と 学級園 map_school）— 2026-09-30 依頼主の採用：
// げむきかの案3（docs/ideas/2026-09-30.md。02_ch2_index #72、10_narrative 6.7〔toban〕・7.23、
// 30_level_art 3.15、50_ch2_story 3.10〔bucket〕）。
//
//   公園の さや（段階1〜2）：ふだんの 台詞の あとに 1回だけ〔toban〕（今日は しゅんと わたしの
//     水やり当番。「わたしは、この 1枚を 描いたら 行く。」）→ 当番を 知る（flag_toban_known）。
//   公園の 北の 生け垣の 裏門 (18,0) → map_school。はじめて 入ると 裏門の 札
//     『夏休みの 水やり当番は 5時まで』。
//   当番表（学級園の 柵 (8,4)）：『夏休み 水やり当番 5年2組』、8月31日の ますだけ 白い
//     『小林・さや』、先生の 赤い 字『穂が 出たら、水を 切らさない こと』→ 当番を 知る。
//   手洗い場の じょうろ：くむ → じょうろ 1杯で バケツ 3つ（flag_toban_can）。2往復。
//   バケツ稲 30（名札つき）：土が 見えかけた 6つ（しゅんの『こばやし しゅん』も）に 水を やる
//     （flag_toban_mask のビット。絵は 水が もどる）。グソっ君（1回）「のど かわいとるんやな。…」。
//   6つ目の あと：しゅんが 当番表の 前へ 歩いて シールを 1枚 → 夏休みの ますが ぜんぶ うまる
//     （flag_toban_seal）。
//   さやの ところへ 戻る →「え、やって くれたの？」→「5時の うちだよね。セーフ。」→
//     大事なもの『さやの 夕日の 絵』（item_toban_yuhi、flag_toban_done）。
//   百葉箱：扉は 北向き → グソっ君（1回）「よろい戸？……わいの 親戚か？」。
//   第2章（任意）：flag_toban_seal の ある 人だけ、棚田の トマじいに 1回〔bucket〕（種もみは
//     トマじいの 棚田の。春に マルが バスで 届けた）→ グソっ君「しゅんが ちゃんと やったで。」
//     →「……そうか。ええ 当番じゃ。」（flag_ch2_toban_tome）。
//   赤とんぼ（world fx 'fg'）、持っている じょうろと 注ぐ 水（'sorted'）。
//
// QA:
//   __game.cmd.school(stage = 1, kanenari = false)  段階1/2 の 裏庭へ（2 は グソっ君 つき）
//   __game.cmd.schoolState(what)   'known' 当番を 知った / 'can' じょうろ 満タン / 'half' 3つ 済み・空 /
//                                  'five' 5つ 済み・残り1杯 / 'seal' シールまで / 'done' 絵も もらった
//   __game.cmd.schoolSaya(what)    'toban' 〔toban〕の 前 / 'thanks' シールの あと、公園の さやの 前へ
//   __game.cmd.schoolReset()       当番の 流れを 忘れる
//   __game.cmd.schoolText()        ページの 字の 幅（3行・336px。名札を 入れた バケツ30の ページも）と 禁句
//   __game.cmd.tobanTome()         第2章：棚田の トマじいの 前（シールの フラグつき）

import type { Co } from '../engine/co';
import { flag, removeItem, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { actor, fadeIn, fadeOut, msg, registerScript, registerWorldFx, stage, walk } from '../world/api';
import { fxAt } from '../world/fx';
import { field, type FieldScene } from '../world/field';
import { getScript } from '../world/scripts';
import { pickStage } from '../world/maps';
import * as snd from '../world/audio';
import { measure } from '../engine/font';
import { OBJ as TOWN_OBJ } from '../data/maps/town_text';
import { bucketId, bucketTile } from '../data/maps/school';
import {
  BUCKET_NAMES, FROG_BUCKET, SAYA_BUCKET, SCHOOL_OBJ, SCHOOL_TEXTS, SHUN_BUCKET, TOBAN_BUCKET, TOBAN_HYO, TOBAN_JOURO,
  TOBAN_KANENARI, TOBAN_SAYA, TOBAN_TOME,
} from '../data/text/school';
import { carriedCan, DRY_BUCKETS } from '../art/props/school';
import { P } from '../art/tiles/palette';
import { F, getKeyItem, grace, settle, tileRoute } from './lib';

const MAP = 'map_school';
/** Where Minato stands to stick the sticker on (the board at (8,4)). */
const BOARD_AT: [number, number] = [8, 5];

/** Is グソっ君 walking with Minato right now? */
function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower && f.follower.visible && flag('flag_kanenari_joined') > 0;
}

const onDuty = (): boolean => stage() >= 1 && stage() <= 2;
const mask = (): number => flag('flag_toban_mask') | 0;
const watered = (): number => DRY_BUCKETS.filter((_, i) => mask() & (1 << i)).length;
/** Is bucket `idx` (0-based) one of the six, still dry? */
const isDry = (idx: number): boolean => {
  const d = DRY_BUCKETS.indexOf(idx);
  return d >= 0 && !(mask() & (1 << d));
};

// ================================================================ the can and the water (world fx)

/** The pour in progress: world px of the spout and of the bucket's mouth, the start time. */
const pour = { t0: -1, sx: 0, sy: 0, bx: 0, by: 0 };
const POUR_MS = 900;

registerWorldFx({
  map: MAP,
  // (placed with fxAt: in the HD-2D view at his hand, at the bucket, 02 #85)
  anchored: true,
  draw(f: FieldScene, g, cx, cy, layer) {
    if (layer !== 'sorted') return;
    const p = f.player;
    const holding = flag('flag_toban_took') > 0 && !flag('flag_toban_seal');
    const pouring = pour.t0 >= 0 && f.t - pour.t0 < POUR_MS;
    if (holding && !pouring) {
      // the green can in his hand, down at his side, clear of his body (the right hand;
      // facing left, the left one); facing north it hangs in front of him, hidden
      const [r, l] = carriedCan();
      const left = p.dir === 'left';
      const img = left ? l : r;
      const [hx, hy] = fxAt(f, p.x + (left ? -17 : 6), p.y - 10 + (p.moving ? Math.floor(f.t / 130) % 2 : 0), cx, cy, p.y);
      const X = Math.round(hx);
      const Y = Math.round(hy);
      if (p.dir !== 'up') {
        g.img(img, X, Y);
        // water in it: a glint at the rose now and then
        if (flag('flag_toban_can') > 0 && Math.floor(f.t / 400) % 5 === 0) g.px(X + (left ? 0 : 9), Y + 2, P.glint);
      }
    }
    if (pouring) {
      // the can held out over the bucket's mouth, its rose tipped down; the water falls in
      const k = (f.t - pour.t0) / POUR_MS;
      const [, l] = carriedCan();
      const tip = k < 0.12 ? 1 : 0;
      // (over the bucket's foot line, 10px below its mouth: fxAt)
      const foot = pour.by + 10;
      const at = (x: number, y: number): [number, number] => {
        const [sx, sy] = fxAt(f, x, y, cx, cy, foot);
        return [Math.round(sx), Math.round(sy)];
      };
      const [cxx, cyy] = at(pour.bx + 3, pour.by - 13 + tip);
      g.img(l, cxx, cyy);
      if (k > 0.12 && k < 0.9) {
        // a thin stream from the rose down and left into the mouth (1×2 drops)
        for (let i = 0; i < 8; i++) {
          const ph = ((f.t - pour.t0) / 130 + i / 8) % 1;
          const x = pour.bx + 3 - ph * 3 + Math.sin(ph * Math.PI) * 0.8;
          const y = pour.by - 10 + ph * 10;
          const c = i % 3 ? P.aqua : P.glint;
          const [X, Y] = at(x, y);
          g.px(X, Y, c);
          g.px(X, Y + 1, c);
        }
        // the splash on the surface
        if (Math.floor(f.t / 90) % 2) g.px(...at(pour.bx - 2, pour.by), P.glint);
        else g.px(...at(pour.bx + 2, pour.by), P.aqua);
      }
    }
  },
});

// ================================================================ 赤とんぼ (fg)

/** Four red dragonflies: over the class garden, the lawn of the screen, the pool. */
const TONBO: { cx: number; cy: number; rx: number; ry: number; w: number; ph: number }[] = [
  { cx: 110, cy: 70, rx: 60, ry: 12, w: 0.0004, ph: 0.4 },
  { cx: 270, cy: 118, rx: 30, ry: 20, w: 0.00058, ph: 2.1 },
  { cx: 180, cy: 176, rx: 50, ry: 10, w: 0.00046, ph: 3.6 },
  { cx: 392, cy: 90, rx: 36, ry: 22, w: 0.0005, ph: 5.0 },
];

/** How high the dragonflies fly (px over the ground below them; HD-2D: where they are in 3D). */
const TONBO_UP = 24;

registerWorldFx({
  map: MAP,
  anchored: true,
  draw(f, g, cx, cy, layer) {
    if (layer !== 'fg') return;
    const s = stage();
    const mt = f.mt;
    for (const t of TONBO) {
      const a = mt * t.w + t.ph;
      let x = t.cx + Math.cos(a) * t.rx + Math.sin(a * 2.3) * 6;
      let y = t.cy + Math.sin(a * 1.6) * t.ry;
      let dx = -Math.sin(a) * t.rx;
      let dy = Math.cos(a * 1.6) * t.ry * 1.6;
      if (s === 2) {
        // they hang in the air, all their heads to the north-east
        x = t.cx + Math.cos(t.ph) * t.rx * 0.6 + Math.sin(f.t / 900 + t.ph) * 1.5;
        y = t.cy + Math.sin(t.ph) * t.ry * 0.6;
        dx = 1;
        dy = -1;
      }
      // (in the air, over the ground TONBO_UP px below: fxAt)
      const [sx, sy] = fxAt(f, Math.round(x), Math.round(y), cx, cy, Math.round(y) + TONBO_UP);
      const X = Math.round(sx);
      const Y = Math.round(sy);
      if (X < -8 || X > 392 || Y < -8 || Y > 224) continue;
      const right = dx >= 0;
      const up = Math.abs(dy) > Math.abs(dx) * 1.2;
      const wing = Math.floor(mt / 70 + t.ph * 10) % 2;
      const wc = wing ? '#FFF6D8' : '#E8E4D8';
      if (up) {
        const d = dy < 0 ? -1 : 1;
        for (let i = -1; i <= 2; i++) g.px(X, Y - i * d, i === 2 ? '#B8241E' : '#E84E3C');
        g.px(X - 1, Y + d, wc);
        g.px(X + 1, Y + d, wc);
        g.px(X - 2, Y + d * (wing ? 1 : 0), wc);
        g.px(X + 2, Y + d * (wing ? 1 : 0), wc);
      } else {
        const d = right ? 1 : -1;
        for (let i = -2; i <= 1; i++) g.px(X + i * d, Y, i === 1 ? '#B8241E' : '#E84E3C');
        g.px(X, Y - 1, wc);
        g.px(X, Y + 1, wc);
        g.px(X - d, Y - 1 - (wing ? 1 : 0), wc);
        g.px(X - d, Y + 1 + (wing ? 0 : 1), wc);
      }
    }
  },
});

// ================================================================ entering

registerScript('lv_in_school', function* (): Co {
  pour.t0 = -1;
  if (flag('flag_sch_visited')) return;
  setFlag('flag_sch_visited', 1);
  // the first time through the back gate: its sign (10 7.23 〔obj_sch_uramon〕)
  const t = pickStage(SCHOOL_OBJ.obj_sch_uramon as Record<string, string>);
  if (t && onDuty()) yield* msg(t);
});

// ================================================================ 当番表 (8,4)

registerScript('obj_sch_toban', function* (): Co {
  snd.se('se_examine');
  if (flag('flag_toban_seal')) {
    yield* msg(TOBAN_HYO.after);
    return;
  }
  if (!flag('flag_toban_hyo')) {
    setFlag('flag_toban_hyo', 1);
    yield* msg(TOBAN_HYO.first);
    if (onDuty()) {
      setFlag('flag_toban_known', 1);
      if (watered() < DRY_BUCKETS.length) yield* msg(TOBAN_HYO.hint);
    }
    return;
  }
  yield* msg(TOBAN_HYO.again);
  if (onDuty()) setFlag('flag_toban_known', 1);
});

// ================================================================ 手洗い場の じょうろ (13–15,4)

registerScript('obj_sch_jouro', function* (): Co {
  snd.se('se_examine');
  if (!onDuty() || !flag('flag_toban_known') || flag('flag_toban_seal')) {
    yield* msg(SCHOOL_OBJ.obj_sch_teara as string);
    return;
  }
  if ((flag('flag_toban_can') | 0) >= 3) {
    yield* msg(TOBAN_JOURO.full);
    return;
  }
  const c = yield* msg(TOBAN_JOURO.ask);
  if (c !== 0) {
    if (!flag('flag_toban_took')) yield* msg(TOBAN_JOURO.no);
    return;
  }
  // the tap: a squeak, the water drumming into the can
  snd.se('se_h_watercup');
  setFlag('flag_toban_took', 1);
  setFlag('flag_toban_can', 3);
  yield 500;
  yield* msg(TOBAN_JOURO.filled);
});

// ================================================================ バケツ稲 (30)

/** 0-based 出席番号 of a bucket object id. */
function idxOf(id: string): number {
  const m = /obj_sch_bucket_(\d+)/.exec(id);
  return m ? parseInt(m[1], 10) - 1 : -1;
}

/** The page of an ordinary look at bucket `idx` (its name tag and one line). */
export function bucketPage(idx: number, st = stage()): string {
  const name = BUCKET_NAMES[idx];
  const head = TOBAN_BUCKET.head.replace('{name}', name);
  const d = DRY_BUCKETS.indexOf(idx);
  let line: string;
  if (d >= 0 && mask() & (1 << d)) line = idx === SHUN_BUCKET ? TOBAN_BUCKET.shun : TOBAN_BUCKET.wet;
  else if (idx === SAYA_BUCKET) line = TOBAN_BUCKET.saya;
  else if (idx === FROG_BUCKET) line = TOBAN_BUCKET.frog;
  else if (st === 2 && idx % 2 === 0) line = TOBAN_BUCKET.flavor_s2;
  else line = TOBAN_BUCKET.flavor[(idx * 7 + 3) % TOBAN_BUCKET.flavor.length];
  return `${head}\n${line}`;
}

/** Water bucket `idx` from the can: the can tips, the water runs in, the soil goes under. */
function* pourInto(idx: number): Co {
  const f = F();
  const p = f.player;
  const [tx, ty] = bucketTile(idx);
  const bx = tx * 16 + 8;
  // the bucket's mouth (its rim is 9px above the tile's foot, 2px in)
  const by = ty * 16 + 16 - 12;
  pour.sx = p.x;
  pour.sy = p.y;
  pour.bx = bx;
  pour.by = by;
  pour.t0 = f.t;
  snd.se('se_h_yunomi_pour', { vol: 0.8 });
  yield 480;
  const d = DRY_BUCKETS.indexOf(idx);
  setFlag('flag_toban_mask', mask() | (1 << d));
  setFlag('flag_toban_can', Math.max(0, (flag('flag_toban_can') | 0) - 1));
  yield POUR_MS - 480;
  pour.t0 = -1;
  yield* msg(TOBAN_BUCKET.poured[(watered() + 1) % 2]);
}

/** The six done: Minato walks to the board and puts the sticker on the last square. */
function* sealScene(): Co {
  const f = F();
  const p = f.player;
  yield* msg(TOBAN_BUCKET.done);
  yield* settle(p);
  const route = tileRoute([p.tileX, p.tileY], BOARD_AT, [], 40);
  if (route && route.length) yield* walk('player', route, { speed: 3.6 });
  else if (p.tileX !== BOARD_AT[0] || p.tileY !== BOARD_AT[1]) {
    yield* fadeOut(250, '#1B1733');
    p.x = BOARD_AT[0] * 16 + 8;
    p.y = BOARD_AT[1] * 16 + 16;
    f.syncFollower(true);
    f.snapCamera();
    yield* fadeIn(250);
  }
  p.dir = 'up';
  yield 250;
  snd.se('se_stamp_light');
  setFlag('flag_toban_seal', 1);
  setFlag('flag_toban_can', 0);
  yield 350;
  yield* msg(TOBAN_HYO.seal);
  grace();
}

registerScript('obj_sch_bucket', function* (ctx): Co {
  const f = F();
  const idx = idxOf(ctx.source);
  if (idx < 0) return;
  snd.se('se_examine');
  if (isDry(idx) && onDuty()) {
    setFlag('flag_toban_known', 1);
    yield* msg(TOBAN_BUCKET.dry.replace('{name}', BUCKET_NAMES[idx]));
    if (kanenariHere() && !flag('flag_toban_kn_bucket')) {
      setFlag('flag_toban_kn_bucket', 1);
      f.follower?.showEmote('light', 900);
      yield* msg(TOBAN_BUCKET.kanenari);
    }
    if ((flag('flag_toban_can') | 0) <= 0) {
      yield* msg(TOBAN_BUCKET.dry_empty);
      return;
    }
    yield* pourInto(idx);
    if (watered() >= DRY_BUCKETS.length) {
      yield* sealScene();
      return;
    }
    if ((flag('flag_toban_can') | 0) <= 0) yield* msg(TOBAN_BUCKET.can_empty);
    return;
  }
  yield* msg(bucketPage(idx));
});

// ================================================================ 百葉箱・コーン・直した 敵

registerScript('obj_sch_hyakuyo', function* (): Co {
  snd.se('se_examine');
  yield* msg(SCHOOL_OBJ.obj_sch_hyakuyo);
  if (kanenariHere() && !flag('flag_toban_kn_hyakuyo')) {
    setFlag('flag_toban_kn_hyakuyo', 1);
    F().follower?.showEmote('question', 900);
    yield* msg(TOBAN_KANENARI.hyakuyo);
  }
});

registerScript('obj_sch_cone', function* (): Co {
  snd.se('se_examine');
  const t = SCHOOL_OBJ.obj_sch_cone;
  if (stage() === 2) yield* msg(state.taken['sym_sch_02'] ? t.back : t.s2);
  else yield* msg(t.s1);
});

/** コーン・ボーカル put right: here by the shed; elsewhere their town text. */
registerScript('restored_enemy_cone_vocal', function* (ctx): Co {
  if (ctx.map === MAP) {
    yield* msg(SCHOOL_OBJ.restored_cone);
    return;
  }
  const t = pickStage(TOWN_OBJ.restored_enemy_cone_vocal);
  if (t) yield* msg(t as string);
});

// ================================================================ 公園の さや〔toban〕と お礼 (wraps her talk, 10 6.7)

{
  const orig = getScript('npc_sae');
  registerScript('npc_sae', function* (ctx): Co {
    const s = stage();
    // the duty done (the sticker on): her thanks and the picture, once
    if (s >= 1 && s <= 2 && flag('flag_toban_seal') && !flag('flag_toban_done')) {
      const sae = actor('npc_sae');
      yield* msg(TOBAN_SAYA.thanks);
      snd.se('se_page');
      if (sae) sae.showEmote('note', 800);
      setFlag('flag_toban_done', 1);
      yield* getKeyItem('item_toban_yuhi', TOBAN_SAYA.get);
      yield* msg(TOBAN_SAYA.look);
      return;
    }
    if (orig) yield* orig(ctx);
    else yield* ctx.runDefault();
    // her ordinary line first, then once: today's the watering duty (unless it's done already)
    if (s >= 1 && s <= 2 && !flag('flag_toban_heard') && !flag('flag_toban_seal')) {
      setFlag('flag_toban_heard', 1);
      setFlag('flag_toban_known', 1);
      yield* msg(TOBAN_SAYA.toban);
    }
  });
}

// ================================================================ 第2章：トマじいの〔bucket〕 (wraps his talk, 50 3.10)

{
  const orig = getScript('npc_hoshi_tome');
  registerScript('npc_hoshi_tome', function* (ctx): Co {
    const hs = flag('flag_ch2_stage');
    const ready =
      flag('flag_toban_seal') > 0 &&
      !flag('flag_ch2_toban_tome') &&
      !flag('flag_ch2_sawa_wait') &&
      hs <= 2 &&
      // after his first words (「水の 見回りじゃ。」), on a talk of its own
      (flag('flag_seen_npc_hoshi_tome_h0_1') > 0 || hs >= 1);
    if (!ready) {
      if (orig) yield* orig(ctx);
      else yield* ctx.runDefault();
      return;
    }
    setFlag('flag_ch2_toban_tome', 1);
    yield* msg(TOBAN_TOME.intro);
    yield* msg(TOBAN_TOME.bucket);
    if (kanenariHere()) yield* msg(TOBAN_TOME.kanenari);
    else yield* msg(TOBAN_TOME.alone);
    yield* msg(TOBAN_TOME.end);
  });
}

// ================================================================ QA

/** Every page: at most 3 lines, each at most 336 px; no 「平和」「まだ」「17」 in chapter 1 (10 2.x). */
export function schoolTextCheck(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const walkT = (name: string, v: unknown) => {
    if (typeof v === 'string') {
      if (!v.includes('\n') && !v.startsWith('@') && !v.startsWith('?')) return;
      let lines: string[] = [];
      const flush = () => {
        if (!lines.length) return;
        pages++;
        if (lines.length > 3) bad.push(`${name}: ${lines.length} lines`);
        lines = [];
      };
      for (const raw of v.split('\n')) {
        const t = raw.trim();
        if (!t || t.startsWith('>')) continue;
        if (t.startsWith('@') || t === '/' || t.startsWith('?') || t.startsWith('!') || /^\[.*\]$/.test(t)) {
          flush();
          continue;
        }
        const plain = raw.replace(/\s+$/, '').replace(/\{[^}]*\}/g, '');
        const w = measure(plain);
        if (w > 336) bad.push(`${name}: ${w}px: ${plain}`);
        // chapter 1's words (トマじいの〔bucket〕 is chapter 2's)
        if (!name.startsWith('school.tome'))
          for (const word of ['平和', '17']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
        if (!name.startsWith('school.tome') && /(?<!ま)まだ/.test(plain)) bad.push(`${name}: 「まだ」: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (Array.isArray(v)) v.forEach((x, i) => walkT(`${name}[${i}]`, typeof x === 'string' && !x.startsWith('@') ? `@narr\n${x}` : x));
    else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('school', SCHOOL_TEXTS);
  // the thirty name tags as they are shown (the head with its name and each line it can get)
  BUCKET_NAMES.forEach((name, i) => {
    walkT(`bucket${i + 1}.dry`, TOBAN_BUCKET.dry.replace('{name}', name));
    const head = TOBAN_BUCKET.head.replace('{name}', name);
    for (const line of [...TOBAN_BUCKET.flavor, TOBAN_BUCKET.flavor_s2, TOBAN_BUCKET.wet, TOBAN_BUCKET.shun, TOBAN_BUCKET.saya, TOBAN_BUCKET.frog])
      walkT(`bucket${i + 1}`, `${head}\n${line}`);
  });
  return { pages, bad };
}
registerDebug('schoolText', () => schoolTextCheck());

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/** QA: into map_school in a stage (1 without グソっ君 unless asked, 2 with him). */
registerDebug('school', (st = 1, kanenari = false, x = 14, y = 12, dir = 'up', first = false) => {
  const beat = st >= 2 ? 'stage2' : kanenari ? 'broadcast' : 'alley';
  cmd().jump?.(beat, true);
  if (!first) setFlag('flag_sch_visited', 1);
  return cmd().warp?.(MAP, x, y, dir);
});

const TOBAN_FLAGS = [
  'flag_sch_visited', 'flag_toban_heard', 'flag_toban_known', 'flag_toban_hyo', 'flag_toban_took', 'flag_toban_can', 'flag_toban_mask',
  'flag_toban_seal', 'flag_toban_done', 'flag_toban_kn_bucket', 'flag_toban_kn_hyakuyo', 'flag_ch2_toban_tome',
];

registerDebug('schoolReset', () => {
  for (const id of TOBAN_FLAGS) setFlag(id, 0);
  removeItem('item_toban_yuhi');
  pour.t0 = -1;
  return 'toban reset';
});

/** QA: the duty at a point — 'known', 'can', 'half', 'five', 'seal', 'done'. */
registerDebug('schoolState', (what = 'known') => {
  const bits = (n: number) => (1 << n) - 1;
  setFlag('flag_toban_known', 1);
  setFlag('flag_toban_hyo', 1);
  if (what === 'can') {
    setFlag('flag_toban_took', 1);
    setFlag('flag_toban_can', 3);
  } else if (what === 'half') {
    setFlag('flag_toban_took', 1);
    setFlag('flag_toban_can', 0);
    setFlag('flag_toban_mask', bits(3));
  } else if (what === 'five') {
    setFlag('flag_toban_took', 1);
    setFlag('flag_toban_can', 1);
    // all but しゅん's own (DRY_BUCKETS[1])
    setFlag('flag_toban_mask', bits(6) & ~(1 << DRY_BUCKETS.indexOf(7)));
  } else if (what === 'seal' || what === 'done') {
    setFlag('flag_toban_took', 1);
    setFlag('flag_toban_can', 0);
    setFlag('flag_toban_mask', bits(6));
    setFlag('flag_toban_seal', 1);
    if (what === 'done') {
      setFlag('flag_toban_done', 1);
      if (!state.inventory.includes('item_toban_yuhi')) state.inventory.push('item_toban_yuhi');
    }
  }
  return { mask: flag('flag_toban_mask'), can: flag('flag_toban_can'), seal: flag('flag_toban_seal') };
});

/** QA: in front of さや in the park — 'toban' (before her 〔toban〕) or 'thanks' (the sticker is on). */
registerDebug('schoolSaya', (what = 'toban', st = 1) => {
  cmd().jump?.(st >= 2 ? 'stage2' : 'alley', true);
  if (what === 'thanks') {
    setFlag('flag_toban_known', 1);
    setFlag('flag_toban_took', 1);
    setFlag('flag_toban_mask', 63);
    setFlag('flag_toban_seal', 1);
  }
  return cmd().warp?.('map_town', 14, 12, 'up');
});

/** QA: chapter 2, in front of トマじい on his terrace with the sticker's flag (after his first words). */
registerDebug('tobanTome', () => {
  cmd().jump?.('ch2:mitsu', true);
  setFlag('flag_toban_seal', 1);
  setFlag('flag_toban_done', 1);
  setFlag('flag_seen_npc_hoshi_tome_h0_1', 1);
  setFlag('flag_ch2_toban_tome', 0);
  return cmd().warp?.('map_hoshimidai', 20, 11, 'right');
});

/** QA: bucket `i` (1–30)'s page as it would be shown now. */
registerDebug('schoolBucket', (i = 8) => ({ id: bucketId(i - 1), tile: bucketTile(i - 1), page: bucketPage(i - 1) }));
