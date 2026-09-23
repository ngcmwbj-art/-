// Skills: party abilities (ハンコ術, PR活動) and enemy moves (20_systems_battle.md 6, 11, 13).

import type { SkillDef } from './types';

const party: SkillDef[] = [
  {
    id: 'skill_tataku', name: 'たたく', user: 'minato', kind: 'attack', target: 'enemy', power: 1.0, attr: 'da',
    input: 'ring', desc: ['虫とりアミで たたく。', '輪が 重なった 瞬間に 決定で いい音。'],
  },
  {
    id: 'skill_mimashita', name: 'みました', user: 'minato', kind: 'hanko', cost: 2, target: 'part', input: 'hold',
    fieldUse: true, noDamage: true, desc: ['ちゃんと 見て、押す。正体が わかり、', 'まもりが 下がる。ふしぎにも 押せる。'],
  },
  {
    id: 'skill_peke', name: 'ペケ', user: 'minato', kind: 'hanko', cost: 4, target: 'enemy', power: 1.8, attr: 'han',
    input: 'hold', desc: ['巨大な ペケを 振りおろす。', '敵1体に 大きな ダメージ。'],
  },
  {
    id: 'skill_hanamaru', name: 'はなまる', user: 'minato', kind: 'hanko', cost: 5, target: 'ally', input: 'hold',
    fieldUse: true, noDamage: true, desc: ['はなまるを 描いて、', '仲間1人の HPを 回復する。'],
  },
  {
    id: 'skill_yarinaoshi', name: 'やりなおし', user: 'minato', kind: 'hanko', cost: 6, target: 'part', input: 'hold',
    noDamage: true, desc: ['赤ペンで ぐるっと もどす。', '敵の 溜めている 大技を 取り消す。'],
  },
  {
    id: 'skill_okaerinasai', name: 'おかえりなさい', user: 'minato', kind: 'hanko', cost: 0, target: 'enemy', input: 'hold',
    noDamage: true, desc: ['待っていた だれかに、押す ハンコ。', '（最後に 使う）'],
  },
  {
    id: 'skill_oyasuminasai', name: '？？？', user: 'minato', kind: 'hanko', cost: 0, target: 'none', input: 'none',
    noDamage: true, desc: ['（輪郭だけが、うっすら 見える）', '―'],
  },
  {
    id: 'skill_tackle', name: 'もこもこタックル', user: 'kanenari', kind: 'attack', ct: 0, target: 'enemy', power: 1.0,
    attr: 'da', input: 'ring', desc: ['2歩 助走して 体当たり。', '輪に 合わせて 決定で いい音。'],
  },
  {
    id: 'skill_fuusen', name: 'ふうせんくばり', user: 'kanenari', kind: 'pr', ct: 1, target: 'allies', input: 'none',
    noDamage: true, desc: ['ふうせんを 配って、みんなを', '少し 回復する。たまに 割れる。'],
  },
  {
    id: 'skill_goaisatsu', name: 'ごあいさつ', user: 'kanenari', kind: 'pr', ct: 2, target: 'enemies', input: 'none',
    noDamage: true, desc: ['深々と おじぎ。敵も つられて、', 'ちからが 下がる。（2ターン）'],
  },
  {
    id: 'skill_kane', name: 'かねを鳴らす', user: 'kanenari', kind: 'pr', ct: 0, target: 'none', input: 'none',
    noDamage: true, desc: ['鐘を 鳴らす。……鳴らない。', 'すべった 空気で キレが たまる。'],
  },
  {
    id: 'skill_noritsukkomi', name: 'ノリツッコミ', user: 'both', kind: 'combo', target: 'enemies', attr: 'wara',
    input: 'none', desc: ['カネナリくんが ボケて、ミナトが', '全力で ツッコむ。敵全体に 大ダメージ。'],
  },
];

type E = Omit<SkillDef, 'user' | 'kind' | 'input' | 'desc'> & { desc?: [string, string] };
const enemy = (s: E): SkillDef => ({ user: 'enemy', kind: 'enemy', input: 'none', desc: s.desc ?? ['', ''], ...s });

const enemies: SkillDef[] = [
  enemy({ id: 'skill_idle', name: 'なにもしない', target: 'self', windupMs: 400, noDamage: true }),
  // ハト係長
  enemy({ id: 'skill_hato_meishi', name: '名刺交換', target: 'enemy', power: 0.6, hits: [0], windupMs: 450, tsukkomi: [1] }),
  enemy({
    id: 'skill_hato_kaigi', name: '首ふり会議', target: 'enemy', windupMs: 500, tsukkomi: [2], noDamage: true,
    status: { id: 'buff_hit', chance: 1, turns: 3, stage: -1 },
  }),
  enemy({ id: 'skill_hato_teiji', name: '定時退社', target: 'self', windupMs: 600, noDamage: true }),
  // セミファイナル
  enemy({ id: 'skill_semi_shindafuri', name: '死んだふり', target: 'self', windupMs: 600, noDamage: true }),
  enemy({ id: 'skill_semi_final', name: 'セミファイナル', target: 'enemy', power: 0.45, hits: [0, 16, 24], windupMs: 300, tsukkomi: [1, 3] }),
  enemy({
    id: 'skill_semi_miin', name: 'ミーン', target: 'allies', windupMs: 600, tsukkomi: [2], noDamage: true,
    status: { id: 'status_konran', chance: 0.7, turns: 2 },
  }),
  // コーン・ボーカル
  enemy({
    id: 'skill_cone_nessho', name: '熱唱', target: 'allies', power: 0.5, hits: [0], windupMs: 500, tsukkomi: [2],
    status: { id: 'status_konran', chance: 0.33, turns: 2 },
  }),
  enemy({
    id: 'skill_cone_tsukodome', name: '通行止め', target: 'enemy', windupMs: 400, tsukkomi: [1], noDamage: true,
    status: { id: 'status_toosenbo', chance: 1, turns: 1 },
  }),
  enemy({ id: 'skill_cone_konkon', name: 'コーン・コン', target: 'self', windupMs: 400, noDamage: true }),
  // ワスレガサ
  enemy({
    id: 'skill_kasa_dakitsuki', name: '持ち主さがし', target: 'enemy', windupMs: 450, tsukkomi: [2], noDamage: true,
    status: { id: 'status_tsukamare', chance: 1, turns: 1 },
  }),
  enemy({ id: 'skill_kasa_hiraku', name: '晴れてるのにひらく', target: 'self', windupMs: 350, noDamage: true }),
  enemy({ id: 'skill_kasa_shizuku', name: 'しずく', target: 'enemy', power: 0.35, hits: [0, 20], windupMs: 400, tsukkomi: [1] }),
  // おじぎ自販機
  enemy({ id: 'skill_ojigi_otsuri', name: 'おつりの雨', target: 'enemy', power: 0.22, hits: [0, 20, 20, 20, 20], windupMs: 400, tsukkomi: [3] }),
  enemy({ id: 'skill_ojigi_charge', name: '90度おじぎ', target: 'self', windupMs: 600, noDamage: true, big: true }),
  enemy({ id: 'skill_ojigi_press', name: '90度おじぎ', target: 'allies', power: 1.4, hits: [0], windupMs: 500, tsukkomi: [1, 2], big: true }),
  enemy({ id: 'skill_ojigi_roulette', name: '当たりルーレット', target: 'self', windupMs: 900, noDamage: true }),
  enemy({ id: 'skill_ojigi_arigatou', name: 'アリガトウゴザイマシタ', target: 'self', windupMs: 500, noDamage: true }),
  // ソウジロウ
  enemy({ id: 'skill_souji_teinei', name: 'ていねいに掃除', target: 'enemy', power: 0.8, hits: [0], windupMs: 450, tsukkomi: [2] }),
  enemy({ id: 'skill_souji_dansa', name: '段差チャレンジ', target: 'enemy', power: 1.2, hits: [0], windupMs: 500, tsukkomi: [1] }),
  enemy({ id: 'skill_souji_juden', name: '充電に帰る', target: 'self', windupMs: 400, noDamage: true }),
  // モミスギ
  enemy({
    id: 'skill_momi_momi', name: 'もみもみ', target: 'enemy', hits: [0], windupMs: 500, tsukkomi: [1],
    status: { id: 'status_nemuri', chance: 0.3 },
  }),
  enemy({ id: 'skill_momi_kyou', name: '強モード', target: 'enemy', power: 1.2, hits: [0], windupMs: 400, tsukkomi: [2] }),
  enemy({ id: 'skill_momi_otameshi', name: 'お試し10分', target: 'self', windupMs: 500, noDamage: true }),
  // カネナリくん（加入戦）
  enemy({ id: 'skill_kn_fuusen', name: 'ふうせんを配る', target: 'enemy', windupMs: 500, noDamage: true }),
  enemy({ id: 'skill_kn_goaisatsu', name: 'ごあいさつ', target: 'enemy', windupMs: 500, noDamage: true }),
  enemy({ id: 'skill_kn_pose', name: 'PRポーズ', target: 'self', windupMs: 400, noDamage: true }),
  // オムカエマチ
  enemy({ id: 'skill_omu_tebukuro', name: '片手袋のて', target: 'enemy', power: 0.55, hits: [0, 18], windupMs: 450, tsukkomi: [1] }),
  enemy({ id: 'skill_omu_madakonai', name: 'まだ来ない', target: 'self', windupMs: 500, noDamage: true }),
  enemy({ id: 'skill_omu_oshirase', name: '迷子のお知らせ', target: 'self', windupMs: 700, noDamage: true }),
  enemy({ id: 'skill_omu_chime', name: '五時のチャイム', target: 'allies', hits: [0], windupMs: 800, tsukkomi: [2], big: true }),
  enemy({ id: 'skill_omu_kaerinokai', name: 'かえりの会', target: 'allies', power: 0.9, hits: [0], windupMs: 500, tsukkomi: [2] }),
  enemy({ id: 'skill_omu_uwabaki', name: '上履きキック', target: 'enemy', power: 1.6, hits: [0], windupMs: 450, tsukkomi: [1], big: true }),
  enemy({ id: 'skill_omu_suitou', name: '水筒', target: 'self', windupMs: 500, noDamage: true }),
  enemy({ id: 'skill_omu_kasa', name: '傘', target: 'self', windupMs: 400, noDamage: true }),
  enemy({ id: 'skill_omu_yoiko', name: 'よいこは おうちへ かえりましょう', target: 'kanenari', windupMs: 600, tsukkomi: [3], noDamage: true, big: true }),
];

const table = new Map<string, SkillDef>();
for (const s of [...party, ...enemies]) table.set(s.id, s);

export function getSkill(id: string): SkillDef | undefined {
  return table.get(id);
}

export function allSkills(): SkillDef[] {
  return [...table.values()];
}

/** Party ability ids that live in the ハンコケース, in case-slot order. */
export const HANKO_CASE_ORDER = [
  'skill_mimashita',
  'skill_peke',
  'skill_hanamaru',
  'skill_yarinaoshi',
  'skill_okaerinasai',
  'skill_oyasuminasai',
];

/** PR活動 order in the list. */
export const PR_ORDER = ['skill_fuusen', 'skill_goaisatsu', 'skill_kane'];
