# 素材と、差し替えのしかた

ゲームで使っている絵をすべて入れてあります。描いた絵は、**下の表と同じファイル名** で、リポジトリのそれぞれのフォルダに置くだけでゲームに入ります（コードを変える必要はありません）。

## 1. 背景（これから描くもの）

置き場所：`farm-roguelike/assets/img/bg/`

| ファイル名 | 使う画面 | 大きさの目安 |
| --- | --- | --- |
| battle_landscape.jpg | 戦闘（PC・iPad 横） | 2560×1440（16:9） |
| battle_portrait.jpg | 戦闘（スマホ縦・iPad 縦） | 1290×2796（約 9:19.5） |
| title_landscape.jpg | タイトル・農家選択・経営評価（横） | 2560×1440 |
| title_portrait.jpg | 同（縦） | 1290×2796 |

- **縦長だけ・横長だけ** でも大丈夫です。片方しかなければ、もう片方を画面に合わせて切り取って使います。
- タイトル用がなければ、戦闘用の背景を使います。どれもなければ今の森の絵のままです。
- 画面の形に合わせて **左右か上下が切れます**。下（地面）を基準に合わせるので、大事なものは中央より下に。
- 背景の上には、画面の部品が重なります。`docs/guides/`（素材パックでは `guides/`） の **目安つき** の画像を見てください。
  - **地面の線**（白い点線）：農家と敵の足もとです。横長では上から約57%、縦長では約66%の高さ。ここが地面に見えるように描くと、人物が浮きません。
  - 上の帯・手札のあたりは画面の部品で隠れるので、描き込まなくて大丈夫です。
  - 人物と敵が立つ場所は、あまり細かい模様や強い明暗がないほうが、キャラが見やすくなります。
- `guides/〜_目安（透明）.png` は透明な地に枠だけ描いたものです。お使いのアプリでレイヤーとして重ねて使えます（縦は1290×2796、横は2560×1440）。
- JPEG（品質80前後）がおすすめです。1枚 1MB 前後まで。

## 2. 農家（いま作成中のもの）

置き場所：`farm-roguelike/assets/img/farmers/`

| ファイル名 | 農家 |
| --- | --- |
| vegetable.png | 野菜農家 |
| livestock.png | 畜産農家 |
| citrus.png | 柑橘農家 |

- **背景は透明の PNG**、**右向き**（敵の方を向く）、**全身・足もとが絵の下端**。縦長（たとえば 1200×1700）。
- 今の仮の絵は `assets/img/art/farmer_*.svg`（素材パックでは `3_農家（今の仮の絵）/`） にあります（大きさと立ち位置の参考に）。
- 背景つきの絵でも、いただければこちらで切り抜きます。

## 3. カードの絵（70枚・いただいた絵から切り出したもの）

置き場所：`farm-roguelike/assets/img/cards/`　形：3:2 の横長（360×240）JPEG

| ファイル名 | カード |
| --- | --- |
| weeding.jpg | 除草 |
| mulch.jpg | マルチ |
| harvest.jpg | 収穫 |
| water.jpg | 水やり |
| birdNet.jpg | 防鳥ネット |
| scarecrow.jpg | かかし |
| sowKomatsuna.jpg | 種まき |
| sowSpinach.jpg | ホウレンソウ |
| plantEggplant.jpg | ナスの苗 |
| sowDaikon.jpg | 大根の種まき |
| plantTomato.jpg | トマトの苗 |
| fertilizer.jpg | 肥料 |
| liquidFert.jpg | 液肥 |
| hilling.jpg | 土寄せ |
| tunnel.jpg | トンネル栽培 |
| pesticide.jpg | 農薬散布 |
| morningWork.jpg | 朝どれ作業 |
| earlyPick.jpg | 早どり |
| companion.jpg | コンパニオンプランツ |
| rotation.jpg | 輪作 |
| directSale.jpg | 直売所 |
| pickling.jpg | 漬物づくり |
| tiller.jpg | 管理機 |
| compost.jpg | 堆肥づくり |
| greenhouse.jpg | ビニールハウス |
| rhythm.jpg | 段取り八分 |
| festival.jpg | 収穫祭 |
| tractor.jpg | トラクター |
| shoo.jpg | 追い払う |
| fence.jpg | 柵 |
| buyCalf.jpg | 子牛導入 |
| feed.jpg | 給餌 |
| ship.jpg | 出荷 |
| buyPiglet.jpg | 子豚導入 |
| buyChicks.jpg | ひよこ導入 |
| concentrate.jpg | 濃厚飼料 |
| hay.jpg | 良質な乾草 |
| brushing.jpg | ブラッシング |
| vaccine.jpg | ワクチン |
| barnRepair.jpg | 畜舎の補強 |
| nightWatch.jpg | 夜回り |
| guardDogs.jpg | 猟犬 |
| bullRush.jpg | 牛追い |
| manure.jpg | 堆肥の還元 |
| morningEggs.jpg | 朝の卵 |
| lightTruck.jpg | 軽トラ |
| auction.jpg | 家畜市場のセリ |
| contract.jpg | 契約出荷 |
| tmrMixer.jpg | 飼料ミキサー |
| plantUnshu.jpg | 温州みかんの苗木 |
| plantLemon.jpg | レモンの苗木 |
| plantYuzu.jpg | ゆずの苗木 |
| plantDekopon.jpg | デコポンの苗木 |
| pruning.jpg | 剪定 |
| shearsCut.jpg | 剪定ばさみ |
| bagging.jpg | 袋かけ |
| stoneWall.jpg | 石垣積み |
| mikanBox.jpg | みかん箱の山 |
| sorting.jpg | 選果 |
| firework.jpg | ロケット花火 |
| machineOil.jpg | マシン油散布 |
| sprinkler.jpg | スプリンクラー |
| frostFan.jpg | 防霜ファン |
| monorail.jpg | 園内モノレール |
| marmalade.jpg | マーマレード |
| thinning.jpg | 摘果 |
| grassCover.jpg | 草生栽培 |
| grafting.jpg | 接ぎ木 |
| treeRipening.jpg | 樹上完熟 |
| drone.jpg | ドローン防除 |

## 4. 敵（10体・いただいた絵から切り抜いたもの）

置き場所：`farm-roguelike/assets/img/enemies/`　形：正方形・背景透明 PNG・足もとが下端。左右反転して表示します（絵は右向きのままで OK）

| ファイル名 | 敵 |
| --- | --- |
| crowSmall.png | はぐれ鴉 |
| crow.png | 群れ鴉 |
| boar.png | 山の大猪 |
| aphids.png | アブラムシの群れ |
| weeds.png | はびこる雑草 |
| blast.png | いもち病 |
| avianFlu.png | 鳥インフル |
| frost.png | 遅霜 |
| drought.png | 干ばつ |
| typhoon.png | 大型台風 |

## 5. アイコン（作物・家畜・道具）

畑の区画・畜舎・レリックに出る小さな絵です。今は簡単な SVG なので、差し替えたい場合は同じ名前の PNG（正方形・透明）をいただければ入れます。
`svg/` は元の絵（拡大しても荒れません）、`png/` は 256×256 に書き出したものです。

## 6. 今の背景

`4_背景（今の絵）/`：forest（今の戦闘の森）と summer（明るい夏の里山）。SVG と 2560×1440 の PNG。
