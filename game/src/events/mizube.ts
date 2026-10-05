// 水辺の 図鑑：第1章（2026-10-05 依頼主の採用：げむきかの 改1。02_ch2_index #81、
// 10_narrative 6.25〔seki〕・7.24、30_level_art 3.16）。
//
// 夕鳴川の 堰（map_seki、data/maps/seki.ts）：
//   ・おぴぃ（npc_tamotsu）は ザリガニを 1ぴき 釣ったあとの 誘い（mizube_zari.ts）から、先に
//     石積みの 上 (9,10) に 伏せた バケツで 座っている（堰を 出ると 対岸に もどっている）。
//   ・話すと〔meet〕→ 段階の 台詞 →「……やってく？」→ テナガエビ釣り（seki_tsuri.ts）。
//     淵（石積み (8,9–13)）を 調べても 同じ。はじめての 1回の 前に〔howto〕（おぴぃの 浮きを
//     持っていれば〔uki〕も）。
//   ・釣ったあと：計る（盛る：オスは「手を 入れとく」）→ はじめての テナガエビは グソっ君との
//     かけ合い（いなければ おぴぃだけ）と ふがし → ヨシノボリ／たまごの テナガエビ（計らない）／
//     片手の 大将（計らない。グソっ君が 先に「子か、孫か、ひ孫か」）→ 放す。
//   ・ヨシ原の ツバメ、案内板（グソっ君と おぴぃ「7月に、見に 行った」）、水門（分水へ 行った
//     人に 1行）、はじめての テナガエビの あと 用水路の 橋で〔exit〕（1回）。
//   ・グソっ君は 真水が 苦手で 見ている だけ（着いたとき 1回）。
// 第1章の 家と 店：
//   ・母（npc_mother を 包む）：①の『みずべ』を ぜんぶ うめたら〔yurai〕（1回）。
//   ・つりえさ屋の 呼びりん（obj_sb_register を 包む）：おぴぃの 書きこみの あと 1ページ。
//   ・メダカ（水そう obj_sb_tank）：『みずべ』に。
//
// QA：
//   __game.cmd.seki(stage, x, y, dir)     その 段階で 堰へ（2 は グソっ君 つき）
//   __game.cmd.sekiOpi(stage)             おぴぃが 来ている 堰の、釣る 場所 (9,11) へ
//   __game.cmd.sekiTsuri(opts)            テナガエビ釣りを すぐに（{ spot, kind, cm, outcome, auto }）
//   __game.cmd.mizube(opts)               『みずべ』の フラグ（{ book, all, yurai, reset }）
//   __game.cmd.mizubeText()               ページの 字の 幅（3行・336px）と 第1章の 禁句

import type { Co } from '../engine/co';
import { game } from '../engine/game';
import { addItem, flag, hasItem, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { actor, msg, registerScript, registerWorldFx, stage } from '../world/api';
import { field } from '../world/field';
import { getScript } from '../world/scripts';
import { pickStage } from '../world/maps';
import { uiHud } from '../ui/hud';
import * as snd from '../world/audio';
import {
  MIZUBE_ZARI,
  SEKI_HINT,
  SEKI_OBJ,
  SEKI_OPI,
  TENAGA,
  TSUBAME,
  YURAI,
  tenagaMeasure,
} from '../data/text/mizube';
import { setZukanStill, zukanComplete, zukanCount, zukanRecord, zukanSee, zukanSeen, ZUKAN } from '../data/text/mizube_book';
import { F, panBack, panTo, walkTo } from './lib';
import { mizubeTextCheck } from './mizube_check';
import { forceBoxPos, keyGuide, talkZoom, zoomOut } from './stage';
import { kanenariHere, MZ } from './mizube_zari';
import { YF, yuraiAtOpi } from './mizube_yurai';
import {
  openSeki,
  playSeki,
  sekiArm,
  sekiCamera,
  sekiCard,
  sekiGuideRows,
  sekiMeasure,
  sekiMori,
  sekiRelease,
  type SekiKind,
  type SekiOutcome,
  type SekiPanel,
  type SekiResult,
  type SekiSpot,
} from './seki_tsuri';
// 第2章の 夜振り（トマじい・小屋の たも網・用水路・沢ガニ・駅ノート・カット4b。npcs と school の トマじいを 包む）
import './ch2/yoburi';

const MAP = 'map_seki';

/** Flags (10_narrative 3.6). */
export const MF = {
  visited: 'flag_mizube_seki_visited',
  met: 'flag_mizube_seki_met',
  kaneArrive: 'flag_mizube_kane_arrive',
  /** 下ろした 回数。 */
  tries: 'flag_mizube_tries',
  /** 釣った 数（テナガエビと ヨシノボリ）。 */
  count: 'flag_mizube_count',
  /** はじめての テナガエビ（かけ合いと ふがし）。 */
  first: 'flag_mizube_first',
  fugashiOwed: 'flag_mizube_fugashi_owed',
  /** 記録：テナガエビの いちばん 大きい 認定の cm。 */
  best: 'flag_mizube_best',
  /** 流木の 陰で 大将に 会わなかった 回数（9回目で 出る）。 */
  dry: 'flag_mizube_dry',
  taisho: 'flag_mizube_taisho',
  goby: 'flag_mizube_goby',
  uki: 'flag_mizube_uki',
  ukiLine: 'flag_mizube_uki_line',
  exit: 'flag_mizube_exit',
  annaiKane: 'flag_mizube_annai_kane',
  annaiOpi: 'flag_mizube_annai_opi',
  suimonAze: 'flag_mizube_suimon_aze',
  tsubame: 'flag_mizube_tsubame',
  yobirin: 'flag_mizube_yobirin',
  mori: 'flag_mizube_mori',
  early: 'flag_mizube_early',
  carry: 'flag_mizube_carry',
  lost: 'flag_mizube_lost',
  drop: 'flag_mizube_drop',
  release: 'flag_mizube_release',
  /** 誘いの 前の 手がかり（来たとき・淵）。 */
  hintArrive: 'flag_mizube_hint_arrive',
  hintFuchi: 'flag_mizube_hint_fuchi',
} as const;

/** まだ 誘われていない（堰の 場面は これから。段階0〜2）：手がかりを 出す。 */
function hintDue(): boolean {
  return !flag(MZ.seki) && stage() <= 2;
}

/** おぴぃが 堰に 来ている（誘われた あと、段階0〜2）。 */
function opiAtSeki(): boolean {
  return flag(MZ.seki) > 0 && stage() <= 2 && field()?.map.id === MAP;
}

/** 『みずべ』に はじめて 書いた 種の 知らせ（欄が あるとき、1回ずつ）。 */
function* zukanNote(id: string): Co {
  if (!flag(MZ.book) || flag(`flag_zukan_${id}_noted`)) return;
  setFlag(`flag_zukan_${id}_noted`, 1);
  const e = ZUKAN.find((z) => z.id === id);
  if (!e) return;
  const [n, all] = zukanCount(1);
  snd.se('se_pen_write');
  yield* msg(`@sys
『みずべ』に 書きこんだ。
（${e.name}${e.bonus ? '' : `　${n}/${all}`}）`);
}

// ================================================================ ツバメの 渦（fg）

/** Swallows gathering over the reed bed before the night (30 3.16). Stage 1 held in the sky, stage 2 tilted north-east. */
const BIRDS = Array.from({ length: 18 }, (_, i) => ({
  r: 22 + ((i * 37) % 46),
  ry: 0.42 + ((i * 13) % 20) / 100,
  w: 0.0011 + ((i * 7) % 9) * 0.00008,
  ph: i * 1.7,
  dz: (i * 29) % 12,
}));

registerWorldFx({
  map: MAP,
  draw(f, g, cx, cy, layer) {
    if (layer !== 'fg') return;
    const s = stage();
    const mt = f.mt;
    // the swirl's middle: over the reeds (south-east); stage 2 drawn off to the north-east
    const ox = 20 * 16 + (s === 2 ? 26 : 0);
    const oy = 9 * 16 - (s === 2 ? 22 : 0);
    for (const b of BIRDS) {
      const a = mt * b.w + b.ph;
      let x = ox + Math.cos(a) * b.r;
      let y = oy + Math.sin(a) * b.r * b.ry - b.dz - Math.sin(a * 2.3) * 4;
      if (s === 2) {
        // the whole swirl leans: its far side rises to the north-east
        const k = Math.cos(a) * 0.35;
        y -= k * b.r * 0.6;
        x += Math.sin(a) * 4;
      }
      const X = Math.round(x) - cx;
      const Y = Math.round(y) - cy;
      if (X < -6 || X > 390 || Y < -6 || Y > 222) continue;
      // a swallow: a dark forked shape, the wings a shallow V that beats (held still in stage 1)
      const right = -Math.sin(a) >= 0;
      const flap = Math.floor(mt / 90 + b.ph * 7) % 2;
      const d = right ? 1 : -1;
      g.px(X, Y, '#2A2440');
      g.px(X + d, Y, '#2A2440');
      g.px(X - d, Y + 1, '#2A2440');
      g.px(X - d * 2, Y + 1, '#3A2B5C');
      g.px(X, Y - 1 - flap, '#3A2B5C');
      g.px(X - 1, Y - 2 + flap * 2, '#3A2B5C');
      g.px(X + 1, Y - 2 + flap * 2, '#3A2B5C');
      if (!flap) g.px(X, Y + 1, '#E8E4D8');
    }
  },
});

// ================================================================ entering

registerScript('lv_in_seki', function* (): Co {
  setFlag(MF.visited, 1);
  if (kanenariHere() && !flag(MF.kaneArrive) && stage() <= 2) {
    setFlag(MF.kaneArrive, 1);
    yield 350;
    yield* msg(SEKI_OPI.kane_arrive);
  }
  if (hintDue() && !flag(MF.hintArrive)) {
    setFlag(MF.hintArrive, 1);
    yield 350;
    yield* msg(pickStage(SEKI_HINT.arrive as Obj) ?? '');
  }
});

// ================================================================ examine

type Obj = Record<string, string> | string;
function* stageText(id: keyof typeof SEKI_OBJ): Co {
  snd.se('se_examine');
  const t = pickStage(SEKI_OBJ[id] as Obj);
  if (t) yield* msg(t);
}

registerScript('obj_seki_suimon', function* (): Co {
  yield* stageText('obj_seki_suimon');
  if (flag('flag_aze_visited') && !flag(MF.suimonAze) && stage() !== 1) {
    setFlag(MF.suimonAze, 1);
    yield* msg(SEKI_OBJ.suimon_aze);
  }
});

registerScript('obj_seki_annai', function* (): Co {
  yield* stageText('obj_seki_annai');
  if (kanenariHere() && !flag(MF.annaiKane)) {
    setFlag(MF.annaiKane, 1);
    yield* msg(SEKI_OBJ.annai_flip);
  }
  if (opiAtSeki() && !flag(MF.annaiOpi) && (flag(MF.annaiKane) || !kanenariHere())) {
    setFlag(MF.annaiOpi, 1);
    yield* msg(SEKI_OBJ.annai_opi);
  }
});

registerScript('obj_seki_yoshi', function* (): Co {
  yield* stageText('obj_seki_yoshi');
  const s = stage();
  if (!opiAtSeki()) {
    if (s !== 1) yield* msg(TSUBAME.alone);
    return;
  }
  if (flag(MF.tsubame)) return;
  setFlag(MF.tsubame, 1);
  if (kanenariHere()) yield* msg(s === 1 ? TSUBAME.kane_s1 : TSUBAME.kane);
  yield* msg(s === 1 ? TSUBAME.opi_s1 : TSUBAME.opi);
  zukanSee('tsubame');
  yield* zukanNote('tsubame');
});

registerScript('obj_seki_fuchi', function* (): Co {
  yield* stageText('obj_seki_fuchi');
  if (!opiAtSeki()) {
    if (hintDue() && !flag(MF.hintFuchi)) {
      setFlag(MF.hintFuchi, 1);
      yield* msg(flag('flag_tamotsu_met') ? SEKI_HINT.fuchi_met : SEKI_HINT.fuchi);
    }
    return;
  }
  const i = yield* msg(SEKI_OPI.fuchi_ask);
  if (i === 0) yield* sekiSession();
});

/** Over the canal's slab on the way out, after the first shrimp: おぴぃ calls after him from her stone (once). */
registerScript('trig_seki_exit', function* (): Co {
  const f = field();
  if (!f || f.player.dir !== 'up' || !opiAtSeki() || !flag(MF.first) || flag(MF.exit)) return;
  setFlag(MF.exit, 1);
  yield* msg(SEKI_OPI.exit);
});

// ================================================================ おぴぃ at the weir (wraps her talk)

{
  const orig = getScript('npc_tamotsu');
  registerScript('npc_tamotsu', function* (ctx): Co {
    if (field()?.map.id !== MAP) {
      if (orig) yield* orig(ctx);
      else yield* ctx.runDefault();
      return;
    }
    yield* sekiTalk();
  });
}

function* sekiTalk(): Co {
  const s = stage();
  if (s > 2) return;
  const f = field();
  const a = actor('npc_tamotsu');
  yield* giveOwedFugashi();
  if (yield* yuraiAtOpi()) {
    // (her notebook first; then the usual question)
  } else if (!flag(MF.met)) {
    const z = f && a ? yield* talkZoom(f.player, a) : null;
    yield* msg(SEKI_OPI.meet);
    if (z) yield* zoomOut(z, 300);
    setFlag(MF.met, 1);
  } else yield* msg(s === 1 ? SEKI_OPI.s1 : s === 2 ? SEKI_OPI.s2 : SEKI_OPI.s0);
  const i = yield* msg(SEKI_OPI.ask);
  if (i === 0) yield* sekiSession();
}

function* giveOwedFugashi(): Co {
  if (!flag(MF.fugashiOwed)) return;
  if (addItem('item_fugashi')) {
    setFlag(MF.fugashiOwed, 0);
    yield 34;
    uiHud.clearNotes();
    snd.se('se_item');
    yield* msg(TENAGA.got_fugashi);
  }
}

// ================================================================ the fishing

let qaForce: { kind?: SekiKind; cm?: number; spot?: SekiSpot; outcome?: SekiOutcome } | undefined;
let qaAuto = false;

function* sekiSession(): Co {
  const f = F();
  const p = f.player;
  const s = stage();
  if (p.tileX !== 9 || p.tileY !== 11) yield* walkTo('player', 9, 11, { face: 'left' });
  p.dir = 'left';
  const a = actor('npc_tamotsu');
  if (a) {
    a.data.scripted = true;
    a.dir = 'left';
  }
  forceBoxPos('bottom');
  const cam = sekiCamera();
  yield* panTo((cam.x - 8) / 16, (cam.y - 8) / 16, 500);
  const useUki = hasItem('item_tamotsu_uki');
  const panel = yield* openSeki(s, flag(MF.best), useUki);
  panel.auto = qaAuto;
  if (!flag(MF.tries)) {
    yield* msg(SEKI_OPI.howto);
    if (useUki && !flag(MF.uki)) {
      setFlag(MF.uki, 1);
      yield* msg(SEKI_OPI.uki);
    }
    panel.clearInput();
    if (!qaAuto) keyGuide(sekiGuideRows(), 4200, 8);
  } else if (useUki && !flag(MF.uki)) {
    setFlag(MF.uki, 1);
    yield* msg(SEKI_OPI.uki);
    panel.clearInput();
  }
  try {
    for (;;) {
      const r = yield* playSeki(panel, { first: !flag(MF.tries), dry: flag(MF.dry), force: qaForce });
      if (r.outcome === 'quit') break;
      if (r.outcome !== 'caught') panel.phase = 'end';
      setFlag(MF.tries, flag(MF.tries) + 1);
      if (r.spot === 'ryuboku') setFlag(MF.dry, r.kind === 'taisho' && r.outcome === 'caught' ? 0 : flag(MF.dry) + 1);
      yield* afterSeki(panel, r, s);
      if (qaAuto) break;
      const i = yield* msg(SEKI_OPI.again);
      if (i !== 0) break;
    }
  } finally {
    if (!panel.done) {
      panel.cues.clear();
      panel.done = true;
      game.ui.remove(panel);
    }
  }
  yield* msg(SEKI_OPI.bye);
  yield* panBack(500);
  forceBoxPos(null);
  if (a) {
    a.dir = 'left';
    delete a.data.scripted;
  }
}

function pick(list: string[], key: string): string {
  const n = flag(key);
  setFlag(key, n + 1);
  return list[(n - 1 + list.length) % list.length];
}

function* afterSeki(panel: SekiPanel, r: SekiResult, s: number): Co {
  const miss = (one: string, list: string[], key: string) => (flag(key) ? pick(list, key) : (setFlag(key, 1), one));
  if (r.outcome === 'early') return yield* msg(miss(TENAGA.early_1, TENAGA.early, MF.early));
  if (r.outcome === 'carry') return yield* msg(miss(TENAGA.carry_1, TENAGA.carry, MF.carry));
  if (r.outcome === 'lost') return yield* msg(miss(TENAGA.lost_1, TENAGA.lost, MF.lost));
  if (r.outcome === 'drop') return yield* msg(miss(TENAGA.drop_1, TENAGA.drop, MF.drop));
  const kane = kanenariHere();
  setFlag(MF.count, flag(MF.count) + 1);
  if (r.kind === 'goby') setFlag('flag_mizube_count_goby', flag('flag_mizube_count_goby') + 1);
  // ---- the mother with her eggs: not measured, back at once
  if (r.kind === 'tamago') {
    yield* sekiCard(panel, 'tamago', r.cm, { noRuler: true });
    yield* msg(TENAGA.tamago);
    zukanSee('tamago');
    if (s === 1) setZukanStill('tamago');
    yield* sekiRelease(panel, r.spot, r.kind, r.cm);
    yield* zukanNote('tamago');
    return;
  }
  // ---- 片手の 大将 (the weir's ぬし): not measured
  if (r.kind === 'taisho') {
    yield* sekiCard(panel, 'taisho', r.cm, { noRuler: true });
    if (!flag(MF.taisho)) {
      setFlag(MF.taisho, 1);
      yield* msg(TENAGA.taisho);
      if (kane && flag(MZ.nushiKane)) yield* msg(TENAGA.taisho_kane);
      else yield* msg(TENAGA.taisho_self);
      yield* msg(TENAGA.taisho_end);
      if (panel.opiFloat && !flag(MF.ukiLine)) {
        setFlag(MF.ukiLine, 1);
        yield* msg(TENAGA.taisho_uki);
      }
    } else yield* msg(TENAGA.taisho_again);
    zukanSee('taisho');
    yield* sekiRelease(panel, r.spot, r.kind, r.cm);
    yield* zukanNote('taisho');
    return;
  }
  // ---- on the ruler
  yield* sekiCard(panel, r.kind, r.cm);
  if (s === 1) {
    yield* msg(TENAGA.still);
    setZukanStill(r.kind);
    if (flag(MZ.book) && !flag(MZ.stillNote)) {
      setFlag(MZ.stillNote, 1);
      yield* msg(MIZUBE_ZARI.still_note);
    }
  }
  const tenaga = r.kind === 'mesu' || r.kind === 'osu';
  if (r.kind === 'goby' && !flag(MF.goby)) {
    setFlag(MF.goby, 1);
    yield* msg(TENAGA.yoshinobori);
    if (kane) yield* msg(TENAGA.yoshinobori_kane);
  }
  const first = tenaga && !flag(MF.first);
  if (first) yield* msg(kane ? TENAGA.first_kane : TENAGA.first);
  yield* sekiMeasure(panel);
  const k = flag(MF.mori);
  setFlag(MF.mori, k + 1);
  const [line, cert] = tenagaMeasure(r.kind === 'goby' ? 'goby' : (r.kind as 'mesu' | 'osu'), r.cm, sekiArm(r.kind, r.cm), k, s);
  yield* msg(line);
  yield* sekiMori(panel, cert);
  zukanRecord(r.kind, r.cm, cert);
  if (first) {
    setFlag(MF.first, 1);
    yield* msg(TENAGA.fugashi);
    if (addItem('item_fugashi')) {
      yield 34;
      uiHud.clearNotes();
      snd.se('se_item');
      yield* msg(TENAGA.got_fugashi);
    } else {
      setFlag(MF.fugashiOwed, 1);
      yield* msg(TENAGA.fugashi_full);
    }
  }
  if (tenaga) {
    const best = flag(MF.best);
    if (cert > best) {
      setFlag(MF.best, cert);
      panel.record = cert;
      if (best) yield* msg(TENAGA.record);
    }
  }
  const n = flag(MF.release);
  setFlag(MF.release, n + 1);
  yield* msg(n ? TENAGA.release[(n - 1) % TENAGA.release.length] : TENAGA.release_1);
  yield* sekiRelease(panel, r.spot, r.kind, r.cm);
  yield* msg(r.kind === 'goby' ? TENAGA.release_narr_goby : TENAGA.release_narr);
  yield* zukanNote(r.kind);
}

// ================================================================ 母 and the bait shop (wraps)

{
  const orig = getScript('npc_mother');
  registerScript('npc_mother', function* (ctx): Co {
    const s = stage();
    const ready = flag(MZ.book) > 0 && zukanComplete(1) && !flag(YF.mom) && s <= 2 && (s > 0 || flag('flag_errand') > 0);
    if (!ready) {
      if (orig) yield* orig(ctx);
      else yield* ctx.runDefault();
      return;
    }
    setFlag(YF.mom, 1);
    yield* msg(YURAI.mom_open);
    yield* msg(YURAI.mom);
    if (kanenariHere()) yield* msg(YURAI.mom_kane);
  });
}

{
  const orig = getScript('obj_sb_register');
  registerScript('obj_sb_register', function* (ctx): Co {
    if (orig) yield* orig(ctx);
    else yield* ctx.runDefault();
    if (flag(YF.done) && !flag(MF.yobirin)) {
      setFlag(MF.yobirin, 1);
      yield* msg(YURAI.yobirin);
    }
  });
}

{
  const orig = getScript('obj_sb_tank');
  registerScript('obj_sb_tank', function* (ctx): Co {
    if (orig) yield* orig(ctx);
    else yield* ctx.runDefault();
    yield* zukanNote('medaka');
  });
}

// ================================================================ QA

/** The chapter-1 pages, with the measured lines at their longest numbers. */
export function mizubeTexts(): Record<string, unknown> {
  const measures: Record<string, string> = {};
  for (const kind of ['mesu', 'osu', 'goby'] as const)
    for (let k = 0; k < 3; k++) for (const st of [0, 1]) for (const n of [5, 6, 9]) measures[`${kind}.${k}.s${st}.${n}`] = tenagaMeasure(kind, n, kind === 'osu' ? 12 : 4, k, st)[0];
  const notes: Record<string, string> = {};
  for (const e of ZUKAN.filter((z) => z.vol === 1)) notes[e.id] = `@sys\n『みずべ』に 書きこんだ。\n（${e.name}　12/12）`;
  return { MIZUBE_ZARI, SEKI_HINT, SEKI_OBJ, SEKI_OPI, TENAGA, TSUBAME, YURAI, measures, notes };
}
registerDebug('mizubeText', () => mizubeTextCheck(mizubeTexts()));

type Cmd = Record<string, (...a: unknown[]) => unknown>;
const cmd = (): Cmd => (window as unknown as { __game: { cmd: Cmd } }).__game.cmd;
const BEAT: Record<number, string> = { 0: 'town', 1: 'alley', 2: 'stage2' };

/** QA: into map_seki in a stage (0 the evening, 1 the stopped time, 2 with グソっ君). */
registerDebug('seki', (st = 0, x = 12, y = 9, dir = 'left') => {
  cmd().jump?.(BEAT[st] ?? 'town', true);
  return cmd().warp?.(MAP, x, y, dir);
});

/** QA: at the weir with おぴぃ there (asked), on the fishing stone (9,11). `met`: her first words heard. */
registerDebug('sekiOpi', (st = 0, met = true) => {
  cmd().jump?.(BEAT[st] ?? 'town', true);
  setFlag(MZ.seki, 1);
  setFlag('flag_zari_count', Math.max(1, flag('flag_zari_count')));
  if (met) setFlag(MF.met, 1);
  return cmd().warp?.(MAP, 9, 11, 'left');
});

/** QA: the shrimp fishing at once, from where he stands. { spot, kind, cm, outcome, auto }. */
registerDebug('sekiTsuri', (o: { spot?: SekiSpot; kind?: SekiKind; cm?: number; outcome?: SekiOutcome; auto?: boolean } = {}) => {
  const f = field();
  if (!f) return 'field not active';
  qaForce = o.spot || o.kind || o.cm || o.outcome ? { spot: o.spot, kind: o.kind, cm: o.cm, outcome: o.outcome } : undefined;
  qaAuto = !!o.auto;
  setFlag(MZ.seki, 1);
  f.startScript(
    (function* (): Co {
      try {
        yield* sekiSession();
      } finally {
        qaForce = undefined;
        qaAuto = false;
      }
    })(),
  );
  return 'sekiTsuri';
});

/**
 * QA: the 『みずべ』 flags. { book: 1 } opens ①'s section, { all: true } fills ① (every kind seen,
 * a record each), { all2: true } fills ②, { yurai: 'mom' | 'done' }, { reset: true } forgets it all.
 */
registerDebug('mizube', (o: { book?: number; book2?: number; all?: boolean; all2?: boolean; yurai?: 'mom' | 'done'; reset?: boolean } = {}) => {
  if (o.reset) {
    for (const k of Object.keys(state.flags)) if (/^flag_(zukan|mizube|yoburi)_/.test(k) || /^flag_zari_taku_/.test(k)) setFlag(k, 0);
    return 'mizube reset';
  }
  if (o.book !== undefined) setFlag(MZ.book, o.book);
  if (o.book2 !== undefined) setFlag('flag_mizube_book2', o.book2);
  const fill = (vol: 1 | 2) => {
    for (const e of ZUKAN.filter((z) => z.vol === vol && !z.bonus)) {
      if (e.id === 'medaka') setFlag('flag_seen_obj_sb_tank', 1);
      if (e.measure === 'cm' || e.measure === 'tenaga') zukanRecord(e.id, e.id === 'osu' ? 8 : 6, e.id === 'osu' ? 20 : 7);
      else zukanSee(e.id);
    }
  };
  if (o.all) {
    setFlag(MZ.book, 1);
    fill(1);
  }
  if (o.all2) {
    setFlag('flag_mizube_book2', 1);
    fill(2);
  }
  if (o.yurai === 'mom' || o.yurai === 'done') setFlag(YF.mom, 1);
  if (o.yurai === 'done') setFlag(YF.done, 1);
  const out: Record<string, number | boolean> = {};
  for (const e of ZUKAN) out[e.id] = zukanSeen(e.id);
  out.count1 = zukanCount(1)[0];
  out.count2 = zukanCount(2)[0];
  return out;
});
