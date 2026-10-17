// クリア後の人の配置（05 4.2）：pgSchedule。
//
// 1人ずつ、時間帯ごとに「どこにいるか／いないか」。クリア後は、地図の物の cond より
// この表が勝つ（field.ts refreshPresence → postgame.ts pgObjPresent）。
//
// 第1期は下じきだけ：段階のフラグ（postgame.ts applyPgStages）で、
//   夕鳴町 夕方 = 第1章の段階2、星見台 夜 = h1、海ぞいの町 = 段階4、夕鳴町 朝 = 今のクリア後
// がそのまま出る。ここでは、それだけでは足りない所を書く：
//   - 夕鳴町 昼 = 第3章の段階0（62 5.1）の背景の人（c3_hm_* の買い物の人・猫。話せる人とハトは表の本人）
//   - ツガオ便の止まる所（8.1）と重なる第1章の軽トラ、第2章の運転席のツガオは出さない
//   - 敵のシンボルは出さない（5.3）
// 人ごとの表（PG_SCHEDULE）は第2期（夕鳴町・星見台・海ぞいの町の外の人。部屋の人は下じき）。

import type { MapObj } from './types';
import { flag } from '../game/state';
import { pgBand, pgOn, pgTruckKind, setPgScheduleImpl, type PgBand, type PgSpot } from './postgame';
import { getMapDef } from './maps';
import { registerWorldFx } from './fx';

const at = (map: string, x: number, y: number, dir?: PgSpot['dir']): PgSpot => ({ map, x, y, ...(dir ? { dir } : {}) });

/**
 * 人ごとの表（05 4.2）：id → 帯ごとの居場所（null = いない＝家・寝ている・仕事。書いていない帯は下じき）。
 * 下じき：夕鳴町の夕方は第1章の段階2、星見台の夜は h1、部屋の中の人（店の主・家の人）はどの帯も家にいる。
 * 居場所はその人の物がある地図に限る（その地図の、同じ座標の物、なければ最初の物がそこへ動く）。
 * 第2章の表の寄り道の相手は、窓の帯にその場所にいる（夕方は下じきのまま）。
 * E の会話（data/text/pg_talk.ts の pa/ph/py/pn）を書いた帯には、その人がいるようにしてある。
 */
export const PG_SCHEDULE: Record<string, Partial<Record<PgBand, PgSpot | null>>> = {
  // ================================================ 夕鳴町（朝・昼・夜。夕方は第1章の段階2のまま）
  // 朝：水まき、ベンチのおじいさん、犬の散歩、くま吉の店先、郵便屋、駅へ向かう中学生と高校生、猫
  npc_mizumaki: { asa: at('map_town', 11, 32), hiru: at('map_town', 11, 32), yoru: null },
  npc_ojii: { asa: at('map_town', 10, 21), hiru: at('map_town', 10, 21), yoru: null },
  npc_madam: { asa: at('map_town', 17, 22), hiru: at('map_town', 17, 22), yoru: null },
  npc_kotaro: { asa: at('map_town', 16, 22), hiru: at('map_town', 16, 22), yoru: null },
  npc_mamekichi: { asa: at('map_town', 36, 20), hiru: at('map_town', 36, 20), yoru: null },
  npc_postman: { asa: at('map_town', 46, 24), hiru: at('map_town', 46, 24), yoru: null },
  npc_chugaku: { asa: at('map_town', 3, 18), hiru: null, yoru: null },
  npc_jk: { asa: at('map_town', 57, 23), hiru: null, yoru: null },
  npc_cat_sauce: { asa: at('map_town', 15, 24), hiru: null, yoru: at('map_town', 15, 24) },
  npc_cat_mike: { asa: null, hiru: null, yoru: null },
  // 昼：学校の子はいない（62 5.1）。夕方だけの人（第1章の段階2の寄り道の相手）は昼・朝・夜はいない
  npc_sae: { asa: at('map_town', 14, 11), hiru: null, yoru: null },
  npc_sand_girl: { asa: null, hiru: at('map_town', 22, 9), yoru: null },
  npc_gacha_boy: { asa: null, hiru: at('map_town', 31, 23), yoru: null },
  // ハト：朝・昼は銀座で えさを つつく（昼の背景の c3_hm_hato の代わり）
  npc_hato: { asa: at('map_town', 33, 22), hiru: at('map_town', 33, 22), yoru: null },
  npc_tamotsu: { asa: at('map_town', 21, 39), hiru: null, yoru: null },
  npc_maru: { asa: null, hiru: null, yoru: null },
  npc_crow: { asa: null, hiru: null, yoru: null },
  npc_shadow_man: { asa: null, hiru: null, yoru: null },
  // 喫茶のぶーさん：昼すぎから夕方まで（減らない コーヒー）
  npc_bu_body: { asa: null, hiru: at('map_cafe', 9, 4), yoru: null },
  // 焼きそばのたかしのグソっ君（合流していないとき。条件は after.ts）：朝・昼・夕方は店の前、夜は店の中
  // 部屋の人（店の主・家の人）は表に書かない：どの帯も家（下じき）

  // ================================================ 星見台（朝・昼・夕方。夜は第2章の h1 のまま）
  npc_hoshi_mitsu: { asa: at('map_hoshimidai', 3, 32), hiru: at('map_hoshimidai', 3, 32), yu: at('map_hoshimidai', 3, 32) },
  npc_hoshi_tome: { asa: at('map_hoshimidai', 21, 11), hiru: at('map_hoshimidai', 21, 11), yu: at('map_hoshimidai', 21, 11) },
  // マサル：朝と夕方は牛舎（えさの時間）、昼は上の畑
  npc_hoshi_gen: { asa: at('map_hoshi_barn', 20, 6), hiru: at('map_hoshimidai', 50, 19), yu: at('map_hoshi_barn', 20, 6) },
  npc_hoshi_gon: { asa: at('map_hoshimidai', 53, 33), hiru: at('map_hoshimidai', 53, 33), yu: at('map_hoshimidai', 53, 33) },
  // バスの運転手：朝と夕方のバスの時間だけ
  npc_hoshi_busdriver: { asa: at('map_hoshimidai', 36, 40), hiru: null, yu: at('map_hoshimidai', 36, 40) },
  // まつ先生：朝・昼は分校、夕方は村の道
  npc_hoshi_fumi: { asa: at('map_hoshi_school', 9, 3), hiru: at('map_hoshi_school', 9, 3), yu: at('map_hoshimidai', 33, 30) },
  // ポコシャ：昼は旧水族館（海ぞいの町、c3_poko_c4）。夜は転回場で荷を積む（h1 のまま）
  npc_pokosha: { asa: null, hiru: null, yu: null },
  // ヒロスケ：朝・夕方は星見台の転回場、昼は海ぞいの港で焼き芋（c3_hiro_c4）。夜は軽トラのそば（h1 のまま）
  npc_hirosuke: { asa: at('map_hoshimidai', 43, 43), hiru: null, yu: at('map_hoshimidai', 43, 43) },

  // ================================================ 海ぞいの町（第3章の段階4の上に、町 × 帯）
  c3_hiro_c4: { asa: null, hiru: at('map_umizoi', 22, 16), yu: null, yoru: null },
  // 旧水族館：開館の準備（9:00〜16:59。帯では朝・昼・夕方）
  c3_poko_c4: { asa: at('map_c3_aq_iriguchi', 6, 9), hiru: at('map_c3_aq_iriguchi', 6, 9), yu: at('map_c3_aq_iriguchi', 6, 9), yoru: null },
  c3_ego_c4: { asa: at('map_c3_aq_iriguchi', 9, 5), hiru: at('map_c3_aq_iriguchi', 9, 5), yu: at('map_c3_aq_iriguchi', 9, 5), yoru: null },
  npc_c3_uketsuke: { asa: at('map_umizoi', 73, 30), hiru: at('map_umizoi', 73, 30), yu: null, yoru: null },
  // 干物屋の夫婦：朝から夕方まで店先
  npc_c3_himono_otto: { asa: at('map_umizoi', 17, 14), hiru: at('map_umizoi', 17, 14), yu: at('map_umizoi', 17, 14), yoru: null },
  npc_c3_himono_tsuma: { asa: at('map_umizoi', 19, 14), hiru: at('map_umizoi', 19, 14), yu: at('map_umizoi', 19, 14), yoru: null },
  // 食堂かもめ：朝はのれんを出す、昼・夕方は店の中、夜は片づけ（05 4.2）
  npc_c3_shokudo: { asa: at('map_umizoi', 29, 16), hiru: at('map_c3_shokudo', 4, 3), yu: at('map_c3_shokudo', 4, 3), yoru: at('map_c3_shokudo', 4, 3) },
  npc_c3_jouren: { asa: at('map_umizoi', 31, 16), hiru: at('map_c3_shokudo', 3, 5), yu: at('map_umizoi', 31, 16), yoru: null },
  // セリ：朝は市場（セリの場は人だけ、遊びは無い）、昼は市場の前（灯り (10,26) と並んで岸壁の西をふさがない 8,24）
  npc_c3_seri: { asa: at('map_c3_ichiba', 9, 4), hiru: at('map_umizoi', 8, 24), yu: null, yoru: null },
  npc_c3_seri_deshi: { asa: at('map_c3_ichiba', 11, 4), hiru: at('map_umizoi', 12, 24), yu: null, yoru: null },
  // サイレン番：朝・夕方は塔、昼は防波堤の根もと
  npc_c3_sirenban: { asa: at('map_c3_siren', 3, 9), hiru: at('map_umizoi', 44, 28), yu: at('map_c3_siren', 3, 9), yoru: null },
  // 灯台のテル：昼は防波堤、夜は灯台の中
  npc_c3_toudai: { asa: at('map_umizoi', 10, 30), hiru: at('map_umizoi', 10, 30), yu: at('map_umizoi', 10, 30), yoru: at('map_c3_toudai', 6, 4) },
  // 監視員のカイト：昼は監視台の上、朝・夕方はその下
  npc_c3_kanshiin: { asa: at('map_umizoi', 57, 28), hiru: at('map_umizoi', 57, 27), yu: at('map_umizoi', 57, 28), yoru: null },
  // (防波堤は2マス。立つ人は海側の y32 に：y31 を通り道に空ける、fix1015)
  npc_c3_mago: { asa: null, hiru: at('map_umizoi', 60, 30), yu: at('map_umizoi', 34, 32), yoru: null },
  npc_c3_tsuri: { asa: at('map_umizoi', 21, 32), hiru: null, yu: at('map_umizoi', 21, 32), yoru: null },
  // 子ども3人：朝と夕方は丘の広っぱ、昼は防波堤
  npc_c3_kid_a: { asa: at('map_umizoi', 6, 6), hiru: at('map_umizoi', 33, 32), yu: at('map_umizoi', 6, 6), yoru: null },
  npc_c3_kid_b: { asa: at('map_umizoi', 9, 4), hiru: at('map_umizoi', 35, 32), yu: at('map_umizoi', 9, 4), yoru: null },
  npc_c3_kid_c: { asa: at('map_umizoi', 12, 7), hiru: at('map_umizoi', 38, 32), yu: at('map_umizoi', 12, 7), yoru: null },
};

/** 下じきの決まり：その地図のその物を、この帯に出す（true）・出さない（false）・いつもの cond（null）。 */
type BaseRule = (o: MapObj, band: PgBand) => boolean | null;

/** 夕鳴町 昼：第3章の段階0の町の人（話しかけない背景の人）。 */
const HIRUMAE = /^c3_hm_/;
const HIRUMAE_BG = new Set(['c3_hm_shufu', 'c3_hm_cat']);

const BASE: Record<string, BaseRule> = {
  map_town: (o, band) => {
    if (o.t !== 'npc') return null;
    // (昼の話せる人は PG_SCHEDULE の本人。c3_hm_* は背景の人と猫だけ：買い物の人・猫)
    if (HIRUMAE.test(o.id)) return band === 'hiru' && HIRUMAE_BG.has(o.id);
    // 第1章の軽トラ（段階0の走る便・段階1〜2の昼寝）：止まる所は c3_truck_c4（after.ts、PG_TRUCK_STOPS）
    if (o.id === 'veh_kei_truck' || o.id === 'veh_tsugao_nap') return false;
    return null;
  },
  map_hoshimidai: (o) => {
    // 第2章の転回場：軽トラ（prop_tsugao_truck・obj_hoshi_tsugao_truck）はそのまま止まる所。運転席で寝るツガオ
    // （npc_tsugao）は出さない：クリア後は軽トラの横に立つ pg_tsugao_hoshi（hoshi_village.ts）
    if (o.t === 'obj' && o.id === 'npc_tsugao') return false;
    return null;
  },
};

/** 物の id（prop は絵の id）。 */
function objId(o: MapObj): string {
  return o.t === 'prop' ? (o.id ?? o.prop) : (o.id ?? '');
}

/**
 * クリア後、その地図のその物を出すか（true / false）、いつもの cond か（null）。
 * 表の人：その帯の居場所の地図なら出す、ほかの地図・null の帯なら出さない。
 */
export function pgObjPresent(o: MapObj, mapId: string): boolean | null {
  if (!pgOn()) return null;
  // 敵のシンボルは出さない（05 5.3。もとにもどった姿 restored はそのまま）
  if (o.t === 'sym') return false;
  // シークレットエンディングの日（flag_pg_secret 2、05 10.2）：公園の時計塔の下は、ツガオ・グソっ君・しゅん
  // の場面（world/pg_secret.ts PG_SECRET_PARK）。そこに立つ夕方のさや（14,11）は出さない
  if (flag('flag_pg_secret') === 2 && objId(o) === 'npc_sae' && mapId === 'map_town') return false;
  // 本日は、開館です（events/ch3/iso.ts）：開館の あと、ハキコは 入口を 掃かずに 館の 中の ベンチ（iso_hakiko_bench）。
  // 開館の 場面の 間も 入口の 前には 場面の ハキコ（iso_hakiko_*）だけ
  if (objId(o) === 'npc_c3_uketsuke' && (flag('flag_iso_kaikan') > 0 || flag('flag_iso_scene') >= 2)) return false;
  const band = pgBand();
  const row = PG_SCHEDULE[objId(o)];
  if (row && band in row) {
    const spot = row[band];
    return !!spot && spot.map === mapId && canonical(mapId, objId(o), spot) === o;
  }
  const rule = BASE[mapId];
  return rule ? rule(o, band) : null;
}

/** 表の人の、この帯の居場所（地図の物の座標の代わりに使う）。 */
export function pgObjSpot(o: MapObj, mapId: string): PgSpot | null {
  if (!pgOn()) return null;
  const spot = PG_SCHEDULE[objId(o)]?.[pgBand()];
  return spot && spot.map === mapId && canonical(mapId, objId(o), spot) === o ? spot : null;
}

const canon = new Map<string, MapObj | null>();
/**
 * その人の物のうち、表の居場所に立つ1つ（同じ座標の物、なければ最初の物）。ほかの段階の同じ人の物は出さない
 * （同じ人が2人にならない）。座標が同じ物を選ぶので、その物の向き・ポーズ・動きがそのまま使える。
 */
function canonical(mapId: string, id: string, spot: PgSpot): MapObj | null {
  const key = `${mapId}|${id}|${spot.x},${spot.y}`;
  let c = canon.get(key);
  if (c === undefined) {
    const objs = (getMapDef(mapId)?.objects ?? []).filter((x) => x.t === 'npc' && x.id === id);
    c = objs.find((x) => x.x === spot.x && x.y === spot.y) ?? objs[0] ?? null;
    canon.set(key, c);
  }
  return c;
}

setPgScheduleImpl(
  (npcId, mapId) => {
    const band = pgBand();
    const row = PG_SCHEDULE[npcId];
    if (row && band in row) {
      const at = row[band];
      return !!at && (mapId === undefined || at.map === mapId);
    }
    if (!mapId) return null;
    const def = getMapDef(mapId);
    const o = def?.objects.find((x) => x.t !== 'door' && x.t !== 'trig' && objId(x) === npcId);
    return o ? pgObjPresent(o, mapId) : null;
  },
  (npcId, band) => {
    const row = PG_SCHEDULE[npcId];
    if (!row || !(band in row)) return undefined;
    return row[band] ?? null;
  },
);

/**
 * ツガオ便（after.ts の c3_truck_c4）の絵：夕鳴町の夕方は昼寝（第1章の tsugao_truck_nap。05 8.1）。
 * 台本（起こす1ページ）は events/postgame.ts。
 */
registerWorldFx({
  map: 'map_town',
  update(f) {
    if (!pgOn()) return;
    const a = f.actorById('c3_truck_c4');
    if (!a || !a.data.vehicle) return;
    const want = pgTruckKind(f.map.id);
    if (a.data.vehicle !== want) a.data.vehicle = want;
  },
});
