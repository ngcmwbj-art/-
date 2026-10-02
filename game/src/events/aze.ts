// 水の はなまる（畦道の先の 円筒分水・よねと とよぞう）と、きつねの 常連（祠の小皿と
// くま吉の 油揚げ）— 2026-09-29 依頼主の採用：げむきかの対岸の案3・5（02_ch2_index #67。
// 10_narrative 6.26・7.22、30_level_art 3.14）。
//
// map_aze（data/maps/aze.ts）：
//   ・よね（夕鳴町、東向き）と とよぞう（となり町、西向き）が 境の石のベンチで 背中あわせ。
//     1つの水筒のお茶を 肩ごしに 注いで、石の上の コップで 飲む（world fx の 振りつけ）。
//     段階1は 注ぐ 途中で 止まる（pour_hold / reach_hold。お茶のすじが 宙に のこる）。
//   ・話すたびに 少しずつ（段階ごとの〔_1〕〔_2〕…）。段階2の はじめの1回は〔水筒〕：
//     水が 北東へ 寄って、となり町の 分が 減る → 「ほんなら お茶を 多めに くれ。」→
//     しゅんが 水筒を 受けとって ベンチを 回り、とよぞうに 渡す（選択肢「渡す」）→
//     よねの ハッカあめが 肩ごしに 飛んでくる。そのあとは とよぞうが 水筒を 持って 注ぐ。
//   ・分水を グソっ君と 調べると「上から 見たら、はなまるやん。」（1回）。
//   ・赤とんぼ（world fx 'fg'）：境を 行ったり 来たり。段階1は 宙で 止まる、段階2は 北東を 向く。
// map_town：
//   ・祠の 東の きつねの 前の 小皿（obj_kitsune_sara）→ グソっ君がいれば ひとことで
//     豆腐屋へ 誘う（flag_kitsune_sasoi）。小皿を 見たあと くま吉に 話すと 1回だけ 油揚げ
//     （item_abura_age、大事なもの。npc_mamekichi の台本を 包む）。
//   ・祠か 小皿で「のせる」→ 画面を 出て 戻ると なくなっている（段階1なら 口が 半分 あいた
//     まま 止まる）。そのあと もう一度だけ 手を あわせられる（朱肉だけ 回復。全回復は 1回の まま）。
//
// QA:
//   __game.cmd.aze(stage = 0)      段階0/1/2 の 状態で 分水の 前へ（2 は グソっ君 つき）
//   __game.cmd.azeReset()          2人の 話と 水筒・きつねの 流れを 忘れる
//   __game.cmd.azeText()           ページの 字の 幅（3行・336px）と、第1章の 禁句
//   __game.cmd.kitsune(state)      'sara' 小皿の前へ / 'abura' 油揚げを 持って / 'offered' のせた あと / 'eaten' 食べた あと

import type { Co } from '../engine/co';
import { addItem, flag, hasItem, removeItem, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { actor, msg, registerScript, registerWorldFx, stage, walk } from '../world/api';
import { field, type FieldScene } from '../world/field';
import { getScript } from '../world/scripts';
import { SPEAKERS } from '../world/msg';
import { pickStage } from '../world/maps';
import { pickTalk } from '../world/interact';
import { fushigiDone } from '../world/fushigi';
import * as snd from '../world/audio';
import { OBJ as TOWN_OBJ } from '../data/maps/town_text';
import { ABURA_TEXT, AZE_OBJ, AZE_TALK, AZE_TEXTS, KITSUNE_TEXT } from '../data/text/aze';
import { azeRt } from '../art/props/aze';
import { POUR_MS, SIP_HELD, SIP_MS } from '../art/chars/people/aze';
import { measure } from '../engine/font';
import { F, getKeyItem, grace, settle, tileRoute } from './lib';
import { zoomIn, zoomOut, type ZoomView } from './stage';

// the name tags and the voices (10_narrative 1.5)
SPEAKERS.npc_yone ??= { name: 'よね', voice: 'yone' };
SPEAKERS.npc_toyozou ??= { name: 'とよぞう', voice: 'toyozou' };

const MAP = 'map_aze';

/** Is グソっ君 walking with Minato right now? */
function kanenariHere(): boolean {
  const f = field();
  return !!f?.follower && f.follower.visible && flag('flag_kanenari_joined') > 0;
}

// ================================================================ the pair's choreography (world fx)

/** Who holds the flask: よね until Minato carries it round to とよぞう (stage 2). */
function holderIds(): [string, string] {
  return flag('flag_aze_suito') ? ['npc_toyozou', 'npc_yone'] : ['npc_yone', 'npc_toyozou'];
}

const dance = { t: 0, sipAt: -1, scene: false };

/** While a scene of ours moves them, the loop keeps its hands off. */
function setScene(on: boolean): void {
  dance.scene = on;
  dance.t = 0;
  dance.sipAt = -1;
  azeRt.cupHeld = false;
}

registerWorldFx({
  map: MAP,
  update(f: FieldScene, dt: number) {
    const [hid, oid] = holderIds();
    const h = actor(hid);
    const o = actor(oid);
    if (!h || !o || dance.scene) return;
    const s = stage();
    h.pose = 'sit_t';
    o.pose = 'sit';
    if (s === 1) {
      // time stopped mid-pour: the tea hangs in the air over the stone
      h.anim = null;
      o.anim = null;
      h.tempPose = 'pour_hold';
      o.tempPose = 'reach_hold';
      azeRt.cupHeld = false;
      return;
    }
    if (h.tempPose === 'pour_hold') h.tempPose = null;
    if (o.tempPose === 'reach_hold') o.tempPose = null;
    // stage 2 before the flask goes round: nobody pours, both look at their water
    if (s >= 3 || (s === 2 && !flag('flag_aze_suito'))) {
      h.anim = null;
      o.anim = null;
      azeRt.cupHeld = false;
      return;
    }
    // a slow round: pour over the shoulder, the other one reaches back, drinks, puts the cup back
    const PERIOD = 9600;
    const POUR_AT = 1200;
    const SIP_AT = POUR_AT + POUR_MS + 500;
    const before = dance.t;
    dance.t = (dance.t + dt * (f.grade.motion > 0 ? 1 : 0)) % PERIOD;
    const crossed = (at: number) => (before < at && dance.t >= at) || (dance.t < before && at <= dance.t);
    if (crossed(POUR_AT)) h.playAnim('pour');
    if (crossed(SIP_AT)) {
      o.playAnim('sip');
      dance.sipAt = 0;
    }
    if (h.anim === 'pour' && h.animT >= POUR_MS) h.anim = null;
    if (dance.sipAt >= 0) {
      dance.sipAt += dt;
      azeRt.cupHeld = dance.sipAt >= SIP_HELD[0] && dance.sipAt < SIP_HELD[1];
      if (dance.sipAt >= SIP_MS) {
        dance.sipAt = -1;
        azeRt.cupHeld = false;
        if (o.anim === 'sip') o.anim = null;
      }
    }
  },
});

// ================================================================ 赤とんぼ (fg)

/** Four red dragonflies over the paddies; one keeps crossing the boundary (x 200). */
const TONBO: { cx: number; cy: number; rx: number; ry: number; w: number; ph: number }[] = [
  { cx: 200, cy: 30, rx: 70, ry: 10, w: 0.00042, ph: 0 },
  { cx: 60, cy: 150, rx: 34, ry: 22, w: 0.0006, ph: 1.7 },
  { cx: 330, cy: 70, rx: 30, ry: 26, w: 0.00052, ph: 3.1 },
  { cx: 300, cy: 190, rx: 40, ry: 12, w: 0.00047, ph: 4.4 },
];

registerWorldFx({
  map: MAP,
  draw(f, g, cx, cy, layer) {
    if (layer !== 'fg') return;
    const s = stage();
    const mt = f.mt;
    for (const t of TONBO) {
      const a = mt * t.w + t.ph;
      // stage 2: they hang in the air and turn their heads to the north-east
      let x = t.cx + Math.cos(a) * t.rx + Math.sin(a * 2.3) * 6;
      let y = t.cy + Math.sin(a * 1.6) * t.ry;
      let dx = -Math.sin(a) * t.rx;
      let dy = Math.cos(a * 1.6) * t.ry * 1.6;
      if (s === 2) {
        x = t.cx + Math.cos(t.ph) * t.rx * 0.6 + Math.sin(f.t / 900 + t.ph) * 1.5;
        y = t.cy + Math.sin(t.ph) * t.ry * 0.6;
        dx = 1;
        dy = -1;
      }
      const X = Math.round(x) - cx;
      const Y = Math.round(y) - cy;
      if (X < -8 || X > 392 || Y < -8 || Y > 224) continue;
      // body along the heading (4px: the head darker), the two pairs of wings a pale
      // cross over the thorax, flickering (held still in stage 1)
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

registerScript('lv_in_aze', function* (): Co {
  setFlag('flag_aze_visited', 1);
  setScene(false);
});

// ================================================================ examine

/** The diversion: its stage text; with グソっ君, his word once. */
registerScript('obj_bunsui', function* (): Co {
  snd.se('se_examine');
  const t = pickStage(AZE_OBJ.obj_bunsui as Record<string, string>);
  if (t) yield* msg(t);
  if (kanenariHere() && !flag('flag_bunsui_flip')) {
    setFlag('flag_bunsui_flip', 1);
    const k = F().follower;
    if (k) k.showEmote('light', 900);
    yield* msg(AZE_OBJ.bunsui_flip);
  }
});

/** ワスレガサ put right (stage 2 here): leaning on the tin shed. Elsewhere its town text. */
registerScript('restored_enemy_wasuregasa', function* (ctx): Co {
  if (ctx.map === MAP) {
    yield* msg(AZE_OBJ.restored);
    return;
  }
  const t = pickStage(TOWN_OBJ.restored_enemy_wasuregasa);
  if (t) yield* msg(t as string);
});

// ================================================================ the pair's talk

function* firstMeeting(): Co<ZoomView | null> {
  if (flag('flag_aze_met')) return null;
  setFlag('flag_aze_met', 1);
  // the first time: close on the bench (2×), as with the town's first meetings
  return yield* zoomIn(200, 196, 300);
}

/** The flask goes round: Minato takes it from よね, walks round the bench and gives it to とよぞう. */
function* carryFlask(): Co {
  const f = F();
  const p = f.player;
  setScene(true);
  const yone = actor('npc_yone');
  const toyo = actor('npc_toyozou');
  try {
    yield* settle(p);
    const E: [number, number] = [14, 12];
    const Wt: [number, number] = [10, 12];
    const go = function* (to: [number, number], face: 'left' | 'right'): Co {
      if (p.tileX !== to[0] || p.tileY !== to[1]) {
        const route = tileRoute([p.tileX, p.tileY], to, [], 8);
        if (route && route.length) yield* walk('player', route, { speed: 3.2 });
      }
      p.dir = face;
    };
    // to よね for the flask
    yield* go(E, 'left');
    yield 200;
    snd.se('se_paper_bag', { vol: 0.5 });
    if (yone) yone.pose = 'sit';
    yield 350;
    // round the bench (the south side) to とよぞう
    yield* go(Wt, 'right');
    yield 200;
    snd.se('se_h_yunomi');
    if (toyo) toyo.pose = 'sit_t';
    setFlag('flag_aze_suito', 1);
    yield 300;
  } finally {
    setScene(false);
  }
}

/** Stage 2 〔水筒〕: the water leans north-east … the flask goes round … the candy over the shoulder. */
function* suitoScene(): Co {
  const again = flag('flag_aze_suito_no') > 0;
  yield* msg(again ? AZE_TALK.suito_again : AZE_TALK.suito);
  const c = yield* msg(AZE_TALK.suito_ask);
  if (c !== 0) {
    setFlag('flag_aze_suito_no', 1);
    yield* msg(AZE_TALK.suito_no);
    return;
  }
  yield* carryFlask();
  yield* msg(AZE_TALK.suito_give);
  yield* yoneCandy();
  grace();
}

/** よねの ハッカあめ (over her shoulder: they don't look round). A full bag: next time. */
function* yoneCandy(): Co {
  yield* msg(AZE_TALK.suito_ame);
  if (addItem('item_hakka_ame')) {
    setFlag('flag_yone_ame', 1);
    setFlag('flag_yone_ame_owed', 0);
    snd.se('se_item');
    yield* msg(`@narr
ハッカあめが、肩ごしに 飛んできた。`);
    yield* msg(AZE_TALK.suito_ame_get);
  } else {
    setFlag('flag_yone_ame_owed', 1);
    yield* msg(AZE_TALK.suito_ame_full);
  }
}

type Who = 'yone' | 'toyozou';
const T = AZE_TALK as Record<string, string>;

function* pairTalk(who: Who): Co {
  const s = stage();
  if (s >= 3) return;
  // the stone between their backs (12,12): the two lean over it, so facing it from the
  // path south (or north) of the bench finds one of them first — it's the stone that's meant
  const [fx, fy] = F().facingTile();
  if (fx === 12 && fy === 12) {
    snd.se('se_examine');
    const t = pickStage(AZE_OBJ.obj_aze_sakai as Record<string, string>);
    if (t) yield* msg(t);
    return;
  }
  const z = yield* firstMeeting();
  try {
    if (s === 2) {
      if (!flag('flag_aze_suito')) {
        yield* suitoScene();
        return;
      }
      if (who === 'yone' && flag('flag_yone_ame_owed')) {
        yield* yoneCandy();
        return;
      }
    }
    const keys = s === 0 ? ['s0_1', 's0_2', 's0_3'] : s === 1 ? ['s1_1', 's1_2'] : ['s2_1', 's2_2'];
    const table: Record<string, string> = {};
    for (const k of keys) table[k] = T[`${who}_${k}`];
    const key = pickTalk(`npc_${who}`, table);
    if (key) yield* msg(table[key]);
  } finally {
    if (z) yield* zoomOut(z, 300);
  }
}

registerScript('npc_yone', function* (): Co {
  yield* pairTalk('yone');
});
registerScript('npc_toyozou', function* (): Co {
  yield* pairTalk('toyozou');
});

// ================================================================ きつねの 常連 (map_town)

/** The fox eats while nobody looks: once the hokora is out of sight (or Minato off the map). */
registerWorldFx({
  map: '',
  update(f: FieldScene) {
    if (!flag('flag_abura_offered') || flag('flag_abura_eaten')) return;
    const inView =
      f.map.id === 'map_town' &&
      112 + 12 > f.camX - 8 && 112 - 28 < f.camX + 384 + 8 && 620 > f.camY - 8 && 596 < f.camY + 216 + 8;
    if (inView) return;
    if (flag('flag_stage') === 1) setFlag('flag_abura_frozen', 1);
    else if (flag('flag_stage') <= 2) setFlag('flag_abura_eaten', 1);
  },
});

/** Offer the abura-age (from the dish or the hokora). Returns true when it went on the dish. */
function* offer(): Co<boolean> {
  const c = yield* msg(KITSUNE_TEXT.offer_ask);
  if (c !== 0) return false;
  removeItem('item_abura_age');
  setFlag('flag_abura_offered', 1);
  setFlag('flag_abura_offer_stage', stage() + 1);
  snd.se('se_h_yunomi', { vol: 0.6 });
  yield* msg(KITSUNE_TEXT.offer_yes);
  return true;
}

/** What the dish shows now, or null when it's still the plain empty dish. */
function* dishState(): Co<boolean> {
  if (flag('flag_abura_eaten')) {
    if (!flag('flag_kitsune_seen')) {
      setFlag('flag_kitsune_seen', 1);
      yield* msg(KITSUNE_TEXT.eaten);
      if (kanenariHere()) yield* msg(KITSUNE_TEXT.flip_joren);
      return true;
    }
    return false;
  }
  if (flag('flag_abura_offered')) {
    if (flag('flag_abura_frozen') && stage() === 1) {
      yield* msg(KITSUNE_TEXT.frozen);
      if (kanenariHere()) yield* msg(KITSUNE_TEXT.flip_joren);
    } else yield* msg(KITSUNE_TEXT.offered);
    return true;
  }
  return false;
}

registerScript('obj_kitsune_sara', function* (): Co {
  snd.se('se_examine');
  if (yield* dishState()) return;
  if (flag('flag_abura_eaten')) {
    yield* msg(KITSUNE_TEXT.sara_after);
    return;
  }
  setFlag('flag_kitsune_sara', 1);
  yield* msg(KITSUNE_TEXT.sara);
  if (hasItem('item_abura_age')) {
    yield* offer();
    return;
  }
  if (flag('flag_abura_got')) return;
  if (kanenariHere()) {
    if (!flag('flag_kitsune_sasoi')) {
      setFlag('flag_kitsune_sasoi', 1);
      yield* msg(KITSUNE_TEXT.sara_flip);
    } else yield* msg(KITSUNE_TEXT.sara_flip2);
  }
});

/**
 * The hokora (10 7.17 obj_hokora, 7.22): the first look and the one full
 * prayer stay as they were (runDefault); the abura-age goes on the dish; once
 * the fox has eaten it, one more prayer that brings back only the 朱肉.
 */
registerScript('obj_hokora', function* (ctx): Co {
  if (!flag('flag_seen_obj_hokora') && !hasItem('item_abura_age')) {
    yield* ctx.runDefault();
    return;
  }
  snd.se('se_examine');
  if (hasItem('item_abura_age') && !flag('flag_abura_offered')) {
    setFlag('flag_seen_obj_hokora', 1);
    setFlag('flag_kitsune_sara', 1);
    yield* msg(KITSUNE_TEXT.hokora2);
    yield* offer();
    return;
  }
  if (yield* dishState()) return;
  if (!flag('flag_hidden_hokora')) {
    // the one full prayer, still waiting
    const c = yield* msg(`@narr
手を あわせますか？
? あわせる | やめておく`);
    if (c === 0) {
      yield* msg(`@narr
しんと した。{w=300}
体が、すこし 軽く なった。`);
      for (const m of state.party) {
        m.hp = m.maxHp;
        m.mp = m.maxMp;
      }
      snd.se('se_heal');
      setFlag('flag_hidden_hokora', 1);
    }
    return;
  }
  if (flag('flag_abura_eaten') && !flag('flag_kitsune_ogami')) {
    // once more after the abura-age: the 朱肉 only (the full heal stays once, 30 3.12)
    const c = yield* msg(KITSUNE_TEXT.pray2);
    if (c === 0) {
      setFlag('flag_kitsune_ogami', 1);
      yield* msg(KITSUNE_TEXT.pray2_yes);
      const mi = state.party.find((m) => m.id === 'minato');
      if (mi) mi.mp = mi.maxMp;
      snd.se('se_heal');
      yield* msg(KITSUNE_TEXT.pray2_sys);
    }
    return;
  }
  yield* msg(flag('flag_abura_eaten') ? KITSUNE_TEXT.hokora_after : KITSUNE_TEXT.hokora2);
});

// ---------------------------------------------------------------- くま吉の 油揚げ (wraps his talk, 10 6.4〔abura〕)

/** Has Minato looked at the empty dish, and is the tofu counter free for it now? */
function aburaReady(): boolean {
  const s = stage();
  if (!flag('flag_kitsune_sara') || flag('flag_abura_got') || s > 2) return false;
  // stage 1: the stamp tutorial first (fushigi_04)
  if (s === 1 && !fushigiDone('fushigi_04')) return false;
  return true;
}

{
  const orig = getScript('npc_mamekichi');
  registerScript('npc_mamekichi', function* (ctx): Co {
    if (!aburaReady()) {
      if (orig) yield* orig(ctx);
      else yield* ctx.runDefault();
      return;
    }
    // stage 0 before his first line (the way to たかし): that line first
    if (stage() === 0 && !flag('flag_seen_npc_mamekichi_s0_1') && orig) yield* orig(ctx);
    const m = actor('npc_mamekichi');
    if (m) m.pose = null;
    if (kanenariHere()) yield* msg(ABURA_TEXT.flip);
    else yield* msg(ABURA_TEXT.narr);
    yield* msg(ABURA_TEXT.give);
    if (stage() === 1) yield* msg(ABURA_TEXT.give_s1);
    setFlag('flag_abura_got', 1);
    yield* getKeyItem('item_abura_age', ABURA_TEXT.get);
  });
}

// ================================================================ QA

/** Every page: at most 3 lines, each at most 336 px; no 「平和」「まだ」「17」 in chapter 1 (10 2.x). */
export function azeTextCheck(): { pages: number; bad: string[] } {
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
        for (const word of ['平和', '17']) if (plain.includes(word)) bad.push(`${name}: 「${word}」: ${plain}`);
        if (/(?<!ま)まだ/.test(plain)) bad.push(`${name}: 「まだ」: ${plain}`);
        lines.push(plain);
      }
      flush();
    } else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) walkT(`${name}.${k}`, x);
  };
  walkT('aze', AZE_TEXTS);
  return { pages, bad };
}
registerDebug('azeText', () => azeTextCheck());

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;

/** QA: into map_aze in a stage (0 the evening, 1 the stopped time, 2 with グソっ君). */
registerDebug('aze', (st = 0, x = 12, y = 11, dir = 'down') => {
  const beat = st >= 2 ? 'stage2' : st === 1 ? 'alley' : 'town';
  cmd().jump?.(beat, true);
  return cmd().warp?.(MAP, x, y, dir);
});

const AZE_FLAGS = [
  'flag_aze_visited', 'flag_aze_met', 'flag_aze_suito', 'flag_aze_suito_no', 'flag_yone_ame', 'flag_yone_ame_owed', 'flag_bunsui_flip',
  'flag_seen_npc_yone_s0', 'flag_seen_npc_yone_s1', 'flag_seen_npc_yone_s2', 'flag_seen_npc_toyozou_s0', 'flag_seen_npc_toyozou_s1', 'flag_seen_npc_toyozou_s2',
  'flag_kitsune_sara', 'flag_kitsune_sasoi', 'flag_abura_got', 'flag_abura_offered', 'flag_abura_offer_stage', 'flag_abura_frozen', 'flag_abura_eaten',
  'flag_kitsune_seen', 'flag_kitsune_ogami',
];
registerDebug('azeReset', () => {
  for (const id of AZE_FLAGS) setFlag(id, 0);
  for (const k of Object.keys(state.flags)) if (/^flag_seen_npc_(yone|toyozou)_/.test(k)) setFlag(k, 0);
  removeItem('item_abura_age');
  setScene(false);
  return 'aze reset';
});

/** QA: the fox's dish — 'sara' (in front of it), 'abura' (holding the abura-age), 'offered', 'eaten', 'frozen'. */
registerDebug('kitsune', (what = 'sara', st?: number) => {
  const s = typeof st === 'number' ? st : what === 'frozen' ? 1 : 2;
  cmd().jump?.(s >= 2 ? 'stage2' : s === 1 ? 'alley' : 'town', true);
  const give = () => {
    if (!state.inventory.includes('item_abura_age')) state.inventory.push('item_abura_age');
  };
  if (what !== 'sara') {
    setFlag('flag_kitsune_sara', 1);
    setFlag('flag_abura_got', 1);
  }
  if (what === 'abura') give();
  if (what === 'offered' || what === 'eaten' || what === 'frozen') {
    setFlag('flag_abura_offered', 1);
    setFlag('flag_abura_offer_stage', s + 1);
  }
  if (what === 'eaten') setFlag('flag_abura_eaten', 1);
  if (what === 'frozen') setFlag('flag_abura_frozen', 1);
  return cmd().warp?.('map_town', 7, 39, 'up');
});

