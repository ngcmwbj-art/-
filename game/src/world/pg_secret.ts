// クリア後のシークレットエンディング「40年ぶりの 休み」（05_postgame 10.2）の、世界の側（W）。
// 台本は E（events）。ここには、どこで・いつ撮るか（カット）と、公園のベンチの物の出し方を置く。
//
//   PG_SECRET_CUTS[i]  1日を回るカット（10.2 #2）：地図・しゅんの立つ所・時刻・HD-2D のレンズの名前
//   PG_SECRET_PARK     公園の時計塔の下（10.2 #3〜#7）：ベンチ、ツガオ、グソっ君としゅんの立つ所
//   flag_pg_park_tsugao = 1  ベンチでツガオがナイトキャップで寝ている（台本が立てる・下ろす）
//   flag_pg_park_pack   = 1  ベンチの上に焼きそばのパック（グソっ君が渡したあと）
//   1枚絵：ui/cut_pg.ts の 'cut_pg_yasumi'（playC3Cut。2D・HD-2D とも同じ絵）

import type { PgSpot } from './postgame';

export interface PgSecretCut {
  /** HD-2D のレンズ（hd2d/cut_pg.ts、endingView.shot の名前）。2D はフィールドのカメラのまま。 */
  shot: string;
  /** しゅんの立つ所（カメラはしゅんを追う）。 */
  at: PgSpot;
  /** その場面の時刻（ゲームの分。pgSetMin で置くと光がその帯になる）。 */
  min: number;
  /** 何を撮るか（台本を書くときの目安）。 */
  note: string;
}

export const PG_SECRET_CUTS: readonly PgSecretCut[] = [
  { shot: 'pg_hoshi_yoake', at: { map: 'map_hoshimidai', x: 41, y: 44, dir: 'up' }, min: 4 * 60 + 30, note: '夜明け前の星見台。転回場の軽トラにマサルのキャベツ' },
  { shot: 'pg_ginza_asa', at: { map: 'map_town', x: 28, y: 24, dir: 'up' }, min: 7 * 60, note: '朝の夕鳴町。焼きそばのたかしに卸す' },
  { shot: 'pg_minato_hiru', at: { map: 'map_umizoi', x: 29, y: 18, dir: 'up' }, min: 12 * 60, note: '昼の港。食堂かもめのナミエへ' },
  { shot: 'pg_aq_iriguchi', at: { map: 'map_c3_aq_iriguchi', x: 6, y: 8, dir: 'left' }, min: 10 * 60, note: '旧水族館の入口。エゴがタイムカードに『休』の欄' },
];

/** 公園の時計塔の下（map_town）。ベンチは prop_park_bench (15,11)、時計塔は (15,7)。 */
export const PG_SECRET_PARK = {
  shot: 'pg_park',
  /** 17:00 前（チャイムの前）。 */
  min: 16 * 60 + 50,
  bench: { map: 'map_town', x: 15, y: 11 } as PgSpot,
  /** ベンチで寝るツガオ（pg_tsugao_bench：ベンチの右の半分）。 */
  tsugao: { map: 'map_town', x: 15, y: 11, dir: 'down' } as PgSpot,
  /** グソっ君としゅんの立つ所（ベンチの前、左から）。 */
  kanenari: { map: 'map_town', x: 16, y: 12, dir: 'up' } as PgSpot,
  shun: { map: 'map_town', x: 14, y: 12, dir: 'up' } as PgSpot,
} as const;
