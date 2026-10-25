// 大写しの 遊びの はじめの カード（改善会議 2026-10-25 の1、ui/closeup.ts）。
// 1枚 1行（全角 15字くらい まで）。キーは {Z}（けってい）{X}（もどる）{←→} {↑↓} {→} {←} {十字}。
// キーボードは Z・X・矢印、タッチは けってい・もどる・十字キーの 札で 出る。「もどる＝やめる」は
// カードが 自分で 足す。id は セーブに 残る flag howto_<id>（2回目からは 出さない）。
// 絵（pic）は 指・ボタン・矢印の 1組を 使い回す。まずは よく 遊ぶ 物（釣り 3つ・水切り・幕・摘果・型ぬき）だけ。
// 幅は __game.cmd.howtoCheck()。

import type { Howto } from '../../ui/closeup';

export const HOWTO = {
  // ---- 第1章
  tsuri: { id: 'tsuri', line: '{Z}長押しで、そーっと 引く', pic: 'hold' },
  seki: { id: 'seki', line: '浮きが 沈んだら {Z}長押し', pic: 'hold' },
  katanuki: { id: 'katanuki', line: '{Z}を 押すと、針が すすむ', pic: 'hold' },
  hkSize: { id: 'hk_size', line: '{Z}で「のびるな！」' },
  hkLegs: { id: 'hk_legs', line: '{↑↓}で 数、{Z}で きめる' },
  hkFood: { id: 'hk_food', line: '{←→}で えらび、{Z}で さし出す' },
  hkSuiri: { id: 'hk_suiri', line: '{十字}で えらび、{Z}で まる' },
  // ---- 第2章
  tetsubou: { id: 'tetsubou', line: '{Z}を 押したまま、ぶら下がる' },
  shishito: { id: 'shishito', line: '焼き色を 見て、{Z}で 返す' },
  wakime: { id: 'wakime', line: '{↑↓}で 灯り、{Z}長押しで かく' },
  mgPump: { id: 'mg_pump', line: '{Z}で 1回ずつ 押す' },
  mgTarai: { id: 'mg_tarai', line: '{←→}で 回して、泡を さがす' },
  mgKae: { id: 'mg_kae', line: '{Z}を 3回' },
  kyuri: { id: 'kyuri', line: '{十字}で 灯り、{Z}で 切る' },
  busmaku: { id: 'busmaku', line: '{→}を 押さえて、幕を 回す', pic: 'lr' },
  asairo: { id: 'asairo', line: '{←→}で そっと かたむける' },
  asairoKumo: { id: 'asairo_kumo', line: '{Z}を 押して、はなすと はじく' },
  himo: { id: 'himo', line: '{←→}で 所、{Z}で 切る' },
  ushibana: { id: 'ushibana', line: '{↑↓}で えらび、{Z}で 照らす' },
  sakuzoi: { id: 'sakuzoi', line: '{←→}で 動き、{Z}で 刈る' },
  mimi: { id: 'mimi', line: '犬と おなじ 耳を {十字}で' },
  uribo: { id: 'uribo', line: '明かりに 来たら {Z}で 数える' },
  neru: { id: 'neru', line: '{十字}で えらび、{Z}で「ここ」' },
  hgMizu: { id: 'hg_mizu', line: '{←→}で 水を、{Z}で きめる' },
  hgHi: { id: 'hg_hi', line: '{→}足す {←}引く {Z}吹く' },
  iro: { id: 'iro', line: '{↑↓}で 色、{Z}で きめる' },
  uzu: { id: 'uzu', line: '{←→}で ねじり、{Z}長押し' },
  yoburi: { id: 'yoburi', line: '{←→}で 灯り、{Z}で すくう' },
  taihiDig: { id: 'taihi_dig', line: '{十字}で 場所、{Z}で 掘る' },
  taihiKaeshi: { id: 'taihi_kaeshi', line: '湯気が 上がったら {Z}' },
  domeSlit: { id: 'dome_slit', line: '{Z}を 連打して、開ける' },
  domeRot: { id: 'dome_rot', line: '{←→}で ドームを 回す' },
  domeEye: { id: 'dome_eye', line: '{十字}で まん中へ、{Z}で 見る' },
  kutsu: { id: 'kutsu', line: '{←→}で えらび、{Z}で ふる' },
  // ---- 第3章
  okujou: { id: 'okujou', line: '{↑↓}で えらび、{Z}で 取る' },
  sakana: { id: 'sakana', line: '浮きが 沈んだら {Z}', pic: 'timing' },
  mahiru: { id: 'mahiru', line: '{←→}で ふた、{Z}で シャッター' },
  shita: { id: 'shita', line: '{←→}で 向き、{Z}で こする' },
  iso: { id: 'iso', line: '{十字}で 石、{Z}で めくる' },
  abura: { id: 'abura', line: '{←→}を 交互に、{Z}で 1てき' },
  nanori: { id: 'nanori', line: '{←→}で 光、{Z}で 押す' },
  mikan: { id: 'mikan', line: '{←→}で 実を えらび、{Z}で 切る', pic: 'lr' },
  mizukiri: { id: 'mizukiri', line: '{Z}を 押さえて、はなす', pic: 'hold' },
  yose: { id: 'yose', line: '{←→}で かたむけ、{Z}で 止める' },
} satisfies Record<string, Howto>;
