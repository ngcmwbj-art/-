// つぎの目当て1行（改善会議 2026-10-23 の 4・5）：手帳（フィールドのメニュー）の いちばん上に貼った
// マスキングテープに、本筋で 今 何を すれば いいかを 1行。タイトルの「つづきから」の カードにも 同じ1行。
//
// 文の もとは グソっ君の〔次、どうする？〕（data/text/kn_hint.ts）。段階の 決め方も 同じ物を 使う
// （events/kn_hint.ts の knHintAt が setGoalHint で ここに 渡す）：ヒントの 文 → 下の表 GOAL の キー。
// ヒントの 無い 段階（グソっ君が 仲間に なる 前、場面の 途中、章の 終わり、クリア後）は fallback() が
// 同じ 表の 行を 選ぶ。どの 章・どの 段階でも 1行 出る。
//
// 決まり：1行（GOAL_W 以内）。ネタばれを 書かない（その時点で 分かっている ことだけ）。しるしの「！」は
// 増やさない。第2章の 文に 時刻の 数字・「まだ」・第3章の 中身を 入れない（goalText が 確かめる。
// __game.cmd.wrapCheck() からも 呼ばれる）。
//
// QA（開発サーバーだけ）：__game.cmd.goal()      今の 1行と、その もとの キー
//                         __game.cmd.goalText()  表の 全部の 行の 検査（幅・ことば・ヒントとの 対応）
//                         __game.cmd.touchGoal() スマホ縦の 絵の 下の 1行（空きが あるか・出ているか・字・四角）
//
// スマホ・iPad の 縦（改善会議 2026-10-29 の3）：絵と ボタンの あいだに 空きが あれば、同じ 1行を そこにも
// （engine/touch.ts が 置く。横・iPad 横では 出さない）。しゅんが 歩ける ときだけ（会話・大写し・戦闘・
// メニュー・場面の 途中・タイトルでは 出さない）。

import { game } from '../../engine/game';
import type { Gfx } from '../../engine/gfx';
import { setTouchGoal, touchGoalInfo } from '../../engine/touch';
import { flag, state } from '../../game/state';
import { registerDebug } from '../../debug';
import { field } from '../../world/field';
import { getMapDef } from '../../world/maps';
import { pgBand, pgOn, pgTownOf, type PgBand } from '../../world/postgame';
import { YR_FUSHIGI, YR_ROWS, yrAllDone, yrWindowOpen, type YrRow } from '../../data/text/yarinokoshi';
import { KH_C1, KH_C2, KH_C3 } from '../../data/text/kn_hint';
import { drawTape, textW, UI } from '../window';

/** 今いる所（地図と マス）。タイトルでは セーブの 中身。 */
export interface GoalWhere {
  map: string;
  tx: number;
  ty: number;
}

/** 1行の 幅（手帳の 上の テープ：がま口の 値札と クリア後の 時間帯の 印の あいだ。テープの 左 20px は 小旗、右 8px は 余白）。 */
export const GOAL_W = 184;

type Line = string | ((n: number) => string);

/**
 * 段階 → 1行。c1.・c2.・c3. の キーは グソっ君の ヒント（KH_C1・KH_C2・KH_C3 の 名前）と 同じ。
 * f1.・f2.・f3. は ヒントの 無い 段階（fallback）。しゅんの 手帳の メモの 言い方（おつかいメモと 同じ）。
 */
export const GOAL: Record<string, Line> = {
  // ---- 第1章（10 4.3。グソっ君が 仲間に なる 前は おつかいメモの 順）
  'f1.wake': '1階へ 下りる',
  'f1.errand': '坂を 上って 焼きそば屋へ',
  'f1.wait': 'ひのやで 時間を つぶす',
  'f1.chime': 'ひのやの 前へ',
  'f1.hanko': 'ひのやの おばあと 話す',
  'f1.park': '路地を 抜けて 公園へ',
  'f1.food': '食べものを 持って 公園へ',
  'f1.joined': 'グソっ君と 公園で 話す',
  'c1.ojigi': '北東の 駐車場へ',
  'c1.mall': '駐車場の 奥の モールへ',
  'c1.key': '鍵は 1階の フードコート',
  'c1.nikai': '動く 階段で 2階へ',
  'c1.door': '2階 奥の 迷子センターへ',
  'c1.boss': '迷子センターの 中へ',
  'f1.home': '焼きそばを 持って 帰る',
  // ---- 第2章（50 5.3。時刻の 数字・「まだ」・第3章の 中身を 入れない）
  'f2.go': '星見台へ 向かう',
  'c2.train': '電車の いちばん 前へ',
  'c2.yoriai': '明るい 窓の 集会所へ',
  'c2.house': '西の 斜面の 3号ハウスへ',
  'c2.tomato': 'ハウスの いちばん 奥へ',
  'c2.gen': '坂を 上って 東の 牛舎へ',
  'c2.barn': '牛舎の 見回りを 手伝う',
  'c2.gate': 'マサルに 話す',
  'c2.tetsuya': 'ゲートの 先の 暗い 畑へ',
  'c2.hill': '山道から 星見の 丘へ',
  'c2.hillTop': '丘の 赤い ランプへ',
  'f2.bus': '朝の バスで 帰る',
  /** 章の クリアデータ（タイトルの「つづきから」で 次の 章が 始まる）。 */
  'f.next': '次の 章へ つづく',
  // ---- 第3章（60 5.1〜5.3）
  'c3.tomato': 'ひのやの おばあに トマト',
  'c3.truck': '銀座の 角の ツガオ便へ',
  'c3.truckNap': 'ツガオ便に もう いっぺん',
  'f3.truckGo': 'ツガオ便で 出発',
  'f3.arrive': '港の 町を 歩いて みる',
  'c3.anyOrder': '市場・食堂・海水浴場へ',
  'c3.ichiba.a': '市場の セリ場で 話す',
  'c3.ichiba.b': 'もう いっぺん セリ場へ',
  'c3.ichiba.c': (n) => `符丁の 切れはし あと${n}枚`,
  'c3.ichiba.d': '切れはしを セリ場へ',
  'c3.shokudo.a': '食堂かもめで 話を 聞く',
  'c3.shokudo.b': '常連の 話を 聞く',
  'c3.shokudo.c': 'もう いっぺん 食堂へ',
  'c3.shokudo.himono': '定食の 品：干物屋へ',
  'c3.shokudo.kita': '定食の 品：あぜ道市へ',
  'c3.shokudo.sakana': '定食の 品：市場の 魚',
  'c3.shokudo.any': '定食の 品：町の 人に',
  'c3.shokudo.e': '定食の 品を 食堂へ',
  'c3.umi.a': '海水浴場で 話を 聞く',
  'c3.umi.dive': '港の 階段か 浜から 潜る',
  'c3.umi.give': 'ブレスレットを 返す',
  'c3.umi.lens': '灯台の 光で 波を 起こす',
  'c3.umi.d': '海水浴場へ もどる',
  'c3.itadakimasu': '部品を 持って 食堂へ',
  'c3.siren': 'サイレン塔の てっぺんへ',
  'f3.town': '町の ようすを 見る',
  'c3.trap': '港へ（やり残しは 先に）',
  'c3.aqDoor': '旧水族館の ガラス戸へ',
  'c3.kairo': (n) => `回廊の 伝票 あと${n}枚`,
  'c3.kairoEnd': '回廊の 東の はしへ',
  'c3.diorama': 'ジオラマの 部屋を 見る',
  'c3.shinkai': '奥の 暗い 部屋へ',
  'c3.esa': 'えさの 部屋の ポコシャへ',
  'c3.hall': '大水槽の ホールへ',
  'f3.souko': '倉庫の 中を 見る',
  'c3.soukoDoor': '倉庫の 扉を 調べる',
  'c3.hp': '廊下の 先へ 3人で',
  'f3.toHall': 'ホールへ 向かう',
  'c3.boss': 'ホールの ツガオの とこへ',
  'f3.after': 'みんなの とこへ',
  // ---- クリア後（05_postgame 9章の やり残し。KH_PG_* と 同じ 考え）
  'pg.all': 'のんびり 歩こう',
  'pg.secret': 'みました帳を ツガオ便へ',
  'pg.f1': 'ふしぎは 夕方の 夕鳴町',
  'pg.f2': 'ふしぎは 夜の 星見台',
  'pg.f3': 'ふしぎは 昼の 海ぞいの町',
  'pg.later': (n) => `やり残しは ${BAND_NAME[BANDS[n]]}に`,
  'pg.left': (n) => `やり残し、あと ${n}つ`,
};

const BANDS: PgBand[] = ['asa', 'hiru', 'yu', 'yoru'];
const BAND_NAME: Record<PgBand, string> = { asa: '朝', hiru: '昼', yu: '夕方', yoru: '夜' };

// ================================================================ ヒントの文 → キー

let hintAt: ((w: GoalWhere) => string | null) | null = null;

/** events/kn_hint.ts が 本筋の ヒントの 決め方を 渡す。 */
export function setGoalHint(fn: (w: GoalWhere) => string | null): void {
  hintAt = fn;
}

let keyMap: Map<string, [string, number]> | null = null;

/** グソっ君の ヒントの 文 → [キー, 数]（数の 入る 文は 1〜6 を 先に 作っておく）。 */
function hintKeys(): Map<string, [string, number]> {
  if (keyMap) return keyMap;
  const m = new Map<string, [string, number]>();
  const walk = (pre: string, o: Record<string, unknown>) => {
    for (const [k, v] of Object.entries(o)) {
      if (typeof v === 'string') m.set(v, [pre + k, 0]);
      else if (typeof v === 'function') for (let n = 1; n <= 6; n++) m.set((v as (n: number) => string)(n), [pre + k, n]);
      else if (v && typeof v === 'object') walk(`${pre}${k}.`, v as Record<string, unknown>);
    }
  };
  walk('c1.', KH_C1);
  walk('c2.', KH_C2);
  walk('c3.', KH_C3);
  keyMap = m;
  return m;
}

/** ヒントの 文の キー（「どこからでも」が 前に ついた 文は c3.anyOrder）。 */
function keyOfHint(text: string): [string, number] | null {
  if (text.startsWith(KH_C3.anyOrder + '\n')) return ['c3.anyOrder', 0];
  return hintKeys().get(text) ?? null;
}

// ================================================================ ヒントの 無い 段階

function fallback(): string {
  if (flag('flag_ch3_started')) {
    const s = flag('flag_ch3_stage');
    if (s === 0) return flag('flag_ch3_truck_go') ? 'f3.truckGo' : 'c3.tomato';
    if (s === 1) return flag('flag_ch3_kids') ? 'f3.town' : 'f3.arrive';
    if (s === 2) return 'f3.town';
    if (s === 3) {
      if (flag('flag_ch3_boss_beaten')) return 'f3.after';
      if (flag('flag_ch3_hp_beaten')) return 'f3.toHall';
      if (flag('flag_ch3_tsugao1') && !flag('flag_ch3_ego_night')) return 'f3.souko';
      return 'c3.aqDoor';
    }
    return 'f3.after';
  }
  if (flag('flag_ch2_clear')) return 'f.next';
  if (flag('flag_ch2_started')) {
    if (flag('flag_ch2_boss_beaten')) return 'f2.bus';
    return flag('flag_ch2_prologue_done') ? 'c2.train' : 'f2.go';
  }
  if (flag('flag_clear')) return 'f.next';
  if (flag('flag_boss_beaten')) return 'f1.home';
  if (!flag('flag_errand')) return 'f1.wake';
  if (!flag('flag_met_maruyama') && !flag('flag_chime_stopped')) return 'f1.errand';
  if (!flag('flag_chime_stopped')) return 'f1.wait';
  if (!flag('flag_got_hanko')) return 'f1.chime';
  if (!flag('flag_park_hint')) return 'f1.hanko';
  if (!flag('flag_met_kanenari')) return 'f1.park';
  if (!flag('flag_kanenari_joined')) return 'f1.food';
  return 'f1.joined';
}

// ================================================================ クリア後

/** 1行に おさまる やり残しの 書き方（名前が 長い 行は 数だけ）。 */
function rowLine(r: YrRow, left: number): string {
  for (const t of [`やり残し「${r.name}」`, `「${r.name}」`]) if (textW(t) <= GOAL_W) return t;
  return lineOf('pg.left', left);
}

function pgGoal(w: GoalWhere): [string, string] {
  if (yrAllDone()) return flag('flag_pg_secret') >= 3 ? ['pg.all', lineOf('pg.all')] : ['pg.secret', lineOf('pg.secret')];
  const left = YR_ROWS.filter((r) => !r.done());
  if (!left.length) {
    const ch = YR_FUSHIGI.find((x) => x.ids.some((id) => !flag('flag_' + id)))?.ch ?? 1;
    return [`pg.f${ch}`, lineOf(`pg.f${ch}`)];
  }
  // 今の 時間帯に 遊べる 行（今いる 町の 物を 先に。グソっ君の ヒントの 1つ目と 同じ）
  const band = pgBand();
  const town = pgTownOf(getMapDef(w.map));
  const now = left.filter((r) => yrWindowOpen(r, band));
  if (now.length) {
    const r = now.find((x) => x.town === town) ?? now[0];
    return [`pg.row:${r.id}`, rowLine(r, left.length)];
  }
  const i = BANDS.indexOf(band);
  for (let k = 1; k < BANDS.length; k++) {
    const b = (i + k) % BANDS.length;
    if (left.some((r) => r.band === BANDS[b])) return ['pg.later', lineOf('pg.later', b)];
  }
  return ['pg.left', lineOf('pg.left', left.length)];
}

// ================================================================ 入口

function lineOf(key: string, n = 0): string {
  const l = GOAL[key];
  return typeof l === 'function' ? l(n) : (l ?? '');
}

/** 今の つぎの目当て [キー, 1行]。w：今いる所（省くと フィールドの しゅんの 所）。 */
export function goalAt(w?: GoalWhere): [string, string] {
  const f = field();
  const at = w ?? (f ? { map: f.map.id, tx: f.player.tileX, ty: f.player.tileY } : { map: state.map, tx: state.x, ty: state.y });
  if (pgOn()) return pgGoal(at);
  const h = hintAt?.(at) ?? null;
  const k = h ? keyOfHint(h) : null;
  if (k && GOAL[k[0]]) return [k[0], lineOf(k[0], k[1])];
  const fb = fallback();
  return [fb, lineOf(fb)];
}

/** 今の つぎの目当て（1行）。 */
export function goalLine(w?: GoalWhere): string {
  return goalAt(w)[1];
}

// ================================================================ 手帳の 上の テープ

/** テープの 左はし・右はし（がま口の 値札の 右・時計の 札と クリア後の 時間帯の 印の 左）。 */
const TAPE_X0 = 94;
const TAPE_X1 = 306;

/** 朱の 小旗（さお 1px × 11、旗 5×4）。x, y：さおの 上。つづきからの カードでも 使う。 */
export function drawGoalFlag(g: Gfx, x: number, y: number): void {
  g.rect(x, y, 1, 11, UI.pencil);
  g.rect(x + 1, y, 5, 4, UI.accent);
  g.rect(x + 1, y + 4, 3, 1, UI.accent);
}

/**
 * 手帳の 上の ふちに 貼った マスキングテープ（ページの 見出しと 同じ テープ、薄い 黄）。左に 朱の 小さな
 * 旗（「！」の しるしとは 別の 形）、その 右に 1行。dx・alpha：手帳と いっしょに すべる・消える。
 */
export function drawGoalTape(g: Gfx, text: string, dx: number, alpha: number): void {
  if (!text) return;
  const w = Math.min(TAPE_X1 - TAPE_X0, textW(text) + 28);
  const x = TAPE_X0 + dx;
  const y = 2;
  g.alpha(alpha, () => {
    g.rect(x + 2, y + 3, w - 2, 16, UI.night, 0.3);
    drawTape(g, x, y, w, 18, '', { color: '#F6E7B0', seed: 23 });
    drawGoalFlag(g, x + 9, y + 4);
    g.text(text, x + 20, y + 1, { color: UI.text });
  });
}

// ================================================================ QA

/** 表の 全部の 行：幅、第2章の ことば、「まだ」と「！」、ヒントの 文が どれも 表に あるか。 */
export function goalText(): { pages: number; bad: string[] } {
  const bad: string[] = [];
  let pages = 0;
  const check = (key: string, t: string) => {
    pages++;
    if (!t) bad.push(`${key}: 空`);
    if (textW(t) > GOAL_W) bad.push(`${key}: ${textW(t)}px > ${GOAL_W}: ${t}`);
    if (t.includes('\n')) bad.push(`${key}: 2行: ${t}`);
    if (/まだ|[！!]/.test(t)) bad.push(`${key}: 「まだ」か「！」: ${t}`);
    // 第2章：時刻の 数字・第3章の 中身（海・港・ツガオ…）を 入れない
    if (/^(c2|f2)\./.test(key) && (/\d+[:：時]|[0-9０-９]+分/.test(t) || /海|港|ツガオ|水族館|魚|灯台/.test(t))) bad.push(`${key}: 第2章に 時刻か 第3章の ことば: ${t}`);
  };
  for (const [k, l] of Object.entries(GOAL)) {
    if (typeof l === 'string') check(k, l);
    else for (const n of k === 'pg.later' ? [0, 1, 2, 3] : k === 'pg.left' ? [1, 9, 45] : [1, 2, 3, 4, 6]) check(`${k}(${n})`, l(n));
  }
  // グソっ君の ヒントの 文は どれも 表の 行に なる（食いちがいを 作らない）
  for (const [, [k]] of hintKeys()) if (!GOAL[k]) bad.push(`ヒント ${k}: 表に 行が ない`);
  // クリア後の やり残しの 行（名前の 長い 行は 数だけに なる）
  for (const r of YR_ROWS) check(`pg.row:${r.id}`, rowLine(r, 45));
  return { pages, bad };
}

// スマホ縦の 絵の 下の 1行：フィールドで しゅんが 歩ける ときだけ
setTouchGoal(() => {
  const f = field();
  if (!f || game.top !== f || !f.controllable || game.ui.widgets.some((w) => w.closeup === true && !w.done)) return null;
  return goalLine() || null;
});

if (import.meta.env.DEV) {
  registerDebug('touchGoal', () => touchGoalInfo());
  registerDebug('goal', () => {
    const [key, line] = goalAt();
    return { key, line, w: textW(line) };
  });
  registerDebug('goalText', () => goalText());
}
