// クリア後の人の配置（05 4.2）：pgSchedule。
//
// 1人ずつ、時間帯ごとに「どこにいるか／いないか」。クリア後は、地図の物の cond より
// この表が勝つ（field.ts refreshPresence → postgame.ts pgObjPresent）。
//
// 第1期は下じきだけ：段階のフラグ（postgame.ts applyPgStages）で、
//   夕鳴町 夕方 = 第1章の段階2、星見台 夜 = h1、海ぞいの町 = 段階4、夕鳴町 朝 = 今のクリア後
// がそのまま出る。ここでは、それだけでは足りない所を書く：
//   - 夕鳴町 昼 = 第3章の段階0（62 5.1）の町の人（c3_hm_*。ch3Hirumae() はクリア後は false なので）
//   - ツガオ便の止まる所（8.1）と重なる第1章の軽トラ、第2章の運転席のツガオは出さない
//   - 敵のシンボルは出さない（5.3）
// 人ごとの表（PG_SCHEDULE）は第2期で全員（約76人 × 4帯）。

import type { MapObj } from './types';
import { pgBand, pgOn, pgTruckKind, setPgScheduleImpl, type PgBand, type PgSpot } from './postgame';
import { getMapDef } from './maps';
import { registerWorldFx } from './fx';

/**
 * 人ごとの表：id → 帯ごとの居場所（null = いない。書いていない帯は下じきのまま）。
 * 第2期で E の人の一覧と合わせて埋める。
 */
export const PG_SCHEDULE: Record<string, Partial<Record<PgBand, PgSpot | null>>> = {};

/** 下じきの決まり：その地図のその物を、この帯に出す（true）・出さない（false）・いつもの cond（null）。 */
type BaseRule = (o: MapObj, band: PgBand) => boolean | null;

/** 夕鳴町 昼：第3章の段階0の町の人（話しかけない背景の人）。 */
const HIRUMAE = /^c3_hm_/;

const BASE: Record<string, BaseRule> = {
  map_town: (o, band) => {
    if (o.t !== 'npc') return null;
    if (HIRUMAE.test(o.id)) return band === 'hiru';
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
  const band = pgBand();
  const row = PG_SCHEDULE[objId(o)];
  if (row && band in row) {
    const at = row[band];
    return !!at && at.map === mapId;
  }
  const rule = BASE[mapId];
  return rule ? rule(o, band) : null;
}

/** 表の人の、この帯の居場所（地図の物の座標の代わりに使う）。 */
export function pgObjSpot(o: MapObj, mapId: string): PgSpot | null {
  if (!pgOn()) return null;
  const at = PG_SCHEDULE[objId(o)]?.[pgBand()];
  return at && at.map === mapId ? at : null;
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
