// 大写しの 遊びの はじめの カード（改善会議 2026-10-25 の1、ui/closeup.ts）。
// 1枚 1行（全角 15字くらい まで）。キーは {Z}（けってい）{X}（もどる）{←→} {↑↓} {→} {←} {十字}。
// キーボードは Z・X・矢印、タッチは けってい・もどる・十字キーの 札で 出る。「もどる＝やめる」は
// カードが 自分で 足す。id は セーブに 残る flag howto_<id>（2回目からは 出さない）。
// 絵（pic）は 指・ボタン・矢印の 1組を 使い回す。まずは よく 遊ぶ 物（釣り 3つ・水切り・幕・摘果・型ぬき）だけ。
// 改善会議 10-26 の5：残りにも、遊びの 操作を 読んで 合う 形を 足した（tap 1回ずつ・mash 連打・hold 押して
// はなす・keep 押しつづける・timing 合図で・lr/ud 矢印で えらんで けってい・aim 十字で ねらう・pick ますを
// えらんで 置く）。けってい を 使わない 3つ（asairo・mimi・domeRot：矢印だけ）は 合う 絵が ないので 字だけ。
// タッチでは 札「けってい」「十字キー」が 長く、14枚が カードの 幅（264）を こえていたので、読点・「で」を 削って 縮めた。
// 幅は __game.cmd.howtoCheck()。

import type { Howto } from '../../ui/closeup';

export const HOWTO = {
  // ---- 第1章
  tsuri: { id: 'tsuri', line: '{Z}長押しで、そーっと 引く', pic: 'hold' },
  seki: { id: 'seki', line: '浮きが 沈んだら {Z}長押し', pic: 'hold' },
  katanuki: { id: 'katanuki', line: '{Z}を 押すと、針が すすむ', pic: 'hold' },
  hkSize: { id: 'hk_size', line: '{Z}で「のびるな！」', pic: 'timing' },
  hkLegs: { id: 'hk_legs', line: '{↑↓}で 数、{Z}で きめる', pic: 'ud' },
  hkFood: { id: 'hk_food', line: '{←→}で えらび、{Z}で 出す', pic: 'lr' },
  hkSuiri: { id: 'hk_suiri', line: '{十字}で 見て {Z}で まる', pic: 'pick' },
  // ---- 第2章
  tetsubou: { id: 'tetsubou', line: '{Z}を 押したまま ぶら下がる', pic: 'keep' },
  shishito: { id: 'shishito', line: '焼き色を 見て、{Z}で 返す', pic: 'timing' },
  wakime: { id: 'wakime', line: '{↑↓}灯り {Z}長押しで かく', pic: 'keep' },
  mgPump: { id: 'mg_pump', line: '{Z}で 1回ずつ 押す', pic: 'tap' },
  mgTarai: { id: 'mg_tarai', line: '{←→}で 回して、泡を さがす', pic: 'lr' },
  mgKae: { id: 'mg_kae', line: '{Z}を 3回', pic: 'tap' },
  kyuri: { id: 'kyuri', line: '{十字}で 灯り {Z}で 切る', pic: 'pick' },
  busmaku: { id: 'busmaku', line: '{→}を 押さえて、幕を 回す', pic: 'lr' },
  asairo: { id: 'asairo', line: '{←→}で そっと かたむける' },
  asairoKumo: { id: 'asairo_kumo', line: '{Z}を 押して はなすと はじく', pic: 'hold' },
  himo: { id: 'himo', line: '{←→}で 所、{Z}で 切る', pic: 'lr' },
  ushibana: { id: 'ushibana', line: '{↑↓}で えらび {Z}で 照らす', pic: 'ud' },
  sakuzoi: { id: 'sakuzoi', line: '{←→}で 動き、{Z}で 刈る', pic: 'lr' },
  mimi: { id: 'mimi', line: '犬と おなじ 耳を {十字}で' },
  uribo: { id: 'uribo', line: '明かりに 来たら {Z}で 数える', pic: 'timing' },
  neru: { id: 'neru', line: '{十字}と {Z}で「ここ」', pic: 'pick' },
  hgMizu: { id: 'hg_mizu', line: '{←→}で 水を、{Z}で きめる', pic: 'lr' },
  hgHi: { id: 'hg_hi', line: '{→}足す {←}引く {Z}吹く', pic: 'lr' },
  iro: { id: 'iro', line: '{↑↓}で 色、{Z}で きめる', pic: 'ud' },
  uzu: { id: 'uzu', line: '{←→}で ねじり、{Z}長押し', pic: 'keep' },
  yoburi: { id: 'yoburi', line: '{←→}で 灯り、{Z}で すくう', pic: 'lr' },
  taihiDig: { id: 'taihi_dig', line: '{十字}で 場所 {Z}で 掘る', pic: 'pick' },
  taihiKaeshi: { id: 'taihi_kaeshi', line: '湯気が 上がったら {Z}', pic: 'timing' },
  domeSlit: { id: 'dome_slit', line: '{Z}を 連打して、開ける', pic: 'mash' },
  domeRot: { id: 'dome_rot', line: '{←→}で ドームを 回す' },
  domeEye: { id: 'dome_eye', line: '{十字}で 中へ {Z}で 見る', pic: 'aim' },
  kutsu: { id: 'kutsu', line: '{←→}で えらび、{Z}で ふる', pic: 'lr' },
  // ---- 第3章
  okujou: { id: 'okujou', line: '{↑↓}で えらび、{Z}で 取る', pic: 'ud' },
  sakana: { id: 'sakana', line: '浮きが 沈んだら {Z}', pic: 'timing' },
  mahiru: { id: 'mahiru', line: '{←→}で ふた、{Z}で 撮る', pic: 'lr' },
  shita: { id: 'shita', line: '{←→}で 向き、{Z}で こする', pic: 'lr' },
  iso: { id: 'iso', line: '{十字}で 石 {Z}で めくる', pic: 'pick' },
  abura: { id: 'abura', line: '{←→}を 交互に、{Z}で 1てき', pic: 'lr' },
  nanori: { id: 'nanori', line: '{←→}で 光、{Z}で 押す', pic: 'lr' },
  mikan: { id: 'mikan', line: '{←→}で 実、{Z}で 切る', pic: 'lr' },
  mizukiri: { id: 'mizukiri', line: '{Z}を 押さえて、はなす', pic: 'hold' },
  yose: { id: 'yose', line: '{←→}で かたむけ、{Z}止める', pic: 'lr' },
} satisfies Record<string, Howto>;
