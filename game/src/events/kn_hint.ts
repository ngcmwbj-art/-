// 隊列のグソっ君に話しかけると、本筋の「次にすること」を教えてくれる（2026-10-15 依頼主の指示、fix1015 G3）。
//
// 話しかけると〔次、どうする？｜おしゃべり〕。「おしゃべり」は今までの台本（地図ごとの kanenari_<map>：
// 場所のひとこと・いつもの・寄り道・クリア後の会話）を そのまま通す。ヒントが無いとき（場面の途中・
// エンディングのあいだ）は、選択を出さずに今までどおり。寄り道の山場の前（屋上の握手、天文台の目の前の物、
// 店に もどる？、シークレットの見たあと）も、選択を出さずに前の台本へ。
//
// 何を教えるか（文は data/text/kn_hint.ts）：
//   第1章：仲間になって放送のあと → おじぎ自販機 → モール → 鍵 → 2階 → 扉 → 迷子センター（10 4.3）
//   第2章：電車 → 集会所 → 3号ハウス → トマト → 牛舎 → ゲート → テツヤ → 丘（50 5.3）
//   第3章：S01〜S04 の夕鳴町、①〜③（どの順でも。まだの所。今いる所の物を先に）、S11〜S14、
//          旧水族館 S15〜S20、倉庫と廊下（ヤキソバンも ひとこと）、決戦の前（60 5.1・5.3）
//   クリア後：今の時間帯に遊べる やり残しを1つ（data/text/yarinokoshi.ts。話すたびに次の行）
//
// 地図ごとの台本を包むので、ほかの包み（pg_talk・pg_secret）の あとに import する（events/index.ts）。
//
// 行き先のしるし（改善会議 2026-10-20 の 1）：ヒントを聞いたあと、その行き先の人・扉・物の上に
// 小さな「！」（world/marks.ts の きらりと同じ印）。下の DEST がヒントの文ごとの行き先。ヒントの文が
// 変わったら（その段階が進んだら）消える。別の地図のときは、その地図への扉に出す（その地図へ じかに
// 行ける扉が 今の地図に あるときだけ）。行き先の分からない段階（数で変わる文・部屋の中の細かい所）は出さない。
// 最初に1回だけ、グソっ君が「迷ったら、わいに 聞いてや。」（KH_TOLD：第1章 迷子のお知らせのあと、
// 第2章 星見台に着いたあと、第3章 子どもたちのあと の どれか最初の1回。flag_kn_hint_told）。
//
// QA（開発サーバーだけ）：__game.cmd.knHint()  今のヒントの文（無ければ null）
//                         __game.cmd.knMark()  今の行き先のしるし（聞いたヒント、地図、印の所）

import type { Co } from '../engine/co';
import { flag, setFlag, state } from '../game/state';
import { registerDebug } from '../debug';
import { registerScript } from '../world/api';
import { getScript, type ScriptCtx } from '../world/scripts';
import { condOk, getMapDef, mapIds } from '../world/maps';
import { field, type FieldScene } from '../world/field';
import { faceToward } from '../world/interact';
import { pgBand, pgOn, pgTownOf, type PgBand } from '../world/postgame';
import { YR_FUSHIGI, YR_ROWS, yrAllDone, yrWindowOpen } from '../data/text/yarinokoshi';
import { KH_ASK, KH_C1, KH_C2, KH_C3, KH_PG_ALL, KH_PG_SECRET, KH_TOLD, khPgFushigi, khPgRow } from '../data/text/kn_hint';
import { actorAnchor, doorAnchor, objAnchor, setHintMarkSource, type MarkAnchor } from '../world/marks';
import type { DoorObj, ExamineObj, NpcObj } from '../world/types';
import { c3Stage, inCh3, kita, partsDone, say3 } from './ch3/common';
import { pgAtShop, pgKnWith } from './postgame';

const seen = (npc: string, key = 'c1_1'): boolean => flag(`flag_seen_${npc}_${key}`) > 0;

// ================================================================ 第1章

function c1Hint(): string | null {
  if (!flag('flag_kanenari_joined') || !flag('flag_broadcast') || flag('flag_boss_beaten')) return null;
  if (!flag('flag_ojigi_beaten')) return KH_C1.ojigi;
  if (!flag('flag_mall_entered')) return KH_C1.mall;
  if (!flag('flag_got_maigo_key')) return KH_C1.key;
  if (!flag('flag_soujirou_gate') && !state.taken['sym_mall_2f_01']) return KH_C1.nikai;
  if (!flag('flag_maigo_door_open')) return KH_C1.door;
  return KH_C1.boss;
}

// ================================================================ 第2章

function c2Hint(f: FieldScene): string | null {
  if (flag('flag_ch2_boss_beaten')) return null;
  if (!flag('flag_ch2_arrived')) return flag('flag_ch2_prologue_done') ? KH_C2.train : null;
  if (!flag('flag_ch2_yoriai')) return KH_C2.yoriai;
  if (!flag('flag_ch2_met_mitsu')) return KH_C2.house;
  if (!flag('flag_ch2_got_tomato')) return KH_C2.tomato;
  if (!flag('flag_ch2_met_gen')) return KH_C2.gen;
  if (!flag('flag_ch2_got_otsukare')) return KH_C2.barn;
  if (!flag('flag_ch2_gate_open')) return KH_C2.gate;
  if (!flag('flag_ch2_tetsuya_beaten')) return KH_C2.tetsuya;
  return f.map.id === 'map_hoshi_hill' ? KH_C2.hillTop : KH_C2.hill;
}

// ================================================================ 第3章

type Part = 'ichiba' | 'shokudo' | 'umi';

const PART_DONE: Record<Part, string> = { ichiba: 'flag_ch3_ichiba_done', shokudo: 'flag_ch3_shokudo_done', umi: 'flag_ch3_umi_done' };

/** その場所の話を、もう始めているか（主役の人と話した）。 */
function partStarted(p: Part): boolean {
  if (p === 'ichiba') return !!flag('flag_ch3_ichiba_start') || seen('npc_c3_seri_deshi');
  if (p === 'shokudo') return !!flag('flag_ch3_shokudo_start') || !!flag('flag_ch3_goro_honne') || seen('npc_c3_shokudo') || seen('npc_c3_jouren');
  return !!flag('flag_ch3_kaisui_start') || seen('npc_c3_mago') || seen('npc_c3_kanshiin');
}

/** 今いる所が、その場所か（市場・食堂の中、灯台・海の家、海水浴場のあたり）。 */
function partHere(p: Part, f: FieldScene): boolean {
  const m = f.map.id;
  if (p === 'ichiba') return m === 'map_c3_ichiba';
  if (p === 'shokudo') return m === 'map_c3_shokudo';
  return m === 'map_c3_toudai' || m === 'map_c3_uminoie' || (m === 'map_umizoi' && f.player.tileX >= 50 && f.player.tileY >= 26);
}

function ichibaHint(): string {
  // (fix1020c3: one talk with ゲン or ツグミ starts it, so there is no 「もう いっぺん」 step)
  if (!flag('flag_ch3_ichiba_start')) return KH_C3.ichiba.a;
  const n = flag('flag_ch3_fucho_n');
  return n < 3 ? KH_C3.ichiba.c(3 - n) : KH_C3.ichiba.d;
}

/** あぜ道市に来た人のうち、定食の品を持ってきた人（azemichi.ts の DISH）。 */
const KITA_DISH: [string, string][] = [
  ['npc_mamekichi', 'tofu'],
  ['npc_hoshi_mitsu', 'tomato'],
  ['npc_master', 'coffee'],
];

function shokudoHint(): string {
  const S = KH_C3.shokudo;
  if (!flag('flag_ch3_shokudo_start')) {
    if (!seen('npc_c3_shokudo')) return S.a;
    if (!flag('flag_ch3_goro_honne')) return S.b;
    return S.c;
  }
  // ①の魚は、ナミエに話すと品になる（shokudo.ts talkNamie）
  const dishes = flag('flag_ch3_teishoku_n') + (flag('flag_ch3_ichiba_done') && !flag('flag_ch3_teishoku_sakana') ? 1 : 0);
  if (dishes >= 2) return S.e;
  const n = 2 - dishes;
  if (!flag('flag_ch3_himono_hodo')) return S.himono(n);
  if (KITA_DISH.some(([id, d]) => kita(id) && !flag(`flag_ch3_teishoku_${d}`))) return S.kita(n);
  if (!flag('flag_ch3_ichiba_done')) return S.sakana(n);
  return S.any(n);
}

function umiHint(): string {
  const U = KH_C3.umi;
  if (!flag('flag_ch3_kaisui_start')) return U.a;
  if (!flag('flag_ch3_bracelet_given')) return state.inventory.includes('item_c3_bracelet') ? U.give : U.dive;
  if (flag('flag_ch3_lens_n') < 3) return U.lens;
  return U.d;
}

const PART_HINT: Record<Part, () => string> = { ichiba: ichibaHint, shokudo: shokudoHint, umi: umiHint };

/** ①〜③：まだの所の次の一歩（今いる所 → 始めた所 → 地図の順）。どれも始めていなければ「どこからでも」を先に。 */
function partsHint(f: FieldScene): string {
  const left = (['ichiba', 'shokudo', 'umi'] as Part[]).filter((p) => !flag(PART_DONE[p]));
  const pick = left.find((p) => partHere(p, f)) ?? left.find(partStarted) ?? left[0];
  const hint = PART_HINT[pick]();
  const fresh = partsDone() === 0 && !left.some(partStarted);
  return fresh ? `${KH_C3.anyOrder}\n${hint}` : hint;
}

function c3Hint(f: FieldScene): string | null {
  const s = c3Stage();
  if (s === 0) {
    if (!flag('flag_ch3_prologue_done') || flag('flag_ch3_truck_go')) return null;
    if (!flag('flag_ch3_tomato_given')) return KH_C3.tomato;
    return flag('flag_ch3_truck_wait') ? KH_C3.truckNap : KH_C3.truck;
  }
  if (s === 1) {
    if (!flag('flag_ch3_kids')) return null;
    if (partsDone() < 3) return partsHint(f);
    if (!flag('flag_ch3_got_itadakimasu')) return KH_C3.itadakimasu;
    return flag('flag_ch3_nariosame_beaten') ? null : KH_C3.siren;
  }
  if (s === 2) {
    if (!flag('flag_ch3_got_gochisou')) return null;
    if (!flag('flag_ch3_truck_trap')) return KH_C3.trap;
    return flag('flag_ch3_aq_enter') ? null : KH_C3.aqDoor;
  }
  if (s === 3) {
    if (!flag('flag_ch3_aq_enter')) return KH_C3.aqDoor;
    if (!flag('flag_ch3_kairo_done')) {
      const n = flag('flag_ch3_denpyo_n');
      return n < 4 ? KH_C3.kairo(4 - n) : KH_C3.kairoEnd;
    }
    if (!flag('flag_ch3_diorama_done')) return KH_C3.diorama;
    if (!flag('flag_ch3_shinkai_done')) return KH_C3.shinkai;
    if (!flag('flag_ch3_esa_done')) return KH_C3.esa;
    if (!flag('flag_ch3_tsugao1')) return KH_C3.hall;
    // S21・S22 は場面のまま（倉庫の夜）。S25 も自動
    if (!flag('flag_ch3_ego_night')) return null;
    if (!flag('flag_ch3_yakisoban')) return KH_C3.soukoDoor;
    if (!flag('flag_ch3_hp_beaten')) return KH_C3.hp;
    if (!flag('flag_ch3_minna')) return null;
    return flag('flag_ch3_boss_beaten') ? null : KH_C3.boss;
  }
  return null;
}

// ================================================================ クリア後

const BANDS: PgBand[] = ['asa', 'hiru', 'yu', 'yoru'];

function pgHint(f: FieldScene, advance: boolean): string | null {
  if (!pgKnWith()) return null;
  if (yrAllDone()) return flag('flag_pg_secret') >= 3 ? KH_PG_ALL : KH_PG_SECRET;
  const left = YR_ROWS.filter((r) => !r.done());
  if (!left.length) {
    const ch = YR_FUSHIGI.find((x) => x.ids.some((id) => !flag('flag_' + id)))?.ch;
    return ch ? khPgFushigi(ch) : null;
  }
  // 話すたびに次の行（数えるのは、ヒントを選んだときだけ）
  const n = flag('flag_kn_hint_pg');
  if (advance) setFlag('flag_kn_hint_pg', n + 1);
  const band = pgBand();
  const town = pgTownOf(f.map.def);
  // 今の時間帯に遊べる行（今いる町の物を先に）
  const now = left.filter((r) => yrWindowOpen(r, band));
  if (now.length) {
    const sorted = [...now.filter((r) => r.town === town), ...now.filter((r) => r.town !== town)];
    const r = sorted[n % sorted.length];
    return khPgRow(r, null, r.town !== town);
  }
  // 今は無い：次の時間帯の物
  const i = BANDS.indexOf(band);
  for (let k = 1; k < BANDS.length; k++) {
    const b = BANDS[(i + k) % BANDS.length];
    const cand = left.filter((r) => r.band === b);
    if (cand.length) return khPgRow(cand[n % cand.length], b, false);
  }
  return null;
}

// ================================================================ 入口

/** 今のヒント（隊列のグソっ君の文）。無いときは null。advance：クリア後の行を次へ送る（ヒントを選んだとき）。 */
export function knHint(advance = false): string | null {
  const f = field();
  if (!f) return null;
  if (pgOn()) return pgHint(f, advance);
  if (inCh3()) return c3Hint(f);
  if (flag('flag_ch3_started')) return null;
  if (flag('flag_ch2_started')) return c2Hint(f);
  return c1Hint();
}

/** 前の台本を先に通す場面（寄り道の山場・店にもどる・見たあとの1ページ・天文台の目の前の物）。 */
function passThrough(f: FieldScene, m: string): boolean {
  if (pgOn() && flag('flag_pg_secret') === 3 && !flag('flag_pg_secret_after_k')) return true;
  if (pgKnWith() && pgAtShop()) return true;
  if (m === 'map_mall_roof' && flag('flag_roof_note') && !flag('flag_roof_handshake')) return true;
  if (m === 'map_hoshi_dome') {
    const [tx, ty] = f.facingTile();
    const o = f.objectAt(tx, ty, f.player.dir);
    if (o && getScript(o.script ?? o.id)) return true;
  }
  return false;
}

for (const m of mapIds()) {
  const before = getScript('kanenari_' + m);
  registerScript('kanenari_' + m, function* (ctx: ScriptCtx): Co {
    const old = function* (): Co {
      if (before) yield* before(ctx);
      else yield* ctx.runDefault();
    };
    const f = field();
    const hint = f && !passThrough(f, m) ? knHint() : null;
    if (!f || !hint) {
      yield* old();
      return;
    }
    if (f.follower) faceToward(f.follower, f.player);
    const i = yield* say3(KH_ASK);
    if (i === 0) {
      const said = knHint(true) ?? hint;
      yield* say3(said);
      asked = said;
    } else yield* old();
  });
}

// ================================================================ 行き先のしるし

/** 行き先の1つ：人（npc・sym の id）、物（obj）、扉（door）、マス（tile：左上、w マス幅）。 */
type MarkAt = { npc: string } | { obj: string } | { door: string } | { tile: [number, number]; w?: number };
/** 地図ごとの行き先（'*'：今の地図に その人が いれば）。前に書いた物が先。 */
type Dest = [map: string, at: MarkAt][];

/** ヒントの文 → 行き先。 */
const DEST = new Map<string, Dest>([
  // 第1章（10 4.3）
  [KH_C1.ojigi, [['map_town', { npc: 'sym_town_07' }]]],
  [KH_C1.mall, [['map_town', { door: 'door_town_mall' }]]],
  [KH_C1.key, [['map_mall_food', { obj: 'obj_kaitenyaki' }], ['map_town', { door: 'door_town_mall' }]]],
  [KH_C1.nikai, [['map_mall_2f', { npc: 'sym_mall_2f_01' }], ['map_mall_health', { door: 'door_m3_m4_escalator' }]]],
  [KH_C1.door, [['map_mall_2f', { obj: 'obj_maigo_door' }], ['map_mall_health', { door: 'door_m3_m4_escalator' }]]],
  [KH_C1.boss, [['map_mall_2f', { door: 'door_m4_m5' }], ['map_mall_health', { door: 'door_m3_m4_escalator' }]]],
  // 第2章（50 5.3）
  [KH_C2.train, [['map_hoshi_train', { tile: [14, 3], w: 2 }]]],
  [KH_C2.yoriai, [['map_hoshimidai', { door: 'door_hoshi_school' }]]],
  [KH_C2.house, [['map_hoshimidai', { npc: 'npc_hoshi_mitsu' }]]],
  [KH_C2.tomato, [['map_hoshi_house', { obj: 'obj_hoshi_hanamaru' }], ['map_hoshimidai', { door: 'door_hoshi_house' }]]],
  [KH_C2.gen, [['map_hoshimidai', { npc: 'npc_hoshi_gen' }]]],
  [KH_C2.barn, [['map_hoshimidai', { door: 'door_hoshi_barn' }]]],
  [KH_C2.gate, [['*', { npc: 'npc_hoshi_gen' }], ['map_hoshimidai', { door: 'door_hoshi_barn' }]]],
  [KH_C2.tetsuya, [['map_hoshimidai', { npc: 'sym_hoshi_07' }]]],
  [KH_C2.hill, [['map_hoshimidai', { door: 'door_hoshi_hill' }]]],
  // 第3章（60 5.1〜5.3）
  [KH_C3.tomato, [['map_hinoya', { npc: 'npc_obaa' }]]],
  [KH_C3.truck, [['map_town', { npc: 'c3_truck' }]]],
  [KH_C3.truckNap, [['map_town', { npc: 'c3_truck' }]]],
  // (fix1020c3: ゲン or ツグミ, either starts it — ツグミ first, ゲン if she can't be seen)
  [KH_C3.ichiba.a, [['*', { npc: 'npc_c3_seri_deshi' }], ['*', { npc: 'npc_c3_seri' }]]],
  [KH_C3.ichiba.d, [['*', { npc: 'npc_c3_seri_deshi' }], ['*', { npc: 'npc_c3_seri' }]]],
  [KH_C3.shokudo.a, [['*', { npc: 'npc_c3_shokudo' }]]],
  [KH_C3.shokudo.b, [['*', { npc: 'npc_c3_jouren' }]]],
  [KH_C3.shokudo.c, [['*', { npc: 'npc_c3_shokudo' }]]],
  [KH_C3.shokudo.e, [['*', { npc: 'npc_c3_shokudo' }]]],
  [KH_C3.umi.a, [['*', { npc: 'npc_c3_mago' }]]],
  [KH_C3.umi.give, [['*', { npc: 'npc_c3_mago' }]]],
  [KH_C3.umi.lens, [['*', { npc: 'npc_c3_toudai' }], ['map_umizoi', { door: 'door_c3_toudai' }]]],
  [KH_C3.umi.d, [['*', { npc: 'npc_c3_mago' }]]],
  [KH_C3.siren, [['map_umizoi', { door: 'door_c3_siren' }]]],
  [KH_C3.aqDoor, [['map_c3_misaki', { door: 'door_c3_aq' }]]],
  [KH_C3.kairoEnd, [['*', { npc: 'npc_hirosuke' }]]],
  [KH_C3.esa, [['*', { npc: 'npc_pokosha' }]]],
]);

/** 聞いたヒントの文（その文が今のヒントの あいだ、しるしを出す）。 */
let asked: string | null = null;

/** 「どこからでも」を前につけた文は、その後ろの文で引く。 */
function destOf(text: string): Dest | undefined {
  const pre = KH_C3.anyOrder + '\n';
  return DEST.get(text.startsWith(pre) ? text.slice(pre.length) : text);
}

/** その人が その地図に いて、見えているか。 */
function actorHere(f: FieldScene, id: string): MarkAnchor | null {
  const a = f.actorById(id);
  if (!a || !a.visible || f.light.actorAlpha(a) < 0.5) return null;
  return actorAnchor(a);
}

function resolve(f: FieldScene, at: MarkAt): MarkAnchor | null {
  if ('npc' in at) return actorHere(f, at.npc);
  if ('tile' in at) {
    const [x, y] = at.tile;
    const foot = (y + 1) * 16;
    return { x: (x + (at.w ?? 1) / 2) * 16, y: foot - 30, foot };
  }
  const id = 'obj' in at ? at.obj : at.door;
  const o = f.map.objects.find((m) => m.id === id && (m.t === 'obj' || m.t === 'door') && f.objOk(m));
  if (!o) return null;
  return o.t === 'obj' ? objAnchor(f, o as ExamineObj) : doorAnchor(o as DoorObj);
}

/** その人の いる地図（'*' の人：今の段階で いる地図が1つだけのとき）。 */
function homeOf(id: string): string | null {
  const maps = mapIds().filter((m) => getMapDef(m)?.objects.some((o) => o.t === 'npc' && (o as NpcObj).id === id && condOk(o.cond)));
  return maps.length === 1 ? maps[0] : null;
}
const homeCache = new Map<string, string | null>();

/** 今の地図の、行き先の地図へ じかに行ける扉。 */
function doorTo(f: FieldScene, maps: string[]): MarkAnchor | null {
  for (const m of maps) {
    const d = f.map.objects.find((o) => o.t === 'door' && (o as DoorObj).to === m && f.objOk(o)) as DoorObj | undefined;
    if (d) return doorAnchor(d);
  }
  return null;
}

let lastMark: { map: string; at: MarkAnchor } | null = null;

function hintMarkAt(f: FieldScene): MarkAnchor | null {
  lastMark = null;
  if (!asked) return null;
  // the hint moved on (its stage done, or another chapter): the mark is gone till he is asked again
  if (knHint() !== asked) {
    asked = null;
    homeCache.clear();
    return null;
  }
  const dest = destOf(asked);
  if (!dest) return null;
  const m = f.map.id;
  for (const [map, at] of dest) {
    if (map !== m && map !== '*') continue;
    const r = resolve(f, at);
    if (r) {
      lastMark = { map: m, at: r };
      return r;
    }
  }
  // another map: the door to it, if there is one here
  const maps: string[] = [];
  for (const [map, at] of dest) {
    if (map !== '*') maps.push(map);
    else if ('npc' in at) {
      if (!homeCache.has(at.npc)) homeCache.set(at.npc, homeOf(at.npc));
      const h = homeCache.get(at.npc);
      if (h) maps.push(h);
    }
  }
  const r = doorTo(f, maps.filter((x) => x !== m));
  if (r) lastMark = { map: m, at: r };
  return r;
}

setHintMarkSource(hintMarkAt);

// ================================================================ 最初に1回だけ「迷ったら、わいに 聞いてや。」

/** ヒントが聞けるように なった場面の あと（どれか最初の1回）。 */
for (const id of ['evt_maigo_broadcast', 'evt_ch2_arrive', 'evt_ch3_kids']) {
  const before = getScript(id);
  if (!before) continue;
  registerScript(id, function* (ctx: ScriptCtx): Co {
    yield* before(ctx);
    const f = field();
    if (flag('flag_kn_hint_told') || !f || !f.follower || !knHint()) return;
    setFlag('flag_kn_hint_told', 1);
    faceToward(f.follower, f.player);
    yield* say3(KH_TOLD);
  });
}

if (import.meta.env.DEV) {
  registerDebug('knHint', (adv?: boolean) => knHint(!!adv));
  /** 今の行き先のしるし。ask：今のヒントを聞いたことにする（QA）。 */
  registerDebug('knMark', (ask?: boolean) => {
    if (ask) asked = knHint();
    const f = field();
    if (f) hintMarkAt(f);
    return { asked, has: !!asked && !!destOf(asked), mark: lastMark ? { map: lastMark.map, at: [Math.round(lastMark.at.x), Math.round(lastMark.at.y)] } : null };
  });
}
