'use strict';
/* =========================================================
   出来事マス「？」の中身
   - 分かれ道で「出来事」を選ぶと、この中から1つ起きる（季節と農家タイプに合うもの）
   - options：2〜3個の選び方。effects は1年を通した状態にかかる（js/events.js の OPS）
     gold 銭 / heal 健康度（マイナスで減る） / maxHp 最大健康度 / card カードを1枚もらう（id か、rarity・type で選ぶ） /
     upgrade ランダムなカード1枚を強化 / remove 初期の攻撃・守りのカードを1枚手放す / tool 農具を1つ / nextBattle 次の戦闘の始めの状態
   - need：その選び方に要る銭（足りないと選べない）
   - farmers：出る農家タイプ（なければ全員）。seasons：出る季節（なければいつでも）
   ========================================================= */
FR.Events = {
  fair: {
    name: '村の品評会', art: 'basket',
    text: '村の品評会が開かれている。自慢の作物や家畜を出せば、目利きの人とつながりができそうだ。',
    options: [
      { label: '出品する', text: '銭 −20。「ときどき」のカードを1枚もらう', need: 20, effects: [{ op: 'gold', amount: -20 }, { op: 'card', rarity: 'uncommon' }] },
      { label: '見物だけする', text: '健康度 +6', effects: [{ op: 'heal', amount: 6 }] }
    ]
  },
  coop: {
    name: '農協の頼みごと', art: 'coin',
    text: '農協の職員が困った顔でやってきた。「選果場の手が足りなくて…」',
    options: [
      { label: '手伝う', text: '健康度 −6。銭 +30', effects: [{ op: 'heal', amount: -6 }, { op: 'gold', amount: 30 }] },
      { label: '断る', text: '何も起きない', effects: [] }
    ]
  },
  peddler: {
    name: '道具の行商人', art: 'truck',
    text: '軽トラの荷台に古い農具を積んだ行商人が、道ばたで店を広げている。',
    options: [
      { label: '農具を買う', text: '銭 −45。農具を1つ（何が出るかはお楽しみ）', need: 45, effects: [{ op: 'gold', amount: -45 }, { op: 'tool' }] },
      { label: '立ち去る', text: '何も起きない', effects: [] }
    ]
  },
  neighbor: {
    name: 'となりの畑の手伝い', art: 'weeding',
    text: 'となりの家のおばあさんが、ひとりで草取りをしている。',
    options: [
      { label: '手伝う', text: '健康度 −5。カード1枚を強化（どれかはおまかせ）', effects: [{ op: 'heal', amount: -5 }, { op: 'upgrade' }] },
      { label: 'お茶をごちそうになる', text: '健康度 +8', effects: [{ op: 'heal', amount: 8 }] }
    ]
  },
  barn: {
    name: '古い納屋', art: 'hay',
    text: '使っていない古い納屋に、なにかが眠っていそうだ。',
    options: [
      { label: '片付ける', text: '健康度 −4。「まれ」のカードを1枚もらう', effects: [{ op: 'heal', amount: -4 }, { op: 'card', rarity: 'rare' }] },
      { label: '古道具を売る', text: '銭 +15', effects: [{ op: 'gold', amount: 15 }] }
    ]
  },
  apprentice: {
    name: '農業を習いたい若者', art: 'sunrise',
    text: '「農業を教えてください！」と、町から若者がやってきた。',
    options: [
      { label: '基本を教える', text: '初めから持っていた攻撃か守りのカードを1枚、若者にゆずる（デッキから外れる）', effects: [{ op: 'remove' }] },
      { label: '畑を見せるだけ', text: '最大健康度 +4', effects: [{ op: 'maxHp', amount: 4 }] }
    ]
  },
  fence: {
    name: '獣の通り道', art: 'fence',
    text: '畑のすみに、イノシシの通った跡を見つけた。',
    options: [
      { label: '柵を直しておく', text: '銭 −10。次の戦闘の始めに守り10', need: 10, effects: [{ op: 'gold', amount: -10 }, { op: 'nextBattle', status: 'dawnBlock', amount: 10 }] },
      { label: '見なかったことにする', text: '何も起きない', effects: [] }
    ]
  },
  seedSwap: {
    name: '種の交換会', art: 'seeds', farmers: ['vegetable'],
    text: '公民館で、農家どうしの種の交換会が開かれている。',
    options: [
      { label: '珍しい種をもらう', text: '作物のカードを1枚もらう', effects: [{ op: 'card', type: 'crop' }] },
      { label: '余った種を売る', text: '銭 +15', effects: [{ op: 'gold', amount: 15 }] }
    ]
  },
  vet: {
    name: '獣医さんの巡回', art: 'vaccine', farmers: ['livestock'],
    text: 'なじみの獣医さんが、近くまで来たついでに寄ってくれた。',
    options: [
      { label: '防疫を相談する', text: '「消毒」のカードを1枚もらう', effects: [{ op: 'card', id: 'disinfect' }] },
      { label: '牛の様子を見てもらう', text: '健康度 +8', effects: [{ op: 'heal', amount: 8 }] }
    ]
  },
  orchardTalk: {
    name: '園地の見回り', art: 'shears', farmers: ['citrus'],
    text: '組合の指導員が、園地の木を一緒に見て回ろうと言ってくれた。',
    options: [
      { label: '剪定を教わる', text: '柑橘のカードを1枚もらう', effects: [{ op: 'card', pool: 'citrus' }] },
      { label: 'みかんを分けてあげる', text: '健康度 +6・銭 +5', effects: [{ op: 'heal', amount: 6 }, { op: 'gold', amount: 5 }] }
    ]
  }
};
